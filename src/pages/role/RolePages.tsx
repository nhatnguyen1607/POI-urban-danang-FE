import { type ReactNode, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  Building2,
  Heart,
  Info,
  ListChecks,
  Loader2,
  MapPinned,
  MessageSquareHeart,
  RadarIcon,
  Plus,
  Send,
  Sparkles,
  Store,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
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
import { useLanguage, type Language } from '../../i18n/LanguageContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customerRoleCopy = {
  vi: {
    preferenceTitle: 'Hồ sơ & sở thích',
    preferenceSubtitle: 'Chọn nhanh bằng chips để Urban Agent cá nhân hóa lịch trình của bạn.',
    currentTaste: 'Gu hiện tại',
    savePreferences: 'Lưu sở thích',
    saved: 'Đã lưu thành công.',
    saveFailed: 'Không thể lưu sở thích.',
    groups: {
      'Sở thích': 'Sở thích',
      'Ngân sách': 'Ngân sách',
      'Di chuyển': 'Di chuyển',
    },
    preferenceLabels: {} as Record<string, string>,
    feedbackTitle: 'Tinh chỉnh gu AI',
    feedbackSubtitle: 'Like/dislike nhanh các điểm từng được agent gợi ý. Đây là tín hiệu học gu, khác với review trải nghiệm khi bạn đến quán.',
    feedbackHeroTitle: 'Dạy agent bằng phản hồi 1 chạm',
    feedbackHeroBody: 'Review tại POI dùng để chia sẻ trải nghiệm xã hội. Trang này chỉ dùng cho cá nhân hóa: điểm nào hợp gu sẽ được tăng trọng số, điểm nào lệch gu sẽ bị phạt trong lần gợi ý sau.',
    positiveSignals: 'Tín hiệu tích cực',
    negativeSignals: 'Tín hiệu tránh',
    learningMode: 'Agent memory tuning',
    learningModeBody: 'Mỗi lượt bấm cập nhật agentMemories ngay, nên lần chạy Agent tiếp theo sẽ ưu tiên hoặc né các category/POI tương ứng.',
    signInFeedback: 'Hãy đăng nhập để xem các điểm trong lịch trình đã lưu.',
    loadingSaved: 'Đang tải lịch trình đã lưu...',
    noFeedbackItems: 'Chưa có điểm nào từ lịch trình đã lưu để phản hồi.',
    useful: 'Hữu ích',
    notFit: 'Không phù hợp',
    feedbackUseful: 'Đã ghi nhận điểm bạn thích.',
    feedbackNotFit: 'Đã ghi nhận điểm chưa phù hợp.',
    feedbackFailed: 'Không thể lưu phản hồi.',
    loadFailed: 'Không thể tải lịch trình đã lưu.',
    stop: 'Điểm dừng',
    place: 'Địa điểm',
    danang: 'Đà Nẵng',
    savedItinerary: 'Lịch trình đã lưu',
  },
  en: {
    preferenceTitle: 'Profile & preferences',
    preferenceSubtitle: 'Choose quick chips so Urban Agent can personalize your itineraries.',
    currentTaste: 'Current taste',
    savePreferences: 'Save preferences',
    saved: 'Saved successfully.',
    saveFailed: 'Could not save preferences.',
    groups: {
      'Sở thích': 'Interests',
      'Ngân sách': 'Budget',
      'Di chuyển': 'Mobility',
    },
    preferenceLabels: {
      'Ẩm thực địa phương': 'Local food',
      'Cà phê yên tĩnh': 'Quiet cafes',
      'Biển': 'Beach',
      'Di sản': 'Heritage',
      'Chụp ảnh': 'Photography',
      'Mua sắm': 'Shopping',
      'Tiết kiệm': 'Budget',
      'Vừa phải': 'Moderate',
      'Cao cấp': 'Premium',
      'Đi bộ': 'Walking',
      'Xe máy': 'Motorbike',
      'Ô tô/Grab': 'Car/Grab',
      'Xe đạp': 'Bicycle',
    },
    feedbackTitle: 'AI taste tuning',
    feedbackSubtitle: 'Quickly like/dislike places the agent suggested before. This is a learning signal, not a public place review.',
    feedbackHeroTitle: 'Teach the agent with one-tap feedback',
    feedbackHeroBody: 'POI reviews are for sharing real visit experiences. This page is only for personalization: fitting places gain weight, mismatched places are penalized next time.',
    positiveSignals: 'Positive signals',
    negativeSignals: 'Avoid signals',
    learningMode: 'Agent memory tuning',
    learningModeBody: 'Every tap updates agentMemories immediately, so the next Agent run can prefer or avoid matching categories/POIs.',
    signInFeedback: 'Sign in to view stops from saved itineraries.',
    loadingSaved: 'Loading saved itineraries...',
    noFeedbackItems: 'No saved itinerary stops are available for feedback yet.',
    useful: 'Useful',
    notFit: 'Not a fit',
    feedbackUseful: 'Marked as useful.',
    feedbackNotFit: 'Marked as not a fit.',
    feedbackFailed: 'Could not save feedback.',
    loadFailed: 'Could not load saved itineraries.',
    stop: 'Stop',
    place: 'Place',
    danang: 'Danang',
    savedItinerary: 'Saved itinerary',
  },
};

const personaOptions = [
  { id: 'student', vi: 'Sinh viên', en: 'Student', detailVi: 'Tối ưu học tập, giá hợp lý, chỗ ngồi lâu.', detailEn: 'Study-friendly, budget-aware, longer dwell time.' },
  { id: 'remote_worker', vi: 'Làm việc từ xa', en: 'Remote Worker', detailVi: 'Ưu tiên yên tĩnh, wifi, ổ cắm và cafe.', detailEn: 'Quiet places, Wi-Fi, outlets and cafe context.' },
  { id: 'tourist', vi: 'Khách du lịch', en: 'Tourist', detailVi: 'Ưu tiên trải nghiệm nổi bật, gần tuyến và dễ đi.', detailEn: 'Iconic experiences, route fit and easy access.' },
  { id: 'local_explorer', vi: 'Người địa phương khám phá', en: 'Local Explorer', detailVi: 'Thích quán mới, quán ẩn mình và ít đông.', detailEn: 'Fresh spots, hidden gems and less crowded places.' },
] as const;

