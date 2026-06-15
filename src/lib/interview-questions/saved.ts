"use client";

/**
 * Client-side "save question for later" store, backed by localStorage so it
 * works without an account. Stores minimal metadata so the saved page can render
 * without a server round-trip. (A signed-in, synced version is a Phase-2 item.)
 */

export type SavedQuestion = {
  slug: string;
  title: string;
  difficulty: string;
  technology: string | null;
  company: string | null;
  savedAt: number;
};

const KEY = "iq-saved-questions";

export function getSaved(): SavedQuestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: SavedQuestion[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    // Let other components on the page react (e.g. the saved page / counters).
    window.dispatchEvent(new Event("iq-saved-changed"));
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function isSaved(slug: string): boolean {
  return getSaved().some((q) => q.slug === slug);
}

/** Toggle a question's saved state. Returns the new saved state. */
export function toggleSaved(q: Omit<SavedQuestion, "savedAt">): boolean {
  const list = getSaved();
  const idx = list.findIndex((x) => x.slug === q.slug);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.unshift({ ...q, savedAt: Date.now() });
  write(list);
  return true;
}

export function removeSaved(slug: string) {
  write(getSaved().filter((q) => q.slug !== slug));
}
