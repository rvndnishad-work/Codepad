/**
 * Structured interview scorecards: one per interviewer per live interview.
 *
 * Each interviewer rates the interview's criteria from 1 to 4 with a note,
 * writes the evidence and picks a recommendation. Drafts are private. Once
 * submitted a card is locked; its author can amend it only with a reason,
 * and the change is kept. Cards stay hidden from the other interviewers
 * until they submit their own, so nobody anchors on a colleague's score.
 *
 * The interview pass mark only labels the panel average ("At or above the
 * pass mark"). It never moves a candidate: a recruiter decides.
 *
 * Client-safe: pure functions only. The Prisma side is scorecard-server.ts.
 */

export const SCORE_MIN = 1;
export const SCORE_MAX = 4;

/** What each point on the 1 to 4 scale means, shown next to the buttons. */
export const SCORE_LABELS: Record<number, string> = {
  1: "Not yet",
  2: "Some gaps",
  3: "Solid",
  4: "Strong",
};

export const DEFAULT_PASS_MARK = 3;
export const PASS_MARK_MIN = 1.5;
export const PASS_MARK_MAX = 4;
export const PASS_MARK_STEP = 0.25;

export const PASS_MARK_PRESETS = [
  { value: 2.5, label: "Lenient" },
  { value: DEFAULT_PASS_MARK, label: "Standard" },
  { value: 3.5, label: "Strict" },
] as const;

export type Recommendation = "no" | "unsure" | "yes";

export const RECOMMENDATIONS: { id: Recommendation; label: string; tone: "danger" | "warning" | "success" }[] = [
  { id: "no", label: "Not passed", tone: "danger" },
  { id: "unsure", label: "Unsure", tone: "warning" },
  { id: "yes", label: "Pass", tone: "success" },
];

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = { no: "Not passed", unsure: "Unsure", yes: "Pass" };

export function isRecommendation(v: unknown): v is Recommendation {
  return v === "no" || v === "unsure" || v === "yes";
}

export type CriterionKind = "competency" | "question";

export type Criterion = { id: string; label: string; hint: string | null; kind: CriterionKind };

export type Rating = { r: number | null; n: string };

export type Ratings = Record<string, Rating>;

export type ScorecardStatus = "draft" | "submitted";

export const MAX_NOTE = 1000;
export const MAX_EVIDENCE = 5000;
export const MAX_REASON = 500;
export const MIN_REASON = 5;
/** Question criteria beyond this are left off; the competencies carry the rest. */
export const MAX_QUESTION_CRITERIA = 8;

/** Competencies every scorecard starts with, by interview format. */
const COMPETENCIES: Record<string, { id: string; label: string; hint: string }[]> = {
  coding: [
    { id: "problem_solving", label: "Problem solving", hint: "Breaks the problem down and checks edge cases" },
    { id: "code_quality", label: "Code quality", hint: "Correct, readable code that someone else could maintain" },
    { id: "communication", label: "Communication", hint: "Explains trade-offs and asks good questions" },
  ],
  discussion: [
    { id: "technical_depth", label: "Technical depth", hint: "Knows how things work, not only what they are called" },
    { id: "trade_offs", label: "Trade-offs", hint: "Weighs options and says why one fits" },
    { id: "communication", label: "Communication", hint: "Clear, structured answers" },
  ],
  behavioural: [
    { id: "ownership", label: "Ownership", hint: "Takes responsibility and follows through" },
    { id: "collaboration", label: "Collaboration", hint: "Works well with others and handles disagreement" },
    { id: "communication", label: "Communication", hint: "Concrete examples, told clearly" },
  ],
  intro: [
    { id: "motivation", label: "Motivation", hint: "Why this role, and why now" },
    { id: "experience", label: "Relevant experience", hint: "Past work that matches what the role needs" },
    { id: "communication", label: "Communication", hint: "Clear and easy to follow" },
  ],
  mixed: [
    { id: "problem_solving", label: "Problem solving", hint: "Breaks the problem down and checks edge cases" },
    { id: "technical_depth", label: "Technical depth", hint: "Knows how things work, not only what they are called" },
    { id: "communication", label: "Communication", hint: "Explains trade-offs and asks good questions" },
  ],
};

