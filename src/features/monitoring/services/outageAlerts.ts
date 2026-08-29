// Alerte Slack quand un service passe "down", une seule fois par panne
import { sendSlackAlert } from './slackAlertService';
import type { ServiceHealth } from '../types';

const alreadyAlerted = new Set<string>();

export function notifyServiceOutages(results: ServiceHealth[]): void {
  for (const service of results) {
    if (service.status === 'down' && !alreadyAlerted.has(service.name)) {
      alreadyAlerted.add(service.name);
      void sendSlackAlert(`${service.name} est down (${service.url})`);
    } else if (service.status !== 'down' && alreadyAlerted.has(service.name)) {
      alreadyAlerted.delete(service.name);
    }
  }
}