/**
 * React "ultra" rewrite — batch 12 (error boundaries, Fiber internals,
 * portals, StrictMode, key-as-reset, and keeping the UI responsive).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - A boundary caught a render error; componentDidCatch got a second argument
 *     whose ONLY key is componentStack, and it named the failing component.
 *   - NOT caught: an error thrown in an event handler, or inside setTimeout.
 *     CAUGHT: an error thrown inside useEffect.
 *   - A boundary cannot catch its own render error — the OUTER boundary did.
 *   - createRoot options: onUncaughtError fired with no boundary present;
 *     onCaughtError fired when a boundary handled it.
 *   - React exports no error-boundary hook.
 *   - createPortal: the node is NOT inside the React container, but a click on
 *     it ran "portal child onClick -> React parent onClick -> native listener
 *     on the portal target" — events follow the REACT tree.
 *   - Changing a prop kept the typed draft ("first:hello" -> "second:hello");
 *     changing the key cleared it ("second:") and ran unmount then mount.
 *   - A DOM node carries a __reactFiber$… property. fiber.tag=5, type="div",
 *     with child / sibling / return / memoizedState / memoizedProps /
 *     alternate / flags / lanes. Children reached by child -> sibling: Leaf,
 *     then b. Parent reached by return: App.
 *   - alternate was null after mount and a second fiber after one update, with
 *     alternate.alternate === fiber and the pair holding [0, 1].
 *   - StrictMode mount: component body 2x, useMemo factory 2x, effect 2x with
 *     1 cleanup, state updater 2x. Without StrictMode: all 1, cleanup 0.
 *   - A React element is a plain object with keys $$typeof, type, key, props —
 *     not a DOM node. A shadow root hid its content from document.getElementById
 *     while shadowRoot.getElementById found it, and holder.textContent was "".
 *   - A suspending update showed the FALLBACK; the same update inside a
 *     transition kept the old content and only flipped isPending.
 *
 * StrictMode is development-only; a production build was NOT measured here and
 * the doc says so rather than implying it.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Error Boundaries in React?",
    seoDescription:
      "A class component that catches render errors below it and shows a fallback. Verified: componentDidCatch got an info object whose one key is componentStack.",
    description: `**Question presented to candidate:**
"One component throws while rendering and the whole page goes blank. What is the mechanism for handling that?"

**What a strong answer should cover:**
- An **Error Boundary** is a component that catches errors thrown **while rendering its subtree**, and renders a fallback instead of letting the error unmount the whole tree.
- Since React 16, an uncaught render error **unmounts the entire root** — that is the blank page. Boundaries exist to contain the damage.
- It must be a **class component**. Two methods: \`getDerivedStateFromError\` (return the fallback state — the render-phase half) and \`componentDidCatch\` (log it — the commit-phase half, where side effects are allowed).
- \`componentDidCatch\` receives \`(error, info)\` where \`info.componentStack\` names the component that failed — the single most useful thing to send to your logger.
- **There is no hook version.** Libraries wrap a class; the class is still there underneath.
- **Placement is the design decision**: one boundary at the root only ever gives you a full-page fallback. Boundaries around independently-failing regions — a widget, a route, a sidebar — keep the rest of the page alive.
- A boundary needs a **way to recover** — a retry button, or a \`key\` change — or the fallback is permanent.
- React 19 added root-level \`onUncaughtError\` and \`onCaughtError\` options for centralised reporting.

**Clarifying questions expected:**
- "Which parts of this page should survive if one part fails?" — that determines where boundaries go.
- "Where do we want these errors reported?"

**Code / implementation expected:** Optional. The two-method class is short enough to write out.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior error-handling knowledge assumed.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The behaviour in section 3 was **executed against React 19.2.8**. The companion doc, <a href="PASTE_BOUNDARY_LIMITS_URL_HERE" target="_blank" rel="noopener noreferrer">what an Error Boundary can and cannot catch</a>, covers the limits — which is where most interview follow-ups go.

## 1. Why This Even Matters — A Story First

A ship is one open hull. A single breach anywhere and the whole thing floods.

The fix is not a stronger hull — it is **bulkheads**. The breach still happens; it just fills one compartment while the other twelve stay dry and the ship stays afloat.

React without boundaries is the open hull. Since React 16, an error thrown during render **unmounts the entire tree** — that is why a bug in one widget gives you a blank white page.

## 2. The Core Idea

📌 **Interview term: Error Boundary** — a component that catches errors thrown **while rendering the components below it**, and renders a fallback UI in their place instead of letting the error propagate to the root.

📌 **Interview term:** it must be a **class component**. This is the one capability hooks never gained, and interviewers ask precisely because it is the exception to "you never need classes any more".

\`\`\`jsx
class ErrorBoundary extends React.Component {
  state = { error: null };

  // Render phase: return the state that produces the fallback. Must be pure.
  static getDerivedStateFromError(error) {
    return { error };
  }

  // Commit phase: side effects are allowed here. This is where logging goes.
  componentDidCatch(error, info) {
    reportToService(error, info.componentStack);
  }

  render() {
    if (this.state.error) return <Fallback onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
\`\`\`

📌 **Interview term:** the **two methods are split by phase**, and that is the reason there are two. <code>getDerivedStateFromError</code> runs during render, so it must be pure — no logging, no analytics. <code>componentDidCatch</code> runs after the commit, where side effects are safe.

## 3. Verified: what you actually get

A boundary wrapping a component that throws during render:

\`\`\`
DOM after the throw:            "CAUGHT: render exploded"
componentDidCatch error:        "render exploded"
info object keys:               ["componentStack"]
componentStack names the failing component:  true
\`\`\`

📌 **Interview term:** the second argument has exactly **one** key. <code>componentStack</code> is a React-tree stack — the chain of components, not JavaScript call frames — and it is the thing worth attaching to every report, because a minified JavaScript stack rarely tells you which component was rendering.

## 4. Placement is the whole design

A boundary is only as useful as the region it wraps.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="One root boundary blanks the page while several regional boundaries contain the failure">
  <defs>
    <marker id="eb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Where you put it decides how much survives</text>
  <text class="d-text" x="60" y="80" text-anchor="middle">root only</text>
  <rect class="d-box" x="130" y="46" width="520" height="66" rx="10"/>
  <text class="d-sub" x="390" y="70" text-anchor="middle">one boundary around everything</text>
  <text class="d-sub" x="390" y="94" text-anchor="middle">any failure replaces the whole page</text>
  <text class="d-text d-accent" x="60" y="180" text-anchor="middle">regional</text>
  <rect class="d-box-accent" x="130" y="140" width="160" height="66" rx="10"/>
  <text class="d-sub" x="210" y="166" text-anchor="middle">sidebar</text>
  <text class="d-sub" x="210" y="188" text-anchor="middle">still fine</text>
  <rect class="d-box-muted" x="302" y="140" width="160" height="66" rx="10"/>
  <text class="d-sub" x="382" y="166" text-anchor="middle">chart FAILED</text>
  <text class="d-sub" x="382" y="188" text-anchor="middle">shows a fallback</text>
  <rect class="d-box-accent" x="474" y="140" width="176" height="66" rx="10"/>
  <text class="d-sub" x="562" y="166" text-anchor="middle">main content</text>
  <text class="d-sub" x="562" y="188" text-anchor="middle">still fine</text>
</svg>

📌 **Interview term:** the rule of thumb is to put a boundary around anything that can **fail independently** and that the user could carry on without — a third-party widget, a chart fed by flaky data, each route, each panel of a dashboard. A single root boundary is better than nothing and worse than almost anything else.

## 5. A fallback needs an exit

A boundary that catches and then sits there forever has converted a crash into a dead region. Give the user a way out:

- A **retry button** that clears the error state, as in the class above.
- A **<code>key</code> change** on the boundary, which remounts it and its subtree with fresh state — see <a href="PASTE_KEY_RESET_URL_HERE" target="_blank" rel="noopener noreferrer">using key to reset state</a>.
- **Resetting on navigation**, so moving to another route clears a stale failure.

## 6. React 19: reporting without a boundary at every node

<code>createRoot</code> now takes error callbacks, which is where centralised logging belongs:

| Option | Fires when |
| :--- | :--- |
| <code>onUncaughtError</code> | An error reached the root with **no boundary** to catch it |
| <code>onCaughtError</code> | A boundary **did** catch it |
| <code>onRecoverableError</code> | React recovered on its own — a <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">hydration mismatch</a>, for example |

Verified: with no boundary, <code>onUncaughtError</code> fired; with a boundary present, <code>onCaughtError</code> fired instead.

## 7. Common Pitfalls

- **Expecting a hook.** Verified: React exports no error-boundary hook. Libraries wrap a class.
- **Logging inside <code>getDerivedStateFromError</code>.** That is the render phase; use <code>componentDidCatch</code>.
- **One boundary at the root.** Every failure becomes a blank page with a nicer message.
- **A fallback with no way to recover.** The region stays dead until a reload.
- **Assuming it catches everything.** It does not — see <a href="PASTE_BOUNDARY_LIMITS_URL_HERE" target="_blank" rel="noopener noreferrer">the limits</a>.
- **Dropping <code>componentStack</code>.** It is the one piece of information a minified stack does not give you.
- **Boundaries around every component.** Then a failure is invisible instead of contained.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Explain the blank page first:</strong> <span style="color:#f0e2c8;">"Since React 16 an uncaught render error unmounts the whole root. Boundaries exist to contain that instead of losing the page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define it:</strong> <span style="color:#f0e2c8;">"A component that catches errors thrown while rendering its subtree and shows a fallback in their place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the class requirement and the two methods:</strong> <span style="color:#f0e2c8;">"It has to be a class — the one thing hooks never gained. getDerivedStateFromError sets the fallback state during render; componentDidCatch logs it after the commit, where side effects are allowed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention what you log:</strong> <span style="color:#f0e2c8;">"componentDidCatch gets an info object whose only key is componentStack — the React component chain, which is what a minified JavaScript stack cannot give you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Make it a design answer:</strong> <span style="color:#f0e2c8;">"Placement is the real decision — one per independently-failing region, each with a retry. A single root boundary is just a prettier blank page."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are there two methods rather than one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because they run in different phases. getDerivedStateFromError runs during render and must be pure — React may render more than once, so logging there would double-report. componentDidCatch runs after the commit, where side effects are safe, which is why logging belongs there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there really no hook for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — I have checked React's exports and there is nothing for it. The popular libraries give you a nicer API with reset behaviour built in, but the boundary underneath is still a class component. It is worth saying plainly, because "hooks replaced classes entirely" is a claim interviewers like to test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you place them in a real app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One per route as a baseline, then one around anything that can fail on its own and that the user can do without — a third-party embed, a chart driven by flaky data, each panel of a dashboard. Plus one at the root as a last resort. The test is: if this breaks, what should the user still be able to do?</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the user get out of the fallback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You have to build it. Clearing the error state on a retry button is the simplest form, and changing the boundary's key remounts the subtree with fresh state, which is better when the failure left something half-initialised. Resetting on route change is worth adding too, so a stale failure does not follow the user around.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did React 19 add here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Root-level callbacks on createRoot — onUncaughtError, onCaughtError and onRecoverableError. I have confirmed the first fires when nothing catches the error and the second when a boundary does. It gives you one place to wire up reporting instead of repeating it in every boundary.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Error Boundary** | A class component that catches render errors below it |
| **<code>getDerivedStateFromError</code>** | Render-phase: return the fallback state |
| **<code>componentDidCatch</code>** | Commit-phase: log it |
| **<code>componentStack</code>** | The React component chain that failed |
| **<code>onUncaughtError</code>** | Root callback when nothing caught it |

---
**Conclusion:** an Error Boundary is a **class** component that catches errors thrown while rendering its subtree and shows a fallback instead — the answer to React unmounting the whole root on an uncaught render error. Two methods, split by phase: <code>getDerivedStateFromError</code> sets the fallback state during render and must be pure; <code>componentDidCatch</code> logs after the commit. Verified, that second one receives an info object whose **only** key is <code>componentStack</code>, naming the component that failed. There is **no hook version** — libraries wrap a class. The real work is placement: one boundary per independently-failing region, each with a way to recover, plus React 19's root-level <code>onUncaughtError</code> and <code>onCaughtError</code> for centralised reporting.`,
    examples: [
      {
        label: "A boundary with retry, and what componentDidCatch actually receives",
        runnable: true,
        code: `import React, { Component, useState } from "react";

class ErrorBoundary extends Component {
  state = { error: null, stack: null };

  // RENDER PHASE — must be pure. Return the state that shows the fallback.
  // No logging here: React may render more than once and you would double-report.
  static getDerivedStateFromError(error) {
    return { error };
  }

  // COMMIT PHASE — side effects allowed. This is where reporting belongs.
  // info has exactly one key: componentStack.
  componentDidCatch(error, info) {
    this.setState({ stack: info.componentStack });
    // reportToService(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ border: "1px solid #e0b4b4", background: "#fdf0f0", borderRadius: 8, padding: 12 }}>
          <strong style={{ color: "#a33" }}>⚠ {this.props.label} failed</strong>
          <div style={{ fontSize: 13, color: "#a33" }}>{this.state.error.message}</div>
          <pre style={{ fontSize: 11, color: "#666", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "auto" }}>
{String(this.state.stack || "").trim() || "(no component stack)"}
          </pre>
          {/* Without this, the fallback is permanent and the region is dead. */}
          <button onClick={() => this.setState({ error: null, stack: null })}>retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Chart({ broken }) {
  if (broken) throw new Error("Cannot read chart data: series is undefined");
  return <div style={ok}>📈 chart rendering normally</div>;
}

function Sidebar() {
  const [n, setN] = useState(0);
  return (
    <div style={ok}>
      sidebar is unaffected — <button onClick={() => setN((v) => v + 1)}>clicked {n}</button>
    </div>
  );
}

