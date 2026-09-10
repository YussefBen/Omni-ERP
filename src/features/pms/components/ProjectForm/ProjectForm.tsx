import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/shared/components/Button/Button';
import { useCreateProject } from '../../hooks/useProjectMutations';
import type { ProjectStatus } from '../../types';
import styles from './ProjectForm.module.css';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
  en_pause: 'En pause',
};

const projectFormSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  status: z.enum(['a_faire', 'en_cours', 'termine', 'en_pause']),
  dueDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  // Id du propriétaire (utilisateur connecté) ; à fournir par l'écran parent
  ownerId: number;
  onSuccess?: () => void;
}

export function ProjectForm({ ownerId, onSuccess }: ProjectFormProps) {
  const { mutateAsync, isPending, isError, error } = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { status: 'a_faire' },
  });

  async function onSubmit(values: ProjectFormValues) {
    try {
      await mutateAsync({ ownerId, ...values });
      reset();
      onSuccess?.();
    } catch {
      // erreur déjà exposée via isError/error ci-dessus
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>
          Titre
        </label>
        <input id="title" className={styles.input} {...register('title')} />
        {errors.title && <p className={styles.fieldError}>{errors.title.message}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          Description
        </label>
        <textarea
          id="description"
          className={styles.textarea}
          rows={4}
          {...register('description')}
        />
        {errors.description && <p className={styles.fieldError}>{errors.description.message}</p>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="status" className={styles.label}>
            Statut
          </label>
          <select id="status" className={styles.select} {...register('status')}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="dueDate" className={styles.label}>
            Échéance (optionnel)
          </label>
          <input id="dueDate" type="date" className={styles.input} {...register('dueDate')} />
        </div>
      </div>

      {isError && (
        <p className={styles.formError} role="alert">
          {error?.message ?? 'Impossible de créer le projet.'}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Création...' : 'Créer le projet'}
      </Button>
    </form>
  );
}
