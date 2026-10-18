"use client";

/**
 * The Rounds cell on the Candidates list (and the strip on board cards): a
 * strip with one segment per round, the one line that matters now, and a
 * badge when the recruiter owes this person something. Hovering or tapping
 * the strip opens every round in a popover, with Move on and Stop here when
 * a round is waiting on its next step.
 */
import { useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { ROLE_TYPE_LABELS, type RoundState } from "@/lib/interview/rounds";
import { currentRound, roundDetail, roundsBadge, roundsLine, roundsSub, stripItems, thenLabel, waitingKey, type BadgeTone, type RoundsSummary } from "@/lib/interview/rounds-view";
import { setRoundNextStepAction } from "../plan-actions";
import { RoundTile } from "./PlanEditor";
import { RoundStrip } from "./RoundStrip";
import { fmtDate, fmtWhen } from "./ui";

const BADGE: Record<BadgeTone, string> = {
  warning: "bg-warning/15 text-warning",
  secondary: "bg-secondary/15 text-secondary-soft",
  neutral: "bg-panel text-muted",
};

export function RoundsBadge({ rounds }: { rounds: RoundsSummary | null | undefined }) {
  const b = roundsBadge(rounds);
  if (!b) return null;
  return <span className={`inline-block w-fit max-w-full truncate leading-6 h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ${BADGE[b.tone]}`}>{b.text}</span>;
}

/** The state of one round as a small pill, coloured like its strip segment. */
const PILL: Partial<Record<RoundState, string>> = {
  above_bar: "bg-success/10 text-success",
  below_bar: "bg-danger/10 text-danger",
  did_not_finish: "bg-danger/10 text-danger",
  awaiting_review: "bg-warning/10 text-warning",
  scheduled: "bg-secondary/10 text-secondary-soft",
  in_progress: "bg-secondary/10 text-secondary-soft",
};

export function RoundStatePill({ state, label }: { state: RoundState; label: string }) {
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ${PILL[state] ?? "border border-border text-muted"}`}>{label}</span>
  );
}

export function RoundsCell({
  slug,
  candidateId,
  name,
  stage,
  rounds,
  canPipeline,
  sub = true,
}: {
  slug: string;
  candidateId: string;
  name: string;
  stage: string;
  rounds: RoundsSummary;
  canPipeline: boolean;
  /** Show the quieter second line. */
  sub?: boolean;
}) {
  const subText = sub ? roundsSub(rounds, stage, fmtDate, fmtWhen) : null;
  return (
    <div className="flex flex-col gap-1 min-w-0 w-full items-start">
      <RoundsPopover slug={slug} candidateId={candidateId} name={name} stage={stage} rounds={rounds} canPipeline={canPipeline}>
        <RoundStrip items={stripItems(rounds)} then={thenLabel(rounds)} size="md" className="py-1" />
      </RoundsPopover>
      <span className="text-[13px] text-fg truncate max-w-full">{roundsLine(rounds)}</span>
      {subText && (
        <span className="text-xs text-subtle truncate max-w-full" suppressHydrationWarning>
          {subText}
        </span>
      )}
    </div>
  );
}

/** Opens every round on hover, focus or tap of `children`. */
export function RoundsPopover({
  slug,
  candidateId,
  name,
  stage,
  rounds,
  canPipeline,
  children,
}: {
  slug: string;
  candidateId: string;
  name: string;
  stage: string;
  rounds: RoundsSummary;
  canPipeline: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const later = (v: boolean, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(v), ms);
  };
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const place = () => {
      const a = anchor.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(360, vw - 32);
      const h = card.current?.offsetHeight ?? 320;
      const left = Math.max(16, Math.min(a.left, vw - width - 16));
      const below = a.bottom + 8;
      const top = below + h > vh - 8 && a.top - h - 8 > 8 ? a.top - h - 8 : below;
      setPos({ top, left, width });
    };
    place();
    const raf = requestAnimationFrame(place);
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!anchor.current?.contains(t) && !card.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-expanded={open}
        aria-label={`All rounds for ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => later(true, 180)}
        onMouseLeave={() => later(false, 200)}
        className="rounded-md -mx-1 px-1 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
      >
        {children}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={card}
            role="dialog"
            aria-label={`Rounds for ${name}`}
            onMouseEnter={() => later(true, 0)}
            onMouseLeave={() => later(false, 200)}
            // Portal events still bubble to the row, which would open the quick view.
            onClick={(e) => e.stopPropagation()}
            style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: "hidden", top: 0, left: 0 }}
            className="fixed z-50 rounded-xl border border-border bg-elevated shadow-xl shadow-black/30 animate-fade-in motion-reduce:animate-none"
          >
            <RoundsList slug={slug} candidateId={candidateId} name={name} stage={stage} rounds={rounds} canPipeline={canPipeline} onDone={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  );
}

