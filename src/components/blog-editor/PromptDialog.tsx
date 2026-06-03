"use client";

import { useEffect, useRef, useState } from "react";
import { X, type LucideIcon } from "lucide-react";

export interface PromptConfig {
  title: string;
  label: string;
  placeholder?: string;
  initial?: string;
  submitText?: string;
  type?: "url" | "text";
  icon?: LucideIcon;
  /** Optional helper text under the input. */
  hint?: string;
}

interface PromptDialogProps {
  open: boolean;
  config: PromptConfig | null;
  onSubmit: (value: string) => void;
  /** Called when the user cancels (Esc / backdrop / cancel button). */
  onCancel: () => void;
}

export default function PromptDialog({
  open,
  config,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !config) return;
    setValue(config.initial ?? "");
    setError(null);
    // Focus + select on next tick so the autofocus + select work after mount.
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => clearTimeout(id);
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !config) return null;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    if (config?.type === "url" && !/^https?:\/\//i.test(trimmed)) {
      setError("URL must start with http:// or https://");
      return;
    }
    onSubmit(trimmed);
  }

  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-24 p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-panel/40">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <Icon className="w-3.5 h-3.5" />
              </span>
            )}
            <h2 className="text-sm font-black text-fg">{config.title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-bg/60"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted">
            {config.label}
          </label>
          <input
            ref={inputRef}
            type={config.type === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={config.placeholder}
            className={`w-full px-3 py-2 rounded-xl border bg-bg text-sm text-fg outline-none placeholder:text-muted/50 transition-colors ${
              error ? "border-red-500/60" : "border-border focus:border-accent"
            }`}
            spellCheck={false}
          />
          {(error || config.hint) && (
            <p className={`text-[11px] ${error ? "text-red-500" : "text-muted/70"}`}>
              {error ?? config.hint}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-panel/40">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-bg/60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 rounded-xl bg-accent text-bg text-xs font-black hover:bg-accent-soft transition-colors shadow-md"
          >
            {config.submitText ?? "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
}
