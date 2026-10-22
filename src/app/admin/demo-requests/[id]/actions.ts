"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/permissions/staff";
import {
  createPilotFromRequest,
  endPilotNow,
  extendPilot,
  saveDemoNotes,
  setDemoOwner,
  setDemoStage,
  setDemoTime,
  type Actor,
  type CreatePilotInput,
} from "@/lib/demo-requests/server";

export type ActionResult = { ok: true; message?: string; slug?: string } | { ok: false; error: string };

async function actor(): Promise<Actor> {
  const session = await requireAdminAccess("platform:admin");
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

function done(id: string) {
  revalidatePath("/admin/demo-requests");
  revalidatePath(`/admin/demo-requests/${id}`);
}

async function run(id: string, fn: (a: Actor) => Promise<{ ok: true } | { ok: false; error: string }>, message?: string): Promise<ActionResult> {
  const a = await actor();
  try {
    const res = await fn(a);
    if (!res.ok) return res;
    done(id);
    return { ok: true, message };
  } catch (err) {
    console.error("[admin demo-requests]", err);
    return { ok: false, error: "Something went wrong. Reload and try again." };
  }
}

export async function changeStageAction(id: string, stage: string) {
  return run(id, (a) => setDemoStage(a, id, stage), "Stage saved.");
}

export async function takeRequestAction(id: string, take: boolean) {
  return run(id, (a) => setDemoOwner(a, id, take), take ? "You own this request." : "Request released.");
}

/** `when` is a datetime-local value read as UTC, or "" to clear. */
export async function setDemoTimeAction(id: string, when: string) {
  const value = when ? `${when}:00Z` : "";
  return run(id, (a) => setDemoTime(a, id, value), when ? "Demo booked." : "Demo time cleared.");
}

export async function saveNotesAction(id: string, notes: string) {
  return run(id, (a) => saveDemoNotes(a, id, notes), "Notes saved.");
}

export async function createPilotAction(id: string, input: CreatePilotInput): Promise<ActionResult> {
  const a = await actor();
  try {
    const res = await createPilotFromRequest(a, id, input);
    if (!res.ok) return res;
    done(id);
    revalidatePath("/admin/workspaces");
    return { ok: true, slug: res.slug, message: res.invited ? "Pilot created and the owner invite sent." : "Pilot created. The contact already had an account and is now the owner." };
  } catch (err) {
    console.error("[admin demo-requests] create pilot", err);
    return { ok: false, error: "Could not create the pilot. Nothing was saved. Try again." };
  }
}

export async function extendPilotAction(id: string, days: number, credits: number, note: string) {
  return run(id, (a) => extendPilot(a, id, days, credits, note), "Pilot extended.");
}

export async function endPilotAction(id: string, note: string) {
  return run(id, (a) => endPilotNow(a, id, note), "Pilot ended. The workspace is on Free now.");
}
