"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Youtube, Linkedin, Check, X } from "lucide-react";
import { approveCreatorApplicationAction, rejectCreatorApplicationAction } from "./actions";

export type AppRow = {
  id: string;
  userName: string | null;
  userEmail: string | null;
  platform: string;
  profileUrl: string;
  followerCount: number;
  note: string | null;
  status: string;
  reviewNote: string | null;
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "text-amber-500 bg-amber-500/10",
  APPROVED: "text-emerald-500 bg-emerald-500/10",
  REJECTED: "text-rose-500 bg-rose-500/10",
};

export default function CreatorApplicationRow({ app }: { app: AppRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const Icon = app.platform === "youtube" ? Youtube : Linkedin;
  const decided = app.status !== "PENDING";

  async function decide(kind: "approve" | "reject") {
    if (kind === "reject" && !note.trim() && !window.confirm("Reject without a note?")) return;
    setBusy(true);
    try {
      if (kind === "approve") await approveCreatorApplicationAction(app.id, note || undefined);
      else await rejectCreatorApplicationAction(app.id, note || undefined);
      toast.success(kind === "approve" ? "Approved — CREATOR role granted." : "Rejected.");
      router.refresh();
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-fg truncate">{app.userName || "Unnamed"}</div>
          <div className="text-[11px] text-muted font-mono truncate">{app.userEmail}</div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_TONE[app.status] ?? "text-muted bg-panel/60"}`}>
          {app.status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Icon className="w-4 h-4 text-muted shrink-0" />
        <a href={app.profileUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1 truncate">
          {app.profileUrl} <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        <span className="ml-auto font-semibold text-fg shrink-0">{app.followerCount.toLocaleString()} followers</span>
      </div>

      {app.note && <p className="text-xs text-muted italic">“{app.note}”</p>}
      {decided && app.reviewNote && <p className="text-xs text-muted">Reviewer note: {app.reviewNote}</p>}

      {!decided && (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (shown to applicant)"
            className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-fg text-[11px] focus:outline-none focus:border-accent/40"
          />
          <button onClick={() => decide("reject")} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50">
            <X className="w-3 h-3" /> Reject
          </button>
          <button onClick={() => decide("approve")} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50">
            <Check className="w-3 h-3" /> Approve
          </button>
        </div>
      )}
    </div>
  );
}
