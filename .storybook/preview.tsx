/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react';
import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '../src/shared/context/ThemeContext';
import '../src/index.css';

type Theme = 'light' | 'dark';

// Applique le thème choisi dans la barre d'outils de Storybook.
// L'effet d'un parent s'exécute après celui de ses enfants : ce composant
// l'emporte donc sur le thème que ThemeProvider restaure à son montage.
function ThemeFrame({ theme, children }: { theme: Theme; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fond et couleur de texte du thème autour de chaque story : dans les
  // pages Docs, Storybook affiche les stories sur un cadre blanc qui masque
  // le fond de la page, et le texte clair du thème sombre devient illisible.
  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: '1.5rem',
        borderRadius: '8px',
      }}
    >
      {children}
    </div>
  );
}

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      description: "Thème de l'application",
      toolbar: {
        title: 'Thème',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    // Chaque story est rendue dans le même contexte que l'application :
    // styles globaux, variables de thème et ThemeProvider.
    (Story, context) => (
      <ThemeFrame theme={context.globals.theme as Theme}>
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </ThemeFrame>
    ),
  ],
};

export default preview;
