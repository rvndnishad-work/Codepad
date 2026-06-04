import { auth, updateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  userType: z.enum(["candidate", "recruiter"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { userType: parsed.data.userType },
  });

  // The jwt callback no longer reads userType on every request, so we must
  // explicitly refresh the token here — this fires the `trigger: "update"`
  // branch which re-reads userType from the DB and rewrites the session
  // cookie. The client then reloads to pick up the new nav/dashboard.
  await updateSession({});

  return NextResponse.json({ ok: true });
}
