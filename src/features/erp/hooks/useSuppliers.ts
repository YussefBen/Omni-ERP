// Hooks des fournisseurs : lecture, évaluation et rattachement au catalogue.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSupplierById, fetchSuppliers, evaluateSupplier } from '../services/erpService';
import { erpKeys } from './erpKeys';
import type { EvaluateSupplierPayload, Product, Supplier } from '../types';

interface UseSuppliersResult {
  data: Supplier[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSuppliers(): UseSuppliersResult {
  const query = useQuery({
    queryKey: erpKeys.suppliers(),
    queryFn: fetchSuppliers,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

interface UseSupplierResult {
  data: Supplier | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSupplier(id: number | undefined): UseSupplierResult {
  const query = useQuery({
    queryKey: erpKeys.supplierDetail(id ?? 0),
    queryFn: () => fetchSupplierById(id as number),
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

// Enregistre une note sur un fournisseur. La moyenne se recalcule à la lecture,
// il suffit donc d'invalider pour la voir se mettre à jour partout.
export function useEvaluateSupplier() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Supplier, Error, EvaluateSupplierPayload>({
    mutationFn: evaluateSupplier,
    onSuccess: (_supplier, { supplierId }) => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.suppliers() });
      void queryClient.invalidateQueries({ queryKey: erpKeys.supplierDetail(supplierId) });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// Produits fournis par un fournisseur donné, via ses catégories.
// Fonction pure : le rattachement n'existe pas côté API, il se déduit.
export function getSupplierProducts(supplier: Supplier, products: Product[]): Product[] {
  return products.filter((product) => supplier.categories.includes(product.category));
}

// Fournisseurs capables de réapprovisionner un produit donné,
// les mieux notés d'abord, puis les plus rapides.
export function getSuppliersForProduct(
  product: Product,
  suppliers: Supplier[],
): Supplier[] {
  return suppliers
    .filter((supplier) => supplier.categories.includes(product.category))
    .sort((a, b) => b.rating - a.rating || a.leadTimeDays - b.leadTimeDays);
}