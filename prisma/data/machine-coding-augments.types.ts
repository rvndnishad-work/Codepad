/** A complete tutorial + runnable solution for one framework. */
export type FrameworkBundle = {
  /**
   * Markdown, TUTORIAL-style for THIS framework. Author as a template literal
   * with ~~~ (tilde) code fences so triple backticks don't clash; keep code
   * backslash-free ([0-9] not \\d) and ${}-free.
   */
  answer: string;
  /**
   * Multi-file solution = a path -> source map. Paths must match the framework's
   * Sandpack template entry (react: /App.js + /src/*, vue: /src/App.vue +
   * /src/components/*, angular: /src/app/app.component.ts). Backtick-free.
   */
  files: Record<string, string>;
};

export type MachineCodingAugment = {
  title: string;
  /**
   * Per-framework bundles. When present, the detail page shows a framework
   * selector (React / Vue / Angular) that swaps BOTH the tutorial and the
   * runnable solution. `react` (or the first present) is used as the default
   * stored on `answer`/`examplesData` for SSR + SEO.
   */
  frameworks?: {
    react?: FrameworkBundle;
    vue?: FrameworkBundle;
    angular?: FrameworkBundle;
  };
  /** Legacy single-framework fields (still supported for non-converted topics). */
  answer?: string;
  examples?: { label?: string; code?: string; files?: Record<string, string>; runnable?: boolean }[];
};
