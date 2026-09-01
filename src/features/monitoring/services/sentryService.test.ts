import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('./slackAlertService', () => ({
  sendSlackAlert: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe('initSentry', () => {
  it('ne fait rien si le DSN est absent', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry } = await import('./sentryService');

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initialise Sentry avec le DSN si présent', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('./sentryService');

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: 'https://test@sentry.io/123',
      sendDefaultPii: false,
    });
  });
});

describe('setSentryUser et clearSentryUser', () => {
  it('associe un utilisateur (id et rôle uniquement)', async () => {
    const { setSentryUser } = await import('./sentryService');

    setSentryUser(42, 'admin');

    expect(Sentry.setUser).toHaveBeenCalledWith({ id: '42', role: 'admin' });
  });

  it('retire l\'utilisateur au logout', async () => {
    const { clearSentryUser } = await import('./sentryService');

    clearSentryUser();

    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});

describe('captureException', () => {
  it('capture l\'erreur sans alerte Slack par défaut', async () => {
    const { sendSlackAlert } = await import('./slackAlertService');
    const { captureException } = await import('./sentryService');

    captureException(new Error('oups'), { source: 'test' });

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { source: 'test' },
    });
    expect(sendSlackAlert).not.toHaveBeenCalled();
  });

  it('envoie aussi une alerte Slack si isCritical est vrai', async () => {
    const { sendSlackAlert } = await import('./slackAlertService');
    const { captureException } = await import('./sentryService');

    captureException(new Error('plantage complet'), undefined, true);

    expect(sendSlackAlert).toHaveBeenCalledWith(
      expect.stringContaining('plantage complet'),
    );
  });
});