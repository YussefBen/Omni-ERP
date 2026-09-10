export const API_CONFIG = {
  jsonPlaceholder: 'https://jsonplaceholder.typicode.com',
  reqres: 'https://reqres.in/api',
  dummyJson: 'https://dummyjson.com',
  randomUser: 'https://randomuser.me/api',
  jsonServer: import.meta.env.VITE_JSON_SERVER_URL as string,
    openWeather: 'https://api.openweathermap.org/data/2.5',
} as const;

// Clé OpenWeatherMap. Chaque poste a la sienne dans son .env,
// le fichier n'étant pas versionné.
export const OPENWEATHER_KEY = (import.meta.env.VITE_OPENWEATHER_API_KEY as string) ?? '';