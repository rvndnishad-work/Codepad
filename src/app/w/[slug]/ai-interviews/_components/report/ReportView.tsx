"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Link2,
  Mail,
  MessageSquare,
  Mic,
  Play,
  Printer,
  Send,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type { ReportData } from "@/lib/ai-interview/console-server";
import { SCREENING_PASS_THRESHOLD } from "@/lib/ai-interview/verdict";
import { daysLeft, fmtDuration } from "@/lib/ai-interview/console";
import { ENGAGEMENT_LABELS, normalizeEngagementLevel } from "@/lib/ai-interview/engagement";
import type { RejectReason } from "@/lib/crm/stages";
import { plural } from "@/lib/workspace/display";
import { Avatar, Btn, StageChip, fmtDate, inputCls, stageLabel, useToasts } from "../../../candidates/_components/ui";
import { ConfirmDialog, PassOverrideDialog, RejectDialog } from "../../../candidates/_components/dialogs";
import { addNoteAction, bulkCandidatesAction } from "../../../candidates/manage-actions";
import {
  cancelInvitesAction,
  deleteSessionAction,
  remindAction,
  resendInviteAction,
  updateExtensionPolicyAction,
} from "../../actions";
import { StatusChip, ToneChip, TONE_BAR, selectCls } from "../kit";
import SummaryTab from "./SummaryTab";
import TranscriptTab from "./TranscriptTab";
import TheoryTab from "./TheoryTab";

// The editors are heavy and browser-only.
const CodeTab = dynamic(() => import("./CodeTab"), { ssr: false, loading: () => <PaneLoading /> });
const RunTab = dynamic(() => import("./RunTab"), { ssr: false, loading: () => <PaneLoading /> });

type Tab = "summary" | "theory" | "code" | "transcript" | "run";

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "theory", label: "Theory answers", icon: Mic },
  { id: "code", label: "Code changes", icon: Code2 },
  { id: "transcript", label: "Transcript", icon: MessageSquare },
  { id: "run", label: "Run the code", icon: Play },
];

function PaneLoading() {
  return <div className="h-[560px] rounded-xl border border-border bg-surface animate-pulse" />;
}

