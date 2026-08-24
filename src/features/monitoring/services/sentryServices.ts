// Init Sentry, plus les fonctions pour associer/retirer l'utilisateur courant
import * as Sentry from '@sentry/react';

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

// Pas d'email ou le mot de passe, juste de quoi identifier la session qui a planté
export function setSentryUser(userId: number, role: string): void {
  Sentry.setUser({ id: String(userId), role });
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, { extra: context });
}