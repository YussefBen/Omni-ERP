// Dernière valeur connue de chaque Core Web Vital qui sera mise à jour au fil de la navigation
import { create } from 'zustand';
import type { WebVitalsSnapshot } from '../types';

interface WebVitalsState extends WebVitalsSnapshot {
  setMetric: (name: keyof WebVitalsSnapshot, value: number) => void;
}

export const useWebVitalsStore = create<WebVitalsState>((set) => ({
  cls: null,
  inp: null,
  lcp: null,
  fcp: null,
  ttfb: null,
  setMetric: (name, value) => set({ [name]: value } as Partial<WebVitalsState>),
}));