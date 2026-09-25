import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  candidateErrorResponse,
  createCandidate,
  resolveCandidateActor,
} from "@/lib/crm/candidates-server";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  source: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(10000).optional().or(z.literal("")),
  tags: z.array(z.string().max(40)).optional(),
  stage: z.string().max(20).optional(),
  batchId: z.string().max(40).nullable().optional(),
  ownerId: z.string().max(40).nullable().optional(),
  /** What to do when the email already belongs to someone here. Default
   *  "error" answers 409 with the existing record instead of overwriting. */
  onDuplicate: z.enum(["error", "skip", "update"]).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const actor = await resolveCandidateActor(slug);
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const batchId = url.searchParams.get("batch");
    const candidates = await prisma.candidate.findMany({
      where: {
        workspaceId: actor.workspaceId,
        ...(includeArchived ? {} : { status: { not: "archived" } }),
        ...(batchId ? { batchId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { takeHomes: true, sessions: true } } },
    });
    return NextResponse.json({ candidates });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const { onDuplicate, ...input } = parsed.data;
    const outcome = await createCandidate(actor, input, onDuplicate ?? "error");
    const candidate = await prisma.candidate.findUnique({ where: { id: outcome.candidateId } });
    return NextResponse.json({ ok: true, outcome: outcome.status, candidate });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
