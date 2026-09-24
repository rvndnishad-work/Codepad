"use client";

import { AlertCircle, Check, Clock, X } from "lucide-react";
import { RESULT_KIND_LABELS, passCheckFromItems, type CheckItem, type CheckState } from "@/lib/crm/results";
import { REJECT_REASON_LABELS, normalizeStage, type RejectReason } from "@/lib/crm/stages";
import { fmtDate } from "./ui";

export type Decision = { stage: string; at: string | null; reason: string | null; by?: string | null };

const STATE_TEXT: Record<CheckState, string> = {
  todo: "text-subtle",
  waiting: "text-muted",
  review: "text-warning",
  done: "text-fg",
  expired: "text-danger",
};

function CheckDot({ state }: { state: CheckState }) {
  if (state === "done")
    return (
      <span aria-hidden className="w-5 h-5 rounded-full bg-secondary text-bg flex items-center justify-center shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  if (state === "review")
    return (
      <span aria-hidden className="w-5 h-5 rounded-full bg-warning/20 text-warning flex items-center justify-center shrink-0">
        <AlertCircle className="w-3.5 h-3.5" />
      </span>
    );
  if (state === "waiting")
    return (
      <span aria-hidden className="w-5 h-5 rounded-full border-2 border-secondary text-secondary-soft flex items-center justify-center shrink-0">
        <Clock className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    );
  if (state === "expired")
    return (
      <span aria-hidden className="w-5 h-5 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0">
        <X className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  return <span aria-hidden className="w-5 h-5 rounded-full border-2 border-dashed border-border-strong shrink-0" />;
}

type DecisionView = { label: string; tone: string; detail: string | null; override: string | null };

/**
 * A pass the results do not back (a best result below the bar, or nothing
 * scored) can only be a recruiter's manual override, since automation never
 * passes anyone. It is labelled as one, with the reason, so it never reads
 * as a clean pass.
 */
function decisionText(d: Decision, items: CheckItem[]): DecisionView {
  const stage = normalizeStage(d.stage);
  const by = d.by ? `by ${d.by}` : null;
  if (stage === "PASSED") {
    const check = passCheckFromItems(items);
    const when = fmtDate(d.at) || null;
    if (check.override) {
      return { label: "Passed", tone: "text-warning", detail: [by && `By ${d.by}`, when].filter(Boolean).join(" · ") || null, override: check.reason };
    }
    return { label: "Passed", tone: "text-success", detail: [by && `By ${d.by}`, when].filter(Boolean).join(" · ") || null, override: null };
  }
  if (stage === "REJECTED") {
    const reason = d.reason ? (REJECT_REASON_LABELS[d.reason as RejectReason] ?? d.reason) : null;
    return { label: "Not passed", tone: "text-danger", detail: [reason, by, fmtDate(d.at)].filter(Boolean).join(" · ") || null, override: null };
  }
  return { label: "No decision yet", tone: "text-subtle", detail: null, override: null };
}

/** The three screening steps in any order, then the decision. Quick view. */
export function ChecklistList({ items, decision }: { items: CheckItem[]; decision: Decision }) {
  const d = decisionText(decision, items);
  return (
    <ul className="flex flex-col gap-3" aria-label="Screening">
      {items.map((it) => (
        <li key={it.kind} className="flex items-start gap-3 text-[13px]">
          <CheckDot state={it.state} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <span className={it.state === "todo" ? "text-muted" : "text-fg font-medium"}>{RESULT_KIND_LABELS[it.kind]}</span>
              {it.value != null && <span className="font-semibold text-fg tabular-nums">{it.value}</span>}
            </div>
            <div className={`truncate ${STATE_TEXT[it.state]}`}>
              {it.state === "done" ? <span className={it.passed === false ? "text-warning" : "text-muted"}>{it.status}</span> : it.status}
              {it.title && <span className="text-subtle"> · {it.title}</span>}
            </div>
          </div>
        </li>
      ))}
      <li className="flex items-start gap-3 text-[13px] pt-3 border-t border-border">
        <span
          aria-hidden
          className={`w-5 h-5 rounded-full shrink-0 border-2 ${
            d.override ? "bg-warning/20 border-warning" : d.label === "Passed" ? "bg-success border-success" : d.label === "Not passed" ? "bg-danger/20 border-danger" : "border-border-strong"
          }`}
        />
        <div className="flex-1 min-w-0">
          <span className={`font-medium ${d.tone}`}>{d.label}</span>
          {d.override && <span className="text-warning"> · Manual override</span>}
          {d.detail && <span className="text-subtle"> · {d.detail}</span>}
          {d.override && <div className="text-warning">Results do not back it: {d.override}</div>}
        </div>
      </li>
    </ul>
  );
}

/** Four cards across the profile: AI interview, take-home, interview, decision. */
export function ChecklistRow({ items, decision }: { items: CheckItem[]; decision: Decision }) {
  const d = decisionText(decision, items);
  return (
    <ol aria-label="Screening" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => {
        const body = (
          <>
            <div className="flex items-center gap-2">
              <CheckDot state={it.state} />
              <span className="text-[13px] text-muted">{RESULT_KIND_LABELS[it.kind]}</span>
              {it.count > 1 && <span className="text-xs text-subtle">· {it.count} sent</span>}
            </div>
            <div className={`mt-2 text-sm font-medium truncate ${it.state === "done" ? "text-fg" : STATE_TEXT[it.state]}`}>
              {it.value != null ? (
                <>
                  <span className="text-[22px] font-semibold tabular-nums mr-1.5">{it.value}</span>
                  <span className={`text-[13px] font-normal ${it.passed === false ? "text-warning" : "text-muted"}`}>{it.status}</span>
                </>
              ) : (
                it.status
              )}
            </div>
            <div className="text-xs text-subtle truncate mt-0.5">{it.title ?? " "}</div>
          </>
        );
        return (
          <li key={it.kind} className="min-w-0">
            {it.href ? (
              <a href={it.href} className="block h-full rounded-xl border border-border bg-bg/40 px-3.5 py-3 hover:border-border-strong transition">
                {body}
              </a>
            ) : (
              <div className="h-full rounded-xl border border-dashed border-border px-3.5 py-3">{body}</div>
            )}
          </li>
        );
      })}
      <li
        className={`min-w-0 rounded-xl border px-3.5 py-3 ${
          d.override
            ? "border-warning/40 bg-warning/10"
            : d.label === "Passed"
              ? "border-success/40 bg-success/10"
              : d.label === "Not passed"
                ? "border-danger/40 bg-danger/10"
                : "border-border bg-bg/40"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-muted">Decision</span>
          {d.override && <span className="text-xs font-medium text-warning rounded-md bg-warning/15 px-1.5 leading-5">Manual override</span>}
        </div>
        <div className={`mt-2 text-sm font-semibold ${d.tone === "text-subtle" ? "text-fg" : d.tone}`}>{d.label}</div>
        <div className="text-xs text-subtle truncate mt-0.5" title={d.override ? `Results do not back it: ${d.override}` : undefined}>
          {d.detail ?? "Decide once the results are in"}
        </div>
      </li>
    </ol>
  );
}
