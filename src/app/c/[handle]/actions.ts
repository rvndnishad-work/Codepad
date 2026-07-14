"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifySpaceFollowed } from "@/lib/notifications/triggers";

/** Free follow — the audience relationship. Paid access is SpaceMembership. */
export async function followSpaceAction(spaceId: string) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sign in to follow this creator.");

  const space = await prisma.creatorSpace.findUnique({
    where: { id: spaceId },
    select: { id: true, handle: true, published: true, ownerId: true },
  });
  if (!space || !space.published) throw new Error("Space not found.");
  if (space.ownerId === userId) throw new Error("You can't follow your own space.");

  // skipDuplicates makes a repeat click a no-op AND tells us (count) whether
  // this was a brand-new follow — only then do we log the event + notify.
  const { count } = await prisma.spaceFollow.createMany({
    data: [{ userId, spaceId: space.id }],
    skipDuplicates: true,
  });
  if (count > 0) {
    await prisma.spaceEvent
      .create({ data: { spaceId: space.id, kind: "FOLLOW", userId } })
      .catch(() => {});
    await notifySpaceFollowed({ spaceId: space.id, followerId: userId });
  }
  revalidatePath(`/c/${space.handle}`);
}

export async function unfollowSpaceAction(spaceId: string) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Sign in first.");

  const space = await prisma.creatorSpace.findUnique({
    where: { id: spaceId },
    select: { id: true, handle: true },
  });
  if (!space) throw new Error("Space not found.");

  await prisma.spaceFollow.deleteMany({ where: { userId, spaceId: space.id } });
  revalidatePath(`/c/${space.handle}`);
}
