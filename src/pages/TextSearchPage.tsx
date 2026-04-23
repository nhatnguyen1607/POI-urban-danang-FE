import { useState } from 'react';
import { Search, MapPin, Star, Layers, Loader2 } from 'lucide-react';

export default function TextSearchPage() {
  const [query, setQuery] = useState('');
  const [modelVersion, setModelVersion] = useState('v4');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('concept', query);
      formData.append('modelVersion', modelVersion);

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
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="text-center mt-10">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 tracking-tight">
          Tìm kiếm Không gian
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Nhập mô tả về quán bạn đang tìm kiếm. Hệ thống AI sẽ phân tích ngữ nghĩa và trả về những địa điểm phù hợp nhất tại Đà Nẵng.
        </p>
      </div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        <form onSubmit={handleSearch} className="relative group w-full mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-32 py-5 bg-gray-900/80 border border-gray-700/80 rounded-full text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-md shadow-2xl transition-all"
            placeholder="Mô tả quán bạn muốn đến..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full px-8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Tìm kiếm'}
          </button>
        </form>

        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Layers size={16} />
          <span>Sử dụng Mô hình:</span>
          <select 
            className="bg-transparent text-purple-400 font-medium outline-none cursor-pointer"
            value={modelVersion}
            onChange={(e) => setModelVersion(e.target.value)}
          >
            <option value="v4" className="bg-gray-900 text-white">Version 4 (Mới nhất)</option>
            <option value="v3" className="bg-gray-900 text-white">Version 3</option>
            <option value="v2" className="bg-gray-900 text-white">Version 2</option>
            <option value="v1" className="bg-gray-900 text-white">Version 1</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto w-full p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center">
          {error}
        </div>
      )}

      {hasSearched && !loading && results.length > 0 && (
        <div className="mt-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Kết quả phù hợp nhất</h3>
            <span className="text-sm text-gray-400">Tìm thấy {results.length} địa điểm</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((shop: any) => (
              <div key={shop.id} className="group p-6 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-md hover:border-purple-500/50 hover:bg-gray-800/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] flex flex-col h-full cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-1">{shop.name}</h4>
                    <div className="flex items-center text-sm text-gray-400 mt-1">
                      <MapPin size={14} className="mr-1" /> {shop.district}
                    </div>
                  </div>
                  <div className="bg-gray-950 px-3 py-1 rounded-full border border-gray-800 flex items-center flex-shrink-0">
                    <Star size={14} className="text-amber-400 mr-1" />
                    <span className="text-gray-200 font-medium">{shop.score.toFixed(1)}%</span>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm flex-1 leading-relaxed line-clamp-3">
                  "{shop.desc}"
                </p>
                
                <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-400">Gợi ý AI (Độ phù hợp cao)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="text-center mt-12 animate-in fade-in">
          <div className="inline-block p-4 rounded-full bg-gray-800/50 mb-4">
            <Search size={32} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">Không tìm thấy kết quả</h3>
          <p className="text-gray-500">Thử thay đổi từ khóa mô tả để có kết quả tốt hơn.</p>
        </div>
      )}
    </div>
  );
}
