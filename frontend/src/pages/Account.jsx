import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, LogOut } from 'lucide-react';
import { changePassword, logoutRequest, clearSession } from '../services/api';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
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
            <input
              type="password"
              className="form-control"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('New password')}</label>
            <input
              type="password"
              className="form-control"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label>{t('Confirm new password')}</label>
            <input
              type="password"
              className="form-control"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <p style={styles.hint}>
            {t('At least 8 characters with letters and numbers. Signing this in ends every other active session.')}
          </p>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('Saving...') : t('Update password')}
          </button>
        </form>
      </section>

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
