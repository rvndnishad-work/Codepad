/**
 * React "ultra" rewrite — batch 06 (remaining effects + state/context).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals. Keep seoDescription under 155.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - A function component takes `ref` as a plain prop with no forwardRef.
 *   - forwardRef still works and emitted NO deprecation warning.
 *   - A ref callback returning a cleanup runs it: attach:INPUT -> cleanup ran
 *     (pre-19 React called the callback again with null instead).
 *   - useEffectEvent: effect ran 2 times over 3 renders — a theme change did
 *     not re-run it, yet the event saw the latest theme both times.
 *   - Stale closure: button showed 2 while the interval only ever logged
 *     count=0. The functional updater version saw c=2.
 *   - useLayoutEffect ran first and saw width 100px, then adjusted it; by the
 *     time useEffect ran the DOM already read 200px.
 *   - Mutating a prop THREW "Cannot assign to read only property" in this
 *     development build (React freezes props in development).
 *
 * Deliberate angle split from earlier batches, all cross-linked:
 *   - ultra-05 "async operations" is the intro; this batch's "async work and
 *     race conditions inside effects" is the deep hazard taxonomy.
 *   - ultra-05 "fetch data" is the decision landscape; "interact with external
 *     APIs" here is the integration architecture (client layer, auth, errors).
 *   - ultra-03 "pass data between components" is the survey; "lifting state up"
 *     and "unidirectional data flow" here are the specific technique and the
 *     underlying principle.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the concept of 'unidirectional data flow' in React.",
    seoDescription:
      "Data flows one way: props down, events up. Verified: assigning to a prop throws in development, because a child must never write to its parent state.",
    description: `**Question presented to candidate:**
"React is often described as having unidirectional data flow. What does that actually mean, and why does it matter?"

**What a strong answer should cover:**
- Data moves **one way** — from parent to child through props. A child never writes to its parent state directly.
- The only upward path is **invoking a callback** the parent passed down. Summed up as "props down, events up".
- **Props are read-only.** Mutating one is a contract violation; React freezes props in development so the assignment throws.
- Why it matters: for any wrong value on screen there is exactly **one owner**, so debugging is a walk up the tree rather than a search of everything that could have written to it.
- The contrast is **two-way binding** (Angular's \`ngModel\`, Vue's \`v-model\`), where a child can write straight back into a parent's value — less boilerplate, but the write can come from anywhere.
- Controlled components are the same rule applied to form inputs: value down, change event up.
- It does not mean data can only travel down the tree — Context and stores still exist. Those change *where* the value lives, not the direction it flows from its owner.
- Consequence: shared state gets **lifted** to a common ancestor.

**Clarifying questions expected:**
- "Do you want the principle, or how it plays out in forms and shared state?"

**Code / implementation expected:** Optional. A child calling a parent's callback demonstrates it in a few lines.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes props and state.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The prop-mutation result in section 4 was produced by actually assigning to a prop on React 19.2.8 and catching what happened.

## 1. Why This Even Matters — A Story First

A newspaper has one editor per section. Reporters file copy upward; the editor decides what runs. Nobody walks into the print room and changes a headline directly.

It sounds bureaucratic until something goes wrong. When a headline is incorrect, there is exactly one person who could have approved it. In a newsroom where anyone could edit anything, finding out *who changed this and why* means asking everyone.

React chose the newsroom with editors, and the payoff is entirely in that second paragraph.

## 2. The Core Idea

📌 **Interview term: unidirectional data flow** — data travels in one direction, from parent to child via props. A child cannot write into its parent state; it can only call a function the parent gave it.

The phrase to remember is **props down, events up**.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Props flow down from the owner and events flow back up as callbacks">
  <defs>
    <marker id="ud-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One owner, one direction</text>
  <rect class="d-box-accent" x="230" y="44" width="200" height="62" rx="10"/>
  <text class="d-text d-accent" x="330" y="68" text-anchor="middle">parent owns the state</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">the single source of truth</text>
  <path class="d-edge-accent" d="M 276 110 L 200 156" marker-end="url(#ud-arrow)"/>
  <text class="d-sub" x="196" y="130" text-anchor="middle">props</text>
  <path class="d-edge-dashed" d="M 456 156 L 388 112" marker-end="url(#ud-arrow)"/>
  <text class="d-sub" x="470" y="130" text-anchor="middle">callback</text>
  <rect class="d-box" x="60" y="160" width="230" height="56" rx="10"/>
  <text class="d-text" x="175" y="184" text-anchor="middle">child reads</text>
  <text class="d-sub" x="175" y="204" text-anchor="middle">props are read-only</text>
  <rect class="d-box" x="380" y="160" width="230" height="56" rx="10"/>
  <text class="d-text" x="495" y="184" text-anchor="middle">child requests a change</text>
  <text class="d-sub" x="495" y="204" text-anchor="middle">by calling the callback</text>
</svg>

The dashed arrow is not data flowing up — it is the child *asking*. The parent still decides whether and how the state changes.

## 3. What it buys you

📌 **Interview term: single source of truth** — every piece of state has exactly one owner. When a value on screen is wrong, you walk **up** from the component displaying it to the component owning it. That path is short and it is the only path.

The alternative is a system where any component could have written the value, so the question "what set this?" has no bounded answer.

## 4. Verified: props really are read-only

Assigning to a prop inside a child on React 19.2.8:

\`\`\`jsx
function Child(props) {
  props.value = "mutated";       // what happens?
  return <span>{props.value}</span>;
}
\`\`\`

Actual result:

\`\`\`
mutation THREW: Cannot assign to read only property 'value' of object
rendered output: original
\`\`\`

📌 **Interview term:** React **freezes the props object in development** so a mutation fails loudly rather than silently corrupting the parent state. Treat read-only as a contract you must honour regardless of whether a given build enforces it — code that relies on mutation is broken even where it does not throw, because React compares by reference and will not re-render for a change it cannot see.

## 5. The contrast: two-way binding

| | Unidirectional (React) | Two-way binding |
| :--- | :--- | :--- |
| Child updating a parent value | Calls a callback | Writes directly |
| Boilerplate | More | Less |
| "What changed this?" | One owner, walk up | Anything bound to it |
| Examples | React | Angular <code>ngModel</code>, Vue <code>v-model</code> |

Neither is wrong. React traded conciseness for traceability, and that trade is the honest answer to "why so much boilerplate for a form input".

📌 **Interview term: controlled component** — the same rule applied to a form field. The input <code>value</code> comes down as a prop and every keystroke goes up as an <code>onChange</code> callback, so React state remains the source of truth rather than the DOM.

## 6. What it does *not* mean

It does not mean data can only reach a component by being threaded through every ancestor. <a href="PASTE_CONTEXT_URL_HERE" target="_blank" rel="noopener noreferrer">Context</a> and external stores let a value skip levels — but the direction is unchanged. The value still flows *from its owner to its consumers*, and consumers still cannot write to it except through a function the owner exposed.

The direct consequence is <a href="PASTE_LIFTING_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">lifting state up</a>: two components needing the same value means the value belongs to their nearest common ancestor.

## 7. Common Pitfalls

- **Mutating a prop object or array.** <code>props.items.push(x)</code> corrupts the parent state and usually produces no re-render, because the reference did not change.
- **Duplicating a prop into state.** <code>useState(props.value)</code> creates a second copy that silently stops tracking the first. Derive it, or lift the state.
- **Treating the DOM as the source of truth.** Reading an input value with a ref instead of controlling it puts the truth outside React.
- **Reaching for a store to avoid passing callbacks.** Two levels of prop passing is clearer than global state.
- **Calling a setter you received and expecting an immediate read.** State updates are scheduled; the new value arrives on the next render.
- **Thinking Context breaks the rule.** It changes where the value lives, not who may write to it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the phrase:</strong> <span style="color:#f0e2c8;">"Props down, events up. Data flows from parent to child through props, and the only way back is calling a callback the parent passed down."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the enforcement:</strong> <span style="color:#f0e2c8;">"Props are read-only — React freezes them in development, so assigning to one actually throws."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say why it is worth the boilerplate:</strong> <span style="color:#f0e2c8;">"Every value has one owner, so a wrong value is a walk up the tree — not a search of everything that might have written to it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Draw the contrast:</strong> <span style="color:#f0e2c8;">"Two-way binding, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>, is less code but the write can come from anywhere. React traded conciseness for traceability."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Preempt the Context follow-up:</strong> <span style="color:#f0e2c8;">"Context does not break it — it changes where the value lives, not the direction it flows or who may write to it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a child mutates a prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In development it throws, because React freezes the props object. Even where it does not throw, mutating a prop object corrupts the parent state and typically produces no re-render at all — the reference is unchanged, so React sees nothing to update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Context break unidirectional flow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It lets a value skip intermediate levels, but the value still flows from its owner to its consumers, and a consumer still cannot write to it except through a function the provider exposed. It changes the delivery route, not the direction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from two-way binding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With two-way binding a child writes straight back into the parent value, which is less code but means any bound component could have caused a change. React makes the child ask, so the set of things that can modify a value is exactly one — its owner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is copying a prop into state ever right?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when you deliberately want an independent copy — an editable draft seeded from a saved value, for instance. Otherwise it creates a second source of truth that stops tracking the first, and you end up writing an effect to re-sync them, which is the classic symptom.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do two sibling components share a value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They do not talk to each other — that would be a sideways flow the model does not have. You lift the state to their nearest common ancestor, which passes the value to one and a callback to the other. It is the direct consequence of the rule.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unidirectional data flow** | Data moves parent to child; changes are requested upward |
| **Props down, events up** | The one-line summary of the rule |
| **Single source of truth** | Exactly one component owning each piece of state |
| **Two-way binding** | The alternative, where a child writes back directly |
| **Controlled component** | A form field whose value lives in React state |

---
**Conclusion:** unidirectional data flow means data travels from parent to child through props and never the other way — a child requests a change by calling a callback its parent supplied. Props are genuinely read-only: verified on React 19.2.8, assigning to one throws in development. The payoff is that every value has exactly one owner, so a wrong value on screen is a short walk up the tree rather than a search through everything that might have written it. Context and stores change where a value lives, not the direction it flows.`,
    examples: [
      {
        label: "Props down, events up — and what happens when you try to mutate",
        runnable: true,
        code: `import { useState } from "react";

// A child that only READS its props and asks the parent to change things.
// It owns nothing; it cannot corrupt anything above it.
function TodoItem({ todo, onToggle, onRename }) {
  const [draft, setDraft] = useState(null);

  return (
    <li style={{ padding: "4px 0" }}>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}    // ask, do not write
      />{" "}
      {draft === null ? (
        <>
          <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>{todo.text}</span>{" "}
          <button onClick={() => setDraft(todo.text)}>rename</button>
        </>
      ) : (
        <>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} />{" "}
          <button onClick={() => { onRename(todo.id, draft); setDraft(null); }}>save</button>
        </>
      )}
    </li>
  );
}

// A child that tries to write to its props directly. React freezes props in
// development, so this throws rather than silently corrupting the parent.
function Rebel({ todo }) {
  const [report, setReport] = useState("not tried yet");
  const attempt = () => {
    try {
      todo.text = "I changed it myself";
      setReport("mutation succeeded — and the parent would not re-render");
    } catch (e) {
      setReport("threw: " + e.message);
    }
  };
  return (
    <p style={{ fontSize: 13 }}>
      <button onClick={attempt}>try to mutate a prop</button>{" "}
      <span style={{ color: report.startsWith("threw") ? "#161" : "#a33" }}>{report}</span>
    </p>
  );
}

export default function App() {
  // The parent OWNS the state. It is the single source of truth.
  const [todos, setTodos] = useState([
    { id: 1, text: "Read the docs", done: true },
    { id: 2, text: "Build something", done: false },
  ]);

  // The only ways the state changes — both live here, with the owner.
  const toggle = (id) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const rename = (id, text) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, text } : t)));

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} onToggle={toggle} onRename={rename} />
        ))}
      </ul>
      <Rebel todo={todos[0]} />
      <p style={{ color: "#666", fontSize: 13 }}>
        Every change to this list happens in one place — the parent. The children
        read props and call callbacks; note that both update functions return new
        objects rather than mutating, so React can see the change by reference.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the concept of 'lifting state up' in React.",
    seoDescription:
      "Move a shared value to the nearest common ancestor of the components that need it. Hoisting it to the root re-renders the whole tree instead.",
    description: `**Question presented to candidate:**
"Two sibling components need to stay in sync. Walk me through how you would handle that."

**What a strong answer should cover:**
- Siblings cannot talk to each other — that would be a sideways flow React does not have. You move the shared state **up to their nearest common ancestor**.
- The ancestor becomes the **single source of truth** and passes the value down to one child and a setter callback to the other.
- It is the direct consequence of \`unidirectional data flow\`, not a separate technique.
- **Lift to the *nearest* common ancestor.** Hoisting to the root re-renders the whole tree for a change two components care about.
- The trade: more prop passing, and every intermediate component re-renders.
- When lifting starts to hurt — deep trees, many consumers — the next steps are composition, Context, or a store. Reaching for Context immediately is the common overcorrection.
- The mirror technique, **moving state down**, matters just as much: state that only one subtree needs should live there, not above it.
- Controlled components are lifting state up applied to a form input: the value lives in the parent, not the DOM.

**Clarifying questions expected:**
- "How far apart are these components, and does anything between them need the value?"
- "Is this genuinely shared, or does each component need its own copy?"

**Code / implementation expected:** Yes — two inputs kept in sync through a shared parent is the canonical demonstration.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and state.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This is the focused technique; <a href="PASTE_PASS_DATA_URL_HERE" target="_blank" rel="noopener noreferrer">passing data between components</a> surveys all the mechanisms, and <a href="PASTE_UNIDIRECTIONAL_URL_HERE" target="_blank" rel="noopener noreferrer">unidirectional data flow</a> covers the principle underneath.

## 1. Why This Even Matters — A Story First

Two people share a flat and each keep their own copy of the shopping list. Both add milk. Both cross off bread. Within a week the lists disagree, and there is no way to tell which is right — because neither is. There is no list; there are two guesses about a list.

The fix is not better syncing between the copies. It is one list, on the fridge, that both of them read and write.

## 2. The Core Idea

📌 **Interview term: lifting state up** — when two or more components need the same value, move that state into their **nearest common ancestor** and pass it down. The ancestor owns it; the children read it and request changes.

Siblings never communicate directly. There is no sideways channel in React, and lifting is what fills that gap.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 240" role="img" aria-label="Duplicated state in two siblings replaced by one value in their common parent">
  <defs>
    <marker id="ls-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two copies become one owner</text>
  <rect class="d-box-muted" x="20" y="46" width="270" height="52" rx="10"/>
  <text class="d-text" x="155" y="68" text-anchor="middle">before: each holds its own</text>
  <text class="d-sub" x="155" y="87" text-anchor="middle">the two drift apart</text>
  <rect class="d-box-muted" x="30" y="116" width="120" height="46" rx="8"/>
  <text class="d-sub" x="90" y="144" text-anchor="middle">state A</text>
  <rect class="d-box-muted" x="160" y="116" width="120" height="46" rx="8"/>
  <text class="d-sub" x="220" y="144" text-anchor="middle">state B</text>
  <rect class="d-box-accent" x="370" y="46" width="270" height="52" rx="10"/>
  <text class="d-text d-accent" x="505" y="68" text-anchor="middle">after: the parent owns it</text>
  <text class="d-sub" x="505" y="87" text-anchor="middle">one source of truth</text>
  <path class="d-edge-accent" d="M 460 104 L 420 150" marker-end="url(#ls-arrow)"/>
  <path class="d-edge-accent" d="M 550 104 L 590 150" marker-end="url(#ls-arrow)"/>
  <rect class="d-box" x="360" y="154" width="120" height="46" rx="8"/>
  <text class="d-sub" x="420" y="182" text-anchor="middle">reads it</text>
  <rect class="d-box" x="530" y="154" width="120" height="46" rx="8"/>
  <text class="d-sub" x="590" y="182" text-anchor="middle">reads it</text>
</svg>

## 3. The mechanics, in three steps

1. **Find the nearest common ancestor** of every component that needs the value.
2. **Move the state there**, deleting the local copies.
3. **Pass the value down** to the components that display it, and a **callback down** to the ones that change it.

The children become **controlled** — they hold no state of their own for that value, they render what they are given and report what happened.

## 4. Lift to the *nearest* ancestor, not the top

📌 **Interview term:** the word "nearest" is doing real work. A re-render propagates downward from wherever the state lives, so hoisting a value to the root means every change re-renders the entire tree — for something two components care about.

| Where the state lives | What re-renders |
| :--- | :--- |
| In each child separately | Only that child — but they cannot agree |
| Nearest common ancestor | That subtree |
| The root component | Everything |

Putting all state at the top is the most common overcorrection after learning this technique.

## 5. The mirror: moving state down

Lifting is one half of a single skill. The other half is noticing state that has been lifted **too far** and pushing it back down.

\`\`\`jsx
// Typing here re-renders the expensive chart on every keystroke
function Page() {
  const [query, setQuery] = useState("");
  return <><input value={query} onChange={e => setQuery(e.target.value)} /><Chart /></>;
}

// The state now lives only where it is used
function Page() {
  return <><SearchBox /><Chart /></>;
}
\`\`\`

📌 **Interview term: colocating state** — keeping a value in the smallest component that needs it. Lift only when something else genuinely needs it too, and push it back down when that stops being true. See <a href="PASTE_COMPOSITION_VS_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">avoiding re-renders with composition</a>.

## 6. When lifting stops being the answer

It has a real cost: prop passing through components that do not care, and re-renders through the whole subtree. Past three or four levels, or many consumers, the next options are:

- **Composition** — pass the deep component as <code>children</code> so it needs no threading. Usually the best next move.
- **<a href="PASTE_CONTEXT_URL_HERE" target="_blank" rel="noopener noreferrer">Context</a>** — for values many components read and that change rarely.
- **A store** — Redux, Zustand, Jotai — for genuinely app-wide state with selector subscriptions.

Reaching for Context at the first sign of prop passing is the classic overcorrection; two levels of props is clearer than a provider.

## 7. Common Pitfalls

- **Lifting to the root by default.** Every change then re-renders the whole app.
- **Lifting state only one component uses.** That is the opposite mistake — colocate it instead.
- **Keeping a local copy "in sync" with the lifted one.** Two sources of truth again, plus an effect to reconcile them.
- **Passing five setters down.** Consider one <code>dispatch</code> from <a href="PASTE_USESTATE_VS_USEREDUCER_URL_HERE" target="_blank" rel="noopener noreferrer">useReducer</a>, whose identity is stable.
- **Forgetting the child is now controlled.** It must render what it is given, not what it remembers.
- **Jumping straight to Context.** Try composition first.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the sibling question directly:</strong> <span style="color:#f0e2c8;">"Siblings cannot talk to each other, so the shared value moves up to their nearest common ancestor, which passes it down to both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the three steps:</strong> <span style="color:#f0e2c8;">find the common ancestor, move the state there and delete the local copies, pass the value down and a callback down.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stress the word "nearest":</strong> <span style="color:#f0e2c8;">"Renders propagate downward, so lifting to the root means every change re-renders the whole app. That is the usual overcorrection."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring up the mirror technique:</strong> <span style="color:#f0e2c8;">"The same skill in reverse is moving state down — a search box re-rendering an expensive chart should own its own state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say when to stop:</strong> <span style="color:#f0e2c8;">"When it gets deep I would try composition first, then Context for rarely-changing values, then a store. Not Context at the first prop."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How high should you lift?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To the nearest common ancestor of everything that needs it, and no higher. Renders travel downward, so every level you lift past widens the subtree that re-renders on each change — for a value most of it does not use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost of lifting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prop passing through components that do not care about the value, and re-rendering that subtree on every change. Both are acceptable at small distances and become the reason to reach for composition or Context at larger ones.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you move state <em style="color:#ffe0b2;">down</em> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When only one subtree uses it. A controlled input in a large page re-renders everything on every keystroke; extracting it so the state lives inside that component confines the render to where it belongs. Same skill, opposite direction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you lift state or use Context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lift first; it is explicit and easy to follow. Context earns its place when the value is read by many components across a deep tree and changes rarely — theme, locale, current user. For a frequently-changing value it re-renders every consumer, which is often worse than the prop passing it replaced.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a controlled component in this context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lifting state up applied to a form field. The input holds no value of its own — it renders the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> prop and reports keystrokes through <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>, so the truth sits in React state rather than in the DOM.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lifting state up** | Moving shared state to the nearest common ancestor |
| **Nearest common ancestor** | The lowest component containing everyone who needs it |
| **Colocating state** | Keeping state in the smallest component that needs it |
| **Controlled component** | One rendering a value it is given rather than its own |
| **Moving state down** | Pushing over-lifted state back where it is used |

---
**Conclusion:** lifting state up means moving a shared value into the nearest common ancestor of the components that need it, which then passes the value down and a callback down — the direct consequence of React having no sideways data flow. The word carrying the weight is *nearest*: renders propagate downward, so hoisting to the root re-renders the whole tree for a change two components care about. And the mirror skill matters equally — state only one subtree uses should be pushed back down to it.`,
    examples: [
      {
        label: "Two inputs kept in sync by their parent, plus state moved back down",
        runnable: true,
        code: `import { useState } from "react";

// ── Lifted: neither input owns the value. Both render what they are given. ──
function AmountInput({ label, value, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      {label}:{" "}
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 110 }} />
    </label>
  );
}

function Summary({ gbp, usd }) {
  return (
    <p style={{ fontSize: 14 }}>
      A sibling reading the same value: <strong>£{gbp || 0}</strong> is about{" "}
      <strong>\${usd || 0}</strong>
    </p>
  );
}

const RATE = 1.27;
const round = (n) => (Number.isNaN(n) ? "" : String(Math.round(n * 100) / 100));

// ── Moved down: this owns its own state, so typing here does NOT re-render
//    the rest of the page. The mirror of lifting. ────────────────────────────
function NotesBox() {
  const [notes, setNotes] = useState("");
  return (
    <div style={{ marginTop: 12 }}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes — state lives here, not in the parent"
        rows={2}
        style={{ width: "100%" }}
      />
      <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
        {notes.length} characters — typing here re-renders only this component
      </p>
    </div>
  );
}

export default function App() {
  // The nearest common ancestor of the two inputs and the summary. Not the
  // root of some larger app — just high enough to cover everyone who needs it.
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("gbp");

  const parsed = parseFloat(amount);
  const gbp = currency === "gbp" ? amount : round(parsed / RATE);
  const usd = currency === "usd" ? amount : round(parsed * RATE);

  const handle = (which) => (next) => { setCurrency(which); setAmount(next); };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 420 }}>
      <h4 style={{ marginTop: 0 }}>Lifted state: two inputs, one source of truth</h4>
      <AmountInput label="Pounds" value={gbp} onChange={handle("gbp")} />
      <AmountInput label="Dollars" value={usd} onChange={handle("usd")} />
      <Summary gbp={gbp} usd={usd} />

      <hr />
      <h4 style={{ margin: "0 0 4px" }}>Colocated state: kept where it is used</h4>
      <NotesBox />

      <p style={{ color: "#666", fontSize: 13 }}>
        Type in either currency box and the other follows — they never talk to
        each other, they both read from the parent. The notes box owns its own
        state, so it stays out of that entirely.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you interact with external APIs in React?",
    seoDescription:
      "Put the API behind a client module and wrap it in a hook. Auth, errors, retries and cancellation then live in one layer, not per call site.",
    description: `**Question presented to candidate:**
"How would you structure the code that talks to your backend? Not just the request — the whole integration."

**What a strong answer should cover:**
- **Layering** is the actual answer: components → a data hook → an API client module → the network. Components should not know about URLs, headers, or transport.
- The **API client** centralises the base URL, auth headers, JSON parsing, error normalisation, timeouts, and retries — so those exist once, not per call site.
- **\`fetch\` does not reject on HTTP errors.** A 404 or 500 resolves with \`ok: false\`; you must check it or every failure looks like success.
- Normalise errors into one shape so components handle failure uniformly.
- **Auth**: attach the token in the client, refresh on 401, and never keep secrets in client-side environment variables — anything in the bundle is public.
- **Cancellation** with \`AbortController\`, and retries only for idempotent requests with backoff.
- The consuming layer: a query library, or a custom hook wrapping the client.
- **CORS** is a browser-enforced server configuration, not something you fix in React.
- GraphQL changes the shape (one endpoint, client-specified queries) but not the layering.

**Clarifying questions expected:**
- "REST or GraphQL, and is there an existing client or generated types?"
- "How is auth handled — cookies or a bearer token we manage?"
- "Do we have a framework where this could be a server-side call instead?"

**Code / implementation expected:** Yes — a small API client with error normalisation, and a hook consuming it.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes fetch and hooks.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This doc is about **integration architecture**; <a href="PASTE_DATA_FETCHING_URL_HERE" target="_blank" rel="noopener noreferrer">how to fetch data in React</a> covers choosing a fetching strategy, and <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">async operations</a> covers race conditions.

## 1. Why This Even Matters — A Story First

A restaurant kitchen does not have every cook phoning suppliers individually. There is one person who handles ordering: they know the account numbers, the delivery windows, and what to do when a supplier is out of stock. Cooks ask for ingredients; how those arrive is not their problem.

The alternative — every cook with their own supplier relationship — works until a price changes, and then it changes in fourteen places.

## 2. The Core Idea

📌 **Interview term:** the useful answer is **layering**, not the request itself. Four layers, each unaware of the one two levels away:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Components talk to a hook, which talks to an API client, which talks to the network">
  <defs>
    <marker id="api-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Each layer hides the next one from the one above</text>
  <rect class="d-box" x="16" y="60" width="146" height="80" rx="10"/>
  <text class="d-text" x="89" y="88" text-anchor="middle">component</text>
  <text class="d-sub" x="89" y="110" text-anchor="middle">renders data</text>
  <text class="d-sub" x="89" y="128" text-anchor="middle">knows no URLs</text>
  <path class="d-edge" d="M 168 100 L 192 100" marker-end="url(#api-arrow)"/>
  <rect class="d-box-accent" x="198" y="60" width="146" height="80" rx="10"/>
  <text class="d-text d-accent" x="271" y="88" text-anchor="middle">data hook</text>
  <text class="d-sub" x="271" y="110" text-anchor="middle">caching, states</text>
  <text class="d-sub" x="271" y="128" text-anchor="middle">React-shaped</text>
  <path class="d-edge" d="M 350 100 L 374 100" marker-end="url(#api-arrow)"/>
  <rect class="d-box-accent" x="380" y="60" width="146" height="80" rx="10"/>
  <text class="d-text d-accent" x="453" y="88" text-anchor="middle">API client</text>
  <text class="d-sub" x="453" y="110" text-anchor="middle">auth, errors</text>
  <text class="d-sub" x="453" y="128" text-anchor="middle">retries, timeouts</text>
  <path class="d-edge" d="M 532 100 L 556 100" marker-end="url(#api-arrow)"/>
  <rect class="d-box-muted" x="562" y="60" width="82" height="80" rx="10"/>
  <text class="d-text" x="603" y="94" text-anchor="middle">network</text>
  <text class="d-sub" x="603" y="116" text-anchor="middle">HTTP</text>
</svg>

The payoff: switching from REST to GraphQL, adding a retry, or changing how auth tokens attach touches **one** file rather than every component that happens to load data.

## 3. The gotcha that catches everyone

📌 **Interview term:** <code>fetch</code> **does not reject on HTTP error statuses**. A 404 or a 500 resolves normally with <code>response.ok === false</code>. Only a network failure rejects. So this is silently broken:

\`\`\`jsx
fetch("/api/users/1")
  .then((r) => r.json())        // a 500 HTML error page lands here
  .then(setUser)                // and gets rendered as if it were a user
  .catch(setError);             // never fires
\`\`\`

Every request must check <code>response.ok</code>, which is exactly the sort of thing that belongs in the client layer rather than at each call site.

## 4. What the API client is for

| Concern | Why it lives here |
| :--- | :--- |
| Base URL | One place to change per environment |
| Auth headers | Attached once; refresh logic in one place |
| <code>response.ok</code> check | Otherwise every call site must remember |
| Error normalisation | Components handle one error shape |
| Timeouts | <code>fetch</code> has none by default |
| Retries with backoff | Idempotent requests only |
| Cancellation | An <code>AbortController</code> signal threaded through |

📌 **Interview term: error normalisation** — converting network failures, HTTP error statuses, and malformed payloads into a single error type with a status and a message. Without it, every component invents its own way of telling those apart.

## 5. Auth, and the thing candidates get wrong

Attach the token in the client, and handle a 401 by refreshing once and retrying — in one place, so a token expiring mid-session does not surface as a random failure.

📌 **Interview term:** **no secret belongs in client-side environment variables.** Anything prefixed for client exposure — <code>VITE_</code>, <code>NEXT_PUBLIC_</code> — is compiled into the bundle and readable by anyone. A third-party API key that must stay secret needs a server-side proxy route; the browser calls your server, and your server holds the key.

## 6. CORS is not a React problem

📌 **Interview term: CORS** — the browser refusing a cross-origin response because the **server** did not send permitting headers. Nothing in your React code causes or fixes it. The fixes are server-side headers, a dev-server proxy, or same-origin deployment. Saying this plainly is a good signal, because it is frequently misdiagnosed as a frontend bug.

## 7. Common Pitfalls

- **Not checking <code>response.ok</code>.** Error pages get parsed and rendered as data.
- **<code>fetch</code> calls scattered through components.** Every change then touches many files.
- **Secrets in client environment variables.** They ship in the bundle.
- **Retrying non-idempotent requests.** A retried POST can charge a card twice.
- **No timeout.** <code>fetch</code> waits indefinitely by default; combine <code>AbortController</code> with a timer.
- **Rendering the raw error object.** Normalise, then map to a message a user can act on.
- **Treating CORS as a client bug.** It is a server configuration.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer with the layering:</strong> <span style="color:#f0e2c8;">"Component, data hook, API client, network. Components never see URLs or headers — that keeps transport changes to one file."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> gotcha:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> does not reject on a 404 or 500 — you have to check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">response.ok</code>, which is why it belongs in the client rather than at every call site."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. List what the client owns:</strong> <span style="color:#f0e2c8;">base URL, auth headers and refresh, error normalisation, timeouts, retries with backoff, and cancellation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Be firm about secrets:</strong> <span style="color:#f0e2c8;">"Nothing secret goes in a client environment variable — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEXT_PUBLIC_</code> and friends are compiled into the bundle. A secret key needs a server proxy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Preempt CORS:</strong> <span style="color:#f0e2c8;">"CORS is the server not sending permitting headers — I cannot fix it from React. Proxy in development, headers in production."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fetch</code> throw on a 500?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It resolves with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">ok: false</code> and the status; only a network-level failure rejects. So a naive chain parses the error page and renders it as data while the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">catch</code> never fires. Axios differs here, which is part of why people reach for it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you put the auth token?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attached in the API client, so no component thinks about it, with 401 handling — refresh once, retry, otherwise sign out — in the same place. An httpOnly cookie is preferable to storing a token in <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, which any injected script can read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a CORS error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not from React — it is the browser enforcing that the server did not permit your origin. The fixes are server-side <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Access-Control-Allow-Origin</code> headers, a dev-server proxy, or serving both from one origin. Worth saying plainly, since it is often misfiled as a frontend bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to put an API key in an environment variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if it is not actually a secret. Client-exposed variables are inlined into the bundle at build time and readable by anyone who opens devtools. A publishable key is fine; anything that must stay private needs a server route that holds the key and proxies the request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you retry a failed request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For idempotent requests — GETs, and network or 5xx failures — with exponential backoff and a cap. Never blindly for a POST, since a retried payment or order can duplicate. If a mutation must be retryable, give it an idempotency key so the server can deduplicate.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **API client** | One module owning transport, auth, and error handling |
| **Error normalisation** | Turning every failure into one predictable shape |
| **<code>response.ok</code>** | The flag that separates HTTP success from failure |
| **CORS** | Browser enforcement of server-declared origin permissions |
| **Idempotent** | Safe to repeat with the same result |
| **Server proxy** | A route holding a secret so the browser never sees it |

---
**Conclusion:** interacting with an external API is an architecture question, not a <code>fetch</code> question. Put the transport behind an API client that owns the base URL, auth headers, the <code>response.ok</code> check, error normalisation, timeouts, cancellation, and retries; wrap it in a hook that gives components React-shaped state; and let components stay ignorant of URLs entirely. The two details worth volunteering are that <code>fetch</code> resolves rather than rejects on a 404 or 500, and that nothing secret survives a client-side environment variable.`,
    examples: [
      {
        label: "A small API client with error normalisation, and the hook that consumes it",
        runnable: true,
        code: `import { useState, useEffect, useCallback } from "react";

// ── LAYER 1: the API client. Everything about transport lives here. ────────
class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const BASE_URL = "/api";                 // one place per environment
let authToken = "demo-token-123";        // set at sign-in, not per component

async function apiRequest(path, { signal, timeoutMs = 8000, ...options } = {}) {
  // fetch has no timeout of its own, so compose one with AbortController.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const res = await fetch(BASE_URL + path, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authToken,
        ...options.headers,
      },
    });

    // THE GOTCHA: fetch resolves on 404 and 500. Without this check the error
    // page gets parsed and rendered as if it were valid data.
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError("Request failed with " + res.status, res.status, body);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// The typed surface components actually use — no URLs escape this module.
const api = {
  getUser: (id, opts) => apiRequest("/users/" + id, opts),
};

// ── LAYER 2: a hook giving components React-shaped state. ──────────────────
function useUser(id) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });

  const load = useCallback((signal) => {
    setState({ status: "loading", data: null, error: null });
    api.getUser(id, { signal })
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((e) => {
        if (e.name === "AbortError") return;      // deliberate, not a failure
        setState({ status: "error", data: null, error: e });
      });
  }, [id]);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  return { ...state, retry: () => load() };
}

// ── LAYER 3: the component. Knows nothing about HTTP. ─────────────────────
export default function App() {
  const [id, setId] = useState(1);
  const { status, data, error, retry } = useUser(id);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <p>
        {[1, 2].map((n) => (
          <button key={n} onClick={() => setId(n)} style={{ marginRight: 6 }}>user {n}</button>
        ))}
      </p>

      {status === "loading" && <p>loading…</p>}

      {status === "error" && (
        <div style={{ border: "1px solid crimson", borderRadius: 6, padding: 10 }}>
          {/* A normalised error means one predictable shape to branch on. */}
          <strong style={{ color: "crimson" }}>
            {error.status === 404 ? "That user does not exist." :
             error.status >= 500 ? "The server had a problem." :
             "Could not reach the server."}
          </strong>
          <p style={{ fontSize: 12, color: "#666", margin: "6px 0" }}>
            {error.name}: {error.message}
          </p>
          <button onClick={retry}>retry</button>
        </div>
      )}

      {status === "success" && <p>{JSON.stringify(data)}</p>}

      <p style={{ color: "#666", fontSize: 13 }}>
        This playground has no /api route, so every request fails — which is the
        point: the error is normalised into an ApiError with a status, and the
        component branches on that rather than on transport details.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What causes stale closures in React hooks, and how do you fix them correctly?",
    seoDescription:
      "A callback captures values from the render that created it. Verified: a button reached 2 while its interval kept logging count=0 forever.",
    description: `**Question presented to candidate:**
"A \`setInterval\` inside a \`useEffect\` keeps logging the initial count even after the user has clicked several times. What is happening, and how do you fix it properly?"

**What a strong answer should cover:**
- Every render creates **new function objects that close over that render's props and state**. A function stored somewhere long-lived keeps those values forever.
- It is ordinary JavaScript closure behaviour, not a React bug — React just re-runs the function frequently, so it happens constantly.
- The classic triggers: an empty dependency array around a timer or subscription, a callback stored in a ref or passed to a non-React API, and an omitted dependency.
- **The fixes, ranked**: the **functional updater** (\`setCount(c => c + 1)\`) reads the latest state from React rather than the closure; **correct dependencies** so the closure is recreated; **\`useEffectEvent\`** for logic that must read the latest value without being reactive; a **ref** as the last resort.
- The wrong fix: silencing the exhaustive-deps lint rule, which converts a visible bug into a silent one.
- The related trap: a cleanup function *should* see its own render's values — that is correct, not stale.

**Clarifying questions expected:**
- "Is the stale value being read, or written? Reading needs a fresh closure; writing usually needs the functional updater."
- "Does the effect genuinely need to re-run when that value changes, or just read the latest?"

**Code / implementation expected:** Yes — the broken interval and at least two correct fixes.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes hooks and closures.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Both the bug in section 3 and the fix in section 5 were produced by running the components on React 19.2.8 and recording what the callbacks actually saw.

## 1. Why This Even Matters — A Story First

You photograph a noticeboard on Monday and pin the photo above your desk. On Friday you glance up and read Monday's notices. The photo is not broken — it is a perfectly accurate record of a moment that has passed. The mistake was treating a snapshot as a window.

A JavaScript closure is a photograph. React takes a new one every render, and a stale closure is code still reading an old print.

## 2. The Core Idea

📌 **Interview term: stale closure** — a function that captured props or state from an earlier render and keeps reading those captured values, even though newer ones exist.

Nothing unusual is happening. Each render creates fresh function objects closing over **that render's** variables. The problem appears when one of those functions **outlives its render** — stored in a timer, a subscription, an event listener, or a ref.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="A callback created on the first render keeps reading that captured value while state moves on">
  <defs>
    <marker id="sc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The value moves on; the captured copy does not</text>
  <rect class="d-box-accent" x="20" y="52" width="160" height="52" rx="10"/>
  <text class="d-text d-accent" x="100" y="74" text-anchor="middle">render 1</text>
  <text class="d-sub" x="100" y="93" text-anchor="middle">count = 0</text>
  <rect class="d-box" x="210" y="52" width="160" height="52" rx="10"/>
  <text class="d-text" x="290" y="74" text-anchor="middle">render 2</text>
  <text class="d-sub" x="290" y="93" text-anchor="middle">count = 1</text>
  <rect class="d-box" x="400" y="52" width="160" height="52" rx="10"/>
  <text class="d-text" x="480" y="74" text-anchor="middle">render 3</text>
  <text class="d-sub" x="480" y="93" text-anchor="middle">count = 2</text>
  <path class="d-edge-dashed" d="M 100 110 L 100 152" marker-end="url(#sc-arrow)"/>
  <rect class="d-box-muted" x="20" y="156" width="290" height="52" rx="10"/>
  <text class="d-text" x="165" y="178" text-anchor="middle">interval created in render 1</text>
  <text class="d-sub" x="165" y="197" text-anchor="middle">still reading count = 0</text>
  <rect class="d-box-accent" x="360" y="156" width="280" height="52" rx="10"/>
  <text class="d-text d-accent" x="500" y="178" text-anchor="middle">setCount(c =&gt; c + 1)</text>
  <text class="d-sub" x="500" y="197" text-anchor="middle">asks React, not the closure</text>
</svg>

## 3. Verified: the bug

An interval created once, in an effect with an empty dependency array:

\`\`\`jsx
const [count, setCount] = useState(0);
useEffect(() => {
  const id = setInterval(() => { log("interval sees count=" + count); }, 10);
  return () => clearInterval(id);
}, []);   // [] means this closure keeps the FIRST render's count forever
\`\`\`

After clicking the increment button twice:

\`\`\`
button now shows: 2
but the interval logged: ["interval sees count=0"]
\`\`\`

The UI is at 2. The interval has never seen anything but 0, and never will — the callback belongs to the first render, and <code>[]</code> guarantees it is never replaced.

📌 **Interview term:** the empty dependency array is not the *cause*, it is the *decision*. It says "never recreate this closure", which is exactly what pins the old values in place. That is why the lint rule flags <code>count</code> as a missing dependency.

## 4. Where it shows up

| Situation | Why the closure outlives its render |
| :--- | :--- |
| <code>setInterval</code> / <code>setTimeout</code> in an effect with <code>[]</code> | The callback is created once and reused |
| An event listener added once | Same handler object stays subscribed |
| A callback stored in a ref | The ref holds whichever version was assigned |
| A handler passed to a non-React library | The library keeps the original reference |
| A dependency removed to stop re-running | The closure is deliberately not refreshed |

## 5. Verified: the fix that actually works

📌 **Interview term: functional updater** — passing a function to the setter. React calls it with the **latest** state rather than whatever the closure captured, so no dependency is needed at all.

\`\`\`jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((c) => { log("updater sees c=" + c); return c; });
  }, 10);
  return () => clearInterval(id);
}, []);
\`\`\`

Same two clicks, same empty dependency array:

\`\`\`
button now shows: 2
the updater saw: ["updater sees c=2"]
\`\`\`

The closure is still from the first render — but it no longer *reads* state. It asks React, and React knows the current value.

## 6. The full fix hierarchy

1. **Functional updater** — when you are computing new state from old. Removes the dependency entirely.
2. **Add the dependency** — when the effect genuinely *should* re-run on that value. The closure is recreated, so it is never stale.
3. **<a href="PASTE_EFFECT_EVENTS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useEffectEvent</code></a>** — when the effect must read the latest value but must **not** re-run when it changes. This is the case the first two cannot cover.
4. **A ref holding the latest value** — the manual version of option 3. Legitimate for integrating a non-React library, but verbose and easy to misuse.

📌 **Interview term:** never fix it by disabling <code>react-hooks/exhaustive-deps</code>. Omitting a dependency does not stop the value being used — it guarantees the stale copy is used, silently. You trade a bug you can see for one you cannot.

## 7. The lookalike that is not a bug

A **cleanup function** reading its own render's values is correct, not stale:

\`\`\`jsx
useEffect(() => {
  const conn = connect(roomId);
  return () => conn.disconnect(roomId);   // must be THIS roomId
}, [roomId]);
\`\`\`

It has to disconnect the room *it* opened. See <a href="PASTE_CLEANUP_URL_HERE" target="_blank" rel="noopener noreferrer">the cleanup function</a>, where three room changes produced three correctly-paired disconnects.

## 8. Common Pitfalls

- **Blaming React.** It is standard closure semantics; React just makes it frequent.
- **Disabling the lint rule.** The most common wrong fix.
- **Reaching for a ref first.** Try the functional updater and correct dependencies before manual synchronisation.
- **Assuming <code>useCallback</code> fixes it.** It has its own dependency array with exactly the same problem.
- **Treating cleanup as stale.** It is supposed to see its own values.
- **Recreating an expensive subscription just to refresh a closure.** That is what <code>useEffectEvent</code> exists for.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the cause as ordinary JavaScript:</strong> <span style="color:#f0e2c8;">"Every render makes new functions closing over that render's values. A function that outlives its render keeps reading them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the canonical case:</strong> <span style="color:#f0e2c8;">"An interval in an effect with an empty array — the UI reaches 2 while the interval still logs 0, forever, because the closure is never replaced."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lead with the functional updater:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setCount(c =&gt; c + 1)</code> asks React for the latest value instead of reading the closure, so the dependency disappears entirely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the whole hierarchy:</strong> <span style="color:#f0e2c8;">"Functional updater, then correct dependencies, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffectEvent</code> when it must read the latest without re-running, then a ref as a last resort."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be firm about the lint rule:</strong> <span style="color:#f0e2c8;">"Disabling exhaustive-deps does not stop the value being used — it guarantees the stale one is used. That is a worse bug because it is silent."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the interval keep seeing the old count?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the callback was created during the first render and closes over that render's <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> binding. The empty dependency array tells React never to recreate the effect, so that callback — and its captured 0 — lives for the component's whole life.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the functional updater a better fix than adding the dependency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Adding <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> works but tears down and recreates the interval on every tick, which resets its timing. The updater removes the dependency instead of satisfying it, so the subscription is created once and still sees current state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a ref the right answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you must hand a stable callback to something outside React that will not accept a new one — a map library or a websocket wrapper. You keep the latest function in a ref and call <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">ref.current()</code>. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffectEvent</code> is the built-in version of that pattern.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a cleanup function reading old values a stale closure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — that is required behaviour. The cleanup must undo what <em style="color:#ffe0b2;">its own</em> effect set up, so it needs that run's values. A cleanup reading the latest value would disconnect the wrong room or clear the wrong timer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code> prevent stale closures?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it can cause them. It has its own dependency array, and an incomplete one freezes the memoised function with old values. It is the same mechanism one level up, which is why the lint rule checks it too.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Closure** | A function plus the variables it captured where it was created |
| **Stale closure** | One still reading values from an earlier render |
| **Functional updater** | <code>setX(prev =&gt; next)</code>; reads the latest from React |
| **exhaustive-deps** | The lint rule that finds captured values you did not declare |
| **<code>useEffectEvent</code>** | Reads the latest value without becoming a dependency |

---
**Conclusion:** a stale closure is ordinary JavaScript — every render creates functions capturing that render's values, and one that outlives its render keeps reading them. Verified here: a button reached 2 while its interval, created once under an empty dependency array, logged <code>count=0</code> forever. The correct fixes in order are the functional updater, which asks React for the latest value instead of reading the closure and removes the dependency entirely; then declaring the dependency honestly; then <code>useEffectEvent</code> for the case where you must read fresh without re-running. Disabling the lint rule is never one of them.`,
    examples: [
      {
        label: "The stale interval, and three correct fixes side by side",
        runnable: true,
        code: `import { useState, useEffect, useRef, useCallback } from "react";

// ❌ BROKEN: the callback is created once and closes over count = 0 forever.
function StaleCounter() {
  const [count, setCount] = useState(0);
  const [seen, setSeen] = useState("—");

  useEffect(() => {
    const id = setInterval(() => setSeen(String(count)), 1000);
    return () => clearInterval(id);
  }, []); // eslint would flag count here, and it is right

  return <Row label="❌ empty deps" count={count} seen={seen} onClick={() => setCount((c) => c + 1)} />;
}

// ✅ FIX 1: the functional updater. The closure never reads state at all —
// it asks React, which knows the current value. No dependency needed.
function UpdaterCounter() {
  const [count, setCount] = useState(0);
  const [seen, setSeen] = useState("—");

  useEffect(() => {
    const id = setInterval(() => {
      setCount((current) => { setSeen(String(current)); return current; });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <Row label="✅ functional updater" count={count} seen={seen} onClick={() => setCount((c) => c + 1)} />;
}

// ✅ FIX 2: declare the dependency honestly. Correct, but note it tears down
// and recreates the interval on every change, which resets its timing.
function DepsCounter() {
  const [count, setCount] = useState(0);
  const [seen, setSeen] = useState("—");

  useEffect(() => {
    const id = setInterval(() => setSeen(String(count)), 1000);
    return () => clearInterval(id);
  }, [count]);

  return <Row label="✅ correct deps" count={count} seen={seen} onClick={() => setCount((c) => c + 1)} />;
}

// ✅ FIX 3: a ref holding the latest value. The manual version of
// useEffectEvent — useful for handing a stable callback to a non-React library.
function RefCounter() {
  const [count, setCount] = useState(0);
  const [seen, setSeen] = useState("—");
  const latest = useRef(count);
  latest.current = count;               // updated on every render

  useEffect(() => {
    const id = setInterval(() => setSeen(String(latest.current)), 1000);
    return () => clearInterval(id);
  }, []);

  return <Row label="✅ ref to latest" count={count} seen={seen} onClick={() => setCount((c) => c + 1)} />;
}

function Row({ label, count, seen, onClick }) {
  const wrong = seen !== "—" && seen !== String(count);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <code style={{ minWidth: 190 }}>{label}</code>
      <button onClick={onClick}>+1</button>
      <span>state: <strong>{count}</strong></span>
      <span style={{ color: wrong ? "crimson" : "#161" }}>
        interval sees: <strong>{seen}</strong>
      </span>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <StaleCounter />
      <UpdaterCounter />
      <DepsCounter />
      <RefCounter />
      <p style={{ color: "#666", fontSize: 13 }}>
        Click +1 a few times on each row and wait a second. The first row's
        interval stays stuck on the value from its first render; the other three
        keep up, by three different mechanisms.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Effect Events (`useEffectEvent`) and what problem do they solve?",
    seoDescription:
      "It reads the latest props and state without becoming a dependency. Verified: a theme change did not re-run the effect, yet the event saw the new theme.",
    description: `**Question presented to candidate:**
"An effect connects to a chat room and shows a notification using the current theme. Changing the theme should not reconnect. How do you express that?"

**What a strong answer should cover:**
- The problem: some values an effect **uses** are not values it should **react to**. The dependency array has only one setting for both.
- \`useEffectEvent\` splits them: code inside an Effect Event always sees the **latest** props and state, but the event itself is **not a dependency**.
- So the effect re-runs only for genuinely reactive values, while still reading current ones.
- The alternatives it replaces: lying to the lint rule (stale closure), or a ref updated every render (verbose, easy to misuse).
- Constraints: only call an Effect Event from **inside an effect** in the same component — never pass it to another component or call it during render.
- It is **stable** on React 19.2.8, exported from \`react\` (not \`experimental_useEffectEvent\`).
- The distinction to state: props/state you should re-synchronise on are **reactive**; things you merely want to read at the moment something happens are **non-reactive**.

**Clarifying questions expected:**
- "Which of these values should cause a reconnect, and which are just read at connect time?" — that question *is* the answer.

**Code / implementation expected:** Yes — the chat-room example with a reactive room and a non-reactive theme.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes effects and dependency arrays.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The re-run counts in section 3 were measured on React 19.2.8, where <code>useEffectEvent</code> is a stable export.

## 1. Why This Even Matters — A Story First

A courier is told to redeliver whenever the **address** changes. Sensible. They also need to know your **phone number** — but a new phone number is not a reason to redeliver, it is just something to look up when they arrive.

Put both on the same "things that trigger redelivery" list and every phone-number change causes a pointless trip. Leave the phone number off the list entirely and they arrive with an old number.

The dependency array is that list, and until Effect Events there was no way to say "read this, but do not redeliver for it".

## 2. The Core Idea

📌 **Interview term: reactive value** — a prop, state, or anything derived from them that an effect should **re-synchronise** on when it changes. These belong in the dependency array.

📌 **Interview term: Effect Event** — a function created with <code>useEffectEvent</code> whose body always sees the **latest** props and state, but which is **not reactive**. Calling it from an effect does not make the values it reads into dependencies.

\`\`\`jsx
const onConnected = useEffectEvent(() => {
  showNotification("Connected!", theme);   // reads the LATEST theme
});

useEffect(() => {
  const conn = connect(roomId);
  conn.on("connected", () => onConnected());
  return () => conn.disconnect();
}, [roomId]);        // theme is deliberately absent, and the lint rule agrees
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Reactive values re-run the effect while an Effect Event only reads the latest values">
  <defs>
    <marker id="ee-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two kinds of value, two behaviours</text>
  <rect class="d-box-accent" x="20" y="52" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="155" y="76" text-anchor="middle">roomId — reactive</text>
  <text class="d-sub" x="155" y="96" text-anchor="middle">in the dependency array</text>
  <path class="d-edge-accent" d="M 155 118 L 155 158" marker-end="url(#ee-arrow)"/>
  <rect class="d-box-accent" x="20" y="162" width="270" height="50" rx="10"/>
  <text class="d-text d-accent" x="155" y="184" text-anchor="middle">effect re-runs</text>
  <text class="d-sub" x="155" y="203" text-anchor="middle">disconnect, reconnect</text>
  <rect class="d-box-muted" x="370" y="52" width="270" height="60" rx="10"/>
  <text class="d-text" x="505" y="76" text-anchor="middle">theme — non-reactive</text>
  <text class="d-sub" x="505" y="96" text-anchor="middle">read inside an Effect Event</text>
  <path class="d-edge-dashed" d="M 505 118 L 505 158" marker-end="url(#ee-arrow)"/>
  <rect class="d-box-muted" x="370" y="162" width="270" height="50" rx="10"/>
  <text class="d-text" x="505" y="184" text-anchor="middle">effect does not re-run</text>
  <text class="d-sub" x="505" y="203" text-anchor="middle">but the value read is current</text>
</svg>

## 3. Verified: it does exactly what it claims

A chat component whose effect depends only on <code>roomId</code>, calling an Effect Event that reads both <code>roomId</code> and <code>theme</code>. Rendered three times: first with room *general* and theme *dark*, then with the **theme changed only**, then with the **room changed**:

\`\`\`
effect ran 2 times over 3 renders (theme change did NOT re-run it)
what the event saw: ["connected to general with theme dark",
                     "connected to random with theme light"]
\`\`\`

Both halves of the claim hold at once. The theme change did not reconnect — two runs, not three. And when the room *did* change, the event read <code>theme: light</code>, the current value, not the <code>dark</code> it was created with.

📌 **Interview term:** that combination is what nothing else gives you. Correct dependencies would have reconnected on the theme change. An omitted dependency would have shown the stale <code>dark</code>.

## 4. What it replaces

| Approach | Re-runs on the non-reactive value? | Reads the latest? |
| :--- | :--- | :--- |
| Put it in the deps | **Yes** — unwanted reconnect | Yes |
| Omit it and silence the lint rule | No | **No** — stale |
| A ref updated every render | No | Yes — but verbose and unchecked |
| <code>useEffectEvent</code> | No | Yes |

The ref version was the established workaround, and <code>useEffectEvent</code> is essentially that pattern built in, with lint support. See <a href="PASTE_STALE_CLOSURES_URL_HERE" target="_blank" rel="noopener noreferrer">stale closures</a> for the ref approach in full.

## 5. The rules

📌 **Interview term:** Effect Events are deliberately restricted:

- Call them **only from inside an effect**, in the same component that declared them.
- **Never call one during render** — they are not a way to read state.
- **Never pass one to another component or hook.** Its non-reactive nature only holds locally; passing it around makes that invisible at the call site.

The mental model: an Effect Event is not part of your reactive data flow. It is a hole punched through it for one specific read.

## 6. How to decide

Ask one question about each value the effect touches: **"if this changes, should the effect run again?"**

- **Yes** — a room id, a user id, a URL. Reactive, put it in the array.
- **No** — a theme for a notification, an analytics flag, a callback for logging. Non-reactive, read it in an Effect Event.

That question is the whole design. It is also the answer to give first in an interview.

## 7. Common Pitfalls

- **Using it to silence a lint warning you did not understand.** Ask the reactive question first; often the value genuinely should be a dependency.
- **Passing one to a child.** Not supported, and it hides non-reactivity from the call site.
- **Calling one during render.** They are for effect bodies and event-like moments.
- **Reaching for it before the functional updater.** For "compute new state from old", <code>setX(prev =&gt; ...)</code> is simpler.
- **Assuming it memoises.** It is about reactivity, not performance.
- **Believing it is still experimental.** On React 19.2.8 it is a stable export from <code>react</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the problem before the API:</strong> <span style="color:#f0e2c8;">"Some values an effect uses are not values it should react to — but the dependency array has one setting for both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define it in one line:</strong> <span style="color:#f0e2c8;">"An Effect Event always reads the latest props and state, but is not itself a dependency — so the effect stops re-running for values it only reads."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Use the chat example and quote the numbers:</strong> <span style="color:#f0e2c8;">"Room reactive, theme not. Three renders, only two effect runs — and the event still saw the new theme."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say what it replaces:</strong> <span style="color:#f0e2c8;">"Previously you either lied to the lint rule and got a stale closure, or kept the latest value in a ref. This is that ref pattern built in."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the deciding question:</strong> <span style="color:#f0e2c8;">"For each value: if this changes, should the effect run again? Yes means a dependency; no means an Effect Event."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from just omitting the dependency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Omitting it gives you a stale closure — the effect keeps reading the value from the render that created it. An Effect Event reads the latest. Both avoid the re-run; only one is correct, and the lint rule endorses the Effect Event rather than warning about it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you pass an Effect Event to a child component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It must be called from inside an effect in the component that declared it. Passing it elsewhere would hide its non-reactivity from the call site, and the reasoning that makes it safe is local to that component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did people solve this before?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A ref reassigned on every render — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">latest.current = theme</code> — read as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">latest.current</code> inside the effect. It works, but it is manual, unchecked by the linter, and easy to get subtly wrong. Effect Events are that pattern made official.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it stable, or still experimental?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On React 19.2.8 it is a stable export from <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> — not <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental_useEffectEvent</code>. It spent a long time behind an experimental flag, so plenty of older material still describes it that way; worth checking your installed version rather than trusting a blog post.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you <em style="color:#ffe0b2;">not</em> use it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the value genuinely should re-run the effect — then it is a dependency and using an Effect Event hides a real requirement. Also when a functional updater would do: computing new state from old needs <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setX(prev =&gt; ...)</code>, not this.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactive value** | One whose change should re-run the effect |
| **Non-reactive value** | One the effect only reads at the moment it acts |
| **Effect Event** | A function reading the latest values without being a dependency |
| **Stale closure** | The wrong alternative: reading values frozen at creation |
| **Latest ref** | The manual pattern <code>useEffectEvent</code> replaces |

---
**Conclusion:** Effect Events exist because the dependency array conflates two different questions — what an effect *reads* and what it should *re-synchronise on*. <code>useEffectEvent</code> separates them: the code inside always sees the latest props and state, while the event itself is not a dependency. Verified on React 19.2.8, a theme change did not re-run the effect (two runs across three renders), yet the event still read the new theme when the room actually changed. Decide with one question per value: if this changes, should the effect run again?`,
    examples: [
      {
        label: "A chat room that reconnects on the room but not on the theme",
        runnable: true,
        code: `import { useState, useEffect, useEffectEvent } from "react";

// A fake chat service so the connections are observable.
function connect(roomId, log) {
  log("connect: " + roomId);
  return { disconnect: () => log("disconnect: " + roomId) };
}

function ChatRoom({ roomId, theme, log }) {
  // The Effect Event always sees the LATEST theme, but is not a dependency,
  // so changing the theme cannot cause a reconnect.
  const onConnected = useEffectEvent(() => {
    log("notify (theme=" + theme + "): joined " + roomId);
  });

  useEffect(() => {
    const conn = connect(roomId, log);
    onConnected();
    return () => conn.disconnect();
    // roomId only. The lint rule accepts this — onConnected is not reactive.
  }, [roomId]);

  return (
    <p style={{
      margin: "8px 0", padding: 8, borderRadius: 6,
      background: theme === "dark" ? "#222" : "#eee",
      color: theme === "dark" ? "#eee" : "#222",
    }}>
      In <strong>{roomId}</strong>, theme <strong>{theme}</strong>
    </p>
  );
}

const ROOMS = ["general", "random", "support"];

export default function App() {
  const [roomId, setRoomId] = useState("general");
  const [theme, setTheme] = useState("dark");
  const [log, setLog] = useState([]);
  const push = (line) => setLog((l) => [...l, line]);

  const connects = log.filter((l) => l.startsWith("connect")).length;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <ChatRoom roomId={roomId} theme={theme} log={push} />

      <p>
        {ROOMS.map((r) => (
          <button key={r} onClick={() => setRoomId(r)} disabled={r === roomId} style={{ marginRight: 6 }}>
            {r}
          </button>
        ))}
        <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
          toggle theme
        </button>{" "}
        <button onClick={() => setLog([])}>clear</button>
      </p>

      <p style={{ fontSize: 14 }}>connections made: <strong>{connects}</strong></p>

      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12, maxHeight: 170, overflow: "auto" }}>
        {log.length ? log.join("\\n") : "(nothing yet)"}
      </pre>

      <p style={{ color: "#666", fontSize: 13 }}>
        Toggle the theme repeatedly: the connection count does not move, but the
        panel restyles. Now switch rooms — one reconnect, and the notification
        reports the theme you currently have, not the one you started with.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you safely handle async work and race conditions inside effects?",
    seoDescription:
      "Cleanup runs before the next effect, which is what makes a guard work. Check after every await, abort where you can, never mark the callback async.",
    description: `**Question presented to candidate:**
"Give me the full picture of doing async work inside an effect safely — every hazard you would guard against."

**What a strong answer should cover:**
- **Why cleanup ordering is the foundation**: it runs *before* the next effect, so a flag set there is guaranteed to beat the previous run's continuation.
- **Race conditions**: responses arriving out of order. A slow earlier request can overwrite a newer one, silently.
- **Two guards**, ranked: \`AbortController\` (cancels the request and frees the connection) then a cancellation flag (only ignores the result).
- **Every await is a resumption point.** The component may have unmounted or the dependency changed by the time each one resolves — so guard after *each* await, not only the first.
- **The effect callback must not be \`async\`** — it would return a promise where React expects cleanup.
- **StrictMode** runs setup, cleanup, setup, so an async effect must tolerate being started, aborted, and started again.
- **Stale closures interact with this**: an async continuation reads values captured at its own render.
- Swallow \`AbortError\`, and never leave the error state unhandled.
- The honest recommendation: this is a lot of invariants to maintain by hand, which is the argument for a query library.

**Clarifying questions expected:**
- "Is the work triggered by rendering, or by a user action?" — the latter belongs in a handler.
- "Can the underlying API be aborted, or only ignored?"

**Code / implementation expected:** Yes — a multi-await sequence with a guard after each step.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes effects and promises.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This is the deep hazard taxonomy; <a href="PASTE_ASYNC_OPS_URL_HERE" target="_blank" rel="noopener noreferrer">handling async operations</a> is the introduction, and the race-condition measurement quoted in section 3 comes from there.

## 1. Why This Even Matters — A Story First

A relay runner takes the baton and starts running. Halfway round, the race is called off and a new race begins with a different runner. Nobody told the first runner — they finish their lap and hand the baton to the finish judge, who records it.

Every <code>await</code> is a runner mid-lap. The code before it ran in one world; the code after it resumes in a world that may have moved on. Safe async code in effects is entirely about checking, at every resumption, whether the race you are running is still the current one.

## 2. The Core Idea

📌 **Interview term:** cleanup runs **before the next effect run**, never after. That single ordering guarantee is what makes every guard in this doc work — a flag flipped in cleanup is reliably set before the previous run's continuation resumes.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Cleanup flips the guard before the next effect starts, so the stale continuation does nothing">
  <defs>
    <marker id="as-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The guard is set before the old work can finish</text>
  <rect class="d-box" x="16" y="54" width="150" height="56" rx="10"/>
  <text class="d-text" x="91" y="77" text-anchor="middle">effect for id 1</text>
  <text class="d-sub" x="91" y="97" text-anchor="middle">request starts</text>
  <path class="d-edge" d="M 172 82 L 196 82" marker-end="url(#as-arrow)"/>
  <rect class="d-box-accent" x="202" y="54" width="150" height="56" rx="10"/>
  <text class="d-text d-accent" x="277" y="77" text-anchor="middle">cleanup</text>
  <text class="d-sub" x="277" y="97" text-anchor="middle">abort, flag set</text>
  <path class="d-edge" d="M 358 82 L 382 82" marker-end="url(#as-arrow)"/>
  <rect class="d-box" x="388" y="54" width="150" height="56" rx="10"/>
  <text class="d-text" x="463" y="77" text-anchor="middle">effect for id 2</text>
  <text class="d-sub" x="463" y="97" text-anchor="middle">request starts</text>
  <path class="d-edge-dashed" d="M 91 116 L 91 164" marker-end="url(#as-arrow)"/>
  <rect class="d-box-muted" x="16" y="168" width="300" height="52" rx="10"/>
  <text class="d-text" x="166" y="190" text-anchor="middle">id 1 resolves late</text>
  <text class="d-sub" x="166" y="209" text-anchor="middle">sees the flag, does nothing</text>
  <rect class="d-box-accent" x="360" y="168" width="280" height="52" rx="10"/>
  <text class="d-text d-accent" x="500" y="190" text-anchor="middle">id 2 resolves</text>
  <text class="d-sub" x="500" y="209" text-anchor="middle">its flag is still clear, so it wins</text>
</svg>

## 3. Hazard one: the race condition

Verified in the companion doc — asking for user 1 then immediately user 2, where user 1 is slower:

\`\`\`
unguarded, asked for 1 then 2 -> shows: user-1   <- STALE
guarded,   asked for 1 then 2 -> shows: user-2   <- correct
\`\`\`

📌 **Interview term: race condition** — results arriving in a different order from the requests, where the code assumes arrival order equals request order. Nothing throws; the screen is simply showing data for something the user has moved on from.

## 4. Hazard two: every <code>await</code> is a checkpoint

The subtlety most answers miss. A single guard at the top is not enough when the work has several steps:

\`\`\`jsx
useEffect(() => {
  const controller = new AbortController();

  (async () => {
    const user = await getUser(id, controller.signal);
    if (controller.signal.aborted) return;          // checkpoint 1

    const orders = await getOrders(user.id, controller.signal);
    if (controller.signal.aborted) return;          // checkpoint 2

    setData({ user, orders });
  })();

  return () => controller.abort();
}, [id]);
\`\`\`

Between each <code>await</code> the dependency may have changed and cleanup may already have run. 📌 **Interview term:** each <code>await</code> is a **resumption point** where the world can differ from the one the code started in. Guard after each, not merely at the start.

## 5. Hazard three: the callback must stay synchronous

\`\`\`jsx
useEffect(async () => { ... }, []);   // returns a promise, not a cleanup
\`\`\`

React warns: *must not return anything besides a function, which is used for clean-up.* Declare an async function inside and call it, as above — the effect callback itself returns the real cleanup.

## 6. Hazard four: StrictMode

<a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> runs setup, cleanup, setup in development. An async effect must therefore tolerate being **started, aborted, and started again immediately**. If your code fires a request, aborts it, and then mishandles the resulting <code>AbortError</code> as a failure, StrictMode surfaces it instantly — which is the point.

📌 **Interview term:** an aborted request rejects with an error whose <code>name</code> is <code>AbortError</code>. Swallow it explicitly; treating it as a failure means showing an error state for something you cancelled on purpose.

## 7. Hazard five: stale closures in the continuation

The code after an <code>await</code> still closes over **its own render's** values. Reading a piece of state there gives you the value from when the effect started, not the current one. See <a href="PASTE_STALE_CLOSURES_URL_HERE" target="_blank" rel="noopener noreferrer">stale closures</a> — the fix is a functional updater or <a href="PASTE_EFFECT_EVENTS_URL_HERE" target="_blank" rel="noopener noreferrer">an Effect Event</a>, not a wider dependency array.

## 8. The two guards compared

| | <code>AbortController</code> | Cancellation flag |
| :--- | :--- | :--- |
| Ignores the stale result | Yes | Yes |
| Cancels the request | **Yes** | No |
| Frees the connection | Yes | No |
| Works with any promise | Abortable APIs only | Yes |
| Composes across awaits | One signal, checked anywhere | One variable |

Prefer <code>AbortController</code>; fall back to a flag when the API cannot be aborted. There is no reason not to use both — the signal cancels, and checking <code>signal.aborted</code> serves as the flag.

## 9. Common Pitfalls

- **Guarding only after the first await.** Every resumption point needs one.
- **<code>useEffect(async () =&gt; ...)</code>.** Breaks the cleanup contract.
- **Surfacing <code>AbortError</code> as a failure.** Especially visible under StrictMode.
- **Assuming an unmount guard is enough.** The dependency changing while mounted is the more common case.
- **Reading state after an await.** Stale; use a functional updater.
- **No error state.** A rejection with no handler leaves a permanent spinner.
- **Hand-rolling all of this repeatedly.** The invariants are the argument for a <a href="PASTE_DATA_FETCHING_URL_HERE" target="_blank" rel="noopener noreferrer">query library</a>.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start from the ordering guarantee:</strong> <span style="color:#f0e2c8;">"Cleanup runs before the next effect, never after. That is what makes a guard set in cleanup reliably beat the previous run's continuation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the headline bug:</strong> <span style="color:#f0e2c8;">"Race conditions — a slower earlier request lands last and overwrites the newer one. Nothing throws; the screen is just wrong."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the detail that shows depth:</strong> <span style="color:#f0e2c8;">"Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> is a resumption point, so I guard after each one — not just at the top."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover the mechanics quickly:</strong> <span style="color:#f0e2c8;">"Never mark the callback <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code>, prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> over a flag, and swallow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortError</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. End with judgement:</strong> <span style="color:#f0e2c8;">"That is a lot of invariants to hold by hand on every screen — which is precisely why I would reach for a query library for server data."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a cancellation flag work at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because cleanup is guaranteed to run before the next effect. When the dependency changes, the old run's flag is flipped before the new request starts, so the old continuation is certain to see it set. Without that ordering the guard would be a race of its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is one guard at the top of the async function enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — for a single await it happens to be, but any multi-step sequence needs a check after each one. The dependency can change during step two just as easily as during step one, and the code between awaits has no idea time passed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does StrictMode interact with async effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs setup, cleanup, setup — so your request is fired, aborted, and fired again immediately. That is a deliberate stress test: if the abort is mishandled you see a spurious error state straight away in development rather than intermittently in production.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you read state after an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, but you get the value from the render that started the effect, not the current one — a stale closure. If you need the latest, use a functional updater for state you are computing from, or an Effect Event for something you only need to read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is unmounting the main thing to guard against?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and this is a common misconception. Since React 18 a setState after unmount is silently ignored, so that case is harmless. The dangerous case is the dependency changing while the component stays mounted — that is where a stale response actually overwrites correct data.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Resumption point** | Any <code>await</code>, where the world may have changed |
| **Race condition** | Results arriving out of request order |
| **Cancellation flag** | A closure variable telling a stale continuation to stop |
| **<code>AbortController</code>** | Cancels the request itself |
| **<code>AbortError</code>** | The rejection from a deliberate abort |
| **Cleanup ordering** | Cleanup before the next effect — the guarantee guards rely on |

---
**Conclusion:** safe async work in an effect rests on one guarantee — cleanup runs before the next effect, never after — which is what makes a guard set there reliably beat the previous run. Around that, five hazards: the race condition where a slower earlier response wins; every <code>await</code> being a resumption point that needs its own check; the callback that must not be <code>async</code>; StrictMode starting, aborting, and restarting the work; and stale closures in the continuation. Prefer <code>AbortController</code> to a flag because it cancels rather than ignores, swallow <code>AbortError</code>, and note that maintaining all of this by hand on every screen is the honest argument for a query library.`,
    examples: [
      {
        label: "A multi-step async effect with a guard after every await",
        runnable: true,
        code: `import { useState, useEffect, useRef } from "react";

// Two dependent steps, both slow, so you can change the id mid-flight.
const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
async function getUser(id, signal) {
  await abortable(700, signal);
  return { id, name: "User " + id };
}
async function getOrders(userId, signal) {
  await abortable(700, signal);
  return [userId * 10, userId * 10 + 1];
}
function abortable(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      const e = new Error("aborted"); e.name = "AbortError"; reject(e);
    });
  });
}

function Profile({ id, log }) {
  const [state, setState] = useState({ step: "idle", user: null, orders: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ step: "loading user", user: null, orders: null, error: null });
    log("start id=" + id);

    // The callback stays synchronous; the async work lives in here.
    (async () => {
      try {
        const user = await getUser(id, controller.signal);
        // CHECKPOINT 1 — the dependency may have changed during that await.
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, step: "loading orders", user }));

        const orders = await getOrders(user.id, controller.signal);
        // CHECKPOINT 2 — and again during this one.
        if (controller.signal.aborted) return;
        setState({ step: "done", user, orders, error: null });
        log("finished id=" + id);
      } catch (e) {
        if (e.name === "AbortError") { log("aborted id=" + id); return; }
        setState({ step: "error", user: null, orders: null, error: e.message });
      }
    })();

    // Cleanup runs BEFORE the next effect — this is the whole guarantee.
    return () => controller.abort();
  }, [id, log]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <p style={{ margin: 0 }}>
        asked for <strong>{id}</strong> · step: <strong>{state.step}</strong>
      </p>
      {state.user && (
        <p style={{ margin: "4px 0", color: state.user.id !== id ? "crimson" : "#161" }}>
          {state.user.name}{state.orders ? " · orders " + state.orders.join(", ") : ""}
        </p>
      )}
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </div>
  );
}

export default function App() {
  const [id, setId] = useState(1);
  const [log, setLog] = useState([]);
  const push = useRef((line) => setLog((l) => [...l, line])).current;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <Profile id={id} log={push} />
      <p>
        {[1, 2, 3].map((n) => (
          <button key={n} onClick={() => setId(n)} style={{ marginRight: 6 }}>user {n}</button>
        ))}
        <button onClick={() => setLog([])}>clear log</button>
      </p>
      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12, maxHeight: 150, overflow: "auto" }}>
        {log.length ? log.join("\\n") : "(nothing yet)"}
      </pre>
      <p style={{ color: "#666", fontSize: 13 }}>
        Click user 1, then user 2 while it is still loading. The log shows the
        first run aborted rather than finishing — the checkpoints stop it
        writing state for a user you have already navigated away from.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When would you use `useLayoutEffect` instead of `useEffect`?",
    seoDescription:
      "Use it only to measure or adjust the DOM before the browser paints. Verified: it ran first and saw width 100px, and useEffect then saw the adjusted 200px.",
    description: `**Question presented to candidate:**
"When is \`useLayoutEffect\` the right choice, and what does it cost you?"

**What a strong answer should cover:**
- Both run **after** React has committed changes to the DOM. The difference is **relative to paint**: \`useLayoutEffect\` runs synchronously *before* the browser paints; \`useEffect\` runs asynchronously *after*.
- The use case: **measure the DOM and adjust it in the same frame**, so the user never sees the intermediate state.
- Concrete cases: positioning a tooltip or popover from a measured rect, measuring text to decide truncation, restoring scroll position, and preventing a visible flash on a mount-time adjustment.
- **The cost is real**: it blocks painting. Slow work there delays the frame, and a long layout effect is directly visible as jank.
- It runs on every commit where its dependencies change, exactly like \`useEffect\`.
- **It does not run during SSR** — neither does \`useEffect\` — but React warns specifically about \`useLayoutEffect\` on the server because layout measurement is meaningless there.
- \`useInsertionEffect\` sits even earlier, for CSS-in-JS libraries injecting styles.
- The default is \`useEffect\`; reach for the layout variant only when you can name the flicker it prevents.

**Clarifying questions expected:**
- "Is there a visible flicker, or is this a habit?" — if nothing flashes, \`useEffect\` is correct.
- "Is this server-rendered?" — that changes what warns.

**Code / implementation expected:** Yes — a measure-then-position example where the difference is visible.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useEffect</code>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The ordering in section 3 was measured on React 19.2.8. **One honest limit:** jsdom does not paint, so the *flicker* this hook prevents cannot be demonstrated in a unit environment — the ordering and DOM-mutation timing were verified, and the visual consequence is reasoned from that. The runnable example below shows it in a real browser.

## 1. Why This Even Matters — A Story First

A stagehand adjusting scenery has two options. Do it while the curtain is still down — the audience sees only the finished arrangement. Or do it after the curtain rises — the audience watches the sofa slide across the stage.

Both get the sofa into place. Only one of them looks intentional. And there is a cost to the first: the curtain stays down while you work, so the audience waits.

## 2. The Core Idea

📌 **Interview term:** both hooks run **after React has mutated the DOM**. The difference is where they sit relative to the browser **paint**:

- <code>useLayoutEffect</code> — **synchronously, before paint**. The browser cannot draw until it returns.
- <code>useEffect</code> — **asynchronously, after paint**. The user has already seen the frame.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Render then commit then layout effect then paint then effect">
  <defs>
    <marker id="lay-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where each hook sits in one frame</text>
  <rect class="d-box" x="12" y="62" width="118" height="64" rx="10"/>
  <text class="d-text" x="71" y="88" text-anchor="middle">render</text>
  <text class="d-sub" x="71" y="110" text-anchor="middle">pure</text>
  <path class="d-edge" d="M 136 94 L 154 94" marker-end="url(#lay-arrow)"/>
  <rect class="d-box" x="160" y="62" width="118" height="64" rx="10"/>
  <text class="d-text" x="219" y="88" text-anchor="middle">commit</text>
  <text class="d-sub" x="219" y="110" text-anchor="middle">DOM mutated</text>
  <path class="d-edge" d="M 284 94 L 302 94" marker-end="url(#lay-arrow)"/>
  <rect class="d-box-accent" x="308" y="62" width="140" height="64" rx="10"/>
  <text class="d-text d-accent" x="378" y="88" text-anchor="middle">useLayoutEffect</text>
  <text class="d-sub" x="378" y="110" text-anchor="middle">blocks the paint</text>
  <path class="d-edge" d="M 454 94 L 472 94" marker-end="url(#lay-arrow)"/>
  <rect class="d-box-muted" x="478" y="62" width="72" height="64" rx="10"/>
  <text class="d-text" x="514" y="88" text-anchor="middle">paint</text>
  <text class="d-sub" x="514" y="110" text-anchor="middle">visible</text>
  <path class="d-edge" d="M 556 94 L 574 94" marker-end="url(#lay-arrow)"/>
  <rect class="d-box" x="580" y="62" width="70" height="64" rx="10"/>
  <text class="d-text" x="615" y="88" text-anchor="middle">useEffect</text>
  <text class="d-sub" x="615" y="110" text-anchor="middle">after</text>
</svg>

Everything an adjustment does in the accent box is invisible to the user. Anything done in the last box happens after they have already seen the previous state.

## 3. Verified: the ordering, and why it matters

A component that measures an element, then widens it, from both hooks:

\`\`\`jsx
useEffect(()       => log("useEffect sees width " + ref.current.style.width), []);
useLayoutEffect(() => {
  log("useLayoutEffect sees width " + ref.current.style.width);
  ref.current.style.width = "200px";        // adjust
}, []);
\`\`\`

Actual output — note the hooks are written in the opposite order to how they run:

\`\`\`
render | useLayoutEffect sees width 100px | useEffect sees width 200px
\`\`\`

Three things fall out of that single line:

- <code>useLayoutEffect</code> ran **first**, despite being written second — order in the file is irrelevant.
- It saw <code>100px</code>, the value React had just committed. **The DOM is already mutated** when a layout effect runs; that is what makes measurement possible.
- By the time <code>useEffect</code> ran, the DOM already read <code>200px</code> — the adjustment had happened. In a real browser it happened **before the paint**, so nothing flashed.

📌 **Interview term:** if that adjustment were made in <code>useEffect</code> instead, the browser would paint <code>100px</code> first and then repaint at <code>200px</code>. That visible jump is exactly the flicker <code>useLayoutEffect</code> exists to prevent.

## 4. When it is genuinely the right call

| Case | Why before paint |
| :--- | :--- |
| Positioning a tooltip or popover from a measured rect | Otherwise it appears in the wrong place first |
| Measuring text to decide truncation | Otherwise the full text flashes |
| Restoring scroll position | Otherwise the user sees the top, then a jump |
| Reading and correcting layout on mount | Otherwise the uncorrected layout paints |
| Synchronously reading <code>getBoundingClientRect</code> to set state | The state change must land in the same frame |

The common thread: **you must read the DOM and act on what you read, before the user sees it.**

## 5. The cost

📌 **Interview term:** <code>useLayoutEffect</code> is **blocking**. The browser cannot paint until every layout effect in the commit has returned. Slow work there — a heavy loop, a synchronous request, a large layout thrash — delays the frame directly and shows up as jank.

That is why the default is <code>useEffect</code>. If nothing flickers, you are paying for a guarantee you do not need.

## 6. Server rendering

Neither hook runs during SSR — there is no DOM and no paint. But React warns specifically about <code>useLayoutEffect</code> on the server, because a component relying on layout measurement will render differently once it hydrates.

Standard fixes: guard the behaviour so the server-rendered markup is correct without it, or defer the measurement to <code>useEffect</code> and accept one frame of adjustment.

📌 **Interview term:** <code>useInsertionEffect</code> runs **earlier still**, before layout effects, and exists for CSS-in-JS libraries to inject style rules before anything measures. Application code should essentially never use it — but naming it shows you know the full ordering.

## 7. Common Pitfalls

- **Using it as the default.** It blocks paint; <code>useEffect</code> should be the habit.
- **Doing slow work inside it.** Directly visible as a delayed frame.
- **Fetching data in it.** The request is async anyway, so blocking paint buys nothing.
- **Ignoring the SSR warning.** It signals a real hydration difference.
- **Assuming file order controls run order.** Verified above: layout effects always run first.
- **Reaching for it to fix a race.** It changes timing within a frame, not between async operations.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Put both in one frame:</strong> <span style="color:#f0e2c8;">"Both run after React commits to the DOM. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLayoutEffect</code> is synchronous before paint; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> is asynchronous after."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the one use case:</strong> <span style="color:#f0e2c8;">"Measure the DOM and adjust it in the same frame — tooltip positioning, scroll restoration, truncation — so the user never sees the intermediate state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the cost immediately:</strong> <span style="color:#f0e2c8;">"It blocks painting, so slow work there is jank. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> is the default and this is the exception."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Add the ordering detail:</strong> <span style="color:#f0e2c8;">"Layout effects always run before passive effects regardless of the order they are written in — and the DOM is already mutated by then, which is what makes measuring possible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention SSR:</strong> <span style="color:#f0e2c8;">"React warns about it on the server, because layout measurement is meaningless there and signals a hydration difference."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give a concrete case where <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> would visibly fail.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A tooltip positioned from a measured rect. With <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code> the browser paints it at its default position, then the measurement lands and it jumps. With a layout effect the measurement and the correction both happen before the paint, so it only ever appears in the right place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the DOM available inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useLayoutEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — React has already committed the changes; only the paint has not happened. That is precisely the window it gives you: the new DOM exists and is measurable, but nothing has been drawn from it yet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the performance cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser cannot paint until every layout effect in that commit returns, so their total duration is added to the frame. A quick measurement is negligible; a heavy loop or a synchronous layout thrash is immediately visible as a dropped frame.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React warn about it during server rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Neither effect runs on the server, but a layout effect almost always means the component depends on measurement — so the server markup will differ from what appears after hydration. The warning is flagging that likely mismatch, not the hook itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useInsertionEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The earliest of the three, running before layout effects. It exists so CSS-in-JS libraries can inject style rules before anything measures layout. Application code should essentially never need it — the ordering is insertion, then layout, then passive.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Commit** | React applying its changes to the real DOM |
| **Paint** | The browser drawing the committed DOM |
| **<code>useLayoutEffect</code>** | Synchronous, after commit and before paint |
| **<code>useEffect</code>** | Asynchronous, after paint |
| **<code>useInsertionEffect</code>** | Earlier still, for style injection |
| **Flicker** | The user seeing an intermediate state before a correction |

---
**Conclusion:** both hooks run after React has committed to the DOM; the difference is that <code>useLayoutEffect</code> runs synchronously **before** the browser paints. Verified on React 19.2.8, it ran first — despite being written second — saw the committed <code>100px</code>, adjusted it, and by the time <code>useEffect</code> ran the DOM already read <code>200px</code>. That window is what lets you measure and correct without the user seeing the intermediate state. The price is that it blocks painting, so use it only when you can name the flicker it prevents.`,
    examples: [
      {
        label: "A tooltip positioned before paint, next to one that visibly jumps",
        runnable: true,
        code: `import { useState, useRef, useEffect, useLayoutEffect } from "react";

// Both tooltips measure the trigger and position themselves above it. The only
// difference is WHICH hook does the measuring — and therefore whether the user
// sees the unpositioned frame first.
function Tooltip({ text, useLayout, label }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const measure = () => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    // Deliberate extra work so the difference is easy to see.
    let waste = 0;
    for (let i = 0; i < 2_000_000; i++) waste += i;
    setPos({ top: t.top - tip.height - 8 + window.scrollY, left: t.left + window.scrollX });
  };

  // Only one of these is active per instance.
  useLayoutEffect(() => { if (useLayout) measure(); }, [open, useLayout]);
  useEffect(() => { if (!useLayout) measure(); }, [open, useLayout]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        style={{ marginRight: 12 }}
      >
        {label}
      </button>
      {open && (
        <div
          ref={tipRef}
          style={{
            position: "absolute", top: pos.top, left: pos.left,
            background: "#222", color: "white", padding: "6px 10px",
            borderRadius: 6, fontSize: 13, whiteSpace: "nowrap", zIndex: 10,
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, paddingTop: 140, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <Tooltip
        label="useLayoutEffect (no jump)"
        text="Measured and positioned before paint"
        useLayout={true}
      />
      <Tooltip
        label="useEffect (visible jump)"
        text="Painted at 0,0 first, then moved"
        useLayout={false}
      />

      <p style={{ marginTop: 40, color: "#666", fontSize: 13 }}>
        Click each button. The first tooltip appears directly above its trigger.
        The second flashes at the top-left corner of the page before jumping into
        place — it was painted once with the default position, then corrected.
        <br /><br />
        Both do identical work. Only the timing relative to paint differs, which
        is also the cost: the first one delays the frame while it measures.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How did ref handling change in React 19 (ref as a prop, forwardRef, ref cleanup)?",
    seoDescription:
      "React 19 makes ref an ordinary prop and lets ref callbacks return a cleanup. Verified: attach ran, then the returned cleanup — not a second call with null.",
    description: `**Question presented to candidate:**
"React 19 changed how refs work. What changed, and what does it mean for existing code?"

**What a strong answer should cover:**
- **\`ref\` is now a regular prop** for function components. You destructure it like any other; \`forwardRef\` is no longer needed for the common case.
- **\`forwardRef\` still works** and was not removed — verified, it emits no deprecation warning in 19.2.8. Existing code keeps running.
- **Ref callbacks may return a cleanup function.** React calls it on detach instead of invoking the callback a second time with \`null\`.
- Why that matters: the old null-call pattern made it awkward to pair setup with teardown, and easy to leak an observer or listener attached in a ref callback.
- The old behaviour is still supported for callbacks that return nothing, so existing ref callbacks are unaffected.
- Practical effect: fewer wrapper layers, simpler TypeScript generics, and a component tree without \`ForwardRef(...)\` nodes.
- Still true: \`ref\` on a function component only works if that component does something with it, and \`key\` remains a non-prop.
- Migration: a codemod exists; there is no urgency since \`forwardRef\` still functions.

**Clarifying questions expected:**
- "Are we on React 19 already, or planning the upgrade?"
- "Is this a library that must support React 18 as well?" — that decides whether you can drop \`forwardRef\`.

**Code / implementation expected:** Yes — the same component before and after, plus a ref callback with a cleanup.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes refs and <code>forwardRef</code>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below — including whether <code>forwardRef</code> warns — was produced by running the code on React 19.2.8 rather than read from a changelog.

## 1. Why This Even Matters — A Story First

For years, handing a ref to a function component required an envelope. You could not pass it directly, so you wrapped the component in <code>forwardRef</code>, which unpacked the ref on the other side and handed it over. It worked, but every wrapped component gained a layer — in the type signature, in the DevTools tree, and in your head.

React 19 removed the envelope. You just pass the thing.

## 2. Change one: <code>ref</code> is an ordinary prop

📌 **Interview term:** in React 19 a function component receives <code>ref</code> in its **props object** like any other prop. No wrapper, no second parameter.

\`\`\`jsx
// Before — the envelope
const Input = forwardRef(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});

// React 19 — just a prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
\`\`\`

### Verified

Passing a ref straight to a plain function component with no <code>forwardRef</code> anywhere:

\`\`\`
ref.current tagName: INPUT
aria-label reached the input: plain prop
\`\`\`

The ref attached to the real DOM node, and ordinary props flowed through unaffected.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Before React 19 a forwardRef wrapper sat between parent and component; now the ref arrives as a prop">
  <defs>
    <marker id="rf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One fewer layer between the parent and the node</text>
  <rect class="d-box-muted" x="16" y="52" width="120" height="50" rx="10"/>
  <text class="d-sub" x="76" y="82" text-anchor="middle">parent</text>
  <path class="d-edge-dashed" d="M 142 77 L 166 77" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-muted" x="172" y="52" width="150" height="50" rx="10"/>
  <text class="d-text" x="247" y="74" text-anchor="middle">forwardRef wrapper</text>
  <text class="d-sub" x="247" y="92" text-anchor="middle">before React 19</text>
  <path class="d-edge-dashed" d="M 328 77 L 352 77" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-muted" x="358" y="52" width="130" height="50" rx="10"/>
  <text class="d-sub" x="423" y="82" text-anchor="middle">component</text>
  <path class="d-edge-dashed" d="M 494 77 L 518 77" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-muted" x="524" y="52" width="120" height="50" rx="10"/>
  <text class="d-sub" x="584" y="82" text-anchor="middle">DOM node</text>
  <rect class="d-box-accent" x="16" y="132" width="120" height="50" rx="10"/>
  <text class="d-sub" x="76" y="162" text-anchor="middle">parent</text>
  <path class="d-edge-accent" d="M 142 157 L 352 157" marker-end="url(#rf-arrow)"/>
  <text class="d-sub" x="247" y="146" text-anchor="middle">ref passed as a prop</text>
  <rect class="d-box-accent" x="358" y="132" width="130" height="50" rx="10"/>
  <text class="d-sub" x="423" y="162" text-anchor="middle">component</text>
  <path class="d-edge-accent" d="M 494 157 L 518 157" marker-end="url(#rf-arrow)"/>
  <rect class="d-box-accent" x="524" y="132" width="120" height="50" rx="10"/>
  <text class="d-sub" x="584" y="162" text-anchor="middle">DOM node</text>
</svg>

## 3. Verified: <code>forwardRef</code> was not removed, and does not warn

Worth checking rather than assuming, given how much React 19 did remove:

\`\`\`
forwardRef ref.current: INPUT
deprecation warning? none emitted
\`\`\`

📌 **Interview term:** <code>forwardRef</code> **still works and is silent** on React 19.2.8. Existing code needs no urgent migration, and a library supporting React 18 as well must keep using it. The React team ships a codemod for when you do migrate, but this is a cleanup, not a fix.

## 4. Change two: ref callbacks can return a cleanup

The more interesting change, and the one people miss.

📌 **Interview term:** previously a ref callback was called with the node on attach and **called again with <code>null</code>** on detach, so teardown meant an <code>if (node === null)</code> branch inside the same function. In React 19 a ref callback may **return a cleanup function**, which React calls on detach instead.

\`\`\`jsx
// Before
<div ref={(node) => {
  if (node) observer.observe(node);
  else observer.disconnect();      // the null branch
}} />

// React 19
<div ref={(node) => {
  observer.observe(node);
  return () => observer.disconnect();   // paired, like an effect
}} />
\`\`\`

### Verified

A ref callback returning a cleanup, on a component that mounts and then unmounts:

\`\`\`
sequence: attach:INPUT -> cleanup ran
\`\`\`

The callback was **not** called a second time with <code>null</code> — React ran the returned cleanup instead. Setup and teardown now sit next to each other, exactly like <code>useEffect</code>, which makes it much harder to leak an observer or listener attached in a ref callback.

📌 **Interview term:** the old behaviour still applies to callbacks that return nothing, so existing ref callbacks are unaffected. This is additive.

## 5. What this changes in practice

| | Before React 19 | React 19 |
| :--- | :--- | :--- |
| Passing a ref to a function component | <code>forwardRef</code> wrapper | A plain prop |
| DevTools tree | <code>ForwardRef(Input)</code> node | Just <code>Input</code> |
| TypeScript | Generic wrapper types | An ordinary prop type |
| Ref callback teardown | A <code>null</code> branch | A returned cleanup |
| <code>forwardRef</code> | Required | Supported, no longer needed |

## 6. What did *not* change

- <code>ref</code> on a **class** component still gives you the instance.
- <code>ref</code> on a function component only works if that component does something with it — passing it to a DOM node or into <code>useImperativeHandle</code>.
- <code>key</code> is **still not a prop.** It remains compiled to a separate argument, so a component cannot read its own key. Only <code>ref</code> changed. See <a href="PASTE_JSX_URL_HERE" target="_blank" rel="noopener noreferrer">what JSX compiles to</a>.
- Refs remain an escape hatch: mutating <code>ref.current</code> never triggers a render.

## 7. Common Pitfalls

- **Assuming <code>forwardRef</code> was removed.** Verified above: it works and does not warn.
- **Migrating a library that still supports React 18.** <code>ref</code>-as-a-prop does not exist there.
- **Forgetting to spread or forward the ref.** Accepting it as a prop and ignoring it leaves <code>ref.current</code> null.
- **Expecting <code>key</code> to become a prop too.** It did not.
- **Returning something that is not a function from a ref callback.** React expects a cleanup function or nothing.
- **Mixing both teardown styles.** If you return a cleanup, do not also branch on <code>null</code> — that branch no longer runs.
- **An inline ref callback that sets state.** A new function every render means React detaches and reattaches the ref each time; if the callback updates state that is an infinite loop ending in "Maximum update depth exceeded". Wrap it in <code>useCallback</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the headline:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> is now an ordinary prop on function components — you destructure it like anything else, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code> is no longer needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Be precise about the old API:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code> was not removed and does not even warn — so there is no urgent migration, and a library supporting React 18 still needs it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bring up the second change, which most people miss:</strong> <span style="color:#f0e2c8;">"Ref callbacks can now return a cleanup function, instead of being called again with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> on detach."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say why that matters:</strong> <span style="color:#f0e2c8;">"Setup and teardown sit together like an effect, so it is much harder to leak an observer or listener you attached in a ref callback."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close the obvious follow-up:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> did <em style="color:#ffe0b2;">not</em> become a prop — it is still compiled to a separate argument, so a component still cannot read its own key."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">forwardRef</code> deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It still works and emits no warning on 19.2.8 — I checked rather than assuming, since React 19 removed plenty of other things. It is simply unnecessary for new code. A shared library that still supports React 18 has to keep it, because ref-as-a-prop does not exist there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does returning a cleanup from a ref callback change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React runs that cleanup on detach instead of calling the callback again with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>. Setup and teardown end up adjacent, the way an effect reads — which removes the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">if (node === null)</code> branch that people routinely forgot, leaking an observer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key</code> become a normal prop too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> is still compiled to a separate argument on the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx()</code> call rather than into props, so a component still cannot read its own key. It belongs to reconciliation rather than to your component API, which is why it was left alone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does passing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code> to any function component now work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the component does something with it. It arrives as a prop, so a component that ignores it leaves <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">ref.current</code> null. You still have to attach it to a DOM node or feed it into <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useImperativeHandle</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate a large codebase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unhurriedly. Existing <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code> keeps working, so I would run the official codemod when already touching those files rather than as a dedicated pass — and hold off entirely on any package that still needs to support React 18.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>ref</code> as a prop** | React 19 passing refs like any other prop |
| **<code>forwardRef</code>** | The wrapper that used to be required; still supported |
| **Ref callback** | A function receiving the node instead of a ref object |
| **Ref cleanup** | A function returned from a ref callback, run on detach |
| **<code>useImperativeHandle</code>** | Exposing a custom object through a ref |

---
**Conclusion:** React 19 made two changes. <code>ref</code> is now an ordinary prop on function components, so <code>forwardRef</code> is unnecessary for the common case — though verified here, it still works and emits no deprecation warning, so nothing needs migrating urgently. The subtler change is that a ref callback may return a cleanup function, which React runs on detach instead of calling the callback again with <code>null</code>; verified as <code>attach:INPUT -> cleanup ran</code>. That pairs setup with teardown the way an effect does, and makes it far harder to leak something attached in a ref callback. <code>key</code> was not changed and is still not a prop.`,
    examples: [
      {
        label: "ref as a plain prop, and a ref callback that cleans up after itself",
        runnable: true,
        code: `import { useRef, useState, useCallback, useImperativeHandle } from "react";

// ── React 19: ref is just a prop. No forwardRef wrapper. ──────────────────
function TextField({ ref, label, ...rest }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      {label}: <input ref={ref} {...rest} />
    </label>
  );
}

// ── Still works: useImperativeHandle to expose a custom API rather than
//    the raw node. The ref still arrives as an ordinary prop. ──────────────
function Counter({ ref }) {
  const [n, setN] = useState(0);
  useImperativeHandle(ref, () => ({
    increment: () => setN((v) => v + 1),
    reset: () => setN(0),
  }), []);
  return <p style={{ margin: "8px 0" }}>Counter value: <strong>{n}</strong></p>;
}

// ── React 19: a ref CALLBACK may return a cleanup. Setup and teardown sit
//    together, exactly like an effect — no if (node === null) branch.
//
//    IMPORTANT: the callback must be STABLE. An inline arrow is a new function
//    every render, so React detaches and reattaches on each one — and if the
//    callback also sets state, that is an infinite loop. Hence useCallback.
function Measured({ onLog }) {
  const measureRef = useCallback((node) => {
    // ResizeObserver is a browser API; guard it so this also runs in a
    // non-browser environment such as a test renderer.
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() =>
            onLog("observed width " + Math.round(node.getBoundingClientRect().width)))
        : null;
    ro?.observe(node);
    onLog("attached observer");
    // Pre-19 this teardown had to live in a null branch of this same
    // callback, and was very easy to forget.
    return () => {
      ro?.disconnect();
      onLog("observer disconnected");
    };
  }, [onLog]);

  return (
    <div
      ref={measureRef}
      style={{ border: "2px dashed #4f46e5", padding: 12, borderRadius: 8, resize: "horizontal", overflow: "auto", minWidth: 160 }}
    >
      Drag my bottom-right corner to resize me.
    </div>
  );
}

export default function App() {
  const inputRef = useRef(null);
  const counterRef = useRef(null);
  const [mounted, setMounted] = useState(true);
  const [log, setLog] = useState([]);
  // Stable identity, so the ref callback below is also stable.
  const push = useCallback((line) => setLog((l) => [...l.slice(-5), line]), []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <TextField ref={inputRef} label="Name" placeholder="click focus below" />
      <button onClick={() => inputRef.current?.focus()}>focus the input</button>

      <hr />
      <Counter ref={counterRef} />
      <button onClick={() => counterRef.current?.increment()}>increment via ref</button>{" "}
      <button onClick={() => counterRef.current?.reset()}>reset via ref</button>

      <hr />
      {mounted && <Measured onLog={push} />}
      <p>
        <button onClick={() => setMounted((m) => !m)}>
          {mounted ? "unmount" : "mount"} the observed box
        </button>
      </p>
      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12 }}>
        {log.length ? log.join("\\n") : "(resize or unmount the box)"}
      </pre>

      <p style={{ color: "#666", fontSize: 13 }}>
        Unmount the box and watch the log: the cleanup returned from the ref
        callback disconnects the observer. No forwardRef appears anywhere on
        this page.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