export default function ReportView({
  slug,
  report: r,
  tab,
  round,
  canManage,
  canDecide,
  canNote,
}: {
  slug: string;
  report: ReportData;
  tab: Tab;
  round: number;
  canManage: boolean;
  canDecide: boolean;
  canNote: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/ai-interviews`;
  const [busy, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [rejecting, setRejecting] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const done = r.status === "COMPLETED";
  const decided = r.candidate.stage === "PASSED" || r.candidate.stage === "REJECTED";
  // Screenings of only conversation and theory rounds have no code to show or run.
  const talkKind = (k: string | undefined) => k === "conversation" || k === "theory";
  const allTalk = r.rounds.length > 0 && r.rounds.every((x) => talkKind(x.kind));
  const hasTheory = r.rounds.some((x) => x.kind === "theory");
  const hasChat = r.rounds.some((x) => x.kind !== "theory");
  const wide = (tab === "code" || tab === "run") && !talkKind(r.rounds[round]?.kind);
  const hrefFor = (patch: { tab?: Tab; round?: number }) => {
    const t = patch.tab ?? tab;
    const rd = patch.round ?? round;
    const qs = new URLSearchParams();
    if (t !== "summary") qs.set("tab", t);
    if (rd > 0) qs.set("round", String(rd));
    const s = qs.toString();
    return s ? `${base}/${r.id}?${s}` : `${base}/${r.id}`;
  };
  const navHref = (id: string | null) => (id ? `${base}/${id}${tab !== "summary" ? `?tab=${tab}` : ""}` : null);
  const prev = navHref(r.nav.prevId);
  const next = navHref(r.nav.nextId);
  const firstName = r.candidate.name.split(/\s+/)[0] || r.candidate.name;

  // Below the bar, unscored, or no code: passing is a labelled manual override.
  const overrideReason = !r.suggestion
    ? "The screening has no score."
    : r.suggestion.label === "No code written"
      ? "No code was written."
      : !r.suggestion.aboveBar
        ? `AI score ${r.score} is below the bar of ${SCREENING_PASS_THRESHOLD}.`
        : null;

  function decide(stage: "PASSED" | "REJECTED", extra: { override?: boolean; rejectReason?: RejectReason; rejectReasonNote?: string } = {}) {
    if (!r.candidate.id) return;
    start(async () => {
      const res = await bulkCandidatesAction(slug, [r.candidate.id!], { action: "stage", stage, ...extra });
      if (!res.ok) {
        if (res.needsOverride?.length && stage === "PASSED") return setOverriding(true);
        return toast(res.error, "error");
      }
      setRejecting(false);
      setOverriding(false);
      toast(stage === "PASSED" ? (extra.override ? `${firstName} passed as a manual override` : `${firstName} passed`) : `${firstName} marked as not passed`);
      if (next) router.push(next);
      else router.refresh();
    });
  }
  const pass = () => (overrideReason ? setOverriding(true) : decide("PASSED"));

  // Keyboard review: J and K move, P passes, N opens Not passed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || rejecting || overriding || deleting) return;
      if (e.key === "j" && next) router.push(next);
      else if (e.key === "k" && prev) router.push(prev);
      else if (e.key === "p" && canDecide && done && r.candidate.id && !decided) pass();
      else if (e.key === "n" && canDecide && done && r.candidate.id && !decided) setRejecting(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const totalMinutes = r.rounds.reduce((n, x) => n + x.minutes, 0);
  const spent = fmtDuration(r.timeSpentSec);

  return (
    <div className="flex flex-col gap-5 print:gap-3">
      <Link href={base} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit print:hidden">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Back to review
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <span className="hidden sm:block"><Avatar name={r.candidate.name} size={48} /></span>
          <div className="min-w-0 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-fg">{r.candidate.name}</h1>
              {!done && <StatusChip status={r.status} />}
              {r.candidate.stage && done && <StageChip stage={r.candidate.stage} />}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-2.5 gap-y-1 text-[13px] text-muted">
              <span>{r.role}</span>
              <Sep />
              <span>
                {plural(r.rounds.length, "round")}
                {spent ? `, ${spent} of ${totalMinutes} min` : `, ${totalMinutes} min`}
              </span>
              {r.finishedAt && (
                <>
                  <Sep />
                  <span>Finished {fmtDate(r.finishedAt)}</span>
                </>
              )}
              {r.screening && (
                <>
                  <Sep />
                  <Link href={`${base}/screenings/${r.screening.id}`} className="text-secondary-soft hover:underline">
                    Compare with others
                  </Link>
                </>
              )}
              {r.candidate.id && (
                <>
                  <Sep />
                  <Link href={`/w/${slug}/candidates/${r.candidate.id}`} className="text-secondary-soft hover:underline">
                    Open candidate profile
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        {r.nav.total > 0 && (
          <div className="flex items-center gap-2 print:hidden">
            <Btn icon={ChevronLeft} aria-label="Previous candidate" href={prev ?? undefined} disabled={!prev} />
            <span className="text-[13px] text-subtle tabular-nums">
              {r.nav.position ? `${r.nav.position} of ${r.nav.total}` : `${r.nav.total} to review`}
            </span>
            <Btn icon={ChevronRight} aria-label="Next candidate" href={next ?? undefined} disabled={!next} />
          </div>
        )}
      </header>

      <DecisionBar
        r={r}
        slug={slug}
        firstName={firstName}
        canDecide={canDecide}
        canManage={canManage}
        busy={busy}
        onPass={pass}
        onReject={() => setRejecting(true)}
        toast={toast}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
          <nav aria-label="Report sections" className="flex gap-1 border-b border-border overflow-x-auto print:hidden">
            {TABS.filter((t) => (t.id === "theory" ? hasTheory : t.id === "transcript" ? hasChat : !allTalk || (t.id !== "code" && t.id !== "run"))).map((t) => {
              const on = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={hrefFor({ tab: t.id })}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex items-center gap-2 h-10 px-3.5 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors ${
                    on ? "border-secondary text-fg font-medium" : "border-transparent text-muted hover:text-fg"
                  }`}
                >
                  <t.icon className="w-[15px] h-[15px]" aria-hidden />
                  {t.label}
                </Link>
              );
            })}
          </nav>

          {(tab === "code" || tab === "run") && r.rounds.length > 1 && !allTalk && (
            <RoundSwitch rounds={r.rounds} active={round} hrefFor={(i) => hrefFor({ round: i })} />
          )}

          {tab === "summary" && <SummaryTab r={r} hrefFor={hrefFor} />}
          {tab === "theory" && <TheoryTab r={r} slug={slug} />}
          {tab === "transcript" && <TranscriptTab r={r} />}
          {(tab === "code" || tab === "run") && talkKind(r.rounds[round]?.kind) ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
              Round {round + 1} is {r.rounds[round]?.kind === "theory" ? "a theory round" : "a conversation"}, so there is no code.{" "}
              <Link href={hrefFor({ tab: r.rounds[round]?.kind === "theory" ? "theory" : "transcript" })} scroll={false} className="text-secondary-soft hover:underline">
                {r.rounds[round]?.kind === "theory" ? "Read the answers" : "Read the transcript"}
              </Link>
            </div>
          ) : (
            <>
              {tab === "code" && <CodeTab key={`${r.id}:${round}`} round={r.rounds[round]} />}
              {tab === "run" && <RunTab key={`${r.id}:${round}`} round={r.rounds[round]} />}
            </>
          )}
        </div>

        {!wide && (
          <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4">
            <ScoreCard r={r} />
            <IntegrityCard r={r} />
            <NotesCard
              r={r}
              slug={slug}
              canNote={canNote}
              toast={toast}
              onDelete={canManage ? () => setDeleting(true) : undefined}
            />
          </aside>
        )}
      </div>

      {rejecting && (
        <RejectDialog
          names={[r.candidate.name]}
          busy={busy}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason, note) => decide("REJECTED", { rejectReason: reason, rejectReasonNote: note || undefined })}
        />
      )}
      {overriding && (
        <PassOverrideDialog
          people={[{ name: r.candidate.name, reason: overrideReason ?? "Their results do not back a pass." }]}
          total={1}
          busy={busy}
          onCancel={() => setOverriding(false)}
          onConfirm={() => decide("PASSED", { override: true })}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${firstName}'s screening?`}
          body={
            done
              ? "This removes the code, transcript and score for good. The deletion is kept in the audit log. To turn someone down, use Not passed instead."
              : "This removes the invite and its link. The deletion is kept in the audit log."
          }
          confirmLabel="Delete screening"
          danger
          requireText={done ? "delete" : undefined}
          busy={busy}
          onCancel={() => setDeleting(false)}
          onConfirm={() =>
            start(async () => {
              const res = await deleteSessionAction(slug, r.id);
              if (!res.ok) return toast(res.error, "error");
              router.push(base);
            })
          }
        />
      )}
      {toasts}
    </div>
  );
}

