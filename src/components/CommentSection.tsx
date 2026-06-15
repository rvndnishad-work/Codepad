"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Send, Trash2, MessageSquare, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import RelativeTime from "./RelativeTime";

export type CommentNode = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export default function CommentSection({
  postId,
  initialComments,
  signedIn,
  currentUserId,
  isAdmin,
  postUrl,
  deleteUrlBase = "/api/comments",
  heading = "Responses",
  placeholder = "What are your thoughts?",
}: {
  postId: string;
  initialComments: CommentNode[];
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  /** POST endpoint for new comments. Defaults to the blog endpoint. */
  postUrl?: string;
  /** Base for DELETE `${deleteUrlBase}/${commentId}`. Defaults to /api/comments. */
  deleteUrlBase?: string;
  heading?: string;
  placeholder?: string;
}) {
  const createUrl = postUrl ?? `/api/blogs/${postId}/comments`;
  const router = useRouter();
  const pathname = usePathname();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const created = (await res.json()) as CommentNode;
      setComments((prev) => [
        ...prev,
        {
          id: created.id,
          content: created.content,
          createdAt:
            typeof (created as any).createdAt === "string"
              ? (created as any).createdAt
              : new Date().toISOString(),
          user: {
            id: created.user.id,
            name: created.user.name,
            image: created.user.image,
          },
        },
      ]);
      setDraft("");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error("Couldn't post comment", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`${deleteUrlBase}/${commentId}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error("Couldn't delete comment", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <section className="mt-16">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-black tracking-tight text-fg">
          {heading}{" "}
          <span className="text-muted/50 font-bold text-base tabular-nums">
            ({comments.length})
          </span>
        </h2>
      </div>

      {/* Composer */}
      {signedIn ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-4 mb-6"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={3}
            maxLength={5000}
            className="w-full bg-transparent border-none outline-none text-sm text-fg placeholder:text-muted resize-none"
            disabled={submitting}
          />
          <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
            <span className="text-[10px] text-muted/60 tabular-nums">
              {draft.length}/5000
            </span>
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              {submitting ? "Posting…" : "Respond"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6 text-center">
          <p className="text-sm text-muted">
            <Link
              href={`/login?next=${encodeURIComponent(pathname ?? "/blog")}`}
              className="text-accent font-bold hover:underline"
            >
              Sign in
            </Link>{" "}
            to join the discussion.
          </p>
        </div>
      )}

      {/* List */}
      {comments.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No responses yet. Be the first to share what you think.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => {
            const canDelete =
              currentUserId === c.user.id || isAdmin;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={`/u/${c.user.id}`}
                    className="w-9 h-9 rounded-full bg-surface overflow-hidden border border-border shrink-0"
                  >
                    {c.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.user.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-muted" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/u/${c.user.id}`}
                        className="text-sm font-bold text-fg hover:text-accent transition-colors truncate"
                      >
                        {c.user.name ?? "Anonymous"}
                      </Link>
                      <span className="text-[11px] text-muted/60">
                        <RelativeTime iso={c.createdAt} />
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="ml-auto text-muted/50 hover:text-rose-500 transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-fg/80 whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
