import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Get all saved prep questions and solved prep question slugs for the logged-in user.
 */
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        savedPrepQuestions: {
          select: {
            slug: true,
            title: true,
            difficulty: true,
            technology: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
        solvedPrepQuestions: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const saved = user.savedPrepQuestions.map((q) => ({
      slug: q.slug,
      title: q.title,
      difficulty: q.difficulty,
      technology: q.technology,
      company: q.company?.name ?? null,
      savedAt: Date.now(), // Fallback for client key
    }));

    const solvedSlugs = user.solvedPrepQuestions.map((q) => q.slug);

    return NextResponse.json({ saved, solved: solvedSlugs });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * Sync guest candidate's bookmark and solved lists to their DB profile upon login.
 */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { savedSlugs, solvedSlugs } = body;
  const rawSaved = Array.isArray(savedSlugs) ? savedSlugs : [];
  const rawSolved = Array.isArray(solvedSlugs) ? solvedSlugs : [];

  const allSlugs = Array.from(new Set([...rawSaved, ...rawSolved]));
  if (allSlugs.length === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    // Only connect slugs that actually exist in our question bank.
    const existing = await prisma.prepQuestion.findMany({
      where: { slug: { in: allSlugs } },
      select: { slug: true },
    });
    const validSlugs = new Set(existing.map((q) => q.slug));

    const validSaved = rawSaved.filter((slug) => validSlugs.has(slug));
    const validSolved = rawSolved.filter((slug) => validSlugs.has(slug));

    await prisma.user.update({
      where: { id: userId },
      data: {
        savedPrepQuestions: {
          connect: validSaved.map((slug) => ({ slug })),
        },
        solvedPrepQuestions: {
          connect: validSolved.map((slug) => ({ slug })),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * Clear all saved questions for the logged-in user.
 */
export async function DELETE(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        savedPrepQuestions: {
          set: [],
        },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


