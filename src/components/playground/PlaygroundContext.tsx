"use client";

import { createContext, useContext } from "react";
import type { EditorPrefs } from "./useEditorPrefs";
import type { PlaygroundDoc, Snippet } from "./usePlaygroundDoc";

export type ViewMode = "preview" | "console" | "both" | "columns";

/**
 * What the toolbar (and anything else outside the pane tree) needs from the
 * playground. Provided once by Playground so the toolbar reads state instead
 * of taking dozens of loosely typed props.
 */
export type PlaygroundContextValue = {
  templateId: string;
  templateTitle: string;
  /** "console" templates have no preview to switch to. */
  templateMode?: string;
  isBackend: boolean;
  signedIn: boolean;
  editable: boolean;
  snippet?: Snippet | null;
  backHref?: string;
  isMobile: boolean;
  doc: PlaygroundDoc;
  prefs: EditorPrefs;
  running: boolean;
  run: () => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  toggleFiles: () => void;
  togglePrompt: () => void;
  /** Copy a /play link that carries the current files in its hash. */
  copyCodeLink: () => void;
  openShortcuts: () => void;
};

const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

export const PlaygroundProvider = PlaygroundContext.Provider;

export function usePlayground(): PlaygroundContextValue {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) throw new Error("usePlayground must be used inside PlaygroundProvider");
  return ctx;
}
