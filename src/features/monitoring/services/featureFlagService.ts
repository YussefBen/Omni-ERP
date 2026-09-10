// Init Flagsmith et lecture des flags
import flagsmith from 'flagsmith';

const FLAGSMITH_ENVIRONMENT_KEY = import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_KEY as
  | string
  | undefined;

// Si pas de clé configurée, flag = false
export async function initFeatureFlags(): Promise<void> {
  if (!FLAGSMITH_ENVIRONMENT_KEY) {
    console.warn('[Flagsmith] VITE_FLAGSMITH_ENVIRONMENT_KEY manquant, feature flags désactivés.');
    return;
  }
  await flagsmith.init({ environmentID: FLAGSMITH_ENVIRONMENT_KEY });
}

export function isFeatureEnabled(flagName: string): boolean {
  return flagsmith.hasFeature(flagName);
}