import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { useWebVitalsStore } from '../store/webVitalsStore';
import { initWebVitals } from './webVitalsService';

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

beforeEach(() => {
  useWebVitalsStore.setState({ cls: null, inp: null, lcp: null, fcp: null, ttfb: null });
  vi.clearAllMocks();
});

describe('initWebVitals', () => {
  it('s\'abonne aux 5 métriques', () => {
    initWebVitals();

    expect(onCLS).toHaveBeenCalledTimes(1);
    expect(onINP).toHaveBeenCalledTimes(1);
    expect(onLCP).toHaveBeenCalledTimes(1);
    expect(onFCP).toHaveBeenCalledTimes(1);
    expect(onTTFB).toHaveBeenCalledTimes(1);
  });

  it('met à jour le store quand une métrique est mesurée', () => {
    initWebVitals();

    const clsCallback = vi.mocked(onCLS).mock.calls[0][0];
    clsCallback({ value: 0.05 } as never);

    expect(useWebVitalsStore.getState().cls).toBe(0.05);
  });

  it('chaque métrique met à jour son propre champ, pas les autres', () => {
    initWebVitals();

    const lcpCallback = vi.mocked(onLCP).mock.calls[0][0];
    lcpCallback({ value: 1200 } as never);

    expect(useWebVitalsStore.getState().lcp).toBe(1200);
    expect(useWebVitalsStore.getState().cls).toBeNull();
  });
});