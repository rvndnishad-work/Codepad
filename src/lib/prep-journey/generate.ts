/**
 * Server-side curriculum generator for Prep Journeys.
 *
 * Strategy: for each tech in the stack, take a difficulty-stratified,
 * top-viewed slice of the published question bank sized to the journey's
 * total time budget, ordered easy → hard (the same convention the
 * /interview-questions/<tech> pages use). Days are then filled round-robin
 * across techs so every study day mixes the stack, and roughly every third
 * day swaps part of the budget for one hands-on challenge.
 */
import { prisma } from "@/lib/prisma";
import { QUESTION_MINUTES } from "./shared";

export interface GeneratedItem {
  day: number;
  position: number;
  itemType: "question" | "challenge";
  refSlug: string;
  title: string;
  technology: string | null;
  difficulty: string | null;
  estMinutes: number;
}

interface QueueEntry {
  itemType: "question" | "challenge";
  refSlug: string;
  title: string;
  technology: string | null;
  difficulty: string | null;
  estMinutes: number;
}

const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** Every Nth day gets one hands-on challenge when the bank has a match. */
const CHALLENGE_CADENCE = 3;

function questionMinutes(difficulty: string | null): number {
  return QUESTION_MINUTES[difficulty ?? "medium"] ?? QUESTION_MINUTES.medium;
}

/**
 * Candidate techs a challenge can count toward, in priority order. Mirrors
 * challengeCategory() in ChallengeList (harness = algorithms, test-* = js,
 * else = ui) but resolves to interview-question tech slugs.
 */
function challengeTechs(template: string, tags: string[]): string[] {
  const lower = tags.map((t) => t.toLowerCase());
  if (template === "harness") return ["dsa"];
  if (template === "test-ts" || template === "ts-node") return ["typescript", "javascript-coding", "javascript"];
  if (/^test-/.test(template)) return ["javascript-coding", "javascript"];
  if (template === "node") return ["nodejs"];
  if (template === "python") return ["python"];
  if (["go", "java", "cpp", "rust"].includes(template)) return [];
  if (template.startsWith("react") || lower.includes("react")) return ["reactjs", "machine-coding"];
  if (template.startsWith("vue") || lower.includes("vue")) return ["vuejs", "machine-coding"];
  if (template.startsWith("angular") || lower.includes("angular")) return ["angular", "machine-coding"];
  // Remaining UI templates (vanilla/static/svelte/solid…) → machine coding.
  return ["machine-coding", "javascript"];
}

/**
 * Difficulty-stratified selection: keep the bank's easy/medium/hard mix while
 * shrinking to the minute budget, preferring the most-viewed questions inside
 * each band, and return the slice ordered easy → hard.
 */
function stratifiedSlice(
  bank: { slug: string; title: string; technology: string | null; difficulty: string; views: number }[],
  minuteBudget: number,
): QueueEntry[] {
  const totalMinutes = bank.reduce((sum, q) => sum + questionMinutes(q.difficulty), 0);
  const fraction = totalMinutes > 0 ? Math.min(1, minuteBudget / totalMinutes) : 0;

  const bands: Record<string, typeof bank> = { easy: [], medium: [], hard: [] };
  for (const q of bank) {
    (bands[q.difficulty] ?? bands.medium).push(q);
  }

  const picked: typeof bank = [];
  for (const key of ["easy", "medium", "hard"]) {
    const band = bands[key].sort((a, b) => b.views - a.views);
    picked.push(...band.slice(0, Math.ceil(band.length * fraction)));
  }

  picked.sort(
    (a, b) =>
      (DIFF_RANK[a.difficulty] ?? 1) - (DIFF_RANK[b.difficulty] ?? 1) || b.views - a.views,
  );

  return picked.map((q) => ({
    itemType: "question" as const,
    refSlug: q.slug,
    title: q.title,
    technology: q.technology,
    difficulty: q.difficulty,
    estMinutes: questionMinutes(q.difficulty),
  }));
}

