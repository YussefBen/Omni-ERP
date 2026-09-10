import { afterEach, describe, expect, it, vi } from 'vitest';
import ReactGA from 'react-ga4';

vi.mock('react-ga4', () => ({
  default: { initialize: vi.fn(), send: vi.fn(), event: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe('initAnalytics', () => {
  it('ne fait rien si la clé GA4 est absente', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '');
    const { initAnalytics } = await import('./analyticsService');

    initAnalytics();

    expect(ReactGA.initialize).not.toHaveBeenCalled();
  });

  it('initialise GA4 si la clé est présente', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TEST123');
    const { initAnalytics } = await import('./analyticsService');

    initAnalytics();

    expect(ReactGA.initialize).toHaveBeenCalledWith('G-TEST123');
  });
});

describe('trackPageView', () => {
  it('envoie une page vue à GA4', async () => {
    const { trackPageView } = await import('./analyticsService');

    trackPageView('/dashboard');

    expect(ReactGA.send).toHaveBeenCalledWith({ hitType: 'pageview', page: '/dashboard' });
  });
});

describe('trackEvent', () => {
  it('envoie un événement métier avec ses paramètres', async () => {
    const { trackEvent } = await import('./analyticsService');

    trackEvent('project_created', { projectId: 1 });

    expect(ReactGA.event).toHaveBeenCalledWith('project_created', { projectId: 1 });
  });
});