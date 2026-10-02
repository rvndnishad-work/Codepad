"use server";

/**
 * Set a developer-side feature switch from the Controls rail.
 * Local copy for P5; the lead will unify it with the shared switch control.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { clearSwitchCache, switchDef, type SwitchState } from "@/lib/admin/switches";

export type SetSwitchInput = {
  key: string;
  state: SwitchState;
  message?: string | null;
  /** ISO string, or null for no automatic resume. */
  resumeAt?: string | null;
  note: string;
};

export type SetSwitchResult = { ok: true } | { ok: false; error: string };

const STATES: SwitchState[] = ["on", "read_only", "off"];

export async function setDeveloperSwitch(input: SetSwitchInput): Promise<SetSwitchResult> {
  const session = await requireAdminAccess("platform:admin");
  const actor = { id: session?.user?.id, email: session?.user?.email };

  const def = switchDef(input.key);
  if (!def || def.side !== "developer") return { ok: false, error: "Unknown switch." };
  if (!STATES.includes(input.state)) return { ok: false, error: "Unknown state." };

  const note = (input.note ?? "").trim();
  if (note.length < 3) return { ok: false, error: "Write a short note saying why." };
  if (note.length > 2000) return { ok: false, error: "The note is too long." };

  const message = (input.message ?? "").trim().slice(0, 1000) || null;

  let resumeAt: Date | null = null;
  if (input.state !== "on" && input.resumeAt) {
    resumeAt = new Date(input.resumeAt);
    if (Number.isNaN(resumeAt.getTime())) return { ok: false, error: "The resume time is not a valid date." };
    if (resumeAt.getTime() <= Date.now()) return { ok: false, error: "The resume time must be in the future." };
  }

  const before = await prisma.featureSwitch.findUnique({ where: { key: def.key } });
  const data = {
    state: input.state,
    // Keep the written message when turning back on, so the next pause reuses it.
    message: input.state === "on" ? (before?.message ?? null) : message,
    resumeAt,
    updatedById: actor.id ?? null,
    updatedNote: note,
  };
  const after = await prisma.featureSwitch.upsert({
    where: { key: def.key },
    create: { key: def.key, ...data },
    update: data,
  });

  clearSwitchCache();
  await logAdminAction({
    actor,
    action: "switch.set",
    targetType: "feature_switch",
    targetId: def.key,
    targetLabel: def.label,
    before: before
      ? { state: before.state, message: before.message, resumeAt: before.resumeAt }
      : { state: "on", message: null, resumeAt: null },
    after: { state: after.state, message: after.message, resumeAt: after.resumeAt },
    note,
  });

  revalidatePath("/admin/developers");
  return { ok: true };
}
