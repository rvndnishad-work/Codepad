/**
 * Public-page layout contract for a CreatorSpace. Stored as JSON on
 * `CreatorSpace.layout` and read by both the studio's layout editor and the
 * public page so they agree on a default when no layout has been saved yet.
 */

/** Content sections a creator can order / show / hide on their public page. */
export const SECTION_KEYS = [
  "ABOUT",
  "MEMBERSHIP",
  "TUTORIAL",
  "INTERVIEW_QA",
  "INTERVIEW_EXPERIENCE",
  "CHALLENGE",
  "SNIPPET",
  "BLOG_POST",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export type HeroStyle = "banner" | "minimal";
export type Alignment = "left" | "center" | "right";
export type Theme = "slate" | "glassmorphism" | "neon" | "minimalist";

export type LayoutSection = { key: SectionKey; visible: boolean; cols: number };

export type SpaceLayout = {
  heroStyle: HeroStyle;
  alignment: Alignment;
  theme: Theme;
  sections: LayoutSection[];
};

/** Default column width (out of 12) per section type. */
export const DEFAULT_SECTION_COLS: Record<SectionKey, number> = {
  ABOUT: 4,
  MEMBERSHIP: 4,
  TUTORIAL: 8,
  INTERVIEW_QA: 6,
  INTERVIEW_EXPERIENCE: 6,
  CHALLENGE: 12,
  SNIPPET: 6,
  BLOG_POST: 6,
};

/** Human label per section, shared by the editor + public page. */
export const SECTION_LABELS: Record<SectionKey, string> = {
  ABOUT: "About Me (About Section)",
  MEMBERSHIP: "Membership Subscription Tiers",
  TUTORIAL: "Tutorials",
  INTERVIEW_QA: "Interview Prep",
  INTERVIEW_EXPERIENCE: "Interview Experiences",
  CHALLENGE: "Challenges",
  SNIPPET: "Playgrounds",
  BLOG_POST: "Blog",
};

export const DEFAULT_LAYOUT: SpaceLayout = {
  heroStyle: "banner",
  alignment: "left",
  theme: "slate",
  sections: SECTION_KEYS.map((key) => ({ key, visible: true, cols: DEFAULT_SECTION_COLS[key] })),
};

const isSectionKey = (v: unknown): v is SectionKey =>
  typeof v === "string" && (SECTION_KEYS as readonly string[]).includes(v);

/**
 * Coerce arbitrary stored JSON into a valid SpaceLayout: keeps the saved order,
 * drops unknown/duplicate keys, appends any missing sections (visible) in
 * canonical order, and falls back to sensible defaults.
 */
export function normalizeLayout(raw: unknown): SpaceLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT;

  const obj = raw as { heroStyle?: unknown; alignment?: unknown; theme?: unknown; sections?: unknown };
  const heroStyle: HeroStyle = obj.heroStyle === "minimal" ? "minimal" : "banner";
  const alignment: Alignment = ["left", "center", "right"].includes(obj.alignment as string)
    ? (obj.alignment as Alignment)
    : "left";
  const theme: Theme = ["slate", "glassmorphism", "neon", "minimalist"].includes(obj.theme as string)
    ? (obj.theme as Theme)
    : "slate";

  const seen = new Set<SectionKey>();
  const sections: LayoutSection[] = [];

  if (Array.isArray(obj.sections)) {
    for (const s of obj.sections) {
      const key = (s as { key?: unknown })?.key;
      if (!isSectionKey(key) || seen.has(key)) continue;
      seen.add(key);
      const rawCols = (s as { cols?: unknown })?.cols;
      const cols = typeof rawCols === "number" && rawCols >= 1 && rawCols <= 12
        ? rawCols
        : DEFAULT_SECTION_COLS[key];
      sections.push({
        key,
        visible: (s as { visible?: unknown })?.visible !== false,
        cols,
      });
    }
  }

  // Append any sections not present in the stored layout (newly added types).
  for (const key of SECTION_KEYS) {
    if (!seen.has(key)) {
      sections.push({
        key,
        visible: true,
        cols: DEFAULT_SECTION_COLS[key],
      });
    }
  }

  return { heroStyle, alignment, theme, sections };
}
