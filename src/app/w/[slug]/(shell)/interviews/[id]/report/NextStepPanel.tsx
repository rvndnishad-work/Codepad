"use client";

/**
 * "What next?" on the report of an interview that is one of the candidate's
 * rounds: move on to the next round, stop here, or rebook this round. It
 * never passes or rejects the candidate. Stop here leads to the Not passed
 * dialog on the profile with the reason filled in, and the recruiter
 * confirms it there.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleStop, Loader2, RotateCcw, Scale } from "lucide-react";
import { Btn, useToasts } from "../../../candidates/_components/ui";
import { setRoundNextStepAction } from "../../../candidates/plan-actions";
import type { NextStep, RoundState } from "@/lib/interview/rounds";

export type NextStepData = {
  slug: string;
  candidateId: string;
  candidateName: string;
  /** PASSED / REJECTED once the candidate is decided. */
  stage: string;
  roundId: string;
  roundName: string;
  number: number | null;
  total: number;
  state: RoundState;
  stateLabel: string;
  score: string | null;
  decided: NextStep | null;
  decidedBy: string | null;
  next: { name: string; number: number | null } | null;
  /** Where "Rebook this round" and a moved-on "Schedule it" go. */
  rebookHref: string;
  nextHref: string | null;
  /** The next round is already booked or held. */
  nextBooked: boolean;
  profileHref: string;
  canDecide: boolean;
};

type Choice = "advance" | "stop" | "rebook";

const TONE: Partial<Record<RoundState, string>> = { above_bar: "text-success", below_bar: "text-danger", did_not_finish: "text-warning" };

export default function NextStepPanel({ d, id = "next-step" }: { d: NextStepData; id?: string }) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState<Choice | null>(null);
  const decidedStage = d.stage === "PASSED" || d.stage === "REJECTED";
  const where = d.number ? `Round ${d.number} of ${d.total}` : "Extra round";

  function save(step: NextStep | null, then?: () => void, done?: string) {
    start(async () => {
      const res = await setRoundNextStepAction(d.slug, d.roundId, step);
      if (!res.ok) return toast(res.error, "error");
      if (done) toast(done);
      if (then) then();
      else router.refresh();
    });
  }

  function go() {
    if (choice === "rebook") return router.push(d.rebookHref);
    if (choice === "advance") return save("advance", undefined, `${d.candidateName} moves on to ${d.next?.name ?? "the next round"}.`);
    if (choice === "stop") return save("stop", () => router.push(`${d.profileHref}?decide=not_passed&reason=SKILL_GAP&round=${d.roundId}`));
  }

  const options: { id: Choice; icon: typeof ArrowRight; title: string; body: string }[] = [
    ...(d.next
      ? [
          {
            id: "advance" as const,
            icon: ArrowRight,
            title: `Move to ${d.next.name}`,
            body: `${d.next.number ? `Round ${d.next.number} of ${d.total}. ` : ""}${d.nextBooked ? "It is already booked." : "Goes to Next round due so someone books it."}`,
          },
        ]
      : []),
    {
      id: "stop",
      icon: CircleStop,
      title: "Stop here",
      body: `Opens Not passed with the reason "Skill gap".${d.next ? " The rounds after this one are marked stopped." : ""}`,
    },
    { id: "rebook", icon: RotateCcw, title: "Rebook this round", body: "For a no-show or technical trouble. Keeps this attempt on record." },
  ];

  return (
    <section id={id} className="rounded-2xl border border-border bg-surface print:hidden" aria-labelledby={`${id}-title`}>
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p className="text-xs text-subtle truncate">
          {d.candidateName} · {where}
        </p>
        <h2 id={`${id}-title`} className="mt-0.5 text-[15px] font-semibold text-fg">
          {d.decided ? d.roundName : `${d.roundName}: what next?`}
        </h2>
        <p className="mt-1 text-[13px]">
          <span className={`font-medium ${TONE[d.state] ?? "text-muted"}`}>{d.stateLabel}</span>
          {d.score && <span className="text-muted"> · {d.score}</span>}
        </p>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {decidedStage ? (
          <p className="text-[13px] text-muted">
            {d.candidateName} is {d.stage === "PASSED" ? "passed" : "not passed"}, so the rounds are closed. Reopen them on their profile to change this.
          </p>
        ) : d.decided ? (
          <>
            <p className="text-[13px] text-fg">
              {d.decided === "advance" ? `Moved on to ${d.next?.name ?? "the next round"}` : "Stopped here"}
              {d.decidedBy && <span className="text-muted">, by {d.decidedBy}</span>}.
            </p>
            <div className="flex flex-wrap gap-2">
              {d.decided === "advance" && d.nextHref && !d.nextBooked && (
                <Btn variant="primary" href={d.nextHref}>
                  Schedule {d.next?.name ?? "it"}
                </Btn>
              )}
              {d.decided === "stop" && (
                <Btn variant="primary" icon={Scale} href={`${d.profileHref}?decide=not_passed&reason=SKILL_GAP&round=${d.roundId}`}>
                  Mark as not passed
                </Btn>
              )}
              {d.canDecide && (
                <Btn onClick={() => save(null, undefined, "Next step cleared.")} disabled={pending}>
                  Change
                </Btn>
              )}
            </div>
          </>
        ) : !d.canDecide ? (
          <p className="text-[13px] text-muted">Someone who manages the pipeline picks the next step.</p>
        ) : (
          <>
            {!d.next && (
              <p className="text-[13px] text-muted">
                This was their last round. Pass them or not on{" "}
                <a href={d.profileHref} className="text-secondary-soft hover:underline underline-offset-4">
                  their profile
                </a>
                , or stop or rebook here.
              </p>
            )}
            <div role="radiogroup" aria-label="Next step" className="flex flex-col gap-2">
              {options.map((o) => {
                const on = choice === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoice(o.id)}
                    className={`text-left flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${on ? "border-secondary bg-secondary/[0.07]" : "border-border hover:border-border-strong hover:bg-panel/50"}`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? "border-secondary" : "border-border-strong"}`}>
                      {on && <span className="w-2 h-2 rounded-full bg-secondary" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg">{o.title}</span>
                      <span className="block text-xs text-muted mt-0.5">{o.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Btn variant="primary" onClick={go} disabled={!choice || pending}>
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                Continue
              </Btn>
              <Btn variant="quiet" onClick={() => setChoice(null)} disabled={!choice || pending}>
                Decide later
              </Btn>
            </div>
          </>
        )}
      </div>
      {toasts}
    </section>
  );
}

