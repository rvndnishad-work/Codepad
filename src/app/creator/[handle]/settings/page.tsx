import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorSpaceSettingsPage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space || space.ownerId !== userId) notFound();

  return (
    <SettingsClient
      space={{
        id: space.id,
        handle: space.handle,
        name: space.name,
        tagline: space.tagline,
        description: space.description,
        published: space.published,
      }}
    />
  );
}
