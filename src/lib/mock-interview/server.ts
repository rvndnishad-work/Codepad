/**
 * Developer mock interviews, server side: searching the public library for
 * questions, suggesting a set for a role, and creating the session for either
 * mode. AI mode creates a free practice run for the AI interviewer (spoken
 * question rounds plus coding rounds). Peer mode creates a live room where the
 * interviewer gets the picked questions as a private guide. Server-only.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicSummary } from "@/lib/library/summary";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";
import { classifyChallenge, DSA_LANGUAGES } from "@/lib/interview/stack";
import { createInterviewSession } from "@/lib/interview/create-server";
import { snapshotStarters } from "@/lib/ai-interview/screening-create";
import { serializeQuestionnaire, validateQuestionnaire, type QuestionItem } from "@/lib/ai-interview/questionnaire";
import { theoryMinutes, type TheoryRoundData, type TheorySettings } from "@/lib/ai-interview/theory";
import { DEFAULT_INTERVIEWER_LANGUAGE } from "@/lib/ai-interview/languages";
import type { RoundSpecInput } from "@/lib/ai-interview/rounds";
import {
  MAX_CODING,
  MAX_PICKS,
  MOCK_LEVELS,
  groupRounds,
  levelDifficulties,
  pickMinutes,
  sessionTitle,
  type AiSettings,
  type MockLevel,
  type MockMode,
  type MockPick,
  type MockRole,
  type PeerSeat,
  type PickKind,
} from "./roles";

export class MockError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const DESIGN_TECH = "system-design";
/** Bank topics whose questions are build tasks rather than talk-through questions. */
const CODING_TECHS = new Set(["machine-coding", "javascript-coding"]);
const DESIGN_ROUND = "System Design";
export const LIBRARY_PAGE_SIZE = 20;

export const techLabelOf = (slug: string | null) =>
  slug ? (TECHNOLOGIES.find((t) => t.slug === slug)?.label ?? slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())) : null;

/** Bank questions that are system design: the system design topic, or a design round of any topic. */
const designWhere: Prisma.PrepQuestionWhereInput = { OR: [{ technology: DESIGN_TECH }, { round: DESIGN_ROUND }] };
const talkWhere: Prisma.PrepQuestionWhereInput = {
  AND: [{ OR: [{ technology: null }, { technology: { not: DESIGN_TECH } }] }, { OR: [{ round: null }, { round: { not: DESIGN_ROUND } }] }],
};

export type LibraryRow = MockPick & { slug: string; summary: string | null };

export type LibraryFilters = {
  /** Topics with published questions, and coding categories, for the filter chips. */
  topics: { slug: string; label: string; count: number }[];
  categories: { id: string; label: string; count: number }[];
  designCount: number;
};

