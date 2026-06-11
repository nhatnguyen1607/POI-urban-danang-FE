import { type ReactNode, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Heart,
  Loader2,
  MapPinned,
  MessageSquareHeart,
  Plus,
  Send,
  Sparkles,
  Store,
  ThumbsDown,
  ThumbsUp,
  UploadCloud,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiClient } from '../../utils/apiClient';
import { useAuth } from '../../auth/useAuth';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const preferenceGroups = [
  { title: 'Sở thích', values: ['Ẩm thực địa phương', 'Cà phê yên tĩnh', 'Biển', 'Di sản', 'Chụp ảnh', 'Mua sắm'] },
  { title: 'Ngân sách', values: ['Tiết kiệm', 'Vừa phải', 'Cao cấp'] },
  { title: 'Di chuyển', values: ['Đi bộ', 'Xe máy', 'Ô tô/Grab', 'Xe đạp'] },
];

const budgetByLabel: Record<string, 'low' | 'medium' | 'high'> = {
  'Tiết kiệm': 'low',
  'Vừa phải': 'medium',
  'Cao cấp': 'high',
};

const mobilityByLabel: Record<string, 'walking' | 'motorbike' | 'car' | 'grab'> = {
  'Đi bộ': 'walking',
  'Xe máy': 'motorbike',
  'Ô tô/Grab': 'grab',
  'Xe đạp': 'walking',
};

function budgetLabel(value?: string) {
  if (value === 'low') return 'Tiết kiệm';
  if (value === 'high') return 'Cao cấp';
  return 'Vừa phải';
}

function mobilityLabel(value?: string) {
  if (value === 'walking') return 'Đi bộ';
  if (value === 'car') return 'Ô tô/Grab';
  if (value === 'grab') return 'Ô tô/Grab';
  return 'Xe máy';
}

function mobilityLabels(value?: string | string[]) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map(mobilityLabel);
}

function selectedToPreferences(selected: string[]) {
  const budget = selected.find((item) => budgetByLabel[item]);
  const mobility = selected.filter((item) => mobilityByLabel[item]).map((item) => mobilityByLabel[item]);
  const nonProfileControls = new Set([...Object.keys(budgetByLabel), ...Object.keys(mobilityByLabel)]);
  return {
    likedCategories: selected.filter((item) => !nonProfileControls.has(item)),
    dislikedCategories: [],
    likedTags: [],
    dislikedTags: [],
    budgetLevel: budget ? budgetByLabel[budget] : 'medium',
    mobility: mobility.length ? Array.from(new Set(mobility)) : ['motorbike'],
    preferredLanguage: localStorage.getItem('danang-urbanagent-language') === 'en' ? 'en' : 'vi',
  };
}

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

function clampPercent(value?: number) {
  const normalized = Number(value || 0);
  return Math.max(0, Math.min(100, normalized <= 1 ? Math.round(normalized * 100) : Math.round(normalized)));
}

function percent(value?: number) {
  return `${clampPercent(value)}%`;
}

function formatAreaTitle(area: any, index: number) {
  const poiCount = area.evidence?.rawCounts?.poiTotalInArea ?? area.samplePOIs?.length ?? 0;
  const competitors = area.signals?.directCompetitors ?? area.evidence?.rawCounts?.directCompetitorsInArea ?? 0;
  return `Top ${index + 1}: Khu vực tiềm năng ${Math.round(Number(area.score || 0))}/100, có ${poiCount} POI và ${competitors} đối thủ trực tiếp.`;
}

function formatAreaSummary(area: any) {
  return [
    `Nhu cầu ${percent(area.signals?.demandProxy)}`,
    `độ khớp concept ${percent(area.signals?.conceptFit)}`,
    `khả năng tiếp cận ${percent(area.signals?.accessibility)}`,
    `cạnh tranh ${percent(area.signals?.competitionPenalty)}`,
  ].join(', ');
}

