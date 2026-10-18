"use server";

/**
 * Server action behind every three-state switch control (/admin/recruiters,
 * /admin/developers, /admin/switches). Upserts the FeatureSwitch row, drops
 * the per-instance switch cache and writes the audit entry.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { clearSwitchCache, getSwitch, switchDef, type SwitchState } from "@/lib/admin/switches";
import { validateSwitchInput, type SetSwitchInput } from "./validate";

export type SetSwitchResult = { ok: true; state: SwitchState } | { ok: false; error: string };

/** Pages that show switch state; revalidated after every change. */
const SWITCH_PAGES = ["/admin/recruiters", "/admin/developers", "/admin/switches", "/admin"];

export async function setFeatureSwitch(input: SetSwitchInput): Promise<SetSwitchResult> {
  const session = await requireAdminAccess("platform:admin");
  const checked = validateSwitchInput(input, new Date());
  if (!checked.ok) return checked;
  const { key, state, message, resumeAt, note } = checked.value;
  const def = switchDef(key);
  if (!def) return { ok: false, error: "Unknown switch." };

  const before = await getSwitch(key);
  const actorId = session?.user?.id ?? null;
  try {
    await prisma.featureSwitch.upsert({
      where: { key },
      create: { key, state, message, resumeAt, updatedById: actorId, updatedNote: note },
      update: { state, message, resumeAt, updatedById: actorId, updatedNote: note },
    });
  } catch (err) {
    console.error("[switch.set] write failed", key, err);
    return { ok: false, error: "Could not save the switch. Try again." };
  }
  clearSwitchCache();

  await logAdminAction({
    actor: { id: actorId, email: session?.user?.email ?? null },
    action: "switch.set",
    targetType: "feature_switch",
    targetId: key,
    targetLabel: def.label,
    before: { state: before.state, message: before.message, resumeAt: before.resumeAt },
    after: { state, message, resumeAt },
    note,
  });

  for (const p of SWITCH_PAGES) revalidatePath(p);
  return { ok: true, state };
}
