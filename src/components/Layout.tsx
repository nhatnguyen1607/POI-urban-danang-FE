import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Search, MapPin, LineChart, Network } from 'lucide-react';
// import { LayoutDashboard,  Search, MapPin } from 'lucide-react';

export default function Layout() {
  const navItems = [
    { name: 'Dashboard (EDA/POI)', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Chỉ số mô hình', path: '/model-metrics', icon: <LineChart size={20} /> },
    { name: 't-SNE Cluster', path: '/tsne-cluster', icon: <Network size={20} /> },
    { name: 'AI Site Selection', path: '/ai-site-selection', icon: <Map size={20} /> },
    { name: 'Text Search', path: '/text-search', icon: <Search size={20} /> }
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-all">
        <div className="p-6 flex items-center space-x-3">
          <div className="bg-purple-600 p-2 rounded-lg shadow-lg shadow-purple-500/20">
            <MapPin className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Đà Nẵng Urban AI
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-6 border-t border-gray-800">
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <p className="text-xs text-gray-400 leading-relaxed">
              {/* <strong>Chuyên đề 2</strong><br/> */}
              <strong>Chuyên đề 2</strong><br/>
              Khoa Khoa học Máy tính<br/>
              ĐH CNTT & TT Việt - Hàn (VKU)
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px]"></div>
        </div>
        
        <div className="p-8 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
