/**
 * Stage history for the workflow stepper: when each stage was entered and
 * how long the candidate spent there, rebuilt from PIPELINE_STAGE_CHANGED
 * audit rows. Client-safe.
 */
import { PIPELINE_STAGES, STAGE_RANK, type PipelineStage } from "@/lib/crm/stages";

export type StageMove = { from: string; to: string; at: string };

export type StepState = "done" | "now" | "todo";

export type StageStep = {
  stage: PipelineStage;
  state: StepState;
  enteredAt: string | null;
  /** Whole days spent (so far, for the current stage). */
  days: number | null;
};

const DAY = 86_400_000;
const FLOW = PIPELINE_STAGES.filter((s) => s !== "REJECTED");

/**
 * One step per stage from Applied to Hired. A rejected candidate keeps the
 * steps they reached and the stepper shows Rejected separately.
 */
export function buildStageSteps(input: {
  stage: string;
  createdAt: string;
  stageChangedAt: string | null;
  moves: StageMove[];
  now?: number;
}): { steps: StageStep[]; rejectedAt: string | null; lastActiveStage: PipelineStage } {
  const now = input.now ?? Date.now();
  const moves = [...input.moves].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  // Entries: when each stage was last entered.
  const entered = new Map<string, string>();
  const firstFrom = moves[0]?.from;
  // Where the candidate started: the first recorded move's origin, else their
  // current stage, else Applied for someone rejected with no history.
  const origin = firstFrom && firstFrom !== "REJECTED" ? firstFrom : input.stage === "REJECTED" ? "APPLIED" : input.stage;
  entered.set(origin, input.createdAt);
  for (const m of moves) entered.set(m.to, m.at);
  if (!moves.length || moves[moves.length - 1].to !== input.stage) {
    entered.set(input.stage, input.stageChangedAt ?? input.createdAt);
  }

  // A rejected candidate's furthest stage is the one they were rejected from.
  let lastActive: PipelineStage = "APPLIED";
  if (input.stage === "REJECTED") {
    const lastMove = [...moves].reverse().find((m) => m.to === "REJECTED");
    const from = lastMove?.from;
    lastActive = from && from !== "REJECTED" && (FLOW as string[]).includes(from) ? (from as PipelineStage) : "APPLIED";
  } else if ((FLOW as string[]).includes(input.stage)) {
    lastActive = input.stage as PipelineStage;
  }
  const currentRank = STAGE_RANK[lastActive];

  // Leaving time of each stage is the next move out of it.
  const left = new Map<string, string>();
  for (const m of moves) left.set(m.from, m.at);

  const steps: StageStep[] = FLOW.map((stage) => {
    const rank = STAGE_RANK[stage];
    const at = entered.get(stage) ?? null;
    if (rank > currentRank) return { stage, state: "todo", enteredAt: null, days: null };
    const isNow = stage === lastActive && input.stage !== "REJECTED";
    // Passed before history was recorded (or created straight into a later
    // stage): shown as done, without a date.
    if (!at) return { stage, state: isNow ? "now" : "done", enteredAt: null, days: null };
    // A finished stage ends at the move out of it, else at the next stage we
    // have a date for; without either the time spent is unknown.
    const nextKnown = FLOW.slice(FLOW.indexOf(stage) + 1)
      .map((s) => entered.get(s))
      .find((d): d is string => !!d);
    const endIso = isNow ? null : (left.get(stage) ?? nextKnown ?? (input.stage === "REJECTED" ? entered.get("REJECTED") : undefined));
    const end = isNow ? now : endIso ? +new Date(endIso) : null;
    return {
      stage,
      state: isNow ? "now" : "done",
      enteredAt: at,
      days: end == null ? null : Math.max(0, Math.floor((end - +new Date(at)) / DAY)),
    };
  });

  return {
    steps,
    rejectedAt: input.stage === "REJECTED" ? (entered.get("REJECTED") ?? input.stageChangedAt) : null,
    lastActiveStage: lastActive,
  };
}

/** Parse audit rows into moves, skipping unreadable meta. */
export function movesFromAudit(rows: { meta: string | null; createdAt: Date | string }[]): StageMove[] {
  const out: StageMove[] = [];
  for (const r of rows) {
    try {
      const m = r.meta ? JSON.parse(r.meta) : null;
      if (m && typeof m.fromStage === "string" && typeof m.toStage === "string") {
        out.push({ from: m.fromStage, to: m.toStage, at: new Date(r.createdAt).toISOString() });
      }
    } catch {
      /* skip */
    }
  }
  return out;
}
