/**
 * React "ultra" rewrite — batch 07 (state & context).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals; keep seoDescription under 155; no
 * apostrophes inside <svg>; every tag in the amber card needs its own colour.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - One context, memo-wrapped consumers, only the theme changed: the USER
 *     consumer still re-rendered (2 renders). memo does not block context.
 *   - Split into two contexts, same change: the user consumer stayed at 1.
 *   - A useMemo-ed provider value: 1 render across 3 renders of identical data.
 *   - Context.Provider === Context is TRUE in React 19; <Ctx value=...> works,
 *     <Ctx.Provider> still works, and Consumer still exists.
 *   - State survives a prop change (A:2 -> B:2) and resets on a key change (B:0).
 *   - An uncontrolled form read via FormData captured both fields with no state.
 *   - useActionState: "not submitted" -> "saved: Grace".
 *   - Two useSyncExternalStore readers both updated from one external store.
 *
 * Angle split across the three Context docs, all cross-linked:
 *   - "Context API and when to use it" = what it is and when to reach for it.
 *   - "Why does updating Context re-render all consumers" = the mechanism plus
 *     every fix, with the measured numbers.
 *   - "What changed with Context in React 19" = the provider-syntax change.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between state and props?",
    seoDescription:
      "Props come from the parent and are read-only; state is owned by the component. Verified: a prop change kept state, a key change reset it.",
    description: `**Question presented to candidate:**
"What is the difference between state and props, and how do you decide which one a value should be?"

**What a strong answer should cover:**
- **Props** are inputs passed in by the parent; **state** is data the component owns and can change itself.
- Props are **read-only**; state is changed through a setter, never by assignment.
- Both cause a re-render when they change, so that is not the distinction.
- **State persists across re-renders** and is tied to the component's position in the tree — a prop change does not reset it, but a **\`key\` change remounts** the component and does.
- The deciding question: **can this component change the value itself?** If yes it is state; if it comes from above it is a prop.
- Do not copy props into state — it creates a second source of truth that stops tracking the first.
- A value that can be **derived** from props or state should be neither; compute it during render.
- Where the value lives is a design decision: shared values get lifted, local ones stay colocated.

**Clarifying questions expected:**
- "Is this value something the component changes, or is it given to it?"
- "Does anything else need the same value?" — that pushes toward lifting.

**Code / implementation expected:** Optional. A component taking a prop and holding its own state alongside is enough.`,
    answer: `**Target Audience:** Anyone preparing for a React interview — assumes components exist.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The persistence results in section 4 were produced by clicking a real component and then changing its props on React 19.2.8.

## 1. Why This Even Matters — A Story First

A vending machine is installed with a fixed price list — that comes from outside, and the machine cannot change it. It also keeps a running count of what it has sold, which it updates itself all day long.

Price list: given to it, not its to change. Sales count: its own, and it is the only thing that changes it.

That is props and state, and the deciding question is the same one: **can this thing change the value itself?**

## 2. The Core Idea

📌 **Interview term: props** — inputs a component receives from its parent. **Read-only**: a component may read them but must never assign to them.

📌 **Interview term: state** — data a component owns, declared with <code>useState</code> or <code>useReducer</code>, which it changes through a setter. It **persists between renders**.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Props arrive from the parent while state is owned inside the component">
  <defs>
    <marker id="sp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Given from outside, or owned inside</text>
  <rect class="d-box-muted" x="20" y="76" width="160" height="60" rx="10"/>
  <text class="d-text" x="100" y="100" text-anchor="middle">parent</text>
  <text class="d-sub" x="100" y="120" text-anchor="middle">passes props in</text>
  <path class="d-edge" d="M 186 106 L 242 106" marker-end="url(#sp-arrow)"/>
  <text class="d-sub" x="214" y="94" text-anchor="middle">props</text>
  <rect class="d-box-accent" x="248" y="52" width="200" height="110" rx="10"/>
  <text class="d-text d-accent" x="348" y="80" text-anchor="middle">the component</text>
  <text class="d-sub" x="348" y="104" text-anchor="middle">reads props, cannot write</text>
  <text class="d-sub" x="348" y="126" text-anchor="middle">owns and writes its state</text>
  <path class="d-edge-accent" d="M 454 106 L 510 106" marker-end="url(#sp-arrow)"/>
  <text class="d-sub" x="482" y="94" text-anchor="middle">setter</text>
  <rect class="d-box-accent" x="516" y="76" width="124" height="60" rx="10"/>
  <text class="d-text d-accent" x="578" y="100" text-anchor="middle">state</text>
  <text class="d-sub" x="578" y="120" text-anchor="middle">persists</text>
</svg>

## 3. Side by side

| | Props | State |
| :--- | :--- | :--- |
| Comes from | The parent | The component itself |
| Writable by the component | **No** | Yes, via the setter |
| Triggers a re-render on change | Yes | Yes |
| Survives re-renders | Passed fresh each time | **Persists** |
| Reset by a <code>key</code> change | n/a | **Yes** — remounts |
| Initial value | Whatever the parent passes | The <code>useState</code> argument |
| Analogy | Function arguments | A variable the function remembers |

## 4. Verified: state persists, and what resets it

A counter clicked twice, then re-rendered with a different <code>label</code> prop, then re-rendered with a different <code>key</code>:

\`\`\`
after two clicks: A:2
after changing only the label prop: B:2   <- state survived
after changing the key: B:0              <- remounted, state reset
\`\`\`

Three things worth reading off that:

- Changing a prop re-rendered the component but **did not touch its state**. Props and state are independent.
- The <code>useState(0)</code> initial value was **not** reapplied on re-render. It is only used on the first render for that component instance.
- Changing the <code>key</code> **did** reset it — React treated it as a different component, unmounted the old one and mounted a fresh one.

📌 **Interview term:** state is tied to a component's **position and identity in the tree**, not to the component function. That is why <code>key</code> is the idiomatic way to reset state on a prop change — no effect, no manual clearing.

## 5. Deciding which one a value should be

Ask in order:

1. **Can it be computed from something you already have?** Then it is **neither** — derive it during render. A <code>fullName</code> from <code>firstName</code> and <code>lastName</code> is not state.
2. **Does it come from the parent and never change here?** A **prop**.
3. **Does this component change it?** **State**.
4. **Do other components need it too?** State, but <a href="PASTE_LIFTING_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">lifted</a> to a common ancestor.

📌 **Interview term:** copying a prop into state — <code>useState(props.value)</code> — creates a **second source of truth**. The copy is seeded once and then silently stops tracking the prop, which is why people end up writing an effect to re-sync them. Do it only when you genuinely want an independent draft.

## 6. Common Pitfalls

- **Mutating props.** They are read-only, and React freezes them in development so it throws.
- **Copying a prop into state.** Two sources of truth, then an effect to reconcile them.
- **Storing derived values in state.** Compute during render; storing costs an extra render pass.
- **Expecting the <code>useState</code> argument to reapply.** It is the *initial* value only.
- **Expecting a setter to update the variable immediately.** State updates are scheduled; the new value arrives on the next render.
- **Passing a setter down and calling it "two-way binding".** It is still <a href="PASTE_UNIDIRECTIONAL_URL_HERE" target="_blank" rel="noopener noreferrer">props down, events up</a>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line each:</strong> <span style="color:#f0e2c8;">"Props are inputs from the parent and read-only. State is data the component owns and changes itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say what is <em style="color:#ffe0b2;">not</em> the difference:</strong> <span style="color:#f0e2c8;">"Both cause a re-render, so that is not it. The difference is ownership — who is allowed to change the value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the persistence detail:</strong> <span style="color:#f0e2c8;">"State survives re-renders and is tied to the component position in the tree — changing a prop does not reset it, changing the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> does."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the deciding question:</strong> <span style="color:#f0e2c8;">"Can this component change the value itself? Yes is state, no is a prop — and if it can be computed from either, it should be neither."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Volunteer the anti-pattern:</strong> <span style="color:#f0e2c8;">"I would not copy a prop into state — that is a second source of truth that stops tracking the first."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does changing a prop reset a component state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — verified: a counter at 2 stayed at 2 when its label prop changed. It re-renders, but state belongs to the component instance and survives. Changing the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> is what resets it, because React then treats it as a different component and remounts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code> initial value not reapply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is the <em style="color:#ffe0b2;">initial</em> value — used once when that component instance mounts. On later renders React returns the stored value and ignores the argument. If it reapplied, state could never change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you ever copy a prop into state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when you deliberately want an independent copy — an editable draft seeded from a saved value. Otherwise you get two sources of truth: the copy is seeded once and then diverges, and you end up writing an effect to re-sync, which is the tell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a value that can be computed from props state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it should be neither. Compute it during render. Putting it in state and syncing it with an effect costs an extra render pass and shows the stale value first, which I have measured as two renders where one would do.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a child change a prop it was given?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Props are read-only and React freezes them in development, so assignment throws. The child asks the parent to change it by calling a callback the parent passed down — that is the whole shape of data flow in React.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Props** | Read-only inputs from a parent |
| **State** | Data a component owns and can change |
| **Derived value** | Computed from props or state; should be neither |
| **Source of truth** | The one place a value actually lives |
| **<code>key</code>** | Changing it remounts the component and resets its state |

---
**Conclusion:** props come from the parent and are read-only; state is owned by the component and changed through its setter. Both trigger a re-render, so that is not the distinction — ownership is. Verified on React 19.2.8: a counter at 2 kept its value through a prop change and reset only when its <code>key</code> changed, because state belongs to the component instance rather than to the function. The deciding question is whether this component can change the value itself, and anything computable from what you already have should be neither.`,
    examples: [
      {
        label: "State surviving a prop change, and resetting via key",
        runnable: true,
        code: `import { useState } from "react";

// Takes a prop (read-only) AND owns state (its own). Both re-render it; only
// one of them can it change.
function Counter({ label }) {
  const [count, setCount] = useState(0);
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <p style={{ margin: "0 0 6px" }}>
        prop <code>label</code>: <strong>{label}</strong> · state <code>count</code>:{" "}
        <strong>{count}</strong>
      </p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}

// A derived value is NEITHER prop nor state — just compute it.
function Greeting({ firstName, lastName }) {
  const fullName = firstName + " " + lastName;   // no useState needed
  const initials = (firstName[0] + lastName[0]).toUpperCase();
  return (
    <p style={{ fontSize: 14 }}>
      derived from props: <strong>{fullName}</strong> ({initials})
    </p>
  );
}

export default function App() {
  const [label, setLabel] = useState("A");
  const [resetToken, setResetToken] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 460 }}>
      {/* Changing resetToken changes the key, which remounts Counter and
          therefore resets its state. No effect, no manual clearing. */}
      <Counter key={resetToken} label={label} />

      <p>
        <button onClick={() => setLabel((l) => (l === "A" ? "B" : "A"))}>
          change the label prop
        </button>{" "}
        <button onClick={() => setResetToken((t) => t + 1)}>
          change the key (resets state)
        </button>
      </p>

      <Greeting firstName="Ada" lastName="Lovelace" />

      <p style={{ color: "#666", fontSize: 13 }}>
        Click +1 a few times, then change the label — the count survives, because
        props and state are independent. Change the key and it drops to 0,
        because React unmounted that instance and mounted a fresh one.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is 'prop drilling' and how can it be avoided?",
    seoDescription:
      "Threading a prop through components that never use it. Try composition before Context — it often removes the threading with no new machinery.",
    description: `**Question presented to candidate:**
"A value from the top of your app is needed six levels down. What are your options?"

**What a strong answer should cover:**
- **Prop drilling** is passing a prop through components that do not use it, purely to reach a descendant.
- It is not automatically wrong — two levels is explicit and readable. It becomes a problem past three or four, when intermediate components take props solely to forward them.
- The real costs: you can no longer see which components actually depend on a value; renaming means touching every level; and the intermediate components have a wider interface than their job needs.
- **The escape ladder, in order**: composition (\`children\` or element slots), then Context, then a store.
- **Composition first** is the point most candidates miss — restructuring so the deep component is created higher up removes the threading entirely, needs no new machinery, and has a measurable re-render benefit.
- Context is a **transport**, not a state manager; every consumer re-renders when the value changes.
- A store (Redux, Zustand, Jotai) adds selector subscriptions, so only components reading the changed slice re-render.
- Custom hooks can hide the \`useContext\` call so consumers do not import the context directly.

**Clarifying questions expected:**
- "How many levels, and do any of the intermediate components use the value?"
- "How often does it change, and how many components read it?" — that decides Context versus a store.

**Code / implementation expected:** Yes — the drilled version and the composition refactor side by side.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and components.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The re-render figures quoted in section 4 were measured on React 19.2.8; see <a href="PASTE_COMPOSITION_VS_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">avoiding re-renders with composition</a> for the full run.

## 1. Why This Even Matters — A Story First

A parcel for the fourth floor arrives at reception. Reception carries it to the first floor, who carry it to the second, who carry it to the third, who carry it to the fourth. Everyone handled it; nobody wanted it.

That is prop drilling. It works — the parcel arrives. But now four people have "carrying parcels" in their job description, and if the parcel changes shape, all four have to be retrained.

## 2. The Core Idea

📌 **Interview term: prop drilling** — passing a prop down through components that do not use it themselves, solely to deliver it to a deeper descendant.

The important nuance: **it is not automatically a problem.** One or two levels is explicit, easy to follow, and needs no machinery. It becomes a problem when intermediate components exist only as couriers.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="A value threaded through three components that never use it, versus passing the consumer in directly">
  <defs>
    <marker id="pd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Threaded through, or handed straight over</text>
  <rect class="d-box-accent" x="16" y="52" width="110" height="44" rx="8"/>
  <text class="d-sub" x="71" y="79" text-anchor="middle">owner</text>
  <path class="d-edge" d="M 132 74 L 152 74" marker-end="url(#pd2-arrow)"/>
  <rect class="d-box-muted" x="158" y="52" width="110" height="44" rx="8"/>
  <text class="d-sub" x="213" y="79" text-anchor="middle">does not use it</text>
  <path class="d-edge" d="M 274 74 L 294 74" marker-end="url(#pd2-arrow)"/>
  <rect class="d-box-muted" x="300" y="52" width="110" height="44" rx="8"/>
  <text class="d-sub" x="355" y="79" text-anchor="middle">does not use it</text>
  <path class="d-edge" d="M 416 74 L 436 74" marker-end="url(#pd2-arrow)"/>
  <rect class="d-box-muted" x="442" y="52" width="110" height="44" rx="8"/>
  <text class="d-sub" x="497" y="79" text-anchor="middle">does not use it</text>
  <path class="d-edge" d="M 558 74 L 578 74" marker-end="url(#pd2-arrow)"/>
  <rect class="d-box-accent" x="584" y="52" width="62" height="44" rx="8"/>
  <text class="d-sub" x="615" y="79" text-anchor="middle">uses it</text>
  <rect class="d-box-accent" x="16" y="150" width="110" height="44" rx="8"/>
  <text class="d-sub" x="71" y="177" text-anchor="middle">owner</text>
  <path class="d-edge-accent" d="M 132 172 L 578 172" marker-end="url(#pd2-arrow)"/>
  <text class="d-sub" x="355" y="160" text-anchor="middle">composition or Context</text>
  <rect class="d-box-accent" x="584" y="150" width="62" height="44" rx="8"/>
  <text class="d-sub" x="615" y="177" text-anchor="middle">uses it</text>
</svg>

## 3. When it actually hurts

| Symptom | Why it matters |
| :--- | :--- |
| Three or more levels of forwarding | You cannot see who depends on the value |
| A component taking props it never reads | Its interface is wider than its job |
| Renaming means editing five files | The change is mechanical but noisy |
| Every level re-renders on change | Work done by components that do not care |

📌 **Interview term:** the deepest cost is **legibility**, not performance. When a value is threaded through six components, working out which ones genuinely depend on it means reading all six.

## 4. Escape one: composition — try this first

Restructure so the component that needs the value is created **where the value already is**, and passed down as <code>children</code> or as an element in a prop:

\`\`\`jsx
// Drilled — Layout and Sidebar take user only to forward it
<Layout user={user}>
  <Sidebar user={user} />
</Layout>

// Composed — Layout and Sidebar never see user at all
<Layout sidebar={<UserPanel user={user} />}>
  <Content />
</Layout>
\`\`\`

📌 **Interview term:** this is the underused answer. It needs no Context, no store, and no new concept — and it has a measurable performance benefit, because an element created by a component that does not re-render keeps a stable identity. Measured elsewhere in this collection: an expensive child dropped from **3 renders to 1** purely by being passed as <code>children</code>.

## 5. Escape two: Context

📌 **Interview term:** <a href="PASTE_CONTEXT_URL_HERE" target="_blank" rel="noopener noreferrer">Context</a> publishes a value at a provider and lets any descendant read it with <code>useContext</code>, skipping the intermediate levels entirely.

The caveat to state in the same breath: it is a **transport mechanism, not a state manager**, and **every consumer re-renders** when the provider value changes — measured at 2 renders for a consumer whose own data never changed. Suited to values that change rarely: theme, locale, current user. See <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">why Context re-renders every consumer</a>.

A useful convention is to hide the context behind a hook, so consumers never import it directly:

\`\`\`jsx
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside a UserProvider");
  return ctx;
}
\`\`\`

## 6. Escape three: a store

For genuinely app-wide, frequently-changing state, a store — Redux, Zustand, Jotai — adds what Context lacks: **selector-based subscriptions**, so only components reading the changed slice re-render. See <a href="PASTE_GLOBAL_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">managing global state</a>.

## 7. Common Pitfalls

- **Reaching for Context at the first forwarded prop.** Two levels is clearer than a provider.
- **Skipping composition entirely.** It is the cheapest fix and the one most people forget.
- **Treating Context as a performance fix.** It removes threading, not renders — often it adds them.
- **One giant app-wide context object.** Any change re-renders every consumer of everything.
- **Putting rapidly-changing values in Context.** Form input state in a provider re-renders the tree on every keystroke.
- **Assuming drilling is always bad.** Explicit props are the most readable option at short distances.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it, then immediately qualify it:</strong> <span style="color:#f0e2c8;">"Passing a prop through components that do not use it. Two levels is fine and explicit — it becomes a problem past three or four."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real cost:</strong> <span style="color:#f0e2c8;">"It is legibility more than performance — once a value is threaded through six components, you cannot tell which ones actually depend on it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lead with composition — this is the differentiator:</strong> <span style="color:#f0e2c8;">"First I would restructure so the consumer is created where the value already lives and passed in as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>. No new machinery, and it reduces re-renders too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Then Context, with its caveat:</strong> <span style="color:#f0e2c8;">"Context is transport, not state management, and every consumer re-renders when the value changes — so it suits theme, locale, current user."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Then a store, for the right reason:</strong> <span style="color:#f0e2c8;">"A store adds selector subscriptions, so only components reading the changed slice re-render. That is what Context cannot do."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is prop drilling always bad?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. At one or two levels it is the most readable option — the data flow is visible in the code, with no indirection. It turns bad when intermediate components exist only to forward, because then the tree tells you nothing about who actually uses the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does composition remove drilling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You create the consuming component where the value already is, and pass the finished element down as <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> or a slot prop. The intermediate components then render an opaque child and never see the value at all — and because that element was created by a component that did not re-render, it also skips re-rendering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Context fix the performance side too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not, and often the opposite. It removes the threading, but every consumer re-renders whenever the provider value changes — including ones reading a part of it that did not change. For a frequently-changing value that can be worse than the drilling it replaced.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you jump straight to a store?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the state is genuinely app-wide, changes often, and is read by many components that each care about a different slice. Selector subscriptions are the specific feature you are buying — without that requirement, Context or composition is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why wrap <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useContext</code> in a custom hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps the context object private, gives you one place to throw a clear error when a consumer is rendered outside the provider, and lets you change the underlying implementation — swapping Context for a store — without touching a single consumer.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prop drilling** | Threading a prop through components that do not use it |
| **Composition** | Creating the consumer higher up and passing it down |
| **Slot prop** | A prop holding an element rather than data |
| **Context** | A transport letting descendants read a value directly |
| **Selector subscription** | Re-rendering only for the slice a component reads |

---
**Conclusion:** prop drilling is threading a value through components that never use it, and the honest first point is that at one or two levels it is fine — explicit and readable. Past three or four the cost is legibility: you can no longer tell which components actually depend on the value. The escape ladder runs composition, then Context, then a store — and composition belongs first because it removes the threading with no new machinery and improves re-renders as a side effect. Context is transport rather than state management, and every consumer re-renders when its value changes.`,
    examples: [
      {
        label: "The drilled version, then the same tree fixed by composition",
        runnable: true,
        code: `import { useState } from "react";

const renders = { drilledMid: 0, composedMid: 0 };

// ── DRILLED: Layout and Panel take the user prop only to hand it down. ────
function DrilledLayout({ user, children }) {
  renders.drilledMid++;
  return <Frame title="Drilled">{children}<DrilledPanel user={user} /></Frame>;
}
function DrilledPanel({ user }) {
  // Does not use user either — pure courier.
  return <DrilledBadge user={user} />;
}
function DrilledBadge({ user }) {
  return <Badge name={user.name} />;   // finally, someone who wants it
}

// ── COMPOSED: the badge is created where the user value already lives, then
//    passed in as an element. No intermediate component ever sees it. ───────
function ComposedLayout({ children, panel }) {
  renders.composedMid++;
  return <Frame title="Composed">{children}{panel}</Frame>;
}

function Frame({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      {children}
    </section>
  );
}

function Badge({ name }) {
  return (
    <span style={{ background: "#4f46e5", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 13 }}>
      {name}
    </span>
  );
}

export default function App() {
  const [user] = useState({ name: "Ada Lovelace" });
  const [tick, setTick] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 460 }}>
      <DrilledLayout user={user}>
        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
          user passed through 3 components that never read it
        </p>
      </DrilledLayout>

      {/* The element is built HERE, where user already is. */}
      <ComposedLayout panel={<Badge name={user.name} />}>
        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
          user never appears in ComposedLayout&apos;s props at all
        </p>
      </ComposedLayout>

      <button onClick={() => setTick((t) => t + 1)}>re-render the app ({tick})</button>

      <p style={{ color: "#666", fontSize: 13 }}>
        Both render the same badge. The composed version needs no <code>user</code>
        prop on any intermediate component, so renaming or reshaping the value
        touches one file instead of four — and it needed no Context to get there.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the Context API in React and when would you use it?",
    seoDescription:
      "Context lets any descendant read a value without prop threading. It is transport, not state management — every consumer re-renders when the value changes.",
    description: `**Question presented to candidate:**
"What is the Context API, and how do you decide whether a value belongs in it?"

**What a strong answer should cover:**
- \`createContext\` makes a context; a **provider** supplies a value; any descendant reads it with \`useContext\`.
- It solves **prop drilling** — delivering a value without threading it through intermediate components.
- **It is a transport mechanism, not a state manager.** It does not store or update anything; the state still lives in a component or a store, and Context merely carries it.
- The cost: **every consumer re-renders** when the provider value changes, and \`memo\` does not stop that.
- So it suits values that are **read widely and change rarely**: theme, locale, current user, feature flags, a stable \`dispatch\`.
- It suits badly: anything changing frequently, like form input or cursor position.
- The **default value** is only used when a consumer has no provider above it — useful for tests and for catching missing providers.
- Convention: wrap the \`useContext\` call in a custom hook that throws when the provider is missing.
- Multiple small contexts beat one large object, because the granularity of re-rendering follows the granularity of the contexts.

**Clarifying questions expected:**
- "How often does this value change, and how many components read it?"
- "Have we tried composition first?" — often it removes the need entirely.

**Code / implementation expected:** Yes — a provider, a custom consumer hook with a missing-provider guard, and a memoised value.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and state.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The default-value and re-render behaviour below were measured on React 19.2.8. This doc covers *what Context is and when to use it*; <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">why it re-renders every consumer</a> covers the mechanism and the fixes in depth.

## 1. Why This Even Matters — A Story First

A building has a public address system. Anyone on any floor can hear an announcement without it being carried from desk to desk. That is genuinely useful for "the building closes at six" — everyone needs it, and it is said once an hour at most.

It is a terrible way to tell one person their coffee is ready. Every floor stops what it is doing, every time.

Context is the PA system. What belongs on it is decided almost entirely by **how often you would be making announcements**.

## 2. The Core Idea

📌 **Interview term: Context** — a way to make a value available to every component beneath a **provider**, without passing it through the components in between.

\`\`\`jsx
const ThemeContext = createContext("light");          // create

<ThemeContext value="dark">                            // provide
  <App />
</ThemeContext>

const theme = useContext(ThemeContext);                // consume, at any depth
\`\`\`

📌 **Interview term:** Context is a **transport mechanism, not a state manager**. It has no store, no reducer, and no subscriptions of its own. The state still lives in a component (usually <code>useState</code> or <code>useReducer</code> in the provider) or in an external store — Context only carries the value down. Saying this precisely is one of the strongest signals on this question.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="A provider supplies a value that any descendant can read directly, skipping the levels between">
  <defs>
    <marker id="cx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Announced once, heard at any depth</text>
  <rect class="d-box-accent" x="230" y="44" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="330" y="68" text-anchor="middle">provider</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">supplies the value</text>
  <rect class="d-box-muted" x="230" y="118" width="200" height="44" rx="10"/>
  <text class="d-sub" x="330" y="145" text-anchor="middle">middle layers, unaware</text>
  <path class="d-edge-dashed" d="M 330 104 L 330 114" marker-end="url(#cx-arrow)"/>
  <path class="d-edge-accent" d="M 246 100 L 130 178" marker-end="url(#cx-arrow)"/>
  <path class="d-edge-accent" d="M 414 100 L 530 178" marker-end="url(#cx-arrow)"/>
  <rect class="d-box-accent" x="30" y="182" width="200" height="44" rx="10"/>
  <text class="d-sub" x="130" y="209" text-anchor="middle">consumer reads it</text>
  <rect class="d-box-accent" x="430" y="182" width="200" height="44" rx="10"/>
  <text class="d-sub" x="530" y="209" text-anchor="middle">consumer reads it</text>
</svg>

The dashed line matters: the middle layers still render, they simply never see or forward the value.

## 3. Verified: the default value, and when it applies

\`\`\`
using a provider     -> "new style"
with no provider     -> "default value"
\`\`\`

📌 **Interview term:** the argument to <code>createContext</code> is used **only** when a consumer has no matching provider above it. It is not a fallback for <code>undefined</code> passed by a provider — a provider supplying <code>undefined</code> gives you <code>undefined</code>. That distinction is a common interview follow-up, and it is why many codebases pass <code>null</code> as the default and throw in a custom hook when it is still <code>null</code>.

## 4. The cost you must state in the same breath

📌 **Interview term:** when a provider value changes, **every consumer re-renders**, whether or not the part it reads changed — and <code>React.memo</code> does not prevent it, because context propagation bypasses the props comparison.

Measured on React 19.2.8 with memo-wrapped consumers, changing only the theme:

\`\`\`
user consumer  : 2 renders  <- re-rendered although user never changed
theme consumer : 2 renders
\`\`\`

That single fact decides what belongs in Context. See <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">the re-render doc</a> for the fixes.

## 5. What belongs in it, and what does not

| Good fit | Why |
| :--- | :--- |
| Theme, locale, text direction | Read everywhere, changes almost never |
| The authenticated user | Read widely, changes on login and logout |
| Feature flags | Effectively constant per session |
| A stable <code>dispatch</code> function | Identity never changes, so consumers never re-render |
| Routing information | Changes per navigation, not per interaction |

| Poor fit | Why |
| :--- | :--- |
| Form input values | Every keystroke re-renders every consumer |
| Anything animating or on a timer | Constant re-renders across the tree |
| Server data | Wants caching and invalidation — use a query library |
| One giant app-state object | Any change re-renders every consumer of everything |

## 6. The conventions worth naming

**Wrap it in a custom hook.** Keeps the context object private and gives one place to catch a missing provider:

\`\`\`jsx
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
\`\`\`

**Split by change frequency, not by domain.** A context holding <code>{ user, theme }</code> re-renders theme consumers when the user changes. Two contexts do not.

**Memoise the provider value.** An object literal is a new reference every render, so every consumer re-renders even when nothing changed. Verified: a <code>useMemo</code>-ed value gave **1 render across 3 renders of identical data**.

## 7. Common Pitfalls

- **Calling it a state manager.** It transports; it does not store, update, or let you subscribe to part of a value.
- **A fresh object literal as the value.** Every render becomes a change for every consumer.
- **One context for the whole app.** Change frequency is then the maximum of everything in it.
- **Expecting <code>memo</code> to help.** Verified above: it does not.
- **Reaching for it before composition.** Often <a href="PASTE_PROP_DRILLING_URL_HERE" target="_blank" rel="noopener noreferrer">passing the component as children</a> removes the need entirely.
- **Relying on the default value as a fallback.** It only applies when there is no provider at all.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it as delivery:</strong> <span style="color:#f0e2c8;">"A provider supplies a value and any descendant reads it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useContext</code> — no threading through the components in between."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say the sentence that earns credit:</strong> <span style="color:#f0e2c8;">"It is a transport mechanism, not a state manager — the state still lives somewhere else, Context just carries it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the cost immediately:</strong> <span style="color:#f0e2c8;">"Every consumer re-renders when the value changes, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> does not stop it — I have measured a consumer re-rendering for a field it never reads."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Derive the rule from that cost:</strong> <span style="color:#f0e2c8;">"So it suits values read widely that change rarely — theme, locale, current user. Not form state, not anything animating."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Add the two conventions:</strong> <span style="color:#f0e2c8;">"Memoise the provider value, and split contexts by how often things change rather than by domain."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Context a replacement for Redux?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly — they solve different halves. Context is delivery; Redux is a store with selector subscriptions, middleware, and devtools. Context plus <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer</code> covers a lot of apps, but it cannot subscribe to part of a value, so every consumer re-renders on any change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the default value used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when a consumer has no matching provider anywhere above it. It is not a fallback for <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> — a provider supplying <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> gives you exactly that. Passing <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> as the default and throwing in a custom hook turns a missing provider into a clear error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why memoise the provider value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">value={{ user, theme }}</code> creates a new object every render, and React compares context values by reference — so every consumer re-renders even when nothing changed. With <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> I measured one render across three renders of identical data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many contexts should an app have?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Several small ones rather than one large object, split by how often each value changes. Re-render granularity follows context granularity, so bundling a rarely-changing theme with a frequently-changing value drags the theme consumers along with it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put form state in Context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — every keystroke would re-render every consumer in the subtree. Form state belongs local to the form, or lifted only as far as needed. If a deep field genuinely needs coordination, a form library with subscriptions is the right tool rather than Context.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Context** | A channel delivering a value to any descendant |
| **Provider** | The component supplying the value for its subtree |
| **Consumer** | Any component reading it with <code>useContext</code> |
| **Default value** | Used only when no provider exists above |
| **Transport, not storage** | Context carries a value; something else owns it |

---
**Conclusion:** the Context API delivers a value to every component beneath a provider without threading it through the levels in between. The sentence worth leading with is that it is **transport, not state management** — it stores nothing and updates nothing. Its defining cost is that every consumer re-renders when the value changes, verified as a consumer re-rendering for a field it never read, with <code>memo</code> providing no protection. That single fact decides what belongs in it: values read widely that change rarely, memoised at the provider, and split into several small contexts rather than one large object.`,
    examples: [
      {
        label: "A provider with a memoised value, and a guarded consumer hook",
        runnable: true,
        code: `import { createContext, useContext, useState, useMemo, useCallback, memo } from "react";

// null as the default so a missing provider is detectable rather than silently
// giving every consumer a plausible-looking fallback.
const ThemeContext = createContext(null);

// The custom hook keeps the context object private and turns "rendered outside
// the provider" into a clear error instead of a confusing undefined.
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  // Without useMemo this object is new on every render, so every consumer
  // re-renders even when the theme has not changed.
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

let panelRenders = 0;
const ThemedPanel = memo(function ThemedPanel() {
  panelRenders++;
  const { theme, toggle } = useTheme();
  return (
    <div style={{
      padding: 12, borderRadius: 8,
      background: theme === "dark" ? "#222" : "#f4f4f4",
      color: theme === "dark" ? "#eee" : "#222",
    }}>
      <p style={{ margin: "0 0 8px" }}>
        theme: <strong>{theme}</strong> · panel renders: <strong>{panelRenders}</strong>
      </p>
      <button onClick={toggle}>toggle theme</button>
    </div>
  );
});

// Deliberately rendered OUTSIDE the provider to show the guard firing.
function Unguarded() {
  try {
    useTheme();
    return <p>read the theme</p>;
  } catch (e) {
    return <p style={{ color: "crimson", fontSize: 13 }}>caught: {e.message}</p>;
  }
}

export default function App() {
  const [tick, setTick] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 420 }}>
      <ThemeProvider>
        <ThemedPanel />
      </ThemeProvider>

      <p style={{ marginTop: 12 }}>
        <button onClick={() => setTick((t) => t + 1)}>
          re-render the app ({tick})
        </button>
      </p>

      <Unguarded />

      <p style={{ color: "#666", fontSize: 13 }}>
        Press the app re-render button: the panel counter stays put, because the
        memoised value keeps the same identity. Toggle the theme and it moves.
        The last line shows the custom hook catching a missing provider.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why does updating Context re-render all its consumers, and how do you fix it?",
    seoDescription:
      "Context propagation bypasses memo. Verified: a memo consumer re-rendered for a field it never read; splitting the context dropped it back to one render.",
    description: `**Question presented to candidate:**
"A component reads only \`user\` from a context, but it re-renders every time the theme changes. It is wrapped in \`React.memo\`. Why, and how do you fix it?"

**What a strong answer should cover:**
- React tracks which components read a context and marks **all of them** for re-render when the provider value changes. It does not know which *part* of the value each one read.
- **\`memo\` does not help** — context propagation bypasses the props comparison entirely, because the value did not arrive through props.
- The value is compared **by reference** with \`Object.is\`, so a fresh object literal as the provider value is always a change.
- **Fix 1: memoise the value.** Removes re-renders caused by the provider merely re-rendering.
- **Fix 2: split the context** by change frequency. The only fix for "I read one field and re-render for another".
- **Fix 3: separate state and dispatch contexts.** \`dispatch\` never changes identity, so components that only dispatch never re-render.
- **Fix 4: pass children through.** A provider taking \`children\` does not re-render the subtree it wraps.
- **Fix 5: a store with selectors** — Redux, Zustand, Jotai, or \`useSyncExternalStore\` — when you genuinely need field-level subscriptions.
- The framing: Context has no selector mechanism, and that is the whole problem.

**Clarifying questions expected:**
- "Does the consumer read one field of a larger object, or the whole thing?"
- "How often does the value actually change?"

**Code / implementation expected:** Yes — the split-context fix, ideally with visible render counts.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes Context and memo.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every render count below was measured on React 19.2.8 with <code>memo</code>-wrapped consumers, so an ordinary parent re-render was already blocked — anything that still rendered got through via context.

## 1. Why This Even Matters — A Story First

A mailing list sends one newsletter covering sport, weather, and traffic. You subscribed for the traffic section. Every time the weather changes, the whole newsletter is reissued and lands in your inbox again — you open it, scan it, and find the traffic section unchanged.

Nothing is broken. The list simply has no concept of "sections you care about". It knows who is subscribed, not what they read.

React Context works exactly like that, and the fixes all amount to running more, smaller mailing lists.

## 2. The Core Idea

📌 **Interview term:** React records which components called <code>useContext</code> for a given context. When the provider value changes, it schedules a re-render for **every one of them** — it has no idea which part of the value any consumer actually read.

📌 **Interview term:** context propagation **bypasses <code>React.memo</code>**. <code>memo</code> compares props; a context value does not arrive through props, so there is nothing for it to compare. This is the part that surprises people, and it is the crux of the question.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="One context marks every consumer for re-render while split contexts only wake the relevant one">
  <defs>
    <marker id="cr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One list, or two smaller ones</text>
  <rect class="d-box-muted" x="20" y="48" width="270" height="46" rx="10"/>
  <text class="d-text" x="155" y="76" text-anchor="middle">one context: user plus theme</text>
  <path class="d-edge" d="M 100 100 L 100 140" marker-end="url(#cr-arrow)"/>
  <path class="d-edge" d="M 220 100 L 220 140" marker-end="url(#cr-arrow)"/>
  <rect class="d-box-muted" x="20" y="144" width="120" height="46" rx="8"/>
  <text class="d-sub" x="80" y="172" text-anchor="middle">user: 2 renders</text>
  <rect class="d-box-muted" x="160" y="144" width="130" height="46" rx="8"/>
  <text class="d-sub" x="225" y="172" text-anchor="middle">theme: 2 renders</text>
  <rect class="d-box-accent" x="370" y="48" width="270" height="46" rx="10"/>
  <text class="d-text d-accent" x="505" y="76" text-anchor="middle">two contexts, split apart</text>
  <path class="d-edge-dashed" d="M 450 100 L 450 140" marker-end="url(#cr-arrow)"/>
  <path class="d-edge-accent" d="M 570 100 L 570 140" marker-end="url(#cr-arrow)"/>
  <rect class="d-box-accent" x="370" y="144" width="130" height="46" rx="8"/>
  <text class="d-sub" x="435" y="172" text-anchor="middle">user: 1 render</text>
  <rect class="d-box-accent" x="510" y="144" width="130" height="46" rx="8"/>
  <text class="d-sub" x="575" y="172" text-anchor="middle">theme: 2 renders</text>
</svg>

## 3. Verified: the problem

Two <code>memo</code>-wrapped consumers under one context. Only the **theme** changed:

\`\`\`
user consumer  : 2 renders  <- re-rendered although user never changed
theme consumer : 2 renders
\`\`\`

The user consumer never reads <code>theme</code> and its own data was identical. It re-rendered anyway, and <code>memo</code> did nothing to stop it.

## 4. Verified: splitting the context fixes it

Identical components and an identical change, with <code>user</code> and <code>theme</code> in **two separate contexts**:

\`\`\`
user consumer  : 1 render   <- did NOT re-render
theme consumer : 2 renders
\`\`\`

📌 **Interview term:** this is the only fix that addresses the actual complaint. Memoising the value stops renders caused by the provider merely re-rendering; **splitting** is what stops a consumer re-rendering for a field it never reads. Split by **how often things change**, not by domain.

## 5. Verified: memoise the provider value

A separate failure mode, with a separate fix. An object literal as the value is a new reference every render, so React sees a change even when the data is identical:

\`\`\`jsx
<Ctx.Provider value={{ user, theme }}>   // new object every render
\`\`\`

With <code>useMemo</code>, across three renders of **identical data**:

\`\`\`
consumer with a useMemo-ed value: 1 render over 3 renders of identical data
\`\`\`

📌 **Interview term:** React compares context values with <code>Object.is</code> — a **reference** comparison, never a deep one. Memoising is table stakes; it is not a substitute for splitting.

## 6. The full fix list

| Fix | Solves |
| :--- | :--- |
| <code>useMemo</code> the provider value | Re-renders from the provider merely re-rendering |
| **Split into several contexts** | Consumers re-rendering for fields they do not read |
| Separate state and <code>dispatch</code> contexts | Components that only write never re-render |
| Pass <code>children</code> through the provider | The wrapped subtree does not re-render with the provider |
| A store with selectors | Genuine field-level subscriptions |

📌 **Interview term:** the **state and dispatch split** is the highest-value trick with <code>useReducer</code>. <code>dispatch</code> has a stable identity, so a context carrying only <code>dispatch</code> never changes value — components that merely trigger actions never re-render, no matter how often the state moves.

📌 **Interview term:** when you genuinely need per-field subscriptions, Context is the wrong tool: it has **no selector mechanism**. That is what a store provides, and what <a href="PASTE_USESYNCEXTERNALSTORE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useSyncExternalStore</code></a> exists to integrate.

## 7. Common Pitfalls

- **Reaching for <code>memo</code>.** Verified: it does not block context propagation.
- **Memoising and stopping there.** It fixes a different problem from the one being complained about.
- **One context holding the whole app state.** Change frequency becomes the maximum of everything inside.
- **Splitting by domain instead of by change frequency.** Bundling a constant with a fast-moving value drags the constant along.
- **Recreating the provider value in a parent that re-renders often.** The <code>useMemo</code> is then useless; check its dependencies.
- **Building a selector layer on top of Context.** Past that point you want a store.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the mechanism:</strong> <span style="color:#f0e2c8;">"React knows which components read a context, not which part they read — so a value change marks every consumer for re-render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain the memo surprise:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> compares props, and a context value does not arrive through props — so context propagation goes straight past it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quote the numbers:</strong> <span style="color:#f0e2c8;">"With one context a memo consumer re-rendered for a field it never read. Splitting into two contexts took it from two renders to one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Separate the two fixes:</strong> <span style="color:#f0e2c8;">"Memoising the value fixes renders caused by the provider re-rendering. Splitting fixes reading one field and re-rendering for another. They are different bugs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the root cause:</strong> <span style="color:#f0e2c8;">"Context has no selector mechanism. If I need per-field subscriptions I want a store, not a cleverer Context."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">React.memo</code> not stop it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> only compares props, and the context value never passed through props. React marks context consumers for re-render directly, so the props comparison is irrelevant — I have measured a memo-wrapped consumer re-rendering with no prop change at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is memoising the provider value enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and conflating the two is the common mistake. Memoising stops re-renders caused by the provider re-rendering with identical data. It does nothing when the data genuinely changed — every consumer still re-renders, including ones reading an untouched field. Only splitting fixes that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the state and dispatch split?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two contexts from one <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer</code>: one carrying state, one carrying <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code>. Since <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">dispatch</code> has a stable identity, its context value never changes — so components that only fire actions never re-render however often the state moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does passing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">children</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A provider that renders <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">{children}</code> receives that element from an ancestor that did not re-render, so the subtree keeps its identity and React skips it. That removes renders caused by the provider itself; genuine context consumers below still update, which is what you want.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">At what point do you abandon Context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you find yourself wanting to subscribe to one field of a frequently-changing object. Context has no selector mechanism and adding one on top means reimplementing a store badly — Zustand, Jotai, or Redux already give you that, all built on <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useSyncExternalStore</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Context propagation** | React marking every consumer for re-render |
| **Reference comparison** | <code>Object.is</code> on the value, never a deep compare |
| **Context splitting** | Several small contexts instead of one object |
| **State and dispatch split** | Separating the changing value from the stable setter |
| **Selector subscription** | Re-rendering only for the field a component reads |

---
**Conclusion:** Context re-renders every consumer because React tracks *who reads a context*, not *which part they read* — and that propagation bypasses <code>React.memo</code> entirely, since the value never arrives through props. Verified on React 19.2.8: a memo-wrapped consumer re-rendered for a field it never touched, and splitting the same data into two contexts dropped it from two renders to one. Memoise the provider value as table stakes, split contexts by change frequency to fix the actual complaint, separate <code>dispatch</code> so writers never re-render — and when you truly need per-field subscriptions, accept that Context has no selectors and reach for a store.`,
    examples: [
      {
        label: "One context versus two, with live render counts",
        runnable: true,
        code: `import { createContext, useContext, useState, useMemo, memo } from "react";

const counts = { joinedUser: 0, joinedTheme: 0, splitUser: 0, splitTheme: 0 };

// ── ONE CONTEXT: both values in a single object. ──────────────────────────
const JoinedCtx = createContext(null);

const JoinedUser = memo(function JoinedUser() {
  counts.joinedUser++;
  const { user } = useContext(JoinedCtx);
  return <Line label="reads user only" value={user} renders={counts.joinedUser} />;
});
const JoinedTheme = memo(function JoinedTheme() {
  counts.joinedTheme++;
  const { theme } = useContext(JoinedCtx);
  return <Line label="reads theme" value={theme} renders={counts.joinedTheme} />;
});

function JoinedProvider({ user, theme, children }) {
  const value = useMemo(() => ({ user, theme }), [user, theme]);
  return <JoinedCtx value={value}>{children}</JoinedCtx>;
}

// ── TWO CONTEXTS: split by what changes independently. ────────────────────
const UserCtx = createContext(null);
const ThemeCtx = createContext(null);

const SplitUser = memo(function SplitUser() {
  counts.splitUser++;
  return <Line label="reads user only" value={useContext(UserCtx)} renders={counts.splitUser} />;
});
const SplitTheme = memo(function SplitTheme() {
  counts.splitTheme++;
  return <Line label="reads theme" value={useContext(ThemeCtx)} renders={counts.splitTheme} />;
});

function SplitProvider({ user, theme, children }) {
  return (
    <UserCtx value={user}>
      <ThemeCtx value={theme}>{children}</ThemeCtx>
    </UserCtx>
  );
}

function Line({ label, value, renders }) {
  return (
    <p style={{ margin: "4px 0", fontSize: 14 }}>
      <code style={{ minWidth: 150, display: "inline-block" }}>{label}</code>
      {value} · renders: <strong>{renders}</strong>
    </p>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h4 style={{ margin: "0 0 6px" }}>{title}</h4>
      {children}
    </section>
  );
}

export default function App() {
  const [user] = useState("ada");            // never changes
  const [theme, setTheme] = useState("dark");

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 480 }}>
      <Panel title="One context — both consumers re-render">
        <JoinedProvider user={user} theme={theme}>
          <JoinedUser />
          <JoinedTheme />
        </JoinedProvider>
      </Panel>

      <Panel title="Two contexts — only the theme consumer re-renders">
        <SplitProvider user={user} theme={theme}>
          <SplitUser />
          <SplitTheme />
        </SplitProvider>
      </Panel>

      <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
        change the theme only
      </button>

      <p style={{ color: "#666", fontSize: 13 }}>
        Click a few times. In the first panel the user consumer climbs alongside
        the theme consumer, even though the user never changes and both are
        wrapped in memo. In the second panel it stays at 1.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle forms in React?",
    seoDescription:
      "Controlled keeps the value in state; uncontrolled leaves it in the DOM. Verified: FormData read both fields with no state at all.",
    description: `**Question presented to candidate:**
"Walk me through building a form in React. Controlled or uncontrolled, and how has React 19 changed this?"

**What a strong answer should cover:**
- **Controlled**: the input \`value\` comes from state and every keystroke goes through \`onChange\`. React state is the source of truth.
- **Uncontrolled**: the DOM holds the value; you read it on submit with a ref or \`FormData\`. \`defaultValue\` seeds it.
- Controlled is the default because it enables live validation, conditional enabling, and formatting as you type — at the cost of a re-render per keystroke.
- Uncontrolled is genuinely better for large or simple forms where you only need values at submit time; \`FormData\` reads the whole form with no state at all.
- **React 19 additions**: a function passed to \`<form action>\`, plus \`useActionState\` for the result and pending state, and \`useFormStatus\` for a child to read the parent form's pending state.
- \`useFormStatus\` ships from **\`react-dom\`**, not \`react\`.
- Always give inputs a \`name\` — that is what \`FormData\` and form actions key off.
- For anything non-trivial, a form library (React Hook Form, TanStack Form) exists because validation, arrays, and error handling get repetitive.
- Accessibility: label association, and errors announced rather than only coloured.

**Clarifying questions expected:**
- "Do we need validation as the user types, or only on submit?" — that decides controlled versus uncontrolled.
- "Are we on React 19 with a framework, so form actions are available?"

**Code / implementation expected:** Yes — a controlled field and an uncontrolled form read via \`FormData\`.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes state and events.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The <code>FormData</code> and <code>useActionState</code> results below were produced by submitting real forms on React 19.2.8.

## 1. Why This Even Matters — A Story First

Two ways to take an order in a restaurant. The waiter can write each item down as you say it, reading it back, correcting as you go — they always know the current order. Or they can hand you a paper form, walk away, and collect it when you are done.

Neither is wrong. The first lets you catch "we are out of that" immediately; the second is far less work when the order is long and nothing needs checking until the end.

That is controlled versus uncontrolled, and the choice really is about **when you need to know**.

## 2. The Core Idea

📌 **Interview term: controlled component** — the input <code>value</code> is supplied from React state and every change goes through <code>onChange</code>. React state is the single source of truth; the DOM merely displays it.

📌 **Interview term: uncontrolled component** — the DOM node keeps its own value. You seed it with <code>defaultValue</code> and read it when you need it, via a ref or <code>FormData</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Controlled inputs round-trip through state while uncontrolled inputs keep the value in the DOM">
  <defs>
    <marker id="fm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where the current value lives</text>
  <rect class="d-box-accent" x="24" y="52" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="76" text-anchor="middle">controlled</text>
  <text class="d-sub" x="159" y="96" text-anchor="middle">React state is the truth</text>
  <path class="d-edge-accent" d="M 100 118 L 100 152" marker-end="url(#fm-arrow)"/>
  <path class="d-edge-accent" d="M 220 152 L 220 118" marker-end="url(#fm-arrow)"/>
  <text class="d-sub" x="72" y="140" text-anchor="middle">value</text>
  <text class="d-sub" x="252" y="140" text-anchor="middle">onChange</text>
  <rect class="d-box" x="24" y="156" width="270" height="50" rx="10"/>
  <text class="d-sub" x="159" y="186" text-anchor="middle">the input displays it</text>
  <rect class="d-box-muted" x="366" y="52" width="270" height="60" rx="10"/>
  <text class="d-text" x="501" y="76" text-anchor="middle">uncontrolled</text>
  <text class="d-sub" x="501" y="96" text-anchor="middle">the DOM is the truth</text>
  <path class="d-edge-dashed" d="M 501 118 L 501 152" marker-end="url(#fm-arrow)"/>
  <text class="d-sub" x="565" y="140" text-anchor="middle">read on submit</text>
  <rect class="d-box" x="366" y="156" width="270" height="50" rx="10"/>
  <text class="d-sub" x="501" y="186" text-anchor="middle">FormData or a ref</text>
</svg>

## 3. Verified: an uncontrolled form needs no state at all

A form with two <code>defaultValue</code> inputs and no <code>useState</code> anywhere, submitted and read through <code>FormData</code>:

\`\`\`
FormData captured: {"email":"ada@example.com","role":"engineer"}
\`\`\`

📌 **Interview term:** <code>new FormData(event.target)</code> reads every named field in one call, and <code>Object.fromEntries</code> turns it into a plain object. This is why "uncontrolled means more work" is outdated — for a form you only read on submit, it is *less* code than controlled, and it re-renders zero times while typing.

The one requirement: every input needs a <code>name</code>. <code>FormData</code> and form actions both key off it.

## 4. Choosing between them

| | Controlled | Uncontrolled |
| :--- | :--- | :--- |
| Source of truth | React state | The DOM |
| Re-renders while typing | One per keystroke | None |
| Live validation | Natural | Awkward |
| Disable submit until valid | Natural | Awkward |
| Format as you type | Natural | Awkward |
| Reading many fields at submit | Verbose | One <code>FormData</code> call |
| File inputs | Not possible | Required |

📌 **Interview term:** file inputs are **always uncontrolled** — their value cannot be set programmatically, for security reasons. Knowing that exception is a small, precise signal.

## 5. React 19: form actions

📌 **Interview term: form action** — passing a **function** to <code>&lt;form action&gt;</code>. React calls it with the <code>FormData</code>, resets the form on success, and manages pending state. It works with plain client functions as well as Server Actions.

<code>useActionState</code> wraps that up: it returns the last result, the action to pass to the form, and a pending flag.

### Verified

\`\`\`jsx
const [result, formAction, isPending] = useActionState(
  async (prev, formData) => "saved: " + formData.get("name"),
  "not submitted",
);
\`\`\`

\`\`\`
before submit: "not submitted"
after submit:  "saved: Grace"
\`\`\`

No <code>onSubmit</code>, no <code>preventDefault</code>, no manual loading state.

📌 **Interview term:** <code>useFormStatus</code> lets a **child** component — a submit button, typically — read the enclosing form pending state without prop threading. It ships from <code>react-dom</code>, **not** <code>react</code>, because it reads the state of a real DOM form. That import path is a favourite interview detail.

## 6. When to reach for a library

Validation rules, per-field errors, dynamic arrays of fields, cross-field constraints, and dirty tracking are repetitive to hand-roll. React Hook Form is the common choice precisely because it keeps inputs **uncontrolled** and subscribes per field, so typing does not re-render the whole form. TanStack Form is the newer alternative.

Not needed for a login form. Very much needed for a checkout.

## 7. Common Pitfalls

- **Switching an input from uncontrolled to controlled.** Passing <code>value={undefined}</code> then a string triggers a React warning; use <code>value={x ?? ""}</code>.
- **Forgetting <code>name</code>.** <code>FormData</code> and form actions silently skip unnamed fields.
- **Omitting <code>preventDefault</code>** in a classic <code>onSubmit</code> handler — the page reloads. Form actions do not need it.
- **One <code>onChange</code> per field with duplicated logic.** Use the field <code>name</code> to write a single generic handler.
- **Storing the whole form in Context.** Every keystroke re-renders every consumer.
- **Importing <code>useFormStatus</code> from <code>react</code>.** It is in <code>react-dom</code>.
- **Colour-only error indication.** Associate errors with <code>aria-describedby</code> so they are announced.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define both in one breath:</strong> <span style="color:#f0e2c8;">"Controlled means the value lives in React state and every keystroke goes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>. Uncontrolled leaves it in the DOM and you read it on submit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the deciding question:</strong> <span style="color:#f0e2c8;">"Do I need to know the value <em style="color:#ffe0b2;">as they type</em>? Live validation or formatting means controlled. Only at submit means uncontrolled — and that re-renders zero times."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show the modern uncontrolled read:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.fromEntries(new FormData(e.target))</code> reads the whole form in one line, with no state at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bring in React 19:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;form action={fn}&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code> gives you the result and a pending flag with no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onSubmit</code> and no manual loading state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the import detail:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFormStatus</code> comes from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code> — most people guess wrong."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is controlled always the right default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the common default, but not automatically right. For a large form you only read on submit, uncontrolled plus <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">FormData</code> is less code and re-renders nothing while typing. Controlled earns its cost when you need live validation, formatting, or to disable submit until valid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you get an uncontrolled-to-controlled warning?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the input first rendered with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">value={undefined}</code> — so React treated it as uncontrolled — and later received a real string. Usually state initialised from data that arrives asynchronously. Fix it with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">value={x ?? ""}</code> so it is controlled from the first render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which package exports <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFormStatus</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>. It reads the pending state of a real DOM form, so it belongs to the DOM renderer rather than the core. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code>, by contrast, is in <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a file input be controlled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Browsers do not let script set a file input value, for obvious security reasons — otherwise a page could make you upload an arbitrary file. File inputs are always uncontrolled; you read <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">files</code> from a ref or from <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">FormData</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you add a form library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once there is real validation, per-field errors, dynamic field arrays, or cross-field rules — all repetitive to hand-roll. React Hook Form keeps inputs uncontrolled and subscribes per field, so a large form does not re-render on every keystroke. Overkill for a login form.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Controlled** | Value in React state, updated through <code>onChange</code> |
| **Uncontrolled** | Value in the DOM, read when needed |
| **<code>FormData</code>** | Reads every named field of a form in one call |
| **Form action** | A function passed to <code>&lt;form action&gt;</code> in React 19 |
| **<code>useActionState</code>** | Result plus pending state for a form action |
| **<code>useFormStatus</code>** | A child reading the parent form pending state, from <code>react-dom</code> |

---
**Conclusion:** controlled inputs keep the value in React state and re-render on every keystroke, which buys live validation and formatting; uncontrolled inputs leave it in the DOM and cost nothing until submit. Verified here, an uncontrolled form with no <code>useState</code> anywhere yielded both fields through one <code>FormData</code> call — which is why the old "uncontrolled is more work" framing no longer holds. React 19 adds form actions plus <code>useActionState</code>, verified taking a form from "not submitted" to "saved: Grace" with no <code>onSubmit</code> and no manual pending state, and <code>useFormStatus</code> — from <code>react-dom</code>, not <code>react</code>.`,
    examples: [
      {
        label: "Controlled with live validation, uncontrolled via FormData, and a React 19 action",
        runnable: true,
        code: `import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";   // note: react-dom, not react

// ── CONTROLLED: state is the truth, so validation can run as you type. ─────
function ControlledField() {
  const [email, setEmail] = useState("");
  const valid = /.+@.+\\..+/.test(email);

  return (
    <div>
      <label htmlFor="c-email">Email (controlled): </label>
      <input
        id="c-email"
        value={email}                                  // value comes FROM state
        onChange={(e) => setEmail(e.target.value)}     // every keystroke goes back
        aria-invalid={email !== "" && !valid}
        aria-describedby="c-email-err"
      />
      <button disabled={!valid}>submit</button>
      <p id="c-email-err" style={{ fontSize: 13, color: valid ? "#161" : "#a33", margin: "4px 0" }}>
        {email === "" ? "type to see live validation" : valid ? "looks valid" : "not a valid email"}
      </p>
    </div>
  );
}

// ── UNCONTROLLED: no state at all. FormData reads every named field. ───────
function UncontrolledForm() {
  const [captured, setCaptured] = useState(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();                            // classic handlers need this
        setCaptured(Object.fromEntries(new FormData(e.target)));
      }}
    >
      {/* name is required — FormData keys off it */}
      <input name="email" defaultValue="ada@example.com" />{" "}
      <input name="role" defaultValue="engineer" />{" "}
      <button type="submit">read with FormData</button>
      {captured && (
        <pre style={{ fontSize: 12, background: "#f6f6f6", padding: 8, borderRadius: 6 }}>
          {JSON.stringify(captured, null, 2)}
        </pre>
      )}
    </form>
  );
}

// ── REACT 19: a form action. No onSubmit, no preventDefault, no loading state.
function SubmitButton() {
  // Reads the ENCLOSING form's pending state — no prop threading.
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "saving…" : "save"}</button>;
}

function ActionForm() {
  const [result, formAction, isPending] = useActionState(
    async (previous, formData) => {
      await new Promise((r) => setTimeout(r, 600));    // pretend network
      return "saved: " + formData.get("name");
    },
    "not submitted",
  );

  return (
    <form action={formAction}>
      <input name="name" defaultValue="Grace" />{" "}
      <SubmitButton />
      <p style={{ fontSize: 13, margin: "4px 0", color: isPending ? "#666" : "#161" }}>
        {isPending ? "pending…" : result}
      </p>
    </form>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 500 }}>
      <Panel title="Controlled — re-renders per keystroke, validates live">
        <ControlledField />
      </Panel>
      <Panel title="Uncontrolled — zero state, read once on submit">
        <UncontrolledForm />
      </Panel>
      <Panel title="React 19 form action — pending state handled for you">
        <ActionForm />
      </Panel>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you manage global state in a large React application?",
    seoDescription:
      "Split server state from client state first. Most of what looks global is cached server data, which belongs in a query library rather than a store.",
    description: `**Question presented to candidate:**
"How would you approach state management for a large React app? Walk me through the decision."

**What a strong answer should cover:**
- **The reframe that answers the question: separate server state from client state.** Most of what people put in a global store is cached server data — it needs fetching, deduplication, invalidation and staleness rules, not storage.
- Once server state is handled by a query library, the genuinely global client state left over is usually small: theme, auth session, a cart, UI preferences.
- The ladder: local state → lifted state → composition → Context → a store, adopting each only when the previous one stops working.
- **Context is transport, not a store** — no selectors, so every consumer re-renders.
- What a store adds that Context cannot: **selector-based subscriptions**, so a component re-renders only for the slice it reads.
- The realistic options and what distinguishes them: Redux Toolkit (conventions, devtools, large teams), Zustand (minimal, hook-based), Jotai (atomic, bottom-up), and \`useSyncExternalStore\` as the primitive they are all built on.
- **URL state** is the forgotten category — filters, tabs, and pagination usually belong in the query string, where they are shareable and survive a refresh.
- Anti-pattern: one giant store holding everything, which makes change frequency the maximum of everything in it.

**Clarifying questions expected:**
- "How much of this is server data versus genuinely client-only state?"
- "How large is the team — do we need enforced conventions and devtools?"
- "Does any of it belong in the URL?"

**Code / implementation expected:** Optional. A small store with a selector demonstrates the point that Context cannot.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes Context and hooks.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This is a judgement question, so it leans on the measured Context behaviour from <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">why Context re-renders every consumer</a> rather than introducing new measurements.

## 1. Why This Even Matters — A Story First

A company decides it needs one central filing room for everything. Into it go the employee handbook, today's stock levels, and the current temperature in the warehouse. Within a month the room is chaos — not because filing is wrong, but because three completely different kinds of information were treated as one problem. The handbook changes yearly. Stock changes hourly and is really a copy of what the warehouse system already knows. The temperature is a live reading that should never have been filed at all.

Most "global state is a mess" stories are that story. The fix starts by **noticing the categories**, not by picking a better filing cabinet.

## 2. The Core Idea

📌 **Interview term: server state** — data that lives on a server and is only **cached** in the browser. It can go stale, another user can change it, and two components asking for it should share one request.

📌 **Interview term: client state** — data that exists only in the browser and has no authority elsewhere: which modal is open, the current theme, a draft not yet submitted.

They have almost nothing in common. Server state needs fetching, deduplication, invalidation, refetching, and staleness rules. Client state needs none of that — it just needs to be stored somewhere and read.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Global state splits into server state, client state and URL state, each with a different tool">
  <text class="d-text" x="330" y="24" text-anchor="middle">Three categories, three different tools</text>
  <rect class="d-box-accent" x="16" y="48" width="200" height="80" rx="10"/>
  <text class="d-text d-accent" x="116" y="74" text-anchor="middle">server state</text>
  <text class="d-sub" x="116" y="96" text-anchor="middle">a cache of remote data</text>
  <text class="d-sub" x="116" y="116" text-anchor="middle">TanStack Query, SWR</text>
  <rect class="d-box-accent" x="230" y="48" width="200" height="80" rx="10"/>
  <text class="d-text d-accent" x="330" y="74" text-anchor="middle">client state</text>
  <text class="d-sub" x="330" y="96" text-anchor="middle">only exists in the browser</text>
  <text class="d-sub" x="330" y="116" text-anchor="middle">state, Context, a store</text>
  <rect class="d-box-accent" x="444" y="48" width="200" height="80" rx="10"/>
  <text class="d-text d-accent" x="544" y="74" text-anchor="middle">URL state</text>
  <text class="d-sub" x="544" y="96" text-anchor="middle">filters, tabs, pagination</text>
  <text class="d-sub" x="544" y="116" text-anchor="middle">the query string</text>
  <rect class="d-box-muted" x="130" y="156" width="400" height="56" rx="10"/>
  <text class="d-text" x="330" y="180" text-anchor="middle">what is genuinely left over</text>
  <text class="d-sub" x="330" y="200" text-anchor="middle">usually much smaller than expected</text>
</svg>

## 3. Step one: take server state out of the question

This is the highest-leverage move and the thing a strong answer leads with. A query library handles the request **and** everything around it: deduplicating identical requests, caching with staleness rules, refetching on focus or reconnect, retrying, and invalidating after a mutation.

Put that data in a hand-rolled store and you are reimplementing a cache — usually badly, and usually discovering the requirements one bug at a time. See <a href="PASTE_DATA_FETCHING_URL_HERE" target="_blank" rel="noopener noreferrer">fetching data in React</a>.

## 4. Step two: put what belongs in the URL, in the URL

📌 **Interview term: URL state** — filters, sort order, the active tab, pagination, a search query. Storing these in a store makes them unshareable and lost on refresh; putting them in the query string makes the page linkable, bookmarkable, and back-button-correct for free.

This category is routinely forgotten, and mentioning it unprompted is a strong signal.

## 5. Step three: the ladder for what remains

1. **Local state** — most of it. Colocate.
2. **Lifted state** — shared by a few nearby components. See <a href="PASTE_LIFTING_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">lifting state up</a>.
3. **Composition** — often removes the need to share at all.
4. **<a href="PASTE_CONTEXT_URL_HERE" target="_blank" rel="noopener noreferrer">Context</a>** — read widely, changes rarely: theme, locale, session.
5. **A store** — genuinely app-wide, changes often, read by many components that each care about a different slice.

📌 **Interview term:** the one thing a store gives you that Context cannot is **selector-based subscriptions**. Context has no selector mechanism, so every consumer re-renders on any change — measured elsewhere in this collection as a consumer re-rendering for a field it never read. A store lets a component subscribe to one slice.

## 6. The options, and what actually distinguishes them

| Tool | Distinguishing feature | Suits |
| :--- | :--- | :--- |
| **Redux Toolkit** | Conventions, devtools, time-travel debugging | Large teams wanting enforced structure |
| **Zustand** | A hook-based store in very little code | Most apps needing a store at all |
| **Jotai** | Atomic, bottom-up composition of small pieces | Fine-grained, derived state |
| **<code>useSyncExternalStore</code>** | The React primitive the others build on | Integrating your own store |
| **Context + <code>useReducer</code>** | No dependency | Small apps, infrequent changes |

📌 **Interview term:** all of the above are built on <a href="PASTE_USESYNCEXTERNALSTORE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useSyncExternalStore</code></a>, which is how they read external state safely under concurrent rendering. Naming that connection shows you understand the layer rather than just the brands.

## 7. Common Pitfalls

- **Putting server data in a client store by hand.** The single most common source of state-management pain.
- **Reaching for a store first.** Most state is local; a store for a modal flag is overkill.
- **One giant store object.** Change frequency becomes the maximum of everything inside it.
- **Using Context as a store.** No selectors, so every consumer re-renders.
- **Forgetting URL state.** Filters in a store are unshareable and lost on refresh.
- **Choosing by popularity.** Pick for the property you need — devtools, selectors, atomicity.
- **Normalising everything upfront.** Deep normalisation is a real cost; do it when relationships demand it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe before choosing a tool:</strong> <span style="color:#f0e2c8;">"First I separate server state from client state. Most of what looks global is cached server data, and that is a caching problem, not a storage one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Note how much that removes:</strong> <span style="color:#f0e2c8;">"Once TanStack Query or SWR owns that, the genuinely global client state left is usually small — session, theme, maybe a cart."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention URL state unprompted:</strong> <span style="color:#f0e2c8;">"Filters, tabs and pagination belong in the query string — shareable, bookmarkable, and correct with the back button."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the ladder:</strong> <span style="color:#f0e2c8;">"Local, lifted, composition, Context, then a store — each only when the previous one stops working."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say precisely what a store buys:</strong> <span style="color:#f0e2c8;">"Selector subscriptions. Context has no selectors, so every consumer re-renders on any change — that is the specific reason to graduate."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Redux or Zustand?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Redux Toolkit when a large team benefits from enforced conventions and the devtools with time-travel debugging. Zustand when I want a store without ceremony — it is a hook and a few lines. Both give selector subscriptions, which is the actual reason to use either.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Context plus <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useReducer</code> enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a small app with infrequent changes, yes — and it adds no dependency. It stops being enough when many components read different slices of a frequently-changing value, because Context has no selectors and re-renders all of them. Splitting the state and dispatch contexts buys you some headroom first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why should server data not go in Redux?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because you immediately need everything a store does not provide: deduplicating identical requests, staleness rules, refetching on focus, retries, and invalidation after a mutation. You end up writing a cache inside a store. A query library is that cache, already built and tested.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What belongs in the URL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anything a user would reasonably want to share or return to: filters, sort order, the active tab, the page number, a search query. Put it in a store and the link no longer describes the page, refresh loses it, and the back button does the wrong thing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do these libraries have anything in common underneath?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — they all read their state through <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useSyncExternalStore</code>. That hook exists precisely so a store outside React can be read consistently under concurrent rendering, which is what made them all safe on React 18 and later.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server state** | Remote data cached locally; can go stale |
| **Client state** | Data that only exists in the browser |
| **URL state** | State encoded in the query string |
| **Selector subscription** | Re-rendering only for the slice you read |
| **Normalisation** | Storing entities by id rather than nested |

---
**Conclusion:** the answer to global state management is a categorisation before it is a library. Separate server state — which is a cache needing deduplication, staleness and invalidation, so it belongs in a query library — from client state, and put filters, tabs and pagination in the URL where they are shareable. What genuinely remains is usually small, and the ladder is local, lifted, composition, Context, then a store. Graduate to a store for one specific reason: selector-based subscriptions, which Context cannot provide because it has no selector mechanism at all.`,
    examples: [
      {
        label: "A 20-line store with selectors, next to the Context version",
        runnable: true,
        code: `import { useSyncExternalStore, createContext, useContext, useState, useMemo, memo } from "react";

// ── A minimal store. This is roughly what Zustand is, minus the ergonomics.
//    The important part is selector-based subscription. ─────────────────────
function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

const store = createStore({ user: "ada", theme: "dark" });

// The selector is what Context cannot do: this component re-renders ONLY when
// the slice it selected actually changes.
function useStore(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

const counts = { storeUser: 0, ctxUser: 0 };

const StoreUser = memo(function StoreUser() {
  counts.storeUser++;
  const user = useStore((s) => s.user);       // subscribes to user only
  return <Line label="store + selector" value={user} n={counts.storeUser} />;
});

// ── The Context equivalent, for contrast. ─────────────────────────────────
const Ctx = createContext(null);

const CtxUser = memo(function CtxUser() {
  counts.ctxUser++;
  const { user } = useContext(Ctx);           // no way to subscribe to just user
  return <Line label="context" value={user} n={counts.ctxUser} />;
});

function Line({ label, value, n }) {
  return (
    <p style={{ margin: "4px 0", fontSize: 14 }}>
      <code style={{ display: "inline-block", minWidth: 150 }}>{label}</code>
      user: <strong>{value}</strong> · renders: <strong>{n}</strong>
    </p>
  );
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const ctxValue = useMemo(() => ({ user: "ada", theme }), [theme]);

  const changeTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    store.setState({ theme: next });           // change ONLY the theme slice
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 460 }}>
      <StoreUser />
      <Ctx value={ctxValue}><CtxUser /></Ctx>

      <p><button onClick={changeTheme}>change the theme only (now {theme})</button></p>

      <p style={{ color: "#666", fontSize: 13 }}>
        Click repeatedly. Neither component reads the theme. The store-backed one
        stays at 1 render because its selector returned the same user each time;
        the Context one climbs, because Context has no selectors and notifies
        every consumer on any change.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What changed with Context in React 19 (`<Context>` as a provider)?",
    seoDescription:
      "Render the context itself as the provider. Verified: Context.Provider === Context is true, and the old .Provider syntax still works.",
    description: `**Question presented to candidate:**
"React 19 changed the Context syntax. What changed, and does existing code still work?"

**What a strong answer should cover:**
- You can now render the context object **itself** as the provider: \`<ThemeContext value={x}>\` instead of \`<ThemeContext.Provider value={x}>\`.
- **\`Context.Provider\` still works** — this is additive, not a breaking change, and existing code needs no migration.
- The implementation detail worth knowing: \`Context.Provider === Context\` is now **true**, which is why both syntaxes render identically.
- **\`Context.Consumer\` is deprecated** in favour of \`useContext\`, though it still exists. The render-prop consumer predates hooks.
- Nothing about the **behaviour** changed: consumers still all re-render on a value change, the default value still applies only when there is no provider, and there is still no selector mechanism.
- Related React 19 context change: \`use(Context)\` can read a context **conditionally**, because \`use\` allocates no hook slot — unlike \`useContext\`, which obeys the Rules of Hooks.
- Migration: cosmetic. A codemod exists; there is no urgency.

**Clarifying questions expected:**
- "Are we on React 19 across the whole codebase, or is this a shared library that must support 18?"

**Code / implementation expected:** Yes — both syntaxes side by side, plus the conditional \`use(Context)\` read.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes the Context API.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below — including whether the old syntax still works and what <code>Context.Provider</code> now *is* — was produced by running the code on React 19.2.8 rather than read from a changelog.

## 1. Why This Even Matters — A Story First

For years you addressed letters to "The Reception Desk, care of the Smith Building". React 19 noticed that the building only ever had one reception desk, and let you write "The Smith Building". The letter arrives in exactly the same place. The old address still works — the post office kept the alias.

It is a small change. What makes it a reasonable interview question is what it reveals: whether you know it is **purely syntactic**, and whether you can say what did *not* change.

## 2. The Core Idea

📌 **Interview term:** in React 19 a context object can be rendered **as its own provider**:

\`\`\`jsx
const ThemeContext = createContext("light");

// React 19
<ThemeContext value="dark">
  <App />
</ThemeContext>

// Still works, unchanged
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Both provider syntaxes reach the same consumers because the provider is the context itself">
  <defs>
    <marker id="c19-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two spellings, one thing</text>
  <rect class="d-box-accent" x="24" y="50" width="240" height="50" rx="10"/>
  <text class="d-text d-accent" x="144" y="80" text-anchor="middle">Ctx value=dark</text>
  <rect class="d-box-muted" x="24" y="118" width="240" height="50" rx="10"/>
  <text class="d-text" x="144" y="148" text-anchor="middle">Ctx.Provider value=dark</text>
  <path class="d-edge-accent" d="M 270 75 L 350 100" marker-end="url(#c19-arrow)"/>
  <path class="d-edge" d="M 270 143 L 350 118" marker-end="url(#c19-arrow)"/>
  <rect class="d-box-accent" x="356" y="84" width="280" height="50" rx="10"/>
  <text class="d-text d-accent" x="496" y="106" text-anchor="middle">the same provider</text>
  <text class="d-sub" x="496" y="124" text-anchor="middle">Ctx.Provider === Ctx</text>
</svg>

## 3. Verified: both work, and why

\`\`\`
using <Ctx value=...>       -> "new style"
using <Ctx.Provider ...>    -> "old style"   (still supported)
with no provider at all     -> "default value"
\`\`\`

And the reason both render identically:

\`\`\`
Ctx.Provider === Ctx ?  true
has Consumer:           true
\`\`\`

📌 **Interview term:** <code>Context.Provider</code> **is** the context object in React 19 — the property points back at the context itself. That is the whole implementation of the change, and it is why the old syntax could be kept working with no compatibility layer. Saying this explains the change rather than merely reporting it.

<code>Context.Consumer</code> still exists but is **deprecated**. It was the pre-hooks render-prop way to read a context and has no reason to appear in new code.

## 4. What did *not* change

This is the more valuable half of the answer, because the behaviour is what actually affects your app:

| Behaviour | Status in React 19 |
| :--- | :--- |
| Every consumer re-renders on a value change | **Unchanged** |
| <code>memo</code> does not block context propagation | **Unchanged** |
| Values compared by reference with <code>Object.is</code> | **Unchanged** |
| Default value applies only with no provider | **Unchanged** |
| No selector mechanism | **Unchanged** |
| <code>useContext</code> | Unchanged, still the way to read |

📌 **Interview term:** this is cosmetic. If your context was causing re-render problems before React 19, it still is — see <a href="PASTE_CONTEXT_RERENDER_URL_HERE" target="_blank" rel="noopener noreferrer">why updating Context re-renders all consumers</a>, where a memo-wrapped consumer still re-rendered for a field it never read.

## 5. The related change that matters more: <code>use(Context)</code>

React 19 also lets you read a context with <code>use</code>:

\`\`\`jsx
function Panel({ compact }) {
  if (compact) {
    const theme = use(ThemeContext);   // legal — inside a condition
    return <Small theme={theme} />;
  }
  return <Full />;
}
\`\`\`

📌 **Interview term:** <code>use</code> may be called **conditionally and inside loops**, unlike <code>useContext</code>. It is not a hook in the state sense — it allocates **no slot** on the fiber, so there is no call-order mapping to corrupt. See <a href="PASTE_RULES_OF_HOOKS_URL_HERE" target="_blank" rel="noopener noreferrer">the mechanism behind the Rules of Hooks</a> for why that exemption is principled rather than arbitrary.

That is a genuine capability change, where the provider syntax is only a spelling change — a good thing to point out when asked "what changed with Context".

## 6. Common Pitfalls

- **Believing <code>.Provider</code> was removed.** Verified: it still works, and no warning is emitted.
- **Thinking the re-render behaviour improved.** It did not. Nothing about propagation changed.
- **Migrating a library that supports React 18.** The bare-context syntax does not exist there.
- **Reaching for <code>Context.Consumer</code>.** Deprecated; use <code>useContext</code> or <code>use</code>.
- **Assuming <code>use</code> replaces <code>useContext</code> everywhere.** For an unconditional read at the top of a component, <code>useContext</code> is clearer and more conventional.
- **Expecting a codemod to be urgent.** It is a cosmetic cleanup.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the change in one line:</strong> <span style="color:#f0e2c8;">"You can render the context itself as the provider — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ThemeContext value={x}&gt;</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ThemeContext.Provider&gt;</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain it rather than reporting it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Context.Provider === Context</code> is now true — the property points back at the context — which is why both spellings render identically."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Confirm it is additive:</strong> <span style="color:#f0e2c8;">"The old syntax still works with no warning, so nothing needs migrating — and a library supporting React 18 has to keep it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say what did NOT change — this is the valuable half:</strong> <span style="color:#f0e2c8;">"Every consumer still re-renders on a value change, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> still does not block it, and there is still no selector mechanism."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Point at the bigger change:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use(Context)</code> can read a context conditionally, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> allocates no hook slot. That is a real capability change; the provider syntax is a spelling change."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Was <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Context.Provider</code> removed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it still works and emits no warning. In fact <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Context.Provider === Context</code> is now true, so the old spelling resolves to the same object as the new one. Purely additive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did the re-render behaviour improve?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not at all. Every consumer still re-renders when the provider value changes, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> still does not stop it, and there is still no way to subscribe to part of a value. If Context was a performance problem for you before, it is an identical one now.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Context.Consumer</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Deprecated, though still present. It was the render-prop way to read a context before hooks existed, and it produced the nesting that <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useContext</code> removed. New code should use <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useContext</code>, or <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> when the read must be conditional.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">use(Context)</code> be called conditionally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it allocates no state slot on the fiber. The Rules of Hooks exist because React maps hooks to stored state by call order — <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> stores nothing, so there is no ordering to corrupt. That is why it is documented as an exception rather than an inconsistency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you migrate existing providers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only opportunistically. It is cosmetic, a codemod exists, and the old form is not going anywhere soon. I would leave it alone in any package that still needs to support React 18, where the new spelling simply does not exist.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Context as provider** | Rendering the context object directly, React 19 |
| **<code>Context.Provider</code>** | The old spelling; now the same object as the context |
| **<code>Context.Consumer</code>** | The deprecated render-prop reader |
| **<code>use(Context)</code>** | Reads a context, and may be called conditionally |
| **Additive change** | New syntax with the old one still supported |

---
**Conclusion:** React 19 lets you render a context object directly as its own provider, and the reason both spellings work is concrete — verified, <code>Context.Provider === Context</code> is now true, so the old property simply points back at the context. It is additive: the old syntax still works and emits no warning. The half of the answer that matters more is what did **not** change — every consumer still re-renders on a value change, <code>memo</code> still cannot block it, and there is still no selector mechanism. The genuinely new capability is <code>use(Context)</code>, which may be read conditionally because it allocates no hook slot.`,
    examples: [
      {
        label: "Both provider syntaxes, and a conditional read with use()",
        runnable: true,
        code: `import { createContext, useContext, use, useState } from "react";

const ThemeContext = createContext("default (no provider)");

// The React 19 implementation detail that makes both spellings work.
const providerIsContext = ThemeContext.Provider === ThemeContext;

function ReaderWithUseContext() {
  // useContext obeys the Rules of Hooks: unconditional, top level.
  const theme = useContext(ThemeContext);
  return <Line label="useContext" value={theme} />;
}

function ReaderWithUse({ skip }) {
  // use() may be called CONDITIONALLY — it allocates no hook slot, so there is
  // no call-order mapping to corrupt. useContext here would be illegal.
  if (skip) return <Line label="use() — skipped" value="did not read" />;
  const theme = use(ThemeContext);
  return <Line label="use() — read" value={theme} />;
}

function Line({ label, value }) {
  return (
    <p style={{ margin: "4px 0", fontSize: 14 }}>
      <code style={{ display: "inline-block", minWidth: 150 }}>{label}</code>
      {value}
    </p>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <h4 style={{ margin: "0 0 6px" }}>{title}</h4>
      {children}
    </section>
  );
}

export default function App() {
  const [skip, setSkip] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 470 }}>
      <p style={{ background: "#eef6ff", padding: 10, borderRadius: 6, fontSize: 14 }}>
        <code>ThemeContext.Provider === ThemeContext</code> is{" "}
        <strong>{String(providerIsContext)}</strong> — which is why both spellings
        below render identically.
      </p>

      {/* React 19: the context itself is the provider */}
      <ThemeContext value="dark (new syntax)">
        <Panel title="New: <ThemeContext value=...>">
          <ReaderWithUseContext />
        </Panel>
      </ThemeContext>

      {/* Still fully supported, no warning */}
      <ThemeContext.Provider value="light (old syntax)">
        <Panel title="Old: <ThemeContext.Provider value=...>">
          <ReaderWithUseContext />
        </Panel>
      </ThemeContext.Provider>

      {/* No provider at all — the default applies */}
      <Panel title="No provider — the createContext default">
        <ReaderWithUseContext />
      </Panel>

      <ThemeContext value="read conditionally">
        <Panel title="use() inside a condition">
          <ReaderWithUse skip={skip} />
          <button onClick={() => setSkip((s) => !s)}>
            {skip ? "read the context" : "skip the read"}
          </button>
        </Panel>
      </ThemeContext>

      <p style={{ color: "#666", fontSize: 13 }}>
        The last panel returns before calling use() when skipping — legal,
        because use() stores nothing on the fiber. Doing that with useContext
        would throw a Rules of Hooks error.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What problem does `useSyncExternalStore` solve?",
    seoDescription:
      "It reads state React does not own, safely. Verified: two independent readers both updated from one external store the moment it changed.",
    description: `**Question presented to candidate:**
"What is \`useSyncExternalStore\` for, and when would you actually reach for it?"

**What a strong answer should cover:**
- It is the official way to **subscribe to state that lives outside React** — a module store, a browser API, a websocket cache — and read it safely during rendering.
- Two problems it solves at once: **staleness** (React never learns a plain variable changed) and **tearing** (an interruptible render reading a mutable value at two different moments).
- The three arguments: \`subscribe\`, \`getSnapshot\`, and \`getServerSnapshot\` for SSR.
- **\`getSnapshot\` must return a cached value** — a fresh object each call is an infinite loop, with React warning that the result should be cached.
- **\`subscribe\` must be stable**, or React resubscribes on every render.
- The deliberate cost: updates from an external store are **synchronous and non-interruptible**, which is the price of consistency.
- **You rarely write it directly** — Redux, Zustand, and Jotai all call it internally. You reach for it when integrating a store or browser API yourself.
- Genuine direct uses: \`matchMedia\`, \`navigator.onLine\`, \`localStorage\` sync across tabs, and a third-party non-React library.
- Before React 18, libraries hand-rolled this and could tear under concurrent rendering.

**Clarifying questions expected:**
- "Is the state actually outside React, or could it just be React state lifted up?"
- "Is this server-rendered?" — that decides whether \`getServerSnapshot\` is mandatory.

**Code / implementation expected:** Yes — a small store with a correctly cached snapshot, and a browser-API subscription.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes hooks and rendering basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The multi-reader result in section 3 was measured on React 19.2.8; the failure modes in section 5 were verified separately and are quoted from <a href="PASTE_TEARING_URL_HERE" target="_blank" rel="noopener noreferrer">tearing in concurrent React</a>, which covers the consistency argument in depth.

## 1. Why This Even Matters — A Story First

React keeps its own accounts. Anything in <code>useState</code>, it wrote down itself, so it knows the instant it changes and it knows what every render should see.

Now put a value in a shared ledger down the corridor that anyone can edit. React has no idea when someone writes in it. Worse, if React is halfway through preparing a report and pauses, the ledger may have changed by the time it resumes — so the first half of the report and the second half disagree.

<code>useSyncExternalStore</code> is the arrangement that fixes both: tell me when the ledger changes, and let me re-check it before I publish.

## 2. The Core Idea

📌 **Interview term: external store** — mutable state that lives **outside React**: a module-level variable, a Redux store, <code>localStorage</code>, <code>navigator.onLine</code>, a websocket cache. React neither owns nor observes it.

📌 **Interview term:** <code>useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)</code> subscribes to such a store, reads a snapshot, and — critically — **re-checks the snapshot before committing**. If it changed mid-render, React discards the work and re-renders synchronously so the whole tree agrees.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="The hook subscribes to a store, reads a snapshot, and re-checks it before committing">
  <defs>
    <marker id="ses-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two jobs: notice the change, and stay consistent</text>
  <rect class="d-box-muted" x="24" y="60" width="170" height="76" rx="10"/>
  <text class="d-text" x="109" y="88" text-anchor="middle">external store</text>
  <text class="d-sub" x="109" y="110" text-anchor="middle">outside React</text>
  <text class="d-sub" x="109" y="128" text-anchor="middle">mutable</text>
  <path class="d-edge" d="M 200 98 L 228 98" marker-end="url(#ses-arrow)"/>
  <text class="d-sub" x="214" y="86" text-anchor="middle">subscribe</text>
  <rect class="d-box-accent" x="234" y="60" width="190" height="76" rx="10"/>
  <text class="d-text d-accent" x="329" y="88" text-anchor="middle">useSyncExternalStore</text>
  <text class="d-sub" x="329" y="110" text-anchor="middle">reads a snapshot</text>
  <text class="d-sub" x="329" y="128" text-anchor="middle">re-checks before commit</text>
  <path class="d-edge-accent" d="M 430 98 L 458 98" marker-end="url(#ses-arrow)"/>
  <rect class="d-box-accent" x="464" y="60" width="176" height="76" rx="10"/>
  <text class="d-text d-accent" x="552" y="88" text-anchor="middle">consistent render</text>
  <text class="d-sub" x="552" y="110" text-anchor="middle">every consumer agrees</text>
  <text class="d-sub" x="552" y="128" text-anchor="middle">synchronous update</text>
</svg>

## 3. Verified: it works, and it keeps readers in step

Two independent components each calling <code>useSyncExternalStore</code> on the same module-level store, with one <code>increment()</code> from outside React entirely:

\`\`\`
two independent readers mounted, text: 00
after one store.increment(), text: 11
\`\`\`

Both readers updated from a single mutation to a plain JavaScript object. No props, no Context, no lifted state — and, importantly, both show the **same** value.

📌 **Interview term:** compare that with reading the variable directly during render, which is verified elsewhere as showing the **old value indefinitely** — React never learns it changed, so it never schedules a render.

## 4. The two problems, stated precisely

| Problem | What goes wrong | How the hook fixes it |
| :--- | :--- | :--- |
| **Staleness** | React never learns the value changed, so the UI never updates | <code>subscribe</code> notifies React |
| **Tearing** | An interrupted render reads the value at two moments, so one screen shows two values | React re-checks the snapshot before committing |

📌 **Interview term: tearing** — one committed screen displaying two different values of the same source of truth. It became possible when rendering became interruptible in React 18, which is exactly why this hook arrived then.

## 5. The two ways to get it wrong

**<code>getSnapshot</code> returning a fresh object.** React compares snapshots with <code>Object.is</code>, so a new object every call is always "changed" — it re-renders, re-reads, and loops. Verified behaviour:

\`\`\`
console.error -> The result of getSnapshot should be cached to avoid an infinite loop
throw -> Maximum update depth exceeded...
\`\`\`

The same trap catches derivation: <code>getSnapshot: () =&gt; items.filter(...)</code> allocates a new array every call. Select outside, or use <code>useSyncExternalStoreWithSelector</code>.

**Omitting <code>getServerSnapshot</code> in an SSR app.** There is nothing to subscribe to on the server, so React throws *Missing getServerSnapshot, which is required for server-rendered content* — verified when an example in this collection omitted it.

📌 **Interview term:** <code>subscribe</code> must also be **stable**. Defined inline it is a new function every render, so React unsubscribes and resubscribes constantly. Define it outside the component or wrap it in <code>useCallback</code>.

## 6. When you would actually reach for it

Rarely in application code — and saying so is the mark of a considered answer.

📌 **Interview term:** Redux, Zustand, and Jotai all call it **internally**. That is how they became safe under concurrent rendering; before React 18 they hand-rolled subscriptions that could tear.

You write it directly when integrating something React does not know about:

- <code>window.matchMedia</code> for a media query
- <code>navigator.onLine</code> for connectivity
- <code>localStorage</code> synchronised across browser tabs
- A third-party non-React library exposing its own subscription
- Your own module-level store

## 7. The cost

Updates originating from an external store are **synchronous and non-interruptible** — they cannot be deprioritised by a transition. That is deliberate: you are buying a guarantee that the screen cannot disagree with itself, and the price is that this particular update opts out of concurrent scheduling.

## 8. Common Pitfalls

- **A fresh object from <code>getSnapshot</code>.** Infinite loop; cache the snapshot and replace it only on a real write.
- **Deriving inside <code>getSnapshot</code>.** <code>filter</code> or <code>map</code> allocates each call — same loop.
- **An unstable <code>subscribe</code>.** Resubscribes every render.
- **Omitting <code>getServerSnapshot</code> under SSR.** Throws.
- **Using it for state React could own.** If it can be <code>useState</code> lifted up, do that instead.
- **Expecting a performance win.** It buys correctness and deliberately opts out of concurrency.
- **Writing it by hand when a library already wraps it.** Redux and Zustand did this work for you.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name both problems, not one:</strong> <span style="color:#f0e2c8;">"It solves staleness — React never learns an outside value changed — and tearing, where an interrupted render reads it at two different moments."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the signature and what each part does:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe</code> tells React when to re-read, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getSnapshot</code> reads the value, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getServerSnapshot</code> covers SSR."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Land the detail that proves you have used it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getSnapshot</code> must return a cached reference — a fresh object each call loops until React throws maximum update depth exceeded."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Be honest about frequency:</strong> <span style="color:#f0e2c8;">"I rarely write it directly — Redux, Zustand and Jotai all call it internally. I reach for it when integrating a browser API or my own store."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. State the trade:</strong> <span style="color:#f0e2c8;">"Those updates are synchronous and non-interruptible. That is the deliberate price of a screen that cannot tear."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just read the module variable during render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because React never learns it changed, so nothing re-renders — the screen keeps showing the old value until some unrelated update happens along. And even when it does render, an interruptible pass can read the value at two different moments and produce a screen that disagrees with itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getSnapshot</code> return a cached value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React compares snapshots with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> to decide whether anything changed. A new object every call is never equal to the last, so it re-renders, re-reads, and loops — warning that the result should be cached before throwing a max-update-depth error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you write this often?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Redux, Zustand and Jotai call it internally — that is how they became concurrent-safe. I reach for it directly to integrate something React does not know about: <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">matchMedia</code>, <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.onLine</code>, cross-tab <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code>, or my own store.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the third argument for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">getServerSnapshot</code> — on the server there is nothing to subscribe to, so React needs a value it can render into HTML, and it is also used during hydration. Omit it in an SSR app and React throws about the missing server snapshot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it make anything faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The opposite, marginally. Updates from an external store are synchronous and cannot be deprioritised by a transition. You are buying correctness — a screen that cannot show two values of the same thing — and paying for it by opting that update out of concurrent scheduling.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **External store** | Mutable state living outside React |
| **Snapshot** | The store value at one instant, compared with <code>Object.is</code> |
| **<code>subscribe</code>** | How the store tells React to re-read |
| **<code>getServerSnapshot</code>** | The value used during SSR and hydration |
| **Staleness** | React never learning the value changed |
| **Tearing** | One screen showing two values of the same source |

---
**Conclusion:** <code>useSyncExternalStore</code> is how React reads state it does not own — a module store, a browser API, a third-party library — and it solves two problems at once: staleness, because React has no other way to learn an outside value changed, and tearing, because it re-checks the snapshot before committing. Verified on React 19.2.8, two independent readers both updated in step from a single mutation to a plain object. The rules that actually bite are that <code>getSnapshot</code> must return a cached reference or it loops, <code>subscribe</code> must be stable, and SSR requires the third argument. You rarely write it yourself — Redux, Zustand and Jotai all call it internally, which is precisely how they became concurrent-safe.`,
    examples: [
      {
        label: "A module store and a browser API, both read through the hook",
        runnable: true,
        code: `import { useSyncExternalStore, useState, useCallback } from "react";

// ── A tiny external store. Note the snapshot is the state object itself,
//    replaced only on a write — that is what makes getSnapshot cacheable. ───
function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => state,                       // SAME reference until a write
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    setState: (patch) => {
      state = { ...state, ...patch };               // new object -> Object.is sees a change
      listeners.forEach((l) => l());
    },
  };
}

const cartStore = createStore({ items: 0 });

// WRONG, for contrast — a fresh object every call means Object.is is always
// false, so React re-renders forever:
//   getSnapshot: () => ({ items: state.items })

function CartBadge({ label }) {
  const cart = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getSnapshot,   // getServerSnapshot — required under SSR
  );
  return (
    <p style={{ margin: "4px 0" }}>
      <code style={{ display: "inline-block", minWidth: 110 }}>{label}</code>
      items: <strong>{cart.items}</strong>
    </p>
  );
}

// ── A browser API React knows nothing about. This is the case where you
//    genuinely write the hook yourself rather than reaching for a library. ──
const onlineStore = {
  subscribe(callback) {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);
    };
  },
  getSnapshot: () => navigator.onLine,              // a boolean — always cacheable
  getServerSnapshot: () => true,                    // assume online when rendering on the server
};

function useOnlineStatus() {
  return useSyncExternalStore(
    onlineStore.subscribe,
    onlineStore.getSnapshot,
    onlineStore.getServerSnapshot,
  );
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [, force] = useState(0);

  // Mutating the store from OUTSIDE React entirely — no setState involved.
  const add = useCallback(() => {
    cartStore.setState({ items: cartStore.getSnapshot().items + 1 });
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 440 }}>
      <h4 style={{ marginTop: 0 }}>Two independent readers, one store</h4>
      <CartBadge label="header" />
      <CartBadge label="sidebar" />

      <p>
        <button onClick={add}>add an item (mutates the store directly)</button>{" "}
        <button onClick={() => force((n) => n + 1)}>re-render the app</button>
      </p>

      <p style={{ padding: 8, borderRadius: 6, background: isOnline ? "#e7f7e9" : "#fdecea" }}>
        Browser connectivity via useSyncExternalStore:{" "}
        <strong>{isOnline ? "online" : "offline"}</strong>
        <br />
        <span style={{ fontSize: 13, color: "#666" }}>
          Toggle your network — or devtools offline mode — and this updates
          without any React state involved.
        </span>
      </p>

      <p style={{ color: "#666", fontSize: 13 }}>
        Both badges always show the same number: React re-checks the snapshot
        before committing, so they cannot disagree.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
