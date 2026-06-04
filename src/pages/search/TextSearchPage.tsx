import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Layers, Loader2, Navigation, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Route, Clock, Ruler, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiClient } from '../../utils/apiClient';

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

export default function TextSearchPage() {
  const [query, setQuery] = useState('');
  const [modelVersion, setModelVersion] = useState('v4');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
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
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);
    setRoutes([]);
    setSelectedPOI(null);
    setSelectedRouteIndex(0);
    try {
      const formData = new FormData();
      formData.append('concept', query);
      formData.append('modelVersion', modelVersion);
      setResults(await apiClient.post('/api/recommend', formData));
    } catch (err: any) {
      setError(err.message || 'Lá»—i káº¿t ná»‘i tá»›i mÃ¡y chá»§ AI');
      setResults([]);
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
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60} phÃºt` : `${mins} phÃºt`;
  };

  const routeData = routes.length > 0 ? routes[selectedRouteIndex] : null;

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mt-10">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 tracking-tight">
          TÃ¬m kiáº¿m & Chá»‰ Ä‘Æ°á»ng ThÃ´ng minh
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          AI gá»£i Ã½ Ä‘á»‹a Ä‘iá»ƒm + Há»‡ chuyÃªn gia kiá»ƒm tra luáº­t giao thÃ´ng ÄÃ  Náºµng
        </p>
      </div>

      {/* Search bar */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        <form onSubmit={handleSearch} className="relative group w-full mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-32 py-5 bg-gray-900/80 border border-gray-700/80 rounded-full text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-md shadow-2xl transition-all"
            placeholder="MÃ´ táº£ quÃ¡n báº¡n muá»‘n Ä‘áº¿n..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full px-8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'TÃ¬m kiáº¿m'}
          </button>
        </form>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Layers size={16} />
          <span>Sá»­ dá»¥ng MÃ´ hÃ¬nh:</span>
          <select className="bg-transparent text-purple-400 font-medium outline-none cursor-pointer" value={modelVersion} onChange={(e) => setModelVersion(e.target.value)}>
            <option value="v4" className="bg-gray-900 text-white">Version 4 (Má»›i nháº¥t)</option>
            <option value="v3" className="bg-gray-900 text-white">Version 3</option>
            <option value="v2" className="bg-gray-900 text-white">Version 2</option>
            <option value="v1" className="bg-gray-900 text-white">Version 1</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto w-full p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center">{error}</div>
      )}

      {/* Results list */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="mt-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Káº¿t quáº£ phÃ¹ há»£p nháº¥t</h3>
            <div className="flex items-center space-x-3">
              {userLocation && <span className="text-xs text-emerald-400 flex items-center"><Navigation size={12} className="mr-1" />ÄÃ£ xÃ¡c Ä‘á»‹nh vá»‹ trÃ­</span>}
              <span className="text-sm text-gray-400">TÃ¬m tháº¥y {results.length} Ä‘á»‹a Ä‘iá»ƒm</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((shop: any) => (
              <div
                key={shop.id}
                onClick={() => handleGetRoute(shop)}
                className="group p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-md hover:border-purple-500/50 hover:bg-gray-800/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] flex flex-col h-full cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-1">{shop.name}</h4>
                    <div className="flex items-center text-sm text-gray-400 mt-1"><MapPin size={14} className="mr-1" /> {shop.district}</div>
                  </div>
                  <div className="bg-gray-950 px-3 py-1 rounded-full border border-gray-800 flex items-center flex-shrink-0">
                    <Star size={14} className="text-amber-400 mr-1" />
                    <span className="text-gray-200 font-medium">{shop.score.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm flex-1 leading-relaxed line-clamp-3">"{shop.desc}"</p>
                <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-400">Gá»£i Ã½ AI</span>
                  <span className="text-xs text-purple-400 flex items-center"><Route size={12} className="mr-1" />Click Ä‘á»ƒ chá»‰ Ä‘Æ°á»ng</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="text-center mt-12 animate-in fade-in">
          <div className="inline-block p-4 rounded-full bg-gray-800/50 mb-4"><Search size={32} className="text-gray-500" /></div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">KhÃ´ng tÃ¬m tháº¥y káº¿t quáº£</h3>
          <p className="text-gray-500">Thá»­ thay Ä‘á»•i tá»« khÃ³a mÃ´ táº£ Ä‘á»ƒ cÃ³ káº¿t quáº£ tá»‘t hÆ¡n.</p>
        </div>
      )}

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
                  <h2 className="text-lg font-bold text-white truncate">{selectedPOI?.name || 'Chá»‰ Ä‘Æ°á»ng'}</h2>
                  <p className="text-sm text-gray-400 truncate">ðŸ“ {selectedPOI?.district}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: Map */}
              <div className="flex-1 relative">
                {routeLoading && (
                  <div className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                      <Loader2 className="animate-spin text-purple-400 mb-3" size={40} />
                      <span className="text-gray-300 font-medium">Há»‡ chuyÃªn gia Ä‘ang phÃ¢n tÃ­ch tuyáº¿n Ä‘Æ°á»ng...</span>
                      <span className="text-gray-500 text-sm mt-1">Kiá»ƒm tra luáº­t giao thÃ´ng ÄÃ  Náºµng</span>
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
                      <Popup><strong>ðŸ“ Vá»‹ trÃ­ cá»§a báº¡n</strong></Popup>
                    </Marker>
                  )}
                  {selectedPOI && (
                    <Marker position={[selectedPOI.lat, selectedPOI.lon]} icon={destIcon}>
                      <Popup><strong>ðŸŽ¯ {selectedPOI.name}</strong><br />{selectedPOI.district}</Popup>
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
                      <Popup><span style={{ color: 'red' }}>âš ï¸ {w.message}</span><br /><small>{w.law}</small></Popup>
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
                            Tuyáº¿n {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
                        <Ruler size={16} className="mx-auto text-blue-400 mb-1" />
                        <div className="text-white font-bold text-sm">{formatDistance(routeData.distance)}</div>
                        <div className="text-gray-500 text-[10px]">Khoáº£ng cÃ¡ch</div>
                      </div>
                      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
                        <Clock size={16} className="mx-auto text-emerald-400 mb-1" />
                        <div className="text-white font-bold text-sm">{formatDuration(routeData.duration)}</div>
                        <div className="text-gray-500 text-[10px]">Thá»i gian</div>
                      </div>
                      <div className={`border rounded-xl p-3 text-center ${routeData.esValidation.valid ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                        {routeData.esValidation.valid
                          ? <CheckCircle size={16} className="mx-auto text-emerald-400 mb-1" />
                          : <AlertTriangle size={16} className="mx-auto text-amber-400 mb-1" />}
                        <div className={`font-bold text-sm ${routeData.esValidation.valid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {routeData.esValidation.valid ? 'Há»£p phÃ¡p' : `${routeData.esValidation.warnings.length} cáº£nh bÃ¡o`}
                        </div>
                        <div className="text-gray-500 text-[10px]">Há»‡ chuyÃªn gia</div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {routeData.esValidation.warnings.length > 0 && (
                      <div className="bg-amber-900/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                        <h4 className="text-amber-400 font-bold flex items-center text-sm">
                          <AlertTriangle size={14} className="mr-2" />Cáº£nh bÃ¡o luáº­t giao thÃ´ng
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

                    {/* Fuzzy Insights (Logic Má») */}
                    {routeData.esValidation.fuzzyInsights && routeData.esValidation.fuzzyInsights.length > 0 && (
                      <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-4 space-y-2 mt-4">
                        <h4 className="text-blue-400 font-bold flex items-center text-sm">
                          <Layers size={14} className="mr-2" />ÄÃ¡nh giÃ¡ Giao thÃ´ng (Logic Má»)
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
                        <span className="flex items-center"><Route size={14} className="mr-2 text-purple-400" />HÆ°á»›ng dáº«n chá»‰ Ä‘Æ°á»ng ({routeData.steps.length} bÆ°á»›c)</span>
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
                        <span className="flex items-center"><Search size={14} className="mr-2 text-cyan-400" />QuÃ¡ trÃ¬nh suy diá»…n lÃ¹i ({routeData.esValidation.ruleTrace.length} bÆ°á»›c)</span>
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
                      <p className="text-gray-400 text-sm">Äang tÃ¬m Ä‘Æ°á»ng...</p>
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