const tasteSections = [
  {
    id: 'sceneryVibes',
    vi: 'Cảnh quan & vibe đô thị',
    en: 'Urban Scenery & Vibes',
    icon: MapPinned,
    values: [
      { id: 'beach_view', vi: 'Ngắm biển', en: 'Beach view' },
      { id: 'riverfront', vi: 'Ven sông', en: 'Riverfront' },
      { id: 'hidden_gems', vi: 'Quán ẩn mình', en: 'Hidden gems' },
      { id: 'amusement_parks', vi: 'Khu vui chơi', en: 'Amusement parks' },
      { id: 'rooftop_city_view', vi: 'Rooftop/City view', en: 'Rooftop/City view' },
    ],
  },
  {
    id: 'activitiesPurposes',
    vi: 'Hoạt động & mục đích',
    en: 'Daily Activities & Purpose',
    icon: BrainCircuit,
    values: [
      { id: 'deep_work_study', vi: 'Deep Work/Học tập', en: 'Deep Work/Study' },
      { id: 'casual_socializing', vi: 'Gặp gỡ nhẹ nhàng', en: 'Casual Socializing' },
      { id: 'weekend_chill', vi: 'Cuối tuần chill', en: 'Weekend Chill' },
      { id: 'late_night_hangouts', vi: 'Đi chơi khuya', en: 'Late-night Hangouts' },
    ],
  },
  {
    id: 'companionContexts',
    vi: 'Đi cùng ai',
    en: 'Companion Context',
    icon: Users,
    values: [
      { id: 'solo', vi: 'Một mình', en: 'Solo' },
      { id: 'dating_romantic', vi: 'Hẹn hò/Lãng mạn', en: 'Dating/Romantic' },
      { id: 'friends_gathering', vi: 'Tụ tập bạn bè', en: 'Friends gathering' },
      { id: 'family_friendly', vi: 'Phù hợp gia đình', en: 'Family-friendly' },
    ],
  },
] as const;

const avoidOptions = [
  { id: 'overcrowded_places', vi: 'Nơi quá đông', en: 'Overcrowded places' },
  { id: 'loud_music_noisy', vi: 'Nhạc lớn/Ồn ào', en: 'Loud music/Noisy' },
  { id: 'no_parking_space', vi: 'Không có chỗ đỗ xe', en: 'No parking space' },
  { id: 'high_pricing', vi: 'Giá cao', en: 'High pricing' },
] as const;

type PreferenceSectionKey = 'sceneryVibes' | 'activitiesPurposes' | 'companionContexts';

interface PreferenceHubState {
  persona: string;
  sceneryVibes: string[];
  activitiesPurposes: string[];
  companionContexts: string[];
  avoid: string[];
  priceMin: number;
  priceMax: number;
}

const defaultPreferenceHub: PreferenceHubState = {
  persona: 'tourist',
  sceneryVibes: ['beach_view', 'hidden_gems'],
  activitiesPurposes: ['weekend_chill'],
  companionContexts: ['solo'],
  avoid: ['overcrowded_places'],
  priceMin: 20000,
  priceMax: 150000,
};

const preferenceHubCopy = {
  vi: {
    subtitle: 'Cấu hình gu rõ ràng để AI Agent khởi tạo vector gợi ý chính xác hơn.',
    account: 'Tài khoản',
    persona: 'User Persona',
    personaHint: 'Persona là baseline weight đầu tiên cho recommendation engine.',
    tasteTitle: 'Multi-dimensional taste profile',
    budgetTitle: 'Chi tiêu mong muốn theo mỗi POI',
    budgetHint: 'Khoảng giá này giúp Agent ưu tiên địa điểm vừa túi tiền thay vì chỉ dựa rating.',
    avoidTitle: 'Dislikes & Constraints',
    avoidHint: 'Các tag này sẽ bị lọc mạnh hoặc phạt điểm khi Agent xếp hạng.',
    dynamicTaste: 'My Dynamic Taste',
    signature: 'Current Taste Signature',
    personaLabel: 'Persona',
    priceRange: 'Khoảng giá',
    selectedSignals: 'Tín hiệu đã chọn',
    constraints: 'Ràng buộc tránh',
    signInHint: 'Bạn cần đăng nhập để lưu preference vào Firestore.',
  },
  en: {
    subtitle: 'Tune explicit taste signals so the AI Agent can initialize a stronger recommendation vector.',
    account: 'Account',
    persona: 'User Persona',
    personaHint: 'Persona becomes the first baseline weight for the recommendation engine.',
    tasteTitle: 'Multi-dimensional taste profile',
    budgetTitle: 'Expected price per item/POI',
    budgetHint: 'This range helps the Agent prefer affordable places instead of relying only on ratings.',
    avoidTitle: 'Dislikes & Constraints',
    avoidHint: 'These tags are strongly filtered or penalized during ranking.',
    dynamicTaste: 'My Dynamic Taste',
    signature: 'Current Taste Signature',
    personaLabel: 'Persona',
    priceRange: 'Price range',
    selectedSignals: 'Selected signals',
    constraints: 'Avoid constraints',
    signInHint: 'Sign in to save preferences to Firestore.',
  },
} as const;

function optionLabel(id: string, language: Language) {
  const all: Array<{ id: string; vi: string; en: string }> = [];
  personaOptions.forEach((item) => all.push({ id: item.id, vi: item.vi, en: item.en }));
  tasteSections.forEach((section) => section.values.forEach((item) => all.push({ id: item.id, vi: item.vi, en: item.en })));
  avoidOptions.forEach((item) => all.push({ id: item.id, vi: item.vi, en: item.en }));
  const found = all.find((item) => item.id === id);
  return found ? found[language] : id;
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')} VND`;
}

