"use client";

import { Check } from "lucide-react";
import { STUCK_AFTER_DAYS } from "@/lib/crm/results";
import type { StageStep } from "@/lib/crm/history";
import { REJECT_REASON_LABELS, type RejectReason } from "@/lib/crm/stages";
import { fmtDate, stageLabel } from "./ui";

const dayText = (d: number | null, now: boolean) =>
  d == null ? "" : `${d} ${d === 1 ? "day" : "days"}${now ? " so far" : ""}`;

/** Vertical stepper for the quick view. */
export function VerticalStepper({ steps, rejected }: { steps: StageStep[]; rejected: { at: string | null; reason: string | null } | null }) {
  // A rejected candidate's unreached stages add nothing; stop at where they left.
  const shown = rejected ? steps.filter((s) => s.state !== "todo") : steps;
  return (
    <ol className="flex flex-col" aria-label="Workflow">
      {shown.map((s, i) => {
        const last = i === shown.length - 1 && !rejected;
        const stuck = s.state === "now" && (s.days ?? 0) >= STUCK_AFTER_DAYS;
        return (
          <li key={s.stage} className="relative flex gap-3 pb-3.5 last:pb-0">
            {!last && (
              <span aria-hidden className={`absolute left-[9px] top-[22px] bottom-0 w-0.5 ${s.state === "done" ? "bg-secondary" : "bg-border"}`} />
            )}
            <StepDot state={s.state} />
            <div className="flex justify-between gap-2 flex-1 text-[13px] min-w-0">
              <span className={s.state === "todo" ? "text-subtle" : s.state === "now" ? "text-fg font-semibold" : "text-fg"}>
                {stageLabel(s.stage)}
                {s.state === "now" && s.days != null && (
                  <span className={`font-normal ${stuck ? "text-warning" : "text-subtle"}`}> · {dayText(s.days, false)}</span>
                )}
              </span>
              <span className="text-subtle whitespace-nowrap">{fmtDate(s.enteredAt)}</span>
            </div>
          </li>
        );
      })}
      {rejected && (
        <li className="relative flex gap-3">
          <span aria-hidden className="w-5 h-5 rounded-full bg-danger/20 border-2 border-danger shrink-0" />
          <div className="flex justify-between gap-2 flex-1 text-[13px]">
            <span className="text-danger font-semibold">
              Rejected
              {rejected.reason && <span className="font-normal text-muted"> · {REJECT_REASON_LABELS[rejected.reason as RejectReason] ?? rejected.reason}</span>}
            </span>
            <span className="text-subtle">{fmtDate(rejected.at)}</span>
          </div>
        </li>
      )}
    </ol>
  );
}

function StepDot({ state }: { state: StageStep["state"] }) {
  if (state === "done")
    return (
      <span aria-hidden className="w-5 h-5 rounded-full bg-secondary text-bg flex items-center justify-center shrink-0 relative">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  if (state === "now") return <span aria-hidden className="w-5 h-5 rounded-full border-2 border-secondary bg-bg shrink-0 relative" />;
  return <span aria-hidden className="w-5 h-5 rounded-full border-2 border-border-strong bg-bg shrink-0 relative" />;
}

/** Horizontal stepper for the profile header card. */
export function HorizontalStepper({
  steps,
  rejected,
}: {
  steps: StageStep[];
  rejected: { at: string | null; reason: string | null } | null;
}) {
  return (
    <ol aria-label="Workflow" className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-4">
      {steps.map((s) => {
        const stuck = s.state === "now" && (s.days ?? 0) >= STUCK_AFTER_DAYS;
        return (
          <li key={s.stage} className="flex flex-col gap-2 min-w-0" aria-current={s.state === "now" ? "step" : undefined}>
            <div
              className={`h-1.5 rounded-full ${
                s.state === "done" ? "bg-secondary" : s.state === "now" ? "bg-gradient-to-r from-secondary from-50% to-elevated to-50%" : "bg-elevated"
              }`}
            />
            <div className={`flex items-center gap-1.5 text-[13px] ${s.state === "now" ? "font-semibold text-fg" : s.state === "done" ? "font-medium text-fg" : "text-subtle"}`}>
              {s.state === "done" && <Check className="w-3.5 h-3.5 text-secondary-soft" strokeWidth={2.5} aria-hidden />}
              {stageLabel(s.stage)}
            </div>
            <div className={`text-xs ${stuck ? "text-warning" : "text-subtle"}`}>
              {s.enteredAt ? `${fmtDate(s.enteredAt)} · ${dayText(s.days, s.state === "now")}` : s.state === "done" ? "Done" : "Not reached"}
            </div>
          </li>
        );
      })}
      {rejected && (
        <li className="col-span-3 sm:col-span-6 flex items-center gap-2 text-[13px] text-danger">
          <span aria-hidden className="w-2 h-2 rounded-[2px] bg-danger" />
          Rejected {fmtDate(rejected.at)}
          {rejected.reason && <span className="text-muted">· {REJECT_REASON_LABELS[rejected.reason as RejectReason] ?? rejected.reason}</span>}
        </li>
      )}
    </ol>
  );
}
