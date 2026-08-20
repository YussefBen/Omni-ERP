// Donne l'utilisateur connecté, et gère le rafraîchissement auto de la session
// (pas un hook "data fetching" classique, donc pas la forme du socle)

import { useEffect, useState } from 'react';
import type { Role } from '@/shared/types';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

// Seuil avant expiration où on rafraîchit tout seul
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
// Fréquence de vérification
const CHECK_INTERVAL_MS = 30 * 1000;

interface UseSessionResult {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  // Vrai tant qu'on n'a pas fini de relire le localStorage
  isLoading: boolean;
  logout: () => void;
}

export function useSession(): UseSessionResult {
  const [isLoading, setIsLoading] = useState(() => !useAuthStore.persist.hasHydrated());

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const logout = useAuthStore((s) => s.logout);
  const refreshExpiry = useAuthStore((s) => s.refreshExpiry);

  // Si la relecture du localStorage était déjà finie, isLoading est déjà à false
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setIsLoading(false));
    return unsubscribe;
  }, []);

  // Vérifie régulièrement si la session doit être rafraîchie ou coupée
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return;

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        logout();
      } else if (remaining < REFRESH_THRESHOLD_MS) {
        refreshExpiry();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, expiresAt, logout, refreshExpiry]);

  return { user, role, isAuthenticated, isLoading, logout };
}