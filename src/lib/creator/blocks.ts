import { z } from "zod";
import {
  DEFAULT_SECTION_COLS,
  SECTION_KEYS,
  type Alignment,
  type HeroStyle,
  type SectionKey,
  type SpaceLayout,
  type Theme,
  normalizeLayout,
} from "./layout";

/**
 * Block engine — the Stage 1 canonical shape that will ultimately replace
 * SpaceLayout.flat. Public page prefers `blocks` when present; `normalizeLayout`
 * is retained as an adapter for legacy rows (see normalizeBlocks).
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type BlockType =
  | SectionKey
  | "HERO"
  | "CTA"
  | "GALLERY"
  | "FAQ"
  | "TESTIMONIAL"
  | "NEWSLETTER"
  | "EMBED";

export const BLOCK_TYPES: readonly BlockType[] = [
  ...SECTION_KEYS,
  "HERO",
  "CTA",
  "GALLERY",
  "FAQ",
  "TESTIMONIAL",
  "NEWSLETTER",
  "EMBED",
] as const;

export type Block = {
  id: string;
  type: BlockType;
  /** Free-form props per type (validated by blockSchema when written). */
  props: Record<string, unknown>;
  cols: number;
  visible: boolean;
  /** Null = free, number = minimum SpaceTier.rank required. */
  tierGate?: number | null;
};

export type HeroProps = {
  heroStyle: HeroStyle;
  alignment: Alignment;
  theme: Theme;
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

export type SpaceBlocksDoc = {
  hero: HeroProps;
  blocks: Block[];
};

// ── Zod ─────────────────────────────────────────────────────────────────────

const heroSchema = z.object({
  heroStyle: z.enum(["banner", "minimal"]),
  alignment: z.enum(["left", "center", "right"]),
  theme: z.enum(["slate", "glassmorphism", "neon", "minimalist"]),
  avatarUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
});

export const blockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().refine((v) => (BLOCK_TYPES as readonly string[]).includes(v), {
    message: "Unknown block type",
  }),
  props: z.record(z.unknown()).default({}),
  cols: z.number().int().min(1).max(12),
  visible: z.boolean(),
  tierGate: z.number().int().min(0).nullable().optional(),
});

