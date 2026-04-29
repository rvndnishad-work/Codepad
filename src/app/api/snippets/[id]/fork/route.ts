import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(clientKey(req, session.user.id), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // Fork by id OR slug — the source must be public, or owned by the user.
  const source = await prisma.snippet.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (source.visibility !== "public" && source.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const copy = await prisma.snippet.create({
    data: {
      slug: nanoid(10),
      title: `${source.title} (fork)`,
      template: source.template,
      files: source.files,
      visibility: "private",
      userId: session.user.id,
    },
  });
  return NextResponse.json({ id: copy.id, slug: copy.slug });
}
