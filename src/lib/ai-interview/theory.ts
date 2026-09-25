/**
 * Theory rounds: the AI interviewer reads a questionnaire's questions aloud,
 * one at a time, and the candidate answers each by voice or typing. Pure, so
 * the recruiter UI, the candidate screen, the API route and grading share it.
 *
 * Storage (no new tables):
 * - `AIScreeningRoundSpec.theoryJson`: the recruiter's settings.
 * - `AIInterviewRound.theoryJson`: settings plus the questions drawn for this
 *   candidate at invite, reference answers included. Server-only.
 * - `AIInterviewRound.answersJson`: what the candidate said, and the grades.
 */
import type { QuestionItem } from "./questionnaire";

export type TheoryAnswerMode = "voice" | "voice-only" | "typing";

export type TheorySettings = {
  /** How many questions to ask. Null asks all of them, in order. */
  count: number | null;
  secondsPerQuestion: number;
  /** Most follow-ups the interviewer may ask on one question. */
  followUps: 0 | 1 | 2;
  answerMode: TheoryAnswerMode;
};

export const DEFAULT_THEORY: TheorySettings = { count: null, secondsPerQuestion: 180, followUps: 1, answerMode: "voice" };
export const SECONDS_CHOICES = [60, 120, 180, 300] as const;
export const ANSWER_MODE_LABELS: Record<TheoryAnswerMode, string> = {
  voice: "Voice, typing allowed",
  "voice-only": "Voice only",
  typing: "Typing only",
};
/** A follow-up gets half the question's time, at least a minute. */
export const followUpSeconds = (s: TheorySettings) => Math.max(60, Math.round(s.secondsPerQuestion / 2));

export function sanitizeTheory(raw: unknown): TheorySettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const count = Number(o.count);
  const secs = Number(o.secondsPerQuestion);
  const fu = Number(o.followUps);
  const mode = o.answerMode;
  return {
    count: Number.isFinite(count) && count >= 1 ? Math.min(40, Math.floor(count)) : null,
    secondsPerQuestion: (SECONDS_CHOICES as readonly number[]).includes(secs) ? secs : DEFAULT_THEORY.secondsPerQuestion,
    followUps: fu === 0 || fu === 2 ? fu : fu === 1 ? 1 : DEFAULT_THEORY.followUps,
    answerMode: mode === "voice-only" || mode === "typing" ? mode : "voice",
  };
}

export function parseTheorySettings(json: string | null | undefined): TheorySettings {
  if (!json) return { ...DEFAULT_THEORY };
  try {
    const p = JSON.parse(json) as { settings?: unknown };
    return sanitizeTheory(p && typeof p === "object" && "settings" in p ? p.settings : p);
  } catch {
    return { ...DEFAULT_THEORY };
  }
}

/** Questions actually asked from a questionnaire of `total` questions. */
export const askedCount = (s: TheorySettings, total: number) => (s.count == null ? total : Math.min(s.count, total));

/** Round length: each question's time, plus half of it again per allowed follow-up. */
export function theoryMinutes(s: TheorySettings, total: number): number {
  const n = askedCount(s, total);
  const secs = n * (s.secondsPerQuestion + s.followUps * followUpSeconds(s) * 0.5);
  return Math.min(180, Math.max(5, Math.ceil(secs / 60)));
}

/**
 * The questions one candidate gets. All of them keeps the recruiter's order;
 * a smaller count is a random draw, so candidates in a batch get different sets.
 */
export function drawQuestions(items: QuestionItem[], s: TheorySettings, rand: () => number = Math.random): QuestionItem[] {
  const n = askedCount(s, items.length);
  if (n >= items.length) return items.slice();
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx
    .slice(0, n)
    .sort((a, b) => a - b)
    .map((i) => items[i]);
}

/* ── Per-round state ─────────────────────────────────────────────────────── */

export type TheoryRoundData = { v: 1; settings: TheorySettings; items: QuestionItem[] };

export function parseTheoryRound(json: string | null | undefined): TheoryRoundData | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as Partial<TheoryRoundData>;
    if (!p || !Array.isArray(p.items)) return null;
    const items = p.items.filter((i): i is QuestionItem => !!i && typeof i.q === "string" && !!i.q.trim());
    return { v: 1, settings: sanitizeTheory(p.settings), items };
  } catch {
    return null;
  }
}

export type TheoryVerdict = "strong" | "partial" | "missed" | "skipped" | "unscored";

export type TheoryGrade = {
  /** 0 to 5. */
  score: number;
  verdict: TheoryVerdict;
  covered: string;
  missed: string;
  reason: string;
};

export type TheoryFollowUp = { q: string; a: string; mode: "voice" | "typed" };

export type TheoryAnswer = {
  q: string;
  a: string;
  mode: "voice" | "typed";
  skipped: boolean;
  /** Seconds the candidate spent on the question, follow-ups included. */
  seconds: number;
  /** Seconds before the first word, when known. */
  firstWordSec: number | null;
  /** Times the window lost focus while the question was on screen. */
  blurs: number;
  followUps: TheoryFollowUp[];
  grade?: TheoryGrade;
};

