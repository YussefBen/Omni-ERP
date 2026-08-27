import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { notifyError, notifySuccess } from '../services/notificationBus';

describe('useNotifications', () => {
  it('démarre sans notification', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('reçoit les notifications émises', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('Enregistré');
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0].message).toBe('Enregistré');
  });

  it('empile la plus récente en premier', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('Première');
      notifySuccess('Seconde');
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.notifications[0].message).toBe('Seconde');
  });

  it('borne la pile à la taille demandée', async () => {
    const { result } = renderHook(() =>
      useNotifications({ maxItems: 2, autoDismissMs: 0 }),
    );

    act(() => {
      notifySuccess('Une');
      notifySuccess('Deux');
      notifySuccess('Trois');
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.notifications[0].message).toBe('Trois');
  });

  it('compte les notifications non lues', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('Une');
      notifySuccess('Deux');
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(2));
  });

  it('retire une notification à la demande', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('À fermer');
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('vide la pile entière', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('Une');
      notifySuccess('Deux');
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('marque une notification comme lue', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('À lire');
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    act(() => {
      result.current.markAsRead(result.current.notifications[0].id);
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications).toHaveLength(1);
  });

  it('marque toute la pile comme lue', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('Une');
      notifySuccess('Deux');
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(2));

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it('se désabonne au démontage', async () => {
    const { result, unmount } = renderHook(() =>
      useNotifications({ autoDismissMs: 0 }),
    );

    unmount();

    act(() => {
      notifySuccess('Après démontage');
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});

describe('retrait automatique', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retire les succès après le délai', async () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 3000 }));

    act(() => {
      notifySuccess('Disparaîtra');
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  // Une erreur demande une action de l'utilisateur : la faire disparaître
  // seule reviendrait à masquer un problème qu'il n'a peut-être pas vu.
  it('conserve les erreurs jusqu\'à fermeture manuelle', () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 3000 }));

    act(() => {
      notifyError('Échec de la connexion');
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('ne retire rien lorsque le délai est nul', () => {
    const { result } = renderHook(() => useNotifications({ autoDismissMs: 0 }));

    act(() => {
      notifySuccess('Permanent');
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  // Sans annulation, les minuteurs continueraient de s'exécuter après
  // la disparition du composant et tenteraient de mettre à jour son état.
  it('annule les minuteurs au démontage', () => {
    const { unmount } = renderHook(() => useNotifications({ autoDismissMs: 3000 }));

    act(() => {
      notifySuccess('En attente');
    });

    unmount();

    expect(() => {
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});