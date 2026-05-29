import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/prompt-playground/run
 *
 * Streams a Gemini completion back to the client as plain text chunks.
 * Body: { model: string, systemPrompt?: string, prompt: string }
 *
 * Auth required — the playground is an authenticated dev tool, not a public
 * proxy. Anonymous calls return 401 to avoid burning the project's Gemini
 * quota on drive-by traffic.
 */
export const runtime = "nodejs";

// Allow-list keeps the prompt UI honest — the client can offer model options
// but the server is the source of truth for which models can actually be hit.
// Adding a new model is a one-line change here.
const ALLOWED_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
]);

const MAX_PROMPT_CHARS = 32_000; // ~8k tokens; comfortably under context limits
const MAX_SYSTEM_CHARS = 4_000;

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Sign in to use the playground." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server is missing GEMINI_API_KEY." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const model = String(body?.model ?? "").trim();
  const systemPrompt = String(body?.systemPrompt ?? "").slice(0, MAX_SYSTEM_CHARS);
  const prompt = String(body?.prompt ?? "").slice(0, MAX_PROMPT_CHARS);

  if (!ALLOWED_MODELS.has(model)) {
    return new Response(JSON.stringify({ error: `Model "${model}" is not allowed.` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!prompt.trim()) {
    return new Response(JSON.stringify({ error: "Prompt is empty." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Gemini REST streaming endpoint. `alt=sse` returns Server-Sent Events
  // (each chunk prefixed with `data:`); without it the response is a JSON
  // array streamed in pieces, which is harder to parse incrementally.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent` +
    `?alt=sse&key=${apiKey}`;

  // Body schema matches the existing grader.ts call so we're using the same
  // contract Gemini expects elsewhere in the app.
  const payload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };
  if (systemPrompt.trim()) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Gemini error ${upstream.status}: ${errText.slice(0, 400)}` }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  // Parse SSE chunks, pull the text deltas out of each candidate, and write
  // them as plain text to the client. This means the client just reads the
  // body as a UTF-8 stream — no SSE parsing on the frontend.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // Flush any trailing event in the buffer.
          if (buffer.trim()) flushEvent(buffer, controller, encoder);
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        // SSE events are separated by a blank line (\n\n). Split on that
        // and keep the trailing partial event in the buffer for next pull.
        let sepIdx = buffer.indexOf("\n\n");
        while (sepIdx !== -1) {
          const eventBlock = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          flushEvent(eventBlock, controller, encoder);
          sepIdx = buffer.indexOf("\n\n");
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}

/**
 * Parse a single SSE event block (one or more `data: ...` lines) and write
 * any extracted text deltas to the response stream. Silent on malformed JSON
 * so a single bad chunk doesn't kill the whole stream.
 */
function flushEvent(block: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  for (const line of block.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const json = line.slice(5).trim();
    if (!json || json === "[DONE]") continue;
    try {
      const parsed = JSON.parse(json);
      const parts = parsed?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (typeof part?.text === "string" && part.text.length > 0) {
            controller.enqueue(encoder.encode(part.text));
          }
        }
      }
    } catch {
      // Skip malformed event chunks; Gemini occasionally sends keep-alive
      // pings or partial JSON across packet boundaries.
    }
  }
}
