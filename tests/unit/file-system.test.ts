import { describe, expect, it } from "vitest";
import {
  buildTree,
  parentDir,
  normalizePath,
  resolveNewFileName,
  ancestorDirs,
  pruneCustomOrderAfterDelete,
  rekeyCustomOrderAfterMove,
} from "@/hooks/useFileSystem";

/**
 * Contract for the explorer tree + path helpers shared by every surface that
 * mounts `FileExplorer` (playground, collab, challenge attempts, AI rounds).
 */
describe("path helpers", () => {
  it("parentDir", () => {
    expect(parentDir("/a/b.js")).toBe("/a");
    expect(parentDir("/a.js")).toBe("/");
    expect(parentDir("/")).toBe("/");
  });

  it("normalizePath", () => {
    expect(normalizePath("a.js")).toBe("/a.js");
    expect(normalizePath("/a.js")).toBe("/a.js");
  });

  it("resolveNewFileName appends the pending ext only when missing", () => {
    expect(resolveNewFileName("Header", ".js")).toBe("Header.js");
    expect(resolveNewFileName("Header.jsx", ".js")).toBe("Header.jsx");
    expect(resolveNewFileName("  App  ", ".js")).toBe("App.js");
    expect(resolveNewFileName("data", undefined)).toBe("data");
    // Dotted folder-ish names still count as having an extension.
    expect(resolveNewFileName("v1.0", ".js")).toBe("v1.0");
  });

  it("resolveNewFileName supports nested paths", () => {
    expect(resolveNewFileName("hooks/useTimer", ".js")).toBe(
      "hooks/useTimer.js",
    );
    expect(resolveNewFileName("hooks/useTimer.ts", ".js")).toBe(
      "hooks/useTimer.ts",
    );
    // A dot in a folder name does not count as a file extension.
    expect(resolveNewFileName("v1.0/hooks/useTimer", ".js")).toBe(
      "v1.0/hooks/useTimer.js",
    );
  });
});

describe("buildTree", () => {
  it("nests files and shows empty folders", () => {
    const tree = buildTree(["/App.js", "/src/a.js"], new Set(["/empty"]));
    expect(tree.map((n) => n.name)).toEqual(["src", "empty", "App.js"]);
    const src = tree.find((n) => n.name === "src")!;
    expect(src.isFolder).toBe(true);
    expect(src.children?.map((c) => c.name)).toEqual(["a.js"]);
  });

  it("manual mode groups folders first, name mode sorts A-Z", () => {
    const paths = ["/z.js", "/a.js", "/dir/b.js"];
    const manual = buildTree(paths, new Set(), "manual");
    expect(manual.map((n) => n.name)).toEqual(["dir", "z.js", "a.js"]);
    const az = buildTree(paths, new Set(), "name");
    expect(az.map((n) => n.name)).toEqual(["dir", "a.js", "z.js"]);
  });

  it("applies explicit customOrder and appends newcomers", () => {
    const tree = buildTree(["/a.js", "/b.js", "/c.js"], new Set(), "manual", {
      "/": ["c.js", "a.js"],
    });
    expect(tree.map((n) => n.name)).toEqual(["c.js", "a.js", "b.js"]);
  });

  it("handles deep nesting and folder/file name splits", () => {
    const tree = buildTree(["/a/b/c/d.js"], new Set());
    const a = tree.find((n) => n.name === "a")!;
    const b = a.children!.find((n) => n.name === "b")!;
    const c = b.children!.find((n) => n.name === "c")!;
    expect(c.children?.[0]).toMatchObject({ name: "d.js", isFolder: false });
    expect(a.path).toBe("/a");
    expect(c.children?.[0].path).toBe("/a/b/c/d.js");
  });
  it("ancestorDirs lists every parent folder", () => {
    expect(ancestorDirs("/a/b/c.js")).toEqual(["/a", "/a/b"]);
    expect(ancestorDirs("/a.js")).toEqual([]);
    expect(ancestorDirs("/")).toEqual([]);
  });
});

describe("customOrder hygiene", () => {
  it("prunes the deleted name and descendant orders on delete", () => {
    const order = {
      "/": ["c.js", "a.js", "src"],
      "/src": ["b.js", "a.js"],
    };
    expect(pruneCustomOrderAfterDelete(order, "/src")).toEqual({
      "/": ["c.js", "a.js"],
    });
    expect(pruneCustomOrderAfterDelete(order, "/src/b.js")).toEqual({
      "/": ["c.js", "a.js", "src"],
      "/src": ["a.js"],
    });
    // Deleting an unordered path leaves the order untouched.
    expect(pruneCustomOrderAfterDelete(order, "/other.js")).toEqual(order);
  });

  it("keeps its slot on in-place rename", () => {
    const order = { "/": ["c.js", "a.js"] };
    expect(rekeyCustomOrderAfterMove(order, "/a.js", "/z.js")).toEqual({
      "/": ["c.js", "z.js"],
    });
  });

  it("moves across parents and re-roots descendant orders", () => {
    const order = {
      "/": ["a.js", "src", "lib"],
      "/src": ["a.js"],
      "/src/sub": ["x.js"],
    };
    expect(rekeyCustomOrderAfterMove(order, "/a.js", "/lib/a.js")).toEqual({
      // "/lib" had no explicit order: default grouping shows the newcomer.
      "/": ["src", "lib"],
      "/src": ["a.js"],
      "/src/sub": ["x.js"],
    });
    expect(
      rekeyCustomOrderAfterMove(order, "/src/sub", "/lib/sub"),
    ).toEqual({
      "/": ["a.js", "src", "lib"],
      "/src": ["a.js"],
      "/lib/sub": ["x.js"],
    });
  });

  it("appends newcomers to a destination with an explicit order", () => {
    const order = { "/": ["a.js", "lib"], "/lib": ["z.js"] };
    expect(rekeyCustomOrderAfterMove(order, "/a.js", "/lib/a.js")).toEqual({
      "/": ["lib"],
      "/lib": ["z.js", "a.js"],
    });
  });

  it("is a no-op for identity moves", () => {
    const order = { "/": ["a.js"] };
    expect(rekeyCustomOrderAfterMove(order, "/a.js", "/a.js")).toEqual(order);
  });
});
