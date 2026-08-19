export const API_CONFIG = {
  jsonPlaceholder: 'https://jsonplaceholder.typicode.com',
  reqres: 'https://reqres.in/api',
  dummyJson: 'https://dummyjson.com',
  randomUser: 'https://randomuser.me/api',
  jsonServer: import.meta.env.VITE_JSON_SERVER_URL as string,
  openWeather: 'https://api.openweathermap.org/data/2.5',
} as const;