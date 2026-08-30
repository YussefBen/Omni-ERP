import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';
import { useSettings } from './useSettings';

// on repart d'un état propre à chaque test grâce au localstorage
beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ displayName: '', language: 'fr' });
});

describe('useSettings', () => {
  it('renvoie les valeurs par défaut', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.data).toEqual({ displayName: '', language: 'fr' });
  });

  it('met à jour le nom affiché', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDisplayName('Jessica');
    });

    expect(result.current.data.displayName).toBe('Jessica');
  });

  it('met à jour la langue', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.data.language).toBe('en');
  });

  it('persiste les changements en localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDisplayName('Jessica');
    });

    const stored = JSON.parse(localStorage.getItem('omnierp-settings') ?? '{}');
    expect(stored.state.displayName).toBe('Jessica');
  });
});