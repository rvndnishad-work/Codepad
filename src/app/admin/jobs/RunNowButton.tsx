"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";
import { runJobNowAction, type RunNowState } from "./actions";

export default function RunNowButton({ job }: { job: string }) {
  const [state, action, pending] = useActionState<RunNowState, FormData>(runJobNowAction, null);
  return (
    <form action={action} className="flex items-center justify-end gap-2">
      <input type="hidden" name="job" value={job} />
      {state && !pending && (
        <span role="status" className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel transition disabled:opacity-50"
      >
        <Play className="w-3.5 h-3.5 text-muted" aria-hidden />
        {pending ? "Running…" : "Run now"}
      </button>
    </form>
  );
}
