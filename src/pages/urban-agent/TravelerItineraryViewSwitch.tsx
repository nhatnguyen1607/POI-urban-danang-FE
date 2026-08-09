import { List, Map } from 'lucide-react';

type TravelerItineraryView = 'timeline' | 'map';

export function TravelerItineraryViewSwitch({
  value,
  onChange,
}: {
  value: TravelerItineraryView;
  onChange: (value: TravelerItineraryView) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950 p-1 md:hidden">
      <button
        type="button"
        onClick={() => onChange('timeline')}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
          value === 'timeline'
            ? 'bg-cyan-300 text-slate-950'
            : 'text-slate-300 hover:bg-slate-900'
        }`}
      >
        <List size={16} />
        Lịch trình
      </button>
      <button
        type="button"
        onClick={() => onChange('map')}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
          value === 'map'
            ? 'bg-cyan-300 text-slate-950'
            : 'text-slate-300 hover:bg-slate-900'
        }`}
      >
        <Map size={16} />
        Bản đồ
      </button>
    </div>
  );
}

export type { TravelerItineraryView };
