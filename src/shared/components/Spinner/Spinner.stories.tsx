import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Composants/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Indicateur de chargement. `role=\"status\"` et `aria-live` annoncent le libellé aux lecteurs d'écran.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const ParDefaut: Story = {};

export const LibellePersonnalise: Story = {
  args: { label: 'Chargement des commandes...' },
};
