"use client";

/**
 * Client-side "mark question as solved" store, backed by localStorage so it
 * works without an account. Tracks question progress by technology.
 * (A signed-in, database-synced version is planned for Phase 3.)
 */

export type SolvedQuestion = {
  slug: string;
  technology: string | null;
  solvedAt: number;
};

const KEY = "iq-solved-questions";

export function getSolved(): SolvedQuestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: SolvedQuestion[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    // Let other components on the page react (e.g., progress metrics, checkmarks).
    window.dispatchEvent(new Event("iq-solved-changed"));
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function isSolved(slug: string): boolean {
  return getSolved().some((q) => q.slug === slug);
}

/** Toggle a question's solved state. Returns the new state. */
export function toggleSolved(slug: string, technology: string | null): boolean {
  const list = getSolved();
  const idx = list.findIndex((q) => q.slug === slug);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.push({ slug, technology, solvedAt: Date.now() });
  write(list);
  return true;
}

export function removeSolved(slug: string) {
  write(getSolved().filter((q) => q.slug !== slug));
}
