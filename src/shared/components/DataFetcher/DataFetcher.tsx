import type { ReactNode } from "react";

// Forme standard que doivent respecter tous les hooks de lecture du projet
// (temp-hooks/ comme hooks réels livrés par Membre A / Membre B via React Query)
export interface DataFetcherState<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

interface DataFetcherProps<T> {
  // N'importe quel hook respectant DataFetcherState<T> : mock ou hook réel, sans distinction
  useDataHook: () => DataFetcherState<T>;
  children: (state: DataFetcherState<T>) => ReactNode;
}

// Partage la logique de fetch/loading/erreur via une fonction enfant (render prop),
// sans imposer de UI : chaque écran décide comment afficher chaque état
export function DataFetcher<T>({ useDataHook, children }: DataFetcherProps<T>) {
  const state = useDataHook();
  return <>{children(state)}</>;
}

/*
Exemple d'usage :

<DataFetcher useDataHook={useProjectsMock}>
  {({ data, isLoading, isError, error, refetch }) => {
    if (isLoading) return <Spinner />;
    if (isError) return <ErrorMessage message={error?.message} onRetry={refetch} />;
    return <ProjectList projects={data ?? []} />;
  }}
</DataFetcher>

Le jour où Membre A livre le vrai useProjects, il suffit de remplacer
useDataHook={useProjectsMock} par useDataHook={useProjects} : le contrat
étant identique, rien d'autre ne change dans ce composant.
*/
