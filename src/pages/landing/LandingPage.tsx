import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  Coffee,
  Compass,
  Heart,
  Leaf,
  Map,
  MapPin,
  Menu,
  MoonStar,
  Navigation,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { BrandMark } from '../../components/BrandMark';
import { FeatureCard, ProductButton, SectionHeader } from '../../components/ui/ProductPrimitives';

const destinationCards = [
  { title: 'Bãi biển Mỹ Khê', tag: 'Được yêu thích', image: '/images/da-nang/my-khe-coastline.webp', query: 'biển Mỹ Khê' },
  { title: 'Bán đảo Sơn Trà', tag: 'Thiên nhiên', image: '/images/da-nang/son-tra-peninsula.webp', query: 'Bán đảo Sơn Trà' },
  { title: 'Cầu Rồng', tag: 'Đang được quan tâm', image: '/images/da-nang/dragon-bridge.webp', query: 'Cầu Rồng' },
  { title: 'Bà Nà Hills', tag: 'Không thể bỏ lỡ', image: '/images/da-nang/golden-bridge.webp', query: 'Bà Nà Hills' },
];

const moods = [
  { label: 'Café', query: 'cafe yên tĩnh', icon: Coffee },
  { label: 'Món địa phương', query: 'món ăn địa phương', icon: Zap },
  { label: 'Biển', query: 'bãi biển', icon: Waves },
  { label: 'Thiên nhiên', query: 'thiên nhiên Sơn Trà', icon: Leaf },
  { label: 'Về đêm', query: 'Đà Nẵng về đêm', icon: MoonStar },
  { label: 'Chụp ảnh', query: 'địa điểm chụp ảnh', icon: Camera },
  { label: 'Gia đình', query: 'địa điểm cho gia đình', icon: Users },
  { label: 'Hẹn hò', query: 'địa điểm hẹn hò', icon: Heart },
  { label: 'Làm việc & học tập', query: 'cafe làm việc học tập', icon: BriefcaseBusiness },
];

