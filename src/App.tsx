import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ModelMetricsPage from './pages/analytics/ModelMetricsPage';
import TSNEClusterPage from './pages/analytics/TSNEClusterPage';
import UrbanAgentPage from './pages/urban-agent/UrbanAgentPage';
import { LanguageProvider } from './i18n/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="urban-agent" element={<UrbanAgentPage />} />
            <Route path="ai-site-selection" element={<UrbanAgentPage />} />
            <Route path="text-search" element={<UrbanAgentPage />} />
            <Route path="model-metrics" element={<ModelMetricsPage />} />
            <Route path="tsne-cluster" element={<TSNEClusterPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
