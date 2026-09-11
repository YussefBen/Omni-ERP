import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Composants/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: { message: 'Commande enregistrée.' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['info', 'success', 'error'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Message de retour après une action. `role=\"status\"` l'annonce aux lecteurs d'écran sans interrompre la lecture en cours.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Information: Story = {
  args: { variant: 'info', message: 'Synchronisation en cours.' },
};

export const Succes: Story = {
  args: { variant: 'success' },
};

export const Erreur: Story = {
  args: { variant: 'error', message: "La commande n'a pas pu être enregistrée." },
};

export const Toutes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '24rem' }}>
      <Toast variant="info" message="Synchronisation en cours." />
      <Toast variant="success" message="Commande enregistrée." />
      <Toast variant="error" message="La commande n'a pas pu être enregistrée." />
    </div>
  ),
};
