/**
 * React "ultra" rewrite — batch 05 (core hooks + effects/data fetching).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals — not in markdown code spans and not
 * in code comments. Use <code> tags in answers, plain words in comments.
 * Keep every seoDescription under 155 characters.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - Calling a hook conditionally throws "Rendered fewer hooks than expected.
 *     This may be caused by an accidental early return statement."
 *   - Deriving state in an effect took 2 renders to settle; computing the same
 *     value during render took 1.
 *   - Three room changes plus an unmount produced 3 connects and 3 disconnects,
 *     perfectly interleaved.
 *   - An async effect callback warns: "must not return anything besides a
 *     function, which is used for clean-up."
 *   - Unguarded fetch for id 1 then id 2 settled on user-1 (STALE); the
 *     cancellation-flag version settled on user-2.
 *   - use(promise) inside Suspense showed "loading..." then "resolved data".
 *   - React 19.2.8 exports 18 use* hooks (list in the Hooks answer).
 *
 * Three effect docs deliberately take different angles and cross-link:
 * "handle side effects" (ultra-01) is the strategy, "purpose of useEffect" is
 * when NOT to reach for one, "cleanup function" is the teardown mechanics.
 * Likewise the three data docs: "fetch data" is the landscape, "async
 * operations" is the mechanics, "Async Server Components" is the RSC angle.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are React Hooks? Name a few common ones.",
    seoDescription:
      "Hooks let function components use state and other React features. React 19.2.8 ships 18 of them; useState, useEffect and useContext cover most work.",
    description: `**Question presented to candidate:**
"What are Hooks, why were they introduced, and which ones do you actually reach for?"

**What a strong answer should cover:**
- Hooks are functions that let a **function component** use React features — state, effects, context, refs — that previously required a class.
- Introduced in React 16.8 (2019). The motivation: sharing **stateful logic** was only possible via HOCs and render props, both of which added wrapper components.
- The Rules of Hooks: call them **unconditionally, at the top level**, and only from a component or another hook.
- The common ones, grouped: \`useState\`/\`useReducer\` (state), \`useEffect\`/\`useLayoutEffect\` (effects), \`useContext\` (context), \`useRef\` (persistent values and DOM), \`useMemo\`/\`useCallback\` (memoisation).
- Modern additions worth naming: \`useTransition\`, \`useDeferredValue\`, \`useSyncExternalStore\`, \`useId\`, and the React 19 set — \`useActionState\`, \`useOptimistic\`, \`useEffectEvent\`.
- **Custom hooks** are the payoff: any \`use\`-prefixed function composing other hooks.
- They did not replace classes for everything — Error Boundaries still need one.

**Clarifying questions expected:**
- "Do you want the full list, or the ones I use day to day?"

**Code / implementation expected:** Optional. A component using two or three hooks together is enough.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes components and props.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The hook inventory in section 4 was read directly off the installed React 19.2.8 rather than recalled, which matters because several were added recently.

## 1. Why This Even Matters — A Story First

Imagine a workshop where only the master craftsmen were allowed to own tools. Apprentices could do the work, but any job needing a tool had to be handed to a master, wrapped up, and handed back. Sharing a technique between apprentices meant routing it through a master too — so the workshop filled up with intermediaries who did nothing but hold tools.

Hooks handed the tools directly to the apprentices. Function components could suddenly own state and effects themselves, and the intermediaries — the wrapper components — were no longer needed.

## 2. The Core Idea

📌 **Interview term: Hook** — a function that lets a **function component** use React features such as state, side effects, context, and refs. Before Hooks (React 16.8, February 2019) those required a class component.

The name is literal: a hook lets your component *hook into* React internal machinery for the duration of a render.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Hooks grouped by what they give a function component access to">
  <text class="d-text" x="330" y="24" text-anchor="middle">What each group of hooks gives you access to</text>
  <rect class="d-box-accent" x="16" y="48" width="200" height="76" rx="10"/>
  <text class="d-text d-accent" x="116" y="74" text-anchor="middle">State</text>
  <text class="d-sub" x="116" y="96" text-anchor="middle">useState</text>
  <text class="d-sub" x="116" y="114" text-anchor="middle">useReducer</text>
  <rect class="d-box-accent" x="230" y="48" width="200" height="76" rx="10"/>
  <text class="d-text d-accent" x="330" y="74" text-anchor="middle">Side effects</text>
  <text class="d-sub" x="330" y="96" text-anchor="middle">useEffect</text>
  <text class="d-sub" x="330" y="114" text-anchor="middle">useLayoutEffect</text>
  <rect class="d-box-accent" x="444" y="48" width="200" height="76" rx="10"/>
  <text class="d-text d-accent" x="544" y="74" text-anchor="middle">Escape hatches</text>
  <text class="d-sub" x="544" y="96" text-anchor="middle">useRef</text>
  <text class="d-sub" x="544" y="114" text-anchor="middle">useImperativeHandle</text>
  <rect class="d-box" x="16" y="140" width="200" height="76" rx="10"/>
  <text class="d-text" x="116" y="166" text-anchor="middle">Shared values</text>
  <text class="d-sub" x="116" y="188" text-anchor="middle">useContext</text>
  <text class="d-sub" x="116" y="206" text-anchor="middle">useSyncExternalStore</text>
  <rect class="d-box" x="230" y="140" width="200" height="76" rx="10"/>
  <text class="d-text" x="330" y="166" text-anchor="middle">Performance</text>
  <text class="d-sub" x="330" y="188" text-anchor="middle">useMemo</text>
  <text class="d-sub" x="330" y="206" text-anchor="middle">useCallback</text>
  <rect class="d-box" x="444" y="140" width="200" height="76" rx="10"/>
  <text class="d-text" x="544" y="166" text-anchor="middle">Concurrency</text>
  <text class="d-sub" x="544" y="188" text-anchor="middle">useTransition</text>
  <text class="d-sub" x="544" y="206" text-anchor="middle">useDeferredValue</text>
</svg>

## 3. Why they were introduced

Three problems, all real:

- **Sharing stateful logic required wrappers.** <a href="PASTE_HOC_URL_HERE" target="_blank" rel="noopener noreferrer">HOCs</a> and <a href="PASTE_RENDER_PROPS_URL_HERE" target="_blank" rel="noopener noreferrer">render props</a> both added components to the tree just to carry logic.
- **Related code was split across lifecycles.** A subscription lived in <code>componentDidMount</code> and its teardown in <code>componentWillUnmount</code>, while two unrelated concerns shared one method.
- **Classes were a barrier.** <code>this</code>, binding, and constructors were friction with no upside for most components.

📌 **Interview term:** Hooks solve all three at once — logic groups by *concern* rather than by lifecycle, sharing needs no wrapper, and there is no <code>this</code>.

## 4. Verified: what React 19.2.8 actually ships

Reading the hooks off the installed package:

\`\`\`
useActionState, useCallback, useContext, useDebugValue, useDeferredValue,
useEffect, useEffectEvent, useId, useImperativeHandle, useInsertionEffect,
useLayoutEffect, useMemo, useOptimistic, useReducer, useRef, useState,
useSyncExternalStore, useTransition
count: 18
\`\`\`

Two of those are worth flagging because their status is often misremembered: <code>useEffectEvent</code> is a **stable export** here, not experimental, and <code>useActionState</code> and <code>useOptimistic</code> are the React 19 form-handling additions. (<code>useFormStatus</code> is not in this list because it ships from <a href="PASTE_REACT_DOM_URL_HERE" target="_blank" rel="noopener noreferrer">react-dom</a>, not <code>react</code> — a detail interviewers like.)

## 5. The ones that actually come up

| Hook | What it does | Reach for it when |
| :--- | :--- | :--- |
| <code>useState</code> | Local state | Almost always |
| <code>useEffect</code> | Synchronise with an external system | Subscriptions, timers, non-React widgets |
| <code>useContext</code> | Read a context value | Theme, locale, current user |
| <code>useRef</code> | A persistent value that does not render | Timer ids, DOM nodes, previous values |
| <code>useMemo</code> | Cache an expensive computed value | Measured cost, stable deps |
| <code>useCallback</code> | Keep a function identity stable | Passing to a memoised child |
| <code>useReducer</code> | Centralised state transitions | Several fields changing together |

## 6. The Rules of Hooks

📌 **Interview term:** call hooks **unconditionally**, at the **top level** of a component or another hook — never inside a condition, loop, or nested function. React matches hooks to their stored state by **call order**, so changing the order corrupts the mapping. See <a href="PASTE_RULES_OF_HOOKS_URL_HERE" target="_blank" rel="noopener noreferrer">the underlying mechanism</a> for the verified failure.

And the payoff: 📌 **Interview term: custom hook** — any <code>use</code>-prefixed function that calls other hooks. That is the whole reuse story, and it needs no wrapper component at all. See <a href="PASTE_CUSTOM_HOOKS_URL_HERE" target="_blank" rel="noopener noreferrer">custom hooks</a>.

## 7. Common Pitfalls

- **Calling a hook conditionally.** It breaks the positional mapping and React throws.
- **Calling one outside a component.** Hooks only work during a render.
- **Believing Hooks replaced classes entirely.** Error Boundaries still require a class.
- **Reaching for <code>useEffect</code> reflexively.** Much of what people put in effects belongs in render or an event handler — see <a href="PASTE_USEEFFECT_URL_HERE" target="_blank" rel="noopener noreferrer">the purpose of useEffect</a>.
- **Assuming a shared custom hook means shared state.** Each caller gets its own.
- **Memoising everything.** <code>useMemo</code> and <code>useCallback</code> have a cost; use them where measured.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define them in one line:</strong> <span style="color:#f0e2c8;">"Functions that let a function component use React features — state, effects, context, refs — that used to require a class. React 16.8 onward."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the motivation, not just the list:</strong> <span style="color:#f0e2c8;">"Before them, sharing stateful logic meant HOCs or render props, which both added wrapper components. And related code was split across lifecycle methods."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name them in groups:</strong> <span style="color:#f0e2c8;">state, effects, context, refs, memoisation, and the concurrency set. Grouping reads far better than a flat recitation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State the rules and why:</strong> <span style="color:#f0e2c8;">"Top level, unconditional, only from a component or another hook — because React matches hooks to state by call order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish on custom hooks:</strong> <span style="color:#f0e2c8;">"The real payoff — any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code>-prefixed function composing other hooks, and no wrapper component anywhere."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why were Hooks introduced?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mainly to make stateful logic reusable without wrapper components. Secondarily, so related code groups together — a subscription and its teardown sit in one effect instead of being split between <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">componentDidMount</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">componentWillUnmount</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you call a hook inside a condition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. React matches each hook to its stored state by call order, so a skipped call shifts every hook after it onto the wrong slot. It throws — "Rendered fewer hooks than expected". Put the condition inside the hook instead of around it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did Hooks make class components obsolete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Almost. Classes still work and are not deprecated, and Error Boundaries remain class-only because <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">getDerivedStateFromError</code> has no Hook equivalent. For everything else, functions with Hooks are the default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which hooks did React 19 add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useOptimistic</code> for form actions and optimistic UI, plus <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffectEvent</code>. Also <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code>, which is not strictly a hook since it may be called conditionally. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useFormStatus</code> comes from <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What makes something a custom hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> prefix plus calling other hooks. React does not register anything — the convention exists for humans and for the ESLint plugin, which uses the name to decide where to enforce the Rules of Hooks.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hook** | A function giving a component access to a React feature |
| **Rules of Hooks** | Top level, unconditional, only in components or hooks |
| **Custom hook** | A <code>use</code>-prefixed function composing other hooks |
| **Stateful logic** | Behaviour that needs to remember something between renders |
| **<code>useEffectEvent</code>** | Reads the latest value without being a dependency |

---
**Conclusion:** Hooks are functions that let a function component use state, effects, context, and refs — features that once required a class. They arrived in React 16.8 to solve a specific problem: sharing stateful logic previously meant HOCs or render props, both of which added wrapper components to the tree. React 19.2.8 ships eighteen of them, and the handful you use daily are <code>useState</code>, <code>useEffect</code>, <code>useContext</code>, and <code>useRef</code>. The rules exist because React matches hooks to their state by call order, which is also why custom hooks — any <code>use</code>-prefixed function composing others — became the reuse mechanism that replaced the wrappers.`,
    examples: [
      {
        label: "Six common hooks working together in one small component",
        runnable: true,
        code: `import {
  useState, useEffect, useRef, useMemo, useCallback, useId, useContext, createContext,
} from "react";

const ThemeContext = createContext("light");

// A custom hook: composes two built-ins, shares logic with no wrapper component.
function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id); // cleanup cancels the pending timer
  }, [value, ms]);
  return debounced;
}

const FRUIT = ["apple", "apricot", "banana", "blackberry", "cherry", "cranberry", "date"];

function Search() {
  const [query, setQuery] = useState("");          // useState  — local state
  const theme = useContext(ThemeContext);          // useContext — shared value
  const inputId = useId();                         // useId      — stable SSR-safe id
  const renders = useRef(0);                       // useRef     — persists, no re-render
  renders.current++;

  const debounced = useDebounced(query, 300);      // the custom hook

  // useMemo — recompute only when the debounced query actually changes.
  const results = useMemo(
    () => FRUIT.filter((f) => f.startsWith(debounced.toLowerCase())),
    [debounced],
  );

  // useCallback — a stable identity, safe to pass to a memoised child.
  const clear = useCallback(() => setQuery(""), []);

  return (
    <div style={{ color: theme === "dark" ? "#eee" : "#111" }}>
      <label htmlFor={inputId}>Filter fruit: </label>
      <input id={inputId} value={query} onChange={(e) => setQuery(e.target.value)} />{" "}
      <button onClick={clear}>clear</button>

      <p style={{ fontSize: 13, color: "#666" }}>
        typed: <strong>{query || "(empty)"}</strong> · debounced:{" "}
        <strong>{debounced || "(empty)"}</strong> · renders: <strong>{renders.current}</strong>
      </p>

      <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
      {results.length === 0 && <p style={{ color: "#a33" }}>No matches.</p>}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <ThemeContext.Provider value="light">
        <Search />
      </ThemeContext.Provider>
      <p style={{ color: "#666", fontSize: 13 }}>
        Type quickly: the debounced value lags 300ms behind, and the filter only
        recomputes when it settles. The render counter comes from a ref, so
        reading it never causes a render of its own.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the purpose of `useEffect`.",
    seoDescription:
      "useEffect synchronises a component with an external system after render. Verified: deriving state in an effect took 2 renders where computing it took 1.",
    description: `**Question presented to candidate:**
"What is \`useEffect\` for — and, just as importantly, what is it *not* for?"

**What a strong answer should cover:**
- The modern framing: an effect **synchronises a component with an external system** — the network, a subscription, the DOM, a timer. It is not a general-purpose lifecycle hook.
- It runs **after** render and after the browser paints, so it never blocks the visible update.
- The dependency array decides when it re-runs; the returned cleanup undoes the previous run.
- **The most valuable half of the answer: when not to use one.** Derived values belong in render; user-action responses belong in event handlers.
- Deriving state in an effect costs an extra render pass and leaves a moment where the UI shows the stale value.
- Effects are an **escape hatch** from the React paradigm — the React docs categorise them that way deliberately.
- Common wrong uses: transforming data for display, resetting state on prop change (use \`key\`), and doing work that belongs in a submit handler.
- \`useLayoutEffect\` as the pre-paint exception; \`useEffectEvent\` for non-reactive logic inside an effect.

**Clarifying questions expected:**
- "Is this synchronising with something outside React, or transforming data we already have?" — that single question decides whether an effect belongs at all.

**Code / implementation expected:** Yes — an effect that genuinely synchronises, beside a derived value that should not be one.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useState</code>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render counts in section 4 were measured on React 19.2.8. This doc focuses on *when an effect is the wrong tool*; see <a href="PASTE_SIDE_EFFECTS_URL_HERE" target="_blank" rel="noopener noreferrer">handling side effects</a> for the broader strategy and <a href="PASTE_CLEANUP_URL_HERE" target="_blank" rel="noopener noreferrer">the cleanup function</a> for teardown mechanics.

## 1. Why This Even Matters — A Story First

A thermostat has one job: keep the room matching the number on the dial. It does not decide what the number should be, and it does not calculate anything — it just keeps two things in sync, continuously, and stops when you unplug it.

That is what an effect is for. Your component has a state; something outside React has a state; the effect keeps them matching. If you find yourself using a thermostat to do arithmetic, you have the wrong tool.

## 2. The Core Idea

📌 **Interview term: <code>useEffect</code>** — a hook for **synchronising a component with an external system**. It runs after render and after the browser paints, its dependency array controls when it re-runs, and the function it returns cleans up the previous run.

\`\`\`jsx
useEffect(() => {
  const conn = connectToRoom(roomId);   // synchronise: start
  return () => conn.disconnect();       // synchronise: stop
}, [roomId]);
\`\`\`

📌 **Interview term:** the React docs classify effects as an **escape hatch** — a deliberate way to step *outside* the declarative model. That framing is the whole answer to "what is it not for": if you are still inside the model, transforming data you already have, you do not need one.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="A decision path showing when an effect is the right tool and when it is not">
  <defs>
    <marker id="ue-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Do you actually need an effect?</text>
  <rect class="d-box-muted" x="240" y="44" width="180" height="50" rx="10"/>
  <text class="d-text" x="330" y="66" text-anchor="middle">where does it come from</text>
  <text class="d-sub" x="330" y="84" text-anchor="middle">the value you want</text>
  <path class="d-edge" d="M 274 96 L 130 142" marker-end="url(#ue-arrow)"/>
  <path class="d-edge" d="M 330 96 L 330 142" marker-end="url(#ue-arrow)"/>
  <path class="d-edge-accent" d="M 386 96 L 530 142" marker-end="url(#ue-arrow)"/>
  <rect class="d-box" x="16" y="146" width="200" height="56" rx="10"/>
  <text class="d-text" x="116" y="169" text-anchor="middle">props or state</text>
  <text class="d-sub" x="116" y="189" text-anchor="middle">compute in render</text>
  <rect class="d-box" x="230" y="146" width="200" height="56" rx="10"/>
  <text class="d-text" x="330" y="169" text-anchor="middle">a user action</text>
  <text class="d-sub" x="330" y="189" text-anchor="middle">event handler</text>
  <rect class="d-box-accent" x="444" y="146" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="544" y="169" text-anchor="middle">outside React</text>
  <text class="d-sub" x="544" y="189" text-anchor="middle">this is an effect</text>
</svg>

Only the right-hand branch is an effect. Most misused effects belong in one of the other two.

## 3. When an effect is genuinely right

| Task | Why it is an effect |
| :--- | :--- |
| Subscribing to a store, socket, or browser API | An external system to keep in sync |
| Setting up a timer or interval | Outside React, needs teardown |
| Controlling a non-React widget | Imperative integration |
| Logging or analytics on a value change | A side effect by definition |
| Synchronising with <code>document.title</code> or storage | Outside the component output |

The shared shape: something exists outside React, and it has to be started, kept matching, and stopped.

## 4. Verified: deriving state in an effect costs a render

The most common misuse, measured. Two components computing the same value:

\`\`\`jsx
// via an effect
const [count, setCount] = useState(0);
useEffect(() => { setCount(items.length); }, [items]);

// during render
const count = items.length;
\`\`\`

Renders needed to settle on the correct value:

\`\`\`
derived in an effect   -> 2 renders to settle
computed during render -> 1 render to settle
\`\`\`

📌 **Interview term:** the effect version renders once with the **stale** value, then the effect fires, sets state, and forces a second render. Beyond being twice the work, there is a real moment where the UI is wrong — visible as a flash on anything that renders slowly. The fix is to delete the state and the effect and simply compute the value.

## 5. The three misuses worth naming

**Transforming data for display.** Filtering, sorting, or formatting derived from props and state should happen during render, memoised with <code>useMemo</code> only if measurement justifies it.

**Responding to a user action.** Sending an analytics event or a POST after a click belongs in the click handler. Putting it in an effect that watches a state flag makes the cause invisible and fires it on any other path that sets the same flag.

**Resetting state when a prop changes.** Instead of an effect that clears state on a new <code>userId</code>, pass <code>key={userId}</code> — React unmounts and remounts the component, resetting state for free with no effect at all.

## 6. Common Pitfalls

- **Using an effect to derive state.** Verified above: two renders, and a visible stale frame.
- **Making the effect callback <code>async</code>.** It then returns a promise where React expects a cleanup function. Define an inner async function instead — see <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">async operations</a>.
- **Omitting dependencies to stop it re-running.** That produces a stale closure, not a fix.
- **Chaining effects.** An effect that sets state that triggers another effect is a render cascade; compute the whole thing in one place.
- **Forgetting cleanup.** Every subscription and timer needs teardown; see <a href="PASTE_CLEANUP_URL_HERE" target="_blank" rel="noopener noreferrer">the cleanup function</a>.
- **Treating <code>useEffect</code> as <code>componentDidMount</code>.** It is not a lifecycle hook; the mental model is synchronisation, and <a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> will punish the lifecycle assumption immediately.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Use the modern framing, not the lifecycle one:</strong> <span style="color:#f0e2c8;">"It synchronises a component with an external system — network, subscription, timer, DOM. It runs after render and after paint."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say the word "escape hatch":</strong> <span style="color:#f0e2c8;">"The docs classify effects as an escape hatch from the declarative model — so if I am still inside the model, I probably do not need one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Volunteer when NOT to use it — this is the differentiator:</strong> <span style="color:#f0e2c8;">"Derived values go in render, user actions go in handlers. Deriving state in an effect costs an extra render and shows the stale value first — I have measured two renders where one would do."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the reset trick:</strong> <span style="color:#f0e2c8;">"To reset state when a prop changes, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> rather than an effect — React remounts and the state resets for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on the deps and cleanup:</strong> <span style="color:#f0e2c8;">"The dependency array controls re-runs, and the returned cleanup undoes the previous run — before the next one and on unmount."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should you <em style="color:#ffe0b2;">not</em> use an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the value can be computed from props and state — that belongs in render — or when the work is a response to a user action, which belongs in the event handler. Effects are for synchronising with something outside React, not for transforming data you already have.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with setting derived state in an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It renders once with the stale value, then the effect sets state and forces a second render. Two passes instead of one, plus a real frame where the UI is wrong. Deleting the state and computing the value inline fixes both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you reset state when a prop changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass that prop as the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code>. React treats a changed key as a different component, unmounts the old one and mounts a fresh one, so all its state resets — no effect, no manual clearing, and no stale frame.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">componentDidMount</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡A:</span> <span style="color:#d8d8d8;">No, and the analogy causes real bugs. An effect with an empty array happens to run after the first render, but the model is synchronisation, not lifecycle — which is why StrictMode mounts, cleans up, and remounts to check your effect survives it. Lifecycle thinking fails that immediately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do effects run relative to painting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After. React commits the DOM changes, the browser paints, then the effect runs asynchronously — so an effect never delays the visible update. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useLayoutEffect</code> is the exception: it runs synchronously before paint, for measuring or adjusting layout without a flicker.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useEffect</code>** | Synchronises a component with an external system |
| **External system** | Anything outside React — network, DOM, timers, stores |
| **Escape hatch** | A deliberate step outside the declarative model |
| **Derived value** | Something computable from props and state |
| **Render cascade** | An effect setting state that triggers another effect |

---
**Conclusion:** <code>useEffect</code> exists to synchronise a component with something outside React — a subscription, a timer, the network, the DOM — running after render and after paint, with a dependency array controlling re-runs and a cleanup undoing the previous one. The half of the answer that distinguishes a strong candidate is knowing when *not* to reach for it: derived values belong in render and user actions belong in handlers. Deriving state in an effect was measured here at two renders against one, with a real frame showing the stale value in between.`,
    examples: [
      {
        label: "An effect that genuinely synchronises, beside two that should not exist",
        runnable: true,
        code: `import { useState, useEffect, useMemo } from "react";

const ALL = ["apple", "banana", "cherry", "date", "elderberry", "fig"];

// ❌ ANTI-PATTERN: derived state in an effect. Renders once with the stale
// value, then the effect sets state and forces a second render.
function WrongDerived({ query }) {
  const [results, setResults] = useState([]);
  const [renders, setRenders] = useState(0);
  useEffect(() => {
    setResults(ALL.filter((f) => f.includes(query)));
  }, [query]);
  useEffect(() => { setRenders((r) => r + 1); }, [results]);
  return <Line label="via effect (extra pass)" items={results} />;
}

// ✅ Just compute it. One render, never stale.
function RightDerived({ query }) {
  const results = useMemo(() => ALL.filter((f) => f.includes(query)), [query]);
  return <Line label="computed in render" items={results} />;
}

// ✅ A REAL effect: synchronising with something outside React. There is an
// external system (the document title) that must be started, kept matching,
// and restored on teardown.
function TitleSync({ query }) {
  useEffect(() => {
    const previous = document.title;
    document.title = query ? "search: " + query : "no search";
    return () => { document.title = previous; };
  }, [query]);
  return <p style={{ fontSize: 13, color: "#666" }}>document.title is synced to the query</p>;
}

function Line({ label, items }) {
  return (
    <p style={{ margin: "4px 0" }}>
      <code style={{ display: "inline-block", minWidth: 200 }}>{label}</code>
      {items.length ? items.join(", ") : "(none)"}
    </p>
  );
}

// ✅ Resetting state on a prop change WITHOUT an effect: the key prop.
function Editor({ docId }) {
  const [text, setText] = useState("");
  return (
    <div>
      <input
        value={text}
        placeholder={"editing doc " + docId}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("a");
  const [docId, setDocId] = useState(1);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filter" />
      <WrongDerived query={query} />
      <RightDerived query={query} />
      <TitleSync query={query} />

      <hr />
      <h4 style={{ margin: "0 0 8px" }}>Reset state with key, not an effect</h4>
      {/* Changing the key remounts Editor, so its text state resets by itself. */}
      <Editor key={docId} docId={docId} />
      <p>
        <button onClick={() => setDocId((d) => d + 1)}>Open the next document</button>
      </p>
      <p style={{ color: "#666", fontSize: 13 }}>
        Type in the editor, then open the next document — the field clears with
        no effect and no manual reset, because React remounted the component.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of the cleanup function in useEffect?",
    seoDescription:
      "Cleanup undoes what the effect set up, before the next run and on unmount. Verified: three room changes plus an unmount gave 3 connects and 3 disconnects.",
    description: `**Question presented to candidate:**
"What is the function you return from \`useEffect\` for, and exactly when does React call it?"

**What a strong answer should cover:**
- It **undoes what the effect set up** — unsubscribe, clear a timer, abort a request, disconnect an observer.
- The timing, stated precisely: it runs **before the next effect run** (when a dependency changed) and **again on unmount**. Never after the next run.
- Each cleanup closes over the values from **its own** run, which is what makes it able to tear down the right thing.
- Every setup has exactly one teardown — the counts always balance.
- Why it matters: without it, each re-run leaks the previous subscription, and they accumulate.
- Return **nothing** if there is nothing to undo — do not return a value, and never make the effect callback \`async\`, because that returns a promise where React expects a function.
- \`StrictMode\` deliberately mounts, cleans up, and remounts in development so a missing cleanup fails immediately.
- The cancellation-flag pattern for fetches is cleanup used to guard against a stale response, not just to free a resource.

**Clarifying questions expected:**
- "Is the effect setting up something that persists — a listener, a timer, a request?" If not, it may not need cleanup at all.

**Code / implementation expected:** Yes — a subscription effect whose cleanup is visibly balanced against its setup.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useEffect</code> basics.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The exact call sequence in section 3 was produced by rendering a component through three dependency changes and an unmount on React 19.2.8.

## 1. Why This Even Matters — A Story First

Every time you check into a hotel you get a key. Every time you leave you hand it back. The system only works because the two operations are paired — one check-in, one check-out, in that order, every time.

Now imagine checking in four times without ever checking out. Four keys are live, four rooms are held, and the hotel has no idea you are gone. Nothing errored. It just quietly went wrong, and it gets worse every visit.

The cleanup function is handing the key back.

## 2. The Core Idea

📌 **Interview term: cleanup function** — the function you return from an effect. React calls it to **undo what that effect set up**, before the effect runs again and once more when the component unmounts.

\`\`\`jsx
useEffect(() => {
  const conn = connect(roomId);       // setup
  return () => conn.disconnect();     // cleanup — undoes exactly this setup
}, [roomId]);
\`\`\`

📌 **Interview term:** the timing is the part interviewers listen for. Cleanup runs **before the next effect**, never after it. So at no point are two subscriptions live at once, and the sequence for a changing dependency is always *disconnect old, connect new*.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Setup and cleanup alternate as a dependency changes and again on unmount">
  <defs>
    <marker id="cl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Every setup gets exactly one teardown, in order</text>
  <rect class="d-box-accent" x="16" y="56" width="140" height="66" rx="10"/>
  <text class="d-text d-accent" x="86" y="82" text-anchor="middle">connect A</text>
  <text class="d-sub" x="86" y="104" text-anchor="middle">effect runs</text>
  <path class="d-edge" d="M 162 89 L 186 89" marker-end="url(#cl-arrow)"/>
  <rect class="d-box-muted" x="192" y="56" width="140" height="66" rx="10"/>
  <text class="d-text" x="262" y="82" text-anchor="middle">disconnect A</text>
  <text class="d-sub" x="262" y="104" text-anchor="middle">dep changed</text>
  <path class="d-edge" d="M 338 89 L 362 89" marker-end="url(#cl-arrow)"/>
  <rect class="d-box-accent" x="368" y="56" width="140" height="66" rx="10"/>
  <text class="d-text d-accent" x="438" y="82" text-anchor="middle">connect B</text>
  <text class="d-sub" x="438" y="104" text-anchor="middle">effect re-runs</text>
  <path class="d-edge" d="M 514 89 L 538 89" marker-end="url(#cl-arrow)"/>
  <rect class="d-box-muted" x="544" y="56" width="100" height="66" rx="10"/>
  <text class="d-text" x="594" y="82" text-anchor="middle">disconnect B</text>
  <text class="d-sub" x="594" y="104" text-anchor="middle">unmount</text>
</svg>

## 3. Verified: the counts always balance

A component subscribing to a chat room, taken through three room changes and then unmounted:

\`\`\`
connect:general -> disconnect:general -> connect:random ->
disconnect:random -> connect:support -> disconnect:support

connects: 3 | disconnects: 3
\`\`\`

Three setups, three teardowns, perfectly interleaved, and the final unmount closed the last one. At no moment were two connections live.

📌 **Interview term:** notice each cleanup names **its own** room — <code>disconnect:general</code>, not <code>disconnect:support</code>. The cleanup closes over the values from the render that created it, which is precisely what lets it tear down the right resource rather than whatever the current value happens to be.

## 4. What needs cleaning up

| Setup | Cleanup |
| :--- | :--- |
| <code>addEventListener</code> | <code>removeEventListener</code>, same function reference |
| <code>setInterval</code> / <code>setTimeout</code> | <code>clearInterval</code> / <code>clearTimeout</code> |
| A store or socket subscription | The returned unsubscribe, or <code>close()</code> |
| <code>IntersectionObserver</code> and friends | <code>disconnect()</code> |
| An in-flight <code>fetch</code> | <code>AbortController.abort()</code> |
| A class added to <code>document.body</code> | Remove it again |

If an effect only reads something, or only writes a value that does not persist, it may legitimately need no cleanup. Return nothing in that case.

## 5. Cleanup as a correctness tool, not just a resource one

The cancellation-flag pattern uses cleanup to prevent a **stale response** overwriting fresh state:

\`\`\`jsx
useEffect(() => {
  let cancelled = false;
  fetchUser(id).then((u) => { if (!cancelled) setUser(u); });
  return () => { cancelled = true; };
}, [id]);
\`\`\`

Nothing is being freed here — the flag exists purely because cleanup runs **before** the next effect. When <code>id</code> changes, the old run flag flips to <code>true</code> before the new request starts, so a slow earlier response is ignored. Without it the stale value wins; that is measured in <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">async operations</a>.

## 6. StrictMode is the detector

<a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> mounts, cleans up, and remounts every effect in development. An effect with correct cleanup ends that sequence in exactly the state it started; one without accumulates immediately. That is the point — the doubling is a test of your cleanup, not a bug to work around.

## 7. Common Pitfalls

- **Not returning one at all.** The most common leak; see <a href="PASTE_MEMORY_LEAKS_URL_HERE" target="_blank" rel="noopener noreferrer">memory leaks</a>, where three mount cycles left three listeners attached.
- **Making the effect callback <code>async</code>.** It then returns a promise, so React has no cleanup function — it warns explicitly.
- **Removing a different function reference.** Two inline arrows are two different functions, so <code>removeEventListener</code> removes nothing.
- **Expecting cleanup to see current values.** It closes over its own run values, which is the correct behaviour.
- **Adding a <code>useRef</code> guard to stop StrictMode double-running.** That hides the missing cleanup rather than fixing it.
- **Returning a non-function value.** React expects a function or nothing.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"It undoes what the effect set up — unsubscribe, clear the timer, abort the request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the timing precisely — say "never after":</strong> <span style="color:#f0e2c8;">"It runs before the next effect run when a dependency changed, and again on unmount. Never after the next run."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the closure detail:</strong> <span style="color:#f0e2c8;">"Each cleanup closes over its own run values, so it disconnects the room it opened — not whatever the current room happens to be."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Quote the balance:</strong> <span style="color:#f0e2c8;">"Three dependency changes plus an unmount gives three connects and three disconnects, interleaved — the counts always match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention the non-obvious use:</strong> <span style="color:#f0e2c8;">"It is also a correctness tool — the cancellation flag for a fetch works purely because cleanup runs before the next effect."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Exactly when does cleanup run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before the effect re-runs after a dependency change, and again when the component unmounts. Never after the next run has started — which is what guarantees you never have two subscriptions live at the same time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which values does the cleanup see?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The ones from the render that created it, not the latest. That looks like a stale closure but is exactly right — it must tear down the resource <em style="color:#ffe0b2;">it</em> opened. A cleanup reading current values would disconnect the wrong room.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does every effect need one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — only ones that set something up. Logging a value or writing to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> leaves nothing running. The test is simple: did this effect start something that would keep going after the component is gone?</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the effect callback is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns a promise where React expects a cleanup function, and React warns that the effect must not return anything besides a function used for clean-up. Define an async function inside the effect and call it, then return your real cleanup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does StrictMode run my cleanup immediately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It simulates a remount in development — setup, cleanup, setup — to check that your effect survives being torn down and restarted. Correct cleanup makes that sequence a no-op; a missing one shows up as a duplicate subscription straight away, which is the point.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cleanup function** | The function returned from an effect, undoing its setup |
| **Setup and teardown** | The paired operations an effect manages |
| **Cancellation flag** | Cleanup used to ignore a stale async response |
| **Simulated remount** | StrictMode setup, cleanup, setup sequence |
| **Leak** | A setup with no matching teardown |

---
**Conclusion:** the cleanup function undoes whatever the effect set up, and its timing is the part worth stating precisely — before the next effect run when a dependency changed, and again on unmount, never after. Verified here, three room changes plus an unmount produced three connects and three disconnects, perfectly interleaved, with each cleanup naming the room *it* opened because it closes over its own run values. That same ordering is what makes the cancellation-flag pattern work, which makes cleanup a correctness tool as much as a resource one.`,
    examples: [
      {
        label: "A subscription whose setups and teardowns stay visibly balanced",
        runnable: true,
        code: `import { useState, useEffect, useRef } from "react";

// A fake chat service so the connections are observable.
const live = new Set();
function connect(room, onLog) {
  live.add(room);
  onLog("connect: " + room);
  return {
    disconnect() {
      live.delete(room);
      onLog("disconnect: " + room);
    },
  };
}

function ChatRoom({ room, onLog }) {
  useEffect(() => {
    const conn = connect(room, onLog);
    // Cleanup closes over THIS run's room, so it always disconnects the room
    // it opened — never whatever the current room happens to be.
    return () => conn.disconnect();
  }, [room, onLog]);

  return <p style={{ margin: "6px 0" }}>Connected to <strong>{room}</strong></p>;
}

const ROOMS = ["general", "random", "support"];

export default function App() {
  const [room, setRoom] = useState("general");
  const [mounted, setMounted] = useState(true);
  const [log, setLog] = useState([]);
  const logRef = useRef((line) => {});
  logRef.current = (line) => setLog((l) => [...l, line]);

  // A stable callback so changing rooms is the only thing that re-runs it.
  const onLog = useRef((line) => logRef.current(line)).current;

  const connects = log.filter((l) => l.startsWith("connect")).length;
  const disconnects = log.filter((l) => l.startsWith("disconnect")).length;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      {mounted ? <ChatRoom room={room} onLog={onLog} /> : <p><em>unmounted</em></p>}

      <p>
        {ROOMS.map((r) => (
          <button key={r} onClick={() => setRoom(r)} disabled={!mounted || r === room}
            style={{ marginRight: 6 }}>
            {r}
          </button>
        ))}
        <button onClick={() => setMounted((m) => !m)}>
          {mounted ? "unmount" : "mount"}
        </button>{" "}
        <button onClick={() => setLog([])}>clear log</button>
      </p>

      <p style={{ fontSize: 14 }}>
        connects: <strong>{connects}</strong> · disconnects: <strong>{disconnects}</strong> ·
        still live: <strong>{live.size}</strong>
      </p>

      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12, maxHeight: 160, overflow: "auto" }}>
        {log.length ? log.join("\\n") : "(nothing yet — switch rooms)"}
      </pre>

      <p style={{ color: "#666", fontSize: 13 }}>
        Switch rooms a few times, then unmount. Every connect is followed by
        exactly one disconnect before the next connect, and "still live" always
        returns to 0 or 1 — never climbing.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle asynchronous operations in React functional components?",
    seoDescription:
      "Never make the effect callback async. Verified: an unguarded fetch for id 1 then 2 settled on the stale user-1; the guarded version stayed correct.",
    description: `**Question presented to candidate:**
"Walk me through doing async work in a function component — and the bugs that come with it."

**What a strong answer should cover:**
- **Never make the effect callback itself \`async\`.** It returns a promise where React expects a cleanup function, and React warns about it explicitly.
- The correct shape: define an async function *inside* the effect and call it, then return a real cleanup.
- **Race conditions** are the headline bug: responses can arrive out of order, so a slow earlier request can overwrite a newer one.
- Two fixes: a **cancellation flag** (ignore the stale result) or **\`AbortController\`** (actually cancel the request). Prefer the latter — it frees the connection too.
- Handle all three states — loading, error, success — and remember an aborted request rejects with an \`AbortError\` you should not surface as a failure.
- Event handlers can be \`async\` freely; only the *effect callback* has the return-value constraint.
- React 19: \`use()\` with Suspense for reading a promise, and \`useActionState\`/\`useTransition\` for async form submissions.
- The honest recommendation: for server data, use a library — it solves caching, deduplication, and staleness, not just ordering.

**Clarifying questions expected:**
- "Is this triggered by rendering, or by a user action?" — effect versus handler.
- "Can we use a data library, or does this need to be hand-rolled?"

**Code / implementation expected:** Yes — the \`AbortController\` effect, and the race condition it prevents.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useEffect</code> and promises.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The race-condition outcome in section 4 and React warning text in section 3 were both produced by running the code on React 19.2.8, not described from memory.

## 1. Why This Even Matters — A Story First

You order a taxi, change your mind, and order a different one. Both are now driving to you. The first was further away, so it arrives second — and if you simply get into whichever car pulls up last, you end up in the taxi you cancelled.

Nothing malfunctioned. Both cars did exactly what they were told. The bug is that "most recent to arrive" is not the same as "most recently requested", and async code in React defaults to trusting arrival order.

## 2. The Core Idea

Async work in a function component has two homes, and mixing them up causes most of the trouble:

- **Event handlers** — work caused by a user action. These may be <code>async</code> freely.
- **Effects** — work caused by rendering with certain props or state. These have rules.

📌 **Interview term:** an effect callback must return **a cleanup function or nothing**. An <code>async</code> function always returns a promise, so marking the callback <code>async</code> breaks that contract.

## 3. Verified: what React says if you make the callback async

\`\`\`jsx
useEffect(async () => {           // wrong
  await Promise.resolve();
}, []);
\`\`\`

React actual warning:

\`\`\`
must not return anything besides a function, which is used for clean-up.
\`\`\`

The correct shape declares the async function **inside**:

\`\`\`jsx
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetchThing(id);
    if (!cancelled) setThing(data);
  }
  load();

  return () => { cancelled = true; };   // a real cleanup function
}, [id]);
\`\`\`

## 4. Verified: the race condition, and that the guard fixes it

Two components asking for user 1 and then immediately user 2, where user 1 response is deliberately slower:

\`\`\`
unguarded, asked for 1 then 2 -> shows: user-1   <- STALE
guarded,   asked for 1 then 2 -> shows: user-2   <- correct
\`\`\`

The unguarded version settles on the value the user is no longer looking at. Nothing errored, nothing warned — the screen is just wrong.

📌 **Interview term: race condition** — two async operations whose results can arrive in either order, where the code assumes an order. In React it appears whenever a dependency changes faster than requests resolve: switching tabs, typing in a search box, paging through a list.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="A slow first request resolves after a fast second one and overwrites it">
  <defs>
    <marker id="rc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Requested first, arrived last</text>
  <rect class="d-box-muted" x="24" y="52" width="150" height="56" rx="10"/>
  <text class="d-text" x="99" y="75" text-anchor="middle">request id 1</text>
  <text class="d-sub" x="99" y="95" text-anchor="middle">slow</text>
  <path class="d-edge-dashed" d="M 180 80 L 452 152" marker-end="url(#rc-arrow)"/>
  <rect class="d-box-muted" x="24" y="132" width="150" height="56" rx="10"/>
  <text class="d-text" x="99" y="155" text-anchor="middle">request id 2</text>
  <text class="d-sub" x="99" y="175" text-anchor="middle">fast</text>
  <path class="d-edge" d="M 180 152 L 264 112" marker-end="url(#rc-arrow)"/>
  <rect class="d-box" x="270" y="82" width="176" height="56" rx="10"/>
  <text class="d-text" x="358" y="105" text-anchor="middle">setState user-2</text>
  <text class="d-sub" x="358" y="125" text-anchor="middle">correct, briefly</text>
  <rect class="d-box-muted" x="458" y="132" width="180" height="56" rx="10"/>
  <text class="d-text" x="548" y="155" text-anchor="middle">setState user-1</text>
  <text class="d-sub" x="548" y="175" text-anchor="middle">overwrites it</text>
</svg>

## 5. The two guards, and which to prefer

| | Cancellation flag | <code>AbortController</code> |
| :--- | :--- | :--- |
| Ignores the stale result | Yes | Yes |
| Cancels the actual request | **No** | **Yes** |
| Frees the connection | No | Yes |
| Works with any promise | Yes | Only abortable APIs |

📌 **Interview term: <code>AbortController</code>** — pass its <code>signal</code> to <code>fetch</code> and call <code>abort()</code> in cleanup. The request is genuinely cancelled rather than merely ignored. Use a flag only when the underlying API cannot be aborted.

One detail worth naming: an aborted request rejects with an error whose <code>name</code> is <code>AbortError</code>. Check for it and swallow it, or you will render a failure state for a request you cancelled on purpose.

## 6. React 19 changes the shape of this

- **<code>use()</code> with Suspense** removes the manual state, effect, and guard entirely for reading a promise. See <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a>.
- **<code>useTransition</code> and <code>useActionState</code>** handle async submissions, giving you a pending state without hand-rolling one.
- **Server Components** move the fetch to the server entirely — see <a href="PASTE_RSC_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">async Server Components</a>.

And the honest recommendation: for server data, reach for a library. See <a href="PASTE_DATA_FETCHING_URL_HERE" target="_blank" rel="noopener noreferrer">how to fetch data in React</a> — races are only one of the problems, and caching and deduplication are the ones you will hit next.

## 7. Common Pitfalls

- **<code>useEffect(async () =&gt; ...)</code>.** Verified above: React warns, and you lose the cleanup slot.
- **No race guard.** Verified above: the stale response wins silently.
- **Treating <code>AbortError</code> as a failure.** It shows an error state for something you cancelled deliberately.
- **Forgetting the error state entirely.** A rejected promise with no <code>catch</code> leaves the UI stuck loading forever.
- **Using an effect for a user action.** A submit belongs in the handler, not in an effect watching a flag.
- **Setting several pieces of state separately after an await.** Batching covers it since React 18, but a single state object is clearer.
- **Assuming a cancellation flag stops the request.** It only stops the state update.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the rule people break:</strong> <span style="color:#f0e2c8;">"Never make the effect callback <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code> — it returns a promise where React expects a cleanup. Declare the async function inside and call it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real bug:</strong> <span style="color:#f0e2c8;">"Race conditions. Ask for user 1 then user 2, and if the first is slower it lands last and overwrites the second — I have measured exactly that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give both guards and rank them:</strong> <span style="color:#f0e2c8;">"A cancellation flag ignores the stale result; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> actually cancels the request and frees the connection, so I prefer it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Add the detail that shows you have shipped it:</strong> <span style="color:#f0e2c8;">"Aborting rejects with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortError</code> — swallow it, or you show an error state for a request you cancelled yourself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Then say what you would actually do:</strong> <span style="color:#f0e2c8;">"For server data I would use TanStack Query or move it to a Server Component. Ordering is one problem; caching and deduplication are the next two."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can the effect callback not be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because React uses the return value as the cleanup function, and an async function always returns a promise. React warns that the effect must not return anything besides a function used for clean-up, and you silently lose your teardown slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a race condition actually manifest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The screen shows data for something the user already navigated away from. Typing in a search box is the classic case — an early short query is slower to return than a later specific one, so results for two characters land after results for five and overwrite them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Flag or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">AbortController</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Abort where you can — it cancels the request itself, freeing a connection and stopping the response being downloaded and parsed. A flag only prevents the state update; the work still completes. Use a flag when the API has no abort support.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can event handlers be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, freely — nothing consumes their return value, so the constraint does not apply. That is also the right home for anything caused by a user action. Just be aware the component can unmount mid-await, so guard anything that matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does React still warn about setting state after unmount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — React 18 removed that warning and the update is silently ignored. So an <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">isMounted</code> guard is solving a problem that no longer exists. The real reasons to guard are the race condition and freeing the request.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Race condition** | Results arriving in a different order from the requests |
| **Cancellation flag** | A closure variable telling a stale response to do nothing |
| **<code>AbortController</code>** | Cancels the request itself, not merely its result |
| **<code>AbortError</code>** | The rejection from a deliberately aborted request |
| **Stale response** | Data for something the user has already moved on from |

---
**Conclusion:** async work in a function component comes down to two rules and one bug. The rules: never make the effect callback <code>async</code> — verified, React warns that it must not return anything besides a cleanup function — and put user-triggered work in handlers rather than effects. The bug is the race condition, verified here as an unguarded fetch settling on the stale <code>user-1</code> after the user had already asked for <code>user-2</code>. Guard it with <code>AbortController</code> where possible, since that cancels the request rather than merely ignoring it, and remember to swallow the resulting <code>AbortError</code>.`,
    examples: [
      {
        label: "The race condition, unguarded and then fixed with AbortController",
        runnable: true,
        code: `import { useState, useEffect } from "react";

// A fake API where LOW ids are deliberately SLOW, so an earlier request can
// land after a later one — exactly the shape of a real race condition.
function fetchUser(id, signal) {
  const delay = id === 1 ? 1200 : 200;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve({ id, name: "User " + id }), delay);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      const err = new Error("aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
}

// ❌ No guard: whichever response arrives LAST wins, regardless of order asked.
function Unguarded({ id }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    setUser(null);
    fetchUser(id).then(setUser);
  }, [id]);
  return <Row label="unguarded" id={id} user={user} />;
}

// ✅ AbortController: the stale request is genuinely cancelled.
function Guarded({ id }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setUser(null);
    setError(null);

    // The async function is declared INSIDE. The effect callback itself stays
    // synchronous so its return value can be the cleanup function.
    async function load() {
      try {
        const data = await fetchUser(id, controller.signal);
        setUser(data);
      } catch (e) {
        // An abort is deliberate — do not surface it as a failure.
        if (e.name !== "AbortError") setError(e.message);
      }
    }
    load();

    return () => controller.abort();
  }, [id]);

  return <Row label="AbortController" id={id} user={user} error={error} />;
}

function Row({ label, id, user, error }) {
  return (
    <p style={{ margin: "6px 0" }}>
      <code style={{ display: "inline-block", minWidth: 160 }}>{label}</code>
      asked for <strong>{id}</strong> · showing{" "}
      <strong style={{ color: user && user.id !== id ? "crimson" : "#161" }}>
        {error ? "error: " + error : user ? user.name : "loading..."}
      </strong>
    </p>
  );
}

export default function App() {
  const [id, setId] = useState(1);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <Unguarded id={id} />
      <Guarded id={id} />
      <p>
        <button onClick={() => setId(1)}>Ask for user 1 (slow)</button>{" "}
        <button onClick={() => setId(2)}>Ask for user 2 (fast)</button>
      </p>
      <p style={{ color: "#666", fontSize: 13 }}>
        Click "user 1" then immediately "user 2". The unguarded row briefly
        shows User 2, then the slow response for user 1 lands and overwrites it
        in red. The guarded row aborts the first request and stays correct.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you fetch data in React?",
    seoDescription:
      "React ships no data layer. Pick by context: a Server Component, a query library, use() with Suspense, or a hand-rolled effect as the last resort.",
    description: `**Question presented to candidate:**
"How would you load data in a React app? Take me through the options and how you would choose."

**What a strong answer should cover:**
- **React ships no data-fetching solution.** That is deliberate — it is the common-abstraction principle. The question is really which tool you bring.
- The four realistic options, roughly in order of preference: a **Server Component**, a **query library** (TanStack Query, SWR), **\`use()\` with Suspense**, and a **hand-rolled \`useEffect\`**.
- Why the effect version is the last resort despite being the one everyone learns first: you must hand-roll loading and error state, race protection, caching, deduplication, refetching, and invalidation.
- **Server state is not UI state.** It is a cache of something that lives elsewhere, so it needs staleness handling rather than storage.
- Waterfalls: fetching sequentially when the requests are independent. Fetch in parallel, or move the fetch up.
- Render-as-you-fetch versus fetch-on-render, and why starting the request before rendering matters.
- The framework answer: in Next.js App Router, an async Server Component is usually correct and removes the client-side problem entirely.

**Clarifying questions expected:**
- "Is there a framework with server rendering, or is this a pure client SPA?"
- "Does this data need caching, refetching, or optimistic updates?"
- "Who else needs the same data?"

**Code / implementation expected:** Yes — the effect version done properly, and ideally the library version for contrast.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useEffect</code>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This doc is the decision landscape; <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">async operations</a> covers the mechanics and race conditions, and <a href="PASTE_RSC_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">async Server Components</a> covers the server side.

## 1. Why This Even Matters — A Story First

Everyone learns to fetch with a <code>useEffect</code>, and it works on the first screen. Then the requirements arrive: show a spinner, handle failure, do not refetch when the user comes back within a minute, refetch when the window regains focus, do not fire the same request from three components at once, and show the old data while the new data loads.

None of that is fetching. All of it is **caching**. The reason the effect approach feels wrong so quickly is that the problem was never really "how do I make a request".

## 2. The Core Idea

📌 **Interview term:** React deliberately ships **no data-fetching solution**. It renders UI; fetching, caching, and invalidation are left to the ecosystem. So the honest answer to this question is not one technique but a choice, and the interviewer is listening for how you make it.

📌 **Interview term: server state** — data that lives on a server and is merely *cached* in the browser. It differs from UI state in every way that matters: it can go stale, another user can change it, and it needs deduplication and refetching. Treating it as ordinary state is the root mistake.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Four ways to fetch data ordered by how much you have to build yourself">
  <text class="d-text" x="330" y="24" text-anchor="middle">Pick the highest one your setup allows</text>
  <rect class="d-box-accent" x="20" y="46" width="620" height="40" rx="10"/>
  <text class="d-text d-accent" x="330" y="71" text-anchor="middle">Server Component — fetch on the server, no client state at all</text>
  <rect class="d-box-accent" x="20" y="94" width="620" height="40" rx="10"/>
  <text class="d-text d-accent" x="330" y="119" text-anchor="middle">Query library — caching, deduplication, refetching, invalidation</text>
  <rect class="d-box" x="20" y="142" width="620" height="40" rx="10"/>
  <text class="d-text" x="330" y="167" text-anchor="middle">use() with Suspense — declarative reads, you still own the cache</text>
  <rect class="d-box-muted" x="20" y="190" width="620" height="40" rx="10"/>
  <text class="d-text" x="330" y="215" text-anchor="middle">useEffect by hand — you build everything yourself</text>
</svg>

## 3. Option one: a Server Component

In a framework with the App Router, the component itself is <code>async</code> and awaits directly. No <code>useEffect</code>, no loading state, no race condition, and the data never travels through client state at all:

\`\`\`jsx
export default async function Profile({ id }) {
  const user = await db.user.findUnique({ where: { id } });
  return <h1>{user.name}</h1>;
}
\`\`\`

This is the default answer when a framework is available. See <a href="PASTE_RSC_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">async Server Components</a> for the waterfall trap that comes with it.

## 4. Option two: a query library

For client-side data, TanStack Query or SWR. One hook replaces the whole hand-rolled apparatus:

\`\`\`jsx
const { data, error, isPending } = useQuery({
  queryKey: ["user", id],
  queryFn: () => fetchUser(id),
});
\`\`\`

📌 **Interview term:** what you get for that line is **deduplication** (three components asking for the same key make one request), **caching** with staleness rules, **background refetching**, **retries**, and **invalidation** after a mutation. Naming those specifics is what separates "I would use a library" from a considered answer.

## 5. Option three: <code>use()</code> with Suspense

React 19 <code>use()</code> unwraps a promise during render, suspending until it resolves:

\`\`\`jsx
function Profile({ userPromise }) {
  const user = use(userPromise);     // suspends; no loading state here
  return <h1>{user.name}</h1>;
}
\`\`\`

The important constraint: <code>use()</code> does not *create* or cache the promise. Creating it during render restarts the request on every render, so the promise must come from a Server Component, a framework loader, or a cache. See <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a>.

## 6. Option four: the hand-rolled effect

Correct, and worth being able to write — but notice how much is bookkeeping:

\`\`\`jsx
useEffect(() => {
  const controller = new AbortController();
  setStatus("loading");

  fetch(\\\`/api/users/\\\${id}\\\`, { signal: controller.signal })
    .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then((d) => { setData(d); setStatus("success"); })
    .catch((e) => { if (e.name !== "AbortError") { setError(e); setStatus("error"); } });

  return () => controller.abort();
}, [id]);
\`\`\`

That handles loading, errors, and the race. It still has no caching, no deduplication, no refetching, and no invalidation.

## 7. Waterfalls: the mistake that survives every approach

📌 **Interview term: waterfall** — requests running in sequence when they could run in parallel, because each one only starts after the previous resolved. A parent that fetches, then renders a child that fetches, serialises two round trips that had no dependency on each other.

\`\`\`jsx
// Sequential — the second request waits for no reason
const user = await getUser(id);
const posts = await getPosts(id);

// Parallel — both start immediately
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
\`\`\`

📌 **Interview term: render-as-you-fetch** — starting the request *before* or *while* rendering, rather than after the component mounts. An effect is fetch-on-render by construction: React must render, commit, and paint before the request even begins.

## 8. Common Pitfalls

- **Putting server data in Redux by hand.** You are re-implementing a cache. Use a query library.
- **No race protection in an effect.** Verified in <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">async operations</a> — the stale response wins.
- **Creating the promise for <code>use()</code> during render.** A new promise each render means a new request each render.
- **Sequential awaits for independent data.** Use <code>Promise.all</code>.
- **Fetching in a deeply nested child.** Each level adds a round trip; hoist the fetch or use a loader.
- **Forgetting the error state.** A rejected promise with no handler leaves a permanent spinner.
- **Reaching for a library on a page with one static request.** An effect or a Server Component is fine.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe it first:</strong> <span style="color:#f0e2c8;">"React ships no data layer on purpose, so this is a choice. And server data is a caching problem, not a state problem — that decides most of it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the ranked options:</strong> <span style="color:#f0e2c8;">"Server Component if I have a framework; otherwise TanStack Query or SWR; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> with Suspense where the promise comes from a loader; a hand-rolled effect last."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Justify why the effect is last:</strong> <span style="color:#f0e2c8;">"It handles the request. It gives you nothing for deduplication, caching, refetching, or invalidation — and those arrive within a week."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring up waterfalls unprompted:</strong> <span style="color:#f0e2c8;">"I would check for sequential awaits on independent data — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> — and for fetches nested deep in the tree, where each level adds a round trip."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show you can still write it by hand:</strong> <span style="color:#f0e2c8;">"If asked for the effect version I would include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code>, the three states, and swallowing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortError</code> — that shows I know what the library is doing for me."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> for everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because fetching is the easy part. Loading and error states, race protection, caching, deduplicating identical requests, refetching on focus, and invalidating after a mutation are all still yours — and that is a cache, which is a well-solved problem I would rather not re-solve.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a waterfall and how do you spot one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Requests running in sequence that had no dependency on each other. In the Network panel it is a staircase rather than a block. The fixes are <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> for independent awaits, and hoisting fetches out of deeply nested children so each level does not add a round trip.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should the promise for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">use()</code> come from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Somewhere stable — a Server Component passing it down, a framework loader, or a cache. Creating it inside the rendering component makes a new promise every render, so the request restarts endlessly. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> reads a promise; it does not own one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is server data just state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is a cache of something you do not own. It can go stale, someone else can change it, and two components asking for it should share one request. UI state has none of those properties, which is why one tool for both ends up badly fitting each.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is render-as-you-fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Starting the request before or while rendering, rather than after the component mounts. An effect is fetch-on-render by construction — React has to render, commit, and paint before the request even starts, so you pay a full round trip after first paint. Loaders and Server Components avoid that.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server state** | Remote data cached locally; goes stale |
| **Deduplication** | Several components asking for the same data, one request |
| **Invalidation** | Marking cached data stale after a mutation |
| **Waterfall** | Sequential requests that could have been parallel |
| **Fetch-on-render** | Requesting only after the component has mounted |
| **Render-as-you-fetch** | Starting the request before rendering completes |

---
**Conclusion:** React deliberately ships no data-fetching solution, so the answer is a ranked choice rather than a technique. A Server Component removes the problem entirely where a framework allows it; a query library handles the part that is actually hard — deduplication, caching, refetching, invalidation; <code>use()</code> with Suspense reads a promise you obtained elsewhere; and a hand-rolled effect is the last resort, correct but giving you nothing beyond the request itself. The reframe worth leading with is that server data is a cache, not state, and the trap to name unprompted is the waterfall.`,
    examples: [
      {
        label: "A correct hand-rolled fetch, and the same thing with a tiny cache",
        runnable: true,
        code: `import { useState, useEffect, useCallback } from "react";

const DB = {
  1: { id: 1, name: "Ada Lovelace", role: "Mathematician" },
  2: { id: 2, name: "Grace Hopper", role: "Rear Admiral" },
  3: { id: 3, name: "Alan Turing", role: "Logician" },
};
let requestCount = 0;

function fakeFetch(id, signal) {
  requestCount++;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (!DB[id]) reject(new Error("404 not found"));
      else resolve(DB[id]);
    }, 500);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      const e = new Error("aborted"); e.name = "AbortError"; reject(e);
    });
  });
}

// ── Hand-rolled: three states, abort on change, swallow AbortError. ────────
function useUserByHand(id) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });

    fakeFetch(id, controller.signal)
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((e) => {
        if (e.name === "AbortError") return;          // deliberate, not a failure
        setState({ status: "error", data: null, error: e.message });
      });

    return () => controller.abort();
  }, [id]);

  return state;
}

// ── A 20-line cache, which is roughly what a query library starts from:
//    deduplication plus reuse. Real ones add staleness, retries, refetching. ─
const cache = new Map();
function useUserCached(id) {
  const [, force] = useState(0);
  const key = String(id);

  useEffect(() => {
    if (cache.has(key)) return;                        // dedupe: already have it
    cache.set(key, { status: "loading" });
    fakeFetch(id)
      .then((data) => cache.set(key, { status: "success", data }))
      .catch((e) => cache.set(key, { status: "error", error: e.message }))
      .finally(() => force((n) => n + 1));
  }, [key, id]);

  return cache.get(key) ?? { status: "loading" };
}

function Card({ title, state }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, flex: 1 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      {state.status === "loading" && <p>loading…</p>}
      {state.status === "error" && <p style={{ color: "crimson" }}>{state.error}</p>}
      {state.status === "success" && (
        <p><strong>{state.data.name}</strong><br /><span style={{ fontSize: 13 }}>{state.data.role}</span></p>
      )}
    </div>
  );
}

export default function App() {
  const [id, setId] = useState(1);
  const byHand = useUserByHand(id);
  const cached = useUserCached(id);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Card title="hand-rolled effect" state={byHand} />
        <Card title="with a tiny cache" state={cached} />
      </div>
      <p>
        {[1, 2, 3, 99].map((n) => (
          <button key={n} onClick={() => setId(n)} style={{ marginRight: 6 }}>
            user {n}{n === 99 ? " (404)" : ""}
          </button>
        ))}
      </p>
      <p style={{ fontSize: 14 }}>network requests made: <strong>{requestCount}</strong></p>
      <p style={{ color: "#666", fontSize: 13 }}>
        Switch between users you have already loaded. The hand-rolled column
        refetches every time; the cached one does not — that difference is most
        of what a query library buys you, before staleness and refetching.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain React Suspense and its use cases.",
    seoDescription:
      "A boundary that shows a fallback while anything beneath it is not ready. Verified: use(promise) rendered loading, then the resolved data.",
    description: `**Question presented to candidate:**
"What is Suspense, what actually triggers it, and what do you use it for today?"

**What a strong answer should cover:**
- \`<Suspense fallback={...}>\` is a **boundary**: if any component below it suspends, React shows the fallback until it is ready.
- It moves loading states from *inside* each component to a **boundary above** them, so a component never needs its own \`isLoading\`.
- What triggers it: \`React.lazy\`, \`use()\` on an unresolved promise, and framework data loaders. Not arbitrary promises, and not a plain \`useEffect\` fetch.
- Behaviour is like an Error Boundary: React walks up to the **nearest** boundary.
- Placement is a design decision — it decides the granularity of your loading UI.
- **Streaming SSR**: the server sends the shell immediately and streams each boundary as it resolves, and boundaries hydrate independently.
- \`useTransition\` to avoid a fallback flash when updating already-visible content.
- The main constraint: it does not manage or cache the promise — creating one during render restarts the request every render.

**Clarifying questions expected:**
- "Is the data coming from a framework loader or a Server Component, or being fetched client-side?" — that decides whether Suspense is even usable.

**Code / implementation expected:** Yes — a Suspense boundary around a lazy component and a \`use()\` read.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes components and promises.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The suspension behaviour in section 3 was produced by rendering a pending promise through <code>use()</code> on React 19.2.8 and reading the DOM before and after it resolved.

## 1. Why This Even Matters — A Story First

In a restaurant, individual dishes do not each apologise for taking time. The waiter manages it: they know the table is waiting and they decide what to say and when to bring things out. A dish that is not ready simply says so, upward, and the waiter handles the presentation.

Suspense is the waiter. Components stop carrying their own "still loading, sorry" logic; they say *I am not ready* and a boundary above them decides what the user sees.

## 2. The Core Idea

📌 **Interview term: Suspense** — a boundary component that renders a **fallback** while any component beneath it is **suspended**, then swaps in the real content once it is ready.

\`\`\`jsx
<Suspense fallback={<Spinner />}>
  <Profile />
  <Timeline />
</Suspense>
\`\`\`

📌 **Interview term: suspending** — a component signalling to React that it cannot render yet. React pauses that subtree, walks up to the **nearest** Suspense boundary, and renders its fallback instead. Structurally identical to how an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">Error Boundary</a> catches a throw.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="A suspended child causes the nearest boundary to render its fallback until ready">
  <defs>
    <marker id="sp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The child says not ready; the boundary decides what to show</text>
  <rect class="d-box" x="24" y="56" width="170" height="66" rx="10"/>
  <text class="d-text" x="109" y="82" text-anchor="middle">child suspends</text>
  <text class="d-sub" x="109" y="104" text-anchor="middle">data not ready</text>
  <path class="d-edge" d="M 200 89 L 230 89" marker-end="url(#sp-arrow)"/>
  <rect class="d-box-accent" x="236" y="56" width="180" height="66" rx="10"/>
  <text class="d-text d-accent" x="326" y="82" text-anchor="middle">nearest Suspense</text>
  <text class="d-sub" x="326" y="104" text-anchor="middle">renders the fallback</text>
  <path class="d-edge-accent" d="M 422 89 L 452 89" marker-end="url(#sp-arrow)"/>
  <rect class="d-box-accent" x="458" y="56" width="180" height="66" rx="10"/>
  <text class="d-text d-accent" x="548" y="82" text-anchor="middle">promise resolves</text>
  <text class="d-sub" x="548" y="104" text-anchor="middle">real content swaps in</text>
  <rect class="d-box-muted" x="236" y="140" width="180" height="50" rx="10"/>
  <text class="d-sub" x="326" y="162" text-anchor="middle">no loading state lives</text>
  <text class="d-sub" x="326" y="180" text-anchor="middle">inside the child itself</text>
</svg>

## 3. Verified: a pending promise suspends, and the fallback shows

\`\`\`jsx
<Suspense fallback={<i>loading...</i>}>
  <Reader promise={pending} />      {/* Reader calls use(promise) */}
</Suspense>
\`\`\`

Reading the DOM before and after resolving:

\`\`\`
while the promise is pending: "loading..."
after it resolves:            "resolved data"
\`\`\`

📌 **Interview term:** notice what is absent from <code>Reader</code> — no <code>isLoading</code> state, no conditional, no <code>useEffect</code>. It calls <code>use(promise)</code> and returns the value. The waiting is entirely the boundary responsibility, which is the actual point of the feature.

## 4. What triggers it — and what does not

| Triggers Suspense | Does not |
| :--- | :--- |
| <code>React.lazy</code> loading a chunk | A plain <code>useEffect</code> fetch |
| <code>use()</code> on an unresolved promise | An arbitrary promise you await |
| Framework loaders and Server Components | <code>async</code>/<code>await</code> in an event handler |
| Libraries with Suspense support | Anything setting <code>isLoading</code> yourself |

📌 **Interview term:** this is the most common misunderstanding. Suspense does **not** magically catch async work. A component fetching in a <code>useEffect</code> and flipping its own <code>isLoading</code> flag never suspends, because it always returns something renderable. Something must integrate with React suspension mechanism.

## 5. Use cases

**Code splitting.** The oldest use, and available since React 16.6 — <code>React.lazy</code> plus a boundary is the standard route-level split.

**Data fetching.** With a Server Component, a framework loader, or <code>use()</code>. See <a href="PASTE_DATA_FETCHING_URL_HERE" target="_blank" rel="noopener noreferrer">fetching data</a>.

**Streaming SSR.** 📌 **Interview term:** the server sends the HTML shell immediately with fallbacks in place, then **streams** each boundary content as it resolves. Boundaries also hydrate independently, so a slow widget cannot block the rest of the page becoming interactive. That is a substantial reason to place boundaries thoughtfully rather than wrapping everything in one.

**Avoiding a fallback flash.** Wrapping an update in <code>startTransition</code> keeps the current content visible while the new content loads, instead of collapsing to a spinner.

## 6. Placement is the design decision

One boundary at the root means one spinner for the whole page and nothing appears until everything is ready. A boundary per section means each part appears as it becomes available, and with streaming SSR each arrives independently.

The trade is granularity against visual noise: too many boundaries produces a page that flickers into existence in a dozen pieces.

## 7. Common Pitfalls

- **Expecting an effect-based fetch to suspend.** It cannot; the component always returns something.
- **Creating the promise during render.** A new promise each render restarts the request forever. It must come from a loader, a Server Component, or a cache.
- **One boundary around everything.** The slowest item gates the entire page.
- **No error handling.** Suspense covers *pending*; a rejection needs an Error Boundary beside it.
- **Fallback flash on an update.** Use <code>startTransition</code> so visible content stays put.
- **A fallback of a different height.** Layout shift; match the shape with a skeleton.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it as a boundary:</strong> <span style="color:#f0e2c8;">"A boundary that shows a fallback while anything beneath it is not ready — it moves loading state out of components and up to one place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say what actually triggers it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.lazy</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> on a pending promise, and framework loaders. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> fetch does not suspend — that catches a lot of people out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Draw the Error Boundary parallel:</strong> <span style="color:#f0e2c8;">"It works like an Error Boundary — React walks up to the nearest one. Same mental model, different signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the streaming payoff:</strong> <span style="color:#f0e2c8;">"With streaming SSR the server sends the shell immediately and streams each boundary as it resolves, and they hydrate independently — so one slow widget cannot block the page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the constraint:</strong> <span style="color:#f0e2c8;">"Suspense does not own or cache the promise. Create it during render and you restart the request every render — it has to come from a loader or a cache."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Suspense work with a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. That component always returns something renderable — usually its own spinner — so it never signals that it is not ready. Suspending requires integration with React mechanism: <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">React.lazy</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code>, a framework loader, or a Suspense-aware library.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should boundaries go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wherever you want an independent loading region. One at the root means the slowest thing gates the whole page; one per section lets each appear as it is ready, and with streaming SSR each arrives and hydrates independently. The limit is visual noise — too many and the page flickers together in pieces.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid the fallback flashing on an update?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the update in <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">startTransition</code> or use <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useTransition</code>. React keeps the current content on screen while the new content loads, and gives you an <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">isPending</code> flag so you can dim it — much better than collapsing back to a spinner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Suspense handle errors too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it handles the pending case only. A rejected promise propagates as an error and needs an Error Boundary. In practice they pair up: an Error Boundary wrapping a Suspense boundary covers both failure and waiting for the same subtree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does it do for server rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It enables streaming. The server flushes the shell with fallbacks in place rather than waiting for all data, then streams each boundary content as it resolves. Boundaries also hydrate independently, so a slow section does not delay the rest of the page becoming interactive.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Suspense boundary** | A component rendering a fallback while children are not ready |
| **Suspending** | A component signalling it cannot render yet |
| **Fallback** | What shows while the subtree is suspended |
| **Streaming SSR** | Sending the shell first, then each boundary as it resolves |
| **Selective hydration** | Boundaries becoming interactive independently |
| **Fallback flash** | A spinner replacing content that was already visible |

---
**Conclusion:** Suspense is a boundary that renders a fallback whenever something beneath it is not ready, moving loading state out of individual components and up to one place — verified here as <code>use()</code> on a pending promise rendering the fallback and then the resolved data, with no loading flag anywhere in the component. What triggers it is specific: <code>React.lazy</code>, <code>use()</code>, and framework loaders, never a plain <code>useEffect</code> fetch. Its biggest payoff is streaming SSR, where each boundary is flushed and hydrated independently, which is why where you place them is a real design decision.`,
    examples: [
      {
        label: "Suspense around a lazy component and a use() read, with no loading flags",
        runnable: true,
        code: `import { Suspense, lazy, use, useState, useTransition } from "react";

// ── Trigger 1: React.lazy. The boundary covers the chunk download. ─────────
const LazyPanel = lazy(
  () => new Promise((resolve) =>
    setTimeout(() => resolve({
      default: () => (
        <div style={{ background: "#eef", padding: 10, borderRadius: 6 }}>
          Lazy panel — arrived as its own chunk.
        </div>
      ),
    }), 800)),
);

// ── Trigger 2: use() on a promise. Crucially the promise is created OUTSIDE
//    the component. Creating it during render would restart it every render. ─
const cache = new Map();
function getUser(id) {
  if (!cache.has(id)) {
    cache.set(id, new Promise((resolve) =>
      setTimeout(() => resolve({ id, name: "User " + id }), 700)));
  }
  return cache.get(id);
}

// Note what is NOT here: no isLoading, no useEffect, no conditional. The
// component reads the value and returns UI; waiting is the boundary's job.
function UserCard({ id }) {
  const user = use(getUser(id));
  return (
    <div style={{ background: "#efe", padding: 10, borderRadius: 6 }}>
      Loaded <strong>{user.name}</strong>
    </div>
  );
}

function Skeleton({ label }) {
  return (
    <div style={{ background: "#f2f2f2", color: "#888", padding: 10, borderRadius: 6 }}>
      {label}
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState(1);
  const [showLazy, setShowLazy] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, display: "grid", gap: 12 }}>
      <div>
        <button onClick={() => setShowLazy((s) => !s)}>
          {showLazy ? "Hide" : "Load"} lazy panel
        </button>{" "}
        {/* startTransition keeps the CURRENT card visible while the next one
            loads, instead of collapsing back to the skeleton. */}
        <button onClick={() => startTransition(() => setUserId((n) => n + 1))}>
          Next user (in a transition)
        </button>{" "}
        <button onClick={() => setUserId((n) => n + 1)}>Next user (no transition)</button>
      </div>

      {/* Separate boundaries: each region loads independently. */}
      {showLazy && (
        <Suspense fallback={<Skeleton label="fetching the chunk…" />}>
          <LazyPanel />
        </Suspense>
      )}

      <div style={{ opacity: isPending ? 0.5 : 1, transition: "opacity .2s" }}>
        <Suspense fallback={<Skeleton label="loading user…" />}>
          <UserCard id={userId} />
        </Suspense>
      </div>

      <p style={{ color: "#666", fontSize: 13 }}>
        Compare the two "next user" buttons. Without a transition the card
        collapses to the skeleton; with one the old card stays visible and just
        dims while the next loads.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Async Server Components & waterfall prevention — fetching without blocking",
    seoDescription:
      "An async Server Component awaits data on the server with no client state. The trap is sequential awaits and nested fetches, which serialise round trips.",
    description: `**Question presented to candidate:**
"In the App Router, a Server Component can be \`async\` and await its own data. What does that buy you, and where does it go wrong?"

**What a strong answer should cover:**
- A **Server Component can be \`async\`** and \`await\` directly in the component body. No \`useEffect\`, no loading state, no race condition — and the fetch runs adjacent to the data source.
- Zero client JavaScript for that component, and no data round-tripped through client state.
- **The waterfall trap** is the real subject: sequential \`await\`s for independent data serialise round trips that should overlap.
- Fixes: \`Promise.all\` for independent requests; **start the promise early and pass it down** to be awaited later; hoist fetches out of deeply nested components.
- **Suspense boundaries make waterfalls survivable** — the shell streams immediately and each section arrives as it resolves, so a slow request delays one region rather than the page.
- **Request deduplication**: React \`cache()\` and the framework's extended \`fetch\` dedupe identical requests within one render pass, which makes colocating fetches safe.
- The genuine sequential case: when one request truly depends on the previous result, the waterfall is unavoidable — you make it *visible* with Suspense instead of pretending it is parallel.
- Client components cannot be \`async\`; \`use()\` plus a promise passed from the server is the bridge.

**Clarifying questions expected:**
- "Are these requests actually independent, or does one need the first result?"
- "Is this Next.js App Router, or another RSC implementation?"

**Code / implementation expected:** Yes — the sequential-versus-parallel contrast, and passing a promise down to defer the await.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes Server Components basics.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** unlike most docs in this set, the behaviour here cannot be executed in a unit environment — Server Components need a server runtime and a bundler that understands the RSC protocol. Everything below is reasoned from the documented model rather than measured, and this doc says so rather than implying otherwise. The Suspense behaviour it relies on *was* verified; see <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a>.

## 1. Why This Even Matters — A Story First

Sending three letters, each of which takes a day. Post them together on Monday and all three replies arrive Tuesday. Post the first, wait for its reply, then post the second — and you finish on Thursday.

Nothing in that story is about the postal service being slow. Both versions used identical postage and identical delivery times. The only difference is whether the sender waited unnecessarily. That is a waterfall, and it is the single most common performance bug in Server Components — precisely because <code>await</code> makes the slow version look so natural.

## 2. The Core Idea

📌 **Interview term: async Server Component** — a component that runs **only on the server** and may be declared <code>async</code>, awaiting data directly in its body:

\`\`\`jsx
export default async function Profile({ id }) {
  const user = await db.user.findUnique({ where: { id } });
  return <h1>{user.name}</h1>;
}
\`\`\`

What that removes is substantial: no <code>useEffect</code>, no <code>isLoading</code> state, no <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">race condition</a>, no client-side waterfall from mounting, and no JavaScript shipped for this component. The query also runs next to the database rather than across the internet from a browser.

📌 **Interview term:** client components **cannot** be <code>async</code>. Hooks and interactivity require the client rendering model. The bridge is to start a promise on the server and pass it to a client component that reads it with <code>use()</code>.

## 3. The waterfall trap

📌 **Interview term: waterfall** — independent requests running one after another because each <code>await</code> blocks the next line. Total time becomes the **sum** of the requests rather than the **maximum**.

\`\`\`jsx
// ❌ Sequential — 300ms total for three 100ms requests
const user = await getUser(id);
const posts = await getPosts(id);
const stats = await getStats(id);

// ✅ Parallel — 100ms total
const [user, posts, stats] = await Promise.all([
  getUser(id), getPosts(id), getStats(id),
]);
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Sequential awaits sum their durations while parallel requests overlap">
  <text class="d-text" x="330" y="24" text-anchor="middle">Same three requests, two arrangements</text>
  <text class="d-sub" x="60" y="58" text-anchor="middle">sequential</text>
  <rect class="d-box-muted" x="120" y="42" width="150" height="26" rx="6"/>
  <text class="d-sub" x="195" y="60" text-anchor="middle">user</text>
  <rect class="d-box-muted" x="276" y="42" width="150" height="26" rx="6"/>
  <text class="d-sub" x="351" y="60" text-anchor="middle">posts</text>
  <rect class="d-box-muted" x="432" y="42" width="150" height="26" rx="6"/>
  <text class="d-sub" x="507" y="60" text-anchor="middle">stats</text>
  <text class="d-sub" x="330" y="96" text-anchor="middle">total is the sum of all three</text>
  <text class="d-sub" x="60" y="146" text-anchor="middle">parallel</text>
  <rect class="d-box-accent" x="120" y="118" width="150" height="24" rx="6"/>
  <text class="d-sub" x="195" y="135" text-anchor="middle">user</text>
  <rect class="d-box-accent" x="120" y="148" width="150" height="24" rx="6"/>
  <text class="d-sub" x="195" y="165" text-anchor="middle">posts</text>
  <rect class="d-box-accent" x="120" y="178" width="150" height="24" rx="6"/>
  <text class="d-sub" x="195" y="195" text-anchor="middle">stats</text>
  <text class="d-sub" x="420" y="165" text-anchor="middle">total is the slowest one</text>
</svg>

## 4. The subtler waterfall: nesting

<code>Promise.all</code> handles one component. The harder case is a parent that awaits, then renders a child that awaits — each level of the tree adding a round trip, with nothing in any single file looking wrong.

Two fixes:

**Start early, await late.** Create the promise without awaiting it, pass it down, and let the consumer await it. The request is in flight during the parent render:

\`\`\`jsx
export default async function Page({ id }) {
  const userPromise = getUser(id);      // no await — starts now
  const postsPromise = getPosts(id);    // also starts now
  return (
    <>
      <UserPanel promise={userPromise} />
      <Suspense fallback={<PostsSkeleton />}>
        <Posts promise={postsPromise} />
      </Suspense>
    </>
  );
}
\`\`\`

**Hoist the fetch.** Move the request up to a component that already has what it needs, and pass the data down.

## 5. Suspense makes an unavoidable wait survivable

Sometimes the dependency is real — you need the user before you can fetch their orders. You cannot parallelise that. What you can do is stop it blocking everything else:

📌 **Interview term:** wrapping the slow subtree in a <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a> boundary lets the server flush the shell immediately and stream that section when it resolves. The waterfall still exists; it no longer holds the whole page hostage. Verified separately, a pending promise renders its boundary fallback and swaps in the content on resolution.

## 6. Deduplication makes colocation safe

📌 **Interview term: request deduplication** — React <code>cache()</code>, and the extended <code>fetch</code> in frameworks that provide one, memoise identical requests for the duration of a single render pass. Three components independently asking for the current user produce **one** query.

That is what makes it reasonable to fetch inside the component that needs the data rather than threading it down from the top. Without deduplication, colocation would mean N queries for N components.

## 7. Common Pitfalls

- **Sequential awaits for independent data.** The default shape, and almost always wrong. Reach for <code>Promise.all</code>.
- **Awaiting in the parent purely to pass data down.** Start the promise, pass the promise, await where it is used.
- **No Suspense boundaries.** Every slow request then delays the entire page rather than one region.
- **Trying to make a client component <code>async</code>.** Not supported; pass a promise and read it with <code>use()</code>.
- **Assuming deduplication is global.** It is per render pass, not a persistent cache.
- **Fetching deep in the tree without checking depth.** Each level can add a round trip.
- **Forgetting error handling.** A rejected await on the server needs an error boundary just as much.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State what it removes:</strong> <span style="color:#f0e2c8;">"The component is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code> and awaits directly — no effect, no loading state, no race condition, and no client JavaScript for it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Go straight to the trap:</strong> <span style="color:#f0e2c8;">"The risk is waterfalls. Sequential awaits for independent data make the total the sum of the requests rather than the slowest one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give both fixes:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> within a component, and across components start the promise without awaiting it and pass it down to be awaited where it is used."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring in Suspense:</strong> <span style="color:#f0e2c8;">"Where the dependency is genuine and I cannot parallelise, I wrap it in Suspense — the shell streams immediately and that section arrives when it resolves."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention deduplication:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> dedupes identical requests within a render pass, which is what makes fetching in the component that needs the data safe rather than wasteful."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a client component be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — the client rendering model needs a synchronous render so hooks and interactivity work. The bridge is to start the promise in a Server Component and pass it to the client component, which reads it with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> inside a Suspense boundary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you fix a waterfall between a parent and a child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start both requests in the parent without awaiting, and pass the promises down to be awaited where they are used. The requests are then in flight simultaneously instead of the child request only beginning after the parent finished rendering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one request genuinely depends on another?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the waterfall is real and you cannot remove it. What you can do is contain it — put that subtree behind a Suspense boundary so the rest of the page streams and becomes interactive while it resolves. Making the wait visible and local beats pretending it is not there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does fetching in several components mean several requests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for identical requests within one render pass — React <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> and the framework's extended <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> deduplicate them. That is what makes colocating a fetch with the component that needs it the recommended pattern rather than a wasteful one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you actually find a waterfall?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Server-side timing or tracing — log start and end per request and look for a staircase rather than overlapping bars. On the client the Network panel shows the same shape. The tell is a total roughly equal to the sum of the individual durations instead of the largest.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Async Server Component** | A server-only component that awaits data directly |
| **Waterfall** | Independent requests running in sequence |
| **Start early, await late** | Creating a promise before you need its value |
| **Request deduplication** | Identical requests collapsing to one per render pass |
| **Streaming** | Flushing the shell first, then each boundary as it resolves |
| **<code>use()</code>** | How a client component reads a promise from the server |

---
**Conclusion:** an async Server Component removes the entire client-side fetching apparatus — no effect, no loading state, no race condition, no shipped JavaScript — by awaiting on the server next to the data. What it introduces is the waterfall, because sequential <code>await</code>s look natural and make total time the sum of the requests rather than the slowest. Fix it with <code>Promise.all</code> inside a component and by starting promises early and passing them down across components; where the dependency is genuine, contain it behind a Suspense boundary so the rest of the page still streams. Request deduplication is what makes colocating fetches safe in the first place.`,
    examples: [
      {
        label: "Sequential versus parallel, and deferring an await by passing the promise",
        runnable: true,
        code: `import { Suspense, use, useState } from "react";

// This playground is a CLIENT environment, so it cannot run real Server
// Components. The timing behaviour is identical though: what matters is
// whether you await sequentially or start the requests together.
const delay = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
const getUser = () => delay(700, { name: "Ada Lovelace" });
const getPosts = () => delay(700, ["Notes on the Engine", "On Numbers"]);
const getStats = () => delay(700, { followers: 1843 });

async function runSequential() {
  const t0 = performance.now();
  const user = await getUser();     // each await blocks the next line
  const posts = await getPosts();
  const stats = await getStats();
  return { ms: Math.round(performance.now() - t0), user, posts, stats };
}

async function runParallel() {
  const t0 = performance.now();
  // All three start immediately; total is the SLOWEST, not the sum.
  const [user, posts, stats] = await Promise.all([getUser(), getPosts(), getStats()]);
  return { ms: Math.round(performance.now() - t0), user, posts, stats };
}

// "Start early, await late": the promise is created by the parent and passed
// down. On the server this is how you stop a child fetch from waiting for the
// parent to finish rendering.
function PostList({ promise }) {
  const posts = use(promise);
  return <ul style={{ margin: "6px 0" }}>{posts.map((p) => <li key={p}>{p}</li>)}</ul>;
}

export default function App() {
  const [seq, setSeq] = useState(null);
  const [par, setPar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [postsPromise, setPostsPromise] = useState(null);

  const compare = async () => {
    setBusy(true); setSeq(null); setPar(null);
    setSeq(await runSequential());
    setPar(await runParallel());
    setBusy(false);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <button onClick={compare} disabled={busy}>
        {busy ? "measuring…" : "Compare sequential vs parallel"}
      </button>

      <table style={{ marginTop: 12, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 16px 4px 0" }}>three sequential awaits</td>
            <td style={{ color: "#a33" }}><strong>{seq ? seq.ms + "ms" : "—"}</strong></td>
          </tr>
          <tr>
            <td style={{ padding: "4px 16px 4px 0" }}>Promise.all</td>
            <td style={{ color: "#161" }}><strong>{par ? par.ms + "ms" : "—"}</strong></td>
          </tr>
        </tbody>
      </table>

      <hr />
      <h4 style={{ margin: "0 0 8px" }}>Start early, await late</h4>
      <button onClick={() => setPostsPromise(getPosts())}>
        Start the posts request and pass the promise down
      </button>
      {postsPromise && (
        <Suspense fallback={<p style={{ color: "#888" }}>streaming posts…</p>}>
          <PostList promise={postsPromise} />
        </Suspense>
      )}

      <p style={{ color: "#666", fontSize: 13 }}>
        Three 700ms requests: sequential lands near 2100ms, parallel near 700ms.
        Identical work, identical latency — only the arrangement differs.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What underlying mechanism makes the Rules of Hooks mandatory?",
    seoDescription:
      "React matches hook state by call order, not by name. Verified: skipping a conditional hook throws Rendered fewer hooks than expected.",
    description: `**Question presented to candidate:**
"The Rules of Hooks say call them at the top level and never conditionally. What is the actual implementation reason?"

**What a strong answer should cover:**
- React stores a component hook state in an **ordered list on its fiber**, and matches each call to its slot **by position**, not by name.
- There is no identifier available: \`useState(0)\` gives React nothing to key on. The **index** in the call sequence is the identity.
- A conditional call shifts every later hook onto the wrong slot — so a \`useState\` can land on a \`useEffect\` slot, reading another hook's data.
- React detects the count mismatch and throws: **"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."**
- The same reasoning covers early returns, loops with variable counts, and hooks inside nested functions or conditions.
- Why the design: it keeps hooks a plain function call with no registration, no keys, and no boilerplate — an explicit trade of flexibility for ergonomics.
- The tooling angle: this constraint is what makes hooks statically analysable, which is why the ESLint rule can verify them and the React Compiler can memoise safely.
- The workaround: put the condition **inside** the hook, or extract a component.
- \`use()\` is the deliberate exception — it may be called conditionally because it does not own a state slot.

**Clarifying questions expected:**
- "Do you want the failure mode, or why React chose positional matching over named slots?"

**Code / implementation expected:** Optional. A minimal hook implementation using an array and a cursor is the clearest way to show it.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes hooks fluency.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The error in section 3 is React actual message, produced by deliberately calling a hook conditionally on React 19.2.8 and catching what it threw.

## 1. Why This Even Matters — A Story First

A cloakroom that hands out no tickets. Instead the attendant simply remembers: *first coat, second coat, third coat*, and returns them in that order. It works perfectly as long as everyone arrives in the same order they left.

Now suppose the second person skips collection. The attendant hands coat two to person three, coat three to person four, and everything after is wrong — not missing, just silently belonging to someone else. Nobody lied; the system simply has no way to tell whose coat is whose.

React hook state is that cloakroom, and this is why the rules are not stylistic.

## 2. The Core Idea

📌 **Interview term:** React stores hook state in an **ordered list attached to the component fiber**, and matches each hook call to its stored slot **by call order**. There is no name and no key.

Look at the call and the reason becomes obvious:

\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

React receives one argument — the initial value. The variable name <code>count</code> exists only in your code; it never reaches React. So when the component renders again, the only thing available to identify *which* piece of state this is, is **the position of this call in the sequence**.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Hooks map to stored slots by index, so skipping one shifts every later hook">
  <defs>
    <marker id="rh-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The index is the identity</text>
  <text class="d-sub" x="90" y="62" text-anchor="middle">render 1</text>
  <rect class="d-box-accent" x="150" y="44" width="140" height="34" rx="7"/>
  <text class="d-sub" x="220" y="66" text-anchor="middle">useState name</text>
  <rect class="d-box-accent" x="300" y="44" width="140" height="34" rx="7"/>
  <text class="d-sub" x="370" y="66" text-anchor="middle">useState age</text>
  <rect class="d-box-accent" x="450" y="44" width="150" height="34" rx="7"/>
  <text class="d-sub" x="525" y="66" text-anchor="middle">useEffect sync</text>
  <text class="d-sub" x="90" y="118" text-anchor="middle">slots</text>
  <rect class="d-box" x="150" y="100" width="140" height="34" rx="7"/>
  <text class="d-sub" x="220" y="122" text-anchor="middle">0</text>
  <rect class="d-box" x="300" y="100" width="140" height="34" rx="7"/>
  <text class="d-sub" x="370" y="122" text-anchor="middle">1</text>
  <rect class="d-box" x="450" y="100" width="150" height="34" rx="7"/>
  <text class="d-sub" x="525" y="122" text-anchor="middle">2</text>
  <text class="d-sub" x="90" y="180" text-anchor="middle">render 2</text>
  <rect class="d-box-muted" x="150" y="162" width="140" height="34" rx="7"/>
  <text class="d-sub" x="220" y="184" text-anchor="middle">useState name</text>
  <rect class="d-box-muted" x="300" y="162" width="140" height="34" rx="7"/>
  <text class="d-sub" x="370" y="184" text-anchor="middle">useEffect sync</text>
  <rect class="d-box-muted" x="450" y="162" width="150" height="34" rx="7"/>
  <text class="d-sub" x="525" y="184" text-anchor="middle">nothing here</text>
</svg>

In the second render the age hook was skipped, so the effect slid into slot 1 — the slot holding a piece of state. Every hook after the skipped one is now reading the wrong data.

## 3. Verified: what React actually does about it

A component whose second hook is behind a condition, rendered once with the condition true and once false:

\`\`\`jsx
function Conditional({ showSecond }) {
  const [a] = useState("first");
  if (showSecond) { const [b] = useState("second"); }
  const [c] = useState("third");
  return <span>{a}/{c}</span>;
}
\`\`\`

First render (three hooks) worked and produced <code>first/third</code>. The second render (two hooks) threw:

\`\`\`
Rendered fewer hooks than expected.
This may be caused by an accidental early return statement.
\`\`\`

📌 **Interview term:** React compares how many hooks ran against how many the previous render recorded. A mismatch is unrecoverable, so it throws rather than continuing with a corrupted mapping. Worth noting what the message says — it names the **early return** case, because that is the most common way this happens in real code: a guard clause placed above a hook.

## 4. Verified: the slots never move

The mapping really is positional and nothing about your code changes it:

\`\`\`
initial:                            slot-0,slot-1
after swapping only the OUTPUT order: slot-1,slot-0   (state slots never moved)
\`\`\`

Reordering how values are *displayed* has no effect on which slot each <code>useState</code> owns. The binding is made by the order the hooks were **called**, and by nothing else.

## 5. What it looks like from the inside

A minimal version of the mechanism — an array and a cursor reset at the start of each render:

\`\`\`js
let slots = [];
let cursor = 0;

function useState(initial) {
  const i = cursor++;                       // this call position IS the identity
  if (slots[i] === undefined) slots[i] = initial;
  const setState = (v) => { slots[i] = v; render(); };
  return [slots[i], setState];
}

function render() {
  cursor = 0;                               // reset before every render
  Component();
}
\`\`\`

Fifteen lines, and every rule follows from it. Skip a call and <code>cursor</code> no longer lines up. Call one in a loop with a varying count and the same. Call one outside a render and there is no cursor at all.

React real implementation stores a **linked list** on the fiber rather than a module-level array, and keeps separate lists for the mount and update paths — but the identity model is exactly this.

## 6. Why React chose this

It is a deliberate trade. The alternative — requiring a key, like <code>useState("count", 0)</code> — would allow conditional calls, at the cost of naming every hook, keeping names unique, and adding boilerplate to the most common operation in React.

📌 **Interview term:** the positional model also makes hooks **statically analysable**, which is the design principle underneath. Because the call order is fixed and visible in the source, the ESLint plugin can verify correctness without running anything — and the <a href="PASTE_REACT_COMPILER_URL_HERE" target="_blank" rel="noopener noreferrer">React Compiler</a> can determine that memoising is safe. Neither would be possible if hooks could appear anywhere.

## 7. The exception that proves the rule

📌 **Interview term:** <code>use()</code> **may** be called conditionally, and in loops. It is not a hook in the state sense — it does not allocate a slot on the fiber. It reads a promise or a context and either returns a value or suspends. Nothing to store means nothing to misalign, which is exactly why the restriction does not apply.

## 8. Common Pitfalls

- **An early return above a hook.** The exact case React error message names.
- **A hook inside a condition or loop.** Put the condition *inside* the hook, or extract a component.
- **A hook inside a nested function or callback.** It runs outside the render pass and has no cursor.
- **A hook count that varies with data.** <code>items.map(() =&gt; useState())</code> changes the count with the data length.
- **Believing the rules are stylistic.** They are load-bearing; violating them corrupts the state mapping.
- **Disabling the lint rule.** It is the only automatic protection against a class of bug that fails confusingly.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the mechanism immediately:</strong> <span style="color:#f0e2c8;">"React keeps hook state in an ordered list on the fiber and matches each call to its slot by position. There is no name and no key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Point at the call signature:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState(0)</code> passes React only an initial value — the variable name never reaches it. The index is the only identity available."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Describe the failure precisely:</strong> <span style="color:#f0e2c8;">"Skip one and every later hook shifts onto the wrong slot — a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> can land on an effect slot. React catches the count mismatch and throws 'Rendered fewer hooks than expected'."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. If you have a whiteboard, write the ten-line version:</strong> <span style="color:#f0e2c8;">an array, a cursor that increments per call and resets each render. Every rule falls out of it, and it lands better than any explanation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on the design trade:</strong> <span style="color:#f0e2c8;">"Keys would allow conditional calls but add boilerplate everywhere. Positional matching also makes hooks statically analysable — which is what the lint rule and the React Compiler are built on."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not let hooks take a key so they could be conditional?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It was considered and rejected. It would mean naming every hook and keeping those names unique — boilerplate on the single most common operation in React. It would also lose static analysability, which is what lets the ESLint rule verify your code and the compiler decide memoisation is safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly happens if you call one conditionally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every hook after the skipped one reads the previous slot data — a <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> can end up on an effect slot. React detects the count differs from last render and throws "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you conditionally use a hook then?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move the condition inside — always call the hook, and let its argument or its body decide whether to do anything. An effect can return early inside its callback, which is fine because the hook itself still ran. If the difference is structural, extract a component and render that conditionally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">use()</code> be called conditionally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it allocates no state slot. It reads a promise or a context and either returns the value or suspends — there is nothing stored per call, so there is nothing that can be misaligned. That is why React documents it as an exception rather than an inconsistency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where is hook state actually stored?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the component fiber — the internal object React keeps per mounted component — as a linked list of hook records, with separate implementations for the mount and update passes. The mental model of an array plus a cursor is accurate enough for an interview and explains every rule.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fiber** | React internal object representing a mounted component |
| **Hook slot** | One entry in that component ordered hook list |
| **Positional matching** | Identifying a hook by its call index |
| **Cursor** | The pointer advanced once per hook call, reset each render |
| **Static analysability** | Being checkable without running the code |
| **<code>use()</code>** | The exception; allocates no slot, so may be conditional |

---
**Conclusion:** the Rules of Hooks are mandatory because React identifies hook state **positionally** — an ordered list on the fiber, matched by call index, with no name or key available since <code>useState(0)</code> passes React nothing but an initial value. Skip a call and every later hook shifts onto the wrong slot; React notices the count changed and throws "Rendered fewer hooks than expected", naming the early-return case because that is how it usually happens. It is a deliberate trade — keys would allow conditional calls but add boilerplate everywhere and, more importantly, would cost the static analysability that the ESLint rule and the React Compiler both depend on.`,
    examples: [
      {
        label: "A 15-line reimplementation of hook slots, and the rule it forces",
        runnable: true,
        code: `import { useState } from "react";

// ── A miniature of React's mechanism: an array of slots and a cursor. ──────
// This is the whole reason for the Rules of Hooks.
const slots = [];
let cursor = 0;
let rerender = () => {};

function miniUseState(initial) {
  const i = cursor++;                          // THIS position is the identity
  if (!(i in slots)) slots[i] = initial;
  const set = (v) => { slots[i] = v; rerender(); };
  return [slots[i], set, i];
}

function runMiniComponent(includeMiddle) {
  cursor = 0;                                  // reset before every "render"
  const trace = [];
  const [a, , ia] = miniUseState("name");
  trace.push({ hook: "useState(name)", slot: ia, value: a });

  if (includeMiddle) {
    const [b, , ib] = miniUseState("age");
    trace.push({ hook: "useState(age)", slot: ib, value: b });
  }

  const [c, , ic] = miniUseState("effect-data");
  trace.push({ hook: "useEffect-ish", slot: ic, value: c });
  return trace;
}

export default function App() {
  const [renderNo, setRenderNo] = useState(0);
  const [includeMiddle, setIncludeMiddle] = useState(true);
  const trace = runMiniComponent(includeMiddle);
  rerender = () => setRenderNo((n) => n + 1);

  const misaligned = trace.some((t) => t.hook === "useEffect-ish" && t.value !== "effect-data");

  const th = { textAlign: "left", padding: "4px 14px 4px 0", borderBottom: "1px solid #ddd", fontSize: 13 };
  const td = { padding: "4px 14px 4px 0", fontFamily: "ui-monospace, monospace", fontSize: 13 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <p>
        <label>
          <input
            type="checkbox"
            checked={includeMiddle}
            onChange={(e) => setIncludeMiddle(e.target.checked)}
          />{" "}
          call the middle hook
        </label>
      </p>

      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr><th style={th}>hook call</th><th style={th}>slot</th><th style={th}>value it read</th></tr>
        </thead>
        <tbody>
          {trace.map((t, i) => (
            <tr key={i}>
              <td style={td}>{t.hook}</td>
              <td style={td}>{t.slot}</td>
              <td style={{ ...td, color: t.hook === "useEffect-ish" && t.value !== "effect-data" ? "crimson" : "#161" }}>
                {String(t.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 12, color: misaligned ? "crimson" : "#161" }}>
        {misaligned
          ? "Misaligned: the third hook slid onto slot 1 and is now reading the age state."
          : "Aligned: every hook is reading its own slot."}
      </p>

      <p style={{ color: "#666", fontSize: 13 }}>
        Untick the box. Real React would throw "Rendered fewer hooks than
        expected" here — this miniature has no such check, so it shows you the
        corruption the check exists to prevent.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
