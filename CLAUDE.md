# Interview Question Content — Agent Style Guide

This is the complete operating manual for generating system design / frontend interview question content (Question Body + Answer Body), distilled from an extensive iterative session. Give this file to the agent as its primary reference — ideally as a `CLAUDE.md` in the project root, or pinned as a skill, so it's loaded automatically rather than re-explained per task.

---

## 0. The Two Deliverables Per Question

Every question needs **two separate pieces of content**, matching two separate fields on the platform:

| Field | Purpose | Length | Audience |
| :--- | :--- | :--- | :--- |
| **Question Body** | What the candidate/interviewer sees as the prompt | Short — a realistic spoken question + a grading rubric | Candidate being interviewed |
| **Answer Body** | The full teaching doc | Long — comprehensive | Candidate studying beforehand |

Do not merge these. The Answer Body is the deep-dive doc; the Question Body is a compact rubric derived *from* it. See `## 6. Question Body Template` below.

---

## 1. Answer Body Structure (System Design Questions)

Not every section is mandatory for every question — vary structure where a section genuinely doesn't fit, per `## 8. Presentation Variety`. But the following is the default skeleton:

1. **Title + metadata header** — Target Audience, Difficulty
2. **"How to read this doc" callout** — explains the `📌 Interview term:` convention
3. **Why This Even Matters — A Story First** — a plain-language analogy before any jargon. No assumed prior knowledge.
4. **Questions to Ask Your Interviewer First** — a table of 4-6 clarifying questions + why each matters. (Only for open-ended design questions, not definitional ones — see `## 9`.)
5. **Core concept explanation(s)** — plain language first, then `📌 Interview term:` callout with the precise vocabulary
6. **Diagram(s)** — see `## 3. SVG Rules` below. Prefer multiple small, focused diagrams over one crowded one.
7. **Working Example** — a verified code example. See `## 4. Code Verification Rules`.
8. **Comparison table(s)** — for any "X vs Y" question
9. **Common Pitfalls** — 4-6 bullets, specific to the topic, not generic advice
10. **Quick Glossary** — table of every `📌` term introduced, one line each
11. **Conclusion** — one paragraph tying it together
12. **Cross-links** — see `## 5. Cross-Linking Convention`

## 2. Answer Body Structure ( Node.js / JavaScript Questions)

Same spirit as system design, adapted:

- Drop "Questions to Ask Your Interviewer" — doesn't fit definitional/technical questions. Skip straight to the concept.
- Add a **"How to Answer in an Interview"** section as the second-to-last section (before Glossary) — see `## 7` for the exact styling. This applies to **React, Node.js, and general JavaScript questions alike**, not just React.
- Prefer code examples that are **actually executed** — see `## 4`. For Node.js specifically, this is the easy case: no jsdom, no esbuild/JSX transform, no `react-dom` — just run `node file.js` directly and capture real output.
- Node.js questions commonly hinge on *ordering* and *timing* claims (event loop phases, microtask vs. macrotask queues, when a callback actually fires relative to another). Never assert an ordering claim from memory — write the smallest reproducing snippet, run it with `console.log` markers at each step, and quote the actual observed output, exactly as done for React's effect-timing and cleanup-ordering claims.
- Node version-specific facts (when a feature stabilized, when something was deprecated, current LTS behavior) go through the same fact-checking rule in `## 10` — verify via search, don't assume from training data.

## 3. SVG Rules (Hard Requirements — Violations Break Rendering)

These were each discovered by actually breaking the platform's renderer. Follow all of them, every time:

