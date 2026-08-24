// Accès au jeton CSRF depuis un composant, pour un formulaire qui
// n'utiliserait pas Axios ou pour l'afficher en démonstration.

import { useCallback, useEffect, useState } from 'react';
import { getCsrfToken, rotateCsrfToken } from '../services/csrf';

interface UseCsrfResult {
  token: string;
  /** Renouvelle le jeton. À appeler après une connexion ou une déconnexion. */
  rotate: () => void;
}

export function useCsrf(): UseCsrfResult {
  const [token, setToken] = useState<string>('');

  // Le jeton est lu après le montage : sessionStorage n'existe pas
  // pendant un rendu côté serveur.
  useEffect(() => {
    setToken(getCsrfToken());
  }, []);

  const rotate = useCallback(() => {
    setToken(rotateCsrfToken());
  }, []);

  return { token, rotate };
}