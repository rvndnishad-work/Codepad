/**
 * Generate per-framework machine-coding tutorials with Gemini Flash.
 *
 * For each machine-coding question (that lacks frameworksData) and each target
 * framework, asks Gemini for { answer (markdown tutorial), files (runnable
 * multi-file solution) } and saves it to prisma/data/generated/mc/<slug>.json.
 * Resumable (skips frameworks already generated). Paced for the free tier.
 *
 *   GEMINI_API_KEY=... npx tsx prisma/generate-mc-answers.ts [--limit N] [--fw react,vue]
 *   (key is also read from .env via dotenv)
 *
 * Then review with:  npx tsx prisma/validate-mc-generated.ts
 * And load with:     npx tsx prisma/seed-mc-generated.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const MODEL = process.env.AI_INTERVIEW_GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const OUT_DIR = join(process.cwd(), "prisma", "data", "generated", "mc");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Backend: "local" = an OpenAI-compatible server (e.g. LM Studio / llama.cpp at
// http://127.0.0.1:1234); else Gemini. Local has no quota so we barely pace it.
const BACKEND: "local" | "gemini" =
  (process.env.LLM_BACKEND as "local" | "gemini") || (process.env.LOCAL_LLM_URL ? "local" : "gemini");
const LOCAL_URL = process.env.LOCAL_LLM_URL || "http://127.0.0.1:1234";
const LOCAL_MODEL =
  process.env.LOCAL_LLM_MODEL || "gemma-4-12b-coder-fable5-composer2.5-v1@q8_0";
const PACE_MS = BACKEND === "local" ? 300 : 7000;

const ALL_FW = ["react", "vue", "angular"] as const;
type Fw = (typeof ALL_FW)[number];
type Bundle = { answer: string; files: Record<string, string> };

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const fwArg = args.find((a) => a.startsWith("--fw="));
const TARGET_FW: Fw[] = fwArg
  ? (fwArg.split("=")[1].split(",").filter((f) => ALL_FW.includes(f as Fw)) as Fw[])
  : [...ALL_FW];

const FW_RULES: Record<Fw, string> = {
  react: `Framework: React 18 (function components + hooks).
"files" MUST contain EXACTLY these two paths:
- "/App.js": a default-exported App component that imports the widget from './src/<Name>' and renders a small interactive demo (heading + the widget + a line showing current state).
- "/src/<Name>.js": the widget, default-exported.
Use ONLY 'react' imports. Inline styles only (no CSS files).`,
  vue: `Framework: Vue 3 with <script setup>.
"files" MUST contain EXACTLY these two paths:
- "/src/App.vue": imports the widget from './components/<Name>.vue' and renders a demo.
- "/src/components/<Name>.vue": the widget. Scoped <style> is allowed.
No external packages beyond 'vue'.`,
  angular: `Framework: Angular with the classic NgModule setup (NOT standalone).
"files" MUST contain EXACTLY ONE path:
- "/src/app/app.component.ts": a single @Component (selector: 'app-root') with an INLINE template (backticks) that contains BOTH the demo and the widget markup, plus the component class.
Use *ngFor, [prop] bindings and (event) handlers. Do NOT use ngModel/FormsModule, standalone components, signals, or inject().
CRITICAL: do NOT use optional chaining (?.) or nullish coalescing (??) ANYWHERE — the build rejects them; use explicit if-checks instead.
Inline styles via style="..." attributes.`,
};

function buildPrompt(fw: Fw, title: string, description: string): string {
  return `You are writing an interview-prep TUTORIAL for a frontend machine-coding task, implemented in ${fw.toUpperCase()}.

TASK: "${title}"
${description ? `Context: ${description}` : ""}

Return STRICT JSON (no markdown fences around it, no commentary) with EXACTLY two keys:

1. "answer": a step-by-step markdown tutorial that teaches how to build this in ${fw}. Structure:
   - A short "mental model" paragraph (the key idea).
   - 3 to 6 numbered "### Step N — ..." sections, each with a 1-2 sentence explanation and a SMALL fenced code snippet (use triple-backtick fences with a language tag).
   - A brief edge-cases note (a short markdown table or bullets).
   - End with a line starting "**Interview tip:**".
   Keep it focused and accurate.

2. "files": an object mapping file paths to COMPLETE source code that RUNS AS-IS in a Sandpack ${fw} template.

${FW_RULES[fw]}

GENERAL RULES (all frameworks):
- Implement the REAL behavior fully (not a stub or TODO).
- Fully self-contained: NO extra npm dependencies.
- For digit/character checks use [0-9] / [^0-9], never \\d / \\D.
- Keep the demo small and clear; the widget should visibly work.

Return ONLY the JSON object.`;
}

async function fetchGeminiText(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  return text;
}

async function fetchLocalText(prompt: string): Promise<string> {
  // OpenAI-compatible chat endpoint (LM Studio / llama.cpp). Long timeout since
  // local inference can be slow; ask plainly for JSON (parsed below).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 600000);
  try {
    const res = await fetch(`${LOCAL_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: LOCAL_MODEL,
        messages: [
          { role: "system", content: "You are a precise code generator. Output ONLY a single valid JSON object." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 6144,
        // Grammar-constrained JSON: guarantees valid escaping (local models
        // otherwise emit unescaped backslashes/newlines in code strings).
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "bundle",
            strict: true,
            schema: {
              type: "object",
              properties: {
                answer: { type: "string" },
                files: { type: "object", additionalProperties: { type: "string" } },
              },
              required: ["answer", "files"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Local HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function parseBundle(text: string): Bundle {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    // Strip accidental ``` fences / take the outermost {...} block, then retry.
    const stripped = text.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
    const s = stripped.indexOf("{");
    const e = stripped.lastIndexOf("}");
    obj = JSON.parse(s >= 0 && e > s ? stripped.slice(s, e + 1) : stripped);
  }
  const o = obj as Record<string, unknown>;
  if (!o || typeof o.answer !== "string" || typeof o.files !== "object" || !o.files) {
    throw new Error("bad shape (need answer + files)");
  }
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.files as Record<string, unknown>)) {
    if (typeof v === "string") files[k] = v;
  }
  return { answer: o.answer as string, files };
}

async function callModel(prompt: string): Promise<Bundle> {
  const text = BACKEND === "local" ? await fetchLocalText(prompt) : await fetchGeminiText(prompt);
  return parseBundle(text);
}

/** Lightweight static checks; returns issues (empty = clean). */
function lint(fw: Fw, b: Bundle): string[] {
  const issues: string[] = [];
  if (!b.answer || b.answer.length < 120) issues.push("answer too short");
  if (!/```/.test(b.answer)) issues.push("answer has no code fence");
  const paths = Object.keys(b.files);
  if (fw === "react" && !paths.some((p) => p === "/App.js")) issues.push("missing /App.js");
  if (fw === "vue" && !paths.some((p) => p === "/src/App.vue")) issues.push("missing /src/App.vue");
  if (fw === "angular") {
    if (!paths.some((p) => p === "/src/app/app.component.ts")) issues.push("missing app.component.ts");
    const code = Object.values(b.files).join("\n");
    if (/\?\./.test(code)) issues.push("angular uses optional chaining (?.)");
    if (/\?\?/.test(code)) issues.push("angular uses nullish coalescing (??)");
  }
  if (Object.values(b.files).some((c) => c.trim().length < 40)) issues.push("a file looks empty");
  return issues;
}

async function main() {
  console.log(`Backend: ${BACKEND}${BACKEND === "local" ? ` (${LOCAL_URL}, ${LOCAL_MODEL})` : ` (${MODEL})`}`);
  if (BACKEND === "gemini" && !API_KEY) {
    console.error("Missing GEMINI_API_KEY / GOOGLE_API_KEY (checked env + .env)");
    process.exit(1);
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const questions = await prisma.prepQuestion.findMany({
    where: { technology: "machine-coding", status: "published" },
    select: { slug: true, title: true, description: true },
    orderBy: { difficulty: "asc" },
  });
  // Slugs that already have frameworksData (hand-authored like OTP/Star Rating
  // have it but NO generated file → skip those; generated ones DO have a file).
  const haveFw = new Set(
    (
      await prisma.prepQuestion.findMany({
        where: { technology: "machine-coding", NOT: { frameworksData: null } },
        select: { slug: true },
      })
    ).map((r) => r.slug),
  );

  let processed = 0;
  let rateLimited = 0;

  for (const q of questions) {
    if (processed >= LIMIT) break;
    const file = join(OUT_DIR, `${q.slug}.json`);
    const hasGenFile = existsSync(file);
    // Hand-authored (has frameworksData but no generator file) → leave alone.
    if (!hasGenFile && haveFw.has(q.slug)) continue;

    const bundle: Partial<Record<Fw, Bundle>> = hasGenFile
      ? JSON.parse(readFileSync(file, "utf8"))
      : {};

    const missing = TARGET_FW.filter((fw) => !bundle[fw]);
    if (missing.length === 0) continue;

    for (const fw of missing) {
      // Retry transient errors (503 overload, malformed-JSON / control-char
      // responses) a few times; 429 is rate-limit and waits longer.
      const MAX_TRIES = 4;
      for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
        try {
          const b = await callModel(buildPrompt(fw, q.title, q.description ?? ""));
          const issues = lint(fw, b);
          bundle[fw] = b;
          writeFileSync(file, JSON.stringify(bundle, null, 2));
          console.log(
            `[${q.slug}] ${fw}: ok (${Object.keys(b.files).length} files)` +
              (issues.length ? `  ⚠ ${issues.join(", ")}` : ""),
          );
          rateLimited = 0;
          break;
        } catch (e) {
          const msg = (e as Error).message;
          if (msg.includes("429")) {
            rateLimited++;
            console.warn(`[${q.slug}] ${fw}: rate-limited (${rateLimited}); waiting 35s`);
            await sleep(35000);
            if (rateLimited >= 10) {
              console.error("Too many rate limits; stopping. Re-run later (resumable).");
              await prisma.$disconnect();
              process.exit(0);
            }
            attempt--; // 429 doesn't count against the retry budget
            continue;
          }
          if (attempt < MAX_TRIES) {
            console.warn(`[${q.slug}] ${fw}: ${msg.slice(0, 70)} — retry ${attempt}/${MAX_TRIES - 1} in 8s`);
            await sleep(8000);
            continue;
          }
          console.warn(`[${q.slug}] ${fw}: gave up after ${MAX_TRIES} tries (${msg.slice(0, 60)})`);
        }
      }
      await sleep(PACE_MS); // free-tier RPM cap (negligible for local)
    }
    processed++;
  }

  console.log(`\nDone. Processed ${processed} question(s). Review prisma/data/generated/mc/.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
