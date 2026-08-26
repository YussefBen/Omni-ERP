// Configuration commune à tous les tests.

import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
// Étend expect avec les assertions de Testing Library (toBeInTheDocument, etc.)
import '@testing-library/jest-dom/vitest';
import { server } from '@/shared/mocks/server';

// Une requête non interceptée signale un appel réseau oublié : on la
// signale plutôt que de la laisser atteindre la vraie API.
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

afterEach(() => {
  // Les surcharges posées par un test ne doivent pas fuir vers le suivant.
  server.resetHandlers();
  cleanup();
});

afterAll(() => server.close());