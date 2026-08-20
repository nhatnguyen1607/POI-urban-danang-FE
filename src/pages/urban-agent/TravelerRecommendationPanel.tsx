import { useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Plus, RotateCcw, Sparkles, X } from 'lucide-react';

export type TravelerRecommendationCandidate = {
  id: string;
  title: string;
  category: string;
  address?: string;
  reason: string;
  reasonLabels: string[];
  warningLabels: string[];
  score?: number;
  hasCoordinates: boolean;
  status: 'recommended' | 'included' | 'excluded' | 'scheduled';
};

export function TravelerRecommendationPanel({
  candidates,
  loading,
  requested,
  error,
  disabled,
  onRefresh,
  onInclude,
  onExclude,
  onRestore,
  onInspectMap,
}: {
  candidates: TravelerRecommendationCandidate[];
  loading: boolean;
  requested: boolean;
  error: string;
  disabled: boolean;
  onRefresh: () => void;
  onInclude: (poiId: string) => void;
  onExclude: (poiId: string) => void;
  onRestore: (poiId: string) => void;
  onInspectMap: (poiId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleCandidates = expanded ? candidates : candidates.slice(0, 6);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="traveler-recommendations-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            <Sparkles size={14} />
            Gợi ý theo sở thích
          </div>
          <h2 id="traveler-recommendations-title" className="text-xl font-semibold text-slate-950">
            Địa điểm phù hợp
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Chọn thêm địa điểm trước khi tạo hoặc cập nhật lịch trình. Các lựa chọn bị bỏ qua sẽ không được tự đưa trở lại.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || disabled}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {loading ? 'Đang tìm địa điểm...' : requested ? 'Làm mới gợi ý' : 'Gợi ý địa điểm'}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !candidates.length && (
        <div className="mt-4 flex min-h-32 items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
          <Loader2 className="animate-spin text-teal-700" size={20} />
          Đang tìm các địa điểm phù hợp với chuyến đi...
        </div>
      )}

      {!loading && requested && !error && !candidates.length && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm leading-6 text-slate-600">
          Chưa tìm thấy địa điểm phù hợp. Hãy thử mô tả sở thích cụ thể hơn.
        </div>
      )}

      {!requested && !candidates.length && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm leading-6 text-slate-600">
          Nhấn “Gợi ý địa điểm” để xem các lựa chọn có thể thêm vào chuyến đi.
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleCandidates.map((candidate, index) => {
            const selected = candidate.status === 'included' || candidate.status === 'scheduled';
            const excluded = candidate.status === 'excluded';
            return (
              <article
                key={candidate.id}
                className={`rounded-xl border p-4 transition ${
                  selected
                    ? 'border-emerald-300 bg-emerald-50/70'
                    : excluded
                      ? 'border-slate-300 bg-slate-100'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-950">{candidate.title}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">{candidate.category}</p>
                    {candidate.address && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{candidate.address}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    #{index + 1}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">{candidate.reason}</p>

                {candidate.reasonLabels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Lý do phù hợp">
                    {candidate.reasonLabels.slice(0, 3).map((label) => (
                      <span key={label} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {candidate.warningLabels.length > 0 && (
                  <p className="mt-3 text-xs leading-5 text-amber-800">{candidate.warningLabels.join(' · ')}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {excluded ? (
                    <button
                      type="button"
                      onClick={() => onRestore(candidate.id)}
                      disabled={disabled}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      Hoàn tác bỏ qua
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onInclude(candidate.id)}
                      disabled={disabled || selected}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-800"
                    >
                      {selected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                      {candidate.status === 'scheduled' ? 'Đã trong lịch' : candidate.status === 'included' ? 'Đã chọn' : 'Thêm vào lịch trình'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onInspectMap(candidate.id)}
                    disabled={!candidate.hasCoordinates}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-500 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <MapPin size={14} />
                    Xem trên bản đồ
                  </button>
                  {!excluded && (
                    <button
                      type="button"
                      onClick={() => onExclude(candidate.id)}
                      disabled={disabled}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={14} />
                      Bỏ qua
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {candidates.length > 6 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          {expanded ? 'Thu gọn gợi ý' : `Xem thêm ${candidates.length - 6} địa điểm`}
        </button>
      )}
    </section>
  );
}
