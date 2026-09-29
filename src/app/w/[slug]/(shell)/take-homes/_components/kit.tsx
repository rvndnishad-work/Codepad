"use client";

/**
 * Pieces shared by the Take home pages: the title band with its tabs, the
 * status chip, the score bar with the pass mark, the integrity dot, and the
 * per-row invite actions.
 */
import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ClipboardList, Copy, Mail, MoreHorizontal, Plus, Send, UserRound, XCircle } from "lucide-react";
import {
  rowLabel,
  TAKE_HOME_PASS,
  type Decision,
  type IntegrityLevel,
  type TakeHomeState,
  type Tone,
} from "@/lib/take-home/status";
import { takeHomeVerdict } from "@/lib/take-home/pass-mark";
import { Btn, Dialog, Menu, MenuItem, inputCls, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { cancelTakeHomeAction, extendTakeHomeAction, remindTakeHomeAction, resendTakeHomeAction } from "../actions";

export const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/25",
  indigo: "bg-secondary/15 text-secondary-soft ring-secondary/30",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-danger/10 text-danger ring-danger/25",
  neutral: "bg-panel text-muted ring-border",
};

export const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  indigo: "bg-secondary",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-subtle",
};

export function ToneChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONE_CHIP[tone]}`}>
      {children}
    </span>
  );
}

export function StateDot({ state, decision }: { state: TakeHomeState; decision: Decision }) {
  const { label, tone } = rowLabel(state, decision);
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted whitespace-nowrap">
      <span aria-hidden className={`w-2 h-2 rounded-full ${TONE_DOT[tone]} ${state === "in_progress" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
      {label}
    </span>
  );
}

/** Score with a thin bar, a tick at the pass mark and, with `chip`, its Good match or Borderline label. */
export function ScoreMark({
  score,
  passMark = TAKE_HOME_PASS,
  width = 88,
  chip = false,
}: {
  score: number | null;
  passMark?: number;
  width?: number;
  chip?: boolean;
}) {
  if (score == null) return <span className="text-[13px] text-subtle">No score</span>;
  const verdict = takeHomeVerdict(score, passMark)!;
  const above = verdict.atMark;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`text-sm font-semibold tabular-nums w-7 text-right ${above ? "text-fg" : "text-warning"}`}>{score}</span>
      <span className="relative h-1 rounded-full bg-panel" style={{ width }} aria-hidden>
        <span
          className={`block h-1 rounded-full origin-left animate-rule-in motion-reduce:animate-none ${above ? "bg-success" : "bg-warning"}`}
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
        <span className="absolute top-[-3px] w-px h-2.5 bg-subtle" style={{ left: `${passMark}%` }} />
      </span>
      {chip && <ToneChip tone={verdict.tone}>{verdict.label}</ToneChip>}
    </span>
  );
}

const INTEGRITY_TONE: Record<IntegrityLevel, string> = {
  clean: "bg-success",
  some: "bg-warning",
  high: "bg-danger",
  none: "bg-subtle",
};

export function IntegrityDot({ level, label }: { level: IntegrityLevel; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted whitespace-nowrap">
      <span aria-hidden className={`w-2 h-2 rounded-full ${INTEGRITY_TONE[level]}`} />
      {label}
    </span>
  );
}

export type HeaderTab = "review" | "all" | "templates";

export function TakeHomeHeader({
  slug,
  active,
  counts,
  canCreate,
}: {
  slug: string;
  active: HeaderTab;
  counts: { review: number; all: number; templates: number };
  canCreate: boolean;
}) {
  const base = `/w/${slug}/take-homes`;
  const tab = (id: HeaderTab, text: string, n: number, href: string) => (
    <Link
      key={id}
      href={href}
      aria-current={active === id ? "page" : undefined}
      className={`group relative flex items-center gap-2 h-10 px-0.5 text-sm font-medium whitespace-nowrap transition-colors ${
        active === id ? "text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {text}
      <span
        className={`min-w-5 h-5 px-1.5 rounded-full text-xs leading-5 text-center tabular-nums transition-colors ${
          active === id ? "bg-secondary/20 text-secondary-soft" : "bg-panel text-subtle group-hover:text-muted"
        }`}
      >
        {n}
      </span>
      <span
        aria-hidden
        className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary origin-left transition-transform duration-300 motion-reduce:transition-none ${
          active === id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
        }`}
      />
    </Link>
  );
  return (
    <div className="flex flex-col gap-4">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.22), transparent 70%), radial-gradient(420px 200px at 100% 130%, rgb(var(--c-success) / 0.10), transparent 70%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--c-border-strong) / 0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to left, black, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 60%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span
              aria-hidden
              className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25"
            >
              <ClipboardList className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">Take home</h1>
              <p className="text-[15px] text-muted mt-1 max-w-[620px]">
                Send coding questions that candidates solve on their own time. Tests score each answer. You review the work and decide who passes.
              </p>
            </div>
          </div>
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              <Btn size="md" href={`${base}/templates`}>
                Use a template
              </Btn>
              <Btn variant="primary" size="md" icon={Plus} href={`${base}/new`}>
                New take home
              </Btn>
            </div>
          )}
        </div>
      </section>
      <nav aria-label="Take home views" className="flex gap-6 border-b border-border overflow-x-auto">
        {tab("review", "Review", counts.review, base)}
        {tab("all", "All take-homes", counts.all, `${base}/all`)}
        {tab("templates", "Templates", counts.templates, `${base}/templates`)}
      </nav>
    </div>
  );
}

