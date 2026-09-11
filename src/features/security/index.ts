// Point d'entrée public du domaine sécurité.

export { useAuditLog, useAudit, useLoginRateLimit } from './hooks/useSecurity';
export { AuditLogViewer } from './components/AuditLogViewer/AuditLogViewer';

export { recordAudit, fetchAuditLog } from './services/auditService';
export {
  checkRateLimit,
  registerFailure,
  clearRateLimit,
  resetAllRateLimits,
} from './services/rateLimiter';

export type * from './types';