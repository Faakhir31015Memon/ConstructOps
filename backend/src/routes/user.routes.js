import express from 'express';
import { protect, verifyAdmin } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import { deleteCompanyData } from '../services/cascadeDelete.service.js';

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
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// PUT ban/unban user account (Admin only)
router.put('/:id/status', protect, verifyAdmin, async (req, res) => {
  const { status } = req.body;

  if (!['active', 'banned'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({ success: true, message: `User status updated to ${status}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// DELETE user + all their company data (Admin only)
router.delete('/:id', protect, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyId = user.companyId;

    if (companyId) {
      // If this user owns a company (role: owner / admin), wipe all company data
      if (['owner', 'admin'].includes(user.role)) {
        await deleteCompanyData(companyId, { deleteCompany: true, deleteUsers: true });
      } else {
        // Regular member — just delete the user; keep company intact
        await user.deleteOne();
      }
    } else {
      await user.deleteOne();
    }

    res.json({ success: true, message: 'User and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// DELETE clear all data for a company (Admin only) — keeps users, wipes projects & data
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

    res.json({ success: true, message: 'All company data cleared successfully. Users and company record preserved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

export default router;
