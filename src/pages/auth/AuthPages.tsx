import { type FormEvent, type ReactNode, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import type { AppRole } from '../../auth/authContextValue';

const roleDestinations: Record<AppRole, string> = {
  customer: '/urban-agent',
  seller: '/seller',
  admin: '/admin',
};

export function LoginPage() {
  const {
    user,
    role,
    loading,
    firebaseReady,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signInWithDemo,
    registerWithEmail,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const demoAuthMode = import.meta.env.VITE_DEMO_AUTH_MODE === 'true';

  if (loading) return <AuthLoading />;
  if (user && role) return <Navigate to={from || roleDestinations[role]} replace />;
  if (user && !role) return <Navigate to="/chon-vai-tro" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError('');
    try {
      if (mode === 'register' && password !== confirmPassword) {
        throw new Error('Mật khẩu nhập lại không khớp.');
      }
      await (mode === 'login' ? signInWithEmail(email, password) : registerWithEmail(email, password));
      navigate('/chon-vai-tro', { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không thể đăng nhập.');
    } finally {
      setSubmitting(false);
    }
  };

  const signInGoogle = async () => {
    setSubmitting(true);
    setLocalError('');
    try {
      await signInWithGoogle();
      navigate('/chon-vai-tro', { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không thể đăng nhập bằng Google.');
    } finally {
      setSubmitting(false);
    }
  };

  const enterDemo = async () => {
    setSubmitting(true);
    setLocalError('');
    try {
      await signInWithDemo();
      navigate('/urban-agent', { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không thể vào chế độ phát triển.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      badge="Danang UrbanAgent"
      title={mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng kí tài khoản'}
      subtitle="Lưu lịch trình, phản hồi và phân tích kinh doanh theo đúng vai trò của bạn."
    >
      <form onSubmit={submit} className="space-y-4">
        <Input icon={<Mail size={18} />} type="email" value={email} onChange={setEmail} placeholder="Email" />
        <Input icon={<LockKeyhole size={18} />} type="password" value={password} onChange={setPassword} placeholder="Mật khẩu" />
        {mode === 'register' && (
          <Input
            icon={<LockKeyhole size={18} />}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Nhập lại mật khẩu"
          />
        )}
        {(localError || authError) && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{localError || authError}</p>}
        <button
          type="submit"
          disabled={!firebaseReady || submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 className="animate-spin" size={18} />}
          {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
        {demoAuthMode && (
          <button
            type="button"
            onClick={enterDemo}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserRound size={18} />
            Chế độ phát triển
          </button>
        )}
        <button
          type="button"
          onClick={signInGoogle}
          disabled={!firebaseReady || submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={18} />
          Đăng nhập bằng Google
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setConfirmPassword('');
            setLocalError('');
          }}
          className="w-full text-sm font-medium text-cyan-700 hover:text-cyan-800"
        >
          {mode === 'login' ? 'Chưa có tài khoản? Tạo tài khoản mới' : 'Đã có tài khoản? Quay lại đăng nhập'}
        </button>
      </form>
    </AuthShell>
  );
}

export function AdminLoginPage() {
  const { user, role, loading, authError, signInWithAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  if (loading) return <AuthLoading />;
  if (user && role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError('');
    try {
      await signInWithAdmin(email, password);
      navigate('/admin', { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không thể đăng nhập admin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell badge="Admin Control Panel" title="Đăng nhập quản trị viên" subtitle="Khu vực riêng cho duyệt dữ liệu, quản lý hệ thống và giám sát AI.">
      <form onSubmit={submit} className="space-y-4">
        <Input icon={<ShieldCheck size={18} />} type="text" value={email} onChange={setEmail} placeholder="Tài khoản admin" />
        <Input icon={<LockKeyhole size={18} />} type="password" value={password} onChange={setPassword} placeholder="Mật khẩu" />
        {(localError || authError) && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{localError || authError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 className="animate-spin" size={18} />}
          Vào trang admin
        </button>
      </form>
    </AuthShell>
  );
}

export function RoleSelectionPage() {
  const { user, role, loading, setUserRole } = useAuth();
  const navigate = useNavigate();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role) return <Navigate to={roleDestinations[role]} replace />;

  const chooseRole = (nextRole: AppRole) => {
    setUserRole(nextRole);
    navigate(roleDestinations[nextRole], { replace: true });
  };

  return (
    <AuthShell badge="Thiết lập lần đầu" title="Bạn muốn sử dụng hệ thống với vai trò nào?" subtitle="Lựa chọn này sẽ được ghi nhớ cho các lần đăng nhập sau.">
      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => chooseRole('customer')} className="rounded-xl border border-cyan-100 bg-cyan-50 p-5 text-left transition hover:border-cyan-300 hover:bg-cyan-100">
          <UserRound className="mb-4 text-cyan-700" size={28} />
          <h2 className="text-lg font-bold text-slate-950">Khách du lịch</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Chat với Urban Agent, xem bản đồ lịch trình, chọn sở thích và gửi phản hồi nhanh.</p>
        </button>
        <button onClick={() => chooseRole('seller')} className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-100">
          <BriefcaseBusiness className="mb-4 text-emerald-700" size={28} />
          <h2 className="text-lg font-bold text-slate-950">Người kinh doanh</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Phân tích khu vực tiềm năng, xem chỉ số cơ hội và quản lý hồ sơ địa điểm.</p>
        </button>
      </div>
    </AuthShell>
  );
}

function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8fb] text-sm font-semibold text-slate-600">
      Đang kiểm tra phiên đăng nhập...
    </main>
  );
}

function AuthShell({ badge, title, subtitle, children }: { badge: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#eef4f7] px-4 py-6 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_440px]">
        <section className="relative hidden min-h-[640px] overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl lg:block">
          <img src="/src/assets/hero.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          <div className="relative flex h-full min-h-[640px] flex-col justify-between p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-sm font-semibold backdrop-blur">
              <MapPin size={16} />
              {badge}
            </div>

            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Danang UrbanAgent</p>
              <h1 className="text-5xl font-bold leading-tight">Trợ lý đô thị thông minh cho Đà Nẵng</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-100">
                Tạo lịch trình, chọn vị trí kinh doanh và quản trị dữ liệu AI trong một không gian gọn gàng, có ngữ cảnh.
              </p>
              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                {['Urban Agent', 'Site Insight', 'AI Control'].map((item) => (
                  <div key={item} className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[440px] rounded-2xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur md:p-8">
          <div className="mb-8">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20">
              <Sparkles size={22} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">{badge}</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

function Input({
  icon,
  type,
  value,
  onChange,
  placeholder,
}: {
  icon: ReactNode;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-500 shadow-sm transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
      {icon}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
      />
    </label>
  );
}
