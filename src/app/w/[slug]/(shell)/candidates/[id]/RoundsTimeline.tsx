"use client";

/**
 * The candidate's interview rounds as a timeline at the top of their
 * profile: one card per round with when it happened, the panel or invite,
 * and the score against the round's pass mark. The round they are on
 * carries its action (schedule, send, open the lobby, or move on / stop),
 * and the last card is the screening decision, which stays with the
 * recruiter. Skip, bring back, add and remove a round for this person live
 * here too. The Plan card beside it sums up where they stand.
 */
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CircleCheck, CircleStop, DoorOpen, Loader2, Plus, RotateCcw, Scale, Send } from "lucide-react";
import { formatLabel, formatsFor, inSentence, kindName, ROLE_TYPE_LABELS, ROUND_NAME_MAX, type PlanRoundKind, type RoleType } from "@/lib/interview/rounds";
import { currentRound, liveRounds, stoppedRound, stripItems, thenLabel, waitingKey, type RoundsSummary, type RoundView } from "@/lib/interview/rounds-view";
import { Btn, fmtDate, fmtWhen, inputCls, Menu, MenuItem } from "../_components/ui";
import { RoundTile } from "../_components/PlanEditor";
import { RoundStrip } from "../_components/RoundStrip";
import { RoundStatePill } from "../_components/RoundsCell";
import { addRoundAction, removeRoundAction, setRoundNextStepAction, sendRoundAction, setRoundSkippedAction } from "../plan-actions";

type Toast = (text: string, tone?: "ok" | "error") => void;

