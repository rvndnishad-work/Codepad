"use client";

import { useState, KeyboardEvent } from "react";
import { Hash, X } from "lucide-react";
import { TAG_RE, MAX_TAGS } from "./types";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function commit(raw: string) {
    const cleaned = raw.trim().toLowerCase().replace(/^#+/, "");
    if (!cleaned) return;
    if (tags.length >= MAX_TAGS) {
      setError(`Up to ${MAX_TAGS} tags`);
      return;
    }
    if (!TAG_RE.test(cleaned)) {
      setError("Lowercase letters, numbers, dashes only");
      return;
    }
    if (tags.includes(cleaned)) {
      setError("Already added");
      return;
    }
    onChange([...tags, cleaned]);
    setDraft("");
    setError(null);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
      return;
    }
    if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border bg-bg transition-colors ${
          error ? "border-red-500/60" : "border-border focus-within:border-accent"
        }`}
      >
        <Hash className="w-3.5 h-3.5 text-muted shrink-0" />
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="opacity-60 hover:opacity-100"
              aria-label={`Remove tag ${t}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKey}
            onBlur={() => {
              if (draft.trim()) commit(draft);
            }}
            placeholder={tags.length === 0 ? (placeholder ?? "Add a tag…") : ""}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-fg outline-none placeholder:text-muted/50"
            spellCheck={false}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-[11px] ${error ? "text-red-500" : "text-muted/70"}`}>
          {error ?? "Press Enter or comma to add"}
        </span>
        <span className="text-[11px] text-muted/70 tabular-nums">
          {tags.length}/{MAX_TAGS}
        </span>
      </div>
    </div>
  );
}
