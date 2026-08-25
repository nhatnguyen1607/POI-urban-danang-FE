import { createContext, useContext } from 'react';
import type { JourneyPreloaderMode } from './JourneyPreloader';

export interface JourneyPreloaderContextValue {
  showJourney: (mode: Exclude<JourneyPreloaderMode, 'startup'>, statusText?: string) => void;
  hideJourney: () => void;
}
export const JourneyPreloaderContext = createContext<JourneyPreloaderContextValue | null>(null);

export function useJourneyPreloader() {
  const context = useContext(JourneyPreloaderContext);
  if (!context) throw new Error('useJourneyPreloader must be used inside JourneyPreloaderProvider');
  return context;
}
