"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function JoinInterviewBox() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Enter the interview code or paste the link.");
      return;
    }
    setSubmitting(true);

    // Accept either:
    //  - A 4-digit short code → /interview/code/{code}
    //  - A full URL containing /interview/{token}
    //  - A bare share token
    let target = "";
    if (/^\d{4}$/.test(trimmed)) {
      target = `/interview/code/${trimmed}`;
    } else if (trimmed.startsWith("http")) {
      try {
        const url = new URL(trimmed);
        target = url.pathname + url.search;
      } catch {
        target = "";
      }
    } else if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
      // Looks like a share token
      target = `/interview/${trimmed}`;
    }

    if (!target) {
      toast.error("That doesn't look like a valid code or link.");
      setSubmitting(false);
      return;
    }

    router.push(target);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] p-4 space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">
            Join an interview
          </h3>
        </div>
        <p className="text-[11px] text-muted leading-snug">
          Enter the 4-digit access code or paste the link your recruiter sent you.
        </p>
      </div>

      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="4-digit code or invitation link"
        spellCheck={false}
        className="w-full px-3 py-2.5 rounded-md border border-border bg-bg text-fg text-sm focus:outline-none focus:border-accent/40 font-mono"
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-accent hover:bg-accent-soft text-bg text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
      >
        {submitting ? "Joining…" : "Join"}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}
