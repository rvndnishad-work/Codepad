import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canMember, type Permission } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  source: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(10000).optional().or(z.literal("")),
  tags: z.array(z.string().max(40)).optional(),
});

async function authorize(slug: string, permission?: Permission) {
  const session = await auth();
  if (!session?.user?.id) return { error: "unauthorized" as const, status: 401 };
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: { members: { select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) return { error: "Workspace not found" as const, status: 404 };
  const member = workspace.members.find((m) => m.userId === session.user!.id);
  if (!member) return { error: "Forbidden" as const, status: 403 };
  if (permission && !(await canMember(member, permission))) {
    return { error: "Forbidden" as const, status: 403 };
  }
  return { workspace, userId: session.user.id };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await authorize(slug);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const candidates = await prisma.candidate.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { takeHomes: true, sessions: true } },
    },
  });

  return NextResponse.json({ candidates });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await authorize(slug, "candidate:write");
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, source, notes, tags } = parsed.data;
  const normalizedEmail = email?.toLowerCase().trim() || null;

  // If an email is provided, upsert by (workspaceId, email) so the same
  // candidate isn't double-created from this entry point.
  try {
    let candidate;
    if (normalizedEmail) {
      candidate = await prisma.candidate.upsert({
        where: { workspaceId_email: { workspaceId: ctx.workspace.id, email: normalizedEmail } },
        update: {
          name,
          phone: phone || null,
          source: source || undefined,
          notes: notes || undefined,
          tags: tags && tags.length ? JSON.stringify(tags) : undefined,
        },
        create: {
          workspaceId: ctx.workspace.id,
          name,
          email: normalizedEmail,
          phone: phone || null,
          source: source || "manual",
          notes: notes || null,
          tags: tags && tags.length ? JSON.stringify(tags) : null,
          status: "active",
        },
      });
    } else {
      candidate = await prisma.candidate.create({
        data: {
          workspaceId: ctx.workspace.id,
          name,
          email: null,
          phone: phone || null,
          source: source || "manual",
          notes: notes || null,
          tags: tags && tags.length ? JSON.stringify(tags) : null,
          status: "active",
        },
      });
    }

    return NextResponse.json({ ok: true, candidate });
  } catch (err) {
    console.error("Candidate create failed:", err);
    return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}
