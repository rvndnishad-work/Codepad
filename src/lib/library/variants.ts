/**
 * Private question variants: prompts for the model and the checks that turn
 * its reply into a draft we can test and save. Pure, so it can be unit tested;
 * the model call, test runs and writes live in variants-server.ts.
 */
import { MAX_ANSWER_CHARS, MAX_QUESTION_CHARS } from "@/lib/ai-interview/questionnaire";
import { isValidType, type Contract } from "@/lib/judge/types";

export type BankDraft = { kind: "bank"; title: string; prompt: string; answer: string };

export type HarnessCase = { name: string; args: unknown[]; expected: unknown };

export type ChallengeDraft =
  | { kind: "challenge"; mode: "harness"; title: string; prompt: string; language: string; reference: string; tests: HarnessCase[] }
  | {
      kind: "challenge";
      mode: "unit-js";
      title: string;
      prompt: string;
      starterFiles: Record<string, string>;
      testFiles: Record<string, string>;
      solutionFiles: Record<string, string>;
    }
  | { kind: "challenge"; mode: "frontend"; title: string; prompt: string };

export type VariantDraft = BankDraft | ChallengeDraft;

/** What running the tests found. "none" means the question has no tests. */
export type VariantCheck = { status: "passed"; passed: number; total: number } | { status: "failed"; passed: number; total: number; detail: string } | { status: "none" };

export const MAX_TITLE_CHARS = 120;
export const MAX_DESCRIPTION_CHARS = 8000;
export const MAX_CODE_CHARS = 32 * 1024;
export const MIN_CASES = 4;
export const MAX_CASES = 16;
const MAX_FILES = 12;

export class VariantShapeError extends Error {}

/** The first {...} block in a model reply, parsed. Handles code fences and chatter around it. */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new VariantShapeError("The reply had no JSON object.");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new VariantShapeError("The reply was not valid JSON.");
  }
}

const obj = (x: unknown): Record<string, unknown> => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {});

function text(x: unknown, field: string, max: number): string {
  if (typeof x !== "string" || !x.trim()) throw new VariantShapeError(`The ${field} is missing.`);
  const t = x.trim();
  if (t.length > max) throw new VariantShapeError(`The ${field} is too long.`);
  return t;
}

function fileMap(x: unknown, field: string, paths?: string[]): Record<string, string> {
  const o = obj(x);
  const entries = Object.entries(o).filter(([, v]) => typeof v === "string") as [string, string][];
  if (!entries.length) throw new VariantShapeError(`The ${field} are missing.`);
  if (entries.length > MAX_FILES) throw new VariantShapeError(`Too many ${field}.`);
  const out: Record<string, string> = {};
  for (const [k, v] of entries) {
    const path = k.startsWith("/") ? k : `/${k}`;
    if (!/^\/[\w./-]+$/.test(path) || path.includes("..")) throw new VariantShapeError(`Bad file path in the ${field}.`);
    if (v.length > MAX_CODE_CHARS) throw new VariantShapeError(`A file in the ${field} is too long.`);
    out[path] = v;
  }
  if (paths) {
    const missing = paths.filter((p) => !(p in out));
    if (missing.length) throw new VariantShapeError(`The ${field} must keep the file ${missing[0]}.`);
  }
  return out;
}

/* ── Bank questions ─────────────────────────────────────────────────────── */

export function bankVariantPrompt(q: { title: string; answer: string | null; technology: string | null; difficulty: string }): string {
  return `You write private interview questions for a hiring team. The question below is public, so a candidate could look up its answer. Write a variant that tests the same skill at the same difficulty (${q.difficulty}) but a candidate could not answer by searching for the original.

Rules:
- Change the setting and the concrete inputs: a different product, domain, numbers or constraints. Keep the underlying concept.
- The question is spoken to the candidate: one to three plain sentences, under ${MAX_QUESTION_CHARS} characters, no markdown.
- Write a fresh reference answer for the new question in markdown, under ${Math.min(MAX_ANSWER_CHARS, 3000)} characters: the key points a strong answer covers, in the terms of the new setting.
- Do not mention the original question.

Original question${q.technology ? ` (${q.technology})` : ""}: ${q.title}
${q.answer ? `Original reference answer (for the skill it tests):\n${q.answer.slice(0, 3000)}\n` : ""}
Reply with JSON only: {"title": "a short name for the new question, under 80 characters", "question": "...", "answer": "..."}`;
}

