// Politique de mots de passe : validation stricte et évaluation de la robustesse.
// Fonctions pures, sans dépendance à React, utilisables dans un schéma comme à l'écran.

import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

// Un mot de passe long mais figurant dans les listes de fuites reste trivial
// à deviner : la longueur seule ne suffit pas à garantir la robustesse.
const COMMON_PASSWORDS = [
  'password',
  'motdepasse',
  'azerty',
  'qwerty',
  '123456',
  '12345678',
  'password1',
  'admin',
  'bonjour',
  'iloveyou',
];

export interface PasswordCriterion {
  id: 'length' | 'uppercase' | 'lowercase' | 'digit' | 'special' | 'notCommon';
  label: string;
  met: boolean;
}

// Évalue chaque exigence séparément, pour un affichage en liste à cocher
// plutôt qu'un message d'erreur unique et peu actionnable.
export function getPasswordCriteria(password: string): PasswordCriterion[] {
  const value = password ?? '';
  const normalized = value.toLowerCase();

  return [
    {
      id: 'length',
      label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
      met: value.length >= PASSWORD_MIN_LENGTH,
    },
    { id: 'uppercase', label: 'Une majuscule', met: /[A-Z]/.test(value) },
    { id: 'lowercase', label: 'Une minuscule', met: /[a-z]/.test(value) },
    { id: 'digit', label: 'Un chiffre', met: /[0-9]/.test(value) },
    {
      id: 'special',
      label: 'Un caractère spécial',
      met: /[^A-Za-z0-9]/.test(value),
    },
    {
      id: 'notCommon',
      label: 'Pas un mot de passe courant',
      met: value.length > 0 && !COMMON_PASSWORDS.some((c) => normalized.includes(c)),
    },
  ];
}

export type PasswordStrengthLevel = 'vide' | 'faible' | 'moyen' | 'bon' | 'excellent';

export interface PasswordStrength {
  // Score de 0 à 4, adapté à une barre de progression.
  score: number;
  level: PasswordStrengthLevel;
  label: string;
  criteria: PasswordCriterion[];
  // Vrai lorsque toutes les exigences obligatoires sont remplies.
  isValid: boolean;
}

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  vide: '',
  faible: 'Faible',
  moyen: 'Moyen',
  bon: 'Bon',
  excellent: 'Excellent',
};

export function getPasswordStrength(password: string): PasswordStrength {
  const value = password ?? '';
  const criteria = getPasswordCriteria(value);
  const metCount = criteria.filter((c) => c.met).length;

  if (value.length === 0) {
    return { score: 0, level: 'vide', label: '', criteria, isValid: false };
  }

  // La longueur pèse dans le score au-delà du minimum requis :
  // une phrase de passe longue résiste mieux qu'un mot court complexifié.
  let score = metCount;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;

  const normalized = Math.min(4, Math.max(1, Math.round((score / 8) * 4)));

  const level: PasswordStrengthLevel =
    normalized <= 1 ? 'faible' : normalized === 2 ? 'moyen' : normalized === 3 ? 'bon' : 'excellent';

  return {
    score: normalized,
    level,
    label: LEVEL_LABELS[level],
    criteria,
    isValid: criteria.every((c) => c.met),
  };
}

/* ---------- Schémas Zod ---------- */

// Chaque règle porte son propre message : l'utilisateur sait quoi corriger
// plutôt que de recevoir un refus global sans explication.
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères requis`)
  .regex(/[A-Z]/, 'Au moins une majuscule requise')
  .regex(/[a-z]/, 'Au moins une minuscule requise')
  .regex(/[0-9]/, 'Au moins un chiffre requis')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial requis')
  .refine(
    (value) => !COMMON_PASSWORDS.some((c) => value.toLowerCase().includes(c)),
    'Ce mot de passe est trop courant',
  );

export const emailSchema = z
  .string()
  .min(1, 'Adresse e-mail requise')
  .email('Adresse e-mail invalide');

export const loginSchema = z.object({
  email: emailSchema,
  // À la connexion, on ne réapplique pas la politique : un compte ancien
  // peut avoir un mot de passe qui ne la respecte plus.
  password: z.string().min(1, 'Mot de passe requis'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;