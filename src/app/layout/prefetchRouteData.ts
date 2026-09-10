// Préchargement des données d'un écran au survol de son lien de navigation.
//
// Chaque écran déclare ici les requêtes de son premier affichage, avec
// exactement les filtres qu'il utilisera. Les descriptions viennent des
// fabriques queryOptions des hooks : l'écran et le préchargement produisent
// donc la même clé de cache, et au clic les données sont déjà disponibles.
//
// On importe les fichiers de hooks, jamais les composants : importer un
// écran ici le ferait entrer dans le fichier principal et annulerait son
// chargement différé.

import type { QueryClient } from '@tanstack/react-query';
import { ALL_CLIENTS, clientListOptions } from '@/features/crm/hooks/useClients';
import {
  ALL_PRODUCTS,
  productCategoriesOptions,
  productListOptions,
} from '@/features/erp/hooks/useProducts';
import { orderListOptions } from '@/features/erp/hooks/useOrders';

const ROUTE_QUERIES: Record<string, (queryClient: QueryClient) => Promise<void>[]> = {
  '/clients': (queryClient) => [
    queryClient.prefetchQuery(clientListOptions({ pageSize: ALL_CLIENTS })),
  ],
  '/products': (queryClient) => [
    queryClient.prefetchQuery(productListOptions({ pageSize: ALL_PRODUCTS })),
    queryClient.prefetchQuery(productCategoriesOptions()),
  ],
  '/orders': (queryClient) => [queryClient.prefetchQuery(orderListOptions())],
};

// prefetchQuery ne relance pas une requête encore fraîche (staleTime) et
// n'échoue jamais : un survol répété ou une API indisponible restent sans
// effet sur la navigation.
export async function prefetchRouteData(queryClient: QueryClient, to: string): Promise<void> {
  const queries = ROUTE_QUERIES[to];
  if (!queries) return;
  await Promise.all(queries(queryClient));
}