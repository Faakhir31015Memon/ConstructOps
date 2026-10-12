import React from 'react';
import { AlertTriangle, Clock, ArrowRight, Zap, ShieldAlert } from 'lucide-react';

const SubscriptionBanner = ({ subscription, onOpenPlans }) => {
  if (!subscription) return null;

  const { isExpired, isExpiringSoon, daysRemaining, plan, isTrial } = subscription;

  if (!isExpired && !isExpiringSoon) return null;

  if (isExpired) {
    return (
      <div style={styles.expiredBanner}>
        <div style={styles.content}>
          <ShieldAlert size={20} color="#ffffff" style={{ flexShrink: 0 }} />
          <div style={styles.textContainer}>
            <span style={styles.title}>Account Access Suspended:</span>
            <span style={styles.message}>
              Your {isTrial ? '15-day free trial' : 'subscription plan'} has finished. Automatic user restrictions are active. Please reactivate your plan to restore full operations.
            </span>
          </div>
        </div>
        <button 
          type="button" 
          onClick={onOpenPlans} 
          style={styles.expiredBtn}
        >
          <Zap size={16} />
          <span>Reactivate Account</span>
        </button>
      </div>
    );
  }

  // 7-day prior alert
  return (
    <div style={styles.warningBanner}>
      <div style={styles.content}>
        <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0 }} />
        <div style={styles.textContainer}>
          <span style={styles.warningTitle}>
            Subscription Alert: Plan Expiring in {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}!
          </span>
          <span style={styles.warningMessage}>
            Your {isTrial ? '15-Day Free Trial' : `${plan.replace('_', ' ')} Plan`} is ending soon. Renew today to avoid automatic service suspension.
          </span>
        </div>
      </div>
      <button 
        type="button" 
        onClick={onOpenPlans} 
        style={styles.renewBtn}
      >
        <span>Renew / Extend Plan</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

const styles = {
  warningBanner: {
    backgroundColor: '#fffbeb',
    borderBottom: '2px solid #fde68a',
    padding: '10px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    zIndex: 100,
  },
  expiredBanner: {
    backgroundColor: '#dc2626',
    borderBottom: '2px solid #b91c1c',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    color: '#ffffff',
    zIndex: 100,
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  textContainer: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
    fontSize: '0.88rem',
  },
  warningTitle: {
    fontWeight: '700',
    color: '#92400e',
  },
  warningMessage: {
    color: '#78350f',
  },
  title: {
    fontWeight: '700',
    color: '#ffffff',
  },
  message: {
    color: '#fee2e2',
  },
  renewBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ff6b00',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 14px',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(255, 107, 0, 0.25)',
    flexShrink: 0,
  },
  expiredBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 16px',
    fontSize: '0.84rem',
    fontWeight: '700',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

export default SubscriptionBanner;
