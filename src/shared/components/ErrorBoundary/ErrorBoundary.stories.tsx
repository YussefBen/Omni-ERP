import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { ErrorBoundary } from './ErrorBoundary';

// Composant qui échoue systématiquement au rendu, pour déclencher la frontière.
function BrokenWidget(): ReactNode {
  throw new Error("Impossible d'afficher le graphique des ventes.");
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Composants/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Intercepte les erreurs de rendu de ses enfants : le reste de la page continue de fonctionner. Affiche un repli générique, ou celui fourni par la prop `fallback`, avec une action pour retenter l'affichage.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

export const SansErreur: Story = {
  render: () => (
    <ErrorBoundary>
      <Card>Le contenu s'affiche normalement.</Card>
    </ErrorBoundary>
  ),
};

export const RepliParDefaut: Story = {
  render: () => (
    <ErrorBoundary>
      <BrokenWidget />
    </ErrorBoundary>
  ),
};

export const RepliPersonnalise: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <Card>
          <p>Ce bloc n'a pas pu s'afficher : {error.message}</p>
          <Button variant="secondary" onClick={reset}>
            Réessayer
          </Button>
        </Card>
      )}
    >
      <BrokenWidget />
    </ErrorBoundary>
  ),
};
