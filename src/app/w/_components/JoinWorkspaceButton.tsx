"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinWorkspaceAction } from "../actions";

/** "Join" on the workspace hub, for workspaces that let this email domain in. */
export default function JoinWorkspaceButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const join = () =>
    start(async () => {
      setError(null);
      const res = await joinWorkspaceAction(slug).catch(() => null);
      if (!res) return setError("Could not join. Try again.");
      if (!res.ok) return setError(res.error);
      router.push(`/w/${res.slug}`);
    });

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1">
      <button
        type="button"
        onClick={join}
        disabled={pending}
        aria-label={`Join ${name}`}
        className="h-11 sm:h-9 inline-flex items-center justify-center px-3.5 rounded-lg border border-border-strong text-sm sm:text-[13px] font-medium text-fg hover:bg-panel hover:border-fg/40 transition-colors disabled:opacity-50"
      >
        {pending ? "Joining" : "Join"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-danger text-right max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