/** Invite actions for one open take-home: copy link, remind, extend, resend, cancel. */
export function RowActions({
  slug,
  row,
  canCreate,
  compact = false,
}: {
  slug: string;
  row: { id: string; state: TakeHomeState; kind: "session" | "legacy"; linkPath: string | null; candidate: { id: string | null; name: string } };
  canCreate: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [extending, setExtending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [origin, setOrigin] = useState("");
  // Built after mount so the server and client render the same markup.
  useEffect(() => setOrigin(window.location.origin), []);
  const open = row.state === "not_started" || row.state === "in_progress";
  const first = row.candidate.name.split(/\s+/)[0] || row.candidate.name;

  const run = (p: Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await p;
      if (!res.ok) return toast(res.error ?? "Something went wrong.", "error");
      toast(ok);
      router.refresh();
    });

  const copy = () => {
    if (!row.linkPath) return;
    navigator.clipboard?.writeText(`${origin}${row.linkPath}`);
    toast("Candidate link copied");
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {!compact && open && row.linkPath && (
          <Btn icon={Copy} onClick={copy}>
            Copy link
          </Btn>
        )}
        {!compact && row.state === "expired" && canCreate && (
          <Btn icon={CalendarPlus} onClick={() => setExtending(true)} disabled={pending}>
            Extend
          </Btn>
        )}
        <Menu
          align="right"
          width={232}
          label={`Actions for ${row.candidate.name}`}
          trigger={(p) => (
            <button
              type="button"
              {...p}
              aria-label={`More actions for ${row.candidate.name}`}
              className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-panel hover:border-border-strong transition"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              {open && row.linkPath && (
                <MenuItem onClick={() => (close(), copy())}>
                  <Copy className="w-3.5 h-3.5 text-muted" /> Copy candidate link
                </MenuItem>
              )}
              {canCreate && open && (
                <MenuItem disabled={pending} onClick={() => (close(), run(remindTakeHomeAction(slug, row.id), `Reminder sent to ${first}`))}>
                  <Mail className="w-3.5 h-3.5 text-muted" /> Send a reminder
                </MenuItem>
              )}
              {canCreate && row.state !== "submitted" && row.state !== "cancelled" && (
                <MenuItem onClick={() => (close(), setExtending(true))}>
                  <CalendarPlus className="w-3.5 h-3.5 text-muted" /> Extend the deadline
                </MenuItem>
              )}
              {canCreate && open && row.kind === "session" && (
                <MenuItem disabled={pending} onClick={() => (close(), run(resendTakeHomeAction(slug, row.id), `Invite sent to ${first} again`))}>
                  <Send className="w-3.5 h-3.5 text-muted" /> Resend the invite
                </MenuItem>
              )}
              {row.candidate.id && (
                <MenuItem href={`/w/${slug}/candidates/${row.candidate.id}`}>
                  <UserRound className="w-3.5 h-3.5 text-muted" /> Open candidate profile
                </MenuItem>
              )}
              {canCreate && row.state !== "submitted" && row.state !== "cancelled" && (
                <>
                  <div className="h-px bg-border my-1 mx-1" />
                  <MenuItem danger onClick={() => (close(), setCancelling(true))}>
                    <XCircle className="w-3.5 h-3.5" /> Cancel this take home
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>
      </div>
      {extending && (
        <ExtendDialog
          name={first}
          busy={pending}
          onCancel={() => setExtending(false)}
          onConfirm={(days) =>
            start(async () => {
              const res = await extendTakeHomeAction(slug, row.id, days);
              if (!res.ok) return toast(res.error, "error");
              setExtending(false);
              toast(`${first} has ${days} more day${days === 1 ? "" : "s"}`);
              router.refresh();
            })
          }
        />
      )}
      {cancelling && (
        <ConfirmDialog
          title={`Cancel ${first}'s take home?`}
          body="The candidate link stops working and any unfinished work is not scored. The take home stays in the list as cancelled."
          confirmLabel="Cancel take home"
          danger
          busy={pending}
          onCancel={() => setCancelling(false)}
          onConfirm={() =>
            start(async () => {
              const res = await cancelTakeHomeAction(slug, row.id);
              if (!res.ok) return toast(res.error, "error");
              setCancelling(false);
              toast("Take home cancelled");
              router.refresh();
            })
          }
        />
      )}
      {toasts}
    </>
  );
}

function ExtendDialog({ name, busy, onCancel, onConfirm }: { name: string; busy: boolean; onCancel: () => void; onConfirm: (days: number) => void }) {
  const [days, setDays] = useState(3);
  return (
    <Dialog
      title={`Give ${name} more time`}
      onClose={onCancel}
      width={440}
      footer={
        <>
          <Btn size="md" onClick={onCancel}>
            Keep as is
          </Btn>
          <Btn size="md" variant="primary" disabled={busy} onClick={() => onConfirm(days)}>
            Extend by {days} day{days === 1 ? "" : "s"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted leading-relaxed">
          The new deadline counts from the current one, or from today if it already passed. An expired take home opens again with the same link.
        </p>
        <div className="flex gap-2">
          {[1, 3, 7, 14].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`h-9 px-3.5 rounded-lg border text-[13px] font-medium transition ${
                days === d ? "border-secondary bg-secondary/15 text-fg" : "border-border bg-surface text-muted hover:text-fg"
              }`}
            >
              {d} day{d === 1 ? "" : "s"}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            aria-label="Days"
            onChange={(e) => setDays(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
            className={`${inputCls} w-20`}
          />
        </div>
      </div>
    </Dialog>
  );
}
