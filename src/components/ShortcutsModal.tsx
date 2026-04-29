"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["Ctrl/Cmd", "Enter"], label: "Run code" },
  { keys: ["Ctrl/Cmd", "S"], label: "Save snippet" },
  { keys: ["Ctrl/Cmd", "Shift", "F"], label: "Format active file (Prettier)" },
  { keys: ["Ctrl/Cmd", "F"], label: "Find in current file" },
  { keys: ["Right click"], label: "File explorer menu (rename, delete, new file…)" },
  { keys: ["?"], label: "Show this cheatsheet" },
  { keys: ["Esc"], label: "Close dialog / dismiss menu" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-surface text-[10px] font-mono text-fg shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]">
      {children}
    </kbd>
  );
}

export default function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in an input/textarea/contenteditable
      const t = e.target as HTMLElement | null;
      const isTyping =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (isTyping) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-panel hover:bg-elevated text-muted hover:text-fg transition"
      >
        <Keyboard className="w-3.5 h-3.5" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal
          aria-labelledby="shortcuts-title"
          className="fixed inset-0 z-50 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-border bg-panel/95 backdrop-blur shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-accent" />
                <h2
                  id="shortcuts-title"
                  className="text-sm font-semibold tracking-tight"
                >
                  Keyboard shortcuts
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-fg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="px-5 py-3 divide-y divide-border/60">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="text-sm text-subtle">{s.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, i) => (
                      <span key={k + i} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-[10px] text-muted">+</span>
                        )}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3 border-t border-border text-[11px] text-muted">
              Press <Kbd>?</Kbd> any time to toggle this panel.
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
