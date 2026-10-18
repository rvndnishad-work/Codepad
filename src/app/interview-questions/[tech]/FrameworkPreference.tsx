"use client";

import { useEffect, useState } from "react";

const OPTIONS = {
  "machine-coding": {
    key: "mc-framework",
    label: "Solutions open in",
    choices: [
      ["react", "React"],
      ["vue", "Vue"],
      ["angular", "Angular"],
    ],
  },
  dsa: {
    key: "dsa-language",
    label: "Answers in",
    choices: [
      ["python", "Python"],
      ["javascript", "JavaScript"],
      ["java", "Java"],
      ["cpp", "C++"],
    ],
  },
} as const;

/**
 * Lets the user pick a preferred framework (machine coding) or language (DSA).
 * The choice is saved to localStorage and read by the question detail page, so
 * opening any question in the section defaults to it.
 */
export default function FrameworkPreference({ tech }: { tech: keyof typeof OPTIONS }) {
  const opts = OPTIONS[tech];
  const FRAMEWORKS = opts.choices;
  const fallback = FRAMEWORKS[0][0];
  const [fw, setFw] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(opts.key) || fallback;
      setTimeout(() => setFw(saved), 0);
    } catch {
      setTimeout(() => setFw(fallback), 0);
    }
  }, [opts.key, fallback]);

  function pick(value: string) {
    setFw(value);
    try {
      localStorage.setItem(opts.key, value);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <span className="text-sm text-subtle">{opts.label}</span>
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
