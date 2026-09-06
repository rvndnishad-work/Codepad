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
}
