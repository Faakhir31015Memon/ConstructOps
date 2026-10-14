import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../services/api';
import { useLang } from '../i18n/LanguageContext';

const ForgotPassword = () => {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await requestPasswordReset(email);
      setSent(data);
    } catch (err) {
      setError(t(err.response?.data?.message || 'Could not start the reset. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{t('Reset your password')}</h1>
        <p style={styles.text}>
          {t('Enter the email you use for ConstructOps and we will send a one-time reset link.')}
        </p>

        {sent ? (
          <div style={styles.successBox}>
            <CheckCircle2 size={18} />
            <div>
              <span>{t(sent.message)}</span>
              {sent.resetUrl && (
                <a href={sent.resetUrl} style={styles.devLink}>
                  {t('Open the reset link')}
                </a>
              )}
            </div>
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
              <label>{t('Email Address')}</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  className="form-control"
                  style={styles.input}
                  placeholder={t('enter email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={styles.submitBtn} disabled={loading}>
              {loading ? t('Sending...') : t('Send reset link')}
            </button>
          </form>
        )}

        <div style={styles.footerLink}>
          <Link to="/login" style={styles.link}>{t('Back to login')}</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
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
  heading: { fontSize: '1.35rem', fontWeight: '700', color: 'var(--dark-graphite)', margin: '0 0 0.5rem' },
  text: { color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' },
  input: { paddingLeft: '40px' },
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
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.9rem 1rem',
    backgroundColor: '#f0fdf4',
    color: '#166534',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    lineHeight: 1.5,
    flexDirection: 'column',
  },
  devLink: { color: 'var(--primary-orange)', fontWeight: '600' },
  footerLink: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' },
  link: { color: 'var(--primary-orange)', fontWeight: '600' },
};

export default ForgotPassword;
