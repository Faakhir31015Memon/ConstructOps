import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, setSession } from '../services/api';
import { User, Lock, Mail, Building2, AlertCircle } from 'lucide-react';
import PasswordInput, { passwordMeetsPolicy } from '../components/PasswordInput';
import { useLang } from '../i18n/LanguageContext';

const Register = () => {
  const { t, lang } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!acceptsTerms) {
      setError(t('Please accept the Terms of Service and Privacy Policy first'));
      return;
    }
    if (!passwordMeetsPolicy(password)) {
      setError(t('Password does not meet the requirements below yet'));
      return;
    }
    setLoading(true);

    try {
      const data = await register(name, email, password, companyName, lang, acceptsTerms);
      if (data.success) {
        setSession(data);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/projects');
      } else {
        setError(t(data.message || 'Registration failed'));
      }
    } catch (err) {
      console.error(err);
      setError(t(err.response?.data?.message || 'Server error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <svg width="220" height="60" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* C Shape */}
            <path d="M80 20 A30 30 0 1 0 80 80 L65 70 A18 18 0 1 1 65 30 Z" fill="#1E1E1E"/>
            {/* Building Lines */}
            <rect x="70" y="30" width="6" height="40" fill="#FF6B00"/>
            <rect x="80" y="35" width="6" height="30" fill="#1E1E1E"/>
            <rect x="90" y="40" width="6" height="20" fill="#1E1E1E"/>
            {/* Text */}
            <text x="120" y="62" fontFamily="Poppins, Arial, sans-serif" fontSize="36" fill="#1E1E1E" fontWeight="700">
              Construct
            </text>
            <text x="310" y="62" fontFamily="Poppins, Arial, sans-serif" fontSize="36" fill="#FF6B00" fontWeight="800">
              Ops
            </text>
          </svg>
          <p style={styles.subtitle}>{t('Register your building agency and start tracking.')}</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}


        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('Owner Name')}</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                className="form-control"
                style={styles.input}
                placeholder={t('Full Name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('Company/Builder Name')}</label>
            <div style={styles.inputWrapper}>
              <Building2 size={18} style={styles.inputIcon} />
              <input
                type="text"
                className="form-control"
                style={styles.input}
                placeholder={t('e.g. ABC Builders')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('Email Address')}</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                className="form-control"
                style={styles.input}
                placeholder="owner@builders.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('Password')}</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              icon={Lock}
              showRules
            />
          </div>

          <div className="form-group" style={styles.consentRow}>
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptsTerms}
              onChange={(e) => setAcceptsTerms(e.target.checked)}
              style={styles.consentBox}
            />
            <label htmlFor="accept-terms" style={styles.consentLabel}>
              {t('I agree to the')}{' '}
              <a href="/legal/terms" target="_blank" rel="noreferrer" style={styles.link}>{t('Terms of Service')}</a>{' '}
              {t('and')}{' '}
              <a href="/legal/privacy" target="_blank" rel="noreferrer" style={styles.link}>{t('Privacy Policy')}</a>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? t('Creating account...') : t('Create Account')}
          </button>
        </form>

        <div style={styles.footerLink}>
          {t('Already have an account?')}{' '}
          <Link to="/login" style={styles.link}>{t('Log In')}</Link>
        </div>

        <div style={styles.legalRow}>
          <a href="/legal/terms" target="_blank" rel="noreferrer">{t('Terms')}</a>
          {' · '}
          <a href="/legal/privacy" target="_blank" rel="noreferrer">{t('Privacy')}</a>
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
    padding: '2rem 0',
    backgroundImage: `radial-gradient(var(--border-color) 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--bg-white)',
    padding: '2.5rem',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
    lineHeight: '1.4',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    paddingLeft: '40px',
  },
  submitBtn: {
    height: '46px',
    fontSize: '1rem',
    marginTop: '1.5rem',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--alert-red-light)',
    color: 'var(--alert-red)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(235, 87, 87, 0.1)',
  },
  footerLink: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  consentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    marginTop: '1.25rem',
  },
  consentBox: {
    marginTop: '0.25rem',
    width: '16px',
    height: '16px',
    accentColor: 'var(--primary-orange)',
    flexShrink: 0,
  },
  consentLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  legalRow: {
    textAlign: 'center',
    marginTop: '0.9rem',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  link: {
    color: 'var(--primary-orange)',
    fontWeight: '600',
  },
};

export default Register;