export type TheoryAnswers = {
  v: 1;
  items: TheoryAnswer[];
  /** A follow-up waiting for its answer, on the last item. */
  pendingFollowUp: string | null;
};

export function emptyAnswers(): TheoryAnswers {
  return { v: 1, items: [], pendingFollowUp: null };
}

export function parseAnswers(json: string | null | undefined): TheoryAnswers {
  if (!json) return emptyAnswers();
  try {
    const p = JSON.parse(json) as Partial<TheoryAnswers>;
    if (!p || !Array.isArray(p.items)) return emptyAnswers();
    return { v: 1, items: p.items as TheoryAnswer[], pendingFollowUp: typeof p.pendingFollowUp === "string" && p.pendingFollowUp ? p.pendingFollowUp : null };
  } catch {
    return emptyAnswers();
  }
}

export const MAX_ANSWER_CHARS = 6000;

/** What the candidate submitted for the question or follow-up on screen. */
export type AnswerInput = {
  text: string;
  mode: "voice" | "typed";
  skipped: boolean;
  seconds: number;
  firstWordSec: number | null;
  blurs: number;
};

export function cleanAnswerInput(raw: unknown): AnswerInput {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.round(n)) : 0;
  };
  const text = typeof o.text === "string" ? o.text.replace(/\s+/g, " ").trim().slice(0, MAX_ANSWER_CHARS) : "";
  const skipped = o.skipped === true;
  const fw = Number(o.firstWordSec);
  return {
    text: skipped ? "" : text,
    mode: o.mode === "typed" ? "typed" : "voice",
    skipped: skipped || !text,
    seconds: num(o.seconds, 3600),
    firstWordSec: Number.isFinite(fw) && fw >= 0 ? Math.min(3600, Math.round(fw)) : null,
    blurs: num(o.blurs, 500),
  };
}

/**
 * Record one answer. While a follow-up is pending the answer belongs to it;
 * otherwise it answers the next question. Returns the new state.
 */
export function recordAnswer(state: TheoryAnswers, round: TheoryRoundData, input: AnswerInput): TheoryAnswers {
  const items = state.items.slice();
  if (state.pendingFollowUp && items.length) {
    const last = { ...items[items.length - 1] };
    last.followUps = [...last.followUps, { q: state.pendingFollowUp, a: input.text, mode: input.mode }];
    last.seconds += input.seconds;
    last.blurs += input.blurs;
    items[items.length - 1] = last;
    return { v: 1, items, pendingFollowUp: null };
  }
  const q = round.items[items.length];
  if (!q) return state;
  items.push({
    q: q.q,
    a: input.text,
    mode: input.mode,
    skipped: input.skipped,
    seconds: input.seconds,
    firstWordSec: input.firstWordSec,
    blurs: input.blurs,
    followUps: [],
  });
  return { v: 1, items, pendingFollowUp: null };
}

/** Whether the interviewer may still ask a follow-up on the latest answer. */
export function canFollowUp(state: TheoryAnswers, s: TheorySettings): boolean {
  const last = state.items[state.items.length - 1];
  if (!last || last.skipped || state.pendingFollowUp) return false;
  const lastFollow = last.followUps[last.followUps.length - 1];
  // A follow-up the candidate skipped ends the question.
  if (lastFollow && !lastFollow.a.trim()) return false;
  return last.followUps.length < s.followUps;
}

/** What the candidate screen shows next. Never carries a reference answer. */
export type TheoryView = {
  total: number;
  /** 0-based position of the question on screen. */
  position: number;
  question: { text: string; tech: string | null; difficulty: string | null } | null;
  followUp: string | null;
  done: boolean;
  statuses: ("answered" | "skipped")[];
  secondsPerQuestion: number;
  followUpSeconds: number;
  answerMode: TheoryAnswerMode;
};

export function theoryView(round: TheoryRoundData, state: TheoryAnswers): TheoryView {
  const total = round.items.length;
  const statuses = state.items.map((i) => (i.skipped ? "skipped" : "answered") as "answered" | "skipped");
  const base = {
    total,
    statuses,
    secondsPerQuestion: round.settings.secondsPerQuestion,
    followUpSeconds: followUpSeconds(round.settings),
    answerMode: round.settings.answerMode,
  };
  if (state.pendingFollowUp) {
    const pos = state.items.length - 1;
    const q = round.items[pos];
    return { ...base, position: pos, question: { text: q.q, tech: q.tech ?? null, difficulty: q.difficulty ?? null }, followUp: state.pendingFollowUp, done: false };
  }
  const pos = state.items.length;
  const q = round.items[pos];
  if (!q) return { ...base, position: total, question: null, followUp: null, done: true };
  return { ...base, position: pos, question: { text: q.q, tech: q.tech ?? null, difficulty: q.difficulty ?? null }, followUp: null, done: false };
}

/* ── Grading ─────────────────────────────────────────────────────────────── */

const VERDICTS: TheoryVerdict[] = ["strong", "partial", "missed", "skipped", "unscored"];

