import type { Meta, StoryObj } from '@storybook/react-vite';
import { SESSION_DURATION_MS, useAuthStore } from '@/features/auth/store/authStore';
import type { User } from '@/features/auth/types';
import type { Role } from '@/shared/types';
import { UserMenu } from './UserMenu';

const DEMO_USER: User = {
  id: 1,
  email: 'emily.johnson@omni-erp.fr',
  firstName: 'Emily',
  lastName: 'Johnson',
  avatarUrl: '',
  role: 'admin',
};

// UserMenu lit la session dans le store : chaque story ouvre une fausse
// session avant son affichage, et la referme ensuite pour ne pas laisser
// d'état d'une story à l'autre.
function signInAs(role: Role) {
  return () => {
    useAuthStore.setState({
      user: { ...DEMO_USER, role },
      role,
      token: 'jeton-de-demonstration',
      expiresAt: Date.now() + SESSION_DURATION_MS,
      isAuthenticated: true,
    });

    return () => {
      useAuthStore.setState({
        user: null,
        role: null,
        token: null,
        expiresAt: null,
        isAuthenticated: false,
      });
    };
  };
}

const meta: Meta<typeof UserMenu> = {
  title: 'Composants/UserMenu',
  component: UserMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Identité de l'utilisateur connecté, lue dans le store de session, avec la déconnexion. Ne s'affiche pas sans session. Le sélecteur de rôle est un outil de démonstration : il permet de vérifier les droits de chaque profil sans changer de compte.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

export const Administrateur: Story = {
  beforeEach: signInAs('admin'),
};

export const Gestionnaire: Story = {
  beforeEach: signInAs('manager'),
};

export const Utilisateur: Story = {
  beforeEach: signInAs('user'),
};