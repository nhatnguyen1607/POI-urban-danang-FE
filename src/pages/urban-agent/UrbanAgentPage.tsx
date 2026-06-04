import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Car,
  CheckCircle2,
  CloudSun,
  Compass,
  Loader2,
  Map,
  MapPin,
  Plus,
  Route,
  Sparkles,
  Store,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';

type Role = 'traveler' | 'business';

interface PoiResult {
  id: string;
  title: string;
  name: string;
  category: string;
  district: string;
  lat: number;
  lon: number;
  score: number;
  rating?: number;
  reason: string;
  warnings?: string[];
  actions?: { type: string; label: string; url?: string }[];
}

interface ItineraryItem {
  order: number;
  poi: PoiResult;
  suggestedStayMinutes?: number;
  travelFromPrevious?: {
    distanceKm: number;
    estimatedMinutes: number;
    transport: string;
  };
  reason: string;
}

interface BusinessArea {
  id: string;
  lat: number;
  lon: number;
  score: number;
  reason: string;
  warnings: string[];
  signals: {
    demandProxy: number;
    competitionPenalty: number;
    complementary: number;
    accessibility: number;
    conceptFit: number;
    directCompetitors: number;
    semanticHits: number;
  };
  topCategories: { category: string; count: number }[];
  samplePOIs: { id: string; name: string; category: string; rating: number }[];
  evidence?: {
    rawCounts: {
      poiTotalInArea: number;
      directCompetitorsInArea: number;
      semanticHitsInArea: number;
      complementaryCandidates: number;
    };
    complementaryPOIs: { evidenceId: string; name: string; category: string; rating: number; distanceKm: number }[];
    competitors: { evidenceId: string; name: string; category: string; rating: number; distanceKm: number }[];
    routeWarnings: { evidenceId: string; warning: string }[];
  };
  llmInsight?: {
    summary: string;
    area_potential: string;
    complementary_poi_analysis: string;
    risk_warnings: string[];
    recommended_actions: string[];
    used_evidence_ids: string[];
    missing_evidence: string[];
  };
  guardrail?: {
    hallucinationChecked: boolean;
    passed: boolean;
    unsupportedClaims: string[];
  };
}

interface ExpertRoute {
  destination?: PoiResult;
  distance?: string | number;
  duration?: string | number;
  valid?: boolean;
  warnings?: string[];
  route?: { instruction?: string; instructions?: string; distance?: number; duration?: number }[];
  steps?: { instruction?: string; instructions?: string; distance?: number; duration?: number }[];
}

const DA_NANG_CENTER = { lat: 16.0544, lon: 108.2022 };

