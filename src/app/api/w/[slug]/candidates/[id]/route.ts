import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canMember, type Permission } from "@/lib/permissions";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  source: z.string().max(40).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  tags: z.array(z.string().max(40)).nullable().optional(),
  status: z.enum(["active", "future_hire", "do_not_hire", "hired", "rejected", "archived"]).optional(),
});

async function authorize(slug: string, candidateId: string, permission?: Permission) {
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
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, workspaceId: workspace.id },
  });
  if (!candidate) return { error: "Candidate not found" as const, status: 404 };
  return { workspace, candidate };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const ctx = await authorize(slug, id, "candidate:write");
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if ("email" in data && typeof data.email === "string") {
    data.email = (data.email as string).toLowerCase().trim() || null;
  }
  if ("tags" in data) {
    data.tags = data.tags ? JSON.stringify(data.tags) : null;
  }

  // Keep the pipeline `stage` in lockstep with terminal dispositions set via
  // the legacy status dropdown, and pull a candidate back onto the board when
  // their terminal status is lifted. Mirrors updateCandidateStageAction's
  // stage→status sync so the two taxonomies can no longer diverge.
  if (parsed.data.status) {
    const prevStage = ctx.candidate.stage;
    if (parsed.data.status === "hired" && prevStage !== "HIRED") {
      data.stage = "HIRED";
      data.stageChangedAt = new Date();
    } else if (parsed.data.status === "rejected" && prevStage !== "REJECTED") {
      data.stage = "REJECTED";
      data.rejectReason = "OTHER";
      data.stageChangedAt = new Date();
    } else if (
      parsed.data.status === "active" &&
      (prevStage === "HIRED" || prevStage === "REJECTED")
    ) {
      data.stage = "APPLIED";
      data.rejectReason = null;
      data.rejectReasonNote = null;
      data.stageChangedAt = new Date();
    }
  }

  try {
    const updated = await prisma.candidate.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, candidate: updated });
  } catch (err) {
    console.error("Candidate update failed:", err);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const ctx = await authorize(slug, id, "candidate:delete");
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  try {
    await prisma.candidate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Candidate delete failed:", err);
    return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
  }
}
