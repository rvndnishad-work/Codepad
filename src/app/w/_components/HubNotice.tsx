"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { cancelDeletionAction } from "../[slug]/(shell)/settings/data-privacy/actions";

/**
 * The toast shown on the hub right after a workspace was deleted from
 * Settings, which sends people here with ?deleted=<slug> (scheduled, undo
 * offered inline) or ?removed=<name> (erased straight away). Clears the
 * query so a refresh does not repeat it.
 */
export default function HubNotice(props: { slug: string; name: string } | { removed: string }) {
  const router = useRouter();
  const [shown, setShown] = useState(true);
  const [pending, start] = useTransition();
  const [restored, setRestored] = useState(false);
  const cleared = useRef(false);
  const scheduled = "slug" in props ? props : null;
  const removed = "removed" in props ? props.removed : null;

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    // Drop the query without a navigation; the list already shows the state.
    window.history.replaceState(window.history.state, "", "/w");
    const t = setTimeout(() => setShown(false), 10_000);
    return () => clearTimeout(t);
  }, []);

  const restore = () =>
    start(async () => {
      if (!scheduled) return;
      const res = await cancelDeletionAction(scheduled.slug).catch(() => null);
      if (res?.ok) {
        setRestored(true);
        router.refresh();
        setTimeout(() => setShown(false), 4000);
      }
    });

  if (!shown) return null;
  return (
    <div aria-live="polite" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-md flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border-strong bg-elevated px-4 py-2.5 text-[13px] text-fg shadow-lg shadow-black/30 animate-[toastIn_200ms_ease-out] motion-reduce:animate-none">
        {!scheduled ? (
          <>
            <Trash2 className="w-4 h-4 text-muted shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{removed}</span> was deleted.
            </span>
          </>
        ) : restored ? (
          <>
            <Check className="w-4 h-4 text-success shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{scheduled.name}</span> is back. Everyone can use it again.
            </span>
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 text-danger shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{scheduled.name}</span> is scheduled for deletion.
            </span>
            <button
              type="button"
              onClick={restore}
              disabled={pending}
              className="font-semibold text-secondary-soft hover:underline disabled:opacity-50"
            >
              {pending ? "Restoring" : "Restore"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
