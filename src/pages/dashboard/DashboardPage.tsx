import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Store, Map as MapIcon, Tags, Star, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { apiClient } from '../../utils/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/useAuth';
import { PoiExperienceLayer } from '../urban-agent/PoiExperienceLayer';

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DashboardPage() {
  const { language } = useLanguage();
  const { user, firebaseReady } = useAuth();
  const [source, setSource] = useState('ggmap');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: { totalPOIs: 0, numDistricts: 0, numCategories: 0, avgRating: 0 },
    sampleData: []
  });

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/api/eda?source=${source}`)
      .then(result => {
        if (result && result.metrics) {
          setData(result);
        }
      })
      .catch(err => console.error('Failed to fetch EDA data:', err))
      .finally(() => setLoading(false));
  }, [source]);

  const copy = language === 'vi'
    ? {
        title: 'Khám phá địa điểm',
        subtitle: 'Tìm quán, địa chỉ và xem đường đi tại Đà Nẵng.',
        source: 'Bộ sưu tập',
        total: 'Tổng số địa điểm',
        districts: 'Số lượng quận/huyện',
        categories: 'Số lượng danh mục',
        avgRating: 'Điểm đánh giá TB',
        featured: 'Địa điểm nổi bật',
        empty: 'Không có dữ liệu',
        rating: 'Đánh giá',
        fallbackAddress: 'Đà Nẵng',
        poiSearchTitle: 'Tìm kiếm địa điểm',
        poiSearchSubtitle: 'Tìm quán, địa danh hoặc địa chỉ; sau đó xem đường đi từ vị trí hiện tại.',
      }
    : {
        title: 'Explore places',
        subtitle: 'Find venues, addresses, and directions in Da Nang.',
        source: 'Collection',
        total: 'Total places',
        districts: 'Districts',
        categories: 'Categories',
        avgRating: 'Average rating',
        featured: 'Featured places',
        empty: 'No data',
        rating: 'Rating',
        fallbackAddress: 'Danang',
        poiSearchTitle: 'Search places',
        poiSearchSubtitle: 'Find a venue, landmark, or address and get directions from your current location.',
      };

  const metrics = [
    {
      title: copy.total,
      value: data.metrics.totalPOIs.toLocaleString(),
      icon: <Store className="text-blue-700" size={24} />,
      color: 'from-blue-50 to-blue-100/80 border-blue-200',
      iconWrap: 'bg-blue-100 border-blue-200',
    },
    {
      title: copy.districts,
      value: data.metrics.numDistricts.toString(),
      icon: <MapIcon className="text-emerald-700" size={24} />,
      color: 'from-emerald-50 to-emerald-100/80 border-emerald-200',
      iconWrap: 'bg-emerald-100 border-emerald-200',
    },
    {
      title: copy.categories,
      value: data.metrics.numCategories.toString(),
      icon: <Tags className="text-purple-700" size={24} />,
      color: 'from-purple-50 to-purple-100/80 border-purple-200',
      iconWrap: 'bg-purple-100 border-purple-200',
    },
    {
      title: copy.avgRating,
      value: `${data.metrics.avgRating} / ${source === 'ggmap' ? 5 : 10}`,
      icon: <Star className="text-amber-700" size={24} />,
      color: 'from-amber-50 to-amber-100/80 border-amber-200',
      iconWrap: 'bg-amber-100 border-amber-200',
    },
  ];

  const featuredPois = (data.sampleData as any[])
    .filter((poi) => poi?.lat && poi?.lng)
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
    .slice(0, 10);

  const searchableFeaturedPois = featuredPois.map((poi: any, index) => ({
    id: poi.id || `featured-${index}`,
    poiId: poi.id || `featured-${index}`,
    name: fixText(poi.name) || `${language === 'vi' ? 'Địa điểm' : 'Place'} ${index + 1}`,
    title: fixText(poi.name) || `${language === 'vi' ? 'Địa điểm' : 'Place'} ${index + 1}`,
    category: fixText(poi.category),
    address: fixText(poi.address),
    district: fixText(poi.address) || copy.fallbackAddress,
    lat: Number(poi.lat),
    lon: Number(poi.lng),
    rating: Number(poi.rating || 0),
  }));

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 mb-2">{copy.title}</h1>
          <p className="text-slate-600">{copy.subtitle}</p>
        </div>
        <div className="flex flex-col">
          <label className="text-slate-600 text-sm mb-1">{copy.source}</label>
          <select 
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="ggmap">Google Maps</option>
            <option value="foody">Foody</option>
          </select>
        </div>
      </div>

      <PoiExperienceLayer
        user={user}
        firebaseReady={firebaseReady}
        itineraryPois={[]}
        extraPois={searchableFeaturedPois}
        title={copy.poiSearchTitle}
        subtitle={copy.poiSearchSubtitle}
        language={language}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className={`p-6 rounded-2xl bg-gradient-to-br ${metric.color} shadow-lg shadow-slate-200/70 transition-all duration-300 relative overflow-hidden`}>
            {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>}
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border ${metric.iconWrap}`}>
                {metric.icon}
              </div>
            </div>
            <h3 className="text-slate-600 text-sm font-semibold mb-1">{metric.title}</h3>
            <p className="text-3xl font-bold text-slate-950 tracking-tight">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[520px]">
        {/* Map Section */}
        <div className="lg:col-span-2 h-[520px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-200/70 relative z-0">
          {loading && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-[999] flex items-center justify-center"><Loader2 className="animate-spin text-cyan-600 w-8 h-8" /></div>}
          <MapContainer 
            center={[16.0544, 108.2022]} 
            zoom={12} 
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <MapResizeHandler trigger={`${source}-${loading}-${featuredPois.length}`} />
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!loading && featuredPois.map((poi: any, idx) => (
              poi.lat && poi.lng && (
                <Marker key={idx} position={[poi.lat, poi.lng]}>
                  <Popup>
                    <strong>{fixText(poi.name)}</strong><br/>
                    {fixText(poi.category)}<br/>
                    {copy.rating}: {poi.rating || 'N/A'}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Data Table Placeholder */}
        <div className="h-[520px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 flex flex-col relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-600 w-8 h-8" /></div>}
          <h3 className="text-xl font-bold text-slate-950 mb-4">{copy.featured}</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {data.sampleData.length === 0 && !loading && (
              <p className="text-slate-500 text-center mt-10">{copy.empty}</p>
            )}
            {featuredPois.map((poi: any, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors cursor-pointer">
                <div className="flex justify-between mb-1">
                  <h4 className="font-semibold text-slate-900 truncate pr-2" title={fixText(poi.name)}>{fixText(poi.name)}</h4>
                  <span className="text-amber-500 text-sm flex items-center shrink-0">
                    <Star size={12} className="mr-1 inline" /> {poi.rating || 'N/A'}
                  </span>
                </div>
                <div className="text-sm text-slate-500 flex justify-between items-center">
                  <span className="truncate pr-2">{fixText(poi.address) || copy.fallbackAddress}</span>
                  {poi.category && (
                    <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                      {fixText(poi.category).split(',')[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapResizeHandler({ trigger }: { trigger: string }) {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const timer = window.setTimeout(() => map.invalidateSize(), 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [map, trigger]);

  return null;
}

function fixText(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}
