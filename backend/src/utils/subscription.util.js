import { getGatewayAvailability } from '../services/paymentGateway.service.js';

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

/**
 * Subscription plan prices in PKR
 */
export const PLAN_PRICES = {
  '1_month': 15000,
  '6_months': 75000,
  '12_months': 135000,
};

export const SUBSCRIPTION_PLANS = ['1_month', '6_months', '12_months'];

export const PAYMENT_METHODS = ['card', 'easypaisa', 'jazzcash', 'bank_transfer'];

/**
 * Payment gateway instructions shown to the user at checkout.
 * Values come from environment so they can be updated without code changes.
 */
export const getGatewayConfig = () => ({
  currency: 'PKR',
  gateways: getGatewayAvailability(),
  methods: [
    {
      id: 'card',
      label: 'Debit / Credit Card',
      description: 'Enter your card details. The charge is captured after verification by our team.',
      fields: ['cardHolderName', 'cardNumber', 'expiry', 'cvvNote'],
      accountLabel: null,
      accountValue: null,
    },
    {
      id: 'easypaisa',
      label: 'EasyPaisa',
      description: 'Send the plan amount to the ConstructOps EasyPaisa account, then enter the transaction ID (TID) below.',
      fields: ['transactionId'],
      accountLabel: 'EasyPaisa Account',
      accountValue: process.env.EASYPAISA_NUMBER || '03XX-XXXXXXX',
    },
    {
      id: 'jazzcash',
      label: 'JazzCash',
      description: 'Send the plan amount to the ConstructOps JazzCash account, then enter the transaction ID below.',
      fields: ['transactionId'],
      accountLabel: 'JazzCash Account',
      accountValue: process.env.JAZZCASH_NUMBER || '03XX-XXXXXXX',
    },
    {
      id: 'bank_transfer',
      label: 'Bank Transfer',
      description: 'Transfer the plan amount to the bank account below, then enter the reference/UTR number.',
      fields: ['transactionId'],
      accountLabel: 'Bank Details',
      accountValue: `${process.env.BANK_NAME || 'Bank Name'} — ${process.env.BANK_ACCOUNT_TITLE || 'Account Title'} — ${process.env.BANK_ACCOUNT_NUMBER || 'Account Number'}`,
    },
  ],
});
