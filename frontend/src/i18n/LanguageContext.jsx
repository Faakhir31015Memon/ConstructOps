import React, { createContext, useContext, useState, useCallback } from 'react';

const STORE_KEY = 'constructops_lang';

const LanguageContext = createContext({
  t: (key) => key,
  lang: 'en',
  locale: 'en-US',
  setLang: () => {},
  languages: [{ code: 'en', name: 'English' }],
});

const readStoredLang = () => {
  try {
    return localStorage.getItem(STORE_KEY) || 'en';
  } catch {
    return 'en';
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = useCallback((code) => {
    if (!code) return;
    setLangState(code);
    try {
      localStorage.setItem(STORE_KEY, code);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        t: (key) => key,
        lang,
        locale: lang === 'ur' ? 'ur-PK' : 'en-US',
        setLang,
        languages: [{ code: 'en', name: 'English' }],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
export default LanguageContext;
