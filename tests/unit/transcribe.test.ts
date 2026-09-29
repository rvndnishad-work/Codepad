import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clipFileName, isTranscriptionConfigured, transcribeAudio } from "@/lib/ai-interview/transcribe";

const clip = () => new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" });

describe("server transcription", () => {
  const env = { ...process.env };
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.TOGETHER_API_KEY;
    delete process.env.TOGETHER_STT_BASE_URL;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("names the upload after the recording format", () => {
    expect(clipFileName("audio/webm;codecs=opus")).toBe("answer.webm");
    expect(clipFileName("audio/mp4")).toBe("answer.mp4");
    expect(clipFileName("audio/mpeg")).toBe("answer.mp3");
  });

  it("does nothing without a provider key", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(isTranscriptionConfigured()).toBe(false);
    expect(await transcribeAudio(clip())).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses OpenAI first, with the question as the prompt", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.TOGETHER_API_KEY = "tg-test";
    const fetch = vi.fn(async () => new Response(JSON.stringify({ text: " useEffect runs after render " }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await transcribeAudio(clip(), { prompt: "What does useEffect do?" })).toEqual({ text: "useEffect runs after render", provider: "openai" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("gpt-4o-mini-transcribe");
    expect(form.get("prompt")).toBe("What does useEffect do?");
    expect((form.get("file") as File).name).toBe("answer.webm");
  });

  it("falls back to Together when OpenAI fails", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.TOGETHER_API_KEY = "tg-test";
    process.env.TOGETHER_BASE_URL = "https://chat.example/v1";
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ text: "hello" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await transcribeAudio(clip())).toEqual({ text: "hello", provider: "together" });
    // The chat base URL can point elsewhere; speech always goes to Together unless overridden.
    expect(fetch.mock.calls[1][0]).toBe("https://api.together.xyz/v1/audio/transcriptions");
    expect((fetch.mock.calls[1][1].body as FormData).get("model")).toBe("openai/whisper-large-v3");
  });

  it("returns null when every provider fails", async () => {
    process.env.TOGETHER_API_KEY = "tg-test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 400 })));
    expect(await transcribeAudio(clip())).toBeNull();
  });
});
