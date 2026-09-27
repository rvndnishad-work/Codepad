"use client";

/**
 * Full-page consent step shown before an AI screening when the workspace
 * asks for consent (Settings > Candidate experience). The screening only
 * opens once the candidate ticks the box; the time is stored.
 */
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CandidateBrand } from "@/lib/workspace/candidate-experience";
import { readableTextOn } from "@/lib/workspace/candidate-experience";
import { CandidateBrandMark, CandidateHelpLine } from "./CandidateBrand";

export default function ConsentGate({
  brand,
  title,
  intro,
  statement,
  action,
  cta = "Continue",
}: {
  brand: CandidateBrand;
  title: string;
  intro: string;
  /** What the candidate agrees to, in one sentence. */
  statement: string;
  /** Records consent; the page reloads into the screening on success. */
  action: () => Promise<{ ok: true } | { ok: false; error: string }>;
  cta?: string;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const boxId = useId();

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await action().catch(() => null);
      if (!res) return setError("Something went wrong. Check your connection and try again.");
      if (!res.ok) return setError(res.error);
      router.refresh();
    });

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-12 bg-bg text-fg">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="flex justify-center">
          <CandidateBrandMark brand={brand} />
        </div>
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
            <p className="text-sm text-muted leading-relaxed">{intro}</p>
          </div>
          <label htmlFor={boxId} className="flex items-start gap-3 rounded-xl border border-border bg-panel p-4 cursor-pointer">
            <input
              id={boxId}
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-secondary"
            />
            <span className="text-sm text-fg leading-relaxed">
              {statement}
              {brand.privacyNoticeUrl && (
                <>
                  {" "}
                  Read the{" "}
                  <a href={brand.privacyNoticeUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
                    privacy notice
                  </a>
                  .
                </>
              )}
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!agreed || pending}
            style={brand.color ? { background: brand.color, color: readableTextOn(brand.color) } : undefined}
            className="h-11 rounded-xl bg-secondary text-bg text-sm font-semibold transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
          >
            {pending ? "One moment" : cta}
          </button>
        </section>
        <CandidateHelpLine brand={brand} />
      </div>
    </main>
  );
}
