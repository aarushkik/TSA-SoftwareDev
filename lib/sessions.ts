"use client";

import type { SessionRecord } from "./types";

/**
 * Practice-session history, stored locally in the browser. No login, so a
 * tiny external store over localStorage — the same pattern used throughout —
 * lets components read it with useSyncExternalStore instead of syncing state
 * in an effect.
 */

const STORAGE_KEY = "interview-coach.sessions.v1";
const MAX_SESSIONS = 100;

const EMPTY: SessionRecord[] = [];

let cache: SessionRecord[] | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function readStorage(): SessionRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function subscribeSessions(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getSessions(): SessionRecord[] {
  cache ??= readStorage();
  return cache;
}

/** During SSR there is no localStorage, so the store starts empty. */
export function getSessionsServerSnapshot(): SessionRecord[] {
  return EMPTY;
}

export function saveSession(session: SessionRecord): void {
  cache = [session, ...getSessions()].slice(0, MAX_SESSIONS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Private browsing or a full quota: the session stays in memory only.
  }
  notify();
}

export function deleteSession(id: string): void {
  cache = getSessions().filter((s) => s.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore — same as above.
  }
  notify();
}

export function clearSessions(): void {
  cache = EMPTY;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
  notify();
}

export function updateSessionNotes(id: string, notes: string): void {
  cache = getSessions().map((s) => (s.id === id ? { ...s, notes } : s));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore — same as above.
  }
  notify();
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.completedAt === "string" &&
    typeof s.jobType === "string" &&
    Array.isArray(s.answers) &&
    typeof s.overallScore === "number"
  );
}

/** Merges previously-exported sessions into local storage, skipping any id already present. Returns how many were added. */
export function importSessions(imported: SessionRecord[]): number {
  const existingIds = new Set(getSessions().map((s) => s.id));
  const additions = imported.filter((s) => !existingIds.has(s.id));
  cache = [...additions, ...getSessions()].slice(0, MAX_SESSIONS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore — same as above.
  }
  notify();
  return additions.length;
}
