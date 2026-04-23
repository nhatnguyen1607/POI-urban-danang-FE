import { useState } from 'react';
import { UploadCloud, Search, MapPin, Sparkles, Loader2, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function AiSiteSelectionPage() {
  const [concept, setConcept] = useState('Quán nhậu vỉa hè, hải sản tươi sống, không gian mở, ồn ào náo nhiệt, giá bình dân');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [modelVersion, setModelVersion] = useState('v4');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

      const response = await fetch('/api/recommend', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze');
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối tới máy chủ AI');
    } finally {
      setLoading(false);
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
            Sử dụng Mô hình Ngôn ngữ & Thị giác để phân tích ý tưởng (Ảnh + Chữ) và tìm kiếm mặt bằng phù hợp nhất tại Đà Nẵng.
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
          <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl">
            <label className="block text-sm font-medium text-gray-300 mb-2">📝 Nhập ý tưởng quán bạn muốn mở</label>
            <textarea
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
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
            <div className="p-6 bg-gray-900/60 border border-emerald-500/30 rounded-2xl backdrop-blur-sm shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
                <MapPin className="mr-2" /> Kết quả phân tích hàng đầu
              </h3>
              <div className="space-y-4">
                {results.map((r: any, idx: number) => (
                  <div key={r.id} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-100">Top {idx + 1}: {r.name}</h4>
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
                        {r.score.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">📍 {r.district}</p>
                    <p className="text-sm text-gray-500">🔎 {r.desc}</p>
                  </div>
                ))}
              </div>
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
              <><Search className="mr-2" /> Phân tích & Gợi ý Vị trí</>
            )}
          </button>
        </div>
      </div>

      {/* Map display if results exist */}
      {results && results.length > 0 && (
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative z-0 min-h-[400px] mt-6 animate-in slide-in-from-bottom-8 duration-700">
          <MapContainer 
            center={[results[0]?.lat || 16.0544, results[0]?.lon || 108.2022]} 
            zoom={13} 
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {results.map((r: any, idx: number) => (
              <div key={r.id}>
                <Marker position={[r.lat, r.lon]}>
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
  );
}
