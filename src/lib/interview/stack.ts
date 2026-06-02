/**
 * Tech-stack model + round classification for interview prep.
 *
 * A "tech stack" is what a candidate (or interviewer) wants to practice:
 * frontend framework(s), backend language(s) (+ optional non-executable
 * framework labels), and/or DSA language(s). Full-stack = picking both a
 * frontend and a backend side; the resulting session mixes round types.
 *
 * This module is PURE (no server-only imports) so the builder/cockpit (client)
 * and the API/page (server) share one classifier + curator. It derives a
 * round's paradigm/language/framework from data that already exists:
 *   - Challenges: judgingMode ("harness" = DSA), languagesJson, tags, category.
 *   - Playground templates: the catalog in src/lib/templates.ts (group/id).
 */

import { templates, type TemplateDef } from "@/lib/templates";

export type Paradigm = "frontend" | "backend" | "dsa";

/** A candidate/interviewer's selected practice stack. */
export type TechStack = {
  frontend?: { frameworks: string[] };
  /** Backend rounds are language-level (Piston). `frameworkLabels` are NOT
   *  executed — they only steer AI-interview questions + curation labels. */
  backend?: { languages: string[]; frameworkLabels?: string[] };
  dsa?: { languages: string[] };
};

/** Normalized classification of a single round (challenge or template). */
export type RoundMeta = {
  paradigm: Paradigm;
  /** Language ids relevant to the round (backend/dsa). Empty for frontend. */
  languages: string[];
  /** Frontend framework ids. Empty for backend/dsa. */
  frameworks: string[];
};

// ── Canonical catalogs ──────────────────────────────────────────────────────

/** Runnable frontend frameworks (Sandpack). `templateId` is the playground id. */
export const FRONTEND_FRAMEWORKS = [
  { id: "react", label: "React", templateId: "react" },
  { id: "vue", label: "Vue", templateId: "vue" },
  { id: "angular", label: "Angular", templateId: "angular" },
  { id: "svelte", label: "Svelte", templateId: "svelte" },
  { id: "solid", label: "SolidJS", templateId: "solid" },
] as const;

/** Runnable backend languages (Piston console). `judgeLang` is the harness/
 *  /api/execute language id; `templateId` is the console playground template. */
export const BACKEND_LANGUAGES = [
  { id: "node", label: "Node.js", templateId: "node", judgeLang: "javascript" },
  { id: "typescript", label: "TypeScript", templateId: "ts-node", judgeLang: "typescript" },
  { id: "python", label: "Python", templateId: "python", judgeLang: "python" },
  { id: "go", label: "Go", templateId: "go", judgeLang: "go" },
  { id: "java", label: "Java", templateId: "java", judgeLang: "java" },
  { id: "cpp", label: "C++", templateId: "cpp", judgeLang: "cpp" },
  { id: "rust", label: "Rust", templateId: "rust", judgeLang: "rust" },
] as const;

/** Languages offered for DSA (function-harness judge). */
export const DSA_LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "go",
  "java",
  "cpp",
  "rust",
] as const;

export const DSA_LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  java: "Java",
  cpp: "C++",
  rust: "Rust",
};

/** Non-executable backend framework labels (AI-interview + curation only). */
export const BACKEND_FRAMEWORK_LABELS: Record<string, string[]> = {
  node: ["Express", "NestJS", "Fastify"],
  typescript: ["NestJS", "Express"],
  python: ["Django", "Flask", "FastAPI"],
  java: ["Spring Boot"],
  go: ["Gin", "Echo", "Fiber"],
  cpp: [],
  rust: ["Actix", "Axum"],
};

const FRONTEND_FRAMEWORK_IDS = new Set(FRONTEND_FRAMEWORKS.map((f) => f.id));
const BACKEND_LANGUAGE_IDS = new Set(BACKEND_LANGUAGES.map((b) => b.id));
const DSA_LANGUAGE_SET = new Set<string>(DSA_LANGUAGES);

/** The synthetic PlaygroundOption id the builder uses for a catalog template. */
export function templatePlaygroundId(templateId: string): string {
  return `template:${templateId}`;
}

// ── Classification ──────────────────────────────────────────────────────────

