import { NextResponse } from "next/server";

/**
 * Retired (IP-88 convergence): single-challenge TakeHomeAssignment creation.
 *
 * All new take-homes are session-backed (InterviewSession type "take-home"),
 * created via `bulkCreateTakeHomeSessions` in
 * src/app/w/[slug]/candidates/actions.ts — the dashboard quick form, the
 * pipeline bulk dialog, and the multi-question builder all route there now.
 * Existing TakeHomeAssignment rows remain readable (dashboard history,
 * replays, leaderboard); only creation is gone.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been retired. Take-homes are now created as sessions via the take-home builder.",
    },
    { status: 410 },
  );
}
