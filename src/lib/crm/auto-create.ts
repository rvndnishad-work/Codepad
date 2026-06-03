/**
 * Auto-create / auto-upsert Candidate row on workflow events (IP-34).
 *
 * Today: take-home dispatch + AI interview create both capture candidateEmail
 * → seed the CRM. Interview session create waits for IP-56 to add the email
 * column; tracked as IP-71.
 *
 * Idempotent: keyed on (workspaceId, email). If a row already exists, we
 * leave its `stage` alone (recruiter might have moved them already) and only
 * fill in missing fields. Returns the Candidate.id so the caller can stamp
 * its own foreign key.
 */
import { prisma } from "@/lib/prisma";

export type AutoCreateSource =
  | "take-home-dispatch"
  | "ai-interview-create"
  | "interview-schedule" // populated when IP-71 ships
  | "csv-import";

export type AutoCreateInput = {
  workspaceId: string;
  name: string;
  email: string; // required — that's the dedup key. If unknown, fall back to manual add.
  source: AutoCreateSource;
  /** Initial stage if this is a brand-new row. Existing rows keep their stage. */
  initialStage?: "APPLIED" | "SCREENED" | "TAKE_HOME";
};

export async function upsertCandidateForWorkflow(
  input: AutoCreateInput,
): Promise<{ candidateId: string; created: boolean }> {
  const email = input.email.toLowerCase().trim();
  if (!email) {
    throw new Error("upsertCandidateForWorkflow requires a non-empty email.");
  }

  const existing = await prisma.candidate.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    select: { id: true, stage: true },
  });

  if (existing) {
    return { candidateId: existing.id, created: false };
  }

  const created = await prisma.candidate.create({
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
