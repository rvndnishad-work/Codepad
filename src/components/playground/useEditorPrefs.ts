"use client";

import { useEffect, useState } from "react";
import { DEFAULT_EDITOR_THEME_ID, editorThemeById } from "@/lib/editor-themes";
import {
  PREF_KEYS,
  readBoolPref,
  readNumberPref,
  readPref,
  writeBoolPref,
  writePref,
} from "@/lib/prefs";

export type EditorPrefs = ReturnType<typeof useEditorPrefs>;

/**
 * Persisted editor settings, all through lib/prefs so every read and write
 * survives private mode. Values load after mount: the playground renders
 * client-only, but reading in an effect keeps the first render stable.
 */
export function useEditorPrefs() {
  const [fontSize, setFontSize] = useState(14);
  const [autoRun, setAutoRun] = useState(true);
  // Format-on-save is opt-in (default off): rewriting code on save must be
  // the user's explicit choice, never a surprise.
  const [formatOnSave, setFormatOnSave] = useState(false);
  // Gallery theme for the Monaco panes, validated against the catalog so a
  // stale or foreign stored id falls back to the default.
  const [editorThemeId, setEditorThemeId] = useState<string>(() =>
    typeof window === "undefined"
      ? DEFAULT_EDITOR_THEME_ID
      : editorThemeById(readPref(PREF_KEYS.editorTheme)).id,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFontSize(readNumberPref(PREF_KEYS.fontSize, 14, 10, 32));
    setAutoRun(readBoolPref(PREF_KEYS.autoRun, true));
    setFormatOnSave(readBoolPref(PREF_KEYS.formatOnSave, false));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writePref(PREF_KEYS.fontSize, String(fontSize));
  }, [fontSize, loaded]);
  useEffect(() => {
    // "true"/"false" keeps the historical value format for this key.
    if (loaded) writePref(PREF_KEYS.autoRun, String(autoRun));
  }, [autoRun, loaded]);
  useEffect(() => {
    if (loaded) writeBoolPref(PREF_KEYS.formatOnSave, formatOnSave);
  }, [formatOnSave, loaded]);
  useEffect(() => {
    writePref(PREF_KEYS.editorTheme, editorThemeId);
  }, [editorThemeId]);

  return {
    fontSize,
    setFontSize,
    autoRun,
    setAutoRun,
    formatOnSave,
    setFormatOnSave,
    editorThemeId,
    setEditorThemeId,
  };
}
