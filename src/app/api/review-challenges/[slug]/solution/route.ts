import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

/**
 * Premium "Show Solution" for a Review-the-AI's-Code challenge.
 *
 * Unlike the reveal that follows a graded attempt, this returns the full
 * planted findings *without* requiring an attempt — study mode. It's a paid
 * feature, so it's gated the same way as reference solutions on regular
 * challenges: platform staff, or a member of any non-FREE workspace.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required", isPremium: false },
      { status: 401 },
    );
  }

  const { slug } = await params;

  const challenge = await prisma.reviewChallenge.findUnique({
    where: { slug },
    select: {
      id: true,
      published: true,
      findings: {
        orderBy: [{ lineStart: "asc" }],
        select: {
          id: true,
          lineStart: true,
          lineEnd: true,
          category: true,
          title: true,
          explanation: true,
          points: true,
        },
      },
    },
  });

  if (!challenge || !challenge.published) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Premium gate — mirrors /api/challenges/[slug]/solution.
  const callerIsAdmin = await staffCan(session, "content:curate");
  let isPremium = callerIsAdmin;
  if (!isPremium) {
    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      select: { planName: true },
    });
    isPremium = workspaces.some((w) => w.planName !== "FREE");
  }

  if (!isPremium) {
    return NextResponse.json(
      {
        error: "Upgrade to a paid plan to unlock the full solution.",
        isPremium: false,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ isPremium: true, findings: challenge.findings });
}
