/**
 * IP-27 (take-home email lifecycle) shipped 2026-05-29.
 *   ACs 1-5 done. AC #6 (configurable per-workspace + per-member toggle)
 *   deferred — no workspace-settings infrastructure exists yet; the default-ON
 *   behavior it specifies IS shipped (recruiter notify always fires to
 *   OWNER/ADMIN/INTERVIEWER). Minted IP-83 to add the actual toggle.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const IP27_NOTE =
  "\n\nShipped 2026-05-29:\n" +
  "  - 4 React Email templates: TakeHomeInvite, TakeHomeReminder, TakeHomeSubmittedCandidate, TakeHomeSubmittedRecruiter (registered in src/emails/index.ts).\n" +
  "  - Invite fires from the assign action (src/app/api/w/[slug]/take-home/route.ts), fire-and-forget.\n" +
  "  - Submit fires candidate confirmation + recruiter notify from the attempt route once the score is computed (src/app/api/challenges/[slug]/attempt/route.ts -> src/lib/take-home/emails.ts sendTakeHomeSubmissionEmails). Recipients = OWNER/ADMIN/INTERVIEWER (AC #5).\n" +
  "  - Reminder cron at /api/cron/take-home-reminders (hourly): 24h window, status PENDING|ACTIVE, idempotent via new TakeHomeAssignment.reminderSentAt flag.\n" +
  "  - Verified: all 4 templates rendered + Resend-accepted in a smoke send (ids 2be2c905 / 1515002f / bd5ca8b2 / a72a9480). Cron 401s without secret. tsc clean.\n" +
  "  - AC #6 (configurable toggle) deferred to IP-83 — no per-workspace settings store exists; the default-ON behavior AC #6 describes is the shipped behavior.";

const ip83 = {
  title:
    "Per-workspace + per-member take-home submit-notification settings (IP-27 AC #6)",
  priority: "LOW",
  category: "Recruiter",
  body:
    "IP-27 ships take-home submit notifications that always fire to workspace OWNER/ADMIN/INTERVIEWER (default-ON, which matches the desired default). This ticket adds the configurability AC #6 called for:\n\n" +
    "  - Per-workspace setting: 'send take-home submit notifications' (default ON).\n" +
    "  - Per-member override (default ON).\n\n" +
    "Blocked on there being a workspace-settings store — none exists today (Workspace has no settings/json column, and there's no WorkspaceMemberPreference table). Either add a Workspace.settingsJson blob or a typed settings table, then gate sendTakeHomeSubmissionEmails()'s recruiter fan-out on it. Reuse the notification-preferences pattern (src/lib/notifications/preferences.ts) if it generalizes.",
  acceptance: [
    "Workspace-level toggle 'send take-home submit notifications' (default ON) persisted and editable in workspace settings UI",
    "Per-member override (default ON) so an individual recruiter can opt out without changing the workspace default",
    "sendTakeHomeSubmissionEmails() recruiter fan-out respects both the workspace toggle and per-member override",
    "Candidate confirmation email is unaffected by these toggles (always sent)",
  ],
  ownerNotes:
    "Split from IP-27 AC #6 on 2026-05-29 — the lifecycle emails shipped, but the configurable toggle needs a settings store that doesn't exist yet. RELATES_TO IP-27.",
};

(async () => {
  const p = new PrismaClient();
  try {
    // 1. Update IP-27.
    const t = await p.adminTodo.findUnique({ where: { ticketKey: "IP-27" } });
    if (!t) throw new Error("IP-27 not found");
    const ac = JSON.parse(t.acceptanceCriteria || "[]");
    [0, 1, 2, 3, 4].forEach((i) => ac[i] && (ac[i].done = true)); // ACs 1-5
    await p.adminTodo.update({
      where: { ticketKey: "IP-27" },
      data: {
        acceptanceCriteria: JSON.stringify(ac),
        ownerNotes: (t.ownerNotes || "") + IP27_NOTE,
        status: "DONE",
        completedAt: new Date(),
      },
    });
    console.log(`IP-27: ${ac.filter((a) => a.done).length}/${ac.length} ACs ticked, status -> DONE`);

    // 2. Mint IP-83 follow-up.
    const { row } = await p.$transaction(async (tx) => {
      const last = await tx.adminTodo.findFirst({
        where: { ticketSeq: { not: null } },
        orderBy: { ticketSeq: "desc" },
        select: { ticketSeq: true },
      });
      const nextSeq = (last?.ticketSeq ?? 0) + 1;
      const row = await tx.adminTodo.create({
        data: {
          title: ip83.title,
          body: ip83.body,
          priority: ip83.priority,
          category: ip83.category,
          status: "BACKLOG",
          addedByEmail: "claude-code (IP-27 AC#6 split 2026-05-29)",
          ticketSeq: nextSeq,
          ticketKey: `IP-${nextSeq}`,
          acceptanceCriteria: JSON.stringify(ip83.acceptance.map((text) => ({ text, done: false }))),
          ownerNotes: ip83.ownerNotes,
        },
      });
      return { row };
    });
    console.log(`Minted ${row.ticketKey}: ${row.title}`);

    // RELATES_TO edge IP-83 -> IP-27.
    const from = await p.adminTodo.findUnique({ where: { ticketKey: row.ticketKey }, select: { id: true } });
    const to = await p.adminTodo.findUnique({ where: { ticketKey: "IP-27" }, select: { id: true } });
    if (from && to) {
      await p.adminTodoDependency.create({ data: { fromId: from.id, toId: to.id, type: "RELATES_TO" } });
      console.log(`  ${row.ticketKey} --RELATES_TO--> IP-27`);
    }
  } finally {
    await p.$disconnect();
  }
})();
