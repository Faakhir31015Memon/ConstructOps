import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Zap, 
  AlertTriangle, 
  Lock, 
  Calendar, 
  Sparkles, 
  X,
  CreditCard
} from 'lucide-react';
import { renewSubscription } from '../services/api';

const PLANS = [
  {
    id: '1_month',
    name: '1 Month Plan',
    duration: '30 Days Access',
    price: '$29',
    billing: 'billed monthly',
    popular: false,
    badge: null,
    features: [
      'Full Project & Budget Management',
      'Inventory, Material & Stock Tracking',
      'Expense Ledger & 9 Category Breakdowns',
      'Multi-device Responsive Access',
      'Standard Email Support',
    ],
  },
  {
    id: '6_months',
    name: '6 Months Plan',
    duration: '180 Days Access',
    price: '$149',
    billing: 'billed semi-annually (save 15%)',
    popular: true,
    badge: 'MOST POPULAR',
    features: [
      'Everything in 1 Month Plan',
      'Contractor & Labor Wage Calculations',
      'Daily Progress & Financial Auditing',
      '7-Day Expiration Safety Alerts',
      'Priority Customer Support',
    ],
  },
  {
    id: '12_months',
    name: '12 Months Plan',
    duration: '365 Days Access',
    price: '$269',
    billing: 'billed annually (save 25%)',
    popular: false,
    badge: 'BEST VALUE',
    features: [
      'Everything in 6 Months Plan',
      '1 Year Uninterrupted Workspace Access',
      'Complete Construction Analytics & PDF Export',
      'Unlimited Team & Contractor Accounts',
      'Dedicated VIP Support & Auto-Backups',
    ],
  },
];

const SubscriptionModal = ({ 
  isOpen, 
  onClose, 
  subscription, 
  onSubscriptionUpdated,
  isExpiredLock = false 
}) => {
  const [selectedPlan, setSelectedPlan] = useState('6_months');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleActivate = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await renewSubscription(selectedPlan);
      if (res.success) {
        setSuccessMsg(res.message || 'Plan reactivated successfully!');
        if (onSubscriptionUpdated) {
          onSubscriptionUpdated(res.subscription);
        }
        setTimeout(() => {
          if (!isExpiredLock && onClose) {
            onClose();
          }
        }, 1200);
      } else {
        setError(res.message || 'Failed to activate plan.');
      }
    } catch (err) {
      console.error('Subscription renewal error:', err);
      setError(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={isExpiredLock ? styles.lockIconBadge : styles.sparkleBadge}>
              {isExpiredLock ? <Lock size={22} color="#dc2626" /> : <Sparkles size={22} color="#ff6b00" />}
            </div>
            <div>
              <h2 style={styles.title}>
                {isExpiredLock ? 'Account Suspended: Plan Expired' : 'Manage Subscription Plan'}
              </h2>
              <p style={styles.subtitle}>
                {isExpiredLock
                  ? 'Your 15-day free trial or subscription period has finished. Choose a plan to reactivate your account immediately.'
                  : 'Upgrade or extend your ConstructOps subscription for uninterrupted construction operations.'}
              </p>
            </div>
          </div>
          {!isExpiredLock && onClose && (
            <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Status Callout */}
        {subscription && (
          <div style={isExpiredLock ? styles.expiredBanner : styles.activeBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isExpiredLock ? (
                <AlertTriangle size={18} color="#dc2626" />
              ) : (
                <Clock size={18} color="#d97706" />
              )}
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {isExpiredLock
                  ? 'Account is currently suspended'
                  : subscription.isTrial
                  ? `Free Trial Active: ${subscription.daysRemaining} Day(s) Remaining`
                  : `Plan: ${subscription.plan.replace('_', ' ').toUpperCase()} (${subscription.daysRemaining} days left)`}
              </span>
            </div>
            {subscription.subscriptionEndDate && (
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                Expires: {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && <div style={styles.errorAlert}>{error}</div>}
        {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

        {/* Plans Grid */}
        <div style={styles.plansGrid}>
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  ...styles.planCard,
                  borderColor: isSelected ? 'var(--construction-orange, #ff6b00)' : '#e5e7eb',
                  backgroundColor: isSelected ? '#fff9f5' : '#ffffff',
                  boxShadow: isSelected ? '0 10px 25px -5px rgba(255, 107, 0, 0.15)' : 'none',
                }}
              >
                {plan.badge && (
                  <div 
                    style={{
                      ...styles.planBadge,
                      backgroundColor: plan.popular ? 'var(--construction-orange, #ff6b00)' : '#059669',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={styles.planName}>{plan.name}</h3>
                    <div style={styles.planDuration}>{plan.duration}</div>
                  </div>
                  <div
                    style={{
                      ...styles.radioCircle,
                      borderColor: isSelected ? '#ff6b00' : '#cbd5e1',
                      backgroundColor: isSelected ? '#ff6b00' : 'transparent',
                    }}
                  >
                    {isSelected && <div style={styles.radioInner} />}
                  </div>
                </div>

                <div style={styles.priceContainer}>
                  <span style={styles.price}>{plan.price}</span>
                  <span style={styles.billing}>{plan.billing}</span>
                </div>

                <div style={styles.featureList}>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} style={styles.featureItem}>
                      <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <div style={styles.footerNote}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>Instant Activation • Secure Database Sync • Cancel Anytime</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {!isExpiredLock && onClose && (
              <button 
                type="button" 
                onClick={onClose} 
                style={styles.cancelBtn}
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleActivate}
              disabled={loading}
              style={styles.activateBtn}
            >
              {loading ? (
                'Processing Activation...'
              ) : (
                <>
                  <Zap size={18} />
                  <span>{isExpiredLock ? 'Reactivate My Account Now' : 'Confirm & Activate Plan'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '920px',
    width: '100%',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '28px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  lockIconBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sparkleBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: '#fff4eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '0.88rem',
    color: '#64748b',
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '6px',
    borderRadius: '8px',
  },
  activeBanner: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    padding: '10px 16px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#92400e',
    flexWrap: 'wrap',
    gap: '8px',
  },
  expiredBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    padding: '12px 16px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#991b1b',
    flexWrap: 'wrap',
    gap: '8px',
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  successAlert: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  planCard: {
    position: 'relative',
    border: '2px solid',
    borderRadius: '14px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  planBadge: {
    position: 'absolute',
    top: '-10px',
    right: '16px',
    color: '#ffffff',
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '3px 9px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  planName: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#0f172a',
  },
  planDuration: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '2px',
  },
  radioCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
  },
  priceContainer: {
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '12px',
  },
  price: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#0f172a',
  },
  billing: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.82rem',
    color: '#334155',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    lineHeight: 1.35,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  footerNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    color: '#64748b',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontWeight: '600',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  activateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 22px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--construction-orange, #ff6b00)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
  },
};

export default SubscriptionModal;
