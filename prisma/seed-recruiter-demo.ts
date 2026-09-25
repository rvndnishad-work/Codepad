/**
 * Demo data for the recruiter workspace tabs: Candidates (with batches),
 * Take home and live interviews, AI screening (practical,
 * theory and conversation rounds, with reports) and the Question library.
 *
 *   npm run seed:recruiter                          # demo workspace "acme-hiring"
 *   npm run seed:recruiter -- --owner=you@mail.com  # also make you its owner
 *   npm run seed:recruiter -- --workspace=my-team   # seed an existing workspace
 *   npm run seed:recruiter -- --clean               # remove the demo data only
 *
 * Safe to re-run: every row it writes has an id starting with "seedrd_", and
 * each run deletes those rows first. Rows your team created are never touched.
 * Refuses to run against a non-local database unless --allow-remote is passed.
 *
 * Run `npm run seed:roles` once first (workspace roles), and optionally the
 * public question bank (`npm run seed:iq && npm run seed:question-bank`) so
 * the bank-sourced questionnaires can be built.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { snapshotStarters } from "../src/lib/ai-interview/screening-create";
import type { RoundSpecInput } from "../src/lib/ai-interview/rounds";
import { serializeQuestionnaire, type QuestionItem } from "../src/lib/ai-interview/questionnaire";
import { theoryMinutes, theoryRoundScore, type TheoryAnswer, type TheorySettings, type TheoryVerdict } from "../src/lib/ai-interview/theory";
import { creditCostForLevel } from "../src/lib/ai-interview/engagement";
import { AI_INTERVIEW_TEMPLATES } from "../src/lib/ai-interview/scaffolds";
import {
  ANAGRAM_SOLUTIONS,
  BANK_QUESTIONNAIRES,
  BATCHES,
  CANDIDATES,
  CHALLENGES,
  CONVERSATION_POINTS,
  DISCOVERY_QUESTIONS,
  INTERVIEWS,
  LEGACY_TAKE_HOMES,
  NODE_THEORY,
  OWNERSHIP_QUESTIONS,
  PARENS_SOLUTIONS,
  PROMPT_ATTEMPTS,
  PROMPT_TASKS,
  RATE_LIMITER_SOLUTIONS,
  REACT_THEORY,
  SCREENINGS,
  TAKE_HOMES,
  TAKE_HOME_TEMPLATES,
  TEAM,
  emailFor,
  type CandidateSeed,
  type Level,
  type OwnQuestion,
  type ScreeningSeed,
  type TeamKey,
} from "./seed-data/recruiter-demo";

const prisma = new PrismaClient();

const PREFIX = "seedrd_";
const sid = (kind: string, key: string | number) => `${PREFIX}${kind}_${key}`;
const DEMO_SLUG = "acme-hiring";
const DEMO_OWNER_EMAIL = "demo.owner@example.com";
const DEMO_PASSWORD = "interviewpad-demo";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const now = Date.now();
/** Days from now (negative is the past), at a stable time of day per key. */
const at = (days: number, hour = 10) => {
  const d = new Date(now + days * DAY);
  if (days !== 0) d.setHours(hour, (hour * 7) % 60, 0, 0);
  return d;
};
const token = () => crypto.randomBytes(12).toString("hex");

/* ── Args and safety ─────────────────────────────────────────────────────── */

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=") || "true"] as const;
  }),
);

function assertLocalDatabase() {
  if (args.has("allow-remote")) return;
  const raw = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    /* unparsable: treated as remote */
  }
  if (!["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(host)) {
    throw new Error(
      `DATABASE_URL points at "${host || "an unknown host"}". This seed is for local and staging databases; pass --allow-remote if you really mean it.`,
    );
  }
}

/* ── Teardown ────────────────────────────────────────────────────────────── */

async function teardown() {
  const seeded = { id: { startsWith: PREFIX } };
  await prisma.aIInterviewCreditLedger.deleteMany({ where: seeded });
  await prisma.aIInterviewSession.deleteMany({ where: seeded });
  await prisma.aIScreeningBatch.deleteMany({ where: seeded });
  await prisma.aIInterviewTemplate.deleteMany({ where: seeded });
  await prisma.promptAttempt.deleteMany({ where: seeded });
  await prisma.promptScenario.deleteMany({ where: seeded });
  await prisma.takeHomeAssignment.deleteMany({ where: seeded });
  await prisma.challengeAttempt.deleteMany({ where: seeded });
  await prisma.interviewSession.deleteMany({ where: seeded });
  await prisma.takeHomeTemplate.deleteMany({ where: seeded });
  await prisma.candidateNote.deleteMany({ where: seeded });
  await prisma.candidate.deleteMany({ where: seeded });
  await prisma.candidateBatch.deleteMany({ where: seeded });
  await prisma.challenge.deleteMany({ where: seeded });
  await prisma.workspaceAuditLog.deleteMany({ where: seeded });
  await prisma.workspaceMember.deleteMany({ where: seeded });
  await prisma.workspace.deleteMany({ where: seeded });
  await prisma.user.deleteMany({ where: seeded });
}

/* ── Workspace and team ──────────────────────────────────────────────────── */

