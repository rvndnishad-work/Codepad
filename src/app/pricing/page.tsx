import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { applyPricingCopy } from "@/lib/billing/pricing-copy";
import { getPublicPricingInputs } from "@/lib/billing/pricing-copy-store";
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
  const [workspaces, pricing] = await Promise.all([
    userId
      ? prisma.workspace.findMany({
          where: { members: { some: { userId, role: { in: [...MANAGER_ROLES] } } } },
          select: { id: true, name: true, slug: true, planName: true },
        })
      : Promise.resolve([]),
    getPublicPricingInputs(),
  ]);
  // Effective prices (what checkout charges) with the admin wording laid over.
  const { plans, packs, annualSavingPercent, lowestCreditPrice } = applyPricingCopy(pricing.copy, pricing.prices);

  return (
    <PricingClient
      workspaces={workspaces}
      isSignedIn={!!userId}
      plans={plans}
      packs={packs}
      annualSavingPercent={annualSavingPercent}
      lowestCreditPrice={lowestCreditPrice}
    />
  );
}
