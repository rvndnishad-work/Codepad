"use client";

/**
 * Wizard step "Round": which round of each person's interview plan this
 * interview is. We suggest each person's next open live round (one matching
 * the chosen format first); the recruiter can pick another or leave it out
 * of the plan. Someone with no plan (and no batch plan) can be given one
 * here. AI interviews and take-homes are sent, not booked, so they are not
 * offered here.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatLabel, type RoundState } from "@/lib/interview/rounds";
import type { WizardState } from "@/lib/interview/wizard";
import { Avatar, inputCls } from "../../candidates/_components/ui";
import { RoundTile } from "../../candidates/_components/PlanEditor";
import { candidateRoundChoicesAction, pickCandidatePlanAction, type NoPlan, type PlanOption, type RoundChoice } from "../actions";
import { StepHeading } from "./parts";

type Patch = (p: Partial<WizardState>) => void;

/** States a live round can be booked again from. */
const BOOKABLE: RoundState[] = ["not_started", "did_not_finish"];

export function RoundStep({ slug, state, patch }: { slug: string; state: WizardState; patch: Patch }) {
  const ids = state.noCandidate ? [] : state.candidates.flatMap((c) => (c.id ? [c.id] : []));
  const key = ids.join(",");
  const [choices, setChoices] = useState<Record<string, RoundChoice> | null>(null);
  const [noPlan, setNoPlan] = useState<Record<string, NoPlan>>({});
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!key) {
      setChoices({});
      return;
    }
    if (!reload) setChoices(null);
    candidateRoundChoicesAction(slug, key.split(","), state.format).then((res) => {
      if (!live) return;
      if (!res.ok) {
        setError(res.error);
        setChoices({});
        return;
      }
      setChoices(res.choices);
      setNoPlan(res.noPlan);
      setPlans(res.plans);
    });
    return () => {
      live = false;
    };
  }, [slug, key, state.format, reload]);

  // Gives one person a plan, then loads their new rounds so the suggestion fills in.
  const pickPlan = async (candidateId: string, planId: string) => {
    if (!planId) return;
    setPicking(candidateId);
    setError(null);
    const res = await pickCandidatePlanAction(slug, candidateId, planId);
    setPicking(null);
    if (!res.ok) return setError(res.error);
    const roundIds = { ...(state.roundIds ?? {}) };
    const roundNames = { ...(state.roundNames ?? {}) };
    delete roundIds[candidateId];
    delete roundNames[candidateId];
    patch({ roundIds, roundNames });
    setReload((n) => n + 1);
  };

  // Fill in the suggestion for anyone not chosen yet.
  useEffect(() => {
    if (!choices) return;
    const current = state.roundIds ?? {};
    const next = { ...current };
    const names = { ...(state.roundNames ?? {}) };
    let changed = false;
    for (const id of ids) {
      // A round picked before (or passed in the link) that is no longer on their plan falls back to the suggestion.
      if (id in next && (next[id] === "" || choices[id]?.options.some((o) => o.id === next[id]))) {
        if (!(id in names)) {
          names[id] = choices[id]?.options.find((o) => o.id === next[id])?.name ?? "";
          changed = true;
        }
        continue;
      }
      next[id] = choices[id]?.suggested ?? "";
      names[id] = choices[id]?.options.find((o) => o.id === next[id])?.name ?? "";
      changed = true;
    }
    if (changed) patch({ roundIds: next, roundNames: names });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices]);

  const withPlan = ids.filter((id) => (choices?.[id]?.options.length ?? 0) > 0);
  const newPeople = state.noCandidate ? 0 : state.candidates.filter((c) => !c.id).length;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Which round is this?"
        lead="We picked each person's next open live round from their interview plan. AI interviews and take-homes are sent from the candidate, not booked here."
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {choices === null ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading their rounds
        </p>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border">
          {state.noCandidate && <li className="px-4 py-4 text-sm text-muted">You are sharing an open link, so there is no candidate plan to pick from. You can skip this step.</li>}
          {!state.noCandidate &&
            state.candidates.map((c) => {
              if (!c.id) {
                return (
                  <li key={`new:${c.email || c.name}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                    <Avatar name={c.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg truncate">{c.name}</div>
                      <div className="text-xs text-muted">New candidate, no plan yet</div>
                    </div>
                  </li>
                );
              }
              const choice = choices[c.id];
              const value = state.roundIds?.[c.id] ?? choice?.suggested ?? "";
              const picked = choice?.options.find((o) => o.id === value);
              const mismatch = picked && picked.format && state.format && picked.format !== state.format;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1 basis-[220px]">
                    <Avatar name={c.name} size={32} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg truncate">{c.name}</div>
                      <div className="text-xs text-muted truncate">
                        {choice && choice.options.length ? `${choice.planName ?? "Their rounds"} · ${choice.done} of ${choice.total} done` : "No interview plan yet"}
                      </div>
                    </div>
                  </div>
                  {!(choice && choice.options.length > 0) && noPlan[c.id]?.canPick && (
                    <div className="flex flex-col gap-1 min-w-0 w-full sm:w-[300px]">
                      <label className="sr-only" htmlFor={`plan-${c.id}`}>
                        Interview plan for {c.name}
                      </label>
                      {plans.length ? (
                        <div className="flex items-center gap-2">
                          {picking === c.id ? <Loader2 className="w-4 h-4 animate-spin text-muted shrink-0" aria-hidden /> : <span className="w-4 shrink-0" />}
                          <select id={`plan-${c.id}`} value="" disabled={picking !== null} onChange={(e) => pickPlan(c.id!, e.target.value)} className={`${inputCls} min-w-0`}>
                            <option value="">Give them a plan…</option>
                            {plans.map((p) => (
                              <option key={p.id} value={p.id} disabled={p.live === 0}>
                                {p.name} ({p.total} {p.total === 1 ? "round" : "rounds"}
                                {p.live === 0 ? ", no live interview" : ""}
                                {p.isDefault ? ", default" : ""})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">No plans yet. Make one on a batch&rsquo;s Rounds tab or in Settings.</span>
                      )}
                    </div>
                  )}
                  {!(choice && choice.options.length > 0) && (() => {
                    const np = noPlan[c.id];
                    return np && !np.canPick ? <span className="text-xs text-muted w-full sm:w-[300px]">{np.reason}</span> : null;
                  })()}
                  {choice && choice.options.length > 0 && (
                    <div className="flex flex-col gap-1 min-w-0 w-full sm:w-[300px]">
                      <label className="sr-only" htmlFor={`round-${c.id}`}>
                        Round for {c.name}
                      </label>
                      <div className="flex items-center gap-2">
                        {picked ? <RoundTile kind="interview" format={picked.format} size={28} /> : <span className="w-7 h-7 shrink-0" />}
                        <select
                          id={`round-${c.id}`}
                          value={value}
                          onChange={(e) =>
                            patch({
                              roundIds: { ...(state.roundIds ?? {}), [c.id!]: e.target.value },
                              roundNames: { ...(state.roundNames ?? {}), [c.id!]: choice.options.find((o) => o.id === e.target.value)?.name ?? "" },
                            })
                          }
                          className={`${inputCls} min-w-0`}
                        >
                          <option value="">Not part of their plan</option>
                          {choice.options.map((o) => (
                            <option key={o.id} value={o.id} disabled={!BOOKABLE.includes(o.state as RoundState) && o.id !== value}>
                              {o.number ? `${o.number} · ` : ""}
                              {o.name}
                              {o.state === "not_started" ? "" : ` (${o.stateLabel.toLowerCase()})`}
                            </option>
                          ))}
                        </select>
                      </div>
                      {mismatch && (
                        <span className="text-xs text-warning">
                          This round is set up as a {formatLabel(picked.format, "technical").toLowerCase()}, not the format you picked.
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      )}
      {choices !== null && !state.noCandidate && withPlan.length === 0 && (
        <p className="text-[13px] text-muted">
          {newPeople && newPeople === state.candidates.length
            ? "New people have no plan yet. Add them to a batch with a plan to track their rounds."
            : "None of these people have an interview plan yet. Give them one above, or carry on and this interview will not count as a round."}
        </p>
      )}
    </div>
  );
}
