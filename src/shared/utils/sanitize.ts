// Assainissement des contenus saisis par l'utilisateur.
// Toute donnée libre — commentaire, note, description — passe par ici
// avant d'être affichée ou envoyée à une API.

import DOMPurify from 'dompurify';

// Jeu de balises volontairement restreint : les champs de l'application
// n'ont besoin que d'emphase et de listes. Tout le reste est du bruit
// et augmente la surface d'attaque.
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'ul', 'ol', 'li'];

/**
 * Nettoie un contenu HTML en ne conservant qu'un jeu de balises sûres.
 * À utiliser uniquement quand le rendu HTML est réellement nécessaire.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['a', 'script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  });
}

/**
 * Retire toute balise et ne conserve que le texte.
 * C'est le traitement par défaut : un commentaire ou une note n'a aucune
 * raison de contenir du balisage.
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty ?? '', {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Assainit les champs texte d'un objet avant envoi à une API.
 * Le contenu est nettoyé à l'entrée comme à la sortie : une donnée
 * déjà stockée peut provenir d'une saisie antérieure non filtrée.
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  payload: T,
  fields: Array<keyof T>,
): T {
  const cleaned = { ...payload };

  for (const field of fields) {
    const value = cleaned[field];
    if (typeof value === 'string') {
      cleaned[field] = sanitizeText(value) as T[keyof T];
    }
  }

  return cleaned;
}

/**
 * Vérifie qu'une URL est bien en http ou https.
 * Les protocoles javascript: et data: permettent l'exécution de code
 * depuis un attribut href ou src.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Renvoie l'URL si elle est sûre, une chaîne vide sinon.
 * À utiliser sur toute URL provenant d'une source externe — les images
 * de DummyJSON, par exemple, ne sont pas sous notre contrôle.
 */
export function safeUrl(url: string | undefined): string {
  if (!url) return '';
  return isSafeUrl(url) ? url : '';
}