export async function loadLibraryFilters(): Promise<LibraryFilters> {
  const [byTech, byCategory, designCount] = await Promise.all([
    prisma.prepQuestion.groupBy({ by: ["technology"], where: { status: "published", technology: { not: null }, AND: [talkWhere] }, _count: true }),
    prisma.challenge.groupBy({ by: ["category"], where: { published: true, workspaceId: null }, _count: true }),
    prisma.prepQuestion.count({ where: { status: "published", ...designWhere } }),
  ]);
  const order = (slug: string) => {
    const i = TECHNOLOGIES.findIndex((t) => t.slug === slug);
    return i < 0 ? 999 : i;
  };
  return {
    topics: byTech
      .filter((t) => t.technology)
      .map((t) => ({ slug: t.technology as string, label: techLabelOf(t.technology) as string, count: t._count }))
      .sort((a, b) => order(a.slug) - order(b.slug)),
    categories: byCategory
      .map((c) => ({ id: c.category?.trim() || "Other", label: c.category?.trim() || "Other", count: c._count }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    designCount,
  };
}

export type LibraryQuery = {
  source: PickKind;
  topic?: string | null;
  difficulty?: string | null;
  q?: string | null;
  page?: number;
};

export async function searchLibrary(query: LibraryQuery): Promise<{ rows: LibraryRow[]; total: number; page: number }> {
  const page = Math.max(1, Math.min(200, Math.floor(query.page ?? 1)));
  const q = query.q?.trim().slice(0, 100) || null;
  const difficulty = query.difficulty && ["easy", "medium", "hard"].includes(query.difficulty) ? query.difficulty : null;

  if (query.source === "coding") {
    const cat = query.topic?.trim() || null;
    const where: Prisma.ChallengeWhereInput = {
      published: true,
      workspaceId: null,
      ...(cat ? (cat === "Other" ? { OR: [{ category: null }, { category: "" }] } : { category: cat }) : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(q ? { AND: [{ OR: [{ title: { contains: q, mode: "insensitive" } }, { tags: { contains: q, mode: "insensitive" } }] }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        orderBy: [{ featured: "desc" }, { difficulty: "asc" }, { title: "asc" }],
        skip: (page - 1) * LIBRARY_PAGE_SIZE,
        take: LIBRARY_PAGE_SIZE,
        select: { id: true, slug: true, title: true, description: true, difficulty: true, category: true, estimatedMinutes: true },
      }),
      prisma.challenge.count({ where }),
    ]);
    return {
      rows: rows.map((r) => ({
        kind: "coding",
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: publicSummary(r.description, 160),
        topic: r.category?.trim() || "Other",
        difficulty: r.difficulty,
        minutes: pickMinutes("coding", r.estimatedMinutes),
      })),
      total,
      page,
    };
  }

  const design = query.source === "design";
  const topic = query.topic?.trim() || null;
  const where: Prisma.PrepQuestionWhereInput = {
    status: "published",
    AND: [
      design ? designWhere : talkWhere,
      ...(topic ? [{ technology: topic }] : []),
      ...(difficulty ? [{ difficulty }] : []),
      ...(q ? [{ OR: [{ title: { contains: q, mode: "insensitive" as const } }, { tags: { contains: q, mode: "insensitive" as const } }] }] : []),
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.prepQuestion.findMany({
      where,
      orderBy: [{ sortOrder: { sort: "asc", nulls: "last" } }, { views: "desc" }, { title: "asc" }],
      skip: (page - 1) * LIBRARY_PAGE_SIZE,
      take: LIBRARY_PAGE_SIZE,
      select: { id: true, slug: true, title: true, description: true, difficulty: true, technology: true },
    }),
    prisma.prepQuestion.count({ where }),
  ]);
  const kind: PickKind = design ? "design" : "question";
  return {
    rows: rows.map((r) => ({
      kind,
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: publicSummary(r.description, 160),
      topic: design ? "System design" : techLabelOf(r.technology),
      difficulty: r.difficulty,
      minutes: pickMinutes(kind),
    })),
    total,
    page,
  };
}

/** `n` items from `rows`, favouring the top of the list but varied between calls. */
function sample<T>(rows: T[], n: number, rand: () => number): T[] {
  const pool = rows.slice(0, Math.max(n * 4, 12));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/**
 * A balanced starting set for a role and level: talk-through questions spread
 * over the role's main topics, then design, then coding. Every call shuffles
 * a little, so "Suggest another set" gives something new.
 */
export async function suggestPicks(role: MockRole, level: MockLevel, rand: () => number = Math.random): Promise<MockPick[]> {
  const diffs = levelDifficulties(level);
  const out: MockPick[] = [];
  const seen = new Set<string>();

  if (role.mix.question > 0) {
    // Build-it questions ("Build a star rating") belong in an editor, not a spoken round.
    const spoken = role.techs.filter((t) => !CODING_TECHS.has(t));
    const techs = spoken.slice(0, Math.max(1, Math.min(spoken.length, role.mix.question)));
    const per = Math.ceil(role.mix.question / techs.length);
    for (const tech of techs) {
      const rows = await prisma.prepQuestion.findMany({
        where: { status: "published", technology: tech, difficulty: { in: diffs }, AND: [talkWhere] },
        orderBy: [{ sortOrder: { sort: "asc", nulls: "last" } }, { views: "desc" }],
        take: 40,
        select: { id: true, title: true, difficulty: true, technology: true },
      });
      for (const r of sample(rows, per, rand)) {
        if (out.filter((p) => p.kind === "question").length >= role.mix.question || seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({ kind: "question", id: r.id, title: r.title, topic: techLabelOf(r.technology), difficulty: r.difficulty, minutes: pickMinutes("question") });
      }
    }
  }

  if (role.mix.design > 0) {
    const techFirst = role.techs.filter((t) => t !== DESIGN_TECH);
    const rows = await prisma.prepQuestion.findMany({
      where: { status: "published", difficulty: { in: diffs }, AND: [designWhere] },
      orderBy: [{ sortOrder: { sort: "asc", nulls: "last" } }, { views: "desc" }],
      take: 80,
      select: { id: true, title: true, difficulty: true, technology: true },
    });
    // Prefer the role's own topics (e.g. Node.js design rounds for backend), then general design.
    const ranked = [...rows.filter((r) => r.technology && techFirst.includes(r.technology)), ...rows.filter((r) => !r.technology || !techFirst.includes(r.technology))];
    for (const r of sample(ranked, role.mix.design, rand)) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ kind: "design", id: r.id, title: r.title, topic: "System design", difficulty: r.difficulty, minutes: pickMinutes("design") });
    }
  }

  if (role.mix.coding > 0 && role.coding.length) {
    const rows = await prisma.challenge.findMany({
      where: { published: true, workspaceId: null, category: { in: role.coding }, difficulty: { in: diffs.slice(0, 2) } },
      orderBy: [{ featured: "desc" }, { title: "asc" }],
      take: 60,
      select: { id: true, title: true, difficulty: true, category: true, estimatedMinutes: true },
    });
    for (const r of sample(rows, role.mix.coding, rand)) {
      out.push({ kind: "coding", id: r.id, title: r.title, topic: r.category?.trim() || "Other", difficulty: r.difficulty, minutes: pickMinutes("coding", r.estimatedMinutes) });
    }
  }
  return out;
}

/* ── Creating a session ──────────────────────────────────────────────────── */

export type CreateMockInput = {
  user: { id: string; name: string | null; email: string | null };
  mode: MockMode;
  role: MockRole;
  level: MockLevel;
  picks: { kind: PickKind; id: string }[];
  /** AI mode. */
  ai: AiSettings;
  /** DSA coding language for AI coding rounds, when the problem supports it. */
  language: string | null;
  /** Peer mode. */
  seat: PeerSeat;
  minutes: number;
  /** Peer mode: a note only the interviewer sees. */
  brief: string | null;
};

export type CreateMockResult = { mode: "ai"; inviteToken: string } | { mode: "peer"; id: string; shareToken: string; shortCode: string | null };

type Resolved = { kind: PickKind; id: string; item?: QuestionItem; challenge?: ChallengeRow };
type ChallengeRow = {
  id: string;
  title: string;
  estimatedMinutes: number;
  category: string | null;
  tags: string | null;
  steps: { judgingMode: string; languagesJson: string | null }[];
};

function strings(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Looks every pick up in the public library, keeping the running order. Unknown or private ids are refused. */
async function resolvePicks(picks: CreateMockInput["picks"]): Promise<Resolved[]> {
  if (!picks.length) throw new MockError("Pick at least one question to practise.");
  if (picks.length > MAX_PICKS) throw new MockError(`Keep it to ${MAX_PICKS} questions or fewer.`);
  if (picks.filter((p) => p.kind === "coding").length > MAX_CODING) throw new MockError(`Keep it to ${MAX_CODING} coding problems or fewer.`);
  const qIds = [...new Set(picks.filter((p) => p.kind !== "coding").map((p) => p.id))];
  const cIds = [...new Set(picks.filter((p) => p.kind === "coding").map((p) => p.id))];
  const [qs, cs] = await Promise.all([
    qIds.length
      ? prisma.prepQuestion.findMany({
          where: { id: { in: qIds }, status: "published" },
          select: { id: true, slug: true, title: true, answer: true, technology: true, difficulty: true },
        })
      : Promise.resolve([]),
    cIds.length
      ? prisma.challenge.findMany({
          where: { id: { in: cIds }, published: true, workspaceId: null },
          select: {
            id: true,
            title: true,
            estimatedMinutes: true,
            category: true,
            tags: true,
            steps: { select: { judgingMode: true, languagesJson: true }, orderBy: { position: "asc" }, take: 1 },
          },
        })
      : Promise.resolve([]),
  ]);
  const qById = new Map(qs.map((q) => [q.id, q]));
  const cById = new Map(cs.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: Resolved[] = [];
  for (const p of picks) {
    const key = `${p.kind === "coding" ? "c" : "q"}:${p.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (p.kind === "coding") {
      const c = cById.get(p.id);
      if (!c) throw new MockError("One of the coding problems is no longer available. Remove it and try again.");
      out.push({ kind: "coding", id: p.id, challenge: c });
    } else {
      const r = qById.get(p.id);
      if (!r) throw new MockError("One of the questions is no longer available. Remove it and try again.");
      const item: QuestionItem = { q: r.title.trim(), src: r.slug, difficulty: r.difficulty };
      if (r.answer?.trim()) item.a = r.answer.trim();
      if (r.technology) item.tech = r.technology;
      out.push({ kind: p.kind, id: p.id, item });
    }
  }
  return out;
}

const PRACTICE_WORKSPACE_SLUG = "__ai-practice__";

export async function practiceWorkspaceId(): Promise<string> {
  // Upsert keeps it a singleton and is race-safe on the unique slug.
  const ws = await prisma.workspace.upsert({
    where: { slug: PRACTICE_WORKSPACE_SLUG },
    update: {},
    create: { name: "AI Practice", slug: PRACTICE_WORKSPACE_SLUG },
    select: { id: true },
  });
  return ws.id;
}

/** AI coding round shape for a public challenge: its surface and the language to run. */
export function codingSpec(c: ChallengeRow, preferred: string | null): RoundSpecInput {
  const step = c.steps[0];
  const meta = classifyChallenge({ judgingMode: step?.judgingMode, languages: strings(step?.languagesJson), tags: strings(c.tags), category: c.category });
  const langs = meta.languages;
  const language =
    meta.paradigm === "frontend"
      ? undefined
      : preferred && langs.includes(preferred)
        ? preferred
        : langs[0] ?? (meta.paradigm === "dsa" ? (preferred && (DSA_LANGUAGES as readonly string[]).includes(preferred) ? preferred : "javascript") : "node");
  return {
    paradigm: meta.paradigm,
    language,
    sourceKind: "challenge",
    sourceId: c.id,
    estimatedMinutes: pickMinutes("coding", c.estimatedMinutes),
  };
}

async function createAiPractice(input: CreateMockInput, picks: Resolved[]): Promise<CreateMockResult> {
  const workspaceId = await practiceWorkspaceId();
  const title = sessionTitle("ai", input.role, input.level);
  const settings: TheorySettings = {
    count: null,
    secondsPerQuestion: input.ai.secondsPerQuestion,
    followUps: input.ai.followUps,
    answerMode: input.ai.answerMode,
    recordAudio: false,
    language: DEFAULT_INTERVIEWER_LANGUAGE,
  };

  const groups = groupRounds(picks);
  type Planned = { spec: RoundSpecInput; theory?: TheoryRoundData };
  const planned: Planned[] = [];
  let talkNo = 0;
  for (const g of groups) {
    if (g.kind === "coding") {
      planned.push({ spec: codingSpec(g.pick.challenge!, input.language) });
      continue;
    }
    talkNo++;
    const items = validateQuestionnaire(g.picks.map((p) => p.item!));
    const design = g.picks.every((p) => p.kind === "design");
    // Each spoken round reads its questions from a questionnaire, kept in the
    // practice workspace so this run never touches anyone's library.
    const tpl = await prisma.aIInterviewTemplate.create({
      data: {
        workspaceId,
        title: design ? "System design" : talkNo > 1 ? `Questions, part ${talkNo}` : "Interview questions",
        description: `${input.role.label} practice questions picked by the developer.`,
        starterFiles: "{}",
        testsCode: serializeQuestionnaire(items),
        estimatedMinutes: theoryMinutes(settings, items.length),
        kind: "conversation",
        frameworkLabel: input.role.label,
      },
      select: { id: true },
    });
    planned.push({
      spec: { paradigm: "theory", sourceKind: "scaffold", templateId: tpl.id, estimatedMinutes: theoryMinutes(settings, items.length), theory: settings },
      theory: { v: 1, settings, items },
    });
  }

  const starters = await snapshotStarters(
    planned.map((p) => p.spec),
    workspaceId,
  );
  const starterOf = (r: RoundSpecInput) => starters.get(`${r.sourceKind}:${r.sourceId ?? ""}:${r.templateId ?? ""}`) ?? null;
  const first = planned[0].spec;
  const firstStarter = starterOf(first);

  const created = await prisma.aIInterviewSession.create({
    data: {
      workspaceId,
      practice: true,
      candidateName: input.user.name?.trim() || "Developer",
      candidateEmail: (input.user.email ?? "").toLowerCase(),
      positionTitle: `Practice — ${title}`,
      status: "PENDING",
      chatHistory: "[]",
      filesJson: "{}",
      templateId: first.templateId ?? first.sourceId ?? "practice",
      ...(firstStarter ? { starterFilesJson: JSON.stringify(firstStarter) } : {}),
      rounds: {
        create: planned.map((p, order) => {
          const sf = starterOf(p.spec);
          return {
            order,
            paradigm: p.spec.paradigm,
            language: p.spec.language,
            frameworkLabel: p.spec.frameworkLabel,
            sourceKind: p.spec.sourceKind,
            sourceId: p.spec.sourceId,
            templateId: p.spec.templateId,
            estimatedMinutes: p.spec.estimatedMinutes ?? 30,
            filesJson: "{}",
            ...(sf ? { starterFilesJson: JSON.stringify(sf) } : {}),
            ...(p.theory ? { theoryJson: JSON.stringify(p.theory) } : {}),
            status: "PENDING",
          };
        }),
      },
    },
    select: { inviteToken: true },
  });
  return { mode: "ai", inviteToken: created.inviteToken };
}

async function createPeerRoom(input: CreateMockInput, picks: Resolved[]): Promise<CreateMockResult> {
  const coding = picks.filter((p) => p.kind === "coding").map((p) => p.id);
  const items = picks.filter((p) => p.kind !== "coding").map((p) => p.item!);
  const guide = items.length ? serializeQuestionnaire(validateQuestionnaire(items)) : null;
  const format = coding.length && items.length ? "mixed" : coding.length ? "coding" : "discussion";
  const level = MOCK_LEVELS.find((l) => l.id === input.level)?.label ?? "";
  const brief =
    input.brief?.trim().slice(0, 1000) ||
    `Mock interview for a ${level.toLowerCase()} ${input.role.label.toLowerCase()}. ${items.length ? "Ask the questions below, open a reference answer if you need it, and tick each one off." : ""}${coding.length ? " The coding problems are in the running order on the left." : ""}`.trim();

  const res = await createInterviewSession({
    ownerId: input.user.id,
    actor: { id: input.user.id, email: input.user.email },
    title: sessionTitle("peer", input.role, input.level),
    type: "live",
    creatorRole: input.seat,
    challengeIds: coding,
    playgroundIds: [],
    promptScenarioIds: [],
    allowEmpty: true,
    totalSec: Math.min(4 * 3600, Math.max(15 * 60, Math.round(input.minutes) * 60)),
    candidateName: input.seat === "candidate" ? input.user.name : null,
    wizard: {
      format,
      panelIds: [],
      questionPlan: "set",
      questionsOwnerId: null,
      questionsNote: null,
      guideTemplateId: null,
      interviewerBrief: brief,
      setupGroupId: null,
      guideJson: guide,
    },
  });
  if (!res.ok) throw new MockError(res.error, res.status);
  return { mode: "peer", id: res.id, shareToken: res.shareToken, shortCode: res.shortCode };
}

export async function createMockInterview(input: CreateMockInput): Promise<CreateMockResult> {
  const picks = await resolvePicks(input.picks);
  return input.mode === "ai" ? createAiPractice(input, picks) : createPeerRoom(input, picks);
}

/* ── History ─────────────────────────────────────────────────────────────── */

export type AiPracticeRow = {
  token: string;
  title: string;
  status: string;
  score: number | null;
  createdAt: Date;
  rounds: number;
};

/** The developer's own AI practice runs, newest first. Practice runs are keyed by the email they were started with. */
export async function loadAiPracticeRuns(email: string | null | undefined, take = 30): Promise<AiPracticeRow[]> {
  if (!email) return [];
  const rows = await prisma.aIInterviewSession.findMany({
    where: { practice: true, candidateEmail: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take,
    select: { inviteToken: true, positionTitle: true, status: true, score: true, createdAt: true, _count: { select: { rounds: true } } },
  });
  return rows.map((r) => ({
    token: r.inviteToken,
    title: r.positionTitle.replace(/^Practice\s+—\s+/, ""),
    status: r.status,
    score: r.score,
    createdAt: r.createdAt,
    rounds: Math.max(1, r._count.rounds),
  }));
}