function inferBudgetLevel(min: number, max: number): 'low' | 'medium' | 'high' {
  const midpoint = (Number(min) + Number(max)) / 2;
  if (midpoint <= 70000) return 'low';
  if (midpoint >= 220000) return 'high';
  return 'medium';
}

function buildPreferencePayload(state: PreferenceHubState, language: Language) {
  const likedTags = [...state.sceneryVibes, ...state.activitiesPurposes, ...state.companionContexts];
  return {
    explicitSignalVersion: 'account_personalization_v2',
    persona: state.persona,
    personaBaseline: state.persona,
    tasteProfile: {
      sceneryVibes: state.sceneryVibes,
      activitiesPurposes: state.activitiesPurposes,
      companionContexts: state.companionContexts,
    },
    likedCategories: likedTags,
    dislikedCategories: [],
    likedTags,
    dislikedTags: state.avoid,
    negativeFilters: state.avoid,
    expectedPriceVnd: {
      min: state.priceMin,
      max: state.priceMax,
      currency: 'VND',
    },
    budgetLevel: inferBudgetLevel(state.priceMin, state.priceMax),
    mobility: ['motorbike'],
    preferredLanguage: language,
  };
}

const sellerCopy = {
  vi: {
    title: 'Bảng điều khiển phân tích',
    subtitle: 'AI Site Selection dùng dữ liệu hiện có để so sánh bằng chứng giữa các khu vực cần khảo sát.',
    conceptLabel: 'Concept kinh doanh',
    conceptSample: 'Tôi muốn mở cafe học bài cho sinh viên tại Đà Nẵng.',
    conceptPlaceholder: 'Ví dụ: quán cafe học bài cho sinh viên, hải sản gia đình, trà sữa gần trường...',
    analyze: 'Phân tích',
    saveConcept: 'Lưu concept',
    suggestionsTab: 'Khu vực khảo sát',
    analyticsTab: 'Phân tích khu vực',
    suggestedAreas: 'Khu vực khảo sát',
    runToSee: 'Chạy phân tích để xem các khu vực phù hợp với concept.',
    savedConcepts: 'Concept đã lưu',
    savedAreaCount: 'khu vực khảo sát đã lưu',
    heatmapTitle: 'Bản đồ tín hiệu khu vực',
    bestMetrics: 'Chỉ số khu vực tốt nhất',
    demandCompetition: 'Nhu cầu và cạnh tranh theo khu vực',
    noAnalysis: 'Chưa có dữ liệu phân tích.',
    referencePoi: 'POI tham chiếu',
    potentialArea: 'Khu vực khảo sát',
    has: 'có',
    poiAnd: 'POI và',
    directCompetitors: 'đối thủ trực tiếp',
    conceptFit: 'độ khớp concept',
    accessibility: 'khả năng tiếp cận',
    demand: 'Nhu cầu',
    competition: 'Cạnh tranh',
    danang: 'Đà Nẵng',
    saved: 'Đã lưu thành công.',
    opened: 'Đã mở concept đã lưu.',
    analyzeFailed: 'Không thể phân tích vị trí kinh doanh.',
    saveFailed: 'Không thể lưu concept.',
    parsedConstraints: 'Parsed Constraints',
    businessType: 'Business Type',
    targetCustomers: 'Target Customers',
    budgetLevel: 'Budget Level',
    priorities: 'Priorities & Constraints',
    parserNote: 'Concept Parser chỉ tách ý từ input, không thêm dữ kiện ngoài.',
    architecture: 'Business Decision Support Agent',
    stage: 'Stage',
    evidencePack: 'Evidence Pack & AI Interpretation',
    aiInterpretation: 'AI Brain Interpretation',
    opportunityGauge: 'Tóm tắt bằng chứng',
    evidenceTable: 'Evidence Table',
    actionRecommendations: 'Checklist xác minh',
    competitors: 'Competitors',
    complementaryPois: 'Complementary POIs',
    routeWarnings: 'Route Warnings',
    rawCounts: 'Raw evidence counts',
    missingEvidence: 'Missing evidence flagged by guardrail',
    scoreTooltips: {
      demandProxy: 'Demand proxy được tính từ mật độ danh mục, semantic hits, rating và review volume. Không phải footfall thật.',
      competitionPenalty: 'Competition index phản ánh số đối thủ trực tiếp trong cụm khu vực.',
      complementary: 'Complementary POIs là các địa điểm hỗ trợ luồng ghé chéo quanh concept.',
      accessibility: 'Accessibility ước lượng từ khoảng cách tới trung tâm và tín hiệu tiếp cận hiện có.',
      conceptFit: 'Concept fit đo mức trùng giữa intent kinh doanh và POI/cụm danh mục.',
      routeWarnings: 'Route warnings là cảnh báo heuristic cần khảo sát thêm trước khi quyết định.',
    },
  },
  en: {
    title: 'Analytics dashboard',
    subtitle: 'AI Site Selection compares available evidence across areas that require field verification.',
    conceptLabel: 'Business concept',
    conceptSample: 'I want to open a study cafe for students in Danang.',
    conceptPlaceholder: 'Example: student study cafe, family seafood restaurant, milk tea near schools...',
    analyze: 'Analyze',
    saveConcept: 'Save concept',
    suggestionsTab: 'Candidate evidence',
    analyticsTab: 'Area analytics',
    suggestedAreas: 'Candidate areas to verify',
    runToSee: 'Run analysis to see areas that fit the concept.',
    savedConcepts: 'Saved concepts',
    savedAreaCount: 'saved candidate areas',
    heatmapTitle: 'Area evidence map',
    bestMetrics: 'Best area metrics',
    demandCompetition: 'Demand and competition by area',
    noAnalysis: 'No analysis data yet.',
    referencePoi: 'Reference POIs',
    potentialArea: 'Candidate area',
    has: 'has',
    poiAnd: 'POIs and',
    directCompetitors: 'direct competitors',
    conceptFit: 'concept fit',
    accessibility: 'accessibility',
    demand: 'Demand',
    competition: 'Competition',
    danang: 'Danang',
    saved: 'Saved successfully.',
    opened: 'Saved concept opened.',
    analyzeFailed: 'Could not analyze the business location.',
    saveFailed: 'Could not save the concept.',
    parsedConstraints: 'Parsed Constraints',
    businessType: 'Business Type',
    targetCustomers: 'Target Customers',
    budgetLevel: 'Budget Level',
    priorities: 'Priorities & Constraints',
    parserNote: 'The Concept Parser extracts explicit intent from the input and does not add external facts.',
    architecture: 'Business Decision Support Agent',
    stage: 'Stage',
    evidencePack: 'Evidence Pack & AI Interpretation',
    aiInterpretation: 'AI Brain Interpretation',
    opportunityGauge: 'Evidence summary',
    evidenceTable: 'Evidence Table',
    actionRecommendations: 'Verification checklist',
    competitors: 'Competitors',
    complementaryPois: 'Complementary POIs',
    routeWarnings: 'Route Warnings',
    rawCounts: 'Raw evidence counts',
    missingEvidence: 'Missing evidence flagged by guardrail',
    scoreTooltips: {
      demandProxy: 'Demand proxy is computed from category density, semantic hits, ratings and review volume. It is not real footfall.',
      competitionPenalty: 'Competition index reflects direct competitor count inside the candidate area cluster.',
      complementary: 'Complementary POIs are nearby places that may support cross-visits for the concept.',
      accessibility: 'Accessibility is estimated from distance-to-center and available route/access signals.',
      conceptFit: 'Concept fit measures alignment between the business intent and POI/category evidence.',
      routeWarnings: 'Route warnings are heuristic risk flags that require field validation before commitment.',
    },
  },
};

