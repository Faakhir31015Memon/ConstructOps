import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CreditCard, KeyRound, LogOut } from 'lucide-react';
import { changePassword, logoutRequest, clearSession, getMyPayments, subscriptionInvoiceUrl } from '../services/api';
import InvoiceButton from '../components/InvoiceButton';
import PasswordInput, { passwordMeetsPolicy } from '../components/PasswordInput';
import { useLang } from '../i18n/LanguageContext';

const Account = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  const canSeeBilling = !user || user.role === 'owner' || user.role === 'admin' || user.role === 'accountant';

  useEffect(() => {
    if (!canSeeBilling) return undefined;
    let alive = true;
    getMyPayments()
      .then((res) => {
        if (alive && res.success) setPayments(res.payments || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [canSeeBilling]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!passwordMeetsPolicy(next)) {
      setError(t('Password does not meet the requirements below yet'));
      return;
    }
    if (next !== confirm) {
      setError(t('Both new passwords must match'));
      return;
    }
    setLoading(true);
    try {
      const data = await changePassword(current, next);
      setNotice(data.message);
      setCurrent('');
      setNext('');
      setConfirm('');
      // Changing the password voids every token, so send the user through login.
      setTimeout(() => {
        clearSession();
        navigate('/login?reset=success');
      }, 1500);
    } catch (err) {
      setError(t(err.response?.data?.message || 'Could not change the password.'));
    } finally {
      setLoading(false);
    }
  };

  const signOutEverywhere = async () => {
    setError('');
    try {
      await logoutRequest({ allDevices: true });
    } catch {
      /* ignore — local session is cleared anyway */
    }
    clearSession();
    navigate('/login');
  };

  return (
    <div style={styles.page} dir="auto">
      <div style={styles.header}>
        <h1 style={styles.title}>{t('Account & Security')}</h1>
        <p style={styles.subtitle}>
          {user?.name} · {user?.email}
          {user?.companyName ? ` · ${user.companyName}` : ''}
        </p>
      </div>

      {notice && (
        <div style={styles.successBox}>
          <CheckCircle2 size={18} />
          <span>{t(notice)}</span>
        </div>
      )}
      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          <KeyRound size={18} /> {t('Change password')}
        </h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label>{t('Current password')}</label>
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="form-group">
            <label>{t('New password')}</label>
            <PasswordInput
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              showRules
            />
          </div>
          <div className="form-group">
            <label>{t('Confirm new password')}</label>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <p style={styles.hint}>
            {t('8+ characters with uppercase, lowercase, a number and a symbol. Saving this ends every other active session.')}
          </p>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('Saving...') : t('Update password')}
          </button>
        </form>
      </section>

      {canSeeBilling && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            <CreditCard size={18} /> {t('Billing history')}
          </h2>
          {payments.length === 0 ? (
            <p style={styles.hint}>{t('No subscription payments recorded yet.')}</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('Date')}</th>
                    <th>{t('Plan')}</th>
                    <th>{t('Amount')}</th>
                    <th>{t('Status')}</th>
                    <th>{t('Invoice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>{p.plan}</td>
                      <td>Rs {Number(p.amount).toLocaleString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-info'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status !== 'rejected' ? (
                          <InvoiceButton url={subscriptionInvoiceUrl(p._id)} label={t('Receipt')} />
                        ) : (
                          <span style={styles.hint}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          <LogOut size={18} /> {t('Sessions')}
        </h2>
        <p style={styles.hint}>
          {t('Sessions last 7 days and refresh silently. Sign out everywhere to end them on all devices.')}
        </p>
        <button type="button" className="btn" style={styles.secondaryBtn} onClick={signOutEverywhere}>
          {t('Sign out of all devices')}
        </button>
      </section>
    </div>
  );
};

const styles = {
  page: { padding: '1.5rem', maxWidth: '720px', margin: '0 auto' },
  header: { marginBottom: '1.25rem' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: 'var(--dark-graphite)', margin: 0 },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' },
  card: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    marginBottom: '1.25rem',
    boxShadow: 'var(--shadow-sm)',
  },
  cardTitle: { fontSize: '1rem', fontWeight: '600', color: 'var(--dark-graphite)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' },
  hint: { color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5, margin: '0.25rem 0 0.75rem' },
  secondaryBtn: { border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)', color: 'var(--dark-graphite)' },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--alert-red-light)',
    color: 'var(--alert-red)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#f0fdf4',
    color: '#166534',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
};

export default Account;
