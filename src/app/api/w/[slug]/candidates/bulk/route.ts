import { NextResponse } from "next/server";
import { z } from "zod";
import { REJECT_REASONS } from "@/lib/crm/stages";
import {
  assertRefs,
  BULK_MAX,
  candidateErrorResponse,
  createCandidate,
  resolveCandidateActor,
  runBulkAction,
} from "@/lib/crm/candidates-server";

const bulkCreateSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(40).optional().or(z.literal("")),
        notes: z.string().max(10000).optional().or(z.literal("")),
        tags: z.array(z.string().max(40)).optional(),
        source: z.string().max(40).optional().or(z.literal("")),
        stage: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(1000),
  batchId: z.string().max(40).nullable().optional(),
  ownerId: z.string().max(40).nullable().optional(),
  /** Existing emails are skipped unless the caller asks to update them. */
  onDuplicate: z.enum(["skip", "update"]).optional(),
});

const ids = z.array(z.string().min(1)).min(1).max(BULK_MAX);

const bulkActionSchema = z.object({
  ids,
  op: z.discriminatedUnion("action", [
    z.object({
      action: z.literal("stage"),
      stage: z.string(),
      rejectReason: z.enum(REJECT_REASONS).optional(),
      rejectReasonNote: z.string().max(1000).nullable().optional(),
      /** Confirms passing candidates whose results are below the bar. */
      override: z.boolean().optional(),
    }),
    z.object({ action: z.literal("batch"), batchId: z.string().nullable() }),
    z.object({ action: z.literal("owner"), ownerId: z.string().nullable() }),
    z.object({
      action: z.literal("tag"),
      add: z.array(z.string().max(40)).optional(),
      remove: z.array(z.string().max(40)).optional(),
    }),
    z.object({ action: z.literal("archive") }),
    z.object({ action: z.literal("restore") }),
    z.object({ action: z.literal("erase") }),
  ]),
});

const bulkDeleteSchema = z.object({
  ids,
  mode: z.enum(["archive", "erase"]).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = bulkCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    const onDuplicate = parsed.data.onDuplicate ?? "skip";
    await assertRefs(actor, parsed.data.batchId, parsed.data.ownerId);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failed: { row: number; reason: string }[] = [];
    for (let i = 0; i < parsed.data.candidates.length; i++) {
      const c = parsed.data.candidates[i];
      try {
        const r = await createCandidate(
          actor,
          { ...c, source: c.source || "bulk-import", batchId: parsed.data.batchId, ownerId: parsed.data.ownerId },
          onDuplicate,
          { audit: false, refsChecked: true },
        );
        if (r.status === "created") created++;
        else if (r.status === "updated") updated++;
        else skipped++;
      } catch (err) {
        failed.push({ row: i + 1, reason: err instanceof Error ? err.message : String(err) });
      }
    }
    const { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } = await import("@/lib/workspace-audit");
    void writeWorkspaceAuditEntry({
      workspaceId: actor.workspaceId,
      actorUserId: actor.actorUserId,
      actorEmail: actor.actorEmail,
      action: WORKSPACE_AUDIT_ACTIONS.CANDIDATES_IMPORTED,
      targetType: parsed.data.batchId ? "candidateBatch" : "workspace",
      targetId: parsed.data.batchId ?? actor.workspaceId,
      meta: { created, updated, skipped, failed: failed.length, via: "api" },
    });
    return NextResponse.json({ ok: true, created, updated, skipped, failed });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/** One endpoint for every bulk change: stage, batch, owner, tags, archive, restore, erase. */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = bulkActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const actor = await resolveCandidateActor(slug);
    const r = await runBulkAction(actor, parsed.data.ids, parsed.data.op);
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/** Archives by default. `mode: "erase"` is permanent and for owners and admins. */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = bulkDeleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const actor = await resolveCandidateActor(slug);
    const erase = parsed.data.mode === "erase";
    const r = await runBulkAction(actor, parsed.data.ids, { action: erase ? "erase" : "archive" });
    return NextResponse.json({ ok: true, ...(erase ? { erased: r.changed } : { archived: r.changed }) });
  } catch (err) {
    const { body, status } = candidateErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
