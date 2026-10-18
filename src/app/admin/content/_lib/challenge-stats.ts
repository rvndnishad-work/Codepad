/**
 * Funnel maths for the challenge edit page. Inputs are the per-step counts
 * of distinct people who started a step and who passed it; output is one
 * row per step with the share that went on to the next step.
 */
export type StepCounts = { stepId: string; started: number; passed: number };
export type StepInfo = { id: string; position: number; title: string | null };

export type StepFunnelRow = {
  id: string;
  label: string;
  started: number;
  passed: number;
  /** passed / started, 0..1, null when nobody started. */
  passRate: number | null;
  /** Share of people who started this step and did not start the next one. Null on the last step. */
  dropOff: number | null;
};

export function stepFunnel(steps: StepInfo[], counts: StepCounts[]): StepFunnelRow[] {
  const byId = new Map(counts.map((c) => [c.stepId, c]));
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  return ordered.map((s, i) => {
    const c = byId.get(s.id) ?? { started: 0, passed: 0 };
    const next = ordered[i + 1] ? byId.get(ordered[i + 1].id)?.started ?? 0 : null;
    const dropOff =
      next === null || c.started === 0 ? null : Math.max(0, Math.min(1, 1 - next / c.started));
    return {
      id: s.id,
      label: s.title?.trim() || `Step ${i + 1}`,
      started: c.started,
      passed: c.passed,
      passRate: c.started > 0 ? c.passed / c.started : null,
      dropOff,
    };
  });
}

export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 100)}%`;
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
