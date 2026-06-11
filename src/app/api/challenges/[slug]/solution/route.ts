import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { hasEntitlement } from "@/lib/marketplace/entitlements";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required", isPremium: false }, { status: 401 });
  }

  const { slug } = await params;

  // 1. Resolve query params
  const { searchParams } = new URL(req.url);
  const stepParam = searchParams.get("step");
  const position = stepParam ? parseInt(stepParam, 10) : 0;
  const stepIndex = Number.isFinite(position) ? Math.max(0, position) : 0;

  // 2. Fetch challenge and step
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: {
      steps: {
        where: { position: stepIndex },
        select: {
          referenceSolutionsJson: true,
        },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // 3. Perform premium subscription check
  const callerIsAdmin = await staffCan(session, "content:curate");
  let isPremium = callerIsAdmin;

  if (!isPremium) {
    const userWorkspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        planName: true,
      },
    });
    // Check if the user is a member of any workspace that is not on a FREE plan
    isPremium = userWorkspaces.some((w) => w.planName !== "FREE");
  }

  // Marketplace: a buyer who purchased this challenge (or subscribes to its
  // creator) is entitled to its reference solutions — supersedes the legacy
  // paid-workspace heuristic for sold content.
  if (!isPremium) {
    isPremium = await hasEntitlement(userId, "CHALLENGE", challenge.id);
  }

  if (!isPremium) {
    return NextResponse.json(
      { error: "Premium subscription required to view reference solutions.", isPremium: false },
      { status: 403 }
    );
  }

  const step = challenge.steps[0];
  if (!step) {
    return NextResponse.json({ error: "Challenge step not found" }, { status: 404 });
  }

  let solutions: Record<string, string> = {};
  if (step.referenceSolutionsJson) {
    try {
      solutions = JSON.parse(step.referenceSolutionsJson);
    } catch (e) {
      console.error("Failed to parse referenceSolutionsJson", e);
    }
  }

  return NextResponse.json({
    isPremium: true,
    solutions,
  });
}