function buildMetricData(area: any) {
  return [
    { label: 'Cơ hội', value: Math.round(Number(area.score || 0)) },
    { label: 'Nhu cầu', value: clampPercent(area.signals?.demandProxy) },
    { label: 'Cạnh tranh', value: clampPercent(area.signals?.competitionPenalty) },
    { label: 'Tiếp cận', value: clampPercent(area.signals?.accessibility) },
    { label: 'Phù hợp concept', value: clampPercent(area.signals?.conceptFit) },
  ];
}

function buildDistrictData(areas: any[]) {
  return areas.map((area, index) => ({
    area: `Top ${index + 1}`,
    demand: clampPercent(area.signals?.demandProxy),
    competition: clampPercent(area.signals?.competitionPenalty),
  }));
}

function serializeAreaSuggestion(area: any, index: number) {
  return {
    id: area.id || `area_${index + 1}`,
    rank: index + 1,
    title: formatAreaTitle(area, index),
    summary: formatAreaSummary(area),
    score: Math.round(Number(area.score || 0)),
    lat: Number(area.lat),
    lon: Number(area.lon || area.lng),
    signals: area.signals || {},
    samplePOIs: area.samplePOIs || [],
    insight: area.llmInsight || null,
  };
}

export function PreferencesPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>(['Ẩm thực địa phương', 'Biển', 'Vừa phải', 'Xe máy']);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/api/customer/profile')
      .then((data) => {
        const preferences = data?.profile?.preferences;
        if (!preferences) return;
        const next = [
          ...(preferences.likedCategories || []),          budgetLabel(preferences.budgetLevel),
          ...mobilityLabels(preferences.mobility),
        ].filter(Boolean);
        if (next.length) setSelected(Array.from(new Set(next)));
      })
      .catch(() => {});
  }, [user]);

  const toggle = (value: string) => {
    setMessage('');
    setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/api/customer/profile', {
        preferences: selectedToPreferences(selected),
        defaultLocation: { lat: 16.0544, lng: 108.2022, label: 'Đà Nẵng' },
      });
      setMessage('Đã lưu thành công.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu sở thích.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Hồ sơ & sở thích" subtitle="Chọn nhanh bằng chips để Urban Agent cá nhân hóa lịch trình của bạn.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {preferenceGroups.map((group) => (
            <section key={group.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">{group.title}</h2>
              <div className="flex flex-wrap gap-3">
                {group.values.map((value) => (
                  <button
                    key={value}
                    onClick={() => toggle(value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selected.includes(value)
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Heart className="mb-4 text-rose-500" size={28} />
          <h2 className="text-lg font-bold text-slate-950">Gu hiện tại</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {item}
              </span>
            ))}
          </div>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Lưu sở thích
          </button>
          {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
        </aside>
      </div>
    </Page>
  );
}

export function FeedbackPage() {
  const { user } = useAuth();
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [feedbackByPoi, setFeedbackByPoi] = useState<Record<string, 'poi_useful' | 'poi_not_fit'>>({});
  const [savingPoiId, setSavingPoiId] = useState('');

  useEffect(() => {
    if (!user) {
      setFeedbackItems([]);
      return;
    }
    setLoading(true);
    setMessage('');
    apiClient
      .get('/api/agent/itineraries')
      .then((data) => {
        const savedItineraries = Array.isArray(data?.itineraries) ? data.itineraries : [];
        const items = savedItineraries.flatMap((itinerary: any) =>
          (itinerary.stops || []).map((stop: any) => {
            const poi = stop.poiSnapshot || {};
            return {
              poiId: stop.poiId || poi.id,
              title: poi.title || poi.name || `Điểm dừng ${stop.order || ''}`.trim(),
              category: poi.category || 'Địa điểm',
              district: poi.district || 'Đà Nẵng',
              order: stop.order,
              reason: stop.reason,
              itineraryId: itinerary.itineraryId,
              itineraryQuery: itinerary.query || 'Lịch trình đã lưu',
              updatedAt: itinerary.updatedAt,
            };
          }),
        );
        const deduped = items.filter(
          (item: any, index: number, all: any[]) => item.poiId && all.findIndex((candidate) => candidate.poiId === item.poiId) === index,
        );
        setFeedbackItems(deduped);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải lịch trình đã lưu.'))
      .finally(() => setLoading(false));
  }, [user]);

  const sendFeedback = async (item: any, eventType: 'poi_useful' | 'poi_not_fit') => {
    if (!item.poiId) return;
    setSavingPoiId(item.poiId);
    setMessage('');
    try {
      await apiClient.post('/api/agent/feedback', {
        role: 'traveler',
        eventType,
        query: item.itineraryQuery,
        payload: {
          poiId: item.poiId,
          itineraryId: item.itineraryId,
          category: item.category,
          poi: {
            id: item.poiId,
            title: item.title,
            category: item.category,
            district: item.district,
          },
        },
      });
      setFeedbackByPoi((current) => ({ ...current, [item.poiId]: eventType }));
      setMessage(eventType === 'poi_useful' ? 'Đã ghi nhận điểm bạn thích.' : 'Đã ghi nhận điểm chưa phù hợp.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu phản hồi.');
    } finally {
      setSavingPoiId('');
    }
  };

  return (
    <Page title="Phản hồi lịch trình" subtitle="Các điểm trong lịch trình đã lưu sẽ xuất hiện ở đây để bạn like/dislike, giúp Urban Agent gợi ý đúng gu hơn ở lần sau.">
      {!user && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Hãy đăng nhập để xem các điểm trong lịch trình đã lưu.
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
          {message}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">Đang tải lịch trình đã lưu...</p>}
        {!loading && user && feedbackItems.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Chưa có điểm nào từ lịch trình đã lưu để phản hồi.
          </p>
        )}
        {feedbackItems.map((item) => (
          <article key={item.poiId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.category} · {item.district}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.itineraryQuery}</p>
                {item.reason && <p className="mt-2 text-sm leading-6 text-slate-500">{item.reason}</p>}
              </div>
              <MapPinned className="text-cyan-700" />
            </div>
            <div className="mt-5 flex gap-2">
              <IconButton
                label="Hữu ích"
                tone="green"
                icon={savingPoiId === item.poiId ? <Loader2 className="animate-spin" size={18} /> : <ThumbsUp size={18} />}
                active={feedbackByPoi[item.poiId] === 'poi_useful'}
                disabled={savingPoiId === item.poiId}
                onClick={() => sendFeedback(item, 'poi_useful')}
              />
              <IconButton
                label="Không phù hợp"
                tone="amber"
                icon={savingPoiId === item.poiId ? <Loader2 className="animate-spin" size={18} /> : <ThumbsDown size={18} />}
                active={feedbackByPoi[item.poiId] === 'poi_not_fit'}
                disabled={savingPoiId === item.poiId}
                onClick={() => sendFeedback(item, 'poi_not_fit')}
              />
            </div>
          </article>
        ))}
      </div>
    </Page>
  );
}

export function SellerAnalyticsPage() {
  const [concept, setConcept] = useState('Tôi muốn mở cafe học bài cho sinh viên tại Đà Nẵng.');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'suggestions' | 'analytics'>('suggestions');
  const [savedConcepts, setSavedConcepts] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get('/api/seller/concepts')
      .then((data) => setSavedConcepts(data?.concepts || []))
      .catch(() => setSavedConcepts([]));
  }, []);

  const areas = Array.isArray(analysis?.areas) ? analysis.areas : [];
  const bestArea = areas[0];
  const metricData = bestArea ? buildMetricData(bestArea) : [];
  const districtData = buildDistrictData(areas);

  const runAnalysis = async () => {
    if (!concept.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await apiClient.post('/api/agent/business-insight', { concept, limit: 5, language: 'vi' });
      setAnalysis(data);
      setActiveTab('suggestions');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể phân tích vị trí kinh doanh.');
    } finally {
      setLoading(false);
    }
  };

  const saveConcept = async () => {
    if (!concept.trim() || areas.length === 0) return;
    const saved = {
      query: concept.trim(),
      concept: concept.trim(),
      suggestions: areas.map(serializeAreaSuggestion),
      analysis,
    };
    setMessage('');
    try {
      const result = await apiClient.post('/api/seller/concepts', saved);
      const stored = result?.concept || { ...saved, conceptId: result?.conceptId || uid() };
      setSavedConcepts((items) => [stored, ...items.filter((item) => (item.query || item.concept) !== stored.query)].slice(0, 30));
      setMessage('Đã lưu thành công.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu concept.');
    }
  };

  const openSavedConcept = (item: any) => {
    setConcept(item.query || item.concept || '');
    setAnalysis(item.analysis || { areas: item.suggestions || [] });
    setActiveTab('suggestions');
    setMessage('Đã mở concept đã lưu.');
  };

  return (
    <Page title="Bảng điều khiển phân tích" subtitle="AI Site Selection dùng dữ liệu thật từ kết quả phân tích concept để gợi ý khu vực và so sánh tín hiệu thị trường.">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Concept kinh doanh</span>
            <textarea
              value={concept}
              onChange={(event) => {
                setConcept(event.target.value);
                setMessage('');
              }}
              className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500"
              placeholder="Ví dụ: quán cafe học bài cho sinh viên, hải sản gia đình, trà sữa gần trường..."
            />
          </label>
          <div className="flex flex-col gap-2 self-end">
            <button
              onClick={runAnalysis}
              disabled={loading || !concept.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Phân tích
            </button>
            <button
              onClick={saveConcept}
              disabled={!concept.trim() || areas.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
              Lưu concept
            </button>
          </div>
        </div>
        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
      </section>

      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'suggestions' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Khu vực gợi ý
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'analytics' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Phân tích khu vực
        </button>
      </div>

      {activeTab === 'suggestions' && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Khu vực gợi ý</h2>
            {areas.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chạy phân tích để xem các khu vực phù hợp với concept.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {areas.map((area: any, index: number) => (
                  <SuggestionCard key={area.id || index} area={area} index={index} />
                ))}
              </div>
            )}
          </section>

          {savedConcepts.length > 0 && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">Concept đã lưu</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {savedConcepts.map((item) => (
                  <button
                    key={item.conceptId || item.id || item.query}
                    onClick={() => openSavedConcept(item)}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    <p className="font-semibold text-slate-950">{item.query || item.concept}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.suggestions?.length || 0} khu vực gợi ý đã lưu</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">Bản đồ nhiệt khu vực tiềm năng</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Đà Nẵng</span>
              </div>
              <div className="h-[460px] overflow-hidden rounded-xl border border-slate-200">
                <MapContainer center={[16.0544, 108.2022]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {areas.map((area: any, index: number) => {
                    const score = Number(area.score || 0);
                    const lat = Number(area.lat);
                    const lon = Number(area.lon || area.lng);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                    return (
                      <Circle
                        key={area.id || index}
                        center={[lat, lon]}
                        radius={350 + score * 10}
                        pathOptions={{ color: '#0891b2', fillColor: '#0891b2', fillOpacity: Math.max(0.18, Math.min(0.58, score / 140)) }}
                      >
                        <Popup>
                          <strong>Top {index + 1}: {score}/100</strong>
                          <br />
                          Nhu cầu {percent(area.signals?.demandProxy)} · Cạnh tranh {percent(area.signals?.competitionPenalty)}
                        </Popup>
                      </Circle>
                    );
                  })}
                  {areas.map((area: any, index: number) => {
                    const lat = Number(area.lat);
                    const lon = Number(area.lon || area.lng);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                    return (
                      <Marker key={`marker-${area.id || index}`} position={[lat, lon]}>
                        <Popup>{formatAreaTitle(area, index)}</Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">Chỉ số khu vực tốt nhất</h2>
              {metricData.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có dữ liệu phân tích.</p>
              ) : (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height={288} minWidth={240}>
                    <RadarChart data={metricData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="label" tick={{ fill: '#334155', fontSize: 12 }} />
                      <Radar dataKey="value" fill="#0891b2" fillOpacity={0.28} stroke="#0891b2" strokeWidth={2} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Nhu cầu và cạnh tranh theo khu vực</h2>
            {districtData.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có dữ liệu phân tích.</p>
            ) : (
              <div className="h-80 min-w-0">
                <ResponsiveContainer width="100%" height={320} minWidth={240}>
                  <BarChart data={districtData}>
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="demand" name="Nhu cầu" fill="#0891b2" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="competition" name="Cạnh tranh" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </>
      )}
    </Page>
  );
}

function SuggestionCard({ area, index }: { area: any; index: number }) {
  const topPois = Array.isArray(area.samplePOIs) ? area.samplePOIs.slice(0, 3) : [];
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{formatAreaTitle(area, index)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{area.llmInsight?.summary || formatAreaSummary(area)}</p>
          {topPois.length > 0 && (
            <p className="mt-3 text-xs font-medium text-slate-500">
              POI tham chiếu: {topPois.map((poi: any) => poi.name).filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
          {Math.round(Number(area.score || 0))}
        </span>
      </div>
    </article>
  );
}

export function BusinessProfilePage() {
  const [stores, setStores] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', category: '', address: '', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiClient
      .get('/api/seller/businesses')
      .then((data) => setStores(data?.businesses || []))
      .catch(() => setStores([]));
  }, []);

  const saveBusiness = async () => {
    if (!form.name || !form.category || !form.address) return;
    setSaving(true);
    setMessage('');
    try {
      const result = await apiClient.post('/api/seller/businesses', form);
      if (result?.business) setStores((items) => [result.business, ...items]);
      setForm({ name: '', category: '', address: '', imageUrl: '' });
      setMessage('Đã lưu thành công.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu địa điểm.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Quản lý địa điểm" subtitle="Theo dõi cửa hàng sở hữu, cập nhật thông tin và hình ảnh đại diện.">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Thêm địa điểm</h2>
          <div className="space-y-3">
            <Field placeholder="Tên cửa hàng" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field placeholder="Danh mục kinh doanh" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
            <Field placeholder="Địa chỉ" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
            <Field placeholder="URL hình ảnh" value={form.imageUrl} onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} />
            <div className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
              <UploadCloud className="mb-2" />
              Upload file sẽ được bổ sung ở bước sau
            </div>
            <button
              onClick={saveBusiness}
              disabled={saving || !form.name || !form.category || !form.address}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Lưu địa điểm
            </button>
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Cửa hàng đang sở hữu</h2>
          <div className="space-y-3">
            {stores.map((store) => (
              <div key={store.businessId || store.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Store className="text-cyan-700" />
                  <div>
                    <h3 className="font-bold text-slate-950">{store.name}</h3>
                    <p className="text-sm text-slate-500">
                      {store.category} · {store.status || 'saved'}
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Sửa</button>
              </div>
            ))}
            {stores.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có cửa hàng nào.</p>}
          </div>
        </section>
      </div>
    </Page>
  );
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState({ users: 0, pois: 0, reviews: 0, status: 'Đang kiểm tra' });

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      apiClient.get('/api/admin/users?limit=200'),
      apiClient.get('/api/pois?status=pending&limit=200'),
      apiClient.get('/api/admin/reviews?limit=200'),
      apiClient.get('/api/agent/training-status'),
    ]).then(([users, pois, reviews, training]) => {
      if (!mounted) return;
      setStats({
        users: users.status === 'fulfilled' ? users.value?.users?.length || 0 : 0,
        pois: pois.status === 'fulfilled' ? pois.value?.pois?.length || 0 : 0,
        reviews: reviews.status === 'fulfilled' ? reviews.value?.reviews?.length || 0 : 0,
        status: training.status === 'fulfilled' && training.value ? 'Agent sẵn sàng' : 'Chưa có dữ liệu',
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Page title="Admin Control Panel" subtitle="Quản lý users, POIs, reviews, hệ thống và giám sát AI trong một không gian riêng.">
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStat icon={<Users />} label="Users" value={String(stats.users)} />
        <AdminStat icon={<Store />} label="POI chờ duyệt" value={String(stats.pois)} />
        <AdminStat icon={<MessageSquareHeart />} label="Reviews" value={String(stats.reviews)} />
        <AdminStat icon={<BarChart3 />} label="AI Status" value={stats.status} />
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">AI Monitoring</h2>
            <p className="mt-1 text-sm text-slate-500">Theo dõi metric huấn luyện và trực quan hóa cluster của Agent.</p>
          </div>
          <BarChart3 className="text-cyan-700" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <a href="/admin/model-metrics" className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
            Model Metrics
          </a>
          <a href="/admin/tsne-cluster" className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
            t-SNE Clusters
          </a>
        </div>
      </section>
    </Page>
  );
}

export function ModerationPage({ type }: { type: 'users' | 'pois' | 'reviews' | 'system' }) {
  const titles = {
    users: 'Quản lý người dùng',
    pois: 'Duyệt POI/Seller',
    reviews: 'Duyệt đánh giá',
    system: 'Cấu hình hệ thống',
  };
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadRows = () => {
    setLoading(true);
    setMessage('');
    const endpoint =
      type === 'users'
        ? `/api/admin/users?limit=100${filter !== 'all' ? `&status=${filter}` : ''}`
        : type === 'pois'
          ? `/api/pois?limit=100${filter !== 'all' ? `&status=${filter}` : ''}`
          : type === 'reviews'
            ? `/api/admin/reviews?limit=100${filter !== 'all' ? `&status=${filter}` : ''}`
            : '/api/health/firebase';
    apiClient
      .get(endpoint)
      .then((data) => {
        if (type === 'users') setRows(data?.users || []);
        else if (type === 'pois') setRows(data?.pois || []);
        else if (type === 'reviews') setRows(data?.reviews || []);
        else setRows([data]);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRows();
  }, [type, filter]);

  const moderate = async (row: any, action: 'approve' | 'reject') => {
    const nextStatus = action === 'approve' ? 'active' : 'hidden';
    const reviewStatus = action === 'approve' ? 'approved' : 'rejected';
    try {
      if (type === 'users') {
        await apiClient.post(`/api/admin/users/${row.uid}/status`, { status: action === 'approve' ? 'active' : 'banned' });
      } else if (type === 'pois') {
        await apiClient.post(`/api/admin/pois/${row.poiId}/status`, { status: nextStatus, verified: action === 'approve' });
      } else if (type === 'reviews') {
        await apiClient.post('/api/admin/reviews', { ...row, status: reviewStatus });
      }
      setMessage(action === 'approve' ? 'Đã duyệt thành công.' : 'Đã từ chối thành công.');
      loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái.');
    }
  };

  return (
    <Page title={titles[type]} subtitle="Bảng dữ liệu với bộ lọc và thao tác nhanh Approve/Reject.">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-3">
          <Field placeholder="Tìm kiếm" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="pending">Chờ duyệt</option>
            <option value="active">Đang hoạt động</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
        {message && <p className="mb-3 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">{message}</p>}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          {loading && <p className="p-4 text-sm text-slate-500">Đang tải dữ liệu...</p>}
          {!loading && rows.length === 0 && <p className="p-4 text-sm text-slate-500">Không có dữ liệu phù hợp.</p>}
          {!loading &&
            rows.map((row, index) => (
              <div key={row.uid || row.poiId || row.reviewId || index} className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[1fr_180px_140px_160px]">
                <strong className="text-slate-950">{row.displayName || row.email || row.name || row.title || row.projectId || `Bản ghi ${index + 1}`}</strong>
                <span className="text-sm text-slate-500">{row.role || row.category || row.targetType || (row.firestoreReady ? 'Firestore ready' : 'System')}</span>
                <span className="text-sm font-semibold text-amber-700">{row.status || (row.firestoreReady ? 'ready' : 'pending')}</span>
                <div className="flex gap-2">
                  {type !== 'system' && (
                    <>
                      <button onClick={() => moderate(row, 'approve')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 size={16} />
                        Duyệt
                      </button>
                      <button onClick={() => moderate(row, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                        <XCircle size={16} />
                        Từ chối
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </Page>
  );
}

function Page({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function IconButton({
  label,
  tone,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  tone: 'green' | 'amber' | 'red';
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? 'ring-2 ring-cyan-500 ring-offset-2' : ''
      } ${tones[tone]}`}
    >
      {icon}
    </button>
  );
}

function Field({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-500"
      placeholder={placeholder}
    />
  );
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 inline-flex rounded-lg bg-cyan-50 p-2 text-cyan-700">{icon}</div>
      <div className="text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
    </article>
  );
}

