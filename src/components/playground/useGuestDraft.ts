"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { readPref, writePref } from "@/lib/prefs";
import {
  draftKey,
  matchesTemplate,
  parseDraft,
  serializeDraft,
  visibleFiles,
  type PlaygroundDraft,
} from "@/lib/playground-draft";

function removeDraft(templateId: string) {
  try {
    window.localStorage.removeItem(draftKey(templateId));
  } catch {
    /* private mode */
  }
}

/**
 * Local draft for a playground with no saved snippet. Edits are written a
 * moment after they happen; the next visit offers the last draft back.
 * While that offer is on screen nothing is written, so typing in the fresh
 * template cannot overwrite the work being offered.
 */
export function useGuestDraft({
  templateId,
  enabled,
  skipRestore,
  templateFiles,
  filesRef,
  title,
}: {
  templateId: string;
  /** False once the playground has a saved snippet (or is read-only). */
  enabled: boolean;
  /** A #code/#files handoff wins over an old draft. */
  skipRestore: boolean;
  templateFiles: SandpackFiles;
  filesRef: MutableRefObject<SandpackFiles>;
  title: string;
}) {
  const [pending, setPending] = useState<PlaygroundDraft | null>(null);
  const pendingRef = useRef<PlaygroundDraft | null>(null);
  pendingRef.current = pending;

  useEffect(() => {
    if (!enabled || skipRestore) return;
    const draft = parseDraft(readPref(draftKey(templateId)));
    if (draft && !matchesTemplate(draft.files, templateFiles)) setPending(draft);
    // Read once per template: later edits are this session's own writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const titleRef = useRef(title);
  titleRef.current = title;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const write = useCallback(() => {
    if (!enabled || pendingRef.current) return;
    const files = visibleFiles(filesRef.current);
    if (matchesTemplate(files, templateFiles)) {
      removeDraft(templateId);
      return;
    }
    const json = serializeDraft(titleRef.current, files);
    if (json) writePref(draftKey(templateId), json);
  }, [enabled, filesRef, templateFiles, templateId]);

  /** Call on every edit; the write is debounced. */
  const noteChange = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(write, 800);
  }, [enabled, write]);

  useEffect(() => noteChange(), [title, noteChange]);

  // Flush on tab hide so a quick close still keeps the last keystrokes.
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (document.visibilityState === "hidden") write();
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, write]);

  // Saving to an account makes the draft redundant.
  useEffect(() => {
    if (!enabled && timerRef.current) clearTimeout(timerRef.current);
  }, [enabled]);

  const dismiss = useCallback(() => {
    removeDraft(templateId);
    setPending(null);
  }, [templateId]);

  /** Hand the offered draft to the caller and resume writing. */
  const take = useCallback(() => {
    const d = pendingRef.current;
    setPending(null);
    return d;
  }, []);

  return { pending, noteChange, dismiss, take, clear: () => removeDraft(templateId) };
}
