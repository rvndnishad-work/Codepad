/**
 * Shared cloud TTS synthesis (server-only — never import from a client module).
 *
 * Tries providers in order of perceived voice quality:
 *   1. OpenAI TTS  — OPENAI_API_KEY. Voice via OPENAI_TTS_VOICE (default "alloy"),
 *      model via OPENAI_TTS_MODEL (default "tts-1-hd"; "gpt-4o-mini-tts" is newest).
 *   2. ElevenLabs  — ELEVENLABS_API_KEY. Voice via ELEVENLABS_VOICE_ID
 *      (default Rachel), model via ELEVENLABS_MODEL (default eleven_flash_v2_5 / multilingual_v2).
 *
 * Returns the audio buffer (audio/mpeg) + provider tag, or `null` when no
 * provider is configured or every configured provider failed. Callers map
 * `null` to an HTTP 503 so the browser client can fall back to its own TTS.
 *
 * Shared by the admin Copilot route (`/api/admin/tts`) and the candidate
 * interview route (`/api/ai-interview/tts`) so both speak in the same voice.
 * Now supports per-request voice override for the interview dropdown.
 */

export const OPENAI_VOICES = ["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer"] as const;
export type OpenAIVoice = typeof OPENAI_VOICES[number];
export const ELEVENLABS_VOICES: Record<string,string> = {
  Rachel: "21m00Tcm4TlvDq8ikWAM",
  Adam: "pNInz6obpgDQGcFmaJgB",
  Bella: "EXAVITQu4vr4xnSDxMaL",
  Antoni: "ErXwobaYiN019PkySvjV",
  Elli: "MF3mGyEYCl7XYWbV9V6O",
  Domi: "AZnzlk1XvdvUeBnXmlld",
};

/** Per-call ceiling: long enough for any single reply, under provider limits. */
export const TTS_MAX_CHARS = 4000;

export interface SynthesizedSpeech {
  buffer: ArrayBuffer;
  /** Which provider produced the audio — surfaced via the X-TTS-Provider header. */
  provider: "openai" | "elevenlabs";
}

const ALLOWED_OPENAI_VOICES = new Set<string>(OPENAI_VOICES as unknown as string[]);

/** True if at least one cloud provider key is present in the environment. */
export function isCloudTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ELEVENLABS_API_KEY);
}

export async function synthesizeSpeech(rawText: string, opts?: { voice?: string; model?: string }): Promise<SynthesizedSpeech | null> {
  const text = (rawText ?? "").slice(0, TTS_MAX_CHARS).trim();
  if (!text) return null;

  // 1. OpenAI TTS — now with dynamic voice + better defaults (tts-1-hd > tts-1)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const envVoice = process.env.OPENAI_TTS_VOICE || "alloy";
      const requestedVoice = opts?.voice?.trim().toLowerCase();
      const voice = requestedVoice && ALLOWED_OPENAI_VOICES.has(requestedVoice) ? requestedVoice : envVoice;
      const model = opts?.model?.trim() || process.env.OPENAI_TTS_MODEL || "tts-1-hd";
      const body: Record<string, unknown> = {
        model,
        voice,
        input: text,
        response_format: "mp3",
      };
      // gpt-4o-mini-tts supports an extra `instructions` field for style — give interviewer a warm conversational tone
      if (model === "gpt-4o-mini-tts") {
        body.instructions = "Speak as a warm, professional technical interviewer. Clear, encouraging, natural pacing.";
      }
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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

  // 2. ElevenLabs — better defaults: eleven_flash_v2_5 for low-latency, fallback to multilingual_v2 for quality
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) {
    try {
      // Allow per-request voice override: if opts.voice matches a known name/id, use it
      let voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
      if (opts?.voice) {
        const v = opts.voice.trim();
        if (ELEVENLABS_VOICES[v]) voiceId = ELEVENLABS_VOICES[v];
        else if (/^[a-zA-Z0-9]{20}$/.test(v)) voiceId = v;
      }
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
            model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.82,
              style: 0.15,
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
