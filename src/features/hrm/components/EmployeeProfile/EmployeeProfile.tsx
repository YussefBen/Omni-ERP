import { Card } from '@/shared/components/Card/Card';
import { Tabs } from '@/shared/components/Tabs/Tabs';
import type { Employee } from '@/features/hrm/types';
import styles from './EmployeeProfile.module.css';

const SKILL_LEVEL_LABELS: Record<Employee['skills'][number]['level'], string> = {
  junior: 'Junior',
  confirme: 'Confirmé',
  expert: 'Expert',
};

interface EmployeeProfileProps {
  employee: Employee;
  // Optionnel : nom lisible de l'équipe, résolu par l'appelant via useTeams()
  teamName?: string;
}

// Reçoit l'employé déjà chargé (par EmployeeDirectory) plutôt que de refetcher par id :
// aucun hook useEmployee(id) n'est fourni, fetchEmployees ne renvoie que des listes filtrées.
export function EmployeeProfile({ employee, teamName }: EmployeeProfileProps) {
  return (
    <Card className={styles.card}>
      <header className={styles.header}>
        <img src={employee.avatarUrl} alt="" className={styles.avatar} />
        <div>
          <h2 className={styles.name}>
            {employee.firstName} {employee.lastName}
          </h2>
          <p className={styles.jobTitle}>
            {employee.jobTitle} — {employee.department}
          </p>
        </div>
      </header>

      <Tabs defaultValue="infos">
        <Tabs.List>
          <Tabs.Tab value="infos">Infos</Tabs.Tab>
          <Tabs.Tab value="skills">Compétences</Tabs.Tab>
          <Tabs.Tab value="leave">Congés</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panels>
          <Tabs.Panel value="infos">
            <dl className={styles.infoList}>
              <dt>Email</dt>
              <dd>{employee.email}</dd>
              <dt>Téléphone</dt>
              <dd>{employee.phone}</dd>
              <dt>Localisation</dt>
              <dd>
                {employee.city}, {employee.country}
              </dd>
              <dt>Équipe</dt>
              <dd>{teamName ?? `Équipe #${employee.teamId}`}</dd>
            </dl>
          </Tabs.Panel>

          <Tabs.Panel value="skills">
            {employee.skills.length === 0 ? (
              <p className={styles.empty}>Aucune compétence renseignée.</p>
            ) : (
              <ul className={styles.skillList}>
                {employee.skills.map((skill) => (
                  <li key={skill.name} className={styles.skillItem}>
                    <span>{skill.name}</span>
                    <span className={`${styles.skillBadge} ${styles[skill.level]}`}>
                      {SKILL_LEVEL_LABELS[skill.level]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="leave">
            {/* Historique des congés à brancher sur useLeaveRequests() lors du bloc Congés suivant */}
            <p className={styles.empty}>Historique des congés à venir.</p>
          </Tabs.Panel>
        </Tabs.Panels>
      </Tabs>
    </Card>
  );
}
