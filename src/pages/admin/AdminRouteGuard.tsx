import { useEffect, useState } from 'react';
import { LogOut, RefreshCw, ShieldX } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { ApiClientError, apiClient } from '../../utils/apiClient';
import './admin.css';

type AdminGuardState = 'AUTH_LOADING' | 'ADMIN_VERIFYING' | 'ADMIN_ALLOWED' | 'ADMIN_FORBIDDEN' | 'AUTH_REQUIRED' | 'ERROR';
interface AdminVerification {
  state: AdminGuardState;
  uid: string | null;
}

export function AdminRouteSkeleton() {
  return (
    <div className="ua-admin-guard-loading" data-admin-loading="skeleton" role="status">
      <div className="ua-admin-guard-loading__bar" />
      <div className="ua-admin-guard-loading__grid">
        {[1, 2, 3].map((item) => <div key={item} />)}
      </div>
      <span className="sr-only">Đang xác minh quyền quản trị...</span>
    </div>
  );
}

function AdminGuardMessage({
  state,
  retry,
}: {
  state: Exclude<AdminGuardState, 'AUTH_LOADING' | 'ADMIN_VERIFYING' | 'ADMIN_ALLOWED'>;
  retry: () => void;
}) {
  const { language } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const forbidden = state === 'ADMIN_FORBIDDEN';
  const authRequired = state === 'AUTH_REQUIRED';

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <main className="ua-admin-access-state" data-admin-auth-state={state}>
      <section>
        <span className="ua-admin-access-state__icon"><ShieldX size={28} /></span>
        <p className="ua-admin-access-state__eyebrow">UrbanAgent Admin</p>
        <h1>{forbidden
          ? (language === 'vi' ? 'Bạn không có quyền truy cập khu vực quản trị.' : 'You do not have access to the Admin workspace.')
          : authRequired
            ? (language === 'vi' ? 'Phiên đăng nhập không còn hợp lệ.' : 'Your sign-in session is no longer valid.')
            : (language === 'vi' ? 'Không thể xác minh quyền quản trị.' : 'Admin access could not be verified.')}</h1>
        <p>{forbidden
          ? (language === 'vi' ? 'Tài khoản Firebase hiện tại không có custom claim admin.' : 'The current Firebase account does not have the Admin custom claim.')
          : (language === 'vi' ? 'Dữ liệu quản trị chưa được tải. Bạn có thể thử xác minh lại.' : 'No Admin data was loaded. You can retry verification.')}</p>
        <div className="ua-admin-access-state__actions">
          <Link to="/urban-agent">{language === 'vi' ? 'Quay lại UrbanAgent' : 'Back to UrbanAgent'}</Link>
          {!forbidden && !authRequired && (
            <button type="button" onClick={retry}><RefreshCw size={16} />{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
          )}
          <button type="button" onClick={() => void handleSignOut()}><LogOut size={16} />{language === 'vi' ? 'Đăng xuất' : 'Sign out'}</button>
        </div>
      </section>
    </main>
  );
}

export function AdminRouteGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [verification, setVerification] = useState<AdminVerification>({
    state: loading ? 'AUTH_LOADING' : 'ADMIN_VERIFYING',
    uid: null,
  });

  useEffect(() => {
    if (loading || !user) return undefined;

    let active = true;
    void apiClient.get('/api/admin/me')
      .then((identity) => {
        if (!active) return;
        setVerification({
          state: identity?.admin === true ? 'ADMIN_ALLOWED' : 'ADMIN_FORBIDDEN',
          uid: user.uid,
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 401) {
          setVerification({ state: 'AUTH_REQUIRED', uid: user.uid });
        } else if (error instanceof ApiClientError && error.status === 403) {
          setVerification({ state: 'ADMIN_FORBIDDEN', uid: user.uid });
        } else {
          setVerification({ state: 'ERROR', uid: user.uid });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt, loading, user]);

  if (!loading && !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  if (loading || !user || verification.uid !== user.uid) return <AdminRouteSkeleton />;
  if (verification.state === 'ADMIN_ALLOWED') return <Outlet />;
  return (
    <AdminGuardMessage
      state={verification.state as Exclude<AdminGuardState, 'AUTH_LOADING' | 'ADMIN_VERIFYING' | 'ADMIN_ALLOWED'>}
      retry={() => {
        setVerification({ state: 'ADMIN_VERIFYING', uid: null });
        setAttempt((value) => value + 1);
      }}
    />
  );
}
