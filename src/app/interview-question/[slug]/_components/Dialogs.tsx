"use client";

import { useEffect, useRef } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→"], label: "Previous or next question" },
  { keys: ["E"], label: "Show or hide the solution" },
  { keys: ["M"], label: "Mark as solved" },
  { keys: ["S"], label: "Save for later" },
  { keys: ["?"], label: "Show these shortcuts" },
  { keys: ["Esc"], label: "Close a dialog" },
];

const closeBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="qa-in w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="shortcuts-title" className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Keyboard className="h-4 w-4 text-subtle" aria-hidden /> Keyboard shortcuts
          </h2>
          <button ref={close} type="button" onClick={onClose} aria-label="Close shortcuts" className={closeBtn}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-muted">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="min-w-[26px] rounded-md border border-border bg-panel px-1.5 py-0.5 text-center font-mono text-xs text-fg">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A diagram from the answer, opened larger. */
export function DiagramDialog({ svg, onClose }: { svg: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Diagram"
        className="qa-in relative max-h-[88vh] w-full max-w-5xl overflow-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={close} type="button" onClick={onClose} aria-label="Close diagram" className={`${closeBtn} absolute right-3 top-3`}>
          <X className="h-4 w-4" aria-hidden />
        </button>
        {/* Trusted: the SVG comes from the admin-curated answer already on the page. */}
        <div className="[&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-4 text-center text-xs text-subtle">Press Esc to close</p>
      </div>
    </div>
  );
}
