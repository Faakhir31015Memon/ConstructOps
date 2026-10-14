import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

// Mirrors the backend PASSWORD_POLICY in auth.controller.js.
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'One number (0-9)', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'One symbol (e.g. @ # $ % !)', test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

export const passwordMeetsPolicy = (value) => PASSWORD_RULES.every((r) => r.test(value || ''));

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  id,
  icon: Icon,
  style,
  showRules = false,
  ...rest
}) => {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <div style={styles.wrapper}>
        {Icon && <Icon size={18} style={styles.leftIcon} />}
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="form-control"
          style={{ ...style, paddingLeft: Icon ? '40px' : undefined, paddingRight: '42px' }}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          style={styles.eyeBtn}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showRules && (
        <ul style={styles.rulesList} aria-label={t('Password requirements')}>
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value || '');
            return (
              <li key={rule.id} style={{ ...styles.rule, color: ok ? 'var(--success-green)' : 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700, width: '14px' }}>{ok ? '✓' : '○'}</span>
                {t(rule.label)}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

const styles = {
  wrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px',
  },
  rulesList: {
    listStyle: 'none',
    margin: '8px 0 0',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  rule: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.78rem',
    transition: 'color 0.15s ease',
  },
};

export default PasswordInput;
