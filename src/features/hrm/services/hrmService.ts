import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { deriveDepartment, deriveJobTitle, deriveSkills, deriveTeamId } from '../hooks/hrmLogic';
import type {
  CreateLeaveRequestPayload,
  Employee,
  EmployeeFilters,
  LeaveRequest,
  PresenceEntry,
  RandomUserListResponse,
  ReqresUserListResponse,
  UpdateLeaveStatusPayload,
} from '../types';

// Un client Axios par source, avec timeout 
const reqresApi = axios.create({ baseURL: API_CONFIG.reqres, timeout: 10000 });
const randomUserApi = axios.create({ baseURL: API_CONFIG.randomUser, timeout: 10000 });
const localApi = axios.create({ baseURL: API_CONFIG.jsonServer, timeout: 10000 });

// Reqres a 12 comptes sur 2 pages
async function fetchReqresRoster() {
  const [page1, page2] = await Promise.all([
    reqresApi.get<ReqresUserListResponse>('/users', { params: { page: 1 } }),
    reqresApi.get<ReqresUserListResponse>('/users', { params: { page: 2 } }),
  ]);
  return [...page1.data.data, ...page2.data.data];
}

// Seed fixe, mêmes profils à chaque appel
async function fetchRandomUserProfiles(count: number) {
  const { data } = await randomUserApi.get<RandomUserListResponse>('/', {
    params: { results: count, seed: 'omnierp-hrm', nat: 'fr' },
  });
  return data.results;
}

// Fusionne les deux sources + données inventées
export async function fetchEmployees(filters: EmployeeFilters = {}): Promise<Employee[]> {
  const roster = await fetchReqresRoster();
  const profiles = await fetchRandomUserProfiles(roster.length);

  let employees: Employee[] = roster.map((account, index) => {
    const profile = profiles[index];
    return {
      id: account.id,
      firstName: account.first_name,
      lastName: account.last_name,
      email: account.email,
      avatarUrl: account.avatar,
      phone: profile?.phone ?? '',
      city: profile?.location.city ?? '',
      country: profile?.location.country ?? '',
      department: deriveDepartment(account.id),
      jobTitle: deriveJobTitle(account.id),
      teamId: deriveTeamId(account.id),
      skills: deriveSkills(account.id),
    };
  });

  // Recherche insensible à la casse
  if (filters.search) {
    const term = filters.search.toLowerCase();
    employees = employees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term) ||
        e.jobTitle.toLowerCase().includes(term),
    );
  }

  // Filtre par compétences requises
  if (filters.skills && filters.skills.length > 0) {
    const requiredSkills = filters.skills;
    employees = employees.filter((e) =>
      requiredSkills.every((skill) => e.skills.some((s) => s.name === skill)),
    );
  }

  // Filtre disponibilité (pas en congé aujourd'hui)
  if (filters.availableOnly) {
    const onLeaveIds = await fetchEmployeeIdsOnLeaveToday();
    employees = employees.filter((e) => !onLeaveIds.has(e.id));
  }

  return employees;
}

// Qui est en congé validé aujourd'hui
async function fetchEmployeeIdsOnLeaveToday(): Promise<Set<number>> {
  const { data } = await localApi.get<LeaveRequest[]>('/leaveRequests', {
    params: { status: 'approved' },
  });
  const today = new Date().toISOString().slice(0, 10);
  return new Set(
    data
      .filter((leave) => leave.startDate <= today && today <= leave.endDate)
      .map((leave) => leave.employeeId),
  );
}

/* ---------- Congés ---------- */

export async function fetchLeaveRequests(employeeId?: number): Promise<LeaveRequest[]> {
  const { data } = await localApi.get<LeaveRequest[]>('/leaveRequests', {
    params: employeeId ? { employeeId } : undefined,
  });
  return data;
}

// Nouvelle demande, toujours en attente au départ
export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> {
  const { data } = await localApi.post<LeaveRequest>('/leaveRequests', {
    ...payload,
    status: 'pending',
  });
  return data;
}

export async function updateLeaveStatus({
  id,
  status,
}: UpdateLeaveStatusPayload): Promise<LeaveRequest> {
  const { data } = await localApi.patch<LeaveRequest>(`/leaveRequests/${id}`, { status });
  return data;
}

/* ---------- Présence ---------- */

export async function fetchPresenceToday(employeeId: number): Promise<PresenceEntry | undefined> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await localApi.get<PresenceEntry[]>('/presence', {
    params: { employeeId, date: today },
  });
  return data[0];
}

export async function checkIn(employeeId: number): Promise<PresenceEntry> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await localApi.post<PresenceEntry>('/presence', {
    employeeId,
    date: today,
    checkIn: new Date().toISOString(),
    checkOut: null,
  });
  return data;
}

export async function checkOut(entryId: number): Promise<PresenceEntry> {
  const { data } = await localApi.patch<PresenceEntry>(`/presence/${entryId}`, {
    checkOut: new Date().toISOString(),
  });
  return data;
}