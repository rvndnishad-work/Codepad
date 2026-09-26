/**
 * The caller's own interview scorecard. Works for signed-in host and panel
 * members, and for emailed guest interviewers (`?guest=<token>` or the room
 * pass cookie), who have no account.
 *
 * GET                                     the card, criteria and panel progress
 * PUT { intent: "draft" | "submit", ... } save a draft or submit it
 * PUT { intent: "amend", reason, ... }    change a submitted card, audited
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { loadMyScorecard, saveMyScorecard, scorecardReviewer } from "@/lib/interview/scorecard-server";

const body = z.object({
  intent: z.enum(["draft", "submit", "amend"]),
  ratings: z.record(z.string().max(80), z.object({ r: z.number().int().nullable(), n: z.string().max(2000) })).optional(),
  notes: z.string().max(10000).optional(),
  recommendation: z.enum(["no", "unsure", "yes"]).nullable().optional(),
  reason: z.string().max(1000).optional(),
});

async function who(req: Request, id: string) {
  const session = await auth().catch(() => null);
  return scorecardReviewer(id, {
    userId: session?.user?.id ?? null,
    cookieHeader: req.headers.get("cookie"),
    guestToken: new URL(req.url).searchParams.get("guest"),
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviewer = await who(req, id);
  if (!reviewer) return NextResponse.json({ error: "Only the interviewers on this interview have a scorecard." }, { status: 403 });
  const data = await loadMyScorecard(id, reviewer);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ scorecard: data });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviewer = await who(req, id);
  if (!reviewer) return NextResponse.json({ error: "Only the interviewers on this interview have a scorecard." }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That scorecard could not be read. Reload and try again." }, { status: 400 });
  const res = await saveMyScorecard(id, reviewer, {
    intent: parsed.data.intent,
    ratings: parsed.data.ratings ?? {},
    notes: parsed.data.notes ?? "",
    recommendation: parsed.data.recommendation ?? null,
    reason: parsed.data.reason,
  });
  if (!res.ok) return NextResponse.json({ error: res.error, issues: res.issues ?? [] }, { status: 409 });
  return NextResponse.json({ scorecard: res.scorecard });
}