/** Short, stable id for a free-text question, so a reordered guide keeps its ratings. */
export function questionId(text: string): string {
  let h = 5381;
  const t = text.trim().toLowerCase();
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return `q:${(h >>> 0).toString(36)}`;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * The criteria for an interview: the competencies for its format, then one
 * per question asked (coding rounds first, then the guide questions), up to
 * MAX_QUESTION_CRITERIA. Duplicate questions appear once.
 */
export function deriveCriteria(a: { format: string | null | undefined; rounds: { key: string; title: string }[]; questions: string[] }): Criterion[] {
  const base = COMPETENCIES[a.format ?? ""] ?? COMPETENCIES.mixed;
  const out: Criterion[] = base.map((c) => ({ id: c.id, label: c.label, hint: c.hint, kind: "competency" }));
  const seen = new Set(out.map((c) => c.id));
  const qs: Criterion[] = [];
  for (const r of a.rounds) {
    const id = `r:${r.key}`;
    if (!r.title.trim() || seen.has(id)) continue;
    seen.add(id);
    qs.push({ id, label: clip(r.title, 120), hint: "Round", kind: "question" });
  }
  for (const q of a.questions) {
    if (!q.trim()) continue;
    const id = questionId(q);
    if (seen.has(id)) continue;
    seen.add(id);
    qs.push({ id, label: clip(q, 160), hint: "Question", kind: "question" });
  }
  return [...out, ...qs.slice(0, MAX_QUESTION_CRITERIA)];
}

/** Reads stored criteria JSON; anything malformed is dropped. */
export function parseCriteria(raw: string | null | undefined): Criterion[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((c) => c && typeof c.id === "string" && typeof c.label === "string")
      .map((c) => ({ id: c.id, label: c.label, hint: typeof c.hint === "string" ? c.hint : null, kind: c.kind === "question" ? "question" : "competency" }));
  } catch {
    return [];
  }
}

export function isScore(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= SCORE_MIN && v <= SCORE_MAX;
}

/** Keeps only ratings for known criteria, with valid scores and trimmed notes. */
export function cleanRatings(input: unknown, criteria: Criterion[]): Ratings {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out: Ratings = {};
  for (const c of criteria) {
    const v = src[c.id] as { r?: unknown; n?: unknown } | undefined;
    if (!v || typeof v !== "object") continue;
    const r = isScore(v.r) ? v.r : null;
    const n = typeof v.n === "string" ? v.n.trim().slice(0, MAX_NOTE) : "";
    if (r != null || n) out[c.id] = { r, n };
  }
  return out;
}

