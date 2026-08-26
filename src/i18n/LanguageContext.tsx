import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'vi' | 'en';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  hasPersistedLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_STORAGE_KEY = 'danang-urbanagent-language';

function readPersistedLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === 'vi' || saved === 'en' ? saved : null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const initialLanguage = readPersistedLanguage();
  const [language, setLanguageState] = useState<Language>(initialLanguage || 'vi');
  const [hasPersistedLanguage, setHasPersistedLanguage] = useState(Boolean(initialLanguage));

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    setHasPersistedLanguage(true);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, hasPersistedLanguage }),
    [hasPersistedLanguage, language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
