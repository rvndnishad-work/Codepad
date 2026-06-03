/**
 * Two passes (2026-05-29):
 *
 *   1. IP-25 ships → mark all 6 ACs done, status DONE.
 *
 *   2. Audit close of stale IN_PROGRESS tickets where the primary spec is
 *      fully implemented and the remaining AC is tracked in a dedicated
 *      follow-up ticket. We tick "implemented" ACs and leave the deferred AC
 *      unticked (honest), but flip status to DONE since the work is captured
 *      in the follow-up.
 *
 *      IP-40 (notification center) — AC 6 (email channel) → IP-66
 *      IP-42 (TOTP 2FA)            — AC 7 (OAuth path)    → IP-54
 *      IP-44 (notification triggers)— AC 5 (INTERVIEW_SCHEDULED schema) → IP-56
 *      IP-38 (mobile lobby)        — AC 5 (Lighthouse ≥90 measurement) → IP-51
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const updates = [
  {
    key: "IP-25",
    note:
      "\n\nShipped 2026-05-29:\n" +
      "  - Schema: EmailLog (status enum + workspaceId/sessionId/providerId), EmailSuppression (address unique, reason). prisma db push applied.\n" +
      "  - sendEmail() writes queued row pre-dispatch and updates to sent/failed/suppressed. Suppression short-circuits BEFORE rendering / dispatching.\n" +
      "  - /api/webhooks/resend verifies the Resend-Svix HMAC signature, joins on providerId, advances status (delivered → opened → clicked, or bounced/complained terminal). Hard-bounce + complaint auto-add the address to EmailSuppression.\n" +
      "  - /admin/emails: last-100 sends table + per-status rollup + suppression list. Wired into AdminSidebar (System group).\n" +
      "  - End-to-end verified via dev-only smoke: normal send → status=sent, providerId set; suppressed send → status=suppressed, no Resend POST; Resend returned id 90b8cfff-… on the real send.\n" +
      "  - .env.example documents RESEND_WEBHOOK_SECRET; without it the webhook route 503s (secure-by-default).\n" +
      "  - 503/401/200 status surface verified.",
    tickAll: true,
  },
  {
    key: "IP-40",
    note:
      "\n\nClosed 2026-05-29 (audit pass). All primary ACs (1-5, 7, 8) implemented and verified in code: Bell + dropdown + APIs ship; per-type preferences UI lives at /profile/notifications (IP-47); triggers are wired across the codebase (IP-44). Only AC 6 (email-channel routing) remains and is tracked by IP-66 (BACKLOG) — it lights up once the email service deliverability work is fully landed.",
    tickIdx: [0, 1, 2, 3, 4, 6, 7],
    status: "DONE",
  },
  {
    key: "IP-42",
    note:
      "\n\nClosed 2026-05-29 (audit pass). ACs 1-6 implemented (encrypted secrets, /profile/security enrollment, login-time enforcement, audit log, forced-enrollment gate). AC 7 (OAuth 2FA path) is tracked by IP-54; direction recorded there: post-OAuth TOTP challenge step (rather than rejecting OAuth, to avoid passwordless lockout).",
    status: "DONE",
  },
  {
    key: "IP-44",
    note:
      "\n\nClosed 2026-05-29 (audit pass). 8 of 9 trigger sources wired (take-home submit, interview replay-ready, scorecard needed, prompt upvoted, AI credits low, 2FA enrolled/disabled, etc.) — each verified end-to-end. AC 5 (INTERVIEW_SCHEDULED) intentionally deferred at ticket creation time because InterviewSession lacks candidateEmail; that schema work is tracked by IP-56 (BACKLOG).",
    status: "DONE",
  },
  {
    key: "IP-38",
    note:
      "\n\nClosed 2026-05-29 (audit pass). Primary lobby (ACs 1-4) ships: device.ts UA helper, mobile lobby on take-home + interview + ai-interview entry routes, QR + 'email me the link', token-stable across viewport switch. AC 5 (Lighthouse mobile a11y + perf ≥90 measurement) is tracked by IP-51 (BACKLOG) — measurement is a separate workstream from feature ship.",
    tickIdx: [0, 1, 2, 3],
    status: "DONE",
  },
];

(async () => {
  const p = new PrismaClient();
  try {
    for (const u of updates) {
      const t = await p.adminTodo.findUnique({ where: { ticketKey: u.key } });
      if (!t) {
        console.log(`  (skip ${u.key}: not found)`);
        continue;
      }
      const ac = JSON.parse(t.acceptanceCriteria || "[]");
      if (u.tickAll) ac.forEach((a) => (a.done = true));
      if (u.tickIdx) u.tickIdx.forEach((i) => ac[i] && (ac[i].done = true));

      const data = {
        acceptanceCriteria: JSON.stringify(ac),
        ownerNotes: (t.ownerNotes || "") + u.note,
      };
      if (u.status === "DONE") {
        data.status = "DONE";
        data.completedAt = new Date();
      }

      await p.adminTodo.update({ where: { ticketKey: u.key }, data });
      const done = ac.filter((a) => a.done).length;
      console.log(`  ${u.key}: ${done}/${ac.length} ACs ticked, status -> ${data.status ?? t.status}`);
    }
  } finally {
    await p.$disconnect();
  }
})();
