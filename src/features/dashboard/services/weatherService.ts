// Service météo : OpenWeatherMap, sixième source de données du projet.
// La clé vit dans .env, jamais dans le code.

import axios from 'axios';
import { API_CONFIG, OPENWEATHER_KEY } from '@/shared/config/api';
import type {
  DailyForecast,
  OpenWeatherCurrentResponse,
  OpenWeatherForecastResponse,
  Weather,
} from '../types';

const weatherApi = axios.create({ baseURL: API_CONFIG.openWeather, timeout: 10000 });

// Paramètres communs : unités métriques et libellés en français.
const baseParams = {
  appid: OPENWEATHER_KEY,
  units: 'metric',
  lang: 'fr',
};

function toIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Les horodatages sont des secondes Unix décalées du fuseau de la ville.
function toLocalIso(unixSeconds: number, timezoneOffset: number): string {
  return new Date((unixSeconds + timezoneOffset) * 1000).toISOString();
}

export async function fetchWeather(city = 'Évry,FR'): Promise<Weather> {
  const { data } = await weatherApi.get<OpenWeatherCurrentResponse>('/weather', {
    params: { ...baseParams, q: city },
  });

  const condition = data.weather[0];

  return {
    city: data.name,
    country: data.sys.country,
    description: condition?.description ?? '',
    iconCode: condition?.icon ?? '01d',
    iconUrl: toIconUrl(condition?.icon ?? '01d'),
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    // L'API renvoie des m/s même en unités métriques.
    windSpeedKmh: Math.round(data.wind.speed * 3.6),
    cloudiness: data.clouds.all,
    observedAt: toLocalIso(data.dt, data.timezone),
    sunrise: toLocalIso(data.sys.sunrise, data.timezone),
    sunset: toLocalIso(data.sys.sunset, data.timezone),
  };
}

const DAY_LABELS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// L'API renvoie un relevé toutes les 3 heures : on les regroupe par jour
// pour obtenir des minimales, des maximales et une condition dominante.
export async function fetchWeatherForecast(city = 'Évry,FR'): Promise<DailyForecast[]> {
  const { data } = await weatherApi.get<OpenWeatherForecastResponse>('/forecast', {
    params: { ...baseParams, q: city },
  });

  const byDay = new Map<string, typeof data.list>();

  for (const entry of data.list) {
    const date = entry.dt_txt.slice(0, 10);
    const existing = byDay.get(date);
    if (existing) existing.push(entry);
    else byDay.set(date, [entry]);
  }

  return [...byDay.entries()].map(([date, entries]) => {
    const temperatures = entries.map((entry) => entry.main.temp);

    // Condition la plus fréquente de la journée plutôt que celle
    // du premier relevé, souvent nocturne et peu représentative.
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const icon = entry.weather[0]?.icon ?? '01d';
      counts.set(icon, (counts.get(icon) ?? 0) + 1);
    }
    const dominantIcon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const dominant = entries.find((entry) => entry.weather[0]?.icon === dominantIcon);

    // Icône de jour même si le relevé dominant est nocturne.
    const dayIcon = dominantIcon.replace('n', 'd');

    return {
      date,
      label: DAY_LABELS[new Date(date).getDay()],
      minTemperature: Math.round(Math.min(...temperatures)),
      maxTemperature: Math.round(Math.max(...temperatures)),
      description: dominant?.weather[0]?.description ?? '',
      iconCode: dayIcon,
      iconUrl: toIconUrl(dayIcon),
    };
  });
}