export const blocksDocSchema = z.object({
  hero: heroSchema,
  blocks: z.array(blockSchema).max(64),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const isBlockType = (v: unknown): v is BlockType =>
  typeof v === "string" && (BLOCK_TYPES as readonly string[]).includes(v);

function clampCols(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 12 ? Math.round(n) : fallback;
}

function makeBlockId(key: string): string {
  // stable within a migration run; editors use nanoid for new blocks
  return `blk_${key.toLowerCase()}`;
}

// ── Normalizers ─────────────────────────────────────────────────────────────

/**
 * Coerce arbitrary stored `blocks` JSON + legacy `layout` fallback into a valid
 * SpaceBlocksDoc. Rules:
 *  - If `blocks` is a valid SpaceBlocksDoc, return it (deduped, validated).
 *  - If `blocks` is invalid/absent but legacy `layout` exists, migrate it.
 *  - Otherwise return a doc derived from DEFAULT_LAYOUT.
 * Never throws — always returns a renderable doc.
 */
export function normalizeBlocks(rawBlocks: unknown, legacyLayout: unknown): SpaceBlocksDoc {
  // Try blocks first
  if (rawBlocks && typeof rawBlocks === "object") {
    const parsed = tryParseBlocksDoc(rawBlocks);
    if (parsed) return parsed;
  }

  // Fallback: migrate legacy layout
  const layout: SpaceLayout = normalizeLayout(legacyLayout);
  return layoutToBlocksDoc(layout);
}

function tryParseBlocksDoc(raw: unknown): SpaceBlocksDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { hero?: unknown; blocks?: unknown };
  if (!obj.hero || typeof obj.hero !== "object" || !Array.isArray(obj.blocks)) return null;

  const heroRaw = obj.hero as Record<string, unknown>;
  const heroStyle: HeroStyle = heroRaw.heroStyle === "minimal" ? "minimal" : "banner";
  const alignment: Alignment = ["left", "center", "right"].includes(heroRaw.alignment as string)
    ? (heroRaw.alignment as Alignment)
    : "left";
  const theme: Theme = ["slate", "glassmorphism", "neon", "minimalist"].includes(heroRaw.theme as string)
    ? (heroRaw.theme as Theme)
    : "slate";

  const hero: HeroProps = {
    heroStyle,
    alignment,
    theme,
    avatarUrl: typeof heroRaw.avatarUrl === "string" ? heroRaw.avatarUrl : null,
    coverUrl: typeof heroRaw.coverUrl === "string" ? heroRaw.coverUrl : null,
  };

  const seen = new Set<string>();
  const blocks: Block[] = [];
  for (const b of obj.blocks as unknown[]) {
    if (!b || typeof b !== "object") continue;
    const rec = b as Record<string, unknown>;
    const type = rec.type as unknown;
    if (!isBlockType(type)) continue;
    const idRaw = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : makeBlockId(type);
    if (seen.has(idRaw)) continue;
    seen.add(idRaw);
    blocks.push({
      id: idRaw,
      type,
      props: rec.props && typeof rec.props === "object" ? (rec.props as Record<string, unknown>) : {},
      cols: clampCols(rec.cols, DEFAULT_SECTION_COLS[type as SectionKey] ?? 12),
      visible: rec.visible !== false,
      tierGate: typeof rec.tierGate === "number" && Number.isFinite(rec.tierGate) ? rec.tierGate : null,
    });
  }

  // Append missing SectionKey blocks that were not in the persisted doc
  // (new section types introduced after the doc was saved).
  for (const key of SECTION_KEYS) {
    const already = blocks.some((b) => b.type === key);
    if (!already) {
      blocks.push({
        id: makeBlockId(key),
        type: key,
        props: {},
        cols: DEFAULT_SECTION_COLS[key],
        visible: true,
        tierGate: null,
      });
    }
  }

  return { hero, blocks };
}

/**
 * Convert a normalized SpaceLayout into the equivalent SpaceBlocksDoc.
 * Preserves section order and visibility; invents stable ids.
 */
export function layoutToBlocksDoc(layout: SpaceLayout): SpaceBlocksDoc {
  const hero: HeroProps = {
    heroStyle: layout.heroStyle,
    alignment: layout.alignment,
    theme: layout.theme,
  };
  const blocks: Block[] = layout.sections.map((s) => ({
    id: makeBlockId(s.key),
    type: s.key,
    props: {},
    cols: clampCols(s.cols, DEFAULT_SECTION_COLS[s.key]),
    visible: s.visible,
    tierGate: null,
  }));
  return { hero, blocks };
}

/**
 * Serialize a SpaceBlocksDoc for storage (validates via Zod). Throws on
 * invalid shape so bad writes never reach the DB.
 */
export function serializeBlocksDoc(doc: SpaceBlocksDoc): SpaceBlocksDoc {
  return blocksDocSchema.parse(doc) as SpaceBlocksDoc;
}

/**
 * Convenience: derive a SpaceLayout view from a SpaceBlocksDoc for code that
 * still consumes the legacy shape (SpaceFeed etc.). Drops non-section blocks.
 */
export function blocksDocToLayout(doc: SpaceBlocksDoc): SpaceLayout {
  const sectionBlocks = doc.blocks.filter((b) => (SECTION_KEYS as readonly string[]).includes(b.type));
  return {
    heroStyle: doc.hero.heroStyle,
    alignment: doc.hero.alignment,
    theme: doc.hero.theme,
    sections: sectionBlocks.map((b) => ({
      key: b.type as SectionKey,
      visible: b.visible,
      cols: b.cols,
    })),
  };
}
