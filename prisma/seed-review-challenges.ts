/**
 * Seed script for "Review the AI's code" challenges.
 *
 * Run with:  npx tsx prisma/seed-review-challenges.ts
 * Lint only: npx tsx prisma/seed-review-challenges.ts --lint
 *   (validates line anchors + categories and prints each finding next to the
 *    code lines it points at — no DB writes.)
 *
 * Idempotent: upsert by slug; findings are replaced wholesale on each run.
 */
import { PrismaClient } from "@prisma/client";
import { REVIEW_CHALLENGES_1 } from "./data/review-challenges-1";
import { REVIEW_CHALLENGES_2 } from "./data/review-challenges-2";
import type {
  CuratedReviewChallenge,
  ReviewCategory,
} from "./data/review-challenges.types";

const prisma = new PrismaClient();

const ALL: CuratedReviewChallenge[] = [
  ...REVIEW_CHALLENGES_1,
  ...REVIEW_CHALLENGES_2,
];

const VALID_CATEGORIES: ReviewCategory[] = [
  "hallucinated-api",
  "logic-bug",
  "security",
  "performance",
  "edge-case",
];

/** Validate a challenge's findings against its code. Returns error strings. */
function lint(c: CuratedReviewChallenge): string[] {
  const errors: string[] = [];
  const lineCount = c.code.split("\n").length;

  if (c.code.startsWith("\n") || c.code.endsWith("\n")) {
    errors.push(`[${c.slug}] code has leading/trailing newline — anchors will be off`);
  }
  if (c.findings.length === 0) {
    errors.push(`[${c.slug}] has no findings`);
  }

  const seenSlug = new Set<string>();
  if (seenSlug.has(c.slug)) errors.push(`duplicate slug: ${c.slug}`);
  seenSlug.add(c.slug);

  for (const [i, f] of c.findings.entries()) {
    const where = `[${c.slug}] finding #${i + 1} "${f.title}"`;
    const [start, end] = f.lines;
    if (!VALID_CATEGORIES.includes(f.category)) {
      errors.push(`${where}: invalid category "${f.category}"`);
    }
    if (start < 1 || end < 1) {
      errors.push(`${where}: line numbers must be >= 1`);
    }
    if (start > end) {
      errors.push(`${where}: lineStart ${start} > lineEnd ${end}`);
    }
    if (end > lineCount) {
      errors.push(`${where}: lineEnd ${end} exceeds code length (${lineCount} lines)`);
    }
  }
  return errors;
}

/** Print each challenge's findings next to the code they anchor to. */
function printLintReport(c: CuratedReviewChallenge) {
  const lines = c.code.split("\n");
  console.log(`\n━━━ ${c.slug} (${c.language}, ${c.difficulty}) — ${c.findings.length} findings ━━━`);
  for (const f of c.findings) {
    const [start, end] = f.lines;
    console.log(`  • [${f.category}] ${f.title}  (lines ${start}-${end})`);
    for (let n = start; n <= end && n <= lines.length; n++) {
      console.log(`      ${String(n).padStart(3)}| ${lines[n - 1]}`);
    }
  }
}

async function main() {
  const lintOnly = process.argv.includes("--lint");

  // Validate everything first — a bad anchor should never reach the DB.
  const allErrors: string[] = [];
  for (const c of ALL) allErrors.push(...lint(c));
  if (allErrors.length > 0) {
    console.error("Lint failed:\n" + allErrors.map((e) => "  ✗ " + e).join("\n"));
    process.exit(1);
  }
  console.log(`✓ Lint passed: ${ALL.length} challenges, ${ALL.reduce((n, c) => n + c.findings.length, 0)} findings.`);

  if (lintOnly) {
    for (const c of ALL) printLintReport(c);
    return;
  }

  for (const [i, c] of ALL.entries()) {
    const challenge = await prisma.reviewChallenge.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        title: c.title,
        prompt: c.prompt,
        language: c.language,
        difficulty: c.difficulty,
        code: c.code,
        estimatedMinutes: c.estimatedMinutes,
        timeLimitSec: c.timeLimitSec ?? 120,
        sortOrder: i,
        published: true,
      },
      update: {
        title: c.title,
        prompt: c.prompt,
        language: c.language,
        difficulty: c.difficulty,
        code: c.code,
        estimatedMinutes: c.estimatedMinutes,
        timeLimitSec: c.timeLimitSec ?? 120,
        sortOrder: i,
      },
    });

    // Findings are derived data — replace them wholesale so edits to the
    // curated file always win.
    await prisma.reviewFinding.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.reviewFinding.createMany({
      data: c.findings.map((f) => ({
        challengeId: challenge.id,
        lineStart: f.lines[0],
        lineEnd: f.lines[1],
        category: f.category,
        title: f.title,
        explanation: f.explanation,
        points: f.points ?? 10,
      })),
    });
    console.log(`✓ ${c.slug} (${c.findings.length} findings)`);
  }

  console.log(`\nSeeded ${ALL.length} review challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
