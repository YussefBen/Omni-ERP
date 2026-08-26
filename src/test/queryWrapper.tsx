// Environnement de test pour les hooks qui dépendent de React Query.

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Client isolé pour un test : les réessais sont désactivés, sinon un test
 * d'erreur attendrait plusieurs secondes avant d'échouer. Le cache est vide
 * à chaque appel, pour qu'aucun test n'hérite des données du précédent.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Enveloppe à passer à renderHook. */
export function createWrapper(client: QueryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}