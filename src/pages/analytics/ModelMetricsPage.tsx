import { useEffect, useState } from 'react';
import { Activity, Loader2, Target, TrendingDown } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../utils/apiClient';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ModelMetricsPage() {
  const { language } = useLanguage();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('v1');

  const copy = language === 'vi'
    ? {
        title: 'Chỉ số mô hình',
        subtitle: 'Theo dõi quá trình huấn luyện mô hình qua từng epoch',
        version: 'Phiên bản mô hình',
        loss: 'Loss (hàm mất mát)',
        recall: 'Recall@5',
        silhouette: 'Silhouette Score',
      }
    : {
        title: 'Model Metrics',
        subtitle: 'Track model training metrics across epochs',
        version: 'Model version',
        loss: 'Loss',
        recall: 'Recall@5',
        silhouette: 'Silhouette Score',
      };

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/api/metrics/training-loss?version=${version}`)
      .then((result) => {
        if (result && !result.error) {
          setData(result.map((item: any) => ({
            epoch: Number.parseInt(item.epoch, 10),
            train_loss: Number.parseFloat(item.train_loss),
            test_loss: Number.parseFloat(item.test_loss),
            train_recall_5: Number.parseFloat(item.train_recall_5),
            test_recall_5: Number.parseFloat(item.test_recall_5),
            train_silhouette: Number.parseFloat(item.train_silhouette),
            test_silhouette: Number.parseFloat(item.test_silhouette),
          })));
        } else {
          setData([]);
        }
      })
      .catch((err) => console.error('Failed to fetch metrics:', err))
      .finally(() => setLoading(false));
  }, [version]);

  return (
    <div className="flex h-full flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">{copy.title}</h1>
          <p className="text-gray-400">{copy.subtitle}</p>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-sm text-gray-400">{copy.version}</label>
          <select
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white outline-none transition-colors focus:border-cyan-500"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          >
            <option value="v1">Version 1 (v1)</option>
            <option value="v2">Version 2 (v2)</option>
            <option value="v3">Version 3 (v3)</option>
            <option value="v4">Version 4 (v4)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 overflow-y-auto pb-6 xl:grid-cols-2">
          <MetricChart
            title={copy.loss}
            icon={<TrendingDown className="text-red-400" size={24} />}
            accent="bg-red-500/20"
            data={data}
            lines={[
              { key: 'train_loss', name: 'Train Loss', color: '#EF4444' },
              { key: 'test_loss', name: 'Test Loss', color: '#F87171', dashed: true },
            ]}
          />

          <MetricChart
            title={copy.recall}
            icon={<Target className="text-emerald-400" size={24} />}
            accent="bg-emerald-500/20"
            data={data}
            yDomain={[0, 1]}
            lines={[
              { key: 'train_recall_5', name: 'Train Recall@5', color: '#10B981' },
              { key: 'test_recall_5', name: 'Test Recall@5', color: '#34D399', dashed: true },
            ]}
          />

          <MetricChart
            title={copy.silhouette}
            icon={<Activity className="text-blue-400" size={24} />}
            accent="bg-blue-500/20"
            data={data}
            className="xl:col-span-2"
            lines={[
              { key: 'train_silhouette', name: 'Train Silhouette', color: '#3B82F6' },
              { key: 'test_silhouette', name: 'Test Silhouette', color: '#60A5FA', dashed: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function MetricChart({
  title,
  icon,
  accent,
  data,
  lines,
  yDomain,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  data: any[];
  lines: { key: string; name: string; color: string; dashed?: boolean }[];
  yDomain?: [number, number];
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-xl backdrop-blur-md ${className}`}>
      <div className="mb-6 flex items-center space-x-3">
        <div className={`rounded-lg p-2 ${accent}`}>{icon}</div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="epoch" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" domain={yDomain} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                strokeDasharray={line.dashed ? '5 5' : undefined}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
