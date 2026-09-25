/**
 * Pure rules behind the recruiter's AI screening pages: what state an invite
 * is in, how the AI score reads, integrity tiers, invite expiry and reminders,
 * and how many credits a new screening needs. No Prisma, so the rules are
 * unit-tested and shared by server pages, server actions and the cron sweep.
 */
import { verdictBands } from "./verdict";
import { creditCostForLevel } from "./engagement";

export const SESSION_STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "EXPIRED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** Recruiter-facing name for a stored session status. */
export function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Invited";
    case "ACTIVE":
      return "In progress";
    case "COMPLETED":
      return "Finished";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

export type Tone = "success" | "indigo" | "warning" | "danger" | "neutral";

export function statusTone(status: string): Tone {
  return status === "COMPLETED" ? "success" : status === "ACTIVE" ? "warning" : status === "EXPIRED" ? "danger" : "neutral";
}

/**
 * The AI's suggestion for a finished screening. It is only a suggestion:
 * passing a candidate is always a recruiter's decision.
 * `linesWritten` of 0 means the candidate submitted without writing code.
 */
export type Suggestion = { label: string; tone: Tone; aboveBar: boolean; detail: string };

export function suggestion(score: number | null | undefined, linesWritten?: number | null, passMark?: number | null): Suggestion | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (linesWritten === 0) {
    return { label: "No code written", tone: "danger", aboveBar: false, detail: "The candidate submitted without changing the starter code." };
  }
  const b = verdictBands(passMark);
  const aboveBar = s >= b.bar;
  if (s >= b.strong) return { label: "Strong match", tone: "success", aboveBar, detail: `Well above the bar of ${b.bar}.` };
  if (aboveBar) return { label: "Good match", tone: "indigo", aboveBar, detail: `Above the bar of ${b.bar}.` };
  if (s >= b.borderline) return { label: "Borderline", tone: "warning", aboveBar, detail: `Below the bar of ${b.bar}. Read the report before deciding.` };
  return { label: "Weak match", tone: "danger", aboveBar, detail: `Well below the bar of ${b.bar}.` };
}

/**
 * Integrity tier from the stored suspicion score (0-100, a heuristic built
 * from paste and tab-switch events). Null when nothing was recorded.
 */
export type Integrity = { label: string; tone: Tone };

export function integrity(suspicion: number | null | undefined): Integrity | null {
  if (typeof suspicion !== "number" || Number.isNaN(suspicion)) return null;
  if (suspicion >= 60) return { label: "High risk", tone: "danger" };
  if (suspicion >= 30) return { label: "Some flags", tone: "warning" };
  return { label: "Clean", tone: "success" };
}

/* ── Review queue ─────────────────────────────────────────────────────────── */

export const QUEUE_VIEWS = ["review", "progress", "invited", "all"] as const;
export type QueueView = (typeof QUEUE_VIEWS)[number];

export function parseQueueView(v: string | null | undefined): QueueView {
  return (QUEUE_VIEWS as readonly string[]).includes(v ?? "") ? (v as QueueView) : "review";
}

export const QUEUE_SORTS = ["score", "recent", "name"] as const;
export type QueueSort = (typeof QUEUE_SORTS)[number];

export function parseQueueSort(v: string | null | undefined, view: QueueView): QueueSort {
  if ((QUEUE_SORTS as readonly string[]).includes(v ?? "")) return v as QueueSort;
  return view === "review" ? "score" : "recent";
}

/** Candidate stages whose finished screenings still wait for a decision. */
export const REVIEW_STAGES = ["NEW", "SCREENING"] as const;

/**
 * Whether a finished screening still waits for a recruiter: the candidate has
 * no decision yet (or the screening is not linked to a candidate).
 */
export function awaitsDecision(status: string, candidateStage: string | null | undefined, hasCandidate: boolean): boolean {
  if (status !== "COMPLETED") return false;
  if (!hasCandidate) return true;
  return (REVIEW_STAGES as readonly string[]).includes(candidateStage ?? "NEW");
}

/**
 * Builds the query string for a queue link, dropping defaults so URLs stay
 * short. Every filter survives paging (the old page lost them).
 */
