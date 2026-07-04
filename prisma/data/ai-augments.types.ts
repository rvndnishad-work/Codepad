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