async function seedUser(key: string, name: string, email: string, password?: string) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const user = await prisma.user.create({
    data: {
      id: sid("user", key),
      name,
      email,
      emailVerified: at(-40),
      userType: "company",
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  return user.id;
}

async function resolveWorkspace(): Promise<{ id: string; slug: string; ownerId: string }> {
  const slug = args.get("workspace");
  if (slug && slug !== "true") {
    const ws = await prisma.workspace.findUnique({ where: { slug }, include: { members: true } });
    if (!ws) throw new Error(`Workspace "${slug}" not found.`);
    const owner = ws.members.find((m) => m.role === "OWNER") ?? ws.members[0];
    if (!owner) throw new Error(`Workspace "${slug}" has no members.`);
    return { id: ws.id, slug: ws.slug, ownerId: owner.userId };
  }

  const ownerEmail = args.get("owner");
  let ownerId: string;
  if (ownerEmail && ownerEmail !== "true") {
    const u = await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase() }, select: { id: true } });
    if (!u) throw new Error(`No user with email ${ownerEmail}. Sign in once first, or leave out --owner to use the demo login.`);
    ownerId = u.id;
  } else {
    ownerId = await seedUser("owner", "Alex Morgan", DEMO_OWNER_EMAIL, DEMO_PASSWORD);
  }

  const existing = await prisma.workspace.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true } });
  if (existing && !existing.id.startsWith(PREFIX)) {
    throw new Error(`A workspace with slug "${DEMO_SLUG}" already exists and was not made by this seed. Use --workspace=${DEMO_SLUG} to seed into it.`);
  }
  const ws = await prisma.workspace.create({
    data: {
      id: sid("ws", "demo"),
      name: "Acme Hiring",
      slug: DEMO_SLUG,
      // A running trial unlocks Growth tools (AI screening) without the
      // paid-plan 2FA enrollment gate, so the demo login works straight away.
      // Re-running the seed restarts the trial.
      planName: "FREE",
      trialEndsAt: at(14),
      createdAt: at(-45),
    },
  });
  await prisma.workspaceMember.create({ data: { id: sid("member", "owner"), workspaceId: ws.id, userId: ownerId, role: "OWNER" } });
  return { id: ws.id, slug: ws.slug, ownerId };
}

/* ── Question library ────────────────────────────────────────────────────── */

const ownItems = (qs: { q: string; a: string }[], tech?: string): QuestionItem[] =>
  qs.map((x) => ({ q: x.q, a: x.a, ...(tech ? { tech } : {}) }));

async function seedQuestionnaires(workspaceId: string) {
  const make = (key: string, title: string, description: string, roleArea: string, minutes: number, items: QuestionItem[], daysAgo: number) =>
    prisma.aIInterviewTemplate.create({
      data: {
        id: sid("qset", key),
        workspaceId,
        title,
        description,
        estimatedMinutes: minutes,
        kind: "conversation",
        starterFiles: "{}",
        testsCode: serializeQuestionnaire(items),
        frameworkLabel: roleArea,
        createdAt: at(-daysAgo),
        updatedAt: at(-daysAgo + 1),
      },
    });

  await make("react", "React fundamentals", "Five core React questions, answered out loud. No code to write.", "React", 20, ownItems(REACT_THEORY, "reactjs"), 14);
  await make("node", "Node.js runtime", "The event loop, streams, concurrency and error handling in Node.js.", "Node.js", 20, ownItems(NODE_THEORY, "nodejs"), 11);
  await make(
    "ownership",
    "Ownership and teamwork",
    "A short conversation about how you work with others. Answer with real examples from your projects.",
    "Behavioural",
    20,
    ownItems(OWNERSHIP_QUESTIONS),
    32,
  );
  await make(
    "discovery",
    "Customer success: discovery call",
    "How you run customer conversations, handle objections and spot accounts at risk.",
    "Customer success",
    15,
    ownItems(DISCOVERY_QUESTIONS),
    6,
  );

  // From the public question bank, like "Add from public questions" does.
  const skipped: string[] = [];
  for (const [i, spec] of BANK_QUESTIONNAIRES.entries()) {
    const items: QuestionItem[] = [];
    for (const kw of spec.keywords) {
      const row = await prisma.prepQuestion.findFirst({
        where: {
          status: "published",
          technology: spec.tech,
          title: { contains: kw, mode: "insensitive" },
          slug: { notIn: items.map((x) => x.src ?? "") },
        },
        orderBy: [{ views: "desc" }, { title: "asc" }],
        select: { slug: true, title: true, answer: true, technology: true, difficulty: true },
      });
      if (!row) continue;
      items.push({ q: row.title.trim(), src: row.slug, difficulty: row.difficulty, ...(row.answer?.trim() ? { a: row.answer.trim() } : {}), ...(row.technology ? { tech: row.technology } : {}) });
    }
    if (!items.length) {
      skipped.push(spec.title);
      continue;
    }
    await make(spec.key, spec.title, `A short conversation about ${spec.roleArea}. Answer in your own words; there is no code to write.`, spec.roleArea, spec.minutes, items, 8 - i * 3);
  }
  return skipped;
}

/** Two team prompt scenarios and a few graded attempts from the live interviews. */
async function seedPromptTasks(ctx: Ctx) {
  for (const [i, t] of PROMPT_TASKS.entries()) {
    await prisma.promptScenario.create({
      data: {
        id: sid("prompt", t.key),
        slug: `${PREFIX}${t.key}`.replace(/_/g, "-"),
        title: t.title,
        description: t.description,
        objective: t.objective,
        expectedTraits: JSON.stringify(t.traits),
        difficulty: t.difficulty,
        category: t.category,
        estimatedMinutes: t.minutes,
        workspaceId: ctx.workspaceId,
        authorId: ctx.ownerId,
        createdAt: at(-20 + i),
      },
    });
  }
  for (const [i, a] of PROMPT_ATTEMPTS.entries()) {
    await prisma.promptAttempt.create({
      data: {
        id: sid("pa", i),
        scenarioId: sid("prompt", a.task),
        promptText: a.prompt,
        charCount: a.prompt.length,
        tokenEstimate: Math.ceil(a.prompt.length / 4),
        score: a.score,
        rubricScores: JSON.stringify(a.rubric),
        feedback: a.feedback,
        graderType: "ai",
        sessionId: sid("iv", a.interview),
        durationSec: 540 + i * 120,
        createdAt: at(-a.daysAgo, 15),
      },
    });
  }
}

/* ── Candidates ──────────────────────────────────────────────────────────── */

type Ctx = {
  workspaceId: string;
  slug: string;
  ownerId: string;
  team: Record<TeamKey, { id: string; email: string }>;
  candidates: Map<string, CandidateSeed & { id: string; email: string }>;
};

