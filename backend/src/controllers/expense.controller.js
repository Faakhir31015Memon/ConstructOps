import { sameId } from '../utils/ids.js';
import Expense from '../models/expense.model.js';
import Project from '../models/project.model.js';
import Alert from '../models/alert.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import { pick } from '../utils/pick.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { toObjectId, toSafeEnum } from '../middleware/sanitize.middleware.js';
import serverError from '../utils/serverError.js';

const EXPENSE_CATEGORIES = ['material', 'labor', 'machinery', 'transport', 'subcontractor', 'utilities', 'permits', 'safety', 'misc'];
const EXPENSE_STATUSES = ['pending', 'approved', 'rejected'];

// Helper: Recalculate and synchronize project spent based ONLY on approved expenses
const syncProjectSpent = async (projectId) => {
  const approvedExpenses = await Expense.find({
    projectId,
    status: { $in: ['approved', null] },
  });
  const totalApprovedSpent = approvedExpenses.reduce((sum, item) => sum + item.amount, 0);

  const project = await Project.findById(projectId);
  if (project) {
    project.spent = totalApprovedSpent;
    await project.save();

    // Check budget thresholds
    if (totalApprovedSpent > project.budget) {
      const alertExists = await Alert.findOne({
        projectId,
        type: 'budget',
        message: { $regex: /budget exceeded/i },
      });

      if (!alertExists) {
        await Alert.create({
          projectId,
          type: 'budget',
          message: `CRITICAL: Project budget has been exceeded! Approved spending: Rs ${totalApprovedSpent.toLocaleString()} (Budget: Rs ${project.budget.toLocaleString()}).`,
          severity: 'high',
        });
      }
    }
  }
  return totalApprovedSpent;
};

// @desc    Add or Submit an expense record
// @route   POST /api/v1/expenses
// @access  Private (Owner, Accountant auto-approves; Contractor submits pending)
export const addExpense = async (req, res) => {
  const { projectId, category, amount, description, date, receiptUrl } = req.body;

  try {
    if (!projectId || !category || !amount || !description) {
      return res.status(400).json({ success: false, message: 'Please provide all expense details' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be a positive number' });
    }

    const projectObjectId = toObjectId(projectId);
    const safeCategory = toSafeEnum(category, EXPENSE_CATEGORIES);
    if (!projectObjectId || !safeCategory) {
      return res.status(400).json({ success: false, message: 'Invalid projectId or category' });
    }

    const project = await Project.findById(projectObjectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Company isolation check
    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another company' });
    }

    // Contractor scoping check
    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId: projectObjectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    // Determine initial status:
    // If contractor submitted: 'pending' (requires owner approval)
    // If owner / accountant / manager / admin: 'approved' immediately
    const isAutoApproved = ['admin', 'owner', 'manager', 'accountant'].includes(req.user.role);
    const initialStatus = isAutoApproved ? 'approved' : 'pending';

    const expense = await Expense.create({
      companyId: project.companyId,
      projectId: projectObjectId,
      category: safeCategory,
      amount: numAmount,
      description,
      date: date || new Date(),
      receiptUrl: receiptUrl || '',
      status: initialStatus,
      addedBy: req.user._id,
      reviewedBy: isAutoApproved ? req.user._id : null,
      reviewedAt: isAutoApproved ? new Date() : null,
    });

    // If auto-approved, update project spent
    if (isAutoApproved) {
      await syncProjectSpent(projectObjectId);
    } else {
      // Notify owner through an alert
      await Alert.create({
        projectId: projectObjectId,
        type: 'budget',
        message: `New expense submitted by ${req.user.name} for Rs ${numAmount.toLocaleString()} (${category}). Pending Owner review.`,
        severity: 'low',
      });
    }

    res.status(201).json({
      success: true,
      message: isAutoApproved ? 'Expense recorded and approved' : 'Expense submitted for Owner approval',
      expense,
    });
  } catch (error) {
    console.error('Add expense error:', error);
    serverError(res, error, req);
  }
};

// @desc    Get expenses for a project
// @route   GET /api/v1/expenses
// @access  Private (Contractor sees own or assigned project expenses; Owner sees all)
export const getExpenses = async (req, res) => {
  const { projectId, category, status } = req.query;

  try {
    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
      return res.status(400).json({ success: false, message: 'Please specify a valid projectId parameter' });
    }

    const project = await Project.findById(projectObjectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Company isolation check
    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another company' });
    }

    // Contractor scoping check
    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId: projectObjectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    const query = { projectId: projectObjectId };
    const safeCategory = toSafeEnum(category, EXPENSE_CATEGORIES);
    if (safeCategory) query.category = safeCategory;
    const safeStatus = toSafeEnum(status, EXPENSE_STATUSES);
    if (safeStatus) query.status = safeStatus;

    const { page, limit, skip } = parsePagination(req);
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('addedBy', 'name role email')
        .populate('reviewedBy', 'name role'),
      Expense.countDocuments(query),
    ]);

    res.json({ success: true, expenses, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    Approve or Reject an expense
// @route   PUT /api/v1/expenses/:id/review
// @access  Private (Owner, Manager only)
export const reviewExpense = async (req, res) => {
  const { status, rejectionReason } = req.body;

  try {
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    // Restrict review to Owner, Manager, or Admin
    if (req.user.role === 'contractor') {
      return res.status(403).json({ success: false, message: 'Contractors cannot approve expenses' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const project = await Project.findById(expense.projectId);
    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Expense belongs to another company' });
    }

    expense.status = status;
    expense.reviewedBy = req.user._id;
    expense.reviewedAt = new Date();
    if (status === 'rejected') {
      expense.rejectionReason = rejectionReason || 'Rejected by owner';
    } else {
      expense.rejectionReason = '';
    }

    await expense.save();

    // Recalculate project spent based on approved expenses
    const updatedSpent = await syncProjectSpent(expense.projectId);

    res.json({
      success: true,
      message: `Expense has been ${status}`,
      expense,
      totalSpent: updatedSpent,
    });
  } catch (error) {
    console.error('Review expense error:', error);
    serverError(res, error, req);
  }
};

// @desc    Update expense record
// @route   PUT /api/v1/expenses/:id
// @access  Private (Owner, or Contractor editing own pending expense)
export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const project = await Project.findById(expense.projectId);
    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this project expense' });
    }

    // If contractor, they can only update their own expense and ONLY if it is still pending
    if (req.user.role === 'contractor') {
      if (expense.addedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only edit your own submitted expenses' });
      }
      if (expense.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Cannot edit an already approved expense' });
      }
      // Cannot self-approve
      delete req.body.status;
      delete req.body.reviewedBy;
    }

    const editable = pick(req.body, ['category', 'amount', 'description', 'date', 'receiptUrl']);
    const updated = await Expense.findByIdAndUpdate(req.params.id, editable, {
      new: true,
      runValidators: true,
    });

    await syncProjectSpent(expense.projectId);

    res.json({ success: true, expense: updated });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    Remove expense record
// @route   DELETE /api/v1/expenses/:id
// @access  Private (Owner, or Contractor deleting own pending expense)
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const project = await Project.findById(expense.projectId);
    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this project expense' });
    }

    // Contractors can only delete their own pending expenses
    if (req.user.role === 'contractor') {
      if (expense.addedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only delete your own submitted expenses' });
      }
      if (expense.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Cannot delete an already approved expense' });
      }
    }

    const projectId = expense.projectId;
    await expense.deleteOne();

    await syncProjectSpent(projectId);

    res.json({ success: true, message: 'Expense removed successfully' });
  } catch (error) {
    serverError(res, error, req);
  }
};