export function queueHref(
  base: string,
  current: { view?: string; q?: string; screening?: string; sort?: string; page?: number },
  patch: Partial<{ view: string; q: string; screening: string; sort: string; page: number }>,
): string {
  const next = { ...current, ...patch };
  // Changing a filter returns to the first page.
  if (!("page" in patch)) next.page = 1;
  const params = new URLSearchParams();
  if (next.view && next.view !== "review") params.set("view", next.view);
  if (next.q) params.set("q", next.q);
  if (next.screening && next.screening !== "all") params.set("screening", next.screening);
  if (next.sort) params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/* ── Invite expiry and reminders ─────────────────────────────────────────── */

export const EXPIRY_CHOICES = [3, 7, 14, 30] as const;
export const REMINDER_CHOICES = [0, 1, 2, 3, 5] as const; // 0 = no reminder
export const DEFAULT_EXPIRY_DAYS = 7;
export const DEFAULT_REMINDER_DAYS = 3;

const DAY_MS = 86_400_000;

export function expiryDate(sentAt: Date, days: number | null | undefined): Date | null {
  if (!days || days <= 0) return null;
  return new Date(sentAt.getTime() + days * DAY_MS);
}

/** An unstarted invite whose expiry time has passed. */
export function isExpired(
  s: { status: string; startedAt: Date | null; expiresAt: Date | null },
  now: Date,
): boolean {
  return s.status === "PENDING" && !s.startedAt && !!s.expiresAt && s.expiresAt.getTime() <= now.getTime();
}

/**
 * Whether the automatic reminder is due: the invite is unstarted and still
 * open, no reminder went out yet, the batch asked for one, and enough days
 * passed since the invite was sent.
 */
export function reminderDue(
  s: {
    status: string;
    startedAt: Date | null;
    expiresAt: Date | null;
    reminderSentAt: Date | null;
    inviteSentAt: Date | null;
    createdAt: Date;
  },
  reminderAfterDays: number | null | undefined,
  now: Date,
): boolean {
  if (!reminderAfterDays || reminderAfterDays <= 0) return false;
  if (s.status !== "PENDING" || s.startedAt || s.reminderSentAt) return false;
  if (isExpired(s, now)) return false;
  const sent = (s.inviteSentAt ?? s.createdAt).getTime();
  return now.getTime() - sent >= reminderAfterDays * DAY_MS;
}

/** Days until an invite closes, rounded up; null when it never expires. */
export function daysLeft(expiresAt: Date | null, now: Date): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
}

/* ── Credits ─────────────────────────────────────────────────────────────── */

/**
 * Credits already promised to invites that have not started yet. Each is
 * charged when its candidate sends a first message; expired invites stop
 * holding credits.
 */
export function heldCredits(
  invites: { engagementLevel: string | null; status: string; startedAt: Date | null; expiresAt: Date | null; practice?: boolean }[],
  now: Date,
): number {
  let held = 0;
  for (const s of invites) {
    if (s.practice || s.status !== "PENDING" || s.startedAt || isExpired(s, now)) continue;
    held += creditCostForLevel(s.engagementLevel);
  }
  return held;
}

export type CreditCheck = {
  needed: number;
  available: number;
  after: number;
  ok: boolean;
};

/** Whether the balance covers N new invites at a presence level. */
export function creditCheck(balance: number, held: number, invites: number, level: string | null | undefined): CreditCheck {
  const needed = invites * creditCostForLevel(level);
  const available = Math.max(0, balance - held);
  return { needed, available, after: available - needed, ok: needed <= available };
}

/* ── Code counts ─────────────────────────────────────────────────────────── */

/** A written line counts when it has at least 3 characters and a letter or digit. */
export function isMeaningfulLine(line: string): boolean {
  const t = line.trim();
  return t.length >= 3 && /[A-Za-z0-9]/.test(t) && !/^[{}[\]()<>;:,]+$/.test(t);
}

/* ── Emails pasted into New screening ────────────────────────────────────── */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * Pulls people out of pasted text: "Name <email>", "email, Name" or bare
 * emails, one per line or separated by commas and semicolons. Emails are
 * lower-cased and de-duplicated; a missing name falls back to the part before @.
 */
export function parsePastedPeople(text: string): { name: string; email: string }[] {
  const out: { name: string; email: string }[] = [];
  const seen = new Set<string>();
  for (const chunk of text.split(/[\n;]+/)) {
    const emails = chunk.match(EMAIL_RE);
    if (!emails) continue;
    const parts = emails.length === 1 ? [chunk] : chunk.split(",");
    for (const part of parts) {
      const email = part.match(EMAIL_RE)?.[0]?.toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const rest = part
        .replace(EMAIL_RE, "")
        .replace(/[<>"(),]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const fallback = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      out.push({ name: rest || fallback, email });
    }
  }
  return out;
}

/* ── AI summary ──────────────────────────────────────────────────────────── */

export type SummarySection = { round: number | null; score: number | null; strengths: string[]; gaps: string[]; notes: string[] };

/**
 * Splits the grader's bulleted summary into strengths and gaps. Multi-round
 * summaries arrive as "Round N (score/100):" blocks; single-round ones are
 * one block. Lines starting "+" are strengths and "-" are gaps, with an
 * optional "[Label]" tag that is dropped.
 */
export function parseSummary(text: string | null | undefined): SummarySection[] {
  if (!text?.trim()) return [];
  const out: SummarySection[] = [];
  let cur: SummarySection = { round: null, score: null, strengths: [], gaps: [], notes: [] };
  const push = () => {
    if (cur.strengths.length || cur.gaps.length || cur.notes.length) out.push(cur);
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^Round\s+(\d+)\s*\((\d+)\s*\/\s*100\)\s*:?$/i);
    if (head) {
      push();
      cur = { round: Number(head[1]), score: Number(head[2]), strengths: [], gaps: [], notes: [] };
      continue;
    }
    const clean = line.replace(/^([+\-*•])\s*(\[[^\]]*\])?\s*/, "").trim();
    if (!clean) continue;
    if (line.startsWith("+")) cur.strengths.push(clean);
    else if (line.startsWith("-")) cur.gaps.push(clean);
    else cur.notes.push(clean);
  }
  push();
  return out;
}