async function audit(
  ctx: Ctx,
  key: string,
  action: string,
  by: TeamKey,
  when: Date,
  target: { type: string; id: string } | null,
  meta: Record<string, unknown>,
) {
  await prisma.workspaceAuditLog.create({
    data: {
      id: sid("audit", key),
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.team[by].id,
      actorEmail: ctx.team[by].email,
      action,
      targetType: target?.type,
      targetId: target?.id,
      meta: JSON.stringify(meta),
      createdAt: when,
    },
  });
}

async function seedCandidates(ctx: Ctx) {
  for (const b of BATCHES) {
    await prisma.candidateBatch.create({
      data: {
        id: sid("batch", b.key),
        workspaceId: ctx.workspaceId,
        name: b.name,
        roleTitle: b.roleTitle,
        ownerId: ctx.team[b.owner].id,
        deadline: at(b.deadlineDays, 18),
        targetHires: b.targetHires,
        status: b.status,
        createdAt: at(-b.createdDaysAgo, 9),
      },
    });
  }

  for (const c of CANDIDATES) {
    const id = sid("cand", c.key);
    const email = emailFor(c.name);
    const added = at(-c.addedDaysAgo, 9);
    const changed = c.stageDaysAgo != null ? at(-c.stageDaysAgo, 15) : added;
    await prisma.candidate.create({
      data: {
        id,
        workspaceId: ctx.workspaceId,
        name: c.name,
        email,
        phone: c.phone,
        source: c.source,
        tags: JSON.stringify(c.tags),
        stage: c.stage,
        status: c.stage === "PASSED" ? "passed" : c.stage === "REJECTED" ? "rejected" : "active",
        rejectReason: c.rejectReason,
        rejectReasonNote: c.rejectReasonNote,
        stageChangedAt: changed,
        batchId: c.batch ? sid("batch", c.batch) : null,
        ownerId: ctx.team[c.owner].id,
        createdAt: added,
        updatedAt: changed,
      },
    });
    ctx.candidates.set(c.key, { ...c, id, email });

    const target = { type: "candidate", id };
    await audit(ctx, `${c.key}_created`, "CANDIDATE_CREATED", c.owner, added, target, { name: c.name, source: c.source });
    if (c.stage !== "NEW") {
      // Moved into Screening when the first assessment went out.
      const screeningAt = new Date(Math.min(changed.getTime(), added.getTime() + DAY));
      await audit(ctx, `${c.key}_screening`, "PIPELINE_STAGE_CHANGED", c.owner, screeningAt, target, { fromStage: "NEW", toStage: "SCREENING", source: "auto:assessment-sent" });
    }
    if (c.stage === "PASSED" || c.stage === "REJECTED") {
      await audit(ctx, `${c.key}_decision`, "PIPELINE_STAGE_CHANGED", c.owner, changed, target, {
        fromStage: "SCREENING",
        toStage: c.stage,
        ...(c.rejectReason ? { rejectReason: c.rejectReason } : {}),
        ...(c.manualOverride ? { manualOverride: c.manualOverride } : {}),
      });
    }
    for (const [i, n] of (c.notes ?? []).entries()) {
      await prisma.candidateNote.create({
        data: { id: sid("note", `${c.key}_${i}`), candidateId: id, authorId: ctx.team[n.by].id, body: n.body, createdAt: at(-n.daysAgo, 16) },
      });
    }
  }
}

/* ── Assessments: challenges, take-homes, interviews ─────────────────────── */

async function seedChallenges(ctx: Ctx) {
  const ids: Record<string, string> = {};
  for (const [i, c] of CHALLENGES.entries()) {
    const id = sid("chal", c.key);
    const starterFiles = JSON.stringify(c.starterFiles);
    const testFiles = JSON.stringify(c.testFiles);
    // Workspace challenge slugs are global; suffix non-demo workspaces.
    const slug = ctx.slug === DEMO_SLUG ? `acme-${c.slug}` : `${ctx.slug}-${c.slug}`;
    await prisma.challenge.create({
      data: {
        id,
        slug,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        template: c.template,
        starterFiles,
        testFiles,
        tags: JSON.stringify(c.tags),
        estimatedMinutes: c.estimatedMinutes,
        category: c.category,
        published: true,
        visibility: "private",
        authorId: ctx.ownerId,
        workspaceId: ctx.workspaceId,
        createdAt: at(-40 + i),
        updatedAt: at(-20 + i),
        steps: {
          create: { position: 0, description: c.description, template: c.template, starterFiles, testFiles, estimatedMinutes: c.estimatedMinutes },
        },
      },
    });
    ids[c.key] = id;
  }
  return ids;
}

/** Files a finished attempt submitted: the starter with its TODO filled. */
function submittedFiles(key: string, score: number): string {
  const c = CHALLENGES.find((x) => x.key === key)!;
  const files: Record<string, string> = { ...c.starterFiles };
  const main = Object.keys(files)[0];
  files[main] = files[main].replace(/\/\/ TODO[^\n]*\n?/g, score >= 80 ? "" : "// Partly done: see notes.\n");
  return JSON.stringify(files);
}

