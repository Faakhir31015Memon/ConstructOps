import Company from '../models/company.model.js';
import User from '../models/user.model.js';
import { getCompanySubscriptionDetails, PLAN_DURATIONS } from '../utils/subscription.util.js';

// @desc    Get company subscription status and alert state
// @route   GET /api/v1/subscription/status
// @access  Private
export const getSubscriptionStatus = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        subscription: {
          plan: 'enterprise',
          status: 'active',
          isTrial: false,
          daysRemaining: 9999,
          isExpiringSoon: false,
          isExpired: false,
          subscriptionEndDate: null,
          role: 'admin',
        },
      });
    }

    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No company attached to user' });
    }

    const companyId = req.user.companyId?._id || req.user.companyId;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const details = getCompanySubscriptionDetails(company);

    // Auto-update database status if expired
    if (details.isExpired && company.subscriptionStatus !== 'expired') {
      company.subscriptionStatus = 'expired';
      await company.save();
      // Auto-ban/suspend users of this company
      await User.updateMany({ companyId: company._id }, { status: 'banned' });
    }

    res.json({
      success: true,
      subscription: details,
    });
  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Reactivate or renew company subscription (1 month, 6 months, 12 months)
// @route   POST /api/v1/subscription/renew
// @access  Private (Owner / Manager or Expired User)
export const renewSubscription = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['1_month', '6_months', '12_months'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected. Choose between 1_month, 6_months, or 12_months.',
      });
    }

    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        message: 'Admin account has unlimited lifetime access.',
      });
    }

    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'No company associated with user' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const duration = PLAN_DURATIONS[plan];
    const now = new Date();
    let newEndDate;

    // If currently still active and not expired, add to remaining time. Otherwise start fresh from now.
    if (company.subscriptionEndDate && new Date(company.subscriptionEndDate) > now && company.subscriptionStatus === 'active') {
      newEndDate = new Date(new Date(company.subscriptionEndDate).getTime() + duration);
    } else {
      newEndDate = new Date(now.getTime() + duration);
    }

    company.subscriptionPlan = plan;
    company.subscriptionStatus = 'active';
    company.isTrial = false;
    company.subscriptionStartDate = now;
    company.subscriptionEndDate = newEndDate;
    await company.save();

    // Reactivate all users under this company
    await User.updateMany({ companyId: company._id }, { status: 'active' });

    const updatedDetails = getCompanySubscriptionDetails(company);

    res.json({
      success: true,
      message: `Your ${plan.replace('_', ' ')} plan has been successfully activated!`,
      subscription: updatedDetails,
    });
  } catch (error) {
    console.error('Subscription renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
