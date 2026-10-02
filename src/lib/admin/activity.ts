/**
 * Product activity events for the admin dashboards (sign-ins, playground
 * runs, question views, judge runs). Fire-and-forget: never awaited on the
 * hot path's success, never throws.
 */
import { prisma } from "@/lib/prisma";

export type ActivityKind = "sign_in" | "playground_run" | "question_view" | "judge_run" | "signup";

export function trackActivity(e: {
  kind: ActivityKind;
  userId?: string | null;
  label?: string | null;
  durationMs?: number | null;
  ok?: boolean;
  targetId?: string | null;
}): void {
  prisma.activityEvent
    .create({
      data: {
        kind: e.kind,
        userId: e.userId ?? null,
        label: e.label ?? null,
        durationMs: e.durationMs == null ? null : Math.round(e.durationMs),
        ok: e.ok ?? true,
        targetId: e.targetId ?? null,
      },
    })
    .catch(() => {});
}