function testResults(key: string, score: number) {
  const c = CHALLENGES.find((x) => x.key === key)!;
  const test = Object.values(c.testFiles)[0] as string | undefined;
  const names = test ? [...test.matchAll(/it\("([^"]+)"/g)].map((m) => m[1]) : ["Reviewed by the team"];
  const passed = Math.round((score / 100) * names.length);
  return JSON.stringify({
    passed,
    total: names.length,
    tests: names.map((name, i) => ({ name, status: i < passed ? "pass" : "fail", ...(i < passed ? {} : { error: "Expected value did not match" }) })),
  });
}

async function candidateUser(ctx: Ctx, key: string) {
  const c = ctx.candidates.get(key)!;
  return seedUser(`cand_${key}`, c.name, c.email);
}

/** A short replay: the starter, a midway snapshot, the answer, plus any pastes and tab switches. */
function replayEvents(key: string, score: number, minutes: number, integrity: { pastes: number; blurs: number } | undefined) {
  const c = CHALLENGES.find((x) => x.key === key)!;
  const starter = c.starterFiles as Record<string, string>;
  const main = Object.keys(starter)[0];
  const end = minutes * 60_000;
  const final = JSON.parse(submittedFiles(key, score)) as Record<string, string>;
  const events: { t: number; type: string; payload: unknown }[] = [
    { t: 0, type: "snapshot", payload: { files: starter, activeFile: main } },
    { t: Math.round(end * 0.45), type: "snapshot", payload: { files: { ...starter, [main]: `${starter[main]}\n// Working on it\n` }, activeFile: main } },
    { t: end, type: "snapshot", payload: { files: final, activeFile: main } },
  ];
  for (let i = 0; i < (integrity?.blurs ?? 0); i++) {
    const t = Math.round(end * (0.25 + i * 0.2));
    events.push({ t, type: "blur", payload: {} }, { t: t + 30_000, type: "focus", payload: {} });
  }
  for (let i = 0; i < (integrity?.pastes ?? 0); i++) {
    events.push({ t: Math.round(end * (0.6 + i * 0.1)), type: "paste", payload: { length: 420 + i * 180, snippet: "export function useDebounce(value, delay) {" } });
  }
  return events;
}

async function seedTakeHomeTemplates(ctx: Ctx, challengeIds: Record<string, string>) {
  const ids = new Map<string, string>();
  for (const [i, t] of TAKE_HOME_TEMPLATES.entries()) {
    const id = sid("tht", t.key);
    await prisma.takeHomeTemplate.create({
      data: {
        id,
        workspaceId: ctx.workspaceId,
        name: t.name,
        itemsJson: JSON.stringify(t.items.map((x) => ({ challengeId: challengeIds[x.challenge], minutes: x.minutes }))),
        createdById: ctx.ownerId,
        createdAt: at(-15 + i),
        updatedAt: at(-10 + i),
      },
    });
    ids.set(t.batch, id);
  }
  return ids;
}

async function seedTakeHomes(ctx: Ctx, challengeIds: Record<string, string>) {
  const templates = await seedTakeHomeTemplates(ctx, challengeIds);
  for (const t of TAKE_HOMES) {
    const c = ctx.candidates.get(t.candidate)!;
    const id = sid("th", t.candidate);
    const sent = at(-t.sentDaysAgo, 11);
    const started = t.status === "completed" || t.status === "in_progress" ? new Date(sent.getTime() + 20 * HOUR) : null;
    const totalMin = (t.minutes ?? []).reduce((a, b) => a + b, 0);
    const finished = t.status === "completed" && started ? new Date(started.getTime() + (totalMin + 6) * 60_000) : null;
    await prisma.interviewSession.create({
      data: {
        id,
        userId: ctx.team[c.owner].id,
        workspaceId: ctx.workspaceId,
        candidateId: c.id,
        candidateName: c.name,
        title: `${BATCHES.find((b) => b.key === c.batch)?.roleTitle ?? "Engineering"} take-home`,
        type: "take-home",
        takeHomeTemplateId: (c.batch && templates.get(c.batch)) || null,
        questionTimeLimitsJson: JSON.stringify(
          Object.fromEntries(t.challenges.map((k) => [challengeIds[k], TAKE_HOME_TEMPLATES.find((x) => x.batch === c.batch)?.items.find((i) => i.challenge === k)?.minutes ?? 30])),
        ),
        creatorRole: "interviewer",
        sourceType: "challenge",
        challengeIds: JSON.stringify(t.challenges.map((k) => challengeIds[k])),
        totalSec: t.challenges.reduce((s, k) => s + CHALLENGES.find((x) => x.key === k)!.estimatedMinutes * 60, 0) + 15 * 60,
        status: t.status,
        shareToken: token(),
        candidateAccessToken: token(),
        deadlineAt: at(t.deadlineDays, 23),
        startedAt: started,
        finishedAt: finished,
        createdAt: sent,
      },
    });
    if (t.status !== "completed" && t.status !== "in_progress") continue;
    const userId = await candidateUser(ctx, t.candidate);
    let clock = started!.getTime();
    for (const [i, key] of t.challenges.entries()) {
      // In progress: the first question is done, the second is open.
      if (t.status === "in_progress" && i > 0) break;
      const score = t.scores?.[i] ?? 74;
      const minutes = t.minutes?.[i] ?? 35;
      const flags = t.integrity?.[i];
      await prisma.challengeAttempt.create({
        data: {
          eventLog: { create: { eventsData: JSON.stringify(replayEvents(key, score, minutes, flags)) } },
          integrityReport: {
            create: {
              suspicionScore: flags ? Math.min(100, flags.pastes * 30 + flags.blurs * 10) : 0,
              totalBlurSec: flags?.blurSec ?? 0,
              blurCount: flags?.blurs ?? 0,
              pasteCount: flags?.pastes ?? 0,
              pasteDetails: JSON.stringify(
                Array.from({ length: flags?.pastes ?? 0 }, (_, n) => ({ t: Math.round(minutes * 60_000 * (0.6 + n * 0.1)), length: 420 + n * 180, snippet: "export function useDebounce(value, delay) {" })),
              ),
            },
          },
          id: sid("att", `${t.candidate}_${i}`),
          userId,
          challengeId: challengeIds[key],
          sessionId: id,
          status: score >= 60 ? "passed" : "failed",
          files: submittedFiles(key, score),
          testResults: testResults(key, score),
          durationSec: minutes * 60,
          score,
          startedAt: new Date(clock),
          finishedAt: new Date(clock + minutes * 60_000),
        },
      });
      clock += (minutes + 3) * 60_000;
    }
  }

  for (const t of LEGACY_TAKE_HOMES) {
    const c = ctx.candidates.get(t.candidate)!;
    const chal = CHALLENGES.find((x) => x.key === t.challenge)!;
    const sent = at(-t.sentDaysAgo, 12);
    let attemptId: string | null = null;
    let started: Date | null = null;
    let submitted: Date | null = null;
    if (t.status === "SUBMITTED") {
      started = new Date(sent.getTime() + 26 * HOUR);
      submitted = new Date(started.getTime() + t.minutes * 60_000);
      attemptId = sid("att", `legacy_${t.candidate}`);
      await prisma.challengeAttempt.create({
        data: {
          id: attemptId,
          userId: await candidateUser(ctx, t.candidate),
          challengeId: challengeIds[t.challenge],
          status: t.score >= 60 ? "passed" : "failed",
          files: submittedFiles(t.challenge, t.score),
          testResults: testResults(t.challenge, t.score),
          durationSec: t.minutes * 60,
          score: t.score,
          startedAt: started,
          finishedAt: submitted,
        },
      });
    }
    await prisma.takeHomeAssignment.create({
      data: {
        id: sid("tha", t.candidate),
        workspaceId: ctx.workspaceId,
        candidateId: c.id,
        challengeId: challengeIds[t.challenge],
        candidateName: c.name,
        candidateEmail: c.email,
        token: token(),
        status: t.status,
        expiresAt: at(t.expiresDays, 23),
        timeLimitMin: chal.estimatedMinutes + 15,
        startedAt: started,
        submittedAt: submitted,
        attemptId,
        createdAt: sent,
      },
    });
  }
}

async function seedInterviews(ctx: Ctx, challengeIds: Record<string, string>) {
  for (const [i, iv] of INTERVIEWS.entries()) {
    const c = ctx.candidates.get(iv.candidate)!;
    const when = at(iv.atDays, 14);
    const done = iv.status === "completed";
    await prisma.interviewSession.create({
      data: {
        id: sid("iv", `${iv.candidate}_${i}`),
        userId: ctx.team[iv.interviewer].id,
        workspaceId: ctx.workspaceId,
        candidateId: c.id,
        candidateName: c.name,
        title: iv.title,
        type: "live",
        creatorRole: "interviewer",
        sourceType: "challenge",
        challengeIds: JSON.stringify(iv.challenges.map((k) => challengeIds[k])),
        totalSec: iv.minutes * 60,
        status: iv.status,
        verdict: iv.verdict ?? null,
        notes: iv.notes ?? null,
        shareToken: token(),
        shortCode: String(1000 + ((i * 7919 + iv.candidate.length * 131) % 9000)),
        scheduledAt: when,
        startedAt: done || iv.status === "in_progress" ? when : null,
        finishedAt: done ? new Date(when.getTime() + (iv.minutes - 4) * 60_000) : null,
        createdAt: at(Math.min(iv.atDays, 0) - 3, 10),
        ...(iv.ratings
          ? { rubric: { create: { ratings: JSON.stringify(iv.ratings), notes: iv.notes ?? null, interviewerId: ctx.team[iv.interviewer].id, createdAt: new Date(when.getTime() + iv.minutes * 60_000) } } }
          : {}),
      },
    });
  }
}

/* ── AI screening ────────────────────────────────────────────────────────── */

type ScreeningPlan = {
  key: "fe" | "be" | "grad";
  title: string;
  createdBy: TeamKey;
  engagement: "REACTIVE" | "OBSERVER" | "COACH";
  status: "ACTIVE" | "CLOSED";
  expiresAfterDays: number;
  reminderAfterDays: number;
  talk: { paradigm: "theory" | "conversation"; templateKey: string; questions: number };
  code: { templateId: string; paradigm: "frontend" | "backend" | "dsa"; language?: string; frameworkLabel?: string };
};

const THEORY_SETTINGS: TheorySettings = { count: null, secondsPerQuestion: 180, followUps: 1, answerMode: "voice", recordAudio: false };

const PLANS: ScreeningPlan[] = [
  {
    key: "fe",
    title: "Senior Frontend Engineer",
    createdBy: "priya",
    engagement: "OBSERVER",
    status: "ACTIVE",
    expiresAfterDays: 7,
    reminderAfterDays: 2,
    talk: { paradigm: "theory", templateKey: "react", questions: REACT_THEORY.length },
    code: { templateId: "valid-parentheses-stack", paradigm: "frontend", frameworkLabel: "React" },
  },
  {
    key: "be",
    title: "Backend Engineer (Node.js)",
    createdBy: "mei",
    engagement: "REACTIVE",
    status: "ACTIVE",
    expiresAfterDays: 7,
    reminderAfterDays: 3,
    talk: { paradigm: "theory", templateKey: "node", questions: NODE_THEORY.length },
    code: { templateId: "backend-node-rate-limiter", paradigm: "backend", language: "node", frameworkLabel: "Express" },
  },
  {
    key: "grad",
    title: "Graduate Software Engineer",
    createdBy: "priya",
    engagement: "REACTIVE",
    status: "CLOSED",
    expiresAfterDays: 5,
    reminderAfterDays: 2,
    talk: { paradigm: "conversation", templateKey: "ownership", questions: OWNERSHIP_QUESTIONS.length },
    code: { templateId: "dsa-group-anagrams", paradigm: "dsa", language: "python" },
  },
];

const CODE_RATINGS: Record<Level, { CodeQuality: number; ProblemSolving: number; Communication: number }> = {
  strong: { CodeQuality: 5, ProblemSolving: 5, Communication: 4 },
  partial: { CodeQuality: 3, ProblemSolving: 3, Communication: 4 },
  weak: { CodeQuality: 2, ProblemSolving: 1, Communication: 2 },
};

/** Candidate's files for the code round: the starter with its stub replaced. */
function codeFiles(templateId: string, starter: Record<string, string>, level: Level): Record<string, string> {
  const files = { ...starter };
  if (templateId === "valid-parentheses-stack") {
    const f = files["/validate.js"];
    files["/validate.js"] = f.slice(0, f.indexOf("export function")) + PARENS_SOLUTIONS[level] + "\n";
  } else if (templateId === "backend-node-rate-limiter") {
    const f = files["/index.js"];
    files["/index.js"] = f.slice(0, f.indexOf("class RateLimiter")) + RATE_LIMITER_SOLUTIONS[level] + "\n\n" + f.slice(f.indexOf("// Demo"));
  } else if (templateId === "dsa-group-anagrams") {
    const f = files["/solution.py"];
    files["/solution.py"] = f.slice(0, f.indexOf("def groupAnagrams")) + ANAGRAM_SOLUTIONS[level] + "\n\n" + f.slice(f.indexOf("# Demo"));
  }
  return files;
}

const CODE_SUMMARY: Record<string, Record<Level, { plus: string[]; minus: string[] }>> = {
  "valid-parentheses-stack": {
    strong: { plus: ["Stack-based solution in O(n) with a lookup map for pairs", "Explained why the stack must be empty at the end"], minus: ["Did not mention ignoring non-bracket characters until asked"] },
    partial: { plus: ["Uses a stack and rejects a closer with nothing to pop"], minus: ["Never checks that the popped opener matches the closer, so ([)] passes"] },
    weak: { plus: ["Handles the round-bracket case"], minus: ["Counts only ( and ); square and curly brackets are ignored", "Order is not checked, so )( is accepted"] },
  },
  "backend-node-rate-limiter": {
    strong: { plus: ["True sliding window per key with old timestamps dropped", "Rejected requests do not consume quota"], minus: ["Map entries for idle keys are never cleaned up"] },
    partial: { plus: ["Per-key limits with a clear structure"], minus: ["Fixed window, so bursts at a window boundary can double the limit", "Counts rejected requests too"] },
    weak: { plus: ["Runs without errors"], minus: ["One global counter: ignores the key and never resets"] },
  },
  "dsa-group-anagrams": {
    strong: { plus: ["Sorted-string key in a defaultdict: O(n k log k)", "Talked through the counting-array key as an O(n k) option"], minus: [] },
    partial: { plus: ["Correct groups on the sample input"], minus: ["Pairwise comparison makes it O(n squared k log k)"] },
    weak: { plus: [], minus: ["Returned the input as one group; the function was not implemented"] },
  },
};

const talkSummary = (paradigm: "theory" | "conversation", avg: number) =>
  avg >= 80
    ? { plus: [paradigm === "theory" ? "Precise answers with the right terms and trade-offs" : "Specific, first-person examples with clear outcomes"], minus: [] as string[] }
    : avg >= 55
      ? { plus: [paradigm === "theory" ? "Knows the basics of each topic" : "Friendly and clear"], minus: [paradigm === "theory" ? "Answers often stopped at the definition without the why" : "Examples were general and light on what they personally did"] }
      : { plus: [] as string[], minus: [paradigm === "theory" ? "Several answers were wrong or missed the point of the question" : "Struggled to give concrete examples"] };

const verdictFor = (score: number): TheoryVerdict => (score >= 4 ? "strong" : score >= 2 ? "partial" : "missed");

async function seedScreenings(ctx: Ctx) {
  const qsets = {
    react: REACT_THEORY,
    node: NODE_THEORY,
  } as Record<string, OwnQuestion[]>;

  let ledger = 0;
  const charge = async (sessionId: string, when: Date, level: string) => {
    await prisma.aIInterviewCreditLedger.create({
      data: { id: sid("credit", `use_${ledger++}`), workspaceId: ctx.workspaceId, kind: "CONSUMPTION", amount: -creditCostForLevel(level), sessionId, note: "Screening started", createdAt: when },
    });
  };
  await prisma.aIInterviewCreditLedger.create({
    data: { id: sid("credit", "trial"), workspaceId: ctx.workspaceId, kind: "GRANT", amount: 25, note: "Trial credits", createdAt: at(-45) },
  });
  await prisma.aIInterviewCreditLedger.create({
    data: { id: sid("credit", "purchase"), workspaceId: ctx.workspaceId, kind: "PURCHASE", amount: 100, note: "100 screening credits", createdAt: at(-31) },
  });

  for (const plan of PLANS) {
    const batchId = sid("screen", plan.key);
    const talkTemplateId = sid("qset", plan.talk.templateKey);
    const codeTpl = AI_INTERVIEW_TEMPLATES.find((t) => t.id === plan.code.templateId)!;
    const talkMinutes = plan.talk.paradigm === "theory" ? theoryMinutes(THEORY_SETTINGS, plan.talk.questions) : 20;
    const specs: RoundSpecInput[] = [
      {
        paradigm: plan.talk.paradigm,
        sourceKind: "scaffold",
        templateId: talkTemplateId,
        estimatedMinutes: talkMinutes,
        ...(plan.talk.paradigm === "theory" ? { theory: THEORY_SETTINGS } : {}),
      },
      {
        paradigm: plan.code.paradigm,
        language: plan.code.language,
        frameworkLabel: plan.code.frameworkLabel,
        sourceKind: "scaffold",
        templateId: plan.code.templateId,
        estimatedMinutes: codeTpl.estimatedMinutes,
      },
    ];
    const starters = await snapshotStarters(specs, ctx.workspaceId);
    const codeStarter = starters.get(`scaffold::${plan.code.templateId}`) ?? codeTpl.starterFiles;
    const people = SCREENINGS[plan.key];
    const createdAt = at(-Math.max(...people.map((p) => p.invitedDaysAgo)), 9);

    await prisma.aIScreeningBatch.create({
      data: {
        id: batchId,
        workspaceId: ctx.workspaceId,
        positionTitle: plan.title,
        createdByUserId: ctx.team[plan.createdBy].id,
        status: plan.status,
        engagementLevel: plan.engagement,
        expiresAfterDays: plan.expiresAfterDays,
        reminderAfterDays: plan.reminderAfterDays,
        createdAt,
        roundSpecs: {
          create: specs.map((r, order) => ({
            id: sid("spec", `${plan.key}_${order}`),
            order,
            paradigm: r.paradigm,
            language: r.language,
            frameworkLabel: r.frameworkLabel,
            sourceKind: r.sourceKind,
            templateId: r.templateId,
            estimatedMinutes: r.estimatedMinutes ?? 30,
            ...(r.paradigm === "theory" ? { theoryJson: JSON.stringify(THEORY_SETTINGS) } : {}),
          })),
        },
      },
    });

    for (const p of people) {
      await seedScreeningSession(ctx, plan, p, { batchId, talkTemplateId, talkMinutes, codeStarter, qsets, charge });
    }
  }
}

async function seedScreeningSession(
  ctx: Ctx,
  plan: ScreeningPlan,
  p: ScreeningSeed,
  x: {
    batchId: string;
    talkTemplateId: string;
    talkMinutes: number;
    codeStarter: Record<string, string>;
    qsets: Record<string, OwnQuestion[]>;
    charge: (sessionId: string, when: Date, level: string) => Promise<void>;
  },
) {
  const c = ctx.candidates.get(p.candidate)!;
  const id = sid("ai", p.candidate);
  const r0 = sid("round", `${p.candidate}_0`);
  const r1 = sid("round", `${p.candidate}_1`);
  const invited = at(-p.invitedDaysAgo, 10);
  const codeTpl = AI_INTERVIEW_TEMPLATES.find((t) => t.id === plan.code.templateId)!;
  const theory = plan.talk.paradigm === "theory";
  const own = theory ? x.qsets[plan.talk.templateKey] : null;
  const theoryJson = own ? JSON.stringify({ v: 1, settings: THEORY_SETTINGS, items: ownItems(own, plan.key === "fe" ? "reactjs" : "nodejs") }) : null;

  const completed = p.status === "COMPLETED";
  const active = p.status === "ACTIVE";
  const started = completed ? new Date(invited.getTime() + 22 * HOUR) : active ? new Date(now - 35 * 60_000) : null;
  const talkEnd = started ? new Date(started.getTime() + (x.talkMinutes - 2) * 60_000) : null;
  const finished = completed && talkEnd ? new Date(talkEnd.getTime() + (codeTpl.estimatedMinutes - 4) * 60_000) : null;

  // Talk round (theory or conversation).
  let talkScore: number | null = null;
  let answersJson: string | null = null;
  const chat: { role: "user" | "assistant"; text: string; roundId?: string }[] = [];
  if (completed || active) {
    const levels = p.answers ?? ["strong", "partial"];
    const count = completed ? levels.length : 2;
    if (own) {
      const items: TheoryAnswer[] = own.slice(0, count).map((q, i) => {
        const lv = levels[i];
        const g = q.grades[lv];
        return {
          q: q.q,
          a: q.answers[lv],
          mode: i === 2 && lv !== "strong" ? "typed" : "voice",
          skipped: false,
          seconds: lv === "strong" ? 150 - i * 7 : lv === "partial" ? 95 + i * 5 : 60,
          firstWordSec: lv === "weak" ? 14 : 4 + i,
          blurs: (p.suspicion ?? 0) > 50 ? 2 : 0,
          followUps: [],
          ...(completed ? { grade: { score: g.score, verdict: verdictFor(g.score), covered: g.covered, missed: g.missed, reason: `${g.score} of 5: ${g.covered.toLowerCase()}` } } : {}),
        };
      });
      answersJson = JSON.stringify({ v: 1, items, pendingFollowUp: null });
      if (completed) talkScore = theoryRoundScore(items, own.length);
    } else {
      // Conversation round: the interviewer asks each question in chat.
      const asked = OWNERSHIP_QUESTIONS.slice(0, count);
      chat.push({ role: "assistant", text: `Hi ${c.name.split(" ")[0]}, thanks for joining. This first part is a short conversation, no code. Answer with real examples where you can.`, roundId: r0 });
      for (const [i, q] of asked.entries()) {
        chat.push({ role: "assistant", text: q.q, roundId: r0 });
        chat.push({ role: "user", text: q.answers[levels[i]], roundId: r0 });
      }
      if (completed) {
        chat.push({ role: "assistant", text: "Thank you, that is everything for this part. Next is a short coding round.", roundId: r0 });
        talkScore = Math.round(levels.reduce((s, l) => s + CONVERSATION_POINTS[l], 0) / levels.length);
      }
    }
  }

  // Code round.
  const code = completed ? (p.code ?? "partial") : null;
  const codeScore = completed ? (p.codeScore ?? 60) : null;
  if (code) {
    const first = c.name.split(" ")[0];
    const plans: Record<Level, string> = {
      strong: "I will walk the input once and keep state in a structure that lets me check each step in constant time, then handle the edge cases.",
      partial: "I think I can loop over the input and keep a count, then fix the edge cases after.",
      weak: "I am not sure yet, I will try something and run it.",
    };
    chat.push(
      { role: "assistant", text: `Round 2: ${codeTpl.title}. Read the brief, then tell me your plan before you start, ${first}.`, roundId: r1 },
      { role: "user", text: plans[code], roundId: r1 },
      {
        role: "assistant",
        text:
          code === "strong"
            ? "Sounds good. What is the time complexity, and is there any input you would test first?"
            : code === "partial"
              ? "Before you run it: what happens with an input where the order matters, not just the counts?"
              : "Try the sample input first and tell me what you see.",
        roundId: r1,
      },
      {
        role: "user",
        text:
          code === "strong"
            ? "Linear in the input size. I would test the empty case and a case where everything is valid until the very end."
            : code === "partial"
              ? "Good point, I think it still passes the samples. I will submit and look at ordering if I have time."
              : "It prints something but I am not sure it is right. I will submit what I have.",
        roundId: r1,
      },
      { role: "assistant", text: "Thanks. Submitting the round now.", roundId: r1 },
    );
  }

  const score = talkScore != null && codeScore != null ? Math.round((talkScore + codeScore) / 2) : null;
  const talkRatings = talkScore == null ? null : talkScore >= 80 ? { CodeQuality: 0, ProblemSolving: 4, Communication: 5 } : talkScore >= 55 ? { CodeQuality: 0, ProblemSolving: 3, Communication: 4 } : { CodeQuality: 0, ProblemSolving: 2, Communication: 2 };
  const codeRatings = code ? CODE_RATINGS[code] : null;
  const summary =
    completed && talkScore != null && codeScore != null && code
      ? [
          `Round 1 (${talkScore}/100):`,
          ...talkSummary(plan.talk.paradigm, talkScore).plus.map((s) => `+ ${s}`),
          ...talkSummary(plan.talk.paradigm, talkScore).minus.map((s) => `- ${s}`),
          `Round 2 (${codeScore}/100):`,
          ...CODE_SUMMARY[plan.code.templateId][code].plus.map((s) => `+ ${s}`),
          ...CODE_SUMMARY[plan.code.templateId][code].minus.map((s) => `- ${s}`),
        ].join("\n")
      : null;

  const expiresAt = new Date(invited.getTime() + plan.expiresAfterDays * DAY);
  const codeFilesJson = code ? JSON.stringify(codeFiles(plan.code.templateId, x.codeStarter, code)) : "{}";
  const round = (order: 0 | 1): Prisma.AIInterviewRoundCreateWithoutSessionInput => {
    const talk = order === 0;
    const status = completed ? "COMPLETED" : active && talk ? "ACTIVE" : "PENDING";
    return {
      id: talk ? r0 : r1,
      order,
      paradigm: talk ? plan.talk.paradigm : plan.code.paradigm,
      language: talk ? null : plan.code.language,
      frameworkLabel: talk ? null : plan.code.frameworkLabel,
      sourceKind: "scaffold",
      templateId: talk ? x.talkTemplateId : plan.code.templateId,
      estimatedMinutes: talk ? x.talkMinutes : codeTpl.estimatedMinutes,
      filesJson: talk ? "{}" : codeFilesJson,
      ...(talk ? {} : { starterFilesJson: JSON.stringify(x.codeStarter) }),
      ...(talk && theoryJson ? { theoryJson } : {}),
      ...(talk && answersJson ? { answersJson } : {}),
      status,
      score: completed ? (talk ? talkScore : codeScore) : null,
      ratings: completed ? JSON.stringify(talk ? talkRatings : codeRatings) : null,
      startedAt: talk ? started : completed ? talkEnd : null,
      finishedAt: completed ? (talk ? talkEnd : finished) : null,
      createdAt: invited,
    };
  };

  await prisma.aIInterviewSession.create({
    data: {
      id,
      workspaceId: ctx.workspaceId,
      batchId: x.batchId,
      candidateId: c.id,
      candidateName: c.name,
      candidateEmail: c.email,
      positionTitle: plan.title,
      templateId: x.talkTemplateId,
      engagementLevel: plan.engagement,
      status: p.status,
      chatHistory: JSON.stringify(chat),
      filesJson: "{}",
      score,
      ratings: completed && talkRatings && codeRatings
        ? JSON.stringify({
            CodeQuality: codeRatings.CodeQuality,
            ProblemSolving: Math.round((talkRatings.ProblemSolving + codeRatings.ProblemSolving) / 2),
            Communication: Math.round((talkRatings.Communication + codeRatings.Communication) / 2),
          })
        : null,
      aiSummary: summary,
      aiSuspicionScore: completed || active ? (p.suspicion ?? 5) : null,
      startedAt: started,
      finishedAt: finished,
      timeSpentSec: completed && started && finished ? Math.round((finished.getTime() - started.getTime()) / 1000) : active ? 30 * 60 : 0,
      expiresAt,
      inviteSentAt: invited,
      inviteEmailStatus: "SENT",
      reminderSentAt: p.reminderSent ? new Date(invited.getTime() + plan.reminderAfterDays * DAY) : null,
      createdAt: invited,
      updatedAt: finished ?? started ?? invited,
      rounds: { create: [round(0), round(1)] },
    },
  });
  if (started) await x.charge(id, started, plan.engagement);
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  assertLocalDatabase();
  console.log("[seed:recruiter] Removing earlier demo rows…");
  await teardown();
  if (args.has("clean")) {
    console.log("[seed:recruiter] Clean only: done.");
    return;
  }

  const ws = await resolveWorkspace();
  console.log(`[seed:recruiter] Workspace /w/${ws.slug}`);

  const owner = await prisma.user.findUniqueOrThrow({ where: { id: ws.ownerId }, select: { id: true, email: true } });
  const team = { owner: { id: owner.id, email: owner.email ?? "" } } as Ctx["team"];
  for (const t of TEAM) {
    const userId = await seedUser(t.key, t.name, t.email);
    team[t.key] = { id: userId, email: t.email };
    const member = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: ws.id, userId } }, select: { id: true } });
    if (!member) await prisma.workspaceMember.create({ data: { id: sid("member", t.key), workspaceId: ws.id, userId, role: t.role } });
  }

  const ctx: Ctx = { workspaceId: ws.id, slug: ws.slug, ownerId: ws.ownerId, team, candidates: new Map() };

  const skipped = await seedQuestionnaires(ws.id);
  console.log(`  ✓ Question library: questionnaires${skipped.length ? ` (skipped ${skipped.join(", ")}: public question bank not loaded)` : ""}`);
  await seedCandidates(ctx);
  console.log(`  ✓ Candidates: ${CANDIDATES.length} in ${BATCHES.length} batches, with notes and activity`);
  const challengeIds = await seedChallenges(ctx);
  await seedTakeHomes(ctx, challengeIds);
  await seedInterviews(ctx, challengeIds);
  console.log(`  ✓ Take home and interviews: ${CHALLENGES.length} challenges, ${TAKE_HOME_TEMPLATES.length} templates, ${TAKE_HOMES.length + LEGACY_TAKE_HOMES.length} take-homes, ${INTERVIEWS.length} interviews`);
  await seedPromptTasks(ctx);
  console.log(`  ✓ Prompt tasks: ${PROMPT_TASKS.length} team scenarios, ${PROMPT_ATTEMPTS.length} graded attempts`);
  await seedScreenings(ctx);
  const total = Object.values(SCREENINGS).reduce((n, list) => n + list.length, 0);
  console.log(`  ✓ AI screening: ${PLANS.length} screenings, ${total} candidates, credits`);

  console.log(`\n[seed:recruiter] Done. Open /w/${ws.slug}/candidates`);
  if (owner.email === DEMO_OWNER_EMAIL) console.log(`  Sign in as ${DEMO_OWNER_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
