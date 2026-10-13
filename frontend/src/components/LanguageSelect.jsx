import React from 'react';
import { Languages } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

const LanguageSelect = ({ tone = 'light', className = '' }) => {
  const { lang, setLang, languages } = useLang();

  return (
    <div className={`language-select language-${tone} ${className}`}>
      <Languages size={15} className="language-select-icon" aria-hidden="true" />
      <select
        className="language-select-control"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Select language"
        title="Select language"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelect;
