/**
 * Space-aware content access. A piece of content gains an access policy when a
 * `SpaceContent` row links it to a space:
 *   - accessTierRank null  → free to everyone
 *   - accessTierRank N     → reachable by the owner, a content:moderate holder,
 *                            a one-time purchaser (Entitlement), or an active
 *                            subscriber whose tier rank ≥ N ("true all-access").
 * Content with no SpaceContent row is not space-gated — its own page visibility
 * rules apply, so hasAccess returns true.
 */
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import type { OwnableContentType } from "@/lib/permissions/permissions";
import { getContentOwnerId } from "./entitlements";

export type SpaceAccessInputs = {
  viewerId?: string | null;
  ownerId?: string | null;
  viewerCanModerate: boolean;
  /** null = free; else minimum membership tier rank. */
  accessTierRank: number | null;
  /** A non-expired one-time entitlement exists. */
  hasPurchase: boolean;
  /** Active membership tier rank, or null when not subscribed. */
  membershipRank: number | null;
};

/** Pure access decision — unit-testable without a DB. */
export function resolveSpaceAccess(i: SpaceAccessInputs): boolean {
  if (i.accessTierRank == null) return true; // free
  if (i.viewerId && i.ownerId && i.viewerId === i.ownerId) return true;
  if (i.viewerCanModerate) return true;
  if (i.hasPurchase) return true;
  if (i.membershipRank != null && i.membershipRank >= i.accessTierRank) return true;
  return false;
}

/** The SpaceContent access policy for a piece of content, or null if it isn't
 *  attached to any space. */
export async function getSpaceContentPolicy(
  contentType: OwnableContentType,
  contentId: string,
) {
  return prisma.spaceContent.findUnique({
    where: { contentType_contentId: { contentType, contentId } },
  });
}

/** Full DB-backed access check. True when the viewer may see the content. */
export async function hasAccess(
  userId: string | null | undefined,
  contentType: OwnableContentType,
  contentId: string,
): Promise<boolean> {
  const policy = await getSpaceContentPolicy(contentType, contentId);
  if (!policy || policy.accessTierRank == null) return true; // not gated / free
  if (!userId) return false;

  const ownerId = await getContentOwnerId(contentType, contentId);
  if (ownerId && ownerId === userId) return true;

  const now = new Date();
  const [entitlement, membership, viewerCanModerate] = await Promise.all([
    prisma.entitlement.findUnique({
      where: { userId_contentType_contentId: { userId, contentType, contentId } },
      select: { expiresAt: true },
    }),
    prisma.spaceMembership.findFirst({
      where: {
        subscriberId: userId,
        spaceId: policy.spaceId,
        status: "active",
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      select: { tierRank: true },
    }),
    userCan(userId, "content:moderate"),
  ]);

  const hasPurchase =
    !!entitlement && (entitlement.expiresAt === null || entitlement.expiresAt > now);

  return resolveSpaceAccess({
    viewerId: userId,
    ownerId,
    viewerCanModerate,
    accessTierRank: policy.accessTierRank,
    hasPurchase,
    membershipRank: membership?.tierRank ?? null,
  });
}

export type PaywallOptions = {
  spaceId: string;
  spaceHandle: string;
  /** One-time purchase option, when the content is individually buyable. */
  oneTime: { spaceContentId: string; priceCents: number; currency: string } | null;
  /** Membership tiers that unlock this content (rank ≥ the content's requirement). */
  tiers: {
    id: string;
    name: string;
    description: string | null;
    benefits: string[];
    rank: number;
    priceCents: number;
    currency: string;
  }[];
};

/** Buy/subscribe options to show on a paywall for gated content. */
export async function getPaywallOptions(
  contentType: OwnableContentType,
  contentId: string,
): Promise<PaywallOptions | null> {
  const policy = await getSpaceContentPolicy(contentType, contentId);
  if (!policy || policy.accessTierRank == null) return null;

  const space = await prisma.creatorSpace.findUnique({
    where: { id: policy.spaceId },
    select: { handle: true },
  });
  if (!space) return null;

  const tiers = await prisma.spaceTier.findMany({
    where: {
      spaceId: policy.spaceId,
      published: true,
      rank: { gte: policy.accessTierRank },
    },
    orderBy: { rank: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      benefits: true,
      rank: true,
      priceCents: true,
      currency: true,
    },
  });

  return {
    spaceId: policy.spaceId,
    spaceHandle: space.handle,
    oneTime:
      policy.purchasePriceCents != null
        ? {
            spaceContentId: policy.id,
            priceCents: policy.purchasePriceCents,
            currency: policy.currency,
          }
        : null,
    tiers,
  };
}
