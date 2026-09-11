import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Composants/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Enregistrer',
    // Enregistre chaque clic dans l'onglet Actions de Storybook.
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Principal: Story = {
  args: { variant: 'primary' },
};

export const Secondaire: Story = {
  args: { variant: 'secondary', children: 'Annuler' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Supprimer' },
};

export const Desactive: Story = {
  args: { disabled: true },
};