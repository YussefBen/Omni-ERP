// Hooks météo du tableau de bord. Respectent le contrat de forme du socle commun.

import { useQuery } from '@tanstack/react-query';
import { OPENWEATHER_KEY } from '@/shared/config/api';
import { fetchWeather, fetchWeatherForecast } from '../services/weatherService';
import { dashboardKeys } from './dashboardKeys';
import type { DailyForecast, Weather } from '../types';

const DEFAULT_CITY = 'Évry,FR';

interface UseWeatherResult {
  data: Weather | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  // Vrai lorsque la clé API n'est pas renseignée dans .env :
  // permet à l'écran d'expliquer la situation plutôt que d'afficher une erreur.
  isConfigured: boolean;
}

export function useWeather(city: string = DEFAULT_CITY): UseWeatherResult {
  const isConfigured = OPENWEATHER_KEY.length > 0;

  const query = useQuery({
    queryKey: dashboardKeys.weather(city),
    queryFn: () => fetchWeather(city),
    // La météo évolue lentement : inutile de rappeler l'API à chaque montage.
    staleTime: 1000 * 60 * 10,
    // Rafraîchissement automatique tant que l'écran reste ouvert.
    refetchInterval: 1000 * 60 * 15,
    enabled: isConfigured,
    retry: 1,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    isConfigured,
  };
}

interface UseWeatherForecastResult {
  data: DailyForecast[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isConfigured: boolean;
}

// Prévisions sur cinq jours, agrégées depuis les relevés tri-horaires.
export function useWeatherForecast(city: string = DEFAULT_CITY): UseWeatherForecastResult {
  const isConfigured = OPENWEATHER_KEY.length > 0;

  const query = useQuery({
    queryKey: dashboardKeys.weatherForecast(city),
    queryFn: () => fetchWeatherForecast(city),
    staleTime: 1000 * 60 * 30,
    enabled: isConfigured,
    retry: 1,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    isConfigured,
  };
}