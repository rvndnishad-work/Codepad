/**
 * Batch summaries for the Batches list and a batch header. Client-safe.
 */
import { PIPELINE_STAGES } from "@/lib/crm/stages";
import type { RosterRow } from "@/lib/crm/roster";

export type BatchSummary = {
  id: string;
  name: string;
  roleTitle: string | null;
  status: string;
  ownerId: string | null;
  ownerName: string | null;
  deadline: string | null;
  targetHires: number | null;
  createdAt: string;
  total: number;
  passed: number;
  attention: number;
  addedThisWeek: number;
  stages: { stage: string; count: number }[];
};

export function summarizeBatch(
  b: Omit<BatchSummary, "total" | "passed" | "attention" | "addedThisWeek" | "stages">,
  rows: RosterRow[],
  now = Date.now(),
): BatchSummary {
  const mine = rows.filter((r) => r.batchId === b.id && r.status !== "archived");
  const counts = new Map<string, number>();
  for (const r of mine) counts.set(r.stage, (counts.get(r.stage) ?? 0) + 1);
  return {
    ...b,
    total: mine.length,
    passed: counts.get("PASSED") ?? 0,
    attention: mine.filter((r) => r.attention).length,
    addedThisWeek: mine.filter((r) => now - +new Date(r.createdAt) < 7 * 86_400_000).length,
    stages: PIPELINE_STAGES.map((s) => ({ stage: s, count: counts.get(s) ?? 0 })).filter((s) => s.count > 0),
  };
}

/** "31 Oct", "Closed 30 Aug", "12 days left" style deadline text. */
export function deadlineText(deadline: string | null, status: string, now = Date.now()): string {
  if (!deadline) return status === "CLOSED" ? "Closed" : "No deadline";
  const d = new Date(deadline);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (status === "CLOSED") return `Closed, due ${date}`;
  const days = Math.ceil((+d - now) / 86_400_000);
  if (days < 0) return `${date}, overdue`;
  if (days === 0) return `${date}, today`;
  return `${date}, ${days} ${days === 1 ? "day" : "days"} left`;
}
