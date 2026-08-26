import { Compass, Sparkles } from 'lucide-react';

export function BrandMark({
  compact = false,
  inverse = false,
  showTagline = true,
}: {
  compact?: boolean;
  inverse?: boolean;
  showTagline?: boolean;
}) {
  return (
    <div className={`ua-brand-mark${compact ? ' ua-brand-mark--compact' : ''}${inverse ? ' ua-brand-mark--inverse' : ''}`}>
      <span className="ua-brand-mark__icon relative">
        <Compass size={20} strokeWidth={2} />
        <Sparkles className="absolute -right-1 -top-1 text-[var(--ua-aqua)]" size={14} />
      </span>
      {!compact && (
        <span>
          <strong>UrbanAgent AI</strong>
          {showTagline && <small>Explore Da Nang Smarter</small>}
        </span>
      )}
    </div>
  );
}
