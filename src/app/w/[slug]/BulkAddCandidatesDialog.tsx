"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Upload, AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp } from "lucide-react";

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
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  // Skip header if first line looks like `name, email, ...`
  const hasHeader = lines[0]?.toLowerCase().replace(/\s/g, "").startsWith("name,") && lines[0].toLowerCase().includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  return dataLines.map<ParsedRow>((raw) => {
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
    } else if (email) {
      const key = email.toLowerCase();
      if (seen.has(key)) {
        valid = false;
        error = "Duplicate email";
      } else {
        seen.add(key);
      }
    } else if (name) {
      // still track name+email combo for duplicate check when email missing
      const key = `__name__${name.toLowerCase()}`;
      if (seen.has(key)) {
        valid = false;
        error = "Duplicate name";
      } else {
        seen.add(key);
      }
    }
    return { raw, name, email, phone, notes, valid, error };
  });
}

const SAMPLE = `# Paste rows below — one per line. Format:
# name, email, phone, notes
Jane Doe, jane@example.com, +1 415 555 0100, sourced from LinkedIn
John Smith, john@example.com
Ada Lovelace`;

const TEMPLATE_CSV = `name,email,phone,notes
Jane Doe,jane@example.com,+1 415 555 0100,sourced from LinkedIn
John Smith,john@example.com,,
Ada Lovelace,ada@example.com,,
"Example, With Comma",example+bulk@test.dev,+44 20 7946 0958,"notes with, comma"
`;

function downloadTemplate(format: "csv" | "xlsx" = "csv") {
  const mime = format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8;";
  const blob = new Blob([TEMPLATE_CSV], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = format === "xlsx" ? "candidates-template.xlsx" : "candidates-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Template downloaded (${format.toUpperCase()})`);
}

export default function BulkAddCandidatesDialog({ open, onClose, workspaceSlug }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => parseInput(text), [text]);
  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  async function handleFile(file: File) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".csv")) {
        const txt = await file.text();
        const lines = txt.split(/\r?\n/);
        const first = lines[0]?.trim().toLowerCase() ?? "";
        const hasHeader = first.startsWith("name,") && first.includes("email");
        setText(hasHeader ? lines.slice(1).join("\n") : txt);
        toast.success(`Loaded ${file.name} — ${hasHeader ? lines.length - 1 : lines.length} rows`);
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
        let start = 0;
        if (json[0] && String(json[0][0] ?? "").toLowerCase().includes("name") && String(json[0][1] ?? "").toLowerCase().includes("email")) start = 1;
        const lines = json.slice(start).map((row) => row.map((c) => String(c ?? "").trim()).join(", "));
        setText(lines.join("\n"));
        toast.success(`Loaded ${file.name} — ${lines.length} rows`);
      } else {
        toast.error("Unsupported file", { description: "Please upload CSV or Excel (.xlsx, .xls)" });
      }
    } catch (err) {
      toast.error("Failed to parse file", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // reset so same file can be re-selected
    e.target.value = "";
  }

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
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
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
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => downloadTemplate("csv")}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border bg-bg hover:bg-panel/40 text-muted hover:text-fg transition-colors text-[11px] font-medium"
                title="Download CSV template (name,email,phone,notes) — opens in Excel & Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate("xlsx")}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border bg-bg hover:bg-panel/40 text-muted hover:text-fg transition-colors text-[11px] font-medium"
                title="Download Excel template (.xlsx) — same columns"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                XLSX
              </button>
            </div>
            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => downloadTemplate("csv")}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border bg-bg hover:bg-panel/40 text-muted hover:text-fg transition-colors text-[11px] font-medium"
                title="Download template"
              >
                <Download className="w-3.5 h-3.5" />
                Template
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md text-muted hover:text-fg hover:bg-panel/40 transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Paste candidates
              </label>
              <span className="text-[10px] text-muted/60 hidden sm:inline">Validated before import — invalid rows are skipped</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`relative rounded-md border ${isDragging ? "border-accent bg-accent/5" : "border-border bg-bg"} transition-colors`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFileChange}
                className="hidden"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-elevated/20 rounded-t-md">
                <span className="text-[11px] font-medium text-muted flex items-center gap-1.5">
                  <FileUp className="w-3.5 h-3.5" /> Upload
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-bg hover:bg-panel text-[11px] font-medium text-muted hover:text-fg transition-colors"
                  >
                    <FileUp className="w-3 h-3" /> CSV / Excel
                  </button>
                  <span className="text-[10px] text-muted/50 hidden sm:inline">or drag & drop here</span>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={SAMPLE}
                rows={10}
                spellCheck={false}
                className="w-full px-3 py-2 bg-transparent text-fg text-sm font-mono focus:outline-none resize-y min-h-[160px]"
                autoFocus
              />
              {isDragging && (
                <div className="absolute inset-0 bg-accent/10 backdrop-blur-[1px] rounded-md flex items-center justify-center pointer-events-none">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold shadow-sm">
                    <FileUp className="w-3.5 h-3.5 text-accent" /> Drop CSV or Excel to load
                  </span>
                </div>
              )}
            </div>
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
