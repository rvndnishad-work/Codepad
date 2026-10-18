/**
 * Plan how to save a challenge's steps without orphaning attempts.
 *
 * The old save deleted every ChallengeStep and recreated them, so each
 * ChallengeAttempt.stepId pointed at a row that no longer existed. Now each
 * incoming step that carries the id of an existing step updates that row in
 * place, steps without a known id are created, and existing steps that are
 * no longer present are deleted, but only when nobody has attempted them.
 */
export type ExistingStep = { id: string; attempts: number };
export type IncomingStep = { id?: string | null };

export type StepPlan = {
  /** Existing rows to update, with their new position. */
  updates: { id: string; index: number }[];
  /** Indices into the incoming list that need a new row. */
  creates: number[];
  /** Existing rows to delete (no attempts). */
  deletes: string[];
  /** Existing rows that were removed but have attempts; the save must stop. */
  blocked: { id: string; attempts: number }[];
};

export function planStepSync(existing: ExistingStep[], incoming: IncomingStep[]): StepPlan {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const used = new Set<string>();
  const updates: StepPlan["updates"] = [];
  const creates: number[] = [];

  incoming.forEach((s, index) => {
    const id = s.id ?? null;
    // An id we do not know, or one already claimed by an earlier step (a
    // duplicated step in the form), becomes a new row.
    if (id && byId.has(id) && !used.has(id)) {
      used.add(id);
      updates.push({ id, index });
    } else {
      creates.push(index);
    }
  });

  const deletes: string[] = [];
  const blocked: StepPlan["blocked"] = [];
  for (const s of existing) {
    if (used.has(s.id)) continue;
    if (s.attempts > 0) blocked.push({ id: s.id, attempts: s.attempts });
    else deletes.push(s.id);
  }
  return { updates, creates, deletes, blocked };
}
