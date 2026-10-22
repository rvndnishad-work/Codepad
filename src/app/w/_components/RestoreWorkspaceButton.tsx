"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelDeletionAction } from "../[slug]/(shell)/settings/data-privacy/actions";

/**
 * "Restore" on a workspace hub row that is scheduled for deletion. Owners
 * only; undoing is reversible, so there is no confirm step.
 */
export default function RestoreWorkspaceButton({
  slug,
  name,
  className = "",
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const restore = () =>
    start(async () => {
      setError(null);
      const res = await cancelDeletionAction(slug).catch(() => null);
      if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Could not restore. Try again.");
      router.refresh();
    });

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1">
      <button
        type="button"
        onClick={restore}
        disabled={pending}
        aria-label={`Restore ${name}`}
        className={`inline-flex items-center justify-center h-11 sm:h-9 px-3.5 rounded-lg border border-border-strong text-sm font-medium text-fg hover:bg-panel hover:border-fg/40 transition-colors disabled:opacity-50 ${className}`}
      >
        {pending ? "Restoring" : "Restore"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-danger text-right max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
