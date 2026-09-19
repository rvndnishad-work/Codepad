import { describe, expect, it } from "vitest";
import { snapshotFiles, isFileDirty } from "@/lib/file-dirty";

/**
 * Contract for per-tab dirty dots: compare live code against the
 * last-saved snapshot, ignore flags/identity, flag post-save additions.
 */
describe("file-dirty", () => {
  it("snapshots normalize entries to plain code", () => {
    const snap = snapshotFiles({
      "/a.js": "x",
      "/b.js": { code: "y", hidden: true },
    });
    expect(snap).toEqual({ "/a.js": { code: "x" }, "/b.js": { code: "y" } });
  });

  it("reports clean only when code matches the snapshot", () => {
    const saved = snapshotFiles({ "/a.js": "const x = 1;\n" });
    const live = { "/a.js": { code: "const x = 1;\n" } };
    expect(isFileDirty(saved, live, "/a.js")).toBe(false);
    expect(
      isFileDirty(saved, { "/a.js": { code: "const x = 2;\n" } }, "/a.js"),
    ).toBe(true);
  });

  it("flags files created after the snapshot", () => {
    const saved = snapshotFiles({ "/a.js": "x" });
    expect(isFileDirty(saved, { "/a.js": "x", "/b.js": "y" }, "/b.js")).toBe(
      true,
    );
  });

  it("stays quiet without a snapshot (never saved)", () => {
    expect(isFileDirty(null, { "/a.js": "x" }, "/a.js")).toBe(false);
    expect(isFileDirty(undefined, { "/a.js": "x" }, "/a.js")).toBe(false);
  });
});
