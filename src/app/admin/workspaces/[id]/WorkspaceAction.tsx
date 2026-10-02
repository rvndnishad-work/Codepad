"use client";

/**
 * One button per admin action on a workspace. Each opens a confirm dialog
 * with the fields that action needs (a required note for anything that
 * touches money, access or data), runs the server action and refreshes.
 * No window.confirm anywhere.
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn, Dialog, Field, inputCls } from "@/app/w/[slug]/(shell)/candidates/_components/ui";
import * as act from "./actions";

export type ActionKind =
  | "sync-seats"
  | "retry-payment"
  | "comp"
  | "plan"
  | "trial"
  | "grant"
  | "adjust"
  | "refund"
  | "video-off"
  | "lock"
  | "unlock"
  | "delete"
  | "undelete";

type Spec = {
  title: string;
  body?: string;
  confirm: string;
  danger?: boolean;
  note?: string;
  amount?: "positive" | "signed";
  days?: boolean;
  plan?: boolean;
  confirmName?: boolean;
  emailOwner?: boolean;
  session?: boolean;
};

const SPECS: Record<ActionKind, Spec> = {
  "sync-seats": { title: "Sync seats", confirm: "Sync seats", body: "Sets the seat quantity on the Stripe subscription to the member count. Stripe prorates the difference on the next invoice." },
  "retry-payment": { title: "Retry payment", confirm: "Charge now", body: "Pays the open invoice now with the card on file. If the card fails, nothing else changes." },
  comp: {
    title: "Comp a month",
    confirm: "Add the credit",
    body: "Adds one month of the subscription as a credit on the Stripe customer balance. Stripe takes it off the next invoice.",
    note: "Why (kept in the audit log and on the Stripe credit)",
  },
  plan: { title: "Change plan", confirm: "Change plan", plan: true, note: "Why", body: "" },
  trial: { title: "Extend trial", confirm: "Extend trial", days: true, note: "Why" },
  grant: { title: "Grant AI credits", confirm: "Grant credits", amount: "positive", note: "Note (shown in the ledger)", emailOwner: true },
  adjust: { title: "Adjust AI credits", confirm: "Adjust", amount: "signed", note: "Why (shown in the ledger)", body: "Use a minus sign to take credits away." },
  refund: { title: "Refund a session", confirm: "Refund", session: true, note: "Why", body: "Gives back the credits a screening used. A session can be refunded once." },
  "video-off": {
    title: "Turn the video add-on off",
    confirm: "Turn off",
    danger: true,
    note: "Why",
    body: "Removes the add-on line from the Stripe subscription first, then switches built-in video off. Interviews fall back to meeting links.",
  },
  lock: {
    title: "Lock workspace",
    confirm: "Lock",
    danger: true,
    note: "Reason (required)",
    body: "Members cannot open the workspace and candidate links stop working. Nothing is deleted and you can unlock at any time.",
  },
  unlock: { title: "Unlock workspace", confirm: "Unlock", note: "Note" },
  delete: {
    title: "Schedule deletion",
    confirm: "Schedule deletion",
    danger: true,
    confirmName: true,
    note: "Reason (required)",
    body: "Cancels the Stripe subscription first, then closes the workspace. It is erased after 30 days unless an owner or an admin undoes it.",
  },
  undelete: { title: "Cancel the scheduled deletion", confirm: "Keep the workspace", note: "Note", body: "The workspace opens again. A cancelled Stripe subscription is not restored; the owner subscribes again." },
};

const PLANS = [
  { id: "FREE", label: "Free (cancels the Stripe subscription now)" },
  { id: "STARTER", label: "Starter (legacy)" },
  { id: "GROWTH", label: "Growth" },
  { id: "ENTERPRISE", label: "Enterprise" },
];

type Refundable = { id: string; label: string; status: string; amount: number; at: string };

export default function WorkspaceAction({
  kind,
  workspaceId,
  workspaceName,
  label,
  variant = "ghost",
  currentPlan,
  autoOpen = false,
  disabled = false,
}: {
  kind: ActionKind;
  workspaceId: string;
  workspaceName?: string;
  label: string;
  variant?: "primary" | "ghost" | "danger";
  currentPlan?: string;
  autoOpen?: boolean;
  disabled?: boolean;
}) {
  const spec = SPECS[kind];
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("7");
  const [plan, setPlan] = useState(currentPlan === "GROWTH" ? "ENTERPRISE" : "GROWTH");
  const [confirmName, setConfirmName] = useState("");
  const [emailOwner, setEmailOwner] = useState(false);
  const [sessions, setSessions] = useState<Refundable[] | null>(null);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (!open || !spec.session || sessions) return;
    act.refundableSessionsAction(workspaceId).then((rows) => {
      setSessions(rows);
      setSessionId(rows[0]?.id ?? "");
    }, () => setSessions([]));
  }, [open, spec.session, sessions, workspaceId]);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      let r: { ok: boolean; error?: string } & Record<string, unknown>;
      try {
        switch (kind) {
          case "sync-seats": r = await act.syncSeatsAction(workspaceId); break;
          case "retry-payment": r = await act.retryPaymentAction(workspaceId); break;
          case "comp": r = await act.compMonthAction(workspaceId, note); break;
          case "plan": r = await act.changePlanAction(workspaceId, plan, note); break;
          case "trial": r = await act.extendTrialAction(workspaceId, Number(days), note); break;
          case "grant": r = await act.grantCreditsAction(workspaceId, amount, note, emailOwner); break;
          case "adjust": r = await act.adjustCreditsAction(workspaceId, amount, note); break;
          case "refund": r = await act.refundSessionAction(workspaceId, sessionId, note); break;
          case "video-off": r = await act.turnVideoOffAction(workspaceId, note); break;
          case "lock": r = await act.lockAction(workspaceId, note); break;
          case "unlock": r = await act.unlockAction(workspaceId, note); break;
          case "delete": r = await act.scheduleDeletionAction(workspaceId, confirmName, note); break;
          case "undelete": r = await act.cancelDeletionAction(workspaceId, note); break;
        }
      } catch {
        r = { ok: false, error: "Something went wrong. Nothing was changed." };
      }
      if (!r.ok) {
        setError(r.error ?? "That did not work.");
        return;
      }
      setOpen(false);
      setNote("");
      setAmount("");
      setConfirmName("");
      setSessions(null);
      setDone(`${spec.title}: done`);
      setTimeout(() => setDone(null), 4000);
      router.refresh();
    });

  const needsNote = !!spec.note && kind !== "unlock" && kind !== "undelete";
  const ready =
    (!needsNote || note.trim().length >= 3) &&
    (!spec.amount || amount.trim() !== "") &&
    (!spec.confirmName || confirmName.trim() === (workspaceName ?? "").trim()) &&
    (!spec.session || !!sessionId) &&
    (!spec.plan || plan !== currentPlan);

  return (
    <>
      <Btn variant={variant} onClick={() => setOpen(true)} disabled={disabled}>
        {label}
      </Btn>
      {done && (
        <span role="status" className="text-xs text-success">
          {done}
        </span>
      )}
      {open && (
        <Dialog
          title={spec.title}
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn variant={spec.danger ? "danger" : "primary"} onClick={submit} disabled={busy || !ready}>
                {busy ? "Working" : spec.confirm}
              </Btn>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {spec.body && <p className="text-sm text-muted">{spec.body}</p>}
            {spec.plan && (
              <>
                <p className="text-sm text-muted">
                  With a Stripe subscription this changes Stripe first: Starter and Growth reprice the seat line (prorated), Enterprise keeps the price,
                  Free cancels the subscription. If Stripe refuses, nothing is saved.
                </p>
                <Field label={`Plan (now ${currentPlan ?? "unknown"})`}>
                  <select className={inputCls} value={plan} onChange={(e) => setPlan(e.target.value)}>
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === currentPlan}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            {spec.session && (
              <Field label="Session">
                {sessions === null ? (
                  <span className="text-sm text-muted">Loading sessions</span>
                ) : sessions.length === 0 ? (
                  <span className="text-sm text-muted">No charged sessions are waiting for a refund.</span>
                ) : (
                  <select className={inputCls} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}, {s.amount} {s.amount === 1 ? "credit" : "credits"}, {new Date(s.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
            {spec.amount && (
              <Field label="Credits" hint={spec.amount === "signed" ? "For example 5 or -3." : undefined}>
                <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={spec.amount === "signed" ? "-3" : "20"} />
              </Field>
            )}
            {spec.days && (
              <Field label="Days to add" hint="From the current trial end, or from today if it already ended.">
                <select className={inputCls} value={days} onChange={(e) => setDays(e.target.value)}>
                  {[3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {spec.note && (
              <Field label={spec.note}>
                <textarea className={`${inputCls} h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              </Field>
            )}
            {spec.emailOwner && (
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={emailOwner} onChange={(e) => setEmailOwner(e.target.checked)} />
                Email the owner with this note
              </label>
            )}
            {spec.confirmName && (
              <Field label={`Type ${workspaceName ?? "the workspace name"} to confirm`}>
                <input className={inputCls} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
              </Field>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