const AUTOMATED: PlanRoundKind[] = ["ai_interview", "take_home"];

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Sent 21 Sept · finished 22 Sept" or "24 Sept · 30 min", the line under a round's name. */
function metaLine(r: RoundView): string {
  const bits: (string | null)[] = [];
  if (r.skipped) return "Skipped for this person";
  if (r.state === "stopped") return "Not held, stopped at an earlier round";
  if (r.kind === "interview") {
    if (r.result) bits.push(fmtDate(r.result.at));
    else if (r.pending?.at) bits.push(fmtWhen(r.pending.at));
    if (r.durationMin) bits.push(`${r.durationMin} min`);
    if (!r.result && !r.pending) bits.push("not booked yet");
    if (r.state === "in_progress") bits.push("in the room now");
  } else {
    if (r.pending?.at) bits.push(`${r.state === "in_progress" ? "Started" : "Sent"} ${fmtDate(r.pending.at)}`);
    if (r.pending?.due && r.state === "scheduled") bits.push(`expires ${fmtDate(r.pending.due)}`);
    if (r.state === "did_not_finish") bits.push("the invite ran out before they finished");
    else if (r.result?.at) bits.push(`${r.kind === "take_home" ? "submitted" : "finished"} ${fmtDate(r.result.at)}`);
    if (!r.result && !r.pending) bits.push(r.sends ? `not sent yet · sends ${r.sends}` : "not sent yet");
  }
  const text = bits.filter(Boolean).join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The score against the pass mark: a bar with a tick where the bar is. */
function ScoreLine({ r }: { r: RoundView }) {
  const res = r.result;
  if (!res || res.frac == null) return null;
  const fill = r.state === "above_bar" ? "bg-success" : r.state === "below_bar" ? "bg-danger" : "bg-warning";
  const note = r.nextStep === "advance" ? (r.decidedBy ? `moved on by ${r.decidedBy}` : "moved on") : r.nextStep === "stop" ? (r.decidedBy ? `stopped by ${r.decidedBy}` : "stopped here") : null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
      <span className="relative block h-1.5 w-[140px] rounded-full bg-panel" aria-hidden>
        <span className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${Math.max(2, Math.min(100, res.frac * 100))}%` }} />
        {res.bar != null && <span className="absolute -top-[3px] h-3 w-[2px] rounded-full bg-fg/70" style={{ left: `calc(${Math.min(100, res.bar * 100)}% - 1px)` }} />}
      </span>
      <span className="text-[13px] font-semibold tabular-nums text-fg">{res.score}</span>
      <span className="text-xs text-subtle">{[res.barText, note].filter(Boolean).join(" · ")}</span>
    </div>
  );
}

export default function RoundsTimeline({
  slug,
  candidateId,
  name,
  stage,
  rounds,
  planName,
  roleType,
  canEdit,
  canPipeline,
  closed,
  busy,
  onPass,
  onReject,
  toast,
}: {
  slug: string;
  candidateId: string;
  name: string;
  stage: string;
  rounds: RoundsSummary | null;
  planName: string | null;
  roleType: RoleType;
  canEdit: boolean;
  canPipeline: boolean;
  /** Passed, Not passed or archived: no round actions. */
  closed: boolean;
  busy: boolean;
  onPass: () => void;
  /** Opens Not passed; after Stop here, with the round named in the note. */
  onReject: (stoppedAfter?: string) => void;
  toast: Toast;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const list = rounds?.rounds ?? [];
  const cur = rounds ? currentRound(rounds) : null;
  const first = firstName(name);
  const firstLive = list.findIndex((r) => r.kind === "interview");
  const showDivider = firstLive > 0 && list.slice(0, firstLive).some((r) => AUTOMATED.includes(r.kind));

  function run(p: Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    start(async () => {
      const res = await p;
      if (!res.ok) return toast(res.error ?? "Something went wrong.", "error");
      toast(done);
      after?.();
      router.refresh();
    });
  }

  const wizard = (r: RoundView) => `/w/${slug}/interviews/new?candidateId=${candidateId}&rounds=${candidateId}:${r.id}${r.format ? `&format=${r.format}` : ""}`;
  const sendHref = (r: RoundView) => (r.kind === "ai_interview" ? `/w/${slug}/ai-interviews/new?candidates=${candidateId}` : `/w/${slug}/take-homes/new?candidates=${candidateId}`);

  /** The buttons under the round the candidate is on. */
  function actions(r: RoundView): ReactNode {
    if (closed) return null;
    const hasNext = liveRounds(rounds!).some((x) => (x.number ?? 0) > (r.number ?? 0));
    const stepButtons = canPipeline && (
      <>
        {hasNext && (
          <Btn variant="primary" icon={ArrowRight} disabled={pending} onClick={() => run(setRoundNextStepAction(slug, r.id, "advance"), `${first} moves on.`)}>
            Move to next round
          </Btn>
        )}
        <Btn
          icon={CircleStop}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setRoundNextStepAction(slug, r.id, "stop");
              if (!res.ok) return toast(res.error, "error");
              router.refresh();
              onReject(r.name);
            })
          }
        >
          Stop here
        </Btn>
      </>
    );
    switch (r.state) {
      case "not_started":
        return (
          <>
            {r.kind === "interview" ? (
              <Btn variant="primary" icon={CalendarDays} href={wizard(r)}>
                Schedule
              </Btn>
            ) : r.sends && canPipeline ? (
              <Btn
                variant="primary"
                icon={Send}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await sendRoundAction(slug, r.id);
                    if (!res.ok) return toast(res.error, "error");
                    toast(
                      res.reused
                        ? `${first} already had ${r.sends}, now linked to ${r.name}.`
                        : res.emailed
                          ? `${r.name} sent to ${first}.`
                          : `${r.name} is ready for ${first}, but the email did not go out.`,
                      res.emailed || res.reused ? undefined : "error",
                    );
                    router.refresh();
                  })
                }
              >
                Send {inSentence(kindName(r.kind, roleType))}
              </Btn>
            ) : (
              <Btn variant="primary" icon={Send} href={sendHref(r)}>
                Send {inSentence(kindName(r.kind, roleType))}
              </Btn>
            )}
            {canEdit && !r.held && (
              <Btn disabled={pending} onClick={() => run(setRoundSkippedAction(slug, r.id, true), `${r.name} skipped for ${first}.`)}>
                Skip for {first}
              </Btn>
            )}
          </>
        );
      case "scheduled":
      case "in_progress":
        if (r.pending?.lobbyHref) {
          return (
            <Btn variant="primary" icon={DoorOpen} href={r.pending.lobbyHref}>
              Open lobby
            </Btn>
          );
        }
        return r.pending?.href ? <Btn href={r.pending.href}>Open</Btn> : null;
      case "awaiting_review":
        return r.result?.href ? <Btn href={r.result.href}>Open report</Btn> : null;
      case "did_not_finish":
        return (
          <>
            {r.kind === "interview" && (
              <Btn icon={RotateCcw} href={wizard(r)}>
                Rebook
              </Btn>
            )}
            {stepButtons}
          </>
        );
      case "above_bar":
      case "below_bar":
        return waitingKey(rounds) === "next_step" ? stepButtons : null;
      default:
        return null;
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="rounds-title">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 id="rounds-title" className="text-[15px] font-semibold text-fg min-w-0">
          Interview rounds
          <span className="font-normal text-muted">
            {" · "}
            {planName ?? (list.length ? "Not from a plan" : "No plan yet")}
          </span>
        </h2>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 h-9 pl-1.5 pr-3.5 rounded-lg border border-secondary/45 bg-secondary/15 text-[13px] font-semibold text-secondary transition hover:bg-secondary/25 hover:border-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
          >
            <span className="w-6 h-6 rounded-md bg-secondary text-secondary-ink flex items-center justify-center" aria-hidden>
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
            Add a round
          </button>
        )}
      </div>

      {rounds && rounds.total > 0 && (
        <div className="px-5 pb-4">
          <RoundStrip items={stripItems(rounds)} then={thenLabel(rounds)} size="full" />
        </div>
      )}

      {!list.length && !adding && <p className="px-5 pb-5 text-[13px] text-muted">Give their batch a plan on its Rounds tab, or add a round for {first} here.</p>}

      {list.length > 0 && (
        <ol className="px-5 pb-5 flex flex-col">
          {list.map((r, i) => {
            const here = r.id === cur?.id && !closed;
            const later = !r.skipped && !r.result && !r.pending && !here && r.state !== "stopped";
            const act = here ? actions(r) : null;
            return (
              <li key={r.id} className="flex flex-col">
                {showDivider && i === firstLive && (
                  <div className="flex items-center gap-3 ml-12 mb-3 text-[11px] font-medium uppercase tracking-wider text-subtle">
                    Live interviews
                    <span className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span className={r.skipped || r.state === "stopped" ? "opacity-50" : ""}>
                      <RoundTile kind={r.kind} format={r.format} size={34} />
                    </span>
                    <span className="flex-1 w-px bg-border my-1" aria-hidden />
                  </div>
                  <div
                    className={`flex-1 min-w-0 mb-3 rounded-xl border px-4 py-3 ${
                      here ? "border-secondary/70 bg-secondary/[0.04]" : later ? "border-dashed border-border-strong" : "border-border"
                    } ${r.skipped || r.state === "stopped" ? "opacity-60" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-semibold text-fg ${r.skipped ? "line-through decoration-subtle" : ""}`}>
                            {r.number ? `${r.number} · ` : ""}
                            {r.name}
                          </h3>
                          {AUTOMATED.includes(r.kind) && <span className="h-5 px-1.5 rounded border border-border text-[11px] leading-[18px] text-subtle">Automated</span>}
                          {!r.required && <span className="h-5 px-1.5 rounded border border-border text-[11px] leading-[18px] text-subtle">Optional</span>}
                          {r.manual && <span className="h-5 px-1.5 rounded border border-border text-[11px] leading-[18px] text-subtle">Added for {first}</span>}
                        </div>
                        <p className="text-xs text-muted mt-1" suppressHydrationWarning>
                          {metaLine(r)}
                          {r.kind === "interview" && r.format && formatLabel(r.format, roleType).toLowerCase() !== r.name.toLowerCase() ? ` · ${formatLabel(r.format, roleType)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {r.skipped ? <span className="text-xs text-subtle">Skipped</span> : <RoundStatePill state={r.state} label={r.stateLabel} />}
                        {canEdit && !closed && !r.held && (!here || r.manual || r.skipped) && (
                          <Menu
                            align="right"
                            width={200}
                            label={`Options for ${r.name}`}
                            trigger={(props) => (
                              <button {...props} type="button" aria-label={`Options for ${r.name}`} className="h-7 px-2 rounded-md text-xs text-muted hover:text-fg hover:bg-panel">
                                Change
                              </button>
                            )}
                          >
                            {(close) => (
                              <>
                                <MenuItem
                                  disabled={pending}
                                  onClick={() => {
                                    close();
                                    run(setRoundSkippedAction(slug, r.id, !r.skipped), r.skipped ? `${r.name} is back.` : `${r.name} skipped for ${first}.`);
                                  }}
                                >
                                  {r.skipped ? "Bring back" : `Skip for ${first}`}
                                </MenuItem>
                                {r.manual && (
                                  <MenuItem
                                    danger
                                    disabled={pending}
                                    onClick={() => {
                                      close();
                                      run(removeRoundAction(slug, r.id), `${r.name} removed.`);
                                    }}
                                  >
                                    Remove round
                                  </MenuItem>
                                )}
                              </>
                            )}
                          </Menu>
                        )}
                      </div>
                    </div>
                    {(r.result?.frac != null || r.result?.href) && (
                      <div className="flex items-end justify-between gap-3">
                        <ScoreLine r={r} />
                        {r.result?.href && r.state !== "awaiting_review" && (
                          <a href={r.result.href} className="text-[13px] text-muted hover:text-fg hover:underline underline-offset-4 shrink-0">
                            Report
                          </a>
                        )}
                      </div>
                    )}
                    {act && <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">{act}</div>}
                  </div>
                </div>
              </li>
            );
          })}
          {thenLabel(rounds) && <HandOffNote ats={thenLabel(rounds)!} connected={!!rounds!.atsName} first={first} />}
          <DecisionCard
            rounds={rounds!}
            stage={stage}
            canPipeline={canPipeline}
            closed={closed}
            busy={busy || pending}
            onPass={onPass}
            onReject={() => onReject()}
          />
        </ol>
      )}

      {adding && <AddRoundForm slug={slug} candidateId={candidateId} roleType={roleType} pending={pending} run={run} onClose={() => setAdding(false)} />}
    </section>
  );
}

