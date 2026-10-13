import React from 'react';
import { Languages } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

const LanguageSelect = ({ tone = 'dark' }) => {
  const { lang, setLang, languages } = useLang();

  const isDark = tone === 'dark';
  return (
    <label className="lang-select" title="Language / زبان" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Languages size={16} style={{ color: isDark ? 'var(--primary-orange)' : 'var(--text-secondary)' }} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Select interface language"
        style={{
          background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
          color: isDark ? '#ffffff' : 'var(--text-primary)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '6px 8px',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} style={{ color: '#1e293b' }}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSelect;
