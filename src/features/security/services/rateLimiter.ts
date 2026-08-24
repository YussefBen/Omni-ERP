// Limitation des tentatives de connexion : trois échecs par minute et par
// adresse e-mail. Le comptage par IP demandé par l'énoncé n'est pas réalisable
// depuis un navigateur — l'adresse n'y est pas exposée. Le compte par identifiant
// est retenu : il empêche l'attaque ciblée sur un compte précis, ce qui est
// l'objectif principal, sans protéger d'une attaque distribuée.

import { MAX_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_MS } from '@/features/auth/store/authStore';
import type { RateLimitState } from '../types';

interface AttemptRecord {
  count: number;
  // Horodatage de la première tentative de la fenêtre en cours.
  windowStart: number;
  blockedUntil: number | null;
}

// Conservé en mémoire volontairement : une limitation stockée dans le
// navigateur se contourne en vidant le stockage local. Elle n'a de valeur
// que comme garde-fou d'interface, jamais comme protection réelle.
const attempts = new Map<string, AttemptRecord>();

function normalizeKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function readRecord(key: string, now: number): AttemptRecord {
  const record = attempts.get(key);

  if (!record) {
    return { count: 0, windowStart: now, blockedUntil: null };
  }

  // Le blocage a expiré : le compteur repart de zéro, sinon la tentative
  // suivante rebloquerait immédiatement et le blocage serait permanent.
  if (record.blockedUntil && record.blockedUntil <= now) {
    return { count: 0, windowStart: now, blockedUntil: null };
  }

  // Fenêtre glissante d'une minute : au-delà, les échecs précédents
  // ne comptent plus.
  if (!record.blockedUntil && now - record.windowStart > LOGIN_LOCKOUT_MS) {
    return { count: 0, windowStart: now, blockedUntil: null };
  }

  return record;
}

function toState(record: AttemptRecord, now: number): RateLimitState {
  const isBlocked = Boolean(record.blockedUntil && record.blockedUntil > now);

  return {
    isBlocked,
    remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - record.count),
    blockedUntil: record.blockedUntil,
    secondsRemaining: isBlocked
      ? Math.ceil(((record.blockedUntil as number) - now) / 1000)
      : 0,
  };
}

/** État courant sans modifier le compteur. À appeler avant d'autoriser une tentative. */
export function checkRateLimit(identifier: string): RateLimitState {
  const now = Date.now();
  const key = normalizeKey(identifier);
  const record = readRecord(key, now);

  attempts.set(key, record);
  return toState(record, now);
}

/** Enregistre un échec et renvoie le nouvel état. */
export function registerFailure(identifier: string): RateLimitState {
  const now = Date.now();
  const key = normalizeKey(identifier);
  const record = readRecord(key, now);

  const count = record.count + 1;
  const updated: AttemptRecord = {
    count,
    windowStart: record.count === 0 ? now : record.windowStart,
    blockedUntil: count >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : null,
  };

  attempts.set(key, updated);
  return toState(updated, now);
}

/** Efface le compteur après une connexion réussie. */
export function clearRateLimit(identifier: string): void {
  attempts.delete(normalizeKey(identifier));
}

/** Réinitialise tout. Réservé aux tests. */
export function resetAllRateLimits(): void {
  attempts.clear();
}