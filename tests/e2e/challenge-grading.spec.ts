import { test, expect } from "@playwright/test";

/**
 * Challenge grading end-to-end: login → harness attempt → submit → judge.
 * The fixture (`e2e-harness-add`, seeded by scripts/run-e2e-tests.js) ships
 * a correct starter, so this exercises the grading pipeline itself
 * (grade route → judge → Piston) with no Monaco typing involved.
 *
 * Requires a Piston executor — skipped where none is reachable (local runs
 * without docker); CI provides one and must never skip.
 */
async function executorUp(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:2000/api/v2/runtimes");
    return res.ok;
  } catch {
    return false;
  }
}

test.describe("challenge grading", () => {
  test("harness submission grades end-to-end", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium" &&
        testInfo.project.name !== "Mobile Safari",
      "grading flow runs on chromium + mobile",
    );
    if (!(await executorUp())) {
      if (process.env.PISTON_REQUIRED === "1") {
        throw new Error("PISTON_REQUIRED=1 but the executor is unreachable");
      }
      test.skip(true, "needs a Piston executor");
      return;
    }
    test.setTimeout(240000);

    // Sign in as the seeded candidate (settle wait mirrors auth.spec.ts —
    // filling pre-hydration inputs gets clobbered by React on mobile).
    await page.goto("/login");
    await page.waitForTimeout(500);
    await page.getByPlaceholder("Email address").fill("candidate@codepad.test");
    await page.getByPlaceholder("Password").fill("password123");
    const signInBtn = page
      .getByRole("button", { name: "Sign In", exact: true })
      .first();
    await expect(signInBtn).toBeEnabled();
    await signInBtn.click();
    await page.waitForURL((url) => url.pathname === "/");

    await page.goto("/challenges/e2e-harness-add/attempt");
    await expect(page.getByText("E2E Add").first()).toBeVisible({
      timeout: 30000,
    });

    // Submit, retrying once: dev servers compile API routes lazily and can
    // 404 the very first POST (production is prebuilt and unaffected). The
    // button disables itself while a grading run is in flight, so a retry
    // click during a live run is a safe no-op.
    await expect(async () => {
      const submit = page.getByRole("button", { name: "Submit", exact: true });
      if (
        (await page.getByText("Passed — score 100").count()) === 0 &&
        (await submit.isEnabled())
      ) {
        await submit.click();
      }
      await expect(page.getByText("Passed — score 100")).toBeVisible({
        timeout: 10000,
      });
    }).toPass({ timeout: 180000, intervals: [5000, 10000, 15000] });
    await expect(page.getByText("adds positives")).toBeVisible();
  });
});
