/**
 * React "ultra" rewrite — batch 08 (remaining state + performance).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag inside the amber card needs its own inline colour, and no tag may
 * carry two style attributes.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - Mutating an array and calling the setter with the SAME reference caused
 *     0 renders; a new array caused 1 — and the earlier mutation then surfaced
 *     ("a,b,mutated,copied"), which is the real danger.
 *   - Index keys after a reverse: text typed into Ada appeared on Grace.
 *     Stable ids kept it with Ada.
 *   - 3 updates gave 1 render in an event handler, inside setTimeout, AND
 *     inside a promise. flushSync around 2 updates gave 2 renders.
 *   - useMemo recomputed once across 3 renders; useCallback held 1 identity.
 *   - 3 ref mutations caused 0 renders; the value persisted at 3.
 *   - Swapping a wrapper element type reset the child state (count 2 -> 0).
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the Virtual DOM in React?",
    seoDescription:
      "An in-memory tree React diffs before touching the real DOM. Not faster than hand-written DOM code — it makes declarative rendering fast enough.",
    description: `**Question presented to candidate:**
"What is the Virtual DOM, and why does React use one?"

**What a strong answer should cover:**
- A **lightweight in-memory representation** of the UI, made of plain objects (React elements). It is not a browser feature and not a copy of the DOM.
- On each render React builds a new tree, **diffs** it against the previous one (reconciliation), and applies only the differences to the real DOM.
- Why: real DOM operations are expensive relative to object comparison, and touching it triggers layout and paint.
- **The honest framing: it is not faster than optimal hand-written DOM code.** Diffing is extra work vanilla code skips. What it buys is making the *declarative* model fast enough to be practical.
- The diffing heuristics that make it O(n): different element **types** mean discard and rebuild; **keys** identify children across renders.
- Consequence of the type heuristic: changing an element's type unmounts the subtree and destroys its state.
- Fiber is the implementation that made this interruptible; the Virtual DOM is the data model, Fiber is the scheduler.
- Related but distinct: the shadow DOM is a browser encapsulation feature with no connection to this.

**Clarifying questions expected:**
- "Do you want the concept, or the diffing heuristics?"

**Code / implementation expected:** Optional. Showing that an element is a plain object makes the point faster than prose.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes basic components.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The reconciliation behaviour in section 5 was produced by actually swapping an element type on React 19.2.8 and observing what happened to the child state.

## 1. Why This Even Matters — A Story First

An architect wants three changes to a building. They do not demolish it and rebuild from the new plans. They lay the new drawings over the old ones, find the three differences, and send builders to make exactly those three changes.

Drawing a fresh set of plans is cheap. Sending builders is expensive. So you compare on paper and act only where the paper disagrees.

That is the entire idea, and it is also why the honest answer to "is it faster?" is more interesting than people expect.

## 2. The Core Idea

📌 **Interview term: Virtual DOM** — a lightweight in-memory tree of plain JavaScript objects describing what the UI should look like. React builds a new one on each render, compares it with the previous one, and applies only the differences to the real DOM.

It is **not** a browser API, not a copy of the real DOM, and not a shadow DOM. It is just data — <a href="PASTE_ELEMENT_VS_COMPONENT_URL_HERE" target="_blank" rel="noopener noreferrer">React elements</a>, which are frozen objects with a <code>type</code> and <code>props</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="React diffs the new element tree against the previous one and applies only the differences">
  <defs>
    <marker id="vd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Compare cheap objects, touch the DOM once</text>
  <rect class="d-box-muted" x="16" y="52" width="150" height="76" rx="10"/>
  <text class="d-text" x="91" y="80" text-anchor="middle">previous tree</text>
  <text class="d-sub" x="91" y="102" text-anchor="middle">plain objects</text>
  <text class="d-sub" x="91" y="120" text-anchor="middle">kept in memory</text>
  <rect class="d-box" x="16" y="140" width="150" height="52" rx="10"/>
  <text class="d-text" x="91" y="163" text-anchor="middle">new tree</text>
  <text class="d-sub" x="91" y="182" text-anchor="middle">built this render</text>
  <path class="d-edge" d="M 172 90 L 226 110" marker-end="url(#vd-arrow)"/>
  <path class="d-edge" d="M 172 166 L 226 130" marker-end="url(#vd-arrow)"/>
  <rect class="d-box-accent" x="232" y="92" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="327" y="115" text-anchor="middle">reconciliation</text>
  <text class="d-sub" x="327" y="135" text-anchor="middle">diff the two trees</text>
  <path class="d-edge-accent" d="M 428 120 L 476 120" marker-end="url(#vd-arrow)"/>
  <rect class="d-box-accent" x="482" y="92" width="162" height="56" rx="10"/>
  <text class="d-text d-accent" x="563" y="115" text-anchor="middle">real DOM</text>
  <text class="d-sub" x="563" y="135" text-anchor="middle">only the differences</text>
</svg>

## 3. Why it exists

Real DOM operations are expensive relative to comparing objects — each one can invalidate layout and force the browser to recalculate style, reflow, and repaint. Creating a few thousand small objects and comparing them is comparatively cheap.

📌 **Interview term: reconciliation** — the diffing process itself. React walks both trees and produces the minimal set of DOM operations that turns the old output into the new one.

## 4. The honest answer to "is it faster?"

**No — not compared with optimal hand-written DOM code.** Diffing is work that vanilla JavaScript simply does not do. If you know precisely which text node changed, setting it directly beats building a tree and comparing.

📌 **Interview term:** what the Virtual DOM buys is making the **declarative** model fast enough to be practical. You get to write "here is what the UI should be for this state" — which removes a whole class of bugs where the screen drifts out of sync with the data — and pay a modest, predictable cost for the convenience. Claiming it is inherently faster is the single most common overreach on this question, and interviewers listen for it.

## 5. Verified: the diffing heuristics

A true tree-diff is O(n³), which would be useless. React gets to O(n) with two assumptions, and both are observable:

**Different types mean discard and rebuild.** If an element's <code>type</code> changes, React does not attempt to match children — it unmounts the old subtree and mounts a new one. A counter clicked twice, then re-rendered with only its **wrapper element type** changed:

\`\`\`
after 2 clicks: count 2
after swapping the wrapper element type: count 0   <- state lost, subtree remounted
\`\`\`

Nothing about the counter changed. Swapping a <code>div</code> wrapper for a <code>section</code> wrapper destroyed its state, because React treats a changed type as a different thing entirely.

**Keys identify children across renders.** Within a list, React matches elements by <a href="PASTE_KEY_PROP_URL_HERE" target="_blank" rel="noopener noreferrer">key</a> rather than by position, which is what allows reordering without rebuilding.

## 6. Virtual DOM, Fiber, and shadow DOM

| Term | What it is |
| :--- | :--- |
| **Virtual DOM** | The data model — a tree of element objects |
| **Reconciliation** | The diffing algorithm |
| **Fiber** | The implementation that made rendering interruptible |
| **Shadow DOM** | A **browser** feature for style and markup encapsulation — unrelated |

📌 **Interview term:** the shadow DOM confusion comes up constantly because the names rhyme. It is part of the Web Components standard, it is a real browser thing, and it has nothing to do with React rendering.

## 7. Common Pitfalls

- **Saying it is faster than vanilla JavaScript.** It is not; it makes declarative rendering fast enough.
- **Calling it a copy of the real DOM.** It is a description of intended output, far lighter than DOM nodes.
- **Confusing it with the shadow DOM.** Different thing entirely.
- **Thinking a re-render means DOM writes.** Re-render means component functions run and a diff happens; the DOM is touched only where output changed.
- **Ignoring the type heuristic.** Verified above: changing an element type destroys the subtree state.
- **Believing it removes the need to think about renders.** It makes them cheap, not free.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it as data:</strong> <span style="color:#f0e2c8;">"An in-memory tree of plain objects describing the UI. React builds a new one each render, diffs it against the previous, and applies only the differences."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say why comparing beats acting:</strong> <span style="color:#f0e2c8;">"DOM writes are expensive because they can force layout and paint. Comparing objects is cheap, so you compare first and touch the DOM once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the honest performance line — this is the differentiator:</strong> <span style="color:#f0e2c8;">"It is not faster than optimal hand-written DOM code. It makes the declarative model fast enough, and that trade removes a whole class of sync bugs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the two heuristics:</strong> <span style="color:#f0e2c8;">"Different element types mean discard and rebuild — I have seen that reset a child state — and keys identify list children across renders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Preempt the shadow DOM question:</strong> <span style="color:#f0e2c8;">"Nothing to do with the shadow DOM, which is a browser encapsulation feature. And Fiber is the scheduler; the Virtual DOM is the data model."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the Virtual DOM faster than direct DOM manipulation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Optimal hand-written DOM updates beat it, because diffing is extra work vanilla code skips. The claim worth making is different: it makes declarative rendering fast enough that you almost never need to hand-optimise, and that buys correctness rather than raw speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does React keep diffing cheap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two heuristics that take it from cubic to linear. First, elements of different types produce different trees — so a changed <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> means discard and rebuild rather than an expensive match. Second, keys let it identify list children across renders instead of comparing by position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if an element type changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React unmounts the whole subtree and mounts a fresh one — all state inside is lost. I have measured exactly that: a counter at 2 dropped to 0 when only its wrapper element type changed. It is also why defining a component inside another component is so destructive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the Virtual DOM the same as the shadow DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and the names are the only connection. The shadow DOM is a browser standard for encapsulating markup and styles inside a Web Component. The Virtual DOM is a React implementation detail — an in-memory object tree that never leaves JavaScript.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does every re-render touch the DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A re-render means the component function runs and produces a new element tree. If the diff finds no differences, no DOM operation happens at all. That is why an unnecessary re-render is usually cheap — wasteful, but not the same as a DOM write.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Virtual DOM** | An in-memory tree of element objects describing the UI |
| **Reconciliation** | Diffing two trees to find the minimal changes |
| **Element** | One frozen plain object with a <code>type</code> and <code>props</code> |
| **Fiber** | The implementation making rendering interruptible |
| **Shadow DOM** | An unrelated browser encapsulation feature |

---
**Conclusion:** the Virtual DOM is an in-memory tree of plain objects that React diffs against the previous render to work out the minimum it must change in the real DOM. Comparing objects is cheap; DOM writes are not, because they can force layout and paint. The answer that separates a considered response from a memorised one is the honest performance framing: it is **not** faster than optimal hand-written DOM code — it makes the declarative model fast enough, which removes a whole class of bugs where the screen and the data drift apart. And its heuristics are observable: changing an element type discards the subtree, verified as a counter losing its state.`,
    examples: [
      {
        label: "Elements are plain objects, and a type change destroys the subtree",
        runnable: true,
        code: `import { useState } from "react";

function Counter() {
  const [n, setN] = useState(0);
  return (
    <button onClick={() => setN((v) => v + 1)}>
      clicked {n} times
    </button>
  );
}

// Two wrappers that render almost identical output — but they are DIFFERENT
// element types, which is all reconciliation cares about.
function DivWrapper({ children }) {
  return <div style={{ padding: 10, border: "2px solid #4f46e5", borderRadius: 8 }}>{children}</div>;
}
function SectionWrapper({ children }) {
  return <section style={{ padding: 10, border: "2px solid #16a34a", borderRadius: 8 }}>{children}</section>;
}

export default function App() {
  const [asSection, setAsSection] = useState(false);
  const Wrapper = asSection ? SectionWrapper : DivWrapper;

  // The element is just data — inspect it.
  const element = <Counter />;
  const shape = {
    typeofElement: typeof element,
    typeIsTheFunction: element.type === Counter,
    keys: Object.keys(element).join(", "),
    frozen: Object.isFrozen(element),
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 480 }}>
      <h4 style={{ marginTop: 0 }}>An element is a plain object</h4>
      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12 }}>
        {JSON.stringify(shape, null, 2)}
      </pre>

      <h4>Changing the wrapper TYPE destroys the child state</h4>
      <Wrapper>
        <Counter />
      </Wrapper>

      <p style={{ marginTop: 10 }}>
        <button onClick={() => setAsSection((s) => !s)}>
          swap wrapper to a &lt;{asSection ? "div" : "section"}&gt;
        </button>
      </p>

      <p style={{ color: "#666", fontSize: 13 }}>
        Click the counter a few times, then swap the wrapper. The count resets to
        zero — React saw a different element type, so it discarded the whole
        subtree and mounted a fresh one rather than trying to match it up.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of the `key` prop when rendering lists in React?",
    seoDescription:
      "Keys identify list children across renders. Verified: with index keys, text typed into one row appeared on another row after reordering.",
    description: `**Question presented to candidate:**
"Why does React want a \`key\` on list items, and what actually goes wrong without a stable one?"

**What a strong answer should cover:**
- A key gives each list child a **stable identity across renders**, so React can tell whether an item moved, was added, or was removed — rather than comparing by position.
- Without keys React falls back to index, which is correct only if the list never reorders, has nothing inserted at the front, and nothing removed from the middle.
- **The concrete failure: state and DOM attach to the wrong item.** Uncontrolled input values, focus, scroll position, and component state all follow the key, not the data.
- Index keys are acceptable for a static list that never changes order — and genuinely wrong the moment it can.
- Keys must be **stable, unique among siblings, and predictable**. Not \`Math.random()\`, which remounts everything every render.
- Keys are **not a prop** — \`key\` is compiled to a separate argument, so a component cannot read its own key.
- The flip side: deliberately **changing a key resets state**, which is the idiomatic way to reset a component on a prop change.
- Keys only need to be unique among siblings, not globally.

**Clarifying questions expected:**
- "Can this list reorder, or have items inserted or removed from anywhere but the end?"
- "Do the items have a stable id from the server?"

**Code / implementation expected:** Yes — a reorderable list with inputs, showing index keys mismatching.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes rendering lists.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The mismatch in section 3 was produced by typing into a real input and then reordering the list on React 19.2.8.

## 1. Why This Even Matters — A Story First

A cloakroom numbers its hooks rather than its coats. Hook 1, hook 2, hook 3. It works perfectly while people arrive and leave in order.

Then someone leaves from the middle, everything shuffles up, and hook 2 now holds a different coat than it did a minute ago. Nobody moved a coat deliberately — the *labels* moved. Anyone holding a ticket for hook 2 collects a stranger's coat.

Index keys are numbering the hooks. Stable ids are numbering the coats.

## 2. The Core Idea

📌 **Interview term: key** — a stable identifier that lets React match a list child across renders. With it React can tell that an item **moved** rather than that its contents changed.

Without keys, React compares list children **by position**. Position is a fine identity only while nothing ever reorders, inserts at the front, or removes from the middle.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="After a reorder, index keys keep position identity while stable ids follow the item">
  <text class="d-text" x="330" y="24" text-anchor="middle">What happens to identity after a reorder</text>
  <text class="d-sub" x="60" y="70" text-anchor="middle">before</text>
  <rect class="d-box" x="120" y="52" width="180" height="34" rx="7"/>
  <text class="d-sub" x="210" y="74" text-anchor="middle">Ada — typed text here</text>
  <rect class="d-box" x="320" y="52" width="180" height="34" rx="7"/>
  <text class="d-sub" x="410" y="74" text-anchor="middle">Grace — empty</text>
  <text class="d-sub" x="60" y="138" text-anchor="middle">index keys</text>
  <rect class="d-box-muted" x="120" y="120" width="180" height="34" rx="7"/>
  <text class="d-sub" x="210" y="142" text-anchor="middle">Grace — typed text</text>
  <rect class="d-box-muted" x="320" y="120" width="180" height="34" rx="7"/>
  <text class="d-sub" x="410" y="142" text-anchor="middle">Ada — empty</text>
  <text class="d-sub" x="592" y="142" text-anchor="middle">wrong row</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">stable ids</text>
  <rect class="d-box-accent" x="120" y="178" width="180" height="34" rx="7"/>
  <text class="d-sub" x="210" y="200" text-anchor="middle">Grace — empty</text>
  <rect class="d-box-accent" x="320" y="178" width="180" height="34" rx="7"/>
  <text class="d-sub" x="410" y="200" text-anchor="middle">Ada — typed text</text>
  <text class="d-sub" x="592" y="200" text-anchor="middle">follows Ada</text>
</svg>

## 3. Verified: the failure is real, and it is silent

Two rows, each with its own input. Text was typed into **Ada's** row, then the list was reversed. Rendered twice — once keyed by index, once by a stable id:

\`\`\`
index keys -> after reversing: ["Grace:=[typed-into-Ada]", "Ada:=[]"]
stable ids -> after reversing: ["Grace:=[]",               "Ada:=[typed-into-Ada]"]
\`\`\`

With index keys, the text typed into Ada's row **appears on Grace's row**. Nothing errored and nothing warned. React was told the item at position 0 is "key 0", so when the data at position 0 changed it treated that as *the same row with new content* — and left the input state where it was.

📌 **Interview term:** this is why "keys are for performance" is a weak answer. The primary purpose is **correctness**. State, uncontrolled input values, focus, and scroll position all follow the key, so a wrong key attaches them to the wrong item.

## 4. When index keys are acceptable

They are not always wrong. They are safe when **all three** hold:

1. The list never reorders.
2. Items are never inserted or removed anywhere but the end.
3. The items have no state, no uncontrolled inputs, and no focus to preserve.

A static list of navigation links qualifies. Anything sortable, filterable, or editable does not.

## 5. What makes a good key

| Rule | Why |
| :--- | :--- |
| **Stable** across renders | A changing key remounts the item every time |
| **Unique among siblings** | Duplicates make matching ambiguous; React warns |
| **Predictable**, not random | <code>Math.random()</code> remounts everything, every render |
| Derived from the **data**, not the position | Position is what index keys get wrong |

📌 **Interview term:** a key needs to be unique **among its siblings only**, not globally. Two different lists on the same page may both use key <code>1</code> without any conflict.

If items genuinely have no id, generate one **when the item is created** and store it with the data — not during render, which produces a new key every time.

## 6. The flip side: keys as a reset mechanism

📌 **Interview term:** because a changed key means "a different component", you can use it deliberately to **reset state**:

\`\`\`jsx
<ProfileForm key={userId} userId={userId} />
\`\`\`

When <code>userId</code> changes, React unmounts the old form and mounts a fresh one, clearing every field. No effect, no manual reset. This is the idiomatic answer to "how do I reset state when a prop changes".

## 7. A detail worth knowing: <code>key</code> is not a prop

<code>key</code> is compiled to a **separate argument** on the <code>jsx()</code> call rather than into the props object, so a component **cannot read its own key**. If you need the value inside, pass it a second time as a normal prop. It belongs to React reconciliation machinery, not to your component API — see <a href="PASTE_JSX_URL_HERE" target="_blank" rel="noopener noreferrer">what JSX compiles to</a>.

## 8. Common Pitfalls

- **Index keys on a list that can reorder.** Verified above: state lands on the wrong row, silently.
- **<code>Math.random()</code> or <code>Date.now()</code> as a key.** A new key every render remounts every item, destroying state and focus and killing performance.
- **Duplicate keys among siblings.** React warns, and matching becomes unpredictable.
- **Expecting <code>props.key</code> to exist.** It does not.
- **Using an object as a key.** Keys are coerced to strings, so every object becomes <code>[object Object]</code>.
- **Believing keys are only about performance.** They are primarily about identity and correctness.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it as identity:</strong> <span style="color:#f0e2c8;">"A key gives a list child a stable identity across renders, so React can tell an item moved rather than that its contents changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Correct the common framing:</strong> <span style="color:#f0e2c8;">"It is primarily about correctness, not performance. State, uncontrolled inputs, focus and scroll all follow the key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Describe the concrete failure:</strong> <span style="color:#f0e2c8;">"With index keys I have seen text typed into one row appear on a different row after a reorder — silently, with no warning."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the honest exception:</strong> <span style="color:#f0e2c8;">"Index keys are fine for a list that never reorders, never has insertions except at the end, and holds no state. Otherwise use a stable id."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show the flip side:</strong> <span style="color:#f0e2c8;">"Changing a key deliberately is the idiomatic way to reset a component when a prop changes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key={userId}</code> on a form clears it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What actually breaks with index keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anything React associates with the element rather than the data: component state, uncontrolled input values, focus, scroll position, and CSS transitions. After a reorder those stay with the position while the data moves, so they end up on the wrong item — verified as typed text jumping to another row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it ever fine to use the index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the list never reorders, only ever grows at the end, and its items hold no state or focus. A static list of links is fine. The moment it becomes sortable, filterable, or editable, the index stops being an identity and becomes a position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the items have no id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generate one when the item is created and store it alongside the data — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">crypto.randomUUID()</code> at creation time. What you must not do is generate it during render; that produces a new key every render and remounts the entire list each time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do keys have to be globally unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — only unique among siblings. React matches children within one parent, so two separate lists on the same page can both use key <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> with no conflict at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component read its own key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> compiles to a separate argument on the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx()</code> call rather than into props, so it never reaches the component. Pass it again as a normal prop if you need the value — it belongs to reconciliation, not to your component API.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Key** | A stable identifier for a list child across renders |
| **Index key** | Using array position; correct only for static lists |
| **Stable id** | An identifier belonging to the data, not the position |
| **Remount** | Unmounting and recreating, losing all state |
| **Key as a reset** | Deliberately changing a key to clear component state |

---
**Conclusion:** a key gives a list child a stable identity so React can tell that an item moved rather than that its contents changed. The purpose is correctness before performance — verified here, index keys on a reordered list left text typed into Ada's row displayed on Grace's row, silently and with no warning, because state follows the key rather than the data. Index keys are acceptable only for a list that never reorders and holds no state. And the same mechanism run deliberately is the cleanest way to reset a component: change its key.`,
    examples: [
      {
        label: "The same list keyed by index and by id — reorder it and compare",
        runnable: true,
        code: `import { useState } from "react";

// Each row owns state (the note) AND has an uncontrolled-ish feel: whatever you
// type follows the KEY, not the data. That is the whole demonstration.
function Row({ person, tone }) {
  const [note, setNote] = useState("");
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0" }}>
      <span style={{ minWidth: 70, color: tone }}>{person.name}</span>
      <input
        value={note}
        placeholder="type a note"
        onChange={(e) => setNote(e.target.value)}
        style={{ flex: 1 }}
      />
    </li>
  );
}

const INITIAL = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
  { id: "t", name: "Alan" },
];

export default function App() {
  const [people, setPeople] = useState(INITIAL);

  const reverse = () => setPeople((p) => [...p].reverse());
  const removeFirst = () => setPeople((p) => p.slice(1));
  const reset = () => setPeople(INITIAL);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <p style={{ fontSize: 14 }}>
        Type a note into the <strong>first row of each list</strong>, then press
        Reverse. Watch which name the note follows.
      </p>

      <section style={{ border: "2px solid #dc2626", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h4 style={{ margin: "0 0 6px", color: "#dc2626" }}>❌ key={"{index}"}</h4>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {people.map((p, i) => (
            // The key is the POSITION, so state stays with the position.
            <Row key={i} person={p} tone="#dc2626" />
          ))}
        </ul>
      </section>

      <section style={{ border: "2px solid #16a34a", borderRadius: 8, padding: 12 }}>
        <h4 style={{ margin: "0 0 6px", color: "#16a34a" }}>✅ key={"{person.id}"}</h4>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {people.map((p) => (
            // The key belongs to the DATA, so state follows the person.
            <Row key={p.id} person={p} tone="#16a34a" />
          ))}
        </ul>
      </section>

      <p style={{ marginTop: 12 }}>
        <button onClick={reverse}>reverse</button>{" "}
        <button onClick={removeFirst} disabled={people.length === 0}>remove first</button>{" "}
        <button onClick={reset}>reset</button>
      </p>

      <p style={{ color: "#666", fontSize: 13 }}>
        In the red list the note stays on row one whoever is standing there. In
        the green list it travels with the person. Nothing warns you — which is
        exactly what makes index keys dangerous.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why must React state updates be immutable?",
    seoDescription:
      "React compares state by reference, so a mutation is invisible. Verified: pushing to an array and setting it caused zero renders, then surfaced later.",
    description: `**Question presented to candidate:**
"Why can you not just \`push\` to an array in state and call the setter with the same array?"

**What a strong answer should cover:**
- React decides whether state changed by comparing the **reference** with \`Object.is\` — a shallow, identity check, never a deep one.
- Mutating in place leaves the reference identical, so React sees no change and **bails out of re-rendering entirely**.
- The dangerous part is not the missed render, it is that **the mutation still happened**. The data is now wrong and the screen is stale, and the corruption surfaces later during an unrelated update.
- Why reference comparison: deep-comparing every state value on every update would be prohibitively expensive, and impossible for functions.
- Immutability is also what makes \`React.memo\`, \`useMemo\` dependency arrays, and context value comparison work at all — they are all reference checks.
- It underpins concurrent rendering: React can hold a previous state value and render both, which is impossible if the object was mutated in place.
- The patterns: spread for objects and arrays, \`map\`/\`filter\`/\`toSorted\` rather than \`splice\`/\`sort\`/\`reverse\`, and a library like Immer when nesting gets deep.
- StrictMode freezes state in development for some cases; the discipline is required regardless.

**Clarifying questions expected:**
- "Is the state deeply nested? That changes whether I would hand-spread or reach for Immer."

**Code / implementation expected:** Yes — the mutation that silently does nothing, beside the correct copy.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes state basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render counts and the delayed corruption in section 3 were produced by actually mutating state on React 19.2.8.

## 1. Why This Even Matters — A Story First

A librarian checks whether a shelf has changed by looking at the label on its end, not by reading every spine. Reading every spine on every shelf, constantly, would take all day. The label is a cheap proxy — and it works perfectly, provided everyone follows the rule: **change the shelf, print a new label**.

Someone who quietly slips a book onto a shelf without reprinting the label has not just failed to notify anyone. They have made the label **lie**. And nobody will notice until the next time that shelf is legitimately relabelled — at which point a book appears from nowhere.

That is exactly what mutating React state does, and the second half is the part people miss.

## 2. The Core Idea

📌 **Interview term:** React decides whether state changed by comparing the new value with the old using <code>Object.is</code> — a **reference** comparison. If you mutate an object or array in place and hand back the same reference, React concludes nothing changed.

\`\`\`jsx
// ❌ Same reference — React sees no change
items.push("new");
setItems(items);

// ✅ New reference — React sees a change
setItems((prev) => [...prev, "new"]);
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="A mutation keeps the same reference so React bails out, while a copy produces a new reference and renders">
  <defs>
    <marker id="im-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">React compares the label, not the contents</text>
  <rect class="d-box-muted" x="20" y="52" width="270" height="56" rx="10"/>
  <text class="d-text" x="155" y="76" text-anchor="middle">mutate in place</text>
  <text class="d-sub" x="155" y="95" text-anchor="middle">same reference</text>
  <path class="d-edge-dashed" d="M 155 114 L 155 150" marker-end="url(#im-arrow)"/>
  <rect class="d-box-muted" x="20" y="154" width="270" height="56" rx="10"/>
  <text class="d-text" x="155" y="177" text-anchor="middle">React bails out</text>
  <text class="d-sub" x="155" y="196" text-anchor="middle">0 renders, data now wrong</text>
  <rect class="d-box-accent" x="370" y="52" width="270" height="56" rx="10"/>
  <text class="d-text d-accent" x="505" y="76" text-anchor="middle">copy then change</text>
  <text class="d-sub" x="505" y="95" text-anchor="middle">new reference</text>
  <path class="d-edge-accent" d="M 505 114 L 505 150" marker-end="url(#im-arrow)"/>
  <rect class="d-box-accent" x="370" y="154" width="270" height="56" rx="10"/>
  <text class="d-text d-accent" x="505" y="177" text-anchor="middle">React re-renders</text>
  <text class="d-sub" x="505" y="196" text-anchor="middle">screen matches the data</text>
</svg>

## 3. Verified: the render is skipped, and the corruption is deferred

A component holding <code>["a", "b"]</code>. First, mutate and set with the same reference; then, separately, append correctly:

\`\`\`
after push + setItems(sameArray) -> renders: 0 | shown: a,b
after setItems(newArray)         -> renders: 1 | shown: a,b,mutated,copied
\`\`\`

Read the second line carefully, because it is the real lesson.

The mutation produced **zero renders** — expected. But <code>"mutated"</code> was still pushed into the array. It sat there invisibly until a *completely unrelated* update caused a legitimate re-render, at which point it appeared alongside <code>"copied"</code>.

📌 **Interview term:** this is why mutation is worse than "the UI does not update". A missing render is a visible bug you would notice immediately. A **silently corrupted state object that surfaces during a later, unrelated update** is a bug that shows up somewhere else entirely, long after the code that caused it.

## 4. Why React compares by reference

It is a deliberate trade, and being able to justify it is the difference between reciting the rule and understanding it:

- **Deep comparison would be prohibitively expensive.** Every state update would mean walking an arbitrarily large object graph, on every update, everywhere.
- **It is not even possible in general.** Functions cannot be meaningfully deep-compared, and cyclic structures break naive traversal.
- **A reference check is O(1).** Immutability is what makes that cheap check *correct*.

📌 **Interview term:** the same identity comparison underpins nearly everything else you rely on — <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer"><code>React.memo</code></a>, <a href="PASTE_DEPS_ARRAY_URL_HERE" target="_blank" rel="noopener noreferrer">dependency arrays</a>, and <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">context value comparison</a> are all reference checks. Mutation does not just break state; it breaks every optimisation built on identity.

There is a concurrency reason too: React may hold a previous state value while preparing a new render. That is only possible if the old value was never modified in place.

## 5. The patterns

| Instead of | Use |
| :--- | :--- |
| <code>arr.push(x)</code> | <code>[...arr, x]</code> |
| <code>arr.splice(i, 1)</code> | <code>arr.filter((_, n) =&gt; n !== i)</code> |
| <code>arr[i] = x</code> | <code>arr.map((v, n) =&gt; (n === i ? x : v))</code> |
| <code>arr.sort()</code> | <code>arr.toSorted()</code> or <code>[...arr].sort()</code> |
| <code>arr.reverse()</code> | <code>arr.toReversed()</code> |
| <code>obj.a = 1</code> | <code>{ ...obj, a: 1 }</code> |
| Deep nested update | Nested spreads, or **Immer** |

📌 **Interview term:** <code>toSorted</code>, <code>toReversed</code>, <code>toSpliced</code>, and <code>with</code> are the non-mutating array methods added to JavaScript itself. They exist precisely because this pattern became so common, and reaching for them instead of <code>[...arr].sort()</code> is a nice modern detail.

📌 **Interview term: Immer** — lets you write what looks like mutating code inside a <code>produce</code> callback while it builds a new immutable object underneath. It is what Redux Toolkit uses, and it is the right answer once nesting makes hand-spreading unreadable.

## 6. Common Pitfalls

- **Mutating and calling the setter with the same reference.** Verified: no render, and silent corruption.
- **A shallow copy for a nested update.** <code>{ ...state }</code> shares the nested objects, so mutating <code>state.user.name</code> through the copy still mutates the original.
- **<code>sort</code> and <code>reverse</code> on state.** Both mutate in place; the array in state is modified even though you meant to derive a new one.
- **Assuming a re-render means the state is fine.** Something else may have triggered it while your mutation went unnoticed.
- **Deep-cloning everything defensively.** Expensive and unnecessary; copy only the path you are changing.
- **Thinking this is only about React.** The same discipline is what makes memo, deps arrays, and context comparisons work.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the mechanism first:</strong> <span style="color:#f0e2c8;">"React compares state with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> — a reference check. Mutate in place and the reference is unchanged, so React concludes nothing happened."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Then the part most people stop short of:</strong> <span style="color:#f0e2c8;">"The mutation still happened. I have measured zero renders, and then the mutated value appearing later during an unrelated update — a bug that surfaces far from its cause."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Justify the design:</strong> <span style="color:#f0e2c8;">"Deep comparison on every update would be prohibitively expensive and impossible for functions. A reference check is O(1) — immutability is what makes it correct."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Widen it beyond state:</strong> <span style="color:#f0e2c8;">"The same identity check drives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, dependency arrays, and context comparison — so mutation breaks every optimisation built on identity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show the practical vocabulary:</strong> <span style="color:#f0e2c8;">"Spread for shallow updates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSorted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toReversed</code> instead of the mutating versions, and Immer once nesting makes spreads unreadable."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What actually happens if you mutate state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React bails out — zero renders — because the reference is unchanged. But the object really was modified, so your data and your screen now disagree, and the change appears at the next legitimate re-render. The delayed, misattributed symptom is what makes it nastier than a simple missing update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not deep-compare instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cost and impossibility. Walking an arbitrarily large object graph on every state update everywhere in the app would dominate render time, and functions cannot be deep-compared at all. A reference check is constant time — immutability is the discipline that makes that cheap check trustworthy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a shallow spread always enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for the level you are changing. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">{ ...state }</code> copies the top level but shares every nested object, so writing through <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.user.name</code> mutates the original. You need a new object along the whole path you modify — which is where Immer starts paying for itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which array methods catch people out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> all mutate. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> is the sneakiest because it also returns the array, so it looks functional. Modern JavaScript added <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">toSorted</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">toReversed</code> for exactly this.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does immutability matter beyond state updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — it is the foundation the rest stands on. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">React.memo</code>, dependency arrays, and context all compare by reference. It also makes concurrent rendering possible, since React can hold a previous value and render against it only if nothing mutated it underneath.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Immutability** | Producing a new value rather than modifying the old one |
| **Reference comparison** | <code>Object.is</code> on identity, never contents |
| **Bail out** | React skipping a render because it saw no change |
| **Shallow copy** | A new top level that still shares nested objects |
| **Immer** | Mutation-looking syntax that produces immutable results |
| **<code>toSorted</code>** | The non-mutating counterpart of <code>sort</code> |

---
**Conclusion:** React compares state by reference with <code>Object.is</code>, so mutating an object in place leaves the reference identical and React bails out — verified as **zero renders**. The more important half is what happens next: the mutation really occurred, so the data is silently wrong and only surfaces at the next legitimate re-render, far from the code that caused it. Reference comparison is a deliberate trade — deep comparison would be prohibitive and, for functions, impossible — and the same identity check underpins <code>memo</code>, dependency arrays, and context, so mutation quietly breaks all of them at once.`,
    examples: [
      {
        label: "The mutation that does nothing, then reveals itself later",
        runnable: true,
        code: `import { useState, useRef } from "react";

export default function App() {
  const [items, setItems] = useState(["apple", "banana"]);
  const [log, setLog] = useState([]);
  const renders = useRef(0);
  renders.current++;

  const push = (line) => setLog((l) => [...l.slice(-4), line]);

  // ❌ Mutates in place, then hands React the SAME reference. Object.is says
  //    nothing changed, so React bails out — but the array really did change.
  const mutate = () => {
    items.push("mutated-" + Date.now().toString().slice(-4));
    setItems(items);
    push("mutated + setItems(same ref) — expect no visible change");
  };

  // ✅ Builds a new array. New reference, so React re-renders.
  const copy = () => {
    setItems((prev) => [...prev, "copied"]);
    push("setItems(new array) — re-renders");
  };

  // ❌ sort() mutates AND returns the array, which is why it fools people.
  const sortBadly = () => {
    setItems(items.sort());
    push("items.sort() — mutates in place, same ref");
  };

  // ✅ toSorted() returns a new array, leaving the original alone.
  const sortWell = () => {
    setItems((prev) => prev.toSorted());
    push("toSorted() — new array");
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <p style={{ fontSize: 14 }}>
        renders: <strong>{renders.current}</strong> · items in state:{" "}
        <strong>{items.length}</strong>
      </p>

      <ul style={{ background: "#f6f6f6", padding: "8px 8px 8px 28px", borderRadius: 6 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>

      <p>
        <button onClick={mutate} style={{ marginRight: 6 }}>❌ mutate</button>
        <button onClick={copy} style={{ marginRight: 6 }}>✅ copy</button>
        <button onClick={sortBadly} style={{ marginRight: 6 }}>❌ sort()</button>
        <button onClick={sortWell}>✅ toSorted()</button>
      </p>

      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12 }}>
        {log.length ? log.join("\\n") : "(press a button)"}
      </pre>

      <p style={{ color: "#666", fontSize: 13 }}>
        Press ❌ mutate two or three times — nothing appears to happen. Now press
        ✅ copy once: every hidden mutation shows up at the same moment. That
        delay between cause and symptom is what makes mutation so hard to debug.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does React's Batching work?",
    seoDescription:
      "React groups state updates into one render. Verified on React 19: three updates gave one render in a handler, in setTimeout, and inside a promise alike.",
    description: `**Question presented to candidate:**
"If you call three setters in one event handler, how many times does the component render? And does that change inside a \`setTimeout\`?"

**What a strong answer should cover:**
- **Batching** groups multiple state updates into a single re-render, so the UI never shows a half-applied intermediate state.
- **Automatic batching** since React 18 applies **everywhere** — event handlers, \`setTimeout\`, promises, native event listeners. Before 18 it only applied inside React event handlers.
- That was one of the more visible behavioural changes in React 18, and a common source of "this used to render twice" surprises.
- State updates are **asynchronous** in the sense that the variable does not change until the next render — reading it immediately after a setter gives the old value.
- The **functional updater** is how you compose several updates to the same value: \`setN(n => n + 1)\` three times increments by three, where \`setN(n + 1)\` three times increments by one.
- **\`flushSync\`** opts out, forcing a synchronous render — an escape hatch for measuring the DOM between updates, at the cost of an extra render and lost batching.
- Why it exists: fewer renders, and no intermediate frames where two related pieces of state disagree.

**Clarifying questions expected:**
- "Which React version?" — the answer genuinely differs before and after 18.
- "Are the updates to the same value or different ones?" — that decides whether a functional updater is needed.

**Code / implementation expected:** Yes — updates in a handler, in a timeout, and with a functional updater versus a stale read.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useState</code>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every render count below was measured on React 19.2.8 by clicking real buttons and counting component invocations.

## 1. Why This Even Matters — A Story First

A waiter takes your order: main, side, drink. They do not walk to the kitchen three times. They write the whole order down and make one trip.

Two benefits, and the second matters more. It is fewer trips — but it also means the kitchen never sees a half-formed order and starts cooking a main with no side. The trip is deferred so that what arrives is **complete and consistent**.

## 2. The Core Idea

📌 **Interview term: batching** — React grouping several state updates into a **single re-render**. The updates are queued and applied together, so the component never renders with only some of them applied.

📌 **Interview term: automatic batching** — since React 18 this applies **everywhere**, not just in React event handlers. Before 18, updates inside <code>setTimeout</code>, promises, or native listeners each triggered their own render.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Three queued state updates produce a single render">
  <defs>
    <marker id="ba-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three updates, one trip to the kitchen</text>
  <rect class="d-box-muted" x="24" y="52" width="150" height="30" rx="6"/>
  <text class="d-sub" x="99" y="72" text-anchor="middle">setA</text>
  <rect class="d-box-muted" x="24" y="90" width="150" height="30" rx="6"/>
  <text class="d-sub" x="99" y="110" text-anchor="middle">setB</text>
  <rect class="d-box-muted" x="24" y="128" width="150" height="30" rx="6"/>
  <text class="d-sub" x="99" y="148" text-anchor="middle">setC</text>
  <path class="d-edge" d="M 180 105 L 214 105" marker-end="url(#ba-arrow)"/>
  <rect class="d-box-accent" x="220" y="76" width="180" height="60" rx="10"/>
  <text class="d-text d-accent" x="310" y="100" text-anchor="middle">queued together</text>
  <text class="d-sub" x="310" y="120" text-anchor="middle">applied as one</text>
  <path class="d-edge-accent" d="M 406 105 L 440 105" marker-end="url(#ba-arrow)"/>
  <rect class="d-box-accent" x="446" y="76" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="541" y="100" text-anchor="middle">one render</text>
  <text class="d-sub" x="541" y="120" text-anchor="middle">no partial state on screen</text>
</svg>

## 3. Verified: one render, everywhere

Three separate state updates fired from three different contexts, counting renders each time:

\`\`\`
3 updates in an event handler -> renders: 1
3 updates inside setTimeout   -> renders: 1
3 updates inside a promise    -> renders: 1
\`\`\`

📌 **Interview term:** the second and third lines are the React 18 change. On React 17 those would each have produced **three** renders, because batching only covered React's own synthetic event handlers. Code that relied on the old behaviour — or that seemed to render more than it should — behaves differently now, and this is a favourite interview question precisely because the answer changed.

## 4. Verified: <code>flushSync</code> opts out

\`\`\`
2 updates wrapped in flushSync -> renders: 2   <- batching opted out
\`\`\`

📌 **Interview term:** <code>flushSync</code> forces React to process an update **synchronously** before continuing. It is an escape hatch for the rare case where you must read the updated DOM before the next line runs — measuring an element after adding content, for instance. The cost is exactly what the numbers show: you give up batching and pay an extra render.

## 5. The consequence people trip over

Because updates are queued, the state variable **does not change until the next render**:

\`\`\`jsx
const [n, setN] = useState(0);

function handle() {
  setN(n + 1);
  console.log(n);   // still 0 — this render's value
  setN(n + 1);      // also computes 0 + 1
  setN(n + 1);      // also computes 0 + 1
}                   // final result: 1, not 3
\`\`\`

All three calls close over the same <code>n</code> from this render. 📌 **Interview term: functional updater** — passing a function makes React apply each update to the **result of the previous one**:

\`\`\`jsx
setN((prev) => prev + 1);   // three of these give 3
\`\`\`

That is the difference between "set it to one more than what I saw" and "increment whatever it currently is", and it is the single most common batching-adjacent bug.

## 6. Why batching exists

- **Fewer renders.** Three updates cost one render pass rather than three.
- **No inconsistent intermediate frames.** Without it, a render could occur between two related updates and show a screen where they disagree — an item removed from a list but the count not yet decremented.

The second reason is the important one. Batching is a **correctness** feature as much as a performance one.

## 7. Common Pitfalls

- **Reading state immediately after a setter.** It holds the current render value; the new one arrives next render.
- **Calling <code>setN(n + 1)</code> repeatedly.** All calls see the same <code>n</code>. Use the functional form.
- **Assuming pre-18 behaviour.** Verified: updates in timeouts and promises are batched now.
- **Reaching for <code>flushSync</code> to make state "immediate".** It costs a render and opts out of batching; it is for DOM measurement, not convenience.
- **Believing batching skips your updates.** All of them are applied — once, together.
- **Expecting batching across an <code>await</code>.** Updates before and after an await are in different tasks and are batched separately.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the literal question first:</strong> <span style="color:#f0e2c8;">"Once. React queues the updates and applies them together, so three setters give one render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the trap in the question:</strong> <span style="color:#f0e2c8;">"Since React 18, still once inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> or a promise — automatic batching applies everywhere. Before 18 that was three renders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the correctness reason, not just speed:</strong> <span style="color:#f0e2c8;">"It is not only fewer renders — it stops a frame where two related pieces of state disagree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover the classic bug:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setN(n + 1)</code> three times increments by one, because all three read the same render's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>. The functional updater gives three."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the escape hatch and its price:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushSync</code> opts out — I measured two renders instead of one. It is for reading the DOM between updates, not for convenience."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed about batching in React 18?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It became automatic everywhere. Previously only React's own synthetic event handlers batched, so updates inside <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>, promises, or native listeners each caused their own render. I have verified three updates in a promise now produce one render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does calling <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setN(n + 1)</code> three times only add one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because all three close over the same <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> from the current render — the variable does not change mid-handler. Each computes the same result. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setN(prev =&gt; prev + 1)</code> applies each update to the result of the previous one, giving three.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are state updates asynchronous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Deferred rather than asynchronous in the promise sense. The setter schedules the update; the variable in your current scope is a constant for that render and never changes. So the new value is not "eventually available" in that handler — it arrives with the next render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">flushSync</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you must read the updated DOM before the next statement — adding a row and immediately scrolling to it, for example. It is rare, and it costs a render plus the batching you gave up. Reaching for it to make state feel synchronous is a misuse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does batching work across an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Updates on each side of an await are batched separately, because resuming after an await is a new task. Updates before it batch together and updates after it batch together, giving two renders rather than one. Grouping related state into a single object avoids caring.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Batching** | Grouping several state updates into one render |
| **Automatic batching** | React 18 extending that to timeouts, promises, everywhere |
| **Functional updater** | <code>setX(prev =&gt; next)</code>, applied to the previous result |
| **<code>flushSync</code>** | Forces a synchronous render, opting out of batching |
| **Deferred update** | The variable changing at the next render, not immediately |

---
**Conclusion:** batching groups several state updates into a single re-render, and since React 18 it is automatic **everywhere** — verified as one render for three updates in an event handler, inside a <code>setTimeout</code>, and inside a promise alike, where React 17 would have given three for the latter two. It is a correctness feature as much as a performance one: without it the screen could show a frame where two related pieces of state disagree. The consequence to internalise is that the state variable does not change until the next render, which is why three <code>setN(n + 1)</code> calls add one and three functional updaters add three.`,
    examples: [
      {
        label: "Counting renders across handlers, timeouts and promises",
        runnable: true,
        code: `import { useState, useRef } from "react";
import { flushSync } from "react-dom";

export default function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [naive, setNaive] = useState(0);
  const [functional, setFunctional] = useState(0);
  const [log, setLog] = useState([]);

  const renders = useRef(0);
  renders.current++;
  const renderAtStart = useRef(0);

  const mark = (label) => {
    const used = renders.current - renderAtStart.current;
    setLog((l) => [...l.slice(-4), label + " -> " + used + " render(s)"]);
  };
  const begin = () => { renderAtStart.current = renders.current; };

  // Three updates in a handler: one render.
  const inHandler = () => {
    begin();
    setA((x) => x + 1); setB((x) => x + 1); setA((x) => x + 1);
    setTimeout(() => mark("3 updates in a handler"), 0);
  };

  // Since React 18 this is ALSO one render. On React 17 it was three.
  const inTimeout = () => {
    begin();
    setTimeout(() => {
      setA((x) => x + 1); setB((x) => x + 1); setA((x) => x + 1);
      setTimeout(() => mark("3 updates in setTimeout"), 0);
    }, 0);
  };

  // Also one render.
  const inPromise = () => {
    begin();
    Promise.resolve().then(() => {
      setA((x) => x + 1); setB((x) => x + 1); setA((x) => x + 1);
      setTimeout(() => mark("3 updates in a promise"), 0);
    });
  };

  // flushSync forces each update through immediately — batching opted out.
  const withFlush = () => {
    begin();
    flushSync(() => setA((x) => x + 1));
    flushSync(() => setB((x) => x + 1));
    setTimeout(() => mark("2 updates with flushSync"), 0);
  };

  // The classic bug: all three read the SAME naive value from this render.
  const bumpNaive = () => { setNaive(naive + 1); setNaive(naive + 1); setNaive(naive + 1); };
  // The fix: each update applies to the result of the previous one.
  const bumpFunctional = () => {
    setFunctional((n) => n + 1); setFunctional((n) => n + 1); setFunctional((n) => n + 1);
  };

  const btn = { marginRight: 6, marginBottom: 6 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <p style={{ fontSize: 14 }}>
        component renders: <strong>{renders.current}</strong> · a={a} b={b}
      </p>

      <p>
        <button onClick={inHandler} style={btn}>handler</button>
        <button onClick={inTimeout} style={btn}>setTimeout</button>
        <button onClick={inPromise} style={btn}>promise</button>
        <button onClick={withFlush} style={btn}>flushSync</button>
      </p>

      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12 }}>
        {log.length ? log.join("\\n") : "(press a button)"}
      </pre>

      <h4 style={{ margin: "12px 0 6px" }}>Three increments, two ways</h4>
      <p style={{ fontSize: 14 }}>
        <button onClick={bumpNaive} style={btn}>setNaive(naive + 1) x3</button>
        <strong>{naive}</strong> — climbs by 1
      </p>
      <p style={{ fontSize: 14 }}>
        <button onClick={bumpFunctional} style={btn}>setFunctional(n =&gt; n + 1) x3</button>
        <strong>{functional}</strong> — climbs by 3
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Describe the `useRef` hook and its typical use cases.",
    seoDescription:
      "A mutable box that survives renders and never triggers one. Verified: three ref mutations caused zero renders, and the value still persisted.",
    description: `**Question presented to candidate:**
"What does \`useRef\` give you, and when would you reach for it rather than state?"

**What a strong answer should cover:**
- It returns a **mutable object** with a \`current\` property that persists for the component's lifetime.
- **Writing to \`.current\` never triggers a re-render.** That is the defining property, and it is the feature rather than a limitation.
- Two distinct use categories: **DOM access** (attach via the \`ref\` attribute) and **instance values** (timer ids, previous values, mutation flags, mutable caches).
- The deciding question: **does the UI need to update when this changes?** Yes means state; no means a ref.
- Do not read \`.current\` during render to decide output — it is not a reactive value, so the render can disagree with reality.
- \`useRef(initial)\` evaluates the initial value on every render even though it is only used once, so avoid expensive expressions there.
- React 19: \`ref\` is a plain prop, and ref callbacks can return a cleanup function.
- Related: \`useImperativeHandle\` for exposing a custom API rather than the raw node; a ref callback for measuring on attach.

**Clarifying questions expected:**
- "Does anything rendered depend on this value?" — that single question decides ref versus state.

**Code / implementation expected:** Yes — a DOM ref and an instance-value ref, ideally showing the render count not moving.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes state and effects.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render counts in section 3 were produced by mutating a ref repeatedly on React 19.2.8 and counting component invocations.

## 1. Why This Even Matters — A Story First

A kitchen has a whiteboard facing the room and a notepad in a drawer. Change the whiteboard and everyone looks up and reacts. Write in the notepad and nothing happens — which is precisely why the oven timer, the page you left off on, and the delivery you are expecting all live in the notepad. Nobody needs to react to those; you just need them to still be there later.

State is the whiteboard. A ref is the notepad. Choosing between them is choosing whether anyone should react.

## 2. The Core Idea

📌 **Interview term: <code>useRef</code>** — returns a **mutable object** with a single <code>current</code> property. The same object persists for the component's lifetime, and **writing to <code>current</code> never triggers a re-render**.

\`\`\`jsx
const ref = useRef(initialValue);
ref.current = something;      // no render, ever
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="State updates cause a render while ref writes do not">
  <defs>
    <marker id="ur-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Both persist. Only one is watched.</text>
  <rect class="d-box-accent" x="24" y="52" width="270" height="56" rx="10"/>
  <text class="d-text d-accent" x="159" y="76" text-anchor="middle">setState</text>
  <text class="d-sub" x="159" y="95" text-anchor="middle">React is watching</text>
  <path class="d-edge-accent" d="M 159 114 L 159 150" marker-end="url(#ur-arrow)"/>
  <rect class="d-box-accent" x="24" y="154" width="270" height="50" rx="10"/>
  <text class="d-text d-accent" x="159" y="184" text-anchor="middle">re-renders the component</text>
  <rect class="d-box-muted" x="370" y="52" width="270" height="56" rx="10"/>
  <text class="d-text" x="505" y="76" text-anchor="middle">ref.current = x</text>
  <text class="d-sub" x="505" y="95" text-anchor="middle">React is not watching</text>
  <path class="d-edge-dashed" d="M 505 114 L 505 150" marker-end="url(#ur-arrow)"/>
  <rect class="d-box-muted" x="370" y="154" width="270" height="50" rx="10"/>
  <text class="d-text" x="505" y="184" text-anchor="middle">nothing happens, value kept</text>
</svg>

## 3. Verified: mutations are free, and the value survives

A ref mutated three times, then an unrelated state update forced a render:

\`\`\`
3 ref mutations -> renders caused: 0 | ref value now: 3
after an unrelated render, the ref still holds: 3 | DOM node: INPUT
\`\`\`

Both defining properties in one measurement: **zero renders** from three writes, and the value **persisted** across a render caused by something else. The DOM node attached through the <code>ref</code> attribute was also still there.

📌 **Interview term:** contrast with an ordinary local variable, which would be reinitialised on every render, and with state, which would have caused three renders. A ref is the only one of the three that persists **and** stays silent.

## 4. The two use categories

**DOM access** — attach it with the <code>ref</code> attribute and reach the node imperatively:

\`\`\`jsx
const inputRef = useRef(null);
<input ref={inputRef} />
inputRef.current.focus();
\`\`\`

Focus management, scrolling into view, measuring with <code>getBoundingClientRect</code>, playing media, and integrating a non-React library that wants a DOM element.

**Instance values** — anything that must persist without being displayed:

| Use | Why a ref |
| :--- | :--- |
| A <code>setInterval</code> id | Needed to clear it; never rendered |
| The previous value of a prop | For comparison, not display |
| An "already initialised" flag | Guarding a one-time setup |
| A mutable cache | Rendering does not depend on it |
| The latest value for a long-lived callback | Avoids a <a href="PASTE_STALE_CLOSURES_URL_HERE" target="_blank" rel="noopener noreferrer">stale closure</a> |

## 5. The deciding question

📌 **Interview term:** ask **"does the UI need to update when this value changes?"** Yes means state. No means a ref.

The failure mode of getting it wrong is asymmetric, which is worth knowing:

- **State where a ref would do** costs an unnecessary render. Wasteful, visible, harmless.
- **A ref where state was needed** means the screen silently shows a stale value. Much worse, because nothing tells you.

That asymmetry is why reaching for a ref "to avoid a re-render" is a poor instinct.

## 6. Two rules that trip people up

**Do not read <code>.current</code> during render to decide output.** It is not a reactive value, so React has no idea it changed and the rendered result can disagree with reality. Refs belong in effects and event handlers.

**<code>useRef(expensive())</code> still evaluates every render.** The value is only *used* on the first render, but the expression is evaluated each time. For an expensive initial value, guard it:

\`\`\`jsx
const ref = useRef(null);
if (ref.current === null) ref.current = expensiveSetup();
\`\`\`

📌 **Interview term:** React 19 changed the surrounding API — <code>ref</code> is now a plain prop so <code>forwardRef</code> is unnecessary, and a **ref callback may return a cleanup function**. See <a href="PASTE_REACT19_REFS_URL_HERE" target="_blank" rel="noopener noreferrer">how ref handling changed in React 19</a>.

## 7. Common Pitfalls

- **Mutating a ref and expecting a re-render.** Verified: zero renders. The display silently goes stale.
- **Reading <code>.current</code> during render.** Not reactive; the output can be wrong.
- **Using a ref to dodge a re-render that was needed.** The asymmetry above makes this the costlier mistake.
- **An expensive <code>useRef</code> initial value.** Evaluated on every render; guard it instead.
- **Reaching into a child's DOM with a ref.** Refs are an escape hatch, not a data-flow mechanism.
- **Forgetting <code>ref.current</code> is null before mount.** Effects run after attachment, render does not.
- **An inline ref callback that sets state.** New function each render means detach and reattach — and an infinite loop. Wrap it in <code>useCallback</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it by its defining property:</strong> <span style="color:#f0e2c8;">"A mutable box with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">current</code> property that persists for the component lifetime and never triggers a render when you write to it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Frame the silence as the feature:</strong> <span style="color:#f0e2c8;">"Not re-rendering is the point, not a limitation — that is exactly why timer ids and previous values live there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give both categories:</strong> <span style="color:#f0e2c8;">"DOM access — focus, scroll, measure — and instance values like an interval id, a previous prop, or a setup flag."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the deciding question:</strong> <span style="color:#f0e2c8;">"Does the UI need to update when this changes? Yes is state, no is a ref."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the asymmetry:</strong> <span style="color:#f0e2c8;">"Using state where a ref would do costs a wasted render. Using a ref where state was needed shows a stale value with no warning — much worse."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a ref and state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both persist across renders; only state causes one. A ref is also mutable in place, where state must be replaced immutably. So state is for anything the UI displays, and a ref is for anything you need to remember but nobody needs to react to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why should you not read a ref during render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is not a reactive value — React does not know it changed, so it will not re-render, and the output can disagree with the actual value. It also breaks purity, since two renders with the same props could produce different results. Read refs in effects and handlers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref.current</code> populated for a DOM ref?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After React attaches it during commit — so it is <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> during the first render and available by the time effects run. That is why focusing an input goes in an effect, not in the render body.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useRef(expensive())</code> run every render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the argument is evaluated on every render even though only the first result is kept. Unlike <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code>, there is no lazy-initialiser form. Initialise to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and populate it on first use behind a check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a ref cause a memory leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself — React releases it on unmount. It becomes a problem when what you stored registers itself elsewhere, like a live socket or an observer, and is never torn down. The ref is not the leak; the thing inside it can be.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useRef</code>** | A persistent mutable box that never triggers a render |
| **<code>current</code>** | The single property holding the value |
| **Instance value** | Something remembered per component, not displayed |
| **DOM ref** | A ref attached to an element to reach the node |
| **<code>useImperativeHandle</code>** | Exposing a custom API through a ref |

---
**Conclusion:** <code>useRef</code> gives you a mutable box that survives every render and, crucially, never causes one — verified as zero renders from three writes, with the value still intact after an unrelated render. It covers two jobs: reaching a DOM node for focus, scroll, or measurement, and holding instance values such as timer ids or previous props. The deciding question is whether the UI must update when the value changes, and the asymmetry matters: state where a ref would do wastes a render, but a ref where state was needed shows a stale screen with nothing to warn you.`,
    examples: [
      {
        label: "A DOM ref and an instance-value ref, with the render count standing still",
        runnable: true,
        code: `import { useRef, useState, useEffect } from "react";

// A tiny helper built entirely on the "persists but does not render" property.
function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;   // the value from the PREVIOUS render
}

export default function App() {
  const [count, setCount] = useState(0);
  const previousCount = usePrevious(count);

  // 1. A DOM ref — reaching the node imperatively.
  const inputRef = useRef(null);

  // 2. Instance values — remembered, never displayed as they change.
  const clicksNotShown = useRef(0);
  const intervalId = useRef(null);
  const renders = useRef(0);
  renders.current++;

  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    // The id has to persist so cleanup can clear it — but nothing renders it.
    intervalId.current = setInterval(() => setCount((c) => c + 1), 800);
    return () => clearInterval(intervalId.current);
  }, [running]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 500 }}>
      <h4 style={{ marginTop: 0 }}>DOM ref</h4>
      <input ref={inputRef} placeholder="click the button to focus me" style={{ width: 240 }} />{" "}
      <button onClick={() => inputRef.current?.focus()}>focus</button>

      <h4>Instance value — mutating it renders nothing</h4>
      <p style={{ fontSize: 14 }}>
        component renders: <strong>{renders.current}</strong> · ref counter (read
        only when something else renders): <strong>{clicksNotShown.current}</strong>
      </p>
      <p>
        <button onClick={() => { clicksNotShown.current++; }}>
          bump the ref (nothing happens)
        </button>{" "}
        <button onClick={() => setCount((c) => c + 1)}>
          bump state (re-renders, revealing the ref)
        </button>
      </p>

      <h4>State, and the previous value kept in a ref</h4>
      <p style={{ fontSize: 14 }}>
        count: <strong>{count}</strong> · previous:{" "}
        <strong>{previousCount === undefined ? "—" : previousCount}</strong>
      </p>
      <p>
        <button onClick={() => setRunning((r) => !r)}>
          {running ? "stop" : "start"} the interval
        </button>
      </p>

      <p style={{ color: "#666", fontSize: 13 }}>
        Press the ref button several times — the render count does not move and
        neither does the displayed number. Then press the state button once and
        every hidden increment appears at the same moment.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between useMemo and useCallback?",
    seoDescription:
      "useMemo caches a computed value, useCallback caches a function. Verified: over three renders useMemo recomputed once and useCallback held one identity.",
    description: `**Question presented to candidate:**
"What is the difference between \`useMemo\` and \`useCallback\`, and when is each actually worth it?"

**What a strong answer should cover:**
- \`useMemo(fn, deps)\` caches the **result of calling** \`fn\`. \`useCallback(fn, deps)\` caches **the function itself**.
- They are the same mechanism: \`useCallback(fn, deps)\` is exactly \`useMemo(() => fn, deps)\`.
- Both compare dependencies with \`Object.is\` and recompute only when one changes.
- **Two distinct reasons to use either**: avoiding an expensive computation, and preserving **referential identity** so a memoised child or a dependency array does not see a change.
- The identity reason is by far the more common one in practice.
- Neither is free: both add a dependency array to maintain and a comparison on every render. Applied everywhere they are a net loss.
- They only pay off in specific conditions — a measured expensive computation, or a stable reference genuinely consumed by \`React.memo\`, a dependency array, or a context value.
- The React Compiler automates this class of memoisation, making manual use largely redundant in compiled code.

**Clarifying questions expected:**
- "Am I trying to avoid a computation, or preserve an identity?" — the two motivations lead to different hooks.
- "Have we profiled? Is this actually the bottleneck?"

**Code / implementation expected:** Yes — both hooks, with visible recompute and identity counts.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes hooks and re-renders.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The recompute and identity counts in section 3 were measured across three real renders on React 19.2.8.

## 1. Why This Even Matters — A Story First

Two different things get cached in a kitchen. The **stock** — simmered for hours — is made once and kept, because remaking it is expensive. The **house knife** is kept not because knives are expensive, but because everyone has learned where it lives; hand out a different knife each day and nobody knows where anything is.

<code>useMemo</code> caches the stock: an expensive result. <code>useCallback</code> caches the knife: a thing whose **identity** matters more than its cost.

## 2. The Core Idea

📌 **Interview term: <code>useMemo</code>** — caches the **value returned** by calling a function. React calls it and stores the result.

📌 **Interview term: <code>useCallback</code>** — caches **the function itself**. React does not call it; it just hands back the same function object.

\`\`\`jsx
const sorted  = useMemo(() => items.toSorted(), [items]);   // a VALUE
const onPick  = useCallback((id) => select(id), []);        // a FUNCTION
\`\`\`

📌 **Interview term:** they are the same mechanism. <code>useCallback(fn, deps)</code> is **exactly** <code>useMemo(() =&gt; fn, deps)</code> — the second exists only because caching a function is common enough to deserve nicer ergonomics.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="useMemo stores the result of calling a function while useCallback stores the function">
  <defs>
    <marker id="mc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One calls it, one does not</text>
  <rect class="d-box-accent" x="24" y="52" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="124" y="76" text-anchor="middle">useMemo</text>
  <text class="d-sub" x="124" y="95" text-anchor="middle">React calls the function</text>
  <path class="d-edge-accent" d="M 230 80 L 262 80" marker-end="url(#mc-arrow)"/>
  <rect class="d-box" x="268" y="52" width="180" height="56" rx="10"/>
  <text class="d-text" x="358" y="76" text-anchor="middle">stores the result</text>
  <text class="d-sub" x="358" y="95" text-anchor="middle">a value</text>
  <rect class="d-box-accent" x="24" y="128" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="124" y="152" text-anchor="middle">useCallback</text>
  <text class="d-sub" x="124" y="171" text-anchor="middle">React does not call it</text>
  <path class="d-edge-accent" d="M 230 156 L 262 156" marker-end="url(#mc-arrow)"/>
  <rect class="d-box" x="268" y="128" width="180" height="56" rx="10"/>
  <text class="d-text" x="358" y="152" text-anchor="middle">stores the function</text>
  <text class="d-sub" x="358" y="171" text-anchor="middle">same identity</text>
  <rect class="d-box-muted" x="470" y="86" width="170" height="64" rx="10"/>
  <text class="d-text" x="555" y="112" text-anchor="middle">same mechanism</text>
  <text class="d-sub" x="555" y="132" text-anchor="middle">deps compared by Object.is</text>
</svg>

## 3. Verified: both hold across renders

A component rendered three times, with the input list unchanged:

\`\`\`
useMemo recomputed: 1 time(s) | distinct values: 1
useCallback distinct function identities: 1
\`\`\`

<code>useMemo</code> ran its function **once** and returned the same value all three times. <code>useCallback</code> returned **one** function object across all three renders. Without them there would have been three computations and three distinct function identities.

## 4. Two reasons to reach for either

**Reason one: an expensive computation.** Sorting or filtering a large list, or a real calculation. This is what people assume <code>useMemo</code> is for, and it is the rarer case.

**Reason two: referential identity.** Far more common in practice. A new object or function every render breaks three things that all compare by reference:

| Consumer | What an unstable reference does |
| :--- | :--- |
| <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer"><code>React.memo</code></a> child | The bail-out never happens — measured as 3 renders instead of 1 |
| A <a href="PASTE_DEPS_ARRAY_URL_HERE" target="_blank" rel="noopener noreferrer">dependency array</a> | The effect re-runs every render — measured as 3 runs instead of 1 |
| A <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">context value</a> | Every consumer re-renders even with identical data |

📌 **Interview term:** naming identity as the *primary* motivation is what distinguishes a considered answer. Most real uses are not about computation cost at all.

## 5. Neither is free

Both add:

- A **dependency array to maintain** — a wrong one is a stale-value bug, and the linter cannot always help.
- A **comparison on every render**, plus retained memory for the cached value.
- **Cognitive load** for the next reader, who has to work out why it is there.

📌 **Interview term:** applied indiscriminately they are a **net loss**. Wrapping a cheap computation in <code>useMemo</code> costs more than recomputing it. The conditions worth applying either under are narrow: a computation you have measured, or a reference genuinely consumed by <code>memo</code>, a dependency array, or a context value.

## 6. What does not need memoising

- The <code>useState</code> setter — **already stable**.
- <code>dispatch</code> from <code>useReducer</code> — **already stable**.
- A function used only inside the component it is defined in.
- Any value passed to a child that is not memoised.
- Primitives. Numbers and strings compare by value.

## 7. The direction of travel

📌 **Interview term:** the <a href="PASTE_REACT_COMPILER_URL_HERE" target="_blank" rel="noopener noreferrer">React Compiler</a> inserts this class of memoisation automatically at build time, deriving dependencies from the code rather than from a hand-written array. In compiled files, manual <code>useMemo</code> and <code>useCallback</code> become largely redundant — existing calls keep working, so removal is a later cleanup.

## 8. Common Pitfalls

- **Memoising everything.** Every wrapper costs a comparison and an array to maintain.
- **<code>useCallback</code> for a child that is not memoised.** The stable identity is never checked, so the wrapper buys nothing.
- **Memoising the setter or <code>dispatch</code>.** Already stable.
- **A wrong dependency array.** Trades a performance concern for a correctness bug.
- **Confusing which one calls the function.** <code>useMemo</code> calls it; <code>useCallback</code> does not.
- **Assuming it guarantees caching.** React may discard cached values; treat both as an optimisation, not a semantic promise.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence each:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> caches the result of calling a function. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code> caches the function itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Show they are one mechanism:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback(fn, deps)</code> is literally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo(() =&gt; fn, deps)</code> — same hook, nicer ergonomics."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the real motivation:</strong> <span style="color:#f0e2c8;">"Most uses are about referential identity, not computation cost — keeping a reference stable for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, a dependency array, or a context value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State the cost:</strong> <span style="color:#f0e2c8;">"Neither is free — a dependency array to maintain and a comparison every render. Applied everywhere they are a net loss."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note what is already stable:</strong> <span style="color:#f0e2c8;">"The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> setter and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code> never need wrapping — and the React Compiler is making the rest largely redundant."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you implement <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useMemo</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo(() =&gt; fn, deps)</code> is precisely what it does. The distinction is ergonomic: one returns the function you pass, the other returns what that function returns. Being able to say that shows you understand there is one mechanism here, not two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code> pointless?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When nothing checks the identity. Passing it to a child that is not wrapped in <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, or using it only inside the same component, means the stability is never observed — so you have added a dependency array and a comparison for nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you memoise everything to be safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is usually a net loss. Each one adds a comparison on every render, retained memory, and a dependency array that can go wrong. For a cheap computation the memoisation costs more than recomputing, and a wrong array turns a performance question into a correctness bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code> setter need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. React guarantees the setter is the same function object on every render, as is <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code> from <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer</code>. Both are already safe to pass to a memoised child and never need to appear in a dependency array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is memoisation guaranteed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — React documents both as performance hints and reserves the right to discard cached values. So your code must be correct if the function runs again. Never put anything with a side effect inside <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> and rely on it running only once.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useMemo</code>** | Caches the value a function returns |
| **<code>useCallback</code>** | Caches the function itself |
| **Referential identity** | Being the same object across renders |
| **Dependency array** | The values that invalidate the cache |
| **Net loss** | Memoisation costing more than the work it avoids |

---
**Conclusion:** <code>useMemo</code> caches the value a function returns; <code>useCallback</code> caches the function. They are one mechanism — <code>useCallback(fn, deps)</code> is exactly <code>useMemo(() =&gt; fn, deps)</code> — and verified over three renders, <code>useMemo</code> recomputed once while <code>useCallback</code> held a single identity. The motivation that actually dominates real code is **referential identity** rather than computation cost, because <code>memo</code>, dependency arrays, and context values all compare by reference. Neither is free, so apply them where you have measured a cost or where a stable reference is genuinely consumed — and note the React Compiler is making the manual version largely redundant.`,
    examples: [
      {
        label: "Recompute counts and function identities, with and without memoisation",
        runnable: true,
        code: `import { useState, useMemo, useCallback, memo, useRef } from "react";

const stats = { computedMemo: 0, computedPlain: 0 };

// A memoised child, so function identity actually gets checked.
let childRenders = 0;
const Child = memo(function Child({ onPick, label }) {
  childRenders++;
  return (
    <p style={{ margin: "4px 0", fontSize: 14 }}>
      <code style={{ display: "inline-block", minWidth: 180 }}>{label}</code>
      child renders: <strong>{childRenders}</strong>{" "}
      <button onClick={() => onPick(1)}>pick</button>
    </p>
  );
});

const ITEMS = ["delta", "alpha", "charlie", "bravo"];

export default function App() {
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState("none");

  // Identities seen across renders — a Set counts the distinct ones.
  const memoValues = useRef(new Set());
  const plainValues = useRef(new Set());
  const stableFns = useRef(new Set());
  const freshFns = useRef(new Set());

  // useMemo — caches the RESULT. Recomputes only when ITEMS changes (never).
  const sortedMemo = useMemo(() => {
    stats.computedMemo++;
    return ITEMS.toSorted();
  }, []);

  // No memo — recomputed and reallocated on every single render.
  stats.computedPlain++;
  const sortedPlain = ITEMS.toSorted();

  // useCallback — caches the FUNCTION. One identity for the component lifetime.
  const stablePick = useCallback((id) => setPicked("stable " + id), []);
  // Fresh arrow — a new identity every render, so memo on the child cannot help.
  const freshPick = (id) => setPicked("fresh " + id);

  memoValues.current.add(sortedMemo);
  plainValues.current.add(sortedPlain);
  stableFns.current.add(stablePick);
  freshFns.current.add(freshPick);

  const td = { padding: "3px 14px 3px 0", fontFamily: "ui-monospace, monospace", fontSize: 13 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <p>
        <button onClick={() => setTick((t) => t + 1)}>re-render ({tick})</button>{" "}
        <span style={{ color: "#666", fontSize: 13 }}>picked: {picked}</span>
      </p>

      <table style={{ borderCollapse: "collapse", marginBottom: 12 }}>
        <tbody>
          <tr><td style={td}>useMemo — times computed</td><td style={{ ...td, color: "#161" }}>{stats.computedMemo}</td></tr>
          <tr><td style={td}>no memo — times computed</td><td style={{ ...td, color: "#a33" }}>{stats.computedPlain}</td></tr>
          <tr><td style={td}>useMemo — distinct values</td><td style={{ ...td, color: "#161" }}>{memoValues.current.size}</td></tr>
          <tr><td style={td}>no memo — distinct values</td><td style={{ ...td, color: "#a33" }}>{plainValues.current.size}</td></tr>
          <tr><td style={td}>useCallback — distinct fns</td><td style={{ ...td, color: "#161" }}>{stableFns.current.size}</td></tr>
          <tr><td style={td}>fresh arrow — distinct fns</td><td style={{ ...td, color: "#a33" }}>{freshFns.current.size}</td></tr>
        </tbody>
      </table>

      <Child onPick={stablePick} label="memo child + useCallback" />

      <p style={{ color: "#666", fontSize: 13 }}>
        Press re-render a few times. The memoised value and the stable function
        each stay at 1 distinct instance; the unmemoised ones climb with every
        render. The child stays at 1 render because its function prop never
        changes identity — swap in the fresh arrow and it would climb too.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you prevent unnecessary re-renders in functional components?",
    seoDescription:
      "Move state down and lift content up before reaching for memo. Verified: composition took an expensive child from 3 renders to 1 with no memoisation at all.",
    description: `**Question presented to candidate:**
"A component tree re-renders more than it should. Walk me through how you would reduce that."

**What a strong answer should cover:**
- **Measure first.** The DevTools Profiler with "record why each component rendered" tells you the cause — props, state, parent, or context — and that determines the fix.
- Know the four causes: its own state changed, its parent re-rendered, a context it reads changed, or its props changed.
- **Structural fixes before memoisation**: move state down (colocate it in the smallest component that needs it) and lift content up (pass the expensive subtree as \`children\`).
- Why structure first: it cannot be accidentally switched off, whereas \`memo\` is silently defeated by one inline object.
- Then \`React.memo\` — and the caveat that it needs \`useMemo\`/\`useCallback\` cooperation from the parent to work at all.
- Context needs its own fix: **split by change frequency**, since \`memo\` does not block context propagation.
- Long lists want **virtualisation**, not memoisation — rendering 20 rows instead of 10,000.
- The honest framing: **a re-render is not automatically a problem.** It is cheap unless the component is expensive or it happens very often.
- The React Compiler automates the memoisation half.

**Clarifying questions expected:**
- "Have we profiled, and is the re-render actually expensive or just frequent?"
- "Where does the state that triggers it live?"

**Code / implementation expected:** Yes — the move-state-down and lift-content-up refactors with visible counts.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes memo and hooks.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render counts quoted below were measured on React 19.2.8 across this collection; see <a href="PASTE_COMPOSITION_VS_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">avoiding re-renders with composition</a> and <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">React.memo</a> for the full runs.

## 1. Why This Even Matters — A Story First

A draught in a house has two possible fixes. Fit self-closing hinges to every door, calibrate each one, and re-check them whenever anyone changes a door. Or notice the draught comes from one open window, and close it.

Both work. One creates a dozen moving parts that need maintaining and fail silently when someone miscalibrates them. The other changes the situation so the problem cannot occur.

Memoisation is hinges. Structure is closing the window. Reach for the second first.

## 2. The Core Idea

Before fixing anything, know **why** a component re-rendered. There are only four causes:

| Cause | The fix that applies |
| :--- | :--- |
| Its own state changed | Correct — unless the state is too high up |
| **Its parent re-rendered** | Composition, or <code>memo</code> |
| A context it reads changed | Split the context |
| Its props changed | Correct — unless the props are unstable references |

📌 **Interview term:** the DevTools Profiler setting **"record why each component rendered"** reports exactly which of these applies, and it is off by default. If it says *the parent rendered* and nothing about this component changed, that is the wasteful case worth fixing.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Four causes of a re-render each leading to a different fix">
  <defs>
    <marker id="rr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Find the cause before choosing the fix</text>
  <rect class="d-box-muted" x="240" y="44" width="180" height="46" rx="10"/>
  <text class="d-text" x="330" y="64" text-anchor="middle">profile it</text>
  <text class="d-sub" x="330" y="82" text-anchor="middle">why did this render</text>
  <path class="d-edge" d="M 276 94 L 110 148" marker-end="url(#rr-arrow)"/>
  <path class="d-edge" d="M 310 94 L 270 148" marker-end="url(#rr-arrow)"/>
  <path class="d-edge" d="M 350 94 L 400 148" marker-end="url(#rr-arrow)"/>
  <path class="d-edge" d="M 384 94 L 560 148" marker-end="url(#rr-arrow)"/>
  <rect class="d-box-accent" x="16" y="152" width="150" height="52" rx="10"/>
  <text class="d-sub" x="91" y="174" text-anchor="middle">parent rendered</text>
  <text class="d-sub" x="91" y="192" text-anchor="middle">composition</text>
  <rect class="d-box-accent" x="182" y="152" width="150" height="52" rx="10"/>
  <text class="d-sub" x="257" y="174" text-anchor="middle">unstable props</text>
  <text class="d-sub" x="257" y="192" text-anchor="middle">memo plus useCallback</text>
  <rect class="d-box-accent" x="348" y="152" width="150" height="52" rx="10"/>
  <text class="d-sub" x="423" y="174" text-anchor="middle">context changed</text>
  <text class="d-sub" x="423" y="192" text-anchor="middle">split the context</text>
  <rect class="d-box-accent" x="514" y="152" width="130" height="52" rx="10"/>
  <text class="d-sub" x="579" y="174" text-anchor="middle">huge list</text>
  <text class="d-sub" x="579" y="192" text-anchor="middle">virtualise</text>
</svg>

## 3. The framing that should come first

📌 **Interview term:** **a re-render is not automatically a problem.** React re-runs the component function and diffs the result; if nothing changed, no DOM operation happens. That is usually microseconds.

It becomes worth fixing when the component is genuinely **expensive**, or the render happens **very often** — every keystroke, every scroll frame, every animation tick. Optimising a cheap component that renders occasionally is effort spent for nothing, and it makes the code harder to read.

## 4. Fix one: move state down

If only a small part of a large component uses a piece of state, extract that part so the state lives inside it. Renders only travel **downward**, so state placed low cannot reach the expensive component above it.

\`\`\`jsx
// Typing re-renders the whole page including the chart
function Page() {
  const [query, setQuery] = useState("");
  return <><input value={query} onChange={e => setQuery(e.target.value)} /><ExpensiveChart /></>;
}

// The state now lives only where it is used
function Page() {
  return <><SearchBox /><ExpensiveChart /></>;
}
\`\`\`

## 5. Fix two: lift content up

Pass the expensive subtree in as <code>children</code> from a component that does not re-render. Its element keeps a stable identity, so React skips it.

**Measured:** an expensive child rendered **3 times** when created inside a stateful parent, and **1 time** when passed as <code>children</code> — with no <code>memo</code>, no <code>useCallback</code>, and no dependency arrays.

📌 **Interview term:** this is React's built-in **referential bail-out**, not <code>memo</code>. It predates <code>memo</code> and needs no configuration — an element identical by reference to last render is skipped.

## 6. Fix three: <code>React.memo</code>, with its caveat

<code>memo</code> skips a re-render when props are shallow-equal. **Measured:** 1 render against 3 for an unmemoised sibling — but the same memoised component with an **inline object prop** went straight back to **3**.

📌 **Interview term:** <code>memo</code> requires cooperation. The parent must supply stable references via <code>useMemo</code> and <code>useCallback</code>, and one inline object or arrow anywhere in the props silently disables it. That fragility is why it belongs after the structural fixes rather than before them.

And it does **not** block context: a <code>memo</code>-wrapped consumer still re-rendered when an unrelated field of its context changed. Context needs <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">splitting</a>.

## 7. Fix four: virtualisation for long lists

Rendering 10,000 rows is not a memoisation problem. **Virtualisation** renders only the rows in view plus a small buffer — twenty elements instead of ten thousand. TanStack Virtual or react-window. No amount of <code>memo</code> beats not rendering the rows at all.

## 8. Common Pitfalls

- **Optimising before profiling.** Turn on render reasons and find the actual cause.
- **Reaching for <code>memo</code> first.** It is the fragile option and it needs parent cooperation.
- **Memoising everything.** Each wrapper is a comparison plus a dependency array to maintain.
- **Expecting <code>memo</code> to stop context renders.** Measured: it does not.
- **Fixing a re-render that costs nothing.** Cheap components rendering occasionally are fine.
- **Memoising a long list instead of virtualising.** Wrong tool entirely.
- **Believing the React Compiler removes the need for this.** It automates memoisation; where your state lives is still your decision.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Push back gently first:</strong> <span style="color:#f0e2c8;">"A re-render is not automatically a problem — it is cheap unless the component is expensive or it happens very often. So I would profile before changing anything."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the four causes:</strong> <span style="color:#f0e2c8;">"Own state, parent rendered, context changed, or props changed. The Profiler tells you which, and that decides the fix."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lead with structure:</strong> <span style="color:#f0e2c8;">"Move state down so it cannot reach the expensive sibling, or lift content up as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>. I have measured that taking a child from three renders to one with no memo at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Then memo, with the caveat:</strong> <span style="color:#f0e2c8;">"It works, but one inline object prop silently defeats it — I measured it going straight back to three renders. Structure cannot be switched off that way."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cover the two special cases:</strong> <span style="color:#f0e2c8;">"Context needs splitting because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> does not block it, and a long list wants virtualisation rather than memoisation."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is every unnecessary re-render worth fixing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. React re-runs the function and diffs; if nothing changed there is no DOM work, and that is usually microseconds. It matters when the component is genuinely expensive or renders on every keystroke or frame. Optimising the rest costs readability for no measurable gain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why prefer composition over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">memo</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Failure mode. Composition works because the element identity is a structural fact — nobody can accidentally break it. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> depends on every parent continuing to pass stable references forever, and one inline object silently disables it with no warning at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A component re-renders when its context changes but it is memoised. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> only compares props, and a context value never arrives through props — React marks consumers for re-render directly. The fix is to split the context by change frequency so the component only subscribes to what it actually reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a list of ten thousand rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Virtualise it. Memoising ten thousand rows still creates ten thousand elements and ten thousand DOM nodes. Rendering only the twenty in view plus a buffer is a completely different order of magnitude — TanStack Virtual or react-window.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the React Compiler make all this unnecessary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It automates the memoisation half — most hand-written <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code> become redundant. It does not decide where your state lives, and it does not virtualise a list. Colocating state avoids the work entirely rather than caching around it.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Render reasons** | The Profiler setting naming why a component rendered |
| **Move state down** | Colocating state in the smallest component that needs it |
| **Lift content up** | Passing an expensive subtree in as <code>children</code> |
| **Referential bail-out** | React skipping a subtree whose element is unchanged |
| **Virtualisation** | Rendering only the rows currently visible |

---
**Conclusion:** start by asking whether the re-render actually costs anything, then profile with render reasons on, because the cause determines the fix. Move state down so it cannot reach an expensive sibling, and lift content up so its element identity stays stable — measured at three renders down to one with no memoisation. Reach for <code>React.memo</code> after that, knowing it needs stable references from every parent and that one inline object silently defeats it. Context needs splitting rather than <code>memo</code>, and a very long list wants virtualisation rather than either.`,
    examples: [
      {
        label: "The same tree fixed three ways — state down, content up, and memo",
        runnable: true,
        code: `import { useState, useCallback, memo } from "react";

const counts = { naive: 0, stateDown: 0, contentUp: 0, memoised: 0 };

function Expensive({ which }) {
  let waste = 0;
  for (let i = 0; i < 120000; i++) waste += i;   // simulate real render cost
  counts[which]++;
  return (
    <p style={{ background: "#f6f6f6", padding: 6, borderRadius: 6, margin: "6px 0", fontSize: 14 }}>
      renders: <strong>{counts[which]}</strong>
    </p>
  );
}

// ❌ NAIVE: the input state sits beside the expensive child, so every
//    keystroke re-renders it.
function Naive() {
  const [q, setQ] = useState("");
  return (
    <Panel title="❌ state beside the expensive child">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="type here" />
      <Expensive which="naive" />
    </Panel>
  );
}

// ✅ FIX 1 — MOVE STATE DOWN: the input owns its own state, so renders
//    cannot travel sideways to the sibling.
function SearchBox() {
  const [q, setQ] = useState("");
  return <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="type here" />;
}
function StateDown() {
  return (
    <Panel title="✅ state moved down into the input">
      <SearchBox />
      <Expensive which="stateDown" />
    </Panel>
  );
}

// ✅ FIX 2 — LIFT CONTENT UP: the element is created by ContentUp, which never
//    re-renders, so Shell receives the identical object every time.
function Shell({ children }) {
  const [q, setQ] = useState("");
  return (
    <Panel title="✅ expensive child passed as children">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="type here" />
      {children}
    </Panel>
  );
}
function ContentUp() {
  return <Shell><Expensive which="contentUp" /></Shell>;
}

// ✅ FIX 3 — MEMO: works, but only while every prop stays referentially stable.
const MemoExpensive = memo(Expensive);
function Memoised() {
  const [q, setQ] = useState("");
  const noop = useCallback(() => {}, []);
  return (
    <Panel title="✅ memo + useCallback (fragile)">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="type here" />
      <MemoExpensive which="memoised" onThing={noop} />
    </Panel>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>{title}</h4>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <Naive />
      <StateDown />
      <ContentUp />
      <Memoised />
      <p style={{ color: "#666", fontSize: 13 }}>
        Type in each box. The first counter climbs with every keystroke; the
        other three stay at 1. Only the middle two achieve it structurally —
        add an inline object prop to the memo version and it climbs again.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you optimize performance in a React application?",
    seoDescription:
      "Measure first, then fix by category: bundle size, network waterfalls, render cost, list length. Re-render tuning is one lever, not the whole answer.",
    description: `**Question presented to candidate:**
"An app feels slow. How do you approach making it faster?"

**What a strong answer should cover:**
- **Measure before changing anything**, and measure the right thing: Lighthouse and Core Web Vitals for load, the DevTools Profiler for interaction, the Network panel for data.
- The categories are distinct and easily confused: **load performance**, **network**, **render performance**, and **memory**.
- **Load**: code splitting with \`React.lazy\` at route boundaries, tree shaking, checking the bundle for accidentally-included heavy dependencies, and server rendering for first paint.
- **Network**: eliminating waterfalls with \`Promise.all\` and loaders, caching with a query library, and preloading.
- **Render**: structural fixes first (move state down, lift content up), then memoisation, then context splitting.
- **Lists**: virtualisation, which is a different order of magnitude from memoisation.
- Concurrent features: \`useTransition\` and \`useDeferredValue\` to keep input responsive during expensive updates — perceived performance rather than less work.
- Images and fonts are frequently the real problem and have nothing to do with React.
- Know which metric you are moving: LCP, INP, and CLS measure different things.

**Clarifying questions expected:**
- "Slow to load, or slow to interact? Those are completely different problems."
- "Do we have real user metrics, or is this anecdotal?"
- "Which device and network are we targeting?"

**Code / implementation expected:** Optional — route-level code splitting and a transition are the two most demonstrable.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes broad React familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This is a breadth question, so it leans on measurements taken elsewhere in this collection rather than introducing new ones — the render-cost figures come from <a href="PASTE_PREVENT_RERENDERS_URL_HERE" target="_blank" rel="noopener noreferrer">preventing unnecessary re-renders</a>.

## 1. Why This Even Matters — A Story First

A restaurant is getting complaints that service is slow. The manager could buy a faster oven. But the complaints turn out to be about how long it takes to be *seated* — the kitchen was never the problem, and a faster oven would have changed nothing while costing a great deal.

Almost every bad performance answer is buying an oven. The good answer starts by asking **which part is slow**, because "slow to load" and "slow to respond" have nothing in common except the word.

## 2. The Core Idea

📌 **Interview term:** the first move is always **measure**, and the second is **categorise**. Performance is not one problem:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Four performance categories each with their own tool and fixes">
  <text class="d-text" x="330" y="24" text-anchor="middle">Four different problems wearing the same word</text>
  <rect class="d-box-accent" x="16" y="48" width="150" height="80" rx="10"/>
  <text class="d-text d-accent" x="91" y="74" text-anchor="middle">load</text>
  <text class="d-sub" x="91" y="96" text-anchor="middle">bundle size, LCP</text>
  <text class="d-sub" x="91" y="114" text-anchor="middle">Lighthouse</text>
  <rect class="d-box-accent" x="180" y="48" width="150" height="80" rx="10"/>
  <text class="d-text d-accent" x="255" y="74" text-anchor="middle">network</text>
  <text class="d-sub" x="255" y="96" text-anchor="middle">waterfalls, caching</text>
  <text class="d-sub" x="255" y="114" text-anchor="middle">Network panel</text>
  <rect class="d-box-accent" x="344" y="48" width="150" height="80" rx="10"/>
  <text class="d-text d-accent" x="419" y="74" text-anchor="middle">render</text>
  <text class="d-sub" x="419" y="96" text-anchor="middle">re-renders, INP</text>
  <text class="d-sub" x="419" y="114" text-anchor="middle">React Profiler</text>
  <rect class="d-box-accent" x="508" y="48" width="136" height="80" rx="10"/>
  <text class="d-text d-accent" x="576" y="74" text-anchor="middle">memory</text>
  <text class="d-sub" x="576" y="96" text-anchor="middle">leaks over time</text>
  <text class="d-sub" x="576" y="114" text-anchor="middle">heap snapshots</text>
  <rect class="d-box-muted" x="150" y="156" width="360" height="50" rx="10"/>
  <text class="d-text" x="330" y="178" text-anchor="middle">measure first</text>
  <text class="d-sub" x="330" y="197" text-anchor="middle">the category decides the fix</text>
</svg>

📌 **Interview term:** name the metrics. **LCP** measures how quickly the main content appears, **INP** measures how quickly the page responds to interaction, and **CLS** measures visual stability. They are moved by completely different work, and saying which one you are targeting is a strong signal.

## 3. Load performance

- **Code splitting** at route boundaries with <code>React.lazy</code> plus a <code>Suspense</code> boundary. The bundler emits a separate chunk that is only fetched when that route is visited.
- **Audit the bundle.** A bundle analyser routinely reveals one enormous accidental dependency — a whole date library for one function, or an icon set imported wholesale.
- **Server rendering** or static generation so the user sees content before the JavaScript arrives.
- **Images and fonts**, which are very often the actual problem: modern formats, correct sizing, lazy loading below the fold, and <code>font-display</code>.

📌 **Interview term:** mentioning images and fonts matters, because it shows you are optimising the *page* rather than assuming React is the bottleneck. It frequently is not.

## 4. Network performance

- **Waterfalls** — requests running in sequence that could have run in parallel. <code>Promise.all</code> within a component, and starting requests early rather than after a parent finishes rendering. See <a href="PASTE_RSC_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">waterfall prevention</a>.
- **Caching and deduplication** with a query library, so three components asking for the same data make one request.
- **Render-as-you-fetch** rather than fetch-on-render: an effect cannot start its request until after the component has mounted and painted.

## 5. Render performance

The category people jump to first, and worth doing **third**:

- **Structure before memoisation.** Move state down; lift content up. Measured at **3 renders down to 1** with no memoisation at all.
- **<code>React.memo</code>** after that, remembering it needs stable references and that an inline object silently defeats it — measured going back to **3**.
- **Split contexts**, because <code>memo</code> does not block context propagation.
- **Virtualise long lists.** Twenty rows instead of ten thousand is a different order of magnitude from memoising ten thousand.

## 6. Perceived performance

📌 **Interview term:** <code>useTransition</code> and <code>useDeferredValue</code> do not make anything faster — they change **priority**. Typing stays responsive while an expensive filtered list updates at lower priority in the background. The total work is identical; the input no longer waits for it.

This is often the highest-value change for an interaction that feels sluggish, because the complaint is usually about responsiveness rather than throughput.

## 7. The order to work in

1. **Measure**, and identify the category.
2. Fix **load** — bundle size and code splitting usually pay best.
3. Fix **network** — waterfalls and missing caching.
4. Fix **render** — structure, then memoisation.
5. Use **concurrent features** for responsiveness.
6. **Measure again** to confirm it moved.

## 8. Common Pitfalls

- **Optimising without measuring.** The most common failure, and it usually targets the wrong category.
- **Assuming React is the bottleneck.** Images, fonts, and third-party scripts frequently dominate.
- **Memoising everything.** Each wrapper has a real cost and makes the code harder to read.
- **Treating all metrics as one number.** LCP and INP are moved by different work entirely.
- **Testing only on a fast machine.** Throttle CPU and network; your laptop is not the target device.
- **Memoising a huge list instead of virtualising it.** Wrong tool.
- **Ignoring the production build.** Development React is much slower and includes warnings that never ship.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Ask before answering:</strong> <span style="color:#f0e2c8;">"Slow to load or slow to respond? Those are different problems with different tools — Lighthouse for one, the React Profiler for the other."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the categories:</strong> <span style="color:#f0e2c8;">"Load, network, render, memory. Measure first and let the category pick the fix, rather than reaching for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> reflexively."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show load usually pays best:</strong> <span style="color:#f0e2c8;">"Route-level code splitting, a bundle audit for accidental heavy dependencies, and images and fonts — which are very often the real culprit and nothing to do with React."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order the render fixes:</strong> <span style="color:#f0e2c8;">"Structure before memoisation — moving state down took an expensive child from three renders to one for me, with no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> at all. Virtualise long lists."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Separate real from perceived:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTransition</code> does not do less work — it reprioritises, so typing stays responsive. Often that is the actual complaint."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you start on an app you have never seen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Lighthouse run on a throttled connection to see whether it is a load problem, then the Network panel for waterfalls, then the React Profiler on the specific interaction that feels slow. Three measurements before a single change — otherwise I am guessing which category I am in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between LCP and INP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">LCP is how quickly the main content appears — a loading metric, moved by bundle size, server rendering, and image optimisation. INP is how quickly the page responds to an interaction — moved by render cost, long tasks, and reprioritising with transitions. Different problems entirely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useTransition</code> make the app faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — the same work happens. It marks an update as low priority so React can interrupt it to handle typing or clicking. The app does not do less; it stops making the user wait for work they did not ask about yet. That is perceived performance, and it is often exactly the complaint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the profiler shows nothing obviously slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is probably not a render problem. I would look at the Network panel for waterfalls, the Performance panel for long tasks from third-party scripts, and image weight. A React app can feel slow while React itself does almost nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you profile a production build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You need a build with profiling enabled — a plain production build strips the instrumentation and minifies names, so the Profiler shows nothing useful. It is worth keeping one available, because development React is meaningfully slower and profiling it exaggerates render cost.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LCP** | How quickly the main content appears |
| **INP** | How quickly the page responds to interaction |
| **CLS** | How much the layout shifts while loading |
| **Code splitting** | Emitting separate chunks fetched on demand |
| **Waterfall** | Sequential requests that could have been parallel |
| **Virtualisation** | Rendering only the rows currently in view |
| **Perceived performance** | Feeling faster without doing less work |

---
**Conclusion:** performance is four different problems sharing one word — load, network, render, and memory — so the answer starts with measuring and categorising rather than reaching for <code>memo</code>. Load usually pays best: route-level code splitting, a bundle audit, and the images and fonts that are frequently the real culprit and have nothing to do with React. Network means killing waterfalls and caching properly. Render means structure before memoisation, verified at three renders down to one, with virtualisation for long lists. And <code>useTransition</code> is worth naming separately, because it does not do less work — it stops the user waiting for work they did not ask for.`,
    examples: [
      {
        label: "Code splitting, virtualisation, and a transition keeping input responsive",
        runnable: true,
        code: `import { useState, useMemo, useDeferredValue, useTransition, lazy, Suspense } from "react";

// ── LOAD: a route-level split point. The bundler emits a separate chunk that
//    is only fetched when this actually renders. ─────────────────────────────
const HeavyPanel = lazy(
  () => new Promise((resolve) =>
    setTimeout(() => resolve({
      default: () => (
        <div style={{ background: "#eef", padding: 10, borderRadius: 6 }}>
          Heavy panel — arrived as its own chunk, not in the initial bundle.
        </div>
      ),
    }), 700)),
);

const ROWS = Array.from({ length: 5000 }, (_, i) => "Row " + i + " — item name here");

// ── RENDER: a hand-rolled window. Only the visible slice is rendered, which is
//    a different order of magnitude from memoising 5000 rows. ───────────────
const ROW_H = 24;
const WINDOW = 300;

function VirtualList({ rows }) {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 3);
  const visible = rows.slice(start, start + Math.ceil(WINDOW / ROW_H) + 6);

  return (
    <div
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height: WINDOW, overflow: "auto", border: "1px solid #ddd", borderRadius: 6 }}
    >
      {/* A spacer gives the scrollbar the full height */}
      <div style={{ height: rows.length * ROW_H, position: "relative" }}>
        {visible.map((r, i) => (
          <div key={start + i} style={{
            position: "absolute", top: (start + i) * ROW_H, height: ROW_H,
            fontSize: 13, lineHeight: ROW_H + "px", paddingLeft: 8,
          }}>
            {r}
          </div>
        ))}
      </div>
      <p style={{ position: "sticky", bottom: 0, background: "#fff", margin: 0, fontSize: 12, padding: 4 }}>
        rendering <strong>{visible.length}</strong> of {rows.length} rows
      </p>
    </div>
  );
}

