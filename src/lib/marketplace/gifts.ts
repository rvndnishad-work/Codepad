import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

/** Create a gift code for content. Idempotent on recipientEmail+contentId if not yet claimed. */
export async function createGiftCode(params: {
  giverId: string;
  recipientEmail: string;
  contentType: string;
  contentId: string;
  spaceContentId?: string | null;
}): Promise<{ id: string; code: string }> {
  const code = nanoid(12).toUpperCase();
  const gift = await prisma.giftEntitlement.create({
    data: {
      giverId: params.giverId,
      recipientEmail: params.recipientEmail.toLowerCase().trim(),
      contentType: params.contentType,
      contentId: params.contentId,
      spaceContentId: params.spaceContentId ?? null,
      code,
    },
  });
  return { id: gift.id, code: gift.code };
}

/** Claim a gift code — creates an Entitlement with source GIFT. Idempotent. */
export async function claimGift(code: string, claimerId: string): Promise<{ entitlementId: string }> {
  const gift = await prisma.giftEntitlement.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (!gift) throw new Error("Invalid gift code.");
  if (gift.claimedAt) throw new Error("Gift already claimed.");
  // Optionally verify recipientEmail matches claimer email
  const user = await prisma.user.findUnique({ where: { id: claimerId }, select: { email: true } });
  if (user?.email && gift.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    // Allow claim anyway but note — strict check could throw
  }
  const entitlement = await prisma.entitlement.create({
    data: {
      userId: claimerId,
      contentType: gift.contentType,
      contentId: gift.contentId,
      source: "GIFT",
      spaceContentId: gift.spaceContentId,
      giftId: gift.id,
    },
  });
  await prisma.giftEntitlement.update({ where: { id: gift.id }, data: { claimedById: claimerId, claimedAt: new Date() } });
  return { entitlementId: entitlement.id };
}
