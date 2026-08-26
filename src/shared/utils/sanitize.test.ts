import { describe, it, expect } from 'vitest';
import { isSafeUrl, safeUrl, sanitizeFields, sanitizeHtml, sanitizeText } from './sanitize';

describe('sanitizeText', () => {
  it('conserve un texte sans balise', () => {
    expect(sanitizeText('Une note tout à fait normale')).toBe(
      'Une note tout à fait normale',
    );
  });

  it('retire toute balise HTML', () => {
    expect(sanitizeText('<b>Gras</b> et <i>italique</i>')).toBe('Gras et italique');
  });

  // Vecteur XSS le plus direct : une balise script injectée dans un champ
  // libre et rendue telle quelle exécuterait du code chez tous les lecteurs.
  it('neutralise une balise script', () => {
    const result = sanitizeText('Avis <script>alert("xss")</script> piégé');

    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('neutralise un attribut événementiel', () => {
    const result = sanitizeText('<img src=x onerror="alert(1)">');

    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('neutralise une iframe', () => {
    expect(sanitizeText('<iframe src="https://malveillant.fr"></iframe>')).not.toContain(
      'iframe',
    );
  });

  it('supprime les espaces en bordure', () => {
    expect(sanitizeText('   texte   ')).toBe('texte');
  });

  it('tolère une valeur absente', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(undefined as never)).toBe('');
  });

  it('conserve les accents et la ponctuation française', () => {
    expect(sanitizeText("L'évaluation a été très satisfaisante — délai tenu.")).toBe(
      "L'évaluation a été très satisfaisante — délai tenu.",
    );
  });
});

describe('sanitizeHtml', () => {
  it('conserve les balises de mise en forme autorisées', () => {
    const result = sanitizeHtml('<p>Un <strong>point</strong> important</p>');

    expect(result).toContain('<strong>');
    expect(result).toContain('<p>');
  });

  it('conserve les listes', () => {
    const result = sanitizeHtml('<ul><li>Premier</li><li>Second</li></ul>');

    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('retire les balises hors de la liste autorisée', () => {
    const result = sanitizeHtml('<div><span>Texte</span></div>');

    expect(result).not.toContain('<div>');
    expect(result).not.toContain('<span>');
    expect(result).toContain('Texte');
  });

  // Un lien href="javascript:..." reste un vecteur classique, et les champs
  // de l'application n'ont pas l'usage des liens.
  it('retire les liens', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">Cliquer</a>');
    expect(result).not.toContain('<a');
  });

  it('retire tous les attributs, y compris sur les balises autorisées', () => {
    const result = sanitizeHtml('<p class="danger" style="color:red">Texte</p>');

    expect(result).not.toContain('class');
    expect(result).not.toContain('style');
    expect(result).toContain('Texte');
  });

  it('neutralise script et iframe', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).not.toContain('script');
    expect(sanitizeHtml('<iframe src="x"></iframe>')).not.toContain('iframe');
  });

  it('neutralise un formulaire injecté', () => {
    const result = sanitizeHtml('<form action="https://malveillant.fr"><input></form>');
    expect(result).not.toContain('<form');
  });
});

describe('sanitizeFields', () => {
  it('assainit uniquement les champs désignés', () => {
    const payload = {
      id: 1,
      notes: '<script>alert(1)</script>Note',
      autre: '<b>Non traité</b>',
    };

    const cleaned = sanitizeFields(payload, ['notes']);

    expect(cleaned.notes).not.toContain('script');
    expect(cleaned.autre).toBe('<b>Non traité</b>');
  });

  it('préserve les champs non textuels', () => {
    const payload = { id: 42, score: 5, notes: 'ok' };
    const cleaned = sanitizeFields(payload, ['id', 'score', 'notes'] as never);

    expect(cleaned.id).toBe(42);
    expect(cleaned.score).toBe(5);
  });

  it('ne modifie pas l\'objet d\'origine', () => {
    const payload = { notes: '<b>Texte</b>' };
    sanitizeFields(payload, ['notes']);

    expect(payload.notes).toBe('<b>Texte</b>');
  });
});

describe('isSafeUrl', () => {
  it('accepte http et https', () => {
    expect(isSafeUrl('https://cdn.dummyjson.com/image.webp')).toBe(true);
    expect(isSafeUrl('http://localhost:3001/suppliers')).toBe(true);
  });

  // Ces deux protocoles permettent l'exécution de code depuis un attribut
  // href ou src : ils sont refusés même sur une URL par ailleurs valide.
  it('refuse le protocole javascript', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('refuse le protocole data', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

    // Une chaîne quelconque est résolue comme un chemin relatif sur l'origine
  // courante, donc en http. C'est le comportement voulu : les chemins internes
  // du type /assets/logo.png passent par le même mécanisme, et une chaîne
  // invalide ne pointera vers rien sans jamais exécuter de code.
  it('accepte un chemin relatif résolu sur l\'origine courante', () => {
    expect(isSafeUrl('/assets/logo.png')).toBe(true);
  });

  it('refuse une chaîne dont le protocole est explicitement dangereux', () => {
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });
});

describe('safeUrl', () => {
  it('renvoie l\'URL lorsqu\'elle est sûre', () => {
    expect(safeUrl('https://exemple.fr/image.png')).toBe('https://exemple.fr/image.png');
  });

  // Renvoyer une chaîne vide plutôt que l'URL douteuse : l'image ne s'affiche
  // pas, mais aucun code ne s'exécute.
  it('renvoie une chaîne vide sur une URL douteuse', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
  });

  it('tolère une valeur absente', () => {
    expect(safeUrl(undefined)).toBe('');
    expect(safeUrl('')).toBe('');
  });
});