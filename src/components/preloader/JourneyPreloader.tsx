import { useEffect, useState } from 'react';
import { BrandMark } from '../BrandMark';
import type { Language } from '../../i18n/LanguageContext';
import { GlobeFlightAnimation } from './GlobeFlightAnimation';
import './journey-preloader.css';

const copy: Record<Language, { status: string; announcement: string }> = {
  vi: {
    status: 'Đang chuẩn bị hành trình của bạn',
    announcement: 'UrbanAgent đang chuẩn bị hành trình của bạn.',
  },
  en: {
    status: 'Preparing your journey',
    announcement: 'UrbanAgent is preparing your journey.',
  },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

export function JourneyPreloader({ open, language }: { open: boolean; language: Language }) {
  const reducedMotion = useReducedMotion();
  const text = copy[language];

  return (
    <div
      className={`ua-journey-preloader${open ? ' is-open' : ' is-closing'}`}
      data-journey-mode="startup"
      role="status"
      aria-live="polite"
      aria-label={text.announcement}
    >
      <div className="ua-journey-preloader__brand" aria-hidden="true">
        <BrandMark showTagline={false} />
      </div>
      <div className="ua-journey-preloader__scene">
        <GlobeFlightAnimation reducedMotion={reducedMotion} />
      </div>
      <div className="ua-journey-preloader__status">
        <p>{text.status}</p>
        <span className="ua-journey-preloader__dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  );
}
