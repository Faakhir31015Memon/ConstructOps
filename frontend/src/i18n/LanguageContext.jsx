import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { TRANSLATIONS } from './translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  useEffect(() => {
    // Clear any previous language override from localStorage so UI is clean English
    localStorage.removeItem('constructops_lang');
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);

  // Standard translation fallback using English dictionary or literal key
  const t = useCallback((key, vars) => {
    const text = TRANSLATIONS['en']?.[key] || key;
    if (!vars) return text;
    return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, value), text);
  }, []);

  const value = useMemo(
    () => ({
      lang: 'en',
      setLang: () => {},
      t,
      languages: [{ code: 'en', label: 'English', speechLocale: 'en-US', dir: 'ltr' }],
      dir: 'ltr',
      speechLocale: 'en-US',
      locale: 'en-PK',
    }),
    [t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      t: (key) => key,
      lang: 'en',
      setLang: () => {},
      dir: 'ltr',
      locale: 'en-PK',
      speechLocale: 'en-US',
      languages: [],
    };
  }
  return ctx;
};
