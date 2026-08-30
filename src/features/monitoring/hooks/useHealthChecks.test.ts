import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import { useHealthChecks } from './useHealthChecks';

const PLACEHOLDER = 'https://jsonplaceholder.typicode.com';
const DUMMY = 'https://dummyjson.com';
const REQRES = 'https://reqres.in/api';
const RANDOM_USER = 'https://randomuser.me/api';
const WEATHER = 'https://api.openweathermap.org/data/2.5';
const LOCAL = 'http://localhost:3001';


function mockAllServicesOk() {
  server.use(
    http.get(`${PLACEHOLDER}/posts/1`, () => HttpResponse.json({})),
    http.get(`${DUMMY}/products/1`, () => HttpResponse.json({})),
    http.get(`${REQRES}/users/1`, () => HttpResponse.json({})),
    http.get(`${RANDOM_USER}/`, () => HttpResponse.json({})),
    http.get(`${WEATHER}/weather`, () => HttpResponse.json({})),
    http.get(`${LOCAL}/tasks`, () => HttpResponse.json([])),
  );
}

describe('useHealthChecks', () => {
  it('marque un service "ok" quand il répond vite avec un succès', async () => {
    mockAllServicesOk();

    const { result } = renderHook(() => useHealthChecks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(6);
    expect(result.current.data?.every((s) => s.status === 'ok')).toBe(true);
  });

  it('marque un service "down" en cas d\'erreur serveur (5xx)', async () => {
    mockAllServicesOk();
    server.use(http.get(`${REQRES}/users/1`, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useHealthChecks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const reqres = result.current.data?.find((s) => s.name === 'Reqres');
    expect(reqres?.status).toBe('down');
  });

  it('marque un service "down" en cas d\'échec réseau, sans latence mesurée', async () => {
    mockAllServicesOk();
    server.use(http.get(`${DUMMY}/products/1`, () => HttpResponse.error()));

    const { result } = renderHook(() => useHealthChecks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const dummy = result.current.data?.find((s) => s.name === 'DummyJSON');
    expect(dummy?.status).toBe('down');
    expect(dummy?.latencyMs).toBeNull();
  });

  it('marque un service "degraded" quand il répond, mais lentement', async () => {
    mockAllServicesOk();
    server.use(
      http.get(`${WEATHER}/weather`, async () => {
        await new Promise((r) => setTimeout(r, 1600));
        return HttpResponse.json({});
      }),
    );

    const { result } = renderHook(() => useHealthChecks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    const weather = result.current.data?.find((s) => s.name === 'OpenWeatherMap');
    expect(weather?.status).toBe('degraded');
  }, 5000);
});