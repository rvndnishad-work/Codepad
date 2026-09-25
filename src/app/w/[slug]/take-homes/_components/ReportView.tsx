"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock,
  Code2,
  FlaskConical,
  Mail,
  PlayCircle,
  X,
  XCircle,
} from "lucide-react";
import type { ReportQuestion, TakeHomeReport } from "@/lib/take-home/report-server";
import { TAKE_HOME_PASS, type IntegrityLevel, type Tone } from "@/lib/take-home/status";
import type { RejectReason } from "@/lib/crm/stages";
import { plural, relativeTime } from "@/lib/workspace/display";
import { Avatar, Btn, fmtDate, stageLabel, useToasts } from "../../candidates/_components/ui";
import { PassOverrideDialog, RejectDialog } from "../../candidates/_components/dialogs";
import { bulkCandidatesAction } from "../../candidates/manage-actions";
import { RowActions, ScoreMark, StateDot, ToneChip } from "./kit";

// The diff view is heavy and browser-only.
const CodeTab = dynamic(() => import("../../ai-interviews/_components/report/CodeTab"), {
  ssr: false,
  loading: () => <div className="h-[480px] rounded-xl border border-border bg-surface animate-pulse" />,
});

export type ReportTab = "code" | "tests" | "replay";

const INTEGRITY_TONE: Record<IntegrityLevel, Tone> = { clean: "success", some: "warning", high: "danger", none: "neutral" };

