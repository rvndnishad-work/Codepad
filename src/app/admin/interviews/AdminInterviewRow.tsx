"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";

interface AdminInterviewRowProps {
  session: {
    id: string;
    title: string;
    status: string;
    totalSec: number;
    shareToken: string;
    challengeCount: number;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  };
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  in_progress: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  completed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  abandoned: "text-muted bg-muted/10 border-border",
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

export default function AdminInterviewRow({ session }: AdminInterviewRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${session.title}"? Attempts linked to this session keep their data but lose the session reference. This action can't be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/interviews/${session.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
    } catch {
      alert("Failed to delete interview session.");
      setIsDeleting(false);
    }
  }

  const statusClass = STATUS_COLOR[session.status] ?? STATUS_COLOR.abandoned;

  return (
    <tr className="hover:bg-elevated/40 transition">
      <td className="px-6 py-4 align-top">
        <div className="font-bold text-fg">{session.title}</div>
        <div className="text-[11px] text-muted/70 mt-0.5 font-mono">
          {session.id.slice(0, 12)}…
        </div>
      </td>
      <td className="px-6 py-4 align-top">
        <Link
          href={`/u/${session.user.id}`}
          className="text-sm text-fg hover:text-accent transition truncate block max-w-[180px]"
        >
          {session.user.name ?? "Anonymous"}
        </Link>
        <div className="text-[11px] text-muted truncate max-w-[180px]">
          {session.user.email}
        </div>
      </td>
      <td className="px-6 py-4 align-top">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass}`}
        >
          {session.status.replace("_", " ")}
        </span>
      </td>
      <td className="px-6 py-4 align-top text-center">
        <div className="text-sm font-bold text-fg tabular-nums">
          {session.challengeCount}
        </div>
        <div className="text-[10px] text-muted">{formatDuration(session.totalSec)} cap</div>
      </td>
      <td className="px-6 py-4 align-top">
        <div className="text-[11px] text-muted">
          {session.createdAt.toLocaleDateString()}
        </div>
        {session.finishedAt && (
          <div className="text-[10px] text-muted/60">
            done {session.finishedAt.toLocaleDateString()}
          </div>
        )}
      </td>
      <td className="px-6 py-4 align-top text-right">
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/admin/interviews/${session.id}`}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg hover:bg-elevated transition"
          >
            View
          </Link>
          <Link
            href={`/interview/${session.id}?token=${session.shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-elevated transition"
            title="Open interviewer view"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-40"
            title="Delete session"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}
