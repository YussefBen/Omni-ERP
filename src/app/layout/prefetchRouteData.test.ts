import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { prefetchRouteData } from './prefetchRouteData';
import { ALL_CLIENTS, clientListOptions } from '@/features/crm/hooks/useClients';
import {
  ALL_PRODUCTS,
  productCategoriesOptions,
  productListOptions,
} from '@/features/erp/hooks/useProducts';
import { orderListOptions } from '@/features/erp/hooks/useOrders';

// gcTime laissé par défaut : avec le gcTime à 0 de createTestQueryClient,
// une requête préchargée, qui n'a encore aucun observateur, pourrait être
// retirée du cache avant l'assertion.
function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// Chaque test relit le cache avec les filtres exacts que l'écran passe à
// son hook au premier affichage. Si les clés divergeaient, le préchargement
// remplirait une entrée que l'écran ne consulterait jamais.
describe('prefetchRouteData', () => {
  it('précharge les clients sous la clé que demandera ClientList', async () => {
    const queryClient = createClient();

    await prefetchRouteData(queryClient, '/clients');

    const { queryKey } = clientListOptions({ search: '', pageSize: ALL_CLIENTS });
    expect(queryClient.getQueryData(queryKey)).toBeDefined();
  });

  it('précharge le catalogue et ses catégories pour ProductCatalog', async () => {
    const queryClient = createClient();

    await prefetchRouteData(queryClient, '/products');

    const { queryKey } = productListOptions({
      search: '',
      category: undefined,
      pageSize: ALL_PRODUCTS,
    });
    expect(queryClient.getQueryData(queryKey)).toBeDefined();
    expect(queryClient.getQueryData(productCategoriesOptions().queryKey)).toBeDefined();
  });

  it('précharge la première page des commandes pour OrderList', async () => {
    const queryClient = createClient();

    await prefetchRouteData(queryClient, '/orders');

    const { queryKey } = orderListOptions({ status: undefined, page: 1 });
    expect(queryClient.getQueryData(queryKey)).toBeDefined();
  });

  it("ne lance aucune requête pour un écran qui n'en déclare pas", async () => {
    const queryClient = createClient();

    await prefetchRouteData(queryClient, '/settings');

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});