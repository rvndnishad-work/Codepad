/**
 * Screening decisions, end to end: a recruiter may pass anyone, but a pass
 * over results below the bar must be confirmed as a manual override and is
 * labelled as one afterwards. Nothing else may pass a candidate.
 */
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const testDbUrl = "postgresql://postgres:postgres@localhost:5432/codepad_test";
const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

const slug = `e2e-screening-${Date.now().toString(36)}`;
const ids: Record<string, string> = {};

async function signIn(page: Page) {
  await page.goto("/login");
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Email address").fill("recruiter@codepad.test");
  await page.getByPlaceholder("Password").fill("password123");
  await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

const decisionCard = (page: Page) => page.getByRole("list", { name: "Screening" }).getByRole("listitem").last();

test.describe("Screening decisions", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    // Workspace roles carry the pipeline permission the Pass button needs.
    execSync("npx tsx prisma/seed-roles.ts", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDbUrl, DIRECT_URL: testDbUrl },
    });
    const recruiter = await prisma.user.findUniqueOrThrow({ where: { email: "recruiter@codepad.test" } });
    const ws = await prisma.workspace.create({ data: { name: "E2E Screening", slug } });
    await prisma.workspaceMember.create({ data: { workspaceId: ws.id, userId: recruiter.id, role: "OWNER" } });
    const template = await prisma.aIInterviewTemplate.create({
      data: { workspaceId: ws.id, title: "Frontend screen", description: "React basics", starterFiles: "{}", testsCode: "" },
    });
    const day = 86400000;
    const people: { key: string; name: string; stage: string; score: number | null }[] = [
      { key: "notFit", name: "Nia Fontaine", stage: "SCREENING", score: 5 },
      { key: "notFitApi", name: "Omar Haddad", stage: "SCREENING", score: 12 },
      { key: "strong", name: "Sol Bakker", stage: "SCREENING", score: 88 },
      // The reported case: moved to Offer on the old board, now Passed, with
      // a Not a fit screening.
      { key: "migrated", name: "Ravi Menon", stage: "PASSED", score: 5 },
    ];
    for (const p of people) {
      const c = await prisma.candidate.create({
        data: {
          workspaceId: ws.id,
          name: p.name,
          email: `${p.key.toLowerCase()}@${slug}.test`,
          stage: p.stage,
          status: p.stage === "PASSED" ? "passed" : "active",
          stageChangedAt: new Date(Date.now() - 2 * day),
        },
      });
      ids[p.key] = c.id;
      await prisma.aIInterviewSession.create({
        data: {
          workspaceId: ws.id,
          candidateId: c.id,
          candidateName: p.name,
          candidateEmail: c.email!,
          positionTitle: "Lead Frontend Engineer",
          chatHistory: "[]",
          filesJson: "{}",
          templateId: template.id,
          status: "COMPLETED",
          score: p.score,
          inviteToken: `${slug}-${p.key}`,
          startedAt: new Date(Date.now() - 3 * day),
          finishedAt: new Date(Date.now() - 3 * day),
        },
      });
    }
  });

  test.afterAll(async () => {
    const ws = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
    if (ws) {
      await prisma.aIInterviewSession.deleteMany({ where: { workspaceId: ws.id } }).catch(() => {});
      await prisma.aIInterviewTemplate.deleteMany({ where: { workspaceId: ws.id } }).catch(() => {});
      await prisma.candidate.deleteMany({ where: { workspaceId: ws.id } }).catch(() => {});
      await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a Passed candidate with a Not a fit screening reads as a manual override", async ({ page }) => {
    await page.goto(`/w/${slug}/candidates/${ids.migrated}`);
    const card = decisionCard(page);
    await expect(card).toContainText("Passed");
    await expect(card).toContainText("Manual override");
    await expect(page.getByRole("list", { name: "Screening" })).toContainText("Not a fit");
  });

  test("passing a Not a fit candidate asks to confirm a manual override", async ({ page }) => {
    await page.goto(`/w/${slug}/candidates/${ids.notFit}`);
    await expect(decisionCard(page)).toContainText("No decision yet");

    await page.getByRole("button", { name: "Pass", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Pass Nia Fontaine as a manual override?");
    await expect(dialog).toContainText("AI screening 5, Not a fit");

    // Cancelling leaves the candidate undecided.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(decisionCard(page)).toContainText("No decision yet");

    await page.getByRole("button", { name: "Pass", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Pass anyway" }).click();
    await expect(decisionCard(page)).toContainText("Manual override", { timeout: 15000 });
    await expect(decisionCard(page)).toContainText("Test Recruiter");
    await expect(page.getByText("Passed as a manual override").first()).toBeVisible();

    const row = await prisma.candidate.findUniqueOrThrow({ where: { id: ids.notFit } });
    expect(row.stage).toBe("PASSED");
  });

  test("a candidate who clears the bar passes without an override", async ({ page }) => {
    await page.goto(`/w/${slug}/candidates/${ids.strong}`);
    await page.getByRole("button", { name: "Pass", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(decisionCard(page)).toContainText("Passed", { timeout: 15000 });
    await expect(decisionCard(page)).not.toContainText("Manual override");
  });

  test("the server refuses an unconfirmed pass over failing results", async ({ page }) => {
    const res = await page.request.patch(`/api/w/${slug}/candidates/bulk`, {
      data: { ids: [ids.notFitApi], op: { action: "stage", stage: "PASSED" } },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toContain("Confirm the pass as a manual override");
    expect((await prisma.candidate.findUniqueOrThrow({ where: { id: ids.notFitApi } })).stage).toBe("SCREENING");

    // New candidates cannot start as Passed through the API either.
    const create = await page.request.post(`/api/w/${slug}/candidates`, {
      data: { name: "Pat Imported", email: `pat@${slug}.test`, stage: "PASSED" },
    });
    expect(create.status()).toBe(400);
  });

  test("the list flags a manual pass", async ({ page }) => {
    await page.goto(`/w/${slug}/candidates`);
    const row = page.getByRole("row").filter({ hasText: "Ravi Menon" });
    await expect(row).toContainText("Manual pass");
  });
});
