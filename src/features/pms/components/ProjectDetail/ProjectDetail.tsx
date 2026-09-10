import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { getProjectProgress } from '../../hooks/projectProgress';
import { useProject } from '../../hooks/useProject';
import { useDeleteProject, useUpdateProject } from '../../hooks/useProjectMutations';
import { useTasks } from '../../hooks/useTasks';
import type { ProjectStatus } from '../../types';
import { CommentThread } from '../CommentThread/CommentThread';
import styles from './ProjectDetail.module.css';
import { withPermissions } from '@/features/auth';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
  en_pause: 'En pause',
};

interface DeleteProjectButtonProps {
  onDelete: () => void;
  isDeleting: boolean;
}

// Réservé aux administrateurs : supprimer un projet est définitif.
function RawDeleteProjectButton({ onDelete, isDeleting }: DeleteProjectButtonProps) {
  return (
   <Button variant="danger" onClick={onDelete} disabled={isDeleting}>
      {isDeleting ? 'Suppression...' : 'Supprimer le projet'}
    </Button>
  );
}

const DeleteProjectButton = withPermissions(RawDeleteProjectButton, ['admin', 'manager']);

interface ProjectDetailProps {
  projectId: number;
  // Id de l'utilisateur connecté, transmis à CommentThread pour poster/éditer ses commentaires
  currentUserId: number;
  onDeleted?: () => void;
}

export function ProjectDetail({ projectId, currentUserId, onDeleted }: ProjectDetailProps) {
  const { data: project, isLoading, isError, error } = useProject(projectId);
  // pageSize élevé pour récupérer un maximum de tâches et calculer une progression fiable ;
  // à revoir si un projet dépasse largement ce nombre de tâches (pagination serveur sinon)
  const { data: tasksPage } = useTasks(projectId, { pageSize: 100 });
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();

  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const progress = useMemo(() => {
    if (!tasksPage) return project?.progress ?? 0;
    return getProjectProgress(projectId, tasksPage.items);
  }, [projectId, tasksPage, project?.progress]);

  if (isLoading) return <Spinner label="Chargement du projet..." />;

  if (isError || !project) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Projet introuvable.'}
      </p>
    );
  }

  function handleDelete() {
    if (!window.confirm('Supprimer définitivement ce projet ?')) return;
    deleteProject(projectId, { onSuccess: () => onDeleted?.() });
  }

  return (
    <div className={styles.layout}>
      <Card className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>{project.title}</h1>
          <span className={`${styles.badge} ${styles[project.status]}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        <p className={styles.description}>{project.description}</p>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressLabel}>{progress}% des tâches terminées</span>

        {project.dueDate && <p className={styles.dueDate}>Échéance : {project.dueDate}</p>}

        <div className={styles.actions}>
          {isEditingStatus ? (
            <select
              className={styles.statusSelect}
              defaultValue={project.status}
              disabled={isUpdating}
              onChange={(event) => {
                updateProject({ id: project.id, status: event.target.value as ProjectStatus });
                setIsEditingStatus(false);
              }}
              onBlur={() => setIsEditingStatus(false)}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <Button variant="secondary" onClick={() => setIsEditingStatus(true)}>
              Changer le statut
            </Button>
          )}
        <DeleteProjectButton onDelete={handleDelete} isDeleting={isDeleting} />
        </div>
      </Card>

      <Card>
        <CommentThread target={{ projectId }} authorId={currentUserId} />
      </Card>
    </div>
  );
}
