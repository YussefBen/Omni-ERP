// Journal d'audit : trace des actions critiques de l'application.
// Persisté dans db.json, en lecture réservée aux administrateurs.

import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { sanitizeText } from '@/shared/utils/sanitize';
import { attachCsrfProtection } from './csrf';
import type {
  AuditEntry,
  AuditFilters,
  CreateAuditEntry,
  PaginatedAudit,
} from '../types';

const auditApi = axios.create({ baseURL: API_CONFIG.jsonServer, timeout: 10000 });
attachCsrfProtection(auditApi);
const DEFAULT_AUDIT_PAGE_SIZE = 25;

/**
 * Écrit une entrée dans le journal.
 * L'écriture ne doit jamais interrompre l'action qu'elle journalise :
 * un échec de journalisation est signalé en console, pas propagé.
 */
export async function recordAudit(entry: CreateAuditEntry): Promise<void> {
  try {
    await auditApi.post('/auditLog', {
      ...entry,
      details: entry.details ? sanitizeText(entry.details) : undefined,
      // L'IP n'est pas accessible côté navigateur : on journalise
      // ce qui l'est et qui reste exploitable en investigation.
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Journalisation impossible :", error);
  }
}

/**
 * Lecture paginée du journal, du plus récent au plus ancien.
 * Le filtrage est appliqué après récupération : JSON Server ne sait pas
 * trier et filtrer simultanément sur des critères combinés.
 */
export async function fetchAuditLog(filters: AuditFilters = {}): Promise<PaginatedAudit> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE;

  const { data } = await auditApi.get<AuditEntry[]>('/auditLog');

  let entries = [...data].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  if (filters.action) {
    entries = entries.filter((entry) => entry.action === filters.action);
  }
  if (filters.result) {
    entries = entries.filter((entry) => entry.result === filters.result);
  }
  if (typeof filters.userId === 'number') {
    entries = entries.filter((entry) => entry.userId === filters.userId);
  }

  const start = (page - 1) * pageSize;

  return {
    items: entries.slice(start, start + pageSize),
    total: entries.length,
    page,
    pageSize,
  };
}