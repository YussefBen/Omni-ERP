import { Card } from '@/shared/components/Card/Card';
import { withLoading } from '@/shared/components/withLoading/withLoading';
import { useLeaveBalance } from '../../hooks/useLeaveBalance';
import type { LeaveBalance } from '../../types';
import styles from './LeaveBalanceSummary.module.css';

interface LeaveBalanceViewProps {
  balance: LeaveBalance;
}

function LeaveBalanceView({ balance }: LeaveBalanceViewProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.stat}>
        <span className={styles.value}>{balance.remainingDays}</span>
        <span className={styles.label}>jours restants</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>{balance.usedDays}</span>
        <span className={styles.label}>jours pris</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>{balance.totalDays}</span>
        <span className={styles.label}>jours par an</span>
      </div>
    </div>
  );
}

const LeaveBalanceViewWithLoading = withLoading(LeaveBalanceView);

interface LeaveBalanceSummaryProps {
  employeeId: number;
}

export function LeaveBalanceSummary({ employeeId }: LeaveBalanceSummaryProps) {
  const balanceQuery = useLeaveBalance(employeeId);

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Solde de congés</h2>
      <LeaveBalanceViewWithLoading
        isLoading={balanceQuery.isLoading}
        isError={balanceQuery.isError}
        error={balanceQuery.error}
        balance={balanceQuery.data ?? { employeeId, totalDays: 0, usedDays: 0, remainingDays: 0 }}
      />
    </Card>
  );
}