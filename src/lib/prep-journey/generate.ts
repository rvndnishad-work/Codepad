/**
 * Server-side curriculum generator for Prep Journeys.
 *
 * Strategy: for each tech in the stack, take a difficulty-stratified,
 * top-viewed slice of the published question bank sized to the journey's
 * total time budget, ordered easy → hard (the same convention the
 * /interview-questions/<tech> pages use). Days are then filled round-robin
 * across techs so every study day mixes the stack, and roughly every third
 * day swaps part of the budget for one hands-on challenge.
 *
 * The AI-Ready journey (any stack containing "ai-engineering") gets two
 * extra touches: its question bank is ordered by topic phase — fundamentals →
 * prompting → RAG → agents → production → evals, easy → hard within each —
 * and Prompt Arena scenarios are woven in on their own cadence as a hands-on
 * prompt-engineering practice stage.
 */
import { prisma } from "@/lib/prisma";
import { QUESTION_MINUTES, AI_ENGINEERING_TECH, scenarioDifficulty } from "./shared";

export interface GeneratedItem {
  day: number;
  position: number;
  itemType: "question" | "challenge" | "scenario";
  refSlug: string;
  title: string;
  technology: string | null;
  difficulty: string | null;
  estMinutes: number;
}

interface QueueEntry {
  itemType: "question" | "challenge" | "scenario";
  refSlug: string;
  title: string;
  technology: string | null;
  difficulty: string | null;
  estMinutes: number;
}

interface BankQuestion {
  slug: string;
  title: string;
  technology: string | null;
  difficulty: string;
  views: number;
  tags: string;
}

const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** Every Nth day gets one hands-on challenge when the bank has a match. */
const CHALLENGE_CADENCE = 3;

/** Every Nth day gets one Prompt Arena scenario (AI-Ready journeys only). */
const SCENARIO_CADENCE = 4;

/**
 * The AI-Ready curriculum's topic phases, in teaching order. Each phase owns a
 * set of question tags; a question's phase is the one most of its tags fall
 * into (ties resolve to the earlier phase), so the bank progresses concept-by-
 * concept even though PrepQuestion rows carry no explicit ordering.
 */
const AI_PHASES = ["fundamentals", "prompting", "rag", "agents", "production", "evals"] as const;

const AI_PHASE_TAGS: Record<(typeof AI_PHASES)[number], string[]> = {
  fundamentals: [
    "fundamentals", "llm", "transformer", "next-token", "tokens", "tokenization", "pricing",
    "context-window", "limits", "temperature", "top-p", "sampling", "inference", "base-model",
    "instruction-tuning", "rlhf", "post-training", "hallucination", "grounding", "reliability",
    "fine-tuning", "lora", "adaptation", "quantization", "open-weights", "self-hosting", "api",
    "build-vs-buy", "architecture", "multimodal", "vision", "audio", "capability",
  ],
  prompting: [
    "prompting", "prompt-engineering", "few-shot", "zero-shot", "in-context-learning",
    "chain-of-thought", "reasoning", "system-prompt", "roles", "structured-output", "json-schema",
    "validation", "prompt-injection", "security", "guardrails", "context-engineering",
    "summarization", "chat",
  ],
  rag: [
    "rag", "embeddings", "vectors", "semantic-search", "similarity", "cosine", "ann", "hnsw",
    "vector-database", "pgvector", "retrieval", "chunking", "indexing", "hybrid-search", "bm25",
    "rrf", "reranking", "cross-encoder", "rag-evaluation", "recall", "faithfulness",
    "metadata-filtering", "citations", "memory",
  ],
  agents: [
    "agents", "agent-loop", "react-pattern", "function-calling", "tool-use", "tool-design",
    "tools", "schemas", "mcp", "protocol", "integration", "multi-agent", "orchestration",
    "subagents", "state", "long-term-memory", "sandboxing", "least-privilege", "human-in-the-loop",
    "approvals", "safety", "agent-evals", "trajectories", "tracing",
  ],
  production: [
    "production", "deployment", "llmops", "streaming", "sse", "ux", "ttft", "latency",
    "performance", "optimization", "rate-limits", "fallbacks", "observability", "logging",
    "moderation", "pii", "privacy", "compliance", "batch-api", "async", "pipelines",
    "model-selection", "routing", "repair-loop", "prompt-caching", "semantic-caching", "caching",
    "kv-cache", "cost", "prompt-versioning", "infrastructure", "multi-tenancy", "risk",
    "error-handling", "retries", "resilience", "monitoring",
  ],
  evals: [
    "evals", "llm-as-judge", "bias", "grading", "golden-dataset", "labelling", "graders",
    "code-graders", "regression-testing", "model-upgrade", "ci", "red-teaming", "jailbreak",
    "adversarial", "drift", "metrics", "bleu", "rouge", "semantic-similarity", "testing", "quality",
  ],
};

/** tag → phase index, built once from AI_PHASE_TAGS. */
const AI_TAG_PHASE = new Map<string, number>();
AI_PHASES.forEach((phase, idx) => {
  for (const tag of AI_PHASE_TAGS[phase]) AI_TAG_PHASE.set(tag, idx);
});

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((t) => String(t).toLowerCase()) : [];
  } catch {
    return [];
  }
}

