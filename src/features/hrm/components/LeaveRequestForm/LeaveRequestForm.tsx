import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/shared/components/Button/Button';
import { useCreateLeaveRequest } from '../../hooks/useLeaveRequests';
import type { LeaveType } from '../../types';
import styles from './LeaveRequestForm.module.css';

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  conges_payes: 'Congés payés',
  maladie: 'Maladie',
  sans_solde: 'Sans solde',
};

const leaveRequestSchema = z
  .object({
    type: z.enum(['conges_payes', 'maladie', 'sans_solde']),
    startDate: z.string().min(1, 'La date de début est requise'),
    endDate: z.string().min(1, 'La date de fin est requise'),
    reason: z.string().optional(),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: 'La date de fin doit être postérieure ou égale à la date de début',
    path: ['endDate'],
  });

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

interface LeaveRequestFormProps {
  // Id de l'employé connecté ; à fournir par l'écran parent (ex. depuis la session courante)
  employeeId: number;
  onSuccess?: () => void;
}

export function LeaveRequestForm({ employeeId, onSuccess }: LeaveRequestFormProps) {
  const { mutateAsync, isPending, isError, error } = useCreateLeaveRequest();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { type: 'conges_payes' },
  });

  async function onSubmit(values: LeaveRequestFormValues) {
    try {
      await mutateAsync({ employeeId, ...values });
      reset();
      onSuccess?.();
    } catch {
      // erreur déjà exposée via isError/error ci-dessus
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="type" className={styles.label}>
          Type de congé
        </label>
        <select id="type" className={styles.select} {...register('type')}>
          {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="startDate" className={styles.label}>
            Du
          </label>
          <input id="startDate" type="date" className={styles.input} {...register('startDate')} />
          {errors.startDate && <p className={styles.fieldError}>{errors.startDate.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="endDate" className={styles.label}>
            Au
          </label>
          <input id="endDate" type="date" className={styles.input} {...register('endDate')} />
          {errors.endDate && <p className={styles.fieldError}>{errors.endDate.message}</p>}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="reason" className={styles.label}>
          Motif (optionnel)
        </label>
        <textarea id="reason" className={styles.textarea} rows={3} {...register('reason')} />
      </div>

      {isError && (
        <p className={styles.formError} role="alert">
          {error?.message ?? "Impossible d'envoyer la demande."}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Envoi...' : 'Envoyer la demande'}
      </Button>
    </form>
  );
}
