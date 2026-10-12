/**
 * Calculates current subscription status for a company
 * @param {Object} company - Company mongoose document or plain object
 * @returns {Object} status information
 */
export const getCompanySubscriptionDetails = (company) => {
  if (!company) {
    return {
      plan: 'trial',
      status: 'active',
      isTrial: true,
      daysRemaining: 15,
      isExpiringSoon: false,
      isExpired: false,
      subscriptionEndDate: null,
    };
  }

  const now = new Date();
  const endDate = company.subscriptionEndDate ? new Date(company.subscriptionEndDate) : null;

  if (!endDate) {
    return {
      plan: company.subscriptionPlan || 'trial',
      status: company.subscriptionStatus || 'active',
      isTrial: Boolean(company.isTrial),
      daysRemaining: 15,
      isExpiringSoon: false,
      isExpired: false,
      subscriptionEndDate: null,
    };
  }

  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = diffMs <= 0 || company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'banned';
  const isExpiringSoon = !isExpired && daysRemaining <= 7 && daysRemaining >= 0;

  return {
    plan: company.subscriptionPlan || 'trial',
    status: isExpired ? 'expired' : (company.subscriptionStatus || 'active'),
    isTrial: Boolean(company.isTrial),
    daysRemaining: isExpired ? 0 : daysRemaining,
    isExpiringSoon,
    isExpired,
    subscriptionStartDate: company.subscriptionStartDate,
    subscriptionEndDate: company.subscriptionEndDate,
    trialEndDate: company.trialEndDate,
  };
};

/**
 * Plan duration helpers
 */
export const PLAN_DURATIONS = {
  'trial': 15 * 24 * 60 * 60 * 1000,
  '1_month': 30 * 24 * 60 * 60 * 1000,
  '6_months': 180 * 24 * 60 * 60 * 1000,
  '12_months': 365 * 24 * 60 * 60 * 1000,
};
