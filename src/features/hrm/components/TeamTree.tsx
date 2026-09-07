import { useMemo, useState } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { withLoading } from '@/shared/components/withLoading/withLoading';
import { useEmployees } from '../../hooks/useEmployees';
import { useTeams } from '../../hooks/useTeams';
import type { Employee, Team } from '../../types';
import styles from './TeamTree.module.css';

interface TeamTreeViewProps {
  teams: Team[];
  employeesById: Map<number, Employee>;
}

// Composant de présentation pur : withLoading gère déjà les états loading/erreur en amont
function TeamTreeView({ teams, employeesById }: TeamTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function toggleTeam(teamId: number) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  if (teams.length === 0) {
    return <p className={styles.empty}>Aucune équipe trouvée.</p>;
  }

  return (
    <ul className={styles.tree}>
      {teams.map((team) => {
        const isExpanded = expandedIds.has(team.id);
        return (
          <li key={team.id} className={styles.teamNode}>
            <button
              type="button"
              className={styles.teamHeader}
              onClick={() => toggleTeam(team.id)}
              aria-expanded={isExpanded}
            >
              <span className={styles.chevron} aria-hidden="true">
                {isExpanded ? '▾' : '▸'}
              </span>
              <span className={styles.teamName}>{team.name}</span>
              <span className={styles.memberCount}>{team.memberIds.length} membre(s)</span>
            </button>

            {isExpanded && (
              <ul className={styles.memberList}>
                {team.memberIds.map((memberId) => {
                  const employee = employeesById.get(memberId);
                  return (
                    <li key={memberId} className={styles.memberItem}>
                      {employee
                        ? `${employee.firstName} ${employee.lastName} — ${employee.jobTitle}`
                        : `Employé #${memberId}`}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// withLoading injecte automatiquement Spinner/erreur ; TeamTreeView ne reçoit que des données prêtes
const TeamTreeViewWithLoading = withLoading(TeamTreeView);

export function TeamTree() {
  const teamsQuery = useTeams();
  const employeesQuery = useEmployees();

  const employeesById = useMemo(() => {
    const map = new Map<number, Employee>();
    employeesQuery.data?.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employeesQuery.data]);

  const isLoading = teamsQuery.isLoading || employeesQuery.isLoading;
  const isError = teamsQuery.isError || employeesQuery.isError;
  const error = teamsQuery.error ?? employeesQuery.error;

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Organigramme des équipes</h2>
      <TeamTreeViewWithLoading
        isLoading={isLoading}
        isError={isError}
        error={error}
        teams={teamsQuery.data ?? []}
        employeesById={employeesById}
      />
    </Card>
  );
}
