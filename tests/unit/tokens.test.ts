import { describe, it, expect } from "vitest";
import {
  TOKEN_PRESETS,
  TOKEN_PRESET_KEYS,
  contrastRatio,
  luminance,
  normalizeTokenSet,
  tokenSetToCssVars,
} from "../../src/lib/creator/tokens";

describe("tokens: presets", () => {
  it("defines 8 presets", () => {
    expect(TOKEN_PRESET_KEYS).toHaveLength(8);
    expect(Object.keys(TOKEN_PRESETS)).toHaveLength(8);
  });

  it.each(TOKEN_PRESET_KEYS)("preset %s has WCAG AA contrast vs white or dark surface", (key) => {
    const t = TOKEN_PRESETS[key];
    // accent on white is the most demanding check; minimalist uses dark accent so ratio vs white is high
    const ratioWhite = contrastRatio(t.accent, "#ffffff");
    const ratioDark = contrastRatio(t.accent, "#0b0c10");
    // at least one of the two surfaces should be AA for large text (3:1)
    expect(Math.max(ratioWhite, ratioDark)).toBeGreaterThanOrEqual(3);
  });

  it("presets have distinct accents", () => {
    const accents = new Set(Object.values(TOKEN_PRESETS).map((t) => t.accent.toLowerCase()));
    expect(accents.size).toBe(TOKEN_PRESET_KEYS.length);
  });
});

describe("tokens: normalizeTokenSet", () => {
  it("returns null for invalid input", () => {
    expect(normalizeTokenSet(null)).toBeNull();
    expect(normalizeTokenSet({})).toBeNull();
    expect(normalizeTokenSet({ accent: "red", radius: 10 })).toBeNull();
  });

  it("returns a valid preset parse", () => {
    const preset = TOKEN_PRESETS.slate;
    expect(normalizeTokenSet(preset)).toEqual(preset);
  });

  it("rejects out-of-range radius", () => {
    const bad = { ...TOKEN_PRESETS.slate, radius: 99 };
    expect(normalizeTokenSet(bad)).toBeNull();
  });
});

describe("tokens: tokenSetToCssVars", () => {
  it("emits --accent and --accent-rgb triplet", () => {
    const vars = tokenSetToCssVars(TOKEN_PRESETS.neon);
    expect(vars["--accent"]).toBe("#45F3FF");
    expect(vars["--accent-rgb"]).toBe("69, 243, 255");
    expect(vars["--accent-glow"]).toMatch(/rgba\(/);
    expect(vars["--radius-base"]).toBe("8px");
  });
});

describe("tokens: luminance/contrast", () => {
  it("luminance of white > black", () => {
    expect(luminance("#ffffff")).toBeGreaterThan(luminance("#000000"));
  });

  it("contrast black vs white is 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});
