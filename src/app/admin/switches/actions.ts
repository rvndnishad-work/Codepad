"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { clearSwitchCache, switchDef, type SwitchState } from "@/lib/admin/switches";

export type SetSwitchInput = {
  key: string;
  state: SwitchState;
  message?: string | null;
  /** ISO time to turn back on automatically, or null for by hand. */
  resumeAt?: string | null;
  note: string;
};

export type SetSwitchResult = { ok: true } | { ok: false; error: string };

/**
 * Local version of the shared setSwitch action (the lead will unify it with
 * src/app/admin/_components/switch-control/actions.ts).
 */
export async function setFeatureSwitchAction(input: SetSwitchInput): Promise<SetSwitchResult> {
  const session = await requireAdminAccess("platform:admin");
  const actor = { id: session?.user?.id ?? null, email: session?.user?.email ?? null };

  const def = switchDef(input.key);
  if (!def) return { ok: false, error: "Unknown switch." };
  if (!["on", "read_only", "off"].includes(input.state)) return { ok: false, error: "Unknown state." };
  const note = (input.note ?? "").trim();
  if (!note) return { ok: false, error: "Write a note for the audit log." };
  if (note.length > 500) return { ok: false, error: "Keep the note under 500 characters." };

  const message = input.state === "on" ? null : (input.message ?? "").trim().slice(0, 1000) || null;
  let resumeAt: Date | null = null;
  if (input.state !== "on" && input.resumeAt) {
    const d = new Date(input.resumeAt);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Pick a valid time to turn back on." };
    if (d.getTime() <= Date.now() + 60_000) return { ok: false, error: "Turn back on at a time in the future." };
    if (d.getTime() > Date.now() + 30 * 24 * 3_600_000) return { ok: false, error: "Turn back on within 30 days, or by hand." };
    resumeAt = d;
  }

  const before = await prisma.featureSwitch.findUnique({ where: { key: def.key } });
  const after = await prisma.featureSwitch.upsert({
    where: { key: def.key },
    create: { key: def.key, state: input.state, message, resumeAt, updatedById: actor.id, updatedNote: note },
    update: { state: input.state, message, resumeAt, updatedById: actor.id, updatedNote: note },
  });
  clearSwitchCache();
  await logAdminAction({
    actor,
    action: "switch.set",
    targetType: "switch",
    targetId: def.key,
    targetLabel: def.label,
    before: before ?? { state: "on" },
    after,
    note,
  });
  revalidatePath("/admin/switches");
  return { ok: true };
}
