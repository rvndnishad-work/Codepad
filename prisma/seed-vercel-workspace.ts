/**
 * Seed test data into the Vercel Engineering workspace.
 *
 * Run with: npx tsx prisma/seed-vercel-workspace.ts
 *
 * Idempotent-ish: clears prior seeded data with the "vercel-seed:" tag before
 * re-creating it, so re-running gives a clean slate.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const SEED_TAG = "vercel-seed";

function rand(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function shortCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log(`[${SEED_TAG}] Seeding Vercel Engineering workspace…`);

  // 1. Resolve the workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "vercel-engineering" },
    include: { members: true },
  });
  if (!workspace) {
    throw new Error("Workspace 'vercel-engineering' not found. Create it first via /w/create.");
  }
  console.log(`  → workspace: ${workspace.name} (${workspace.id})`);

  // 2. Find the owner (Arvind Nishad)
  const owner = workspace.members.find((m) => m.role === "OWNER");
  if (!owner) throw new Error("No OWNER member found for workspace.");
  console.log(`  → owner userId: ${owner.userId}`);

  // 3. Tear down prior seeded data (by tag in description for challenges)
  console.log(`  → tearing down prior seed data...`);
  await prisma.takeHomeAssignment.deleteMany({
    where: {
      workspaceId: workspace.id,
      candidateEmail: { contains: `+${SEED_TAG}@` },
    },
  });
  await prisma.interviewSession.deleteMany({
    where: {
      workspaceId: workspace.id,
      title: { startsWith: `[${SEED_TAG}] ` },
    },
  });
  await prisma.challenge.deleteMany({
    where: {
      workspaceId: workspace.id,
      slug: { startsWith: `${SEED_TAG}-` },
    },
  });

  // 4. Create workspace challenges
  console.log(`  → creating challenges…`);
  const challengeBlueprints = [
    {
      slug: `${SEED_TAG}-react-pagination`,
      title: "React: Build a paginated user list",
      difficulty: "medium",
      template: "react",
      category: "Frontend",
      estimatedMinutes: 45,
      description: `[${SEED_TAG}] Build a paginated user list component using React hooks. Each page should show 10 users.`,
    },
    {
      slug: `${SEED_TAG}-two-sum-ts`,
      title: "Two Sum (TypeScript)",
      difficulty: "easy",
      template: "test-ts",
      category: "Algorithms",
      estimatedMinutes: 20,
      description: `[${SEED_TAG}] Given an array of integers, return indices of the two numbers such that they add up to a specific target.`,
    },
    {
      slug: `${SEED_TAG}-debounce-hook`,
      title: "Implement a useDebounce hook",
      difficulty: "medium",
      template: "react",
      category: "React",
      estimatedMinutes: 30,
      description: `[${SEED_TAG}] Implement a custom React hook \`useDebounce(value, delayMs)\` that returns the debounced value.`,
    },
    {
      slug: `${SEED_TAG}-lru-cache`,
      title: "LRU Cache",
      difficulty: "hard",
      template: "test-ts",
      category: "Data Structures",
      estimatedMinutes: 60,
      description: `[${SEED_TAG}] Design and implement a data structure for Least Recently Used (LRU) cache with get/put in O(1).`,
    },
  ];

  const challenges = await Promise.all(
    challengeBlueprints.map(async (b) => {
      // The runnable code/tests live on a ChallengeStep — every read path
      // (attempt page, take-home start) assumes a position-0 step exists.
      // See prisma/migrate-challenges-to-steps.ts for the same invariant.
      const starterFiles = JSON.stringify({ "/index.ts": "// starter code\n" });
      const testFiles = JSON.stringify({ "/index.test.ts": "// tests\n" });

      const challenge = await prisma.challenge.create({
        data: {
          slug: b.slug,
          title: b.title,
          description: b.description,
          difficulty: b.difficulty,
          template: b.template,
          starterFiles,
          testFiles,
          tags: JSON.stringify(["seed"]),
          estimatedMinutes: b.estimatedMinutes,
          category: b.category,
          published: true,
          visibility: "private",
          authorId: owner.userId,
          workspaceId: workspace.id,
        },
      });

      // Single-step mirror of the parent (position 0). Without this the
      // challenge can't be started — the attempt page reads files off the
      // step and 404s when none exists.
      await prisma.challengeStep.create({
        data: {
          challengeId: challenge.id,
          position: 0,
          description: b.description,
          template: b.template,
          starterFiles,
          testFiles,
          estimatedMinutes: b.estimatedMinutes,
        },
      });

      return challenge;
    })
  );
  console.log(`    ✓ ${challenges.length} challenges (+ position-0 steps)`);

  // 5. Create take-home assignments (mix of statuses)
  console.log(`  → creating take-home assignments…`);
  const takehomeBlueprints = [
    {
      candidateName: "Priya Sharma",
      candidateEmail: `priya+${SEED_TAG}@example.com`,
      status: "PENDING",
      challengeIdx: 0,
      expiresAt: daysFromNow(7),
      startedAt: null,
      submittedAt: null,
      score: null,
    },
    {
      candidateName: "Marcus Chen",
      candidateEmail: `marcus+${SEED_TAG}@example.com`,
      status: "ACTIVE",
      challengeIdx: 1,
      expiresAt: daysFromNow(3),
      startedAt: daysAgo(0),
      submittedAt: null,
      score: null,
    },
    {
      candidateName: "Sofia Romano",
      candidateEmail: `sofia+${SEED_TAG}@example.com`,
      status: "SUBMITTED",
      challengeIdx: 2,
      expiresAt: daysFromNow(14),
      startedAt: daysAgo(2),
      submittedAt: daysAgo(1),
      score: 92,
    },
    {
      candidateName: "Diego Alvarez",
      candidateEmail: `diego+${SEED_TAG}@example.com`,
      status: "SUBMITTED",
      challengeIdx: 0,
      expiresAt: daysFromNow(14),
      startedAt: daysAgo(4),
      submittedAt: daysAgo(3),
      score: 78,
    },
    {
      candidateName: "Aisha Patel",
      candidateEmail: `aisha+${SEED_TAG}@example.com`,
      status: "EXPIRED",
      challengeIdx: 3,
      expiresAt: daysAgo(2),
      startedAt: null,
      submittedAt: null,
      score: null,
    },
    {
      candidateName: "Jonas Becker",
      candidateEmail: `jonas+${SEED_TAG}@example.com`,
      status: "SUBMITTED",
      challengeIdx: 1,
      expiresAt: daysFromNow(14),
      startedAt: daysAgo(6),
      submittedAt: daysAgo(5),
      score: 65,
    },
  ];

  let takehomeCount = 0;
  for (const b of takehomeBlueprints as any[]) {
    // For SUBMITTED take-homes, create a real ChallengeAttempt first so the
    // replay link in the UI is followable.
    let attemptId: string | null = null;
    if (b.status === "SUBMITTED" && b.submittedAt) {
      const attempt = await prisma.challengeAttempt.create({
        data: {
          userId: owner.userId, // attempts are anchored to the workspace owner for seed data
          challengeId: challenges[b.challengeIdx].id,
          status: "passed",
          files: JSON.stringify({ "/index.ts": "// candidate submission\n" }),
          testResults: JSON.stringify({ tests: [], passed: 1, total: 1 }),
          durationSec: 60 * 30,
          score: b.score,
          startedAt: b.startedAt ?? b.submittedAt,
          finishedAt: b.submittedAt,
        },
      });
      attemptId = attempt.id;
    }

    await prisma.takeHomeAssignment.create({
      data: {
        challengeId: challenges[b.challengeIdx].id,
        candidateName: b.candidateName,
        candidateEmail: b.candidateEmail,
        token: rand("th"),
        status: b.status,
        expiresAt: b.expiresAt,
        timeLimitMin: 60,
        startedAt: b.startedAt,
        submittedAt: b.submittedAt,
        attemptId,
        workspaceId: workspace.id,
      },
    });
    takehomeCount += 1;
  }
  console.log(`    ✓ ${takehomeCount} take-homes`);

  // 6. Create interview sessions (mix of statuses)
  console.log(`  → creating interview sessions…`);
  const sessionBlueprints = [
    {
      title: `[${SEED_TAG}] Frontend Engineer — React deep dive`,
      candidateName: "Hannah Wright",
      type: "live",
      status: "scheduled",
      verdict: null,
      totalSec: 60 * 60,
      startedAt: null,
      finishedAt: null,
    },
    {
      title: `[${SEED_TAG}] Senior FE — Live pair coding`,
      candidateName: "Tomás Ferreira",
      type: "live",
      status: "in_progress",
      verdict: null,
      totalSec: 90 * 60,
      startedAt: daysAgo(0),
      finishedAt: null,
    },
    {
      title: `[${SEED_TAG}] React internals — Round 2`,
      candidateName: "Liam O'Connor",
      type: "live",
      status: "completed",
      verdict: "success",
      totalSec: 75 * 60,
      startedAt: daysAgo(2),
      finishedAt: daysAgo(2),
    },
    {
      title: `[${SEED_TAG}] System design + JS fundamentals`,
      candidateName: "Yuki Tanaka",
      type: "live",
      status: "completed",
      verdict: "failed",
      totalSec: 60 * 60,
      startedAt: daysAgo(4),
      finishedAt: daysAgo(4),
    },
    {
      title: `[${SEED_TAG}] TS algorithms screen`,
      candidateName: "Anna Kowalski",
      type: "mock",
      status: "completed",
      verdict: "suspicious",
      totalSec: 45 * 60,
      startedAt: daysAgo(6),
      finishedAt: daysAgo(6),
    },
  ];

  for (const b of sessionBlueprints) {
    await prisma.interviewSession.create({
      data: {
        userId: owner.userId,
        title: b.title,
        candidateName: b.candidateName,
        type: b.type,
        status: b.status,
        verdict: b.verdict,
        creatorRole: "interviewer",
        sourceType: "challenge",
        challengeIds: JSON.stringify([challenges[0].id, challenges[1].id]),
        playgroundIds: "[]",
        totalSec: b.totalSec,
        shareToken: rand("st"),
        shortCode: shortCode(),
        startedAt: b.startedAt,
        finishedAt: b.finishedAt,
        workspaceId: workspace.id,
      },
    });
  }
  console.log(`    ✓ ${sessionBlueprints.length} interview sessions`);

  console.log(`\n[${SEED_TAG}] Done. Visit /w/vercel-engineering to see the data.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
