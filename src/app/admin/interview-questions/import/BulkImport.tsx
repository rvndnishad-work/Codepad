"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { bulkImportQuestions } from "../actions";

const SAMPLE = `[
  {
    "title": "Reverse a linked list",
    "company": "Amazon",
    "technology": "dsa",
    "difficulty": "medium",
    "round": "DSA",
    "description": "Reverse a singly linked list iteratively and recursively.",
    "answer": "Iterative: track prev/curr/next ...",
    "tags": ["linked-list", "pointers"],
    "yearsAsked": [2023, 2024],
    "status": "published"
  }
]`;

/** Parse CSV text into row objects. Handles quoted fields with commas. */
function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (cur !== "" || row.length) { row.push(cur); rows.push(row); row = []; cur = ""; }
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      let v: unknown = (r[idx] ?? "").trim();
      if (h === "tags" || h === "yearsAsked") {
        v = String(v).split(/[;|]/).map((x) => x.trim()).filter(Boolean);
        if (h === "yearsAsked") v = (v as string[]).map(Number).filter((n) => !isNaN(n));
      }
      o[h] = v;
    });
    return o;
  });
}

export default function BulkImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();

  function parse(raw: string) {
    setResult(null);
    setParseError(null);
    const trimmed = raw.trim();
    if (!trimmed) { setItems(null); return; }
    try {
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setItems(arr);
      } else {
        const arr = parseCsv(trimmed);
        if (arr.length === 0) throw new Error("No rows found (need a header row + data).");
        setItems(arr);
      }
    } catch (e) {
      setItems(null);
      setParseError((e as Error).message);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    parse(content);
  }

  function runImport() {
    if (!items) return;
    start(async () => {
      const res = await bulkImportQuestions(items);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-bold hover:border-accent/40 cursor-pointer transition">
          <Upload className="w-4 h-4" /> Choose .json / .csv
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={onFile} className="hidden" />
        </label>
        <span className="text-xs text-muted">or paste below</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); parse(e.target.value); }}
        rows={12}
        spellCheck={false}
        placeholder={SAMPLE}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs font-mono focus:outline-none focus:border-accent/50"
      />

      {parseError && (
        <div className="flex items-center gap-2 text-sm text-rose-500"><AlertTriangle className="w-4 h-4" /> {parseError}</div>
      )}
      {items && !parseError && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/40">
          <span className="text-sm text-muted">Parsed <b className="text-fg">{items.length}</b> question{items.length === 1 ? "" : "s"} ready to import.</span>
          <button
            onClick={runImport}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft disabled:opacity-60"
          >
            {pending ? "Importing…" : `Import ${items.length}`}
          </button>
        </div>
      )}

      {result && (
        <div className="p-4 rounded-2xl border border-border bg-surface/40 space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> Imported {result.created} question{result.created === 1 ? "" : "s"}.
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-rose-500 space-y-0.5">
              <div className="font-bold">{result.errors.length} skipped:</div>
              {result.errors.slice(0, 10).map((er, i) => <div key={i}>· {er}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
