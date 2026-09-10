// Hooks du domaine sécurité : journal d'audit et limitation de tentatives.

import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { fetchAuditLog, recordAudit } from '../services/auditService';
import {
  checkRateLimit,
  clearRateLimit,
  registerFailure,
} from '../services/rateLimiter';
import type {
  AuditAction,
  AuditFilters,
  AuditResult,
  PaginatedAudit,
  RateLimitState,
} from '../types';

const auditKeys = {
  all: ['security', 'audit'] as const,
  list: (filters: AuditFilters) => [...auditKeys.all, 'list', filters] as const,
};

interface UseAuditLogResult {
  data: PaginatedAudit | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  totalPages: number;
  // Faux lorsque l'utilisateur n'a pas le rôle requis : l'écran affiche
  // un refus explicite plutôt qu'une liste vide.
  isAllowed: boolean;
}

/**
 * Lecture du journal, réservée aux administrateurs.
 * La restriction est appliquée ici et non seulement à l'affichage :
 * sans le rôle, aucune requête n'est émise.
 */
export function useAuditLog(filters: AuditFilters = {}): UseAuditLogResult {
  const role = useAuthStore((state) => state.role);
  const isAllowed = role === 'admin';

  const pageSize = filters.pageSize ?? 25;

  const query = useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => fetchAuditLog(filters),
    enabled: isAllowed,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    totalPages: query.data ? Math.ceil(query.data.total / pageSize) : 0,
    isAllowed,
  };
}

/**
 * Journalisation d'une action, avec l'utilisateur courant renseigné
 * automatiquement. À appeler depuis un onSuccess de mutation.
 */
export function useAudit() {
  const user = useAuthStore((state) => state.user);

  return useCallback(
    (action: AuditAction, result: AuditResult, details?: string) => {
      void recordAudit({
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        action,
        result,
        details,
      });
    },
    [user],
  );
}

interface UseLoginRateLimitResult {
  state: RateLimitState;
  /** À appeler avant d'émettre la requête de connexion. */
  check: (email: string) => RateLimitState;
  /** À appeler après un échec d'authentification. */
  registerFailedAttempt: (email: string) => RateLimitState;
  /** À appeler après une connexion réussie. */
  reset: (email: string) => void;
}

const IDLE_STATE: RateLimitState = {
  isBlocked: false,
  remaining: 3,
  blockedUntil: null,
  secondsRemaining: 0,
};

/**
 * Limitation des tentatives de connexion, par adresse e-mail.
 * Chaque échec est journalisé, et le blocage lui-même l'est aussi :
 * une série de tentatives sur un compte doit laisser une trace.
 */
export function useLoginRateLimit(): UseLoginRateLimitResult {
  const [state, setState] = useState<RateLimitState>(IDLE_STATE);
  const audit = useAudit();

  const check = useCallback((email: string) => {
    const next = checkRateLimit(email);
    setState(next);
    return next;
  }, []);

  const registerFailedAttempt = useCallback(
    (email: string) => {
      const next = registerFailure(email);
      setState(next);

      void recordAudit({
        userId: null,
        userEmail: email,
        action: next.isBlocked ? 'login.blocked' : 'login.failure',
        result: next.isBlocked ? 'refuse' : 'echec',
        details: next.isBlocked
          ? `Blocage après 3 tentatives, ${next.secondsRemaining} s restantes`
          : `Tentative échouée, ${next.remaining} restantes`,
      });

      return next;
    },
    [],
  );

  const reset = useCallback(
    (email: string) => {
      clearRateLimit(email);
      setState(IDLE_STATE);
      audit('login.success', 'succes', email);
    },
    [audit],
  );

  return { state, check, registerFailedAttempt, reset };
}