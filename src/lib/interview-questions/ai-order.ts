import { AI_INTERVIEW_TOGETHER_MODEL } from "@/lib/ai-interview/scaffolds";

/**
 * Ask the app's LLM (same keys and model as the AI hint) for a teaching order
 * of one difficulty band of a topic: definitions and fundamentals first, then
 * questions that build on them, specialised or edge-case questions last.
 * Returns the slugs in suggested order, every input slug exactly once (the
 * model's omissions are appended in their current order), or null when no key
 * is configured or the call fails.
 */
export async function suggestTopicOrder(input: {
  topic: string;
  difficulty: string;
  questions: { slug: string; title: string }[];
}): Promise<string[] | null> {
  if (input.questions.length < 2) return input.questions.map((q) => q.slug);
  const glmKey = process.env.GLM_API_KEY || process.env.TOGETHER_API_KEY || null;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  const apiKey = glmKey || geminiKey;
  if (!apiKey) return null;
  const useTogether = !!glmKey;

  const list = input.questions.map((q, i) => `${i + 1}. [${q.slug}] ${q.title}`).join("\n");
  const prompt = `You are curating the "${input.difficulty}" section of a ${input.topic} interview-question study track. A learner reads these questions top to bottom, so they must be in teaching order.

Rules:
- "What is X" / definitions / the core mental model come first.
- Each question should only rely on ideas introduced by earlier questions.
- Group closely related questions next to each other.
- Narrow, specialised, comparison and edge-case questions come last.

Questions (slug in brackets):
${list}

Return ONLY a JSON array of the slugs in the new order, every slug exactly once, no commentary.`;

  const text = await complete(prompt, useTogether, apiKey);
  if (!text) return null;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const known = new Set(input.questions.map((q) => q.slug));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of parsed) {
    if (typeof v === "string" && known.has(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  for (const q of input.questions) if (!seen.has(q.slug)) out.push(q.slug);
  return out;
}

async function complete(prompt: string, useTogether: boolean, apiKey: string): Promise<string | null> {
  try {
    if (useTogether) {
      const res = await fetch(`${process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1"}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: AI_INTERVIEW_TOGETHER_MODEL,
          messages: [
            { role: "system", content: "You curate technical interview study tracks. Answer with JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === "string" ? text : null;
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_INTERVIEW_TOGETHER_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4000, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}
