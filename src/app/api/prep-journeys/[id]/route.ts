import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["active", "paused", "archived"]),
});

/** Pause / resume / archive a journey (owner only). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { status } = parsed.data;

  const journey = await prisma.prepJourney.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });
  if (!journey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (journey.status === "completed") {
    return NextResponse.json({ error: "Journey already completed" }, { status: 400 });
  }

  // Resuming must not create a second active journey.
  if (status === "active") {
    const otherActive = await prisma.prepJourney.findFirst({
      where: { userId, status: "active", id: { not: id } },
      select: { id: true },
    });
    if (otherActive) {
      return NextResponse.json(
        { error: "Another journey is already active", code: "ACTIVE_JOURNEY_EXISTS" },
        { status: 409 },
      );
    }
  }

  await prisma.prepJourney.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}
