"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Briefcase } from "lucide-react";
import type { AdminPersona } from "@/lib/admin-persona";
import { ADMIN_PERSONA_COOKIE } from "@/lib/admin-persona";

interface Props {
  initial: AdminPersona;
}

const OPTIONS: { value: AdminPersona; label: string; Icon: typeof GraduationCap }[] = [
  { value: "candidate", label: "Candidate", Icon: GraduationCap },
  { value: "recruiter", label: "Recruiter", Icon: Briefcase },
];

/**
 * Two-way segmented control that flips the admin sidebar between the
 * candidate-facing surface (users / blogs / comments / attempts) and the
 * recruiter-facing surface (workspaces / interviews / credits).
 *
 * Persistence is a plain document.cookie write so the choice survives
 * refreshes; `router.refresh()` re-runs the server layout so the new
 * persona's nav set is rendered without a full page reload.
 */
export default function AdminPersonaToggle({ initial }: Props) {
  const [persona, setPersona] = useState<AdminPersona>(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function select(next: AdminPersona) {
    if (next === persona) return;
    // 30 day persistence, lax samesite is fine — this is a pure UI preference.
    document.cookie = `${ADMIN_PERSONA_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    setPersona(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="tablist"
      aria-label="Admin view persona"
      className="mx-3 mb-3 mt-1 flex items-center gap-1 rounded-xl border border-border bg-panel/40 p-1 shadow-inner"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = persona === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(value)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? "bg-elevated text-fg shadow-sm"
                : "text-muted hover:text-fg"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
