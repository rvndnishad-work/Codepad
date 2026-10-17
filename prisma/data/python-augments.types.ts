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

/**
 * Python ULTRA augments (prisma/data/python-augments-ultra-NN.ts): the full
 * CLAUDE.md treatment — Question Body (§6), tutorial answer with 📌 terms,
 * diagrams, a Verified section quoting real output, the amber "How to Answer
 * in an Interview" card (§7), glossary and conclusion.
 *
 * Examples run in the page on Pyodide 0.25.1 (CPython 3.11). An example that
 * cannot run there (threads, processes, sockets, 3.12+ syntax) sets
 * `runnable: false` and `python` to the version it was verified on; it is then
 * shown as static code with an "Open in playground" hand-off.
 *
 * scripts/check-ultra.ts checks the structure and
 * scripts/verify-python-examples.ts runs every example.
 */
export type PythonUltraExample = {
  label: string;
  code: string;
  runnable?: boolean;
  /** Interpreter the example was verified with when runnable is false, e.g. "3.12". */
  python?: "3.11" | "3.12" | "3.13";
};

export type PythonUltraAugment = {
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  seoDescription: string;
  description: string;
  answer: string;
  examples: PythonUltraExample[];
};