/** Clamp a model's per-question grade into shape. Skipped answers always score 0. */
export function cleanGrade(raw: unknown, answer: TheoryAnswer): TheoryGrade {
  if (answer.skipped) return { score: 0, verdict: "skipped", covered: "", missed: "", reason: "Skipped without an answer." };
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = Number(o.score);
  const score = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0;
  const v = typeof o.verdict === "string" ? (o.verdict.toLowerCase() as TheoryVerdict) : null;
  const verdict: TheoryVerdict = v && VERDICTS.includes(v) && v !== "skipped" && v !== "unscored" ? v : score >= 4 ? "strong" : score >= 2 ? "partial" : "missed";
  const str = (x: unknown) => (typeof x === "string" ? x.trim().slice(0, 600) : "");
  return { score, verdict, covered: str(o.covered), missed: str(o.missed), reason: str(o.reason) };
}

/** Round score 0..100: the mean question score, skipped questions counting 0. */
export function theoryRoundScore(answers: TheoryAnswer[], total: number): number {
  const n = Math.max(total, answers.length, 1);
  const sum = answers.reduce((s, a) => s + (a.grade?.score ?? 0), 0);
  return Math.round((sum / (n * 5)) * 100);
}

/** Question list for the grader: each asked question, its reference answer, and what was said. */
export function theoryGraderBlock(round: TheoryRoundData, answers: TheoryAnswer[]): string {
  return round.items
    .map((it, i) => {
      const a = answers[i];
      const ref = it.a ? `\n   Reference answer (a guide, not a script): ${it.a.replace(/\s+/g, " ").slice(0, 900)}` : "\n   Reference answer: none given, judge accuracy and depth.";
      const said = !a ? "(not reached)" : a.skipped ? "(skipped)" : a.a;
      const fu = (a?.followUps ?? []).map((f) => `\n   Follow-up asked: ${f.q}\n   Follow-up answer: ${f.a || "(no answer)"}`).join("");
      return `${i + 1}. ${it.q}${ref}\n   Candidate answer: ${said}${fu}`;
    })
    .join("\n\n");
}

export function theoryGraderPrompt(p: { positionTitle: string; block: string; count: number }): string {
  return `You are the Interviewpad AI Grading Agent.
Grade a candidate's spoken answers to theory questions for the position of "${p.positionTitle}". Answers were transcribed from speech, so judge meaning, not spelling (for example "use effect" means useEffect).

${p.block}

For each of the ${p.count} questions, compare the answer with the reference answer when there is one:
- score 0 to 5 (5 = complete and correct, 3 = right idea with gaps, 1 = mostly wrong, 0 = no real answer)
- verdict: "strong" (4-5), "partial" (2-3) or "missed" (0-1)
- covered: the points the answer got right, one short sentence
- missed: the important points it left out or got wrong, one short sentence
- reason: one sentence on the score
Only judge what the candidate said. Never reward an answer for repeating the question.

Output strictly a JSON object:
{
  "questions": [{ "n": number, "score": number, "verdict": string, "covered": string, "missed": string, "reason": string }],
  "communication": number (1-5),
  "aiSummary": string (lines starting "+ " for strengths and "- " for gaps)
}`;
}

/** Without a model: honest, low and labelled. A recruiter should read the answers. */
export function fallbackGrade(answer: TheoryAnswer): TheoryGrade {
  if (answer.skipped) return { score: 0, verdict: "skipped", covered: "", missed: "", reason: "Skipped without an answer." };
  const words = answer.a.split(/\s+/).filter(Boolean).length;
  return {
    score: words >= 25 ? 2 : words >= 8 ? 1 : 0,
    verdict: "unscored",
    covered: "",
    missed: "",
    reason: "Not scored by the AI. This only reflects answer length; read the answer to judge it.",
  };
}

/* ── Follow-ups ──────────────────────────────────────────────────────────── */

/**
 * Prompt for deciding on a follow-up. It sees the question and the answer,
 * never the reference answer, so a follow-up cannot give the answer away.
 */
export function followUpPrompt(p: { positionTitle: string; question: string; answer: string; earlier: TheoryFollowUp[] }): string {
  const earlier = p.earlier.map((f) => `Follow-up: ${f.q}\nAnswer: ${f.a || "(no answer)"}`).join("\n");
  return `You are interviewing a candidate for "${p.positionTitle}". You asked a theory question and heard the answer below (transcribed from speech).

Question: ${p.question}
Answer: ${p.answer}
${earlier ? `${earlier}\n` : ""}
Decide whether ONE short follow-up would show more about what the candidate knows. Ask one when the answer is vague, very short, or skips an obvious part of the question. Do not ask one when the answer is already complete. Never hint at or state the correct answer, never correct the candidate, and never ask a new unrelated question.

Output strictly a JSON object: { "followUp": string or null }. A follow-up is one plain spoken sentence under 25 words.`;
}

/** Offline stand-in: probe only clearly thin answers, with neutral wording. */
export function fallbackFollowUp(answer: string): string | null {
  const words = answer.split(/\s+/).filter(Boolean).length;
  return words > 0 && words < 20 ? "Could you expand on that with a concrete example?" : null;
}

export function cleanFollowUp(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t || t.length > 300) return null;
  return t;
}
