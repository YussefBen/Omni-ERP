import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import { useLeaveBalance } from './useLeaveBalance';

const LOCAL = 'http://localhost:3001';

describe('useLeaveBalance', () => {
  it('calcule les jours utilisés depuis les congés approuvés', async () => {
    const { result } = renderHook(() => useLeaveBalance(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.totalDays).toBe(25);
    expect(result.current.data?.usedDays).toBe(5);
    expect(result.current.data?.remainingDays).toBe(20);
  });

  it('ignore les congés encore en attente', async () => {
    const { result } = renderHook(() => useLeaveBalance(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.usedDays).toBe(0);
    expect(result.current.data?.remainingDays).toBe(25);
  });

  it('renvoie un solde plein pour un employé sans aucune demande', async () => {
    const { result } = renderHook(() => useLeaveBalance(999), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.usedDays).toBe(0);
    expect(result.current.data?.remainingDays).toBe(25);
  });

  it('signale une erreur réseau', async () => {
    server.use(http.get(`${LOCAL}/leaveRequests`, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useLeaveBalance(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});