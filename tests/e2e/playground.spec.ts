import { test, expect } from "@playwright/test";

/**
 * Playground smoke coverage — the flows that must never silently break:
 * sidebar seeding, file creation, opening, editing through Monaco, and Run
 * output for both runtimes (browser bundler + Piston).
 *
 * The backend assertion adapts to the environment: where Piston
 * (http://localhost:2000) is reachable it asserts real output; otherwise it
 * asserts the graceful "temporarily unavailable" line — a blank or hanging
 * console is the failure either way.
 */

async function pistonUp(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:2000/api/v2/runtimes");
    return res.ok;
  } catch {
    return false;
  }
}

// CI sets PISTON_REQUIRED=1 (executor service + language packs): backend
// specs must then assert real output — never pass silently on the graceful
// "executor unavailable" branch.
async function requirePiston(): Promise<boolean> {
  const up = await pistonUp();
  if (!up && process.env.PISTON_REQUIRED === "1") {
    throw new Error("PISTON_REQUIRED=1 but the executor is unreachable");
  }
  return up;
}

const isMobileSafari = (projectName: string) => projectName === "Mobile Safari";

/** Files live in a slide-over drawer on touch layouts — close it if open. */
async function closeFilesDrawer(page: import("@playwright/test").Page) {
  const overlay = page.locator(".fixed.inset-0").first();
  if (await overlay.isVisible()) {
    await overlay.click({ position: { x: 350, y: 400 } });
    await expect(overlay).toBeHidden();
  }
}

