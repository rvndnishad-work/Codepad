"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
};

type ParsedRow = {
  raw: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  valid: boolean;
  error?: string;
};

function parseInput(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map<ParsedRow>((raw) => {
      // Accept comma- OR tab-separated. Order: name, email, phone, notes
      const parts = raw.includes("\t") ? raw.split("\t") : raw.split(",");
      const [name = "", email = "", phone = "", ...rest] = parts.map((p) => p.trim());
      const notes = rest.join(", ");
      let valid = true;
      let error: string | undefined;
      if (!name) {
        valid = false;
        error = "Name required";
      } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        valid = false;
        error = "Invalid email";
      }
      return { raw, name, email, phone, notes, valid, error };
    });
}

const SAMPLE = `# Paste rows below — one per line. Format:
# name, email, phone, notes
Jane Doe, jane@example.com, +1 415 555 0100, sourced from LinkedIn
John Smith, john@example.com
Ada Lovelace`;

export default function BulkAddCandidatesDialog({ open, onClose, workspaceSlug }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => parseInput(text), [text]);
  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (validRows.length === 0) {
      toast.error("Add at least one valid row");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/w/${workspaceSlug}/candidates/bulk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidates: validRows.map((r) => ({
            name: r.name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            notes: r.notes || undefined,
            source: "bulk-import",
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast.success(
        `Imported ${data.created} new${data.updated ? ` · updated ${data.updated}` : ""}${data.skipped ? ` · skipped ${data.skipped}` : ""}`
      );
      onClose();
      router.refresh();
    } catch (err) {
      toast.error("Bulk import failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl animate-in zoom-in-95 fade-in duration-150 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Bulk add candidates</h3>
              <p className="text-[11px] text-muted mt-0.5">
                Paste rows — one candidate per line. Comma or tab separated.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-muted hover:text-fg hover:bg-panel/40 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Paste candidates
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SAMPLE}
              rows={10}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-sm font-mono focus:outline-none focus:border-accent/40 resize-y"
              autoFocus
            />
            <p className="text-[10px] text-muted/70">
              Format: <code className="font-mono">name, email, phone, notes</code>. Email and later fields are optional.
              Lines starting with <code className="font-mono">#</code> are skipped.
            </p>
          </div>

          {rows.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-elevated/40 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-muted">Preview ({rows.length})</span>
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> {validRows.length} valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-3 h-3" /> {invalidRows.length} invalid
                    </span>
                  )}
                </span>
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-border text-[12px]">
                {rows.map((r, i) => (
                  <li
                    key={i}
                    className={`px-3 py-1.5 flex items-center justify-between gap-2 ${
                      !r.valid ? "bg-rose-500/[0.04]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-fg">{r.name || "(no name)"}</span>
                      {r.email && <span className="text-muted ml-2 font-mono text-[11px]">{r.email}</span>}
                      {r.phone && <span className="text-muted/60 ml-2 font-mono text-[11px]">{r.phone}</span>}
                    </div>
                    {!r.valid && (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                        {r.error}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md bg-panel/40 border border-border text-muted hover:text-fg transition-colors text-[12px] font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || validRows.length === 0}
            className="px-4 py-2 rounded-md bg-accent hover:bg-accent-soft text-bg text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Importing…" : `Import ${validRows.length} candidate${validRows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
