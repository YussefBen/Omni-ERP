import type { Meta, StoryObj } from '@storybook/react-vite';
import { SafeHtml } from './SafeHtml';

const meta: Meta<typeof SafeHtml> = {
  title: 'Composants/SafeHtml',
  component: SafeHtml,
  tags: ['autodocs'],
  args: {
    html: '<p>Client <strong>fidèle</strong> depuis 2021, <em>paiement à 30 jours</em>.</p>',
  },
  argTypes: {
    as: { control: 'inline-radio', options: ['div', 'span', 'p'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Seul composant autorisé à injecter du HTML. Le contenu est assaini juste avant l'affichage : la mise en forme est conservée, les scripts, gestionnaires d'événements et liens `javascript:` sont retirés.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SafeHtml>;

export const Formatage: Story = {};

// Démonstration de l'assainissement : aucune alerte ne doit s'ouvrir,
// seuls le texte et le lien, désarmé, restent affichés.
export const ContenuMalveillant: Story = {
  args: {
    html:
      '<p>Commentaire du client.</p>' +
      '<img src="x" onerror="alert(\'piraté\')">' +
      '<script>alert("piraté")</script>' +
      '<a href="javascript:alert(1)">Lien piégé</a>',
  },
};
