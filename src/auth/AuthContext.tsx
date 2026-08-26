import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type AuthError,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, firebaseReady } from '../services/firebase';
import { apiClient } from '../utils/apiClient';
import { demoAuthMode } from '../config/runtimeFlags';
import { AuthContext, type AppRole, type AuthContextValue } from './authContextValue';

const roleKey = (uid: string) => `danang-urban-agent-role:${uid}`;
const demoSessionKey = 'danang-urban-agent-demo-session';

function createDemoUser() {
  return {
    uid: 'demo-traveler',
    email: 'dev-traveler@urbanagent.local',
    displayName: 'Khách phát triển',
    photoURL: null,
    phoneNumber: null,
    providerId: 'local-demo',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => undefined,
    getIdToken: async () => 'urbanagent-demo-local-token',
    getIdTokenResult: async () => ({ token: 'urbanagent-demo-local-token' }) as Awaited<ReturnType<User['getIdTokenResult']>>,
    reload: async () => undefined,
    toJSON: () => ({ uid: 'demo-traveler', email: 'dev-traveler@urbanagent.local', displayName: 'Khách phát triển' }),
  } as User;
}

function hasDemoSession() {
  return demoAuthMode && sessionStorage.getItem(demoSessionKey) === 'true';
}

function toVietnameseAuthError(error: unknown) {
  const code = (error as AuthError)?.code || '';
  if (code === 'auth/configuration-not-found') {
    return 'Firebase Auth chưa được cấu hình cho project này. Hãy bật Authentication và phương thức đăng nhập trong Firebase Console.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain hiện tại chưa được thêm vào Authorized domains của Firebase Authentication.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Email hoặc mật khẩu không đúng.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Email này đã được đăng ký. Vui lòng đăng nhập.';
  }
  if (code === 'auth/weak-password') {
    return 'Mật khẩu cần có ít nhất 6 ký tự.';
  }
  return error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.';
}

async function ensureUserDocument(user: User, role?: AppRole | null) {
  try {
    const result = await apiClient.post('/api/auth/ensure-user', {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email || '',
      phone: user.phoneNumber || '',
      photoURL: user.photoURL || '',
      role: role || 'customer',
      language: localStorage.getItem('danang-urbanagent-language') || 'vi',
    });
    return result || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (hasDemoSession() ? createDemoUser() : null));
  const [role, setRole] = useState<AppRole | null>(() => (hasDemoSession() ? 'customer' : null));
  const [loading, setLoading] = useState(() => Boolean(auth) && !hasDemoSession());
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (hasDemoSession()) return undefined;
    if (!auth) return undefined;
    const activeAuth = auth;
    setPersistence(activeAuth, browserLocalPersistence)
      .then(() => getRedirectResult(activeAuth))
      .then((result) => {
        if (!result?.user) return;
        const localRole = localStorage.getItem(roleKey(result.user.uid)) as AppRole | null;
        setUser(result.user);
        setRole(localRole);
        void ensureUserDocument(result.user, localRole);
      })
      .catch((error) => {
        setAuthError(toVietnameseAuthError(error));
      });
    return onAuthStateChanged(auth, (nextUser) => {
      if (hasDemoSession()) {
        setUser(createDemoUser());
        setRole('customer');
        setLoading(false);
        return;
      }
      setUser(nextUser);
      const localRole = nextUser ? (localStorage.getItem(roleKey(nextUser.uid)) as AppRole | null) : null;
      setRole(localRole);
      if (nextUser) {
        void ensureUserDocument(nextUser, localRole).then((result) => {
          const savedRole = result?.user?.role;
          if (!savedRole || localRole || result?.created) return;
          localStorage.setItem(roleKey(nextUser.uid), savedRole);
          setRole(savedRole);
        });
      }
      setLoading(false);
    });
  }, []);

  const runAuth = async <T,>(action: () => Promise<T>) => {
    setAuthError('');
    try {
      return await action();
    } catch (error) {
      const message = toVietnameseAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user || auth?.currentUser || null,
      role,
      loading,
      firebaseReady,
      authError,
      signInWithGoogle: async () => {
        const activeAuth = auth;
        if (!activeAuth) throw new Error('Firebase is not configured.');
        return runAuth(async () => {
          await setPersistence(activeAuth, browserLocalPersistence);
          const result = await signInWithPopup(activeAuth, new GoogleAuthProvider());
          const localRole = localStorage.getItem(roleKey(result.user.uid)) as AppRole | null;
          setUser(result.user);
          setRole(localRole);
          void ensureUserDocument(result.user, localRole);
          return result.user;
        });
      },
      signInWithEmail: async (email: string, password: string) => {
        const activeAuth = auth;
        if (!activeAuth) throw new Error('Firebase is not configured.');
        return runAuth(async () => {
          const result = await signInWithEmailAndPassword(activeAuth, email, password);
          const localRole = localStorage.getItem(roleKey(result.user.uid)) as AppRole | null;
          setUser(result.user);
          setRole(localRole);
          void ensureUserDocument(result.user, localRole);
          return result.user;
        });
      },
      signInWithDemo: async () => {
        if (!demoAuthMode) throw new Error('Chế độ phát triển đang tắt.');
        const demoUser = createDemoUser();
        sessionStorage.setItem(demoSessionKey, 'true');
        localStorage.setItem(roleKey(demoUser.uid), 'customer');
        setUser(demoUser);
        setRole('customer');
        setAuthError('');
        return demoUser;
      },
      registerWithEmail: async (email: string, password: string) => {
        const activeAuth = auth;
        if (!activeAuth) throw new Error('Firebase is not configured.');
        return runAuth(async () => {
          const result = await createUserWithEmailAndPassword(activeAuth, email, password);
          setUser(result.user);
          setRole(null);
          void ensureUserDocument(result.user, 'customer');
          return result.user;
        });
      },
      setUserRole: (nextRole: AppRole) => {
        const activeUser = user || auth?.currentUser;
        if (!activeUser) return;
        localStorage.setItem(roleKey(activeUser.uid), nextRole);
        setRole(nextRole);
        void apiClient.post('/api/auth/role', {
          role: nextRole,
          language: localStorage.getItem('danang-urbanagent-language') || 'vi',
        });
      },
      signOut: async () => {
        const wasDemo = hasDemoSession();
        sessionStorage.removeItem(demoSessionKey);
        if (wasDemo) {
          setUser(null);
          setRole(null);
          return;
        }
        if (!auth) {
          setUser(null);
          setRole(null);
          return;
        }
        await firebaseSignOut(auth);
        setUser(null);
        setRole(null);
      },
    }),
    [authError, loading, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
