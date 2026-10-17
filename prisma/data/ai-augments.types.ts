/**
 * Shapes for AI Engineering question augments (technology='ai-engineering').
 *
 * Answers are markdown (may embed inline <svg class='iq-diagram'> theme-aware
 * diagrams + GFM tables + `<code>` tags). Code examples for AI Engineering are
 * ALWAYS rendered as static, syntax-highlighted code (the QuestionDetailClient
 * `isRunnable` list does not include 'ai-engineering') — so set `runnable: false`
 * on every example. Use `tech: 'ts'`/'python' for SDK snippets, `tech: 'bash'`
 * for CLI/config snippets.
 */
export type AiVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type AiExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: AiVariant[];
};

export type AiAugment = {
  title: string;
  answer?: string;
  examples?: AiExample[];
};

/**
 * "Ultra" entries: prisma/data/ai-augments-ultra-NN.ts, applied by
 * prisma/augment-ai.ts after the legacy files (ultra wins for a title).
 * Unlike the legacy rule above, ultra examples are complete programs that run
 * offline (an in-process stub stands in for the model API) and are run by
 * scripts/verify-variant-examples.ts, so they keep "Run Playground".
 * Variants of one example print exactly the same output; "node" comes first.
 */
export type AiUltraProgram = { tech: "node" | "python"; code: string; label?: string };

export type AiUltraExample =
  | { label: string; variants: AiUltraProgram[] }
  | { label: string; tech: AiUltraProgram["tech"]; code: string };

export type AiUltraAugment = {
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  /** Plain sentence, max 155 chars. */
  seoDescription: string;
  /** Question Body (CLAUDE.md §6), plain markdown, no HTML. */
  description: string;
  answer: string;
  examples: AiUltraExample[];
};
