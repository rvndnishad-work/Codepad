/**
 * Entitlement resolution — does a user have access to a piece of sold content?
 *
 * Access is granted by ANY of:
 *   - ownership (you always reach your own content)
 *   - a moderation permission (content:moderate — staff oversight)
 *   - a non-expired Entitlement row (one-time purchase or admin grant)
 *   - an active CreatorSubscription to the content's creator (whole catalogue)
 *
 * This supersedes the old "premium = member of a paid workspace" heuristic in
 * challenges/[slug]/solution/route.ts.
 */
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import type { OwnableContentType } from "@/lib/permissions/permissions";

/** The owning user id for a piece of content (or null if it doesn't exist). */
export async function getContentOwnerId(
  contentType: OwnableContentType,
  contentId: string,
): Promise<string | null> {
  switch (contentType) {
    case "CHALLENGE": {
      const c = await prisma.challenge.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });
      return c?.authorId ?? null;
    }
    case "BLOG_POST": {
      const b = await prisma.blogPost.findUnique({
        where: { id: contentId },
        select: { userId: true },
      });
      return b?.userId ?? null;
    }
    case "SNIPPET": {
      const s = await prisma.snippet.findUnique({
        where: { id: contentId },
        select: { userId: true },
      });
      return s?.userId ?? null;
    }
  }
}

/** Inputs to the pure access decision — kept separate so it's unit-testable
 *  without a database. */
export type AccessInputs = {
  viewerId: string | null | undefined;
  ownerId: string | null;
  viewerCanModerate: boolean;
  /** A matching, non-expired entitlement row exists. */
  hasEntitlementRow: boolean;
  /** The viewer holds an active subscription to the owner. */
  hasActiveSubscription: boolean;
};

/** Pure access decision. */
export function resolveAccess(input: AccessInputs): boolean {
  if (!input.viewerId) return false;
  if (input.ownerId && input.ownerId === input.viewerId) return true;
  if (input.viewerCanModerate) return true;
  if (input.hasEntitlementRow) return true;
  if (input.hasActiveSubscription) return true;
  return false;
}

/** Is there at least one published product selling this content? Gating call
 *  sites use this to decide whether access even needs checking. */
export async function isContentSold(
  contentType: OwnableContentType,
  contentId: string,
): Promise<boolean> {
  const count = await prisma.product.count({
    where: { contentType, contentId, published: true },
  });
  return count > 0;
}

/**
 * Full DB-backed access check for a piece of content. Returns true when the
 * user may view the gated/exclusive content.
 */
export async function hasEntitlement(
  userId: string | null | undefined,
  contentType: OwnableContentType,
  contentId: string,
): Promise<boolean> {
  if (!userId) return false;

  const ownerId = await getContentOwnerId(contentType, contentId);
  // Fast path: owners never need an entitlement for their own content.
  if (ownerId && ownerId === userId) return true;

  const now = new Date();
  const [entitlement, activeSub, viewerCanModerate] = await Promise.all([
    prisma.entitlement.findUnique({
      where: { userId_contentType_contentId: { userId, contentType, contentId } },
      select: { expiresAt: true },
    }),
    ownerId
      ? prisma.creatorSubscription.findFirst({
          where: {
            subscriberId: userId,
            creatorId: ownerId,
            status: "active",
            OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    userCan(userId, "content:moderate"),
  ]);

  const hasEntitlementRow =
    !!entitlement &&
    (entitlement.expiresAt === null || entitlement.expiresAt > now);

  return resolveAccess({
    viewerId: userId,
    ownerId,
    viewerCanModerate,
    hasEntitlementRow,
    hasActiveSubscription: !!activeSub,
  });
}

/**
 * Grant (or refresh) an entitlement. Idempotent on (user, content): a webhook
 * redelivery just updates the existing row rather than creating a duplicate.
 */
export async function grantEntitlement(params: {
  userId: string;
  contentType: OwnableContentType;
  contentId: string;
  source: "PURCHASE" | "SUBSCRIPTION" | "GRANT";
  productId?: string | null;
  expiresAt?: Date | null;
}): Promise<void> {
  const { userId, contentType, contentId, source, productId, expiresAt } = params;
  await prisma.entitlement.upsert({
    where: { userId_contentType_contentId: { userId, contentType, contentId } },
    update: { source, productId: productId ?? null, expiresAt: expiresAt ?? null },
    create: {
      userId,
      contentType,
      contentId,
      source,
      productId: productId ?? null,
      expiresAt: expiresAt ?? null,
    },
  });
}
