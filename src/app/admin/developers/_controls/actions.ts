"use server";

/**
 * Developer-side switches from the Controls rail. Delegates to the shared
 * switch action; only refuses keys from the other side.
 */
import { switchDef } from "@/lib/admin/switches";
import { setFeatureSwitch } from "@/app/admin/_components/switch-control/actions";
import type { SetSwitchInput } from "@/app/admin/_components/switch-control/validate";

export type { SetSwitchInput };
export type SetSwitchResult = { ok: true } | { ok: false; error: string };

export async function setDeveloperSwitch(input: SetSwitchInput): Promise<SetSwitchResult> {
  const def = switchDef(input?.key);
  if (!def || def.side !== "developer") return { ok: false, error: "Unknown switch." };
  const res = await setFeatureSwitch(input);
  return res.ok ? { ok: true } : res;
}
