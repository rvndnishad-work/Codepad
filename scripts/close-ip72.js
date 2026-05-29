/**
 * IP-72 — bulk take-home dispatch now actually emails (was a no-op stub
 * pending IP-24, which shipped this session). Core delivered:
 *   AC #2 suppression-aware (sendTemplatedBatch checks EmailSuppression) — done
 *   AC #4 delivery summary ("X dispatched / Y emailed / Z suppressed/failed")
 *         shown in the dispatch toast + per-send rows in the workspace Email
 *         activity view (/w/[slug]/emails) — done
 * Remaining hardening split to IP-86:
 *   AC #1 per-workspace daily send cap (needs a settings store — same gap as IP-83)
 *   AC #3 exponential backoff retry on transient transport errors
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const NOTE =
  "\n\nShipped 2026-05-29: bulk dispatch emails via Resend's batch endpoint " +
  "(src/lib/email.ts sendTemplatedBatch — one API call per <=100, EmailLog row " +
  "per recipient, suppression-checked up front). Wired into " +
  "bulkDispatchTakeHomesAction after the assignment transaction commits; result " +
  "now carries an `emailed` count surfaced in the dispatch toast. Added a " +
  "'Send to many' entry point on the Assessments take-homes form pointing at the " +
  "Pipeline bulk flow. Verified a 3-message batch end-to-end (3 sent, distinct " +
  "Resend ids, EmailLog rows). AC #1 (daily cap) + AC #3 (backoff) split to IP-86.";

const ip86 = {
  title: "Bulk dispatch hardening — per-workspace daily send cap + backoff retry (IP-72 leftovers)",
  priority: "LOW",
  category: "Recruiter",
  body:
    "IP-72 shipped the actual bulk invite emails (Resend batch + suppression + delivery summary). Two hardening ACs remain:\n\n" +
    "  - Per-workspace daily send cap, read from settings, refusing dispatch past it. Blocked on a workspace-settings store (none exists; same dependency as IP-83).\n" +
    "  - Exponential backoff retry (up to 3x) on transient Resend errors in sendTemplatedBatch, distinguishing transient (5xx/network) from terminal (4xx) failures.",
  acceptance: [
    "Bulk dispatch reads the workspace's daily-send cap from settings and refuses past it",
    "Exponential backoff on transient transport errors (retry up to 3x) in the batch send path",
  ],
  ownerNotes: "Split from IP-72 on 2026-05-29. AC #1 blocked on a settings store (cf. IP-83). RELATES_TO IP-72.",
};

(async () => {
  const p = new PrismaClient();
  try {
    const t = await p.adminTodo.findUnique({ where: { ticketKey: "IP-72" } });
    if (!t) throw new Error("IP-72 not found");
    const ac = JSON.parse(t.acceptanceCriteria || "[]");
    [1, 3].forEach((i) => ac[i] && (ac[i].done = true)); // AC #2 and #4 (0-indexed 1,3)
    await p.adminTodo.update({
      where: { ticketKey: "IP-72" },
      data: {
        acceptanceCriteria: JSON.stringify(ac),
        ownerNotes: (t.ownerNotes || "") + NOTE,
        status: "DONE",
        completedAt: new Date(),
      },
    });
    console.log(`IP-72: ${ac.filter((a) => a.done).length}/${ac.length} ACs ticked, status -> DONE`);

    const last = await p.adminTodo.findFirst({
      where: { ticketSeq: { not: null } },
      orderBy: { ticketSeq: "desc" },
      select: { ticketSeq: true },
    });
    const seq = (last?.ticketSeq ?? 0) + 1;
    const row = await p.adminTodo.create({
      data: {
        title: ip86.title,
        body: ip86.body,
        priority: ip86.priority,
        category: ip86.category,
        status: "BACKLOG",
        addedByEmail: "claude-code (IP-72 hardening split 2026-05-29)",
        ticketSeq: seq,
        ticketKey: `IP-${seq}`,
        acceptanceCriteria: JSON.stringify(ip86.acceptance.map((text) => ({ text, done: false }))),
        ownerNotes: ip86.ownerNotes,
      },
    });
    const to = await p.adminTodo.findUnique({ where: { ticketKey: "IP-72" }, select: { id: true } });
    if (to) await p.adminTodoDependency.create({ data: { fromId: row.id, toId: to.id, type: "RELATES_TO" } });
    console.log(`Minted ${row.ticketKey}: ${row.title}  (RELATES_TO IP-72)`);
  } finally {
    await p.$disconnect();
  }
})();
