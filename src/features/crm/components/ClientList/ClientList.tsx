import { useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useClients } from '../../hooks/useClients';
import { ClientProfile } from '../ClientProfile/ClientProfile';
import type { ClientStatus } from '../../types';
import styles from './ClientList.module.css';

const STATUS_LABELS: Record<ClientStatus, string> = {
  Lead: 'Lead',
  Active: 'Actif',
  Inactive: 'Inactif',
  Churned: 'Perdu',
};

export function ClientList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Le debounce de la recherche est déjà géré à l'intérieur de useClients
  const { data, isLoading, isFetching, isError, error, totalPages } = useClients({ search, page });

  // ClientFilters ne supporte pas de filtre serveur par statut : on filtre localement la page
  // affichée uniquement, ce n'est donc pas une recherche globale sur tous les clients.
  const visibleClients = statusFilter
    ? data?.items.filter((client) => client.status === statusFilter)
    : data?.items;

  return (
    <div className={styles.layout}>
      <div className={styles.listColumn}>
        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
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
            <ul className={styles.list}>
              {visibleClients?.length === 0 && (
                <p className={styles.empty}>Aucun client ne correspond à ces critères.</p>
              )}
              {visibleClients?.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className={`${styles.clientRow} ${
                      selectedClientId === client.id ? styles.clientRowActive : ''
                    }`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <img src={client.avatarUrl} alt="" className={styles.avatar} />
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
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Précédent
                </Button>
                <span className={styles.pageInfo}>
                  Page {page} / {totalPages}
                  {isFetching ? '…' : ''}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Suivant
                </Button>
              </div>
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
