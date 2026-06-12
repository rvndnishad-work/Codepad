import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { synthesizeSpeech, TTS_MAX_CHARS } from "@/lib/ai-interview/tts-provider";

/**
 * Cloud TTS proxy for the admin Copilot.
 *
 * Delegates synthesis to the shared `synthesizeSpeech` helper (OpenAI →
 * ElevenLabs). If no provider is configured it returns 503, and the client
 * falls back permanently to the browser TTS path for the rest of the page
 * lifetime.
 *
 * Text is clamped to TTS_MAX_CHARS — long enough for any single copilot reply,
 * short enough to stay under both providers' per-call limits.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").slice(0, TTS_MAX_CHARS).trim();
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
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
