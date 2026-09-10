import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import { useCheckIn, useCheckOut, usePresence } from './usePresence';

function renderPresenceAndMutation<T>(useMutationHook: (employeeId: number) => T, employeeId: number) {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const presence = renderHook(() => usePresence(employeeId), { wrapper });
  const mutation = renderHook(() => useMutationHook(employeeId), { wrapper });

  return { presence, mutation };
}

describe('usePresence', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('charge l\'entrée du jour pour un employé', async () => {
    const { result } = renderHook(() => usePresence(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.employeeId).toBe(1);
    expect(result.current.data?.checkIn).toBeTruthy();
    expect(result.current.data?.checkOut).toBeNull();
  });

  it('ne trouve rien pour un employé sans présence aujourd\'hui', async () => {
    const { result } = renderHook(() => usePresence(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
  });
});

describe('useCheckIn', () => {
  it('enregistre une arrivée', async () => {
    const { presence, mutation } = renderPresenceAndMutation(useCheckIn, 7);
    await waitFor(() => expect(presence.result.current.isLoading).toBe(false));

    act(() => {
      mutation.result.current.mutate();
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));
    expect(mutation.result.current.isError).toBe(false);
  });
});

describe('useCheckOut', () => {
  it('enregistre un départ pour une entrée existante', async () => {
    const { mutation } = renderPresenceAndMutation(useCheckOut, 1);

    act(() => {
      mutation.result.current.mutate(1);
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));
    expect(mutation.result.current.isError).toBe(false);
  });
});