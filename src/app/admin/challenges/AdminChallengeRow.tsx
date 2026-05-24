"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Edit3, Trash2, ExternalLink } from "lucide-react";
import { BulkRowCheckbox } from "./ChallengesBulkTable";

type Row = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string | null;
  published: boolean;
  attempts: number;
};

const difficultyClass: Record<string, string> = {
  easy: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  hard: "text-rose-500 bg-rose-500/10 border-rose-500/30",
};

export default function AdminChallengeRow({ challenge }: { challenge: Row }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${challenge.title}"? This also removes all attempts.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/challenges/${challenge.id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      toast.success("Challenge deleted");
      router.refresh();
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/challenges/${challenge.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: !challenge.published }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      toast.success(challenge.published ? "Unpublished" : "Published");
      router.refresh();
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div 
      className={`group transition-all duration-200 border-b border-border last:border-b-0 hover:bg-panel/5 p-5 lg:p-0 lg:grid lg:grid-cols-[40px_3fr_1.2fr_1.2fr_1fr_1.2fr_2.5fr] lg:items-center lg:px-6 lg:py-4`}
    >
      {/* Column 1: Checkbox */}
      <div className="flex items-center lg:justify-center mb-3 lg:mb-0">
        <BulkRowCheckbox id={challenge.id} />
        <span className="lg:hidden text-[10px] uppercase font-bold text-muted ml-2 tracking-wider">Select Challenge</span>
      </div>

      {/* Column 2: Title / Slug */}
      <div className="min-w-0 mb-3 lg:mb-0">
        <div className="font-bold text-fg text-sm lg:text-base group-hover:text-accent transition">{challenge.title}</div>
        <div className="text-[11px] text-muted font-mono">{challenge.slug}</div>
      </div>

      {/* Column 3: Difficulty */}
      <div className="mt-2 lg:mt-0 flex items-center lg:block">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-24 mr-2 block">Difficulty:</span>
        <span
          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
            difficultyClass[challenge.difficulty] ?? ""
          }`}
        >
          {challenge.difficulty}
        </span>
      </div>

      {/* Column 4: Category */}
      <div className="mt-2 lg:mt-0 flex items-center lg:block">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-24 mr-2 block">Category:</span>
        <span className="text-xs font-mono text-muted lg:text-fg">{challenge.category ?? "—"}</span>
      </div>

      {/* Column 5: Attempts */}
      <div className="mt-2 lg:mt-0 flex items-center lg:block">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-24 mr-2 block">Attempts:</span>
        <span className="text-xs font-mono text-muted lg:text-fg tabular-nums">{challenge.attempts}</span>
      </div>

      {/* Column 6: Status */}
      <div className="mt-2 lg:mt-0 flex items-center lg:block">
        <span className="lg:hidden text-[9px] uppercase tracking-wider font-bold text-muted w-24 mr-2 block">Status:</span>
        <button
          onClick={togglePublished}
          disabled={busy}
          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50 ${
            challenge.published
              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
              : "text-muted bg-surface border-border hover:bg-elevated"
          }`}
        >
          {challenge.published ? "Published" : "Draft"}
        </button>
      </div>

      {/* Column 7: Actions */}
      <div className="mt-4 lg:mt-0 flex items-center justify-end gap-2 border-t border-border pt-3 lg:border-none lg:pt-0">
        <Link
          href={`/challenges/${challenge.slug}`}
          target="_blank"
          className="p-2 rounded-lg border border-border bg-bg hover:bg-elevated flex items-center justify-center text-muted hover:text-fg hover:border-border-strong transition"
          title="View public page"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={`/admin/challenges/${challenge.id}/edit`}
          className="p-2 rounded-lg border border-border bg-bg hover:bg-elevated flex items-center justify-center text-muted hover:text-fg hover:border-border-strong transition"
          title="Edit"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="p-2 rounded-lg border border-rose-500/30 bg-bg hover:bg-rose-500/10 flex items-center justify-center text-rose-500 transition disabled:opacity-50"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
