import { useEffect, useState } from 'react';
import { BrandMark } from '../BrandMark';
import type { Language } from '../../i18n/LanguageContext';
import './journey-preloader.css';

export type JourneyPreloaderMode = 'startup' | 'create' | 'replan';

const copy: Record<Language, Record<JourneyPreloaderMode, { lead: string; highlight: string; tail: string; announcement: string }>> = {
  vi: {
    startup: {
      lead: 'UrbanAgent đang chuẩn bị',
      highlight: 'hành trình',
      tail: 'của bạn...',
      announcement: 'UrbanAgent đang chuẩn bị hành trình của bạn.',
    },
    create: {
      lead: 'UrbanAgent đang tạo',
      highlight: 'lịch trình',
      tail: 'cho bạn...',
      announcement: 'UrbanAgent đang tạo lịch trình cho bạn.',
    },
    replan: {
      lead: 'UrbanAgent đang điều chỉnh',
      highlight: 'hành trình',
      tail: 'của bạn...',
      announcement: 'UrbanAgent đang điều chỉnh hành trình của bạn.',
    },
  },
  en: {
    startup: {
      lead: 'UrbanAgent is preparing',
      highlight: 'your journey',
      tail: '...',
      announcement: 'UrbanAgent is preparing your journey.',
    },
    create: {
      lead: 'UrbanAgent is creating',
      highlight: 'your journey',
      tail: '...',
      announcement: 'UrbanAgent is creating your journey.',
    },
    replan: {
      lead: 'UrbanAgent is adjusting',
      highlight: 'your journey',
      tail: '...',
      announcement: 'UrbanAgent is adjusting your journey.',
    },
  },
};

const progressMessages: Record<Language, string[]> = {
  vi: [
    'Đang chuẩn bị hành trình...',
    'Đang tìm những địa điểm phù hợp...',
    'Đang sắp xếp tuyến đường...',
    'Sắp xong rồi...',
  ],
  en: [
    'Preparing your journey...',
    'Finding places that fit...',
    'Arranging your route...',
    'Almost there...',
  ],
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}
export function JourneyPreloader({
  open,
  mode,
  language,
  statusText,
}: {
  open: boolean;
  mode: JourneyPreloaderMode;
  language: Language;
  statusText?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const text = copy[language][mode];
  const rotatingStatus = progressMessages[language][messageIndex];

  useEffect(() => {
    if (!open || statusText) return undefined;
    const resetTimer = window.setTimeout(() => setMessageIndex(0), 0);
    const timer = window.setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, progressMessages[language].length - 1));
    }, 1800);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(timer);
    };
  }, [language, mode, open, statusText]);

  return (
    <div
      className={`ua-journey-preloader${open ? ' is-open' : ' is-closing'}`}
      data-journey-mode={mode}
      data-video-state={videoFailed ? 'fallback' : videoReady ? 'ready' : 'loading'}
      role="status"
      aria-live="polite"
      aria-label={statusText || rotatingStatus || text.announcement}
    >
      <div className="ua-journey-preloader__brand" aria-hidden="true">
        <BrandMark showTagline={false} />
      </div>

      <div className="ua-journey-preloader__scene" aria-hidden="true">
        <img
          className="ua-journey-preloader__poster"
          src="/assets/urbanagent/preloader/journey-preloader-poster.webp"
          alt=""
          fetchPriority="high"
        />
        {!reducedMotion && !videoFailed && (
          <video
            className={`ua-journey-preloader__video${videoReady ? ' is-ready' : ''}`}
            src="/assets/urbanagent/preloader/journey-preloader.webm"
            poster="/assets/urbanagent/preloader/journey-preloader-poster.webp"
            muted
            autoPlay
            playsInline
            loop
            preload="metadata"
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoFailed(true)}
          />
        )}
      </div>

      <div className="ua-journey-preloader__status">
        <p>{statusText || rotatingStatus}</p>
        <span className="ua-journey-preloader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
