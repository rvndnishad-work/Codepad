"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Square,
  Briefcase,
} from "lucide-react";

interface AdminAttemptRowProps {
  attempt: {
    id: string;
    status: string;
    durationSec: number | null;
    testPassed: number | null;
    testTotal: number | null;
    startedAt: Date;
    finishedAt: Date | null;
    sessionId: string | null;
    user: { id: string; name: string | null; email: string | null };
    challenge: { id: string; slug: string; title: string; difficulty: string };
    step: { id: string; title: string | null; position: number } | null;
    takeHomeWorkspace: { name: string; slug: string } | null;
  };
}

const STATUS_BADGE: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  passed: { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  failed: { color: "text-red-500 bg-red-500/10 border-red-500/20", icon: XCircle },
  in_progress: { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
  abandoned: { color: "text-muted bg-muted/10 border-border", icon: Square },
};

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m ${sec % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export default function AdminAttemptRow({ attempt }: AdminAttemptRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "Delete this attempt? This removes the submitted code and test results permanently."
      )
    )
      return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/attempts/${attempt.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Failed to delete attempt.");
      setIsDeleting(false);
    }
  }

  const badge = STATUS_BADGE[attempt.status] ?? STATUS_BADGE.abandoned;
  const Icon = badge.icon;
  const testRatio =
    attempt.testTotal != null && attempt.testTotal > 0
      ? `${attempt.testPassed ?? 0}/${attempt.testTotal}`
      : null;

  return (
    <div 
      className={`group transition-all duration-200 border-b border-border last:border-b-0 hover:bg-panel/5 p-5 lg:p-0 lg:grid lg:grid-cols-[1.8fr_2.2fr_1.2fr_1fr_1.5fr_1.5fr] lg:items-center lg:px-6 lg:py-4`}
    >
      {/* Column 1: User */}
      <div className="min-w-0">
        <Link
          href={`/u/${attempt.user.id}`}
          className="text-sm font-bold text-fg hover:text-accent transition truncate block"
        >
          {attempt.user.name ?? "Anonymous"}
        </Link>
        <div className="text-[11px] text-muted truncate">{attempt.user.email}</div>
      </div>

      {/* Column 2: Challenge */}
      <div className="min-w-0 mt-2 lg:mt-0">
        <div className="font-bold text-fg text-sm truncate">
          {attempt.challenge.title}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-muted">
          <span className="font-mono">/{attempt.challenge.slug}</span>
          <span className="text-muted/30">·</span>
          <span className="uppercase tracking-wider text-[9px]">{attempt.challenge.difficulty}</span>
          {attempt.step && (
            <>
              <span className="text-muted/30">·</span>
              <span>
                step {attempt.step.position + 1}
                {attempt.step.title ? `: ${attempt.step.title}` : ""}
              </span>
            </>
          )}
        </div>
        {attempt.takeHomeWorkspace && (
          <div className="mt-1.5 flex items-center">
            <Link
              href={`/w/${attempt.takeHomeWorkspace.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/15 text-[9px] font-black uppercase tracking-wider border border-purple-500/20 shadow-sm transition-all duration-200"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
              </span>
              Take-Home: {attempt.takeHomeWorkspace.name}
            </Link>
          </div>
        )}
      </div>

      {/* Column 3: Status */}
      <div className="mt-3 lg:mt-0 flex items-center lg:block">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-20 mr-2 block">Status:</span>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.color}`}
        >
          <Icon className="w-3 h-3" />
          {attempt.status.replace("_", " ")}
        </span>
      </div>

      {/* Column 4: Tests */}
      <div className="mt-2 lg:mt-0 flex items-center lg:block lg:text-center">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-20 mr-2 block">Tests:</span>
        {testRatio ? (
          <span className="text-sm font-mono font-bold text-fg tabular-nums">{testRatio}</span>
        ) : (
          <span className="text-xs font-mono text-muted">—</span>
        )}
      </div>

      {/* Column 5: Duration / Started */}
      <div className="mt-2 lg:mt-0 flex items-center lg:block">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-20 mr-2 block">Started:</span>
        <div>
          <div className="text-sm font-mono font-bold text-fg tabular-nums inline-block lg:block mr-2 lg:mr-0">
            {formatDuration(attempt.durationSec)}
          </div>
          <div className="text-[10px] text-muted inline-block lg:block">
            {new Date(attempt.startedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Column 6: Actions */}
      <div className="mt-4 lg:mt-0 flex items-center justify-end gap-2 border-t border-border pt-3 lg:border-none lg:pt-0">
        {attempt.sessionId && (
          <Link
            href={`/admin/interviews/${attempt.sessionId}`}
            className="p-2 rounded-lg border border-border-strong bg-bg hover:bg-elevated text-muted hover:text-accent hover:border-accent/40 transition"
            title="View interview session"
          >
            <Briefcase className="w-3.5 h-3.5" />
          </Link>
        )}
        <Link
          href={`/admin/attempts/${attempt.id}`}
          className="p-2 px-3 rounded-lg border border-border-strong bg-bg hover:bg-elevated text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg hover:border-border-strong transition"
        >
          View
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg border border-rose-500/30 bg-bg hover:bg-rose-500/10 text-muted hover:text-rose-500 transition disabled:opacity-40"
          title="Delete attempt"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