export default function App() {
  const [showHeavy, setShowHeavy] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // PERCEIVED: the deferred value lags behind, so typing never waits for the
  // expensive filter. The same work happens — just at a lower priority.
  const deferred = useDeferredValue(query);
  const filtered = useMemo(
    () => ROWS.filter((r) => r.toLowerCase().includes(deferred.toLowerCase())),
    [deferred],
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <h4 style={{ marginTop: 0 }}>Code splitting</h4>
      <button onClick={() => setShowHeavy((s) => !s)}>
        {showHeavy ? "hide" : "load"} the heavy panel
      </button>
      {showHeavy && (
        <Suspense fallback={<p style={{ color: "#888" }}>fetching chunk…</p>}>
          <HeavyPanel />
        </Suspense>
      )}

      <h4>Virtualised list of {ROWS.length} rows</h4>
      <input
        value={query}
        onChange={(e) => startTransition(() => setQuery(e.target.value))}
        placeholder="filter — typing stays responsive"
        style={{ width: "100%", marginBottom: 6 }}
      />
      <div style={{ opacity: isPending || query !== deferred ? 0.6 : 1, transition: "opacity .15s" }}>
        <VirtualList rows={filtered} />
      </div>

      <p style={{ color: "#666", fontSize: 13 }}>
        Scroll the list: only about a dozen rows exist in the DOM at any moment.
        Type quickly in the filter: the input never stutters, because the
        expensive filter runs at a lower priority and the list dims while it
        catches up.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