const copy = {
  vi: {
    heroBadge: 'Intent - Plan - Tools - Route - Memory - Market Signal',
    title: 'Danang UrbanAgent AI',
    subtitle:
      'Agent đô thị cho Đà Nẵng: khách du lịch tạo lịch trình có quán ăn, cafe, điểm chơi; người kinh doanh phân tích vị trí bằng demand proxy và cạnh tranh.',
    travelerTitle: 'Khách đi chơi',
    travelerSubtitle: 'Tạo lịch trình, tìm quán hợp gu, chỉnh điểm đến và xem route bằng hệ chuyên gia.',
    travelerSample: 'Tạo cho tôi một lộ trình đi chơi tối nay có quán ăn, quán cafe yên tĩnh gần biển, đi bằng xe máy.',
    businessTitle: 'Người kinh doanh',
    businessSubtitle: 'Nhập concept để xem khu vực phù hợp, demand proxy, cạnh tranh và POI bổ trợ.',
    businessSample: 'Tôi muốn mở cafe học bài cho sinh viên tại Đà Nẵng.',
    prompt: 'Nhu cầu / concept',
    transport: 'Phương tiện',
    motorbike: 'Xe máy',
    car: 'Ô tô / Grab',
    walking: 'Đi bộ',
    run: 'Chạy agent',
    principle:
      'Agent học từ phản hồi người dùng. MVP ghi lại lựa chọn, like/dislike và chỉnh sửa lịch trình để sau này huấn luyện reranker/fine-tune. Chỉ số kinh doanh là demand proxy, không phải mật độ khách thật.',
    itinerary: 'Lịch trình agent đề xuất',
    editable: 'Có thể thêm/xóa điểm trong MVP',
    emptyItinerary: 'Chạy agent để tạo lịch trình.',
    addable: 'POI có thể thêm',
    routePanel: 'Route hệ chuyên gia',
    routeHint: 'Bấm “Route AI” ở từng POI để xem hướng dẫn nội bộ trước khi mở Google Maps.',
    routeAi: 'Route AI',
    openMaps: 'Google Maps',
    add: 'Thêm',
    remove: 'Xóa khỏi lịch trình',
    useful: 'Hữu ích',
    notFit: 'Không phù hợp',
    inPlan: 'Điểm trong lịch',
    totalMove: 'Tổng di chuyển',
    weather: 'Thời tiết',
    stable: 'Ổn định',
    caution: 'Cần lưu ý',
    waiting: 'Đang chờ',
    minutes: 'phút',
    businessEmpty: 'Chạy agent để xem khu vực kinh doanh phù hợp.',
    businessReport: 'Báo cáo quyết định kinh doanh',
    potential: 'Tiềm năng khu vực',
    complementaryPoi: 'POI bổ trợ',
    risks: 'Rủi ro / điểm yếu',
    nextActions: 'Hành động tiếp theo',
    evidence: 'Bằng chứng dữ liệu',
    guardrailOk: 'Grounded',
    missingEvidence: 'Dữ liệu còn thiếu',
    area: 'Khu vực',
    opportunity: 'Opportunity',
    demand: 'Demand',
    conceptFit: 'Concept fit',
    complementary: 'Bổ trợ',
    accessibility: 'Tiếp cận',
    competition: 'Cạnh tranh',
    topCategories: 'Danh mục nổi bật',
    samplePois: 'POI mẫu',
    noExtra: 'Chưa có POI bổ sung không trùng lịch trình.',
  },
  en: {
    heroBadge: 'Intent - Plan - Tools - Route - Memory - Market Signal',
    title: 'Danang UrbanAgent AI',
    subtitle:
      'An urban agent for Danang: travelers build food, cafe and attraction itineraries; business users analyze locations with demand proxy and competition signals.',
    travelerTitle: 'Traveler',
    travelerSubtitle: 'Build itineraries, find matching POIs, edit stops, and inspect expert-system routes.',
    travelerSample: 'Create an evening itinerary with a restaurant, a quiet beach-side cafe, and motorbike routing.',
    businessTitle: 'Business owner',
    businessSubtitle: 'Describe a concept to score areas by demand proxy, competition and complementary POIs.',
    businessSample: 'I want to open a study cafe for students in Danang.',
    prompt: 'Need / concept',
    transport: 'Transport',
    motorbike: 'Motorbike',
    car: 'Car / Grab',
    walking: 'Walking',
    run: 'Run agent',
    principle:
      'The agent learns from user feedback. The MVP records choices, likes/dislikes and itinerary edits for later reranking/fine-tuning. Business metrics are demand proxies, not real footfall.',
    itinerary: 'Agent itinerary',
    editable: 'Stops can be added or removed in the MVP',
    emptyItinerary: 'Run the agent to create an itinerary.',
    addable: 'POIs you can add',
    routePanel: 'Expert route',
    routeHint: 'Press “AI Route” on a POI to inspect in-app route guidance before opening Google Maps.',
    routeAi: 'AI Route',
    openMaps: 'Google Maps',
    add: 'Add',
    remove: 'Remove from itinerary',
    useful: 'Useful',
    notFit: 'Not a fit',
    inPlan: 'Stops',
    totalMove: 'Travel time',
    weather: 'Weather',
    stable: 'Stable',
    caution: 'Caution',
    waiting: 'Waiting',
    minutes: 'min',
    businessEmpty: 'Run the agent to see suitable business areas.',
    businessReport: 'Business decision report',
    potential: 'Area potential',
    complementaryPoi: 'Complementary POIs',
    risks: 'Risks / weaknesses',
    nextActions: 'Next actions',
    evidence: 'Data evidence',
    guardrailOk: 'Grounded',
    missingEvidence: 'Missing evidence',
    area: 'Area',
    opportunity: 'Opportunity',
    demand: 'Demand',
    conceptFit: 'Concept fit',
    complementary: 'Complementary',
    accessibility: 'Access',
    competition: 'Competition',
    topCategories: 'Top categories',
    samplePois: 'Sample POIs',
    noExtra: 'No additional non-duplicate POIs yet.',
  },
};

