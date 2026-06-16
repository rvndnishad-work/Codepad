export type ReactAugment = {
  title: string;
  /** Markdown, interview-depth. Keep a **Interview tip:** line where it helps. */
  answer?: string;
  /**
   * Code examples. For React, author each `code` as a self-contained `App.js`
   * (default-exported component) so "Open in Playground" runs it as-is in the
   * empty-react Sandpack template. Set `runnable: false` for conceptual snippets
   * that shouldn't get an Open-in-Playground button.
   */
  examples?: { label?: string; code: string; runnable?: boolean }[];
};
