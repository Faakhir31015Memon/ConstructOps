import { sameId } from '../utils/ids.js';
import Project from '../models/project.model.js';
import Expense from '../models/expense.model.js';
import Worker from '../models/worker.model.js';
import Alert from '../models/alert.model.js';
import DailyReport from '../models/dailyReport.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import Contract from '../models/contract.model.js';
import Payment from '../models/payment.model.js';
import { pick } from '../utils/pick.js';

// @desc    Create a new project
// @route   POST /api/v1/projects
// @access  Private (Owner, Manager)
export const createProject = async (req, res) => {
  const { name, location, budget, startDate, endDate, status } = req.body;

  try {
    if (!name || !location || !budget || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const project = await Project.create({
      name,
      location,
      budget: Number(budget),
      spent: 0,
      startDate,
      endDate,
      status: status || 'active',
      companyId: req.user.companyId,
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get all accessible projects (Owners get company projects; Contractors get only assigned projects)
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    // 1. Super Admin: sees all projects
    if (req.user.role === 'admin') {
      const projects = await Project.find({}).sort({ createdAt: -1 });
      return res.json({ success: true, projects });
    }

    // 2. Contractor: sees ONLY projects assigned to them
    if (req.user.role === 'contractor') {
      const assignments = await ProjectAssignment.find({
        contractorId: req.user._id,
        status: 'active',
      }).select('projectId');

      const assignedProjectIds = assignments.map((a) => a.projectId);
      const projects = await Project.find({
        _id: { $in: assignedProjectIds },
        companyId: req.user.companyId,
      }).sort({ createdAt: -1 });

      return res.json({ success: true, projects });
    }

    // 3. Company Owner / Manager / Accountant: sees all projects of their company
    const projects = await Project.find({ companyId: req.user.companyId }).sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get single project details
// @route   GET /api/v1/projects/:id
// @access  Private
export const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Super Admin: full access
    if (req.user.role === 'admin') {
      return res.json({ success: true, project });
    }

    // Company isolation check
    if (!sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another company' });
    }

    // Contractor scoping check
    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId: project._id,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Update project
// @route   PUT /api/v1/projects/:id
// @access  Private (Owner, Manager)
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another company' });
    }

    // Prevent contractors from updating project settings or budgets
    if (req.user.role === 'contractor') {
      return res.status(403).json({ success: false, message: 'Access denied: Contractors cannot modify project configuration' });
    }

    const editable = pick(req.body, ['name', 'location', 'budget', 'startDate', 'endDate', 'status', 'progress']);
    const updated = await Project.findByIdAndUpdate(req.params.id, editable, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, project: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/v1/projects/:id
// @access  Private (Owner only)
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another company' });
    }

    await project.deleteOne();
    // Also clean up assignments
    await ProjectAssignment.deleteMany({ projectId: project._id });

    res.json({ success: true, message: 'Project removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get project dashboard summary (Role-adapted financial & progress metrics)
// @route   GET /api/v1/projects/:id/dashboard
// @access  Private
export const getProjectDashboard = async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Company isolation check
    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Project belongs to another company' });
    }

    // Contractor assignment check
    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId: project._id,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    // Financial calculations:
    // Approved expenses determine actual spending
    // Pending expenses remain separate
    const allExpenses = await Expense.find({ projectId });
    
    // Fallback: if existing records didn't have status, treat them as approved
    const approvedExpenses = allExpenses.filter((e) => e.status === 'approved' || !e.status);
    const pendingExpensesList = allExpenses.filter((e) => e.status === 'pending');
    const rejectedExpensesList = allExpenses.filter((e) => e.status === 'rejected');

    const totalApprovedSpent = approvedExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalPendingAmount = pendingExpensesList.reduce((sum, item) => sum + item.amount, 0);
    const remainingBudget = (project.budget || 0) - totalApprovedSpent;

    // Keep project.spent synchronized with approved expenses
    if (project.spent !== totalApprovedSpent) {
      project.spent = totalApprovedSpent;
      await project.save();
    }

    // 2. Count workers
    const activeWorkers = await Worker.countDocuments({ projectId });

    // 3. Count active unread alerts
    const activeAlerts = await Alert.find({ projectId, isRead: false }).sort({ createdAt: -1 });

    // 4. Fetch latest daily site reports (last 5)
    const latestReports = await DailyReport.find({ projectId })
      .sort({ date: -1 })
      .limit(5)
      .populate('addedBy', 'name role');

    // 5. Gather category-wise approved expenses
    const expensesByCategory = {
      material: 0,
      labor: 0,
      machinery: 0,
      transport: 0,
      subcontractor: 0,
      utilities: 0,
      permits: 0,
      safety: 0,
      misc: 0,
    };
    approvedExpenses.forEach((exp) => {
      if (expensesByCategory[exp.category] !== undefined) {
        expensesByCategory[exp.category] += exp.amount;
      } else {
        expensesByCategory.misc = (expensesByCategory.misc || 0) + exp.amount;
      }
    });

    // 6. Contracts and Payments summary for this project
    const contract = await Contract.findOne({ projectId, status: 'active' })
      .populate('contractorId', 'name email');
    
    const payments = await Payment.find({ projectId }).sort({ paymentDate: -1 });
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    // 7. Assigned Contractors for this project
    const assignments = await ProjectAssignment.find({ projectId, status: 'active' })
      .populate('contractorId', 'name email status');

    res.json({
      success: true,
      data: {
        projectId: project._id,
        projectName: project.name,
        location: project.location,
        budget: project.budget,
        spent: totalApprovedSpent,
        totalApprovedSpent,
        totalPendingAmount,
        pendingCount: pendingExpensesList.length,
        remainingBudget,
        progress: project.progress,
        status: project.status,
        activeWorkers,
        alerts: activeAlerts,
        latestReports,
        expensesByCategory,
        contract: contract || null,
        totalPaid,
        payments,
        assignedContractors: assignments.map((a) => a.contractorId),
      },
    });
  } catch (error) {
    console.error('Project dashboard fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
