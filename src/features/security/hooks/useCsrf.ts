// Accès au jeton CSRF depuis un composant, pour un formulaire qui
// n'utiliserait pas Axios ou pour l'afficher en démonstration.

import { useCallback, useState } from 'react';
import { getCsrfToken, rotateCsrfToken } from '../services/csrf';

interface UseCsrfResult {
  token: string;
  /** Renouvelle le jeton. À appeler après une connexion ou une déconnexion. */
  rotate: () => void;
}

export function useCsrf(): UseCsrfResult {
  // Initialisation paresseuse plutôt qu'un effet : la lecture du jeton
  // n'a lieu qu'au premier rendu, sans déclencher de rendu supplémentaire.
  const [token, setToken] = useState<string>(() => getCsrfToken());

  const rotate = useCallback(() => {
    setToken(rotateCsrfToken());
  }, []);

  return { token, rotate };
}