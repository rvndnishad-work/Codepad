"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { setQuestionStatus, deleteQuestion } from "./actions";
import { difficultyClasses } from "@/lib/interview-questions/shared";

type Q = {
  id: string;
  title: string;
  slug: string;
  status: string;
  difficulty: string;
  technology: string | null;
  views: number;
  company: string | null;
};

const STATUS_CLASS: Record<string, string> = {
  published: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  draft: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  archived: "text-rose-500 bg-rose-500/10 border-rose-500/20",
};

export default function QuestionAdminRow({ q }: { q: Q }) {
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState(false);
  if (removed) return null;

  return (
    <tr className={`hover:bg-bg/30 ${pending ? "opacity-50" : ""}`}>
      <td className="p-3">
        <div className="font-bold truncate max-w-[280px]">{q.title}</div>
        <span className={`inline-block mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${difficultyClasses(q.difficulty)}`}>{q.difficulty}</span>
      </td>
      <td className="p-3 hidden sm:table-cell text-muted">{q.company ?? "—"}</td>
      <td className="p-3 hidden md:table-cell text-muted">{q.technology ?? "—"}</td>
      <td className="p-3">
        <select
          value={q.status}
          disabled={pending}
          onChange={(e) => start(() => setQuestionStatus(q.id, e.target.value as "draft" | "published" | "archived"))}
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border bg-transparent cursor-pointer ${STATUS_CLASS[q.status] ?? STATUS_CLASS.draft}`}
        >
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/interview-question/${q.slug}`} target="_blank" className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-fg" title="View">
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link href={`/admin/interview-questions/${q.id}`} className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-accent" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete “${q.title}”? This cannot be undone.`)) return;
              start(async () => {
                await deleteQuestion(q.id);
                setRemoved(true);
              });
            }}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted hover:text-rose-500"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
