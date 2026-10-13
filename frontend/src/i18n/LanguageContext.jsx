import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { saveLanguage } from '../services/api';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, SUPPORTED_LANGUAGES, languageMeta } from './languages';
import { TRANSLATIONS } from './translations';

const STORAGE_KEY = 'constructops_lang';

const LanguageContext = createContext(null);

const readStoredLang = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return LANGUAGE_CODES.includes(stored) ? stored : DEFAULT_LANGUAGE;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(readStoredLang);
  const langRef = useRef(lang);

  useEffect(() => {
    const meta = languageMeta(lang);
    document.documentElement.lang = meta.code === 'arab-ur' ? 'ur' : 'en';
    document.documentElement.dir = meta.dir;
    localStorage.setItem(STORAGE_KEY, meta.code);
  }, [lang]);

  // Changes the interface language everywhere and mirrors it onto the user's
  // account, so the same preference follows them to another device.
  const setLang = useCallback((next) => {
    const meta = languageMeta(next);
    if (meta.code === langRef.current) return;
    langRef.current = meta.code;
    setLangState(meta.code);
    if (localStorage.getItem('token')) {
      saveLanguage(meta.code).catch(() => { /* preference still saved locally */ });
    }
  }, []);

  // Adopt the server-side preference once the session is known (e.g. on a new device).
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    try {
      const { language } = JSON.parse(raw);
      if (LANGUAGE_CODES.includes(language)) setLang(language);
    } catch {
      /* malformed user cache — keep local preference */
    }
  }, [setLang]);

  const t = useCallback(
    (key, vars) => {
      const text = TRANSLATIONS[lang]?.[key] || key;
      if (!vars) return text;
      return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, value), text);
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      languages: SUPPORTED_LANGUAGES,
      dir: languageMeta(lang).dir,
      speechLocale: languageMeta(lang).speechLocale,
      // Urdu-script users get Urdu digits/month names; Roman Urdu stays Latin.
      locale: lang === 'arab-ur' ? 'ur-PK' : 'en-PK',
    }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
};