function Sep() {
  return (
    <span aria-hidden className="hidden sm:inline text-border-strong">
      |
    </span>
  );
}

function RoundSwitch({ rounds, active, hrefFor }: { rounds: ReportData["rounds"]; active: number; hrefFor: (i: number) => string }) {
  const cur = rounds[active];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
        {rounds.map((x, i) => (
          <Link
            key={x.id}
            href={hrefFor(i)}
            scroll={false}
            aria-current={i === active ? "page" : undefined}
            className={`inline-flex items-center h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap ${
              i === active ? "bg-elevated text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Round {i + 1}: {x.label}
          </Link>
        ))}
      </div>
      {cur && (
        <span className="text-[13px] text-muted">
          {cur.title}, {cur.minutes} min
        </span>
      )}
    </div>
  );
}

/* ── Decision bar ────────────────────────────────────────────────────────── */

function DecisionBar({
  r,
  slug,
  firstName,
  canDecide,
  canManage,
  busy,
  onPass,
  onReject,
  toast,
}: {
  r: ReportData;
  slug: string;
  firstName: string;
  canDecide: boolean;
  canManage: boolean;
  busy: boolean;
  onPass: () => void;
  onReject: () => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Built after mount: reading window.location during render caused a
  // hydration mismatch on every load.
  useEffect(() => setInviteUrl(`${window.location.origin}/ai-interview/${r.inviteToken}`), [r.inviteToken]);

  const act = <T extends { ok: boolean; error?: string }>(p: Promise<T>, ok: (x: T) => string) =>
    start(async () => {
      const res = await p;
      if (!res.ok) return toast(res.error ?? "Something went wrong.", "error");
      toast(ok(res));
      router.refresh();
    });

  const shell = (tone: string, icon: React.ReactNode, title: React.ReactNode, detail: React.ReactNode, actions: React.ReactNode) => (
    <section className={`flex flex-wrap items-center gap-4 px-5 py-4 rounded-xl border ${tone} print:hidden`}>
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-[240px] flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        <p className="text-[13px] text-muted leading-relaxed">{detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </section>
  );

  if (r.status === "COMPLETED") {
    const s = r.suggestion;
    if (r.candidate.stage === "PASSED" || r.candidate.stage === "REJECTED") {
      return shell(
        "border-border bg-surface",
        r.candidate.stage === "PASSED" ? <Check className="w-5 h-5 text-success" /> : <X className="w-5 h-5 text-danger" />,
        <>
          {firstName} is marked {stageLabel(r.candidate.stage)}
        </>,
        "The decision is on the candidate profile and in the activity log. Change it there if needed.",
        r.candidate.id && <Btn href={`/w/${slug}/candidates/${r.candidate.id}`}>Open profile</Btn>,
      );
    }
    const title = !s
      ? "The AI could not score this screening"
      : s.aboveBar
        ? `AI suggests moving ${firstName} forward`
        : s.label === "No code written"
          ? `${firstName} did not write any code`
          : `AI suggests ${firstName} is below your bar`;
    const detail = !r.candidate.id
      ? "This screening is not linked to a candidate record, so there is no stage to set."
      : s
        ? `${s.detail} The AI never passes anyone: your decision moves ${firstName} to Passed or Not passed in Candidates.`
        : `Read the code and transcript, then decide. The AI never passes anyone.`;
    return shell(
      s?.aboveBar ? "border-secondary/35 bg-secondary/[0.07]" : "border-border bg-surface",
      <Sparkles className={`w-5 h-5 ${s?.aboveBar ? "text-secondary-soft" : "text-muted"}`} />,
      title,
      detail,
      r.candidate.id && canDecide ? (
        <>
          <Btn size="md" icon={X} disabled={busy} onClick={onReject} title="Not passed (N)">
            Not passed
          </Btn>
          <Btn size="md" variant="primary" icon={Check} disabled={busy} onClick={onPass} title="Pass (P)">
            Pass
          </Btn>
        </>
      ) : null,
    );
  }

  if (r.status === "ACTIVE") {
    return shell(
      "border-warning/35 bg-warning/[0.06]",
      <span className="relative flex w-3 h-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-60 animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex w-3 h-3 rounded-full bg-warning" />
      </span>,
      `${firstName} is taking the screening now`,
      `Started ${fmtDate(r.startedAt)}. The report fills in when they submit or their time runs out.${
        r.extension.extraMinutes ? ` They added ${r.extension.extraMinutes} extra minutes.` : ""
      }`,
      canManage && <ExtensionEditor key={r.id} r={r} slug={slug} toast={toast} />,
    );
  }

  const left = daysLeft(r.expiresAt ? new Date(r.expiresAt) : null, new Date());
  const emailLine =
    r.inviteEmailStatus === "FAILED"
      ? `The invite email was not delivered${r.inviteEmailError ? ` (${r.inviteEmailError})` : ""}. Resend it or share the link yourself.`
      : r.inviteSentAt
        ? `Invite emailed ${fmtDate(r.inviteSentAt)}${r.reminderSentAt ? `, reminder sent ${fmtDate(r.reminderSentAt)}` : ""}.`
        : "Share the link below if the email does not arrive.";

  const copy = inviteUrl && (
    <Btn
      icon={Copy}
      onClick={() => {
        navigator.clipboard?.writeText(inviteUrl).then(
          () => toast("Invite link copied"),
          () => toast("Could not copy the link", "error"),
        );
      }}
    >
      Copy invite link
    </Btn>
  );

  if (r.status === "EXPIRED") {
    return shell(
      "border-border bg-surface",
      <XCircle className="w-5 h-5 text-subtle" />,
      `${firstName}'s invite has closed`,
      `It closed ${fmtDate(r.expiresAt)} without being started, so it holds no credits. Reopen it to send a fresh link.`,
      canManage && (
        <Btn variant="primary" icon={Send} disabled={pending} onClick={() => act(resendInviteAction(slug, r.id), (x) => (x.ok && x.sent ? "Invite reopened and sent" : "Invite reopened, but the email failed"))}>
          Reopen and resend
        </Btn>
      ),
    );
  }

  return (
    <>
      {shell(
        r.inviteEmailStatus === "FAILED" ? "border-danger/40 bg-danger/[0.06]" : "border-border bg-surface",
        r.inviteEmailStatus === "FAILED" ? <AlertTriangle className="w-5 h-5 text-danger" /> : <Mail className="w-5 h-5 text-muted" />,
        `${firstName} has not started yet`,
        <>
          {emailLine} {left != null && (left === 0 ? "The invite closes today." : `The invite closes in ${plural(left, "day")}.`)}
        </>,
        canManage && (
          <>
            {copy}
            <Btn icon={Send} disabled={pending} onClick={() => act(resendInviteAction(slug, r.id), (x) => (x.ok && x.sent ? "Invite sent again" : "The email could not be sent"))}>
              Resend
            </Btn>
            <Btn icon={Mail} disabled={pending || !!r.reminderSentAt} onClick={() => act(remindAction(slug, [r.id]), () => "Reminder sent")}>
              {r.reminderSentAt ? "Reminded" : "Remind"}
            </Btn>
            <Btn variant="quiet" disabled={pending} onClick={() => setConfirmCancel(true)}>
              Cancel invite
            </Btn>
          </>
        ),
      )}
      {confirmCancel && (
        <ConfirmDialog
          title="Cancel this invite?"
          body="The link stops working straight away and its credits are freed. You can reopen it later."
          confirmLabel="Cancel invite"
          danger
          busy={pending}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false);
            act(cancelInvitesAction(slug, [r.id]), () => "Invite cancelled");
          }}
        />
      )}
    </>
  );
}

