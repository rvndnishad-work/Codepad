export type ReactAugment = {
  title: string;
  /** Markdown, interview-depth. Keep a **Interview tip:** line where it helps. */
  answer?: string;
  /**
   * The Question Body (CLAUDE.md §6): the interviewer-facing spoken prompt plus
   * the grading rubric. Rendered in the "Understand the problem" step WITHOUT
   * rehype-raw — plain markdown only, no HTML and no inline SVG.
   */
  description?: string;
  /**
   * One plain sentence, <=155 chars, used as the page meta description. Set it
   * explicitly so the rubric bullets in `description` never leak into the tag.
   */
  seoDescription?: string;
  /**
   * Code examples. For React, author each `code` as a self-contained `App.js`
   * (default-exported component) so "Open in Playground" runs it as-is in the
   * empty-react Sandpack template. Set `runnable: false` for conceptual snippets
   * that shouldn't get an Open-in-Playground button.
   */
  examples?: { label?: string; code: string; runnable?: boolean }[];
};
