import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { featureBlockedResponse } from "@/lib/admin/switches";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { MAX_PICKS, roleById, sanitizeAiSettings } from "@/lib/mock-interview/roles";
import { createMockInterview, MockError } from "@/lib/mock-interview/server";

/**
 * POST: create a developer mock interview from picked library questions.
 * AI mode returns the practice run's invite token (the AI interviewer asks the
 * questions). Peer mode returns a live room and the link for the other person.
 */
const schema = z.object({
  mode: z.enum(["ai", "peer"]),
  role: z.string().max(40),
  level: z.enum(["junior", "mid", "senior"]),
  picks: z
    .array(z.object({ kind: z.enum(["question", "design", "coding"]), id: z.string().min(1).max(64) }))
    .min(1)
    .max(MAX_PICKS),
  ai: z.unknown().optional(),
  language: z.string().max(20).optional().nullable(),
  seat: z.enum(["candidate", "interviewer"]).optional().default("candidate"),
  minutes: z.number().int().min(15).max(240).optional().default(60),
  brief: z.string().max(1000).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to set up a mock interview." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check your picks and try again." }, { status: 400 });
  const d = parsed.data;

  const paused = (await featureBlockedResponse("mock-interviews")) ?? (d.mode === "peer" ? await featureBlockedResponse("live-interviews") : null);
  if (paused) return paused;

  // Practice runs are free but each one hits the AI interviewer's quota once started.
  const rl = rateLimit(`mock-interview:${d.mode}:${clientKey(req, session.user.id)}`, d.mode === "ai" ? 8 : 20, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You have set up a lot of mock interviews in the last hour. Try again a bit later." },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  try {
    const result = await createMockInterview({
      user: { id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? null },
      mode: d.mode,
      role: roleById(d.role),
      level: d.level,
      picks: d.picks,
      ai: sanitizeAiSettings(d.ai),
      language: d.language ?? null,
      seat: d.seat,
      minutes: d.minutes,
      brief: d.brief ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof MockError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof Error && /questions|characters/i.test(err.message)) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[mock-interview] create failed", err);
    return NextResponse.json({ error: "Could not set up the interview. Try again." }, { status: 500 });
  }
}
