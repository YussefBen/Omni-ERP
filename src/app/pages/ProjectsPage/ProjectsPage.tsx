import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectForm } from '@/features/pms/components/ProjectForm/ProjectForm';
import { ProjectList } from '@/features/pms/components/ProjectList/ProjectList';
import { useCurrentUserId } from '@/shared/hooks/useCurrentUser';
import styles from './ProjectsPage.module.css';

export function ProjectsPage() {
  const navigate = useNavigate();
  const currentUserId = useCurrentUserId();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Projets</h1>

      {isCreating && (
        <div className={styles.formPanel}>
          {currentUserId !== undefined ? (
            <ProjectForm ownerId={currentUserId} onSuccess={() => setIsCreating(false)} />
          ) : (
            <p role="alert">Connecte-toi pour créer un projet.</p>
          )}
        </div>
      )}

      <ProjectList
        onCreateClick={() => setIsCreating((current) => !current)}
        onSelectProject={(projectId) => navigate(`/projects/${projectId}`)}
      />
    </div>
  );
}
