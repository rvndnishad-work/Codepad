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
