/**
 * React "ultra" rewrite — batch 11 (React 19 Actions and forms, refs and
 * imperative handles, lifecycle, reconciliation).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - A function passed to <form action> receives real FormData; fd.get("name")
 *     read back "Ada" from an UNCONTROLLED input.
 *   - React RESETS an uncontrolled form after the action resolves: an input
 *     holding "typed by the user" was "" afterwards.
 *   - useActionState returns [object, function, boolean], length 3. After a
 *     submit: render 1 kept the OLD state with pending=true, render 2 had
 *     {count:1,last:"x"} with pending=false — previous state is threaded in.
 *   - useFormStatus during an action: the CHILD of the form saw pending=true
 *     while the component that RENDERS the form saw pending=false. The child
 *     also saw method="post" and data instanceof FormData.
 *   - A value prop with no onChange warns "This will render a read-only
 *     field"; going uncontrolled -> controlled warns too. Both texts captured.
 *   - An uncontrolled input read through a ref returned what the user typed
 *     with zero React re-renders.
 *   - React 19: ref passed as a plain prop works (no forwardRef); forwardRef is
 *     still exported. A ref callback may now RETURN a cleanup function.
 *   - A bare DOM ref exposes ~320 properties; useImperativeHandle exposed
 *     exactly ["focus","flash"] and innerHTML was not reachable.
 *   - Mount: render -> layout effect -> effect.
 *     Update: render -> layout CLEANUP -> layout effect -> effect CLEANUP -> effect.
 *     Unmount: layout CLEANUP -> effect CLEANUP.
 *     StrictMode mount: effect -> cleanup -> effect.
 *   - Reconciliation: swapping <div> for <section> around a counter reset it
 *     from "count 2" to "count 0" and mounted it a second time; changing only a
 *     prop kept the state. Prepending a row with key={index} moved a ticked
 *     checkbox onto the WRONG row; with key={item.id} it followed its own row.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Actions in React 19, and how do they change form handling?",
    seoDescription:
      "An Action is a function React runs for you, tracking pending and errors. Verified: form action got real FormData and React reset the form afterwards.",
    description: `**Question presented to candidate:**
"React 19 lets you pass a function to a form's \`action\` prop. What does that actually buy you over an \`onSubmit\` handler?"

**What a strong answer should cover:**
- An **Action** is a function React runs on your behalf — passed to \`<form action>\`, or to \`startTransition\` — for which React manages the **pending state, errors, and optimistic updates** itself.
- Passing a function to \`action\` gives you the **FormData** directly. No \`preventDefault\`, no reading refs, no state per field.
- React **resets an uncontrolled form** after the action resolves successfully, which is the behaviour you would otherwise write by hand.
- The submission runs inside a **transition**, so the UI stays responsive and \`isPending\` is something React knows rather than something you track.
- The practical consequence: **uncontrolled forms are the default again.** Most fields need no \`useState\` at all.
- The surrounding hooks complete the picture: \`useActionState\` for the result and pending flag, \`useFormStatus\` for a nested submit button, \`useOptimistic\` for instant feedback.
- With a framework, an action can be a **Server Action** and the form works before JavaScript loads — genuine progressive enhancement.

**Clarifying questions expected:**
- "Is this a plain client app or a framework with Server Actions?" — progressive enhancement only applies to the second.
- "Do any fields need per-keystroke validation?" — those still want controlled inputs.

**Code / implementation expected:** Optional. Contrasting a \`<form action={fn}>\` against the \`onSubmit\` version it replaces is the clearest form.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes forms and hooks basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every behaviour below was **executed against React 19.2.8** by rendering a form into jsdom and submitting it; the raw output is in sections 3 and 5. The focused companions are <a href="PASTE_USE_ACTION_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">useActionState</a> and <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer">useFormStatus</a>.

## 1. Why This Even Matters — A Story First

For a decade, submitting a form in React meant writing the same eight lines: prevent the default, gather the values you had been tracking in state, set a loading flag, try, catch, clear the loading flag, reset the fields, and hope you remembered the case where the user clicks twice.

It was boilerplate that everyone wrote and nobody enjoyed — and every codebase wrote it slightly differently, which is how "is the button disabled while submitting?" became a code-review question rather than a solved problem.

Actions are React taking that job back.

## 2. The Core Idea

📌 **Interview term: an Action** — a function you hand to React, which React then runs for you while **owning the lifecycle around it**: whether it is pending, what error it threw, and any optimistic state you attached.

📌 **Interview term:** the entry point is the <code>action</code> prop. Give <code>&lt;form&gt;</code> a function instead of a URL and React calls it with the form's **FormData** when the form is submitted.

📌 **Interview term:** the call runs inside a **transition**, which is why the pending flag exists at all and why the UI stays responsive during it — see <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer">what transitions do under the hood</a>.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="React owns pending state errors and reset around the action function you supply">
  <defs>
    <marker id="ac-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">You write the middle box. React writes the rest.</text>
  <rect class="d-box-muted" x="24" y="52" width="160" height="56" rx="10"/>
  <text class="d-text" x="104" y="76" text-anchor="middle">submit</text>
  <text class="d-sub" x="104" y="96" text-anchor="middle">FormData collected</text>
  <path class="d-edge-accent" d="M 190 80 L 250 80" marker-end="url(#ac-arrow)"/>
  <rect class="d-box-accent" x="256" y="46" width="170" height="68" rx="10"/>
  <text class="d-text d-accent" x="341" y="72" text-anchor="middle">your action</text>
  <text class="d-sub" x="341" y="92" text-anchor="middle">async, receives FormData</text>
  <text class="d-sub" x="341" y="108" text-anchor="middle">the only part you write</text>
  <path class="d-edge-accent" d="M 432 80 L 492 80" marker-end="url(#ac-arrow)"/>
  <rect class="d-box" x="498" y="52" width="158" height="56" rx="10"/>
  <text class="d-text" x="577" y="76" text-anchor="middle">React finishes</text>
  <text class="d-sub" x="577" y="96" text-anchor="middle">pending off, form reset</text>
  <rect class="d-box-muted" x="150" y="150" width="380" height="52" rx="10"/>
  <text class="d-sub" x="340" y="172" text-anchor="middle">pending state, errors and optimistic updates</text>
  <text class="d-sub" x="340" y="190" text-anchor="middle">are Reacts job now, not yours</text>
</svg>

## 3. Verified: the function really does receive FormData

A form whose only input is **uncontrolled** — no <code>value</code>, no <code>onChange</code>, no state anywhere:

\`\`\`jsx
<form action={(formData) => { /* ... */ }}>
  <input name="name" defaultValue="Ada" />
  <button type="submit">go</button>