export function parseRatings(raw: string | null | undefined, criteria: Criterion[]): Ratings {
  try {
    return cleanRatings(JSON.parse(raw ?? "{}"), criteria);
  } catch {
    return {};
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Mean of the rated criteria, to one decimal. Null when nothing is rated. */
export function scorecardAverage(ratings: Ratings): number | null {
  const vals = Object.values(ratings)
    .map((x) => x.r)
    .filter(isScore);
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

/** Why a card cannot be submitted yet, or an empty list when it can. */
export function submitIssues(card: { criteria: Criterion[]; ratings: Ratings; recommendation: string | null | undefined }): string[] {
  const issues: string[] = [];
  const unrated = card.criteria.filter((c) => c.kind === "competency" && !isScore(card.ratings[c.id]?.r));
  if (unrated.length) issues.push(`Rate ${unrated.map((c) => c.label).join(", ")}.`);
  if (!isRecommendation(card.recommendation)) issues.push("Pick a recommendation.");
  return issues;
}

// ── Lock rules ──────────────────────────────────────────────────────────────

export type WriteIntent = "draft" | "submit" | "amend";

export type WriteCheck = { ok: true; audit: boolean; status: ScorecardStatus } | { ok: false; error: string };

/**
 * Whether `reviewerKey` may write this card with this intent. Only the author
 * writes their own card. A draft can be saved and submitted; a submitted card
 * is locked and can only be amended, with a reason, and that amendment is
 * audited. Nobody, admins included, can write someone else's card.
 */
export function checkWrite(
  existing: { reviewerKey: string; status: string } | null,
  reviewerKey: string,
  intent: WriteIntent,
  reason?: string | null,
): WriteCheck {
  if (existing && existing.reviewerKey !== reviewerKey) return { ok: false, error: "You can only change your own scorecard." };
  const submitted = existing?.status === "submitted";
  if (intent === "draft") {
    return submitted ? { ok: false, error: "This scorecard is submitted and locked. Amend it with a reason instead." } : { ok: true, audit: false, status: "draft" };
  }
  if (intent === "submit") {
    return submitted ? { ok: false, error: "This scorecard is already submitted." } : { ok: true, audit: false, status: "submitted" };
  }
  if (!submitted) return { ok: false, error: "Only a submitted scorecard can be amended. Save or submit it instead." };
  const why = (reason ?? "").trim();
  if (why.length < MIN_REASON) return { ok: false, error: "Say briefly why you are changing a submitted scorecard." };
  if (why.length > MAX_REASON) return { ok: false, error: `Keep the reason under ${MAX_REASON} characters.` };
  return { ok: true, audit: true, status: "submitted" };
}

/**
 * Blind scoring: an interviewer on this interview sees only their own card
 * until they submit it. Everyone else allowed on the report (recruiters, the
 * people deciding) sees every submitted card. Drafts are never shown to
 * anyone but their author.
 */
export function canSeeOthers(viewer: { isReviewer: boolean; hasSubmitted: boolean }): boolean {
  return !viewer.isReviewer || viewer.hasSubmitted;
}

// ── Pass mark and panel summary ─────────────────────────────────────────────

/** A usable pass mark: clamped to the scale and snapped to quarter points. */
export function passMarkOf(v: number | null | undefined): number {
  if (v == null || !Number.isFinite(v)) return DEFAULT_PASS_MARK;
  const clamped = Math.min(PASS_MARK_MAX, Math.max(PASS_MARK_MIN, v));
  return Math.round(clamped / PASS_MARK_STEP) * PASS_MARK_STEP;
}

/** What to store: null for the default, so a later change to it still applies. */
export function storedPassMark(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const m = passMarkOf(v);
  return m === DEFAULT_PASS_MARK ? null : m;
}

export function fmtScore(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(Math.round(n * 100) / 100);
}

export type Reviewer = { key: string; name: string; kind: "member" | "guest"; email: string | null };

export type SummaryCard = { reviewerKey: string; status: string; ratings: Ratings; recommendation: string | null };

export type PanelSummary = {
  expected: number;
  submitted: number;
  /** Expected interviewers with no submitted card, with how far they got. */
  missing: { key: string; name: string; state: "not_started" | "draft" }[];
  /** Mean of each submitted card's own average, so every interviewer counts once. */
  average: number | null;
  passMark: number;
  /** Label only. Null until at least one card is in. */
  band: "at_or_above" | "below" | null;
  recommendations: Record<Recommendation, number>;
  /** Mean rating per criterion across submitted cards. */
  byCriterion: Record<string, { average: number; count: number }>;
  /** Every expected card is in. */
  complete: boolean;
};

/**
 * Summarises the submitted cards against the pass mark. Drafts never count.
 * Cards from people who are no longer on the panel still count (they did
 * interview); they just are not "expected".
 */
export function summarisePanel(reviewers: Reviewer[], cards: SummaryCard[], passMarkRaw: number | null | undefined): PanelSummary {
  const passMark = passMarkOf(passMarkRaw);
  const submitted = cards.filter((c) => c.status === "submitted");
  const byKey = new Map(cards.map((c) => [c.reviewerKey, c]));
  const missing = reviewers
    .filter((r) => byKey.get(r.key)?.status !== "submitted")
    .map((r) => ({ key: r.key, name: r.name, state: byKey.has(r.key) ? ("draft" as const) : ("not_started" as const) }));

  const averages = submitted.map((c) => scorecardAverage(c.ratings)).filter((x): x is number => x != null);
  const average = averages.length ? round1(averages.reduce((a, b) => a + b, 0) / averages.length) : null;

  const recommendations: Record<Recommendation, number> = { no: 0, unsure: 0, yes: 0 };
  for (const c of submitted) if (isRecommendation(c.recommendation)) recommendations[c.recommendation]++;

  const sums: Record<string, { total: number; count: number }> = {};
  for (const c of submitted) {
    for (const [id, x] of Object.entries(c.ratings)) {
      if (!isScore(x.r)) continue;
      const s = (sums[id] ??= { total: 0, count: 0 });
      s.total += x.r;
      s.count++;
    }
  }
  const byCriterion = Object.fromEntries(Object.entries(sums).map(([id, s]) => [id, { average: round1(s.total / s.count), count: s.count }]));

  const expectedKeys = new Set(reviewers.map((r) => r.key));
  const submittedExpected = submitted.filter((c) => expectedKeys.has(c.reviewerKey)).length;

  return {
    expected: reviewers.length,
    submitted: submitted.length,
    missing,
    average,
    passMark,
    band: average == null ? null : average >= passMark ? "at_or_above" : "below",
    recommendations,
    byCriterion,
    complete: reviewers.length > 0 && submittedExpected === reviewers.length,
  };
}

/** Plain-language line for the panel average against the pass mark. */
export function bandLabel(s: Pick<PanelSummary, "band" | "passMark">): string {
  if (s.band === "at_or_above") return `At or above the pass mark of ${fmtScore(s.passMark)}`;
  if (s.band === "below") return `Below the pass mark of ${fmtScore(s.passMark)}`;
  return "Waiting for scorecards";
}

/** Nudge emails are allowed at most once per this many minutes per interview. */
export const NUDGE_COOLDOWN_MIN = 60;

export function nudgeWaitMinutes(lastNudgedAt: Date | string | null | undefined, now = new Date()): number {
  if (!lastNudgedAt) return 0;
  const last = typeof lastNudgedAt === "string" ? new Date(lastNudgedAt) : lastNudgedAt;
  const passed = (now.getTime() - last.getTime()) / 60000;
  return passed >= NUDGE_COOLDOWN_MIN ? 0 : Math.ceil(NUDGE_COOLDOWN_MIN - passed);
}
