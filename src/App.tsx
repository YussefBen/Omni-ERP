import { AppProviders } from './providers';
import { AppRouter } from './router';
import './App.css';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;