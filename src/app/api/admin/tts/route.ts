import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

/**
 * Cloud TTS proxy for the admin Copilot.
 *
 * Tries providers in order of perceived voice quality:
 *   1. OpenAI TTS  — requires OPENAI_API_KEY. Voice via OPENAI_TTS_VOICE
 *      (default: "nova" — warm female). Model via OPENAI_TTS_MODEL
 *      (default: "tts-1"; bump to "tts-1-hd" for noticeably better audio).
 *   2. ElevenLabs  — requires ELEVENLABS_API_KEY. Voice via
 *      ELEVENLABS_VOICE_ID (default: Rachel — the standard sample voice).
 *
 * If neither key is set the route returns 503, and the client falls back
 * permanently to the browser TTS path for the rest of the page lifetime.
 *
 * Text is clamped to 4000 chars — long enough for any single copilot reply,
 * short enough to stay under both providers' per-call limits.
 */

const MAX_CHARS = 4000;

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").slice(0, MAX_CHARS).trim();
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  // 1. OpenAI TTS
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || "tts-1",
          voice: process.env.OPENAI_TTS_VOICE || "nova",
          input: text,
          // mp3 is the default; smaller payload than wav, plays everywhere.
          response_format: "mp3",
        }),
      });
      if (ttsRes.ok) {
        const buf = await ttsRes.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "private, max-age=300",
            "X-TTS-Provider": "openai",
          },
        });
      }
      console.error("[TTS] OpenAI failed:", ttsRes.status, await ttsRes.text().catch(() => ""));
    } catch (err) {
      console.error("[TTS] OpenAI error:", err);
    }
    // Fall through to next provider rather than failing the request.
  }

  // 2. ElevenLabs
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) {
    try {
      const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );
      if (ttsRes.ok) {
        const buf = await ttsRes.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "private, max-age=300",
            "X-TTS-Provider": "elevenlabs",
          },
        });
      }
      console.error("[TTS] ElevenLabs failed:", ttsRes.status, await ttsRes.text().catch(() => ""));
    } catch (err) {
      console.error("[TTS] ElevenLabs error:", err);
    }
  }

  // No provider succeeded — signal the client to fall back to browser TTS
  // permanently for this session.
  return NextResponse.json(
    { error: "No cloud TTS provider configured." },
    { status: 503 }
  );
}
