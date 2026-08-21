// Types du tableau de bord : météo et notifications internes.

/* ---------- Réponses brutes d'OpenWeatherMap ---------- */

interface OpenWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OpenWeatherMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  pressure: number;
}

// Forme renvoyée par GET /weather.
export interface OpenWeatherCurrentResponse {
  weather: OpenWeatherCondition[];
  main: OpenWeatherMain;
  wind: { speed: number; deg: number };
  clouds: { all: number };
  visibility: number;
  dt: number;
  sys: { country: string; sunrise: number; sunset: number };
  timezone: number;
  name: string;
}

// Forme renvoyée par GET /forecast : relevés toutes les 3 heures sur 5 jours.
export interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    dt_txt: string;
    weather: OpenWeatherCondition[];
    main: OpenWeatherMain;
    wind: { speed: number; deg: number };
  }>;
  city: { name: string; country: string; timezone: number };
}

/* ---------- Météo normalisée ---------- */

export interface Weather {
  city: string;
  country: string;
  description: string;
  // Code d'icône OpenWeatherMap, ex. '04d'.
  iconCode: string;
  iconUrl: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  // Converti en km/h : l'API renvoie des m/s même en unités métriques.
  windSpeedKmh: number;
  cloudiness: number;
  observedAt: string;
  sunrise: string;
  sunset: string;
}

// Prévision agrégée sur une journée, à partir des relevés tri-horaires.
export interface DailyForecast {
  date: string;
  label: string;
  minTemperature: number;
  maxTemperature: number;
  description: string;
  iconCode: string;
  iconUrl: string;
}

/* ---------- Notifications ---------- */

export type NotificationLevel = 'succes' | 'erreur' | 'info' | 'alerte';

// Notification interne affichée par le composant Toast.
export interface AppNotification {
  id: string;
  level: NotificationLevel;
  message: string;
  // Domaine émetteur, pour filtrer ou grouper l'affichage.
  source?: string;
  createdAt: string;
  read: boolean;
}

export type NotifyPayload = Omit<AppNotification, 'id' | 'createdAt' | 'read'>;