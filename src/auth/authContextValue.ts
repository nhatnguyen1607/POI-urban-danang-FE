import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AppRole = 'customer' | 'seller' | 'admin';

export interface AuthContextValue {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  firebaseReady: boolean;
  authError: string;
  signInWithGoogle: () => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithDemo: () => Promise<User>;
  registerWithEmail: (email: string, password: string) => Promise<User>;
  setUserRole: (role: AppRole) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
