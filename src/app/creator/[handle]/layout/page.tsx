import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { normalizeLayout, SECTION_KEYS, type SectionKey } from "@/lib/creator/layout";
import LayoutClient from "./LayoutClient";

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorSpaceLayoutPage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || space.ownerId !== userId) notFound();

  // Per-section counts = content attached to the space (this is exactly what
  // renders publicly), grouped by content type.
  const grouped = await prisma.spaceContent.groupBy({
    by: ["contentType"],
    where: { spaceId: space.id },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(SECTION_KEYS.map((k) => [k, 0])) as Record<SectionKey, number>;
  for (const g of grouped) {
    if ((SECTION_KEYS as readonly string[]).includes(g.contentType)) {
      counts[g.contentType as SectionKey] = g._count._all;
    }
  }

  const layout = normalizeLayout(space.layout);

  // Set counts for ABOUT and MEMBERSHIP
  counts.ABOUT = space.description ? 1 : 0;
  const publishedTiersCount = await prisma.spaceTier.count({
    where: { spaceId: space.id, published: true },
  });
  counts.MEMBERSHIP = publishedTiersCount;

  return (
    <LayoutClient
      spaceId={space.id}
      handle={space.handle}
      name={space.name}
      tagline={space.tagline}
      avatarUrl={space.avatarUrl ?? ""}
      coverUrl={space.coverUrl ?? ""}
      heroStyle={layout.heroStyle}
      theme={layout.theme}
      alignment={layout.alignment}
      sections={layout.sections}
      counts={counts}
    />
  );
}
