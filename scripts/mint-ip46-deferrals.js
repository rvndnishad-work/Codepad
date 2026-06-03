/**
 * Mint IP-46's deferred-item tickets BEFORE coding (per user audit policy).
 * Also write the FOLLOWS_FROM edges so the lineage is queryable.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  {
    title:
      "Production cron scheduler config — wire IP-46 endpoints to Vercel Cron / GitHub Actions",
    priority: "MEDIUM",
    category: "Platform",
    body:
      "IP-46 ships the cron endpoints + CRON_SECRET auth. Actually scheduling them on a recurring basis requires platform-specific config: vercel.json crons for Vercel deploy, or .github/workflows/cron-notifications.yml for GitHub Actions, or a Cloudflare Worker. Pick based on actual deploy target. Recommended cadence: take-home-expiring every 15m, stale-scorecards every 2h, ai-credits-sweep every 1h.",
    acceptance: [
      "Decide deploy target (Vercel / GH Actions / Cloudflare / other)",
      "Commit the relevant config file with the chosen cadence",
      "First scheduled invocation logged + confirmed in production",
      "Document the cadence + rationale in docs/cron-schedule.md",
    ],
    ownerNotes: "Deferred from IP-46 — platform-specific. " + TARGET,
    followsFrom: "IP-46",
  },
  {
    title: "Admin observability for cron notification runs",
    priority: "LOW",
    category: "Platform",
    body:
      "Today the cron handlers log to console + return a JSON summary. Add a CronRun table that records each invocation (task name, startedAt, durationMs, notificationsFired, errorMessage). Surface in /admin via a small panel: 'Cron health — last 24h'. Helps catch silent regressions where a cron stopped running.",
    acceptance: [
      "CronRun schema (task, startedAt, finishedAt, notificationsFired, errorMessage)",
      "Each handler writes a row before returning",
      "/admin shell shows a Cron Health card with last-run + status per task",
      "Alert (Gemma copilot or email) if any task hasn't run in 2× its expected interval",
    ],
    ownerNotes: "Deferred from IP-46 MVP. " + TARGET,
    followsFrom: "IP-46",
  },
  {
    title: "Retry queue for transient cron failures",
    priority: "LOW",
    category: "Platform",
    body:
      "Today: a transient DB error in a cron handler logs and the loop continues. Adding a NotificationDispatchQueue table lets failed dispatches retry on the next cron tick with exponential backoff + dead-letter after N attempts. Useful when downstream services (email, webhook) become flaky.",
    acceptance: [
      "NotificationDispatchQueue schema (payload, attempts, nextAttemptAt, lastError)",
      "Failed createNotification call writes a queue row instead of dropping",
      "Cron handler drains the queue at the start of each run",
      "Dead-letter after 5 attempts; admin surface lists dead-letters",
    ],
    ownerNotes: "Deferred from IP-46 MVP — premature without observed flakiness. " + TARGET,
    followsFrom: "IP-46",
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
            addedByEmail: "claude-code (IP-46 deferral mint per audit policy)",
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

      // Write the FOLLOWS_FROM edge to the parent (IP-46).
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
