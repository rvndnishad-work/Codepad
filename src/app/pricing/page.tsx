import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PricingClient from "./PricingClient";

export const metadata = {
  title: "Pricing — Interviewpad Recruitment SaaS",
  description: "Deploy per-seat team workspaces, structured evaluation rubrics, AI proctoring, and automated Greenhouse/Lever/Ashby webhooks.",
};

export default async function PricingPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  // Fetch workspaces where the current user is an OWNER or ADMIN
  const workspaces = userId
    ? await prisma.workspace.findMany({
        where: {
          members: {
            some: {
              userId,
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          planName: true,
        },
      })
    : [];

  return (
    <PricingClient 
      workspaces={workspaces} 
      isSignedIn={!!userId} 
    />
  );
}
