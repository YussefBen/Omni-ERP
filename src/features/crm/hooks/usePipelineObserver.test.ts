import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePipelineObserver } from './usePipelineObserver';
import { publishPipelineEvent } from '../services/pipelineEvents';

describe('usePipelineObserver', () => {
  it('ne contient rien au montage', () => {
    const { result } = renderHook(() => usePipelineObserver());

    expect(result.current.lastEvent).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('reçoit les événements publiés', async () => {
    const { result } = renderHook(() => usePipelineObserver());

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
    });

    await waitFor(() => expect(result.current.lastEvent).not.toBeNull());
    expect(result.current.lastEvent?.opportunityId).toBe(1);
  });

  it('conserve un historique, du plus récent au plus ancien', async () => {
    const { result } = renderHook(() => usePipelineObserver());

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
      publishPipelineEvent({ type: 'created', opportunityId: 2 });
    });

    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.history[0].opportunityId).toBe(2);
  });

  // Sans limite, un écran laissé ouvert accumulerait indéfiniment
  // les événements en mémoire.
  it('borne l\'historique à la taille demandée', async () => {
    const { result } = renderHook(() => usePipelineObserver({ historySize: 2 }));

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
      publishPipelineEvent({ type: 'created', opportunityId: 2 });
      publishPipelineEvent({ type: 'created', opportunityId: 3 });
    });

    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.history.map((e) => e.opportunityId)).toEqual([3, 2]);
  });

  it('filtre sur les seuls changements d\'étape', async () => {
    const { result } = renderHook(() =>
      usePipelineObserver({ stageChangesOnly: true }),
    );

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
      publishPipelineEvent({ type: 'stage-changed', opportunityId: 2, toStage: 'gagnee' });
    });

    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.history[0].opportunityId).toBe(2);
  });

  it('filtre sur une opportunité précise', async () => {
    const { result } = renderHook(() => usePipelineObserver({ opportunityId: 5 }));

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 5 });
      publishPipelineEvent({ type: 'created', opportunityId: 6 });
    });

    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.history[0].opportunityId).toBe(5);
  });

  it('appelle la fonction de rappel à chaque événement', async () => {
    const onEvent = vi.fn();
    renderHook(() => usePipelineObserver({ onEvent }));

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
    });

    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
    expect(onEvent.mock.calls[0][0].opportunityId).toBe(1);
  });

  // La fonction de rappel est gardée dans une référence : un parent qui
  // passe une fonction anonyme ne doit pas provoquer un nouvel abonnement
  // à chaque rendu.
  it('ne recrée pas l\'abonnement quand la fonction de rappel change', async () => {
    const premier = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ onEvent }) => usePipelineObserver({ onEvent }),
      { initialProps: { onEvent: premier } },
    );

    rerender({ onEvent: second });

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
    });

    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    // L'ancienne fonction n'est plus appelée, mais un seul événement
    // a été reçu : l'abonnement n'a pas été dupliqué.
    expect(premier).not.toHaveBeenCalled();
  });

  it('vide l\'historique à la demande', async () => {
    const { result } = renderHook(() => usePipelineObserver());

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
    });

    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
  });

  // Sans désabonnement au démontage, chaque montage empilerait un abonné
  // jamais libéré : la fuite mémoire classique avec RxJS.
  it('se désabonne au démontage', async () => {
    const onEvent = vi.fn();
    const { unmount } = renderHook(() => usePipelineObserver({ onEvent }));

    unmount();

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('ne laisse aucun abonné après plusieurs montages successifs', async () => {
    const onEvent = vi.fn();

    for (let i = 0; i < 3; i += 1) {
      const { unmount } = renderHook(() => usePipelineObserver({ onEvent }));
      unmount();
    }

    const dernier = renderHook(() => usePipelineObserver({ onEvent }));

    act(() => {
      publishPipelineEvent({ type: 'created', opportunityId: 1 });
    });

    // Un seul appel malgré les quatre montages : les trois premiers
    // abonnements ont bien été libérés.
    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
    dernier.unmount();
  });
});