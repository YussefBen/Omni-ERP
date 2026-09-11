import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Tabs } from './Tabs';

const clientTabs = (
  <>
    <Tabs.List>
      <Tabs.Tab value="details">Détails</Tabs.Tab>
      <Tabs.Tab value="orders">Commandes</Tabs.Tab>
      <Tabs.Tab value="notes">Notes</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panels>
      <Tabs.Panel value="details">Emily Johnson, Dooley, Kozey and Cronin.</Tabs.Panel>
      <Tabs.Panel value="orders">12 commandes, dont 2 en cours de préparation.</Tabs.Panel>
      <Tabs.Panel value="notes">Préfère être contactée par courriel.</Tabs.Panel>
    </Tabs.Panels>
  </>
);

// Mode contrôlé : le parent décide de l'onglet actif.
function ControlledTabs() {
  const [active, setActive] = useState('orders');

  return (
    <>
      <p>
        Onglet actif, piloté par le parent : <strong>{active}</strong>
      </p>
      <Tabs defaultValue="details" value={active} onChange={setActive}>
        {clientTabs}
      </Tabs>
    </>
  );
}

const meta: Meta<typeof Tabs> = {
  title: 'Composants/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: { onChange: fn() },
  parameters: {
    docs: {
      description: {
        component:
          "Onglets en composant composé (compound component) : `Tabs` porte l'onglet actif et le partage par contexte. Fonctionne en mode libre (`defaultValue`) ou contrôlé (`value` et `onChange`).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const ModeLibre: Story = {
  render: ({ onChange }) => (
    <Tabs defaultValue="details" onChange={onChange}>
      {clientTabs}
    </Tabs>
  ),
};

export const ModeControle: Story = {
  render: () => <ControlledTabs />,
};
