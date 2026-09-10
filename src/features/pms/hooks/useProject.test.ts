import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/queryWrapper';
import { useProject } from './useProject';

describe('useProject', () => {
  it('charge un seul projet par son id', async () => {
    const { result } = renderHook(() => useProject(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.id).toBe(2);
    expect(result.current.data?.title).toBe('Projet externe 2');
  });

  it('ne fait aucune requête tant qu\'aucun id n\'est fourni', async () => {
    const { result } = renderHook(() => useProject(undefined), { wrapper: createWrapper() });

    await new Promise((r) => setTimeout(r, 100));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('signale une erreur pour un id inexistant', async () => {
    const { result } = renderHook(() => useProject(999), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});