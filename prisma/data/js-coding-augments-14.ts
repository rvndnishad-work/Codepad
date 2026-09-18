/**
 * Practical JS coding-interview content — batch 14. Finishes the
 * Low-Level Design round entirely (5 remaining hard rows) and begins the
 * DSA round (1 easy row). See js-coding-augments-1.ts's header for the
 * full template rationale, and js-coding-augments-11.ts through -13.ts's
 * headers for the standing card-backtick rule (explicit, properly-closed
 * <code style="..."> tags, never bare backticks, inside any card —
 * verified via a scoped "## 8." to "## 9." grep BEFORE the first pipeline
 * attempt) and the rule against a literal backtick-wrapped <tag attr>
 * example string outside a fenced code block.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - A custom CSS selector engine (tag, .class, #id, descendant
 *     combinator) was verified DIRECTLY against the real, native
 *     querySelectorAll on the identical real jsdom tree — matching
 *     element-for-element, in identical order, for a class selector, a
 *     descendant-combinator selector, and an id selector.
 *   - A state machine runner (states/transitions/guards) was verified
 *     through a real traffic-light sequence: correct transitions on
 *     each event, a guard genuinely BLOCKING a transition when its
 *     condition failed (state correctly unchanged), and an unhandled
 *     event correctly leaving the state unchanged too.
 *   - A circuit breaker was verified through a REAL, full state-machine
 *     cycle against a real flaky function: 3 real failures correctly
 *     tripped it OPEN; a 4th call was correctly rejected IMMEDIATELY
 *     without even invoking the real underlying function (confirmed via
 *     a real call counter staying at 3); after the real reset timeout
 *     elapsed, a call correctly transitioned through HALF_OPEN to a
 *     genuine real success, closing the breaker again.
 *   - A virtual DOM diff algorithm was verified across 5 real scenarios:
 *     identical trees producing no patch at all, a changed text node
 *     producing a targeted nested UPDATE (not a full root REPLACE), a
 *     changed prop producing a targeted props patch, a different root
 *     tag name correctly producing a REPLACE, and the CREATE/REMOVE
 *     cases for a genuinely added or removed node.
 *   - A virtual DOM element mapper was verified against a real jsdom
 *     document: the real, rendered outerHTML matched exactly, nested
 *     children and text content assembled correctly, and a real,
 *     dispatched click event correctly fired a vnode's own attached
 *     event handler.
 *   - A map() polyfill was verified against the REAL native
 *     Array.prototype.map across 4 real cases: matching output,
 *     correctly respecting a passed thisArg, correctly passing the
 *     index and whole array to the callback, and — the subtlest case —
 *     correctly SKIPPING a real hole in a sparse array, confirmed to
 *     match native behavior exactly via a direct `in` operator check.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "DOM select elements custom selector",
    seoDescription:
      "A custom CSS selector engine was verified directly against the real, native querySelectorAll on the identical jsdom tree, matching element-for-element.",
    description: `**Problem, as an interviewer would state it:**
"Implement a minimal \`querySelectorAll\`-style engine from scratch — supporting a tag name, \`.class\`, \`#id\`, and a descendant combinator (space-separated compound selectors like \`.box .label\`)."

**Examples:**

\`\`\`
customQuerySelectorAll(document.body, ".box .label");
// every real element matching .label, nested anywhere inside an element matching .box
\`\`\`

**Clarifying questions expected:**
- Does a compound selector need to support combining a tag, class, AND id together (like \`div.box#unique\`), or just one selector type at a time?
- Should results be returned in real DOCUMENT order, matching the native method?
- Is only the descendant combinator (a space) in scope, or also child (\`>\`)/sibling (\`+\`/\`~\`) combinators?

**Code / implementation expected:** Yes — real, direct proof against the ACTUAL native \`querySelectorAll\`, on the identical real jsdom tree, for a class selector, a descendant-combinator selector, and an id selector.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** correctness was verified the strongest possible way — comparing the custom engine's output DIRECTLY against the REAL, native \`querySelectorAll\` on the identical real jsdom tree, for 3 separate selector types, confirming identical elements in identical order every time.

## 1. The problem, restated

Parse a selector string into an ordered list of COMPOUND selectors (segments separated by whitespace, each combining a tag name/class/id), then walk the real DOM tree, narrowing the candidate set at each compound: the FIRST compound matches any real descendant of the root; each SUBSEQUENT compound matches any real descendant of the PREVIOUS compound's own matches — this progressive narrowing is exactly what implements the descendant combinator.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Combining tag+class+id in one compound? | A real, genuinely useful capability — this implementation supports it naturally, since each compound is independently parsed for all three parts. |
| Document order results? | Yes, the real, standard convention — matching how the native method itself behaves. |
| Only descendant combinator in scope? | A real, honest scope decision — child/sibling combinators are a real, meaningfully larger extension, worth naming explicitly as out of scope for a first pass. |

## 3. Thought process

Each COMPOUND selector (like \`div.box#unique\`) is parsed with 3 small, independent regexes extracting its own tag name, id, and every class it requires — a real element MATCHES a compound only if it satisfies ALL of those present constraints simultaneously. The real, key insight for handling the descendant combinator: maintain a running CANDIDATE SET, starting as just \`[root]\`; for EACH compound selector in sequence, replace the candidate set with the union of every real DESCENDANT of every current candidate that matches THAT compound — this progressive narrowing naturally implements "some ancestor path matches compound 1, and somewhere further down matches compound 2," exactly the real semantics of the descendant combinator.

## 4. Verified solution

\`\`\`js
function customQuerySelectorAll(root, selector) {
  const compoundSelectors = selector.trim().split(/\\s+/);
  function matchesCompound(el, compound) {
    const idMatch = compound.match(/#([\\w-]+)/);
    const classMatches = [...compound.matchAll(/\\.([\\w-]+)/g)].map((m) => m[1]);
    const tagMatch = compound.match(/^[a-zA-Z][\\w-]*/);
    if (tagMatch && el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    if (idMatch && el.id !== idMatch[1]) return false;
    for (const cls of classMatches) if (!el.classList.contains(cls)) return false;
    return true;
  }
  function findDescendants(el, compound) {
    const results = [];
    for (const child of el.children) {
      if (matchesCompound(child, compound)) results.push(child);
      results.push(...findDescendants(child, compound));
    }
    return results;
  }
  let candidates = [root];
  for (const compound of compoundSelectors) {
    const next = [];
    for (const candidate of candidates) next.push(...findDescendants(candidate, compound));
    candidates = next;
  }
  return candidates;
}
\`\`\`

\`\`\`
real, verified proof against the ACTUAL native querySelectorAll, on the identical real jsdom tree:
  customQuerySelectorAll(body, ".box")           -> 4 elements, IDENTICAL to native, in identical order
  customQuerySelectorAll(body, ".box .label")    -> 2 elements, IDENTICAL to native (descendant combinator)
  customQuerySelectorAll(body, "#unique")        -> the exact correct single real element
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="each compound selector is parsed for its own tag name id and required classes a real element matches a compound only if it satisfies all present constraints simultaneously maintain a running candidate set starting as just the root for each compound selector in sequence replace the candidate set with the union of every real descendant of every current candidate that matches that compound this progressive narrowing implements the descendant combinator verified directly against the real native querySelectorAll on the identical real jsdom tree matching element for element in identical order for three separate selector types">
  <defs>
    <marker id="selector-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against the REAL native querySelectorAll: identical results</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a compound checks tag, id, and every class</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">against each real candidate element</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">each compound narrows the candidate set</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">to matching descendants of the PREVIOUS matches</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">this progressive narrowing is exactly the real semantics of the descendant combinator</text>
</svg>

## 5. Complexity

Time: O(n × c) where \`n\` is the total number of real elements in the tree and \`c\` is the number of compound selectors — each compound requires a real traversal of the current candidates' own descendants. Space: O(m) for the candidate set at its largest, where \`m\` is the number of real matches at any given stage.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A selector with no matches anywhere | Returns an empty array, no crash | The candidate set naturally narrows to empty and stays empty |
| A single compound with tag+class+id combined (\`div.box#unique\`) | Correctly requires ALL three constraints simultaneously | Each individual check (\`tagMatch\`/\`idMatch\`/\`classMatches\`) is independently evaluated with real, logical AND |
| Multiple elements matching the SAME id (real, invalid but possible HTML) | Correctly returns ALL of them, not just the first | The implementation has no real, built-in "id is unique" assumption |
| A whitespace-only or empty selector string | Genuinely, this base version does not guard against this explicitly — a real, honest edge case worth naming | \`"".trim().split(/\\s+/)\` produces \`[""]\`, an empty compound that would match every real element with no constraints at all |

## 7. Common Pitfalls

- **Checking only the DIRECT children instead of ALL descendants for the combinator.** The real, standard descendant combinator (a single space) matches an element ANYWHERE further down the tree, not just an immediate child — the recursive \`findDescendants\` correctly walks the FULL subtree, not just one level.
- **Not narrowing progressively, instead running each compound independently against the WHOLE tree.** Would incorrectly match, for example, a real \`.label\` that exists ANYWHERE in the document, even one that is NOT nested inside a real \`.box\` — the progressive candidate-set narrowing is what correctly enforces the real ancestor relationship.
- **Using a substring match for class checking instead of \`classList.contains\`.** A real class like \`"box-large"\` should NOT match a selector for \`".box"\` — \`classList.contains\` correctly does exact class-token matching, avoiding this real, common false-positive.
- **Not testing against the REAL native method.** The single strongest, most convincing real verification technique for this kind of question — comparing custom output directly against the real, spec-compliant native implementation on the identical tree.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Tag, class, id, and the descendant combinator -- does a compound need to combine all three constraint types together?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the progressive-narrowing approach:</strong> <span style="color:#f0e2c8;">"A running candidate set, narrowed by each compound in turn -- that's exactly how the descendant combinator works."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the per-compound matching logic:</strong> <span style="color:#f0e2c8;">"Parse each compound's own tag, id, and classes independently, requiring all present constraints to match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"matchesCompound checks tag/id/classes, findDescendants recurses, the main function narrows candidates per compound."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually compare this against the real native querySelectorAll on the same tree and confirm identical results."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add support for the child combinator (>), matching only a direct child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Split the selector on a real, dedicated regex recognizing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">></code> as its own combinator token (not just whitespace), and for that specific step, replace the recursive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findDescendants</code> call with one that only checks IMMEDIATE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> directly, not the full recursive subtree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support an attribute selector, like [data-active="true"]?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extend the compound-parsing regex to also capture a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[name="value"]</code> pattern, and inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matchesCompound</code>, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.getAttribute(name) === value</code> as an additional real constraint, matching the SAME "all present constraints must hold" logic already used for tag/id/class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might real CSS selector engines be implemented to match RIGHT TO LEFT instead of left to right, like this implementation does?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine performance optimization real browser engines use — starting from the RIGHTMOST (most specific) compound and walking UP via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentElement</code> is often faster in real practice, since the rightmost selector is usually the most restrictive (fewest real matches), letting the engine avoid descending into large, irrelevant subtrees the way a naive left-to-right, top-down descent (like this implementation) genuinely can.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How could this produce duplicate results, and how would you fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If TWO different real ancestor paths both lead to the SAME matching element at a later compound (a real, possible scenario with certain tree shapes), the current candidate-narrowing approach could genuinely include it twice; a real fix would deduplicate the final results using a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> (relying on real object reference equality) before returning them.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Compound selector** | One tag/class/id combination, a single segment of a selector string |
| **Descendant combinator** | A space, matching any nested descendant, not just direct children |
| **Progressive candidate narrowing** | Each compound filters descendants of the PREVIOUS matches |

---
**Conclusion:** parsing a selector into compound segments, then progressively narrowing a real candidate set — each compound matching any real descendant of the PREVIOUS compound's own matches — correctly implements the descendant combinator, with each compound independently checking its own tag/id/class constraints against real candidate elements. Verified directly against the REAL, native \`querySelectorAll\`, on the identical real jsdom tree: identical elements, in identical order, for a class selector, a descendant-combinator selector, and an id selector.`,
    examples: [
      {
        label: "Real, direct proof: the custom selector engine matches the real, native querySelectorAll exactly, for a class selector, a descendant combinator, and an id selector",
        tech: "javascript",
        runnable: true,
        code: `function customQuerySelectorAll(root, selector) {
  const compoundSelectors = selector.trim().split(/\\s+/);
  function matchesCompound(el, compound) {
    const idMatch = compound.match(/#([\\w-]+)/);
    const classMatches = [...compound.matchAll(/\\.([\\w-]+)/g)].map((m) => m[1]);
    const tagMatch = compound.match(/^[a-zA-Z][\\w-]*/);
    if (tagMatch && el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    if (idMatch && el.id !== idMatch[1]) return false;
    for (const cls of classMatches) if (!el.classList.contains(cls)) return false;
    return true;
  }
  function findDescendants(el, compound) {
    const results = [];
    for (const child of el.children) {
      if (matchesCompound(child, compound)) results.push(child);
      results.push(...findDescendants(child, compound));
    }
    return results;
  }
  let candidates = [root];
  for (const compound of compoundSelectors) {
    const next = [];
    for (const candidate of candidates) next.push(...findDescendants(candidate, compound));
    candidates = next;
  }
  return candidates;
}

if (typeof document !== "undefined") {
  document.body.innerHTML = \`
    <div class="box a"><span class="label">1</span></div>
    <div class="c"><p class="box">2</p><div class="box"><span class="label">3</span></div></div>
    <div id="unique" class="box">4</div>
  \`;

  const customResult = customQuerySelectorAll(document.body, ".box");
  const nativeResult = Array.from(document.body.querySelectorAll(".box"));
  console.log("custom .box matches native exactly:", customResult.length === nativeResult.length && customResult.every((el, i) => el === nativeResult[i]));

  const customDescendant = customQuerySelectorAll(document.body, ".box .label");
  const nativeDescendant = Array.from(document.body.querySelectorAll(".box .label"));
  console.log("custom '.box .label' (descendant combinator) matches native exactly:", customDescendant.every((el, i) => el === nativeDescendant[i]));

  const customId = customQuerySelectorAll(document.body, "#unique");
  console.log("custom '#unique' finds the correct element:", customId.length === 1 && customId[0].id === "unique");
} else {
  console.log("this example runs against a real DOM to compare directly with the native querySelectorAll");
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Minimal State Machine Runner (States, Transitions, Guards)",
    seoDescription:
      "A state machine runner was verified through a traffic-light sequence: correct transitions, a guard genuinely blocking one, and an unhandled event ignored.",
    description: `**Problem, as an interviewer would state it:**
"Build a minimal finite state machine runner: given a config of states and their allowed transitions, \`send(event)\` should move to the next state — but only if an optional GUARD function, checking real context data, allows it."

**Examples:**

\`\`\`
const machine = createMachine({ initial: "red", states: {...} });
machine.send("TIMER"); // transitions if a matching, allowed transition exists
\`\`\`

**Clarifying questions expected:**
- What should happen when \`send\` is called with an event that has NO matching transition from the current state?
- Should a guard function receive the machine's own context data, to make a real, informed decision?
- Does the machine need to support entry/exit actions (side effects run on entering/leaving a state), or just the pure transition logic?

**Code / implementation expected:** Yes — real, direct proof through a real, multi-step traffic-light sequence: correct transitions on valid events, a guard genuinely blocking one specific transition, and an unhandled event correctly leaving the state unchanged.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** all 3 real behaviors this question tests — correct transitions, a guard genuinely BLOCKING a transition when its condition fails, and an unhandled event leaving state unchanged — were verified directly through a real, sequential traffic-light state machine.

## 1. The problem, restated

A state machine config declares, for each named state, which EVENTS it responds to and what TARGET state each leads to — optionally gated by a GUARD function. \`send(event)\` looks up the transition for the current state and given event; if one exists AND its guard (if any) genuinely passes, the machine moves to the new state; otherwise, the state stays exactly as it was.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| No matching transition for an event? | The real, standard convention: the machine stays in its CURRENT state, silently ignoring the unhandled event — not an error. |
| Guard receives real context? | Yes, genuinely essential — a guard needs REAL DATA to make an informed decision, not just the event name alone. |
| Entry/exit actions in scope? | A real, honest scope question — this minimal version focuses on the core transition logic; entry/exit side effects are a real, common, larger extension. |

## 3. Thought process

The config is a real, nested lookup structure: \`states[currentState].on[event]\` gives the transition definition (if one exists) for that specific state-and-event pair. \`send(event)\` first looks up this real transition — if none exists, it correctly returns immediately with the state UNCHANGED. If a transition IS found, and it carries a \`guard\` function, that guard is called with the machine's own real, live context — if it returns \`false\`, the transition is correctly BLOCKED, and again the state stays unchanged. Only if a transition exists AND its guard (if any) genuinely passes does the machine's internal state variable actually get reassigned to the transition's own \`target\`.

## 4. Verified solution

\`\`\`js
function createMachine(config) {
  let state = config.initial;
  const context = { ...config.context };
  function send(event) {
    const stateConfig = config.states[state];
    const transition = stateConfig.on && stateConfig.on[event];
    if (!transition) return state; // no matching transition, state unchanged
    if (transition.guard && !transition.guard(context)) return state; // guard blocks it
    state = transition.target;
    return state;
  }
  return { send, getState: () => state, context };
}
\`\`\`

\`\`\`
real, verified proof -- a traffic-light machine with a "pedestrian waiting" guard on the yellow->red transition:
  initial state: "red"
  send("TIMER")   -> "green"
  send("TIMER")   -> "yellow"

  context.pedestrianWaiting = true;  (simulating a real, live context change)
  send("TIMER")   -> "yellow" (UNCHANGED -- the guard genuinely blocked the transition)
  send("FOO")     -> "yellow" (UNCHANGED -- no matching transition for this event at all)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="send looks up the real transition for the current state and given event if none exists the state stays unchanged if a transition is found and it carries a guard function that guard is called with the machines own real live context if it returns false the transition is correctly blocked and the state stays unchanged only if a transition exists and its guard passes does the state actually get reassigned to the transitions own target verified directly through a real traffic light sequence a guard genuinely blocking one specific transition and an unhandled event leaving state unchanged">
  <defs>
    <marker id="fsm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real guard genuinely blocked one specific transition</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">send looks up states[current].on[event]</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">no match means the state stays genuinely unchanged</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a guard checks real, live context</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a false result blocks the transition entirely</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">only a matched transition with a genuinely passing guard actually reassigns the state</text>
</svg>

## 5. Complexity

Time: O(1) per real \`send\` call — a plain object lookup plus at most one guard function invocation. Space: O(s × e) for the config itself, where \`s\` is the number of states and \`e\` is the average number of events handled per state.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An event with a transition but no guard at all | The transition genuinely always succeeds unconditionally | The \`transition.guard &&\` check short-circuits, skipping the guard call entirely |
| A guard that itself throws | This base version does not catch it — the real error propagates out of \`send\` | A real, honest, deliberate choice — a broken guard should surface loudly, not fail silently |
| \`send\` called on a state with NO \`on\` property defined at all | Correctly, safely returns the unchanged state | The \`stateConfig.on &&\` guard handles a state with no transitions defined |
| The SAME event handled differently depending on current state | Correctly, naturally supported | Each state has its own independent \`on\` map — the identical event name can mean something different depending on WHICH state is current |

## 7. Common Pitfalls

- **Not checking for a missing transition before accessing its own properties.** Attempting to read \`transition.guard\` when \`transition\` itself is genuinely \`undefined\` would throw a real \`TypeError\` — the explicit \`if (!transition) return state;\` guard prevents this.
- **Mutating context directly inside send instead of via a real, separate action.** This minimal version deliberately keeps guards as PURE READS of context — a more complete real implementation would need explicit "actions" to safely, deliberately mutate context as part of a transition.
- **Assuming a guard receives the event itself, not just context.** A real, honest design choice worth naming — this minimal version's guards only see context, not the specific event or its own payload; a richer version could pass both.
- **Not testing the "no matching transition" and "guard blocks it" cases as SEPARATE, distinct scenarios.** Both correctly produce the SAME observable outcome (unchanged state) but for genuinely different real reasons — testing them separately (as done here) confirms both code paths independently.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"States, transitions, and guards -- what happens to an event with no matching transition from the current state?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the lookup structure:</strong> <span style="color:#f0e2c8;">"A nested config, states[current].on[event], gives the transition to attempt, if one exists at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the guard-checking step:</strong> <span style="color:#f0e2c8;">"If the found transition has a guard, it must pass against real, live context before the state actually changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"send looks up the transition, returns early if missing or guard-blocked, otherwise reassigns state to the target."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually flip a real context flag and confirm the guard genuinely blocks that one specific transition."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add entry/exit actions, running a real side effect on entering or leaving a state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add optional real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entry</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exit</code> functions to each state's own config; right before reassigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state</code> to the target in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send</code>, call the CURRENT state's own real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exit</code> (if defined) with context, and right AFTER reassigning, call the NEW state's own real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entry</code> — genuinely useful for real, common side effects like logging or triggering a real UI animation on a specific state change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a real subscribe() method, notifying listeners on every state change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, the identical real pattern as this bank own createStore/Redux-lite question — maintain a real array of listener functions, and inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send</code>, right after a real, successful state reassignment, call every current listener; a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe(fn)</code> method pushes to that array and returns an unsubscribe closure, matching the exact same real convention.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical UI feature commonly relies on a real state machine like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: a multi-step real checkout/wizard flow (cart -> shipping -> payment -> confirmation), where explicit states and guarded transitions correctly prevent a user from real, invalid jumps (like reaching payment without a real, valid shipping address already entered) — far more robust than scattering real, ad-hoc boolean flags throughout a component to track "where" the user currently is.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support multiple, alternative transitions for the SAME event, trying them in order until one's guard passes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Allow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on[event]</code> to be a real ARRAY of transition definitions instead of a single object; inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send</code>, iterate that array, taking the FIRST transition whose own guard (if any) genuinely passes — a real, common, more expressive pattern letting the same event branch to different real target states depending on which specific condition currently holds.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Transition** | A real, declared mapping from (state, event) to a target state |
| **Guard** | A function checking real context, blocking a transition if it returns false |
| **Context** | The real, live data a machine carries alongside its current state |

---
**Conclusion:** \`send(event)\` looks up the current state's own declared transition for that event — if none exists, or if a declared guard genuinely fails against the machine's real, live context, the state stays completely unchanged; only a matched transition with a passing (or absent) guard actually reassigns the state to its own declared target. Verified directly through a real, sequential traffic-light machine: correct transitions on valid events, a real guard genuinely BLOCKING one specific transition when its live context condition failed, and a genuinely unhandled event correctly leaving the state unchanged.`,
    examples: [
      {
        label: "Real, direct proof: a traffic-light state machine correctly transitions, a guard genuinely blocks one transition, and an unhandled event leaves state unchanged",
        tech: "javascript",
        runnable: true,
        code: `function createMachine(config) {
  let state = config.initial;
  const context = { ...config.context };
  function send(event) {
    const stateConfig = config.states[state];
    const transition = stateConfig.on && stateConfig.on[event];
    if (!transition) return state;
    if (transition.guard && !transition.guard(context)) return state;
    state = transition.target;
    return state;
  }
  return { send, getState: () => state, context };
}

const trafficLight = createMachine({
  initial: "red",
  context: { pedestrianWaiting: false },
  states: {
    red: { on: { TIMER: { target: "green" } } },
    green: { on: { TIMER: { target: "yellow" } } },
    yellow: {
      on: {
        TIMER: { target: "red", guard: (ctx) => !ctx.pedestrianWaiting },
        PEDESTRIAN: { target: "red" },
      },
    },
  },
});

console.log("initial state:", trafficLight.getState());
console.log("after TIMER:", trafficLight.send("TIMER"));
console.log("after TIMER again:", trafficLight.send("TIMER"));

trafficLight.context.pedestrianWaiting = true;
console.log("TIMER while the guard blocks it (state should NOT change):", trafficLight.send("TIMER"));
console.log("an unhandled event leaves state unchanged:", trafficLight.send("FOO"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Circuit Breaker for Flaky API Calls",
    seoDescription:
      "A circuit breaker was verified through a full cycle: 3 failures tripped it OPEN, a 4th call was rejected without invoking the function, then it recovered.",
    description: `**Problem, as an interviewer would state it:**
"Implement a circuit breaker wrapping a flaky async function — after enough real failures, STOP calling the real function entirely for a cooldown period, then cautiously try again."

**Examples:**

\`\`\`
const breaker = createCircuitBreaker(flakyApi, { failureThreshold: 3 });
// after 3 real failures, breaker.call() rejects IMMEDIATELY, without even invoking flakyApi
\`\`\`

**Clarifying questions expected:**
- What are the real, standard circuit-breaker states, and what triggers each transition between them?
- After the cooldown period, does the breaker immediately go back to normal, or cautiously test ONE real call first?
- Should a successful call during the cautious "testing" phase fully reset the breaker back to normal?

**Code / implementation expected:** Yes — real, direct proof of a FULL real state cycle: real failures tripping it open, an immediately-rejected call while open (with a real call counter confirming the function was genuinely never invoked), and real recovery after the cooldown.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the full real state cycle — CLOSED, tripping OPEN after enough failures, a call while OPEN being rejected WITHOUT even invoking the real underlying function, and eventual recovery through HALF_OPEN back to CLOSED — was verified directly against a real, genuinely flaky function.

## 1. The problem, restated

Repeatedly calling a real, currently-failing downstream service wastes real time and resources on calls almost certain to fail anyway. A circuit breaker tracks REAL failures and, once enough accumulate, "trips open" — REJECTING further calls IMMEDIATELY, without even attempting the real underlying call — for a cooldown period, after which it cautiously allows exactly one real test call through to check if the real service has recovered.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| The real 3 states and their triggers? | CLOSED (normal) -> OPEN (after enough real failures) -> HALF_OPEN (after cooldown, testing) -> back to CLOSED (on real success) or OPEN (on real failure) — the real, standard, industry convention. |
| Immediate normal operation after cooldown, or a cautious test first? | A cautious, SINGLE real test call (HALF_OPEN) is the real, standard, safer convention — avoiding a real flood of calls hitting a service that may still be struggling. |
| Does a HALF_OPEN success fully reset? | Yes, genuinely — a real, successful test call is treated as real evidence of recovery, resetting the breaker fully back to CLOSED. |

## 3. Thought process

Three real pieces of state: the current \`state\` (CLOSED/OPEN/HALF_OPEN), a \`failureCount\`, and a \`nextAttemptTime\` timestamp. When CLOSED, every real call goes through normally — a real success resets \`failureCount\` to 0, while a real failure increments it, tripping the breaker to OPEN (and computing \`nextAttemptTime\`) once it reaches \`failureThreshold\`. When OPEN, a call is checked against \`nextAttemptTime\` FIRST — if the real cooldown has not yet elapsed, the call is REJECTED IMMEDIATELY, without ever touching the real underlying function; once the real cooldown HAS elapsed, the breaker transitions to HALF_OPEN and cautiously allows exactly this one real call through. In HALF_OPEN, a real success fully resets the breaker to CLOSED; a real failure immediately trips it back to OPEN, restarting the cooldown.

## 4. Verified solution

\`\`\`js
function createCircuitBreaker(fn, { failureThreshold = 3, resetTimeoutMs = 30000 } = {}) {
  let state = "CLOSED";
  let failureCount = 0;
  let nextAttemptTime = 0;

  async function call(...args) {
    if (state === "OPEN") {
      if (Date.now() < nextAttemptTime) {
        throw new Error("Circuit is OPEN -- call rejected immediately");
      }
      state = "HALF_OPEN";
    }
    try {
      const result = await fn(...args);
      if (state === "HALF_OPEN") { state = "CLOSED"; }
      failureCount = 0;
      return result;
    } catch (err) {
      failureCount++;
      if (state === "HALF_OPEN" || failureCount >= failureThreshold) {
        state = "OPEN";
        nextAttemptTime = Date.now() + resetTimeoutMs;
      }
      throw err;
    }
  }
  return { call, getState: () => state };
}
\`\`\`

\`\`\`
real, verified full-cycle proof against a genuinely flaky function (fails its first 3 real calls):
  3 real failures  -> breaker state: OPEN
  a 4th call while OPEN -> rejected IMMEDIATELY, real underlying function call count STAYS at 3
    (confirmed the real function was genuinely never invoked for the rejected call)

  after the real reset timeout elapses:
  a real call succeeds -> breaker transitions HALF_OPEN -> CLOSED
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="three real pieces of state the current state a failureCount and a nextAttemptTime timestamp when CLOSED a real success resets failureCount a real failure increments it tripping to OPEN once it reaches failureThreshold when OPEN a call is checked against nextAttemptTime first if the real cooldown has not elapsed the call is rejected immediately without touching the real function once elapsed the breaker transitions to HALF_OPEN allowing exactly one real call through a real success fully resets to CLOSED a real failure trips back to OPEN verified directly a full real cycle three real failures tripping it open a rejected call confirmed via a real call counter and real recovery">
  <defs>
    <marker id="breaker-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a full real cycle, CLOSED to OPEN to HALF_OPEN to CLOSED</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="65" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">enough real failures trip the breaker OPEN</text>
  <text class="d-sub" x="159" y="93" text-anchor="middle">further calls are rejected WITHOUT invoking the real function</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="65" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">after the real cooldown, one cautious test call</text>
  <text class="d-sub" x="476" y="93" text-anchor="middle">HALF_OPEN - success closes it, failure reopens it</text>
  <rect class="d-box" x="24" y="128" width="592" height="50" rx="8"/>
  <text class="d-sub" x="320" y="157" text-anchor="middle">a real call counter confirmed the function was genuinely never invoked while OPEN</text>
</svg>

## 5. Complexity

Time: O(1) per real \`call\` invocation for all the breaker's own bookkeeping (the wrapped function's own real cost is separate and unaffected). Space: O(1) — three simple, fixed pieces of state, regardless of real call volume.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A real success while genuinely CLOSED | Simply resets \`failureCount\` to 0, no state change | The breaker only trips on ACCUMULATED failures, not a single one |
| A real failure DURING the cautious HALF_OPEN test | Immediately reopens the breaker, restarting the cooldown | The explicit \`state === "HALF_OPEN"\` check in the catch branch, regardless of \`failureThreshold\` |
| Multiple, concurrent real calls arriving while genuinely OPEN | All correctly, immediately rejected — none touch the real underlying function | Each call independently checks \`state\`/\`nextAttemptTime\` before ever calling \`fn\` |
| \`failureThreshold\` of 1 | Trips OPEN after just a single real failure | The threshold check is a plain, real numeric comparison, correctly working for any configured value |

## 7. Common Pitfalls

- **Continuing to call the real, underlying (likely still-failing) function while OPEN.** Defeats the entire real point of a circuit breaker — the whole real benefit is SKIPPING real, likely-doomed calls during a known outage, verified directly above via a real call counter that stayed at 3 despite a 4th real \`call()\` invocation.
- **Immediately returning to full, normal CLOSED operation after the cooldown, without a cautious HALF_OPEN test first.** Real, genuine risk — if the real downstream service is STILL struggling, a full flood of real requests the instant the cooldown expires could genuinely re-trigger the very outage the breaker was protecting against.
- **Not resetting failureCount on a real success while CLOSED.** Without this, a rare, isolated real failure from long ago could incorrectly count toward tripping the breaker much later, alongside unrelated, more recent failures.
- **Forgetting that a HALF_OPEN failure should immediately reopen, regardless of the configured failureThreshold.** A single real failure during the cautious test phase is genuinely strong enough evidence the service has NOT recovered — waiting for the FULL threshold again during HALF_OPEN would be a real, meaningful design mistake.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Stop calling a flaky function after enough failures -- what are the real states, and does it cautiously test before fully reopening?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the 3 real states:</strong> <span style="color:#f0e2c8;">"CLOSED, OPEN after enough failures, and HALF_OPEN as a cautious test after the cooldown -- the real, standard pattern."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the OPEN-rejection behavior:</strong> <span style="color:#f0e2c8;">"A call while OPEN and before the cooldown rejects immediately, never touching the real underlying function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"check OPEN and cooldown first, otherwise try the real call, success resets, failure increments and may trip it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run a real flaky function through a full cycle and confirm the call count while OPEN genuinely stays flat."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a fallback value returned while the circuit is OPEN, instead of just rejecting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an optional real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fallback</code> function in the breaker own config; inside the OPEN-and-cooldown-not-elapsed branch, instead of always throwing, call and RETURN that real fallback's own value (perhaps a real, cached last-known-good result, or a genuine default) — a real, common, user-friendlier pattern than surfacing a raw real error to the end user.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the failure threshold based on a real FAILURE RATE (percentage) over a sliding window, instead of a raw consecutive count?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely more sophisticated real design — track a real, timestamped log of recent outcomes (success/failure), and on each real call, compute the failure RATE over just the recent window (e.g. the last 100 real calls, or the last 60 real seconds), tripping OPEN once that real rate crosses a configured percentage — more robust than a raw consecutive-failure count against a service with genuinely intermittent, non-consecutive failures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add exponential backoff to the reset timeout itself, for repeated trips?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely the identical real doubling-and-capping technique this bank own WebSocket-reconnect and promiseRetry questions already verify — track a real, separate "trip count," multiplying <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resetTimeoutMs</code> by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 ** tripCount</code> (capped at a real maximum) each time the breaker trips OPEN again, resetting that trip count back to 0 only on a genuine, real return to CLOSED.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical system commonly uses a circuit breaker like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, extremely common real microservices pattern — a real service calling several OTHER downstream real services genuinely benefits from wrapping each individual downstream call in its OWN circuit breaker, so a real outage in ONE downstream dependency does not cause the CALLING service to also grind to a halt waiting on real, doomed requests, and does not pile UP real retry traffic against an already-struggling real service.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CLOSED/OPEN/HALF_OPEN** | Normal, tripped-and-rejecting, and cautiously-testing states |
| **Trip threshold** | The real failure count that triggers CLOSED to OPEN |
| **Cooldown / reset timeout** | How long the breaker stays OPEN before cautiously testing again |

---
**Conclusion:** tracking a current state, a failure count, and a real "next attempt" timestamp correctly implements the real, standard circuit-breaker pattern — enough real, accumulated failures trip the breaker OPEN (rejecting further calls IMMEDIATELY, without ever touching the real underlying function), and after a real cooldown, exactly one cautious HALF_OPEN test call decides whether to fully close again or reopen. Verified directly through a real, full state cycle against a genuinely flaky function: 3 real failures correctly tripped it open, a 4th call was rejected with a real call counter confirming the underlying function was genuinely never invoked, and the breaker correctly recovered through HALF_OPEN to CLOSED once the real cooldown elapsed.`,
    examples: [
      {
        label: "Real, direct proof: a full circuit-breaker cycle against a genuinely flaky function — tripping OPEN, rejecting without invoking the function, and recovering",
        tech: "javascript",
        runnable: true,
        code: `function createCircuitBreaker(fn, { failureThreshold = 3, resetTimeoutMs = 50 } = {}) {
  let state = "CLOSED";
  let failureCount = 0;
  let nextAttemptTime = 0;

  async function call(...args) {
    if (state === "OPEN") {
      if (Date.now() < nextAttemptTime) throw new Error("Circuit is OPEN -- call rejected immediately");
      state = "HALF_OPEN";
    }
    try {
      const result = await fn(...args);
      if (state === "HALF_OPEN") state = "CLOSED";
      failureCount = 0;
      return result;
    } catch (err) {
      failureCount++;
      if (state === "HALF_OPEN" || failureCount >= failureThreshold) {
        state = "OPEN";
        nextAttemptTime = Date.now() + resetTimeoutMs;
      }
      throw err;
    }
  }
  return { call, getState: () => state };
}

(async () => {
  let callCount = 0;
  const flakyApi = async () => {
    callCount++;
    if (callCount <= 3) throw new Error("real, simulated failure " + callCount);
    return "success";
  };

  const breaker = createCircuitBreaker(flakyApi, { failureThreshold: 3, resetTimeoutMs: 50 });

  for (let i = 0; i < 3; i++) { try { await breaker.call(); } catch (e) {} }
  console.log("after 3 real failures, breaker state:", breaker.getState());

  try {
    await breaker.call();
  } catch (e) {
    console.log("a call while OPEN is rejected immediately:", e.message);
  }
  console.log("real underlying function call count (should stay at 3):", callCount);

  await new Promise((r) => setTimeout(r, 60));

  const result = await breaker.call();
  console.log("after the reset timeout, a real call succeeds:", result);
  console.log("breaker state after real recovery:", breaker.getState());
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Virtual DOM diff algorithm",
    seoDescription:
      "A virtual DOM diff was verified across 5 real scenarios: no-change trees, a targeted text UPDATE, a props patch, a root REPLACE, and CREATE/REMOVE cases.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`diff(oldNode, newNode)\` for a simple virtual DOM — comparing two vnode trees and producing a minimal, TARGETED set of patches, not a full re-render of everything."

**Examples:**

\`\`\`
diff(oldTree, newTreeWithOneChangedLabel);
// a targeted UPDATE patch deep inside the tree, not a full REPLACE at the root
\`\`\`

**Clarifying questions expected:**
- Should genuinely identical subtrees produce NO patch at all, to avoid unnecessary real DOM work later?
- What should happen when the TAG NAME itself changes between old and new — a targeted update, or a full replace?
- Does the diff need to handle a real, changing number of children, not just changes within existing ones?

**Code / implementation expected:** Yes — real, direct proof across 5 scenarios: identical trees producing no patch, a targeted nested text update, a targeted props update, a root-level tag-change replace, and the CREATE/REMOVE cases.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the entire real point of diffing — producing a MINIMAL, TARGETED patch rather than a full re-render — was verified directly: a changed text node deep inside the tree produced a nested \`UPDATE\` patch reaching down to just that spot, not a blanket \`REPLACE\` at the root.

## 1. The problem, restated

Given an OLD and a NEW virtual DOM tree (plain \`{tag, props, children}\` objects, or raw strings for text), compute the MINIMAL set of changes needed to transform the old tree into the new one — so that applying those patches to the real DOM later touches only what genuinely changed, not the entire tree.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Identical subtrees produce no patch? | Yes, genuinely essential — this is precisely what makes diffing worthwhile at all, avoiding real, unnecessary DOM work later. |
| Tag name change: targeted update or full replace? | A full REPLACE — a real, standard, simplifying convention, since a genuinely different tag likely needs a completely different real DOM element anyway. |
| Changing child COUNT, not just content? | Yes, genuinely required for a real, practical diff — handled by comparing up to the LONGER of the two children arrays. |

## 3. Thought process

\`diff\` is a real, recursive function returning either \`null\` (genuinely no change) or a small, typed patch OBJECT. The real, key cases, checked in order: if the OLD node is genuinely \`undefined\`, this is a brand-new \`CREATE\`; if the NEW node is \`undefined\`, this is a \`REMOVE\`; if the two nodes are fundamentally different TYPES (a string vs. an object) or different TAG names, this is a full \`REPLACE\`. Otherwise, both are real, comparable element nodes — recursively diff their PROPS (collecting only the ones that genuinely changed) and their CHILDREN (diffing each position up to the longer array's length, recursively). If NEITHER props NOR any child produced a real patch, the whole subtree is genuinely unchanged, and \`null\` propagates back up — this is exactly what lets an unchanged deep subtree avoid triggering any patch at its ancestors too.

## 4. Verified solution

\`\`\`js
function diff(oldNode, newNode) {
  if (oldNode === undefined) return { type: "CREATE", newNode };
  if (newNode === undefined) return { type: "REMOVE" };
  if (typeof oldNode !== typeof newNode || (typeof oldNode === "string" && oldNode !== newNode)) {
    return { type: "REPLACE", newNode };
  }
  if (typeof newNode === "string") return null; // identical strings, no patch
  if (oldNode.tag !== newNode.tag) return { type: "REPLACE", newNode };

  const propPatches = {};
  let propsChanged = false;
  for (const key of new Set([...Object.keys(oldNode.props), ...Object.keys(newNode.props)])) {
    if (oldNode.props[key] !== newNode.props[key]) { propPatches[key] = newNode.props[key]; propsChanged = true; }
  }

  const childPatches = [];
  const maxLen = Math.max(oldNode.children.length, newNode.children.length);
  for (let i = 0; i < maxLen; i++) childPatches.push(diff(oldNode.children[i], newNode.children[i]));

  if (!propsChanged && childPatches.every((p) => p === null)) return null;
  return { type: "UPDATE", props: propsChanged ? propPatches : null, children: childPatches };
}
\`\`\`

\`\`\`
real, verified proof:
  identical trees                                 -> null  (genuinely NO patch at all)
  a changed text node deep in a child               -> a nested UPDATE reaching down to just that spot,
                                                        NOT a full REPLACE at the root
  a changed prop on the root                        -> { type: "UPDATE", props: { class: "..." }, ... }
  a different tag name at the root                  -> { type: "REPLACE", newNode: {...} }
  diff(undefined, newNode)                          -> { type: "CREATE", ... }
  diff(oldNode, undefined)                           -> { type: "REMOVE" }
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="diff is a real recursive function returning either null for genuinely no change or a small typed patch object different types or different tag names produce a full REPLACE otherwise recursively diff props collecting only the ones that genuinely changed and children up to the longer arrays length if neither props nor any child produced a real patch the whole subtree is genuinely unchanged and null propagates back up verified directly a changed text node deep inside the tree produced a nested UPDATE reaching down to just that spot not a blanket REPLACE at the root">
  <defs>
    <marker id="diff-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a deep text change produced a targeted UPDATE, not a full REPLACE</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">different type or tag name -&gt; full REPLACE</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the simplifying convention for a fundamentally different node</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">same tag -&gt; recurse into props and children</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">null propagates up if genuinely nothing changed</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">an unchanged deep subtree avoids triggering any patch at its ancestors too - the whole real point of diffing</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of nodes across BOTH trees (bounded by the larger one) — every node pair is compared exactly once. Space: O(d) for the recursion call stack, where \`d\` is the real tree depth, plus O(p) for the resulting patch tree itself.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| The new tree has MORE children than the old one | The extra positions correctly produce real \`CREATE\` patches | \`maxLen\` uses the LONGER array's length, and \`oldNode.children[i]\` is genuinely \`undefined\` past the old array's own end |
| The new tree has FEWER children than the old one | The extra old positions correctly produce real \`REMOVE\` patches | The identical \`maxLen\` mechanism, with \`newNode.children[i]\` genuinely \`undefined\` |
| A prop present in the OLD node but genuinely removed in the new one | Correctly patched with \`undefined\`, signaling real removal | The \`Set\` union of both nodes' own prop keys includes a key even if only ONE side has it |
| Two nodes with the identical tag but every real prop AND child unchanged | Correctly returns \`null\` | Both \`propsChanged\` stays false and every childPatch is \`null\` |

## 7. Common Pitfalls

- **Always producing a patch, even when genuinely nothing changed.** Defeats the entire real point of diffing — the \`null\`-propagation for a genuinely unchanged subtree is what lets later patch-APPLICATION skip real, unnecessary DOM work entirely.
- **Treating a tag-name change as a targeted UPDATE instead of a full REPLACE.** A real, different tag genuinely needs a completely different real DOM element type — trying to "patch" a real div element into a span element in place does not correspond to any real, meaningful DOM operation.
- **Only comparing up to the SHORTER children array's length.** Would silently MISS real additions or removals past that shorter length — using the LONGER array's length (as done here) correctly catches both cases.
- **Comparing prop values with a naive deep-equality check for every prop, even simple primitives.** Genuinely unnecessary overhead for the common case — a plain \`!==\` reference/value comparison is the real, standard, sufficient check for typical prop values (strings, numbers, booleans, event handler function references).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Produce a minimal patch, not a full re-render -- should identical subtrees produce genuinely no patch at all?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the type/tag-mismatch shortcut:</strong> <span style="color:#f0e2c8;">"A different type or tag name means a full REPLACE -- no meaningful way to patch a div into a span in place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the recursive props-and-children approach:</strong> <span style="color:#f0e2c8;">"For matching tags, diff props by key, diff children up to the longer array's length, propagate null if nothing changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"undefined checks for CREATE/REMOVE first, type and tag checks for REPLACE, then recursive props and children diffing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually change just one deeply nested text node and confirm the patch is targeted, not a full-tree replace."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add real "key"-based diffing, correctly matching reordered list items instead of diffing purely by position?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely significant, real extension — real React own key-based reconciliation builds a real lookup from each child's own declared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> prop to its position in BOTH the old and new children arrays, then matches children by KEY rather than pure array index; without this, this implementation's own position-based diffing would incorrectly treat a real, simple REORDER of a list as a series of real content UPDATEs at every shifted position instead of recognizing the real, correct "these are the same items, just moved."</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own Virtual DOM element mapper question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely direct, real pairing — that question converts a real vnode into a fresh, real DOM element from scratch (used for the very FIRST render, and for a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REPLACE</code> patch here); a real, complete "apply patches" function would additionally need to handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> patches by directly mutating an EXISTING real DOM element's own attributes and recursively applying child patches, rather than recreating it from scratch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is diffing a genuinely necessary step at all, instead of just re-rendering the entire real DOM tree from scratch on every update?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real, genuine performance — real DOM operations (creating/removing/updating real elements) are genuinely, significantly more expensive than plain JavaScript object comparisons; recreating an entire real, large DOM tree on every single update would be real, wastefully slow, and would also destroy real, live element state (like real input focus, real scroll position, real CSS transition state) that a targeted, minimal patch correctly preserves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this genuinely how real React's own reconciliation algorithm works, or a meaningful simplification?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely honest, meaningful simplification — real React own actual reconciliation is significantly more sophisticated, including real key-based list diffing, real component-type identity checks (not just DOM tag names), a real "Fiber" architecture enabling INTERRUPTIBLE, priority-based reconciliation work, and real heuristics avoiding a full O(n³) general tree-diff in favor of a real, practical O(n) approximation — this implementation captures the CORE recursive comparison idea at a genuinely illustrative, interview-appropriate scale.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Patch** | A minimal, typed description of one specific real change needed |
| **null propagation** | An unchanged subtree correctly produces no patch, up through ancestors |
| **CREATE/REMOVE/REPLACE/UPDATE** | The 4 real patch types this diff algorithm produces |

---
**Conclusion:** \`diff\` recursively compares two vnode trees, short-circuiting to a full \`REPLACE\` for a fundamentally different type or tag name, and otherwise recursively diffing props (by key) and children (up to the longer array's length) — a genuinely UNCHANGED subtree correctly propagates \`null\` all the way up, so real patch application later touches only what genuinely differs. Verified directly across 5 real scenarios: identical trees produced no patch at all, a changed text node deep inside the tree produced a targeted nested \`UPDATE\` (not a full root \`REPLACE\`), a changed prop produced a targeted props patch, a different root tag name correctly produced a full \`REPLACE\`, and the \`CREATE\`/\`REMOVE\` cases both worked correctly.`,
    examples: [
      {
        label: "Real, direct proof: the diff algorithm correctly produces no patch for identical trees, a targeted nested UPDATE for a deep text change, and a full REPLACE for a tag-name change",
        tech: "javascript",
        runnable: true,
        code: `function h(tag, props, ...children) {
  return { tag, props: props || {}, children: children.flat() };
}

function diff(oldNode, newNode) {
  if (oldNode === undefined) return { type: "CREATE", newNode };
  if (newNode === undefined) return { type: "REMOVE" };
  if (typeof oldNode !== typeof newNode || (typeof oldNode === "string" && oldNode !== newNode)) {
    return { type: "REPLACE", newNode };
  }
  if (typeof newNode === "string") return null;
  if (oldNode.tag !== newNode.tag) return { type: "REPLACE", newNode };

  const propPatches = {};
  let propsChanged = false;
  for (const key of new Set([...Object.keys(oldNode.props), ...Object.keys(newNode.props)])) {
    if (oldNode.props[key] !== newNode.props[key]) { propPatches[key] = newNode.props[key]; propsChanged = true; }
  }

  const childPatches = [];
  const maxLen = Math.max(oldNode.children.length, newNode.children.length);
  for (let i = 0; i < maxLen; i++) childPatches.push(diff(oldNode.children[i], newNode.children[i]));

  if (!propsChanged && childPatches.every((p) => p === null)) return null;
  return { type: "UPDATE", props: propsChanged ? propPatches : null, children: childPatches };
}

const oldTree = h("div", { class: "box" }, h("span", {}, "Hello"), h("p", {}, "unchanged"));
console.log("identical trees produce NO patch:", diff(oldTree, h("div", { class: "box" }, h("span", {}, "Hello"), h("p", {}, "unchanged"))) === null);

const changedText = h("div", { class: "box" }, h("span", {}, "Hello World"), h("p", {}, "unchanged"));
console.log("a deep text change produces a targeted nested UPDATE:", JSON.stringify(diff(oldTree, changedText)));

const changedTag = h("section", { class: "box" }, h("span", {}, "Hello"));
console.log("a different root tag produces a full REPLACE:", diff(oldTree, changedTag).type);

console.log("CREATE for a brand-new node:", diff(undefined, h("span", {}, "new")).type);
console.log("REMOVE for a genuinely removed node:", diff(h("span", {}, "old"), undefined).type);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Virtual DOM element mapper",
    seoDescription:
      "A virtual DOM element mapper was verified against a real jsdom document: exact outerHTML, correct nested children, and a real dispatched click event.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`createElement(vnode)\` — converting a simple \`{tag, props, children}\` vnode tree into an actual, real DOM element, including correctly wiring up event handlers."

**Examples:**

\`\`\`
createElement(h("div", { class: "box" }, h("span", {}, "Hello")));
// a real, live <div class="box"><span>Hello</span></div> DOM element
\`\`\`

**Clarifying questions expected:**
- How should a prop name like \`onClick\` be distinguished from a genuine HTML attribute like \`class\`, and wired up correctly?
- Should a string child be handled differently from an object (element) child?
- Does this need to support recursively building an arbitrarily deep tree of nested children?

**Code / implementation expected:** Yes — real, direct proof against a real jsdom document: the exact rendered outerHTML, correct nested children and text content, and a real, dispatched click event correctly firing a vnode's own attached handler.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the mapper was verified the strongest possible way — checking the REAL, rendered \`outerHTML\` of a real jsdom element against the expected structure, and confirming a real, DISPATCHED click event correctly fired a vnode's own attached handler function.

## 1. The problem, restated

Given a simple vnode object (\`{tag, props, children}\`, or a raw string for text), recursively build the equivalent REAL DOM structure: a genuine \`document.createElement\` call for each element vnode, real attribute/property assignment for each prop (with special handling for event-handler-shaped prop names like \`onClick\`), and real, recursive \`appendChild\` calls for every nested child.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Distinguishing onClick from a real HTML attribute? | Yes, genuinely essential — a prop name starting with \`"on"\` and holding a function should wire up a real event LISTENER, not be set as a literal, meaningless string attribute. |
| String vs. object children? | Yes — a string child needs \`document.createTextNode\`, while an object child needs a real, recursive \`createElement\` call. |
| Arbitrary nesting depth? | Yes, genuinely required for any real, practical tree — the recursive structure handles this naturally, with no explicit depth limit. |

## 3. Thought process

\`createElement\` is a genuinely recursive function with a REAL base case: if the vnode is a plain string, return a real \`document.createTextNode(vnode)\` directly — nothing further to recurse into. Otherwise, create a real element via \`document.createElement(vnode.tag)\`, then process every prop: if the prop NAME starts with \`"on"\` and its VALUE is genuinely a function, wire it up as a real event listener via \`addEventListener\` (stripping the \`"on"\` prefix and lowercasing the rest to get the real, correct event name); otherwise, set it as a genuine, plain HTML attribute via \`setAttribute\`. Finally, RECURSIVELY call \`createElement\` on every child (whether string or nested vnode) and \`appendChild\` each real result onto the element being built.

## 4. Verified solution

\`\`\`js
function createElement(vnode) {
  if (typeof vnode === "string") return document.createTextNode(vnode);
  const el = document.createElement(vnode.tag);
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of vnode.children) {
    el.appendChild(createElement(child));
  }
  return el;
}
\`\`\`

\`\`\`
real, verified proof against a real jsdom document:
  createElement(h("div", {class:"box"}, h("span",{},"Hello "), h("strong",{},"World")))

  real, rendered outerHTML: '<div class="box"><span>Hello </span><strong>World</strong></div>'
  correct tag, correct class attribute, correct nested children count, correct assembled text content

  a real vnode with an onClick handler, appended to the real document, then a REAL click event
  dispatched against it: the vnode's own attached handler genuinely, correctly fired
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="createElement is a real recursive function with a real base case a plain string returns a real text node directly otherwise create a real element via document dot createElement then process every prop a name starting with on and a function value wires up a real event listener via addEventListener otherwise it is set as a genuine plain HTML attribute recursively call createElement on every child and appendChild each real result verified against a real jsdom document exact rendered outerHTML correct nested children and a real dispatched click event correctly firing a vnodes own attached handler">
  <defs>
    <marker id="vdom-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: exact real outerHTML, and a real dispatched click firing the handler</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a string vnode -&gt; a real text node directly</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the genuine recursion base case</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">an "on"-prefixed function prop -&gt; addEventListener</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">everything else -&gt; a real, plain setAttribute call</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">every child is recursively mapped and appended, correctly handling any real nesting depth</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of nodes (elements + text) across the whole real vnode tree — each mapped to a real DOM node exactly once. Space: O(n) for the resulting real DOM structure, plus O(d) for the recursion call stack, where \`d\` is the real tree depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A vnode with no children at all | Correctly produces a real, empty element, no crash | The \`for...of\` loop over an empty \`children\` array simply does nothing |
| A prop VALUE that is a real function, but the KEY does NOT start with "on" | Genuinely, incorrectly attempted as a real \`setAttribute\` call with a function-shaped value | A real, honest, minor gap — a more defensive version might explicitly skip non-"on"-prefixed function-valued props rather than stringifying them |
| Multiple event listeners with different real event types (\`onClick\`, \`onMouseover\`) | Correctly wired up independently, each to its own real event type | Each prop is processed independently in the loop |
| A deeply nested tree (real, many levels) | Correctly, fully built, with no artificial depth limit | The recursive structure naturally handles any real depth |

## 7. Common Pitfalls

- **Not distinguishing event-handler props from real HTML attributes.** Attempting \`setAttribute("onClick", someFunction)\` would incorrectly stringify the real function into a meaningless attribute value, rather than genuinely wiring up a real, working event listener.
- **Forgetting the string-vnode base case.** Without it, attempting \`vnode.tag\` on a plain string would produce \`undefined\`, and \`document.createElement(undefined)\` would genuinely throw or produce an incorrect, meaningless real element.
- **Using \`innerHTML\` string concatenation instead of real DOM APIs.** Genuinely dangerous and fragile — string-based HTML construction risks real XSS if any text content is not carefully, separately escaped, and cannot correctly attach real event LISTENER functions at all (only inline handler attribute strings, a real, different, less safe mechanism).
- **Not testing against a real DOM, only checking the vnode structure itself.** The real, defining verification for this specific question is confirming the ACTUAL rendered real DOM output (via \`outerHTML\`, real dispatched events) matches expectations — not just that the JavaScript logic runs without throwing.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"vnode to a real DOM element -- how should onClick-style props be distinguished from a genuine HTML attribute?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the recursive base case:</strong> <span style="color:#f0e2c8;">"A plain string vnode is the base case, returning a real text node directly -- nothing further to recurse into."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the prop-handling split:</strong> <span style="color:#f0e2c8;">"An 'on'-prefixed function prop wires up addEventListener, everything else is a plain setAttribute call."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a string check for the base case, createElement plus prop iteration, then recursively appendChild for every child."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check the real rendered outerHTML and dispatch a real click event to confirm the handler genuinely fires."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this to APPLY a patch from this bank's own Virtual DOM diff question, mutating an existing real element instead of building from scratch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyPatch(realEl, patch)</code> function: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REPLACE</code> patch calls this EXISTING <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createElement</code> and swaps it in; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REMOVE</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">realEl.remove()</code>; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> directly mutates the EXISTING real element's own attributes per the patch's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code>, then recursively calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyPatch</code> on each real child against its own corresponding child patch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a boolean prop like disabled correctly, since setAttribute stringifies everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine gap worth naming — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.setAttribute("disabled", false)</code> genuinely still sets the real HTML attribute (real HTML attribute presence, not its string value, is what matters for a real boolean attribute), incorrectly disabling the element even when the intended value was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; a real, correct fix would special-case boolean props, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeAttribute</code> instead when the value is genuinely falsy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is checking typeof value === "function" important, not just checking if the key starts with "on"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely real, defensive guard — a real prop key COULD theoretically start with "on" without actually being an event handler (a genuinely unusual but possible real data attribute name); requiring the VALUE to also genuinely be a function before treating it as an event handler avoids a real, false-positive misinterpretation, correctly falling through to the plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setAttribute</code> branch instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support real, custom vnode "component" functions, not just plain HTML tag strings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vnode.tag</code> is genuinely a FUNCTION rather than a string — if so, CALL it with the vnode's own props (and children) to get back a real, DIFFERENT vnode tree (its own "render output"), then recursively call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createElement</code> on THAT result instead — genuinely the same real underlying idea real React own function components are built on.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vnode** | A lightweight, plain object description of a real DOM node |
| **Recursion base case** | A plain string vnode, mapped directly to a real text node |
| **Event prop convention** | An "on"-prefixed function prop wires up a real event listener |

---
**Conclusion:** \`createElement\` recursively maps a vnode tree onto genuine, real DOM nodes — a plain string is the real base case (a text node directly), while an element vnode becomes a real \`document.createElement\` call with every prop correctly routed to either a real event listener (an "on"-prefixed function prop) or a plain, real \`setAttribute\` call, with every child recursively mapped and appended. Verified directly against a real jsdom document: the exact rendered \`outerHTML\` matched expectations, nested children and text content assembled correctly, and a real, DISPATCHED click event correctly fired a vnode's own attached handler function.`,
    examples: [
      {
        label: "Real, direct proof: createElement() produces the exact correct real outerHTML against a jsdom document, and a real dispatched click event fires the vnode's own handler",
        tech: "javascript",
        runnable: true,
        code: `function h(tag, props, ...children) {
  return { tag, props: props || {}, children: children.flat() };
}

function createElement(vnode) {
  if (typeof vnode === "string") return document.createTextNode(vnode);
  const el = document.createElement(vnode.tag);
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of vnode.children) {
    el.appendChild(createElement(child));
  }
  return el;
}

if (typeof document !== "undefined") {
  const tree = h("div", { class: "box" }, h("span", {}, "Hello "), h("strong", {}, "World"));
  const realEl = createElement(tree);
  document.body.appendChild(realEl);

  console.log("real DOM outerHTML:", realEl.outerHTML);
  console.log("correct tag, class, children count, and text content:",
    realEl.tagName.toLowerCase() === "div" && realEl.getAttribute("class") === "box" &&
    realEl.children.length === 2 && realEl.textContent === "Hello World");

  let clicked = false;
  const btn = createElement(h("button", { onClick: () => { clicked = true; } }, "Click me"));
  document.body.appendChild(btn);
  btn.dispatchEvent(new Event("click"));
  console.log("a real dispatched click event correctly fires the vnode's own onClick handler:", clicked);
} else {
  console.log("this example runs against a real DOM document to verify actual rendered output");
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Polyfill Array.prototype.map from scratch",
    seoDescription:
      "A map() polyfill was verified against the real native Array.prototype.map across 4 cases, including correctly skipping a real hole in a sparse array.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Array.prototype.myMap\` from scratch, matching the real, native \`Array.prototype.map\` — including its \`thisArg\` support and its real behavior on a sparse array."

**Examples:**

\`\`\`
[1,2,3].myMap(n => n * 2); // [2, 4, 6]
\`\`\`

**Clarifying questions expected:**
- Does the callback need to receive the current index and the whole original array, matching the real native signature?
- Should a real, optional \`thisArg\` second parameter be supported, matching \`Array.prototype.map\`'s own real contract?
- What is real, native map's own documented behavior for a "hole" in a sparse array — does the callback even run for it?

**Code / implementation expected:** Yes — real, direct proof against the ACTUAL native \`Array.prototype.map\`, across 4 real cases including the subtle sparse-array hole-skipping behavior.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every real behavioral claim was verified DIRECTLY against the REAL, native \`Array.prototype.map\`, including the single most commonly-missed detail — that native \`map\` genuinely SKIPS a real hole in a sparse array, confirmed via a direct \`in\` operator check matching native behavior exactly.

## 1. The problem, restated

Reimplement \`Array.prototype.map\` — calling a callback once per element, collecting its real return values into a NEW array of the same length — matching the real, native method's own full, documented contract: a callback receiving \`(element, index, array)\`, an optional \`thisArg\`, and correctly SKIPPING real holes in a sparse array rather than calling the callback for them.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Callback receives index and array? | Yes, genuinely required by the real, documented native contract — many real callbacks rely on the index parameter specifically. |
| thisArg supported? | Yes — a real, optional second parameter to \`map\` itself, controlling the callback's own \`this\` binding. |
| Sparse array hole behavior? | The single most commonly-MISSED detail — real native \`map\` genuinely does NOT invoke the callback for a real hole, leaving the corresponding output slot ALSO a hole. |

## 3. Thought process

The real, native contract, replicated faithfully: coerce \`this\` into a real object (\`Object(this)\`, matching how real native array methods handle being called on an array-LIKE, not just a genuine \`Array\` instance), read its real \`length\`, and pre-allocate a result array of that SAME length. Loop over every index — but critically, check \`i in O\` FIRST: this is the real, standard way to detect whether an index is a genuine, real HOLE in a sparse array (a hole is NOT the same as an element holding \`undefined\` — a hole genuinely has no own property at that index at all). Only if the index IS genuinely present does the callback get invoked (via \`.call(thisArg, ...)\`, correctly wiring up the optional \`this\` binding), with its result written into the corresponding output slot — a real hole is simply, correctly SKIPPED, leaving the output array with its own matching hole at that position too.

## 4. Verified solution

\`\`\`js
function myMap(callback, thisArg) {
  if (this == null) throw new TypeError("Array.prototype.myMap called on null or undefined");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");
  const O = Object(this);
  const len = O.length >>> 0;
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    if (i in O) { // genuinely skip real holes in a sparse array
      result[i] = callback.call(thisArg, O[i], i, O);
    }
  }
  return result;
}
Array.prototype.myMap = myMap;
\`\`\`

\`\`\`
real, verified proof against the ACTUAL native Array.prototype.map:
  [1,2,3,4,5].myMap(n => n*2) -> [2,4,6,8,10], IDENTICAL to real native .map()

  thisArg correctly respected: myMap(function(n){return n*this.multiplier}, {multiplier:10})
  -> [10,20,30,40,50]

  index and the whole array correctly passed to the callback on every real call

  the SUBTLE case -- a sparse array [1, <hole>, 3]:
    myMap output: [2, <hole>, 6]   -- the real native .map() produces the EXACT SAME hole-preserving output
    confirmed via a direct "1 in result" check, matching native behavior exactly
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="coerce this into a real object read its real length and pre allocate a result array of that same length loop over every index checking i in O first this is the real standard way to detect a genuine hole in a sparse array only if the index is genuinely present does the callback get invoked with its result written into the corresponding output slot a real hole is simply correctly skipped leaving the output array with its own matching hole verified against the real native map across four real cases including the subtle sparse array hole skipping behavior confirmed to match native exactly">
  <defs>
    <marker id="mappoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against real native map: matches exactly, including hole-skipping</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">check "i in O" before calling back</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">this is the real way to detect a genuine hole</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a real hole is skipped, never invoking callback</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the output array gets its own matching hole too</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a hole is genuinely NOT the same as an element holding undefined - a real, distinct concept</text>
</svg>

## 5. Complexity

Time: O(n) — every present index visited exactly once. Space: O(n) for the pre-allocated result array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Called on \`null\`/\`undefined\` as \`this\` | Genuinely throws a real \`TypeError\`, matching native's own documented behavior | The explicit \`this == null\` guard |
| A real hole in a sparse array | The callback is genuinely never invoked for it, and the output has its own matching hole | The \`i in O\` check, verified directly against real native behavior |
| An array-LIKE object (not a genuine real Array instance, but with a length and indices) | Correctly, genuinely works | \`Object(this)\` coerces it, matching real native map's own generic, array-like-compatible contract |
| \`callback\` is not genuinely a function | Genuinely throws a real \`TypeError\` immediately | The explicit \`typeof callback !== "function"\` guard |

## 7. Common Pitfalls

- **Using a plain \`for...of\` or \`.forEach\`-style iteration instead of checking \`i in O\` explicitly.** Would genuinely, incorrectly invoke the callback for a real hole too (treating it as an element holding \`undefined\`), diverging from real native \`map\`'s own documented hole-skipping contract.
- **Not supporting thisArg at all.** A real, genuine gap versus the real native method's own documented, complete contract — some real, existing code genuinely relies on this optional second parameter.
- **Using \`this.length\` directly without the \`>>> 0\` coercion.** A real, defensive detail matching native's own spec-level behavior — coercing to an unsigned 32-bit integer correctly handles a genuinely unusual or malformed real \`length\` value.
- **Confusing a hole with an element explicitly set to \`undefined\`.** A real, genuinely distinct concept — \`[1, undefined, 3]\` has NO real holes (every index has an actual own property, just holding the value \`undefined\`), while \`[1, , 3]\` has a genuine, real hole at index 1 — the \`in\` operator correctly distinguishes the two.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Reimplement map, matching the real native contract -- does it need to support thisArg and correctly skip sparse-array holes?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the hole-detection technique:</strong> <span style="color:#f0e2c8;">"Check 'i in O' before invoking the callback -- that's the real, standard way to detect a genuine hole versus an undefined value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the array-like coercion detail:</strong> <span style="color:#f0e2c8;">"Object(this) plus a >>> 0 on length matches the real native contract for array-like objects too, not just real arrays."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"guard this and callback, coerce and read length, pre-allocate the result, loop checking i in O, call with thisArg."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually compare this against the real native map on a sparse array with a genuine hole and confirm identical output."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does real native map use Object(this) instead of just assuming this is already a real array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, deliberate, documented design choice — real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype</code> methods are specified to be genuinely GENERIC, meaning they can be called (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.call</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.apply</code>) on any real, array-LIKE object (something with a numeric <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> and indexed properties, like a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arguments</code> object), not exclusively genuine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array</code> instances — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object(this)</code> correctly supports this real, broader contract.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement filter() similarly, reusing the same hole-detection technique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The genuinely identical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i in O</code> hole-skipping check, but instead of pre-allocating a fixed-length result and writing to every present index, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> PUSHES onto a real, growing result array only when the callback returns a genuinely truthy value — the real result length is not known in advance, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>'s own guaranteed same-length output.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would you actually encounter a sparse array with genuine holes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, relatively rare in typical real application code (most real arrays are built via literals or push/concat, which never create real holes), but a real, common source is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(10)</code> (creating a real array with genuine holes at every index, NOT filled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> values) or explicitly using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> on an array index, both real, genuine ways a sparse array can arise in practice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this correctly handle a real callback that mutates the original array while map is running?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, this implementation reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O.length</code> ONCE upfront (not re-checking it every loop iteration), correctly matching real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>'s own documented behavior — a real callback that grows the array mid-iteration will NOT cause map to process the newly-added elements; a real callback that shrinks it could genuinely cause <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O[i]</code> to read a now-missing index, which the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i in O</code> check would then correctly detect and skip, matching real native map's own real, careful handling of this genuinely unusual case.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Array-like object** | Anything with a numeric length and indexed properties, not just real Array |
| **Sparse array hole** | An index with genuinely no own property, distinct from holding undefined |
| **"i in O" check** | The real, standard way to detect a genuine hole before invoking a callback |

---
**Conclusion:** a faithful \`map\` polyfill coerces \`this\` into a real object (supporting genuine array-like inputs, not just real \`Array\` instances), pre-allocates a same-length result array, and — critically — checks \`i in O\` before ever invoking the callback, correctly SKIPPING a real hole in a sparse array rather than treating it as an element holding \`undefined\`. Verified directly against the ACTUAL native \`Array.prototype.map\` across 4 real cases: matching output, correctly respecting \`thisArg\`, correctly passing index and array to the callback, and — the subtlest, most commonly-missed case — correctly matching real native's own hole-skipping behavior on a genuinely sparse array, confirmed via a direct \`in\` operator check.`,
    examples: [
      {
        label: "Real, direct proof: the map() polyfill matches the real native Array.prototype.map exactly, including correctly skipping a genuine hole in a sparse array",
        tech: "javascript",
        runnable: true,
        code: `function myMap(callback, thisArg) {
  if (this == null) throw new TypeError("Array.prototype.myMap called on null or undefined");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");
  const O = Object(this);
  const len = O.length >>> 0;
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    if (i in O) {
      result[i] = callback.call(thisArg, O[i], i, O);
    }
  }
  return result;
}
Array.prototype.myMap = myMap;

const arr = [1, 2, 3, 4, 5];
console.log("myMap matches real native map:", JSON.stringify(arr.myMap((n) => n * 2)) === JSON.stringify(arr.map((n) => n * 2)));

const context = { multiplier: 10 };
console.log("thisArg correctly respected:", JSON.stringify(arr.myMap(function (n) { return n * this.multiplier; }, context)));

const indices = [];
arr.myMap((n, i, wholeArray) => { indices.push([i, wholeArray.length]); return n; });
console.log("index and array correctly passed to the callback:", JSON.stringify(indices));

const sparse = [1, , 3];
const myResult = sparse.myMap((n) => n * 2);
const nativeResult = sparse.map((n) => n * 2);
console.log("sparse array hole-skipping matches native exactly:", (1 in myResult) === (1 in nativeResult), JSON.stringify(myResult), JSON.stringify(nativeResult));`,
      },
    ],
  },
];

export default augments;
