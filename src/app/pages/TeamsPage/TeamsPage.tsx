import { TeamTree } from '@/features/hrm/components/TeamTree/TeamTree';
import { SkillGapPanel } from '@/features/hrm/components/SkillGapPanel/SkillGapPanel';
import styles from './TeamsPage.module.css';

export function TeamsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Équipes</h1>
      <TeamTree />
      <SkillGapPanel />
    </div>
  );
}
