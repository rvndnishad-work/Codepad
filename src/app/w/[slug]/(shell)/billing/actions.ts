"use server";

/**
 * Billing and usage actions. Buying credits lives here now; the AI
 * screening pages link to the Usage and credits tab. The low-credit email
 * threshold saves through saveWorkspaceSettingsAction (group "billing").
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertFeatureOn, FeaturePausedError } from "@/lib/admin/switches";
import { canMember } from "@/lib/permissions";
import { appOrigin } from "@/lib/interview/links";
import { CreditCheckoutError, createCreditPackCheckout } from "@/lib/billing/credit-checkout";
import { setVideoAddon } from "@/lib/video/addon-server";
import { revalidatePath } from "next/cache";

export type BuyCreditsResult = { ok: true; url: string } | { ok: false; error: string };

export async function buyCreditsAction(slug: string, packId: string): Promise<BuyCreditsResult> {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return { ok: false, error: "You are signed out. Sign in and try again." };
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        stripeCustomerId: true,
        members: { where: { userId: session.user.id }, select: { role: true, permissions: true } },
      },
    });
    if (!workspace) return { ok: false, error: "Workspace not found." };
    const me = workspace.members[0];
    if (!me || !(await canMember(me, "billing:manage"))) return { ok: false, error: "Only owners and admins with billing access can buy credits." };
    await assertFeatureOn("credit-checkout");
    const url = await createCreditPackCheckout({ workspace, packId: String(packId), origin: await appOrigin() });
    return { ok: true, url };
  } catch (err) {
    if (err instanceof CreditCheckoutError || err instanceof FeaturePausedError) return { ok: false, error: err.message };
    console.error("[billing] credit checkout failed:", err);
    return { ok: false, error: "Could not open checkout. Try again in a moment." };
  }
}

export type SetVideoAddonActionResult = { ok: true; on: boolean } | { ok: false; error: string };

/** Switch the built-in video add-on on or off. Owners and admins with billing access. */
export async function setVideoAddonAction(slug: string, on: boolean): Promise<SetVideoAddonActionResult> {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return { ok: false, error: "You are signed out. Sign in and try again." };
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
    });
    if (!workspace) return { ok: false, error: "Workspace not found." };
    const me = workspace.members[0];
    if (!me || !(await canMember(me, "billing:manage"))) {
      return { ok: false, error: "Only owners and admins with billing access can change add-ons." };
    }
    const res = await setVideoAddon({
      workspaceId: workspace.id,
      on: on === true,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
    });
    if (!res.ok) return res;
    revalidatePath(`/w/${slug}/billing`);
    return { ok: true, on: res.videoEnabled };
  } catch (err) {
    console.error("[billing] video add-on switch failed:", err);
    return { ok: false, error: "Could not change built-in video. Try again in a moment." };
  }
}

export type CreditSplitActionResult = { ok: true; message: string } | { ok: false; error: string };

async function accountForSplit(slug: string): Promise<{ accountId: string; userId: string; creditsPerMonth: number } | { error: string }> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { error: "You are signed out. Sign in and try again." };
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { billingAccount: { select: { id: true, planKey: true } } } });
  const account = ws?.billingAccount;
  if (!account) return { error: "Workspace not found." };
  const { creditAccess } = await import("@/lib/billing/credit-split-server");
  const access = await creditAccess(account.id, session.user.id);
  if (!access.canSplit) {
    return { error: "Only the account owner, or someone with billing access in every workspace on this plan, can split and move credits." };
  }
  const { getEffectiveCatalog } = await import("@/lib/billing/pricing-copy-store");
  const { findCatalogPlan } = await import("@/lib/billing/catalog");
  const { isSelfServePlan } = await import("@/lib/billing/account-plan");
  const plan = isSelfServePlan(account.planKey) ? findCatalogPlan(await getEffectiveCatalog(), account.planKey) : undefined;
  return { accountId: account.id, userId: session.user.id, creditsPerMonth: plan?.creditsPerMonth ?? 0 };
}

/** Moves credits between two workspaces on the account, or to and from unassigned. */
export async function moveCreditsAction(slug: string, from: string, to: string, amount: number): Promise<CreditSplitActionResult> {
  try {
    const ctx = await accountForSplit(slug);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const { moveCredits } = await import("@/lib/billing/credit-split-server");
    const res = await moveCredits({ accountId: ctx.accountId, from: String(from), to: String(to), amount, userId: ctx.userId });
    revalidatePath(`/w/${slug}/billing`);
    return { ok: true, message: `Moved ${res.amount} ${res.amount === 1 ? "credit" : "credits"}.` };
  } catch (err) {
    const { CreditMoveError } = await import("@/lib/billing/credit-split-server");
    if (err instanceof CreditMoveError) return { ok: false, error: err.message };
    console.error("[billing] credit move failed:", err);
    return { ok: false, error: "Could not move credits. Try again in a moment." };
  }
}

/** Saves how the monthly plan credits are split between the account's workspaces. */
export async function setCreditSplitAction(slug: string, shares: Record<string, string | number>): Promise<CreditSplitActionResult> {
  try {
    const ctx = await accountForSplit(slug);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    if (ctx.creditsPerMonth <= 0) return { ok: false, error: "Your account has no plan with monthly credits to split." };
    const { setPlanCreditSplit } = await import("@/lib/billing/credit-split-server");
    await setPlanCreditSplit(ctx.accountId, shares ?? {}, ctx.creditsPerMonth);
    revalidatePath(`/w/${slug}/billing`);
    return { ok: true, message: "Split saved. It applies from the next monthly credits." };
  } catch (err) {
    const { CreditMoveError } = await import("@/lib/billing/credit-split-server");
    if (err instanceof CreditMoveError) return { ok: false, error: err.message };
    console.error("[billing] credit split failed:", err);
    return { ok: false, error: "Could not save the split. Try again in a moment." };
  }
}
