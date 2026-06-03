/**
 * Mint IP-37's deferred-item tickets BEFORE coding (per audit policy).
 * Write FOLLOWS_FROM edges so the lineage is queryable.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  {
    title:
      "Workspace audit log: wire remaining writers (settings, ATS, individual TH, AI screening, member changes, etc.)",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "IP-37 MVP wires writeWorkspaceAuditEntry at 3 high-value sites (pipeline stage transitions, bulk take-home dispatch, ATS connect/disconnect). The remaining surfaces that mutate workspace state still need to write audit rows for full coverage: workspace settings save, individual take-home dispatch, AI interview session create/start/complete, MCP API key rotate/revoke, member add/remove/role-change, candidate manual add via dialog, CSV import, challenge create/publish. Each is a one-line helper call but lives in a different file; ~10-12 wires total.",
    acceptance: [
      "Workspace settings save → audit row (action=WORKSPACE_SETTINGS_UPDATED)",
      "Individual take-home dispatch → audit row (action=TAKE_HOME_DISPATCHED)",
      "AI interview create → audit row (action=AI_INTERVIEW_INVITED)",
      "AI interview session complete → audit row (action=AI_INTERVIEW_COMPLETED)",
      "MCP API key created/rotated/revoked → audit rows",
      "WorkspaceMember add/remove/role-change → audit rows",
      "Candidate manual add (via dialog) → audit row",
      "Bulk CSV import → audit row with count",
      "Challenge create/publish (workspace-scoped) → audit row",
      "Verified: every workspace-mutating action shows up in /w/[slug]/audit",
    ],
    ownerNotes: "Deferred from IP-37 MVP — mechanical work, low risk. " + TARGET,
    followsFrom: "IP-37",
  },
  {
    title:
      "Merge McpAuditLog into the workspace audit view (unified type discriminator)",
    priority: "LOW",
    category: "Recruiter",
    body:
      "IP-37 ships WorkspaceAuditLog as a sibling of the existing McpAuditLog. For recruiters investigating an incident, they currently have to flip between two surfaces. This follow-up adds either: (a) a 'source' tab on /w/[slug]/audit toggling between workspace events and MCP events, OR (b) a unified read query that returns both keyed by a common type discriminator. Approach (a) is simpler; (b) is what an enterprise customer would want.",
    acceptance: [
      "Decide between tab-style or unified-query approach",
      "Audit UI shows both workspace events AND MCP events in one timeline (or sibling tabs)",
      "Filters work across both data sources",
      "CSV export covers both",
    ],
    ownerNotes: "Deferred from IP-37 MVP. " + TARGET,
    followsFrom: "IP-37",
  },
  {
    title:
      "Real-time audit log updates (SSE / poll) for incident-response UX",
    priority: "LOW",
    category: "Recruiter",
    body:
      "IP-37 MVP reloads on filter change. For active incident response ('did the suspicious action just happen?'), recruiters want auto-refresh. Add: 30s poll on the /audit page that pulls only newer-than-cursor rows, prepend to the list with a 'new' highlight that fades after 5s. Lightweight — no SSE/WebSocket needed, just a smart fetch.",
    acceptance: [
      "Page polls /api/w/[slug]/audit?since=<cursor> every 30s",
      "New rows prepended with a brief highlight animation",
      "Filter changes pause the poll and reset the cursor",
      "Visible '5 new since you opened this' toast when scroll position is non-zero",
    ],
    ownerNotes: "Deferred from IP-37 MVP — nice-to-have, not critical. " + TARGET,
    followsFrom: "IP-37",
  },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    const created = [];
    for (const t of tickets) {
      const { row } = await prisma.$transaction(async (tx) => {
        const last = await tx.adminTodo.findFirst({
          where: { ticketSeq: { not: null } },
          orderBy: { ticketSeq: "desc" },
          select: { ticketSeq: true },
        });
        const nextSeq = (last?.ticketSeq ?? 0) + 1;
        const row = await tx.adminTodo.create({
          data: {
            title: t.title,
            body: t.body,
            priority: t.priority,
            category: t.category,
            status: "BACKLOG",
            addedByEmail: "claude-code (IP-37 deferral mint per audit policy)",
            ticketSeq: nextSeq,
            ticketKey: `IP-${nextSeq}`,
            acceptanceCriteria: JSON.stringify(
              t.acceptance.map((text) => ({ text, done: false })),
            ),
            ownerNotes: t.ownerNotes,
          },
        });
        return { row };
      });
      created.push(row);

      const parent = await prisma.adminTodo.findUnique({
        where: { ticketKey: t.followsFrom },
        select: { id: true },
      });
      if (parent) {
        await prisma.adminTodoDependency.create({
          data: { fromId: row.id, toId: parent.id, type: "FOLLOWS_FROM" },
        });
      }
    }
    console.log(JSON.stringify(
      created.map((r) => ({ key: r.ticketKey, pri: r.priority, title: r.title.slice(0, 90) })),
      null, 2,
    ));
  } finally {
    await prisma.$disconnect();
  }
})();
