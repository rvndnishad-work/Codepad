"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn, Dialog, Field, inputCls } from "@/app/w/[slug]/(shell)/candidates/_components/ui";
import { WORKSPACE_ROLES, ROLE_LABELS } from "@/lib/workspace/members";
import { changeRoleAction, removeMemberAction, revokeInviteAction, transferOwnerAction } from "../actions";

type Mode = null | "role" | "owner" | "remove";

export function MemberActions({
  workspaceId,
  member,
  takeovers,
}: {
  workspaceId: string;
  member: { id: string; role: string; name: string };
  takeovers: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(member.role === "ADMIN" ? "RECRUITER" : "ADMIN");
  const [note, setNote] = useState("");
  const [takeover, setTakeover] = useState(takeovers[0]?.id ?? "");

  const close = () => {
    setMode(null);
    setError(null);
    setNote("");
  };
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn().catch(() => ({ ok: false, error: "Something went wrong. Nothing was changed." }));
      if (!r.ok) return setError(r.error ?? "That did not work.");
      close();
      router.refresh();
    });

  return (
    <div className="inline-flex flex-wrap justify-end gap-1.5">
      <Btn variant="quiet" onClick={() => setMode("role")}>Role</Btn>
      {member.role !== "OWNER" && <Btn variant="quiet" onClick={() => setMode("owner")}>Make owner</Btn>}
      <Btn variant="quiet" onClick={() => setMode("remove")}>Remove</Btn>

      {mode === "role" && (
        <Dialog
          title={`Change the role of ${member.name}`}
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn variant="primary" disabled={busy || role === member.role} onClick={() => run(() => changeRoleAction(workspaceId, member.id, role))}>
                Change role
              </Btn>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-left">
            <Field label={`Role (now ${ROLE_LABELS[member.role] ?? member.role})`}>
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                {WORKSPACE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </div>
        </Dialog>
      )}

      {mode === "owner" && (
        <Dialog
          title={`Make ${member.name} the owner`}
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn variant="primary" disabled={busy || note.trim().length < 3} onClick={() => run(() => transferOwnerAction(workspaceId, member.id, note))}>
                Transfer ownership
              </Btn>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-left">
            <p className="text-sm text-muted">They become the only owner. The current owners become admins.</p>
            <Field label="Why (required)">
              <textarea className={`${inputCls} h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </div>
        </Dialog>
      )}

      {mode === "remove" && (
        <Dialog
          title={`Remove ${member.name}`}
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn variant="danger" disabled={busy || !takeover || note.trim().length < 3} onClick={() => run(() => removeMemberAction(workspaceId, member.id, takeover, note))}>
                Remove member
              </Btn>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-left">
            <p className="text-sm text-muted">
              Uses the workspace handover: their candidates, upcoming interviews and open take-home reviews move to the person you pick, their API keys
              are revoked and the Stripe seat count follows.
            </p>
            <Field label="Hand their work to">
              {takeovers.length ? (
                <select className={inputCls} value={takeover} onChange={(e) => setTakeover(e.target.value)}>
                  {takeovers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-muted">Nobody else can take over their work.</span>
              )}
            </Field>
            <Field label="Why (required)">
              <textarea className={`${inputCls} h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </div>
        </Dialog>
      )}
    </div>
  );
}

export function RevokeInvite({ workspaceId, inviteId, email }: { workspaceId: string; inviteId: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Btn variant="quiet" onClick={() => setOpen(true)}>Revoke</Btn>
      {open && (
        <Dialog
          title="Revoke invite"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Btn onClick={() => setOpen(false)}>Cancel</Btn>
              <Btn
                variant="danger"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const r = await revokeInviteAction(workspaceId, inviteId).catch(() => ({ ok: false as const, error: "Something went wrong." }));
                    if (!r.ok) return setError(r.error);
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                Revoke
              </Btn>
            </>
          }
        >
          <p className="text-sm text-muted text-left">The invite link sent to {email} stops working.</p>
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
