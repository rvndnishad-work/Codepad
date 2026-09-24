"use client";

import { useEffect, useState } from "react";

const FRAMEWORKS: [string, string][] = [
  ["react", "React"],
  ["vue", "Vue"],
  ["angular", "Angular"],
];

/**
 * Lets the user pick a preferred framework for machine-coding solutions. The
 * choice is saved to localStorage ("mc-framework") and read by the question
 * detail page, so opening any question defaults to this framework.
 */
export default function FrameworkPreference() {
  const [fw, setFw] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mc-framework") || "react";
      setTimeout(() => setFw(saved), 0);
    } catch {
      setTimeout(() => setFw("react"), 0);
    }
  }, []);

  function pick(value: string) {
    setFw(value);
    try {
      localStorage.setItem("mc-framework", value);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <span className="text-sm text-subtle">Solutions open in</span>
      <div className="flex gap-1.5">
        {FRAMEWORKS.map(([value, lbl]) => {
          const active = fw === value;
          return (
            <button
              key={value}
              onClick={() => pick(value)}
              aria-pressed={active}
              className={`h-8 rounded-lg border px-3 text-sm font-medium transition-colors motion-reduce:transition-none ${
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}
