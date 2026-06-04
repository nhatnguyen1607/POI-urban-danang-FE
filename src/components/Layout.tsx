import { Outlet, NavLink } from 'react-router-dom';
import { Bot, LayoutDashboard, LineChart, Map, MapPin, Network, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Layout() {
  const { language, setLanguage } = useLanguage();
  const navItems = [
    { name: 'Urban Agent', path: '/urban-agent', icon: <Bot size={20} /> },
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Model Metrics', path: '/model-metrics', icon: <LineChart size={20} /> },
    { name: 't-SNE Cluster', path: '/tsne-cluster', icon: <Network size={20} /> },
    { name: 'Legacy Site Selection', path: '/ai-site-selection', icon: <Map size={20} /> },
    { name: 'Text Search', path: '/text-search', icon: <Search size={20} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <aside className="flex w-72 flex-col border-r border-slate-800 bg-slate-950">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400 p-2 shadow-lg shadow-cyan-500/20">
              <MapPin className="text-slate-950" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Danang UrbanAgent</h1>
              <p className="text-xs text-slate-400">Urban intelligence MVP</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {language === 'vi' ? 'Ngôn ngữ' : 'Language'}
          </label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}
            className="mb-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-5 text-slate-400">
            <strong className="text-slate-200">Danang-first agent</strong>
            <br />
            Traveler + Business roles share one POI intelligence core.
          </div>
        </div>
      </aside>

      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#020617)]">
        <div className="min-h-full p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
