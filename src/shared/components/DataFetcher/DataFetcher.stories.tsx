import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Spinner } from '../Spinner/Spinner';
import { DataFetcher, type DataFetcherState } from './DataFetcher';

interface Client {
  id: number;
  name: string;
}

const noop = () => {};

// DataFetcher accepte n'importe quel hook qui respecte le contrat de forme
// commun. Chaque story lui fournit un faux hook, figé dans un état précis.
const useLoadedClients = (): DataFetcherState<Client[]> => ({
  data: [
    { id: 1, name: 'Emily Johnson' },
    { id: 2, name: 'Michael Williams' },
    { id: 3, name: 'Sophia Brown' },
  ],
  isLoading: false,
  isError: false,
  error: null,
  refetch: noop,
});

const useLoadingClients = (): DataFetcherState<Client[]> => ({
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
  refetch: noop,
});

const useFailedClients = (): DataFetcherState<Client[]> => ({
  data: undefined,
  isLoading: false,
  isError: true,
  error: new Error('Le serveur ne répond pas.'),
  refetch: noop,
});

// L'affichage de chaque état reste à la main de l'écran appelant.
function renderClients({ data, isLoading, isError, error, refetch }: DataFetcherState<Client[]>) {
  if (isLoading) return <Spinner label="Chargement des clients..." />;

  if (isError) {
    return (
      <Card>
        <p role="alert">{error?.message}</p>
        <Button onClick={refetch}>Réessayer</Button>
      </Card>
    );
  }

  return (
    <Card>
      <ul>
        {data?.map((client) => (
          <li key={client.id}>{client.name}</li>
        ))}
      </ul>
    </Card>
  );
}

const meta: Meta<typeof DataFetcher> = {
  title: 'Composants/DataFetcher',
  component: DataFetcher,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Render prop : DataFetcher appelle le hook fourni et passe son état à la fonction enfant, sans imposer d'interface. Tout hook qui respecte le contrat `data / isLoading / isError / error / refetch` est accepté.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataFetcher>;

export const Donnees: Story = {
  render: () => <DataFetcher useDataHook={useLoadedClients}>{renderClients}</DataFetcher>,
};

export const Chargement: Story = {
  render: () => <DataFetcher useDataHook={useLoadingClients}>{renderClients}</DataFetcher>,
};

export const Erreur: Story = {
  render: () => <DataFetcher useDataHook={useFailedClients}>{renderClients}</DataFetcher>,
};
