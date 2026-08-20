// Hooks de lecture et de qualification des clients CRM.
// Respectent le contrat de forme du socle commun.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import { fetchClientById, fetchClients, updateClientStatus } from '../services/crmService';
import { crmKeys } from './crmKeys';
import type {
  ClientDetail,
  ClientFilters,
  ClientProfile,
  PaginatedClients,
  UpdateClientStatusPayload,
} from '../types';

interface UseClientsResult {
  data: PaginatedClients | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  // Vrai pendant le chargement d'une nouvelle page, l'ancienne restant affichée.
  isFetching: boolean;
  totalPages: number;
}

// Liste paginée des clients. Le terme de recherche est temporisé :
// la requête n'est émise qu'une fois la saisie stabilisée.
export function useClients(filters: ClientFilters = {}): UseClientsResult {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const debouncedSearch = useDebounce(filters.search ?? '');

  const appliedFilters: ClientFilters = {
    page,
    pageSize,
    search: debouncedSearch || undefined,
  };

  const query = useQuery({
    queryKey: crmKeys.clientList(appliedFilters),
    queryFn: () => fetchClients(appliedFilters),
    // Conserve la page précédente pendant le chargement de la suivante :
    // évite le clignotement de la liste à chaque changement de page.
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

interface UseClientResult {
  data: ClientDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Fiche client avec l'historique d'achats détaillé.
// La requête reste en attente tant qu'aucun identifiant n'est fourni.
export function useClient(id: number | undefined): UseClientResult {
  const query = useQuery({
    queryKey: crmKeys.clientDetail(id ?? 0),
    queryFn: () => fetchClientById(id as number),
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

// Qualification manuelle d'un client. Invalide les listes et la fiche
// pour que le nouveau statut apparaisse partout.
export function useUpdateClientStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ClientProfile, Error, UpdateClientStatusPayload>({
    mutationFn: updateClientStatus,
    onSuccess: (_profile, payload) => {
      void queryClient.invalidateQueries({ queryKey: crmKeys.clients() });
      void queryClient.invalidateQueries({
        queryKey: crmKeys.clientDetail(payload.clientId),
      });
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