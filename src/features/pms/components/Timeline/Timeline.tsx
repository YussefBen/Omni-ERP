import { useMemo } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useProject } from '../../hooks/useProject';
import { useTasks } from '../../hooks/useTasks';
import type { TaskStatus } from '../../types';
import styles from './Timeline.module.css';

const STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
};

interface TimelineProps {
  projectId: number;
}

// Task n'a ni date de création ni échéance dans le modèle de données actuel : l'ordre suit
// donc l'id (proxy de l'ordre de création), et le seul vrai repère temporel disponible est
// l'échéance du projet (Project.dueDate), affichée en dernier point de la frise.
export function Timeline({ projectId }: TimelineProps) {
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
  } = useProject(projectId);

  const {
    data: tasksPage,
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
  } = useTasks(projectId, { pageSize: 1000 });

  const sortedTasks = useMemo(() => {
    if (!tasksPage) return [];
    return [...tasksPage.items].sort((a, b) => a.id - b.id);
  }, [tasksPage]);

  const isLoading = isProjectLoading || isTasksLoading;
  const isError = isProjectError || isTasksError;
  const error = projectError ?? tasksError;

  if (isLoading) return <Spinner label="Chargement de la timeline..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger la timeline.'}
      </p>
    );
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Timeline</h2>

      <ol className={styles.list}>
        {sortedTasks.length === 0 && <p className={styles.empty}>Aucune tâche pour ce projet.</p>}

        {sortedTasks.map((task) => (
          <li key={task.id} className={styles.item}>
            <span className={`${styles.dot} ${styles[task.status]}`} aria-hidden="true" />
            <div className={styles.content}>
              <p className={styles.taskTitle}>{task.title}</p>
              <span className={styles.taskMeta}>
                {STATUS_LABELS[task.status]} — {task.estimatedHours}h estimées
              </span>
            </div>
          </li>
        ))}

        {project && (
          <li className={styles.item}>
            <span className={`${styles.dot} ${styles.milestone}`} aria-hidden="true" />
            <div className={styles.content}>
              <p className={styles.taskTitle}>🎯 Échéance du projet</p>
              <span className={styles.taskMeta}>{project.dueDate}</span>
            </div>
          </li>
        )}
      </ol>
    </Card>
  );
}
