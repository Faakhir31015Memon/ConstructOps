import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import SubscriptionBanner from './SubscriptionBanner';
import SubscriptionModal from './SubscriptionModal';
import AssistantChat from './AssistantChat';
import { getSubscriptionStatus } from '../services/api';
import { useLang } from '../i18n/LanguageContext';
import { clearSession } from '../services/api';

const Layout = ({ title }) => {
  const navigate = useNavigate();
  const { t } = useLang();
  const token = localStorage.getItem('token');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  const fetchSubscription = async () => {
    try {
      const res = await getSubscriptionStatus();
      if (res.success) {
        setSubscription(res.subscription);
      }
    } catch (err) {
      // If error payload indicates subscription expired
      if (err.response?.data?.subscriptionExpired) {
        setSubscription(err.response.data.subscription || { isExpired: true, daysRemaining: 0 });
      }
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      fetchSubscription();
    }
  }, [token, navigate]);

  const handleSubscriptionUpdated = (updatedSub) => {
    setSubscription(updatedSub);
    setPlansModalOpen(false);
  };

  const handlePaymentSubmitted = () => {
    fetchSubscription();
  };

  if (!token) {
    return null; // Prevents flashing content while redirecting
  }

  const isExpired = subscription?.isExpired;
  const isPaymentPending = Boolean(subscription?.pendingPayment);
  let isAdmin = false;
  try {
    isAdmin = JSON.parse(localStorage.getItem('user') || 'null')?.role === 'admin';
  } catch { /* malformed user cache — treat as non-admin */ }

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="main-viewport">
        {/* 7-Day Alert Banner or Expired Banner */}
        <SubscriptionBanner 
          subscription={subscription} 
          onOpenPlans={() => setPlansModalOpen(true)} 
        />

        <Navbar 
          title={title} 
          subscription={subscription}
          onOpenPlans={() => setPlansModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)} 
        />

        <main className="main-content-scroll">
          {/* If expired or payment awaiting approval, restrict workspace view */}
          {isPaymentPending && !isExpired ? (
            <div style={styles.expiredLockContainer}>
              <div style={styles.lockCard}>
                <div style={styles.lockBadge}>⏳</div>
                <h2 style={styles.lockTitle}>{t('Payment Under Verification')}</h2>
                <p style={styles.lockDesc}>
                  {t('Your {method} payment of Rs {amount} for the {plan} plan has been received. Your workspace and login are locked until the ConstructOps admin approves your payment.', {
                    method: subscription.pendingPayment.method?.replace('_', ' ').toUpperCase(),
                    amount: Number(subscription.pendingPayment.amount).toLocaleString('en-PK'),
                    plan: subscription.pendingPayment.plan.replace('_', ' '),
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearSession();
                    window.location.href = '/login?payment=pending';
                  }}
                  style={styles.reactivateMainBtn}
                >
                  🔐 {t('Go to Login Screen')}
                </button>
              </div>
            </div>
          ) : isExpired ? (
            <div style={styles.expiredLockContainer}>
              <div style={styles.lockCard}>
                <div style={styles.lockBadge}>🔒</div>
                <h2 style={styles.lockTitle}>{t('Workspace Suspended')}</h2>
                <p style={styles.lockDesc}>
                  {t('Your 15-day free trial or ConstructOps subscription plan has ended. Your account and team access have been paused until a plan is reactivated.')}
                </p>
                <div style={styles.planBadgesSummary}>
                  <div style={styles.summaryBadge}>{t('15-Day Trial (Ended)')}</div>
                  <div style={styles.summaryArrow}>➔</div>
                  <div style={styles.summaryTarget}>{t('Choose 1, 6, or 12 Month Plan')}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPlansModalOpen(true)}
                  style={styles.reactivateMainBtn}
                >
                  ⚡ {t('Reactivate ConstructOps Now')}
                </button>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Subscription Plans Selection / Reactivation Modal */}
      <SubscriptionModal
        isOpen={plansModalOpen || Boolean(isExpired)}
        onClose={() => setPlansModalOpen(false)}
        subscription={subscription}
        onSubscriptionUpdated={handleSubscriptionUpdated}
        onPaymentSubmitted={handlePaymentSubmitted}
        isExpiredLock={Boolean(isExpired)}
      />

      {/* Floating AI assistant for company users (not system admin) */}
      {!isAdmin && <AssistantChat />}
    </div>
  );
};

const styles = {
  expiredLockContainer: {
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '65vh',
  },
  lockCard: {
    maxWidth: '560px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '36px 28px',
    textAlign: 'center',
    border: '1px solid #fee2e2',
    boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.08), 0 8px 10px -6px rgba(220, 38, 38, 0.05)',
  },
  lockBadge: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  lockTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#991b1b',
    margin: '0 0 10px 0',
  },
  lockDesc: {
    fontSize: '0.92rem',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  planBadgesSummary: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '26px',
    flexWrap: 'wrap',
  },
  summaryBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  summaryArrow: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  summaryTarget: {
    padding: '6px 12px',
    borderRadius: '20px',
    backgroundColor: '#fff4eb',
    color: '#c2410c',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  reactivateMainBtn: {
    padding: '12px 28px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'var(--construction-orange, #ff6b00)',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255, 107, 0, 0.3)',
    transition: 'transform 0.15s ease',
  },
};

export default Layout;

