import { memo, useCallback, useMemo, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useClients } from '../../hooks/useClients';
import { ClientProfile } from '../ClientProfile/ClientProfile';
import type { Client, ClientStatus } from '../../types';
import styles from './ClientList.module.css';

const STATUS_LABELS: Record<ClientStatus, string> = {
  Lead: 'Lead',
  Active: 'Actif',
  Inactive: 'Inactif',
  Churned: 'Perdu',
};

// Hauteur d'une ligne, en pixels. La virtualisation a besoin de cette
// valeur pour calculer quelles lignes sont visibles sans les mesurer.
// Elle doit correspondre à la hauteur réelle définie en CSS.
const ROW_HEIGHT = 64;

// Le catalogue complet est chargé en une fois plutôt que page par page :
// la virtualisation ne rend que les lignes visibles, le coût d'affichage
// est donc le même pour 12 ou 208 clients. Le filtre par statut devient
// au passage global, alors qu'il ne portait que sur la page affichée.
const ALL_CLIENTS = 1000;

interface RowData {
  clients: Client[];
  selectedClientId: number | null;
  onSelect: (id: number) => void;
}

/**
 * Une ligne de la liste.
 *
 * memo est ici déterminant : sans lui, faire défiler la liste rerendrait
 * toutes les lignes visibles à chaque déplacement, alors que leur contenu
 * n'a pas changé. Les fonctions passées en propriété sont stabilisées par
 * useCallback côté parent, sans quoi memo serait sans effet — une nouvelle
 * fonction à chaque rendu compte comme une propriété modifiée.
 */
function ClientRowBase({
  index,
  style,
  clients,
  selectedClientId,
  onSelect,
}: RowComponentProps<RowData>) {
  const client = clients[index];
  if (!client) return null;

  const isSelected = selectedClientId === client.id;

  return (
    <div style={style} className={styles.rowWrapper}>
      <button
        type="button"
        className={`${styles.clientRow} ${isSelected ? styles.clientRowActive : ''}`}
        onClick={() => onSelect(client.id)}
        // Indique aux lecteurs d'écran quelle fiche est ouverte, ce que
        // la couleur seule ne transmet pas.
        aria-pressed={isSelected}
      >
        <img src={client.avatarUrl} alt="" className={styles.avatar} loading="lazy" />
        <span className={styles.clientInfo}>
          <span className={styles.clientName}>{client.fullName}</span>
          <span className={styles.clientCompany}>{client.companyName}</span>
        </span>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${styles[client.status]}`}>
            {STATUS_LABELS[client.status]}
          </span>
          <span className={styles.segmentBadge}>{client.segment}</span>
        </span>
      </button>
    </div>
  );
}

// L'assertion conserve la signature d'origine : memo élargit le type de
// retour à ReactNode, alors que react-window attend ReactElement | null.
const ClientRow = memo(ClientRowBase) as typeof ClientRowBase;

export function ClientList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Le debounce de la recherche est déjà géré à l'intérieur de useClients.
  const { data, isLoading, isFetching, isError, error } = useClients({
    search,
    pageSize: ALL_CLIENTS,
  });

  // useMemo évite de refiltrer les 208 clients à chaque frappe au clavier
  // ou à chaque sélection de fiche : le calcul ne se refait que si la
  // liste ou le filtre changent réellement.
  const visibleClients = useMemo(() => {
    const items = data?.items ?? [];
    if (!statusFilter) return items;
    return items.filter((client) => client.status === statusFilter);
  }, [data?.items, statusFilter]);

  // Référence stable : sans useCallback, une nouvelle fonction serait
  // créée à chaque rendu et memo sur les lignes n'aurait aucun effet.
  const handleSelect = useCallback((id: number) => setSelectedClientId(id), []);

  const rowProps = useMemo<RowData>(
    () => ({ clients: visibleClients, selectedClientId, onSelect: handleSelect }),
    [visibleClients, selectedClientId, handleSelect],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.listColumn}>
        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={styles.searchInput}
            aria-label="Rechercher un client"
          />

          <select
            className={styles.statusSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ClientStatus | '')}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {isLoading && <Spinner label="Chargement des clients..." />}

        {isError && (
          <p role="alert" className={styles.error}>
            {error?.message ?? 'Impossible de charger les clients.'}
          </p>
        )}

        {!isLoading && !isError && (
          <>
            {/* Annonce le nombre de résultats aux lecteurs d'écran après
                une recherche, information qu'une liste visuelle donne
                d'un coup d'œil mais qu'une lecture linéaire ne donne pas. */}
            <p role="status" className={styles.resultCount}>
              {visibleClients.length} client{visibleClients.length > 1 ? 's' : ''}
              {isFetching ? ' — mise à jour...' : ''}
            </p>

            {visibleClients.length === 0 ? (
              <p className={styles.empty}>Aucun client ne correspond à ces critères.</p>
            ) : (
              // Seules les lignes visibles sont présentes dans le document.
              // Sur 208 clients, une vingtaine de nœuds au lieu de 208 :
              // le défilement reste fluide et la mémoire occupée constante.
              <List
                className={styles.virtualList}
                rowComponent={ClientRow}
                rowCount={visibleClients.length}
                rowHeight={ROW_HEIGHT}
                rowProps={rowProps}
              />
            )}
          </>
        )}
      </div>

      <div className={styles.profileColumn}>
        {selectedClientId ? (
          <ClientProfile clientId={selectedClientId} />
        ) : (
          <Card className={styles.placeholder}>
            <p>Sélectionne un client pour voir sa fiche.</p>
          </Card>
        )}
      </div>
    </div>
  );
}