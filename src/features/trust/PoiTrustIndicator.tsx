import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { formatVerificationTime, trustPresentation, type PoiTrust } from './trustPresentation';

export function PoiTrustIndicator({ trust, compact = false }: { trust?: PoiTrust | null; compact?: boolean }) {
  const view = trustPresentation(trust);
  const tone = view.tone === 'positive'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : view.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  const Icon = view.tone === 'positive' ? CheckCircle2 : view.tone === 'warning' ? AlertTriangle : Info;
  const evidence = trust?.evidence || [];
  return (
    <details className={`rounded-lg border ${tone} ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold">
        <Icon size={14} />
        {view.label}
      </summary>
      <p className="mt-2 text-xs leading-5">{view.detail}</p>
      {evidence.slice(0, 4).map((item, index) => (
        <div key={`${item.sourceName || 'source'}-${index}`} className="mt-2 border-t border-current/10 pt-2 text-xs leading-5">
          <strong>{item.sourceName || 'Nguồn chưa định danh'}</strong>
          <div>{formatVerificationTime(item.lastVerifiedAt || item.observedAt)}</div>
          {item.confidenceReason && <div>{item.confidenceReason}</div>}
        </div>
      ))}
    </details>
  );
}
