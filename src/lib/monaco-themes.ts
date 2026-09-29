import type { Monaco } from "@monaco-editor/react";

/**
 * Shared Monaco color themes — single source of truth for every code
 * surface (playground, challenge arenas). Call once in `beforeMount`
 * (defineTheme is idempotent, so sharing is safe):
 *
 *   <Editor beforeMount={defineNanoBananaThemes} theme={isDark ? NBP_DARK : NBP_LIGHT} ... />
 */

export const NBP_DARK = "nano-banana-pro";
export const NBP_LIGHT = "nbp-light";

/**
 * Workbench twins of the NBP themes: identical token hues, but the editor
 * surfaces match the Sandpack workbench (surface1 #171b23 family) instead of
 * pure black — so Monaco surfaces (DSA arena) and the Sandpack CodeMirror
 * surfaces (ReactJS attempts, playgrounds) read as one IDE.
 */
export const WORKBENCH_DARK = "workbench-dark";
export const WORKBENCH_LIGHT = "workbench-light";

/**
 * Playground theme gallery (all dark, `vs-dark` base). Defined alongside the
 * NBP themes so every `beforeMount={defineNanoBananaThemes}` surface gets
 * them for free; the playground toolbar offers them via a picker. Token
 * rules mirror the NBP set (same 11 tokens) with per-theme hues; the colors
 * blocks mirror the NBP key set so no widget falls back to `vs-dark` grey.
 */
export const THEME_COBALT = "ip-cobalt";
export const THEME_DRACULA = "ip-dracula";
export const THEME_MONOKAI = "ip-monokai";
export const THEME_GITHUB_DARK = "ip-github-dark";
export const THEME_AURA = "ip-aura";

