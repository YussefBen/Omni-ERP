import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { fetchAuditLog, recordAudit } from './auditService';
import type { AuditEntry } from '../types';

const LOCAL = 'http://localhost:3001';

function makeEntry(
  id: number,
  action: AuditEntry['action'],
  result: AuditEntry['result'],
  occurredAt: string,
  userId: number | null = 1,
): AuditEntry {
  return {
    id,
    userId,
    userEmail: userId ? `user${userId}@exemple.fr` : null,
    action,
    result,
    details: '',
    userAgent: 'test',
    origin: 'http://localhost',
    occurredAt,
  };
}

const JOURNAL: AuditEntry[] = [
  makeEntry(1, 'login.success', 'succes', '2026-08-01T10:00:00.000Z', 1),
  makeEntry(2, 'login.failure', 'echec', '2026-08-05T10:00:00.000Z', null),
  makeEntry(3, 'opportunity.delete', 'succes', '2026-08-10T10:00:00.000Z', 2),
  makeEntry(4, 'login.blocked', 'refuse', '2026-08-12T10:00:00.000Z', null),
  makeEntry(5, 'order.status.update', 'succes', '2026-08-15T10:00:00.000Z', 1),
];

function servirJournal() {
  server.use(http.get(`${LOCAL}/auditLog`, () => HttpResponse.json(JOURNAL)));
}

describe('recordAudit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transmet l\'action au journal', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 1 }, { status: 201 });
      }),
    );

    await recordAudit({
      userId: 7,
      userEmail: 'test@exemple.fr',
      action: 'login.success',
      result: 'succes',
    });

    expect(envoye).toMatchObject({
      userId: 7,
      action: 'login.success',
      result: 'succes',
    });
  });

  // L'adresse IP n'est pas accessible depuis un navigateur : on journalise
  // ce qui l'est et qui reste exploitable en investigation.
  it('complète l\'entrée avec le contexte du navigateur', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    await recordAudit({
      userId: null,
      userEmail: null,
      action: 'login.failure',
      result: 'echec',
    });

    expect(envoye?.userAgent).toBeTruthy();
    expect(envoye?.origin).toBeTruthy();
    expect(envoye?.occurredAt).toBeTruthy();
  });

  it('assainit le contexte libre', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.post(`${LOCAL}/auditLog`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    await recordAudit({
      userId: 1,
      userEmail: 'a@b.fr',
      action: 'client.status.update',
      result: 'succes',
      details: '<script>alert(1)</script>Statut modifié',
    });

    expect(String(envoye?.details)).not.toContain('script');
    expect(String(envoye?.details)).toContain('Statut modifié');
  });

  // La journalisation ne doit jamais interrompre l'action qu'elle trace :
  // un journal indisponible n'est pas une raison d'empêcher une connexion.
  it('n\'interrompt pas l\'action lorsque le journal est indisponible', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.post(`${LOCAL}/auditLog`, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(
      recordAudit({
        userId: 1,
        userEmail: 'a@b.fr',
        action: 'logout',
        result: 'succes',
      }),
    ).resolves.toBeUndefined();
  });

  it('signale l\'échec en console sans le propager', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.post(`${LOCAL}/auditLog`, () => new HttpResponse(null, { status: 500 })),
    );

    await recordAudit({
      userId: 1,
      userEmail: 'a@b.fr',
      action: 'logout',
      result: 'succes',
    });

    expect(avertissement).toHaveBeenCalled();
  });
});

describe('fetchAuditLog', () => {
  it('renvoie le journal du plus récent au plus ancien', async () => {
    servirJournal();

    const page = await fetchAuditLog();
    const dates = page.items.map((entry) => entry.occurredAt);

    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
    expect(page.total).toBe(5);
  });

  it('filtre par type d\'action', async () => {
    servirJournal();

    const page = await fetchAuditLog({ action: 'login.failure' });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe(2);
  });

  it('filtre par résultat', async () => {
    servirJournal();

    const page = await fetchAuditLog({ result: 'succes' });

    expect(page.items).toHaveLength(3);
    expect(page.items.every((entry) => entry.result === 'succes')).toBe(true);
  });

  it('filtre par utilisateur', async () => {
    servirJournal();

    const page = await fetchAuditLog({ userId: 1 });

    expect(page.items).toHaveLength(2);
  });

  it('combine plusieurs filtres', async () => {
    servirJournal();

    const page = await fetchAuditLog({ userId: 1, result: 'succes' });
    expect(page.items).toHaveLength(2);
  });

  it('pagine les résultats', async () => {
    servirJournal();

    const page = await fetchAuditLog({ page: 1, pageSize: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
    expect(page.pageSize).toBe(2);
  });

  it('renvoie la seconde page', async () => {
    servirJournal();

    const page = await fetchAuditLog({ page: 2, pageSize: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.page).toBe(2);
  });

  it('renvoie une page vide au-delà du dernier résultat', async () => {
    servirJournal();

    const page = await fetchAuditLog({ page: 10, pageSize: 2 });
    expect(page.items).toEqual([]);
  });

  it('renvoie une liste vide sur un journal vierge', async () => {
    server.use(http.get(`${LOCAL}/auditLog`, () => HttpResponse.json([])));

    const page = await fetchAuditLog();

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  // Contrairement à l'écriture, la lecture propage l'erreur : un écran
  // d'audit qui afficherait un journal vide en cas de panne serait trompeur.
  it('propage une erreur de lecture', async () => {
    server.use(
      http.get(`${LOCAL}/auditLog`, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(fetchAuditLog()).rejects.toThrow();
  });
});