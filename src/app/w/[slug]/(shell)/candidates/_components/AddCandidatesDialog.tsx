"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, Upload } from "lucide-react";
import {
  CSV_TEMPLATE,
  guessMapping,
  IMPORT_FIELD_LABELS,
  IMPORT_MAX,
  parseCsv,
  parsePastedList,
  rowsFromMapping,
  type ImportField,
  type ImportRow,
} from "@/lib/crm/import";
import { STAGE_LABELS, type PipelineStage } from "@/lib/crm/stages";
import type { RosterBatch, RosterMember } from "@/lib/crm/roster";
import { plural } from "@/lib/workspace/display";
import {
  createCandidateAction,
  importCandidatesAction,
  previewImportAction,
  type ImportRowCheck,
} from "../manage-actions";
import { Btn, Dialog, Field, inputCls } from "./ui";

type Mode = "one" | "paste" | "csv";
// Passed and Not passed are decisions made after screening, never at import.
const STARTS: PipelineStage[] = ["NEW", "SCREENING"];
const selectCls = `${inputCls} pr-8`;

export function AddCandidatesDialog({
  slug,
  batches,
  members,
  defaultBatchId,
  initialMode = "one",
  onClose,
  onDone,
}: {
  slug: string;
  batches: RosterBatch[];
  members: RosterMember[];
  defaultBatchId?: string | null;
  initialMode?: Mode;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Shared group options.
  const [batchId, setBatchId] = useState<string>(defaultBatchId ?? "");
  const [stage, setStage] = useState<string>("NEW");
  const [ownerId, setOwnerId] = useState<string>("");
  const [groupTags, setGroupTags] = useState("");

  // One person.
  const [one, setOne] = useState({ name: "", email: "", phone: "", source: "", tags: "", note: "" });
  const [dupe, setDupe] = useState<{ id: string; name: string } | null>(null);

  // Paste and CSV.
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [step, setStep] = useState<"input" | "map" | "review">("input");
  const [checks, setChecks] = useState<ImportRowCheck[] | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const splitTags = (s: string) => s.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  const openBatches = batches.filter((b) => b.status === "OPEN" || b.id === defaultBatchId);

  const rows: ImportRow[] = useMemo(() => {
    if (mode === "paste") return parsePastedList(pasted);
    if (mode === "csv" && csvRows) return rowsFromMapping(csvRows.slice(1), mapping);
    return [];
  }, [mode, pasted, csvRows, mapping]);

  const counts = useMemo(() => {
    const c = { new: 0, duplicate: 0, invalid: 0 };
    for (const k of checks ?? []) c[k.state]++;
    return c;
  }, [checks]);
  const importCount = counts.new + (updateExisting ? counts.duplicate : 0);

  function switchMode(m: Mode) {
    setMode(m);
    setStep("input");
    setChecks(null);
    setError(null);
  }

  function readFile(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("That file is over 2 MB. Split it into smaller files.");
      return;
    }
    file.text().then((text) => {
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("The file needs a header row and at least one person.");
        return;
      }
      if (parsed.length - 1 > IMPORT_MAX) {
        setError(`The file has ${parsed.length - 1} rows. Import up to ${IMPORT_MAX} at a time.`);
        return;
      }
      setFileName(file.name);
      setCsvRows(parsed);
      setMapping(guessMapping(parsed[0]));
      setStep("map");
    });
  }

  function review() {
    setError(null);
    if (!rows.length) {
      setError(mode === "paste" ? "Paste at least one line." : "No rows to import.");
      return;
    }
    if (rows.length > IMPORT_MAX) {
      setError(`That is ${rows.length} people. Import up to ${IMPORT_MAX} at a time.`);
      return;
    }
    if (mode === "csv" && (!mapping.includes("name") || !mapping.includes("email"))) {
      setError("Match one column to Name and one to Email.");
      return;
    }
    start(async () => {
      const r = await previewImportAction(slug, rows);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setChecks(r.checks);
      setStep("review");
    });
  }

  function importAll() {
    start(async () => {
      const r = await importCandidatesAction(slug, rows, {
        batchId: batchId || null,
        ownerId: ownerId || null,
        stage,
        tags: splitTags(groupTags),
        updateExisting,
        via: mode,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const parts = [
        r.created && `added ${plural(r.created, "candidate")}`,
        r.updated && `updated ${r.updated}`,
        r.skipped && `skipped ${r.skipped} already here`,
        r.invalid && `left out ${r.invalid} with problems`,
      ].filter(Boolean);
      const msg = parts.join(", ");
      onDone(msg.charAt(0).toUpperCase() + msg.slice(1));
      router.refresh();
    });
  }

  function addOne(onDuplicate: "error" | "update" = "error") {
    setError(null);
    start(async () => {
      const r = await createCandidateAction(
        slug,
        {
          name: one.name,
          email: one.email || null,
          phone: one.phone || null,
          source: one.source || null,
          tags: [...splitTags(one.tags), ...splitTags(groupTags)],
          notes: one.note || null,
          stage,
          batchId: batchId || null,
          ownerId: ownerId || null,
        },
        onDuplicate,
      );
      if (!r.ok) {
        if (r.existing) setDupe(r.existing);
        else setError(r.error);
        return;
      }
      onDone(r.outcome === "updated" ? `Updated ${one.name}` : `Added ${one.name}`);
      router.refresh();
    });
  }

  const groupOptions = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Field label="Batch">
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={selectCls}>
          <option value="">No batch</option>
          {openBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Start at stage">
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectCls}>
          {STARTS.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Owner">
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectCls}>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Add tags">
        <input value={groupTags} onChange={(e) => setGroupTags(e.target.value)} placeholder="oct-drive" className={inputCls} />
      </Field>
    </div>
  );

  const stepper = mode !== "one" && (
    <ol className="flex flex-wrap gap-5 text-[13px] mb-5">
      {(mode === "csv" ? ["Upload", "Match columns", "Review and import"] : ["Paste", "Review and import"]).map((t, i) => {
        const at = mode === "csv" ? ["input", "map", "review"].indexOf(step) : step === "review" ? 1 : 0;
        return (
          <li key={t} className={`flex items-center gap-2 ${i === at ? "text-fg" : i < at ? "text-muted" : "text-subtle"}`} aria-current={i === at ? "step" : undefined}>
            <span
              className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-semibold ${
                i < at ? "bg-secondary text-bg" : i === at ? "border-2 border-secondary" : "border border-border-strong"
              }`}
            >
              {i < at ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
            </span>
            {t}
          </li>
        );
      })}
    </ol>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (mode === "one") {
    body = (
      <div className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={one.email}
              onChange={(e) => {
                setOne({ ...one, email: e.target.value });
                setDupe(null);
              }}
              className={inputCls}
              autoComplete="off"
            />
          </Field>
          <Field label="Phone (optional)">
            <input value={one.phone} onChange={(e) => setOne({ ...one, phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Source (optional)">
            <input value={one.source} onChange={(e) => setOne({ ...one, source: e.target.value })} placeholder="linkedin, referral" className={inputCls} />
          </Field>
        </div>
        {dupe && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-[13px] text-fg flex flex-wrap items-center gap-3">
            <span className="flex-1 min-w-[200px]">
              <strong className="font-semibold">{dupe.name}</strong> already uses this email. Nothing was changed.
            </span>
            <Link href={`/w/${slug}/candidates/${dupe.id}`} className="font-medium text-secondary-soft hover:underline">
              Open profile
            </Link>
            <Btn onClick={() => addOne("update")} disabled={busy}>
              Update them instead
            </Btn>
          </div>
        )}
        {groupOptions}
        <Field label="Note for the team (optional)">
          <textarea rows={2} value={one.note} onChange={(e) => setOne({ ...one, note: e.target.value })} className={`${inputCls} h-auto py-2 resize-none`} />
        </Field>
      </div>
    );
    footer = (
      <>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" size="md" disabled={!one.name.trim() || busy} onClick={() => addOne()}>
          {busy ? "Adding" : "Add candidate"}
        </Btn>
      </>
    );
  } else if (step === "input") {
    body =
      mode === "paste" ? (
        <div className="flex flex-col gap-3">
          {stepper}
          <Field label="One person per line" hint="Name and email in any order, separated by a comma or tab. Copying rows from a spreadsheet works too.">
            <textarea
              rows={9}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Priya Raman, priya@example.com\nTom Becker <tom@example.com>\nkiran.das@example.com"}
              className={`${inputCls} h-auto py-2 font-mono text-[13px] resize-y`}
            />
          </Field>
          <p className="text-[13px] text-subtle">{rows.length ? `${plural(rows.length, "line")} found` : ""}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stepper}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) readFile(f);
            }}
            className="flex flex-col items-center justify-center gap-2 h-44 rounded-xl border border-dashed border-border-strong bg-bg/50 text-muted hover:bg-panel/50 hover:text-fg transition"
          >
            <Upload className="w-6 h-6 text-subtle" aria-hidden />
            <span className="text-sm font-medium">Drop a CSV here or choose a file</span>
            <span className="text-xs text-subtle">Up to {IMPORT_MAX} rows. Needs a name and an email column.</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} aria-label="Choose a CSV file" />
        </div>
      );
    footer = (
      <>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
          download="candidates-template.csv"
          className="mr-auto text-[13px] font-medium text-secondary-soft hover:underline"
        >
          Download a template
        </a>
        <Btn onClick={onClose}>Cancel</Btn>
        {mode === "paste" && (
          <Btn variant="primary" size="md" disabled={!rows.length || busy} onClick={review}>
            Review {rows.length ? plural(rows.length, "person", "people") : ""}
          </Btn>
        )}
      </>
    );
  } else if (step === "map" && csvRows) {
    const header = csvRows[0];
    body = (
      <div className="flex flex-col gap-4">
        {stepper}
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <FileText className="w-4 h-4 text-subtle" aria-hidden />
          <span className="font-medium text-fg">{fileName}</span> · {plural(csvRows.length - 1, "row")} · {plural(header.length, "column")}
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)] gap-4 px-3.5 py-2.5 text-xs font-medium text-subtle border-b border-border">
            <span>Column in your file</span>
            <span>Imports as</span>
            <span>Sample</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {header.map((h, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)] gap-4 items-center px-3.5 py-2 border-b border-border last:border-b-0 text-[13px]">
                <span className="truncate text-fg">{h || `Column ${i + 1}`}</span>
                <select
                  aria-label={`${h || `Column ${i + 1}`} imports as`}
                  value={mapping[i]}
                  onChange={(e) => {
                    const v = e.target.value as ImportField;
                    setMapping((m) => m.map((x, j) => (j === i ? v : v !== "skip" && x === v ? "skip" : x)));
                  }}
                  className={`${selectCls} h-8 ${mapping[i] === "skip" ? "text-subtle" : ""}`}
                >
                  {(Object.keys(IMPORT_FIELD_LABELS) as ImportField[]).map((f) => (
                    <option key={f} value={f}>
                      {IMPORT_FIELD_LABELS[f]}
                    </option>
                  ))}
                </select>
                <span className="text-subtle truncate">
                  {csvRows
                    .slice(1, 3)
                    .map((r) => r[i])
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    footer = (
      <>
        <Btn onClick={() => setStep("input")}>Back</Btn>
        <Btn variant="primary" size="md" disabled={busy} onClick={review}>
          {busy ? "Checking" : "Review"}
        </Btn>
      </>
    );
  } else {
    const problems = (checks ?? []).filter((c) => c.state === "invalid");
    body = (
      <div className="flex flex-col gap-4">
        {stepper}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center h-7 px-2.5 rounded-md bg-success/15 text-success text-xs font-medium">{counts.new} new</span>
          {counts.duplicate > 0 && (
            <span className="inline-flex items-center h-7 px-2.5 rounded-md bg-warning/15 text-warning text-xs font-medium">
              {counts.duplicate} already in the workspace
            </span>
          )}
          {counts.invalid > 0 && (
            <span className="inline-flex items-center h-7 px-2.5 rounded-md bg-danger/15 text-danger text-xs font-medium">{counts.invalid} with problems</span>
          )}
          {counts.duplicate > 0 && (
            <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} className="w-4 h-4 accent-secondary" />
              Update the {counts.duplicate} existing {counts.duplicate === 1 ? "person" : "people"}
            </label>
          )}
        </div>
        {(problems.length > 0 || counts.duplicate > 0) && (
          <details className="rounded-xl border border-border text-[13px]">
            <summary className="cursor-pointer px-3.5 py-2.5 text-muted hover:text-fg">See which rows</summary>
            <ul className="max-h-40 overflow-y-auto border-t border-border divide-y divide-border">
              {(checks ?? [])
                .filter((c) => c.state !== "new")
                .map((c) => (
                  <li key={c.row} className="flex gap-3 px-3.5 py-2">
                    <span className="text-subtle w-14 shrink-0">Row {c.row}</span>
                    <span className="text-fg truncate">{rows[c.row - 1]?.name || rows[c.row - 1]?.email || "Empty"}</span>
                    <span className={`ml-auto shrink-0 ${c.state === "invalid" ? "text-danger" : "text-warning"}`}>
                      {c.state === "invalid" ? c.reason : `Matches ${c.existingName}`}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
        )}
        <p className="text-[13px] text-muted">These settings apply to everyone in this import. A New or Screening stage in the file wins over the one here.</p>
        {groupOptions}
      </div>
    );
    footer = (
      <>
        <Btn onClick={() => setStep(mode === "csv" ? "map" : "input")}>Back</Btn>
        <Btn variant="primary" size="md" disabled={!importCount || busy} onClick={importAll}>
          {busy ? "Importing" : `Import ${plural(importCount, "candidate")}`}
        </Btn>
      </>
    );
  }

  return (
    <Dialog title="Add candidates" onClose={onClose} width={820} footer={footer}>
      <div role="tablist" aria-label="How to add" className="flex gap-1 -mt-1 mb-5">
        {(
          [
            ["one", "One person"],
            ["paste", "Paste a list"],
            ["csv", "Upload CSV"],
          ] as const
        ).map(([m, t]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`h-8 px-3.5 rounded-lg text-[13px] font-medium transition ${mode === m ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {body}
      {error && (
        <p role="alert" className="mt-4 text-[13px] text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
