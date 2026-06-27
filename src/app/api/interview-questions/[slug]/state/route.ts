import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Fetch saved/solved state for a question.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ saved: false, solved: false });
  }

  const userId = session.user.id;

  const [saved, solved] = await Promise.all([
    prisma.prepQuestion.findFirst({
      where: { slug, savedByUsers: { some: { id: userId } } },
      select: { id: true },
    }),
    prisma.prepQuestion.findFirst({
      where: { slug, solvedByUsers: { some: { id: userId } } },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    saved: Boolean(saved),
    solved: Boolean(solved),
  });
}

/**
 * Toggle saved/solved state.
 * Payload: { type: 'saved' | 'solved', active: boolean }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  if (!body || !body.type) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { type, active } = body;
  if (type !== "saved" && type !== "solved") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const relationField = type === "saved" ? "savedPrepQuestions" : "solvedPrepQuestions";

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        [relationField]: active
          ? { connect: { slug } }
          : { disconnect: { slug } },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
