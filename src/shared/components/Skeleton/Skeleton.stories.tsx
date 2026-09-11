import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../Card/Card';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Composants/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  args: { width: '100%', height: '1rem' },
  parameters: {
    docs: {
      description: {
        component:
          "Bloc de remplacement affiché pendant un chargement. Il réserve la place du contenu à venir : la page ne saute pas quand les données arrivent.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Ligne: Story = {};

export const Bloc: Story = {
  args: { width: '16rem', height: '8rem' },
};

export const CarteEnChargement: Story = {
  render: () => (
    <Card style={{ maxWidth: '24rem', display: 'grid', gap: '0.75rem' }}>
      <Skeleton width="60%" height="1.5rem" />
      <Skeleton />
      <Skeleton />
      <Skeleton width="40%" />
    </Card>
  ),
};
