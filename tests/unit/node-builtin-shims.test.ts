import { describe, expect, it } from "vitest";
import {
  buildNodeBuiltinShims,
  SHIMMED_NODE_BUILTINS,
  OPTIONAL_DEPS,
  isNodeShimPath,
} from "@/lib/node-builtin-shims";

/**
 * Contract for Node core shims. The v2 bundler resolves `node:stream` as a
 * plain package name (no scheme special-casing), so every builtin needs a
 * `node:`-prefixed alias package — missing one kills any framework whose
 * deps import it (observed: @vue/server-renderer → `node:stream`).
 */
describe("node builtin shims", () => {
  it("covers every builtin with and without the node: prefix", () => {
    const plain = ["process", "events", "path", "stream", "fs", "buffer"];
    for (const name of plain) {
      expect(SHIMMED_NODE_BUILTINS).toContain(name);
      expect(SHIMMED_NODE_BUILTINS).toContain(`node:${name}`);
    }
    expect(SHIMMED_NODE_BUILTINS).toContain("node:stream/promises");
    expect(SHIMMED_NODE_BUILTINS).toContain("node:assert/strict");
  });

  it("emits hidden alias packages re-exporting their sibling", () => {
    const files = buildNodeBuiltinShims({});
    const pkg = files["/node_modules/node:stream/package.json"];
    const index = files["/node_modules/node:stream/index.js"];
    expect(pkg && typeof pkg !== "string" && pkg.hidden).toBe(true);
    expect(index && typeof index !== "string" && index.hidden).toBe(true);
    const code = typeof index === "string" ? index : index.code;
    // Same depth as the unprefixed dir: one level up to the sibling.
    expect(code).toContain('require("../stream/index.js")');

    // Nested alias walks back twice.
    const nested = files["/node_modules/node:stream/promises/index.js"];
    const nestedCode =
      typeof nested === "string" ? nested : (nested as { code: string }).code;
    expect(nestedCode).toContain(
      'require("../../stream/promises/index.js")',
    );

    // Real implementations are re-exported, not stubbed.
    const pathAlias = files["/node_modules/node:path/index.js"];
    const pathCode =
      typeof pathAlias === "string"
        ? pathAlias
        : (pathAlias as { code: string }).code;
    expect(pathCode).toContain('require("../path/index.js")');
  });

  it("skips shims (and their aliases) shadowed by real installs", () => {
    const withStream = buildNodeBuiltinShims({ stream: "1.0.0" });
    expect(withStream["/node_modules/stream/index.js"]).toBeUndefined();
    expect(withStream["/node_modules/node:stream/index.js"]).toBeUndefined();
    // Unrelated shims stay.
    expect(withStream["/node_modules/path/index.js"]).toBeDefined();

    const withAssert = buildNodeBuiltinShims({ assert: "2.0.0" });
    expect(
      withAssert["/node_modules/node:assert/strict/index.js"],
    ).toBeUndefined();
  });

  it("flags injected paths for save/sync stripping", () => {
    expect(isNodeShimPath("/node_modules/node:stream/index.js")).toBe(true);
    expect(isNodeShimPath("/node_modules/stream/index.js")).toBe(true);
    expect(isNodeShimPath("/node_modules/twig/index.js")).toBe(true);
    expect(isNodeShimPath("/App.js")).toBe(false);
  });
});

describe("optional template-engine stubs", () => {
  it("covers the consolidate engines probed by compiler-sfc", () => {
    for (const name of ["twig", "atpl", "mustache", "pug", "ejs", "underscore"]) {
      expect(OPTIONAL_DEPS).toContain(name);
    }
    expect(OPTIONAL_DEPS.length).toBeGreaterThan(40);
  });

  it("emits hidden empty modules (resolvable, never throwing at import)", () => {
    const files = buildNodeBuiltinShims({});
    for (const name of ["twig", "mustache", "underscore", "lodash"]) {
      const entry = files[`/node_modules/${name}/index.js`];
      expect(entry, name).toBeDefined();
      const code = typeof entry === "string" ? entry : (entry as { code: string }).code;
      expect(code).toContain("module.exports = {}");
      expect(
        typeof entry !== "string" && (entry as { hidden?: boolean }).hidden,
      ).toBe(true);
    }
  });

  it("supports deep subpaths with a root package entry", () => {
    const files = buildNodeBuiltinShims({});
    expect(files["/node_modules/teacup/package.json"]).toBeDefined();
    expect(files["/node_modules/teacup/lib/express.js"]).toBeDefined();
    expect(files["/node_modules/teacup/lib/express/index.js"]).toBeDefined();
    expect(files["/node_modules/react-dom/server.js"]).toBeDefined();
  });

  it("a real install wins over the stub", () => {
    const withPug = buildNodeBuiltinShims({ pug: "^3.0.0" });
    expect(withPug["/node_modules/pug/index.js"]).toBeUndefined();
    const withReactDom = buildNodeBuiltinShims({ "react-dom": "^19.0.0" });
    expect(withReactDom["/node_modules/react-dom/server.js"]).toBeUndefined();
    // Installs of anything else leave stubs alone.
    expect(
      buildNodeBuiltinShims({ leftpad: "1.0.0" })["/node_modules/pug/index.js"],
    ).toBeDefined();
  });
});
