"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RosterMember } from "@/lib/crm/roster";
import { createBatchAction, deleteBatchAction, updateBatchAction } from "../manage-actions";
import { ConfirmDialog } from "./dialogs";
import { Btn, Dialog, Field, inputCls } from "./ui";

export type BatchForm = {
  id?: string;
  name: string;
  roleTitle: string;
  ownerId: string;
  deadline: string; // yyyy-mm-dd
  targetHires: string;
  status: "OPEN" | "CLOSED";
};

export function BatchDialog({
  slug,
  members,
  initial,
  meId,
  canDelete,
  onClose,
  onDone,
}: {
  slug: string;
  members: RosterMember[];
  initial?: BatchForm;
  meId: string;
  canDelete?: boolean;
  onClose: () => void;
  onDone: (message: string, batchId?: string) => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<BatchForm>(
    initial ?? { name: "", roleTitle: "", ownerId: meId, deadline: "", targetHires: "", status: "OPEN" },
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, start] = useTransition();
  const editing = !!initial?.id;

  function save() {
    setError(null);
    const input = {
      name: f.name,
      roleTitle: f.roleTitle || null,
      ownerId: f.ownerId || null,
      deadline: f.deadline || null,
      targetHires: f.targetHires ? Number(f.targetHires) : null,
      status: f.status,
    };
    start(async () => {
      if (editing) {
        const r = await updateBatchAction(slug, initial!.id!, input);
        if (!r.ok) return setError(r.error);
        onDone("Batch saved", initial!.id);
      } else {
        const r = await createBatchAction(slug, input);
        if (!r.ok) return setError(r.error);
        onDone(`Created ${f.name.trim()}`, r.batchId);
      }
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const r = await deleteBatchAction(slug, initial!.id!);
      if (!r.ok) {
        setConfirmDelete(false);
        return setError(r.error);
      }
      router.push(`/w/${slug}/batches`);
      onDone("Batch deleted");
    });
  }

  if (confirmDelete) {
    return (
      <ConfirmDialog
        title={`Delete ${initial?.name}?`}
        body="The batch goes away. Its candidates stay in the workspace with their history and results, just without a batch."
        confirmLabel="Delete batch"
        danger
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    );
  }

  return (
    <Dialog
      title={editing ? "Batch settings" : "New batch"}
      onClose={onClose}
      width={560}
      footer={
        <>
          {editing && canDelete && (
            <Btn variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
              Delete batch
            </Btn>
          )}
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="md" disabled={!f.name.trim() || busy} onClick={save}>
            {editing ? "Save" : "Create batch"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!editing && <p className="text-[13px] text-muted -mt-1">A batch groups candidates for one role or hiring drive, with its own board and results.</p>}
        <Field label="Name">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Frontend engineers, October drive" className={inputCls} maxLength={80} />
        </Field>
        <Field label="Role (optional)">
          <input value={f.roleTitle} onChange={(e) => setF({ ...f, roleTitle: e.target.value })} placeholder="Senior frontend engineer" className={inputCls} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Owner">
            <select value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })} className={inputCls}>
              <option value="">Nobody</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline (optional)">
            <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} className={inputCls} />
          </Field>
          <Field label="How many to pass (optional)">
            <input type="number" min={0} value={f.targetHires} onChange={(e) => setF({ ...f, targetHires: e.target.value })} className={inputCls} />
          </Field>
        </div>
        {editing && (
          <fieldset className="flex gap-4 text-[13px] text-fg">
            <legend className="text-xs font-medium text-subtle mb-1.5">Status</legend>
            {(["OPEN", "CLOSED"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="batch-status" checked={f.status === s} onChange={() => setF({ ...f, status: s })} className="w-4 h-4 accent-secondary" />
                {s === "OPEN" ? "Open" : "Closed"}
              </label>
            ))}
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
