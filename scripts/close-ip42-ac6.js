/**
 * IP-42 AC #6 (forced 2FA enrollment gate) shipped. This script:
 *   - ticks acceptance item #6 done on IP-42 and appends an owner note
 *   - marks IP-53 DONE (it captured the same forced-enrollment work)
 *   - leaves IP-42 IN_PROGRESS (AC #7 / OAuth still open, tracked by IP-54)
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const NOTE =
  "\n\nAC #6 shipped 2026-05-29 (forced-enrollment gate): src/lib/totp-gate.ts " +
  "(ensureTotpEnrolledOrRedirect + PAID_PLANS/WORKSPACE_ADMIN_ROLES). Gated at the " +
  "server layouts — admin/layout.tsx (admins always) and w/[slug]/layout.tsx " +
  "(OWNER/ADMIN of GROWTH/ENTERPRISE workspaces). Unenrolled users redirect to " +
  "/profile/security?enroll=required, where SecurityClient shows a required banner. " +
  "Chose layout gates over edge middleware to keep Prisma server-side and dodge " +
  "NextAuth-v5 JWE/edge fragility. AC #7 (OAuth 2FA) deferred to IP-54 — direction: " +
  "post-OAuth TOTP challenge step (don't reject OAuth, avoids passwordless lockout).";

(async () => {
  const p = new PrismaClient();
  try {
    const ip42 = await p.adminTodo.findUnique({ where: { ticketKey: "IP-42" } });
    if (!ip42) throw new Error("IP-42 not found");
    const ac = JSON.parse(ip42.acceptanceCriteria || "[]");
    const item = ac.find((a) => /Forced enrollment/i.test(a.text));
    if (item) item.done = true;
    await p.adminTodo.update({
      where: { ticketKey: "IP-42" },
      data: {
        acceptanceCriteria: JSON.stringify(ac),
        ownerNotes: (ip42.ownerNotes || "") + NOTE,
      },
    });
    console.log(
      `IP-42: AC #6 ticked (${ac.filter((a) => a.done).length}/${ac.length} done), note appended, status left ${ip42.status}`,
    );

    const ip53existing = await p.adminTodo.findUnique({ where: { ticketKey: "IP-53" } });
    const ip53 = await p.adminTodo.update({
      where: { ticketKey: "IP-53" },
      data: {
        status: "DONE",
        completedAt: new Date(),
        ownerNotes:
          (ip53existing?.ownerNotes || "") +
          "\n\nClosed as part of IP-42 AC #6 (shipped 2026-05-29). See IP-42 owner notes.",
      },
    });
    console.log(`IP-53: -> ${ip53.status}`);
  } finally {
    await p.$disconnect();
  }
})();
