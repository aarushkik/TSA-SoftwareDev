"use client";

import type { Question } from "./types";

/**
 * User-added interview questions, stored locally — useful for practicing an
 * exact question you know is coming up in a real interview. Same
 * localStorage external-store pattern used throughout the app.
 */

const STORAGE_KEY = "interview-coach.custom-questions.v1";
const EMPTY: Question[] = [];

let cache: Question[] | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function readStorage(): Question[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Question[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function subscribeCustomQuestions(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getCustomQuestions(): Question[] {
  cache ??= readStorage();
  return cache;
}

/** During SSR there is no localStorage, so the store starts empty. */
export function getCustomQuestionsServerSnapshot(): Question[] {
  return EMPTY;
}

export function addCustomQuestion(input: Omit<Question, "id">): Question {
  const question: Question = {
    ...input,
    id: `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
  };
  cache = [...getCustomQuestions(), question];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Private browsing or a full quota: the question stays in memory only.
  }
  notify();
  return question;
}

export function removeCustomQuestion(id: string): void {
  cache = getCustomQuestions().filter((q) => q.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore — same as above.
  }
  notify();
}
