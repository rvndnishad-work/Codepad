import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  // 5 attempts per 5 min per IP — sign-up abuse guard
  const rl = rateLimit("register:" + clientKey(req), 5, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many sign-ups from this address. Try again later." },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.flatten().fieldErrors.password?.[0] ??
          parsed.error.flatten().fieldErrors.email?.[0] ??
          "Invalid input.",
      },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    // OAuth user adding a password to their existing account
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        ...(name ? { name } : {}),
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        name: name ?? email.split("@")[0],
        passwordHash,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
