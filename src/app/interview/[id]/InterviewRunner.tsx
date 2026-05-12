"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Play,
  Trophy,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export type SessionChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
};

type Interview = {
  id: string;
  title: string;
  totalSec: number;
  status: "scheduled" | "in_progress" | "completed" | "abandoned";
  shareToken: string;
  startedAtIso: string | null;
  finishedAtIso: string | null;
};

type Attempt = {
  challengeId: string;
  status: "passed" | "failed" | "in_progress" | "abandoned";
  durationSec: number | null;
};

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

export default function InterviewRunner({
  interview,
  challenges,
  attempts,
  interviewerView,
}: {
  interview: Interview;
  challenges: SessionChallenge[];
  attempts: Attempt[];
  interviewerView: boolean;
}) {
  const [status, setStatus] = useState(interview.status);
  const [startedAt, setStartedAt] = useState<string | null>(interview.startedAtIso);

  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (status !== "in_progress" || !startedMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status, startedMs]);

  const elapsedSec = startedMs ? Math.floor((now - startedMs) / 1000) : 0;
  const remainingSec = Math.max(0, interview.totalSec - elapsedSec);
  const expired = status === "in_progress" && remainingSec === 0;

  // Auto-end when timer expires.
  useEffect(() => {
    if (expired && !interviewerView) void finish("completed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  // Map best status per challenge.
  const attemptByChallenge = useMemo(() => {
    const out = new Map<string, Attempt["status"]>();
    for (const a of attempts) {
      const prev = out.get(a.challengeId);
      if (a.status === "passed" || !prev) out.set(a.challengeId, a.status);
    }
    return out;
  }, [attempts]);

  const passedCount = useMemo(() => {
    let n = 0;
    for (const c of challenges) if (attemptByChallenge.get(c.id) === "passed") n++;
    return n;
  }, [challenges, attemptByChallenge]);

  async function start() {
    try {
      const res = await fetch(`/api/interview/${interview.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "in_progress",
          startedAt: new Date().toISOString(),
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const iso = new Date().toISOString();
      setStartedAt(iso);
      setStatus("in_progress");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't start", { description: msg });
    }
  }

  async function finish(target: "completed" | "abandoned") {
    try {
      const res = await fetch(`/api/interview/${interview.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: target, finishedAt: new Date().toISOString() }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(target);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't update status", { description: msg });
    }
  }

  async function copyShareLink() {
    const url = `${window.location.origin}/interview/${interview.id}?token=${interview.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Interviewer link copied", { description: url });
    } catch {
      toast(url);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/challenges"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="flex flex-wrap items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center shrink-0">
          <Trophy className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black tracking-[0.2em] text-muted uppercase mb-0.5 flex items-center gap-2">
            Interview Session
            {interviewerView && (
              <span className="text-accent normal-case tracking-normal font-semibold flex items-center gap-1">
                <Eye className="w-3 h-3" /> Interviewer view
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-fg">{interview.title}</h1>
        </div>

        {!interviewerView && (
          <button
            onClick={copyShareLink}
            className="px-3.5 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5"
            title="Copy a read-only link for your interviewer"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Share with interviewer
          </button>
        )}
      </div>

      {/* Status / Timer / Score row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Stat
          label="Status"
          value={
            status === "scheduled"
              ? "Not started"
              : status === "in_progress"
                ? "In progress"
                : status === "completed"
                  ? "Completed"
                  : "Abandoned"
          }
          accent={status === "in_progress" ? "amber" : status === "completed" ? "emerald" : "muted"}
        />
        <Stat
          label="Time remaining"
          value={status === "scheduled" ? formatDuration(interview.totalSec) : formatDuration(remainingSec)}
          accent={remainingSec < 60 && status === "in_progress" ? "rose" : "fg"}
        />
        <Stat
          label="Score"
          value={`${passedCount}/${challenges.length}`}
          accent={passedCount === challenges.length && challenges.length > 0 ? "emerald" : "fg"}
        />
      </div>

      {/* Start CTA */}
      {status === "scheduled" && !interviewerView && (
        <div className="mb-8 p-5 rounded-xl border border-accent/30 bg-accent/5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-fg mb-0.5">Ready when you are.</div>
            <div className="text-xs text-muted">
              The clock starts as soon as you click. Hard limit: {formatDuration(interview.totalSec)}.
            </div>
          </div>
          <button
            onClick={start}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)]"
          >
            <Play className="w-4 h-4 fill-current" />
            Start clock
          </button>
        </div>
      )}

      {/* Challenge queue */}
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
        Challenge queue
      </h2>
      <ul className="flex flex-col gap-3">
        {challenges.map((c, idx) => {
          const result = attemptByChallenge.get(c.id);
          const passed = result === "passed";
          const attempted = !!result;
          const canEnter = status === "in_progress" && !interviewerView;
          const href = canEnter ? `/challenges/${c.slug}/attempt?session=${interview.id}` : null;
          return (
            <li
              key={c.id}
              className={`group flex items-center gap-4 p-4 rounded-xl border transition ${
                passed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : attempted
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-surface"
              }`}
            >
              <span className="text-sm font-mono text-muted tabular-nums w-6 text-right">
                {idx + 1}.
              </span>
              <div className="shrink-0">
                {passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : result === "failed" ? (
                  <XCircle className="w-5 h-5 text-rose-500/60" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted/30" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate">
                  {c.title}
                </div>
                <div className="text-[10px] text-muted/60">
                  {c.estimatedMinutes}m estimate
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${difficultyBg[c.difficulty]} ${difficultyColor[c.difficulty]} shrink-0`}
              >
                {c.difficulty}
              </div>
              {href ? (
                <Link
                  href={href}
                  className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold transition shrink-0 inline-flex items-center gap-1"
                >
                  {passed ? "Revisit" : attempted ? "Resume" : "Start"}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <span className="text-[11px] text-muted/40 shrink-0">
                  {status === "scheduled" ? "Locked" : interviewerView ? "View only" : "—"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* End session */}
      {status === "in_progress" && !interviewerView && (
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted">
            <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
            {formatDuration(remainingSec)} remaining
          </div>
          <button
            onClick={() => finish("completed")}
            className="px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-sm font-bold text-fg transition"
          >
            End session
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="mt-10 pt-6 border-t border-border p-5 rounded-xl bg-emerald-500/5 border-emerald-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-black text-fg">Session complete</h2>
          </div>
          <p className="text-sm text-muted">
            Final score: <span className="text-fg font-bold tabular-nums">{passedCount}/{challenges.length}</span> challenges passed.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "rose" | "fg" | "muted";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "amber"
        ? "text-amber-500"
        : accent === "rose"
          ? "text-rose-500 animate-pulse"
          : accent === "muted"
            ? "text-muted"
            : "text-fg";
  return (
    <div className="p-4 rounded-xl border border-border bg-surface/50">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">
        {label}
      </div>
      <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
