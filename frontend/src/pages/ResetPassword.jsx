import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { resetPassword } from '../services/api';
import PasswordInput, { passwordMeetsPolicy } from '../components/PasswordInput';
import { useLang } from '../i18n/LanguageContext';

const ResetPassword = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(token ? '' : t('This reset link is incomplete. Please request a new one.'));
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!passwordMeetsPolicy(password)) {
      setError(t('Password does not meet the requirements below yet'));
      return;
    }
    if (password !== confirm) {
      setError(t('Both passwords must match'));
      return;
    }
    setLoading(true);
    try {
      const data = await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login?reset=success'), 1800);
    } catch (err) {
      setError(t(err.response?.data?.message || 'Could not reset the password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{t('Choose a new password')}</h1>

        {done ? (
          <div style={styles.successBox}>
            <CheckCircle2 size={18} />
            <span>{t('Password updated. Taking you back to sign in...')}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            <div className="form-group">
              <label>{t('New Password')}</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                icon={Lock}
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
                icon={Lock}
              />
            </div>
            <p style={styles.hint}>
              {t('All other devices will be signed out after the change.')}
            </p>
            <button type="submit" className="btn btn-primary w-full" style={styles.submitBtn} disabled={loading}>
              {loading ? t('Saving...') : t('Update password')}
            </button>
          </form>
        )}

        <div style={styles.footerLink}>
          <Link to="/forgot-password" style={styles.link}>{t('Request a new link')}</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-light)',
    backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'var(--bg-white)',
    padding: '2.5rem',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
  },
  heading: { fontSize: '1.35rem', fontWeight: '700', color: 'var(--dark-graphite)', margin: '0 0 1.25rem' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' },
  input: { paddingLeft: '40px' },
  hint: { color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 },
  submitBtn: { height: '46px', fontSize: '1rem', marginTop: '1rem' },
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
    padding: '0.9rem 1rem',
    backgroundColor: '#f0fdf4',
    color: '#166534',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
  },
  footerLink: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' },
  link: { color: 'var(--primary-orange)', fontWeight: '600' },
};

export default ResetPassword;
