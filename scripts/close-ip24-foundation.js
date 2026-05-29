/**
 * IP-24 foundation pass shipped (2026-05-29):
 *   ACs 1, 2, 4, 5, 6 → done
 *   AC 3 (DKIM/SPF/DMARC actual DNS) → docs only (docs/deploy-email.md);
 *     deferred because DNS config requires user access to the domain.
 *
 * Leaves IP-24 IN_PROGRESS to honestly reflect that AC #3 isn't ticked yet.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const NOTE =
  "\n\nFoundation pass 2026-05-29:\n" +
  "  - Installed @react-email/components + @react-email/render (v1.0.12 / v2.0.8).\n" +
  "  - src/emails/ scaffold: BaseLayout.tsx (shared frame, color tokens), AiScreeningInvite.tsx, ScreeningCompleted.tsx.\n" +
  "  - Type-safe template registry at src/emails/index.ts (TemplateName + TemplateProps map; satisfies-checked).\n" +
  "  - Rewrote src/lib/email.ts as typed sendEmail({ template, to, props, idempotencyKey?, replyTo? }). Resend Idempotency-Key forwarded. Console fallback retained for keyless dev.\n" +
  "  - Migrated invite-email.ts + submit-notify.ts to thin wrappers over the new service. Visual baseline preserved (same colors/typography/CTA — components map 1:1 to the prior hand-rolled HTML).\n" +
  "  - End-to-end smoke verified: both templates rendered + Resend POST accepted (ids 8c2842f6-... and 12683dea-...). tsc clean.\n" +
  "  - docs/deploy-email.md added with full DKIM/SPF/DMARC checklist + subdomain strategy + DMARC ratchet plan. AC #3 actual DNS config requires user; doc unblocks the work.";

(async () => {
  const p = new PrismaClient();
  try {
    const t = await p.adminTodo.findUnique({ where: { ticketKey: "IP-24" } });
    if (!t) throw new Error("IP-24 not found");
    const ac = JSON.parse(t.acceptanceCriteria || "[]");
    // Tick by AC index: 1, 2, 4, 5, 6 (0-indexed: 0,1,3,4,5)
    [0, 1, 3, 4, 5].forEach((i) => {
      if (ac[i]) ac[i].done = true;
    });
    await p.adminTodo.update({
      where: { ticketKey: "IP-24" },
      data: {
        acceptanceCriteria: JSON.stringify(ac),
        ownerNotes: (t.ownerNotes || "") + NOTE,
        status: "IN_PROGRESS",
      },
    });
    console.log(`IP-24: ACs done -> ${ac.filter((a) => a.done).length}/${ac.length}, status IN_PROGRESS (AC #3 deliverability DNS deferred to deploy time)`);
  } finally {
    await p.$disconnect();
  }
})();
