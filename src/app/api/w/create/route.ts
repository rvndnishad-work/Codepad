import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { grantTrialCredits } from "@/lib/billing/included-credits-server";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and dashes.",
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name } = parsed.data;
  let { slug } = parsed.data;

  // Ensure slug uniqueness
  // Old addresses of renamed workspaces still redirect, so they count as taken.
  const [existing, redirected] = await Promise.all([
    prisma.workspace.findUnique({ where: { slug }, select: { id: true } }),
    prisma.workspaceSlugRedirect.findUnique({ where: { oldSlug: slug }, select: { id: true } }),
  ]);

  if (existing || redirected) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;
  }

  try {
    // Create the workspace and immediately add the creator as OWNER. New
    // workspaces get a 14-day trial (IP-91) — GROWTH-level access + 5 seats —
    // which is what /w/create promises.
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        trialEndsAt,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    // Trial credits so the trial can run a real AI screening. Never fail the
    // create over them.
    try {
      await grantTrialCredits(workspace.id, session.user.id);
    } catch (err) {
      console.error("Trial credit grant failed:", err);
    }

    return NextResponse.json({ ok: true, slug: workspace.slug });
  } catch (err) {
    console.error("Workspace creation failed:", err);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
