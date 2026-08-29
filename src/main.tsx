import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics, initFeatureFlags, initSentry, initWebVitals } from './features/monitoring'
import { initAnalytics, initFeatureFlags, initSentry, initTracing, initWebVitals } from './features/monitoring'

async function bootstrap() {
  initSentry();
  initWebVitals();
  initAnalytics();
  initTracing();
  await initFeatureFlags();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();