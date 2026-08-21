// Bus de notifications internes (Observer Pattern, RxJS).
// N'importe quel service ou mutation peut émettre sans connaître l'écran
// qui affiche : les domaines ne dépendent pas du tableau de bord.

import { Subject, type Observable } from 'rxjs';
import type { AppNotification, NotifyPayload } from '../types';

const notificationSubject = new Subject<AppNotification>();

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `notif-${Date.now()}-${sequence}`;
}

// Émet une notification. Appelable depuis un hook, un service ou un onSuccess.
export function notify(payload: NotifyPayload): AppNotification {
  const notification: AppNotification = {
    ...payload,
    id: nextId(),
    createdAt: new Date().toISOString(),
    read: false,
  };

  notificationSubject.next(notification);
  return notification;
}

/* Raccourcis par niveau, pour éviter de répéter le champ à chaque appel. */

export function notifySuccess(message: string, source?: string): AppNotification {
  return notify({ level: 'succes', message, source });
}

export function notifyError(message: string, source?: string): AppNotification {
  return notify({ level: 'erreur', message, source });
}

export function notifyInfo(message: string, source?: string): AppNotification {
  return notify({ level: 'info', message, source });
}

export function notifyAlert(message: string, source?: string): AppNotification {
  return notify({ level: 'alerte', message, source });
}

// Flux en lecture seule : asObservable empêche un abonné d'émettre.
export function getNotifications(): Observable<AppNotification> {
  return notificationSubject.asObservable();
}