- **`width="100%"`, never a fixed pixel width.** Always pair with a `viewBox` for scaling: `<svg width="100%" viewBox="0 0 600 200" ...>`.
- **No apostrophes anywhere inside an `<svg>...</svg>` block.** Not in text content, not in labels. Rephrase to avoid contractions/possessives ("does not" not "doesn't"; "the team" not "the team's"). This one broke rendering silently and non-obviously — content after the first apostrophe in some blocks failed to render.
- **No floating/disconnected caption text at the bottom of a diagram.** A `<text>` element that isn't labeling a specific shape — i.e., a general summary sentence — must NOT live inside the SVG. Move that sentence to normal markdown prose immediately below the diagram instead.
- **Generous spacing between all elements.** Do not place arrow labels or box subtitles with near-zero clearance from adjacent shapes — this caused real text-overlap bugs. Leave at least 40-70 SVG units of horizontal/vertical gap between unrelated elements. When in doubt, make the canvas bigger rather than cram content.
- **Prefer multiple small SVGs over one large one** when illustrating multiple concepts (e.g., 3 separate diagrams for 3 replication topologies, rather than 1 diagram with 3 panels). Smaller diagrams are less error-prone and render better on mobile.
- **Before finalizing any SVG**, mentally check: (a) any apostrophes? (b) any floating bottom captions? (c) does every text element have enough clearance? A shell script check for the first two:
  ```bash
  awk '/<svg/{p=1} p{print} /<\/svg>/{p=0}' file.md | grep "'"   # should be empty
  grep -n 'fill="#555"' file.md   # inspect each hit; only arrow-marker polygons are safe
  ```

## 4. Code Verification Rules

**Never claim code "works" or "is verified" without actually running it.** This was a recurring, load-bearing practice:

- For algorithmic/logic code (rate limiters, caches, hash rings, etc.): write the reference implementation, execute it in a sandbox, and only include the output in the doc if you've actually seen it print. When porting to multiple languages, run every single one and diff the outputs — don't assume a port is correct just because it compiles.
- For React/DOM code: don't just assert "this is standard, well-documented syntax" as a substitute for execution. It's possible to actually verify React code — install `react`, `react-dom`, `jsdom`, and `esbuild` in a sandbox, compile JSX with `esbuild --jsx=automatic`, and either:
  - Server-render with `react-dom/server`'s `renderToStaticMarkup` for stateless output checks, or
  - Mount into a real jsdom document with `react-dom/client`'s `createRoot` + React's `act()` for effect timing, event simulation, and lifecycle behavior.
- For plain Node.js code: this is the easiest case — no toolchain setup at all. Write the snippet to a file and run `node file.js` directly. There is no excuse for an unverified Node.js code example; if it's in the doc, it was actually run.
- If something genuinely cannot be verified (e.g., a claim depends on a real browser API absent in jsdom), say so explicitly rather than presenting it as confirmed. Precision about what was and wasn't checked is part of the deliverable.

## 5. Multi-Language Code Examples (JSON Schema)

When a working example should be runnable in the platform's code-runner UI, produce a separate `<topic>-code-examples.json` file (not inline in the answer doc) with this exact schema:

```json
{
  "label": "Short description of what this demonstrates",
  "variants": [
    { "tech": "node", "code": "..." },
    { "tech": "python", "code": "..." },
    { "tech": "go", "code": "..." },
    { "tech": "java", "code": "..." }
  ]
}
```

Rules:
- `tech` key for Node.js is `"node"`, not `"nodejs"`.
- `node` must be **index 0** in the `variants` array — first, always.
- Every variant must be executed and diffed against the others before shipping. If outputs differ due to language-specific quirks (e.g., Go map iteration order, floating point formatting), fix the implementation so behavior is identical, not just "close enough."
- The Answer Body's markdown should reference the JSON file by name and show the expected output, not duplicate the full code inline (avoids the same content living in two places).
- Not every question needs this. If a very similar verified example already exists in a related doc, cross-link to it instead of duplicating.

## 6. Question Body Template

The Question Body is short and rubric-shaped, not another teaching doc:

```markdown
**Question presented to candidate:**
"[A realistic, spoken-style version of the question — not just the terse title]"

**What a strong answer should cover:**
- [4-6 bullets: specific concepts, correct terminology, trade-offs]

**Clarifying questions expected:**
- [1-3 questions a good candidate would ask before diving in]

**Code / implementation expected:** [Yes/No/Optional, with a one-line note on what kind]
```

## 7. "How to Answer in an Interview" Card (React, Node.js & JavaScript Questions)

A distinct visual block, placed near the end of the Answer Body (before Glossary). Exact styling — dark-mode-native, not a light card on a dark page:

