import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { withPermissions } from '@/features/auth';
import { useDeleteEmployee, useUpdateEmployee } from '../../hooks/useEmployeeMutations';
import type { Employee } from '../../types';
import styles from './EmployeeEditForm.module.css';

// Au-delà de ce nombre, un id désigne un employé créé dans l'application (donc
// supprimable) plutôt qu'un compte du roster Reqres (lecture seule côté suppression).
// Dupliqué depuis hrmService.ts : purement pour activer/désactiver le bouton à l'écran,
// le vrai contrôle reste côté service.
const EXTERNAL_EMPLOYEE_COUNT = 12;

interface EmployeeEditFormProps {
  employee: Employee;
}

// Modifier l'identité ou les infos RH d'un employé, ou le supprimer, est réservé
// aux administrateurs.
function RawEmployeeEditForm({ employee }: EmployeeEditFormProps) {
  const { mutate: update, isPending: isUpdating } = useUpdateEmployee();
  const { mutate: remove, isPending: isDeleting } = useDeleteEmployee();

  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName);
  const [department, setDepartment] = useState(employee.department);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle);

  const canDelete = employee.id > EXTERNAL_EMPLOYEE_COUNT;

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ id: employee.id, firstName, lastName, department, jobTitle });
  }

  function handleDelete() {
    if (!window.confirm(`Supprimer ${employee.firstName} ${employee.lastName} ?`)) return;
    remove(employee.id);
  }

  return (
    <form className={styles.form} onSubmit={handleSave}>
      <h3 className={styles.title}>Administration</h3>

      <div className={styles.field}>
        <label htmlFor="edit-firstName">Prénom</label>
        <input
          id="edit-firstName"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-lastName">Nom</label>
        <input
          id="edit-lastName"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-department">Département</label>
        <input
          id="edit-department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-jobTitle">Poste</label>
        <input
          id="edit-jobTitle"
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
        />
      </div>

      <div className={styles.actions}>
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={isDeleting || !canDelete}
          onClick={handleDelete}
          title={
            canDelete
              ? undefined
              : "Impossible de supprimer un employé venant du roster Reqres (lecture seule)"
          }
        >
          Supprimer
        </Button>
      </div>
    </form>
  );
}

const GuardedEmployeeEditForm = withPermissions(RawEmployeeEditForm, ['admin']);

export function EmployeeEditForm(props: EmployeeEditFormProps) {
  return <GuardedEmployeeEditForm {...props} />;
}