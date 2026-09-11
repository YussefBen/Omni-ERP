import { LeaveBalanceSummary } from '@/features/hrm/components/LeaveBalanceSummary/LeaveBalanceSummary';
import { LeaveCalendar } from '@/features/hrm/components/LeaveCalendar/LeaveCalendar';
import { LeaveRequestForm } from '@/features/hrm/components/LeaveRequestForm/LeaveRequestForm';
import { PresenceTracker } from '@/features/hrm/components/PresenceTracker/PresenceTracker';
import { Tabs } from '@/shared/components/Tabs/Tabs';
import { useCurrentUserId } from '@/shared/hooks/useCurrentUser';
import styles from './LeaveRequestsPage.module.css';

// Pas de route dédiée à la présence dans le router : regroupée ici avec les
// congés, sous forme d'onglets ("Ma demande" / "Ma présence" sont propres à
// l'utilisateur connecté, "Calendrier" reste la vue collective/manager).
export function LeaveRequestsPage() {
  const currentUserId = useCurrentUserId();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Congés &amp; présence</h1>

      <Tabs defaultValue="calendar">
        <Tabs.List>
          <Tabs.Tab value="calendar">Calendrier &amp; validations</Tabs.Tab>
          <Tabs.Tab value="request">Ma demande</Tabs.Tab>
          <Tabs.Tab value="presence">Ma présence</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panels>
          <Tabs.Panel value="calendar">
            <LeaveCalendar />
          </Tabs.Panel>

          <Tabs.Panel value="request">
            {currentUserId !== undefined ? (
              <>
                <LeaveBalanceSummary employeeId={currentUserId} />
                <LeaveRequestForm employeeId={currentUserId} />
              </>
            ) : (
              <p role="alert">Connecte-toi pour faire une demande de congé.</p>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="presence">
            {currentUserId !== undefined ? (
              <PresenceTracker employeeId={currentUserId} />
            ) : (
              <p role="alert">Connecte-toi pour pointer ta présence.</p>
            )}
          </Tabs.Panel>
        </Tabs.Panels>
      </Tabs>
    </div>
  );
}
