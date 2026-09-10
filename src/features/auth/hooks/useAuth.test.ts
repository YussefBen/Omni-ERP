import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import { useLogin, useRegister } from './useAuth';
import { useAuthStore } from '../store/authStore';

const REQRES = 'https://reqres.in/api';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    token: null,
    role: null,
    expiresAt: null,
    isAuthenticated: false,
    failedAttempts: 0,
    lockedUntil: null,
  });
});

describe('useLogin', () => {
  it('ouvre la session avec les identifiants valides', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ email: 'eve.holt@reqres.in', password: 'pistol' });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBeTruthy();
  });

  it('refuse de mauvais identifiants et compte la tentative', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ email: 'inconnu@exemple.fr', password: 'faux' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(result.current.attemptsRemaining).toBe(2);
  });

  it('bloque après 3 échecs, sans redemander le réseau', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.mutate({ email: 'inconnu@exemple.fr', password: 'faux' });
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
    }

    await waitFor(() => expect(result.current.isLocked).toBe(true));
    expect(result.current.attemptsRemaining).toBe(0);

    act(() => {
      result.current.mutate({ email: 'eve.holt@reqres.in', password: 'pistol' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('remet les compteurs à zéro après une connexion réussie', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ email: 'inconnu@exemple.fr', password: 'faux' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.attemptsRemaining).toBe(2);

    act(() => {
      result.current.mutate({ email: 'eve.holt@reqres.in', password: 'pistol' });
    });
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));

    expect(useAuthStore.getState().failedAttempts).toBe(0);
  });
});

describe('useRegister', () => {
  it('ouvre la session automatiquement après une inscription réussie', async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ email: 'eve.holt@reqres.in', password: 'pistol' });
    });

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().token).toBeTruthy();
  });

  it('signale un échec sans ouvrir de session', async () => {
    server.use(
      http.post(`${REQRES}/register`, () => new HttpResponse(null, { status: 400 })),
    );

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ email: 'refuse@exemple.fr', password: 'x' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});