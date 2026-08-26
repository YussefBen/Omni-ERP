import { useCallback, useEffect, useState } from "react";
import type { DataFetcherState } from "../components/DataFetcher/DataFetcher";

export interface ProjectMock {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "critical";
}

const MOCK_PROJECTS: ProjectMock[] = [
  { id: 1, title: "Refonte site vitrine", status: "in_progress", priority: "high" },
  { id: 2, title: "Migration API v2", status: "todo", priority: "critical" },
  { id: 3, title: "Audit sécurité", status: "done", priority: "medium" },
];

// Simule le futur useProjects() de Membre A (même forme de retour que DataFetcherState<T>).
// À supprimer et remplacer par l'import réel dès que le hook officiel est livré :
// import { useProjects } from "@/features/pms/hooks/useProjects";
export function useProjectsMock(): DataFetcherState<ProjectMock[]> {
  const [data, setData] = useState<ProjectMock[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    // setTimeout simule la latence réseau d'un vrai appel API
    const timeoutId = setTimeout(() => {
      setData(MOCK_PROJECTS);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [refetchIndex]);

  const refetch = useCallback(() => {
    setRefetchIndex((prev) => prev + 1);
  }, []);

  return { data, isLoading, isError, error, refetch };
}
