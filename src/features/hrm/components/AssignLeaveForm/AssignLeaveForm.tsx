import { useState } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { withPermissions } from '@/features/auth';
import { useEmployees } from '../../hooks/useEmployees';
import { LeaveRequestForm } from '../LeaveRequestForm/LeaveRequestForm';
import styles from './AssignLeaveForm.module.css';

function RawAssignLeaveForm() {
  const { data: employees, isLoading } = useEmployees();
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  return (
    <Card className={styles.card}>
      <h3 className={styles.title}>Créer un congé pour un employé</h3>

      <select
        className={styles.select}
        value={employeeId ?? ''}
        onChange={(event) =>
          setEmployeeId(event.target.value ? Number(event.target.value) : null)
        }
        disabled={isLoading}
        aria-label="Employé concerné"
      >
        <option value="">Choisir un employé...</option>
        {employees?.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.firstName} {employee.lastName}
          </option>
        ))}
      </select>

      {employeeId !== null && (
        <LeaveRequestForm employeeId={employeeId} onSuccess={() => setEmployeeId(null)} />
      )}
    </Card>
  );
}

const GuardedAssignLeaveForm = withPermissions(RawAssignLeaveForm, ['admin', 'manager']);

export function AssignLeaveForm() {
  return <GuardedAssignLeaveForm />;
}