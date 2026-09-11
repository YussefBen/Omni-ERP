import { useMemo, useState } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { CreateEmployeeForm } from '../CreateEmployeeForm/CreateEmployeeForm';
import { useEmployees } from '../../hooks/useEmployees';
import { useTeams } from '../../hooks/useTeams';
import { EmployeeProfile } from '../EmployeeProfile/EmployeeProfile.tsx';
import type { EmployeeFilters } from '../../types/index.ts';
import styles from './EmployeeDirectory.module.css';

export function EmployeeDirectory() {
  const [searchInput, setSearchInput] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchInput);

  // Appel non filtré, uniquement pour dériver la liste des compétences disponibles (checkboxes) :
  // sans ça, impossible de savoir quelles compétences proposer avant d'avoir vu tous les employés.
  const { data: allEmployees } = useEmployees();

  const availableSkills = useMemo(() => {
    if (!allEmployees) return [];
    const skillSet = new Set<string>();
    allEmployees.forEach((employee) => {
      employee.skills.forEach((skill) => skillSet.add(skill.name));
    });
    return Array.from(skillSet).sort();
  }, [allEmployees]);

  const filters: EmployeeFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      availableOnly: availableOnly || undefined,
    }),
    [debouncedSearch, selectedSkills, availableOnly],
  );

  const { data: employees, isLoading, isError, error } = useEmployees(filters);
  const { data: teams } = useTeams();

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    teams?.forEach((team) => map.set(team.id, team.name));
    return map;
  }, [teams]);

  function toggleSkill(skill: string) {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill],
    );
  }

  const selectedEmployee = employees?.find((employee) => employee.id === selectedEmployeeId) ?? null;

  return (
    <div className={styles.layout}>
      <div className={styles.listColumn}>
        <CreateEmployeeForm />

        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Rechercher un employé..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className={styles.searchInput}
            aria-label="Rechercher un employé"
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
            />
            Disponible uniquement
          </label>

          {availableSkills.length > 0 && (
            <div className={styles.skillFilters}>
              {availableSkills.map((skill) => (
                <label key={skill} className={styles.skillCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                  />
                  {skill}
                </label>
              ))}
            </div>
          )}
        </div>

        {isLoading && <Spinner label="Chargement des employés..." />}

        {isError && (
          <p role="alert" className={styles.error}>
            {error?.message ?? 'Impossible de charger les employés.'}
          </p>
        )}

        {!isLoading && !isError && (
          <ul className={styles.list}>
            {employees?.length === 0 && (
              <p className={styles.empty}>Aucun employé ne correspond à ces critères.</p>
            )}
            {employees?.map((employee) => (
              <li key={employee.id}>
                <button
                  type="button"
                  className={`${styles.employeeRow} ${
                    selectedEmployeeId === employee.id ? styles.employeeRowActive : ''
                  }`}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                >
                  <img src={employee.avatarUrl} alt="" className={styles.avatarSmall} />
                  <span className={styles.employeeInfo}>
                    <span className={styles.employeeName}>
                      {employee.firstName} {employee.lastName}
                    </span>
                    <span className={styles.employeeJob}>{employee.jobTitle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.profileColumn}>
        {selectedEmployee ? (
          <EmployeeProfile
            employee={selectedEmployee}
            teamName={teamNameById.get(selectedEmployee.teamId)}
          />
        ) : (
          <Card className={styles.placeholder}>
            <p>Sélectionne un employé pour voir son profil.</p>
          </Card>
        )}
      </div>
    </div>
  );
}