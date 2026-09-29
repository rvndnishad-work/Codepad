import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Contract for self-hosted Monaco. The editor must never depend on a
 * third-party CDN at runtime (a jsdelivr hiccup once broke every editor
 * surface on Mobile Safari): the pinned build is copied to public/ on
 * postinstall and the loader is pointed at it (see lib/monaco-loader.ts).
 */
describe("self-hosted monaco", () => {
  // Vitest always runs from the repo root.
  const root = process.cwd();

  it("pins the exact monaco-editor build the loader expects", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
    // @monaco-editor/loader's default CDN URL is
    // .../monaco-editor@0.55.1/min/vs — the self-hosted copy must match it
    // exactly, or workers/language services silently mismatch.
    expect(pkg.dependencies?.["monaco-editor"]).toBe("0.55.1");
  });

  it("ships the postinstall build artifacts", () => {
    expect(existsSync(path.join(root, "public", "monaco", "vs", "loader.js"))).toBe(
      true,
    );
    expect(
      existsSync(
        path.join(root, "public", "monaco", "vs", "editor", "editor.main.js"),
      ),
    ).toBe(true);
  });
});
