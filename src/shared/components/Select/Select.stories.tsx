import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Composants/Select',
  component: Select,
  tags: ['autodocs'],
  args: { onChange: fn() },
  // Hauteur réservée pour que la liste déroulante reste visible.
  decorators: [
    (Story) => (
      <div style={{ minHeight: '14rem', maxWidth: '18rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Liste déroulante en composant composé (compound component) : `Select` porte la valeur et l\'ouverture, et les partage par contexte à `Select.Trigger`, `Select.Options` et `Select.Option`. Se ferme au clic en dehors.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const StatutDeCommande: Story = {
  render: ({ onChange }) => (
    <Select onChange={onChange}>
      <Select.Trigger placeholder="Statut de la commande..." />
      <Select.Options>
        <Select.Option value="brouillon">Brouillon</Select.Option>
        <Select.Option value="confirmee">Confirmée</Select.Option>
        <Select.Option value="preparation">En préparation</Select.Option>
        <Select.Option value="expediee">Expédiée</Select.Option>
        <Select.Option value="livree">Livrée</Select.Option>
      </Select.Options>
    </Select>
  ),
};
