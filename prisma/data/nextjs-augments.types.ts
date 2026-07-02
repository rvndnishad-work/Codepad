/**
 * Shapes for Next.js question augments (technology='nextjs').
 *
 * Answers are markdown (may embed inline <svg class='iq-diagram'> theme-aware
 * diagrams + GFM tables + `<code>` tags). Code examples for Next.js are ALWAYS
 * rendered as static, syntax-highlighted code (no Next.js playground; the
 * QuestionDetailClient `isRunnable` list does not include 'nextjs') — so set
 * `runnable: false` on every example. Use `tech: 'tsx'`/'jsx' for component/route
 * code, `tech: 'bash'` for CLI/config snippets.
 */
export type NextVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type NextExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: NextVariant[];
};

export type NextAugment = {
  title: string;
  answer?: string;
  examples?: NextExample[];
};
