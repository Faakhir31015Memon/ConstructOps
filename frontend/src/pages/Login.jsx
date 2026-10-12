import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, loginAdmin } from '../services/api';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (email === 'constops@admin.com') {
        data = await loginAdmin(email, password);
      } else {
        data = await login(email, password);
      }

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/projects');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error. Please try again.');
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
            <text x="120" y="62" font-family="Poppins, Arial, sans-serif" font-size="36" fill="#1E1E1E" font-weight="700">
              Construct
            </text>
            <text x="310" y="62" font-family="Poppins, Arial, sans-serif" font-size="36" fill="#FF6B00" font-weight="800">
              Ops
            </text>
          </svg>
          <p style={styles.subtitle}>Smart site logs & cost controls. Track everything.</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                className="form-control"
                style={styles.input}
                placeholder="enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                className="form-control"
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={styles.footerLink}>
          Don't have an account? <Link to="/register" style={styles.link}>Create Account</Link>
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
    backgroundImage: `radial-gradient(var(--border-color) 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
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
  link: {
    color: 'var(--primary-orange)',
    fontWeight: '600',
  },
};

export default Login;