/** Classify a challenge from its (already-parsed) fields. */
export function classifyChallenge(input: {
  judgingMode?: string | null;
  languages?: string[]; // parsed from languagesJson
  tags?: string[]; // parsed from Challenge.tags
  category?: string | null;
}): RoundMeta {
  const tags = (input.tags ?? []).map((t) => t.toLowerCase());
  const langs = (input.languages ?? []).map((l) => l.toLowerCase());
  const category = (input.category ?? "").toLowerCase();

  // DSA: harness judging, or explicitly tagged/categorized.
  if (input.judgingMode === "harness" || tags.includes("dsa") || category === "dsa") {
    const fromTags = [...DSA_LANGUAGE_SET].filter((l) => tags.includes(l));
    return { paradigm: "dsa", languages: langs.length ? langs : fromTags, frameworks: [] };
  }

  // Backend: tagged backend (language-level).
  if (tags.includes("backend") || category === "backend") {
    return {
      paradigm: "backend",
      languages: [...BACKEND_LANGUAGE_IDS].filter((id) => tags.includes(id)),
      frameworks: [],
    };
  }

  // Frontend: framework tags, else a generic frontend round (legacy unit-js).
  const frameworks = [...FRONTEND_FRAMEWORK_IDS].filter((id) => tags.includes(id));
  return { paradigm: "frontend", languages: [], frameworks };
}

/** Classify a playground template by its catalog id. */
export function classifyTemplate(templateId: string): RoundMeta {
  const def = templates.find((t) => t.id === templateId);
  return classifyTemplateDef(def, templateId);
}

function classifyTemplateDef(def: TemplateDef | undefined, templateId: string): RoundMeta {
  // Backend console languages.
  const backend = BACKEND_LANGUAGES.find((b) => b.templateId === templateId);
  if (backend || def?.group === "backend") {
    return { paradigm: "backend", languages: [backend?.id ?? templateId], frameworks: [] };
  }
  // Frontend frameworks (incl. the react-ecosystem variants → react).
  const fw = FRONTEND_FRAMEWORKS.find((f) => f.templateId === templateId);
  if (fw) return { paradigm: "frontend", languages: [], frameworks: [fw.id] };
  if (def?.group === "framework" || def?.group === "react-ecosystem") {
    return { paradigm: "frontend", languages: [], frameworks: ["react"] };
  }
  // Everything else (empty/core JS/TS) → frontend bucket by default.
  return { paradigm: "frontend", languages: [], frameworks: [] };
}

// ── Curation ────────────────────────────────────────────────────────────────

/** Lightweight option shapes the curator operates on (client-safe). */
export type CuratableChallenge = { id: string } & RoundMeta;
export type CuratableTemplate = { id: string } & RoundMeta; // id = catalog template id

export type CurationResult = {
  /** Challenge ids to include as rounds. */
  challengeIds: string[];
  /** Playground option ids (already `template:<id>`) to include as rounds. */
  playgroundIds: string[];
};

const hasIntersection = (a: string[], b: Set<string>) => a.some((x) => b.has(x));

/**
 * Pick the rounds that satisfy a chosen stack. Backend prefers catalog console
 * templates (always runnable) and also includes any matching backend
 * challenges. DSA matches harness challenges by language. Frontend matches
 * framework templates + framework-tagged challenges.
 */
export function curateRounds(
  stack: TechStack,
  pool: { challenges: CuratableChallenge[]; templates: CuratableTemplate[] },
  opts: { maxPerParadigm?: number } = {},
): CurationResult {
  const max = opts.maxPerParadigm ?? 2;
  const challengeIds: string[] = [];
  const playgroundIds: string[] = [];

  // DSA — harness challenges whose languages overlap the requested set.
  if (stack.dsa?.languages?.length) {
    const want = new Set(stack.dsa.languages.map((l) => l.toLowerCase()));
    challengeIds.push(
      ...pool.challenges
        .filter((c) => c.paradigm === "dsa" && hasIntersection(c.languages, want))
        .slice(0, max)
        .map((c) => c.id),
    );
  }

  // Backend — one console template per requested language, plus backend challenges.
  if (stack.backend?.languages?.length) {
    const want = new Set(stack.backend.languages.map((l) => l.toLowerCase()));
    for (const lang of want) {
      const def = BACKEND_LANGUAGES.find((b) => b.id === lang);
      if (def) playgroundIds.push(templatePlaygroundId(def.templateId));
    }
    challengeIds.push(
      ...pool.challenges
        .filter((c) => c.paradigm === "backend" && hasIntersection(c.languages, want))
        .slice(0, max)
        .map((c) => c.id),
    );
  }

  // Frontend — one framework template per requested framework, plus framework challenges.
  if (stack.frontend?.frameworks?.length) {
    const want = new Set(stack.frontend.frameworks.map((f) => f.toLowerCase()));
    for (const fw of want) {
      const def = FRONTEND_FRAMEWORKS.find((f) => f.id === fw);
      if (def) playgroundIds.push(templatePlaygroundId(def.templateId));
    }
    challengeIds.push(
      ...pool.challenges
        .filter((c) => c.paradigm === "frontend" && hasIntersection(c.frameworks, want))
        .slice(0, max)
        .map((c) => c.id),
    );
  }

  // De-dupe while preserving order.
  return {
    challengeIds: [...new Set(challengeIds)],
    playgroundIds: [...new Set(playgroundIds)],
  };
}

