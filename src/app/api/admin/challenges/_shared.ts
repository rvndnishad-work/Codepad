import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { planStepSync } from "@/app/admin/content/_lib/steps-plan";

const filesSchema = z.record(z.string(), z.string());

const testCaseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  input: z.string().max(20_000),
  expected: z.string().max(20_000),
  isHidden: z.boolean().default(false),
  weight: z.number().int().min(1).max(100).default(10),
});

export const stepSchema = z.object({
  /** Id of the existing ChallengeStep this edits; absent for a new step. */
  id: z.string().max(64).optional(),
  title: z.string().max(200).optional(),
  description: z.string().min(1).max(20_000),
  template: z.string().min(1).max(40),
  starterFiles: filesSchema,
  testFiles: filesSchema,
  estimatedMinutes: z.number().int().min(1).max(300),
  hint: z.string().max(20_000).optional(),
  videoUrl: z.string().max(500).optional(),
  testCases: z.array(testCaseSchema).optional(),
  // ── Function-harness authoring (pre-serialized JSON strings from the form) ──
  judgingMode: z.enum(["harness", "unit-js", "frontend"]).optional(),
  functionName: z.string().max(80).nullable().optional(),
  signatureJson: z.string().max(4_000).nullable().optional(),
  languagesJson: z.string().max(2_000).nullable().optional(),
  starterCodeJson: z.string().max(256 * 1024).nullable().optional(),
  referenceSolutionsJson: z.string().max(256 * 1024).nullable().optional(),
  harnessTestsJson: z.string().max(256 * 1024).optional(),
});
export type StepPayload = z.infer<typeof stepSchema>;

export const challengeSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and dashes"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(20_000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string().max(40)).max(20),
  category: z.string().max(80).nullable(),
  published: z.boolean(),
  visibility: z.enum(["public", "private"]).optional(),
  featured: z.boolean().optional(),
  premium: z.boolean().optional(),
  /** ISO time to publish a draft at; null or "" clears it. */
  scheduledAt: z.string().nullable().optional(),
  steps: z.array(stepSchema).min(1).max(20),
});
export type ChallengePayload = z.infer<typeof challengeSchema>;

/** Column values for one step at `position` (everything except challengeId). */
export function stepColumns(s: StepPayload, position: number) {
  return {
    position,
    title: s.title || null,
    description: s.description,
    template: s.template,
    starterFiles: JSON.stringify(s.starterFiles),
    testFiles: JSON.stringify(s.testFiles),
    estimatedMinutes: s.estimatedMinutes,
    hint: s.hint || null,
    videoUrl: s.videoUrl || null,
    testCasesJson: JSON.stringify(s.testCases || []),
    judgingMode: s.judgingMode ?? "unit-js",
    functionName: s.functionName ?? null,
    signatureJson: s.signatureJson ?? null,
    languagesJson: s.languagesJson ?? null,
    starterCodeJson: s.starterCodeJson ?? null,
    referenceSolutionsJson: s.referenceSolutionsJson ?? null,
    harnessTestsJson: s.harnessTestsJson ?? "[]",
  };
}

/** Legacy mirror of step 0 on the Challenge row, kept until Stage 2 drops the columns. */
export function legacyMirror(first: StepPayload) {
  return {
    template: first.template,
    starterFiles: JSON.stringify(first.starterFiles),
    testFiles: JSON.stringify(first.testFiles),
    estimatedMinutes: first.estimatedMinutes,
  };
}

export class StepSyncError extends Error {}

/**
 * Save `steps` for a challenge in place: existing steps keep their ids (so
 * ChallengeAttempt.stepId stays valid), new steps are created, and removed
 * steps are deleted only when nobody has attempted them. Throws
 * StepSyncError when a removed step still has attempts.
 *
 * (challengeId, position) is unique, so surviving rows are first parked on
 * negative positions, then moved to their final slots.
 */
export async function syncSteps(tx: Prisma.TransactionClient, challengeId: string, steps: StepPayload[]) {
  const existing = await tx.challengeStep.findMany({
    where: { challengeId },
    select: { id: true, position: true, title: true, _count: { select: { attempts: true } } },
  });
  const plan = planStepSync(
    existing.map((s) => ({ id: s.id, attempts: s._count.attempts })),
    steps,
  );
  if (plan.blocked.length > 0) {
    const names = plan.blocked
      .map((b) => {
        const row = existing.find((e) => e.id === b.id);
        return `${row?.title || `Step ${(row?.position ?? 0) + 1}`} (${b.attempts} attempts)`;
      })
      .join(", ");
    throw new StepSyncError(
      `Cannot remove ${names}: people have attempted it. Keep the step, or archive the challenge and make a new one.`,
    );
  }

  if (plan.deletes.length) await tx.challengeStep.deleteMany({ where: { id: { in: plan.deletes } } });
  for (const [i, u] of plan.updates.entries()) {
    await tx.challengeStep.update({ where: { id: u.id }, data: { position: -1 - i } });
  }
  for (const u of plan.updates) {
    await tx.challengeStep.update({ where: { id: u.id }, data: stepColumns(steps[u.index], u.index) });
  }
  if (plan.creates.length) {
    await tx.challengeStep.createMany({
      data: plan.creates.map((index) => ({ challengeId, ...stepColumns(steps[index], index) })),
    });
  }
  return plan;
}
