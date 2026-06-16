/**
 * Maps a code-example "tech" key to its display label, the playground template
 * it opens in ("Open in Playground" hand-off), and the highlight.js language
 * used to syntax-highlight the static block.
 *
 * Used by multi-variant interview-question code examples: a single example can
 * carry several `variants` (e.g. the same algorithm in Python / Go / Java, or a
 * UI in React / Vue / Angular), and the detail page shows a dropdown to switch.
 *
 * Template ids must exist in src/lib/templates.ts.
 */
export type CodeVariantMeta = {
  /** Human label shown in the dropdown. */
  label: string;
  /** Playground template id for the "Open in Playground" hand-off. */
  template: string;
  /** highlight.js language id (must be registered in src/lib/code-peek.ts). */
  hljs: string;
};

export const CODE_VARIANTS: Record<string, CodeVariantMeta> = {
  // Backend / general-purpose
  python: { label: "Python", template: "python", hljs: "python" },
  go: { label: "Go", template: "go", hljs: "go" },
  java: { label: "Java", template: "java", hljs: "java" },
  cpp: { label: "C++", template: "cpp", hljs: "cpp" },
  rust: { label: "Rust", template: "rust", hljs: "rust" },
  node: { label: "Node.js", template: "node", hljs: "javascript" },
  javascript: { label: "JavaScript", template: "javascript", hljs: "javascript" },
  typescript: { label: "TypeScript", template: "typescript", hljs: "typescript" },
  // Frontend frameworks
  react: { label: "React", template: "empty-react", hljs: "javascript" },
  vue: { label: "Vue", template: "vue", hljs: "xml" },
  angular: { label: "Angular", template: "angular", hljs: "typescript" },
  svelte: { label: "Svelte", template: "svelte", hljs: "xml" },
  solid: { label: "SolidJS", template: "solid", hljs: "javascript" },
  // Highlight-only (no runnable playground template) — empty `template` means
  // the "Open in Playground" button is hidden.
  sql: { label: "SQL", template: "", hljs: "sql" },
};

/**
 * Resolve a tech key to its metadata. Unknown/empty tech falls back to a plain
 * block with NO playground template (so no Run button appears).
 */
export function variantMeta(tech: string | undefined): CodeVariantMeta {
  return (tech && CODE_VARIANTS[tech]) || { label: "Code", template: "", hljs: "javascript" };
}
