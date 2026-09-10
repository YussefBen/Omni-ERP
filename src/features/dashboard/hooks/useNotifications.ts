// Pile de notifications affichée par le composant Toast.
// Chaque instance gère son propre désabonnement au démontage.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getNotifications } from '../services/notificationBus';
import type { AppNotification } from '../types';

interface UseNotificationsOptions {
  // Nombre de notifications conservées dans la pile.
  maxItems?: number;
  // Durée avant retrait automatique, en millisecondes. 0 désactive le retrait.
  autoDismissMs?: number;
}

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const DEFAULT_DISMISS_MS = 5000;

export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsResult {
  const { maxItems = 20, autoDismissMs = DEFAULT_DISMISS_MS } = options;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Minuteurs de retrait, à annuler au démontage pour ne pas laisser
  // de timers orphelins après la disparition du composant.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));

    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const subscription = getNotifications().subscribe((notification) => {
      setNotifications((current) => [notification, ...current].slice(0, maxItems));

      // Les erreurs restent affichées : elles demandent une action,
      // contrairement à une confirmation de succès.
      if (autoDismissMs > 0 && notification.level !== 'erreur') {
        const timer = setTimeout(() => dismiss(notification.id), autoDismissMs);
        timersRef.current.set(notification.id, timer);
      }
    });

    const timers = timersRef.current;

    return () => {
      subscription.unsubscribe();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [maxItems, autoDismissMs, dismiss]);

  const dismissAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    dismiss,
    dismissAll,
    markAsRead,
    markAllAsRead,
  };
}