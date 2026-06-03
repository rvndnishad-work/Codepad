"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Code2,
  ExternalLink,
  Eye,
  Loader2,
  Pin,
  PinOff,
} from "lucide-react";
import RelativeTime from "@/components/RelativeTime";

interface AdminSnippetRowProps {
  snippet: {
    id: string;
    slug: string;
    title: string;
    template: string;
    pinned: boolean;
    viewCount: number;
    updatedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
  };
  overflow?: boolean;
}

export default function AdminSnippetRow({ snippet, overflow }: AdminSnippetRowProps) {
  const router = useRouter();
  const [pinned, setPinned] = useState(snippet.pinned);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePin() {
    const next = !pinned;
    setPinned(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/snippets/${snippet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: next }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        router.refresh();
      } catch (e) {
        setPinned(!next); // revert
        setError(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  return (
    <tr className="group hover:bg-elevated/30 transition-colors">
      <td className="px-6 py-4 max-w-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
              pinned ? "bg-accent/10 border-accent/30" : "bg-muted/10 border-border"
            }`}
          >
            <Code2 className={`w-5 h-5 ${pinned ? "text-accent" : "text-muted"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-fg truncate block">{snippet.title}</span>
              {pinned && <Pin className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />}
              {overflow && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30"
                  title="Pinned but won't show on homepage — too many pins active."
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Overflow
                </span>
              )}
            </div>
            <div className="text-xs text-muted truncate font-mono">/{snippet.slug}</div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        {snippet.user ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-muted relative shrink-0">
              {snippet.user.image ? (
                <Image src={snippet.user.image} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-muted">
                  {(snippet.user.name ?? snippet.user.email ?? "?")[0]}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-muted truncate max-w-[140px]">
              {snippet.user.name ?? snippet.user.email}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted/50 italic">anonymous</span>
        )}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-1.5 text-muted">
          <Eye className="w-3.5 h-3.5" />
          <span className="text-xs font-mono font-bold tabular-nums">
            {snippet.viewCount}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 text-xs text-muted whitespace-nowrap">
        <RelativeTime iso={snippet.updatedAt} />
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {error && (
            <span className="text-[10px] text-rose-500 max-w-[160px] truncate" title={error}>
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={togglePin}
            disabled={pending}
            className={`p-2 rounded-lg border transition disabled:opacity-50 disabled:cursor-not-allowed ${
              pinned
                ? "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20"
                : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong"
            }`}
            title={pinned ? "Unpin from homepage" : "Pin to homepage"}
            aria-label={pinned ? "Unpin from homepage" : "Pin to homepage"}
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : pinned ? (
              <Pin className="w-4 h-4 fill-current" />
            ) : (
              <PinOff className="w-4 h-4" />
            )}
          </button>
          <Link
            href={`/play/${snippet.slug}`}
            target="_blank"
            className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:border-border-strong transition opacity-0 group-hover:opacity-100"
            title="Open snippet"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
