import { useState } from 'react';
import { Network, Maximize2 } from 'lucide-react';

const getBackendUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    return 'http://localhost:7860';
  }
  return apiUrl;
};

export default function TSNEClusterPage() {
  const [version, setVersion] = useState('v1');

  const images = [
    {
      title: 't-SNE Group Clusters (Phân cụm các danh mục)',
      url: `${getBackendUrl()}/api/figures/${version}/tsne_group_clusters_${version}.png`,
      description: 'Hiển thị sự phân cụm của các danh mục địa điểm (Categories) dựa trên không gian nhúng của mô hình.'
    },
    {
      title: 't-SNE Clusters',
      url: `${getBackendUrl()}/api/figures/${version}/tsne_clusters_${version}.jpg`,
      description: 'Phân cụm t-SNE trên toàn bộ dữ liệu.'
    },
    {
      title: 'UMAP Clusters',
      url: `${getBackendUrl()}/api/figures/${version}/umap_clusters_${version}.png`,
      description: 'Phân cụm sử dụng thuật toán UMAP để so sánh.'
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Phân cụm t-SNE</h1>
          <p className="text-gray-400">Trực quan hóa không gian nhúng (embeddings) và sự tương đồng giữa các danh mục</p>
        </div>
        <div className="flex flex-col">
          <label className="text-gray-400 text-sm mb-1">Phiên bản Mô hình</label>
          <select 
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-purple-500 transition-colors"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          >
            <option value="v1">Version 1 (v1)</option>
            <option value="v2">Version 2 (v2)</option>
            <option value="v3">Version 3 (v3)</option>
            <option value="v4">Version 4 (v4)</option>
          </select>
        </div>
      </div>

      <div className="space-y-10">
        {images.map((img, idx) => (
          <div key={idx} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Network className="text-purple-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{img.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{img.description}</p>
              </div>
            </div>
            
            <div className="relative group rounded-xl overflow-hidden border border-gray-800 bg-black/50 flex justify-center items-center p-4 min-h-[400px]">
              <img 
                src={img.url} 
                alt={img.title} 
                className="max-w-full max-h-[700px] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://placehold.co/800x600/111827/4B5563?text=Hình+ảnh+đang+được+tạo...';
                }}
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-gray-900/80 p-2 rounded-lg text-white hover:bg-gray-800 border border-gray-700 shadow-lg backdrop-blur-sm"
                  onClick={() => window.open(img.url, '_blank')}
                >
                  <Maximize2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
