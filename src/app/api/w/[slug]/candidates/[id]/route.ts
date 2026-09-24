import { NextResponse } from "next/server";
import { z } from "zod";
import { REJECT_REASONS } from "@/lib/crm/stages";
import {
  archiveCandidates,
  candidateErrorResponse,
  eraseCandidates,
  resolveCandidateActor,
  updateCandidate,
} from "@/lib/crm/candidates-server";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  source: z.string().max(40).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  tags: z.array(z.string().max(40)).nullable().optional(),
  status: z.enum(["active", "future_hire", "do_not_hire", "hired", "rejected", "archived"]).optional(),
  /** Required when status is "rejected". */
  rejectReason: z.enum(REJECT_REASONS).optional(),
  rejectReasonNote: z.string().max(1000).nullable().optional(),
  batchId: z.string().max(40).nullable().optional(),
  ownerId: z.string().max(40).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const candidate = await updateCandidate(actor, id, parsed.data);
    return NextResponse.json({ ok: true, candidate });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/**
 * Archives by default, which can be undone. `?mode=erase` removes the person
 * for good and is limited to workspace owners and admins.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const erase = new URL(req.url).searchParams.get("mode") === "erase";
  try {
    const actor = await resolveCandidateActor(slug, "candidate:delete");
    if (erase) {
      const r = await eraseCandidates(actor, [id]);
      if (!r.erased) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
      return NextResponse.json({ ok: true, erased: r.erased });
    }
    const r = await archiveCandidates(actor, [id], true);
    return NextResponse.json({ ok: true, archived: r.changed });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