/** The plan ends here: later rounds happen in the company ATS and are not tracked. */
function HandOffNote({ ats, connected, first }: { ats: string; connected: boolean; first: string }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center shrink-0 w-[34px]">
        <span className="w-[34px] h-[34px] rounded-lg border border-dashed border-border-strong text-subtle flex items-center justify-center" aria-hidden>
          <ArrowRight className="w-4 h-4" strokeWidth={1.9} />
        </span>
        <span className="flex-1 w-px bg-border my-1" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 mb-3 rounded-xl border border-dashed border-border-strong px-4 py-3">
        <h3 className="text-sm font-semibold text-fg">Then {ats}</h3>
        <p className="text-xs text-muted mt-1">
          Later rounds happen in {ats} and are not tracked here.{" "}
          {connected ? `Passing ${first} hands them over to ${ats} with these round results.` : `Passing ${first} ends their screening here.`}
        </p>
      </div>
    </li>
  );
}

function DecisionCard({
  rounds,
  stage,
  canPipeline,
  closed,
  busy,
  onPass,
  onReject,
}: {
  rounds: RoundsSummary;
  stage: string;
  canPipeline: boolean;
  closed: boolean;
  busy: boolean;
  onPass: () => void;
  onReject: () => void;
}) {
  const decided = stage === "PASSED" || stage === "REJECTED";
  const stopped = stoppedRound(rounds);
  const last = liveRounds(rounds).at(-1);
  let text: string;
  if (decided) text = stage === "PASSED" ? (rounds.override ? `Passed as a manual pass: ${rounds.override}.` : "Passed. Every required round was above the bar.") : "Not passed.";
  else if (stopped) text = `Stopped after ${stopped.name}. Mark them as not passed to close this, or clear the stop on that round.`;
  else if (rounds.readyForDecision) text = rounds.override ? `All rounds are done. Passing now is a manual pass: ${rounds.override}.` : "All rounds are done and above the bar. Pass them or not.";
  else
    text = `Unlocks when ${last?.number ? `round ${last.number}` : "the last round"} is done. You can still decide now; passing early is marked as a manual pass.`;
  return (
    <li className="flex gap-3">
      <span className="w-[34px] h-[34px] rounded-lg bg-[#6b7280] text-white flex items-center justify-center shrink-0" aria-hidden>
        <Scale className="w-4 h-4" strokeWidth={1.9} />
      </span>
      <div className={`flex-1 min-w-0 rounded-xl border px-4 py-3 ${rounds.readyForDecision || stopped ? "border-secondary/70 bg-secondary/[0.04]" : "border-border bg-panel/40"}`}>
        <h3 className="text-sm font-semibold text-fg">Screening decision</h3>
        <p className="text-xs text-muted mt-1">{text}</p>
        {!closed && !decided && canPipeline && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <Btn variant={rounds.readyForDecision && !rounds.override ? "primary" : "ghost"} icon={CircleCheck} disabled={busy} onClick={onPass}>
              Pass
            </Btn>
            <Btn variant={stopped ? "primary" : "ghost"} disabled={busy} onClick={onReject}>
              Not passed
            </Btn>
          </div>
        )}
      </div>
    </li>
  );
}

