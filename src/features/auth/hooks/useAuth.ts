// Hooks pour se connecter et s'inscrire
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../services/authService';
import { MAX_LOGIN_ATTEMPTS, SESSION_DURATION_MS, useAuthStore } from '../store/authStore';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types';

interface UseLoginResult {
  mutate: (payload: LoginPayload) => void;
  mutateAsync: (payload: LoginPayload) => Promise<AuthResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  // Vrai si bloqué (trop d'essais)
  isLocked: boolean;
  // Essais restants avant blocage
  attemptsRemaining: number;
}

// Login avec blocage après 3 essais ratés
export function useLogin(): UseLoginResult {
  const failedAttempts = useAuthStore((s) => s.failedAttempts);
  const lockedUntil = useAuthStore((s) => s.lockedUntil);
  const setSession = useAuthStore((s) => s.setSession);
  const registerFailedAttempt = useAuthStore((s) => s.registerFailedAttempt);

  // On ne peut pas appeler Date.now() direct dans le rendu, donc on passe par un état
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const updateLockState = () => setIsLocked(lockedUntil !== null && lockedUntil > Date.now());

    // Premier calcul via un timer, pas en direct dans l'effet
    const timeoutId = setTimeout(updateLockState, 0);
    const interval = setInterval(updateLockState, 1000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [lockedUntil]);

  const mutation = useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: (payload) => {
      if (isLocked) {
        return Promise.reject(
          new Error('Trop de tentatives échouées, réessayez dans un instant.'),
        );
      }
      return loginRequest(payload);
    },
    onSuccess: (data) => {
      setSession({ ...data, expiresAt: Date.now() + SESSION_DURATION_MS });
    },
    onError: () => {
      registerFailedAttempt();
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isLocked,
    attemptsRemaining: useMemo(
      () => Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts),
      [failedAttempts],
    ),
  };
}

interface UseRegisterResult {
  mutate: (payload: RegisterPayload) => void;
  mutateAsync: (payload: RegisterPayload) => Promise<AuthResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

// Inscription + connexion auto (pas besoin de retaper ses identifiants)
export function useRegister(): UseRegisterResult {
  const setSession = useAuthStore((s) => s.setSession);

  const mutation = useMutation<AuthResponse, Error, RegisterPayload>({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      setSession({ ...data, expiresAt: Date.now() + SESSION_DURATION_MS });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}