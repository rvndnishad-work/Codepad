/**
 * Runs every challenge seed script in order, in one command.
 *
 *   npm run seed:challenges
 *
 * Each child script is idempotent (upsert by slug), so this is safe to re-run.
 * It seeds the COMPLETE catalog (base + DSA hard/medium + JS-TS utils + UI).
 *
 * Before running against production, set the DB env in your shell, e.g. (PowerShell):
 *   $env:DATABASE_URL = "<prod POSTGRES_URL_NON_POOLING>"
 *   $env:DIRECT_URL   = $env:DATABASE_URL
 *   npm run seed:challenges
 *
 * The script prints the target DB host first so you can confirm you're not
 * accidentally seeding localhost.
 */
import { spawnSync } from "node:child_process";

const SCRIPTS = [
  "prisma/seed-interview-prep.ts", // base DSA (8 easy + 2 medium)
  "prisma/seed-dsa-hard.ts", //       12 hard DSA
  "prisma/seed-dsa-medium.ts", //     12 medium DSA
  "prisma/seed-frontend-utils.ts", // 26 JS/TS utilities
  "prisma/seed-frontend-ui.ts", //    22 UI / design
];

function targetDb(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "(DATABASE_URL is NOT set — will fall back to .env / localhost!)";
  try {
    const u = new URL(raw);
    return `${u.host}${u.pathname}`; // host + db name only — no credentials
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

console.log(`\n📦 Seeding all challenge sets`);
console.log(`   Target DB: ${targetDb()}\n`);

for (const script of SCRIPTS) {
  console.log(`\n▶ ${script}`);
  const res = spawnSync("npx", ["tsx", script], { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    console.error(`\n✗ Failed on ${script} (exit code ${res.status}). Stopping.`);
    process.exit(res.status ?? 1);
  }
}

console.log(`\n✅ All challenge sets seeded into ${targetDb()}.`);
