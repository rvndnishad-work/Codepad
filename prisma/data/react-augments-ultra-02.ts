/**
 * React "ultra" rewrite — batch 02 (fundamentals).
 *
 * Same conventions as react-augments-ultra-01.ts: double-quoted SVG attributes,
 * `<svg class="iq-diagram">` with the shared d-* helper classes, <code> tags for
 * inline code, no leading H1, `description` is plain markdown (that field renders
 * without rehype-raw), examples are self-contained App.js with `runnable: true`.
 *
 * Two answers in this batch are materially DIFFERENT from the old bank because
 * the underlying facts changed and were re-checked rather than recalled:
 *   - PropTypes: verified silently ignored in React 19.2.8 (validator never runs,
 *     no warning emitted). The honest answer is now "do not use it".
 *   - create-react-app: officially sunset by the React team on 2025-02-14.
 *
 * Every "Verified" block was produced by executing code against React 19.2.8 in
 * this repo. Version and release claims were checked on react.dev.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is React and its main features?",
    seoDescription:
      "React is a declarative, component-based library for building UIs: you describe what the screen should look like and React works out the DOM operations.",
    description: `**Question presented to candidate:**
"Start me off simply — what is React, and what are the main features that define it?"

**What a strong answer should cover:**
- React is a **library** for building user interfaces, not a full framework — it deliberately leaves routing, data fetching, and build tooling to others.
- **Declarative**: you describe what the UI should look like for a given state; React works out the DOM operations.
- **Component-based**: the UI is composed from independent, reusable pieces that own their own state.
- The **Virtual DOM** and reconciliation: React diffs a cheap in-memory description against the previous one and applies the minimum real DOM changes.
- **Unidirectional data flow**: data travels down through props, which makes state changes traceable.
- **Learn once, write anywhere**: the same component model targets DOM, native, and other renderers.
- Bonus signal: an "element" is just a plain, frozen JavaScript object — the declarative description React works from.

**Clarifying questions expected:**
- "Do you want the pitch, or the mechanism underneath it?"
- "Should I cover the modern additions — Server Components and the compiler — or stick to fundamentals?"

**Code / implementation expected:** Optional. A tiny component showing declarative state-to-UI mapping is plenty.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes no prior React knowledge.
**Difficulty:** Easy

> **How to read this doc:** Every concept is explained in plain language first. Right after, you will see a callout like <code>📌 Interview term:</code> — the exact vocabulary an interviewer expects. The object-shape claims below were produced by running React 19.2.8 in this repo.

## 1. Why This Even Matters — A Story First

Imagine decorating a room by giving instructions over the phone. The **imperative** way: "walk to the north wall, take down the blue picture, put up the red one, move the lamp two feet left." You have to know the current state of the room and describe every individual movement. Get one step wrong and everything after it is wrong too.

The **declarative** way: "here is a photo of how the room should look." Someone else compares it to how the room looks now and works out the moves.

That second approach is React. You never write "find this node and change its text." You describe what the screen should look like for the current data, and React figures out the difference.

## 2. The Core Idea

📌 **Interview term:** React is a **declarative, component-based JavaScript library for building user interfaces**. You describe the UI as a function of state, and React handles the DOM updates needed to match that description.

Note the word **library**, not framework. React deliberately does one thing — render UI — and leaves routing, data fetching, and build tooling to the surrounding ecosystem. Calling it a framework in an interview is a small but noticeable slip.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Imperative code lists every DOM operation while declarative code describes the target UI">
  <defs>
    <marker id="rf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Two ways to update a screen</text>
  <rect class="d-box-muted" x="24" y="48" width="270" height="140" rx="10"/>
  <text class="d-text" x="159" y="74" text-anchor="middle">Imperative</text>
  <text class="d-sub" x="159" y="100" text-anchor="middle">querySelector, then</text>
  <text class="d-sub" x="159" y="122" text-anchor="middle">textContent, classList,</text>
  <text class="d-sub" x="159" y="144" text-anchor="middle">appendChild, removeChild</text>
  <text class="d-sub" x="159" y="170" text-anchor="middle">you track the current state</text>
  <rect class="d-box-accent" x="346" y="48" width="270" height="140" rx="10"/>
  <text class="d-text d-accent" x="481" y="74" text-anchor="middle">Declarative — React</text>
  <text class="d-sub" x="481" y="100" text-anchor="middle">return the UI you want</text>
  <text class="d-sub" x="481" y="122" text-anchor="middle">for the current state</text>
  <text class="d-sub" x="481" y="144" text-anchor="middle">React diffs and patches</text>
  <text class="d-sub" x="481" y="170" text-anchor="middle">it tracks the state for you</text>
</svg>

The whole value proposition is in that last line. Bugs in imperative UI code come overwhelmingly from the screen and the data drifting out of sync. Declarative rendering makes that drift structurally impossible.

## 3. The main features

| Feature | What it means in practice |
| :--- | :--- |
| **Declarative** | You return the UI for a state; React computes the DOM changes |
| **Component-based** | The UI is built from small, reusable, self-contained pieces |
| **Virtual DOM** | A cheap in-memory tree React diffs before touching the real DOM |
| **Unidirectional data flow** | Data flows down via props, so changes are traceable |
| **Learn once, write anywhere** | The same model targets DOM, native, PDF, WebGL |
| **JSX** | HTML-like syntax that compiles to plain function calls |

📌 **Interview term: Reconciliation** — the diffing process. React compares the newly returned description with the previous one and applies only the differences to the real DOM, rather than rebuilding everything.

## 4. Verified: an "element" really is just a plain object

The declarative description is not a metaphor — it is literally data. Inspecting what JSX produces on React 19.2.8:

\`\`\`js
function Greeting({ name }) { return <h1>Hello {name}</h1>; }
const el = <Greeting name="Ada" />;
\`\`\`

\`\`\`
typeof Greeting (the component): function
typeof el       (the element)  : object
Object.keys(el): ["$$typeof","type","key","props","_owner","_store"]
el.type === Greeting: true
el.props: {"name":"Ada"}
Object.isFrozen(el): true
\`\`\`

📌 **Interview term:** a React **element** is a plain, **frozen** JavaScript object describing what should appear. It is not a DOM node and it is not a component instance. This is why creating elements is cheap enough to do on every render, and why the Virtual DOM diff is just an object comparison.

## 5. What React deliberately does *not* do

Naming the gaps is a strong signal that you have shipped React rather than just read about it:

- **Routing** — <code>react-router</code>, or your framework
- **Data fetching and caching** — TanStack Query, SWR, or a framework loader
- **Global state** — Context, Redux, Zustand, Jotai
- **Build tooling** — Vite, Next.js, Rsbuild
- **Styling** — CSS Modules, Tailwind, CSS-in-JS

## 6. Common Pitfalls

- **Calling React a framework.** It is a library; the ecosystem supplies the rest. Frameworks like Next.js are built *on* it.
- **Saying "the Virtual DOM makes React fast".** More honest: it makes declarative code *fast enough*. Hand-written imperative DOM updates can beat it — the win is correctness and maintainability, not raw speed.
- **Confusing an element with a component.** A component is a function; an element is the frozen object it returns. See <a href="PASTE_ELEMENT_VS_COMPONENT_URL_HERE" target="_blank" rel="noopener noreferrer">element vs component</a>.
- **Claiming React re-renders the whole page.** It re-runs component functions and diffs the result; the real DOM only receives the differences.
- **Forgetting unidirectional flow when asked about data.** "Props down, events up" is the phrase interviewers are listening for.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence, said precisely:</strong> <span style="color:#f0e2c8;">"React is a declarative, component-based JavaScript <em style="color:#ffe0b2;">library</em> for building user interfaces — you describe the UI as a function of state and React handles the DOM updates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the declarative contrast:</strong> <span style="color:#f0e2c8;">imperative code lists every DOM operation and has to track current state; declarative code returns the target UI and lets React diff. That is where whole classes of sync bugs disappear.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. List the features quickly:</strong> <span style="color:#f0e2c8;">components, Virtual DOM and reconciliation, unidirectional data flow, JSX, and "learn once, write anywhere".</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Add the detail most candidates miss:</strong> <span style="color:#f0e2c8;">"An element is literally a frozen plain object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props</code> — that is what makes the diff cheap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name what React leaves out:</strong> <span style="color:#f0e2c8;">routing, data fetching, global state, build tooling. Knowing the boundaries reads as experience, not theory.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is React a library or a framework?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A library. It renders UI and nothing else — routing, data fetching, and build tooling come from elsewhere. Next.js is a framework built on top of it, which is exactly why that distinction matters in practice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the Virtual DOM make React faster than plain JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — carefully hand-written imperative DOM code can beat it. What the Virtual DOM buys is making the <em style="color:#ffe0b2;">declarative</em> style fast enough to be practical. The win is correctness and maintainability; treating it as a raw speed claim is the classic overreach.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "learn once, write anywhere" actually mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The component model and Hooks live in the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> package, which knows nothing about the DOM. A separate renderer applies the output to a target — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code> for browsers, React Native for mobile. Same knowledge, different output.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is unidirectional data flow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Data flows one way — down from parent to child via props. A child never writes to its parent state directly; it calls a callback the parent passed down. "Props down, events up." It means when a value is wrong you can trace it upward to exactly one owner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is JSX required to use React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡A:</span> <span style="color:#d8d8d8;">No. JSX is syntax sugar compiled to plain function calls — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">createElement</code> under the classic transform, or an auto-imported <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx()</code> under the modern one. You can write those calls by hand; nobody does, because JSX is far more readable.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Declarative** | Describing the target UI rather than the steps to reach it |
| **Component** | A reusable function that returns a description of some UI |
| **Element** | The frozen plain object a component returns |
| **Virtual DOM** | The in-memory tree React diffs before touching the real DOM |
| **Reconciliation** | Comparing two trees and applying only the differences |
| **Unidirectional data flow** | Props down, events up |

---
**Conclusion:** React is a declarative, component-based library for building user interfaces — you write what the screen should look like for the current state, and React works out the DOM operations. Its defining features are components, the Virtual DOM and reconciliation, unidirectional data flow, and a core that knows nothing about the DOM so it can target other renderers. The detail worth landing is that a React element is literally a frozen plain object with a <code>type</code> and <code>props</code>, which is exactly what makes the whole declarative model cheap enough to work.`,
    examples: [
      {
        label: "The same UI declaratively — state in, UI out",
        runnable: true,
        code: `import { useState } from "react";

// Declarative: this function says what the UI IS for a given state.
// It never says "find the counter node and change its text".
function Counter({ label }) {
  const [count, setCount] = useState(0);
  const status = count === 0 ? "untouched" : count > 5 ? "getting high" : "counting";

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <strong>{label}</strong>
      <p style={{ margin: "8px 0" }}>
        Count: {count} — <em>{status}</em>
      </p>
      {/* Conditional UI is just an expression, not a DOM mutation */}
      {count > 5 && <p style={{ color: "crimson" }}>Above five!</p>}
      <button onClick={() => setCount((c) => c + 1)}>+1</button>{" "}
      <button onClick={() => setCount(0)}>reset</button>
    </div>
  );
}

