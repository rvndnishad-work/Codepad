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
  /**
   * The Question Body (CLAUDE.md §6): interviewer-facing spoken prompt plus
   * the grading rubric. Rendered WITHOUT rehype-raw — plain markdown only,
   * no HTML and no inline SVG.
   */
  description?: string;
  /**
   * One plain sentence, <=155 chars, used as the page meta description.
   */
  seoDescription?: string;
  examples?: NextExample[];
};