/** Which topic phase a question belongs to — the phase most of its tags vote for. */
function aiPhaseRank(tags: string[]): number {
  const votes = new Array(AI_PHASES.length).fill(0);
  for (const tag of tags) {
    const idx = AI_TAG_PHASE.get(tag);
    if (idx !== undefined) votes[idx] += 1;
  }
  let best = 0;
  for (let i = 1; i < votes.length; i++) {
    if (votes[i] > votes[best]) best = i;
  }
  return best; // ties keep the earlier (lower-index) phase — 0 = fundamentals
}

function questionMinutes(difficulty: string | null): number {
  return QUESTION_MINUTES[difficulty ?? "medium"] ?? QUESTION_MINUTES.medium;
}

/**
 * AI-Ready ordering: group the bank by topic phase, keep each phase's most-
 * viewed questions when trimming to budget, and emit phases in teaching order
 * with easy → hard inside each. The result walks fundamentals → evals as the
 * journey's days advance.
 */
function aiPhasedSlice(bank: BankQuestion[], minuteBudget: number): QueueEntry[] {
  const totalMinutes = bank.reduce((sum, q) => sum + questionMinutes(q.difficulty), 0);
  const fraction = totalMinutes > 0 ? Math.min(1, minuteBudget / totalMinutes) : 0;

  const byPhase: BankQuestion[][] = AI_PHASES.map(() => []);
  for (const q of bank) byPhase[aiPhaseRank(parseTags(q.tags))].push(q);

  const picked: BankQuestion[] = [];
  for (const phase of byPhase) {
    // Prefer the most-viewed within the phase when trimming, then present the
    // kept questions easy → hard so each phase itself ramps in difficulty.
    const ranked = [...phase].sort((a, b) => b.views - a.views);
    const kept = ranked.slice(0, Math.ceil(ranked.length * fraction));
    kept.sort(
      (a, b) => (DIFF_RANK[a.difficulty] ?? 1) - (DIFF_RANK[b.difficulty] ?? 1) || b.views - a.views,
    );
    picked.push(...kept);
  }

  return picked.map((q) => ({
    itemType: "question" as const,
    refSlug: q.slug,
    title: q.title,
    technology: q.technology,
    difficulty: q.difficulty,
    estMinutes: questionMinutes(q.difficulty),
  }));
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
function stratifiedSlice(bank: BankQuestion[], minuteBudget: number): QueueEntry[] {
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
  const wantsPromptPractice = stack.includes(AI_ENGINEERING_TECH);

  const [questions, challenges, scenarios] = await Promise.all([
    prisma.prepQuestion.findMany({
      where: { technology: { in: stack }, status: "published" },
      select: { slug: true, title: true, technology: true, difficulty: true, views: true, tags: true },
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
    // Prompt Arena scenarios back the AI-Ready practice stage. Only the public,
    // platform-wide, published set — the same scenarios the Arena itself shows.
    wantsPromptPractice
      ? prisma.promptScenario.findMany({
          where: { workspaceId: null, published: true },
          select: { slug: true, title: true, difficulty: true, estimatedMinutes: true },
          orderBy: { estimatedMinutes: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // ── Per-tech question queues, stratified to the journey's budget ──
  const challengeDays = Math.floor(totalDays / CHALLENGE_CADENCE);
  const challengeMinutesReserved = challengeDays * Math.min(20, dailyMinutes);
  const scenarioDays = wantsPromptPractice ? Math.floor(totalDays / SCENARIO_CADENCE) : 0;
  const scenarioMinutesReserved = scenarioDays * Math.min(20, dailyMinutes);
  const questionBudget = Math.max(
    0,
    totalDays * dailyMinutes - challengeMinutesReserved - scenarioMinutesReserved,
  );
  const perTechBudget = stack.length > 0 ? questionBudget / stack.length : 0;

  const questionQueues = new Map<string, QueueEntry[]>();
  for (const tech of stack) {
    const bank = questions.filter((q) => q.technology === tech);
    if (bank.length === 0) continue;
    // The AI bank walks its topic phases; every other tech keeps the plain
    // difficulty-stratified, most-viewed ordering.
    questionQueues.set(
      tech,
      tech === AI_ENGINEERING_TECH
        ? aiPhasedSlice(bank, perTechBudget)
        : stratifiedSlice(bank, perTechBudget),
    );
  }

  // ── Prompt Arena practice queue (easy → hard by scenario difficulty) ──
  const scenarioQueue: QueueEntry[] = scenarios
    .map((s) => ({
      itemType: "scenario" as const,
      refSlug: s.slug,
      title: s.title,
      technology: AI_ENGINEERING_TECH,
      difficulty: scenarioDifficulty(s.difficulty),
      estMinutes: Math.min(30, Math.max(10, s.estimatedMinutes)),
    }))
    .sort((a, b) => (DIFF_RANK[a.difficulty] ?? 1) - (DIFF_RANK[b.difficulty] ?? 1));

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

    // Practice day: lead with one Prompt Arena scenario (AI-Ready journeys).
    // If it doesn't fit the budget it rolls to the next practice day rather
    // than being dropped.
    if (day % SCENARIO_CADENCE === 0 && scenarioQueue.length > 0) {
      const next = scenarioQueue[0];
      if (next.estMinutes <= budget) {
        scenarioQueue.shift();
        items.push({ day, position: position++, ...next });
        budget -= next.estMinutes;
      }
    }

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
    const scenariosLeft = scenarioQueue.length > 0;
    if (!questionsLeft && !challengesLeft && !scenariosLeft) {
      return { totalDays: day, items };
    }
  }

  return { totalDays, items };
}
