import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import { useCreateLeaveRequest, useLeaveRequests, useUpdateLeaveStatus } from './useLeaveRequests';

const LOCAL = 'http://localhost:3001';

function renderListAndMutation<T>(useMutationHook: () => T, employeeId?: number) {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const list = renderHook(() => useLeaveRequests(employeeId), { wrapper });
  const mutation = renderHook(useMutationHook, { wrapper });

  return { client, list, mutation };
}

describe('useLeaveRequests', () => {
  it('charge toutes les demandes', async () => {
    const { result } = renderHook(() => useLeaveRequests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
  });

  it('filtre par employé', async () => {
    const { result } = renderHook(() => useLeaveRequests(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].employeeId).toBe(1);
  });

  it('signale une erreur réseau', async () => {
    server.use(http.get(`${LOCAL}/leaveRequests`, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useLeaveRequests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateLeaveRequest', () => {
  it('crée une nouvelle demande, toujours en attente au départ', async () => {
    const { list, mutation } = renderListAndMutation(useCreateLeaveRequest);
    await waitFor(() => expect(list.result.current.data).toHaveLength(2));

    act(() => {
      mutation.result.current.mutate({
        employeeId: 5,
        type: 'conges_payes',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });
    });

    await waitFor(() => expect(list.result.current.data).toHaveLength(3));

    const created = list.result.current.data?.find((r) => r.employeeId === 5);
    expect(created?.status).toBe('pending');
  });
});

describe('useUpdateLeaveStatus', () => {
  it('valide une demande en attente', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateLeaveStatus);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ id: 2, status: 'approved' });
    });

    await waitFor(() => {
      const item = list.result.current.data?.find((r) => r.id === 2);
      expect(item?.status).toBe('approved');
    });
  });

  it('refuse une demande en attente', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateLeaveStatus);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ id: 2, status: 'rejected' });
    });

    await waitFor(() => {
      const item = list.result.current.data?.find((r) => r.id === 2);
      expect(item?.status).toBe('rejected');
    });
  });
});