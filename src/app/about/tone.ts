import type { BrandKey } from "@/lib/brand";

/**
 * Per-brand colour vocabulary for the About page. Tailwind needs literal
 * class strings, so each brand maps to a full set up front: DevPrep keeps its
 * yellow accent, Intervutree the indigo its landing page uses.
 */
export type Tone = {
  key: BrandKey;
  text: string;
  tile: string;
  tileHover: string;
  border: string;
  gradient: string;
  bar: string;
  dot: string;
  pulse: string;
  pulseGlow: string;
  blobA: string;
  blobB: string;
};

export const TONES: Record<BrandKey, Tone> = {
  devprep: {
    key: "devprep",
    text: "text-accent",
    tile: "bg-accent/10 text-accent",
    tileHover: "group-hover:bg-accent/20",
    border: "hover:border-accent/60",
    gradient: "wow-gradient-text",
    bar: "bg-accent",
    dot: "bg-accent",
    pulse: "rgb(var(--c-accent-fill))",
    pulseGlow: "rgb(var(--c-accent-fill) / 0.55)",
    blobA: "bg-accent/40",
    blobB: "bg-accent-3/30",
  },
  intervutree: {
    key: "intervutree",
    text: "text-secondary",
    tile: "bg-secondary/10 text-secondary",
    tileHover: "group-hover:bg-secondary/20",
    border: "hover:border-secondary/60",
    gradient: "wow-gradient-boss",
    bar: "bg-secondary",
    dot: "bg-secondary",
    pulse: "rgb(var(--c-accent-2-fill))",
    pulseGlow: "rgb(var(--c-accent-2-fill) / 0.55)",
    blobA: "bg-secondary/40",
    blobB: "bg-accent-4/30",
  },
};
