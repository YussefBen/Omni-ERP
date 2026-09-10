// Init GA4, pages vues et événements métier
import ReactGA from 'react-ga4';

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

// Si pas d'id configuré, GA4 ne fait juste rien (comme Sentry sans DSN)
export function initAnalytics(): void {
  if (!GA4_MEASUREMENT_ID) {
    console.warn('[GA4] VITE_GA4_MEASUREMENT_ID manquant, analytics désactivé.');
    return;
  }
  ReactGA.initialize(GA4_MEASUREMENT_ID);
}

export function trackPageView(path: string): void {
  ReactGA.send({ hitType: 'pageview', page: path });
}

// Pour tous les événements métier : trackEvent('project_created', { projectId })
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  ReactGA.event(name, params);
}