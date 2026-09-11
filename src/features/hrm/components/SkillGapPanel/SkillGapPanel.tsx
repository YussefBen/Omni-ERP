import { useMemo, useState } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { withLoading } from '@/shared/components/withLoading/withLoading';
import { getSkillGapAnalysis } from '../../hooks/gapAnalysis';
import { useEmployees } from '../../hooks/useEmployees';
import type { Employee } from '../../types';
import styles from './SkillGapPanel.module.css';

interface SkillGapViewProps {
  employees: Employee[];
}

// Composant de présentation pur : withLoading gère déjà loading/erreur en amont
function SkillGapView({ employees }: SkillGapViewProps) {
  const [input, setInput] = useState('React, TypeScript, DevOps');

  const requiredSkills = useMemo(
    () =>
      input
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    [input],
  );

  const gaps = useMemo(
    () => getSkillGapAnalysis(requiredSkills, employees),
    [requiredSkills, employees],
  );

  return (
    <div className={styles.panel}>
      <label className={styles.label} htmlFor="required-skills">
        Compétences requises (séparées par une virgule)
      </label>
      <input
        id="required-skills"
        type="text"
        className={styles.input}
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />

      {gaps.length === 0 ? (
        <p className={styles.empty}>Ajoutez au moins une compétence.</p>
      ) : (
        <ul className={styles.gapList}>
          {gaps.map((gap) => (
            <li key={gap.skill} className={styles.gapItem}>
              <span
                className={`${styles.statusDot} ${gap.covered ? styles.covered : styles.uncovered}`}
                aria-hidden="true"
              />
              <span className={styles.skillName}>{gap.skill}</span>
              <span className={styles.availableCount}>
                {gap.covered ? `${gap.availableCount} personne(s)` : 'Personne'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SkillGapViewWithLoading = withLoading(SkillGapView);

export function SkillGapPanel() {
  const employeesQuery = useEmployees();

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Écarts de compétences</h2>
      <SkillGapViewWithLoading
        isLoading={employeesQuery.isLoading}
        isError={employeesQuery.isError}
        error={employeesQuery.error}
        employees={employeesQuery.data ?? []}
      />
    </Card>
  );
}