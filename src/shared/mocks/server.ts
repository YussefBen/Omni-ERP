// Serveur d'interception utilisé par les tests, en environnement Node.
// Distinct du service worker du navigateur, qui n'a pas cours ici.

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);