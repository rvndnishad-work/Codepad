/**
 * Mint IP-84 (DONE) — workspace Email activity view. Shipped inline from the
 * IP-27 "admin vs workspace" design discussion (2026-05-29), recorded here so
 * the board reflects reality. RELATES_TO IP-25 (EmailLog) + IP-27.
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
        title: "Workspace Email activity view — recruiter-facing, workspace-scoped EmailLog",
        body:
          "Recruiters need to see whether their candidates received/opened/bounced workspace emails, without the platform-wide admin view. Shipped /w/[slug]/emails: OWNER/ADMIN-gated, scoped to workspaceId, status rollup + last-100 sends; the global suppression list is intentionally excluded (cross-workspace, admin-only). Also backfilled workspaceId attribution onto all workspace-scoped sends so their EmailLog rows surface here.",
        priority: "MEDIUM",
        category: "Recruiter",
        status: "DONE",
        completedAt: new Date(),
        addedByEmail: "claude-code (shipped from IP-27 design discussion 2026-05-29)",
        ticketSeq: seq,
        ticketKey: `IP-${seq}`,
        acceptanceCriteria: JSON.stringify([
          { text: "/w/[slug]/emails route, OWNER/ADMIN-gated like the audit log", done: true },
          { text: "Scoped strictly to workspaceId; global suppression list not exposed", done: true },
          { text: "Status rollup + recent sends table with friendly template labels", done: true },
          { text: "All workspace-scoped sends carry workspaceId so rows are attributable", done: true },
          { text: "Sidebar link under the Settings group", done: true },
        ]),
        ownerNotes:
          "Spun from the IP-27 admin-vs-workspace design question. RELATES_TO IP-25 (EmailLog) + IP-27 (take-home emails).",
      },
    });
    for (const to of ["IP-25", "IP-27"]) {
      const t = await p.adminTodo.findUnique({ where: { ticketKey: to }, select: { id: true } });
      if (t) {
        await p.adminTodoDependency.create({ data: { fromId: row.id, toId: t.id, type: "RELATES_TO" } });
      }
    }
    console.log(`Minted ${row.ticketKey} (DONE): ${row.title}`);
    console.log(`  ${row.ticketKey} --RELATES_TO--> IP-25, IP-27`);
  } finally {
    await p.$disconnect();
  }
})();
