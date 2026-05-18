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
    <tr className="hover:bg-elevated/40 transition">
      <td className="px-6 py-4 align-top">
        <Link
          href={`/u/${attempt.user.id}`}
          className="text-sm text-fg hover:text-accent transition truncate block max-w-[180px]"
        >
          {attempt.user.name ?? "Anonymous"}
        </Link>
        <div className="text-[11px] text-muted truncate max-w-[180px]">{attempt.user.email}</div>
      </td>
      <td className="px-6 py-4 align-top">
        <div className="font-bold text-fg truncate max-w-[260px]">
          {attempt.challenge.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
          <span className="font-mono">/{attempt.challenge.slug}</span>
          <span className="text-muted/30">·</span>
          <span className="uppercase tracking-wider">{attempt.challenge.difficulty}</span>
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
      </td>
      <td className="px-6 py-4 align-top">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.color}`}
        >
          <Icon className="w-3 h-3" />
          {attempt.status.replace("_", " ")}
        </span>
      </td>
      <td className="px-6 py-4 align-top text-center">
        {testRatio ? (
          <span className="text-sm font-bold text-fg tabular-nums">{testRatio}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-6 py-4 align-top">
        <div className="text-sm font-bold text-fg tabular-nums">
          {formatDuration(attempt.durationSec)}
        </div>
        <div className="text-[10px] text-muted">{attempt.startedAt.toLocaleDateString()}</div>
      </td>
      <td className="px-6 py-4 align-top text-right">
        <div className="inline-flex items-center gap-1">
          {attempt.sessionId && (
            <Link
              href={`/admin/interviews/${attempt.sessionId}`}
              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-elevated transition"
              title="View interview session"
            >
              <Briefcase className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            href={`/admin/attempts/${attempt.id}`}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg hover:bg-elevated transition"
          >
            View
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-40"
            title="Delete attempt"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
