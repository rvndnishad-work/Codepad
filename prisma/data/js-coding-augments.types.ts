/**
 * Shapes for practical JS coding-interview question augments
 * (technology='javascript-coding').
 *
 * Distinct in KIND from technology='javascript' (definitional/theoretical
 * Q&A): these are live-coding-style problems, and the Answer Body's whole
 * point is to showcase the THOUGHT PROCESS an interviewer wants to see —
 * clarifying questions, a naive-first approach and why it's the natural
 * instinct, the reasoning that leads to something better, THEN the code —
 * never code-first with the reasoning bolted on after.
 *
 * Required Answer Body section order for every question:
 *   1. Title + difficulty header (Target Audience / Difficulty)
 *   2. "How to read this doc" callout
 *   3. The problem restated plainly, with 2-3 concrete example input/output
 *      pairs (a table or inline list) — never just the terse DB title
 *   4. Clarifying questions a strong candidate would ask, each with why it
 *      matters (empty input? mutate in place or return new? expected time
 *      complexity? duplicate handling? etc.) — this section is NOT optional
 *      the way it is for definitional javascript content; it is central here
 *   5. "Thought Process" — the brute-force idea and why it's the natural
 *      first instinct, its real complexity/limitation, then the reasoning
 *      that leads to the better approach (the "aha"), narrated like an
 *      interview whiteboard monologue, not just "here are two solutions"
 *   6. The verified solution — real, executed code (see CLAUDE.md §4 rule,
 *      applies identically here: never claim tested without actually
 *      running it), tested against the example cases AND real edge cases
 *      (empty input, one element, large input, malformed input), with
 *      actual observed output quoted, not asserted
 *   7. Complexity analysis (time + space, with the one-sentence justification,
 *      not just the Big-O notation alone)
 *   8. Edge cases table (case -> expected behavior -> why)
 *   9. Common Pitfalls (4-6 bullets, bugs candidates actually introduce here)
 *   10. "How to Answer in an Interview" card (same exact HTML/CSS styling as
 *       the javascript/nodejs ULTRA projects — every inline element needs
 *       its own explicit color) but reframed as a PROCESS card: "Step 1:
 *       restate + clarify, Step 2: think aloud with the brute force, Step 3:
 *       identify the bottleneck and optimize, Step 4: code it, narrating as
 *       you go, Step 5: test your own edge cases out loud" — not talking
 *       points to recite, a process to follow. Follow-up Q&A pairs in this
 *       card should be realistic INTERVIEWER FOLLOW-UPS after a working
 *       solution ("now do it without extra space", "what if the input is
 *       streamed / too large for memory", "what if it needs to be thread
 *       safe/idempotent under concurrent calls") — 4-5 pairs.
 *   11. Quick Glossary
 *   12. Conclusion
 *
 * Code execution rule (identical bar to javascript/nodejs ULTRA, CLAUDE.md
 * §4): every code block, including every edge-case check quoted in section
 * 6, was actually run — `node file.js` for plain algorithmic code, jsdom for
 * anything touching the DOM, and the live Claude Browser pane for anything
 * genuinely browser-only that jsdom does not implement (ResizeObserver,
 * IntersectionObserver, BroadcastChannel, etc. — see the javascript ULTRA
 * project's own standing rule for the exact list).
 *
 * Runnable examples: same convention as technology='javascript' — this
 * app's Sandpack playground genuinely executes plain JS in a real browser,
 * so use `tech: "javascript"` and leave `runnable` unset (or `true`) so the
 * "Run Playground" button shows. Never use `require(...)` beyond a simple
 * `typeof`/reference check on `fs` — only fetch/DOM/dynamic-import/plain JS
 * are genuinely portable to the browser-based playground runtime.
 */
export type JsCodingVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type JsCodingExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: JsCodingVariant[];
};

export type JsCodingAugment = {
  title: string;
  /** Question Body (§6 rubric): the problem statement + examples + clarifying Qs expected + code expected note. Renders WITHOUT rehype-raw — plain markdown only, no HTML/SVG. */
  description?: string;
  /** Plain-sentence meta description, <=155 chars. */
  seoDescription?: string;
  answer?: string;
  examples?: JsCodingExample[];
};
