// Pour tracker un événement métier 
import { trackEvent } from '../services/analyticsService';

interface UseEventTrackingResult {
  trackEvent: (name: string, params?: Record<string, unknown>) => void;
}

export function useEventTracking(): UseEventTrackingResult {
  return { trackEvent };
}