import { describe, it, expect } from 'vitest';
import {
  getNotifications,
  notify,
  notifyAlert,
  notifyError,
  notifyInfo,
  notifySuccess,
} from './notificationBus';
import type { AppNotification } from '../types';

function collect(): { recues: AppNotification[]; stop: () => void } {
  const recues: AppNotification[] = [];
  const subscription = getNotifications().subscribe((n) => recues.push(n));
  return { recues, stop: () => subscription.unsubscribe() };
}

describe('notify', () => {
  it('transmet la notification aux abonnés', () => {
    const { recues, stop } = collect();

    notify({ level: 'info', message: 'Un message' });

    expect(recues).toHaveLength(1);
    expect(recues[0].message).toBe('Un message');
    stop();
  });

  it('renvoie la notification créée', () => {
    const notification = notify({ level: 'succes', message: 'Créé' });

    expect(notification.message).toBe('Créé');
    expect(notification.level).toBe('succes');
  });

  it('horodate et marque la notification comme non lue', () => {
    const notification = notify({ level: 'info', message: 'Test' });

    expect(notification.createdAt).toBeTruthy();
    expect(notification.read).toBe(false);
  });

  // Les identifiants servent de clé de rendu et de cible de fermeture :
  // un doublon ferait disparaître deux notifications d'un seul clic.
  it('attribue un identifiant unique à chaque notification', () => {
    const identifiants = new Set(
      Array.from({ length: 50 }, () => notify({ level: 'info', message: 'x' }).id),
    );

    expect(identifiants.size).toBe(50);
  });

  it('conserve le domaine émetteur', () => {
    const notification = notify({ level: 'info', message: 'x', source: 'crm' });
    expect(notification.source).toBe('crm');
  });

  it('sert plusieurs abonnés simultanément', () => {
    const premier = collect();
    const second = collect();

    notify({ level: 'info', message: 'Diffusé' });

    expect(premier.recues).toHaveLength(1);
    expect(second.recues).toHaveLength(1);

    premier.stop();
    second.stop();
  });

  it('cesse de transmettre après désabonnement', () => {
    const { recues, stop } = collect();
    stop();

    notify({ level: 'info', message: 'Ignoré' });

    expect(recues).toHaveLength(0);
  });

  // Un abonné tardif ne doit pas recevoir les notifications passées :
  // ouvrir un écran afficherait sinon des messages obsolètes.
  it('ne rejoue pas les notifications passées', () => {
    notify({ level: 'info', message: 'Avant abonnement' });

    const { recues, stop } = collect();

    expect(recues).toHaveLength(0);
    stop();
  });
});

describe('raccourcis par niveau', () => {
  it('produit une notification de succès', () => {
    expect(notifySuccess('Enregistré', 'crm').level).toBe('succes');
  });

  it('produit une notification d\'erreur', () => {
    expect(notifyError('Échec').level).toBe('erreur');
  });

  it('produit une notification d\'information', () => {
    expect(notifyInfo('Pour information').level).toBe('info');
  });

  it('produit une alerte', () => {
    expect(notifyAlert('Attention').level).toBe('alerte');
  });

  it('transmet le domaine émetteur', () => {
    const { recues, stop } = collect();

    notifySuccess('Commande livrée', 'erp');

    expect(recues[0].source).toBe('erp');
    stop();
  });
});