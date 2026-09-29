import { describe, expect, it } from "vitest";
import {
  templates,
  templatesById,
  ANGULAR_VERSION,
  ANGULAR_TEMPLATE_DEPS,
} from "@/lib/templates";

/** File maps hold source strings or `{ code, hidden }` entries. */
type TemplateFiles = Record<
  string,
  string | { code: string; hidden?: boolean }
>;

function codeOf(files: TemplateFiles, path: string): string {
  const entry = files[path];
  if (entry === undefined) throw new Error(`missing file ${path}`);
  return typeof entry === "string" ? entry : entry.code;
}

function isHidden(files: TemplateFiles, path: string): boolean {
  const entry = files[path];
  return (
    typeof entry === "object" && (entry as { hidden?: boolean }).hidden === true
  );
}

/**
 * Contract: every Angular sandbox must resolve a modern Angular (v22:
 * standalone, signals, `@if`/`@for`), never Sandpack's stale built-in v11
 * base. Playground forwards each template's `dependencies` via customSetup —
 * so the catalog entries themselves must carry the pin — and the base v11
 * bootstrap files must be overridden, because:
 *   - `platform-browser-dynamic` is deprecated (v21+),
 *   - the base `polyfills.ts` imports `zone.js/dist/zone`, a path that no
 *     longer exists in zone.js's exports map,
 *   - the base NgModule shell is obsolete once components go standalone.
 */
describe("angular sandbox version pins", () => {
  it("tracks a single modern Angular major", () => {
    expect(ANGULAR_VERSION).toBe("^22.0.0");
    expect(ANGULAR_TEMPLATE_DEPS).toEqual({
      "@angular/common": ANGULAR_VERSION,
      "@angular/compiler": ANGULAR_VERSION,
      "@angular/core": ANGULAR_VERSION,
      "@angular/platform-browser": ANGULAR_VERSION,
      rxjs: "^7.8.0",
      "zone.js": "~0.16.0",
    });
    // Deprecated / ViewEngine-era packages must never creep back in.
    expect(ANGULAR_TEMPLATE_DEPS).not.toHaveProperty(
      "@angular/platform-browser-dynamic",
    );
    expect(ANGULAR_TEMPLATE_DEPS).not.toHaveProperty("core-js");
  });

  it("pins @angular/core on every base:angular template", () => {
    const angularTemplates = templates.filter((t) => t.base === "angular");
    expect(angularTemplates.length).toBeGreaterThan(0);
    for (const t of angularTemplates) {
      expect(
        t.dependencies?.["@angular/core"],
        `${t.id} must pin @angular/core (else Sandpack falls back to v11)`,
      ).toBe(ANGULAR_VERSION);
    }
  });

  it.each(["angular", "empty-angular"])(
    "%s boots standalone without the deprecated dynamic platform",
    (id) => {
      const files = templatesById[id].files as TemplateFiles;
      const main = codeOf(files, "/src/main.ts");
      expect(main).toContain("bootstrapApplication");
      expect(main).toContain('from "@angular/platform-browser"');
      expect(main).not.toContain("platformBrowserDynamic");
      expect(main).not.toContain("platform-browser-dynamic");
      // JIT needs the compiler + zone present before the app boots.
      expect(main).toContain('import "zone.js"');
      expect(main).toContain('import "@angular/compiler"');

      const component = codeOf(files, "/src/app/app.component.ts");
      expect(component).toContain("standalone: true");
      // Inline template: Sandpack cannot resolve `templateUrl` robustly.
      expect(component).toContain("template:");
      expect(component).not.toContain("templateUrl");

      // Base v11 leftovers must be overridden or hidden, never compiled.
      expect(codeOf(files, "/src/polyfills.ts")).not.toContain("dist/zone");
      for (const orphan of [
        "/src/app/app.module.ts",
        "/src/app/app.component.html",
        "/src/app/app.component.css",
      ]) {
        expect(
          isHidden(files, orphan),
          `${id} must hide orphaned base file ${orphan}`,
        ).toBe(true);
      }
    },
  );
});
