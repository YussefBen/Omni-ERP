// Dérivation d'un score de satisfaction depuis un commentaire JSONPlaceholder.
// L'API ne fournit aucune note : on en calcule une à partir de l'identifiant.

import type { Feedback, JsonPlaceholderComment } from '../types';

// Hash entier 32 bits, sans état ni aléatoire : le commentaire 42 donne
// toujours le même score, sinon le NPS changerait à chaque rafraîchissement.
function hashId(id: number): number {
  let x = Math.imul(id, 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return x >>> 0;
}

// Échelle volontairement déséquilibrée vers le haut : elle reproduit
// une satisfaction B2B plausible (NPS ≈ 25) plutôt qu'une répartition uniforme.
const SCORE_SCALE = [3, 4, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 10];

export function deriveScore(commentId: number): number {
  return SCORE_SCALE[hashId(commentId) % SCORE_SCALE.length];
}

// Première phrase du commentaire : les corps JSONPlaceholder sont longs
// et multilignes, inexploitables tels quels dans une liste.
function toExcerpt(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  const firstSentence = flat.split(/[.!?]/)[0];
  const excerpt = firstSentence.length > 10 ? firstSentence : flat;
  return excerpt.length > 140 ? `${excerpt.slice(0, 137)}...` : excerpt;
}

// Le postId sert de rattachement client : les 100 posts couvrent
// les identifiants clients exploités par le CRM.
export function toFeedback(comment: JsonPlaceholderComment): Feedback {
  return {
    id: comment.id,
    clientId: comment.postId,
    score: deriveScore(comment.id),
    comment: toExcerpt(comment.body),
    authorName: comment.name,
    authorEmail: comment.email,
  };
}