type SellerCopy = (typeof sellerCopy)[keyof typeof sellerCopy];

const businessProfileCopy = {
  vi: {
    title: 'Quản lý địa điểm',
    subtitle: 'Theo dõi cửa hàng sở hữu, cập nhật thông tin và hình ảnh đại diện.',
    addTitle: 'Thêm địa điểm',
    name: 'Tên cửa hàng',
    category: 'Danh mục kinh doanh',
    address: 'Địa chỉ',
    imageUrl: 'URL hình ảnh',
    uploadLater: 'Upload file sẽ được bổ sung ở bước sau',
    save: 'Lưu địa điểm',
    ownedStores: 'Cửa hàng đang sở hữu',
    edit: 'Sửa',
    empty: 'Chưa có cửa hàng nào.',
    saved: 'Đã lưu thành công.',
    saveFailed: 'Không thể lưu địa điểm.',
  },
  en: {
    title: 'Business locations',
    subtitle: 'Track owned stores, update business details, and manage representative images.',
    addTitle: 'Add location',
    name: 'Store name',
    category: 'Business category',
    address: 'Address',
    imageUrl: 'Image URL',
    uploadLater: 'File upload will be added in the next step',
    save: 'Save location',
    ownedStores: 'Owned stores',
    edit: 'Edit',
    empty: 'No stores yet.',
    saved: 'Saved successfully.',
    saveFailed: 'Could not save the location.',
  },
};

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

function formatAreaTitle(area: any, index: number, copy: SellerCopy = sellerCopy.vi) {
  const poiCount = area.evidence?.rawCounts?.poiTotalInArea ?? area.samplePOIs?.length ?? 0;
  const competitors = area.signals?.directCompetitors ?? area.evidence?.rawCounts?.directCompetitorsInArea ?? 0;
  return `Khu vực khảo sát ${index + 1}: ${copy.has} ${poiCount} ${copy.poiAnd} ${competitors} ${copy.directCompetitors}.`;
}

function formatAreaSummary(area: any, copy: SellerCopy = sellerCopy.vi) {
  return [
    `${copy.demand} ${percent(area.signals?.demandProxy)}`,
    `${copy.conceptFit} ${percent(area.signals?.conceptFit)}`,
    `${copy.accessibility} ${percent(area.signals?.accessibility)}`,
    `${copy.competition} ${percent(area.signals?.competitionPenalty)}`,
  ].join(', ');
}

function buildMetricData(area: any, copy: SellerCopy = sellerCopy.vi) {
  return [
    { label: copy.demand, value: clampPercent(area.signals?.demandProxy) },
    { label: copy.competition, value: clampPercent(area.signals?.competitionPenalty) },
    { label: copy.accessibility, value: clampPercent(area.signals?.accessibility) },
    { label: copy.conceptFit, value: clampPercent(area.signals?.conceptFit) },
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
    lat: Number(area.lat),
    lon: Number(area.lon || area.lng),
    signals: area.signals || {},
    samplePOIs: area.samplePOIs || [],
    insight: area.llmInsight || null,
  };
}

