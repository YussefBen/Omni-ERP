import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useCheckIn, useCheckOut, usePresence } from '../../hooks/usePresence';
import styles from './PresenceTracker.module.css';

interface PresenceTrackerProps {
  // Id de l'employé connecté ; à fournir par l'écran parent (ex. depuis la session courante)
  employeeId: number;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function PresenceTracker({ employeeId }: PresenceTrackerProps) {
  const { data: presence, isLoading, isError, error } = usePresence(employeeId);
  const checkInMutation = useCheckIn(employeeId);
  const checkOutMutation = useCheckOut(employeeId);

  if (isLoading) return <Spinner label="Chargement de la présence..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger la présence du jour.'}
      </p>
    );
  }

  const hasCheckedIn = Boolean(presence?.checkIn);
  const hasCheckedOut = Boolean(presence?.checkOut);
  const mutationError = checkInMutation.error ?? checkOutMutation.error;

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Présence du jour</h2>

      <dl className={styles.times}>
        <dt>Arrivée</dt>
        <dd>{formatTime(presence?.checkIn)}</dd>
        <dt>Départ</dt>
        <dd>{formatTime(presence?.checkOut)}</dd>
      </dl>

      {(checkInMutation.isError || checkOutMutation.isError) && (
        <p className={styles.error} role="alert">
          {mutationError?.message ?? 'Une erreur est survenue.'}
        </p>
      )}

      <div className={styles.actions}>
        <Button onClick={() => checkInMutation.mutate()} disabled={hasCheckedIn || checkInMutation.isPending}>
          {checkInMutation.isPending ? 'Enregistrement...' : 'Check-in'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (presence) checkOutMutation.mutate(presence.id);
          }}
          disabled={!hasCheckedIn || hasCheckedOut || checkOutMutation.isPending}
        >
          {checkOutMutation.isPending ? 'Enregistrement...' : 'Check-out'}
        </Button>
      </div>
    </Card>
  );
}