export function cleanBankDraft(raw: unknown): BankDraft {
  const o = obj(raw);
  const prompt = text(o.question, "question", MAX_QUESTION_CHARS);
  const answer = text(o.answer, "reference answer", MAX_ANSWER_CHARS);
  const title = typeof o.title === "string" && o.title.trim() ? o.title.trim().slice(0, 80) : prompt.slice(0, 80);
  return { kind: "bank", title, prompt, answer };
}

/* ── Coding challenges ──────────────────────────────────────────────────── */

export function harnessVariantPrompt(c: {
  title: string;
  description: string;
  difficulty: string;
  contract: Contract;
  language: string;
  reference: string | null;
  sampleArgs: string[];
}): string {
  const sig = `${c.contract.functionName}(${c.contract.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${c.contract.returnType}`;
  return `You write private coding challenges for a hiring team. The challenge below is public, so a candidate could look it up. Write a variant that tests the same skill at the same difficulty (${c.difficulty}).

Rules:
- Change the story and the inputs: a different product or domain, and different values or constraints. The candidate still implements exactly this function: ${sig}. Keep the function name, parameter types and return type.
- Write the new description in markdown, under 3000 characters, with one worked example.
- Write a correct reference solution in ${c.language} that defines only the function (no main, no input reading, no printing).
- Write ${MIN_CASES + 2} to ${MAX_CASES - 4} test cases. "args" is a JSON array with one value per parameter, in order. "expected" is the exact return value you get by working the case through by hand. Include edge cases.
- Do not mention the original challenge.

Original title: ${c.title}
Original description:
${c.description.slice(0, 3000)}
${c.reference ? `Original reference solution (${c.language}):\n${c.reference.slice(0, 4000)}\n` : ""}${c.sampleArgs.length ? `Original test inputs, for the format: ${c.sampleArgs.slice(0, 3).join(" | ")}\n` : ""}
Reply with JSON only: {"title": "...", "description": "...", "reference": "...", "tests": [{"name": "...", "args": [...], "expected": ...}]}`;
}

export function cleanHarnessDraft(raw: unknown, contract: Contract, language: string): ChallengeDraft {
  const o = obj(raw);
  const title = text(o.title, "title", MAX_TITLE_CHARS);
  const prompt = text(o.description, "description", MAX_DESCRIPTION_CHARS);
  const reference = text(o.reference, "reference solution", MAX_CODE_CHARS);
  if (!Array.isArray(o.tests)) throw new VariantShapeError("The test cases are missing.");
  const tests: HarnessCase[] = [];
  for (const [i, t] of o.tests.slice(0, MAX_CASES).entries()) {
    const c = obj(t);
    if (!Array.isArray(c.args) || c.args.length !== contract.params.length) {
      throw new VariantShapeError(`Test ${i + 1} needs ${contract.params.length} argument${contract.params.length === 1 ? "" : "s"}.`);
    }
    if (!("expected" in c) && contract.returnType !== "void") throw new VariantShapeError(`Test ${i + 1} has no expected value.`);
    const name = typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 120) : `Case ${i + 1}`;
    tests.push({ name, args: c.args, expected: c.expected ?? null });
  }
  if (tests.length < MIN_CASES) throw new VariantShapeError(`A variant needs at least ${MIN_CASES} test cases.`);
  return { kind: "challenge", mode: "harness", title, prompt, language, reference, tests };
}

export function unitVariantPrompt(c: {
  title: string;
  description: string;
  difficulty: string;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
}): string {
  const files = (m: Record<string, string>) =>
    Object.entries(m)
      .map(([p, v]) => `--- ${p}\n${v.slice(0, 4000)}`)
      .join("\n");
  return `You write private coding challenges for a hiring team. The challenge below is public, so a candidate could look it up. Write a variant that tests the same skill at the same difficulty (${c.difficulty}).

Rules:
- Change the story, names and inputs: a different product or domain, and different values or constraints. Keep the same kind of task.
- Keep exactly the same file paths: starter files ${Object.keys(c.starterFiles).join(", ")} and test files ${Object.keys(c.testFiles).join(", ")}. Keep exported names the tests import.
- Tests use the same Jest style as the originals (describe, test, expect) with single-line imports. Write at least ${MIN_CASES} tests.
- "solutionFiles" holds a complete, correct solution for every starter file path.
- Write the new description in markdown, under 3000 characters.
- Do not mention the original challenge.

Original title: ${c.title}
Original description:
${c.description.slice(0, 3000)}
Original starter files:
${files(c.starterFiles)}
Original test files:
${files(c.testFiles)}

Reply with JSON only: {"title": "...", "description": "...", "starterFiles": {"/path": "code"}, "testFiles": {"/path": "code"}, "solutionFiles": {"/path": "code"}}`;
}

