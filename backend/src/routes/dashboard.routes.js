import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import Project from '../models/project.model.js';
import Worker from '../models/worker.model.js';
import Material from '../models/material.model.js';
import Attendance from '../models/attendance.model.js';
import Expense from '../models/expense.model.js';
import DailyReport from '../models/dailyReport.model.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    // Filter by companyId unless it's system admin
    const filter = req.user.role === 'admin' ? {} : { companyId: req.user.companyId };

    const projects = await Project.find(filter).sort({ createdAt: -1 });
    const projectsCount = projects.length;
    
    // For workers and materials, if not admin, we filter by projects belonging to the company
    let projectIds = [];
    if (req.user.role !== 'admin') {
      projectIds = projects.map(p => p._id);
    }

    const workerFilter = req.user.role === 'admin' ? {} : { projectId: { $in: projectIds } };
    const materialFilter = req.user.role === 'admin' ? {} : { projectId: { $in: projectIds } };
    const expenseFilter = req.user.role === 'admin' ? {} : { projectId: { $in: projectIds } };

    const workersCount = await Worker.countDocuments(workerFilter);
    
    // Sum of all materials quantity
    const materials = await Material.find(materialFilter);
    const totalMaterialsQty = materials.reduce((sum, m) => sum + (m.quantity || 0), 0);

    // Sum of all budgets and approved expenses
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const approvedExpensesList = await Expense.find({
      ...expenseFilter,
      status: { $in: ['approved', null] },
    });
    const pendingExpensesList = await Expense.find({
      ...expenseFilter,
      status: 'pending',
    });
    const totalSpent = approvedExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPending = pendingExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Chart 1: Project Progress
    const progressData = projects.slice(0, 5).map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
      progress: p.progress || 0
    }));

    // Chart 2: Budget vs Actual (Months)
    const expenses = await Expense.find(expenseFilter);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const budgetData = months.map((m, idx) => {
      const planned = Math.round((totalBudget / 12) * (idx + 1) * 0.8);
      
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date || e.createdAt);
        return d.getMonth() === idx;
      });
      const actual = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      return { name: m, planned, actual };
    }).filter(data => data.planned > 0 || data.actual > 0);

    if (budgetData.length === 0) {
      budgetData.push(
        { name: 'Jan', planned: 10000, actual: 8000 },
        { name: 'Feb', planned: 15000, actual: 12000 },
        { name: 'Mar', planned: 20000, actual: 18000 }
      );
    }

    // Chart 3: Worker Attendance
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const attendanceFilter = {
      date: today,
      ...(req.user.role !== 'admin' && { projectId: { $in: projectIds } }),
    };

    const todayAttendance = await Attendance.find(attendanceFilter);
    const presentCount = todayAttendance.filter(a => a.status === 'present').length;
    const absentCount = todayAttendance.filter(a => a.status === 'absent').length;

    const workerData = [
      { name: 'Present', value: presentCount },
      { name: 'Absent', value: absentCount }
    ];

    // Detailed Audit data requested by the User:
    // 1. Detailed Projects with dates, locations, spent, budget, progress
    const detailedProjects = projects.map(p => ({
      id: p._id,
      name: p.name,
      location: p.location,
      budget: p.budget,
      spent: p.spent,
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status
    }));

    // 2. Detailed Expenses with addedBy user details and projectId details
    const detailedExpenses = await Expense.find(expenseFilter)
      .sort({ date: -1 })
      .limit(15)
      .populate('addedBy', 'name role email')
      .populate('projectId', 'name location');

    // 3. Detailed Daily Reports with addedBy user details, workType, etc.
    const detailedReports = await DailyReport.find(expenseFilter)
      .sort({ date: -1 })
      .limit(15)
      .populate('addedBy', 'name role email')
      .populate('projectId', 'name location');

    // 4. Detailed Workers list with role (designated task) and project information
    const detailedWorkers = await Worker.find(workerFilter)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('projectId', 'name location');

    res.json({
      success: true,
      stats: {
        projects: projectsCount,
        workers: workersCount,
        materials: totalMaterialsQty,
        budget: totalSpent,
        totalBudget,
        pendingExpenses: totalPending,
        remainingBudget: totalBudget - totalSpent,
      },
      progressData,
      budgetData,
      workerData,
      detailedProjects,
      detailedExpenses,
      detailedReports,
      detailedWorkers
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

export default router;
