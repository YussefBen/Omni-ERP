import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { withPermissions } from '@/features/auth';
import { useCreateEmployee } from '../../hooks/useEmployeeMutations';
import styles from './CreateEmployeeForm.module.css';

// Créer un employé (entièrement local, jamais sur Reqres) est réservé aux administrateurs.
function RawCreateEmployeeForm() {
  const { mutate: create, isPending } = useCreateEmployee();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
    });
    setFirstName('');
    setLastName('');
    setDepartment('');
    setJobTitle('');
  }

  return (
    <Card className={styles.card}>
      <h3 className={styles.title}>Ajouter un employé</h3>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Prénom"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          aria-label="Prénom"
        />
        <input
          type="text"
          placeholder="Nom"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          aria-label="Nom"
        />
        <input
          type="text"
          placeholder="Département (optionnel)"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          aria-label="Département"
        />
        <input
          type="text"
          placeholder="Poste (optionnel)"
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
          aria-label="Poste"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Ajout...' : 'Ajouter'}
        </Button>
      </form>
    </Card>
  );
}

const GuardedCreateEmployeeForm = withPermissions(RawCreateEmployeeForm, ['admin']);

export function CreateEmployeeForm() {
  return <GuardedCreateEmployeeForm />;
}