import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

// PATCH /api/challenges/[slug]
// Author-or-admin gated. Updates scalar fields and/or wholesale-replaces
// the step list. Legacy starterFiles/testFiles/template/estimatedMinutes
// columns on Challenge stay in sync with step[0] so unmigrated read paths
// keep working during the transition.
//
// URL uses [slug] (not [id]) because /api/challenges/[slug]/attempt already
// claims that segment and Next forbids two different param names at the
// same level.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, authorId: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }
  const callerIsAdmin = isAdmin(session);
  if (challenge.authorId !== userId && !callerIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        slug?: string;
        title?: string;
        description?: string;
        difficulty?: string;
        tags?: string[];
        category?: string | null;
        published?: boolean;
        visibility?: string;
        steps?: {
          title?: string;
          description?: string;
          template?: string;
          starterFiles?: Record<string, string>;
          testFiles?: Record<string, string>;
          estimatedMinutes?: number;
          hint?: string;
          videoUrl?: string;
          testCases?: {
            id: string;
            name: string;
            input: string;
            expected: string;
            isHidden?: boolean;
            weight?: number;
          }[];
        }[];
      }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (Array.isArray(body.steps) && body.steps.length === 0) {
    return NextResponse.json(
      { error: "At least one step is required" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const stepsProvided = Array.isArray(body.steps);
      const first = stepsProvided ? body.steps![0] : null;

      const c = await tx.challenge.update({
        where: { id: challenge.id },
        data: {
          slug: body.slug?.trim(),
          title: body.title?.trim(),
          description: body.description,
          difficulty: body.difficulty,
          tags:
            body.tags === undefined
              ? undefined
              : body.tags.length
              ? JSON.stringify(body.tags)
              : null,
          category:
            body.category === undefined ? undefined : body.category || null,
          published: body.published,
          visibility:
            body.visibility === undefined
              ? undefined
              : body.visibility === "private"
              ? "private"
              : "public",
          ...(first
            ? {
                template: first.template ?? undefined,
                starterFiles: JSON.stringify(first.starterFiles ?? {}),
                testFiles: JSON.stringify(first.testFiles ?? {}),
                estimatedMinutes: first.estimatedMinutes ?? 15,
              }
            : {}),
        },
      });

      if (stepsProvided) {
        await tx.challengeStep.deleteMany({ where: { challengeId: challenge.id } });
        await tx.challengeStep.createMany({
          data: body.steps!.map((s, i) => ({
            challengeId: challenge.id,
            position: i,
            title: s.title || null,
            description: s.description ?? "",
            template: s.template ?? "test-ts",
            starterFiles: JSON.stringify(s.starterFiles ?? {}),
            testFiles: JSON.stringify(s.testFiles ?? {}),
            estimatedMinutes: s.estimatedMinutes ?? 15,
            hint: s.hint || null,
            videoUrl: s.videoUrl || null,
            testCasesJson: JSON.stringify(s.testCases ?? []),
          })),
        });
      }
      return c;
    });

    return NextResponse.json({ id: updated.id, slug: updated.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Slug already in use by another challenge" },
        { status: 409 }
      );
    }
    console.error("Challenge update error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, authorId: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (challenge.authorId !== userId && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await prisma.challenge.delete({ where: { id: challenge.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Challenge delete error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
