/**
 * AI credits per workspace. Each workspace keeps its own balance, and
 * screenings spend only that. Credits not given to any workspace sit on the
 * billing account as "unassigned". Owners move credits between workspaces and
 * unassigned, and set how the monthly plan credits are split.
 *
 *   Monthly plan credits: each workspace gets its share, in order, oldest
 *   first; whatever is left stays unassigned. While no share is set on any
 *   workspace, the oldest gets them all, so one-workspace accounts (and
 *   accounts that never set a split) need nothing.
 *
 *   Plan credits roll over for one month and then expire, wherever they sit.
 *   A move carries their expiry with it: the older part (due to expire at the
 *   next monthly step) moves first.
 *
 *   A deleted workspace returns what it has left to unassigned.
 *
 * Pure: no database, no env.
 */

export type ShareInput = { id: string; share: number | null };

/** How a month's plan credits are split. Workspaces are given oldest first. */
export function splitPlanCredits(total: number, workspaces: ShareInput[]): { perWorkspace: Map<string, number>; unassigned: number } {
  const perWorkspace = new Map<string, number>();
  let left = Math.max(0, Math.floor(total));
  if (!workspaces.length) return { perWorkspace, unassigned: left };
  if (workspaces.every((w) => w.share === null)) {
    perWorkspace.set(workspaces[0].id, left);
    return { perWorkspace, unassigned: 0 };
  }
  for (const w of workspaces) {
    const give = Math.min(left, Math.max(0, Math.floor(w.share ?? 0)));
    if (give > 0) perWorkspace.set(w.id, give);
    left -= give;
  }
  return { perWorkspace, unassigned: left };
}

export type SplitCheck = { ok: true; shares: Map<string, number> } | { ok: false; error: string };

/** Checks a split an owner entered: whole numbers, at most the plan's monthly credits in total. */
export function checkSplit(entered: Record<string, unknown>, workspaceIds: string[], creditsPerMonth: number): SplitCheck {
  const shares = new Map<string, number>();
  let sum = 0;
  for (const id of workspaceIds) {
    const raw = entered[id];
    const n = raw === "" || raw === null || raw === undefined ? 0 : Number(raw);
    if (!Number.isInteger(n) || n < 0) return { ok: false, error: "Enter whole numbers of credits, 0 or more." };
    shares.set(id, n);
    sum += n;
  }
  if (sum > creditsPerMonth) {
    return { ok: false, error: `That adds up to ${sum}, but your plan has ${creditsPerMonth} credits a month.` };
  }
  return { ok: true, shares };
}

/** The plan-credit counters of a workspace or of the account's unassigned credits. */
export type PlanBucket = { left: number; lastGrant: number };

/**
 * Moving `amount` credits out of a balance whose plan credits are `bucket`:
 * plan credits move first (they can expire, bought ones cannot), older ones
 * before this month's. Returns the source's new counters and what to add to
 * the destination's.
 */
export function movePlanCredits(bucket: PlanBucket, amount: number): { from: PlanBucket; add: PlanBucket } {
  const left = Math.max(0, bucket.left);
  const lastGrant = Math.min(Math.max(0, bucket.lastGrant), left);
  const plan = Math.min(Math.max(0, amount), left);
  const older = left - lastGrant;
  const fromOlder = Math.min(plan, older);
  const fromNewer = plan - fromOlder;
  return {
    from: { left: left - plan, lastGrant: lastGrant - fromNewer },
    add: { left: plan, lastGrant: fromNewer },
  };
}

export type MoveCheck = { ok: true; amount: number } | { ok: false; error: string };

/** A move an owner asked for: a whole number, from somewhere to somewhere else, no more than the source holds. */
export function checkMove(from: string, to: string, amount: unknown, available: number): MoveCheck {
  if (from === to) return { ok: false, error: "Choose two different places to move credits between." };
  const n = Number(amount);
  if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "Enter a whole number of credits, 1 or more." };
  if (n > available) return { ok: false, error: `Only ${Math.max(0, available)} ${available === 1 ? "credit is" : "credits are"} free to move from there.` };
  return { ok: true, amount: n };
}

/** The key for the account's unassigned credits in the move form (workspace ids are cuids). */
export const UNASSIGNED = "unassigned";
