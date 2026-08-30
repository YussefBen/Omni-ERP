import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSession } from './useSession';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

const mockUser: User = {
  id: 1,
  email: 'test@exemple.fr',
  firstName: 'Test',
  lastName: 'Utilisateur',
  avatarUrl: '',
  role: 'admin',
};

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

afterEach(() => {
  vi.useRealTimers();
});

describe('useSession', () => {
  it('finit par ne plus être en chargement après le montage', async () => {
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('reflète la session du store', () => {
    useAuthStore.setState({
      user: mockUser,
      role: 'admin',
      isAuthenticated: true,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    const { result } = renderHook(() => useSession());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.role).toBe('admin');
  });

  it('rafraîchit la session quand elle approche de l\'expiration', () => {
    vi.useFakeTimers();

    const bientotExpiree = Date.now() + 4 * 60 * 1000;
    useAuthStore.setState({
      user: mockUser,
      role: 'admin',
      isAuthenticated: true,
      expiresAt: bientotExpiree,
    });

    renderHook(() => useSession());

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(useAuthStore.getState().expiresAt).toBeGreaterThan(bientotExpiree);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('déconnecte automatiquement une fois la session expirée', () => {
    vi.useFakeTimers();

    useAuthStore.setState({
      user: mockUser,
      role: 'admin',
      isAuthenticated: true,
      expiresAt: Date.now() - 1000,
    });

    renderHook(() => useSession());

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('ne touche pas à une session dont l\'expiration est encore loin', () => {
    vi.useFakeTimers();

    const expirationLointaine = Date.now() + 20 * 60 * 1000;
    useAuthStore.setState({
      user: mockUser,
      role: 'admin',
      isAuthenticated: true,
      expiresAt: expirationLointaine,
    });

    renderHook(() => useSession());

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(useAuthStore.getState().expiresAt).toBe(expirationLointaine);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('logout() vide la session', () => {
    useAuthStore.setState({
      user: mockUser,
      role: 'admin',
      isAuthenticated: true,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    const { result } = renderHook(() => useSession());
    act(() => {
      result.current.logout();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});