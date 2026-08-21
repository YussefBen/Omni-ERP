import { fetchEmployees, fetchLeaveRequests } from '../services/hrmService';
import { deriveTeamId } from './hrmLogic';
import type { HRKPI } from '../types';

// Décalage pour simuler la période précédente
const PREVIOUS_PERIOD_OFFSET_DAYS = 30;

export async function getHRKPI(previous = false): Promise<HRKPI> {
  const [employees, leaveRequests] = await Promise.all([fetchEmployees(), fetchLeaveRequests()]);

  // Pas de date d'embauche dispo, effectif figé sur les deux périodes
  const totalEmployees = employees.length;
  const teamCount = new Set(employees.map((e) => deriveTeamId(e.id))).size;

  // Seul ce champ a une vraie date à comparer
  const referenceDate = previous
    ? new Date(Date.now() - PREVIOUS_PERIOD_OFFSET_DAYS * 24 * 60 * 60 * 1000)
    : new Date();
  const referenceDateStr = referenceDate.toISOString().slice(0, 10);

  const employeesOnLeaveToday = leaveRequests.filter(
    (r) =>
      r.status === 'approved' && r.startDate <= referenceDateStr && referenceDateStr <= r.endDate,
  ).length;

  // Statut pas historisé, même valeur des deux côtés
  const pendingLeaveRequests = leaveRequests.filter((r) => r.status === 'pending').length;

  return { totalEmployees, teamCount, pendingLeaveRequests, employeesOnLeaveToday };
}