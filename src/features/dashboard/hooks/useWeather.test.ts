import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import { useWeather, useWeatherForecast } from './useWeather';

vi.mock('@/features/hrm', () => ({
  getHRKPI: vi.fn(async (previous = false) =>
    previous
      ? { totalEmployees: 84, teamCount: 9, pendingLeaveRequests: 17, employeesOnLeaveToday: 4 }
      : { totalEmployees: 87, teamCount: 9, pendingLeaveRequests: 12, employeesOnLeaveToday: 6 },
  ),
}));

vi.mock('@/features/pms', () => ({
  getProjectsKPI: vi.fn(async (previous = false) =>
    previous
      ? { total: 21, active: 12, completed: 6, averageProgress: 58, overdue: 5 }
      : { total: 24, active: 11, completed: 9, averageProgress: 63, overdue: 3 },
  ),
}));

const { useDashboardData } = await import('./useDashboardData');

const WEATHER = 'https://api.openweathermap.org/data/2.5';

describe('useWeather', () => {
  it('charge les conditions actuelles', async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.city).toBe('Évry');
    expect(result.current.data?.country).toBe('FR');
  });

  it('arrondit les températures', async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    // 22,1 °C dans la réponse simulée
    expect(result.current.data?.temperature).toBe(22);
    expect(Number.isInteger(result.current.data?.temperature)).toBe(true);
  });

  // L'API renvoie des mètres par seconde même en unités métriques :
  // afficher cette valeur telle quelle induirait l'utilisateur en erreur.
  it('convertit la vitesse du vent en kilomètres par heure', async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    // 5 m/s
    expect(result.current.data?.windSpeedKmh).toBe(18);
  });

  it('compose l\'adresse de l\'icône', async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.iconUrl).toContain('04d');
    expect(result.current.data?.iconUrl).toMatch(/^https:\/\//);
  });

  it('convertit les horodatages en dates lisibles', async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(new Date(result.current.data!.observedAt).getTime()).not.toBeNaN();
    expect(new Date(result.current.data!.sunrise).getTime()).not.toBeNaN();
  });

  it('signale que la clé est configurée', async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    expect(result.current.isConfigured).toBe(true);
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(`${WEATHER}/weather`, () => new HttpResponse(null, { status: 401 })),
    );

    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
  });

  it('accepte une ville différente', async () => {
    const { result } = renderHook(() => useWeather('Lyon,FR'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toBeDefined();
  });
});

describe('useWeatherForecast', () => {
  it('agrège les relevés par journée', async () => {
    const { result } = renderHook(() => useWeatherForecast(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // Les deux relevés simulés portent sur la même journée
    expect(result.current.data).toHaveLength(1);
  });

  it('retient la température minimale et maximale du jour', async () => {
    const { result } = renderHook(() => useWeatherForecast(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const jour = result.current.data?.[0];

    expect(jour?.minTemperature).toBe(21);
    expect(jour?.maxTemperature).toBe(24);
  });

  it('nomme chaque journée', async () => {
    const { result } = renderHook(() => useWeatherForecast(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0].label).toBeTruthy();
  });

  // Le relevé dominant peut être nocturne alors que la vignette représente
  // une journée entière : l'icône est ramenée à sa variante diurne.
  it('retient une icône diurne', async () => {
    const { result } = renderHook(() => useWeatherForecast(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0].iconCode).not.toContain('n');
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(`${WEATHER}/forecast`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useWeatherForecast(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
  });
});

describe('useDashboardData', () => {
  it('rassemble les indicateurs, les alertes et la météo', async () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    expect(result.current.data?.highlights).toBeDefined();
    expect(result.current.data?.alerts).toBeDefined();
  });

  // Un indicateur par domaine : l'accueil donne une vue d'ensemble,
  // le détail se consulte sur les écrans dédiés.
  it('retient un indicateur par domaine', async () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });
    expect(result.current.data?.highlights).toHaveLength(5);
  });

  it('borne le nombre d\'alertes affichées', async () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });
    expect(result.current.data!.alerts.length).toBeLessThanOrEqual(5);
  });

  it('expose le nombre de ruptures', async () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });
    expect(result.current.data?.criticalAlertCount).toBe(1);
  });

  // La météo est un agrément : son indisponibilité ne doit pas priver
  // l'utilisateur de ses indicateurs.
  it('affiche le tableau de bord même sans météo', async () => {
    server.use(
      http.get(`${WEATHER}/weather`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    expect(result.current.isError).toBe(false);
    expect(result.current.data?.highlights).toHaveLength(5);
  });

  it('reste en chargement tant que les indicateurs ne sont pas prêts', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});