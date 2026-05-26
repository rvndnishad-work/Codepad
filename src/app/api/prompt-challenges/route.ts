import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/prompt-challenges
// Returns a list of all prompt scenarios (built-in + workspace-scoped if workspaceId is provided)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    // Fetch scenarios from DB
    const scenarios = await prisma.promptScenario.findMany({
      where: {
        OR: [
          { workspaceId: null },
          ...(workspaceId ? [{ workspaceId }] : [])
        ],
        published: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error("Failed to fetch prompt scenarios:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/prompt-challenges
// Creates a new custom prompt scenario scoped to a workspace
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      objective,
      expectedTraits, // Expecting { keywords: string[], format: string, constraints: string[] }
      difficulty,
      category,
      estimatedMinutes,
      workspaceId
    } = body;

    if (!title || !description || !objective || !workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify workspace membership
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { select: { userId: true } } }
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isMember = workspace.members.some((m) => m.userId === session.user!.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const stringifiedTraits = typeof expectedTraits === "string" 
      ? expectedTraits 
      : JSON.stringify(expectedTraits || { keywords: [], format: "", constraints: [] });

    const newScenario = await prisma.promptScenario.create({
      data: {
        slug,
        title,
        description,
        objective,
        expectedTraits: stringifiedTraits,
        difficulty: difficulty || "intermediate",
        category: category || "code-generation",
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : 10,
        workspaceId,
      }
    });

    return NextResponse.json({ success: true, scenario: newScenario }, { status: 201 });
  } catch (error) {
    console.error("Failed to create custom prompt scenario:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
