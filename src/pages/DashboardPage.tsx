import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Store, Map as MapIcon, Tags, Star, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { apiClient } from '../utils/apiClient';

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DashboardPage() {
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

  const metrics = [
    { title: 'Tổng số Địa điểm', value: data.metrics.totalPOIs.toLocaleString(), icon: <Store className="text-blue-400" size={24} />, color: 'from-blue-500/20 to-blue-900/20' },
    { title: 'Số lượng Quận/Huyện', value: data.metrics.numDistricts.toString(), icon: <MapIcon className="text-emerald-400" size={24} />, color: 'from-emerald-500/20 to-emerald-900/20' },
    { title: 'Số lượng Danh mục', value: data.metrics.numCategories.toString(), icon: <Tags className="text-purple-400" size={24} />, color: 'from-purple-500/20 to-purple-900/20' },
    { title: 'Điểm đánh giá TB', value: `${data.metrics.avgRating} / 10`, icon: <Star className="text-amber-400" size={24} />, color: 'from-amber-500/20 to-amber-900/20' },
  ];

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Thông tin POI (EDA)</h1>
          <p className="text-gray-400">Khám phá và phân tích không gian đô thị Đà Nẵng</p>
        </div>
        <div className="flex flex-col">
          <label className="text-gray-400 text-sm mb-1">Nguồn dữ liệu</label>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className={`p-6 rounded-2xl bg-gradient-to-br ${metric.color} border border-white/5 backdrop-blur-md shadow-xl transition-all duration-300 relative overflow-hidden`}>
            {loading && <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center"><Loader2 className="animate-spin text-white/50" /></div>}
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-gray-900/50 border border-white/10">
                {metric.icon}
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{metric.title}</h3>
            <p className="text-3xl font-bold text-white tracking-tight">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        {/* Map Section */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 shadow-xl relative z-0">
          {loading && <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-[999] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}
          <MapContainer 
            center={[16.0544, 108.2022]} 
            zoom={12} 
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {!loading && data.sampleData.slice(0, 50).map((poi: any, idx) => (
              poi.lat && poi.lng && (
                <Marker key={idx} position={[poi.lat, poi.lng]}>
                  <Popup>
                    <strong>{poi.name}</strong><br/>
                    {poi.category}<br/>
                    Đánh giá: {poi.rating || 'N/A'}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Data Table Placeholder */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-md p-6 shadow-xl flex flex-col relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}
          <h3 className="text-xl font-bold text-white mb-4">Dữ liệu nổi bật</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {data.sampleData.length === 0 && !loading && (
              <p className="text-gray-500 text-center mt-10">Không có dữ liệu</p>
            )}
            {data.sampleData.map((poi: any, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 transition-colors cursor-pointer">
                <div className="flex justify-between mb-1">
                  <h4 className="font-semibold text-gray-200 truncate pr-2" title={poi.name}>{poi.name}</h4>
                  <span className="text-amber-400 text-sm flex items-center shrink-0">
                    <Star size={12} className="mr-1 inline" /> {poi.rating || 'N/A'}
                  </span>
                </div>
                <div className="text-sm text-gray-400 flex justify-between items-center">
                  <span className="truncate pr-2">{poi.address || 'Đà Nẵng'}</span>
                  {poi.category && (
                    <span className="text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                      {poi.category.split(',')[0]}
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
