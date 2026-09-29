import {
  NBP_DARK,
  THEME_AURA,
  THEME_COBALT,
  THEME_DRACULA,
  THEME_GITHUB_DARK,
  THEME_MONOKAI,
} from "./monaco-themes";

/**
 * Playground editor theme gallery — the catalog behind the toolbar theme
 * picker. `monaco` is the theme id registered in `defineNanoBananaThemes`;
 * `swatch` paints the picker's three-dot preview (surface, keyword, call).
 * Dark surfaces only: the IDE chrome is dark-first, so in light mode the
 * editor keeps the stock light theme regardless of selection.
 */

export type EditorThemeDef = {
  id: string;
  label: string;
  blurb: string;
  monaco: string;
  swatch: [string, string, string];
};

export const EDITOR_THEMES: EditorThemeDef[] = [
  {
    id: "nano-banana",
    label: "Nano Banana",
    blurb: "House theme — violet keys, yellow calls",
    monaco: NBP_DARK,
    swatch: ["#0A0A0A", "#D2A8FF", "#FFE600"],
  },
  {
    id: "aura",
    label: "Aura",
    blurb: "Bespoke — brand indigo on pane surfaces",
    monaco: THEME_AURA,
    swatch: ["#0D0F16", "#8B93FF", "#22D3EE"],
  },
  {
    id: "cobalt",
    label: "Cobalt",
    blurb: "Deep-navy classic — amber keys, yellow calls",
    monaco: THEME_COBALT,
    swatch: ["#193549", "#FF9D00", "#FFC600"],
  },
  {
    id: "dracula",
    label: "Dracula",
    blurb: "Pink keys, green calls, purple numbers",
    monaco: THEME_DRACULA,
    swatch: ["#282A36", "#FF79C6", "#50FA7B"],
  },
  {
    id: "monokai",
    label: "Monokai",
    blurb: "Warm classic — hot-pink keys, lime calls",
    monaco: THEME_MONOKAI,
    swatch: ["#272822", "#F92672", "#A6E22E"],
  },
  {
    id: "github-dark",
    label: "GitHub Dark",
    blurb: "Primer-inspired — red keys, blue strings",
    monaco: THEME_GITHUB_DARK,
    swatch: ["#0D1117", "#FF7B72", "#D2A8FF"],
  },
];

export const DEFAULT_EDITOR_THEME_ID = "nano-banana";

export function editorThemeById(id: string | null | undefined): EditorThemeDef {
  return EDITOR_THEMES.find((t) => t.id === id) ?? EDITOR_THEMES[0];
}
