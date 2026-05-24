import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/challenges
// User-facing Challenge create. Mirrors the admin path but author-locked:
//   - `authorId` is forced to the current user (anti-impersonation).
//   - `published` defaults to false (user flips it themselves).
//   - `visibility` accepted (defaults to "public").
//   - `steps` array required; at least one step.
//
// In Stage 1 we still write the legacy starterFiles/testFiles/template/
// estimatedMinutes onto Challenge from step[0] so any read path that hasn't
// been migrated yet still works. Stage 2 will drop those fields.
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true },
  });
  if (!user || user.banned) {
    return NextResponse.json({ error: "Account cannot publish content" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        slug?: string;
        title?: string;
        description?: string;
        difficulty?: string;
        tags?: string[];
        category?: string;
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
  const { slug, title, description } = body;
  if (!slug?.trim() || !title?.trim() || !description?.trim()) {
    return NextResponse.json(
      { error: "slug, title, and description are required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    return NextResponse.json(
      { error: "At least one step is required" },
      { status: 400 }
    );
  }

  // Per-step validation. Empty starter/test maps are allowed (a description-
  // only step is a reasonable "intro" step), but if either is provided it
  // must be a flat string→string map.
  for (const [i, step] of body.steps.entries()) {
    if (!step.description?.trim()) {
      return NextResponse.json(
        { error: `Step ${i + 1}: description is required` },
        { status: 400 }
      );
    }
    if (!step.template?.trim()) {
      return NextResponse.json(
        { error: `Step ${i + 1}: template is required` },
        { status: 400 }
      );
    }
    if (step.starterFiles && typeof step.starterFiles !== "object") {
      return NextResponse.json(
        { error: `Step ${i + 1}: starterFiles must be an object` },
        { status: 400 }
      );
    }
    if (step.testFiles && typeof step.testFiles !== "object") {
      return NextResponse.json(
        { error: `Step ${i + 1}: testFiles must be an object` },
        { status: 400 }
      );
    }
  }

  try {
    const first = body.steps[0];
    const created = await prisma.$transaction(async (tx) => {
      const challenge = await tx.challenge.create({
        data: {
          slug: slug.trim(),
          title: title.trim(),
          description: description,
          difficulty: body.difficulty || "easy",
          tags:
            body.tags && body.tags.length ? JSON.stringify(body.tags) : null,
          category: body.category || null,
          published: !!body.published,
          visibility: body.visibility === "private" ? "private" : "public",
          authorId: userId,
          // Legacy mirror — populated from step[0] so unmigrated read paths
          // (the attempt page in particular) keep working until Stage 2.
          template: first.template ?? "test-ts",
          starterFiles: JSON.stringify(first.starterFiles ?? {}),
          testFiles: JSON.stringify(first.testFiles ?? {}),
          estimatedMinutes: first.estimatedMinutes ?? 15,
        },
      });

      await tx.challengeStep.createMany({
        data: body.steps!.map((s, i) => ({
          challengeId: challenge.id,
          position: i,
          title: s.title || null,
          description: s.description!,
          template: s.template!,
          starterFiles: JSON.stringify(s.starterFiles ?? {}),
          testFiles: JSON.stringify(s.testFiles ?? {}),
          estimatedMinutes: s.estimatedMinutes ?? 15,
          hint: s.hint || null,
          videoUrl: s.videoUrl || null,
          testCasesJson: JSON.stringify(s.testCases ?? []),
        })),
      });

      return challenge;
    });

    return NextResponse.json({ id: created.id, slug: created.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A challenge with that slug already exists" },
        { status: 409 }
      );
    }
    console.error("Challenge create error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
