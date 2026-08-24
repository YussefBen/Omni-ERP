// Types du domaine sécurité : journal d'audit et limitation de tentatives.

/* ---------- Journal d'audit ---------- */

export type AuditAction =
  | 'login.success'
  | 'login.failure'
  | 'login.blocked'
  | 'logout'
  | 'register'
  | 'client.status.update'
  | 'opportunity.create'
  | 'opportunity.update'
  | 'opportunity.delete'
  | 'order.status.update'
  | 'supplier.evaluate'
  | 'stock.movement.create'
  | 'report.export';

export type AuditResult = 'succes' | 'echec' | 'refuse';

// Entrée persistée dans db.json (collection auditLog).
export interface AuditEntry {
  id: number;
  // Identifiant de l'utilisateur, null pour une action anonyme
  // comme une tentative de connexion échouée.
  userId: number | null;
  userEmail: string | null;
  action: AuditAction;
  result: AuditResult;
  // Contexte libre : identifiant de l'objet visé, ancien et nouveau statut.
  details?: string;
  // L'adresse IP réelle n'est pas accessible depuis un navigateur.
  // On journalise ce qui l'est : l'agent utilisateur et l'origine.
  userAgent: string;
  origin: string;
  occurredAt: string;
}

export type CreateAuditEntry = Omit<
  AuditEntry,
  'id' | 'occurredAt' | 'userAgent' | 'origin'
>;

export interface AuditFilters {
  action?: AuditAction;
  result?: AuditResult;
  userId?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedAudit {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------- Limitation des tentatives ---------- */

export interface RateLimitState {
  // Vrai lorsque la tentative doit être refusée sans appel réseau.
  isBlocked: boolean;
  // Tentatives restantes avant blocage.
  remaining: number;
  // Fin du blocage, en millisecondes depuis l'époque.
  blockedUntil: number | null;
  // Secondes restantes, pour l'affichage d'un décompte.
  secondsRemaining: number;
}