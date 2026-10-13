import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, languageMeta } from './languages';
import { TRANSLATIONS } from './translations';
import { saveLanguage } from '../services/api';

const STORAGE_KEY = 'constructops_lang';
const LanguageContext = createContext(null);

const readStoredLang = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

const storedUserLang = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.language || null;
  } catch {
    return null;
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => languageMeta(readStoredLang()).code);
  const langRef = useRef(lang);

  useEffect(() => {
    const meta = languageMeta(lang);
    document.documentElement.lang = meta.code === 'arab-ur' ? 'ur' : 'en';
    document.documentElement.dir = meta.dir;
    try {
      localStorage.setItem(STORAGE_KEY, meta.code);
    } catch {
      /* private mode — preference just won't survive a reload */
    }
  }, [lang]);

  // A signed-in user's saved preference always wins over a stale local copy.
  useEffect(() => {
    const saved = storedUserLang();
    if (saved && saved !== langRef.current && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      langRef.current = saved;
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((next) => {
    const meta = languageMeta(next);
    if (meta.code === langRef.current) return;
    langRef.current = meta.code;
    setLangState(meta.code);
    if (localStorage.getItem('token')) saveLanguage(meta.code).catch(() => {});
  }, []);

  const t = useCallback(
    (key, vars) => {
      const text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en?.[key] || key;
      if (!vars) return text;
      return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, value), text);
    },
    [lang],
  );

  const value = useMemo(() => {
    const meta = languageMeta(lang);
    return {
      lang,
      setLang,
      t,
      languages: SUPPORTED_LANGUAGES,
      dir: meta.dir,
      speechLocale: meta.speechLocale,
      locale: meta.code === 'arab-ur' ? 'ur-PK' : 'en-PK',
    };
  }, [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
};
