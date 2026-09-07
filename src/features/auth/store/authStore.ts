// Store de la session : qui est connecté, avec quel token, jusqu'à quand
// Sauvegardé en localStorage pour survivre à un F5

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTH_STORAGE_KEY } from '@/shared/config/constants';
import { clearSentryUser, setSentryUser } from '@/features/monitoring';
import type { Role } from '@/shared/types';
import type { Session, User } from '../types';

// Durée de la session simulée (30 min)
export const SESSION_DURATION_MS = 30 * 60 * 1000;

// Nombre d'essais de login avant blocage
export const MAX_LOGIN_ATTEMPTS = 3;

// Durée du blocage après trop d'essais
export const LOGIN_LOCKOUT_MS = 60 * 1000;

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  lockedUntil: number | null;

  setSession: (session: Session) => void;
  logout: () => void;
  // Prolonge la session sans redemander les identifiants
  refreshExpiry: () => void;
  registerFailedAttempt: () => void;
  resetFailedAttempts: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      expiresAt: null,
      isAuthenticated: false,
      failedAttempts: 0,
      lockedUntil: null,

      setSession: (session) => {
        set({
          user: session.user,
          token: session.token,
          role: session.user.role,
          expiresAt: session.expiresAt,
          isAuthenticated: true,
          failedAttempts: 0,
          lockedUntil: null,
        });
        setSentryUser(session.user.id, session.user.role);
      },

      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          expiresAt: null,
          isAuthenticated: false,
        });
          clearSentryUser();
      },

      refreshExpiry: () => {
        if (!get().isAuthenticated) return;
        set({ expiresAt: Date.now() + SESSION_DURATION_MS });
      },

      registerFailedAttempt: () => {
        const attempts = get().failedAttempts + 1;
        set({
          failedAttempts: attempts,
          lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCKOUT_MS : null,
        });
      },

      resetFailedAttempts: () => set({ failedAttempts: 0, lockedUntil: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      // On garde que la session, pas les compteurs de tentatives
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
      // Si le token a expiré pendant l'absence, on déconnecte direct
      onRehydrateStorage: () => (state) => {
        if (state?.expiresAt && state.expiresAt < Date.now()) {
          state.logout();
        }
      },
    },
  ),
);