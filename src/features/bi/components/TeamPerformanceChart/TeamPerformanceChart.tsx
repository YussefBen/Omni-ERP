import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useEmployees, useTeams } from '@/features/hrm';
import { useTasks } from '@/features/pms';
import styles from './TeamPerformanceChart.module.css';

interface TeamPerformancePoint {
  teamName: string;
  completionRate: number;
  taskCount: number;
}

// Aucun hook ne calcule "performance par équipe" : ni PMS ni HRM ni BI n'exposent
// cette métrique croisée. Les données existent (Task.assigneeId + Employee.teamId),
// donc c'est fait ici, dans le module BI, exactement le genre d'agrégation qu'il
// est censé porter — plutôt que d'inventer un hook qui n'existe pas côté A/B.
export function TeamPerformanceChart() {
  const { data: teams, isLoading: isTeamsLoading, isError: isTeamsError, error: teamsError } =
    useTeams();
  const {
    data: employees,
    isLoading: isEmployeesLoading,
    isError: isEmployeesError,
    error: employeesError,
  } = useEmployees();
  const {
    data: tasksPage,
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
  } = useTasks(undefined, { pageSize: 1000 });

  const isLoading = isTeamsLoading || isEmployeesLoading || isTasksLoading;
  const isError = isTeamsError || isEmployeesError || isTasksError;
  const error = teamsError ?? employeesError ?? tasksError;

  const data = useMemo<TeamPerformancePoint[]>(() => {
    if (!teams || !employees || !tasksPage) return [];

    const teamIdByEmployeeId = new Map(employees.map((employee) => [employee.id, employee.teamId]));

    const statsByTeamId = new Map<number, { done: number; total: number }>();
    tasksPage.items.forEach((task) => {
      if (task.assigneeId === undefined) return;
      const teamId = teamIdByEmployeeId.get(task.assigneeId);
      if (teamId === undefined) return;

      const stats = statsByTeamId.get(teamId) ?? { done: 0, total: 0 };
      stats.total += 1;
      if (task.status === 'termine') stats.done += 1;
      statsByTeamId.set(teamId, stats);
    });

    return teams
      .map((team) => {
        const stats = statsByTeamId.get(team.id) ?? { done: 0, total: 0 };
        return {
          teamName: team.name,
          completionRate: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
          taskCount: stats.total,
        };
      })
      .filter((point) => point.taskCount > 0);
  }, [teams, employees, tasksPage]);

  if (isLoading) return <Spinner label="Calcul de la performance des équipes..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de calculer la performance des équipes.'}
      </p>
    );
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Performance des équipes</h2>
      <p className={styles.subtitle}>
        Taux de tâches terminées par équipe (croisement PMS/RH via assigneeId → teamId)
      </p>

      {data.length === 0 ? (
        <p className={styles.empty}>Pas assez de tâches assignées pour calculer une performance.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="teamName" />
            <YAxis unit="%" domain={[0, 100]} />
            {/* Pas d'annotation explicite sur "value" : Recharts type ce paramètre plus
                largement que "number" (ValueType = number | string | array), et l'annoter
                nous-mêmes en "number" casse la compatibilité. Le typage contextuel s'en
                charge correctement si on laisse TypeScript l'inférer. */}
            <RechartsTooltip formatter={(value) => [`${value}%`, 'Taux de complétion']} />
            <Legend />
            <Bar
              dataKey="completionRate"
              name="Taux de complétion"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
