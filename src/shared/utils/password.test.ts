import { describe, it, expect } from 'vitest';
import {
  getPasswordCriteria,
  getPasswordStrength,
  loginSchema,
  passwordSchema,
  registerSchema,
} from './password';

// Mot de passe conforme à toutes les exigences, utilisé comme base
// pour isoler chaque règle dans les tests de schéma.
const VALIDE = 'Kx7#mQ2$vLp';

function criterion(password: string, id: string) {
  return getPasswordCriteria(password).find((c) => c.id === id);
}

describe('getPasswordCriteria', () => {
  it('évalue chaque exigence séparément', () => {
    const criteria = getPasswordCriteria('abc');

    expect(criteria).toHaveLength(6);
    expect(criteria.map((c) => c.id)).toEqual([
      'length',
      'uppercase',
      'lowercase',
      'digit',
      'special',
      'notCommon',
    ]);
  });

  it('valide la longueur à partir de huit caractères', () => {
    expect(criterion('Aa1!bcd', 'length')?.met).toBe(false);
    expect(criterion('Aa1!bcde', 'length')?.met).toBe(true);
  });

  it('détecte majuscule, minuscule, chiffre et caractère spécial', () => {
    expect(criterion('ABCDEFGH', 'uppercase')?.met).toBe(true);
    expect(criterion('abcdefgh', 'uppercase')?.met).toBe(false);
    expect(criterion('ABCDEFGH', 'lowercase')?.met).toBe(false);
    expect(criterion('abcdefg1', 'digit')?.met).toBe(true);
    expect(criterion('abcdefgh', 'digit')?.met).toBe(false);
    expect(criterion('abcdefg!', 'special')?.met).toBe(true);
    expect(criterion('abcdefg1', 'special')?.met).toBe(false);
  });

  it('accepte les accents et les espaces comme caractères spéciaux', () => {
    expect(criterion('abcdefgé', 'special')?.met).toBe(true);
    expect(criterion('abc defg', 'special')?.met).toBe(true);
  });

  // Un mot de passe peut remplir toutes les règles de composition tout en
  // figurant dans les listes de fuites : la complexité apparente ne protège pas.
  it('rejette un mot de passe contenant un terme courant', () => {
    expect(criterion('Password1!', 'notCommon')?.met).toBe(false);
    expect(criterion('MonAzerty42#', 'notCommon')?.met).toBe(false);
  });

  it('ignore la casse dans la détection des termes courants', () => {
    expect(criterion('PASSWORD1!', 'notCommon')?.met).toBe(false);
    expect(criterion('PaSsWoRd1!', 'notCommon')?.met).toBe(false);
  });

  it('accepte un mot de passe sans terme courant', () => {
    expect(criterion(VALIDE, 'notCommon')?.met).toBe(true);
  });
});

