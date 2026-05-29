/**
 * Backfill User.userType for legacy accounts that pre-date the
 * candidate/recruiter taxonomy.
 *
 * Every existing null userType is set to "candidate" (the more common
 * default — recruiters opt in explicitly). Idempotent: safe to re-run.
 *
 * Run with: npx tsx prisma/backfill-user-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.user.count({ where: { userType: null } });
  console.log(`Found ${before} user(s) with userType = null`);

  if (before === 0) {
    console.log("Nothing to backfill. Exiting.");
    return;
  }

  const result = await prisma.user.updateMany({
    where: { userType: null },
    data: { userType: "candidate" },
  });

  const after = await prisma.user.count({ where: { userType: null } });
  console.log(`Updated ${result.count} row(s). Remaining nulls: ${after}`);

  if (after !== 0) {
    throw new Error(`Backfill incomplete: ${after} null userType row(s) remain.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
