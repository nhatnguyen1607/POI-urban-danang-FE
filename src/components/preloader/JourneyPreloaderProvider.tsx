import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { JourneyPreloader, type JourneyPreloaderMode } from './JourneyPreloader';
import { JourneyPreloaderContext } from './journeyPreloaderContext';

interface JourneyPresentation {
  mode: JourneyPreloaderMode;
  statusText?: string;
}

const STARTUP_MINIMUM_MS = 700;
const STARTUP_SAFETY_TIMEOUT_MS = 8000;
const EXIT_TRANSITION_MS = 320;
const INITIAL_STARTUP_ENABLED = !window.location.pathname.startsWith('/admin');

export function JourneyPreloaderProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const { loading: authLoading, authError } = useAuth();
  const closeTimer = useRef<number | null>(null);
  const [presentation, setPresentation] = useState<JourneyPresentation | null>(() => (
    INITIAL_STARTUP_ENABLED ? { mode: 'startup' } : null
  ));
  const [open, setOpen] = useState(INITIAL_STARTUP_ENABLED);
  const [startupMinimumElapsed, setStartupMinimumElapsed] = useState(!INITIAL_STARTUP_ENABLED);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const hideJourney = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    closeTimer.current = window.setTimeout(() => {
      setPresentation(null);
      closeTimer.current = null;
    }, EXIT_TRANSITION_MS);
  }, [clearCloseTimer]);

  const showJourney = useCallback((mode: Exclude<JourneyPreloaderMode, 'startup'>, statusText?: string) => {
    if (window.location.pathname.startsWith('/admin')) return;
    clearCloseTimer();
    setPresentation({ mode, statusText });
    window.requestAnimationFrame(() => setOpen(true));
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!INITIAL_STARTUP_ENABLED) return undefined;
    const timer = window.setTimeout(() => setStartupMinimumElapsed(true), STARTUP_MINIMUM_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!INITIAL_STARTUP_ENABLED || presentation?.mode !== 'startup') return undefined;
    if (!startupMinimumElapsed || (authLoading && !authError)) return undefined;
    const timer = window.setTimeout(hideJourney, 0);
    return () => window.clearTimeout(timer);
  }, [authError, authLoading, hideJourney, presentation?.mode, startupMinimumElapsed]);

  useEffect(() => {
    if (!INITIAL_STARTUP_ENABLED) return undefined;
    const safetyTimer = window.setTimeout(() => {
      if (presentation?.mode === 'startup') hideJourney();
    }, STARTUP_SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(safetyTimer);
  }, [hideJourney, presentation?.mode]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!presentation) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [presentation]);

  const value = useMemo(() => ({ showJourney, hideJourney }), [hideJourney, showJourney]);

  return (
    <JourneyPreloaderContext.Provider value={value}>
      {children}
      {presentation && (
        <JourneyPreloader
          open={open}
          mode={presentation.mode}
          language={language}
          statusText={presentation.statusText}
        />
      )}
    </JourneyPreloaderContext.Provider>
  );
}