export default function App() {
  // Component-based: the same component reused, each with its own state.
  const labels = ["First counter", "Second counter"];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {labels.map((l) => (
        <Counter key={l} label={l} />
      ))}
      <p style={{ color: "#666", fontSize: 13 }}>
        Each counter owns its own state. Nothing here queries or mutates the DOM —
        the UI is a pure function of state, and React applies the differences.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the advantages of using React over plain JavaScript?",
    seoDescription:
      "React removes the class of bugs where the DOM drifts out of sync with your data, in exchange for a build step, bundle size, and a learning curve.",
    description: `**Question presented to candidate:**
"We could build this UI with plain JavaScript and \`document.querySelector\`. Make the case for React — and be honest about what it costs."

**What a strong answer should cover:**
- The central win: **declarative rendering** eliminates the class of bugs where the DOM and the data drift out of sync.
- **Componentisation** — reusable units that own their own state and markup together.
- **Reconciliation** — React computes the minimal DOM updates so you never hand-write them.
- **Ecosystem and hiring** — routing, forms, data fetching, testing tools, and a large talent pool.
- **Cross-platform** — the same component model targets native via React Native.
- Honest costs: a build step, bundle size, a learning curve, and no advantage for genuinely simple pages.
- Maturity signal: React is not automatically *faster* than hand-written DOM code; it trades a little raw speed for correctness and maintainability.

**Clarifying questions expected:**
- "How complex is the UI — how much state is there, and how much of it is shared?"
- "Is this a long-lived product with a team, or a one-off page?"

**Code / implementation expected:** Optional. A side-by-side of the same widget in both styles makes the argument faster than prose.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes JavaScript and DOM basics.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This is a trade-off question, so the answer below deliberately includes the costs — an interviewer is often testing whether you can argue against your own tool.

## 1. Why This Even Matters — A Story First

Picture a whiteboard tracking a football score. Plain JavaScript is a person with an eraser: when a goal goes in, they must remember to update the score, the goal count, the "last scorer" line, and the trophy icon that only appears at three goals. Forget one and the board now contradicts itself — and nothing in the board tells you which line is the stale one.

React is a whiteboard that redraws itself from the score. Change the number and every line derived from it follows automatically, because they were never independent in the first place.

## 2. The Core Idea

📌 **Interview term:** the fundamental advantage is **declarative rendering**. In plain JavaScript you write the *transition* — the specific DOM edits that move the page from its old state to its new one. In React you write the *destination*, and reconciliation computes the transition for you.

This matters because transitions grow combinatorially. Four independent booleans give sixteen possible screens, and imperative code has to handle every path between them. A declarative render function handles all sixteen with one expression.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Plain JavaScript writes DOM edits by hand while React derives them from state">
  <defs>
    <marker id="adv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Who works out the DOM edits</text>
  <rect class="d-box-muted" x="24" y="48" width="150" height="60" rx="10"/>
  <text class="d-text" x="99" y="72" text-anchor="middle">state changes</text>
  <text class="d-sub" x="99" y="92" text-anchor="middle">score = 3</text>
  <path class="d-edge-dashed" d="M 180 78 L 236 78" marker-end="url(#adv-arrow)"/>
  <rect class="d-box-muted" x="242" y="48" width="176" height="60" rx="10"/>
  <text class="d-text" x="330" y="72" text-anchor="middle">you, by hand</text>
  <text class="d-sub" x="330" y="92" text-anchor="middle">four separate edits</text>
  <path class="d-edge-dashed" d="M 424 78 L 480 78" marker-end="url(#adv-arrow)"/>
  <rect class="d-box-muted" x="486" y="48" width="150" height="60" rx="10"/>
  <text class="d-text" x="561" y="72" text-anchor="middle">DOM</text>
  <text class="d-sub" x="561" y="92" text-anchor="middle">easy to miss one</text>
  <rect class="d-box-accent" x="242" y="130" width="176" height="54" rx="10"/>
  <text class="d-text d-accent" x="330" y="152" text-anchor="middle">React reconciler</text>
  <text class="d-sub" x="330" y="172" text-anchor="middle">derives every edit</text>
  <path class="d-edge-accent" d="M 130 112 L 254 130" marker-end="url(#adv-arrow)"/>
  <path class="d-edge-accent" d="M 406 130 L 530 112" marker-end="url(#adv-arrow)"/>
</svg>

Both routes reach the DOM. The difference is whether a human has to enumerate the edits, or a diff does.

## 3. The advantages, ranked by how much they actually matter

| Advantage | Why it matters |
| :--- | :--- |
| **Declarative rendering** | Removes the whole class of "screen disagrees with data" bugs |
| **Components** | Markup, state, and behaviour co-located in one reusable unit |
| **Reconciliation** | Minimal DOM updates without hand-writing them |
| **Ecosystem** | Routing, forms, data fetching, testing, devtools already solved |
| **Hiring and onboarding** | A very large pool of engineers already know the model |
| **Cross-platform** | The same component model reaches native via React Native |

📌 **Interview term: co-location** — keeping a piece of UI markup, its state, and its behaviour in one file rather than spread across an HTML template, a stylesheet, and a separate script. It is the reason a React component can be deleted safely: everything it owned goes with it.

## 4. The honest costs

Naming these is what separates a considered answer from a sales pitch:

- **A build step.** JSX must be compiled. Plain JavaScript runs straight in the browser.
- **Bundle size.** React plus <code>react-dom</code> is real weight a static page does not need.
- **Learning curve.** Hooks, effect dependencies, and re-render behaviour take genuine time.
- **Not automatically faster.** Careful hand-written DOM updates beat a diff. React trades some speed for correctness.
- **Overkill for simple pages.** A landing page with one dropdown does not need a component tree.

## 5. When plain JavaScript is genuinely the better call

- A mostly-static page with a couple of interactive widgets
- A tight performance or bundle-size budget where every kilobyte counts
- An environment where you cannot add a build step
- Something small enough that the whole interaction fits in one file you can hold in your head

## 6. Common Pitfalls

- **Claiming React is faster.** It is not, inherently. Say it makes declarative code fast *enough* — see <a href="PASTE_VIRTUAL_DOM_URL_HERE" target="_blank" rel="noopener noreferrer">the Virtual DOM</a> for why.
- **Only listing benefits.** Interviewers frequently follow up with "when would you not use it?" Have the answer ready before they ask.
- **Saying "React is easier".** It is more *structured*. The first week is harder than <code>querySelector</code>; the payoff arrives at scale.
- **Forgetting the team argument.** Consistency across a codebase and a large hiring pool are real engineering advantages, not soft ones.
- **Reaching for "it uses the Virtual DOM" as the whole answer.** That is a mechanism, not a benefit. The benefit is what the mechanism enables.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the bug class it removes:</strong> <span style="color:#f0e2c8;">"In plain JS you write the DOM transition by hand, so the screen can drift out of sync with your data. React makes that structurally impossible — you describe the destination."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Use the combinatorial argument:</strong> <span style="color:#f0e2c8;">"Four booleans is sixteen possible screens. Imperative code handles every transition between them; a render function handles all sixteen at once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Then components and ecosystem:</strong> <span style="color:#f0e2c8;">co-located markup, state and behaviour; plus routing, forms, data fetching and testing already solved by the ecosystem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Volunteer the costs before you are asked:</strong> <span style="color:#f0e2c8;">"It costs a build step, bundle size, and a learning curve — and it is not inherently faster than hand-written DOM code."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on judgement:</strong> <span style="color:#f0e2c8;">"For a static page with one dropdown I would skip it. The payoff starts when there is real state and more than one person maintaining it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you <em style="color:#ffe0b2;">not</em> use React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mostly-static page with a couple of widgets, a hard bundle-size budget, or somewhere you cannot add a build step. The cost is fixed and paid up front; the benefit scales with how much state you have.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is React faster than vanilla JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Optimal hand-written DOM updates will beat a diff, because the diff is extra work vanilla code skips. React makes the declarative style fast enough that you almost never need to hand-optimise — that is the actual claim.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about Web Components — do they not solve the same problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They solve encapsulation and reuse, but not declarative rendering — inside a Web Component you are still updating the DOM imperatively unless you add a renderer. They are complementary; React can render them, and libraries like Lit add the declarative layer on top.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does React solve state management?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Local state, yes — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer</code>. Shared server state is a different problem it deliberately leaves open, which is why TanStack Query and SWR exist. Saying "React solves state management" full stop is an overclaim.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the single biggest advantage if you had to pick one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That the UI is a function of state, so it cannot silently disagree with the data behind it. Every other advantage — components, the ecosystem, the tooling — is downstream of that one property.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Imperative** | Writing the steps that change the page |
| **Declarative** | Writing what the page should be |
| **Co-location** | Markup, state, and behaviour living together in one unit |
| **Reconciliation** | React deriving the minimal DOM edits from a diff |
| **Build step** | The compile pass that turns JSX into plain JavaScript |

---
**Conclusion:** the real advantage of React over plain JavaScript is not speed — it is that the UI becomes a function of state, which removes an entire category of bugs where the screen and the data drift apart. Components, reconciliation, and the ecosystem all follow from that. The costs are genuine and worth stating unprompted: a build step, bundle size, a learning curve, and no benefit at all for a page simple enough not to have much state in the first place.`,
    examples: [
      {
        label: "The same widget, imperative versus declarative, side by side",
        runnable: true,
        code: `import { useState, useRef, useEffect } from "react";

// ── The imperative way, written the way plain JS forces you to ──────────────
// Every derived piece of UI needs its own explicit update. Miss one and the
// widget contradicts itself — and nothing tells you which line went stale.
function ImperativeCounter() {
  const rootRef = useRef(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    root.innerHTML =
      '<p>Score: <b class="score">0</b></p>' +
      '<p class="status">untouched</p>' +
      '<p class="trophy" style="display:none;color:goldenrod">🏆 three or more!</p>' +
      "<button>Score a goal</button>";

    const btn = root.querySelector("button");
    const onClick = () => {
      scoreRef.current += 1;
      const n = scoreRef.current;
      // Four separate, easily-forgotten DOM edits for ONE state change:
      root.querySelector(".score").textContent = String(n);
      root.querySelector(".status").textContent = n > 5 ? "getting high" : "counting";
      root.querySelector(".trophy").style.display = n >= 3 ? "block" : "none";
      btn.textContent = n >= 5 ? "Score another" : "Score a goal";
    };
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, []);

  return <div ref={rootRef} />;
}

// ── The declarative way ────────────────────────────────────────────────────
// One state value. Every derived line follows from it automatically, so they
// cannot get out of step with each other.
function DeclarativeCounter() {
  const [score, setScore] = useState(0);

  return (
    <div>
      <p>Score: <b>{score}</b></p>
      <p>{score === 0 ? "untouched" : score > 5 ? "getting high" : "counting"}</p>
      {score >= 3 && <p style={{ color: "goldenrod" }}>🏆 three or more!</p>}
      <button onClick={() => setScore((s) => s + 1)}>
        {score >= 5 ? "Score another" : "Score a goal"}
      </button>
    </div>
  );
}

export default function App() {
  const box = { border: "1px solid #ccc", borderRadius: 8, padding: 16, flex: 1 };
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={box}><h4 style={{ marginTop: 0 }}>Imperative</h4><ImperativeCounter /></div>
        <div style={box}><h4 style={{ marginTop: 0 }}>Declarative</h4><DeclarativeCounter /></div>
      </div>
      <p style={{ color: "#666", fontSize: 13 }}>
        Both behave identically. The left one needs four explicit DOM edits per
        click; the right one derives all four from a single number.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between element and component in React?",
    seoDescription:
      "A component is a function that returns UI. An element is the frozen plain object it returns — a cheap description, not a DOM node or an instance.",
    description: `**Question presented to candidate:**
"You keep hearing both words. What is the actual difference between a React *element* and a React *component*?"

**What a strong answer should cover:**
- A **component** is a function (or class) that accepts props and returns a description of UI. It is a *blueprint*.
- An **element** is the plain object that description actually is — a *single instruction*, produced by calling the component in JSX.
- An element is not a DOM node and not a component instance; it is data.
- The object shape: \`$$typeof\`, \`type\`, \`key\`, \`props\`. \`type\` is the function itself for a custom component, or a string like \`"h1"\` for a host element.
- Elements are **frozen** and **created fresh on every render** — which is precisely why they are cheap and why diffing is just object comparison.
- \`<Greeting />\` is sugar for \`createElement(Greeting, ...)\`; JSX produces elements, it does not call the component.
- Signal of depth: React calls the component; you never do. That is why calling \`Greeting()\` directly breaks Hooks.

**Clarifying questions expected:**
- "Do you want me to include what \`$$typeof\` is for?" (XSS protection for JSON-injected elements.)

**Code / implementation expected:** Optional, but showing \`createElement\` output next to JSX makes the point instantly.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes basic JSX familiarity.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every object-shape claim below was produced by inspecting real values in React 19.2.8, not described from documentation.

## 1. Why This Even Matters — A Story First

A **recipe** for a cake is not a cake. It is also not an *order* for a cake.

- The **recipe** is the component — a reusable set of instructions that can produce any number of cakes, parameterised by what you hand it.
- The **order slip** — "one chocolate cake, name on it: Ada" — is the element. It is a small piece of paper describing exactly one cake. It is not edible.
- The **cake** is the DOM node React eventually builds from that slip.

People conflate the slip with the cake because JSX makes writing a slip look like producing a cake. It is not: <code>&lt;Greeting name="Ada" /&gt;</code> writes an order, it does not bake anything.

## 2. The Core Idea

📌 **Interview term: Component** — a function that takes props and returns a description of what should be on screen. Reusable, parameterised, a blueprint.

📌 **Interview term: Element** — the plain JavaScript object that description *is*. It describes one occurrence of one component or host tag with one set of props. Immutable and extremely cheap.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 190" role="img" aria-label="A component function produces an element object which React turns into a DOM node">
  <defs>
    <marker id="ec-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Blueprint, then description, then the real thing</text>
  <rect class="d-box-accent" x="24" y="52" width="180" height="86" rx="10"/>
  <text class="d-text d-accent" x="114" y="80" text-anchor="middle">Component</text>
  <text class="d-sub" x="114" y="102" text-anchor="middle">a function</text>
  <text class="d-sub" x="114" y="124" text-anchor="middle">reusable blueprint</text>
  <path class="d-edge" d="M 210 95 L 234 95" marker-end="url(#ec-arrow)"/>
  <rect class="d-box" x="240" y="52" width="180" height="86" rx="10"/>
  <text class="d-text" x="330" y="80" text-anchor="middle">Element</text>
  <text class="d-sub" x="330" y="102" text-anchor="middle">a frozen plain object</text>
  <text class="d-sub" x="330" y="124" text-anchor="middle">type plus props</text>
  <path class="d-edge" d="M 426 95 L 450 95" marker-end="url(#ec-arrow)"/>
  <rect class="d-box-muted" x="456" y="52" width="180" height="86" rx="10"/>
  <text class="d-text" x="546" y="80" text-anchor="middle">DOM node</text>
  <text class="d-sub" x="546" y="102" text-anchor="middle">created by react-dom</text>
  <text class="d-sub" x="546" y="124" text-anchor="middle">the real thing</text>
</svg>

Only the last box is a real thing on screen. The middle box is the one people misjudge — it is data, and it is thrown away and rebuilt on every render.

## 3. Verified: the element is a frozen plain object

\`\`\`js
function Greeting({ name }) { return <h1>Hello {name}</h1>; }
const el = <Greeting name="Ada" />;
\`\`\`

Actual values on React 19.2.8:

\`\`\`
typeof Greeting (the component): function
typeof el       (the element)  : object
React.isValidElement(el)       : true
React.isValidElement(Greeting) : false
Object.keys(el)                : ["$$typeof","type","key","props","_owner","_store"]
el.type === Greeting           : true
el.props                       : {"name":"Ada"}
Object.isFrozen(el)            : true
\`\`\`

Three things worth reading off that output:

- <code>typeof</code> alone separates them: the component is a <code>function</code>, the element is an <code>object</code>.
- <code>el.type === Greeting</code> is <code>true</code> — the element **holds a reference to** the component. It has not called it.
- <code>Object.isFrozen(el)</code> is <code>true</code> — elements are immutable by design, which is why mutating <code>props</code> is impossible rather than merely discouraged.

📌 **Interview term:** <code>$$typeof</code> is a <code>Symbol</code> React stamps on every element. Because symbols do not survive JSON serialisation, an object parsed from untrusted JSON can never masquerade as an element — it is an XSS defence, not bookkeeping.

## 4. Verified: JSX just creates elements

\`\`\`js
const a = <Greeting name="Ada" />;
const b = createElement(Greeting, { name: "Ada" });
\`\`\`

\`\`\`
same type?  true | same props?  true
a host element <h1 className="x">: { "type": "h1" }
\`\`\`

📌 **Interview term:** for a custom component, <code>type</code> is the **function itself**. For a host element like <code>&lt;h1&gt;</code>, <code>type</code> is the **string** <code>"h1"</code>. That string-versus-function check is exactly how React decides whether to call your code or create a DOM node — and it is why component names must be capitalised: lowercase JSX names compile to strings.

### Elements are created fresh every render

\`\`\`
two identical elements are the same object? false
\`\`\`

Every render allocates new element objects. That sounds wasteful and is not: they are small, short-lived objects, and comparing them is what lets React skip the expensive part — touching the DOM.

## 5. Side by side

| | Component | Element |
| :--- | :--- | :--- |
| What it is | A function | A plain frozen object |
| <code>typeof</code> | <code>"function"</code> | <code>"object"</code> |
| <code>isValidElement</code> | <code>false</code> | <code>true</code> |
| Written as | <code>function Greeting() {}</code> | <code>&lt;Greeting /&gt;</code> |
| Reusable | Yes, any number of times | Describes exactly one occurrence |
| Mutable | n/a | No — frozen |
| Lifetime | The whole app | One render |

## 6. Common Pitfalls

- **Calling a component directly.** <code>Greeting({ name: "Ada" })</code> runs the function inline instead of creating an element, so React never treats it as a component — Hooks and state break. Write <code>&lt;Greeting name="Ada" /&gt;</code> and let React do the calling.
- **Lowercase component names.** <code>&lt;greeting /&gt;</code> compiles to <code>type: "greeting"</code>, a string, so React looks for an unknown HTML tag instead of your function.
- **Trying to mutate an element.** It is frozen. Use <code>cloneElement</code> if you genuinely need a modified copy.
- **Thinking an element is a DOM node.** It has no <code>.style</code>, no <code>.addEventListener</code>; it is a description. The DOM node arrives later, from <a href="PASTE_REACT_DOM_URL_HERE" target="_blank" rel="noopener noreferrer">react-dom</a>.
- **Confusing an element with an instance.** Class components have instances; function components do not. An element is neither.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line each:</strong> <span style="color:#f0e2c8;">"A component is a function that returns UI. An element is the plain object it returns — a description of one occurrence, not a DOM node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Use the recipe analogy:</strong> <span style="color:#f0e2c8;">the component is the recipe, the element is the order slip, the DOM node is the cake. Only the last one is edible.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the object shape:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ $$typeof, type, key, props }</code>, and it is frozen. For a custom component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is the function; for a host tag it is the string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Land why it matters:</strong> <span style="color:#f0e2c8;">"Elements are cheap and immutable, so React can rebuild them every render and diff them — that is what makes reconciliation viable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Bonus if the room is technical:</strong> <span style="color:#f0e2c8;">"That string-versus-function <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is exactly why component names have to be capitalised."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must component names start with a capital letter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSX compiles a lowercase name to a <em style="color:#ffe0b2;">string</em> type and a capitalised one to the identifier itself. So <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;greeting /&gt;</code> becomes <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">type: "greeting"</code> and React looks for an HTML tag by that name instead of calling your function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call a component as a function instead of using JSX?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its body runs inline as part of the caller instead of becoming its own element, so React never gives it an identity. Its Hooks get attributed to the calling component, state does not persist across renders, and it will not appear separately in DevTools. Always let React do the calling.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$$typeof</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a Symbol marking a genuine React element. Symbols cannot survive <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.parse</code>, so an object that came from untrusted JSON can never impersonate an element and get rendered — it is an XSS defence.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is creating new elements on every render wasteful?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — they are tiny, short-lived objects and JavaScript engines handle that allocation pattern well. The expensive operation is touching the real DOM, and cheap element objects are precisely what let React work out how to touch it as little as possible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you modify an element after creating it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is frozen — verified with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.isFrozen</code>. If you need a variant, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">cloneElement</code> produces a new one with merged props. Immutability is what makes the previous render tree safe to compare against.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Component** | A function taking props and returning a UI description |
| **Element** | The frozen plain object that description is |
| **<code>type</code>** | The component function, or a string for a host tag |
| **<code>$$typeof</code>** | A Symbol marking a real element; an XSS defence |
| **Host element** | A built-in DOM tag such as <code>div</code> or <code>h1</code> |
| **<code>cloneElement</code>** | Makes a modified copy, since elements are immutable |

---
**Conclusion:** a component is a reusable function; an element is the single frozen object it returns. The element holds a reference to the component in its <code>type</code> — a function for your components, a string for host tags — along with <code>props</code>, and it is rebuilt from scratch on every render. That combination of cheap and immutable is exactly what makes reconciliation possible, and it is why you write <code>&lt;Greeting /&gt;</code> and let React do the calling rather than invoking the function yourself.`,
    examples: [
      {
        label: "Inspecting an element, and what breaks when you call a component directly",
        runnable: true,
        code: `import { useState, createElement, isValidElement, cloneElement } from "react";

function Greeting({ name, children }) {
  return <p>Hello {name}! {children}</p>;
}

// A component with state — used below to show why you must NOT call it directly.
function Counter({ label }) {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{label}: {n}</button>;
}

export default function App() {
  const element = <Greeting name="Ada" />;
  const viaFactory = createElement(Greeting, { name: "Ada" });
  const host = <h1>a host element</h1>;

  const facts = [
    ["typeof Greeting (component)", typeof Greeting],
    ["typeof element", typeof element],
    ["isValidElement(element)", String(isValidElement(element))],
    ["isValidElement(Greeting)", String(isValidElement(Greeting))],
    ["Object.keys(element)", Object.keys(element).join(", ")],
    ["element.type === Greeting", String(element.type === Greeting)],
    ["JSON.stringify(element.props)", JSON.stringify(element.props)],
    ["Object.isFrozen(element)", String(Object.isFrozen(element))],
    ["JSX and createElement match", String(element.type === viaFactory.type)],
    ["host.type (a string, not a fn)", JSON.stringify(host.type)],
    ["two identical elements are ===", String((<Greeting name="Ada" />) === (<Greeting name="Ada" />))],
  ];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h3>The element is just an object</h3>
      <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {facts.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "3px 12px 3px 0", color: "#555" }}>{k}</td>
              <td style={{ padding: "3px 0", fontFamily: "ui-monospace, monospace" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>cloneElement, because elements are frozen</h3>
      {cloneElement(element, { name: "Grace" }, <em>(props merged into a copy)</em>)}

      <h3>Let React call the component</h3>
      <Counter label="Correct — has its own state" />

      <p style={{ color: "#666", fontSize: 13, marginTop: 16 }}>
        Calling <code>Counter(&#123;label:"x"&#125;)</code> directly would inline its body into
        App, so its Hook would be attributed to App and it would not appear as
        its own component in DevTools. Always write &lt;Counter /&gt;.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of `React.StrictMode`?",
    seoDescription:
      "StrictMode is a development-only wrapper that double-invokes renders and effects to surface impure components and missing cleanup. It renders no UI.",
    description: `**Question presented to candidate:**
"Your app is wrapped in \`<StrictMode>\` and someone notices every effect appears to run twice in development. Is that a bug? What is StrictMode actually for?"

**What a strong answer should cover:**
- It is a **development-only** tool. It renders no UI and is completely inert in production builds.
- It **intentionally double-invokes** component render functions, and mounts-unmounts-remounts to run each effect twice.
- The purpose: surface bugs that would otherwise appear only later — **impure renders** and **missing effect cleanup**.
- Double-invoking render exposes side effects hiding in the render phase, since a pure function run twice is harmless.
- The mount-unmount-remount cycle exposes effects that do not clean up after themselves.
- It also warns about deprecated and legacy APIs.
- Crucially: it does **not** change production behaviour, so "fixing" it by removing StrictMode hides a real bug rather than solving it.
- Forward-looking: the remount simulation prepares components for features that preserve and restore state.

**Clarifying questions expected:**
- "Is the double-run happening in production too?" (It should not be — that would point elsewhere.)
- "Which React version?" — the effect double-invoke behaviour arrived in React 18.

**Code / implementation expected:** Optional. A subscription effect with correct cleanup is the natural demonstration.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes familiarity with <code>useEffect</code>.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render and effect counts below were produced by actually mounting components with and without <code>StrictMode</code> on React 19.2.8 in this repo.

## 1. Why This Even Matters — A Story First

A flight instructor does not wait for a real engine failure to find out whether you can handle one. They reach over mid-flight and cut the throttle, on purpose, while there is still plenty of altitude and a runway in sight. It is deliberately annoying. It is *supposed* to be. Finding out you cannot handle it now is enormously better than finding out later.

<code>StrictMode</code> is that instructor. It deliberately runs your components twice and tears your effects down and back up again — in development only — so that fragile code fails loudly on your machine instead of quietly in production.

## 2. The Core Idea

📌 **Interview term:** <code>&lt;StrictMode&gt;</code> is a **development-only** wrapper that activates extra checks and warnings for the tree inside it. It renders **no UI**, adds no DOM node, and does absolutely nothing in a production build.

Its two headline behaviours:

1. **Double-invoking render** — your component function is called twice per render. A pure function called twice produces the same result, so anything that misbehaves was never pure.
2. **Mount, unmount, remount** — every effect is set up, torn down, and set up again. An effect with correct cleanup survives this unchanged; one without it leaks visibly.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="StrictMode mounts an effect, runs its cleanup, then mounts it again">
  <defs>
    <marker id="sm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What StrictMode does to a single mount, in development</text>
  <rect class="d-box-accent" x="20" y="52" width="180" height="76" rx="10"/>
  <text class="d-text d-accent" x="110" y="80" text-anchor="middle">effect runs</text>
  <text class="d-sub" x="110" y="104" text-anchor="middle">subscribe</text>
  <path class="d-edge" d="M 206 90 L 232 90" marker-end="url(#sm-arrow)"/>
  <rect class="d-box-muted" x="238" y="52" width="180" height="76" rx="10"/>
  <text class="d-text" x="328" y="80" text-anchor="middle">cleanup runs</text>
  <text class="d-sub" x="328" y="104" text-anchor="middle">unsubscribe</text>
  <path class="d-edge" d="M 424 90 L 450 90" marker-end="url(#sm-arrow)"/>
  <rect class="d-box-accent" x="456" y="52" width="180" height="76" rx="10"/>
  <text class="d-text d-accent" x="546" y="80" text-anchor="middle">effect runs again</text>
  <text class="d-sub" x="546" y="104" text-anchor="middle">subscribe</text>
</svg>

If the middle step is missing from your effect, you finish this sequence with two live subscriptions where there should be one — which is precisely the leak StrictMode is designed to make obvious.

## 3. Verified: exactly what gets doubled

The same probe component was mounted twice — once inside <code>StrictMode</code>, once outside — counting renders, effect runs, and cleanups:

\`\`\`
with StrictMode    -> renders: 2, effect runs: 2, cleanups: 1
without StrictMode -> renders: 1, effect runs: 1, cleanups: 0
\`\`\`

Read that carefully, because the exact numbers are what an interviewer is listening for:

- **2 renders** — the component function ran twice for one mount.
- **2 effect runs with 1 cleanup in between** — set up, torn down, set up again. The tree ends in a correct state with exactly one live effect.
- Without StrictMode, all of it happens once.

📌 **Interview term:** this is a **simulated remount**. React is checking that your component can be unmounted and remounted without breaking, because a component that survives that is one whose state can safely be preserved and restored.

## 4. What it catches, concretely

| Bug | How StrictMode surfaces it |
| :--- | :--- |
| Side effect in the render phase | Runs twice — a counter increments by 2, a request fires twice |
| Effect with no cleanup | Two live subscriptions, intervals, or listeners after one mount |
| Mutating props or state during render | Doubled render makes the corruption visible immediately |
| Legacy and deprecated APIs | Explicit console warnings |
| Impure derived values | Two renders produce two different results |

**Plain-language takeaway:** every one of these is a real bug that exists with or without StrictMode. StrictMode does not create them; it makes them fail on your laptop instead of intermittently in production.

## 5. The most important thing to say about it

📌 **Interview term:** StrictMode is **development-only**. In a production build the doubling does not happen at all. So the correct response to "my effect runs twice" is *never* to delete <code>&lt;StrictMode&gt;</code> — that just hides a defect you were being warned about. The correct response is to make the effect idempotent by giving it proper cleanup.

## 6. Common Pitfalls

- **Removing StrictMode to stop the double-run.** The single most common wrong move. It silences the alarm, not the fire.
- **Believing it slows production down.** It has zero production effect. Development is marginally slower, deliberately.
- **Expecting it to render something.** It emits no DOM node whatsoever.
- **Assuming your API will only be called once.** A fetch fired directly in an effect without cleanup fires twice. Either make it idempotent or abort the first with an <code>AbortController</code> — see <a href="PASTE_SIDE_EFFECTS_URL_HERE" target="_blank" rel="noopener noreferrer">handling side effects</a>.
- **Thinking it only affects effects.** It also double-invokes render, state initialiser functions, and reducers — anything that is supposed to be pure.
- **Applying it to the whole app and then giving up.** It is scoped: wrap one subtree, fix it, then widen.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with development-only:</strong> <span style="color:#f0e2c8;">"It is a development-only wrapper that renders no UI and does nothing in production. It turns on extra checks for the tree inside it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name both behaviours with the numbers:</strong> <span style="color:#f0e2c8;">"It double-invokes render, and it mounts, unmounts, and remounts — so one mount gives two renders and two effect runs with one cleanup between them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say what each one catches:</strong> <span style="color:#f0e2c8;">doubled render exposes impure components; the remount cycle exposes effects missing cleanup.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Preempt the classic trap:</strong> <span style="color:#f0e2c8;">"If an effect misbehaves under StrictMode, that is a real bug — the fix is cleanup, never deleting the wrapper."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with the reason it exists:</strong> <span style="color:#f0e2c8;">"React wants components that survive being unmounted and remounted, because that is what lets it preserve and restore state safely."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">My effect runs twice on mount. How do I stop it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You do not — you make it survive running twice. Return a cleanup that undoes the setup, and the sequence ends in the right state. Reaching for a <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useRef</code> guard to skip the second run is the classic wrong fix: it papers over the missing cleanup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does StrictMode affect production performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not at all — the extra behaviour is compiled out of production builds. It is safe and recommended to leave it in your source permanently; the only cost is a slightly slower development experience, which is the point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why double-invoke <em style="color:#ffe0b2;">render</em> rather than just effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because render is required to be pure, and a pure function run twice is indistinguishable from running once. If doubling it changes anything — a counter jumps by two, a request fires twice — you had a side effect in the render phase, which breaks under concurrent rendering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it double-invoke anything besides render and effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> initialiser functions, reducers, and the functions passed to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code>. Everything React requires to be pure gets run twice, on the same principle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you apply it to only part of the app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it applies only to its subtree. That is the practical migration path on a large legacy codebase: wrap one route, fix what it surfaces, then expand outward rather than drowning in warnings on day one.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>StrictMode</code>** | A development-only wrapper enabling extra checks |
| **Double-invoking** | Calling render or an effect twice to expose impurity |
| **Simulated remount** | Mount, cleanup, mount again in one go |
| **Pure render** | A render with no side effects and no mutation |
| **Idempotent** | Safe to run more than once with the same end result |

---
**Conclusion:** <code>StrictMode</code> is a development-only wrapper that deliberately makes fragile components fail loudly — double-invoking renders to expose impurity, and mounting, cleaning up, and remounting to expose effects that never clean up after themselves. Verified on React 19.2.8, one mount inside it produces two renders and two effect runs with one cleanup between them, against one of each outside it. None of that happens in production, which is exactly why the right response to a double-running effect is to fix the cleanup rather than remove the wrapper.`,
    examples: [
      {
        label: "An effect that survives StrictMode, next to one that leaks",
        runnable: true,
        code: `import { StrictMode, useState, useEffect, useRef } from "react";

// Module-level counters so we can see the leak across a simulated remount.
const live = { good: 0, bad: 0 };

// ✅ Correct: cleanup undoes the setup, so mount → cleanup → mount ends with
// exactly one live interval no matter how many times React runs it.
function GoodTimer() {
  const [n, setN] = useState(0);
  const [live_, setLive] = useState(0);

  useEffect(() => {
    live.good += 1;
    setLive(live.good);
    const id = setInterval(() => setN((v) => v + 1), 1000);
    return () => {
      clearInterval(id);
      live.good -= 1;
    };
  }, []);

  return <p>✅ With cleanup — ticks: {n} · live intervals: {live.good}</p>;
}

// ❌ Broken: no cleanup. StrictMode's remount leaves TWO intervals running,
// so this counter climbs twice as fast. That is the bug being surfaced.
function LeakyTimer() {
  const [n, setN] = useState(0);

  useEffect(() => {
    live.bad += 1;
    setInterval(() => setN((v) => v + 1), 1000);
    // no return — nothing is ever torn down
  }, []);

  return <p>❌ No cleanup — ticks: {n} · intervals created: {live.bad}</p>;
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <StrictMode>
        <GoodTimer />
        <LeakyTimer />
      </StrictMode>
      <p style={{ color: "#666", fontSize: 13 }}>
        Both effects run twice here because StrictMode simulates a remount.
        The first settles back to one live interval; the second never cleans
        up, so it accumulates two and counts at double speed. The fix is the
        cleanup function — not removing StrictMode.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is `PropTypes` and when would you use it?",
    seoDescription:
      "PropTypes was React's runtime prop type-checker. Verified on React 19.2.8: propTypes are now silently ignored entirely. Use TypeScript instead.",
    description: `**Question presented to candidate:**
"What is \`PropTypes\`, and when would you reach for it today?"

**What a strong answer should cover:**
- PropTypes was React's **runtime** prop type-checking mechanism: attach a \`propTypes\` object and React warns in the console when a prop has the wrong type.
- It ran in **development only** and was always a warning, never an error — it never blocked a render.
- The history matters: \`React.PropTypes\` moved out to the standalone \`prop-types\` package in React 15.5.
- **The key fact: React 19 removed propType checking entirely.** A \`propTypes\` object on a component is now silently ignored — no validation, no warning.
- \`defaultProps\` was likewise removed for function components in React 19, in favour of ES6 default parameters. Class components keep it.
- So the honest answer to "when would you use it" is: **not in new code.** Use TypeScript, which catches the same errors at compile time and across the whole call site.
- The remaining niche: validating data crossing a runtime boundary — API responses, plugin inputs — which is a job for Zod or Valibot, not PropTypes.

**Clarifying questions expected:**
- "Which React version is this codebase on?" — the answer changes completely at 19.
- "Is the project on TypeScript already?"

**Code / implementation expected:** Optional. Showing the TypeScript and default-parameter replacement for a \`propTypes\` + \`defaultProps\` pair is the useful version.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes basic component knowledge.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This topic has a genuine breaking change behind it, so the central claim below was verified by actually rendering a component with <code>propTypes</code> on React 19.2.8 and by checking the React upgrade guide — not recalled.

## 1. Why This Even Matters — A Story First

Think of a parcel depot. **PropTypes** was a clerk who opened each parcel *after* it arrived, checked whether the contents matched the label, and — if not — wrote a complaint in a logbook nobody was required to read. The parcel went out for delivery regardless.

**TypeScript** is a rule at the loading bay: a mislabelled parcel never gets on the van in the first place.

Once the second option exists, the first is hard to justify. React eventually agreed, and in React 19 the clerk stopped showing up for work altogether.

## 2. The Core Idea

📌 **Interview term: PropTypes** — a **runtime** type-checking mechanism. You attached a <code>propTypes</code> object to a component and React validated incoming props against it during development, logging a console warning on a mismatch. It never threw and never blocked rendering.

\`\`\`jsx
import PropTypes from "prop-types";

function Greeting({ name, age }) { return <p>{name} is {age}</p>; }

Greeting.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
};
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="PropTypes checks at runtime after render starts while TypeScript checks at build time">
  <defs>
    <marker id="pt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where the mistake gets caught</text>
  <rect class="d-box-accent" x="24" y="50" width="182" height="72" rx="10"/>
  <text class="d-text d-accent" x="115" y="78" text-anchor="middle">TypeScript</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">build time, blocks it</text>
  <path class="d-edge-accent" d="M 212 86 L 240 86" marker-end="url(#pt-arrow)"/>
  <rect class="d-box" x="246" y="50" width="182" height="72" rx="10"/>
  <text class="d-text" x="337" y="78" text-anchor="middle">your app runs</text>
  <text class="d-sub" x="337" y="100" text-anchor="middle">render happens</text>
  <path class="d-edge-dashed" d="M 434 86 L 462 86" marker-end="url(#pt-arrow)"/>
  <rect class="d-box-muted" x="468" y="50" width="168" height="72" rx="10"/>
  <text class="d-text" x="552" y="78" text-anchor="middle">PropTypes</text>
  <text class="d-sub" x="552" y="100" text-anchor="middle">warned, too late</text>
  <rect class="d-box-muted" x="468" y="140" width="168" height="52" rx="10"/>
  <text class="d-text" x="552" y="164" text-anchor="middle">React 19</text>
  <text class="d-sub" x="552" y="182" text-anchor="middle">ignored entirely</text>
  <path class="d-edge-dashed" d="M 552 126 L 552 136" marker-end="url(#pt-arrow)"/>
</svg>

The structural problem is visible in the diagram: PropTypes only ever spoke up after the render had already begun, in one browser, on one code path someone happened to exercise.

## 3. Verified: React 19 ignores <code>propTypes</code> completely

A component with a <code>propTypes</code> validator designed to fail loudly was rendered on React 19.2.8, with <code>console.error</code> captured:

\`\`\`jsx
function Legacy({ n }) { return <span>{n}</span>; }
Legacy.propTypes = { n: () => new Error("PROPTYPES VALIDATOR WAS CALLED") };
// rendered with a deliberately wrong prop type
\`\`\`

Actual result:

\`\`\`
rendered output: <span>123</span>
validator invoked / warning emitted? NO — propTypes ignored entirely
\`\`\`

The validator was never called. No warning was produced. The property is simply dead weight on the function object.

📌 **Interview term:** in React 19, propType checks were **removed from the React package** and using them is **silently ignored**. The React team recommends migrating to TypeScript or another static type-checking solution. Source: [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide).

### The related removal: <code>defaultProps</code>

React 19 also removed <code>defaultProps</code> **for function components**, in favour of ES6 default parameters. Class components keep it, because there is no ES6 equivalent there.

\`\`\`jsx
// Removed in React 19 for function components
function Button({ color }) { /* ... */ }
Button.defaultProps = { color: "blue" };

// The replacement — plain JavaScript
function Button({ color = "blue" }) { /* ... */ }
\`\`\`

## 4. A short history, because interviewers ask

| Version | What happened |
| :--- | :--- |
| Before 15.5 | Built in as <code>React.PropTypes</code> |
| 15.5 | Moved out to the separate <code>prop-types</code> package |
| 16 to 18 | Worked via <code>prop-types</code>; development-only warnings |
| **19** | **Checks removed from React; <code>propTypes</code> silently ignored** |

## 5. So when *would* you use it?

Being direct here is the strong answer: **you would not, in new code.**

- **On React 19 or newer** — it does nothing at all. Use TypeScript.
- **On an older React with a legacy JavaScript codebase** — it still works, and adding it to a few critical shared components is defensible as a stopgap. But it is a migration waypoint, not a destination.
- **For untrusted runtime data** — API responses, user input, plugin configuration — you *do* still need a runtime check, because TypeScript disappears at build time. That job belongs to a schema validator like Zod or Valibot, which gives you parsed, narrowed values rather than a console warning.

## 6. PropTypes versus TypeScript

| | PropTypes | TypeScript |
| :--- | :--- | :--- |
| When it checks | Runtime, during render | Build time, before running |
| React 19 status | **Ignored entirely** | Fully supported |
| Failure mode | A console warning | A compile error |
| Coverage | Only code paths actually executed | Every call site, always |
| Editor support | None | Autocomplete and inline errors |
| Beyond props | No | Hooks, handlers, state, everything |

## 7. Common Pitfalls

- **Presenting PropTypes as current best practice.** On React 19 it is inert. Say so — it is the single fact that distinguishes an up-to-date answer here.
- **Believing PropTypes replaces runtime validation of API data.** It never validated fetched data, only props, and only in development.
- **Assuming TypeScript covers runtime safety.** Types are erased at build time. A malformed API response still needs a real runtime check.
- **Leaving <code>defaultProps</code> on function components after upgrading to 19.** It stops applying, so props silently become <code>undefined</code>. Convert to default parameters.
- **Adding <code>prop-types</code> to a new project.** It costs bundle size and gives nothing on modern React.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it in the past tense:</strong> <span style="color:#f0e2c8;">"It was React runtime prop type-checking — attach a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">propTypes</code> object and you got development-only console warnings for wrong prop types."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lead with the React 19 fact:</strong> <span style="color:#f0e2c8;">"In React 19 the checks were removed — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">propTypes</code> is now silently ignored. It does not warn; it does nothing." Most candidates do not know this.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the structural reason it lost:</strong> <span style="color:#f0e2c8;">it only checked code paths that actually ran, only in development, and only warned. TypeScript checks every call site before the code ships.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention the sibling removal:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultProps</code> also went for function components in 19 — you use ES6 default parameters now. Class components keep it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Do not overcorrect:</strong> <span style="color:#f0e2c8;">"Types are erased at build time, so untrusted data crossing a boundary still needs a real runtime check — Zod, not PropTypes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">propTypes</code> still work in React 19?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The checks were removed and the property is silently ignored — the validator function is never even called, and nothing is logged. The dangerous part is that it fails quietly, so a codebase can look like it has prop validation while having none.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is TypeScript better than PropTypes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It checks every call site at build time rather than only the paths that happen to execute in development, it fails the build instead of writing a warning nobody reads, it powers editor autocomplete, and it covers state, handlers, and Hooks — not just props.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If you have TypeScript, do you ever need runtime validation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, at every trust boundary. Types vanish at build time, so a <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> response typed as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">User</code> is an assertion, not a guarantee. Parse it with Zod or similar — that is the modern replacement for the runtime-checking role, not PropTypes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happened to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defaultProps</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Removed for function components in React 19; replaced by ES6 default parameters, which are plain JavaScript and readable at the destructuring site. Class components still support it because there is no equivalent syntax there. Watch for silent <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> props after upgrading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Was <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">PropTypes</code> always a separate package?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it was built in as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">React.PropTypes</code> until React 15.5, when it was extracted into the standalone <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">prop-types</code> package. React 19 then dropped the checking machinery altogether.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **PropTypes** | Runtime prop validation; ignored from React 19 onward |
| **<code>prop-types</code>** | The standalone package it moved into at React 15.5 |
| **<code>defaultProps</code>** | Legacy default values; removed for function components in 19 |
| **Static typing** | Checking types at build time, before the code runs |
| **Schema validation** | Parsing untrusted runtime data, e.g. with Zod |

---
**Conclusion:** PropTypes was React's runtime, development-only prop checker — useful in its day, but it only warned, only for code paths that actually ran. Verified against React 19.2.8: <code>propTypes</code> is now ignored completely, with the validator never invoked and nothing logged, and <code>defaultProps</code> is gone for function components too. The current answer is TypeScript for props and a schema validator such as Zod for untrusted data crossing a runtime boundary. Reaching for <code>prop-types</code> in new code today buys you bundle size and nothing else.`,
    examples: [
      {
        label: "Verifying propTypes is inert on React 19, and the modern replacement",
        runnable: true,
        code: `import { useState } from "react";

// ── The legacy pattern ─────────────────────────────────────────────────────
// A validator designed to scream if it is ever called. On React 19 it is not.
let validatorCalls = 0;
function LegacyGreeting({ name, age }) {
  return <p>{name} is {age}</p>;
}
LegacyGreeting.propTypes = {
  name: () => { validatorCalls += 1; return new Error("name is wrong!"); },
  age:  () => { validatorCalls += 1; return new Error("age is wrong!"); },
};
// Also removed for function components in React 19 — silently stops applying.
LegacyGreeting.defaultProps = { age: 99 };

// ── The modern replacement ─────────────────────────────────────────────────
// Default values are plain ES6 default parameters, readable right where the
// prop is destructured. In a .tsx file the types would live here too:
//   function ModernGreeting({ name, age = 99 }: { name: string; age?: number })
function ModernGreeting({ name, age = 99 }) {
  return <p>{name} is {age}</p>;
}

export default function App() {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h4>Legacy — propTypes attached, deliberately wrong props passed</h4>
      {/* name should be a string, age a number: both are wrong on purpose */}
      <LegacyGreeting name={12345} age="not a number" />
      {/* A div, not a p: LegacyGreeting renders a <p> of its own, and a p
          inside a p is invalid HTML the browser silently repairs. */}
      <div>defaultProps age fallback: <LegacyGreeting name="Ada" /></div>

      <h4>Modern — ES6 default parameter</h4>
      <ModernGreeting name="Ada" />

      <button onClick={() => setChecked(true)}>Check whether validators ran</button>
      {checked && (
        <p style={{ marginTop: 12, padding: 12, background: "#fff3cd", borderRadius: 6 }}>
          propTypes validators called: <strong>{validatorCalls}</strong>
          {validatorCalls === 0
            ? " — React 19 ignores propTypes entirely. No warning, no validation."
            : " — this React version still honours propTypes."}
          <br />
          Notice too that the legacy defaultProps age fallback did not apply,
          while the ES6 default parameter did.
        </p>
      )}
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is `create-react-app` and when would you use it?",
    seoDescription:
      "create-react-app was the standard React starter. The React team officially sunset it in February 2025 — use Vite for an SPA or Next.js for a framework.",
    description: `**Question presented to candidate:**
"What is \`create-react-app\`, and when would you reach for it to start a new project today?"

**What a strong answer should cover:**
- CRA was the officially blessed zero-configuration starter: one command produced a working React app with Babel, webpack, ESLint, and a dev server pre-wired.
- Its value was **hiding the build configuration**, with \`eject\` as the escape hatch.
- **The key fact: the React team officially sunset CRA in February 2025.** It is deprecated and unmaintained, kept alive only in maintenance mode.
- Why: it had no active maintainers, and it solved none of the problems real production apps have — routing, data fetching, code splitting.
- The current recommendation: a **framework** (Next.js, React Router, Expo) for most apps, or a **build tool** (Vite, Parcel, Rsbuild) if you want a plain SPA.
- Secondary problems that made it untenable: slow cold starts and rebuilds versus modern esbuild/Rollup-based tooling, and a large transitive dependency tree with persistent audit noise.
- So the answer to "when would you use it" is: **for a new project, never** — only when maintaining an existing CRA app, where the real discussion is migration.

**Clarifying questions expected:**
- "Is this a new project, or are we maintaining an existing CRA app?"
- "Do we need server rendering and SEO, or is a client-only SPA fine?"

**Code / implementation expected:** No. This is a tooling and judgement question; naming the right replacement command matters more than code.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes you have started a React project before.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The deprecation status below was checked against the React team announcement rather than recalled — this is a topic where an out-of-date answer is very visible, so the source is cited inline.

## 1. Why This Even Matters — A Story First

<code>create-react-app</code> was a furnished flat. You turned the key and everything worked — the wiring was in the walls, and you never had to think about the fuse box. That was genuinely liberating in 2016, when configuring a React build by hand meant a day of webpack and Babel before you rendered a single component.

The trouble with a furnished flat is that you cannot move the walls. And eventually the landlord stopped answering the phone.

## 2. The Core Idea

📌 **Interview term:** <code>create-react-app</code> (CRA) was the officially recommended **zero-configuration** starter for React. A single command scaffolded a working app with webpack, Babel, ESLint, Jest, and a dev server already wired together and hidden behind one dependency, <code>react-scripts</code>.

Its one escape hatch was <code>eject</code> — a one-way command that copied all the hidden configuration into your project. Once ejected, you owned it forever and could no longer take upstream updates.

## 3. The important fact: CRA is deprecated

📌 **Interview term:** on **14 February 2025** the React team published *Sunsetting Create React App*, formally deprecating it. CRA has no active maintainers and continues only in maintenance mode. The docs now point new projects at a framework, or at a build tool for a plain SPA.

Sources: [Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app), [Creating a React App](https://react.dev/learn/creating-a-react-app).

The stated reasoning is worth repeating, because it is the substance of the answer:

- **No active maintainers**, while the surrounding ecosystem moved on.
- **It solved the wrong problem.** Getting started was never the hard part; production apps need routing, data fetching, and code splitting, and CRA supplied none of them.
- **Frameworks already solve those**, and the recommended ones all still support client-side rendering, so choosing one does not force you into a server.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Decision path from create-react-app to a framework or a build tool">
  <defs>
    <marker id="cra-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What to reach for instead</text>
  <rect class="d-box-muted" x="232" y="46" width="196" height="56" rx="10"/>
  <text class="d-text" x="330" y="70" text-anchor="middle">create-react-app</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">sunset Feb 2025</text>
  <path class="d-edge" d="M 280 104 L 160 154" marker-end="url(#cra-arrow)"/>
  <path class="d-edge" d="M 380 104 L 500 154" marker-end="url(#cra-arrow)"/>
  <rect class="d-box-accent" x="34" y="158" width="230" height="52" rx="10"/>
  <text class="d-text d-accent" x="149" y="180" text-anchor="middle">need routing and SSR</text>
  <text class="d-sub" x="149" y="199" text-anchor="middle">Next.js, React Router, Expo</text>
  <rect class="d-box-accent" x="396" y="158" width="230" height="52" rx="10"/>
  <text class="d-text d-accent" x="511" y="180" text-anchor="middle">plain client-side SPA</text>
  <text class="d-sub" x="511" y="199" text-anchor="middle">Vite, Parcel, Rsbuild</text>
</svg>

Both branches are legitimate. The React docs list frameworks first because most production apps end up needing what they provide, but the build-tool route is explicitly documented for people who want to assemble their own stack.

## 4. What replaced it

| You want | Use | Why |
| :--- | :--- | :--- |
| A plain client-side SPA | **Vite** | Fast dev server, near-instant HMR, minimal config |
| Routing, SSR, SEO, data loading | **Next.js** | Full framework; App Router, Server Components |
| Routing-first, framework-lite | **React Router** | Can run as an SPA or with a server |
| Mobile and web from one codebase | **Expo** | React Native with web support |

The direct modern equivalent of the old CRA command is <code>npm create vite@latest</code> with the React template.

## 5. Why it fell behind, beyond the maintenance story

- **Cold start and rebuild speed.** CRA bundled the whole app with webpack before serving. Vite serves native ES modules and only transforms what the browser requests, which is why its dev startup feels instant on a large app.
- **Dependency weight.** <code>react-scripts</code> pulled in a very large transitive tree, producing a steady stream of audit warnings that application developers could neither fix nor meaningfully assess.
- **Configuration was all-or-nothing.** Any change beyond the supported surface meant <code>eject</code> or a patching layer like <code>craco</code>.
- **It broke with React 19**, which is what finally made the deprecation unavoidable.

## 6. Common Pitfalls

- **Recommending CRA in an interview.** This is the single most visible way to sound a few years out of date. It has been formally sunset.
- **Saying "CRA is just Vite but slower".** They differ architecturally: bundle-everything-then-serve versus serve native ES modules on demand.
- **Assuming a framework forces you onto a server.** All the recommended frameworks support client-side rendering and static deployment to a CDN.
- **Advising an immediate rewrite of a working CRA app.** It still runs. A considered migration to Vite is usually a small, mechanical change; urgency is not the same as importance.
- **Reaching for <code>eject</code>.** It is one-way and hands you a large webpack configuration to maintain forever. Migrating to Vite is almost always the better move.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it, in the past tense:</strong> <span style="color:#f0e2c8;">"It was the official zero-config React starter — one command gave you webpack, Babel, ESLint and a dev server hidden behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-scripts</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the deprecation with the date:</strong> <span style="color:#f0e2c8;">"The React team sunset it in February 2025 — it is deprecated and effectively unmaintained." The date is what makes it sound current rather than vague.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the real reason:</strong> <span style="color:#f0e2c8;">"It solved getting started, which was never the hard part. Production apps need routing, data fetching, and code splitting, and CRA had no answer for any of them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Answer the actual question:</strong> <span style="color:#f0e2c8;">"For a new project, never. Vite for a plain SPA, Next.js when I need routing and server rendering."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show judgement on legacy code:</strong> <span style="color:#f0e2c8;">"An existing CRA app still works. I would migrate it to Vite when I am already touching the build, not as an emergency."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use to start a React project today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vite for a client-only SPA — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">npm create vite@latest</code> with the React template. Next.js if I need routing, SEO, server rendering, or Server Components. The deciding question is whether the app needs a server, not which tool is trendier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Vite so much faster in development?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CRA bundled the entire application with webpack before it could serve anything, so startup scaled with codebase size. Vite serves native ES modules and only transforms the files the browser actually requests, pre-bundling dependencies once. Startup becomes roughly constant instead of growing with the project.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">eject</code> do, and would you use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It copied all the hidden webpack and Babel configuration into your repository so you could edit it — irreversibly, and you stopped receiving upstream updates. I would not: migrating to Vite gives you a config you actually want to own instead of a large one you inherited.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">We have a large CRA app in production. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing urgent — it still builds and runs. I would plan a migration to Vite, which is mostly mechanical: swap <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-scripts</code> for Vite, move <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">index.html</code> to the root, rename env vars from <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">REACT_APP_</code> to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">VITE_</code>, and switch the test runner. The forcing function is usually a React 19 upgrade.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does choosing Next.js mean you must run a server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — and this is the misconception the React docs specifically address. The recommended frameworks all support client-side rendering and can be exported as static files to a CDN. You adopt the framework for its routing and data conventions; running a server is a separate choice.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>create-react-app</code>** | The deprecated zero-config React starter |
| **<code>react-scripts</code>** | The single dependency hiding CRA build configuration |
| **<code>eject</code>** | The one-way command exposing that configuration |
| **Vite** | The modern build tool; serves native ES modules in development |
| **Framework** | Next.js, React Router, Expo — routing and data fetching included |
| **Sunset** | Formally deprecated and no longer recommended |

---
**Conclusion:** <code>create-react-app</code> was the official zero-configuration React starter, and for years it was the right answer. The React team formally sunset it in February 2025: it has no active maintainers, it broke with React 19, and it never addressed the problems real production apps actually have. Today the answer is a framework such as Next.js when you need routing and server rendering, or a build tool such as Vite for a plain SPA — and for an existing CRA codebase, a planned migration rather than a panicked one.`,
    examples: [
      {
        label: "Reading a project's tooling at runtime — CRA versus Vite conventions",
        runnable: true,
        code: `import { useState } from "react";

// The two toolchains leave different fingerprints in a codebase. This is the
// checklist you would actually run through when inheriting an unfamiliar app.
const SIGNALS = [
  { area: "package.json dependency", cra: "react-scripts", vite: "vite + @vitejs/plugin-react" },
  { area: "scripts.start / dev",     cra: "react-scripts start", vite: "vite" },
  { area: "index.html lives in",     cra: "public/", vite: "project root" },
  { area: "env var prefix",          cra: "REACT_APP_", vite: "VITE_" },
  { area: "env access",              cra: "process.env.REACT_APP_X", vite: "import.meta.env.VITE_X" },
  { area: "test runner",             cra: "Jest, preconfigured", vite: "Vitest, added separately" },
  { area: "config escape hatch",     cra: "eject (one-way)", vite: "vite.config.js (always yours)" },
  { area: "status",                  cra: "sunset Feb 2025", vite: "actively maintained" },
];

export default function App() {
  const [show, setShow] = useState(false);

  // import.meta.env exists under Vite-family tooling (this playground included).
  const hasViteEnv = typeof import.meta !== "undefined" && Boolean(import.meta.env);

  const th = { textAlign: "left", padding: "6px 12px 6px 0", borderBottom: "1px solid #ddd" };
  const td = { padding: "5px 12px 5px 0", verticalAlign: "top" };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.5 }}>
      <h3>Which toolchain is this project on?</h3>
      <p style={{ background: "#eef6ff", padding: 10, borderRadius: 6, fontSize: 14 }}>
        <code>import.meta.env</code> is {hasViteEnv ? "available" : "not available"} here —
        {hasViteEnv
          ? " a Vite-family bundler. CRA exposed process.env.REACT_APP_* instead."
          : " so this is not a Vite build."}
      </p>

      <button onClick={() => setShow((s) => !s)}>
        {show ? "Hide" : "Show"} the migration checklist
      </button>

      {show && (
        <table style={{ borderCollapse: "collapse", marginTop: 16, fontSize: 13 }}>
          <thead>
            <tr><th style={th}>What to check</th><th style={th}>CRA</th><th style={th}>Vite</th></tr>
          </thead>
          <tbody>
            {SIGNALS.map((s) => (
              <tr key={s.area}>
                <td style={td}>{s.area}</td>
                <td style={{ ...td, color: "#a33" }}><code>{s.cra}</code></td>
                <td style={{ ...td, color: "#161" }}><code>{s.vite}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are React Developer Tools and how do you use them?",
    seoDescription:
      "React DevTools adds two panels: Components, for inspecting props, state and hooks live, and Profiler, for recording what rendered and why.",
    description: `**Question presented to candidate:**
"Walk me through React DevTools. What are the panels, and what do you actually use each one for?"

**What a strong answer should cover:**
- A browser extension (and a standalone package for React Native and other environments) adding two panels to the browser devtools.
- **Components panel**: the component tree, with live props, state, hooks, and context for the selected node — and the ability to edit them in place.
- **Profiler panel**: records a session and shows each commit, how long it took, which components rendered, and — with the setting enabled — *why* each one rendered.
- Key workflow: "Highlight updates when components render" to see wasted re-renders visually.
- The flamegraph vs ranked chart distinction, and that grey components are ones that did not re-render.
- Practical touches: \`$r\` in the console for the selected component, owner-based filtering, and hiding host elements to reduce noise.
- Signal of depth: the Profiler needs a development build or a production build with profiling enabled; a plain production build shows nothing useful.

**Clarifying questions expected:**
- "Are we debugging correctness — wrong data on screen — or performance?" The panel differs.

**Code / implementation expected:** No. This is a tooling walkthrough.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes you have built a React app.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The React 19 API surface referenced in section 6 was read off the installed React 19.2.8 in this repo.

## 1. Why This Even Matters — A Story First

The browser Elements panel shows you the finished building: walls, doors, paint. What it cannot show you is the architectural plan — which room belongs to which floor, who owns the light switch, and why the kitchen was rebuilt when someone opened a window upstairs.

React DevTools shows you the plan. Same building, but organised the way you actually think about it: by component, not by DOM node.

## 2. The Core Idea

📌 **Interview term:** **React Developer Tools** is an official browser extension (Chrome, Firefox, Edge) that adds two panels to the browser devtools. There is also a standalone <code>react-devtools</code> package for React Native, Safari, and embedded environments.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="React DevTools adds a Components panel and a Profiler panel">
  <text class="d-text" x="330" y="24" text-anchor="middle">Two panels, two different jobs</text>
  <rect class="d-box-accent" x="24" y="48" width="290" height="146" rx="10"/>
  <text class="d-text d-accent" x="169" y="76" text-anchor="middle">Components</text>
  <text class="d-sub" x="169" y="102" text-anchor="middle">the component tree</text>
  <text class="d-sub" x="169" y="124" text-anchor="middle">props, state, hooks, context</text>
  <text class="d-sub" x="169" y="146" text-anchor="middle">editable live</text>
  <text class="d-sub" x="169" y="172" text-anchor="middle">use it for wrong data</text>
  <rect class="d-box-accent" x="346" y="48" width="290" height="146" rx="10"/>
  <text class="d-text d-accent" x="491" y="76" text-anchor="middle">Profiler</text>
  <text class="d-sub" x="491" y="102" text-anchor="middle">records commits</text>
  <text class="d-sub" x="491" y="124" text-anchor="middle">duration and why it rendered</text>
  <text class="d-sub" x="491" y="146" text-anchor="middle">flamegraph and ranked chart</text>
  <text class="d-sub" x="491" y="172" text-anchor="middle">use it for slow updates</text>
</svg>

Choosing between them is the first diagnostic decision: wrong values on screen is a Components problem, sluggishness is a Profiler problem.

## 3. The Components panel

📌 **Interview term:** the **Components** panel shows the React tree rather than the DOM tree, so a component appears once even when it renders many DOM nodes, and components that render no DOM at all still appear.

Selecting a node gives you, in the right-hand pane:

- **props** passed to it
- **state** for each <code>useState</code>, and every other hook in order
- **context** values it is consuming
- **rendered by** — the owner chain, which is the fastest way to answer "where did this prop come from?"

What makes it more than a viewer:

- **Values are editable.** Change a prop or a piece of state directly and the UI re-renders — an instant way to test an edge case without touching code.
- **<code>$r</code> in the console.** The selected component is exposed as <code>$r</code>, so you can inspect or call its values from the console, exactly like <code>$0</code> for DOM nodes.
- **Filtering.** Hiding host (DOM) elements collapses the tree to just your components, which on a real app is the difference between usable and unusable.
- **Search.** Filter the tree by component name.

## 4. The Profiler panel

📌 **Interview term:** the **Profiler** records a session and breaks it into **commits** — each moment React actually applied changes to the DOM. You get a bar per commit, and for each one, which components rendered and how long they took.

The workflow that matters:

1. Open Profiler, click record, perform the slow interaction, stop.
2. Look at the commit bars. Tall ones are expensive commits.
3. In the **flamegraph**, width is render duration and grey means *did not re-render*. Wide, colourful components that should not have changed are the problem.
4. Switch to the **ranked** chart to see the same commit sorted by cost — usually the fastest way to the culprit.
5. Enable **"Record why each component rendered"** in the Profiler settings. Each component then reports whether it re-rendered because props changed, state changed, its parent rendered, or context changed.

That last setting is the single highest-value thing in the panel. "Parent rendered" on an expensive subtree points straight at a missing <code>React.memo</code> or a component that should have been passed as <code>children</code>.

📌 **Interview term:** profiling requires a **development build**, or a production build with profiling explicitly enabled. Against a plain production bundle the Profiler cannot show component names or timings — worth saying, because it is the first thing that goes wrong when someone tries to profile a deployed site.

## 5. The setting people forget

In the Components panel settings, **"Highlight updates when components render"** draws a coloured border around every component as it re-renders. Type one character into a search box and watch the whole page flash, and you have found your re-render problem in about four seconds without recording anything.

## 6. Where DevTools fits with the rest of the toolkit

| Symptom | Reach for |
| :--- | :--- |
| Wrong value on screen | Components panel — inspect props and state |
| "Where does this prop come from?" | Components panel — the owner chain |
| Interaction feels sluggish | Profiler — record, then the ranked chart |
| Too many re-renders | Highlight updates, then "why did this render" |
| Effect running twice | Not a bug — see <a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> |
| Need the stack that created an element | <code>captureOwnerStack</code>, a React 19 development API |

On React 19.2.8, <code>React.captureOwnerStack</code> is present as a function — it returns the **owner stack**, the chain of components that created the element being rendered, which is far more useful than a plain call stack when tracking down where a bad prop originated.

## 7. Common Pitfalls

- **Profiling a production build and concluding nothing is slow.** Without a profiling build you get minified names and no timings.
- **Using the Elements panel for React problems.** It shows the DOM output, not the component tree, props, or hooks.
- **Ignoring "why did this render".** It is off by default and it is the most useful signal in the whole tool.
- **Reading hook values without naming them.** Hooks show as "State", "State", "State" in order. <code>useDebugValue</code> labels custom hooks so they are readable.
- **Trusting a single commit.** Profile a whole interaction; one commit rarely tells the story.
- **Forgetting the extension is not the only option.** The standalone <code>react-devtools</code> package attaches to React Native and non-Chromium browsers.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the two panels immediately:</strong> <span style="color:#f0e2c8;">"Components for inspecting the tree — props, state, hooks, context, all editable live — and Profiler for recording renders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say how you choose between them:</strong> <span style="color:#f0e2c8;">"Wrong value on screen is a Components problem. Sluggish interaction is a Profiler problem."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention the highest-value setting:</strong> <span style="color:#f0e2c8;">"I turn on <em style="color:#ffe0b2;">record why each component rendered</em> — it tells you whether it was props, state, parent, or context, which points straight at the fix."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Add a practical detail:</strong> <span style="color:#f0e2c8;">"Highlight updates when components render finds a runaway re-render in seconds, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$r</code> gives you the selected component in the console."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the gotcha:</strong> <span style="color:#f0e2c8;">"Profiling needs a development or profiling build — against a plain production bundle you get minified names and no timings."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find out why a component keeps re-rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turn on "record why each component rendered" in the Profiler, record the interaction, and read the reason off the component: props, state, parent, or context. If it says the parent rendered and nothing about this component changed, that is a memoisation or composition problem, not a state one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does grey mean in the flamegraph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That component did not re-render in that commit — it is shown for tree context only. Grey is what you want to see on expensive subtrees; a wide coloured bar on something whose data did not change is the thing to chase.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you profile a production site?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not a plain production build — the profiling instrumentation is stripped and names are minified. You need a build with profiling enabled, which most bundlers and frameworks support as an explicit option. It is worth having that build available for exactly this reason.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do custom hooks show as unnamed "State" entries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">DevTools sees the primitive hooks a custom hook calls, in order, with no idea what they mean. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useDebugValue</code> inside the custom hook attaches a readable label — worth adding to any hook shared across a codebase.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you debug React Native or a browser without the extension?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The standalone <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-devtools</code> package runs the same UI in its own window and connects over a socket. Same two panels, same features — it just is not embedded in the browser devtools.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Components panel** | The React tree with live props, state, hooks, and context |
| **Profiler panel** | A recorder showing render timings per commit |
| **Commit** | One moment React applied changes to the DOM |
| **Flamegraph** | Width is render cost; grey means it did not re-render |
| **Ranked chart** | The same commit sorted by render cost |
| **<code>$r</code>** | Console reference to the selected component |
| **<code>useDebugValue</code>** | Labels a custom hook in DevTools |

---
**Conclusion:** React DevTools adds two panels that answer two different questions. Components shows the React tree with live, editable props, state, hooks, and context — the right tool when a value on screen is wrong. Profiler records commits and shows what rendered, how long it took, and, with the setting enabled, *why* — the right tool when something feels slow. The two details worth carrying into an interview are that "record why each component rendered" is the highest-value setting in the tool and is off by default, and that profiling needs a development or profiling-enabled build.`,
    examples: [
      {
        label: "A component instrumented so DevTools shows something useful",
        runnable: true,
        code: `import { useState, useMemo, useCallback, useDebugValue, memo, Profiler } from "react";

// useDebugValue labels this hook in the DevTools Components panel. Without it
// you would just see two anonymous "State" entries in hook order.
function useCart(initial = []) {
  const [items, setItems] = useState(initial);
  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
  useDebugValue(\`\${items.length} items, £\${total}\`);
  const add = useCallback((item) => setItems((prev) => [...prev, item]), []);
  return { items, total, add };
}

// Memoised: with "highlight updates" on, this should NOT flash when only the
// unrelated counter in the parent changes.
const CartList = memo(function CartList({ items }) {
  return (
    <ul>
      {items.map((i, n) => <li key={n}>{i.name} — £{i.price}</li>)}
    </ul>
  );
});

// NOT memoised, on purpose: this one flashes on every parent render. In the
// Profiler its render reason reads "the parent component rendered".
function CartTotal({ total }) {
  return <p>Total: <strong>£{total}</strong></p>;
}

export default function App() {
  const { items, total, add } = useCart([{ name: "Keyboard", price: 60 }]);
  const [unrelated, setUnrelated] = useState(0);

  // The Profiler component reports the same timings the DevTools panel shows,
  // which is handy for logging renders in CI or a test.
  const onRender = (id, phase, actualDuration) => {
    console.log(\`[profiler] \${id} \${phase} in \${actualDuration.toFixed(2)}ms\`);
  };

  return (
    <Profiler id="Cart" onRender={onRender}>
      <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
        <h3>Cart</h3>
        <CartList items={items} />
        <CartTotal total={total} />
        <button onClick={() => add({ name: "Mouse", price: 25 })}>Add item</button>{" "}
        <button onClick={() => setUnrelated((n) => n + 1)}>
          Unrelated state ({unrelated})
        </button>
        <p style={{ color: "#666", fontSize: 13 }}>
          Open React DevTools. Select App and look at the hooks pane — useCart
          shows its useDebugValue label. Then turn on "Highlight updates when
          components render" and press the unrelated button: CartTotal flashes,
          CartList does not, because it is memoised.
        </p>
      </div>
    </Profiler>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you debug React applications?",
    seoDescription:
      "Pick the tool by symptom: DevTools Components for wrong data, Profiler for slow renders, Error Boundaries for crashes, StrictMode to catch bugs early.",
    description: `**Question presented to candidate:**
"A bug report says a page shows stale data and feels sluggish. Walk me through how you would debug that in a React app."

**What a strong answer should cover:**
- A **method**, not a tool list: reproduce, narrow to a component, then inspect the data flowing into it.
- **React DevTools Components** for wrong values — props, state, hooks, context, and the owner chain that answers "where did this come from?".
- **React DevTools Profiler** for slow interactions, with "record why each component rendered" enabled.
- **StrictMode** as a proactive detector of impure renders and missing effect cleanup, not a nuisance.
- **Error Boundaries** to catch render-phase crashes and show a real fallback plus a component stack.
- Knowing what an Error Boundary does *not* catch: event handlers, async code, SSR, and errors in the boundary itself.
- React 19 additions: \`captureOwnerStack\` for the chain of components that created an element.
- Ordinary JavaScript debugging still applies — breakpoints, conditional breakpoints, the network panel.
- The common root causes worth naming: stale closures, missing effect dependencies, and unstable object or function identities.

**Clarifying questions expected:**
- "Does it reproduce in development, or only in production?" — that changes the toolkit entirely.
- "Is it wrong data, a crash, or slowness?" — the three lead to different tools.

**Code / implementation expected:** Optional. An Error Boundary is the one piece of code worth being able to write from memory.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes hooks and component basics.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The React 19 debugging API named in section 5 was read off the installed React 19.2.8 in this repo rather than recalled.

## 1. Why This Even Matters — A Story First

A doctor presented with "I feel unwell" does not start by ordering every test in the building. They ask where it hurts, because the answer decides which instrument comes out. A stethoscope tells you nothing about a broken wrist.

Debugging React works the same way, and it is what interviewers are really probing. Reciting "I use React DevTools" is the equivalent of naming one instrument. The strong answer sorts the symptom first — **wrong data, crash, or slow** — and then reaches for the matching tool.

## 2. The Core Idea

📌 **Interview term:** almost every React bug is one of three shapes, and each has a different first move:

| Symptom | First move |
| :--- | :--- |
| **Wrong data** on screen | DevTools **Components** — inspect props, state, hooks, context |
| **Crash** or blank screen | **Error Boundary** plus the component stack in the console |
| **Slow** or janky interaction | DevTools **Profiler** with render reasons enabled |

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Three bug symptoms each route to a different debugging tool">
  <defs>
    <marker id="dbg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Sort the symptom before picking the tool</text>
  <rect class="d-box-muted" x="250" y="44" width="160" height="50" rx="10"/>
  <text class="d-text" x="330" y="66" text-anchor="middle">reproduce it</text>
  <text class="d-sub" x="330" y="84" text-anchor="middle">then classify</text>
  <path class="d-edge" d="M 276 96 L 130 152" marker-end="url(#dbg-arrow)"/>
  <path class="d-edge" d="M 330 96 L 330 152" marker-end="url(#dbg-arrow)"/>
  <path class="d-edge" d="M 384 96 L 530 152" marker-end="url(#dbg-arrow)"/>
  <rect class="d-box-accent" x="20" y="156" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="120" y="178" text-anchor="middle">wrong data</text>
  <text class="d-sub" x="120" y="198" text-anchor="middle">Components panel</text>
  <rect class="d-box-accent" x="230" y="156" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="330" y="178" text-anchor="middle">crash</text>
  <text class="d-sub" x="330" y="198" text-anchor="middle">Error Boundary</text>
  <rect class="d-box-accent" x="440" y="156" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="540" y="178" text-anchor="middle">slow</text>
  <text class="d-sub" x="540" y="198" text-anchor="middle">Profiler</text>
</svg>

Saying that structure out loud before naming a single tool is what makes the answer sound like experience rather than a list.

## 3. Wrong data: the Components panel

Select the misbehaving component and read its **props**, **state**, **hooks**, and **context** live. Then use the **owner chain** ("rendered by") to walk upward and find where the bad value entered the tree. That is usually a three-step trip, and it beats adding <code>console.log</code> at every level.

Two accelerators worth naming:

- Values are **editable in place**, so you can reproduce an edge case without changing code.
- The selected component is exposed as **<code>$r</code>** in the console.

📌 **Interview term:** the three classic root causes for wrong data are **stale closures** (a callback capturing an old value), **missing effect dependencies** (an effect not re-running when it should), and **unstable identities** (a new object or function every render defeating memoisation). Naming these unprompted is a strong senior signal.

## 4. Crashes: Error Boundaries

📌 **Interview term:** an **Error Boundary** is a component that catches errors thrown while rendering anywhere in its subtree, logs them, and renders a fallback instead of unmounting the whole tree. Without one, a render-phase throw unmounts the entire React tree and leaves a blank page.

What it **does not** catch is where the follow-up questions live:

- Errors inside **event handlers** — those are ordinary JavaScript; use <code>try/catch</code>
- **Asynchronous** code, including <code>setTimeout</code> and promise rejections
- Errors during **server-side rendering**
- Errors thrown by the **boundary itself**

Error boundaries still require a **class component** (<code>getDerivedStateFromError</code> and <code>componentDidCatch</code>) or a library wrapper such as <code>react-error-boundary</code> — there is no hook equivalent.

## 5. React 19 additions worth knowing

<code>React.captureOwnerStack</code> is present as a function on React 19.2.8. It returns the **owner stack** — the chain of components that *created* the element being rendered, which is different from, and usually more useful than, the JavaScript call stack. When a warning says a prop is wrong, the owner stack tells you which component passed it.

React 19 also improved error reporting itself: hydration mismatches now log a readable diff of the server and client output rather than a generic warning, and duplicated error logs were consolidated.

## 6. Slow: the Profiler

Record the interaction, then look at the **ranked** chart to find the most expensive components in the worst commit. Enable **"record why each component rendered"** — the reason (props, state, parent, context) points directly at the fix.

For a fast first look, turn on **"Highlight updates when components render"** in the Components panel settings. If typing one character flashes the whole page, you have found the problem without recording anything.

## 7. StrictMode: catching bugs before they are reported

<a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> is a debugging tool used *proactively*. In development it double-invokes renders to expose impure components, and mounts, cleans up, and remounts each effect to expose missing cleanup. An effect that misbehaves under it has a real bug — the fix is cleanup, never removing the wrapper.

## 8. Common Pitfalls

- **Answering with a tool list instead of a method.** Sort the symptom first; the tool follows.
- **Using the Elements panel for React problems.** It shows DOM output, not props, state, or hooks.
- **Profiling a production build.** Names are minified and timings are stripped; you need a profiling build.
- **Wrapping the whole app in one Error Boundary.** One boundary means one failure takes out everything. Place them per route or per widget so a broken sidebar does not kill the page.
- **Expecting an Error Boundary to catch an event-handler error.** It will not. That is plain <code>try/catch</code> territory.
- **Reaching for <code>console.log</code> in the render body.** It fires on every render, doubled under StrictMode, and floods the console. A conditional breakpoint is almost always faster.
- **Removing StrictMode to make a symptom go away.** That deletes the warning, not the defect.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the classification, not a tool:</strong> <span style="color:#f0e2c8;">"First I work out whether it is wrong data, a crash, or slowness — those go to three different tools."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Wrong data:</strong> <span style="color:#f0e2c8;">"DevTools Components — read props, state, hooks and context on the failing component, then follow the owner chain up to where the bad value entered."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Slow:</strong> <span style="color:#f0e2c8;">"Profiler with <em style="color:#ffe0b2;">record why each component rendered</em> on. If the reason is <em style="color:#ffe0b2;">the parent rendered</em> and nothing here changed, it is a memoisation or composition problem."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Crash:</strong> <span style="color:#f0e2c8;">"Error Boundaries per route or per widget — and I would say unprompted that they do not catch event handlers, async code, or SSR errors."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the usual suspects:</strong> <span style="color:#f0e2c8;">"Most React-specific bugs come down to stale closures, missing effect dependencies, or unstable object and function identities."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A bug only reproduces in production. How do you approach it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make sure source maps are deployed so stack traces are readable, and get a profiling-enabled build for anything performance-related. Then look for what actually differs: minification, environment variables, real network latency and ordering, and the absence of StrictMode double-invocation. Production-only bugs are very often timing or race conditions that development hid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does an Error Boundary <em style="color:#ffe0b2;">not</em> catch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Event handlers, asynchronous code such as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> and promise rejections, server-side rendering, and errors thrown by the boundary itself. It catches the render, lifecycle, and constructor phases of its subtree — anything outside React call stack is ordinary <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">try/catch</code> territory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The UI shows an old value after an update. What is your first hypothesis?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A stale closure or a missing effect dependency. I would check in DevTools whether the state actually updated: if state is correct but the screen is not, something captured an old value; if state itself never changed, look for a mutation instead of a new object, which React compares by reference and skips.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">console.log</code> a reasonable debugging tool in React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a quick check, yes — but in a render body it fires on every render and twice under StrictMode, so it floods fast. A conditional breakpoint on the specific value is usually quicker, and DevTools shows you the whole hook state at once rather than one logged variable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you place Error Boundaries in a real app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One at the root as a last resort, then one per route, then around independently-failing widgets — a chart, a third-party embed, a comments section. Granularity is the whole point: a broken sidebar should degrade to a fallback, not take the page down with it.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Owner chain** | Which component created and passed props to this one |
| **Error Boundary** | A class component catching render-phase errors in its subtree |
| **Stale closure** | A callback holding a value from an earlier render |
| **Unstable identity** | A new object or function each render, defeating memoisation |
| **<code>captureOwnerStack</code>** | React 19 API returning the component chain that created an element |
| **Profiling build** | A production build that keeps names and render timings |

---
**Conclusion:** debugging React well is mostly about classifying the symptom before reaching for a tool — wrong data goes to the DevTools Components panel and the owner chain, crashes go to Error Boundaries and the component stack, and slowness goes to the Profiler with render reasons switched on. StrictMode does the proactive half by making impure renders and missing cleanup fail loudly in development. And when the tool has told you *where*, the answer to *why* is usually one of three things: a stale closure, a missing effect dependency, or an unstable identity.`,
    examples: [
      {
        label: "An Error Boundary, and the errors it deliberately cannot catch",
        runnable: true,
        code: `import { Component, useState } from "react";

// Error Boundaries still require a class — there is no hook equivalent.
class ErrorBoundary extends Component {
  state = { error: null };

  // Render the fallback on the next render after a child throws.
  static getDerivedStateFromError(error) {
    return { error };
  }

  // Side effects belong here: log to Sentry, etc. info.componentStack tells
  // you which component threw, which a plain JS stack trace will not.
  componentDidCatch(error, info) {
    console.log("[boundary] caught:", error.message);
    console.log("[boundary] component stack:", info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 12, border: "1px solid crimson", borderRadius: 6, color: "crimson" }}>
          <strong>Something went wrong:</strong> {this.state.error.message}{" "}
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Throws during RENDER — the boundary catches this.
function ExplodesOnRender({ boom }) {
  if (boom) throw new Error("render-phase error");
  return <p>Rendering fine.</p>;
}

// Throws inside an EVENT HANDLER — the boundary does NOT catch this. It is
// ordinary JavaScript and needs try/catch.
function ExplodesOnClick() {
  const [caught, setCaught] = useState(null);
  return (
    <p>
      <button onClick={() => { throw new Error("handler error — boundary will NOT catch this"); }}>
        Throw in a handler (uncaught)
      </button>{" "}
      <button
        onClick={() => {
          try { throw new Error("handler error"); }
          catch (e) { setCaught(e.message); }
        }}
      >
        Throw, but with try/catch
      </button>
      {caught && <em style={{ color: "green" }}> handled: {caught}</em>}
    </p>
  );
}

export default function App() {
  const [boom, setBoom] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h3>Caught by the boundary</h3>
      <ErrorBoundary>
        <ExplodesOnRender boom={boom} />
      </ErrorBoundary>
      <button onClick={() => setBoom(true)}>Trigger a render error</button>

      <h3>Not caught by the boundary</h3>
      <ErrorBoundary>
        <ExplodesOnClick />
      </ErrorBoundary>

      <p style={{ color: "#666", fontSize: 13 }}>
        The first button is caught and shows a fallback. The first button in the
        second group escapes to the console — Error Boundaries cover the render,
        lifecycle and constructor phases only, never event handlers or async code.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
