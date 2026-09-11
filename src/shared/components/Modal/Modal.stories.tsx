import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from '../Button/Button';
import { Modal } from './Modal';

function ConfirmDeletion() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Supprimer le client
      </Button>
      <Modal isOpen={isOpen} onClose={close} title="Supprimer le client ?">
        <p>Cette action est définitive. L'historique de commandes sera conservé.</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={close}>
            Annuler
          </Button>
          <Button variant="danger" onClick={close}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </>
  );
}

// Une fenêtre ouverte recouvre tout l'écran : dans la page de documentation,
// elle est isolée dans son propre cadre pour ne pas masquer le reste.
const isolated = { docs: { story: { inline: false, height: '360px' } } };

const meta: Meta<typeof Modal> = {
  title: 'Composants/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    title: 'Nouvelle commande',
    onClose: fn(),
    children: <p>Sélectionnez un client pour commencer la commande.</p>,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Fenêtre modale rendue dans `document.body` via un portail, pour échapper au débordement et au z-index de son parent. Se ferme par le bouton, ou par un clic sur le fond.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Ouverte: Story = {
  parameters: isolated,
};

export const SansTitre: Story = {
  args: { title: undefined },
  parameters: isolated,
};

export const Interactive: Story = {
  render: () => <ConfirmDeletion />,
};
