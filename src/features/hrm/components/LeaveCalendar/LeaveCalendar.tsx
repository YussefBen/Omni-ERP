import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { withPermissions } from '@/features/auth';
import { useEmployees } from '../../hooks/useEmployees';
import { useLeaveRequests, useUpdateLeaveStatus } from '../../hooks/useLeaveRequests';
import type { LeaveRequest } from '../../types';
import styles from './LeaveCalendar.module.css';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Grille de semaines (lundi -> dimanche) pour un mois donné, avec cases vides en marge
function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // décale pour que lundi = colonne 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function initials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

interface PendingActionsProps {
  leaveId: number;
  isUpdating: boolean;
  onUpdate: (id: number, status: 'approved' | 'rejected') => void;
}

// Valider/refuser le congé de quelqu'un d'autre est réservé aux managers/admins.
function RawPendingActions({ leaveId, isUpdating, onUpdate }: PendingActionsProps) {
  return (
    <div className={styles.pendingActions}>
      <Button variant="primary" disabled={isUpdating} onClick={() => onUpdate(leaveId, 'approved')}>
        Valider
      </Button>
      <Button variant="danger" disabled={isUpdating} onClick={() => onUpdate(leaveId, 'rejected')}>
        Refuser
      </Button>
    </div>
  );
}

const PendingActions = withPermissions(RawPendingActions, ['admin', 'manager']);

export function LeaveCalendar() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data: leaveRequests, isLoading, isError, error } = useLeaveRequests();
  const { data: employees } = useEmployees();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateLeaveStatus();

  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>();
    employees?.forEach((employee) => map.set(employee.id, `${employee.firstName} ${employee.lastName}`));
    return map;
  }, [employees]);

  // Index des congés approuvés par jour, pour un lookup direct dans la grille du calendrier
  const approvedByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    leaveRequests
      ?.filter((leave) => leave.status === 'approved')
      .forEach((leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = toDateKey(d);
          const list = map.get(key) ?? [];
          list.push(leave);
          map.set(key, list);
        }
      });
    return map;
  }, [leaveRequests]);

  const pendingRequests = useMemo(
    () => leaveRequests?.filter((leave) => leave.status === 'pending') ?? [],
    [leaveRequests],
  );

  const weeks = useMemo(() => getMonthMatrix(cursor.year, cursor.month), [cursor]);

  function goToPreviousMonth() {
    setCursor((current) => {
      const month = current.month === 0 ? 11 : current.month - 1;
      const year = current.month === 0 ? current.year - 1 : current.year;
      return { year, month };
    });
  }

  function goToNextMonth() {
    setCursor((current) => {
      const month = current.month === 11 ? 0 : current.month + 1;
      const year = current.month === 11 ? current.year + 1 : current.year;
      return { year, month };
    });
  }

  if (isLoading) return <Spinner label="Chargement du calendrier..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger les congés.'}
      </p>
    );
  }

  return (
    <div className={styles.layout}>
      <Card className={styles.calendarCard}>
        <div className={styles.header}>
          <Button variant="secondary" onClick={goToPreviousMonth} aria-label="Mois précédent">
            ‹
          </Button>
          <h2 className={styles.monthTitle}>
            {MONTH_LABELS[cursor.month]} {cursor.year}
          </h2>
          <Button variant="secondary" onClick={goToNextMonth} aria-label="Mois suivant">
            ›
          </Button>
        </div>

        <div className={styles.weekdays}>
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className={styles.weekday}>
              {label}
            </span>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div className={styles.week} key={weekIndex}>
            {week.map((date, dayIndex) => {
              if (!date) return <div className={styles.dayEmpty} key={dayIndex} />;
              const leavesToday = approvedByDate.get(toDateKey(date)) ?? [];
              return (
                <div className={styles.day} key={dayIndex}>
                  <span className={styles.dayNumber}>{date.getDate()}</span>
                  <div className={styles.dayLeaves}>
                    {leavesToday.slice(0, 3).map((leave) => (
                      <span
                        key={leave.id}
                        className={styles.leaveBadge}
                        title={employeeNameById.get(leave.employeeId)}
                      >
                        {initials(employeeNameById.get(leave.employeeId))}
                      </span>
                    ))}
                    {leavesToday.length > 3 && (
                      <span className={styles.leaveMore}>+{leavesToday.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      <Card className={styles.pendingCard}>
        <h3 className={styles.pendingTitle}>Demandes en attente</h3>
        {pendingRequests.length === 0 ? (
          <p className={styles.empty}>Aucune demande en attente.</p>
        ) : (
          <ul className={styles.pendingList}>
            {pendingRequests.map((leave) => (
              <li key={leave.id} className={styles.pendingItem}>
                <div>
                  <strong>{employeeNameById.get(leave.employeeId) ?? `Employé #${leave.employeeId}`}</strong>
                  <p className={styles.pendingDates}>
                    {leave.startDate} → {leave.endDate}
                  </p>
                </div>
                <PendingActions
                  leaveId={leave.id}
                  isUpdating={isUpdating}
                  onUpdate={(id, status) => updateStatus({ id, status })}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}