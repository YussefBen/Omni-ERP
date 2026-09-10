// Ping les APIs externes du projet 

import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import type { HealthStatus, ServiceHealth } from '../types';

// Au-delà de ce délai, le service répond 
const SLOW_THRESHOLD_MS = 1500;
const PING_TIMEOUT_MS = 5000;

const SERVICES_TO_CHECK: { name: string; url: string }[] = [
  { name: 'JSONPlaceholder', url: `${API_CONFIG.jsonPlaceholder}/posts/1` },
  { name: 'DummyJSON', url: `${API_CONFIG.dummyJson}/products/1` },
  { name: 'Reqres', url: `${API_CONFIG.reqres}/users/1` },
  { name: 'RandomUser', url: `${API_CONFIG.randomUser}/?results=1` },
  { name: 'OpenWeatherMap', url: `${API_CONFIG.openWeather}/weather?q=Paris` },
  { name: 'JSON Server (local)', url: `${API_CONFIG.jsonServer}/tasks` },
];

// Statut basé sur code retour + latence
async function pingService(name: string, url: string): Promise<ServiceHealth> {
  const start = performance.now();
  try {
    const response = await axios.get(url, {
      timeout: PING_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latencyMs = Math.round(performance.now() - start);

    let status: HealthStatus = 'ok';
    if (response.status >= 500) status = 'down';
    else if (latencyMs > SLOW_THRESHOLD_MS) status = 'degraded';

    return { name, url, status, latencyMs, checkedAt: new Date().toISOString() };
  } catch {
    return { name, url, status: 'down', latencyMs: null, checkedAt: new Date().toISOString() };
  }
}

export async function fetchHealthChecks(): Promise<ServiceHealth[]> {
  return Promise.all(SERVICES_TO_CHECK.map((s) => pingService(s.name, s.url)));
}