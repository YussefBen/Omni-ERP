// Types du monitoring (health checks)

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface ServiceHealth {
  name: string;
  url: string;
  status: HealthStatus;
  latencyMs: number | null;
  checkedAt: string;
}

// WebVitals suivis par Google. Null tant que métrique non calculé
export interface WebVitalsSnapshot {
  cls: number | null;
  inp: number | null;
  lcp: number | null;
  fcp: number | null;
  ttfb: number | null;
}