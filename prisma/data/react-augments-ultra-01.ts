/**
 * React "ultra" rewrite — batch 01 (pilot).
 *
 * Full CLAUDE.md treatment per question: numbered sections, a plain-language
 * analogy before any jargon, `📌 Interview term:` callouts, a **Verified:**
 * section quoting output that was actually executed, a theme-aware
 * `.iq-diagram` SVG, comparison tables, topic-specific pitfalls, the §7
 * "How to Answer in an Interview" card, a glossary, and a conclusion.
 *
 * Picked up by `npm run augment:react`. Sorts after react-augments-gold-*.ts
 * and react-augments-hard.json, so these override the older answers.
 *
 * Conventions (differ deliberately from the Angular gold files):
 *   - SVG attributes are DOUBLE-quoted. CLAUDE.md §3 bans apostrophes inside
 *     <svg> blocks, and single-quoted attributes would make that check useless.
 *   - `<svg class="iq-diagram">` + the shared d-* helper classes from
 *     globals.css — never hardcoded colours, so one SVG works in both themes
 *     and the diagram becomes lightbox-clickable.
 *   - Inline code uses <code> tags (rendered via rehype-raw) so the markdown
 *     stays readable inside TS template literals.
 *   - No leading `# H1` — the question page already renders the title.
 *   - `description` is the §6 Question Body and is PLAIN MARKDOWN: that field
 *     renders without rehype-raw, so HTML and SVG there would not render.
 *
 * Every claim marked "Verified" in these answers was produced by executing the
 * code in this repo against React 19.2.8 (vitest + jsdom + react-dom), not
 * described from memory. Version/release claims were checked on react.dev.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the role of `react-dom`?",
    seoDescription:
      "react-dom is the renderer that turns React's platform-agnostic output into real browser DOM nodes, split into client, server, and utility entry points.",
    description: `**Question presented to candidate:**
"You have got \`react\` and \`react-dom\` in your package.json. What is the difference — why are they two separate packages, and what does \`react-dom\` actually do?"

**What a strong answer should cover:**
- \`react\` is the platform-agnostic core: components, Hooks, and reconciliation. It has no idea what a \`<div>\` is.
- \`react-dom\` is the **renderer** that applies React's output to a real browser DOM.
- The three entry points: \`react-dom/client\` (createRoot / hydrateRoot), \`react-dom/server\` (renderToString and the streaming APIs), and the top-level \`react-dom\` utilities.
- Why the split exists: the same component code can target other renderers — React Native, react-three-fiber, react-pdf.
- \`ReactDOM.render\`, \`ReactDOM.hydrate\`, and \`ReactDOM.findDOMNode\` were deprecated in React 18 and **removed** in React 19.
- Bonus signal: \`useFormStatus\` ships from \`react-dom\`, not \`react\` — a detail most candidates get backwards.

**Clarifying questions expected:**
- "Which React version are we targeting?" — the answer changes for 19 vs. 17.
- "Do you want the client story, the server story, or both?"

**Code / implementation expected:** Optional. A short \`createPortal\` snippet is the strongest concrete demonstration of a \`react-dom\`-specific capability.`,
    answer: `**Target Audience:** Frontend engineers preparing for React interviews — assumes basic familiarity with components.
**Difficulty:** Easy to Medium

> **How to read this doc:** Every concept is explained in plain language first. Right after, you will see a callout like <code>📌 Interview term:</code> — that is the exact vocabulary a senior engineer would use for the same idea. Every package-export and behavioural claim below was produced by actually running React 19.2.8 in this repo, not described from documentation.

## 1. Why This Even Matters — A Story First

<code>react</code> is an architect. It designs the blueprint (your components), works out what changed between two versions of the plan, and decides what needs rebuilding. But an architect does not pour concrete or hang drywall. <code>react-dom</code> is the construction crew that takes that blueprint and actually builds it — specifically, into a web browser DOM.

The split matters because the same architect can hand blueprints to a *different* crew. React Native builds native mobile views from the exact same component code. <code>react-dom</code> is just one possible crew — the one that happens to build for the web.

## 2. The Core Idea

📌 **Interview term:** <code>react</code> is the **platform-agnostic core** — it defines components, Hooks, and the reconciliation algorithm (deciding what changed between renders). <code>react-dom</code> is the **renderer** that takes React output and creates, updates, and removes real DOM nodes to match.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The react core hands its output to one of three react-dom entry points">
  <defs>
    <marker id="rd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">One core, three DOM entry points</text>
  <rect class="d-box-accent" x="230" y="46" width="180" height="54" rx="10"/>
  <text class="d-text d-accent" x="320" y="70" text-anchor="middle">react</text>
  <text class="d-sub" x="320" y="89" text-anchor="middle">components, Hooks, reconciliation</text>
  <path class="d-edge" d="M 296 102 L 150 150" marker-end="url(#rd-arrow)"/>
  <path class="d-edge" d="M 320 102 L 320 150" marker-end="url(#rd-arrow)"/>
  <path class="d-edge" d="M 344 102 L 490 150" marker-end="url(#rd-arrow)"/>
  <rect class="d-box" x="30" y="156" width="170" height="66" rx="10"/>
  <text class="d-text" x="115" y="182" text-anchor="middle">react-dom/client</text>
  <text class="d-sub" x="115" y="203" text-anchor="middle">createRoot, hydrateRoot</text>
  <rect class="d-box" x="235" y="156" width="170" height="66" rx="10"/>
  <text class="d-text" x="320" y="182" text-anchor="middle">react-dom/server</text>
  <text class="d-sub" x="320" y="203" text-anchor="middle">renderToString, streams</text>
  <rect class="d-box" x="440" y="156" width="170" height="66" rx="10"/>
  <text class="d-text" x="525" y="182" text-anchor="middle">react-dom</text>
  <text class="d-sub" x="525" y="203" text-anchor="middle">createPortal, flushSync</text>
</svg>

The core never touches a DOM node itself. It produces a description of what the UI should be, and one of the three <code>react-dom</code> entry points turns that description into something real.

## 3. Verified: the package split is exactly this clean

Reading the installed <code>react-dom</code> package (version 19.2.8) confirms the split precisely. Its top-level exports are entirely DOM-specific utilities:

\`\`\`
createPortal, flushSync, preconnect, prefetchDNS, preinit, preinitModule,
preload, preloadModule, requestFormReset, unstable_batchedUpdates,
useFormState, useFormStatus, version
\`\`\`

Nothing about components or Hook logic lives here — that is all in <code>react</code> itself.

### The three entry points

| Entry point | Verified exports | Used for |
| :--- | :--- | :--- |
| <code>react-dom/client</code> | <code>createRoot</code>, <code>hydrateRoot</code> | Rendering or hydrating a React tree into a real browser DOM |
| <code>react-dom/server</code> | <code>renderToString</code>, <code>renderToStaticMarkup</code>, <code>renderToPipeableStream</code>, <code>renderToReadableStream</code> | Rendering a React tree to HTML on the server |
| <code>react-dom</code> (top level) | <code>createPortal</code>, <code>flushSync</code>, <code>useFormStatus</code>, and more | DOM-specific utilities usable from either environment |

## 4. Verified: <code>ReactDOM.render</code> is genuinely gone in React 19

\`\`\`js
const ReactDOM = require("react-dom");
console.log(typeof ReactDOM.render);
console.log(typeof ReactDOM.hydrate);
console.log(typeof ReactDOM.findDOMNode);
console.log(typeof ReactDOM.unmountComponentAtNode);
\`\`\`

Actual output on the installed React 19.2.8:

\`\`\`
undefined
undefined
undefined
undefined
\`\`\`

📌 **Interview term:** <code>ReactDOM.render</code>, <code>ReactDOM.hydrate</code>, and <code>ReactDOM.findDOMNode</code> were **deprecated in React 18** and **fully removed in React 19**. Their replacements — <code>createRoot</code> and <code>hydrateRoot</code> — also moved to a dedicated <code>react-dom/client</code> entry point rather than living on the top-level import.

\`\`\`jsx
// Before (removed in React 19)
import { render } from "react-dom";
render(<App />, document.getElementById("root"));

// Current
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")).render(<App />);
\`\`\`

## 5. Verified: <code>createPortal</code> really does escape the DOM position

A component can be *logically* nested deep inside another while its actual DOM output lands somewhere else — the standard trick for modals, tooltips, and dropdowns that must escape a parent <code>overflow: hidden</code> or stacking context.

Rendering an <code>&lt;App /&gt;</code> containing a portalled <code>&lt;Modal /&gt;</code> into <code>#app-root</code> produced exactly this DOM:

\`\`\`
app-root   innerHTML: <div><span>I live in app-root</span></div>
modal-root innerHTML: <p>I live in modal-root, not app-root</p>
\`\`\`

Even though <code>&lt;Modal /&gt;</code> is written as a child of <code>&lt;App /&gt;</code>, its rendered output leaves zero trace inside <code>app-root</code>.

### The part that trips people up — verified separately

A portalled button was clicked while its *logical* React parent had an <code>onClick</code> handler. The handlers that fired, in order:

\`\`\`
handlers fired, in order: ["button","parent div (logical ancestor)"]
is the button a DOM descendant of the parent div? false
\`\`\`

📌 **Interview term:** portal events bubble through the **React tree**, not the DOM tree. The parent handler fired even though the button is provably not a DOM descendant of that parent. This is the single most common source of confusion when debugging portal-based UI, and being able to state it precisely is a strong signal.

## 6. Where <code>react-dom</code> fits with other renderers

| Renderer | Renders <code>react</code> components to |
| :--- | :--- |
| <code>react-dom</code> | Real browser DOM nodes |
| React Native | Native iOS and Android views |
| <code>react-pdf</code> | PDF documents |
| <code>react-three-fiber</code> | WebGL scenes via Three.js |

**Plain-language takeaway:** this is the actual payoff of splitting <code>react</code> from <code>react-dom</code> — the same component logic, Hooks, and reconciliation engine can target completely different output formats just by swapping the renderer.

## 7. Common Pitfalls

- **Importing <code>createRoot</code> from <code>react-dom</code> instead of <code>react-dom/client</code>.** As verified above, it is not on the top-level export any more.
- **Still writing <code>ReactDOM.render</code> in React 19 code.** It is not merely deprecated, it is removed — the call throws rather than warns.
- **Assuming <code>useFormStatus</code> comes from <code>react</code>.** It is exported from <code>react-dom</code>, because it reads the state of a DOM form. Easy to get backwards from memory.
- **Expecting portal events to follow the DOM tree.** Verified above: they follow the React tree, so a handler on the logical ancestor still fires.
- **Reaching for <code>flushSync</code> to "fix" a timing bug.** It forces a synchronous re-render and opts you out of batching — it is an escape hatch for measuring layout, not a general tool.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Open with the architect and crew split:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> is platform-agnostic — components, Hooks, reconciliation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code> is the renderer that actually creates and updates real browser DOM nodes to match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the three entry points:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom/client</code> for browser rendering, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom/server</code> for server HTML, and the top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code> utilities such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createPortal</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Preempt the "why does the split exist" follow-up:</strong> <span style="color:#f0e2c8;">"So the same component code can target a different renderer — React Native, react-three-fiber — without rewriting the components."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring up the React 19 removal unprompted:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReactDOM.render</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> were deprecated in React 18 and removed in React 19, replaced by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createRoot</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateRoot</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom/client</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. If asked for code,</strong> <span style="color:#f0e2c8;">a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createPortal</code> modal is the strongest demo — then add that its events still bubble through the React tree, which is the detail that separates a memorised answer from a used-it-in-anger one.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React split its core logic from its DOM renderer at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So the same component model, Hooks, and reconciliation logic can target completely different output. React Native uses the identical <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> package to render native views — only the renderer changes, not the components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">react-dom/client</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">react-dom/server</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">client</code> renders into a live browser DOM via <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">createRoot</code> or <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateRoot</code>. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">server</code> produces an HTML string or stream with no real DOM involved at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a modal is portalled out of the tree, will a click inside it still hit the parent handler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Events propagate through the React tree, not the DOM tree, so a handler on the logical ancestor fires even though the node is elsewhere in the document. That is usually what you want for context menus, and it is a classic surprise when a click-outside handler starts misfiring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ReactDOM.render</code> deprecated or removed in React 19?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fully removed. It was deprecated in React 18 with a console warning; in React 19 the export is simply gone, so the call throws. Same for <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">findDOMNode</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which package exports <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFormStatus</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>, not <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> — it reads the pending state of a real DOM form, so it belongs to the DOM renderer. Most candidates guess <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>react</code>** | The platform-agnostic core: components, Hooks, reconciliation |
| **<code>react-dom</code>** | The renderer that targets a real browser DOM |
| **<code>createRoot</code>** | The current API for rendering a React tree into the browser DOM |
| **<code>hydrateRoot</code>** | Attaches React event handling to already-server-rendered HTML |
| **<code>createPortal</code>** | Renders output into a different DOM node than the logical parent |
| **Renderer** | Any package that applies React output to a specific target |

---
**Conclusion:** the role of <code>react-dom</code> is narrow and specific — it is the renderer that connects React platform-agnostic component model to an actual browser DOM, split into client rendering, server rendering, and DOM-specific utilities like portals. The React 19 removal of <code>render</code>, <code>hydrate</code>, and <code>findDOMNode</code>, and the fact that portal events follow the React tree rather than the DOM tree, are exactly the checkable details that separate a memorised answer from a verified one.`,
    examples: [
      {
        label: "createPortal — a modal that escapes its parent DOM node",
        runnable: true,
        code: `import { useState } from "react";
import { createPortal } from "react-dom";

// The portal target. In a real app this is a <div id="modal-root"> that lives
// in index.html as a sibling of the app root.
function useModalHost() {
  const host = document.getElementById("modal-root") ?? (() => {
    const el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
    return el;
  })();
  return host;
}

function Modal({ onClose }) {
  const host = useModalHost();
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)" }}>
      <div style={{ background: "#fff", margin: "20vh auto", padding: 24, width: 280, borderRadius: 8 }}>
        <p style={{ marginTop: 0 }}>I render into #modal-root, not into my parent.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    host,
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    // This handler still fires for clicks inside the portal: events bubble
    // through the REACT tree, not the DOM tree.
    <div onClick={() => setClicks((c) => c + 1)} style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Clicks seen by the logical parent: <strong>{clicks}</strong></p>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)} />}
      <p style={{ color: "#666", fontSize: 13 }}>
        Open the modal and click Close — the parent counter still increments,
        even though the modal DOM lives outside this div.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle side effects in functional components?",
    seoDescription:
      "Side effects belong in useEffect so render stays pure. Verified: cleanup runs before the next effect and on unmount, and effects never run during SSR.",
    description: `**Question presented to candidate:**
"Your component needs to fetch data, subscribe to a websocket, and start a timer. Where does that code go, and why can it not just live in the component body?"

**What a strong answer should cover:**
- What counts as a side effect: anything reaching outside the component's own render output — network, subscriptions, timers, manual DOM work, logging.
- Render must stay **pure**; effects are deliberately pushed out of it.
- \`useEffect\` runs after render *and* after the browser paints; the dependency array controls re-runs.
- The **cleanup function** runs before the next effect run and again on unmount — never after.
- The cancellation-flag pattern for data fetching, and why it prevents a stale response overwriting fresh state.
- \`useLayoutEffect\` as the narrow synchronous exception, not a default.
- Effects do **not** run during server-side rendering.
- Modern framing: effects are for *synchronising with external systems*, not for deriving state.

**Clarifying questions expected:**
- "Is this app server-rendered?" — it changes whether an effect can be relied on for first paint.
- "Are we on React 19? Can I use \`use()\` and Suspense instead of a fetch effect?"

**Code / implementation expected:** Yes — a \`useEffect\` with a dependency array and a cleanup function. The data-fetching variant with a cancellation flag is the strongest version.`,
    answer: `**Target Audience:** Frontend engineers preparing for React interviews — assumes basic familiarity with Hooks.
**Difficulty:** Medium

> **How to read this doc:** Every concept is explained in plain language first, then tagged with <code>📌 Interview term:</code> — the exact vocabulary an interviewer expects. Every ordering and lifecycle claim below was produced by actually running React 19.2.8 in a real DOM (jsdom) in this repo, not described from documentation.

## 1. Why This Even Matters — A Story First

A pure function is a chef who cooks only with the ingredients handed to them and hands back only a finished dish. A side effect is the chef stepping outside the kitchen: calling the delivery service, updating the sign out front, listening for the doorbell. Necessary work — but fundamentally different from cooking, and if it happens *during* cooking rather than at a deliberate moment, things get chaotic fast.

React wants a component render to stay pure: same props and state in, same output out, no reaching outside itself. Side effects are handled deliberately, outside render, precisely so render stays predictable.

## 2. The Core Idea

📌 **Interview term: Side effect** — any interaction with something outside a component own render output: network requests, subscriptions, manual DOM manipulation, timers, logging.

📌 **Interview term: <code>useEffect</code>** — the primary hook for running a side effect after a component renders and the browser has painted. It can return a **cleanup function**, which runs before the effect runs again and when the component unmounts.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 180" role="img" aria-label="Timeline showing cleanup running before the next effect and again on unmount">
  <defs>
    <marker id="fx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One effect, three moments in its life</text>
  <rect class="d-box-accent" x="24" y="48" width="180" height="82" rx="10"/>
  <text class="d-text d-accent" x="114" y="72" text-anchor="middle">mount</text>
  <text class="d-sub" x="114" y="94" text-anchor="middle">effect runs</text>
  <text class="d-sub" x="114" y="114" text-anchor="middle">count = 0</text>
  <path class="d-edge" d="M 210 89 L 234 89" marker-end="url(#fx-arrow)"/>
  <rect class="d-box" x="240" y="48" width="180" height="82" rx="10"/>
  <text class="d-text" x="330" y="72" text-anchor="middle">dependency changed</text>
  <text class="d-sub" x="330" y="94" text-anchor="middle">cleanup for 0, then</text>
  <text class="d-sub" x="330" y="114" text-anchor="middle">effect runs, count = 1</text>
  <path class="d-edge" d="M 426 89 L 450 89" marker-end="url(#fx-arrow)"/>
  <rect class="d-box-muted" x="456" y="48" width="180" height="82" rx="10"/>
  <text class="d-text" x="546" y="72" text-anchor="middle">unmount</text>
  <text class="d-sub" x="546" y="94" text-anchor="middle">cleanup for 1</text>
  <text class="d-sub" x="546" y="114" text-anchor="middle">nothing left running</text>
</svg>

The cleanup from the *previous* run always fires before the *next* run — never after. That single ordering rule is what makes the cancellation-flag pattern in section 5 work.

## 3. Verified: what actually happens, in what order

### <code>useEffect</code> does not run during server-side rendering

\`\`\`jsx
function Widget() {
  useEffect(() => { console.log("EFFECT RAN"); }, []);
  return <div>hello</div>;
}
console.log(renderToStaticMarkup(<Widget />));
\`\`\`

Actual output:

\`\`\`
<div>hello</div>
\`\`\`

<code>EFFECT RAN</code> never printed. Server rendering produces markup only — there is no browser paint to run an effect after, so <code>useEffect</code> never fires during it. This is a genuinely common point of confusion and worth stating precisely rather than guessing at.

### Cleanup runs *before* the next effect, and again on unmount

\`\`\`jsx
function Timer({ count }) {
  useEffect(() => {
    console.log(\\\`effect running, count=\\\${count}\\\`);
    return () => console.log(\\\`cleanup running, count was \\\${count}\\\`);
  }, [count]);
  return null;
}
\`\`\`

Mounted with <code>count=0</code>, updated to <code>count=1</code>, then unmounted. Actual output, in this exact order:

\`\`\`
--- mount with count=0 ---
effect running, count=0
--- update to count=1 ---
cleanup running, count was 0
effect running, count=1
--- unmount ---
cleanup running, count was 1
\`\`\`

Notice the cleanup closes over the value it was *created* with — <code>count was 0</code> — not whatever the value happens to be later.

### <code>useLayoutEffect</code> fires before <code>useEffect</code>

\`\`\`jsx
function Widget() {
  console.log("rendering");
  useEffect(() => console.log("useEffect fired"), []);
  useLayoutEffect(() => console.log("useLayoutEffect fired"), []);
  return null;
}
\`\`\`

Actual output — note the order does **not** follow the order the hooks are written in:

\`\`\`
rendering
useLayoutEffect fired
useEffect fired
\`\`\`

📌 **Interview term:** <code>useLayoutEffect</code> runs synchronously right after the DOM is updated but *before* the browser paints — useful for reading or adjusting layout without a visible flicker. <code>useEffect</code> runs after paint, asynchronously, which is why it is the default for anything that does not need to block visible rendering.

## 4. The dependency array

| Deps | Effect runs |
| :--- | :--- |
| <code>[]</code> | Once on mount; cleanup on unmount |
| <code>[a, b]</code> | On mount, then whenever <code>a</code> or <code>b</code> change |
| omitted | After **every** render |

## 5. The standard pattern: data fetching with cleanup

\`\`\`jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchUser(userId).then((data) => {
      if (!cancelled) setUser(data); // guard against a stale response
    });

    return () => {
      cancelled = true; // runs if userId changes or the component unmounts
    };
  }, [userId]);

  return user ? <div>{user.name}</div> : <div>Loading...</div>;
}
\`\`\`

The <code>cancelled</code> flag matters *specifically* because of the ordering verified in section 3: if <code>userId</code> changes while a fetch is in flight, cleanup runs **before** the new effect starts, flipping <code>cancelled</code> to <code>true</code> so the old response is ignored instead of overwriting newer state with stale data.

## 6. React 19: <code>use()</code> replaces many fetch effects

For the specific case of reading a promise, React 19 <code>use()</code> lets a component suspend on it directly instead of hand-rolling <code>useState</code> plus <code>useEffect</code> plus a cancellation flag:

\`\`\`jsx
function UserProfile({ userPromise }) {
  const user = use(userPromise); // suspends until resolved; no manual cleanup
  return <div>{user.name}</div>;
}
\`\`\`

**Plain-language takeaway:** this does not replace <code>useEffect</code> for every side effect — subscriptions, timers, and DOM manipulation still belong there. But for "fetch something and render it", <code>use()</code> with Suspense removes an entire category of manual cleanup bugs.

## 7. Common Pitfalls

- **Missing dependencies.** Leaving a value out of the array means the effect keeps using a stale version of it. The effect only re-runs when a *listed* dependency changes.
- **Forgetting cleanup for subscriptions and timers.** Every re-run and every unmount then leaks the previous subscription or interval.
- **Using an effect to derive state.** If a value can be computed from existing props or state during render, it does not need an effect at all — this is the single most over-used pattern in React code.
- **Reaching for <code>useLayoutEffect</code> by default.** It blocks paint. Use it only to read or adjust layout before the user sees anything.
- **Assuming effects run during SSR.** Verified above: they do not. Server-rendered markup can never contain data an effect would have fetched, which is exactly why a loading state is needed.
- **Putting an object or array literal in the dependency array.** A fresh reference every render means the effect re-runs every render.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Open with the core distinction:</strong> <span style="color:#f0e2c8;">"Render stays pure — side effects like fetching, subscribing, or touching the DOM go into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> so they run after render instead of during it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the cleanup timing precisely:</strong> <span style="color:#f0e2c8;">the returned cleanup runs before the next effect run and again on unmount — never after. Say "never after"; it shows you know the ordering, not just that cleanup exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bring up the SSR gotcha unprompted:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> never runs during server rendering — only after the component mounts in a browser." Most candidates do not know this cold.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLayoutEffect</code> as the exception,</strong> <span style="color:#f0e2c8;">not the default — synchronous, before paint, for measuring or adjusting layout without a flicker.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. If asked for code,</strong> <span style="color:#f0e2c8;">write the fetch with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cancelled</code> flag. It proves you understand cleanup ordering well enough to prevent a real stale-response bug.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> run during server-side rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Server rendering produces markup only — there is no paint for the effect to run after. It fires once the component mounts in a real browser, which is also why a data-fetching effect always needs a loading state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does cleanup matter for a data-fetching effect specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If a dependency such as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">userId</code> changes mid-flight, cleanup runs before the new effect. A flag set there lets the stale response be ignored — without it, a slow old request finishing after a newer one silently overwrites fresh state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useLayoutEffect</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you must measure or adjust the DOM before paint — positioning a tooltip from a measured rect, for instance, where doing it after paint would flicker. It is the exception precisely because it blocks painting until it finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should you <em style="color:#ffe0b2;">not</em> use an effect at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the value can be derived during render from existing props or state, or when the work belongs in an event handler. Effects are for synchronising with external systems — not for transforming data, and not for responding to a user action you already have a handler for.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does React 19 <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">use()</code> change this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For reading a promise, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> with Suspense removes the manual state-plus-effect-plus-cancellation pattern entirely. It does not replace effects for subscriptions, timers, or direct DOM work.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Side effect** | Any interaction with something outside a component own render output |
| **Cleanup function** | The function an effect returns; runs before its next run and on unmount |
| **<code>useEffect</code>** | Runs a side effect after render and after browser paint |
| **<code>useLayoutEffect</code>** | Runs a side effect synchronously before browser paint |
| **Dependency array** | The list of reactive values that decide when an effect re-runs |
| **Stale response** | Data from an outdated request arriving after a newer one |

---
**Conclusion:** side effects are handled by deliberately pushing anything that reaches outside a component — fetching, subscribing, touching the DOM — into <code>useEffect</code>, so render itself stays pure and predictable. The details that separate a strong answer are precise, not vague: cleanup runs before the next effect and on unmount, never after; effects never fire during server rendering at all; and <code>useLayoutEffect</code> is a narrow synchronous exception rather than an alternative.`,
    examples: [
      {
        label: "Effect with cleanup, plus the cancellation-flag fetch pattern",
        runnable: true,
        code: `import { useState, useEffect } from "react";

// Stands in for a real API. Deliberately slow for low ids so you can watch a
// stale response get discarded instead of overwriting a newer one.
function fetchUser(id) {
  const delay = id === 1 ? 1500 : 300;
  return new Promise((resolve) =>
    setTimeout(() => resolve({ id, name: \`User #\${id}\` }), delay),
  );
}

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setUser(null);

    fetchUser(userId).then((data) => {
      if (!cancelled) setUser(data); // guard against a stale response
    });

    // Runs when userId changes OR when this component unmounts — always
    // BEFORE the next effect run, which is what makes the guard work.
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <p>{user ? user.name : "Loading..."}</p>;
}

export default function App() {
  const [id, setId] = useState(1);
  const [width, setWidth] = useState(window.innerWidth);

  // A subscription effect: subscribe once, clean up on unmount.
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <UserProfile userId={id} />
      <button onClick={() => setId(1)}>Load slow user (1)</button>{" "}
      <button onClick={() => setId(2)}>Load fast user (2)</button>
      <p style={{ color: "#666", fontSize: 13 }}>
        Click 1 then immediately 2. Without the cancelled flag, the slow
        response for user 1 would land last and clobber user 2.
      </p>
      <p>Window width: <strong>{width}px</strong> — resize to see the subscription work.</p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between `useState` and `useReducer`?",
    seoDescription:
      "useState suits simple independent values; useReducer centralises complex transitions in a pure, testable reducer. Both dispatchers keep a stable identity.",
    description: `**Question presented to candidate:**
"You have a component whose state is getting messy — half a dozen \`useState\` calls that keep having to change together. When would you reach for \`useReducer\` instead, and what does that actually buy you?"

**What a strong answer should cover:**
- Both add local state to a function component; they are equivalent in power.
- \`useState\` fits simple, independent values updated directly.
- \`useReducer\` centralises transitions in a pure reducer \`(state, action) => newState\`; components \`dispatch\` intent rather than computing the next state.
- The real payoff: the reducer is a **pure function testable with no React at all**, and branchy transitions live in one place.
- \`dispatch\` has a **stable identity** across renders, so it can be passed down without breaking \`React.memo\` — the same is true of the \`useState\` setter.
- Multiple dispatches in one handler are **batched into a single re-render**.
- Signal of depth: \`useState\` is implemented on the same underlying machinery as \`useReducer\`.

**Clarifying questions expected:**
- "Do these state fields have to change together, or are they genuinely independent?"
- "Is this state local, or does it need to be shared — in which case is a reducer plus context the right shape?"

**Code / implementation expected:** Yes — a small reducer with two or three action types, and the \`dispatch\` call site.`,
    answer: `**Target Audience:** Frontend engineers preparing for React interviews — assumes familiarity with <code>useState</code>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code> — the exact vocabulary an interviewer expects. Every behavioural claim below was produced by actually running React 19.2.8 in this repo, including the render counts.

## 1. Why This Even Matters — A Story First

Imagine a shop with two ways to change the till. In the first, anyone can reach in and set the number to whatever they like. It works fine while there is one number and one person. In the second, nobody touches the till directly — you write down what you *want* ("sale of 3 pounds", "refund", "cash up") and hand the slip to one clerk who applies every change by the same rules.

The first is <code>useState</code>. The second is <code>useReducer</code>. The second feels like more ceremony until three people are reaching into the till at once — then having one clerk with one rulebook is the only thing keeping the numbers straight.

## 2. The Core Idea

📌 **Interview term:** <code>useState</code> stores a value and gives you a setter that replaces it. <code>useReducer</code> stores a value and gives you a <code>dispatch</code> function; you send it an **action**, and a **reducer** — a pure function <code>(state, action) =&gt; nextState</code> — computes the next state.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 200" role="img" aria-label="Direct setter compared with dispatching an action into a reducer">
  <text class="d-text" x="310" y="24" text-anchor="middle">Set the value directly, or dispatch intent into a reducer</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="132" rx="10"/>
  <text class="d-text d-accent" x="159" y="72" text-anchor="middle">useState</text>
  <text class="d-sub" x="159" y="100" text-anchor="middle">setCount(c =&gt; c + 1)</text>
  <text class="d-sub" x="159" y="124" text-anchor="middle">the component computes</text>
  <text class="d-sub" x="159" y="148" text-anchor="middle">the next value itself</text>
  <rect class="d-box" x="326" y="46" width="270" height="132" rx="10"/>
  <text class="d-text" x="461" y="72" text-anchor="middle">useReducer</text>
  <text class="d-sub" x="461" y="100" text-anchor="middle">dispatch({ type: inc })</text>
  <text class="d-sub" x="461" y="124" text-anchor="middle">reducer(state, action)</text>
  <text class="d-sub" x="461" y="148" text-anchor="middle">decides the next state</text>
</svg>

The component on the right never computes state. It announces *what happened*; a single pure function decides *what that means*.

## 3. Verified: the reducer is a pure function you can test with no React at all

This is the argument that actually wins the question. The reducer was called directly, outside any component:

\`\`\`
reducer({count:0}, {type:"inc"})   -> {"count":1}
reducer({count:5}, {type:"reset"}) -> {"count":0}
reducer({count:0}, {type:"bogus"}) throws -> unknown action: bogus
\`\`\`

📌 **Interview term:** because the reducer is **pure** — no React, no hooks, no DOM — every state transition in the component becomes a plain unit test. That is not available with a scatter of <code>useState</code> setters, whose logic only exists inside the component.

## 4. Verified: both <code>dispatch</code> and the <code>useState</code> setter are referentially stable

A component holding both was rendered three times, collecting the function identity on each render:

\`\`\`
renders: 3 | text: 2/2
setState identity stable across all renders?  true
dispatch identity stable across all renders?  true
\`\`\`

📌 **Interview term: referential stability** — React guarantees the setter and <code>dispatch</code> are the *same function object* on every render. That is why you can pass <code>dispatch</code> to a <code>React.memo</code> child without breaking memoisation, and why neither needs to go in a <code>useCallback</code> or a dependency array.

This is the practical reason a reducer scales better in a deep tree: you pass **one** stable <code>dispatch</code> down instead of five separate setters.

## 5. Verified: several dispatches in one handler cause one re-render

One click handler that fired <code>setA</code> once and <code>dispatch</code> twice:

\`\`\`
renders caused by 3 updates in one handler: 1 | result: 1/2
\`\`\`

Three updates, one render, and both pieces of state landed correctly. 📌 **Interview term: automatic batching** — since React 18 this applies everywhere, including in promises, timeouts, and native event handlers, not just React event handlers.

## 6. When to use which

| | <code>useState</code> | <code>useReducer</code> |
| :--- | :--- | :--- |
| State shape | One or a few independent values | Several fields that change together |
| Update logic | Inline in the component | Centralised in one pure function |
| Next state from previous | Functional updater <code>setN(n =&gt; n + 1)</code> | Natural — it is the reducer signature |
| Testability | Only through the component | Reducer is a plain unit test |
| Passing down a tree | One setter per value | One stable <code>dispatch</code> |
| Cost | Nothing | Indirection that only pays off past a threshold |

**Plain-language takeaway:** they are equivalent in power, so the question is never "which is more capable" — it is whether the extra structure earns its keep. Reach for the reducer when several values must change together, or when the transitions get branchy.

## 7. Common Pitfalls

- **Mutating state inside the reducer.** A reducer must return a *new* object. Mutating and returning the same reference means React sees no change and skips the re-render.
- **Putting side effects in the reducer.** Fetches, logging, and timers make it impure and destroy the testability that was the whole point.
- **Reaching for a reducer too early.** Two unrelated booleans do not need an action type each; that is ceremony without payoff.
- **Wrapping <code>dispatch</code> in <code>useCallback</code>.** Verified above: it is already stable. So is the <code>useState</code> setter.
- **Forgetting the functional updater with <code>useState</code>.** <code>setN(n + 1)</code> twice in one handler increments once, because both calls close over the same <code>n</code>. <code>setN(n =&gt; n + 1)</code> is correct.
- **A <code>default</code> branch that silently returns <code>state</code>.** Throwing on an unknown action, as verified in section 3, turns a typo into an immediate error instead of a mystery no-op.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the shape of the state,</strong> <span style="color:#f0e2c8;">not the API: "<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> for simple independent values; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer</code> once several fields have to change together or the transitions get branchy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real payoff — testability:</strong> <span style="color:#f0e2c8;">"The reducer is a pure function, so every transition is a plain unit test with no React involved at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention referential stability:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code> is stable across renders, so I pass one function down instead of five setters and it does not break <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.memo</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say they are equivalent in power:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> is built on the same machinery, so this is a readability and structure decision, not a capability one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. If asked for code,</strong> <span style="color:#f0e2c8;">write the reducer with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw</code> in the default branch and say why — it turns a typo in an action type into an immediate error rather than a silent no-op.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need to wrap <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dispatch</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code> before passing it down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — React guarantees it is the same function object on every render, so it is already safe for a memoised child and never needs to appear in a dependency array. The <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> setter has the same guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dispatch</code> three times in one handler, how many renders?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One. React batches them into a single re-render, and since React 18 that batching applies everywhere — inside promises, timeouts, and native handlers too, not only React event handlers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a reducer be async, or do a fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It must stay pure and synchronous — React may call it more than once for the same update. Do the async work in an event handler or an effect, then dispatch the result as an action.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useReducer</code> plus context a replacement for Redux?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For small and medium apps, often yes. What it does not give you is selector-based subscriptions, so every consumer re-renders when the context value changes — plus middleware, devtools, and a single store. Split the state and dispatch into two contexts to soften the re-render cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks if the reducer mutates and returns the same object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React compares the returned value to the previous one by reference. Same reference means no change, so it bails out and the UI never updates — the classic "my state changed but nothing re-rendered" bug.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reducer** | A pure function <code>(state, action) =&gt; nextState</code> |
| **Action** | A plain object describing what happened, usually with a <code>type</code> |
| **<code>dispatch</code>** | The function that sends an action to the reducer |
| **Referential stability** | Being the same function object across renders |
| **Automatic batching** | Grouping several updates into one re-render |
| **Functional updater** | <code>setN(n =&gt; n + 1)</code> — computes from the latest state |

---
**Conclusion:** <code>useState</code> and <code>useReducer</code> are equally capable, so choosing between them is a structure decision. Move to a reducer when several fields change together or transitions branch — the payoff is that every transition becomes a pure function you can unit-test without React, and that one stable <code>dispatch</code> replaces a handful of setters passed down the tree.`,
    examples: [
      {
        label: "A reducer with a throwing default branch, plus batched dispatches",
        runnable: true,
        code: `import { useReducer, useState, memo } from "react";

// Pure — no React, no side effects. This function alone is unit-testable:
//   expect(reducer({ count: 0 }, { type: "inc" })).toEqual({ count: 1 })
function reducer(state, action) {
  switch (action.type) {
    case "inc":   return { count: state.count + 1 };
    case "dec":   return { count: state.count - 1 };
    case "reset": return { count: 0 };
    // Throwing turns a typo in an action type into an immediate, obvious
    // error instead of a silent no-op.
    default: throw new Error("unknown action: " + action.type);
  }
}

// dispatch is referentially stable, so this memoised child never re-renders
// just because the parent did.
const Controls = memo(function Controls({ dispatch }) {
  console.log("Controls rendered");
  return (
    <p>
      <button onClick={() => dispatch({ type: "dec" })}>-</button>{" "}
      <button onClick={() => dispatch({ type: "inc" })}>+</button>{" "}
      <button onClick={() => dispatch({ type: "reset" })}>reset</button>{" "}
      {/* three dispatches, one re-render */}
      <button onClick={() => { dispatch({ type: "inc" }); dispatch({ type: "inc" }); dispatch({ type: "inc" }); }}>
        +3 (batched)
      </button>
    </p>
  );
});

