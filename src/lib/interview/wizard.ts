/**
 * Pure rules for the live interview wizard (/w/[slug]/interviews/new): the
 * interview formats, which steps each one needs, what is still missing before
 * it can be scheduled, and who may open the interviewer side of the room.
 * No imports from Prisma, so client components use it too.
 */

import type { Paradigm } from "@/lib/interview/stack";

export type FormatId = "coding" | "discussion" | "behavioural" | "intro" | "mixed";
export type QuestionPlan = "set" | "later" | "open";
export type RoundKind = "challenge" | "playground" | "prompt";

export type FormatDef = {
  id: FormatId;
  label: string;
  blurb: string;
  /** Needs a technical person to judge it. */
  technical: boolean;
  /** Candidate writes code in the room (coding rounds). */
  coding: boolean;
  /** Interviewer works from a question guide (questionnaire). */
  guide: boolean;
  minutes: number;
  /** What the questions step starts on. */
  plan: QuestionPlan;
  /** Words used in the default title, e.g. "Coding interview". */
  titleWord: string;
};

export const FORMATS: FormatDef[] = [
  {
    id: "coding",
    label: "Coding round",
    blurb: "The candidate solves problems in a shared editor while you watch and talk.",
    technical: true,
    coding: true,
    guide: false,
    minutes: 60,
    plan: "set",
    titleWord: "Coding interview",
  },
  {
    id: "discussion",
    label: "Technical discussion",
    blurb: "Talk through concepts and past work from a question guide. No editor.",
    technical: true,
    coding: false,
    guide: true,
    minutes: 45,
    plan: "set",
    titleWord: "Technical discussion",
  },
  {
    id: "mixed",
    label: "Coding and discussion",
    blurb: "Warm up with questions, then move to a coding problem.",
    technical: true,
    coding: true,
    guide: true,
    minutes: 90,
    plan: "set",
    titleWord: "Technical interview",
  },
  {
    id: "behavioural",
    label: "Behavioural",
    blurb: "Teamwork, ownership and past situations, from a question guide.",
    technical: false,
    coding: false,
    guide: true,
    minutes: 45,
    plan: "set",
    titleWord: "Behavioural interview",
  },
  {
    id: "intro",
    label: "Intro chat",
    blurb: "A relaxed first conversation. No set questions needed.",
    technical: false,
    coding: false,
    guide: true,
    minutes: 30,
    plan: "open",
    titleWord: "Intro chat",
  },
];

export const FORMAT_BY_ID: Record<FormatId, FormatDef> = Object.fromEntries(FORMATS.map((f) => [f.id, f])) as Record<FormatId, FormatDef>;

export function formatOf(id: string | null | undefined): FormatDef | null {
  return id && id in FORMAT_BY_ID ? FORMAT_BY_ID[id as FormatId] : null;
}

/** Plans a format may use. Coding rounds need something to code, so "open" is out. */
export function plansFor(format: FormatDef): QuestionPlan[] {
  return format.coding ? ["set", "later"] : ["set", "later", "open"];
}

export const DURATION_CHOICES = [30, 45, 60, 90] as const;
export const MIN_MINUTES = 15;
export const MAX_MINUTES = 240;
export const MAX_ROUNDS = 10;
export const MAX_CANDIDATES = 20;
export const MAX_PANEL = 6;
/** People outside the workspace who get the details by email. */
export const MAX_GUESTS = 10;

export type WizardCandidate = { id: string | null; name: string; email: string };
export type WizardRound = { key: string; kind: RoundKind; id: string; title: string; minutes: number; meta?: string };

export type WizardState = {
  format: FormatId | null;
  title: string;
  candidates: WizardCandidate[];
  /** Share one open link instead of naming people now. */
  noCandidate: boolean;
  hostId: string;
  panelIds: string[];
  /** Emails of interviewers who are not workspace members. They get the details and a room link. */
  guests?: string[];
  plan: QuestionPlan;
  rounds: WizardRound[];
  guideId: string | null;
  questionsOwnerId: string | null;
  questionsNote: string;
  minutes: number;
  /** One local datetime ("YYYY-MM-DDTHH:mm") per candidate, or one for the open link. Empty = no time yet. */
  times: string[];
  brief: string;
  candidateBrief: string;
  sendInvites: boolean;
  /** Times were filled in (or cleared) once, so the schedule step stops suggesting them. */
  timesSet?: boolean;
  /** Length was set by hand, so it stops following the rounds. */
  lengthSet?: boolean;
  /** Room tools switched on at the start. Unset follows the format. */
  tools?: string[];
};

export type StepId = "format" | "candidates" | "panel" | "questions" | "schedule" | "review";

export const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "format", label: "Format", hint: "What kind of interview" },
  { id: "candidates", label: "Candidates", hint: "Who is interviewed" },
  { id: "panel", label: "Interviewers", hint: "Who runs it" },
  { id: "questions", label: "Questions", hint: "Now, later or none" },
  { id: "schedule", label: "Schedule", hint: "When and how long" },
  { id: "review", label: "Review", hint: "Check and send" },
];

