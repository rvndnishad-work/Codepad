/**
 * Auto-create / auto-upsert Candidate row on workflow events (IP-34).
 *
 * The single candidate-linkage path for every workflow surface: take-home
 * dispatch (single/bulk/session builder), AI interview create, and live
 * interview create. Callers that want an existing candidate moved forward
 * pair this with `advanceCandidateStage` (src/lib/crm/advance.ts).
 *
 * Idempotent: keyed on (workspaceId, email). If a row already exists, we
 * leave its `stage` alone (recruiter might have moved them already) and only
 * fill in missing fields. Returns the Candidate.id so the caller can stamp
 * its own foreign key.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AutoCreateSource =
  | "take-home-dispatch"
  | "ai-interview-create"
  | "interview-schedule"
  | "csv-import";

export type AutoCreateInput = {
  workspaceId: string;
  name: string;
  email: string; // required — that's the dedup key. If unknown, fall back to manual add.
  source: AutoCreateSource;
  /** Initial stage if this is a brand-new row. Existing rows keep their stage. */
  initialStage?: "APPLIED" | "SCREENED" | "TAKE_HOME" | "ONSITE";
};

export async function upsertCandidateForWorkflow(
  input: AutoCreateInput,
  /** Pass the transaction client when calling from inside prisma.$transaction. */
  db: Prisma.TransactionClient = prisma,
): Promise<{ candidateId: string; created: boolean }> {
  const email = input.email.toLowerCase().trim();
  if (!email) {
    throw new Error("upsertCandidateForWorkflow requires a non-empty email.");
  }

  const existing = await db.candidate.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    select: { id: true, stage: true },
  });

  if (existing) {
    return { candidateId: existing.id, created: false };
  }

  const created = await db.candidate.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      email,
      source: input.source,
      status: "active",
      stage: input.initialStage ?? "APPLIED",
      stageChangedAt: new Date(),
    },
    select: { id: true },
  });
  return { candidateId: created.id, created: true };
}
