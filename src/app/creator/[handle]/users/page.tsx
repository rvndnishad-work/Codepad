import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import AudienceClient from "./AudienceClient";

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorSpaceAudiencePage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || space.ownerId !== userId) notFound();

  const [memberships, follows, tiers] = await Promise.all([
    prisma.spaceMembership.findMany({
      where: { spaceId: space.id },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.spaceFollow.findMany({
      where: { spaceId: space.id },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" } }),
  ]);

  const userIds = [...new Set([...memberships.map((m) => m.subscriberId), ...follows.map((f) => f.userId)])];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const members = memberships.map((m) => {
    const u = userById.get(m.subscriberId);
    const tier = tiers.find((t) => t.rank === m.tierRank);
    return {
      id: m.id,
      name: u?.name || "Anonymous",
      email: u?.email || "",
      image: u?.image || null,
      tierName: tier?.name || `Tier ${m.tierRank}`,
      status: m.status,
      comp: m.stripeSubscriptionId.startsWith("comp_") || m.stripeSubscriptionId.startsWith("demo_"),
      currentPeriodEnd: m.currentPeriodEnd?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    };
  });

  const followers = follows.map((f) => {
    const u = userById.get(f.userId);
    return {
      id: `${f.userId}:${f.spaceId}`,
      name: u?.name || "Anonymous",
      email: u?.email || "",
      image: u?.image || null,
      createdAt: f.createdAt.toISOString(),
    };
  });

  return (
    <AudienceClient
      spaceId={space.id}
      members={members}
      followers={followers}
      tiers={tiers.map((t) => ({ id: t.id, name: t.name, rank: t.rank }))}
    />
  );
}
