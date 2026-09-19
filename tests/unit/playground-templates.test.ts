import { describe, expect, it } from "vitest";
import { templates, templatesById, challengeSurface } from "@/lib/templates";
import { isHiddenEntry } from "@/lib/revealed-paths";

/** Template file maps: source strings or `{ code, hidden }` entries. */
type TemplateFiles = Record<
  string,
  string | { code: string; hidden?: boolean }
>;

/**
 * Catalog-wide invariants for all 23 playground templates. These catch an
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

