// Vrai/faux selon Flagsmith, pour un flag donné
import { isFeatureEnabled } from '../services/featureFlagService';

export function useFeatureFlag(flagName: string): boolean {
  return isFeatureEnabled(flagName);
}