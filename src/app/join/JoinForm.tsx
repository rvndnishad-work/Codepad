"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight, KeyRound } from "lucide-react";

export default function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  const error = searchParams.get("error");
  const codeParam = searchParams.get("code");

  useEffect(() => {
    if (error === "invalid") {
      toast.error("Invalid access code. Please double-check your code.", {
        description: codeParam ? `Code "${codeParam}" could not be found.` : undefined,
        id: "join-error-invalid",
      });
    } else if (error === "expired") {
      toast.warning("This interview session has concluded.", {
        description: "The access code has expired and can no longer be used to join.",
        id: "join-error-expired",
      });
    }
  }, [error, codeParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode) {
      toast.error("Please enter a valid session code.");
      return;
    }

    startTransition(() => {
      router.push(`/join/${encodeURIComponent(cleanCode)}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 relative">
        <label htmlFor="code" className="block text-[10px] font-black uppercase tracking-wider text-muted/90">
          4-Digit Code / Share Token
        </label>
        <div className="relative group">
          <input
            id="code"
            type="text"
            required
            placeholder="e.g. 4921 or sOT5iuN..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isPending}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-bg hover:border-accent/40 focus:border-accent text-sm font-mono text-fg placeholder:text-muted/40 transition-all outline-none focus:ring-1 focus:ring-accent/25"
          />
          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-hover:text-fg group-focus-within:text-accent transition" />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-accent hover:bg-accent-soft text-bg font-black text-[11px] uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resolving Code...
          </>
        ) : (
          <>
            Join Coding Session
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
