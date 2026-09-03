import { Fragment } from "react";

/**
 * THE INTERVIEWPAD SIGNAL STRIP.
 *
 * The one motif reused across the whole site: a run of square stage nodes
 * threaded on a single hairline, with exactly one node live. It always means
 * the same thing — "these are the stages, and this is where you are" — so it
 * reads as brand rather than decoration wherever it appears:
 *
 *   hiring page   APPLIED → SCREENED → CHALLENGE → INTERVIEW → HIRED
 *   developer page  PRACTISE → BUILD → REVIEW → INTERVIEW → OFFER
 *   product chrome  the execution trace of a run
 *
 * Square nodes on purpose. Rounded dots are what every SaaS carousel uses;
 * a pipeline stage is a discrete state, and it gets a discrete shape.
 *
 * Presentational and server-renderable — no client JS.
 */

export type SignalStage = {
  label: string;
  /** "done" = passed, "live" = current (accent), undefined = ahead. */
  state?: "done" | "live";
};

export default function SignalStrip({
  stages,
  tone = "accent",
  labels = true,
  className = "",
}: {
  stages: SignalStage[];
  tone?: "accent" | "secondary";
  /** Hide labels for a compact strip used purely as a rhythm marker. */
  labels?: boolean;
  className?: string;
}) {
  const toneClass = tone === "secondary" ? "ip-signal-secondary" : "";

  return (
    <div
      className={`flex items-start ${className}`}
      role="img"
      aria-label={stages.map((s) => s.label).join(" then ")}
    >
      {stages.map((stage, i) => (
        <Fragment key={stage.label}>
          {i > 0 && <span className="ip-signal-wire mt-[3px]" aria-hidden />}
          <span className={labels ? "flex flex-col gap-2 items-start shrink-0" : "shrink-0"}>
            <span
              aria-hidden
              data-state={stage.state}
              className={`ip-signal-node ${toneClass} ${
                stage.state === "live" ? "ip-live" : ""
              }`}
            />
            {labels && (
              <span
                className={`ip-label ip-label-xs whitespace-nowrap -ml-px ${
                  stage.state === "live"
                    ? tone === "secondary"
                      ? "ip-label-secondary"
                      : "ip-label-accent"
                    : stage.state === "done"
                      ? "ip-label-fg"
                      : ""
                }`}
              >
                {stage.label}
              </span>
            )}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** The developer-side track. Kept here so both hero and footer stay in sync. */
export const CANDIDATE_STAGES: SignalStage[] = [
  { label: "Practise", state: "done" },
  { label: "Build", state: "done" },
  { label: "Review", state: "live" },
  { label: "Interview" },
  { label: "Offer" },
];

/** The hiring-side funnel. */
export const RECRUITER_STAGES: SignalStage[] = [
  { label: "Applied", state: "done" },
  { label: "Screened", state: "done" },
  { label: "Challenge", state: "live" },
  { label: "Interview" },
  { label: "Hired" },
];
