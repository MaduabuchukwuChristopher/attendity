import type { AuthenticatedUser } from '@qr/types';
import { create } from 'zustand';

interface AuthState {
  readonly user: AuthenticatedUser | null;
  readonly isAuthenticated: boolean;
  readonly accessToken: string | null;
  readonly status: 'checking' | 'authenticated' | 'guest';
  setSession: (user: AuthenticatedUser, accessToken: string) => void;
  updateUserPresentation: (
    patch: Partial<Pick<AuthenticatedUser, 'fullName' | 'photoUrl'>>,
  ) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  accessToken: null,
  status: 'checking',
  setSession: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, status: 'authenticated' }),
  updateUserPresentation: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),
  clearSession: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, status: 'guest' }),
}));
