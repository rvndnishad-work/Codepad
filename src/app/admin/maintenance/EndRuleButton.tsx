"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { endMaintenanceAction } from "./actions";

/** "Cancel" (scheduled) or "Bring back" (running), with an inline confirm. */
export default function EndRuleButton({
  ruleId,
  kind,
  label,
}: {
  ruleId: string;
  kind: "cancel" | "bring-back";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const verb = kind === "cancel" ? "Cancel" : "Bring back";
  const tone = kind === "cancel" ? "text-danger" : "text-success";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`text-sm font-medium hover:underline ${tone}`}>
        {verb}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-panel p-3 text-left space-y-2 min-w-[240px]">
      <div className="text-sm text-fg">
        {kind === "cancel" ? `Cancel the scheduled maintenance for ${label}?` : `Bring ${label} back now?`}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for the audit log (optional)"
        className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-8 px-3 rounded-lg border border-border text-sm text-fg hover:bg-surface"
        >
          Keep it
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await endMaintenanceAction({ ruleId, note });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(kind === "cancel" ? "Maintenance cancelled" : `${label} is back. Every server picks it up within 10 seconds.`);
              setOpen(false);
              router.refresh();
            })
          }
          className="h-8 px-3 rounded-lg bg-secondary text-sm font-medium text-bg hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Working" : verb}
        </button>
      </div>
    </div>
  );
}
