import { test, expect } from "@playwright/test";

/**
 * Every frontend template must compile and run user code — no dead
 * previews. Regression coverage for the `node:`-prefixed shim gap that
 * killed Vue (@vue/server-renderer imports `node:stream`) and the optional
 * template-engine requires (`twig`, …) probed by @vue/compiler-sfc.
 *
 * Method: type a console.log marker into the active file (the template
 * entry, opened by default), switch to split view, and read it back from
 * the Sandpack console bridge. A broken import tree kills the build before
 * the marker can execute; runtime failures surface in our error overlay.
 * The preview iframe itself is cross-origin, so its DOM is unreadable —
 * the console bridge is the observable proof of execution.
 */
const TEMPLATES: Array<{ id: string; marker: string }> = [
  { id: "empty-react", marker: "e2e-tpl-empty-react" },
  { id: "empty-vue", marker: "e2e-tpl-empty-vue" },
  { id: "empty-angular", marker: "e2e-tpl-empty-angular" },
  { id: "empty-svelte", marker: "e2e-tpl-empty-svelte" },
  { id: "empty-solid", marker: "e2e-tpl-empty-solid" },
  { id: "react", marker: "e2e-tpl-react" },
  { id: "vue", marker: "e2e-tpl-vue" },
  { id: "angular", marker: "e2e-tpl-angular" },
  { id: "svelte", marker: "e2e-tpl-svelte" },
  { id: "solid", marker: "e2e-tpl-solid" },
  { id: "react-hooks", marker: "e2e-tpl-hooks" },
  { id: "react-classes", marker: "e2e-tpl-classes" },
  { id: "redux-toolkit", marker: "e2e-tpl-redux" },
  { id: "mobx", marker: "e2e-tpl-mobx" },
  { id: "framer-motion", marker: "e2e-tpl-motion" },
  { id: "mui", marker: "e2e-tpl-mui" },
  { id: "javascript", marker: "e2e-tpl-javascript" },
  { id: "typescript", marker: "e2e-tpl-typescript" },
];

test.describe("frontend templates execute", () => {
  for (const tpl of TEMPLATES) {
    test(`${tpl.id} compiles and runs`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "chromium" &&
          testInfo.project.name !== "Mobile Safari",
        "template matrix runs on chromium + mobile",
      );
      test.setTimeout(240000);
      await page.goto(`/play?template=${tpl.id}`);

      // Editor is up with the entry file active.
      await expect(page.locator(".monaco-editor").first()).toBeVisible({
        timeout: 60000,
      });

      // Log a marker from the active (entry) file.
      await page.locator(".monaco-editor").first().click();
      await page.keyboard.press("Control+End");
      await page.keyboard.type(`\nconsole.log("${tpl.marker}");`);

      // Split view exposes the Sandpack console bridge in-DOM.
      await page.getByTitle("Split: preview + console").click();
      await expect(page.getByText(tpl.marker).first()).toBeVisible({
        timeout: 120000,
      });

      // And no bundler/runtime error overlay fired anywhere.
      await expect(page.locator(".error-overlay")).toHaveCount(0);
    });
  }
});
