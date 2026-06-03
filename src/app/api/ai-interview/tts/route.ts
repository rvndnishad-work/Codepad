import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { synthesizeSpeech, TTS_MAX_CHARS } from "@/lib/ai-interview/tts-provider";

/**
 * Candidate-facing cloud TTS for the AI interview.
 *
 * Mirrors `/api/admin/tts` but is authorized by a valid AI-interview invite
 * token instead of an admin session — the same trust model the `message` route
 * uses — so the AI interviewer can speak to candidates in natural cloud voices.
 *
 * Abuse guards:
 *   • token must resolve to a live (un-submitted) session
 *   • per-session cadence cap (TTS fires once per AI reply; a small burst is
 *     plenty and stops a script from grinding the provider bill)
 *   • text clamped to TTS_MAX_CHARS
 *
 * If no provider key is configured the route returns 503 and the browser
 * client falls back permanently to its own speechSynthesis for the page life.
 */
export async function POST(req: NextRequest) {
  let body: { inviteToken?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inviteToken = (body.inviteToken ?? "").trim();
  const text = (body.text ?? "").slice(0, TTS_MAX_CHARS).trim();
  if (!inviteToken || !text) {
    return NextResponse.json({ error: "Missing inviteToken or text" }, { status: 400 });
  }

  // Authorize via the invite token — the candidate never sees the session id.
  const session = await prisma.aIInterviewSession.findUnique({
    where: { inviteToken },
    select: { id: true, finishedAt: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.finishedAt) {
    return NextResponse.json({ error: "Interview already submitted." }, { status: 410 });
  }

  // Per-session cadence cap. Generous enough for normal back-and-forth, bounded
  // enough that a malicious client can't spike the TTS bill.
  const limit = rateLimit(`ai-tts:${session.id}`, 12, 10_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const audio = await synthesizeSpeech(text);
  if (!audio) {
    return NextResponse.json(
      { error: "No cloud TTS provider configured." },
      { status: 503 }
    );
  }

  return new Response(audio.buffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=300",
      "X-TTS-Provider": audio.provider,
    },
  });
}
