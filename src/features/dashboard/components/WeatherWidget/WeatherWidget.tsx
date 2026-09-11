import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useWeather, useWeatherForecast } from '../../hooks/useWeather';
import styles from './WeatherWidget.module.css';

export function WeatherWidget() {
  const { data: weather, isLoading, isError, error, isConfigured } = useWeather();
  const { data: forecast } = useWeatherForecast();

  if (!isConfigured) {
    return (
      <Card className={styles.card}>
        <p className={styles.info}>
          Météo non configurée (clé OpenWeatherMap manquante dans <code>.env</code>).
        </p>
      </Card>
    );
  }

  if (isLoading) return <Spinner label="Chargement de la météo..." />;

  if (isError || !weather) {
    return (
      <Card className={styles.card}>
        <p role="alert" className={styles.error}>
          {error?.message ?? 'Météo indisponible.'}
        </p>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <img src={weather.iconUrl} alt={weather.description} className={styles.icon} />
        <div>
          <p className={styles.temperature}>{Math.round(weather.temperature)}°C</p>
          <p className={styles.description}>{weather.description}</p>
        </div>
      </div>
      <p className={styles.city}>
        {weather.city}, {weather.country}
      </p>
      <div className={styles.details}>
        <span>Ressenti {Math.round(weather.feelsLike)}°C</span>
        <span>Humidité {weather.humidity}%</span>
        <span>Vent {Math.round(weather.windSpeedKmh)} km/h</span>
      </div>

      {forecast && forecast.length > 0 && (
       <ul className={styles.forecastList}>
          {forecast.map((day) => (
            <li key={day.date} className={styles.forecastDay}>
              <span className={styles.forecastLabel}>{day.label}</span>
              <img src={day.iconUrl} alt={day.description} className={styles.forecastIcon} />
              <span className={styles.forecastTemps}>
                {Math.round(day.maxTemperature)}° / {Math.round(day.minTemperature)}°
              </span>
            </li>
         ))}
        </ul>
      )}
    </Card>
  );
}
