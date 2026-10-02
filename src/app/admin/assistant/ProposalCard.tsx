"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Proposal, ProposalField } from "@/lib/admin/assistant/types";

export const pill = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-danger/15 text-danger",
  info: "bg-secondary/15 text-secondary-soft",
  off: "bg-panel text-muted border border-border",
};

export const btn =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel transition disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition disabled:opacity-50";

const inputCls = "w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-fg outline-none focus:border-secondary";

function FieldInput({ field, value, onChange }: { field: ProposalField; value: unknown; onChange: (v: unknown) => void }) {
  const id = `f-${field.key}`;
  if (field.input === "boolean") {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-fg">
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{field.label}</span>
      {field.input === "textarea" ? (
        <textarea id={id} rows={3} className={inputCls} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : field.input === "select" ? (
        <select id={id} className={inputCls} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.input === "number" ? "number" : "text"}
          className={inputCls}
          value={String(value ?? "")}
          placeholder={field.input === "datetime" ? "2026-10-04T06:00:00Z" : undefined}
          onChange={(e) => onChange(field.input === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        />
      )}
    </label>
  );
}

export default function ProposalCard({
  messageId,
  proposal,
  onChange,
}: {
  messageId: string;
  proposal: Proposal;
  onChange: (p: Proposal) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(proposal.args);
  const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(proposal.error ?? null);

  async function act(kind: "approve" | "dismiss") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assistant/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, ...(kind === "approve" && editing ? { edits: draft } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setEditing(false);
      onChange(data.proposal as Proposal);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const decided = proposal.status === "approved" || proposal.status === "dismissed";
  const shown = editing ? draft : proposal.args;

  return (
    <div className="rounded-xl border border-secondary/40 bg-surface px-4 py-3.5 flex flex-col gap-2.5 max-w-[560px]">
      <div className="flex items-center gap-2.5 flex-wrap">
        {proposal.status === "approved" ? (
          <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium ${pill.ok}`}>
            <Check className="w-3.5 h-3.5" /> Done
          </span>
        ) : proposal.status === "dismissed" ? (
          <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${pill.off}`}>Dismissed</span>
        ) : (
          <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${pill.info}`}>Needs your approval</span>
        )}
        <span className="text-sm font-medium text-fg">{proposal.summary}</span>
      </div>

      <dl className="flex flex-col">
        {proposal.facts.map((f) => (
          <div key={f.label} className="flex justify-between gap-3 py-1 text-sm">
            <dt className="text-muted">{f.label}</dt>
            <dd className="text-fg text-right">{f.value}</dd>
          </div>
        ))}
        {!editing &&
          proposal.fields
            .filter((f) => f.input !== "boolean" || shown[f.key] === true)
            .filter((f) => shown[f.key] !== undefined && shown[f.key] !== "")
            .map((f) => (
              <div key={f.key} className="flex justify-between gap-3 py-1 text-sm">
                <dt className="text-muted shrink-0">{f.label}</dt>
                <dd className="text-fg text-right whitespace-pre-wrap break-words min-w-0">
                  {f.input === "boolean" ? "Yes" : f.input === "select" ? String(shown[f.key]).replace(/_/g, " ") : String(shown[f.key])}
                </dd>
              </div>
            ))}
      </dl>

      {editing && (
        <div className="flex flex-col gap-2.5">
          {proposal.fields
            .filter((f) => !f.readOnly)
            .map((f) => (
              <FieldInput key={f.key} field={f} value={draft[f.key]} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
            ))}
        </div>
      )}

      {proposal.result && <p className="text-sm text-muted">{proposal.result}</p>}
      {error && !decided && <p className="text-sm text-danger">{error}</p>}

      {!decided && (
        <div className="flex gap-2 justify-end pt-1 flex-wrap">
          <button type="button" className={btn} disabled={!!busy} onClick={() => act("dismiss")}>
            {busy === "dismiss" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Dismiss
          </button>
          {editing ? (
            <button
              type="button"
              className={btn}
              disabled={!!busy}
              onClick={() => {
                setDraft(proposal.args);
                setEditing(false);
              }}
            >
              Cancel edit
            </button>
          ) : (
            <button type="button" className={btn} disabled={!!busy} onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button type="button" className={btnPrimary} disabled={!!busy || proposal.status === "running"} onClick={() => act("approve")}>
            {busy === "approve" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {proposal.approveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
