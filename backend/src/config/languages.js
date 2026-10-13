// Single source of truth for the languages ConstructOps supports in the UI,
// the AI assistant's replies, and browser speech (Web Speech API locales).
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', speechLocale: 'en-US', dir: 'ltr', llmName: 'English' },
  { code: 'latn-ur', label: 'Roman Urdu', speechLocale: 'ur-PK', dir: 'ltr', llmName: 'Roman Urdu' },
  { code: 'arab-ur', label: 'اردو', speechLocale: 'ur-PK', dir: 'rtl', llmName: 'Urdu (Urdu script)' },
];

export const DEFAULT_LANGUAGE = 'latn-ur';

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export const languageMeta = (code) =>
  SUPPORTED_LANGUAGES.find((l) => l.code === code) ||
  SUPPORTED_LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE);
