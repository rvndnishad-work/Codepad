import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { SECTION_KEYS, type SectionKey } from "@/lib/creator/layout";
import { normalizeBlocks } from "@/lib/creator/blocks";
import { normalizeTokenSet } from "@/lib/creator/tokens";
import DesignClient from "./DesignClient";

type Props = { params: Promise<{ handle: string }> };

export default async function CreatorDesignPage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect(`/login?next=/creator/${handle}/design`);

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || space.ownerId !== userId) notFound();

  const rawBlocks = (space as unknown as { blocks?: unknown }).blocks;
  const rawStyles = (space as unknown as { styles?: unknown }).styles;
  const blocksDoc = normalizeBlocks(rawBlocks, space.layout);
  const tokenSet = normalizeTokenSet(rawStyles);

  const grouped = await prisma.spaceContent.groupBy({
    by: ["contentType"],
    where: { spaceId: space.id },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(SECTION_KEYS.map((k) => [k, 0])) as Record<SectionKey, number>;
  for (const g of grouped) {
    if ((SECTION_KEYS as readonly string[]).includes(g.contentType)) counts[g.contentType as SectionKey] = g._count._all;
  }
  counts.ABOUT = space.description ? 1 : 0;
  counts.MEMBERSHIP = await prisma.spaceTier.count({ where: { spaceId: space.id, published: true } });

  const tiers = await prisma.spaceTier.findMany({
    where: { spaceId: space.id },
    orderBy: { rank: "asc" },
    select: { id: true, name: true, rank: true },
  });

  return (
    <DesignClient
      spaceId={space.id}
      handle={space.handle}
      name={space.name}
      tagline={space.tagline}
      blocksDoc={blocksDoc}
      tokenSet={tokenSet}
      counts={counts}
      tiers={tiers}
    />
  );
}
