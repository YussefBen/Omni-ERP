import { useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Select } from '@/shared/components/Select/Select';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useProjects } from '../../hooks/useProjects';
import type { ProjectStatus } from '../../types';
import styles from './ProjectList.module.css';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
  en_pause: 'En pause',
};

interface ProjectListProps {
  onCreateClick?: () => void;
  onSelectProject?: (projectId: number) => void;
}

export function ProjectList({ onCreateClick, onSelectProject }: ProjectListProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Le debounce de la recherche est déjà géré à l'intérieur de useProjects, inutile de dupliquer ici
  const { data, isLoading, isFetching, isError, error, totalPages } = useProjects({
    search,
    status,
    page,
  });

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className={styles.searchInput}
          aria-label="Rechercher un projet"
        />

        <Select
          defaultValue=""
          onChange={(value) => {
            setStatus(value === '' ? undefined : (value as ProjectStatus));
            setPage(1);
          }}
        >
          <Select.Trigger placeholder="Tous les statuts" />
          <Select.Options>
            <Select.Option value="">Tous les statuts</Select.Option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            ))}
          </Select.Options>
        </Select>

        {onCreateClick && (
          <Button onClick={onCreateClick} className={styles.createButton}>
            + Nouveau projet
          </Button>
        )}
      </div>

      {isLoading && <Spinner label="Chargement des projets..." />}

      {isError && (
        <p role="alert" className={styles.error}>
          {error?.message ?? 'Impossible de charger les projets.'}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <div className={styles.grid}>
            {data?.items.length === 0 && (
              <p className={styles.empty}>Aucun projet ne correspond à ces critères.</p>
            )}
            {data?.items.map((project) => (
              <Card
                key={project.id}
                className={styles.card}
                onClick={() => onSelectProject?.(project.id)}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.title}>{project.title}</h3>
                  <span className={`${styles.badge} ${styles[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>
                <p className={styles.description}>{project.description}</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${project.progress}%` }} />
                </div>
                <span className={styles.progressLabel}>{project.progress}% complété</span>
              </Card>
            ))}
          </div>

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
  );
}
