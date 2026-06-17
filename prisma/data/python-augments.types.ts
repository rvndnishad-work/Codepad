/**
 * Shapes for Python (technology='python') question augments.
 *
 * Answers are English markdown that may embed GFM comparison tables and the
 * convention-standard "**Interview tip:**" closing line. (rehype-raw / inline
 * SVG is available — QuestionDetailClient passes `allowHtml` on answers — but
 * Python answers lean on tables + code rather than diagrams.)
 *
 * Code examples are real, runnable Python: each example carries `tech: 'python'`
 * (drives highlight.js + the "Run Playground" hand-off to /play?template=python,
 * which executes on the Piston backend). Most are single-variant; the shared
 * multi-variant `variants` shape is available if a question benefits from a
 * second language. `tech` keys must exist in
 * src/lib/interview-questions/code-variants.ts.
 *
 * AUTHORING RULES (these data files are TS modules, so code lives in template
 * literals):
 *  - Keep example code BACKTICK-FREE and avoid the literal sequence "${" (it
 *    would start a template-literal interpolation). Plain Python — including
 *    f-strings like f"{x}" — is safe.
 *  - Answers are double-quoted strings "\n"-joined so inline-code backticks stay
 *    literal, matching the system-design / angular augment files.
 */
export type PyVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type PyExample = {
  label?: string;
  /** Single-variant code (omit when using `variants`). */
  code?: string;
  /** Tech for a single-variant example. Defaults to 'python' at author time. */
  tech?: string;
  runnable?: boolean;
  /** Multi-variant: same example in several languages. */
  variants?: PyVariant[];
};

export type PythonAugment = {
  title: string;
  answer?: string;
  examples?: PyExample[];
};
