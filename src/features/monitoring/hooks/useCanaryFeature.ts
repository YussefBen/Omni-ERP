// Vrai seulement si le flag est actif ET que l'utilisateur fait partie des 10%
import { isInCanaryGroup } from './canary';
import { useFeatureFlag } from './useFeatureFlag';

export function useCanaryFeature(flagName: string): boolean {
  const flagEnabled = useFeatureFlag(flagName);
  return flagEnabled && isInCanaryGroup();
}