function fmtWhen(iso: string | null): string {
  if (!iso) return "Not yet";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtMin(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.round(sec / 60);
  return m < 1 ? "under a minute" : `${m} min`;
}

export default function ReportView({
  slug,
  report: r,
  active,
  tab,
  now,
  canDecide,
  canCreate,
}: {
  slug: string;
  report: TakeHomeReport;
  active: string;
  tab: ReportTab;
  now: string;
  canDecide: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/take-homes`;
  const at = new Date(now);
  const [busy, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [rejecting, setRejecting] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const firstName = r.candidate.name.split(/\s+/)[0] || r.candidate.name;
  const question = r.questions.find((q) => q.key === active) ?? r.questions[0];
  const qIndex = question ? r.questions.indexOf(question) : -1;
  const submitted = r.state === "submitted";
  const canAct = canDecide && submitted && !!r.candidate.id && !r.decision;
  const below = r.score == null || r.score < TAKE_HOME_PASS;
  const overrideReason = r.score == null ? "The take home has no score." : below ? `Score ${r.score} is below the bar of ${TAKE_HOME_PASS}.` : null;

  const hrefFor = (patch: { q?: string; tab?: ReportTab }) => {
    const sp = new URLSearchParams();
    const q = patch.q ?? question?.key;
    const t = patch.tab ?? tab;
    if (q && q !== r.questions[0]?.key) sp.set("q", q);
    if (t !== "code") sp.set("tab", t);
    const s = sp.toString();
    return s ? `${base}/${r.id}?${s}` : `${base}/${r.id}`;
  };
  const prev = r.nav.prevId ? `${base}/${r.nav.prevId}` : null;
  const next = r.nav.nextId ? `${base}/${r.nav.nextId}` : null;

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

  // Keyboard review: J and K move through the queue, P passes, N opens Not passed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || rejecting || overriding) return;
      if (e.key === "j" && next) router.push(next);
      else if (e.key === "k" && prev) router.push(prev);
      else if (e.key === "p" && canAct) pass();
      else if (e.key === "n" && canAct) setRejecting(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-5">
      <Link href={base} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Back to review
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 animate-fade-in motion-reduce:animate-none">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <span className="hidden sm:block">
            <Avatar name={r.candidate.name} size={48} />
          </span>
          <div className="min-w-0 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-fg">{r.candidate.name}</h1>
              <StateDot state={r.state} decision={r.decision} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
              <span>
                {r.title}
                {r.template && r.template.name !== r.title ? `, from ${r.template.name}` : ""}
              </span>
              <Sep />
              <span>
                {plural(r.questions.length, "question")}
                {r.timeUsedMin != null ? `, ${r.timeUsedMin} of ${r.timeBudgetMin} min` : `, ${r.timeBudgetMin} min`}
              </span>
              {r.submittedAt && (
                <>
                  <Sep />
                  <span>Submitted {relativeTime(r.submittedAt, at).toLowerCase()}</span>
                </>
              )}
              {r.peers > 0 && (
                <>
                  <Sep />
                  <Link href={`${base}/all?filter=all&q=${encodeURIComponent(r.title)}`} className="text-secondary-soft hover:underline">
                    Compare with {plural(r.peers, "other")}
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
          <div className="flex items-center gap-2">
            <Btn icon={ChevronLeft} aria-label="Previous take home" href={prev ?? undefined} disabled={!prev} />
            <span className="text-[13px] text-subtle tabular-nums">{r.nav.position ? `${r.nav.position} of ${r.nav.total}` : `${r.nav.total} to review`}</span>
            <Btn icon={ChevronRight} aria-label="Next take home" href={next ?? undefined} disabled={!next} />
          </div>
        )}
      </header>

      <DecisionBar
        r={r}
        slug={slug}
        firstName={firstName}
        canDecide={canDecide}
        canCreate={canCreate}
        busy={busy}
        onPass={pass}
        onReject={() => setRejecting(true)}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
          {r.questions.length > 1 && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {r.questions.map((q, i) => (
                <QuestionCard key={q.key} q={q} index={i} on={q.key === question?.key} href={hrefFor({ q: q.key })} />
              ))}
            </div>
          )}

          {question && (
            <>
              {r.questions.length === 1 && (
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[17px] font-semibold text-fg">{question.title}</h2>
                  <span className="text-[13px] text-muted">{questionMeta(question)}</span>
                </div>
              )}
              {question.kind === "challenge" ? (
                <>
                  <nav aria-label="Answer views" className="flex gap-1 border-b border-border overflow-x-auto">
                    {(
                      [
                        ["code", "Code", Code2],
                        ["tests", question.answer?.total ? `Tests ${question.answer.passed ?? 0} of ${question.answer.total}` : "Tests", FlaskConical],
                        ["replay", "Replay", PlayCircle],
                      ] as const
                    ).map(([id, label, Icon]) => (
                      <Link
                        key={id}
                        href={hrefFor({ tab: id })}
                        scroll={false}
                        aria-current={tab === id ? "page" : undefined}
                        className={`inline-flex items-center gap-2 h-10 px-3.5 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors ${
                          tab === id ? "border-secondary text-fg font-medium" : "border-transparent text-muted hover:text-fg"
                        }`}
                      >
                        <Icon className="w-[15px] h-[15px]" aria-hidden />
                        {label}
                      </Link>
                    ))}
                  </nav>
                  {!question.answer ? (
                    <Empty>
                      {r.state === "not_started" || r.state === "in_progress"
                        ? `${firstName} has not submitted question ${qIndex + 1} yet.`
                        : `${firstName} did not answer question ${qIndex + 1}.`}
                    </Empty>
                  ) : tab === "code" ? (
                    <CodeTab key={question.key} round={question.answer.code ?? undefined} noun="question" />
                  ) : tab === "tests" ? (
                    <TestsPane key={question.key} q={question} />
                  ) : (
                    <ReplayPane q={question} slug={slug} />
                  )}
                </>
              ) : question.kind === "prompt" ? (
                <PromptPane q={question} firstName={firstName} />
              ) : (
                <Empty>Playground questions are open practice with no tests, so there is nothing to score or show here.</Empty>
              )}
            </>
          )}
        </div>

        <aside className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          <ScoreCard r={r} />
          <IntegrityCard r={r} slug={slug} />
          <Card>
            <h3 className="text-[15px] font-semibold text-fg">Details</h3>
            <dl className="flex flex-col gap-2 text-[13px]" suppressHydrationWarning>
              <Detail label="Sent by" value={r.sentBy ?? "Not recorded"} />
              <Detail label="Sent" value={fmtDate(r.sentAt)} />
              <Detail label="Started" value={fmtWhen(r.startedAt)} />
              <Detail label="Submitted" value={fmtWhen(r.submittedAt)} />
              <Detail label="Deadline" value={r.deadlineAt ? fmtDate(r.deadlineAt) : "None"} />
            </dl>
          </Card>
        </aside>
      </div>

      {canAct && <p className="hidden md:block text-xs text-subtle">Tip: press P to pass, N for not passed, and J and K to move through the queue.</p>}

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
      {toasts}
    </div>
  );
}

function Sep() {
  return <span aria-hidden className="w-1 h-1 rounded-full bg-border-strong" />;
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">{children}</section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-fg text-right">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border-strong bg-surface/50 p-8 text-center text-sm text-muted">{children}</div>;
}

function questionMeta(q: ReportQuestion): string {
  const a = q.answer;
  const parts: string[] = [];
  if (a?.total) parts.push(`${a.passed ?? 0} of ${a.total} tests`);
  if (a?.durationSec != null) parts.push(`${Math.round(a.durationSec / 60)} of ${q.minutes} min`);
  else parts.push(`${q.minutes} min`);
  if (!a) parts.unshift("Not answered");
  return parts.join(", ");
}

function QuestionCard({ q, index, on, href }: { q: ReportQuestion; index: number; on: boolean; href: string }) {
  const score = q.answer?.score ?? null;
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={`group flex flex-col gap-1.5 rounded-xl border px-4 py-3.5 transition ${
        on ? "border-secondary/60 bg-secondary/[0.08] shadow-[inset_0_0_0_1px_rgb(var(--c-accent-2)/0.25)]" : "border-border bg-surface hover:border-border-strong hover:bg-panel/50"
      }`}
    >
      <span className="flex items-center justify-between gap-2 text-xs text-subtle">
        <span>
          Question {index + 1}
          {q.difficulty ? `, ${q.difficulty.toLowerCase()}` : ""}
        </span>
        <span className={`text-[15px] font-semibold tabular-nums ${score == null ? "text-subtle" : score >= TAKE_HOME_PASS ? "text-fg" : "text-warning"}`}>
          {score ?? "None"}
        </span>
      </span>
      <span className="text-sm font-medium text-fg truncate">{q.title}</span>
      <span className="text-[13px] text-muted">{questionMeta(q)}</span>
    </Link>
  );
}

function TestsPane({ q }: { q: ReportQuestion }) {
  const [all, setAll] = useState(false);
  const tests = q.answer?.tests ?? [];
  if (!tests.length) return <Empty>No test results were recorded for this question.</Empty>;
  const failing = tests.filter((t) => t.status !== "passed" && t.status !== "pass");
  const passing = tests.filter((t) => t.status === "passed" || t.status === "pass");
  const shown = all || !failing.length ? [...failing, ...passing] : failing;
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 h-11 border-b border-border">
        <span className="text-sm font-medium text-fg">{failing.length ? "Failing tests" : "All tests pass"}</span>
        <span className="text-[13px] text-muted tabular-nums">
          {passing.length} of {tests.length} passing
        </span>
      </div>
      <ul>
        {shown.map((t, i) => {
          const ok = t.status === "passed" || t.status === "pass";
          return (
            <li key={`${t.name}-${i}`} className="flex gap-3 px-4 py-2.5 border-t border-border first:border-t-0">
              {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-success" aria-label="Passed" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-danger" aria-label="Failed" />}
              <span className="min-w-0 flex flex-col gap-1">
                <span className="text-[13px] text-fg">{t.name}</span>
                {t.error && !ok && <code className="text-xs text-muted font-mono whitespace-pre-wrap break-words">{t.error.slice(0, 400)}</code>}
              </span>
            </li>
          );
        })}
      </ul>
      {failing.length > 0 && passing.length > 0 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="w-full h-10 border-t border-border text-[13px] text-secondary-soft hover:bg-panel/60 transition">
          {all ? "Hide passing tests" : `${plural(passing.length, "passing test")} hidden. Show all`}
        </button>
      )}
    </div>
  );
}

function ReplayPane({ q, slug }: { q: ReportQuestion; slug: string }) {
  const a = q.answer;
  if (!a?.hasReplay || !a.attemptId) return <Empty>No replay was recorded for this question.</Empty>;
  const i = a.integrity;
  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center gap-5">
      <span className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25">
        <PlayCircle className="w-6 h-6" aria-hidden />
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-[15px] font-medium text-fg">Watch the answer being written</p>
        <p className="text-[13px] text-muted leading-relaxed">
          Every keystroke, paste and tab switch{a.durationSec != null ? `, over ${fmtMin(a.durationSec)}` : ""}.
          {i && i.pastes > 0 ? ` ${plural(i.pastes, "large paste")} marked on the timeline.` : ""}
        </p>
      </div>
      <Btn variant="primary" size="md" icon={PlayCircle} href={`/w/${slug}/attempts/${a.attemptId}/replay`}>
        Open replay
      </Btn>
    </div>
  );
}

function PromptPane({ q, firstName }: { q: ReportQuestion; firstName: string }) {
  const p = q.answer?.prompt;
  if (!p) return <Empty>{firstName} did not answer this prompt task.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h3 className="text-[15px] font-semibold text-fg">What {firstName} wrote</h3>
        <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{p.text}</p>
      </Card>
      {p.feedback && (
        <Card>
          <h3 className="text-[15px] font-semibold text-fg">Grader feedback</h3>
          <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{p.feedback}</p>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({ r }: { r: TakeHomeReport }) {
  const scored = r.questions.filter((q) => q.answer?.score != null).length;
  return (
    <Card>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-subtle">Take home score</span>
          <span className={`text-[44px] leading-none font-semibold tracking-tight tabular-nums ${r.score != null && r.score < TAKE_HOME_PASS ? "text-warning" : "text-fg"}`}>
            {r.score ?? "None"}
          </span>
        </div>
        {r.score != null && <ToneChip tone={r.score >= TAKE_HOME_PASS ? "success" : "warning"}>{r.score >= TAKE_HOME_PASS ? "Above bar" : "Below bar"}</ToneChip>}
      </div>
      <div className="flex flex-col gap-1.5">
        <ScoreMark score={r.score} width={260} />
        <div className="relative h-4 text-[11px] text-subtle tabular-nums" aria-hidden>
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${TAKE_HOME_PASS}%` }}>
            Bar {TAKE_HOME_PASS}
          </span>
          <span className="absolute right-0">100</span>
        </div>
      </div>
      <p className="text-xs text-subtle leading-relaxed">
        The average of {scored > 1 ? `the ${scored} scored questions` : "each scored question"}, one attempt per question. Retries after submitting are not
        counted. Passing below the bar is saved as a manual override.
      </p>
    </Card>
  );
}

