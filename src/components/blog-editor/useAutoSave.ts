"use client";

import { useEffect, useRef } from "react";
import type { SaveState } from "./types";

interface UseAutoSaveOptions<T> {
  value: T;
  enabled: boolean;
  delayMs?: number;
  onSave: (value: T) => Promise<void>;
  onState: (state: SaveState) => void;
  isEqual?: (a: T, b: T) => boolean;
}

export function useAutoSave<T>({
  value,
  enabled,
  delayMs = 1500,
  onSave,
  onState,
  isEqual,
}: UseAutoSaveOptions<T>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<T | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (
      lastSaved.current !== null &&
      (isEqual
        ? isEqual(lastSaved.current, value)
        : lastSaved.current === value)
    ) {
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      onState({ kind: "saving" });
      try {
        await onSave(value);
        lastSaved.current = value;
        onState({ kind: "saved", at: Date.now() });
      } catch (err) {
        onState({
          kind: "error",
          message: err instanceof Error ? err.message : "Save failed",
        });
      } finally {
        inFlight.current = false;
      }
    }, delayMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, enabled, delayMs, onSave, onState, isEqual]);

  return {
    markSaved: (v: T) => {
      lastSaved.current = v;
    },
  };
}