export function defineNanoBananaThemes(monaco: Monaco) {
  // Nano Banana Pro Theme Definition
  monaco.editor.defineTheme(NBP_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "D2A8FF" },
      { token: "type", foreground: "D2A8FF" },
      { token: "struct", foreground: "D2A8FF" },
      { token: "interface", foreground: "D2A8FF" },
      { token: "class", foreground: "FB94FF" },
      { token: "string", foreground: "A5D6FF" },
      { token: "number", foreground: "FF9B71" },
      { token: "comment", foreground: "6B7280" },
      { token: "operator", foreground: "79C0FF" },
      { token: "delimiter", foreground: "E0E0E0" },
      { token: "identifier.function", foreground: "FFE600" },
    ],
    colors: {
      "editor.background": "#0A0A0A",
      "editor.foreground": "#E0E0E0",
      "editorLineNumber.foreground": "#2A2A2A",
      "editorLineNumber.activeForeground": "#FFE600",
      "editor.lineHighlightBackground": "#ffffff04",
      "editor.lineHighlightBorder": "#ffffff06",
      "editor.selectionBackground": "#FFE60018",
      "editorCursor.foreground": "#FFE600",
      "editorBracketMatch.background": "#FFE60015",
      "editorBracketMatch.border": "#FFE60030",
      "editorGutter.background": "#0A0A0A",
      "editorWidget.background": "#141414",
      "editorWidget.border": "#ffffff10",
      "editorSuggestWidget.background": "#141414",
      "editorSuggestWidget.border": "#ffffff08",
      "editorSuggestWidget.selectedBackground": "#ffffff0A",
      "editorSuggestWidget.highlightForeground": "#FFE600",
      "editorHoverWidget.background": "#141414",
      "editorHoverWidget.border": "#ffffff08",
      "input.background": "#0E0E0E",
      "input.border": "#ffffff10",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff08",
      "scrollbarSlider.hoverBackground": "#ffffff15",
      "scrollbarSlider.activeBackground": "#FFE60030",
    },
  });

  // Nano Banana Pro Light Theme Definition
  monaco.editor.defineTheme(NBP_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "be185d" },
      { token: "type", foreground: "be185d" },
      { token: "struct", foreground: "be185d" },
      { token: "interface", foreground: "be185d" },
      { token: "class", foreground: "9333ea" },
      { token: "string", foreground: "15803d" },
      { token: "number", foreground: "c2410c" },
      { token: "comment", foreground: "94a3b8" },
      { token: "operator", foreground: "0369a1" },
      { token: "delimiter", foreground: "334155" },
      { token: "identifier.function", foreground: "f87171" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1f2937",
      "editorLineNumber.foreground": "#cbd5e1",
      "editorLineNumber.activeForeground": "#f87171",
      "editor.lineHighlightBackground": "#00000004",
      "editor.lineHighlightBorder": "#00000006",
      "editor.selectionBackground": "#f8717118",
      "editorCursor.foreground": "#f87171",
      "editorBracketMatch.background": "#f8717115",
      "editorBracketMatch.border": "#f8717130",
      "editorGutter.background": "#ffffff",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#00000010",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#00000008",
      "editorSuggestWidget.selectedBackground": "#0000000A",
      "editorSuggestWidget.highlightForeground": "#f87171",
      "editorHoverWidget.background": "#f8fafc",
      "editorHoverWidget.border": "#00000010",
      "input.background": "#f8fafc",
      "input.border": "#00000010",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#00000008",
      "scrollbarSlider.hoverBackground": "#00000015",
      "scrollbarSlider.activeBackground": "#f8717130",
    },
  });

  // Workbench dark — NBP token hues on Sandpack workbench surfaces.
  monaco.editor.defineTheme(WORKBENCH_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "D2A8FF" },
      { token: "type", foreground: "D2A8FF" },
      { token: "struct", foreground: "D2A8FF" },
      { token: "interface", foreground: "D2A8FF" },
      { token: "class", foreground: "FB94FF" },
      { token: "string", foreground: "A5D6FF" },
      { token: "number", foreground: "FF9B71" },
      { token: "comment", foreground: "6B7280" },
      { token: "operator", foreground: "79C0FF" },
      { token: "delimiter", foreground: "E0E0E0" },
      { token: "identifier.function", foreground: "FFE600" },
    ],
    colors: {
      "editor.background": "#171b23",
      "editor.foreground": "#dfe3ea",
      "editorLineNumber.foreground": "#5a6172",
      "editorLineNumber.activeForeground": "#FFE600",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#ffffff0a",
      "editor.selectionBackground": "#FFE60022",
      "editorCursor.foreground": "#FFE600",
      "editorBracketMatch.background": "#FFE60015",
      "editorBracketMatch.border": "#FFE60030",
      "editorGutter.background": "#171b23",
      "editorWidget.background": "#1c212b",
      "editorWidget.border": "#ffffff10",
      "editorSuggestWidget.background": "#1c212b",
      "editorSuggestWidget.border": "#ffffff08",
      "editorSuggestWidget.selectedBackground": "#ffffff0A",
      "editorSuggestWidget.highlightForeground": "#FFE600",
      "editorHoverWidget.background": "#1c212b",
      "editorHoverWidget.border": "#ffffff08",
      "input.background": "#1c212b",
      "input.border": "#ffffff10",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff08",
      "scrollbarSlider.hoverBackground": "#ffffff15",
      "scrollbarSlider.activeBackground": "#FFE60030",
    },
  });

  // Workbench light — NBP light tokens on Sandpack light surfaces.
  monaco.editor.defineTheme(WORKBENCH_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "be185d" },
      { token: "type", foreground: "be185d" },
      { token: "struct", foreground: "be185d" },
      { token: "interface", foreground: "be185d" },
      { token: "class", foreground: "9333ea" },
      { token: "string", foreground: "15803d" },
      { token: "number", foreground: "c2410c" },
      { token: "comment", foreground: "94a3b8" },
      { token: "operator", foreground: "0369a1" },
      { token: "delimiter", foreground: "334155" },
      { token: "identifier.function", foreground: "f87171" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1f2937",
      "editorLineNumber.foreground": "#94a3b8",
      "editorLineNumber.activeForeground": "#f87171",
      "editor.lineHighlightBackground": "#f871710a",
      "editor.lineHighlightBorder": "#00000008",
      "editor.selectionBackground": "#f8717122",
      "editorCursor.foreground": "#f87171",
      "editorBracketMatch.background": "#f8717115",
      "editorBracketMatch.border": "#f8717130",
      "editorGutter.background": "#f8fafc",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#00000010",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#00000008",
      "editorSuggestWidget.selectedBackground": "#f1f5f9",
      "editorSuggestWidget.highlightForeground": "#f87171",
      "editorHoverWidget.background": "#ffffff",
      "editorHoverWidget.border": "#00000010",
      "input.background": "#f8fafc",
      "input.border": "#00000010",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#00000008",
      "scrollbarSlider.hoverBackground": "#00000015",
      "scrollbarSlider.activeBackground": "#f8717130",
    },
  });

  // Cobalt — deep-navy classic: amber keywords, cobalt-yellow functions.
  monaco.editor.defineTheme(THEME_COBALT, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "FF9D00" },
      { token: "type", foreground: "FFC600" },
      { token: "struct", foreground: "FFC600" },
      { token: "interface", foreground: "FFC600" },
      { token: "class", foreground: "FF628C" },
      { token: "string", foreground: "A8FF60" },
      { token: "number", foreground: "F78C6C" },
      { token: "comment", foreground: "5B7A8F", fontStyle: "italic" },
      { token: "operator", foreground: "9EFFFF" },
      { token: "delimiter", foreground: "D6E7F5" },
      { token: "identifier.function", foreground: "FFC600" },
    ],
    colors: {
      "editor.background": "#193549",
      "editor.foreground": "#FFFFFF",
      "editorLineNumber.foreground": "#4B6A88",
      "editorLineNumber.activeForeground": "#FFC600",
      "editor.lineHighlightBackground": "#ffffff0a",
      "editor.lineHighlightBorder": "#ffffff10",
      "editor.selectionBackground": "#FFC60026",
      "editorCursor.foreground": "#FFC600",
      "editorBracketMatch.background": "#FFC60015",
      "editorBracketMatch.border": "#FFC60040",
      "editorGutter.background": "#193549",
      "editorWidget.background": "#1C3A55",
      "editorWidget.border": "#ffffff12",
      "editorSuggestWidget.background": "#1C3A55",
      "editorSuggestWidget.border": "#ffffff0a",
      "editorSuggestWidget.selectedBackground": "#ffffff12",
      "editorSuggestWidget.highlightForeground": "#FFC600",
      "editorHoverWidget.background": "#1C3A55",
      "editorHoverWidget.border": "#ffffff0a",
      "input.background": "#14324C",
      "input.border": "#ffffff12",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff10",
      "scrollbarSlider.hoverBackground": "#ffffff18",
      "scrollbarSlider.activeBackground": "#FFC60040",
    },
  });

  // Dracula — official palette: pink keywords, green functions, purple numbers.
  monaco.editor.defineTheme(THEME_DRACULA, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "FF79C6" },
      { token: "type", foreground: "8BE9FD" },
      { token: "struct", foreground: "8BE9FD" },
      { token: "interface", foreground: "8BE9FD" },
      { token: "class", foreground: "8BE9FD" },
      { token: "string", foreground: "F1FA8C" },
      { token: "number", foreground: "BD93F9" },
      { token: "comment", foreground: "6272A4", fontStyle: "italic" },
      { token: "operator", foreground: "FF79C6" },
      { token: "delimiter", foreground: "F8F8F2" },
      { token: "identifier.function", foreground: "50FA7B" },
    ],
    colors: {
      "editor.background": "#282A36",
      "editor.foreground": "#F8F8F2",
      "editorLineNumber.foreground": "#6272A4",
      "editorLineNumber.activeForeground": "#F8F8F2",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#ffffff0a",
      "editor.selectionBackground": "#44475A",
      "editorCursor.foreground": "#F8F8F2",
      "editorBracketMatch.background": "#BD93F925",
      "editorBracketMatch.border": "#BD93F950",
      "editorGutter.background": "#282A36",
      "editorWidget.background": "#21222C",
      "editorWidget.border": "#ffffff10",
      "editorSuggestWidget.background": "#21222C",
      "editorSuggestWidget.border": "#ffffff0a",
      "editorSuggestWidget.selectedBackground": "#44475A",
      "editorSuggestWidget.highlightForeground": "#8BE9FD",
      "editorHoverWidget.background": "#21222C",
      "editorHoverWidget.border": "#ffffff0a",
      "input.background": "#21222C",
      "input.border": "#ffffff10",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff10",
      "scrollbarSlider.hoverBackground": "#ffffff18",
      "scrollbarSlider.activeBackground": "#BD93F950",
    },
  });

  // Monokai — warm classic: hot-pink keywords, lime functions, dim comments.
  monaco.editor.defineTheme(THEME_MONOKAI, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "F92672" },
      { token: "type", foreground: "66D9EF" },
      { token: "struct", foreground: "66D9EF" },
      { token: "interface", foreground: "66D9EF" },
      { token: "class", foreground: "A6E22E" },
      { token: "string", foreground: "E6DB74" },
      { token: "number", foreground: "AE81FF" },
      { token: "comment", foreground: "75715E" },
      { token: "operator", foreground: "F92672" },
      { token: "delimiter", foreground: "F8F8F2" },
      { token: "identifier.function", foreground: "A6E22E" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#F8F8F2",
      "editorLineNumber.foreground": "#75715E",
      "editorLineNumber.activeForeground": "#F8F8F0",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#ffffff0a",
      "editor.selectionBackground": "#49483E",
      "editorCursor.foreground": "#F8F8F0",
      "editorBracketMatch.background": "#A6E22E20",
      "editorBracketMatch.border": "#A6E22E40",
      "editorGutter.background": "#272822",
      "editorWidget.background": "#1E1F1C",
      "editorWidget.border": "#ffffff10",
      "editorSuggestWidget.background": "#1E1F1C",
      "editorSuggestWidget.border": "#ffffff0a",
      "editorSuggestWidget.selectedBackground": "#49483E",
      "editorSuggestWidget.highlightForeground": "#A6E22E",
      "editorHoverWidget.background": "#1E1F1C",
      "editorHoverWidget.border": "#ffffff0a",
      "input.background": "#1E1F1C",
      "input.border": "#ffffff10",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff08",
      "scrollbarSlider.hoverBackground": "#ffffff15",
      "scrollbarSlider.activeBackground": "#A6E22E40",
    },
  });

  // GitHub Dark — primer-inspired: red keywords, blue strings, purple calls.
  monaco.editor.defineTheme(THEME_GITHUB_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "FF7B72" },
      { token: "type", foreground: "FFA657" },
      { token: "struct", foreground: "FFA657" },
      { token: "interface", foreground: "FFA657" },
      { token: "class", foreground: "FFA657" },
      { token: "string", foreground: "A5D6FF" },
      { token: "number", foreground: "79C0FF" },
      { token: "comment", foreground: "8B949E", fontStyle: "italic" },
      { token: "operator", foreground: "FF7B72" },
      { token: "delimiter", foreground: "E6EDF3" },
      { token: "identifier.function", foreground: "D2A8FF" },
    ],
    colors: {
      "editor.background": "#0D1117",
      "editor.foreground": "#E6EDF3",
      "editorLineNumber.foreground": "#484F58",
      "editorLineNumber.activeForeground": "#E6EDF3",
      "editor.lineHighlightBackground": "#ffffff06",
      "editor.lineHighlightBorder": "#ffffff08",
      "editor.selectionBackground": "#264F78",
      "editorCursor.foreground": "#58A6FF",
      "editorBracketMatch.background": "#58A6FF20",
      "editorBracketMatch.border": "#58A6FF40",
      "editorGutter.background": "#0D1117",
      "editorWidget.background": "#161B22",
      "editorWidget.border": "#30363D",
      "editorSuggestWidget.background": "#161B22",
      "editorSuggestWidget.border": "#30363D",
      "editorSuggestWidget.selectedBackground": "#1F6FEB44",
      "editorSuggestWidget.highlightForeground": "#58A6FF",
      "editorHoverWidget.background": "#161B22",
      "editorHoverWidget.border": "#30363D",
      "input.background": "#0D1117",
      "input.border": "#30363D",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#6E768133",
      "scrollbarSlider.hoverBackground": "#6E768155",
      "scrollbarSlider.activeBackground": "#58A6FF66",
    },
  });

  // Aura — bespoke Interviewpad theme: brand indigo keywords, cyan calls,
  // magenta classes on the pane surface, so the editor melts into the IDE.
  monaco.editor.defineTheme(THEME_AURA, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "8B93FF" },
      { token: "type", foreground: "AAB0FF" },
      { token: "struct", foreground: "AAB0FF" },
      { token: "interface", foreground: "AAB0FF" },
      { token: "class", foreground: "FF2FB3" },
      { token: "string", foreground: "7EE0A3" },
      { token: "number", foreground: "FFA94D" },
      { token: "comment", foreground: "5B6478", fontStyle: "italic" },
      { token: "operator", foreground: "8B93FF" },
      { token: "delimiter", foreground: "C6CBD8" },
      { token: "identifier.function", foreground: "22D3EE" },
    ],
    colors: {
      "editor.background": "#0D0F16",
      "editor.foreground": "#E8EAF2",
      "editorLineNumber.foreground": "#454C68",
      "editorLineNumber.activeForeground": "#FFFFFF",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#ffffff0a",
      "editor.selectionBackground": "#8B93FF33",
      "editorCursor.foreground": "#8B93FF",
      "editorBracketMatch.background": "#8B93FF1A",
      "editorBracketMatch.border": "#8B93FF45",
      "editorGutter.background": "#0D0F16",
      "editorWidget.background": "#12141F",
      "editorWidget.border": "#ffffff10",
      "editorSuggestWidget.background": "#12141F",
      "editorSuggestWidget.border": "#ffffff0a",
      "editorSuggestWidget.selectedBackground": "#8B93FF26",
      "editorSuggestWidget.highlightForeground": "#AAB0FF",
      "editorHoverWidget.background": "#12141F",
      "editorHoverWidget.border": "#ffffff0a",
      "input.background": "#12141F",
      "input.border": "#ffffff10",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff08",
      "scrollbarSlider.hoverBackground": "#ffffff15",
      "scrollbarSlider.activeBackground": "#8B93FF45",
    },
  });
}
