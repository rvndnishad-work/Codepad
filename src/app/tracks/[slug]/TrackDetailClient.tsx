"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BookmarkX, Play, Sparkles, Trash2 } from "lucide-react";

type EnrollmentLite = {
  status: string;
  startedAt: string;
  lastVisitedAt: string;
};

/**
 * Client island for the track detail hero: progress bar + start/continue
 * CTA + stash/abandon controls. Kept separate from the server-rendered page
 * so the static markup hydrates fast and only the interactive bits ship JS.
 */
export default function TrackDetailClient({
  trackId,
  trackSlug,
  firstChallengeSlug,
  initialEnrollment,
  signedIn,
  progressPct,
  passedCount,
  totalCount,
}: {
  trackId: string;
  /** Used so the Continue/Start CTAs can carry `?track=<slug>` and surface
   *  per-item hints + video on the attempt page. */
  trackSlug: string;
  firstChallengeSlug: string | null;
  initialEnrollment: EnrollmentLite | null;
  signedIn: boolean;
  progressPct: number;
  passedCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<EnrollmentLite | null>(initialEnrollment);
  const [pending, startTransition] = useTransition();

  async function postEnroll() {
    if (!signedIn) {
      toast.error("Sign in to start a track");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tracks/${trackId}/enroll`, { method: "POST" });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Failed to start");
        }
        const data = (await res.json()) as { status: string };
        setEnrollment({
          status: data.status,
          startedAt: new Date().toISOString(),
          lastVisitedAt: new Date().toISOString(),
        });
        toast.success("Track started — your progress is tracked from now.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start");
      }
    });
  }

  async function patchStatus(status: "stashed" | "abandoned") {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tracks/${trackId}/enroll`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const data = (await res.json()) as { status: string };
        setEnrollment((prev) => (prev ? { ...prev, status: data.status } : prev));
        toast.success(
          status === "stashed"
            ? "Stashed — you can resume any time from your dashboard."
            : "Removed from your list."
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  const isActive = enrollment?.status === "active";
  const isStashed = enrollment?.status === "stashed";
  const isCompleted = enrollment?.status === "completed";
  const showProgress = signedIn && enrollment != null;

  // Pick the right primary CTA copy/icon based on enrollment state.
  // All CTAs carry ?track=<slug> so the attempt page can load this track's
  // per-item hints + video walkthroughs.
  let primaryCta: { label: string; href: string } | null = null;
  if (firstChallengeSlug) {
    const href = `/challenges/${firstChallengeSlug}/attempt?track=${trackSlug}`;
    if (!enrollment || isStashed) {
      // Not started yet, or stashed and wants to resume.
      primaryCta = null; // Use the in-line "Start track" button below instead.
    } else if (isCompleted) {
      primaryCta = { label: "Review challenges", href };
    } else {
      // active
      primaryCta = { label: "Continue track", href };
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface/60 backdrop-blur p-5">
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Your progress
            </span>
            <span className="text-xs font-mono tabular-nums text-fg">
              {passedCount} / {totalCount} solved · {progressPct}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-border">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {primaryCta ? (
          <Link
            href={primaryCta.href}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-bg font-black text-sm hover:bg-accent-soft transition shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            {primaryCta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={postEnroll}
            disabled={pending || !firstChallengeSlug}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-bg font-black text-sm hover:bg-accent-soft transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {isStashed ? "Resume track" : "Start track"}
          </button>
        )}

        {signedIn && isActive && (
          <>
            <button
              type="button"
              onClick={() => patchStatus("stashed")}
              disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-border hover:border-border-strong text-fg/80 text-xs font-bold transition disabled:opacity-40"
            >
              <BookmarkX className="w-3.5 h-3.5" />
              Stash for later
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Remove this track from your list? Your past attempts on individual challenges are kept; only the track enrollment is cleared."
                  )
                ) {
                  patchStatus("abandoned");
                }
              }}
              disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-500/5 border border-rose-500/30 text-rose-500/80 hover:text-rose-500 text-xs font-bold transition disabled:opacity-40"
              title="Remove from your list"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </>
        )}

        {!signedIn && (
          <Link
            href="/login"
            className="text-xs text-muted hover:text-fg transition self-center"
          >
            Sign in to track progress →
          </Link>
        )}
      </div>
    </div>
  );
}
