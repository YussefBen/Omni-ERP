//  mis à jour dans le store au fil des mesures des WebVitals

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { useWebVitalsStore } from '../store/webVitalsStore';

export function initWebVitals(): void {
  const setMetric = useWebVitalsStore.getState().setMetric;

  onCLS((metric) => setMetric('cls', metric.value));
  onINP((metric) => setMetric('inp', metric.value));
  onLCP((metric) => setMetric('lcp', metric.value));
  onFCP((metric) => setMetric('fcp', metric.value));
  onTTFB((metric) => setMetric('ttfb', metric.value));
}