export async function generateJourneyPlan(opts: {
  techStack: string[];
  dailyMinutes: number;
  totalDays: number;
}): Promise<{ totalDays: number; items: GeneratedItem[] }> {
  const stack = opts.techStack.filter(Boolean);
  const { dailyMinutes, totalDays } = opts;

  const [questions, challenges] = await Promise.all([
    prisma.prepQuestion.findMany({
      where: { technology: { in: stack }, status: "published" },
      select: { slug: true, title: true, technology: true, difficulty: true, views: true },
      orderBy: { views: "desc" },
    }),
    prisma.challenge.findMany({
      where: { published: true, visibility: "public" },
      select: {
        slug: true,
        title: true,
        difficulty: true,
        template: true,
        tags: true,
        estimatedMinutes: true,
        featured: true,
      },
    }),
  ]);

  // ── Per-tech question queues, stratified to the journey's budget ──
  const challengeDays = Math.floor(totalDays / CHALLENGE_CADENCE);
  const challengeMinutesReserved = challengeDays * Math.min(20, dailyMinutes);
  const questionBudget = Math.max(0, totalDays * dailyMinutes - challengeMinutesReserved);
  const perTechBudget = stack.length > 0 ? questionBudget / stack.length : 0;

  const questionQueues = new Map<string, QueueEntry[]>();
  for (const tech of stack) {
    const bank = questions.filter((q) => q.technology === tech);
    if (bank.length > 0) questionQueues.set(tech, stratifiedSlice(bank, perTechBudget));
  }

  // ── Per-tech challenge queues (each challenge lands in ONE queue: its
  //    highest-priority tech that's actually in the stack) ──
  const challengeQueues = new Map<string, QueueEntry[]>();
  for (const c of challenges) {
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(c.tags ?? "[]");
      if (Array.isArray(parsed)) tags = parsed;
    } catch {
      /* unparseable tags → treat as none */
    }
    const tech = challengeTechs(c.template, tags).find((t) => stack.includes(t));
    if (!tech) continue;
    const queue = challengeQueues.get(tech) ?? [];
    queue.push({
      itemType: "challenge",
      refSlug: c.slug,
      title: c.title,
      technology: tech,
      difficulty: c.difficulty,
      estMinutes: Math.min(40, Math.max(10, c.estimatedMinutes)),
    });
    challengeQueues.set(tech, queue);
  }
  for (const queue of challengeQueues.values()) {
    queue.sort((a, b) => (DIFF_RANK[a.difficulty ?? "medium"] ?? 1) - (DIFF_RANK[b.difficulty ?? "medium"] ?? 1));
  }

  // ── Fill days: round-robin across tech queues with persistent rotation so
  //    each tech progresses easy → hard across the whole journey ──
  const items: GeneratedItem[] = [];
  const rotation = stack.filter((t) => questionQueues.has(t));
  let rotationIdx = 0;
  let challengeRotationIdx = 0;
  const challengeTechRotation = stack.filter((t) => challengeQueues.has(t));

  for (let day = 1; day <= totalDays; day++) {
    let budget = dailyMinutes;
    let position = 0;

    // Challenge day: one hands-on build first, questions fill the remainder.
    if (day % CHALLENGE_CADENCE === 0 && challengeTechRotation.length > 0) {
      for (let i = 0; i < challengeTechRotation.length; i++) {
        const tech = challengeTechRotation[(challengeRotationIdx + i) % challengeTechRotation.length];
        const queue = challengeQueues.get(tech)!;
        const next = queue[0];
        if (next && next.estMinutes <= budget) {
          queue.shift();
          items.push({ day, position: position++, ...next });
          budget -= next.estMinutes;
          challengeRotationIdx = (challengeRotationIdx + i + 1) % challengeTechRotation.length;
          break;
        }
      }
    }

    // Question fill.
    let emptyPasses = 0;
    while (budget > 0 && rotation.length > 0 && emptyPasses < rotation.length) {
      const tech = rotation[rotationIdx % rotation.length];
      rotationIdx = (rotationIdx + 1) % Math.max(1, rotation.length);
      const queue = questionQueues.get(tech);
      const next = queue?.[0];
      if (!next) {
        emptyPasses += 1;
        continue;
      }
      // Always allow at least one question even if it slightly overflows the
      // remaining budget, so low-budget days never end up empty.
      if (next.estMinutes > budget && position > 0) {
        emptyPasses += 1;
        continue;
      }
      queue!.shift();
      items.push({ day, position: position++, ...next });
      budget -= next.estMinutes;
      emptyPasses = 0;
    }

    // All queues drained → the journey is shorter than requested; stop here.
    const questionsLeft = [...questionQueues.values()].some((q) => q.length > 0);
    const challengesLeft = [...challengeQueues.values()].some((q) => q.length > 0);
    if (!questionsLeft && !challengesLeft) {
      return { totalDays: day, items };
    }
  }

  return { totalDays, items };
}
