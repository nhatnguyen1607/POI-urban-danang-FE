import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import {
  ArrowRight, Bookmark, Brain, Building2, CalendarClock, ChevronDown,
  CloudSun, Coffee, Heart, Landmark, Languages, LocateFixed, Map, MapPin,
  Menu, MessageSquareQuote, Mic, MoonStar, Play, RefreshCw, Route, Search,
  SlidersHorizontal, Sparkles, Trees, UtensilsCrossed, Waves, X,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { BrandMark } from '../../components/BrandMark';
import { ResponsiveImage } from '../../components/ui/ResponsiveImage';
import { useLanguage } from '../../i18n/LanguageContext';
import { LandingRoutePreview } from './LandingRoutePreview';

const asset = (name: string) => `/assets/urbanagent/${name}`;

const destinations = [
  { image: asset('my-khe-coastline.webp'), tag: 'Nổi bật', title: 'Bãi biển Mỹ Khê', meta: 'Biển · Bình minh · Thư giãn', query: 'bãi biển Mỹ Khê' },
  { image: asset('son-tra-peninsula.webp'), tag: 'Thiên nhiên', title: 'Bán đảo Sơn Trà', meta: 'Thiên nhiên · Cung đường đẹp', query: 'Bán đảo Sơn Trà' },
  { image: asset('dragon-bridge.webp'), tag: 'Đang được quan tâm', title: 'Cầu Rồng', meta: 'Thành phố · Về đêm', query: 'Cầu Rồng' },
  { image: asset('golden-bridge.webp'), tag: 'Không thể bỏ lỡ', title: 'Bà Nà Hills', meta: 'Núi · Trải nghiệm', query: 'Bà Nà Hills' },
];

const moodGroups = [
  {
    label: 'Cà phê', icon: Coffee, description: 'Tìm một khoảng dừng đúng nhịp của bạn.',
    cards: [
      { image: asset('coffee-phin.jpg'), title: 'Cà phê Phin giữa phố', meta: 'Góc local · Nhịp chậm', query: 'cà phê local yên tĩnh Hải Châu' },
      { image: asset('coffee-beach-bar.jpg'), title: 'Cà phê thư thả gần biển', meta: 'Gió biển · Buổi chiều', query: 'cà phê thư giãn gần biển Đà Nẵng' },
      { image: asset('coffee-garden.jpg'), title: 'Vườn cà phê ẩn mình', meta: 'Nhiều cây xanh · Riêng tư', query: 'cà phê sân vườn yên tĩnh Đà Nẵng' },
    ],
  },
  {
    label: 'Món địa phương', icon: UtensilsCrossed, description: 'Ba hương vị nên thử khi đến Đà Nẵng.',
    cards: [
      { image: asset('food-mi-quang.jpg'), title: 'Mì Quảng', meta: 'Đậm vị · Đặc sản xứ Quảng', query: 'Mì Quảng ngon ở Đà Nẵng' },
      { image: asset('food-bun-cha-ca.jpg'), title: 'Bún chả cá', meta: 'Nước dùng thanh · Bữa sáng local', query: 'Bún chả cá Đà Nẵng' },
      { image: asset('food-banh-trang-cuon.jpg'), title: 'Bánh tráng cuốn thịt heo', meta: 'Rau sống · Mắm nêm', query: 'Bánh tráng cuốn thịt heo Đà Nẵng' },
    ],
  },
  {
    label: 'Bãi biển', icon: Waves, description: 'Chọn một dải bờ biển hợp với thời điểm trong ngày.',
    cards: [
      { image: asset('my-khe-coastline.webp'), title: 'Mỹ Khê', meta: 'Bình minh · Bãi tắm rộng', query: 'Bãi biển Mỹ Khê' },
      { image: asset('beach-non-nuoc.jpg'), title: 'Non Nước', meta: 'Hàng dừa · Nhịp nghỉ dưỡng', query: 'Bãi biển Non Nước Đà Nẵng' },
      { image: asset('beach-nam-o.jpg'), title: 'Bờ biển làng chài', meta: 'Thuyền thúng · Đời sống ven biển', query: 'Bãi biển làng chài Nam Ô Đà Nẵng' },
    ],
  },
  {
    label: 'Thiên nhiên', icon: Trees, description: 'Đi ra ngoài phố để chạm vào núi, rừng và biển.',
    cards: [
      { image: asset('son-tra-peninsula.webp'), title: 'Bán đảo Sơn Trà', meta: 'Rừng xanh · Vịnh nhỏ', query: 'Thiên nhiên Bán đảo Sơn Trà' },
      { image: asset('nature-hai-van.jpg'), title: 'Đèo Hải Vân', meta: 'Cung đèo · Toàn cảnh biển', query: 'Đèo Hải Vân ngắm cảnh' },
      { image: asset('golden-bridge-sunset.webp'), title: 'Bà Nà lúc hoàng hôn', meta: 'Núi rừng · Ánh chiều', query: 'Bà Nà Hills hoàng hôn thiên nhiên' },
    ],
  },
  {
    label: 'Về đêm', icon: MoonStar, description: 'Ánh đèn thành phố cho một buổi tối nhiều sắc màu.',
    cards: [
      { image: asset('night-fireworks.jpg'), title: 'Cầu Rồng rực sáng', meta: 'Pháo hoa · Skyline sông Hàn', query: 'Cầu Rồng Đà Nẵng về đêm' },
      { image: asset('night-han-river.jpg'), title: 'Sông Hàn về đêm', meta: 'Phản chiếu · Nhịp thành phố', query: 'Sông Hàn Đà Nẵng về đêm' },
      { image: asset('night-riverwalk.jpg'), title: 'Dạo bờ sông Hàn', meta: 'Ánh đèn · Đi bộ thư thả', query: 'dạo bờ sông Hàn buổi tối' },
    ],
  },
];

const timeline = [
  { time: '16:00', icon: '☕', title: 'Cà phê yên tĩnh gần Mỹ Khê', info: '1,2 km · 6 phút di chuyển' },
  { time: '18:00', icon: '🌅', title: 'Dạo bãi biển', info: '300 m · 4 phút đi bộ' },
  { time: '19:15', icon: '🦐', title: 'Hải sản địa phương', info: '2,1 km · 8 phút di chuyển' },
  { time: '20:45', icon: '🌉', title: 'Sông Hàn và Cầu Rồng', info: '3,6 km · 11 phút di chuyển' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [activeMood, setActiveMood] = useState(moodGroups[0].label);
  const mood = moodGroups.find((item) => item.label === activeMood) || moodGroups[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openPlanner = (value = prompt) => {
    navigate('/urban-agent', { state: value.trim() ? { landingPrompt: value.trim() } : undefined });
  };
  const openDiscovery = (query = '') => navigate(`/map-data${query ? `?query=${encodeURIComponent(query)}` : ''}`);

  return (
    <div className="ua-public overflow-x-clip bg-white text-[var(--ua-navy-950)]">
      <header className={`ua-public-header${scrolled ? ' is-solid' : ''}`}>
        <div className="ua-container flex h-20 items-center justify-between">
          <Link to="/" aria-label="Trang chủ UrbanAgent"><BrandMark showTagline={false} /></Link>
          <nav className="hidden items-center gap-9 lg:flex" aria-label="Điều hướng chính">
            <a href="#explore">Khám phá</a><a href="#ai-planner">AI Planner</a><a href="#experiences">Trải nghiệm</a>
            <a href="#for-business">Doanh nghiệp</a><a href="#about">Giới thiệu</a>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <label className="ua-public-language">
              <Languages size={15} aria-hidden="true" />
              <span className="sr-only">{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}>
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
            </label>
            <Link to={user ? '/urban-agent' : '/login'} className="ua-public-signin">{user ? 'Mở chuyến đi' : 'Đăng nhập'}</Link>
            <button type="button" onClick={() => openPlanner()} className="ua-public-header-cta"><Sparkles size={16} /> Hỏi UrbanAgent</button>
          </div>
          <button type="button" onClick={() => setMenuOpen(true)} className="ua-icon-button ua-public-menu-button" aria-label="Mở menu"><Menu size={21} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] bg-[var(--ua-navy-950)]/40 sm:hidden" onClick={() => setMenuOpen(false)}>
          <nav className="ml-auto flex h-full w-[min(88vw,340px)] flex-col bg-white p-5 shadow-2xl" aria-label="Menu di động" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><Link to="/" onClick={() => setMenuOpen(false)} className="ua-brand-home-link" aria-label="UrbanAgent Home"><BrandMark showTagline={false} /></Link><button type="button" className="ua-icon-button" onClick={() => setMenuOpen(false)} aria-label="Đóng menu"><X size={20} /></button></div>
            <label className="ua-public-language mt-7 w-fit">
              <Languages size={15} aria-hidden="true" />
              <span>{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}>
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
            </label>
            <div className="mt-10 grid gap-2">
              {[['Khám phá', '#explore'], ['AI Planner', '#ai-planner'], ['Trải nghiệm', '#experiences'], ['Doanh nghiệp', '#for-business'], ['Giới thiệu', '#about']].map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-[15px] font-medium hover:bg-[var(--ua-soft-sky)]">{label}</a>)}
            </div>
            <button type="button" onClick={() => openPlanner()} className="ua-public-header-cta mt-auto"><Sparkles size={16} /> Hỏi UrbanAgent</button>
          </nav>
        </div>
      )}

      <main>
        <section id="top" className="relative overflow-hidden bg-gradient-to-b from-[#F3FAFF] via-[#FAFCFE] to-white pb-[220px] pt-32 lg:pb-[260px]">
          <div className="absolute right-0 top-0 h-full w-full lg:w-[58%]">
            <ResponsiveImage src={asset('my-khe-coastline.webp')} alt="Bờ biển Mỹ Khê và thành phố Đà Nẵng" className="h-full w-full object-cover" eager sizes="(min-width: 1024px) 58vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#F3FAFF] via-[#F3FAFF]/70 to-transparent lg:via-[#F3FAFF]/30" />
            <div className="absolute inset-0 bg-white/45 lg:bg-transparent" />
          </div>
          <div className="ua-container relative">
            <div className="max-w-[560px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#1597E5]/25 bg-white/80 px-4 py-1.5 text-[12px] font-semibold tracking-[0.14em] text-[#0767C8] backdrop-blur"><Sparkles size={14} /> TRỢ LÝ AI KHÁM PHÁ ĐÀ NẴNG</span>
              <h1 className="mt-7 text-[46px] font-semibold leading-[1.05] text-[#0E2038] sm:text-[62px]">Khám phá Đà Nẵng.<span className="block bg-gradient-to-r from-[#1597E5] via-[#0767C8] to-[#12B9B0] bg-clip-text font-medium italic text-transparent">Theo cách của bạn.</span></h1>
              <p className="mt-6 max-w-[470px] text-[17px] leading-relaxed text-[#607086]">Hãy nói điều bạn muốn làm. UrbanAgent kết hợp sở thích, vị trí, thời gian và dữ liệu địa phương thành một lịch trình cá nhân hóa có thể dùng ngay.</p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => openPlanner()} className="ua-hero-primary">Lên kế hoạch <ArrowRight size={16} /></button>
                <a href="#ai-planner" className="ua-hero-secondary"><span><Play size={14} /></span> Xem cách hoạt động</a>
              </div>
              <p className="mt-8 text-[13px] text-[#607086]">Dữ liệu địa phương · Địa điểm thật · Lập kế hoạch bằng AI</p>
            </div>
          </div>
        </section>

        <section id="planner" className="relative z-10 mx-auto -mt-[170px] w-[calc(100%-2rem)] max-w-[1180px] rounded-[24px] bg-white p-5 shadow-[0_30px_70px_-20px_rgba(14,32,56,0.25)] ring-1 ring-[#0E2038]/5 sm:p-7" aria-label="UrbanAgent AI Planner">
          <div className="flex flex-wrap gap-1.5 border-b border-[#0E2038]/8 pb-4">
            <button type="button" className="ua-planner-tab is-active"><Sparkles size={16} /> Hỏi UrbanAgent</button>
            <button type="button" onClick={() => openDiscovery()} className="ua-planner-tab"><MapPin size={16} /> Khám phá địa điểm</button>
            <button type="button" onClick={() => navigate('/urban-agent')} className="ua-planner-tab"><Map size={16} /> Chuyến đi</button>
            <button type="button" onClick={() => navigate('/saved')} className="ua-planner-tab"><Heart size={16} /> Đã lưu</button>
          </div>
          <div className="pt-6">
            <label htmlFor="landing-planner-prompt" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#607086]">Bạn muốn làm gì ở Đà Nẵng?</label>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#F3FAFF] px-4 py-3 ring-1 ring-transparent transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1597E5]/40">
              <Sparkles className="shrink-0 text-[#1597E5]" size={20} />
              <input id="landing-planner-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Một quán cà phê yên tĩnh gần Mỹ Khê, ăn hải sản rồi đi dạo." className="h-11 w-full bg-transparent text-[16px] text-[#0E2038] outline-none placeholder:text-[#607086]/70" />
              <button type="button" className="ua-planner-round-action" aria-label="Nhập bằng giọng nói"><Mic size={17} /></button>
              <button type="button" onClick={() => openDiscovery()} className="ua-planner-round-action" aria-label="Chọn vị trí"><LocateFixed size={17} /></button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]">
              {[['Khi nào', 'Hôm nay'], ['Khu vực', 'Gần tôi'], ['Số người', '2 người'], ['Phong cách', 'Thư giãn']].map(([label, value]) => (
                <button key={label} type="button" onClick={() => openPlanner()} className="flex items-center justify-between rounded-2xl border border-[#0E2038]/8 px-4 py-3 text-left transition hover:border-[#1597E5]/50 hover:bg-[#F3FAFF]"><span><span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607086]">{label}</span><span className="text-[15px] font-medium text-[#0E2038]">{value}</span></span><ChevronDown size={16} className="text-[#607086]" /></button>
              ))}
              <button type="button" onClick={() => openPlanner()} className="inline-flex h-[62px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1597E5] to-[#0767C8] px-7 text-[16px] font-medium text-white shadow-[0_14px_30px_rgba(7,103,200,0.3)] transition hover:-translate-y-0.5">Tạo lịch trình <Sparkles size={16} /></button>
            </div>
          </div>
        </section>

        <section className="ua-container py-16 lg:py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Sparkles, 'AI cá nhân hóa', 'Lịch trình dựa trên sở thích và bối cảnh của bạn.'],
              [Landmark, 'Hiểu địa phương', 'Gợi ý từ các địa điểm thật tại Đà Nẵng.'],
              [Route, 'Tuyến đường thông minh', 'Giảm quãng đường không cần thiết giữa các điểm.'],
              [RefreshCw, 'Kế hoạch linh hoạt', 'Thay đổi và tạo lại lịch trình bất cứ lúc nào.'],
            ].map(([Icon, title, text]) => <div key={title as string} className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#DDF3FF] text-[#0767C8]"><Icon size={20} /></span><div><h2 className="text-[15px] font-semibold">{title as string}</h2><p className="mt-1.5 text-[14px] leading-relaxed text-[#607086]">{text as string}</p></div></div>)}
          </div>
        </section>

        <section id="explore" className="ua-container py-16 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><h2 className="ua-landing-title">Khám phá Đà Nẵng</h2><p className="mt-3 max-w-[440px] text-[16px] text-[#607086]">Những trải nghiệm đáng khám phá cho mọi kiểu du khách.</p></div>
            <button type="button" onClick={() => openDiscovery()} className="ua-outline-pill">Xem tất cả <ArrowRight size={16} /></button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((place) => (
              <article key={place.title} className="group relative aspect-[4/5] overflow-hidden rounded-[20px] shadow-[0_18px_40px_-24px_rgba(14,32,56,0.35)]">
                <button type="button" onClick={() => openDiscovery(place.query)} className="absolute inset-0 text-left" aria-label={`Khám phá ${place.title}`}>
                  <ResponsiveImage src={place.image} alt={place.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#0E2038]/80 via-[#0E2038]/10 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#0767C8]">{place.tag}</span>
                  <span className="absolute inset-x-0 bottom-0 p-5"><strong className="block text-[19px] font-semibold text-white">{place.title}</strong><small className="mt-1 block text-[13px] text-white/80">{place.meta}</small></span>
                </button>
                <button type="button" onClick={() => setSaved((current) => current.includes(place.title) ? current.filter((item) => item !== place.title) : [...current, place.title])} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition hover:bg-white/40" aria-label={`Lưu ${place.title}`}><Bookmark size={16} className={saved.includes(place.title) ? 'fill-white' : ''} /></button>
              </article>
            ))}
          </div>
        </section>

        <section id="ai-planner" className="bg-gradient-to-b from-[#F3FAFF] to-white py-20 lg:py-28">
          <div className="ua-container">
            <h2 className="max-w-[520px] text-[34px] font-semibold leading-[1.1] text-[#0E2038] sm:text-[44px]">Một yêu cầu.<br /><span className="text-[#0767C8]">Một lịch trình hoàn chỉnh.</span></h2>
            <div className="mt-12 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="rounded-[24px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(14,32,56,0.3)] ring-1 ring-[#0E2038]/5">
                <div className="ml-auto max-w-[85%] rounded-[18px] rounded-br-md bg-[#0767C8] px-5 py-4 text-[15px] leading-relaxed text-white">“Tôi muốn chiều nay ngồi cà phê yên tĩnh gần biển, khoảng 7 giờ ăn hải sản, sau đó đi dạo thư giãn.”</div>
                <div className="mt-5 flex items-center gap-2 text-[15px] font-semibold"><Sparkles size={16} className="text-[#1597E5]" /> Mình đã lên một buổi chiều nhẹ nhàng</div>
                <div className="mt-5 space-y-1">
                  {timeline.map((stop, index) => <div key={stop.time} className="relative flex gap-4 rounded-2xl px-3 py-3 hover:bg-[#F3FAFF]"><div className="flex flex-col items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#DDF3FF] text-[16px]">{stop.icon}</span>{index < timeline.length - 1 && <span className="mt-1 w-[2px] flex-1 rounded-full bg-gradient-to-b from-[#1597E5] to-[#DDF3FF]" />}</div><div className="pb-2"><span className="text-[12px] font-semibold tracking-[0.1em] text-[#0767C8]">{stop.time}</span><h3 className="text-[16px] font-medium">{stop.title}</h3><p className="mt-0.5 text-[13px] text-[#607086]">{stop.info}</p></div></div>)}
                </div>
              </div>
              <div>
                <div className="space-y-8">
                  {[[Brain, 'Hiểu ý định', 'UrbanAgent diễn giải điều bạn thật sự muốn.'], [Route, 'Kết nối địa điểm hợp lý', 'Các điểm được chọn như một phần của cả chuyến đi.'], [CloudSun, 'Thích ứng theo bối cảnh', 'Thời gian, vị trí và sở thích có thể thay đổi kế hoạch.'], [MessageSquareQuote, 'Gợi ý có giải thích', 'Bạn có thể xem vì sao một địa điểm phù hợp.']].map(([Icon, title, text]) => <div key={title as string} className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#0767C8] shadow-[0_8px_20px_-8px_rgba(7,103,200,0.5)]"><Icon size={20} /></span><div><h3 className="text-[17px] font-semibold">{title as string}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-[#607086]">{text as string}</p></div></div>)}
                </div>
                <button type="button" onClick={() => openPlanner('Chiều nay tôi muốn ngồi cà phê yên tĩnh gần biển, ăn hải sản rồi đi dạo thư giãn.')} className="ua-hero-primary mt-10">Thử UrbanAgent <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="ua-container py-16 lg:py-24">
          <h2 className="ua-landing-title">Xem cả ngày trên một bản đồ</h2>
          <div className="mt-10"><LandingRoutePreview language={language} onOpenPlanner={() => openPlanner()} /></div>
        </section>

        <section id="experiences" className="bg-[#FAFCFE] py-20 lg:py-24">
          <div className="ua-container">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><h2 className="ua-landing-title">Hôm nay bạn muốn trải nghiệm gì?</h2><p className="mt-3 text-[15px] text-[#607086]">{mood.description}</p></div>
              <button type="button" onClick={() => openDiscovery(mood.label)} className="ua-outline-pill">Khám phá thêm <ArrowRight size={16} /></button>
            </div>
            <div className="ua-mood-tabs mt-8" role="tablist" aria-label="Loại trải nghiệm">{moodGroups.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" role="tab" aria-selected={activeMood === item.label} onClick={() => setActiveMood(item.label)} className={`ua-mood-pill${activeMood === item.label ? ' is-active' : ''}`}><Icon size={16} />{item.label}</button>; })}</div>
            <div key={mood.label} className="ua-mood-grid mt-10 grid gap-6 sm:grid-cols-3" role="tabpanel">
              {mood.cards.map((card) => <button key={card.title} type="button" onClick={() => openDiscovery(card.query)} className="ua-mood-card group overflow-hidden bg-white text-left"><span className="block aspect-[4/3] overflow-hidden"><ResponsiveImage src={card.image} alt={card.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" sizes="(min-width: 640px) 33vw, 100vw" /></span><span className="block p-5"><strong className="flex items-center justify-between gap-3 text-[17px] font-semibold"><span>{card.title}</span><ArrowRight size={16} className="shrink-0 text-[#1597E5] transition-transform group-hover:translate-x-1" /></strong><small className="mt-1.5 block text-[13px] text-[#607086]">{card.meta}</small></span></button>)}
            </div>
          </div>
        </section>

        <section id="about" className="ua-container py-20 lg:py-24">
          <h2 className="ua-landing-title max-w-[520px]">Vì sao khám phá cùng UrbanAgent?</h2>
          <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {[[Search, 'Không chỉ là tìm kiếm', 'UrbanAgent hiểu cả yêu cầu thay vì chỉ khớp từ khóa.'], [CalendarClock, 'Thiết kế quanh ngày của bạn', 'Gợi ý được kết nối thành lịch trình thực tế.'], [Building2, 'Hiểu địa phương', 'Xây dựng quanh địa điểm và bối cảnh Đà Nẵng.'], [SlidersHorizontal, 'Sở thích của bạn quan trọng', 'Kế hoạch thích ứng theo ngân sách, nhịp đi và phong cách.']].map(([Icon, title, text]) => <div key={title as string} className="flex gap-5"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#DDF3FF] text-[#0767C8]"><Icon size={24} /></span><div><h3 className="text-[18px] font-semibold">{title as string}</h3><p className="mt-2 text-[15px] leading-relaxed text-[#607086]">{text as string}</p></div></div>)}
          </div>
        </section>

        <section id="for-business" className="ua-container pb-20 lg:pb-24">
          <div className="grid gap-10 rounded-[28px] bg-gradient-to-br from-[#0E2038] via-[#0B3A6E] to-[#0767C8] p-8 lg:grid-cols-2 lg:items-center lg:p-14">
            <div><span className="text-[12px] font-semibold tracking-[0.18em] text-[#8FD3FF]">URBANAGENT FOR BUSINESS</span><h2 className="mt-5 text-[30px] font-semibold leading-tight text-white sm:text-[38px]">Hiểu nơi khách hàng của bạn đang ở.</h2><p className="mt-5 max-w-[460px] text-[15px] leading-relaxed text-white/70">So sánh khu vực dựa trên nhu cầu, khả năng tiếp cận, cạnh tranh và hoạt động xung quanh.</p><button type="button" onClick={() => navigate('/seller')} className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#0767C8]">Khám phá Business Insights <ArrowRight size={16} /></button></div>
            <div className="rounded-[22px] bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur"><div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5"><Sparkles size={16} className="text-[#1597E5]" /><p className="text-[14px] text-[#0E2038]">“Nên mở study café ở đâu tại Đà Nẵng?”</p></div><div className="mt-4 flex flex-wrap gap-2.5">{['Nhu cầu sinh viên cao', 'Cạnh tranh vừa', 'Lưu lượng buổi tối tốt', 'Gần cụm đại học'].map((item) => <span key={item} className="rounded-full bg-[#DDF3FF]/20 px-4 py-2 text-[13px] font-medium text-white ring-1 ring-white/20">{item}</span>)}</div></div>
          </div>
        </section>

        <section className="ua-container pb-20 lg:pb-28">
          <div className="relative h-[380px] overflow-hidden rounded-[28px] sm:h-[420px]">
            <ResponsiveImage src={asset('golden-bridge-sunset.webp')} alt="Đà Nẵng trong ánh hoàng hôn" className="h-full w-full object-cover" sizes="(min-width: 1280px) 1280px, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E2038]/85 via-[#0E2038]/55 to-transparent" />
            <div className="absolute inset-0 flex items-center"><div className="max-w-[560px] p-8 sm:p-14"><span className="text-[12px] font-semibold tracking-[0.18em] text-[#8FD3FF]">SẴN SÀNG KHÁM PHÁ?</span><h2 className="mt-4 text-[30px] font-semibold leading-[1.15] text-white sm:text-[40px]">Trải nghiệm Đà Nẵng tiếp theo bắt đầu bằng một câu hỏi.</h2><div className="mt-8 flex flex-wrap gap-4"><button type="button" onClick={() => openPlanner()} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[16px] font-medium text-[#0767C8]">Hỏi UrbanAgent <Sparkles size={16} /></button><button type="button" onClick={() => openDiscovery()} className="inline-flex items-center rounded-full px-7 py-4 text-[16px] font-medium text-white ring-1 ring-white/50">Khám phá Đà Nẵng</button></div></div></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0E2038]/8 bg-[#FAFCFE]">
        <div className="ua-container py-16">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div><Link to="/" className="ua-brand-home-link" aria-label="UrbanAgent Home"><BrandMark showTagline={false} /></Link><p className="mt-4 text-[15px] text-[#607086]">Khám phá Đà Nẵng thông minh hơn.</p></div>
            <FooterColumn title="Khám phá" links={[['Địa điểm', '#explore'], ['Trải nghiệm', '#experiences'], ['AI Planner', '#ai-planner'], ['Đã lưu', '/saved']]} />
            <FooterColumn title="UrbanAgent" links={[['Giới thiệu', '#about'], ['Cách hoạt động', '#ai-planner'], ['Doanh nghiệp', '#for-business']]} />
            <FooterColumn title="Sản phẩm" links={[['Lập lịch trình', '/urban-agent'], ['Bản đồ khám phá', '/map-data'], ['Đăng nhập', '/login']]} />
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-[#0E2038]/8 pt-6 text-[13px] text-[#607086]"><p>© 2026 UrbanAgent AI.</p><p>Được xây dựng cho Đà Nẵng, Việt Nam.</p></div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return <div><h2 className="text-[14px] font-semibold">{title}</h2><ul className="mt-4 space-y-3">{links.map(([label, href]) => <li key={label}>{href.startsWith('/') ? <Link to={href} className="text-[15px] text-[#607086] hover:text-[#0767C8]">{label}</Link> : <a href={href} className="text-[15px] text-[#607086] hover:text-[#0767C8]">{label}</a>}</li>)}</ul></div>;
}
