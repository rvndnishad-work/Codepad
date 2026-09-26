/**
 * Private question variants, server side: load the public original, ask the
 * model for a rewrite, run the rewrite's tests, and save it for one workspace.
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { callGemini, extractText, geminiApiKey } from "@/lib/ai-interview/gemini";
import { executeBatch } from "@/lib/judge/run";
import { hasHarness } from "@/lib/judge/harness";
import { runUnitJs } from "@/lib/judge/unit-js";
import { compareValues, type CompareMode, type Contract } from "@/lib/judge/types";
import { PistonUnavailableError } from "@/lib/piston";
import {
  bankVariantPrompt,
  cleanBankDraft,
  cleanFrontendDraft,
  cleanHarnessDraft,
  cleanUnitDraft,
  extractJsonObject,
  frontendVariantPrompt,
  harnessVariantPrompt,
  parseContract,
  pickReferenceLanguage,
  unitVariantPrompt,
  variantSlug,
  VariantShapeError,
  type ChallengeDraft,
  type VariantCheck,
  type VariantDraft,
} from "./variants";

export class VariantError extends Error {}

/** Variants need an AI key; without one the page shows a not-configured state. */
export function variantsConfigured(): boolean {
  return !!geminiApiKey();
}

export type OriginKind = "bank" | "challenge";

type BankOrigin = { kind: "bank"; id: string; slug: string; title: string; answer: string | null; technology: string | null; difficulty: string };

type StepInfo = {
  judgingMode: string;
  template: string;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
  functionName: string | null;
  signatureJson: string | null;
  languagesJson: string | null;
  starterCodeJson: string | null;
  contract: Contract | null;
  languages: string[];
  references: Record<string, string>;
  harnessTests: { argsJson: string; compare?: CompareMode }[];
  estimatedMinutes: number;
};

type ChallengeOrigin = {
  kind: "challenge";
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  category: string | null;
  tags: string | null;
  estimatedMinutes: number;
  /** Null when the challenge has several steps (not supported yet). */
  step: StepInfo | null;
};

export type VariantOrigin = BankOrigin | ChallengeOrigin;

function json<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return (JSON.parse(s) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/** The public original, or null when it is not public (team challenges, drafts). */
export async function loadOrigin(kind: OriginKind, id: string): Promise<VariantOrigin | null> {
  if (kind === "bank") {
    const q = await prisma.prepQuestion.findFirst({
      where: { id, status: "published" },
      select: { id: true, slug: true, title: true, answer: true, technology: true, difficulty: true },
    });
    return q ? { kind: "bank", ...q } : null;
  }
  const c = await prisma.challenge.findFirst({
    where: { id, published: true, workspaceId: null },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      difficulty: true,
      category: true,
      tags: true,
      estimatedMinutes: true,
      steps: { orderBy: { position: "asc" }, take: 2 },
    },
  });
  if (!c) return null;
  const s = c.steps.length === 1 ? c.steps[0] : null;
  return {
    kind: "challenge",
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: s?.description?.trim() || c.description,
    difficulty: c.difficulty,
    category: c.category,
    tags: c.tags,
    estimatedMinutes: c.estimatedMinutes,
    step: s
      ? {
          judgingMode: s.judgingMode,
          template: s.template,
          starterFiles: json<Record<string, string>>(s.starterFiles, {}),
          testFiles: json<Record<string, string>>(s.testFiles, {}),
          functionName: s.functionName,
          signatureJson: s.signatureJson,
          languagesJson: s.languagesJson,
          starterCodeJson: s.starterCodeJson,
          contract: parseContract(s.functionName, s.signatureJson),
          languages: json<string[]>(s.languagesJson, []),
          references: json<Record<string, string>>(s.referenceSolutionsJson, {}),
          harnessTests: json<{ argsJson: string; compare?: CompareMode }[]>(s.harnessTestsJson, []),
          estimatedMinutes: s.estimatedMinutes,
        }
      : null,
  };
}

/** How a challenge's variant is written and checked. */
export function challengeMode(o: ChallengeOrigin): { mode: "harness" | "unit-js" | "frontend"; language?: string } {
  const s = o.step;
  if (!s) throw new VariantError("Variants work on one-step challenges for now.");
  if (s.judgingMode === "harness") {
    const language = s.contract ? pickReferenceLanguage(s.languages, s.references, hasHarness) : null;
    if (!s.contract || !language) throw new VariantError("This challenge has no usable test setup, so a variant cannot be checked.");
    return { mode: "harness", language };
  }
  if (s.judgingMode === "unit-js") {
    if (!Object.keys(s.testFiles).length || !Object.keys(s.starterFiles).length) throw new VariantError("This challenge has no tests to rewrite.");
    return { mode: "unit-js" };
  }
  return { mode: "frontend" };
}

