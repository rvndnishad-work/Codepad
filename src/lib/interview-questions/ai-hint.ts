import { AI_INTERVIEW_TOGETHER_MODEL } from "@/lib/ai-interview/scaffolds";

/**
 * Generate a SHORT, non-spoiler hint for an interview question using the same
 * LLM setup the rest of the app uses (GLM_API_KEY / TOGETHER_API_KEY -> zai-org/GLM-5.3-Flash,
 * fallback to GEMINI_API_KEY). Returns null when no key is configured or the call fails.
 */
export async function generateHint(input: {
  title: string;
  description?: string | null;
}): Promise<string | null> {
  const glmKey = process.env.GLM_API_KEY || process.env.TOGETHER_API_KEY || null;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  const apiKey = glmKey || geminiKey;
  if (!apiKey) return null;
  const useTogether = !!glmKey;

  const url = useTogether
    ? `${process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1"}/chat/completions`
    : `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_TOGETHER_MODEL}:generateContent?key=${apiKey}`;
  const prompt = `You are a friendly technical interview coach. Give a SHORT hint (2-3 sentences, at most ~60 words) that nudges a candidate toward the right APPROACH for the interview question below.
Rules:
- Do NOT reveal the full solution, final answer, or code.
- Point at the technique, data structure, or angle to consider.
- Be concrete and encouraging.

Question: ${input.title}
${input.description ? `Details: ${input.description}` : ""}

Return only the hint text — no preamble, no headings.`;

  try {
    if (useTogether) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: AI_INTERVIEW_TOGETHER_MODEL,
          messages: [
            { role: "system", content: "You are a friendly technical interview coach." },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 256,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === "string" && text.trim() ? text.trim() : null;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
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
