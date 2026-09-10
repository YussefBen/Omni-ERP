// Protection CSRF sur les requêtes qui modifient des données.
//
// Limite assumée : le projet n'a pas de serveur applicatif. Aucune contrepartie
// ne vérifie le jeton, la garantie reste donc théorique. Le mécanisme est
// complet — génération, transmission, vérification, rotation — pour que le
// branchement sur un vrai serveur ne demande que de déplacer la vérification.

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_STORAGE_KEY = 'omnierp-csrf';

// Méthodes qui modifient l'état du serveur. GET et HEAD en sont exclus :
// une requête de lecture ne doit avoir aucun effet de bord.
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

/**
 * Jeton aléatoire de 256 bits, tiré du générateur cryptographique du
 * navigateur. Math.random() serait prédictible et donc inutilisable ici.
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Jeton de la session courante, créé au premier appel.
 * sessionStorage et non localStorage : le jeton meurt avec l'onglet,
 * ce qui réduit la fenêtre d'exploitation en cas de vol.
 */
export function getCsrfToken(): string {
  let token = sessionStorage.getItem(CSRF_STORAGE_KEY);

  if (!token) {
    token = generateToken();
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  }

  return token;
}

/** Renouvelle le jeton. À appeler à chaque connexion et déconnexion. */
export function rotateCsrfToken(): string {
  const token = generateToken();
  sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  return token;
}

export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_STORAGE_KEY);
}

/**
 * Vérifie qu'un jeton correspond à celui de la session.
 * La comparaison parcourt toute la chaîne quelle que soit la position de
 * la première différence : une comparaison qui s'arrête au premier écart
 * laisse fuir de l'information par le temps d'exécution.
 */
export function verifyCsrfToken(candidate: string): boolean {
  const expected = sessionStorage.getItem(CSRF_STORAGE_KEY);
  if (!expected || !candidate || expected.length !== candidate.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }

  return diff === 0;
}

export class CsrfError extends Error {
  constructor(message = 'Jeton CSRF absent ou invalide') {
    super(message);
    this.name = 'CsrfError';
  }
}

/**
 * Installe la protection sur une instance Axios.
 * Le jeton est ajouté aux requêtes modifiantes, puis vérifié avant l'envoi :
 * faute de serveur, la vérification a lieu ici. Sur une vraie API, cette
 * seconde étape se déplacerait côté serveur sans rien changer d'autre.
 */
export function attachCsrfProtection(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase();

    if (!MUTATING_METHODS.includes(method)) return config;

    const token = getCsrfToken();
    config.headers.set(CSRF_HEADER, token);

    if (!verifyCsrfToken(token)) {
      throw new CsrfError();
    }

    return config;
  });
}

export { CSRF_HEADER };