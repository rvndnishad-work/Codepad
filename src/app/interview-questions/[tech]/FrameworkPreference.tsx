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
      setFw(localStorage.getItem("mc-framework") || "react");
    } catch {
      setFw("react");
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
    <div className="flex items-center flex-wrap gap-2 mt-4">
      <span className="text-[11px] font-black uppercase tracking-wider text-muted">
        Preferred framework
      </span>
      <div className="flex gap-1.5">
        {FRAMEWORKS.map(([value, lbl]) => {
          const active = fw === value;
          return (
            <button
              key={value}
              onClick={() => pick(value)}
              aria-pressed={active}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                active
                  ? "bg-accent text-bg border-accent shadow-sm"
                  : "bg-bg border-border text-muted hover:text-fg hover:border-accent/40"
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
