// Hooks du catalogue produits. Respectent le contrat de forme du socle commun.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import {
  fetchAllProducts,
  fetchProductById,
  fetchProductCategories,
  fetchProducts,
} from '../services/erpService';
import { erpKeys } from './erpKeys';
import type { PaginatedProducts, Product, ProductFilters } from '../types';

interface UseProductsResult {
  data: PaginatedProducts | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  // Vrai pendant le chargement d'une nouvelle page, l'ancienne restant affichée.
  isFetching: boolean;
  totalPages: number;
}

// Catalogue paginé. Le terme de recherche est temporisé : la requête
// n'est émise qu'une fois la saisie stabilisée.
export function useProducts(filters: ProductFilters = {}): UseProductsResult {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const debouncedSearch = useDebounce(filters.search ?? '');

  const appliedFilters: ProductFilters = {
    page,
    pageSize,
    category: filters.category,
    search: debouncedSearch || undefined,
  };

  const query = useQuery({
    queryKey: erpKeys.productList(appliedFilters),
    queryFn: () => fetchProducts(appliedFilters),
    // Conserve la page précédente pendant le chargement de la suivante :
    // évite le clignotement du catalogue à chaque changement de page.
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
    totalPages: query.data ? Math.ceil(query.data.total / pageSize) : 0,
  };
}

interface UseProductResult {
  data: Product | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Fiche produit. La requête reste en attente tant qu'aucun identifiant n'est fourni.
export function useProduct(id: number | undefined): UseProductResult {
  const query = useQuery({
    queryKey: erpKeys.productDetail(id ?? 0),
    queryFn: () => fetchProductById(id as number),
    enabled: typeof id === 'number',
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

interface UseProductCategoriesResult {
  data: string[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Liste des catégories, pour alimenter le filtre du catalogue.
// Référentiel figé : inutile de le rafraîchir en cours de session.
export function useProductCategories(): UseProductCategoriesResult {
  const query = useQuery({
    queryKey: erpKeys.productCategories(),
    queryFn: fetchProductCategories,
    staleTime: Infinity,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

interface UseProductCatalogResult {
  data: Product[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Catalogue complet, sans pagination. Réservé aux calculs qui portent sur
// l'ensemble du référentiel : alertes de stock, taux de rotation, indicateurs BI.
// À ne pas utiliser pour afficher une liste — useProducts est fait pour ça.
export function useProductCatalog(): UseProductCatalogResult {
  const query = useQuery({
    queryKey: erpKeys.productCatalog(),
    queryFn: fetchAllProducts,
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}