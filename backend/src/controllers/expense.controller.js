import Expense from '../models/expense.model.js';
import Project from '../models/project.model.js';
import Alert from '../models/alert.model.js';

// @desc    Add an expense record
// @route   POST /api/v1/expenses
// @access  Private (Owner, Accountant)
export const addExpense = async (req, res) => {
  const { projectId, category, amount, description, date } = req.body;

  try {
    if (!projectId || !category || !amount || !description) {
      return res.status(400).json({ success: false, message: 'Please provide all expense details' });
    }

    const project = await Project.findOne({
      _id: projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    // Create Expense
    const expense = await Expense.create({
      projectId,
      category,
      amount,
      description,
      date: date || new Date(),
      addedBy: req.user._id,
    });

    // Recalculate Project total spent
    const projectExpenses = await Expense.find({ projectId });
    const totalSpent = projectExpenses.reduce((sum, item) => sum + item.amount, 0);

    project.spent = totalSpent;
    await project.save();

    // Budget over-run alerts
    if (totalSpent > project.budget) {
      // Check if alert already exists to prevent duplication
      const alertExists = await Alert.findOne({
        projectId,
        type: 'budget',
        message: { $regex: /budget exceeded/i },
      });

      if (!alertExists) {
        await Alert.create({
          projectId,
          type: 'budget',
          message: `CRITICAL: Project budget has been exceeded! Total spent: Rs ${totalSpent.toLocaleString()} (Budget: Rs ${project.budget.toLocaleString()}).`,
          severity: 'high',
        });
      }
    } else if (totalSpent > project.budget * 0.9) {
      const warningExists = await Alert.findOne({
        projectId,
        type: 'budget',
        message: { $regex: /approaching budget limit/i },
      });

      if (!warningExists) {
        await Alert.create({
          projectId,
          type: 'budget',
          message: `WARNING: Spent is approaching budget limit. Total spent is now 90%+ of total budget: Rs ${totalSpent.toLocaleString()} spent.`,
          severity: 'medium',
        });
      }
    }

    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get expenses for a project
// @route   GET /api/v1/expenses
// @access  Private
export const getExpenses = async (req, res) => {
  const { projectId, category } = req.query;

  try {
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Please specify projectId parameter' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    const query = { projectId };
    if (category) {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .populate('addedBy', 'name');

    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Update expense record
// @route   PUT /api/v1/expenses/:id
// @access  Private (Owner, Accountant)
export const updateExpense = async (req, res) => {
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Verify parent project belongs to user's company
    const project = await Project.findOne({
      _id: expense.projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this project expense' });
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Recalculate Project total spent
    const projectExpenses = await Expense.find({ projectId: expense.projectId });
    const totalSpent = projectExpenses.reduce((sum, item) => sum + item.amount, 0);

    await Project.findByIdAndUpdate(expense.projectId, { spent: totalSpent });

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Remove expense record
// @route   DELETE /api/v1/expenses/:id
// @access  Private (Owner only)
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Verify parent project belongs to user's company
    const project = await Project.findOne({
      _id: expense.projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this project expense' });
    }

    const projectId = expense.projectId;
    await expense.deleteOne();

    // Recalculate Project total spent
    const projectExpenses = await Expense.find({ projectId });
    const totalSpent = projectExpenses.reduce((sum, item) => sum + item.amount, 0);

    await Project.findByIdAndUpdate(projectId, { spent: totalSpent });

    res.json({ success: true, message: 'Expense removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
