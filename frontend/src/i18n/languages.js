// Mirrors backend/src/config/languages.js — keep both lists in sync.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', speechLocale: 'en-US', dir: 'ltr' },
  { code: 'latn-ur', label: 'Roman Urdu', speechLocale: 'ur-PK', dir: 'ltr' },
  { code: 'arab-ur', label: 'اردو', speechLocale: 'ur-PK', dir: 'rtl' },
];

export const DEFAULT_LANGUAGE = 'latn-ur';

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export const languageMeta = (code) =>
  SUPPORTED_LANGUAGES.find((l) => l.code === code) ||
  SUPPORTED_LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE);
