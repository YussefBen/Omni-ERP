import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../Card/Card';
import { withLoading } from './withLoading';

interface ClientSummaryProps {
  name: string;
  orders: number;
}

function ClientSummary({ name, orders }: ClientSummaryProps) {
  return (
    <Card style={{ maxWidth: '20rem' }}>
      <strong>{name}</strong>
      <p>{orders} commandes</p>
    </Card>
  );
}

// Le composant enveloppé gagne les props isLoading, isError et error.
const ClientSummaryWithLoading = withLoading(ClientSummary);

const meta: Meta<typeof ClientSummaryWithLoading> = {
  title: 'Composants/withLoading',
  component: ClientSummaryWithLoading,
  tags: ['autodocs'],
  args: {
    name: 'Emily Johnson',
    orders: 12,
    isLoading: false,
    isError: false,
    error: null,
  },
  argTypes: {
    error: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Composant d'ordre supérieur (HOC) : enveloppe n'importe quel composant pour gérer à sa place l'affichage du chargement et des erreurs.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClientSummaryWithLoading>;

export const Charge: Story = {};

export const EnChargement: Story = {
  args: { isLoading: true },
};

export const EnErreur: Story = {
  args: { isError: true, error: new Error('Impossible de charger le client.') },
};
