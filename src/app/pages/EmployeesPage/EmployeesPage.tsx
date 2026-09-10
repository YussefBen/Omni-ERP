import { EmployeeDirectory } from '@/features/hrm/components/EmployeeDirectory/EmployeeDirectory';
import styles from './EmployeesPage.module.css';

export function EmployeesPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Employés</h1>
      <EmployeeDirectory />
    </div>
  );
}
