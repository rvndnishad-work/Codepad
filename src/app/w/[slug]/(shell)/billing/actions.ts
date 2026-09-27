"use server";

/**
 * Billing and usage actions. Buying credits lives here now; the AI
 * screening pages link to the Usage and credits tab. The low-credit email
 * threshold saves through saveWorkspaceSettingsAction (group "billing").
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { appOrigin } from "@/lib/interview/links";
import { CreditCheckoutError, createCreditPackCheckout } from "@/lib/billing/credit-checkout";

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
    const url = await createCreditPackCheckout({ workspace, packId: String(packId), origin: await appOrigin() });
    return { ok: true, url };
  } catch (err) {
    if (err instanceof CreditCheckoutError) return { ok: false, error: err.message };
    console.error("[billing] credit checkout failed:", err);
    return { ok: false, error: "Could not open checkout. Try again in a moment." };
  }
}
