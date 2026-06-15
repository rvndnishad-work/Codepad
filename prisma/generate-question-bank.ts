/**
 * Generate a bank of ~100 commonly-asked interview questions per technology
 * using Gemini (the project's existing LLM), and write them to
 * `prisma/data/question-bank.json` for seeding.
 *
 * Resumable + incremental: re-running tops up any technology below the target
 * and saves after each batch, so an interruption never loses progress.
 *
 *   GEMINI_API_KEY=... npx tsx prisma/generate-question-bank.ts [target]
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const MODEL = process.env.AI_INTERVIEW_GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const TARGET = parseInt(process.argv[2] || "100", 10);
const BATCH = 20;
const OUT_DIR = join(process.cwd(), "prisma", "data");
const OUT_FILE = join(OUT_DIR, "question-bank.json");

const TECHS: { slug: string; label: string; round: string }[] = [
  { slug: "reactjs", label: "React.js", round: "Frontend" },
  { slug: "nodejs", label: "Node.js", round: "DSA" },
  { slug: "javascript", label: "JavaScript", round: "Frontend" },
  { slug: "angular", label: "Angular", round: "Frontend" },
  { slug: "vuejs", label: "Vue.js", round: "Frontend" },
  { slug: "typescript", label: "TypeScript", round: "Frontend" },
  { slug: "dsa", label: "Data Structures & Algorithms", round: "DSA" },
  { slug: "system-design", label: "System Design", round: "System Design" },
  { slug: "python", label: "Python", round: "DSA" },
  { slug: "sql", label: "SQL", round: "DSA" },
];

type Q = {
  title: string;
  description: string;
  answer: string;
  difficulty: string;
  round: string;
  tags: string[];
  technology: string;
};

type Bank = Record<string, Q[]>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function load(): Bank {
  if (existsSync(OUT_FILE)) {
    try {
      return JSON.parse(readFileSync(OUT_FILE, "utf8"));
    } catch {
      /* start fresh */
    }
  }
  return {};
}

function save(bank: Bank) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(bank, null, 2));
}

async function generateBatch(
  tech: { slug: string; label: string; round: string },
  n: number,
  avoid: string[],
): Promise<Q[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const avoidSample = avoid.slice(-70).join("; ");
  const prompt = `You are compiling a bank of the MOST COMMONLY ASKED ${tech.label} technical interview questions.
Generate ${n} DISTINCT, genuinely common ${tech.label} interview questions a candidate would realistically be asked.

For each, output an object with exactly:
- "title": the question as asked (concise, no numbering)
- "description": 1-2 sentence elaboration/context
- "answer": a correct, concise markdown answer (3-6 sentences; include a short code snippet only if essential)
- "difficulty": one of "easy" | "medium" | "hard"
- "round": one of "Phone Screen" | "DSA" | "Frontend" | "System Design" | "Low-Level Design" | "Behavioural" | "HR" (pick the best fit)
- "tags": array of 2-4 short lowercase tags

Spread across difficulty levels and subtopics. Keep answers accurate and beginner-friendly.
Do NOT repeat any of these already-used questions: ${avoidSample || "(none yet)"}.

Return STRICT JSON: a single array of ${n} objects. No markdown fences, no commentary.`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  let arr: unknown;
  try {
    arr = JSON.parse(text);
  } catch {
    // Strip accidental fences then retry once.
    arr = JSON.parse(text.replace(/^```json/i, "").replace(/```$/i, "").trim());
  }
  if (!Array.isArray(arr)) throw new Error("not an array");
  return (arr as Record<string, unknown>[])
    .filter((o) => o && typeof o.title === "string" && (o.title as string).trim())
    .map((o) => ({
      title: String(o.title).trim(),
      description: o.description ? String(o.description).trim() : "",
      answer: o.answer ? String(o.answer).trim() : "",
      difficulty: ["easy", "medium", "hard"].includes(String(o.difficulty)) ? String(o.difficulty) : "medium",
      round: typeof o.round === "string" && o.round ? String(o.round) : tech.round,
      tags: Array.isArray(o.tags) ? (o.tags as unknown[]).map(String).slice(0, 4) : [],
      technology: tech.slug,
    }));
}

async function main() {
  if (!API_KEY) {
    console.error("Missing GEMINI_API_KEY / GOOGLE_API_KEY");
    process.exit(1);
  }
  const bank = load();

  for (const tech of TECHS) {
    const list = bank[tech.slug] ?? [];
    const seen = new Set(list.map((q) => norm(q.title)));
    let attempts = 0;
    let rateLimited = 0;
    const maxAttempts = 14;

    while (list.length < TARGET && attempts < maxAttempts && rateLimited < 12) {
      const need = Math.min(BATCH, TARGET - list.length + 5);
      let batch: Q[];
      try {
        batch = await generateBatch(tech, need, list.map((q) => q.title));
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("429")) {
          rateLimited++;
          console.warn(`[${tech.slug}] rate-limited (${rateLimited}); waiting 35s`);
          await sleep(35000);
          continue;
        }
        attempts++;
        console.warn(`[${tech.slug}] batch failed: ${msg.slice(0, 80)}; backing off`);
        await sleep(5000);
        continue;
      }
      rateLimited = 0;
      attempts++;
      let added = 0;
      for (const q of batch) {
        const key = norm(q.title);
        if (key.length < 4 || seen.has(key)) continue;
        seen.add(key);
        list.push(q);
        added++;
        if (list.length >= TARGET) break;
      }
      bank[tech.slug] = list;
      save(bank);
      console.log(`[${tech.slug}] +${added} -> ${list.length}/${TARGET} (attempt ${attempts})`);
      // Stay under the free-tier RPM cap.
      await sleep(7000);
    }
    console.log(`[${tech.slug}] done: ${list.length} questions`);
  }

  const total = Object.values(bank).reduce((s, l) => s + l.length, 0);
  console.log(`\nTotal: ${total} questions across ${Object.keys(bank).length} technologies`);
  console.log(`Written to ${OUT_FILE}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
