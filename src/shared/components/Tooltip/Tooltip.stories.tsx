import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Composants/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    content: "Chiffre d'affaires hors taxes",
    placement: 'top',
    children: <Button variant="secondary">Survolez-moi</Button>,
  },
  argTypes: {
    placement: { control: 'inline-radio', options: ['top', 'bottom'] },
  },
  // Espace autour du déclencheur, pour que la bulle ait la place de s'afficher.
  decorators: [
    (Story) => (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Bulle d'aide au survol ou au focus clavier. Positionnée avec `useLayoutEffect` avant l'affichage, pour éviter tout scintillement, et basculée de l'autre côté si elle sortirait de l'écran.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const EnHaut: Story = {};

export const EnBas: Story = {
  args: { placement: 'bottom' },
};

export const ContenuRiche: Story = {
  args: {
    content: (
      <span>
        <strong>Stock critique</strong> : 3 unités restantes
      </span>
    ),
  },
};
