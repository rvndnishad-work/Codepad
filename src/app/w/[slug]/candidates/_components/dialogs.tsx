"use client";

import { useState } from "react";
import { REJECT_REASON_CHOICES, REJECT_REASON_LABELS, type RejectReason } from "@/lib/crm/stages";
import { plural } from "@/lib/workspace/display";
import { Btn, Dialog, Field, inputCls } from "./ui";

export function RejectDialog({
  names,
  onCancel,
  onConfirm,
  busy,
}: {
  names: string[];
  onCancel: () => void;
  onConfirm: (reason: RejectReason, note: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState<RejectReason | "">("");
  const [note, setNote] = useState("");
  const who = names.length === 1 ? names[0] : plural(names.length, "candidate");
  return (
    <Dialog
      title={`Mark ${who} as not passed`}
      onClose={onCancel}
      width={480}
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" disabled={!reason || busy} onClick={() => reason && onConfirm(reason, note)}>
            {busy ? "Saving" : "Not passed"}
          </Btn>
        </>
      }
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="text-[13px] text-muted mb-2">Why? The reason is kept on the record and in reporting.</legend>
        {REJECT_REASON_CHOICES.map((r) => (
          <label key={r} className="flex items-center gap-2.5 h-9 px-2 rounded-lg text-sm text-fg hover:bg-panel cursor-pointer">
            <input
              type="radio"
              name="reject-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="w-4 h-4 accent-secondary"
            />
            {REJECT_REASON_LABELS[r]}
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <Field label="Note (optional)">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="For example: strong on the take-home, weak on system design"
            className={`${inputCls} h-auto py-2 resize-none`}
          />
        </Field>
      </div>
    </Dialog>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  requireText,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the person must type this word to enable the button. */
  requireText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const ok = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      width={460}
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant={danger ? "danger" : "primary"} disabled={!ok || busy} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="text-sm text-muted leading-relaxed">{body}</div>
      {requireText && (
        <div className="mt-4">
          <Field label={`Type ${requireText} to confirm`}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} autoComplete="off" />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

export function TagDialog({
  count,
  suggestions,
  onCancel,
  onConfirm,
  busy,
}: {
  count: number;
  suggestions: string[];
  onCancel: () => void;
  onConfirm: (add: string[], remove: string[]) => void;
  busy?: boolean;
}) {
  const [add, setAdd] = useState("");
  const [remove, setRemove] = useState("");
  const split = (s: string) => s.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  return (
    <Dialog
      title={`Tag ${plural(count, "candidate")}`}
      onClose={onCancel}
      width={480}
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" disabled={busy || (!split(add).length && !split(remove).length)} onClick={() => onConfirm(split(add), split(remove))}>
            Apply tags
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Add tags" hint="Separate tags with commas.">
          <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="shortlist, react" className={inputCls} list="tag-suggestions" />
        </Field>
        <Field label="Remove tags">
          <input value={remove} onChange={(e) => setRemove(e.target.value)} className={inputCls} list="tag-suggestions" />
        </Field>
        <datalist id="tag-suggestions">
          {suggestions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 12).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAdd((a) => (split(a).includes(t) ? a : [...split(a), t].join(", ")))}
                className="h-7 px-2 rounded-md border border-border text-xs text-muted hover:text-fg hover:border-border-strong"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
