/**
 * Mint IP-85 (DONE) — workspace-launched interview builder fixes. Reported
 * directly (2026-05-29) while reviewing the "New interview" flow from the
 * workspace assessments tab. Recorded here so the board reflects the work.
 * RELATES_TO IP-75 (workspace nav) + IP-6 (AI interviews / builder area).
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
        title: "Workspace-launched interview builder — back-nav, workspace questions, locked role/class",
        body:
          "Issues found reviewing /interview/new launched from a workspace's assessments tab (?workspaceSlug=): (1) Back link hardcoded to the personal /interview page instead of returning to the workspace. (2) Question pickers only showed the global bank — a workspace's own challenges/prompt scenarios weren't surfaced. (3) Arena role + session class were editable and could be set to nonsensical values (Candidate/Mock) for a workspace interview. Plus a search-input padding bug (icon overlapping placeholder).",
        priority: "MEDIUM",
        category: "Recruiter",
        status: "DONE",
        completedAt: new Date(),
        addedByEmail: "claude-code (reported during builder review 2026-05-29)",
        ticketSeq: seq,
        ticketKey: `IP-${seq}`,
        acceptanceCriteria: JSON.stringify([
          { text: "Back link returns to /w/[slug]?section=assessments&view=interviews when launched from a workspace", done: true },
          { text: "Workspace-owned challenges + prompt scenarios surface on top of the global bank, membership-checked, with a Workspace badge", done: true },
          { text: "Role + session class locked to Interviewer · Live Session (read-only) for workspace launches", done: true },
          { text: "Search input padding fixed (pl-9.5 -> pl-10); placeholder no longer overlaps the icon", done: true },
        ]),
        ownerNotes:
          "Fixed in src/app/interview/new/{page.tsx,InterviewBuilder.tsx}. tsc clean; route compiles. Not visually verified in a logged-in session (offered). RELATES_TO IP-75 + IP-6.",
      },
    });
    for (const to of ["IP-75", "IP-6"]) {
      const t = await p.adminTodo.findUnique({ where: { ticketKey: to }, select: { id: true } });
      if (t) await p.adminTodoDependency.create({ data: { fromId: row.id, toId: t.id, type: "RELATES_TO" } });
    }
    console.log(`Minted ${row.ticketKey} (DONE): ${row.title}`);
  } finally {
    await p.$disconnect();
  }
})();
