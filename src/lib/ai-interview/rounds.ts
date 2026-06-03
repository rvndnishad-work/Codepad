/**
 * Round model for AI screenings (revamp 2026-06).
 *
 * A screening session can now hold N ordered rounds (AIInterviewRound rows),
 * materialized from a batch's shared AIScreeningRoundSpec set. Sessions created
 * before the batch model have no rounds — they carry a single `templateId` on
 * the session itself. `resolveSessionRounds` papers over that difference so the
 * candidate runtime and recruiter UI can always iterate over a uniform list:
 * legacy sessions yield exactly one synthetic "scaffold" round.
 *
 * This module is intentionally PURE (no DB, no server-only imports) so it can
 * run in a server component, an API route, or a unit test. Resolving a round's
 * actual CONTENT (starter files, title, surface kind) by `sourceKind` is a
 * separate, DB-touching concern handled where the runtime needs it.
 */

import type { AIInterviewRound, AIInterviewSession } from "@prisma/client";

export type Paradigm = "frontend" | "backend" | "dsa";
export type RoundSourceKind = "challenge" | "playground" | "scaffold";

/** A normalized round — the shared shape of a real AIInterviewRound row and the
 *  synthetic round we fabricate for legacy single-template sessions. */
export type SessionRound = {
  /** Round id. For a legacy (batch-less) session this is `legacy:<sessionId>`. */
  id: string;
  /** True when synthesized from a pre-batch single-template session. */
  legacy: boolean;
  /** 0-based order within the session. */
  order: number;
  /** Surface paradigm. Null on a legacy round — resolve the scaffold for the
   *  authoritative kind (a legacy session never recorded its paradigm). */
  paradigm: Paradigm | null;
  language: string | null;
  frameworkLabel: string | null;
  sourceKind: RoundSourceKind;
  /** Challenge id or playground catalog template id (challenge/playground). */
  sourceId: string | null;
  /** AIInterviewTemplate / builtin scaffold id (scaffold). */
  templateId: string | null;
  estimatedMinutes: number;
  /** Per-round file state (path -> code, JSON). */
  filesJson: string;
  /** Usually null — the conversation is shared at the session level (continuous
   *  chat with round-boundary markers). Reserved for a future per-round reset. */
  chatHistory: string | null;
  score: number | null;
  ratings: string | null;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
};

/**
 * Input shape for one round when building a screening batch (shared set or a
 * per-candidate override). Superset of the stack engine's `RoundSpecDraft`:
 * adds the "scaffold" source kind (a custom AIInterviewTemplate) for the
 * hybrid model. Lives here (a pure module) rather than in the "use server"
 * actions file so client components can import the type safely.
 */
export type RoundSpecInput = {
  paradigm: Paradigm;
  language?: string;
  frameworkLabel?: string;
  sourceKind: RoundSourceKind;
  /** Challenge id or playground catalog template id. */
  sourceId?: string;
  /** AIInterviewTemplate / builtin scaffold id (sourceKind === "scaffold"). */
  templateId?: string;
  estimatedMinutes?: number;
};

/** The legacy fallback estimate when a pre-batch session has no round metadata. */
const LEGACY_ESTIMATED_MINUTES = 30;

type SessionForRounds = Pick<
  AIInterviewSession,
  "id" | "templateId" | "filesJson" | "status" | "score" | "ratings" | "startedAt" | "finishedAt"
> & { rounds?: AIInterviewRound[] | null };

/**
 * Normalize a session into its ordered rounds.
 *
 * Pass a session with its `rounds` relation loaded. When rounds exist they are
 * returned sorted by `order`; otherwise a single synthetic scaffold round is
 * fabricated from the session's own `templateId` so callers never branch on
 * "is this a legacy session?".
 */
export function resolveSessionRounds(session: SessionForRounds): SessionRound[] {
  if (session.rounds && session.rounds.length > 0) {
    return [...session.rounds]
      .sort((a, b) => a.order - b.order)
      .map((r) => ({
        id: r.id,
        legacy: false,
        order: r.order,
        paradigm: (r.paradigm as Paradigm) ?? null,
        language: r.language ?? null,
        frameworkLabel: r.frameworkLabel ?? null,
        sourceKind: r.sourceKind as RoundSourceKind,
        sourceId: r.sourceId ?? null,
        templateId: r.templateId ?? null,
        estimatedMinutes: r.estimatedMinutes,
        filesJson: r.filesJson,
        chatHistory: r.chatHistory ?? null,
        score: r.score ?? null,
        ratings: r.ratings ?? null,
        status: r.status,
        startedAt: r.startedAt ?? null,
        finishedAt: r.finishedAt ?? null,
      }));
  }

  // Legacy single-template session → one synthetic scaffold round.
  return [
    {
      id: `legacy:${session.id}`,
      legacy: true,
      order: 0,
      paradigm: null,
      language: null,
      frameworkLabel: null,
      sourceKind: "scaffold",
      sourceId: null,
      templateId: session.templateId,
      estimatedMinutes: LEGACY_ESTIMATED_MINUTES,
      filesJson: session.filesJson ?? "{}",
      chatHistory: null,
      score: session.score ?? null,
      ratings: session.ratings ?? null,
      status: session.status,
      startedAt: session.startedAt ?? null,
      finishedAt: session.finishedAt ?? null,
    },
  ];
}

/** Whether a session is a multi-round (batch) screening vs a legacy single round. */
export function isMultiRound(session: SessionForRounds): boolean {
  return !!session.rounds && session.rounds.length > 0;
}

/** Aggregate per-round scores into a session composite (0..100), rounding the
 *  mean of graded rounds. Returns null when no round has been scored yet. */
export function compositeScore(rounds: Pick<SessionRound, "score">[]): number | null {
  const scored = rounds.map((r) => r.score).filter((s): s is number => s != null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}
