/**
 * Display helpers for the recruiter workspace (/w and /w/[slug]).
 *
 * Pure and synchronous so server pages, client components and unit tests can
 * share them. Nothing here reads the database.
 */
import { trialActive, type PlanFields } from "@/lib/billing/trial";
import { normalizeStage, type PipelineStage } from "@/lib/crm/stages";

const DAY_MS = 86_400_000;

export type PlanDisplay = {
  /** Sentence-case plan name for chips: "Growth", "Trial", "Free". */
  label: string;
  onTrial: boolean;
  /** Whole days left on an active trial (at least 1), else null. */
  trialDaysLeft: number | null;
  /** Share of the trial already used, 0 to 1, for a progress bar. */
  trialUsed: number | null;
  /** AI screening, ATS sync and the other Growth-level tools are on. */
  growthFeatures: boolean;
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
  LOCKED: "Locked",
};

export function planDisplay(
  ws: PlanFields & { trialDays?: number },
  now: Date = new Date(),
): PlanDisplay {
  const onTrial = trialActive(ws, now);
  if (onTrial && ws.trialEndsAt) {
    const msLeft = new Date(ws.trialEndsAt).getTime() - now.getTime();
    const days = Math.max(1, Math.ceil(msLeft / DAY_MS));
    const total = ws.trialDays ?? 14;
    return {
      label: "Trial",
      onTrial: true,
      trialDaysLeft: days,
      trialUsed: Math.min(1, Math.max(0, 1 - days / total)),
      growthFeatures: true,
    };
  }
  return {
    label: PLAN_LABELS[ws.planName] ?? humanize(ws.planName),
    onTrial: false,
    trialDaysLeft: null,
    trialUsed: null,
    growthFeatures: ws.planName === "GROWTH" || ws.planName === "ENTERPRISE",
  };
}

/** "NOT_PASSED" -> "Not passed", "do_not_hire" -> "Do not hire". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  const words = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SOURCE_LABELS: Record<string, string> = { linkedin: "LinkedIn", ats: "ATS", csv: "CSV import", api: "API" };

/** Candidate source for display: "linkedin" -> "LinkedIn", missing -> "Not set". */
export function sourceLabel(source: string | null | undefined): string {
  if (!source) return "Not set";
  return SOURCE_LABELS[source.toLowerCase()] ?? humanize(source);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" for a local hour. */
export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Short relative time: "Just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", or a date. */
export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  const diff = now.getTime() - t;
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < DAY_MS) return "Today";
    const d = Math.round(ahead / DAY_MS);
    return d === 1 ? "Tomorrow" : `In ${d} days`;
  }
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Stage order shown in the pipeline bar (REJECTED is reported separately). */
export const ACTIVE_STAGES: PipelineStage[] = ["NEW", "SCREENING", "PASSED"];

/**
 * Tailwind background class for each stage's swatch: neutral for new, the
 * indigo accent while screening, then status colours for the two decisions.
 */
export const STAGE_SWATCH: Record<PipelineStage, string> = {
  NEW: "bg-subtle",
  SCREENING: "bg-secondary",
  PASSED: "bg-success",
  REJECTED: "bg-danger",
};

export type StageCount = { stage: PipelineStage; count: number; conversion: number | null };

/**
 * Counts per active stage plus the share of candidates who reached at least
 * the next stage ("moved on"). A candidate who Passed went through New and
 * Screening, so conversion from stage i is
 * reached(i + 1) / reached(i). Rejected candidates are left out: their last
 * stage before rejection is not stored.
 */
export function stageFunnel(stages: string[]): { rows: StageCount[]; active: number; rejected: number } {
  const counts = new Map<PipelineStage, number>(ACTIVE_STAGES.map((s) => [s, 0]));
  let rejected = 0;
  for (const raw of stages) {
    const s = normalizeStage(raw);
    if (s === "REJECTED") {
      rejected++;
      continue;
    }
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const reached = ACTIVE_STAGES.map((_, i) =>
    ACTIVE_STAGES.slice(i).reduce((sum, s) => sum + (counts.get(s) ?? 0), 0),
  );
  const rows = ACTIVE_STAGES.map((stage, i) => ({
    stage,
    count: counts.get(stage) ?? 0,
    conversion:
      i === 0 || reached[i - 1] === 0 ? null : Math.round((reached[i] / reached[i - 1]) * 100),
  }));
  return { rows, active: stages.length - rejected, rejected };
}

export type SetupInput = {
  assessments: number;
  candidates: number;
  aiScreenings: number;
  members: number;
  pendingInvites: number;
};

export type SetupStep = {
  id: "workspace" | "assessment" | "candidate" | "ai" | "team";
  title: string;
  body: string;
  done: boolean;
};

/** The getting-started checklist a new (often trial) workspace opens on. */
export function setupSteps(input: SetupInput, opts: { seatLimit: number | null; aiIncluded: boolean }): SetupStep[] {
  return [
    { id: "workspace", title: "Create your workspace", body: "Done.", done: true },
    {
      id: "assessment",
      title: "Create your first assessment",
      body: "Pick a ready-made question from the library or write your own.",
      done: input.assessments > 0,
    },
    {
      id: "candidate",
      title: "Add a candidate",
      body: "One at a time, or paste a list from your ATS.",
      done: input.candidates > 0,
    },
    {
      id: "ai",
      title: "Run an AI screening",
      body: opts.aiIncluded
        ? "Included in your plan. The report lands on the candidate page."
        : "Available on Growth. The report lands on the candidate page.",
      done: input.aiScreenings > 0,
    },
    {
      id: "team",
      title: "Invite a teammate",
      body: opts.seatLimit ? `Up to ${opts.seatLimit} seats on your current plan.` : "Add recruiters, interviewers and viewers.",
      done: input.members > 1 || input.pendingInvites > 0,
    },
  ];
}

/**
 * "Waiting for review": finished work whose candidate has no decision yet.
 * Passing or not passing the candidate is what clears an item, so the queue
 * needs no extra "reviewed" flag.
 */
export const TAKE_HOME_REVIEW_STAGES = ["NEW", "SCREENING"] as const;
export const SCREENING_REVIEW_STAGES = ["NEW", "SCREENING"] as const;

export function awaitsReview(kind: "take-home" | "screening", candidateStage: string | null | undefined): boolean {
  if (!candidateStage) return true;
  const stages: readonly string[] = kind === "take-home" ? TAKE_HOME_REVIEW_STAGES : SCREENING_REVIEW_STAGES;
  return stages.includes(normalizeStage(candidateStage));
}
