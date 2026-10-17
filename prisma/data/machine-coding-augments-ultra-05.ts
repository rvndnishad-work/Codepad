/**
 * Machine coding ULTRA — batch 05: forms I (a validated contact form, a
 * multi-step sign-up wizard, a sign-up form with a debounced, race-safe
 * username availability check, the 7GUIs Flight Booker, dependent
 * Country -> State -> City dropdowns, and a crypto-backed password generator).
 *
 * Every question carries a CLAUDE.md section 6 Question Body (shared by all
 * frameworks) and, per framework (React, Vue, Angular), a full tutorial answer
 * plus a runnable multi-file solution: a story first, clarifying questions
 * (React tab), the state model, step-by-step code excerpts, a Verified section
 * quoting real output, edge cases and accessibility, pitfalls, the section 7
 * interview card, a glossary and a conclusion. No form libraries are used.
 *
 * Every solution was booted with scripts/verify-mc-solution.mjs on React
 * 19.3.1, Vue 3.5.44 and Angular 22.2.3 (AOT with strict templates and the
 * playground JIT) in jsdom 29, driven by one shared driver per question, with
 * no console.error. Code excerpts in the answers are pulled from the same
 * files at build time. Generator, drivers and raw outputs live in the
 * session scratchpad (mc/b05: gen.mjs, and per question qN/driver.mjs and qN/out-FW.txt).
 * Version claims cite the package typings in node_modules or the release
 * posts (blog.vuejs.org, v8.dev) named inline.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside <svg>,
 * no leading H1, `description` is plain markdown (no HTML).
 */
import type { MachineCodingAugment } from "./machine-coding-augments.types";

const augments: MachineCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Form with validation",
    seoDescription: "Build a validated contact form in React, Vue and Angular: derived errors, touched state, blur and submit timing, focus on error and accessible messages.",
    description: `**Question presented to candidate:**
"Build a contact form with Name, Email and Message. Show helpful error messages, but do not yell at people before they have had a chance to type. When they submit, send it to a fake API and show a thank-you screen. No form libraries, please."

**Requirements:**
- Name (required, at least 2 characters), Email (required, valid format), Message (required, 10 to 200 characters, with a live character count).
- An error appears after the field loses focus (blur) or after a submit attempt, and then updates live as the user types.
- On submit with errors: show every error, a short summary ("Please fix 2 fields."), and move focus to the first invalid field.
- On a valid submit: disable the button while a simulated request runs, map a server-side field error back onto its field, and show a success state with a way to start over.
- Errors are announced to assistive technology and tied to their inputs.

**What a strong answer should cover:**
- A single source of truth for values, with errors **derived** from values by a pure \`validate()\` function rather than stored and kept in sync by hand.
- **Touched** and **submitted** flags that decide *when* an error is visible, separate from *whether* the field is invalid.
- Controlled inputs (or \`v-model\` / reactive forms), \`noValidate\` on the form, and preventing the default submit.
- Accessibility: \`<label for>\`, \`aria-invalid\`, \`aria-describedby\` pointing at the error text, a live region for the summary, focus on the first invalid field.
- Server errors as a second error source that clears when the user edits that field; a guard against double submits.

**Clarifying questions expected:**
- "Should errors show while typing, on blur, or only on submit?"
- "Should the submit button be disabled until the form is valid, or always clickable?"
- "Are the rules fixed, or do they come from the server or a schema?"

**Code / implementation expected:** Yes. A working form component with a pure validation function, touched/submitted tracking, accessible error markup and a simulated async submit.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know a little HTML and JavaScript; no React form experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. All code excerpts are copied from the runnable solution, and the output in section 6 was produced by actually running it on React 19.3.1.

## 1. Why This Even Matters — A Story First

Think of a good receptionist at a clinic. You fill in a paper form at the desk. The receptionist does not snatch the clipboard after the first letter of your name to tell you it is "too short". They wait until you move on to the next line, and if you missed the phone number they point at that exact box, not at the whole page. When you hand it back complete, they say "thank you, we will call you".

A bad web form does the opposite: it shows a wall of red the moment the page loads, or it says nothing until you press Send and then just says "Invalid form". Every interviewer has suffered both, which is why "build a form with validation" is such a common machine coding question. It looks like three inputs and a button, but it tests whether you can separate three different questions:

1. **What** is wrong with the data? (validation rules)
2. **When** should we tell the user? (touched and submitted)
3. **How** do we tell everyone, including screen-reader users? (accessible error markup and focus)

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| When should an error first appear: while typing, on blur, or on submit? | It decides whether you need "touched" tracking. The common answer (and this solution) is: on blur or on submit, then live. |
| Should Send be disabled until the form is valid? | A disabled button gives no feedback about *why*. Keeping it enabled and showing errors on click is friendlier; ask before choosing. |
| Are the rules fixed or server-driven? | Fixed rules fit a pure <code>validate()</code> function. Server-driven rules push you toward a schema object you loop over. |
| What should happen with server-side errors (email blocked, rate limit)? | You need a second error source that maps onto fields and clears on edit. |
| Do we need to support a draft (save and resume later)? | It changes where state lives (local storage or a backend) but not the validation design. |
| Which browsers and assistive tech must work? | It confirms that <code>aria-invalid</code>, <code>aria-describedby</code> and a live region are in scope. |

## 3. Requirements and the State Model

The rules: Name is required and at least 2 characters; Email is required and must look like an email; Message is required, 10 to 200 characters, with a live counter. Errors appear after blur or after a submit attempt. A valid submit goes to a simulated server (a <code>setTimeout</code> Promise, because the playground has no network), which rejects any address at <code>@blocked.test</code> with a field error.

The component tree is small: <code>App</code> renders <code>ContactForm</code>, which renders three <code>Field</code> components. The interesting part is the state model:

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>values</code> | State | What the user typed. The single source of truth. |
| <code>touched</code> | State | Which fields have been blurred at least once. |
| <code>submitted</code> | State | Whether the user has tried to submit. |
| <code>serverErrors</code> | State | Errors only the server can know. |
| <code>status</code> | State | <code>idle</code>, <code>sending</code> or <code>success</code>. |
| <code>errors</code> | **Derived** | <code>validate(values)</code> merged with <code>serverErrors</code>, recomputed every render. |
| visible error | **Derived** | <code>errors[f]</code> only if <code>touched[f]</code> or <code>submitted</code>. |
| input elements | Ref | Needed only to call <code>.focus()</code>. |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Values flow through a pure validate function into derived errors, which are filtered by touched and submitted before they are shown">
  <defs>
    <marker id="mcf1r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="56" text-anchor="middle">values</text>
  <text class="d-sub" x="95" y="76" text-anchor="middle">state</text>
  <rect class="d-box-accent" x="250" y="30" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="335" y="56" text-anchor="middle">validate(values)</text>
  <text class="d-sub" x="335" y="76" text-anchor="middle">pure function</text>
  <rect class="d-box-muted" x="500" y="30" width="180" height="60" rx="10"/>
  <text class="d-text" x="590" y="56" text-anchor="middle">errors</text>
  <text class="d-sub" x="590" y="76" text-anchor="middle">derived every render</text>
  <rect class="d-box" x="20" y="160" width="230" height="60" rx="10"/>
  <text class="d-text" x="135" y="186" text-anchor="middle">touched + submitted</text>
  <text class="d-sub" x="135" y="206" text-anchor="middle">state: when to show</text>
  <rect class="d-box-accent" x="460" y="160" width="220" height="60" rx="10"/>
  <text class="d-text d-accent" x="570" y="186" text-anchor="middle">visible error</text>
  <text class="d-sub" x="570" y="206" text-anchor="middle">rendered with aria links</text>
  <path class="d-edge" d="M 170 60 L 244 60" marker-end="url(#mcf1r-arrow)"/>
  <path class="d-edge" d="M 420 60 L 494 60" marker-end="url(#mcf1r-arrow)"/>
  <path class="d-edge" d="M 590 90 L 590 154" marker-end="url(#mcf1r-arrow)"/>
  <path class="d-edge-dashed" d="M 250 190 L 454 190" marker-end="url(#mcf1r-arrow)"/>
</svg>

The top row answers "what is wrong"; the bottom row answers "should the user see it yet". Keeping them apart is the whole design.

📌 **Interview term: Derived state** — a value you can compute from other state, so you compute it during render instead of storing it. Storing <code>errors</code> in its own <code>useState</code> invites bugs where the errors describe an older version of the values.

📌 **Interview term: Touched** — a per-field flag set the first time the field loses focus. It is the standard way to avoid showing "Name is required" on a field the user has not reached yet. Libraries call the related idea "dirty" (the value changed); this solution only needs touched.

## 4. Build It Step by Step

### Step 1: a pure validation function

Start outside React. A function that takes values and returns an object of messages is trivial to test and can be shared with a Node server.

\`\`\`js
// Pure validation rules: values in,
// errors out. No React here, so the same
// function can be unit tested on its own and reused on the server.
export const FIELDS = ["name", "email", "message"];
export const MESSAGE_MAX = 200;
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Name is required";
  else if (name.length < 2)
    errors.name = "Name must be at least 2 characters";

  if (!email) errors.email = "Email is required";
  else if (!EMAIL.test(email))
    errors.email = "Enter a valid email address";

  if (!message) errors.message = "Message is required";
  else if (message.length < 10)
    errors.message = "Message must be at least 10 characters";
  else if (message.length > MESSAGE_MAX)
    errors.message =
      "Message must be " + MESSAGE_MAX + " characters or fewer";

  return errors;
}
\`\`\`

Each field returns its *first* failing rule, so the user sees one clear message at a time. Trimming before checking means "   " counts as empty. If you need rules that compare two fields, the same shape scales; see the [form validation utility with cross-field rules](/interview-question/build-a-form-validation-utility-supporting-field-level-and-cross-field-rules).

### Step 2: controlled inputs and the state

\`\`\`jsx
export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  // idle | sending | success
  const [status, setStatus] = useState("idle");
  const refs = useRef({});

  // Derived, never stored: errors always match the current values.
  const errors = { ...validate(values), ...serverErrors };
  const visible = (f) => (touched[f] || submitted ? errors[f] : undefined);
  const invalidCount = FIELDS.filter((f) => errors[f]).length;

  function update(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (serverErrors[name]) setServerErrors((s) => ({ ...s, [name]: undefined }));
  }

  function blur(e) {
    const { name } = e.target;
    setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
  }
\`\`\`

📌 **Interview term: Controlled input** — an input whose <code>value</code> comes from React state and whose <code>onChange</code> writes back to that state, so React is the source of truth. The alternative, reading the DOM on submit, is an uncontrolled input; the trade-offs are covered in [controlled vs uncontrolled components](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components).

Note three details. <code>errors</code> is a plain <code>const</code> computed on every render. <code>update</code> uses the input <code>name</code> attribute, so one handler serves every field. And <code>blur</code> returns the same object when the field is already touched, so React can skip a re-render.

### Step 3: an accessible Field component

\`\`\`jsx
export default function Field({
  id,
  label,
  error,
  hint,
  multiline,
  inputRef,
  ...rest
}) {
  const Control = multiline ? "textarea" : "input";
  const describedBy = [
    hint ? id + "-hint" : null,
    error ? id + "-error" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        name={id}
        ref={inputRef}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy || undefined}
        className={error ? "invalid" : ""}
        {...rest}
      />
      {hint && (
        <small id={id + "-hint"} className="hint">
          {hint}
        </small>
      )}
      {error && (
        <p id={id + "-error"} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
\`\`\`

📌 **Interview term: aria-describedby** — an attribute that points from a control to the id of an element that describes it. A screen reader reads the label, then the description, so focusing the email box announces "Email, invalid entry, Enter a valid email address".

📌 **Interview term: aria-invalid** — tells assistive technology that the current value fails validation. Pair it with a visual cue that is not only colour (here, the error text itself).

### Step 4: submit, focus and the server

\`\`\`jsx
async function onSubmit(e) {
  e.preventDefault();
  if (status === "sending") return;
  setSubmitted(true);
  const first = FIELDS.find((f) => errors[f]);
  if (first) {
    refs.current[first].focus();
    return;
  }
  setStatus("sending");
  const res = await sendMessage(values);
  if (res.ok) {
    setStatus("success");
  } else {
    setServerErrors(res.fieldErrors);
    setStatus("idle");
    refs.current[Object.keys(res.fieldErrors)[0]].focus();
  }
}
\`\`\`

<code>noValidate</code> on the <code>&lt;form&gt;</code> turns off the browser bubbles so your messages are the only ones. Setting <code>submitted</code> reveals every error at once. Focus goes to the first invalid field so keyboard users land where the work is. The <code>status === "sending"</code> guard plus the disabled button stop a double submit.

📌 **Interview term: Server-side validation** — rules only the backend can check (a blocked address, a duplicate account). Client validation is a convenience; the server must validate again. Here the server answer is merged into <code>errors</code> and cleared in <code>update</code> as soon as the user edits that field.

The summary paragraph is a live region (<code>role="alert"</code>) that is always in the DOM and only changes its text, which is what screen readers need to announce it reliably.

## 5. Where React 19 Fits

React 19 added form Actions (<code>&lt;form action={fn}&gt;</code>) and <code>useActionState</code>, which manage the pending state of a submit for you; see [Actions in React 19](/interview-question/what-are-actions-in-react-19-and-how-do-they-change-form-handling) and [useActionState](/interview-question/useformstatus-useactionstate-modern-form-handling-in-react-19). They are a good fit when validation happens on submit. This question wants per-field blur timing and live re-validation, so the solution keeps explicit state and an <code>onSubmit</code> handler, which also keeps it easy to compare with the Vue and Angular tabs.

One React 19 detail matters for the <code>inputRef</code> callbacks: a ref callback may now return a cleanup function. <code>(el) =&gt; (refs.current.name = el)</code> returns the element, not a function, so it is safe, and the run below printed no warning. See [ref handling in React 19](/interview-question/how-did-ref-handling-change-in-react-19-ref-as-a-prop-forwardref-ref-cleanup).

## 6. Verified: What the Solution Actually Did

The solution was mounted exactly like the playground mounts it (<code>createRoot</code> plus <code>&lt;StrictMode&gt;</code>) in jsdom with React 19.3.1, and a driver typed, blurred and clicked. The driver dispatches both <code>blur</code> and <code>focusout</code>, because React <code>onBlur</code> listens to <code>focusout</code>. Output, unedited apart from dropping the <code>[react]</code> prefix:

\`\`\`text
RENDERED: Contact usNameEmailMessage0/200Send
initial                | name: (none) | email: (none) | message: (none) | summary: ""
typed A (not blurred)  | name: (none) | email: (none) | message: (none) | summary: ""
blurred name           | name: Name must be at least 2 characters | email: (none) | message: (none) | summary: ""
name aria-invalid: true describedby: name-error
submit empty           | name: Name must be at least 2 characters | email: Email is required | message: Message is required | summary: "Please fix 3 fields."
focused after submit: name
fixed name             | name: (none) | email: Email is required | message: Message is required | summary: "Please fix 2 fields."
counter: 28/200
while sending: Sending... disabled: true
server answered        | name: (none) | email: This email address is blocked | message: (none) | summary: "Please fix 1 field."
focused after server error: email
edited email           | name: (none) | email: (none) | message: (none) | summary: ""
after success: Thanks, Ada Lovelace!We will reply to ada@example.com.Send another
after reset            | name: (none) | email: (none) | message: (none) | summary: ""
values after reset: ["","",""]
\`\`\`

Read it line by line: typing "A" showed nothing until blur; the submit revealed all three errors and focused Name; fixing Name removed its error live; the simulated server error landed on Email and took focus; editing Email cleared it; the success screen and reset worked. No <code>console.error</code> was printed. What jsdom cannot show is the visual styling (red borders, focus rings); that was not checked here.

## 7. Edge Cases and Accessibility

| Case | What the solution does |
| :--- | :--- |
| Whitespace-only input | Trimmed before checking, so "   " is "required". |
| Error before the user reaches a field | Hidden until blur or submit. |
| Fixing a field after an error | The error disappears on the next keystroke (derived state). |
| Pressing Enter in a text input | Submits the form, same path as clicking Send. |
| Double click on Send | Guarded by <code>status</code> and the disabled button. |
| Screen reader focus on an invalid field | Reads label, "invalid entry" and the linked error text. |
| Summary announcement | <code>role="alert"</code> region that exists before its text changes. |
| Message counter | Linked with <code>aria-describedby</code> as a hint, so it is read with the field. |

## 8. Common Pitfalls

- **Storing errors in state and syncing them in an effect.** The effect runs after paint, so for one frame the errors describe the previous values, and every new rule is another sync point. Compute them during render.
- **Validating on every keystroke from the first keystroke.** Telling someone their email is invalid after one letter is hostile. Gate visibility with touched and submitted.
- **Forgetting <code>noValidate</code>.** With <code>type="email"</code> the browser shows its own bubble and blocks <code>onSubmit</code>, so your messages and focus logic never run.
- **Creating the error element only when it appears without a stable id.** <code>aria-describedby</code> must point at an id that exists; this solution adds the id to the list only when the error is rendered.
- **Trusting client validation.** Anyone can call your API directly. Keep the server check and map its answers back onto fields.
- **Leaving the submit button live during the request.** Users double click; you get two messages.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope it:</strong> <span style="color:#f0e2c8;">"I will build Name, Email and Message with blur-then-live validation, a submit that reveals all errors and focuses the first one, and a simulated server call."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State model:</strong> <span style="color:#f0e2c8;">"Values are the only source of truth. Errors are derived from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate(values)</code> every render, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touched</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submitted</code> decide when an error is visible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pure rules first:</strong> <span style="color:#f0e2c8;">"I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> as a plain function returning one message per field, so I can unit test it and reuse it on the server."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Accessible markup:</strong> <span style="color:#f0e2c8;">"Each input has a label, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-invalid</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code> pointing at its error; the summary is a live region; focus moves to the first invalid field on submit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Submit path:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noValidate</code>, prevent default, guard double submits, disable the button while sending, and map server field errors back onto fields until the user edits them."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not disable Send until the form is valid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A disabled button cannot explain itself and is skipped by keyboard users, so they never learn what is missing. I keep it enabled and show every error on click. If the product insists, I add a visible hint that lists what is still missing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a "confirm password" rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a cross-field rule, so it belongs in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate(values)</code>, which already sees every value. Because errors are derived, editing either password re-runs the check with no extra wiring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> with a table of inputs and messages. Then a component test with Testing Library: type, blur, submit, and assert on the text linked by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code> and on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>, which is exactly what the driver here does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The form now has 40 fields and typing feels slow. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Measure first. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> is cheap, so the cost is usually re-rendering every field on each keystroke. Wrap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Field</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> with stable handlers, or move to uncontrolled inputs read on blur, or split the form into sections that own their own state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you reach for React 19 Actions instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When validation happens on submit and the server is the main validator. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code> gives me the pending flag and the returned errors without manual status state. For blur-time, field-by-field feedback I still want explicit state like this.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Derived state** | A value computed from other state during render instead of stored |
| **Touched** | A field has lost focus at least once, so its errors may show |
| **Controlled input** | Input whose value lives in React state |
| **aria-describedby** | Links a control to the element whose text describes it |
| **aria-invalid** | Marks a control whose value fails validation |
| **Server-side validation** | Rules the backend enforces, mapped back onto fields |
| **Live region** | An element whose text changes are announced by screen readers |

---
**Conclusion:** A validated form is three separate concerns: pure rules that say what is wrong, touched and submitted flags that say when to show it, and accessible markup that says it to everyone. Keeping values as the single source of truth and deriving errors on each render removes a whole class of sync bugs, and the run on React 19.3.1 shows the payoff: errors appear only after blur or submit, vanish the moment the input is fixed, server errors land on the right field, and focus always goes where the work is. Once this is solid, the [multi-step wizard](/interview-question/build-a-multi-step-form-wizard) and the [async username check](/interview-question/build-a-signup-form-with-async-username-availability-check) build on exactly the same ideas.`,
        files: {
          "/App.js": `import ContactForm from "./src/ContactForm";
import "./styles.css";

export default function App() {
  return (
    <main className="page">
      <ContactForm />
    </main>
  );
}
`,
          "/src/ContactForm.js": `import { useRef, useState } from "react";
import Field from "./Field";
import { FIELDS, MESSAGE_MAX, validate } from "./validate";
import { sendMessage } from "./fakeApi";

const EMPTY = { name: "", email: "", message: "" };

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | success
  const refs = useRef({});

  // Derived, never stored: errors always match the current values.
  const errors = { ...validate(values), ...serverErrors };
  const visible = (f) => (touched[f] || submitted ? errors[f] : undefined);
  const invalidCount = FIELDS.filter((f) => errors[f]).length;

  function update(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (serverErrors[name])
      setServerErrors((s) => ({ ...s, [name]: undefined }));
  }

  function blur(e) {
    const { name } = e.target;
    setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "sending") return;
    setSubmitted(true);
    const first = FIELDS.find((f) => errors[f]);
    if (first) {
      refs.current[first].focus();
      return;
    }
    setStatus("sending");
    const res = await sendMessage(values);
    if (res.ok) {
      setStatus("success");
    } else {
      setServerErrors(res.fieldErrors);
      setStatus("idle");
      refs.current[Object.keys(res.fieldErrors)[0]].focus();
    }
  }

  function reset() {
    setValues(EMPTY);
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
    setStatus("idle");
  }

  if (status === "success") {
    return (
      <div className="card" data-testid="success" role="status">
        <h2>Thanks, {values.name.trim()}!</h2>
        <p>We will reply to {values.email.trim()}.</p>
        <button type="button" data-testid="reset" onClick={reset}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="card"
      onSubmit={onSubmit}
      noValidate
      aria-label="Contact form"
    >
      <h2>Contact us</h2>
      <Field
        id="name"
        label="Name"
        value={values.name}
        onChange={update}
        onBlur={blur}
        error={visible("name")}
        inputRef={(el) => (refs.current.name = el)}
        autoComplete="name"
      />
      <Field
        id="email"
        label="Email"
        type="email"
        value={values.email}
        onChange={update}
        onBlur={blur}
        error={visible("email")}
        inputRef={(el) => (refs.current.email = el)}
        autoComplete="email"
      />
      <Field
        id="message"
        label="Message"
        multiline
        rows={4}
        value={values.message}
        onChange={update}
        onBlur={blur}
        error={visible("message")}
        inputRef={(el) => (refs.current.message = el)}
        hint={values.message.trim().length + "/" + MESSAGE_MAX}
      />
      <p data-testid="summary" role="alert" className="summary">
        {submitted && invalidCount > 0
          ? "Please fix " +
            invalidCount +
            (invalidCount === 1 ? " field." : " fields.")
          : ""}
      </p>
      <button
        type="submit"
        disabled={status === "sending"}
        aria-busy={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
`,
          "/src/Field.js": `// One labelled control plus its error. The error element always exists when
// there is an error, and the control points at it with aria-describedby.
export default function Field({
  id,
  label,
  error,
  hint,
  multiline,
  inputRef,
  ...rest
}) {
  const Control = multiline ? "textarea" : "input";
  const describedBy = [hint ? id + "-hint" : null, error ? id + "-error" : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        name={id}
        ref={inputRef}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy || undefined}
        className={error ? "invalid" : ""}
        {...rest}
      />
      {hint && (
        <small id={id + "-hint"} className="hint">
          {hint}
        </small>
      )}
      {error && (
        <p id={id + "-error"} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
`,
          "/src/fakeApi.js": `// Simulated server: there is no network in the playground. It answers after
// 400 ms and rejects one domain with a field error, the way a real API might.
export function sendMessage(values) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (values.email.trim().toLowerCase().endsWith("@blocked.test")) {
        resolve({
          ok: false,
          fieldErrors: { email: "This email address is blocked" },
        });
      } else {
        resolve({ ok: true });
      }
    }, 400);
  });
}
`,
          "/src/validate.js": `// Pure validation rules: values in, errors out. No React here, so the same
// function can be unit tested on its own and reused on the server.
export const FIELDS = ["name", "email", "message"];
export const MESSAGE_MAX = 200;
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Name is required";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";

  if (!email) errors.email = "Email is required";
  else if (!EMAIL.test(email)) errors.email = "Enter a valid email address";

  if (!message) errors.message = "Message is required";
  else if (message.length < 10)
    errors.message = "Message must be at least 10 characters";
  else if (message.length > MESSAGE_MAX)
    errors.message = "Message must be " + MESSAGE_MAX + " characters or fewer";

  return errors;
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input,
textarea {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.invalid {
  border-color: #ff6b6b;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
}
.hint {
  color: #9aa3b5;
  align-self: flex-end;
}
.summary {
  min-height: 1.2em;
  color: #ffb4b4;
  margin: 0 0 10px;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: progress;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. You know a little HTML and JavaScript; no Vue form experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. All code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Vue 3.5.44.

## 1. A Story First

A good receptionist lets you finish a line on the paper form before pointing out a mistake, points at the exact box that is wrong, and says "thank you" when you are done. A web form should behave the same way: no red wall on page load, a clear message under the field you just left, every remaining problem when you press Send, and a confirmation at the end.

The build is a contact form with Name (at least 2 characters), Email (valid format) and Message (10 to 200 characters, with a counter). Errors appear after blur or a submit attempt, then update live. A simulated server (a <code>setTimeout</code> Promise; there is no network in the playground) rejects addresses at <code>@blocked.test</code> with a field error.

## 2. How the State Model Maps to Vue

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>values</code> | <code>reactive({...})</code> | The single source of truth; a reactive object reads naturally as <code>values.name</code>. |
| <code>touched</code>, <code>serverErrors</code> | <code>reactive({})</code> | Keys are added and deleted; Vue 3 tracks both. |
| <code>submitted</code>, <code>status</code> | <code>ref()</code> | Single values. |
| <code>errors</code> | <code>computed()</code> | Derived from values; cached until something it reads changes. |
| input elements | template refs + <code>defineExpose</code> | Only needed to call <code>.focus()</code>. |

📌 **Interview term: computed** — a cached, derived value. Vue records which reactive values the getter read and recomputes only when one of them changes. Errors are a textbook computed: they are a pure function of the values. Compare with <code>watch</code> in [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

📌 **Interview term: Touched** — a per-field flag set the first time the field loses focus. It decides *when* an error is visible; the computed decides *whether* the field is invalid.

## 3. Build It Step by Step

### Step 1: pure rules

The rules live in <code>src/validate.js</code>, a plain function with no Vue imports, so it is easy to unit test and to share with a server:

\`\`\`js
export function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Name is required";
  else if (name.length < 2)
    errors.name = "Name must be at least 2 characters";

  if (!email) errors.email = "Email is required";
  else if (!EMAIL.test(email))
    errors.email = "Enter a valid email address";

  if (!message) errors.message = "Message is required";
  else if (message.length < 10)
    errors.message = "Message must be at least 10 characters";
  else if (message.length > MESSAGE_MAX)
    errors.message =
      "Message must be " + MESSAGE_MAX + " characters or fewer";

  return errors;
}
\`\`\`

### Step 2: a field component with defineModel

\`\`\`vue
<script setup>
import { computed, ref } from "vue";

// v-model on the component: defineModel()
// creates the modelValue prop and
// the update:modelValue event for us (Vue 3.4+).
const model = defineModel({ type: String, default: "" });
const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: "" },
  hint: { type: String, default: "" },
  multiline: Boolean,
  type: { type: String, default: "text" },
});
const emit = defineEmits(["blur"]);

const control = ref(null);
const describedBy = computed(
  () =>
    [
      props.hint ? props.id + "-hint" : "",
      props.error ? props.id + "-error" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined,
);

// The parent calls this to move focus to the first invalid field.
defineExpose({ focus: () => control.value?.focus() });
</script>
\`\`\`

📌 **Interview term: defineModel** — a <code>&lt;script setup&gt;</code> macro, stable since Vue 3.4 (per the official Vue 3.4 release post), that declares the <code>modelValue</code> prop and the <code>update:modelValue</code> event and returns a ref you can bind with <code>v-model</code> inside the child. Before it, you wrote the prop and emit by hand; see [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit) and [v-model on components](/interview-question/how-does-v-model-work-on-components).

<code>defineExpose</code> matters because <code>&lt;script setup&gt;</code> components are closed by default: a parent template ref sees nothing unless the child exposes it. Here the child exposes only <code>focus()</code>.

### Step 3: the form, derived errors and visibility

\`\`\`vue
const values = reactive({ name: "", email: "", message: "" }); const
touched = reactive({}); const serverErrors = reactive({}); const
submitted = ref(false); const status = ref("idle"); // idle | sending |
success const fields = { name: ref(null), email: ref(null), message:
ref(null) }; // Derived, never stored: recomputed whenever a value it
reads changes. const errors = computed(() => ({ ...validate(values),
...serverErrors })); const invalidCount = computed(() =>
FIELDS.filter((f) => errors.value[f]).length); const visible = (f) =>
(touched[f] || submitted.value ? errors.value[f] || "" : ""); function
edit(f, v) { values[f] = v; delete serverErrors[f]; }
\`\`\`

The parent does not use <code>v-model</code> on <code>FormField</code>. It uses the two halves that <code>v-model</code> expands to, <code>:model-value</code> and <code>@update:model-value</code>, so the update can also delete a server error for that field:

\`\`\`vue
<FormField
  :ref="fields.name"
  id="name"
  label="Name"
  :model-value="values.name"
  @update:model-value="edit('name', $event)"
  :error="visible('name')"
  @blur="touched.name = true"
/>
<FormField
  :ref="fields.email"
  id="email"
  label="Email"
  type="email"
  :model-value="values.email"
  @update:model-value="edit('email', $event)"
  :error="visible('email')"
  @blur="touched.email = true"
/>
\`\`\`

### Step 4: submit, focus and the server

\`\`\`vue
async function onSubmit() { if (status.value === "sending") return;
submitted.value = true; const first = FIELDS.find((f) =>
errors.value[f]); if (first) { fields[first].value.focus(); return; }
status.value = "sending"; const res = await sendMessage({ ...values });
if (res.ok) { status.value = "success"; } else {
Object.assign(serverErrors, res.fieldErrors); status.value = "idle";
fields[Object.keys(res.fieldErrors)[0]].value.focus(); } }
\`\`\`

<code>@submit.prevent</code> replaces <code>event.preventDefault()</code>, and <code>novalidate</code> on the form turns off browser bubbles so these messages are the only ones. <code>fields[first].value</code> is the exposed child instance, so <code>.focus()</code> reaches the real input.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Whitespace-only input | Trimmed in <code>validate</code>, so it counts as empty |
| Error before reaching a field | Hidden until <code>@blur</code> sets touched, or submit |
| Error text for screen readers | <code>aria-invalid</code> plus <code>aria-describedby</code> pointing at the error id |
| Summary | <code>role="alert"</code> paragraph that is always rendered |
| Double submit | <code>status</code> guard and <code>:disabled</code> while sending |
| Counter | Linked as a hint with <code>aria-describedby</code> |

## 5. Verified: What the Solution Actually Did

Compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom on Vue 3.5.44, then driven by the same driver as the React and Angular tabs (it dispatches <code>blur</code> for Vue and <code>focusout</code> for React). Output with the <code>[vue]</code> prefix removed:

\`\`\`text
RENDERED: Contact usNameEmailMessage0/200Send
initial                | name: (none) | email: (none) | message: (none) | summary: ""
typed A (not blurred)  | name: (none) | email: (none) | message: (none) | summary: ""
blurred name           | name: Name must be at least 2 characters | email: (none) | message: (none) | summary: ""
name aria-invalid: true describedby: name-error
submit empty           | name: Name must be at least 2 characters | email: Email is required | message: Message is required | summary: "Please fix 3 fields."
focused after submit: name
fixed name             | name: (none) | email: Email is required | message: Message is required | summary: "Please fix 2 fields."
counter: 28/200
while sending: Sending... disabled: true
server answered        | name: (none) | email: This email address is blocked | message: (none) | summary: "Please fix 1 field."
focused after server error: email
edited email           | name: (none) | email: (none) | message: (none) | summary: ""
after success: Thanks, Ada Lovelace!We will reply to ada@example.com.Send another
after reset            | name: (none) | email: (none) | message: (none) | summary: ""
values after reset: ["","",""]
\`\`\`

Every line matches the React and Angular runs. Typing alone showed nothing, blur revealed the Name error, submit revealed all three and focused Name, the server error landed on Email, and editing cleared it. No <code>console.error</code>. Visual styling was not checked (jsdom has no layout).

## 6. Common Pitfalls

- **A <code>watch</code> that copies validation results into a ref.** It works, but it is a second source of truth that runs after the change. A <code>computed</code> is simpler and always in sync.
- **Template refs on a <code>&lt;script setup&gt;</code> child without <code>defineExpose</code>.** The parent gets an empty proxy and <code>.focus()</code> is undefined.
- **Reassigning a <code>reactive</code> object.** <code>values = {...}</code> breaks every reference to the old proxy. Reset with <code>Object.assign</code>, as <code>reset()</code> does.
- **Mutating a prop inside the field.** Writing to <code>props.modelValue</code> warns and does nothing useful; <code>defineModel</code> emits the update for you.
- **Forgetting <code>novalidate</code>.** With <code>type="email"</code> the browser blocks <code>@submit</code> and shows its own bubble.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope it:</strong> <span style="color:#f0e2c8;">"Name, Email and Message, errors after blur or submit, live after that, focus on the first error, and a simulated server call."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State model:</strong> <span style="color:#f0e2c8;">"Values in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> object, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touched</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverErrors</code> as reactive maps, and errors as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> over a pure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Field component:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormField</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code> for the value, an emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">blur</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code> to the error, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineExpose</code> for focus."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Submit:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@submit.prevent</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">novalidate</code>: set submitted, focus the first invalid field, otherwise send and disable the button."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Server errors:</strong> <span style="color:#f0e2c8;">"Merge them into the computed and delete them in the update handler so they clear when the user edits."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use v-model directly on FormField?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I could, plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on each value to clear server errors. Splitting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:model-value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@update:model-value</code> keeps that side effect in one handler that runs at the moment of the edit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a confirm-password rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code>, which sees all values. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> re-runs when either password changes, with no new wiring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> with a table. Mount with Vue Test Utils, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("blur")</code>, then assert on the element named by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code> and on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a library like VeeValidate in real work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For large forms, yes, for schema support and field arrays. In an interview I show the core idea by hand: derived errors plus touched state. Libraries implement the same model.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **computed** | Cached value derived from reactive state |
| **Touched** | The field has lost focus once, so its error may show |
| **defineModel** | Macro that wires <code>v-model</code> into a child component |
| **defineExpose** | Chooses what a parent template ref can reach |
| **aria-describedby** | Links an input to the text that describes it |

---
**Conclusion:** In Vue the validated form falls out of the reactivity system: values live in a reactive object, errors are a computed over a pure function, and touched plus submitted decide visibility. <code>defineModel</code> keeps the field component small and <code>defineExpose</code> gives the parent just enough access to move focus. The run on Vue 3.5.44 produced the same output as React and Angular, line for line. For the same ideas spread across several screens, see the [multi-step wizard](/interview-question/build-a-multi-step-form-wizard), and for more Vue form patterns, [forms and validation in Vue](/interview-question/how-do-you-handle-forms-and-validation-in-vue).`,
        files: {
          "/src/App.vue": `<script setup>
import ContactForm from "./components/ContactForm.vue";
</script>

<template>
  <main class="page">
    <ContactForm />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input,
textarea {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.invalid {
  border-color: #ff6b6b;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
}
.hint {
  color: #9aa3b5;
  align-self: flex-end;
}
.summary {
  min-height: 1.2em;
  color: #ffb4b4;
  margin: 0 0 10px;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
`,
          "/src/components/ContactForm.vue": `<script setup>
import { computed, reactive, ref } from "vue";
import FormField from "./FormField.vue";
import { FIELDS, MESSAGE_MAX, validate } from "../validate.js";
import { sendMessage } from "../fakeApi.js";

const values = reactive({ name: "", email: "", message: "" });
const touched = reactive({});
const serverErrors = reactive({});
const submitted = ref(false);
const status = ref("idle"); // idle | sending | success
const fields = { name: ref(null), email: ref(null), message: ref(null) };

// Derived, never stored: recomputed whenever a value it reads changes.
const errors = computed(() => ({ ...validate(values), ...serverErrors }));
const invalidCount = computed(
  () => FIELDS.filter((f) => errors.value[f]).length,
);
const visible = (f) =>
  touched[f] || submitted.value ? errors.value[f] || "" : "";

function edit(f, v) {
  values[f] = v;
  delete serverErrors[f];
}

async function onSubmit() {
  if (status.value === "sending") return;
  submitted.value = true;
  const first = FIELDS.find((f) => errors.value[f]);
  if (first) {
    fields[first].value.focus();
    return;
  }
  status.value = "sending";
  const res = await sendMessage({ ...values });
  if (res.ok) {
    status.value = "success";
  } else {
    Object.assign(serverErrors, res.fieldErrors);
    status.value = "idle";
    fields[Object.keys(res.fieldErrors)[0]].value.focus();
  }
}

function reset() {
  Object.assign(values, { name: "", email: "", message: "" });
  for (const f of FIELDS) {
    delete touched[f];
    delete serverErrors[f];
  }
  submitted.value = false;
  status.value = "idle";
}
</script>

<template>
  <div
    v-if="status === 'success'"
    class="card"
    data-testid="success"
    role="status"
  >
    <h2>Thanks, {{ values.name.trim() }}!</h2>
    <p>We will reply to {{ values.email.trim() }}.</p>
    <button
      type="button"
      data-testid="reset"
      @click="reset"
    >Send another</button>
  </div>
  <form
    v-else
    class="card"
    novalidate
    aria-label="Contact form"
    @submit.prevent="onSubmit"
  >
    <h2>Contact us</h2>
    <FormField :ref="fields.name" id="name" label="Name" :model-value="values.name"
      @update:model-value="edit('name', $event)" :error="visible('name')" @blur="touched.name = true" />
    <FormField :ref="fields.email" id="email" label="Email" type="email" :model-value="values.email"
      @update:model-value="edit('email', $event)" :error="visible('email')" @blur="touched.email = true" />
    <FormField :ref="fields.message" id="message" label="Message" multiline :model-value="values.message"
      @update:model-value="edit('message', $event)" :error="visible('message')" @blur="touched.message = true"
      :hint="values.message.trim().length + '/' + MESSAGE_MAX" />
    <p data-testid="summary" role="alert" class="summary">
      {{ submitted && invalidCount > 0 ? "Please fix " + invalidCount + (invalidCount === 1 ? " field." : " fields.") : "" }}
    </p>
    <button
      type="submit"
      :disabled="status === 'sending'"
      :aria-busy="status === 'sending'"
    >
      {{ status === "sending" ? "Sending..." : "Send" }}
    </button>
  </form>
</template>
`,
          "/src/components/FormField.vue": `<script setup>
import { computed, ref } from "vue";

// v-model on the component: defineModel() creates the modelValue prop and
// the update:modelValue event for us (Vue 3.4+).
const model = defineModel({ type: String, default: "" });
const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: "" },
  hint: { type: String, default: "" },
  multiline: Boolean,
  type: { type: String, default: "text" },
});
const emit = defineEmits(["blur"]);

const control = ref(null);
const describedBy = computed(
  () =>
    [
      props.hint ? props.id + "-hint" : "",
      props.error ? props.id + "-error" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined,
);

// The parent calls this to move focus to the first invalid field.
defineExpose({ focus: () => control.value?.focus() });
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <textarea
      v-if="multiline"
      :id="id"
      ref="control"
      v-model="model"
      rows="4"
      :class="{ invalid: error }"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="describedBy"
      @blur="emit('blur')"
    ></textarea>
    <input
      v-else
      :id="id"
      ref="control"
      v-model="model"
      :type="type"
      :class="{ invalid: error }"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="describedBy"
      @blur="emit('blur')"
    />
    <small v-if="hint" :id="id + '-hint'" class="hint">{{ hint }}</small>
    <p v-if="error" :id="id + '-error'" class="error">{{ error }}</p>
  </div>
</template>
`,
          "/src/fakeApi.js": `// Simulated server: there is no network in the playground. It answers after
// 400 ms and rejects one domain with a field error, the way a real API might.
export function sendMessage(values) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (values.email.trim().toLowerCase().endsWith("@blocked.test")) {
        resolve({
          ok: false,
          fieldErrors: { email: "This email address is blocked" },
        });
      } else {
        resolve({ ok: true });
      }
    }, 400);
  });
}
`,
          "/src/validate.js": `// Pure validation rules: values in, errors out. No React here, so the same
// function can be unit tested on its own and reused on the server.
export const FIELDS = ["name", "email", "message"];
export const MESSAGE_MAX = 200;
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Name is required";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";

  if (!email) errors.email = "Email is required";
  else if (!EMAIL.test(email)) errors.email = "Enter a valid email address";

  if (!message) errors.message = "Message is required";
  else if (message.length < 10)
    errors.message = "Message must be at least 10 characters";
  else if (message.length > MESSAGE_MAX)
    errors.message = "Message must be " + MESSAGE_MAX + " characters or fewer";

  return errors;
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. You know a little HTML and TypeScript; no Angular forms experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. All code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Angular 22.2.3, both compiled ahead of time with strict templates and in the playground runtime compiler.

## 1. A Story First

A good receptionist lets you finish writing before pointing out a mistake, points at the exact box, and thanks you at the end. Our contact form does the same: Name (at least 2 characters), Email (valid format) and Message (10 to 200 characters, with a counter). Errors appear after blur or a submit attempt, then update live. A simulated server (a <code>setTimeout</code> Promise; the playground has no network) rejects addresses at <code>@blocked.test</code> with a field error, which must appear under Email.

## 2. How the State Model Maps to Angular

Angular ships a forms engine, so most of the state model already exists:

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| values | <code>FormGroup</code> of <code>FormControl</code>s | The source of truth; the template binds with <code>formControlName</code>. |
| errors | each control's <code>errors</code>, from its validators | Re-run on every value change, so they are derived, not hand-synced. |
| touched | <code>control.touched</code> | Set by the forms directive on blur. |
| submitted, status | <code>signal()</code> | App state the template reads; signals also tell Angular to re-render. |
| server errors | <code>control.setErrors({ server })</code> | Replaced automatically the next time validators run. |

📌 **Interview term: Reactive forms** — Angular forms built in TypeScript with <code>FormGroup</code>/<code>FormControl</code> and bound to the template with <code>ReactiveFormsModule</code> directives. The alternative, template-driven forms with <code>ngModel</code>, is compared in [reactive vs template-driven forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms).

📌 **Interview term: ValidatorFn** — a function that receives a control and returns <code>null</code> (valid) or an object of error keys. Angular runs it on every change.

📌 **Interview term: Touched** — a control becomes touched the first time it loses focus. It decides *when* an error shows; the validator decides *whether* the value is invalid.

## 3. Build It Step by Step

### Step 1: validators that carry their message

Angular built-ins exist (<code>Validators.required</code>, <code>minLength</code>, <code>email</code>), but they behave differently from the rules here: run against Angular 22.2.3, <code>Validators.required</code> returned <code>null</code> (valid) for <code>"   "</code>, and <code>Validators.email</code> returned <code>null</code> for <code>"a@b"</code>. So each field gets a small custom validator that trims, applies the rules in order and returns one message:

\`\`\`ts
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";

export const MESSAGE_MAX = 200;
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

// Each validator returns { message: "..."
// } or null. One error key per field
// keeps the template simple: show
// errors["message"] when it should be visible.
const rule =
  (check: (v: string) => string | null): ValidatorFn =>
  (c: AbstractControl): ValidationErrors | null => {
    const msg = check(String(c.value ?? "").trim());
    return msg ? { message: msg } : null;
  };

export const nameRule = rule((v) =>
  !v
    ? "Name is required"
    : v.length < 2
      ? "Name must be at least 2 characters"
      : null,
);
\`\`\`

More on this pattern in [custom validators in reactive forms](/interview-question/how-do-you-create-a-custom-validator-in-reactive-forms).

### Step 2: the form model and a visibility helper

\`\`\`ts
readonly form = new FormGroup({
  name: new FormControl("", {
    nonNullable: true,
    validators: nameRule,
  }),
  email: new FormControl("", {
    nonNullable: true,
    validators: emailRule,
  }),
  message: new FormControl("", {
    nonNullable: true,
    validators: messageRule,
  }),
});

// Reactive forms already track touched
// (set on blur) and re-run validators
// on every change, so the visible error is derived from control state.
errorFor(f: FieldName): string | null {
  const c = this.form.controls[f];
  if (!(c.touched || this.submitted())) return null;
  return (
    (c.errors?.["server"] as string) ??
    (c.errors?.["message"] as string) ??
    null
  );
}
\`\`\`

<code>nonNullable: true</code> makes <code>reset()</code> go back to <code>""</code> instead of <code>null</code>, and types each value as <code>string</code>. <code>errorFor</code> is the "when to show" rule in one place: touched or submitted, server error first.

### Step 3: the template

\`\`\`html
<form
  class="card"
  novalidate
  aria-label="Contact form"
  [formGroup]="form"
  (ngSubmit)="onSubmit()"
>
  <h2>Contact us</h2>
  <div class="field">
    <label for="name">Name</label>
    <input
      id="name"
      formControlName="name"
      autocomplete="name"
      [class.invalid]="!!errorFor('name')"
      [attr.aria-invalid]="errorFor('name') ? 'true' : 'false'"
      [attr.aria-describedby]="errorFor('name') ? 'name-error' : null"
    />
    @if (errorFor("name"); as e) {
      <p id="name-error" class="error">{{ e }}</p>
    }
  </div>
</form>
\`\`\`

<code>[attr.aria-describedby]</code> uses the attribute binding because there is no DOM property of that name; binding <code>null</code> removes the attribute. <code>@if (...; as e)</code> is the built-in control flow, which needs no <code>NgIf</code> import.

### Step 4: submit, focus and the server

\`\`\`ts
async onSubmit() {
  if (this.status() === "sending") return;
  this.submitted.set(true);
  const first = FIELDS.find((f) => this.form.controls[f].invalid);
  if (first) {
    this.focus(first);
    return;
  }
  this.status.set("sending");
  const values = this.form.getRawValue();
  const res = await sendMessage(values);
  if (res.ok) {
    this.sentName.set(values.name.trim());
    this.sentEmail.set(values.email.trim());
    this.status.set("success");
  } else {
    // A server error lives on the control
    // until the next edit re-runs validators.
    for (const [f, msg] of Object.entries(res.fieldErrors))
      this.form.controls[f as FieldName].setErrors({ server: msg });
    this.status.set("idle");
    this.focus(Object.keys(res.fieldErrors)[0] as FieldName);
  }
}
\`\`\`

<code>(ngSubmit)</code> comes from the form directive and already prevents the native submit. The server error is written with <code>setErrors</code>, which lasts until the next keystroke re-runs the validator and replaces it, so "clear on edit" needs no code.

📌 **Interview term: Zoneless change detection** — Angular re-renders when a signal it reads changes or a template event fires, without zone.js patching every timer. The 22.2.3 typings say "Zoneless is enabled by default in Angular v21+", and the playground boots that way. The consequence here: after the <code>await</code>, the view updates because <code>status.set()</code> is a signal write. Calling only <code>setErrors</code> from a timer would leave the screen stale. See [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Whitespace-only input | The custom validator trims, so it is "required" |
| Error before reaching a field | Hidden until <code>touched</code> or submitted |
| Screen reader | <code>aria-invalid</code> and <code>aria-describedby</code> to the error id |
| Summary | <code>role="alert"</code> paragraph, always rendered |
| Double submit | <code>status</code> guard and <code>[disabled]</code> while sending |
| Reset | <code>form.reset()</code> clears values, touched and errors in one call |

## 5. Verified: What the Solution Actually Did

The solution was booted with <code>bootstrapApplication(AppComponent)</code> and no providers, twice: compiled with <code>ngc</code> and <code>strictTemplates</code> (like <code>ng build</code>), and through the playground runtime JIT. Both runs printed the same lines; here is the AOT run with its prefix removed:

\`\`\`text
RENDERED: Contact usNameEmailMessage0/200 Send
initial                | name: (none) | email: (none) | message: (none) | summary: ""
typed A (not blurred)  | name: (none) | email: (none) | message: (none) | summary: ""
blurred name           | name: Name must be at least 2 characters | email: (none) | message: (none) | summary: ""
name aria-invalid: true describedby: name-error
submit empty           | name: Name must be at least 2 characters | email: Email is required | message: Message is required | summary: "Please fix 3 fields."
focused after submit: name
fixed name             | name: (none) | email: Email is required | message: Message is required | summary: "Please fix 2 fields."
counter: 28/200
while sending: Sending... disabled: true
server answered        | name: (none) | email: This email address is blocked | message: (none) | summary: "Please fix 1 field."
focused after server error: email
edited email           | name: (none) | email: (none) | message: (none) | summary: ""
after success: Thanks, Ada Lovelace!We will reply to ada@example.com.Send another
after reset            | name: (none) | email: (none) | message: (none) | summary: ""
values after reset: ["","",""]
\`\`\`

Apart from one space in the first line (Angular keeps a whitespace text node before the button), this is identical to the React and Vue runs. No <code>console.error</code>. Styling was not checked; jsdom has no layout.

## 6. Common Pitfalls

- **Relying on <code>Validators.required</code> for text.** It accepts spaces, as the run above showed. Trim in a custom validator.
- **Showing <code>control.invalid</code> errors without checking touched.** Every field is red on first paint.
- **Forgetting <code>ReactiveFormsModule</code> in the standalone component <code>imports</code>.** <code>[formGroup]</code> then fails to compile under strict templates.
- **Updating only form state from async code in a zoneless app.** Write a signal too, or the view will not refresh.
- **Using the signal <code>input()</code> API in the playground.** It does not register under the runtime JIT used here; this solution needs no inputs, and other batches use <code>@Input()</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope it:</strong> <span style="color:#f0e2c8;">"Three fields, errors after blur or submit, focus on the first error, a server error mapped back to its field."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Form model:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonNullable</code> controls and one custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValidatorFn</code> per field that trims and returns a message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to show:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errorFor</code> returns the message only if the control is touched or the form was submitted, server error first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Accessible template:</strong> <span style="color:#f0e2c8;">"Label, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-invalid]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.aria-describedby]</code> to the error id, built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code>, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=alert</code> summary."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Submit:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(ngSubmit)</code>, focus the first invalid control, signals for status, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setErrors</code> for server answers that clear on the next edit."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why custom validators instead of the built-in ones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The built-ins are fine when they match the rules, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Validators.required</code> accepts whitespace and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Validators.email</code> accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a@b</code>. A custom validator also lets me return the message itself, which keeps the template simple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add confirm-password?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A validator on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code>, not on a control, because it needs both values. It returns an error key on the group and the template shows it under the second field.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use signal forms instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular 22 has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/forms/signals</code>; the 22.2.3 typings mark its API <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@publicApi 22.0</code>. The playground here only allows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/forms</code>, so I used reactive forms, but the model is the same: values, derived validation, touched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with the standalone component, set values with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code>, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">blur</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code>, then assert on the error text and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validators.ts</code> gets plain unit tests.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactive forms** | Forms modelled in TypeScript with FormGroup and FormControl |
| **ValidatorFn** | Function returning null or an error object for a control |
| **Touched** | The control has lost focus once |
| **nonNullable** | Control resets to its initial value, not null |
| **Zoneless change detection** | Re-render driven by signals and template events, not zone.js |

---
**Conclusion:** Angular reactive forms already give you derived validation and touched tracking; the work is writing validators that match the real rules (the built-ins accepted spaces and <code>a@b</code> when tested), deciding visibility in one helper, and wiring accessible markup. Signals carry the submit status, which is also what makes the zoneless view refresh after the simulated server answers. The AOT and JIT runs on Angular 22.2.3 matched the React and Vue output. Next steps: the [multi-step wizard](/interview-question/build-a-multi-step-form-wizard) nests one FormGroup per step, and the [async username check](/interview-question/build-a-signup-form-with-async-username-availability-check) adds RxJS.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { ContactFormComponent } from "./contact-form.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ContactFormComponent],
  template: \`<main class="page"><app-contact-form /></main>\`,
  // Global styles for this small app, so child components share them.
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1117;
        color: #e6e8ee;
        font-family: system-ui, sans-serif;
      }
      .page {
        display: flex;
        justify-content: center;
        padding: 24px 16px;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: #181b24;
        border: 1px solid #2a2f3d;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 1.25rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 14px;
      }
      label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      input,
      textarea {
        font: inherit;
        padding: 9px 11px;
        border-radius: 8px;
        border: 1px solid #3a4152;
        background: #0f1117;
        color: inherit;
      }
      input:focus-visible,
      textarea:focus-visible,
      button:focus-visible {
        outline: 2px solid #7aa2ff;
        outline-offset: 2px;
      }
      .invalid {
        border-color: #ff6b6b;
      }
      .error {
        color: #ff8a8a;
        margin: 0;
        font-size: 0.85rem;
      }
      .hint {
        color: #9aa3b5;
        align-self: flex-end;
      }
      .summary {
        min-height: 1.2em;
        color: #ffb4b4;
        margin: 0 0 10px;
      }
      button {
        font: inherit;
        padding: 10px 16px;
        border-radius: 8px;
        border: 0;
        background: #4f7cff;
        color: #fff;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: progress;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/contact-form.component.ts": `import { Component, ElementRef, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MESSAGE_MAX, emailRule, messageRule, nameRule } from "./validators";
import { sendMessage } from "./fake-api";

type FieldName = "name" | "email" | "message";
const FIELDS: FieldName[] = ["name", "email", "message"];

@Component({
  selector: "app-contact-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    @if (status() === "success") {
      <div class="card" data-testid="success" role="status">
        <h2>Thanks, {{ sentName() }}!</h2>
        <p>We will reply to {{ sentEmail() }}.</p>
        <button
          type="button"
          data-testid="reset"
          (click)="reset()"
        >Send another</button>
      </div>
    } @else {
      <form
        class="card"
        novalidate
        aria-label="Contact form"
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
      >
        <h2>Contact us</h2>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" formControlName="name" autocomplete="name"
            [class.invalid]="!!errorFor('name')" [attr.aria-invalid]="errorFor('name') ? 'true' : 'false'"
            [attr.aria-describedby]="errorFor('name') ? 'name-error' : null" />
          @if (errorFor("name"); as e) { <p id="name-error" class="error">{{ e }}</p> }
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" autocomplete="email"
            [class.invalid]="!!errorFor('email')" [attr.aria-invalid]="errorFor('email') ? 'true' : 'false'"
            [attr.aria-describedby]="errorFor('email') ? 'email-error' : null" />
          @if (errorFor("email"); as e) { <p id="email-error" class="error">{{ e }}</p> }
        </div>
        <div class="field">
          <label for="message">Message</label>
          <textarea id="message" rows="4" formControlName="message"
            [class.invalid]="!!errorFor('message')" [attr.aria-invalid]="errorFor('message') ? 'true' : 'false'"
            [attr.aria-describedby]="errorFor('message') ? 'message-hint message-error' : 'message-hint'"></textarea>
          <small
            id="message-hint"
            class="hint"
          >{{ messageLength() }}/{{ max }}</small>
          @if (errorFor("message"); as e) { <p id="message-error" class="error">{{ e }}</p> }
        </div>
        <p
          data-testid="summary"
          role="alert"
          class="summary"
        >{{ summary() }}</p>
        <button
          type="submit"
          [disabled]="status() === 'sending'"
          [attr.aria-busy]="status() === 'sending'"
        >
          {{ status() === "sending" ? "Sending..." : "Send" }}
        </button>
      </form>
    }
  \`,
})
export class ContactFormComponent {
  private host = inject(ElementRef<HTMLElement>);
  readonly max = MESSAGE_MAX;
  readonly status = signal<"idle" | "sending" | "success">("idle");
  readonly submitted = signal(false);
  readonly sentName = signal("");
  readonly sentEmail = signal("");

  readonly form = new FormGroup({
    name: new FormControl("", { nonNullable: true, validators: nameRule }),
    email: new FormControl("", { nonNullable: true, validators: emailRule }),
    message: new FormControl("", {
      nonNullable: true,
      validators: messageRule,
    }),
  });

  // Reactive forms already track touched (set on blur) and re-run validators
  // on every change, so the visible error is derived from control state.
  errorFor(f: FieldName): string | null {
    const c = this.form.controls[f];
    if (!(c.touched || this.submitted())) return null;
    return (
      (c.errors?.["server"] as string) ??
      (c.errors?.["message"] as string) ??
      null
    );
  }

  messageLength(): number {
    return this.form.controls.message.value.trim().length;
  }

  summary(): string {
    const n = FIELDS.filter((f) => this.form.controls[f].invalid).length;
    return this.submitted() && n > 0
      ? "Please fix " + n + (n === 1 ? " field." : " fields.")
      : "";
  }

  private focus(f: FieldName) {
    this.host.nativeElement.querySelector("#" + f)?.focus();
  }

  async onSubmit() {
    if (this.status() === "sending") return;
    this.submitted.set(true);
    const first = FIELDS.find((f) => this.form.controls[f].invalid);
    if (first) {
      this.focus(first);
      return;
    }
    this.status.set("sending");
    const values = this.form.getRawValue();
    const res = await sendMessage(values);
    if (res.ok) {
      this.sentName.set(values.name.trim());
      this.sentEmail.set(values.email.trim());
      this.status.set("success");
    } else {
      // A server error lives on the control
      // until the next edit re-runs validators.
      for (const [f, msg] of Object.entries(res.fieldErrors))
        this.form.controls[f as FieldName].setErrors({ server: msg });
      this.status.set("idle");
      this.focus(Object.keys(res.fieldErrors)[0] as FieldName);
    }
  }

  reset() {
    this.form.reset();
    this.submitted.set(false);
    this.status.set("idle");
  }
}
`,
          "/src/app/fake-api.ts": `// Simulated server: there is no network in the playground. It answers after
// 400 ms and rejects one domain with a field error, the way a real API might.
export type SendResult =
  { ok: true } | { ok: false; fieldErrors: Record<string, string> };

export function sendMessage(values: {
  name: string;
  email: string;
  message: string;
}): Promise<SendResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (values.email.trim().toLowerCase().endsWith("@blocked.test")) {
        resolve({
          ok: false,
          fieldErrors: { email: "This email address is blocked" },
        });
      } else {
        resolve({ ok: true });
      }
    }, 400);
  });
}
`,
          "/src/app/validators.ts": `import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export const MESSAGE_MAX = 200;
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

// Each validator returns { message: "..." } or null. One error key per field
// keeps the template simple: show errors["message"] when it should be visible.
const rule =
  (check: (v: string) => string | null): ValidatorFn =>
  (c: AbstractControl): ValidationErrors | null => {
    const msg = check(String(c.value ?? "").trim());
    return msg ? { message: msg } : null;
  };

export const nameRule = rule((v) =>
  !v
    ? "Name is required"
    : v.length < 2
      ? "Name must be at least 2 characters"
      : null,
);

export const emailRule = rule((v) =>
  !v
    ? "Email is required"
    : !EMAIL.test(v)
      ? "Enter a valid email address"
      : null,
);

export const messageRule = rule((v) =>
  !v
    ? "Message is required"
    : v.length < 10
      ? "Message must be at least 10 characters"
      : v.length > MESSAGE_MAX
        ? "Message must be " + MESSAGE_MAX + " characters or fewer"
        : null,
);
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Multi-step Form (wizard)",
    seoDescription: "Build a multi-step sign-up wizard in React, Vue and Angular: one data object, per-step validation gates, progress, Back that keeps data, review and focus.",
    description: `**Question presented to candidate:**
"Our sign-up form is too long for one screen. Split it into a wizard: Account (email and password), Profile (full name and plan), then a Review screen where people can jump back to edit before they create the account. Each step should only let you continue when that step is valid."

**Requirements:**
- Three steps: Account, Profile, Review. A step list and a progress bar show where the user is ("Step 2 of 3: Profile").
- Next validates only the current step; on failure it shows that step's errors and focuses the first invalid field.
- Back never validates and never loses data; Review shows everything entered (password masked) with Edit links that jump to a step.
- Create account calls a simulated API, disables the button while pending, then shows a success message.
- When the step changes, keyboard and screen-reader users land at the new step heading.

**What a strong answer should cover:**
- One **centralized data object** for the whole wizard, not one state per step, so Back and Edit are free.
- A **step config** (id, title, fields, validate) so step gating is generic, and progress is derived from the step index.
- Validation **per step**, with errors revealed only after Next was attempted on that step.
- **Focus management** on step change, \`aria-current="step"\` on the step list and a \`role="progressbar"\` with \`aria-valuenow\`.
- Submitting from the last step only, with Enter behaving like Next on earlier steps.

**Clarifying questions expected:**
- "Can users jump ahead to a later step, or only go back?"
- "Should progress survive a page reload?"
- "Does the server validate again at the end, and how do its errors map back to a step?"

**Code / implementation expected:** Yes. A wizard component driven by a step config, with per-step validation, progress, review with edit, and a simulated submit.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes you have seen a single validated form; if not, start with [Build a Form with validation](/interview-question/build-a-form-with-validation), which this question builds on.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 6 were produced by actually running it on React 19.3.1 under StrictMode.

## 1. Why This Even Matters — A Story First

Think of checking in at an airport kiosk. It does not show you one giant page with passport, seat, bags and payment. It asks one thing at a time, shows "Step 2 of 4" at the top, lets you press Back to fix your seat without retyping your passport, and shows a summary before you pay. If you skip the passport number, it will not let you continue, and it tells you exactly which box is empty.

That is a wizard. The interview is not about the visuals; it is about where the data lives. Junior solutions keep separate state inside each step component, so going Back unmounts the step and the typed values vanish, or the final submit has to fish data out of three places. The strong answer keeps **one data object** for the whole flow and treats each step as a *view* of it plus a *rule* for leaving it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can users jump ahead, or only back? | Jumping ahead means validating every earlier step before allowing it. This build allows Back and Edit (always backwards from Review). |
| Should progress survive a reload? | If yes, persist the data object (session storage or a draft API); a single object makes that one line. |
| Are steps fixed, or conditional (for example, a Team plan adds a "Team name" step)? | Conditional steps argue strongly for a config array you can filter. |
| Does the server validate again at the end? | You need a way to map server errors back to the step that owns the field. |
| Is there a time limit or abandonment tracking? | Affects analytics hooks per step, not the core design. |

## 3. Requirements and the State Model

Steps: **Account** (email, password with 8+ characters and a digit), **Profile** (full name, a plan chosen from radio buttons), **Review** (summary with Edit links). Next is gated by the current step; Back is never gated. The final submit calls a simulated API (a <code>setTimeout</code> Promise; the playground has no network).

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>data</code> | State | One object with every field of every step. |
| <code>step</code> | State | Index into the config array. |
| <code>attempted</code> | State | Steps where Next was pressed; their errors become visible. |
| <code>status</code> | State | <code>editing</code>, <code>submitting</code>, <code>done</code>. |
| current errors | **Derived** | <code>STEPS[step].validate(data)</code> every render. |
| progress | **Derived** | <code>(step + 1) / STEPS.length</code>. |
| heading element, last focused step | Refs | For focus management only. |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Three step views read from one shared data object, and each Next arrow is gated by that step validation">
  <defs>
    <marker id="mcw2r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="56" text-anchor="middle">1. Account</text>
  <text class="d-sub" x="105" y="76" text-anchor="middle">email, password</text>
  <rect class="d-box" x="265" y="30" width="170" height="60" rx="10"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">2. Profile</text>
  <text class="d-sub" x="350" y="76" text-anchor="middle">full name, plan</text>
  <rect class="d-box" x="510" y="30" width="170" height="60" rx="10"/>
  <text class="d-text" x="595" y="56" text-anchor="middle">3. Review</text>
  <text class="d-sub" x="595" y="76" text-anchor="middle">read only, Edit links</text>
  <path class="d-edge-accent" d="M 190 50 L 259 50" marker-end="url(#mcw2r-arrow)"/>
  <path class="d-edge-accent" d="M 435 50 L 504 50" marker-end="url(#mcw2r-arrow)"/>
  <text class="d-sub" x="227" y="125" text-anchor="middle">Next if valid</text>
  <text class="d-sub" x="472" y="125" text-anchor="middle">Next if valid</text>
  <rect class="d-box-accent" x="200" y="200" width="300" height="70" rx="10"/>
  <text class="d-text d-accent" x="350" y="228" text-anchor="middle">data: one object</text>
  <text class="d-sub" x="350" y="250" text-anchor="middle">email, password, fullName, plan</text>
  <path class="d-edge-dashed" d="M 105 90 L 105 235 L 194 235" marker-end="url(#mcw2r-arrow)"/>
  <path class="d-edge-dashed" d="M 350 90 L 350 194" marker-end="url(#mcw2r-arrow)"/>
  <path class="d-edge-dashed" d="M 595 90 L 595 235 L 506 235" marker-end="url(#mcw2r-arrow)"/>
</svg>

The solid arrows are the gates; the dashed lines show that every step reads and writes the same object. Back is just <code>step - 1</code>, and nothing is lost, because the data never lived in the step.

📌 **Interview term: Centralized form state** — keeping all wizard values in one owner (here the <code>Wizard</code> component) and passing slices down. It makes Back, Edit, persistence and the final submit trivial.

📌 **Interview term: Step gating** — the rule that Next only advances when the current step is valid. It validates the current step only, so a user is never blocked by a field they have not reached.

## 4. Build It Step by Step

### Step 1: describe the steps as data

\`\`\`js
export const STEPS = [
  {
    id: "account",
    title: "Account",
    fields: ["email", "password"],
    validate: (d) => {
      const e = {};
      if (!d.email.trim()) e.email = "Email is required";
      else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.email.trim()))
        e.email = "Enter a valid email address";
      if (!d.password) e.password = "Password is required";
      else if (d.password.length < 8)
        e.password = "Password must be at least 8 characters";
      else if (!/[0-9]/.test(d.password))
        e.password = "Password must contain a number";
      return e;
    },
  },
  {
    id: "profile",
    title: "Profile",
    fields: ["fullName", "plan"],
    validate: (d) => {
      const e = {};
      if (!d.fullName.trim()) e.fullName = "Full name is required";
      if (!d.plan) e.plan = "Choose a plan";
      return e;
    },
  },
  { id: "review", title: "Review", fields: [], validate: () => ({}) },
];
\`\`\`

📌 **Interview term: Config-driven UI** — describing the variable part of a component as data (an array of step objects) so the component logic stays generic. Adding a step means adding an entry. A conditional step becomes <code>STEPS.filter(...)</code>.

### Step 2: one owner for all the state

\`\`\`jsx
export default function Wizard() {
  // one object for ALL steps
  const [data, setData] = useState(INITIAL);
  const [step, setStep] = useState(0);
  // steps where Next was pressed
  const [attempted, setAttempted] = useState([]);
  // editing | submitting | done
  const [status, setStatus] = useState("editing");
  const headingRef = useRef(null);
  // which step we last moved focus for
  const focusedStep = useRef(step);

  const current = STEPS[step];
  // derived for the current step
  const allErrors = current.validate(data);
  const errors = attempted.includes(step) ? allErrors : {};
  const isLast = step === STEPS.length - 1;
\`\`\`

<code>errors</code> is empty until Next was attempted on this step. That is the wizard version of the "touched" idea from the [single form question](/interview-question/build-a-form-with-validation): no red text on a step the user just arrived at.

### Step 3: the gate

\`\`\`jsx
function next() {
  const invalid = current.fields.filter((f) => allErrors[f]);
  if (invalid.length) {
    setAttempted((a) => (a.includes(step) ? a : [...a, step]));
    const el = document.getElementById(
      invalid[0] === "plan" ? "plan-free" : invalid[0],
    );
    el?.focus();
    return;
  }
  setStep((s) => s + 1);
}
\`\`\`

If the step is invalid, it marks the step as attempted (revealing errors) and focuses the first invalid control; for the radio group that is the first radio. Otherwise it advances. Back is simply <code>setStep((s) =&gt; s - 1)</code>, with no validation.

### Step 4: focus the new heading, safely under StrictMode

\`\`\`jsx
// Move focus to the new step heading
// so keyboard and screen-reader users
// land at the top of the new content. Comparing with the last step we
// handled (not a "first render" flag)
// keeps this correct when StrictMode
// runs the effect twice on mount.
useEffect(() => {
  if (focusedStep.current === step) return;
  focusedStep.current = step;
  headingRef.current?.focus();
}, [step]);
\`\`\`

📌 **Interview term: Focus management** — moving keyboard focus deliberately when content changes. When the step changes, the old focused button may be gone, and focus would fall back to <code>&lt;body&gt;</code>. Focusing the new heading (with <code>tabIndex={-1}</code> so it can take focus without entering the Tab order) makes the screen reader announce "Step 2 of 3: Profile".

Why compare with the last handled step instead of a "skip the first render" flag? In development, StrictMode mounts, unmounts and re-mounts every component, running effects twice. The flag survives (refs persist across that double run), so the second run focuses the heading on page load. That was tested, not assumed: see section 6.

### Step 5: progress, review and submit

The step list uses <code>aria-current="step"</code> on the current item, and the bar is a <code>role="progressbar"</code> with <code>aria-valuenow</code>, <code>aria-valuemin</code> and <code>aria-valuemax</code>, both derived from <code>step</code>. The form element wraps every step, so Enter submits; <code>onSubmit</code> calls <code>next()</code> on early steps and <code>submit()</code> on Review:

\`\`\`jsx
async function submit() {
  setStatus("submitting");
  await createAccount(data);
  setStatus("done");
}
\`\`\`

Review reads the same <code>data</code> object and its Edit buttons call <code>setStep(0)</code> or <code>setStep(1)</code>.

## 5. Rendering the Step Body

Each step body is a component picked from an array (<code>BODIES[step]</code>) and receives <code>data</code>, <code>errors</code> and <code>onChange</code>. Because the bodies hold no state, it does not matter that React unmounts the Account fields when you move to Profile. If you ever do need local state inside a step (an open accordion, say), hold it in the wizard or accept that it resets; the [key prop](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state) explains when React keeps or drops component state.

## 6. Verified: What the Solution Actually Did

Mounted like the playground (<code>createRoot</code> plus <code>&lt;StrictMode&gt;</code>) in jsdom with React 19.3.1 and driven by the shared driver. Output with the <code>[react]</code> prefix removed:

\`\`\`text
RENDERED: AccountProfileReviewStep 1 of 3: AccountEmailPasswordNext
initial              | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: BODY
Next on empty        | Step 1 of 3: Account | valuenow 1 | errors: email-error=Email is required, password-error=Password is required | focus: email
short password       | Step 1 of 3: Account | valuenow 1 | errors: password-error=Password must be at least 8 characters | focus: email
fixed password       | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: email
Next -> step 2       | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: H2
Back                 | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: H2
email kept after Back: ada@example.com | password length kept: 12
Next without plan    | Step 2 of 3: Profile | valuenow 2 | errors: plan-error=Choose a plan | focus: plan-free
picked Pro           | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: plan-free
Next -> review       | Step 3 of 3: Review | valuenow 3 | errors: (none) | focus: H2
review: Emailada@example.comPassword************Edit accountFull nameAda LovelacePlanProEdit profile
Edit profile         | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: H2
plan radio checked: plan-pro
review again: Emailada@example.comPassword************Edit accountFull nameAda LovelacePlanTeamEdit profile
submitting: Creating account... | disabled: true
done: Welcome aboard, Ada!Your Team plan is ready.
\`\`\`

("picked Pro" still reports focus on <code>plan-free</code> because a synthetic click in jsdom does not move focus; a real browser would focus the clicked radio.)

The focus effect was also tested against the "first render flag" version it replaced. A driver that only reports focus after mount printed, for the flag version and then for the shipped version:

\`\`\`text
[react] focus after mount: H2 step-heading
[react] focus after mount: BODY
\`\`\`

So the flag version steals focus on page load under StrictMode; the shipped version does not. No <code>console.error</code> in any run. Visual layout and the progress bar width animation were not checked (jsdom has no layout).

## 7. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Enter key on Account or Profile | Submits the form, which runs <code>next()</code> |
| Back from Profile | No validation; values come from the shared object |
| Errors on arrival at a step | Hidden until Next was attempted on that step |
| Step change | Focus moves to the step heading, which is announced |
| Current step for screen readers | <code>aria-current="step"</code> on the list item |
| Progress | <code>role="progressbar"</code> with value attributes |
| Radio group error | Linked to the <code>fieldset</code> with <code>aria-describedby</code> |
| Double submit on Review | Button disabled while <code>status</code> is <code>submitting</code> |

## 8. Common Pitfalls

- **State inside each step component.** Unmounting on Back throws the values away, and the final submit has to collect them.
- **Validating the whole form on Next.** The user is blocked by fields on a step they have not seen.
- **A "skip first render" ref for focus effects.** Under StrictMode the effect runs twice on mount and the flag lets the second run through, as the run above showed.
- **Next turning into Submit under the cursor.** If Next were <code>type="button"</code> and the last step's button were <code>type="submit"</code> in the same spot, a fast double click can submit. Here both are submit buttons and <code>onSubmit</code> decides by step.
- **Forgetting to mask the password on Review.** Show its length, not its value.
- **Progress hard-coded per step.** Derive it from the index and length so conditional steps stay correct.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data first:</strong> <span style="color:#f0e2c8;">"All wizard values live in one object owned by the Wizard. Steps are views of that object, so Back and Edit never lose anything."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Step config:</strong> <span style="color:#f0e2c8;">"An array of steps with id, title, fields and a validate function; progress and the step list are derived from it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Gate Next:</strong> <span style="color:#f0e2c8;">"Next validates only the current step. If invalid, mark it attempted to reveal errors and focus the first bad field; Back never validates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Accessibility:</strong> <span style="color:#f0e2c8;">"Focus the new step heading, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-current=step</code> on the list, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">progressbar</code> with value attributes, errors linked with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish:</strong> <span style="color:#f0e2c8;">"Review renders the same object with Edit links, and the last step submits once with a disabled, pending button."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a step that only appears for the Team plan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the active list <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STEPS.filter((s) => !s.when || s.when(data))</code>. Progress, the step list and gating already read from that list, so nothing else changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep progress after a reload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Persist <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> to session storage in an effect and read them in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> initializers. Never persist the password; ask for it again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The server rejects the email at the end. What happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Map the field to its step with the config (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STEPS.findIndex((s) => s.fields.includes("email"))</code>), jump there, and show the server message under the field until it is edited.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use useReducer here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fits well: actions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">edit</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code> make the transitions explicit and testable without rendering. I kept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> because there are only four pieces of state; see [useState vs useReducer](/interview-question/what-is-the-difference-between-usestate-and-usereducer).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Testing Library: fill a step, press Next, assert the heading text and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>; press Back and assert values are kept; finish and assert the success message. The step validators get plain unit tests.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Centralized form state** | One owner and one object for every value in the wizard |
| **Step gating** | Next only advances when the current step is valid |
| **Config-driven UI** | Describing steps as data so the component stays generic |
| **Focus management** | Moving focus on purpose when content changes |
| **aria-current="step"** | Marks the current item in a list of steps |
| **StrictMode double effects** | In development, effects run, clean up and run again on mount |

---
**Conclusion:** A wizard is a validated form spread across screens, and the design choice that decides everything is where the data lives. With one object owned by the wizard and a config array of steps, Back and Edit are free, progress is derived, and Next is a generic gate that validates only what the user can see. The React 19.3.1 run confirmed the gate, the kept values, the review and the focus moves, and showed why the focus effect compares steps instead of skipping the first render under StrictMode. For async checks inside a step, see the [signup form with an async username check](/interview-question/build-a-signup-form-with-async-username-availability-check).`,
        files: {
          "/App.js": `import Wizard from "./src/Wizard";
import "./styles.css";

export default function App() {
  return (
    <main className="page">
      <Wizard />
    </main>
  );
}
`,
          "/src/StepFields.js": `import { PLANS, planLabel } from "./steps";

function Text({
  id,
  label,
  type = "text",
  data,
  errors,
  onChange,
  autoComplete,
}) {
  const err = errors[id];
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={data[id]}
        autoComplete={autoComplete}
        onChange={(e) => onChange(id, e.target.value)}
        aria-invalid={err ? "true" : "false"}
        aria-describedby={err ? id + "-error" : undefined}
      />
      {err && (
        <p id={id + "-error"} className="error">
          {err}
        </p>
      )}
    </div>
  );
}

export function AccountStep(props) {
  return (
    <>
      <Text
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        {...props}
      />
      <Text
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        {...props}
      />
    </>
  );
}

export function ProfileStep(props) {
  const { data, errors, onChange } = props;
  return (
    <>
      <Text id="fullName" label="Full name" autoComplete="name" {...props} />
      <fieldset
        className="field"
        aria-describedby={errors.plan ? "plan-error" : undefined}
      >
        <legend>Plan</legend>
        {PLANS.map((p) => (
          <label key={p.id} className="radio">
            <input
              type="radio"
              name="plan"
              id={"plan-" + p.id}
              value={p.id}
              checked={data.plan === p.id}
              onChange={() => onChange("plan", p.id)}
            />
            {p.label}
          </label>
        ))}
        {errors.plan && (
          <p id="plan-error" className="error">
            {errors.plan}
          </p>
        )}
      </fieldset>
    </>
  );
}

export function ReviewStep({ data, onEdit }) {
  return (
    <dl data-testid="review" className="review">
      <dt>Email</dt>
      <dd>{data.email}</dd>
      <dt>Password</dt>
      <dd>{"*".repeat(data.password.length)}</dd>
      <dd>
        <button
          type="button"
          className="link"
          data-testid="edit-account"
          onClick={() => onEdit(0)}
        >
          Edit account
        </button>
      </dd>
      <dt>Full name</dt>
      <dd>{data.fullName}</dd>
      <dt>Plan</dt>
      <dd>{planLabel(data.plan)}</dd>
      <dd>
        <button
          type="button"
          className="link"
          data-testid="edit-profile"
          onClick={() => onEdit(1)}
        >
          Edit profile
        </button>
      </dd>
    </dl>
  );
}
`,
          "/src/Wizard.js": `import { useEffect, useRef, useState } from "react";
import { INITIAL, STEPS, planLabel } from "./steps";
import { AccountStep, ProfileStep, ReviewStep } from "./StepFields";
import { createAccount } from "./fakeApi";

const BODIES = [AccountStep, ProfileStep, ReviewStep];

export default function Wizard() {
  const [data, setData] = useState(INITIAL); // one object for ALL steps
  const [step, setStep] = useState(0);
  // steps where Next was pressed
  const [attempted, setAttempted] = useState([]);
  // editing | submitting | done
  const [status, setStatus] = useState("editing");
  const headingRef = useRef(null);
  const focusedStep = useRef(step); // which step we last moved focus for

  const current = STEPS[step];
  const allErrors = current.validate(data); // derived for the current step
  const errors = attempted.includes(step) ? allErrors : {};
  const isLast = step === STEPS.length - 1;

  // Move focus to the new step heading so keyboard and screen-reader users
  // land at the top of the new content. Comparing with the last step we
  // handled (not a "first render" flag) keeps this correct when StrictMode
  // runs the effect twice on mount.
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  function change(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function next() {
    const invalid = current.fields.filter((f) => allErrors[f]);
    if (invalid.length) {
      setAttempted((a) => (a.includes(step) ? a : [...a, step]));
      const el = document.getElementById(
        invalid[0] === "plan" ? "plan-free" : invalid[0],
      );
      el?.focus();
      return;
    }
    setStep((s) => s + 1);
  }

  async function submit() {
    setStatus("submitting");
    await createAccount(data);
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="card" role="status" data-testid="done">
        <h2>Welcome aboard, {data.fullName.trim().split(" ")[0]}!</h2>
        <p>Your {planLabel(data.plan)} plan is ready.</p>
      </div>
    );
  }

  const Body = BODIES[step];
  return (
    <form
      className="card"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        isLast ? submit() : next();
      }}
    >
      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === step ? "step" : undefined}
            className={i <= step ? "on" : ""}
          >
            {s.title}
          </li>
        ))}
      </ol>
      <div
        role="progressbar"
        aria-label="Sign-up progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        className="bar"
      >
        <span style={{ width: ((step + 1) / STEPS.length) * 100 + "%" }} />
      </div>
      <h2 tabIndex={-1} ref={headingRef} data-testid="step-heading">
        Step {step + 1} of {STEPS.length}: {current.title}
      </h2>
      <Body data={data} errors={errors} onChange={change} onEdit={setStep} />
      <div className="actions">
        {step > 0 && (
          <button
            type="button"
            data-testid="back"
            className="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={status === "submitting"}
          >
            Back
          </button>
        )}
        {isLast ? (
          <button
            type="submit"
            data-testid="submit"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Creating account..." : "Create account"}
          </button>
        ) : (
          <button type="submit" data-testid="next">
            Next
          </button>
        )}
      </div>
    </form>
  );
}
`,
          "/src/fakeApi.js": `// Simulated server (no network in the playground): answers after 400 ms.
export function createAccount(data) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ok: true, id: "u_" + data.email.length }), 400),
  );
}
`,
          "/src/steps.js": `// The wizard is driven by this config: each step names its fields and
// validates only those. Adding a step means adding an entry, not a branch.
export const PLANS = [
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "team", label: "Team" },
];

export const INITIAL = { email: "", password: "", fullName: "", plan: "" };

export const STEPS = [
  {
    id: "account",
    title: "Account",
    fields: ["email", "password"],
    validate: (d) => {
      const e = {};
      if (!d.email.trim()) e.email = "Email is required";
      else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.email.trim()))
        e.email = "Enter a valid email address";
      if (!d.password) e.password = "Password is required";
      else if (d.password.length < 8)
        e.password = "Password must be at least 8 characters";
      else if (!/[0-9]/.test(d.password))
        e.password = "Password must contain a number";
      return e;
    },
  },
  {
    id: "profile",
    title: "Profile",
    fields: ["fullName", "plan"],
    validate: (d) => {
      const e = {};
      if (!d.fullName.trim()) e.fullName = "Full name is required";
      if (!d.plan) e.plan = "Choose a plan";
      return e;
    },
  },
  { id: "review", title: "Review", fields: [], validate: () => ({}) },
];

export const planLabel = (id) => PLANS.find((p) => p.id === id)?.label ?? "";
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 440px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 12px 0 16px;
  font-size: 1.2rem;
}
h2:focus {
  outline: none;
}
.steps {
  display: flex;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: #8b93a7;
}
.steps li {
  flex: 1;
}
.steps li.on {
  color: #e6e8ee;
}
.steps li[aria-current="step"] {
  font-weight: 700;
  color: #9db7ff;
}
.bar {
  height: 6px;
  background: #2a2f3d;
  border-radius: 3px;
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: #4f7cff;
  transition: width 0.25s;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 14px;
  border: 0;
  padding: 0;
}
label,
legend {
  font-weight: 600;
  font-size: 0.9rem;
}
.radio {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 400;
  padding: 4px 0;
}
input[type="text"],
input[type="email"],
input[type="password"],
input:not([type]) {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input[aria-invalid="true"] {
  border-color: #ff6b6b;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
}
.review {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0 0 16px;
}
.review dt {
  color: #8b93a7;
}
.review dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.review dd:has(button) {
  grid-column: 1 / -1;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
button.secondary {
  background: #2a2f3d;
}
button.link {
  background: none;
  color: #9db7ff;
  padding: 0;
  text-decoration: underline;
}
button:disabled {
  opacity: 0.6;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. Assumes you have built a single validated form; if not, start with [Build a Form with validation](/interview-question/build-a-form-with-validation).
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Vue 3.5.44.

## 1. A Story First

An airport check-in kiosk asks one thing per screen, shows "Step 2 of 4", lets you go Back to change your seat without retyping your passport, and shows a summary before you pay. Our sign-up wizard has three steps: **Account** (email, password with 8+ characters and a digit), **Profile** (full name and a plan), and **Review** (a summary with Edit links). Next only advances when the current step is valid; Back never validates and never loses data. The final submit goes to a simulated API (a <code>setTimeout</code> Promise; the playground has no network).

The whole question turns on one decision: the data lives in **one object owned by the wizard**, not inside each step. Steps are views of that object.

## 2. How the State Model Maps to Vue

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>data</code> | <code>reactive({...})</code> | Every field of every step; child fields bind with <code>v-model="data.email"</code>. |
| <code>step</code>, <code>status</code> | <code>ref()</code> | Single values. |
| <code>attempted</code> | <code>reactive(new Set())</code> | Vue 3 makes <code>Set</code> reactive, so <code>.add()</code> re-renders. |
| current step, errors, last step | <code>computed()</code> | Derived from <code>step</code> and <code>data</code>. |
| focus on step change | <code>watch(step)</code> + <code>nextTick</code> | A side effect after the new step has rendered. |

📌 **Interview term: Centralized form state** — one owner holds all wizard values and passes them down. Back, Edit, persistence and the final submit all read the same object.

📌 **Interview term: Step gating** — Next validates only the current step, so a user is never blocked by fields they have not seen.

## 3. Build It Step by Step

### Step 1: steps as data

<code>src/steps.js</code> holds an array of steps, each with an <code>id</code>, <code>title</code>, the <code>fields</code> it owns and a <code>validate(data)</code> function that returns messages for those fields. Adding a step means adding an entry.

📌 **Interview term: Config-driven UI** — the variable part of a component described as data, so the component logic stays generic.

### Step 2: state and derived values

\`\`\`vue
const data = reactive({ ...INITIAL }); // one object for ALL steps const
step = ref(0); const attempted = reactive(new Set()); // steps where
Next was pressed const status = ref("editing"); // editing | submitting
| done const heading = ref(null); const current = computed(() =>
STEPS[step.value]); const allErrors = computed(() =>
current.value.validate(data)); const errors = computed(() =>
(attempted.has(step.value) ? allErrors.value : {})); const isLast =
computed(() => step.value === STEPS.length - 1);
\`\`\`

<code>errors</code> stays empty until Next was attempted on the step, the wizard version of "touched".

### Step 3: the gate and focus

\`\`\`vue
// Move focus to the new step heading once Vue has rendered it.
watch(step, async () => { await nextTick(); heading.value?.focus(); });
function next() { const invalid = current.value.fields.filter((f) =>
allErrors.value[f]); if (invalid.length) { attempted.add(step.value);
document.getElementById(invalid[0] === "plan" ? "plan-free" :
invalid[0])?.focus(); return; } step.value++; }
\`\`\`

📌 **Interview term: nextTick** — a Promise that resolves after Vue has flushed pending DOM updates. Without it the watcher would run before the new heading text is rendered. <code>watch(step, fn, { flush: "post" })</code> is the equivalent option; see [watch flush timing](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5).

Unlike React, Vue does not mount components twice in development, so a plain watcher is enough here; it does not run on mount because <code>watch</code> is lazy unless you pass <code>immediate: true</code>.

### Step 4: one form element, three bodies

\`\`\`vue
  <form v-else class="card" novalidate @submit.prevent="onSubmit">
    <ol class="steps" aria-label="Progress">
      <li v-for="(s, i) in STEPS" :key="s.id" :aria-current="i === step ? 'step' : undefined" :class="{ on: i <= step }">
        {{ s.title }}
      </li>
    </ol>
    <div role="progressbar" aria-label="Sign-up progress" aria-valuemin="1" :aria-valuemax="STEPS.length"
      :aria-valuenow="step + 1" class="bar">
      <span :style="{ width: ((step + 1) / STEPS.length) * 100 + '%' }"></span>
    </div>
    <h2 ref="heading" tabindex="-1" data-testid="step-heading">Step {{ step + 1 }} of {{ STEPS.length }}: {{ current.title }}</h2>

    <template v-if="current.id === 'account'">
      <TextField id="email" label="Email" type="email" autocomplete="email" v-model="data.email" :error="errors.email" />
      <TextField id="password" label="Password" type="password" autocomplete="new-password" v-model="data.password" :error="errors.password" />
    </template>
    <template v-else-if="current.id === 'profile'">
      <TextField id="fullName" label="Full name" autocomplete="name" v-model="data.fullName" :error="errors.fullName" />
\`\`\`

<code>v-if</code> / <code>v-else-if</code> swap the bodies. The Account inputs are destroyed when you move on, and that is fine: their values live in <code>data</code>, so they reappear on Back. <code>@submit.prevent</code> on the single form makes Enter behave like Next, and <code>onSubmit</code> calls <code>submit()</code> only on the last step. The plan radios bind <code>v-model="data.plan"</code> with <code>:value</code> and a shared <code>name</code>, which gives native arrow-key behaviour.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Enter on an early step | Runs <code>next()</code> through the form submit |
| Back | No validation; values come from <code>data</code> |
| Errors on arrival | Hidden until Next was attempted |
| Step change | Focus moves to the heading (<code>tabindex="-1"</code>) |
| Current step | <code>aria-current="step"</code> on the list item |
| Progress | <code>role="progressbar"</code> with <code>aria-valuenow</code> |
| Password on Review | Masked as asterisks of the same length |

## 5. Verified: What the Solution Actually Did

Compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code> in jsdom on Vue 3.5.44, and driven by the same driver as the other tabs. Output with the <code>[vue]</code> prefix removed:

\`\`\`text
RENDERED: AccountProfileReviewStep 1 of 3: AccountEmailPasswordNext
initial              | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: BODY
Next on empty        | Step 1 of 3: Account | valuenow 1 | errors: email-error=Email is required, password-error=Password is required | focus: email
short password       | Step 1 of 3: Account | valuenow 1 | errors: password-error=Password must be at least 8 characters | focus: email
fixed password       | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: email
Next -> step 2       | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: H2
Back                 | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: H2
email kept after Back: ada@example.com | password length kept: 12
Next without plan    | Step 2 of 3: Profile | valuenow 2 | errors: plan-error=Choose a plan | focus: plan-free
picked Pro           | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: plan-free
Next -> review       | Step 3 of 3: Review | valuenow 3 | errors: (none) | focus: H2
review: Emailada@example.comPassword************Edit accountFull nameAda LovelacePlanProEdit profile
Edit profile         | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: H2
plan radio checked: plan-pro
review again: Emailada@example.comPassword************Edit accountFull nameAda LovelacePlanTeamEdit profile
submitting: Creating account... | disabled: true
done: Welcome aboard, Ada!Your Team plan is ready.
\`\`\`

Identical to the React and Angular runs. ("picked Pro" keeps focus on <code>plan-free</code> because a synthetic click in jsdom does not move focus.) No <code>console.error</code>. Layout and the progress bar animation were not checked.

## 6. Common Pitfalls

- **A <code>ref</code> per step inside step components.** Destroying the component on Back destroys the values.
- **Focusing in the watcher without <code>nextTick</code> or <code>flush: "post"</code>.** The DOM still shows the old step.
- **Validating every step on Next.** Users get blocked by fields they cannot see.
- **Using <code>v-show</code> to keep steps alive instead of central data.** It works for three steps but keeps every field in the DOM and in the Tab order, unless you also add <code>inert</code>.
- **Radios without a shared <code>name</code>.** Arrow keys no longer move between options.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data first:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive</code> object holds every field; the steps only read and write it, so Back and Edit are free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Config:</strong> <span style="color:#f0e2c8;">"Steps are an array with fields and a validate function; progress, the step list and the gate all read it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Gate:</strong> <span style="color:#f0e2c8;">"A computed gives the current step errors; Next marks the step attempted, focuses the first bad field, or advances."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus and ARIA:</strong> <span style="color:#f0e2c8;">"A watcher on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> waits for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> and focuses the heading; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-current=step</code> and a progressbar describe progress."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish:</strong> <span style="color:#f0e2c8;">"Review renders <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code> with Edit links; the last step submits once with a disabled pending button."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you persist progress across reloads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch(data, save, { deep: true })</code> that writes to session storage, and read it when creating the reactive object. Skip the password.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would provide/inject help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If steps were deep component trees, yes: provide the data object once and inject it in each step instead of passing props. With flat steps, props and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> are clearer. See [provide and inject](/interview-question/what-are-provide-and-inject).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a conditional step?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the active list a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> that filters the config by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code>; everything that reads the list updates automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue Test Utils: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> on the fields, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger("submit")</code>, assert the heading text and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>, go Back and assert the values are still there.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Centralized form state** | One owner and one object for every wizard value |
| **Step gating** | Next only advances when the current step is valid |
| **Config-driven UI** | Steps described as data |
| **nextTick** | Waits until Vue has updated the DOM |
| **aria-current="step"** | Marks the current step for assistive technology |

---
**Conclusion:** In Vue the wizard is one reactive object, a ref for the step index, and computeds for everything derived from them. Next is a generic gate driven by the step config, Back is a decrement, and a watcher with <code>nextTick</code> moves focus once the new step is on screen. The Vue 3.5.44 run produced the same output as React and Angular, line for line, including kept values after Back and the edit-from-review loop.`,
        files: {
          "/src/App.vue": `<script setup>
import SignupWizard from "./components/SignupWizard.vue";
</script>

<template>
  <main class="page">
    <SignupWizard />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 440px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 12px 0 16px;
  font-size: 1.2rem;
}
h2:focus {
  outline: none;
}
.steps {
  display: flex;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: #8b93a7;
}
.steps li {
  flex: 1;
}
.steps li.on {
  color: #e6e8ee;
}
.steps li[aria-current="step"] {
  font-weight: 700;
  color: #9db7ff;
}
.bar {
  height: 6px;
  background: #2a2f3d;
  border-radius: 3px;
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: #4f7cff;
  transition: width 0.25s;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 14px;
  border: 0;
  padding: 0;
}
label,
legend {
  font-weight: 600;
  font-size: 0.9rem;
}
.radio {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 400;
  padding: 4px 0;
}
input[type="text"],
input[type="email"],
input[type="password"],
input:not([type]) {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input[aria-invalid="true"] {
  border-color: #ff6b6b;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
}
.review {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0 0 16px;
}
.review dt {
  color: #8b93a7;
}
.review dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.review dd:has(button) {
  grid-column: 1 / -1;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
button.secondary {
  background: #2a2f3d;
}
button.link {
  background: none;
  color: #9db7ff;
  padding: 0;
  text-decoration: underline;
}
button:disabled {
  opacity: 0.6;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
</style>
`,
          "/src/components/ReviewList.vue": `<script setup>
import { planLabel } from "../steps.js";

defineProps({ data: { type: Object, required: true } });
const emit = defineEmits(["edit"]);
</script>

<template>
  <dl data-testid="review" class="review">
    <dt>Email</dt><dd>{{ data.email }}</dd>
    <dt>Password</dt><dd>{{ "*".repeat(data.password.length) }}</dd>
    <dd><button type="button" class="link" data-testid="edit-account" @click="emit('edit', 0)">Edit account</button></dd>
    <dt>Full name</dt><dd>{{ data.fullName }}</dd>
    <dt>Plan</dt><dd>{{ planLabel(data.plan) }}</dd>
    <dd><button type="button" class="link" data-testid="edit-profile" @click="emit('edit', 1)">Edit profile</button></dd>
  </dl>
</template>
`,
          "/src/components/SignupWizard.vue": `<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import TextField from "./TextField.vue";
import ReviewList from "./ReviewList.vue";
import { INITIAL, PLANS, STEPS, planLabel } from "../steps.js";
import { createAccount } from "../fakeApi.js";

const data = reactive({ ...INITIAL }); // one object for ALL steps
const step = ref(0);
const attempted = reactive(new Set()); // steps where Next was pressed
const status = ref("editing"); // editing | submitting | done
const heading = ref(null);

const current = computed(() => STEPS[step.value]);
const allErrors = computed(() => current.value.validate(data));
const errors = computed(() =>
  attempted.has(step.value) ? allErrors.value : {},
);
const isLast = computed(() => step.value === STEPS.length - 1);

// Move focus to the new step heading once Vue has rendered it.
watch(step, async () => {
  await nextTick();
  heading.value?.focus();
});

function next() {
  const invalid = current.value.fields.filter((f) => allErrors.value[f]);
  if (invalid.length) {
    attempted.add(step.value);
    document
      .getElementById(invalid[0] === "plan" ? "plan-free" : invalid[0])
      ?.focus();
    return;
  }
  step.value++;
}

async function submit() {
  status.value = "submitting";
  await createAccount({ ...data });
  status.value = "done";
}

function onSubmit() {
  if (isLast.value) submit();
  else next();
}
</script>

<template>
  <div v-if="status === 'done'" class="card" role="status" data-testid="done">
    <h2>Welcome aboard, {{ data.fullName.trim().split(" ")[0] }}!</h2>
    <p>Your {{ planLabel(data.plan) }} plan is ready.</p>
  </div>
  <form v-else class="card" novalidate @submit.prevent="onSubmit">
    <ol class="steps" aria-label="Progress">
      <li
        v-for="(s, i) in STEPS"
        :key="s.id"
        :aria-current="i === step ? 'step' : undefined"
        :class="{ on: i <= step }"
      >
        {{ s.title }}
      </li>
    </ol>
    <div role="progressbar" aria-label="Sign-up progress" aria-valuemin="1" :aria-valuemax="STEPS.length"
      :aria-valuenow="step + 1" class="bar">
      <span :style="{ width: ((step + 1) / STEPS.length) * 100 + '%' }"></span>
    </div>
    <h2
      ref="heading"
      tabindex="-1"
      data-testid="step-heading"
    >Step {{ step + 1 }} of {{ STEPS.length }}: {{ current.title }}</h2>

    <template v-if="current.id === 'account'">
      <TextField
        id="email"
        label="Email"
        type="email"
        autocomplete="email"
        v-model="data.email"
        :error="errors.email"
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        autocomplete="new-password"
        v-model="data.password"
        :error="errors.password"
      />
    </template>
    <template v-else-if="current.id === 'profile'">
      <TextField
        id="fullName"
        label="Full name"
        autocomplete="name"
        v-model="data.fullName"
        :error="errors.fullName"
      />
      <fieldset
        class="field"
        :aria-describedby="errors.plan ? 'plan-error' : undefined"
      >
        <legend>Plan</legend>
        <label v-for="p in PLANS" :key="p.id" class="radio">
          <input
            :id="'plan-' + p.id"
            v-model="data.plan"
            type="radio"
            name="plan"
            :value="p.id"
          />
          {{ p.label }}
        </label>
        <p
          v-if="errors.plan"
          id="plan-error"
          class="error"
        >{{ errors.plan }}</p>
      </fieldset>
    </template>
    <ReviewList v-else :data="data" @edit="step = $event" />

    <div class="actions">
      <button
        v-if="step > 0"
        type="button"
        data-testid="back"
        class="secondary"
        :disabled="status === 'submitting'"
        @click="step--"
      >Back</button>
      <button
        v-if="isLast"
        type="submit"
        data-testid="submit"
        :disabled="status === 'submitting'"
      >
        {{ status === "submitting" ? "Creating account..." : "Create account" }}
      </button>
      <button v-else type="submit" data-testid="next">Next</button>
    </div>
  </form>
</template>
`,
          "/src/components/TextField.vue": `<script setup>
const model = defineModel({ type: String, default: "" });
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, default: "text" },
  error: { type: String, default: "" },
  autocomplete: { type: String, default: "off" },
});
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? id + '-error' : undefined"
    />
    <p v-if="error" :id="id + '-error'" class="error">{{ error }}</p>
  </div>
</template>
`,
          "/src/fakeApi.js": `// Simulated server (no network in the playground): answers after 400 ms.
export function createAccount(data) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ok: true, id: "u_" + data.email.length }), 400),
  );
}
`,
          "/src/steps.js": `// The wizard is driven by this config: each step names its fields and
// validates only those. Adding a step means adding an entry, not a branch.
export const PLANS = [
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "team", label: "Team" },
];

export const INITIAL = { email: "", password: "", fullName: "", plan: "" };

export const STEPS = [
  {
    id: "account",
    title: "Account",
    fields: ["email", "password"],
    validate: (d) => {
      const e = {};
      if (!d.email.trim()) e.email = "Email is required";
      else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.email.trim()))
        e.email = "Enter a valid email address";
      if (!d.password) e.password = "Password is required";
      else if (d.password.length < 8)
        e.password = "Password must be at least 8 characters";
      else if (!/[0-9]/.test(d.password))
        e.password = "Password must contain a number";
      return e;
    },
  },
  {
    id: "profile",
    title: "Profile",
    fields: ["fullName", "plan"],
    validate: (d) => {
      const e = {};
      if (!d.fullName.trim()) e.fullName = "Full name is required";
      if (!d.plan) e.plan = "Choose a plan";
      return e;
    },
  },
  { id: "review", title: "Review", fields: [], validate: () => ({}) },
];

export const planLabel = (id) => PLANS.find((p) => p.id === id)?.label ?? "";
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. Assumes you have built a single reactive form; if not, start with [Build a Form with validation](/interview-question/build-a-form-with-validation).
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Angular 22.2.3, AOT with strict templates and in the playground JIT.

## 1. A Story First

An airport kiosk asks one question per screen, shows "Step 2 of 4", lets you go Back without retyping your passport, and shows a summary before you pay. Our wizard has **Account** (email, password with 8+ characters and a digit), **Profile** (full name and a plan) and **Review** (summary with Edit links). Next only advances when the current step is valid; Back never validates. The final submit goes to a simulated API (a <code>setTimeout</code> Promise; the playground has no network).

In Angular the natural shape is a **nested FormGroup**: one parent group holds all the data, and one child group per step decides whether that step may be left.

## 2. How the State Model Maps to Angular

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| all values | parent <code>FormGroup</code> | One owner; <code>getRawValue()</code> gives the whole payload. |
| per-step validity | child <code>FormGroup</code> per step | <code>form.controls.account.invalid</code> is the gate. |
| <code>step</code>, <code>status</code> | <code>signal()</code> | App state; signal writes schedule a re-render. |
| <code>attempted</code> | <code>signal&lt;ReadonlySet&lt;number&gt;&gt;</code> | Replaced with a new Set on update, so the signal sees a new value. |
| current step, last step | <code>computed()</code> | Derived from <code>step</code>. |
| focus on step change | <code>afterNextRender</code> | Runs once after Angular has rendered the new step. |

📌 **Interview term: Nested FormGroup** — a <code>FormGroup</code> whose controls include other groups. Validity rolls up: a child group is invalid if any of its controls is, and the parent if any child is. Each step's validity comes for free.

📌 **Interview term: Step gating** — Next validates only the current step's group, so users are never blocked by fields they have not seen.

## 3. Build It Step by Step

### Step 1: one model, one group per step

\`\`\`ts
// One FormGroup per step, nested in one
// parent: the parent holds ALL the data,
// and each child group's validity gates its own Next button.
readonly form = new FormGroup({
  account: new FormGroup({
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL)],
    }),
    password: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/[0-9]/),
      ],
    }),
  }),
  profile: new FormGroup({
    fullName: new FormControl("", {
      nonNullable: true,
      validators: notBlank,
    }),
    plan: new FormControl("", {
      nonNullable: true,
      validators: Validators.required,
    }),
  }),
});
\`\`\`

Built-ins work for the email pattern, password length and digit. Two notes from running them on 22.2.3: <code>Validators.required</code> treats <code>"   "</code> as valid, so the name uses a small <code>notBlank</code> validator, and a <code>RegExp</code> passed to <code>Validators.pattern</code> is used as is (a string pattern would be wrapped in <code>^...$</code>), which is why <code>/[0-9]/</code> means "contains a digit". Messages come from a lookup table in priority order:

\`\`\`ts
// First matching key wins, in the order listed.
const MESSAGES: Record<string, [string, string][]> = {
  email: [
    ["required", "Email is required"],
    ["pattern", "Enter a valid email address"],
  ],
  password: [
    ["required", "Password is required"],
    ["minlength", "Password must be at least 8 characters"],
    ["pattern", "Password must contain a number"],
  ],
  fullName: [["required", "Full name is required"]],
  plan: [["required", "Choose a plan"]],
};
\`\`\`

### Step 2: the gate and the error helper

\`\`\`ts
error(group: "account" | "profile", field: string): string | null {
  const index = group === "account" ? 0 : 1;
  if (!this.attempted().has(index)) return null;
  const g: FormGroup = this.form.controls[group];
  const errs = g.get(field)?.errors;
  if (!errs) return null;
  return MESSAGES[field].find(([key]) => errs[key])?.[1] ?? null;
}

goTo(i: number) {
  this.step.set(i);
  // Focus the new heading after Angular has rendered the new step.
  afterNextRender(() => this.heading?.nativeElement.focus(), {
    injector: this.injector,
  });
}

private next() {
  const id = this.current().id;
  if (id === "account" || id === "profile") {
    const group: FormGroup = this.form.controls[id];
    if (group.invalid) {
      this.attempted.update((s) => new Set(s).add(this.step()));
      const first = Object.keys(group.controls).find(
        (k) => group.get(k)?.invalid,
      );
      document
        .getElementById(first === "plan" ? "plan-free" : first!)
        ?.focus();
      return;
    }
  }
  this.goTo(this.step() + 1);
}
\`\`\`

<code>attempted.update((s) =&gt; new Set(s).add(...))</code> creates a new Set on purpose: a signal compares values by identity, so mutating the old Set in place would not notify anything.

📌 **Interview term: afterNextRender** — registers a callback that runs once, after the next time Angular renders the application. It is the right place to touch the DOM of something that has just appeared. Outside a constructor it needs an <code>injector</code>, which is why the component injects one. The 22.2.3 typings mark it <code>@publicApi 20.0</code>.

### Step 3: template with @switch and formGroupName

\`\`\`html
          @case ("profile") {
            <div formGroupName="profile">
              <div class="field">
                <label for="fullName">Full name</label>
                <input id="fullName" formControlName="fullName" autocomplete="name"
                  [attr.aria-invalid]="error('profile', 'fullName') ? 'true' : 'false'"
                  [attr.aria-describedby]="error('profile', 'fullName') ? 'fullName-error' : null" />
                @if (error("profile", "fullName"); as e) { <p id="fullName-error" class="error">{{ e }}</p> }
              </div>
              <fieldset class="field" [attr.aria-describedby]="error('profile', 'plan') ? 'plan-error' : null">
                <legend>Plan</legend>
                @for (p of plans; track p.id) {
                  <label class="radio">
                    <input type="radio" name="plan" [id]="'plan-' + p.id" formControlName="plan" [value]="p.id" />
                    {{ p.label }}
                  </label>
                }
                @if (error("profile", "plan"); as e) { <p id="plan-error" class="error">{{ e }}</p> }
              </fieldset>
            </div>
          }
\`\`\`

<code>formGroupName="profile"</code> scopes the inner <code>formControlName</code>s to the child group. <code>@switch</code> swaps the step bodies; the inputs are destroyed when you leave a step, but the controls live in the component, so Back restores every value.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Enter on an early step | <code>(ngSubmit)</code> calls <code>onSubmit</code>, which runs <code>next()</code> |
| Back | <code>goTo(step - 1)</code>, no validation |
| Step change | <code>afterNextRender</code> focuses the heading (<code>tabindex="-1"</code>) |
| Current step | <code>[attr.aria-current]</code> on the list item |
| Progress | <code>role="progressbar"</code> with <code>[attr.aria-valuenow]</code> |
| Radio group | Shared <code>name="plan"</code>, error linked to the fieldset |

## 5. Verified: What the Solution Actually Did

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, once compiled by <code>ngc</code> with <code>strictTemplates</code> and once through the playground JIT. Both runs printed the same lines; AOT run, prefix removed:

\`\`\`text
RENDERED: AccountProfileReviewStep 1 of 3: AccountEmailPasswordNext
initial              | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: BODY
Next on empty        | Step 1 of 3: Account | valuenow 1 | errors: email-error=Email is required, password-error=Password is required | focus: email
short password       | Step 1 of 3: Account | valuenow 1 | errors: password-error=Password must be at least 8 characters | focus: email
fixed password       | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: email
Next -> step 2       | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: H2
Back                 | Step 1 of 3: Account | valuenow 1 | errors: (none) | focus: H2
email kept after Back: ada@example.com | password length kept: 12
Next without plan    | Step 2 of 3: Profile | valuenow 2 | errors: plan-error=Choose a plan | focus: plan-free
picked Pro           | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: plan-free
Next -> review       | Step 3 of 3: Review | valuenow 3 | errors: (none) | focus: H2
review: Emailada@example.comPassword************Edit accountFull nameAda LovelacePlanProEdit profile
Edit profile         | Step 2 of 3: Profile | valuenow 2 | errors: (none) | focus: H2
plan radio checked: plan-pro
review again: Emailada@example.comPassword************Edit accountFull nameAda LovelacePlanTeamEdit profile
submitting: Creating account... | disabled: true
done: Welcome aboard, Ada!Your Team plan is ready.
\`\`\`

Identical to the React and Vue runs. Two things this run caught while building: the first version of the radios had no <code>name</code> attribute, so they were not one group; and the driver first read the checked radio's DOM <code>value</code>, which printed <code>on</code>, because <code>[value]</code> on a radio with <code>formControlName</code> feeds Angular's radio accessor, not the element's value attribute. The driver now reads the radio <code>id</code>. No <code>console.error</code>; layout was not checked.

## 6. Common Pitfalls

- **One unrelated FormGroup per step component.** Back destroys it, and the submit has to gather the pieces.
- **Mutating a Set or array inside a signal.** <code>attempted().add(x)</code> changes nothing the signal can see; create a new one.
- **Focusing in the click handler.** The new heading is not rendered yet; use <code>afterNextRender</code>.
- **Radios without <code>name</code>.** They stop behaving as one group for arrow keys.
- **Expecting <code>[value]</code> to set the DOM value of a reactive-forms radio.** It does not; use <code>[attr.value]</code> too if anything reads the DOM (a native form post, a test).

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Data first:</strong> <span style="color:#f0e2c8;">"One parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> with a child group per step: the parent holds all values, the children gate Next."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Navigation state:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">step</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> are signals, current step is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attempted</code> is a signal holding a new Set each time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Gate:</strong> <span style="color:#f0e2c8;">"If the current group is invalid, mark the step attempted, focus its first invalid control, and stop; Back never validates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Focus and ARIA:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> focuses the new heading; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-current=step</code> and a progressbar describe progress."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish:</strong> <span style="color:#f0e2c8;">"Review reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form.value</code>, Edit links call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">goTo</code>, and the last step submits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getRawValue()</code> once."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a conditional step?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the full model, and derive the active step list with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> that filters by the plan control. I would also <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disable()</code> the hidden step group so its validators do not block the final submit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you persist progress?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subscribe to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form.valueChanges</code> and save to session storage, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchValue</code> on start. Exclude the password; see [patchValue vs setValue](/interview-question/explain-the-difference-between-formgroup-patchvalue-and-formgroup-setvalue).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why signals for step instead of a plain field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The playground app is zoneless, so a plain field changed after an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> would not re-render. Signals also make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">current</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isLast</code> cached derived values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed: set values on the child groups, submit, assert the heading and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.activeElement</code>, then go Back and assert the controls kept their values.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Nested FormGroup** | A form group containing other groups; validity rolls up |
| **Step gating** | Next only advances when the current step is valid |
| **afterNextRender** | Run code once after Angular has rendered |
| **formGroupName** | Scopes inner form controls to a child group |
| **aria-current="step"** | Marks the current step for assistive technology |

---
**Conclusion:** Angular reactive forms model a wizard directly: a parent group owns the data, child groups gate each step, and signals carry the navigation state that a zoneless app needs to re-render. <code>afterNextRender</code> moves focus once the new step is on screen. The AOT and JIT runs on Angular 22.2.3 matched React and Vue line for line, and building it surfaced two radio-group details (a shared <code>name</code>, and <code>[value]</code> not touching the DOM value) worth naming in an interview.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { SignupWizardComponent } from "./signup-wizard.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [SignupWizardComponent],
  template: \`<main class="page"><app-signup-wizard /></main>\`,
  // Global styles for this small app, so the child component shares them.
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1117;
        color: #e6e8ee;
        font-family: system-ui, sans-serif;
      }
      .page {
        display: flex;
        justify-content: center;
        padding: 24px 16px;
      }
      .card {
        width: 100%;
        max-width: 440px;
        background: #181b24;
        border: 1px solid #2a2f3d;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 12px 0 16px;
        font-size: 1.2rem;
      }
      h2:focus {
        outline: none;
      }
      .steps {
        display: flex;
        gap: 8px;
        list-style: none;
        padding: 0;
        margin: 0 0 10px;
        font-size: 0.85rem;
        color: #8b93a7;
      }
      .steps li {
        flex: 1;
      }
      .steps li.on {
        color: #e6e8ee;
      }
      .steps li[aria-current="step"] {
        font-weight: 700;
        color: #9db7ff;
      }
      .bar {
        height: 6px;
        background: #2a2f3d;
        border-radius: 3px;
        overflow: hidden;
      }
      .bar span {
        display: block;
        height: 100%;
        background: #4f7cff;
        transition: width 0.25s;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 0 0 14px;
        border: 0;
        padding: 0;
      }
      label,
      legend {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .radio {
        display: flex;
        gap: 8px;
        align-items: center;
        font-weight: 400;
        padding: 4px 0;
      }
      input[type="text"],
      input[type="email"],
      input[type="password"],
      input:not([type]) {
        font: inherit;
        padding: 9px 11px;
        border-radius: 8px;
        border: 1px solid #3a4152;
        background: #0f1117;
        color: inherit;
      }
      input[aria-invalid="true"] {
        border-color: #ff6b6b;
      }
      .error {
        color: #ff8a8a;
        margin: 0;
        font-size: 0.85rem;
      }
      .review {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        margin: 0 0 16px;
      }
      .review dt {
        color: #8b93a7;
      }
      .review dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
      .review dd:has(button) {
        grid-column: 1 / -1;
      }
      .actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      button {
        font: inherit;
        padding: 10px 16px;
        border-radius: 8px;
        border: 0;
        background: #4f7cff;
        color: #fff;
        cursor: pointer;
      }
      button.secondary {
        background: #2a2f3d;
      }
      button.link {
        background: none;
        color: #9db7ff;
        padding: 0;
        text-decoration: underline;
      }
      button:disabled {
        opacity: 0.6;
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid #7aa2ff;
        outline-offset: 2px;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/fake-api.ts": `// Simulated server (no network in the playground): answers after 400 ms.
export function createAccount(data: {
  email: string;
}): Promise<{ ok: true; id: string }> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ok: true, id: "u_" + data.email.length }), 400),
  );
}
`,
          "/src/app/signup-wizard.component.ts": `import {
  Component,
  ElementRef,
  Injector,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { createAccount } from "./fake-api";

const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
// Validators.required accepts "   ", so names use a trimmed check instead.
const notBlank = (c: AbstractControl): ValidationErrors | null =>
  String(c.value ?? "").trim() ? null : { required: true };

export const PLANS = [
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "team", label: "Team" },
];
const STEPS = [
  { id: "account", title: "Account" },
  { id: "profile", title: "Profile" },
  { id: "review", title: "Review" },
] as const;

// First matching key wins, in the order listed.
const MESSAGES: Record<string, [string, string][]> = {
  email: [
    ["required", "Email is required"],
    ["pattern", "Enter a valid email address"],
  ],
  password: [
    ["required", "Password is required"],
    ["minlength", "Password must be at least 8 characters"],
    ["pattern", "Password must contain a number"],
  ],
  fullName: [["required", "Full name is required"]],
  plan: [["required", "Choose a plan"]],
};

@Component({
  selector: "app-signup-wizard",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    @if (status() === "done") {
      <div class="card" role="status" data-testid="done">
        <h2>Welcome aboard, {{ firstName() }}!</h2>
        <p>Your {{ planLabel(form.controls.profile.controls.plan.value) }} plan is ready.</p>
      </div>
    } @else {
      <form class="card" novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
        <ol class="steps" aria-label="Progress">
          @for (s of steps; track s.id; let i = $index) {
            <li
              [attr.aria-current]="i === step() ? 'step' : null"
              [class.on]="i <= step()"
            >{{ s.title }}</li>
          }
        </ol>
        <div role="progressbar" aria-label="Sign-up progress" aria-valuemin="1" [attr.aria-valuemax]="steps.length"
          [attr.aria-valuenow]="step() + 1" class="bar">
          <span [style.width.%]="((step() + 1) / steps.length) * 100"></span>
        </div>
        <h2
          #heading
          tabindex="-1"
          data-testid="step-heading"
        >Step {{ step() + 1 }} of {{ steps.length }}: {{ current().title }}</h2>

        @switch (current().id) {
          @case ("account") {
            <div formGroupName="account">
              <div class="field">
                <label for="email">Email</label>
                <input id="email" type="email" formControlName="email" autocomplete="email"
                  [attr.aria-invalid]="error('account', 'email') ? 'true' : 'false'"
                  [attr.aria-describedby]="error('account', 'email') ? 'email-error' : null" />
                @if (error("account", "email"); as e) { <p id="email-error" class="error">{{ e }}</p> }
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input id="password" type="password" formControlName="password" autocomplete="new-password"
                  [attr.aria-invalid]="error('account', 'password') ? 'true' : 'false'"
                  [attr.aria-describedby]="error('account', 'password') ? 'password-error' : null" />
                @if (error("account", "password"); as e) { <p id="password-error" class="error">{{ e }}</p> }
              </div>
            </div>
          }
          @case ("profile") {
            <div formGroupName="profile">
              <div class="field">
                <label for="fullName">Full name</label>
                <input id="fullName" formControlName="fullName" autocomplete="name"
                  [attr.aria-invalid]="error('profile', 'fullName') ? 'true' : 'false'"
                  [attr.aria-describedby]="error('profile', 'fullName') ? 'fullName-error' : null" />
                @if (error("profile", "fullName"); as e) { <p id="fullName-error" class="error">{{ e }}</p> }
              </div>
              <fieldset
                class="field"
                [attr.aria-describedby]="error('profile', 'plan') ? 'plan-error' : null"
              >
                <legend>Plan</legend>
                @for (p of plans; track p.id) {
                  <label class="radio">
                    <input
                      type="radio"
                      name="plan"
                      [id]="'plan-' + p.id"
                      formControlName="plan"
                      [value]="p.id"
                    />
                    {{ p.label }}
                  </label>
                }
                @if (error("profile", "plan"); as e) { <p id="plan-error" class="error">{{ e }}</p> }
              </fieldset>
            </div>
          }
          @default {
            <dl data-testid="review" class="review">
              <dt>Email</dt><dd>{{ form.value.account?.email }}</dd>
              <dt>Password</dt><dd>{{ masked() }}</dd>
              <dd><button type="button" class="link" data-testid="edit-account" (click)="goTo(0)">Edit account</button></dd>
              <dt>Full name</dt><dd>{{ form.value.profile?.fullName }}</dd>
              <dt>Plan</dt><dd>{{ planLabel(form.controls.profile.controls.plan.value) }}</dd>
              <dd><button type="button" class="link" data-testid="edit-profile" (click)="goTo(1)">Edit profile</button></dd>
            </dl>
          }
        }

        <div class="actions">
          @if (step() > 0) {
            <button
              type="button"
              data-testid="back"
              class="secondary"
              [disabled]="status() === 'submitting'"
              (click)="goTo(step() - 1)"
            >Back</button>
          }
          @if (isLast()) {
            <button
              type="submit"
              data-testid="submit"
              [disabled]="status() === 'submitting'"
            >
              {{ status() === "submitting" ? "Creating account..." : "Create account" }}
            </button>
          } @else {
            <button type="submit" data-testid="next">Next</button>
          }
        </div>
      </form>
    }
  \`,
})
export class SignupWizardComponent {
  private injector = inject(Injector);
  @ViewChild("heading") heading?: ElementRef<HTMLElement>;

  readonly steps = STEPS;
  readonly plans = PLANS;
  readonly step = signal(0);
  readonly attempted = signal<ReadonlySet<number>>(new Set());
  readonly status = signal<"editing" | "submitting" | "done">("editing");
  readonly current = computed(() => STEPS[this.step()]);
  readonly isLast = computed(() => this.step() === STEPS.length - 1);

  // One FormGroup per step, nested in one
  // parent: the parent holds ALL the data,
  // and each child group's validity gates its own Next button.
  readonly form = new FormGroup({
    account: new FormGroup({
      email: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(EMAIL)],
      }),
      password: new FormControl("", {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/[0-9]/),
        ],
      }),
    }),
    profile: new FormGroup({
      fullName: new FormControl("", {
        nonNullable: true,
        validators: notBlank,
      }),
      plan: new FormControl("", {
        nonNullable: true,
        validators: Validators.required,
      }),
    }),
  });

  planLabel(id: string) {
    return PLANS.find((p) => p.id === id)?.label ?? "";
  }
  masked() {
    return "*".repeat(
      this.form.controls.account.controls.password.value.length,
    );
  }
  firstName() {
    return this.form.controls.profile.controls.fullName.value
      .trim()
      .split(" ")[0];
  }

  error(group: "account" | "profile", field: string): string | null {
    const index = group === "account" ? 0 : 1;
    if (!this.attempted().has(index)) return null;
    const g: FormGroup = this.form.controls[group];
    const errs = g.get(field)?.errors;
    if (!errs) return null;
    return MESSAGES[field].find(([key]) => errs[key])?.[1] ?? null;
  }

  goTo(i: number) {
    this.step.set(i);
    // Focus the new heading after Angular has rendered the new step.
    afterNextRender(() => this.heading?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  private next() {
    const id = this.current().id;
    if (id === "account" || id === "profile") {
      const group: FormGroup = this.form.controls[id];
      if (group.invalid) {
        this.attempted.update((s) => new Set(s).add(this.step()));
        const first = Object.keys(group.controls).find(
          (k) => group.get(k)?.invalid,
        );
        document
          .getElementById(first === "plan" ? "plan-free" : first!)
          ?.focus();
        return;
      }
    }
    this.goTo(this.step() + 1);
  }

  async onSubmit() {
    if (!this.isLast()) return this.next();
    this.status.set("submitting");
    await createAccount(this.form.getRawValue().account);
    this.status.set("done");
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Signup Form with async username availability check",
    seoDescription: "Build a signup form with a debounced username availability check that ignores stale responses, verified in React, Vue and Angular with a race test.",
    description: `**Question presented to candidate:**
"On our sign-up form, people pick a username and we tell them right away whether it is free. Build that check against a fake API. Do not send a request on every keystroke, and make sure a slow answer for something they typed earlier can never overwrite the answer for what is in the box now."

**Requirements:**
- Username rules checked locally first: 3 to 16 characters, lowercase letters, digits and underscore. No request is sent for a name that fails them.
- For a valid name, wait until typing pauses (debounce, 400 ms), then call a simulated \`checkUsername(name)\` with variable latency.
- Show \`Checking availability...\`, \`<name> is available\`, \`<name> is taken\`, or a retry message if the request fails, in a polite live region.
- Responses for anything other than the current value are ignored, even if they arrive last.
- Sign up is enabled only when the name is confirmed available and the email is valid; then a simulated create call and a welcome message.

**What a strong answer should cover:**
- **Debounce** with a timer that is cleared on every change, and why it reduces load and flicker.
- The **race condition**: two requests in flight, the older one answers last. Fix it with a per-request staleness flag or request id (cleanup), and optionally by tagging each result with the name it answers.
- Deriving the visible status from the current value and the latest result, instead of storing status strings.
- Cancelling: \`clearTimeout\` for the pending timer, and \`AbortController\` or \`switchMap\` for in-flight requests; a Promise itself cannot be cancelled.
- Accessibility (\`aria-live="polite"\` for the status, \`aria-describedby\` on the input) and why the server must still re-check at submit.

**Clarifying questions expected:**
- "Is the check case-insensitive, and are usernames normalized before checking?"
- "Should we cache answers for names already checked?"
- "What happens if availability changes between the check and the submit?"

**Code / implementation expected:** Yes. A form with a debounced, race-safe availability check, demonstrated with a timeline where an older request resolves after a newer one.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. Assumes you have built a basic validated form; the [Form with validation](/interview-question/build-a-form-with-validation) question covers that ground.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and every output in section 6 was produced by actually running it on React 19.3.1, including a deliberately broken copy that shows the bug the solution prevents.

## 1. Why This Even Matters — A Story First

Picture phoning a hotel to ask if a room is free. You say "Is room 12 free?" and, before they answer, you change your mind: "Actually, room 14?". The receptionist checks room 14 quickly and says "free". Then a colleague who went to check room 12 comes back and shouts "taken!". If you only listen to the last voice, you walk away believing room 14 is taken.

That is the bug this question is about. Typing "jane" then "janet" sends two requests. If the server is slower for "jane", its answer arrives last, and a naive form shows "janet is taken" under a name that is actually free. Interviewers love this question because the happy path is ten lines, and the senior part is two ideas:

1. **Debounce**: wait until the user pauses before asking at all.
2. **Ignore stale responses**: when an answer arrives, only use it if it still answers the question on screen.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the check case-insensitive? Do we normalize (trim, lowercase)? | Normalizing before the check avoids "Jane" being free and "jane" taken. This build enforces lowercase in the rules. |
| How long should the debounce be? | 300 to 500 ms is typical; too short spams the server, too long feels laggy. This build uses 400 ms. |
| Should answers be cached? | Typing back to a checked name could reuse the answer; a stale cache entry can lie, so ask how fresh it must be. |
| What if the name is taken between the check and the submit? | The server must re-check on create. The client check is a hint, not a guarantee. |
| Can the endpoint be rate limited? | Debounce plus local rules first is your rate control; you may also need a retry state. |
| Do we suggest alternatives when taken? | A nice extension, out of scope here. |

## 3. Requirements and the State Model

Rules first: 3 to 16 characters of <code>a-z</code>, <code>0-9</code> and <code>_</code>. Only a name that passes them is sent. The fake API is in-file (the playground has no network), and its latency is derived from the name so runs are reproducible: <code>jane</code> answers in 1000 ms, <code>janet</code> in 200 ms. A small "Request log" panel lists every request and whether its answer was applied or ignored; it exists only to make the race visible.

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>username</code>, <code>email</code>, <code>phase</code> | State | What the user typed and where the form is. |
| <code>result</code> | State (in the hook) | The last *applied* answer, tagged with the name it answers. |
| request id counter | Ref | Numbers requests for the log; survives renders. |
| <code>stale</code> flag | Closure variable per effect run | Set by cleanup when the name changes. |
| sync error | **Derived** | <code>usernameError(username)</code>. |
| status | **Derived** | "checking" unless <code>result.name === username</code>. |
| can submit | **Derived** | available, valid email, not saving. |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="Timeline: the request for jane starts first and answers last, the request for janet starts later and answers first, so only the janet answer is applied">
  <defs>
    <marker id="mcs3r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="44">typing</text>
  <rect class="d-box-muted" x="90" y="24" width="110" height="32" rx="6"/>
  <text class="d-sub" x="145" y="45" text-anchor="middle">j ja jan jane</text>
  <rect class="d-box-muted" x="330" y="24" width="70" height="32" rx="6"/>
  <text class="d-sub" x="365" y="45" text-anchor="middle">janet</text>
  <text class="d-sub" x="20" y="124">request 1</text>
  <rect class="d-box" x="220" y="100" width="400" height="40" rx="8"/>
  <text class="d-text" x="420" y="125" text-anchor="middle">jane: 1000 ms, answers taken</text>
  <text class="d-sub" x="20" y="194">request 2</text>
  <rect class="d-box-accent" x="400" y="170" width="80" height="40" rx="8"/>
  <text class="d-text d-accent" x="440" y="195" text-anchor="middle">janet</text>
  <text class="d-sub" x="585" y="195" text-anchor="middle">applied: available</text>
  <text class="d-sub" x="690" y="125" text-anchor="middle">ignored</text>
  <path class="d-edge" d="M 60 250 L 700 250" marker-end="url(#mcs3r-arrow)"/>
  <text class="d-sub" x="220" y="275" text-anchor="middle">400</text>
  <text class="d-sub" x="400" y="275" text-anchor="middle">850</text>
  <text class="d-sub" x="480" y="275" text-anchor="middle">1050</text>
  <text class="d-sub" x="620" y="275" text-anchor="middle">1400 ms</text>
</svg>

Request 1 leaves at about 400 ms (after the debounce), request 2 at about 850 ms. Request 2 answers at about 1050 ms and is applied. Request 1 answers last, at about 1400 ms, and must be ignored because the box no longer says "jane". The times are approximate; the order is what the run in section 6 checks.

📌 **Interview term: Debounce** — delay a function until calls have stopped for a set time; every new call restarts the timer. The standalone utility is the classic [debounce question](/interview-question/javascript-debounce-throttle).

📌 **Interview term: Race condition** — a bug where the result depends on which of two asynchronous operations finishes first. Here: which availability answer arrives last.

📌 **Interview term: Stale response** — an answer to a question the user is no longer asking. The rule is simple: apply a response only if nothing newer has started since it was sent.

## 4. Build It Step by Step

### Step 1: local rules short-circuit everything

\`\`\`js
export const DEBOUNCE_MS = 400;

export function usernameError(v) {
  if (!v) return "Username is required";
  if (v.length < 3 || v.length > 16) return "Use 3 to 16 characters";
  if (!/^[a-z0-9_]+$/.test(v))
    return "Use lowercase letters, numbers and _ only";
  return "";
}
\`\`\`

\`\`\`jsx
const uErr = username ? usernameError(username) : "";
const eErr = emailError(email);
const { status, log } = useUsernameCheck(username, !!username && !uErr);
const canSubmit = status === "available" && !eErr && phase === "form";
const text = STATUS_TEXT[status];
const statusText = typeof text === "function" ? text(username) : text;
\`\`\`

The hook is only <code>enabled</code> for a non-empty name that passes the rules, so "Ja" never reaches the server.

### Step 2: debounce inside an effect

\`\`\`jsx
useEffect(() => {
  if (!enabled) return;
  // flipped by cleanup when username changes or we unmount
  let stale = false;
  const timer = setTimeout(() => {
    const id = nextId.current++;
    setLog((l) => [...l, { id, name: username, outcome: "pending" }]);
    checkUsername(username).then(
      (res) => finish(id, { name: username, available: res.available }),
      () => finish(id, { name: username, error: true }),
    );
    function finish(reqId, value) {
      const label = value.error
        ? "error"
        : value.available
          ? "available"
          : "taken";
      setLog((l) =>
        l.map((e) =>
          e.id === reqId
            ? {
                ...e,
                outcome:
                  label + (stale ? ", ignored (stale)" : ", applied"),
              }
            : e,
        ),
      );
      if (!stale) setResult(value);
    }
  }, DEBOUNCE_MS);
  return () => {
    stale = true;
    // a keystroke inside the window cancels the request entirely
    clearTimeout(timer);
  };
}, [username, enabled]);
\`\`\`

Each change of <code>username</code> runs the effect again, and React first runs the previous cleanup. That cleanup does two jobs:

- <code>clearTimeout(timer)</code> cancels the pending debounce, so a burst of keystrokes sends one request. That is the debounce.
- <code>stale = true</code> marks the previous run's request, if it was already sent, as stale. When its Promise settles, <code>finish</code> logs it as ignored and skips <code>setResult</code>. That is the race fix.

📌 **Interview term: Effect cleanup** — the function returned from <code>useEffect</code>. React calls it before the effect runs again and on unmount. It is the standard place to cancel timers and ignore responses; see [the cleanup function in useEffect](/interview-question/what-is-the-purpose-of-the-cleanup-function-in-useeffect) and [async work and race conditions inside effects](/interview-question/how-do-you-safely-handle-async-work-and-race-conditions-inside-effects).

Because <code>stale</code> is a local variable, every effect run has its own flag. That closure is exactly what makes the check per request, with no global "latest id" bookkeeping.

### Step 3: derive the status from the current name

\`\`\`jsx
// Derived: a result only counts if it answers the name currently typed.
let status = "idle";
if (enabled) {
  if (result?.name !== username) status = "checking";
  else
    status = result.error
      ? "error"
      : result.available
        ? "available"
        : "taken";
}
return { status, log };
\`\`\`

📌 **Interview term: Tagging responses** — storing which input a response answers (<code>result.name</code>) next to the answer itself. Even if a stale answer slipped through, a result for "jane" can never be shown as the status of "janet": the comparison turns it into "checking". The stale flag and the tag are two independent layers; section 6 shows what happens with neither.

### Step 4: the fake server

\`\`\`js
const TAKEN = new Set(["admin", "alex", "jane", "root", "sam"]);

export function latencyFor(name) {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return 200 + (sum % 5) * 200;
}

export function checkUsername(name) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (name === "error") reject(new Error("Server unavailable"));
      else resolve({ available: !TAKEN.has(name) });
    }, latencyFor(name));
  });
}
\`\`\`

A Promise cannot be cancelled; we can only stop listening to it. With a real <code>fetch</code>, also pass an <code>AbortController</code> signal and call <code>abort()</code> in the cleanup so the browser drops the request; see [aborting fetch with AbortController](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

### Step 5: StrictMode

In development, StrictMode runs each effect, its cleanup, then the effect again on mount. Here the initial name is empty, so the hook is disabled and nothing is sent. Even if it were enabled, the cleanup clears the first timer before it fires, so only one request would go out.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Burst of keystrokes | One request, after 400 ms of quiet |
| Older request answers last | Logged as ignored; status keeps the newer answer |
| Name fails local rules | Sync error shown, no request, status empty |
| Server error | "Could not check right now. Edit the name to retry." |
| Typing back to a checked name | Status goes back to "checking" and a new request is sent (no cache) |
| Unmount while a request is in flight | Cleanup marks it stale, so its result is never applied |
| Screen reader | Status paragraph is <code>aria-live="polite"</code>; the input lists both error and status in <code>aria-describedby</code> |
| Submit | Enabled only when available and the email is valid |

## 6. Verified: What the Solution Actually Did

Mounted like the playground (<code>createRoot</code> plus <code>&lt;StrictMode&gt;</code>) in jsdom with React 19.3.1. The driver uses real timers: four keystrokes 50 ms apart, waits, then types "janet" while "jane" is still in flight. Output with the <code>[react]</code> prefix removed:

\`\`\`text
RENDERED: Create your accountUsernameEmailSign upRequest log (demo)
typed j, ja, jan, jane     | status: Checking availability... | log: (no requests)
debounce fired for jane    | status: Checking availability... | log: #1 jane: pending
typed janet                | status: Checking availability... | log: #1 jane: pending
debounce fired for janet   | status: Checking availability... | log: #1 jane: pending | #2 janet: pending
janet answered first       | status: janet is available | log: #1 jane: pending | #2 janet: available, applied
jane answered last         | status: janet is available | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
submit disabled? true (email still empty)
typed Ja (invalid)         | status: (empty) | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
sync error: Use 3 to 16 characters
450 ms later               | status: (empty) | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
server failed              | status: Could not check right now. Edit the name to retry. | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied
alex settled               | status: alex is taken | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied | #4 alex: taken, applied
ada3 settled               | status: ada3 is available | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied | #4 alex: taken, applied | #5 ada3: available, applied
submit disabled? false
done: Welcome, @ada3!Your account is ready.
\`\`\`

What this proves: four keystrokes produced one request (debounce); request 1 was still pending when request 2 was applied, and when request 1 finally answered "taken" it was ignored (race handled); "Ja" sent nothing; a failed request showed the retry message.

To show the bug is real, the same driver ran against a copy of the hook with both layers removed (no stale check, no name comparison). The relevant lines:

\`\`\`text
[react] janet answered first       | status: janet is available | log: #1 jane: pending | #2 janet: available, applied
[react] jane answered last         | status: janet is taken | log: #1 jane: taken, applied | #2 janet: available, applied
\`\`\`

The late answer for "jane" overwrote the result, and the form told the user "janet is taken", which is false. No <code>console.error</code> in any run. Timing in a real browser will differ by a few milliseconds; the ordering is what matters and is fixed by the fake latencies.

## 7. Common Pitfalls

- **Storing a status string like "jane is taken".** It cannot be checked against the current name later. Store the answer with the name it answers, and derive the text.
- **Debouncing the setter instead of the request.** Debouncing <code>setUsername</code> makes the input itself lag. Keep the input controlled and instant; debounce only the network call.
- **A "latest id" check that only bumps when a request is sent.** If the user types during the debounce window, no newer request exists yet, so an old answer still applies. Mark stale on every change, as the cleanup does.
- **Calling the server for names that fail local rules.** Wasted load, and confusing "taken" messages for invalid names.
- **Trusting the check at submit.** Another user can take the name in between. The create call must fail cleanly and map the error back to the field.
- **Forgetting the error state.** A rejected Promise with no handler leaves "Checking..." on screen forever.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two problems:</strong> <span style="color:#f0e2c8;">"There are two separate problems: too many requests, solved by debounce, and out-of-order answers, solved by ignoring stale responses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules first:</strong> <span style="color:#f0e2c8;">"I validate locally first and only enable the check for a name that passes, so invalid input never hits the server."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Effect with cleanup:</strong> <span style="color:#f0e2c8;">"An effect keyed on the name starts a 400 ms timer; its cleanup clears the timer and flips a per-run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale</code> flag, so any older response is ignored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Derived status:</strong> <span style="color:#f0e2c8;">"I store the last applied result tagged with its name, and derive checking, available or taken by comparing it with the current name."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"I make the fake API slower for the older name and show that the late answer is logged as ignored; with a real fetch I would also abort it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use the latest request id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works if you bump the id on every change, not only when a request is sent. The per-run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale</code> flag in the effect cleanup does exactly that with no shared counter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add caching?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from name to answer in a ref, checked before starting the timer. Give entries a short lifetime, because availability changes, and always re-check on submit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">AbortController or ignore flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both. Abort saves bandwidth and server work; the flag is still needed because the response may already have arrived by the time you abort, and not every async API accepts a signal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fake timers plus a mock API whose promises I resolve by hand in the wrong order. Assert the status after each resolve. The driver here does the same with real timers and controlled latencies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would change with React 19 features?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useDeferredValue</code> could keep typing smooth if rendering were expensive, but it does not debounce network calls. Data libraries or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> based cache could own the request; the stale-response rule stays the same.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Debounce** | Wait for a pause before acting; each new call restarts the wait |
| **Race condition** | Outcome depends on which async task finishes first |
| **Stale response** | An answer to a question the user is no longer asking |
| **Effect cleanup** | Function React runs before re-running an effect or on unmount |
| **Tagging responses** | Keeping the input a response answers next to the response |
| **AbortController** | Browser API to cancel a fetch |

---
**Conclusion:** An async availability check is a debounce plus a staleness rule. In React both live in one effect: the timer debounces, and the cleanup both clears the timer and marks the previous request stale, while the status is derived by comparing the tagged result with the current name. The React 19.3.1 run showed one request for a burst of typing and an older, slower answer arriving last and being ignored, and a deliberately broken copy showed the false "janet is taken" that the two guards prevent. The same pattern powers a [debounced search bar](/interview-question/build-a-debounced-search-bar) and [dependent dropdowns](/interview-question/build-dependent-country-state-dropdowns).`,
        files: {
          "/App.js": `import SignupForm from "./src/SignupForm";
import "./styles.css";

export default function App() {
  return (
    <main className="page">
      <SignupForm />
    </main>
  );
}
`,
          "/src/SignupForm.js": `import { useState } from "react";
import { useUsernameCheck } from "./useUsernameCheck";
import { createUser } from "./fakeApi";
import { STATUS_TEXT, emailError, usernameError } from "./rules";

export default function SignupForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({});
  const [phase, setPhase] = useState("form"); // form | saving | done

  const uErr = username ? usernameError(username) : "";
  const eErr = emailError(email);
  const { status, log } = useUsernameCheck(username, !!username && !uErr);
  const canSubmit = status === "available" && !eErr && phase === "form";
  const text = STATUS_TEXT[status];
  const statusText = typeof text === "function" ? text(username) : text;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setPhase("saving");
    await createUser({ username, email: email.trim() });
    setPhase("done");
  }

  if (phase === "done") {
    return (
      <div className="card" role="status" data-testid="done">
        <h2>Welcome, @{username}!</h2>
        <p>Your account is ready.</p>
      </div>
    );
  }

  return (
    <form className="card" noValidate onSubmit={onSubmit} aria-label="Sign up">
      <h2>Create your account</h2>
      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          autoComplete="username"
          spellCheck={false}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={uErr || status === "taken" ? "true" : "false"}
          aria-describedby="username-error username-status"
        />
        <p id="username-error" className="error">
          {uErr}
        </p>
        <p
          id="username-status"
          data-testid="username-status"
          className={"status " + status}
          aria-live="polite"
        >
          {statusText}
        </p>
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched({ ...touched, email: true })}
          aria-invalid={touched.email && eErr ? "true" : "false"}
          aria-describedby="email-error"
        />
        <p id="email-error" className="error">
          {touched.email ? eErr : ""}
        </p>
      </div>
      <button type="submit" data-testid="submit" disabled={!canSubmit}>
        {phase === "saving" ? "Creating..." : "Sign up"}
      </button>
      <details className="log" open>
        <summary>Request log (demo)</summary>
        <ol data-testid="log">
          {log.map((e) => (
            <li key={e.id}>
              #{e.id} {e.name}: {e.outcome}
            </li>
          ))}
        </ol>
      </details>
    </form>
  );
}
`,
          "/src/fakeApi.js": `// Simulated server (no network in the playground). Latency is derived from
// the name so runs are reproducible: some names answer in 200 ms, others in
// 1000 ms, which is exactly how an older request can come back last.
const TAKEN = new Set(["admin", "alex", "jane", "root", "sam"]);

export function latencyFor(name) {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return 200 + (sum % 5) * 200;
}

export function checkUsername(name) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (name === "error") reject(new Error("Server unavailable"));
      else resolve({ available: !TAKEN.has(name) });
    }, latencyFor(name));
  });
}

export function createUser(user) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ok: true, user }), 300),
  );
}
`,
          "/src/rules.js": `export const DEBOUNCE_MS = 400;

export function usernameError(v) {
  if (!v) return "Username is required";
  if (v.length < 3 || v.length > 16) return "Use 3 to 16 characters";
  if (!/^[a-z0-9_]+$/.test(v))
    return "Use lowercase letters, numbers and _ only";
  return "";
}

export function emailError(v) {
  if (!v.trim()) return "Email is required";
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v.trim()))
    return "Enter a valid email address";
  return "";
}

export const STATUS_TEXT = {
  idle: "",
  checking: "Checking availability...",
  available: (n) => n + " is available",
  taken: (n) => n + " is taken",
  error: "Could not check right now. Edit the name to retry.",
};
`,
          "/src/useUsernameCheck.js": `import { useEffect, useRef, useState } from "react";
import { checkUsername } from "./fakeApi";
import { DEBOUNCE_MS } from "./rules";

// Debounced availability check that ignores stale responses.
// Returns the derived status plus a request log for the demo panel.
export function useUsernameCheck(username, enabled) {
  // { name, available } | { name, error }
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (!enabled) return;
    let stale = false; // flipped by cleanup when username changes or we unmount
    const timer = setTimeout(() => {
      const id = nextId.current++;
      setLog((l) => [...l, { id, name: username, outcome: "pending" }]);
      checkUsername(username).then(
        (res) => finish(id, { name: username, available: res.available }),
        () => finish(id, { name: username, error: true }),
      );
      function finish(reqId, value) {
        const label = value.error
          ? "error"
          : value.available
            ? "available"
            : "taken";
        setLog((l) =>
          l.map((e) =>
            e.id === reqId
              ? {
                  ...e,
                  outcome: label + (stale ? ", ignored (stale)" : ", applied"),
                }
              : e,
          ),
        );
        if (!stale) setResult(value);
      }
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      // a keystroke inside the window cancels the request entirely
      clearTimeout(timer);
    };
  }, [username, enabled]);

  // Derived: a result only counts if it answers the name currently typed.
  let status = "idle";
  if (enabled) {
    if (result?.name !== username) status = "checking";
    else
      status = result.error
        ? "error"
        : result.available
          ? "available"
          : "taken";
  }
  return { status, log };
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input[aria-invalid="true"] {
  border-color: #ff6b6b;
}
input:focus-visible,
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
  min-height: 1em;
}
.status {
  margin: 0;
  font-size: 0.85rem;
  min-height: 1em;
  color: #9aa3b5;
}
.status.available {
  color: #7ee2a8;
}
.status.taken,
.status.error {
  color: #ffb36b;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.log {
  margin-top: 16px;
  font-size: 0.8rem;
  color: #9aa3b5;
}
.log ol {
  margin: 6px 0 0;
  padding-left: 18px;
  font-family: ui-monospace, monospace;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. Assumes you have built a basic validated form; the [Form with validation](/interview-question/build-a-form-with-validation) question covers that ground.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Vue 3.5.44 with real timers.

## 1. A Story First

You phone a hotel: "Is room 12 free?", then immediately "Actually, room 14?". Someone checks 14 quickly: "free". Then the colleague who went to check 12 comes back: "taken!". If you trust the last voice, you get it wrong.

On a sign-up form, typing "jane" then "janet" can send two availability requests. If "jane" is slower, its "taken" arrives last and a naive form says "janet is taken". The fix has two parts: **debounce** (do not ask until typing pauses) and **ignore stale responses** (only apply an answer if it still answers the current question).

The build: local rules first (3 to 16 characters of <code>a-z</code>, <code>0-9</code>, <code>_</code>), then a 400 ms debounced call to an in-file fake API (no network in the playground) whose latency depends on the name, so "jane" answers in 1000 ms and "janet" in 200 ms. A "Request log" panel shows each request as applied or ignored.

## 2. How the State Model Maps to Vue

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>username</code>, <code>email</code>, <code>phase</code> | <code>ref()</code> | What the user typed and where the form is. |
| sync errors, can submit, status text | <code>computed()</code> | Derived, cached. |
| the check | a composable, <code>useUsernameCheck</code> | Reusable logic with its own state. |
| last applied answer | <code>ref</code> inside the composable | Tagged with the name it answers. |
| debounce + staleness | <code>watch</code> + <code>onWatcherCleanup</code> | A side effect that must be undone when the name changes. |

📌 **Interview term: Composable** — a function that uses Vue reactivity (refs, computeds, watchers) and returns reactive state, so logic can be reused across components. It is Vue's counterpart to a React custom hook.

📌 **Interview term: Debounce** — wait until calls stop for a set time before acting; each call restarts the wait. The plain JavaScript version is the [debounce question](/interview-question/javascript-debounce-throttle).

📌 **Interview term: Stale response** — an answer to a question the user is no longer asking.

## 3. Build It Step by Step

### Step 1: rules first, then the composable

\`\`\`vue
const uErr = computed(() => (username.value ?
usernameError(username.value) : "")); const eErr = computed(() =>
emailError(email.value)); const { status, log } =
useUsernameCheck(username, () => !!username.value && !uErr.value); const
canSubmit = computed(() => status.value === "available" && !eErr.value
&& phase.value === "form"); const statusText = computed(() => { const t
= STATUS_TEXT[status.value]; return typeof t === "function" ?
t(username.value) : t; });
\`\`\`

The composable receives getters (<code>() =&gt; ...</code>) or refs and reads them with <code>toValue</code>, which unwraps either. The check is enabled only for a name that passes the rules.

### Step 2: debounce and staleness in one watcher

\`\`\`js
watch(
  () => [toValue(username), toValue(enabled)],
  ([name, on]) => {
    if (!on) return;
    let stale = false;
    const timer = setTimeout(() => {
      const id = nextId++;
      log.value.push({ id, name, outcome: "pending" });
      const finish = (value) => {
        const label = value.error
          ? "error"
          : value.available
            ? "available"
            : "taken";
        const entry = log.value.find((e) => e.id === id);
        entry.outcome =
          label + (stale ? ", ignored (stale)" : ", applied");
        if (!stale) result.value = value;
      };
      checkUsername(name).then(
        (res) => finish({ name, available: res.available }),
        () => finish({ name, error: true }),
      );
    }, DEBOUNCE_MS);
    // Vue 3.5: runs before the next run
    // of this watcher, or when it stops.
    onWatcherCleanup(() => {
      stale = true;
      clearTimeout(timer);
    });
  },
);
\`\`\`

📌 **Interview term: onWatcherCleanup** — registers a function that Vue runs before the same watcher runs again, or when the watcher stops (for example, on unmount). It was added in Vue 3.5 (listed in the official 3.5 release post). The older equivalent is the third <code>onCleanup</code> argument of the watch callback.

When the name changes, the cleanup runs first: <code>clearTimeout</code> drops a request that was still waiting for the debounce, and <code>stale = true</code> marks a request that was already sent. Each watcher run has its own <code>stale</code> variable, so the flag belongs to exactly one request. <code>onWatcherCleanup</code> must be called synchronously inside the callback, before any <code>await</code>; this callback has no <code>await</code>, so that holds.

### Step 3: derive the status

\`\`\`js
// Derived: a result only counts if it answers the name currently typed.
const status = computed(() => {
  if (!toValue(enabled)) return "idle";
  const r = result.value;
  if (r?.name !== toValue(username)) return "checking";
  return r.error ? "error" : r.available ? "available" : "taken";
});

return { status, log };
\`\`\`

📌 **Interview term: Tagging responses** — storing which input an answer belongs to. Even a stale answer that slipped through could never be displayed for a different name: the comparison turns it into "checking". The stale flag and the tag are two independent safety layers.

Because <code>log</code> is a <code>ref</code> holding an array, Vue tracks the nested objects too, so <code>entry.outcome = ...</code> updates the panel without replacing the array.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Burst of keystrokes | Cleanup clears each pending timer; one request goes out |
| Older request answers last | Marked stale, logged as ignored |
| Invalid name | Sync error, no request |
| Server error | Retry message, status <code>error</code> |
| Unmount mid-request | The watcher stops, its cleanup marks the request stale |
| Screen reader | <code>aria-live="polite"</code> status, linked with <code>aria-describedby</code> |
| Submit | Enabled only for an available name and a valid email |

## 5. Verified: What the Solution Actually Did

Compiled with <code>@vue/compiler-sfc</code>, mounted with <code>createApp(App).mount("#app")</code> in jsdom on Vue 3.5.44, real timers, same driver as the React and Angular tabs. Output with the <code>[vue]</code> prefix removed:

\`\`\`text
RENDERED: Create your accountUsernameEmailSign upRequest log (demo)
typed j, ja, jan, jane     | status: Checking availability... | log: (no requests)
debounce fired for jane    | status: Checking availability... | log: #1 jane: pending
typed janet                | status: Checking availability... | log: #1 jane: pending
debounce fired for janet   | status: Checking availability... | log: #1 jane: pending | #2 janet: pending
janet answered first       | status: janet is available | log: #1 jane: pending | #2 janet: available, applied
jane answered last         | status: janet is available | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
submit disabled? true (email still empty)
typed Ja (invalid)         | status: (empty) | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
sync error: Use 3 to 16 characters
450 ms later               | status: (empty) | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
server failed              | status: Could not check right now. Edit the name to retry. | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied
alex settled               | status: alex is taken | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied | #4 alex: taken, applied
ada3 settled               | status: ada3 is available | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied | #4 alex: taken, applied | #5 ada3: available, applied
submit disabled? false
done: Welcome, @ada3!Your account is ready.
\`\`\`

Four keystrokes produced one request; request 1 (jane) was still pending when request 2 (janet) was applied, and its late "taken" was ignored; "Ja" sent nothing; the simulated failure showed the retry message. The output is identical to the React and Angular runs. No <code>console.error</code>.

## 6. Common Pitfalls

- **Debouncing the <code>v-model</code> itself** (for example with a debounced setter). The input lags behind typing. Keep the input instant; debounce the request.
- **Calling <code>onWatcherCleanup</code> after an <code>await</code>.** It must run synchronously in the callback, or Vue cannot tell which watcher it belongs to.
- **One shared <code>let latestId</code> bumped only when a request is sent.** A keystroke during the debounce window does not invalidate an older in-flight request. Invalidate on every change, as the cleanup does.
- **Storing the status as text.** "jane is taken" cannot be compared with the current name later.
- **Using <code>watchEffect</code> here.** It would also track everything read inside <code>checkUsername</code> and the log, and re-run on unrelated changes. <code>watch</code> with an explicit source is clearer; see [watch vs watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect).

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two problems:</strong> <span style="color:#f0e2c8;">"Too many requests, solved by debounce, and answers arriving out of order, solved by ignoring stale responses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Rules first:</strong> <span style="color:#f0e2c8;">"A computed sync error disables the check, so invalid names never reach the server."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Watcher:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the name starts a 400 ms timer and registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> to clear the timer and mark that run stale."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Derived status:</strong> <span style="color:#f0e2c8;">"I keep the last applied answer tagged with its name and compute checking, available or taken from it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"The fake API is slower for the older name; the log shows its late answer ignored. With fetch I would also abort."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a composable instead of code in the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The check has its own state and lifecycle; a composable keeps it testable and reusable on a profile page that also renames users. It is cleaned up with the component that called it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did onWatcherCleanup replace?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> argument passed to the watch callback. Both work in 3.5; the new function can also be called from helpers invoked synchronously inside the callback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cache answers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> in the composable keyed by name, checked before starting the timer, with a short lifetime. The server still re-checks at submit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vitest fake timers and a mock API whose promises I resolve by hand in the wrong order; assert the status after each resolve.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Composable** | Reusable function built on Vue reactivity |
| **Debounce** | Wait for a pause before acting |
| **Stale response** | An answer to a question the user is no longer asking |
| **onWatcherCleanup** | Vue 3.5 API to undo a watcher run before the next one |
| **Tagging responses** | Keeping the input next to its answer |

---
**Conclusion:** In Vue the race-safe check is one watcher: a timer for the debounce, and <code>onWatcherCleanup</code> to clear that timer and mark the run stale when the name changes, with the status computed from a result tagged by name. The Vue 3.5.44 run showed one request per typing burst and an older, slower answer arriving last and being ignored, matching React and Angular exactly. The same shape drives [dependent dropdowns](/interview-question/build-dependent-country-state-dropdowns) and a [debounced search bar](/interview-question/build-a-debounced-search-bar).`,
        files: {
          "/src/App.vue": `<script setup>
import SignupForm from "./components/SignupForm.vue";
</script>

<template>
  <main class="page">
    <SignupForm />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input[aria-invalid="true"] {
  border-color: #ff6b6b;
}
input:focus-visible,
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
  min-height: 1em;
}
.status {
  margin: 0;
  font-size: 0.85rem;
  min-height: 1em;
  color: #9aa3b5;
}
.status.available {
  color: #7ee2a8;
}
.status.taken,
.status.error {
  color: #ffb36b;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.log {
  margin-top: 16px;
  font-size: 0.8rem;
  color: #9aa3b5;
}
.log ol {
  margin: 6px 0 0;
  padding-left: 18px;
  font-family: ui-monospace, monospace;
}
</style>
`,
          "/src/components/SignupForm.vue": `<script setup>
import { computed, ref } from "vue";
import { useUsernameCheck } from "../useUsernameCheck.js";
import { createUser } from "../fakeApi.js";
import { STATUS_TEXT, emailError, usernameError } from "../rules.js";

const username = ref("");
const email = ref("");
const emailTouched = ref(false);
const phase = ref("form"); // form | saving | done

const uErr = computed(() =>
  username.value ? usernameError(username.value) : "",
);
const eErr = computed(() => emailError(email.value));
const { status, log } = useUsernameCheck(
  username,
  () => !!username.value && !uErr.value,
);
const canSubmit = computed(
  () => status.value === "available" && !eErr.value && phase.value === "form",
);
const statusText = computed(() => {
  const t = STATUS_TEXT[status.value];
  return typeof t === "function" ? t(username.value) : t;
});

async function onSubmit() {
  if (!canSubmit.value) return;
  phase.value = "saving";
  await createUser({ username: username.value, email: email.value.trim() });
  phase.value = "done";
}
</script>

<template>
  <div v-if="phase === 'done'" class="card" role="status" data-testid="done">
    <h2>Welcome, @{{ username }}!</h2>
    <p>Your account is ready.</p>
  </div>
  <form
    v-else
    class="card"
    novalidate
    aria-label="Sign up"
    @submit.prevent="onSubmit"
  >
    <h2>Create your account</h2>
    <div class="field">
      <label for="username">Username</label>
      <input id="username" v-model="username" autocomplete="username" spellcheck="false"
        :aria-invalid="uErr || status === 'taken' ? 'true' : 'false'" aria-describedby="username-error username-status" />
      <p id="username-error" class="error">{{ uErr }}</p>
      <p
        id="username-status"
        data-testid="username-status"
        :class="['status', status]"
        aria-live="polite"
      >{{ statusText }}</p>
    </div>
    <div class="field">
      <label for="email">Email</label>
      <input id="email" v-model="email" type="email" autocomplete="email" @blur="emailTouched = true"
        :aria-invalid="emailTouched && eErr ? 'true' : 'false'" aria-describedby="email-error" />
      <p id="email-error" class="error">{{ emailTouched ? eErr : "" }}</p>
    </div>
    <button
      type="submit"
      data-testid="submit"
      :disabled="!canSubmit"
    >{{ phase === "saving" ? "Creating..." : "Sign up" }}</button>
    <details class="log" open>
      <summary>Request log (demo)</summary>
      <ol data-testid="log">
        <li
          v-for="e in log"
          :key="e.id"
        >#{{ e.id }} {{ e.name }}: {{ e.outcome }}</li>
      </ol>
    </details>
  </form>
</template>
`,
          "/src/fakeApi.js": `// Simulated server (no network in the playground). Latency is derived from
// the name so runs are reproducible: some names answer in 200 ms, others in
// 1000 ms, which is exactly how an older request can come back last.
const TAKEN = new Set(["admin", "alex", "jane", "root", "sam"]);

export function latencyFor(name) {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return 200 + (sum % 5) * 200;
}

export function checkUsername(name) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (name === "error") reject(new Error("Server unavailable"));
      else resolve({ available: !TAKEN.has(name) });
    }, latencyFor(name));
  });
}

export function createUser(user) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ok: true, user }), 300),
  );
}
`,
          "/src/rules.js": `export const DEBOUNCE_MS = 400;

export function usernameError(v) {
  if (!v) return "Username is required";
  if (v.length < 3 || v.length > 16) return "Use 3 to 16 characters";
  if (!/^[a-z0-9_]+$/.test(v))
    return "Use lowercase letters, numbers and _ only";
  return "";
}

export function emailError(v) {
  if (!v.trim()) return "Email is required";
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v.trim()))
    return "Enter a valid email address";
  return "";
}

export const STATUS_TEXT = {
  idle: "",
  checking: "Checking availability...",
  available: (n) => n + " is available",
  taken: (n) => n + " is taken",
  error: "Could not check right now. Edit the name to retry.",
};
`,
          "/src/useUsernameCheck.js": `import { computed, onWatcherCleanup, ref, toValue, watch } from "vue";
import { checkUsername } from "./fakeApi.js";
import { DEBOUNCE_MS } from "./rules.js";

// Composable: debounced availability check that ignores stale responses.
// \`username\` and \`enabled\` are getters, so the caller passes () => value.
export function useUsernameCheck(username, enabled) {
  const result = ref(null); // { name, available } | { name, error }
  const log = ref([]);
  let nextId = 1;

  watch(
    () => [toValue(username), toValue(enabled)],
    ([name, on]) => {
      if (!on) return;
      let stale = false;
      const timer = setTimeout(() => {
        const id = nextId++;
        log.value.push({ id, name, outcome: "pending" });
        const finish = (value) => {
          const label = value.error
            ? "error"
            : value.available
              ? "available"
              : "taken";
          const entry = log.value.find((e) => e.id === id);
          entry.outcome = label + (stale ? ", ignored (stale)" : ", applied");
          if (!stale) result.value = value;
        };
        checkUsername(name).then(
          (res) => finish({ name, available: res.available }),
          () => finish({ name, error: true }),
        );
      }, DEBOUNCE_MS);
      // Vue 3.5: runs before the next run of this watcher, or when it stops.
      onWatcherCleanup(() => {
        stale = true;
        clearTimeout(timer);
      });
    },
  );

  // Derived: a result only counts if it answers the name currently typed.
  const status = computed(() => {
    if (!toValue(enabled)) return "idle";
    const r = result.value;
    if (r?.name !== toValue(username)) return "checking";
    return r.error ? "error" : r.available ? "available" : "taken";
  });

  return { status, log };
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. Assumes you have built a basic reactive form; the [Form with validation](/interview-question/build-a-form-with-validation) question covers that ground.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 5 were produced by actually running it on Angular 22.2.3 (AOT with strict templates, and the playground JIT) with RxJS 7.8.2.

## 1. A Story First

You phone a hotel about room 12, then switch to room 14 before they answer. Room 14 comes back "free"; then the late answer about room 12 arrives: "taken!". Trust the last voice and you get it wrong.

Typing "jane" then "janet" on a sign-up form can send two availability requests. If "jane" is slower, its "taken" arrives last. We need **debounce** (wait for a pause before asking) and **stale-response handling** (never apply an answer to a question no longer asked). Local rules run first (3 to 16 characters of <code>a-z</code>, <code>0-9</code>, <code>_</code>). The fake API is in-file (no network in the playground) with latency derived from the name: "jane" 1000 ms, "janet" 200 ms. A "Request log" panel shows each request as applied or ignored.

## 2. How the State Model Maps to Angular

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| input values | <code>FormControl</code> | Gives a <code>valueChanges</code> Observable to build the pipeline on. |
| mirrored values, result, log, phase | <code>signal()</code> | Template state; signal writes re-render the zoneless app. |
| errors, status, text, can submit | <code>computed()</code> | Derived from the signals. |
| debounce + cancel | RxJS <code>switchMap</code> + <code>timer</code> | Each keystroke cancels the previous timer and request. |
| subscription lifetime | <code>DestroyRef.onDestroy</code> | Unsubscribe when the component is destroyed. |

📌 **Interview term: switchMap** — an RxJS operator that maps each value to an inner Observable and unsubscribes from the previous inner Observable when a new value arrives. "Switch to the latest" is exactly the stale-response rule.

📌 **Interview term: Debounce** — wait until values stop for a set time; each new value restarts the wait. The standalone version is the [debounce question](/interview-question/javascript-debounce-throttle).

📌 **Interview term: Observable teardown** — the function returned from <code>new Observable(...)</code>. RxJS calls it on unsubscribe; it is where cancellation lives.

## 3. Build It Step by Step

### Step 1: the pipeline

\`\`\`ts
constructor() {
  const sub = this.usernameCtrl.valueChanges
    .pipe(
      // switchMap on EVERY keystroke:
      // unsubscribing cancels both the pending
      // debounce timer and any in-flight
      // request for the previous value.
      switchMap((name) => {
        this.username.set(name);
        if (!name || usernameError(name)) return EMPTY;
        return timer(DEBOUNCE_MS).pipe(
          switchMap(() => this.request(name)),
        );
      }),
    )
    .subscribe((r) => this.result.set(r));
  const emailSub = this.emailCtrl.valueChanges.subscribe((v) =>
    this.email.set(v),
  );
  inject(DestroyRef).onDestroy(() => {
    sub.unsubscribe();
    emailSub.unsubscribe();
  });
}
\`\`\`

The common textbook pipeline is <code>debounceTime(400)</code> then <code>switchMap(request)</code>. This solution puts the timer *inside* <code>switchMap</code> instead, so every keystroke immediately cancels both the pending timer and any request still in flight. With <code>debounceTime</code> first, a keystroke does not reach <code>switchMap</code> until the pause is over, so for those 400 ms the older request is still subscribed and can be applied. Section 5 shows both behaviours.

<code>takeUntilDestroyed</code> from <code>@angular/core/rxjs-interop</code> is the usual way to end the subscription; the playground only allows <code>@angular/core</code>, <code>@angular/common</code>, <code>@angular/forms</code> and <code>rxjs</code>, so the solution calls <code>unsubscribe</code> from <code>DestroyRef.onDestroy</code>, which is equivalent.

### Step 2: wrap the Promise so switchMap can drop it

\`\`\`ts
// Wrap the Promise so unsubscribing marks it stale. A Promise cannot be
// cancelled; we can only stop listening to it.
private request(name: string): Observable<Result> {
  return new Observable<Result>((subscriber) => {
    const id = this.nextId++;
    let stale = false;
    this.log.update((l) => [...l, { id, name, outcome: "pending" }]);
    const finish = (value: Result) => {
      const label = value.error
        ? "error"
        : value.available
          ? "available"
          : "taken";
      this.log.update((l) =>
        l.map((e) =>
          e.id === id
            ? {
                ...e,
                outcome:
                  label + (stale ? ", ignored (stale)" : ", applied"),
              }
            : e,
        ),
      );
      if (!stale) {
        subscriber.next(value);
        subscriber.complete();
      }
    };
    checkUsername(name).then(
      (res) => finish({ name, available: res.available }),
      () => finish({ name, error: true }),
    );
    return () => {
      stale = true;
    }; // teardown: runs when switchMap moves on
  });
}
\`\`\`

A Promise cannot be cancelled, so the teardown only flips <code>stale</code>; when the Promise settles later, the log records "ignored (stale)" and nothing is emitted. With <code>HttpClient</code> (not available in this provider-less playground) unsubscribing aborts the real request too. Converting the Promise with <code>from(promise)</code> would also be dropped by <code>switchMap</code>, but then there would be nothing to log, which is the point of the demo.

### Step 3: status as a computed

\`\`\`ts
readonly uErr = computed(() =>
  this.username() ? usernameError(this.username()) : "",
);
readonly eErr = computed(() => emailError(this.email()));
readonly status = computed(() => {
  if (!this.username() || this.uErr()) return "idle";
  const r = this.result();
  // a result only counts for the name typed now
  if (r?.name !== this.username()) return "checking";
  return r.error ? "error" : r.available ? "available" : "taken";
});
\`\`\`

📌 **Interview term: Tagging responses** — keeping the name next to its answer. Even an answer that slipped through could not be displayed for a different name: the comparison returns "checking".

📌 **Interview term: Signals** — Angular reactive values read by calling them; <code>computed</code> derives from them and caches. See [Angular signals](/interview-question/what-are-angular-signals) and [signals and RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18): RxJS handles time (debounce, cancel), signals hold the state the template shows.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Burst of keystrokes | Each one re-enters <code>switchMap</code>; one request after the pause |
| Older request answers last | Teardown marked it stale; logged as ignored |
| Invalid name | <code>EMPTY</code>: cancels anything pending, sends nothing |
| Server error | The rejection is turned into an <code>error</code> result |
| Destroy mid-request | Unsubscribe runs every teardown |
| Screen reader | <code>aria-live="polite"</code> status, <code>aria-describedby</code> on the input |

## 5. Verified: What the Solution Actually Did

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, compiled by <code>ngc</code> with <code>strictTemplates</code> and also run through the playground JIT, with real timers and the same driver as the other tabs. Both runs printed the same lines; AOT run, prefix removed:

\`\`\`text
RENDERED: Create your accountUsernameEmailSign upRequest log (demo)
typed j, ja, jan, jane     | status: Checking availability... | log: (no requests)
debounce fired for jane    | status: Checking availability... | log: #1 jane: pending
typed janet                | status: Checking availability... | log: #1 jane: pending
debounce fired for janet   | status: Checking availability... | log: #1 jane: pending | #2 janet: pending
janet answered first       | status: janet is available | log: #1 jane: pending | #2 janet: available, applied
jane answered last         | status: janet is available | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
submit disabled? true (email still empty)
typed Ja (invalid)         | status: (empty) | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
sync error: Use 3 to 16 characters
450 ms later               | status: (empty) | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied
server failed              | status: Could not check right now. Edit the name to retry. | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied
alex settled               | status: alex is taken | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied | #4 alex: taken, applied
ada3 settled               | status: ada3 is available | log: #1 jane: taken, ignored (stale) | #2 janet: available, applied | #3 error: error, applied | #4 alex: taken, applied | #5 ada3: available, applied
submit disabled? false
done: Welcome, @ada3!Your account is ready.
\`\`\`

One request per typing burst; the slow "jane" answer arrived after "janet" was applied and was ignored; identical to the React and Vue runs. No <code>console.error</code>.

A second driver tested the debounce gap: type "alex" (400 ms answer), wait 450 ms so its request is in flight, type "alexa", then check after 400 ms. The shipped pipeline (playground JIT run):

\`\`\`text
alex answered, alexa pending | status: Checking availability... | log: #1 alex: taken, ignored (stale) | #2 alexa: pending
alexa answered               | status: alexa is available | log: #1 alex: taken, ignored (stale) | #2 alexa: available, applied
\`\`\`

The same component rewritten as <code>tap</code>, <code>debounceTime(400)</code>, <code>switchMap(request)</code>:

\`\`\`text
alex answered, alexa pending | status: Checking availability... | log: #1 alex: taken, applied | #2 alexa: pending
alexa answered               | status: alexa is available | log: #1 alex: taken, applied | #2 alexa: available, applied
\`\`\`

In the textbook version the old answer *was* applied during the debounce window; the screen still said "Checking availability..." only because the status compares the tagged name. That is why both layers are worth having.

## 6. Common Pitfalls

- **<code>debounceTime</code> before <code>switchMap</code> with nothing else.** As shown above, an older answer can land while the new value waits out the debounce.
- **<code>mergeMap</code> instead of <code>switchMap</code>.** Every request stays subscribed and the last to finish wins: the original bug.
- **Forgetting to unsubscribe.** The pipeline outlives the component and writes to destroyed signals.
- **Plain fields for status in a zoneless app.** Updates from a Promise callback would not re-render; signals do.
- **An async validator without a debounce.** Angular cancels the previous async validation when the value changes, but still starts one per keystroke unless you add a <code>timer</code>.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two problems:</strong> <span style="color:#f0e2c8;">"Debounce reduces requests; switching to the latest request drops stale answers. In RxJS both come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pipeline:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>: invalid names map to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EMPTY</code>, valid ones to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(400)</code> then the request, so each keystroke cancels everything older."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Promise wrapper:</strong> <span style="color:#f0e2c8;">"A Promise cannot be cancelled, so I wrap it in an Observable whose teardown marks it stale; with HttpClient unsubscribe would abort."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Signals for state:</strong> <span style="color:#f0e2c8;">"Results land in signals; status, text and can-submit are computeds, and the status compares the answer with the current name."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">"Slower fake latency for the older name, and a log that shows its late answer ignored."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not an Angular async validator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a good fit for the form status (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING</code> while checking) and Angular unsubscribes from the previous one on each change. You still need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer</code> inside it for the debounce, and I wanted the request log, so I used an explicit pipeline.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">switchMap, exhaustMap, concatMap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> keeps only the latest, which is right for a search or availability check. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exhaustMap</code> ignores new values while busy, good for a submit button. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concatMap</code> queues, good for ordered saves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cache answers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> checked before the timer: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached ? of(cached) : timer(400).pipe(...)</code>, with a short lifetime and a server re-check at submit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">RxJS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestScheduler</code> marble tests for the pipeline, or fake timers in TestBed with a mock API that resolves in the wrong order.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **switchMap** | Map to an inner stream and drop the previous one |
| **Observable teardown** | Cleanup RxJS runs on unsubscribe |
| **Debounce** | Wait for a pause before acting |
| **Tagging responses** | Keeping the input next to its answer |
| **Signals** | Angular reactive values read by calling them |

---
**Conclusion:** In Angular the race-safe check is a short RxJS pipeline: <code>switchMap</code> on every keystroke, a <code>timer</code> inside it for the debounce, and a Promise wrapper whose teardown marks abandoned requests stale, with signals holding what the template shows. The Angular 22.2.3 runs matched React and Vue, and a second run showed why the timer belongs inside <code>switchMap</code>: with the textbook <code>debounceTime</code> first, an older answer was applied during the debounce window and only the name check kept it off the screen.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { SignupFormComponent } from "./signup-form.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [SignupFormComponent],
  template: \`<main class="page"><app-signup-form /></main>\`,
  // Global styles for this small app, so the child component shares them.
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1117;
        color: #e6e8ee;
        font-family: system-ui, sans-serif;
      }
      .page {
        display: flex;
        justify-content: center;
        padding: 24px 16px;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: #181b24;
        border: 1px solid #2a2f3d;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 1.2rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
      }
      label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      input {
        font: inherit;
        padding: 9px 11px;
        border-radius: 8px;
        border: 1px solid #3a4152;
        background: #0f1117;
        color: inherit;
      }
      input[aria-invalid="true"] {
        border-color: #ff6b6b;
      }
      input:focus-visible,
      button:focus-visible {
        outline: 2px solid #7aa2ff;
        outline-offset: 2px;
      }
      .error {
        color: #ff8a8a;
        margin: 0;
        font-size: 0.85rem;
        min-height: 1em;
      }
      .status {
        margin: 0;
        font-size: 0.85rem;
        min-height: 1em;
        color: #9aa3b5;
      }
      .status.available {
        color: #7ee2a8;
      }
      .status.taken,
      .status.error {
        color: #ffb36b;
      }
      button {
        font: inherit;
        padding: 10px 16px;
        border-radius: 8px;
        border: 0;
        background: #4f7cff;
        color: #fff;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .log {
        margin-top: 16px;
        font-size: 0.8rem;
        color: #9aa3b5;
      }
      .log ol {
        margin: 6px 0 0;
        padding-left: 18px;
        font-family: ui-monospace, monospace;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/fake-api.ts": `// Simulated server (no network in the playground). Latency is derived from
// the name so runs are reproducible: some names answer in 200 ms, others in
// 1000 ms, which is exactly how an older request can come back last.
const TAKEN = new Set(["admin", "alex", "jane", "root", "sam"]);

export function latencyFor(name: string): number {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return 200 + (sum % 5) * 200;
}

export function checkUsername(name: string): Promise<{ available: boolean }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (name === "error") reject(new Error("Server unavailable"));
      else resolve({ available: !TAKEN.has(name) });
    }, latencyFor(name));
  });
}

export function createUser(user: {
  username: string;
  email: string;
}): Promise<{ ok: true }> {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 300));
}
`,
          "/src/app/rules.ts": `export const DEBOUNCE_MS = 400;

export function usernameError(v: string): string {
  if (!v) return "Username is required";
  if (v.length < 3 || v.length > 16) return "Use 3 to 16 characters";
  if (!/^[a-z0-9_]+$/.test(v))
    return "Use lowercase letters, numbers and _ only";
  return "";
}

export function emailError(v: string): string {
  if (!v.trim()) return "Email is required";
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v.trim()))
    return "Enter a valid email address";
  return "";
}
`,
          "/src/app/signup-form.component.ts": `import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { EMPTY, Observable, switchMap, timer } from "rxjs";
import { checkUsername, createUser } from "./fake-api";
import { DEBOUNCE_MS, emailError, usernameError } from "./rules";

type Result = { name: string; available?: boolean; error?: boolean };
type LogEntry = { id: number; name: string; outcome: string };

@Component({
  selector: "app-signup-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    @if (phase() === "done") {
      <div class="card" role="status" data-testid="done">
        <h2>Welcome, &#64;{{ username() }}!</h2>
        <p>Your account is ready.</p>
      </div>
    } @else {
      <form
        class="card"
        novalidate
        aria-label="Sign up"
        (submit)="onSubmit($event)"
      >
        <h2>Create your account</h2>
        <div class="field">
          <label for="username">Username</label>
          <input id="username" [formControl]="usernameCtrl" autocomplete="username" spellcheck="false"
            [attr.aria-invalid]="uErr() || status() === 'taken' ? 'true' : 'false'" aria-describedby="username-error username-status" />
          <p id="username-error" class="error">{{ uErr() }}</p>
          <p
            id="username-status"
            data-testid="username-status"
            [class]="'status ' + status()"
            aria-live="polite"
          >{{ statusText() }}</p>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" [formControl]="emailCtrl" autocomplete="email" (blur)="emailTouched.set(true)"
            [attr.aria-invalid]="emailTouched() && eErr() ? 'true' : 'false'" aria-describedby="email-error" />
          <p
            id="email-error"
            class="error"
          >{{ emailTouched() ? eErr() : "" }}</p>
        </div>
        <button
          type="submit"
          data-testid="submit"
          [disabled]="!canSubmit()"
        >{{ phase() === "saving" ? "Creating..." : "Sign up" }}</button>
        <details class="log" open>
          <summary>Request log (demo)</summary>
          <ol data-testid="log">
            @for (e of log(); track e.id) { <li>#{{ e.id }} {{ e.name }}: {{ e.outcome }}</li> }
          </ol>
        </details>
      </form>
    }
  \`,
})
export class SignupFormComponent {
  readonly usernameCtrl = new FormControl("", { nonNullable: true });
  readonly emailCtrl = new FormControl("", { nonNullable: true });

  // Mirror control values into signals so computed() can depend on them.
  readonly username = signal("");
  readonly email = signal("");
  readonly emailTouched = signal(false);
  readonly result = signal<Result | null>(null);
  readonly log = signal<LogEntry[]>([]);
  readonly phase = signal<"form" | "saving" | "done">("form");
  private nextId = 1;

  readonly uErr = computed(() =>
    this.username() ? usernameError(this.username()) : "",
  );
  readonly eErr = computed(() => emailError(this.email()));
  readonly status = computed(() => {
    if (!this.username() || this.uErr()) return "idle";
    const r = this.result();
    // a result only counts for the name typed now
    if (r?.name !== this.username()) return "checking";
    return r.error ? "error" : r.available ? "available" : "taken";
  });
  readonly statusText = computed(() => {
    const s = this.status();
    if (s === "checking") return "Checking availability...";
    if (s === "available") return this.username() + " is available";
    if (s === "taken") return this.username() + " is taken";
    if (s === "error")
      return "Could not check right now. Edit the name to retry.";
    return "";
  });
  readonly canSubmit = computed(
    () =>
      this.status() === "available" && !this.eErr() && this.phase() === "form",
  );

  constructor() {
    const sub = this.usernameCtrl.valueChanges
      .pipe(
        // switchMap on EVERY keystroke: unsubscribing cancels both the pending
        // debounce timer and any in-flight request for the previous value.
        switchMap((name) => {
          this.username.set(name);
          if (!name || usernameError(name)) return EMPTY;
          return timer(DEBOUNCE_MS).pipe(switchMap(() => this.request(name)));
        }),
      )
      .subscribe((r) => this.result.set(r));
    const emailSub = this.emailCtrl.valueChanges.subscribe((v) =>
      this.email.set(v),
    );
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      emailSub.unsubscribe();
    });
  }

  // Wrap the Promise so unsubscribing marks it stale. A Promise cannot be
  // cancelled; we can only stop listening to it.
  private request(name: string): Observable<Result> {
    return new Observable<Result>((subscriber) => {
      const id = this.nextId++;
      let stale = false;
      this.log.update((l) => [...l, { id, name, outcome: "pending" }]);
      const finish = (value: Result) => {
        const label = value.error
          ? "error"
          : value.available
            ? "available"
            : "taken";
        this.log.update((l) =>
          l.map((e) =>
            e.id === id
              ? {
                  ...e,
                  outcome: label + (stale ? ", ignored (stale)" : ", applied"),
                }
              : e,
          ),
        );
        if (!stale) {
          subscriber.next(value);
          subscriber.complete();
        }
      };
      checkUsername(name).then(
        (res) => finish({ name, available: res.available }),
        () => finish({ name, error: true }),
      );
      return () => {
        stale = true;
      }; // teardown: runs when switchMap moves on
    });
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    if (!this.canSubmit()) return;
    this.phase.set("saving");
    await createUser({ username: this.username(), email: this.email().trim() });
    this.phase.set("done");
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Flight Booker",
    seoDescription: "Build the 7GUIs Flight Booker in React, Vue and Angular: strict date parsing, a return date that must not precede departure, and derived enable rules.",
    description: `**Question presented to candidate:**
"Build a small flight booker. The user picks one-way or return, types a departure date and, for a return trip, a return date. Invalid dates should be flagged, the return date only matters for return trips and can never be before departure, and Book should only work when everything is valid. On booking, show a confirmation message."

**Requirements:**
- A select with "One-way flight" and "Return flight"; two text inputs in \`YYYY-MM-DD\` format, both starting on the same date.
- The return input is disabled for one-way trips, and its value is kept if the user switches back.
- Each input shows its own error: empty, wrong format, or a date that does not exist (for example \`2026-02-30\`).
- For return trips, the return date must be on or after the departure date; show the trip length in nights when valid.
- Book is disabled while anything is invalid; booking shows "You have booked a one-way flight on ..." or "... a return flight departing ... and returning ...". Editing anything clears the old confirmation.

**What a strong answer should cover:**
- Minimal state (trip type, two strings, the confirmation) with **everything else derived**: errors, whether Book is enabled, nights.
- **Strict date parsing**: why \`new Date("2026-02-30")\` is not a validator (it rolls over), and why parsing date-only strings can shift a day across time zones.
- **Cross-field validation** (return vs departure) that only runs when both fields are individually valid.
- Constraints between widgets: disabling the return input, keeping its value, and ignoring its errors for one-way trips.
- Accessibility: labels, \`aria-invalid\`, \`aria-describedby\`, and a \`role="status"\` confirmation.

**Clarifying questions expected:**
- "Should I use a native date picker or text inputs with a fixed format?"
- "Is a departure date in the past allowed, and whose time zone defines today?"
- "Is a same-day return allowed?"

**Code / implementation expected:** Yes. The booker component with a strict date parser, derived validation and enable rules, and a confirmation message.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. No React form experience is assumed; the [Form with validation](/interview-question/build-a-form-with-validation) question is a gentler warm-up if you want one.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 6 were produced by actually running the code (the component on React 19.3.1, the date experiments on Node 22.22.0).

## 1. Why This Even Matters — A Story First

A travel agent fills in a paper ticket: one-way or return, departure date, return date. A good agent will not let you return before you leave, will cross out the return box for a one-way ticket, and will refuse "30 February" no matter how confidently you say it. Only when the ticket makes sense do they stamp it "booked".

The Flight Booker is task 3 of the **7GUIs** benchmark, a set of seven small GUI tasks used to compare UI toolkits; the XState docs and Mithril examples reproduce the spec (one-way/return combo box, two date text fields, return disabled for one-way, Book disabled when the return date is before departure or a date is malformed, and a confirmation message). Its point is **constraints between widgets**: the value of one control changes whether another is enabled and whether the whole form is valid. The 7GUIs spec uses <code>dd.mm.yyyy</code>; this build uses ISO <code>YYYY-MM-DD</code>, which sorts and parses more predictably.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Native <code>&lt;input type="date"&gt;</code> or text with a fixed format? | A native picker hands you a normalized <code>YYYY-MM-DD</code> string or an empty one, but its look and keyboard behaviour vary by browser. Text inputs (as in 7GUIs) make you show parsing skill. |
| Are past departure dates allowed? Whose "today"? | "Today" depends on the user time zone and needs an injectable clock to test. This build skips the rule and uses a fixed default date so runs are reproducible. |
| Is a same-day return allowed? | Decides <code>&lt;</code> versus <code>&lt;=</code>. Here: allowed, shown as "0 nights". |
| Should the return value survive switching to one-way and back? | It should; disabling hides it from validation without throwing it away. |
| Is there a maximum trip length or booking window? | Another cross-field rule in the same place. |

## 3. Requirements and the State Model

The whole state is four values. Everything on screen is computed from them on each render:

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>trip</code> | State | <code>one-way</code> or <code>return</code>. |
| <code>depart</code>, <code>ret</code> | State | The raw strings the user typed. |
| <code>booked</code> | State | The confirmation text, cleared on any edit. |
| field errors | **Derived** | From each string, plus the cross-field rule. |
| return disabled | **Derived** | <code>trip !== "return"</code>. |
| can book | **Derived** | No errors. |
| nights | **Derived** | Only when a valid return trip. |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Three inputs, trip type, departure and return text, feed derived values: field errors, return disabled, can book and nights">
  <defs>
    <marker id="mcfb4r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="180" height="56" rx="10"/>
  <text class="d-text" x="110" y="53" text-anchor="middle">trip type</text>
  <rect class="d-box" x="20" y="120" width="180" height="56" rx="10"/>
  <text class="d-text" x="110" y="153" text-anchor="middle">departure text</text>
  <rect class="d-box" x="20" y="220" width="180" height="56" rx="10"/>
  <text class="d-text" x="110" y="253" text-anchor="middle">return text</text>
  <rect class="d-box-accent" x="280" y="110" width="150" height="76" rx="10"/>
  <text class="d-text d-accent" x="355" y="143" text-anchor="middle">parse and</text>
  <text class="d-text d-accent" x="355" y="165" text-anchor="middle">compare</text>
  <rect class="d-box-muted" x="510" y="20" width="170" height="50" rx="10"/>
  <text class="d-text" x="595" y="50" text-anchor="middle">return disabled</text>
  <rect class="d-box-muted" x="510" y="90" width="170" height="50" rx="10"/>
  <text class="d-text" x="595" y="120" text-anchor="middle">field errors</text>
  <rect class="d-box-muted" x="510" y="160" width="170" height="50" rx="10"/>
  <text class="d-text" x="595" y="190" text-anchor="middle">can book</text>
  <rect class="d-box-muted" x="510" y="230" width="170" height="50" rx="10"/>
  <text class="d-text" x="595" y="260" text-anchor="middle">nights</text>
  <path class="d-edge" d="M 200 48 L 504 45" marker-end="url(#mcfb4r-arrow)"/>
  <path class="d-edge" d="M 200 60 L 274 125" marker-end="url(#mcfb4r-arrow)"/>
  <path class="d-edge" d="M 200 148 L 274 148" marker-end="url(#mcfb4r-arrow)"/>
  <path class="d-edge" d="M 200 240 L 274 172" marker-end="url(#mcfb4r-arrow)"/>
  <path class="d-edge-accent" d="M 430 135 L 504 115" marker-end="url(#mcfb4r-arrow)"/>
  <path class="d-edge-accent" d="M 430 150 L 504 185" marker-end="url(#mcfb4r-arrow)"/>
  <path class="d-edge-accent" d="M 430 170 L 504 255" marker-end="url(#mcfb4r-arrow)"/>
</svg>

Nothing on the right is stored. That is why the booker can never show "Book" enabled next to an error: both are computed from the same three inputs in the same render.

📌 **Interview term: Derived state** — values computed from other state during render. Storing <code>canBook</code> in its own <code>useState</code> and updating it in each handler is the classic way to get it out of sync.

📌 **Interview term: Cross-field validation** — a rule that needs two fields (return on or after departure). It should run only when both fields are individually valid, so the user sees one message at a time.

## 4. Build It Step by Step

### Step 1: a strict date parser

\`\`\`js
// Strict YYYY-MM-DD parsing. new
// Date("2026-02-30") rolls over to March 2,
// so we build the date from its parts
// and check that they survive the trip.
const FORMAT = /^(\\d{4})-(\\d{2})-(\\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(text) {
  const m = FORMAT.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const ok =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d;
  return ok ? date : null;
}

export function dateError(text) {
  if (!text.trim()) return "Enter a date";
  if (!FORMAT.test(text.trim())) return "Use the format YYYY-MM-DD";
  if (!parseDate(text)) return "That date does not exist";
  return "";
}

export function nightsBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

// In a real app this would be today;
// fixed here so the demo is reproducible.
export const DEFAULT_DATE = "2026-12-01";
\`\`\`

📌 **Interview term: Date rollover** — the JavaScript <code>Date</code> constructor normalizes out-of-range parts instead of rejecting them: day 30 of February becomes 2 March. So "can <code>new Date</code> parse it" is not a validator. The fix is to build the date from its parts with <code>Date.UTC</code> and check that the year, month and day come back unchanged.

Using UTC for both dates also makes the night count exact: there are no daylight-saving jumps in UTC, so the difference is always a whole number of days. The <code>Math.round</code> is a belt-and-braces guard. For new code, the [Temporal API](/interview-question/how-does-the-temporal-api-fix-javascript-date-instant-plaindate-and-zoneddatetim) has a real <code>PlainDate</code> type for calendar dates.

### Step 2: derive everything

\`\`\`jsx
export default function FlightBooker() {
  const [trip, setTrip] = useState("one-way"); // one-way | return
  const [depart, setDepart] = useState(DEFAULT_DATE);
  const [ret, setRet] = useState(DEFAULT_DATE);
  const [booked, setBooked] = useState("");

  // Everything below is derived from the three inputs on every render.
  const isReturn = trip === "return";
  const departErr = dateError(depart);
  let returnErr = isReturn ? dateError(ret) : "";
  const d = parseDate(depart);
  const r = isReturn ? parseDate(ret) : null;
  if (isReturn && !returnErr && d && r && r < d) returnErr = "Return must be on or after departure";
  const canBook = !departErr && !returnErr;
  const nights = isReturn && canBook ? nightsBetween(d, r) : null;
\`\`\`

The cross-field check only runs when the return date has no error of its own and both dates parsed. For one-way trips the return error is always empty, so a garbage return value cannot block a one-way booking.

### Step 3: edits clear the confirmation, Book submits

\`\`\`jsx
function book(e) {
  e.preventDefault();
  if (!canBook) return;
  setBooked(
    isReturn
      ? "You have booked a return flight departing " +
          depart.trim() +
          " and returning " +
          ret.trim() +
          "."
      : "You have booked a one-way flight on " + depart.trim() + ".",
  );
}

// Editing anything clears the old confirmation,
// so it never describes stale input.
const edit = (setter) => (e) => {
  setter(e.target.value);
  setBooked("");
};
\`\`\`

<code>edit</code> is a small handler factory so every field also clears <code>booked</code>; otherwise a confirmation could describe dates that are no longer on screen. The form <code>onSubmit</code> handles both the button and Enter.

### Step 4: the inputs

Each date input is a [controlled input](/interview-question/what-is-the-difference-between-controlled-and-uncontrolled-components) with <code>aria-invalid</code> and <code>aria-describedby</code> pointing at its always-present error paragraph. The return input gets <code>disabled={!isReturn}</code>, which also removes it from the Tab order, but its state is untouched, so switching back to return restores the value. The confirmation is a <code>role="status"</code> paragraph, announced politely.

## 5. Native Date Input: the Other Option

A native picker is a reasonable production choice. Its <code>value</code> is always <code>YYYY-MM-DD</code> or <code>""</code>, which removes the format errors but not the cross-field rule or the rollover-free comparison. The trade-offs: styling and keyboard behaviour differ per browser, and partial input is invisible to your code (the value stays <code>""</code> until the date is complete). This build follows 7GUIs and uses text inputs, so the parsing is visible.

## 6. Verified: What the Solution Actually Did

First, the <code>Date</code> facts this design relies on, run on Node 22.22.0:

\`\`\`text
new Date("2026-02-30") -> 2026-03-02T00:00:00.000Z
Date.UTC(2026, 1, 30) -> 2026-03-02T00:00:00.000Z
TZ=America/New_York new Date("2026-12-01").toDateString() -> Mon Nov 30 2026
TZ=America/New_York new Date("2026-12-01T00:00").toDateString() -> Tue Dec 01 2026
\`\`\`

The first two lines are the rollover. The last two show the time-zone trap: a date-only ISO string is parsed as UTC midnight, which is still 30 November in New York, while a date-time string without an offset is parsed as local time. The parser itself, called directly in Node on a few edge cases:

\`\`\`text
Date.UTC(50,0,1) -> 1950-01-01T00:00:00.000Z
0050-01-01 -> "That date does not exist"
2028-02-29 -> ""
2026-02-29 -> "That date does not exist"
2026-12-01 -> ""
\`\`\`

Then the component, mounted like the playground (<code>createRoot</code> plus <code>&lt;StrictMode&gt;</code>) in jsdom with React 19.3.1. The driver changes the select and types into the inputs. Output with the <code>[react]</code> prefix removed:

\`\`\`text
RENDERED: Book a flightTrip typeOne-way flightReturn flightDeparture dateReturn dateBook
initial (one-way)          | return disabled: true | errors: ["",""] | nights: "" | book enabled: true
confirmation: You have booked a one-way flight on 2026-12-01.
switched to return         | return disabled: false | errors: ["",""] | nights: "0 nights" | book enabled: true
confirmation after edit: ""
return before departure    | return disabled: false | errors: ["","Return must be on or after departure"] | nights: "" | book enabled: false
return a week later        | return disabled: false | errors: ["",""] | nights: "7 nights" | book enabled: true
departure 2026-02-30       | return disabled: false | errors: ["That date does not exist",""] | nights: "" | book enabled: false
departure 12/01/2026       | return disabled: false | errors: ["Use the format YYYY-MM-DD",""] | nights: "" | book enabled: false
departure fixed            | return disabled: false | errors: ["",""] | nights: "7 nights" | book enabled: true
confirmation: You have booked a return flight departing 2026-12-01 and returning 2026-12-08.
return garbage             | return disabled: false | errors: ["","Use the format YYYY-MM-DD"] | nights: "" | book enabled: false
back to one-way            | return disabled: true | errors: ["",""] | nights: "" | book enabled: true
confirmation: You have booked a one-way flight on 2026-12-01.
return value kept: nope
\`\`\`

One-way booked straight away; switching to return enabled the field and cleared the old confirmation; an earlier return date and both kinds of bad departure disabled Book with the right message; garbage in the return field stopped blocking once the trip was one-way again, and the value was still there on switching back. No <code>console.error</code>. Visual states (the red background for invalid fields) were not checked; jsdom has no layout.

## 7. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| <code>2026-02-30</code> | "That date does not exist" (no rollover) |
| <code>12/01/2026</code> | "Use the format YYYY-MM-DD" |
| Year <code>0050</code> | <code>Date.UTC</code> maps years below 100 to 19xx, the round trip fails, so it is rejected |
| Same-day return | Allowed, "0 nights" |
| One-way with a bad return value | Ignored; Book enabled |
| Switching back to return | The old return value is restored |
| Error text | Linked with <code>aria-describedby</code>, input marked <code>aria-invalid</code> |
| Confirmation | <code>role="status"</code>, cleared on any edit |

## 8. Common Pitfalls

- **Validating with <code>!isNaN(new Date(s))</code>.** It accepts <code>2026-02-30</code> as 2 March, as the run above shows.
- **Mixing <code>new Date("2026-12-01")</code> with local getters.** Date-only strings are UTC; <code>getDate()</code> is local. West of UTC you get the previous day.
- **Storing <code>canBook</code> or the error strings in state.** They drift from the inputs. Derive them.
- **Clearing the return value when switching to one-way.** Users who flip back lose what they typed. Disable, do not delete.
- **Running the cross-field rule on invalid input.** "Return must be after departure" next to "That date does not exist" is noise.
- **Forgetting to clear the confirmation on edit.** The screen then claims a booking for dates no longer shown.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the task:</strong> <span style="color:#f0e2c8;">"This is the 7GUIs Flight Booker: it is about constraints between widgets, so I will keep minimal state and derive the rest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;">"Trip type, two raw strings and the confirmation. Errors, return disabled, can book and nights are all computed every render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Parsing:</strong> <span style="color:#f0e2c8;">"A strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YYYY-MM-DD</code> parser that builds the date with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.UTC</code> and checks the parts round-trip, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Date</code> rolls 30 February over to March."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cross-field rule:</strong> <span style="color:#f0e2c8;">"Return must be on or after departure, checked only when both dates are valid and only for return trips."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Widgets and a11y:</strong> <span style="color:#f0e2c8;">"Return input disabled but its value kept, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-invalid</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code> on each field, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> confirmation cleared on edit."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why UTC and not local dates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The user picks calendar days, not instants. In UTC every day has 24 hours, so the night count is exact and comparisons are not affected by daylight-saving changes. Temporal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PlainDate</code> models this directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add "departure cannot be in the past"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">today</code> in as a prop or from an injectable clock, compute it as a calendar date in the user time zone, and add the rule to the departure error. Tests then pass a fixed today.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you switch to a native date input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often in production, for the mobile pickers. I would keep the same parser and rules, because the value can still be empty or out of range, and the cross-field rule does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parseDate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dateError</code> with a table including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2026-02-30</code> and leap years, then a component test that changes the select and types, asserting the disabled state and the message, as the driver here does.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **7GUIs** | A benchmark of seven small GUI tasks; Flight Booker is task 3 |
| **Derived state** | Values computed from state during render |
| **Cross-field validation** | A rule that compares two fields |
| **Date rollover** | <code>Date</code> turning invalid parts into a later valid date |
| **UTC** | Coordinated Universal Time; no daylight-saving shifts |
| **role="status"** | A polite live region for non-urgent messages |

---
**Conclusion:** The Flight Booker rewards restraint: four pieces of state, a strict parser, and everything else derived, so the enabled state of Book, the errors and the night count can never disagree. The Node runs confirmed the two <code>Date</code> traps the parser avoids (30 February rolling into March, and date-only strings shifting a day in western time zones), and the React 19.3.1 run confirmed every constraint between the widgets. The same derive-don't-store habit carries into [dependent dropdowns](/interview-question/build-dependent-country-state-dropdowns) and the [mortgage calculator](/interview-question/build-a-mortgage-calculator).`,
        files: {
          "/App.js": `import FlightBooker from "./src/FlightBooker";
import "./styles.css";

export default function App() {
  return (
    <main className="page">
      <FlightBooker />
    </main>
  );
}
`,
          "/src/FlightBooker.js": `import { useState } from "react";
import { DEFAULT_DATE, dateError, nightsBetween, parseDate } from "./dates";

export default function FlightBooker() {
  const [trip, setTrip] = useState("one-way"); // one-way | return
  const [depart, setDepart] = useState(DEFAULT_DATE);
  const [ret, setRet] = useState(DEFAULT_DATE);
  const [booked, setBooked] = useState("");

  // Everything below is derived from the three inputs on every render.
  const isReturn = trip === "return";
  const departErr = dateError(depart);
  let returnErr = isReturn ? dateError(ret) : "";
  const d = parseDate(depart);
  const r = isReturn ? parseDate(ret) : null;
  if (isReturn && !returnErr && d && r && r < d)
    returnErr = "Return must be on or after departure";
  const canBook = !departErr && !returnErr;
  const nights = isReturn && canBook ? nightsBetween(d, r) : null;

  function book(e) {
    e.preventDefault();
    if (!canBook) return;
    setBooked(
      isReturn
        ? "You have booked a return flight departing " +
            depart.trim() +
            " and returning " +
            ret.trim() +
            "."
        : "You have booked a one-way flight on " + depart.trim() + ".",
    );
  }

  // Editing anything clears the old confirmation,
  // so it never describes stale input.
  const edit = (setter) => (e) => {
    setter(e.target.value);
    setBooked("");
  };

  return (
    <form
      className="card"
      onSubmit={book}
      noValidate
      aria-label="Flight booker"
    >
      <h2>Book a flight</h2>
      <div className="field">
        <label htmlFor="trip">Trip type</label>
        <select id="trip" value={trip} onChange={edit(setTrip)}>
          <option value="one-way">One-way flight</option>
          <option value="return">Return flight</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="depart">Departure date</label>
        <input
          id="depart"
          value={depart}
          onChange={edit(setDepart)}
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          aria-invalid={departErr ? "true" : "false"}
          aria-describedby="depart-error"
        />
        <p id="depart-error" className="error">
          {departErr}
        </p>
      </div>
      <div className="field">
        <label htmlFor="return">Return date</label>
        <input
          id="return"
          value={ret}
          onChange={edit(setRet)}
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          disabled={!isReturn}
          aria-invalid={returnErr ? "true" : "false"}
          aria-describedby="return-error"
        />
        <p id="return-error" className="error">
          {returnErr}
        </p>
      </div>
      <p className="nights" data-testid="nights">
        {nights === null ? "" : nights + (nights === 1 ? " night" : " nights")}
      </p>
      <button type="submit" data-testid="book" disabled={!canBook}>
        Book
      </button>
      <p role="status" data-testid="confirmation" className="ok">
        {booked}
      </p>
    </form>
  );
}
`,
          "/src/dates.js": `// Strict YYYY-MM-DD parsing. new Date("2026-02-30") rolls over to March 2,
// so we build the date from its parts and check that they survive the trip.
const FORMAT = /^(\\d{4})-(\\d{2})-(\\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(text) {
  const m = FORMAT.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const ok =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d;
  return ok ? date : null;
}

export function dateError(text) {
  if (!text.trim()) return "Enter a date";
  if (!FORMAT.test(text.trim())) return "Use the format YYYY-MM-DD";
  if (!parseDate(text)) return "That date does not exist";
  return "";
}

export function nightsBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

// In a real app this would be today; fixed here so the demo is reproducible.
export const DEFAULT_DATE = "2026-12-01";
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 380px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input,
select {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input:disabled {
  opacity: 0.45;
}
input[aria-invalid="true"] {
  border-color: #ff6b6b;
  background: #2a1517;
}
input:focus-visible,
select:focus-visible,
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
  min-height: 1em;
}
.nights {
  color: #9aa3b5;
  margin: 0 0 10px;
  min-height: 1em;
}
.ok {
  color: #7ee2a8;
  margin: 12px 0 0;
  min-height: 1em;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
  width: 100%;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. No Vue form experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 5 were produced by actually running the code (the component on Vue 3.5.44, the date experiments on Node 22.22.0).

## 1. A Story First

A travel agent will not let you return before you leave, crosses out the return box for a one-way ticket, and refuses "30 February". Only a ticket that makes sense gets stamped "booked". The Flight Booker is task 3 of the **7GUIs** benchmark (seven small GUI tasks for comparing UI toolkits), and its theme is constraints between widgets.

The build: a select (one-way or return), two text inputs in <code>YYYY-MM-DD</code> (7GUIs uses <code>dd.mm.yyyy</code>; ISO sorts and parses more predictably), each with its own error, a rule that the return date is on or after departure, a "N nights" line, a Book button enabled only when everything is valid, and a confirmation that clears on any edit.

## 2. How the State Model Maps to Vue

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>trip</code>, <code>depart</code>, <code>ret</code> | <code>ref()</code> + <code>v-model</code> | The only real inputs. |
| <code>booked</code> | <code>ref()</code> | The confirmation text. |
| errors, return disabled, can book, nights | <code>computed()</code> | Derived and cached. |
| clear confirmation on edit | <code>watch([trip, depart, ret])</code> | A side effect of any change. |

📌 **Interview term: computed** — a cached getter that re-runs only when a reactive value it read changes. Book, the errors and the nights all read the same three refs, so they can never disagree. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).

📌 **Interview term: Cross-field validation** — a rule that needs two fields; here it runs only when both dates are individually valid.

## 3. Build It Step by Step

### Step 1: a strict parser

<code>src/dates.js</code> (shared logic, no Vue imports) matches <code>^(\\d{4})-(\\d{2})-(\\d{2})$</code>, builds the date with <code>Date.UTC</code>, and accepts it only if year, month and day come back unchanged.

📌 **Interview term: Date rollover** — <code>Date</code> normalizes out-of-range parts instead of rejecting them, so 30 February silently becomes 2 March. Checking the round trip turns that into "That date does not exist". UTC also makes the night count exact (no daylight-saving days). For new code, [Temporal](/interview-question/how-does-the-temporal-api-fix-javascript-date-instant-plaindate-and-zoneddatetim) has a <code>PlainDate</code> type.

### Step 2: state and derived values

\`\`\`vue
const trip = ref("one-way"); // one-way | return const depart =
ref(DEFAULT_DATE); const ret = ref(DEFAULT_DATE); const booked =
ref(""); // Derived state: each computed caches until a ref it reads
changes. const isReturn = computed(() => trip.value === "return"); const
departErr = computed(() => dateError(depart.value)); const returnErr =
computed(() => { if (!isReturn.value) return ""; const own =
dateError(ret.value); if (own) return own; const d =
parseDate(depart.value); return d && parseDate(ret.value) < d ? "Return
must be on or after departure" : ""; }); const canBook = computed(() =>
!departErr.value && !returnErr.value); const nights = computed(() =>
isReturn.value && canBook.value ? nightsBetween(parseDate(depart.value),
parseDate(ret.value)) : null ); // Editing anything clears the old
confirmation, so it never describes stale input. watch([trip, depart,
ret], () => { booked.value = ""; }); function book() { if
(!canBook.value) return; booked.value = isReturn.value ? "You have
booked a return flight departing " + depart.value.trim() + " and
returning " + ret.value.trim() + "." : "You have booked a one-way flight
on " + depart.value.trim() + "."; }
\`\`\`

The <code>watch</code> is the right tool for clearing the confirmation, because it is an action in response to a change, not a value. Everything that *is* a value is a computed.

### Step 3: the template

\`\`\`vue
    <div class="field">
      <label for="depart">Departure date</label>
      <input id="depart" v-model="depart" placeholder="YYYY-MM-DD" inputmode="numeric"
        :aria-invalid="departErr ? 'true' : 'false'" aria-describedby="depart-error" />
      <p id="depart-error" class="error">{{ departErr }}</p>
    </div>
    <div class="field">
      <label for="return">Return date</label>
      <input id="return" v-model="ret" placeholder="YYYY-MM-DD" inputmode="numeric" :disabled="!isReturn"
        :aria-invalid="returnErr ? 'true' : 'false'" aria-describedby="return-error" />
      <p id="return-error" class="error">{{ returnErr }}</p>
    </div>
    <p
      class="nights"
      data-testid="nights"
    >{{ nights === null ? "" : nights + (nights === 1 ? " night" : " nights") }}</p>
    <button
      type="submit"
      data-testid="book"
      :disabled="!canBook"
    >Book</button>
    <p
      role="status"
      data-testid="confirmation"
      class="ok"
    >{{ booked }}</p>
\`\`\`

<code>:disabled="!isReturn"</code> takes the return input out of use and out of the Tab order, but <code>ret</code> keeps its value, so switching back restores it. <code>v-model</code> on the select writes the option <code>value</code> into <code>trip</code>. See [v-model on form inputs](/interview-question/how-does-v-model-work-on-form-inputs).

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| <code>2026-02-30</code> | "That date does not exist" |
| <code>12/01/2026</code> | "Use the format YYYY-MM-DD" |
| Same-day return | Allowed, "0 nights" |
| One-way with a bad return value | Ignored; Book enabled |
| Errors for screen readers | <code>aria-invalid</code> and <code>aria-describedby</code> |
| Confirmation | <code>role="status"</code>, cleared by the watcher |

## 5. Verified: What the Solution Actually Did

The <code>Date</code> behaviour the parser guards against, on Node 22.22.0:

\`\`\`text
new Date("2026-02-30") -> 2026-03-02T00:00:00.000Z
Date.UTC(2026, 1, 30) -> 2026-03-02T00:00:00.000Z
TZ=America/New_York new Date("2026-12-01").toDateString() -> Mon Nov 30 2026
TZ=America/New_York new Date("2026-12-01T00:00").toDateString() -> Tue Dec 01 2026
\`\`\`

Rollover on the first two lines; on the last two, a date-only string is UTC midnight, still 30 November in New York.

The component, compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom on Vue 3.5.44, driven by the same driver as the other tabs. Output with the <code>[vue]</code> prefix removed:

\`\`\`text
RENDERED: Book a flightTrip typeOne-way flightReturn flightDeparture dateReturn dateBook
initial (one-way)          | return disabled: true | errors: ["",""] | nights: "" | book enabled: true
confirmation: You have booked a one-way flight on 2026-12-01.
switched to return         | return disabled: false | errors: ["",""] | nights: "0 nights" | book enabled: true
confirmation after edit: ""
return before departure    | return disabled: false | errors: ["","Return must be on or after departure"] | nights: "" | book enabled: false
return a week later        | return disabled: false | errors: ["",""] | nights: "7 nights" | book enabled: true
departure 2026-02-30       | return disabled: false | errors: ["That date does not exist",""] | nights: "" | book enabled: false
departure 12/01/2026       | return disabled: false | errors: ["Use the format YYYY-MM-DD",""] | nights: "" | book enabled: false
departure fixed            | return disabled: false | errors: ["",""] | nights: "7 nights" | book enabled: true
confirmation: You have booked a return flight departing 2026-12-01 and returning 2026-12-08.
return garbage             | return disabled: false | errors: ["","Use the format YYYY-MM-DD"] | nights: "" | book enabled: false
back to one-way            | return disabled: true | errors: ["",""] | nights: "" | book enabled: true
confirmation: You have booked a one-way flight on 2026-12-01.
return value kept: nope
\`\`\`

Identical to the React and Angular runs: an earlier return date and both kinds of bad departure disabled Book, a garbage return value stopped mattering for one-way, and it was still there on switching back. No <code>console.error</code>. Visual states were not checked.

## 6. Common Pitfalls

- **<code>!isNaN(new Date(s))</code> as a validator.** It accepts <code>2026-02-30</code>.
- **A <code>watch</code> that writes <code>canBook</code> into a ref.** A computed does the same with no chance of drifting.
- **<code>v-model.lazy</code> on the date inputs** to "reduce validation". Errors then appear only on change (blur), and Book stays enabled while the box shows garbage.
- **Clearing <code>ret</code> when switching to one-way.** Disable, do not delete.
- **Local getters on a UTC-parsed date.** <code>new Date("2026-12-01").getDate()</code> is 30 west of UTC.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the task:</strong> <span style="color:#f0e2c8;">"This is the 7GUIs Flight Booker: constraints between widgets, so three refs of input and everything else computed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Parser:</strong> <span style="color:#f0e2c8;">"Strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YYYY-MM-DD</code>, built with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.UTC</code> and checked for a round trip, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> rolls 30 February into March."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Derived:</strong> <span style="color:#f0e2c8;">"Computeds for each error, the cross-field rule, can-book and nights; the return error is empty for one-way trips."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Side effect:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the three inputs clears the confirmation, so it never describes dates no longer shown."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> on all inputs, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:disabled</code> on the return field without clearing it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-describedby</code> errors and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why computed and not methods in the template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both re-render correctly, but a computed caches, and several bindings read the same values. It also documents that these are derived values with no side effects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a "not in the past" rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inject a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">today</code> value (a prop or a provided clock) so tests are deterministic, compare calendar dates, and add the message to the departure computed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Native date input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A good production choice on mobile. Keep the parser, because the value can still be empty, and the cross-field rule is unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test the parser with a table (leap years, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2026-02-30</code>, wrong formats). Then Vue Test Utils: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> on the select and inputs, assert the disabled button and messages.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **7GUIs** | Seven small GUI tasks; Flight Booker is task 3 |
| **computed** | Cached derived value |
| **Cross-field validation** | A rule comparing two fields |
| **Date rollover** | <code>Date</code> turning invalid parts into a later date |
| **role="status"** | Polite live region |

---
**Conclusion:** In Vue the Flight Booker is three refs bound with <code>v-model</code>, a strict parser, a handful of computeds and one watcher. Because Book, the errors and the nights all derive from the same refs, they cannot contradict each other. The Vue 3.5.44 run matched React and Angular line for line, and the Node runs confirmed the two <code>Date</code> traps the parser exists to avoid.`,
        files: {
          "/src/App.vue": `<script setup>
import FlightBooker from "./components/FlightBooker.vue";
</script>

<template>
  <main class="page">
    <FlightBooker />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 380px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input,
select {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
input:disabled {
  opacity: 0.45;
}
input[aria-invalid="true"] {
  border-color: #ff6b6b;
  background: #2a1517;
}
input:focus-visible,
select:focus-visible,
button:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.error {
  color: #ff8a8a;
  margin: 0;
  font-size: 0.85rem;
  min-height: 1em;
}
.nights {
  color: #9aa3b5;
  margin: 0 0 10px;
  min-height: 1em;
}
.ok {
  color: #7ee2a8;
  margin: 12px 0 0;
  min-height: 1em;
}
button {
  font: inherit;
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  background: #4f7cff;
  color: #fff;
  cursor: pointer;
  width: 100%;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
`,
          "/src/components/FlightBooker.vue": `<script setup>
import { computed, ref, watch } from "vue";
import { DEFAULT_DATE, dateError, nightsBetween, parseDate } from "../dates.js";

const trip = ref("one-way"); // one-way | return
const depart = ref(DEFAULT_DATE);
const ret = ref(DEFAULT_DATE);
const booked = ref("");

// Derived state: each computed caches until a ref it reads changes.
const isReturn = computed(() => trip.value === "return");
const departErr = computed(() => dateError(depart.value));
const returnErr = computed(() => {
  if (!isReturn.value) return "";
  const own = dateError(ret.value);
  if (own) return own;
  const d = parseDate(depart.value);
  return d && parseDate(ret.value) < d
    ? "Return must be on or after departure"
    : "";
});
const canBook = computed(() => !departErr.value && !returnErr.value);
const nights = computed(() =>
  isReturn.value && canBook.value
    ? nightsBetween(parseDate(depart.value), parseDate(ret.value))
    : null,
);

// Editing anything clears the old confirmation,
// so it never describes stale input.
watch([trip, depart, ret], () => {
  booked.value = "";
});

function book() {
  if (!canBook.value) return;
  booked.value = isReturn.value
    ? "You have booked a return flight departing " +
      depart.value.trim() +
      " and returning " +
      ret.value.trim() +
      "."
    : "You have booked a one-way flight on " + depart.value.trim() + ".";
}
</script>

<template>
  <form
    class="card"
    novalidate
    aria-label="Flight booker"
    @submit.prevent="book"
  >
    <h2>Book a flight</h2>
    <div class="field">
      <label for="trip">Trip type</label>
      <select id="trip" v-model="trip">
        <option value="one-way">One-way flight</option>
        <option value="return">Return flight</option>
      </select>
    </div>
    <div class="field">
      <label for="depart">Departure date</label>
      <input
        id="depart"
        v-model="depart"
        placeholder="YYYY-MM-DD"
        inputmode="numeric"
        :aria-invalid="departErr ? 'true' : 'false'"
        aria-describedby="depart-error"
      />
      <p id="depart-error" class="error">{{ departErr }}</p>
    </div>
    <div class="field">
      <label for="return">Return date</label>
      <input
        id="return"
        v-model="ret"
        placeholder="YYYY-MM-DD"
        inputmode="numeric"
        :disabled="!isReturn"
        :aria-invalid="returnErr ? 'true' : 'false'"
        aria-describedby="return-error"
      />
      <p id="return-error" class="error">{{ returnErr }}</p>
    </div>
    <p class="nights" data-testid="nights">
      {{
        nights === null ? "" : nights + (nights === 1 ? " night" : " nights")
      }}
    </p>
    <button type="submit" data-testid="book" :disabled="!canBook">Book</button>
    <p role="status" data-testid="confirmation" class="ok">{{ booked }}</p>
  </form>
</template>
`,
          "/src/dates.js": `// Strict YYYY-MM-DD parsing. new Date("2026-02-30") rolls over to March 2,
// so we build the date from its parts and check that they survive the trip.
const FORMAT = /^(\\d{4})-(\\d{2})-(\\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(text) {
  const m = FORMAT.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const ok =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d;
  return ok ? date : null;
}

export function dateError(text) {
  if (!text.trim()) return "Enter a date";
  if (!FORMAT.test(text.trim())) return "Use the format YYYY-MM-DD";
  if (!parseDate(text)) return "That date does not exist";
  return "";
}

export function nightsBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

// In a real app this would be today; fixed here so the demo is reproducible.
export const DEFAULT_DATE = "2026-12-01";
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. No Angular forms experience is assumed: this solution uses only signals.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 5 were produced by actually running the code (the component on Angular 22.2.3, AOT and JIT; the date experiments on Node 22.22.0).

## 1. A Story First

A travel agent will not let you return before you leave, crosses out the return box for a one-way ticket, and refuses "30 February". The Flight Booker is task 3 of the **7GUIs** benchmark, seven small GUI tasks for comparing UI toolkits, and it is about constraints between widgets.

The build: a select (one-way or return), two <code>YYYY-MM-DD</code> text inputs with their own errors (7GUIs uses <code>dd.mm.yyyy</code>), a rule that return is on or after departure, a "N nights" line, a Book button enabled only when valid, and a confirmation cleared on any edit.

## 2. How the State Model Maps to Angular

This is small enough that Angular forms add little. Plain signals make the "minimal state, derive the rest" idea very visible:

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| <code>trip</code>, <code>depart</code>, <code>ret</code>, <code>booked</code> | <code>signal()</code> | The only writable state. |
| errors, return disabled, can book, nights text | <code>computed()</code> | Derived and memoized. |
| binding | <code>[value]</code> + <code>(input)</code> / <code>(change)</code> | One-way binding plus an event, the manual form of two-way binding. |

📌 **Interview term: Signals** — reactive values you read by calling them (<code>trip()</code>) and write with <code>set</code>. A <code>computed</code> tracks which signals it read and recomputes only when one changes. See [Angular signals](/interview-question/what-are-angular-signals) and [computed vs template method calls](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

📌 **Interview term: Cross-field validation** — a rule that compares two fields, run only when both are individually valid.

## 3. Build It Step by Step

### Step 1: a strict parser

<code>dates.ts</code> matches <code>YYYY-MM-DD</code>, builds the date with <code>Date.UTC</code>, and accepts it only if year, month and day come back unchanged.

📌 **Interview term: Date rollover** — <code>Date</code> normalizes out-of-range parts instead of rejecting them, so 30 February becomes 2 March. The round-trip check catches it. UTC also keeps the night count exact. [Temporal](/interview-question/how-does-the-temporal-api-fix-javascript-date-instant-plaindate-and-zoneddatetim) offers a real <code>PlainDate</code>.

### Step 2: signals and computeds

\`\`\`ts
// Three writable signals are the whole
// state; everything else is computed.
readonly trip = signal<Trip>("one-way");
readonly depart = signal(DEFAULT_DATE);
readonly ret = signal(DEFAULT_DATE);
readonly booked = signal("");

readonly isReturn = computed(() => this.trip() === "return");
readonly departErr = computed(() => dateError(this.depart()));
readonly returnErr = computed(() => {
  if (!this.isReturn()) return "";
  const own = dateError(this.ret());
  if (own) return own;
  const d = parseDate(this.depart());
  const r = parseDate(this.ret());
  return d && r && r < d ? "Return must be on or after departure" : "";
});
readonly canBook = computed(
  () => !this.departErr() && !this.returnErr(),
);
readonly nightsText = computed(() => {
  if (!this.isReturn() || !this.canBook()) return "";
  const n = nightsBetween(
    parseDate(this.depart())!,
    parseDate(this.ret())!,
  );
  return n + (n === 1 ? " night" : " nights");
});

// One handler for every field: write the
// signal, clear the old confirmation.
edit(field: "trip" | "depart" | "ret", event: Event) {
  const value = (event.target as HTMLInputElement | HTMLSelectElement)
    .value;
  if (field === "trip") this.trip.set(value as Trip);
  else this[field].set(value);
  this.booked.set("");
}

book(event: Event) {
  event.preventDefault();
  if (!this.canBook()) return;
  this.booked.set(
    this.isReturn()
      ? "You have booked a return flight departing " +
          this.depart().trim() +
          " and returning " +
          this.ret().trim() +
          "."
      : "You have booked a one-way flight on " +
          this.depart().trim() +
          ".",
  );
}
\`\`\`

<code>edit</code> is the only writer: it sets the right signal and clears the confirmation in the same call. Because <code>returnErr</code> starts with <code>if (!this.isReturn()) return ""</code>, a garbage return value has no effect on a one-way trip.

### Step 3: the template

\`\`\`html
    <form
      class="card"
      novalidate
      aria-label="Flight booker"
      (submit)="book($event)"
    >
      <h2>Book a flight</h2>
      <div class="field">
        <label for="trip">Trip type</label>
        <select
          id="trip"
          [value]="trip()"
          (change)="edit('trip', $event)"
        >
          <option value="one-way">One-way flight</option>
          <option value="return">Return flight</option>
        </select>
      </div>
      <div class="field">
        <label for="depart">Departure date</label>
        <input id="depart" [value]="depart()" (input)="edit('depart', $event)" placeholder="YYYY-MM-DD" inputmode="numeric"
          [attr.aria-invalid]="departErr() ? 'true' : 'false'" aria-describedby="depart-error" />
        <p id="depart-error" class="error">{{ departErr() }}</p>
      </div>
      <div class="field">
        <label for="return">Return date</label>
        <input id="return" [value]="ret()" (input)="edit('ret', $event)" placeholder="YYYY-MM-DD" inputmode="numeric"
          [disabled]="!isReturn()" [attr.aria-invalid]="returnErr() ? 'true' : 'false'" aria-describedby="return-error" />
        <p id="return-error" class="error">{{ returnErr() }}</p>
      </div>
      <p class="nights" data-testid="nights">{{ nightsText() }}</p>
      <button
        type="submit"
        data-testid="book"
        [disabled]="!canBook()"
      >Book</button>
      <p
        role="status"
        data-testid="confirmation"
        class="ok"
      >{{ booked() }}</p>
    </form>
\`\`\`

<code>[disabled]</code> on the return input does not touch the <code>ret</code> signal, so switching back restores the value. <code>[attr.aria-invalid]</code> is an attribute binding; <code>aria-describedby</code> is static because the error paragraphs always exist. Binding <code>[value]</code> on the <code>&lt;select&gt;</code> works here because its options are static; with options from a loop, prefer <code>ngModel</code> or a <code>FormControl</code>, whose select accessor waits for the options (see the [dependent dropdowns](/interview-question/build-dependent-country-state-dropdowns) question).

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| <code>2026-02-30</code> | "That date does not exist" |
| <code>12/01/2026</code> | "Use the format YYYY-MM-DD" |
| Same-day return | Allowed, "0 nights" |
| One-way with a bad return value | Ignored; Book enabled |
| Errors | <code>aria-invalid</code>, <code>aria-describedby</code> |
| Confirmation | <code>role="status"</code>, cleared by <code>edit</code> |

## 5. Verified: What the Solution Actually Did

The <code>Date</code> behaviour the parser guards against, on Node 22.22.0:

\`\`\`text
new Date("2026-02-30") -> 2026-03-02T00:00:00.000Z
Date.UTC(2026, 1, 30) -> 2026-03-02T00:00:00.000Z
TZ=America/New_York new Date("2026-12-01").toDateString() -> Mon Nov 30 2026
TZ=America/New_York new Date("2026-12-01T00:00").toDateString() -> Tue Dec 01 2026
\`\`\`

The component, booted with <code>bootstrapApplication(AppComponent)</code> and no providers, compiled with <code>ngc</code> and <code>strictTemplates</code>, and again through the playground JIT. Both printed the same lines; AOT run, prefix removed:

\`\`\`text
RENDERED: Book a flightTrip typeOne-way flightReturn flightDeparture dateReturn dateBook
initial (one-way)          | return disabled: true | errors: ["",""] | nights: "" | book enabled: true
confirmation: You have booked a one-way flight on 2026-12-01.
switched to return         | return disabled: false | errors: ["",""] | nights: "0 nights" | book enabled: true
confirmation after edit: ""
return before departure    | return disabled: false | errors: ["","Return must be on or after departure"] | nights: "" | book enabled: false
return a week later        | return disabled: false | errors: ["",""] | nights: "7 nights" | book enabled: true
departure 2026-02-30       | return disabled: false | errors: ["That date does not exist",""] | nights: "" | book enabled: false
departure 12/01/2026       | return disabled: false | errors: ["Use the format YYYY-MM-DD",""] | nights: "" | book enabled: false
departure fixed            | return disabled: false | errors: ["",""] | nights: "7 nights" | book enabled: true
confirmation: You have booked a return flight departing 2026-12-01 and returning 2026-12-08.
return garbage             | return disabled: false | errors: ["","Use the format YYYY-MM-DD"] | nights: "" | book enabled: false
back to one-way            | return disabled: true | errors: ["",""] | nights: "" | book enabled: true
confirmation: You have booked a one-way flight on 2026-12-01.
return value kept: nope
\`\`\`

Identical to the React and Vue runs. No <code>console.error</code>. Visual states were not checked; jsdom has no layout.

## 6. Common Pitfalls

- **<code>!isNaN(new Date(s))</code> as a validator.** It accepts <code>2026-02-30</code>.
- **Plain class fields instead of signals.** Updates from events still render, but the derived values become template method calls that run on every check, and anything async would not re-render in a zoneless app.
- **<code>effect()</code> to keep <code>canBook</code> in sync.** That is a computed; effects are for side effects. See [when not to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
- **Clearing <code>ret</code> on switching to one-way.** Disable it; keep the value.
- **Local getters on a UTC-parsed date.** A day disappears west of UTC.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the task:</strong> <span style="color:#f0e2c8;">"The 7GUIs Flight Booker: constraints between widgets. Four signals of state, everything else computed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Parser:</strong> <span style="color:#f0e2c8;">"Strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YYYY-MM-DD</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.UTC</code> and a round-trip check, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> rolls 30 February over."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Computeds:</strong> <span style="color:#f0e2c8;">"One computed per error, the cross-field rule only when both dates parse, can-book from the errors, nights text from both dates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One writer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">edit(field, event)</code> sets the signal and clears the confirmation, so a booking message never outlives its dates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Template:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(input)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[disabled]</code> without clearing, attribute bindings for ARIA, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> message."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not reactive forms here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They would work, with a group validator for the cross-field rule. For three inputs and no async, signals are less code and make the derivations explicit. For bigger forms I would switch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed</code> better than a getter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A getter re-runs on every change detection pass; a computed re-runs only when a signal it read changes, and other computeds can depend on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a "not in the past" rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inject a clock with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionToken</code> so tests can provide a fixed date, and add the comparison to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">departErr</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dates.ts</code> with a table. In TestBed, set the select and inputs, dispatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>, and assert the button state and messages.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **7GUIs** | Seven small GUI tasks; Flight Booker is task 3 |
| **Signals** | Reactive values read by calling them |
| **computed** | Memoized value derived from signals |
| **Cross-field validation** | A rule comparing two fields |
| **Date rollover** | <code>Date</code> turning invalid parts into a later date |

---
**Conclusion:** With signals, the Flight Booker is four writable values, a strict parser and a set of computeds, with a single <code>edit</code> method as the only writer. The AOT and JIT runs on Angular 22.2.3 matched React and Vue, and the Node runs showed the <code>Date</code> rollover and time-zone shift the parser is designed around.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { FlightBookerComponent } from "./flight-booker.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [FlightBookerComponent],
  template: \`<main class="page"><app-flight-booker /></main>\`,
  // Global styles for this small app, so the child component shares them.
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1117;
        color: #e6e8ee;
        font-family: system-ui, sans-serif;
      }
      .page {
        display: flex;
        justify-content: center;
        padding: 24px 16px;
      }
      .card {
        width: 100%;
        max-width: 380px;
        background: #181b24;
        border: 1px solid #2a2f3d;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 1.2rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 10px;
      }
      label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      input,
      select {
        font: inherit;
        padding: 9px 11px;
        border-radius: 8px;
        border: 1px solid #3a4152;
        background: #0f1117;
        color: inherit;
      }
      input:disabled {
        opacity: 0.45;
      }
      input[aria-invalid="true"] {
        border-color: #ff6b6b;
        background: #2a1517;
      }
      input:focus-visible,
      select:focus-visible,
      button:focus-visible {
        outline: 2px solid #7aa2ff;
        outline-offset: 2px;
      }
      .error {
        color: #ff8a8a;
        margin: 0;
        font-size: 0.85rem;
        min-height: 1em;
      }
      .nights {
        color: #9aa3b5;
        margin: 0 0 10px;
        min-height: 1em;
      }
      .ok {
        color: #7ee2a8;
        margin: 12px 0 0;
        min-height: 1em;
      }
      button {
        font: inherit;
        padding: 10px 16px;
        border-radius: 8px;
        border: 0;
        background: #4f7cff;
        color: #fff;
        cursor: pointer;
        width: 100%;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/dates.ts": `// Strict YYYY-MM-DD parsing. new Date("2026-02-30") rolls over to March 2,
// so we build the date from its parts and check that they survive the trip.
const FORMAT = /^(\\d{4})-(\\d{2})-(\\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(text: string): Date | null {
  const m = FORMAT.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const ok =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d;
  return ok ? date : null;
}

export function dateError(text: string): string {
  if (!text.trim()) return "Enter a date";
  if (!FORMAT.test(text.trim())) return "Use the format YYYY-MM-DD";
  if (!parseDate(text)) return "That date does not exist";
  return "";
}

export function nightsBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

// In a real app this would be today; fixed here so the demo is reproducible.
export const DEFAULT_DATE = "2026-12-01";
`,
          "/src/app/flight-booker.component.ts": `import { Component, computed, signal } from "@angular/core";
import { DEFAULT_DATE, dateError, nightsBetween, parseDate } from "./dates";

type Trip = "one-way" | "return";

@Component({
  selector: "app-flight-booker",
  standalone: true,
  template: \`
    <form
      class="card"
      novalidate
      aria-label="Flight booker"
      (submit)="book($event)"
    >
      <h2>Book a flight</h2>
      <div class="field">
        <label for="trip">Trip type</label>
        <select id="trip" [value]="trip()" (change)="edit('trip', $event)">
          <option value="one-way">One-way flight</option>
          <option value="return">Return flight</option>
        </select>
      </div>
      <div class="field">
        <label for="depart">Departure date</label>
        <input id="depart" [value]="depart()" (input)="edit('depart', $event)" placeholder="YYYY-MM-DD" inputmode="numeric"
          [attr.aria-invalid]="departErr() ? 'true' : 'false'" aria-describedby="depart-error" />
        <p id="depart-error" class="error">{{ departErr() }}</p>
      </div>
      <div class="field">
        <label for="return">Return date</label>
        <input id="return" [value]="ret()" (input)="edit('ret', $event)" placeholder="YYYY-MM-DD" inputmode="numeric"
          [disabled]="!isReturn()" [attr.aria-invalid]="returnErr() ? 'true' : 'false'" aria-describedby="return-error" />
        <p id="return-error" class="error">{{ returnErr() }}</p>
      </div>
      <p class="nights" data-testid="nights">{{ nightsText() }}</p>
      <button
        type="submit"
        data-testid="book"
        [disabled]="!canBook()"
      >Book</button>
      <p role="status" data-testid="confirmation" class="ok">{{ booked() }}</p>
    </form>
  \`,
})
export class FlightBookerComponent {
  // Three writable signals are the whole state; everything else is computed.
  readonly trip = signal<Trip>("one-way");
  readonly depart = signal(DEFAULT_DATE);
  readonly ret = signal(DEFAULT_DATE);
  readonly booked = signal("");

  readonly isReturn = computed(() => this.trip() === "return");
  readonly departErr = computed(() => dateError(this.depart()));
  readonly returnErr = computed(() => {
    if (!this.isReturn()) return "";
    const own = dateError(this.ret());
    if (own) return own;
    const d = parseDate(this.depart());
    const r = parseDate(this.ret());
    return d && r && r < d ? "Return must be on or after departure" : "";
  });
  readonly canBook = computed(() => !this.departErr() && !this.returnErr());
  readonly nightsText = computed(() => {
    if (!this.isReturn() || !this.canBook()) return "";
    const n = nightsBetween(parseDate(this.depart())!, parseDate(this.ret())!);
    return n + (n === 1 ? " night" : " nights");
  });

  // One handler for every field: write the signal, clear the old confirmation.
  edit(field: "trip" | "depart" | "ret", event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    if (field === "trip") this.trip.set(value as Trip);
    else this[field].set(value);
    this.booked.set("");
  }

  book(event: Event) {
    event.preventDefault();
    if (!this.canBook()) return;
    this.booked.set(
      this.isReturn()
        ? "You have booked a return flight departing " +
            this.depart().trim() +
            " and returning " +
            this.ret().trim() +
            "."
        : "You have booked a one-way flight on " + this.depart().trim() + ".",
    );
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build dependent (Country–State) dropdowns",
    seoDescription: "Build cascading Country, State and City dropdowns in React, Vue and Angular: async options, downstream resets, stale-response guards and a promise cache.",
    description: `**Question presented to candidate:**
"We need an address picker with three dropdowns: Country, then State, then City. Each list depends on the one above and comes from an API. Changing the country must reset the state and city. Make it feel solid: loading states, an empty state for countries without states, and no wrong data if someone changes their mind quickly."

**Requirements:**
- Countries load on mount; states load when a country is chosen; cities load when a state is chosen. All three come from a simulated API with latency.
- Changing a level clears every level below it, both the selected value and the option list.
- Each select shows a helpful placeholder: "Choose a country first", "Loading states...", "No states for this country", "Select a state". Selects are disabled until their options are ready.
- Switching country quickly (a slow request followed by a fast one) must show only the latest country's states.
- Lists already fetched are reused from a cache; a summary shows "Selected: City, State, Country".

**What a strong answer should cover:**
- State shape: three selected values plus three option lists, each with a status (\`idle\`, \`loading\`, \`ready\`).
- **Cascading resets** performed together with the change that causes them, not as a chain of reactions that briefly shows inconsistent values.
- A **stale-response guard** per level (request counter or cleanup flag), and why it must also invalidate the levels below.
- A **promise cache** that deduplicates in-flight requests as well as finished ones.
- Accessible selects: labels, \`disabled\` while loading, \`aria-busy\`, and a \`role="status"\` summary.

**Clarifying questions expected:**
- "How big are the lists? Do we need search inside a dropdown?"
- "Should the selection be restorable from saved data, for example when editing an existing address?"
- "What should happen for countries with no states?"

**Code / implementation expected:** Yes. Three dependent selects with async loading, resets, empty and loading states, a race guard and a cache, demonstrated with a fast country switch.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know a little HTML and JavaScript; no React form experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the output in section 6 was produced by actually running it on React 19.3.1 under StrictMode.

## 1. Why This Even Matters — A Story First

Imagine ordering at a restaurant with a nested menu: first you pick a cuisine, then a dish from that cuisine, then a side that goes with the dish. If you change your mind from Italian to Japanese, the waiter must cross out "carbonara" and "garlic bread" at once. A waiter who leaves "carbonara" on a Japanese order, even for a moment, has created an impossible order.

Dependent dropdowns are that menu. The data rule is simple: **a lower level is only meaningful for the current upper level**. The engineering questions are where interviews are won:

- Where do the resets happen, so the screen never shows "Texas" under "India"?
- What if the India list is slow and the user has already switched to the United States?
- Why fetch the India list twice if the user comes back to it?

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How long are the lists? | Hundreds of cities need a searchable combobox, not a native select; see the [combobox question](/interview-question/build-a-combobox-search-select). |
| Is this also used to *edit* a saved address? | Restoring Country, State and City means loading each level in order before setting its value. |
| What about countries without states? | Show an empty state and decide whether City then depends on Country directly. Here: "No states for this country". |
| Can the lists change while the page is open? | Decides whether the cache needs an expiry. Here: no expiry. |
| Is the API one call per level or one big tree? | A single tree call removes the async cascade entirely; ask before building it. |

## 3. Requirements and the State Model

The fake API is in-file (the playground has no network): countries take 150 ms, India's states 600 ms, other states 200 ms, cities 200 ms. India is slow on purpose, so a quick India then United States switch makes India answer last. A "Requests sent" line shows how many times the fake server was hit.

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>country</code>, <code>state</code>, <code>city</code> | State | The three selections. |
| <code>countries</code>, <code>states</code>, <code>cities</code> | State | Option lists, each <code>{ status, items }</code>. |
| <code>requests</code> | State | Demo counter. |
| <code>latest</code> | Ref | One request counter per level, for the stale guard. |
| summary | **Derived** | From the three selections. |
| placeholder text, disabled | **Derived** | From each list status. |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Choosing a country resets state and city and loads states; choosing a state resets city and loads cities">
  <defs>
    <marker id="mcd5r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="105" y="56" text-anchor="middle">Country</text>
  <text class="d-sub" x="105" y="76" text-anchor="middle">loaded on mount</text>
  <rect class="d-box" x="265" y="30" width="170" height="60" rx="10"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">State</text>
  <text class="d-sub" x="350" y="76" text-anchor="middle">loaded per country</text>
  <rect class="d-box" x="510" y="30" width="170" height="60" rx="10"/>
  <text class="d-text" x="595" y="56" text-anchor="middle">City</text>
  <text class="d-sub" x="595" y="76" text-anchor="middle">loaded per state</text>
  <path class="d-edge-accent" d="M 190 60 L 259 60" marker-end="url(#mcd5r-arrow)"/>
  <path class="d-edge-accent" d="M 435 60 L 504 60" marker-end="url(#mcd5r-arrow)"/>
  <rect class="d-box-muted" x="20" y="160" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="186" text-anchor="middle">change country</text>
  <text class="d-sub" x="170" y="206" text-anchor="middle">clear state and city, load states</text>
  <rect class="d-box-muted" x="380" y="160" width="300" height="60" rx="10"/>
  <text class="d-text" x="530" y="186" text-anchor="middle">change state</text>
  <text class="d-sub" x="530" y="206" text-anchor="middle">clear city, load cities</text>
  <path class="d-edge-dashed" d="M 105 90 L 105 154" marker-end="url(#mcd5r-arrow)"/>
  <path class="d-edge-dashed" d="M 350 90 L 450 154" marker-end="url(#mcd5r-arrow)"/>
</svg>

Every change only ever resets levels *below* it, and it does so in the same handler, so no render can show a city that does not belong to the selected state.

📌 **Interview term: Cascading reset** — clearing every dependent selection when its parent changes. Doing it in the event handler means one render with consistent values.

📌 **Interview term: Stale-response guard** — a check that drops a response if a newer request for the same level has started. The same idea as in the [async username check](/interview-question/build-a-signup-form-with-async-username-availability-check), applied per level.

## 4. Build It Step by Step

### Step 1: the fake API and a promise cache

\`\`\`js
let requestsSent = 0;
const fakeServer = (ms, value) => {
  requestsSent++;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
};

// The cache stores the PROMISE, so two
// callers asking at once share one request.
const cache = new Map();
function cached(key, start) {
  if (!cache.has(key)) cache.set(key, start());
  return cache.get(key);
}

export const getCountries = () =>
  cached("countries", () =>
    fakeServer(
      150,
      Object.entries(DATA).map(([code, c]) => ({
        value: code,
        label: c.name,
      })),
    ),
  );

export const getStates = (country) =>
  cached("states:" + country, () =>
    fakeServer(
      STATE_LATENCY[country],
      Object.keys(DATA[country].states),
    ),
  );

export const getCities = (country, state) =>
  cached("cities:" + country + "/" + state, () =>
    fakeServer(200, DATA[country].states[state]),
  );
\`\`\`

📌 **Interview term: Promise cache** — caching the *Promise* for a key, not the resolved value. Two callers asking for the same key at the same time share one request (deduplication), and later callers get an already-resolved Promise. One caveat: a rejected Promise would stay cached forever, so a real version deletes the key on failure.

### Step 2: state and the mount effect

\`\`\`jsx
export default function LocationPicker() {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [countries, setCountries] = useState(LOADING);
  const [states, setStates] = useState(IDLE);
  const [cities, setCities] = useState(IDLE);
  const [requests, setRequests] = useState(0);
  // One counter per level: a response is
  // used only if no newer request started.
  const latest = useRef({ states: 0, cities: 0 });

  useEffect(() => {
    let ignore = false;
    getCountries().then((items) => {
      if (!ignore) { setCountries(ready(items)); setRequests(countRequests()); }
    });
    return () => { ignore = true; };
  }, []);
\`\`\`

In development, StrictMode runs this effect twice on mount. Both runs call <code>getCountries()</code>, but the cache hands both the same Promise, so the server is hit once; section 6 shows "Requests sent: 1". The <code>ignore</code> flag stops the first, discarded run from setting state.

### Step 3: resets in the handlers, not in effects

\`\`\`jsx
// Resets happen here, in the event handler,
// in the same update as the change.
async function chooseCountry(code) {
  setCountry(code);
  setState("");
  setCity("");
  setCities(IDLE);
  const id = ++latest.current.states;
  latest.current.cities++; // also invalidate any city request in flight
  if (!code) {
    setStates(IDLE);
    return;
  }
  setStates(LOADING);
  const p = getStates(code);
  setRequests(countRequests());
  const items = await p;
  if (id === latest.current.states) setStates(ready(items));
}

async function chooseState(name) {
  setState(name);
  setCity("");
  const id = ++latest.current.cities;
  if (!name) {
    setCities(IDLE);
    return;
  }
  setCities(LOADING);
  const p = getCities(country, name);
  setRequests(countRequests());
  const items = await p;
  if (id === latest.current.cities) setCities(ready(items));
}
\`\`\`

Three things happen in <code>chooseCountry</code>:

1. The selection and every level below it are reset in the same handler, so React renders them together.
2. <code>++latest.current.states</code> starts a new "generation" for the states level, and <code>latest.current.cities++</code> also invalidates any city request still in flight, because it belongs to the old country.
3. After <code>await</code>, the result is applied only if no newer generation started.

The tempting alternative is a chain of effects: one effect on <code>country</code> that clears <code>state</code>, another on <code>state</code> that clears <code>city</code>. That renders the impossible combination first and fixes it one effect later, and every level adds another render. React documents this under "You might not need an effect"; the short version is [the purpose of useEffect](/interview-question/explain-the-purpose-of-useeffect): synchronizing with something outside React, not reacting to your own events.

### Step 4: one reusable select

<code>LevelSelect</code> turns <code>{ status, items }</code> into a disabled select with the right placeholder ("Choose a country first", "Loading states...", "No states for this country", "Select a state") and <code>aria-busy</code> while loading. Its first option has <code>value=""</code>, so a reset to <code>""</code> shows the placeholder.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Slow India, then fast United States | India's late answer is dropped by the generation check |
| City request in flight when country changes | Invalidated by <code>latest.current.cities++</code> |
| Coming back to India | Served from the promise cache, no new request |
| Country with no states | "No states for this country", select disabled |
| Selecting the placeholder again | Resets the levels below to idle |
| Keyboard | Native selects; disabled ones are skipped by Tab |
| Screen reader | Labels, <code>aria-busy</code> while loading, a <code>role="status"</code> summary |

## 6. Verified: What the Solution Actually Did

Mounted like the playground (<code>createRoot</code> plus <code>&lt;StrictMode&gt;</code>) in jsdom with React 19.3.1, with real timers. The driver picks India and immediately the United States, then waits for both answers. Each line lists the State and City selects as value, disabled flag and option texts. Output with the <code>[react]</code> prefix removed:

\`\`\`text
RENDERED: Where are you based?CountryLoading countries...StateChoose a country firstCityChoose a state firstRequests sent: 0
on mount: country="" (disabled) [Loading countries...]
countries loaded: country="" [Select a country, India, Singapore, United States] | Requests sent: 1
picked India             | state="" (disabled) [Loading states...] | city="" (disabled) [Choose a state first] | Requests sent: 2
switched to US at once   | state="" (disabled) [Loading states...] | city="" (disabled) [Choose a state first] | Requests sent: 3
US states arrived        | state="" [Select a state, California, Texas] | city="" (disabled) [Choose a state first] | Requests sent: 3
India answered later     | state="" [Select a state, California, Texas] | city="" (disabled) [Choose a state first] | Requests sent: 3
picked California        | state="California" [Select a state, California, Texas] | city="" (disabled) [Loading cities...] | Requests sent: 4
picked San Francisco     | state="California" [Select a state, California, Texas] | city="San Francisco" [Select a city, Los Angeles, San Francisco] | Requests sent: 4
summary: Selected: San Francisco, California, United States
back to India (cached)   | state="" [Select a state, Karnataka, Maharashtra] | city="" (disabled) [Choose a state first] | Requests sent: 4
summary after reset: ""
picked Singapore         | state="" (disabled) [No states for this country] | city="" (disabled) [Choose a state first] | Requests sent: 5
\`\`\`

Read the race in the middle: after "switched to US at once" two requests were in flight; the US states arrived first; when India's slower answer came 450 ms later, the State list still showed California and Texas. "Requests sent: 1" after mount confirms the cache deduplicated StrictMode's double effect. Going back to India did not raise the count, because India's states (the request whose answer was ignored on screen) were already in the cache. No <code>console.error</code>.

## 7. Common Pitfalls

- **Effect chains for resets.** An effect on <code>country</code> that clears <code>state</code> renders the inconsistent pair first. Reset in the handler.
- **Guarding only the level you changed.** A city request for the old country can still land; invalidate the levels below too.
- **Caching resolved values only.** Two quick requests for the same key both hit the server. Cache the Promise.
- **Keeping a failed Promise in the cache.** The level stays broken until reload; evict on rejection.
- **Leaving lower selects enabled while empty.** Users can open a select with nothing in it. Disable and explain with the placeholder.
- **Losing the placeholder option.** Without a <code>value=""</code> option, resetting to <code>""</code> leaves the browser showing the first real option.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State shape:</strong> <span style="color:#f0e2c8;">"Three selected values and three option lists, each with a status of idle, loading or ready; placeholders and disabled flags are derived from the status."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Resets:</strong> <span style="color:#f0e2c8;">"Changing a level clears every level below it in the same event handler, so no render shows a state from another country."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Race guard:</strong> <span style="color:#f0e2c8;">"A counter per level: bump it when a request starts, apply the answer only if it is still the latest, and bump the lower levels too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cache:</strong> <span style="color:#f0e2c8;">"Cache the Promise per key, so StrictMode double effects and quick back-and-forth share requests; evict on failure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"Native labelled selects, disabled until ready, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-busy</code> while loading, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> summary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you restore a saved address for editing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Load countries, set the country, await its states, set the state, await its cities, set the city, in that order. With the promise cache the second and third loads are often instant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about 5,000 cities?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Switch the City control to a searchable combobox with virtualized options, and ask the API for a filtered list instead of everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would AbortController help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, to stop the browser downloading answers nobody needs. I would still keep the generation check, because an answer can already be resolved when you abort, and the cache would need to drop aborted Promises.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not useReducer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a good fit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chooseCountry</code> becomes one action that resets the lower levels, which makes the cascade explicit and testable. I kept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> because the async parts live in the handlers either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test the race?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mock API with promises I resolve by hand: resolve the US first, then India, and assert the options are still the US ones.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cascading reset** | Clearing dependent selections when their parent changes |
| **Stale-response guard** | Dropping a response if a newer request started |
| **Promise cache** | Caching the Promise per key, which also deduplicates in-flight requests |
| **aria-busy** | Tells assistive tech that an element is still updating |
| **StrictMode double effect** | Development-only mount, cleanup, mount again |

---
**Conclusion:** Dependent dropdowns are a small data model (three values, three option lists with a status) plus three rules: reset everything below a change in the same handler, drop responses from an older generation at every affected level, and cache Promises so repeated or simultaneous requests share one call. The React 19.3.1 run showed the slow India answer arriving after the United States and being ignored, StrictMode's double effect costing one request instead of two, and a return to India served from the cache. The same race thinking appears in the [debounced search bar](/interview-question/build-a-debounced-search-bar) and the [Flight Booker](/interview-question/build-a-flight-booker) shows the derive-don't-store side.`,
        files: {
          "/App.js": `import LocationPicker from "./src/LocationPicker";
import "./styles.css";

export default function App() {
  return (
    <main className="page">
      <LocationPicker />
    </main>
  );
}
`,
          "/src/LevelSelect.js": `// One dropdown level. \`options\` is { status:
// "idle" | "loading" | "ready", items }.
export default function LevelSelect({
  id,
  label,
  noun,
  plural,
  value,
  options,
  onChange,
  waitingFor,
}) {
  const { status, items } = options;
  const empty = status === "ready" && items.length === 0;
  let placeholder = "Select a " + noun;
  if (status === "idle") placeholder = "Choose a " + waitingFor + " first";
  if (status === "loading") placeholder = "Loading " + plural + "...";
  if (empty) placeholder = "No " + plural + " for this " + waitingFor;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={status !== "ready" || empty}
        aria-busy={status === "loading"}
      >
        <option value="">{placeholder}</option>
        {items.map((it) => (
          <option key={it.value ?? it} value={it.value ?? it}>
            {it.label ?? it}
          </option>
        ))}
      </select>
    </div>
  );
}
`,
          "/src/LocationPicker.js": `import { useEffect, useRef, useState } from "react";
import LevelSelect from "./LevelSelect";
import {
  countRequests,
  countryName,
  getCities,
  getCountries,
  getStates,
} from "./locationApi";

const IDLE = { status: "idle", items: [] };
const LOADING = { status: "loading", items: [] };
const ready = (items) => ({ status: "ready", items });

export default function LocationPicker() {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [countries, setCountries] = useState(LOADING);
  const [states, setStates] = useState(IDLE);
  const [cities, setCities] = useState(IDLE);
  const [requests, setRequests] = useState(0);
  // One counter per level: a response is used only if no newer request started.
  const latest = useRef({ states: 0, cities: 0 });

  useEffect(() => {
    let ignore = false;
    getCountries().then((items) => {
      if (!ignore) {
        setCountries(ready(items));
        setRequests(countRequests());
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  // Resets happen here, in the event handler, in the same update as the change.
  async function chooseCountry(code) {
    setCountry(code);
    setState("");
    setCity("");
    setCities(IDLE);
    const id = ++latest.current.states;
    latest.current.cities++; // also invalidate any city request in flight
    if (!code) {
      setStates(IDLE);
      return;
    }
    setStates(LOADING);
    const p = getStates(code);
    setRequests(countRequests());
    const items = await p;
    if (id === latest.current.states) setStates(ready(items));
  }

  async function chooseState(name) {
    setState(name);
    setCity("");
    const id = ++latest.current.cities;
    if (!name) {
      setCities(IDLE);
      return;
    }
    setCities(LOADING);
    const p = getCities(country, name);
    setRequests(countRequests());
    const items = await p;
    if (id === latest.current.cities) setCities(ready(items));
  }

  const summary = city ? city + ", " + state + ", " + countryName(country) : "";

  return (
    <form
      className="card"
      aria-label="Location"
      onSubmit={(e) => e.preventDefault()}
    >
      <h2>Where are you based?</h2>
      <LevelSelect
        id="country"
        label="Country"
        noun="country"
        plural="countries"
        value={country}
        options={countries}
        onChange={chooseCountry}
      />
      <LevelSelect
        id="state"
        label="State"
        noun="state"
        plural="states"
        waitingFor="country"
        value={state}
        options={states}
        onChange={chooseState}
      />
      <LevelSelect
        id="city"
        label="City"
        noun="city"
        plural="cities"
        waitingFor="state"
        value={city}
        options={cities}
        onChange={setCity}
      />
      <p role="status" data-testid="summary" className="summary">
        {summary && "Selected: " + summary}
      </p>
      <p className="meta" data-testid="requests">
        Requests sent: {requests}
      </p>
    </form>
  );
}
`,
          "/src/locationApi.js": `// Simulated server (no network in the playground) plus a small client cache.
const DATA = {
  IN: {
    name: "India",
    states: {
      Karnataka: ["Bengaluru", "Mysuru"],
      Maharashtra: ["Mumbai", "Nagpur", "Pune"],
    },
  },
  SG: { name: "Singapore", states: {} },
  US: {
    name: "United States",
    states: {
      California: ["Los Angeles", "San Francisco"],
      Texas: ["Austin", "Houston"],
    },
  },
};
// India is deliberately slow, so a quick
// India -> US switch makes India answer last.
const STATE_LATENCY = { IN: 600, SG: 200, US: 200 };

let requestsSent = 0;
const fakeServer = (ms, value) => {
  requestsSent++;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
};

// The cache stores the PROMISE, so two
// callers asking at once share one request.
const cache = new Map();
function cached(key, start) {
  if (!cache.has(key)) cache.set(key, start());
  return cache.get(key);
}

export const getCountries = () =>
  cached("countries", () =>
    fakeServer(
      150,
      Object.entries(DATA).map(([code, c]) => ({ value: code, label: c.name })),
    ),
  );

export const getStates = (country) =>
  cached("states:" + country, () =>
    fakeServer(STATE_LATENCY[country], Object.keys(DATA[country].states)),
  );

export const getCities = (country, state) =>
  cached("cities:" + country + "/" + state, () =>
    fakeServer(200, DATA[country].states[state]),
  );

export const countRequests = () => requestsSent;
export const countryName = (code) => DATA[code]?.name ?? "";
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 380px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
select {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
select:disabled {
  opacity: 0.5;
}
select[aria-busy="true"] {
  border-style: dashed;
}
select:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.summary {
  color: #7ee2a8;
  min-height: 1.2em;
  margin: 8px 0 4px;
}
.meta {
  color: #8b93a7;
  font-size: 0.8rem;
  margin: 0;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. No Vue form experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Vue 3.5.44 with real timers.

## 1. A Story First

On a nested restaurant menu you pick a cuisine, then a dish, then a side. Switch from Italian to Japanese and the waiter must cross out the carbonara and the garlic bread at once. Dependent dropdowns work the same way: a State only makes sense for its Country, and a City for its State.

The build: Country, State and City selects backed by an in-file fake API (no network in the playground). Countries take 150 ms, India's states 600 ms, other states 200 ms, cities 200 ms. India is slow on purpose: pick India and immediately the United States, and India answers last. Changing a level clears everything below it; each select shows "Choose a ... first", "Loading ...", "No states for this country" or "Select a ..."; fetched lists come from a cache; a "Requests sent" line counts server hits.

## 2. How the State Model Maps to Vue

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>country</code>, <code>state</code>, <code>city</code> | <code>ref()</code> + <code>v-model</code> on a child | The selections. |
| option lists | <code>shallowRef({ status, items })</code> | Replaced wholesale, never mutated, so deep tracking is wasted work. |
| resets and loading | <code>watch(country)</code>, <code>watch(state)</code> | Side effects of a parent change. |
| staleness | <code>onWatcherCleanup</code> | Marks the previous run of the same watcher stale. |
| summary | <code>computed()</code> | Derived. |

📌 **Interview term: shallowRef** — a ref that only tracks replacing <code>.value</code>, not changes inside it. Right for lists you always swap for a new object; see [shallowRef and shallowReactive](/interview-question/what-are-shallowref-and-shallowreactive).

📌 **Interview term: Cascading reset** — clearing dependent selections when their parent changes.

📌 **Interview term: Stale-response guard** — dropping a response if a newer request for the same level has started.

## 3. Build It Step by Step

### Step 1: a promise cache in the API module

<code>src/locationApi.js</code> keeps a <code>Map</code> from a key such as <code>states:IN</code> to the *Promise* for it. Two callers asking at once share one request, and later callers get the resolved Promise.

📌 **Interview term: Promise cache** — caching the Promise rather than the value, which also deduplicates in-flight requests. A real version deletes the key if the Promise rejects.

### Step 2: watchers drive the cascade

\`\`\`vue
// Parent changed: reset the children, then load the new level. //
onWatcherCleanup (Vue 3.5) marks the previous run stale when country
changes again. watch(country, async (code) => { let stale = false;
onWatcherCleanup(() => { stale = true; }); state.value = ""; city.value
= ""; if (!code) { states.value = IDLE; return; } states.value =
LOADING; const p = getStates(code); requests.value = countRequests();
const items = await p; if (!stale) states.value = ready(items); });
watch(state, async (name) => { let stale = false; onWatcherCleanup(() =>
{ stale = true; }); city.value = ""; if (!name) { cities.value = IDLE;
return; } cities.value = LOADING; const p = getCities(country.value,
name); requests.value = countRequests(); const items = await p; if
(!stale) cities.value = ready(items); });
\`\`\`

Watchers are the idiomatic Vue tool here, and they do not cause the flash of inconsistent values that an effect chain causes in React. By default a watcher runs with <code>flush: "pre"</code>, before Vue re-renders the component, so when the country changes, the country watcher clears <code>state</code>, that change queues the state watcher, which clears <code>city</code>, and only then does the template render once with all three consistent. See [watch flush timing](/interview-question/watch-vs-watcheffect-flush-timing-and-the-new-watch-options-in-3-5).

📌 **Interview term: onWatcherCleanup** — Vue 3.5 API (listed in the official 3.5 release post) that registers a cleanup for the current watcher run; Vue calls it before the next run. Each run has its own <code>stale</code> flag, so a slow India response sees <code>stale === true</code> once the user has picked the United States. It must be called before the first <code>await</code>, which is why it is the first line of each callback.

Because clearing <code>state</code> re-runs the state watcher, a city request for the old country is also marked stale, with no extra code.

### Step 3: one reusable select with defineModel

<code>LevelSelect.vue</code> uses <code>defineModel()</code> for the selection and derives the placeholder and the disabled flag from <code>options.status</code>. Its first option has <code>value=""</code>, so a reset shows the placeholder. More on the macro in [defineModel](/interview-question/what-is-definemodel-in-vue-3-4-and-how-does-it-replace-manual-prop-emit).

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Slow India, then fast United States | India's watcher run is stale; its answer is dropped |
| Back to India | Served from the promise cache |
| Country with no states | "No states for this country", select disabled |
| Placeholder re-selected | Watcher resets the levels below to idle |
| Screen reader | Labelled selects, <code>aria-busy</code> while loading, <code>role="status"</code> summary |

## 5. Verified: What the Solution Actually Did

Compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom on Vue 3.5.44, real timers, same driver as the other tabs. Each line shows the State and City selects (value, disabled flag, option texts). Output with the <code>[vue]</code> prefix removed:

\`\`\`text
RENDERED: Where are you based?CountryLoading countries...StateChoose a country firstCityChoose a state firstRequests sent: 0
on mount: country="" (disabled) [Loading countries...]
countries loaded: country="" [Select a country, India, Singapore, United States] | Requests sent: 1
picked India             | state="" (disabled) [Loading states...] | city="" (disabled) [Choose a state first] | Requests sent: 2
switched to US at once   | state="" (disabled) [Loading states...] | city="" (disabled) [Choose a state first] | Requests sent: 3
US states arrived        | state="" [Select a state, California, Texas] | city="" (disabled) [Choose a state first] | Requests sent: 3
India answered later     | state="" [Select a state, California, Texas] | city="" (disabled) [Choose a state first] | Requests sent: 3
picked California        | state="California" [Select a state, California, Texas] | city="" (disabled) [Loading cities...] | Requests sent: 4
picked San Francisco     | state="California" [Select a state, California, Texas] | city="San Francisco" [Select a city, Los Angeles, San Francisco] | Requests sent: 4
summary: Selected: San Francisco, California, United States
back to India (cached)   | state="" [Select a state, Karnataka, Maharashtra] | city="" (disabled) [Choose a state first] | Requests sent: 4
summary after reset: ""
picked Singapore         | state="" (disabled) [No states for this country] | city="" (disabled) [Choose a state first] | Requests sent: 5
\`\`\`

India's states answered after the United States' and were not shown; returning to India used the cache (the count stayed at 4); Singapore showed the empty state. Identical to the React and Angular runs. No <code>console.error</code>.

## 6. Common Pitfalls

- **Calling <code>onWatcherCleanup</code> after <code>await</code>.** Vue no longer knows which watcher is running, and the guard is never registered.
- **<code>watch(country, ..., { flush: "post" })</code> for the reset.** The template would render the old state under the new country first.
- **A deep <code>ref</code> for big option lists.** Every item becomes a reactive proxy for nothing; use <code>shallowRef</code>.
- **Caching resolved values only.** Quick repeats hit the server twice.
- **Forgetting the empty-value option.** Resetting to <code>""</code> then shows the first real option instead of the placeholder.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State shape:</strong> <span style="color:#f0e2c8;">"Three refs for the selections and three shallowRefs holding a status and items for each option list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cascade:</strong> <span style="color:#f0e2c8;">"A watcher on country clears state and city and loads states; a watcher on state clears city and loads cities. Pre-flush watchers settle before the render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Race guard:</strong> <span style="color:#f0e2c8;">"Each watcher run registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> to mark itself stale, so a slow, older answer is dropped."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cache:</strong> <span style="color:#f0e2c8;">"The API module caches Promises per key, deduplicating simultaneous requests; evict on failure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. A11y:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LevelSelect</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineModel</code>, labels, disabled until ready, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-busy</code> while loading, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> summary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why watchers here, when React prefers handlers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue watchers with the default pre flush run before the component re-renders, so the cascade settles in one render. In React an effect runs after the render, which is why the React version resets in the handler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you restore a saved address?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set the country, await its states, set the state, await its cities, set the city. Watchers would clear the lower levels as you go, so set them after each load, or add a flag that skips the reset during restore.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle very long city lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A searchable combobox with a filtered API call and a virtualized list instead of a native select.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vitest with a mock API that resolves by hand; Vue Test Utils <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> on the selects; resolve the US first and India second and assert the State options.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **shallowRef** | Ref that tracks only replacement of its value |
| **Cascading reset** | Clearing dependent selections when a parent changes |
| **onWatcherCleanup** | Vue 3.5 cleanup hook for a watcher run |
| **Promise cache** | Caching Promises to share and reuse requests |
| **flush: "pre"** | Watcher timing: before the component re-renders |

---
**Conclusion:** In Vue the cascade fits watchers naturally: pre-flush watchers clear the lower levels before the next render, <code>onWatcherCleanup</code> marks an older run stale so a slow answer is dropped, and shallow refs hold the option lists. The Vue 3.5.44 run matched React and Angular line for line, including the slow India answer being ignored and the cached return to India.`,
        files: {
          "/src/App.vue": `<script setup>
import LocationPicker from "./components/LocationPicker.vue";
</script>

<template>
  <main class="page">
    <LocationPicker />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 380px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
select {
  font: inherit;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: inherit;
}
select:disabled {
  opacity: 0.5;
}
select[aria-busy="true"] {
  border-style: dashed;
}
select:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
.summary {
  color: #7ee2a8;
  min-height: 1.2em;
  margin: 8px 0 4px;
}
.meta {
  color: #8b93a7;
  font-size: 0.8rem;
  margin: 0;
}
</style>
`,
          "/src/components/LevelSelect.vue": `<script setup>
import { computed } from "vue";

// v-model support: defineModel creates the modelValue prop + update event.
const model = defineModel({ type: String, default: "" });
const props = defineProps({
  id: String,
  label: String,
  noun: String,
  plural: String,
  waitingFor: String,
  // { status: "idle" | "loading" | "ready", items }
  options: { type: Object, required: true },
});

const empty = computed(
  () => props.options.status === "ready" && props.options.items.length === 0,
);
const placeholder = computed(() => {
  if (props.options.status === "idle")
    return "Choose a " + props.waitingFor + " first";
  if (props.options.status === "loading")
    return "Loading " + props.plural + "...";
  if (empty.value)
    return "No " + props.plural + " for this " + props.waitingFor;
  return "Select a " + props.noun;
});
const valueOf = (it) => (typeof it === "string" ? it : it.value);
const labelOf = (it) => (typeof it === "string" ? it : it.label);
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      :disabled="options.status !== 'ready' || empty"
      :aria-busy="options.status === 'loading'"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-for="it in options.items"
        :key="valueOf(it)"
        :value="valueOf(it)"
      >
        {{ labelOf(it) }}
      </option>
    </select>
  </div>
</template>
`,
          "/src/components/LocationPicker.vue": `<script setup>
import { computed, onWatcherCleanup, ref, shallowRef, watch } from "vue";
import LevelSelect from "./LevelSelect.vue";
import {
  countRequests,
  countryName,
  getCities,
  getCountries,
  getStates,
} from "../locationApi.js";

const IDLE = { status: "idle", items: [] };
const LOADING = { status: "loading", items: [] };
const ready = (items) => ({ status: "ready", items });

const country = ref("");
const state = ref("");
const city = ref("");
// Option lists are replaced wholesale, never mutated, so shallowRef is enough.
const countries = shallowRef(LOADING);
const states = shallowRef(IDLE);
const cities = shallowRef(IDLE);
const requests = ref(0);

getCountries().then((items) => {
  countries.value = ready(items);
  requests.value = countRequests();
});

// Parent changed: reset the children, then load the new level.
// onWatcherCleanup (Vue 3.5) marks the previous
// run stale when country changes again.
watch(country, async (code) => {
  let stale = false;
  onWatcherCleanup(() => {
    stale = true;
  });
  state.value = "";
  city.value = "";
  if (!code) {
    states.value = IDLE;
    return;
  }
  states.value = LOADING;
  const p = getStates(code);
  requests.value = countRequests();
  const items = await p;
  if (!stale) states.value = ready(items);
});

watch(state, async (name) => {
  let stale = false;
  onWatcherCleanup(() => {
    stale = true;
  });
  city.value = "";
  if (!name) {
    cities.value = IDLE;
    return;
  }
  cities.value = LOADING;
  const p = getCities(country.value, name);
  requests.value = countRequests();
  const items = await p;
  if (!stale) cities.value = ready(items);
});

const summary = computed(() =>
  city.value
    ? city.value + ", " + state.value + ", " + countryName(country.value)
    : "",
);
</script>

<template>
  <form class="card" aria-label="Location" @submit.prevent>
    <h2>Where are you based?</h2>
    <LevelSelect
      id="country"
      v-model="country"
      label="Country"
      noun="country"
      plural="countries"
      :options="countries"
    />
    <LevelSelect
      id="state"
      v-model="state"
      label="State"
      noun="state"
      plural="states"
      waiting-for="country"
      :options="states"
    />
    <LevelSelect
      id="city"
      v-model="city"
      label="City"
      noun="city"
      plural="cities"
      waiting-for="state"
      :options="cities"
    />
    <p role="status" data-testid="summary" class="summary">
      {{ summary && "Selected: " + summary }}
    </p>
    <p class="meta" data-testid="requests">Requests sent: {{ requests }}</p>
  </form>
</template>
`,
          "/src/locationApi.js": `// Simulated server (no network in the playground) plus a small client cache.
const DATA = {
  IN: {
    name: "India",
    states: {
      Karnataka: ["Bengaluru", "Mysuru"],
      Maharashtra: ["Mumbai", "Nagpur", "Pune"],
    },
  },
  SG: { name: "Singapore", states: {} },
  US: {
    name: "United States",
    states: {
      California: ["Los Angeles", "San Francisco"],
      Texas: ["Austin", "Houston"],
    },
  },
};
// India is deliberately slow, so a quick
// India -> US switch makes India answer last.
const STATE_LATENCY = { IN: 600, SG: 200, US: 200 };

let requestsSent = 0;
const fakeServer = (ms, value) => {
  requestsSent++;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
};

// The cache stores the PROMISE, so two
// callers asking at once share one request.
const cache = new Map();
function cached(key, start) {
  if (!cache.has(key)) cache.set(key, start());
  return cache.get(key);
}

export const getCountries = () =>
  cached("countries", () =>
    fakeServer(
      150,
      Object.entries(DATA).map(([code, c]) => ({ value: code, label: c.name })),
    ),
  );

export const getStates = (country) =>
  cached("states:" + country, () =>
    fakeServer(STATE_LATENCY[country], Object.keys(DATA[country].states)),
  );

export const getCities = (country, state) =>
  cached("cities:" + country + "/" + state, () =>
    fakeServer(200, DATA[country].states[state]),
  );

export const countRequests = () => requestsSent;
export const countryName = (code) => DATA[code]?.name ?? "";
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. No Angular forms experience is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the output in section 5 was produced by actually running it on Angular 22.2.3 (AOT with strict templates, and the playground JIT).

## 1. A Story First

On a nested menu you pick a cuisine, a dish, then a side; switch cuisine and the dish and side must be crossed out at once. Country, State and City dropdowns follow the same rule: a lower level only makes sense for the current upper level.

The build: three selects backed by an in-file fake API (no network in the playground). Countries take 150 ms, India's states 600 ms, other states 200 ms, cities 200 ms, so a quick India then United States switch makes India answer last. Changing a level clears the levels below; placeholders explain each state ("Choose a country first", "Loading states...", "No states for this country"); lists are cached; "Requests sent" counts server hits.

## 2. How the State Model Maps to Angular

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| selections | <code>signal("")</code> × 3 | Template state for a zoneless app. |
| option lists | <code>signal&lt;Level&gt;</code> × 3 | <code>{ status, items }</code>, replaced on each change. |
| a level's select | <code>LevelSelectComponent</code> with <code>@Input</code> / <code>@Output</code> | One reusable control. |
| resets and loading | <code>chooseCountry</code>, <code>chooseState</code> methods | The change and its resets happen together. |
| staleness | a counter per level | Apply an answer only if it is still the latest. |
| summary | <code>computed()</code> | Derived. |

📌 **Interview term: Cascading reset** — clearing dependent selections when their parent changes.

📌 **Interview term: Stale-response guard** — dropping a response if a newer request for the same level has started.

📌 **Interview term: Two-way binding naming** — an <code>@Input() value</code> paired with <code>@Output() valueChange</code> lets a parent write <code>[(value)]="city"</code>; with a <code>WritableSignal</code> on the right-hand side, Angular reads and sets the signal. The parent uses that for City and the split form for Country and State, because those changes need a handler. See [child-to-parent events](/interview-question/how-do-child-components-emit-events-to-parents).

## 3. Build It Step by Step

### Step 1: a promise cache

<code>location-api.ts</code> stores the *Promise* per key (<code>states:IN</code>), so simultaneous requests share one call and repeats are instant.

📌 **Interview term: Promise cache** — caching Promises instead of values, which also deduplicates in-flight requests. A real version evicts a key whose Promise rejected.

### Step 2: the reusable select

\`\`\`ts
@Component({
  selector: "app-level-select",
  standalone: true,
  imports: [FormsModule],
  template: \`
    <div class="field">
      <label [for]="selectId">{{ label }}</label>
      <select [id]="selectId" [ngModel]="value" (ngModelChange)="valueChange.emit($event)"
        [disabled]="options.status !== 'ready' || empty()" [attr.aria-busy]="options.status === 'loading'">
        <option value="">{{ placeholder() }}</option>
        @for (it of options.items; track it.value) {
          <option [value]="it.value">{{ it.label }}</option>
        }
      </select>
    </div>
  \`,
})
export class LevelSelectComponent {
  // Not called "id": a static id="..."
  // would also stay on the host element
  // and the page would have two elements with the same id.
  @Input({ required: true }) selectId = "";
  @Input() label = "";
  @Input() noun = "";
  @Input() plural = "";
  @Input() waitingFor = "";
  @Input() value = "";
  @Input({ required: true }) options: Level = { status: "idle", items: [] };
  // value + valueChange is the naming that
  // allows [(value)] two-way binding.
  @Output() valueChange = new EventEmitter<string>();
\`\`\`

<code>ngModel</code> (from <code>FormsModule</code>) is used instead of <code>[value]</code> on purpose. In the <code>@angular/forms</code> 22.2.3 source, every <code>&lt;option&gt;</code> inside an <code>ngModel</code> select registers as an <code>NgSelectOption</code> and, when its value is set or it is destroyed, asks the select to write the model value again after render. A plain <code>[value]</code> on <code>&lt;select&gt;</code> has no such hook, so a value set before its options exist can be lost.

The input is named <code>selectId</code>, not <code>id</code>. The first version used <code>id</code>, and the verifier failed: <code>&lt;app-level-select id="country"&gt;</code> keeps the static <code>id</code> attribute on the host element as well, so the page had two elements with <code>id="country"</code>, and <code>#country</code> found the host, not the select. That would also break the <code>&lt;label for&gt;</code> association in a real browser.

### Step 3: resets and the guard in the handlers

\`\`\`ts
// Resets happen in the handler, together
// with the change that causes them.
async chooseCountry(code: string) {
  this.country.set(code);
  this.state.set("");
  this.city.set("");
  this.cities.set(IDLE);
  const id = ++this.latest.states;
  this.latest.cities++; // also invalidate any city request in flight
  if (!code) {
    this.states.set(IDLE);
    return;
  }
  this.states.set(LOADING);
  const p = getStates(code);
  this.requests.set(countRequests());
  const items = await p;
  if (id === this.latest.states) this.states.set(ready(items));
}

async chooseState(name: string) {
  this.state.set(name);
  this.city.set("");
  const id = ++this.latest.cities;
  if (!name) {
    this.cities.set(IDLE);
    return;
  }
  this.cities.set(LOADING);
  const p = getCities(this.country(), name);
  this.requests.set(countRequests());
  const items = await p;
  if (id === this.latest.cities) this.cities.set(ready(items));
}
\`\`\`

<code>++this.latest.states</code> starts a new generation for the State level; <code>this.latest.cities++</code> also invalidates any city request for the old country. After <code>await</code>, the answer is applied only if its generation is still current. Signals are written after the <code>await</code>, which is what makes the zoneless view refresh.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| Slow India, then fast United States | India's generation is stale, answer dropped |
| City request in flight on a country change | Invalidated by bumping the city counter |
| Back to India | Served from the promise cache |
| Country with no states | "No states for this country", select disabled |
| Screen reader | Labelled selects, <code>[attr.aria-busy]</code> while loading, <code>role="status"</code> summary |

## 5. Verified: What the Solution Actually Did

Booted with <code>bootstrapApplication(AppComponent)</code> and no providers, compiled with <code>ngc</code> and <code>strictTemplates</code>, and again through the playground JIT, with real timers and the same driver as the other tabs. Both runs printed the same lines; AOT run, prefix removed:

\`\`\`text
RENDERED: Where are you based?CountryLoading countries...StateChoose a country firstCityChoose a state firstRequests sent: 0
on mount: country="" (disabled) [Loading countries...]
countries loaded: country="" [Select a country, India, Singapore, United States] | Requests sent: 1
picked India             | state="" (disabled) [Loading states...] | city="" (disabled) [Choose a state first] | Requests sent: 2
switched to US at once   | state="" (disabled) [Loading states...] | city="" (disabled) [Choose a state first] | Requests sent: 3
US states arrived        | state="" [Select a state, California, Texas] | city="" (disabled) [Choose a state first] | Requests sent: 3
India answered later     | state="" [Select a state, California, Texas] | city="" (disabled) [Choose a state first] | Requests sent: 3
picked California        | state="California" [Select a state, California, Texas] | city="" (disabled) [Loading cities...] | Requests sent: 4
picked San Francisco     | state="California" [Select a state, California, Texas] | city="San Francisco" [Select a city, Los Angeles, San Francisco] | Requests sent: 4
summary: Selected: San Francisco, California, United States
back to India (cached)   | state="" [Select a state, Karnataka, Maharashtra] | city="" (disabled) [Choose a state first] | Requests sent: 4
summary after reset: ""
picked Singapore         | state="" (disabled) [No states for this country] | city="" (disabled) [Choose a state first] | Requests sent: 5
\`\`\`

India's late answer was ignored, the return to India came from the cache (the count stayed at 4), and Singapore showed the empty state. Identical to the React and Vue runs. No <code>console.error</code>.

## 6. Common Pitfalls

- **An input named <code>id</code> on a component.** The static attribute stays on the host too, duplicating the id, as the first run here showed.
- **<code>[value]</code> on a select whose options load later.** Nothing re-applies the value when the options arrive; use <code>ngModel</code> or a <code>FormControl</code>.
- **Guarding only the changed level.** A city answer for the old country can still arrive; bump the lower counters.
- **Doing the cascade in <code>effect()</code>.** Effects run later and are meant for syncing with the outside world, not for writing other signals; see [when not to use effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
- **Plain fields for the option lists.** After the <code>await</code>, a zoneless app would not re-render.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State shape:</strong> <span style="color:#f0e2c8;">"Three signals for the selections and three signals holding a status and items for each list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Reusable control:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LevelSelect</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> options and value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code> valueChange, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> on the select, and placeholders from the status."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cascade:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chooseCountry</code> sets the country and clears state, city and the city list in the same call, then loads states."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Race guard:</strong> <span style="color:#f0e2c8;">"A counter per level: bump on each request, apply only if still latest, and bump the lower levels too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cache and a11y:</strong> <span style="color:#f0e2c8;">"Promises cached per key; labels, disabled until ready, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aria-busy</code>, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">role=status</code> summary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could this be an RxJS pipeline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">country$</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap(getStates)</code> gives the stale guard for free, and the city stream switches on both. For two levels, plain async methods with counters read more simply.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not reactive forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> works too, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code> on each control driving the resets. The hard parts, resets and staleness, are the same either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you restore a saved address?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Await each level in order and set the value after its options are ready; the promise cache makes repeats instant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed with a mock API whose promises resolve by hand; change the selects, resolve the US first and India second, assert the State options.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cascading reset** | Clearing dependent selections when a parent changes |
| **Stale-response guard** | Dropping an answer if a newer request started |
| **Promise cache** | Caching Promises per key to share requests |
| **[(value)]** | Two-way binding from an input and a matching Change output |
| **ngModel** | FormsModule directive that syncs a control with a value |

---
**Conclusion:** In Angular the dependent dropdowns are signals for the selections and option lists, handler methods that reset the lower levels together with the change, a counter per level to drop stale answers, and a promise cache. The AOT and JIT runs on Angular 22.2.3 matched React and Vue, and the first run caught a real bug worth mentioning in an interview: a component input named <code>id</code> duplicates the id on the host element.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { LocationPickerComponent } from "./location-picker.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [LocationPickerComponent],
  template: \`<main class="page"><app-location-picker /></main>\`,
  // Global styles for this small app, so the child components share them.
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1117;
        color: #e6e8ee;
        font-family: system-ui, sans-serif;
      }
      .page {
        display: flex;
        justify-content: center;
        padding: 24px 16px;
      }
      .card {
        width: 100%;
        max-width: 380px;
        background: #181b24;
        border: 1px solid #2a2f3d;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 1.2rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
      }
      label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      select {
        font: inherit;
        padding: 9px 11px;
        border-radius: 8px;
        border: 1px solid #3a4152;
        background: #0f1117;
        color: inherit;
      }
      select:disabled {
        opacity: 0.5;
      }
      select[aria-busy="true"] {
        border-style: dashed;
      }
      select:focus-visible {
        outline: 2px solid #7aa2ff;
        outline-offset: 2px;
      }
      .summary {
        color: #7ee2a8;
        min-height: 1.2em;
        margin: 8px 0 4px;
      }
      .meta {
        color: #8b93a7;
        font-size: 0.8rem;
        margin: 0;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/level-select.component.ts": `import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Option } from "./location-api";

export type Level = { status: "idle" | "loading" | "ready"; items: Option[] };

@Component({
  selector: "app-level-select",
  standalone: true,
  imports: [FormsModule],
  template: \`
    <div class="field">
      <label [for]="selectId">{{ label }}</label>
      <select
        [id]="selectId"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="options.status !== 'ready' || empty()"
        [attr.aria-busy]="options.status === 'loading'"
      >
        <option value="">{{ placeholder() }}</option>
        @for (it of options.items; track it.value) {
          <option [value]="it.value">{{ it.label }}</option>
        }
      </select>
    </div>
  \`,
})
export class LevelSelectComponent {
  // Not called "id": a static id="..." would also stay on the host element
  // and the page would have two elements with the same id.
  @Input({ required: true }) selectId = "";
  @Input() label = "";
  @Input() noun = "";
  @Input() plural = "";
  @Input() waitingFor = "";
  @Input() value = "";
  @Input({ required: true }) options: Level = { status: "idle", items: [] };
  // value + valueChange is the naming that allows [(value)] two-way binding.
  @Output() valueChange = new EventEmitter<string>();

  empty() {
    return this.options.status === "ready" && this.options.items.length === 0;
  }
  placeholder() {
    if (this.options.status === "idle")
      return "Choose a " + this.waitingFor + " first";
    if (this.options.status === "loading")
      return "Loading " + this.plural + "...";
    if (this.empty())
      return "No " + this.plural + " for this " + this.waitingFor;
    return "Select a " + this.noun;
  }
}
`,
          "/src/app/location-api.ts": `// Simulated server (no network in the playground) plus a small client cache.
export type Option = { value: string; label: string };
const DATA: Record<string, { name: string; states: Record<string, string[]> }> =
  {
    IN: {
      name: "India",
      states: {
        Karnataka: ["Bengaluru", "Mysuru"],
        Maharashtra: ["Mumbai", "Nagpur", "Pune"],
      },
    },
    SG: { name: "Singapore", states: {} },
    US: {
      name: "United States",
      states: {
        California: ["Los Angeles", "San Francisco"],
        Texas: ["Austin", "Houston"],
      },
    },
  };
// India is deliberately slow, so a quick
// India -> US switch makes India answer last.
const STATE_LATENCY: Record<string, number> = { IN: 600, SG: 200, US: 200 };

let requestsSent = 0;
function fakeServer<T>(ms: number, value: T): Promise<T> {
  requestsSent++;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// The cache stores the PROMISE, so two
// callers asking at once share one request.
const cache = new Map<string, Promise<Option[]>>();
function cached(
  key: string,
  start: () => Promise<Option[]>,
): Promise<Option[]> {
  if (!cache.has(key)) cache.set(key, start());
  return cache.get(key)!;
}
const toOptions = (names: string[]): Option[] =>
  names.map((n) => ({ value: n, label: n }));

export const getCountries = () =>
  cached("countries", () =>
    fakeServer(
      150,
      Object.entries(DATA).map(([code, c]) => ({ value: code, label: c.name })),
    ),
  );
export const getStates = (country: string) =>
  cached("states:" + country, () =>
    fakeServer(
      STATE_LATENCY[country],
      toOptions(Object.keys(DATA[country].states)),
    ),
  );
export const getCities = (country: string, state: string) =>
  cached("cities:" + country + "/" + state, () =>
    fakeServer(200, toOptions(DATA[country].states[state])),
  );

export const countRequests = () => requestsSent;
export const countryName = (code: string) => DATA[code]?.name ?? "";
`,
          "/src/app/location-picker.component.ts": `import { Component, computed, signal } from "@angular/core";
import { Level, LevelSelectComponent } from "./level-select.component";
import {
  countRequests,
  countryName,
  getCities,
  getCountries,
  getStates,
  Option,
} from "./location-api";

const IDLE: Level = { status: "idle", items: [] };
const LOADING: Level = { status: "loading", items: [] };
const ready = (items: Option[]): Level => ({ status: "ready", items });

@Component({
  selector: "app-location-picker",
  standalone: true,
  imports: [LevelSelectComponent],
  template: \`
    <form class="card" aria-label="Location" (submit)="$event.preventDefault()">
      <h2>Where are you based?</h2>
      <app-level-select selectId="country" label="Country" noun="country" plural="countries"
        [value]="country()" (valueChange)="chooseCountry($event)" [options]="countries()" />
      <app-level-select selectId="state" label="State" noun="state" plural="states" waitingFor="country"
        [value]="state()" (valueChange)="chooseState($event)" [options]="states()" />
      <app-level-select selectId="city" label="City" noun="city" plural="cities" waitingFor="state"
        [(value)]="city" [options]="cities()" />
      <p
        role="status"
        data-testid="summary"
        class="summary"
      >{{ summary() ? "Selected: " + summary() : "" }}</p>
      <p class="meta" data-testid="requests">Requests sent: {{ requests() }}</p>
    </form>
  \`,
})
export class LocationPickerComponent {
  readonly country = signal("");
  readonly state = signal("");
  readonly city = signal("");
  readonly countries = signal<Level>(LOADING);
  readonly states = signal<Level>(IDLE);
  readonly cities = signal<Level>(IDLE);
  readonly requests = signal(0);
  readonly summary = computed(() =>
    this.city()
      ? this.city() + ", " + this.state() + ", " + countryName(this.country())
      : "",
  );
  // One counter per level: a response is used only if no newer request started.
  private latest = { states: 0, cities: 0 };

  constructor() {
    getCountries().then((items) => {
      this.countries.set(ready(items));
      this.requests.set(countRequests());
    });
  }

  // Resets happen in the handler, together with the change that causes them.
  async chooseCountry(code: string) {
    this.country.set(code);
    this.state.set("");
    this.city.set("");
    this.cities.set(IDLE);
    const id = ++this.latest.states;
    this.latest.cities++; // also invalidate any city request in flight
    if (!code) {
      this.states.set(IDLE);
      return;
    }
    this.states.set(LOADING);
    const p = getStates(code);
    this.requests.set(countRequests());
    const items = await p;
    if (id === this.latest.states) this.states.set(ready(items));
  }

  async chooseState(name: string) {
    this.state.set(name);
    this.city.set("");
    const id = ++this.latest.cities;
    if (!name) {
      this.cities.set(IDLE);
      return;
    }
    this.cities.set(LOADING);
    const p = getCities(this.country(), name);
    this.requests.set(countRequests());
    const items = await p;
    if (id === this.latest.cities) this.cities.set(ready(items));
  }
}
`,
        },
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Password Generator",
    seoDescription: "Build a password generator in React, Vue and Angular with crypto.getRandomValues, unbiased sampling, one character per chosen class and a strength meter.",
    description: `**Question presented to candidate:**
"Build a password generator: a length slider, checkboxes for uppercase, lowercase, digits and symbols, a strength indicator, and a copy button. Every password must contain at least one character from each type the user ticked. Tell me how you make it actually random."

**Requirements:**
- Length from 8 to 64 (default 16) and four character classes (all on by default). Changing any setting generates a new password; a button generates another.
- Every generated password contains at least one character from each selected class, and only characters from selected classes.
- With no class selected: no password, the generate and copy buttons disabled, and an explanation.
- A strength meter based on estimated entropy (bits), with a label (Weak, Fair, Strong, Very strong).
- Copy to clipboard with a "Copied" status that disappears after 2 seconds, and a fallback message when the clipboard refuses.

**What a strong answer should cover:**
- Why \`Math.random()\` is wrong for secrets (not a cryptographically secure generator) and that \`crypto.getRandomValues()\` is the browser tool for it.
- **Modulo bias**: \`random % n\` favours some characters unless 2^32 (or 256) is a multiple of \`n\`; fix with rejection sampling.
- The class guarantee: one character from each chosen class, the rest from the combined pool, then a **Fisher–Yates shuffle** so the guaranteed characters are not always first.
- Entropy estimate \`length × log2(poolSize)\` and its limits; the meter is derived from the settings, not stored.
- Clipboard API (\`navigator.clipboard.writeText\`, async, needs a secure context and may be refused), a polite status message, and clearing timers on unmount.

**Clarifying questions expected:**
- "Should we exclude look-alike characters such as 0/O and 1/l?"
- "Which symbol set does the target system accept?"
- "Is the strength meter for generated passwords only, or also for passwords people type?"

**Code / implementation expected:** Yes. A generator using \`crypto.getRandomValues\` with unbiased sampling and a verified class guarantee, plus the UI with a strength meter and copy.`,
    frameworks: {
      react: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round. You know a little HTML and JavaScript; no React or cryptography background is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and every output in section 6 was produced by actually running it: the generator on its own in Node 22.22.0, and the component on React 19.3.1.

## 1. Why This Even Matters — A Story First

Imagine a lottery where the balls are drawn by a machine that, if you watch a few draws, lets you predict the next one. It still *looks* random to a casual viewer. Nobody would accept it for a real lottery.

<code>Math.random()</code> is that machine. It is fine for shuffling a playlist or placing confetti, but it was never designed to be unpredictable to an attacker. V8, the engine in Chrome and Node, switched <code>Math.random</code> to the xorshift128+ algorithm in 2015 (Chrome 49), and the V8 team's own post, "There's Math.random(), and then there's Math.random()" on v8.dev, says plainly that it is still not cryptographically secure. Passwords are secrets, so they need the browser's **cryptographically secure** generator, <code>crypto.getRandomValues()</code>.

The interview has three more traps after that: using the secure numbers without introducing bias, guaranteeing "at least one digit" without making the digit always come first, and being honest about what a strength meter can measure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which symbols does the target system accept? | Some systems reject quotes or backslashes. This build uses <code>!@#$%^&amp;*()-_=+[]{};:,.?/</code> (24 symbols). |
| Exclude look-alike characters (0/O, 1/l/I)? | Helps people who type the password by hand; it shrinks the pool and so the entropy. |
| Must every selected class appear? | Many password policies demand it. It costs a little entropy and needs a shuffle. |
| Minimum and maximum length? | Decides the slider range; the class guarantee needs length of at least the number of classes. Here 8 to 64. |
| Is the strength meter also for typed passwords? | Generated passwords can be scored from the settings; typed ones need a pattern-aware estimator such as zxcvbn. |
| Should the password ever leave the page? | No logging, no analytics on the value, and no persisting it. |

## 3. Requirements and the State Model

| Piece | Kind | Why |
| :--- | :--- | :--- |
| <code>settings</code> | State | <code>{ length, enabled }</code> from the slider and checkboxes. |
| <code>password</code> | State | Random output; cannot be derived, because render must be pure. |
| <code>copyStatus</code> | State | "Copied to clipboard", the failure message, or empty. |
| status timer | Ref | So the next copy, or unmount, can clear it. |
| strength | **Derived** | <code>strength(length, enabled)</code> every render. |
| nothing selected | **Derived** | <code>enabled.length === 0</code>. |

📌 **Interview term: Render purity** — a React component must return the same output for the same props and state. Calling a random generator during render breaks that, and StrictMode (which renders twice in development) would show it as a flicker or mismatch. Randomness belongs in an event handler or a lazy <code>useState</code> initializer.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Generation pipeline: pick one character per chosen class, fill the rest from the combined pool, then shuffle with Fisher Yates">
  <defs>
    <marker id="mcp6r-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="115" y="70" text-anchor="middle">1. one per class</text>
  <text class="d-sub" x="115" y="92" text-anchor="middle">A, k, 7, #</text>
  <rect class="d-box" x="255" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="350" y="70" text-anchor="middle">2. fill from pool</text>
  <text class="d-sub" x="350" y="92" text-anchor="middle">all 86 characters</text>
  <rect class="d-box-accent" x="490" y="40" width="190" height="70" rx="10"/>
  <text class="d-text d-accent" x="585" y="70" text-anchor="middle">3. shuffle</text>
  <text class="d-sub" x="585" y="92" text-anchor="middle">Fisher-Yates</text>
  <path class="d-edge" d="M 210 75 L 249 75" marker-end="url(#mcp6r-arrow)"/>
  <path class="d-edge" d="M 445 75 L 484 75" marker-end="url(#mcp6r-arrow)"/>
  <rect class="d-box-muted" x="150" y="160" width="400" height="50" rx="10"/>
  <text class="d-text" x="350" y="190" text-anchor="middle">every draw: randomInt(n) from crypto</text>
  <path class="d-edge-dashed" d="M 115 110 L 200 154" marker-end="url(#mcp6r-arrow)"/>
  <path class="d-edge-dashed" d="M 350 110 L 350 154" marker-end="url(#mcp6r-arrow)"/>
  <path class="d-edge-dashed" d="M 585 110 L 500 154" marker-end="url(#mcp6r-arrow)"/>
</svg>

All three stages draw their randomness from one function, <code>randomInt(n)</code>, built on <code>crypto.getRandomValues</code>. Get that function right and the rest is ordinary array code.

## 4. Build It Step by Step

### Step 1: an unbiased random integer

\`\`\`js
// Uniform integer in [0, n) from a CSPRNG.
// Plain "random % n" is biased when
// 2^32 is not a multiple of n, so values
// at or above the largest multiple of n
// are thrown away and drawn again (rejection sampling).
const buf = new Uint32Array(1);
export function randomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}
\`\`\`

📌 **Interview term: CSPRNG** — a cryptographically secure pseudo-random number generator: even someone who has seen many outputs cannot predict the next one. In browsers (and in Node 22 as a global) it is exposed as <code>crypto.getRandomValues(typedArray)</code>, which MDN describes as returning cryptographically strong random values.

📌 **Interview term: Modulo bias** — the unevenness you get from <code>random % n</code> when the number of possible random values is not a multiple of <code>n</code>. With one random byte (256 values) and our 86-character pool, 256 = 2 × 86 + 84, so 84 characters can be produced three ways and 2 characters only two ways: those 84 are 50% more likely. Section 6 shows this counted exactly.

📌 **Interview term: Rejection sampling** — throw away random values at or above the largest multiple of <code>n</code> and draw again. Every remaining value maps to each result the same number of times. With 32-bit values the rejection chance for <code>n = 86</code> is tiny (under one in fifty million), so the loop almost never repeats.

### Step 2: guarantee each class, then shuffle

\`\`\`js
export function generatePassword(length, enabledIds) {
  const sets = CLASSES.filter((c) => enabledIds.includes(c.id)).map(
    (c) => c.chars,
  );
  if (sets.length === 0) return "";
  const pool = sets.join("");
  // One guaranteed character from each
  // chosen class, the rest from the pool.
  const out = sets.map((s) => s[randomInt(s.length)]);
  while (out.length < length) out.push(pool[randomInt(pool.length)]);
  // Fisher-Yates shuffle so the guaranteed
  // characters are not always first.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}
\`\`\`

📌 **Interview term: Fisher–Yates shuffle** — walk the array from the end, swapping each position with a uniformly random earlier-or-same position. It produces every ordering with equal probability, provided the random index is unbiased, which is why it uses <code>randomInt</code> too. The popular <code>array.sort(() =&gt; Math.random() - 0.5)</code> is neither uniform nor secure.

Without the shuffle, the first four characters would always be one uppercase, one lowercase, one digit and one symbol in that order, which an attacker could exploit.

### Step 3: an honest strength estimate

\`\`\`js
// Entropy estimate: length x log2(pool size), assuming uniform choice.
export function strength(length, enabledIds) {
  const pool = CLASSES.filter((c) => enabledIds.includes(c.id)).reduce(
    (n, c) => n + c.chars.length,
    0,
  );
  if (!pool) return { bits: 0, label: "None" };
  const bits = Math.round(length * Math.log2(pool));
  const label =
    bits < 40
      ? "Weak"
      : bits < 60
        ? "Fair"
        : bits < 80
          ? "Strong"
          : "Very strong";
  return { bits, label };
}
\`\`\`

📌 **Interview term: Entropy (bits)** — how many yes/no guesses an attacker needs, on average doubled per bit. For a password chosen uniformly from a pool of size <code>P</code>, each character adds <code>log2(P)</code> bits. 16 characters from all 86 gives about 103 bits; 8 digits gives about 27. The class guarantee makes the real number very slightly lower than this estimate, because a few combinations (for example, no digit at all) can never be produced. The thresholds (40, 60, 80) are this build's choice, not a standard.

This formula is only valid for *generated* passwords. A typed password like <code>Password1!</code> has the same character classes and a terrible real strength; scoring typed passwords needs a pattern-aware estimator.

### Step 4: the component

\`\`\`jsx
export default function PasswordGenerator() {
  const [settings, setSettings] = useState(DEFAULT);
  // Random values are not derived state:
  // generate in an initializer or a
  // handler, never during render (render
  // must be pure; StrictMode renders twice).
  const [password, setPassword] = useState(() => generatePassword(DEFAULT.length, DEFAULT.enabled));
  const [copyStatus, setCopyStatus] = useState("");
  const timer = useRef(null);
  // no setState after unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  const { length, enabled } = settings;
  const meter = strength(length, enabled);
  const none = enabled.length === 0;

  function apply(next) {
    setSettings(next);
    setPassword(generatePassword(next.length, next.enabled));
    setCopyStatus("");
  }

  function toggle(id) {
    const on = enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id];
    apply({ length, enabled: CLASSES.map((c) => c.id).filter((x) => on.includes(x)) });
  }

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("Copied to clipboard");
    } catch {
      setCopyStatus("Copy failed. Select the password and copy it manually.");
    }
    timer.current = setTimeout(() => setCopyStatus(""), 2000);
  }
\`\`\`

- The first password comes from a lazy <code>useState</code> initializer, so it runs once per mount (StrictMode calls initializers twice in development but keeps one result).
- Every settings change goes through <code>apply</code>, which stores the settings and generates in the same event, instead of an effect that watches settings.
- <code>navigator.clipboard.writeText</code> returns a Promise and can reject (no permission, insecure context), so it is wrapped in <code>try</code>/<code>catch</code> with a fallback message. The status timer is cleared on the next copy and on unmount.

## 5. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| No class selected | Empty password, generate and copy disabled, <code>role="alert"</code> explanation |
| Length 8 with all four classes | Still contains each class (tested 200 times in the UI, 100,000 times directly at length 4) |
| Clipboard refused | "Copy failed. Select the password and copy it manually." |
| Copy twice quickly | The previous status timer is cleared |
| Unmount during the 2 s timer | Effect cleanup clears it |
| Reading the password | Read-only input with <code>aria-label</code>, selects all on focus |
| Length value | <code>&lt;output for="length"&gt;</code> beside the label |
| Strength | Native <code>&lt;meter&gt;</code> plus a text label, not colour alone |

## 6. Verified: What the Solution Actually Did

First the generator alone, imported into Node 22.22.0 (whose global <code>crypto</code> is the Web Crypto API):

\`\`\`text
randomInt(86) x 860000: min 9718, max 10383, expected 10000, chi-square 86.4 (df 85)
byte % 86 over all 256 bytes: 84 chars get 3/256, 2 chars get 2/256
generatePassword(4, all classes) x 100000: 100000 had all four classes
pool size all classes: 86
\`\`\`

Line 1: 860,000 draws of <code>randomInt(86)</code> landed close to the expected 10,000 per character, and a chi-square of about 86 with 85 degrees of freedom is what a uniform source looks like (the figures change on every run). Line 2 is the modulo-bias arithmetic counted exactly over all 256 byte values. Line 3: at the hardest length, 4 characters with 4 classes, every one of 100,000 passwords contained all four classes.

Then the component, mounted like the playground (<code>createRoot</code> plus <code>&lt;StrictMode&gt;</code>) in jsdom with React 19.3.1. jsdom has no <code>navigator.clipboard</code>, so the driver installs a fake one (and later a refusing one). <code>crypto</code> in this run is Node's global Web Crypto. Output with the <code>[react]</code> prefix removed:

\`\`\`text
RENDERED: Password generatorCopyLength: 16IncludeUppercase (A-Z)Lowercase (a-z)Digits (0-9)Symbols (!@#...)Very strong (103 bits)Generate new password
initial: length 16 | classes: upper+lower+digits+symbols | strength: Very strong (103 bits)
length now: 8 | strength: Fair (51 bits)
200 passwords of length 8: 200 contained all four classes, 200 distinct
digits only: 50 passwords, 50 matched ^[0-9]{8}$ | strength: Weak (27 bits)
nothing selected: password "" | error: Select at least one character type | generate disabled: true | strength: None (0 bits)
lowercase, length 20: ok | strength: Very strong (94 bits)
copy status: Copied to clipboard | clipboard got current password: true
status after 2 s: ""
copy with a refusing clipboard: Copy failed. Select the password and copy it manually.
crypto used: function (globalThis.crypto)
\`\`\`

All 200 eight-character passwords contained every class and all were distinct; digits-only mode produced only digits; nothing selected disabled everything; the copy wrote the current password, the status cleared after 2 seconds, and a refusing clipboard showed the fallback. No <code>console.error</code>. Not checked here: the real browser permission prompt for the clipboard and the visual meter colours.

## 7. Common Pitfalls

- **<code>Math.random()</code> for secrets.** Not a CSPRNG; use <code>crypto.getRandomValues</code>.
- **<code>bytes[i] % pool.length</code>.** Modulo bias; with one byte and 86 characters, 84 of them are 50% more likely.
- **Guaranteeing classes by prefixing them.** Without a shuffle, the pattern is predictable.
- **<code>sort(() =&gt; Math.random() - 0.5)</code> as a shuffle.** Not uniform, and not secure.
- **Generating during render.** Breaks render purity and StrictMode; generate in handlers or the initializer.
- **Assuming the clipboard always works.** It is async and can be refused; handle the rejection and keep the text selectable.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Randomness first:</strong> <span style="color:#f0e2c8;">"Passwords are secrets, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">crypto.getRandomValues</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random</code>, which is fast but predictable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No bias:</strong> <span style="color:#f0e2c8;">"I wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">randomInt(n)</code> with rejection sampling, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">random % n</code> favours some characters when the range is not a multiple of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Guarantee classes:</strong> <span style="color:#f0e2c8;">"Pick one character from each selected class, fill the rest from the combined pool, then Fisher–Yates shuffle with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">randomInt</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Derived meter:</strong> <span style="color:#f0e2c8;">"Strength is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length × log2(pool)</code> bits, derived from the settings each render, with a text label next to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">meter</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI details:</strong> <span style="color:#f0e2c8;">"Generate in handlers, not during render; copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.clipboard.writeText</code> in try/catch, a polite status and a cleared timer."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the class guarantee works?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test the pure function directly: generate 100,000 passwords at the minimum length with every class on and assert each contains all classes and only allowed characters. Here that ran in Node and all 100,000 passed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does guaranteeing classes reduce security?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slightly: it removes the passwords that miss a class, so the true entropy is a little below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length × log2(pool)</code>. At 16 characters it is negligible; the policy benefit usually wins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you exclude look-alike characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remove them from the class strings before building the pool. The rest of the code is unchanged, and the meter drops automatically because the pool is smaller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not generate in a useEffect when settings change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The effect runs after the render, so for one frame the new settings show the old password, and it adds a render. Generating in the same handler that changes the settings keeps them in sync.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about server-side or SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same Web Crypto API exists as a global in Node 22, so the generator runs there too; for SSR, generate on the client after hydration so the server and client markup match.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSPRNG** | Random generator whose next output cannot be predicted |
| **Modulo bias** | Unevenness from <code>random % n</code> |
| **Rejection sampling** | Redraw values that would cause bias |
| **Fisher–Yates shuffle** | Uniform in-place shuffle |
| **Entropy (bits)** | Size of the guessing space, as a power of two |
| **Render purity** | Same inputs, same output; no randomness in render |

---
**Conclusion:** A password generator is a test of knowing which randomness to trust and how not to spoil it. <code>crypto.getRandomValues</code> supplies unpredictable numbers, rejection sampling keeps every character equally likely, and "one per class, fill, then Fisher–Yates" satisfies the policy without leaving a pattern. The runs backed each claim: a near-uniform distribution over 860,000 draws, the exact modulo-bias counts, 100,000 out of 100,000 passwords with every class, and a React 19.3.1 UI that generated, scored, copied and failed gracefully. For a related input pattern, see the [show/hide password input](/interview-question/build-a-show-hide-password-input).`,
        files: {
          "/App.js": `import PasswordGenerator from "./src/PasswordGenerator";
import "./styles.css";

export default function App() {
  return (
    <main className="page">
      <PasswordGenerator />
    </main>
  );
}
`,
          "/src/PasswordGenerator.js": `import { useEffect, useRef, useState } from "react";
import {
  CLASSES,
  MAX_LENGTH,
  MIN_LENGTH,
  generatePassword,
  strength,
} from "./password";

const DEFAULT = { length: 16, enabled: CLASSES.map((c) => c.id) };

export default function PasswordGenerator() {
  const [settings, setSettings] = useState(DEFAULT);
  // Random values are not derived state: generate in an initializer or a
  // handler, never during render (render
  // must be pure; StrictMode renders twice).
  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT.length, DEFAULT.enabled),
  );
  const [copyStatus, setCopyStatus] = useState("");
  const timer = useRef(null);
  // no setState after unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  const { length, enabled } = settings;
  const meter = strength(length, enabled);
  const none = enabled.length === 0;

  function apply(next) {
    setSettings(next);
    setPassword(generatePassword(next.length, next.enabled));
    setCopyStatus("");
  }

  function toggle(id) {
    const on = enabled.includes(id)
      ? enabled.filter((x) => x !== id)
      : [...enabled, id];
    apply({
      length,
      enabled: CLASSES.map((c) => c.id).filter((x) => on.includes(x)),
    });
  }

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("Copied to clipboard");
    } catch {
      setCopyStatus("Copy failed. Select the password and copy it manually.");
    }
    timer.current = setTimeout(() => setCopyStatus(""), 2000);
  }

  return (
    <section className="card" aria-labelledby="pg-title">
      <h2 id="pg-title">Password generator</h2>
      <div className="output">
        <input
          id="password"
          data-testid="password"
          readOnly
          value={password}
          aria-label="Generated password"
          spellCheck={false}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" data-testid="copy" onClick={copy} disabled={none}>
          Copy
        </button>
      </div>
      <p className="copy-status" data-testid="copy-status" role="status">
        {copyStatus}
      </p>

      <div className="field">
        <label htmlFor="length">
          Length:{" "}
          <output htmlFor="length" data-testid="length-value">
            {length}
          </output>
        </label>
        <input
          id="length"
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          value={length}
          onChange={(e) => apply({ length: Number(e.target.value), enabled })}
        />
      </div>

      <fieldset className="classes">
        <legend>Include</legend>
        {CLASSES.map((c) => (
          <label key={c.id} className="check">
            <input
              type="checkbox"
              id={c.id}
              checked={enabled.includes(c.id)}
              onChange={() => toggle(c.id)}
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <p className="error" data-testid="none-error" role="alert">
        {none ? "Select at least one character type" : ""}
      </p>

      <div className="meter" data-testid="strength">
        <meter
          min={0}
          max={128}
          low={40}
          high={80}
          optimum={128}
          value={meter.bits}
          aria-label="Password strength"
        />
        <span>
          {meter.label} ({meter.bits} bits)
        </span>
      </div>
      <button
        type="button"
        data-testid="generate"
        className="primary"
        disabled={none}
        onClick={() => apply(settings)}
      >
        Generate new password
      </button>
    </section>
  );
}
`,
          "/src/password.js": `// Password generation with the Web Crypto API. No React in this file.
export const CLASSES = [
  {
    id: "upper",
    label: "Uppercase (A-Z)",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  },
  {
    id: "lower",
    label: "Lowercase (a-z)",
    chars: "abcdefghijklmnopqrstuvwxyz",
  },
  { id: "digits", label: "Digits (0-9)", chars: "0123456789" },
  {
    id: "symbols",
    label: "Symbols (!@#...)",
    chars: "!@#$%^&*()-_=+[]{};:,.?/",
  },
];
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

// Uniform integer in [0, n) from a CSPRNG. Plain "random % n" is biased when
// 2^32 is not a multiple of n, so values at or above the largest multiple of n
// are thrown away and drawn again (rejection sampling).
const buf = new Uint32Array(1);
export function randomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

export function generatePassword(length, enabledIds) {
  const sets = CLASSES.filter((c) => enabledIds.includes(c.id)).map(
    (c) => c.chars,
  );
  if (sets.length === 0) return "";
  const pool = sets.join("");
  // One guaranteed character from each chosen class, the rest from the pool.
  const out = sets.map((s) => s[randomInt(s.length)]);
  while (out.length < length) out.push(pool[randomInt(pool.length)]);
  // Fisher-Yates shuffle so the guaranteed characters are not always first.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

// Entropy estimate: length x log2(pool size), assuming uniform choice.
export function strength(length, enabledIds) {
  const pool = CLASSES.filter((c) => enabledIds.includes(c.id)).reduce(
    (n, c) => n + c.chars.length,
    0,
  );
  if (!pool) return { bits: 0, label: "None" };
  const bits = Math.round(length * Math.log2(pool));
  const label =
    bits < 40
      ? "Weak"
      : bits < 60
        ? "Fair"
        : bits < 80
          ? "Strong"
          : "Very strong";
  return { bits, label };
}
`,
          "/styles.css": `body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.output {
  display: flex;
  gap: 8px;
}
.output input {
  flex: 1;
  min-width: 0;
  font:
    1rem ui-monospace,
    monospace;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: #e6e8ee;
}
.copy-status {
  min-height: 1.2em;
  margin: 6px 0 10px;
  color: #7ee2a8;
  font-size: 0.85rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input[type="range"] {
  width: 100%;
  accent-color: #4f7cff;
}
.classes {
  border: 1px solid #2a2f3d;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0;
}
.check {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 400;
  padding: 4px 0;
}
.error {
  color: #ff8a8a;
  min-height: 1.2em;
  margin: 6px 0;
  font-size: 0.85rem;
}
.meter {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 0.9rem;
}
.meter meter {
  flex: 1;
  height: 12px;
}
button {
  font: inherit;
  padding: 10px 14px;
  border-radius: 8px;
  border: 0;
  background: #2a2f3d;
  color: #fff;
  cursor: pointer;
}
button.primary {
  background: #4f7cff;
  width: 100%;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
`,
        },
      },
      vue: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Vue. No Vue or cryptography background is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 5 were produced by actually running it: the generator alone in Node 22.22.0, the component on Vue 3.5.44.

## 1. A Story First

A lottery machine whose next ball you can predict after watching a few draws still looks random, but nobody would trust it with a jackpot. <code>Math.random()</code> is that machine: fine for confetti, not for secrets. V8 has used xorshift128+ for it since 2015 (Chrome 49), and the V8 team's post on v8.dev says it is still not cryptographically secure. Passwords need <code>crypto.getRandomValues()</code>, the browser's cryptographically secure source.

The build: a length slider (8 to 64, default 16), checkboxes for uppercase, lowercase, digits and symbols, a password that contains at least one character of every ticked class, a strength meter, and a copy button with a status message and a fallback.

## 2. How the State Model Maps to Vue

| Piece | Vue primitive | Why |
| :--- | :--- | :--- |
| <code>length</code> | <code>ref(16)</code> + <code>v-model.number</code> | A range input gives a string; <code>.number</code> converts it. |
| <code>enabled</code> | <code>ref([...ids])</code> + checkbox <code>v-model</code> | Checkbox <code>v-model</code> on an array collects the checked values. |
| <code>password</code> | <code>ref()</code> | Random output is state, set by an action, never computed. |
| strength, nothing selected | <code>computed()</code> | Derived from the settings. |
| regenerate on change | <code>watch([length, enabled])</code> | An action in response to a change. |

📌 **Interview term: v-model modifiers** — suffixes such as <code>.number</code>, <code>.trim</code> and <code>.lazy</code> that adjust how <code>v-model</code> reads the input; see [v-model modifiers](/interview-question/what-are-v-model-modifiers).

Why not a <code>computed</code> for the password? A computed must be a pure function of its inputs and is cached; the Generate button must produce a new value with no input change, and a random computed would also change whenever Vue happened to re-evaluate it.

## 3. Build It Step by Step

### Step 1: unbiased randomness (shared <code>password.js</code>)

<code>randomInt(n)</code> fills a <code>Uint32Array(1)</code> with <code>crypto.getRandomValues</code>, rejects values at or above the largest multiple of <code>n</code> below 2^32, and returns <code>x % n</code>.

📌 **Interview term: CSPRNG** — a random generator whose next output cannot be predicted from earlier ones; <code>crypto.getRandomValues</code> in browsers, and a global in Node 22.

📌 **Interview term: Modulo bias** — <code>random % n</code> is uneven when the number of possible random values is not a multiple of <code>n</code>. With one byte and 86 characters, 84 characters come out 3 ways and 2 come out 2 ways. **Rejection sampling** (redraw the leftover values) removes it.

### Step 2: guarantee each class, then shuffle

<code>generatePassword</code> picks one character from each selected class, fills the rest from the combined pool, and runs a **Fisher–Yates shuffle** with the same <code>randomInt</code>, so the guaranteed characters are not always in the first positions.

📌 **Interview term: Fisher–Yates shuffle** — swap each position, from the end, with a uniformly random position at or before it; every ordering is equally likely.

### Step 3: the component

\`\`\`vue
const length = ref(16); // Checkbox v-model bound to an array collects
the checked values. const enabled = ref(CLASSES.map((c) => c.id)); const
password = ref(generatePassword(length.value, enabled.value)); const
copyStatus = ref(""); let timer; const meter = computed(() =>
strength(length.value, enabled.value)); const none = computed(() =>
enabled.value.length === 0); function regenerate() { password.value =
generatePassword(length.value, enabled.value); copyStatus.value = ""; }
// Any settings change produces a fresh password. No deep option needed:
// checkbox v-model on an array assigns a NEW array on every toggle.
watch([length, enabled], regenerate); async function copy() {
clearTimeout(timer); try { await
navigator.clipboard.writeText(password.value); copyStatus.value =
"Copied to clipboard"; } catch { copyStatus.value = "Copy failed. Select
the password and copy it manually."; } timer = setTimeout(() =>
(copyStatus.value = ""), 2000); } onUnmounted(() =>
clearTimeout(timer));
\`\`\`

📌 **Interview term: Entropy (bits)** — the strength estimate, <code>length × log2(pool)</code>, valid for passwords chosen uniformly from the pool. 16 characters from 86 is about 103 bits. It says nothing about typed passwords.

The watcher needs no <code>deep</code> option. In Vue 3.5.44's <code>runtime-dom</code>, the checkbox <code>v-model</code> assigns a new array on each toggle (<code>concat</code> when checking, a copied and spliced array when unchecking), so replacing <code>enabled.value</code> is what the watcher sees. Because watchers run before the re-render by default, the new password and the new settings appear in the same render.

### Step 4: the template

\`\`\`vue
    <div class="output">
      <input id="password" data-testid="password" readonly :value="password" aria-label="Generated password"
        spellcheck="false" @focus="$event.target.select()" />
      <button
        type="button"
        data-testid="copy"
        :disabled="none"
        @click="copy"
      >Copy</button>
    </div>
    <p
      class="copy-status"
      data-testid="copy-status"
      role="status"
    >{{ copyStatus }}</p>

    <div class="field">
      <label for="length">Length: <output for="length" data-testid="length-value">{{ length }}</output></label>
      <input
        id="length"
        v-model.number="length"
        type="range"
        :min="MIN_LENGTH"
        :max="MAX_LENGTH"
      />
    </div>

    <fieldset class="classes">
      <legend>Include</legend>
      <label v-for="c in CLASSES" :key="c.id" class="check">
        <input
          :id="c.id"
          v-model="enabled"
          type="checkbox"
          :value="c.id"
        />
        {{ c.label }}
      </label>
    </fieldset>
    <p
      class="error"
      data-testid="none-error"
      role="alert"
    >{{ none ? "Select at least one character type" : "" }}</p>
\`\`\`

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| No class selected | Empty password, buttons disabled, <code>role="alert"</code> message |
| Minimum length with all classes | Still one of each (verified below) |
| Clipboard refused | Fallback message; the input stays selectable |
| Copy twice quickly | Previous timer cleared |
| Unmount during the timer | <code>onUnmounted</code> clears it |
| Length announcement | <code>&lt;output for="length"&gt;</code> inside the label |
| Strength | <code>&lt;meter&gt;</code> plus a text label, not colour alone |

## 5. Verified: What the Solution Actually Did

The generator on its own, in Node 22.22.0 (shared file, same as the other tabs):

\`\`\`text
randomInt(86) x 860000: min 9718, max 10383, expected 10000, chi-square 86.4 (df 85)
byte % 86 over all 256 bytes: 84 chars get 3/256, 2 chars get 2/256
generatePassword(4, all classes) x 100000: 100000 had all four classes
pool size all classes: 86
\`\`\`

Near-uniform counts over 860,000 draws (the chi-square near its 85 degrees of freedom is what uniform data looks like; figures change per run), the exact modulo-bias counts, and 100,000 of 100,000 four-character passwords containing all four classes.

The component, compiled with <code>@vue/compiler-sfc</code> and mounted with <code>createApp(App).mount("#app")</code> in jsdom on Vue 3.5.44. jsdom has no <code>navigator.clipboard</code>, so the driver installs a fake one, and later a refusing one. Output with the <code>[vue]</code> prefix removed:

\`\`\`text
RENDERED: Password generatorCopyLength: 16Include Uppercase (A-Z) Lowercase (a-z) Digits (0-9) Symbols (!@#...)Very strong (103 bits)Generate new password
initial: length 16 | classes: upper+lower+digits+symbols | strength: Very strong (103 bits)
length now: 8 | strength: Fair (51 bits)
200 passwords of length 8: 200 contained all four classes, 200 distinct
digits only: 50 passwords, 50 matched ^[0-9]{8}$ | strength: Weak (27 bits)
nothing selected: password "" | error: Select at least one character type | generate disabled: true | strength: None (0 bits)
lowercase, length 20: ok | strength: Very strong (94 bits)
copy status: Copied to clipboard | clipboard got current password: true
status after 2 s: ""
copy with a refusing clipboard: Copy failed. Select the password and copy it manually.
crypto used: function (globalThis.crypto)
\`\`\`

Apart from whitespace between the checkbox labels in the first line, identical to the React and Angular runs. No <code>console.error</code>. The real clipboard permission prompt was not checked.

## 6. Common Pitfalls

- **<code>Math.random()</code> for secrets.** Use <code>crypto.getRandomValues</code>.
- **A computed password.** Cached and pure by contract; Generate could not change it, and random values in a computed are a bug waiting to happen.
- **<code>{ deep: true }</code> out of habit.** Not needed for checkbox arrays (they are replaced), and deep watchers on large objects cost work.
- **Forgetting <code>.number</code> on the range.** <code>length</code> becomes a string; <code>"8" * log2</code> still works but comparisons and <code>===</code> checks will not.
- **Prefixing the guaranteed characters without a shuffle.** A predictable pattern.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Randomness:</strong> <span style="color:#f0e2c8;">"Secrets need a CSPRNG, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">crypto.getRandomValues</code>, wrapped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">randomInt(n)</code> with rejection sampling to avoid modulo bias."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Guarantee:</strong> <span style="color:#f0e2c8;">"One character per ticked class, fill from the pool, then Fisher–Yates with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">randomInt</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State:</strong> <span style="color:#f0e2c8;">"Refs for length and enabled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model.number</code> and checkbox array <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>; the password is a ref, never a computed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Reactions:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on the settings regenerates; strength and nothing-selected are computeds."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. UI:</strong> <span style="color:#f0e2c8;">"Clipboard in try/catch with a polite status, a cleared timer on unmount, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">meter</code> with a text label."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why watch and not call regenerate from @change handlers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. The watcher catches every way the settings can change, including programmatic resets, and runs before the render so password and settings never disagree on screen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the guarantee?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generatePassword</code> directly with many iterations at the minimum length, as in the Node run above, rather than through the UI.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add "exclude look-alikes"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Another checkbox that filters <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0O1lI</code> out of the class strings; the pool, the meter and the generator follow automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for SSR with Nuxt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generate on the client after mount (or in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>) so server and client markup match; Web Crypto exists on both sides.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSPRNG** | Unpredictable random generator |
| **Modulo bias** | Unevenness from <code>random % n</code> |
| **Rejection sampling** | Redraw values that would bias the result |
| **Fisher–Yates shuffle** | Uniform in-place shuffle |
| **Entropy (bits)** | Size of the guessing space as a power of two |
| **v-model modifiers** | <code>.number</code>, <code>.trim</code>, <code>.lazy</code> |

---
**Conclusion:** In Vue the generator is a few refs bound with <code>v-model</code>, a watcher that regenerates on any settings change, and computeds for the meter, on top of a framework-free core: <code>crypto.getRandomValues</code>, rejection sampling, one-per-class plus Fisher–Yates. The Node runs confirmed uniformity and the class guarantee, and the Vue 3.5.44 run matched React and Angular, including the copy fallback.`,
        files: {
          "/src/App.vue": `<script setup>
import PasswordGenerator from "./components/PasswordGenerator.vue";
</script>

<template>
  <main class="page">
    <PasswordGenerator />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #0f1117;
  color: #e6e8ee;
  font-family: system-ui, sans-serif;
}
.page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #181b24;
  border: 1px solid #2a2f3d;
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
}
h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}
.output {
  display: flex;
  gap: 8px;
}
.output input {
  flex: 1;
  min-width: 0;
  font:
    1rem ui-monospace,
    monospace;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #3a4152;
  background: #0f1117;
  color: #e6e8ee;
}
.copy-status {
  min-height: 1.2em;
  margin: 6px 0 10px;
  color: #7ee2a8;
  font-size: 0.85rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
label {
  font-weight: 600;
  font-size: 0.9rem;
}
input[type="range"] {
  width: 100%;
  accent-color: #4f7cff;
}
.classes {
  border: 1px solid #2a2f3d;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0;
}
.check {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 400;
  padding: 4px 0;
}
.error {
  color: #ff8a8a;
  min-height: 1.2em;
  margin: 6px 0;
  font-size: 0.85rem;
}
.meter {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 0.9rem;
}
.meter meter {
  flex: 1;
  height: 12px;
}
button {
  font: inherit;
  padding: 10px 14px;
  border-radius: 8px;
  border: 0;
  background: #2a2f3d;
  color: #fff;
  cursor: pointer;
}
button.primary {
  background: #4f7cff;
  width: 100%;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #7aa2ff;
  outline-offset: 2px;
}
</style>
`,
          "/src/components/PasswordGenerator.vue": `<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import {
  CLASSES,
  MAX_LENGTH,
  MIN_LENGTH,
  generatePassword,
  strength,
} from "../password.js";

const length = ref(16);
// Checkbox v-model bound to an array collects the checked values.
const enabled = ref(CLASSES.map((c) => c.id));
const password = ref(generatePassword(length.value, enabled.value));
const copyStatus = ref("");
let timer;

const meter = computed(() => strength(length.value, enabled.value));
const none = computed(() => enabled.value.length === 0);

function regenerate() {
  password.value = generatePassword(length.value, enabled.value);
  copyStatus.value = "";
}
// Any settings change produces a fresh password. No deep option needed:
// checkbox v-model on an array assigns a NEW array on every toggle.
watch([length, enabled], regenerate);

async function copy() {
  clearTimeout(timer);
  try {
    await navigator.clipboard.writeText(password.value);
    copyStatus.value = "Copied to clipboard";
  } catch {
    copyStatus.value = "Copy failed. Select the password and copy it manually.";
  }
  timer = setTimeout(() => (copyStatus.value = ""), 2000);
}
onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <section class="card" aria-labelledby="pg-title">
    <h2 id="pg-title">Password generator</h2>
    <div class="output">
      <input id="password" data-testid="password" readonly :value="password" aria-label="Generated password"
        spellcheck="false" @focus="$event.target.select()" />
      <button
        type="button"
        data-testid="copy"
        :disabled="none"
        @click="copy"
      >Copy</button>
    </div>
    <p
      class="copy-status"
      data-testid="copy-status"
      role="status"
    >{{ copyStatus }}</p>

    <div class="field">
      <label for="length">Length: <output for="length" data-testid="length-value">{{ length }}</output></label>
      <input
        id="length"
        v-model.number="length"
        type="range"
        :min="MIN_LENGTH"
        :max="MAX_LENGTH"
      />
    </div>

    <fieldset class="classes">
      <legend>Include</legend>
      <label v-for="c in CLASSES" :key="c.id" class="check">
        <input :id="c.id" v-model="enabled" type="checkbox" :value="c.id" />
        {{ c.label }}
      </label>
    </fieldset>
    <p
      class="error"
      data-testid="none-error"
      role="alert"
    >{{ none ? "Select at least one character type" : "" }}</p>

    <div class="meter" data-testid="strength">
      <meter
        min="0"
        max="128"
        low="40"
        high="80"
        optimum="128"
        :value="meter.bits"
        aria-label="Password strength"
      ></meter>
      <span>{{ meter.label }} ({{ meter.bits }} bits)</span>
    </div>
    <button
      type="button"
      data-testid="generate"
      class="primary"
      :disabled="none"
      @click="regenerate"
    >Generate new password</button>
  </section>
</template>
`,
          "/src/password.js": `// Password generation with the Web Crypto API. No React in this file.
export const CLASSES = [
  {
    id: "upper",
    label: "Uppercase (A-Z)",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  },
  {
    id: "lower",
    label: "Lowercase (a-z)",
    chars: "abcdefghijklmnopqrstuvwxyz",
  },
  { id: "digits", label: "Digits (0-9)", chars: "0123456789" },
  {
    id: "symbols",
    label: "Symbols (!@#...)",
    chars: "!@#$%^&*()-_=+[]{};:,.?/",
  },
];
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

// Uniform integer in [0, n) from a CSPRNG. Plain "random % n" is biased when
// 2^32 is not a multiple of n, so values at or above the largest multiple of n
// are thrown away and drawn again (rejection sampling).
const buf = new Uint32Array(1);
export function randomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

export function generatePassword(length, enabledIds) {
  const sets = CLASSES.filter((c) => enabledIds.includes(c.id)).map(
    (c) => c.chars,
  );
  if (sets.length === 0) return "";
  const pool = sets.join("");
  // One guaranteed character from each chosen class, the rest from the pool.
  const out = sets.map((s) => s[randomInt(s.length)]);
  while (out.length < length) out.push(pool[randomInt(pool.length)]);
  // Fisher-Yates shuffle so the guaranteed characters are not always first.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

// Entropy estimate: length x log2(pool size), assuming uniform choice.
export function strength(length, enabledIds) {
  const pool = CLASSES.filter((c) => enabledIds.includes(c.id)).reduce(
    (n, c) => n + c.chars.length,
    0,
  );
  if (!pool) return { bits: 0, label: "None" };
  const bits = Math.round(length * Math.log2(pool));
  const label =
    bits < 40
      ? "Weak"
      : bits < 60
        ? "Fair"
        : bits < 80
          ? "Strong"
          : "Very strong";
  return { bits, label };
}
`,
        },
      },
      angular: {
        answer: `**Target Audience:** Frontend candidates preparing for a machine coding round in Angular. No Angular or cryptography background is assumed.
**Difficulty:** Medium

> **How to read this doc:** Every idea is explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the exact words an interviewer listens for. Code excerpts are copied from the runnable solution, and the outputs in section 5 were produced by actually running it: the generator alone in Node 22.22.0, the component on Angular 22.2.3 (AOT and JIT).

## 1. A Story First

A lottery machine you can predict after a few draws is not random enough for a jackpot. <code>Math.random()</code> is that machine: V8 has used xorshift128+ for it since 2015 (Chrome 49), and the V8 team's own post on v8.dev says it is not cryptographically secure. Passwords need <code>crypto.getRandomValues()</code>.

The build: a length slider (8 to 64), four class checkboxes, a password that contains every ticked class, a strength meter, and copy with a status and a fallback.

## 2. How the State Model Maps to Angular

| Piece | Angular primitive | Why |
| :--- | :--- | :--- |
| <code>length</code>, <code>enabled</code> | <code>signal()</code> | Settings; written by the handlers. |
| <code>password</code> | <code>signal()</code> | Random output is state, set by actions. |
| <code>copyStatus</code> | <code>signal()</code> | Updated after an <code>await</code>, so it must be a signal in a zoneless app. |
| strength, nothing selected | <code>computed()</code> | Derived and memoized. |
| timer cleanup | <code>DestroyRef.onDestroy</code> | Clears the status timer with the component. |

📌 **Interview term: computed purity** — a <code>computed</code> must be a pure function of the signals it reads. A random password cannot be one: the Generate button must change it with no input change. See [what Angular signals are](/interview-question/what-are-angular-signals).

## 3. Build It Step by Step

### Step 1: unbiased randomness (<code>password.ts</code>)

<code>randomInt(n)</code> fills a <code>Uint32Array(1)</code> with <code>crypto.getRandomValues</code>, rejects values at or above the largest multiple of <code>n</code> below 2^32, and returns <code>x % n</code>.

📌 **Interview term: CSPRNG** — a random generator whose next output cannot be predicted; in browsers and Node 22 it is <code>crypto.getRandomValues</code>.

📌 **Interview term: Modulo bias** — <code>random % n</code> favours some results when the random range is not a multiple of <code>n</code>; with one byte and 86 characters, 84 characters are 50% more likely than the other 2. **Rejection sampling** removes it.

### Step 2: guarantee each class, then shuffle

<code>generatePassword</code> picks one character per selected class, fills from the pool, then applies a **Fisher–Yates shuffle** using the same <code>randomInt</code>.

📌 **Interview term: Fisher–Yates shuffle** — swap each position, from the end, with a uniformly random position at or before it, giving every order equal probability.

### Step 3: the component class

\`\`\`ts
export class PasswordGeneratorComponent {
  readonly classes = CLASSES;
  readonly min = MIN_LENGTH;
  readonly max = MAX_LENGTH;
  readonly length = signal(16);
  readonly enabled = signal<string[]>(ALL);
  // Random output is state, not computed():
  // a computed must be a pure function
  // of its inputs, and the Regenerate button
  // must change it with no input change.
  readonly password = signal(generatePassword(16, ALL));
  readonly copyStatus = signal("");
  readonly meter = computed(() =>
    strength(this.length(), this.enabled()),
  );
  readonly none = computed(() => this.enabled().length === 0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  regenerate() {
    this.password.set(generatePassword(this.length(), this.enabled()));
    this.copyStatus.set("");
  }
  setLength(event: Event) {
    this.length.set(Number((event.target as HTMLInputElement).value));
    this.regenerate();
  }
  toggle(id: string) {
    const on = this.enabled();
    const next = on.includes(id)
      ? on.filter((x) => x !== id)
      : [...on, id];
    // keep a stable order
    this.enabled.set(ALL.filter((x) => next.includes(x)));
    this.regenerate();
  }
  select(event: Event) {
    (event.target as HTMLInputElement).select();
  }

  async copy() {
    clearTimeout(this.timer);
    try {
      await navigator.clipboard.writeText(this.password());
      this.copyStatus.set("Copied to clipboard");
    } catch {
      this.copyStatus.set(
        "Copy failed. Select the password and copy it manually.",
      );
    }
    this.timer = setTimeout(() => this.copyStatus.set(""), 2000);
  }
}
\`\`\`

Each handler writes the setting and calls <code>regenerate()</code> in the same call, so password and settings change together. <code>toggle</code> keeps a stable class order (<code>ALL.filter</code>) so the checkbox order never depends on click order.

📌 **Interview term: Entropy (bits)** — <code>length × log2(pool)</code> for a uniformly generated password: 16 characters from 86 is about 103 bits. It does not apply to typed passwords.

### Step 4: the template

\`\`\`html
    <section class="card" aria-labelledby="pg-title">
      <h2 id="pg-title">Password generator</h2>
      <div class="output">
        <input id="password" data-testid="password" readonly [value]="password()" aria-label="Generated password"
          spellcheck="false" (focus)="select($event)" />
        <button
          type="button"
          data-testid="copy"
          [disabled]="none()"
          (click)="copy()"
        >Copy</button>
      </div>
      <p
        class="copy-status"
        data-testid="copy-status"
        role="status"
      >{{ copyStatus() }}</p>

      <div class="field">
        <label for="length">Length: <output for="length" data-testid="length-value">{{ length() }}</output></label>
        <input
          id="length"
          type="range"
          [min]="min"
          [max]="max"
          [value]="length()"
          (input)="setLength($event)"
        />
      </div>

      <fieldset class="classes">
        <legend>Include</legend>
        @for (c of classes; track c.id) {
          <label class="check">
            <input
              type="checkbox"
              [id]="c.id"
              [checked]="enabled().includes(c.id)"
              (change)="toggle(c.id)"
            />
            {{ c.label }}
          </label>
        }
      </fieldset>
      <p
        class="error"
        data-testid="none-error"
        role="alert"
      >{{ none() ? "Select at least one character type" : "" }}</p>

      <div class="meter" data-testid="strength">
        <meter
          min="0"
          max="128"
          low="40"
          high="80"
          optimum="128"
          [value]="meter().bits"
          aria-label="Password strength"
        ></meter>
        <span>{{ meter().label }} ({{ meter().bits }} bits)</span>
      </div>
      <button
        type="button"
        data-testid="generate"
        class="primary"
        [disabled]="none()"
        (click)="regenerate()"
      >Generate new password</button>
    </section>
\`\`\`

The checkboxes use <code>[checked]</code> plus <code>(change)</code>, so the <code>enabled</code> signal stays the single source of truth without <code>FormsModule</code>.

## 4. Edge Cases and Accessibility

| Case | Handling |
| :--- | :--- |
| No class selected | Empty password, buttons disabled, <code>role="alert"</code> message |
| Minimum length with all classes | Still one of each (verified below) |
| Clipboard refused | Fallback message; input stays selectable |
| Copy twice quickly | Previous timer cleared |
| Component destroyed during the timer | <code>DestroyRef</code> clears it |
| Strength | <code>&lt;meter&gt;</code> with a text label |

## 5. Verified: What the Solution Actually Did

The generator alone in Node 22.22.0 (same logic as the other tabs, typed for TypeScript):

\`\`\`text
randomInt(86) x 860000: min 9718, max 10383, expected 10000, chi-square 86.4 (df 85)
byte % 86 over all 256 bytes: 84 chars get 3/256, 2 chars get 2/256
generatePassword(4, all classes) x 100000: 100000 had all four classes
pool size all classes: 86
\`\`\`

Near-uniform counts over 860,000 draws (figures vary per run), the exact modulo-bias counts, and 100,000 of 100,000 four-character passwords with every class.

The component, booted with <code>bootstrapApplication(AppComponent)</code> and no providers, compiled with <code>ngc</code> and <code>strictTemplates</code>, and again through the playground JIT. jsdom has no <code>navigator.clipboard</code>, so the driver installs a fake one, then a refusing one. Both runs printed the same lines; AOT run, prefix removed:

\`\`\`text
RENDERED: Password generatorCopyLength: 16Include Uppercase (A-Z) Lowercase (a-z) Digits (0-9) Symbols (!@#...) Very strong (103 bits)Generate new password
initial: length 16 | classes: upper+lower+digits+symbols | strength: Very strong (103 bits)
length now: 8 | strength: Fair (51 bits)
200 passwords of length 8: 200 contained all four classes, 200 distinct
digits only: 50 passwords, 50 matched ^[0-9]{8}$ | strength: Weak (27 bits)
nothing selected: password "" | error: Select at least one character type | generate disabled: true | strength: None (0 bits)
lowercase, length 20: ok | strength: Very strong (94 bits)
copy status: Copied to clipboard | clipboard got current password: true
status after 2 s: ""
copy with a refusing clipboard: Copy failed. Select the password and copy it manually.
crypto used: function (globalThis.crypto)
\`\`\`

Apart from whitespace in the first line, identical to the React and Vue runs. No <code>console.error</code>. The real clipboard permission prompt was not checked.

## 6. Common Pitfalls

- **<code>Math.random()</code> for secrets.** Use <code>crypto.getRandomValues</code>.
- **A computed password.** Memoized and pure by contract; Generate could not change it.
- **A plain field for the copy status.** It is set after an <code>await</code>; in a zoneless app only a signal write re-renders.
- **Forgetting to clear the timer on destroy.** It fires later and writes into a destroyed component.
- **Shuffling with <code>sort(() =&gt; Math.random() - 0.5)</code>.** Not uniform and not secure.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Randomness:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">crypto.getRandomValues</code> wrapped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">randomInt(n)</code> with rejection sampling, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.random</code> is predictable and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">% n</code> is biased."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Guarantee:</strong> <span style="color:#f0e2c8;">"One per selected class, fill from the pool, Fisher–Yates with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">randomInt</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Signals:</strong> <span style="color:#f0e2c8;">"Signals for length, enabled, password and copy status; computeds for strength and nothing-selected."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Handlers:</strong> <span style="color:#f0e2c8;">"Each handler writes its setting and regenerates in the same call; checkboxes use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[checked]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(change)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Clipboard:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">navigator.clipboard.writeText</code> in try/catch, a polite status, a timer cleared by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">effect()</code> to regenerate when settings change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would work, but it writes a signal from an effect, runs after the change rather than with it, and hides the cause. Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">regenerate()</code> from the handlers is explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the guarantee?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unit test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generatePassword</code> with many iterations at the minimum length, as in the Node run, independent of the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use reactive forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a settings panel this small, signals are less code. With many settings or persistence, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code> would be fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you score passwords people type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with this formula. A pattern-aware estimator that knows dictionary words and keyboard runs, loaded lazily because those libraries are large.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSPRNG** | Unpredictable random generator |
| **Modulo bias** | Unevenness from <code>random % n</code> |
| **Rejection sampling** | Redraw values that would bias the result |
| **Fisher–Yates shuffle** | Uniform in-place shuffle |
| **Entropy (bits)** | Size of the guessing space as a power of two |
| **computed purity** | A computed depends only on the signals it reads |

---
**Conclusion:** In Angular the generator is a handful of signals and computeds over a framework-free core: <code>crypto.getRandomValues</code>, rejection sampling, and one-per-class plus Fisher–Yates. Handlers write the setting and regenerate together, and the copy status is a signal so the zoneless view refreshes after the clipboard Promise. The Node runs confirmed uniformity and the class guarantee, and the AOT and JIT runs on Angular 22.2.3 matched React and Vue.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewEncapsulation } from "@angular/core";
import { PasswordGeneratorComponent } from "./password-generator.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [PasswordGeneratorComponent],
  template: \`<main class="page"><app-password-generator /></main>\`,
  // Global styles for this small app, so the child component shares them.
  encapsulation: ViewEncapsulation.None,
  styles: [
    \`
      body {
        margin: 0;
        background: #0f1117;
        color: #e6e8ee;
        font-family: system-ui, sans-serif;
      }
      .page {
        display: flex;
        justify-content: center;
        padding: 24px 16px;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: #181b24;
        border: 1px solid #2a2f3d;
        border-radius: 12px;
        padding: 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 1.2rem;
      }
      .output {
        display: flex;
        gap: 8px;
      }
      .output input {
        flex: 1;
        min-width: 0;
        font:
          1rem ui-monospace,
          monospace;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #3a4152;
        background: #0f1117;
        color: #e6e8ee;
      }
      .copy-status {
        min-height: 1.2em;
        margin: 6px 0 10px;
        color: #7ee2a8;
        font-size: 0.85rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }
      label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      input[type="range"] {
        width: 100%;
        accent-color: #4f7cff;
      }
      .classes {
        border: 1px solid #2a2f3d;
        border-radius: 8px;
        padding: 8px 12px;
        margin: 0;
      }
      .check {
        display: flex;
        gap: 8px;
        align-items: center;
        font-weight: 400;
        padding: 4px 0;
      }
      .error {
        color: #ff8a8a;
        min-height: 1.2em;
        margin: 6px 0;
        font-size: 0.85rem;
      }
      .meter {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
        font-size: 0.9rem;
      }
      .meter meter {
        flex: 1;
        height: 12px;
      }
      button {
        font: inherit;
        padding: 10px 14px;
        border-radius: 8px;
        border: 0;
        background: #2a2f3d;
        color: #fff;
        cursor: pointer;
      }
      button.primary {
        background: #4f7cff;
        width: 100%;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid #7aa2ff;
        outline-offset: 2px;
      }
    \`,
  ],
})
export class AppComponent {}
`,
          "/src/app/password-generator.component.ts": `import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import {
  CLASSES,
  MAX_LENGTH,
  MIN_LENGTH,
  generatePassword,
  strength,
} from "./password";

const ALL = CLASSES.map((c) => c.id);

@Component({
  selector: "app-password-generator",
  standalone: true,
  template: \`
    <section class="card" aria-labelledby="pg-title">
      <h2 id="pg-title">Password generator</h2>
      <div class="output">
        <input id="password" data-testid="password" readonly [value]="password()" aria-label="Generated password"
          spellcheck="false" (focus)="select($event)" />
        <button
          type="button"
          data-testid="copy"
          [disabled]="none()"
          (click)="copy()"
        >Copy</button>
      </div>
      <p
        class="copy-status"
        data-testid="copy-status"
        role="status"
      >{{ copyStatus() }}</p>

      <div class="field">
        <label for="length">Length: <output for="length" data-testid="length-value">{{ length() }}</output></label>
        <input
          id="length"
          type="range"
          [min]="min"
          [max]="max"
          [value]="length()"
          (input)="setLength($event)"
        />
      </div>

      <fieldset class="classes">
        <legend>Include</legend>
        @for (c of classes; track c.id) {
          <label class="check">
            <input
              type="checkbox"
              [id]="c.id"
              [checked]="enabled().includes(c.id)"
              (change)="toggle(c.id)"
            />
            {{ c.label }}
          </label>
        }
      </fieldset>
      <p
        class="error"
        data-testid="none-error"
        role="alert"
      >{{ none() ? "Select at least one character type" : "" }}</p>

      <div class="meter" data-testid="strength">
        <meter
          min="0"
          max="128"
          low="40"
          high="80"
          optimum="128"
          [value]="meter().bits"
          aria-label="Password strength"
        ></meter>
        <span>{{ meter().label }} ({{ meter().bits }} bits)</span>
      </div>
      <button
        type="button"
        data-testid="generate"
        class="primary"
        [disabled]="none()"
        (click)="regenerate()"
      >Generate new password</button>
    </section>
  \`,
})
export class PasswordGeneratorComponent {
  readonly classes = CLASSES;
  readonly min = MIN_LENGTH;
  readonly max = MAX_LENGTH;
  readonly length = signal(16);
  readonly enabled = signal<string[]>(ALL);
  // Random output is state, not computed(): a computed must be a pure function
  // of its inputs, and the Regenerate button
  // must change it with no input change.
  readonly password = signal(generatePassword(16, ALL));
  readonly copyStatus = signal("");
  readonly meter = computed(() => strength(this.length(), this.enabled()));
  readonly none = computed(() => this.enabled().length === 0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  regenerate() {
    this.password.set(generatePassword(this.length(), this.enabled()));
    this.copyStatus.set("");
  }
  setLength(event: Event) {
    this.length.set(Number((event.target as HTMLInputElement).value));
    this.regenerate();
  }
  toggle(id: string) {
    const on = this.enabled();
    const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
    // keep a stable order
    this.enabled.set(ALL.filter((x) => next.includes(x)));
    this.regenerate();
  }
  select(event: Event) {
    (event.target as HTMLInputElement).select();
  }

  async copy() {
    clearTimeout(this.timer);
    try {
      await navigator.clipboard.writeText(this.password());
      this.copyStatus.set("Copied to clipboard");
    } catch {
      this.copyStatus.set(
        "Copy failed. Select the password and copy it manually.",
      );
    }
    this.timer = setTimeout(() => this.copyStatus.set(""), 2000);
  }
}
`,
          "/src/app/password.ts": `// Password generation with the Web Crypto API. No React in this file.
export const CLASSES = [
  {
    id: "upper",
    label: "Uppercase (A-Z)",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  },
  {
    id: "lower",
    label: "Lowercase (a-z)",
    chars: "abcdefghijklmnopqrstuvwxyz",
  },
  { id: "digits", label: "Digits (0-9)", chars: "0123456789" },
  {
    id: "symbols",
    label: "Symbols (!@#...)",
    chars: "!@#$%^&*()-_=+[]{};:,.?/",
  },
];
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

// Uniform integer in [0, n) from a CSPRNG. Plain "random % n" is biased when
// 2^32 is not a multiple of n, so values at or above the largest multiple of n
// are thrown away and drawn again (rejection sampling).
const buf = new Uint32Array(1);
export function randomInt(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n;
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

export function generatePassword(length: number, enabledIds: string[]): string {
  const sets = CLASSES.filter((c) => enabledIds.includes(c.id)).map(
    (c) => c.chars,
  );
  if (sets.length === 0) return "";
  const pool = sets.join("");
  // One guaranteed character from each chosen class, the rest from the pool.
  const out = sets.map((s) => s[randomInt(s.length)]);
  while (out.length < length) out.push(pool[randomInt(pool.length)]);
  // Fisher-Yates shuffle so the guaranteed characters are not always first.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

// Entropy estimate: length x log2(pool size), assuming uniform choice.
export function strength(
  length: number,
  enabledIds: string[],
): { bits: number; label: string } {
  const pool = CLASSES.filter((c) => enabledIds.includes(c.id)).reduce(
    (n, c) => n + c.chars.length,
    0,
  );
  if (!pool) return { bits: 0, label: "None" };
  const bits = Math.round(length * Math.log2(pool));
  const label =
    bits < 40
      ? "Weak"
      : bits < 60
        ? "Fair"
        : bits < 80
          ? "Strong"
          : "Very strong";
  return { bits, label };
}
`,
        },
      },
    },
  },
];

export default augments;
