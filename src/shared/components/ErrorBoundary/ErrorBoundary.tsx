import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureException } from "@/features/monitoring";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  // Permet à un appelant de fournir sa propre UI de repli ; sinon un fallback générique est utilisé
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Composant classe obligatoire : componentDidCatch n'a pas d'équivalent en hooks
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Erreur de rendu capturée :", error, info.componentStack);
    captureException(error, { componentStack: info.componentStack });
  }

  // Permet de retenter le rendu des enfants sans recharger toute la page
  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback(error, this.reset);
      }

      return (
        <div className={styles.fallback} role="alert">
          <p className={styles.title}>Une erreur est survenue</p>
          <p className={styles.message}>{error.message}</p>
          <button type="button" className={styles.retryButton} onClick={this.reset}>
            Réessayer
          </button>
        </div>
      );
    }

    return children;
  }
}
