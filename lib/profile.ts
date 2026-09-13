"use client";

/**
 * A user's own background info, stored locally — never uploaded anywhere.
 * Used to personalize hints (e.g. suggesting one of your own experiences
 * for a behavioral question) without ever generating or guessing content
 * on your behalf.
 */

export type ProfileExperience = {
  id: string;
  text: string;
};

export type Profile = {
  targetRole: string;
  targetCompany: string;
  experiences: ProfileExperience[];
};

const STORAGE_KEY = "interview-coach.profile.v1";
const EMPTY: Profile = { targetRole: "", targetCompany: "", experiences: [] };

let cache: Profile | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function readStorage(): Profile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Profile>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function subscribeProfile(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getProfile(): Profile {
  cache ??= readStorage();
  return cache;
}

/** During SSR there is no localStorage, so the store starts empty. */
export function getProfileServerSnapshot(): Profile {
  return EMPTY;
}

function persist(next: Profile): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: changes stay in memory only.
  }
  notify();
}

export function updateProfileBasics(targetRole: string, targetCompany: string): void {
  persist({ ...getProfile(), targetRole, targetCompany });
}

export function addProfileExperience(text: string): void {
  const experience: ProfileExperience = {
    id: `exp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    text,
  };
  persist({ ...getProfile(), experiences: [...getProfile().experiences, experience] });
}

export function removeProfileExperience(id: string): void {
  persist({ ...getProfile(), experiences: getProfile().experiences.filter((e) => e.id !== id) });
}
