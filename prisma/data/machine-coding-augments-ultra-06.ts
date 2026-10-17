/**
 * Machine coding ULTRA — batch 06: form widgets (OTP Input, Star Rating, Tag /
 * Chip Input, Color Picker, Dual Range price Slider, Calculator).
 *
 * Every question carries a plain-markdown Question Body (CLAUDE.md §6) and one
 * bundle per framework (React, Vue, Angular). Each bundle is a full tutorial
 * (a story first, `📌 Interview term:` callouts, `.iq-diagram` SVGs, the build
 * step by step with excerpts taken from the shipped code, a Verified section,
 * an edge-case and accessibility table, pitfalls, the §7 interview card, a
 * glossary and a conclusion) plus a runnable multi-file solution for the
 * site playground. The React answer is the long one and also holds the
 * "Questions to Ask Your Interviewer" table; the Vue and Angular answers stand
 * alone and are written for their own framework.
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs on React
 * 19.3.1, Vue 3.5.44 and Angular 22.2.3 (Angular both AOT with strictTemplates
 * and runtime JIT) in jsdom, driven by one shared driver per question, with no
 * console.error. The three frameworks print identical driver output. Every
 * Verified block quotes that output. Extra checks quoted in the answers: the
 * colour maths was round-tripped over all 16,777,216 RGB colours in Node 22;
 * the dual range slider was dragged with a real mouse, and the calculator's
 * Enter key tested, in Chromium 141 through playwright-core; the experiments
 * behind the Vue and Angular "write the DOM value back" pitfalls were run as
 * modified copies of the shipped solutions.
 *
 * This file is generated: the solutions, drivers, prose and generator live in
 * the batch scratch directory (mc/b06: q1..q6/{react,vue,angular}, driver.mjs,
 * *.md, gen.mjs). It replaces the older shallow OTP and star rating augments
 * (machine-coding-augments-otp.ts / -star-rating.ts), which load earlier.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside SVG blocks,
 * `description` is plain markdown (no HTML), ~~~ fences in answers.
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an OTP Input",
    seoDescription:
      "Build a 6-box OTP input in React, Vue and Angular: auto-advance, Backspace, paste, SMS autofill, focus management and a11y, with verified code.",
    description: `**Question presented to candidate:**
"After sign-in we text the user a 6-digit code. Build the input for it: six separate boxes, one digit each. Typing should jump to the next box, Backspace should feel natural, and pasting the whole code from the clipboard must work. When all six digits are in, verify the code against the server."

**Requirements:**
- Six single-digit boxes; non-digits are ignored.
- Typing a digit moves focus to the next box; typing into a filled box replaces its digit.
- Backspace clears the current box, or, on an empty box, clears and focuses the previous one. ArrowLeft and ArrowRight move between boxes.
- Pasting (or SMS autofill dropping the whole code into one box) fills the boxes from the cursor, skipping spaces and dashes.
- When the sixth digit lands, call a (simulated) verify API once; disable the boxes while it runs; on a wrong code, clear the boxes and focus the first one.
- Accessible: a labelled group, a label per box, the numeric keypad on phones, and \`autocomplete="one-time-code"\`.

**What a strong answer should cover:**
- The state model: one array of strings as the single source of truth, plus refs to the DOM inputs used only to move focus.
- Firing "complete" from the event handler that filled the last box, not from an effect that watches the array.
- Keyboard edge cases: Backspace on an empty box, replacing a digit, ignoring letters, arrow keys.
- Paste and autofill handling with \`preventDefault\`, and why \`maxLength={1}\` breaks them.
- Accessibility: \`role="group"\` with a label, \`aria-label\` per box, \`inputMode="numeric"\`, \`autocomplete="one-time-code"\`, a \`role="status"\` message.
- How the parent resets the widget after a wrong code (a \`key\` change in React and Vue, a method call through \`@ViewChild\` in Angular).

**Clarifying questions expected:**
- "Digits only, or alphanumeric codes too? Is the length always 6?"
- "Should we submit automatically on the last digit, or wait for a Verify button?"
- "What should happen after a wrong code: keep the digits for editing, or clear them?"

**Code / implementation expected:** Yes. A working component in the candidate's framework with typing, Backspace, arrows, paste and a simulated verify call; tests or a driver script are a bonus.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know a little React (components, \`useState\`), nothing more is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All code excerpts are copied from the runnable solution, and the output in the Verified section was printed by actually running it on React 19.3.1.

## 1. Why This Even Matters — A Story First

Think of a bank vault with six little dials. The guard reads you a code over the phone: "2, 4, 6, 8, 1, 0". You turn the first dial, then your hand naturally moves to the second, and so on. If you turn a dial wrong, you go back one. If the guard instead hands you a sticky note with the whole code, you want to slap the note on the door and have all six dials turn at once.

An **OTP input** (one-time password input) is that row of dials on a screen. It shows up after a login, a payment or a phone-number change, so it sits right on the path to money and accounts. It looks like six text boxes, but users judge it on how it *feels*: does the cursor jump forward, does Backspace go back, does pasting work, does the phone offer the code from the SMS? Each of those is a small piece of **focus management**, which is exactly why interviewers love it: forty lines of code touch state, refs, keyboard events, clipboard events and accessibility at once.

📌 **Interview term: Focus management** — deciding in code which element has keyboard focus, by calling <code>element.focus()</code>, instead of leaving the user to click or Tab there. In an OTP input the code moves focus after every digit, Backspace and paste.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Digits only, or letters too? Always 6 long? | Decides the filter (<code>[0-9]</code> or alphanumeric) and whether <code>length</code> is a prop. |
| Submit automatically on the last digit, or with a button? | Auto-submit means you need "complete" to fire exactly once, from the right place. |
| What happens after a wrong code? | Clear and refocus the first box, or keep digits for editing? It changes the reset design. |
| Must SMS autofill work on phones? | Then you need <code>autocomplete="one-time-code"</code> and must handle the whole code arriving in one box. |
| Is there a resend timer or attempt limit? | Usually out of scope for the widget, but worth naming so you can leave a hook for it. |

For this build we assume: digits only, length 6, auto-submit, clear and refocus on a wrong code, autofill supported.

## 3. Requirements and Plan

The solution has three files: <code>/App.js</code> (the page and the verify flow), <code>/src/OtpInput.js</code> (the reusable widget) and <code>/src/fakeApi.js</code> (a simulated server, because the playground has no network).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Component tree: App owns the status and an attempt counter, renders OtpInput with a key, and calls the fake verify API. OtpInput owns the six digit values and an array of input refs.">
  <defs>
    <marker id="mc06q1r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="230" y="20" width="220" height="64" rx="10"/>
  <text class="d-text d-accent" x="340" y="46" text-anchor="middle">App</text>
  <text class="d-sub" x="340" y="68" text-anchor="middle">status, attempt (key)</text>
  <rect class="d-box" x="40" y="190" width="260" height="76" rx="10"/>
  <text class="d-text" x="170" y="218" text-anchor="middle">OtpInput key=attempt</text>
  <text class="d-sub" x="170" y="242" text-anchor="middle">values: six strings, inputs: refs</text>
  <rect class="d-box-muted" x="420" y="190" width="220" height="76" rx="10"/>
  <text class="d-text" x="530" y="218" text-anchor="middle">fakeApi.verifyCode</text>
  <text class="d-sub" x="530" y="242" text-anchor="middle">Promise, 400 ms delay</text>
  <path class="d-edge-accent" d="M 280 90 L 200 184" marker-end="url(#mc06q1r-arrow)"/>
  <text class="d-sub" x="150" y="140" text-anchor="middle">disabled, onComplete</text>
  <path class="d-edge-dashed" d="M 400 90 L 490 184" marker-end="url(#mc06q1r-arrow)"/>
  <text class="d-sub" x="530" y="140" text-anchor="middle">await verifyCode(code)</text>
</svg>

The parent passes <code>disabled</code> and an <code>onComplete</code> callback down; the widget calls <code>onComplete(code)</code> up when all six boxes are filled. The parent awaits the fake API and decides what happens next.

**The state model** is the heart of the answer, so say it out loud before coding:

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>values</code>: six strings | State (<code>useState</code>) | The single source of truth. The boxes render from it. |
| <code>inputs</code>: six DOM nodes | Ref (<code>useRef</code>) | Only used to call <code>focus()</code>; changing it must not re-render. |
| The joined code | Derived | <code>values.join("")</code> when needed, never stored separately. |
| <code>status</code>, <code>attempt</code> | State in the parent | The widget does not know about servers; the page does. |

📌 **Interview term: Single source of truth** — one piece of state that everything else is computed from. Here the boxes, the "is it complete" check and the code string all come from the one <code>values</code> array, so they can never disagree.

📌 **Interview term: Controlled input** — an input whose displayed value comes from React state (<code>value={v}</code>) and changes only through <code>onChange</code>. See [controlled vs uncontrolled components](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components).

## 4. Build It Step by Step

### 4.1 State plus one ref per box

~~~jsx
export default function OtpInput({ length = 6, disabled = false, onComplete }) {
  // State: one string per box. Refs: the
  // DOM inputs, only needed to move focus.
  const [values, setValues] = useState(() => Array(length).fill(""));
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus(); // safe to run twice under StrictMode
  }, []);
~~~

The array of refs lives in a [useRef](/interview-question/describe-the-useref-hook-and-its-typical-use-cases), filled by a ref callback on each input. The effect focuses the first box on mount. Under <code>StrictMode</code> React runs mount effects twice in development; calling <code>focus()</code> twice is harmless, which is the test every effect should pass.

~~~jsx
ref={(el) => {
  inputs.current[i] = el;
}}
~~~

The braces matter a little in React 19: a function *returned* from a ref callback is now treated as its cleanup. In react-dom 19.3.1 the commit phase stores <code>refCleanup = ref(instance)</code> and, on detach, calls that cleanup instead of <code>ref(null)</code>. Returning the element by accident (<code>el => (inputs.current[i] = el)</code>) does not break at runtime because it is not a function, but the block body states the intent and keeps TypeScript quiet. More in [ref handling in React 19](/interview-question/how-did-ref-handling-change-in-react-19-ref-as-a-prop-forwardref-ref-cleanup).

### 4.2 One place that writes state and reports completion

~~~jsx
function focusBox(i) {
  const el = inputs.current[Math.max(0, Math.min(length - 1, i))];
  el?.focus();
  el?.select();
}

// Every change goes through here, so onComplete fires from the event,
// exactly once, instead of from an effect watching values.
function commit(next) {
  setValues(next);
  if (next.every((v) => v !== "")) onComplete?.(next.join(""));
}

function fillFrom(start, digits) {
  const next = [...values];
  let i = start;
  for (const d of digits) {
    if (i >= length) break;
    next[i++] = d;
  }
  commit(next);
  focusBox(i);
}
~~~

Every change goes through <code>commit()</code>. It sets state and, when all six boxes are filled, calls <code>onComplete</code> right there, inside the event that filled the last box. The tempting alternative is a <code>useEffect</code> that watches <code>values</code> and fires when the array is full. That version fires an extra time in development under StrictMode's mount double-run when the initial value is already complete, fires again if the parent re-renders with a new callback in its dependency list, and adds a render of delay. An event caused it, so the event handler reports it.

📌 **Interview term: Derived event** — a notification ("the code is complete") computed from the next state at the moment you set it, in the handler, instead of by watching state in an effect.

<code>fillFrom(start, digits)</code> writes several digits starting at one box. Paste and SMS autofill both use it, and it moves focus to the box after the last digit (or the last box).

### 4.3 Typing: replace, ignore, advance

~~~jsx
function handleChange(i, e) {
  const raw = e.target.value;
  const digits = onlyDigits(raw);
  if (raw === "")
    return commit(values.map((v, j) => (j === i ? "" : v)));
  // a letter: ignore, React restores the old value
  if (digits === "") return;
  // SMS autofill drops the whole code in one box
  if (digits.length > 2) return fillFrom(i, digits);
  // One new digit, possibly next to the old
  // one ("37" or "73"): keep the new one.
  const d =
    digits.length === 2 && values[i] && digits[0] !== values[i]
      ? digits[0]
      : digits.slice(-1);
  commit(values.map((v, j) => (j === i ? d : v)));
  if (i < length - 1) focusBox(i + 1);
}
~~~

Read it as four rules:

1. **Cleared box** (<code>raw === ""</code>): store an empty string.
2. **A letter**: ignore it. Because the input is controlled and state did not change, React puts the old value back in the DOM after the event.
3. **More than two digits at once**: that is SMS autofill or a browser putting the whole code into one box, so treat it like a paste.
4. **One new digit**: the box can now hold two characters, the old one and the new one, in either order depending on where the caret was. Keep the one that is *not* the old digit, then advance.

That is also why there is no <code>maxLength={1}</code>. With a one-character limit, typing into a full box does nothing (the browser refuses the second character), and autofill of six digits is cut to one. Selecting the box text on focus (<code>onFocus={(e) => e.target.select()}</code>) makes the common case even simpler, because the new digit replaces the selection.

### 4.4 Keyboard: Backspace and arrows

~~~jsx
function handleKeyDown(i, e) {
  if (e.key === "Backspace") {
    e.preventDefault();
    if (values[i]) commit(values.map((v, j) => (j === i ? "" : v)));
    else if (i > 0) {
      commit(values.map((v, j) => (j === i - 1 ? "" : v)));
      focusBox(i - 1);
    }
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    focusBox(i - 1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    focusBox(i + 1);
  }
}
~~~

Backspace is handled in <code>keydown</code>, before the browser edits the value, and <code>preventDefault()</code> stops the browser from doing its own deletion on top. On a filled box it clears that box and stays. On an empty box it clears the previous box and moves there, which is what users expect after typing a wrong digit and seeing the cursor already one box ahead. ArrowLeft and ArrowRight call <code>focusBox(i - 1)</code> and <code>focusBox(i + 1)</code>; <code>focusBox</code> clamps the index, so the ends are safe.

### 4.5 Paste

~~~jsx
function handlePaste(i, e) {
  e.preventDefault();
  const digits = onlyDigits(e.clipboardData.getData("text"));
  if (digits) fillFrom(i, digits);
}
~~~

<code>preventDefault()</code> stops the browser from inserting "24-68 10" into one box. The handler strips everything that is not a digit and fills from the box that had focus, so pasting into box 0 fills all six.

### 4.6 The parent: verify, disable, reset with a key

~~~jsx
async function handleComplete(code) {
  setStatus({ kind: "busy", text: "Verifying " + code + "..." });
  const ok = await verifyCode(code);
  if (ok)
    setStatus({
      kind: "ok",
      text: "Code accepted. You are signed in.",
    });
  else {
    setStatus({
      kind: "error",
      text: "That code is not right. Try again.",
    });
    setAttempt((n) => n + 1);
  }
}

// in the JSX:
<OtpInput
  key={attempt}
  length={6}
  disabled={status.kind === "busy" || status.kind === "ok"}
  onComplete={handleComplete}
/>
~~~

While the fake request runs, the parent passes <code>disabled</code>, so nobody can edit the code that is being checked; that removes a whole class of race conditions without any request IDs. On a wrong code it bumps <code>attempt</code>. Because <code>attempt</code> is the <code>key</code> of <code>OtpInput</code>, React throws the old instance away and mounts a fresh one: empty boxes, and the mount effect focuses box 0. No <code>reset()</code> method, no effect that copies props into state. See [resetting state with the key prop](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state).

📌 **Interview term: Key reset** — changing a component <code>key</code> to make React discard its state and mount a new instance. It is the idiomatic way to "start over" a self-contained widget.

The fake server lives in <code>/src/fakeApi.js</code>: <code>verifyCode(code)</code> returns a Promise that resolves after 400 ms with <code>code === "246810"</code>. It is simulated; in a real app this would be a <code>fetch</code> to your auth endpoint.

## 5. Verified: What the Solution Printed

The solution was bundled with esbuild and mounted in jsdom exactly as the playground does (<code>createRoot</code> plus <code>StrictMode</code>), then driven by a script that types with real <code>input</code> events, presses keys with real <code>keydown</code> events, and pastes. jsdom cannot build a real <code>ClipboardEvent</code> with data, so the driver dispatches a <code>paste</code> event with a <code>clipboardData.getData</code> attached by hand. Each line shows the six boxes (<code>_</code> is empty), which box has focus, and the status text:

~~~text
[react] RENDERED: Verify your phoneEnter the 6-digit code we sent to your phone.Start overDemo: the right code is 246810 (the server is simulated).
[react] mounted                        boxes: ______ | focus: 0 | status: Enter the 6-digit code we sent to your phone.
[react] typed 1, 2                     boxes: 12____ | focus: 2 
[react] typed x into box 2             boxes: 12____ | focus: 2 
[react] box 1: typed 7 after the 2     boxes: 17____ | focus: 2 
[react] box 1: typed 7 again           boxes: 17____ | focus: 2 
[react] box 1: typed 5 before the 7    boxes: 15____ | focus: 2 
[react] Backspace on empty box 2       boxes: 1_____ | focus: 1 
[react] ArrowRight from box 1          boxes: 1_____ | focus: 2 
[react] pasted 13-57 99 into box 0     boxes: 135799 | focus: 5 | status: Verifying 135799...
[react] after fake server              boxes: ______ | focus: 0 | status: That code is not right. Try again.
[react] pasted 246810                  boxes: 246810 | focus: 5 | status: Verifying 246810...
[react] disabled while verifying: true
[react] after fake server              boxes: 246810 | focus: 5 | status: Code accepted. You are signed in.
[react] aria-labels: Digit 1 of 6, Digit 2 of 6 ...
[react] autocomplete on box 0: one-time-code | inputmode: numeric
~~~

Things worth noticing:

- **"typed x into box 2"**: the letter never appears; React restored the controlled value.
- **"typed 7 after the 2"** and **"typed 5 before the 7"**: the box held two characters each time, and the code kept the new one in both caret positions.
- **"Backspace on empty box 2"**: box 1 was cleared and focused.
- **"pasted 13-57 99"**: dashes and spaces were stripped, all six boxes filled, the request started, and the boxes were disabled. After the simulated 400 ms the wrong code remounted the widget (empty, focus on box 0).
- The run printed no <code>console.error</code>, so there were no React warnings either.

What jsdom cannot show: the phone keypad from <code>inputMode</code>, the SMS suggestion from <code>autocomplete="one-time-code"</code>, and real clipboard permission prompts. Those need a real device; the code paths they trigger (an <code>input</code> event with many digits, a <code>paste</code> event) are the ones verified above.

## 6. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Letter or symbol typed | Ignored; the box keeps its digit |
| Same digit typed again into a filled box | Box keeps it and focus moves on |
| Paste with spaces and dashes | Non-digits stripped, then filled from the focused box |
| Paste longer than the remaining boxes | Extra digits dropped |
| SMS autofill puts "246810" into box 0 | Treated as a paste (more than two digits in one input event) |
| Request in flight | All boxes <code>disabled</code>, so the code cannot change under the request |
| Screen reader | <code>role="group"</code> with <code>aria-label="One-time code"</code>; each box says "Digit 3 of 6"; status text is a <code>role="status"</code> live region |
| Phone keyboard | <code>inputMode="numeric"</code> and <code>pattern="[0-9]*"</code> bring up the digit keypad |
| Autofill | <code>autocomplete="one-time-code"</code> on the first box only |

📌 **Interview term: Live region** — an element (here <code>role="status"</code>) whose text changes are announced by screen readers without moving focus. "Verifying..." and "That code is not right" reach a blind user this way.

If the interviewer pushes on accessibility, mention the alternative design: a single <code>&lt;input maxLength={6}&gt;</code> styled to look like six boxes. Screen readers and password managers handle one field better; the six-box version wins on visual clarity. Knowing both is the senior answer.

## 7. Common Pitfalls

- **<code>maxLength={1}</code> on each box.** It blocks replacing a digit when the caret is after it, and it truncates autofill and some paste paths to a single digit.
- **Firing <code>onComplete</code> from a <code>useEffect</code> on <code>values</code>.** It runs after render, can run twice in StrictMode development, and re-runs when the callback identity changes. Fire it from the handler that completed the code.
- **Handling Backspace in <code>onChange</code>.** On an empty box Backspace changes nothing, so no <code>change</code> event fires and you can never move back. It must be <code>keydown</code>.
- **Forgetting <code>preventDefault()</code> on paste.** The browser inserts the whole clipboard text into one box after your handler has already distributed it.
- **Storing the joined code as separate state.** It can drift from <code>values</code>. Derive it with <code>join("")</code>.
- **Not disabling during verification.** The user edits a digit while the old code is checked, and a late "accepted" arrives for a code that is no longer on screen.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State model first:</strong> <span style="color:#f0e2c8;">"The source of truth is one array of six strings in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code>. I keep a separate array of input refs, only to move focus, so focus changes never cause renders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Typing:</strong> <span style="color:#f0e2c8;">"In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> I filter digits, keep the new character when a box briefly holds two, ignore letters, and focus the next box. No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxLength={1}</code>, because it breaks replacing and autofill."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keyboard and paste:</strong> <span style="color:#f0e2c8;">"Backspace and arrows go in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>. Paste strips non-digits and fills from the focused box; an input event with many digits is SMS autofill and takes the same path."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Completion:</strong> <span style="color:#f0e2c8;">"Every write goes through one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> function that also calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onComplete</code> when all boxes are filled, so it fires once from the event, not from an effect."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Parent and a11y:</strong> <span style="color:#f0e2c8;">"The parent disables the boxes while the simulated request runs and remounts the widget with a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> on a wrong code. A labelled group, a label per box, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputMode=numeric</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">one-time-code</code> autocomplete and a live status region cover accessibility."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it work with letters, like "A7K2Q9"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the filter a prop, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pattern = /[0-9]/</code> by default and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/[A-Z0-9]/i</code> for alphanumeric codes, uppercase on the way in, and switch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputMode</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text</code>. Nothing else changes, because every path (typing, paste, autofill) goes through the same filter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With React Testing Library and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user-event</code>: type digits and assert focus moved, press Backspace on an empty box, paste a string with dashes, and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onComplete</code> was called exactly once with the code. Use fake timers or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findByText</code> for the simulated server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a single input that looks like six boxes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is a valid and often more accessible design: one field, one label, native paste and autofill for free, and you draw six cells with CSS or a background. The six-input version gives clearer per-digit focus styling. Mention both and pick based on the design system.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The user pastes while a request is in flight. What happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing, because the boxes are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code> while verifying. Without that, you would need a request counter in a ref and ignore responses whose counter is stale.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a resend timer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep it in the parent, not the widget: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">secondsLeft</code> state, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> started in an effect with a cleanup that clears it, and a Resend button enabled at zero that calls the API and bumps the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key</code> to clear the boxes.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **OTP input** | A row of boxes for a short one-time code sent by SMS or email |
| **Focus management** | Moving keyboard focus from code with <code>element.focus()</code> |
| **Single source of truth** | One state value that everything else is computed from |
| **Controlled input** | An input whose value comes from state and changes through <code>onChange</code> |
| **Derived event** | Reporting "complete" from the handler that caused it, not from an effect |
| **Key reset** | Changing <code>key</code> so React mounts a fresh component instance |
| **Live region** | An element whose text changes are read out by screen readers |

---
**Conclusion:** A good OTP input is a small exercise in separating data from DOM: one array of digits in state, one array of refs for focus, and every change flowing through a single <code>commit</code> that also reports completion. The keyboard rules (replace, ignore letters, Backspace on empty goes back, arrows), the paste and autofill path, disabling during the simulated request and a <code>key</code> reset after a wrong code were all driven in a real React 19.3.1 render and printed the results above. Lead with the state model, build typing, then Backspace, then paste, and close with accessibility; that order shows an interviewer you know where the hard parts are.`,
        files: {
          "/App.js": `import { useState } from "react";
import OtpInput from "./src/OtpInput";
import { DEMO_CODE, verifyCode } from "./src/fakeApi";

const IDLE = {
  kind: "idle",
  text: "Enter the 6-digit code we sent to your phone.",
};

export default function App() {
  const [status, setStatus] = useState(IDLE);
  // changing the key remounts a fresh, empty OtpInput
  const [attempt, setAttempt] = useState(0);

  async function handleComplete(code) {
    setStatus({ kind: "busy", text: "Verifying " + code + "..." });
    const ok = await verifyCode(code);
    if (ok)
      setStatus({ kind: "ok", text: "Code accepted. You are signed in." });
    else {
      setStatus({ kind: "error", text: "That code is not right. Try again." });
      setAttempt((n) => n + 1);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Verify your phone</h1>
        <OtpInput
          key={attempt}
          length={6}
          disabled={status.kind === "busy" || status.kind === "ok"}
          onComplete={handleComplete}
        />
        <p
          className={"status " + status.kind}
          data-testid="otp-status"
          role="status"
        >
          {status.text}
        </p>
        <button
          type="button"
          className="link"
          onClick={() => {
            setStatus(IDLE);
            setAttempt((n) => n + 1);
          }}
        >
          Start over
        </button>
        <p className="demo">
          Demo: the right code is {DEMO_CODE} (the server is simulated).
        </p>
      </section>
    </main>
  );
}
`,
          "/src/OtpInput.js": `import { useEffect, useRef, useState } from "react";

const onlyDigits = (s) => s.replace(/[^0-9]/g, "");

export default function OtpInput({ length = 6, disabled = false, onComplete }) {
  // State: one string per box. Refs: the DOM inputs, only needed to move focus.
  const [values, setValues] = useState(() => Array(length).fill(""));
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus(); // safe to run twice under StrictMode
  }, []);

  function focusBox(i) {
    const el = inputs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  // Every change goes through here, so onComplete fires from the event,
  // exactly once, instead of from an effect watching values.
  function commit(next) {
    setValues(next);
    if (next.every((v) => v !== "")) onComplete?.(next.join(""));
  }

  function fillFrom(start, digits) {
    const next = [...values];
    let i = start;
    for (const d of digits) {
      if (i >= length) break;
      next[i++] = d;
    }
    commit(next);
    focusBox(i);
  }

  function handleChange(i, e) {
    const raw = e.target.value;
    const digits = onlyDigits(raw);
    if (raw === "") return commit(values.map((v, j) => (j === i ? "" : v)));
    if (digits === "") return; // a letter: ignore, React restores the old value
    // SMS autofill drops the whole code in one box
    if (digits.length > 2) return fillFrom(i, digits);
    // One new digit, possibly next to the old
    // one ("37" or "73"): keep the new one.
    const d =
      digits.length === 2 && values[i] && digits[0] !== values[i]
        ? digits[0]
        : digits.slice(-1);
    commit(values.map((v, j) => (j === i ? d : v)));
    if (i < length - 1) focusBox(i + 1);
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (values[i]) commit(values.map((v, j) => (j === i ? "" : v)));
      else if (i > 0) {
        commit(values.map((v, j) => (j === i - 1 ? "" : v)));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  }

  function handlePaste(i, e) {
    e.preventDefault();
    const digits = onlyDigits(e.clipboardData.getData("text"));
    if (digits) fillFrom(i, digits);
  }

  return (
    <div className="otp" role="group" aria-label="One-time code">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          data-testid={"otp-" + i}
          className="box"
          value={v}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={"Digit " + (i + 1) + " of " + length}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
`,
          "/src/fakeApi.js": `// Simulated server: no network in the playground. Resolves after 400 ms.
export const DEMO_CODE = "246810";

export function verifyCode(code) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(code === DEMO_CODE), 400),
  );
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(420px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
  text-align: center;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 16px;
}
.otp {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.box {
  width: 44px;
  height: 52px;
  font-size: 1.5rem;
  text-align: center;
  border-radius: 8px;
  border: 1px solid #3a4150;
  background: #0f1115;
  color: #fff;
  caret-color: #7aa2ff;
}
.box:focus {
  outline: 2px solid #7aa2ff;
  border-color: transparent;
}
.box:disabled {
  opacity: 0.6;
}
.status {
  min-height: 1.4em;
  margin: 14px 0 6px;
  color: #9aa3b2;
}
.status.ok {
  color: #69f0ae;
}
.status.error {
  color: #ff8a80;
}
.link {
  background: none;
  border: 0;
  color: #7aa2ff;
  cursor: pointer;
  text-decoration: underline;
}
.demo {
  font-size: 0.8rem;
  color: #6b7280;
}
@media (max-width: 380px) {
  .box {
    width: 38px;
    height: 46px;
  }
  .otp {
    gap: 6px;
  }
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know <code>ref()</code> and templates; everything else is explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Every excerpt is from the runnable solution, and the Verified output was printed by mounting it on Vue 3.5.44.

## 1. The Story

An OTP input is the row of six boxes you fill after a bank texts you a code. Think of six dials on a vault door: you turn one, your hand moves to the next, and if a friend hands you a note with the whole code you want all six dials to turn at once. The widget is small, but it tests focus management, keyboard and clipboard events, and accessibility in one go, and it sits on the path to someone's account, so it has to feel right.

📌 **Interview term: Focus management** — moving keyboard focus from code with <code>element.focus()</code>. Here focus moves after every digit, Backspace and paste.

## 2. Requirements and the Vue State Model

Six digit boxes; typing advances; typing into a filled box replaces; letters are ignored; Backspace on an empty box goes back; arrows move; paste and SMS autofill fill from the focused box; when the code is complete, a simulated server checks it while the boxes are disabled; a wrong code clears and refocuses.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| <code>values</code>: six strings | <code>ref([...])</code> in <code>OtpInput.vue</code> | The single source of truth the boxes render from |
| The six <code>&lt;input&gt;</code> elements | A plain array filled by a function <code>:ref</code> | Only used for <code>focus()</code>; must not be reactive |
| <code>disabled</code>, <code>length</code> | <code>defineProps</code> | Set by the parent |
| "Code complete" | <code>defineEmits(["complete"])</code> | The widget reports up; the page decides what to do |
| <code>status</code>, <code>attempt</code> | <code>ref</code> in <code>App.vue</code> | Server state belongs to the page, not the widget |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="App.vue passes disabled and a key to OtpInput.vue and listens for the complete event, then awaits the fake verify API">
  <defs>
    <marker id="mc06q1v-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="70" width="200" height="70" rx="10"/>
  <text class="d-text d-accent" x="130" y="100" text-anchor="middle">App.vue</text>
  <text class="d-sub" x="130" y="122" text-anchor="middle">status, attempt</text>
  <rect class="d-box" x="410" y="70" width="200" height="70" rx="10"/>
  <text class="d-text" x="510" y="100" text-anchor="middle">OtpInput.vue</text>
  <text class="d-sub" x="510" y="122" text-anchor="middle">values ref, inputs[]</text>
  <path class="d-edge-accent" d="M 236 90 L 404 90" marker-end="url(#mc06q1v-arrow)"/>
  <text class="d-sub" x="320" y="78" text-anchor="middle">:disabled, :key</text>
  <path class="d-edge-dashed" d="M 404 124 L 236 124" marker-end="url(#mc06q1v-arrow)"/>
  <text class="d-sub" x="320" y="160" text-anchor="middle">emit complete(code)</text>
</svg>

Props flow down, one event flows up. [Declaring emits](/interview-question/why-declare-emits-and-can-you-validate-them) with <code>defineEmits</code> documents that contract.

## 3. Build It Step by Step

### 3.1 State, refs and props

~~~vue
const props = defineProps({ length: { type: Number, default: 6 },
disabled: { type: Boolean, default: false }, }); const emit =
defineEmits(["complete"]); // State: one string per box. The DOM inputs
are collected by a function ref. const values =
ref(Array(props.length).fill("")); const inputs = []; const onlyDigits =
(s) => s.replace(/[^0-9]/g, ""); onMounted(() => inputs[0]?.focus());
~~~

<code>inputs</code> is deliberately a plain array, not a <code>ref</code>: nothing renders from it. In the template, a function ref fills it:

~~~vue
:ref="(el) => (inputs[i] = el)"
~~~

📌 **Interview term: Function template ref** — <code>:ref</code> bound to a function that Vue calls with the element on mount and <code>null</code> on unmount. Inside <code>v-for</code> it is the reliable way to keep "element for box i", because the array form of <code>ref</code> in a loop does not promise source order. For a single element, Vue 3.5 adds [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref).

### 3.2 One commit that also reports completion

~~~vue
function commit(next) { values.value = next; if (next.every((v) => v !==
"")) emit("complete", next.join("")); } function fillFrom(start, digits)
{ const next = [...values.value]; let i = start; for (const d of digits)
{ if (i >= props.length) break; next[i++] = d; } commit(next);
focusBox(i); }
~~~

Every write goes through <code>commit</code>, which emits <code>complete</code> at the moment the last box is filled. A <code>watch(values, ...)</code> that emits when the array is full would also work, but it runs after the fact and is easy to trigger twice; the handler that filled the box already knows.

### 3.3 Typing, and the Vue-specific DOM write-back

~~~vue
function onInput(i, e) { const el = e.target; const raw = el.value;
const digits = onlyDigits(raw); const old = values.value[i]; if (raw ===
"") return commit(values.value.map((v, j) => (j === i ? "" : v))); if
(digits.length > 2) return fillFrom(i, digits); // SMS autofill drops
the whole code in one box const d = digits === "" ? old : digits.length
=== 2 && old && digits[0] !== old ? digits[0] : digits.slice(-1); // Vue
only patches the DOM when state changes. If d equals the old value // (a
letter, or the same digit typed again), write the box back by hand.
el.value = d; if (digits === "") return; // a letter: stay on this box
if (d !== old) commit(values.value.map((v, j) => (j === i ? d : v))); if
(i < props.length - 1) focusBox(i + 1); }
~~~

The rules: an empty box stores <code>""</code>; more than two digits is autofill and goes through <code>fillFrom</code>; when a box briefly holds two characters, keep the one that is not the old digit; letters are ignored.

The line <code>el.value = d</code> is the part that differs from React. React restores a controlled input after every event. Vue does not: it patches <code>:value</code> only when the component re-renders, and if the state did not change there is no re-render. To prove it, the same driver was run on a copy with that one line commented out:

~~~text
[vue] typed 1, 2                     boxes: 12____ | focus: 2 
[vue] typed x into box 2             boxes: 12x___ | focus: 2 
[vue] box 1: typed 7 after the 2     boxes: 17____ | focus: 2 
[vue] box 1: typed 7 again           boxes: 177____ | focus: 2
~~~

The letter <code>x</code> stayed in box 2, and typing 7 into a box that already said 7 left <code>77</code> on screen, while <code>values</code> still held the right digits. When the state *does* change, Vue re-renders and its <code>value</code> patch compares against the live DOM value, which is why the stale <code>x</code> disappeared one step later. Writing the box back by hand fixes both cases.

📌 **Interview term: One-way <code>:value</code> binding** — Vue sets the DOM property from state on render but never reads it back. <code>v-model</code> adds the reverse direction; here we bind <code>:value</code> and handle <code>@input</code> ourselves because we need to filter. See [v-model on inputs](/interview-question/how-does-v-model-work-on-form-inputs).

### 3.4 Keyboard and paste

~~~vue
function onKeydown(i, e) { if (e.key === "Backspace") {
e.preventDefault(); if (values.value[i]) commit(values.value.map((v, j)
=> (j === i ? "" : v))); else if (i > 0) { commit(values.value.map((v,
j) => (j === i - 1 ? "" : v))); focusBox(i - 1); } } else if (e.key ===
"ArrowLeft") { e.preventDefault(); focusBox(i - 1); } else if (e.key ===
"ArrowRight") { e.preventDefault(); focusBox(i + 1); } } function
onPaste(i, e) { e.preventDefault(); const digits =
onlyDigits(e.clipboardData.getData("text")); if (digits) fillFrom(i,
digits); }
~~~

Backspace lives in <code>keydown</code> because on an empty box no <code>input</code> event ever fires. <code>preventDefault()</code> stops the browser from also deleting, and on paste it stops the whole clipboard text from landing in one box.

### 3.5 The parent: verify, disable, reset with :key

~~~vue
async function onComplete(code) { status.value = { kind: "busy", text:
"Verifying " + code + "..." }; const ok = await verifyCode(code); if
(ok) status.value = { kind: "ok", text: "Code accepted. You are signed
in." }; else { status.value = { kind: "error", text: "That code is not
right. Try again." }; attempt.value++; } }

<!-- in the template -->
<OtpInput
  :key="attempt"
  :length="6"
  :disabled="status.kind === 'busy' || status.kind === 'ok'"
  @complete="onComplete"
/>
~~~

Changing <code>:key</code> makes Vue unmount the old <code>OtpInput</code> and mount a new one, so the boxes are empty and <code>onMounted</code> focuses box 0 again. <code>verifyCode</code> is a simulated server: a Promise resolving after 400 ms, accepting only <code>246810</code>.

## 4. Verified

The SFCs were compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom. The driver typed with real <code>input</code> events, pressed keys with <code>keydown</code> events, and pasted with a <code>paste</code> event carrying a hand-made <code>clipboardData</code> (jsdom cannot construct one). Boxes are shown with <code>_</code> for empty:

~~~text
[vue] RENDERED: Verify your phoneEnter the 6-digit code we sent to your phone.Start overDemo: the right code is 246810 (the server is simulated).
[vue] mounted                        boxes: ______ | focus: 0 | status: Enter the 6-digit code we sent to your phone.
[vue] typed 1, 2                     boxes: 12____ | focus: 2 
[vue] typed x into box 2             boxes: 12____ | focus: 2 
[vue] box 1: typed 7 after the 2     boxes: 17____ | focus: 2 
[vue] box 1: typed 7 again           boxes: 17____ | focus: 2 
[vue] box 1: typed 5 before the 7    boxes: 15____ | focus: 2 
[vue] Backspace on empty box 2       boxes: 1_____ | focus: 1 
[vue] ArrowRight from box 1          boxes: 1_____ | focus: 2 
[vue] pasted 13-57 99 into box 0     boxes: 135799 | focus: 5 | status: Verifying 135799...
[vue] after fake server              boxes: ______ | focus: 0 | status: That code is not right. Try again.
[vue] pasted 246810                  boxes: 246810 | focus: 5 | status: Verifying 246810...
[vue] disabled while verifying: true
[vue] after fake server              boxes: 246810 | focus: 5 | status: Code accepted. You are signed in.
[vue] aria-labels: Digit 1 of 6, Digit 2 of 6 ...
[vue] autocomplete on box 0: one-time-code | inputmode: numeric
~~~

The letter was rejected, the replacement rule picked the new digit in both caret positions, Backspace on an empty box went back, paste stripped <code>-</code> and spaces, the wrong code cleared and refocused, and the right code disabled the boxes and was accepted. No <code>console.error</code> or Vue warning was printed. The phone keypad and the SMS suggestion need a real device and were not checked here.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Letter typed | Ignored, and written back out of the DOM |
| Same digit typed again | Written back to one character; focus moves on |
| Paste or autofill with separators | Non-digits stripped, filled from the focused box |
| Request in flight | <code>:disabled</code> on every box |
| Screen readers | <code>role="group"</code> + <code>aria-label</code>, "Digit 3 of 6" per box, <code>role="status"</code> message |
| Phones | <code>inputmode="numeric"</code>, <code>pattern="[0-9]*"</code>, <code>autocomplete="one-time-code"</code> on box 0 |

## 6. Common Pitfalls

- **Trusting <code>:value</code> to undo rejected input.** If state does not change, Vue does not re-render and the DOM keeps what the user typed. Write the value back (shown above).
- **<code>maxlength="1"</code>.** It blocks replacing a digit and truncates autofill to one character.
- **Backspace in <code>@input</code>.** Nothing changes on an empty box, so no input event fires.
- **Making the element array reactive.** <code>ref([])</code> for DOM nodes wraps them in proxies and triggers renders for nothing; a plain array is enough.
- **Mutating a prop to reset.** <code>props.length</code> and parent data are read-only here; reset by changing <code>:key</code> from the parent.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OtpInput.vue</code> I keep one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> array of six strings and a plain array of input elements filled by a function <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:ref</code>; the elements are only for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focus()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Typing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@input</code> filters digits, keeps the new character, ignores letters, and advances. Because Vue only patches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:value</code> on re-render, I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.value</code> back when the state did not change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keys and paste:</strong> <span style="color:#f0e2c8;">"Backspace and arrows in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keydown</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>; paste strips non-digits and fills from the focused box; many digits in one input event is SMS autofill."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Events:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> function writes the array and emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">complete</code> when it is full. The parent awaits the simulated API with the boxes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:disabled</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reset and a11y:</strong> <span style="color:#f0e2c8;">"A wrong code bumps the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:key</code>, so Vue remounts a fresh widget. A labelled group, per-box labels, numeric inputmode and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">one-time-code</code> autocomplete cover accessibility."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use v-model on each box?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model="values[i]"</code>, but you still need to filter and pick the new digit, so you end up writing an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@input</code> handler anyway. Explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:value</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@input</code> keeps all the rules in one function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you expose the code with v-model on the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const model = defineModel()</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model.value = next.join("")</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code>. The parent then writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;OtpInput v-model="code" /&gt;</code> and can still listen for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">complete</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With Vue Test Utils: mount, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> on box 0, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code> is box 1, trigger <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> Backspace, dispatch a paste event, and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper.emitted("complete")</code> has exactly one entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not watch values and emit when complete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A watcher fires after the change and needs extra guards to emit only once per completion. Emitting inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code>, where the last digit was written, is simpler and cannot double fire.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Focus management** | Moving keyboard focus from code |
| **Function template ref** | A <code>:ref</code> function that receives the element |
| **One-way <code>:value</code> binding** | State to DOM only; Vue never reads the DOM value back |
| **<code>defineEmits</code>** | Declares the events a component can send to its parent |
| **Key reset** | Changing <code>:key</code> so Vue mounts a fresh instance |

---
**Conclusion:** In Vue the OTP input is one reactive array of digits, a plain array of elements for focus, and handlers that funnel every change through a single <code>commit</code> that emits <code>complete</code>. The one Vue-specific trap is that <code>:value</code> does not undo rejected input when state stays the same, which the experiment above made visible and the shipped code fixes with a one-line write-back. Verified on Vue 3.5.44: typing, replacing, Backspace, arrows, paste, the simulated verify and the <code>:key</code> reset all behaved as described.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import OtpInput from "./components/OtpInput.vue";
import { DEMO_CODE, verifyCode } from "./fakeApi.js";

const IDLE = {
  kind: "idle",
  text: "Enter the 6-digit code we sent to your phone.",
};
const status = ref(IDLE);
const attempt = ref(0); // changing the key remounts a fresh, empty OtpInput

async function onComplete(code) {
  status.value = { kind: "busy", text: "Verifying " + code + "..." };
  const ok = await verifyCode(code);
  if (ok)
    status.value = { kind: "ok", text: "Code accepted. You are signed in." };
  else {
    status.value = {
      kind: "error",
      text: "That code is not right. Try again.",
    };
    attempt.value++;
  }
}

function startOver() {
  status.value = IDLE;
  attempt.value++;
}
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>Verify your phone</h1>
      <OtpInput
        :key="attempt"
        :length="6"
        :disabled="status.kind === 'busy' || status.kind === 'ok'"
        @complete="onComplete"
      />
      <p
        :class="['status', status.kind]"
        data-testid="otp-status"
        role="status"
      >{{ status.text }}</p>
      <button type="button" class="link" @click="startOver">Start over</button>
      <p class="demo">Demo: the right code is {{ DEMO_CODE }} (the server is simulated).</p>
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(420px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
  text-align: center;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 16px;
}
.status {
  min-height: 1.4em;
  margin: 14px 0 6px;
  color: #9aa3b2;
}
.status.ok {
  color: #69f0ae;
}
.status.error {
  color: #ff8a80;
}
.link {
  background: none;
  border: 0;
  color: #7aa2ff;
  cursor: pointer;
  text-decoration: underline;
}
.demo {
  font-size: 0.8rem;
  color: #6b7280;
}
</style>
`,
          "/src/components/OtpInput.vue": `<script setup>
import { onMounted, ref } from "vue";

const props = defineProps({
  length: { type: Number, default: 6 },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["complete"]);

// State: one string per box. The DOM inputs are collected by a function ref.
const values = ref(Array(props.length).fill(""));
const inputs = [];
const onlyDigits = (s) => s.replace(/[^0-9]/g, "");

onMounted(() => inputs[0]?.focus());

function focusBox(i) {
  const el = inputs[Math.max(0, Math.min(props.length - 1, i))];
  el?.focus();
  el?.select();
}

function commit(next) {
  values.value = next;
  if (next.every((v) => v !== "")) emit("complete", next.join(""));
}

function fillFrom(start, digits) {
  const next = [...values.value];
  let i = start;
  for (const d of digits) {
    if (i >= props.length) break;
    next[i++] = d;
  }
  commit(next);
  focusBox(i);
}

function onInput(i, e) {
  const el = e.target;
  const raw = el.value;
  const digits = onlyDigits(raw);
  const old = values.value[i];
  if (raw === "") return commit(values.value.map((v, j) => (j === i ? "" : v)));
  // SMS autofill drops the whole code in one box
  if (digits.length > 2) return fillFrom(i, digits);
  const d =
    digits === ""
      ? old
      : digits.length === 2 && old && digits[0] !== old
        ? digits[0]
        : digits.slice(-1);
  // Vue only patches the DOM when state changes. If d equals the old value
  // (a letter, or the same digit typed again), write the box back by hand.
  el.value = d;
  if (digits === "") return; // a letter: stay on this box
  if (d !== old) commit(values.value.map((v, j) => (j === i ? d : v)));
  if (i < props.length - 1) focusBox(i + 1);
}

function onKeydown(i, e) {
  if (e.key === "Backspace") {
    e.preventDefault();
    if (values.value[i]) commit(values.value.map((v, j) => (j === i ? "" : v)));
    else if (i > 0) {
      commit(values.value.map((v, j) => (j === i - 1 ? "" : v)));
      focusBox(i - 1);
    }
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    focusBox(i - 1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    focusBox(i + 1);
  }
}

function onPaste(i, e) {
  e.preventDefault();
  const digits = onlyDigits(e.clipboardData.getData("text"));
  if (digits) fillFrom(i, digits);
}
</script>

<template>
  <div class="otp" role="group" aria-label="One-time code">
    <input
      v-for="(v, i) in values"
      :key="i"
      :ref="(el) => (inputs[i] = el)"
      :data-testid="'otp-' + i"
      class="box"
      :value="v"
      :disabled="disabled"
      inputmode="numeric"
      pattern="[0-9]*"
      :autocomplete="i === 0 ? 'one-time-code' : 'off'"
      :aria-label="'Digit ' + (i + 1) + ' of ' + length"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste(i, $event)"
      @focus="$event.target.select()"
    />
  </div>
</template>

<style scoped>
.otp {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.box {
  width: 44px;
  height: 52px;
  font-size: 1.5rem;
  text-align: center;
  border-radius: 8px;
  border: 1px solid #3a4150;
  background: #0f1115;
  color: #fff;
  caret-color: #7aa2ff;
}
.box:focus {
  outline: 2px solid #7aa2ff;
  border-color: transparent;
}
.box:disabled {
  opacity: 0.6;
}
@media (max-width: 380px) {
  .box {
    width: 38px;
    height: 46px;
  }
  .otp {
    gap: 6px;
  }
}
</style>
`,
          "/src/fakeApi.js": `// Simulated server: no network in the playground. Resolves after 400 ms.
export const DEMO_CODE = "246810";

export function verifyCode(code) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(code === DEMO_CODE), 400),
  );
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know components and templates; signals and the rest are explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Every excerpt is from the runnable solution, and the Verified output was printed by booting it on Angular 22.2.3, both compiled ahead of time with strict templates and compiled at runtime the way the playground does.

## 1. The Story

The six boxes you fill after an SMS code arrives are an **OTP input** (one-time password). Picture a vault door with six dials: you turn one and your hand moves to the next; if someone hands you a note with the code, all six dials should turn at once. It is a small widget on the path to someone's account, and it tests focus, keyboard and clipboard events, component communication and accessibility together.

📌 **Interview term: Focus management** — moving keyboard focus from code with <code>element.focus()</code>, here after every digit, Backspace and paste.

## 2. Requirements and the Angular State Model

Six digit boxes; typing advances; typing into a filled box replaces; letters are ignored; Backspace on an empty box goes back; arrows move; paste and SMS autofill fill from the focused box; on the last digit the page checks the code with a simulated server while the boxes are disabled; a wrong code clears and refocuses.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>values</code>: six strings | <code>signal&lt;string[]&gt;</code> | Single source of truth; a signal write schedules a render even in a zoneless app |
| The six inputs | <code>@ViewChildren("box")</code> as a <code>QueryList&lt;ElementRef&gt;</code> | Only used for <code>focus()</code> |
| <code>length</code>, <code>disabled</code> | <code>@Input()</code> | Set by the parent |
| "Code complete" | <code>@Output() complete = new EventEmitter&lt;string&gt;()</code> | The widget reports, the page decides |
| <code>status</code> | <code>signal</code> in <code>AppComponent</code> | Server state belongs to the page |
| Reset after a wrong code | <code>@ViewChild(OtpInputComponent)</code> + <code>reset()</code> | Angular has no <code>key</code> remount, so the parent calls a method |

The playground compiles Angular at runtime, where signal-based <code>input()</code>, <code>output()</code> and <code>viewChild()</code> do not register, so this solution uses the decorator forms. Compare them in [signal inputs vs @Input](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1).

## 3. Build It Step by Step

### 3.1 Inputs, output, queries and state

~~~ts
@Input() length = 6;
@Input() disabled = false;
@Output() complete = new EventEmitter<string>();
@ViewChildren("box") boxes!: QueryList<ElementRef<HTMLInputElement>>;

// State: one string per box, in a signal
// so the zoneless app re-renders.
readonly values = signal<string[]>([]);
private readonly injector = inject(Injector);

ngOnInit(): void {
  // @Input values exist from here on
  this.values.set(Array(this.length).fill(""));
}
~~~

The array is created in <code>ngOnInit</code>, not in the field initializer, because <code>@Input()</code> values are assigned after the constructor runs.

### 3.2 The template: @for and a template reference

~~~ts
@for (v of values(); track $index) {
  <input
    #box
    class="box"
    [attr.data-testid]="'otp-' + $index"
    [value]="v"
    [disabled]="disabled"
    inputmode="numeric"
    pattern="[0-9]*"
    [attr.autocomplete]="$index === 0 ? 'one-time-code' : 'off'"
    [attr.aria-label]="'Digit ' + ($index + 1) + ' of ' + length"
    (input)="onInput($index, $event)"
    (keydown)="onKeydown($index, $event)"
    (paste)="onPaste($index, $event)"
    (focus)="box.select()"
  />
}
~~~

<code>@for</code> is built-in control flow, so nothing has to be imported (the old version of this question used <code>*ngFor</code> without importing <code>NgFor</code>, and its boxes never rendered). <code>track $index</code> keeps the same six DOM nodes when the array is replaced, so focus is never lost. <code>#box</code> names each input for <code>@ViewChildren</code> and for <code>box.select()</code> on focus. See [the new control flow](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor).

📌 **Interview term: Template reference variable** — <code>#name</code> on an element gives the template (and <code>@ViewChild</code> queries) a handle to it. See [template reference variables](/interview-question/what-are-template-reference-variables).

### 3.3 Typing, and why the DOM value is written back

~~~ts
onInput(i: number, e: Event): void {
  const el = e.target as HTMLInputElement;
  const raw = el.value;
  const digits = onlyDigits(raw);
  const old = this.values()[i];
  if (raw === "") return this.commit(this.setBox(i, ""));
  // SMS autofill drops the whole code in one box
  if (digits.length > 2) return this.fillFrom(i, digits);
  const d =
    digits === ""
      ? old
      : digits.length === 2 && old && digits[0] !== old
        ? digits[0]
        : digits.slice(-1);
  // [value] is only re-applied when the
  // bound value changes, so the DOM can
  // hold "x" or "77" while the signal
  // still says "7". Write it back by hand.
  el.value = d;
  if (digits === "") return; // a letter: stay on this box
  if (d !== old) this.commit(this.setBox(i, d));
  if (i < this.length - 1) this.focusBox(i + 1);
}
~~~

Angular checks a property binding like <code>[value]="v"</code> against the *last value it bound*, not against the DOM. If the user types <code>x</code>, the signal still says <code>""</code>, the binding did not change, and Angular never touches the input again. The same driver run on a copy with <code>el.value = d</code> commented out:

~~~text
[angular:playground] typed 1, 2                     boxes: 12____ | focus: 2 
[angular:playground] typed x into box 2             boxes: 12x___ | focus: 2 
[angular:playground] box 1: typed 7 after the 2     boxes: 17x___ | focus: 2 
[angular:playground] box 1: typed 7 again           boxes: 177x___ | focus: 2 
[angular:playground] box 1: typed 5 before the 7    boxes: 15x___ | focus: 2 
[angular:playground] Backspace on empty box 2       boxes: 1_x___ | focus: 1
~~~

The <code>x</code> stays in box 2 for the rest of the session, even while other boxes re-render, and <code>77</code> appears in box 1. That is a stricter version of the same issue in Vue, where any re-render repairs it. Writing the value back by hand is the fix.

### 3.4 Keyboard and paste

~~~ts
onKeydown(i: number, e: KeyboardEvent): void {
  if (e.key === "Backspace") {
    e.preventDefault();
    if (this.values()[i]) this.commit(this.setBox(i, ""));
    else if (i > 0) {
      this.commit(this.setBox(i - 1, ""));
      this.focusBox(i - 1);
    }
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    this.focusBox(i - 1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    this.focusBox(i + 1);
  }
}

onPaste(i: number, e: ClipboardEvent): void {
  e.preventDefault();
  const digits = onlyDigits(e.clipboardData?.getData("text") ?? "");
  if (digits) this.fillFrom(i, digits);
}
~~~

<code>(keydown)</code> and <code>(paste)</code> are typed by strict templates as <code>KeyboardEvent</code> and <code>ClipboardEvent</code>, so the handler signatures say so. Backspace on an empty box fires no <code>input</code> event, which is why it lives here.

### 3.5 Reset with afterNextRender

~~~ts
reset(): void {
  this.values.set(Array(this.length).fill(""));
  for (const b of this.boxes) b.nativeElement.value = "";
  // The parent re-enables the boxes in the same tick; a disabled input
  // cannot take focus, so wait until Angular has rendered that change.
  afterNextRender(() => this.focusBox(0), { injector: this.injector });
}
~~~

The parent sets the status to "error" (which re-enables the boxes) and calls <code>reset()</code> in the same tick. At that moment the inputs are still disabled in the DOM, and a disabled input cannot take focus. The first version called <code>focusBox(0)</code> directly:

~~~text
[angular:app] after fake server              boxes: ______ | focus: 5 | status: That code is not right. Try again.
~~~

Focus stayed on box 5. <code>afterNextRender</code> runs the callback after Angular has rendered the enabled boxes; outside an injection context it needs the component injector, taken with <code>inject(Injector)</code>.

📌 **Interview term: afterNextRender** — an Angular function that runs a callback once, after the next render has updated the DOM. Use it for DOM work such as focus or measuring that must see the latest render.

## 4. Verified

The component was compiled with <code>ngc</code> and <code>strictTemplates</code> (<code>angular:app</code>) and also booted through runtime JIT as in the playground (<code>angular:playground</code>), each with <code>bootstrapApplication(AppComponent)</code> and no providers, in jsdom. The driver typed with <code>input</code> events, pressed keys, and pasted with a <code>paste</code> event carrying a hand-made <code>clipboardData</code>. AOT output (the JIT run printed the same lines):

~~~text
[angular:app] RENDERED: Verify your phoneEnter the 6-digit code we sent to your phone.Start overDemo: the right code is 246810 (the server is simulated).
[angular:app] mounted                        boxes: ______ | focus: 0 | status: Enter the 6-digit code we sent to your phone.
[angular:app] typed 1, 2                     boxes: 12____ | focus: 2 
[angular:app] typed x into box 2             boxes: 12____ | focus: 2 
[angular:app] box 1: typed 7 after the 2     boxes: 17____ | focus: 2 
[angular:app] box 1: typed 7 again           boxes: 17____ | focus: 2 
[angular:app] box 1: typed 5 before the 7    boxes: 15____ | focus: 2 
[angular:app] Backspace on empty box 2       boxes: 1_____ | focus: 1 
[angular:app] ArrowRight from box 1          boxes: 1_____ | focus: 2 
[angular:app] pasted 13-57 99 into box 0     boxes: 135799 | focus: 5 | status: Verifying 135799...
[angular:app] after fake server              boxes: ______ | focus: 0 | status: That code is not right. Try again.
[angular:app] pasted 246810                  boxes: 246810 | focus: 5 | status: Verifying 246810...
[angular:app] disabled while verifying: true
[angular:app] after fake server              boxes: 246810 | focus: 5 | status: Code accepted. You are signed in.
[angular:app] aria-labels: Digit 1 of 6, Digit 2 of 6 ...
[angular:app] autocomplete on box 0: one-time-code | inputmode: numeric
~~~

Letters were rejected, the new digit won in both caret positions, Backspace on an empty box went back, paste stripped separators, the wrong code reset to an empty widget with focus on box 0, and the correct code disabled the boxes before being accepted. No <code>console.error</code>. Phone keypads and SMS suggestions need a real device and were not checked.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Letter or repeated digit | DOM value written back from the signal |
| Paste or autofill | Non-digits stripped, filled from the focused box |
| Request in flight | <code>[disabled]</code> on every box |
| Reset after wrong code | Values cleared, DOM cleared, focus after the next render |
| Screen readers | <code>role="group"</code> + label, <code>[attr.aria-label]</code> "Digit 3 of 6", <code>role="status"</code> message |
| Phones | <code>inputmode="numeric"</code>, <code>pattern</code>, <code>[attr.autocomplete]</code> "one-time-code" on box 0 |

## 6. Common Pitfalls

- **Expecting <code>[value]</code> to undo rejected input.** Angular compares with the last bound value, so a rejected <code>x</code> stays forever. Write the DOM value back.
- **Focusing an input that the same tick re-enables.** It is still disabled; use <code>afterNextRender</code>.
- **Reading <code>@Input()</code> values in the constructor.** They are not set yet; use <code>ngOnInit</code>.
- **Using signal <code>input()</code> or <code>viewChild()</code> in the playground.** They do not register under its runtime JIT; the decorator forms do.
- **Plain fields for state in a zoneless app.** A field changed after an <code>await</code> does not re-render; a signal does.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> holds six strings, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code> gives me the inputs for focus. Inputs are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code>, completion is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code> EventEmitter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track $index</code> renders the boxes and keeps the same DOM nodes; each has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#box</code> for queries and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">box.select()</code> on focus."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Typing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(input)</code> filters digits and keeps the new one. Because Angular only re-applies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]</code> when the bound value changes, I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.value</code> back for rejected input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keys and paste:</strong> <span style="color:#f0e2c8;">"Backspace and arrows in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(keydown)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>; paste strips non-digits; many digits in one input event is SMS autofill."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Parent:</strong> <span style="color:#f0e2c8;">"The page disables the boxes while the simulated API runs, and after a wrong code calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code>, focusing box 0 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it work inside a reactive form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> splits the string into the signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores a callback that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> calls with the joined code, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> drives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code>. Provide it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not ngModel on each box?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You still need to filter and pick the new digit, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> updates asynchronously, so you end up with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(input)</code> handler anyway. One explicit handler keeps the rules in one place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With TestBed: create the component, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input.value</code> and dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>, and subscribe to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">complete</code> to check it emitted once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did you need afterNextRender and not setTimeout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both would work here, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> says what we mean, runs right after Angular renders, and is cleaned up with the component. A timeout guesses at timing.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Focus management** | Moving keyboard focus from code |
| **Signal** | A reactive value; reading it in a template subscribes, writing it schedules a render |
| **Template reference variable** | <code>#name</code> handle to an element in the template |
| **<code>@ViewChildren</code>** | A query that returns all matching elements as a <code>QueryList</code> |
| **afterNextRender** | Runs a callback once after the next DOM update |

---
**Conclusion:** The Angular OTP input keeps the digits in one signal, uses <code>@for</code> and <code>@ViewChildren</code> for the boxes, and reports with an <code>@Output</code>. Two Angular-specific details made the difference, and both were shown by running modified copies: <code>[value]</code> never repairs rejected input unless you write it back, and focus after a reset has to wait for <code>afterNextRender</code>. The final solution passed the same driver in AOT strict mode and in the playground JIT on Angular 22.2.3.`,
        files: {
          "/src/app/app.component.ts": `import { DOCUMENT } from "@angular/common";
import { Component, ViewChild, signal, inject } from "@angular/core";
import { OtpInputComponent } from "./otp-input.component";
import { DEMO_CODE, verifyCode } from "./fake-api";

type Status = { kind: "idle" | "busy" | "ok" | "error"; text: string };
const IDLE: Status = {
  kind: "idle",
  text: "Enter the 6-digit code we sent to your phone.",
};

@Component({
  selector: "app-root",
  imports: [OtpInputComponent],
  template: \`
    <main class="page">
      <section class="card">
        <h1>Verify your phone</h1>
        <app-otp-input
          [length]="6"
          [disabled]="status().kind === 'busy' || status().kind === 'ok'"
          (complete)="onComplete($event)"
        />
        <p
          [class]="'status ' + status().kind"
          data-testid="otp-status"
          role="status"
        >{{ status().text }}</p>
        <button
          type="button"
          class="link"
          (click)="startOver()"
        >Start over</button>
        <p class="demo">Demo: the right code is {{ demoCode }} (the server is simulated).</p>
      </section>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .page { min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
    .card { width: min(420px, 100%); background: #181b22; border: 1px solid #2a2f3a; border-radius: 14px; padding: 20px; box-sizing: border-box; text-align: center; }
    h1 { font-size: 1.25rem; margin: 0 0 16px; }
    .status { min-height: 1.4em; margin: 14px 0 6px; color: #9aa3b2; }
    .status.ok { color: #69f0ae; }
    .status.error { color: #ff8a80; }
    .link { background: none; border: 0; color: #7aa2ff; cursor: pointer; text-decoration: underline; }
    .demo { font-size: 0.8rem; color: #6b7280; }
  \`,
  ],
})
export class AppComponent {
  constructor() {
    // The playground page has a default white
    // body margin; make the whole page dark.
    inject(DOCUMENT).body.style.cssText = "margin: 0; background: #0f1115;";
  }

  @ViewChild(OtpInputComponent) otp!: OtpInputComponent;
  readonly status = signal<Status>(IDLE);
  readonly demoCode = DEMO_CODE;

  async onComplete(code: string): Promise<void> {
    this.status.set({ kind: "busy", text: "Verifying " + code + "..." });
    const ok = await verifyCode(code);
    if (ok)
      this.status.set({
        kind: "ok",
        text: "Code accepted. You are signed in.",
      });
    else {
      this.status.set({
        kind: "error",
        text: "That code is not right. Try again.",
      });
      this.otp.reset();
    }
  }

  startOver(): void {
    this.status.set(IDLE);
    this.otp.reset();
  }
}
`,
          "/src/app/fake-api.ts": `// Simulated server: no network in the playground. Resolves after 400 ms.
export const DEMO_CODE = "246810";

export function verifyCode(code: string): Promise<boolean> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(code === DEMO_CODE), 400),
  );
}
`,
          "/src/app/otp-input.component.ts": `import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
  afterNextRender,
  inject,
  signal,
} from "@angular/core";

const onlyDigits = (s: string) => s.replace(/[^0-9]/g, "");

@Component({
  selector: "app-otp-input",
  template: \`
    <div class="otp" role="group" aria-label="One-time code">
      @for (v of values(); track $index) {
        <input
          #box
          class="box"
          [attr.data-testid]="'otp-' + $index"
          [value]="v"
          [disabled]="disabled"
          inputmode="numeric"
          pattern="[0-9]*"
          [attr.autocomplete]="$index === 0 ? 'one-time-code' : 'off'"
          [attr.aria-label]="'Digit ' + ($index + 1) + ' of ' + length"
          (input)="onInput($index, $event)"
          (keydown)="onKeydown($index, $event)"
          (paste)="onPaste($index, $event)"
          (focus)="box.select()"
        />
      }
    </div>
  \`,
  styles: [
    \`
      .otp {
        display: flex;
        justify-content: center;
        gap: 8px;
      }
      .box {
        width: 44px;
        height: 52px;
        font-size: 1.5rem;
        text-align: center;
        border-radius: 8px;
        border: 1px solid #3a4150;
        background: #0f1115;
        color: #fff;
        caret-color: #7aa2ff;
      }
      .box:focus {
        outline: 2px solid #7aa2ff;
        border-color: transparent;
      }
      .box:disabled {
        opacity: 0.6;
      }
      @media (max-width: 380px) {
        .box {
          width: 38px;
          height: 46px;
        }
        .otp {
          gap: 6px;
        }
      }
    \`,
  ],
})
export class OtpInputComponent implements OnInit, AfterViewInit {
  @Input() length = 6;
  @Input() disabled = false;
  @Output() complete = new EventEmitter<string>();
  @ViewChildren("box") boxes!: QueryList<ElementRef<HTMLInputElement>>;

  // State: one string per box, in a signal so the zoneless app re-renders.
  readonly values = signal<string[]>([]);
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    // @Input values exist from here on
    this.values.set(Array(this.length).fill(""));
  }

  ngAfterViewInit(): void {
    this.focusBox(0);
  }

  /** Called by the parent through @ViewChild after a wrong code. */
  reset(): void {
    this.values.set(Array(this.length).fill(""));
    for (const b of this.boxes) b.nativeElement.value = "";
    // The parent re-enables the boxes in the same tick; a disabled input
    // cannot take focus, so wait until Angular has rendered that change.
    afterNextRender(() => this.focusBox(0), { injector: this.injector });
  }

  private focusBox(i: number): void {
    const el = this.boxes.get(
      Math.max(0, Math.min(this.length - 1, i)),
    )?.nativeElement;
    el?.focus();
    el?.select();
  }

  private commit(next: string[]): void {
    this.values.set(next);
    if (next.every((v) => v !== "")) this.complete.emit(next.join(""));
  }

  private setBox(i: number, d: string): string[] {
    return this.values().map((v, j) => (j === i ? d : v));
  }

  private fillFrom(start: number, digits: string): void {
    const next = [...this.values()];
    let i = start;
    for (const d of digits) {
      if (i >= this.length) break;
      next[i++] = d;
    }
    for (const [j, b] of this.boxes.toArray().entries())
      b.nativeElement.value = next[j];
    this.commit(next);
    this.focusBox(i);
  }

  onInput(i: number, e: Event): void {
    const el = e.target as HTMLInputElement;
    const raw = el.value;
    const digits = onlyDigits(raw);
    const old = this.values()[i];
    if (raw === "") return this.commit(this.setBox(i, ""));
    // SMS autofill drops the whole code in one box
    if (digits.length > 2) return this.fillFrom(i, digits);
    const d =
      digits === ""
        ? old
        : digits.length === 2 && old && digits[0] !== old
          ? digits[0]
          : digits.slice(-1);
    // [value] is only re-applied when the bound value changes, so the DOM can
    // hold "x" or "77" while the signal still says "7". Write it back by hand.
    el.value = d;
    if (digits === "") return; // a letter: stay on this box
    if (d !== old) this.commit(this.setBox(i, d));
    if (i < this.length - 1) this.focusBox(i + 1);
  }

  onKeydown(i: number, e: KeyboardEvent): void {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (this.values()[i]) this.commit(this.setBox(i, ""));
      else if (i > 0) {
        this.commit(this.setBox(i - 1, ""));
        this.focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.focusBox(i + 1);
    }
  }

  onPaste(i: number, e: ClipboardEvent): void {
    e.preventDefault();
    const digits = onlyDigits(e.clipboardData?.getData("text") ?? "");
    if (digits) this.fillFrom(i, digits);
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Star Rating component",
    seoDescription:
      "Build an accessible star rating in React, Vue and Angular: hover preview, click to rate, radiogroup keyboard support and fractional read-only stars.",
    description: `**Question presented to candidate:**
"On our product page we show the average rating as stars, and signed-in users can leave their own rating. Build a reusable star rating component that works for both: a read-only display that can show 3.6 stars, and an interactive version with hover preview that also works with the keyboard."

**Requirements:**
- Five stars by default (\`max\` is configurable).
- Interactive mode: hovering previews a rating without committing it; clicking commits; clicking the current rating again clears it to 0.
- Keyboard: the stars behave like a radio group. Tab reaches one star, ArrowRight / ArrowUp raise the rating, ArrowLeft / ArrowDown lower it, Home and End jump to 1 and \`max\`.
- A caption shows the preview or the committed rating in words ("4 of 5, Good").
- Read-only mode renders fractional values (3.6 fills the fourth star 60 percent) and is announced as a single image ("Rated 3.6 out of 5").
- The parent owns the value (a controlled component).

**What a strong answer should cover:**
- Two pieces of state with different owners: the committed \`value\` (parent) and the transient \`hover\` (component), rendered as \`hover || value\`.
- Partial fill with two stacked glyphs, the top one clipped by \`width\` and \`overflow: hidden\`.
- ARIA: \`role="radiogroup"\` with \`role="radio"\` and \`aria-checked\` per star, a roving \`tabindex\`, and \`role="img"\` with a label for the read-only display.
- Keyboard handling that moves focus together with the selection.
- Controlled API: \`value\` + \`onChange\` in React, \`v-model\` in Vue, \`[(value)]\` in Angular.

**Clarifying questions expected:**
- "Do we need half-star input, or only half-star display?"
- "Can a user clear their rating, and how?"
- "Is the rating saved immediately or submitted with a form?"

**Code / implementation expected:** Yes. A working component with both modes, hover preview, click and keyboard rating, and correct ARIA roles.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know React components and <code>useState</code>; the rest is explained.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Code excerpts are copied from the runnable solution, and the Verified output was printed by running it on React 19.3.1.

## 1. Why This Even Matters — A Story First

At a restaurant, the waiter hands you a little card: "How was your meal? Circle a number of stars." Before you circle anything you hover your pen over the fourth star, think "hmm, maybe five", hover over the fifth, then commit with ink. Next to the card is the restaurant's average from everyone else: three and a bit stars, printed, not something you can change.

A **star rating component** is both of those cards. The interactive one lets you *preview* (pen hovering) and then *commit* (ink). The read-only one shows a fractional average. The interview value is in the details: two kinds of state with different owners, drawing 60 percent of a star, and making five little pictures behave like a proper form control for keyboard and screen-reader users.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Half-star input, or only half-star display? | Half-star input needs pointer geometry per star; display only needs a clipped fill. |
| Can a user clear their rating? How? | Decides whether 0 is a valid value and what a second click does. |
| Saved immediately, or part of a form submit? | Immediate save needs loading and error states; in a form, the component just reports a value. |
| How many stars, and are labels needed ("Good", "Great")? | Drives <code>max</code> and the caption and accessible names. |
| Should it work without a mouse? | The answer is always yes, but asking shows you plan for keyboard and screen readers. |

For this build: whole-star input, fractional display, a second click clears, the parent stores the value, five labelled stars.

## 3. Requirements and Plan

Files: <code>/App.js</code> (a product card using both modes) and <code>/src/StarRating.js</code> (the component). The state model is the part to say out loud first:

| Piece | Owner | Kind | Why |
| :--- | :--- | :--- | :--- |
| <code>value</code> (committed rating) | Parent | Prop | The page saves it; the component is controlled |
| <code>hover</code> (preview) | Component | <code>useState</code> | Nobody outside cares about a pen hovering |
| What is lit | Derived | <code>hover &#124;&#124; value</code> | Preview wins while hovering, otherwise the real value |
| The five star elements | Component | <code>useRef</code> array | Only for moving focus on arrow keys |

📌 **Interview term: Controlled component** — a component whose value lives in its parent and arrives as a prop, with changes reported through a callback (<code>onChange</code>). The component never "owns" the truth. Compare [controlled and uncontrolled components](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 260" role="img" aria-label="Three display states of the interactive rating: idle shows value, hovering shows the hover preview, and leaving the stars returns to value. A click commits and goes back to showing value.">
  <defs>
    <marker id="mc06q2r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="90" width="180" height="70" rx="10"/>
  <text class="d-text" x="120" y="118" text-anchor="middle">Idle</text>
  <text class="d-sub" x="120" y="140" text-anchor="middle">lit = value</text>
  <rect class="d-box-accent" x="460" y="90" width="190" height="70" rx="10"/>
  <text class="d-text d-accent" x="555" y="118" text-anchor="middle">Previewing</text>
  <text class="d-sub" x="555" y="140" text-anchor="middle">lit = hover</text>
  <path class="d-edge-accent" d="M 216 104 L 454 104" marker-end="url(#mc06q2r-arrow)"/>
  <text class="d-sub" x="335" y="90" text-anchor="middle">mouse enters star n</text>
  <path class="d-edge" d="M 454 146 L 216 146" marker-end="url(#mc06q2r-arrow)"/>
  <text class="d-sub" x="335" y="174" text-anchor="middle">mouse leaves the group</text>
  <path class="d-edge-dashed" d="M 555 166 L 555 220 L 120 220 L 120 166" marker-end="url(#mc06q2r-arrow)"/>
  <text class="d-sub" x="335" y="242" text-anchor="middle">click star n: onChange(n)</text>
</svg>

Hover never calls <code>onChange</code>. Only a click or a key commits. Leaving the group resets <code>hover</code> to 0, so the stars fall back to the committed value.

## 4. Build It Step by Step

### 4.1 One star, any fill

~~~jsx
function Star({ fill }) {
  // Two stacked glyphs: a grey base and
  // a gold copy clipped to fill (0..1).
  return (
    <span className="star" aria-hidden="true">
      <span className="base">★</span>
      <span
        className="fill"
        style={{ width: Math.round(fill * 100) + "%" }}
      >
        ★
      </span>
    </span>
  );
}
~~~

Two identical glyphs are stacked: a grey one underneath and a gold one on top. The gold one is absolutely positioned with <code>overflow: hidden</code> and a <code>width</code> percentage, so a width of 60 percent shows exactly 60 percent of a gold star over the grey one. No SVG masks, no images, and it works for any fraction.

📌 **Interview term: Clipped overlay** — drawing a partial shape by layering a full copy on top and hiding part of it with <code>width</code> plus <code>overflow: hidden</code> (or <code>clip-path</code>).

<code>Math.round</code> is not decoration. For a rating of 3.6 the fourth star fill is <code>(3.6 - 3) * 100</code>, which in floating point is <code>60.00000000000001</code>; Node prints <code>60.00000000000001% | 60%</code> for the raw and rounded versions. The raw one works in CSS but looks broken in DevTools and snapshot tests.

### 4.2 Read-only mode

~~~jsx
if (readOnly) {
  return (
    <span
      className="stars"
      role="img"
      aria-label={"Rated " + value + " out of " + max}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </span>
  );
}
~~~

The read-only stars are one picture with one name: <code>role="img"</code> and <code>aria-label="Rated 3.6 out of 5"</code>. Each glyph is <code>aria-hidden</code>, otherwise a screen reader would read "star star star star star star star star star star". Hooks (<code>useState</code>, <code>useRef</code>) are called above this early return, so the hook order never changes between renders.

### 4.3 Interactive mode: a radio group

~~~jsx
<div
  className="stars"
  role="radiogroup"
  aria-label={label}
  onMouseLeave={() => setHover(0)}
>
  {Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return (
      <span
        key={n}
        ref={(el) => {
          radios.current[i] = el;
        }}
        role="radio"
        className="hit"
        data-testid={"star-" + n}
        aria-checked={value === n}
        aria-label={
          n + (n === 1 ? " star" : " stars") + ", " + LABELS[i]
        }
        tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
        onMouseEnter={() => setHover(n)}
        onClick={() => onChange(value === n ? 0 : n)}
        onKeyDown={handleKeyDown}
      >
        <Star fill={shown >= n ? 1 : 0} />
      </span>
    );
  })}
</div>
~~~

A rating is "pick one of five", which is exactly a radio group, so the ARIA pattern is <code>role="radiogroup"</code> with five <code>role="radio"</code> children and <code>aria-checked</code> on the chosen one. Each star gets an accessible name such as "4 stars, Good".

📌 **Interview term: Roving tabindex** — in a composite widget only one item has <code>tabIndex=0</code> (reachable with Tab); the others have <code>-1</code>. Arrow keys move focus between items and move the 0 along. Here the checked star is the tab stop, or the first star when nothing is rated.

Clicking the current value again calls <code>onChange(0)</code>, which is how a user clears a rating. Native radio buttons cannot be unchecked by clicking; this is a deliberate product choice that the caption and the "Saved" text make visible.

### 4.4 Keyboard

~~~jsx
function select(n) {
  const next = Math.max(1, Math.min(max, n));
  onChange(next);
  // roving focus follows the selection
  radios.current[next - 1]?.focus();
}

function handleKeyDown(e) {
  const moves = {
    ArrowRight: value + 1,
    ArrowUp: value + 1,
    ArrowLeft: value - 1,
    ArrowDown: value - 1,
    Home: 1,
    End: max,
  };
  if (!(e.key in moves)) return;
  e.preventDefault();
  select(moves[e.key]);
}
~~~

A lookup table maps keys to the next value; <code>select</code> clamps it into 1..max, reports it, and focuses the matching star through the ref array, so focus and selection move together as the radio group pattern expects. <code>preventDefault()</code> stops ArrowUp and ArrowDown from scrolling the page.

### 4.5 The parent

~~~jsx
// the parent owns the value: a controlled component
const [rating, setRating] = useState(0);

return (
  <main className="page">
    <article className="card">
      <h1>Trail running shoes</h1>
      <p className="avg">
        <StarRating value={3.6} readOnly /> <span data-testid="avg">3.6 average from 128 reviews</span>
      </p>
      <h2>Your rating</h2>
      <StarRating value={rating} onChange={setRating} label="Your rating" />
~~~

The same component renders the average (<code>readOnly</code>) and the user input. The parent could save <code>rating</code> to a server in <code>setRating</code>; the component neither knows nor cares, which is the point of keeping it controlled. If you had to lift state shared by several widgets, see [lifting state up](/interview-question/explain-the-concept-of-lifting-state-up-in-react).

## 5. Verified: What the Solution Printed

Mounted in jsdom with <code>createRoot</code> inside <code>StrictMode</code>, then driven by a script. React builds <code>onMouseEnter</code> and <code>onMouseLeave</code> from <code>mouseover</code> and <code>mouseout</code> events, so the driver fires those (plus native <code>mouseenter</code> and <code>mouseleave</code>, which the Vue and Angular versions listen to). <code>lit</code> shows which stars are gold, <code>checked</code> is the star with <code>aria-checked="true"</code>, <code>tabbable</code> is the star with <code>tabIndex=0</code>, <code>focus</code> is the focused star (0 = none):

~~~text
[react] RENDERED: Trail running shoes★★★★★★★★★★ 3.6 average from 128 reviewsYour rating★★★★★★★★★★Not rated yetClick a star, or Tab to the stars and use the arrow keys.
[react] read-only: Rated 3.6 out of 5 | fills: 100% 100% 100% 60% 0%
[react] mounted                  lit: ..... | checked: 0 | tabbable: 1 | focus: 0 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[react] hover star 3             lit: ***.. | checked: 0 | tabbable: 1 | focus: 0 | Preview: OK | Click a star, or Tab to the stars and use the arrow keys.
[react] mouse leaves             lit: ..... | checked: 0 | tabbable: 1 | focus: 0 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[react] click star 4             lit: ****. | checked: 4 | tabbable: 4 | focus: 0 | 4 of 5, Good | Saved: 4 stars
[react] hover star 2 (after 4)   lit: **... | checked: 4 | tabbable: 4 | focus: 0 | Preview: Bad | Saved: 4 stars
[react] ArrowRight               lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[react] ArrowRight at max        lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[react] Home                     lit: *.... | checked: 1 | tabbable: 1 | focus: 1 | 1 of 5, Terrible | Saved: 1 star
[react] ArrowLeft at 1           lit: *.... | checked: 1 | tabbable: 1 | focus: 1 | 1 of 5, Terrible | Saved: 1 star
[react] End                      lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[react] click star 5 again       lit: ..... | checked: 0 | tabbable: 1 | focus: 5 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[react] labels: 1 star, Terrible / 2 stars, Bad / 3 stars, OK / 4 stars, Good / 5 stars, Great
~~~

What it shows: hover lit three stars without changing <code>checked</code> or the saved value; leaving restored the committed state; hovering star 2 after rating 4 previewed "Bad" while "Saved: 4 stars" stayed; arrows, Home and End changed the value, moved focus and the tab stop together and stopped at the ends; clicking the checked star cleared it. The read-only fills were exactly <code>100% 100% 100% 60% 0%</code>. No <code>console.error</code>. Pointer positions inside a star (needed for half-star input) cannot be tested in jsdom, which has no layout; this solution does not depend on them.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Hover then leave without clicking | <code>hover</code> resets to 0; committed value unchanged |
| Click the current rating | Clears to 0 ("Not rated yet") |
| ArrowRight at 5 / ArrowLeft at 1 | Clamped; nothing changes |
| No rating yet | First star is the Tab stop |
| Fractional average like 3.6 | Fourth star 60 percent gold, rounded to avoid float noise |
| Screen reader, interactive | "Your rating, radio group", each star "4 stars, Good, checked" |
| Screen reader, read-only | One image: "Rated 3.6 out of 5" |
| Focus visible | <code>:focus-visible</code> outline on the focused star |

## 7. Common Pitfalls

- **Committing on hover.** Calling <code>onChange</code> in <code>onMouseEnter</code> saves every star the pointer crosses. Hover is local preview state only.
- **Resetting hover on each star leave.** Moving from star 3 to star 4 fires a leave on 3 first, so the stars flicker to the committed value between them. Reset once, on the group <code>onMouseLeave</code>.
- **Five tab stops.** Giving every star <code>tabIndex=0</code> makes Tab walk through all stars; a roving tabindex gives one stop and arrow keys inside.
- **Buttons without radio semantics.** Five <code>&lt;button&gt;</code>s work for mouse users but announce as five unrelated buttons with no checked state.
- **Raw float widths.** <code>(3.6 - 3) * 100</code> is <code>60.00000000000001</code>; round it.
- **Reading the read-only stars one by one.** Mark the glyphs <code>aria-hidden</code> and label the container instead.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two kinds of state:</strong> <span style="color:#f0e2c8;">"The committed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> belongs to the parent and comes in as a prop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code> preview is local state. I render <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover || value</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Drawing a star:</strong> <span style="color:#f0e2c8;">"Each star is two stacked glyphs; the gold one is clipped with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">overflow: hidden</code>, so the same code draws 0, 60 or 100 percent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two modes:</strong> <span style="color:#f0e2c8;">"Read-only is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=img</code> with a label like Rated 3.6 out of 5. Interactive is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">radiogroup</code> of five <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">radio</code> stars with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-checked</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"Roving tabindex: the checked star is the only Tab stop. Arrows, Home and End compute the next value, clamp it, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> and move focus with a ref array."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edge cases:</strong> <span style="color:#f0e2c8;">"Hover resets on the group leave, clicking the current star clears, ends clamp, and I round the fill percentage to avoid float noise."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add half-star input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMouseMove</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onClick</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.currentTarget.getBoundingClientRect()</code>; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.clientX - rect.left</code> is less than half the width, the value is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 0.5</code>. Keyboard steps by 0.5, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuetext</code> or the radio labels say 3.5 stars. It needs a real browser to test, because jsdom has no layout.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use native radio inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, and it is a strong answer: visually hidden <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input type=radio</code> elements with star labels give you keyboard support and form participation for free. The custom version here shows the ARIA pattern explicitly and allows clicking again to clear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you save the rating to a server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the parent: call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setRating(n)</code> optimistically, send the request, and on failure restore the previous value and show an error. With React 19 you could use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useOptimistic</code> for the same effect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the hover preview?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With Testing Library, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user.hover(star3)</code> then assert three stars are lit and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> was not called; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user.unhover</code> and assert the committed value is shown again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it work inside a form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render a hidden <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name="rating"</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value={value}</code> so a normal form submit includes it, or keep it controlled and read the value from state on submit.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Controlled component** | Value comes from the parent as a prop, changes go out through a callback |
| **Hover preview** | Temporary state shown while the pointer is over a star, never saved |
| **Clipped overlay** | A full shape on top of another, partly hidden with <code>width</code> and <code>overflow</code> |
| **Radio group** | A set of options where exactly one can be chosen |
| **Roving tabindex** | Only one item in a widget is a Tab stop; arrow keys move between items |
| **Accessible name** | The text a screen reader says for an element, from content or <code>aria-label</code> |

---
**Conclusion:** A star rating is two states with two owners: the parent owns the committed value, the component owns a throwaway hover preview, and the screen shows <code>hover &#124;&#124; value</code>. A clipped overlay draws any fraction, a radio group with a roving tabindex makes it a real control for keyboard and screen-reader users, and a read-only <code>role="img"</code> covers averages. The run on React 19.3.1 showed hover, leave, click, clear, arrows, Home and End doing exactly that, with fractional fills of 100, 100, 100, 60 and 0 percent.`,
        files: {
          "/App.js": `import { useState } from "react";
import StarRating from "./src/StarRating";

export default function App() {
  // the parent owns the value: a controlled component
  const [rating, setRating] = useState(0);

  return (
    <main className="page">
      <article className="card">
        <h1>Trail running shoes</h1>
        <p className="avg">
          <StarRating value={3.6} readOnly />{" "}
          <span data-testid="avg">3.6 average from 128 reviews</span>
        </p>
        <h2>Your rating</h2>
        <StarRating value={rating} onChange={setRating} label="Your rating" />
        <p className="saved" data-testid="saved">
          {rating
            ? "Saved: " + rating + " star" + (rating > 1 ? "s" : "")
            : "Click a star, or Tab to the stars and use the arrow keys."}
        </p>
      </article>
    </main>
  );
}
`,
          "/src/StarRating.js": `import { useRef, useState } from "react";

const LABELS = ["Terrible", "Bad", "OK", "Good", "Great"];

function Star({ fill }) {
  // Two stacked glyphs: a grey base and a gold copy clipped to fill (0..1).
  return (
    <span className="star" aria-hidden="true">
      <span className="base">★</span>
      <span className="fill" style={{ width: Math.round(fill * 100) + "%" }}>
        ★
      </span>
    </span>
  );
}

export default function StarRating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  label = "Rating",
}) {
  // transient preview, never reported to the parent
  const [hover, setHover] = useState(0);
  const radios = useRef([]);
  const shown = hover || value;

  if (readOnly) {
    return (
      <span
        className="stars"
        role="img"
        aria-label={"Rated " + value + " out of " + max}
      >
        {Array.from({ length: max }, (_, i) => (
          <Star key={i} fill={Math.max(0, Math.min(1, value - i))} />
        ))}
      </span>
    );
  }

  function select(n) {
    const next = Math.max(1, Math.min(max, n));
    onChange(next);
    radios.current[next - 1]?.focus(); // roving focus follows the selection
  }

  function handleKeyDown(e) {
    const moves = {
      ArrowRight: value + 1,
      ArrowUp: value + 1,
      ArrowLeft: value - 1,
      ArrowDown: value - 1,
      Home: 1,
      End: max,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  }

  return (
    <div className="rating">
      <div
        className="stars"
        role="radiogroup"
        aria-label={label}
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
          return (
            <span
              key={n}
              ref={(el) => {
                radios.current[i] = el;
              }}
              role="radio"
              className="hit"
              data-testid={"star-" + n}
              aria-checked={value === n}
              aria-label={n + (n === 1 ? " star" : " stars") + ", " + LABELS[i]}
              tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)}
              onKeyDown={handleKeyDown}
            >
              <Star fill={shown >= n ? 1 : 0} />
            </span>
          );
        })}
      </div>
      <span className="caption" data-testid="caption">
        {hover
          ? "Preview: " + LABELS[hover - 1]
          : value
            ? value + " of " + max + ", " + LABELS[value - 1]
            : "Not rated yet"}
      </span>
    </div>
  );
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(420px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 8px;
}
h2 {
  font-size: 1rem;
  margin: 20px 0 8px;
  color: #c5cbd6;
}
.avg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #9aa3b2;
  font-size: 0.9rem;
}
.rating {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.stars {
  display: inline-flex;
  gap: 2px;
  font-size: 1.4rem;
  line-height: 1;
}
.rating .stars {
  font-size: 2rem;
}
.star {
  position: relative;
  display: inline-block;
}
.base {
  color: #3a4150;
}
.fill {
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  white-space: nowrap;
  color: #ffc107;
}
.hit {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px;
}
.hit:focus-visible {
  outline: 2px solid #7aa2ff;
}
.caption {
  color: #c5cbd6;
  min-width: 9em;
}
.saved {
  color: #9aa3b2;
  font-size: 0.9rem;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know <code>ref()</code> and templates; the rest is explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution, and the Verified output was printed by mounting it on Vue 3.5.44.

## 1. The Story

A feedback card at a restaurant: you hover your pen over the fourth star, change your mind, hover over the fifth, then circle it in ink. Beside it, the restaurant prints its average, "3.6 stars", which you cannot change. A **star rating component** is both cards: an interactive one with a preview before committing, and a read-only one that can draw a fraction of a star.

## 2. Requirements and the Vue State Model

Five stars; hover previews; click commits; clicking the current rating clears it; arrow keys, Home and End rate from the keyboard; a caption says "4 of 5, Good"; read-only mode draws 3.6 stars and is announced as one image. The parent owns the value through <code>v-model</code>.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| Committed rating | <code>defineModel()</code> | Parent owns it; <code>v-model</code> on the component keeps both sides in sync |
| Hover preview | <code>ref(0)</code> | Local, never emitted |
| Fill per star | <code>computed</code> | Derived from <code>hover &#124;&#124; model</code>, or from the fraction in read-only mode |
| Caption | <code>computed</code> | Derived text |
| Star elements | Plain array via function <code>:ref</code> | Only for <code>focus()</code> |

📌 **Interview term: defineModel** — a <code>&lt;script setup&gt;</code> macro (Vue 3.4+) that declares a <code>modelValue</code> prop and an <code>update:modelValue</code> event and returns a ref: reading it gives the prop, assigning it emits the event. See [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit).

## 3. Build It Step by Step

### 3.1 Model, preview and derived fills

~~~vue
const model = defineModel({ type: Number, default: 0 }); const hover =
ref(0); // transient preview, never emitted to the parent const shown =
computed(() => hover.value || model.value); const radios = []; const
fills = computed(() => Array.from({ length: props.max }, (_, i) =>
props.readOnly ? Math.max(0, Math.min(1, model.value - i)) : shown.value
>= i + 1 ? 1 : 0, ), );
~~~

The <code>fills</code> array is the only thing the template needs: 1 or 0 per star in interactive mode, a fraction in read-only mode. Because it is a [computed](/interview-question/what-is-the-difference-between-computed-and-watch), it updates whenever <code>hover</code> or the model changes and is cached otherwise.

### 3.2 Two templates in one component

~~~vue
<span
  v-if="readOnly"
  class="stars"
  role="img"
  :aria-label="'Rated ' + model + ' out of ' + max"
>
  <span
    v-for="(f, i) in fills"
    :key="i"
    class="star"
    aria-hidden="true"
  >
    <span class="base">★</span
    ><span class="fill" :style="{ width: Math.round(f * 100) + '%' }"
      >★</span
    >
  </span>
</span>
~~~

Each star is two stacked glyphs: a grey base and a gold copy with <code>overflow: hidden</code> and a percentage <code>width</code>.

📌 **Interview term: Clipped overlay** — drawing part of a shape by layering a full copy on top and hiding the rest with <code>width</code> plus <code>overflow: hidden</code>.

<code>Math.round</code> keeps the width clean: <code>(3.6 - 3) * 100</code> is <code>60.00000000000001</code> in floating point. The read-only stars are one <code>role="img"</code> with a label; the glyphs are <code>aria-hidden</code>.

The interactive branch is a radio group:

~~~vue
<div class="stars big" role="radiogroup" :aria-label="label" @mouseleave="hover = 0">
  <span
    v-for="(f, i) in fills"
    :key="i"
    :ref="(el) => (radios[i] = el)"
    role="radio"
    class="hit"
    :data-testid="'star-' + (i + 1)"
    :aria-checked="model === i + 1"
    :aria-label="i + 1 + (i === 0 ? ' star' : ' stars') + ', ' + LABELS[i]"
    :tabindex="model === i + 1 || (model === 0 && i === 0) ? 0 : -1"
    @mouseenter="hover = i + 1"
    @click="model = model === i + 1 ? 0 : i + 1"
    @keydown="onKeydown"
~~~

<code>@mouseleave</code> sits on the group, not on each star, so moving from star 3 to star 4 does not flash back to the committed value. <code>@click</code> assigns the model directly; assigning a <code>defineModel</code> ref emits <code>update:modelValue</code>.

📌 **Interview term: Roving tabindex** — only one star has <code>tabindex="0"</code> (the checked one, or the first when unrated); arrow keys move focus and the tab stop together.

### 3.3 Keyboard

~~~vue
function select(n) { const next = Math.max(1, Math.min(props.max, n));
model.value = next; // emits update:modelValue radios[next -
1]?.focus(); // roving focus follows the selection } function
onKeydown(e) { const v = model.value; const moves = { ArrowRight: v + 1,
ArrowUp: v + 1, ArrowLeft: v - 1, ArrowDown: v - 1, Home: 1, End:
props.max }; if (!(e.key in moves)) return; e.preventDefault();
select(moves[e.key]); }
~~~

### 3.4 The parent

~~~vue
  <StarRating :model-value="3.6" read-only /> <span data-testid="avg">3.6 average from 128 reviews</span>
</p>
<h2>Your rating</h2>
<StarRating v-model="rating" label="Your rating" />
~~~

The read-only instance passes <code>:model-value</code> without listening for updates, which is fine: it never assigns the model.

## 4. Verified

Compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code> in jsdom, and driven with real events: native <code>mouseenter</code> on a star and <code>mouseleave</code> on the group (the driver also fires <code>mouseover</code>/<code>mouseout</code> for the React version, which Vue ignores), clicks and keydowns. <code>lit</code> is which stars are gold, <code>checked</code> the <code>aria-checked</code> star, <code>tabbable</code> the star with tabindex 0, <code>focus</code> the focused star (0 = none):

~~~text
[vue] RENDERED: Trail running shoes★★★★★★★★★★ 3.6 average from 128 reviewsYour rating★★★★★★★★★★Not rated yetClick a star, or Tab to the stars and use the arrow keys.
[vue] read-only: Rated 3.6 out of 5 | fills: 100% 100% 100% 60% 0%
[vue] mounted                  lit: ..... | checked: 0 | tabbable: 1 | focus: 0 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[vue] hover star 3             lit: ***.. | checked: 0 | tabbable: 1 | focus: 0 | Preview: OK | Click a star, or Tab to the stars and use the arrow keys.
[vue] mouse leaves             lit: ..... | checked: 0 | tabbable: 1 | focus: 0 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[vue] click star 4             lit: ****. | checked: 4 | tabbable: 4 | focus: 0 | 4 of 5, Good | Saved: 4 stars
[vue] hover star 2 (after 4)   lit: **... | checked: 4 | tabbable: 4 | focus: 0 | Preview: Bad | Saved: 4 stars
[vue] ArrowRight               lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[vue] ArrowRight at max        lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[vue] Home                     lit: *.... | checked: 1 | tabbable: 1 | focus: 1 | 1 of 5, Terrible | Saved: 1 star
[vue] ArrowLeft at 1           lit: *.... | checked: 1 | tabbable: 1 | focus: 1 | 1 of 5, Terrible | Saved: 1 star
[vue] End                      lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[vue] click star 5 again       lit: ..... | checked: 0 | tabbable: 1 | focus: 5 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[vue] labels: 1 star, Terrible / 2 stars, Bad / 3 stars, OK / 4 stars, Good / 5 stars, Great
~~~

The preview never touched the saved value, leaving restored it, arrows and Home/End moved value, focus and tab stop together and clamped at the ends, and a second click cleared the rating. No Vue warnings or <code>console.error</code>. Half-star pointer input is not part of this build, and pointer geometry could not be tested in jsdom anyway.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Hover across stars | Preview follows; reset only when leaving the group |
| Click the current rating | Model set to 0 |
| Arrow past the ends | Clamped to 1..max |
| Unrated | First star is the Tab stop |
| Read-only 3.6 | Fills 100, 100, 100, 60, 0 percent; one label for screen readers |
| Interactive names | "4 stars, Good" with <code>aria-checked</code> |

## 6. Common Pitfalls

- **Mutating the prop.** <code>props.modelValue = 3</code> warns and does nothing useful; assign the <code>defineModel</code> ref, which emits instead.
- **Emitting on hover.** Hover is a preview; only clicks and keys assign the model.
- **<code>@mouseleave</code> on each star.** It flickers between stars; put it on the group.
- **A tab stop per star.** Use a roving tabindex; Tab should enter and leave the group in one step.
- **Raw fraction widths.** Round <code>f * 100</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"The rating is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> ref, so the parent writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>. Hover is a local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> that is never emitted, and a computed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fills</code> array uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover || model</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Drawing:</strong> <span style="color:#f0e2c8;">"Each star is a grey glyph with a gold copy on top, clipped by a percentage <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">overflow: hidden</code>, so fractions just work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two branches:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if=readOnly</code> renders one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=img</code> labelled Rated 3.6 out of 5; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-else</code> renders a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">radiogroup</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">radio</code> stars with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-checked</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"A roving tabindex makes the checked star the only Tab stop. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keydown</code> maps arrows, Home and End to a value, clamps it, assigns the model and focuses that star."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mouseleave</code> on the group, click again to clear, and rounded fill widths."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add half stars on hover?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@mousemove</code>, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.clientX</code> with the star <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect()</code> midpoint and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 0.5</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>; the clipped overlay already draws halves. Test it in a real browser because jsdom has no layout.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why defineModel instead of a prop and an emit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the same contract with less code: the macro declares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> and gives a ref you can read and assign. Before Vue 3.4 you wrote both by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a slot for the star icon?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a scoped slot like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot name="star" :fill="f"&gt;</code> lets the parent draw hearts or custom SVGs while the component keeps the logic and ARIA.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With Vue Test Utils: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("mouseenter")</code> on star 3, assert three are lit and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> was emitted; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("click")</code> on star 4 and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrapper.emitted("update:modelValue")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[4]]</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **defineModel** | Macro that turns a prop plus update event into one writable ref |
| **Hover preview** | Temporary rating shown under the pointer, never saved |
| **Clipped overlay** | A full shape on top of another, partly hidden |
| **Radio group** | Options where exactly one is chosen |
| **Roving tabindex** | One Tab stop per widget; arrows move inside |

---
**Conclusion:** In Vue the star rating is a <code>defineModel</code> ref owned by the parent, a local hover <code>ref</code>, and one computed <code>fills</code> array that the template draws with clipped overlays. A radio group with a roving tabindex makes it usable from the keyboard and by screen readers, and the read-only branch is a single labelled image. The Vue 3.5.44 run printed the same preview, commit, clear and keyboard behaviour as the React and Angular versions.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import StarRating from "./components/StarRating.vue";

const rating = ref(0); // the parent owns the value; v-model keeps it in sync
</script>

<template>
  <main class="page">
    <article class="card">
      <h1>Trail running shoes</h1>
      <p class="avg">
        <StarRating
          :model-value="3.6"
          read-only
        /> <span data-testid="avg">3.6 average from 128 reviews</span>
      </p>
      <h2>Your rating</h2>
      <StarRating v-model="rating" label="Your rating" />
      <p class="saved" data-testid="saved">
        {{ rating ? "Saved: " + rating + " star" + (rating > 1 ? "s" : "") : "Click a star, or Tab to the stars and use the arrow keys." }}
      </p>
    </article>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(420px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 8px;
}
h2 {
  font-size: 1rem;
  margin: 20px 0 8px;
  color: #c5cbd6;
}
.avg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #9aa3b2;
  font-size: 0.9rem;
}
.saved {
  color: #9aa3b2;
  font-size: 0.9rem;
}
</style>
`,
          "/src/components/StarRating.vue": `<script setup>
import { computed, ref } from "vue";

const LABELS = ["Terrible", "Bad", "OK", "Good", "Great"];

const props = defineProps({
  max: { type: Number, default: 5 },
  readOnly: { type: Boolean, default: false },
  label: { type: String, default: "Rating" },
});
// defineModel (Vue 3.4+) declares the modelValue
// prop and the update:modelValue event in one line.
const model = defineModel({ type: Number, default: 0 });

const hover = ref(0); // transient preview, never emitted to the parent
const shown = computed(() => hover.value || model.value);
const radios = [];

const fills = computed(() =>
  Array.from({ length: props.max }, (_, i) =>
    props.readOnly
      ? Math.max(0, Math.min(1, model.value - i))
      : shown.value >= i + 1
        ? 1
        : 0,
  ),
);

const caption = computed(() =>
  hover.value
    ? "Preview: " + LABELS[hover.value - 1]
    : model.value
      ? model.value + " of " + props.max + ", " + LABELS[model.value - 1]
      : "Not rated yet",
);

function select(n) {
  const next = Math.max(1, Math.min(props.max, n));
  model.value = next; // emits update:modelValue
  radios[next - 1]?.focus(); // roving focus follows the selection
}

function onKeydown(e) {
  const v = model.value;
  const moves = {
    ArrowRight: v + 1,
    ArrowUp: v + 1,
    ArrowLeft: v - 1,
    ArrowDown: v - 1,
    Home: 1,
    End: props.max,
  };
  if (!(e.key in moves)) return;
  e.preventDefault();
  select(moves[e.key]);
}
</script>

<template>
  <span
    v-if="readOnly"
    class="stars"
    role="img"
    :aria-label="'Rated ' + model + ' out of ' + max"
  >
    <span v-for="(f, i) in fills" :key="i" class="star" aria-hidden="true">
      <span class="base">★</span
      ><span class="fill" :style="{ width: Math.round(f * 100) + '%' }">★</span>
    </span>
  </span>

  <div v-else class="rating">
    <div
      class="stars big"
      role="radiogroup"
      :aria-label="label"
      @mouseleave="hover = 0"
    >
      <span
        v-for="(f, i) in fills"
        :key="i"
        :ref="(el) => (radios[i] = el)"
        role="radio"
        class="hit"
        :data-testid="'star-' + (i + 1)"
        :aria-checked="model === i + 1"
        :aria-label="i + 1 + (i === 0 ? ' star' : ' stars') + ', ' + LABELS[i]"
        :tabindex="model === i + 1 || (model === 0 && i === 0) ? 0 : -1"
        @mouseenter="hover = i + 1"
        @click="model = model === i + 1 ? 0 : i + 1"
        @keydown="onKeydown"
      >
        <span class="star" aria-hidden="true">
          <span class="base">★</span
          ><span class="fill" :style="{ width: Math.round(f * 100) + '%' }"
            >★</span
          >
        </span>
      </span>
    </div>
    <span class="caption" data-testid="caption">{{ caption }}</span>
  </div>
</template>

<style scoped>
.rating {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.stars {
  display: inline-flex;
  gap: 2px;
  font-size: 1.4rem;
  line-height: 1;
}
.stars.big {
  font-size: 2rem;
}
.star {
  position: relative;
  display: inline-block;
}
.base {
  color: #3a4150;
}
.fill {
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  white-space: nowrap;
  color: #ffc107;
}
.hit {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px;
}
.hit:focus-visible {
  outline: 2px solid #7aa2ff;
}
.caption {
  color: #c5cbd6;
  min-width: 9em;
}
</style>
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know components and templates; signals and the rest are explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution; the Verified output was printed by booting it on Angular 22.2.3, compiled ahead of time with strict templates and at runtime like the playground.

## 1. The Story

On a restaurant feedback card you hover your pen over the fourth star, reconsider, then circle the fifth in ink; next to it the restaurant prints its average, 3.6 stars. A **star rating component** is both: an interactive control with a preview before committing, and a read-only display that draws a fraction of a star.

## 2. Requirements and the Angular State Model

Five stars; hover previews; click commits; clicking the current rating clears it; arrows, Home and End work from the keyboard; a caption reads "4 of 5, Good"; read-only mode draws 3.6 stars as one labelled image; the parent owns the value with <code>[(value)]</code>.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| Committed rating | <code>@Input() set value()</code> feeding a <code>signal</code>, plus <code>@Output() valueChange</code> | Two-way binding with <code>[(value)]</code>; the signal lets <code>computed()</code> depend on the input |
| Hover preview | <code>signal(0)</code> | Local, never emitted |
| Fills and caption | <code>computed()</code> | Derived and cached |
| Star elements | <code>@ViewChildren("radio")</code> | Only for <code>focus()</code> |

📌 **Interview term: Banana-in-a-box** — the <code>[(value)]</code> syntax. Angular expands it to <code>[value]="x" (valueChange)="x = $event"</code>, so any component with an input <code>value</code> and an output <code>valueChange</code> supports it. With a signal on the parent side, Angular writes the signal. See [two-way binding under the hood](/interview-question/how-does-two-way-binding-work-under-the-hood).

The playground runtime JIT does not register signal <code>input()</code> and <code>model()</code>, so the solution uses an input setter that writes a signal, which gives the same benefit.

## 3. Build It Step by Step

### 3.1 Input setter, output and derived state

~~~ts
@Input() set value(v: number) {
  this.current.set(v);
}
// value + valueChange enables [(value)]
@Output() valueChange = new EventEmitter<number>();
@Input() max = 5;
@Input() readOnly = false;
@Input() label = "Rating";
@ViewChildren("radio") radios!: QueryList<ElementRef<HTMLElement>>;

readonly labels = LABELS;
readonly current = signal(0);
readonly hover = signal(0); // transient preview, never emitted

readonly fills = computed(() => {
  const shown = this.hover() || this.current();
  return Array.from({ length: this.max }, (_, i) =>
    Math.round(
      100 *
        (this.readOnly
          ? Math.max(0, Math.min(1, this.current() - i))
          : shown >= i + 1
            ? 1
            : 0),
    ),
  );
});
~~~

A plain <code>@Input() value = 0</code> would work in the template, but <code>computed()</code> only tracks signals. Writing the input into <code>current</code> makes <code>fills</code> and <code>caption</code> real computed values that recalculate when either the input or the hover changes. Rounding inside <code>fills</code> avoids <code>60.00000000000001</code>, which is what <code>(3.6 - 3) * 100</code> gives in floating point.

📌 **Interview term: computed()** — a signal whose value is derived from other signals, recalculated lazily when one of them changes. See [computed signals vs method calls](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

### 3.2 The template

~~~ts
<div class="stars big" role="radiogroup" [attr.aria-label]="label" (mouseleave)="hover.set(0)">
  @for (f of fills(); track $index; let i = $index) {
    <span
      #radio
      role="radio"
      class="hit"
      [attr.data-testid]="'star-' + (i + 1)"
      [attr.aria-checked]="current() === i + 1"
      [attr.aria-label]="i + 1 + (i === 0 ? ' star' : ' stars') + ', ' + labels[i]"
      [attr.tabindex]="current() === i + 1 || (current() === 0 && i === 0) ? 0 : -1"
      (mouseenter)="hover.set(i + 1)"
      (click)="choose(current() === i + 1 ? 0 : i + 1)"
      (keydown)="onKeydown($event)"
~~~

<code>@if (readOnly)</code> chooses between one <code>role="img"</code> with a label and this radio group. Each star is two stacked glyphs; <code>[style.width.%]="f"</code> sets the gold layer width with a unit suffix binding.

📌 **Interview term: Roving tabindex** — only the checked star (or the first, when unrated) has <code>tabindex="0"</code>; arrow keys move focus and that tab stop together.

<code>(mouseleave)</code> is on the group, so moving between stars does not flicker. <code>[attr.aria-checked]</code> and <code>[attr.tabindex]</code> are attribute bindings: they set the HTML attribute itself, which is what assistive technology reads.

### 3.3 Choosing and the keyboard

~~~ts
choose(n: number): void {
  // update locally too, so it also works without a parent binding
  this.current.set(n);
  this.valueChange.emit(n);
}

onKeydown(e: KeyboardEvent): void {
  const v = this.current();
  const moves: Record<string, number> = {
    ArrowRight: v + 1,
    ArrowUp: v + 1,
    ArrowLeft: v - 1,
    ArrowDown: v - 1,
    Home: 1,
    End: this.max,
  };
  if (!(e.key in moves)) return;
  e.preventDefault();
  const next = Math.max(1, Math.min(this.max, moves[e.key]));
  this.choose(next);
  // roving focus follows the selection
  this.radios.get(next - 1)?.nativeElement.focus();
}
~~~

<code>choose</code> updates the local signal as well as emitting, so the component still works if a parent binds only <code>[value]</code>; with <code>[(value)]</code> the parent writes the same number back through the setter.

### 3.4 The parent

~~~ts
  <app-star-rating [value]="3.6" [readOnly]="true" /> <span data-testid="avg">3.6 average from 128 reviews</span>
</p>
<h2>Your rating</h2>
<app-star-rating [(value)]="rating" label="Your rating" />
~~~

## 4. Verified

Compiled with <code>ngc</code> and <code>strictTemplates</code> (<code>angular:app</code>) and also booted with runtime JIT (<code>angular:playground</code>), each via <code>bootstrapApplication(AppComponent)</code> in jsdom. The driver fired native <code>mouseenter</code> on a star and <code>mouseleave</code> on the group, clicks and keydowns. <code>lit</code> is which stars are gold, <code>checked</code> the <code>aria-checked</code> star, <code>tabbable</code> the tab stop, <code>focus</code> the focused star (0 = none). AOT output; the JIT run printed the same lines:

~~~text
[angular:app] RENDERED: Trail running shoes★★★★★★★★★★3.6 average from 128 reviewsYour rating★★★★★★★★★★Not rated yet Click a star, or Tab to the stars and use the arrow keys.
[angular:app] read-only: Rated 3.6 out of 5 | fills: 100% 100% 100% 60% 0%
[angular:app] mounted                  lit: ..... | checked: 0 | tabbable: 1 | focus: 0 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[angular:app] hover star 3             lit: ***.. | checked: 0 | tabbable: 1 | focus: 0 | Preview: OK | Click a star, or Tab to the stars and use the arrow keys.
[angular:app] mouse leaves             lit: ..... | checked: 0 | tabbable: 1 | focus: 0 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[angular:app] click star 4             lit: ****. | checked: 4 | tabbable: 4 | focus: 0 | 4 of 5, Good | Saved: 4 stars
[angular:app] hover star 2 (after 4)   lit: **... | checked: 4 | tabbable: 4 | focus: 0 | Preview: Bad | Saved: 4 stars
[angular:app] ArrowRight               lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[angular:app] ArrowRight at max        lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[angular:app] Home                     lit: *.... | checked: 1 | tabbable: 1 | focus: 1 | 1 of 5, Terrible | Saved: 1 star
[angular:app] ArrowLeft at 1           lit: *.... | checked: 1 | tabbable: 1 | focus: 1 | 1 of 5, Terrible | Saved: 1 star
[angular:app] End                      lit: ***** | checked: 5 | tabbable: 5 | focus: 5 | 5 of 5, Great | Saved: 5 stars
[angular:app] click star 5 again       lit: ..... | checked: 0 | tabbable: 1 | focus: 5 | Not rated yet | Click a star, or Tab to the stars and use the arrow keys.
[angular:app] labels: 1 star, Terrible / 2 stars, Bad / 3 stars, OK / 4 stars, Good / 5 stars, Great
~~~

Preview without saving, restore on leave, keyboard moves that keep focus and tab stop in step, clamping at the ends and click-to-clear all behaved as intended. No <code>console.error</code>. Pointer geometry (for half-star input) was not tested; jsdom has no layout.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Hover across stars | Preview follows; reset on leaving the group |
| Click the current rating | Emits 0 |
| Arrow past the ends | Clamped |
| Unrated | First star is the Tab stop |
| Read-only 3.6 | 100, 100, 100, 60, 0 percent fills, one <code>role="img"</code> label |
| Interactive names | "4 stars, Good" plus <code>aria-checked</code> |

## 6. Common Pitfalls

- **Expecting <code>computed()</code> to track a plain <code>@Input()</code> field.** It does not; feed the input into a signal.
- **Binding ARIA state as a DOM property.** Screen readers read the attribute; <code>[attr.aria-checked]</code> sets exactly that and works across Angular versions.
- **Naming the output anything but <code>valueChange</code>.** <code>[(value)]</code> only works with the <code>Change</code> suffix.
- **Emitting on hover.** Only click and keys commit.
- **Signal <code>model()</code> in the playground.** It is the modern way, but it does not register under the playground JIT.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"The rating comes in through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> setter that writes a signal and goes out through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code>, so the parent can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>. Hover is a local signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Derived:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> builds the fill percentages from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover() || current()</code>, or from the fraction in read-only mode, rounded to whole percents."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> picks a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=img</code> display or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">radiogroup</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> renders stars as two stacked glyphs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[style.width.%]</code> on the gold one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keyboard:</strong> <span style="color:#f0e2c8;">"A roving tabindex via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.tabindex]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(keydown)</code> maps arrows, Home and End, clamps, emits, and focuses the star through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(mouseleave)</code> on the group to avoid flicker, click again to clear, and attribute bindings for ARIA."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use it in a reactive form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets the signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores the callback that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">choose</code> calls, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnTouched</code> fires on blur, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> turns off the handlers. Provide it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would change with signal inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a normal Angular 17.1+ build, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value = model(0)</code> replaces the setter, the output and the extra signal in one line, and the parent keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add half stars?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(mousemove)</code>, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$event.clientX</code> with the star <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect()</code> midpoint and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 0.5</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>. The overlay already draws halves. Test in a real browser.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed: set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.componentRef.setInput("value", 3)</code>, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseenter</code> on star 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, assert two stars are lit and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code> did not emit; then click and assert it emitted once.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Banana-in-a-box** | <code>[(x)]</code>: input <code>x</code> plus output <code>xChange</code> |
| **Input setter** | A setter decorated with <code>@Input()</code>, run whenever the parent passes a new value |
| **computed()** | A derived, cached signal |
| **Roving tabindex** | One Tab stop per widget; arrows move inside |
| **Attribute binding** | <code>[attr.name]</code>, sets an HTML attribute instead of a DOM property |

---
**Conclusion:** The Angular star rating feeds its <code>@Input</code> into a signal so that <code>computed()</code> can derive fills and the caption, exposes <code>valueChange</code> for <code>[(value)]</code>, and uses <code>@if</code>/<code>@for</code> with attribute bindings for the ARIA radio pattern. Run in AOT strict mode and in the playground JIT on Angular 22.2.3, it printed the same preview, commit, clear and keyboard results as the React and Vue versions.`,
        files: {
          "/src/app/app.component.ts": `import { DOCUMENT } from "@angular/common";
import { Component, signal, inject } from "@angular/core";
import { StarRatingComponent } from "./star-rating.component";

@Component({
  selector: "app-root",
  imports: [StarRatingComponent],
  template: \`
    <main class="page">
      <article class="card">
        <h1>Trail running shoes</h1>
        <p class="avg">
          <app-star-rating [value]="3.6" [readOnly]="true" />
          <span data-testid="avg">3.6 average from 128 reviews</span>
        </p>
        <h2>Your rating</h2>
        <app-star-rating [(value)]="rating" label="Your rating" />
        <p class="saved" data-testid="saved">
          {{
            rating()
              ? "Saved: " + rating() + " star" + (rating() > 1 ? "s" : "")
              : "Click a star, or Tab to the stars and use the arrow keys."
          }}
        </p>
      </article>
    </main>
  \`,
  styles: [
    \`
      :host {
        display: block;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .card {
        width: min(420px, 100%);
        background: #181b22;
        border: 1px solid #2a2f3a;
        border-radius: 14px;
        padding: 20px;
        box-sizing: border-box;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 8px;
      }
      h2 {
        font-size: 1rem;
        margin: 20px 0 8px;
        color: #c5cbd6;
      }
      .avg {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        color: #9aa3b2;
        font-size: 0.9rem;
      }
      .saved {
        color: #9aa3b2;
        font-size: 0.9rem;
      }
    \`,
  ],
})
export class AppComponent {
  constructor() {
    // The playground page has a default white
    // body margin; make the whole page dark.
    inject(DOCUMENT).body.style.cssText = "margin: 0; background: #0f1115;";
  }

  readonly rating = signal(0); // [(value)]="rating" two-way binds the signal
}
`,
          "/src/app/star-rating.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
  computed,
  signal,
} from "@angular/core";

const LABELS = ["Terrible", "Bad", "OK", "Good", "Great"];

@Component({
  selector: "app-star-rating",
  template: \`
    @if (readOnly) {
      <span
        class="stars"
        role="img"
        [attr.aria-label]="'Rated ' + current() + ' out of ' + max"
      >
        @for (f of fills(); track $index) {
          <span class="star" aria-hidden="true"
            ><span class="base">★</span
            ><span class="fill" [style.width.%]="f">★</span></span
          >
        }
      </span>
    } @else {
      <div class="rating">
        <div
          class="stars big"
          role="radiogroup"
          [attr.aria-label]="label"
          (mouseleave)="hover.set(0)"
        >
          @for (f of fills(); track $index; let i = $index) {
            <span
              #radio
              role="radio"
              class="hit"
              [attr.data-testid]="'star-' + (i + 1)"
              [attr.aria-checked]="current() === i + 1"
              [attr.aria-label]="
                i + 1 + (i === 0 ? ' star' : ' stars') + ', ' + labels[i]
              "
              [attr.tabindex]="
                current() === i + 1 || (current() === 0 && i === 0) ? 0 : -1
              "
              (mouseenter)="hover.set(i + 1)"
              (click)="choose(current() === i + 1 ? 0 : i + 1)"
              (keydown)="onKeydown($event)"
            >
              <span class="star" aria-hidden="true"
                ><span class="base">★</span
                ><span class="fill" [style.width.%]="f">★</span></span
              >
            </span>
          }
        </div>
        <span class="caption" data-testid="caption">{{ caption() }}</span>
      </div>
    }
  \`,
  styles: [
    \`
      .rating {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .stars {
        display: inline-flex;
        gap: 2px;
        font-size: 1.4rem;
        line-height: 1;
      }
      .stars.big {
        font-size: 2rem;
      }
      .star {
        position: relative;
        display: inline-block;
      }
      .base {
        color: #3a4150;
      }
      .fill {
        position: absolute;
        left: 0;
        top: 0;
        overflow: hidden;
        white-space: nowrap;
        color: #ffc107;
      }
      .hit {
        cursor: pointer;
        border-radius: 6px;
        padding: 2px;
      }
      .hit:focus-visible {
        outline: 2px solid #7aa2ff;
      }
      .caption {
        color: #c5cbd6;
        min-width: 9em;
      }
    \`,
  ],
})
export class StarRatingComponent {
  // An @Input setter feeds a signal, so
  // computed() below can depend on the input.
  @Input() set value(v: number) {
    this.current.set(v);
  }
  // value + valueChange enables [(value)]
  @Output() valueChange = new EventEmitter<number>();
  @Input() max = 5;
  @Input() readOnly = false;
  @Input() label = "Rating";
  @ViewChildren("radio") radios!: QueryList<ElementRef<HTMLElement>>;

  readonly labels = LABELS;
  readonly current = signal(0);
  readonly hover = signal(0); // transient preview, never emitted

  readonly fills = computed(() => {
    const shown = this.hover() || this.current();
    return Array.from({ length: this.max }, (_, i) =>
      Math.round(
        100 *
          (this.readOnly
            ? Math.max(0, Math.min(1, this.current() - i))
            : shown >= i + 1
              ? 1
              : 0),
      ),
    );
  });

  readonly caption = computed(() => {
    const h = this.hover(),
      v = this.current();
    return h
      ? "Preview: " + LABELS[h - 1]
      : v
        ? v + " of " + this.max + ", " + LABELS[v - 1]
        : "Not rated yet";
  });

  choose(n: number): void {
    // update locally too, so it also works without a parent binding
    this.current.set(n);
    this.valueChange.emit(n);
  }

  onKeydown(e: KeyboardEvent): void {
    const v = this.current();
    const moves: Record<string, number> = {
      ArrowRight: v + 1,
      ArrowUp: v + 1,
      ArrowLeft: v - 1,
      ArrowDown: v - 1,
      Home: 1,
      End: this.max,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = Math.max(1, Math.min(this.max, moves[e.key]));
    this.choose(next);
    // roving focus follows the selection
    this.radios.get(next - 1)?.nativeElement.focus();
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Tag / Chip Input",
    seoDescription:
      "Build a tag (chip) input in React, Vue and Angular: Enter and comma to add, dedupe, limits, two-step Backspace removal, paste splitting and a11y.",
    description: `**Question presented to candidate:**
"Our post editor needs a topics field. Users type a topic and press Enter or a comma to turn it into a chip; each chip has a remove button; Backspace in the empty box removes the last chip. No duplicates, at most five topics. Build it as a reusable component whose parent receives the list."

**Requirements:**
- Enter or a comma turns the typed text into a chip. Text is trimmed and inner spaces collapsed; empty text is ignored.
- Pasting "a, b, c" adds several chips at once; text after the last comma stays in the box.
- Duplicates are rejected case-insensitively, tags longer than 20 characters are rejected, and at most 5 tags are allowed. Each rejection is explained.
- Each chip has an accessible remove button; after removing, focus returns to the text box.
- Backspace in an empty box first highlights the last chip, and a second Backspace removes it.
- Clicking anywhere in the field focuses the text box. The parent owns the array of tags.
- Messages ("Added vue", "vue is already added") are announced to screen readers.

**What a strong answer should cover:**
- The state split: the tag array (owned by the parent, controlled) versus the draft text, the armed flag and the message (local).
- A pure \`addParts\` helper that validates and returns the next list plus a message, which makes the rules easy to test.
- Handling commas in the \`input\` event, not \`keydown\`, so paste and mobile keyboards work; Enter in \`keydown\` with an IME composition guard.
- Focus management after removal, and a live region for announcements.
- Stable keys for the chips (the tag text, since tags are unique).

**Clarifying questions expected:**
- "Are tags case-sensitive? Should 'React' and 'react' count as the same?"
- "Free text, or only tags from a suggestion list?"
- "What separators besides Enter and comma: Tab, space, semicolon?"

**Code / implementation expected:** Yes. A working component with add, dedupe, limits, remove by button and Backspace, paste splitting and announcements.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know React components and <code>useState</code>; everything else is explained.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Code excerpts come from the runnable solution; the Verified output was printed by running it on React 19.3.1.

## 1. Why This Even Matters — A Story First

Picture labelling jars in a pantry. You write "flour" on a sticker and put it on the jar. If you already have a "Flour" sticker, you do not want a second one. The roll only has five stickers left. And if you peel one off by accident, you want a moment of "are you sure?" before it is gone.

A **tag input** (also called a chip input) is that sticker roll on a web page. You type, press Enter or a comma, and the text becomes a small pill, a **chip**, with a little × to remove it. Email "To" fields, topic pickers and filter bars all use it. It looks like one text box, but it is really a list editor with a text box at the end, which is why it is a good interview question: keyboard rules, validation, focus, paste and accessibility all meet in about a hundred lines.

📌 **Interview term: Chip** — a compact, removable element that represents one value (a tag, a recipient, a filter). A chip input edits a list of them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are tags case-insensitive ("React" equals "react")? | Decides how duplicates are detected, and which spelling is kept. |
| Free text, or only values from a list? | Suggestions turn this into a [combobox](/interview-question/build-a-combobox-search-select), a much bigger build. |
| Which separators: Enter, comma, Tab, space? | Space breaks multi-word tags; Tab conflicts with moving focus. |
| Any limits on count or length? | Limits need clear feedback, not silent failure. |
| How should Backspace on an empty box behave? | Instant delete is fast but easy to trigger by accident. |

For this build: case-insensitive, free text, Enter and comma, at most 5 tags of up to 20 characters, and a two-step Backspace.

## 3. Requirements and Plan

Files: <code>/App.js</code> (a post editor that owns the list), <code>/src/TagInput.js</code> (the component) and <code>/src/tags.js</code> (pure validation).

| Piece | Owner | Kind |
| :--- | :--- | :--- |
| <code>tags</code> (the list) | Parent | Prop <code>value</code> + <code>onChange</code> (controlled) |
| <code>draft</code> (text not yet a tag) | Component | <code>useState</code> |
| <code>armed</code> (last chip marked for removal) | Component | <code>useState</code> |
| <code>message</code> (what to announce) | Component | <code>useState</code> |
| The text box element | Component | <code>useRef</code>, for focus |
| Count, placeholder, "armed" style | Derived | From the above, not stored |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Data flow: typing and keys go into TagInput, which calls the pure addParts helper, then calls onChange with the new list. The parent stores tags and passes them back down as value.">
  <defs>
    <marker id="mc06q3r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="110" width="150" height="64" rx="10"/>
  <text class="d-text" x="95" y="137" text-anchor="middle">User</text>
  <text class="d-sub" x="95" y="158" text-anchor="middle">types, keys, paste</text>
  <rect class="d-box-accent" x="260" y="110" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="350" y="137" text-anchor="middle">TagInput</text>
  <text class="d-sub" x="350" y="158" text-anchor="middle">draft, armed, message</text>
  <rect class="d-box" x="530" y="20" width="150" height="64" rx="10"/>
  <text class="d-text" x="605" y="47" text-anchor="middle">addParts</text>
  <text class="d-sub" x="605" y="68" text-anchor="middle">pure rules</text>
  <rect class="d-box" x="530" y="200" width="150" height="64" rx="10"/>
  <text class="d-text" x="605" y="227" text-anchor="middle">App</text>
  <text class="d-sub" x="605" y="248" text-anchor="middle">tags state</text>
  <path class="d-edge" d="M 176 142 L 254 142" marker-end="url(#mc06q3r-arrow)"/>
  <path class="d-edge-dashed" d="M 446 120 L 524 62" marker-end="url(#mc06q3r-arrow)"/>
  <path class="d-edge-accent" d="M 446 164 L 524 222" marker-end="url(#mc06q3r-arrow)"/>
  <text class="d-sub" x="455" y="214" text-anchor="end">onChange(next)</text>
  <path class="d-edge-accent" d="M 530 250 L 350 250 L 350 180" marker-end="url(#mc06q3r-arrow)"/>
  <text class="d-sub" x="440" y="276" text-anchor="middle">value</text>
</svg>

The rules live in a pure function, the list lives in the parent, and the component only holds what the parent does not care about: the half-typed text, the armed flag and the last message.

## 4. Build It Step by Step

### 4.1 The rules as a pure function

~~~js
export function addParts(tags, parts, { max, maxLength }) {
  const next = [...tags];
  const added = [];
  let problem = "";
  for (const part of parts) {
    const tag = part.trim().replace(/ +/g, " ");
    if (!tag) continue;
    if (tag.length > maxLength)
      problem = "Tags can be at most " + maxLength + " characters";
    else if (next.some((t) => t.toLowerCase() === tag.toLowerCase()))
      problem = tag + " is already added";
    else if (next.length >= max)
      problem = "You can add up to " + max + " tags";
    else {
      next.push(tag);
      added.push(tag);
    }
  }
  const message = [
    added.length ? "Added " + added.join(", ") : "",
    problem,
  ]
    .filter(Boolean)
    .join(". ");
  return { next, message, ok: problem === "" };
}
~~~

<code>addParts</code> takes the current list and some candidate strings, and returns the next list, a message and whether everything was accepted. It never touches React, so it is trivial to unit test, and the Vue and Angular versions of this widget share the exact same function. Cleaning is <code>trim()</code> plus collapsing repeated spaces; duplicates are compared lowercased, and the first spelling wins.

📌 **Interview term: Pure function** — a function whose result depends only on its arguments and which changes nothing outside itself. Business rules belong in pure functions; components call them.

### 4.2 Commas belong to the input event

~~~jsx
function handleChange(e) {
  setArmed(false);
  const raw = e.target.value;
  // Commas are handled here, not in keydown: this also covers paste and
  // Android keyboards, whose keydown reports key "Unidentified".
  if (!raw.includes(",")) return setDraft(raw);
  const parts = raw.split(",");
  const rest = parts.pop();
  add(parts);
  setDraft(rest.trimStart());
}
~~~

You could catch the comma in <code>keydown</code>. That breaks in two common cases. Pasting "svelte, solid" fires no comma keydown at all. And many Android virtual keyboards go through an IME (input method editor) and report <code>key</code> as "Unidentified" with <code>keyCode</code> 229 on keydown (see this [Chromium code review](https://codereview.chromium.org/1811553002) and the [React issue discussion](https://lightrun.com/answers/facebook-react-eventkey--unidentified-eventkeycode--229)). The <code>input</code> event always sees the new value, so the handler splits on commas there: every part except the last becomes a tag, and the last part stays in the box as the new draft.

### 4.3 Enter, Backspace and Escape

~~~jsx
function handleKeyDown(e) {
  if (e.key === "Enter") {
    // Enter is confirming an IME candidate
    if (e.nativeEvent.isComposing) return;
    e.preventDefault(); // do not submit a surrounding form
    if (draft.trim() && add([draft])) setDraft("");
  } else if (
    e.key === "Backspace" &&
    draft === "" &&
    value.length > 0
  ) {
    if (armed) remove(value.length - 1);
    else {
      setArmed(true);
      setMessage(
        "Press Backspace again to remove " + value[value.length - 1],
      );
    }
  } else if (e.key === "Escape") {
    setArmed(false);
  }
}
~~~

- **Enter** commits the draft. <code>e.nativeEvent.isComposing</code> is true while a Japanese or Chinese IME is choosing characters; Enter then confirms the candidate and must not add a tag. <code>preventDefault()</code> stops a surrounding form from submitting. The draft is only cleared if the tag was accepted, so a rejected duplicate stays visible for editing.
- **Backspace** in an empty box arms the last chip (it turns red and the live region says "Press Backspace again to remove qwik"); a second Backspace removes it. Any typing disarms.
- **Escape** disarms.

📌 **Interview term: IME composition** — text entry where several keystrokes build one character (common for CJK languages). During composition, <code>isComposing</code> is true and Enter belongs to the IME.

### 4.4 Removing and focus

~~~jsx
function remove(index) {
  setMessage("Removed " + value[index]);
  onChange(value.filter((_, i) => i !== index));
  setArmed(false);
  // the clicked button is gone; do not drop focus on the body
  inputRef.current?.focus();
}
~~~

When the user clicks a chip × button, that button is about to be removed from the DOM. If you do nothing, focus falls back to <code>document.body</code> and a keyboard user is lost at the top of the page. Sending focus to the text box keeps them in the field. The button click also calls <code>e.stopPropagation()</code>, so the container click handler (which focuses the box) does not run twice.

### 4.5 Markup and accessibility

~~~jsx
<div className="chips-box" onClick={() => inputRef.current?.focus()}>
  <ul className="chips" aria-label={label + " added"}>
    {value.map((tag, i) => (
      <li key={tag} className={"chip" + (armed && i === value.length - 1 ? " armed" : "")} data-testid="chip">
        <span>{tag}</span>
        <button type="button" aria-label={"Remove " + tag} onClick={(e) => { e.stopPropagation(); remove(i); }}>×</button>
      </li>
    ))}
  </ul>
  <input
    id="tag-input"
    ref={inputRef}
    data-testid="tag-input"
    value={draft}
    placeholder={value.length >= max ? "Limit reached" : "Type and press Enter or comma"}
    aria-describedby="tag-help"
~~~

The chips are a real list with a label; each remove button has an accessible name ("Remove react") because "×" alone is read as "times". The chips use the tag text as <code>key</code>, which is safe because tags are unique; using the array index would make React reuse the wrong chip element after a removal. The message paragraph is a <code>role="status"</code> live region, so additions, rejections and removals are announced without moving focus.

📌 **Interview term: Live region** — an element whose text changes are announced by screen readers automatically; <code>role="status"</code> (polite) waits for the user to pause.

## 5. Verified: What the Solution Printed

The solution was bundled with esbuild and mounted in jsdom with <code>createRoot</code> in <code>StrictMode</code>. The driver typed with real <code>input</code> events (the value is set with the native setter, then <code>input</code> fires), pressed keys with <code>keydown</code>, and clicked. <code>chips</code> lists the chips (<code>(armed)</code> marks the highlighted one), <code>box</code> is the text box value and <code>said</code> is the live-region text:

~~~text
[react] RENDERED: New postTopicsreact×1 of 5 tags. Backspace twice on an empty box removes the last one.["react"]
[react] mounted                      chips: react | box: "" | said: ""
[react] vue + Enter                  chips: react vue | box: "" | said: "Added vue"
[react] '  Vue ' + Enter (dupe)      chips: react vue | box: "  Vue " | said: "Vue is already added"
[react] typed 'svelte, solid,   ,qw' chips: react vue svelte solid | box: "qw" | said: "Added svelte, solid"
[react] qwik + Enter                 chips: react vue svelte solid qwik | box: "" | said: "Added qwik"
[react] lone comma                   chips: react vue svelte solid qwik | box: "" | said: ""
[react] 6th tag (limit 5)            chips: react vue svelte solid qwik | box: "angular" | said: "You can add up to 5 tags"
[react] Backspace on empty           chips: react vue svelte solid qwik(armed) | box: "" | said: "Press Backspace again to remove qwik"
[react] Backspace again              chips: react vue svelte solid | box: "" | said: "Removed qwik"
[react] click Remove vue             chips: react svelte solid | box: "" | said: "Removed vue"
[react] focus back on input: true | emitted: ["react","svelte","solid"]
[react] 21+ characters               chips: react svelte solid | box: "a-very-long-tag-name-over-20" | said: "Tags can be at most 20 characters"
[react] click empty area of the field -> input focused: true
~~~

Notice: "  Vue " was trimmed and rejected as a duplicate of "vue" and kept in the box for editing; one input event with two commas added two tags and left "qw" as the draft, while the blank part between commas was skipped; the sixth tag was refused with a reason; Backspace took two presses; removing with the button put focus back on the input; the parent received the new array each time. No <code>console.error</code>. The IME path (<code>isComposing</code>) and real Android keyboards were not exercised in jsdom; the comma path they rely on (an <code>input</code> event containing a comma) is what the driver tested.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Leading, trailing or repeated spaces | Trimmed and collapsed before validation |
| Different case duplicate | Rejected; message names the tag |
| Paste "a, b, , c" | Adds a and b and keeps c as draft; blank parts skipped |
| Over the limit | Rejected with "You can add up to 5 tags"; placeholder says "Limit reached" |
| Too long | Rejected with the length rule; text kept for editing |
| Enter during IME composition | Ignored, so the IME can confirm its candidate |
| Remove with the button | Focus moves to the text box |
| Screen reader | Labelled input with help text via <code>aria-describedby</code>, chips as a labelled list, named remove buttons, a polite status region |

## 7. Common Pitfalls

- **Index keys on chips.** After removing chip 2, chip 3 takes key 2 and React patches the wrong element; any per-chip state (focus, animation) jumps. Use the tag text.
- **Comma only in keydown.** Misses paste and Android keyboards that report "Unidentified". Split in the input handler.
- **No IME guard on Enter.** Japanese and Chinese users get half-typed tags.
- **Focus lost after removal.** The clicked button disappears; move focus to the input.
- **Silent rejections.** If a duplicate just vanishes, users think the widget is broken. Say why, and keep the text.
- **Mutating the parent array.** <code>value.push(tag)</code> changes the prop in place and React may not re-render; always pass a new array.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State split:</strong> <span style="color:#f0e2c8;">"The tag array belongs to the parent as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code>. The component only keeps the draft text, an armed flag for Backspace, and the last message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">"A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts(tags, parts, limits)</code> trims, collapses spaces, rejects case-insensitive duplicates, length and count, and returns the next list plus a message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Input:</strong> <span style="color:#f0e2c8;">"Commas are handled in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> by splitting the value, which also covers paste and Android keyboards; Enter is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onKeyDown</code> with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isComposing</code> guard and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Removal:</strong> <span style="color:#f0e2c8;">"Each chip has a named remove button that returns focus to the input. Backspace on an empty box arms the last chip first, then removes it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"A labelled input with help text, chips in a labelled list keyed by tag text, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> live region that announces every add, rejection and removal."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add autocomplete suggestions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turn the text box into a combobox: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> popup filtered by the draft, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> for the highlighted option, arrows to move and Enter to pick. Debounce the lookup if it hits a server, and exclude tags that are already chosen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let users edit a chip?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Double-click or Enter on a focused chip turns it back into an inline input with its text; on blur or Enter, validate with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts</code> against the list without that chip, and replace it in place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make the chips themselves keyboard navigable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the list a roving-tabindex group: ArrowLeft from an empty input focuses the last chip, arrows move between chips, Delete or Backspace removes the focused chip, and ArrowRight from the last chip returns to the input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts</code> with a table of inputs. Then with Testing Library and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user-event</code>: type "vue{Enter}", paste "a, b,", press Backspace twice, click "Remove vue", and assert the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> calls and the status text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would this submit with a normal form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render one hidden input per tag with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name="tags"</code>, or a single hidden input with the JSON or comma-joined list, so the form data includes them without extra code.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Chip** | A small removable pill that stands for one value |
| **Controlled component** | The parent owns the value and receives changes through a callback |
| **Pure function** | Same input gives same output, no side effects |
| **IME composition** | Several keystrokes building one character; Enter belongs to the IME meanwhile |
| **Live region** | Text that screen readers announce when it changes |
| **Stable key** | A React <code>key</code> that stays with the same item across renders |

---
**Conclusion:** A tag input is a list editor disguised as a text box. Keep the list in the parent, the half-typed text and the armed flag in the component, and every rule in a pure <code>addParts</code> function. Handle commas in the input event so paste and mobile keyboards work, guard Enter during IME composition, return focus after removal, and announce every outcome. The React 19.3.1 run above showed trimming, case-insensitive duplicates, multi-tag paste, limits, two-step Backspace and focus return all behaving as described.`,
        files: {
          "/App.js": `import { useState } from "react";
import TagInput from "./src/TagInput";

export default function App() {
  const [tags, setTags] = useState(["react"]); // the parent owns the list

  return (
    <main className="page">
      <section className="card">
        <h1>New post</h1>
        <TagInput value={tags} onChange={setTags} max={5} label="Topics" />
        <pre className="out" data-testid="tags-json">
          {JSON.stringify(tags)}
        </pre>
      </section>
    </main>
  );
}
`,
          "/src/TagInput.js": `import { useRef, useState } from "react";
import { addParts } from "./tags";

export default function TagInput({
  value,
  onChange,
  max = 5,
  maxLength = 20,
  label = "Tags",
}) {
  const [draft, setDraft] = useState(""); // what is typed but not yet a tag
  // first Backspace on an empty box arms the last chip
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState(""); // read out by the live region
  const inputRef = useRef(null);

  function add(parts) {
    const { next, message, ok } = addParts(value, parts, { max, maxLength });
    if (next.length !== value.length) onChange(next);
    setMessage(message);
    return ok;
  }

  function remove(index) {
    setMessage("Removed " + value[index]);
    onChange(value.filter((_, i) => i !== index));
    setArmed(false);
    // the clicked button is gone; do not drop focus on the body
    inputRef.current?.focus();
  }

  function handleChange(e) {
    setArmed(false);
    const raw = e.target.value;
    // Commas are handled here, not in keydown: this also covers paste and
    // Android keyboards, whose keydown reports key "Unidentified".
    if (!raw.includes(",")) return setDraft(raw);
    const parts = raw.split(",");
    const rest = parts.pop();
    add(parts);
    setDraft(rest.trimStart());
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      // Enter is confirming an IME candidate
      if (e.nativeEvent.isComposing) return;
      e.preventDefault(); // do not submit a surrounding form
      if (draft.trim() && add([draft])) setDraft("");
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      if (armed) remove(value.length - 1);
      else {
        setArmed(true);
        setMessage(
          "Press Backspace again to remove " + value[value.length - 1],
        );
      }
    } else if (e.key === "Escape") {
      setArmed(false);
    }
  }

  return (
    <div className="tag-field">
      <label className="label" htmlFor="tag-input">
        {label}
      </label>
      <div className="chips-box" onClick={() => inputRef.current?.focus()}>
        <ul className="chips" aria-label={label + " added"}>
          {value.map((tag, i) => (
            <li
              key={tag}
              className={
                "chip" + (armed && i === value.length - 1 ? " armed" : "")
              }
              data-testid="chip"
            >
              <span>{tag}</span>
              <button
                type="button"
                aria-label={"Remove " + tag}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <input
          id="tag-input"
          ref={inputRef}
          data-testid="tag-input"
          value={draft}
          placeholder={
            value.length >= max
              ? "Limit reached"
              : "Type and press Enter or comma"
          }
          aria-describedby="tag-help"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      <p id="tag-help" className="help">
        {value.length} of {max} tags. Backspace twice on an empty box removes
        the last one.
      </p>
      <p
        className="message"
        role="status"
        aria-live="polite"
        data-testid="tag-message"
      >
        {message}
      </p>
    </div>
  );
}
`,
          "/src/tags.js": `// Pure helper: try to add each part; returns the new list and what to announce.
export function addParts(tags, parts, { max, maxLength }) {
  const next = [...tags];
  const added = [];
  let problem = "";
  for (const part of parts) {
    const tag = part.trim().replace(/ +/g, " ");
    if (!tag) continue;
    if (tag.length > maxLength)
      problem = "Tags can be at most " + maxLength + " characters";
    else if (next.some((t) => t.toLowerCase() === tag.toLowerCase()))
      problem = tag + " is already added";
    else if (next.length >= max) problem = "You can add up to " + max + " tags";
    else {
      next.push(tag);
      added.push(tag);
    }
  }
  const message = [added.length ? "Added " + added.join(", ") : "", problem]
    .filter(Boolean)
    .join(". ");
  return { next, message, ok: problem === "" };
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(460px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 14px;
}
.label {
  display: block;
  font-size: 0.9rem;
  color: #c5cbd6;
  margin-bottom: 6px;
}
.chips-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #3a4150;
  border-radius: 10px;
  background: #0f1115;
  cursor: text;
}
.chips-box:focus-within {
  border-color: #7aa2ff;
}
.chips {
  display: contents;
  list-style: none;
  margin: 0;
  padding: 0;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: #2d4373;
  color: #e6ecff;
  font-size: 0.9rem;
}
.chip.armed {
  background: #8c2f39;
}
.chip button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}
.chip button:hover,
.chip button:focus-visible {
  background: rgba(255, 255, 255, 0.15);
  outline: none;
}
.chips-box input {
  flex: 1 1 120px;
  min-width: 120px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 0.95rem;
  padding: 4px;
}
.help {
  font-size: 0.8rem;
  color: #9aa3b2;
  margin: 6px 0 0;
}
.message {
  min-height: 1.2em;
  font-size: 0.85rem;
  color: #ffd180;
  margin: 4px 0 0;
}
.out {
  background: #0f1115;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.85rem;
  overflow-x: auto;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know <code>ref()</code>, templates and <code>v-for</code>; the rest is explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution, and every output below was printed by mounting it on Vue 3.5.44.

## 1. The Story

Labelling pantry jars from a roll of stickers: write "flour", stick it on; you do not want two "Flour" stickers; the roll has five left; and peeling one off by accident deserves an "are you sure?". A **tag input** is that roll on a web page: type, press Enter or a comma, and the text becomes a removable **chip**.

📌 **Interview term: Chip** — a small removable element standing for one value. A chip input edits a list of them.

## 2. Requirements and the Vue State Model

Enter or comma adds; paste "a, b, c" adds several; trim and collapse spaces; reject case-insensitive duplicates, tags over 20 characters and a sixth tag, with a reason; remove with a named button (focus returns to the box) or with two Backspaces on an empty box; clicking the field focuses the box; announcements go to a live region; the parent owns the list.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| The tag list | <code>defineModel({ type: Array })</code> | Parent writes <code>v-model="tags"</code> |
| Draft text, armed flag, message | <code>ref</code> | Local to the widget |
| The text box element | <code>useTemplateRef("input")</code> | Focus after removal and on container click |
| Validation | <code>addParts()</code> in <code>/src/tags.js</code> | A pure function, shared with the React and Angular versions |

📌 **Interview term: useTemplateRef** — a Vue 3.5 function that returns a ref to the element whose <code>ref</code> attribute matches the given name. It replaces declaring a same-named <code>ref(null)</code>. See [useTemplateRef](/interview-question/what-is-usetemplateref-vue-3-5-and-how-does-it-improve-on-ref).

## 3. Build It Step by Step

### 3.1 The rules

~~~js
export function addParts(tags, parts, { max, maxLength }) {
  const next = [...tags];
  const added = [];
  let problem = "";
  for (const part of parts) {
    const tag = part.trim().replace(/ +/g, " ");
    if (!tag) continue;
    if (tag.length > maxLength)
      problem = "Tags can be at most " + maxLength + " characters";
    else if (next.some((t) => t.toLowerCase() === tag.toLowerCase()))
      problem = tag + " is already added";
    else if (next.length >= max)
      problem = "You can add up to " + max + " tags";
    else {
      next.push(tag);
      added.push(tag);
    }
  }
  const message = [
    added.length ? "Added " + added.join(", ") : "",
    problem,
  ]
    .filter(Boolean)
    .join(". ");
  return { next, message, ok: problem === "" };
}
~~~

Pure: it returns the next list, a message and whether all parts were accepted. The component decides what to do with them.

### 3.2 Model, local state and adding

~~~vue
const tags = defineModel({ type: Array, required: true }); const draft =
ref(""); // what is typed but not yet a tag const armed = ref(false); //
first Backspace on an empty box arms the last chip const message =
ref(""); // read out by the live region const inputEl =
useTemplateRef("input"); // Vue 3.5+ function add(parts) { const { next,
message: said, ok } = addParts(tags.value, parts, { max: props.max,
maxLength: props.maxLength }); if (next.length !== tags.value.length)
tags.value = next; message.value = said; return ok; }
~~~

Always assign a **new** array to the model (<code>tags.value = next</code>). Pushing into <code>tags.value</code> mutates the parent array in place. A modified copy that did exactly that, with the parent counting <code>@update:model-value</code> events, printed:

~~~text
[vue] after adding vue | ["react","vue"] | update events: 0
~~~

The parent list changed (the array is reactive), but no update event fired, so a parent that saves on change, or validates in a listener, would never hear about it.

### 3.3 Commas in @input, and the DOM write-back

~~~vue
function onInput(e) { armed.value = false; const el = e.target; if
(!el.value.includes(",")) { draft.value = el.value; return; } // Commas
are handled here, not in keydown: this also covers paste and // Android
keyboards, whose keydown reports key "Unidentified". const parts =
el.value.split(","); const rest = parts.pop(); add(parts); draft.value =
rest.trimStart(); el.value = draft.value; // a lone "," leaves draft
unchanged, so Vue would not repaint the box }
~~~

Splitting in the input handler (not in keydown) also covers paste, and Android virtual keyboards whose keydown reports <code>key</code> "Unidentified" with <code>keyCode</code> 229 ([Chromium code review](https://codereview.chromium.org/1811553002)).

The last line writes the box back. A lone comma leaves <code>draft</code> at <code>""</code>, and if nothing else in the component changes, Vue does not re-render and the comma stays in the box. A driver typing two lone commas, first on a copy without that line, then on the shipped code:

~~~text
[vue] first lone comma  | box: ","
[vue] second lone comma | box: ","
[vue] first lone comma  | box: ""
[vue] second lone comma | box: ""
~~~

In the main run below the lone comma happened to clear anyway, because the message also changed and that re-render repaired the box; the write-back makes it independent of that luck.

📌 **Interview term: One-way <code>:value</code> binding** — Vue sets the DOM value from state when it renders and never reads it back; <code>v-model</code> adds the other direction. See [v-model on inputs](/interview-question/how-does-v-model-work-on-form-inputs).

### 3.4 Keys and removal

~~~vue
function onKeydown(e) { if (e.key === "Enter") { if (e.isComposing)
return; // Enter is confirming an IME candidate e.preventDefault(); if
(draft.value.trim() && add([draft.value])) draft.value = ""; } else if
(e.key === "Backspace" && draft.value === "" && tags.value.length > 0) {
if (armed.value) remove(tags.value.length - 1); else { armed.value =
true; message.value = "Press Backspace again to remove " +
tags.value[tags.value.length - 1]; } } else if (e.key === "Escape") {
armed.value = false; } }
~~~

<code>e.isComposing</code> guards Enter while an IME (input method editor, used for Chinese or Japanese) is composing. Removal focuses the box because the clicked × button disappears; in the template the button uses <code>@click.stop</code> so the container click (which also focuses the box) does not fire too. Chips are rendered with <code>v-for="(tag, i) in tags" :key="tag"</code>: tags are unique, so the text is a stable key; see [keyed list diffing](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists).

## 4. Verified

Compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom. The driver typed with <code>input</code> events, pressed keys and clicked. <code>chips</code> are the chips (<code>(armed)</code> marks the highlighted one), <code>box</code> is the text box and <code>said</code> the live region:

~~~text
[vue] RENDERED: New postTopicsreact×1 of 5 tags. Backspace twice on an empty box removes the last one.["react"]
[vue] mounted                      chips: react | box: "" | said: ""
[vue] vue + Enter                  chips: react vue | box: "" | said: "Added vue"
[vue] '  Vue ' + Enter (dupe)      chips: react vue | box: "  Vue " | said: "Vue is already added"
[vue] typed 'svelte, solid,   ,qw' chips: react vue svelte solid | box: "qw" | said: "Added svelte, solid"
[vue] qwik + Enter                 chips: react vue svelte solid qwik | box: "" | said: "Added qwik"
[vue] lone comma                   chips: react vue svelte solid qwik | box: "" | said: ""
[vue] 6th tag (limit 5)            chips: react vue svelte solid qwik | box: "angular" | said: "You can add up to 5 tags"
[vue] Backspace on empty           chips: react vue svelte solid qwik(armed) | box: "" | said: "Press Backspace again to remove qwik"
[vue] Backspace again              chips: react vue svelte solid | box: "" | said: "Removed qwik"
[vue] click Remove vue             chips: react svelte solid | box: "" | said: "Removed vue"
[vue] focus back on input: true | emitted: ["react","svelte","solid"]
[vue] 21+ characters               chips: react svelte solid | box: "a-very-long-tag-name-over-20" | said: "Tags can be at most 20 characters"
[vue] click empty area of the field -> input focused: true
~~~

Trimming, the case-insensitive duplicate (kept in the box for editing), two tags from one input event, the limit, the length rule, two-step Backspace, focus return after the × button and the container click all behaved as specified, and the parent JSON followed every change. No warnings. IME composition and real Android keyboards were not exercised.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| "  Vue " when "vue" exists | Rejected, text kept, reason announced |
| Paste with blank parts | Blank parts skipped, trailing text stays as draft |
| Sixth tag / 21+ characters | Rejected with a reason |
| Enter during IME composition | Ignored |
| × button | Named "Remove vue"; focus returns to the input |
| Screen reader | Labelled input with help text, labelled chip list, polite <code>role="status"</code> |

## 6. Common Pitfalls

- **<code>tags.value.push()</code>.** Mutates the parent array and emits nothing; assign a new array.
- **Comma only in <code>@keydown</code>.** Misses paste and Android keyboards.
- **Relying on <code>:value</code> to clear rejected text.** No re-render, no repaint; write it back.
- **Index keys.** Removing a chip shifts keys and patches the wrong elements.
- **Forgetting <code>.stop</code> on the × button.** The container click handler runs as well.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"The list is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> array so the parent uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>; draft, armed and message are local refs, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTemplateRef</code> gives me the input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">"A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts</code> trims, dedupes case-insensitively, checks length and count, and returns the next list and a message. I always assign a new array to the model."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Input:</strong> <span style="color:#f0e2c8;">"Commas are split in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@input</code>, which covers paste and mobile keyboards; I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.value</code> back because Vue will not repaint if the draft did not change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keys:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@keydown</code> handles Enter with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isComposing</code> guard, two-step Backspace on an empty box, and Escape to disarm."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"Named remove buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@click.stop</code> that return focus to the input, chips keyed by text, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> region for every outcome."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add suggestions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make it a combobox: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> filtered by a computed over the draft, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> for the highlighted option, and Enter picks it through the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why defineModel and not a prop plus emit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same contract, less code: the macro declares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modelValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update:modelValue</code> and returns a ref; assigning it emits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you let the parent customise the chip?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A scoped slot: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;slot name="chip" :tag="tag" :remove="() =&gt; remove(i)"&gt;</code>. The component keeps the keyboard logic and ARIA, the parent draws the chip.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts</code> with a table, then Vue Test Utils: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue("vue")</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("keydown", { key: "Enter" })</code>, and assert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitted("update:modelValue")</code> and the status text.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Chip** | A removable pill standing for one value |
| **defineModel** | Macro that makes a writable ref out of a prop plus update event |
| **useTemplateRef** | Vue 3.5 helper that returns the element with a given <code>ref</code> name |
| **IME composition** | Several keystrokes making one character; Enter belongs to the IME |
| **Live region** | Text announced by screen readers when it changes |

---
**Conclusion:** In Vue, the tag input is a <code>defineModel</code> array owned by the parent, a few local refs, and a pure <code>addParts</code> that holds every rule. Commas are handled in <code>@input</code>, Enter respects IME composition, removal returns focus, and the one Vue-specific catch, that <code>:value</code> does not repaint when nothing changed, was shown with a two-comma experiment and fixed with a write-back. The Vue 3.5.44 run printed the same results as the React and Angular versions.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import TagInput from "./components/TagInput.vue";

const tags = ref(["react"]); // the parent owns the list
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>New post</h1>
      <TagInput v-model="tags" :max="5" label="Topics" />
      <pre class="out" data-testid="tags-json">{{ JSON.stringify(tags) }}</pre>
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(460px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 14px;
}
.out {
  background: #0f1115;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.85rem;
  overflow-x: auto;
}
</style>
`,
          "/src/components/TagInput.vue": `<script setup>
import { ref, useTemplateRef } from "vue";
import { addParts } from "../tags.js";

const props = defineProps({
  max: { type: Number, default: 5 },
  maxLength: { type: Number, default: 20 },
  label: { type: String, default: "Tags" },
});
// v-model on the parent binds to this array. Always assign a NEW array to it.
const tags = defineModel({ type: Array, required: true });

const draft = ref(""); // what is typed but not yet a tag
const armed = ref(false); // first Backspace on an empty box arms the last chip
const message = ref(""); // read out by the live region
const inputEl = useTemplateRef("input"); // Vue 3.5+

function add(parts) {
  const {
    next,
    message: said,
    ok,
  } = addParts(tags.value, parts, {
    max: props.max,
    maxLength: props.maxLength,
  });
  if (next.length !== tags.value.length) tags.value = next;
  message.value = said;
  return ok;
}

function remove(index) {
  message.value = "Removed " + tags.value[index];
  tags.value = tags.value.filter((_, i) => i !== index);
  armed.value = false;
  // the clicked button is gone; do not drop focus on the body
  inputEl.value?.focus();
}

function onInput(e) {
  armed.value = false;
  const el = e.target;
  if (!el.value.includes(",")) {
    draft.value = el.value;
    return;
  }
  // Commas are handled here, not in keydown: this also covers paste and
  // Android keyboards, whose keydown reports key "Unidentified".
  const parts = el.value.split(",");
  const rest = parts.pop();
  add(parts);
  draft.value = rest.trimStart();
  // a lone "," leaves draft unchanged, so Vue would not repaint the box
  el.value = draft.value;
}

function onKeydown(e) {
  if (e.key === "Enter") {
    if (e.isComposing) return; // Enter is confirming an IME candidate
    e.preventDefault();
    if (draft.value.trim() && add([draft.value])) draft.value = "";
  } else if (
    e.key === "Backspace" &&
    draft.value === "" &&
    tags.value.length > 0
  ) {
    if (armed.value) remove(tags.value.length - 1);
    else {
      armed.value = true;
      message.value =
        "Press Backspace again to remove " + tags.value[tags.value.length - 1];
    }
  } else if (e.key === "Escape") {
    armed.value = false;
  }
}
</script>

<template>
  <div class="tag-field">
    <label class="label" for="tag-input">{{ label }}</label>
    <div class="chips-box" @click="inputEl?.focus()">
      <ul class="chips" :aria-label="label + ' added'">
        <li
          v-for="(tag, i) in tags"
          :key="tag"
          :class="['chip', { armed: armed && i === tags.length - 1 }]"
          data-testid="chip"
        >
          <span>{{ tag }}</span>
          <button
            type="button"
            :aria-label="'Remove ' + tag"
            @click.stop="remove(i)"
          >×</button>
        </li>
      </ul>
      <input
        id="tag-input"
        ref="input"
        data-testid="tag-input"
        :value="draft"
        :placeholder="tags.length >= max ? 'Limit reached' : 'Type and press Enter or comma'"
        aria-describedby="tag-help"
        @input="onInput"
        @keydown="onKeydown"
      />
    </div>
    <p
      id="tag-help"
      class="help"
    >{{ tags.length }} of {{ max }} tags. Backspace twice on an empty box removes the last one.</p>
    <p
      class="message"
      role="status"
      aria-live="polite"
      data-testid="tag-message"
    >{{ message }}</p>
  </div>
</template>

<style scoped>
.label {
  display: block;
  font-size: 0.9rem;
  color: #c5cbd6;
  margin-bottom: 6px;
}
.chips-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #3a4150;
  border-radius: 10px;
  background: #0f1115;
  cursor: text;
}
.chips-box:focus-within {
  border-color: #7aa2ff;
}
.chips {
  display: contents;
  list-style: none;
  margin: 0;
  padding: 0;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: #2d4373;
  color: #e6ecff;
  font-size: 0.9rem;
}
.chip.armed {
  background: #8c2f39;
}
.chip button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}
.chip button:hover,
.chip button:focus-visible {
  background: rgba(255, 255, 255, 0.15);
  outline: none;
}
.chips-box input {
  flex: 1 1 120px;
  min-width: 120px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 0.95rem;
  padding: 4px;
}
.help {
  font-size: 0.8rem;
  color: #9aa3b2;
  margin: 6px 0 0;
}
.message {
  min-height: 1.2em;
  font-size: 0.85rem;
  color: #ffd180;
  margin: 4px 0 0;
}
</style>
`,
          "/src/tags.js": `// Pure helper: try to add each part; returns the new list and what to announce.
export function addParts(tags, parts, { max, maxLength }) {
  const next = [...tags];
  const added = [];
  let problem = "";
  for (const part of parts) {
    const tag = part.trim().replace(/ +/g, " ");
    if (!tag) continue;
    if (tag.length > maxLength)
      problem = "Tags can be at most " + maxLength + " characters";
    else if (next.some((t) => t.toLowerCase() === tag.toLowerCase()))
      problem = tag + " is already added";
    else if (next.length >= max) problem = "You can add up to " + max + " tags";
    else {
      next.push(tag);
      added.push(tag);
    }
  }
  const message = [added.length ? "Added " + added.join(", ") : "", problem]
    .filter(Boolean)
    .join(". ");
  return { next, message, ok: problem === "" };
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know components and templates; signals and the rest are explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution; the outputs were printed by booting it on Angular 22.2.3, compiled ahead of time with strict templates and at runtime like the playground.

## 1. The Story

A roll of jar labels: write "flour", stick it on; no second "Flour"; only five left on the roll; and peeling one off by accident deserves a second chance. A **tag input** is that roll on a page: type, press Enter or a comma, and the text becomes a removable **chip**.

📌 **Interview term: Chip** — a small removable element standing for one value.

## 2. Requirements and the Angular State Model

Enter or comma adds; paste "a, b, c" adds several; trim and collapse spaces; reject case-insensitive duplicates, tags over 20 characters and a sixth tag, saying why; remove with a named × button (focus returns to the box) or two Backspaces on an empty box; clicking the field focuses the box; a live region announces outcomes; the parent owns the list through <code>[(tags)]</code>.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| The list | <code>@Input() set tags()</code> into a <code>signal</code>, <code>@Output() tagsChange</code> | Two-way binding <code>[(tags)]</code> with a signal on the parent |
| Draft, armed, message | <code>signal</code> | Local; signal writes re-render a zoneless app |
| Text box | <code>#input</code> plus <code>@ViewChild("input", { static: true })</code> | Focus after removal |
| Rules | <code>addParts()</code> in <code>tags.ts</code> | Pure, shared with React and Vue |

The playground runtime JIT does not register signal <code>input()</code>/<code>model()</code>, so the decorator forms are used; in a normal build <code>tags = model&lt;string[]&gt;([])</code> would replace the setter and output. See [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

## 3. Build It Step by Step

### 3.1 The rules

~~~ts
export function addParts(
  tags: string[],
  parts: string[],
  { max, maxLength }: { max: number; maxLength: number },
) {
  const next = [...tags];
  const added: string[] = [];
  let problem = "";
  for (const part of parts) {
    const tag = part.trim().replace(/ +/g, " ");
    if (!tag) continue;
    if (tag.length > maxLength)
      problem = "Tags can be at most " + maxLength + " characters";
    else if (next.some((t) => t.toLowerCase() === tag.toLowerCase()))
      problem = tag + " is already added";
    else if (next.length >= max)
      problem = "You can add up to " + max + " tags";
    else {
      next.push(tag);
      added.push(tag);
    }
  }
  const message = [
    added.length ? "Added " + added.join(", ") : "",
    problem,
  ]
    .filter(Boolean)
    .join(". ");
  return { next, message, ok: problem === "" };
}
~~~

### 3.2 Inputs, outputs and state

~~~ts
@Input() set tags(v: string[]) {
  this.list.set(v);
}
@Output() tagsChange = new EventEmitter<string[]>();
@Input() max = 5;
@Input() maxLength = 20;
@Input() label = "Tags";
@ViewChild("input", { static: true })
input!: ElementRef<HTMLInputElement>;

readonly list = signal<string[]>([]);
readonly draft = signal(""); // what is typed but not yet a tag
// first Backspace on an empty box arms the last chip
readonly armed = signal(false);
readonly message = signal(""); // read out by the live region

private setList(next: string[]): void {
  this.list.set(next);
  this.tagsChange.emit(next);
}

private add(parts: string[]): boolean {
  const { next, message, ok } = addParts(this.list(), parts, {
    max: this.max,
    maxLength: this.maxLength,
  });
  if (next.length !== this.list().length) this.setList(next);
  this.message.set(message);
  return ok;
}
~~~

<code>setList</code> updates the local signal and emits a new array. Updating locally first means the component stays correct even if a parent binds only <code>[tags]</code>; with <code>[(tags)]</code> the parent writes the same array back through the setter.

📌 **Interview term: Banana-in-a-box** — <code>[(tags)]</code> expands to <code>[tags]="x" (tagsChange)="x = $event"</code>; the output must be named <code>tagsChange</code>. See [two-way binding under the hood](/interview-question/how-does-two-way-binding-work-under-the-hood).

### 3.3 The template, and a shadowing trap

~~~ts
<div class="chips-box" (click)="input.focus()">
  <ul class="chips" [attr.aria-label]="label + ' added'">
    @for (tag of list(); track tag; let i = $index, last = $last) {
      <li class="chip" [class.armed]="armed() && last" data-testid="chip">
        <span>{{ tag }}</span>
        <button type="button" [attr.aria-label]="'Remove ' + tag" (click)="$event.stopPropagation(); remove(i)">×</button>
      </li>
    }
  </ul>
  <input
    #input
    id="tag-input"
    data-testid="tag-input"
    [value]="draft()"
    [placeholder]="list().length >= max ? 'Limit reached' : 'Type and press Enter or comma'"
    aria-describedby="tag-help"
    (input)="onInput($event)"
    (keydown)="onKeydown($event)"
~~~

<code>@for (tag of list(); track tag; ...)</code> tracks chips by their text, which is unique, so removing one chip does not re-create the others. <code>(click)="input.focus()"</code> uses the template reference <code>#input</code>, which is the <code>HTMLInputElement</code> itself.

The first draft wrote <code>input.nativeElement.focus()</code>, thinking of the component <code>@ViewChild</code> field also called <code>input</code>. In a template, a reference variable shadows a component member with the same name. The runtime JIT build gave no warning (it would only throw when the container was clicked), but the AOT build with <code>strictTemplates</code> refused it:

~~~text
NGC FAILED:
src/tag-input.component.ts:9:45 - error TS2339: Property 'nativeElement' does not exist on type 'HTMLInputElement'.
~~~

📌 **Interview term: Template reference variable** — <code>#name</code> gives the template a handle to an element; inside the template that name wins over a class property with the same name. See [template reference variables](/interview-question/what-are-template-reference-variables).

### 3.4 Commas, and writing the box back

~~~ts
onInput(e: Event): void {
  this.armed.set(false);
  const el = e.target as HTMLInputElement;
  if (!el.value.includes(",")) {
    this.draft.set(el.value);
    return;
  }
  // Commas are handled here, not in keydown: this also covers paste and
  // Android keyboards, whose keydown reports key "Unidentified".
  const parts = el.value.split(",");
  const rest = parts.pop() ?? "";
  this.add(parts);
  this.draft.set(rest.trimStart());
  // [value] only re-applies when the bound value changes
  el.value = this.draft();
}
~~~

Splitting in <code>(input)</code> covers paste and Android virtual keyboards that report keydown <code>key</code> as "Unidentified" with <code>keyCode</code> 229 ([Chromium code review](https://codereview.chromium.org/1811553002)). <code>[value]="draft()"</code> is only re-applied when <code>draft()</code> changes, so a lone comma (draft stays <code>""</code>) would stay on screen. Two lone commas, without the last line and then with it:

~~~text
[angular:playground] first lone comma  | box: ","
[angular:playground] second lone comma | box: ","
[angular:playground] first lone comma  | box: ""
[angular:playground] second lone comma | box: ""
~~~

### 3.5 Keys and removal

~~~ts
onKeydown(e: KeyboardEvent): void {
  const list = this.list();
  if (e.key === "Enter") {
    if (e.isComposing) return; // Enter is confirming an IME candidate
    e.preventDefault();
    if (this.draft().trim() && this.add([this.draft()])) {
      this.draft.set("");
      this.input.nativeElement.value = "";
    }
  } else if (
    e.key === "Backspace" &&
    this.draft() === "" &&
    list.length > 0
  ) {
    if (this.armed()) this.remove(list.length - 1);
    else {
      this.armed.set(true);
      this.message.set(
        "Press Backspace again to remove " + list[list.length - 1],
      );
    }
  } else if (e.key === "Escape") {
    this.armed.set(false);
  }
}
~~~

<code>e.isComposing</code> skips Enter while an IME (input method editor) is composing characters. <code>remove()</code> focuses the box because the clicked × button is about to disappear, and the button calls <code>$event.stopPropagation()</code> so the container click does not run as well.

## 4. Verified

Compiled with <code>ngc</code> and <code>strictTemplates</code> (<code>angular:app</code>) and booted with runtime JIT (<code>angular:playground</code>), each with <code>bootstrapApplication(AppComponent)</code> in jsdom. <code>chips</code> are the chips, <code>box</code> the text box, <code>said</code> the live region. AOT output; the JIT run printed the same lines:

~~~text
[angular:app] RENDERED: New postTopicsreact×1 of 5 tags. Backspace twice on an empty box removes the last one.["react"]
[angular:app] mounted                      chips: react | box: "" | said: ""
[angular:app] vue + Enter                  chips: react vue | box: "" | said: "Added vue"
[angular:app] '  Vue ' + Enter (dupe)      chips: react vue | box: "  Vue " | said: "Vue is already added"
[angular:app] typed 'svelte, solid,   ,qw' chips: react vue svelte solid | box: "qw" | said: "Added svelte, solid"
[angular:app] qwik + Enter                 chips: react vue svelte solid qwik | box: "" | said: "Added qwik"
[angular:app] lone comma                   chips: react vue svelte solid qwik | box: "" | said: ""
[angular:app] 6th tag (limit 5)            chips: react vue svelte solid qwik | box: "angular" | said: "You can add up to 5 tags"
[angular:app] Backspace on empty           chips: react vue svelte solid qwik(armed) | box: "" | said: "Press Backspace again to remove qwik"
[angular:app] Backspace again              chips: react vue svelte solid | box: "" | said: "Removed qwik"
[angular:app] click Remove vue             chips: react svelte solid | box: "" | said: "Removed vue"
[angular:app] focus back on input: true | emitted: ["react","svelte","solid"]
[angular:app] 21+ characters               chips: react svelte solid | box: "a-very-long-tag-name-over-20" | said: "Tags can be at most 20 characters"
[angular:app] click empty area of the field -> input focused: true
~~~

Same behaviour as the React and Vue versions: trimming, the case-insensitive duplicate kept for editing, two tags from one input event, the limit and length rules, two-step Backspace, focus return and the container click. No <code>console.error</code>. IME composition and real mobile keyboards were not exercised.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Duplicate in different case | Rejected, text kept, reason announced |
| Paste with blank parts | Skipped; trailing text stays as draft |
| Lone comma | Box written back to the draft |
| Enter during IME composition | Ignored |
| × button | <code>[attr.aria-label]</code> "Remove vue"; focus back to the input |
| Screen reader | Labelled input with <code>aria-describedby</code> help, labelled list, <code>role="status"</code> region |

## 6. Common Pitfalls

- **Naming a template ref like a class field.** The template ref wins; strict templates catch it, JIT does not.
- **Trusting <code>[value]</code> to clear rejected text.** It only re-applies when the bound value changes.
- **An output not called <code>tagsChange</code>.** <code>[(tags)]</code> silently stops updating the parent.
- **Mutating the array.** Emit a new array so <code>@for</code> tracking and the parent signal both see a change.
- **Plain fields for draft or message.** In a zoneless app they do not re-render; use signals.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"The list comes in through an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> setter into a signal and goes out through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tagsChange</code>, so the parent uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(tags)]</code>. Draft, armed and message are signals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules:</strong> <span style="color:#f0e2c8;">"A pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts</code> trims, dedupes case-insensitively, enforces length and count, and returns the next list and a message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Input:</strong> <span style="color:#f0e2c8;">"Commas are split in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(input)</code>, which covers paste and mobile keyboards, and I write the box back because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]</code> will not repaint an unchanged draft."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Keys:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(keydown)</code> handles Enter with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isComposing</code> guard, a two-step Backspace, and Escape to disarm."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"Named remove buttons that return focus, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> tracked by tag text, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> live region for every outcome."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you plug it into a reactive form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets the list signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores a callback that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setList</code> calls, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> disables the input, and provide it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code>. Validators like max count then live on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormControl</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add suggestions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A combobox: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listbox</code> popup from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> over the draft and the available tags, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-activedescendant</code> for the active option, arrows to move and Enter to pick through the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> method.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why @ViewChild with static true?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The input is always rendered (not inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code>), so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static: true</code> resolves it before the first change detection, and it is available in any handler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addParts</code>. Then TestBed: set the input value, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>, dispatch a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> with key Enter, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, and assert the chips and that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tagsChange</code> emitted the new array.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Chip** | A removable pill for one value |
| **Banana-in-a-box** | <code>[(x)]</code> two-way binding: input <code>x</code> plus output <code>xChange</code> |
| **Template reference variable** | <code>#name</code> handle to an element in a template |
| **IME composition** | Several keystrokes making one character |
| **Live region** | Text announced by screen readers when it changes |

---
**Conclusion:** The Angular tag input keeps the list in a signal fed by an <code>@Input</code> setter, reports with <code>tagsChange</code> for <code>[(tags)]</code>, and puts every rule in a pure <code>addParts</code>. Two Angular-specific lessons came from actually running it: a template reference silently shadows a class field until strict templates complain, and <code>[value]</code> does not clear a rejected comma unless you write the box back. Both AOT and JIT runs on Angular 22.2.3 matched the React and Vue output line for line.`,
        files: {
          "/src/app/app.component.ts": `import { DOCUMENT } from "@angular/common";
import { Component, signal, inject } from "@angular/core";
import { TagInputComponent } from "./tag-input.component";

@Component({
  selector: "app-root",
  imports: [TagInputComponent],
  template: \`
    <main class="page">
      <section class="card">
        <h1>New post</h1>
        <app-tag-input [(tags)]="tags" [max]="5" label="Topics" />
        <pre class="out" data-testid="tags-json">{{ json() }}</pre>
      </section>
    </main>
  \`,
  styles: [
    \`
      :host {
        display: block;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .card {
        width: min(460px, 100%);
        background: #181b22;
        border: 1px solid #2a2f3a;
        border-radius: 14px;
        padding: 20px;
        box-sizing: border-box;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 14px;
      }
      .out {
        background: #0f1115;
        padding: 8px;
        border-radius: 8px;
        font-size: 0.85rem;
        overflow-x: auto;
      }
    \`,
  ],
})
export class AppComponent {
  constructor() {
    // The playground page has a default white
    // body margin; make the whole page dark.
    inject(DOCUMENT).body.style.cssText = "margin: 0; background: #0f1115;";
  }

  readonly tags = signal(["react"]); // the parent owns the list
  json = () => JSON.stringify(this.tags());
}
`,
          "/src/app/tag-input.component.ts": `import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from "@angular/core";
import { addParts } from "./tags";

@Component({
  selector: "app-tag-input",
  template: \`
    <div class="tag-field">
      <label class="label" for="tag-input">{{ label }}</label>
      <div class="chips-box" (click)="input.focus()">
        <ul class="chips" [attr.aria-label]="label + ' added'">
          @for (tag of list(); track tag; let i = $index, last = $last) {
            <li class="chip" [class.armed]="armed() && last" data-testid="chip">
              <span>{{ tag }}</span>
              <button
                type="button"
                [attr.aria-label]="'Remove ' + tag"
                (click)="$event.stopPropagation(); remove(i)"
              >×</button>
            </li>
          }
        </ul>
        <input
          #input
          id="tag-input"
          data-testid="tag-input"
          [value]="draft()"
          [placeholder]="list().length >= max ? 'Limit reached' : 'Type and press Enter or comma'"
          aria-describedby="tag-help"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
        />
      </div>
      <p
        id="tag-help"
        class="help"
      >{{ list().length }} of {{ max }} tags. Backspace twice on an empty box removes the last one.</p>
      <p
        class="message"
        role="status"
        aria-live="polite"
        data-testid="tag-message"
      >{{ message() }}</p>
    </div>
  \`,
  styles: [
    \`
    .label { display: block; font-size: 0.9rem; color: #c5cbd6; margin-bottom: 6px; }
    .chips-box { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px; border: 1px solid #3a4150;
      border-radius: 10px; background: #0f1115; cursor: text; }
    .chips-box:focus-within { border-color: #7aa2ff; }
    .chips { display: contents; list-style: none; margin: 0; padding: 0; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 10px; border-radius: 999px;
      background: #2d4373; color: #e6ecff; font-size: 0.9rem; }
    .chip.armed { background: #8c2f39; }
    .chip button { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 1rem; line-height: 1;
      width: 22px; height: 22px; border-radius: 50%; }
    .chip button:hover, .chip button:focus-visible { background: rgba(255, 255, 255, 0.15); outline: none; }
    .chips-box input { flex: 1 1 120px; min-width: 120px; border: 0; outline: 0; background: transparent; color: #fff; font-size: 0.95rem; padding: 4px; }
    .help { font-size: 0.8rem; color: #9aa3b2; margin: 6px 0 0; }
    .message { min-height: 1.2em; font-size: 0.85rem; color: #ffd180; margin: 4px 0 0; }
  \`,
  ],
})
export class TagInputComponent {
  // tags + tagsChange is the naming Angular needs for [(tags)] two-way binding.
  @Input() set tags(v: string[]) {
    this.list.set(v);
  }
  @Output() tagsChange = new EventEmitter<string[]>();
  @Input() max = 5;
  @Input() maxLength = 20;
  @Input() label = "Tags";
  @ViewChild("input", { static: true }) input!: ElementRef<HTMLInputElement>;

  readonly list = signal<string[]>([]);
  readonly draft = signal(""); // what is typed but not yet a tag
  // first Backspace on an empty box arms the last chip
  readonly armed = signal(false);
  readonly message = signal(""); // read out by the live region

  private setList(next: string[]): void {
    this.list.set(next);
    this.tagsChange.emit(next);
  }

  private add(parts: string[]): boolean {
    const { next, message, ok } = addParts(this.list(), parts, {
      max: this.max,
      maxLength: this.maxLength,
    });
    if (next.length !== this.list().length) this.setList(next);
    this.message.set(message);
    return ok;
  }

  remove(index: number): void {
    this.message.set("Removed " + this.list()[index]);
    this.setList(this.list().filter((_, i) => i !== index));
    this.armed.set(false);
    // the clicked button is gone; do not drop focus on the body
    this.input.nativeElement.focus();
  }

  onInput(e: Event): void {
    this.armed.set(false);
    const el = e.target as HTMLInputElement;
    if (!el.value.includes(",")) {
      this.draft.set(el.value);
      return;
    }
    // Commas are handled here, not in keydown: this also covers paste and
    // Android keyboards, whose keydown reports key "Unidentified".
    const parts = el.value.split(",");
    const rest = parts.pop() ?? "";
    this.add(parts);
    this.draft.set(rest.trimStart());
    // [value] only re-applies when the bound value changes
    el.value = this.draft();
  }

  onKeydown(e: KeyboardEvent): void {
    const list = this.list();
    if (e.key === "Enter") {
      if (e.isComposing) return; // Enter is confirming an IME candidate
      e.preventDefault();
      if (this.draft().trim() && this.add([this.draft()])) {
        this.draft.set("");
        this.input.nativeElement.value = "";
      }
    } else if (
      e.key === "Backspace" &&
      this.draft() === "" &&
      list.length > 0
    ) {
      if (this.armed()) this.remove(list.length - 1);
      else {
        this.armed.set(true);
        this.message.set(
          "Press Backspace again to remove " + list[list.length - 1],
        );
      }
    } else if (e.key === "Escape") {
      this.armed.set(false);
    }
  }
}
`,
          "/src/app/tags.ts": `// Pure helper: try to add each part; returns the new list and what to announce.
export function addParts(
  tags: string[],
  parts: string[],
  { max, maxLength }: { max: number; maxLength: number },
) {
  const next = [...tags];
  const added: string[] = [];
  let problem = "";
  for (const part of parts) {
    const tag = part.trim().replace(/ +/g, " ");
    if (!tag) continue;
    if (tag.length > maxLength)
      problem = "Tags can be at most " + maxLength + " characters";
    else if (next.some((t) => t.toLowerCase() === tag.toLowerCase()))
      problem = tag + " is already added";
    else if (next.length >= max) problem = "You can add up to " + max + " tags";
    else {
      next.push(tag);
      added.push(tag);
    }
  }
  const message = [added.length ? "Added " + added.join(", ") : "", problem]
    .filter(Boolean)
    .join(". ");
  return { next, message, ok: problem === "" };
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Color Picker",
    seoDescription:
      "Build a color picker in React, Vue and Angular: HSL sliders, hex input, swatches, contrast-aware preview and copy to clipboard, with verified color math.",
    description: `**Question presented to candidate:**
"Designers want to pick a brand colour in our settings page. Build a colour picker: hue, saturation and lightness sliders, a hex text field they can type or paste into, a row of preset swatches, a live preview, and a button that copies the hex value."

**Requirements:**
- Three sliders for H (0 to 360), S and L (0 to 100), a hex field that accepts \`#RGB\` or \`#RRGGBB\` (the \`#\` optional, any case), and eight preset swatches.
- Every control updates the others; the preview shows the hex, the \`rgb()\` value and readable text on top (black or white, chosen by contrast).
- An unfinished or invalid hex does not change the colour and is flagged; leaving the field normalises it (for example \`#fc0\` becomes \`#FFCC00\`).
- "Copy" writes the hex to the clipboard and shows a short confirmation, or a fallback message when the Clipboard API is unavailable.
- The parent receives the hex on every change.
- Accessible: labelled sliders with spoken values, swatches as named toggle buttons, a status message.

**What a strong answer should cover:**
- Choosing one canonical colour state and deriving the rest, and why the hex text needs its own draft state.
- Correct HSL to RGB to hex conversions, and the precision trap of storing rounded HSL.
- The WCAG contrast ratio for picking black or white text.
- \`navigator.clipboard.writeText\` being asynchronous, needing a secure context, and failing; a timer that is cleaned up on unmount.
- ARIA: \`aria-valuetext\` on sliders, \`aria-pressed\` on swatches, \`aria-invalid\` on the field.

**Clarifying questions expected:**
- "Which colour models must the user see: HSL, RGB, both? Is alpha needed?"
- "Should the parent get every intermediate value while dragging, or only the final one?"
- "Is there a fixed brand palette for the swatches?"

**Code / implementation expected:** Yes. A working picker with sliders, hex field, swatches, preview and copy; conversion functions that are separate and testable.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know React components and <code>useState</code>; no colour theory is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Code excerpts come from the runnable solution; every number in the Verified section was printed by running the code (React 19.3.1, Node 22).

## 1. Why This Even Matters — A Story First

At a paint shop you can ask for a colour three ways. You can point at a chip on the wall ("that blue"). You can read out the code printed on a tin ("1E90FF"). Or you can sit with the mixer and turn three knobs: which colour family, how vivid, how light. Whatever you do, the shop has to keep one recipe, and every way of asking must update that one recipe and show you a sample.

A **colour picker** is the paint shop on a screen. The swatches are the wall chips, the hex field is the tin code, the sliders are the mixer knobs, and the preview is the sample card. The interview is really about the recipe: if each control kept its own copy of the colour, they would drift apart. Pick one source of truth, derive the rest, and be careful with the maths when you convert between representations.

📌 **Interview term: Hex colour** — a colour written as <code>#RRGGBB</code>, three pairs of hexadecimal digits for red, green and blue from 00 to FF (0 to 255). <code>#RGB</code> is shorthand where each digit is doubled: <code>#fc0</code> is <code>#FFCC00</code>.

📌 **Interview term: HSL** — hue (the colour family, an angle from 0 to 360 degrees), saturation (0 percent grey to 100 percent vivid) and lightness (0 percent black, 50 percent pure colour, 100 percent white). People find HSL easier to adjust than RGB.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which models must the user see and edit: HSL, RGB, hex, alpha? | Each editable model is another input that must convert both ways. |
| Does the parent need every value while dragging? | Decides whether to emit on every input event or debounce or emit on release. |
| Are swatches a fixed brand palette or recent colours? | Recent colours need storage; a palette is a constant. |
| Must it work without a mouse? | Native range inputs give keyboard support for free; a custom 2D area does not. |
| Is copy to clipboard required, and where does the page run? | The Clipboard API needs a secure context and can be refused, so you need a fallback. |

For this build: HSL sliders plus hex, no alpha, emit on every change, a fixed palette, and copy with a fallback message.

## 3. Requirements and Plan

Files: <code>/src/color.js</code> (pure conversion functions), <code>/src/ColorPicker.js</code> (the component) and <code>/App.js</code> (a settings card that receives the hex).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="State flow: sliders, swatches and a valid hex draft all write the single HSL state. RGB, hex and the readable text colour are derived from HSL. The hex draft is separate state that is reset from the derived hex.">
  <defs>
    <marker id="mc06q4r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="160" height="50" rx="10"/>
  <text class="d-text" x="100" y="51" text-anchor="middle">Sliders</text>
  <rect class="d-box-muted" x="20" y="120" width="160" height="50" rx="10"/>
  <text class="d-text" x="100" y="151" text-anchor="middle">Swatches</text>
  <rect class="d-box-muted" x="20" y="220" width="160" height="50" rx="10"/>
  <text class="d-text" x="100" y="251" text-anchor="middle">Hex draft</text>
  <rect class="d-box-accent" x="270" y="110" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="350" y="140" text-anchor="middle">hsl state</text>
  <text class="d-sub" x="350" y="162" text-anchor="middle">full precision</text>
  <rect class="d-box" x="520" y="60" width="160" height="50" rx="10"/>
  <text class="d-text" x="600" y="91" text-anchor="middle">rgb, hex</text>
  <rect class="d-box" x="520" y="180" width="160" height="50" rx="10"/>
  <text class="d-text" x="600" y="211" text-anchor="middle">text colour</text>
  <path class="d-edge-accent" d="M 186 45 L 264 128" marker-end="url(#mc06q4r-arrow)"/>
  <path class="d-edge-accent" d="M 186 145 L 264 145" marker-end="url(#mc06q4r-arrow)"/>
  <path class="d-edge-accent" d="M 186 245 L 264 162" marker-end="url(#mc06q4r-arrow)"/>
  <path class="d-edge" d="M 436 132 L 514 92" marker-end="url(#mc06q4r-arrow)"/>
  <path class="d-edge" d="M 436 160 L 514 200" marker-end="url(#mc06q4r-arrow)"/>
  <path class="d-edge-dashed" d="M 600 236 L 600 282 L 100 282 L 100 276" marker-end="url(#mc06q4r-arrow)"/>
</svg>

Three inputs write one state; everything on screen is derived from it. The dashed line is the only path back: when a slider or swatch changes the colour, the hex draft is reset to the new derived hex.

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>hsl</code> <code>{h, s, l}</code> as floats | <code>useState</code> | The single source of truth |
| <code>draft</code> (hex field text) | <code>useState</code> | The user may be half-way through typing <code>#1e9</code> |
| <code>rgb</code>, <code>hex</code>, readable text colour | Derived each render | Cheap, never stored |
| <code>copyMsg</code> | <code>useState</code> | Feedback for the copy button |
| The message timer | <code>useRef</code> | Must survive renders and be cleared on unmount |

## 4. Build It Step by Step

### 4.1 The colour maths, kept pure

~~~js
export function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
~~~

This is the compact HSL to RGB formula: for each channel it computes where the hue angle falls on a 12-step wheel and clamps the result. Rounding happens only at the end, when converting 0..1 to 0..255.

~~~js
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Keep full precision: rounding here
  // would make hex -> hsl -> hex drift.
  return { h, s: s * 100, l: l * 100 };
}
~~~

The comment on the last line is the most important design decision in the whole widget, and it was measured, not guessed. A script converted **every** 24-bit colour, all 16,777,216 of them, from RGB to HSL and back:

~~~text
colours tested: 16777216 | round trip mismatches with full-precision HSL: 0 | with HSL rounded to integers: 15001676 (89.4%) | 44920 ms
#1e90ff -> hsl 209.600 100.000 55.882 -> rounded back: #1F8FFF
hexToRgb: [170,187,204] [30,144,255] null null
readable on #1E90FF: {"color":"#000000","ratio":"6.5"} | on #FFEB3B: {"color":"#000000","ratio":"17.2"} | on #3F51B5: {"color":"#FFFFFF","ratio":"6.9"}
~~~

With full-precision HSL every colour round-trips exactly. If you store HSL rounded to whole numbers, 89.4 percent of colours come back different. <code>#1e90ff</code> is really <code>hsl(209.6, 100, 55.882)</code>; rounded to <code>hsl(210, 100, 56)</code> it becomes <code>#1F8FFF</code>. A user who pastes their exact brand colour would see it change by one step. So the state keeps floats, and the sliders only *display* rounded numbers.

📌 **Interview term: Lossy round trip** — converting A to B and back to A and not getting the original, because B has less precision. The fix is to keep the most precise form as state and round only for display.

### 4.2 Parsing hex and choosing readable text

~~~js
export function hexToRgb(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const hex =
    m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
~~~

<code>hexToRgb</code> returns <code>null</code> for anything that is not three or six hex digits, which is how the field knows a draft is unfinished. Then the preview text:

~~~js
export function readableText(rgb) {
  const L = luminance(rgb);
  const onWhite = 1.05 / (L + 0.05);
  const onBlack = (L + 0.05) / 0.05;
  return onBlack >= onWhite
    ? { color: "#000000", ratio: onBlack.toFixed(1) }
    : { color: "#FFFFFF", ratio: onWhite.toFixed(1) };
}
~~~

📌 **Interview term: Contrast ratio** — the WCAG measure of how distinguishable two colours are, from 1:1 (identical) to 21:1 (black on white), computed from each colour relative luminance. WCAG AA asks for at least 4.5:1 for normal text. The picker picks black or white, whichever has the higher ratio against the chosen colour, so the preview text is always readable.

### 4.3 State, derived values and the timer

~~~jsx
const [hsl, setHsl] = useState(() => fromHex(initial));
// the hex text box may hold an unfinished value
const [draft, setDraft] = useState(initial);
const [copyMsg, setCopyMsg] = useState("");
const timer = useRef(0);

const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
const hex = rgbToHex(rgb);
const text = readableText(rgb);
const draftValid = hexToRgb(draft) !== null;

// no timer firing after unmount
useEffect(() => () => clearTimeout(timer.current), []);
~~~

Everything below the four hooks is derived during render. The timer for the "Copied" message lives in a ref, and the effect with an empty dependency list returns a cleanup that clears it, so a picker removed from the page never sets state after unmount. Under StrictMode the effect mounts, cleans up and mounts again in development; clearing a timer twice is harmless. See [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect).

### 4.4 Writing the state: sliders, swatches, hex field

~~~jsx
function apply(next) {
  setHsl(next);
  const nextHex = rgbToHex(hslToRgb(next.h, next.s, next.l));
  setDraft(nextHex);
  onChange?.(nextHex);
}
~~~

Sliders and swatches go through <code>apply</code>: set HSL, overwrite the hex draft with the new canonical hex, report to the parent. The hex field is different:

~~~jsx
function handleHexInput(e) {
  const value = e.target.value;
  setDraft(value);
  const parsed = hexToRgb(value);
  if (parsed) {
    setHsl(rgbToHsl(...parsed));
    onChange?.(rgbToHex(parsed));
  }
}
~~~

Typing always updates the draft (so the user sees what they type), but the colour only changes when the draft parses. On blur the field is reset to the canonical hex, which both normalises <code>#fc0</code> to <code>#FFCC00</code> and throws away an invalid leftover. Without a separate draft, the field would be controlled by the derived hex and the user could never type <code>#1</code> on the way to <code>#1e90ff</code>.

📌 **Interview term: Draft state** — a separate piece of state for what the user is typing, committed to the real value only when it is valid. It lets a controlled input hold temporarily invalid text.

### 4.5 Copy to the clipboard

~~~jsx
async function copy() {
  clearTimeout(timer.current);
  try {
    if (!navigator.clipboard) throw new Error("no clipboard");
    await navigator.clipboard.writeText(hex);
    setCopyMsg("Copied " + hex);
  } catch {
    setCopyMsg("Copy failed: select the hex value and copy it by hand");
  }
  timer.current = setTimeout(() => setCopyMsg(""), 2000);
}
~~~

<code>navigator.clipboard.writeText</code> returns a Promise and can fail: the API exists only in secure contexts (HTTPS or localhost), and browsers can require a recent user gesture or permission and reject with <code>NotAllowedError</code> ([MDN, Clipboard API](https://developer.mozilla.org/en-us/docs/web/api/clipboard_api)). The handler therefore checks for the API, awaits the write inside <code>try</code>, and shows either "Copied" or a fallback that tells the user to copy by hand.

### 4.6 Sliders and swatches in the markup

~~~jsx
{
  SLIDERS.map((s) => (
    <label key={s.key} className="slider">
      <span>
        {s.label} <b>{Math.round(hsl[s.key])}</b>
      </span>
      <input
        type="range"
        min="0"
        max={s.max}
        step="1"
        data-testid={"slider-" + s.key}
        value={Math.round(hsl[s.key])}
        aria-valuetext={Math.round(hsl[s.key]) + s.unit}
        onChange={(e) =>
          apply({ ...hsl, [s.key]: Number(e.target.value) })
        }
      />
    </label>
  ));
}
~~~

Native <code>&lt;input type="range"&gt;</code> gives arrow keys, Page Up and Page Down, Home and End, and the slider role for free. <code>aria-valuetext</code> makes a screen reader say "210 degrees" instead of a bare number. Swatches are buttons with <code>aria-pressed</code> set when they match the current colour, and an accessible name such as "Indigo #3F51B5", because a coloured circle has no text of its own.

## 5. Verified: What the Solution Printed

Mounted in jsdom with <code>createRoot</code> in <code>StrictMode</code> and driven with real <code>input</code>, <code>blur</code> and click events. jsdom has no <code>navigator.clipboard</code>, so the first Copy ran without it; then the driver installed a fake clipboard object that records what was written. Each line shows the derived hex and RGB, the slider values, the hex field, the text colour and contrast, which swatch is pressed, and what the parent received:

~~~text
[react] RENDERED: Pick a brand colour#1E90FFrgb(30, 144, 255)text black, contrast 6.5:1Hue 210Saturation 100Lightness 56HexCopyParent received: #1E90FF
[react] mounted                  #1E90FF | rgb(30, 144, 255) | hsl 210 100 56 | box: "#1E90FF" | text black, contrast 6.5:1 | pressed: Dodger blue #1E90FF | Parent received: #1E90FF
[react] lightness -> 30          #004E99 | rgb(0, 78, 153) | hsl 210 100 30 | box: "#004E99" | text white, contrast 8.2:1 | pressed: none | Parent received: #004E99
[react] hue -> 0                 #990000 | rgb(153, 0, 0) | hsl 0 100 30 | box: "#990000" | text white, contrast 8.9:1 | pressed: none | Parent received: #990000
[react] typed #ff (unfinished)   #990000 | rgb(153, 0, 0) | hsl 0 100 30 | box: "#ff" | text white, contrast 8.9:1 | pressed: none | Parent received: #990000
[react] aria-invalid: true | hint: "Use #RGB or #RRGGBB"
[react] typed #fc0               #FFCC00 | rgb(255, 204, 0) | hsl 48 100 50 | box: "#fc0" | text black, contrast 13.9:1 | pressed: none | Parent received: #FFCC00
[react] blur normalises          #FFCC00 | rgb(255, 204, 0) | hsl 48 100 50 | box: "#FFCC00" | text black, contrast 13.9:1 | pressed: none | Parent received: #FFCC00
[react] typed #1e90ff            #1E90FF | rgb(30, 144, 255) | hsl 210 100 56 | box: "#1e90ff" | text black, contrast 6.5:1 | pressed: Dodger blue #1E90FF | Parent received: #1E90FF
[react] click Indigo swatch      #3F51B5 | rgb(63, 81, 181) | hsl 231 48 48 | box: "#3F51B5" | text white, contrast 6.9:1 | pressed: Indigo #3F51B5 | Parent received: #3F51B5
[react] copy, no clipboard API: Copy failed: select the hex value and copy it by hand
[react] copy, fake clipboard: Copied #3F51B5 | written: ["#3F51B5"]
[react] 2.1 s later: ""
[react] slider aria-valuetext: 231 degrees, 48%, 48%
~~~

Key observations: <code>#ff</code> was flagged (<code>aria-invalid</code>, hint shown) without changing the colour; <code>#fc0</code> applied immediately and blur normalised it; typing <code>#1e90ff</code> kept the exact colour (hex <code>#1E90FF</code>, not the <code>#1F8FFF</code> that rounded HSL would give) while the sliders displayed 210, 100, 56; the swatch toggled <code>aria-pressed</code>; Copy fell back without the API, wrote the exact hex with it, and the message cleared after 2 seconds. No <code>console.error</code>. Not checked here: the real permission behaviour of browsers and the visual rendering of the native sliders.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Half-typed hex (<code>#1e9</code>) | Draft shows it, colour unchanged, <code>aria-invalid="true"</code> and a hint |
| <code>#fc0</code> or <code>1E90FF</code> without <code>#</code> | Accepted; blur normalises to <code>#FFCC00</code> style |
| Exact brand colour pasted | Round-trips exactly because HSL keeps full precision |
| Grey (saturation 0) | <code>rgbToHsl</code> returns hue 0, so the hue slider does not jump to NaN |
| Clipboard missing or refused | Fallback message; nothing throws |
| Picker unmounted during the 2 second message | Timer cleared in the effect cleanup |
| Screen reader | Labelled sliders with <code>aria-valuetext</code>, named swatch toggles with <code>aria-pressed</code>, a <code>role="status"</code> message |

## 7. Common Pitfalls

- **Rounding HSL into state.** 89.4 percent of colours change on a round trip, as measured above. Keep floats, round for display.
- **Binding the hex field straight to the derived hex.** The user cannot type a partial value; add a draft.
- **Several sources of truth.** Separate <code>hsl</code>, <code>rgb</code> and <code>hex</code> states drift apart after a few edits. Store one, derive the rest.
- **Assuming the Clipboard API works.** It is async, secure-context only and can be refused. Await it inside <code>try</code>.
- **Timers without cleanup.** A message timer that fires after unmount tries to set state on a dead component.
- **Fixed white preview text.** On yellow it is unreadable; choose by contrast ratio.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One source of truth:</strong> <span style="color:#f0e2c8;">"I store HSL as floats in one state. RGB, hex and the text colour are derived on every render; sliders show rounded values only."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why floats:</strong> <span style="color:#f0e2c8;">"Rounded HSL is lossy: across all 16.7 million colours, 89.4 percent changed after a round trip, so a pasted brand colour would drift."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Hex field:</strong> <span style="color:#f0e2c8;">"The field has its own draft state. It always shows what was typed, applies only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hexToRgb</code> parses it, flags <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-invalid</code> otherwise, and resets to the canonical hex on blur."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Copy:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.clipboard.writeText</code> is async and can be refused or missing, so I await it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>, show Copied or a fallback, and clear the message timer in an effect cleanup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Accessibility:</strong> <span style="color:#f0e2c8;">"Native range inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuetext</code>, swatches as named buttons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code>, preview text chosen by WCAG contrast, and a status message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an alpha channel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> to the state (0 to 1), a fourth slider, accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#RRGGBBAA</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hexToRgb</code>, and draw the preview over a checkerboard so transparency is visible. Contrast must then be computed against the backdrop colour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build the 2D saturation and lightness square?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A div with a hue background and white and black gradients, a pointer handler that maps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientX</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientY</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect()</code> to s and l, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code> for dragging, and arrow keys for keyboard users with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=slider</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuetext</code> on the handle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The parent saves to a server on every change. What would you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the picker emitting immediately for a live preview, but [debounce](/interview-question/debounce-leading-trailing) the save in the parent, or emit a separate change-end event on pointer release, so dragging does not send hundreds of requests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the colour maths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table tests for known pairs (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#1E90FF</code> to rgb 30 144 255), a round-trip property test over many or all colours like the one above, and edge cases: grey, black, white, invalid hex.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about the native input type=color?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a great default when the design allows it: zero code, accessible, with a system picker. Teams build their own for brand swatches, consistent styling and HSL controls.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hex colour** | <code>#RRGGBB</code>, red, green, blue as two hex digits each |
| **HSL** | Hue angle, saturation and lightness percentages |
| **Lossy round trip** | Converting there and back loses information |
| **Draft state** | What the user is typing, kept apart from the committed value |
| **Contrast ratio** | WCAG measure of how readable one colour is on another |
| **Secure context** | A page served over HTTPS or from localhost; required by the Clipboard API |

---
**Conclusion:** A colour picker is a lesson in single source of truth: one HSL state with full precision, and hex, RGB and readable text derived from it. The measured round trip over all 16,777,216 colours (0 mismatches with floats, 89.4 percent with rounded HSL) is the reason for that design. A draft state lets the hex field hold half-typed values, the copy button treats the Clipboard API as the async, fallible call it is, and native sliders with proper ARIA keep it accessible. The React 19.3.1 run showed every one of those behaviours.`,
        files: {
          "/App.js": `import { useState } from "react";
import ColorPicker from "./src/ColorPicker";

export default function App() {
  const [color, setColor] = useState("#1E90FF");
  return (
    <main className="page">
      <section className="card">
        <h1>Pick a brand colour</h1>
        <ColorPicker initial={color} onChange={setColor} />
        <p className="chosen" data-testid="chosen">
          Parent received: {color}
        </p>
      </section>
    </main>
  );
}
`,
          "/src/ColorPicker.js": `import { useEffect, useRef, useState } from "react";
import { hexToRgb, hslToRgb, readableText, rgbToHex, rgbToHsl } from "./color";

const SWATCHES = [
  { name: "Tomato", hex: "#FF6347" },
  { name: "Amber", hex: "#FFC107" },
  { name: "Lime", hex: "#8BC34A" },
  { name: "Teal", hex: "#009688" },
  { name: "Dodger blue", hex: "#1E90FF" },
  { name: "Indigo", hex: "#3F51B5" },
  { name: "Orchid", hex: "#DA70D6" },
  { name: "Slate", hex: "#708090" },
];
const SLIDERS = [
  { key: "h", label: "Hue", max: 360, unit: " degrees" },
  { key: "s", label: "Saturation", max: 100, unit: "%" },
  { key: "l", label: "Lightness", max: 100, unit: "%" },
];
const fromHex = (hex) => rgbToHsl(...hexToRgb(hex));

export default function ColorPicker({ initial = "#1E90FF", onChange }) {
  // Single source of truth: HSL with full precision.
  // Hex, RGB and text colour are derived.
  const [hsl, setHsl] = useState(() => fromHex(initial));
  // the hex text box may hold an unfinished value
  const [draft, setDraft] = useState(initial);
  const [copyMsg, setCopyMsg] = useState("");
  const timer = useRef(0);

  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  const hex = rgbToHex(rgb);
  const text = readableText(rgb);
  const draftValid = hexToRgb(draft) !== null;

  // no timer firing after unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(next) {
    setHsl(next);
    const nextHex = rgbToHex(hslToRgb(next.h, next.s, next.l));
    setDraft(nextHex);
    onChange?.(nextHex);
  }

  function handleHexInput(e) {
    const value = e.target.value;
    setDraft(value);
    const parsed = hexToRgb(value);
    if (parsed) {
      setHsl(rgbToHsl(...parsed));
      onChange?.(rgbToHex(parsed));
    }
  }

  async function copy() {
    clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(hex);
      setCopyMsg("Copied " + hex);
    } catch {
      setCopyMsg("Copy failed: select the hex value and copy it by hand");
    }
    timer.current = setTimeout(() => setCopyMsg(""), 2000);
  }

  return (
    <div className="picker">
      <div
        className="preview"
        data-testid="preview"
        style={{ background: hex, color: text.color }}
      >
        <strong data-testid="hex">{hex}</strong>
        <span data-testid="rgb">rgb({rgb.join(", ")})</span>
        <span data-testid="contrast">
          text {text.color === "#000000" ? "black" : "white"}, contrast{" "}
          {text.ratio}:1
        </span>
      </div>

      {SLIDERS.map((s) => (
        <label key={s.key} className="slider">
          <span>
            {s.label} <b>{Math.round(hsl[s.key])}</b>
          </span>
          <input
            type="range"
            min="0"
            max={s.max}
            step="1"
            data-testid={"slider-" + s.key}
            value={Math.round(hsl[s.key])}
            aria-valuetext={Math.round(hsl[s.key]) + s.unit}
            onChange={(e) => apply({ ...hsl, [s.key]: Number(e.target.value) })}
          />
        </label>
      ))}

      <div className="row">
        <label className="hex-field">
          <span>Hex</span>
          <input
            data-testid="hex-input"
            value={draft}
            spellCheck="false"
            aria-invalid={!draftValid}
            onChange={handleHexInput}
            onBlur={() => setDraft(hex)}
          />
        </label>
        <button type="button" data-testid="copy" onClick={copy}>
          Copy
        </button>
      </div>
      <p className="msg" role="status" data-testid="copy-msg">
        {copyMsg || (draftValid ? "" : "Use #RGB or #RRGGBB")}
      </p>

      <div className="swatches" role="group" aria-label="Preset colours">
        {SWATCHES.map((c) => (
          <button
            key={c.hex}
            type="button"
            className="swatch"
            style={{ background: c.hex }}
            aria-label={c.name + " " + c.hex}
            aria-pressed={hex === c.hex}
            onClick={() => apply(fromHex(c.hex))}
          />
        ))}
      </div>
    </div>
  );
}
`,
          "/src/color.js": `// Colour math, no dependencies. h in [0, 360), s and l in [0, 100].

export function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Keep full precision: rounding here would make hex -> hsl -> hex drift.
  return { h, s: s * 100, l: l * 100 };
}

export const rgbToHex = (rgb) =>
  "#" +
  rgb
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// Accepts "#RGB" or "#RRGGBB" (the # is optional). Returns null when invalid.
export function hexToRgb(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// WCAG relative luminance and contrast ratio, used to pick readable text.
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function readableText(rgb) {
  const L = luminance(rgb);
  const onWhite = 1.05 / (L + 0.05);
  const onBlack = (L + 0.05) / 0.05;
  return onBlack >= onWhite
    ? { color: "#000000", ratio: onBlack.toFixed(1) }
    : { color: "#FFFFFF", ratio: onWhite.toFixed(1) };
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(420px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 14px;
}
.preview {
  display: grid;
  gap: 4px;
  padding: 18px;
  border-radius: 12px;
  margin-bottom: 14px;
  font-size: 0.9rem;
}
.preview strong {
  font-size: 1.4rem;
  letter-spacing: 0.5px;
}
.slider {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 0.85rem;
  color: #c5cbd6;
}
.slider input {
  width: 100%;
  accent-color: #7aa2ff;
}
.row {
  display: flex;
  gap: 8px;
  align-items: end;
}
.hex-field {
  flex: 1;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: #c5cbd6;
}
.hex-field input {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #3a4150;
  background: #0f1115;
  color: #fff;
  font-family: monospace;
  font-size: 1rem;
}
.hex-field input[aria-invalid="true"] {
  border-color: #ff8a80;
}
.row button {
  padding: 9px 16px;
  border: 0;
  border-radius: 8px;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
.msg {
  min-height: 1.2em;
  font-size: 0.8rem;
  color: #ffd180;
  margin: 6px 0;
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #2a2f3a;
  cursor: pointer;
}
.swatch[aria-pressed="true"] {
  border-color: #fff;
  box-shadow: 0 0 0 2px #7aa2ff;
}
.chosen {
  font-size: 0.85rem;
  color: #9aa3b2;
  margin-bottom: 0;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know <code>ref()</code> and templates; no colour theory is assumed.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution, and the outputs were printed by running it (Vue 3.5.44, Node 22).

## 1. The Story

At a paint shop you can point at a wall chip, read out the code on a tin, or turn the mixer knobs for colour family, vividness and lightness. The shop keeps one recipe and shows you a sample card. A **colour picker** is that shop: swatches, a hex field, three sliders and a preview, all editing one recipe.

📌 **Interview term: HSL** — hue (a 0 to 360 degree angle on the colour wheel), saturation and lightness (0 to 100 percent). <code>#RRGGBB</code> **hex** is the same colour as red, green and blue bytes.

## 2. Requirements and the Vue State Model

H, S and L sliders, a hex field accepting <code>#RGB</code>/<code>#RRGGBB</code>, eight swatches, a preview with hex, <code>rgb()</code> and readable black or white text, a Copy button with a fallback, and a <code>change</code> event to the parent with the hex.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| <code>hsl</code> as floats | <code>ref</code> | The single source of truth |
| <code>rgb</code>, <code>hex</code>, text colour, draft validity | <code>computed</code> | Derived and cached |
| Hex field text | <code>ref</code> (<code>draft</code>) | May hold an unfinished value like <code>#1e9</code> |
| Copy message | <code>ref</code> + a timer cleared in <code>onUnmounted</code> | Short-lived feedback |
| Colour maths | <code>/src/color.js</code> | Pure functions, shared with React and Angular |

📌 **Interview term: computed** — a cached value derived from reactive state that recalculates only when its inputs change. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

## 3. Build It Step by Step

### 3.1 Why the state is HSL floats

~~~js
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Keep full precision: rounding here
  // would make hex -> hsl -> hex drift.
  return { h, s: s * 100, l: l * 100 };
}
~~~

A script converted all 16,777,216 RGB colours to HSL and back:

~~~text
colours tested: 16777216 | round trip mismatches with full-precision HSL: 0 | with HSL rounded to integers: 15001676 (89.4%) | 44920 ms
#1e90ff -> hsl 209.600 100.000 55.882 -> rounded back: #1F8FFF
hexToRgb: [170,187,204] [30,144,255] null null
readable on #1E90FF: {"color":"#000000","ratio":"6.5"} | on #FFEB3B: {"color":"#000000","ratio":"17.2"} | on #3F51B5: {"color":"#FFFFFF","ratio":"6.9"}
~~~

Full-precision HSL round-trips every colour; HSL rounded to integers changes 89.4 percent of them (<code>#1e90ff</code> would become <code>#1F8FFF</code>). So the state keeps floats and the template rounds for display.

📌 **Interview term: Lossy round trip** — converting to a less precise form and back, and not getting the original.

### 3.2 State and computed values

~~~vue
const hsl = ref(fromHex(props.initial)); const draft =
ref(props.initial); // the hex text box may hold an unfinished value
const copyMsg = ref(""); let timer = 0; const rgb = computed(() =>
hslToRgb(hsl.value.h, hsl.value.s, hsl.value.l)); const hex =
computed(() => rgbToHex(rgb.value)); const text = computed(() =>
readableText(rgb.value)); const draftValid = computed(() =>
hexToRgb(draft.value) !== null); onUnmounted(() => clearTimeout(timer));
// no timer firing after unmount
~~~

### 3.3 Applying changes

~~~vue
function apply(next) { hsl.value = next; draft.value = hex.value; //
computed values re-evaluate synchronously when read emit("change",
hex.value); }
~~~

In <code>apply</code>, reading <code>hex.value</code> right after setting <code>hsl.value</code> already gives the new hex: a computed recalculates on read when its inputs are dirty, without waiting for a render. The hex field keeps its own draft: typing updates <code>draft</code>, the colour changes only when <code>hexToRgb</code> parses it, and <code>@blur="draft = hex"</code> normalises <code>#fc0</code> to <code>#FFCC00</code>.

📌 **Interview term: Draft state** — what the user is typing, kept apart from the committed value until it is valid.

Unlike some other inputs, the hex field does not need a manual DOM write-back: every keystroke changes <code>draft</code>, so Vue always re-renders and the field always matches it.

### 3.4 The template

~~~vue
<label v-for="s in SLIDERS" :key="s.key" class="slider">
  <span
    >{{ s.label }} <b>{{ Math.round(hsl[s.key]) }}</b></span
  >
  <input
    type="range"
    min="0"
    :max="s.max"
    step="1"
    :data-testid="'slider-' + s.key"
    :value="Math.round(hsl[s.key])"
    :aria-valuetext="Math.round(hsl[s.key]) + s.unit"
    @input="apply({ ...hsl, [s.key]: Number($event.target.value) })"
  />
</label>
~~~

Native range inputs bring keyboard support; <code>:aria-valuetext</code> makes them speak "210 degrees". Swatches are buttons with <code>:aria-pressed</code> and a name like "Indigo #3F51B5". The preview text colour is the black or white with the higher WCAG contrast ratio.

📌 **Interview term: Contrast ratio** — WCAG measure from 1:1 to 21:1 of how readable text is on a background; AA asks for 4.5:1 for normal text.

### 3.5 Copy

~~~vue
async function copy() { clearTimeout(timer); try { if
(!navigator.clipboard) throw new Error("no clipboard"); await
navigator.clipboard.writeText(hex.value); copyMsg.value = "Copied " +
hex.value; } catch { copyMsg.value = "Copy failed: select the hex value
and copy it by hand"; } timer = setTimeout(() => (copyMsg.value = ""),
2000); }
~~~

The Clipboard API exists only in secure contexts and may require a user gesture or permission, rejecting otherwise ([MDN, Clipboard API](https://developer.mozilla.org/en-us/docs/web/api/clipboard_api)), so the call is awaited inside <code>try</code> with a fallback message.

## 4. Verified

Compiled with <code>@vue/compiler-sfc</code> and mounted in jsdom. The driver moved sliders with <code>input</code> events, typed hex values, blurred the field, clicked a swatch and Copy (first with no <code>navigator.clipboard</code>, then with a recording fake installed by the driver):

~~~text
[vue] RENDERED: Pick a brand colour#1E90FFrgb(30, 144, 255)text black, contrast 6.5:1Hue 210Saturation 100Lightness 56HexCopyParent received: #1E90FF
[vue] mounted                  #1E90FF | rgb(30, 144, 255) | hsl 210 100 56 | box: "#1E90FF" | text black, contrast 6.5:1 | pressed: Dodger blue #1E90FF | Parent received: #1E90FF
[vue] lightness -> 30          #004E99 | rgb(0, 78, 153) | hsl 210 100 30 | box: "#004E99" | text white, contrast 8.2:1 | pressed: none | Parent received: #004E99
[vue] hue -> 0                 #990000 | rgb(153, 0, 0) | hsl 0 100 30 | box: "#990000" | text white, contrast 8.9:1 | pressed: none | Parent received: #990000
[vue] typed #ff (unfinished)   #990000 | rgb(153, 0, 0) | hsl 0 100 30 | box: "#ff" | text white, contrast 8.9:1 | pressed: none | Parent received: #990000
[vue] aria-invalid: true | hint: "Use #RGB or #RRGGBB"
[vue] typed #fc0               #FFCC00 | rgb(255, 204, 0) | hsl 48 100 50 | box: "#fc0" | text black, contrast 13.9:1 | pressed: none | Parent received: #FFCC00
[vue] blur normalises          #FFCC00 | rgb(255, 204, 0) | hsl 48 100 50 | box: "#FFCC00" | text black, contrast 13.9:1 | pressed: none | Parent received: #FFCC00
[vue] typed #1e90ff            #1E90FF | rgb(30, 144, 255) | hsl 210 100 56 | box: "#1e90ff" | text black, contrast 6.5:1 | pressed: Dodger blue #1E90FF | Parent received: #1E90FF
[vue] click Indigo swatch      #3F51B5 | rgb(63, 81, 181) | hsl 231 48 48 | box: "#3F51B5" | text white, contrast 6.9:1 | pressed: Indigo #3F51B5 | Parent received: #3F51B5
[vue] copy, no clipboard API: Copy failed: select the hex value and copy it by hand
[vue] copy, fake clipboard: Copied #3F51B5 | written: ["#3F51B5"]
[vue] 2.1 s later: ""
[vue] slider aria-valuetext: 231 degrees, 48%, 48%
~~~

The unfinished <code>#ff</code> was flagged without changing the colour, <code>#fc0</code> applied and normalised on blur, the exact <code>#1E90FF</code> survived while the sliders showed 210, 100, 56, the swatch toggled <code>aria-pressed</code>, and the copy message fell back, then confirmed, then cleared after 2 seconds. No warnings. Real browser clipboard permissions were not tested.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Half-typed hex | Draft kept, colour unchanged, <code>aria-invalid</code> |
| Hex without <code>#</code>, any case | Accepted and normalised on blur |
| Grey colours | Hue 0, no NaN |
| Clipboard missing or refused | Fallback message |
| Unmount during the message | Timer cleared in <code>onUnmounted</code> |
| Screen reader | Labelled sliders with <code>aria-valuetext</code>, named swatches with <code>aria-pressed</code>, status text |

## 6. Common Pitfalls

- **<code>v-model</code> on the hex field bound to the computed hex.** A read-only computed cannot be assigned, and a writable one would apply half-typed values; use a draft.
- **Rounding HSL into state.** Lossy, as measured.
- **A <code>watch</code> to keep rgb and hex in sync.** Derived values are <code>computed</code>; watchers that copy state into state drift and double-render.
- **Forgetting the timer on unmount.** Clear it in <code>onUnmounted</code>.
- **Assuming the clipboard works.** Await in <code>try</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> holds HSL as floats; rgb, hex, readable text and draft validity are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Precision:</strong> <span style="color:#f0e2c8;">"Rounded HSL changed 89.4 percent of all 16.7 million colours on a round trip, so I keep floats and round only in the template."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Hex field:</strong> <span style="color:#f0e2c8;">"A separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">draft</code> ref: it always shows the typing, applies only when it parses, and resets to the canonical hex on blur."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Copy:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.clipboard.writeText</code> awaited in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>, a fallback message, and the message timer cleared in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"Native range inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuetext</code>, swatch buttons with names and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-pressed</code>, contrast-chosen preview text."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you expose the colour with v-model?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code> emit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const model = defineModel()</code> and assign <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model.value = hex</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">apply</code>. Watch the model for outside changes and convert it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fromHex</code> only when it differs from the current hex, to avoid loops.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you save to a server without flooding it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce in the parent, or emit a separate event on the slider <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code> event, which fires when the user releases the thumb.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a saturation and lightness square?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A div with gradient backgrounds and pointer handlers that map the pointer position to s and l, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code> for dragging and arrow keys with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=slider</code> for keyboard users.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the maths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table tests of known pairs, a round-trip test over many colours like the one above, and edge cases for grey, black, white and invalid strings.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HSL** | Hue angle, saturation and lightness |
| **computed** | Cached value derived from reactive state |
| **Lossy round trip** | Conversion there and back that loses information |
| **Draft state** | Typed text kept apart from the committed value |
| **Contrast ratio** | How readable one colour is on another |

---
**Conclusion:** In Vue the colour picker is one HSL <code>ref</code> of floats with everything else <code>computed</code>, a <code>draft</code> ref for the hex field, and a clipboard call that expects failure. The measured round trip over every 24-bit colour is the reason for storing floats. The Vue 3.5.44 run printed the same results as the React and Angular versions.`,
        files: {
          "/src/App.vue": `<script setup>
import { ref } from "vue";
import ColorPicker from "./components/ColorPicker.vue";

const color = ref("#1E90FF");
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>Pick a brand colour</h1>
      <ColorPicker :initial="color" @change="color = $event" />
      <p class="chosen" data-testid="chosen">Parent received: {{ color }}</p>
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(420px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 14px;
}
.chosen {
  font-size: 0.85rem;
  color: #9aa3b2;
  margin-bottom: 0;
}
</style>
`,
          "/src/color.js": `// Colour math, no dependencies. h in [0, 360), s and l in [0, 100].

export function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Keep full precision: rounding here would make hex -> hsl -> hex drift.
  return { h, s: s * 100, l: l * 100 };
}

export const rgbToHex = (rgb) =>
  "#" +
  rgb
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// Accepts "#RGB" or "#RRGGBB" (the # is optional). Returns null when invalid.
export function hexToRgb(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// WCAG relative luminance and contrast ratio, used to pick readable text.
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function readableText(rgb) {
  const L = luminance(rgb);
  const onWhite = 1.05 / (L + 0.05);
  const onBlack = (L + 0.05) / 0.05;
  return onBlack >= onWhite
    ? { color: "#000000", ratio: onBlack.toFixed(1) }
    : { color: "#FFFFFF", ratio: onWhite.toFixed(1) };
}
`,
          "/src/components/ColorPicker.vue": `<script setup>
import { computed, onUnmounted, ref } from "vue";
import {
  hexToRgb,
  hslToRgb,
  readableText,
  rgbToHex,
  rgbToHsl,
} from "../color.js";

const SWATCHES = [
  { name: "Tomato", hex: "#FF6347" },
  { name: "Amber", hex: "#FFC107" },
  { name: "Lime", hex: "#8BC34A" },
  { name: "Teal", hex: "#009688" },
  { name: "Dodger blue", hex: "#1E90FF" },
  { name: "Indigo", hex: "#3F51B5" },
  { name: "Orchid", hex: "#DA70D6" },
  { name: "Slate", hex: "#708090" },
];
const SLIDERS = [
  { key: "h", label: "Hue", max: 360, unit: " degrees" },
  { key: "s", label: "Saturation", max: 100, unit: "%" },
  { key: "l", label: "Lightness", max: 100, unit: "%" },
];
const fromHex = (hex) => rgbToHsl(...hexToRgb(hex));

const props = defineProps({ initial: { type: String, default: "#1E90FF" } });
const emit = defineEmits(["change"]);

// Single source of truth: HSL with full precision. Everything else is computed.
const hsl = ref(fromHex(props.initial));
// the hex text box may hold an unfinished value
const draft = ref(props.initial);
const copyMsg = ref("");
let timer = 0;

const rgb = computed(() => hslToRgb(hsl.value.h, hsl.value.s, hsl.value.l));
const hex = computed(() => rgbToHex(rgb.value));
const text = computed(() => readableText(rgb.value));
const draftValid = computed(() => hexToRgb(draft.value) !== null);

onUnmounted(() => clearTimeout(timer)); // no timer firing after unmount

function apply(next) {
  hsl.value = next;
  // computed values re-evaluate synchronously when read
  draft.value = hex.value;
  emit("change", hex.value);
}

function onHexInput(e) {
  draft.value = e.target.value;
  const parsed = hexToRgb(draft.value);
  if (parsed) {
    hsl.value = rgbToHsl(...parsed);
    emit("change", rgbToHex(parsed));
  }
}

async function copy() {
  clearTimeout(timer);
  try {
    if (!navigator.clipboard) throw new Error("no clipboard");
    await navigator.clipboard.writeText(hex.value);
    copyMsg.value = "Copied " + hex.value;
  } catch {
    copyMsg.value = "Copy failed: select the hex value and copy it by hand";
  }
  timer = setTimeout(() => (copyMsg.value = ""), 2000);
}
</script>

<template>
  <div class="picker">
    <div
      class="preview"
      data-testid="preview"
      :style="{ background: hex, color: text.color }"
    >
      <strong data-testid="hex">{{ hex }}</strong>
      <span data-testid="rgb">rgb({{ rgb.join(", ") }})</span>
      <span data-testid="contrast"
        >text {{ text.color === "#000000" ? "black" : "white" }}, contrast
        {{ text.ratio }}:1</span
      >
    </div>

    <label v-for="s in SLIDERS" :key="s.key" class="slider">
      <span
        >{{ s.label }} <b>{{ Math.round(hsl[s.key]) }}</b></span
      >
      <input
        type="range"
        min="0"
        :max="s.max"
        step="1"
        :data-testid="'slider-' + s.key"
        :value="Math.round(hsl[s.key])"
        :aria-valuetext="Math.round(hsl[s.key]) + s.unit"
        @input="apply({ ...hsl, [s.key]: Number($event.target.value) })"
      />
    </label>

    <div class="row">
      <label class="hex-field">
        <span>Hex</span>
        <input
          data-testid="hex-input"
          :value="draft"
          spellcheck="false"
          :aria-invalid="!draftValid"
          @input="onHexInput"
          @blur="draft = hex"
        />
      </label>
      <button type="button" data-testid="copy" @click="copy">Copy</button>
    </div>
    <p class="msg" role="status" data-testid="copy-msg">
      {{ copyMsg || (draftValid ? "" : "Use #RGB or #RRGGBB") }}
    </p>

    <div class="swatches" role="group" aria-label="Preset colours">
      <button
        v-for="c in SWATCHES"
        :key="c.hex"
        type="button"
        class="swatch"
        :style="{ background: c.hex }"
        :aria-label="c.name + ' ' + c.hex"
        :aria-pressed="hex === c.hex"
        @click="apply(fromHex(c.hex))"
      />
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  gap: 4px;
  padding: 18px;
  border-radius: 12px;
  margin-bottom: 14px;
  font-size: 0.9rem;
}
.preview strong {
  font-size: 1.4rem;
  letter-spacing: 0.5px;
}
.slider {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 0.85rem;
  color: #c5cbd6;
}
.slider input {
  width: 100%;
  accent-color: #7aa2ff;
}
.row {
  display: flex;
  gap: 8px;
  align-items: end;
}
.hex-field {
  flex: 1;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: #c5cbd6;
}
.hex-field input {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #3a4150;
  background: #0f1115;
  color: #fff;
  font-family: monospace;
  font-size: 1rem;
}
.hex-field input[aria-invalid="true"] {
  border-color: #ff8a80;
}
.row button {
  padding: 9px 16px;
  border: 0;
  border-radius: 8px;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
.msg {
  min-height: 1.2em;
  font-size: 0.8rem;
  color: #ffd180;
  margin: 6px 0;
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #2a2f3a;
  cursor: pointer;
}
.swatch[aria-pressed="true"] {
  border-color: #fff;
  box-shadow: 0 0 0 2px #7aa2ff;
}
</style>
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know components and templates; signals and colour basics are explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution; outputs were printed by running it on Angular 22.2.3 (AOT strict and runtime JIT) and Node 22.

## 1. The Story

A paint shop lets you point at a wall chip, read a tin code, or turn the mixer knobs; it keeps one recipe and shows a sample card. A **colour picker** does the same with swatches, a hex field, three sliders and a preview.

📌 **Interview term: HSL** — hue (0 to 360 degrees), saturation and lightness (0 to 100 percent). **Hex** <code>#RRGGBB</code> writes the same colour as red, green and blue bytes.

## 2. Requirements and the Angular State Model

H, S and L sliders, a hex field for <code>#RGB</code>/<code>#RRGGBB</code>, eight swatches, a preview with hex, <code>rgb()</code> and readable text, Copy with a fallback, and an <code>@Output() colorChange</code> with the hex.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>hsl</code> as floats | <code>signal&lt;Hsl&gt;</code> | Single source of truth |
| <code>rgb</code>, <code>hex</code>, text colour, draft validity | <code>computed()</code> | Derived, cached |
| Hex field text | <code>signal</code> <code>draft</code> | Can hold <code>#1e9</code> while typing |
| Initial colour | <code>@Input() initial</code>, read in <code>ngOnInit</code> | Inputs are not set in the constructor |
| Message timer | Field cleared in <code>ngOnDestroy</code> | No callback after destroy |

📌 **Interview term: Signal** — a reactive value: templates and <code>computed()</code> that read it update when it is set. Angular 22 apps are zoneless by default here, so state that changes after a timer or a Promise must be a signal to re-render. See [Angular signals](/interview-question/what-are-angular-signals).

## 3. Build It Step by Step

### 3.1 Why floats

~~~ts
export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Keep full precision: rounding here
  // would make hex -> hsl -> hex drift.
  return { h, s: s * 100, l: l * 100 };
}
~~~

A round-trip script over all 16,777,216 colours:

~~~text
colours tested: 16777216 | round trip mismatches with full-precision HSL: 0 | with HSL rounded to integers: 15001676 (89.4%) | 44920 ms
#1e90ff -> hsl 209.600 100.000 55.882 -> rounded back: #1F8FFF
hexToRgb: [170,187,204] [30,144,255] null null
readable on #1E90FF: {"color":"#000000","ratio":"6.5"} | on #FFEB3B: {"color":"#000000","ratio":"17.2"} | on #3F51B5: {"color":"#FFFFFF","ratio":"6.9"}
~~~

Rounded HSL changed 89.4 percent of colours (<code>#1e90ff</code> came back as <code>#1F8FFF</code>); full precision changed none. The state keeps floats; the template rounds with <code>round()</code> for display.

📌 **Interview term: Lossy round trip** — converting to a less precise form and back and not getting the original.

### 3.2 Signals and computed values

~~~ts
readonly hsl = signal<Hsl>({ h: 0, s: 0, l: 0 });
// the hex text box may hold an unfinished value
readonly draft = signal("");
readonly copyMsg = signal("");
readonly rgb = computed(() =>
  hslToRgb(this.hsl().h, this.hsl().s, this.hsl().l),
);
readonly hex = computed(() => rgbToHex(this.rgb()));
readonly text = computed(() => readableText(this.rgb()));
readonly draftValid = computed(() => hexToRgb(this.draft()) !== null);
private timer: ReturnType<typeof setTimeout> | undefined;

ngOnInit(): void {
  // @Input is set by now, not in the constructor
  this.hsl.set(fromHex(this.initial));
  this.draft.set(this.initial);
}
~~~

<code>readonly round = Math.round</code> and <code>readonly fromHex = fromHex</code> expose helpers to the template, which can only call members of the component.

### 3.3 Writing the state

~~~ts
apply(next: Hsl): void {
  this.hsl.set(next);
  this.draft.set(this.hex());
  this.colorChange.emit(this.hex());
}
~~~

Sliders call <code>onSlider</code>, which builds the next HSL with a computed key and calls <code>apply</code>. The hex field updates <code>draft</code> on every keystroke but changes the colour only when it parses; <code>(blur)="draft.set(hex())"</code> normalises it. Every keystroke changes <code>draft()</code>, so the <code>[value]</code> binding always re-applies and no manual DOM write-back is needed here.

📌 **Interview term: Draft state** — typed text kept apart from the committed value until it is valid.

### 3.4 The template

~~~ts
@for (s of sliders; track s.key) {
  <label class="slider">
    <span>{{ s.label }} <b>{{ round(hsl()[s.key]) }}</b></span>
    <input
      type="range"
      min="0"
      [max]="s.max"
      step="1"
      [attr.data-testid]="'slider-' + s.key"
      [value]="round(hsl()[s.key])"
      [attr.aria-valuetext]="round(hsl()[s.key]) + s.unit"
      (input)="onSlider(s.key, $event)"
    />
  </label>
}
~~~

Native range inputs give keyboard support and the slider role; <code>[attr.aria-valuetext]</code> speaks "210 degrees". In the template, <code>min</code> is static and <code>[max]</code> is bound before <code>[value]</code>. Order matters, because a range input clamps its value to the max it has at that moment. Setting the two properties in each order in real Chromium:

~~~text
[chromium] value set before max: 100 | max set before value: 210
~~~

Value first gives 100 (the default max), max first gives 210. Angular applies these bindings in template order, and the hue slider showing 210 in the run below confirms it. Swatches use <code>[attr.aria-pressed]</code> and names like "Indigo #3F51B5"; the preview text is black or white by WCAG contrast ratio.

📌 **Interview term: Contrast ratio** — how readable text is on a background, from 1:1 to 21:1; WCAG AA wants 4.5:1 for body text.

### 3.5 Copy

~~~ts
async copy(): Promise<void> {
  clearTimeout(this.timer);
  try {
    if (!navigator.clipboard) throw new Error("no clipboard");
    await navigator.clipboard.writeText(this.hex());
    this.copyMsg.set("Copied " + this.hex());
  } catch {
    this.copyMsg.set(
      "Copy failed: select the hex value and copy it by hand",
    );
  }
  // A signal write, so the zoneless app
  // re-renders when the timer fires.
  this.timer = setTimeout(() => this.copyMsg.set(""), 2000);
}
~~~

The Clipboard API is secure-context only and can reject without a user gesture or permission ([MDN, Clipboard API](https://developer.mozilla.org/en-us/docs/web/api/clipboard_api)). The message is a signal, so the zoneless app re-renders when the timer clears it.

## 4. Verified

Compiled with <code>ngc</code> and <code>strictTemplates</code> (<code>angular:app</code>) and run with runtime JIT (<code>angular:playground</code>) in jsdom. The driver moved sliders, typed hex values, blurred, clicked a swatch and Copy (first with no <code>navigator.clipboard</code>, then with a recording fake). AOT output; JIT printed the same lines:

~~~text
[angular:app] RENDERED: Pick a brand colour#1E90FFrgb(30, 144, 255)text black, contrast 6.5:1Hue 210Saturation 100Lightness 56HexCopyParent received: #1E90FF
[angular:app] mounted                  #1E90FF | rgb(30, 144, 255) | hsl 210 100 56 | box: "#1E90FF" | text black, contrast 6.5:1 | pressed: Dodger blue #1E90FF | Parent received: #1E90FF
[angular:app] lightness -> 30          #004E99 | rgb(0, 78, 153) | hsl 210 100 30 | box: "#004E99" | text white, contrast 8.2:1 | pressed: none | Parent received: #004E99
[angular:app] hue -> 0                 #990000 | rgb(153, 0, 0) | hsl 0 100 30 | box: "#990000" | text white, contrast 8.9:1 | pressed: none | Parent received: #990000
[angular:app] typed #ff (unfinished)   #990000 | rgb(153, 0, 0) | hsl 0 100 30 | box: "#ff" | text white, contrast 8.9:1 | pressed: none | Parent received: #990000
[angular:app] aria-invalid: true | hint: "Use #RGB or #RRGGBB"
[angular:app] typed #fc0               #FFCC00 | rgb(255, 204, 0) | hsl 48 100 50 | box: "#fc0" | text black, contrast 13.9:1 | pressed: none | Parent received: #FFCC00
[angular:app] blur normalises          #FFCC00 | rgb(255, 204, 0) | hsl 48 100 50 | box: "#FFCC00" | text black, contrast 13.9:1 | pressed: none | Parent received: #FFCC00
[angular:app] typed #1e90ff            #1E90FF | rgb(30, 144, 255) | hsl 210 100 56 | box: "#1e90ff" | text black, contrast 6.5:1 | pressed: Dodger blue #1E90FF | Parent received: #1E90FF
[angular:app] click Indigo swatch      #3F51B5 | rgb(63, 81, 181) | hsl 231 48 48 | box: "#3F51B5" | text white, contrast 6.9:1 | pressed: Indigo #3F51B5 | Parent received: #3F51B5
[angular:app] copy, no clipboard API: Copy failed: select the hex value and copy it by hand
[angular:app] copy, fake clipboard: Copied #3F51B5 | written: ["#3F51B5"]
[angular:app] 2.1 s later: ""
[angular:app] slider aria-valuetext: 231 degrees, 48%, 48%
~~~

Invalid drafts were flagged without changing the colour, <code>#fc0</code> applied and normalised, the exact <code>#1E90FF</code> survived with sliders at 210, 100, 56, and the copy message fell back, confirmed and cleared after 2 seconds. No <code>console.error</code>. Real clipboard permissions were not tested.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Half-typed hex | Draft kept, <code>[attr.aria-invalid]</code> true, hint shown |
| Hex without <code>#</code> | Accepted, normalised on blur |
| Grey | Hue 0, no NaN |
| Clipboard refused | Fallback message |
| Destroyed during the message | Timer cleared in <code>ngOnDestroy</code> |
| Screen reader | <code>aria-valuetext</code> sliders, named <code>aria-pressed</code> swatches, status text |

## 6. Common Pitfalls

- **Reading <code>@Input() initial</code> in a field initializer.** It is still the default there; use <code>ngOnInit</code>.
- **Rounded HSL in state.** Lossy, as measured.
- **A plain field for the copy message.** In a zoneless app a timer that changes a plain field does not re-render; use a signal.
- **Binding <code>[value]</code> before <code>[max]</code> on a range.** The browser clamps to the old max.
- **Calling <code>Math.round</code> directly in the template.** Templates cannot see globals; expose it as a member.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> holds HSL floats; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> derives rgb, hex, readable text and whether the draft parses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Precision:</strong> <span style="color:#f0e2c8;">"Across every 24-bit colour, rounded HSL changed 89.4 percent on a round trip, so the signal keeps floats and the template rounds."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Hex field:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">draft</code> signal shows what was typed, applies only valid hex, and resets to the canonical hex on blur."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Copy:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.clipboard.writeText</code> awaited in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code> with a fallback, the message in a signal so the zoneless app updates, and the timer cleared in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"Native range inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-valuetext]</code>, swatches with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-pressed]</code> and names, and preview text chosen by contrast."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use it in a reactive form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue(hex)</code> sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hsl</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fromHex</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores the callback called in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">apply</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> disables the inputs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid flooding a server while dragging?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Emit on every input for the preview, and either debounce the save with RxJS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code> on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Subject</code>, or emit a separate event from the range <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(change)</code> event, which fires on release.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why computed() and not getters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A getter re-runs on every change detection pass; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> caches until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hsl</code> changes and works with signal-based change detection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">color.ts</code> with known pairs and a round-trip loop. In TestBed, set a slider value, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges</code>, assert the hex text and that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">colorChange</code> emitted.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HSL** | Hue angle, saturation and lightness |
| **Signal** | A reactive value that templates and computeds track |
| **Lossy round trip** | Conversion there and back that loses information |
| **Draft state** | Typed text kept apart from the committed value |
| **Contrast ratio** | How readable one colour is on another |

---
**Conclusion:** The Angular colour picker stores one HSL signal of floats, derives everything else with <code>computed()</code>, keeps a draft signal for the hex field, and treats the clipboard as an async call that can fail, with its timer cleaned up in <code>ngOnDestroy</code>. Measured over all 16,777,216 colours, keeping floats is what makes a pasted brand colour stay exact. AOT and JIT runs on Angular 22.2.3 matched the React and Vue output.`,
        files: {
          "/src/app/app.component.ts": `import { DOCUMENT } from "@angular/common";
import { Component, signal, inject } from "@angular/core";
import { ColorPickerComponent } from "./color-picker.component";

@Component({
  selector: "app-root",
  imports: [ColorPickerComponent],
  template: \`
    <main class="page">
      <section class="card">
        <h1>Pick a brand colour</h1>
        <app-color-picker
          [initial]="color()"
          (colorChange)="color.set($event)"
        />
        <p
          class="chosen"
          data-testid="chosen"
        >Parent received: {{ color() }}</p>
      </section>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .page { min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
    .card { width: min(420px, 100%); background: #181b22; border: 1px solid #2a2f3a; border-radius: 14px; padding: 20px; box-sizing: border-box; }
    h1 { font-size: 1.25rem; margin: 0 0 14px; }
    .chosen { font-size: 0.85rem; color: #9aa3b2; margin-bottom: 0; }
  \`,
  ],
})
export class AppComponent {
  constructor() {
    // The playground page has a default white
    // body margin; make the whole page dark.
    inject(DOCUMENT).body.style.cssText = "margin: 0; background: #0f1115;";
  }

  readonly color = signal("#1E90FF");
}
`,
          "/src/app/color-picker.component.ts": `import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  signal,
} from "@angular/core";
import {
  Hsl,
  hexToRgb,
  hslToRgb,
  readableText,
  rgbToHex,
  rgbToHsl,
} from "./color";

const SWATCHES = [
  { name: "Tomato", hex: "#FF6347" },
  { name: "Amber", hex: "#FFC107" },
  { name: "Lime", hex: "#8BC34A" },
  { name: "Teal", hex: "#009688" },
  { name: "Dodger blue", hex: "#1E90FF" },
  { name: "Indigo", hex: "#3F51B5" },
  { name: "Orchid", hex: "#DA70D6" },
  { name: "Slate", hex: "#708090" },
];
const SLIDERS: { key: keyof Hsl; label: string; max: number; unit: string }[] =
  [
    { key: "h", label: "Hue", max: 360, unit: " degrees" },
    { key: "s", label: "Saturation", max: 100, unit: "%" },
    { key: "l", label: "Lightness", max: 100, unit: "%" },
  ];
const fromHex = (hex: string): Hsl => {
  const [r, g, b] = hexToRgb(hex) ?? [0, 0, 0];
  return rgbToHsl(r, g, b);
};

@Component({
  selector: "app-color-picker",
  template: \`
    <div
      class="preview"
      data-testid="preview"
      [style.background]="hex()"
      [style.color]="text().color"
    >
      <strong data-testid="hex">{{ hex() }}</strong>
      <span data-testid="rgb">rgb({{ rgb().join(", ") }})</span>
      <span data-testid="contrast">text {{ text().color === "#000000" ? "black" : "white" }}, contrast {{ text().ratio }}:1</span>
    </div>

    @for (s of sliders; track s.key) {
      <label class="slider">
        <span>{{ s.label }} <b>{{ round(hsl()[s.key]) }}</b></span>
        <input
          type="range"
          min="0"
          [max]="s.max"
          step="1"
          [attr.data-testid]="'slider-' + s.key"
          [value]="round(hsl()[s.key])"
          [attr.aria-valuetext]="round(hsl()[s.key]) + s.unit"
          (input)="onSlider(s.key, $event)"
        />
      </label>
    }

    <div class="row">
      <label class="hex-field">
        <span>Hex</span>
        <input
          data-testid="hex-input"
          [value]="draft()"
          spellcheck="false"
          [attr.aria-invalid]="!draftValid()"
          (input)="onHexInput($event)"
          (blur)="draft.set(hex())"
        />
      </label>
      <button type="button" data-testid="copy" (click)="copy()">Copy</button>
    </div>
    <p
      class="msg"
      role="status"
      data-testid="copy-msg"
    >{{ copyMsg() || (draftValid() ? "" : "Use #RGB or #RRGGBB") }}</p>

    <div class="swatches" role="group" aria-label="Preset colours">
      @for (c of swatches; track c.hex) {
        <button
          type="button"
          class="swatch"
          [style.background]="c.hex"
          [attr.aria-label]="c.name + ' ' + c.hex"
          [attr.aria-pressed]="hex() === c.hex"
          (click)="apply(fromHex(c.hex))"
        ></button>
      }
    </div>
  \`,
  styles: [
    \`
    :host { display: block; }
    .preview { display: grid; gap: 4px; padding: 18px; border-radius: 12px; margin-bottom: 14px; font-size: 0.9rem; }
    .preview strong { font-size: 1.4rem; letter-spacing: 0.5px; }
    .slider { display: grid; gap: 4px; margin-bottom: 10px; font-size: 0.85rem; color: #c5cbd6; }
    .slider input { width: 100%; accent-color: #7aa2ff; }
    .row { display: flex; gap: 8px; align-items: end; }
    .hex-field { flex: 1; display: grid; gap: 4px; font-size: 0.85rem; color: #c5cbd6; }
    .hex-field input { padding: 8px; border-radius: 8px; border: 1px solid #3a4150; background: #0f1115; color: #fff; font-family: monospace; font-size: 1rem; }
    .hex-field input[aria-invalid="true"] { border-color: #ff8a80; }
    .row button { padding: 9px 16px; border: 0; border-radius: 8px; background: #4f7cff; color: #fff; cursor: pointer; }
    .msg { min-height: 1.2em; font-size: 0.8rem; color: #ffd180; margin: 6px 0; }
    .swatches { display: flex; flex-wrap: wrap; gap: 8px; }
    .swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #2a2f3a; cursor: pointer; }
    .swatch[aria-pressed="true"] { border-color: #fff; box-shadow: 0 0 0 2px #7aa2ff; }
  \`,
  ],
})
export class ColorPickerComponent implements OnInit, OnDestroy {
  @Input() initial = "#1E90FF";
  @Output() colorChange = new EventEmitter<string>();

  readonly sliders = SLIDERS;
  readonly swatches = SWATCHES;
  readonly fromHex = fromHex;
  readonly round = Math.round;

  // Single source of truth: HSL with full
  // precision. Everything else is computed().
  readonly hsl = signal<Hsl>({ h: 0, s: 0, l: 0 });
  readonly draft = signal(""); // the hex text box may hold an unfinished value
  readonly copyMsg = signal("");
  readonly rgb = computed(() =>
    hslToRgb(this.hsl().h, this.hsl().s, this.hsl().l),
  );
  readonly hex = computed(() => rgbToHex(this.rgb()));
  readonly text = computed(() => readableText(this.rgb()));
  readonly draftValid = computed(() => hexToRgb(this.draft()) !== null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    // @Input is set by now, not in the constructor
    this.hsl.set(fromHex(this.initial));
    this.draft.set(this.initial);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer); // no timer firing after destroy
  }

  apply(next: Hsl): void {
    this.hsl.set(next);
    this.draft.set(this.hex());
    this.colorChange.emit(this.hex());
  }

  onSlider(key: keyof Hsl, e: Event): void {
    this.apply({
      ...this.hsl(),
      [key]: Number((e.target as HTMLInputElement).value),
    });
  }

  onHexInput(e: Event): void {
    this.draft.set((e.target as HTMLInputElement).value);
    const parsed = hexToRgb(this.draft());
    if (parsed) {
      this.hsl.set(rgbToHsl(parsed[0], parsed[1], parsed[2]));
      this.colorChange.emit(rgbToHex(parsed));
    }
  }

  async copy(): Promise<void> {
    clearTimeout(this.timer);
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(this.hex());
      this.copyMsg.set("Copied " + this.hex());
    } catch {
      this.copyMsg.set("Copy failed: select the hex value and copy it by hand");
    }
    // A signal write, so the zoneless app re-renders when the timer fires.
    this.timer = setTimeout(() => this.copyMsg.set(""), 2000);
  }
}
`,
          "/src/app/color.ts": `// Colour math, no dependencies. h in [0, 360), s and l in [0, 100].

export function hslToRgb(h: number, s: number, l: number): number[] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Keep full precision: rounding here would make hex -> hsl -> hex drift.
  return { h, s: s * 100, l: l * 100 };
}

export const rgbToHex = (rgb: number[]): string =>
  "#" +
  rgb
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// Accepts "#RGB" or "#RRGGBB" (the # is optional). Returns null when invalid.
export function hexToRgb(text: string): number[] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// WCAG relative luminance and contrast ratio, used to pick readable text.
function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function readableText(rgb: number[]): { color: string; ratio: string } {
  const L = luminance(rgb);
  const onWhite = 1.05 / (L + 0.05);
  const onBlack = (L + 0.05) / 0.05;
  return onBlack >= onWhite
    ? { color: "#000000", ratio: onBlack.toFixed(1) }
    : { color: "#FFFFFF", ratio: onWhite.toFixed(1) };
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Dual Range (price) Slider",
    seoDescription:
      "Build a dual range price slider in React, Vue and Angular from two native range inputs: no crossing, snapping, number boxes and real-browser drag tests.",
    description: `**Question presented to candidate:**
"On our product listing page we need a price filter: one track, two handles, a minimum and a maximum. Users drag either handle, or type exact numbers in two boxes. The handles must never cross, values snap to a step, and the product count updates as they move. Build the slider component and a small page that uses it."

**Requirements:**
- One track from \`min\` to \`max\` (0 to 1000 here) with two handles; values snap to \`step\` (10).
- The low handle can never pass the high handle; a minimum gap (\`minGap\`, 50) is kept between them.
- The selected part of the track is highlighted.
- Two number boxes show the values and accept typed input, committed on Enter or blur, then snapped and clamped.
- Both handles work with the keyboard (arrows, Home, End) and are announced with names and dollar values.
- The component is controlled: the parent owns \`[min, max]\` and filters a (local, in-memory) product list by it.

**What a strong answer should cover:**
- The build choice: two stacked native \`input type="range"\` elements (free keyboard and ARIA support) versus a custom pointer-event slider (full control), and the CSS that makes stacking work: \`pointer-events: none\` on the inputs, \`auto\` on the thumbs.
- Pure helpers for snapping, clamping and value-to-percent mapping.
- Why a clamped handle can stay visually crossed in some frameworks, and how to put it back.
- The stacking problem when both thumbs sit at one end, and the z-index rule that fixes it.
- A draft state for the number boxes so typing does not move the handles keystroke by keystroke.
- What jsdom can and cannot verify, and testing the drag in a real browser.

**Clarifying questions expected:**
- "Can the two handles meet, or is a minimum gap required?"
- "Should the product list update while dragging, or only on release?"
- "Is the scale linear, or do we need a logarithmic scale for wide price ranges?"

**Code / implementation expected:** Yes. A working two-handle slider with clamping, snapping, number boxes, keyboard support and a filtered result count.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know React components and <code>useState</code>; CSS tricks and pointer details are explained.
**Difficulty:** Hard

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Code excerpts come from the runnable solution. The Verified section quotes two kinds of real output: a jsdom run on React 19.3.1 for values and clamping, and a real Chromium 141 run in which a mouse actually dragged the thumbs.

## 1. Why This Even Matters — A Story First

Imagine two bookends on a shelf. You slide the left one to where the cheap books end and the right one to where the expensive ones start; the books between them are your budget. The bookends cannot pass through each other, and a book needs some width, so they cannot touch either.

A **dual range slider** is those bookends on a price scale. It is the standard filter on every shopping site, and it is a hard machine coding question for two reasons. First, browsers have no built-in two-handle slider, so you either combine two native sliders or build one from pointer events. Second, the handles interact: moving one must never push it past the other, and that rule has to hold for dragging, keyboard and typed numbers alike.

📌 **Interview term: Range input** — <code>&lt;input type="range"&gt;</code>, the native slider. It has <code>min</code>, <code>max</code>, <code>step</code> and <code>value</code>, works with arrow keys, Page Up/Down, Home and End, and is announced by screen readers as a slider, all without any code.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the handles meet, or is there a minimum gap? | Decides the clamp rule: <code>lo &lt;= hi - minGap</code>. |
| Update results while dragging, or on release? | Live updates need cheap filtering or debouncing; on release uses the <code>change</code> event. |
| Linear scale, or logarithmic for prices from 1 to 10,000? | A log scale maps slider position to price through a function and changes the snapping. |
| Do we need typed input as well? | Typed input needs commit rules (Enter, blur) and validation. |
| Which browsers and devices? | Thumb styling uses vendor pseudo-elements; touch needs large thumbs. |

For this build: linear 0 to 1000, step 10, minimum gap 50, live updates, number boxes that commit on Enter or blur.

## 3. Requirements and Plan

**Build choice.** Two native range inputs, stacked on top of each other over one shared track, give keyboard support, the slider role and touch dragging for free. A custom slider built from <code>div</code>s and pointer events gives total control (vertical layout, custom snapping, a single focus stop) but you must rewrite keyboard handling and ARIA yourself. In a 45-minute round, the native approach plus a clear explanation of the custom one is usually the best trade.

📌 **Interview term: Thumb** — the draggable knob of a slider. Its look is set with the vendor pseudo-elements <code>::-webkit-slider-thumb</code> and <code>::-moz-range-thumb</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 280" role="img" aria-label="Layer stack of the slider: a track div at the bottom, a fill div above it positioned with left and right percentages, and two full-width range inputs on top whose tracks are transparent and ignore the pointer, so only their thumbs can be grabbed.">
  <rect class="d-box-muted" x="40" y="200" width="620" height="44" rx="8"/>
  <text class="d-text" x="350" y="227" text-anchor="middle">track div: the grey bar</text>
  <rect class="d-box" x="180" y="140" width="320" height="44" rx="8"/>
  <text class="d-text" x="340" y="167" text-anchor="middle">fill div: left 10%, right 30%</text>
  <rect class="d-box-accent" x="40" y="80" width="620" height="44" rx="8"/>
  <text class="d-text d-accent" x="350" y="107" text-anchor="middle">input range high: pointer-events none, thumb auto</text>
  <rect class="d-box-accent" x="40" y="20" width="620" height="44" rx="8"/>
  <text class="d-text d-accent" x="350" y="47" text-anchor="middle">input range low: z-index 3, or 4 in the right half</text>
</svg>

All four layers share the same box. The inputs are transparent and ignore the pointer, except for their thumbs, so a press lands on whichever thumb is under it; the fill div shows the selected range underneath.

**State model:**

| Piece | Owner | Kind |
| :--- | :--- | :--- |
| <code>[lo, hi]</code> | Parent (<code>App</code>) | <code>useState</code>, passed as <code>value</code> with <code>onChange</code> |
| Matching products | Parent | Derived with <code>filter</code> during render |
| Fill position, which thumb is on top | <code>DualRangeSlider</code> | Derived from <code>value</code> |
| Text being typed in a number box | <code>PriceBox</code> | <code>useState</code> draft, <code>null</code> when not editing |
| Snap, clamp, percent maths | <code>/src/range.js</code> | Pure functions |

## 4. Build It Step by Step

### 4.1 Pure helpers

~~~js
export const snap = (v, { min, max, step }) =>
  Math.min(
    max,
    Math.max(min, Math.round((v - min) / step) * step + min),
  );

// Move one end of [lo, hi] without letting the
// handles cross (keeps minGap between them).
export function moveLow([lo, hi], v, opts) {
  return [Math.min(snap(v, opts), hi - opts.minGap), hi];
}
export function moveHigh([lo, hi], v, opts) {
  return [lo, Math.max(snap(v, opts), lo + opts.minGap)];
}

export const percent = (v, { min, max }) =>
  ((v - min) / (max - min)) * 100;
~~~

<code>snap</code> rounds to the nearest step and keeps the value inside the track. <code>moveLow</code> and <code>moveHigh</code> each move one end and clamp it against the other end minus or plus the gap. Every input path (dragging, keys, typing) calls these two functions, so the "never cross" rule lives in exactly one place.

📌 **Interview term: Clamping** — forcing a number into an allowed range, here <code>Math.min(value, hi - minGap)</code> for the low end. Clamping is how you enforce an invariant without rejecting the user action entirely.

### 4.2 Two inputs over one track

~~~jsx
export default function DualRangeSlider({ value, onChange, min = 0, max = 1000, step = 10, minGap = 50 }) {
  const opts = { min, max, step, minGap };
  const [lo, hi] = value;
  // When the low handle is in the right
  // half, put it on top: if both handles
  // sit at the far right, the low one must stay grabbable.
  const lowOnTop = lo - min > (max - min) / 2;

  return (
    <div className="dual">
      <div className="slider-wrap">
        <div className="track" />
        <div className="fill" data-testid="fill" style={{ left: percent(lo, opts) + "%", right: 100 - percent(hi, opts) + "%" }} />
        <input
          type="range"
          className="thumb"
          data-testid="range-low"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label="Minimum price"
          aria-valuetext={"$" + lo}
          style={{ zIndex: lowOnTop ? 4 : 3 }}
          onChange={(e) => onChange(moveLow(value, Number(e.target.value), opts))}
        />
        {/* the high input is the same, with moveHigh and zIndex 3 */}
~~~

The fill div is positioned with <code>left</code> and <code>right</code> percentages from <code>percent()</code>, so no pixel measuring is needed and it scales with the container. The low input gets a higher <code>z-index</code> when it is in the right half of the track; section 5 shows why with a real-browser test.

The CSS that makes stacking work:

~~~css
.thumb {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 32px;
  margin: 0;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}
.thumb::-webkit-slider-runnable-track {
  background: none;
  height: 32px;
}
.thumb::-moz-range-track {
  background: none;
}
.thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 5px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #4f7cff;
  cursor: grab;
}
.thumb::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #4f7cff;
  cursor: grab;
}
~~~

Each input covers the whole track but has <code>pointer-events: none</code>, so it does not swallow clicks meant for the other one; the thumb pseudo-elements turn <code>pointer-events</code> back on. The side effect is that clicking the empty track does nothing, which the Chromium test confirms; for a price filter that is usually acceptable, and the number boxes cover precise input.

### 4.3 Clamping a controlled range input

When the user drags the low thumb past the high one, <code>moveLow</code> returns the same <code>lo</code> it had (it was already at <code>hi - minGap</code>). If the state does not change, what puts the thumb back? In React, a controlled input is restored to its <code>value</code> prop after every event, even when no state changed. The jsdom run shows it: the driver set the high input to 100, and it read back 520.

📌 **Interview term: Controlled input restore** — React re-applies a controlled input value after the event handler runs, so DOM edits that state did not accept are reverted. Vue and Angular do not do this automatically, which is why their versions of this widget need extra care. See [controlled vs uncontrolled](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components).

### 4.4 Number boxes with a draft

~~~jsx
export default function PriceBox({ label, value, onCommit, testId }) {
  // null = not editing, show the real value
  const [draft, setDraft] = useState(null);

  function commit() {
    if (
      draft !== null &&
      draft.trim() !== "" &&
      !Number.isNaN(Number(draft))
    )
      onCommit(Number(draft));
    setDraft(null);
  }

  return (
    <label className="price-box">
      <span>{label}</span>
      <span className="money">
        $
        <input
          type="number"
          inputMode="numeric"
          data-testid={testId}
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      </span>
    </label>
  );
}
~~~

If the box were wired straight to the range, typing "150" would pass through "1" and "15" and drag the low handle around (or clamp the high one against the low). The draft holds the text while editing; Enter or blur commits it through the same <code>moveLow</code>/<code>moveHigh</code>, which snap 467 to 470 and clamp 9999 to the allowed maximum.

📌 **Interview term: Draft state** — text being edited, kept apart from the committed value until a commit event.

### 4.5 The parent

~~~jsx
// [min, max] owned by the parent
const [range, setRange] = useState([100, 700]);
const matches = PRODUCTS.filter(
  (p) => p.price >= range[0] && p.price <= range[1],
); // derived, not state

return (
  <main className="page">
    <section className="card">
      <h1>Filter by price</h1>
      <DualRangeSlider value={range} onChange={setRange} min={0} max={1000} step={10} minGap={50} />
~~~

The product list is a constant in <code>/src/products.js</code> (no network); filtering 24 items on every input event is trivial. With thousands of items or a server request, you would debounce or update on the range <code>change</code> event, which fires when the user releases the thumb.

## 5. Verified

### 5.1 Values and clamping (jsdom)

Bundled with esbuild and mounted with <code>createRoot</code> in <code>StrictMode</code>. jsdom has no layout, so it cannot drag; the driver sets each input value with the native setter and fires <code>input</code>, exactly the events a drag produces, and types into the boxes:

~~~text
[react] RENDERED: Filter by priceMin$Max$17 of 24 products between $100 and $700
[react] mounted                        low: 100 high: 700 | boxes: 100 700 | fill left/right: 10% 30% | low z: 3 | 17 of 24 products between $100 and $700
[react] low -> 250                     low: 250 high: 700 | boxes: 250 700 | fill left/right: 25% 30% | low z: 3 | 12 of 24 products between $250 and $700
[react] high -> 520                    low: 250 high: 520 | boxes: 250 520 | fill left/right: 25% 48% | low z: 3 | 7 of 24 products between $250 and $520
[react] low -> 900 (tries to cross)    low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[react] high -> 100 (tries to cross)   low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[react] both pushed to the right end   low: 950 high: 1000 | boxes: 950 1000 | fill left/right: 95% 0% | low z: 4 | 1 of 24 products between $950 and $1000
[react] typing 1 in Max (no commit)    low: 0 high: 300 | boxes: 0 1 | fill left/right: 0% 70% | low z: 3 | 9 of 24 products between $0 and $300
[react] Max 467 + blur (snaps)         low: 0 high: 470 | boxes: 0 470 | fill left/right: 0% 53% | low z: 3 | 14 of 24 products between $0 and $470
[react] Min 9999 + Enter (clamps)      low: 420 high: 470 | boxes: 420 470 | fill left/right: 42% 53% | low z: 3 | 2 of 24 products between $420 and $470
[react] aria: Minimum price = $420 | Maximum price = $470
~~~

The low handle pushed to 900 stopped at 470 (high 520 minus the gap); the high handle pushed to 100 stayed at 520 and its DOM value was restored; both pushed right gave 950 and 1000 with the low input raised to z-index 4; typing "1" in Max changed nothing until the commit; 467 snapped to 470; 9999 typed in Min clamped to 420. No <code>console.error</code>.

### 5.2 Real pointer dragging (Chromium)

jsdom cannot press a thumb, so the solution was also bundled into a static page and opened in Chromium 141 through playwright-core at 360 px wide. The mouse was moved to each thumb position, pressed, moved in 12 steps and released; then the keyboard was used on the low thumb:

~~~text
[chromium react] start                              100 | 700 | 17 of 24 products between $100 and $700
[chromium react] drag low thumb 100 -> 300          300 | 700 | 11 of 24 products between $300 and $700
[chromium react] drag high thumb 700 -> 500         300 | 500 | 6 of 24 products between $300 and $500
[chromium react] drag low thumb 300 -> 900 (cross)  450 | 500 | 2 of 24 products between $450 and $500
[chromium react] drag high thumb to the end         450 | 1000 | 11 of 24 products between $450 and $1000
[chromium react] drag low thumb to the end          950 | 1000 | 1 of 24 products between $950 and $1000
[chromium react] drag the stacked thumbs left       200 | 1000 | 18 of 24 products between $200 and $1000
[chromium react] click empty track at 800           200 | 1000 | 18 of 24 products between $200 and $1000
[chromium react] low focused + ArrowRight           210 | 1000 | 18 of 24 products between $210 and $1000
[chromium react] End on the low thumb               950 | 1000 | 1 of 24 products between $950 and $1000
[chromium react] console errors: 0
~~~

Dragging worked for both thumbs, crossing was blocked during a real drag, the stacked thumbs at the right end could be pulled apart, a click on the empty track did nothing (the <code>pointer-events: none</code> trade-off), and native arrow and End keys respected the clamp. The Vue and Angular versions passed the same Chromium script with identical values.

**Why the z-index rule.** With a gap of 50 on this track the thumbs never fully overlap, so the rule is defensive here. With <code>minGap</code> set to 0, both thumbs can sit on exactly the same pixel. Modified copies with <code>minGap={0}</code>, with and without the rule, in Chromium:

~~~text
[chromium, minGap 0] with z-index swap     stacked at the right: 1000 | 1000 | after dragging the stack to 300: 300 | 1000
[chromium, minGap 0] without z-index swap  stacked at the right: 1000 | 1000 | after dragging the stack to 300: 1000 | 1000
~~~

Without the rule the high input is on top (it comes later in the DOM), the high thumb cannot move left past the low one, and the user is stuck. Raising the low input whenever it sits in the right half lets the stack be pulled apart.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Drag low past high | Clamped to <code>hi - minGap</code>; thumb restored |
| Both thumbs at one end | Low raised in the right half, so the stack can always be separated |
| Typed 467 | Snapped to 470 on commit |
| Typed 9999 or text | Clamped, or ignored when not a number |
| Click on the empty track | No effect (inputs ignore the pointer); use the boxes for precise values |
| Keyboard | Native arrows, Page Up/Down, Home, End on each thumb; clamped by the same handler |
| Screen reader | Each input has <code>aria-label</code> ("Minimum price") and <code>aria-valuetext</code> ("$420"); the result count is a polite live region |
| Small screens | Track and boxes use percentages and flex; checked at 360 px in Chromium |

## 7. Common Pitfalls

- **Forgetting <code>pointer-events: none</code> on the inputs.** The top input covers the bottom one and only one thumb can ever be grabbed.
- **No z-index rule.** With a zero gap, two thumbs at the right end become impossible to separate, as measured above.
- **Clamping only in one direction.** Both <code>moveLow</code> and <code>moveHigh</code> must clamp against the other end.
- **Number boxes wired straight to the range.** Every keystroke moves a handle; use a draft and commit on Enter or blur.
- **Measuring pixels for the fill.** Percentages from <code>(v - min) / (max - min)</code> scale for free.
- **Claiming drag works because jsdom passed.** jsdom has no layout or pointer hit testing; test dragging in a real browser.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Build choice:</strong> <span style="color:#f0e2c8;">"I stack two native range inputs on one track: I get keyboard, touch and the slider role for free. Inputs get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointer-events: none</code>, thumbs get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code>, so each thumb is grabbable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"The parent owns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[lo, hi]</code>. Pure helpers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">snap</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveLow</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveHigh</code> clamp each end against the other with a minimum gap, and every input path uses them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rendering:</strong> <span style="color:#f0e2c8;">"The fill is a div with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> percentages. The low input gets a higher z-index in the right half so stacked thumbs can always be separated."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typing:</strong> <span style="color:#f0e2c8;">"Number boxes keep a draft and commit on Enter or blur through the same helpers, so 467 snaps to 470 and 9999 clamps."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verification:</strong> <span style="color:#f0e2c8;">"jsdom checks values and clamping; real dragging needs a browser, so I ran the page in Chromium with a real mouse and checked crossing, stacking and keys."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you build a custom slider instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need a single focus stop with two handles, vertical or non-linear tracks, tick labels you can click, or pixel-perfect cross-browser styling. Then use pointer events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code>, map <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clientX</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect()</code>, and implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=slider</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuemin</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuemax</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuenow</code> and arrow keys yourself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the scale logarithmic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the range inputs linear from 0 to 1000 as positions, and convert with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">price = minPrice * (maxPrice / minPrice) ** (pos / 1000)</code> and its inverse with logarithms. Snapping and the gap then apply in price space after conversion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The results come from a server. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Update the visible numbers live, but fetch on the range <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code> event (release) or debounce the input events, and cancel stale requests with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> so a slow response cannot overwrite a newer one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test dragging automatically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With Playwright or Cypress in a real browser: find the thumb position from the input bounding box and the value, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouse.down</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouse.move</code> in steps and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouse.up</code>, and assert the input values, as in the Chromium run above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the empty track be clickable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: put a click handler on the track div, convert the click position to a value, and move whichever thumb is closer. Because the inputs ignore the pointer, the track below receives the click.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range input** | The native slider element, <code>input type="range"</code> |
| **Thumb** | The draggable knob of a slider |
| **Clamping** | Forcing a value into an allowed range |
| **Controlled input restore** | React putting a controlled input back to its prop after an event |
| **Draft state** | Typed text kept apart from the committed value |
| **Pointer events (CSS)** | <code>pointer-events: none</code> makes an element ignore the mouse and touch |

---
**Conclusion:** A dual range slider built from two stacked native range inputs gets keyboard, touch and screen-reader support for free; the work is in the rules between the handles. Pure <code>moveLow</code> and <code>moveHigh</code> helpers enforce the gap for every input path, the fill is pure percentages, a draft keeps the number boxes from jerking the handles, and a z-index rule keeps stacked thumbs separable. jsdom verified the values and clamping on React 19.3.1, and a real Chromium run with a real mouse verified the dragging, the crossing guard and the stacking fix, which jsdom alone could never prove.`,
        files: {
          "/App.js": `import { useState } from "react";
import DualRangeSlider from "./src/DualRangeSlider";
import { PRODUCTS } from "./src/products";

export default function App() {
  // [min, max] owned by the parent
  const [range, setRange] = useState([100, 700]);
  const matches = PRODUCTS.filter(
    (p) => p.price >= range[0] && p.price <= range[1],
  ); // derived, not state

  return (
    <main className="page">
      <section className="card">
        <h1>Filter by price</h1>
        <DualRangeSlider
          value={range}
          onChange={setRange}
          min={0}
          max={1000}
          step={10}
          minGap={50}
        />
        <p className="summary" data-testid="summary" aria-live="polite">
          {matches.length} of {PRODUCTS.length} products between \${range[0]} and
          \${range[1]}
        </p>
      </section>
    </main>
  );
}
`,
          "/src/DualRangeSlider.js": `import PriceBox from "./PriceBox";
import { moveHigh, moveLow, percent } from "./range";

export default function DualRangeSlider({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 10,
  minGap = 50,
}) {
  const opts = { min, max, step, minGap };
  const [lo, hi] = value;
  // When the low handle is in the right half, put it on top: if both handles
  // sit at the far right, the low one must stay grabbable.
  const lowOnTop = lo - min > (max - min) / 2;

  return (
    <div className="dual">
      <div className="slider-wrap">
        <div className="track" />
        <div
          className="fill"
          data-testid="fill"
          style={{
            left: percent(lo, opts) + "%",
            right: 100 - percent(hi, opts) + "%",
          }}
        />
        <input
          type="range"
          className="thumb"
          data-testid="range-low"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label="Minimum price"
          aria-valuetext={"$" + lo}
          style={{ zIndex: lowOnTop ? 4 : 3 }}
          onChange={(e) =>
            onChange(moveLow(value, Number(e.target.value), opts))
          }
        />
        <input
          type="range"
          className="thumb"
          data-testid="range-high"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label="Maximum price"
          aria-valuetext={"$" + hi}
          style={{ zIndex: 3 }}
          onChange={(e) =>
            onChange(moveHigh(value, Number(e.target.value), opts))
          }
        />
      </div>
      <div className="boxes">
        <PriceBox
          label="Min"
          testId="box-low"
          value={lo}
          onCommit={(v) => onChange(moveLow(value, v, opts))}
        />
        <PriceBox
          label="Max"
          testId="box-high"
          value={hi}
          onCommit={(v) => onChange(moveHigh(value, v, opts))}
        />
      </div>
    </div>
  );
}
`,
          "/src/PriceBox.js": `import { useState } from "react";

// A number box that only commits on Enter or blur, so typing "1" on the way
// to "150" does not shove the other handle around.
export default function PriceBox({ label, value, onCommit, testId }) {
  // null = not editing, show the real value
  const [draft, setDraft] = useState(null);

  function commit() {
    if (draft !== null && draft.trim() !== "" && !Number.isNaN(Number(draft)))
      onCommit(Number(draft));
    setDraft(null);
  }

  return (
    <label className="price-box">
      <span>{label}</span>
      <span className="money">
        $
        <input
          type="number"
          inputMode="numeric"
          data-testid={testId}
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      </span>
    </label>
  );
}
`,
          "/src/products.js": `// A fixed in-memory catalogue (no network): 24 products with prices in dollars.
export const PRODUCTS = [
  35, 60, 89, 120, 145, 180, 210, 249, 275, 310, 340, 399, 420, 455, 499, 530,
  575, 610, 640, 699, 750, 820, 899, 980,
].map((price, i) => ({ id: i + 1, name: "Product " + (i + 1), price }));
`,
          "/src/range.js": `// Pure helpers shared by both handles and both number boxes.
export const snap = (v, { min, max, step }) =>
  Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));

// Move one end of [lo, hi] without letting the
// handles cross (keeps minGap between them).
export function moveLow([lo, hi], v, opts) {
  return [Math.min(snap(v, opts), hi - opts.minGap), hi];
}
export function moveHigh([lo, hi], v, opts) {
  return [lo, Math.max(snap(v, opts), lo + opts.minGap)];
}

export const percent = (v, { min, max }) => ((v - min) / (max - min)) * 100;
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(440px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 18px;
}
.slider-wrap {
  position: relative;
  height: 32px;
}
.track,
.fill {
  position: absolute;
  top: 13px;
  height: 6px;
  border-radius: 3px;
}
.track {
  left: 0;
  right: 0;
  background: #2f3542;
}
.fill {
  background: #4f7cff;
}
/* Two native ranges stacked on one track. The inputs ignore the pointer;
   only their thumbs take it, so each thumb can be dragged on its own. */
.thumb {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 32px;
  margin: 0;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}
.thumb::-webkit-slider-runnable-track {
  background: none;
  height: 32px;
}
.thumb::-moz-range-track {
  background: none;
}
.thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 5px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #4f7cff;
  cursor: grab;
}
.thumb::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #4f7cff;
  cursor: grab;
}
.thumb:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.5);
}
.thumb:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.5);
}
.boxes {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}
.price-box {
  flex: 1;
  display: grid;
  gap: 4px;
  font-size: 0.8rem;
  color: #9aa3b2;
}
.money {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #3a4150;
  border-radius: 8px;
  background: #0f1115;
  color: #c5cbd6;
}
.money input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 1rem;
}
.summary {
  margin: 16px 0 0;
  color: #c5cbd6;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know <code>ref()</code>, props and events; the slider tricks are explained.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution. Outputs come from a jsdom run on Vue 3.5.44 and from Chromium 141, where a real mouse dragged the thumbs.

## 1. The Story

Two bookends on a shelf mark your budget: the left one where cheap books end, the right one where expensive ones start. They cannot pass through each other and need a little space between them. A **dual range slider** is that pair of bookends on a price scale.

📌 **Interview term: Range input** — the native slider, <code>&lt;input type="range"&gt;</code>, with built-in keyboard support and the slider role.

## 2. Requirements and the Vue State Model

Track 0 to 1000, step 10, minimum gap 50; two handles that never cross; a highlighted fill; two number boxes that commit on Enter or blur; keyboard support and spoken values; the parent owns <code>[lo, hi]</code> via <code>v-model</code> and filters a local product list.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| <code>[lo, hi]</code> | <code>defineModel({ type: Array })</code> in the slider | Parent writes <code>v-model="range"</code> |
| <code>lo</code>, <code>hi</code>, fill, which thumb on top | <code>computed</code> | Derived |
| Typed text | <code>ref(null)</code> draft in <code>PriceBox.vue</code> | Typing must not move the handles per keystroke |
| Matching products | <code>computed</code> in <code>App.vue</code> | Derived from the range |
| Snap and clamp | <code>/src/range.js</code> | Pure, shared with React and Angular |

The slider is two native range inputs stacked over one track div. The inputs have <code>pointer-events: none</code> and the thumb pseudo-elements turn it back on, so either thumb can be grabbed.

📌 **Interview term: Clamping** — forcing a value into the allowed range; here the low end is held at most at <code>hi - minGap</code>.

## 3. Build It Step by Step

### 3.1 Helpers

~~~js
export function moveLow([lo, hi], v, opts) {
  return [Math.min(snap(v, opts), hi - opts.minGap), hi];
}
~~~

<code>moveHigh</code> mirrors it. Dragging, keys and typed numbers all go through these two functions.

### 3.2 The model and the update rule

~~~vue
const range = defineModel({ type: Array, required: true }); // [lo, hi]
const opts = computed(() => ({ min: props.min, max: props.max, step:
props.step, minGap: props.minGap })); const lo = computed(() =>
range.value[0]); const hi = computed(() => range.value[1]); // When the
low handle is in the right half, put it on top: if both handles // sit
at the far right, the low one must stay grabbable. const lowOnTop =
computed(() => lo.value - props.min > (props.max - props.min) / 2); //
Always assign a NEW array, even when the clamp changed nothing: the
re-render // is what pulls a thumb that was dragged past the other one
back into place. function update(next) { range.value = next; }
~~~

The comment is the Vue-specific lesson of this widget. Suppose the user drags the high thumb down to 100 while the low end sits at 470. <code>moveHigh</code> clamps it back to 520, which is what <code>hi</code> already was. React would restore the input to its <code>value</code> prop on its own. Vue patches <code>:value</code> only when the component re-renders, and its <code>value</code> patch compares against the live DOM value, so a re-render fixes the thumb. Assigning a **new** array to the model always triggers that re-render, even when the numbers are equal. A copy with a tempting "optimisation" that skipped no-op updates printed:

~~~text
[vue] low -> 900 (tries to cross)    low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[vue] high -> 100 (tries to cross)   low: 470 high: 100 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
~~~

The high input was left at 100, visually crossed over the low one, while the model still said 520. The shipped code simply always assigns.

📌 **Interview term: One-way <code>:value</code>** — Vue sets the DOM value from state on render and never reads it back; if nothing re-renders, user edits that state rejected stay on screen.

### 3.3 The template

~~~vue
<div
  class="fill"
  data-testid="fill"
  :style="{ left: percent(lo, opts) + '%', right: 100 - percent(hi, opts) + '%' }"
/>
<input
  type="range"
  class="thumb"
  data-testid="range-low"
  :min="min"
  :max="max"
  :step="step"
  :value="lo"
  aria-label="Minimum price"
  :aria-valuetext="'$' + lo"
  :style="{ zIndex: lowOnTop ? 4 : 3 }"
  @input="update(moveLow(range, Number($event.target.value), opts))"
/>
<!-- the high input mirrors it with moveHigh -->
~~~

The fill uses <code>left</code> and <code>right</code> percentages. The low input gets <code>z-index</code> 4 when it is in the right half: if both thumbs end up at the right end, the low one must be on top to be dragged back. Chromium tests with a zero gap (below) show what happens without it.

### 3.4 Number boxes

~~~vue
const draft = ref(null); // null = not editing, show the real value
function commit() { const d = draft.value; if (d !== null &&
String(d).trim() !== "" && !Number.isNaN(Number(d))) emit("commit",
Number(d)); draft.value = null; }
~~~

The box shows <code>draft ?? value</code>. While typing, only the draft changes; Enter (<code>@keydown.enter</code>) or blur emits <code>commit</code>, and the slider snaps and clamps it.

📌 **Interview term: Draft state** — text being edited, kept apart from the committed value until a commit event.

## 4. Verified

### 4.1 jsdom

Compiled with <code>@vue/compiler-sfc</code> and mounted in jsdom. jsdom has no layout, so the driver sets input values and fires <code>input</code> (what a drag produces) and types into the boxes:

~~~text
[vue] RENDERED: Filter by priceMin $Max $17 of 24 products between $100 and $700
[vue] mounted                        low: 100 high: 700 | boxes: 100 700 | fill left/right: 10% 30% | low z: 3 | 17 of 24 products between $100 and $700
[vue] low -> 250                     low: 250 high: 700 | boxes: 250 700 | fill left/right: 25% 30% | low z: 3 | 12 of 24 products between $250 and $700
[vue] high -> 520                    low: 250 high: 520 | boxes: 250 520 | fill left/right: 25% 48% | low z: 3 | 7 of 24 products between $250 and $520
[vue] low -> 900 (tries to cross)    low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[vue] high -> 100 (tries to cross)   low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[vue] both pushed to the right end   low: 950 high: 1000 | boxes: 950 1000 | fill left/right: 95% 0% | low z: 4 | 1 of 24 products between $950 and $1000
[vue] typing 1 in Max (no commit)    low: 0 high: 300 | boxes: 0 1 | fill left/right: 0% 70% | low z: 3 | 9 of 24 products between $0 and $300
[vue] Max 467 + blur (snaps)         low: 0 high: 470 | boxes: 0 470 | fill left/right: 0% 53% | low z: 3 | 14 of 24 products between $0 and $470
[vue] Min 9999 + Enter (clamps)      low: 420 high: 470 | boxes: 420 470 | fill left/right: 42% 53% | low z: 3 | 2 of 24 products between $420 and $470
[vue] aria: Minimum price = $420 | Maximum price = $470
~~~

Crossing attempts were clamped to 470 and 520 and the DOM values matched; both thumbs at the right end raised the low input to z-index 4; typing "1" changed nothing until commit; 467 snapped to 470 and 9999 clamped to 420. No warnings.

### 4.2 Real dragging in Chromium

The same solution was bundled into a static page and driven in Chromium 141 with a real mouse (press, move in 12 steps, release) at 360 px wide:

~~~text
[chromium vue] start                              100 | 700 | 17 of 24 products between $100 and $700
[chromium vue] drag low thumb 100 -> 300          300 | 700 | 11 of 24 products between $300 and $700
[chromium vue] drag high thumb 700 -> 500         300 | 500 | 6 of 24 products between $300 and $500
[chromium vue] drag low thumb 300 -> 900 (cross)  450 | 500 | 2 of 24 products between $450 and $500
[chromium vue] drag high thumb to the end         450 | 1000 | 11 of 24 products between $450 and $1000
[chromium vue] drag low thumb to the end          950 | 1000 | 1 of 24 products between $950 and $1000
[chromium vue] drag the stacked thumbs left       200 | 1000 | 18 of 24 products between $200 and $1000
[chromium vue] click empty track at 800           200 | 1000 | 18 of 24 products between $200 and $1000
[chromium vue] low focused + ArrowRight           210 | 1000 | 18 of 24 products between $210 and $1000
[chromium vue] End on the low thumb               950 | 1000 | 1 of 24 products between $950 and $1000
[chromium vue] console errors: 0
~~~

Both thumbs dragged, crossing was blocked mid-drag, the thumbs at the right end separated, the empty track ignored clicks (the inputs have <code>pointer-events: none</code>), and arrow and End keys respected the clamp. The z-index rule was tested on copies of the React version with a zero gap; the rule is the same code here:

~~~text
[chromium, minGap 0] with z-index swap     stacked at the right: 1000 | 1000 | after dragging the stack to 300: 300 | 1000
[chromium, minGap 0] without z-index swap  stacked at the right: 1000 | 1000 | after dragging the stack to 300: 1000 | 1000
~~~

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Drag past the other thumb | Clamped; a new array re-renders and puts the thumb back |
| Both thumbs at one end | Low raised in the right half |
| Typed 467 / 9999 / text | Snapped / clamped / ignored |
| Keyboard | Native keys on each thumb |
| Screen reader | <code>aria-label</code> "Minimum price", <code>:aria-valuetext</code> "$420", live result count |

## 6. Common Pitfalls

- **Skipping "unchanged" updates.** The clamped thumb stays crossed, as shown above.
- **<code>v-model.number</code> straight on the number box.** Every keystroke becomes a value; use a draft.
- **No <code>pointer-events: none</code>.** Only the top input is grabbable.
- **Mutating the model array.** <code>range.value[0] = 300</code> emits nothing; assign a new array.
- **Trusting jsdom for dragging.** It has no hit testing; use a real browser.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Build:</strong> <span style="color:#f0e2c8;">"Two native range inputs over one track with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointer-events: none</code> on the inputs and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code> on the thumbs; a fill div with percentage <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"The slider has a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> array. Pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveLow</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveHigh</code> clamp each end against the other with a minimum gap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Vue detail:</strong> <span style="color:#f0e2c8;">"I always assign a new array, even when the clamp changed nothing, because that re-render is what pulls a crossed thumb back; Vue does not restore inputs on its own."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typing:</strong> <span style="color:#f0e2c8;">"PriceBox keeps a draft and emits on Enter or blur; the slider snaps and clamps."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verification:</strong> <span style="color:#f0e2c8;">"jsdom for values and clamping, and a real Chromium run with a mouse for dragging, crossing and the stacked-thumb z-index rule."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build a custom slider without native inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=slider</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuemin</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuemax</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-valuenow</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tabindex=0</code>, pointer handlers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getBoundingClientRect()</code> to map pixels to values, and arrow, Page and Home/End keys implemented by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you only filter on release?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listen to the range <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code> event, which fires when the thumb is released, and emit a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">commit</code> event the parent can use for expensive work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React not need the always-assign trick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React restores a controlled input to its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> prop after each event, even without a state change. Vue only touches the DOM on re-render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the scale logarithmic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the inputs linear as positions and map to prices with an exponential function and back with a logarithm; snap and clamp in price space.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range input** | The native slider element |
| **Thumb** | The draggable knob |
| **Clamping** | Forcing a value into the allowed range |
| **One-way <code>:value</code>** | Vue writes the DOM value on render and never reads it back |
| **Draft state** | Typed text kept apart until committed |

---
**Conclusion:** The Vue dual range slider is two stacked native range inputs, a <code>defineModel</code> array, pure clamp helpers and a draft for the number boxes. The Vue-specific trap is that a clamped thumb is only pulled back by a re-render, so the update must always assign a new array; a modified copy that skipped equal updates left the thumb crossed. jsdom on Vue 3.5.44 verified the values and a real Chromium mouse verified the dragging.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, ref } from "vue";
import DualRangeSlider from "./components/DualRangeSlider.vue";
import { PRODUCTS } from "./products.js";

const range = ref([100, 700]); // [min, max] owned by the parent
const matches = computed(() =>
  PRODUCTS.filter(
    (p) => p.price >= range.value[0] && p.price <= range.value[1],
  ),
);
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>Filter by price</h1>
      <DualRangeSlider
        v-model="range"
        :min="0"
        :max="1000"
        :step="10"
        :min-gap="50"
      />
      <p class="summary" data-testid="summary" aria-live="polite">
        {{ matches.length }} of {{ PRODUCTS.length }} products between \${{
          range[0]
        }}
        and \${{ range[1] }}
      </p>
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  width: min(440px, 100%);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 14px;
  padding: 20px;
  box-sizing: border-box;
}
h1 {
  font-size: 1.25rem;
  margin: 0 0 18px;
}
.summary {
  margin: 16px 0 0;
  color: #c5cbd6;
}
</style>
`,
          "/src/components/DualRangeSlider.vue": `<script setup>
import { computed } from "vue";
import PriceBox from "./PriceBox.vue";
import { moveHigh, moveLow, percent } from "../range.js";

const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1000 },
  step: { type: Number, default: 10 },
  minGap: { type: Number, default: 50 },
});
const range = defineModel({ type: Array, required: true }); // [lo, hi]

const opts = computed(() => ({
  min: props.min,
  max: props.max,
  step: props.step,
  minGap: props.minGap,
}));
const lo = computed(() => range.value[0]);
const hi = computed(() => range.value[1]);
// When the low handle is in the right half, put it on top: if both handles
// sit at the far right, the low one must stay grabbable.
const lowOnTop = computed(
  () => lo.value - props.min > (props.max - props.min) / 2,
);

// Always assign a NEW array, even when the clamp changed nothing: the re-render
// is what pulls a thumb that was dragged past the other one back into place.
function update(next) {
  range.value = next;
}
</script>

<template>
  <div class="dual">
    <div class="slider-wrap">
      <div class="track" />
      <div
        class="fill"
        data-testid="fill"
        :style="{ left: percent(lo, opts) + '%', right: 100 - percent(hi, opts) + '%' }"
      />
      <input
        type="range"
        class="thumb"
        data-testid="range-low"
        :min="min"
        :max="max"
        :step="step"
        :value="lo"
        aria-label="Minimum price"
        :aria-valuetext="'$' + lo"
        :style="{ zIndex: lowOnTop ? 4 : 3 }"
        @input="update(moveLow(range, Number($event.target.value), opts))"
      />
      <input
        type="range"
        class="thumb"
        data-testid="range-high"
        :min="min"
        :max="max"
        :step="step"
        :value="hi"
        aria-label="Maximum price"
        :aria-valuetext="'$' + hi"
        :style="{ zIndex: 3 }"
        @input="update(moveHigh(range, Number($event.target.value), opts))"
      />
    </div>
    <div class="boxes">
      <PriceBox
        label="Min"
        test-id="box-low"
        :value="lo"
        @commit="update(moveLow(range, $event, opts))"
      />
      <PriceBox
        label="Max"
        test-id="box-high"
        :value="hi"
        @commit="update(moveHigh(range, $event, opts))"
      />
    </div>
  </div>
</template>

<style scoped>
.slider-wrap {
  position: relative;
  height: 32px;
}
.track,
.fill {
  position: absolute;
  top: 13px;
  height: 6px;
  border-radius: 3px;
}
.track {
  left: 0;
  right: 0;
  background: #2f3542;
}
.fill {
  background: #4f7cff;
}
/* Two native ranges stacked on one track. The inputs ignore the pointer;
   only their thumbs take it, so each thumb can be dragged on its own. */
.thumb {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 32px;
  margin: 0;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}
.thumb::-webkit-slider-runnable-track {
  background: none;
  height: 32px;
}
.thumb::-moz-range-track {
  background: none;
}
.thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: auto;
  width: 22px;
  height: 22px;
  margin-top: 5px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #4f7cff;
  cursor: grab;
}
.thumb::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #4f7cff;
  cursor: grab;
}
.thumb:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.5);
}
.thumb:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.5);
}
.boxes {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}
</style>
`,
          "/src/components/PriceBox.vue": `<script setup>
import { ref } from "vue";

// A number box that only commits on Enter or blur, so typing "1" on the way
// to "150" does not shove the other handle around.
const props = defineProps({ label: String, value: Number, testId: String });
const emit = defineEmits(["commit"]);
const draft = ref(null); // null = not editing, show the real value

function commit() {
  const d = draft.value;
  if (d !== null && String(d).trim() !== "" && !Number.isNaN(Number(d)))
    emit("commit", Number(d));
  draft.value = null;
}
</script>

<template>
  <label class="price-box">
    <span>{{ label }}</span>
    <span class="money">
      $<input
        type="number"
        inputmode="numeric"
        :data-testid="testId"
        :value="draft ?? value"
        @input="draft = $event.target.value"
        @blur="commit"
        @keydown.enter="commit"
      />
    </span>
  </label>
</template>

<style scoped>
.price-box {
  flex: 1;
  display: grid;
  gap: 4px;
  font-size: 0.8rem;
  color: #9aa3b2;
}
.money {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #3a4150;
  border-radius: 8px;
  background: #0f1115;
  color: #c5cbd6;
}
.money input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 1rem;
}
</style>
`,
          "/src/products.js": `// A fixed in-memory catalogue (no network): 24 products with prices in dollars.
export const PRODUCTS = [
  35, 60, 89, 120, 145, 180, 210, 249, 275, 310, 340, 399, 420, 455, 499, 530,
  575, 610, 640, 699, 750, 820, 899, 980,
].map((price, i) => ({ id: i + 1, name: "Product " + (i + 1), price }));
`,
          "/src/range.js": `// Pure helpers shared by both handles and both number boxes.
export const snap = (v, { min, max, step }) =>
  Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));

// Move one end of [lo, hi] without letting the
// handles cross (keeps minGap between them).
export function moveLow([lo, hi], v, opts) {
  return [Math.min(snap(v, opts), hi - opts.minGap), hi];
}
export function moveHigh([lo, hi], v, opts) {
  return [lo, Math.max(snap(v, opts), lo + opts.minGap)];
}

export const percent = (v, { min, max }) => ((v - min) / (max - min)) * 100;
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know components, inputs and outputs; signals and the slider tricks are explained.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution. Outputs come from Angular 22.2.3 in jsdom (AOT strict and runtime JIT) and from Chromium 141, where a real mouse dragged the thumbs.

## 1. The Story

Two bookends mark a budget on a shelf of books sorted by price. They cannot pass through each other and need some space between them. A **dual range slider** is those bookends on a price track, the filter on every shopping site.

📌 **Interview term: Range input** — <code>&lt;input type="range"&gt;</code>, the native slider with keyboard support and the slider role built in.

## 2. Requirements and the Angular State Model

Track 0 to 1000, step 10, minimum gap 50; handles never cross; highlighted fill; number boxes that commit on Enter or blur; keyboard and spoken values; the parent owns <code>[lo, hi]</code> with <code>[(value)]</code> and filters a local product list.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>[lo, hi]</code> | <code>@Input() set value()</code> into a <code>signal</code>, <code>@Output() valueChange</code> | <code>[(value)]</code> with a signal in the parent |
| <code>lo</code>, <code>hi</code>, which thumb on top | <code>computed()</code> | Derived |
| Typed text | <code>signal&lt;string &#124; null&gt;</code> draft in <code>PriceBoxComponent</code> | Typing must not move handles per keystroke |
| Matching products | <code>computed()</code> in <code>AppComponent</code> | Derived |
| Snap and clamp | <code>range.ts</code> | Pure, shared with React and Vue |

Two native range inputs are stacked over a track div; they have <code>pointer-events: none</code> and their thumbs <code>auto</code>, so either thumb can be grabbed and the fill div shows through.

📌 **Interview term: Clamping** — forcing a value into the allowed range, here <code>lo &lt;= hi - minGap</code>.

## 3. Build It Step by Step

### 3.1 Helpers

~~~ts
export function moveLow(
  [lo, hi]: Range,
  v: number,
  opts: RangeOpts,
): Range {
  return [Math.min(snap(v, opts), hi - opts.minGap), hi];
}
~~~

### 3.2 The update method and the DOM write-back

~~~ts
update(next: Range, el?: HTMLInputElement, end?: 0 | 1): void {
  this.range.set(next);
  this.valueChange.emit(next);
  // [value] is only re-applied when the
  // bound value changes. After a clamp
  // that leaves lo() or hi() unchanged,
  // the thumb would stay where it was
  // dragged, past the other one. Put it back by hand.
  if (el && end !== undefined) el.value = String(next[end]);
}
~~~

Angular re-applies <code>[value]="hi()"</code> only when <code>hi()</code> changes. Drag the high thumb down to 100 while the low end is at 470: <code>moveHigh</code> clamps to 520, which <code>hi()</code> already was, so the binding is unchanged and Angular leaves the DOM alone. A copy without the last line printed:

~~~text
[angular:playground] low -> 900 (tries to cross)    low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[angular:playground] high -> 100 (tries to cross)   low: 470 high: 100 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[angular:playground] both pushed to the right end   low: 950 high: 1000 | boxes: 950 1000 | fill left/right: 95% 0% | low z: 4 | 1 of 24 products between $950 and $1000
~~~

The high input stayed at 100, drawn on the wrong side of the low thumb, while the signal said 520. Writing <code>el.value</code> back fixes it. (React restores controlled inputs by itself; Vue repairs them on any re-render; Angular needs the explicit write.)

### 3.3 The template

~~~ts
<div
  class="fill"
  data-testid="fill"
  [style.left.%]="pct(lo())"
  [style.right.%]="100 - pct(hi())"
></div>
<input
  #low
  type="range"
  class="thumb"
  data-testid="range-low"
  [min]="min"
  [max]="max"
  [step]="step"
  [value]="lo()"
  aria-label="Minimum price"
  [attr.aria-valuetext]="'$' + lo()"
  [style.z-index]="lowOnTop() ? 4 : 3"
  (input)="update(moveLow(range(), +low.value, opts), low, 0)"
/>
~~~

<code>#low</code> passes the element itself to <code>update</code>; <code>+low.value</code> converts the string. <code>[style.left.%]</code> and <code>[style.right.%]</code> place the fill. The low input gets <code>z-index</code> 4 in the right half of the track so stacked thumbs at the right end can be pulled apart (tested in Chromium below). <code>[max]</code> is bound before <code>[value]</code> on purpose: a range input clamps its value to the max it has at that moment.

📌 **Interview term: Template reference variable** — <code>#low</code> names the element so the template can pass it to a method. See [template reference variables](/interview-question/what-are-template-reference-variables).

### 3.4 Number boxes

~~~ts
// null = not editing, show the real value
readonly draft = signal<string | null>(null);

commit(box: HTMLInputElement): void {
  const d = this.draft();
  if (d !== null && d.trim() !== "" && !Number.isNaN(Number(d)))
    this.committed.emit(Number(d));
  this.draft.set(null);
  // the binding may not change (e.g. a clamp back to the same value)
  box.value = String(this.value);
}
~~~

The box shows <code>draft() ?? value</code>; <code>(keydown.enter)</code> and <code>(blur)</code> commit. The output is named <code>committed</code> rather than <code>commit</code> so it does not collide with the method of the same name. The write-back at the end matters when a commit clamps to the value that was already there.

📌 **Interview term: Draft state** — text being edited, kept apart from the committed value.

## 4. Verified

### 4.1 jsdom (AOT and JIT)

Compiled with <code>ngc</code> and <code>strictTemplates</code> (<code>angular:app</code>) and with runtime JIT (<code>angular:playground</code>). jsdom has no layout, so the driver sets input values and fires <code>input</code>, the same events a drag produces. AOT output; JIT printed the same lines:

~~~text
[angular:app] RENDERED: Filter by priceMin $Max $ 17 of 24 products between $100 and $700
[angular:app] mounted                        low: 100 high: 700 | boxes: 100 700 | fill left/right: 10% 30% | low z: 3 | 17 of 24 products between $100 and $700
[angular:app] low -> 250                     low: 250 high: 700 | boxes: 250 700 | fill left/right: 25% 30% | low z: 3 | 12 of 24 products between $250 and $700
[angular:app] high -> 520                    low: 250 high: 520 | boxes: 250 520 | fill left/right: 25% 48% | low z: 3 | 7 of 24 products between $250 and $520
[angular:app] low -> 900 (tries to cross)    low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[angular:app] high -> 100 (tries to cross)   low: 470 high: 520 | boxes: 470 520 | fill left/right: 47% 48% | low z: 3 | 1 of 24 products between $470 and $520
[angular:app] both pushed to the right end   low: 950 high: 1000 | boxes: 950 1000 | fill left/right: 95% 0% | low z: 4 | 1 of 24 products between $950 and $1000
[angular:app] typing 1 in Max (no commit)    low: 0 high: 300 | boxes: 0 1 | fill left/right: 0% 70% | low z: 3 | 9 of 24 products between $0 and $300
[angular:app] Max 467 + blur (snaps)         low: 0 high: 470 | boxes: 0 470 | fill left/right: 0% 53% | low z: 3 | 14 of 24 products between $0 and $470
[angular:app] Min 9999 + Enter (clamps)      low: 420 high: 470 | boxes: 420 470 | fill left/right: 42% 53% | low z: 3 | 2 of 24 products between $420 and $470
[angular:app] aria: Minimum price = $420 | Maximum price = $470
~~~

Crossing attempts clamped to 470 and 520 with matching DOM values; both thumbs at the right raised the low input; typing "1" did nothing until commit; 467 snapped to 470; 9999 clamped to 420. No <code>console.error</code>.

### 4.2 Real dragging in Chromium

Bundled into a static page (runtime JIT) and driven in Chromium 141 with a real mouse, at 360 px wide:

~~~text
[chromium angular] start                              100 | 700 | 17 of 24 products between $100 and $700
[chromium angular] drag low thumb 100 -> 300          300 | 700 | 11 of 24 products between $300 and $700
[chromium angular] drag high thumb 700 -> 500         300 | 500 | 6 of 24 products between $300 and $500
[chromium angular] drag low thumb 300 -> 900 (cross)  450 | 500 | 2 of 24 products between $450 and $500
[chromium angular] drag high thumb to the end         450 | 1000 | 11 of 24 products between $450 and $1000
[chromium angular] drag low thumb to the end          950 | 1000 | 1 of 24 products between $950 and $1000
[chromium angular] drag the stacked thumbs left       200 | 1000 | 18 of 24 products between $200 and $1000
[chromium angular] click empty track at 800           200 | 1000 | 18 of 24 products between $200 and $1000
[chromium angular] low focused + ArrowRight           210 | 1000 | 18 of 24 products between $210 and $1000
[chromium angular] End on the low thumb               950 | 1000 | 1 of 24 products between $950 and $1000
[chromium angular] console errors: 0
~~~

Dragging, the crossing guard, separating the stacked thumbs, the inert empty track and native keys all behaved as in React and Vue. One detail: reading the DOM in the same instant as a key press once showed the old count, because Angular schedules its render asynchronously after the event; the script waits 60 ms before reading, which is still far below what a person can notice. The z-index rule was checked on React copies with a zero gap; it is the same rule here:

~~~text
[chromium, minGap 0] with z-index swap     stacked at the right: 1000 | 1000 | after dragging the stack to 300: 300 | 1000
[chromium, minGap 0] without z-index swap  stacked at the right: 1000 | 1000 | after dragging the stack to 300: 1000 | 1000
~~~

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Drag past the other thumb | Clamped, DOM value written back |
| Both thumbs at one end | Low raised in the right half |
| Typed 467 / 9999 / text | Snapped / clamped / ignored |
| Keyboard | Native keys on each thumb |
| Screen reader | <code>aria-label</code> per input, <code>[attr.aria-valuetext]</code> "$420", live result count |

## 6. Common Pitfalls

- **Relying on <code>[value]</code> to undo a clamp.** Angular compares with the last bound value; write the DOM back.
- **<code>[value]</code> before <code>[max]</code>.** The browser clamps to the old max (100 by default).
- **An output named like a method.** <code>@Output() commit</code> plus a <code>commit()</code> method collide; pick distinct names.
- **Plain fields in a zoneless app.** Use signals so updates render.
- **Testing drag only in jsdom.** It has no hit testing; use a real browser.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Build:</strong> <span style="color:#f0e2c8;">"Two native range inputs stacked over a track, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointer-events: none</code> on the inputs and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code> on the thumbs, and a fill div placed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[style.left.%]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[style.right.%]</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> setter feeds a signal and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code> reports, so the parent uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>. Pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveLow</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveHigh</code> clamp with a minimum gap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Angular detail:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]</code> only re-applies when the bound value changes, so after a clamp to the same value I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.value</code> back through the template reference."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typing:</strong> <span style="color:#f0e2c8;">"PriceBox keeps a draft signal and emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">committed</code> on Enter or blur; the slider snaps and clamps."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verification:</strong> <span style="color:#f0e2c8;">"jsdom in AOT and JIT for values, plus Chromium with a real mouse for dragging, crossing and the z-index rule."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you integrate it with reactive forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[number, number]</code> value: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> sets the signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> stores the callback called from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> disables both inputs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you fetch results only on release?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(change)</code> on each range input, which fires on release, and emit a separate event; or pipe the outputs through RxJS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> so stale requests are cancelled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you build a custom slider?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a single focus stop, vertical or non-linear tracks, or full styling control: divs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=slider</code> and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-value*</code> attributes, pointer events with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPointerCapture</code>, and keyboard handling written by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does React not need the write-back?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React restores a controlled input to its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> prop after every event. Angular and Vue only write the DOM when they render a changed binding.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range input** | The native slider element |
| **Clamping** | Forcing a value into the allowed range |
| **Template reference variable** | <code>#name</code> handle to an element |
| **Draft state** | Typed text kept apart until committed |
| **Zoneless** | Angular rendering driven by signals, not by patched browser APIs |

---
**Conclusion:** The Angular dual range slider stacks two native range inputs, keeps <code>[lo, hi]</code> in a signal fed by an input setter, and clamps every change through pure helpers. The Angular-specific trap, a clamped thumb left crossed because <code>[value]</code> did not change, was reproduced with a modified copy and fixed with a write-back through <code>#low</code>/<code>#high</code>. jsdom (AOT and JIT on Angular 22.2.3) verified the values, and a real Chromium mouse verified the dragging.`,
        files: {
          "/src/app/app.component.ts": `import { DOCUMENT } from "@angular/common";
import { Component, computed, signal, inject } from "@angular/core";
import { DualRangeSliderComponent } from "./dual-range-slider.component";
import { PRODUCTS } from "./products";
import { Range } from "./range";

@Component({
  selector: "app-root",
  imports: [DualRangeSliderComponent],
  template: \`
    <main class="page">
      <section class="card">
        <h1>Filter by price</h1>
        <app-dual-range-slider
          [(value)]="range"
          [min]="0"
          [max]="1000"
          [step]="10"
          [minGap]="50"
        />
        <p class="summary" data-testid="summary" aria-live="polite">
          {{ matches().length }} of {{ total }} products between \\\${{
            range()[0]
          }}
          and \\\${{ range()[1] }}
        </p>
      </section>
    </main>
  \`,
  styles: [
    \`
      :host {
        display: block;
        background: #0f1115;
        color: #e6e6e6;
        font-family: system-ui, sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .card {
        width: min(440px, 100%);
        background: #181b22;
        border: 1px solid #2a2f3a;
        border-radius: 14px;
        padding: 20px;
        box-sizing: border-box;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 18px;
      }
      .summary {
        margin: 16px 0 0;
        color: #c5cbd6;
      }
    \`,
  ],
})
export class AppComponent {
  constructor() {
    // The playground page has a default white
    // body margin; make the whole page dark.
    inject(DOCUMENT).body.style.cssText = "margin: 0; background: #0f1115;";
  }

  readonly range = signal<Range>([100, 700]); // [min, max] owned by the parent
  readonly total = PRODUCTS.length;
  readonly matches = computed(() =>
    PRODUCTS.filter(
      (p) => p.price >= this.range()[0] && p.price <= this.range()[1],
    ),
  );
}
`,
          "/src/app/dual-range-slider.component.ts": `import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from "@angular/core";
import { PriceBoxComponent } from "./price-box.component";
import { Range, RangeOpts, moveHigh, moveLow, percent } from "./range";

@Component({
  selector: "app-dual-range-slider",
  imports: [PriceBoxComponent],
  template: \`
    <div class="slider-wrap">
      <div class="track"></div>
      <div
        class="fill"
        data-testid="fill"
        [style.left.%]="pct(lo())"
        [style.right.%]="100 - pct(hi())"
      ></div>
      <input
        #low
        type="range"
        class="thumb"
        data-testid="range-low"
        [min]="min"
        [max]="max"
        [step]="step"
        [value]="lo()"
        aria-label="Minimum price"
        [attr.aria-valuetext]="'$' + lo()"
        [style.z-index]="lowOnTop() ? 4 : 3"
        (input)="update(moveLow(range(), +low.value, opts), low, 0)"
      />
      <input
        #high
        type="range"
        class="thumb"
        data-testid="range-high"
        [min]="min"
        [max]="max"
        [step]="step"
        [value]="hi()"
        aria-label="Maximum price"
        [attr.aria-valuetext]="'$' + hi()"
        [style.z-index]="3"
        (input)="update(moveHigh(range(), +high.value, opts), high, 1)"
      />
    </div>
    <div class="boxes">
      <app-price-box
        label="Min"
        testId="box-low"
        [value]="lo()"
        (committed)="update(moveLow(range(), $event, opts))"
      />
      <app-price-box
        label="Max"
        testId="box-high"
        [value]="hi()"
        (committed)="update(moveHigh(range(), $event, opts))"
      />
    </div>
  \`,
  styles: [
    \`
      .slider-wrap {
        position: relative;
        height: 32px;
      }
      .track,
      .fill {
        position: absolute;
        top: 13px;
        height: 6px;
        border-radius: 3px;
      }
      .track {
        left: 0;
        right: 0;
        background: #2f3542;
      }
      .fill {
        background: #4f7cff;
      }
      /* Two native ranges stacked on one track. The inputs ignore the pointer;
       only their thumbs take it, so each thumb can be dragged on its own. */
      .thumb {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 32px;
        margin: 0;
        background: none;
        pointer-events: none;
        -webkit-appearance: none;
        appearance: none;
      }
      .thumb::-webkit-slider-runnable-track {
        background: none;
        height: 32px;
      }
      .thumb::-moz-range-track {
        background: none;
      }
      .thumb::-webkit-slider-thumb {
        -webkit-appearance: none;
        pointer-events: auto;
        width: 22px;
        height: 22px;
        margin-top: 5px;
        border-radius: 50%;
        background: #fff;
        border: 3px solid #4f7cff;
        cursor: grab;
      }
      .thumb::-moz-range-thumb {
        pointer-events: auto;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        border: 3px solid #4f7cff;
        cursor: grab;
      }
      .thumb:focus-visible::-webkit-slider-thumb {
        box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.5);
      }
      .thumb:focus-visible::-moz-range-thumb {
        box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.5);
      }
      .boxes {
        display: flex;
        gap: 12px;
        margin-top: 14px;
      }
    \`,
  ],
})
export class DualRangeSliderComponent {
  // value + valueChange gives the parent [(value)] two-way binding.
  @Input() set value(v: Range) {
    this.range.set(v);
  }
  @Output() valueChange = new EventEmitter<Range>();
  @Input() min = 0;
  @Input() max = 1000;
  @Input() step = 10;
  @Input() minGap = 50;

  readonly moveLow = moveLow;
  readonly moveHigh = moveHigh;
  readonly range = signal<Range>([0, 0]);
  readonly lo = computed(() => this.range()[0]);
  readonly hi = computed(() => this.range()[1]);
  // When the low handle is in the right half, put it on top: if both handles
  // sit at the far right, the low one must stay grabbable.
  readonly lowOnTop = computed(
    () => this.lo() - this.min > (this.max - this.min) / 2,
  );

  get opts(): RangeOpts {
    return {
      min: this.min,
      max: this.max,
      step: this.step,
      minGap: this.minGap,
    };
  }
  pct(v: number): number {
    return percent(v, this.opts);
  }

  update(next: Range, el?: HTMLInputElement, end?: 0 | 1): void {
    this.range.set(next);
    this.valueChange.emit(next);
    // [value] is only re-applied when the bound value changes. After a clamp
    // that leaves lo() or hi() unchanged, the thumb would stay where it was
    // dragged, past the other one. Put it back by hand.
    if (el && end !== undefined) el.value = String(next[end]);
  }
}
`,
          "/src/app/price-box.component.ts": `import { Component, EventEmitter, Input, Output, signal } from "@angular/core";

// A number box that only commits on Enter or blur, so typing "1" on the way
// to "150" does not shove the other handle around.
@Component({
  selector: "app-price-box",
  template: \`
    <label class="price-box">
      <span>{{ label }}</span>
      <span class="money">
        $<input
          #box
          type="number"
          inputmode="numeric"
          [attr.data-testid]="testId"
          [value]="draft() ?? value"
          (input)="draft.set(box.value)"
          (blur)="commit(box)"
          (keydown.enter)="commit(box)"
        />
      </span>
    </label>
  \`,
  styles: [
    \`
      :host {
        flex: 1;
      }
      .price-box {
        display: grid;
        gap: 4px;
        font-size: 0.8rem;
        color: #9aa3b2;
      }
      .money {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 8px;
        border: 1px solid #3a4150;
        border-radius: 8px;
        background: #0f1115;
        color: #c5cbd6;
      }
      .money input {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: #fff;
        font-size: 1rem;
      }
    \`,
  ],
})
export class PriceBoxComponent {
  @Input() label = "";
  @Input() value = 0;
  @Input() testId = "";
  @Output() committed = new EventEmitter<number>();
  // null = not editing, show the real value
  readonly draft = signal<string | null>(null);

  commit(box: HTMLInputElement): void {
    const d = this.draft();
    if (d !== null && d.trim() !== "" && !Number.isNaN(Number(d)))
      this.committed.emit(Number(d));
    this.draft.set(null);
    // the binding may not change (e.g. a clamp back to the same value)
    box.value = String(this.value);
  }
}
`,
          "/src/app/products.ts": `// A fixed in-memory catalogue (no network): 24 products with prices in dollars.
export const PRODUCTS: { id: number; name: string; price: number }[] = [
  35, 60, 89, 120, 145, 180, 210, 249, 275, 310, 340, 399, 420, 455, 499, 530,
  575, 610, 640, 699, 750, 820, 899, 980,
].map((price, i) => ({ id: i + 1, name: "Product " + (i + 1), price }));
`,
          "/src/app/range.ts": `// Pure helpers shared by both handles and both number boxes.
export interface RangeOpts {
  min: number;
  max: number;
  step: number;
  minGap: number;
}
export type Range = [number, number];

export const snap = (v: number, { min, max, step }: RangeOpts): number =>
  Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));

// Move one end of [lo, hi] without letting the
// handles cross (keeps minGap between them).
export function moveLow([lo, hi]: Range, v: number, opts: RangeOpts): Range {
  return [Math.min(snap(v, opts), hi - opts.minGap), hi];
}
export function moveHigh([lo, hi]: Range, v: number, opts: RangeOpts): Range {
  return [lo, Math.max(snap(v, opts), lo + opts.minGap)];
}

export const percent = (v: number, { min, max }: RangeOpts): number =>
  ((v - min) / (max - min)) * 100;
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Calculator",
    seoDescription:
      "Build a calculator in React, Vue and Angular without eval: a tokenizer, a precedence-aware parser, a pure key reducer and clean 0.1 + 0.2 display.",
    description: `**Question presented to candidate:**
"Build a basic calculator like the one on a phone: digits, a decimal point, plus, minus, times, divide, equals, clear and backspace. It should respect operator precedence, so 12 + 3 × 4 is 24, and it must not use \`eval\`. Make the keyboard work too."

**Requirements:**
- Buttons for 0 to 9, \`.\`, \`+ − × ÷\`, \`=\`, AC (clear all) and ⌫ (backspace); the display shows the expression as it is typed.
- \`=\` evaluates with normal precedence (× and ÷ before + and −), without \`eval\` or \`new Function\`.
- Pressing an operator right after another replaces it; a number can have only one decimal point; leading zeros are dropped; a leading minus makes a negative number.
- After \`=\`, an operator continues from the result and a digit starts a new calculation.
- Division by zero shows an error; the next key starts over.
- Results display cleanly: 0.1 + 0.2 shows 0.3.
- Physical keyboard support: digits, operators, Enter, Backspace, Escape.

**What a strong answer should cover:**
- Separating the pure logic (a key-press reducer, a tokenizer, a parser) from the UI.
- Why \`eval\` is unsafe and how a small recursive-descent parser (or shunting-yard) handles precedence.
- Floating-point representation (\`0.1 + 0.2 === 0.30000000000000004\`) and rounding for display, plus overflow and tiny numbers.
- The input state machine: what each key does after a result, after an error, after an operator.
- Keyboard handling with a window listener that is cleaned up, and \`preventDefault\` so Enter does not also click a focused button.
- Accessibility: named operator buttons, a live display.

**Clarifying questions expected:**
- "Immediate execution like a basic pocket calculator (12 + 3 × 4 = 60), or precedence like a phone (24)?"
- "Do we need parentheses, percent or memory keys?"
- "How many digits can the display show?"

**Code / implementation expected:** Yes. A working calculator with a separate, testable evaluator that does not use \`eval\`.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know React components and <code>useState</code>; parsing is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Code excerpts come from the runnable solution; the outputs were printed by running it in Node 22, in React 19.3.1 under jsdom, and in Chromium 141.

## 1. Why This Even Matters — A Story First

A shop assistant adds up your basket on a notepad: "12 plus 3 times 4". A careful assistant knows multiplication comes first and writes 24. A hurried one goes left to right and writes 60. And if you ask "what is 7 divided by nothing?", a good assistant says "that does not work" rather than writing infinity.

A **calculator** app is that notepad. It looks like the easiest machine coding question, and that is the trap: a candidate wires buttons to a string and calls <code>eval()</code> on it, and the interviewer immediately asks why that is dangerous and how to do it without. The real question is about three separate pieces: an **input state machine** (what each key does in each situation), an **evaluator** that understands precedence, and **number formatting** that survives floating point.

📌 **Interview term: Operator precedence** — the rule that some operators bind tighter than others: <code>×</code> and <code>÷</code> are applied before <code>+</code> and <code>−</code>, so <code>12 + 3 × 4</code> is 24, not 60.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Precedence like a phone (24), or immediate execution like a pocket calculator (60)? | They are two different evaluators. Immediate execution keeps a running total; precedence needs a parser. |
| Parentheses, percent, memory, unary minus? | Each adds grammar rules; parentheses mean a recursive grammar. |
| What happens after <code>=</code> when the user types a digit or an operator? | Defines the state machine. |
| How many digits fit the display? | Decides input limits and when to show an overflow error. |
| Keyboard support? | Adds a global key listener and the Enter-on-a-focused-button issue. |

For this build: precedence, no parentheses, a leading minus allowed, operator continues from a result and a digit starts fresh, 15 digits per number, keyboard support.

## 3. Requirements and Plan

Files: <code>/src/calc.js</code> holds **all** logic as pure functions; <code>/App.js</code> is only buttons, a display and a key listener. That split is the main design point: the logic can be tested in Node without React (and the Vue and Angular versions reuse the same file).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Pipeline: a key press goes into the press reducer, which updates the state. On equals, the expression string goes to tokenize, then the parser, then formatResult, and the formatted result becomes the new expression.">
  <defs>
    <marker id="mc06q6r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="56" text-anchor="middle">Key press</text>
  <text class="d-sub" x="95" y="76" text-anchor="middle">button or keyboard</text>
  <rect class="d-box-accent" x="270" y="30" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="355" y="56" text-anchor="middle">press(state, key)</text>
  <text class="d-sub" x="355" y="76" text-anchor="middle">pure reducer</text>
  <rect class="d-box" x="530" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="605" y="56" text-anchor="middle">state</text>
  <text class="d-sub" x="605" y="76" text-anchor="middle">expr, flags</text>
  <rect class="d-box" x="20" y="180" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="215" text-anchor="middle">tokenize</text>
  <rect class="d-box" x="270" y="180" width="170" height="60" rx="10"/>
  <text class="d-text" x="355" y="206" text-anchor="middle">evaluate</text>
  <text class="d-sub" x="355" y="226" text-anchor="middle">recursive descent</text>
  <rect class="d-box" x="530" y="180" width="150" height="60" rx="10"/>
  <text class="d-text" x="605" y="215" text-anchor="middle">formatResult</text>
  <path class="d-edge" d="M 176 60 L 264 60" marker-end="url(#mc06q6r-arrow)"/>
  <path class="d-edge" d="M 446 60 L 524 60" marker-end="url(#mc06q6r-arrow)"/>
  <path class="d-edge-dashed" d="M 330 96 L 95 174" marker-end="url(#mc06q6r-arrow)"/>
  <text class="d-sub" x="170" y="130" text-anchor="middle">on equals</text>
  <path class="d-edge" d="M 176 210 L 264 210" marker-end="url(#mc06q6r-arrow)"/>
  <path class="d-edge" d="M 446 210 L 524 210" marker-end="url(#mc06q6r-arrow)"/>
  <path class="d-edge-accent" d="M 605 174 L 605 96" marker-end="url(#mc06q6r-arrow)"/>
  <text class="d-sub" x="640" y="140" text-anchor="start">result</text>
</svg>

Only <code>=</code> runs the bottom row; every other key is a small string edit inside the reducer.

**State:** one object <code>{ expr, justEvaluated, error }</code>. <code>expr</code> is the expression as typed with ASCII operators (<code>"12+3*4"</code>); the display prettifies it to <code>12 + 3 × 4</code>. Nothing else is stored: the display text is derived.

## 4. Build It Step by Step

### 4.1 Why not eval

<code>eval(expr)</code> runs **any JavaScript**. Today the string comes from buttons; tomorrow someone adds paste support, a URL parameter or saved history, and <code>eval</code> becomes a script injection hole. It also accepts things a calculator should reject (<code>2**3</code>, <code>alert(1)</code>), gives you no control over errors, and is blocked by a strict Content Security Policy without <code>unsafe-eval</code>. <code>new Function(expr)</code> has the same problems. Writing a 40-line parser is safer and is exactly what the interviewer wants to see.

📌 **Interview term: Tokenizer** — the step that turns a string into a list of meaningful pieces (tokens): <code>"12+3*4"</code> becomes <code>[12, "+", 3, "*", 4]</code>.

### 4.2 Tokenize

~~~js
export function tokenize(expr) {
  const tokens = [];
  let num = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    const expectNumber =
      num === "" &&
      (tokens.length === 0 || OPS.includes(tokens[tokens.length - 1]));
    if (
      (ch >= "0" && ch <= "9") ||
      ch === "." ||
      (ch === "-" && expectNumber)
    ) {
      num += ch;
    } else if (OPS.includes(ch)) {
      if (num === "" || num === "-")
        throw new Error("Malformed expression");
      tokens.push(Number(num), ch);
      num = "";
    } else {
      throw new Error("Unexpected character " + ch);
    }
  }
  if (num === "" || num === "-")
    throw new Error("Malformed expression");
  tokens.push(Number(num));
  return tokens;
}
~~~

It walks the string once, building up a number until it meets an operator. A <code>-</code> where a number is expected (at the start, or right after another operator) is a sign, not a subtraction, which is how <code>-5*-2</code> works. Anything else throws.

### 4.3 Evaluate with precedence

~~~js
export function evaluate(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const next = () => tokens[pos++];
  const peek = () => tokens[pos];

  function term() {
    let value = next();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = next();
      if (op === "/" && rhs === 0)
        throw new Error("Cannot divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function expression() {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  return expression();
}
~~~

📌 **Interview term: Recursive descent parser** — a parser written as one function per grammar rule, each calling the rule below it. Here <code>expression</code> handles <code>+</code> and <code>−</code> and asks <code>term</code> for each operand; <code>term</code> handles <code>×</code> and <code>÷</code>. Because <code>term</code> finishes all its multiplications before returning, precedence falls out of the structure; no precedence table is needed.

The classic alternative is Dijkstra **shunting-yard** algorithm, which converts to postfix with an operator stack. Both are fine; recursive descent is shorter to write live and extends naturally to parentheses (a <code>factor</code> rule that recurses into <code>expression</code> on <code>(</code>). Division by zero is detected here and thrown as a readable message rather than producing <code>Infinity</code>.

### 4.4 Format the result: floating point

~~~js
export function formatResult(n) {
  const rounded = Number(n.toPrecision(12));
  if (!Number.isFinite(rounded) || Math.abs(rounded) >= 1e15)
    throw new Error("Number too large");
  let text = String(rounded);
  // Tiny results print as "1e-7"; spell them
  // out so the next key press still parses.
  if (text.includes("e"))
    text = rounded.toFixed(12).replace(/[.]?0+$/, "");
  return text === "-0" ? "0" : text;
}
~~~

JavaScript numbers are binary floating point, so 0.1 and 0.2 cannot be stored exactly and their sum prints as <code>0.30000000000000004</code>; see [why 0.1 + 0.2 is not 0.3](/interview-question/why-is-0-1-0-2-not-exactly-0-3). Rounding to 12 significant digits with <code>toPrecision(12)</code> removes that representation noise while keeping far more digits than the display shows. Two more guards: results of 1e15 or more are reported as too large (the display allows 15 digits per number, and above 2^53 integers stop being exact), and tiny results that would print as <code>1e-7</code> are spelled out, because the tokenizer does not accept exponent notation and the user may keep calculating with the result.

These functions were run directly in Node, before any UI existed (the "raw JS" column is the unrounded value):

~~~text
2+3*4                = 14    (raw JS: 14)
12-4/2*3             = 6    (raw JS: 6)
10/4                 = 2.5    (raw JS: 2.5)
0.1+0.2              = 0.3    (raw JS: 0.30000000000000004)
0.3-0.1              = 0.2    (raw JS: 0.19999999999999998)
1/3*3                = 1    (raw JS: 1)
1.1*1.1              = 1.21    (raw JS: 1.2100000000000002)
-5*-2                = 10    (raw JS: 10)
7/0                  = Error: Cannot divide by zero    (raw JS: throws)
999999999999999*9    = Error: Number too large    (raw JS: 8999999999999991)
0.0000001*1          = 0.0000001    (raw JS: 1e-7)
2-3                  = -1    (raw JS: -1)
~~~

📌 **Interview term: Representation error** — the tiny difference between a decimal number and the nearest binary floating-point value. It is not a bug in JavaScript; every language using IEEE 754 doubles shows it.

### 4.5 The key-press reducer

~~~js
export function press(state, key) {
  if (key === "AC") return initialState;
  // any key after an error starts over
  if (state.error) state = initialState;
  const { expr, justEvaluated } = state;
  const last = expr.slice(-1);

  if (key >= "0" && key <= "9") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base) === "0")
      return {
        expr: base.slice(0, -1) + key,
        justEvaluated: false,
        error: "",
      };
    if (lastNumber(base).replace(/[-.]/g, "").length >= 15)
      return state;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === ".") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base).includes(".")) return state;
    const needsZero = base === "" || OPS.includes(base.slice(-1));
    return {
      expr: base + (needsZero ? "0." : "."),
      justEvaluated: false,
      error: "",
    };
  }
  if (OPS.includes(key)) {
    if (expr === "" || expr === "-")
      return key === "-"
        ? { ...state, expr: "-", justEvaluated: false }
        : state;
    if (OPS.includes(last))
      // replace the operator
      return { ...state, expr: expr.slice(0, -1) + key };
    const base = last === "." ? expr.slice(0, -1) : expr;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === "⌫") {
    if (justEvaluated) return initialState;
    return { ...state, expr: expr.slice(0, -1) };
  }
  if (key === "=") {
    if (expr === "" || OPS.includes(last)) return state;
    try {
      return {
        expr: formatResult(evaluate(expr)),
        justEvaluated: true,
        error: "",
      };
    } catch (e) {
      return { expr, justEvaluated: false, error: e.message };
    }
  }
  return state;
}
~~~

This is the input state machine, written as a pure function <code>(state, key) => newState</code>:

- **Digits** after a result start fresh; a lone <code>0</code> is replaced rather than producing <code>007</code>; numbers are capped at 15 digits.
- **Decimal point** is ignored if the current number already has one, and becomes <code>0.</code> at the start of a number.
- **Operators** after an operator replace it (<code>5 + ×</code> becomes <code>5 ×</code>); a lone <code>-</code> at the start begins a negative number; a trailing <code>.</code> is dropped.
- **Equals** does nothing on an empty or unfinished expression; errors are stored, not thrown, and any next key starts over.

The same reducer driven from Node, key by key:

~~~text
1 2 + 3 * 4 =            -> {"expr":"24","justEvaluated":true,"error":""} | 24
5 + * 2 =                -> {"expr":"10","justEvaluated":true,"error":""} | 10
. 5 + . 5 =              -> {"expr":"1","justEvaluated":true,"error":""} | 1
9 / 0 =                  -> {"expr":"9/0","justEvaluated":false,"error":"Cannot divide by zero"} | 9 ÷ 0
9 / 0 = 7                -> {"expr":"7","justEvaluated":false,"error":""} | 7
2 + 3 = * 4 =            -> {"expr":"20","justEvaluated":true,"error":""} | 20
2 + 3 = 7                -> {"expr":"7","justEvaluated":false,"error":""} | 7
0 0 7                    -> {"expr":"7","justEvaluated":false,"error":""} | 7
1 . . 2                  -> {"expr":"1.2","justEvaluated":false,"error":""} | 1.2
- 4 * 2 =                -> {"expr":"-8","justEvaluated":true,"error":""} | −8
~~~

📌 **Interview term: Reducer** — a pure function that takes the current state and an action and returns the next state. It is exactly what React <code>useReducer</code> expects. See [useState vs useReducer](/interview-question/what-is-the-difference-between-usestate-and-usereducer).

### 4.6 The React component

~~~jsx
const [state, dispatch] = useReducer(press, initialState);

useEffect(() => {
  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = keyFromKeyboard(e.key);
    if (!key) return;
    // stops Enter from also clicking a focused button
    e.preventDefault();
    dispatch(key);
  }
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, []);

const shown = state.error || pretty(state.expr) || "0";
~~~

<code>useReducer(press, initialState)</code> is the whole state layer: buttons call <code>dispatch(key)</code>, and so does the keyboard listener. The effect adds a <code>keydown</code> listener on <code>window</code> and returns a cleanup that removes it; under StrictMode React mounts, cleans up and mounts again in development, and the cleanup is what prevents two listeners (and every key counting twice). See [the useEffect cleanup](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect). <code>dispatch</code> is stable, so the empty dependency list is correct.

<code>e.preventDefault()</code> matters more than it looks. If the user clicks <code>3</code> with the mouse, that button keeps focus. Pressing Enter on a focused button "clicks" it. Without <code>preventDefault</code>, Enter would evaluate **and** then press <code>3</code> again. That cannot be seen in jsdom, which does not synthesize clicks from key presses, so it was tested in Chromium on the shipped code and on a copy with the line removed:

~~~text
[chromium] with preventDefault      focused: 3 | display before Enter: 5 + 3 | after Enter: 8
[chromium] without preventDefault   focused: 3 | display before Enter: 5 + 3 | after Enter: 3
~~~

Without it, Enter computed 8 and the button click then started a new number, 3.

## 5. Verified: What the Solution Printed

Mounted in jsdom with <code>createRoot</code> in <code>StrictMode</code>. The driver clicked the on-screen keys (by <code>data-key</code>), then pressed physical keys with <code>keydown</code> events on the page:

~~~text
[react] RENDERED: 0AC⌫÷×789−456+123=0.Keyboard works too: digits, + - * /, Enter, Backspace, Esc.
[react] 12 + 3 x 4 (before =)      -> 12 + 3 × 4
[react] 12 + 3 x 4 =               -> 24
[react] 0.1 + 0.2 =                -> 0.3
[react] 1.1 x 1.1 =                -> 1.21
[react] 5 + x 2 = (op replaced)    -> 10
[react] 2 + 3 = then x 4 =         -> 20
[react] 2 + 3 = then 7             -> 7
[react] 1 . . 2 (one dot)          -> 1.2
[react] 7 / 0 =                    -> Cannot divide by zero
[react] next key after error       -> 8
[react] - 4 x 2 =                  -> −8
[react] 9 8 7 backspace            -> 98
[react] keyboard 9-12/4 Enter      -> 6
[react] keyboard Escape            -> 0
[react] aria-live: polite | buttons: 18
~~~

Precedence (24), clean decimals (0.3 and 1.21), operator replacement, continuing from a result, starting fresh after a result, one decimal point per number, the divide-by-zero message and recovery, negative numbers, backspace and the keyboard path (<code>9-12/4</code> then Enter gives 6) all match the Node results above. Each keyboard key counted once, so the StrictMode double mount left exactly one listener. No <code>console.error</code>.

## 6. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| <code>0.1 + 0.2</code>, <code>1.1 × 1.1</code> | 0.3 and 1.21 via 12 significant digits |
| <code>7 ÷ 0</code> | "Cannot divide by zero"; next key starts over |
| Result 1e15 or more | "Number too large" |
| Tiny result like 1e-7 | Shown as 0.0000001 so it can be reused |
| Two operators in a row | The second replaces the first |
| <code>1 . . 2</code> | One decimal point per number |
| Enter while a button has focus | <code>preventDefault</code> stops the extra click (tested in Chromium) |
| Screen reader | Operator buttons have names (Divide, Multiply, Minus, Plus, Equals, Backspace, All clear); the display is an <code>&lt;output&gt;</code> with <code>aria-live="polite"</code> |

## 7. Common Pitfalls

- **<code>eval</code> or <code>new Function</code>.** A code injection risk the moment the input is not only buttons, and blocked by strict CSP.
- **Left-to-right evaluation by accident.** Keeping a running total gives 60 for 12 + 3 × 4. Decide which behaviour you want, out loud.
- **Fixing floats with <code>toFixed(2)</code>.** It turns 1/3 into 0.33 and 0.1 + 0.2 into "0.30" (a string). Round to significant digits for display only.
- **Forgetting the listener cleanup.** Under StrictMode or remounts, every key press counts twice.
- **Enter on a focused button.** Without <code>preventDefault</code> the key evaluates and clicks.
- **Logic inside the component.** Tangled event handlers are hard to test; a pure reducer can be tested in Node in milliseconds.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Split:</strong> <span style="color:#f0e2c8;">"All logic is pure in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calc.js</code>: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">press(state, key)</code> reducer for input, a tokenizer, a parser and a formatter. The component is buttons, a display and a key listener."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No eval:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code> runs arbitrary code and is blocked by strict CSP, so I tokenize and use a recursive-descent parser: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expression</code> handles plus and minus over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">term</code>, which handles times and divide, so precedence comes from the grammar."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Numbers:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1 + 0.2</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.30000000000000004</code> in binary floating point, so I round to 12 significant digits for display, report division by zero and overflow as errors, and spell out tiny results."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State machine:</strong> <span style="color:#f0e2c8;">"Operators replace operators, one decimal point per number, a lone zero is replaced, after equals an operator continues and a digit starts fresh, and any key after an error starts over."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. React wiring:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useReducer(press)</code>, a window keydown listener with a cleanup, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> so Enter on a focused button does not also click it. Buttons have names and the display is a polite live region."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add parentheses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">factor</code> rule: if the token is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code>, parse an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expression</code> and expect <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code>; otherwise read a number. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">term</code> then multiplies factors. The tokenizer emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code> as tokens, and the reducer tracks open parentheses so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> can reject unbalanced input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get exact decimal results?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use scaled integers (multiply by a power of ten and use BigInt), or a decimal library. For a basic calculator, rounding to 12 significant digits for display is enough; for money, use integer cents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a reducer and not several useState calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every key reads and writes the expression and the flags together, and the next state depends on the previous one. One pure reducer keeps the transitions in one place and makes them testable without React.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">evaluate</code> (precedence, decimals, errors), sequence tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">press</code> (keys in, expression out), and a few UI tests with Testing Library that click buttons and press keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show the previous expression above the result?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">previous</code> in the reducer state when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> succeeds and render it in a smaller line; clear it on the next digit. It stays a pure state transition.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Operator precedence** | Which operators are applied first (× and ÷ before + and −) |
| **Tokenizer** | Turns a string into numbers and operator tokens |
| **Recursive descent parser** | One function per grammar rule; precedence comes from which rule calls which |
| **Shunting-yard** | An alternative algorithm that converts to postfix with an operator stack |
| **Representation error** | The tiny gap between a decimal and its binary floating-point value |
| **Reducer** | A pure function from (state, action) to the next state |

---
**Conclusion:** A good calculator is three pure pieces and a thin UI: a key-press reducer that encodes the input rules, a tokenizer plus recursive-descent parser that gives precedence without <code>eval</code>, and a formatter that rounds away floating-point noise and reports errors. Node runs proved the maths (24, 0.3, 1.21, divide by zero, overflow), the jsdom run on React 19.3.1 proved the wiring with buttons and keys, and Chromium proved why Enter needs <code>preventDefault</code>.`,
        files: {
          "/App.js": `import { useEffect, useReducer } from "react";
import { press, initialState, keyFromKeyboard, pretty } from "./src/calc";

const KEYS = [
  { key: "AC", label: "AC", name: "All clear", kind: "fn" },
  { key: "⌫", label: "⌫", name: "Backspace", kind: "fn" },
  { key: "/", label: "÷", name: "Divide", kind: "op" },
  { key: "*", label: "×", name: "Multiply", kind: "op" },
  { key: "7" },
  { key: "8" },
  { key: "9" },
  { key: "-", label: "−", name: "Minus", kind: "op" },
  { key: "4" },
  { key: "5" },
  { key: "6" },
  { key: "+", label: "+", name: "Plus", kind: "op" },
  { key: "1" },
  { key: "2" },
  { key: "3" },
  { key: "=", label: "=", name: "Equals", kind: "eq" },
  { key: "0", wide: true },
  { key: ".", label: ".", name: "Decimal point" },
];

export default function App() {
  // press(state, key) is a pure reducer, so useReducer is a perfect fit.
  const [state, dispatch] = useReducer(press, initialState);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = keyFromKeyboard(e.key);
      if (!key) return;
      e.preventDefault(); // stops Enter from also clicking a focused button
      dispatch(key);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const shown = state.error || pretty(state.expr) || "0";

  return (
    <main className="page">
      <section className="calc" aria-label="Calculator">
        <output
          className={"display" + (state.error ? " error" : "")}
          data-testid="display"
          aria-live="polite"
        >
          {shown}
        </output>
        <div className="keys">
          {KEYS.map((k) => (
            <button
              key={k.key}
              type="button"
              data-key={k.key}
              aria-label={k.name}
              className={["key", k.kind, k.wide ? "wide" : ""].join(" ")}
              onClick={() => dispatch(k.key)}
            >
              {k.label ?? k.key}
            </button>
          ))}
        </div>
      </section>
      <p className="hint">
        Keyboard works too: digits, + - * /, Enter, Backspace, Esc.
      </p>
    </main>
  );
}
`,
          "/src/calc.js": `// Pure calculator logic: no React, no DOM, no eval.
export const OPS = ["+", "-", "*", "/"];
const PRETTY = { "*": "×", "/": "÷", "-": "−", "+": "+" };

// "12+3*4" -> [12, "+", 3, "*", 4]. A "-" where a number is expected is a sign.
export function tokenize(expr) {
  const tokens = [];
  let num = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    const expectNumber =
      num === "" &&
      (tokens.length === 0 || OPS.includes(tokens[tokens.length - 1]));
    if (
      (ch >= "0" && ch <= "9") ||
      ch === "." ||
      (ch === "-" && expectNumber)
    ) {
      num += ch;
    } else if (OPS.includes(ch)) {
      if (num === "" || num === "-") throw new Error("Malformed expression");
      tokens.push(Number(num), ch);
      num = "";
    } else {
      throw new Error("Unexpected character " + ch);
    }
  }
  if (num === "" || num === "-") throw new Error("Malformed expression");
  tokens.push(Number(num));
  return tokens;
}

// Recursive descent: expression = term (("+" | "-") term)*
//                    term       = number (("*" | "/") number)*
// The grammar itself encodes precedence: * and / bind tighter than + and -.
export function evaluate(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const next = () => tokens[pos++];
  const peek = () => tokens[pos];

  function term() {
    let value = next();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = next();
      if (op === "/" && rhs === 0) throw new Error("Cannot divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function expression() {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  return expression();
}

// 0.1 + 0.2 is 0.30000000000000004 in binary floating point. Rounding to 12
// significant digits hides that representation
// error without losing real digits.
export function formatResult(n) {
  const rounded = Number(n.toPrecision(12));
  if (!Number.isFinite(rounded) || Math.abs(rounded) >= 1e15)
    throw new Error("Number too large");
  let text = String(rounded);
  // Tiny results print as "1e-7"; spell them
  // out so the next key press still parses.
  if (text.includes("e")) text = rounded.toFixed(12).replace(/[.]?0+$/, "");
  return text === "-0" ? "0" : text;
}

export function pretty(expr) {
  return expr.replace(/[-+*/]/g, (op, i) =>
    op === "-" && (i === 0 || OPS.includes(expr[i - 1]))
      ? "−"
      : " " + PRETTY[op] + " ",
  );
}

// The input state machine. state = { expr, justEvaluated, error }
export const initialState = { expr: "", justEvaluated: false, error: "" };

const lastNumber = (expr) => expr.split(/[-+*/]/).pop();

export function press(state, key) {
  if (key === "AC") return initialState;
  if (state.error) state = initialState; // any key after an error starts over
  const { expr, justEvaluated } = state;
  const last = expr.slice(-1);

  if (key >= "0" && key <= "9") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base) === "0")
      return { expr: base.slice(0, -1) + key, justEvaluated: false, error: "" };
    if (lastNumber(base).replace(/[-.]/g, "").length >= 15) return state;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === ".") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base).includes(".")) return state;
    const needsZero = base === "" || OPS.includes(base.slice(-1));
    return {
      expr: base + (needsZero ? "0." : "."),
      justEvaluated: false,
      error: "",
    };
  }
  if (OPS.includes(key)) {
    if (expr === "" || expr === "-")
      return key === "-"
        ? { ...state, expr: "-", justEvaluated: false }
        : state;
    // replace the operator
    if (OPS.includes(last)) return { ...state, expr: expr.slice(0, -1) + key };
    const base = last === "." ? expr.slice(0, -1) : expr;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === "⌫") {
    if (justEvaluated) return initialState;
    return { ...state, expr: expr.slice(0, -1) };
  }
  if (key === "=") {
    if (expr === "" || OPS.includes(last)) return state;
    try {
      return {
        expr: formatResult(evaluate(expr)),
        justEvaluated: true,
        error: "",
      };
    } catch (e) {
      return { expr, justEvaluated: false, error: e.message };
    }
  }
  return state;
}

// Map a physical keyboard key to a calculator key (or null).
export function keyFromKeyboard(k) {
  if ((k >= "0" && k <= "9") || OPS.includes(k) || k === ".") return k;
  if (k === "Enter" || k === "=") return "=";
  if (k === "Backspace") return "⌫";
  if (k === "Escape" || k === "Delete") return "AC";
  if (k === "x" || k === "X") return "*";
  return null;
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
.page {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 12px;
  padding: 16px;
}
.calc {
  width: min(320px, 92vw);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 16px;
  padding: 14px;
}
.display {
  display: block;
  min-height: 64px;
  padding: 8px 10px;
  margin-bottom: 12px;
  text-align: right;
  font-size: 2rem;
  overflow-wrap: anywhere;
  background: #0f1115;
  border-radius: 10px;
}
.display.error {
  font-size: 1.1rem;
  color: #ff8a80;
  line-height: 48px;
}
.keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.key {
  padding: 14px 0;
  font-size: 1.2rem;
  border: 0;
  border-radius: 10px;
  background: #262b36;
  color: #e6e6e6;
  cursor: pointer;
}
.key:hover {
  background: #303747;
}
.key:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.key.fn {
  background: #3a3f4b;
}
.key.op {
  background: #2d4373;
}
.key.eq {
  background: #4f7cff;
  grid-row: span 2;
}
.key.wide {
  grid-column: span 2;
}
.hint {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  color: #9aa3b2;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know <code>ref()</code> and templates; parsing is explained from zero.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution; outputs were printed in Node 22 and by mounting the app on Vue 3.5.44.

## 1. The Story

A shop assistant totals "12 plus 3 times 4" on a notepad. The careful one multiplies first and writes 24; the hurried one goes left to right and writes 60. A **calculator** app is the notepad, and the interview checks whether you are the careful assistant: an input state machine, an evaluator with precedence and no <code>eval</code>, and number formatting that survives floating point.

📌 **Interview term: Operator precedence** — × and ÷ are applied before + and −, so 12 + 3 × 4 is 24.

## 2. Requirements and the Vue State Model

Digits, <code>.</code>, <code>+ − × ÷</code>, <code>=</code>, AC and ⌫; precedence without <code>eval</code>; operator replacement, one decimal point per number, continue from a result with an operator, start fresh with a digit; a divide-by-zero message; 0.1 + 0.2 shows 0.3; physical keyboard support.

| Piece | Vue tool | Why |
| :--- | :--- | :--- |
| <code>{ expr, justEvaluated, error }</code> | One <code>ref</code> holding an immutable object | Replaced on every key by the pure <code>press()</code> |
| Display text | <code>computed</code> | Error, prettified expression or "0" |
| Keyboard | <code>window</code> listener in <code>onMounted</code>, removed in <code>onUnmounted</code> | No leaked listeners |
| Logic | <code>/src/calc.js</code> | Pure functions, byte-identical to the React version |

## 3. Build It Step by Step

### 3.1 No eval: tokenize, then parse

<code>eval</code> runs any JavaScript; once input can come from paste, history or a URL, it is a code injection hole, and strict Content Security Policies block it. A small parser is safer:

~~~js
export function evaluate(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const next = () => tokens[pos++];
  const peek = () => tokens[pos];

  function term() {
    let value = next();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = next();
      if (op === "/" && rhs === 0)
        throw new Error("Cannot divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function expression() {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  return expression();
}
~~~

📌 **Interview term: Recursive descent parser** — one function per grammar rule. <code>expression</code> combines <code>term</code>s with + and −; <code>term</code> combines numbers with × and ÷. Because a <code>term</code> is fully evaluated before <code>expression</code> continues, precedence comes from the structure. <code>tokenize</code> (not shown) turns <code>"12+3*4"</code> into <code>[12, "+", 3, "*", 4]</code> and treats a <code>-</code> where a number is expected as a sign.

### 3.2 Formatting floating point

~~~js
export function formatResult(n) {
  const rounded = Number(n.toPrecision(12));
  if (!Number.isFinite(rounded) || Math.abs(rounded) >= 1e15)
    throw new Error("Number too large");
  let text = String(rounded);
  // Tiny results print as "1e-7"; spell them
  // out so the next key press still parses.
  if (text.includes("e"))
    text = rounded.toFixed(12).replace(/[.]?0+$/, "");
  return text === "-0" ? "0" : text;
}
~~~

In binary floating point 0.1 + 0.2 is <code>0.30000000000000004</code> ([why](/interview-question/why-is-0-1-0-2-not-exactly-0-3)). Rounding to 12 significant digits removes that noise; results of 1e15 or more are reported as too large, and tiny results are spelled out because the tokenizer does not read exponent notation. Run in Node:

~~~text
2+3*4                = 14    (raw JS: 14)
12-4/2*3             = 6    (raw JS: 6)
10/4                 = 2.5    (raw JS: 2.5)
0.1+0.2              = 0.3    (raw JS: 0.30000000000000004)
0.3-0.1              = 0.2    (raw JS: 0.19999999999999998)
1/3*3                = 1    (raw JS: 1)
1.1*1.1              = 1.21    (raw JS: 1.2100000000000002)
-5*-2                = 10    (raw JS: 10)
7/0                  = Error: Cannot divide by zero    (raw JS: throws)
999999999999999*9    = Error: Number too large    (raw JS: 8999999999999991)
0.0000001*1          = 0.0000001    (raw JS: 1e-7)
2-3                  = -1    (raw JS: -1)
~~~

📌 **Interview term: Representation error** — the gap between a decimal number and the nearest binary floating-point value.

### 3.3 The key reducer and the component

<code>press(state, key)</code> in <code>calc.js</code> is the input state machine (operators replace operators, one dot per number, a lone 0 is replaced, after a result a digit starts fresh, any key after an error starts over). The component holds one <code>ref</code> and replaces it on every key:

~~~vue
const state = ref(initialState); const tap = (key) => { state.value =
press(state.value, key); }; const shown = computed(() =>
state.value.error || pretty(state.value.expr) || "0"); function
onKeyDown(e) { if (e.ctrlKey || e.metaKey || e.altKey) return; const key
= keyFromKeyboard(e.key); if (!key) return; e.preventDefault(); // stops
Enter from also clicking a focused button tap(key); } onMounted(() =>
window.addEventListener("keydown", onKeyDown)); onUnmounted(() =>
window.removeEventListener("keydown", onKeyDown));
~~~

Replacing the whole object (instead of mutating fields) keeps <code>press</code> pure and testable in Node. The display is a [computed](/interview-question/what-is-the-difference-between-computed-and-watch). The listener is added in <code>onMounted</code> and removed in <code>onUnmounted</code>, so remounting never leaves two listeners.

<code>e.preventDefault()</code> stops Enter from also activating a focused button: after clicking <code>3</code> with the mouse, that button keeps focus, and Enter on a focused button clicks it. Checked in Chromium on the React build of the same logic, with and without the line:

~~~text
[chromium] with preventDefault      focused: 3 | display before Enter: 5 + 3 | after Enter: 8
[chromium] without preventDefault   focused: 3 | display before Enter: 5 + 3 | after Enter: 3
~~~

📌 **Interview term: Reducer** — a pure function from (state, action) to the next state; here <code>press(state, key)</code>.

## 4. Verified

Compiled with <code>@vue/compiler-sfc</code>, mounted in jsdom, driven by clicking the on-screen keys (<code>data-key</code>) and pressing physical keys with <code>keydown</code> events:

~~~text
[vue] RENDERED: 0AC⌫÷×789−456+123=0.Keyboard works too: digits, + - * /, Enter, Backspace, Esc.
[vue] 12 + 3 x 4 (before =)      -> 12 + 3 × 4
[vue] 12 + 3 x 4 =               -> 24
[vue] 0.1 + 0.2 =                -> 0.3
[vue] 1.1 x 1.1 =                -> 1.21
[vue] 5 + x 2 = (op replaced)    -> 10
[vue] 2 + 3 = then x 4 =         -> 20
[vue] 2 + 3 = then 7             -> 7
[vue] 1 . . 2 (one dot)          -> 1.2
[vue] 7 / 0 =                    -> Cannot divide by zero
[vue] next key after error       -> 8
[vue] - 4 x 2 =                  -> −8
[vue] 9 8 7 backspace            -> 98
[vue] keyboard 9-12/4 Enter      -> 6
[vue] keyboard Escape            -> 0
[vue] aria-live: polite | buttons: 18
~~~

Precedence, clean decimals, operator replacement, chaining from a result, a single decimal point, the divide-by-zero message and recovery, negatives, backspace and the keyboard path all matched the Node results. No warnings.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| 0.1 + 0.2 | 0.3 |
| 7 ÷ 0 | Error message, next key starts over |
| Result 1e15 or more | "Number too large" |
| Two operators in a row | Second replaces the first |
| Enter on a focused button | <code>preventDefault</code> |
| Screen reader | Named operator buttons, <code>&lt;output aria-live="polite"&gt;</code> display |

## 6. Common Pitfalls

- **<code>eval</code> or <code>new Function</code>.** Injection risk and blocked by strict CSP.
- **A reactive object mutated in place by the logic.** It works, but the logic then depends on Vue; return new objects from a pure function.
- **Adding the listener without removing it.** Always pair <code>onMounted</code> with <code>onUnmounted</code>.
- **<code>toFixed(2)</code> for display.** It turns 1/3 into 0.33; round to significant digits.
- **Left-to-right evaluation.** Gives 60 for 12 + 3 × 4; decide the behaviour out loud.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Split:</strong> <span style="color:#f0e2c8;">"All logic is pure in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calc.js</code>: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">press(state, key)</code> reducer, a tokenizer, a recursive-descent parser and a formatter. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">App.vue</code> holds one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> and a computed display."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No eval:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code> runs arbitrary code, so I tokenize and parse: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expression</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">term</code> gives precedence from the grammar."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Numbers:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1 + 0.2</code> is not 0.3 in binary, so I round to 12 significant digits for display and report divide by zero and overflow."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Input rules:</strong> <span style="color:#f0e2c8;">"Operators replace operators, one dot per number, chaining from a result, and any key after an error starts over."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Vue wiring:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state.value = press(state.value, key)</code> on clicks and keys; a window listener added in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>, removed in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> so Enter does not click a focused button."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add parentheses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">factor</code> rule that parses a nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expression</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code> and expects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code>; the tokenizer emits brackets, and the reducer counts open ones so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> can reject unbalanced input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write the keyboard handling as a composable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useKeydown(handler)</code> that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onUnmounted</code> inside, so any component gets a leak-free global key listener in one line.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why one ref with an object and not several refs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transitions read and write expression and flags together; one immutable object from a pure reducer keeps them consistent and testable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Table tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">evaluate</code> and key-sequence tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">press</code> in plain Node or Vitest, plus a few Vue Test Utils tests that click buttons and dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Operator precedence** | Which operators apply first |
| **Recursive descent parser** | One function per grammar rule |
| **Representation error** | Decimal to binary rounding gap |
| **Reducer** | Pure (state, action) to next state |
| **computed** | Cached value derived from reactive state |

---
**Conclusion:** The Vue calculator is a thin component over pure logic: one <code>ref</code> replaced by <code>press()</code> on every key, a computed display, and a global key listener with proper cleanup. The parser gives precedence without <code>eval</code> and the formatter hides floating-point noise; both were run in Node, and the mounted Vue 3.5.44 app printed the same results as the React and Angular versions.`,
        files: {
          "/src/App.vue": `<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { press, initialState, keyFromKeyboard, pretty } from "./calc.js";

const KEYS = [
  { key: "AC", label: "AC", name: "All clear", kind: "fn" },
  { key: "⌫", label: "⌫", name: "Backspace", kind: "fn" },
  { key: "/", label: "÷", name: "Divide", kind: "op" },
  { key: "*", label: "×", name: "Multiply", kind: "op" },
  { key: "7" },
  { key: "8" },
  { key: "9" },
  { key: "-", label: "−", name: "Minus", kind: "op" },
  { key: "4" },
  { key: "5" },
  { key: "6" },
  { key: "+", label: "+", name: "Plus", kind: "op" },
  { key: "1" },
  { key: "2" },
  { key: "3" },
  { key: "=", label: "=", name: "Equals", kind: "eq" },
  { key: "0", wide: true },
  { key: ".", label: ".", name: "Decimal point" },
];

// One immutable state object, replaced on every key press by the pure press().
const state = ref(initialState);
const tap = (key) => {
  state.value = press(state.value, key);
};
const shown = computed(
  () => state.value.error || pretty(state.value.expr) || "0",
);

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = keyFromKeyboard(e.key);
  if (!key) return;
  e.preventDefault(); // stops Enter from also clicking a focused button
  tap(key);
}
onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <main class="page">
    <section class="calc" aria-label="Calculator">
      <output
        :class="['display', { error: state.error }]"
        data-testid="display"
        aria-live="polite"
      >{{ shown }}</output>
      <div class="keys">
        <button
          v-for="k in KEYS"
          :key="k.key"
          type="button"
          :data-key="k.key"
          :aria-label="k.name"
          :class="['key', k.kind, { wide: k.wide }]"
          @click="tap(k.key)"
        >{{ k.label ?? k.key }}</button>
      </div>
    </section>
    <p class="hint">Keyboard works too: digits, + - * /, Enter, Backspace, Esc.</p>
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1115;
  color: #e6e6e6;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 12px;
  padding: 16px;
}
.calc {
  width: min(320px, 92vw);
  background: #181b22;
  border: 1px solid #2a2f3a;
  border-radius: 16px;
  padding: 14px;
}
.display {
  display: block;
  min-height: 64px;
  padding: 8px 10px;
  margin-bottom: 12px;
  text-align: right;
  font-size: 2rem;
  overflow-wrap: anywhere;
  background: #0f1115;
  border-radius: 10px;
}
.display.error {
  font-size: 1.1rem;
  color: #ff8a80;
  line-height: 48px;
}
.keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.key {
  padding: 14px 0;
  font-size: 1.2rem;
  border: 0;
  border-radius: 10px;
  background: #262b36;
  color: #e6e6e6;
  cursor: pointer;
}
.key:hover {
  background: #303747;
}
.key:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.key.fn {
  background: #3a3f4b;
}
.key.op {
  background: #2d4373;
}
.key.eq {
  background: #4f7cff;
  grid-row: span 2;
}
.key.wide {
  grid-column: span 2;
}
.hint {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  color: #9aa3b2;
}
</style>
`,
          "/src/calc.js": `// Pure calculator logic: no React, no DOM, no eval.
export const OPS = ["+", "-", "*", "/"];
const PRETTY = { "*": "×", "/": "÷", "-": "−", "+": "+" };

// "12+3*4" -> [12, "+", 3, "*", 4]. A "-" where a number is expected is a sign.
export function tokenize(expr) {
  const tokens = [];
  let num = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    const expectNumber =
      num === "" &&
      (tokens.length === 0 || OPS.includes(tokens[tokens.length - 1]));
    if (
      (ch >= "0" && ch <= "9") ||
      ch === "." ||
      (ch === "-" && expectNumber)
    ) {
      num += ch;
    } else if (OPS.includes(ch)) {
      if (num === "" || num === "-") throw new Error("Malformed expression");
      tokens.push(Number(num), ch);
      num = "";
    } else {
      throw new Error("Unexpected character " + ch);
    }
  }
  if (num === "" || num === "-") throw new Error("Malformed expression");
  tokens.push(Number(num));
  return tokens;
}

// Recursive descent: expression = term (("+" | "-") term)*
//                    term       = number (("*" | "/") number)*
// The grammar itself encodes precedence: * and / bind tighter than + and -.
export function evaluate(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const next = () => tokens[pos++];
  const peek = () => tokens[pos];

  function term() {
    let value = next();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = next();
      if (op === "/" && rhs === 0) throw new Error("Cannot divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function expression() {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  return expression();
}

// 0.1 + 0.2 is 0.30000000000000004 in binary floating point. Rounding to 12
// significant digits hides that representation
// error without losing real digits.
export function formatResult(n) {
  const rounded = Number(n.toPrecision(12));
  if (!Number.isFinite(rounded) || Math.abs(rounded) >= 1e15)
    throw new Error("Number too large");
  let text = String(rounded);
  // Tiny results print as "1e-7"; spell them
  // out so the next key press still parses.
  if (text.includes("e")) text = rounded.toFixed(12).replace(/[.]?0+$/, "");
  return text === "-0" ? "0" : text;
}

export function pretty(expr) {
  return expr.replace(/[-+*/]/g, (op, i) =>
    op === "-" && (i === 0 || OPS.includes(expr[i - 1]))
      ? "−"
      : " " + PRETTY[op] + " ",
  );
}

// The input state machine. state = { expr, justEvaluated, error }
export const initialState = { expr: "", justEvaluated: false, error: "" };

const lastNumber = (expr) => expr.split(/[-+*/]/).pop();

export function press(state, key) {
  if (key === "AC") return initialState;
  if (state.error) state = initialState; // any key after an error starts over
  const { expr, justEvaluated } = state;
  const last = expr.slice(-1);

  if (key >= "0" && key <= "9") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base) === "0")
      return { expr: base.slice(0, -1) + key, justEvaluated: false, error: "" };
    if (lastNumber(base).replace(/[-.]/g, "").length >= 15) return state;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === ".") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base).includes(".")) return state;
    const needsZero = base === "" || OPS.includes(base.slice(-1));
    return {
      expr: base + (needsZero ? "0." : "."),
      justEvaluated: false,
      error: "",
    };
  }
  if (OPS.includes(key)) {
    if (expr === "" || expr === "-")
      return key === "-"
        ? { ...state, expr: "-", justEvaluated: false }
        : state;
    // replace the operator
    if (OPS.includes(last)) return { ...state, expr: expr.slice(0, -1) + key };
    const base = last === "." ? expr.slice(0, -1) : expr;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === "⌫") {
    if (justEvaluated) return initialState;
    return { ...state, expr: expr.slice(0, -1) };
  }
  if (key === "=") {
    if (expr === "" || OPS.includes(last)) return state;
    try {
      return {
        expr: formatResult(evaluate(expr)),
        justEvaluated: true,
        error: "",
      };
    } catch (e) {
      return { expr, justEvaluated: false, error: e.message };
    }
  }
  return state;
}

// Map a physical keyboard key to a calculator key (or null).
export function keyFromKeyboard(k) {
  if ((k >= "0" && k <= "9") || OPS.includes(k) || k === ".") return k;
  if (k === "Enter" || k === "=") return "=";
  if (k === "Backspace") return "⌫";
  if (k === "Escape" || k === "Delete") return "AC";
  if (k === "x" || k === "X") return "*";
  return null;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know components and templates; signals and parsing are explained.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then a <code>📌 Interview term:</code> callout with the exact vocabulary. Excerpts come from the runnable solution; outputs were printed in Node 22 and by booting the app on Angular 22.2.3 (AOT strict and runtime JIT).

## 1. The Story

A shop assistant totals "12 plus 3 times 4": the careful one writes 24, the hurried one 60. A **calculator** app has to be the careful one, without the shortcut of <code>eval</code>, and has to print 0.3 for 0.1 + 0.2.

📌 **Interview term: Operator precedence** — × and ÷ before + and −.

## 2. Requirements and the Angular State Model

Digits, <code>.</code>, <code>+ − × ÷</code>, <code>=</code>, AC, ⌫; precedence without <code>eval</code>; operator replacement; one decimal point per number; chaining after a result; a divide-by-zero message; clean decimals; physical keyboard support.

| Piece | Angular tool | Why |
| :--- | :--- | :--- |
| <code>CalcState</code> | <code>signal&lt;CalcState&gt;</code> | Replaced on every key via <code>update(s => press(s, key))</code> |
| Display text | <code>computed()</code> | Derived |
| Keyboard | <code>@HostListener("window:keydown")</code> | Angular adds and removes the listener with the component |
| Logic | <code>calc.ts</code> | Typed port of the shared pure functions |

📌 **Interview term: @HostListener** — a decorator that subscribes a component method to a DOM event on the host element or, with a <code>window:</code> or <code>document:</code> prefix, on a global target. Angular removes the listener when the component is destroyed, so no manual cleanup is needed.

## 3. Build It Step by Step

### 3.1 Typed logic, no eval

<code>eval</code> and <code>new Function</code> execute arbitrary code and are blocked by strict Content Security Policies, so <code>calc.ts</code> tokenizes and parses:

~~~ts
export function evaluate(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;
  const next = () => tokens[pos++];
  const num = () => tokens[pos++] as number;
  const peek = () => tokens[pos];

  function term(): number {
    let value = num();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = num();
      if (op === "/" && rhs === 0)
        throw new Error("Cannot divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function expression(): number {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  return expression();
}
~~~

📌 **Interview term: Recursive descent parser** — one function per grammar rule: <code>expression</code> combines <code>term</code>s with + and −, <code>term</code> combines numbers with × and ÷, so precedence comes from which function calls which. The typed port adds a <code>Token</code> type (<code>number &#124; string</code>), so <code>OPS</code> is declared as <code>Token[]</code>; the first strict compile failed with <code>Argument of type 'Token' is not assignable to parameter of type 'string'</code> on <code>OPS.includes(tokens[tokens.length - 1])</code> until it was. The port was checked against the JavaScript version by running the same Node test table on both; the outputs were identical:

~~~text
2+3*4                = 14    (raw JS: 14)
12-4/2*3             = 6    (raw JS: 6)
10/4                 = 2.5    (raw JS: 2.5)
0.1+0.2              = 0.3    (raw JS: 0.30000000000000004)
0.3-0.1              = 0.2    (raw JS: 0.19999999999999998)
1/3*3                = 1    (raw JS: 1)
1.1*1.1              = 1.21    (raw JS: 1.2100000000000002)
-5*-2                = 10    (raw JS: 10)
7/0                  = Error: Cannot divide by zero    (raw JS: throws)
999999999999999*9    = Error: Number too large    (raw JS: 8999999999999991)
0.0000001*1          = 0.0000001    (raw JS: 1e-7)
2-3                  = -1    (raw JS: -1)
~~~

0.1 + 0.2 is <code>0.30000000000000004</code> in binary floating point ([why](/interview-question/why-is-0-1-0-2-not-exactly-0-3)); <code>formatResult</code> rounds to 12 significant digits for display, rejects results of 1e15 or more, and spells out tiny results so they can be reused.

📌 **Interview term: Representation error** — the gap between a decimal number and its nearest binary floating-point value.

### 3.2 The component

~~~ts
readonly state = signal<CalcState>(initialState);
readonly shown = computed(
  () => this.state().error || pretty(this.state().expr) || "0",
);

tap(key: string): void {
  this.state.update((s) => press(s, key));
}

@HostListener("window:keydown", ["$event"])
onKeyDown(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = keyFromKeyboard(e.key);
  if (!key) return;
  e.preventDefault(); // stops Enter from also clicking a focused button
  this.tap(key);
}
~~~

<code>press(state, key)</code> is the input state machine (operators replace operators, one dot per number, chaining after a result, any key after an error starts over); the component only calls it. Because the state is a signal, the zoneless app re-renders after every key without any change-detection calls. See [Angular signals](/interview-question/what-are-angular-signals).

The template renders the keypad with <code>@for (k of keys; track k.key)</code> and binds <code>[attr.data-key]</code> and <code>[attr.aria-label]</code> so operator buttons have spoken names.

<code>e.preventDefault()</code> keeps Enter from also activating a focused button (after a mouse click on <code>3</code>, that button keeps focus). Tested in Chromium on the React build of the same logic, with and without the line:

~~~text
[chromium] with preventDefault      focused: 3 | display before Enter: 5 + 3 | after Enter: 8
[chromium] without preventDefault   focused: 3 | display before Enter: 5 + 3 | after Enter: 3
~~~

## 4. Verified

Compiled with <code>ngc</code> and <code>strictTemplates</code> (<code>angular:app</code>) and with runtime JIT (<code>angular:playground</code>) in jsdom, driven by clicking keys (<code>data-key</code>) and dispatching <code>keydown</code> events. AOT output; JIT printed the same lines:

~~~text
[angular:app] RENDERED: 0AC⌫÷×789−456+123=0.Keyboard works too: digits, + - * /, Enter, Backspace, Esc.
[angular:app] 12 + 3 x 4 (before =)      -> 12 + 3 × 4
[angular:app] 12 + 3 x 4 =               -> 24
[angular:app] 0.1 + 0.2 =                -> 0.3
[angular:app] 1.1 x 1.1 =                -> 1.21
[angular:app] 5 + x 2 = (op replaced)    -> 10
[angular:app] 2 + 3 = then x 4 =         -> 20
[angular:app] 2 + 3 = then 7             -> 7
[angular:app] 1 . . 2 (one dot)          -> 1.2
[angular:app] 7 / 0 =                    -> Cannot divide by zero
[angular:app] next key after error       -> 8
[angular:app] - 4 x 2 =                  -> −8
[angular:app] 9 8 7 backspace            -> 98
[angular:app] keyboard 9-12/4 Enter      -> 6
[angular:app] keyboard Escape            -> 0
[angular:app] aria-live: polite | buttons: 18
~~~

24 for 12 + 3 × 4, 0.3, 1.21, operator replacement, chaining, one decimal point, the divide-by-zero message and recovery, negatives, backspace, and the keyboard path through <code>@HostListener</code> all match the React and Vue runs. No <code>console.error</code>.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| 0.1 + 0.2 | 0.3 |
| 7 ÷ 0 | Error message; next key starts over |
| Result 1e15 or more | "Number too large" |
| Ctrl, Cmd or Alt combinations | Ignored, so browser shortcuts keep working |
| Enter on a focused button | <code>preventDefault</code> |
| Screen reader | Named operator buttons, polite live <code>&lt;output&gt;</code> |

## 6. Common Pitfalls

- **<code>eval</code>.** Injection risk; blocked by strict CSP.
- **<code>document.addEventListener</code> in the constructor without removal.** Leaks after destroy; <code>@HostListener</code> cleans up for you.
- **Untyped tokens.** Mixing numbers and strings needs a union type, or strict mode rejects <code>includes</code>.
- **Plain fields for state in a zoneless app.** Use a signal.
- **Rounding with <code>toFixed</code>.** Wrong for 1/3; round to significant digits.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Split:</strong> <span style="color:#f0e2c8;">"The logic lives in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calc.ts</code> as pure functions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">press(state, key)</code>, a tokenizer, a recursive-descent parser and a formatter. The component holds one signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No eval:</strong> <span style="color:#f0e2c8;">"I parse instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expression</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">term</code> gives precedence, and errors like divide by zero are thrown as readable messages."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Numbers:</strong> <span style="color:#f0e2c8;">"Round to 12 significant digits for display so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1 + 0.2</code> shows 0.3; reject overflow; spell out tiny results."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Wiring:</strong> <span style="color:#f0e2c8;">"Buttons from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code>, each calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tap(key)</code>, which does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state.update(s =&gt; press(s, key))</code>; the display is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keyboard:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener(window:keydown)</code> maps keys, ignores modifier combos, and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code> so Enter does not click a focused button."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add parentheses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">factor</code> rule that parses a nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expression</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code> and expects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code>, bracket tokens in the tokenizer, and an open-bracket count in the reducer so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> rejects unbalanced input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why HostListener and not fromEvent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> is declarative and cleaned up automatically; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fromEvent(window, "keydown")</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> is the RxJS equivalent when you want operators like filtering or throttling.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain unit tests for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calc.ts</code>, then TestBed: click buttons by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-key</code>, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new KeyboardEvent("keydown", { key: "Enter" })</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges</code>, and assert the display text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a signal holding one object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The reducer returns a new object per key, so one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal.update</code> replaces the whole state atomically and every computed reading it updates together.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Operator precedence** | Which operators apply first |
| **Recursive descent parser** | One function per grammar rule |
| **Representation error** | Decimal to binary rounding gap |
| **@HostListener** | Decorator that binds a method to a host or global DOM event |
| **Signal** | A reactive value that templates and computeds track |

---
**Conclusion:** The Angular calculator is a signal of immutable state, replaced by a pure <code>press()</code> reducer on every click and every key from <code>@HostListener</code>. The typed parser gives precedence without <code>eval</code> and printed exactly the same results as the JavaScript version in Node; the app passed the same driver in AOT strict mode and in the playground JIT on Angular 22.2.3.`,
        files: {
          "/src/app/app.component.ts": `import { DOCUMENT } from "@angular/common";
import {
  Component,
  HostListener,
  computed,
  signal,
  inject,
} from "@angular/core";
import {
  CalcState,
  initialState,
  keyFromKeyboard,
  press,
  pretty,
} from "./calc";

interface Key {
  key: string;
  label?: string;
  name?: string;
  kind?: string;
  wide?: boolean;
}

const KEYS: Key[] = [
  { key: "AC", label: "AC", name: "All clear", kind: "fn" },
  { key: "⌫", label: "⌫", name: "Backspace", kind: "fn" },
  { key: "/", label: "÷", name: "Divide", kind: "op" },
  { key: "*", label: "×", name: "Multiply", kind: "op" },
  { key: "7" },
  { key: "8" },
  { key: "9" },
  { key: "-", label: "−", name: "Minus", kind: "op" },
  { key: "4" },
  { key: "5" },
  { key: "6" },
  { key: "+", label: "+", name: "Plus", kind: "op" },
  { key: "1" },
  { key: "2" },
  { key: "3" },
  { key: "=", label: "=", name: "Equals", kind: "eq" },
  { key: "0", wide: true },
  { key: ".", label: ".", name: "Decimal point" },
];

@Component({
  selector: "app-root",
  template: \`
    <main class="page">
      <section class="calc" aria-label="Calculator">
        <output
          class="display"
          [class.error]="!!state().error"
          data-testid="display"
          aria-live="polite"
        >{{ shown() }}</output>
        <div class="keys">
          @for (k of keys; track k.key) {
            <button
              type="button"
              [attr.data-key]="k.key"
              [attr.aria-label]="k.name ?? null"
              [class]="'key ' + (k.kind ?? '') + (k.wide ? ' wide' : '')"
              (click)="tap(k.key)"
            >{{ k.label ?? k.key }}</button>
          }
        </div>
      </section>
      <p class="hint">Keyboard works too: digits, + - * /, Enter, Backspace, Esc.</p>
    </main>
  \`,
  styles: [
    \`
    :host { display: block; min-height: 100vh; background: #0f1115; color: #e6e6e6; font-family: system-ui, sans-serif; }
    .page { min-height: 100vh; display: grid; place-content: center; gap: 12px; padding: 16px; box-sizing: border-box; }
    .calc { width: min(320px, 92vw); background: #181b22; border: 1px solid #2a2f3a; border-radius: 16px; padding: 14px; }
    .display { display: block; min-height: 64px; padding: 8px 10px; margin-bottom: 12px; text-align: right;
      font-size: 2rem; overflow-wrap: anywhere; background: #0f1115; border-radius: 10px; }
    .display.error { font-size: 1.1rem; color: #ff8a80; line-height: 48px; }
    .keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .key { padding: 14px 0; font-size: 1.2rem; border: 0; border-radius: 10px; background: #262b36; color: #e6e6e6; cursor: pointer; }
    .key:hover { background: #303747; }
    .key:focus-visible { outline: 2px solid #7aa2ff; outline-offset: 2px; }
    .key.fn { background: #3a3f4b; }
    .key.op { background: #2d4373; }
    .key.eq { background: #4f7cff; grid-row: span 2; }
    .key.wide { grid-column: span 2; }
    .hint { margin: 0; text-align: center; font-size: 0.85rem; color: #9aa3b2; }
  \`,
  ],
})
export class AppComponent {
  constructor() {
    // The playground page has a default white
    // body margin; make the whole page dark.
    inject(DOCUMENT).body.style.cssText = "margin: 0; background: #0f1115;";
  }

  readonly keys = KEYS;
  // A signal holding one immutable state object; press() is a pure reducer.
  readonly state = signal<CalcState>(initialState);
  readonly shown = computed(
    () => this.state().error || pretty(this.state().expr) || "0",
  );

  tap(key: string): void {
    this.state.update((s) => press(s, key));
  }

  @HostListener("window:keydown", ["$event"])
  onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = keyFromKeyboard(e.key);
    if (!key) return;
    e.preventDefault(); // stops Enter from also clicking a focused button
    this.tap(key);
  }
}
`,
          "/src/app/calc.ts": `// Pure calculator logic: no React, no DOM, no eval.
export type Token = number | string;
export interface CalcState {
  expr: string;
  justEvaluated: boolean;
  error: string;
}

export const OPS: Token[] = ["+", "-", "*", "/"];
const PRETTY: Record<string, string> = {
  "*": "×",
  "/": "÷",
  "-": "−",
  "+": "+",
};

// "12+3*4" -> [12, "+", 3, "*", 4]. A "-" where a number is expected is a sign.
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let num = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    const expectNumber =
      num === "" &&
      (tokens.length === 0 || OPS.includes(tokens[tokens.length - 1]));
    if (
      (ch >= "0" && ch <= "9") ||
      ch === "." ||
      (ch === "-" && expectNumber)
    ) {
      num += ch;
    } else if (OPS.includes(ch)) {
      if (num === "" || num === "-") throw new Error("Malformed expression");
      tokens.push(Number(num), ch);
      num = "";
    } else {
      throw new Error("Unexpected character " + ch);
    }
  }
  if (num === "" || num === "-") throw new Error("Malformed expression");
  tokens.push(Number(num));
  return tokens;
}

// Recursive descent: expression = term (("+" | "-") term)*
//                    term       = number (("*" | "/") number)*
// The grammar itself encodes precedence: * and / bind tighter than + and -.
export function evaluate(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;
  const next = () => tokens[pos++];
  const num = () => tokens[pos++] as number;
  const peek = () => tokens[pos];

  function term(): number {
    let value = num();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = num();
      if (op === "/" && rhs === 0) throw new Error("Cannot divide by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function expression(): number {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  return expression();
}

// 0.1 + 0.2 is 0.30000000000000004 in binary floating point. Rounding to 12
// significant digits hides that representation
// error without losing real digits.
export function formatResult(n: number): string {
  const rounded = Number(n.toPrecision(12));
  if (!Number.isFinite(rounded) || Math.abs(rounded) >= 1e15)
    throw new Error("Number too large");
  let text = String(rounded);
  // Tiny results print as "1e-7"; spell them
  // out so the next key press still parses.
  if (text.includes("e")) text = rounded.toFixed(12).replace(/[.]?0+$/, "");
  return text === "-0" ? "0" : text;
}

export function pretty(expr: string): string {
  return expr.replace(/[-+*/]/g, (op, i) =>
    op === "-" && (i === 0 || OPS.includes(expr[i - 1]))
      ? "−"
      : " " + PRETTY[op] + " ",
  );
}

// The input state machine. state = { expr, justEvaluated, error }
export const initialState: CalcState = {
  expr: "",
  justEvaluated: false,
  error: "",
};

const lastNumber = (expr: string): string => expr.split(/[-+*/]/).pop() ?? "";

export function press(state: CalcState, key: string): CalcState {
  if (key === "AC") return initialState;
  if (state.error) state = initialState; // any key after an error starts over
  const { expr, justEvaluated } = state;
  const last = expr.slice(-1);

  if (key >= "0" && key <= "9") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base) === "0")
      return { expr: base.slice(0, -1) + key, justEvaluated: false, error: "" };
    if (lastNumber(base).replace(/[-.]/g, "").length >= 15) return state;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === ".") {
    const base = justEvaluated ? "" : expr;
    if (lastNumber(base).includes(".")) return state;
    const needsZero = base === "" || OPS.includes(base.slice(-1));
    return {
      expr: base + (needsZero ? "0." : "."),
      justEvaluated: false,
      error: "",
    };
  }
  if (OPS.includes(key)) {
    if (expr === "" || expr === "-")
      return key === "-"
        ? { ...state, expr: "-", justEvaluated: false }
        : state;
    // replace the operator
    if (OPS.includes(last)) return { ...state, expr: expr.slice(0, -1) + key };
    const base = last === "." ? expr.slice(0, -1) : expr;
    return { expr: base + key, justEvaluated: false, error: "" };
  }
  if (key === "⌫") {
    if (justEvaluated) return initialState;
    return { ...state, expr: expr.slice(0, -1) };
  }
  if (key === "=") {
    if (expr === "" || OPS.includes(last)) return state;
    try {
      return {
        expr: formatResult(evaluate(expr)),
        justEvaluated: true,
        error: "",
      };
    } catch (e) {
      return { expr, justEvaluated: false, error: (e as Error).message };
    }
  }
  return state;
}

// Map a physical keyboard key to a calculator key (or null).
export function keyFromKeyboard(k: string): string | null {
  if ((k >= "0" && k <= "9") || OPS.includes(k) || k === ".") return k;
  if (k === "Enter" || k === "=") return "=";
  if (k === "Backspace") return "⌫";
  if (k === "Escape" || k === "Delete") return "AC";
  if (k === "x" || k === "X") return "*";
  return null;
}
`,
        },
      },
    },
  },
];

export default augments;