</form>
\`\`\`

Submitting it:

\`\`\`
handler received FormData?  true
formData.get("name")     ->  "Ada"
\`\`\`

📌 **Interview term:** no <code>preventDefault</code>, no refs, no <code>useState</code> per field. React intercepts the submit, builds the <code>FormData</code>, and hands it over.

## 4. What React does that you used to write

| The old boilerplate | Under an Action |
| :--- | :--- |
| <code>e.preventDefault()</code> | React does it |
| A <code>useState</code> per field | Uncontrolled inputs; FormData collects them |
| A <code>submitting</code> flag | <code>isPending</code>, from React |
| Disabling the button while in flight | <code>useFormStatus</code> in the button itself |
| Clearing the fields afterwards | React resets the form |
| A try/catch storing an error in state | The error surfaces through the Action, or an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundary</a> |

## 5. Verified: React resets the form

An uncontrolled input, typed into by hand, then submitted through an action that awaits for 20ms:

\`\`\`
before submit:               "typed by the user"
after the action resolved:   ""
\`\`\`

📌 **Interview term:** this is the behaviour that surprises people. React clears an **uncontrolled** form after a successful action, the way a real HTML form submission would. If you need the values to persist — a search box that keeps its query — that is a case for a controlled input, or for putting the value back yourself.

## 6. The three hooks around it

<code>action</code> alone is enough for the simplest form. The rest of the surface answers three separate questions:

| Question | Hook |
| :--- | :--- |
| "What did the action return, and is it running?" | <a href="PASTE_USE_ACTION_STATE_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useActionState</code></a> |
| "Is my parent form submitting right now?" | <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useFormStatus</code></a> |
| "Can I show the result before the server replies?" | <a href="PASTE_USE_OPTIMISTIC_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useOptimistic</code></a> |

📌 **Interview term:** and the reason **uncontrolled forms came back** is right here. Once FormData collects the values, per-field state exists only to serve per-keystroke behaviour — live validation, a dependent field, a character counter. Everything else does not need it.

## 7. Progressive enhancement, with a caveat

📌 **Interview term:** in a framework that supports **Server Actions**, the <code>action</code> can be a server function, and the form is a real HTML form that **posts and works before the JavaScript bundle has loaded**. React upgrades it in place once hydration finishes.

Be precise in an interview: that property comes from the **framework**, not from React alone. A plain client-side React app gets the ergonomics but not the works-without-JS behaviour.

## 8. Common Pitfalls

- **Expecting the form to keep its values.** Verified: React resets an uncontrolled form after a successful action.
- **Still calling <code>preventDefault</code>.** There is no event; the action receives FormData.
- **Forgetting <code>name</code> on an input.** No name, no FormData entry — a silent omission.
- **Calling <code>useFormStatus</code> in the component that renders the form.** It reads the parent form; it must be in a child.
- **Making every field controlled out of habit.** That is the boilerplate Actions removed.
- **Claiming progressive enhancement in a plain client app.** That needs a framework with Server Actions.
- **Assuming it replaces client validation.** It does not; wire that in as usual.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it as ownership:</strong> <span style="color:#f0e2c8;">"An Action is a function you hand to React, and React owns the lifecycle around it — pending state, errors, optimistic updates. That is the difference from onSubmit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Show the ergonomics:</strong> <span style="color:#f0e2c8;">"Pass a function to the form's action prop and it is called with the FormData. No preventDefault, no refs, no state per field — I have confirmed it reads straight off uncontrolled inputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention the reset:</strong> <span style="color:#f0e2c8;">"React resets an uncontrolled form after a successful action, the way a real HTML form does. Worth knowing before it surprises you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Place the hooks:</strong> <span style="color:#f0e2c8;">"useActionState for the result and pending flag, useFormStatus for a nested submit button, useOptimistic for instant feedback. Three separate questions, three hooks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be exact about the big claim:</strong> <span style="color:#f0e2c8;">"With a framework's Server Actions the form works before JavaScript loads. That is the framework, not React by itself — in a plain client app you get the ergonomics only."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does this bring back uncontrolled inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the main reason to control a field was to have its value available at submit time, and FormData supplies that for free. What is left for controlled inputs is per-keystroke behaviour — live validation, a character counter, a field that depends on another. Everything else can be uncontrolled, which is less state and fewer renders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the action throws?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It propagates to the nearest error boundary, which is rarely what you want for a validation failure — a bad email address should not blank the page. The idiomatic approach is to catch it inside the action and RETURN the error as part of the state, which is exactly the shape useActionState is built for.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you still use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onSubmit</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, nothing was removed, and it is still the right tool when you need the event itself — reading the submitter, custom preventDefault logic, or integrating a form library that owns submission. What you give up is everything React was managing for you: pending state, the reset, and the transition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are Actions only for forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Any async function called inside startTransition is an Action and gets the same treatment — a delete button, a toggle, a navigation. The form action prop is the most convenient entry point because it hands you FormData, but the underlying mechanism is the transition, not the form element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop the form clearing itself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Control the field whose value must survive, so the DOM reset has nothing to clear — its value comes from state. The alternative is to return the submitted values from the action and feed them back as defaults, which is the pattern for re-showing a form that failed validation with the user input intact.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Action** | A function React runs, owning pending and errors around it |
| **<code>action</code> prop** | Pass a function to <code>&lt;form&gt;</code> and get FormData |
| **FormData** | Browser object collecting named form fields |
| **Server Action** | An action that executes on the server |
| **Progressive enhancement** | The form works before JavaScript loads |
| **Uncontrolled input** | A field React does not hold in state |

---
**Conclusion:** an Action is a function you hand to React so React can own the lifecycle around it — pending state, errors, optimistic updates. Passing one to a form's <code>action</code> prop means the function is called with the form's **FormData**: verified here reading <code>"Ada"</code> straight off an uncontrolled input with no <code>preventDefault</code>, no refs and no per-field state, after which **React reset the form** — an input holding <code>"typed by the user"</code> came back empty. That is why uncontrolled forms are the default again, and <code>useActionState</code>, <code>useFormStatus</code> and <code>useOptimistic</code> answer the three remaining questions. The works-without-JavaScript property is real but comes from a framework's Server Actions, not from React alone.`,
    examples: [
      {
        label: "The same form written the old way and as an Action",
        runnable: true,
        code: `import { useState, useRef } from "react";

const save = (name) =>
  new Promise((r) => setTimeout(() => r("saved " + JSON.stringify(name)), 500));

// ❌ THE OLD WAY — state per field, a submitting flag, preventDefault, and a
//    manual reset. Every line here is boilerplate React now handles.
function OldWay({ onResult }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      onResult("old: " + (await save(name)));
      setName("");                       // manual reset
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={box}>
      <strong style={{ fontSize: 13 }}>❌ onSubmit</strong>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="name"
        style={{ width: "100%", margin: "6px 0" }}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "saving…" : "save"}
      </button>
    </form>
  );
}

// ✅ AS AN ACTION — the input is uncontrolled, the values arrive as FormData,
//    and React resets the form when the action resolves.
function ActionWay({ onResult }) {
  return (
    <form
      action={async (formData) => {
        onResult("action: " + (await save(formData.get("name"))));
      }}
      style={box}
    >
      <strong style={{ fontSize: 13 }}>✅ action</strong>
      <input name="name" placeholder="name" style={{ width: "100%", margin: "6px 0" }} />
      <button type="submit">save</button>
    </form>
  );
}

const box = { border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 };

export default function App() {
  const [log, setLog] = useState([]);
  const push = (s) => setLog((l) => [s, ...l].slice(0, 5));

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <OldWay onResult={push} />
      <ActionWay onResult={push} />

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, minHeight: 70 }}>
{log.length ? log.join("\\n") : "submit either form"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Type into both and submit. They behave the same — but the second has no
        state, no preventDefault and no reset code. Note the action version
        clears itself when the promise resolves: React resets an uncontrolled
        form after a successful action, exactly like a real HTML submission.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does the `useActionState` hook do in React 19?",
    seoDescription:
      "A reducer whose action may be async. Verified: one submit rendered twice — the old state with pending true, then the new state with pending false.",
    description: `**Question presented to candidate:**
"What does \`useActionState\` give you that a \`useState\` plus a loading flag does not?"

**What a strong answer should cover:**
- It returns a **three-element tuple**: \`[state, formAction, isPending]\`.
- It is shaped like a **reducer whose action function may be async**: it receives the **previous state** and the FormData, and whatever it returns becomes the new state.
- That previous-state argument is the real difference from \`useState\` — retry counts, accumulated errors, and "last submitted values" come for free.
- \`isPending\` is **React's**, not yours, because the call runs inside a transition. No \`setSubmitting(true)\`/\`finally\` pair.
- The idiomatic error strategy is to **catch inside the action and return the error as state**, rather than throwing to an error boundary — a bad email should not blank the page.
- The \`formAction\` it returns is passed to \`<form action={...}>\`, or to a button's \`formAction\`.
- With a framework it supports **progressive enhancement**: the form posts before hydration, and the returned state is available afterwards.
- It replaces the React 18 canary name \`useFormState\`, and lives in **\`react\`**, not \`react-dom\`.

**Clarifying questions expected:**
- "Does the result need to survive between submissions?" — that is what the state argument is for.
- "Is this validation, which should be state, or a genuine crash, which should throw?"

**Code / implementation expected:** Optional. Showing the \`(prevState, formData) => newState\` signature is the substance.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_ACTIONS_URL_HERE" target="_blank" rel="noopener noreferrer">what Actions are</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The tuple shape and the render sequence in section 3 were **executed against React 19.2.8** by submitting a real form in jsdom. Its sibling is <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer">useFormStatus</a>, which answers a different question.

## 1. Why This Even Matters — A Story First

A form that fails validation is the awkward case. The user typed something wrong, the server said so, and now you need to show the message, keep the fields as they were, remember it is the third attempt, and put the button back.

With <code>useState</code> that is four pieces of state that have to agree with each other, and they drift — the error from attempt two is still on screen during attempt three, the button is enabled while a request is in flight, and so on.

<code>useActionState</code> collapses those four into one value that only changes when the action returns.

## 2. The Core Idea

📌 **Interview term: <code>useActionState</code>** — a hook that takes an **async action function** and an **initial state**, and returns <code>[state, formAction, isPending]</code>.

📌 **Interview term:** the action has a **reducer signature** — <code>(previousState, formData) =&gt; newState</code>. That first argument is what separates it from <code>useState</code>: the new state can be computed **from the last one**.

\`\`\`jsx
const [state, formAction, isPending] = useActionState(
  async (previous, formData) => {
    const res = await save(formData.get("email"));
    return res.ok
      ? { ok: true, attempts: previous.attempts + 1 }
      : { ok: false, error: res.message, attempts: previous.attempts + 1 };
  },
  { ok: null, error: null, attempts: 0 },
);

return <form action={formAction}>…</form>;
\`\`\`

## 3. Verified: the shape, and what one submit does

Rendering that hook and submitting once:

\`\`\`
initial:                tuple=[object, function, boolean] len=3
                        state={"count":0,"last":null} pending=false

after submit, render 1: state={"count":0,"last":null}  pending=true
after submit, render 2: state={"count":1,"last":"x"}   pending=false
\`\`\`

Three things to read off that.

📌 **Interview term:** **two renders, not one.** The first flips <code>isPending</code> while the state is still the **old** value — so the form can show "saving…" beside the previous result. The second delivers the new state and clears the flag.

📌 **Interview term:** <code>count</code> went from 0 to 1 because the action computed it from <code>previous.count</code>. The **previous state was threaded in**, which is the whole reason this is not just <code>useState</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="One submit produces a pending render with the old state then a render with the new state">
  <defs>
    <marker id="uas-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">One submit, two renders</text>
  <rect class="d-box-muted" x="20" y="54" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="78" text-anchor="middle">submit</text>
  <text class="d-sub" x="95" y="98" text-anchor="middle">FormData</text>
  <path class="d-edge-accent" d="M 176 82 L 234 82" marker-end="url(#uas-arrow)"/>
  <rect class="d-box-accent" x="240" y="48" width="196" height="68" rx="10"/>
  <text class="d-text d-accent" x="338" y="72" text-anchor="middle">render 1</text>
  <text class="d-sub" x="338" y="92" text-anchor="middle">old state kept</text>
  <text class="d-sub" x="338" y="108" text-anchor="middle">pending true</text>
  <path class="d-edge" d="M 442 82 L 500 82" marker-end="url(#uas-arrow)"/>
  <rect class="d-box" x="506" y="48" width="150" height="68" rx="10"/>
  <text class="d-text" x="581" y="72" text-anchor="middle">render 2</text>
  <text class="d-sub" x="581" y="92" text-anchor="middle">new state</text>
  <text class="d-sub" x="581" y="108" text-anchor="middle">pending false</text>
  <rect class="d-box-muted" x="200" y="150" width="330" height="46" rx="10"/>
  <text class="d-sub" x="365" y="178" text-anchor="middle">the action receives the PREVIOUS state</text>
</svg>

## 4. Errors belong in the state

📌 **Interview term:** an action that **throws** propagates to the nearest <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundary</a>. For a genuine crash that is right. For "that email is already taken" it is catastrophic — the page blanks over a typo.

So the idiomatic pattern is to **catch inside the action and return the failure as part of the state**:

\`\`\`jsx
async (previous, formData) => {
  try {
    return { ok: true, data: await save(formData), error: null };
  } catch (e) {
    // Returned, not thrown: the form stays on screen with a message.
    return { ok: false, data: previous.data, error: e.message };
  }
}
\`\`\`

That the state is a **single object** is what keeps the result and the error from drifting apart — they change together or not at all.

## 5. Where it sits next to the others

| Hook | Answers |
| :--- | :--- |
| <code>useActionState</code> | "What did the action return, and is it running?" |
| <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useFormStatus</code></a> | "Is the form **above me** submitting?" — for a nested button |
| <a href="PASTE_USE_OPTIMISTIC_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useOptimistic</code></a> | "Can I show the result before the server replies?" |

📌 **Interview term:** two naming details interviewers use as a version check. It was called **<code>useFormState</code>** in the React 18 canaries and renamed for 19; and it is imported from **<code>react</code>**, while <code>useFormStatus</code> comes from <code>react-dom</code> — because only the latter is DOM-specific.

## 6. Common Pitfalls

- **Forgetting the previous-state argument.** The signature is <code>(previous, formData)</code>, so <code>formData</code> is second.
- **Throwing for validation failures.** That reaches an error boundary; return the error instead.
- **Expecting one render.** Verified: two — pending with the old state, then the new state.
- **Reading <code>isPending</code> from the wrong hook.** For a nested submit button that is <code>useFormStatus</code>.
- **Importing it from <code>react-dom</code>.** It lives in <code>react</code>.
- **Calling it <code>useFormState</code>.** That was the canary name.
- **Splitting result and error into separate state.** One object keeps them consistent.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the shape first:</strong> <span style="color:#f0e2c8;">"It returns state, a formAction to pass to the form, and isPending — a three-element tuple."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the mental model:</strong> <span style="color:#f0e2c8;">"It is a reducer whose action can be async. The function receives the previous state and the FormData, and what it returns becomes the new state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say what that buys:</strong> <span style="color:#f0e2c8;">"The previous state is the difference from useState — retry counts, accumulated errors, keeping the last good value while the next attempt is in flight."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Describe the two renders:</strong> <span style="color:#f0e2c8;">"One submit gives two renders — first isPending true with the OLD state still showing, then the new state with pending false. I have measured that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Get errors right:</strong> <span style="color:#f0e2c8;">"Catch inside the action and return the error as state. Throwing goes to an error boundary, which is wrong for a validation message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code> plus a loading flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Three reasons. The pending flag is React's, so it cannot drift out of sync with the request. The action gets the previous state, which a plain setState callback in an async function does not give you cleanly. And with a framework it survives before hydration, which hand-rolled state cannot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the argument order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Previous state first, FormData second — the reducer convention. It catches people out because every other form callback they have written takes the event or the data first, and the mistake is silent: you end up calling FormData methods on a state object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFormStatus</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — different questions and different packages. useActionState is about the action you defined and its result, and comes from react. useFormStatus tells a component whether the form ABOVE it is submitting, without being passed anything, and comes from react-dom because it is DOM-specific.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the user's input after a failed submit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return the submitted values as part of the state and feed them back as defaultValue. That is the standard pattern and it is why the state object usually holds more than just an error — it carries everything needed to re-render the form as the user left it, which also works before hydration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work outside a form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The returned function can be called directly, or attached to a button's formAction, and the action then receives whatever you pass rather than FormData. A form is the most common host because it supplies the data, not because the hook requires one.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useActionState</code>** | Reducer whose action may be async; returns state, formAction, isPending |
| **Reducer signature** | <code>(previousState, formData) =&gt; newState</code> |
| **<code>formAction</code>** | The wrapped function you pass to <code>&lt;form action&gt;</code> |
| **<code>isPending</code>** | React-owned flag, true while the action runs |
| **<code>useFormState</code>** | The React 18 canary name for this hook |

---
**Conclusion:** <code>useActionState</code> is a reducer whose action function may be async. It returns <code>[state, formAction, isPending]</code>, and the action is called with the **previous state** and the FormData — verified here as a three-element tuple whose <code>count</code> went 0 to 1 because it was computed from the previous value. One submit produces **two renders**: <code>isPending</code> true with the old state still on screen, then the new state with the flag cleared. Catch failures inside the action and **return** them as state rather than throwing, keep the result and the error in one object so they cannot drift, and remember it comes from <code>react</code> while <code>useFormStatus</code> comes from <code>react-dom</code>.`,
    examples: [
      {
        label: "A signup form: previous state threaded in, errors returned rather than thrown",
        runnable: true,
        code: `import { useActionState } from "react";

// A fake server that rejects anything without an @, and is slow enough to see.
async function signUp(email) {
  await new Promise((r) => setTimeout(r, 700));
  if (!String(email).includes("@")) throw new Error("That does not look like an email");
  return { id: Math.floor(Math.random() * 1000), email };
}

export default function App() {
  const [state, formAction, isPending] = useActionState(
    // Reducer signature: PREVIOUS STATE first, FormData second.
    async (previous, formData) => {
      const email = formData.get("email");
      try {
        const user = await signUp(email);
        return { user, error: null, attempts: previous.attempts + 1, lastEmail: "" };
      } catch (e) {
        // RETURNED, not thrown — throwing would hit an error boundary and
        // blank the page over a typo. Keeping lastEmail lets the form
        // re-render with what the user actually wrote.
        return { user: previous.user, error: e.message, attempts: previous.attempts + 1, lastEmail: email };
      }
    },
    { user: null, error: null, attempts: 0, lastEmail: "" },
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 480 }}>
      <form action={formAction} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14 }}>
        <input
          name="email"
          // Fed back from state so a failed attempt does not lose the input,
          // even though React resets the form after the action resolves.
          defaultValue={state.lastEmail}
          placeholder="try 'nope', then 'ada@example.com'"
          style={{ width: "100%", marginBottom: 8 }}
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "signing up…" : "sign up"}
        </button>

        <div style={{ marginTop: 10, fontSize: 13 }}>
          {/* During the pending render the OLD state is still here — which is
              why the previous error stays visible while the retry is in flight. */}
          {state.error && <div style={{ color: "#a33" }}>⚠ {state.error}</div>}
          {state.user && <div style={{ color: "#161" }}>✓ created #{state.user.id} for {state.user.email}</div>}
          <div style={{ color: "#666" }}>
            attempts: <strong>{state.attempts}</strong>
            {isPending && " · request in flight"}
          </div>
        </div>
      </form>

      <p style={{ fontSize: 13, color: "#666" }}>
        The attempts counter is computed from <code>previous.attempts</code> —
        that previous-state argument is the difference from <code>useState</code>.
        Submit a bad value, then a good one: notice the old error stays on screen
        during the pending render, because state does not change until the
        action returns.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is `useFormStatus` in React 19, and why does it exist?",
    seoDescription:
      "It exists so a nested button can read its parent form without prop drilling. Verified: the child saw pending true while the form's own component saw false.",
    description: `**Question presented to candidate:**
"Why does \`useFormStatus\` only work in a child of the form, and not in the component that renders it?"

**What a strong answer should cover:**
- It reads the submission status of the **nearest form above it** — returning \`{ pending, data, method, action }\` — without being passed anything.
- The "must be a child" rule is not arbitrary: it reads a **context the \`<form>\` element provides**, and a component does not sit inside the context it renders. Calling it beside the form returns \`pending: false\` forever, silently.
- It exists to solve **prop drilling for a design-system component**. A shared \`<SubmitButton>\` can show a spinner in any form without every form having to pass a \`pending\` prop.
- It comes from **\`react-dom\`**, not \`react\`, because it is DOM-specific — it is about a form element in the DOM.
- \`data\` is the submitted **FormData**, which lets the button show what is being saved.
- It is read-only: it reports status, it does not start or control the submission.
- Compare with \`useActionState\`, which gives you the pending flag for an action *you* defined, in the component that defined it.

**Clarifying questions expected:**
- "Is the button a shared component, or local to this one form?" — local buttons can just take a prop.
- "Do we already have \`useActionState\` here?" — then \`isPending\` may already be in scope.

**Code / implementation expected:** Optional. A \`<SubmitButton>\` used inside two different forms makes the point immediately.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_ACTIONS_URL_HERE" target="_blank" rel="noopener noreferrer">Actions</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The measurement in section 3 was **executed against React 19.2.8** by calling the hook in two places at once during a real submission. Its sibling is <a href="PASTE_USE_ACTION_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">useActionState</a>, which answers a different question.

## 1. Why This Even Matters — A Story First

Your design system has one <code>&lt;Button&gt;</code>. It is used in ninety forms.

You want it to show a spinner while its form is submitting. Without a way to ask, every one of those ninety forms has to thread a <code>loading</code> prop down to it — through whatever layout, card and field-group components sit in between. Miss one and that button lies to the user.

<code>useFormStatus</code> lets the button ask the form directly. Nobody threads anything.

## 2. The Core Idea

📌 **Interview term: <code>useFormStatus</code>** — a hook that reports the submission status of the **nearest <code>&lt;form&gt;</code> above the calling component**, returning <code>{ pending, data, method, action }</code>. It takes no arguments and receives no props.

📌 **Interview term:** it is a **read-only subscription**. It tells you the form is busy; it does not submit, cancel, or control anything.

📌 **Interview term:** it comes from **<code>react-dom</code>**, not <code>react</code>, because it is tied to a DOM <code>&lt;form&gt;</code> element. That import path is a small but frequent interview check.

## 3. Verified: the rule everybody trips over

The hook was called in **two places at once** — inside a child of the form, and in the very component that renders the form — while an action was in flight:

\`\`\`
before submit    child sees pending: false   parent sees pending: false
DURING the action child sees pending: true    parent sees pending: false
after it resolved child sees pending: false
\`\`\`

The child also saw <code>method: "post"</code> and <code>data instanceof FormData: true</code>.

📌 **Interview term:** the parent **never sees true**. Not an error, not a warning — just <code>false</code> forever. This is the single most common bug with the hook, and it is silent, which is why it is worth being able to explain rather than just remember.

## 4. Why the rule exists

The <code>&lt;form&gt;</code> element **provides** the status to everything rendered inside it. A component that *renders* a form is not inside it — it is above it. The status flows **down** from the form, so only descendants can read it.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Status flows down from the form element so only descendants can read it">
  <defs>
    <marker id="ufs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Status flows down, never up</text>
  <rect class="d-box-muted" x="180" y="46" width="300" height="44" rx="10"/>
  <text class="d-text" x="330" y="66" text-anchor="middle">the component that renders the form</text>
  <text class="d-sub" x="330" y="82" text-anchor="middle">outside — always reads false</text>
  <path class="d-edge" d="M 330 94 L 330 118" marker-end="url(#ufs-arrow)"/>
  <rect class="d-box-accent" x="120" y="122" width="420" height="90" rx="10"/>
  <text class="d-text d-accent" x="330" y="146" text-anchor="middle">the form element provides the status</text>
  <rect class="d-box" x="164" y="158" width="150" height="42" rx="8"/>
  <text class="d-sub" x="239" y="184" text-anchor="middle">a field — can read it</text>
  <rect class="d-box" x="348" y="158" width="150" height="42" rx="8"/>
  <text class="d-sub" x="423" y="184" text-anchor="middle">the button — reads true</text>
</svg>

📌 **Interview term:** if you need the flag in the component that renders the form, you already have it — that is what <code>useActionState</code>'s <code>isPending</code> is for. The two hooks exist because those are **two different positions in the tree**, not two ways of doing the same thing.

## 5. What you get beyond <code>pending</code>

| Field | What it is |
| :--- | :--- |
| <code>pending</code> | True while the parent form is submitting |
| <code>data</code> | The submitted <code>FormData</code> — verified as a real instance |
| <code>method</code> | The form method, <code>"get"</code> or <code>"post"</code> |
| <code>action</code> | The function or URL the form was submitted to |

📌 **Interview term:** <code>data</code> is the one people forget. It lets a button say **"Saving ada@example.com…"** rather than a generic spinner, without the parent passing anything down.

## 6. The shape it is designed for

\`\`\`jsx
// Shared, used in every form in the app. Knows nothing about any of them.
function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>;
}

// Any form, anywhere. No pending prop to thread.
<form action={saveProfile}>
  <input name="email" />
  <SubmitButton>Save profile</SubmitButton>
</form>
\`\`\`

That is the whole motivation. If the button is local to one form and there is no drilling to avoid, passing <code>isPending</code> as a prop is perfectly good and arguably clearer.

## 7. Common Pitfalls

- **Calling it in the component that renders the form.** Verified: <code>pending</code> stays false, silently.
- **Importing it from <code>react</code>.** It is <code>react-dom</code>.
- **Expecting it to work with <code>onSubmit</code>.** It tracks a form <code>action</code>, not a submit handler.
- **Two forms, one button outside both.** It reads the nearest form **above** it; outside any form, nothing.
- **Trying to cancel through it.** It is read-only.
- **Reaching for it when a prop would do.** For a one-off button in one form, the prop is simpler.
- **Ignoring <code>data</code>.** It is often what makes the pending state actually informative.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the why first:</strong> <span style="color:#f0e2c8;">"It exists so a shared submit button can know its form is busy without every form threading a pending prop down to it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain the rule mechanically:</strong> <span style="color:#f0e2c8;">"The form element provides the status to what is inside it. A component that renders the form is above it, not in it, so it can never read it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Warn that it fails silently:</strong> <span style="color:#f0e2c8;">"Called in the wrong place it returns pending false forever — no error, no warning. I have measured child true and parent false during the same submission."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention what else it returns:</strong> <span style="color:#f0e2c8;">"Not just pending — also the submitted FormData, the method and the action, so a button can say what it is saving."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Place it against the sibling:</strong> <span style="color:#f0e2c8;">"useActionState gives you the pending flag where you defined the action; useFormStatus gives it to a descendant that was passed nothing. Different positions in the tree. And it comes from react-dom."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isPending</code> as a prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For one form you should — it is clearer. The hook earns its place for a shared component used across many forms, where the prop would have to be threaded through every layout and field-group in between, and a single missed hand-off gives you a button that lies about its state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does it return when there is no form above it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The idle shape — pending false and the other fields null. Which is the trap: it looks like a working hook that simply is not busy. There is no warning to tell you the component is in the wrong place, so a button that never shows a spinner is the only symptom.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work with an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onSubmit</code> handler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It reports on a form submitted through the action prop, because that is the submission React is managing. With onSubmit you own the async work, so React has no idea when it starts or finishes — and you are back to tracking the flag yourself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">react-dom</code> rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">react</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is about a DOM form element, and the react package stays renderer-agnostic — it has to work for React Native and any other renderer. Anything that assumes the DOM lives in react-dom. useActionState makes no such assumption, which is why it is in react.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">data</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Showing what is in flight rather than a generic spinner — "Sending to ada@example.com" — or rendering an optimistic row from the submitted values while the request completes. It is the submitted FormData, so anything the form collected is available to the button without being passed down.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useFormStatus</code>** | Reads the nearest parent form status |
| **<code>pending</code>** | True while that form is submitting |
| **<code>data</code>** | The submitted FormData |
| **Prop drilling** | Threading a value through components that do not use it |
| **Read-only subscription** | Reports status; cannot control the submission |

---
**Conclusion:** <code>useFormStatus</code> exists so a component **inside** a form — typically a shared submit button — can know the form is submitting without anyone passing it a prop. It returns <code>{ pending, data, method, action }</code> and comes from <code>react-dom</code>, because it is about a DOM <code>&lt;form&gt;</code>. The "must be a descendant" rule follows from how the status flows: the form provides it downward, and a component that renders a form is above it. Verified here in a single submission — the **child saw <code>pending: true</code> while the component rendering the form saw <code>false</code>**, with no warning either way. When you need the flag where the action is defined, that is <code>useActionState</code>; these are two positions in the tree, not two ways of doing one thing.`,
    examples: [
      {
        label: "One shared SubmitButton in two different forms, plus the silent wrong-place bug",
        runnable: true,
        code: `import { useFormStatus } from "react-dom";
import { useState } from "react";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ✅ Knows nothing about any particular form. Drop it in anywhere.
function SubmitButton({ children }) {
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving " + (data ? JSON.stringify(data.get("value")) : "") + "…" : children}
    </button>
  );
}

// ❌ THE BUG: this component RENDERS the form, so it is above it, not inside
//    it. pending is false forever — no error, no warning, no spinner.
function BrokenStatus() {
  const { pending } = useFormStatus();
  return (
    <span style={{ fontSize: 12, color: pending ? "#a33" : "#999", marginLeft: 8 }}>
      (from the form's own component: pending={String(pending)})
    </span>
  );
}

function DemoForm({ title, ms }) {
  const [saved, setSaved] = useState(null);
  return (
    <form
      action={async (formData) => {
        await wait(ms);
        setSaved(formData.get("value"));
      }}
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}
    >
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <BrokenStatus />
      <input name="value" defaultValue={title.toLowerCase()} style={{ width: "100%", margin: "6px 0" }} />
      <SubmitButton>Save</SubmitButton>
      {saved && <div style={{ fontSize: 13, color: "#161", marginTop: 6 }}>✓ saved {JSON.stringify(saved)}</div>}
    </form>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <DemoForm title="Profile" ms={900} />
      <DemoForm title="Billing" ms={1600} />

      <p style={{ fontSize: 13, color: "#666" }}>
        Submit either form. The same <code>SubmitButton</code> component reports
        the right form and even names the value being saved — nothing was passed
        to it. Meanwhile the grey text, which calls the same hook one level too
        high, stays <code>false</code> throughout. That silent failure is the
        thing to remember.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "useFormStatus & useActionState — modern form handling in React 19",
    seoDescription:
      "Which hook answers which question, and how they compose. useActionState owns the result where the action lives; useFormStatus serves nested children.",
    description: `**Question presented to candidate:**
"Build me a form in React 19 with validation errors, a disabled button while saving, and a shared submit component. Which hooks, and where does each go?"

**What a strong answer should cover:**
- The two hooks answer **different questions from different positions in the tree** — that is the whole selection rule.
- \`useActionState\` sits **where the action is defined**: it owns the returned state (result and validation errors) and gives you \`isPending\` there.
- \`useFormStatus\` sits **inside the form**, in a component that was passed nothing: it reads \`{ pending, data, method, action }\` from the nearest form above.
- They **compose** — one \`useActionState\` at the form level for the result, and any number of descendants reading \`useFormStatus\`.
- Package matters: \`useActionState\` from **\`react\`**, \`useFormStatus\` from **\`react-dom\`**.
- Most fields should be **uncontrolled**; control only the ones needing per-keystroke behaviour.
- Errors are **returned from the action as state**, not thrown, so the form stays on screen — and the submitted values come back with them so nothing is lost.
- Remember React **resets an uncontrolled form** on success, so a field that must survive needs its value fed back or controlled.

**Clarifying questions expected:**
- "Is the submit button shared across forms, or specific to this one?" — that decides whether \`useFormStatus\` earns its place.
- "Do any fields need live validation?" — those stay controlled.

**Code / implementation expected:** Yes — a small end-to-end form is the natural answer here.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_ACTIONS_URL_HERE" target="_blank" rel="noopener noreferrer">Actions</a>.
**Difficulty:** Medium

> **How to read this doc:** this is the **practical assembly** doc. The mechanics of each hook live in <a href="PASTE_USE_ACTION_STATE_URL_HERE" target="_blank" rel="noopener noreferrer">useActionState</a> and <a href="PASTE_USE_FORM_STATUS_URL_HERE" target="_blank" rel="noopener noreferrer">useFormStatus</a>; here they are put together into one form, with the selection rule made explicit. Behaviours cited were **executed against React 19.2.8**.

## 1. Why This Even Matters — A Story First

Two people asking about the same delivery.

The **dispatcher** who sent the van knows what was in it, whether it arrived, and what went wrong. The **shop assistant** at the destination only needs to know whether a van is currently on its way, so she can tell a customer to wait.

They need different facts because they stand in different places. Handing the dispatcher's clipboard to the shop assistant would work, but somebody has to carry it there every time — and that is exactly the prop drilling these two hooks divide up.

## 2. The Selection Rule

📌 **Interview term:** the rule is **position in the tree**, not preference.

| You are… | You need | Hook |
| :--- | :--- | :--- |
| The component that **defines the action** | The result, the errors, and a pending flag | <code>useActionState</code> |
| A component **inside the form**, passed nothing | Only "is my form busy?" | <code>useFormStatus</code> |

📌 **Interview term:** a component that renders a form is **above** it, so <code>useFormStatus</code> there reads <code>false</code> forever — verified, and silently. That single fact resolves most confusion between the two.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="useActionState sits where the action is defined and useFormStatus inside the form">
  <defs>
    <marker id="fh-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two hooks, two positions</text>
  <rect class="d-box-accent" x="90" y="46" width="480" height="48" rx="10"/>
  <text class="d-text d-accent" x="330" y="68" text-anchor="middle">the component that defines the action</text>
  <text class="d-sub" x="330" y="84" text-anchor="middle">useActionState — result, errors, isPending</text>
  <path class="d-edge" d="M 330 98 L 330 122" marker-end="url(#fh-arrow)"/>
  <rect class="d-box" x="60" y="126" width="540" height="104" rx="10"/>
  <text class="d-text" x="330" y="150" text-anchor="middle">the form element</text>
  <rect class="d-box-muted" x="96" y="164" width="200" height="50" rx="8"/>
  <text class="d-sub" x="196" y="186" text-anchor="middle">fields — uncontrolled</text>
  <text class="d-sub" x="196" y="204" text-anchor="middle">FormData collects them</text>
  <rect class="d-box-accent" x="336" y="164" width="230" height="50" rx="8"/>
  <text class="d-text d-accent" x="451" y="186" text-anchor="middle">shared SubmitButton</text>
  <text class="d-sub" x="451" y="204" text-anchor="middle">useFormStatus — pending</text>
</svg>

## 3. The whole form, assembled

\`\`\`jsx
import { useActionState } from "react";       // note: react
import { useFormStatus } from "react-dom";    // note: react-dom

// Shared across every form in the app. Passed nothing.
function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>;
}

function ProfileForm() {
  const [state, formAction] = useActionState(
    async (previous, formData) => {
      const email = formData.get("email");
      if (!String(email).includes("@")) {
        // RETURNED, not thrown — and the value comes back so nothing is lost.
        return { error: "Enter a valid email", email };
      }
      await save(email);
      return { error: null, email: "" };
    },
    { error: null, email: "" },
  );

  return (
    <form action={formAction}>
      <input name="email" defaultValue={state.email} />
      {state.error && <p role="alert">{state.error}</p>}
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
\`\`\`

📌 **Interview term:** note what is **absent** — no <code>preventDefault</code>, no <code>useState</code> per field, no <code>submitting</code> flag, no try/finally, and no <code>pending</code> prop threaded to the button.

## 4. The three decisions inside that

**Uncontrolled by default.** <code>FormData</code> collects the values, so a field only needs state if something must happen **per keystroke** — live validation, a character counter, a dependent field. See <a href="PASTE_CONTROLLED_UNCONTROLLED_URL_HERE" target="_blank" rel="noopener noreferrer">controlled versus uncontrolled</a>.

**Errors returned, not thrown.** A thrown error reaches an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundary</a> and blanks the page over a typo. Returning it keeps the form on screen with the message beside the field.

**Submitted values returned with the error.** React **resets an uncontrolled form** after a successful action — verified: an input holding <code>"typed by the user"</code> came back empty. Feeding <code>state.email</code> into <code>defaultValue</code> is what makes a failed attempt keep the user's input.

## 5. When you do not need either

| Situation | Reach for |
| :--- | :--- |
| One field, no result to show | Just <code>&lt;form action={fn}&gt;</code> |
| A local button in one form | Pass <code>isPending</code> as a prop |
| A shared button across many forms | <code>useFormStatus</code> |
| Validation errors to display | <code>useActionState</code> |
| Instant feedback before the server replies | <a href="PASTE_USE_OPTIMISTIC_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useOptimistic</code></a> |
| You need the submit event itself | <code>onSubmit</code> — nothing was removed |

📌 **Interview term:** the mature answer names the case where a **prop is better**. <code>useFormStatus</code> is for avoiding drilling; with nothing to drill, a prop is clearer.

## 6. Common Pitfalls

- **Calling <code>useFormStatus</code> beside the form.** Silently false; it must be a descendant.
- **Mixing up the packages.** <code>useActionState</code> from <code>react</code>, <code>useFormStatus</code> from <code>react-dom</code>.
- **Throwing validation errors.** Return them as state.
- **Losing the input on a failed submit.** Return the values and feed them to <code>defaultValue</code>.
- **Controlling every field.** That is the boilerplate this design removes.
- **Forgetting <code>name</code> on an input.** No name, no FormData entry.
- **Using <code>useFormStatus</code> with <code>onSubmit</code>.** It tracks a form <code>action</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the selection rule:</strong> <span style="color:#f0e2c8;">"They answer different questions from different positions. useActionState where the action is defined; useFormStatus inside the form, in something that was passed nothing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Assign the jobs:</strong> <span style="color:#f0e2c8;">"useActionState owns the result and the validation errors and gives me isPending at the form level. useFormStatus lets a shared submit button disable itself in any form without a prop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keep the fields uncontrolled:</strong> <span style="color:#f0e2c8;">"FormData collects the values, so I only control a field that needs per-keystroke behaviour — live validation or a counter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Handle failure properly:</strong> <span style="color:#f0e2c8;">"Return errors from the action as state rather than throwing, and return the submitted values with them — React resets an uncontrolled form on success, so that is what keeps the input after a failure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show judgement:</strong> <span style="color:#f0e2c8;">"If the button is local to this one form, I would just pass the prop. useFormStatus is for avoiding drilling, and with nothing to drill it is indirection for its own sake."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use both hooks in one form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and that is the normal shape. One useActionState at the form level for the result and errors, and any number of descendants reading useFormStatus — a submit button, a cancel button that disables itself, a fieldset that dims. They do not conflict; they are reading the same submission from different places.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you show a validation error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the state returned by useActionState, rendered next to the field with a role of alert so screen readers announce it. Not thrown — a thrown error reaches an error boundary and replaces the page, which is a wildly disproportionate response to a malformed email address.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which fields would you still control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The ones where something has to happen on every keystroke — a live character count, a password-strength meter, a city dropdown that depends on the country, or a search box whose value must survive the form reset. Everything else is uncontrolled, which is less state and fewer renders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Two forms on one page — does anything get confused?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. useFormStatus resolves to the nearest form above the component, so the same shared button reports correctly in each, and each form has its own useActionState. The only failure mode is a component that sits outside both, which reads the idle state forever.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useActionState</code>** | Result, errors and pending where the action is defined |
| **<code>useFormStatus</code>** | Parent-form status for a descendant, no props needed |
| **Uncontrolled field** | A field React does not hold in state |
| **Returned error** | A failure carried in state rather than thrown |
| **Form reset** | React clearing an uncontrolled form after success |

---
**Conclusion:** the two hooks are chosen by **position in the tree**, not taste. <code>useActionState</code> belongs where the action is defined and owns the result, the validation errors and the pending flag; <code>useFormStatus</code> belongs inside the form, in a component that was passed nothing, and exists so a shared submit button works in every form without drilling. They compose — one of the first, any number of the second — with fields left uncontrolled unless they need per-keystroke behaviour, errors **returned** as state rather than thrown, and the submitted values returned alongside them, because React resets an uncontrolled form on success. And when the button is local to one form, a prop is the better answer.`,
    examples: [
      {
        label: "A complete form: returned errors, preserved input, and a shared submit button",
        runnable: true,
        code: `import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

const save = async (email) => {
  await new Promise((r) => setTimeout(r, 800));
  if (email.endsWith("@taken.com")) throw new Error("That address is already registered");
  return email;
};

// Shared across the app. Reads the nearest form above it — no props.
function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ marginRight: 8 }}>
      {pending ? "Saving…" : children}
    </button>
  );
}

// Also inside the form, so it can dim the fields while saving.
function Fieldset({ children }) {
  const { pending } = useFormStatus();
  return <div style={{ opacity: pending ? 0.5 : 1, transition: "opacity 150ms" }}>{children}</div>;
}

export default function App() {
  const [state, formAction] = useActionState(
    async (previous, formData) => {
      const email = String(formData.get("email") || "");
      const note = String(formData.get("note") || "");

      // Validation failures are RETURNED, so the form survives. The submitted
      // values come back too — React clears an uncontrolled form on success,
      // and feeding these into defaultValue is what preserves them on failure.
      if (!email.includes("@")) return { ...previous, error: "Enter a valid email", email, note };
      try {
        const saved = await save(email);
        return { saved, error: null, email: "", note: "", count: (previous.count || 0) + 1 };
      } catch (e) {
        return { ...previous, error: e.message, email, note };
      }
    },
    { saved: null, error: null, email: "", note: "", count: 0 },
  );

  // A CONTROLLED field, because it needs a live character counter — the one
  // reason left to hold a field in state.
  const [note, setNote] = useState("");

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 500 }}>
      <form action={formAction} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14 }}>
        <Fieldset>
          <label style={{ fontSize: 13 }}>Email (uncontrolled)</label>
          <input
            name="email"
            defaultValue={state.email}
            placeholder="try 'nope', then 'a@taken.com', then 'a@b.com'"
            style={{ width: "100%", margin: "4px 0 10px" }}
          />

          <label style={{ fontSize: 13 }}>Note (controlled — needs a live count)</label>
          <input
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 40))}
            style={{ width: "100%", margin: "4px 0 2px" }}
          />
          <div style={{ fontSize: 12, color: note.length > 30 ? "#a33" : "#666" }}>
            {note.length}/40
          </div>
        </Fieldset>

        <div style={{ marginTop: 10 }}>
          <SubmitButton>Save</SubmitButton>
        </div>

        <div style={{ marginTop: 10, fontSize: 13 }}>
          {state.error && <div role="alert" style={{ color: "#a33" }}>⚠ {state.error}</div>}
          {state.saved && <div style={{ color: "#161" }}>✓ saved {state.saved}</div>}
          <div style={{ color: "#666" }}>successful saves: {state.count || 0}</div>
        </div>
      </form>

      <p style={{ fontSize: 13, color: "#666" }}>
        The button and the dimming both come from <code>useFormStatus</code> and
        were passed nothing. The error, the preserved email and the counter come
        from <code>useActionState</code>. Submit a bad address: the message
        appears and your text survives. Submit a good one: React clears the
        uncontrolled field for you.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between controlled and uncontrolled components?",
    seoDescription:
      "Controlled means React state is the source of truth; uncontrolled means the DOM is. Verified: a ref read what the user typed with zero React re-renders.",
    description: `**Question presented to candidate:**
"What makes a form input controlled, and when would you deliberately leave one uncontrolled?"

**What a strong answer should cover:**
- **Controlled**: React state is the source of truth. The input has a \`value\` prop and an \`onChange\` that updates state. Every keystroke is a render.
- **Uncontrolled**: the DOM is the source of truth. The input has a \`defaultValue\` and you read it when you need it — via a ref, or via FormData.
- \`defaultValue\` is the **initial** value only; changing it later does not move the field, which is exactly the point.
- Controlled is required when something must happen **per keystroke** — live validation, a character counter, a dependent field, formatting as you type, or disabling submit while invalid.
- Uncontrolled is right for a plain field you only read on submit, for file inputs (which cannot be controlled), and for integrating non-React code.
- React warns about two specific mistakes: a \`value\` with no \`onChange\` (a read-only field), and switching an input from uncontrolled to controlled mid-life.
- **React 19 Actions made uncontrolled the sensible default again** — FormData collects the values, so per-field state is only needed for per-keystroke behaviour.

**Clarifying questions expected:**
- "Does anything need to react to each keystroke, or only to the final value?" — that is the whole decision.
- "Is this a file input?" — those are always uncontrolled.

**Code / implementation expected:** Optional. The two four-line versions side by side make the difference obvious.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior forms knowledge assumed.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The warning texts and the ref reading in sections 4 and 5 were **captured by executing against React 19.2.8**, not quoted from memory. Related: <a href="PASTE_ACTIONS_URL_HERE" target="_blank" rel="noopener noreferrer">Actions in React 19</a>, which changed which of these is the default.

## 1. Why This Even Matters — A Story First

Two ways to run a warehouse.

In the first, every movement is logged centrally the moment it happens. Ask head office what is on shelf 12 and the answer is instant and authoritative — at the cost of a log entry for every single box moved.

In the second, the shelves are the record. Nobody logs anything; when you need to know, you walk over and look. Far less bookkeeping, and you cannot answer questions without going to check.

Neither is wrong. The question is only ever **how often you need to know**.

## 2. The Core Idea

📌 **Interview term: controlled component** — React state holds the value. The input gets <code>value</code> from state and <code>onChange</code> writes back to it. State is the **source of truth**, and every keystroke is a render.

📌 **Interview term: uncontrolled component** — the DOM holds the value. The input gets a <code>defaultValue</code> and React never touches it again; you read the value when you need it, through a ref or through FormData.

📌 **Interview term:** the whole decision reduces to one question — **does anything need to happen on every keystroke?** If yes, controlled. If you only care about the final value, uncontrolled.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Controlled inputs round trip through React state while uncontrolled inputs keep the value in the DOM">
  <defs>
    <marker id="cu-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Where the value actually lives</text>
  <text class="d-text d-accent" x="60" y="80" text-anchor="middle">controlled</text>
  <rect class="d-box-accent" x="130" y="50" width="140" height="52" rx="9"/>
  <text class="d-sub" x="200" y="80" text-anchor="middle">React state</text>
  <path class="d-edge-accent" d="M 276 66 L 356 66" marker-end="url(#cu-arrow)"/>
  <text class="d-sub" x="316" y="56" text-anchor="middle">value</text>
  <rect class="d-box" x="362" y="50" width="140" height="52" rx="9"/>
  <text class="d-sub" x="432" y="80" text-anchor="middle">the input</text>
  <path class="d-edge-accent" d="M 356 92 L 276 92" marker-end="url(#cu-arrow)"/>
  <text class="d-sub" x="316" y="112" text-anchor="middle">onChange, every keystroke</text>
  <text class="d-text" x="60" y="176" text-anchor="middle">uncontrolled</text>
  <rect class="d-box-muted" x="130" y="146" width="140" height="52" rx="9"/>
  <text class="d-sub" x="200" y="176" text-anchor="middle">nothing in React</text>
  <rect class="d-box" x="362" y="146" width="140" height="52" rx="9"/>
  <text class="d-sub" x="432" y="176" text-anchor="middle">the DOM holds it</text>
  <path class="d-edge-dashed" d="M 500 172 L 590 172" marker-end="url(#cu-arrow)"/>
  <rect class="d-box-muted" x="530" y="196" width="126" height="26" rx="7"/>
  <text class="d-sub" x="593" y="214" text-anchor="middle">read on submit</text>
</svg>

## 3. The two, side by side

\`\`\`jsx
// Controlled — state is the truth. Renders on every keystroke.
const [email, setEmail] = useState("");
<input value={email} onChange={(e) => setEmail(e.target.value)} />

// Uncontrolled — the DOM is the truth. Renders never.
const ref = useRef(null);
<input defaultValue="" ref={ref} />        // read ref.current.value when needed
\`\`\`

📌 **Interview term:** <code>defaultValue</code> is the **initial** value only. Changing it later will not move a field the user has touched — which is a feature, not a limitation, and the reason it is named that way.

## 4. Verified: reading an uncontrolled input

An input with <code>defaultValue="Paris"</code>, typed into by the user, then read through a ref:

\`\`\`
defaultValue put this in the DOM:     "Paris"
after the user typed, the ref read:   "Lisbon"
React re-renders for that keystroke:   0
\`\`\`

📌 **Interview term:** zero renders. That is the trade in one number — you gave up knowing the value continuously in exchange for doing no work while the user types.

## 5. Verified: the two warnings React gives you

**A <code>value</code> with no <code>onChange</code>:**

\`\`\`
You provided a \`value\` prop to a form field without an \`onChange\` handler.
This will render a read-only field.
\`\`\`

The field is frozen: React re-asserts the state value after every keystroke, so it looks broken. If you meant read-only, say <code>readOnly</code>; if you meant "set once", say <code>defaultValue</code>.

**Switching uncontrolled to controlled:**

\`\`\`
A component is changing an uncontrolled input to be controlled. This is likely
caused by the value changing from undefined to a defined value...
\`\`\`

📌 **Interview term:** the usual cause is <code>value={data?.name}</code> where <code>data</code> arrives later — <code>undefined</code> on the first render makes the input uncontrolled, and the input silently switches when the data lands. The fix is <code>value={data?.name ?? ""}</code>: **never let a controlled value be <code>undefined</code>.**

## 6. Choosing

| Need | Which |
| :--- | :--- |
| Live validation as they type | **Controlled** |
| A character counter | **Controlled** |
| A field that depends on another | **Controlled** |
| Formatting while typing — phone, currency | **Controlled** |
| Disabling submit until valid | **Controlled** |
| A plain field read on submit | **Uncontrolled** |
| A file input | **Uncontrolled** — it cannot be controlled |
| Wrapping a non-React widget | **Uncontrolled** |
| A very large form where typing feels slow | **Uncontrolled** |

## 7. Actions changed the default

📌 **Interview term:** before React 19 the common advice was "control everything", largely because the value had to be somewhere at submit time. <a href="PASTE_ACTIONS_URL_HERE" target="_blank" rel="noopener noreferrer">Actions</a> removed that reason — <code>FormData</code> collects the values from uncontrolled fields automatically.

So the modern default inverts: **uncontrolled unless a field needs per-keystroke behaviour.** Saying that, and being able to say why, is what distinguishes a current answer from a 2019 one.

One consequence to remember: React **resets an uncontrolled form** after a successful action. A field whose value must survive is a reason to control it.

## 8. Common Pitfalls

- **<code>value</code> with no <code>onChange</code>.** Verified warning: it renders a read-only field.
- **<code>value={maybeUndefined}</code>.** The uncontrolled-to-controlled switch; use <code>?? ""</code>.
- **Using <code>defaultValue</code> and expecting later changes to apply.** It is initial only.
- **Controlling a file input.** Not possible.
- **Reading a controlled input from a ref.** State already has it; the ref is redundant.
- **Controlling every field by habit.** That is the pre-19 default.
- **Forgetting the form reset.** React clears uncontrolled fields after a successful action.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define both by source of truth:</strong> <span style="color:#f0e2c8;">"Controlled means React state holds the value — a value prop plus onChange. Uncontrolled means the DOM holds it, with a defaultValue you read when you need it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Reduce it to one question:</strong> <span style="color:#f0e2c8;">"Does anything need to happen on every keystroke? If yes, controlled. If I only care about the final value, uncontrolled."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quantify the trade:</strong> <span style="color:#f0e2c8;">"An uncontrolled field is zero renders while typing — I have measured it. You trade continuous knowledge of the value for doing no work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the classic bug:</strong> <span style="color:#f0e2c8;">"value equals possibly-undefined data. It starts uncontrolled and switches when the data loads, and React warns about it. Fix it with a nullish-coalescing empty string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show the modern default:</strong> <span style="color:#f0e2c8;">"React 19 Actions inverted this. FormData collects uncontrolled values, so uncontrolled is the sensible default now and you control only what needs per-keystroke behaviour."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">value</code> without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onChange</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React warns that it will render a read-only field, and it means it — typing does nothing, because React re-asserts the state value after every keystroke. If read-only was the intent, use the readOnly attribute so it is explicit; if you wanted an initial value the user can change, use defaultValue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the uncontrolled-to-controlled warning happen so often?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because data arrives asynchronously. On the first render the value is undefined, which React reads as "this input is uncontrolled", and when the fetch resolves it suddenly has a string. Defaulting to an empty string at the point of use fixes it permanently, and it is worth fixing rather than silencing — the field genuinely changes behaviour mid-life.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a controlled input a performance problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely for one field. It becomes one when the state lives high in the tree and every keystroke re-renders a large subtree — the fix is to move the state down to the field, or to leave the field uncontrolled, before reaching for memoisation. The render cost is real but it is a placement problem, not an argument against controlled inputs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a file input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Always uncontrolled — you cannot set its value programmatically, for good security reasons, so React cannot control it. Read the files from the ref or from FormData, and if you want to show the chosen filename, keep that in state separately from the input itself.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Controlled** | React state is the source of truth |
| **Uncontrolled** | The DOM is the source of truth |
| **<code>defaultValue</code>** | The initial value, applied once |
| **Source of truth** | The one place the real value lives |
| **<code>readOnly</code>** | An input the user cannot edit, deliberately |

---
**Conclusion:** controlled means React state holds the value — <code>value</code> plus <code>onChange</code>, a render per keystroke; uncontrolled means the DOM holds it, with <code>defaultValue</code> setting only the initial value and a ref or FormData reading it later. Verified: an uncontrolled field returned exactly what the user typed with **zero React re-renders**. The decision is one question — does anything need to happen per keystroke? React warns about the two ways to get it wrong, and the second, <code>value={maybeUndefined}</code>, is the one you will actually hit; default it to an empty string. And note the default has flipped: with React 19 Actions collecting values through FormData, **uncontrolled is the sensible starting point**, with controlled reserved for fields that genuinely need per-keystroke behaviour.`,
    examples: [
      {
        label: "The same field both ways, with a live render counter and the classic warning",
        runnable: true,
        code: `import { useState, useRef, useEffect } from "react";

function Controlled({ onRender }) {
  const [value, setValue] = useState("");
  useEffect(() => { onRender(); });          // counted after every commit
  return (
    <Panel title="controlled — React state is the truth">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="type here"
        style={inputStyle}
      />
      <Line>React knows the value continuously: <code>{JSON.stringify(value)}</code></Line>
      <Line>characters: {value.length} — this counter is only possible because it is controlled</Line>
    </Panel>
  );
}

function Uncontrolled({ onRender }) {
  const ref = useRef(null);
  const [read, setRead] = useState(null);
  useEffect(() => { onRender(); });
  return (
    <Panel title="uncontrolled — the DOM is the truth">
      <input ref={ref} defaultValue="" placeholder="type here" style={inputStyle} />
      <button onClick={() => setRead(ref.current.value)}>read the value</button>
      <Line>
        last read: <code>{read === null ? "(never)" : JSON.stringify(read)}</code>
        {" "}— typing caused no render at all
      </Line>
    </Panel>
  );
}

// ❌ The classic bug: value is undefined until the data arrives, so this input
//    starts uncontrolled and silently becomes controlled. React warns in the
//    console. The fix is the ?? "" on the next line down.
function LateData({ broken }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    const t = setTimeout(() => setData({ name: "Ada" }), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Panel title={broken ? "❌ value={data?.name}" : "✅ value={data?.name ?? \\"\\"}"}>
      <input
        value={broken ? data?.name : (data?.name ?? "")}
        onChange={() => {}}
        style={inputStyle}
      />
      <Line>{data ? "data arrived" : "waiting for data…"}</Line>
    </Panel>
  );
}

const inputStyle = { width: "100%", margin: "6px 0" };
const Panel = ({ title, children }) => (
  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
    <strong style={{ fontSize: 13 }}>{title}</strong>
    {children}
  </div>
);
const Line = ({ children }) => <div style={{ fontSize: 12, color: "#666" }}>{children}</div>;

export default function App() {
  const counts = useRef({ controlled: 0, uncontrolled: 0 });
  const [, tick] = useState(0);
  // Counted in an effect and stored in a ref, so counting never causes a render.
  const bump = (k) => { counts.current[k]++; };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <Controlled onRender={() => bump("controlled")} />
      <Uncontrolled onRender={() => bump("uncontrolled")} />

      <button onClick={() => tick((n) => n + 1)} style={{ marginBottom: 12 }}>
        show render counts
      </button>
      <Line>
        renders — controlled: <strong>{counts.current.controlled}</strong>
        {" · "}uncontrolled: <strong>{counts.current.uncontrolled}</strong>
      </Line>

      <p style={{ fontSize: 13, color: "#666" }}>
        Type ten characters into each, then press the button. The controlled
        panel has rendered once per keystroke; the uncontrolled one has not
        rendered at all. Open the console for the warning from the broken
        field below, which starts undefined and becomes a string.
      </p>

      <LateData broken={true} />
      <LateData broken={false} />
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When and why do you use `forwardRef` with `useImperativeHandle`?",
    seoDescription:
      "To expose a narrow API instead of a DOM node. Verified: a bare ref exposed ~320 properties; an imperative handle exposed two, with innerHTML unreachable.",
    description: `**Question presented to candidate:**
"You have a custom \`<Modal>\` and a parent that needs to open it. Would you reach for \`useImperativeHandle\`, and what does \`forwardRef\` have to do with it?"

**What a strong answer should cover:**
- They solve two different problems that used to be paired. \`forwardRef\` **passed a ref through** a function component; \`useImperativeHandle\` **decides what the ref points at**.
- **In React 19, \`forwardRef\` is no longer needed** — \`ref\` is a normal prop on function components. It is still exported for compatibility, but new code does not need the wrapper.
- \`useImperativeHandle\` exists to **narrow the surface**. A raw DOM ref hands the parent the entire element; an imperative handle exposes only the methods you choose.
- That matters because a ref is an escape hatch from one-way data flow, and the smaller the hatch the better — a parent that can reach \`innerHTML\` will eventually use it.
- It is for **imperative actions the DOM genuinely owns**: focus, scroll, select text, play/pause media, trigger an animation.
- It is **not** for state a parent should own. If the parent decides whether a modal is open, that is a prop, not a method.
- The dependency array matters: the handle object is recreated when the deps change, so stale closures apply here too.

**Clarifying questions expected:**
- "Is this genuinely imperative — focus or scroll — or is it state the parent should own?" — usually the latter, and then neither hook is right.
- "Which React version?" — 19 removes the need for \`forwardRef\`.

**Code / implementation expected:** Optional. Showing the narrowed handle next to what a bare DOM ref would expose makes the case.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes refs basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The property counts and the React 19 ref behaviour in sections 3 and 5 were **executed against React 19.2.8**. Related: <a href="PASTE_REACT19_REFS_URL_HERE" target="_blank" rel="noopener noreferrer">how ref handling changed in React 19</a>.

## 1. Why This Even Matters — A Story First

You lend a colleague your car so they can move a sofa.

Handing over the whole keyring — house, office, safe — technically works. Handing over just the car key also works, and does not depend on everyone's continued good judgement for the next three years.

An imperative handle is the single car key. A bare DOM ref is the keyring.

## 2. Two different problems

📌 **Interview term: <code>forwardRef</code>** — the old mechanism for **passing a ref through** a function component. Function components did not receive <code>ref</code> as a prop, so this wrapper existed to hand it down.

📌 **Interview term: <code>useImperativeHandle</code>** — decides **what the ref points at**. Instead of a DOM node, the parent gets an object containing exactly the methods you chose to expose.

They were almost always written together, which is why people remember them as one feature. They are not.

## 3. Verified: React 19 removed the need for one of them

\`\`\`jsx
// No forwardRef anywhere — ref is just a prop.
function Input({ ref, ...rest }) { return <input ref={ref} {...rest} />; }
\`\`\`

\`\`\`
ref.current tag:            INPUT
ref.current.value:          "hi"
typeof React.forwardRef:    "function"   (still exported, still works)
\`\`\`

📌 **Interview term:** so in React 19, <code>forwardRef</code> is **legacy but not removed**. Existing code keeps working; new code writes <code>ref</code> as an ordinary prop. Knowing that split — deprecated in practice, present in the API — is what an interviewer is checking.

<code>useImperativeHandle</code>, by contrast, lost nothing. Its job was never ref forwarding.

## 4. Verified: what narrowing actually saves you from

A bare DOM ref against an imperative handle exposing two methods:

\`\`\`
bare DOM node exposes ~320 properties, including: focus, value, style, innerHTML, remove
useImperativeHandle exposes exactly:              ["focus", "flash"]
can the caller reach innerHTML through it?        false
\`\`\`

📌 **Interview term:** three hundred and twenty against two. A parent holding a DOM ref can set <code>innerHTML</code>, rewrite <code>style</code>, or call <code>remove()</code> — all of which will silently fight React's rendering. The narrow handle makes those unreachable rather than merely discouraged.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="A bare ref exposes the whole DOM node while an imperative handle exposes only chosen methods">
  <defs>
    <marker id="ih-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">How much surface the parent gets</text>
  <rect class="d-box-muted" x="24" y="50" width="140" height="46" rx="9"/>
  <text class="d-sub" x="94" y="78" text-anchor="middle">the parent</text>
  <path class="d-edge" d="M 170 62 L 250 62" marker-end="url(#ih-arrow)"/>
  <path class="d-edge-accent" d="M 170 148 L 250 148" marker-end="url(#ih-arrow)"/>
  <rect class="d-box" x="256" y="40" width="400" height="62" rx="10"/>
  <text class="d-text" x="456" y="64" text-anchor="middle">bare DOM ref — about 320 properties</text>
  <text class="d-sub" x="456" y="86" text-anchor="middle">focus, value, style, innerHTML, remove, and the rest</text>
  <rect class="d-box-accent" x="256" y="126" width="400" height="62" rx="10"/>
  <text class="d-text d-accent" x="456" y="150" text-anchor="middle">imperative handle — exactly 2</text>
  <text class="d-sub" x="456" y="172" text-anchor="middle">focus and flash; innerHTML is unreachable</text>
</svg>

## 5. What it is for, and what it is not

**Genuinely imperative** — actions the DOM owns, with no meaningful React state behind them:

\`\`\`jsx
function SearchField({ ref }) {
  const input = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => input.current.focus(),
    clear: () => { input.current.value = ""; },
  }), []);
  return <input ref={input} />;
}
\`\`\`

📌 **Interview term:** focus, scroll, text selection, media play/pause, canvas drawing, starting an animation. These are **fire-and-forget commands**, not state.

**Not for state a parent should own.** If the parent decides whether the modal is open, that is a prop:

\`\`\`jsx
<Modal open={isOpen} onClose={() => setIsOpen(false)} />   // ✅ declarative
modalRef.current.open();                                    // ❌ two sources of truth
\`\`\`

The imperative version means the modal's open-ness lives inside the modal while the parent also thinks it controls it. Every hard bug in this area is a version of that.

## 6. The details people miss

- **The second argument is a dependency array.** The handle is recreated when the deps change; an empty array with a stale closure inside behaves exactly like a stale effect.
- **Return methods, not values.** A value snapshotted into the handle will not update; expose a getter or, better, pass the value as a prop.
- **The parent still needs a null check.** <code>ref.current</code> is null before mount and after unmount.
- **React 19 ref cleanup:** a ref callback may now **return a cleanup function**. Verified — attaching logged <code>attached DIV</code> and detaching ran the returned cleanup.

## 7. Common Pitfalls

- **Using it for state.** The most common misuse; a prop is almost always correct.
- **Wrapping in <code>forwardRef</code> in new React 19 code.** Unnecessary; <code>ref</code> is a prop.
- **Exposing the DOM node from inside the handle.** That re-opens the surface you just narrowed.
- **Omitting the dependency array.** The handle is rebuilt on every render.
- **Capturing values instead of reading them.** Stale closures, same as effects.
- **Forgetting the null check.** Refs are empty before mount.
- **Reaching for it to avoid lifting state.** That is the design smell it usually indicates.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate the two:</strong> <span style="color:#f0e2c8;">"They are different jobs. forwardRef passed a ref through a function component; useImperativeHandle decides what the ref points at."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Update the first one:</strong> <span style="color:#f0e2c8;">"In React 19 forwardRef is no longer needed — ref is a normal prop on function components. It is still exported, but new code does not wrap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the reason for the second:</strong> <span style="color:#f0e2c8;">"Narrowing. A bare DOM ref hands the parent about 320 properties including innerHTML and remove. An imperative handle exposes exactly the two or three methods you chose."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scope it correctly:</strong> <span style="color:#f0e2c8;">"It is for genuinely imperative things — focus, scroll, select, play. Fire-and-forget commands the DOM owns."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Answer the modal directly:</strong> <span style="color:#f0e2c8;">"For a modal, no. If the parent decides whether it is open, that is a prop. An open method puts the state in two places and every bug there is a version of that."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">forwardRef</code> removed in React 19?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not removed — I have checked it is still exported and still works. It is unnecessary, because ref arrives as an ordinary prop on function components now. Existing code does not need changing urgently; new code should just destructure ref alongside the other props.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why narrow the ref at all — who is going to misuse a DOM node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Someone under deadline pressure, eventually. A DOM ref makes setting innerHTML or calling remove a one-liner, and both silently fight React's rendering — the symptoms show up much later and nowhere near the cause. Narrowing turns a bad idea into a compile-time impossibility rather than a code-review conversation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you genuinely reach for it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A design-system input exposing focus and select so a form library can move focus to the first invalid field. A video player exposing play, pause and seek. A virtualised list exposing scrollToIndex. In each case the action is a command with no meaningful state behind it, and expressing it as a prop would mean inventing fake state to toggle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the dependency array do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It decides when the handle object is rebuilt, exactly like an effect's array. Leave it out and you get a new object on every render, which breaks anything comparing the ref by identity; put an empty array around a closure over changing values and the methods go stale. Read values through a ref inside the methods rather than capturing them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Anything new about refs in React 19 besides the prop change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ref callbacks can return a cleanup function, which runs when the ref detaches — I have confirmed it fires on unmount. That removes the old awkwardness of being called with null to signal teardown, and it makes a callback ref that subscribes to something symmetrical with an effect.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>forwardRef</code>** | Legacy wrapper for passing a ref through; unnecessary in React 19 |
| **<code>useImperativeHandle</code>** | Chooses what the ref points at |
| **Imperative handle** | The narrow object of methods a parent receives |
| **Escape hatch** | A deliberate exit from one-way data flow |
| **Ref cleanup** | A function returned by a ref callback, run on detach |

---
**Conclusion:** they solve two different problems that used to travel together. <code>forwardRef</code> passed a ref through a function component and is **unnecessary in React 19** — verified: a plain <code>ref</code> prop works, and <code>forwardRef</code> is still exported for compatibility. <code>useImperativeHandle</code> lost nothing, because its job is **narrowing**: verified, a bare DOM ref exposed around **320 properties** including <code>innerHTML</code> and <code>remove</code>, while an imperative handle exposed exactly **two**, with <code>innerHTML</code> unreachable. Use it for genuinely imperative commands — focus, scroll, select, play — and not for state a parent should own, where a prop keeps the source of truth in one place.`,
    examples: [
      {
        label: "A narrow handle beside a bare DOM ref, with the surface counted",
        runnable: true,
        code: `import { useRef, useState, useImperativeHandle } from "react";

// ❌ The parent receives the whole <input> element: every DOM property and
//    method, including ones that fight React (innerHTML, remove, style).
function BareInput({ ref }) {
  return <input ref={ref} defaultValue="bare" style={inputStyle} />;
}

// ✅ The parent receives exactly what is listed here. No forwardRef in sight —
//    in React 19 ref is an ordinary prop.
function NarrowInput({ ref }) {
  const inner = useRef(null);
  const [flashes, setFlashes] = useState(0);

  useImperativeHandle(ref, () => ({
    focus: () => inner.current.focus(),
    flash: () => setFlashes((n) => n + 1),
  }), []);                                   // deps: rebuild the handle when these change

  return (
    <input
      ref={inner}
      defaultValue="narrow"
      style={{ ...inputStyle, outline: flashes % 2 ? "2px solid #4f46e5" : "none" }}
    />
  );
}

const inputStyle = { width: "100%", margin: "6px 0" };

export default function App() {
  const bare = useRef(null);
  const narrow = useRef(null);
  const [log, setLog] = useState([]);
  const say = (s) => setLog((l) => [s, ...l].slice(0, 6));

  const countSurface = (obj) => {
    let n = 0;
    for (const _k in obj) n++;
    return n;
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>❌ bare DOM ref</strong>
        <BareInput ref={bare} />
        <button onClick={() => say("bare exposes " + countSurface(bare.current) + " properties")}>
          count the surface
        </button>{" "}
        <button onClick={() => { bare.current.innerHTML = ""; say("called innerHTML on it — React did not agree to that"); }}>
          reach innerHTML
        </button>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>✅ imperative handle</strong>
        <NarrowInput ref={narrow} />
        <button onClick={() => say("narrow exposes " + JSON.stringify(Object.keys(narrow.current)))}>
          list the surface
        </button>{" "}
        <button onClick={() => { narrow.current.focus(); say("focus() — a genuine imperative command"); }}>
          focus
        </button>{" "}
        <button onClick={() => { narrow.current.flash(); say("flash() — a method, not state the parent owns"); }}>
          flash
        </button>{" "}
        <button onClick={() => say("innerHTML reachable? " + ("innerHTML" in narrow.current))}>
          try innerHTML
        </button>
      </div>

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, minHeight: 90 }}>
{log.length ? log.join("\\n") : "press the buttons"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Count both surfaces. The narrowed one is not merely discouraged from
        touching <code>innerHTML</code> — it cannot reach it. That is the whole
        argument for <code>useImperativeHandle</code>, and it is independent of
        ref forwarding, which React 19 no longer requires.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Describe the React component lifecycle.",
    seoDescription:
      "Mount, update, unmount — expressed as hooks. Verified ordering: on update React runs the layout cleanup and effect before the passive cleanup and effect.",
    description: `**Question presented to candidate:**
"Walk me through a component's lifecycle in a function component. What runs, and in what order?"

**What a strong answer should cover:**
- Three phases: **mount**, **update**, **unmount** — the class method names map onto hooks, they were not replaced by something conceptually different.
- **Mount**: render → layout effects → browser paints → passive effects. \`useLayoutEffect\` runs **before** paint, \`useEffect\` after.
- **Update**: render → the **previous** layout effect's cleanup → the new layout effect → the previous passive cleanup → the new passive effect. Cleanup of the old always precedes setup of the new, per hook.
- **Unmount**: cleanups only, layout before passive.
- An effect's cleanup is not just "on unmount" — it runs **before every re-run**, which is what makes subscriptions and timers safe.
- \`useEffect\` with \`[]\` is *not* exactly \`componentDidMount\`: in **StrictMode development** React mounts, unmounts and remounts, so it runs twice. That is a test of your cleanup, not a bug.
- There is no lifecycle hook for "props changed" — you express that as a dependency array, or derive the value during render.
- The render phase must be **pure**; anything with a side effect belongs in an effect.

**Clarifying questions expected:**
- "Function components or class components?" — the class names still come up in interviews.
- "Do you need this before the browser paints?" — that is the \`useLayoutEffect\` question.

**Code / implementation expected:** Optional. A component that logs each phase makes the ordering concrete.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes hooks basics.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every ordering below is **executed output from React 19.2.8**, not a description — the raw sequences are in sections 3 and 5.

## 1. Why This Even Matters — A Story First

A market stall has three moments: setting up before opening, adjusting through the day as stock changes, and packing away at close.

The part people get wrong is the middle one. Adjusting is not one action — it is **taking the old display down and putting the new one up**, in that order. Try it the other way and you have two displays on one table.

React does the same thing, and the ordering is the interesting part.

## 2. The three phases

📌 **Interview term: mount** — the component appears for the first time. React renders, commits to the DOM, then runs effects.

📌 **Interview term: update** — props or state changed. React re-renders and runs whichever effects have changed dependencies, **cleaning up the previous run first**.

📌 **Interview term: unmount** — the component is removed. Only cleanups run.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Mount runs render then layout effect then effect while update cleans up before setting up again">
  <defs>
    <marker id="lc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Cleanup of the old always precedes setup of the new</text>
  <text class="d-text d-accent" x="52" y="72" text-anchor="middle">mount</text>
  <rect class="d-box-accent" x="110" y="48" width="130" height="42" rx="8"/>
  <text class="d-sub" x="175" y="74" text-anchor="middle">render</text>
  <path class="d-edge-accent" d="M 246 69 L 286 69" marker-end="url(#lc-arrow)"/>
  <rect class="d-box-accent" x="292" y="48" width="150" height="42" rx="8"/>
  <text class="d-sub" x="367" y="74" text-anchor="middle">layout effect</text>
  <path class="d-edge-accent" d="M 448 69 L 488 69" marker-end="url(#lc-arrow)"/>
  <rect class="d-box-accent" x="494" y="48" width="150" height="42" rx="8"/>
  <text class="d-sub" x="569" y="74" text-anchor="middle">effect, after paint</text>
  <text class="d-text" x="52" y="150" text-anchor="middle">update</text>
  <rect class="d-box" x="110" y="126" width="130" height="42" rx="8"/>
  <text class="d-sub" x="175" y="152" text-anchor="middle">render</text>
  <path class="d-edge" d="M 246 147 L 286 147" marker-end="url(#lc-arrow)"/>
  <rect class="d-box-muted" x="292" y="126" width="150" height="42" rx="8"/>
  <text class="d-sub" x="367" y="152" text-anchor="middle">OLD cleanup</text>
  <path class="d-edge" d="M 448 147 L 488 147" marker-end="url(#lc-arrow)"/>
  <rect class="d-box" x="494" y="126" width="150" height="42" rx="8"/>
  <text class="d-sub" x="569" y="152" text-anchor="middle">NEW effect</text>
  <rect class="d-box-muted" x="180" y="186" width="320" height="34" rx="8"/>
  <text class="d-sub" x="340" y="208" text-anchor="middle">unmount runs cleanups only</text>
</svg>

## 3. Verified: the exact ordering

A component with both a <code>useLayoutEffect</code> and a <code>useEffect</code>, keyed on a prop <code>n</code>, logged through a mount, an update and an unmount:

\`\`\`
MOUNT:   render n=1 -> layout effect n=1 -> effect n=1

UPDATE:  render n=2 -> layout CLEANUP n=1 -> layout effect n=2
                    -> effect CLEANUP n=1 -> effect n=2

UNMOUNT: layout CLEANUP n=2 -> effect CLEANUP n=2
\`\`\`

Three things worth reading carefully.

📌 **Interview term:** **render comes first and alone.** React finishes rendering before any effect runs, which is why the render phase must be **pure** — React may render without committing.

📌 **Interview term:** on update, **cleanup precedes setup for each hook**. The old subscription is torn down before the new one is created, which is what stops duplicates accumulating.

📌 **Interview term:** the **layout pair completes before the passive pair begins**. Both layout cleanup and layout effect run, then both passive ones — not interleaved by hook order.

## 4. Mapping the class names

Interviewers still ask in class vocabulary. The honest answer is that the mapping is close but not exact:

| Class method | Hook equivalent |
| :--- | :--- |
| <code>componentDidMount</code> | <code>useEffect(fn, [])</code> — with the StrictMode caveat below |
| <code>componentDidUpdate</code> | <code>useEffect(fn, [deps])</code> — fires on mount too |
| <code>componentWillUnmount</code> | The cleanup returned from <code>useEffect</code> |
| <code>getDerivedStateFromProps</code> | Derive it during render; no hook needed |
| <code>shouldComponentUpdate</code> | <a href="PASTE_MEMO_LIMITS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>React.memo</code></a> |
| <code>componentDidCatch</code> | **No hook** — still requires a class error boundary |

📌 **Interview term:** the mismatch worth naming is that hooks are organised **by concern, not by phase**. One effect owns a subscription across its whole life — setup and teardown side by side — rather than being split across two class methods that sat two hundred lines apart.

## 5. Verified: <code>useEffect(fn, [])</code> is not <code>componentDidMount</code>

Under <code>StrictMode</code> in development:

\`\`\`
effects on a StrictMode mount:  effect -> cleanup -> effect
\`\`\`

📌 **Interview term:** React deliberately mounts, unmounts and remounts to surface effects that are not **idempotent**. If the doubled run breaks something — two subscriptions, a duplicate request, a counter that increments twice — the cleanup is incomplete. It is a **test**, not a bug, and it is development-only.

## 6. What has no lifecycle hook

- **"A prop changed."** Express it as a dependency array, or just derive the value during render — no effect needed to compute something from props.
- **"Before the first render."** There is no such moment for a function component; initialise with a lazy <code>useState</code> initialiser.
- **"Catch an error from a child."** Still a class error boundary; see <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundaries</a>.

## 7. Common Pitfalls

- **Treating <code>[]</code> as <code>componentDidMount</code>.** Verified: StrictMode runs it twice in development.
- **Thinking cleanup means "on unmount".** It runs before **every** re-run.
- **Side effects during render.** Render must be pure; React may render without committing.
- **<code>useLayoutEffect</code> by default.** It blocks paint; use it only for measurement before the user sees anything.
- **Syncing props into state with an effect.** Derive during render instead.
- **Expecting effects on the server.** They never run there — see <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">SSR</a>.
- **Omitting cleanup for subscriptions and timers.** StrictMode exists to catch exactly this.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the phases:</strong> <span style="color:#f0e2c8;">"Mount, update, unmount. In function components those are expressed with effects rather than named methods, but the phases are the same."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the mount order:</strong> <span style="color:#f0e2c8;">"Render, then layout effects, then the browser paints, then passive effects. useLayoutEffect is before paint, useEffect after."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Get the update order right:</strong> <span style="color:#f0e2c8;">"Render, then the OLD effect's cleanup, then the new one — per hook, cleanup before setup. That is what stops subscriptions accumulating."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correct the common shortcut:</strong> <span style="color:#f0e2c8;">"An empty dependency array is not componentDidMount. In StrictMode development React mounts, unmounts and remounts, so it runs twice — deliberately, to test your cleanup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the conceptual shift:</strong> <span style="color:#f0e2c8;">"Hooks organise by concern rather than by phase — a subscription's setup and teardown sit together, instead of being split across two class methods."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does an effect's cleanup run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before every re-run, and once more on unmount — not only on unmount, which is the common misreading. I have logged it: on an update the previous cleanup fires before the new effect. That ordering is what makes an effect that subscribes safe, because the old subscription is gone before the new one exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my effect run twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">StrictMode in development mounts, unmounts and remounts every component — I have measured effect, cleanup, effect. It is checking that your effect can be torn down and set up again without damage. If the doubled run causes a problem, the cleanup is incomplete, and that same incompleteness would bite in production the first time the component remounts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useEffect</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useLayoutEffect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timing relative to paint. Layout effects run synchronously after the DOM is updated but before the browser paints, so you can measure and adjust without the user seeing an intermediate state — at the cost of blocking the paint. Passive effects run after. Default to useEffect and reach for the other only when a flicker proves you need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaced <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getDerivedStateFromProps</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing, deliberately — you compute the value during render. Most uses of it were syncing a prop into state, which creates two sources of truth and a render where they disagree. If you genuinely need to reset state when a prop changes, changing the component's key is the idiomatic way, because it remounts and the state starts fresh.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a hook for error boundaries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Catching a render error from a subtree still requires a class component with componentDidCatch or getDerivedStateFromError — it is the one lifecycle capability hooks never gained. In practice people use a library wrapper, but the boundary underneath it is still a class.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Mount** | The component appears for the first time |
| **Update** | Props or state changed and it re-rendered |
| **Unmount** | The component is removed; cleanups run |
| **Layout effect** | Runs after DOM update, before paint |
| **Passive effect** | Runs after paint |
| **Idempotent effect** | Safe to run, clean up, and run again |

---
**Conclusion:** the lifecycle is still mount, update, unmount — expressed as effects rather than named methods. Verified ordering on React 19.2.8: mount is <strong>render → layout effect → effect</strong>; update is <strong>render → the old layout cleanup → the new layout effect → the old passive cleanup → the new passive effect</strong>, so cleanup always precedes setup per hook; unmount runs cleanups only. Two corrections worth carrying into an interview: an effect's cleanup runs **before every re-run**, not just on unmount, and <code>useEffect(fn, [])</code> is **not** <code>componentDidMount</code> — StrictMode in development runs effect, cleanup, effect, deliberately, as a test that your teardown is complete.`,
    examples: [
      {
        label: "A component that logs every phase as you mount, update and unmount it",
        runnable: true,
        code: `import { useState, useEffect, useLayoutEffect, StrictMode } from "react";

// Logs are pushed into a module-level array and read by the parent, so logging
// never schedules a render of its own.
const LOG = [];
const say = (s) => LOG.push(s);

function Tracked({ n }) {
  say("render n=" + n);

  useLayoutEffect(() => {
    say("  layout effect n=" + n + "  (DOM updated, before paint)");
    return () => say("  layout CLEANUP n=" + n);
  }, [n]);

  useEffect(() => {
    say("  effect n=" + n + "  (after paint)");
    return () => say("  effect CLEANUP n=" + n);
  }, [n]);

  return <span style={{ fontSize: 13 }}>value: {n}</span>;
}

export default function App() {
  const [n, setN] = useState(1);
  const [mounted, setMounted] = useState(true);
  const [strict, setStrict] = useState(false);
  const [, refresh] = useState(0);

  const show = () => refresh((v) => v + 1);
  const child = mounted ? <Tracked key={strict ? "s" : "n"} n={n} /> : null;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => { setN((v) => v + 1); setTimeout(show, 0); }}>update prop</button>
        <button onClick={() => { setMounted((m) => !m); setTimeout(show, 0); }}>
          {mounted ? "unmount" : "mount"}
        </button>
        <button onClick={() => { setStrict((s) => !s); setTimeout(show, 0); }}>
          StrictMode: {strict ? "on" : "off"}
        </button>
        <button onClick={() => { LOG.length = 0; show(); }}>clear log</button>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        {strict ? <StrictMode>{child}</StrictMode> : child}
        {!mounted && <em style={{ fontSize: 13, color: "#999" }}>(unmounted)</em>}
      </div>

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, minHeight: 150, overflowX: "auto" }}>
{LOG.length ? LOG.join("\\n") : "press a button, then read the order"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Press "update prop" and read the order: render, then the OLD layout
        cleanup, the new layout effect, the OLD passive cleanup, the new passive
        effect. Cleanup before setup, layout pair before passive pair. Then turn
        StrictMode on and watch the mount run effect, cleanup, effect — that is
        React testing whether your teardown is complete.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the concept of reconciliation in React.",
    seoDescription:
      "React matches old and new trees by position, type and key. Verified: prepending a row with key=index moved a ticked checkbox onto the wrong row entirely.",
    description: `**Question presented to candidate:**
"React re-renders and produces a new element tree. How does it decide what to actually change in the DOM — and why does \`key\` matter so much?"

**What a strong answer should cover:**
- Reconciliation is React comparing the **new element tree against the previous one** and applying the minimum set of DOM operations. It is not comparing against the DOM itself.
- A general tree diff is O(n³), so React uses two **heuristics** to make it O(n).
- **Heuristic 1 — different type means discard.** If the element type at a position changed, React unmounts that subtree and mounts a new one. All state is lost.
- **Heuristic 2 — keys identify siblings across renders.** Within a list, the key tells React that "this is the same item as before", even if its position moved.
- **Position is the default identity.** Without keys, React pairs children by index — so inserting at the front makes every subsequent item look "changed".
- The practical consequence: **index keys are wrong whenever the list can reorder, insert or delete**, because component state and DOM state stay bound to the position, not the item.
- Same type and same key means React **reuses** the instance: state survives, only the changed props are applied.
- Changing a component's \`key\` is the deliberate way to **reset its state**.

**Clarifying questions expected:**
- "Can this list reorder, or have items inserted anywhere but the end?" — that decides whether index keys are acceptable.
- "Do the rows hold their own state — inputs, toggles, animations?"

**Code / implementation expected:** Optional. Demonstrating a checkbox landing on the wrong row is far more convincing than describing it.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes rendering basics.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every behaviour below was **executed against React 19.2.8**, including the misassigned checkbox in section 5 — raw output included.

## 1. Why This Even Matters — A Story First

A theatre reuses its cast between two performances of the same play.

The sensible way to decide who plays whom is by **name on the call sheet**: Ada plays the lead in both. The lazy way is by **where they stood last night**: whoever is first in the line is the lead.

Both work perfectly, right up until someone new joins at the front of the queue. Then everyone is playing the wrong part — and nobody notices until the wrong actor delivers someone else's line.

That is index keys.

## 2. The Core Idea

📌 **Interview term: reconciliation** — the process of comparing the newly rendered element tree with the previous one and working out the **minimum set of DOM operations** to make the DOM match.

React compares **tree against tree**, not against the DOM. The DOM is the output; the previous tree is the reference.

📌 **Interview term:** an exact tree diff is **O(n³)**, which is unusable. React gets to **O(n)** by assuming two things that are almost always true in practice — and those two assumptions are the whole of what you need to know.

## 3. Heuristic 1 — different type means discard

📌 **Interview term:** if the element **type** at a given position changed — <code>div</code> to <code>section</code>, or <code>ProfileCard</code> to <code>UserCard</code> — React does not attempt to diff them. It **unmounts the old subtree and mounts a new one**, and all state inside is lost.

Verified — a counter clicked twice, then its wrapper swapped from <code>&lt;div&gt;</code> to <code>&lt;section&gt;</code>:

\`\`\`
after 2 clicks inside a <div>:            "count 2"   mounts: 1
after swapping the wrapper to <section>:  "count 0"   mounts: 2
\`\`\`

The counter is **identical code in both branches**. Only its parent's type changed, and the state was destroyed.

📌 **Interview term:** the mirror case — same type, different props — reuses the instance:

\`\`\`
label changed "a" -> "b":  "b 1"   mounts: 1
\`\`\`

Still mounted once, and the count of 1 survived. **Type is identity; props are just data.**

## 4. Heuristic 2 — keys identify siblings

Within a list, React needs to know which new child corresponds to which old one. By default it uses **position**: first with first, second with second.

📌 **Interview term: <code>key</code>** — an explicit identity for a sibling that survives reordering. With keys, React matches by key instead of by index, so it can move a child rather than rebuilding it.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="With index keys state stays with the position while stable keys move state with the item">
  <defs>
    <marker id="rc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Prepend Zoe. Where does the tick go?</text>
  <text class="d-text" x="48" y="72" text-anchor="middle">before</text>
  <rect class="d-box-accent" x="100" y="48" width="120" height="38" rx="8"/>
  <text class="d-sub" x="160" y="72" text-anchor="middle">Ann — ticked</text>
  <rect class="d-box-muted" x="232" y="48" width="100" height="38" rx="8"/>
  <text class="d-sub" x="282" y="72" text-anchor="middle">Ben</text>
  <rect class="d-box-muted" x="344" y="48" width="100" height="38" rx="8"/>
  <text class="d-sub" x="394" y="72" text-anchor="middle">Cal</text>
  <text class="d-text" x="48" y="142" text-anchor="middle">index</text>
  <rect class="d-box" x="100" y="118" width="120" height="38" rx="8"/>
  <text class="d-sub" x="160" y="142" text-anchor="middle">Zoe — ticked</text>
  <rect class="d-box-muted" x="232" y="118" width="100" height="38" rx="8"/>
  <text class="d-sub" x="282" y="142" text-anchor="middle">Ann</text>
  <rect class="d-box-muted" x="344" y="118" width="100" height="38" rx="8"/>
  <text class="d-sub" x="394" y="142" text-anchor="middle">Ben</text>
  <rect class="d-box-muted" x="456" y="118" width="100" height="38" rx="8"/>
  <text class="d-sub" x="506" y="142" text-anchor="middle">Cal</text>
  <text class="d-text d-accent" x="48" y="200" text-anchor="middle">id</text>
  <rect class="d-box-muted" x="100" y="176" width="120" height="38" rx="8"/>
  <text class="d-sub" x="160" y="200" text-anchor="middle">Zoe</text>
  <rect class="d-box-accent" x="232" y="176" width="100" height="38" rx="8"/>
  <text class="d-sub" x="282" y="200" text-anchor="middle">Ann — ticked</text>
  <rect class="d-box-muted" x="344" y="176" width="100" height="38" rx="8"/>
  <text class="d-sub" x="394" y="200" text-anchor="middle">Ben</text>
  <rect class="d-box-muted" x="456" y="176" width="100" height="38" rx="8"/>
  <text class="d-sub" x="506" y="200" text-anchor="middle">Cal</text>
</svg>

## 5. Verified: the tick lands on the wrong row

Three rows, each with its own checkbox state. **Ann is ticked.** Then a new row, Zoe, is prepended.

\`\`\`
key={index}    before:  Ann[x] Ben[ ] Cal[ ]
               after:   Zoe[x] Ann[ ] Ben[ ] Cal[ ]

key={item.id}  before:  Ann[x] Ben[ ] Cal[ ]
               after:   Zoe[ ] Ann[x] Ben[ ] Cal[ ]
\`\`\`

📌 **Interview term:** with index keys the tick **stayed at position 0** and is now on Zoe, a row the user has never seen. With stable keys it **followed Ann** to her new position.

Nothing errored. Nothing warned. The data is simply wrong, and in a real form this is a user submitting the wrong record.

## 6. The rule, stated precisely

| Situation | React does |
| :--- | :--- |
| Same position, same type, same key | **Reuses** the instance; state survives |
| Same position, **different type** | Unmounts and remounts; state lost |
| Same list, **matching keys** | Moves the existing instance |
| Same list, **no keys** | Pairs by index — position is identity |
| **Key changed** on the same element | Treated as a different component; state reset |

📌 **Interview term:** index keys are **fine for a static list** that never reorders, never has insertions except at the end, and never deletes. The moment any of those is false, they are a bug waiting for the right data.

📌 **Interview term:** and the last row is a **feature**. Changing a component's <code>key</code> is the idiomatic way to **reset its state** — a form that should clear when you switch records is <code>&lt;Form key={recordId} /&gt;</code>, no effect required.

## 7. Common Pitfalls

- **Index keys on a reorderable list.** Verified: the tick moved to the wrong row, silently.
- **<code>key={Math.random()}</code>.** A new key every render remounts everything, every time.
- **Assuming keys are for performance.** They are for **correctness**; performance is a side effect.
- **Keys unique across the whole app.** They only need to be unique **among siblings**.
- **Putting the key on the wrong element.** It belongs on the outermost element inside <code>map</code>.
- **Changing an element type unnecessarily.** Two branches rendering different wrappers destroy state on every switch.
- **Forgetting keys reset state deliberately.** That is a tool, not only a hazard.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it precisely:</strong> <span style="color:#f0e2c8;">"React compares the new element tree against the previous one and works out the minimum DOM changes. It is tree against tree, not against the DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain why heuristics exist:</strong> <span style="color:#f0e2c8;">"An exact tree diff is cubic, which is unusable. Two assumptions get it to linear — and those two are the whole thing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. First heuristic:</strong> <span style="color:#f0e2c8;">"Different type at a position means discard the subtree. I have measured it — swapping a div for a section around a counter reset it from 2 to 0 and mounted it again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Second heuristic, with the payoff:</strong> <span style="color:#f0e2c8;">"Keys identify siblings across renders. Without them position is identity — so prepending a row moves everyone's state up by one. I have seen a ticked checkbox land on a row the user never touched."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reframe keys and add the flip side:</strong> <span style="color:#f0e2c8;">"Keys are about correctness, not performance. And it cuts both ways — changing a key is the idiomatic way to deliberately reset a component's state."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key={index}</code> actually acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the list never reorders, never has anything inserted except at the end, and never deletes — a static nav, a fixed set of tabs. The moment any of those changes it becomes a silent data-corruption bug, so I would only rely on it where the list genuinely cannot move, and reach for a stable id otherwise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">key={Math.random()}</code> so bad?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because every render produces new keys, so React matches nothing and rebuilds the entire list — unmounting and remounting every row. You lose all state, all focus, all scroll position, and you pay full DOM construction on every render. It usually appears as a fix for a duplicate-key warning, where the real fix is a stable id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are keys a performance optimisation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are a correctness mechanism that also happens to help performance. The corruption case is the one that matters: a checkbox, an input value, an in-flight animation, or a component's own state ending up attached to the wrong item. Framing them as an optimisation is what leads people to think index keys are merely suboptimal rather than wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you deliberately reset a component's state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give it a key tied to whatever should cause the reset — a form keyed by record id starts fresh whenever you switch records. That is the same heuristic used on purpose: a different key means a different component, so React unmounts the old one and mounts a new one with fresh state, and you avoid an effect that syncs props into state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do keys need to be globally unique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — only among siblings, because React only ever matches children against the previous children of the same parent. Two separate lists can both use keys 1, 2, 3 without any interference, which is why a database id is almost always sufficient and there is no need to prefix or namespace them.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reconciliation** | Diffing the new element tree against the previous one |
| **Heuristic** | An assumption that makes the diff linear instead of cubic |
| **<code>key</code>** | Explicit identity for a sibling across renders |
| **Position as identity** | The default pairing when no key is given |
| **Remount** | Unmounting and mounting fresh; all state lost |

---
**Conclusion:** reconciliation is React diffing the **new element tree against the previous one** to find the minimum DOM changes, made linear by two heuristics. First: a **different element type at a position discards the subtree** — verified, swapping a <code>&lt;div&gt;</code> for a <code>&lt;section&gt;</code> around an untouched counter reset it from <code>count 2</code> to <code>count 0</code> and mounted it a second time, while changing only a prop kept its state. Second: **keys identify siblings**, and without them position is identity — verified, prepending a row with <code>key={index}</code> left a ticked checkbox at position 0, now attached to a row the user had never seen, while <code>key={item.id}</code> moved it with its own row. Keys are about **correctness**, not performance; and the same mechanism used deliberately — changing a key — is the cleanest way to reset a component's state.`,
    examples: [
      {
        label: "The same list with index keys and stable keys — prepend a row and watch the tick",
        runnable: true,
        code: `import { useState } from "react";

// Each row holds its OWN state that is not derived from props. That is what
// gets misassigned when React matches children by position.
function Row({ item }) {
  const [checked, setChecked] = useState(false);
  return (
    <label style={{ display: "block", fontSize: 13, padding: "2px 0" }}>
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      {" "}{item.name}
      {checked && <strong style={{ color: "#4f46e5" }}> ← ticked</strong>}
    </label>
  );
}

function List({ title, items, keyBy }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, flex: 1 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <div style={{ marginTop: 6 }}>
        {items.map((it, i) => (
          <Row key={keyBy === "index" ? i : it.id} item={it} />
        ))}
      </div>
    </div>
  );
}

const START = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Cal" },
];

export default function App() {
  const [items, setItems] = useState(START);
  const [n, setN] = useState(0);

  const prepend = () => {
    const names = ["Zoe", "Yan", "Xia"];
    setItems((list) => [{ id: "new" + n, name: names[n % 3] }, ...list]);
    setN((v) => v + 1);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <p style={{ fontSize: 13, margin: "0 0 10px" }}>
        <strong>1.</strong> Tick <em>Ann</em> in both lists. <strong>2.</strong> Press prepend.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <List title="❌ key={index}" items={items} keyBy="index" />
        <List title="✅ key={item.id}" items={items} keyBy="id" />
      </div>

      <button onClick={prepend}>prepend a new row</button>{" "}
      <button onClick={() => { setItems(START); setN(0); }}>reset</button>

      <p style={{ fontSize: 13, color: "#666" }}>
        On the left the tick stays at position 0 and is now attached to a row
        the user has never seen. On the right it follows Ann down. Same data,
        same components — only the key differs. Nothing errors and nothing
        warns, which is exactly what makes this dangerous.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
