import { z } from "zod";

/**
 * Design token set for a CreatorSpace. Stored on `CreatorSpace.styles` when a
 * creator customizes; absent means "use preset defaults (slate in light, dark
 * inherits globals)". All values are validated on write via `tokenSetSchema`.
 */
export type TokenSet = {
  accent: string; // hex color, e.g. "#FFE600"
  accentSoft: string; // lighter tint derived, hex
  radius: number; // px base radius multiplier 0..24
  font: { heading: string; body: string; mono: string };
  density: "compact" | "cozy" | "comfortable";
  card: "soft" | "outlined" | "ghost";
  surface: "solid" | "glass" | "elevated";
};

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex color #rrggbb");

export const tokenSetSchema = z.object({
  accent: hexColor,
  accentSoft: hexColor,
  radius: z.number().min(0).max(24),
  font: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
    mono: z.string().min(1),
  }),
  density: z.enum(["compact", "cozy", "comfortable"]),
  card: z.enum(["soft", "outlined", "ghost"]),
  surface: z.enum(["solid", "glass", "elevated"]),
});

export type TokenPresetKey =
  | "slate"
  | "glassmorphism"
  | "neon"
  | "minimalist"
  | "editorial"
  | "paper"
  | "midnight"
  | "aurora";

export const TOKEN_PRESETS: Record<TokenPresetKey, TokenSet> = {
  slate: {
    accent: "#FFE600",
    accentSoft: "#FFD700",
    radius: 16,
    font: { heading: "Inter", body: "Inter", mono: "Fira Code" },
    density: "cozy",
    card: "soft",
    surface: "solid",
  },
  glassmorphism: {
    accent: "#7C3AED",
    accentSoft: "#A78BFA",
    radius: 20,
    font: { heading: "Inter", body: "Inter", mono: "Fira Code" },
    density: "comfortable",
    card: "soft",
    surface: "glass",
  },
  neon: {
    accent: "#45F3FF",
    accentSoft: "#22D3EE",
    radius: 8,
    font: { heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    density: "compact",
    card: "outlined",
    surface: "solid",
  },
  minimalist: {
    accent: "#111827",
    accentSoft: "#6B7280",
    radius: 0,
    font: { heading: "Inter", body: "Inter", mono: "Fira Code" },
    density: "cozy",
    card: "ghost",
    surface: "solid",
  },
  editorial: {
    accent: "#BE123C",
    accentSoft: "#FB7185",
    radius: 12,
    font: { heading: "Playfair Display", body: "Inter", mono: "Fira Code" },
    density: "comfortable",
    card: "soft",
    surface: "elevated",
  },
  paper: {
    accent: "#B45309",
    accentSoft: "#F59E0B",
    radius: 14,
    font: { heading: "Merriweather", body: "Inter", mono: "Fira Code" },
    density: "comfortable",
    card: "soft",
    surface: "solid",
  },
  midnight: {
    accent: "#6366F1",
    accentSoft: "#818CF8",
    radius: 18,
    font: { heading: "Inter", body: "Inter", mono: "Fira Code" },
    density: "cozy",
    card: "soft",
    surface: "elevated",
  },
  aurora: {
    accent: "#10B981",
    accentSoft: "#34D399",
    radius: 16,
    font: { heading: "Inter", body: "Inter", mono: "Fira Code" },
    density: "cozy",
    card: "soft",
    surface: "glass",
  },
};

export const TOKEN_PRESET_KEYS = Object.keys(TOKEN_PRESETS) as TokenPresetKey[];

/**
 * Validate arbitrary stored JSON into a TokenSet. Returns null when invalid
 * so callers can fall back to preset defaults.
 */
export function normalizeTokenSet(raw: unknown): TokenSet | null {
  const parsed = tokenSetSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Convert a TokenSet into CSS variable overrides for injection on the public
 * page root. Hex colors are also emitted as `*-rgb` triplet for
 * `rgba(var(--accent-rgb), ...)` usages.
 */
export function tokenSetToCssVars(tokens: TokenSet): Record<string, string> {
  const accentRgb = hexToRgbTriplet(tokens.accent);
  const accentSoftRgb = hexToRgbTriplet(tokens.accentSoft);
  return {
    "--accent": tokens.accent,
    "--accent-rgb": accentRgb,
    "--accent-soft": tokens.accentSoft,
    "--accent-soft-rgb": accentSoftRgb,
    "--accent-glow": `rgba(${accentRgb}, 0.15)`,
    "--radius-base": `${tokens.radius}px`,
    "--density": tokens.density,
    "--card-style": tokens.card,
    "--surface-style": tokens.surface,
  };
}

function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r}, ${g}, ${b}`;
}

/**
 * WCAG relative luminance helper for a hex color — used by the picker to
 * surface contrast badges without pulling a heavy color lib.
 */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = luminance(hexA) + 0.05;
  const l2 = luminance(hexB) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
}
