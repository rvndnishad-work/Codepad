"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";

const KEY = "maintenance-banner-dismissed";

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Plain indigo-tinted strip above the header, dismissable per person. */
export default function MaintenanceBannerStrip({
  id,
  message,
  startsAt,
  endsAt,
}: {
  id: string;
  message: string;
  startsAt: string;
  endsAt: string | null;
}) {
  // Hidden until we know it was not dismissed, so it never flashes.
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!readDismissed().includes(id));
  }, [id]);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      const list = readDismissed().filter((x) => x !== id).slice(-20);
      window.localStorage.setItem(KEY, JSON.stringify([...list, id]));
    } catch {
      // Private mode or blocked storage: hide for this page view only.
    }
  }

  const when = endsAt ? `${fmt(startsAt)} to ${fmt(endsAt)}` : `from ${fmt(startsAt)}`;

  return (
    <div
      role="status"
      className="w-full border-b border-secondary/30 bg-secondary/10 text-fg px-4 py-2.5 flex items-center gap-3 text-sm"
    >
      <Clock className="w-4 h-4 shrink-0 text-secondary-soft" aria-hidden />
      <span className="flex-1 min-w-0">
        {message || "Scheduled maintenance is coming up on this page."}
        <span className="text-muted"> · Maintenance {when}</span>
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-muted hover:text-fg hover:bg-panel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
