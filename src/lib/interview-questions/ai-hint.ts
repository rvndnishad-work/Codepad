import { AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/scaffolds";

/**
 * Generate a SHORT, non-spoiler hint for an interview question using the same
 * Gemini setup the rest of the app uses (GEMINI_API_KEY / GOOGLE_API_KEY).
 * Returns null when no key is configured or the call fails — callers degrade
 * gracefully. Result is meant to be cached on the question row.
 */
export async function generateHint(input: {
  title: string;
  description?: string | null;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const prompt = `You are a friendly technical interview coach. Give a SHORT hint (2-3 sentences, at most ~60 words) that nudges a candidate toward the right APPROACH for the interview question below.
Rules:
- Do NOT reveal the full solution, final answer, or code.
- Point at the technique, data structure, or angle to consider.
- Be concrete and encouraging.

Question: ${input.title}
${input.description ? `Details: ${input.description}` : ""}

Return only the hint text — no preamble, no headings.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          // gemini-2.5-flash spends "thinking" tokens from the output budget;
          // disable thinking for this short task and give the hint room.
          maxOutputTokens: 256,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
