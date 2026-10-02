"use server";

/**
 * /admin/switches uses the one shared switch action, so every page that
 * changes a switch validates, writes and audits it the same way.
 */
import { revalidatePath } from "next/cache";
import { setFeatureSwitch } from "@/app/admin/_components/switch-control/actions";
import type { SetSwitchInput } from "@/app/admin/_components/switch-control/validate";

export type { SetSwitchInput };
export type SetSwitchResult = { ok: true } | { ok: false; error: string };

export async function setFeatureSwitchAction(input: SetSwitchInput): Promise<SetSwitchResult> {
  const res = await setFeatureSwitch(input);
  if (!res.ok) return res;
  revalidatePath("/admin/switches");
  return { ok: true };
}
