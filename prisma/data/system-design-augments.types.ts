/**
 * Shapes for system-design question augments.
 *
 * Answers are English markdown that may embed:
 *  - GFM comparison tables
 *  - hand-authored inline <svg class="iq-diagram"> diagrams (theme-aware via the
 *    d-* classes in globals.css)
 *
 * Code examples are multi-variant: one example can carry several `variants`
 * (e.g. the same algorithm in Python / Go / Java) and the detail page renders a
 * dropdown to switch, with a per-variant "Open in Playground" hand-off. `tech`
 * keys must exist in src/lib/interview-questions/code-variants.ts.
 */
export type SDVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type SDExample = {
  label?: string;
  /** Single-variant code (omit when using `variants`). */
  code?: string;
  /** Tech for a single-variant example (drives highlight + playground template). */
  tech?: string;
  runnable?: boolean;
  /** Multi-variant: same example in several languages/frameworks. */
  variants?: SDVariant[];
};

export type SystemDesignAugment = {
  title: string;
  answer?: string;
  examples?: SDExample[];
};