function percent(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export default function UrbanAgentPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const roleCopy = useMemo(
    () => ({
      traveler: { title: t.travelerTitle, subtitle: t.travelerSubtitle, sample: t.travelerSample },
      business: { title: t.businessTitle, subtitle: t.businessSubtitle, sample: t.businessSample },
    }),
    [t],
  );
  const [role, setRole] = useState<Role>('traveler');
  const [query, setQuery] = useState(t.travelerSample);
  const [transport, setTransport] = useState('motorbike');
  const [loading, setLoading] = useState(false);
  const [routeLoadingId, setRouteLoadingId] = useState('');
  const [error, setError] = useState('');
  const [poiResults, setPoiResults] = useState<PoiResult[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [businessAreas, setBusinessAreas] = useState<BusinessArea[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [expertRoute, setExpertRoute] = useState<ExpertRoute | null>(null);

  useEffect(() => {
    setQuery(roleCopy[role].sample);
    setError('');
    setPoiResults([]);
    setItinerary([]);
    setBusinessAreas([]);
    setExpertRoute(null);
  }, [role, roleCopy]);

  const context = useMemo(() => ({ location: DA_NANG_CENTER }), []);

  const recordFeedback = async (eventType: string, payload: Record<string, unknown>) => {
    try {
      await apiClient.post('/api/agent/feedback', { role, eventType, query, payload });
    } catch {
      // Feedback must never block the user flow in the MVP.
    }
  };

  const runAgent = async () => {
    setLoading(true);
    setError('');
    setExpertRoute(null);
    try {
      if (role === 'traveler') {
        const [itineraryData, recommendationData, weatherData] = await Promise.allSettled([
          apiClient.post('/api/agent/create-itinerary', { query, context, transport, limit: 4 }),
          apiClient.post('/api/agent/recommend-poi', { query, context, limit: 14 }),
          apiClient.get(`/api/weather/forecast?lat=${DA_NANG_CENTER.lat}&lon=${DA_NANG_CENTER.lon}`),
        ]);

        if (itineraryData.status !== 'fulfilled') throw itineraryData.reason;
        const nextItinerary = itineraryData.value.itinerary || [];
        const usedIds = new Set(nextItinerary.map((item: ItineraryItem) => item.poi.id));
        const extras =
          recommendationData.status === 'fulfilled'
            ? (recommendationData.value.results || []).filter((poi: PoiResult) => !usedIds.has(poi.id))
            : [];

        setItinerary(nextItinerary);
        setPoiResults(extras);
        if (weatherData.status === 'fulfilled') setWeather(weatherData.value);
        recordFeedback('agent_run_traveler', { itinerarySize: nextItinerary.length, extraSize: extras.length });
      } else {
        const data = await apiClient.post('/api/agent/business-insight', {
          concept: query,
          limit: 5,
          language,
        });
        setBusinessAreas(data.areas || []);
        recordFeedback('agent_run_business_insight', {
          areaSize: data.areas?.length || 0,
          guardrails: data.guardrails,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể gọi agent.');
    } finally {
      setLoading(false);
    }
  };

  const removeFromItinerary = (poiId: string) => {
    const removed = itinerary.find((item) => item.poi.id === poiId)?.poi;
    setItinerary((items) =>
      items.filter((item) => item.poi.id !== poiId).map((item, index) => ({ ...item, order: index + 1 })),
    );
    if (removed) {
      setPoiResults((items) => [removed, ...items.filter((poi) => poi.id !== removed.id)]);
      recordFeedback('remove_from_itinerary', { poiId });
    }
  };

  const addPoiToItinerary = (poi: PoiResult) => {
    if (itinerary.some((item) => item.poi.id === poi.id)) return;
    setItinerary((items) => [
      ...items,
      {
        order: items.length + 1,
        poi,
        suggestedStayMinutes: 55,
        reason: language === 'vi' ? 'Người dùng thêm vào lịch trình.' : 'Added by the user.',
      },
    ]);
    setPoiResults((items) => items.filter((item) => item.id !== poi.id));
    recordFeedback('add_to_itinerary', { poiId: poi.id, category: poi.category });
  };

  const loadExpertRoute = async (poi: PoiResult) => {
    setRouteLoadingId(poi.id);
    setExpertRoute(null);
    try {
      const data = await apiClient.post('/api/route', {
        origin: { lat: DA_NANG_CENTER.lat, lng: DA_NANG_CENTER.lon },
        destination: { lat: poi.lat, lng: poi.lon },
      });
      const bestRoute = data.routes?.[0] || data;
      setExpertRoute({
        destination: poi,
        distance: bestRoute.distance ? `${(bestRoute.distance / 1000).toFixed(1)} km` : undefined,
        duration: bestRoute.duration ? `${Math.round(bestRoute.duration / 60)} ${t.minutes}` : undefined,
        valid: bestRoute.esValidation?.valid,
        warnings: bestRoute.esValidation?.warnings || data.warnings || [],
        steps: bestRoute.steps || data.steps || [],
      });
      recordFeedback('route_requested', { poiId: poi.id, category: poi.category });
    } catch (err: any) {
      setExpertRoute({
        destination: poi,
        valid: false,
        warnings: [err?.message || 'Không thể tính route bằng hệ chuyên gia.'],
      });
    } finally {
      setRouteLoadingId('');
    }
  };

  return (
    <div className="min-h-full space-y-6 text-slate-100">
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
              <Sparkles size={16} />
              {t.heroBadge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-300">{t.subtitle}</p>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1">
            {(['traveler', 'business'] as Role[]).map((item) => (
              <button
                key={item}
                onClick={() => setRole(item)}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  role === item ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item === 'traveler' ? <Users size={18} /> : <Store size={18} />}
                {roleCopy[item].title}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
              {role === 'traveler' ? <Compass /> : <Building2 />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{roleCopy[role].title}</h2>
              <p className="text-sm leading-6 text-slate-400">{roleCopy[role].subtitle}</p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-300">{t.prompt}</label>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-[150px] w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-400"
          />

          {role === 'traveler' && (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">{t.transport}</label>
              <select
                value={transport}
                onChange={(event) => setTransport(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="motorbike">{t.motorbike}</option>
                <option value="car">{t.car}</option>
                <option value="walking">{t.walking}</option>
              </select>
            </div>
          )}

          <button
            onClick={runAgent}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {t.run}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-6 text-slate-400">
            <strong className="text-slate-200">Learning loop:</strong> {t.principle}
          </div>
        </div>

        {role === 'traveler' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<MapPin />} label={t.inPlan} value={itinerary.length || 0} />
              <MetricCard
                icon={<Route />}
                label={t.totalMove}
                value={`${itinerary.reduce((s, i) => s + (i.travelFromPrevious?.estimatedMinutes || 0), 0)} ${t.minutes}`}
              />
              <MetricCard
                icon={<CloudSun />}
                label={t.weather}
                value={weather?.warning ? t.caution : weather?.current ? t.stable : t.waiting}
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{t.itinerary}</h2>
                <span className="text-sm text-slate-400">{t.editable}</span>
              </div>
              <div className="space-y-3">
                {itinerary.length === 0 && <EmptyState text={t.emptyItinerary} />}
                {itinerary.map((item) => (
                  <div key={item.poi.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">
                            {item.order}
                          </span>
                          <h3 className="font-semibold text-white">{item.poi.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400">{item.poi.category}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.reason}</p>
                        {item.travelFromPrevious && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                            <Badge icon={<Car size={14} />}>
                              {item.travelFromPrevious.estimatedMinutes} {t.minutes}
                            </Badge>
                            <Badge icon={<Map size={14} />}>
                              {item.travelFromPrevious.distanceKm} km
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => loadExpertRoute(item.poi)}
                          className="rounded-lg p-2 text-cyan-200 hover:bg-slate-800"
                          aria-label={t.routeAi}
                        >
                          {routeLoadingId === item.poi.id ? <Loader2 className="animate-spin" size={18} /> : <Route size={18} />}
                        </button>
                        <button
                          onClick={() => removeFromItinerary(item.poi.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-300"
                          aria-label={t.remove}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <RoutePanel route={expertRoute} text={t} />

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">{t.addable}</h2>
              {poiResults.length === 0 && <EmptyState text={t.noExtra} />}
              <div className="grid gap-3 md:grid-cols-2">
                {poiResults.map((poi) => (
                  <PoiCard
                    key={poi.id}
                    poi={poi}
                    text={t}
                    routeLoading={routeLoadingId === poi.id}
                    onAdd={() => addPoiToItinerary(poi)}
                    onRoute={() => loadExpertRoute(poi)}
                    onFeedback={(eventType) => recordFeedback(eventType, { poiId: poi.id, category: poi.category })}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {businessAreas.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
                <EmptyState text={t.businessEmpty} />
              </div>
            )}
            {businessAreas.map((area, index) => (
              <div key={area.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-slate-950">
                        Top {index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-white">
                        {t.area} {area.lat.toFixed(3)}, {area.lon.toFixed(3)}
                      </h3>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{area.reason}</p>
                    {area.warnings?.map((warning) => (
                      <p key={warning} className="mt-2 text-sm text-amber-200">
                        {warning}
                      </p>
                    ))}
                  </div>
                  <div className="rounded-xl bg-emerald-400/10 px-5 py-4 text-center">
                    <div className="text-3xl font-bold text-emerald-300">{area.score}</div>
                    <div className="text-xs uppercase tracking-wide text-emerald-100/70">{t.opportunity}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  <Signal label={t.demand} value={percent(area.signals.demandProxy)} />
                  <Signal label={t.conceptFit} value={percent(area.signals.conceptFit)} />
                  <Signal label={t.complementary} value={percent(area.signals.complementary)} />
                  <Signal label={t.accessibility} value={percent(area.signals.accessibility)} />
                  <Signal label={t.competition} value={percent(area.signals.competitionPenalty)} />
                </div>

                {area.llmInsight && (
                  <BusinessInsightPanel area={area} text={t} />
                )}

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-200">{t.topCategories}</h4>
                    <div className="flex flex-wrap gap-2">
                      {area.topCategories.map((item) => (
                        <span key={item.category} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {item.category}: {item.count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-200">{t.samplePois}</h4>
                    <div className="space-y-1 text-sm text-slate-400">
                      {area.samplePOIs.slice(0, 3).map((poi) => (
                        <div key={poi.id}>
                          {poi.name} - {poi.category}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 text-cyan-300">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

function Badge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1">
      {icon}
      {children}
    </span>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function BusinessInsightPanel({ area, text }: { area: BusinessArea; text: typeof copy.vi }) {
  const insight = area.llmInsight;
  if (!insight) return null;

  return (
    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">{text.businessReport}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-300">{insight.summary}</p>
        </div>
        {area.guardrail?.hallucinationChecked && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              area.guardrail.passed
                ? 'bg-emerald-400/15 text-emerald-200'
                : 'bg-amber-400/15 text-amber-200'
            }`}
          >
            <CheckCircle2 size={14} />
            {text.guardrailOk}
          </span>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <InsightBlock title={text.potential} body={insight.area_potential} />
        <InsightBlock title={text.complementaryPoi} body={insight.complementary_poi_analysis} />
        <InsightList title={text.risks} items={insight.risk_warnings} tone="warning" />
        <InsightList title={text.nextActions} items={insight.recommended_actions} tone="action" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <h5 className="mb-2 text-sm font-semibold text-slate-200">{text.evidence}</h5>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <span>POI: {area.evidence?.rawCounts.poiTotalInArea ?? area.samplePOIs.length}</span>
            <span>Semantic: {area.evidence?.rawCounts.semanticHitsInArea ?? area.signals.semanticHits}</span>
            <span>Competitors: {area.evidence?.rawCounts.directCompetitorsInArea ?? area.signals.directCompetitors}</span>
            <span>Complementary: {area.evidence?.rawCounts.complementaryCandidates ?? 0}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.used_evidence_ids.slice(0, 8).map((id) => (
              <span key={id} className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                {id}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <h5 className="mb-2 text-sm font-semibold text-slate-200">{text.missingEvidence}</h5>
          <div className="flex flex-wrap gap-2">
            {insight.missing_evidence.map((item) => (
              <span key={item} className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <h5 className="mb-2 text-sm font-semibold text-cyan-100">{title}</h5>
      <p className="text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: 'warning' | 'action' }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <h5 className={`mb-2 text-sm font-semibold ${tone === 'warning' ? 'text-amber-100' : 'text-emerald-100'}`}>
        {title}
      </h5>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function RoutePanel({ route, text }: { route: ExpertRoute | null; text: typeof copy.vi }) {
  const steps = route?.steps || route?.route || [];
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{text.routePanel}</h2>
          <p className="mt-1 text-sm text-slate-400">{route?.destination?.title || text.routeHint}</p>
        </div>
        {route?.valid && <CheckCircle2 className="text-emerald-300" />}
      </div>
      {!route && <EmptyState text={text.routeHint} />}
      {route && (
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex flex-wrap gap-2">
            {route.distance && <Badge icon={<Map size={14} />}>{route.distance}</Badge>}
            {route.duration && <Badge icon={<Car size={14} />}>{route.duration}</Badge>}
          </div>
          {route.warnings?.map((warning) => (
            <div key={warning} className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
              {warning}
            </div>
          ))}
          {steps.slice(0, 5).map((step, index) => (
            <div key={`${step.instructions}-${index}`} className="rounded-lg bg-slate-900 p-3">
              <span className="mr-2 font-semibold text-cyan-200">{index + 1}.</span>
              {step.instructions || step.instruction || JSON.stringify(step)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PoiCard({
  poi,
  text,
  routeLoading,
  onAdd,
  onRoute,
  onFeedback,
}: {
  poi: PoiResult;
  text: typeof copy.vi;
  routeLoading: boolean;
  onAdd: () => void;
  onRoute: () => void;
  onFeedback: (eventType: string) => void;
}) {
  const mapAction = poi.actions?.find((action) => action.type === 'map');
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{poi.title}</h3>
          <p className="text-sm text-slate-400">{poi.category}</p>
        </div>
        <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-sm font-semibold text-cyan-200">
          {poi.score}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-300">{poi.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
        >
          <Plus size={15} />
          {text.add}
        </button>
        <button
          onClick={onRoute}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20"
        >
          {routeLoading ? <Loader2 className="animate-spin" size={15} /> : <Route size={15} />}
          {text.routeAi}
        </button>
        {mapAction?.url && (
          <a
            href={mapAction.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          >
            <MapPin size={15} />
            {text.openMaps}
          </a>
        )}
        <button
          onClick={() => onFeedback('poi_useful')}
          className="rounded-lg bg-slate-800 p-2 text-emerald-200 hover:bg-slate-700"
          aria-label={text.useful}
        >
          <ThumbsUp size={15} />
        </button>
        <button
          onClick={() => onFeedback('poi_not_fit')}
          className="rounded-lg bg-slate-800 p-2 text-red-200 hover:bg-slate-700"
          aria-label={text.notFit}
        >
          <ThumbsDown size={15} />
        </button>
      </div>
    </div>
  );
}
