"use client";

/**
 * One interviewer's scorecard: rate each criterion from 1 to 4 with a note,
 * write the evidence, pick a recommendation, then submit. Drafts save as you
 * go. A submitted card is locked; changing it needs a reason and is kept in
 * the history. Used by workspace members and by emailed guest interviewers
 * (the page passes their `?guest=` query through to the API).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Lock, PencilLine } from "lucide-react";
import type { MyScorecard } from "@/lib/interview/scorecard-server";
import {
  fmtScore,
  MAX_EVIDENCE,
  MAX_NOTE,
  MAX_REASON,
  MIN_REASON,
  RECOMMENDATIONS,
  SCORE_LABELS,
  SCORE_MAX,
  SCORE_MIN,
  submitIssues,
  type Ratings,
  type Recommendation,
} from "@/lib/interview/scorecard";

type Mode = "edit" | "locked" | "amend";
type SaveState = "idle" | "saving" | "saved" | "error";

const REC_ON: Record<Recommendation, string> = {
  no: "border-danger bg-danger/10 text-danger",
  unsure: "border-warning bg-warning/10 text-warning",
  yes: "border-success bg-success/10 text-success",
};

const STATE_TEXT = {
  not_started: { label: "Not started", cls: "text-subtle" },
  draft: { label: "Draft", cls: "text-warning" },
  submitted: { label: "Submitted", cls: "text-success" },
} as const;

function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ScorecardForm({
  initial,
  apiQuery = "",
  backHref,
  reportHref,
}: {
  initial: MyScorecard;
  /** "?guest=..." for emailed interviewers; empty for members. */
  apiQuery?: string;
  backHref: string | null;
  reportHref: string | null;
}) {
  const [data, setData] = useState(initial);
  const [ratings, setRatings] = useState<Ratings>(initial.card?.ratings ?? {});
  const [notes, setNotes] = useState(initial.card?.notes ?? "");
  const [rec, setRec] = useState<Recommendation | null>(initial.card?.recommendation ?? null);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<Mode>(initial.card?.status === "submitted" ? "locked" : "edit");
  const [save, setSave] = useState<SaveState>("idle");
  const [busy, setBusy] = useState<"submit" | "amend" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const dirty = useRef(false);

  const locked = mode === "locked";
  const issues = submitIssues({ criteria: data.criteria, ratings, recommendation: rec });

  async function put(intent: "draft" | "submit" | "amend"): Promise<boolean> {
    try {
      const res = await fetch(`/api/interview/${encodeURIComponent(data.sessionId)}/scorecard${apiQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, ratings, notes, recommendation: rec, ...(intent === "amend" ? { reason } : {}) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "That did not save. Try again.");
        return false;
      }
      setData(j.scorecard as MyScorecard);
      setError(null);
      return true;
    } catch {
      setError("You look offline. Your changes are still here; try again in a moment.");
      return false;
    }
  }

  async function saveDraft() {
    setSave("saving");
    const ok = await put("draft");
    if (ok) dirty.current = false;
    setSave(ok ? "saved" : "error");
  }

  // Drafts save a moment after you stop typing.
  const autosaveKey = JSON.stringify({ ratings, notes, rec });
  useEffect(() => {
    if (mode !== "edit" || !dirty.current) return;
    const t = setTimeout(saveDraft, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveKey, mode]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current && mode !== "locked") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [mode]);

  const touch = () => {
    dirty.current = true;
    if (save === "saved") setSave("idle");
  };

  function setScore(id: string, r: number) {
    touch();
    setRatings((prev) => ({ ...prev, [id]: { r: prev[id]?.r === r ? null : r, n: prev[id]?.n ?? "" } }));
  }

  function setNote(id: string, n: string) {
    touch();
    setRatings((prev) => ({ ...prev, [id]: { r: prev[id]?.r ?? null, n } }));
  }

  async function submit() {
    setShowIssues(true);
    if (issues.length) return;
    setBusy("submit");
    const ok = await put("submit");
    setBusy(null);
    if (ok) {
      dirty.current = false;
      setMode("locked");
    }
  }

  async function amend() {
    setShowIssues(true);
    if (issues.length || reason.trim().length < MIN_REASON) return;
    setBusy("amend");
    const ok = await put("amend");
    setBusy(null);
    if (ok) {
      dirty.current = false;
      setReason("");
      setMode("locked");
    }
  }

  function cancelAmend() {
    setRatings(data.card?.ratings ?? {});
    setNotes(data.card?.notes ?? "");
    setRec(data.card?.recommendation ?? null);
    setReason("");
    setError(null);
    setShowIssues(false);
    dirty.current = false;
    setMode("locked");
  }

  const submittedCount = data.panel.filter((p) => p.state === "submitted").length;

  return (
    <div className="flex flex-col gap-5">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Interviews
        </Link>
      )}

      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <section className="flex-1 min-w-0 w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Your scorecard for {data.candidateName}</h1>
            <p className="text-sm text-muted">
              {data.title}, {data.formatLabel.toLowerCase()}. Score each area from {SCORE_MIN} to {SCORE_MAX} before you see the other interviewers. They cannot see yours until they submit.
            </p>
          </div>

          {locked && (
            <div className="rounded-xl border border-border bg-panel px-4 py-3 flex flex-wrap items-center gap-3">
              <Lock className="w-4 h-4 text-muted" aria-hidden />
              <p className="text-[13px] text-fg flex-1 min-w-[200px]">
                Submitted {fmtWhen(data.card?.submittedAt ?? null)}. It is locked so the panel sees what you scored.
                {data.card?.amendments ? ` Amended ${data.card.amendments} time${data.card.amendments === 1 ? "" : "s"}.` : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("amend");
                  setShowIssues(false);
                }}
                className="h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg inline-flex items-center gap-1.5 hover:bg-panel"
              >
                <PencilLine className="w-3.5 h-3.5 text-muted" aria-hidden />
                Amend
              </button>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col">
            {data.criteria.map((c, i) => {
              const v = ratings[c.id];
              const missing = showIssues && c.kind === "competency" && !v?.r;
              return (
                <div key={c.id} className={`grid md:grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-3.5 ${i ? "border-t border-border" : ""}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[14px] font-semibold text-fg break-words">{c.label}</span>
                    <span className="text-[13px] text-muted">{c.kind === "question" ? `${c.hint ?? "Question"}. Skip it if it did not come up.` : c.hint}</span>
                  </div>
                  <div className="flex flex-col gap-1 md:items-end">
                    <div className="flex gap-1.5" role="group" aria-label={`${c.label} score`}>
                      {Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, k) => SCORE_MIN + k).map((n) => {
                        const on = v?.r === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            disabled={locked}
                            aria-pressed={on}
                            title={SCORE_LABELS[n]}
                            onClick={() => setScore(c.id, n)}
                            className={`w-11 h-9 rounded-lg border text-sm font-medium tabular-nums transition-colors disabled:cursor-default ${
                              on ? "bg-secondary border-secondary text-bg" : `bg-surface text-fg ${missing ? "border-warning" : "border-border"} ${locked ? "opacity-60" : "hover:bg-panel"}`
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs text-subtle h-4">{v?.r ? SCORE_LABELS[v.r] : missing ? "Needs a score" : ""}</span>
                  </div>
                  <input
                    type="text"
                    value={v?.n ?? ""}
                    maxLength={MAX_NOTE}
                    readOnly={locked}
                    onChange={(e) => setNote(c.id, e.target.value)}
                    placeholder={locked ? "" : "Note (optional)"}
                    aria-label={`${c.label} note`}
                    className={`md:col-span-2 h-9 rounded-lg border border-border bg-bg px-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/50 ${locked && !v?.n ? "hidden" : ""}`}
                  />
                </div>
              );
            })}

            <label htmlFor="sc-evidence" className="text-[14px] font-semibold text-fg pt-4 border-t border-border">
              Evidence
            </label>
            <textarea
              id="sc-evidence"
              rows={4}
              value={notes}
              maxLength={MAX_EVIDENCE}
              readOnly={locked}
              onChange={(e) => {
                touch();
                setNotes(e.target.value);
              }}
              placeholder="What did they do or say that led to your scores?"
              className="mt-2 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-subtle resize-y focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-fg flex-1 min-w-[160px]">Your recommendation</span>
              {RECOMMENDATIONS.map((r) => {
                const on = rec === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={locked}
                    aria-pressed={on}
                    onClick={() => {
                      touch();
                      setRec(on ? null : r.id);
                    }}
                    className={`h-9 px-3.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-default ${
                      on ? REC_ON[r.id] : `border-border bg-surface text-fg ${showIssues && !rec ? "border-warning" : ""} ${locked ? "opacity-60" : "hover:bg-panel"}`
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "amend" && (
            <div className="rounded-xl border border-warning/40 bg-surface px-5 py-4 flex flex-col gap-2">
              <label htmlFor="sc-reason" className="text-[14px] font-semibold text-fg">
                Why are you changing a submitted scorecard?
              </label>
              <p className="text-[13px] text-muted">The recruiter and the panel see this reason with the scores before and after.</p>
              <input
                id="sc-reason"
                value={reason}
                maxLength={MAX_REASON}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example: mixed up two candidates"
                className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
              {showIssues && reason.trim().length < MIN_REASON && <p className="text-[13px] text-warning">Add a short reason.</p>}
            </div>
          )}

          {showIssues && issues.length > 0 && !locked && (
            <p role="alert" className="text-[13px] text-warning">
              {issues.join(" ")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}

          {!locked && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {mode === "edit" && (
                <>
                  <span className="text-xs text-subtle mr-auto inline-flex items-center gap-1" role="status">
                    {save === "saving" && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
                    {save === "saved" && <Check className="w-3 h-3" aria-hidden />}
                    {save === "saving" ? "Saving draft" : save === "saved" ? "Draft saved" : save === "error" ? "Draft not saved" : data.card ? "Draft" : ""}
                  </span>
                  <button type="button" onClick={saveDraft} className="h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel">
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy != null}
                    className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 disabled:opacity-60"
                  >
                    {busy === "submit" && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                    Submit scorecard
                  </button>
                </>
              )}
              {mode === "amend" && (
                <>
                  <button type="button" onClick={cancelAmend} className="h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={amend}
                    disabled={busy != null}
                    className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 disabled:opacity-60"
                  >
                    {busy === "amend" && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                    Save amendment
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3.5">
          <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col">
            <span className="text-[13px] font-semibold text-muted pb-1">Panel</span>
            {data.panel.map((p, i) => (
              <div key={p.key} className={`flex justify-between gap-3 py-2 text-sm ${i ? "border-t border-border" : ""}`}>
                <span className="truncate text-fg">
                  {p.name}
                  {p.you ? " (you)" : ""}
                </span>
                <span className={`shrink-0 ${STATE_TEXT[p.state].cls}`}>{STATE_TEXT[p.state].label}</span>
              </div>
            ))}
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {submittedCount === data.panel.length
                ? "Everyone has submitted. The recruiter sees the average against the interview pass mark and makes the call."
                : `When all ${data.panel.length} are in, the recruiter sees the average against the interview pass mark and makes the call.`}
            </p>
            {reportHref && locked && (
              <Link href={reportHref} className="mt-2 text-[13px] text-secondary-soft hover:underline underline-offset-4 w-fit">
                See the panel on the report
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-muted">Pass mark for this interview</span>
            <span className="text-[22px] font-semibold tabular-nums text-fg">
              {fmtScore(data.passMark)} of {SCORE_MAX}
            </span>
            <span className="text-[13px] text-muted">Set on the interview report. It only labels the panel average; the recruiter decides who passes.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
