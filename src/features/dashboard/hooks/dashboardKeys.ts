// Clés de cache React Query du tableau de bord.

export const dashboardKeys = {
  all: ['dashboard'] as const,

  weather: (city: string) => [...dashboardKeys.all, 'weather', city] as const,
  weatherForecast: (city: string) =>
    [...dashboardKeys.all, 'weather', 'forecast', city] as const,

  summary: () => [...dashboardKeys.all, 'summary'] as const,
};