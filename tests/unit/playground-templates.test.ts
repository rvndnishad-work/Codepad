import { describe, expect, it } from "vitest";
import { templates, templatesById, challengeSurface, supportsV2Bundler } from "@/lib/templates";
import { isHiddenEntry } from "@/lib/revealed-paths";

/** Template file maps: source strings or `{ code, hidden }` entries. */
type TemplateFiles = Record<
  string,
  string | { code: string; hidden?: boolean }
>;

/**
 * Catalog-wide invariants for all 27 playground templates. These catch an
 * entire class of "template X loads an empty/broken playground" regressions:
 * every template must resolve a visible entry file through the same rules
 * `Playground.initialVisibleFiles` uses (package.json main → candidates →
 * first visible file).
 */
const ENTRY_CANDIDATES = [
  "/src/App.tsx",
  "/src/App.jsx",
  "/App.tsx",
  "/App.jsx",
  "/src/index.tsx",
  "/src/index.jsx",
  "/src/index.ts",
  "/src/index.js",
  "/index.tsx",
  "/index.jsx",
  "/index.ts",
  "/index.js",
];

function visiblePathsOf(files: TemplateFiles): string[] {
  return Object.keys(files).filter((p) => !isHiddenEntry(files[p]));
}

function resolveEntry(files: TemplateFiles): string | null {
  const pkgRaw = files["/package.json"];
  if (pkgRaw && !isHiddenEntry(pkgRaw)) {
    try {
      const code = typeof pkgRaw === "string" ? pkgRaw : pkgRaw.code;
      const main = JSON.parse(code).main;
      if (typeof main === "string") {
        const normalized = main.startsWith("/") ? main : `/${main}`;
        if (files[normalized] && !isHiddenEntry(files[normalized]))
          return normalized;
      }
    } catch {
      /* fall through */
    }
  }
  for (const c of ENTRY_CANDIDATES) {
    if (files[c] && !isHiddenEntry(files[c])) return c;
  }
  return visiblePathsOf(files)[0] ?? null;
}

describe("template catalog", () => {
  it("every template has identity, a base and files", () => {
    const ids = new Set<string>();
    for (const t of templates) {
      expect(t.id).toBeTruthy();
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.title).toBeTruthy();
      expect(t.base).toBeTruthy();
      expect(Object.keys(t.files).length).toBeGreaterThan(0);
      expect(templatesById[t.id]).toBe(t);
    }
    expect(ids.size).toBe(templates.length);
  });

  it("every template resolves a visible entry file", () => {
    for (const t of templates) {
      const entry = resolveEntry(t.files as TemplateFiles);
      expect(entry, `${t.id} has no visible entry file`).toBeTruthy();
    }
  });

  it("every hidden scaffold is revealable (never a phantom duplicate)", () => {
    // Mirrors classifyCollision: a hidden path absent from the visible tree
    // must classify as hidden-scaffold.
    for (const t of templates) {
      const files = t.files as TemplateFiles;
      const visible = visiblePathsOf(files);
      for (const [p, v] of Object.entries(files)) {
        if (isHiddenEntry(v)) expect(visible).not.toContain(p);
      }
    }
    // The reported case, pinned.
    const emptyReact = templatesById["empty-react"].files as TemplateFiles;
    expect(isHiddenEntry(emptyReact["/styles.css"])).toBe(true);
    expect(visiblePathsOf(emptyReact)).not.toContain("/styles.css");
  });

  it("only react/solid bases target the v2 esbuild bundler", () => {
    // Regression: Playground passed `bundlerURL: <v2>` globally, and v2 only
    // ships React/Solid transformers — Vue/Svelte died with
    // "No transformer for *.vue/*.svelte" and Angular with
    // "decorators isn't currently enabled". Those bases must use the default
    // v1 bundler (no bundlerURL override).
    for (const t of templates) {
      if (t.base === "react" || t.base === "solid") {
        expect(supportsV2Bundler(t.base), `${t.id} should use v2`).toBe(true);
      } else {
        expect(supportsV2Bundler(t.base), `${t.id} (base ${t.base}) must stay on v1`).toBe(false);
      }
    }
  });

  it("every framework base has an empty clean-slate counterpart", () => {
    // empty-react is the pattern: one visible hello entry, scaffold hidden.
    // Every frontend framework base must offer the same starting point.
    for (const base of ["react", "vue", "angular", "svelte", "solid"]) {
      const empty = templatesById[`empty-${base}`];
      expect(empty, `missing empty-${base}`).toBeDefined();
      expect(empty.base).toBe(base);
      expect(empty.group).toBe("empty");
      const entry = resolveEntry(empty.files as TemplateFiles);
      expect(entry, `empty-${base} has no visible entry file`).toBeTruthy();
    }
  });

  it("backend templates run console-first with a runnable main file", () => {
    const runnable: Record<string, string> = {
      python: "/index.py",
      go: "/main.go",
      java: "/Main.java",
      cpp: "/main.cpp",
      rust: "/main.rs",
      node: "/index.js",
      "ts-node": "/index.ts",
    };
    for (const [id, main] of Object.entries(runnable)) {
      const t = templatesById[id];
      expect(t, `missing template ${id}`).toBeDefined();
      expect(t.mode).toBe("console");
      expect(challengeSurface(id)).toBe("dsa");
      const files = t.files as TemplateFiles;
      expect(files[main] && !isHiddenEntry(files[main]), `${id} missing ${main}`).toBeTruthy();
    }
  });
});

