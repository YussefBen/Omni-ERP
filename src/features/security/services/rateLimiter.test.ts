import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  clearRateLimit,
  registerFailure,
  resetAllRateLimits,
} from './rateLimiter';

const EMAIL = 'utilisateur@exemple.fr';
const AUTRE_EMAIL = 'autre@exemple.fr';
const LOCKOUT_MS = 60 * 1000;

describe('rateLimiter', () => {
  beforeEach(() => {
    // Le compteur vit en mémoire du module : sans remise à zéro,
    // un test hériterait de l'état laissé par le précédent.
    resetAllRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('autorise trois tentatives sur un identifiant vierge', () => {
      const state = checkRateLimit(EMAIL);

      expect(state.isBlocked).toBe(false);
      expect(state.remaining).toBe(3);
      expect(state.blockedUntil).toBeNull();
    });

    // La vérification est une lecture : elle ne doit pas consommer
    // une tentative, sinon consulter l'état bloquerait l'utilisateur.
    it('ne consomme pas de tentative', () => {
      checkRateLimit(EMAIL);
      checkRateLimit(EMAIL);

      expect(checkRateLimit(EMAIL).remaining).toBe(3);
    });
  });

  describe('registerFailure', () => {
    it('décrémente les tentatives restantes à chaque échec', () => {
      expect(registerFailure(EMAIL).remaining).toBe(2);
      expect(registerFailure(EMAIL).remaining).toBe(1);
      expect(registerFailure(EMAIL).remaining).toBe(0);
    });

    it('bloque au troisième échec', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      const state = registerFailure(EMAIL);

      expect(state.isBlocked).toBe(true);
      expect(state.blockedUntil).not.toBeNull();
    });

    it('ne bloque pas avant le troisième échec', () => {
      expect(registerFailure(EMAIL).isBlocked).toBe(false);
      expect(registerFailure(EMAIL).isBlocked).toBe(false);
    });

    it('expose le décompte avant déblocage', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      const state = registerFailure(EMAIL);

      expect(state.secondsRemaining).toBeGreaterThan(0);
      expect(state.secondsRemaining).toBeLessThanOrEqual(60);
    });
  });

  describe('isolation par identifiant', () => {
    // Sans cette séparation, une attaque sur un compte bloquerait tous
    // les utilisateurs de l'application.
    it('ne bloque pas les autres identifiants', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      expect(checkRateLimit(EMAIL).isBlocked).toBe(true);
      expect(checkRateLimit(AUTRE_EMAIL).isBlocked).toBe(false);
    });

    it('traite les variations de casse et d\'espaces comme un seul identifiant', () => {
      registerFailure(EMAIL);
      registerFailure('  UTILISATEUR@EXEMPLE.FR  ');
      registerFailure('Utilisateur@Exemple.fr');

      expect(checkRateLimit(EMAIL).isBlocked).toBe(true);
    });
  });

  describe('expiration du blocage', () => {
    // Défaut corrigé : sans remise à zéro du compteur, la première tentative
    // après expiration rebloquait immédiatement. Le blocage d'une minute
    // devenait alors permanent.
    it('remet le compteur à zéro une fois le blocage expiré', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      expect(checkRateLimit(EMAIL).isBlocked).toBe(true);

      vi.advanceTimersByTime(LOCKOUT_MS + 1000);

      const state = checkRateLimit(EMAIL);
      expect(state.isBlocked).toBe(false);
      expect(state.remaining).toBe(3);
    });

    it('autorise à nouveau trois tentatives après expiration', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      vi.advanceTimersByTime(LOCKOUT_MS + 1000);

      expect(registerFailure(EMAIL).isBlocked).toBe(false);
      expect(registerFailure(EMAIL).isBlocked).toBe(false);
      expect(registerFailure(EMAIL).isBlocked).toBe(true);
    });

    it('maintient le blocage tant que la minute n\'est pas écoulée', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      vi.advanceTimersByTime(LOCKOUT_MS - 5000);

      expect(checkRateLimit(EMAIL).isBlocked).toBe(true);
    });
  });

  describe('fenêtre glissante', () => {
    // Trois échecs espacés dans le temps ne constituent pas une attaque :
    // sans fenêtre, un utilisateur distrait finirait bloqué au bout de
    // trois erreurs étalées sur la journée.
    it('oublie les échecs antérieurs à la fenêtre', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      vi.advanceTimersByTime(LOCKOUT_MS + 1000);

      const state = registerFailure(EMAIL);
      expect(state.isBlocked).toBe(false);
      expect(state.remaining).toBe(2);
    });

    it('bloque trois échecs rapprochés', () => {
      registerFailure(EMAIL);
      vi.advanceTimersByTime(5000);
      registerFailure(EMAIL);
      vi.advanceTimersByTime(5000);

      expect(registerFailure(EMAIL).isBlocked).toBe(true);
    });
  });

  describe('clearRateLimit', () => {
    it('efface le compteur après une connexion réussie', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      clearRateLimit(EMAIL);

      expect(checkRateLimit(EMAIL).remaining).toBe(3);
    });

    it('lève un blocage en cours', () => {
      registerFailure(EMAIL);
      registerFailure(EMAIL);
      registerFailure(EMAIL);

      clearRateLimit(EMAIL);

      expect(checkRateLimit(EMAIL).isBlocked).toBe(false);
    });

    it('ne touche pas aux autres identifiants', () => {
      registerFailure(EMAIL);
      registerFailure(AUTRE_EMAIL);

      clearRateLimit(EMAIL);

      expect(checkRateLimit(AUTRE_EMAIL).remaining).toBe(2);
    });
  });
});