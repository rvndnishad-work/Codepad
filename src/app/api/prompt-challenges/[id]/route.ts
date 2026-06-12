import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import type { Session } from "next-auth";

/**
 * Authorize a mutation (edit/delete) of a scenario for the current session.
 * Returns null when allowed, or a NextResponse error to short-circuit with.
 *
 *  - Workspace-scoped scenarios: any workspace member (or an admin).
 *  - Platform-wide scenarios authored by a user: that author (or an admin).
 *  - Built-in/seeded platform scenarios (no authorId): admins only.
 */
async function authorizeScenarioMutation(
  scenario: { workspaceId: string | null; authorId: string | null },
  session: Session,
  verb: "modify" | "delete",
): Promise<NextResponse | null> {
  if (await staffCan(session, "content:curate")) return null;

  const userId = session.user!.id;

  if (scenario.workspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: scenario.workspaceId },
      include: { members: { select: { userId: true } } },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    if (!workspace.members.some((m) => m.userId === userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  }

  // Platform-wide scenario.
  if (scenario.authorId && scenario.authorId === userId) return null;
  return NextResponse.json(
    {
      error: scenario.authorId
        ? `Only the author or an admin can ${verb} this scenario.`
        : `Cannot ${verb} built-in scenarios.`,
    },
    { status: 403 },
  );
}

// GET /api/prompt-challenges/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scenario = await prisma.promptScenario.findUnique({
      where: { id },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error("Failed to fetch prompt scenario:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/prompt-challenges/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenario = await prisma.promptScenario.findUnique({
      where: { id },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const denied = await authorizeScenarioMutation(scenario, session, "modify");
    if (denied) return denied;

    const body = await req.json();
    const {
      title,
      description,
      objective,
      expectedTraits,
      difficulty,
      category,
      estimatedMinutes,
      published
    } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (objective !== undefined) data.objective = objective;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (category !== undefined) data.category = category;
    if (estimatedMinutes !== undefined) data.estimatedMinutes = parseInt(estimatedMinutes, 10);
    if (published !== undefined) data.published = published;

    if (expectedTraits !== undefined) {
      data.expectedTraits = typeof expectedTraits === "string" 
        ? expectedTraits 
        : JSON.stringify(expectedTraits || { keywords: [], format: "", constraints: [] });
    }

    const updated = await prisma.promptScenario.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, scenario: updated });
  } catch (error) {
    console.error("Failed to update prompt scenario:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/prompt-challenges/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenario = await prisma.promptScenario.findUnique({
      where: { id },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const denied = await authorizeScenarioMutation(scenario, session, "delete");
    if (denied) return denied;

    await prisma.promptScenario.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Scenario deleted successfully" });
  } catch (error) {
    console.error("Failed to delete prompt scenario:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
