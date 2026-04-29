import { useState, useEffect } from 'react';
import { Loader2, TrendingDown, Target, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { apiClient } from '../utils/apiClient';

export default function ModelMetricsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('v1');

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/api/metrics/training-loss?version=${version}`)
      .then(result => {
        if (result && !result.error) {
          // Parse strings to numbers
          const formattedData = result.map((item: any) => ({
            epoch: parseInt(item.epoch),
            train_loss: parseFloat(item.train_loss),
            test_loss: parseFloat(item.test_loss),
            train_recall_5: parseFloat(item.train_recall_5),
            test_recall_5: parseFloat(item.test_recall_5),
            train_silhouette: parseFloat(item.train_silhouette),
            test_silhouette: parseFloat(item.test_silhouette),
          }));
          setData(formattedData);
        } else {
          setData([]);
        }
      })
      .catch(err => console.error('Failed to fetch metrics:', err))
      .finally(() => setLoading(false));
  }, [version]);

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Chỉ số Mô hình</h1>
          <p className="text-gray-400">Theo dõi quá trình huấn luyện mô hình qua các epoch</p>
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

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-500 w-10 h-10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6 overflow-y-auto custom-scrollbar">
          
          {/* Loss Chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="text-red-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Loss (Hàm mất mát)</h2>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="epoch" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                  <Legend />
                  <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="test_loss" name="Test Loss" stroke="#F87171" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recall Chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Target className="text-emerald-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Recall@5</h2>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="epoch" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                  <Legend />
                  <Line type="monotone" dataKey="train_recall_5" name="Train Recall@5" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="test_recall_5" name="Test Recall@5" stroke="#34D399" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Silhouette Score Chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-md xl:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="text-blue-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Silhouette Score</h2>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="epoch" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                  <Legend />
                  <Line type="monotone" dataKey="train_silhouette" name="Train Silhouette" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="test_silhouette" name="Test Silhouette" stroke="#60A5FA" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
