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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={join}
        disabled={pending}
        aria-label={`Join ${name}`}
        className="h-8 inline-flex items-center px-3 rounded-lg bg-secondary text-bg text-[13px] font-medium hover:brightness-110 transition disabled:opacity-50"
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
