import { useNavigate, useParams } from 'react-router-dom';
import { Tabs } from '@/shared/components/Tabs/Tabs';
import { KanbanBoard } from '@/features/pms/components/KanbanBoard/KanbanBoard';
import { ProjectDetail } from '@/features/pms/components/ProjectDetail/ProjectDetail';
import { Timeline } from '@/features/pms/components/Timeline/Timeline';
import { useCurrentUserId } from '@/shared/hooks/useCurrentUser';
import styles from './ProjectDetailPage.module.css';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUserId = useCurrentUserId();
  const projectId = Number(id);

  if (!id || Number.isNaN(projectId)) {
    return (
      <p role="alert" className={styles.error}>
        Projet introuvable.
      </p>
    );
  }

  return (
    <div className={styles.container}>
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Vue d'ensemble</Tabs.Tab>
          <Tabs.Tab value="kanban">Kanban</Tabs.Tab>
          <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panels>
          <Tabs.Panel value="overview">
            {currentUserId !== undefined ? (
              <ProjectDetail
                projectId={projectId}
                currentUserId={currentUserId}
                onDeleted={() => navigate('/projects')}
              />
            ) : (
              <p role="alert">Connecte-toi pour voir le détail du projet.</p>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="kanban">
            <KanbanBoard projectId={projectId} />
          </Tabs.Panel>

          <Tabs.Panel value="timeline">
            <Timeline projectId={projectId} />
          </Tabs.Panel>
        </Tabs.Panels>
      </Tabs>
    </div>
  );
}
