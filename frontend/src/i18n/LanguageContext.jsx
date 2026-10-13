import React, { createContext, useContext } from 'react';

const LanguageContext = createContext({
  t: (key) => key,
  lang: 'en',
  locale: 'en-US',
  setLang: () => {},
  languages: [],
});

export const LanguageProvider = ({ children }) => {
  return (
    <LanguageContext.Provider
      value={{
        t: (key) => key,
        lang: 'en',
        locale: 'en-US',
        setLang: () => {},
        languages: [],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
export default LanguageContext;
