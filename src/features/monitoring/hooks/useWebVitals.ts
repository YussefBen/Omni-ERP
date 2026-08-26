// Dernières valeurs mesurées pour affichage dans le dashboard
import { useWebVitalsStore } from '../store/webVitalsStore';
import type { WebVitalsSnapshot } from '../types';

export function useWebVitals(): WebVitalsSnapshot {
  const cls = useWebVitalsStore((s) => s.cls);
  const inp = useWebVitalsStore((s) => s.inp);
  const lcp = useWebVitalsStore((s) => s.lcp);
  const fcp = useWebVitalsStore((s) => s.fcp);
  const ttfb = useWebVitalsStore((s) => s.ttfb);

  return { cls, inp, lcp, fcp, ttfb };
}