/** Keyed by session so switching candidates never carries values across. */
function ExtensionEditor({ r, slug, toast }: { r: ReportData; slug: string; toast: (t: string, tone?: "ok" | "error") => void }) {
  const [max, setMax] = useState(r.extension.max);
  const [mins, setMins] = useState(r.extension.minutesEach);
  const [pending, start] = useTransition();
  const dirty = max !== r.extension.max || mins !== r.extension.minutesEach;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
      <label className="flex items-center gap-1.5">
        Extensions
        <select value={max} onChange={(e) => setMax(Number(e.target.value))} className={`${selectCls} w-16 h-8`}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        of
        <select value={mins} onChange={(e) => setMins(Number(e.target.value))} className={`${selectCls} w-20 h-8`}>
          {[5, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n} min
            </option>
          ))}
        </select>
      </label>
      <Btn
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            const res = await updateExtensionPolicyAction(slug, { sessionId: r.id, maxExtensions: max, extensionMinutes: mins });
            toast(res.ok ? "Extra time updated" : res.error, res.ok ? "ok" : "error");
          })
        }
      >
        Save
      </Btn>
      <span className="w-full text-xs text-subtle">
        Used {r.extension.used} of {r.extension.max}
      </span>
    </div>
  );
}

/* ── Side column ─────────────────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-surface p-5 flex flex-col gap-4 ${className}`}>{children}</section>;
}

function Skill({ label, value, note }: { label: string; value: number | null; note: string }) {
  const filled = value == null ? 0 : Math.round(value / 20);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-fg">{label}</span>
        <span className="text-muted tabular-nums">{value == null ? "Not rated" : `${filled} of 5`}</span>
      </div>
      <div className="grid grid-cols-5 gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-1.5 rounded-full ${n <= filled ? "bg-secondary" : "bg-elevated"}`} />
        ))}
      </div>
      <span className="text-xs text-subtle">{note}</span>
    </div>
  );
}

function ScoreCard({ r }: { r: ReportData }) {
  const s = r.suggestion;
  const talk = r.rounds.length > 0 && r.rounds.every((x) => x.kind === "conversation" || x.kind === "theory");
  const mixed = !talk && r.rounds.some((x) => x.kind === "conversation" || x.kind === "theory");
  const theory = r.rounds.some((x) => x.kind === "theory");
  if (r.status !== "COMPLETED") {
    return (
      <Card>
        <h3 className="text-[15px] font-semibold text-fg">AI score</h3>
        <p className="text-[13px] text-muted leading-relaxed">The score appears when the candidate finishes.</p>
        <p className="text-xs text-subtle">
          Interviewer: {ENGAGEMENT_LABELS[normalizeEngagementLevel(r.engagementLevel)].label.toLowerCase()}.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-subtle">AI score</span>
          <span className="text-[44px] leading-none font-semibold tracking-tight tabular-nums text-fg">{r.score ?? "–"}</span>
        </div>
        {s && <ToneChip tone={s.tone}>{s.label}</ToneChip>}
      </div>
      {s && (
        <div className="h-1 rounded-full bg-panel relative" aria-hidden>
          <span className={`absolute inset-y-0 left-0 rounded-full ${TONE_BAR[s.tone]}`} style={{ width: `${Math.max(2, r.score ?? 0)}%` }} />
          <span className="absolute -top-1 -bottom-1 w-px bg-fg/60" style={{ left: `${SCREENING_PASS_THRESHOLD}%` }} title="Your bar" />
        </div>
      )}
      <div className="h-px bg-border" />
      {talk ? (
        <>
          <Skill label="Answer quality" value={r.ratings?.code ?? null} note="Relevant, specific answers backed by real examples" />
          <Skill label="Judgement" value={r.ratings?.problem ?? null} note="Reasoning in scenarios, priorities and trade-offs" />
          <Skill label="Communication" value={r.ratings?.communication ?? null} note="Clear, structured and honest" />
        </>
      ) : (
        <>
          <Skill label="Code quality" value={r.ratings?.code ?? null} note="Structure, naming and correctness of what they wrote" />
          <Skill label="Problem solving" value={r.ratings?.problem ?? null} note="How much of the task they got working" />
          <Skill label="Communication" value={r.ratings?.communication ?? null} note="How clearly they explained their choices" />
        </>
      )}
      <details className="group text-[13px]">
        <summary className="cursor-pointer text-secondary-soft hover:underline list-none">How the score works</summary>
        <div className="mt-2 flex flex-col gap-2 text-muted leading-relaxed">
          {talk ? (
            <p>The AI grades the answers in the conversation: 40% answer quality, 35% judgement and 25% communication. Answering fewer than two questions in substance scores under 10.</p>
          ) : (
            <>
              <p>The AI grades only the lines the candidate wrote, compared with the starter code. Half the score is the code itself, a quarter is how much of the task works, and a quarter is how they talked it through.</p>
              <p>Submitting without writing code scores under 10.</p>
            </>
          )}
          {mixed && <p>Conversation and theory rounds are graded on their answers instead: answer quality counts as code quality and judgement as problem solving.</p>}
          {theory && <p>Theory rounds score each question from 0 to 5 against its reference answer. The round score is the total over every question asked, so skipped and unreached questions count as zero.</p>}
          <p>With several rounds, the score is the average of the rounds.</p>
          <p>Your bar is {SCREENING_PASS_THRESHOLD}. Passing someone below it is allowed, and is recorded as a manual override.</p>
        </div>
      </details>
    </Card>
  );
}

function IntegrityCard({ r }: { r: ReportData }) {
  const i = r.integrity;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-fg">Integrity</h3>
        {i ? <ToneChip tone={i.tone}>{i.label}</ToneChip> : <span className="text-xs text-subtle">No data</span>}
      </div>
      <dl className="flex flex-col gap-2 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Suspicion signal</dt>
          <dd className="text-fg tabular-nums">{r.suspicion == null ? "Not recorded" : `${Math.round(r.suspicion)} of 100`}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Extra time used</dt>
          <dd className="text-fg">{r.extension.extraMinutes ? `${r.extension.extraMinutes} min` : "None"}</dd>
        </div>
        {r.outboundCallCount > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">External tool calls</dt>
            <dd className="text-fg tabular-nums">{r.outboundCallCount}</dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-subtle leading-relaxed">Built from large pastes and time away from the tab. Treat it as a prompt to read the code, not proof.</p>
    </Card>
  );
}

function NotesCard({
  r,
  slug,
  canNote,
  toast,
  onDelete,
}: {
  r: ReportData;
  slug: string;
  canNote: boolean;
  toast: (t: string, tone?: "ok" | "error") => void;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card className="print:hidden">
      <h3 className="text-[15px] font-semibold text-fg">Team notes</h3>
      {r.candidate.id && canNote && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            start(async () => {
              const res = await addNoteAction(slug, r.candidate.id!, text);
              if (!res.ok) return toast(res.error, "error");
              setText("");
              router.refresh();
            });
          }}
        >
          <label className="sr-only" htmlFor="report-note">Add a note for the team</label>
          <textarea
            id="report-note"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            placeholder="Add a note for the team"
            className={`${inputCls} h-auto py-2 resize-none`}
          />
          {text.trim() && (
            <Btn variant="primary" type="submit" disabled={pending} className="self-end">
              {pending ? "Saving" : "Add note"}
            </Btn>
          )}
        </form>
      )}
      {r.notes.length > 0 && (
        <ul className="flex flex-col gap-3 max-h-64 overflow-y-auto">
          {r.notes.map((n) => (
            <li key={n.id} className="text-[13px]">
              <p className="text-fg whitespace-pre-line leading-relaxed">{n.body}</p>
              <p className="text-xs text-subtle mt-0.5">
                {n.mine ? "You" : n.author}, {fmtDate(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!r.candidate.id && <p className="text-[13px] text-subtle">Notes need a linked candidate record.</p>}
      <div className="flex flex-wrap gap-2">
        <Btn
          icon={Link2}
          onClick={() =>
            navigator.clipboard?.writeText(window.location.href.split("?")[0]).then(
              () => toast("Link copied. Teammates in this workspace can open it."),
              () => toast("Could not copy the link", "error"),
            )
          }
        >
          Copy link
        </Btn>
        <Btn icon={Printer} onClick={() => window.print()}>
          Print or save PDF
        </Btn>
        {onDelete && (
          <Btn variant="quiet" icon={Trash2} onClick={onDelete} className="ml-auto text-danger hover:text-danger">
            Delete
          </Btn>
        )}
      </div>
    </Card>
  );
}
