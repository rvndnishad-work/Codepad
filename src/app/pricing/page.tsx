import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import PricingClient from "./PricingClient";

export const metadata = {
  title: "Pricing | Interviewpad",
  description: "Free, Growth and Enterprise plans for technical screening. Pay per seat, and pay for AI screening with credits only when a candidate starts.",
};

export default async function PricingPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/pricing", session);
  const userId = session?.user?.id;

  // Workspaces the signed-in user can upgrade (owners and admins).
  const workspaces = userId
    ? await prisma.workspace.findMany({
        where: { members: { some: { userId, role: { in: [...MANAGER_ROLES] } } } },
        select: { id: true, name: true, slug: true, planName: true },
      })
    : [];

  return (
    <PricingClient workspaces={workspaces} isSignedIn={!!userId} />
  );
}
