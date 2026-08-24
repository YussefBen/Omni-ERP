// Types du monitoring (health checks)

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface ServiceHealth {
  name: string;
  url: string;
  status: HealthStatus;
  latencyMs: number | null;
  checkedAt: string;
}