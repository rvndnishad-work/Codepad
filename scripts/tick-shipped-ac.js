/**
 * After shipping a batch of tickets, tick all of their acceptance criteria
 * to `done: true` so the board reflects that the work covered the spec.
 *
 * Usage: edit the `SHIPPED` array below to the ticket keys you just landed,
 * then run `node scripts/tick-shipped-ac.js`.
 *
 * This is honest about what was shipped: anything that DIDN'T actually get
 * implemented stays unticked manually. The point is bulk-ticking the AC that
 * the implementation literally satisfied — not silently rubber-stamping work.
 */
const { PrismaClient } = require("@prisma/client");

// Tickets whose implementation actually covered every AC line. If a ticket
// shipped partially, leave it out of this list — manual ticking is honest.
//
// Auto-ticked here (all AC met):
//   IP-3, IP-4, IP-12 — fully implemented as specified.
//
// Deliberately NOT auto-ticked (partial; left as DONE-with-caveats):
//   IP-2  — missing the wrong-key/missing-key/round-trip test coverage AC
//   IP-7  — rotate action doesn't write explicit audit-log entries beyond
//           the create+revoke side effects
//   IP-10 — uses offset pagination not cursor; missing CSV export + the
//           tool-name/key-label/date-range filter chips (only kind + errors-only)
const SHIPPED = ["IP-3", "IP-4", "IP-12"];

(async () => {
  const p = new PrismaClient();
  try {
    for (const key of SHIPPED) {
      const row = await p.adminTodo.findUnique({
        where: { ticketKey: key },
        select: { id: true, title: true, acceptanceCriteria: true },
      });
      if (!row || !row.acceptanceCriteria) continue;
      let list = [];
      try {
        list = JSON.parse(row.acceptanceCriteria);
      } catch {
        continue;
      }
      const updated = list.map((c) => ({ text: c.text, done: true }));
      await p.adminTodo.update({
        where: { id: row.id },
        data: { acceptanceCriteria: JSON.stringify(updated) },
      });
      console.log(`  ${key} — ticked ${list.length} AC items`);
    }
  } finally {
    await p.$disconnect();
  }
})();
