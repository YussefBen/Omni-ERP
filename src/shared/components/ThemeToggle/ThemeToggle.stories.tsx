import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle } from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Composants/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Bascule clair/sombre, branchée sur le ThemeContext. Le libellé accessible et `aria-pressed` indiquent l'état aux lecteurs d'écran, l'icône propose toujours le thème opposé.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const ParDefaut: Story = {};
