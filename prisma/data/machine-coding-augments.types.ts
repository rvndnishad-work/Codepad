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
   * Sandpack template entry (react: /App.js, vue: /src/App.vue, angular:
   * /src/app/app.component.ts); every other file sits in a conventional folder
   * (components, hooks/composables, services, directives, api, data, utils),
   * as scripts/restructure-mc-files.ts lays them out. Backtick-free.
   */
  files: Record<string, string>;
};

export type MachineCodingAugment = {
  title: string;
  /** Question Body (CLAUDE.md §6). Renders WITHOUT rehype-raw: plain markdown only, no HTML/SVG. */
  description?: string;
  /** One plain sentence, <=155 chars, used as the page meta description. */
  seoDescription?: string;
  /** Corrects the stored difficulty when the original label was wrong. */
  difficulty?: "easy" | "medium" | "hard";
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
