/**
 * Shared cloud TTS synthesis (server-only — never import from a client module).
 *
 * Tries providers in order of perceived voice quality:
 *   1. OpenAI TTS  — OPENAI_API_KEY. Voice via OPENAI_TTS_VOICE (default "nova"),
 *      model via OPENAI_TTS_MODEL (default "tts-1"; "tts-1-hd" sounds better).
 *   2. ElevenLabs  — ELEVENLABS_API_KEY. Voice via ELEVENLABS_VOICE_ID
 *      (default Rachel), model via ELEVENLABS_MODEL (default eleven_turbo_v2_5).
 *
 * Returns the audio buffer (audio/mpeg) + provider tag, or `null` when no
 * provider is configured or every configured provider failed. Callers map
 * `null` to an HTTP 503 so the browser client can fall back to its own TTS.
 *
 * Shared by the admin Copilot route (`/api/admin/tts`) and the candidate
 * interview route (`/api/ai-interview/tts`) so both speak in the same voice.
 */

/** Per-call ceiling: long enough for any single reply, under provider limits. */
export const TTS_MAX_CHARS = 4000;

export interface SynthesizedSpeech {
  buffer: ArrayBuffer;
  /** Which provider produced the audio — surfaced via the X-TTS-Provider header. */
  provider: "openai" | "elevenlabs";
}

/** True if at least one cloud provider key is present in the environment. */
export function isCloudTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ELEVENLABS_API_KEY);
}

export async function synthesizeSpeech(rawText: string): Promise<SynthesizedSpeech | null> {
  const text = (rawText ?? "").slice(0, TTS_MAX_CHARS).trim();
  if (!text) return null;

  // 1. OpenAI TTS
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || "tts-1",
          voice: process.env.OPENAI_TTS_VOICE || "nova",
          input: text,
          response_format: "mp3",
        }),
      });
      if (res.ok) {
        return { buffer: await res.arrayBuffer(), provider: "openai" };
      }
      console.error("[TTS] OpenAI failed:", res.status, await res.text().catch(() => ""));
    } catch (err) {
      console.error("[TTS] OpenAI error:", err);
    }
    // Fall through to the next provider rather than failing outright.
  }

  // 2. ElevenLabs
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) {
    try {
      const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
      const res = await fetch(
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
      if (res.ok) {
        return { buffer: await res.arrayBuffer(), provider: "elevenlabs" };
      }
      console.error("[TTS] ElevenLabs failed:", res.status, await res.text().catch(() => ""));
    } catch (err) {
      console.error("[TTS] ElevenLabs error:", err);
    }
  }

  return null;
}
