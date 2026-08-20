import { Car, Loader2, Navigation, Route, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  buildGoogleMapsDirectionsUrl,
  hasValidPoiCoordinates,
  type TravelerActionPoi,
} from './travelerCapabilities';

export function TravelerStopTravelActions({
  poi,
  routeLoading,
  grabLoading,
  disabled,
  canSendFeedback,
  onInspectRoute,
  onBookRide,
  onFeedback,
}: {
  poi: TravelerActionPoi;
  routeLoading: boolean;
  grabLoading: boolean;
  disabled?: boolean;
  canSendFeedback: boolean;
  onInspectRoute: () => void;
  onBookRide: () => void;
  onFeedback: (eventType: 'poi_useful' | 'poi_not_fit') => void;
}) {
  const hasCoordinates = hasValidPoiCoordinates(poi);
  const directionsUrl = buildGoogleMapsDirectionsUrl(poi);
  const actionDisabled = disabled || !hasCoordinates;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={onInspectRoute}
        disabled={actionDisabled || routeLoading}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {routeLoading ? <Loader2 className="animate-spin" size={14} /> : <Route size={14} />}
        {routeLoading ? 'Đang tìm tuyến...' : 'Xem tuyến'}
      </button>
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800"
        >
          <Navigation size={14} />
          Chỉ đường
        </a>
      )}
      <button
        type="button"
        onClick={onBookRide}
        disabled={actionDisabled || grabLoading}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {grabLoading ? <Loader2 className="animate-spin" size={14} /> : <Car size={14} />}
        {grabLoading ? 'Đang mở Grab...' : 'Đặt xe'}
      </button>
      {canSendFeedback && (
        <div className="ml-auto inline-flex items-center gap-1" aria-label="Phản hồi về địa điểm">
          <button
            type="button"
            onClick={() => onFeedback('poi_useful')}
            title="Gợi ý hữu ích"
            aria-label="Gợi ý hữu ích"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onFeedback('poi_not_fit')}
            title="Gợi ý chưa phù hợp"
            aria-label="Gợi ý chưa phù hợp"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
