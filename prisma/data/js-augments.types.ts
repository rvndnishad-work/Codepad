/**
 * Shapes for JavaScript question augments (technology='javascript').
 *
 * Answers are markdown (may embed inline <svg class='iq-diagram'> theme-aware
 * diagrams + GFM tables + `<code>` tags). Unlike Node.js, plain JavaScript
 * genuinely runs in the browser-based playground (Sandpack): use
 * `tech: 'javascript'` and `runnable: true` (or omit `runnable` — anything
 * other than an explicit `false` shows the "Run Playground" button, per
 * CodeExample.tsx's `openable = current.runnable !== false`) so every example
 * actually gets a working Run button. Every example must still be verified —
 * run it with `node file.js` before pasting it in; for anything that needs a
 * real DOM (IntersectionObserver/ResizeObserver/MutationObserver, layout
 * reads), verify with jsdom instead, exactly like React examples do.
 */
export type JsVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type JsExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: JsVariant[];
};

export type JsAugment = {
  title: string;
  /** Question Body (§6 rubric). Renders WITHOUT rehype-raw — plain markdown only, no HTML/SVG. */
  description?: string;
  /** Plain-sentence meta description, <=155 chars. */
  seoDescription?: string;
  answer?: string;
  examples?: JsExample[];
};