async function askModel(prompt: string, maxOutputTokens: number): Promise<unknown> {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new VariantError("AI is not set up on this server.");
  let last: unknown = null;
  // One retry: models sometimes return truncated or chatty JSON.
  for (let i = 0; i < 2; i++) {
    try {
      const res = await callGemini({
        apiKey,
        systemInstruction: "You write interview questions for hiring teams. Output valid JSON only.",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        temperature: 0.8,
        maxOutputTokens,
      });
      return extractJsonObject(extractText(res.parts));
    } catch (err) {
      last = err;
      if (!(err instanceof VariantShapeError)) break;
    }
  }
  console.warn("[variants] model call failed:", last instanceof Error ? last.message : last);
  throw new VariantError("The AI did not return a usable variant. Try again.");
}

/** Ask the model for a variant draft. The draft is not saved. */
export async function generateDraft(o: VariantOrigin): Promise<VariantDraft> {
  try {
    if (o.kind === "bank") return cleanBankDraft(await askModel(bankVariantPrompt(o), 2500));
    const { mode, language } = challengeMode(o);
    const s = o.step!;
    if (mode === "harness") {
      const raw = await askModel(
        harnessVariantPrompt({
          title: o.title,
          description: o.description,
          difficulty: o.difficulty,
          contract: s.contract!,
          language: language!,
          reference: s.references[language!] ?? null,
          sampleArgs: s.harnessTests.map((t) => t.argsJson),
        }),
        6000,
      );
      return cleanHarnessDraft(raw, s.contract!, language!);
    }
    if (mode === "unit-js") {
      const raw = await askModel(unitVariantPrompt({ title: o.title, description: o.description, difficulty: o.difficulty, starterFiles: s.starterFiles, testFiles: s.testFiles }), 8000);
      return cleanUnitDraft(raw, { starterFiles: s.starterFiles, testFiles: s.testFiles });
    }
    return cleanFrontendDraft(await askModel(frontendVariantPrompt(o), 2500));
  } catch (err) {
    if (err instanceof VariantShapeError) throw new VariantError(`The AI variant was incomplete (${err.message.replace(/\.$/, "").toLowerCase()}). Try again.`);
    throw err;
  }
}

export type CheckOutcome = { check: VariantCheck; expectedRaw?: string[] };

/** Run the draft's tests against its reference answer. Questions without tests report "none". */
export async function checkDraft(o: VariantOrigin, d: VariantDraft): Promise<CheckOutcome> {
  if (d.kind === "bank" || d.mode === "frontend") return { check: { status: "none" } };
  try {
    if (d.mode === "harness") {
      const s = (o as ChallengeOrigin).step!;
      const contract = s.contract!;
      const compare = s.harnessTests[0]?.compare ?? "exact";
      const out = await executeBatch(d.language, d.reference, contract, d.tests.map((t) => t.args));
      const total = d.tests.length;
      if (out.compileError) return { check: { status: "failed", passed: 0, total, detail: "The reference solution did not compile." } };
      let passed = 0;
      let firstFail: string | null = null;
      out.outputs.forEach((r, i) => {
        let ok = false;
        if (!r.error && "value" in r) {
          try {
            ok = compareValues(d.tests[i].expected, r.value, contract.returnType, compare);
          } catch {
            ok = false;
          }
        }
        if (ok) passed++;
        else firstFail ??= `${d.tests[i].name}: expected ${JSON.stringify(d.tests[i].expected)}, the reference gave ${r.error ?? r.raw ?? "nothing"}`;
      });
      if (passed < total) return { check: { status: "failed", passed, total, detail: (firstFail ?? "A test failed.").slice(0, 300) } };
      return { check: { status: "passed", passed, total }, expectedRaw: out.outputs.map((r) => r.raw as string) };
    }
    const isTs = [...Object.keys(d.solutionFiles), ...Object.keys(d.testFiles)].some((p) => /\.tsx?$/.test(p));
    const r = await runUnitJs({ sourceFiles: d.solutionFiles, testFiles: d.testFiles, language: isTs ? "typescript" : "javascript" });
    if (r.compileError) return { check: { status: "failed", passed: 0, total: r.total, detail: "The reference solution did not compile." } };
    if (!r.total) return { check: { status: "failed", passed: 0, total: 0, detail: r.stderr?.slice(0, 300) || "No tests ran." } };
    const fail = r.results.find((t) => t.status !== "pass");
    if (fail) return { check: { status: "failed", passed: r.passed, total: r.total, detail: `${fail.name}${fail.error ? `: ${fail.error}` : ""}`.slice(0, 300) } };
    return { check: { status: "passed", passed: r.passed, total: r.total } };
  } catch (err) {
    if (err instanceof PistonUnavailableError) throw new VariantError("The code runner is not reachable right now, so the tests could not be run. Try again in a minute.");
    throw err;
  }
}

