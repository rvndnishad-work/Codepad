/**
 * Backfill ticket dependency edges so the relationships I've been documenting
 * in ownerNotes free-text are now queryable structure.
 *
 * Convention: `(from, to, type)` reads "from {type} to":
 *   FOLLOWS_FROM   — from was spawned from to (deferred follow-up)
 *   BLOCKS         — from must complete before to can start
 *   RELATES_TO     — informational, symmetric intent
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const edges = [
  // ─── FOLLOWS_FROM: deferred-from-parent links ──────────────────────────
  // Recent backfill (IP-48..IP-59 minted in this session)
  ["IP-48", "IP-32", "FOLLOWS_FROM"], // Outbound ATS push  ← IP-32
  ["IP-49", "IP-32", "FOLLOWS_FROM"], // Inbound webhook    ← IP-32
  ["IP-50", "IP-38", "FOLLOWS_FROM"], // Other Sandpack routes ← IP-38
  ["IP-51", "IP-38", "FOLLOWS_FROM"], // Lighthouse measurement ← IP-38
  ["IP-52", "IP-40", "FOLLOWS_FROM"], // Button-in-button fix ← IP-40
  ["IP-53", "IP-42", "FOLLOWS_FROM"], // Forced enrollment ← IP-42
  ["IP-54", "IP-42", "FOLLOWS_FROM"], // OAuth TOTP gate ← IP-42
  ["IP-55", "IP-42", "FOLLOWS_FROM"], // TOTP rate limit ← IP-42
  ["IP-56", "IP-44", "FOLLOWS_FROM"], // candidateEmail + INTERVIEW_SCHEDULED ← IP-44
  ["IP-57", "IP-45", "FOLLOWS_FROM"], // Scheduled broadcasts ← IP-45
  ["IP-58", "IP-45", "FOLLOWS_FROM"], // Delivery tracking ← IP-45
  ["IP-59", "IP-45", "FOLLOWS_FROM"], // Advanced filters ← IP-45

  // Earlier follow-ups I minted but never linked
  ["IP-44", "IP-40", "FOLLOWS_FROM"], // Triggers ← IP-40 infra
  ["IP-45", "IP-40", "FOLLOWS_FROM"], // Admin broadcast ← IP-40 infra
  ["IP-46", "IP-40", "FOLLOWS_FROM"], // Cron triggers ← IP-40 infra
  ["IP-47", "IP-40", "FOLLOWS_FROM"], // Prefs UI ← IP-40 infra

  // ─── BLOCKS: must-complete-first dependencies ──────────────────────────
  // IP-45 schema must land before its deferrals can build on it
  ["IP-45", "IP-57", "BLOCKS"], // IP-45 blocks IP-57 (scheduled broadcasts need BroadcastNotification)
  ["IP-45", "IP-58", "BLOCKS"], // IP-45 blocks IP-58 (delivery tracking needs broadcastId column)
  ["IP-45", "IP-59", "BLOCKS"], // IP-45 blocks IP-59 (advanced filters need audience resolver)
  // Email epic gates several follow-ups
  ["IP-24", "IP-47", "BLOCKS"], // Email service blocks per-type prefs UI (the email channel half)
  ["IP-24", "IP-38", "BLOCKS"], // Email service blocks IP-38 "email-me-the-link" AC (already noted in IP-38 ownerNotes)
  // CRM v2 stage transitions consume inbound ATS events
  ["IP-49", "IP-34", "RELATES_TO"], // Inbound ATS receiver relates to CRM v2 stage updates
  // Mobile lobby extension is the same shape as IP-38
  ["IP-50", "IP-38", "RELATES_TO"], // (already FOLLOWS_FROM above; RELATES_TO is duplicative — skip)
];

// De-dup the RELATES_TO IP-50 → IP-38 line since FOLLOWS_FROM is already set.
const finalEdges = edges.filter(
  (e, i) => edges.findIndex((x) => x[0] === e[0] && x[1] === e[1] && x[2] === e[2]) === i,
).filter((e) => !(e[0] === "IP-50" && e[1] === "IP-38" && e[2] === "RELATES_TO"));

(async () => {
  const prisma = new PrismaClient();
  try {
    // Resolve every ticketKey → id once, fail fast on unknown keys.
    const allKeys = [...new Set(finalEdges.flatMap(([a, b]) => [a, b]))];
    const rows = await prisma.adminTodo.findMany({
      where: { ticketKey: { in: allKeys } },
      select: { id: true, ticketKey: true },
    });
    const idByKey = new Map(rows.map((r) => [r.ticketKey, r.id]));
    const missing = allKeys.filter((k) => !idByKey.has(k));
    if (missing.length > 0) {
      console.error("Missing tickets (skipping edges that reference them):", missing);
    }

    const created = [];
    const skipped = [];
    for (const [fromKey, toKey, type] of finalEdges) {
      const fromId = idByKey.get(fromKey);
      const toId = idByKey.get(toKey);
      if (!fromId || !toId) {
        skipped.push([fromKey, toKey, type, "missing ticket"]);
        continue;
      }
      try {
        await prisma.adminTodoDependency.create({ data: { fromId, toId, type } });
        created.push([fromKey, type, toKey]);
      } catch (err) {
        if (err.code === "P2002") {
          skipped.push([fromKey, toKey, type, "already exists"]);
        } else {
          throw err;
        }
      }
    }

    console.log(`Created ${created.length} edges:`);
    created.forEach(([f, t, to]) => console.log(`  ${f}  --${t}-->  ${to}`));
    if (skipped.length > 0) {
      console.log(`\nSkipped ${skipped.length}:`);
      skipped.forEach((s) => console.log(`  ${s.join(" | ")}`));
    }

    // Sanity: count incoming edges per parent ticket
    console.log("\nIncoming edge summary (who spawned what):");
    const parents = ["IP-32", "IP-38", "IP-40", "IP-42", "IP-44", "IP-45"];
    for (const k of parents) {
      const id = idByKey.get(k);
      if (!id) continue;
      const incoming = await prisma.adminTodoDependency.findMany({
        where: { toId: id },
        include: { from: { select: { ticketKey: true, title: true } } },
      });
      console.log(`  ${k} has ${incoming.length} incoming edge(s):`);
      incoming.forEach((d) => console.log(`     [${d.type}] ${d.from.ticketKey} ${d.from.title.slice(0, 70)}`));
    }
  } finally {
    await prisma.$disconnect();
  }
})();