test.describe("playground file lifecycle", () => {
  test("frontend: seed, create, open, edit and see console output", async ({
    page,
  }, testInfo) => {
    await page.goto("/play?template=empty-js");

    // Seeded tree.
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();

    // Bundler + console pipeline works out of the box.
    await expect(
      page.getByText("Hello, JavaScript!").first(),
    ).toBeVisible({ timeout: 60000 });

    // Files drawer on touch layouts; inline sidebar on desktop.
    const newFileBtn = page.getByTitle("New file");
    if (!(await newFileBtn.isVisible())) {
      await page.getByTitle("Files").click();
    }
    await newFileBtn.click();
    const nameInput = page.getByPlaceholder("name.js");
    await nameInput.fill("e2e-check");
    await nameInput.press("Enter");
    const newRow = page.getByText("e2e-check.js", { exact: true }).first();
    await expect(newRow).toBeVisible();

    // Open it (tab appears on desktop; drawer row suffices on mobile).
    await newRow.click();
    if (!isMobileSafari(testInfo.project.name)) {
      await expect(
        page.locator(".monaco-tab", { hasText: "e2e-check.js" }),
      ).toBeVisible();
    }

    if (isMobileSafari(testInfo.project.name)) return;

    // Edit the *entry* file so the log actually executes, then watch it stream.
    await page.getByText("index.js", { exact: true }).first().click();
    await page.locator(".monaco-editor").first().click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type('\nconsole.log("e2e-marker-987");');
    await expect(
      page.getByText("e2e-marker-987").first(),
    ).toBeVisible({ timeout: 60000 });
  });

  test("backend: Run always ends with a definitive console line", async ({
    page,
  }) => {
    const hasPiston = await requirePiston();
    await page.goto("/play?template=python");
    await expect(
      page.getByText("index.py", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Standby").first()).toBeVisible();

    await page.getByRole("button", { name: "Run", exact: true }).click();

    if (hasPiston) {
      await expect(
        page.getByText("Hello, Python!").first(),
      ).toBeVisible({ timeout: 60000 });
      // Run provenance footer carries the resolved runtime version.
      await expect(page.getByTestId("run-meta")).toContainText(/\d+\.\d+/);
    } else {
      // No executor in this environment: the UI must say so, never hang blank.
      await expect(
        page.getByText(/temporarily unavailable/).first(),
      ).toBeVisible({ timeout: 30000 });
    }
  });

  test("backend: sibling files travel with the run payload", async (
    { page },
    testInfo,
  ) => {
    const hasPiston = await requirePiston();
    const canType = testInfo.project.name !== "Mobile Safari";
    await page.goto("/play?template=python");
    await expect(
      page.getByText("index.py", { exact: true }).first(),
    ).toBeVisible();

    const newFileBtn = page.getByTitle("New file");
    if (!(await newFileBtn.isVisible())) {
      await page.getByTitle("Files").click();
    }
    await newFileBtn.click();
    const nameInput = page.getByPlaceholder("name.py");
    await nameInput.fill("helpers");
    await nameInput.press("Enter");
    await expect(
      page.getByText("helpers.py", { exact: true }).first(),
    ).toBeVisible();

    // Capture explicit runs (speculative pre-compiles may also appear).
    const bodies: unknown[] = [];
    await page.route("**/api/execute", async (route) => {
      if (route.request().method() === "POST") {
        try {
          bodies.push(route.request().postDataJSON());
        } catch {
          /* ignore */
        }
      }
      await route.continue();
    });

    if (hasPiston && canType) {
      // True end-to-end proof: siblings resolve server-side at run time.
      await page.getByText("helpers.py", { exact: true }).first().click();
      await page.locator(".monaco-editor").first().click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("VALUE = 21");
      await page.getByText("index.py", { exact: true }).first().click();
      await page.locator(".monaco-editor").first().click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("from helpers import VALUE\nprint(VALUE * 2)");
      await closeFilesDrawer(page);
      await page.getByRole("button", { name: "Run", exact: true }).click();
      await expect(page.getByText("42").first()).toBeVisible({
        timeout: 60000,
      });
    } else {
      // No executor here: verify the payload contract instead.
      // Run the entry file (creating helpers.py made it active).
      await page.getByText("index.py", { exact: true }).first().click();
      await closeFilesDrawer(page);
      await page.getByRole("button", { name: "Run", exact: true }).click();
      // Definitive outcome either way (Piston up or graceful 503).
      await expect(
        page.getByText(/Hello, Python!|temporarily unavailable/).first(),
      ).toBeVisible({ timeout: 60000 });
    }

    const explicit = bodies.filter(
      (b): b is { speculative?: boolean; files?: unknown } =>
        !!b && typeof b === "object",
    ).filter((b) => b.speculative === false);
    expect(explicit.length).toBeGreaterThan(0);
    const last = explicit[explicit.length - 1];
    expect(last.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "helpers.py" }),
      ]),
    );
  });

  test("backend: stdin input travels with the run and persists", async ({
    page,
  }) => {
    await requirePiston();
    await page.goto("/play?template=python");
    await expect(
      page.getByText("index.py", { exact: true }).first(),
    ).toBeVisible();

    const bodies: unknown[] = [];
    await page.route("**/api/execute", async (route) => {
      if (route.request().method() === "POST") {
        try {
          bodies.push(route.request().postDataJSON());
        } catch {
          /* ignore */
        }
      }
      await route.continue();
    });

    await page.getByTitle("Program input (stdin)").click();
    const stdinBox = page.locator(
      'textarea[aria-label="Program input text"]',
    );
    await stdinBox.fill("hello-e2e-stdin");

    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      page.getByText(/Hello, Python!|temporarily unavailable/).first(),
    ).toBeVisible({ timeout: 60000 });

    const explicit = bodies.filter(
      (b): b is { speculative?: boolean; stdin?: unknown } =>
        !!b && typeof b === "object",
    ).filter((b) => b.speculative === false);
    expect(explicit.length).toBeGreaterThan(0);
    expect(explicit[explicit.length - 1].stdin).toBe("hello-e2e-stdin");

    // Draft survives reload and reopens itself.
    await page.reload();
    await expect(
      page.getByText("index.py", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.locator('textarea[aria-label="Program input text"]'),
    ).toHaveValue("hello-e2e-stdin");
  });

  test("editor prefs: option toggles persist across reload", async ({
    page,
  }) => {
    await page.goto("/play?template=empty-js");
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();

    await page.getByTitle("More options").click();
    const formatRow = page.getByRole("button", { name: /Format on save/ });
    await expect(formatRow).toBeVisible();
    expect(await formatRow.getAttribute("aria-pressed")).toBe("false");
    await formatRow.click();
    expect(await formatRow.getAttribute("aria-pressed")).toBe("true");
    const confirmRow = page.getByRole("button", {
      name: /Confirm before delete/,
    });
    expect(await confirmRow.getAttribute("aria-pressed")).toBe("true");
    await confirmRow.click();
    expect(await confirmRow.getAttribute("aria-pressed")).toBe("false");

    await page.reload();
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();
    await page.getByTitle("More options").click();
    expect(
      await page
        .getByRole("button", { name: /Format on save/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      await page
        .getByRole("button", { name: /Confirm before delete/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  test("editor tabs: edited files get a dirty dot", async (
    { page },
    testInfo,
  ) => {
    test.skip(
      testInfo.project.name === "Mobile Safari",
      "Monaco typing is desktop-only",
    );
    await page.goto("/play?template=empty-js");
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator(".monaco-tab[data-dirty]")).toHaveCount(0);

    await page.locator(".monaco-editor").first().click();
    await page.keyboard.type("\n// e2e-dirty-probe");
    await expect(
      page.locator('.monaco-tab[data-dirty="true"]'),
    ).toBeVisible({ timeout: 15000 });
  });

  test("keyboard: F2 renames and Del deletes the active file", async (
    { page },
    testInfo,
  ) => {
    test.skip(
      testInfo.project.name === "Mobile Safari",
      "keyboard shortcuts are desktop-only",
    );
    await page.goto("/play?template=empty-js");
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();

    const newFileBtn = page.getByTitle("New file");
    await newFileBtn.click();
    const nameInput = page.getByPlaceholder("name.js");
    await nameInput.fill("scratch");
    await nameInput.press("Enter");
    const scratchRow = page.getByText("scratch.js", { exact: true }).first();
    await expect(scratchRow).toBeVisible();
    await scratchRow.click();

    await page.keyboard.press("F2");
    const renameInput = page.locator('input[value="scratch.js"]');
    await expect(renameInput).toBeVisible();
    await renameInput.fill("renamed.js");
    // Keyboard-level Enter: the input unmounts on commit mid-press.
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("renamed.js", { exact: true }).first(),
    ).toBeVisible();

    await page.keyboard.press("Delete");
    await expect(
      page.getByText("Are you sure you want to delete 'renamed.js'?"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByText("renamed.js", { exact: true }),
    ).toHaveCount(0);
    // The entry file is untouched — the playground still runs.
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();
  });

  test("layout: dragged editor width persists across reload", async (
    { page },
    testInfo,
  ) => {
    test.skip(
      testInfo.project.name === "Mobile Safari",
      "pixel dividers are desktop-only",
    );
    await page.goto("/play?template=empty-js");
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();

    const divider = page.locator(".ide-divider").nth(1);
    await expect(divider).toBeVisible();
    const box = await divider.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 140, cy, { steps: 12 });
    await page.mouse.up();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("interviewpad_layout:editor"),
    );
    expect(stored).not.toBeNull();
    expect(Number.isFinite(Number(stored))).toBe(true);

    await page.reload();
    await expect(
      page.getByText("index.js", { exact: true }).first(),
    ).toBeVisible();
    const restored = await page.evaluate(() =>
      window.localStorage.getItem("interviewpad_layout:editor"),
    );
    expect(restored).toBe(stored);
  });
});
