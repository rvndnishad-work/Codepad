/**
 * Idempotent backfill: for every CreatorSpace with a `layout` but no `blocks`,
 * compute the equivalent blocks doc via layoutToBlocksDoc() and persist it.
 *
 * Idempotent: safe to re-run. Skips rows where `blocks` is already non-null
 * and rewrites nothing if `--dry-run` is passed.
 *
 * Usage:
 *   npx tsx scripts/migrate-layout-to-blocks.ts            # live
 *   npx tsx scripts/migrate-layout-to-blocks.ts --dry-run  # preview
 *   npx tsx scripts/migrate-layout-to-blocks.ts --dry-run --verbose
 */
import { prisma } from "../src/lib/prisma";
import { layoutToBlocksDoc } from "../src/lib/creator/blocks";
import { normalizeLayout } from "../src/lib/creator/layout";

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

async function main() {
  const spaces = await prisma.creatorSpace.findMany({
    select: { id: true, handle: true, layout: true, blocks: true },
  });

  let wouldMigrate = 0;
  let migrated = 0;
  let skipped = 0;

  for (const s of spaces) {
    if (s.blocks !== null && s.blocks !== undefined) {
      skipped++;
      if (VERBOSE) console.log(` - skip ${s.handle} (${s.id}) — blocks already set`);
      continue;
    }
    const layout = normalizeLayout(s.layout);
    const doc = layoutToBlocksDoc(layout);

    if (DRY_RUN) {
      wouldMigrate++;
      console.log(`[dry-run] would migrate ${s.handle} (${s.id}) → ${doc.blocks.length} blocks hero=${doc.hero.heroStyle}/${doc.hero.theme}`);
      if (VERBOSE) console.log(JSON.stringify(doc, null, 2));
    } else {
      await prisma.creatorSpace.update({
        where: { id: s.id },
        data: { blocks: doc as unknown as object },
      });
      migrated++;
      console.log(` - migrated ${s.handle} (${s.id}) → ${doc.blocks.length} blocks`);
    }
  }

  if (DRY_RUN) {
    console.log(`\nDry run: ${wouldMigrate} would migrate, ${skipped} skipped, ${spaces.length} total.`);
    if (wouldMigrate === 0) console.log("No-op on second run — idempotent ✓");
  } else {
    console.log(`\nMigrated ${migrated}, skipped ${skipped}, total ${spaces.length}.`);
  }
}

main()
  .catch((err) => {
    console.error("migrate-layout-to-blocks failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
