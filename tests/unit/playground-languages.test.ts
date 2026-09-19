import { describe, expect, it } from "vitest";
import {
  BACKEND_LANGUAGES,
  getLanguageFromPath,
  isBackendLanguage,
} from "@/lib/playground-languages";
import { templates, challengeSurface } from "@/lib/templates";

/**
 * Contract for Run routing: each file must execute as the right language in
 * the right place (browser bundler vs `/api/execute`). A wrong answer here
 * means the Run button silently does the wrong thing.
 */
describe("run routing", () => {
  it("backend set matches the template catalog's server-side templates", () => {
    const serverTemplates = templates
      .filter((t) =>
        ["python", "go", "java", "cpp", "rust", "node", "ts-node"].includes(t.id),
      )
      .map((t) => t.id);
    expect(serverTemplates.length).toBeGreaterThan(0);
    for (const id of serverTemplates) {
      expect(BACKEND_LANGUAGES.has(id)).toBe(true);
      expect(challengeSurface(id)).toBe("dsa");
    }
    for (const id of ["empty-react", "react", "vue", "javascript"]) {
      expect(BACKEND_LANGUAGES.has(id)).toBe(false);
      expect(challengeSurface(id)).toBe("frontend");
    }
  });

  it("resolves systems languages by extension", () => {
    expect(getLanguageFromPath("/m.py", "python")).toBe("python");
    expect(getLanguageFromPath("/m.go", "go")).toBe("go");
    expect(getLanguageFromPath("/M.java", "java")).toBe("java");
    expect(getLanguageFromPath("/m.cpp", "cpp")).toBe("cpp");
    expect(getLanguageFromPath("/m.h", "cpp")).toBe("cpp");
    expect(getLanguageFromPath("/m.rs", "rust")).toBe("rust");
  });

  it("resolves js/ts with the node fallback rule", () => {
    expect(getLanguageFromPath("/i.js", "node")).toBe("node");
    expect(getLanguageFromPath("/i.js", "empty-js")).toBe("javascript");
    expect(getLanguageFromPath("/i.jsx", "react")).toBe("javascript");
    expect(getLanguageFromPath("/i.ts", "ts-node")).toBe("typescript");
    expect(getLanguageFromPath("/i.tsx", "react")).toBe("typescript");
    expect(getLanguageFromPath("/weird.xyz", "python")).toBe("python");
  });

  it("flags backend languages, incl. the ts-node special case", () => {
    for (const l of ["python", "go", "java", "cpp", "rust", "node"]) {
      expect(isBackendLanguage(l)).toBe(true);
    }
    expect(isBackendLanguage("typescript", "ts-node")).toBe(true);
    expect(isBackendLanguage("typescript", "react")).toBe(false);
    expect(isBackendLanguage("javascript", "react")).toBe(false);
    expect(isBackendLanguage("PYTHON")).toBe(true);
  });
});
