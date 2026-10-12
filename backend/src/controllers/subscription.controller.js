import Company from '../models/company.model.js';
import User from '../models/user.model.js';
import SubscriptionPayment from '../models/subscriptionPayment.model.js';
import {
  getCompanySubscriptionDetails,
  PLAN_DURATIONS,
  PLAN_PRICES,
  SUBSCRIPTION_PLANS,
  PAYMENT_METHODS,
  getGatewayConfig,
} from '../utils/subscription.util.js';

// @desc    Get plan prices (PKR) and payment gateway instructions
// @route   GET /api/v1/subscription/plans
// @access  Private
export const getPlans = async (req, res) => {
  try {
    const plans = SUBSCRIPTION_PLANS.map((plan) => ({
      id: plan,
      amountPKR: PLAN_PRICES[plan],
      days: PLAN_DURATIONS[plan] / (24 * 60 * 60 * 1000),
    }));
    res.json({ success: true, plans, gateway: getGatewayConfig() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Submit a subscription payment for admin verification.
//          All company users are locked out (pending_payment) until admin approves.
// @route   POST /api/v1/subscription/payment
// @access  Private (Owner / Manager)
export const submitSubscriptionPayment = async (req, res) => {
  try {
    const { plan, method, transactionReference, payerDetails, cardHolderName, cardNumber } = req.body;

    if (!SUBSCRIPTION_PLANS.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected. Choose between 1_month, 6_months, or 12_months.' });
    }
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method. Choose card, easypaisa, jazzcash or bank_transfer.' });
    }

    let reference = (transactionReference || '').trim();
    let details = (payerDetails || '').trim();

    if (method === 'card') {
      if (!(cardHolderName || '').trim()) {
        return res.status(400).json({ success: false, message: 'Cardholder name is required.' });
      }
      const digits = (cardNumber || '').replace(/\D/g, '');
      if (digits.length < 4) {
        return res.status(400).json({ success: false, message: 'Invalid card number.' });
      }
      // Only the last 4 digits are ever stored — never the full card number.
      details = `Card: **** **** **** ${digits.slice(-4)} | ${cardHolderName.trim()}`.trim();
      if (!reference) reference = `CARD-${Date.now()}`;
    } else {
      if (!reference) {
        return res.status(400).json({ success: false, message: 'Transaction ID / reference number is required.' });
      }
    }

    if (req.user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin accounts do not require a subscription.' });
    }

    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'No company associated with user' });
    }

    const existingPending = await SubscriptionPayment.findOne({ companyId, status: 'pending' });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'A payment is already under review. You will be notified once the admin approves it.',
      });
    }

    const payment = await SubscriptionPayment.create({
      companyId,
      submittedBy: req.user._id,
      plan,
      amount: PLAN_PRICES[plan],
      currency: 'PKR',
      method,
      transactionReference: reference,
      payerDetails: details,
      status: 'pending',
    });

    // Lock the whole company out until the admin approves the payment
    await User.updateMany({ companyId }, { status: 'pending_payment' });

    res.status(201).json({
      success: true,
      message: 'Payment submitted successfully! Your account will be activated after admin verification. You will not be able to log in until then.',
      paymentId: payment._id,
    });
  } catch (error) {
    console.error('Subscription payment submission error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get payment history for the current company
// @route   GET /api/v1/subscription/payments
// @access  Private
export const getMyPayments = async (req, res) => {
  try {
    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) {
      return res.json({ success: true, payments: [] });
    }
    const payments = await SubscriptionPayment.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Admin: list subscription payments
// @route   GET /api/v1/subscription/admin/payments?status=pending
// @access  Admin
export const listAllPayments = async (req, res) => {
  try {
    const filter = {};
    if (['pending', 'approved', 'rejected'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const payments = await SubscriptionPayment.find(filter)
      .populate('companyId', 'name subscriptionPlan subscriptionStatus')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Admin: approve a subscription payment and activate the plan
// @route   PUT /api/v1/subscription/admin/payments/:id/approve
// @access  Admin
export const approveSubscriptionPayment = async (req, res) => {
  try {
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
    }

    const company = await Company.findById(payment.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const duration = PLAN_DURATIONS[payment.plan];
    const now = new Date();
    let newEndDate;
    if (company.subscriptionEndDate && new Date(company.subscriptionEndDate) > now && company.subscriptionStatus === 'active') {
      newEndDate = new Date(new Date(company.subscriptionEndDate).getTime() + duration);
    } else {
      newEndDate = new Date(now.getTime() + duration);
    }

    company.subscriptionPlan = payment.plan;
    company.subscriptionStatus = 'active';
    company.isTrial = false;
    company.subscriptionStartDate = now;
    company.subscriptionEndDate = newEndDate;
    await company.save();

    payment.status = 'approved';
    payment.reviewNote = (req.body.reviewNote || '').trim();
    payment.reviewedAt = new Date();
    await payment.save();

    await User.updateMany({ companyId: company._id }, { status: 'active' });

    res.json({
      success: true,
      message: `Payment approved. ${payment.plan.replace('_', ' ')} plan activated for ${company.name}. Users can now log in.`,
      subscription: getCompanySubscriptionDetails(company),
    });
  } catch (error) {
    console.error('Payment approval error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Admin: reject a subscription payment
// @route   PUT /api/v1/subscription/admin/payments/:id/reject
// @access  Admin
export const rejectSubscriptionPayment = async (req, res) => {
  try {
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });
    }

    payment.status = 'rejected';
    payment.reviewNote = (req.body.reviewNote || '').trim();
    payment.reviewedAt = new Date();
    await payment.save();

    // Restore login state based on whether the company's existing plan is still valid
    const company = await Company.findById(payment.companyId);
    const details = company ? getCompanySubscriptionDetails(company) : { isExpired: true };
    const restoredStatus = details.isExpired ? 'banned' : 'active';
    await User.updateMany({ companyId: payment.companyId }, { status: restoredStatus });

    res.json({
      success: true,
      message: `Payment rejected. Company users set to '${restoredStatus}'.`,
    });
  } catch (error) {
    console.error('Payment rejection error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

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
      // Auto-ban/suspend users of this company (payments under review stay pending)
      await User.updateMany({ companyId: company._id, status: 'active' }, { status: 'banned' });
    }

    const pendingPayment = await SubscriptionPayment.findOne({ companyId, status: 'pending' }).sort({ createdAt: -1 });
    details.pendingPayment = pendingPayment
      ? {
          id: pendingPayment._id,
          plan: pendingPayment.plan,
          amount: pendingPayment.amount,
          currency: pendingPayment.currency,
          method: pendingPayment.method,
          submittedAt: pendingPayment.createdAt,
        }
      : null;

    res.json({
      success: true,
      subscription: details,
    });
  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Directly activate/renew a plan (admin-only manual override)
// @route   POST /api/v1/subscription/renew
// @access  Admin
export const renewSubscription = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!SUBSCRIPTION_PLANS.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected. Choose between 1_month, 6_months, or 12_months.',
      });
    }

    const companyId = req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required for manual renewal' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const duration = PLAN_DURATIONS[plan];
    const now = new Date();
    let newEndDate;

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

    await User.updateMany({ companyId: company._id }, { status: 'active' });

    const updatedDetails = getCompanySubscriptionDetails(company);

    res.json({
      success: true,
      message: `${plan.replace('_', ' ')} plan has been successfully activated!`,
      subscription: updatedDetails,
    });
  } catch (error) {
    console.error('Subscription renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
