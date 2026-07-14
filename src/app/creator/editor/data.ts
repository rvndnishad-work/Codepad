import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Everything an authoring editor needs beyond the content row itself:
 * the space (ownership-checked), its tiers for the access-policy picker,
 * whether paid pricing is available, the existing SpaceContent policy, and
 * the creator's own playgrounds/challenges for the embed picker.
 */
export type EditorContext = {
  space: { id: string; handle: string; name: string };
  tiers: { id: string; name: string; rank: number }[];
  chargesEnabled: boolean;
  policy: { accessTierRank: number | null; purchasePriceCents: number | null } | null;
  embeds: {
    snippets: { id: string; slug: string; title: string }[];
    challenges: { id: string; slug: string; title: string }[];
  };
};

export async function getEditorContext(
  userId: string,
  spaceId: string,
  content?: { contentType: string; contentId: string },
): Promise<EditorContext | null> {
  const space = await prisma.creatorSpace.findFirst({
    where: { id: spaceId, ownerId: userId },
    select: { id: true, handle: true, name: true },
  });
  if (!space) return null;

  const [tiers, account, snippets, challenges, policy] = await Promise.all([
    prisma.spaceTier.findMany({
      where: { spaceId: space.id },
      orderBy: { rank: "asc" },
      select: { id: true, name: true, rank: true },
    }),
    prisma.creatorAccount.findUnique({ where: { userId }, select: { chargesEnabled: true } }),
    prisma.snippet.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, slug: true, title: true },
    }),
    prisma.challenge.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, slug: true, title: true },
    }),
    content
      ? prisma.spaceContent.findUnique({
          where: { contentType_contentId: { contentType: content.contentType, contentId: content.contentId } },
          select: { accessTierRank: true, purchasePriceCents: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    space,
    tiers,
    chargesEnabled: !!account?.chargesEnabled,
    policy,
    embeds: { snippets, challenges },
  };
}
