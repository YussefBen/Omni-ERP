import { useState } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationLevel } from '../../types';
import styles from './NotificationsWidget.module.css';

const LEVEL_ICONS: Record<NotificationLevel, string> = {
  succes: '✅',
  erreur: '⛔',
  info: 'ℹ️',
  alerte: '⚠️',
};

export function NotificationsWidget() {
  const { notifications, unreadCount, dismiss, dismissAll, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  function toggleOpen() {
    setIsOpen((open) => {
      const next = !open;
      // Marque tout comme lu à l'ouverture, comme un centre de notifications classique
      if (next) markAllAsRead();
      return next;
    });
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.title}>Notifications</h3>
            {notifications.length > 0 && (
              <button type="button" className={styles.clearAll} onClick={dismissAll}>
                Tout effacer
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className={styles.empty}>Aucune notification.</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`${styles.item} ${notification.read ? '' : styles.unread}`}
                >
                  <span className={styles.icon} aria-hidden="true">
                    {LEVEL_ICONS[notification.level]}
                  </span>
                  <span className={styles.message}>{notification.message}</span>
                  <button
                    type="button"
                    className={styles.dismissButton}
                    onClick={() => dismiss(notification.id)}
                    aria-label="Fermer cette notification"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
