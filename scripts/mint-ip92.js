/**
 * Mint IP-92 (BACKLOG) — challenge/take-home attempt surface should branch by
 * challenge type. Reported 2026-05-30 after starting a seed React take-home
 * ("React: Build a paginated user list") and landing in the DSA console/test
 * view instead of a playground (file-tree + live preview) surface.
 * RELATES_TO IP-91 (session-runner prompt/playground surfaces — this is the
 * rendering foundation it assumes), IP-60 (playground test-file execution),
 * and the epic IP-87.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();
  try {
    const last = await p.adminTodo.findFirst({
      where: { ticketSeq: { not: null } },
      orderBy: { ticketSeq: "desc" },
      select: { ticketSeq: true },
    });
    const seq = (last?.ticketSeq ?? 0) + 1;

    const row = await p.adminTodo.create({
      data: {
        title:
          "Attempt surface should branch by challenge type — playground & prompt challenges render the DSA console view",
        body:
          "The shared challenge attempt surface (src/app/challenges/[slug]/attempt/ChallengeAttemptClient.tsx) renders one hardcoded DSA layout for every challenge regardless of its template: a single-file Monaco editor + a Console/Tests sidebar (SandpackProvider + SandpackTests; sidebarTab is only 'console'|'tests'). There is no SandpackPreview, no file explorer, and no prompt surface. The `template` prop is threaded in (activeStep.template) but only feeds Sandpack's environment id — it does not drive surface/layout selection.\n\n" +
          "Repro: start a take-home for a `react` challenge (seed 'React: Build a paginated user list', /take-home/[token] -> /challenges/[slug]/attempt?token=). It opens the DSA console/test view (index.ts + a 'twoSum([2,7,11,15], 9)' custom-run placeholder) instead of a React playground surface (file tree + live Preview/Split/Console like /play). Screenshots attached to the report.\n\n" +
          "Expected: the attempt surface should be selected by challenge type — (1) DSA (test-ts/test-js style) -> current console + tests runner; (2) playground/frontend (react, vanilla, and other app templates) -> file-tree + editor + live Preview (Preview/Split/Console) like the /play playground, with submission recording the candidate's files for manual review; (3) prompt challenges -> the prompt-arena attempt surface (prompt input + AI grading), not a code editor.\n\n" +
          "Scope/impact: affects the public /challenges/[slug]/attempt flow AND the legacy /take-home/[token] runner, and is the rendering foundation IP-91 assumes (IP-91 wires prompt/playground questions into the new session-backed runner checklist but presumes runnable surfaces exist). Consider whether the playground surface should reuse the /play editor (PlaygroundClient) vs. extend ChallengeAttemptClient with a preview tab + file explorer.",
        priority: "HIGH",
        category: "Candidate",
        status: "BACKLOG",
        addedByEmail: "claude-code (reported 2026-05-30 — React take-home rendered DSA view)",
        ticketSeq: seq,
        ticketKey: `IP-${seq}`,
        acceptanceCriteria: JSON.stringify([
          { text: "Attempt surface selects its rendering from the challenge/step type: DSA -> console + tests runner; playground/frontend -> file-tree + editor + live Preview; prompt -> prompt-arena input + AI grading", done: false },
          { text: "A react/playground take-home (e.g. seed 'React: Build a paginated user list') launches into a playground surface with live preview + multi-file tree, NOT the DSA console view", done: false },
          { text: "Prompt challenges launch into the prompt input + AI-grading surface, not a code editor", done: false },
          { text: "DSA challenges unchanged — console + tests runner still works and auto-grades", done: false },
          { text: "Submission records the right artifact per type (DSA testResults/score; playground files for manual review; prompt -> PromptAttempt)", done: false },
          { text: "Verified end-to-end via a take-home token for one challenge of each type (DSA, playground, prompt)", done: false },
        ]),
        ownerNotes:
          "Confirmed in code: ChallengeAttemptClient.tsx imports SandpackProvider + SandpackTests only (no SandpackPreview / SandpackFileExplorer); sidebarTab state is union 'console'|'tests'; `template` prop unused for layout. The attempt page (attempt/page.tsx) reads starter/test files off the step and requires steps.length>0. RELATES_TO IP-91 (prompt/playground execution surfaces in the session runner), IP-60 (playground test-file execution infra), IP-87 (multi-question take-home epic). Note: legacy single-challenge take-home is slated for retirement in IP-90, but the public /challenges attempt flow keeps this surface, so the branching belongs here regardless.",
      },
    });

    for (const to of ["IP-91", "IP-60", "IP-87"]) {
      const t = await p.adminTodo.findUnique({ where: { ticketKey: to }, select: { id: true } });
      if (t) {
        await p.adminTodoDependency.create({
          data: { fromId: row.id, toId: t.id, type: "RELATES_TO" },
        });
      }
    }

    console.log(`Minted ${row.ticketKey} (${row.status}): ${row.title}`);
    console.log(`  links: RELATES_TO IP-91, IP-60, IP-87`);
  } finally {
    await p.$disconnect();
  }
})();
