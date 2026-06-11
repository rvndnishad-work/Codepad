import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Legacy storefront route (keyed by userId). Creator spaces now live at the
 * vanity URL /c/[handle] — redirect there.
 */
export default async function LegacyCreatorStorefront({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await prisma.creatorSpace.findUnique({
    where: { ownerId: id },
    select: { handle: true, published: true },
  });
  if (!space || !space.published) notFound();
  redirect(`/c/${space.handle}`);
}
