import { afterEach, describe, expect, it, vi } from 'vitest';
import flagsmith from 'flagsmith';

vi.mock('flagsmith', () => ({
  default: { init: vi.fn().mockResolvedValue(undefined), hasFeature: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe('initFeatureFlags', () => {
  it('ne fait rien si la clé Flagsmith est absente', async () => {
    vi.stubEnv('VITE_FLAGSMITH_ENVIRONMENT_KEY', '');
    const { initFeatureFlags } = await import('./featureFlagService');

    await initFeatureFlags();

    expect(flagsmith.init).not.toHaveBeenCalled();
  });

  it('initialise Flagsmith avec la clé d\'environnement si présente', async () => {
    vi.stubEnv('VITE_FLAGSMITH_ENVIRONMENT_KEY', 'ser.test123');
    const { initFeatureFlags } = await import('./featureFlagService');

    await initFeatureFlags();

    expect(flagsmith.init).toHaveBeenCalledWith({ environmentID: 'ser.test123' });
  });
});

describe('isFeatureEnabled', () => {
  it('délègue à flagsmith.hasFeature', async () => {
    vi.mocked(flagsmith.hasFeature).mockReturnValue(true);
    const { isFeatureEnabled } = await import('./featureFlagService');

    expect(isFeatureEnabled('health_dashboard_widget')).toBe(true);
    expect(flagsmith.hasFeature).toHaveBeenCalledWith('health_dashboard_widget');
  });
});