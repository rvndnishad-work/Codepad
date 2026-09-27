"use client";

/**
 * Shown in place of the whole workspace while it waits to be deleted.
 * Owners can undo the deletion here; everyone else is told who to ask.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Btn } from "./candidates/_components/ui";
import { cancelDeletionAction } from "./settings/data-privacy/actions";

export default function DeletionScheduledScreen({
  slug,
  name,
  finalAt,
  daysLeft,
  isOwner,
}: {
  slug: string;
  name: string;
  /** Already formatted in the workspace date format. */
  finalAt: string;
  daysLeft: number;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const undo = () =>
    start(async () => {
      setError(null);
      const res = await cancelDeletionAction(slug).catch(() => null);
      if (!res || !res.ok) {
        setError(res && !res.ok ? res.error : "Could not undo. Try again.");
        return;
      }
      router.refresh();
    });

  return (
    <main className="min-h-screen bg-bg flex items-start justify-center px-4 pt-[14vh]">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 flex flex-col gap-4">
        <span aria-hidden className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
          <Trash2 className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-fg">{name} is scheduled for deletion</h1>
          <p className="text-sm text-muted">
            It will be erased for good on {finalAt}, in {daysLeft === 1 ? "1 day" : `${daysLeft} days`}. Until then nobody can use it, and candidates,
            screenings and settings are kept as they are.
          </p>
        </div>
        {isOwner ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">You are an owner, so you can undo this. Everyone gets access back straight away.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="primary" size="md" onClick={undo} disabled={busy}>
                {busy ? "Undoing" : "Keep this workspace"}
              </Btn>
              <Btn size="md" href="/dashboard">
                Go to your dashboard
              </Btn>
            </div>
            {error && (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">If this is a mistake, ask an owner of the workspace to undo it before that date.</p>
            <Link href="/dashboard" className="text-sm font-medium text-secondary hover:underline self-start">
              Go to your dashboard
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
