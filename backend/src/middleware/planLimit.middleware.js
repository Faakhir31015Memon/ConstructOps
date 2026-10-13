import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import { getPlanLimits } from '../utils/subscription.util.js';

// Caps active sites per plan. Mounted on project creation.
export const limitProjects = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();
    const plan = req.subscription?.plan || 'trial';
    const limits = getPlanLimits(plan);
    const count = await Project.countDocuments({ companyId: req.user.companyId?._id || req.user.companyId });
    if (count >= limits.maxProjects) {
      return res.status(403).json({
        success: false,
        planLimit: true,
        message: `Your current plan (${plan}) allows up to ${limits.maxProjects} active sites. Upgrade your plan to add more.`,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Caps team members (owner/manager/accountant/contractor accounts) per plan.
export const limitUsers = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();
    const plan = req.subscription?.plan || 'trial';
    const limits = getPlanLimits(plan);
    const companyId = req.user.companyId?._id || req.user.companyId;
    const count = await User.countDocuments({ companyId });
    if (count >= limits.maxUsers) {
      return res.status(403).json({
        success: false,
        planLimit: true,
        message: `Your current plan (${plan}) allows up to ${limits.maxUsers} team members. Upgrade your plan to add more.`,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};
