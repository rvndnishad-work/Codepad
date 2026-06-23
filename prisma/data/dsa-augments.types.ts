/**
 * Shapes for DSA (technology='dsa') question augments.
 *
 * Each augment enriches an existing DSA PrepQuestion (matched by exact title +
 * technology='dsa') with:
 *  - `answer`: a detailed markdown explanation. QuestionDetailClient renders it
 *    with `allowHtml`, so answers MAY embed hand-authored inline SVG diagrams
 *    (including SMIL/CSS-animated SVG), GFM tables, and runnable ```lang-run
 *    fences. Follow the in-house answer skeleton: Intuition -> Approach ->
 *    Visual (SVG) -> Complexity table -> Dry run -> Edge cases -> Interview tip.
 *  - `examples`: code examples. DSA uses the multi-variant `variants` shape so a
 *    single example carries the same algorithm in several languages and the
 *    detail page shows a language dropdown + per-variant "Run Playground".
 *    `tech` keys MUST exist in src/lib/interview-questions/code-variants.ts
 *    (DSA standard set: 'python', 'javascript', 'java', 'cpp').
 *
 * AUTHORING RULES (these files are TS modules; strings use BACKTICK template
 * literals so multi-line SVG/markdown/code stays readable):
 *  - NEVER write the literal sequence "${" inside any template literal — it
 *    starts an interpolation and breaks the file. In particular, JS/TS example
 *    code must avoid backtick template strings; use single quotes + "+"
 *    concatenation instead.
 *  - Do not put a raw backtick (`) inside a template literal. For inline code in
 *    markdown answers, use the HTML <code>…</code> tag instead of backticks.
 *  - Keep SVG self-contained and theme-aware: prefer currentColor / explicit
 *    hex that reads on both light and dark surfaces.
 */
export type DsaVariant = {
  /** Language key — must exist in code-variants.ts (python|javascript|java|cpp). */
  tech: string;
  code: string;
  label?: string;
  /** Set false to hide the "Run Playground" button (e.g. pseudo-code). */
  runnable?: boolean;
};

export type DsaExample = {
  label?: string;
  /** Single-variant code (omit when using `variants`). */
  code?: string;
  /** Tech for a single-variant example. */
  tech?: string;
  runnable?: boolean;
  /** Multi-variant: same example across several languages (the DSA default). */
  variants?: DsaVariant[];
};

export type DsaAugment = {
  /** Must exactly match an existing PrepQuestion.title with technology='dsa'. */
  title: string;
  answer?: string;
  examples?: DsaExample[];
};
