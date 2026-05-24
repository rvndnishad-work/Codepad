"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck, Briefcase, Check } from "lucide-react";

export default function UserTypeChooser() {
  const router = useRouter();
  const [picked, setPicked] = useState<"candidate" | "recruiter" | "">("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!picked) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/user-type", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userType: picked }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        toast.success("Saved");
        // Reload to force the JWT token to refresh server-side
        window.location.reload();
      } catch (err) {
        toast.error("Failed to save", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-xl font-semibold text-fg tracking-tight">
          Tell us how you'll use Interviewpad
        </h2>
        <p className="text-sm text-muted max-w-md mx-auto">
          We'll tailor your navigation, dashboard, and interview tools accordingly.
          You can change this later in settings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setPicked("candidate")}
          className={`text-left p-4 rounded-xl border-2 transition-colors cursor-pointer relative ${
            picked === "candidate"
              ? "border-indigo-500/50 bg-indigo-500/10"
              : "border-border bg-surface hover:border-accent/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                picked === "candidate"
                  ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-500"
                  : "border-border bg-bg text-muted"
              }`}
            >
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-sm font-semibold ${
                  picked === "candidate" ? "text-indigo-600 dark:text-indigo-300" : "text-fg"
                }`}
              >
                I'm a candidate
              </div>
              <div className="text-[11px] text-muted mt-1 leading-snug">
                Practice with challenges, take assigned tests, join live interviews from
                recruiters.
              </div>
            </div>
          </div>
          {picked === "candidate" && (
            <Check className="absolute top-3 right-3 w-4 h-4 text-indigo-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setPicked("recruiter")}
          className={`text-left p-4 rounded-xl border-2 transition-colors cursor-pointer relative ${
            picked === "recruiter"
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-border bg-surface hover:border-accent/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                picked === "recruiter"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                  : "border-border bg-bg text-muted"
              }`}
            >
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-sm font-semibold ${
                  picked === "recruiter" ? "text-emerald-600 dark:text-emerald-300" : "text-fg"
                }`}
              >
                I'm a recruiter
              </div>
              <div className="text-[11px] text-muted mt-1 leading-snug">
                Build workspaces, send take-homes, schedule live interviews, review
                candidates.
              </div>
            </div>
          </div>
          {picked === "recruiter" && (
            <Check className="absolute top-3 right-3 w-4 h-4 text-emerald-500" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!picked || pending}
        className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[12px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
