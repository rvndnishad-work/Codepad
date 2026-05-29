"use client";

import { useEffect, useRef } from "react";

/**
 * Light-touch localStorage draft autosave.
 *
 * Wraps a `value` / `setValue` pair owned by a parent component and:
 *   1. On mount, if the current value is empty AND a saved draft exists for
 *      the key, restore it (calls onRestore with the restored text so the
 *      caller can show a "Draft restored" hint if desired).
 *   2. On value change, debounce-writes to localStorage so we're not hitting
 *      storage on every keystroke.
 *
 * Pass `null` as the key to disable autosave (e.g. while no scenario is
 * active). The hook is still safe to call — it just becomes a no-op.
 */
export function useDraft(
  key: string | null,
  value: string,
  setValue: (next: string) => void,
  options: { debounceMs?: number; onRestore?: (restored: string) => void } = {},
) {
  const { debounceMs = 500, onRestore } = options;
  const restoredFor = useRef<string | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore on key change (e.g. switching scenarios) — but only if the
  // current value is empty, otherwise we'd clobber the user's in-progress edit.
  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    if (restoredFor.current === key) return;
    restoredFor.current = key;
    if (value.length > 0) return;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved && saved.length > 0) {
        setValue(saved);
        onRestore?.(saved);
      }
    } catch {
      // localStorage can throw in private browsing — silently ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced writeback on value change.
  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        if (value.length === 0) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // ignore
      }
    }, debounceMs);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [key, value, debounceMs]);

  function clear() {
    if (!key || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  return { clear };
}
