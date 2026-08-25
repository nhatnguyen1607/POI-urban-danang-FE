import { MapPinned, Sparkles } from 'lucide-react';

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className={`ua-brand-mark${compact ? ' ua-brand-mark--compact' : ''}${inverse ? ' ua-brand-mark--inverse' : ''}`}>
      <span className="ua-brand-mark__icon relative">
        <MapPinned size={21} strokeWidth={2.2} />
        <Sparkles className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-[var(--ua-blue-500)]" size={14} />
      </span>
      {!compact && (
        <span>
          <strong>UrbanAgent AI</strong>
          <small>Explore Da Nang Smarter</small>
        </span>
      )}
    </div>
  );
}
