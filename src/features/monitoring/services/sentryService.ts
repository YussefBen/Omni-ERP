// Init Sentry, plus les fonctions pour associer/retirer l'utilisateur courant
import * as Sentry from '@sentry/react';
import { sendSlackAlert } from './slackAlertService';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Si pas de DSN configuré, Sentry ne fait juste rien
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] VITE_SENTRY_DSN manquant, monitoring désactivé.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
  });
}

export function setSentryUser(userId: number, role: string): void {
  Sentry.setUser({ id: String(userId), role });
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}

// isCritical : en plus de Sentry envoie une alerte Slack
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
  isCritical = false,
): void {
  Sentry.captureException(error, { extra: context });

  if (isCritical) {
    const message = error instanceof Error ? error.message : String(error);
    void sendSlackAlert(`Erreur critique : ${message}`);
  }
}