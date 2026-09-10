// Point d'entrée public du tableau de bord.

export { useWeather, useWeatherForecast } from './hooks/useWeather';
export { useNotifications } from './hooks/useNotifications';
export { useDashboardData } from './hooks/useDashboardData';

// Émission de notifications : appelable depuis n'importe quel domaine,
// y compris hors composant React.
export {
  notify,
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyAlert,
  getNotifications,
} from './services/notificationBus';

export { fetchWeather, fetchWeatherForecast } from './services/weatherService';

export type * from './types';