"use client";

import { useState } from "react";
import UserActionPanel, { availableActions, type ActionTarget, type UserActionKey } from "../_components/UserActionPanel";

export default function UserActionsBar({
  target,
  canHardDelete,
  hardDeleteBlocker,
}: {
  target: ActionTarget;
  canHardDelete: boolean;
  hardDeleteBlocker: string | null;
}) {
  const [open, setOpen] = useState<UserActionKey | null>(null);
  const actions = availableActions(target, canHardDelete);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setOpen(open === a.key ? null : a.key)}
            aria-expanded={open === a.key}
            className={`h-9 px-3.5 rounded-lg border text-sm transition-colors ${
              open === a.key ? "bg-panel border-border-strong" : "bg-surface border-border hover:bg-panel"
            } ${a.danger ? "text-danger" : "text-fg"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {open && (
        <UserActionPanel
          key={open}
          target={target}
          action={open}
          onClose={() => setOpen(null)}
          blocker={open === "purge" ? hardDeleteBlocker : null}
        />
      )}
    </div>
  );
}
