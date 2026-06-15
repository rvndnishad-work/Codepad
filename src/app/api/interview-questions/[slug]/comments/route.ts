import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({ content: z.string().min(1).max(5000) });

type Ctx = { params: Promise<{ slug: string }> };

/** Post a discussion comment on a published interview question. Auth required. */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const question = await prisma.prepQuestion.findFirst({
    where: { slug, status: "published" },
    select: { id: true },
  });
  if (!question) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const comment = await prisma.prepQuestionComment.create({
    data: { questionId: question.id, userId: session.user.id, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