/** Save a checked draft as a workspace-private question. Coding variants get their own private challenge. */
export async function saveVariant(p: { workspaceId: string; userId: string; origin: VariantOrigin; draft: VariantDraft; outcome: CheckOutcome }): Promise<{ id: string; challengeId: string | null }> {
  const { origin, draft, outcome } = p;
  if (outcome.check.status === "failed") throw new VariantError("The tests did not pass, so the variant was not saved.");
  const passed = outcome.check.status === "passed" ? outcome.check : null;
  const base = {
    workspaceId: p.workspaceId,
    originKind: origin.kind,
    originQuestionId: origin.id,
    title: draft.title,
    prompt: draft.prompt,
    checkStatus: passed ? "passed" : "none",
    testsPassed: passed?.passed ?? null,
    testsTotal: passed?.total ?? null,
    createdByUserId: p.userId,
  };
  if (draft.kind === "bank") {
    const row = await prisma.questionVariant.create({ data: { ...base, answer: draft.answer }, select: { id: true } });
    return { id: row.id, challengeId: null };
  }
  const o = origin as ChallengeOrigin;
  const s = o.step!;
  const stepData = challengeStepData(s, draft, outcome);
  return prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.create({
      data: {
        slug: variantSlug(o.slug),
        title: draft.title,
        description: draft.prompt,
        difficulty: o.difficulty,
        tags: o.tags,
        category: o.category,
        published: true,
        visibility: "private",
        authorId: p.userId,
        workspaceId: p.workspaceId,
        template: s.template,
        starterFiles: JSON.stringify(stepData.starterFiles),
        testFiles: JSON.stringify(stepData.testFiles),
        estimatedMinutes: o.estimatedMinutes,
      },
      select: { id: true },
    });
    await tx.challengeStep.create({
      data: {
        challengeId: challenge.id,
        position: 0,
        description: draft.prompt,
        template: s.template,
        starterFiles: JSON.stringify(stepData.starterFiles),
        testFiles: JSON.stringify(stepData.testFiles),
        estimatedMinutes: s.estimatedMinutes,
        judgingMode: s.judgingMode,
        functionName: s.functionName,
        signatureJson: s.signatureJson,
        languagesJson: s.languagesJson,
        starterCodeJson: s.starterCodeJson,
        referenceSolutionsJson: stepData.references,
        harnessTestsJson: stepData.harnessTests,
      },
    });
    const row = await tx.questionVariant.create({ data: { ...base, answer: stepData.answer, challengeId: challenge.id }, select: { id: true } });
    return { id: row.id, challengeId: challenge.id };
  });
}

function challengeStepData(s: StepInfo, d: ChallengeDraft, outcome: CheckOutcome) {
  if (d.mode === "harness") {
    const compare = s.harnessTests[0]?.compare;
    const raw = outcome.expectedRaw ?? [];
    // First two cases are samples the candidate sees; the rest stay hidden.
    const harnessTests = d.tests.map((t, i) => ({
      id: `v${i + 1}`,
      name: t.name,
      argsJson: JSON.stringify(t.args),
      expectedJson: raw[i] ?? JSON.stringify(t.expected),
      isHidden: i >= 2,
      weight: 1,
      ...(compare ? { compare } : {}),
    }));
    return {
      starterFiles: s.starterFiles,
      testFiles: s.testFiles,
      references: JSON.stringify({ [d.language]: d.reference }),
      harnessTests: JSON.stringify(harnessTests),
      answer: d.reference,
    };
  }
  if (d.mode === "unit-js") {
    return {
      starterFiles: d.starterFiles,
      testFiles: d.testFiles,
      references: null,
      harnessTests: "[]",
      answer: Object.entries(d.solutionFiles)
        .map(([path, code]) => `// ${path}\n${code}`)
        .join("\n\n"),
    };
  }
  return { starterFiles: s.starterFiles, testFiles: s.testFiles, references: null, harnessTests: "[]", answer: null };
}
