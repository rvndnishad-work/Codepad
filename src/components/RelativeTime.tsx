"use client";

import { useEffect, useState } from "react";

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return diffSec < 0 ? "in a moment" : "just now";
  if (absSec < 3600) {
    const m = Math.round(absSec / 60);
    return diffSec < 0 ? `in ${m}m` : `${m}m ago`;
  }
  if (absSec < 86400) {
    const h = Math.round(absSec / 3600);
    return diffSec < 0 ? `in ${h}h` : `${h}h ago`;
  }
  if (absSec < 2592000) {
    const d = Math.round(absSec / 86400);
    return diffSec < 0 ? `in ${d}d` : `${d}d ago`;
  }
  if (absSec < 31536000) {
    const mo = Math.round(absSec / 2592000);
    return diffSec < 0 ? `in ${mo}mo` : `${mo}mo ago`;
  }
  const y = Math.round(absSec / 31536000);
  return diffSec < 0 ? `in ${y}y` : `${y}y ago`;
}

export default function RelativeTime({
  iso,
  className,
  fullDateTitle = true,
}: {
  iso: string;
  className?: string;
  fullDateTitle?: boolean;
}) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    setText(formatRelative(iso));
    const interval = setInterval(() => setText(formatRelative(iso)), 60_000);
    return () => clearInterval(interval);
  }, [iso]);

  return (
    <time
      dateTime={iso}
      className={className}
      title={fullDateTitle ? new Date(iso).toLocaleString() : undefined}
      suppressHydrationWarning
    >
      {text}
    </time>
  );
}
