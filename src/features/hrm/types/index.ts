/* ---------- Reqres ---------- */

// Compte Reqres brut
export interface ReqresUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

export interface ReqresUserListResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: ReqresUser[];
}

/* ---------- RandomUser ---------- */

// Profil RandomUser brut
export interface RandomUserResult {
  name: { first: string; last: string };
  phone: string;
  location: { city: string; country: string };
  picture: { large: string; medium: string; thumbnail: string };
}

export interface RandomUserListResponse {
  results: RandomUserResult[];
}

/* ---------- Employé ---------- */

export type SkillLevel = 'junior' | 'confirme' | 'expert';

export interface EmployeeSkill {
  name: string;
  level: SkillLevel;
}

// Employé final, toutes sources fusionnées
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
  phone: string;
  city: string;
  country: string;
  department: string;
  jobTitle: string;
  teamId: number;
  skills: EmployeeSkill[];
}

export interface EmployeeFilters {
  search?: string;
  skills?: string[];
  availableOnly?: boolean;
}

/* ---------- Équipe ---------- */

// Équipe reconstituée depuis les employés
export interface Team {
  id: number;
  name: string;
  memberIds: number[];
}

/* ---------- Compétences ---------- */

// Compétence agrégée sur toute l'équipe
export interface Skill {
  name: string;
  employeeCount: number;
  employeeIds: number[];
}

export interface SkillGapEntry {
  skill: string;
  covered: boolean;
  availableCount: number;
}

/* ---------- Congés ---------- */

export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'conges_payes' | 'maladie' | 'sans_solde';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
}

export interface CreateLeaveRequestPayload {
  employeeId: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateLeaveStatusPayload {
  id: number;
  status: LeaveStatus;
}

export interface LeaveBalance {
  employeeId: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

/* ---------- Présence ---------- */

export interface PresenceEntry {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
}

/* ---------- KPI pour B ---------- */

export interface HRKPI {
  totalEmployees: number;
  teamCount: number;
  pendingLeaveRequests: number;
  employeesOnLeaveToday: number;
}