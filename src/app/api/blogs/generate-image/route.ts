import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * POST /api/blogs/generate-image
 *
 * Generates a cover image from a text prompt using Google's Gemini 2.5
 * Flash Image model (a.k.a. "Nano Banana"). Returns the result as a
 * base64 data URL so the caller can drop it straight into a <img> or
 * store it in the BlogPost.coverImage column without setting up a CDN.
 *
 * Same approach Forem uses for their AI cover image feature:
 *   https://github.com/forem/forem/blob/main/app/services/ai/image_generator.rb
 *
 * Requires:
 *   GEMINI_API_KEY  — get one free at https://aistudio.google.com/apikey
 */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

const bodySchema = z.object({
  prompt: z.string().trim().min(3).max(800),
  /**
   * Aspect ratio hint for the generator. Maps to Gemini's `imageConfig.aspectRatio`.
   * Cover images use 16:9 by default.
   */
  aspectRatio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
    .optional()
    .default("16:9"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Per-user rate limit. Image gen is expensive — keep it tight.
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Image generation isn't configured on this server. Ask the admin to set GEMINI_API_KEY.",
      },
      { status: 503 },
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

  // Wrap the user's prompt so we steer toward cover-art quality regardless of
  // how they phrase it. Gemini is fine with plain prompts but a small system
  // suffix pushes toward magazine-cover aesthetics rather than UI mockups.
  const fullPrompt = `${prompt}\n\nStyle: high-quality blog cover image, editorial photography or vivid digital illustration, strong composition, no watermarks, no text overlays.`;

  try {
    const upstream = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
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

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("[generate-image] gemini error", upstream.status, text);
      // Surface a useful message for common failure modes.
      let message = "Image generation failed. Please try again.";
      if (upstream.status === 400) message = "The prompt was rejected. Try rephrasing.";
      else if (upstream.status === 403) message = "API key rejected by Gemini.";
      else if (upstream.status === 429) message = "Gemini quota exceeded. Try later.";
      return NextResponse.json(
        { error: "upstream", message, upstreamStatus: upstream.status },
        { status: 502 },
      );
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

    // Find the first inline-image part in the response.
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      // If the model returned only text (e.g. safety refusal), pass it back.
      const refusal = parts.find((p) => p.text)?.text;
      return NextResponse.json(
        {
          error: "no_image",
          message:
            refusal ??
            "The model didn't return an image. Try a different prompt.",
        },
        { status: 422 },
      );
    }

    const mimeType = imagePart.inlineData.mimeType ?? "image/png";
    const dataUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
    return NextResponse.json({ dataUrl, mimeType, aspectRatio });
  } catch (err) {
    console.error("[generate-image] unexpected", err);
    return NextResponse.json(
      { error: "internal", message: "Something went wrong generating the image." },
      { status: 500 },
    );
  }
}