- Outer container: `background:#1c140a; border:2px solid #f9a825; border-radius:10px; padding:20px 24px;`
- Header line: `color:#ffca28; font-size:1.15em; font-weight:bold;` with a 🎤 emoji
- Section labels ("The 60-Second Answer" / "Follow-Up Questions to Expect"): `color:#e0a83e;` small, uppercase, letter-spaced
- The 60-second script: 5 numbered `<blockquote>` items, `border-left:3px solid #f9a825; color:#f0e2c8;`
- Follow-up Q&A pairs: each is two fused blocks — a question header `background:#3d2810;` with a `❓` icon and `color:#ffe0b2;` text, directly above an answer block `background:#151a15; border:1px solid #f9a825;` with a `💡` icon and `color:#d8d8d8;` text (no gap, second block's top border removed, radii chained so they look like one unit)
- Inline `<code>` inside the card: `background:#332310; color:#ffca28;` (question-panel code uses `background:#4a3418; color:#ffe0b2;` to match its panel)

**Critical rule:** every single `<strong>`, `<code>`, `<em>`, and `<span>` inside this card must have its **own explicit inline `color`**. Never rely on inheritance from a parent `<div>` — the platform's dark-theme CSS has higher-specificity rules for bare `strong`/`code` tags that will override an inherited color and wash the text out to unreadable. This is not optional; it caused a real, hard-to-spot bug.

Include 4-5 follow-up Q&A pairs per question, covering the most likely actual follow-ups — not generic filler.

## 8. Presentation Variety

Don't force identical structure on every doc. Where it genuinely helps:
- Use `<details><summary>...</summary>...</details>` for optional deep-dives or a "click to expand" pitfalls section
- Use a colored callout `<div>` for one key insight per doc (not more — overuse dilutes it). Same explicit-color rule as above applies.
- Vary the opening analogy's tone — playful is fine, especially for the "why this matters" story
- Skip sections that don't fit rather than padding (e.g., skip "Questions to Ask the Interviewer" for a pure definitional question; skip a diagram if the topic is better served by a code example or table)

## 9. Question Categories Need Different Templates

- **System design ("design a...", "how would you build...")**: full template including clarifying questions
- **Conceptual/comparison ("X vs Y", "what is the difference between...")**: skip clarifying questions, lead with the core distinction
- **Definitional/technical ("what is X", "what does Y do")**: skip clarifying questions, can be shorter overall, lean on precise verified facts over broad architecture discussion
- **React/frontend**: always include the "How to Answer in an Interview" card; verify code by actually executing it (jsdom + esbuild for anything touching the DOM), not just writing plausible syntax
- **Node.js/backend JavaScript** (event loop, streams, `EventEmitter`, `cluster`/`worker_threads`, CJS vs. ESM, error handling patterns, `process`, buffers): always include the "How to Answer in an Interview" card. Verification is simpler than React here — run the snippet directly with `node`, no DOM simulation needed. Be especially rigorous about ordering/timing claims (event loop phases, microtask vs. macrotask) — these are the single most common source of confidently-wrong answers on this topic, and are cheap to actually verify with a `console.log`-instrumented snippet before writing the claim into the doc.

## 10. Fact-Checking Rule

Any claim tied to a **specific version, release date, or product-specific behavior** (React version numbers, when an API was deprecated/removed, cloud provider feature names, specific benchmark numbers) must be verified via web search or actual execution before inclusion — never asserted from training-data memory alone. Cite the source inline where it's a notable claim (e.g., a real-world case study).

## 11. Cross-Linking Convention

- Internal links between question docs use: `<a href="PASTE_<DOC_NAME>_URL_HERE" target="_blank" rel="noopener noreferrer">Link Text</a>`
- The `PASTE_..._URL_HERE` placeholder gets swapped for the real published URL at publish time — keep it consistently named per target doc so a find-and-replace works cleanly
- Don't re-explain a concept that already has its own doc — link to it instead (e.g., a sharding doc should link to the consistent-hashing doc rather than re-drawing its ring diagram)

## 12. Tone

- Explain for someone with **no prior system design/React knowledge** by default — define every term the first time it's used, then tag it with `📌 Interview term:` so the reader also learns the vocabulary an interviewer expects
- Never present speculation as fact; flag genuine uncertainty explicitly
- Prefer concrete, worked numbers (a real capacity estimate, a real simulated hit-rate) over hand-wavy claims wherever the topic allows it

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
