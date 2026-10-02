"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { syncAllWorkspaces } from "@/lib/admin/stripe-sync";

export type SyncStripeResult = { ok: true; synced: number; failed: number } | { ok: false; error: string };

/** "Sync now" on the revenue card: the nightly Stripe snapshot, run on demand. */
export async function syncStripeNow(): Promise<SyncStripeResult> {
  const session = await requireAdminAccess("platform:admin");
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: "Stripe is not configured here." };
  let result: Awaited<ReturnType<typeof syncAllWorkspaces>>;
  try {
    result = await syncAllWorkspaces();
  } catch (err) {
    console.error("[stripe.sync] failed", err);
    return { ok: false, error: "Stripe sync failed. Try again." };
  }
  await logAdminAction({
    actor: { id: session?.user?.id, email: session?.user?.email },
    action: "stripe.sync",
    targetType: "stripe",
    targetLabel: "All workspaces",
    after: { total: result.total, synced: result.synced, failed: result.failed },
  });
  revalidateTag("admin-hiring-stats", { expire: 0 });
  revalidatePath("/admin/recruiters");
  return { ok: true, synced: result.synced, failed: result.failed };
}