export function PreferencesPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = customerRoleCopy[language];
  const hubCopy = preferenceHubCopy[language];
  const [preferences, setPreferences] = useState<PreferenceHubState>(defaultPreferenceHub);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/api/customer/profile')
      .then((data) => {
        const saved = data?.profile?.preferences;
        if (!saved) return;
        setPreferences((current) => ({
          ...current,
          persona: saved.persona || saved.personaBaseline || current.persona,
          sceneryVibes: saved.tasteProfile?.sceneryVibes || saved.sceneryVibes || current.sceneryVibes,
          activitiesPurposes: saved.tasteProfile?.activitiesPurposes || saved.activitiesPurposes || current.activitiesPurposes,
          companionContexts: saved.tasteProfile?.companionContexts || saved.companionContexts || current.companionContexts,
          avoid: saved.negativeFilters || saved.dislikedTags || current.avoid,
          priceMin: Number(saved.expectedPriceVnd?.min || current.priceMin),
          priceMax: Number(saved.expectedPriceVnd?.max || current.priceMax),
        }));
      })
      .catch(() => {});
  }, [user]);

  const toggleArrayValue = (key: PreferenceSectionKey | 'avoid', value: string) => {
    setMessage('');
    setPreferences((current) => {
      const values = current[key];
      return {
        ...current,
        [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  };

  const updatePrice = (key: 'priceMin' | 'priceMax', value: number) => {
    setMessage('');
    setPreferences((current) => {
      if (key === 'priceMin') return { ...current, priceMin: Math.min(value, current.priceMax - 10000) };
      return { ...current, priceMax: Math.max(value, current.priceMin + 10000) };
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/api/customer/profile', {
        preferences: buildPreferencePayload(preferences, language),
        defaultLocation: { lat: 16.0544, lng: 108.2022, label: 'Đà Nẵng' },
      });
      setMessage(copy.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const selectedSignals = [
    ...preferences.sceneryVibes,
    ...preferences.activitiesPurposes,
    ...preferences.companionContexts,
  ];
  const userInitial = (user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <Page title={copy.preferenceTitle} subtitle={hubCopy.subtitle}>
      {!user && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {hubCopy.signInHint}
        </p>
      )}

      <div className="mb-6 rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-2xl font-black text-cyan-800">
              {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full rounded-2xl object-cover" /> : userInitial}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">{hubCopy.account}</p>
              <h2 className="text-2xl font-black text-slate-950">{user?.displayName || user?.email || 'Urban Explorer'}</h2>
              <p className="text-sm text-slate-500">{user?.email || 'guest@danang-urbanagent.local'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{hubCopy.personaLabel}</p>
            <p className="text-lg font-bold text-slate-950">{optionLabel(preferences.persona, language)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <Sparkles className="mt-1 text-cyan-600" size={20} />
              <div>
                <h2 className="text-lg font-bold text-slate-950">{hubCopy.persona}</h2>
                <p className="text-sm text-slate-500">{hubCopy.personaHint}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {personaOptions.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => {
                    setMessage('');
                    setPreferences((current) => ({ ...current, persona: persona.id }));
                  }}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    preferences.persona === persona.id
                      ? 'border-cyan-400 bg-cyan-50 shadow-md shadow-cyan-100'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-bold text-slate-950">{persona[language]}</span>
                    {preferences.persona === persona.id && <CheckCircle2 className="text-cyan-600" size={18} />}
                  </div>
                  <p className="text-sm leading-5 text-slate-600">{language === 'vi' ? persona.detailVi : persona.detailEn}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <Heart className="mt-1 text-rose-500" size={20} />
              <div>
                <h2 className="text-lg font-bold text-slate-950">{hubCopy.tasteTitle}</h2>
                <p className="text-sm text-slate-500">{copy.preferenceSubtitle}</p>
              </div>
            </div>
            <div className="space-y-5">
              {tasteSections.map((section) => {
                const Icon = section.icon;
                const key = section.id as PreferenceSectionKey;
                return (
                  <div key={section.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Icon size={18} className="text-cyan-700" />
                      <h3 className="font-bold text-slate-950">{section[language]}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {section.values.map((option) => (
                        <PreferenceChip
                          key={option.id}
                          label={option[language]}
                          selected={preferences[key].includes(option.id)}
                          onClick={() => toggleArrayValue(key, option.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-950">{hubCopy.budgetTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{hubCopy.budgetHint}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-600">{hubCopy.priceRange}</span>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-800">
                    {formatVnd(preferences.priceMin)} - {formatVnd(preferences.priceMax)}
                  </span>
                </div>
                <label className="mb-4 block text-sm font-semibold text-slate-700">
                  Min
                  <input
                    type="range"
                    min={10000}
                    max={500000}
                    step={10000}
                    value={preferences.priceMin}
                    onChange={(event) => updatePrice('priceMin', Number(event.target.value))}
                    className="mt-2 w-full accent-cyan-600"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Max
                  <input
                    type="range"
                    min={20000}
                    max={700000}
                    step={10000}
                    value={preferences.priceMax}
                    onChange={(event) => updatePrice('priceMax', Number(event.target.value))}
                    className="mt-2 w-full accent-purple-600"
                  />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={preferences.priceMin}
                    onChange={(event) => updatePrice('priceMin', Number(event.target.value))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-400"
                  />
                  <input
                    type="number"
                    value={preferences.priceMax}
                    onChange={(event) => updatePrice('priceMax', Number(event.target.value))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <ThumbsDown className="mt-1 text-rose-600" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{hubCopy.avoidTitle}</h2>
                  <p className="text-sm text-rose-900/70">{hubCopy.avoidHint}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {avoidOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleArrayValue('avoid', option.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      preferences.avoid.includes(option.id)
                        ? 'border-rose-400 bg-white text-rose-700 shadow-sm'
                        : 'border-rose-100 bg-white/60 text-slate-600 hover:border-rose-300'
                    }`}
                  >
                    {option[language]}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70 xl:sticky xl:top-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">{hubCopy.dynamicTaste}</h2>
              <p className="text-sm text-slate-500">{hubCopy.signature}</p>
            </div>
          </div>

          <SummaryRow label={hubCopy.personaLabel} value={optionLabel(preferences.persona, language)} />
          <SummaryRow label={hubCopy.priceRange} value={`${formatVnd(preferences.priceMin)} - ${formatVnd(preferences.priceMax)}`} />
          <SummaryRow label={hubCopy.selectedSignals} value={`${selectedSignals.length}`} />
          <SummaryRow label={hubCopy.constraints} value={`${preferences.avoid.length}`} />

          <div className="mt-5 space-y-3">
            <TasteSummaryBlock title={hubCopy.selectedSignals} values={selectedSignals} language={language} />
            <TasteSummaryBlock title={hubCopy.constraints} values={preferences.avoid} language={language} tone="danger" />
          </div>

          <button
            onClick={savePreferences}
            disabled={saving}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {copy.savePreferences}
          </button>
          {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}

        </aside>
      </div>
    </Page>
  );
}

function PreferenceChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
        selected
          ? 'border-cyan-500 bg-cyan-600 text-white shadow-md shadow-cyan-100'
          : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-slate-950'
      }`}
    >
      {label}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-bold text-slate-950">{value}</span>
    </div>
  );
}

function TasteSummaryBlock({
  title,
  values,
  language,
  tone = 'default',
}: {
  title: string;
  values: string[];
  language: Language;
  tone?: 'default' | 'danger';
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((value) => (
            <span
              key={value}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tone === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-cyan-100 text-cyan-800'
              }`}
            >
              {optionLabel(value, language)}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">--</span>
        )}
      </div>
    </div>
  );
}

export function FeedbackPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = customerRoleCopy[language];
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
              title: poi.title || poi.name || `${copy.stop} ${stop.order || ''}`.trim(),
              category: poi.category || copy.place,
              district: poi.district || copy.danang,
              order: stop.order,
              reason: stop.reason,
              itineraryId: itinerary.itineraryId,
              itineraryQuery: itinerary.query || copy.savedItinerary,
              updatedAt: itinerary.updatedAt,
            };
          }),
        );
        const deduped = items.filter(
          (item: any, index: number, all: any[]) => item.poiId && all.findIndex((candidate) => candidate.poiId === item.poiId) === index,
        );
        setFeedbackItems(deduped);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : copy.loadFailed))
      .finally(() => setLoading(false));
  }, [copy.danang, copy.loadFailed, copy.place, copy.savedItinerary, copy.stop, user]);

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
      setMessage(eventType === 'poi_useful' ? copy.feedbackUseful : copy.feedbackNotFit);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.feedbackFailed);
    } finally {
      setSavingPoiId('');
    }
  };

  const positiveCount = Object.values(feedbackByPoi).filter((value) => value === 'poi_useful').length;
  const negativeCount = Object.values(feedbackByPoi).filter((value) => value === 'poi_not_fit').length;

  return (
    <Page title={copy.feedbackTitle} subtitle={copy.feedbackSubtitle}>
      {!user && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {copy.signInFeedback}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
          {message}
        </p>
      )}

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">{copy.feedbackHeroTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.feedbackHeroBody}</p>
            </div>
          </div>
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-cyan-300" />
            <h2 className="font-bold">{copy.learningMode}</h2>
          </div>
          <p className="text-sm leading-6 text-slate-300">{copy.learningModeBody}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-400/10 p-3">
              <div className="text-2xl font-black text-emerald-200">{positiveCount}</div>
              <div className="text-xs text-emerald-100">{copy.positiveSignals}</div>
            </div>
            <div className="rounded-xl bg-amber-400/10 p-3">
              <div className="text-2xl font-black text-amber-200">{negativeCount}</div>
              <div className="text-xs text-amber-100">{copy.negativeSignals}</div>
            </div>
          </div>
        </aside>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">{copy.loadingSaved}</p>}
        {!loading && user && feedbackItems.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            {copy.noFeedbackItems}
          </p>
        )}
        {feedbackItems.map((item) => (
          <article key={item.poiId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.category} · {item.district}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.itineraryQuery}</p>
                {item.reason && <p className="mt-2 text-sm leading-6 text-slate-500">{item.reason}</p>}
              </div>
              <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">
                <MapPinned size={20} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{copy.learningMode}</span>
              {feedbackByPoi[item.poiId] && (
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                  {feedbackByPoi[item.poiId] === 'poi_useful' ? copy.positiveSignals : copy.negativeSignals}
                </span>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <IconButton
                label={copy.useful}
                tone="green"
                icon={savingPoiId === item.poiId ? <Loader2 className="animate-spin" size={18} /> : <ThumbsUp size={18} />}
                active={feedbackByPoi[item.poiId] === 'poi_useful'}
                disabled={savingPoiId === item.poiId}
                onClick={() => sendFeedback(item, 'poi_useful')}
              />
              <IconButton
                label={copy.notFit}
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
  const { language } = useLanguage();
  const copy = sellerCopy[language];
  const [concept, setConcept] = useState(copy.conceptSample);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'suggestions' | 'analytics'>('suggestions');
  const [savedConcepts, setSavedConcepts] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');

  useEffect(() => {
    apiClient
      .get('/api/seller/concepts')
      .then((data) => setSavedConcepts(data?.concepts || []))
      .catch(() => setSavedConcepts([]));
  }, []);

  useEffect(() => {
    setConcept(copy.conceptSample);
  }, [copy.conceptSample]);

  const areas = Array.isArray(analysis?.areas) ? analysis.areas : [];
  const bestArea = areas[0];
  const metricData = bestArea ? buildMetricData(bestArea, copy) : [];
  const districtData = buildDistrictData(areas);

  const runAnalysis = async () => {
    if (!concept.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await apiClient.post('/api/agent/business-insight', { concept, limit: 5, language });
      setAnalysis(data);
      setActiveTab('suggestions');
      setSelectedAreaId(data?.areas?.[0]?.id || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.analyzeFailed);
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
      setMessage(copy.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed);
    }
  };

  const openSavedConcept = (item: any) => {
    setConcept(item.query || item.concept || '');
    setAnalysis(item.analysis || { areas: item.suggestions || [] });
    setActiveTab('suggestions');
    setSelectedAreaId((item.analysis?.areas || item.suggestions || [])[0]?.id || '');
    setMessage(copy.opened);
  };
  const selectedArea = areas.find((area: any) => area.id === selectedAreaId) || areas[0] || null;

  return (
    <Page title={copy.title} subtitle={copy.subtitle}>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">{copy.conceptLabel}</span>
            <textarea
              value={concept}
              onChange={(event) => {
                setConcept(event.target.value);
                setMessage('');
              }}
              className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500"
              placeholder={copy.conceptPlaceholder}
            />
          </label>
          <div className="flex flex-col gap-2 self-end">
            <button
              onClick={runAnalysis}
              disabled={loading || !concept.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {copy.analyze}
            </button>
            <button
              onClick={saveConcept}
              disabled={!concept.trim() || areas.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
              {copy.saveConcept}
            </button>
          </div>
        </div>
        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
      </section>

      {analysis?.parsedConstraints && (
        <ParsedConstraintsCard constraints={analysis.parsedConstraints} copy={copy} />
      )}

      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'suggestions' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {copy.suggestionsTab}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'analytics' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {copy.analyticsTab}
        </button>
      </div>

      {activeTab === 'suggestions' && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">{copy.suggestedAreas}</h2>
            {areas.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{copy.runToSee}</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {areas.map((area: any, index: number) => (
                  <SuggestionCard
                    key={area.id || index}
                    area={area}
                    index={index}
                    copy={copy}
                    selected={selectedArea?.id === area.id}
                    onSelect={() => setSelectedAreaId(area.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {savedConcepts.length > 0 && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">{copy.savedConcepts}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {savedConcepts.map((item) => (
                  <button
                    key={item.conceptId || item.id || item.query}
                    onClick={() => openSavedConcept(item)}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    <p className="font-semibold text-slate-950">{item.query || item.concept}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.suggestions?.length || 0} {copy.savedAreaCount}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          {selectedArea ? (
            <BusinessDecisionReport area={selectedArea} areas={areas} copy={copy} />
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{copy.noAnalysis}</p>
            </section>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">{copy.heatmapTitle}</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{copy.danang}</span>
              </div>
              <div className="h-[460px] overflow-hidden rounded-xl border border-slate-200">
                <MapContainer center={[16.0544, 108.2022]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {areas.map((area: any, index: number) => {
                    const signal = clampPercent(area.signals?.demandProxy);
                    const lat = Number(area.lat);
                    const lon = Number(area.lon || area.lng);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                    return (
                      <Circle
                        key={area.id || index}
                        center={[lat, lon]}
                        radius={500}
                        pathOptions={{ color: '#0891b2', fillColor: '#0891b2', fillOpacity: Math.max(0.18, Math.min(0.5, signal / 180)) }}
                      >
                        <Popup>
                          <strong>Khu vực khảo sát {index + 1}</strong>
                          <br />
                          {copy.demand} {percent(area.signals?.demandProxy)} · {copy.competition} {percent(area.signals?.competitionPenalty)}
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
              <h2 className="mb-4 text-lg font-bold text-slate-950">{copy.bestMetrics}</h2>
              {metricData.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{copy.noAnalysis}</p>
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
            <h2 className="mb-4 text-lg font-bold text-slate-950">{copy.demandCompetition}</h2>
            {districtData.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{copy.noAnalysis}</p>
            ) : (
              <div className="h-80 min-w-0">
                <ResponsiveContainer width="100%" height={320} minWidth={240}>
                  <BarChart data={districtData}>
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="demand" name={copy.demand} fill="#0891b2" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="competition" name={copy.competition} fill="#f97316" radius={[6, 6, 0, 0]} />
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

function ParsedConstraintsCard({ constraints, copy }: { constraints: any; copy: SellerCopy }) {
  const chips = [
    { label: copy.businessType, values: [constraints.businessType] },
    { label: copy.targetCustomers, values: constraints.targetCustomers || [] },
    { label: copy.budgetLevel, values: [constraints.budgetLevel] },
    { label: copy.priorities, values: constraints.priorities || [] },
  ];

  return (
    <section className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-800 ring-1 ring-cyan-200">
            <BrainCircuit size={14} />
            {copy.stage} 1-2
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-950">{copy.parsedConstraints}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.parserNote}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          {constraints.parser?.hallucinationRisk || 'low'} risk
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {chips.map((group) => (
          <div key={group.label} className="rounded-xl border border-cyan-100 bg-white p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</div>
            <div className="flex flex-wrap gap-2">
              {group.values.filter(Boolean).map((value: string) => (
                <span key={value} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                  {value}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info size={14} className="text-slate-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-xs leading-5 text-white shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
}

function SignalBar({ label, value, tooltip, inverse = false }: { label: string; value: number; tooltip: string; inverse?: boolean }) {
  const pctValue = clampPercent(value);
  const tone = inverse
    ? pctValue > 65 ? 'bg-red-500' : pctValue > 35 ? 'bg-amber-500' : 'bg-emerald-500'
    : pctValue > 65 ? 'bg-emerald-500' : pctValue > 35 ? 'bg-cyan-500' : 'bg-amber-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
          {label}
          <MetricTooltip text={tooltip} />
        </span>
        <span className="font-bold text-slate-950">{pctValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pctValue}%` }} />
      </div>
    </div>
  );
}

function EvaluationSignalsPanel({ area, copy }: { area: any; copy: SellerCopy }) {
  const signals = area.signals || {};
  return (
    <div className="mt-4 grid gap-3">
      <SignalBar label={copy.demand} value={signals.demandProxy} tooltip={copy.scoreTooltips.demandProxy} />
      <SignalBar label={copy.competition} value={signals.competitionPenalty} tooltip={copy.scoreTooltips.competitionPenalty} inverse />
      <SignalBar label={copy.complementaryPois} value={signals.complementary} tooltip={copy.scoreTooltips.complementary} />
      <SignalBar label={copy.accessibility} value={signals.accessibility} tooltip={copy.scoreTooltips.accessibility} />
      <SignalBar label={copy.conceptFit} value={signals.conceptFit} tooltip={copy.scoreTooltips.conceptFit} />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} />
          {copy.routeWarnings}
          <MetricTooltip text={copy.scoreTooltips.routeWarnings} />
        </div>
        {(area.evidence?.routeWarnings || []).length
          ? area.evidence.routeWarnings.map((item: any) => <p key={item.evidenceId}>{item.warning}</p>)
          : <p>{copy.noAnalysis}</p>}
      </div>
    </div>
  );
}

function SuggestionCard({
  area,
  index,
  copy,
  selected,
  onSelect,
}: {
  area: any;
  index: number;
  copy: SellerCopy;
  selected: boolean;
  onSelect: () => void;
}) {
  const topPois = Array.isArray(area.samplePOIs) ? area.samplePOIs.slice(0, 3) : [];
  return (
    <article
      className={`rounded-xl border bg-white p-4 transition ${selected ? 'border-cyan-400 shadow-lg shadow-cyan-100' : 'border-slate-200 hover:border-cyan-300'}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
            <RadarIcon size={13} />
            {copy.stage} 3
          </div>
          <h3 className="font-bold text-slate-950">{formatAreaTitle(area, index, copy)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{area.llmInsight?.summary || formatAreaSummary(area, copy)}</p>
          {topPois.length > 0 && (
            <p className="mt-3 text-xs font-medium text-slate-500">
              {copy.referencePoi}: {topPois.map((poi: any) => poi.name).filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-800">#{index + 1}</span>
      </div>
      <EvaluationSignalsPanel area={area} copy={copy} />
    </article>
  );
}

function EvidenceTable({ area, copy }: { area: any; copy: SellerCopy }) {
  const rows = [
    { label: 'Total POIs', value: area.evidence?.rawCounts?.poiTotalInArea ?? area.totalPOIs ?? 0 },
    { label: copy.competitors, value: area.evidence?.rawCounts?.directCompetitorsInArea ?? area.signals?.directCompetitors ?? 0 },
    { label: 'Semantic hits', value: area.evidence?.rawCounts?.semanticHitsInArea ?? area.signals?.semanticHits ?? 0 },
    { label: copy.complementaryPois, value: area.evidence?.rawCounts?.complementaryCandidates ?? area.evidence?.complementaryPOIs?.length ?? 0 },
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-950">
        <Building2 size={18} />
        {copy.evidenceTable}
      </h3>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
                <td className="bg-slate-50 px-3 py-3 font-semibold text-slate-600">{row.label}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-950">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvidencePackPanel({ area, copy }: { area: any; copy: SellerCopy }) {
  const insight = area.llmInsight;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BrainCircuit className="text-cyan-700" />
        <div>
          <h2 className="text-lg font-bold text-slate-950">{copy.evidencePack}</h2>
          <p className="text-sm text-slate-500">{copy.stage} 4-5 · math first, evidence-only interpretation</p>
        </div>
      </div>
      <div className="rounded-2xl bg-slate-950 p-4 text-slate-100">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-200">
          <Sparkles size={16} />
          {copy.aiInterpretation}
        </div>
        <p className="text-sm leading-6">{insight?.summary || area.reason}</p>
        {insight?.area_potential && <p className="mt-3 text-sm leading-6 text-slate-300">{insight.area_potential}</p>}
        {insight?.complementary_poi_analysis && <p className="mt-3 text-sm leading-6 text-slate-300">{insight.complementary_poi_analysis}</p>}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <EvidenceList title={copy.competitors} items={area.evidence?.competitors || []} />
        <EvidenceList title={copy.complementaryPois} items={area.evidence?.complementaryPOIs || []} />
      </div>
      {!!insight?.missing_evidence?.length && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 font-semibold text-amber-900">{copy.missingEvidence}</div>
          <div className="flex flex-wrap gap-2">
            {insight.missing_evidence.map((item: string) => (
              <span key={item} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-800">{item}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function EvidenceList({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 font-semibold text-slate-900">{title}</div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.evidenceId || item.poiId || item.name} className="rounded-lg bg-white p-2 text-sm">
            <div className="font-semibold text-slate-900">{item.name || item.category || item.warning}</div>
            <div className="text-xs text-slate-500">{item.category || item.evidenceId} {item.distanceKm !== undefined ? `· ${item.distanceKm} km` : ''}</div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-slate-500">--</p>}
      </div>
    </div>
  );
}

function ActionRecommendations({ area, copy }: { area: any; copy: SellerCopy }) {
  const actions = area.llmInsight?.verification_checklist || area.llmInsight?.recommended_actions || [];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-950">
        <ListChecks size={18} />
        {copy.actionRecommendations}
      </h3>
      <div className="space-y-2">
        {actions.map((action: string) => (
          <label key={action} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" />
            <span>{action}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function BusinessDecisionReport({ area, areas, copy }: { area: any; areas: any[]; copy: SellerCopy }) {
  return (
    <section className="rounded-xl border border-cyan-200 bg-cyan-50/30 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-800 ring-1 ring-cyan-200">
            <TrendingUp size={14} />
            {copy.stage} 6
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950">{copy.architecture}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700">Area {area.id}</span>
      </div>
      <EvidencePackPanel area={area} copy={copy} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <EvidenceTable area={area} copy={copy} />
        <ActionRecommendations area={area} copy={copy} />
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {copy.rawCounts}: {areas.length} candidate areas reviewed. {area.guardrail?.passed ? 'Guardrail passed.' : 'Guardrail needs review.'}
      </div>
    </section>
  );
}

export function BusinessProfilePage() {
  const { language } = useLanguage();
  const copy = businessProfileCopy[language];
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
      setMessage(copy.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title={copy.title} subtitle={copy.subtitle}>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">{copy.addTitle}</h2>
          <div className="space-y-3">
            <Field placeholder={copy.name} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field placeholder={copy.category} value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
            <Field placeholder={copy.address} value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
            <Field placeholder={copy.imageUrl} value={form.imageUrl} onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} />
            <div className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
              <UploadCloud className="mb-2" />
              {copy.uploadLater}
            </div>
            <button
              onClick={saveBusiness}
              disabled={saving || !form.name || !form.category || !form.address}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              {copy.save}
            </button>
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">{copy.ownedStores}</h2>
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
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">{copy.edit}</button>
              </div>
            ))}
            {stores.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{copy.empty}</p>}
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

