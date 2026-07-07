"use client";

import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, Braces } from "lucide-react";
import CodeMirrorField from "./CodeMirrorField";

/** Validate raw JSON against an expected root shape. Empty input is valid. */
export function validateJson(raw: string, kind: "array" | "object"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const ok = kind === "array" ? Array.isArray(parsed) : typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    return ok ? null : `Must be a JSON ${kind}.`;
  } catch (e) {
    return (e as Error).message.replace(/^JSON\.parse: /, "");
  }
}

/**
 * JSON editor with syntax highlighting, a live validity badge and one-click
 * formatting. Used for the rare hand-edited JSON surfaces (framework bundles,
 * advanced example entries).
 */
export default function JsonField({
  value,
  onChange,
  kind,
  placeholder,
  minHeight = 140,
  maxHeight = 480,
}: {
  value: string;
  onChange: (v: string) => void;
  kind: "array" | "object";
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
}) {
  const error = useMemo(() => validateJson(value, kind), [value, kind]);
  const empty = !value.trim();

  function format() {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      /* invalid JSON — badge already says so */
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden focus-within:border-accent/50 transition-colors">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-bg/60">
        {empty ? (
          <span className="text-[10px] font-bold text-muted">Empty</span>
        ) : error ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
            <AlertTriangle className="w-3 h-3" /> {error}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
            <CheckCircle2 className="w-3 h-3" /> Valid JSON {kind}
          </span>
        )}
        <button
          type="button"
          onClick={format}
          disabled={empty || Boolean(error)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg hover:bg-elevated transition disabled:opacity-40"
        >
          <Braces className="w-3 h-3" /> Format
        </button>
      </div>
      <CodeMirrorField
        value={value}
        onChange={onChange}
        language="json"
        placeholder={placeholder}
        minHeight={minHeight}
        maxHeight={maxHeight}
      />
    </div>
  );
}
