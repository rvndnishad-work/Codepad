/**
 * Server-side speech to text for theory answers (server-only).
 *
 * Used when the candidate's browser cannot transcribe speech itself (Safari,
 * Firefox): the browser records the answer and sends the clip here. Tries, in
 * order:
 *   1. OpenAI — OPENAI_API_KEY, model OPENAI_STT_MODEL (default "gpt-4o-mini-transcribe").
 *   2. Together — TOGETHER_API_KEY, model TOGETHER_STT_MODEL (default "openai/whisper-large-v3"),
 *      at TOGETHER_STT_BASE_URL (default the Together API).
 *
 * Returns null when no provider is configured or every provider failed, so the
 * candidate falls back to typing.
 */

export function isTranscriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.TOGETHER_API_KEY);
}

export type Transcript = { text: string; provider: "openai" | "together" };

const EXT: Record<string, string> = { webm: "webm", ogg: "ogg", mp4: "mp4", mpeg: "mp3", wav: "wav", "x-m4a": "m4a", aac: "aac" };

/** A file name whose extension matches the clip, which both providers use to detect the format. */
export function clipFileName(mime: string): string {
  const sub = mime.split(";")[0].split("/")[1] ?? "webm";
  return `answer.${EXT[sub] ?? "webm"}`;
}

async function post(url: string, key: string, form: FormData): Promise<string | null> {
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) {
    console.error("[stt] provider failed:", url, res.status, (await res.text().catch(() => "")).slice(0, 300));
    return null;
  }
  const data = (await res.json().catch(() => null)) as { text?: unknown } | null;
  return typeof data?.text === "string" ? data.text.trim() : null;
}

export async function transcribeAudio(audio: Blob, opts: { prompt?: string } = {}): Promise<Transcript | null> {
  const name = clipFileName(audio.type || "audio/webm");
  const form = (model: string) => {
    const f = new FormData();
    f.append("file", audio, name);
    f.append("model", model);
    f.append("response_format", "json");
    if (opts.prompt) f.append("prompt", opts.prompt);
    return f;
  };

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const text = await post("https://api.openai.com/v1/audio/transcriptions", openaiKey, form(process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe"));
      if (text != null) return { text, provider: "openai" };
    } catch (err) {
      console.error("[stt] OpenAI error:", err instanceof Error ? err.message : err);
    }
  }

  const togetherKey = process.env.TOGETHER_API_KEY;
  if (togetherKey) {
    try {
      // Not TOGETHER_BASE_URL: that can point the chat models at another host without speech models.
      const base = (process.env.TOGETHER_STT_BASE_URL || "https://api.together.xyz/v1").replace(/\/$/, "");
      const text = await post(`${base}/audio/transcriptions`, togetherKey, form(process.env.TOGETHER_STT_MODEL || "openai/whisper-large-v3"));
      if (text != null) return { text, provider: "together" };
    } catch (err) {
      console.error("[stt] Together error:", err instanceof Error ? err.message : err);
    }
  }
  return null;
}