// ── Structured round-spec curation (AI screening batch builder) ──────────────

/**
 * A single curated screening round derived from a chosen stack. Unlike
 * `CurationResult` (flat id lists), each spec carries the paradigm + language +
 * source so the AI-screening batch builder can persist one AIScreeningRoundSpec
 * row per round. `sourceId` is a bare id (challenge id, or a playground catalog
 * template id WITHOUT the `template:` prefix — P2 resolves content from it).
 */
export type RoundSpecDraft = {
  paradigm: Paradigm;
  /** Execution language (backend/dsa). Undefined for frontend. */
  language?: string;
  /** Frontend framework label, or joined backend framework focus. AI-only. */
  frameworkLabel?: string;
  sourceKind: "challenge" | "playground";
  sourceId: string;
  estimatedMinutes: number;
};

/**
 * Map a chosen stack into ordered, structured screening rounds: one round per
 * selected technology, in frontend → backend → DSA order.
 *
 * Frontend/backend rounds prefer the always-runnable catalog playground
 * (framework Sandpack / language console) so the candidate surface is
 * guaranteed; DSA rounds need a concrete problem, so they bind to a matching
 * harness challenge and are skipped when the bank has none for that language.
 * The recruiter can later override any round with a custom scaffold (the hybrid
 * model) — that's applied on top of these drafts, not here.
 */
export function curateRoundSpecs(
  stack: TechStack,
  pool: { challenges: CuratableChallenge[] },
  opts: { defaultMinutes?: number } = {},
): RoundSpecDraft[] {
  const minutes = opts.defaultMinutes ?? 30;
  const specs: RoundSpecDraft[] = [];

  // Frontend — one framework playground per requested framework.
  for (const fw of stack.frontend?.frameworks ?? []) {
    const def = FRONTEND_FRAMEWORKS.find((f) => f.id === fw);
    if (!def) continue;
    specs.push({
      paradigm: "frontend",
      frameworkLabel: def.label,
      sourceKind: "playground",
      sourceId: def.templateId,
      estimatedMinutes: minutes,
    });
  }

  // Backend — one language console per requested language. Framework focus
  // (non-executable) is joined onto each backend round to steer AI questions.
  const backendFw = stack.backend?.frameworkLabels?.length
    ? stack.backend.frameworkLabels.join(", ")
    : undefined;
  for (const lang of stack.backend?.languages ?? []) {
    const def = BACKEND_LANGUAGES.find((b) => b.id === lang);
    if (!def) continue;
    specs.push({
      paradigm: "backend",
      language: def.id,
      frameworkLabel: backendFw,
      sourceKind: "playground",
      sourceId: def.templateId,
      estimatedMinutes: minutes,
    });
  }

  // DSA — bind each requested language to the first matching harness challenge.
  for (const lang of stack.dsa?.languages ?? []) {
    const want = lang.toLowerCase();
    const match = pool.challenges.find(
      (c) => c.paradigm === "dsa" && c.languages.map((l) => l.toLowerCase()).includes(want),
    );
    if (!match) continue; // no problem in the bank for this language — skip
    specs.push({
      paradigm: "dsa",
      language: lang,
      sourceKind: "challenge",
      sourceId: match.id,
      estimatedMinutes: minutes,
    });
  }

  return specs;
}

/** Whether a stack selection has at least one concrete pick. */
export function isStackEmpty(stack: TechStack): boolean {
  return (
    !stack.frontend?.frameworks?.length &&
    !stack.backend?.languages?.length &&
    !stack.dsa?.languages?.length
  );
}

/** Human-readable summary, e.g. "React · Node.js + Express · DSA (Python)". */
export function describeStack(stack: TechStack): string {
  const parts: string[] = [];
  if (stack.frontend?.frameworks?.length) {
    parts.push(
      stack.frontend.frameworks
        .map((f) => FRONTEND_FRAMEWORKS.find((x) => x.id === f)?.label ?? f)
        .join(", "),
    );
  }
  if (stack.backend?.languages?.length) {
    const langs = stack.backend.languages
      .map((l) => BACKEND_LANGUAGES.find((x) => x.id === l)?.label ?? l)
      .join(", ");
    const fw = stack.backend.frameworkLabels?.length ? ` + ${stack.backend.frameworkLabels.join(", ")}` : "";
    parts.push(`${langs}${fw}`);
  }
  if (stack.dsa?.languages?.length) {
    parts.push(`DSA (${stack.dsa.languages.map((l) => DSA_LANGUAGE_LABELS[l] ?? l).join(", ")})`);
  }
  return parts.join(" · ");
}
