import Company from '../models/company.model.js';
import User from '../models/user.model.js';
import { PLAN_DURATIONS, getCompanySubscriptionDetails } from '../utils/subscription.util.js';

// Shared activation logic used by both the admin manual approval and the
// gateway capture webhook, so both paths keep subscription state identical.
export const activatePlanForPayment = async (payment, reviewNote = '') => {
  const company = await Company.findById(payment.companyId);
  if (!company) {
    throw new Error(`Company not found for payment ${payment._id}`);
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
  payment.reviewNote = reviewNote || payment.reviewNote || '';
  payment.reviewedAt = now;
  await payment.save();

  await User.updateMany({ companyId: company._id }, { status: 'active' });

  return { company, subscription: getCompanySubscriptionDetails(company) };
};
