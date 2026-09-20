import { describe, expect, it } from "vitest";
import {
  allowedExtsForTemplate,
  defaultExtForTemplate,
  supportsNpm,
  FRONTEND_EXTS,
  newFileRowAction,
  isCoarsePointer,
  aiExplorerTemplateId,
} from "@/lib/template-filetypes";
import { FILE_TYPES } from "@/hooks/useFileSystem";

/**
 * Contract for the "New file" flow: every template id the product offers must
 * resolve to a non-empty, creatable extension set, and the npm panel must be
 * hidden exactly for the server-side runtimes (where editing package.json
 * installs nothing).
 */
describe("template file types", () => {
  it("frontend templates allow the full web set with .js default", () => {
    for (const id of [
      "empty-react",
      "react",
      "react-hooks",
      "angular",
      "solid",
      undefined,
      "vanilla", // non-catalog id used by challenge attempts
    ]) {
      const allowed = allowedExtsForTemplate(id);
      for (const ext of FRONTEND_EXTS) expect(allowed).toContain(ext);
      expect(defaultExtForTemplate(id)).toBe(".js");
    }
  });

  it("vue/svelte templates lead with their framework extension", () => {
    for (const id of ["vue", "empty-vue"]) {
      const allowed = allowedExtsForTemplate(id);
      expect(allowed[0]).toBe(".vue");
      for (const ext of FRONTEND_EXTS) expect(allowed).toContain(ext);
      expect(defaultExtForTemplate(id)).toBe(".vue");
    }
    for (const id of ["svelte", "empty-svelte"]) {
      const allowed = allowedExtsForTemplate(id);
      expect(allowed[0]).toBe(".svelte");
      for (const ext of FRONTEND_EXTS) expect(allowed).toContain(ext);
      expect(defaultExtForTemplate(id)).toBe(".svelte");
    }
  });

  it("native runtimes allow only their language + data files", () => {
    expect(allowedExtsForTemplate("python")).toEqual([".py", ".json", ".md"]);
    expect(allowedExtsForTemplate("go")).toEqual([".go", ".json", ".md"]);
    expect(allowedExtsForTemplate("java")).toEqual([".java", ".json", ".md"]);
    expect(allowedExtsForTemplate("rust")).toEqual([".rs", ".toml", ".md"]);
    expect(allowedExtsForTemplate("cpp")).toEqual([
      ".cpp",
      ".h",
      ".c",
      ".json",
      ".md",
    ]);
    expect(defaultExtForTemplate("python")).toBe(".py");
    expect(defaultExtForTemplate("cpp")).toBe(".cpp");
  });

  it("node-family templates allow js/ts only", () => {
    for (const id of ["node", "ts-node", "empty-js", "empty-ts"]) {
      expect(allowedExtsForTemplate(id)).toEqual([".js", ".ts", ".json", ".md"]);
    }
  });

  it("every allowed ext has a FILE_TYPES entry (or nothing can be created)", () => {
    const ids = [
      "empty-react",
      "empty-vue",
      "empty-svelte",
      "empty-js",
      "empty-ts",
      "python",
      "go",
      "java",
      "rust",
      "cpp",
      "node",
      "ts-node",
      "vue",
      "svelte",
    ];
    for (const id of ids) {
      for (const ext of allowedExtsForTemplate(id)) {
        expect(
          FILE_TYPES.some((t) => t.ext === ext),
          `${id}: no FILE_TYPES template for ${ext}`,
        ).toBe(true);
      }
    }
  });

  it("hides the npm panel exactly for server-side runtimes", () => {
    for (const id of ["python", "go", "java", "cpp", "rust", "node", "ts-node"]) {
      expect(supportsNpm(id)).toBe(false);
    }
    for (const id of ["empty-react", "react", "empty-js", "vue", undefined]) {
      expect(supportsNpm(id)).toBe(true);
    }
  });

  it("routes the New-File row tap on touch, instant-create on desktop", () => {
    expect(newFileRowAction(false)).toBe("create");
    expect(newFileRowAction(true)).toBe("toggle");
  });

  it("detects coarse pointers, defaulting to desktop when unknown", () => {
    // jsdom stub (tests/setup.ts) reports a fine pointer.
    expect(isCoarsePointer()).toBe(false);
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(hover: none)",
      media: query,
    })) as unknown as typeof window.matchMedia;
    try {
      expect(isCoarsePointer()).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });

  it("maps AI rounds to their explorer template", () => {
    expect(aiExplorerTemplateId({ kind: "frontend" })).toBe("react");
    expect(
      aiExplorerTemplateId({ kind: "frontend", frameworkLabel: "React" }),
    ).toBe("react");
    expect(
      aiExplorerTemplateId({ kind: "frontend", frameworkLabel: "Vue 3" }),
    ).toBe("vue");
    expect(
      aiExplorerTemplateId({ kind: "frontend", frameworkLabel: "SvelteKit" }),
    ).toBe("svelte");
    // The explorer only mounts on the frontend surface.
    expect(
      aiExplorerTemplateId({ kind: "backend", language: "node" }),
    ).toBe("react");
    expect(
      aiExplorerTemplateId({ kind: "dsa", language: "python" }),
    ).toBe("react");
  });
});
