// Évaluation en direct de la robustesse d'un mot de passe pendant la saisie.

import { useMemo } from 'react';
import { getPasswordStrength, type PasswordStrength } from '@/shared/utils/password';

// Le calcul est mémoïsé : il est refait à chaque frappe, mais uniquement
// lorsque la valeur change réellement.
export function usePasswordStrength(password: string): PasswordStrength {
  return useMemo(() => getPasswordStrength(password), [password]);
}