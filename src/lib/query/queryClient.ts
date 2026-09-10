import { MutationCache, QueryClient } from '@tanstack/react-query';
import { captureException } from '@/features/monitoring';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  // Toute mutation qui échoue part aussi vers Sentry
  mutationCache: new MutationCache({
    onError: (error) => {
      captureException(error, { source: 'mutation' });
    },
  }),
});