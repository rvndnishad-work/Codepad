/**
 * Typed localStorage preferences with private-mode-safe fallbacks.
 *
 * Pure-ish helpers (storage access guarded) behind the playground's persisted
 * editor settings: format-on-save, panel layout, stdin drafts. Every helper
 * degrades to the fallback when storage is unavailable instead of throwing.
 */

export function readPref(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / blocked storage — preference just won't persist */
  }
}

export function readBoolPref(key: string, fallback: boolean): boolean {
  const raw = readPref(key);
  if (raw === null) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function writeBoolPref(key: string, value: boolean): void {
  writePref(key, value ? "1" : "0");
}

export function readNumberPref(
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = readPref(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Storage keys for playground preferences. */
export const PREF_KEYS = {
  formatOnSave: "interviewpad_formatOnSave",
  /** "1" = skip the delete confirmation dialog. */
  skipDeleteConfirm: "interviewpad_skipDeleteConfirm",
  layout: (part: "explorer" | "editor" | "prompt" | "consoleW" | "consoleH") =>
    `interviewpad_layout:${part}`,
} as const;