const timeline = [
  { time: '16:00', title: 'Café gần Mỹ Khê', detail: 'Không gian yên tĩnh, ánh sáng đẹp' },
  { time: '18:00', title: 'Dạo biển', detail: 'Khoảng nghỉ nhẹ trước bữa tối' },
  { time: '19:15', title: 'Hải sản địa phương', detail: 'Phù hợp thời gian và nhịp chuyến đi' },
  { time: '20:45', title: 'Sông Hàn & Cầu Rồng', detail: 'Khép lại ngày bằng một vòng đi bộ' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openPlanner = (value = prompt) => {
    navigate('/urban-agent', { state: value.trim() ? { landingPrompt: value.trim() } : undefined });
  };
  const openDiscovery = (query: string) => navigate(`/map-data?query=${encodeURIComponent(query)}`);

  return (
    <div className="ua-public overflow-x-clip bg-[var(--ua-ivory)] text-[var(--ua-navy-950)]">
      <header className={`fixed inset-x-0 top-0 z-50 transition ${scrolled ? 'border-b border-[var(--ua-border)] bg-white/95 shadow-sm backdrop-blur' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="ua-container flex h-18 items-center justify-between gap-5">
          <Link to="/" aria-label="UrbanAgent AI home"><BrandMark /></Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Điều hướng chính">
            <a href="#explore" className="text-sm font-bold text-[var(--ua-navy-700)] hover:text-[var(--ua-blue-600)]">Khám phá</a>
            <Link to="/urban-agent" className="text-sm font-bold text-[var(--ua-navy-700)] hover:text-[var(--ua-blue-600)]">AI Planner</Link>
            <a href="#experience" className="text-sm font-bold text-[var(--ua-navy-700)] hover:text-[var(--ua-blue-600)]">Trải nghiệm</a>
            <a href="#business" className="text-sm font-bold text-[var(--ua-navy-700)] hover:text-[var(--ua-blue-600)]">Doanh nghiệp</a>
            <a href="#why" className="text-sm font-bold text-[var(--ua-navy-700)] hover:text-[var(--ua-blue-600)]">Giới thiệu</a>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Link to={user ? '/urban-agent' : '/login'} className="ua-button ua-button--secondary">{user ? 'Mở chuyến đi' : 'Đăng nhập'}</Link>
            <button type="button" onClick={() => openPlanner()} className="ua-button ua-button--primary">Hỏi UrbanAgent <Sparkles size={16} /></button>
          </div>
          <button type="button" onClick={() => setMenuOpen(true)} className="rounded-xl border border-[var(--ua-border)] bg-white p-2.5 text-[var(--ua-navy-950)] lg:hidden" aria-label="Mở menu"><Menu size={21} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-[var(--ua-navy-950)]/35 lg:hidden" role="presentation" onClick={() => setMenuOpen(false)}>
          <nav className="ml-auto flex h-full w-[min(88vw,360px)] flex-col bg-white p-5 shadow-2xl" aria-label="Menu di động" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><BrandMark /><button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-2" aria-label="Đóng menu"><X /></button></div>
            <div className="mt-10 flex flex-col gap-2">
              {[['Khám phá', '#explore'], ['AI Planner', '/urban-agent'], ['Trải nghiệm', '#experience'], ['Doanh nghiệp', '#business'], ['Giới thiệu', '#why']].map(([label, href]) => (
                href.startsWith('#')
                  ? <a key={label} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 font-bold hover:bg-[var(--ua-blue-50)]">{label}</a>
                  : <Link key={label} to={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 font-bold hover:bg-[var(--ua-blue-50)]">{label}</Link>
              ))}
            </div>
            <button type="button" onClick={() => openPlanner()} className="ua-button ua-button--primary mt-auto">Hỏi UrbanAgent <Sparkles size={16} /></button>
          </nav>
        </div>
      )}

      <main>
        <section className="relative min-h-[650px] overflow-hidden pt-18">
          <img src="/images/da-nang/my-khe-coastline.jpg" alt="Bờ biển Mỹ Khê nhìn từ trên cao" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,30,55,.9)_0%,rgba(7,43,75,.74)_42%,rgba(7,43,75,.16)_78%)]" />
          <div className="ua-container relative z-10 flex min-h-[650px] items-center pb-28 pt-16">
            <div className="max-w-[760px] text-white">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#c9eeff]"><Sparkles size={15} /> Trợ lý AI khám phá Đà Nẵng</div>
              <h1 className="mt-5 text-[clamp(44px,6.5vw,82px)] font-extrabold leading-[1.02]">Khám phá Đà Nẵng.<span className="mt-2 block text-[#8fdcff]">Theo cách của bạn.</span></h1>
              <p className="mt-6 max-w-2xl text-[clamp(16px,2vw,20px)] leading-8 text-white/82">Chỉ cần nói bạn muốn làm gì. UrbanAgent kết hợp sở thích, thời gian, vị trí và dữ liệu địa phương để tạo một lịch trình có thể dùng ngay.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => openPlanner()} className="ua-button ua-button--coral">Lên kế hoạch ngay <ArrowRight size={17} /></button>
                <a href="#experience" className="ua-button border border-white/35 bg-white/12 text-white backdrop-blur-sm hover:bg-white/20">Xem UrbanAgent hoạt động</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/72">
                <span>Dữ liệu địa phương</span><span>Tuyến đường thực</span><span>Lập kế hoạch bằng AI</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ua-container relative z-20 -mt-20" aria-label="UrbanAgent AI Planner">
          <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[var(--ua-shadow-lg)] sm:p-6 lg:p-8">
            <div className="flex gap-1 overflow-x-auto border-b border-[var(--ua-border)] pb-3">
              <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--ua-blue-50)] px-4 py-2.5 text-sm font-extrabold text-[var(--ua-blue-700)]"><Sparkles size={16} /> Hỏi UrbanAgent</button>
              <button type="button" onClick={() => navigate('/map-data')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--ua-text-muted)] hover:bg-slate-50"><MapPin size={16} /> Khám phá địa điểm</button>
              <button type="button" onClick={() => navigate('/urban-agent')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--ua-text-muted)] hover:bg-slate-50"><Map size={16} /> Chuyến đi</button>
              <button type="button" onClick={() => navigate('/saved')} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--ua-text-muted)] hover:bg-slate-50"><Heart size={16} /> Đã lưu</button>
            </div>
            <label className="mt-5 block text-sm font-extrabold text-[var(--ua-navy-950)]" htmlFor="landing-planner-prompt">Bạn muốn trải nghiệm Đà Nẵng như thế nào?</label>
            <textarea id="landing-planner-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-3 min-h-28 w-full resize-none rounded-[14px] border border-[var(--ua-border)] bg-[var(--ua-blue-50)] p-4 text-base leading-7 outline-none placeholder:text-[var(--ua-text-muted)] focus:border-[var(--ua-blue-500)] focus:bg-white" placeholder="Chiều nay tôi muốn một quán café yên tĩnh gần biển, ăn hải sản vào buổi tối rồi đi dạo ở đâu đó." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              {[{ icon: CalendarDays, label: 'Khi nào', value: 'Hôm nay' }, { icon: Navigation, label: 'Khu vực', value: 'Gần tôi' }, { icon: Users, label: 'Số người', value: '2 người' }, { icon: Waves, label: 'Phong cách', value: 'Thư giãn' }].map((item) => (
                <div key={item.label} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--ua-border)] px-3.5">
                  <item.icon className="text-[var(--ua-blue-600)]" size={18} />
                  <span><small className="block text-[11px] font-bold text-[var(--ua-text-muted)]">{item.label}</small><strong className="text-sm text-[var(--ua-navy-950)]">{item.value}</strong></span>
                </div>
              ))}
              <ProductButton type="button" onClick={() => openPlanner()} className="min-h-14 whitespace-nowrap">Tạo lịch trình <Sparkles size={16} /></ProductButton>
            </div>
          </div>
        </section>

        <section className="ua-container grid gap-3 py-12 sm:grid-cols-2 xl:grid-cols-4">
          <FeatureCard icon={<Sparkles size={21} />} title="AI cá nhân hóa">Hiểu sở thích, thời gian và hoàn cảnh của bạn.</FeatureCard>
          <FeatureCard icon={<MapPin size={21} />} title="Dữ liệu địa phương">Khám phá những địa điểm thật tại Đà Nẵng.</FeatureCard>
          <FeatureCard icon={<Route size={21} />} title="Tuyến đường thông minh">Kết nối các điểm thành một chuyến đi hợp lý.</FeatureCard>
          <FeatureCard icon={<Zap size={21} />} title="Lịch trình linh hoạt">Thay đổi kế hoạch và tính toán lại bất cứ lúc nào.</FeatureCard>
        </section>

        <section id="explore" className="ua-section bg-white">
          <div className="ua-container">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeader eyebrow={<><Compass size={15} /> Đi đâu ở Đà Nẵng</>} title="Khám phá Đà Nẵng" description="Những trải nghiệm đáng thử cho mọi kiểu du khách." />
              <button type="button" onClick={() => navigate('/map-data')} className="ua-button ua-button--secondary self-start">Xem bản đồ khám phá <ArrowRight size={16} /></button>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {destinationCards.map((card) => (
                <button key={card.title} type="button" onClick={() => openDiscovery(card.query)} className="ua-image-card min-h-[360px] text-left">
                  <img src={card.image} alt={card.title} loading="lazy" />
                  <span className="absolute right-4 top-4 z-10 rounded-lg bg-white/92 p-2 text-[var(--ua-blue-700)]" aria-label={`Khám phá ${card.title}`}><Heart size={17} /></span>
                  <span className="absolute inset-x-0 bottom-0 z-10 p-5 text-white"><small className="font-bold text-white/72">{card.tag}</small><strong className="mt-1 block text-xl">{card.title}</strong></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="ua-section bg-[var(--ua-blue-50)]">
          <div className="ua-container">
            <SectionHeader align="center" eyebrow={<><Search size={15} /> Bắt đầu từ cảm hứng</>} title="Hôm nay bạn muốn gì?" description="Chọn một cảm hứng, UrbanAgent sẽ đưa bạn vào đúng luồng khám phá hiện có." />
            <div className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-3">
              {moods.map((mood) => <button key={mood.label} type="button" onClick={() => openDiscovery(mood.query)} className="ua-chip"><mood.icon size={16} /> {mood.label}</button>)}
            </div>
          </div>
        </section>

        <section id="experience" className="ua-section bg-white">
          <div className="ua-container grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <SectionHeader eyebrow={<><Sparkles size={15} /> Từ ý định đến hành trình</>} title={<>Một yêu cầu.<br />Một lịch trình hoàn chỉnh.</>} description="UrbanAgent hiểu cả câu chuyện của chuyến đi, sau đó dùng engine hiện có để gợi ý, xếp lịch và giải thích từng điểm dừng." />
              <div className="mt-8 space-y-4">
                {[['Hiểu ý định', 'Không chỉ khớp từ khóa trong câu hỏi.'], ['Kết nối địa điểm', 'Mỗi điểm được chọn như một phần của cả chuyến đi.'], ['Thích ứng theo hoàn cảnh', 'Thời gian, vị trí và sở thích có thể thay đổi kế hoạch.'], ['Giải thích được', 'Bạn biết vì sao một địa điểm phù hợp.']].map(([title, detail]) => (
                  <div key={title} className="flex gap-3"><span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ua-blue-100)] text-[var(--ua-blue-700)]"><Check size={14} /></span><div><strong className="text-[var(--ua-navy-950)]">{title}</strong><p className="mt-1 text-sm leading-6 text-[var(--ua-text-muted)]">{detail}</p></div></div>
                ))}
              </div>
              <button type="button" onClick={() => openPlanner('Chiều nay tôi muốn ngồi cafe yên tĩnh gần biển, ăn hải sản rồi đi dạo thư giãn.')} className="ua-button ua-button--primary mt-8">Thử UrbanAgent <ArrowRight size={16} /></button>
            </div>
            <div className="ua-card overflow-hidden p-4 sm:p-6">
              <div className="rounded-[16px] bg-[var(--ua-navy-950)] p-5 text-white"><small className="font-bold text-[#8fdcff]">Yêu cầu minh họa</small><p className="mt-2 leading-7">“Tôi muốn chiều nay ngồi café yên tĩnh gần biển, khoảng 7 giờ ăn hải sản, sau đó đi dạo thư giãn.”</p></div>
              <div className="mt-5 flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ua-blue-600)] text-white"><Sparkles size={17} /></span><div><strong>Mình đã sắp xếp một buổi chiều nhẹ nhàng</strong><p className="text-xs text-[var(--ua-text-muted)]">Ví dụ giải thích sản phẩm, không phải chuyến đi hiện tại.</p></div></div>
              <div className="relative mt-6 space-y-1 before:absolute before:bottom-5 before:left-[41px] before:top-5 before:w-px before:bg-[var(--ua-border)]">
                {timeline.map((stop) => <div key={stop.time} className="relative grid grid-cols-[66px_1fr] gap-4 rounded-xl p-3 hover:bg-[var(--ua-blue-50)]"><strong className="z-10 rounded-lg bg-white py-1 text-center text-sm text-[var(--ua-blue-700)]">{stop.time}</strong><div><strong className="text-[var(--ua-navy-950)]">{stop.title}</strong><p className="mt-1 text-xs leading-5 text-[var(--ua-text-muted)]">{stop.detail}</p></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="ua-section bg-[var(--ua-blue-50)]">
          <div className="ua-container grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
            <div className="relative min-h-[480px] overflow-hidden rounded-[24px]">
              <img src="/images/da-nang/dragon-bridge.jpg" alt="Cầu Rồng bên sông Hàn" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,30,55,.05),rgba(5,30,55,.8))]" />
              <div className="absolute inset-x-5 bottom-5 rounded-[16px] border border-white/25 bg-white/92 p-5 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-3"><div><small className="font-bold text-[var(--ua-blue-700)]">Minh họa trực quan</small><strong className="mt-1 block text-lg">Xem cả ngày trong một bản đồ</strong></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ua-blue-600)] text-white"><Route size={19} /></span></div>
                <p className="mt-2 text-sm leading-6 text-[var(--ua-text-muted)]">Trong sản phẩm thật, bản đồ dùng các điểm dừng và route geometry từ chuyến đi hiện tại.</p>
              </div>
            </div>
            <div id="why">
              <SectionHeader eyebrow={<><ShieldCheck size={15} /> Thiết kế để đi được thật</>} title="Vì sao khám phá cùng UrbanAgent?" />
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <FeatureCard icon={<Search size={20} />} title="Không chỉ tìm kiếm">Hiểu cả yêu cầu thay vì chỉ khớp từ khóa.</FeatureCard>
                <FeatureCard icon={<CalendarDays size={20} />} title="Lên kế hoạch theo cả ngày">Nối địa điểm thành một lịch trình thực tế.</FeatureCard>
                <FeatureCard icon={<Compass size={20} />} title="Hiểu Đà Nẵng">Thiết kế quanh khu vực và bối cảnh địa phương.</FeatureCard>
                <FeatureCard icon={<Sparkles size={20} />} title="Cá nhân hóa">Thích ứng theo sở thích, ngân sách và nhịp đi.</FeatureCard>
              </div>
            </div>
          </div>
        </section>

        <section id="business" className="ua-section bg-white">
          <div className="ua-container grid items-center gap-10 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <SectionHeader eyebrow={<><BriefcaseBusiness size={15} /> UrbanAgent for Business</>} title="Hiểu nơi khách hàng của bạn đang ở." description="So sánh khu vực dựa trên nhu cầu, khả năng tiếp cận, cạnh tranh và hoạt động xung quanh." />
              <button type="button" onClick={() => navigate('/seller')} className="ua-button ua-button--secondary mt-8">Khám phá Business Insights <ArrowRight size={16} /></button>
            </div>
            <div className="ua-card p-6 sm:p-8">
              <div className="rounded-[16px] bg-[var(--ua-blue-50)] p-5"><small className="font-bold text-[var(--ua-blue-700)]">Câu hỏi kinh doanh</small><p className="mt-2 text-xl font-extrabold">“Nên mở study café ở đâu tại Đà Nẵng?”</p></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{['Nhu cầu sinh viên cao', 'Cạnh tranh vừa', 'Lưu lượng buổi tối tốt', 'Gần cụm trường đại học'].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[var(--ua-border)] p-4 text-sm font-bold"><Check className="text-[var(--ua-aqua)]" size={17} /> {item}</div>)}</div>
            </div>
          </div>
        </section>

        <section className="ua-container pb-20">
          <div className="relative overflow-hidden rounded-[24px] bg-[var(--ua-navy-950)] px-6 py-16 text-white sm:px-12 lg:px-16">
            <img src="/images/da-nang/golden-bridge-sunset.webp" alt="Cầu Vàng trong ánh hoàng hôn" className="absolute inset-0 h-full w-full object-cover opacity-45" loading="lazy" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,31,56,.96),rgba(7,31,56,.54))]" />
            <div className="relative max-w-3xl"><div className="ua-eyebrow text-[#bceaff]">Sẵn sàng khám phá?</div><h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">Trải nghiệm Đà Nẵng tiếp theo bắt đầu bằng một câu hỏi.</h2><div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => openPlanner()} className="ua-button ua-button--coral">Hỏi UrbanAgent <Sparkles size={16} /></button><button type="button" onClick={() => navigate('/map-data')} className="ua-button border border-white/35 bg-white/12 text-white">Khám phá Đà Nẵng</button></div></div>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--ua-navy-950)] py-14 text-white">
        <div className="ua-container grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div><BrandMark inverse /><p className="mt-5 max-w-xs text-sm leading-6 text-white/60">Một câu hỏi, một hành trình Đà Nẵng rõ ràng và có thể chỉnh sửa.</p></div>
          {[['Khám phá', ['Địa điểm', 'Trải nghiệm', 'AI Planner', 'Đã lưu']], ['UrbanAgent', ['Giới thiệu', 'Cách hoạt động', 'Doanh nghiệp']], ['Hỗ trợ', ['Trợ giúp', 'Quyền riêng tư', 'Điều khoản']]].map(([title, links]) => <div key={title as string}><strong>{title}</strong><div className="mt-4 space-y-3 text-sm text-white/60">{(links as string[]).map((link) => <p key={link}>{link}</p>)}</div></div>)}
        </div>
        <div className="ua-container mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between"><span>© 2026 UrbanAgent AI.</span><span>Built for Da Nang, Vietnam.</span></div>
      </footer>
    </div>
  );
}
