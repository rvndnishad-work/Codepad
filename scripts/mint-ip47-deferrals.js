/**
 * Mint IP-47's deferred-item tickets BEFORE coding (per audit policy).
 * Write FOLLOWS_FROM edges so the lineage is queryable.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const TARGET = "P1 Release Target: Jun 2026.";

const tickets = [
  {
    title:
      "Wire email channel for notification preferences (blocked on IP-24 email service)",
    priority: "MEDIUM",
    category: "Email",
    body:
      "IP-47 ships per-type in-app preferences. The email-channel toggle is rendered but disabled with a 'coming with IP-24' tooltip. When IP-24 lands, wire the per-type emailEnabled flag into the email dispatcher so a user who opted out of INTERVIEW_REPLAY_READY emails still gets the bell row but no email. createNotification stays unchanged — the email side branches in the email sender, not the notification table.",
    acceptance: [
      "After IP-24 lands, /profile/notifications email toggles become interactive",
      "Email dispatcher reads NotificationPreference.emailEnabled before sending",
      "EmailLog row records skipped sends with reason=USER_OPTED_OUT",
      "End-to-end test: toggle off → trigger event → bell row created BUT no email sent",
    ],
    ownerNotes: "Blocked on IP-24. " + TARGET,
    followsFrom: "IP-47",
    blockedBy: "IP-24",
  },
  {
    title:
      "Per-workspace notification preference overrides (a recruiter in 2 workspaces can split prefs)",
    priority: "LOW",
    category: "Recruiter",
    body:
      "IP-47 ships preferences scoped to (userId, type). A recruiter member of 'Vercel Engineering' + 'Stripe Hiring' may want TAKE_HOME_SUBMITTED notifications from Stripe but not Vercel. Add an optional workspaceId column to NotificationPreference — when null, the row is the default for that user; when set, it overrides for that specific workspace. createNotification picks the most-specific row.",
    acceptance: [
      "NotificationPreference.workspaceId column added (nullable)",
      "createNotification resolves: workspace-specific row → user default → DEFAULTS[type]",
      "/profile/notifications gets a workspace switcher (or sub-tabs)",
      "Verified: a recruiter in 2 workspaces can split TAKE_HOME_SUBMITTED prefs independently",
    ],
    ownerNotes: "Deferred from IP-47 MVP — wait for actual user demand. " + TARGET,
    followsFrom: "IP-47",
  },
  {
    title:
      "Quiet hours + digest batching for notifications",
    priority: "LOW",
    category: "Platform",
    body:
      "Today every event creates an immediate row. Users may want: (a) a quiet-hours window where notifications are queued + delivered later, and (b) a daily-digest mode where N+ similar notifications collapse into one summary. Both require a delivery queue + a scheduled flusher.",
    acceptance: [
      "User.notificationQuietStart + quietEnd columns (local-time strings)",
      "User.notificationDigestMode enum (OFF | DAILY)",
      "Delivery queue table that holds rows during quiet hours / digest accumulation",
      "Scheduled flusher (extends IP-46 cron) drains the queue at the right time",
      "Bell shows queued count as 'X arriving at 7am' instead of immediate",
    ],
    ownerNotes:
      "Deferred from IP-47 MVP — significant UX research needed before building. " +
      TARGET,
    followsFrom: "IP-47",
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
            addedByEmail: "claude-code (IP-47 deferral mint per audit policy)",
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
      // Write FOLLOWS_FROM
      const parent = await prisma.adminTodo.findUnique({
        where: { ticketKey: t.followsFrom },
        select: { id: true },
      });
      if (parent) {
        await prisma.adminTodoDependency.create({
          data: { fromId: row.id, toId: parent.id, type: "FOLLOWS_FROM" },
        });
      }
      // Write BLOCKED_BY equivalent (edges stored as (blocker, blocked, BLOCKS))
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
