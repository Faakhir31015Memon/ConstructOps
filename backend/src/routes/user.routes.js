import express from 'express';
import { protect, verifyAdmin, killUserSessions } from '../middleware/auth.middleware.js';
import RefreshToken from '../models/refreshToken.model.js';
import User from '../models/user.model.js';
import Expense from '../models/expense.model.js';
import DailyReport from '../models/dailyReport.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import { deleteCompanyData } from '../services/cascadeDelete.service.js';
import serverError from '../utils/serverError.js';

const router = express.Router();

// GET all registered users (Admin only)
router.get('/', protect, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .populate('companyId', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    serverError(res, error, req);
  }
});

// PUT ban/deactivate/reactivate user + delete all their projects & budgets (Admin only)
router.put('/:id/status', protect, verifyAdmin, async (req, res) => {
  const { status } = req.body;

  if (!['active', 'banned', 'deactivated'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // When banning or deactivating: cascade delete all projects, budgets, workers, expenses, etc.
    if ((status === 'banned' || status === 'deactivated') && user.companyId) {
      await deleteCompanyData(user.companyId, {
        deleteCompany: false,   // keep company container so companyId stays valid
        deleteUsers: false,     // keep the user in the list marked as banned/deactivated
      });
    }

    // Also remove any directly assigned projects, expenses, or reports for this user
    await Promise.allSettled([
      ProjectAssignment.deleteMany({ contractorId: user._id }),
      Expense.deleteMany({ addedBy: user._id }),
      DailyReport.deleteMany({ addedBy: user._id }),
    ]);

    user.status = status;
    await user.save();

    // A banned or deactivated account must stop working immediately, not in 7 days.
    if (status !== 'active') {
      await killUserSessions(user._id, `admin-${status}`);
    }

    res.json({
      success: true,
      message: (status === 'banned' || status === 'deactivated')
        ? 'User has been banned and all associated projects & budget data removed.'
        : 'User reactivated successfully.',
      user,
    });
  } catch (error) {
    serverError(res, error, req);
  }
});

// DELETE user + all their company data completely (Admin only - Deactivate & Clear)
router.delete('/:id', protect, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyId = user.companyId;
    const companyUserIds = companyId
      ? (await User.find({ companyId }).select('_id').lean()).map((u) => u._id)
      : [user._id];

    if (companyId) {
      // Wipe everything: company, all projects, all related data, all users of the company
      await deleteCompanyData(companyId, { deleteCompany: true, deleteUsers: true });
    }

    // Every token for this tenant is dead now that its data is gone.
    await RefreshToken.updateMany({ user: { $in: companyUserIds }, revokedAt: null }, { revokedAt: new Date(), revokeReason: 'account-deleted' });
    await User.updateMany({ _id: { $in: companyUserIds } }, { $inc: { tokenVersion: 1 } });

    // Remove user and user-specific references
    await Promise.allSettled([
      ProjectAssignment.deleteMany({ contractorId: user._id }),
      Expense.deleteMany({ addedBy: user._id }),
      DailyReport.deleteMany({ addedBy: user._id }),
      User.findByIdAndDelete(req.params.id),
    ]);

    res.json({ success: true, message: 'User and all associated data completely deleted successfully.' });
  } catch (error) {
    serverError(res, error, req);
  }
});

// DELETE clear all data for a company (Admin only) — keeps users, wipes projects & data only
router.delete('/:id/clear-data', protect, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('companyId');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.companyId) {
      return res.status(400).json({ success: false, message: 'This user has no associated company' });
    }

    // Wipe all project data but keep company + users intact
    await deleteCompanyData(user.companyId._id, { deleteCompany: false, deleteUsers: false });

    const companyUsers = await User.find({ companyId: user.companyId._id }).select('_id').lean();
    await RefreshToken.updateMany(
      { user: { $in: companyUsers.map((u) => u._id) }, revokedAt: null },
      { revokedAt: new Date(), revokeReason: 'data-cleared' }
    );
    await User.updateMany({ _id: { $in: companyUsers.map((u) => u._id) } }, { $inc: { tokenVersion: 1 } });

    res.json({ success: true, message: 'All company data cleared. Users and company record preserved.' });
  } catch (error) {
    serverError(res, error, req);
  }
});

export default router;
