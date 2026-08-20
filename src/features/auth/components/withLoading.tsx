// Affiche un Spinner pendant le chargement, ou une erreur, sinon le composant normal

import type { ComponentType } from 'react';
import { Spinner } from './Spinner/Spinner';

export interface WithLoadingProps {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
}

export function withLoading<P extends object>(Component: ComponentType<P>) {
  function WithLoading({ isLoading, isError, error, ...rest }: P & WithLoadingProps) {
    if (isLoading) return <Spinner />;

    if (isError) {
      return <div role="alert">{error?.message ?? 'Une erreur est survenue.'}</div>;
    }

    return <Component {...(rest as P)} />;
  }

  WithLoading.displayName = `withLoading(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WithLoading;
}