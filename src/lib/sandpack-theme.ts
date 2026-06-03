/**
 * Single source of truth for the Sandpack editor/preview color scheme used
 * across every Sandpack surface — the developer playground (/play), the
 * collaborative interview playground, the challenge attempt surface, and the
 * interviewer review surfaces — so they all look identical in dark and light.
 */

export const nbpDarkTheme = {
  colors: {
    // Softer, eye-friendly dark surfaces (was near-black #050505, which caused
    // halation against bright text). Tinted to match the IDE chrome (#0a0b10).
    surface1: "#171b23",
    surface2: "#1c212b",
    surface3: "#232934",
    clickable: "#8b949e",
    base: "#dfe3ea",
    disabled: "#5a6172",
    hover: "#FFE600",
    accent: "#FFE600",
    error: "#ff6b6b",
    errorSurface: "#2a1416",
  },
  syntax: {
    plain: "#e0e0e0",
    comment: { color: "#6b7280", fontStyle: "italic" as const },
    keyword: "#D2A8FF",
    tag: "#D2A8FF",
    punctuation: "#e0e0e0",
    definition: "#FFE600",
    property: "#FFE600",
    static: "#FF9B71",
    string: "#A5D6FF",
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'var(--font-mono), "Fira Code", monospace',
    size: "14px",
    lineHeight: "1.6",
  },
};

export const nbpLightTheme = {
  colors: {
    surface1: "#ffffff",
    surface2: "#f8fafc",
    surface3: "#f1f5f9",
    clickable: "#64748b",
    base: "#1f2937",
    disabled: "#94a3b8",
    hover: "#f87171",
    accent: "#f87171",
    error: "#ef4444",
    errorSurface: "#fef2f2",
  },
  syntax: {
    plain: "#1f2937",
    comment: { color: "#94a3b8", fontStyle: "italic" as const },
    keyword: "#be185d",
    tag: "#be185d",
    punctuation: "#64748b",
    definition: "#0369a1",
    property: "#92400e",
    static: "#c2410c",
    string: "#15803d",
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'var(--font-mono), "Fira Code", monospace',
    size: "14px",
    lineHeight: "1.6",
  },
};

export function getSandpackTheme(isDark: boolean) {
  return isDark ? nbpDarkTheme : nbpLightTheme;
}
