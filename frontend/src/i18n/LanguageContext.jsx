import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translate, SUPPORTED_LANGUAGES, languageDir } from './translations';
import { saveLanguage } from '../services/api';

const STORE_KEY = 'constructops_lang';

const readStoredLang = () => {
  try {
    const stored = localStorage.getItem(STORE_KEY) || 'en';
    return SUPPORTED_LANGUAGES.some((l) => l.code === stored) ? stored : 'en';
  } catch {
    return 'en';
  }
};

const LanguageContext = createContext({
  t: (key) => key,
  lang: 'en',
  locale: 'en-US',
  dir: 'ltr',
  setLang: () => {},
  languages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    document.dir = languageDir(lang);
    document.documentElement.lang = lang === 'arab-ur' ? 'ur' : lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!code || !SUPPORTED_LANGUAGES.some((l) => l.code === code)) return;
    setLangState(code);
    try {
      localStorage.setItem(STORE_KEY, code);
    } catch {
      /* storage unavailable */
    }
    // Persist server-side too when signed in (assistant + future emails follow this).
    if (localStorage.getItem('token')) {
      saveLanguage(code).catch(() => {});
    }
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  return (
    <LanguageContext.Provider
      value={{
        t,
        lang,
        locale: lang === 'en' ? 'en-US' : 'ur-PK',
        dir: languageDir(lang),
        setLang,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
export default LanguageContext;
