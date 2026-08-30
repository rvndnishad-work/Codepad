import { prisma } from "@/lib/prisma";

/** Create a team license for a space tier. Quantity = seats. */
export async function createTeamLicense(params: {
  buyerId: string;
  spaceId: string;
  tierRank: number;
  seats: number;
  stripeCheckoutId?: string | null;
}): Promise<{ id: string }> {
  if (params.seats < 2 || params.seats > 100) throw new Error("Seats must be 2–100.");
  const team = await prisma.teamLicense.create({
    data: {
      buyerId: params.buyerId,
      spaceId: params.spaceId,
      tierRank: params.tierRank,
      seats: params.seats,
      stripeCheckoutId: params.stripeCheckoutId ?? null,
    },
  });
  return { id: team.id };
}

/** Check if a user has team-based access to a space at required rank. */
export async function hasTeamAccess(userId: string, spaceId: string, requiredRank: number): Promise<boolean> {
  const license = await prisma.teamLicense.findFirst({
    where: { spaceId, tierRank: { gte: requiredRank } },
    select: { id: true, seats: true, buyerId: true },
  });
  if (!license) return false;
  // For MVP, buyerId is the team owner; actual member list would be separate TeamMember table.
  // Here we treat buyer as having team access, and we could extend to check member list.
  if (license.buyerId === userId) return true;
  // Check if user is via team membership (future: TeamMember table)
  return false;
}
