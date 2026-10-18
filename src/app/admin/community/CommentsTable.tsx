"use client";

import { useState } from "react";
import Link from "next/link";
import RelativeTime from "@/components/RelativeTime";
import ConfirmButton from "../content/_components/ConfirmButton";
import Pill from "../content/_components/Pill";
import { deleteComments } from "./actions";

export type CommentRow = {
  type: "blog_comment" | "question_comment";
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  where: { title: string; href: string };
  replies: number;
  isReply: boolean;
  reports: number;
};

const key = (r: { type: string; id: string }) => `${r.type}:${r.id}`;

export default function CommentsTable({ rows, emptyText }: { rows: CommentRow[]; emptyText: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const chosen = rows.filter((r) => selected.has(key(r)));
  const allOn = rows.length > 0 && rows.every((r) => selected.has(key(r)));
  const toggle = (k: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });
  const replyCount = chosen.reduce((n, r) => n + r.replies, 0);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-start gap-3 border-b border-border bg-panel px-4 py-2.5">
          <span className="text-sm text-fg py-1">{selected.size} selected</span>
          <ConfirmButton
            action={async (note) => {
              const res = await deleteComments(chosen.map((r) => ({ type: r.type, id: r.id })), note);
              if (res.ok) setSelected(new Set());
              return res;
            }}
            label={`Delete ${selected.size}`}
            confirmLabel="Delete for good"
            prompt={`Delete ${selected.size} comment${selected.size === 1 ? "" : "s"}${replyCount ? ` and ${replyCount} replies` : ""}? This cannot be undone.`}
            withNote
            notePlaceholder="Note for the audit log (optional)"
            tone="danger"
          />
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-muted hover:text-fg py-1">
            Clear
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-panel text-xs text-muted">
            <tr>
              <th className="pl-4 pr-2 py-2.5 w-8 text-left">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map(key)) : new Set())}
                  className="accent-accent"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-2.5 text-left font-medium">Comment</th>
              <th className="px-3 py-2.5 text-left font-medium">Author</th>
              <th className="px-3 py-2.5 text-left font-medium">On</th>
              <th className="px-3 py-2.5 text-left font-medium">Posted</th>
              <th className="px-3 py-2.5 pr-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={key(r)} className="align-top hover:bg-panel/60">
                <td className="pl-4 pr-2 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(key(r))}
                    onChange={(e) => toggle(key(r), e.target.checked)}
                    className="accent-accent"
                    aria-label="Select comment"
                  />
                </td>
                <td className="px-3 py-3 max-w-md">
                  <p className="text-fg whitespace-pre-wrap break-words line-clamp-4">{r.content}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Pill tone="off">{r.type === "blog_comment" ? (r.isReply ? "Blog reply" : "Blog") : "Question"}</Pill>
                    {r.replies > 0 && <Pill tone="off">{r.replies} replies</Pill>}
                    {r.reports > 0 && <Pill tone="bad">{r.reports} open report{r.reports === 1 ? "" : "s"}</Pill>}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Link href={`/admin/users/${r.user.id}`} className="text-fg hover:underline">
                    {r.user.name ?? "No name"}
                  </Link>
                  <div className="text-xs text-muted">{r.user.email}</div>
                </td>
                <td className="px-3 py-3 max-w-[220px]">
                  <Link href={r.where.href} target="_blank" className="text-fg hover:underline line-clamp-2">
                    {r.where.title}
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted whitespace-nowrap">
                  <RelativeTime iso={r.createdAt} />
                </td>
                <td className="px-3 py-3 pr-4 text-right">
                  <ConfirmButton
                    action={(note) => deleteComments([{ type: r.type, id: r.id }], note)}
                    label="Delete"
                    confirmLabel="Delete for good"
                    prompt={r.replies ? `Delete this comment and its ${r.replies} replies?` : "Delete this comment?"}
                    withNote
                    notePlaceholder="Note for the audit log (optional)"
                    tone="danger"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
