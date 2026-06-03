/**
 * One-off backfill: assign ticketKey (IP-N) + acceptanceCriteria + ownerNotes
 * to the existing AdminTodo rows. Safe to re-run — it only overwrites the
 * three new fields for rows whose ticketKey is still null.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const ENRICH = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seed-todo-enrich.json"), "utf8")
);

(async () => {
  const p = new PrismaClient();
  const todos = await p.adminTodo.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`Backfilling ${todos.length} todos`);

  for (let i = 0; i < todos.length; i++) {
    const t = todos[i];
    if (t.ticketKey) {
      console.log(`  ${t.ticketKey} — already has a key, skipping`);
      continue;
    }

    const seq = i + 1;
    const key = `IP-${seq}`;

    const enrichKey = Object.keys(ENRICH).find((k) => t.title.startsWith(k));
    const e = enrichKey ? ENRICH[enrichKey] : null;

    await p.adminTodo.update({
      where: { id: t.id },
      data: {
        ticketSeq: seq,
        ticketKey: key,
        ...(e
          ? {
              acceptanceCriteria: JSON.stringify(
                e.ac.map((text) => ({ text, done: false }))
              ),
              ownerNotes: e.notes,
            }
          : {}),
      },
    });
    console.log(
      `  ${key} — ${e ? "enriched" : "(no enrichment)"} — ${t.title.slice(0, 50)}`
    );
  }

  await p.$disconnect();
})();
