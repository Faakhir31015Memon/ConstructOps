import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  X,
  CreditCard,
  Smartphone,
  Landmark,
  ArrowLeft,
  Hourglass
} from 'lucide-react';
import { submitSubscriptionPayment, getSubscriptionPlans, getPakBanks } from '../services/api';
import { useLang } from '../i18n/LanguageContext';

const PLANS = [
  {
    id: '1_month',
    name: '1 Month Plan',
    duration: '30 Days Access',
    amountPKR: 15000,
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
    amountPKR: 75000,
    billing: 'billed semi-annually (save ~17%)',
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
    amountPKR: 135000,
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

const METHOD_ICONS = {
  card: CreditCard,
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank_transfer: Landmark,
};

const formatPKR = (amount) => `Rs ${Number(amount).toLocaleString('en-PK')}`;

const SubscriptionModal = ({
  isOpen,
  onClose,
  subscription,
  onSubscriptionUpdated,
  onPaymentSubmitted,
  isExpiredLock = false
}) => {
  const { t } = useLang();
  const [step, setStep] = useState('plan'); // plan | pay | done
  const [selectedPlan, setSelectedPlan] = useState('6_months');
  const [selectedMethod, setSelectedMethod] = useState('easypaisa');
  const [gateway, setGateway] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [banks, setBanks] = useState([]);
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [payerMobile, setPayerMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      getSubscriptionPlans()
        .then((res) => { if (res.success) setGateway(res.gateway); })
        .catch(() => { /* gateway info is optional */ });
      getPakBanks()
        .then((res) => { if (res.success) setBanks(res.banks || []); })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStep(subscription?.pendingPayment ? 'pending' : 'plan');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, subscription?.pendingPayment]);

  if (!isOpen) return null;

  const currentPlan = PLANS.find((p) => p.id === selectedPlan);

  const handleSubmitPayment = async (payVia = 'manual') => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        plan: selectedPlan,
        method: selectedMethod,
      };
      if (selectedMethod === 'card') {
        payload.cardHolderName = cardHolderName;
        payload.cardNumber = cardNumber;
      } else if (selectedMethod === 'bank_transfer') {
        payload.transactionReference = transactionId;
        payload.bankInfo = { bankName, accountTitle, accountNumber, iban };
      } else {
        payload.transactionReference = transactionId;
      }

      if (payVia === 'gateway') {
        payload.payVia = 'gateway';
        payload.payerMobile = payerMobile;
      }

      const res = await submitSubscriptionPayment(payload);
      if (res.success) {
        if (res.mode === 'gateway' && res.checkoutUrl) {
          window.open(res.checkoutUrl, '_blank', 'noopener');
          setSuccessMsg(`Checkout window opened for ${selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} payment. Complete the payment there, then log in again — access unlocks automatically once the payment is captured.`);
        } else {
          setSuccessMsg(res.message || 'Payment submitted for verification!');
        }
        setStep('pending');
        if (onPaymentSubmitted) onPaymentSubmitted();
      } else {
        setError(res.message || 'Payment submission failed.');
      }
    } catch (err) {
      console.error('Subscription payment error:', err);
      setError(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const methodInstruction = gateway?.methods?.find((m) => m.id === selectedMethod);

  const renderPending = () => {
    const pending = subscription?.pendingPayment;
    return (
      <div style={styles.pendingCard}>
        <Hourglass size={40} color="#d97706" />
        <h3 style={{ margin: '12px 0 6px', color: '#92400e', fontSize: '1.15rem' }}>
          {successMsg ? 'Payment Submitted for Verification' : 'Payment Under Review'}
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#78350f', lineHeight: 1.5, maxWidth: '520px' }}>
          {successMsg || 'Your payment is being verified by the ConstructOps admin team. '}
          {pending && (
            <>
              <strong>{pending.plan.replace('_', ' ')}</strong> plan — <strong>{formatPKR(pending.amount)}</strong> via{' '}
              <strong>{String(pending.method).replace('_', ' ').toUpperCase()}</strong>.
            </>
          )}{' '}
          Your login will be activated as soon as the admin approves the payment.
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login?payment=pending';
          }}
          style={styles.activateBtn}
        >
          <Lock size={18} />
          <span>{t('Go to Login Screen')}</span>
        </button>
      </div>
    );
  };

  const renderPlanStep = () => (
    <>
      {/* Status Callout */}
      {subscription && !subscription.pendingPayment && (
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

      {error && step === 'plan' && <div style={styles.errorAlert}>{error}</div>}

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
                <span style={styles.price}>{formatPKR(plan.amountPKR)}</span>
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
          <span>PKR Pricing • EasyPaisa / JazzCash / Card / Bank Transfer • Admin Verified Activation</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!isExpiredLock && onClose && (
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              {t('Cancel')}
            </button>
          )}
          <button type="button" onClick={() => { setError(''); setStep('pay'); }} style={styles.activateBtn}>
            <CreditCard size={18} />
            <span>{t('Proceed to Payment')}</span>
          </button>
        </div>
      </div>
    </>
  );

  const renderPayStep = () => (
    <>
      <button type="button" onClick={() => setStep('plan')} style={styles.backBtn}>
        <ArrowLeft size={15} /> Back to plans
      </button>

      {/* Selected plan summary */}
      <div style={styles.planSummary}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>{currentPlan.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{currentPlan.duration}</div>
        </div>
        <div style={{ fontWeight: '800', fontSize: '1.3rem', color: 'var(--construction-orange, #ff6b00)' }}>
          {formatPKR(currentPlan.amountPKR)}
        </div>
      </div>

      {/* Payment method selection */}
      <div style={styles.methodGrid}>
        {(gateway?.methods || [
          { id: 'card', label: 'Debit / Credit Card' },
          { id: 'easypaisa', label: 'EasyPaisa' },
          { id: 'jazzcash', label: 'JazzCash' },
          { id: 'bank_transfer', label: 'Bank Transfer' },
        ]).map((m) => {
          const Icon = METHOD_ICONS[m.id] || CreditCard;
          const active = selectedMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setSelectedMethod(m.id); setError(''); }}
              style={{
                ...styles.methodBtn,
                borderColor: active ? '#ff6b00' : '#e5e7eb',
                backgroundColor: active ? '#fff9f5' : '#ffffff',
                color: active ? '#c2410c' : '#334155',
              }}
            >
              <Icon size={18} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Instructions for selected method */}
      {methodInstruction && (
        <div style={styles.instructionBox}>
          <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>{t('How to pay')}</div>
          <div style={{ fontSize: '0.83rem', color: '#475569', lineHeight: 1.5 }}>{methodInstruction.description}</div>
          {methodInstruction.accountValue && (
            <div style={styles.accountChip}>{methodInstruction.accountValue}</div>
          )}
          {selectedMethod === 'card' && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
              Your full card number is never stored — only the last 4 digits are kept for verification.
            </div>
          )}
        </div>
      )}

      {/* Method-specific form */}
      {selectedMethod === 'card' ? (
        <div style={styles.formGrid}>
          <div className="form-group">
            <label>{t('Card Holder Name')}</label>
            <input
              className="form-control"
              placeholder={t('Name printed on card')}
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('Card Number')}</label>
            <input
              className="form-control"
              placeholder={t('XXXX XXXX XXXX XXXX')}
              inputMode="numeric"
              maxLength={19}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ''))}
            />
          </div>
        </div>
      ) : selectedMethod === 'bank_transfer' ? (
        <div style={styles.formGrid}>
          <div className="form-group">
            <label>{t('Bank (Pakistan)')}</label>
            <select className="form-control" value={bankName} onChange={(e) => setBankName(e.target.value)}>
              <option value="">{t('Select bank...')}</option>
              {banks.map((b) => (
                <option key={b.code} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('Account Title')}</label>
            <input
              className="form-control"
              placeholder={t('Account holder name as printed on cheque')}
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('Account Number ')}<span style={{ color: '#94a3b8', fontWeight: '400' }}>(or IBAN — koi ek zaroori hai)</span></label>
            <input
              className="form-control"
              placeholder="e.g. 1234567890"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('IBAN ')}<span style={{ color: '#94a3b8', fontWeight: '400' }}>{t('(optional)')}</span></label>
            <input
              className="form-control"
              placeholder={t('e.g. PK36SCBL0000001123456702')}
              maxLength={34}
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
            />
          </div>
          <div className="form-group">
            <label>{t('Transaction / UTR Reference Number')}</label>
            <input
              className="form-control"
              placeholder={t('e.g. UTR-123456789')}
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label>{t('Transaction ID (TID)')}</label>
          <input
            className="form-control"
            placeholder={t('e.g. TID-1234567890')}
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
          {gateway?.gateways?.[selectedMethod]?.live && (
            <div style={{ marginTop: '14px' }}>
              <label>{t('Apna Mobile Number (wallet checkout ke liye)')}</label>
              <input
                className="form-control"
                placeholder="03XX-XXXXXXX"
                value={payerMobile}
                onChange={(e) => setPayerMobile(e.target.value)}
                style={{ marginTop: '6px' }}
              />
            </div>
          )}
        </div>
      )}

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.footer}>
        <div style={styles.footerNote}>
          <ShieldCheck size={18} color="#16a34a" />
          <span>
            {gateway?.gateways?.[selectedMethod]?.live
              ? 'Pay online now, ya manual TID bhej kar admin verification karayein.'
              : 'Payment is verified by admin. Login is blocked until approval.'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!isExpiredLock && onClose && (
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={loading}>
              {t('Cancel')}
            </button>
          )}
          {['easypaisa', 'jazzcash'].includes(selectedMethod) && gateway?.gateways?.[selectedMethod]?.live && (
            <button
              type="button"
              onClick={() => handleSubmitPayment('gateway')}
              disabled={loading}
              style={{ ...styles.activateBtn, backgroundColor: '#16a34a' }}
            >
              <span>Pay Live via {selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}</span>
            </button>
          )}
          <button type="button" onClick={() => handleSubmitPayment('manual')} disabled={loading} style={styles.activateBtn}>
            {loading ? 'Submitting Payment...' : (
              <>
                <ZapIcon />
                <span>Submit {formatPKR(currentPlan.amountPKR)} Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );

  const ZapIcon = () => <Sparkles size={18} />;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={isExpiredLock || step === 'pending' ? styles.lockIconBadge : styles.sparkleBadge}>
              {isExpiredLock || step === 'pending' ? (
                <Lock size={22} color="#dc2626" />
              ) : (
                <Sparkles size={22} color="#ff6b00" />
              )}
            </div>
            <div>
              <h2 style={styles.title}>
                {step === 'pending'
                  ? 'Payment Under Verification'
                  : step === 'pay'
                  ? 'Subscription Payment — PKR'
                  : isExpiredLock
                  ? 'Account Suspended: Plan Expired'
                  : 'Manage Subscription Plan'}
              </h2>
              <p style={styles.subtitle}>
                {step === 'pending'
                  ? 'Awaiting admin approval. You will be able to log in immediately after approval.'
                  : step === 'pay'
                  ? 'Pay via Card, EasyPaisa, JazzCash or Bank Transfer, then submit your reference for verification.'
                  : isExpiredLock
                  ? 'Your 15-day free trial or subscription period has finished. Pay a plan to reactivate your account after admin verification.'
                  : 'Upgrade or extend your ConstructOps subscription for uninterrupted construction operations.'}
              </p>
            </div>
          </div>
          {!isExpiredLock && onClose && step !== 'pending' && (
            <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
              <X size={20} />
            </button>
          )}
        </div>

        {step === 'pending' && renderPending()}
        {step === 'plan' && renderPlanStep()}
        {step === 'pay' && renderPayStep()}
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
    fontSize: '1.6rem',
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
  backBtn: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  planSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px 18px',
  },
  methodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '10px',
  },
  methodBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '2px solid',
    fontSize: '0.86rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  instructionBox: {
    backgroundColor: '#fff9f5',
    border: '1px solid #ffedd5',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#7c2d12',
  },
  accountChip: {
    display: 'inline-block',
    marginTop: '8px',
    backgroundColor: '#ffffff',
    border: '1px dashed #fb923c',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#c2410c',
    letterSpacing: '0.3px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  pendingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '16px',
    padding: '36px 24px',
    textAlign: 'center',
  },
};

export default SubscriptionModal;
