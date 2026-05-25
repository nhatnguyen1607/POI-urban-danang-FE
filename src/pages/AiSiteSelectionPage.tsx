import { useEffect, useState } from 'react';
import type { WheelEvent } from 'react';
import { UploadCloud, Search, MapPin, Sparkles, Loader2, Layers, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Route, Clock, Ruler, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiClient } from '../utils/apiClient';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

function MapInstanceHandler({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

interface RouteResult {
  route: any;
  distance: number;
  duration: number;
  steps: any[];
  esValidation: {
    valid: boolean;
    warnings: any[];
    ruleTrace: any[];
    fuzzyInsights?: any[];
    totalRulesChecked: number;
  };
}

export default function AiSiteSelectionPage() {
  const [concept, setConcept] = useState('Quán nhậu vỉa hè, hải sản tươi sống, không gian mở, ồn ào náo nhiệt, giá bình dân');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [modelVersion, setModelVersion] = useState('v4');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Route & ES state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mainMap, setMainMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 16.0544, lng: 108.2022 }),
        { enableHighAccuracy: true }
      );
    } else {
      setUserLocation({ lat: 16.0544, lng: 108.2022 });
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setImageFile(file);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const formData = new FormData();
      formData.append('concept', concept);
      formData.append('modelVersion', modelVersion);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const data = await apiClient.post('/api/recommend', formData);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối tới máy chủ AI');
    } finally {
      setLoading(false);
    }
  };


  const handleGetRoute = async (poi: any) => {
    if (!userLocation) return;
    setSelectedPOI(poi);
    setModalOpen(true);
    setRouteLoading(true);
    setRouteError(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setShowSteps(false);
    setShowTrace(false);
    try {
      const res: any = await apiClient.post('/api/route', {
        origin: { lat: userLocation.lat, lng: userLocation.lng },
        destination: { lat: poi.lat, lng: poi.lon },
      });
      const dataRoutes = res.routes || [];
      setRoutes(dataRoutes);
      setSelectedRouteIndex(0);
      if (dataRoutes.length > 0) {
        const coords: [number, number][] = dataRoutes[0].route.coordinates.map((c: number[]) => [c[1], c[0]]);
        setMapBounds(L.latLngBounds(coords));
      }
    } catch (err: any) {
      setRouteError(err.message);
    } finally {
      setRouteLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setRoutes([]);
    setSelectedPOI(null);
    setRouteError(null);
  };

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatDuration = (s: number) => {
    const mins = Math.round(s / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60} phút` : `${mins} phút`;
  };

  const routeData = routes.length > 0 ? routes[selectedRouteIndex] : null;

  const handleMainMapWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!mainMap) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      mainMap.zoomIn();
      return;
    }
    if (e.deltaY > 0) {
      mainMap.zoomOut();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Sparkles className="text-purple-400 mr-2" /> Trợ lý AI Gợi ý Địa điểm
          </h1>
          <p className="text-gray-400">
            Sử dụng Mô hình Ngôn ngữ & Thị giác để phân tích ý tưởng (Ảnh + Chữ) và gợi ý những khu vực phù hợp nhất tại Đà Nẵng.
          </p>
        </div>
        <div className="flex flex-col">
          <label className="text-gray-400 text-sm mb-1 flex items-center"><Layers size={14} className="mr-1"/> Phiên bản Model</label>
          <select 
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-purple-500 transition-colors font-medium"
            value={modelVersion}
            onChange={(e) => setModelVersion(e.target.value)}
          >
            <option value="v4">Version 4 (Latest - Recommended)</option>
            <option value="v3">Version 3</option>
            <option value="v2">Version 2</option>
            <option value="v1">Version 1</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl h-[280px] flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-2">📝 Nhập ý tưởng quán bạn muốn mở</label>
            <textarea
              className="w-full flex-1 bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
              rows={4}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ví dụ: Quán cafe lãng mạn, yên tĩnh..."
            />
          </div>

          {error && (
             <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
               {error}
             </div>
          )}

          {results && results.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative z-0 min-h-[520px] h-[520px] animate-in slide-in-from-bottom-8 duration-700"
              style={{ overscrollBehavior: 'contain' }}
              onWheel={handleMainMapWheel}
            >
              <MapContainer 
                center={[results[0]?.lat || 16.0544, results[0]?.lon || 108.2022]} 
                zoom={13} 
                scrollWheelZoom={false}
                wheelDebounceTime={60}
                wheelPxPerZoomLevel={60}
                style={{ height: '100%', width: '100%', minHeight: '520px' }}
              >
                <MapInstanceHandler onReady={setMainMap} />
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {results.map((r: any, idx: number) => (
                  <div key={r.id}>
                    <Marker position={[r.lat, r.lon]} eventHandlers={{ click: () => handleGetRoute(r) }}>
                      <Popup>
                        <strong>Top {idx + 1}: {r.name}</strong><br/>
                        Độ phù hợp: {r.score.toFixed(1)}%<br/>
                        Quận: {r.district}
                      </Popup>
                    </Marker>
                    <Circle 
                      center={[r.lat, r.lon]} 
                      radius={500} 
                      pathOptions={{ color: 'crimson', fillColor: 'crimson', fillOpacity: 0.2 }} 
                    />
                  </div>
                ))}
              </MapContainer>
            </div>
          )}
        </div>

        {/* Image Upload & Action */}
        <div className="space-y-6">
          <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl h-[280px] flex flex-col relative overflow-hidden group">
            <h3 className="text-sm font-medium text-gray-300 mb-4 relative z-10">🖼️ Tải lên ảnh thiết kế/phong cách</h3>
            
            <label className="flex-1 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all relative z-10 bg-gray-950/50">
              {imagePreview ? (
                <div className="absolute inset-0 p-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium">Thay đổi ảnh</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-800 p-4 rounded-full mb-3 text-gray-400 group-hover:text-purple-400 transition-colors">
                    <UploadCloud size={32} />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Kéo thả hoặc Click để chọn ảnh</span>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || (!concept && !imageFile)}
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <><Loader2 className="animate-spin mr-2" /> Đang phân tích Đa phương thức...</>
            ) : (
              <><Search className="mr-2" /> Gợi ý Khu vực Phù hợp</>
            )}
          </button>

          {results && results.length > 0 && (
            <div className="p-5 bg-gray-900/60 border border-emerald-500/30 rounded-2xl backdrop-blur-sm shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <h3 className="text-lg font-bold text-emerald-400 mb-3 flex items-center">
                <MapPin className="mr-2" /> Kết quả phân tích hàng đầu
              </h3>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {results.map((r: any, idx: number) => (
                  <div
                    key={r.id}
                    onClick={() => handleGetRoute(r)}
                    className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 cursor-pointer hover:border-purple-500/50 hover:bg-gray-800/70 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-100">Top {idx + 1}: Gần khu vực {r.district}</h4>
                        <p className="text-xs text-gray-500 mt-1">Tham khảo: {r.name}</p>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-500/20">
                        {r.score.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">🔎 {r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== ROUTE MODAL ===================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal}>
          <div
            className="relative bg-gray-950 border border-gray-700 rounded-3xl shadow-2xl w-[95vw] h-[92vh] max-w-[1400px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="bg-purple-600 p-2 rounded-lg"><Route size={18} className="text-white" /></div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{selectedPOI?.name || 'Chỉ đường'}</h2>
                  <p className="text-sm text-gray-400 truncate">📍 {selectedPOI?.district}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: Map */}
              <div className="flex-1 relative" style={{ overscrollBehavior: 'contain' }}>
                {routeLoading && (
                  <div className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                      <Loader2 className="animate-spin text-purple-400 mb-3" size={40} />
                      <span className="text-gray-300 font-medium">Hệ chuyên gia đang phân tích tuyến đường...</span>
                      <span className="text-gray-500 text-sm mt-1">Kiểm tra luật giao thông Đà Nẵng</span>
                    </div>
                  </div>
                )}
                <MapContainer
                  center={[userLocation?.lat || 16.0544, userLocation?.lng || 108.2022]}
                  zoom={13}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <FitBounds bounds={mapBounds} />
                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={originIcon}>
                      <Popup><strong>📍 Vị trí của bạn</strong></Popup>
                    </Marker>
                  )}
                  {selectedPOI && (
                    <Marker position={[selectedPOI.lat, selectedPOI.lon]} icon={destIcon}>
                      <Popup><strong>🎯 {selectedPOI.name}</strong><br />{selectedPOI.district}</Popup>
                    </Marker>
                  )}
                  {routes.map((r, idx) => {
                    const coords: [number, number][] = r.route.coordinates.map((c: number[]) => [c[1], c[0]]);
                    const isSelected = idx === selectedRouteIndex;
                    const color = r.esValidation?.valid ? '#a855f7' : '#f59e0b';
                    return (
                      <Polyline
                        key={`route-${idx}`}
                        positions={coords}
                        pathOptions={{ color, weight: isSelected ? 7 : 4, opacity: isSelected ? 1 : 0.3 }}
                        eventHandlers={{
                          click: () => {
                            setSelectedRouteIndex(idx);
                            setMapBounds(L.latLngBounds(coords));
                          }
                        }}
                      />
                    );
                  })}
                  {routeData?.esValidation?.warnings.map((w: any, i: number) => w.location && (
                    <Marker key={`warn-${i}`} position={[w.location.lat, w.location.lng]}>
                      <Popup><span style={{ color: 'red' }}>⚠️ {w.message}</span><br /><small>{w.law}</small></Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Right: Info panel */}
              <div className="w-[380px] flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden bg-gray-900/50">
                {routeError && (
                  <div className="m-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">{routeError}</div>
                )}

                {routeData && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {routes.length > 1 && (
                      <div className="bg-gray-800/80 rounded-xl p-2 flex space-x-2">
                        {routes.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedRouteIndex(idx);
                              const coords: [number, number][] = routes[idx].route.coordinates.map((c: number[]) => [c[1], c[0]]);
                              setMapBounds(L.latLngBounds(coords));
                            }}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${idx === selectedRouteIndex ? 'bg-purple-600 text-white shadow-md' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
                          >
                            Tuyến {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
                        <Ruler size={16} className="mx-auto text-blue-400 mb-1" />
                        <div className="text-white font-bold text-sm">{formatDistance(routeData.distance)}</div>
                        <div className="text-gray-500 text-[10px]">Khoảng cách</div>
                      </div>
                      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
                        <Clock size={16} className="mx-auto text-emerald-400 mb-1" />
                        <div className="text-white font-bold text-sm">{formatDuration(routeData.duration)}</div>
                        <div className="text-gray-500 text-[10px]">Thời gian</div>
                      </div>
                      <div className={`border rounded-xl p-3 text-center ${routeData.esValidation.valid ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                        {routeData.esValidation.valid
                          ? <CheckCircle size={16} className="mx-auto text-emerald-400 mb-1" />
                          : <AlertTriangle size={16} className="mx-auto text-amber-400 mb-1" />}
                        <div className={`font-bold text-sm ${routeData.esValidation.valid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {routeData.esValidation.valid ? 'Hợp pháp' : `${routeData.esValidation.warnings.length} cảnh báo`}
                        </div>
                        <div className="text-gray-500 text-[10px]">Hệ chuyên gia</div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {routeData.esValidation.warnings.length > 0 && (
                      <div className="bg-amber-900/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                        <h4 className="text-amber-400 font-bold flex items-center text-sm">
                          <AlertTriangle size={14} className="mr-2" />Cảnh báo luật giao thông
                        </h4>
                        {routeData.esValidation.warnings.map((w: any, i: number) => (
                          <div key={i} className="flex items-start space-x-2 text-sm">
                            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${w.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                            <div>
                              <p className="text-gray-200">{w.message}</p>
                              <p className="text-gray-500 text-xs">{w.law}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fuzzy Insights (Logic Mờ) */}
                    {routeData.esValidation.fuzzyInsights && routeData.esValidation.fuzzyInsights.length > 0 && (
                      <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-4 space-y-2 mt-4">
                        <h4 className="text-blue-400 font-bold flex items-center text-sm">
                          <Layers size={14} className="mr-2" />Đánh giá Giao thông (Logic Mờ)
                        </h4>
                        {routeData.esValidation.fuzzyInsights.map((fi: any, i: number) => (
                          <div key={i} className="flex items-start space-x-2 text-sm">
                            <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
                            <div>
                              <p className="text-gray-200 font-medium">{fi.road}</p>
                              <p className="text-blue-300/80 text-xs mt-0.5">{fi.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Steps */}
                    <div>
                      <button onClick={() => setShowSteps(!showSteps)} className="w-full flex items-center justify-between p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-gray-300 hover:bg-gray-700/60 transition-colors">
                        <span className="flex items-center"><Route size={14} className="mr-2 text-purple-400" />Hướng dẫn chỉ đường ({routeData.steps.length} bước)</span>
                        {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {showSteps && (
                        <div className="mt-2 bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                          {routeData.steps.map((s: any, i: number) => (
                            <div key={i} className="flex items-start space-x-3 text-sm">
                              <span className="bg-purple-600/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</span>
                              <span className="text-gray-300">{s.instruction}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rule trace */}
                    <div>
                      <button onClick={() => setShowTrace(!showTrace)} className="w-full flex items-center justify-between p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-gray-300 hover:bg-gray-700/60 transition-colors">
                        <span className="flex items-center"><Search size={14} className="mr-2 text-cyan-400" />Quá trình suy diễn lùi ({routeData.esValidation.ruleTrace.length} bước)</span>
                        {showTrace ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {showTrace && (
                        <div className="mt-2 bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                          {routeData.esValidation.ruleTrace.map((t: any, i: number) => (
                            <div key={i} className="text-xs border-l-2 border-cyan-500/30 pl-3 py-1">
                              <span className="text-cyan-400 font-mono">[{t.step}]</span>
                              <span className="text-gray-300 ml-2">{t.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading state in panel */}
                {routeLoading && !routeData && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="animate-spin text-purple-400 mx-auto mb-3" size={28} />
                      <p className="text-gray-400 text-sm">Đang tìm đường...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
