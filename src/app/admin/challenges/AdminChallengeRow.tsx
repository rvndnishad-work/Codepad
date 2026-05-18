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
    <tr className="border-t border-border hover:bg-elevated/30 transition">
      <td className="pl-4 pr-2 py-3 w-8">
        <BulkRowCheckbox id={challenge.id} />
      </td>
      <td className="px-4 py-3">
        <div className="font-bold text-fg">{challenge.title}</div>
        <div className="text-[11px] text-muted font-mono">{challenge.slug}</div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
            difficultyClass[challenge.difficulty] ?? ""
          }`}
        >
          {challenge.difficulty}
        </span>
      </td>
      <td className="px-4 py-3 text-muted text-xs">{challenge.category ?? "—"}</td>
      <td className="px-4 py-3 text-muted text-xs tabular-nums">{challenge.attempts}</td>
      <td className="px-4 py-3">
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
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/challenges/${challenge.slug}`}
            target="_blank"
            className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-elevated flex items-center justify-center text-muted hover:text-fg transition"
            title="View public page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/admin/challenges/${challenge.id}/edit`}
            className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-elevated flex items-center justify-center text-muted hover:text-fg transition"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="w-8 h-8 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 flex items-center justify-center text-rose-500 transition disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
