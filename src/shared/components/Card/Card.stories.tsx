import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Card } from './Card';

const meta = {
  title: 'Composants/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    children: 'Contenu de la carte.',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {};

export const AvecContenu: Story = {
  args: {
    children: (
      <>
        <h3 style={{ marginTop: 0 }}>Commande n° 1024</h3>
        <p>Trois articles, livraison prévue le 15 septembre.</p>
        <Button>Voir le détail</Button>
      </>
    ),
  },
};