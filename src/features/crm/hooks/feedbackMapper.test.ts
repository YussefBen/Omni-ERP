import { describe, it, expect } from 'vitest';
import { deriveScore, toFeedback } from './feedbackMapper';
import type { JsonPlaceholderComment } from '../types';

function makeComment(
  id: number,
  overrides: Partial<JsonPlaceholderComment> = {},
): JsonPlaceholderComment {
  return {
    postId: 1,
    id,
    name: 'un titre de commentaire',
    email: 'auteur@exemple.fr',
    body: 'Première phrase du commentaire. Seconde phrase ignorée.',
    ...overrides,
  };
}

describe('deriveScore', () => {
  // Propriété essentielle : JSONPlaceholder ne fournit aucune note, le score
  // est calculé. S'il variait d'un appel à l'autre, le NPS changerait à chaque
  // rafraîchissement et l'indicateur n'aurait aucune valeur.
  it('renvoie toujours le même score pour un identifiant donné', () => {
    const first = deriveScore(42);
    const others = Array.from({ length: 50 }, () => deriveScore(42));

    expect(others.every((score) => score === first)).toBe(true);
  });

  it('reste dans l\'échelle de 0 à 10', () => {
    for (let id = 1; id <= 500; id += 1) {
      const score = deriveScore(id);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it('produit des scores différents selon l\'identifiant', () => {
    const scores = new Set(Array.from({ length: 100 }, (_, i) => deriveScore(i + 1)));
    // Un hash qui renverrait toujours la même valeur passerait les deux tests
    // précédents : il faut vérifier que la dispersion existe réellement.
    expect(scores.size).toBeGreaterThan(3);
  });

  it('répartit les avis sur les trois catégories du NPS', () => {
    const scores = Array.from({ length: 500 }, (_, i) => deriveScore(i + 1));

    const promoteurs = scores.filter((s) => s >= 9).length;
    const passifs = scores.filter((s) => s >= 7 && s <= 8).length;
    const detracteurs = scores.filter((s) => s <= 6).length;

    // Sans les trois catégories représentées, le NPS sortirait à 100 ou -100
    // et ne démontrerait rien.
    expect(promoteurs).toBeGreaterThan(0);
    expect(passifs).toBeGreaterThan(0);
    expect(detracteurs).toBeGreaterThan(0);
  });
});

describe('toFeedback', () => {
  it('rattache l\'avis au client via le postId', () => {
    const feedback = toFeedback(makeComment(1, { postId: 7 }));
    expect(feedback.clientId).toBe(7);
  });

  it('conserve l\'auteur du commentaire', () => {
    const feedback = toFeedback(
      makeComment(1, { name: 'Titre', email: 'test@exemple.fr' }),
    );

    expect(feedback.authorName).toBe('Titre');
    expect(feedback.authorEmail).toBe('test@exemple.fr');
  });

  it('ne conserve que la première phrase du commentaire', () => {
    const feedback = toFeedback(
      makeComment(1, { body: 'Service impeccable. Détail inutile ici.' }),
    );

    expect(feedback.comment).toBe('Service impeccable');
  });

  it('aplatit les sauts de ligne du corps original', () => {
    const feedback = toFeedback(
      makeComment(1, { body: 'Un avis\nsur plusieurs\nlignes sans ponctuation' }),
    );

    expect(feedback.comment).not.toContain('\n');
  });

  it('tronque les commentaires trop longs', () => {
    const feedback = toFeedback(makeComment(1, { body: 'a'.repeat(300) }));

    expect(feedback.comment?.length).toBeLessThanOrEqual(140);
    expect(feedback.comment?.endsWith('...')).toBe(true);
  });

  // Le contenu vient d'une API externe : il est traité comme non fiable.
  it('retire le balisage HTML du commentaire', () => {
    const feedback = toFeedback(
      makeComment(1, { body: 'Avis <script>alert(1)</script> suspect' }),
    );

    expect(feedback.comment).not.toContain('<script>');
    expect(feedback.comment).not.toContain('alert');
  });

  it('dérive le score depuis l\'identifiant du commentaire', () => {
    const feedback = toFeedback(makeComment(42));
    expect(feedback.score).toBe(deriveScore(42));
  });
});