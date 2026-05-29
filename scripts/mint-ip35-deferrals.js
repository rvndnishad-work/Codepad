/**
 * Mint IP-35's deferred-item tickets BEFORE coding (per audit policy).
 * Write FOLLOWS_FROM + BLOCKS edges so the lineage is queryable.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  {
    title:
      "Email throttling + delivery cooperation for bulk take-home dispatch (blocked on IP-24)",
    priority: "MEDIUM",
    category: "Recruiter",
    body:
      "IP-35 ships the bulk-dispatch action + leaderboard. The actual email side currently no-ops (IP-24 hasn't shipped Resend yet). When it does, the bulk path needs: per-workspace daily send cap, exponential backoff on transient bounces, suppression-list awareness (don't re-mail bounced candidates), and a small in-app delivery summary 'X sent / Y suppressed / Z bounced' alongside each bulk dispatch.",
    acceptance: [
      "Bulk dispatch reads workspace's daily-send cap from settings and refuses past it",
      "Suppression list (IP-25) honored — bounced emails skipped with reason logged",
      "Exponential backoff on transient transport errors (retry up to 3x)",
      "Per-bulk-dispatch delivery summary visible on /w/[slug]/leaderboard",
    ],
    ownerNotes: "Blocked on IP-24/IP-25 email service + suppression. " + TARGET,
    followsFrom: "IP-35",
    blockedBy: "IP-24",
  },
  {
    title:
      "BulkTakeHomeDispatch parent table — group + resend + view-as-batch",
    priority: "LOW",
    category: "Recruiter",
    body:
      "IP-35 MVP doesn't formally group dispatches — the leaderboard shows individual rows. This follow-up adds a BulkTakeHomeDispatch parent (composedById, challengeId, audienceCount, dispatchedAt, summary) with takeHomeAssignment.bulkDispatchId FK. Enables: 'view this batch as a group', 'resend this batch (to non-submitters only)', and 'cancel pending dispatches' if a recruiter changes their mind early.",
    acceptance: [
      "BulkTakeHomeDispatch model + TakeHomeAssignment.bulkDispatchId column",
      "Bulk dispatch action stamps every fanned-out row with the parent id",
      "/w/[slug]/leaderboard 'Group by batch' toggle",
      "Resend-to-non-submitters action",
      "Cancel-pending action (only valid while rows are still PENDING)",
    ],
    ownerNotes: "Deferred from IP-35 MVP. " + TARGET,
    followsFrom: "IP-35",
  },
  {
    title:
      "Advanced leaderboard filters + saved views (multi-challenge, date range, stage, tags)",
    priority: "LOW",
    category: "Recruiter",
    body:
      "IP-35 MVP gives sort by score / time-to-submit + a single-challenge filter. Recruiters running multiple roles concurrently want: filter by challenge (multi), date range, candidate stage (IP-34), candidate tags (IP-34). Plus saved view presets ('This week's Frontend submissions', etc).",
    acceptance: [
      "Multi-select challenge filter on leaderboard",
      "Date range filter on dispatchedAt + submittedAt",
      "Stage + tags filters pull from Candidate model",
      "Saved view presets per user",
      "URL state syncs with filters so views are shareable",
    ],
    ownerNotes: "Deferred from IP-35 MVP — wait for actual recruiter feedback before building. " + TARGET,
    followsFrom: "IP-35",
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
            addedByEmail: "claude-code (IP-35 deferral mint per audit policy)",
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
      if (t.blockedBy) {
        const blocker = await prisma.adminTodo.findUnique({
          where: { ticketKey: t.blockedBy },
          select: { id: true },
        });
        if (blocker) {
          await prisma.adminTodoDependency.create({
            data: { fromId: blocker.id, toId: row.id, type: "BLOCKS" },
          });
        }
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
