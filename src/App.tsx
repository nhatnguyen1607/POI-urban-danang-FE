import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import AiSiteSelectionPage from './pages/AiSiteSelectionPage';
import TextSearchPage from './pages/TextSearchPage';
import ModelMetricsPage from './pages/ModelMetricsPage';
import TSNEClusterPage from './pages/TSNEClusterPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="ai-site-selection" element={<AiSiteSelectionPage />} />
          <Route path="text-search" element={<TextSearchPage />} />
          <Route path="model-metrics" element={<ModelMetricsPage />} />
          <Route path="tsne-cluster" element={<TSNEClusterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
