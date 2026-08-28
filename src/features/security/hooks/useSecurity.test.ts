import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import { useAudit, useAuditLog, useLoginRateLimit } from './useSecurity';
import { useCsrf } from './useCsrf';
import { useAuthStore } from '@/features/auth/store/authStore';
import { resetAllRateLimits } from '../services/rateLimiter';
import type { AuditEntry } from '../types';

const LOCAL = 'http://localhost:3001';

function makeEntry(id: number, userId: number | null = 1): AuditEntry {
  return {
    id,
    userId,
    userEmail: userId ? `user${userId}@exemple.fr` : null,
    action: 'login.success',
    result: 'succes',
    details: '',
    userAgent: 'test',
    origin: 'http://localhost',
    occurredAt: `2026-08-${String(id).padStart(2, '0')}T10:00:00.000Z`,
  };
}

/** Place un utilisateur connecté avec le rôle demandé. */
function connecter(role: 'admin' | 'manager' | 'user') {
  useAuthStore.setState({
    user: { id: 1, email: 'test@exemple.fr', role } as never,
    token: 'jeton',
    role,
    expiresAt: Date.now() + 60000,
    isAuthenticated: true,
  });
}

function deconnecter() {
  useAuthStore.setState({
    user: null,
    token: null,
    role: null,
    expiresAt: null,
    isAuthenticated: false,
  });
}

describe('useAuditLog', () => {
  afterEach(() => {
    deconnecter();
  });

  // La restriction est appliquée dans le hook et non seulement à l'affichage :
  // sans le rôle requis, aucune requête n'est même émise.
  it('n\'émet aucune requête sans le rôle administrateur', () => {
    connecter('user');

    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() });

    expect(result.current.isAllowed).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('refuse également le rôle gestionnaire', () => {
    connecter('manager');

    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() });
    expect(result.current.isAllowed).toBe(false);
  });

  it('refuse un utilisateur non connecté', () => {
    deconnecter();

    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() });
    expect(result.current.isAllowed).toBe(false);
  });

  it('charge le journal pour un administrateur', async () => {
    connecter('admin');
    server.use(
      http.get(`${LOCAL}/auditLog`, () =>
        HttpResponse.json([makeEntry(1), makeEntry(2)]),
      ),
    );

    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() });

    expect(result.current.isAllowed).toBe(true);
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.items).toHaveLength(2);
  });

  it('calcule le nombre de pages', async () => {
    connecter('admin');
    server.use(
      http.get(`${LOCAL}/auditLog`, () =>
        HttpResponse.json([makeEntry(1), makeEntry(2), makeEntry(3)]),
      ),
    );

    const { result } = renderHook(() => useAuditLog({ pageSize: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.totalPages).toBe(2);
  });

  it('signale une erreur de lecture', async () => {
    connecter('admin');
    server.use(
      http.get(`${LOCAL}/auditLog`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAudit', () => {
  afterEach(() => {
    deconnecter();
  });

  it('journalise une action avec l\'utilisateur courant', async () => {
    connecter('admin');

    let envoye: Record<string, unknown> | undefined;
    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useAudit(), { wrapper: createWrapper() });

    act(() => {
      result.current('opportunity.delete', 'succes', 'Affaire 12');
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(envoye).toMatchObject({
      userId: 1,
      userEmail: 'test@exemple.fr',
      action: 'opportunity.delete',
      result: 'succes',
    });
  });

  it('journalise une action anonyme sans utilisateur connecté', async () => {
    deconnecter();

    let envoye: Record<string, unknown> | undefined;
    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useAudit(), { wrapper: createWrapper() });

    act(() => {
      result.current('login.failure', 'echec');
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(envoye?.userId).toBeNull();
    expect(envoye?.userEmail).toBeNull();
  });
});

describe('useLoginRateLimit', () => {
  beforeEach(() => {
    resetAllRateLimits();
    server.use(
      http.post(`${LOCAL}/auditLog`, () => HttpResponse.json({ id: 1 }, { status: 201 })),
    );
  });

  afterEach(() => {
    deconnecter();
  });

  it('démarre avec trois tentatives disponibles', () => {
    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    expect(result.current.state.isBlocked).toBe(false);
    expect(result.current.state.remaining).toBe(3);
  });

  it('décrémente les tentatives après un échec', () => {
    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.registerFailedAttempt('test@exemple.fr');
    });

    expect(result.current.state.remaining).toBe(2);
  });

  it('bloque après trois échecs', () => {
    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.registerFailedAttempt('test@exemple.fr');
      result.current.registerFailedAttempt('test@exemple.fr');
      result.current.registerFailedAttempt('test@exemple.fr');
    });

    expect(result.current.state.isBlocked).toBe(true);
    expect(result.current.state.secondsRemaining).toBeGreaterThan(0);
  });

  // Une série de tentatives sur un compte doit laisser une trace,
  // c'est précisément ce qu'un journal d'audit sert à établir.
  it('journalise chaque tentative échouée', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoyes.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.registerFailedAttempt('test@exemple.fr');
    });

    await waitFor(() => expect(envoyes).toHaveLength(1));

    expect(envoyes[0]).toMatchObject({
      action: 'login.failure',
      result: 'echec',
      userEmail: 'test@exemple.fr',
    });
  });

  it('journalise le blocage distinctement', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoyes.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.registerFailedAttempt('test@exemple.fr');
      result.current.registerFailedAttempt('test@exemple.fr');
      result.current.registerFailedAttempt('test@exemple.fr');
    });

    await waitFor(() => expect(envoyes).toHaveLength(3));

    expect(envoyes[2]).toMatchObject({
      action: 'login.blocked',
      result: 'refuse',
    });
  });

  it('consulte l\'état sans consommer de tentative', () => {
    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.check('test@exemple.fr');
      result.current.check('test@exemple.fr');
    });

    expect(result.current.state.remaining).toBe(3);
  });

  it('efface le compteur après une connexion réussie', () => {
    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.registerFailedAttempt('test@exemple.fr');
      result.current.registerFailedAttempt('test@exemple.fr');
    });

    act(() => {
      result.current.reset('test@exemple.fr');
    });

    expect(result.current.state.remaining).toBe(3);
    expect(result.current.state.isBlocked).toBe(false);
  });

  it('journalise la connexion réussie', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoyes.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useLoginRateLimit(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.reset('test@exemple.fr');
    });

    await waitFor(() => expect(envoyes).toHaveLength(1));
    expect(envoyes[0]).toMatchObject({ action: 'login.success', result: 'succes' });
  });
});

describe('useCsrf', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('expose un jeton dès le premier rendu', () => {
    const { result } = renderHook(() => useCsrf());

    expect(result.current.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('conserve le même jeton entre deux rendus', () => {
    const { result, rerender } = renderHook(() => useCsrf());
    const premier = result.current.token;

    rerender();

    expect(result.current.token).toBe(premier);
  });

  // Le jeton est renouvelé à la connexion et à la déconnexion : un jeton
  // capturé avant l'authentification ne doit pas rester valable après.
  it('renouvelle le jeton à la demande', () => {
    const { result } = renderHook(() => useCsrf());
    const avant = result.current.token;

    act(() => {
      result.current.rotate();
    });

    expect(result.current.token).not.toBe(avant);
  });
});