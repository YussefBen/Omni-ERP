import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

/** Force la valeur de navigator.onLine, non modifiable directement. */
function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('useOnlineStatus', () => {
  afterEach(() => {
    setOnline(true);
    vi.restoreAllMocks();
  });

  it('reflète l\'état de connexion au montage', () => {
    setOnline(true);
    expect(renderHook(() => useOnlineStatus()).result.current).toBe(true);
  });

  it('signale une absence de connexion au montage', () => {
    setOnline(false);
    expect(renderHook(() => useOnlineStatus()).result.current).toBe(false);
  });

  it('bascule lorsque la connexion est perdue', () => {
    setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('bascule lorsque la connexion revient', () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('suit plusieurs basculements successifs', () => {
    setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  // Sans libération des écouteurs au démontage, chaque montage en
  // empilerait un de plus — la fuite classique avec les abonnements
  // à des sources extérieures à React.
  it('libère ses écouteurs au démontage', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    const events = remove.mock.calls.map((call) => call[0]);
    expect(events).toContain('online');
    expect(events).toContain('offline');
  });

  it('ne laisse aucun écouteur actif après plusieurs cycles', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');

    for (let i = 0; i < 3; i += 1) {
      renderHook(() => useOnlineStatus()).unmount();
    }

    const ajouts = add.mock.calls.filter((c) => c[0] === 'online').length;
    const retraits = remove.mock.calls.filter((c) => c[0] === 'online').length;

    expect(retraits).toBe(ajouts);
  });

  // Plusieurs composants peuvent consulter l'état simultanément :
  // ils doivent tous recevoir le changement.
  it('informe plusieurs abonnés du même changement', () => {
    setOnline(true);
    const premier = renderHook(() => useOnlineStatus());
    const second = renderHook(() => useOnlineStatus());

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(premier.result.current).toBe(false);
    expect(second.result.current).toBe(false);
  });
});