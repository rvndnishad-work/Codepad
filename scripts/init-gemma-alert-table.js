/**
 * Imperative CREATE TABLE for GemmaAlert.
 *
 * Why this exists: the `GemmaAlert` model is defined in `prisma/schema.prisma`
 * but the schema file is currently mixed with unrelated WIP that we don't
 * want to apply via `prisma db push`. This script reaches around the schema
 * file and creates just the GemmaAlert table + its indexes directly against
 * SQLite, so the Gemma Admin Copilot has the storage it needs without
 * applying every other in-flight schema change.
 *
 * Usage:
 *   node scripts/init-gemma-alert-table.js
 *
 * Idempotent — uses `IF NOT EXISTS` everywhere, so re-running is a no-op.
 *
 * When you eventually do run `prisma db push` against a clean schema, the
 * Prisma migration engine will see the table already exists and won't
 * conflict — it will just reconcile the metadata.
 */
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    // Table — schema mirrors the Prisma model exactly so prisma client
    // queries (findMany, create, update) bind without surprises.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GemmaAlert" (
        "id"             TEXT     NOT NULL PRIMARY KEY,
        "type"           TEXT     NOT NULL,
        "title"          TEXT     NOT NULL,
        "body"           TEXT     NOT NULL,
        "severity"       TEXT     NOT NULL DEFAULT 'MEDIUM',
        "status"         TEXT     NOT NULL DEFAULT 'UNRESOLVED',
        "proposedAction" TEXT,
        "targetId"       TEXT,
        "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt"     DATETIME
      );
    `);

    // Indexes — the same composites declared on the Prisma model.
    // Fast lookups for the alert feed (unresolved + severity-sorted) and
    // for the dedup checks inside the telemetry scanner (type + status).
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "GemmaAlert_status_severity_idx"
      ON "GemmaAlert"("status", "severity");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "GemmaAlert_type_status_idx"
      ON "GemmaAlert"("type", "status");
    `);

    // Verify by counting — also confirms the Prisma client can talk to it.
    const count = await prisma.gemmaAlert.count();
    console.log(`✓ GemmaAlert table ready (${count} existing row${count === 1 ? "" : "s"}).`);
  } catch (err) {
    console.error("Failed to initialize GemmaAlert table:");
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
