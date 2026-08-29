import { describe, it, expect } from "vitest";
import {
  blocksDocToLayout,
  layoutToBlocksDoc,
  normalizeBlocks,
  serializeBlocksDoc,
  type SpaceBlocksDoc,
} from "../../src/lib/creator/blocks";
import { DEFAULT_LAYOUT, type SpaceLayout } from "../../src/lib/creator/layout";

describe("blocks: layoutToBlocksDoc", () => {
  it("converts DEFAULT_LAYOUT into 8 blocks preserving order", () => {
    const doc = layoutToBlocksDoc(DEFAULT_LAYOUT);
    expect(doc.blocks).toHaveLength(8);
    expect(doc.blocks.map((b) => b.type)).toEqual(DEFAULT_LAYOUT.sections.map((s) => s.key));
    expect(doc.hero.heroStyle).toBe("banner");
    expect(doc.hero.theme).toBe("slate");
  });

  it("preserves cols/visible from layout", () => {
    const layout: SpaceLayout = {
      heroStyle: "minimal",
      alignment: "center",
      theme: "neon",
      sections: [
        { key: "ABOUT", visible: false, cols: 6 },
        { key: "MEMBERSHIP", visible: true, cols: 4 },
        { key: "TUTORIAL", visible: true, cols: 12 },
        { key: "INTERVIEW_QA", visible: false, cols: 6 },
        { key: "INTERVIEW_EXPERIENCE", visible: true, cols: 6 },
        { key: "CHALLENGE", visible: true, cols: 12 },
        { key: "SNIPPET", visible: true, cols: 6 },
        { key: "BLOG_POST", visible: true, cols: 6 },
      ],
    };
    const doc = layoutToBlocksDoc(layout);
    expect(doc.hero.heroStyle).toBe("minimal");
    expect(doc.hero.alignment).toBe("center");
    expect(doc.blocks.find((b) => b.type === "ABOUT")?.visible).toBe(false);
    expect(doc.blocks.find((b) => b.type === "ABOUT")?.cols).toBe(6);
    expect(doc.blocks.find((b) => b.type === "INTERVIEW_QA")?.visible).toBe(false);
  });
});