function IntegrityCard({ r, slug }: { r: TakeHomeReport; slug: string }) {
  const i = r.integrity;
  const replay = r.questions.find((q) => q.answer?.hasReplay && (q.answer.integrity?.pastes ?? 0) > 0) ?? r.questions.find((q) => q.answer?.hasReplay);
  const blur = i.blurSec >= 60 ? `${Math.floor(i.blurSec / 60)} min ${i.blurSec % 60} s` : `${i.blurSec} s`;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-fg">Integrity</h3>
        {i.level === "none" ? <span className="text-xs text-subtle">No data</span> : <ToneChip tone={INTEGRITY_TONE[i.level]}>{i.label}</ToneChip>}
      </div>
      <dl className="flex flex-col gap-2 text-[13px]">
        <Detail label="Large pastes" value={i.level === "none" ? "Not recorded" : String(i.pastes)} />
        <Detail label="Left the tab" value={i.level === "none" ? "Not recorded" : i.blurs ? `${plural(i.blurs, "time")}, ${blur}` : "Never"} />
      </dl>
      {replay?.answer?.attemptId && i.pastes > 0 && (
        <Link href={`/w/${slug}/attempts/${replay.answer.attemptId}/replay`} className="text-[13px] text-secondary-soft hover:underline w-fit">
          Watch the pastes in the replay
        </Link>
      )}
      <p className="text-xs text-subtle leading-relaxed">A prompt to read the code closely, not proof of anything.</p>
    </Card>
  );
}