function RoundsList({
  slug,
  candidateId,
  name,
  stage,
  rounds,
  canPipeline,
  onDone,
}: {
  slug: string;
  candidateId: string;
  name: string;
  stage: string;
  rounds: RoundsSummary;
  canPipeline: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cur = currentRound(rounds);
  const needsStep = canPipeline && waitingKey(rounds) === "next_step" && cur;
  const profile = `/w/${slug}/candidates/${candidateId}`;

  function moveOn() {
    if (!cur) return;
    start(async () => {
      const res = await setRoundNextStepAction(slug, cur.id, "advance");
      if (!res.ok) return setError(res.error);
      onDone();
      router.refresh();
    });
  }
  function stop() {
    if (!cur) return;
    start(async () => {
      const res = await setRoundNextStepAction(slug, cur.id, "stop");
      if (!res.ok) return setError(res.error);
      router.push(`${profile}?decide=not_passed&reason=SKILL_GAP&round=${cur.id}`);
    });
  }

  return (
    <div className="p-4">
      <div className="pb-3 border-b border-border">
        <div className="text-sm font-semibold text-fg truncate">{name}</div>
        <div className="text-xs text-subtle mt-0.5">
          {[rounds.planName ?? `${ROLE_TYPE_LABELS[rounds.roleType]} plan`, `${rounds.total} ${rounds.total === 1 ? "round" : "rounds"}`].join(" · ")}
        </div>
      </div>
      <RoundRows rounds={rounds} className="max-h-[50vh] overflow-y-auto" />
      {error && <p className="text-xs text-danger pt-2">{error}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
        {needsStep && stage !== "PASSED" && stage !== "REJECTED" && (
          <>
            {rounds.rounds.some((r) => (r.number ?? 0) > (cur.number ?? 0) && !r.skipped) && (
              <button
                type="button"
                onClick={moveOn}
                disabled={pending}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary text-white text-[13px] font-medium hover:bg-secondary/90 disabled:opacity-60"
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <ArrowRight className="w-3.5 h-3.5" aria-hidden />}
                Move to next round
              </button>
            )}
            <button
              type="button"
              onClick={stop}
              disabled={pending}
              className="inline-flex items-center h-8 px-3 rounded-lg border border-border text-[13px] font-medium text-fg hover:bg-panel disabled:opacity-60"
            >
              Stop here
            </button>
          </>
        )}
        <Link href={profile} className="ml-auto text-[13px] font-medium text-secondary-soft hover:underline underline-offset-4">
          Open profile
        </Link>
      </div>
    </div>
  );
}

/** Every round as a row: tile, name, when and score, state. */
export function RoundRows({ rounds, className = "" }: { rounds: RoundsSummary; className?: string }) {
  const cur = currentRound(rounds);
  const owed = waitingKey(rounds) === "next_step";
  return (
    <ol className={`divide-y divide-border ${className}`}>
      {rounds.rounds.map((r) => (
        <li key={r.id} className={`flex items-center gap-3 py-2.5 ${r.skipped || r.state === "stopped" ? "opacity-60" : ""}`}>
          <RoundTile kind={r.kind} format={r.format} size={26} />
          <div className="min-w-0 flex-1">
            <div className={`text-[13px] font-medium text-fg truncate ${r.skipped ? "line-through decoration-subtle" : ""}`}>{r.name}</div>
            <div className="text-xs text-subtle truncate" suppressHydrationWarning>
              {owed && r.id === cur?.id ? "Waiting on your next step" : roundDetail(r, fmtDate, fmtWhen)}
            </div>
          </div>
          {!r.skipped && <RoundStatePill state={r.state} label={r.stateLabel} />}
        </li>
      ))}
    </ol>
  );
}
