"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, ExternalLink, MessageCircle, CornerDownRight } from "lucide-react";

interface AdminCommentRowProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    parentId: string | null;
    replyCount: number;
    user: { id: string; name: string | null; email: string | null };
    post: { id: string; slug: string; title: string };
  };
}

export default function AdminCommentRow({ comment }: AdminCommentRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const note = comment.replyCount > 0
      ? ` This will also remove ${comment.replyCount} repl${comment.replyCount === 1 ? "y" : "ies"}.`
      : "";
    if (!confirm(`Delete this comment?${note} This action can't be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Failed to delete comment.");
      setIsDeleting(false);
    }
  }

  return (
    <tr className="hover:bg-elevated/40 transition">
      <td className="px-6 py-4 align-top">
        <Link
          href={`/u/${comment.user.id}`}
          className="text-sm text-fg hover:text-accent transition truncate block max-w-[180px]"
        >
          {comment.user.name ?? "Anonymous"}
        </Link>
        <div className="text-[11px] text-muted truncate max-w-[180px]">{comment.user.email}</div>
      </td>
      <td className="px-6 py-4 align-top max-w-[420px]">
        {comment.parentId && (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted/60 mb-1">
            <CornerDownRight className="w-3 h-3" />
            reply
          </div>
        )}
        <p className="text-sm text-fg/90 leading-snug line-clamp-3 whitespace-pre-line break-words">
          {comment.content}
        </p>
        {comment.replyCount > 0 && (
          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            <MessageCircle className="w-3 h-3" />
            {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
          </div>
        )}
      </td>
      <td className="px-6 py-4 align-top max-w-[260px]">
        <Link
          href={`/blog/${comment.post.slug}`}
          className="font-bold text-fg hover:text-accent transition truncate block"
        >
          {comment.post.title}
        </Link>
        <div className="text-[11px] text-muted/70 font-mono truncate">/{comment.post.slug}</div>
      </td>
      <td className="px-6 py-4 align-top">
        <div className="text-[11px] text-muted">{comment.createdAt.toLocaleDateString()}</div>
        <div className="text-[10px] text-muted/60">
          {comment.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </td>
      <td className="px-6 py-4 align-top text-right">
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/blog/${comment.post.slug}#comment-${comment.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-elevated transition"
            title="Open in context"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-40"
            title="Delete comment"
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
