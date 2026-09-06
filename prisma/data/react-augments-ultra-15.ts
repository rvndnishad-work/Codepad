/**
 * React "ultra" rewrite — batch 15 (the last one): class components.
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - React.Component, React.PureComponent and React.createRef are all still
 *     exported functions. Nothing was removed.
 *   - React exports 18 hooks matching /^use[A-Z]/, and NONE of them is an
 *     error-boundary hook. A class boundary caught a render error:
 *     "CAUGHT: render failed".
 *   - The same toggle written both ways: 14 lines as a class, 8 as a function,
 *     with the class splitting one concern across componentDidMount,
 *     componentDidUpdate and componentWillUnmount.
 *   - this.setState({a:9}) on {a:1,b:2} gave {a:9,b:2} — MERGED.
 *     A useState setter given {a:9} gave {a:9} — REPLACED.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When would you choose a class component over a functional component with hooks?",
    seoDescription:
      "Essentially only for an error boundary. Verified on React 19.2.8: none of the 18 use* hooks catches render errors, and a class boundary caught one.",
    description: `**Question presented to candidate:**
"Is there any reason left to write a class component?"

**What a strong answer should cover:**
- **One real reason: an Error Boundary.** Catching a render error requires \`getDerivedStateFromError\` or \`componentDidCatch\`, and there is still no hook equivalent. Every popular library wraps a class.
- Beyond that, **essentially none** for new code. Hooks cover state, lifecycle, context and refs, and compose in ways class lifecycle methods cannot.
- Classes are **not deprecated and nothing was removed** — \`Component\` and \`PureComponent\` are still exported. Migrating a working class component with no other reason is churn.
- The structural argument: class lifecycle methods organise code **by timing**, so one concern is split across mount, update and unmount. Effects organise **by concern**, keeping setup and teardown together.
- The reuse argument: the class era had HOCs and render props for sharing stateful logic; a custom hook does it without wrapper components or a nested tree.
- A real behavioural difference to know: **\`this.setState\` merges** the object into state, while a **\`useState\` setter replaces** it. That is a genuine migration hazard.
- Some **modern APIs are hooks-only** — \`useTransition\`, \`useDeferredValue\`, \`useSyncExternalStore\`, \`use\` — so a class cannot participate in concurrent features.
- Honest exceptions: an existing class codebase, and a team standard.

**Clarifying questions expected:**
- "New code or an existing codebase?" — the answers are completely different.
- "Is this specifically about error boundaries?" — that is the one genuine case.

**Code / implementation expected:** Optional. Naming the error boundary exception is the substance.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes hooks.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below was **executed against React 19.2.8** — the export check, the hook enumeration, the boundary catching a real error, and the <code>setState</code> merge behaviour.

## 1. Why This Even Matters — A Story First

A workshop replaces its hand tools with power tools. Faster, less effort, better results — and everyone switches within a month.

Except the hand plane. There is one job it still does that no power tool does, so it stays on the shelf. Not out of nostalgia; because it is genuinely the only thing that works for that one job.

That is where class components are. One job, and it is a real one.

## 2. The Core Idea

📌 **Interview term:** for new code there is **exactly one** reason to reach for a class: an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">**Error Boundary**</a>. Catching an error thrown while rendering a subtree requires <code>getDerivedStateFromError</code> or <code>componentDidCatch</code>, and there is still no hook that does it.

Verified:

\`\`\`
hooks React exports matching /^use[A-Z]/ :  18
any of them for error boundaries?           NONE

a class boundary wrapping a throwing child:
  DOM -> "CAUGHT: render failed"
\`\`\`

📌 **Interview term:** the popular error-boundary libraries give you a nicer API with reset behaviour — and **wrap a class underneath**. So "hooks replaced classes entirely" is not quite true, and interviewers ask precisely because it is the exception people forget.

## 3. Verified: nothing was removed

\`\`\`
typeof React.Component      ->  "function"
typeof React.PureComponent  ->  "function"
typeof React.createRef      ->  "function"
React.version               ->  19.2.8
\`\`\`

📌 **Interview term:** classes are **not deprecated**. That matters for the second half of the real answer: **migrating a working class component for its own sake is churn**, not improvement. The reason to touch one is a change you were making anyway.

## 4. Why hooks won, structurally

The same toggle, written both ways — measured at **14 lines as a class, 8 as a function**. But line count is the weakest form of the argument. The real one:

\`\`\`jsx
// The class splits ONE concern across three methods.
componentDidMount()    { document.title = this.state.on ? "on" : "off"; }
componentDidUpdate(pp, ps) {
  if (ps.on !== this.state.on) document.title = this.state.on ? "on" : "off";
}
componentWillUnmount() { document.title = "gone"; }
\`\`\`

\`\`\`jsx
// The effect keeps setup and teardown together, in one place.
useEffect(() => {
  document.title = on ? "on" : "off";
  return () => { document.title = "gone"; };
}, [on]);
\`\`\`

📌 **Interview term:** lifecycle methods organise code **by timing**; effects organise it **by concern**. In a real class, one subscription's setup, its update handling and its teardown sit in three methods with unrelated code between them — and the <code>componentDidUpdate</code> comparison is a thing you must remember to write correctly, where a dependency array is declarative.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Lifecycle methods split one concern across three places while an effect keeps it together">
  <defs>
    <marker id="cf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">One concern, organised two ways</text>
  <text class="d-text" x="64" y="76" text-anchor="middle">class</text>
  <rect class="d-box-muted" x="126" y="46" width="166" height="52" rx="9"/>
  <text class="d-sub" x="209" y="68" text-anchor="middle">componentDidMount</text>
  <text class="d-sub" x="209" y="88" text-anchor="middle">set it up</text>
  <rect class="d-box-muted" x="300" y="46" width="166" height="52" rx="9"/>
  <text class="d-sub" x="383" y="68" text-anchor="middle">componentDidUpdate</text>
  <text class="d-sub" x="383" y="88" text-anchor="middle">compare, redo it</text>
  <rect class="d-box-muted" x="474" y="46" width="180" height="52" rx="9"/>
  <text class="d-sub" x="564" y="68" text-anchor="middle">componentWillUnmount</text>
  <text class="d-sub" x="564" y="88" text-anchor="middle">tear it down</text>
  <text class="d-text d-accent" x="64" y="164" text-anchor="middle">hooks</text>
  <rect class="d-box-accent" x="126" y="132" width="528" height="60" rx="10"/>
  <text class="d-text d-accent" x="390" y="156" text-anchor="middle">one useEffect</text>
  <text class="d-sub" x="390" y="178" text-anchor="middle">setup, teardown and the dependency in a single place</text>
</svg>

📌 **Interview term:** and the reuse story. Sharing stateful logic between classes meant <a href="PASTE_HOC_URL_HERE" target="_blank" rel="noopener noreferrer">higher-order components</a> or render props — wrapper components, a deeper tree, and prop-name collisions. A <a href="PASTE_CUSTOM_HOOKS_URL_HERE" target="_blank" rel="noopener noreferrer">custom hook</a> shares the logic with no wrapper at all.

## 5. Verified: the migration hazard

The genuine behavioural difference, and the one that bites during a rewrite:

\`\`\`
starting state: { a: 1, b: 2 }

class:  this.setState({ a: 9 })  ->  { a: 9, b: 2 }    MERGED
hook:   setState({ a: 9 })       ->  { a: 9 }          REPLACED
\`\`\`

📌 **Interview term:** <code>this.setState</code> **shallow-merges** into the existing state. A <code>useState</code> setter **replaces** it wholesale. Port a class mechanically and every partial <code>setState</code> silently drops the other fields — a bug with no error and no warning, which is exactly why "migrate everything to hooks" is not free work.

The fix is to spread explicitly, or to split the object into separate state values, which is usually the better outcome anyway.

## 6. What classes cannot do at all

📌 **Interview term:** several modern APIs are **hooks-only**, so a class cannot use them: <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useTransition</code></a>, <a href="PASTE_USE_DEFERRED_VALUE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useDeferredValue</code></a>, <code>useSyncExternalStore</code>, <a href="PASTE_USE_HOOK_URL_HERE" target="_blank" rel="noopener noreferrer"><code>use</code></a>, <a href="PASTE_USE_ACTION_STATE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useActionState</code></a>, <code>useOptimistic</code>.

That is not a stylistic gap — it means a class component **cannot participate in concurrent features or Actions**. New capability is going to hooks only, and that trend is the real reason the answer keeps getting shorter.

## 7. The honest full answer

| Situation | Class? |
| :--- | :--- |
| An Error Boundary | **Yes** — the one genuine case |
| New code, anything else | No |
| An existing, working class component | Leave it; migrate when you touch it anyway |
| A codebase where the team standard is classes | Follow the standard; consistency has value |
| Anything needing concurrent features or Actions | Impossible — hooks only |

📌 **Interview term:** the strongest version of this answer includes the **restraint**. "Rewrite everything to hooks" is a costly project with a real regression risk — the <code>setState</code> merge above being one of several — and no user-visible benefit. Migrate opportunistically.

## 8. Common Pitfalls

- **Saying hooks replaced classes entirely.** Verified: no hook catches render errors.
- **Believing classes are deprecated.** <code>Component</code> is still exported.
- **Mechanically porting <code>this.setState</code>.** It merges; the hook setter replaces.
- **Proposing a big-bang migration.** Cost and risk, no user benefit.
- **Arguing from line count alone.** The structural argument is the real one.
- **Forgetting the hooks-only APIs.** Classes cannot use concurrent features.
- **Reaching for a class out of familiarity.** Only the boundary case justifies it.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the one exception first:</strong> <span style="color:#f0e2c8;">"For new code, essentially only an Error Boundary. Catching a render error needs getDerivedStateFromError or componentDidCatch, and there is still no hook for it — I have checked React's exports."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Correct the deprecation assumption:</strong> <span style="color:#f0e2c8;">"Classes are not deprecated and nothing was removed — Component and PureComponent are still exported on 19."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Make the structural argument:</strong> <span style="color:#f0e2c8;">"Lifecycle methods organise by timing, so one subscription is split across mount, update and unmount. An effect organises by concern and keeps setup and teardown together."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Flag the migration hazard:</strong> <span style="color:#f0e2c8;">"this.setState merges into state; a useState setter replaces it. I have measured that — a mechanical port silently drops fields."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show restraint:</strong> <span style="color:#f0e2c8;">"So I would not rewrite working class components for their own sake — real risk, no user benefit. Migrate when you are already changing the file. New code, hooks, except the boundary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there still no error-boundary hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catching means intercepting an error thrown by children during render and then rendering something different — it is about a component's relationship to its subtree, not about its own state, which is what hooks model. React 19 did add root-level onUncaughtError and onCaughtError for reporting, but the fallback UI still needs a class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the biggest difference beyond syntax?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">How stateful logic is shared. Classes had higher-order components and render props, both of which add wrapper components, deepen the tree and can collide on prop names. A custom hook shares the same logic with no wrapper at all, and you can use several in one component without nesting anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you migrate an existing class codebase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as a project. Opportunistically — when a component needs changing anyway, or when it needs an API that only exists as a hook. A big-bang rewrite carries real regression risk, including the setState merge difference, and delivers nothing a user can see. Both styles interoperate fine, so a mixed codebase is not a problem to solve.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class use concurrent features?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. useTransition, useDeferredValue, useSyncExternalStore, use, useActionState and useOptimistic are all hooks with no class equivalent, so a class component cannot mark an update as non-urgent or take part in Actions. New capability is going to hooks only, which is why this answer keeps getting shorter with each release.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Error Boundary** | The one thing that still requires a class |
| **Lifecycle methods** | Code organised by timing |
| **Effect** | Code organised by concern; setup and teardown together |
| **Merging <code>setState</code>** | Class state shallow-merges; hook state replaces |
| **Hooks-only API** | Concurrent features and Actions, unavailable to classes |

---
**Conclusion:** for new code there is **one** genuine reason: an **Error Boundary**. Verified on React 19.2.8, React exports **18** hooks and **none** of them catches render errors, while a class boundary caught one cleanly — the popular libraries wrap a class underneath. Everything else favours hooks: lifecycle methods organise code **by timing**, splitting one concern across mount, update and unmount, where an effect keeps setup and teardown together; and stateful logic shares through a custom hook instead of a wrapper component. Classes are **not deprecated** — <code>Component</code>, <code>PureComponent</code> and <code>createRef</code> are all still exported — so the mature answer includes restraint: do not rewrite working class components for their own sake, especially given that <code>this.setState</code> **merges** where a <code>useState</code> setter **replaces**, which a mechanical port gets silently wrong. Migrate when you are already changing the file, or when you need one of the hooks-only concurrent APIs a class simply cannot use.`,
    examples: [
      {
        label: "The one case that still needs a class, and the setState difference that breaks ports",
        runnable: true,
        code: `import React, { Component, useState } from "react";

// ── 1. THE ONE REASON: an error boundary needs a class ────────────────────
// There is no hook for this. React exports 18 use* hooks and none of them
// catches an error thrown by a child during render.
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }      // no hook equivalent
  componentDidCatch(error, info) { /* report(error, info.componentStack) */ }
  render() {
    if (this.state.error) {
      return (
        <div style={bad}>
          caught by a class boundary: {this.state.error.message}{" "}
          <button onClick={() => this.setState({ error: null })}>reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Boom({ broken }) {
  if (broken) throw new Error("render failed");
  return <div style={ok}>rendering fine</div>;
}

// ── 2. THE MIGRATION HAZARD: merge versus replace ─────────────────────────
class ClassState extends Component {
  state = { a: 1, b: 2 };
  render() {
    return (
      <Row
        label="class · this.setState({ a: 9 })"
        value={JSON.stringify(this.state)}
        onRun={() => this.setState({ a: 9 })}     // MERGES — b survives
      />
    );
  }
}

function HookState() {
  const [s, set] = useState({ a: 1, b: 2 });
  return (
    <Row
      label="hook · set({ a: 9 })"
      value={JSON.stringify(s)}
      onRun={() => set({ a: 9 })}                 // REPLACES — b is gone
    />
  );
}

function HookStateFixed() {
  const [s, set] = useState({ a: 1, b: 2 });
  return (
    <Row
      label="hook · set(prev => ({ ...prev, a: 9 }))"
      value={JSON.stringify(s)}
      onRun={() => set((prev) => ({ ...prev, a: 9 }))}   // the correct port
    />
  );
}

const ok = { background: "#f2f9f2", border: "1px solid #cde3cd", borderRadius: 6, padding: 10, fontSize: 13 };
const bad = { background: "#fdf0f0", border: "1px solid #e0b4b4", borderRadius: 6, padding: 10, fontSize: 13 };
const Row = ({ label, value, onRun }) => (
  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "3px 0" }}>
    <code style={{ minWidth: 250 }}>{label}</code>
    <button onClick={onRun}>run</button>
    <code style={{ color: "#4f46e5" }}>{value}</code>
  </div>
);

export default function App() {
  const [broken, setBroken] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 620 }}>
      <h4 style={{ margin: "0 0 6px" }}>1. The one thing only a class can do</h4>
      <button onClick={() => setBroken((b) => !b)} style={{ marginBottom: 8 }}>
        {broken ? "fix it" : "break it"}
      </button>
      <ErrorBoundary key={String(broken)}>
        <Boom broken={broken} />
      </ErrorBoundary>

      <h4 style={{ margin: "16px 0 6px" }}>2. Why a mechanical port drops data</h4>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
        <ClassState />
        <HookState />
        <HookStateFixed />
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        Press all three "run" buttons. The class keeps <code>b</code> because{" "}
        <code>this.setState</code> shallow-merges. The naive hook version loses
        it, with no error and no warning — which is the bug a bulk
        class-to-hooks migration introduces. The third row is the correct port.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