describe('getPasswordStrength', () => {
  it('renvoie un état neutre sur une saisie vide', () => {
    const strength = getPasswordStrength('');

    expect(strength.score).toBe(0);
    expect(strength.level).toBe('vide');
    expect(strength.label).toBe('');
    expect(strength.isValid).toBe(false);
  });

  it('classe un mot de passe trivial comme faible', () => {
    expect(getPasswordStrength('abc').level).toBe('faible');
  });

  it('classe un mot de passe complet comme bon ou excellent', () => {
    expect(['bon', 'excellent']).toContain(getPasswordStrength(VALIDE).level);
  });

  // La longueur pèse dans le score : deux mots de passe remplissant les mêmes
  // critères ne se valent pas si l'un est bien plus long.
  it('valorise la longueur au-delà du minimum requis', () => {
    const court = getPasswordStrength('Kx7#mQ2$');
    const long = getPasswordStrength('Kx7#mQ2$vLp8wRn5');

    expect(long.score).toBeGreaterThan(court.score);
  });

  it('maintient le score dans l\'échelle de 0 à 4', () => {
    const echantillons = ['a', 'abc', 'Abc1', 'Abc1!def', VALIDE, 'X'.repeat(40) + 'a1!'];

    for (const password of echantillons) {
      const { score } = getPasswordStrength(password);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });

  it('accompagne chaque niveau d\'un libellé sauf le niveau vide', () => {
    expect(getPasswordStrength('').label).toBe('');
    expect(getPasswordStrength('abc').label).toBe('Faible');
    expect(getPasswordStrength(VALIDE).label).not.toBe('');
  });

  // Cas décisif : ce mot de passe satisfait les cinq règles de composition
  // mais reste invalide car trop courant. Le score et la validité sont
  // deux informations distinctes.
  it('invalide un mot de passe courant malgré une composition conforme', () => {
    const strength = getPasswordStrength('Password1!');

    expect(criterion('Password1!', 'length')?.met).toBe(true);
    expect(criterion('Password1!', 'uppercase')?.met).toBe(true);
    expect(criterion('Password1!', 'digit')?.met).toBe(true);
    expect(criterion('Password1!', 'special')?.met).toBe(true);
    expect(strength.isValid).toBe(false);
  });

  it('valide un mot de passe remplissant tous les critères', () => {
    expect(getPasswordStrength(VALIDE).isValid).toBe(true);
  });
});

describe('passwordSchema', () => {
  it('accepte un mot de passe conforme', () => {
    expect(passwordSchema.safeParse(VALIDE).success).toBe(true);
  });

  it('refuse un mot de passe trop court', () => {
    expect(passwordSchema.safeParse('Kx7#mQ2').success).toBe(false);
  });

  it('refuse un mot de passe sans majuscule', () => {
    expect(passwordSchema.safeParse('kx7#mq2$vlp').success).toBe(false);
  });

  it('refuse un mot de passe sans chiffre', () => {
    expect(passwordSchema.safeParse('Kx#mQ$vLpZq').success).toBe(false);
  });

  it('refuse un mot de passe sans caractère spécial', () => {
    expect(passwordSchema.safeParse('Kx7mQ2vLp8w').success).toBe(false);
  });

  it('refuse un mot de passe courant', () => {
    expect(passwordSchema.safeParse('Password1!').success).toBe(false);
  });

  // Un message par règle plutôt qu'un refus global : l'utilisateur doit
  // savoir ce qu'il lui manque.
  it('indique la règle enfreinte dans le message', () => {
    const result = passwordSchema.safeParse('kx7#mq2$vlp');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('majuscule');
    }
  });
});

describe('loginSchema', () => {
  it('accepte des identifiants valides', () => {
    const result = loginSchema.safeParse({
      email: 'utilisateur@exemple.fr',
      password: 'nimportequoi',
    });

    expect(result.success).toBe(true);
  });

  // Un compte créé avant l'entrée en vigueur de la politique doit rester
  // utilisable : la connexion ne réapplique pas les règles de composition.
  it('n\'applique pas la politique à la connexion', () => {
    const result = loginSchema.safeParse({ email: 'a@b.fr', password: 'abc' });
    expect(result.success).toBe(true);
  });

  it('refuse une adresse e-mail invalide', () => {
    expect(loginSchema.safeParse({ email: 'pas-un-email', password: 'x' }).success).toBe(
      false,
    );
  });

  it('refuse un mot de passe vide', () => {
    expect(loginSchema.safeParse({ email: 'a@b.fr', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepte une inscription conforme', () => {
    const result = registerSchema.safeParse({
      email: 'nouveau@exemple.fr',
      password: VALIDE,
      confirmPassword: VALIDE,
    });

    expect(result.success).toBe(true);
  });

  it('refuse une confirmation différente', () => {
    const result = registerSchema.safeParse({
      email: 'nouveau@exemple.fr',
      password: VALIDE,
      confirmPassword: `${VALIDE}x`,
    });

    expect(result.success).toBe(false);
  });

  // L'erreur doit être rattachée au champ de confirmation pour s'afficher
  // au bon endroit dans le formulaire.
  it('rattache l\'erreur au champ de confirmation', () => {
    const result = registerSchema.safeParse({
      email: 'nouveau@exemple.fr',
      password: VALIDE,
      confirmPassword: 'autre',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('confirmPassword'));
      expect(issue).toBeDefined();
    }
  });

  it('applique la politique complète à l\'inscription', () => {
    const result = registerSchema.safeParse({
      email: 'nouveau@exemple.fr',
      password: 'abc',
      confirmPassword: 'abc',
    });

    expect(result.success).toBe(false);
  });
});