function AddRoundForm({
  slug,
  candidateId,
  roleType,
  pending,
  run,
  onClose,
}: {
  slug: string;
  candidateId: string;
  roleType: RoleType;
  pending: boolean;
  run: (p: Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<PlanRoundKind>("interview");
  const [format, setFormat] = useState<string>(roleType === "technical" ? "coding" : "discussion");
  const [name, setName] = useState("");
  const suggested = kind === "interview" ? formatLabel(format, roleType) : kindName(kind, roleType);
  return (
    <form
      className="flex flex-wrap items-end gap-3 px-5 py-4 border-t border-border"
      onSubmit={(e) => {
        e.preventDefault();
        run(addRoundAction(slug, candidateId, { kind, format: kind === "interview" ? format : null, name: name.trim() || suggested }), "Round added for this candidate.", () => {
          onClose();
          setName("");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-subtle">
        Kind
        <select value={kind} onChange={(e) => setKind(e.target.value as PlanRoundKind)} className={`${inputCls} !w-auto`}>
          <option value="interview">Live interview</option>
          <option value="ai_interview">AI interview</option>
          <option value="take_home">{kindName("take_home", roleType)}</option>
        </select>
      </label>
      {kind === "interview" && (
        <label className="flex flex-col gap-1 text-xs text-subtle">
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value)} className={`${inputCls} !w-auto`}>
            {formatsFor(roleType).map((f) => (
              <option key={f} value={f}>
                {formatLabel(f, roleType)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-subtle flex-1 min-w-[180px]">
        Name
        <input value={name} maxLength={ROUND_NAME_MAX} placeholder={suggested} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </label>
      <div className="flex gap-2">
        <Btn variant="quiet" onClick={onClose} disabled={pending}>
          Cancel
        </Btn>
        <Btn variant="primary" type="submit" disabled={pending}>
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
          Add round
        </Btn>
      </div>
    </form>
  );
}

const WAITING_TEXT = (rounds: RoundsSummary, name: string, stage: string): string => {
  const cur = currentRound(rounds);
  const first = firstName(name);
  if (stage === "PASSED") return "Nothing. They are passed.";
  if (stage === "REJECTED") return "Nothing. They are not passed.";
  if (rounds.readyForDecision || rounds.waitingOn === "decision") return "Your final decision: pass or not passed.";
  if (!cur) return "Nothing right now.";
  switch (rounds.waitingOn) {
    case "schedule":
      return cur.kind === "interview" ? `You: book ${cur.name}.` : `You: send the ${cur.name.toLowerCase()}.`;
    case "candidate":
      return `${first}: the ${inSentence(cur.name)} invite is out${cur.pending?.due ? ` until ${fmtDate(cur.pending.due)}` : ""}.`;
    case "interview":
      return cur.pending?.at ? `${cur.name} on ${fmtWhen(cur.pending.at)}. Nothing needed from you until then.` : `${cur.name} is booked.`;
    case "review":
      return cur.kind === "interview" ? `Scorecards for ${cur.name}.` : `A review of the ${cur.name.toLowerCase()}.`;
    case "next_step":
      return `Your next step on ${cur.name}: move on or stop.`;
    default:
      return "Nothing right now.";
  }
};

/** Beside the timeline: the plan, how far along, and what they wait on. */
export function PlanCard({ rounds, name, stage, roleType }: { rounds: RoundsSummary; name: string; stage: string; roleType: RoleType }) {
  const live = liveRounds(rounds);
  const allAbove = live.length > 0 && live.every((r) => r.state === "above_bar");
  const skipped = rounds.rounds.filter((r) => r.skipped).length;
  const added = rounds.rounds.filter((r) => r.manual).length;
  const changed = [skipped ? `${skipped} skipped` : null, added ? `${added} added` : null].filter(Boolean).join(", ");
  return (
    <section className="rounded-xl border border-border bg-surface px-5 py-4" aria-label="Plan">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-subtle">Plan</h2>
      <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-2 mt-3 text-[13px]">
        <dt className="text-muted">Plan</dt>
        <dd className="text-fg">
          {rounds.planName ? `${rounds.planName}, ` : `${ROLE_TYPE_LABELS[roleType]}, `}
          {rounds.total} {rounds.total === 1 ? "round" : "rounds"}
        </dd>
        <dt className="text-muted">Done</dt>
        <dd className="text-fg">
          {rounds.done} of {rounds.total}
          {allAbove ? ", all above bar" : ""}
        </dd>
        <dt className="text-muted">Changed</dt>
        <dd className="text-fg">{changed || `None for ${firstName(name)}`}</dd>
      </dl>
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-subtle mt-5 pt-4 border-t border-border">Waiting on</h2>
      <p className="text-[13px] text-fg mt-2" suppressHydrationWarning>
        {WAITING_TEXT(rounds, name, stage)}
      </p>
    </section>
  );
}