const ok = { border: "1px solid #cde3cd", background: "#f2f9f2", borderRadius: 8, padding: 12 };

export default function App() {
  const [broken, setBroken] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540, display: "grid", gap: 10 }}>
      <button onClick={() => setBroken((b) => !b)}>
        {broken ? "fix the chart" : "break the chart"}
      </button>

      {/* Two independent regions, two boundaries. The chart failing does not
          touch the sidebar — that containment is the whole point. */}
      <ErrorBoundary label="Chart">
        <Chart broken={broken} />
      </ErrorBoundary>

      <ErrorBoundary label="Sidebar">
        <Sidebar />
      </ErrorBoundary>

      <p style={{ fontSize: 13, color: "#666" }}>
        Break the chart: its region shows the fallback with the component stack,
        and the sidebar keeps its click count. Press "fix" then "retry" to
        recover. Without the retry button the region would stay dead until a
        reload — a boundary with no exit just converts a crash into a dead end.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What can and can't an Error Boundary catch?",
    seoDescription:
      "Verified on React 19: it caught a render error and a useEffect error, but not an event-handler or setTimeout throw — and it cannot catch its own render.",
    description: `**Question presented to candidate:**
"You have an Error Boundary and a component still crashes the page. What kinds of error does it not catch?"

**What a strong answer should cover:**
- The unifying rule: a boundary catches errors thrown **while React is on the stack rendering or committing that subtree**. Anything thrown outside that window is invisible to it.
- **Caught**: errors during render, during \`useEffect\` and layout effects, in constructors and other lifecycle methods.
- **Not caught**: **event handlers** — React is not rendering when your click handler runs.
- **Not caught**: anything **asynchronous** — \`setTimeout\`, promise callbacks, \`requestAnimationFrame\`. The throw happens on a later tick with no React frame below it.
- **Not caught**: errors in **server-side rendering**, and errors in the **boundary's own render** — those go to the next boundary up.
- The practical consequences: wrap async work in try/catch and put the failure in state; a rejected promise needs \`.catch\` or an unhandledrejection handler.
- Errors thrown by a suspended promise resolving are surfaced through Suspense and **do** reach a boundary.
- React 19's root-level \`onUncaughtError\` and \`onCaughtError\` give you the reporting hook for what boundaries do and do not handle.

**Clarifying questions expected:**
- "Where is the throw actually happening — render, an effect, a handler, or a timer?" — that alone answers it.
- "Is the failing code a promise rejection?" — that needs a different mechanism entirely.

**Code / implementation expected:** Optional. A grid of four throw sites with the outcome of each is the most convincing form.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">what an Error Boundary is</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every row of the table in section 3 was **executed against React 19.2.8** — each throw site was actually triggered and the boundary checked.

## 1. Why This Even Matters — A Story First

A smoke alarm in the hallway is genuinely useful. It is also completely silent about the fire that starts in the garden shed at three in the morning.

Not a fault in the alarm. It monitors the hallway; the shed is not the hallway. The mistake is thinking "I have an alarm" means "I am covered".

An Error Boundary monitors **one specific window of time** — and most of your code runs outside it.

## 2. The Rule Behind Every Case

📌 **Interview term:** a boundary catches errors thrown **while React is on the call stack rendering or committing that subtree**. That is the entire rule, and every exception below is a case where React is not on the stack.

Which is why the useful question is never "does it catch X?" but **"is React rendering when X throws?"**

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="A boundary covers the render and commit window only, not handlers or timers">
  <defs>
    <marker id="bl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Is React on the stack when it throws?</text>
  <rect class="d-box-accent" x="40" y="46" width="330" height="76" rx="10"/>
  <text class="d-text d-accent" x="205" y="70" text-anchor="middle">React is rendering or committing</text>
  <text class="d-sub" x="205" y="92" text-anchor="middle">render, effects, lifecycle methods</text>
  <text class="d-sub" x="205" y="112" text-anchor="middle">CAUGHT</text>
  <rect class="d-box-muted" x="392" y="46" width="248" height="76" rx="10"/>
  <text class="d-text" x="516" y="70" text-anchor="middle">React is not on the stack</text>
  <text class="d-sub" x="516" y="92" text-anchor="middle">handlers, timers, promises</text>
  <text class="d-sub" x="516" y="112" text-anchor="middle">NOT caught</text>
  <path class="d-edge-dashed" d="M 205 128 L 205 158" marker-end="url(#bl-arrow)"/>
  <path class="d-edge-dashed" d="M 516 128 L 516 158" marker-end="url(#bl-arrow)"/>
  <rect class="d-box" x="66" y="162" width="278" height="44" rx="9"/>
  <text class="d-sub" x="205" y="190" text-anchor="middle">the boundary renders a fallback</text>
  <rect class="d-box" x="392" y="162" width="248" height="44" rx="9"/>
  <text class="d-sub" x="516" y="190" text-anchor="middle">your own try/catch</text>
</svg>

## 3. Verified: every case, executed

Each row is a real throw with the boundary's outcome recorded.

| Where the error is thrown | Caught? | Measured |
| :--- | :--- | :--- |
| During **render** | ✅ Yes | DOM became <code>"CAUGHT: render exploded"</code> |
| Inside **<code>useEffect</code>** | ✅ Yes | DOM became <code>"CAUGHT: effect exploded"</code> |
| In an **event handler** | ❌ No | DOM stayed <code>"go"</code>; the error escaped React entirely |
| Inside **<code>setTimeout</code>** | ❌ No | DOM stayed <code>"ok"</code> |
| In the **boundary's own render** | ❌ No | The **outer** boundary caught it instead |

📌 **Interview term:** the <code>useEffect</code> row surprises people, and it is the one that proves the rule. Effects run during the **commit**, with React on the stack — so they are inside the window, even though they happen after render.

📌 **Interview term:** a boundary **cannot catch itself**. Verified — a boundary that threw in its own render was caught by the boundary above it. This is why a top-level boundary is still worth having even when you have regional ones.

## 4. The two that bite in production

**Event handlers.** By the time your <code>onClick</code> runs, React has finished rendering and committing; the handler is called from the browser's event dispatch. There is no React frame below it to catch anything.

\`\`\`jsx
// ❌ Nothing catches this.
<button onClick={() => { throw new Error("boom"); }} />

// ✅ Catch it yourself and put the failure in state.
<button onClick={() => {
  try { risky(); } catch (e) { setError(e); }
}} />
\`\`\`

**Anything asynchronous.** A <code>setTimeout</code> callback, a <code>.then</code>, a <code>requestAnimationFrame</code> — all run on a later tick with an empty stack beneath them.

\`\`\`jsx
// ❌ Invisible to the boundary.
useEffect(() => { setTimeout(() => { throw new Error("boom"); }, 100); }, []);

// ✅ Bring the failure back into render, where a boundary can see it.
const [error, setError] = useState(null);
if (error) throw error;   // now it throws DURING render
\`\`\`

📌 **Interview term:** that last line is the standard bridge — **catch it asynchronously, store it in state, then throw during render**. It converts an error the boundary cannot see into one it can.

## 5. The rest of the list

- **Server-side rendering.** A boundary does not catch errors during <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">SSR</a>; the server renderer has its own error handling.
- **Rejected promises** with no handler. These surface as <code>unhandledrejection</code> on the window, not through React.
- **Errors from a suspended promise.** These **do** reach a boundary — when a promise read with <code>use</code> rejects, React re-renders and throws during render, which is inside the window.

## 6. React 19: seeing what the boundaries missed

Verified behaviour of the <code>createRoot</code> options:

\`\`\`
no boundary present   ->  onUncaughtError fired
a boundary present    ->  onCaughtError fired
\`\`\`

📌 **Interview term:** neither of these **catches** anything — they are reporting hooks. They give you one place to send both categories, which matters precisely because the boundary coverage is partial.

## 7. Common Pitfalls

- **Assuming handler errors are covered.** Verified: they are not, and the page can still die.
- **Assuming async errors are covered.** Verified: <code>setTimeout</code> throws straight past.
- **Not knowing effects ARE covered.** They run during the commit.
- **Relying on a single boundary that might throw itself.** It cannot catch its own render.
- **Forgetting unhandled promise rejections.** A different mechanism entirely.
- **Not bridging async failures into render.** Store in state, then throw during render.
- **Expecting boundaries to work during SSR.** They do not.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the rule, not the list:</strong> <span style="color:#f0e2c8;">"It catches errors thrown while React is on the stack rendering or committing that subtree. Everything else is outside the window."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two that catch people out:</strong> <span style="color:#f0e2c8;">"Event handlers and anything async — setTimeout, promise callbacks. By then React has finished; there is no React frame below the throw."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Add the one that surprises:</strong> <span style="color:#f0e2c8;">"Effects ARE caught — I have verified a throw inside useEffect hitting the boundary — because effects run during the commit, with React on the stack."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention self-coverage:</strong> <span style="color:#f0e2c8;">"A boundary cannot catch an error in its own render — that goes to the boundary above, which is a reason to keep a root-level one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the fix:</strong> <span style="color:#f0e2c8;">"For the uncovered cases, catch it yourself, store the error in state, and throw it during the next render — that converts it into something the boundary can see."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are event handlers excluded?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because rendering has already finished by the time one runs — the browser dispatches the event and React invokes your handler, with nothing underneath to catch a throw. It is also arguably the right default: a failed click should not replace the whole region with a fallback, it should show a message where the user was looking.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If effects are caught, why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setTimeout</code> inside an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the effect body finishes immediately — all it did was schedule a timer. The callback fires later on a fresh stack with no React frame beneath it, so the throw goes straight to the global handler. The boundary covers when the effect RUNS, not everything the effect starts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get an async failure into a boundary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catch it where it happens, put the error object in state, and throw it at the top of the next render. That moves the throw inside the render window where a boundary can see it. Most error-boundary libraries expose exactly this as a showBoundary function, and it is worth knowing that is all it does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do errors from a suspended promise reach a boundary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and that is not an exception to the rule. When a promise read during render rejects, React re-renders that component and the rejection is thrown during render — inside the window. That is why a Suspense boundary is usually paired with an error boundary: one handles pending, the other handles failed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What catches everything else, then?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing inside React. You need window error and unhandledrejection listeners for the global net, try/catch at the call sites that matter, and React 19's onUncaughtError and onCaughtError on the root for reporting. Boundaries are one layer of a strategy, not the strategy.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Render window** | The time React is rendering or committing a subtree |
| **Commit phase** | When React applies changes and runs effects — inside the window |
| **Bridging** | Storing an async error in state, then throwing during render |
| **<code>unhandledrejection</code>** | The window event for an unhandled promise rejection |
| **<code>onUncaughtError</code>** | Root reporting hook when no boundary caught it |

---
**Conclusion:** an Error Boundary catches errors thrown **while React is on the stack rendering or committing** that subtree — one rule that explains every case. Verified on React 19.2.8: **caught** during render and inside <code>useEffect</code> (effects run in the commit, so they are inside the window); **not caught** in an event handler or inside <code>setTimeout</code>, where React has already finished and nothing sits below the throw; and a boundary **cannot catch its own render error**, which the outer boundary handled instead. For the uncovered cases, catch the error yourself, store it in state, and **throw it during the next render** to bring it back into the window — and use React 19's <code>onUncaughtError</code> and <code>onCaughtError</code> to report on both halves.`,
    examples: [
      {
        label: "Four throw sites, one boundary — press each and see which are caught",
        runnable: true,
        code: `import React, { Component, useState, useEffect } from "react";

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={bad}>
          <strong style={{ color: "#a33" }}>✅ boundary caught it:</strong>{" "}
          {this.state.error.message}
          <div><button onClick={() => this.setState({ error: null })}>reset</button></div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Subject({ mode, onEscaped }) {
  const [asyncError, setAsyncError] = useState(null);

  // THE BRIDGE: an error caught asynchronously and re-thrown during render is
  // back inside the window a boundary can see.
  if (asyncError) throw asyncError;

  // ✅ CAUGHT — render is inside the window.
  if (mode === "render") throw new Error("thrown during render");

  // ✅ CAUGHT — effects run during the commit, with React on the stack.
  useEffect(() => {
    if (mode === "effect") throw new Error("thrown inside useEffect");
  }, [mode]);

  // ❌ NOT CAUGHT — the timer fires on a later tick with no React frame below.
  useEffect(() => {
    if (mode !== "timer") return;
    const t = setTimeout(() => {
      try {
        throw new Error("thrown inside setTimeout");
      } catch (e) {
        onEscaped("setTimeout: " + e.message + " — the boundary never saw this");
      }
    }, 50);
    return () => clearTimeout(t);
  }, [mode, onEscaped]);

  return (
    <div style={ok}>
      <div>rendering normally (mode: {mode || "idle"})</div>
      {/* ❌ NOT CAUGHT — React has finished rendering by the time this runs. */}
      <button onClick={() => {
        try {
          throw new Error("thrown in an event handler");
        } catch (e) {
          onEscaped("handler: " + e.message + " — the boundary never saw this");
        }
      }}>
        throw in a handler
      </button>{" "}
      <button onClick={() => {
        // The same handler error, BRIDGED into render.
        setAsyncError(new Error("handler error, bridged into render"));
      }}>
        throw in a handler, bridged
      </button>
    </div>
  );
}

const ok = { border: "1px solid #cde3cd", background: "#f2f9f2", borderRadius: 8, padding: 12 };
const bad = { border: "1px solid #e0b4b4", background: "#fdf0f0", borderRadius: 8, padding: 12 };

export default function App() {
  const [mode, setMode] = useState("");
  const [escaped, setEscaped] = useState([]);
  const note = (s) => setEscaped((l) => [s, ...l].slice(0, 4));

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setMode("render")}>throw in render</button>
        <button onClick={() => setMode("effect")}>throw in useEffect</button>
        <button onClick={() => setMode("timer")}>throw in setTimeout</button>
        <button onClick={() => { setMode(""); setEscaped([]); }}>reset all</button>
      </div>

      <Boundary key={mode}>
        <Subject mode={mode} onEscaped={note} />
      </Boundary>

      <div style={{ marginTop: 10, fontSize: 13 }}>
        <strong>escaped the boundary:</strong>
        <pre style={{ background: "#f6f6f8", padding: 8, borderRadius: 6, fontSize: 12, minHeight: 60 }}>
{escaped.length ? escaped.join("\\n") : "(nothing yet)"}
        </pre>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        Render and effect errors reach the boundary. The handler and timer
        errors do not — they are caught locally here only so the demo survives;
        without that they would go straight to the global handler. The last
        button shows the bridge: store the error, throw it during render, and
        it becomes catchable.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between shadow DOM and virtual DOM?",
    seoDescription:
      "They share only the word DOM. Verified: a React element is a plain object with type and props; a shadow root hid its content from document.getElementById.",
    description: `**Question presented to candidate:**
"Shadow DOM and virtual DOM — are they related?"

**What a strong answer should cover:**
- **No.** They solve unrelated problems and the shared word is a coincidence of naming. Saying that first is the right move.
- **Virtual DOM** is a **React concept**: a lightweight tree of plain JavaScript objects describing what the UI should look like, which React diffs against the previous tree to compute minimal DOM updates. It never exists in the browser spec.
- **Shadow DOM** is a **browser standard**, part of Web Components: a genuinely separate DOM subtree attached to an element, with real **encapsulation** — its nodes are not reachable from the outer document and its styles do not leak in either direction.
- Virtual DOM is about **efficient updates**; shadow DOM is about **isolation**.
- A React element is not a DOM node — it is an object with \`type\`, \`props\` and \`key\`.
- They can coexist: you can render a React tree **into** a shadow root, and React will happily reconcile inside it. Event delegation needs care, since React attaches listeners at the root container.
- The honest nuance: virtual DOM is not inherently faster than direct DOM manipulation — it is faster than *naive* re-rendering, and it buys a declarative programming model.

**Clarifying questions expected:**
- "Do you mean the concepts, or are you asking whether React uses shadow DOM?" — React does not, by default.

**Code / implementation expected:** No. This is a definitional comparison.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior Web Components knowledge assumed.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The object shapes and the encapsulation test in section 3 were **executed against React 19.2.8** in a real DOM. Related: <a href="PASTE_VIRTUAL_DOM_URL_HERE" target="_blank" rel="noopener noreferrer">the virtual DOM in depth</a> and <a href="PASTE_RECONCILIATION_URL_HERE" target="_blank" rel="noopener noreferrer">reconciliation</a>.

## 1. Why This Even Matters — A Story First

Two things in a building both called "the plan".

One is the **architect's drawing** — paper, not a building. You mark up changes on it, compare it against last week's drawing, and send a builder to make only the differences.

The other is the **soundproofed room** — a real, physical space where what happens inside does not leak out, and the noise outside does not get in.

Nobody would confuse a drawing with a room. They share a word in this story, and that is all these two share.

## 2. Two unrelated things

📌 **Interview term: virtual DOM** — a **React** concept. A tree of **plain JavaScript objects** describing what the UI should look like. React diffs the new tree against the previous one and applies the minimum set of real DOM operations. It is not part of any web standard.

📌 **Interview term: shadow DOM** — a **browser standard**, part of Web Components. A genuinely separate DOM subtree attached to a host element, providing **encapsulation**: its nodes are hidden from the outer document, and CSS does not cross the boundary in either direction.

| | Virtual DOM | Shadow DOM |
| :--- | :--- | :--- |
| What it is | A JavaScript object tree | A real DOM subtree |
| Where it comes from | React and similar libraries | The browser platform |
| Problem it solves | **Efficient, declarative updates** | **Isolation of markup and styles** |
| Exists in the browser? | No — it is in memory | Yes — it is in the document |
| Standardised? | No | Yes |

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="The virtual DOM is a JavaScript object tree while the shadow DOM is an encapsulated real subtree">
  <defs>
    <marker id="sv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="170" y="24" text-anchor="middle">virtual DOM — in memory</text>
  <rect class="d-box-accent" x="24" y="42" width="290" height="60" rx="10"/>
  <text class="d-sub" x="169" y="66" text-anchor="middle">plain objects: type, props, key</text>
  <text class="d-sub" x="169" y="88" text-anchor="middle">diffed against the previous tree</text>
  <path class="d-edge-accent" d="M 169 108 L 169 140" marker-end="url(#sv-arrow)"/>
  <rect class="d-box" x="60" y="144" width="218" height="46" rx="9"/>
  <text class="d-sub" x="169" y="172" text-anchor="middle">minimal real DOM updates</text>
  <text class="d-text" x="510" y="24" text-anchor="middle">shadow DOM — in the document</text>
  <rect class="d-box" x="368" y="42" width="288" height="148" rx="10"/>
  <text class="d-sub" x="512" y="66" text-anchor="middle">a host element in the page</text>
  <rect class="d-box-muted" x="404" y="82" width="216" height="90" rx="9"/>
  <text class="d-sub" x="512" y="106" text-anchor="middle">shadow root</text>
  <text class="d-sub" x="512" y="128" text-anchor="middle">hidden from the document</text>
  <text class="d-sub" x="512" y="150" text-anchor="middle">styles do not cross</text>
</svg>

## 3. Verified: both claims, executed

**A React element is a plain object, not a DOM node:**

\`\`\`
typeof <div className="box">hello</div>   ->  "object"
its keys                                 ->  ["$$typeof", "type", "key", "props"]
.type                                    ->  "div"
.props                                   ->  { "className": "box", "children": "hello" }
is it a DOM node (has appendChild)?      ->  false
\`\`\`

📌 **Interview term:** that is the virtual DOM in one line of output. <code>type</code> and <code>props</code> — a **description**, with no browser involvement at all. Creating a thousand of these is cheap because they are just objects.

**A shadow root genuinely hides its contents:**

\`\`\`
attachShadow supported                              ->  true
document.getElementById finds the shadow content?   ->  false
shadowRoot.getElementById finds it?                 ->  true
host.textContent sees it?                           ->  ""
\`\`\`

📌 **Interview term:** the content is **in the page and rendered**, yet <code>document.getElementById</code> cannot see it and the host's own <code>textContent</code> is empty. That is real encapsulation enforced by the browser — not a convention, not a naming scheme.

## 4. Different problems, and it shows

**Virtual DOM answers:** "The state changed. What is the smallest set of DOM operations that makes the page match?" It exists so you can write **what the UI should look like** instead of a sequence of mutations — see <a href="PASTE_RECONCILIATION_URL_HERE" target="_blank" rel="noopener noreferrer">reconciliation</a> for how the diff works.

**Shadow DOM answers:** "How do I ship a component whose styles cannot be broken by the host page, and whose internals the host page cannot reach into?" It is the mechanism behind Web Components and third-party embeddable widgets.

📌 **Interview term:** worth being honest about the virtual DOM's reputation — it is **not inherently faster than direct DOM manipulation**. Hand-written, perfectly targeted DOM updates will always beat it. What it beats is **naive re-rendering**, and what it buys is a declarative model where you stop tracking which mutation to apply.

## 5. They can be used together

React does **not** use shadow DOM. But you can render a React tree into a shadow root:

\`\`\`jsx
const host = document.querySelector("#widget");
const shadow = host.attachShadow({ mode: "open" });
createRoot(shadow).render(<App />);
\`\`\`

React reconciles inside it perfectly well. Two things to watch: React attaches its delegated listeners at the **root container** — see <a href="PASTE_EVENT_HANDLING_URL_HERE" target="_blank" rel="noopener noreferrer">how React handles events</a> — so the shadow root becomes that container; and your normal global stylesheet will not reach inside, which is the entire point but still surprises people the first time.

## 6. Common Pitfalls

- **Assuming they are related.** They share a word.
- **Claiming the virtual DOM is "faster than the DOM".** It is faster than naive re-rendering; it is a **model**, not a speed trick.
- **Thinking React uses shadow DOM.** It does not.
- **Expecting global CSS inside a shadow root.** Styles do not cross — by design.
- **Querying shadow content from the document.** Verified: it is not findable.
- **Confusing shadow DOM with a portal.** A <a href="PASTE_PORTALS_URL_HERE" target="_blank" rel="noopener noreferrer">portal</a> moves where React renders; it does not encapsulate anything.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Refuse the premise immediately:</strong> <span style="color:#f0e2c8;">"They are unrelated. They share the word DOM and nothing else — different problems, different origins."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define the virtual DOM concretely:</strong> <span style="color:#f0e2c8;">"A React concept — a tree of plain JavaScript objects with a type and props. React diffs it against the previous tree to compute minimal DOM updates. It never touches the browser."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Define shadow DOM concretely:</strong> <span style="color:#f0e2c8;">"A browser standard for encapsulation. A real subtree whose nodes the document cannot find and whose styles do not leak in either direction — I have confirmed getElementById cannot reach inside one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Contrast the purposes:</strong> <span style="color:#f0e2c8;">"Efficient declarative updates versus isolation. One is in memory, one is in the document."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Add the honest nuance:</strong> <span style="color:#f0e2c8;">"And the virtual DOM is not magically faster than the DOM. It is faster than naive re-rendering, and what it really buys is a declarative model."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does React use shadow DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. React renders into an ordinary container in the light DOM and handles style isolation at the tooling level instead — CSS modules, scoped class names, CSS-in-JS. You can render React into a shadow root deliberately, which is what people do for embeddable widgets, but nothing in React reaches for it on your behalf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the virtual DOM actually faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not compared to hand-written, perfectly targeted DOM updates — those will always win, because the diff is pure overhead you skipped. It is faster than tearing down and rebuilding a subtree on every change, which is the realistic alternative, and the honest framing is that it buys a declarative model at an acceptable cost rather than raw speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use shadow DOM for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anything embedded in a page you do not control — a chat widget, an analytics overlay, a checkout embed. The host page's CSS cannot break your layout and your CSS cannot break theirs, which is a guarantee no amount of class-name prefixing can actually give you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you render React inside a shadow root?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — pass the shadow root to createRoot and React reconciles inside it normally. Two things to plan for: React attaches its delegated event listeners to that container, so the shadow root becomes the delegation root; and your global stylesheet will not apply inside, so styles have to be injected into the shadow root itself.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Virtual DOM** | A JavaScript object tree describing the UI |
| **Shadow DOM** | A browser-standard encapsulated DOM subtree |
| **Shadow root** | The root of that hidden subtree |
| **Encapsulation** | Markup and styles that do not cross a boundary |
| **Reconciliation** | Diffing the new object tree against the old one |

---
**Conclusion:** they are unrelated, and saying so first is the right answer. The **virtual DOM** is a React concept — verified as a plain JavaScript object with keys <code>$$typeof</code>, <code>type</code>, <code>key</code> and <code>props</code>, with no <code>appendChild</code> in sight — used to diff against the previous tree and compute minimal DOM updates. The **shadow DOM** is a browser standard for **encapsulation**: verified, content inside a shadow root was invisible to <code>document.getElementById</code> and absent from the host's <code>textContent</code>, while the shadow root itself could find it. Efficient updates versus isolation; in memory versus in the document. They can be combined — you can render React into a shadow root — but React does not use shadow DOM on its own.`,
    examples: [
      {
        label: "Inspecting a React element as an object, and a shadow root hiding its contents",
        runnable: true,
        code: `import { useState, useEffect, useRef } from "react";

export default function App() {
  const [out, setOut] = useState([]);
  const hostRef = useRef(null);
  const shadowRef = useRef(null);

  // Attach a real shadow root once, on mount.
  useEffect(() => {
    if (hostRef.current && !shadowRef.current) {
      const shadow = hostRef.current.attachShadow({ mode: "open" });
      shadow.innerHTML =
        '<style>p { color: crimson; font-family: system-ui; }</style>' +
        '<p id="inside-shadow">I live inside the shadow root</p>';
      shadowRef.current = shadow;
    }
  }, []);

  const inspectElement = () => {
    // A React element — created, never rendered. It is just an object.
    const el = <div className="box">hello</div>;
    setOut([
      "typeof element:  " + typeof el,
      "keys:            " + JSON.stringify(Object.keys(el)),
      "element.type:    " + JSON.stringify(el.type),
      "element.props:   " + JSON.stringify(el.props),
      "is a DOM node?   " + (typeof el.appendChild === "function"),
      "",
      "That is the virtual DOM: a description, not a node.",
    ]);
  };

  const inspectShadow = () => {
    const host = hostRef.current;
    const shadow = shadowRef.current;
    setOut([
      "document.getElementById('inside-shadow'): " + (document.getElementById("inside-shadow") ? "found" : "NOT FOUND"),
      "shadowRoot.getElementById('inside-shadow'): " + (shadow && shadow.getElementById("inside-shadow") ? "found" : "NOT FOUND"),
      "host.textContent: " + JSON.stringify(host.textContent),
      "host.children.length: " + host.children.length,
      "",
      "The paragraph is visible on screen and unreachable from the document.",
      "That is encapsulation enforced by the browser.",
    ]);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={inspectElement}>inspect a React element</button>
        <button onClick={inspectShadow}>inspect the shadow root</button>
      </div>

      {/* The host element. Its shadow content renders but is not its children. */}
      <div
        ref={hostRef}
        style={{ border: "1px dashed #aaa", borderRadius: 8, padding: 10, marginBottom: 12 }}
      />

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, minHeight: 140, whiteSpace: "pre-wrap" }}>
{out.length ? out.join("\\n") : "press a button"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        The crimson paragraph above is styled by CSS that exists only inside the
        shadow root — it cannot affect the rest of this page, and this page
        cannot style it. Meanwhile the React element is a plain object that has
        never been near the browser. Two entirely different ideas.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does React Fiber work?",
    seoDescription:
      "Fiber is a linked-list tree of work units React can pause and resume. Verified by reading the __reactFiber$ node off a DOM element and walking it.",
    description: `**Question presented to candidate:**
"React Fiber is described as a rewrite of the reconciler. What actually changed, and why?"

**What a strong answer should cover:**
- Fiber is React's **internal representation of a unit of work** — one JavaScript object per element in the tree, plus the reconciler that walks them.
- The problem it solved: the old reconciler used **recursion**, so a render could not be interrupted. Once started, it ran to completion and blocked the main thread.
- Fiber replaces recursion with a **linked-list tree** — each node has \`child\`, \`sibling\` and \`return\` pointers — which turns the traversal into a **loop over an explicit structure** rather than a call stack.
- Because the position is data rather than stack frames, React can **stop between units, yield to the browser, and resume later** — that is what makes concurrent features possible.
- **Double buffering**: React keeps a *pair* of fibers per position (\`current\` and \`alternate\`), building the next tree into the spare one, so the committed tree is never partially mutated.
- Two phases: the **render phase** is interruptible and produces a list of effects; the **commit phase** is synchronous and applies them.
- Each fiber carries \`memoizedState\` (the hooks linked list), \`memoizedProps\`, \`flags\` (what changed) and \`lanes\` (priority).
- Fiber is an **implementation detail** — do not reach into it in application code.

**Clarifying questions expected:**
- "Do you want the data structure, or the scheduling consequences?" — they are separable answers.

**Code / implementation expected:** No. Fiber is internal; describing the structure and what it enables is the answer.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes reconciliation basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Sections 3 and 5 are **actual fiber nodes read out of a running React 19.2.8 tree** — React stores one on every DOM element it creates, and this doc walks it. Related: <a href="PASTE_RECONCILIATION_URL_HERE" target="_blank" rel="noopener noreferrer">reconciliation</a> for what the diff decides, and <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer">transitions</a> for what the interruptibility buys.

## 1. Why This Even Matters — A Story First

Imagine reading a 900-page book with no bookmark. If someone interrupts you, your only options are to finish the book or start again tomorrow from page one. Your position exists solely in your own head.

Now put a bookmark in it. Your position is **an object in the world**, so you can stop mid-chapter, deal with the interruption, and pick up exactly where you were.

That is the entire Fiber rewrite. The old reconciler kept its position in the **call stack**; Fiber keeps it in **data**.

## 2. The problem it solved

📌 **Interview term:** the pre-Fiber reconciler was **recursive**. Rendering a tree meant a function calling itself down through the children, so React's progress lived in JavaScript's call stack — and **you cannot pause a call stack**. Once a render started, it ran to completion.

For a big tree that meant the main thread was blocked: no keystrokes, no scrolling, no paint, until the whole render finished.

📌 **Interview term: Fiber** — both the **data structure** (one object per element, representing a unit of work) and the **reconciler** that walks those objects in a loop. Because the traversal state is an object rather than stack frames, React can stop between units and resume later.

## 3. Verified: a real fiber node

React stores a fiber on every DOM element it creates, under a property named <code>__reactFiber$</code> plus a random suffix. Reading it from a rendered <code>&lt;div id="probe"&gt;</code>:

\`\`\`
internal property on the DOM node:  __reactFiber$na9zvhl…
fiber.tag:   5              (5 is a host component — a real DOM element)
fiber.type:  "div"
fields present: child, sibling, return, memoizedState, memoizedProps,
                alternate, flags, lanes
\`\`\`

📌 **Interview term:** those field names **are** the answer to this question. Each one corresponds to something an interviewer expects you to be able to explain:

| Field | What it holds |
| :--- | :--- |
| <code>child</code> | The **first** child — not an array of all of them |
| <code>sibling</code> | The next child of the same parent |
| <code>return</code> | The parent, to walk back up when the children are done |
| <code>memoizedState</code> | For a function component, the **hooks linked list** |
| <code>memoizedProps</code> | The props from the last committed render |
| <code>flags</code> | What changed here — placement, update, deletion |
| <code>lanes</code> | The **priority** of pending work on this node |

## 4. Verified: it is a tree of linked lists

Walking from that same <code>div</code>, which rendered <code>&lt;Leaf /&gt;</code> and <code>&lt;b&gt;</code>:

\`\`\`
children via child -> sibling -> sibling:  Leaf -> b
parent via return:                         App
\`\`\`

📌 **Interview term:** React reaches the second child by following <code>child</code> once and then <code>sibling</code> — there is **no children array**. That is what makes the traversal a **loop**: take the current fiber, do its work, then move to <code>child</code>, else <code>sibling</code>, else <code>return</code> and try that node's sibling. The "where am I" is entirely in the pointers.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Fibers link to a first child a next sibling and a parent rather than holding a children array">
  <defs>
    <marker id="fb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Three pointers, no children array</text>
  <rect class="d-box-accent" x="260" y="46" width="160" height="44" rx="9"/>
  <text class="d-text d-accent" x="340" y="74" text-anchor="middle">App</text>
  <path class="d-edge-accent" d="M 300 94 L 200 134" marker-end="url(#fb-arrow)"/>
  <text class="d-sub" x="212" y="112" text-anchor="middle">child</text>
  <rect class="d-box" x="90" y="138" width="160" height="44" rx="9"/>
  <text class="d-text" x="170" y="166" text-anchor="middle">div</text>
  <path class="d-edge" d="M 170 186 L 170 206" marker-end="url(#fb-arrow)"/>
  <text class="d-sub" x="128" y="202" text-anchor="middle">child</text>
  <rect class="d-box-muted" x="90" y="210" width="130" height="26" rx="7"/>
  <text class="d-sub" x="155" y="228" text-anchor="middle">Leaf</text>
  <path class="d-edge" d="M 226 223 L 300 223" marker-end="url(#fb-arrow)"/>
  <text class="d-sub" x="263" y="216" text-anchor="middle">sibling</text>
  <rect class="d-box-muted" x="306" y="210" width="130" height="26" rx="7"/>
  <text class="d-sub" x="371" y="228" text-anchor="middle">b</text>
  <path class="d-edge-dashed" d="M 256 156 L 386 156" marker-end="url(#fb-arrow)"/>
  <text class="d-sub" x="321" y="148" text-anchor="middle">return</text>
  <rect class="d-box-muted" x="392" y="138" width="230" height="44" rx="9"/>
  <text class="d-sub" x="507" y="166" text-anchor="middle">back up to the parent</text>
</svg>

## 5. Verified: double buffering

React does not build a fresh tree on every render. It keeps **two fibers per position** and alternates between them.

\`\`\`
after mount, fiber.alternate is:          null
after one update, fiber.alternate is:     a second fiber
fiber.alternate.alternate === fiber ?     true
the pair hold the rendered values:        [0, 1]
after a second update, still a pair?      true
\`\`\`

📌 **Interview term: double buffering** — one tree is <strong>current</strong> (what is on screen) and the other is the <strong>work-in-progress</strong>. React builds into the spare, and only at the end does it **swap the pointer**. Two consequences worth stating: the committed tree is **never partially mutated**, and abandoning a half-finished render costs nothing — you just do not swap.

Note the pair was created **lazily**: <code>alternate</code> was <code>null</code> after mount and only appeared on the first update.

## 6. The two phases

📌 **Interview term: render phase** — React walks the fibers, calls your components, and marks what changed. It is **interruptible**: React can pause, let the browser handle an event or paint, and resume. This is why your render function must be **pure** — it may run partially, be thrown away, and run again.

📌 **Interview term: commit phase** — React applies the changes to the DOM and runs effects. It is **synchronous and uninterruptible**, because a half-applied DOM would be visible to the user.

Everything concurrent sits on top of this split. A <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer">transition</a> is low-priority work in the render phase that a higher-priority update can throw away — verified elsewhere in this collection as one keystroke producing two renders, the urgent one first.

## 7. Common Pitfalls

- **Calling Fiber "the virtual DOM".** The virtual DOM is the element objects your components return; fibers are React's internal work units, with far more on them.
- **Thinking Fiber made React faster.** It made rendering **interruptible**. Raw throughput was not the goal.
- **Reading fibers in application code.** The property name has a random suffix precisely to discourage it.
- **Assuming render runs once.** It can be started, abandoned and restarted — hence the purity rule.
- **Expecting the commit phase to be interruptible.** It is not, deliberately.
- **Confusing <code>lanes</code> with a queue.** Lanes are a **bitmask** of priorities, not an ordered list.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the problem it solved:</strong> <span style="color:#f0e2c8;">"The old reconciler was recursive, so React's progress lived in the call stack — and you cannot pause a call stack. A big render blocked the main thread until it finished."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the structure:</strong> <span style="color:#f0e2c8;">"Fiber is one object per element with child, sibling and return pointers — a tree of linked lists, not an array of children. I have walked a real one off a DOM node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Connect structure to capability:</strong> <span style="color:#f0e2c8;">"Because the position is data rather than stack frames, the traversal is a loop React can stop between units, yield to the browser, and resume. That is what makes concurrent rendering possible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention double buffering:</strong> <span style="color:#f0e2c8;">"There are two fibers per position — current and alternate. React builds into the spare and swaps at the end, so the committed tree is never half-mutated and abandoning work is free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Split the phases:</strong> <span style="color:#f0e2c8;">"Render is interruptible, which is why it must be pure. Commit is synchronous, because a half-applied DOM would be visible."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the linked-list shape matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it turns the traversal into a loop with an explicit cursor. With child, sibling and return you always know where you are and where to go next from the node alone, so React can return control to the browser after any unit and pick up from that node. A recursive walk has that information only in stack frames, which cannot be paused or serialised.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did Fiber make React faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in raw throughput — it added bookkeeping, if anything. It made rendering interruptible, which makes apps feel faster because a long render no longer blocks input. Responsiveness and throughput are different things, and Fiber traded slightly more of the second for a lot more of the first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">alternate</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Double buffering. Each position has a pair of fibers that point at each other — I have checked that alternate.alternate is the original — one holding what is on screen and one being built. React swaps which is current at commit time, so the visible tree is never partially updated, and an abandoned render is discarded by simply not swapping. It is allocated lazily: after mount, alternate was still null.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do hooks live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the fiber, in memoizedState — a linked list of hook records in call order. That is the mechanical reason for the Rules of Hooks: React matches each call to the next node in that list by position, so a conditional hook shifts every subsequent one onto the wrong record. It is not a style rule, it is a data-structure constraint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you ever read a fiber directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in application code. The property name carries a random suffix specifically to make it awkward, the shape has changed across versions, and nothing about it is a public contract. It is a fine thing to inspect once to understand the model — which is what the numbers in this answer come from — and a bad thing to depend on.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fiber** | One object per element: a unit of work |
| **<code>child</code> / <code>sibling</code> / <code>return</code>** | First child, next sibling, parent |
| **<code>alternate</code>** | The paired fiber used for double buffering |
| **Render phase** | Interruptible; must be pure |
| **Commit phase** | Synchronous; applies the DOM changes |
| **<code>lanes</code>** | A bitmask of pending work priorities |

---
**Conclusion:** Fiber is React's internal **unit of work** — one object per element — plus the reconciler that walks them. It replaced a recursive reconciler whose progress lived in the call stack, and therefore could not be paused, with a **tree of linked lists**: verified on a real node, each fiber carries <code>child</code>, <code>sibling</code> and <code>return</code> pointers, so React reaches the second child by <code>child</code> then <code>sibling</code> and walks back up via <code>return</code>. Because the position is data, the traversal is a loop React can stop and resume, which is what makes concurrent rendering possible. It keeps **two fibers per position** — verified, <code>alternate.alternate === fiber</code>, the pair holding the previous and current values — so the committed tree is never half-mutated. The render phase is interruptible and must be pure; the commit phase is synchronous.`,
    examples: [
      {
        label: "Reading a real fiber off a DOM node and walking its pointers",
        runnable: true,
        code: `import { useState, useRef } from "react";

// NOTE: this reaches into a React INTERNAL to make the structure visible.
// Never do this in application code — the property name is deliberately
// randomised, the shape changes between versions, and none of it is public.
function fiberOf(node) {
  const key = Object.keys(node).find((k) => k.startsWith("__reactFiber$"));
  return key ? node[key] : null;
}

const nameOf = (f) =>
  !f ? "null" : typeof f.type === "function" ? (f.type.name || "anonymous") : String(f.type);

function Leaf() {
  return <span>leaf</span>;
}

export default function App() {
  const probe = useRef(null);
  const [n, setN] = useState(0);
  const [out, setOut] = useState([]);

  const inspect = () => {
    const fiber = fiberOf(probe.current);
    if (!fiber) return setOut(["no fiber found — React internals may have changed"]);

    // Walk the children: child, then follow sibling. There is no array.
    const kids = [];
    for (let c = fiber.child; c; c = c.sibling) kids.push(nameOf(c));

    setOut([
      "fiber.tag:    " + fiber.tag + "   (5 = host component, a real DOM element)",
      "fiber.type:   " + JSON.stringify(fiber.type),
      "",
      "children, reached via child -> sibling:",
      "  " + kids.join(" -> "),
      "parent, reached via return:",
      "  " + nameOf(fiber.return),
      "",
      "alternate:                    " + (fiber.alternate ? "a paired fiber" : "null (none yet)"),
      "alternate.alternate === it?   " + (fiber.alternate ? String(fiber.alternate.alternate === fiber) : "n/a"),
      "",
      "fields present: " +
        ["child", "sibling", "return", "memoizedState", "memoizedProps", "alternate", "flags", "lanes"]
          .filter((f) => f in fiber)
          .join(", "),
    ]);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 600 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={inspect}>read the fiber</button>
        <button onClick={() => setN((v) => v + 1)}>re-render ({n})</button>
      </div>

      {/* The node whose fiber we read. It has two children of different kinds. */}
      <div ref={probe} id="probe" style={{ border: "1px dashed #aaa", borderRadius: 8, padding: 10 }}>
        <Leaf />
        <b> · render count {n}</b>
      </div>

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, marginTop: 12, minHeight: 190 }}>
{out.length ? out.join("\\n") : "press 'read the fiber'"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Read it once, then press re-render and read it again: <code>alternate</code>
        starts as null and appears after the first update — React allocates the
        second buffer lazily. Note there is no children array anywhere; the
        second child is reached by following <code>sibling</code>.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Portals in React and when would you use them?",
    seoDescription:
      "A portal renders into a different DOM node but stays in the React tree. Verified: a click ran the portal child, then its React parent, then the DOM parent.",
    description: `**Question presented to candidate:**
"Your modal is being clipped by a parent with \`overflow: hidden\`. How do portals solve that, and what do they not change?"

**What a strong answer should cover:**
- \`createPortal(children, domNode)\` renders \`children\` into a **different DOM container** while keeping them in the same place in the **React tree**.
- That split is the whole feature: **DOM position changes, React position does not.**
- It solves CSS containment problems — \`overflow: hidden\`, \`z-index\` stacking contexts, \`transform\` creating a new containing block — which no amount of z-index tinkering fixes from inside.
- **Events still bubble through the React tree**, not the DOM tree. A click inside the portal reaches the React parent's \`onClick\` even though the DOM parent is elsewhere. This surprises people and is usually what you want.
- Context, state and props all flow normally, because nothing about the React tree changed.
- Typical uses: modals, dialogs, tooltips, toasts, dropdown menus, anything that must escape its container.
- It is **not** an isolation mechanism — that is shadow DOM. Styles and events still apply.
- Accessibility is not solved for you: focus trapping, \`aria-modal\`, restoring focus on close, and Escape handling are still your job. Prefer \`<dialog>\` or a headless library.

**Clarifying questions expected:**
- "Is the problem CSS containment, or DOM ordering for accessibility?" — portals fix the first; the second needs more.
- "Does this need focus management?" — almost always yes for modals.

**Code / implementation expected:** Optional. Showing the event bubbling through the React parent is the non-obvious part worth demonstrating.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes JSX and event basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The DOM placement and the event ordering in sections 3 and 4 were **executed against React 19.2.8**. Related: <a href="PASTE_EVENT_HANDLING_URL_HERE" target="_blank" rel="noopener noreferrer">how React handles events</a>, which explains why the bubbling works the way it does.

## 1. Why This Even Matters — A Story First

A hotel guest orders room service. The food is **cooked in the kitchen**, four floors down — that is where the equipment is and where it physically has to happen.

But the **bill still goes to their room**. Nobody thinks the meal belongs to the kitchen just because that is where it was made.

A portal separates those two facts: where something is **rendered** in the DOM, and where it **belongs** in your component tree.

## 2. The Core Idea

📌 **Interview term: portal** — <code>createPortal(children, domNode)</code> renders <code>children</code> into a DOM container of your choosing, while leaving them exactly where they are in the **React tree**.

\`\`\`jsx
import { createPortal } from "react-dom";

function Modal({ children }) {
  return createPortal(children, document.getElementById("modal-root"));
}
\`\`\`

📌 **Interview term:** the split is the whole feature. **DOM position changes; React position does not.** Everything that follows — context still works, events still bubble to the React parent — is a consequence of that one sentence.

## 3. Verified: the node really does leave

A React root rendering a <code>&lt;span&gt;</code> normally, plus a portalled <code>&lt;span&gt;</code>:

\`\`\`
React container text:                       "in the tree"
portal target text:                         "in the portal"
is the ported node inside the React container?   false
\`\`\`

📌 **Interview term:** that is what fixes the clipped modal. The node is genuinely a child of a **different element**, so a parent with <code>overflow: hidden</code>, a <code>z-index</code> stacking context, or a <code>transform</code> is no longer an ancestor and cannot clip or contain it.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="A portal moves the DOM position while the React parent stays the same">
  <defs>
    <marker id="pt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Two trees, two different answers</text>
  <text class="d-text d-accent" x="150" y="52" text-anchor="middle">React tree</text>
  <rect class="d-box-accent" x="30" y="66" width="240" height="42" rx="9"/>
  <text class="d-sub" x="150" y="92" text-anchor="middle">App</text>
  <path class="d-edge-accent" d="M 150 112 L 150 138" marker-end="url(#pt-arrow)"/>
  <rect class="d-box-accent" x="30" y="142" width="240" height="42" rx="9"/>
  <text class="d-sub" x="150" y="168" text-anchor="middle">Modal — still a child here</text>
  <text class="d-text" x="510" y="52" text-anchor="middle">DOM tree</text>
  <rect class="d-box" x="390" y="66" width="240" height="42" rx="9"/>
  <text class="d-sub" x="510" y="92" text-anchor="middle">div id=root</text>
  <rect class="d-box-muted" x="390" y="142" width="240" height="42" rx="9"/>
  <text class="d-sub" x="510" y="168" text-anchor="middle">div id=modal-root</text>
  <path class="d-edge-dashed" d="M 276 163 L 384 163" marker-end="url(#pt-arrow)"/>
  <text class="d-sub" x="330" y="200" text-anchor="middle">rendered over here instead</text>
</svg>

## 4. Verified: events follow the React tree

This is the part that catches people out. A button inside a portal, with an <code>onClick</code> on its **React** parent, plus a native listener on the **DOM** parent it was ported into:

\`\`\`
portal child onClick  ->  React parent onClick  ->  native listener on the portal target
\`\`\`

📌 **Interview term:** the React parent's handler ran **even though the button is not its DOM descendant**. React reconstructs the propagation path from the **component tree**, not the DOM tree — which is exactly why a modal in a portal can still trigger a handler on the component that rendered it.

The native listener on the portal target fired last, because in the DOM the event really is bubbling there. Both trees are real; they just answer different questions.

📌 **Interview term:** the practical consequence — a "click outside to close" implementation that checks DOM ancestry will behave differently from one that relies on React bubbling. Know which one you are writing.

## 5. When to reach for it

| Problem | Portal helps? |
| :--- | :--- |
| Modal clipped by <code>overflow: hidden</code> | ✅ Yes |
| Tooltip trapped in a <code>z-index</code> stacking context | ✅ Yes |
| Dropdown cut off by a scrolling container | ✅ Yes |
| A parent <code>transform</code> creating a containing block | ✅ Yes |
| Styles leaking in from the host page | ❌ No — that is <a href="PASTE_SHADOW_VS_VIRTUAL_URL_HERE" target="_blank" rel="noopener noreferrer">shadow DOM</a> |
| Wanting the subtree isolated from context | ❌ No — context still flows |
| Wanting it to render less often | ❌ No — nothing about rendering changes |

## 6. What a portal does not do for you

📌 **Interview term:** a portal is **placement, not accessibility**. Moving a dialog to the end of <code>&lt;body&gt;</code> helps the reading order, and does nothing else. You still owe:

- **Focus trapping** while the modal is open, and **restoring focus** to the trigger on close.
- <code>role="dialog"</code> and <code>aria-modal="true"</code>, and a label.
- **Escape to close**, and marking background content inert.

The native <code>&lt;dialog&gt;</code> element gives you several of these for free, and a headless library gives you the rest. Saying this unprompted is a strong signal in an interview.

## 7. Common Pitfalls

- **Assuming events stop at the portal.** Verified: they bubble to the React parent.
- **Expecting isolation.** A portal is not shadow DOM; styles and events still apply.
- **Rendering into a node that does not exist yet.** Guard it, or render into <code>document.body</code>.
- **Forgetting focus management.** The single biggest accessibility gap in hand-rolled modals.
- **Click-outside logic based on DOM ancestry.** The portal content is not a DOM descendant of your component.
- **Portalling to fix z-index without checking the stacking context.** Sometimes the real fix is removing the <code>transform</code>.
- **Leaving the portal container mounted with stale content.** Unmount the portal, not just its contents.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the one-sentence definition:</strong> <span style="color:#f0e2c8;">"createPortal renders children into a different DOM node while keeping them in the same place in the React tree. DOM position changes, React position does not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the clipping directly:</strong> <span style="color:#f0e2c8;">"The node genuinely becomes a child of another element, so the overflow-hidden parent is no longer an ancestor and cannot clip it. Same for z-index stacking contexts and transforms."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Raise the surprising part:</strong> <span style="color:#f0e2c8;">"Events still bubble through the React tree. I have measured a click in the portal firing the React parent's onClick before the native listener on the DOM container."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say what stays normal:</strong> <span style="color:#f0e2c8;">"Context, props and state all flow as usual, because nothing about the React tree changed. That is the point."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Volunteer the limitation:</strong> <span style="color:#f0e2c8;">"It is placement, not accessibility, and not isolation. Focus trapping, aria-modal and Escape are still mine to build — which is why I would reach for the native dialog element or a headless library."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do events bubble out of a portal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through the React tree, yes — the component that rendered the portal receives the event as if the content were a normal child. I have confirmed the ordering: portal child, then React parent, then the native listener on the DOM container it was ported into. React builds the propagation path from the component tree, so both are true at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does context still reach a portal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, unchanged. Context flows down the React tree and the portal has not moved in it, so a theme or auth provider above the component still applies inside the modal. That is usually the reason to use a portal rather than rendering a second React root into the target node, which would lose all of it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from shadow DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Completely — a portal relocates, shadow DOM encapsulates. Portalled content is ordinary DOM in the document: your global CSS applies to it, the document can query it, events propagate normally. Shadow DOM gives you a boundary styles and queries cannot cross. Solving a leaking-styles problem with a portal will not work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a portal not solve for a modal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything that makes it a modal rather than a floating box. Trapping focus inside it, returning focus to the trigger when it closes, the dialog role and aria-modal, Escape to dismiss, and preventing the background from being read or scrolled. The portal only fixes where the pixels go.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should the portal container live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sibling of the app root, at the end of the body, so nothing in the app can become its containing block. Either a static node in the HTML or one created on mount — just guard against it being missing, because createPortal throws on a null container, and that is a common crash in tests where the shell HTML is not present.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Portal** | Rendering into a different DOM node, same React tree |
| **<code>createPortal</code>** | The <code>react-dom</code> function that does it |
| **Stacking context** | A CSS scope that traps <code>z-index</code> |
| **Containing block** | What a positioned element is positioned against |
| **Focus trap** | Keeping keyboard focus inside an open dialog |

---
**Conclusion:** <code>createPortal(children, domNode)</code> renders children into a **different DOM container** while leaving them where they are in the **React tree** — DOM position changes, React position does not. Verified: the portalled node was **not** inside the React root container, which is what frees a modal from a parent's <code>overflow: hidden</code>, stacking context or <code>transform</code>. Also verified, and the part people get wrong: **events bubble through the React tree**, so a click ran the portal child's handler, then its **React** parent's <code>onClick</code>, and only then the native listener on the DOM container. Context, props and state are unaffected for the same reason. It is placement, not isolation and not accessibility — focus trapping, <code>aria-modal</code> and Escape handling remain yours.`,
    examples: [
      {
        label: "A modal escaping overflow:hidden, and a click bubbling to its React parent",
        runnable: true,
        code: `import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// The portal target: created once, appended to the body, so nothing in the
// app can ever become its containing block.
function usePortalTarget() {
  const ref = useRef(null);
  const [, ready] = useState(0);
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
    ref.current = el;
    ready(1);                       // re-render now that the target exists
    return () => { document.body.removeChild(el); };
  }, []);
  return ref.current;
}

function Box({ portalled, target, onLog }) {
  return (
    // ⚠️ This parent clips everything inside it. That is the problem portals fix.
    <div
      style={{
        border: "2px solid #c66", borderRadius: 8, padding: 12,
        height: 90, overflow: "hidden", position: "relative",
      }}
      onClick={() => onLog("2. React parent onClick — even for the portal")}
    >
      <div style={{ fontSize: 13 }}>
        a container with <code>overflow: hidden</code>
      </div>

      {(() => {
        const panel = (
          <div
            onClick={() => onLog("1. panel onClick (inside the portal)")}
            style={{
              position: portalled ? "fixed" : "absolute",
              top: portalled ? "50%" : 60,
              left: portalled ? "50%" : 10,
              transform: portalled ? "translate(-50%, -50%)" : "none",
              background: "#fff", border: "2px solid #4f46e5",
              borderRadius: 8, padding: 12, fontSize: 13, zIndex: 10,
            }}
          >
            {portalled ? "✅ portalled — fully visible" : "❌ not portalled — clipped"}
            <div><button>click me</button></div>
          </div>
        );
        return portalled && target ? createPortal(panel, target) : panel;
      })()}
    </div>
  );
}

export default function App() {
  const target = usePortalTarget();
  const [portalled, setPortalled] = useState(false);
  const [log, setLog] = useState([]);
  const push = (s) => setLog((l) => [...l, s].slice(-4));

  // A NATIVE listener on the portal target, to show both trees at once.
  useEffect(() => {
    if (!target) return;
    const onNative = () => push("3. native listener on the portal target (DOM tree)");
    target.addEventListener("click", onNative);
    return () => target.removeEventListener("click", onNative);
  }, [target]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setPortalled((p) => !p)}>
          {portalled ? "stop portalling" : "portal it"}
        </button>
        <button onClick={() => setLog([])}>clear log</button>
      </div>

      <Box portalled={portalled} target={target} onLog={push} />

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, marginTop: 12, minHeight: 84 }}>
{log.length ? log.join("\\n") : "click the panel"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Unportalled, the panel is cut off by the red container. Portalled, it
        escapes entirely — and clicking it still runs the red container's{" "}
        <code>onClick</code>, because React propagates through the component
        tree. The third line only appears when portalled: that is the real DOM
        bubbling to the container the node actually lives in.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How can the `key` prop be used to deliberately reset component state?",
    seoDescription:
      "A different key means a different component, so React remounts it. Verified: changing a prop kept the typed draft; changing the key cleared it entirely.",
    description: `**Question presented to candidate:**
"A profile form keeps the previous user's unsaved edits when you switch records. How would you fix it without an effect?"

**What a strong answer should cover:**
- \`key\` is **component identity**. Same key means React reuses the instance and its state; a different key means a different component, so React **unmounts the old one and mounts a fresh one**.
- So \`<ProfileForm key={userId} />\` resets everything inside when \`userId\` changes — no effect, no manual clearing, no risk of missing a field.
- The alternative — an effect that watches the prop and calls setters — is worse: it renders once with **stale state** before the effect runs, it has to enumerate every piece of state, and it grows a bug every time someone adds a field.
- This is the **same mechanism** as index keys corrupting a list, used deliberately: React matches children by key, and a changed key is a different child.
- Scope it correctly: the key resets **everything below it**, including uncontrolled DOM state, refs and child component state. That is usually what you want and occasionally too much.
- The key should be **stable per identity** — a record id, not \`Math.random()\`, which would remount on every render.
- Reach for it when *all* state below should be discarded. Prefer a derived value or lifting state up when only part of it should change.

**Clarifying questions expected:**
- "Should absolutely everything below reset, or just one field?" — the key is all-or-nothing.
- "Is there an id that identifies the record?"

**Code / implementation expected:** Optional. It is a one-line change; the value is explaining why the effect version is worse.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_RECONCILIATION_URL_HERE" target="_blank" rel="noopener noreferrer">reconciliation</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The state and lifecycle transitions in section 3 were **executed against React 19.2.8**.

## 1. Why This Even Matters — A Story First

A hotel room is cleaned between guests. Nobody walks in with a list — "remove towels, reset minibar, clear the safe, wipe the desk" — and hopes it is complete. The room is simply **turned over**, and everything resets by construction.

The list approach fails the day someone adds a coffee machine and forgets to add it to the list.

Resetting state with an effect is the list. Changing the <code>key</code> is turning the room over.

## 2. The Core Idea

📌 **Interview term:** <code>key</code> is **component identity**, not a hint and not an optimisation. React uses it to decide whether the thing it is about to render is *the same component as last time*.

- **Same key** → React reuses the instance. State, refs and DOM survive.
- **Different key** → a different component. React **unmounts the old subtree and mounts a fresh one**, so all state inside is gone.

\`\`\`jsx
// Every field, ref and child component below resets when userId changes.
<ProfileForm key={userId} user={user} />
\`\`\`

📌 **Interview term:** this is the **same mechanism** that makes index keys corrupt a list — React matching children by key. Used carelessly it misassigns state; used deliberately it discards it.

## 3. Verified: prop change versus key change

A form with a typed draft in state, first with a prop changed, then with the key changed:

\`\`\`
after typing:              "first:hello"
after changing a PROP:     "second:hello"     <- draft survived
after changing the KEY:    "second:"          <- draft gone

lifecycle: mount first -> unmount first -> mount second
\`\`\`

📌 **Interview term:** the lifecycle line is the proof that this is a genuine **remount**, not a clever reset. The old component **unmounted** — its cleanup ran — and a new one mounted. That is why it resets everything below without you enumerating anything.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Changing a prop reuses the instance while changing the key unmounts and mounts a new one">
  <defs>
    <marker id="kr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Same key, or a different one</text>
  <rect class="d-box-muted" x="24" y="46" width="150" height="52" rx="9"/>
  <text class="d-sub" x="99" y="68" text-anchor="middle">draft typed</text>
  <text class="d-sub" x="99" y="88" text-anchor="middle">state held</text>
  <path class="d-edge-accent" d="M 180 60 L 250 60" marker-end="url(#kr-arrow)"/>
  <text class="d-sub" x="215" y="50" text-anchor="middle">prop changes</text>
  <rect class="d-box-accent" x="256" y="40" width="390" height="42" rx="9"/>
  <text class="d-text d-accent" x="451" y="66" text-anchor="middle">same instance reused — the draft survives</text>
  <path class="d-edge" d="M 180 118 L 250 118" marker-end="url(#kr-arrow)"/>
  <text class="d-sub" x="215" y="108" text-anchor="middle">key changes</text>
  <rect class="d-box" x="256" y="98" width="180" height="42" rx="9"/>
  <text class="d-sub" x="346" y="124" text-anchor="middle">old one unmounts</text>
  <path class="d-edge" d="M 442 118 L 486 118" marker-end="url(#kr-arrow)"/>
  <rect class="d-box" x="492" y="98" width="154" height="42" rx="9"/>
  <text class="d-sub" x="569" y="124" text-anchor="middle">fresh one mounts</text>
  <rect class="d-box-muted" x="256" y="158" width="390" height="42" rx="9"/>
  <text class="d-sub" x="451" y="184" text-anchor="middle">everything below it starts from scratch</text>
</svg>

## 4. Why the effect version is worse

The instinct is to watch the prop and clear the state:

\`\`\`jsx
// ❌ Three problems, all real.
useEffect(() => {
  setDraft("");
  setErrors(null);
  setTouched(false);
}, [userId]);
\`\`\`

📌 **Interview term: the stale render.** Effects run **after** the commit, so there is one render where <code>userId</code> is already the new record and <code>draft</code> is still the old user's text. Briefly, on screen. This is the bug the effect version cannot avoid.

📌 **Interview term: the enumeration problem.** You must list every piece of state. Add a fourth field next month and forget this effect, and you have a subtle data-leak between records — the kind that reaches production because it only shows when you switch.

And it costs an extra render, since the effect's setters trigger another one.

\`\`\`jsx
// ✅ One line, no enumeration, no stale render.
<ProfileForm key={userId} user={user} />
\`\`\`

## 5. Where else it earns its place

| Situation | Why the key works |
| :--- | :--- |
| A form switching records | Every field, error and touched flag resets together |
| Re-running a mount animation | The component genuinely mounts again |
| Resetting an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundary</a> | A fresh subtree, past the failure |
| Forcing an uncontrolled input to take a new <code>defaultValue</code> | <code>defaultValue</code> only applies on mount |
| Restarting a media player on a new source | Internal element state is discarded too |

📌 **Interview term:** that fourth row is a genuinely common trick. <code>defaultValue</code> is **initial only**, so it will not update a field the user has touched — see <a href="PASTE_CONTROLLED_UNCONTROLLED_URL_HERE" target="_blank" rel="noopener noreferrer">controlled versus uncontrolled</a>. Changing the key remounts the input, and the new default applies.

## 6. When not to

- **When only part of the state should reset.** The key is all-or-nothing; everything below goes.
- **When the state should be lifted instead.** If a parent owns the value, the child does not need resetting.
- **When the value can be derived during render.** Computing from props needs no reset at all.
- **When remounting is expensive.** A large subtree, a heavy chart, an editor that reloads a document.

📌 **Interview term:** and never <code>key={Math.random()}</code>. A new key every render means a remount every render — all state lost, all focus lost, full DOM reconstruction. It appears as a "fix" for a duplicate-key warning, where the real fix is a stable id.

## 7. Common Pitfalls

- **Resetting with an effect instead.** Verified stale render, plus the enumeration problem.
- **<code>key={Math.random()}</code>.** Remounts on every render.
- **Expecting a partial reset.** Everything below the key is discarded.
- **Keying a huge subtree.** A full remount can be far more expensive than clearing two fields.
- **Forgetting refs and DOM state reset too.** Scroll position and focus go with it.
- **Using an index as the key here.** Two records at the same position would not reset.
- **Keying too high.** Putting it on a layout wrapper remounts far more than intended.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the one-liner:</strong> <span style="color:#f0e2c8;">"Put key equals the record id on the form. A different key is a different component, so React unmounts the old one and mounts a fresh one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove it is a real remount:</strong> <span style="color:#f0e2c8;">"I have measured the lifecycle — unmount then mount. Changing a prop kept the typed draft; changing the key cleared it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Attack the effect version:</strong> <span style="color:#f0e2c8;">"Effects run after the commit, so there is one render showing the new record with the old user's text. And you have to enumerate every field — add one next month and it leaks between records."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Connect it to the general rule:</strong> <span style="color:#f0e2c8;">"It is the same mechanism that makes index keys corrupt a list — React matching children by key — just used deliberately."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope it honestly:</strong> <span style="color:#f0e2c8;">"It is all-or-nothing — everything below resets, including refs and DOM state. If only one field should change, lift it or derive it instead."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just reset in an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Three reasons. There is a render where the new record is shown with the old state, because effects run after the commit. You have to list every piece of state, and that list rots. And it costs an extra render. The key does all of it structurally, with nothing to keep in sync.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this an abuse of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is the documented use. Key means identity, and saying "this is a different form because it is a different user" is exactly what it is for. People find it surprising only because they first meet key in lists, where it looks like a lint requirement rather than a statement about identity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly gets reset?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything from that element down — its state, every descendant's state, refs, uncontrolled input values, scroll positions, focus, and any in-flight animation. Effects clean up and re-run. That thoroughness is the point, and it is also the reason to put the key on the smallest component that should be discarded rather than on a layout wrapper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a remount expensive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a form, negligible — you were re-rendering it anyway and the DOM is small. It matters for a big subtree, a heavy chart, or an editor that reloads a document on mount, where clearing two specific fields really is cheaper. Measure before assuming either way, but a typical form is not the case to worry about.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Any other good uses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Resetting an error boundary so the subtree gets a clean start after a failure, re-running a mount animation, and forcing an uncontrolled input to accept a new defaultValue — which otherwise only applies on mount and so silently ignores the new value once the user has typed.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>key</code>** | Component identity across renders |
| **Remount** | Unmount the old, mount a fresh one; all state lost |
| **Stale render** | One frame showing new props with old state |
| **Enumeration problem** | Having to list every piece of state to reset |
| **<code>defaultValue</code>** | Applied on mount only |

---
**Conclusion:** <code>key</code> is component **identity**, so a different key means a different component and React unmounts the old subtree and mounts a fresh one. Verified: changing a **prop** kept the typed draft (<code>"second:hello"</code>) while changing the **key** cleared it (<code>"second:"</code>), with a lifecycle of <strong>mount → unmount → mount</strong> confirming a genuine remount. That makes <code>&lt;ProfileForm key={userId} /&gt;</code> strictly better than an effect that clears state: no render showing the new record with the old user's text, and no list of fields to keep up to date. It is the same mechanism that makes index keys corrupt a list, used deliberately — all-or-nothing, so put it on the smallest component that should be discarded, and never on a random value.`,
    examples: [
      {
        label: "Switching records three ways: no reset, an effect, and a key",
        runnable: true,
        code: `import { useState, useEffect } from "react";

const USERS = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Grace" },
  { id: 3, name: "Alan" },
];

// The form under test. Draft is local state that must NOT survive a switch.
function ProfileForm({ user, resetWithEffect, onLifecycle }) {
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    onLifecycle("mount " + user.name);
    return () => onLifecycle("unmount " + user.name);
  }, []);

  // ❌ The effect approach. Runs AFTER the commit, so there is one render
  //    showing the new user with the previous user's draft. And every new
  //    piece of state has to be added here by hand, forever.
  useEffect(() => {
    if (!resetWithEffect) return;
    setDraft("");
    setTouched(false);
  }, [user.id, resetWithEffect]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13 }}>
        editing <strong>{user.name}</strong>
        {touched && <span style={{ color: "#a33" }}> · unsaved</span>}
      </div>
      <input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
        placeholder="type a note, then switch user"
        style={{ width: "100%", marginTop: 6 }}
      />
    </div>
  );
}

export default function App() {
  const [id, setId] = useState(1);
  const [mode, setMode] = useState("none");
  const [events, setEvents] = useState([]);
  const user = USERS.find((u) => u.id === id);
  const log = (s) => setEvents((l) => [...l, s].slice(-6));

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <div style={{ fontSize: 13, marginBottom: 6 }}>reset strategy:</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {[["none", "❌ none"], ["effect", "⚠️ effect"], ["key", "✅ key"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setEvents([]); }}
            style={{ fontWeight: mode === m ? "bold" : "normal" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {USERS.map((u) => (
          <button key={u.id} onClick={() => setId(u.id)}
            style={{ fontWeight: u.id === id ? "bold" : "normal" }}>
            {u.name}
          </button>
        ))}
      </div>

      {/* The ONLY difference between the working version and the broken one. */}
      <ProfileForm
        key={mode === "key" ? user.id : "static"}
        user={user}
        resetWithEffect={mode === "effect"}
        onLifecycle={log}
      />

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, marginTop: 12, minHeight: 70 }}>
{events.length ? events.join("\\n") : "lifecycle events appear here"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Type a note, then switch user. With <strong>none</strong> the draft
        follows you to the next record. With <strong>effect</strong> it clears —
        but watch the lifecycle log: no unmount happened, so anything you forgot
        to reset would persist. With <strong>key</strong> you get a real unmount
        and mount, and everything below starts fresh with nothing enumerated.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why does React 18 StrictMode double-invoke your components and effects?",
    seoDescription:
      "To surface impurity and missing cleanup before they become bugs. Verified: the component body, useMemo factory, effect and state updater each ran twice.",
    description: `**Question presented to candidate:**
"Your console log appears twice on mount and your effect fires twice. What is going on and should you fix it?"

**What a strong answer should cover:**
- **StrictMode deliberately runs things twice in development** to surface two classes of bug: **impure render** and **incomplete effect cleanup**.
- What is double-invoked: the **component function body**, \`useState\`/\`useReducer\` **initialisers and updater functions**, and \`useMemo\`/\`useCallback\` factories — everything that is supposed to be pure. If running it twice changes the result, it was not pure.
- Effects are treated differently: React **mounts, unmounts, then mounts again** — so you see effect, cleanup, effect. That tests whether your cleanup fully undoes the setup.
- Why it matters beyond development: React needs to be able to **discard and restart a render** for concurrent features, and to **remount** a component with preserved state. Code that breaks under the double-invoke would break there too.
- **It is development-only.** Production runs each once, so this is not a performance concern.
- The wrong fix is a ref guard to make the effect run once. That silences the alarm and leaves the fire — the effect is not idempotent, and it will misbehave the first time the component genuinely remounts.
- The right fix is a cleanup that fully reverses the setup: abort the request, unsubscribe, clear the timer.

**Clarifying questions expected:**
- "Is this development or production?" — the answer differs entirely.
- "Does the doubled run actually cause a problem?" — if yes, that is a real bug.

**Code / implementation expected:** Optional. An effect that breaks under the double-invoke and its fixed version is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes effects and cleanup.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The counts in section 3 were **executed against React 19.2.8** by rendering the same component with and without <code>StrictMode</code>. **A production build was not measured here** — the development-only claim comes from the documented behaviour, and this doc says so rather than implying otherwise.

## 1. Why This Even Matters — A Story First

An aircraft has two of everything that matters, and before each flight the crew runs a check that deliberately **fails one engine** to prove the other takes over.

It looks alarming to a passenger watching from the terminal. It is the opposite of alarming — it is the moment you find out the backup works, on the ground, rather than at thirty thousand feet.

StrictMode is that check. The doubled log is React failing an engine to see whether your code copes.

## 2. What it does, precisely

📌 **Interview term: StrictMode** — a development-only wrapper that intentionally runs certain things **twice** to expose code that assumes it will only run once.

It targets two distinct problems, in two different ways.

**Impure render** is caught by calling anything that should be pure **twice in a row** and letting you notice the difference.

**Incomplete cleanup** is caught by **mounting, unmounting, and mounting again** — so the effect runs, its cleanup runs, and the effect runs again.

## 3. Verified: exactly what runs twice

The same component rendered both ways, counting every callback.

| | With <code>StrictMode</code> | Without |
| :--- | :--- | :--- |
| Component function body | **2** | 1 |
| <code>useMemo</code> factory | **2** | 1 |
| Effect | **2** | 1 |
| Effect cleanup | **1** | 0 |
| <code>setState</code> updater function | **2** | 1 |

📌 **Interview term:** note that the **updater function** is in that list. If you write <code>setItems(items =&gt; { items.push(x); return items; })</code> — mutating instead of returning a new array — the double-invoke pushes twice, and you see the bug immediately instead of in three months.

📌 **Interview term:** and note the effect column: **2 effects, 1 cleanup**. That is <strong>effect → cleanup → effect</strong>, an unmount-and-remount simulation, not simply "the effect fires twice".

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="StrictMode runs pure functions twice and simulates a remount for effects">
  <defs>
    <marker id="sm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Two different checks, two different mechanisms</text>
  <text class="d-text d-accent" x="76" y="76" text-anchor="middle">purity</text>
  <rect class="d-box-accent" x="150" y="44" width="230" height="58" rx="9"/>
  <text class="d-sub" x="265" y="68" text-anchor="middle">render, useMemo, updaters</text>
  <text class="d-sub" x="265" y="88" text-anchor="middle">called twice in a row</text>
  <path class="d-edge-accent" d="M 386 73 L 428 73" marker-end="url(#sm-arrow)"/>
  <rect class="d-box" x="434" y="44" width="222" height="58" rx="9"/>
  <text class="d-sub" x="545" y="68" text-anchor="middle">different result the second time</text>
  <text class="d-sub" x="545" y="88" text-anchor="middle">means it was not pure</text>
  <text class="d-text" x="76" y="164" text-anchor="middle">cleanup</text>
  <rect class="d-box-muted" x="150" y="132" width="230" height="58" rx="9"/>
  <text class="d-sub" x="265" y="156" text-anchor="middle">effect, cleanup, effect</text>
  <text class="d-sub" x="265" y="176" text-anchor="middle">a simulated remount</text>
  <path class="d-edge" d="M 386 161 L 428 161" marker-end="url(#sm-arrow)"/>
  <rect class="d-box" x="434" y="132" width="222" height="58" rx="9"/>
  <text class="d-sub" x="545" y="156" text-anchor="middle">anything left behind</text>
  <text class="d-sub" x="545" y="176" text-anchor="middle">means the cleanup is incomplete</text>
</svg>

## 4. Why React needs this to be true

📌 **Interview term:** concurrent React may **start a render, abandon it, and start again** — that is what makes a <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer">transition</a> interruptible. A render with a side effect in it would fire that side effect on a render nobody ever sees.

📌 **Interview term:** and React reserves the right to **unmount and remount a component while preserving its state** — the basis of features that hide UI without destroying it. An effect that cannot survive teardown and setup breaks there.

So StrictMode is not testing arbitrary rules. It is testing the two assumptions React's architecture depends on, and it is doing it in development where a failure costs nothing.

## 5. The wrong fix, and the right one

The fetch that fires twice is the classic complaint. The tempting fix:

\`\`\`jsx
// ❌ Silences the alarm and leaves the fire.
const done = useRef(false);
useEffect(() => {
  if (done.current) return;
  done.current = true;
  fetch(url).then(setData);
}, [url]);
\`\`\`

📌 **Interview term:** this guard makes the symptom go away and leaves the effect **non-idempotent**. The first time the component genuinely remounts — a route revisit, a key change, a hidden-and-restored panel — it will refuse to fetch and render stale or empty data.

\`\`\`jsx
// ✅ The cleanup fully reverses the setup, so running twice is harmless.
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => { if (e.name !== "AbortError") setError(e); });
  return () => controller.abort();
}, [url]);
\`\`\`

That version also fixes the **race condition** where two in-flight requests resolve out of order — a real bug that exists with or without StrictMode. The doubled run just made it visible.

## 6. What it is not

- **Not a production behaviour.** Development only; each callback runs once in a production build.
- **Not a performance problem.** For the same reason.
- **Not something to disable.** Removing <code>&lt;StrictMode&gt;</code> to stop the doubled log is deleting the smoke detector.
- **Not new in 18** as a concept — the effect double-invoke is, and that is the part people notice.

## 7. Common Pitfalls

- **Guarding effects with a ref to force one run.** Breaks on any genuine remount.
- **Removing StrictMode.** The bugs remain; only the warning is gone.
- **Mutating in an updater function.** Verified: updaters run twice, so the mutation applies twice.
- **Side effects during render.** The double render fires them twice, which is the point.
- **Assuming it doubles in production.** It does not.
- **Fetching without an abort.** The double-invoke exposes a race that was always there.
- **Reading "effect ran twice" as "React is broken".** It is a test, and it passed or failed for a reason.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say it is deliberate:</strong> <span style="color:#f0e2c8;">"That is StrictMode in development, and it is intentional — it runs things twice to surface impure renders and incomplete cleanup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. List what doubles:</strong> <span style="color:#f0e2c8;">"The component body, useMemo factories, and state updater functions — everything that should be pure. I have counted them: two each, versus one without StrictMode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Describe effects precisely:</strong> <span style="color:#f0e2c8;">"Effects are different — it is effect, cleanup, effect. React simulates an unmount and remount to test that your cleanup fully reverses the setup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Explain why React cares:</strong> <span style="color:#f0e2c8;">"Concurrent React can abandon a render and restart it, and it can remount a component while preserving state. Code that fails the double-invoke fails there too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Answer "should I fix it":</strong> <span style="color:#f0e2c8;">"If it causes a problem, yes — but by fixing the cleanup, not by adding a ref guard. The guard breaks the first time the component genuinely remounts. And it is development-only, so it is never a performance issue."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">My fetch fires twice. How do I stop it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not stop it — make it harmless. Return a cleanup that aborts the request with an AbortController. That fixes the doubled call and the race where two in-flight requests resolve out of order, which was a real bug before StrictMode ever showed it to you. A ref guard fixes neither and adds a new one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this happen in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is development-only, so it costs nothing in a production build and is never a reason to remove StrictMode for performance. Which is also the reason not to rely on the doubling for anything: your code has to be correct whether a callback runs once or twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why double-invoke the state updater function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it must be pure too — React may need to replay it. If you mutate the previous state and return it rather than returning a new value, running it twice applies the mutation twice and the bug shows up immediately. Without the check, a mutating updater often appears to work until something re-orders the updates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it ever right to use a ref guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Very rarely, and only for something genuinely once-per-page-load that lives outside React's lifecycle — initialising an analytics SDK, say. Even then it belongs at module scope rather than in an effect. Inside a component the guard is nearly always hiding an effect that is not idempotent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the doubled run causes no problem at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then there is nothing to fix — the check passed. A duplicated console.log is not a bug, it is the noise of the test running. The question to ask is whether anything observable happened twice: two requests, two subscriptions, two increments. If not, your effect is idempotent and you are done.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **StrictMode** | A development wrapper that runs things twice |
| **Pure render** | Same inputs, same output, no side effects |
| **Idempotent effect** | Safe to set up, tear down, and set up again |
| **Updater function** | The callback form of <code>setState</code> |
| **<code>AbortController</code>** | Cancels an in-flight fetch from a cleanup |

---
**Conclusion:** StrictMode runs things twice in development on purpose, to expose the two assumptions React depends on. Verified against a non-StrictMode baseline: the **component body, the <code>useMemo</code> factory and the <code>setState</code> updater each ran twice** where they otherwise ran once — catching impure render — and effects ran as **effect → cleanup → effect** (2 effects, 1 cleanup), simulating an unmount and remount to catch incomplete cleanup. Both matter beyond development, because concurrent React may abandon and restart a render, and may remount a component while keeping its state. The fix for a doubled fetch is a cleanup that aborts it — never a ref guard, which hides the symptom and breaks the first time the component genuinely remounts. It is development-only, so it is never a performance concern.`,
    examples: [
      {
        label: "An effect that breaks under the double-invoke, and the cleanup that fixes it",
        runnable: true,
        code: `import { useState, useEffect, useRef, StrictMode } from "react";

// A module-level counter, so we can see side effects that actually escaped.
const stats = { started: 0, completed: 0, applied: 0 };

const fakeFetch = (id, signal) =>
  new Promise((resolve, reject) => {
    stats.started++;
    // Slower for the first id, so an out-of-order resolve is visible.
    const ms = id === 1 ? 700 : 200;
    const t = setTimeout(() => { stats.completed++; resolve("data for #" + id); }, ms);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    }
  });

// ❌ No cleanup. Under StrictMode it fires twice, and switching ids fast lets
//    a slow earlier request overwrite a fast later one.
function Naive({ id, onRender }) {
  const [data, setData] = useState("loading…");
  onRender();
  useEffect(() => {
    setData("loading…");
    fakeFetch(id).then((d) => { stats.applied++; setData(d); });
  }, [id]);
  return <Row label="❌ no cleanup" value={data} />;
}

// ❌ The tempting "fix": a ref guard. The doubled call goes away — and so does
//    any refetch when the component genuinely remounts or the id changes.
function Guarded({ id, onRender }) {
  const [data, setData] = useState("loading…");
  const done = useRef(false);
  onRender();
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fakeFetch(id).then((d) => { stats.applied++; setData(d); });
  }, [id]);
  return <Row label="❌ ref guard" value={data} />;
}

// ✅ A cleanup that fully reverses the setup. Safe to run twice, and it fixes
//    the out-of-order race that existed with or without StrictMode.
function Correct({ id, onRender }) {
  const [data, setData] = useState("loading…");
  onRender();
  useEffect(() => {
    const controller = new AbortController();
    setData("loading…");
    fakeFetch(id, controller.signal)
      .then((d) => { stats.applied++; setData(d); })
      .catch((e) => { if (e.name !== "AbortError") setData("error"); });
    return () => controller.abort();
  }, [id]);
  return <Row label="✅ abort on cleanup" value={data} />;
}

const Row = ({ label, value }) => (
  <div style={{ fontSize: 13, padding: "3px 0" }}>
    <code style={{ display: "inline-block", minWidth: 170 }}>{label}</code>
    {value}
  </div>
);

export default function App() {
  const [strict, setStrict] = useState(true);
  const [id, setId] = useState(1);
  const renders = useRef(0);
  const [, tick] = useState(0);

  const body = (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <Naive id={id} onRender={() => { renders.current++; }} />
      <Guarded id={id} onRender={() => {}} />
      <Correct id={id} onRender={() => {}} />
    </div>
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => {
          stats.started = stats.completed = stats.applied = 0;
          renders.current = 0;
          setStrict((s) => !s);
        }}>
          StrictMode: {strict ? "ON" : "off"}
        </button>
        <button onClick={() => setId(id === 1 ? 2 : 1)}>switch to #{id === 1 ? 2 : 1}</button>
        <button onClick={() => tick((n) => n + 1)}>refresh counts</button>
      </div>

      {strict ? <StrictMode key="s">{body}</StrictMode> : <div key="n">{body}</div>}

      <p style={{ fontSize: 13, color: "#666", marginTop: 10 }}>
        requests started: <strong>{stats.started}</strong> ·
        {" "}results applied to state: <strong>{stats.applied}</strong> ·
        {" "}Naive body ran: <strong>{renders.current}</strong>
        {" "}(press refresh — these are module counters, not state)
      </p>

      <p style={{ fontSize: 13, color: "#666" }}>
        Toggle StrictMode and press refresh: the naive row doubles its requests.
        Now switch ids quickly — the naive row can settle on the WRONG id
        because a slow earlier request lands last, and the guarded row never
        refetches at all. Only the aborting version is correct in both cases,
        which is the real lesson: StrictMode did not create these bugs.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you keep the UI responsive during an expensive update without a Suspense fallback flash?",
    seoDescription:
      "Wrap the update in a transition so React keeps the old UI. Verified: the same suspending update showed FALLBACK without one and no fallback at all with it.",
    description: `**Question presented to candidate:**
"Switching tabs replaces the content with a spinner for a moment, and typing in the filter box stutters. How do you fix both without changing the data layer?"

**What a strong answer should cover:**
- Two different problems that share a solution: **the fallback flash** (Suspense replacing visible content) and **input lag** (an expensive render blocking the keystroke).
- Wrapping the update in **\`startTransition\`** marks it non-urgent, and React then **keeps the already-visible content on screen** instead of showing the Suspense fallback.
- That only applies to content that has **already been shown**. A first load has nothing to keep, so the fallback still appears — which is correct.
- \`isPending\` gives you the affordance: dim the stale content, disable the control. Not a spinner replacing it, which recreates the flash you removed.
- For a value arriving from elsewhere — a prop, a controlled input — **\`useDeferredValue\`** is the same idea applied to a value you consume rather than an update you make.
- Deferring only helps if the expensive child is **memoised**, or both renders do the work.
- These reprioritise **rendering**. If the wait is the network, the fix is fetching earlier — preloading or hoisting the request.

**Clarifying questions expected:**
- "Is the delay rendering or fetching?" — transitions help the first only.
- "Is there already content on screen, or is this a first load?" — that decides whether the fallback is avoidable at all.

**Code / implementation expected:** Optional. Showing the same update with and without \`startTransition\` is the whole answer.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes Suspense and transitions.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The two runs in section 3 were **executed against React 19.2.8** — the same suspending update, with and without a transition. Related: <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer">what transitions do under the hood</a> and <a href="PASTE_USE_DEFERRED_VALUE_URL_HERE" target="_blank" rel="noopener noreferrer">useDeferredValue versus debouncing</a>.

## 1. Why This Even Matters — A Story First

A restaurant clears your plate the moment you order the next course, then leaves you staring at an empty table for six minutes.

Technically correct — the old plate is finished. It also feels far worse than simply leaving it there until the new dish is ready to set down.

A Suspense fallback replacing content the user was already reading is the empty table. The content was **fine**; it was removed early in the name of showing progress.

## 2. Two problems, one lever

📌 **Interview term: the fallback flash** — a Suspense boundary swapping visible content for its fallback because a new value inside it suspended. The user had something to read and it was taken away.

📌 **Interview term: input lag** — an expensive render blocking the keystroke, so characters appear late. Different symptom, same cause: React is treating an update as urgent when it is not.

📌 **Interview term:** the lever for both is **marking the update non-urgent**. React then keeps the current UI on screen and renders the new one in the background.

## 3. Verified: the same update, twice

A Suspense boundary showing resolved content, then updated to a value that suspends.

**Without a transition:**

\`\`\`
settled:                       "first"
immediately after the update:  "firstFALLBACK"    <- the fallback appeared
once resolved:                 "second"
\`\`\`

**The identical update wrapped in <code>startTransition</code>:**

\`\`\`
settled:                       "first"
immediately after the update:  "first"            <- old content kept
isPending seen:                [true, false]
once resolved:                 "second"
\`\`\`

📌 **Interview term:** the fallback **never rendered** in the second run. React held the previous content, flipped <code>isPending</code> to true, and swapped in the new content only when it was ready. One wrapper, and the empty table never happens.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Without a transition the fallback replaces the content while with one the old content is kept">
  <defs>
    <marker id="rf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">The same update, with and without a transition</text>
  <text class="d-text" x="66" y="76" text-anchor="middle">plain</text>
  <rect class="d-box-muted" x="130" y="48" width="130" height="46" rx="9"/>
  <text class="d-sub" x="195" y="76" text-anchor="middle">first</text>
  <path class="d-edge" d="M 266 71 L 310 71" marker-end="url(#rf-arrow)"/>
  <rect class="d-box" x="316" y="48" width="150" height="46" rx="9"/>
  <text class="d-sub" x="391" y="76" text-anchor="middle">FALLBACK</text>
  <path class="d-edge" d="M 472 71 L 516 71" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-muted" x="522" y="48" width="130" height="46" rx="9"/>
  <text class="d-sub" x="587" y="76" text-anchor="middle">second</text>
  <text class="d-text d-accent" x="66" y="164" text-anchor="middle">transition</text>
  <rect class="d-box-accent" x="130" y="136" width="130" height="46" rx="9"/>
  <text class="d-sub" x="195" y="164" text-anchor="middle">first</text>
  <path class="d-edge-accent" d="M 266 159 L 310 159" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-accent" x="316" y="136" width="150" height="46" rx="9"/>
  <text class="d-sub" x="391" y="153" text-anchor="middle">still first</text>
  <text class="d-sub" x="391" y="173" text-anchor="middle">pending, dimmed</text>
  <path class="d-edge-accent" d="M 472 159 L 516 159" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-accent" x="522" y="136" width="130" height="46" rx="9"/>
  <text class="d-sub" x="587" y="164" text-anchor="middle">second</text>
</svg>

## 4. The shape in practice

\`\`\`jsx
function Tabs() {
  const [tab, setTab] = useState("posts");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <nav style={{ opacity: isPending ? 0.6 : 1 }}>
        <button onClick={() => startTransition(() => setTab("posts"))}>Posts</button>
        <button onClick={() => startTransition(() => setTab("photos"))}>Photos</button>
      </nav>

      <Suspense fallback={<Skeleton />}>
        <TabPanel tab={tab} />
      </Suspense>
    </>
  );
}
\`\`\`

📌 **Interview term:** <code>isPending</code> is for a **light affordance on the stale content** — reduced opacity, a disabled control, a small inline indicator. If you use it to render a spinner in place of the content, you have rebuilt the flash by hand.

## 5. When the fallback is still correct

📌 **Interview term:** a transition can only preserve content that has **already been shown**. On a first load there is nothing to keep, so the fallback appears — and should. The skeleton is the right answer when the alternative is an empty page.

So the rule is: **fallback for the first load, transition for every subsequent change.** That is also why the fallback should be a real skeleton rather than a spinner — on the one occasion it renders, it is the user's first impression.

## 6. The other half: input lag

For a value you **consume** rather than an update you **make** — a controlled input feeding an expensive list — <a href="PASTE_USE_DEFERRED_VALUE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useDeferredValue</code></a> is the same mechanism from the other end:

\`\`\`jsx
const [text, setText] = useState("");
const deferred = useDeferredValue(text);
const stale = text !== deferred;          // the idiomatic staleness check

<input value={text} onChange={(e) => setText(e.target.value)} />
<div style={{ opacity: stale ? 0.5 : 1 }}>
  <Results query={deferred} />            {/* must be memoised */}
</div>
\`\`\`

📌 **Interview term:** the <code>memo</code> wrapper is **not optional** here. Without it the expensive child re-renders on the urgent pass too, and the deferral buys nothing while costing an extra render.

## 7. What this does not fix

| Symptom | Real fix |
| :--- | :--- |
| The render itself is slow | Cut the work — fewer elements, <a href="PASTE_OPTIMIZE_RENDERING_URL_HERE" target="_blank" rel="noopener noreferrer">virtualise the list</a> |
| The **network** is the wait | Fetch earlier — preload, hoist the request |
| A <a href="PASTE_SUSPENSE_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">waterfall</a> of dependent requests | Start them in parallel |
| First load shows a fallback | Correct behaviour; make the skeleton good |

📌 **Interview term:** transitions **reprioritise rendering**. They do not make anything faster, and they do nothing at all for a slow request.

## 8. Common Pitfalls

- **Rendering a spinner from <code>isPending</code>.** That is the flash again.
- **Wrapping the controlled input value in a transition.** The input must stay urgent.
- **Deferring without memoising the child.** No skip; one extra render.
- **Expecting it to avoid the first-load fallback.** There is nothing to keep.
- **Reaching for it when the network is the bottleneck.** Wrong layer.
- **Treating it as a speed-up.** It changes ordering, not cost.
- **Nesting a Suspense boundary too tightly.** A boundary right around the changing content will still flash; put it where the stable frame is outside it.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name both symptoms as one cause:</strong> <span style="color:#f0e2c8;">"The fallback flash and the input stutter are the same problem — React treating an update as urgent when it is not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the fix and the evidence:</strong> <span style="color:#f0e2c8;">"Wrap the update in startTransition. I have run the same suspending update both ways — without it the fallback rendered; with it the old content stayed and only isPending flipped."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Use isPending correctly:</strong> <span style="color:#f0e2c8;">"Dim the stale content or disable the tab — a light affordance. If I render a spinner instead of the content I have rebuilt the flash by hand."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover the typing case:</strong> <span style="color:#f0e2c8;">"For a value I consume rather than an update I make — a filter box feeding a big list — useDeferredValue does the same thing, provided the expensive child is memoised."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Bound it:</strong> <span style="color:#f0e2c8;">"It reprioritises rendering, not fetching. First load still shows the fallback, correctly — so the skeleton needs to be good, because that is the one time it appears."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a transition stop the fallback appearing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it tells React the update is not urgent, so React is allowed to keep showing the previous committed content while it prepares the new one in the background. Without that signal React assumes you want the newest state on screen as soon as possible, and the only way to show a suspending tree immediately is the fallback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work on the first load?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and it should not — there is no previous content to keep, so the fallback is the only thing to show. That is worth stating explicitly, because it means the skeleton still matters: it renders exactly once per session for that region, as the user's first impression of it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useDeferredValue</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I do not own the setState call — the value arrives as a prop, or it is a controlled input whose state must update urgently for typing to feel right. A transition marks an update I am making; deferring marks a value I am consuming. Same scheduler, different handle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the tab content is slow because of the request, not the render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then a transition improves how the wait looks but not how long it lasts, and I would attack the fetch instead — start it on hover or focus, hoist it above the component so it is not created during render, and check for a waterfall of dependent requests. Keeping the old content visible is still worth doing, but it is presentation, not a fix.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fallback flash** | Suspense replacing content the user was reading |
| **Transition** | An update marked non-urgent |
| **<code>isPending</code>** | True while the transition renders |
| **<code>useDeferredValue</code>** | A lagging copy of a value you consume |
| **Staleness check** | Comparing the live value with the deferred one |

---
**Conclusion:** the fallback flash and the input stutter are the same problem — an update treated as urgent when it is not — and the lever for both is marking it non-urgent. Verified on the same suspending update: without a transition the tree rendered <code>"firstFALLBACK"</code>, and wrapped in <code>startTransition</code> it stayed on <code>"first"</code> with <code>isPending</code> going true then false, and **the fallback never rendered**. Use <code>isPending</code> for a light affordance on the stale content, not a spinner that recreates the flash; use <code>useDeferredValue</code> with a **memoised** child for a value you consume rather than an update you make. A first load still shows the fallback, correctly — and none of this touches the network, so if the wait is the request, fix the fetching instead.`,
    examples: [
      {
        label: "Tab switching with and without a transition — watch the fallback",
        runnable: true,
        code: `import { useState, useTransition, Suspense, use } from "react";

// A tiny cache so each tab's promise is created ONCE and reused. Creating a
// promise during render would never settle — the promise must outlive the render.
const cache = new Map();
function loadTab(name) {
  const key = name;
  if (!cache.has(key)) {
    cache.set(key, new Promise((r) => setTimeout(() => r(name), 900)));
  }
  return cache.get(key);
}

function TabPanel({ tab }) {
  const loaded = use(loadTab(tab));
  return (
    <div style={{ padding: 12 }}>
      <strong style={{ fontSize: 14 }}>{loaded}</strong>
      <p style={{ fontSize: 13, color: "#555", margin: "6px 0 0" }}>
        Content for the {loaded} tab. Once you have seen this, a transition can
        keep it on screen while the next tab loads.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ background: "#e4e4e7", height: 16, width: 120, borderRadius: 4 }} />
      <div style={{ background: "#eee", height: 12, width: "90%", borderRadius: 4, marginTop: 8 }} />
      <div style={{ background: "#eee", height: 12, width: "70%", borderRadius: 4, marginTop: 6 }} />
      <div style={{ fontSize: 12, color: "#a33", marginTop: 8 }}>← the fallback is showing</div>
    </div>
  );
}

const TABS = ["Posts", "Photos", "Albums"];

export default function App() {
  const [tab, setTab] = useState("Posts");
  const [useTransitionMode, setMode] = useState(true);
  const [isPending, startTransition] = useTransition();

  const select = (t) => {
    if (useTransitionMode) startTransition(() => setTab(t));
    else setTab(t);                       // urgent: React must show something now
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <label style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={useTransitionMode}
          onChange={(e) => setMode(e.target.checked)}
        />
        {" "}wrap the update in <code>startTransition</code>
      </label>

      {/* isPending drives a LIGHT affordance — dimming, not a replacement. */}
      <nav style={{ display: "flex", gap: 6, opacity: isPending ? 0.55 : 1, transition: "opacity 120ms" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => select(t)}
            disabled={isPending}
            style={{ fontWeight: t === tab ? "bold" : "normal" }}
          >
            {t}
          </button>
        ))}
        {isPending && <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>loading…</span>}
      </nav>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, marginTop: 10, minHeight: 110,
                    opacity: isPending ? 0.55 : 1, transition: "opacity 120ms" }}>
        <Suspense fallback={<Skeleton />}>
          <TabPanel tab={tab} />
        </Suspense>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        The very first tab shows the skeleton either way — there is nothing to
        keep. After that, switch tabs with the box ticked: the previous content
        stays, dimmed, and swaps in when ready. Untick it and the same switch
        blanks the panel to the skeleton every time. Tabs you have already
        visited are cached, so use one you have not seen yet.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
