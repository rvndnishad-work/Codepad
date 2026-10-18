"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adjustCreditsAction, grantCreditsAction } from "./actions";

type Mode = "grant" | "adjust";

/**
 * Grant or adjust one workspace's credits. Two steps: fill in the amount and
 * a required note, then confirm a summary that shows the balance before and
 * after. Money-like actions never run on one click.
 */
export default function CreditControls({ workspaceId, name, balance }: { workspaceId: string; name: string; balance: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const n = Number(amount);
  const valid = amount.trim() !== "" && Number.isInteger(n) && n !== 0 && (mode === "adjust" || n > 0) && note.trim().length > 0;
  const delta = mode === "grant" ? Math.abs(n) : n;

  const close = () => {
    setMode(null);
    setAmount("");
    setNote("");
    setStep("edit");
  };

  const run = () =>
    start(async () => {
      try {
        const res = mode === "grant" ? await grantCreditsAction(workspaceId, n, note) : await adjustCreditsAction(workspaceId, n, note);
        if (res.ok) {
          setMsg({ ok: true, text: res.message ?? "Done." });
          close();
          router.refresh();
        } else {
          setMsg({ ok: false, text: res.error });
          setStep("edit");
        }
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
        setStep("edit");
      }
    });

  const btn = "inline-flex h-8 items-center rounded-lg border border-border bg-surface px-2.5 text-sm text-fg hover:border-border-strong hover:bg-panel";

  if (!mode) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-1.5">
          <button type="button" className={btn} onClick={() => { setMode("grant"); setMsg(null); }}>Grant</button>
          <button type="button" className={btn} onClick={() => { setMode("adjust"); setMsg(null); }}>Adjust</button>
        </div>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>}
      </div>
    );
  }

  return (
    <div className="ml-auto flex w-full max-w-sm flex-col gap-2 rounded-xl border border-border-strong bg-surface p-3 text-left">
      <p className="text-sm font-semibold text-fg">{mode === "grant" ? `Grant credits to ${name}` : `Adjust credits for ${name}`}</p>
      {step === "edit" ? (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {mode === "grant" ? "Credits to add" : "Credits, use a minus sign to take off"}
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === "grant" ? "10" : "-5"}
              className="h-9 rounded-lg border border-border bg-bg px-3 font-mono text-sm text-fg focus:border-secondary/60 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Note (required, kept in the ledger and audit log)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={mode === "grant" ? "Comp for onboarding call" : "Duplicate purchase credited twice"}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-secondary/60 focus:outline-none"
            />
          </label>
          {msg && !msg.ok && <p role="alert" className="text-sm text-danger">{msg.text}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={!valid} onClick={() => setStep("confirm")} className="inline-flex h-9 items-center rounded-lg bg-fg px-3 text-sm font-medium text-bg disabled:opacity-50">
              Review
            </button>
            <button type="button" onClick={close} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm text-fg hover:bg-panel">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">Change</dt>
            <dd className={`tabular-nums ${delta < 0 ? "text-danger" : "text-success"}`}>{delta > 0 ? `+${delta}` : delta}</dd>
            <dt className="text-muted">Balance</dt>
            <dd className="tabular-nums text-fg">
              {balance} → {balance + delta}
            </dd>
            <dt className="text-muted">Note</dt>
            <dd className="break-words text-fg">{note.trim()}</dd>
          </dl>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={run} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fg px-3 text-sm font-medium text-bg disabled:opacity-50">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </button>
            <button type="button" disabled={pending} onClick={() => setStep("edit")} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm text-fg hover:bg-panel">
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
