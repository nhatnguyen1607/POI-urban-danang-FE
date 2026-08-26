import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { FirstVisitLanguageChooser } from './FirstVisitLanguageChooser';
import { JourneyPreloader } from './JourneyPreloader';

export const JOURNEY_INTRO_STORAGE_KEY = 'urbanagent_intro_seen_v1';
const INTRO_WINDOW_MS = 1800;
const EXIT_TRANSITION_MS = 320;

function shouldShowFirstVisitIntro() {
  return !window.location.pathname.startsWith('/admin')
    && localStorage.getItem(JOURNEY_INTRO_STORAGE_KEY) !== 'true';
}

export function JourneyPreloaderProvider({ children }: { children: ReactNode }) {
  const { language, hasPersistedLanguage } = useLanguage();
  const [introMounted, setIntroMounted] = useState(shouldShowFirstVisitIntro);
  const [introOpen, setIntroOpen] = useState(shouldShowFirstVisitIntro);
  const [languageChooserOpen, setLanguageChooserOpen] = useState(
    () => !window.location.pathname.startsWith('/admin') && !shouldShowFirstVisitIntro() && !hasPersistedLanguage,
  );

  useEffect(() => {
    if (!introMounted) return undefined;
    let closeTimer: number | undefined;
    const introTimer = window.setTimeout(() => {
      localStorage.setItem(JOURNEY_INTRO_STORAGE_KEY, 'true');
      setIntroOpen(false);
      closeTimer = window.setTimeout(() => {
        setIntroMounted(false);
        if (!hasPersistedLanguage) setLanguageChooserOpen(true);
      }, EXIT_TRANSITION_MS);
    }, INTRO_WINDOW_MS);
    return () => {
      window.clearTimeout(introTimer);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
    };
  }, [hasPersistedLanguage, introMounted]);

  useEffect(() => {
    if (!introMounted && !languageChooserOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [introMounted, languageChooserOpen]);

  return (
    <>
      {children}
      {introMounted && <JourneyPreloader open={introOpen} language={language} />}
      {languageChooserOpen && <FirstVisitLanguageChooser onComplete={() => setLanguageChooserOpen(false)} />}
    </>
  );
}
