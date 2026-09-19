import { test, expect } from "@playwright/test";

/**
 * Editor reliability proof: with third-party CDNs completely blocked, the
 * editor must still mount (self-hosted under /monaco/vs) and accept input.
 * This fails on any code path that still loads Monaco from jsdelivr/unpkg.
 */
test.describe("monaco self-hosted", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**cdn.jsdelivr.net**", (route) => route.abort());
    await page.route("**unpkg.com**", (route) => route.abort());
  });

  test("editor mounts with CDNs blocked", async ({ page }) => {
    await page.goto("/play?template=empty-js");
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 60000,
    });
  });

  test("editor accepts input with CDNs blocked", async (
    { page },
    testInfo,
  ) => {
    test.skip(
      testInfo.project.name === "Mobile Safari",
      "Monaco typing is desktop-only",
    );
    await page.goto("/play?template=empty-js");
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 60000,
    });
    await page.locator(".monaco-editor").first().click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type("selfhost-marker-456");
    await expect(
      page.locator(".monaco-editor .view-lines", {
        hasText: "selfhost-marker-456",
      }),
    ).toBeVisible({ timeout: 15000 });
  });
});