/** Ratings are stored 1-5 per skill; shown as a 0-100 bar. */
export function ratingPercent(v: number | null | undefined): number | null {
  if (typeof v !== "number" || Number.isNaN(v) || v <= 0) return null;
  return Math.round(Math.max(0, Math.min(5, v)) * 20);
}

export function fmtDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// ---- Role picker ---------------------------------------------------------------

export const ROLE_LEVELS = ["Junior", "Mid-level", "Senior", "Lead", "Manager"] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number];

export type RoleArea = {
  id: string;
  label: string;
  /** Title noun, e.g. "Frontend Engineer". */
  noun: string;
  /** Title used with the Manager level. */
  manager: string;
  technical: boolean;
  /** Stack preselected when the area is picked and nothing is chosen yet. */
  stack?: { frontend?: string[]; backend?: string[]; dsa?: string[] };
};

export const ROLE_AREAS: RoleArea[] = [
  { id: "frontend", label: "Frontend", noun: "Frontend Engineer", manager: "Frontend Engineering Manager", technical: true, stack: { frontend: ["react"] } },
  { id: "backend", label: "Backend", noun: "Backend Engineer", manager: "Backend Engineering Manager", technical: true, stack: { backend: ["node"] } },
  { id: "fullstack", label: "Full-stack", noun: "Full-stack Engineer", manager: "Engineering Manager", technical: true, stack: { frontend: ["react"], backend: ["node"] } },
  { id: "mobile", label: "Mobile", noun: "Mobile Engineer", manager: "Mobile Engineering Manager", technical: true, stack: { frontend: ["react"] } },
  { id: "data", label: "Data", noun: "Data Engineer", manager: "Data Engineering Manager", technical: true, stack: { backend: ["python"], dsa: ["python"] } },
  { id: "devops", label: "DevOps", noun: "DevOps Engineer", manager: "Platform Engineering Manager", technical: true, stack: { backend: ["python"] } },
  { id: "qa", label: "QA", noun: "QA Engineer", manager: "QA Manager", technical: true, stack: { frontend: ["react"] } },
  { id: "product", label: "Product", noun: "Product Manager", manager: "Group Product Manager", technical: false },
  { id: "design", label: "Design", noun: "Product Designer", manager: "Design Manager", technical: false },
  { id: "sales", label: "Sales", noun: "Account Executive", manager: "Sales Manager", technical: false },
  { id: "marketing", label: "Marketing", noun: "Marketing Specialist", manager: "Marketing Manager", technical: false },
  { id: "support", label: "Customer support", noun: "Customer Support Specialist", manager: "Customer Support Manager", technical: false },
  { id: "operations", label: "Operations", noun: "Operations Specialist", manager: "Operations Manager", technical: false },
  { id: "people", label: "People and HR", noun: "HR Generalist", manager: "People Manager", technical: false },
  { id: "finance", label: "Finance", noun: "Financial Analyst", manager: "Finance Manager", technical: false },
];

/**
 * Compose a job title from a level and an area. "Mid-level" is left out of
 * the title, as job ads usually do; Manager uses the area's own manager title.
 */
export function composeRoleTitle(level: RoleLevel | null, areaId: string | null): string {
  const area = ROLE_AREAS.find((a) => a.id === areaId) ?? null;
  if (level === "Manager") return area ? area.manager : "Manager";
  const prefix = level && level !== "Mid-level" ? level : "";
  const noun = area ? area.noun : level ? "Engineer" : "";
  return [prefix, noun].filter(Boolean).join(" ");
}

/** Best-effort read of a level and area back out of a free-text title. */
export function parseRoleTitle(title: string): { level: RoleLevel | null; area: string | null } {
  const t = title.trim().toLowerCase();
  if (!t) return { level: null, area: null };
  for (const level of ROLE_LEVELS)
    for (const a of ROLE_AREAS) if (composeRoleTitle(level, a.id).toLowerCase() === t) return { level, area: a.id };
  return { level: null, area: null };
}
