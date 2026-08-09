import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

export function TripPreviewStopActions({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowUp size={13} />
        Lên
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowDown size={13} />
        Xuống
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-300/40 bg-rose-300/10 px-2.5 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20"
      >
        <Trash2 size={13} />
        Bỏ điểm
      </button>
    </div>
  );
}