export default function App() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  const [unrelated, setUnrelated] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h3>Count: {state.count}</h3>
      <Controls dispatch={dispatch} />
      <button onClick={() => setUnrelated((n) => n + 1)}>
        Re-render parent ({unrelated})
      </button>
      <p style={{ color: "#666", fontSize: 13 }}>
        Watch the console: clicking the parent button re-renders App, but
        Controls does not re-render — dispatch keeps the same identity.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: 'What is "tearing" in concurrent React?',
    seoDescription:
      "Tearing is one screen showing two different values of the same external store, caused by interruptible rendering. useSyncExternalStore is the fix.",
    description: `**Question presented to candidate:**
"We migrated to React 18 and turned on transitions. Now, occasionally, two parts of the same screen show different values for the same piece of global state. What is happening, and how do you fix it?"

**What a strong answer should cover:**
- **Tearing**: a single committed screen displaying two different values of the same source of truth.
- Why React 18 made it possible: concurrent rendering can **interrupt and resume** a render, so a mutable external value can change *mid-render*.
- Why React's own state is immune — it is snapshotted per render — while an external store read directly in render is not.
- \`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)\` as the official fix, and that it deliberately forces a **synchronous, non-interruptible** re-render.
- \`getSnapshot\` must return a **cached** value; returning a fresh object each call is an infinite loop.
- \`getServerSnapshot\` exists for SSR, where there is no store to subscribe to.
- That modern libraries (Redux, Zustand, Jotai) already call this internally — you rarely write it by hand.

**Clarifying questions expected:**
- "Is the state in a React store or an external one — a module variable, a Redux store, a browser API?"
- "Are we using transitions or Suspense anywhere near this subtree?"

**Code / implementation expected:** Yes — a \`useSyncExternalStore\` call with a correct, cached \`getSnapshot\`.`,
    answer: `**Target Audience:** Frontend engineers preparing for senior React interviews — assumes familiarity with hooks and React 18 concurrency.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The store-lifecycle and failure-mode outputs below were produced by running React 19.2.8 in this repo. Where something could **not** be reproduced in a unit environment, this doc says so explicitly rather than implying it was confirmed — see the note in section 4.

## 1. Why This Even Matters — A Story First

Picture a departures board at a station, made of two panels wired to the same computer. The board is being repainted top to bottom. Halfway through the repaint, the 10:15 train gets cancelled. The top panel was painted before the change and still says *On time*; the bottom panel was painted after and says *Cancelled*.

Nothing is broken in the computer. The data was correct at every instant. The problem is that one screen was assembled from **two different moments in time**. That is tearing.

## 2. The Core Idea

📌 **Interview term: Tearing** — a single committed UI showing two different values of the same underlying source of truth, because rendering was interrupted and resumed while that value changed underneath.

📌 **Interview term: Concurrent rendering** — since React 18, React can start rendering, pause to handle something more urgent, and resume later. Rendering is no longer one uninterruptible synchronous pass. That is what opens the window.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="One interrupted render reads a mutable store twice and gets two different values">
  <defs>
    <marker id="tr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One render pass, one store, two different answers</text>
  <rect class="d-box-accent" x="250" y="44" width="160" height="56" rx="10"/>
  <text class="d-text d-accent" x="330" y="68" text-anchor="middle">external store</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">mutated mid-render</text>
  <path class="d-edge" d="M 278 102 L 170 148" marker-end="url(#tr-arrow)"/>
  <path class="d-edge-dashed" d="M 382 102 L 490 148" marker-end="url(#tr-arrow)"/>
  <rect class="d-box" x="40" y="152" width="200" height="62" rx="10"/>
  <text class="d-text" x="140" y="177" text-anchor="middle">Panel A rendered first</text>
  <text class="d-sub" x="140" y="198" text-anchor="middle">reads 0</text>
  <rect class="d-box" x="420" y="152" width="200" height="62" rx="10"/>
  <text class="d-text" x="520" y="177" text-anchor="middle">Panel B rendered after</text>
  <text class="d-sub" x="520" y="198" text-anchor="middle">reads 1</text>
</svg>

Both panels commit together into one screen, so the user sees 0 and 1 side by side at the same instant.

## 3. Why React state is immune but an external store is not

React state is **snapshotted**. Within one render pass, <code>useState</code> hands every component the value belonging to that pass, so there is nothing to tear. An external store — a module variable, a Redux store, <code>window.matchMedia</code>, a websocket cache — is **mutable and lives outside React**. Read it directly during render and you get whatever it happens to hold *at the moment that component renders*.

### Verified: a store read directly in render is not subscribed at all

Before worrying about concurrency, note the simpler failure of the same pattern. A component that reads a module variable during render was mounted, the variable was changed, and nothing happened:

\`\`\`
initial: 0
after mutating the external value to 99, without a re-render: 0
only after an unrelated re-render does it catch up: 99
\`\`\`

📌 **Interview term:** this is the *staleness* half of the problem — React has no idea the value changed, so it never schedules a render. Tearing is the *consistency* half: even when React does render, an interruptible pass can read the value at two different times. <code>useSyncExternalStore</code> exists to solve both at once.

## 4. A precise note on what was and was not reproduced

The staleness behaviour above, and the store lifecycle and failure mode below, were all produced by running real code. **Genuine tearing was not reproduced here**, and that is worth being straight about: it requires the scheduler to actually interrupt a render pass mid-tree and yield to the browser, which does not occur reliably in a synchronous unit-test environment. The mechanism is well documented by the React team as the motivation for <code>useSyncExternalStore</code>, and the diagram above describes it — but treat the interruption itself as reasoned from the design, not as something demonstrated on this page.

Being able to draw that line in an interview is itself a strong signal. Claiming to have seen tearing in a jsdom test would be a claim the environment cannot support.

## 5. The fix: <code>useSyncExternalStore</code>

📌 **Interview term:** <code>useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)</code> is the official API for reading an external mutable store. React calls <code>getSnapshot</code> and, critically, **re-checks it before committing**. If the value moved mid-render, React throws the work away and re-renders synchronously so the whole tree agrees.

The trade is deliberate: an update coming from an external store is **not** interruptible. You give up concurrency for that update in exchange for a screen that cannot tear.

### Verified: the subscribe and snapshot lifecycle

A store was mounted, updated, and unmounted:

\`\`\`
after mount, text = 0
after store.set(42), text = 42
call sequence: ["getSnapshot","subscribe","getSnapshot","unsubscribe"]
\`\`\`

React reads a snapshot, subscribes, re-reads on notification, and unsubscribes on unmount — no manual effect wiring, and no window where a change can be missed between the first read and the subscription.

### Verified: <code>getSnapshot</code> must return a cached value

The single most common way to get this wrong is returning a fresh object each call. A store whose <code>getSnapshot</code> was <code>() =&gt; ({ v: 1 })</code> produced:

\`\`\`
console.error -> The result of getSnapshot should be cached to avoid an infinite loop
throw -> Maximum update depth exceeded. This can happen when a component repeatedly calls setState...
\`\`\`

📌 **Interview term:** React compares snapshots with <code>Object.is</code>. A new object every call is never equal to the last one, so React re-renders, re-reads, sees another new object, and loops until it bails out. <code>getSnapshot</code> must return a **stable, cached reference** that only changes when the data actually changes — which is exactly why real stores cache the snapshot object and replace it only on write.

## 6. Comparison

| Approach | Sees updates | Can tear | Notes |
| :--- | :--- | :--- | :--- |
| Read a module variable in render | No | Yes | Verified stale above — React never re-renders |
| <code>useState</code> + an effect that subscribes | Yes | Yes | Can miss updates between first render and subscription |
| <code>useSyncExternalStore</code> | Yes | No | Forces a synchronous, consistent commit |
| React state / context | Yes | No | Snapshotted per render; never had the problem |

## 7. Common Pitfalls

- **Returning a new object from <code>getSnapshot</code>.** Verified above: infinite loop. Cache the snapshot and replace it only on an actual write.
- **Deriving or filtering inside <code>getSnapshot</code>.** <code>items.filter(...)</code> allocates a fresh array every call — the same infinite loop. Select outside, or memoise with <code>useSyncExternalStoreWithSelector</code>.
- **An unstable <code>subscribe</code> function.** If it is redefined every render, React resubscribes every render. Define it outside the component or wrap it in <code>useCallback</code>.
- **Omitting <code>getServerSnapshot</code> in an SSR app.** There is no store to subscribe to on the server, so React throws without it.
- **Reaching for it in application code.** Redux, Zustand, and Jotai already call it internally. You need it when you are writing the store integration yourself, not when consuming one.
- **Expecting it to make things faster.** It deliberately opts that update out of concurrent rendering. It buys correctness, not performance.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it in one sentence:</strong> <span style="color:#f0e2c8;">"Tearing is one screen showing two different values of the same source of truth, because the render that produced it was interrupted while that value changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say why React 18 made it possible:</strong> <span style="color:#f0e2c8;">concurrent rendering can pause and resume a render pass, so a mutable value read at the top of the tree may differ from the same value read at the bottom.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Draw the boundary:</strong> <span style="color:#f0e2c8;">"React state is snapshotted per render, so it cannot tear. Only **external** mutable stores can — a module variable, Redux, a browser API."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the fix and its cost:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSyncExternalStore</code> — React re-checks the snapshot before committing and forces a synchronous re-render if it moved. That update is deliberately no longer interruptible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the detail that proves you have used it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getSnapshot</code> has to return a cached reference — return a fresh object and React loops until it throws Maximum update depth exceeded."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can React state never tear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is snapshotted per render pass. Every component in one pass sees the value belonging to that pass, even if an update lands mid-render — that update simply produces a later pass. An external store has no such per-pass snapshot; it is just a mutable value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getSnapshot</code> have to return a cached value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React compares snapshots with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> to decide whether anything changed. A new object each call is never equal to the previous one, so React re-renders, re-reads, and loops — it warns "The result of getSnapshot should be cached" and then throws a max-update-depth error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the third argument for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">getServerSnapshot</code> — on the server there is nothing to subscribe to, so React needs a value it can render into HTML. It is also what the client uses during hydration, so returning something different from the server value causes a hydration mismatch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you write this hook yourself in application code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely. Redux, Zustand, and Jotai call it internally — that is how they became concurrent-safe. You reach for it directly when integrating something React does not know about: a browser API like <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">matchMedia</code> or <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.onLine</code>, or your own store.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does it cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Updates from that store become synchronous and non-interruptible, so they cannot be deprioritised by a transition. That is the deliberate trade: consistency instead of concurrency for that particular update.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Tearing** | One screen showing two values of the same source of truth |
| **Concurrent rendering** | Rendering that React can pause, abandon, and resume |
| **External store** | Mutable state living outside React |
| **Snapshot** | The value of a store at one instant, compared with <code>Object.is</code> |
| **<code>useSyncExternalStore</code>** | The hook that reads an external store consistently |
| **<code>getServerSnapshot</code>** | The value used during SSR and hydration |

---
**Conclusion:** tearing is a consistency bug that only became possible once rendering became interruptible: a mutable external value read at two points in one render pass can produce one screen assembled from two moments in time. React's own state is snapshotted and immune; external stores are not, which is exactly what <code>useSyncExternalStore</code> exists for — it re-checks the snapshot before committing and accepts a synchronous, non-interruptible update as the price of a screen that cannot disagree with itself.`,
    examples: [
      {
        label: "useSyncExternalStore with a correctly cached snapshot",
        runnable: true,
        code: `import { useSyncExternalStore, startTransition, useState } from "react";

// A tiny external store — mutable state living entirely outside React.
function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    // The snapshot is the state object itself, replaced only on write. This is
    // what makes getSnapshot cacheable: same data means the SAME reference.
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      state = next;                 // new object -> Object.is sees a change
      listeners.forEach((l) => l());
    },
  };
}

const store = createStore({ count: 0 });

// WRONG, for contrast — a fresh object every call makes Object.is always false,
// so React re-renders forever:
//   const bad = () => ({ count: store.getSnapshot().count });

function Panel({ name }) {
  // The third argument is required for server rendering: on the server there is
  // nothing to subscribe to, so React needs a value it can render into HTML.
  // Omit it and server rendering throws "Missing getServerSnapshot".
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 6, padding: 12, minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{name}</div>
      <strong style={{ fontSize: 22 }}>{snap.count}</strong>
    </div>
  );
}

export default function App() {
  const [, force] = useState(0);
  const bump = () => store.set({ count: store.getSnapshot().count + 1 });

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <Panel name="Panel A" />
        <Panel name="Panel B" />
      </div>
      <p>
        <button onClick={bump}>Increment store</button>{" "}
        {/* Even inside a transition, this update commits synchronously and
            both panels always agree — that is the anti-tearing guarantee. */}
        <button onClick={() => startTransition(bump)}>Increment in a transition</button>{" "}
        <button onClick={() => force((n) => n + 1)}>Re-render parent</button>
      </p>
      <p style={{ color: "#666", fontSize: 13 }}>
        Both panels read the same store independently and can never disagree,
        because React re-checks the snapshot before it commits.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "React Compiler — how does auto-memoization work in React 19?",
    seoDescription:
      "React Compiler is a build-time tool that inserts memoization for you, caching values in a per-component array via the useMemoCache runtime hook.",
    description: `**Question presented to candidate:**
"React Compiler reached 1.0. What does it actually do to your code at build time, and does it mean you can delete every \`useMemo\`, \`useCallback\`, and \`React.memo\` in the codebase?"

**What a strong answer should cover:**
- It is a **build-time tool** (a Babel plugin), not a runtime feature — it rewrites your components during compilation.
- It performs **automatic memoization**: it infers what each component reads and produces, and caches values so they are only recomputed when their inputs change.
- The output leans on a runtime hook — exposed on React as \`__COMPILER_RUNTIME.c\`, conventionally \`useMemoCache\` — which allocates a fixed-size cache array per component instance.
- It relies on the **Rules of React**: components must be pure and props/state must not be mutated. Code that breaks those rules is skipped, not miscompiled.
- It is opt-in and incremental; you can adopt it directory by directory.
- Manual memoization is not forbidden and existing \`useMemo\` calls keep working — but they become largely redundant in compiled files.
- Version precision: React Compiler **1.0 shipped on 7 October 2025**, and it supports React 17 through 19.

**Clarifying questions expected:**
- "Is the codebase already Rules-of-React clean — does it pass the ESLint rules?"
- "Which build tool are we on? The integration differs for Next.js, Vite, and plain Babel."

**Code / implementation expected:** Optional. Being able to describe the before-and-after shape of a compiled component is worth more than writing one out.`,
    answer: `**Target Audience:** Frontend engineers preparing for senior React interviews — assumes familiarity with <code>useMemo</code> and <code>React.memo</code>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The runtime inspection below was produced by reading the installed React 19.2.8 in this repo. Release-date and version claims were checked against the React team announcement rather than recalled — see the citation in section 3.

## 1. Why This Even Matters — A Story First

Imagine a kitchen where the chef re-chops every vegetable from scratch each time an order comes in, even when the order is identical to the last one. The old fix was for the chef to keep sticky notes everywhere: *this carrot is already chopped, reuse it*. That is <code>useMemo</code> and <code>useCallback</code> — effective, but you have to write and maintain every note yourself, and a forgotten or wrong note is worse than none.

React Compiler is a prep cook who reads the recipes ahead of service and works out, on their own, exactly which items can be reused and which must be redone. The chef writes plain recipes; the notes get added automatically, and they are always consistent with what the recipe actually does.

## 2. The Core Idea

📌 **Interview term: React Compiler** — a **build-time** tool (a Babel plugin) that rewrites your components to add memoization automatically. It analyses what each component reads and produces, then caches the results so a value is only recomputed when something it actually depends on changes.

The important word is *build-time*. Nothing is analysed in the browser; by the time your code ships, the memoization is already baked in as ordinary JavaScript.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Plain component source is transformed at build time into a version that caches values in a memo cache">
  <defs>
    <marker id="rc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Memoization is added while you build, not while you run</text>
  <rect class="d-box" x="24" y="52" width="180" height="88" rx="10"/>
  <text class="d-text" x="114" y="80" text-anchor="middle">your component</text>
  <text class="d-sub" x="114" y="102" text-anchor="middle">plain, no useMemo</text>
  <text class="d-sub" x="114" y="124" text-anchor="middle">no useCallback</text>
  <path class="d-edge" d="M 210 96 L 234 96" marker-end="url(#rc-arrow)"/>
  <rect class="d-box-accent" x="240" y="52" width="180" height="88" rx="10"/>
  <text class="d-text d-accent" x="330" y="80" text-anchor="middle">React Compiler</text>
  <text class="d-sub" x="330" y="102" text-anchor="middle">Babel plugin, build step</text>
  <text class="d-sub" x="330" y="124" text-anchor="middle">checks Rules of React</text>
  <path class="d-edge" d="M 426 96 L 450 96" marker-end="url(#rc-arrow)"/>
  <rect class="d-box-muted" x="456" y="52" width="180" height="88" rx="10"/>
  <text class="d-text" x="546" y="80" text-anchor="middle">compiled output</text>
  <text class="d-sub" x="546" y="102" text-anchor="middle">cache slots per instance</text>
  <text class="d-sub" x="546" y="124" text-anchor="middle">recompute only on change</text>
</svg>

A component that breaks the Rules of React is left alone rather than compiled — the compiler bails out on that component and everything else still gets optimised.

## 3. Verified: version and release facts

React Compiler reached its first stable release, **version 1.0, on 7 October 2025**, described by the React team as production-ready and battle-tested on Meta applications. The 1.0 work included generating better memoization — supporting optional chains and array indices as dependencies — for fewer re-renders. It is maintained across React 17, 18, and 19.

Sources: [React Compiler v1.0 announcement](https://react.dev/blog/2025/10/07/react-compiler-1), [React Compiler docs](https://react.dev/learn/react-compiler).

## 4. Verified: the runtime hook the compiler emits into

Compiled output does not conjure caching from nowhere — it calls a runtime helper that React itself exposes. Inspecting the installed React 19.2.8:

\`\`\`js
const React = require("react");
console.log(typeof React.__COMPILER_RUNTIME);        // "object"
console.log(Object.keys(React.__COMPILER_RUNTIME));  // [ "c" ]
console.log(typeof React.__COMPILER_RUNTIME.c);      // "function"
console.log(React.__COMPILER_RUNTIME.c.length);      // 1
\`\`\`

Actual output:

\`\`\`
object
[ 'c' ]
function
1
\`\`\`

📌 **Interview term:** <code>c</code> — conventionally called <code>useMemoCache</code> — takes a single argument, the **number of cache slots** the compiled component needs, and returns a mutable array that persists across renders for that component instance. The compiler counts how many values a component memoises, requests exactly that many slots, and writes each cached value plus its dependency check into the array.

This is why the answer "it just adds <code>useMemo</code> everywhere" is not quite right and a good interviewer will probe it. The output is one cache array per component instance with positional slots, not a pile of individual hook calls.

### The shape of the transformation

\`\`\`jsx
// You write:
function Profile({ user, items }) {
  const sorted = items.slice().sort((a, b) => a.n - b.n);
  const onPick = (id) => select(user.id, id);
  return <List items={sorted} onPick={onPick} />;
}

// Conceptually, the compiler emits something like:
function Profile({ user, items }) {
  const $ = useMemoCache(4);            // fixed slot count for this component
  let sorted;
  if ($[0] !== items) {                 // dependency check, positional
    sorted = items.slice().sort((a, b) => a.n - b.n);
    $[0] = items; $[1] = sorted;
  } else { sorted = $[1]; }
  // ...same pattern for onPick and the returned element
}
\`\`\`

**Plain-language takeaway:** the compiler is doing mechanically, and exhaustively, what a careful developer does by hand with <code>useMemo</code> — but it never forgets a dependency and never keeps a stale one, because it derives them from the code itself.

## 5. What it does and does not free you from

| Concern | Handled by the compiler? |
| :--- | :--- |
| <code>useMemo</code> for expensive derived values | Yes, in compiled files |
| <code>useCallback</code> for stable handler identity | Yes |
| <code>React.memo</code> wrappers | Largely, since props keep stable identities |
| Effects with wrong dependency arrays | **No** — effects are still yours to get right |
| Fetching waterfalls, oversized bundles | **No** — a different class of problem entirely |
| Components that mutate props or state | **No** — those break the rules, so they are skipped |

## 6. Common Pitfalls

- **Assuming it is a runtime feature.** It is a build step. If your build does not run the plugin, nothing is optimised — and nothing breaks either.
- **Expecting it to fix rule-breaking code.** The compiler detects violations and *bails out* on that component. Silent non-optimisation, not a crash, which is why the ESLint rule matters — it is how you find out.
- **Ripping out every <code>useMemo</code> on day one.** Existing manual memoization keeps working. Remove it as a follow-up once the compiler is verifiably running, not as part of adopting it.
- **Treating it as a fix for slow rendering generally.** It removes re-render waste. It does nothing for a slow network request, a huge bundle, or an O(n²) algorithm.
- **Mutating props or state.** The most common bail-out cause. Compiler-friendly code and correct React code are the same thing.
- **Quoting the wrong milestone.** The beta was October 2024; **1.0 was 7 October 2025**. Version precision is exactly what an interviewer is listening for on a question like this.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with build-time:</strong> <span style="color:#f0e2c8;">"It is a Babel plugin that rewrites components at build time to add memoization automatically — there is no runtime analysis happening in the browser."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Describe the actual output:</strong> <span style="color:#f0e2c8;">"It allocates a fixed-size cache array per component instance via a runtime hook — React exposes it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__COMPILER_RUNTIME.c</code>, usually called <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemoCache</code> — and reads or writes positional slots with inline dependency checks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tie it to the Rules of React:</strong> <span style="color:#f0e2c8;">"It can only do this safely if components are pure and nothing mutates props or state. When a component breaks those rules the compiler bails out on it rather than miscompiling."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Answer the "can I delete my useMemo" question honestly:</strong> <span style="color:#f0e2c8;">"Eventually, in compiled files. Existing ones keep working, so it is a follow-up cleanup — and it never replaces getting effect dependencies right."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be precise about the version:</strong> <span style="color:#f0e2c8;">"1.0 shipped on 7 October 2025; the beta was a year earlier. It supports React 17 through 19." Getting the milestone right is the cheapest credibility on this question.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I delete every <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useMemo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In files the compiler actually processes, they become largely redundant — but they are not errors and keep working, so treat removal as a separate cleanup after you have confirmed the plugin is running. Note it does not touch effect dependency arrays; those still have to be correct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a component that breaks the Rules of React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler detects it and skips that component — it stays exactly as you wrote it while the rest of the file is still optimised. The failure mode is silently missing out on the optimisation, which is why the ESLint rule is the real adoption tool: it tells you which components are being skipped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it make the bundle bigger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slightly — the emitted cache checks are real code. The trade is a modest size increase against fewer re-renders and less recomputation at runtime, which is why it is worth measuring on your own app rather than assuming either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it all-or-nothing to adopt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is opt-in and can be scoped to specific directories, so the usual path is to enable it on one well-behaved area, verify with the profiler, then widen. Fixing the ESLint violations first is what makes the rollout uneventful.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it help with anything other than re-renders?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and saying so is a good sign. It removes wasted recomputation and re-rendering. Slow network requests, fetch waterfalls, oversized bundles, and bad algorithms are untouched — a compiled app with an N+1 fetch is still slow.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **React Compiler** | A build-time Babel plugin that adds memoization automatically |
| **Automatic memoization** | Caching derived values without hand-written <code>useMemo</code> |
| **<code>useMemoCache</code> / <code>c</code>** | The runtime hook giving a compiled component its cache slots |
| **Cache slot** | One position in that per-instance array holding a value and its dependency |
| **Bail-out** | Leaving a rule-breaking component uncompiled |
| **Rules of React** | Purity and no mutation of props or state — the compiler preconditions |

---
**Conclusion:** React Compiler moves memoization from something you hand-write and inevitably get wrong into something derived mechanically from your code at build time. It allocates a fixed cache per component instance through the <code>useMemoCache</code> runtime hook — visible on React 19.2.8 as <code>__COMPILER_RUNTIME.c</code> — and only where your components already obey the Rules of React, bailing out rather than miscompiling anywhere they do not. It reached 1.0 on 7 October 2025. It removes re-render waste; it does not make a slow request fast, and it does not excuse a wrong dependency array in an effect.`,
    examples: [
      {
        label: "Before and after: hand-written memoization the compiler would make redundant",
        runnable: true,
        code: `import { useState, useMemo, useCallback, memo } from "react";

const ITEMS = Array.from({ length: 8 }, (_, i) => ({ id: i, n: (i * 37) % 11 }));

// A memoised child so the identity of its props actually matters.
const List = memo(function List({ items, onPick }) {
  console.log("List rendered");
  return (
    <ul>
      {items.map((it) => (
        <li key={it.id}>
          <button onClick={() => onPick(it.id)}>item {it.id} (n={it.n})</button>
        </li>
      ))}
    </ul>
  );
});

// WITHOUT the compiler you must write the memoization yourself, and every
// dependency array is a chance to get it wrong.
function Manual({ items }) {
  const [picked, setPicked] = useState(null);
  const [tick, setTick] = useState(0);

  const sorted = useMemo(() => items.slice().sort((a, b) => a.n - b.n), [items]);
  const onPick = useCallback((id) => setPicked(id), []);

  return (
    <section>
      <h4>Hand-written useMemo / useCallback</h4>
      <button onClick={() => setTick((t) => t + 1)}>Re-render parent ({tick})</button>
      <p>picked: {String(picked)}</p>
      <List items={sorted} onPick={onPick} />
    </section>
  );
}

// WITH React Compiler enabled you would write exactly this, and the build step
// would insert the equivalent caching — conceptually:
//   const $ = useMemoCache(4);
//   if ($[0] !== items) { $[1] = items.slice().sort(...); $[0] = items; }
function Plain({ items }) {
  const [picked, setPicked] = useState(null);
  const [tick, setTick] = useState(0);

  const sorted = items.slice().sort((a, b) => a.n - b.n);
  const onPick = (id) => setPicked(id);

  return (
    <section>
      <h4>Plain — what you write with the compiler on</h4>
      <button onClick={() => setTick((t) => t + 1)}>Re-render parent ({tick})</button>
      <p>picked: {String(picked)}</p>
      <List items={sorted} onPick={onPick} />
    </section>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.5 }}>
      <Manual items={ITEMS} />
      <hr />
      <Plain items={ITEMS} />
      <p style={{ color: "#666", fontSize: 13 }}>
        Open the console. This playground has no compiler configured, so the
        Plain version re-renders List on every parent tick while the hand-memoised
        one does not. With the compiler enabled, both behave like the first.
      </p>
    </div>
  );
}`,
      },
    ],
  },

];

export default augments;
