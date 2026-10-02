"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pin, PinOff } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import ConfirmButton from "../content/_components/ConfirmButton";
import Pill from "../content/_components/Pill";
import { deleteSnippet, unlistSnippet } from "./actions";

interface AdminSnippetRowProps {
  snippet: {
    id: string;
    slug: string;
    title: string;
    template: string;
    pinned: boolean;
    updatedAt: string;
    openReports: number;
    user: { id: string; name: string | null; email: string | null } | null;
  };
}

export default function AdminSnippetRow({ snippet }: AdminSnippetRowProps) {
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
    <tr className="hover:bg-panel/60 align-top">
      <td className="px-4 py-3 min-w-[220px]">
        <div className="flex items-center gap-2">
          <span className="font-medium text-fg">{snippet.title}</span>
          {pinned && <Pill tone="info">Pinned</Pill>}
          {snippet.openReports > 0 && (
            <Link href={`/admin/community?tab=reports&type=snippet`}>
              <Pill tone="bad">{snippet.openReports} open report{snippet.openReports === 1 ? "" : "s"}</Pill>
            </Link>
          )}
        </div>
        <div className="text-xs text-muted font-mono">/{snippet.slug} · {snippet.template}</div>
      </td>
      <td className="px-4 py-3">
        {snippet.user ? (
          <Link href={`/admin/users/${snippet.user.id}`} className="text-sm text-fg hover:underline">
            {snippet.user.name ?? snippet.user.email}
          </Link>
        ) : (
          <span className="text-sm text-subtle">Anonymous</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
        <RelativeTime iso={snippet.updatedAt} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start justify-end gap-1.5 flex-wrap">
          {error && <span className="text-xs text-danger max-w-[160px]">{error}</span>}
          <button
            type="button"
            onClick={togglePin}
            disabled={pending}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-xs font-medium hover:bg-panel disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            {pinned ? "Unpin" : "Pin"}
          </button>
          <ConfirmButton
            action={unlistSnippet.bind(null, snippet.id)}
            label="Make private"
            prompt="Take it off Explore and stop the link working for others. The owner keeps it."
            requireNote
          />
          <ConfirmButton
            action={deleteSnippet.bind(null, snippet.id)}
            label="Delete"
            confirmLabel="Delete for good"
            prompt="Delete this snippet for its owner too? This cannot be undone."
            requireNote
            tone="danger"
          />
          <Link
            href={`/play/${snippet.slug}`}
            target="_blank"
            className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-panel"
            title="Open snippet"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
