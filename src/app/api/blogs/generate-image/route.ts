import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/blogs/generate-image
 *
 * Generates a blog cover image from a text prompt. Two providers supported:
 *
 *   1. Google Gemini 2.5 Flash Image ("Nano Banana") — high quality, requires
 *      a billing-enabled Google Cloud project. Free-tier daily quota is 0,
 *      so a plain API key without billing returns 429 forever.
 *   2. Pollinations.ai — completely free, no key, no signup. Used as the
 *      default when GEMINI_API_KEY isn't set, and as an automatic fallback
 *      when Gemini returns a billing-related 429.
 *
 * Both providers return a `data:image/...;base64,...` URL so callers don't
 * have to care which one ran.
 *
 * Required env (optional, used when present):
 *   GEMINI_API_KEY  — Google AI Studio key. https://aistudio.google.com/apikey
 */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

const POLLINATIONS_ENDPOINT = "https://image.pollinations.ai/prompt";

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "4:3": { w: 1024, h: 768 },
  "1:1": { w: 1024, h: 1024 },
  "3:4": { w: 768, h: 1024 },
  "9:16": { w: 720, h: 1280 },
};

const bodySchema = z.object({
  prompt: z.string().trim().min(3).max(800),
  aspectRatio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
    .optional()
    .default("16:9"),
});

type Provider = "gemini" | "pollinations";

interface GenResult {
  dataUrl: string;
  mimeType: string;
  provider: Provider;
}

interface ProviderError {
  status: number;
  message: string;
  /** When true, the route may fall back to a different provider. */
  retryable?: boolean;
}

function isErr(x: unknown): x is ProviderError {
  return !!x && typeof x === "object" && "status" in (x as object);
}

async function tryGemini(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
): Promise<GenResult | ProviderError> {
  const fullPrompt = `${prompt}\n\nStyle: high-quality blog cover image, editorial photography or vivid digital illustration, strong composition, no watermarks, no text overlays.`;
  let upstream: Response;
  try {
    upstream = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio },
        },
      }),
    });
  } catch (err) {
    return {
      status: 502,
      message:
        err instanceof Error ? `Gemini network error: ${err.message}` : "Gemini unreachable",
      retryable: true,
    };
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("[generate-image] gemini error", upstream.status, text);
    // 429 specifically on Gemini almost always means "free tier limit is 0
    // and billing isn't enabled". Mark retryable so the caller can fall back.
    if (upstream.status === 429) {
      return {
        status: 429,
        message:
          "Gemini image quota exhausted (free-tier limit is 0; enable billing).",
        retryable: true,
      };
    }
    let message = "Gemini returned an error.";
    if (upstream.status === 400) message = "The prompt was rejected by Gemini. Try rephrasing.";
    else if (upstream.status === 403) message = "Gemini API key was rejected.";
    return { status: 502, message, retryable: false };
  }

  const json = (await upstream.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
          text?: string;
        }>;
      };
    }>;
  };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const refusal = parts.find((p) => p.text)?.text;
    return {
      status: 422,
      message:
        refusal ?? "Gemini returned no image. Try a different prompt.",
      retryable: false,
    };
  }
  const mimeType = imagePart.inlineData.mimeType ?? "image/png";
  return {
    dataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    mimeType,
    provider: "gemini",
  };
}

async function tryPollinations(
  prompt: string,
  aspectRatio: string,
): Promise<GenResult | ProviderError> {
  const dims = ASPECT_DIMS[aspectRatio] ?? ASPECT_DIMS["16:9"];
  // Pollinations encodes the prompt in the path. `nologo` strips their
  // watermark. `model=flux` uses FLUX.1-schnell which is fast and decent
  // quality for cover-style images.
  // Adding a non-deterministic seed param ensures consecutive identical
  // prompts return different images.
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `${POLLINATIONS_ENDPOINT}/${encodeURIComponent(prompt)}` +
    `?width=${dims.w}&height=${dims.h}&model=flux&nologo=true&seed=${seed}`;

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch (err) {
    return {
      status: 502,
      message:
        err instanceof Error
          ? `Pollinations network error: ${err.message}`
          : "Pollinations unreachable",
    };
  }
  if (!upstream.ok) {
    console.error("[generate-image] pollinations error", upstream.status);
    return {
      status: 502,
      message: `Pollinations returned ${upstream.status}.`,
    };
  }
  // Pollinations returns the raw image bytes. Convert to base64 so the API
  // response shape matches the Gemini path.
  const arrayBuffer = await upstream.arrayBuffer();
  const mimeType = upstream.headers.get("content-type") ?? "image/jpeg";
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
    provider: "pollinations",
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`image-gen:${session.user.id}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Too many image requests. Try again in ${Math.ceil(rl.resetMs / 1000)}s.`,
      },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { prompt, aspectRatio } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  const wantsGemini = !!apiKey;

  // Try Gemini first when configured. If it fails with a retryable error
  // (network blip, billing-quota 429), fall back to Pollinations transparently
  // so the user still gets an image.
  let result: GenResult | ProviderError;
  let geminiNote: string | null = null;

  if (wantsGemini) {
    result = await tryGemini(apiKey!, prompt, aspectRatio);
    if (isErr(result) && result.retryable) {
      geminiNote = result.message;
      result = await tryPollinations(prompt, aspectRatio);
    }
  } else {
    result = await tryPollinations(prompt, aspectRatio);
  }

  if (isErr(result)) {
    return NextResponse.json(
      {
        error: "upstream",
        message: result.message,
        geminiNote: geminiNote ?? undefined,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    dataUrl: result.dataUrl,
    mimeType: result.mimeType,
    provider: result.provider,
    aspectRatio,
    // When we fell back, surface a note so the UI can show "via Pollinations
    // (Gemini billing not enabled)".
    fallbackNote: geminiNote ?? undefined,
  });
}
