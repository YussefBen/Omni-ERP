import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import {
  attachCsrfProtection,
  clearCsrfToken,
  CSRF_HEADER,
  CsrfError,
  getCsrfToken,
  rotateCsrfToken,
  verifyCsrfToken,
} from './csrf';

describe('csrf', () => {
  beforeEach(() => {
    // Le jeton vit dans sessionStorage : sans nettoyage, un test hériterait
    // de celui laissé par le précédent.
    sessionStorage.clear();
  });

  describe('getCsrfToken', () => {
    it('génère un jeton au premier appel', () => {
      const token = getCsrfToken();

      expect(token).toBeTruthy();
      expect(token.length).toBe(64);
    });

    // 32 octets en hexadécimal, soit 256 bits d'entropie : le jeton ne doit
    // pas être devinable par force brute.
    it('produit un jeton hexadécimal de 256 bits', () => {
      expect(getCsrfToken()).toMatch(/^[0-9a-f]{64}$/);
    });

    it('renvoie le même jeton pendant toute la session', () => {
      const premier = getCsrfToken();
      const second = getCsrfToken();

      expect(second).toBe(premier);
    });

    it('produit des jetons différents entre deux sessions', () => {
      const premier = getCsrfToken();
      sessionStorage.clear();
      const second = getCsrfToken();

      expect(second).not.toBe(premier);
    });
  });

  describe('rotateCsrfToken', () => {
    // Le jeton est renouvelé à la connexion et à la déconnexion : un jeton
    // capturé avant l'authentification ne doit pas rester valable après.
    it('remplace le jeton courant', () => {
      const avant = getCsrfToken();
      const apres = rotateCsrfToken();

      expect(apres).not.toBe(avant);
      expect(getCsrfToken()).toBe(apres);
    });
  });

  describe('clearCsrfToken', () => {
    it('supprime le jeton de la session', () => {
      const avant = getCsrfToken();
      clearCsrfToken();

      expect(getCsrfToken()).not.toBe(avant);
    });
  });

  describe('verifyCsrfToken', () => {
    it('accepte le jeton de la session', () => {
      expect(verifyCsrfToken(getCsrfToken())).toBe(true);
    });

    it('refuse un jeton étranger', () => {
      getCsrfToken();
      expect(verifyCsrfToken('a'.repeat(64))).toBe(false);
    });

    it('refuse un jeton de longueur différente', () => {
      getCsrfToken();
      expect(verifyCsrfToken('abc')).toBe(false);
    });

    it('refuse une valeur vide', () => {
      getCsrfToken();
      expect(verifyCsrfToken('')).toBe(false);
    });

    it('refuse toute vérification sans jeton en session', () => {
      expect(verifyCsrfToken('a'.repeat(64))).toBe(false);
    });

    it('refuse l\'ancien jeton après rotation', () => {
      const ancien = getCsrfToken();
      rotateCsrfToken();

      expect(verifyCsrfToken(ancien)).toBe(false);
    });
  });

  describe('attachCsrfProtection', () => {
    function makeInstance() {
      const instance = axios.create({ baseURL: 'http://localhost:3001' });
      attachCsrfProtection(instance);
      return instance;
    }

    async function runInterceptors(
      instance: ReturnType<typeof makeInstance>,
      method: string,
    ) {
      // On exécute l'intercepteur sans émettre de requête réseau.
      const handlers = instance.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => unknown }>;
      };

      const config = {
        method,
        url: '/test',
        headers: new axios.AxiosHeaders(),
      };

      return handlers.handlers[0].fulfilled(config) as {
        headers: { get: (name: string) => unknown };
      };
    }

    it('ajoute le jeton aux requêtes de création', async () => {
      const instance = makeInstance();
      const config = await runInterceptors(instance, 'post');

      expect(config.headers.get(CSRF_HEADER)).toBe(getCsrfToken());
    });

    it('ajoute le jeton aux requêtes de modification et de suppression', async () => {
      const instance = makeInstance();

      for (const method of ['put', 'patch', 'delete']) {
        const config = await runInterceptors(instance, method);
        expect(config.headers.get(CSRF_HEADER)).toBeTruthy();
      }
    });

    // Une requête de lecture n'a aucun effet de bord : la protéger n'apporte
    // rien et alourdirait chaque appel.
    it('n\'ajoute pas le jeton aux requêtes de lecture', async () => {
      const instance = makeInstance();
      const config = await runInterceptors(instance, 'get');

      expect(config.headers.get(CSRF_HEADER)).toBeUndefined();
    });

    it('traite la méthode indifféremment de sa casse', async () => {
      const instance = makeInstance();
      const config = await runInterceptors(instance, 'POST');

      expect(config.headers.get(CSRF_HEADER)).toBeTruthy();
    });
  });

  describe('CsrfError', () => {
    it('porte un nom distinct pour être reconnue à la capture', () => {
      const error = new CsrfError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('CsrfError');
    });

    it('accepte un message personnalisé', () => {
      expect(new CsrfError('Jeton expiré').message).toBe('Jeton expiré');
    });
  });
});