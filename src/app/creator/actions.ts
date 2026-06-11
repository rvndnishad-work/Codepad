"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userCan } from "@/lib/permissions/access";
import { OWNABLE_CONTENT_TYPES, type OwnableContentType } from "@/lib/permissions/permissions";
import { getContentOwnerId } from "@/lib/marketplace/entitlements";
import {
  getOrCreateConnectAccount,
  createOnboardingLink,
  createCheckoutSession,
} from "@/lib/marketplace/connect";

async function requireSeller() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId || !(await userCan(userId, "product:sell"))) {
    throw new Error("Unauthorized: a creator (product:sell) is required.");
  }
  return userId;
}

async function origin() {
  const h = await headers();
  return (
    h.get("origin") ??
    (h.get("host") ? `https://${h.get("host")}` : "http://localhost:3000")
  );
}

/** Begin (or resume) Stripe Connect onboarding. Returns the hosted link URL. */
export async function startOnboardingAction(): Promise<string> {
  const userId = await requireSeller();
  const { stripeAccountId } = await getOrCreateConnectAccount(userId);
  return createOnboardingLink(stripeAccountId, await origin());
}

const createProductSchema = z.object({
  contentType: z.enum(OWNABLE_CONTENT_TYPES),
  contentId: z.string().min(1),
  kind: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
  priceCents: z.number().int().min(50).max(100000),
});

/** Create a product over content the caller owns. Requires an onboarded
 *  Connect account with charges enabled. */
export async function createProductAction(input: {
  contentType: OwnableContentType;
  contentId: string;
  kind: "ONE_TIME" | "SUBSCRIPTION";
  priceCents: number;
}) {
  const userId = await requireSeller();
  const data = createProductSchema.parse(input);

  const ownerId = await getContentOwnerId(data.contentType, data.contentId);
  if (ownerId !== userId) {
    throw new Error("You can only sell content you own.");
  }

  const account = await prisma.creatorAccount.findUnique({ where: { userId } });
  if (!account?.chargesEnabled) {
    throw new Error("Finish Stripe onboarding before listing products.");
  }

  await prisma.product.create({
    data: {
      creatorId: userId,
      contentType: data.contentType,
      contentId: data.contentId,
      kind: data.kind,
      priceCents: data.priceCents,
    },
  });
  revalidatePath("/creator");
}

/** Publish / unpublish a product the caller owns. */
export async function setProductPublishedAction(productId: string, published: boolean) {
  const userId = await requireSeller();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { creatorId: true },
  });
  if (!product || product.creatorId !== userId) {
    throw new Error("Product not found.");
  }
  await prisma.product.update({ where: { id: productId }, data: { published } });
  revalidatePath("/creator");
}

/** Delete a product the caller owns. */
export async function deleteProductAction(productId: string) {
  const userId = await requireSeller();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { creatorId: true },
  });
  if (!product || product.creatorId !== userId) {
    throw new Error("Product not found.");
  }
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/creator");
}

/** Buyer-side: start checkout for a published product. Any signed-in user. */
export async function createCheckoutAction(productId: string): Promise<string> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sign in to purchase.");
  return createCheckoutSession({ productId, buyerId: userId, origin: await origin() });
}