export function cleanUnitDraft(raw: unknown, original: { starterFiles: Record<string, string>; testFiles: Record<string, string> }): ChallengeDraft {
  const o = obj(raw);
  const title = text(o.title, "title", MAX_TITLE_CHARS);
  const prompt = text(o.description, "description", MAX_DESCRIPTION_CHARS);
  const starterPaths = Object.keys(original.starterFiles);
  const starterFiles = fileMap(o.starterFiles, "starter files", starterPaths);
  const testFiles = fileMap(o.testFiles, "test files", Object.keys(original.testFiles));
  const solutionFiles = fileMap(o.solutionFiles, "solution files", starterPaths);
  return { kind: "challenge", mode: "unit-js", title, prompt, starterFiles, testFiles, solutionFiles };
}

export function frontendVariantPrompt(c: { title: string; description: string; difficulty: string }): string {
  return `You write private coding challenges for a hiring team. The challenge below is public, so a candidate could look it up. Rewrite it so it tests the same skill at the same difficulty (${c.difficulty}) with a different product, domain, data and constraints. The candidate builds it in the same starter project, so keep the same kind of UI and the same tools.

Write the new description in markdown, under 3000 characters. Do not mention the original challenge.

Original title: ${c.title}
Original description:
${c.description.slice(0, 3000)}

Reply with JSON only: {"title": "...", "description": "..."}`;
}

export function cleanFrontendDraft(raw: unknown): ChallengeDraft {
  const o = obj(raw);
  return { kind: "challenge", mode: "frontend", title: text(o.title, "title", MAX_TITLE_CHARS), prompt: text(o.description, "description", MAX_DESCRIPTION_CHARS) };
}

/** Re-check a draft that came back from the browser before testing and saving it. */
export function cleanClientDraft(raw: unknown, expected: { kind: "bank" } | { kind: "challenge"; mode: string; contract?: Contract | null; language?: string; original?: { starterFiles: Record<string, string>; testFiles: Record<string, string> } }): VariantDraft {
  const o = obj(raw);
  if (expected.kind === "bank") return cleanBankDraft({ title: o.title, question: o.prompt, answer: o.answer });
  if (o.mode !== expected.mode) throw new VariantShapeError("This variant does not match the challenge.");
  if (expected.mode === "harness") {
    if (!expected.contract || !expected.language || o.language !== expected.language) throw new VariantShapeError("This variant does not match the challenge.");
    return cleanHarnessDraft({ title: o.title, description: o.prompt, reference: o.reference, tests: o.tests }, expected.contract, expected.language);
  }
  if (expected.mode === "unit-js") {
    if (!expected.original) throw new VariantShapeError("This variant does not match the challenge.");
    return cleanUnitDraft({ title: o.title, description: o.prompt, starterFiles: o.starterFiles, testFiles: o.testFiles, solutionFiles: o.solutionFiles }, expected.original);
  }
  return cleanFrontendDraft({ title: o.title, description: o.prompt });
}

/** Parse a step's harness contract, or null when it is not a usable one. */
export function parseContract(functionName: string | null, signatureJson: string | null): Contract | null {
  if (!functionName || !signatureJson) return null;
  try {
    const s = JSON.parse(signatureJson) as { params?: { name: string; type: string }[]; returnType?: string };
    if (!Array.isArray(s.params) || typeof s.returnType !== "string") return null;
    if (!s.params.every((p) => p && typeof p.name === "string" && isValidType(p.type))) return null;
    if (s.returnType !== "void" && !isValidType(s.returnType)) return null;
    return { functionName, params: s.params as Contract["params"], returnType: s.returnType as Contract["returnType"] };
  } catch {
    return null;
  }
}

const PREFERRED_LANGUAGES = ["javascript", "node", "python", "typescript"];

/** The language to write the variant reference in: one with an existing reference, a friendly one, then any enabled one. */
export function pickReferenceLanguage(languages: string[], references: Record<string, string>, supported: (l: string) => boolean): string | null {
  const usable = languages.filter(supported);
  const withRef = usable.filter((l) => (references[l] ?? "").trim());
  return withRef.find((l) => PREFERRED_LANGUAGES.includes(l)) ?? withRef[0] ?? usable.find((l) => PREFERRED_LANGUAGES.includes(l)) ?? usable[0] ?? null;
}

/** "debounce-search" to "debounce-search-v-k3x9q2". */
export function variantSlug(base: string, rand: () => number = Math.random): string {
  const suffix = Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rand() * 36)]).join("");
  return `${base.slice(0, 60).replace(/-+$/, "")}-v-${suffix}`;
}