describe("blocks: normalizeBlocks legacy fallback", () => {
  it("migrates a legacy layout when blocks is null", () => {
    const legacy = {
      heroStyle: "minimal",
      alignment: "right",
      theme: "neon",
      sections: [
        { key: "ABOUT", visible: true, cols: 4 },
        { key: "MEMBERSHIP", visible: false, cols: 4 },
      ],
    };
    const doc = normalizeBlocks(null, legacy);
    expect(doc.hero.heroStyle).toBe("minimal");
    expect(doc.hero.alignment).toBe("right");
    expect(doc.hero.theme).toBe("neon");
    // legacy had 2 explicit sections, appended 6 missing → total 8
    expect(doc.blocks).toHaveLength(8);
    expect(doc.blocks.find((b) => b.type === "MEMBERSHIP")?.visible).toBe(false);
  });

  it("returns DEFAULT_LAYOUT-derived doc when both are null", () => {
    const doc = normalizeBlocks(null, null);
    expect(doc.blocks).toHaveLength(8);
    expect(doc.hero.heroStyle).toBe("banner");
  });

  it("prefers blocks when both present and valid", () => {
    const blocksDoc: SpaceBlocksDoc = {
      hero: { heroStyle: "minimal", alignment: "center", theme: "glassmorphism" },
      blocks: [
        { id: "blk_tutorial", type: "TUTORIAL", props: {}, cols: 8, visible: true, tierGate: null },
        { id: "blk_about", type: "ABOUT", props: {}, cols: 4, visible: true, tierGate: null },
      ],
    };
    const legacy = { heroStyle: "banner", alignment: "left", theme: "slate", sections: [] };
    const doc = normalizeBlocks(blocksDoc, legacy);
    expect(doc.hero.theme).toBe("glassmorphism");
    // supplied 2 blocks + appended missing 6 of the 8 SECTION_KEYS (2 already present) → 8
    expect(doc.blocks).toHaveLength(8);
  });

  it("drops unknown block types and dedupes by id", () => {
    const raw = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [
        { id: "a", type: "TUTORIAL", props: {}, cols: 8, visible: true },
        { id: "a", type: "TUTORIAL", props: {}, cols: 8, visible: true },
        { id: "b", type: "UNKNOWN" as unknown as string, props: {}, cols: 12, visible: true },
        { id: "c", type: "BLOG_POST", props: {}, cols: 6, visible: true },
      ],
    };
    const doc = normalizeBlocks(raw, null);
    const tutorialCount = doc.blocks.filter((b) => b.id === "a").length;
    expect(tutorialCount).toBe(1);
    expect(doc.blocks.some((b) => (b.type as string) === "UNKNOWN")).toBe(false);
  });

  it("appends missing SECTION_KEYS when doc is partial", () => {
    const raw = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [{ id: "only", type: "TUTORIAL", props: {}, cols: 8, visible: true }],
    };
    const doc = normalizeBlocks(raw, null);
    expect(doc.blocks.length).toBe(8);
    const types = new Set(doc.blocks.map((b) => b.type));
    expect(types.has("ABOUT")).toBe(true);
    expect(types.has("MEMBERSHIP")).toBe(true);
    expect(types.has("TUTORIAL")).toBe(true);
  });

  it("clamps cols to 1..12 and falls back to DEFAULT_SECTION_COLS", () => {
    const raw = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [
        { id: "x", type: "TUTORIAL", props: {}, cols: 99, visible: true },
        { id: "y", type: "ABOUT", props: {}, cols: 0, visible: true },
      ],
    };
    const doc = normalizeBlocks(raw, null);
    expect(doc.blocks.find((b) => b.id === "x")?.cols).toBe(8); // DEFAULT_SECTION_COLS[TUTORIAL]
    expect(doc.blocks.find((b) => b.id === "y")?.cols).toBe(4); // DEFAULT_SECTION_COLS[ABOUT]
  });

  it("preserves tierGate when supplied", () => {
    const raw = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [{ id: "gated", type: "TUTORIAL", props: {}, cols: 8, visible: true, tierGate: 2 }],
    };
    const doc = normalizeBlocks(raw, null);
    expect(doc.blocks.find((b) => b.id === "gated")?.tierGate).toBe(2);
  });
});

describe("blocks: serializeBlocksDoc validates", () => {
  it("rejects unknown block type", () => {
    const bad = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [{ id: "x", type: "NOPE", props: {}, cols: 12, visible: true }],
    } as unknown as SpaceBlocksDoc;
    expect(() => serializeBlocksDoc(bad)).toThrow();
  });

  it("accepts a minimal valid doc", () => {
    const doc: SpaceBlocksDoc = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [{ id: "blk_about", type: "ABOUT", props: {}, cols: 4, visible: true, tierGate: null }],
    };
    expect(serializeBlocksDoc(doc).blocks).toHaveLength(1);
  });
});

describe("blocks: blocksDocToLayout round-trip", () => {
  it("drops non-section blocks (HERO/CTA) on conversion", () => {
    const doc: SpaceBlocksDoc = {
      hero: { heroStyle: "banner", alignment: "left", theme: "slate" },
      blocks: [
        { id: "h", type: "HERO", props: { eyebrow: "hi" }, cols: 12, visible: true, tierGate: null },
        { id: "a", type: "ABOUT", props: {}, cols: 4, visible: true, tierGate: null },
        { id: "t", type: "TUTORIAL", props: {}, cols: 8, visible: true, tierGate: null },
      ],
    };
    const layout = blocksDocToLayout(doc);
    expect(layout.sections.map((s) => s.key)).toEqual(["ABOUT", "TUTORIAL"]);
    expect(layout.heroStyle).toBe("banner");
  });

  it("layout -> blocks -> layout is stable for section keys", () => {
    const layout = DEFAULT_LAYOUT;
    const doc = layoutToBlocksDoc(layout);
    const roundTripped = blocksDocToLayout(doc);
    expect(roundTripped.sections.map((s) => s.key)).toEqual(layout.sections.map((s) => s.key));
    expect(roundTripped.heroStyle).toBe(layout.heroStyle);
    expect(roundTripped.theme).toBe(layout.theme);
  });
});