function DecisionBar({
  r,
  slug,
  firstName,
  canDecide,
  canCreate,
  busy,
  onPass,
  onReject,
}: {
  r: TakeHomeReport;
  slug: string;
  firstName: string;
  canDecide: boolean;
  canCreate: boolean;
  busy: boolean;
  onPass: () => void;
  onReject: () => void;
}) {
  const shell = (tone: string, icon: ReactNode, title: ReactNode, detail: ReactNode, actions: ReactNode) => (
    <section className={`flex flex-wrap items-center gap-4 px-5 py-4 rounded-xl border animate-slide-up motion-reduce:animate-none ${tone}`}>
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-[240px] flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        <p className="text-[13px] text-muted leading-relaxed">{detail}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
  const invite = <RowActions slug={slug} row={r} canCreate={canCreate} />;

  if (r.state === "submitted") {
    if (r.decision) {
      return shell(
        "border-border bg-surface",
        r.decision === "passed" ? <Check className="w-5 h-5 text-success" /> : <X className="w-5 h-5 text-danger" />,
        `${firstName} is marked ${stageLabel(r.decision === "passed" ? "PASSED" : "REJECTED")}`,
        "The decision is on the candidate profile and in the activity log. Change it there if needed.",
        r.candidate.id && <Btn href={`/w/${slug}/candidates/${r.candidate.id}`}>Open profile</Btn>,
      );
    }
    const above = r.score != null && r.score >= TAKE_HOME_PASS;
    const title =
      r.score == null ? `${firstName} submitted without a score` : above ? `${firstName} scored ${r.score}, above the bar of ${TAKE_HOME_PASS}` : `${firstName} scored ${r.score}, below the bar of ${TAKE_HOME_PASS}`;
    const detail = !r.candidate.id
      ? "This take home is not linked to a candidate record, so there is no stage to set."
      : `Tests never pass anyone. Your decision moves ${firstName} to Passed or Not passed in Candidates.${above ? "" : " Passing below the bar is saved as a manual override."}`;
    return shell(
      above ? "border-secondary/35 bg-secondary/[0.07]" : "border-warning/35 bg-warning/[0.05]",
      above ? <CheckCircle2 className="w-5 h-5 text-secondary-soft" /> : <Clock className="w-5 h-5 text-warning" />,
      title,
      detail,
      r.candidate.id && canDecide ? (
        <>
          <Btn size="md" icon={X} disabled={busy} onClick={onReject} title="Not passed (N)">
            Not passed
          </Btn>
          <Btn size="md" variant="primary" icon={Check} disabled={busy} onClick={onPass} title="Pass (P)">
            {above ? "Pass" : "Pass anyway"}
          </Btn>
        </>
      ) : null,
    );
  }

  if (r.state === "in_progress") {
    const done = r.questions.filter((q) => q.answer).length;
    return shell(
      "border-warning/35 bg-warning/[0.06]",
      <span className="relative flex w-3 h-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-60 animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex w-3 h-3 rounded-full bg-warning" />
      </span>,
      `${firstName} is working on it`,
      `${done} of ${r.questions.length} answered so far.${r.deadlineAt ? ` The deadline is ${fmtDate(r.deadlineAt)}.` : ""} The report fills in as they submit each question.`,
      invite,
    );
  }

  if (r.state === "not_started") {
    return shell(
      "border-border bg-surface",
      <Mail className="w-5 h-5 text-muted" />,
      `${firstName} has not started yet`,
      `Sent ${fmtDate(r.sentAt)}.${r.deadlineAt ? ` The link closes ${fmtDate(r.deadlineAt)}.` : ""} Copy the link if the email does not arrive.`,
      invite,
    );
  }

  return shell(
    "border-border bg-surface",
    r.state === "cancelled" ? <XCircle className="w-5 h-5 text-subtle" /> : <CircleDashed className="w-5 h-5 text-subtle" />,
    r.state === "cancelled" ? "This take home was cancelled" : `${firstName} did not submit in time`,
    r.state === "cancelled"
      ? "The candidate link no longer works."
      : `The link closed ${fmtDate(r.deadlineAt)}. Extend the deadline to open the same link again.`,
    r.state === "expired" ? invite : null,
  );
}