/** What still blocks each step. An empty list means the step is complete. */
export function stepIssues(s: WizardState, step: StepId): string[] {
  const f = formatOf(s.format);
  switch (step) {
    case "format":
      return f ? [] : ["Pick an interview format."];
    case "candidates":
      if (s.noCandidate) return [];
      if (s.candidates.length === 0) return ["Add at least one candidate, or choose to share a link later."];
      if (s.candidates.some((c) => c.email && !isEmail(c.email))) return ["One of the emails does not look right."];
      return [];
    case "panel":
      if (!s.hostId) return ["Choose who runs the interview."];
      if ((s.guests ?? []).some((g) => !isEmail(g))) return ["One of the emails does not look right."];
      return [];
    case "questions": {
      if (!f) return ["Pick a format first."];
      if (!plansFor(f).includes(s.plan)) return ["Coding rounds need questions, now or from a teammate."];
      if (s.plan === "later") return s.questionsOwnerId ? [] : ["Choose the teammate who picks the questions."];
      if (s.plan === "open") return [];
      const out: string[] = [];
      if (f.coding && s.rounds.length === 0) out.push("Add at least one coding round.");
      if (!f.coding && f.guide && !s.guideId) out.push("Choose a question guide.");
      return out;
    }
    case "schedule":
      if (s.minutes < MIN_MINUTES || s.minutes > MAX_MINUTES) return [`Length must be between ${MIN_MINUTES} and ${MAX_MINUTES} minutes.`];
      return [];
    case "review":
      return STEPS.filter((x) => x.id !== "review").flatMap((x) => stepIssues(s, x.id));
  }
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** Default title from the format and the first candidate. */
export function defaultTitle(format: FormatDef | null, candidates: WizardCandidate[]): string {
  const base = format?.titleWord ?? "Interview";
  if (candidates.length === 1) return `${base} with ${firstName(candidates[0].name)}`;
  return base;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

/** Sum of round minutes, used to suggest a length. */
export function roundsMinutes(rounds: WizardRound[]): number {
  return rounds.reduce((n, r) => n + r.minutes, 0);
}

/** Suggested length: the format default, or the rounds plus 10 minutes for intros, rounded up to 15. */
export function suggestedMinutes(format: FormatDef | null, rounds: WizardRound[]): number {
  const base = format?.minutes ?? 60;
  const need = rounds.length ? roundsMinutes(rounds) + (format?.guide ? 20 : 10) : 0;
  return clampMinutes(Math.max(base, Math.ceil(need / 15) * 15));
}

export function clampMinutes(n: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)));
}

/**
 * Back-to-back slots: the first at `start`, each next one after the
 * interview length plus `gap` minutes. Local "YYYY-MM-DDTHH:mm" strings.
 */
export function staggerSlots(start: string, minutes: number, count: number, gap = 15): string[] {
  const d = parseLocal(start);
  if (!d) return Array.from({ length: count }, () => "");
  return Array.from({ length: count }, (_, i) => toLocalInput(new Date(d.getTime() + i * (minutes + gap) * 60_000)));
}

/** Tomorrow at 10:00 local, the first suggested start. */
export function defaultStart(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0);
  return toLocalInput(d);
}

/** The slot after `prev`: one interview length plus `gap` minutes later. Empty when `prev` is empty. */
export function nextSlot(prev: string, minutes: number, gap = 15): string {
  const d = parseLocal(prev);
  return d ? toLocalInput(new Date(d.getTime() + (minutes + gap) * 60_000)) : "";
}

/**
 * Rows whose interview starts before an earlier one (by start time) has
 * ended. The same host runs every room, so these clash.
 */
export function timeClashes(times: string[], minutes: number): Set<number> {
  const rows = times
    .map((t, i) => ({ i, d: parseLocal(t) }))
    .filter((r): r is { i: number; d: Date } => !!r.d)
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  const out = new Set<number>();
  let end = -Infinity;
  let endRow = -1;
  for (const r of rows) {
    if (r.d.getTime() < end) {
      out.add(r.i);
      out.add(endRow);
    }
    const e = r.d.getTime() + minutes * 60_000;
    if (e > end) {
      end = e;
      endRow = r.i;
    }
  }
  return out;
}

/** Clean a list of typed emails: trimmed, lower case, no repeats, at most MAX_GUESTS. */
export function normalizeGuests(list: string[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const e = raw.trim().toLowerCase();
    if (e && !out.includes(e)) out.push(e);
  }
  return out.slice(0, MAX_GUESTS);
}

export function parseLocal(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parse a stored JSON string[] of ids; anything else is empty. */
export function parsePanel(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}

/** The host and co-interviewers get the interviewer side of the room. */
export function isInterviewerFor(s: { userId: string; panelJson?: string | null }, userId: string | null | undefined): boolean {
  if (!userId) return false;
  return s.userId === userId || parsePanel(s.panelJson).includes(userId);
}

export type QuestionState = "ready" | "needed" | "open";

/** "needed" while a teammate still has to pick the questions. */
export function questionState(s: { questionPlan?: string | null; roundCount: number; guideTemplateId?: string | null }): QuestionState {
  if (s.questionPlan === "open") return "open";
  if (s.questionPlan === "later" && s.roundCount === 0 && !s.guideTemplateId) return "needed";
  return "ready";
}

/* Options the wizard picks from (loaded by wizard-server.ts). */

export type PersonOption = {
  id: string;
  name: string;
  email: string | null;
  stage: string;
  batch: string | null;
  /** Live interviews this person already has in this workspace. */
  interviews: number;
};

export type MemberOption = { userId: string; name: string; email: string; role: string; image: string | null };

export type RoundOption = {
  kind: "challenge" | "playground" | "prompt";
  id: string;
  title: string;
  minutes: number;
  difficulty: string | null;
  category: string | null;
  /** Belongs to this workspace (vs the public bank or a starter). */
  own: boolean;
  paradigm: Paradigm | null;
  tags: string[];
};

export type GuideOption = {
  id: string;
  title: string;
  brief: string;
  roleArea: string | null;
  minutes: number;
  questions: string[];
};

export function roundKey(r: { kind: string; id: string }): string {
  return `${r.kind}:${r.id}`;
}

export function toWizardRound(o: RoundOption): WizardRound {
  return { key: roundKey(o), kind: o.kind, id: o.id, title: o.title, minutes: o.minutes, meta: o.difficulty ?? o.category ?? undefined };
}
