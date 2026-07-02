/**
 * Shapes for Node.js question augments (technology='nodejs').
 *
 * Answers are markdown (may embed inline <svg class='iq-diagram'> theme-aware
 * diagrams + GFM tables + `<code>` tags). Code examples for Node.js are ALWAYS
 * rendered as static, syntax-highlighted code — there is no Node playground and
 * QuestionDetailClient's `isRunnable` list does not include 'nodejs' — so set
 * `runnable: false` on every example (the flag is belt-and-suspenders; Node
 * examples never get a Run button regardless). Use `tech: 'javascript'` for JS
 * snippets, `tech: 'bash'` for shell/CLI snippets.
 */
export type NodeVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type NodeExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: NodeVariant[];
};

export type NodeAugment = {
  title: string;
  answer?: string;
  examples?: NodeExample[];
};
