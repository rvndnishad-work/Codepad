import { describe, expect, it, vi } from "vitest";
import {
  EDITOR_THEMES,
  DEFAULT_EDITOR_THEME_ID,
  editorThemeById,
} from "@/lib/editor-themes";
import { defineNanoBananaThemes } from "@/lib/monaco-themes";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Every color block must paint a complete editor — no vs-dark fallbacks. */
const CORE_COLOR_KEYS = [
  "editor.background",
  "editor.foreground",
  "editorLineNumber.foreground",
  "editorLineNumber.activeForeground",
  "editor.selectionBackground",
  "editorCursor.foreground",
  "editorBracketMatch.background",
  "editorBracketMatch.border",
  "editorGutter.background",
  "editorWidget.background",
  "editorSuggestWidget.background",
  "editorSuggestWidget.selectedBackground",
  "editorHoverWidget.background",
  "input.background",
] as const;

type DefinedTheme = {
  base: string;
  inherit: boolean;
  rules: Array<{ token: string; foreground: string; fontStyle?: string }>;
  colors: Record<string, string>;
};

function captureDefinedThemes(): Map<string, DefinedTheme> {
  const defined = new Map<string, DefinedTheme>();
  const monaco = {
    editor: {
      defineTheme: vi.fn((name: string, data: DefinedTheme) => {
        defined.set(name, data);
      }),
    },
  };
  defineNanoBananaThemes(monaco as never);
  return defined;
}

describe("editor theme gallery", () => {
  it("catalog has unique ids, labels, and valid swatches", () => {
    expect(EDITOR_THEMES.length).toBeGreaterThan(1);
    expect(new Set(EDITOR_THEMES.map((t) => t.id)).size).toBe(
      EDITOR_THEMES.length,
    );
    expect(new Set(EDITOR_THEMES.map((t) => t.monaco)).size).toBe(
      EDITOR_THEMES.length,
    );
    for (const t of EDITOR_THEMES) {
      expect(t.label).toBeTruthy();
      expect(t.blurb).toBeTruthy();
      expect(t.swatch).toHaveLength(3);
      for (const c of t.swatch) expect(c).toMatch(HEX);
    }
  });

  it("default resolves, unknowns fall back to it", () => {
    expect(editorThemeById(DEFAULT_EDITOR_THEME_ID).id).toBe(
      DEFAULT_EDITOR_THEME_ID,
    );
    expect(editorThemeById("nope").id).toBe(DEFAULT_EDITOR_THEME_ID);
    expect(editorThemeById(null).id).toBe(DEFAULT_EDITOR_THEME_ID);
    expect(editorThemeById(undefined).id).toBe(DEFAULT_EDITOR_THEME_ID);
    expect(editorThemeById("cobalt")).toBe(
      EDITOR_THEMES.find((t) => t.id === "cobalt"),
    );
  });

  it("every catalog theme is registered as a dark Monaco theme", () => {
    const defined = captureDefinedThemes();
    for (const t of EDITOR_THEMES) {
      const data = defined.get(t.monaco);
      expect(data, `${t.id} (${t.monaco}) must be defined`).toBeDefined();
      expect(data!.base).toBe("vs-dark");
      expect(data!.inherit).toBe(true);
      expect(data!.rules.length).toBeGreaterThan(0);
    }
  });

  it("every gallery theme paints the full color set", () => {
    const defined = captureDefinedThemes();
    for (const t of EDITOR_THEMES) {
      const data = defined.get(t.monaco)!;
      for (const key of CORE_COLOR_KEYS) {
        expect(data.colors[key], `${t.id} missing ${key}`).toBeTruthy();
      }
      const tokens = new Set(data.rules.map((r) => r.token));
      for (const token of ["keyword", "string", "comment", "identifier.function"]) {
        expect(tokens.has(token), `${t.id} missing ${token} rule`).toBe(true);
      }
    }
  });
});
