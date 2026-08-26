import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry } from './features/monitoring'
import { initSentry, initWebVitals } from './features/monitoring'
import { initAnalytics, initSentry } from './features/monitoring'

initSentry();
initWebVitals();
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
