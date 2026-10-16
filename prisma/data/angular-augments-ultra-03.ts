/**
 * Angular ULTRA — batch 03: lifecycle hooks, render hooks, queries, host
 * bindings and DOM references (ngOnChanges, the full hook order,
 * afterEveryRender / afterNextRender vs ngAfterViewInit, @ViewChild /
 * @ContentChild / @ViewChildren and the signal queries, @HostListener /
 * @HostBinding vs the host property, ElementRef / TemplateRef /
 * ViewContainerRef, Renderer2).
 *
 * Full CLAUDE.md treatment per question, matching the React and Next.js ultra
 * banks: a plain-language story first, `📌 Interview term:` callouts, a
 * Verified section quoting output that was actually produced, a theme-aware
 * `.iq-diagram` SVG, comparison tables, topic-specific pitfalls, the §7
 * "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Picked up by `npm run augment:ng`. Sorts after angular-augments-{1,2,3} and
 * angular-augments-gold-*, so these override the older answers.
 *
 * Every "Verified" block was produced on Angular 22.2.3 with
 * scripts/verify-angular-example.mjs: AOT-compiled with ngc and
 * strictTemplates, booted with bootstrapApplication in jsdom. Examples marked
 * runnable also passed its --playground mode (plain transpile + JIT, the way
 * the site playground runs them). Server-side claims come from
 * @angular/platform-server renderApplication; compiled-output claims from ngc;
 * API names and status from the installed 22.2.3 typings (afterRender no
 * longer exists there: it is afterEveryRender).
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of ngOnChanges and how does it capture changes in @Input properties?",
    seoDescription:
      "ngOnChanges runs when a parent binding gives an input a new value. What SimpleChanges holds, firstChange, and why mutations and direct writes skip it.",
    description: `**Question presented to candidate:**
"A child component needs to react when its parent passes it new data. Walk me through ngOnChanges: when does it run, what exactly is inside the SimpleChanges object, and when does it NOT fire even though you expected it to?"

**What a strong answer should cover:**
- \`ngOnChanges\` runs when a **parent template binding** produces a new value for an input, compared by reference (\`===\`); the first call happens **before \`ngOnInit\`**.
- \`SimpleChanges\` holds one \`SimpleChange\` per changed input, with \`previousValue\`, \`currentValue\`, \`firstChange\` (and \`isFirstChange()\`); on the first call \`previousValue\` is \`undefined\`.
- Only **bound** inputs that changed appear; an input nobody binds never shows up.
- It does **not** fire for in-place mutation of an object input, for the same value set again, or for code that assigns the property directly; \`ComponentRef.setInput()\` does trigger it.
- With **OnPush as the default in v22**, a mutated object input does not even re-render the child.
- Signal inputs are included in \`ngOnChanges\` too, but \`computed()\` / \`effect()\` are usually the better tool; \`SimpleChanges<T>\` gives typed keys.

**Clarifying questions expected:**
- "Are these decorator \`@Input\`s or signal \`input()\`s?"
- "Is the parent passing objects it mutates, or new objects each time?"

**Code / implementation expected:** Yes — a child that logs its \`SimpleChanges\`, plus a demonstration of a mutation that does not trigger it.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who have written a component with an <code>@Input</code> and want to know exactly when Angular tells the component that the input changed.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. Everything under a "Verified" heading was compiled with <code>ngc</code> (strict templates) on Angular 22.2.3 and run; the output is pasted exactly as it printed.

## 1. Why This Even Matters — A Story First

Imagine a restaurant kitchen with an order screen. The waiter types an order, and the chef's screen beeps: "Table 4: was 2 burgers, now 3 burgers." The chef does not re-read every order every minute. The beep tells them **what** changed, **from what** and **to what**.

Now the catch. If the waiter scribbles on the paper ticket that is already pinned in the kitchen, nothing beeps. The ticket is the same piece of paper, so the screen thinks nothing happened. And if a cook walks over and changes the ticket by hand, the screen does not beep either, because the screen only listens to the waiter.

<code>ngOnChanges</code> is that beep. The waiter is the **parent template**, the ticket is the **input value**, and the "same piece of paper" problem is the reason mutated objects do not trigger it. Almost every confusing <code>ngOnChanges</code> bug is one of those three situations.

## 2. The Core Idea

📌 **Interview term: ngOnChanges** — a [lifecycle hook](/interview-question/what-are-angular-lifecycle-hooks) method, declared by the <code>OnChanges</code> interface, that Angular calls when one or more **inputs** of a component or [directive](/interview-question/what-is-a-directive-and-what-are-the-types) receive a new value from a [template binding](/interview-question/what-are-the-types-of-data-binding-in-angular). It receives one argument describing what changed.

📌 **Interview term: SimpleChanges** — the argument: an object with one key per input that changed in this round. Each value is a <code>SimpleChange</code>.

📌 **Interview term: SimpleChange** — a small record for one input with three fields and one method:

| Member | Meaning |
| :--- | :--- |
| <code>previousValue</code> | The value before this change (<code>undefined</code> on the first call) |
| <code>currentValue</code> | The new value |
| <code>firstChange</code> | <code>true</code> only on the very first assignment |
| <code>isFirstChange()</code> | The same thing as a method |

The installed 22.2.3 typings define it exactly like that: <code>class SimpleChange&lt;T&gt; { previousValue; currentValue; firstChange; isFirstChange() }</code>.

📌 **Interview term: Reference equality** — Angular decides "changed" with <code>===</code>. For strings and numbers that means "different value". For objects and arrays it means "a **different object**", not "different contents".

When does it run, in order?

1. First call: after the constructor, **before <code>ngOnInit</code>**, once with every bound input (see [constructor vs ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit)).
2. Later calls: during [change detection](/interview-question/how-does-change-detection-work-in-angular) of the parent, whenever at least one bound input gets a new value, before the child view is checked.

## 3. How a Change Reaches the Hook

<svg class="iq-diagram" width="100%" viewBox="0 0 820 250" role="img" aria-label="Parent binding value is compared with the previous value, changed keys go into SimpleChanges, then ngOnChanges runs; an identical value is skipped">
  <defs>
    <marker id="oc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="100" y="60" text-anchor="middle">Parent binding</text>
  <text class="d-sub" x="100" y="82" text-anchor="middle">produces a value</text>
  <path class="d-edge" d="M 184 65 L 222 65" marker-end="url(#oc-arrow)"/>
  <rect class="d-box" x="226" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="306" y="60" text-anchor="middle">Compare ===</text>
  <text class="d-sub" x="306" y="82" text-anchor="middle">with last value</text>
  <path class="d-edge-accent" d="M 390 65 L 428 65" marker-end="url(#oc-arrow)"/>
  <rect class="d-box-accent" x="432" y="30" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="512" y="60" text-anchor="middle">SimpleChanges</text>
  <text class="d-sub" x="512" y="82" text-anchor="middle">changed keys only</text>
  <path class="d-edge-accent" d="M 596 65 L 634 65" marker-end="url(#oc-arrow)"/>
  <rect class="d-box-accent" x="638" y="30" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="718" y="60" text-anchor="middle">ngOnChanges</text>
  <text class="d-sub" x="718" y="82" text-anchor="middle">first call: ngOnInit next</text>
  <path class="d-edge-dashed" d="M 306 104 L 306 156" marker-end="url(#oc-arrow)"/>
  <rect class="d-box-muted" x="206" y="160" width="200" height="60" rx="10"/>
  <text class="d-text" x="306" y="186" text-anchor="middle">Same reference</text>
  <text class="d-sub" x="306" y="206" text-anchor="middle">no entry, no call</text>
</svg>

The only door into <code>ngOnChanges</code> is the left box: a value coming from a parent binding (or from <code>setInput</code>, which plays the same role for dynamically created components). Anything that changes the property without going through that door is invisible to the hook.

## 4. Verified: What SimpleChanges Actually Contains

The runnable example at the bottom has a <code>user-badge</code> child with three decorator inputs (<code>name</code>, <code>score</code>, <code>filter</code>) that appends one line per <code>ngOnChanges</code> call. The parent has four buttons. Output after each click (the child paragraph, then the log lines):

\`\`\`
initial          | Ada score 1 · tag a | log: name: undefined -> "Ada" (firstChange=true) | score: undefined -> 1 (firstChange=true) | filter: undefined -> {"tag":"a"} (firstChange=true)
score + 1        | Ada score 2 · tag a | log: ... // score: 1 -> 2 (firstChange=false)
same name        | Ada score 2 · tag a | log: (no new line)
mutate filter    | Ada score 2 · tag a | log: (no new line)
replace filter   | Ada score 2 · tag new object | log: ... // filter: {"tag":"mutated"} -> {"tag":"new object"} (firstChange=false)
\`\`\`

(The "..." and "(no new line)" stand for the earlier log lines, which were repeated in full in the real output.) Five things to read off it:

1. The **first call contains every bound input**, each with <code>previousValue: undefined</code> and <code>firstChange: true</code>.
2. Later calls contain **only the inputs that changed**: clicking "score + 1" produced a <code>SimpleChanges</code> with just <code>score</code>.
3. Setting the **same value** again (<code>name.set(name())</code>) produced no call at all.
4. **Mutating** the object (<code>filter.tag = 'mutated'</code>) produced no call, and the child still showed <code>tag a</code>. In Angular 22 components are **OnPush by default**, so the child was not even re-rendered: its input reference did not change.
5. Replacing the object did trigger it, and <code>previousValue</code> printed as <code>{"tag":"mutated"}</code>. That is not a history: <code>previousValue</code> holds a **reference** to the old object, which had been mutated in the meantime.

## 5. What Does NOT Trigger ngOnChanges

The second experiment used a dynamically created copy of a component and a direct property write (driver code, not part of the examples):

\`\`\`
--- assign tag.currency = 'USD' directly ---
text: 150 EUR priceyup
--- createComponent + setInput ---
ngOnChanges: amount undefined -> 500 first=true | currency undefined -> "GBP" first=true
\`\`\`

Writing <code>tag.currency = "USD"</code> from the parent class (via an [<code>@ViewChild</code> reference](/interview-question/what-are-viewchild-and-contentchild)) changed the field, but there was **no <code>ngOnChanges</code> call and no re-render**. <code>ComponentRef.setInput()</code>, on the other hand, goes through the same path as a template binding and fires the hook. See [dynamically creating components](/interview-question/how-do-you-dynamically-create-components).

| Situation | <code>ngOnChanges</code> fires? | Verified |
| :--- | :--- | :--- |
| Parent binding gives a new primitive value | Yes, with only that key | Yes |
| Parent binding gives the same value again | No | Yes |
| Parent mutates an object or array it already passed | No (and the OnPush child does not re-render) | Yes |
| Parent passes a new object | Yes; <code>previousValue</code> is the old reference | Yes |
| Code assigns the input property directly | No | Yes |
| <code>componentRef.setInput(name, value)</code> | Yes | Yes |
| Input that no template binds | Never appears in <code>SimpleChanges</code> | Yes (<code>currency</code> was absent below) |

If you genuinely need to notice changes **inside** an object, the classic tools are <code>ngDoCheck</code> with a differ (see [KeyValueDiffers and IterableDiffers](/interview-question/what-is-the-purpose-of-the-keyvaluediffers-and-iterablediffers-services)). The better design is usually immutable updates: pass a new object, and the hook (and OnPush) just work.

## 6. Signal Inputs, Transforms and Typed Changes

Modern components often use [signal inputs](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1) (<code>input()</code>) instead of <code>@Input</code>. The 22.2.3 typings for <code>OnChanges</code> say the hook "includes both signal-based and decorator-based inputs", and they recommend <code>computed</code> and <code>effect</code> for signal inputs. Verified with the second example (a signal input <code>amount</code>, a decorator input <code>currency</code> that nobody binds, and a <code>booleanAttribute</code>-transformed input <code>compact</code> written as a bare attribute):

\`\`\`
compact: undefined -> true first=true
amount: undefined -> 10 first=true
[app] RENDERED: 10 EUR (cheap)raise price
amount: 10 -> 150 first=false
after click: 150 EUR (pricey)raise price
\`\`\`

- The **signal input** <code>amount</code> appears in <code>SimpleChanges</code> like any other input.
- The **transformed** input reports the value **after** the transform: the bare attribute <code>compact</code> is the empty string, and <code>booleanAttribute</code> turned it into <code>true</code>.
- <code>currency</code> is not bound by the parent, so it never appears.
- The derived label came from <code>computed(() =&gt; this.amount() &gt; 100 ? "pricey" : "cheap")</code>, with no hook at all.

📌 **Interview term: SimpleChanges&lt;T&gt;** — in 22.2.3 the type takes the component as a generic argument (<code>ngOnChanges(changes: SimpleChanges&lt;PriceTagComponent&gt;)</code>), so <code>changes.amount</code> is typed and a misspelled key is a compile error. For signal inputs it unwraps the [signal](/interview-question/what-are-angular-signals) type, so <code>changes.amount.currentValue</code> is a <code>number</code>.

## 7. ngOnChanges vs a Setter vs computed()

| Approach | Sees all changed inputs together | Gets the previous value | Best for |
| :--- | :--- | :--- | :--- |
| <code>ngOnChanges</code> | Yes, one call per round | Yes | Reacting to several decorator inputs at once, comparing old and new |
| <code>@Input() set value(v)</code> | No, one setter per input | Only if you store it | Normalising a single input |
| <code>computed()</code> on <code>input()</code> | Reads whatever it needs | No (not needed) | Deriving display state |
| <code>effect()</code> on <code>input()</code> | Reads whatever it needs | No | Side effects such as logging or syncing to a non-Angular API (see [effect()](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it)) |

Setters and the hook are not rivals; they run in a fixed order. Verified with a child that has two input setters and <code>ngOnChanges</code>, next to a second child whose only input is not bound:

\`\`\`
setter first 1
setter second 10
ngOnChanges first,second
ngOnInit
kid-b ngOnInit (no ngOnChanges before it)
\`\`\`

All setters run first, then **one** <code>ngOnChanges</code> call with both keys, then <code>ngOnInit</code>. The second child implements <code>ngOnChanges</code> too, but with no bound input it is simply never called.

In new code with signal inputs, derive with [computed()](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) first. Keep <code>ngOnChanges</code> for decorator inputs, for "compare old to new" logic, and for code that must react once per round to several inputs at the same time.

## 8. Common Pitfalls

- **Mutating an object input and expecting the hook.** <code>this.filter.tag = "x"</code> in the parent is the same reference: no <code>ngOnChanges</code>, and with OnPush by default the child keeps showing the old text (verified above). Pass a new object.
- **Reading <code>previousValue</code> as a snapshot.** For objects it is the old reference, so if that object was mutated, <code>previousValue</code> shows the mutated contents (verified: <code>{"tag":"mutated"}</code>).
- **Assuming every input is in <code>changes</code>.** Only bound inputs that changed this round are present. Guard with <code>if (changes.score)</code> before reading <code>.currentValue</code>.
- **Setting an input from code and waiting for the hook.** A direct assignment bypasses it; for dynamic components use <code>componentRef.setInput()</code>.
- **Doing heavy work on every call.** The hook can run many times. Check <code>firstChange</code> or compare values before expensive work, or move derivations into <code>computed()</code>.
- **Writing <code>ngOnChanges(changes: any)</code>.** Use <code>SimpleChanges&lt;ThisComponent&gt;</code> so the compiler checks the key names.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> is the lifecycle hook Angular calls when a parent binding gives one or more inputs a new value. It runs first before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>, then again whenever a bound input changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it receives:</strong> <span style="color:#f0e2c8;">"It gets a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SimpleChanges</code> object with one entry per changed input: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">previousValue</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">currentValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">firstChange</code>. On the first call every bound input is there with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">previousValue</code> undefined."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How change is decided:</strong> <span style="color:#f0e2c8;">"Angular compares with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>. Same value, no call. A mutated object is the same reference, so no call, and with OnPush as the default the child does not even re-render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What bypasses it:</strong> <span style="color:#f0e2c8;">"Assigning the property from code does not trigger it. For dynamically created components, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput</code> does."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern guidance:</strong> <span style="color:#f0e2c8;">"It also fires for signal inputs, but for those I derive state with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> for side effects; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> stays useful for comparing old and new values of decorator inputs."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my child not update when I pushed into the array input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The array is the same reference, so the binding did not change: no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code>, and an OnPush child is not re-checked. Pass a new array, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items = [...items, x]</code>, or make it a signal and update it immutably.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does ngOnChanges run if a component has no inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only runs when bound inputs change. A component nobody binds inputs on never gets it, even if it implements the hook, so initialisation belongs in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> or the constructor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is ngOnChanges called before or after the input setter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After. Angular writes all the new input values first (running setters and transforms), then calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> once with the collected changes. That is why the change shows the transformed value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get typed keys in SimpleChanges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the class as the generic argument: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SimpleChanges&lt;MyComponent&gt;</code>. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">changes.score</code> is typed and a misspelled key fails compilation. For signal inputs it unwraps the signal type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use instead of ngOnChanges with signal inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> for anything derived, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linkedSignal()</code> when local state should reset on input change, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code> for side effects. They react to exactly the inputs they read, with no key checks.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ngOnChanges** | Hook called when bound inputs get new values, first before <code>ngOnInit</code> |
| **SimpleChanges** | Object with one entry per input that changed this round |
| **SimpleChange** | <code>previousValue</code>, <code>currentValue</code>, <code>firstChange</code> for one input |
| **Reference equality** | "Changed" means <code>!==</code>; a mutated object is unchanged |
| **setInput** | Sets an input on a dynamic component the same way a binding does |
| **SimpleChanges&lt;T&gt;** | Typed form keyed by the component class |

---
**Conclusion:** <code>ngOnChanges</code> is Angular telling a child "these inputs just got new values from your parent", with the old and new value for each. It runs once before <code>ngOnInit</code> with every bound input, then only for inputs whose binding produced a different value by <code>===</code>. Verified on 22.2.3: mutating an object, setting the same value, or assigning the field from code does not call it, and with OnPush as the default a mutated object does not even repaint the child; replacing the object or calling <code>setInput</code> does. Signal inputs show up too, but for those, <code>computed()</code> and <code>effect()</code> usually say the same thing with less code.`,
    examples: [
      {
        label: "Logging SimpleChanges: new values, same value, mutation and replacement",
        tech: "angular",
        runnable: true,
        code: `import { Component, Input, OnChanges, SimpleChanges, signal } from "@angular/core";

type Filter = { tag: string };

@Component({
  selector: "user-badge",
  template: \`
    <p><b>{{ name }}</b> score {{ score }} · tag {{ filter.tag }}</p>
    <ol>
      @for (line of log(); track $index) { <li>{{ line }}</li> }
    </ol>\`,
})
export class UserBadgeComponent implements OnChanges {
  @Input() name = "";
  @Input() score = 0;
  @Input() filter: Filter = { tag: "-" };
  log = signal<string[]>([]);

  // Called before ngOnInit with every bound input, then again whenever a
  // parent binding produces a NEW value (compared with ===).
  ngOnChanges(changes: SimpleChanges<UserBadgeComponent>) {
    const lines = Object.entries(changes).map(
      ([key, c]) =>
        \`\${key}: \${JSON.stringify(c!.previousValue)} -> \${JSON.stringify(c!.currentValue)}\` +
        \` (firstChange=\${c!.firstChange})\`,
    );
    this.log.update((old) => [...old, lines.join(" | ")]);
  }
}

@Component({
  selector: "app-root",
  imports: [UserBadgeComponent],
  template: \`
    <user-badge [name]="name()" [score]="score()" [filter]="filter" />
    <button (click)="score.set(score() + 1)">score + 1</button>
    <button (click)="name.set(name())">same name again</button>
    <button (click)="filter.tag = 'mutated'">mutate filter</button>
    <button (click)="filter = { tag: 'new object' }">replace filter</button>\`,
})
export class AppComponent {
  name = signal("Ada");
  score = signal(1);
  filter: Filter = { tag: "a" };
}`,
      },
      {
        label: "ngOnChanges with a signal input and a transformed input, next to computed()",
        tech: "angular",
        runnable: false,
        code: `import { Component, Input, OnChanges, SimpleChanges, booleanAttribute, computed, input, signal } from "@angular/core";

@Component({
  selector: "price-tag",
  template: \`<span>{{ amount() }} {{ currency }} ({{ label() }}){{ compact ? "" : " incl. VAT" }}</span>\`,
})
export class PriceTagComponent implements OnChanges {
  amount = input(0);                                       // signal input
  @Input() currency = "EUR";                               // decorator input
  @Input({ transform: booleanAttribute }) compact = false; // transformed input

  // The signal way: derive instead of reacting.
  label = computed(() => (this.amount() > 100 ? "pricey" : "cheap"));

  // ngOnChanges still fires for signal inputs too, and it sees
  // the value AFTER the transform ran ("" became true).
  ngOnChanges(changes: SimpleChanges<PriceTagComponent>) {
    for (const [key, c] of Object.entries(changes)) {
      console.log(\`\${key}: \${JSON.stringify(c!.previousValue)} -> \${JSON.stringify(c!.currentValue)} first=\${c!.isFirstChange()}\`);
    }
  }
}

@Component({
  selector: "app-root",
  imports: [PriceTagComponent],
  template: \`<price-tag [amount]="amount()" compact />
    <button (click)="amount.set(150)">raise price</button>\`,
})
export class AppComponent {
  amount = signal(10);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Angular lifecycle hooks?",
    seoDescription:
      "Angular lifecycle hooks in order for a parent and child, verified on v22: once vs every-check hooks, destroy order, DestroyRef, OnPush and render hooks.",
    description: `**Question presented to candidate:**
"Name Angular's lifecycle hooks, tell me in what order they run for a parent with a child component, which ones run once and which run on every change detection pass, and how the newer render hooks and DestroyRef fit in."

**What a strong answer should cover:**
- The eight class hooks in order: \`ngOnChanges\`, \`ngOnInit\`, \`ngDoCheck\`, \`ngAfterContentInit\`, \`ngAfterContentChecked\`, \`ngAfterViewInit\`, \`ngAfterViewChecked\`, \`ngOnDestroy\`; which are "once" and which are "every check".
- **Parent + child interleaving**: the parent reaches its content hooks before the child is even constructed, and the parent \`ngAfterViewInit\` runs only after the whole child subtree finished.
- Destruction runs **child first**, and \`DestroyRef.onDestroy\` callbacks run right after the matching \`ngOnDestroy\`.
- The function-based **render hooks** (\`afterNextRender\`, \`afterEveryRender\`) run after the whole application rendered, browser only.
- With **OnPush as the default in v22**, a skipped component still gets \`ngDoCheck\` from its parent, but nothing below it runs.
- What each hook is for (inputs, init, projected content, own view, cleanup) and why \`ngDoCheck\` / \`...Checked\` hooks must be cheap.

**Clarifying questions expected:**
- "Do you want the class-based hooks only, or also the signal-era render hooks?"
- "Are the components OnPush (the v22 default) or Eager?"

**Code / implementation expected:** Optional — a parent and child that log every hook, or the order written out from memory.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who know what a component is and want the hook order down cold, including how a parent and its child interleave.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every ordering claim below comes from a parent and child that log each hook, compiled with <code>ngc</code> on Angular 22.2.3 and run; the numbered lists are the real output.

## 1. Why This Even Matters — A Story First

Think of building a house with a subcontractor. The general contractor arrives, reads the plans (inputs), sets up (init), and checks the materials the client dropped off at the door (projected content). Only then does the plumber, the subcontractor, start: reads their own plans, sets up, does their work, and reports "my part is finished". The general contractor can only say "the house is finished" after the plumber has reported back. When the house is demolished, the plumbing comes out first, then the walls.

Angular components work the same way. Each component goes through fixed **moments**: created, inputs arrived, initialised, content ready, view ready, checked again, destroyed. A **lifecycle hook** is a method Angular calls at one of those moments, so your code runs at the right time instead of guessing.

## 2. The Core Idea

📌 **Interview term: Lifecycle hook** — a method with a reserved name (<code>ngOnInit</code>, <code>ngOnDestroy</code>, ...) that Angular calls on a component or [directive](/interview-question/what-is-a-directive-and-what-are-the-types) at a specific moment. Each has a matching interface (<code>OnInit</code>, <code>OnDestroy</code>, ...) that you <code>implements</code> so the compiler checks the method name; the interface is optional at runtime, the method name is what counts.

📌 **Interview term: Content vs view** — **content** is what a parent places between your tags and you show with <code>&lt;ng-content&gt;</code> ([content projection](/interview-question/what-is-content-projection-and-ng-content)). The **view** is your own template. Each has an "Init" hook (once) and a "Checked" hook (every pass).

| Hook | When | How often | Typical use |
| :--- | :--- | :--- | :--- |
| <code>constructor</code> | Class is created | Once | [Inject](/interview-question/how-does-dependency-injection-work-in-angular) dependencies, set up signals (not a hook, but always first) |
| <code>ngOnChanges</code> | A bound input got a new value | First, then on each input change | React to input changes (see [ngOnChanges in depth](/interview-question/what-is-the-purpose-of-ngonchanges-and-how-does-it-capture-changes-in-input-prop)) |
| <code>ngOnInit</code> | After the first <code>ngOnChanges</code> | Once | Initialisation that needs inputs |
| <code>ngDoCheck</code> | Every time the parent checks this component | Every pass | Custom change detection (rarely needed) |
| <code>ngAfterContentInit</code> | Projected content is ready | Once | Read <code>@ContentChild</code> results |
| <code>ngAfterContentChecked</code> | Projected content was checked | Every pass | Rare |
| <code>ngAfterViewInit</code> | Own view and children are ready | Once | Read <code>@ViewChild</code> results |
| <code>ngAfterViewChecked</code> | Own view was checked | Every pass | Rare |
| <code>ngOnDestroy</code> | Component is removed | Once | Cleanup ([avoid leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions)) |

The [constructor vs ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit) split is the most asked part of this; the rest is mostly about order.

## 3. Verified: Parent and Child, Hook by Hook

The runnable example at the bottom has <code>parent-cmp</code> (two inputs) wrapping <code>child-cmp</code> (one input, plus projected content). Every hook pushes a line into a list. First render:

\`\`\`
--- first render ---
 1. parent constructor
 2. parent ngOnChanges(count,show)
 3. parent ngOnInit
 4. parent ngDoCheck
 5. parent ngAfterContentInit
 6. child constructor
 7. child ngOnChanges(value)
 8. child ngOnInit
 9. child ngDoCheck
10. child ngAfterContentInit
11. child ngAfterContentChecked
12. child ngAfterViewInit
13. child ngAfterViewChecked
14. parent ngAfterViewInit
\`\`\`

(The parent in this example does not implement the two "Checked" hooks, so they are absent from its lines.) The surprising parts:

- The parent reaches <code>ngAfterContentInit</code> (line 5) **before the child even exists** (line 6). The parent content is what <em>its</em> parent projected into it, which is already there.
- The child is created while Angular renders the parent template, and runs **its whole sequence** (lines 6 to 13) before control comes back.
- <code>parent ngAfterViewInit</code> is last (line 14): "my view is ready" means "my view **and every child in it** are ready".

<svg class="iq-diagram" width="100%" viewBox="0 0 760 620" role="img" aria-label="Lifecycle order: parent init and content hooks, then the whole child sequence, then parent view hooks, then render hooks for the whole app">
  <defs>
    <marker id="lh-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="180" y="22" text-anchor="middle">PARENT</text>
  <text class="d-sub" x="580" y="22" text-anchor="middle">CHILD</text>
  <rect class="d-box" x="40" y="40" width="280" height="60" rx="10"/>
  <text class="d-text" x="180" y="66" text-anchor="middle">1. constructor, ngOnChanges</text>
  <text class="d-sub" x="180" y="88" text-anchor="middle">ngOnInit, ngDoCheck</text>
  <path class="d-edge" d="M 180 104 L 180 136" marker-end="url(#lh-arrow)"/>
  <rect class="d-box" x="40" y="140" width="280" height="60" rx="10"/>
  <text class="d-text" x="180" y="166" text-anchor="middle">2. ngAfterContentInit</text>
  <text class="d-sub" x="180" y="188" text-anchor="middle">then ngAfterContentChecked</text>
  <path class="d-edge-accent" d="M 324 190 L 436 246" marker-end="url(#lh-arrow)"/>
  <rect class="d-box-accent" x="440" y="240" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="580" y="266" text-anchor="middle">3. child: constructor to</text>
  <text class="d-sub" x="580" y="288" text-anchor="middle">ngAfterContentChecked</text>
  <path class="d-edge-accent" d="M 580 304 L 580 336" marker-end="url(#lh-arrow)"/>
  <rect class="d-box-accent" x="440" y="340" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="580" y="366" text-anchor="middle">4. child: ngAfterViewInit</text>
  <text class="d-sub" x="580" y="388" text-anchor="middle">then ngAfterViewChecked</text>
  <path class="d-edge" d="M 436 390 L 324 446" marker-end="url(#lh-arrow)"/>
  <rect class="d-box" x="40" y="440" width="280" height="60" rx="10"/>
  <text class="d-text" x="180" y="466" text-anchor="middle">5. parent: ngAfterViewInit</text>
  <text class="d-sub" x="180" y="488" text-anchor="middle">then ngAfterViewChecked</text>
  <path class="d-edge-dashed" d="M 180 504 L 180 536" marker-end="url(#lh-arrow)"/>
  <rect class="d-box-muted" x="40" y="540" width="680" height="60" rx="10"/>
  <text class="d-text" x="380" y="566" text-anchor="middle">6. render hooks for the whole app</text>
  <text class="d-sub" x="380" y="588" text-anchor="middle">afterNextRender, afterEveryRender (browser only)</text>
</svg>

Read it as a depth-first walk: the parent goes as far as it can, hands over to each child in its template, and finishes its view hooks once all children have finished theirs. Step 6 happens once per application render, not once per component.

## 4. Verified: Later Passes and Destruction

Clicking "change input" (the parent <code>count</code> input changes, which flows into the child <code>value</code>):

\`\`\`
--- change input ---
 1. parent ngOnChanges(count)
 2. parent ngDoCheck
 3. child ngOnChanges(value)
 4. child ngDoCheck
 5. child ngAfterContentChecked
 6. child ngAfterViewChecked
\`\`\`

No <code>ngOnInit</code>, no "Init" hooks: those are once only. Clicking "remove child" (the parent <code>show</code> input becomes false, and an [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir) removes the child):

\`\`\`
--- remove child ---
 1. parent ngOnChanges(show)
 2. parent ngDoCheck
 3. child ngOnDestroy
\`\`\`

A separate check of destruction order, removing a parent that contains a child, with both <code>ngOnDestroy</code> and <code>DestroyRef.onDestroy</code>:

\`\`\`
child ngOnDestroy
child DestroyRef.onDestroy
parent ngOnDestroy
parent DestroyRef.onDestroy
\`\`\`

Children are torn down **first**, like the plumbing before the walls.

📌 **Interview term: DestroyRef** — an injectable handle for "this component is being destroyed". <code>inject(DestroyRef).onDestroy(fn)</code> registers cleanup from the constructor or from any function running in an [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it), which is what <code>takeUntilDestroyed()</code> uses under the hood. Verified above: it runs right after that component <code>ngOnDestroy</code>.

## 5. OnPush (the v22 Default) Changes What Runs

In Angular 22 components are OnPush by default (see [change detection](/interview-question/how-does-change-detection-work-in-angular)). One more probe: a pass where only the root component state changed, nothing passed to <code>parent-cmp</code>. The whole log for that pass was:

\`\`\`
parent ngDoCheck
\`\`\`

That single line is worth remembering. <code>ngDoCheck</code> is called by the **parent view** while it checks its children, so it runs even for an OnPush component that is then **skipped**. Nothing inside the skipped component (its "Checked" hooks, its children) runs. This is why <code>ngDoCheck</code> is the hook for "notice something OnPush would miss", and also why it must be cheap: it runs on every pass of the parent.

## 6. Render Hooks: After the Whole App Rendered

📌 **Interview term: Render hooks** — <code>afterNextRender</code> and <code>afterEveryRender</code> (the 22.2.3 name; it was called <code>afterRender</code> until v20) are **functions** you call in the constructor, not methods. They run after Angular has finished rendering **the whole application**, and never on the server. The first experiment logged them next to the class hooks:

\`\`\`
...
child   ngAfterViewChecked
parent  ngAfterViewInit
parent  ngAfterViewChecked
child   afterNextRender
child   afterEveryRender
parent  afterNextRender
parent  afterEveryRender
\`\`\`

They come after every class hook. (In this run the child callbacks came before the parent ones even though the parent registered first; treat order across components as an implementation detail.) Which one to use, and how they compare with <code>ngAfterViewInit</code>, is its own question: [afterRender vs afterNextRender vs ngAfterViewInit](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use), and the phases are covered in [afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks).

## 7. Where Each Hook Fits Today

| Need | Class-hook answer | Signal-era answer |
| :--- | :--- | :--- |
| React to inputs | <code>ngOnChanges</code> | [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) / [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) on [<code>input()</code>](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1) |
| Init with inputs | <code>ngOnInit</code> | Still <code>ngOnInit</code>, or a <code>computed</code> |
| Read a projected element | <code>ngAfterContentInit</code> + <code>@ContentChild</code> | <code>contentChild()</code> signal |
| Read your own element | <code>ngAfterViewInit</code> + <code>@ViewChild</code> | <code>viewChild()</code> signal (see [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed)) |
| Touch the real DOM, browser only | <code>ngAfterViewInit</code> (also runs on the server) | <code>afterNextRender</code> / <code>afterEveryRender</code> |
| Cleanup | <code>ngOnDestroy</code> | <code>DestroyRef.onDestroy</code>, <code>takeUntilDestroyed()</code> |

The class hooks are not deprecated; [signals](/interview-question/what-are-angular-signals) and the function-based hooks simply remove the need for several of them in new code.

## 8. Common Pitfalls

- **Expecting <code>@ViewChild</code> results in <code>ngOnInit</code>.** Dynamic view queries resolve just before <code>ngAfterViewInit</code> (static ones earlier). See [@ViewChild and @ContentChild](/interview-question/what-are-viewchild-and-contentchild).
- **Heavy work in <code>ngDoCheck</code> or the "Checked" hooks.** They run on every pass; as verified, <code>ngDoCheck</code> even runs for OnPush components that are then skipped.
- **Assuming the parent is "done" in its <code>ngAfterContentInit</code>.** The children in its template have not been constructed yet at that point (line 5 vs line 6 above).
- **Using <code>ngAfterViewInit</code> for browser-only DOM work in an [SSR](/interview-question/what-is-angular-universal-ssr) app.** It runs on the server too; use <code>afterNextRender</code>.
- **Forgetting cleanup.** Timers, global listeners and manual subscriptions outlive the component unless <code>ngOnDestroy</code> or <code>DestroyRef</code> stops them.
- **Calling <code>afterNextRender</code> from <code>ngOnInit</code>.** It needs an injection context and throws NG0203 there; call it in the constructor or pass <code>{ injector }</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Lifecycle hooks are methods Angular calls at fixed moments of a component life: inputs changed, initialised, content ready, view ready, checked, destroyed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The order:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngDoCheck</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterContentInit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterContentChecked</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewChecked</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code> at the end. The Init hooks run once, the Checked hooks and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngDoCheck</code> on every pass."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Parent and child:</strong> <span style="color:#f0e2c8;">"It is depth first: the parent runs up to its content hooks, then each child runs its full sequence, and only then the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>. On removal, children are destroyed first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Modern additions:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code> gives cleanup without a hook, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender</code> run after the whole app rendered, in the browser only, which is where DOM measuring and third-party widgets belong."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practical rule:</strong> <span style="color:#f0e2c8;">"Most components need only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> and cleanup; with signals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChild()</code> replace a lot of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> code. Keep the every-pass hooks cheap."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is ngOnInit better than the constructor for init logic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inputs are not set yet in the constructor; the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> happens after it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> comes right after that, so inputs are available. The constructor is for injection and wiring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does ngDoCheck run for an OnPush component that is skipped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The parent view calls it while checking its children, before deciding to skip. Verified on 22.2.3: a pass that changed only root state logged just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent ngDoCheck</code> and nothing inside that component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order are parent and child destroyed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Child first, then parent. Each component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code> is followed by its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef.onDestroy</code> callbacks, then Angular moves up to the parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which hooks run on the server during SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The class hooks do, including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>. The render hooks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender</code> do not, which is exactly why they exist for DOM work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a directive use lifecycle hooks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, all of them. A directive has no template of its own; verified on 22.2.3, a directive on a component host got its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> right after that host component finished its view, before the parent. Directives mostly use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lifecycle hook** | Method Angular calls at a fixed moment in a component life |
| **Content** | What the parent projects between your tags |
| **View** | Your own template, including child components in it |
| **ngDoCheck** | Called on every check by the parent, even for a skipped OnPush child |
| **DestroyRef** | Injectable that registers cleanup callbacks |
| **Render hooks** | <code>afterNextRender</code> / <code>afterEveryRender</code>, after the whole app rendered, browser only |

---
**Conclusion:** Angular gives every component the same timeline: <code>ngOnChanges</code> and <code>ngOnInit</code> as inputs arrive, content hooks once projected content is ready, view hooks once its own template and all children are ready, and <code>ngOnDestroy</code> at the end. Verified on 22.2.3, it is depth first: the parent reaches its content hooks before the child is constructed, the child runs its whole sequence, and only then does the parent see <code>ngAfterViewInit</code>; destruction goes child first. With OnPush as the default, a skipped component still gets <code>ngDoCheck</code> and nothing more, and the newer <code>DestroyRef</code> and render hooks cover cleanup and browser-only DOM work that the class hooks handled less precisely.`,
    examples: [
      {
        label: "A parent and child that log every lifecycle hook: first render, input change, removal",
        tech: "angular",
        runnable: true,
        code: `import {
  AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, DoCheck,
  Input, OnChanges, OnDestroy, OnInit, SimpleChanges, signal,
} from "@angular/core";

// Hooks run DURING change detection, so they write to a plain array.
// The "show log" button copies it into a signal for display.
const calls: string[] = [];
const log = (who: string, hook: string) => calls.push(\`\${who} \${hook}\`);

@Component({
  selector: "child-cmp",
  template: \`<p>child sees {{ value }}</p><ng-content />\`,
})
export class ChildComponent
  implements OnChanges, OnInit, DoCheck, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked, OnDestroy
{
  @Input() value = 0;
  constructor() { log("child", "constructor"); }
  ngOnChanges(c: SimpleChanges) { log("child", "ngOnChanges(" + Object.keys(c).join(",") + ")"); }
  ngOnInit() { log("child", "ngOnInit"); }
  ngDoCheck() { log("child", "ngDoCheck"); }
  ngAfterContentInit() { log("child", "ngAfterContentInit"); }
  ngAfterContentChecked() { log("child", "ngAfterContentChecked"); }
  ngAfterViewInit() { log("child", "ngAfterViewInit"); }
  ngAfterViewChecked() { log("child", "ngAfterViewChecked"); }
  ngOnDestroy() { log("child", "ngOnDestroy"); }
}

@Component({
  selector: "parent-cmp",
  imports: [ChildComponent],
  template: \`
    @if (show) {
      <child-cmp [value]="count"><em>projected</em></child-cmp>
    }\`,
})
export class ParentComponent implements OnChanges, OnInit, DoCheck, AfterContentInit, AfterViewInit, OnDestroy {
  @Input() count = 0;
  @Input() show = true;
  constructor() { log("parent", "constructor"); }
  ngOnChanges(c: SimpleChanges) { log("parent", "ngOnChanges(" + Object.keys(c).join(",") + ")"); }
  ngOnInit() { log("parent", "ngOnInit"); }
  ngDoCheck() { log("parent", "ngDoCheck"); }
  ngAfterContentInit() { log("parent", "ngAfterContentInit"); }
  ngAfterViewInit() { log("parent", "ngAfterViewInit"); }
  ngOnDestroy() { log("parent", "ngOnDestroy"); }
}

@Component({
  selector: "app-root",
  imports: [ParentComponent],
  template: \`
    <parent-cmp [count]="count()" [show]="show()" />
    <button (click)="calls.length = 0; count.set(count() + 1)">change input</button>
    <button (click)="calls.length = 0; show.set(false)">remove child</button>
    <button (click)="lines.set(calls.slice())">show log</button>
    <ol>
      @for (line of lines(); track $index) { <li>{{ line }}</li> }
    </ol>\`,
})
export class AppComponent {
  count = signal(1);
  show = signal(true);
  calls = calls;
  lines = signal<string[]>([]);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "afterRender vs afterNextRender vs ngAfterViewInit — which to use?",
    seoDescription:
      "afterRender is now afterEveryRender. When to use it, afterNextRender or ngAfterViewInit for DOM work, verified with SSR, a chart example and NG0103.",
    description: `**Question presented to candidate:**
"We need to initialise a third-party chart library on a div in our component and keep it in sync as data changes. Should that go in ngAfterViewInit, afterNextRender or afterRender? And is afterRender even still the right name?"

**What a strong answer should cover:**
- **Naming**: in Angular 20+ \`afterRender\` was renamed **\`afterEveryRender\`**; 22.2.3 does not export \`afterRender\` at all (importing it is a compile error).
- \`ngAfterViewInit\` is a **class hook** that runs during change detection, once per component, **also on the server**; the element exists but the app has not finished rendering.
- \`afterNextRender\` runs **once**, after the **whole application** rendered, **browser only**: the right place to create the chart.
- \`afterEveryRender\` runs after **every** application render: the place to push new data into the chart, preferably in a \`write\` or \`read\` phase.
- Both render hooks must be registered in an **injection context** (constructor), or be given \`{ injector }\`.
- Writing a signal on every \`afterEveryRender\` causes an infinite loop (\`NG0103\`).

**Clarifying questions expected:**
- "Does the app use SSR or prerendering?"
- "Does the library need the element measured (layout), or just a node to attach to?"

**Code / implementation expected:** Yes — create the library object in \`afterNextRender\`, update it in \`afterEveryRender\`.`,
    answer: `**Target Audience:** Developers who have used <code>ngAfterViewInit</code> to touch the DOM and want to know when the newer render hooks are the better choice, especially in apps with server-side rendering.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The "Verified" blocks were compiled with <code>ngc</code> on Angular 22.2.3 and run in jsdom; the server-side results came from <code>@angular/platform-server</code> <code>renderApplication</code>. API names come from the installed 22.2.3 typings.

## 1. Why This Even Matters — A Story First

A theatre is preparing tonight's show. There are three moments a stagehand could be told to act:

- "When **your** set piece is built" — the carpenter finishes one wall. The wall exists, but the rest of the stage may still be half built, and in the dress rehearsal (with no audience and no real lights) the wall gets built too.
- "Once the **whole stage** is ready, before the first show" — the curtain is about to go up. Now you can hang the lights on the wall.
- "After **every** scene change" — whenever the stage is rearranged, re-aim the lights.

<code>ngAfterViewInit</code> is the first moment. <code>afterNextRender</code> is the second. <code>afterEveryRender</code> is the third. The "dress rehearsal" is server-side rendering, where there is no real browser to hang lights in. Picking the right moment is the whole question.

## 2. First, the Name: afterRender Is Now afterEveryRender

📌 **Interview term: afterEveryRender** — the current name of the hook that runs after **every** render of the application. It was introduced as <code>afterRender</code> (developer preview, together with <code>afterNextRender</code>, in Angular 16.2 according to [Ninja Squad](https://blog.ninja-squad.com/2023/08/09/what-is-new-angular-16.2)) and renamed and marked stable in Angular 20, listed under breaking changes in the 20.0.0-next.9 changelog ([release notes](https://www.gitclear.com/open_repos/angular/angular/release/20.0.0-next.9), [API page](https://angular.dev/api/core/afterEveryRender)).

Verified against the installed 22.2.3 package:

\`\`\`
import { afterRender } from "@angular/core";
error TS2724: '"@angular/core"' has no exported member named 'afterRender'. Did you mean 'AfterRenderRef'?

("afterRender" in core, "afterEveryRender" in core, "afterRenderEffect" in core, "AfterRenderPhase" in core)
false true true false
\`\`\`

So in a v22 codebase there is no <code>afterRender</code> to choose. The typings tag <code>afterEveryRender</code> and <code>afterNextRender</code> as <code>@publicApi 20.0</code>. The old <code>AfterRenderPhase</code> enum is gone too; phases are now keys of a spec object (<code>{ write: ..., read: ... }</code>), covered in depth in [afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks). In speech, many people still say "afterRender"; it is fine to say "afterRender, now called afterEveryRender".

## 3. The Three Candidates

📌 **Interview term: ngAfterViewInit** — a class [lifecycle hook](/interview-question/what-are-angular-lifecycle-hooks) that Angular calls **during [change detection](/interview-question/how-does-change-detection-work-in-angular)**, once, when this component view and its children have been created. View query results are set. It runs on the server too.

📌 **Interview term: afterNextRender** — a function, called in the constructor, that registers a callback to run **once**, after the **entire application** has finished rendering, **in the browser only**.

📌 **Interview term: Render hook** — the umbrella term for <code>afterNextRender</code>, <code>afterEveryRender</code> and <code>afterRenderEffect</code>: callbacks that run after Angular has flushed all DOM updates for an application render. The typings say they "run on browser platforms only, they will not run on the server".

| | <code>ngAfterViewInit</code> | <code>afterNextRender</code> | <code>afterEveryRender</code> |
| :--- | :--- | :--- | :--- |
| Kind | Class method | Function in constructor | Function in constructor |
| How often | Once per component | Once | After every app render |
| Scope | This component view | Whole application render | Whole application render |
| Runs on the server | **Yes** | No | No |
| Needs an injection context | No | Yes | Yes |
| Phases (read / write) | No | Yes | Yes |
| Typical use | Read query results, wire non-DOM things | Create a library object on a real element, focus, measure once | Keep a library in sync, measure after updates |

## 4. Verified: The Chart Example

The runnable example creates a tiny pretend chart library on a div. <code>ngAfterViewInit</code> only records what it can see; <code>afterNextRender</code> creates the chart; <code>afterEveryRender</code> redraws it. After one "add value" click:

\`\`\`
ngAfterViewInit: chart element found = true, chart object = false
afterNextRender(write): chart created
afterEveryRender(read) #1: chart text "# ##"
afterEveryRender(read) #2: chart text "# ## ###"
chart div: <div class="chart" data-chart="ready"># ## ###</div>
\`\`\`

- <code>ngAfterViewInit</code> ran **first**, and the element reference was already there. Creating the chart there would have worked in this browser test, which is why so much older code does it.
- <code>afterNextRender</code> ran after it, once, and created the chart.
- <code>afterEveryRender</code> ran after the first render and again after the click, keeping the chart text in step with the <code>values</code> signal.

## 5. Verified: The Difference That Decides It, SSR

The same three hooks, rendered on the server with <code>renderApplication</code>:

\`\`\`
ngAfterViewInit ran (on the server!)
rendered: <app-root ng-version="22.2.3" ng-server-context="other"><p>chart placeholder</p></app-root>
\`\`\`

Neither <code>afterNextRender</code> nor <code>afterEveryRender</code> logged anything on the server. <code>ngAfterViewInit</code> did. If that hook had called <code>new Chart(el)</code> or <code>el.getBoundingClientRect()</code>, the code would run in Node, where there is no layout and often no real DOM API, and fail or produce nonsense. A second server test showed the classic symptom of touching browser globals during rendering:

\`\`\`
viaGlobal threw: ReferenceError: document is not defined
\`\`\`

That is the strongest single argument for the render hooks: they are the hooks Angular guarantees to run **only where a real DOM exists**. See [SSR](/interview-question/what-is-angular-universal-ssr) and [hydration](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat) for the rest of that story.

## 6. Which One? A Decision Path

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Decision path: no DOM needed means ngOnInit or computed; DOM once means afterNextRender; DOM after every render means afterEveryRender; only reading query refs means ngAfterViewInit or viewChild">
  <defs>
    <marker id="ar3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="230" y="20" width="300" height="56" rx="10"/>
  <text class="d-text" x="380" y="45" text-anchor="middle">Do you touch the real DOM?</text>
  <text class="d-sub" x="380" y="64" text-anchor="middle">measure, focus, third-party widget</text>
  <path class="d-edge" d="M 260 80 L 140 136" marker-end="url(#ar3-arrow)"/>
  <path class="d-edge-accent" d="M 500 80 L 600 136" marker-end="url(#ar3-arrow)"/>
  <rect class="d-box" x="30" y="140" width="220" height="60" rx="10"/>
  <text class="d-text" x="140" y="166" text-anchor="middle">No: only data or refs</text>
  <text class="d-sub" x="140" y="188" text-anchor="middle">ngOnInit, computed, viewChild</text>
  <rect class="d-box-muted" x="480" y="140" width="250" height="60" rx="10"/>
  <text class="d-text" x="605" y="166" text-anchor="middle">Yes: how often?</text>
  <text class="d-sub" x="605" y="188" text-anchor="middle">browser only either way</text>
  <path class="d-edge-accent" d="M 540 204 L 440 266" marker-end="url(#ar3-arrow)"/>
  <path class="d-edge-accent" d="M 670 204 L 670 266" marker-end="url(#ar3-arrow)"/>
  <rect class="d-box-accent" x="290" y="270" width="220" height="60" rx="10"/>
  <text class="d-text d-accent" x="400" y="296" text-anchor="middle">Once</text>
  <text class="d-sub" x="400" y="318" text-anchor="middle">afterNextRender</text>
  <rect class="d-box-accent" x="560" y="270" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="655" y="296" text-anchor="middle">After each render</text>
  <text class="d-sub" x="655" y="318" text-anchor="middle">afterEveryRender</text>
</svg>

<code>ngAfterViewInit</code> is not on the "touch the DOM" branch on purpose: it is still fine for reading [<code>@ViewChild</code>](/interview-question/what-are-viewchild-and-contentchild) results or starting something that does not need a browser, but in new code with [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed) even that is usually a [<code>computed</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) over a <code>viewChild()</code>.

If the work should run only when specific [signals](/interview-question/what-are-angular-signals) change, there is a fourth option, <code>afterRenderEffect</code>, which is an [effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) that runs in the render phases.

## 7. Verified: Writing State From These Hooks

DOM hooks often want to store a measurement for the template. What happens depends on the hook and on whether the state is a signal (Angular 22 is OnPush and [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) by default):

\`\`\`
plain field set in ngAfterViewInit        -> [app] RENDERED: ... A: 0
signal set in ngAfterViewInit             -> [app] RENDERED: ... A: 11
signal set in afterNextRender             -> [app] RENDERED: ... B: 11
signal updated in EVERY afterEveryRender  -> ERROR RuntimeError: NG0103: Infinite change detection while refreshing application views.
\`\`\`

(Each line is a separate run; the arrow text is a summary, the quoted part is the real output.) A plain field written in <code>ngAfterViewInit</code> was silently never shown (in a run where a signal was also written, the plain field did appear, only because that signal caused another render: luck, not design). A signal written there or in <code>afterNextRender</code> scheduled another render and appeared. A signal written unconditionally on **every** <code>afterEveryRender</code> created a render loop, which Angular cut off with NG0103. Rule: write state from <code>afterEveryRender</code> only when the value actually changed.

## 8. Verified: The Injection Context Rule

\`\`\`
in ngOnInit: NG0203: afterNextRender() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`.
with { injector }: ran
\`\`\`

Register render hooks in the constructor or a field initializer. From anywhere else, pass <code>{ injector }</code> (see [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it)). Registered in a component, the hook is cleaned up automatically when the component is destroyed.

## 9. Common Pitfalls

- **Importing <code>afterRender</code> in v20+.** It does not exist in 22.2.3 (TS2724). Use <code>afterEveryRender</code>, and search the codebase (and any library code you own) for the old name when upgrading.
- **Browser-only work in <code>ngAfterViewInit</code> in an SSR app.** It runs on the server (verified). Move it to <code>afterNextRender</code>.
- **Using <code>afterEveryRender</code> for one-time setup.** It runs after every application render, including renders caused by unrelated components, so setup would repeat. Use <code>afterNextRender</code>.
- **Updating a signal on every render.** Verified NG0103 loop. Compare before writing, or use <code>afterRenderEffect</code> so it only runs when inputs change.
- **Assuming hydration is done.** The typings warn components are "not guaranteed to be hydrated" when render callbacks run; be careful with code that assumes the final DOM.
- **Calling the hooks from [<code>ngOnInit</code>](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit).** NG0203; register them in the constructor.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Naming first:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRender</code> was renamed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender</code> in Angular 20, so in a v22 codebase the choice is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ngAfterViewInit:</strong> <span style="color:#f0e2c8;">"It is a class hook that runs during change detection when this component view exists. It is per component and it also runs on the server, so it is not the place for browser-only DOM work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. afterNextRender:</strong> <span style="color:#f0e2c8;">"It runs once, after the whole application finished rendering, and only in the browser. That is where I create a chart, focus an input or measure once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. afterEveryRender:</strong> <span style="color:#f0e2c8;">"It runs after every application render, whatever caused it. I use it to keep a non-Angular library in sync, with explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> phases, and I never write state unconditionally there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rules:</strong> <span style="color:#f0e2c8;">"Both render hooks need an injection context, so I register them in the constructor; they clean up with the component. If the work depends on specific signals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> runs only when those change."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just keep using ngAfterViewInit for DOM work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs during change detection, before the rest of the app rendered, and it runs on the server where there is no real DOM or layout. Verified with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderApplication</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> logged on the server while both render hooks did not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does afterEveryRender run when only another component changed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It is tied to application renders, not to the component that registered it. Verified: a component whose own state never changed still logged on every render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if afterEveryRender sets a signal every time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each write schedules another render, which runs the hook again. Angular stops the loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0103: Infinite change detection</code>. Only write when the value really changed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I register afterNextRender in ngOnInit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly; it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0203</code> because there is no injection context. Register it in the constructor or pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ injector: this.injector }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop an afterEveryRender callback early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AfterRenderRef</code>; calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destroy()</code> on it stops future runs. It is also destroyed with the component automatically unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manualCleanup: true</code> was passed.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **afterEveryRender** | Runs after every application render; the v20+ name of <code>afterRender</code> |
| **afterNextRender** | Runs once after the next application render |
| **ngAfterViewInit** | Class hook when this component view is created; runs during change detection, also on the server |
| **Render hook** | Browser-only callback after Angular flushed DOM updates |
| **afterRenderEffect** | Effect that runs in render phases when its signals change |
| **NG0103** | Infinite change detection error, e.g. from writing state on every render |
| **NG0203** | Injection-context error when registering a hook outside the constructor |

---
**Conclusion:** first fix the vocabulary: in Angular 20+ there is no <code>afterRender</code>, it is <code>afterEveryRender</code> (verified, 22.2.3 does not export the old name). Then choose by moment and platform. <code>ngAfterViewInit</code> is a per-component hook inside change detection that also runs on the server, so keep it for reading query results. <code>afterNextRender</code> runs once after the whole app rendered, browser only, which is where third-party widgets are created. <code>afterEveryRender</code> runs after every render to keep them in sync, with the rule that it must not write state unconditionally (verified NG0103). Register both in the constructor, and reach for <code>afterRenderEffect</code> when the work depends on specific signals.`,
    examples: [
      {
        label: "Create a third-party chart in afterNextRender, keep it in sync in afterEveryRender",
        tech: "angular",
        runnable: true,
        code: `import { AfterViewInit, Component, ElementRef, ViewChild, afterEveryRender, afterNextRender, signal } from "@angular/core";

// Pretend this is a third-party library that needs a real DOM node.
class TinyChart {
  constructor(private host: HTMLElement) {
    host.setAttribute("data-chart", "ready");
  }
  draw(values: number[]) {
    this.host.textContent = values.map((v) => "#".repeat(v)).join(" ");
  }
}

@Component({
  selector: "app-root",
  template: \`
    <div #chart class="chart"></div>
    <p>values: {{ values().join(", ") }}</p>
    <button (click)="values.set([...values(), values().length + 1])">add value</button>
    <button (click)="report.set(stats.slice())">show stats</button>
    <ul>
      @for (line of report(); track $index) { <li>{{ line }}</li> }
    </ul>\`,
})
export class AppComponent implements AfterViewInit {
  @ViewChild("chart") chartEl!: ElementRef<HTMLElement>;
  values = signal([1, 2]);
  report = signal<string[]>([]);
  stats: string[] = [];
  private chart?: TinyChart;
  private renders = 0;

  constructor() {
    // Once, after the first render, in the browser only: create the library object.
    afterNextRender({
      write: () => {
        this.chart = new TinyChart(this.chartEl.nativeElement);
        this.stats.push("afterNextRender(write): chart created");
      },
    });
    // After EVERY render of the app: keep the library in sync with state.
    afterEveryRender({
      write: () => this.chart?.draw(this.values()),
      read: () => this.stats.push(\`afterEveryRender(read) #\${++this.renders}: chart text "\${this.chartEl.nativeElement.textContent}"\`),
    });
  }

  // Runs during change detection, also on the server. The element exists,
  // but this is a lifecycle hook of THIS view, not "the DOM is painted".
  ngAfterViewInit() {
    this.stats.push(\`ngAfterViewInit: chart element found = \${!!this.chartEl}, chart object = \${!!this.chart}\`);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between afterRender and afterNextRender lifecycle hooks?",
    seoDescription:
      "afterNextRender runs once; afterRender (now afterEveryRender) after every app render. Phases, pipelined values and afterRenderEffect, verified.",
    description: `**Question presented to candidate:**
"Explain the difference between afterRender and afterNextRender. Go a level deeper than 'once versus every time': what are the phases, why do they exist, and what does 'every render' actually mean in an application with many components?"

**What a strong answer should cover:**
- \`afterNextRender\` runs **once**; \`afterRender\` (renamed **\`afterEveryRender\`** in v20, the only name in 22.2.3) runs after **every** application render.
- "Every render" is **application-wide**: the callback runs even when only some unrelated component changed.
- The four **phases** in fixed order: \`earlyRead\`, \`write\`, \`mixedReadWrite\`, \`read\`; the plain-callback form runs in \`mixedReadWrite\`; each phase receives the previous phase's return value.
- Phases are scheduled **across all components** (all writes before all reads) to avoid layout thrashing; Angular cannot enforce correct use.
- \`afterRenderEffect\` as the signal-driven variant that runs only when its dependencies change.
- Browser only, injection context required, returns an \`AfterRenderRef\` with \`destroy()\`.

**Clarifying questions expected:**
- "Which Angular version? The old name only exists before v20."
- "Is the work a DOM read, a DOM write, or both?"

**Code / implementation expected:** Optional — a phased \`afterNextRender\` spec and an \`afterEveryRender\` read.`,
    answer: `**Target Audience:** Developers who know that one render hook runs once and the other repeatedly, and want the mechanics an interviewer probes next: phases, pipelining, and what "every render" really means.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Phase names and guarantees are quoted from the installed Angular 22.2.3 typings; every ordering claim was produced by the runnable example below, compiled with <code>ngc</code> and run in jsdom.

## 1. Why This Even Matters — A Story First

Picture a busy kitchen at the end of service. Every cook wants to do two things: look at the order screen (read) and put plates on the pass (write). If cooks alternate randomly, look, place, look, place, the head chef has to re-count the pass every time someone looks, and service crawls.

So the head chef calls out rounds: "Everyone who must look **before** plating, look now. Everyone plate. Anyone who really must do both, go. Now everyone look." Same work, but grouped so nobody forces a recount in the middle.

That is the **phase** system of Angular render hooks. A browser has the same problem: reading layout (<code>offsetHeight</code>, <code>getBoundingClientRect</code>) right after a DOM write forces it to recalculate layout immediately, which is called **layout thrashing**. Angular groups the read and write callbacks of **all** components into rounds. And whether a cook is told "only tonight" or "every service" is the difference between <code>afterNextRender</code> and <code>afterEveryRender</code>.

## 2. The Name in 22.2.3

The hook the question calls <code>afterRender</code> was renamed <code>afterEveryRender</code> in Angular 20 and marked stable (<code>@publicApi 20.0</code> in the typings). Verified: <code>import { afterRender } from "@angular/core"</code> fails in 22.2.3 with TS2724, and a runtime check prints <code>"afterRender" in core: false</code>. This doc uses the current name; when the question was asked about older versions, everything below applied to <code>afterRender</code> the same way. For choosing between these and <code>ngAfterViewInit</code> (SSR, injection context, the chart example), see [afterRender vs afterNextRender vs ngAfterViewInit](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use).

## 3. The Core Difference

📌 **Interview term: afterNextRender** — registers callbacks to run **once**, "the next time the application finishes rendering". After that run it is done.

📌 **Interview term: afterEveryRender** — registers callbacks to run "**each time** the application finishes rendering". It keeps running until the component is destroyed or you call <code>destroy()</code> on the returned <code>AfterRenderRef</code>.

📌 **Interview term: Application render** — one pass in which Angular refreshes the views that need it and flushes their DOM updates. In a [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) Angular 22 app a render is scheduled by things like a [signal](/interview-question/what-are-angular-signals) the template reads changing, or a template event handler running. The key word is **application**: render hooks are not tied to "my component re-rendered".

Both share the same shape and rules: a plain callback or a spec of phases, an optional <code>{ injector, manualCleanup }</code>, an <code>AfterRenderRef</code> return value, browser only, and registration in an [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

## 4. The Four Phases

📌 **Interview term: Render phases** — the four keys of the spec object, which the typings say always run in this order after a render:

| Order | Phase | Allowed | Typings guidance |
| :--- | :--- | :--- | :--- |
| 1 | <code>earlyRead</code> | Read the DOM | Only when a later <code>write</code> depends on the reading; prefer <code>read</code> |
| 2 | <code>write</code> | Write the DOM | "Never read from the DOM in this phase" |
| 3 | <code>mixedReadWrite</code> | Both | Avoid if the work can be split; plain callbacks land here |
| 4 | <code>read</code> | Read the DOM | "Never write to the DOM in this phase" |

📌 **Interview term: Phase pipelining** — "Each subsequent phase callback in this spec will receive the return value of the previously run phase callback as a parameter." That lets one spec measure in <code>earlyRead</code>, apply in <code>write</code>, and so on, without storing intermediate state on the class.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 300" role="img" aria-label="Four phases in order earlyRead, write, mixedReadWrite, read, each passing its return value to the next; afterNextRender runs the chain once, afterEveryRender after every render">
  <defs>
    <marker id="ar4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="160" height="64" rx="10"/>
  <text class="d-text" x="100" y="68" text-anchor="middle">1. earlyRead</text>
  <text class="d-sub" x="100" y="90" text-anchor="middle">measure first</text>
  <path class="d-edge-accent" d="M 184 72 L 222 72" marker-end="url(#ar4-arrow)"/>
  <rect class="d-box-accent" x="226" y="40" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="306" y="68" text-anchor="middle">2. write</text>
  <text class="d-sub" x="306" y="90" text-anchor="middle">gets earlyRead value</text>
  <path class="d-edge-accent" d="M 390 72 L 428 72" marker-end="url(#ar4-arrow)"/>
  <rect class="d-box-muted" x="432" y="40" width="160" height="64" rx="10"/>
  <text class="d-text" x="512" y="68" text-anchor="middle">3. mixedReadWrite</text>
  <text class="d-sub" x="512" y="90" text-anchor="middle">plain callbacks</text>
  <path class="d-edge-accent" d="M 596 72 L 634 72" marker-end="url(#ar4-arrow)"/>
  <rect class="d-box-accent" x="638" y="40" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="718" y="68" text-anchor="middle">4. read</text>
  <text class="d-sub" x="718" y="90" text-anchor="middle">measure the result</text>
  <rect class="d-box-muted" x="60" y="170" width="300" height="80" rx="10"/>
  <text class="d-text" x="210" y="202" text-anchor="middle">afterNextRender</text>
  <text class="d-sub" x="210" y="226" text-anchor="middle">runs this chain once</text>
  <rect class="d-box-accent" x="460" y="170" width="300" height="80" rx="10"/>
  <text class="d-text d-accent" x="610" y="202" text-anchor="middle">afterEveryRender</text>
  <text class="d-sub" x="610" y="226" text-anchor="middle">runs it after every app render</text>
  <path class="d-edge-dashed" d="M 210 166 L 210 110" marker-end="url(#ar4-arrow)"/>
  <path class="d-edge-dashed" d="M 610 166 L 610 110" marker-end="url(#ar4-arrow)"/>
</svg>

Both hooks feed the same four-phase pipeline; they only differ in how many times they enter it. The phases are a scheduling contract between you and Angular, and the typings are explicit that "Angular is unable to verify or enforce that phases are used correctly".

## 5. Verified: Phases, Pipelining and "Every Render"

The runnable example registers, in the root component, a fully phased <code>afterNextRender</code>, an <code>afterEveryRender</code> with only a <code>read</code> phase, and an <code>afterRenderEffect</code>. A child component, <code>quiet-panel</code>, whose own state never changes, registers a plain <code>afterEveryRender</code> callback. First render:

\`\`\`
--- first render ---
  once: earlyRead
  once: write got 100px
  quiet-panel afterEveryRender
  once: mixedReadWrite got styled
  effect: width signal = 100
  once: read got 3
  every: read width = 100px
\`\`\`

Three things to read off this:

1. **Pipelining works**: <code>earlyRead</code> returned the width, <code>write</code> received <code>100px</code>; <code>write</code> returned <code>"styled"</code>, <code>mixedReadWrite</code> received it; it returned <code>3</code>, <code>read</code> received it.
2. **Phases interleave across components**. The child plain callback (<code>quiet-panel afterEveryRender</code>) ran **between** the root <code>write</code> and the root <code>mixedReadWrite</code>, because a plain callback is a <code>mixedReadWrite</code> callback. Angular ran all writes of all hooks, then all mixed ones, then all reads. That is the anti-thrashing design in action.
3. **Order inside a phase is not something to build on across components.** The typings promise registration order within a phase, yet here the child callback ran before the root <code>mixedReadWrite</code> callback although the root registered first (it is constructed first). The same happened in a separate lifecycle test (child render hooks before parent). Within one component, keep dependent steps in one phased spec instead of relying on order between hooks.

Then two clicks, each starting with an empty log:

\`\`\`
--- grow box ---
  quiet-panel afterEveryRender
  effect: width signal = 150
  every: read width = 150px
--- unrelated change ---
  quiet-panel afterEveryRender
  every: read width = 150px
\`\`\`

- The <code>afterNextRender</code> lines never appear again: **once means once**.
- <code>quiet-panel afterEveryRender</code> ran on **both** clicks, although nothing about that component changed. "Every render" means every application render.
- <code>afterRenderEffect</code> ran for "grow box" (its <code>width</code> signal changed) and **not** for the unrelated change.

## 6. afterRenderEffect: the Third Sibling

📌 **Interview term: afterRenderEffect** — an [effect](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) that runs in the render phases, "only when dirty through signal dependencies", and at least once. It accepts the same phase spec, but each phase receives the previous phase result **as a signal**, plus an <code>onCleanup</code> function.

| | <code>afterNextRender</code> | <code>afterEveryRender</code> | <code>afterRenderEffect</code> |
| :--- | :--- | :--- | :--- |
| Runs | Once | After every app render | After a render, only when its signals changed |
| Value between phases | Plain value | Plain value | Signal of the value |
| Cleanup between runs | Not applicable | No | <code>onCleanup</code> |
| Good for | Init a widget, focus, measure once | Measuring after any change, syncing a library with non-signal state | Syncing a library with signal state |

As verified above, it skipped the unrelated render, which makes it the cheaper choice whenever the work depends only on signals.

## 7. Verified: Stopping and Cleaning Up

Both hooks return an <code>AfterRenderRef</code>. A callback that destroys itself on its second run, then three clicks:

\`\`\`
afterEveryRender run 1
[app] RENDERED: n=0
afterEveryRender run 2
destroyed after run 2
final: n=3
\`\`\`

The app kept rendering (<code>n=3</code>), the callback stopped. Without a manual <code>destroy()</code> the hook is cleaned up with the component through its <code>DestroyRef</code>, unless you register it with <code>{ manualCleanup: true }</code>, in which case cleanup is your job.

## 8. Common Pitfalls

- **Calling it <code>afterRender</code> in v20+ code.** The import fails in 22.2.3; the stable name is <code>afterEveryRender</code>.
- **Writing in <code>read</code> or reading in <code>write</code>.** Angular cannot detect it, and it brings back exactly the forced layouts the phases exist to prevent.
- **Using the plain callback form everywhere.** It lands in <code>mixedReadWrite</code>, which the typings call a performance risk; pick <code>read</code> or <code>write</code> when you can.
- **Assuming <code>afterEveryRender</code> is per component.** It runs after renders caused by any part of the app (verified with <code>quiet-panel</code>). Keep it cheap, or use <code>afterRenderEffect</code>.
- **Updating state on every <code>afterEveryRender</code>.** That schedules another render each time and ends in NG0103 (infinite [change detection](/interview-question/how-does-change-detection-work-in-angular)).
- **Expecting a result on the server.** Neither hook runs during [SSR](/interview-question/what-is-angular-universal-ssr) or prerendering, by design.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The basic difference:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> runs once after the next application render; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRender</code>, which is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender</code> since Angular 20, runs after every application render until it is destroyed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Every render means app-wide:</strong> <span style="color:#f0e2c8;">"It is tied to application renders, not to my component. A component whose state never changes still gets the callback when anything else re-renders."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phases:</strong> <span style="color:#f0e2c8;">"Both take a spec with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">earlyRead</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mixedReadWrite</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code>, always in that order, and each phase receives the previous return value. A plain callback runs in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mixedReadWrite</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why phases exist:</strong> <span style="color:#f0e2c8;">"Angular runs the writes of all components together, then the reads, so DOM reads do not force layout in the middle of writes. Angular cannot enforce it, so I keep reads in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> and writes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The signal variant:</strong> <span style="color:#f0e2c8;">"When the work depends only on signals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> uses the same phases but runs only when those signals change, which is cheaper than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the write phase receive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The return value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">earlyRead</code> if that phase is defined, otherwise nothing. Each phase gets the value of the closest earlier phase that exists, which the typings model with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵFirstAvailable</code> helper type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what phase does a plain afterEveryRender callback run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mixedReadWrite</code>. Verified: a plain callback from another component ran between the root <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mixedReadWrite</code> callbacks of the same render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you measure an element after every update without thrashing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEveryRender({ read: () =&gt; el.getBoundingClientRect() })</code>. If the measurement drives a style change, measure in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">earlyRead</code> and apply in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code>, using the pipelined value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is afterRenderEffect different from effect()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> runs as part of change detection scheduling; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterRenderEffect</code> runs after rendering in the DOM phases, receives previous phase values as signals, and is meant for DOM work driven by signals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you stop an afterEveryRender early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destroy()</code> on the returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AfterRenderRef</code>. Verified: the callback stopped after its second run while the app kept rendering.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **afterNextRender** | Render callbacks that run once |
| **afterEveryRender** | Render callbacks after every app render (old name <code>afterRender</code>) |
| **Application render** | One Angular pass that refreshes dirty views and flushes the DOM |
| **Render phases** | <code>earlyRead</code>, <code>write</code>, <code>mixedReadWrite</code>, <code>read</code>, in that order |
| **Phase pipelining** | Each phase receives the previous phase return value |
| **Layout thrashing** | Interleaved DOM reads and writes forcing repeated layout |
| **afterRenderEffect** | Signal-driven effect that runs in the render phases |
| **AfterRenderRef** | Handle returned by the hooks; <code>destroy()</code> stops them |

---
**Conclusion:** the one-line answer is "once versus after every render", and the interview answer is everything behind it. <code>afterRender</code> is now <code>afterEveryRender</code> (22.2.3 has no other name), and "every render" is application-wide: verified, a component with unchanged state still got the callback on every click. Both hooks feed a four-phase pipeline, <code>earlyRead</code>, <code>write</code>, <code>mixedReadWrite</code>, <code>read</code>, scheduled across all components so reads and writes are grouped, with each phase receiving the previous value. When the work only depends on signals, <code>afterRenderEffect</code> gives the same phases and skips renders that did not touch those signals.`,
    examples: [
      {
        label: "Phased afterNextRender, app-wide afterEveryRender and a signal-driven afterRenderEffect",
        tech: "angular",
        runnable: true,
        code: `import { Component, ElementRef, ViewChild, afterEveryRender, afterNextRender, afterRenderEffect, signal } from "@angular/core";

const calls: string[] = [];

@Component({
  selector: "quiet-panel",
  template: \`<p>quiet panel (its own state never changes)</p>\`,
})
export class QuietPanelComponent {
  constructor() {
    afterEveryRender(() => calls.push("quiet-panel afterEveryRender"));
  }
}

@Component({
  selector: "app-root",
  imports: [QuietPanelComponent],
  template: \`
    <div #box [style.width.px]="width()">box</div>
    <quiet-panel />
    <button (click)="calls.length = 0; width.set(width() + 50)">grow box</button>
    <button (click)="calls.length = 0; other.set(other() + 1)">unrelated change {{ other() }}</button>
    <button (click)="lines.set(calls.slice())">show log</button>
    <ol>
      @for (line of lines(); track $index) { <li>{{ line }}</li> }
    </ol>\`,
})
export class AppComponent {
  @ViewChild("box") box!: ElementRef<HTMLElement>;
  width = signal(100);
  other = signal(0);
  calls = calls;
  lines = signal<string[]>([]);

  constructor() {
    // Runs ONCE. Each phase receives what the previous phase returned.
    afterNextRender({
      earlyRead: () => { calls.push("once: earlyRead"); return this.box.nativeElement.style.width; },
      write: (w) => { calls.push(\`once: write got \${w}\`); return "styled"; },
      mixedReadWrite: (s) => { calls.push(\`once: mixedReadWrite got \${s}\`); return 3; },
      read: (n) => calls.push(\`once: read got \${n}\`),
    });
    // Runs after EVERY application render, whatever caused it.
    afterEveryRender({
      read: () => calls.push(\`every: read width = \${this.box.nativeElement.style.width}\`),
    });
    // Runs after render only when a signal it read has changed.
    afterRenderEffect(() => calls.push(\`effect: width signal = \${this.width()}\`));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are @ViewChild and @ContentChild?",
    seoDescription:
      "@ViewChild queries a component's own template, @ContentChild its projected content. When each is set, the read option and static true vs false, verified.",
    description: `**Question presented to candidate:**
"What are @ViewChild and @ContentChild? Using a tabs component as the example, tell me what each one can see, when its value is available, and what the static option does."

**What a strong answer should cover:**
- Both are **queries**: a decorator on a property that Angular fills with a match from the template.
- \`@ViewChild\` searches the component's **own template**; \`@ContentChild\` searches the **projected content** the parent placed between its tags.
- **Timing**: dynamic results are set before \`ngAfterViewInit\` / \`ngAfterContentInit\`; \`static: true\` resolves before \`ngOnInit\` but never updates, and is only valid for elements not inside \`@if\` / \`@for\`.
- Locators: a template reference name (\`'title'\`), a component or directive class, or a provider token; \`read\` picks what to return (\`ElementRef\`, \`TemplateRef\`, \`ViewContainerRef\`, a directive).
- A component template is a black box: content queries do not see inside other components' templates; \`descendants\` controls nested matches.
- The signal versions \`viewChild()\` / \`contentChild()\` are the modern equivalent.

**Clarifying questions expected:**
- "Is the element always rendered, or inside an \`@if\`?"
- "Do you need the DOM element or the component instance?"

**Code / implementation expected:** Yes — a component that queries both its own template and its projected content and logs when each is available.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who have used <code>#ref</code> in a template and want to reach that element, or a child component, from the class.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every "Verified" block was compiled with <code>ngc</code> (strict templates) on Angular 22.2.3 and run; the decorator options are quoted from the installed typings.

## 1. Why This Even Matters — A Story First

You run a gift shop and you are wrapping a present. Two kinds of things are on your table:

- **Your own supplies**: the box, the paper, the ribbon. You chose them; they are part of how you wrap.
- **The customer's item**: a mug they handed you to put inside. You did not choose it, you just make room for it.

If your manager asks "what colour is the ribbon?", you look at your own supplies. If they ask "is the mug chipped?", you look at what the customer brought. Two different places to look.

A component has the same two places. Its **view** is its own template (the box and ribbon). Its **content** is whatever the parent put between its tags and it shows with [<code>&lt;ng-content&gt;</code>](/interview-question/what-is-content-projection-and-ng-content) (the customer's mug). <code>@ViewChild</code> looks in the first place, <code>@ContentChild</code> in the second.

## 2. The Core Idea

📌 **Interview term: Query** — a property Angular fills with something it finds in a template: an element, a component instance, a [directive](/interview-question/what-is-a-directive-and-what-are-the-types), a <code>TemplateRef</code>. You describe what to find with a **locator**.

📌 **Interview term: @ViewChild** — a property decorator that configures a **view query**: "the first element or the directive matching the selector in the view DOM" of **this component's own template** (wording from the 22.2.3 typings).

📌 **Interview term: @ContentChild** — a property decorator that configures a **content query**: the first match inside the **projected content**, what the parent put between this component's tags. The typings add that it "does not retrieve elements or directives that are in other components' templates, since a component's template is always a black box to its ancestors".

📌 **Interview term: Locator** — what to search for. Accepted by both decorators:

| Locator | Example | Finds |
| :--- | :--- | :--- |
| A [template reference name](/interview-question/what-are-template-reference-variables) | <code>@ViewChild("search")</code> | The element or component marked <code>#search</code> |
| A component or directive class | <code>@ViewChild(ChartComponent)</code> | The first instance of it |
| A provider token | <code>@ViewChild(SomeService)</code> | That provider from the child injector |
| <code>TemplateRef</code> | <code>@ContentChild(TemplateRef)</code> | The first [<code>&lt;ng-template&gt;</code>](/interview-question/what-are-ng-container-and-ng-template) |

📌 **Interview term: read option** — changes **what** you get back for the match: <code>{ read: ElementRef }</code>, <code>TemplateRef</code>, <code>ViewContainerRef</code>, a directive class, or a token. Verified: <code>@ViewChild(TabBoxComponent, { read: ElementRef })</code> returned the host element (<code>TAB-BOX</code>) instead of the component instance. For what those three "Ref" types are, see [ElementRef, TemplateRef and ViewContainerRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref).

## 3. Where Each Query Looks

<svg class="iq-diagram" width="100%" viewBox="0 0 780 360" role="img" aria-label="Parent template projects an h3 into tab-box; ContentChild in tab-box finds the projected h3, ViewChild in tab-box finds only its own header">
  <defs>
    <marker id="vc5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="340" height="300" rx="12"/>
  <text class="d-sub" x="190" y="46" text-anchor="middle">PARENT TEMPLATE (app-root)</text>
  <rect class="d-box" x="50" y="70" width="280" height="200" rx="10"/>
  <text class="d-text" x="190" y="98" text-anchor="middle">tab-box element</text>
  <rect class="d-box-accent" x="80" y="130" width="220" height="50" rx="8"/>
  <text class="d-text d-accent" x="190" y="160" text-anchor="middle">h3 #heading</text>
  <text class="d-sub" x="190" y="222" text-anchor="middle">projected content</text>
  <rect class="d-box-muted" x="430" y="20" width="330" height="300" rx="12"/>
  <text class="d-sub" x="595" y="46" text-anchor="middle">TAB-BOX OWN TEMPLATE</text>
  <rect class="d-box" x="460" y="80" width="270" height="50" rx="8"/>
  <text class="d-text" x="595" y="110" text-anchor="middle">header #frame</text>
  <rect class="d-box" x="460" y="170" width="270" height="50" rx="8"/>
  <text class="d-text" x="595" y="200" text-anchor="middle">ng-content slot</text>
  <path class="d-edge-accent" d="M 456 195 L 304 158" marker-end="url(#vc5-arrow)"/>
  <text class="d-sub" x="595" y="266" text-anchor="middle">ContentChild: the h3</text>
  <text class="d-sub" x="595" y="292" text-anchor="middle">ViewChild: only #frame</text>
</svg>

The projected <code>h3</code> is written in the parent template, so it belongs to the parent view: the parent can reach it with <code>@ViewChild</code>, and <code>tab-box</code> can reach it only with <code>@ContentChild</code>. The <code>header</code> lives in <code>tab-box</code> own template, so only <code>tab-box</code> <code>@ViewChild</code> sees it.

## 4. Verified: Who Sees What, and When

The runnable example is exactly that diagram, plus two <code>tabItem</code> directives (one nested inside a <code>div</code>). <code>tab-box</code> records what each query holds in its content and view hooks:

\`\`\`
ngAfterContentInit: @ContentChild heading = "Settings"
ngAfterContentInit: @ViewChild frame = undefined (view not built yet)
@ContentChildren default: general
@ContentChildren descendants: general, nested
ngAfterViewInit: @ViewChild frame = "[tab-box frame]"
ngAfterViewInit: @ViewChild heading = undefined (it is projected content)
\`\`\`

- The content query was ready in <code>ngAfterContentInit</code>. The view query was **not** ready yet at that moment, and was ready in <code>ngAfterViewInit</code>. That matches the hook order in [Angular lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks): content first, view later.
- <code>@ViewChild("heading")</code> inside <code>tab-box</code> found nothing, because the heading is projected content.
- The plural <code>@ContentChildren</code> by default only matched the direct child; with <code>descendants: true</code> it also found the nested one. (Singular <code>@ContentChild</code> defaults to <code>descendants: true</code>, per the typings.) Plural queries are their own topic: [@ViewChildren vs @ViewChild](/interview-question/what-is-the-difference-between-viewchildren-and-viewchild).

From the parent side, a separate check:

\`\`\`
parent @ViewChild heading: Settings
@ViewChild with two #dup matches: first
by class: TabBoxComponent | read ElementRef: TAB-BOX
\`\`\`

(The class name printed with a bundler prefix, trimmed here.) The parent sees the projected heading with a plain <code>@ViewChild</code>, and when two elements match, <code>@ViewChild</code> returns the **first** in template order.

## 5. static: true vs static: false

📌 **Interview term: static option** — the typings define it as "<code>true</code> to resolve query results before [change detection](/interview-question/how-does-change-detection-work-in-angular) runs, <code>false</code> to resolve after change detection. Defaults to <code>false</code>." Static results are never updated afterwards.

Verified with four queries (one element always present, one inside an [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir)), each declared static and dynamic:

\`\`\`
constructor      staticAlways=undefined   | dynamicAlways=undefined   | staticMaybe=undefined | dynamicMaybe=undefined
ngOnInit         staticAlways=always here | dynamicAlways=undefined   | staticMaybe=undefined | dynamicMaybe=undefined
ngAfterViewInit  staticAlways=always here | dynamicAlways=always here | staticMaybe=undefined | dynamicMaybe=inside the if block
after toggle off staticAlways=always here | dynamicAlways=always here | staticMaybe=undefined | dynamicMaybe=undefined
after toggle on  staticAlways=always here | dynamicAlways=always here | staticMaybe=undefined | dynamicMaybe=inside the if block
\`\`\`

(<code>ViewChildren</code> counts from the same run are left out.) The pattern:

| | Ready in <code>ngOnInit</code> | Ready in <code>ngAfterViewInit</code> | Follows <code>@if</code> changes |
| :--- | :--- | :--- | :--- |
| <code>static: true</code>, element always there | **Yes** | Yes | Not applicable |
| <code>static: false</code> (default) | No | Yes | **Yes** |
| <code>static: true</code>, element inside <code>@if</code> | No | **No, never** | No |

So <code>static: true</code> is only for elements that are always in the template, when you need them in <code>ngOnInit</code> (for example, to create an embedded view early). Inside <code>@if</code> or <code>@for</code> it silently stays <code>undefined</code>, with no error. Nothing is ever ready in the constructor.

## 6. Signal Queries in One Paragraph

Since Angular 19 the stable, preferred form is the function API: <code>viewChild()</code>, <code>contentChild()</code>, with <code>.required</code> variants. They return [signals](/interview-question/what-are-angular-signals), update automatically, have no <code>static</code> option, and work with [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) and [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) instead of lifecycle hooks. The full comparison, including compiled output and the NG0951 required-query error, is in [viewChild() signal queries vs @ViewChild](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed). The decorators are not deprecated and remain common in existing code.

## 7. Common Pitfalls

- **Reading a dynamic query in [<code>ngOnInit</code>](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit).** Verified <code>undefined</code>. Use <code>ngAfterViewInit</code> / <code>ngAfterContentInit</code>, <code>static: true</code> for always-present elements, or a signal query.
- **Using <code>@ViewChild</code> for projected content.** The child component cannot see it with a view query (verified <code>undefined</code>); use <code>@ContentChild</code>.
- **<code>static: true</code> on something inside <code>@if</code>.** It is never set, silently.
- **Expecting a content query to see inside another component template.** Templates are black boxes; query the inner component, then ask it.
- **Getting the component when you wanted the element.** Add <code>{ read: ElementRef }</code>.
- **Mutating the DOM through the result.** Prefer bindings; when you must, use <code>Renderer2</code> (see [why Renderer2](/interview-question/why-use-renderer2-instead-of-direct-dom-access)).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild</code> are query decorators: Angular fills the property with the first match for a locator, like a template reference name or a component class."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Where they look:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> searches the component own template. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild</code> searches the content the parent projected through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-content</code>. A projected element is only visible to the child through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When they are ready:</strong> <span style="color:#f0e2c8;">"Content queries are set before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterContentInit</code>, view queries before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>. Nothing is available in the constructor, and dynamic queries are not available in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. static:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static: true</code> resolves before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> but never updates, so it is only for elements that are always present; inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> it stays undefined forever."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern form:</strong> <span style="color:#f0e2c8;">"In current Angular I use the signal versions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChild()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentChild()</code>, which update automatically and work with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>; the decorators still work."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the read option do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It changes what you get for the match. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild(MyComponent, { read: ElementRef })</code> gives the host element instead of the instance; you can also read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code> or a directive on that element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two elements match a @ViewChild?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You get the first one in template order. Verified with two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#dup</code> elements. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code> to get all of them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a parent reach an element it projects into a child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code>, because that element is written in the parent template and belongs to the parent view. The child reaches the same element with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChild</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a @ContentChild query return undefined?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The element is nested inside another component template (a black box), the locator name is wrong, or you read it before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterContentInit</code>. Plural <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ContentChildren</code> also skips nested matches unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">descendants: true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use static: true today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely: when an always-present element or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> is needed in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>, for example to create an embedded view before the first check. Signal queries removed most of these cases.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Query** | A property Angular fills with a match from a template |
| **@ViewChild** | First match in the component own template |
| **@ContentChild** | First match in the projected content |
| **Locator** | What to search for: a ref name, a class, a token |
| **read** | What to return for the match: element, template, container, directive |
| **static** | Resolve before <code>ngOnInit</code> and never update |
| **descendants** | Whether content queries look into nested elements |

---
**Conclusion:** <code>@ViewChild</code> and <code>@ContentChild</code> are two queries that differ only in where they look: the component own template, or the content its parent projected. Verified on 22.2.3, the content query was ready at <code>ngAfterContentInit</code> while the view query was not ready until <code>ngAfterViewInit</code>, a child cannot see projected content with a view query, and <code>static: true</code> makes an always-present element available in <code>ngOnInit</code> but leaves anything inside <code>@if</code> undefined forever. Use <code>read</code> to choose between element, template and instance, and in new code prefer the signal queries that make the timing question disappear.`,
    examples: [
      {
        label: "A tab box querying its own template and its projected content",
        tech: "angular",
        runnable: true,
        code: `import {
  AfterContentInit, AfterViewInit, Component, ContentChild, ContentChildren, Directive,
  ElementRef, Input, QueryList, ViewChild, signal,
} from "@angular/core";

@Directive({ selector: "[tabItem]" })
export class TabItemDirective {
  @Input() tabItem = "";
}

@Component({
  selector: "tab-box",
  template: \`
    <header #frame>[tab-box frame]</header>
    <ng-content />
    <ul>
      @for (line of report(); track $index) { <li>{{ line }}</li> }
    </ul>\`,
})
export class TabBoxComponent implements AfterContentInit, AfterViewInit {
  // Content queries look at what the PARENT put between <tab-box> tags.
  @ContentChild("heading") heading?: ElementRef<HTMLElement>;
  @ContentChildren(TabItemDirective) direct!: QueryList<TabItemDirective>;
  @ContentChildren(TabItemDirective, { descendants: true }) all!: QueryList<TabItemDirective>;
  // View queries look only at THIS component's own template.
  @ViewChild("frame") frame?: ElementRef<HTMLElement>;
  @ViewChild("heading") headingFromView?: ElementRef<HTMLElement>;

  report = signal<string[]>([]);
  private lines: string[] = [];

  ngAfterContentInit() {
    this.lines.push(\`ngAfterContentInit: @ContentChild heading = "\${this.heading?.nativeElement.textContent}"\`);
    this.lines.push(\`ngAfterContentInit: @ViewChild frame = \${this.frame ? "ready" : "undefined (view not built yet)"}\`);
    this.lines.push(\`@ContentChildren default: \${this.direct.map((t) => t.tabItem).join(", ")}\`);
    this.lines.push(\`@ContentChildren descendants: \${this.all.map((t) => t.tabItem).join(", ")}\`);
  }

  ngAfterViewInit() {
    this.lines.push(\`ngAfterViewInit: @ViewChild frame = "\${this.frame?.nativeElement.textContent}"\`);
    this.lines.push(\`ngAfterViewInit: @ViewChild heading = \${this.headingFromView ? "found" : "undefined (it is projected content)"}\`);
    this.report.set(this.lines);
  }
}

@Component({
  selector: "app-root",
  imports: [TabBoxComponent, TabItemDirective],
  template: \`
    <tab-box>
      <h3 #heading>Settings</h3>
      <span tabItem="general">General</span>
      <div><span tabItem="nested">Nested</span></div>
    </tab-box>\`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between @ViewChildren and @ViewChild?",
    seoDescription:
      "@ViewChild returns the first match, @ViewChildren a live QueryList of all. QueryList.changes, read, why static is not allowed, and the compiled query.",
    description: `**Question presented to candidate:**
"You have a list of item components rendered with @for. When would you use @ViewChild and when @ViewChildren to reach them, what type does each give you, and how do you react when items are added or removed?"

**What a strong answer should cover:**
- \`@ViewChild\` returns the **first** match (or \`undefined\`); \`@ViewChildren\` returns **all** matches as a \`QueryList\`.
- **QueryList**: \`length\`, \`first\`, \`last\`, \`toArray()\`, \`forEach\`/\`map\`/\`filter\`, and the **\`changes\`** observable that emits when the set of matches changes.
- Both are **live** for dynamic (\`@if\` / \`@for\`) content and are first ready in \`ngAfterViewInit\`; only \`@ViewChild\` has a \`static\` option (passing it to \`@ViewChildren\` is a type error).
- Same locators and \`read\` option for both; under the hood \`@ViewChild\` is the same query with \`.first\` taken.
- Subscribe to \`changes\` in \`ngAfterViewInit\` and clean up; with signal queries, \`viewChildren()\` returns a signal of a readonly array instead.
- Do not keep a stale reference to \`first\`: it can change as items are added or removed.

**Clarifying questions expected:**
- "Do I need the component instances or the DOM elements?"
- "Can the list change at runtime, or is it fixed?"

**Code / implementation expected:** Yes — a list where one button acts on the \`@ViewChild\` result and another on every \`@ViewChildren\` result.`,
    answer: `**Target Audience:** Developers who know <code>@ViewChild</code> and need to work with a list of matches: several inputs, a <code>@for</code> of child components, a set of tabs.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every "Verified" block was compiled with <code>ngc</code> (strict templates) on Angular 22.2.3 and run; compiled output was read from <code>ngc</code> itself.

## 1. Why This Even Matters — A Story First

A teacher walks into a classroom. There are two very different requests she can make:

- "**Whoever is at the front desk**, please hand out the worksheets." One person, whoever sits there right now.
- "**Everyone**, hand in your homework." The whole class, and if a student joins late, they are part of "everyone" too.

The first request is <code>@ViewChild</code>: one result, the first match. The second is <code>@ViewChildren</code>: the full, up-to-date list. And because students come and go (items added to a [<code>@for</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir), an <code>@if</code> toggling), the "everyone" list has to keep itself current, which is what a <code>QueryList</code> does. The basics of queries (view vs content, <code>read</code>, <code>static</code>) are covered in [@ViewChild and @ContentChild](/interview-question/what-are-viewchild-and-contentchild); this doc is about one versus many.

## 2. The Core Idea

📌 **Interview term: @ViewChild** — a view query that returns the **first** match in the component template, or <code>undefined</code> if nothing matches.

📌 **Interview term: @ViewChildren** — a view query that returns **every** match as a <code>QueryList</code>, in template order, kept up to date as the view changes.

📌 **Interview term: QueryList** — Angular live collection of query results. The useful members:

| Member | What it gives |
| :--- | :--- |
| <code>length</code> | Number of matches |
| <code>first</code> / <code>last</code> | First and last match |
| <code>toArray()</code> | A plain array copy |
| <code>forEach</code>, <code>map</code>, <code>filter</code>, <code>find</code>, <code>some</code> | Array-style helpers |
| <code>changes</code> | An Observable that emits when the set of matches changes |
| <code>get(index)</code> | Match at a position |

Both decorators accept the same locators (a [template reference](/interview-question/what-are-template-reference-variables) name, a class, a token) and the same <code>read</code> option. The options differ:

| Option | <code>@ViewChild</code> | <code>@ViewChildren</code> |
| :--- | :--- | :--- |
| <code>read</code> | Yes | Yes |
| <code>static</code> | Yes | **No** (type error, verified) |
| <code>emitDistinctChangesOnly</code> | No | Yes, but **deprecated** in the 22.2.3 typings ("will be permanently set to true") |

Verified: <code>@ViewChildren("row", { static: true })</code> fails to compile with <code>TS2353: Object literal may only specify known properties, and 'static' does not exist in type '{ read?: any; emitDistinctChangesOnly?: boolean | undefined; }'</code>. A list that can grow cannot be resolved "once, before [change detection](/interview-question/how-does-change-detection-work-in-angular)".

## 3. Under the Hood: They Are the Same Query

Compiling a component with <code>@ViewChild("row") one</code> and <code>@ViewChildren("row") all</code> on two <code>#row</code> elements, the generated view-query function contains:

\`\`\`
i0.ɵɵviewQuery(_c0, 5)(_c0, 5);
...
i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.one = _t.first);
i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.all = _t);
\`\`\`

Both are registered as the same kind of view query. The only difference is the assignment: <code>@ViewChild</code> stores <code>_t.first</code>, <code>@ViewChildren</code> stores the whole <code>QueryList</code>. That one line explains the "first match" rule and why both update at the same moments. (More on how templates become these instructions: [Ivy compilation](/interview-question/how-does-compilation-work-under-the-hood-in-ivy).)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="One view query collects all matches into a QueryList; ViewChildren stores the whole list, ViewChild stores only the first entry">
  <defs>
    <marker id="vc6-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="200" height="200" rx="12"/>
  <text class="d-sub" x="120" y="66" text-anchor="middle">TEMPLATE</text>
  <rect class="d-box" x="45" y="84" width="150" height="38" rx="8"/>
  <text class="d-text" x="120" y="108" text-anchor="middle">todo-item 1</text>
  <rect class="d-box" x="45" y="134" width="150" height="38" rx="8"/>
  <text class="d-text" x="120" y="158" text-anchor="middle">todo-item 2</text>
  <rect class="d-box" x="45" y="184" width="150" height="38" rx="8"/>
  <text class="d-text" x="120" y="208" text-anchor="middle">todo-item 3</text>
  <path class="d-edge" d="M 224 140 L 286 140" marker-end="url(#vc6-arrow)"/>
  <rect class="d-box-accent" x="290" y="100" width="180" height="80" rx="10"/>
  <text class="d-text d-accent" x="380" y="134" text-anchor="middle">QueryList</text>
  <text class="d-sub" x="380" y="158" text-anchor="middle">all matches, live</text>
  <path class="d-edge-accent" d="M 474 120 L 536 76" marker-end="url(#vc6-arrow)"/>
  <path class="d-edge" d="M 474 160 L 536 204" marker-end="url(#vc6-arrow)"/>
  <rect class="d-box-accent" x="540" y="40" width="200" height="64" rx="10"/>
  <text class="d-text d-accent" x="640" y="68" text-anchor="middle">@ViewChildren</text>
  <text class="d-sub" x="640" y="90" text-anchor="middle">the whole list</text>
  <rect class="d-box" x="540" y="176" width="200" height="64" rx="10"/>
  <text class="d-text" x="640" y="204" text-anchor="middle">@ViewChild</text>
  <text class="d-sub" x="640" y="226" text-anchor="middle">only list.first</text>
</svg>

When a fourth item appears, the <code>QueryList</code> gains an entry and <code>changes</code> emits; the <code>@ViewChild</code> property is re-assigned from <code>first</code>, which here stays item 1.

## 4. Verified: One vs All in a Live List

The runnable example renders <code>todo-item</code> components with <code>@for</code>. One button calls a method on the <code>@ViewChild</code> result, one loops over the <code>@ViewChildren</code> result, and one adds an item. The status line is written from <code>ngAfterViewInit</code> and from a <code>changes</code> subscription (elements run together where the list renders):

\`\`\`
read: ElementRef -> todo-item, todo-item
initial            | item 1 / item 2 | ngAfterViewInit: 2 items, first = "item 1", last = "item 2"
@ViewChild         | item 1 (highlighted) / item 2 | ngAfterViewInit: 2 items, first = "item 1", last = "item 2"
add item           | item 1 (highlighted) / item 2 / item 3 | items.changes: 3 items, first = "item 1", last = "item 3"
@ViewChildren      | item 1 (highlighted) / item 2 (highlighted) / item 3 (highlighted) | items.changes: 3 items, first = "item 1", last = "item 3"
\`\`\`

- <code>@ViewChild(TodoItemComponent)</code> highlighted only the first item.
- Adding an item made the <code>QueryList</code> grow to 3 and fired <code>changes</code>, with <code>last</code> now item 3.
- Looping over <code>@ViewChildren</code> after the add reached the new item too: the list is live.
- A second query on the same elements with [<code>{ read: ElementRef }</code>](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref) returned the host elements instead of the component instances.

## 5. Verified: A Subtle Ordering Detail

Queries are refreshed one at a time, in declaration order. A probe logged both counts inside each query <code>changes</code> callback when the third item was added:

\`\`\`
in items.changes: items 3 hosts 2
in hosts.changes: items 3 hosts 3
\`\`\`

Inside the <code>changes</code> callback of the first query, the second query (declared later, same elements, <code>read: ElementRef</code>) still had the **old** result. If a <code>changes</code> handler needs several queries, read them after the refresh finishes (for example in <code>ngAfterViewChecked</code> or a render hook), or use one query and derive the rest. The signal form avoids this class of problem, because a <code>computed()</code> reads the final values.

## 6. Signal Version

With [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed) the same pair becomes:

\`\`\`ts
first = viewChild(TodoItemComponent);           // Signal<TodoItemComponent | undefined>
items = viewChildren(TodoItemComponent);        // Signal<readonly TodoItemComponent[]>
count = computed(() => this.items().length);    // no changes subscription needed
\`\`\`

<code>viewChildren()</code> returns a [signal](/interview-question/what-are-angular-signals) of a plain **readonly array**, not a <code>QueryList</code>, so there is no <code>changes</code> Observable to subscribe to or [unsubscribe from](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions); you derive with [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) or react with [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

| | <code>@ViewChildren</code> | <code>viewChildren()</code> |
| :--- | :--- | :--- |
| Type | <code>QueryList&lt;T&gt;</code> | <code>Signal&lt;readonly T[]&gt;</code> |
| React to changes | <code>list.changes.subscribe(...)</code> | <code>computed</code> / <code>effect</code> |
| First available | <code>ngAfterViewInit</code> | Reading the signal; empty array before the view exists |
| Runs in the site playground | Yes | No (needs the Angular compiler) |

## 7. Common Pitfalls

- **Expecting <code>@ViewChild</code> to give you all matches.** It gives the first one only; that is literally <code>_t.first</code> in the compiled code.
- **Subscribing to <code>changes</code> in [<code>ngOnInit</code>](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit).** The <code>QueryList</code> is not assigned yet; subscribe in <code>ngAfterViewInit</code>, and clean up with <code>takeUntilDestroyed</code> or <code>DestroyRef</code>.
- **Expecting <code>changes</code> to emit for the initial results.** It emits on later changes; handle the initial list in <code>ngAfterViewInit</code> (as the example does).
- **Reading another query inside a <code>changes</code> callback.** It may not be refreshed yet (verified: 3 vs 2).
- **Storing <code>list.first</code> in a field.** The first match can change as items move; read it when you need it.
- **Passing <code>static</code> to <code>@ViewChildren</code>.** Compile error (TS2353).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One vs many:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> gives the first match in my template, or undefined. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code> gives every match as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QueryList</code>, in template order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. QueryList:</strong> <span style="color:#f0e2c8;">"It is a live collection: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toArray</code>, array helpers, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">changes</code> Observable that emits when matches are added or removed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timing:</strong> <span style="color:#f0e2c8;">"Both are ready in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> and follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> changes. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static</code>; on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code> it is a compile error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Under the hood:</strong> <span style="color:#f0e2c8;">"They compile to the same view query; the only difference is that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild</code> assigns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChildren</code> assigns the whole list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern form:</strong> <span style="color:#f0e2c8;">"With signals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChildren()</code> returns a signal of a readonly array, so I derive with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> instead of subscribing to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">changes</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you react when an item is added to a @for list you query?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subscribe to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queryList.changes</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>, tied to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChildren()</code> you just use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed(() =&gt; this.items().length)</code> or an effect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you get DOM elements instead of component instances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ read: ElementRef }</code>. Verified: the same locator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read: ElementRef</code> returned the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">todo-item</code> host elements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does QueryList.changes emit on the first render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it emits when the set of results changes afterwards. Handle the initial list in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is emitDistinctChangesOnly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An option that makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">changes</code> emit only when the results really changed. The 22.2.3 typings mark it deprecated and say it will be permanently true, so do not pass it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is @ViewChildren the wrong tool?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you only need data, not instances: keep the state in the parent and pass it down with inputs. Reaching into children to call methods is a coupling smell, best for focus, scroll or measuring.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **@ViewChild** | First match in the component template |
| **@ViewChildren** | All matches, as a live <code>QueryList</code> |
| **QueryList** | Live collection with <code>first</code>, <code>last</code>, <code>length</code>, <code>changes</code> |
| **changes** | Observable that emits when the set of matches changes |
| **viewChildren()** | Signal form; returns <code>Signal&lt;readonly T[]&gt;</code> |
| **emitDistinctChangesOnly** | Deprecated option controlling when <code>changes</code> emits |

---
**Conclusion:** <code>@ViewChild</code> and <code>@ViewChildren</code> are one query with two outputs: the compiled code assigns <code>first</code> to one and the whole <code>QueryList</code> to the other. Verified on 22.2.3, the list stayed live as items were added (3 items, <code>changes</code> fired, the loop reached the new item), <code>@ViewChild</code> kept pointing at the first match, <code>static</code> is a compile error on the plural form, and sibling queries refresh one at a time. In new code <code>viewChildren()</code> gives the same list as a signal, and <code>computed()</code> replaces the <code>changes</code> subscription.`,
    examples: [
      {
        label: "One vs all: highlight the @ViewChild result or every @ViewChildren result in a live list",
        tech: "angular",
        runnable: true,
        code: `import { AfterViewInit, Component, ElementRef, Input, QueryList, ViewChild, ViewChildren, signal } from "@angular/core";

@Component({
  selector: "todo-item",
  template: \`<li [class.hot]="hot()">{{ label }}{{ hot() ? " (highlighted)" : "" }}</li>\`,
})
export class TodoItemComponent {
  @Input() label = "";
  hot = signal(false);
}

@Component({
  selector: "app-root",
  imports: [TodoItemComponent],
  template: \`
    <ul>
      @for (t of todos(); track t) { <todo-item #item [label]="t" /> }
    </ul>
    <button (click)="first.hot.set(true)">highlight @ViewChild</button>
    <button (click)="highlightAll()">highlight @ViewChildren</button>
    <button (click)="todos.set([...todos(), 'item ' + (todos().length + 1)])">add item</button>
    <p>{{ status() }}</p>\`,
})
export class AppComponent implements AfterViewInit {
  todos = signal(["item 1", "item 2"]);
  status = signal("");

  // ONE result: the first match in template order.
  @ViewChild(TodoItemComponent) first!: TodoItemComponent;
  // ALL results, as a live QueryList. Same locator, different shape.
  @ViewChildren(TodoItemComponent) items!: QueryList<TodoItemComponent>;
  // read: change WHAT you get back for each match (here the host element).
  @ViewChildren("item", { read: ElementRef }) hosts!: QueryList<ElementRef<HTMLElement>>;

  ngAfterViewInit() {
    this.report("ngAfterViewInit");
    console.log("read: ElementRef ->", this.hosts.map((h) => h.nativeElement.tagName.toLowerCase()).join(", "));
    // QueryList.changes emits when the set of matches changes.
    this.items.changes.subscribe(() => this.report("items.changes"));
  }

  highlightAll() {
    this.items.forEach((item) => item.hot.set(true));
  }

  private report(where: string) {
    this.status.set(\`\${where}: \${this.items.length} items, first = "\${this.first.label}", last = "\${this.items.last.label}"\`);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "viewChild() signal queries vs @ViewChild decorator — what changed?",
    seoDescription:
      "viewChild() and viewChildren() return signals: required queries, NG8118 and NG0951, computed instead of QueryList.changes, no static, and how to migrate.",
    description: `**Question presented to candidate:**
"Angular now has viewChild() and friends as functions. What changed compared with the @ViewChild decorator: the types, the timing, required queries, and how you react to changes? Would you migrate an existing component?"

**What a strong answer should cover:**
- \`viewChild()\`, \`viewChildren()\`, \`contentChild()\`, \`contentChildren()\` return **signals** (\`Signal<T | undefined>\`, \`Signal<readonly T[]>\`); stable since **v19** (developer preview in 17.2).
- **\`.required\`** removes \`undefined\` from the type; reading it too early is caught by the compiler (\`NG8118\`) or throws at runtime (\`NG0951\`).
- No \`static\` option and no \`QueryList\`: derived state is \`computed()\`, side effects are \`effect()\` / \`afterRenderEffect()\`, instead of \`ngAfterViewInit\` + \`changes.subscribe\`.
- They compile to a different instruction (\`ɵɵviewQuerySignal\`) and need the Angular compiler: plain JIT does not register them.
- Same locators and \`read\` option; \`contentChild\` defaults to \`descendants: true\`.
- Migration: \`ng generate @angular/core:signal-queries-migration\`; decorators are not deprecated.

**Clarifying questions expected:**
- "Is the codebase already on signal inputs, or still decorator-based?"
- "Are there tests or libraries that read the query properties directly?"

**Code / implementation expected:** Yes — a component using \`viewChild.required\`, an optional \`viewChild\` inside \`@if\`, \`viewChildren\` with \`computed\`, and \`contentChild\`.`,
    answer: `**Target Audience:** Developers who know <code>@ViewChild</code> and <code>@ContentChild</code> and are moving a codebase to signal-based APIs.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Types and status come from the installed Angular 22.2.3 typings; behaviour, error codes and compiled output come from running <code>ngc</code> and the compiled app. Version history is cited inline.

## 1. Why This Even Matters — A Story First

Think of a parcel you are waiting for. The old way: the courier slips a note under the door at some point in the day, and you have to remember to check the doormat at the right moment. Check too early, nothing there. Check once and forget, and you miss the second parcel.

The new way: a tracking app. You do not check anything; the app **tells** you when the parcel status changes, and anything that depends on it ("unlock the door when it arrives") reacts by itself.

<code>@ViewChild</code> is the note under the door: Angular writes a property at a certain moment of the [lifecycle](/interview-question/what-are-angular-lifecycle-hooks), and you must read it in the right hook. <code>viewChild()</code> is the tracking app: the query is a [signal](/interview-question/what-are-angular-signals), so templates, [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) and [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) that read it update by themselves when the result changes.

## 2. The Core Idea

📌 **Interview term: Signal query** — a query declared with a function instead of a decorator, whose value is a read-only signal: <code>viewChild()</code>, <code>viewChildren()</code>, <code>contentChild()</code>, <code>contentChildren()</code>. They were added as a developer preview in Angular 17.2 ([Ninja Squad](https://blog.ninja-squad.com/2024/02/14/what-is-new-angular-17.2/)), and the 22.2.3 typings tag them <code>@publicApi 19.0</code>, stable since v19.

📌 **Interview term: Required query** — <code>viewChild.required()</code> / <code>contentChild.required()</code>: a query that promises a match, so its type has no <code>undefined</code>.

The types, straight from the typings:

| Declaration | Type |
| :--- | :--- |
| <code>@ViewChild("el") el?: ElementRef</code> | <code>ElementRef \\| undefined</code> property, assigned by Angular |
| <code>viewChild&lt;ElementRef&gt;("el")</code> | <code>Signal&lt;ElementRef \\| undefined&gt;</code> |
| <code>viewChild.required&lt;ElementRef&gt;("el")</code> | <code>Signal&lt;ElementRef&gt;</code> |
| <code>@ViewChildren(Item) items: QueryList&lt;Item&gt;</code> | <code>QueryList&lt;Item&gt;</code> |
| <code>viewChildren(Item)</code> | <code>Signal&lt;ReadonlyArray&lt;Item&gt;&gt;</code> |
| <code>contentChild(Header)</code> | <code>Signal&lt;Header \\| undefined&gt;</code> (descendants default <code>true</code>) |

Locators (ref name, class, token) and <code>read</code> (for example <code>read: ElementRef</code>, see [ElementRef, TemplateRef and ViewContainerRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref)) work exactly as for the decorators (see [@ViewChild and @ContentChild](/interview-question/what-are-viewchild-and-contentchild)). The options that are **gone**: <code>static</code> (there is no "resolve once" mode), and for lists the whole [<code>QueryList</code>](/interview-question/what-is-the-difference-between-viewchildren-and-viewchild) API, including <code>changes</code>. New: an optional <code>debugName</code>.

## 3. Verified: The Same Problems, Solved Without Hooks

The example below has an always-present <code>&lt;input #search&gt;</code> inside a child (<code>viewChild.required</code>), an optional <code>&lt;small #hint&gt;</code> inside an [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir) (<code>viewChild</code>), rows from a <code>@for</code> (<code>viewChildren</code>), a <code>contentChild</code> for a [projected](/interview-question/what-is-content-projection-and-ng-content) title, two <code>computed</code>s over those and an <code>effect</code>. No lifecycle hook at all. Output, then three clicks:

\`\`\`
effect: hint absent, rows 0
effect: hint absent, rows 2
[app] RENDERED: Find a userrow 1row 2toggle hintadd rowrows = 2, hint = hidden, panel title = Find a user
focused: INPUT | rows = 2, hint = hidden, panel title = Find a user
effect: hint present, rows 2
toggle hint | rows = 2, hint = shown, panel title = Find a user
effect: hint present, rows 3
add row     | rows = 3, hint = shown, panel title = Find a user
effect: hint absent, rows 3
toggle hint | rows = 3, hint = hidden, panel title = Find a user
\`\`\`

- <code>rowCount = computed(() =&gt; this.rowEls().length)</code> followed the <code>@for</code> with no <code>changes</code> subscription.
- The optional <code>hint</code> query flipped between present and absent as the <code>@if</code> toggled, and the template text followed.
- <code>panelTitle</code> was a <code>computed</code> chaining two queries: the required <code>viewChild(SearchPanelComponent)</code> and that child <code>contentChild("title")</code>.
- The child focused its input from <code>afterNextRender(() =&gt; this.search().nativeElement.focus())</code>, reading the required query without a hook (see [render hooks](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use)).
- The **effect ran twice before the first render** finished: once with the empty initial values (<code>rows 0</code>), then again with the results. An effect over a query must handle the "not there yet" value.

## 4. Verified: Required Queries Fail Loudly

Reading <code>viewChild.required("search")</code> in the constructor, where nothing can exist yet. The AOT compiler catches the obvious case statically:

\`\`\`
error NG8118: \`search\` is a required \`viewChild\` and does not have a value in this context.
\`\`\`

Hiding the read behind a helper function gets past the compiler, and then the runtime throws:

\`\`\`
constructor: hint() = undefined
constructor: search() threw NG0951: Child query result is required but no value is available. Find more at https://v22.angular.dev/errors/NG0951
\`\`\`

The optional query returned <code>undefined</code> quietly; the required one threw. That is the trade: <code>.required</code> gives a type without <code>undefined</code>, and in exchange Angular tells you if you read it before it can have a value. With the decorator, the same mistake is a silent <code>undefined</code> and a later "cannot read properties of undefined".

## 5. Under the Hood: A Different Instruction

One decorator query and one signal query in the same component, compiled with <code>ngc</code>:

\`\`\`
viewQuery: function AppComponent_Query(rf, ctx) { if (rf & 1) {
    i0.ɵɵviewQuerySignal(ctx.newB, _c0, 5);
    i0.ɵɵviewQuery(_c1, 5);
} if (rf & 2) {
    i0.ɵɵqueryAdvance();
    let _t;
    i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.oldA = _t.first);
} }
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Decorator query: Angular assigns a property during refresh and you read it in a hook. Signal query: Angular updates a signal and templates, computed and effect react">
  <defs>
    <marker id="sq7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="185" y="24" text-anchor="middle">DECORATOR</text>
  <text class="d-sub" x="595" y="24" text-anchor="middle">SIGNAL QUERY</text>
  <rect class="d-box" x="40" y="40" width="290" height="60" rx="10"/>
  <text class="d-text" x="185" y="66" text-anchor="middle">queryRefresh on update pass</text>
  <text class="d-sub" x="185" y="88" text-anchor="middle">assigns ctx.prop = first</text>
  <path class="d-edge" d="M 185 104 L 185 156" marker-end="url(#sq7-arrow)"/>
  <rect class="d-box-muted" x="40" y="160" width="290" height="70" rx="10"/>
  <text class="d-text" x="185" y="188" text-anchor="middle">You read it in a hook</text>
  <text class="d-sub" x="185" y="210" text-anchor="middle">ngAfterViewInit, changes.subscribe</text>
  <rect class="d-box-accent" x="450" y="40" width="290" height="60" rx="10"/>
  <text class="d-text d-accent" x="595" y="66" text-anchor="middle">viewQuerySignal at creation</text>
  <text class="d-sub" x="595" y="88" text-anchor="middle">results feed a signal</text>
  <path class="d-edge-accent" d="M 595 104 L 595 156" marker-end="url(#sq7-arrow)"/>
  <rect class="d-box-accent" x="450" y="160" width="290" height="70" rx="10"/>
  <text class="d-text d-accent" x="595" y="188" text-anchor="middle">Readers react by themselves</text>
  <text class="d-sub" x="595" y="210" text-anchor="middle">template, computed, effect</text>
</svg>

The decorator needs code in the update block that **assigns** a class property, which is why you must know when that assignment happens. The signal query is wired to the signal once, at creation, and every reader is notified through the normal signal graph. (More on the instruction model: [Ivy compilation](/interview-question/how-does-compilation-work-under-the-hood-in-ivy).)

That compiler step is also why signal queries cannot run in a [plain JIT setup](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) without the Angular compiler transform: run through the playground mode (plain transpile + JIT), the same example logged <code>rows 0</code> and then threw NG0951, so the example below is marked not runnable. The same is true of [signal inputs](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1).

## 6. What Changed, Side by Side

| Concern | <code>@ViewChild</code> / <code>@ViewChildren</code> | <code>viewChild()</code> / <code>viewChildren()</code> |
| :--- | :--- | :--- |
| Value | Plain property | Read-only signal |
| When readable | After the right hook (<code>ngAfterViewInit</code>) or with <code>static: true</code> | Any time; <code>undefined</code> / empty array until ready |
| Too-early read of a "must exist" query | Silent <code>undefined</code> | NG8118 at build, NG0951 at runtime |
| List type | <code>QueryList</code> with <code>changes</code> | <code>ReadonlyArray</code> |
| Derived state | Recompute in hooks or subscriptions | <code>computed()</code> |
| OnPush / [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) friendliness | Needs a manual nudge if you copy results into fields | Reading the signal in a template schedules updates |
| <code>static</code> option | Yes (<code>@ViewChild</code>) | No |
| Status in 22.2.3 | Supported, not deprecated | Stable (<code>@publicApi 19.0</code>) |

## 7. Migrating

📌 **Interview term: signal-queries-migration** — the schematic shipped in <code>@angular/core</code> 22.2.3, described as "Updates query declarations to signal queries, while also migrating all relevant references": <code>ng generate @angular/core:signal-queries-migration</code>. There is also a <code>signals</code> schematic that "combines all signals-related migrations into a single migration".

Practical order: migrate [inputs](/interview-question/what-are-signal-inputs-and-model-in-modern-angular) and queries in the same component together, because the payoff (a <code>computed</code> combining an input with a query) needs both to be signals. Watch for code that **writes** to a query property (tests sometimes do); signals are read-only, so those spots need rework. Code that reads <code>@ViewChildren(...).changes</code> becomes a <code>computed</code> or <code>effect</code>.

## 8. Common Pitfalls

- **Forgetting the parentheses.** <code>this.search.nativeElement</code> is a type error; it is <code>this.search().nativeElement</code>.
- **Reading a required query in the constructor.** NG8118 or NG0951 (verified). Read it in a template, a <code>computed</code>, an <code>effect</code> or a render hook.
- **Assuming an effect sees the final results on its first run.** Verified: it ran with <code>rows 0</code> first.
- **Looking for <code>static</code>.** It does not exist; if you needed it for [<code>ngOnInit</code>](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit), restructure around a <code>computed</code> or a render hook.
- **Using <code>.required</code> for something inside <code>@if</code>.** It will throw when the block is off; use the optional form and handle <code>undefined</code>.
- **Testing in a JIT-only setup.** Signal queries need the Angular compiler; the site playground cannot run them.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they are:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChild</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChildren</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentChild</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contentChildren</code> are function-based queries that return signals. They have been stable since Angular 19."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Types:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChild</code> gives \`Signal&lt;T "</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timing:</strong> <span style="color:#f0e2c8;">"There is no hook to wait for. Templates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that read the query update when the result changes, so most <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">changes.subscribe</code> code disappears."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Safety:</strong> <span style="color:#f0e2c8;">"A required query read too early is a compile error, NG8118, or a runtime error, NG0951, instead of a silent undefined."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"The decorators are still supported. There is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal-queries-migration</code> schematic; I migrate queries together with inputs so I can combine them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaces QueryList.changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChildren()</code> signal in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code>. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed(() =&gt; this.rowEls().length)</code> followed a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> from 2 to 3 rows with no subscription.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there no static option?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static</code> existed so you could read a decorator query in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>. A signal is readable at any time and updates itself, so the special mode is not needed; you read it where it is used.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you read a required viewChild in the constructor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler reports NG8118 when it can see it. If it cannot, the runtime throws NG0951, "Child query result is required but no value is available".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do signal queries make components faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They mainly make them simpler and safer. With OnPush and zoneless as defaults, signals tell Angular exactly what to re-check, which avoids the manual <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck</code> that copying decorator results into fields can need.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use read with signal queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChild("box", { read: ElementRef })</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ read: ViewContainerRef }</code>. The returned signal is typed by the read token.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal query** | Query declared with <code>viewChild()</code> etc., value is a signal |
| **Required query** | <code>.required</code> form, type without <code>undefined</code> |
| **NG8118** | Compile error: required query read where it cannot have a value |
| **NG0951** | Runtime error: required query read before it has a result |
| **ɵɵviewQuerySignal** | Instruction the compiler emits for a signal view query |
| **signal-queries-migration** | Schematic that converts decorator queries |

---
**Conclusion:** the decorator puts a value into a property at a lifecycle moment you have to wait for; the function gives you a signal that is always readable and tells its readers when it changes. Verified on 22.2.3: <code>computed</code> over <code>viewChildren()</code> followed a <code>@for</code> with no subscription, an optional query tracked an <code>@if</code>, a required query read too early failed with NG8118 at build time or NG0951 at runtime, and the compiler emits a separate <code>ɵɵviewQuerySignal</code> instruction for it. Same locators, same <code>read</code>, no <code>static</code>, no <code>QueryList</code>, and a schematic to migrate when you are ready.`,
    examples: [
      {
        label: "viewChild.required, an optional viewChild in @if, viewChildren with computed and a contentChild",
        tech: "angular",
        runnable: false,
        code: `import { Component, ElementRef, afterNextRender, computed, contentChild, effect, signal, viewChild, viewChildren } from "@angular/core";

@Component({
  selector: "search-panel",
  template: \`<ng-content select="h4" /><input #search placeholder="search" />\`,
})
export class SearchPanelComponent {
  // Content query: the <h4> the parent projects, as a signal.
  title = contentChild<ElementRef<HTMLElement>>("title");
  // Required view query: Signal<ElementRef>, no "| undefined" in the type.
  search = viewChild.required<ElementRef<HTMLInputElement>>("search");

  constructor() {
    afterNextRender(() => this.search().nativeElement.focus());
  }
}

@Component({
  selector: "app-root",
  imports: [SearchPanelComponent],
  template: \`
    <search-panel><h4 #title>Find a user</h4></search-panel>
    @if (showHint()) { <small #hint>Press Enter to search</small> }
    @for (n of rows(); track n) { <li #row>row {{ n }}</li> }
    <button (click)="showHint.set(!showHint())">toggle hint</button>
    <button (click)="rows.set([...rows(), rows().length + 1])">add row</button>
    <p>rows = {{ rowCount() }}, hint = {{ hint() ? "shown" : "hidden" }}, panel title = {{ panelTitle() }}</p>\`,
})
export class AppComponent {
  showHint = signal(false);
  rows = signal([1, 2]);

  panel = viewChild.required(SearchPanelComponent);
  hint = viewChild<ElementRef<HTMLElement>>("hint");    // Signal<ElementRef | undefined>
  rowEls = viewChildren<ElementRef<HTMLElement>>("row"); // Signal<readonly ElementRef[]>

  // Queries are signals, so derived state is just computed(): no
  // ngAfterViewInit, no QueryList.changes subscription.
  rowCount = computed(() => this.rowEls().length);
  panelTitle = computed(() => this.panel().title()?.nativeElement.textContent ?? "none");

  constructor() {
    effect(() => console.log(\`effect: hint \${this.hint() ? "present" : "absent"}, rows \${this.rowEls().length}\`));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What do @HostListener and @HostBinding do?",
    seoDescription:
      "@HostBinding and @HostListener bind to and listen on a directive's host element. Verified output, return false, and why the host property is preferred.",
    description: `**Question presented to candidate:**
"Build a toggle directive that adds a class and an aria attribute to its element when clicked and resets on Escape anywhere on the page. Show it with @HostListener and @HostBinding, then tell me what the Angular docs recommend instead today."

**What a strong answer should cover:**
- **Host element**: the element a directive or component is attached to; host bindings change it, host listeners listen on it.
- \`@HostBinding('class.on')\`, \`'attr.aria-pressed'\`, \`'style.width.px'\`, plain properties; \`@HostListener('click', ['$event'])\`, global targets \`document:\` / \`window:\`, key filters like \`keydown.escape\`.
- A \`@HostListener\` handler that **returns \`false\`** calls \`preventDefault()\`; a \`null\` attribute binding **removes** the attribute.
- The 22.2.3 typings say to **always prefer the \`host\` property** in \`@Component\` / \`@Directive\` metadata; the decorators exist for backwards compatibility.
- Both forms compile to the **same host-binding instructions**, and host expressions are type-checked with strict templates.
- With signals in the \`host\` bindings, OnPush and zoneless are handled naturally.

**Clarifying questions expected:**
- "Should Escape be listened for on the document, or only while the element has focus?"
- "Is this a directive on existing elements, or a component styling its own host?"

**Code / implementation expected:** Yes — the same directive written once with decorators and once with \`host\` metadata.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who have written a directive and want to change or listen to the element it sits on, and who want to know the modern recommended form.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every "Verified" block was compiled with <code>ngc</code> (strict templates) on Angular 22.2.3 and run; the HTML is the real <code>outerHTML</code> of the elements. Recommendations are quoted from the installed 22.2.3 typings.

## 1. Why This Even Matters — A Story First

Think of a name badge clipped to a jacket. The badge does not own the jacket, but it can do two things to it: **show** something on it (a colour, a "Speaker" ribbon), and **notice** things that happen to it (someone taps the badge to scan it).

A [directive](/interview-question/what-is-a-directive-and-what-are-the-types) is that badge. The element it is attached to is its **host**. A host **binding** is the badge putting something on the jacket: a class, an attribute, a style. A host **listener** is the badge reacting to the jacket being clicked, or to something happening on the whole page, like a key press. <code>@HostBinding</code> and <code>@HostListener</code> are the original decorator way to say both; the <code>host</code> property in the metadata is the current recommended way.

## 2. The Core Idea

📌 **Interview term: Host element** — the DOM element a directive or component is attached to. For <code>&lt;span toggleOld&gt;</code>, the span; for a component, its own tag (<code>&lt;app-card&gt;</code>).

📌 **Interview term: @HostBinding** — a property decorator that binds a class member to a property, attribute, class or style **of the host element**. Angular checks it during [change detection](/interview-question/how-does-change-detection-work-in-angular) and updates the host when the value changes.

📌 **Interview term: @HostListener** — a method decorator that registers a handler for an event **on the host element**, or on a global target (<code>window:</code>, <code>document:</code>, <code>body:</code>). Its second argument lists what to pass, for example <code>['$event']</code> or <code>['$event.target']</code>.

| Binding key | Effect on the host | Example |
| :--- | :--- | :--- |
| <code>'id'</code>, <code>'title'</code>, ... | DOM property | <code>@HostBinding('title') hint = 'Close'</code> |
| <code>'attr.x'</code> | Attribute (<code>null</code> removes it) | <code>@HostBinding('attr.aria-pressed')</code> |
| <code>'class.x'</code> | Toggle one class | <code>@HostBinding('class.on') on = false</code> |
| <code>'style.x'</code> / <code>'style.x.px'</code> | One style, with optional unit | <code>@HostBinding('style.width.px') width = 120</code> |

Event names follow template syntax: <code>'click'</code>, <code>'keydown.enter'</code>, <code>'keydown.shift.a'</code>, <code>'document:keydown.escape'</code>, <code>'window:resize'</code>. These are the same rules as [template data binding](/interview-question/what-are-the-types-of-data-binding-in-angular), applied to the host instead of to an element in your template.

## 3. The Recommended Form: the host Property

📌 **Interview term: host metadata** — an object in <code>@Directive</code> or <code>@Component</code> whose keys are written like template bindings: <code>"[class.on]": "on()"</code> for bindings, <code>"(click)": "toggle($event)"</code> for listeners, and plain keys like <code>role: "button"</code> for static attributes.

The 22.2.3 typings are explicit on both decorators:

\`\`\`
NOTE:  **Always** prefer using the [\`host\` property](guide/components/host-elements#binding-to-the-host-element) over \`@HostBinding\`.
This decorator exist exclusively for backwards compatibility.
\`\`\`

(And the same sentence with <code>@HostListener</code>.) Neither decorator is marked <code>@deprecated</code>; they are supported, just not the first choice.

\`\`\`ts
@Directive({
  selector: "[toggleNew]",
  host: {
    role: "button",                          // static attribute
    "[class.on]": "on()",
    "[attr.aria-pressed]": "on()",
    "[style.width.px]": "120",
    "(click)": "toggle($event)",
    "(document:keydown.escape)": "on.set(false)",
  },
})
export class ToggleNewDirective {
  on = signal(false);
  toggle(e: MouseEvent) { this.on.update((v) => !v); }
}
\`\`\`

Why the typings prefer it: all host behaviour sits in one place next to the selector, static attributes need no class member, and the expressions can read [signals](/interview-question/what-are-angular-signals) directly.

## 4. Verified: Same Behaviour, Both Ways

The runnable example puts the decorator version (<code>toggleOld</code>) and the <code>host</code> version (<code>toggleNew</code>) side by side, clicks both, then dispatches an Escape keydown on the document. The [emulated-encapsulation](/interview-question/what-is-viewencapsulation-in-angular) attribute (<code>_ngcontent-...</code>) is trimmed from these lines:

\`\`\`
initial        <span id="old" toggleold="" aria-pressed="false" style="width: 120px;">old</span>
initial        <span role="button" id="new" togglenew="" aria-pressed="false" style="width: 120px;">new</span>
old directive got click
new directive got click
after click    <span id="old" toggleold="" aria-pressed="true" style="width: 120px;" class="on">old</span>
after click    <span role="button" id="new" togglenew="" aria-pressed="true" style="width: 120px;" class="on">new</span>
after Escape   <span id="old" toggleold="" aria-pressed="false" style="width: 120px;" class="">old</span>
after Escape   <span role="button" id="new" togglenew="" aria-pressed="false" style="width: 120px;" class="">new</span>
\`\`\`

- Class, attribute and unit-suffixed style bindings produced identical HTML.
- The static <code>role: "button"</code> in <code>host</code> became a real attribute with no class member.
- <code>document:keydown.escape</code> reset both, although the key event was dispatched on the document, not on the spans.
- The decorator version uses a plain boolean field. It still re-rendered after the click and the Escape key, even with OnPush as the default, because a host listener firing marks the view for checking, just like a template <code>(click)</code>.

## 5. Verified: They Compile to the Same Instructions

The two directives compiled with <code>ngc</code>, host-binding function only:

\`\`\`
// @HostBinding / @HostListener version
i0.ɵɵlistener("click", function ... { return ctx.toggle($event.type); })("keydown.escape", function ... { return ctx.reset(); }, i0.ɵɵresolveDocument);
i0.ɵɵattribute("aria-pressed", ctx.pressed);
i0.ɵɵstyleProp("width", ctx.width, "px");
i0.ɵɵclassProp("on", ctx.on);

// host: { ... } version   (plus hostAttrs: ["role", "button"])
i0.ɵɵlistener("click", function ... { return ctx.toggle($event); })("keydown.escape", function ... { return ctx.on.set(false); }, i0.ɵɵresolveDocument);
i0.ɵɵattribute("aria-pressed", ctx.on());
i0.ɵɵstyleProp("width", 120, "px");
i0.ɵɵclassProp("on", ctx.on());
\`\`\`

(Handler function names shortened to "..."). Same instructions, same runtime cost; the static attribute became <code>hostAttrs</code>, set once at creation. The choice is about readability, not performance. See [Ivy compilation](/interview-question/how-does-compilation-work-under-the-hood-in-ivy) for what these instructions are.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 290" role="img" aria-label="HostBinding and HostListener decorators and the host metadata object both compile to the same hostBindings function that updates the host element">
  <defs>
    <marker id="hb8-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">@HostBinding</text>
  <text class="d-sub" x="150" y="82" text-anchor="middle">@HostListener on members</text>
  <rect class="d-box-accent" x="20" y="170" width="260" height="70" rx="10"/>
  <text class="d-text d-accent" x="150" y="200" text-anchor="middle">host: { ... }</text>
  <text class="d-sub" x="150" y="222" text-anchor="middle">recommended in 22.2.3</text>
  <path class="d-edge" d="M 284 72 L 356 120" marker-end="url(#hb8-arrow)"/>
  <path class="d-edge-accent" d="M 284 198 L 356 150" marker-end="url(#hb8-arrow)"/>
  <rect class="d-box" x="360" y="100" width="190" height="70" rx="10"/>
  <text class="d-text" x="455" y="130" text-anchor="middle">hostBindings</text>
  <text class="d-sub" x="455" y="152" text-anchor="middle">same instructions</text>
  <path class="d-edge-accent" d="M 554 135 L 606 135" marker-end="url(#hb8-arrow)"/>
  <rect class="d-box-accent" x="610" y="100" width="150" height="70" rx="10"/>
  <text class="d-text d-accent" x="685" y="130" text-anchor="middle">Host element</text>
  <text class="d-sub" x="685" y="152" text-anchor="middle">class, attr, style</text>
</svg>

Two ways to write it, one compiled function, one host element.

## 6. Verified: Return false, null Attributes and Type Checking

A host listener that returns <code>false</code>, and an attribute binding set to <code>null</code>:

\`\`\`
before: <a id="a" href="/x" blocknav="" data-state="idle">go</a>
defaultPrevented: true
after : <a id="a" href="/x" blocknav="">go</a>
\`\`\`

The typings state it: "If the handler method returns false, applies <code>preventDefault</code> on the bound element". The link navigation was cancelled, and binding the attribute to <code>null</code> removed <code>data-state</code> entirely.

Global listeners are removed with the directive. A directive with <code>document:keydown.escape</code> and <code>(body:click)</code> inside an [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir): both handlers logged while it existed (the body handler twice, because the click on the "off" button bubbled to the body too); after the <code>@if</code> removed it, dispatching the same events printed nothing:

\`\`\`
escape handler ran
body:click handler ran
body:click handler ran
--- directive destroyed ---
\`\`\`

Host expressions are type-checked with strict templates. A typo in a <code>host</code> binding failed the build:

\`\`\`
error TS2339: Property 'onn' does not exist on type 'XDirective'.
\`\`\`

## 7. Common Pitfalls

- **Writing host bindings in the class out of habit.** The typings say to always prefer <code>host</code>; new code should use it, and both compile the same.
- **Listening on <code>window:scroll</code> or <code>document:mousemove</code> for every instance.** Each directive instance adds its own global listener; with 500 rows that is 500 handlers. Listen once in a parent or a service.
- **Forgetting that a component host binding sets the outside of the component.** <code>"[class.active]"</code> on a component styles its tag, which the parent CSS can also see; style it from inside with <code>:host</code> (see [:host, :host-context and ::ng-deep](/interview-question/what-is-the-difference-between-component-styling-using-host-host-context-and-ng-)).
- **Expecting an attribute binding of <code>false</code> to remove the attribute.** <code>false</code> becomes the string <code>"false"</code> (verified <code>aria-pressed="false"</code>); only <code>null</code> or <code>undefined</code> removes it.
- **Binding the same property from the host and from the parent template.** Two sources fight over one element; pick one owner.
- **Manipulating the DOM in a listener instead of binding.** Change state and let a host binding reflect it; reach for [Renderer2](/interview-question/why-use-renderer2-instead-of-direct-dom-access) only for what bindings cannot express.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostBinding</code> binds a class member to a property, attribute, class or style of the element the directive sits on. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener</code> runs a method when that element, or a global target like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document</code>, fires an event."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Syntax:</strong> <span style="color:#f0e2c8;">"Keys follow template syntax: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class.on</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attr.aria-pressed</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style.width.px</code> for bindings, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">click</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keydown.escape</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document:keydown.escape</code> for listeners, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">['$event']</code> to pass arguments."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The current recommendation:</strong> <span style="color:#f0e2c8;">"The 22.2.3 API docs say to always prefer the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> property in the decorator metadata, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host: { '[class.on]': 'on()', '(click)': 'toggle()' }</code>. The decorators remain for backwards compatibility."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Same under the hood:</strong> <span style="color:#f0e2c8;">"Both compile to the same host-binding instructions, so it is a readability choice; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> also supports static attributes and reads signals directly, and it is type-checked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details that matter:</strong> <span style="color:#f0e2c8;">"A listener returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventDefault</code>, an attribute bound to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> is removed, and a host listener firing marks the view dirty, so it works with OnPush."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you listen to a key press anywhere on the page from a directive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a global target: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'(document:keydown.escape)': 'close()'</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@HostListener('document:keydown.escape')</code>. Angular removes the listener when the directive is destroyed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a static attribute such as role to the host?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host: { role: 'button' }</code>. It compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hostAttrs</code> and is set once at creation; with decorators you would need a binding to a constant property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between attr.x and x in a host binding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attr.x</code> sets an HTML attribute, needed for ARIA and data attributes that have no DOM property. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> sets the DOM property, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">title</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why prefer host over the decorators if they compile the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">All host behaviour is in one place next to the selector, you can bind static attributes without a field, and the Angular docs mark the decorators as backwards-compatibility only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a host binding update under OnPush?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the view is checked. Signals read in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> expressions schedule that automatically; a plain field changed outside an event handler, for example in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>, would not be re-checked on its own.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Host element** | The element a directive or component is attached to |
| **@HostBinding** | Decorator: bind a member to a host property, attribute, class or style |
| **@HostListener** | Decorator: run a method on a host or global event |
| **host metadata** | The recommended object form of the same bindings and listeners |
| **Global target** | <code>window:</code>, <code>document:</code> or <code>body:</code> prefix on an event name |
| **hostAttrs** | Static host attributes, set once at creation |

---
**Conclusion:** host bindings and listeners let a directive or component change, and react to, the element it is attached to. <code>@HostBinding</code> and <code>@HostListener</code> do it with decorators on class members; the <code>host</code> object in the metadata does the same thing in one place and is what the 22.2.3 API docs say to always prefer. Verified: both produced identical HTML and compile to the same instructions, a listener returning <code>false</code> prevented the default action, <code>null</code> removed an attribute, global <code>document:keydown.escape</code> worked from each instance, and a typo in a <code>host</code> expression failed the strict-template build.`,
    examples: [
      {
        label: "The same toggle directive with @HostBinding / @HostListener and with host metadata",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, HostBinding, HostListener, signal } from "@angular/core";

// Old style: decorators on class members.
@Directive({ selector: "[toggleOld]" })
export class ToggleOldDirective {
  @HostBinding("class.on") on = false;
  @HostBinding("attr.aria-pressed") get pressed() { return String(this.on); }
  @HostBinding("style.width.px") width = 120;
  @HostListener("click", ["$event.type"])
  toggle(type: string) {
    this.on = !this.on;
    console.log("old directive got", type);
  }
  @HostListener("document:keydown.escape")
  reset() { this.on = false; }
}

// Recommended style: the host property in the metadata.
@Directive({
  selector: "[toggleNew]",
  host: {
    role: "button",                          // static attribute
    "[class.on]": "on()",
    "[attr.aria-pressed]": "on()",
    "[style.width.px]": "120",
    "(click)": "toggle($event)",
    "(document:keydown.escape)": "on.set(false)",
  },
})
export class ToggleNewDirective {
  on = signal(false);
  toggle(e: MouseEvent) {
    this.on.update((v) => !v);
    console.log("new directive got", e.type);
  }
}

@Component({
  selector: "app-root",
  imports: [ToggleOldDirective, ToggleNewDirective],
  styles: \`span { display: inline-block; padding: 4px; border: 1px solid #888; cursor: pointer; }
    .on { background: gold; }\`,
  template: \`<span id="old" toggleOld>old</span> <span id="new" toggleNew>new</span>
    <p>Click a box to toggle it, press Escape to reset both.</p>\`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between ElementRef, TemplateRef, and ViewContainerRef?",
    seoDescription:
      "ElementRef wraps a rendered element, TemplateRef an unrendered template, ViewContainerRef is where views go. A verified directive shows all three.",
    description: `**Question presented to candidate:**
"Explain ElementRef, TemplateRef and ViewContainerRef. Then use them to write a tiny structural directive, something like \`*repeat="3"\`, and tell me where the created views actually end up in the DOM."

**What a strong answer should cover:**
- **ElementRef**: a wrapper around a rendered element, \`nativeElement\` is the real DOM node (a comment node for \`ng-template\`); the typings flag it as a security risk to use directly.
- **TemplateRef**: a **blueprint** of an \`<ng-template>\` (or a \`*\` structural directive host) that is not rendered until someone stamps it out; injectable only where there is a template, otherwise \`NG0201\`.
- **ViewContainerRef**: an **anchor point** where views can be inserted; \`createEmbeddedView(templateRef, context)\`, \`createComponent(Type)\`, \`clear()\`, \`length\`, \`move\`, \`indexOf\`.
- Views are inserted as **siblings next to the anchor** (a comment node), not as children of it; \`createComponent\` on a component's own container puts the new component after its host.
- Template context: \`$implicit\` and named values become \`let-\` variables (\`let n; let total = total\`).
- How this relates to \`ngTemplateOutlet\`, \`@if\` / \`@for\`, and dynamic components.

**Clarifying questions expected:**
- "Should the directive clean up and re-render when the count changes?"
- "Do you want to inject them or obtain them with a query?"

**Code / implementation expected:** Yes — a structural directive with \`TemplateRef\` + \`ViewContainerRef\`, plus a directive using \`ElementRef\`.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who have seen these three types in constructor or <code>inject()</code> calls and want a precise mental model of each, plus how they combine.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every "Verified" block was compiled with <code>ngc</code> (strict templates) on Angular 22.2.3 and run; DOM snippets are the real <code>innerHTML</code> / <code>outerHTML</code>. Security notes are quoted from the installed typings.

## 1. Why This Even Matters — A Story First

Think of a print shop.

- A **printed poster on the wall** is a finished thing you can point at. You can touch it, measure it, scribble on it.
- A **printing plate** is not a poster. It is the blueprint you can print as many posters from as you like, each with different text filled in.
- A **hook on the wall** is a spot where posters can be hung. You can hang one, hang five in a row, take them all down, or reorder them.

<code>ElementRef</code> is the poster: a handle on something already rendered. <code>TemplateRef</code> is the plate: a template that renders nothing until someone uses it. <code>ViewContainerRef</code> is the hook: a place in the page where views (from plates, or whole components) can be inserted and removed. Every structural feature in Angular, <code>@if</code>, <code>@for</code>, <code>*ngIf</code>, <code>ngTemplateOutlet</code>, dynamic components, is some combination of a plate and a hook.

## 2. The Three Types

📌 **Interview term: ElementRef** — "a wrapper around a native element inside of a View" (22.2.3 typings). <code>nativeElement</code> is the real DOM node in the browser. Inject it in a [directive](/interview-question/what-is-a-directive-and-what-are-the-types) or component to get the **host** element, or get one for any element with a query and <code>read: ElementRef</code>.

📌 **Interview term: TemplateRef** — a reference to an <strong>un-rendered</strong> template: an <code>&lt;ng-template&gt;</code> block, or the element a <code>*</code> structural directive sits on (Angular desugars <code>*repeat</code> into an <code>ng-template</code>). It is a blueprint; on its own it adds nothing to the page (see [ng-container and ng-template](/interview-question/what-are-ng-container-and-ng-template)).

📌 **Interview term: ViewContainerRef** — a container attached to one location in the DOM where Angular can insert views: <code>createEmbeddedView(templateRef, context)</code> stamps a template, <code>createComponent(Type)</code> creates a component, and <code>clear()</code>, <code>remove(i)</code>, <code>move(view, i)</code>, <code>indexOf(view)</code>, <code>length</code> manage them.

📌 **Interview term: Embedded view** — one rendered copy of a template, created from a <code>TemplateRef</code>, with its own **context** object. Each <code>@for</code> row is one.

| | ElementRef | TemplateRef | ViewContainerRef |
| :--- | :--- | :--- | :--- |
| Represents | A rendered element | A template blueprint | An insertion point |
| Renders anything by itself | Already rendered | No | No, it hosts views |
| Key members | <code>nativeElement</code> | <code>createEmbeddedView(ctx)</code>, <code>elementRef</code> | <code>createEmbeddedView</code>, <code>createComponent</code>, <code>clear</code>, <code>length</code> |
| Injectable in | Any directive or component (its host) | Only a directive on an <code>ng-template</code> / <code>*</code> host | Any directive or component (its host location) |
| Typical use | Measuring, focusing, third-party libs | Structural directives, template inputs | Structural directives, [dynamic components](/interview-question/how-do-you-dynamically-create-components) |

## 3. How They Fit Together

<svg class="iq-diagram" width="100%" viewBox="0 0 780 330" role="img" aria-label="A structural directive injects TemplateRef as the blueprint and ViewContainerRef as the anchor; the container stamps embedded views that are inserted as siblings before the anchor comment">
  <defs>
    <marker id="rf9-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="230" height="70" rx="10"/>
  <text class="d-text" x="135" y="60" text-anchor="middle">TemplateRef</text>
  <text class="d-sub" x="135" y="82" text-anchor="middle">the i element blueprint</text>
  <rect class="d-box-accent" x="20" y="200" width="230" height="70" rx="10"/>
  <text class="d-text d-accent" x="135" y="230" text-anchor="middle">ViewContainerRef</text>
  <text class="d-sub" x="135" y="252" text-anchor="middle">anchor: a comment node</text>
  <path class="d-edge" d="M 254 70 L 316 130" marker-end="url(#rf9-arrow)"/>
  <path class="d-edge-accent" d="M 254 230 L 316 170" marker-end="url(#rf9-arrow)"/>
  <rect class="d-box" x="320" y="115" width="160" height="70" rx="10"/>
  <text class="d-text" x="400" y="145" text-anchor="middle">createEmbeddedView</text>
  <text class="d-sub" x="400" y="167" text-anchor="middle">with a context</text>
  <path class="d-edge-accent" d="M 484 150 L 536 150" marker-end="url(#rf9-arrow)"/>
  <rect class="d-box-muted" x="540" y="30" width="220" height="270" rx="12"/>
  <text class="d-sub" x="650" y="56" text-anchor="middle">DOM, in this order</text>
  <rect class="d-box" x="565" y="76" width="170" height="40" rx="8"/>
  <text class="d-text" x="650" y="101" text-anchor="middle">view 1: i 1/3</text>
  <rect class="d-box" x="565" y="130" width="170" height="40" rx="8"/>
  <text class="d-text" x="650" y="155" text-anchor="middle">view 2: i 2/3</text>
  <rect class="d-box" x="565" y="184" width="170" height="40" rx="8"/>
  <text class="d-text" x="650" y="209" text-anchor="middle">view 3: i 3/3</text>
  <rect class="d-box-accent" x="565" y="240" width="170" height="40" rx="8"/>
  <text class="d-text d-accent" x="650" y="265" text-anchor="middle">anchor comment</text>
</svg>

The directive receives the plate and the hook from Angular, and the hook prints copies of the plate next to itself. The views are **siblings** placed before the anchor, not children of it; the anchor stays in the DOM as a marker.

## 4. Verified: A Tiny Structural Directive

The runnable example defines <code>*repeat="count(); let n; let total = total"</code>. The directive injects <code>TemplateRef</code> and <code>ViewContainerRef</code>, and in the input setter clears the container and stamps the template N times with the context <code>{ $implicit: i, total: times }</code>. A second directive just logs its <code>ElementRef</code>.

\`\`\`
ElementRef.nativeElement: SECTION HTMLElement
ViewContainerRef.length = 2
[app] RENDERED: 1/22/2morebadge
box: <i>1/2</i><i>2/2</i><!--container-->
ViewContainerRef.length = 3
box: <i>1/3</i><i>2/3</i><i>3/3</i><!--container-->
next to app-root: <hello-badge><b>dynamic badge</b></hello-badge>
\`\`\`

Line by line:

- <code>ElementRef.nativeElement</code> is the actual <code>&lt;section&gt;</code>, an <code>HTMLElement</code>.
- The section <code>innerHTML</code> shows the two stamped <code>&lt;i&gt;</code> views **followed by** <code>&lt;!--container--&gt;</code>: that comment is the anchor the <code>ViewContainerRef</code> is attached to.
- <code>$implicit</code> became <code>let n</code>, and the named context key became <code>let total = total</code>.
- Clicking "more" re-ran the setter: <code>clear()</code> then three views, <code>length = 3</code>.
- Clicking "badge" called <code>createComponent(HelloBadgeComponent)</code> on the **root component** own <code>ViewContainerRef</code>. The new component did not go inside <code>&lt;app-root&gt;</code>: it became the next sibling **after** the host element. A component container anchors at its host, and inserted views go next to the anchor.

This is the whole mechanism behind the built-in control flow, which the compiler implements with the same idea of a container and templates (see [the new control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir)).

## 5. Verified: Where Each One Is Available

\`\`\`
ElementRef on ng-template is a #comment node
ERROR RuntimeError: NG0201: No provider for TemplateRef found.
\`\`\`

- A directive placed on an <code>&lt;ng-template&gt;</code> gets an <code>ElementRef</code> too, but its <code>nativeElement</code> is a **comment**, since templates do not render an element.
- A directive on a normal <code>&lt;div&gt;</code> that injects <code>TemplateRef</code> fails with NG0201: there is no template there. <code>TemplateRef</code> is only provided on <code>ng-template</code> elements and <code>*</code> hosts. (DI resolution details: [how DI works](/interview-question/how-does-dependency-injection-work-in-angular).)

Ways to obtain each:

| Want | Inject (in a directive) | Query (from a component) |
| :--- | :--- | :--- |
| Host element | <code>inject(ElementRef)</code> | — |
| Some element in my template | — | <code>viewChild("x", { read: ElementRef })</code> |
| A template | <code>inject(TemplateRef)</code> on an <code>ng-template</code> / <code>*</code> host | <code>viewChild(TemplateRef)</code> or <code>viewChild("tpl")</code> |
| An insertion point | <code>inject(ViewContainerRef)</code> | <code>viewChild("slot", { read: ViewContainerRef })</code> on an <code>ng-container</code> |

The query form is covered in [@ViewChild and @ContentChild](/interview-question/what-are-viewchild-and-contentchild); passing a <code>TemplateRef</code> around and rendering it declaratively is [ngTemplateOutlet](/interview-question/what-is-ngtemplateoutlet).

## 6. ElementRef and Security

The 22.2.3 typings put a security note on <code>ElementRef</code>: "Permitting direct access to the DOM can make your application more vulnerable to XSS attacks. Carefully review any use of <code>ElementRef</code> in your code", and call <code>nativeElement</code> "the last resort when direct access to DOM is needed". Reading (focus, measure) is low risk. Writing HTML through it bypasses Angular sanitisation, the same way <code>Renderer2.setProperty(el, "innerHTML", ...)</code> does (verified in [why Renderer2](/interview-question/why-use-renderer2-instead-of-direct-dom-access)). See [DomSanitizer and XSS](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev).

## 7. Common Pitfalls

- **Expecting views inside the anchor element.** They are siblings next to the anchor (verified: the dynamic badge landed after <code>&lt;app-root&gt;</code>, not in it). To render inside a specific spot, query an <code>&lt;ng-container #slot&gt;</code> with <code>read: ViewContainerRef</code>.
- **Injecting <code>TemplateRef</code> on a plain element.** NG0201; the directive must be structural (<code>*</code>) or sit on <code>ng-template</code>.
- **Re-creating views on every input change without <code>clear()</code>.** Views pile up; the example clears first. For lists, reuse views (that is what <code>@for</code> with <code>track</code> does).
- **Forgetting that an <code>ElementRef</code> on <code>ng-template</code> is a comment.** Calling element APIs on it fails.
- **Using <code>nativeElement.innerHTML = userText</code>.** XSS risk, flagged by the typings; bind with <code>[innerHTML]</code> (sanitised) or text instead.
- **Manually created views in a component that never destroys them.** Views in a container are destroyed with the container; views created elsewhere (for example with <code>templateRef.createEmbeddedView</code> outside a container) must be destroyed by you.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. ElementRef:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ElementRef</code> wraps an element that is already rendered; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nativeElement</code> is the DOM node. I inject it to get my host element, and treat direct DOM writes through it as a last resort."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. TemplateRef:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> is a blueprint of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code>, or of an element with a star directive. It renders nothing until someone creates a view from it, and it is only injectable where such a template exists."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. ViewContainerRef:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code> is an insertion point. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createEmbeddedView</code> stamps a template with a context, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent</code> creates a component, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clear</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> manage the views."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Together:</strong> <span style="color:#f0e2c8;">"A structural directive injects both: the template is what to render, the container is where. That is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngIf</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngFor</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code> work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Placement detail:</strong> <span style="color:#f0e2c8;">"Views are inserted as siblings next to the container anchor, which is a comment node, not as children; to target a spot I query an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read: ViewContainerRef</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is $implicit in a template context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The value bound by a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let x</code>. Other keys are read with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let y = key</code>. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ $implicit: i, total }</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let n</code> the index and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let total = total</code> the count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does a component created with createComponent appear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Next to the container anchor. Using a component own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code>, it appears after the host element; verified, the badge became the next sibling of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app-root</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you get NG0201 when injecting TemplateRef?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The directive is on an element that has no template. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code> is provided only on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-template</code> and star-directive hosts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">ElementRef or Renderer2 for changing a style?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefer a binding first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[style.x]</code> or a host binding. If it has to be imperative, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2</code> is the Angular abstraction, works with SSR and encapsulation, and keeps the intent visible in review.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you render a TemplateRef that was passed as an input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declaratively with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngTemplateOutlet</code> and a context, or imperatively with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewContainerRef.createEmbeddedView(tpl, ctx)</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ElementRef** | Handle on a rendered element; <code>nativeElement</code> is the node |
| **TemplateRef** | Blueprint of an <code>ng-template</code>, renders nothing alone |
| **ViewContainerRef** | Insertion point for embedded views and components |
| **Embedded view** | One rendered copy of a template with its context |
| **Context** | Object whose keys become <code>let-</code> variables; <code>$implicit</code> is the default |
| **Anchor** | The comment node a container is attached to |
| **NG0201** | No provider found, e.g. <code>TemplateRef</code> where there is no template |

---
**Conclusion:** <code>ElementRef</code> is something already on the page, <code>TemplateRef</code> is a plate that can print it, and <code>ViewContainerRef</code> is the hook the prints hang on. Verified on 22.2.3: a ten-line structural directive stamped a template three times with a context, the views appeared as siblings before a <code>&lt;!--container--&gt;</code> anchor, a dynamically created component landed after its host rather than inside it, an <code>ElementRef</code> on an <code>ng-template</code> was a comment node, and injecting <code>TemplateRef</code> where there is no template failed with NG0201. Use bindings first; reach for these when you need to create, move or measure views yourself.`,
    examples: [
      {
        label: "A *repeat structural directive with TemplateRef and ViewContainerRef, plus ElementRef and createComponent",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, ElementRef, Input, TemplateRef, ViewContainerRef, inject, signal } from "@angular/core";

// ElementRef: a wrapper around the host DOM element.
@Directive({ selector: "[showTag]" })
export class ShowTagDirective {
  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    console.log("ElementRef.nativeElement:", el.tagName, el.constructor.name);
  }
}

// TemplateRef + ViewContainerRef: a tiny structural directive.
@Directive({ selector: "[repeat]" })
export class RepeatDirective {
  private tpl = inject(TemplateRef<{ $implicit: number; total: number }>);
  private vcr = inject(ViewContainerRef);
  @Input() set repeat(times: number) {
    this.vcr.clear();
    for (let i = 1; i <= times; i++) {
      this.vcr.createEmbeddedView(this.tpl, { $implicit: i, total: times });
    }
    console.log("ViewContainerRef.length =", this.vcr.length);
  }
}

@Component({ selector: "hello-badge", template: \`<b>dynamic badge</b>\` })
export class HelloBadgeComponent {}

@Component({
  selector: "app-root",
  imports: [ShowTagDirective, RepeatDirective],
  template: \`
    <section id="box" showTag>
      <i *repeat="count(); let n; let total = total">{{ n }}/{{ total }}</i>
    </section>
    <button id="more" (click)="count.set(count() + 1)">more</button>
    <button id="badge" (click)="addBadge()">badge</button>\`,
})
export class AppComponent {
  count = signal(2);
  private vcr = inject(ViewContainerRef); // the root host element's container
  addBadge() {
    this.vcr.createComponent(HelloBadgeComponent);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why use Renderer2 instead of direct DOM access?",
    seoDescription:
      "Renderer2 works in SSR and respects style encapsulation, verified. It does not sanitize innerHTML. When to prefer bindings, Renderer2 or render hooks.",
    description: `**Question presented to candidate:**
"A teammate wrote a directive that calls document.createElement and element.style directly. In review you suggest Renderer2. Justify it: what concrete problems does Renderer2 solve, what does it NOT solve, and when would you avoid both?"

**What a strong answer should cover:**
- **Renderer2** is Angular's abstraction over DOM operations (\`createElement\`, \`appendChild\`, \`addClass\`, \`setStyle\`, \`setAttribute\`, \`setProperty\`, \`listen\`), injected per component.
- **Platform independence**: on the server there is no global \`document\` (a \`ReferenceError\`); Renderer2 and \`inject(DOCUMENT)\` work in SSR.
- **Encapsulation**: elements created through the component's Renderer2 get the emulated-encapsulation attribute, so component styles apply; \`document.createElement\` does not.
- \`listen()\` returns an **unlisten function**; tie it to \`DestroyRef\`.
- It is **not a security layer**: the 22.2.3 typings say it provides no extra security, and \`setProperty(el, 'innerHTML', ...)\` is not sanitised.
- Best of all: avoid imperative DOM work entirely with bindings / \`host\` metadata, and run browser-only work in \`afterNextRender\`.

**Clarifying questions expected:**
- "Does the app use SSR or prerendering?"
- "Is the DOM change expressible as a binding instead?"

**Code / implementation expected:** Yes — a directive that adds a class, a style, an attribute, a created child element and a listener through Renderer2, with cleanup.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who have reached for <code>document</code> or <code>nativeElement</code> inside a directive and want the real, verifiable reasons to use <code>Renderer2</code>, and its limits.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Browser behaviour was verified by compiling with <code>ngc</code> on Angular 22.2.3 and running in jsdom; server behaviour with <code>@angular/platform-server</code> <code>renderApplication</code>. Quotes about security come from the installed 22.2.3 typings.

## 1. Why This Even Matters — A Story First

A film crew shoots the same scene for cinema and for an audio-only radio version. If the actor says "look at this!" and points, it works on screen and means nothing on radio. A good script says what should **happen** ("she hands over the letter"), and each version renders that in its own way: a shot for cinema, a sound effect for radio.

Writing <code>document.createElement(...)</code> in a component is the actor pointing: it assumes there is a browser with a global <code>document</code>. Angular, though, also renders on the server (SSR and prerendering), applies style encapsulation, and can in principle target other renderers. <code>Renderer2</code> is the script: you say "create a <code>sup</code>, add this class", and the current platform does it properly. That is the core reason, and the rest of this doc checks it against real output.

## 2. The Core Idea

📌 **Interview term: Renderer2** — an abstract class in <code>@angular/core</code> that describes DOM-like operations. You [inject](/interview-question/how-does-dependency-injection-work-in-angular) it (<code>inject(Renderer2)</code>) and get the renderer for the current component and platform. The typings describe it as the base class for "custom rendering", used to "make custom UI changes that can't be expressed declaratively".

The main methods:

| Method | Does |
| :--- | :--- |
| <code>createElement(name)</code>, <code>createText(value)</code> | Create nodes |
| <code>appendChild(parent, child)</code>, <code>insertBefore</code>, <code>removeChild</code> | Move nodes |
| <code>addClass</code> / <code>removeClass</code> | Toggle a class |
| <code>setStyle</code> / <code>removeStyle</code> | One inline style |
| <code>setAttribute</code> / <code>removeAttribute</code> | An attribute |
| <code>setProperty(el, name, value)</code> | A DOM property (<code>value</code>, <code>innerHTML</code>, ...) |
| <code>listen(target, event, handler)</code> | Add a listener, **returns an unlisten function**; <code>target</code> can be an element or <code>"window"</code> / <code>"document"</code> / <code>"body"</code> |

📌 **Interview term: Platform abstraction** — the idea that component code talks to an interface, and the platform (browser, server) provides the implementation. <code>Renderer2</code> is the rendering side of it; <code>inject(DOCUMENT)</code> is the "give me the right document object" side.

## 3. The Paths From Your Code to the Page

<svg class="iq-diagram" width="100%" viewBox="0 0 780 330" role="img" aria-label="Directive code calls Renderer2, which the browser renderer and the server renderer both implement, adding encapsulation attributes; a direct global document call only works in the browser">
  <defs>
    <marker id="r10-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="125" width="180" height="70" rx="10"/>
  <text class="d-text" x="110" y="155" text-anchor="middle">Directive code</text>
  <text class="d-sub" x="110" y="177" text-anchor="middle">wants a new element</text>
  <path class="d-edge-accent" d="M 204 145 L 276 92" marker-end="url(#r10-arrow)"/>
  <path class="d-edge-dashed" d="M 204 178 L 276 236" marker-end="url(#r10-arrow)"/>
  <rect class="d-box-accent" x="280" y="40" width="200" height="80" rx="10"/>
  <text class="d-text d-accent" x="380" y="72" text-anchor="middle">Renderer2</text>
  <text class="d-sub" x="380" y="96" text-anchor="middle">per component, per platform</text>
  <rect class="d-box-muted" x="280" y="210" width="200" height="80" rx="10"/>
  <text class="d-text" x="380" y="242" text-anchor="middle">global document</text>
  <text class="d-sub" x="380" y="266" text-anchor="middle">browser only, unscoped</text>
  <path class="d-edge-accent" d="M 484 64 L 556 40" marker-end="url(#r10-arrow)"/>
  <path class="d-edge-accent" d="M 484 100 L 556 124" marker-end="url(#r10-arrow)"/>
  <rect class="d-box" x="560" y="10" width="200" height="60" rx="10"/>
  <text class="d-text" x="660" y="36" text-anchor="middle">Browser DOM</text>
  <text class="d-sub" x="660" y="56" text-anchor="middle">with style scope attrs</text>
  <rect class="d-box" x="560" y="100" width="200" height="60" rx="10"/>
  <text class="d-text" x="660" y="126" text-anchor="middle">Server render</text>
  <text class="d-sub" x="660" y="146" text-anchor="middle">SSR and prerender</text>
  <path class="d-edge-dashed" d="M 484 250 L 556 250" marker-end="url(#r10-arrow)"/>
  <rect class="d-box-muted" x="560" y="220" width="200" height="60" rx="10"/>
  <text class="d-text" x="660" y="246" text-anchor="middle">Server: fails</text>
  <text class="d-sub" x="660" y="266" text-anchor="middle">document is not defined</text>
</svg>

The upper path works on every platform Angular renders on and respects the component style scope. The lower path assumes a browser. Sections 4 to 6 verify each arrow.

## 4. Verified: Renderer2 in a Directive

The runnable example is a [directive](/interview-question/what-is-a-directive-and-what-are-the-types) that, from its constructor, adds a class, a style and an attribute to its host, creates a <code>sup</code> with a text node, and listens for <code>mouseenter</code>, removing the listener in <code>DestroyRef.onDestroy</code>:

\`\`\`
host: <h4 id="t" autobadge="" class="badge-host" style="border: 1px solid teal;" data-ready="yes"><sup>new</sup>Inbox</h4>
mouseenter #1
mouseenter #2
listener removed
after remove, still in DOM: false
\`\`\`

- All four writes landed on the host.
- The created <code>&lt;sup&gt;new&lt;/sup&gt;</code> came **before** the template text <code>Inbox</code>. The directive constructor runs before Angular creates the host element children, so "append" appended to an empty element. DOM work that depends on the rendered content belongs in <code>afterNextRender</code> (see [render hooks](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use)).
- <code>listen()</code> returned a function; calling it in <code>DestroyRef.onDestroy</code> ran when the [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir) removed the element.

## 5. Verified: Server-Side Rendering

Two directives rendered with <code>renderApplication</code> in Node. One uses <code>Renderer2</code> plus <code>inject(DOCUMENT)</code> to add a class to the body; the other uses the global <code>document</code>:

\`\`\`
viaGlobal threw: ReferenceError: document is not defined
<body class="theme-dark"><app-root ng-version="22.2.3" ng-server-context="other"><p viarenderer="" class="ready" data-by="renderer2">renderer</p><p viaglobal="">global</p></app-root>
\`\`\`

The global version threw (it was wrapped in <code>try/catch</code> for the test; unwrapped, it would fail the render). The <code>Renderer2</code> version produced real attributes in the server HTML, and the body class from <code>inject(DOCUMENT)</code> is in the output too. This is the reason that matters most in practice for any app using [SSR](/interview-question/what-is-angular-universal-ssr): the server ships HTML that already contains those changes, and [hydration](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat) picks it up.

## 6. Verified: Style Encapsulation

A component with <code>styles: "sup { color: red; }"</code> (default emulated [encapsulation](/interview-question/what-is-viewencapsulation-in-angular)) appended two <code>sup</code> elements, one through its <code>Renderer2</code> and one with <code>document.createElement</code>:

\`\`\`
<h4 _ngcontent-ng-c2283532919="">Inbox<sup _ngcontent-ng-c2283532919="">via Renderer2</sup><sup>via document</sup></h4>
Renderer2 sup color: rgb(255, 0, 0) | document sup color: rgb(0, 0, 0)
\`\`\`

📌 **Interview term: Component renderer** — the <code>Renderer2</code> you inject is created for **your component** and knows its encapsulation. Its <code>createElement</code> added the <code>_ngcontent-...</code> attribute, so the component CSS matched and the text turned red. The <code>document.createElement</code> element had no attribute, so the scoped style did not apply. This is a reason most explanations miss, and it is easy to show.

## 7. What Renderer2 Does NOT Do: Security

The 22.2.3 typings are blunt: "usage of <code>Renderer2</code>, in context of accessing DOM elements, provides no extra security which makes it equivalent to" direct DOM access. Verified, with the same malicious-looking string written two ways:

\`\`\`
WARNING: sanitizing HTML stripped some content, see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss
[innerHTML] binding : <img src="x"><b>hi</b>
Renderer2.setProperty: <img src="x" onerror="alert(1)"><b>hi</b>
\`\`\`

The [template binding](/interview-question/what-are-the-types-of-data-binding-in-angular) <code>[innerHTML]</code> went through Angular sanitiser and the <code>onerror</code> handler was stripped. <code>Renderer2.setProperty(el, "innerHTML", ...)</code> wrote it untouched. So "Renderer2 protects against XSS" is a myth; bindings and [DomSanitizer](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev) do.

## 8. Choosing the Approach

| Approach | SSR safe | Respects encapsulation | Sanitised | Use when |
| :--- | :--- | :--- | :--- | :--- |
| Template / <code>host</code> bindings | Yes | Yes | Yes (for <code>[innerHTML]</code>) | **Default**: anything expressible as a binding (see [host bindings](/interview-question/what-do-hostlistener-and-hostbinding-do)) |
| <code>Renderer2</code> | Yes | Yes | No | Imperative changes: dynamic attribute names, creating nodes, listeners decided at runtime |
| <code>ElementRef.nativeElement</code> | Only if guarded | Writes yes, created nodes no | No | Reading (focus, measure) in a render hook |
| Global <code>document</code> / <code>window</code> | No (verified ReferenceError) | No | No | Avoid; use <code>inject(DOCUMENT)</code> or render hooks |

<code>ElementRef</code> itself is covered in [ElementRef, TemplateRef and ViewContainerRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref).

## 9. Common Pitfalls

- **Believing Renderer2 sanitises.** It does not (verified); the typings say so.
- **Appending in the constructor and expecting it after the content.** Verified: it landed before the template text. Use <code>afterNextRender</code>.
- **Ignoring the return value of <code>listen()</code>.** That function is the only way to remove the listener; call it on destroy, especially for <code>"window"</code> or <code>"document"</code> targets.
- **Injecting <code>Renderer2</code> into a root service.** It is provided per component, so this fails. Verified: <code>NG0201: No provider found for Renderer2. Source: Environment Injector.</code> In a service, create one with <code>inject(RendererFactory2).createRenderer(null, null)</code> (verified: it added a class to an element).
- **Using Renderer2 for what a binding does.** <code>renderer.addClass</code> in a click handler is just <code>[class.x]</code> with extra steps, and harder to test.
- **Thinking Renderer2 makes browser-only libraries SSR safe.** A chart library still touches <code>window</code> itself; create it in <code>afterNextRender</code>, which never runs on the server.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2</code> is the Angular abstraction for imperative DOM operations: create nodes, append, add classes and styles, set attributes and properties, and listen to events."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Reason 1, platforms:</strong> <span style="color:#f0e2c8;">"It works wherever Angular renders. On the server there is no global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document</code>; verified with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderApplication</code>, the direct call threw a ReferenceError while the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2</code> changes appeared in the server HTML."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reason 2, encapsulation:</strong> <span style="color:#f0e2c8;">"The injected renderer belongs to my component, so elements it creates get the style scope attribute and component CSS applies. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.createElement</code> element does not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What it is not:</strong> <span style="color:#f0e2c8;">"It is not a security feature. The API docs say it gives no extra security, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setProperty</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">innerHTML</code> is not sanitised; only bindings and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DomSanitizer</code> are."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Preference order:</strong> <span style="color:#f0e2c8;">"Bindings and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> metadata first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2</code> for truly imperative work, browser-only work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(DOCUMENT)</code> instead of the global."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you remove a listener added with Renderer2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">listen()</code> returns an unlisten function. Store it and call it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef.onDestroy</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>. Verified: the callback ran when the element was removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use Renderer2 in a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by injecting it directly, it is a per-component provider. Inject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RendererFactory2</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createRenderer(null, null)</code> to get a default renderer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is ElementRef.nativeElement wrong, then?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reading through it, focusing or measuring, in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> is fine. Writing through it bypasses the platform and encapsulation, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ElementRef</code> docs flag it as an XSS risk; prefer bindings or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2</code> for writes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Renderer2 help with SSR for third-party libraries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The library itself uses browser globals. Create it inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>, which does not run on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it called Renderer2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It replaced the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer</code> class, which was deprecated in Angular 4 and removed in Angular 9 (per the official Renderer migration guide). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Renderer2</code> is the only renderer API today.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Renderer2** | Angular interface for imperative DOM operations |
| **Platform abstraction** | Component code talks to an interface; browser or server implements it |
| **DOCUMENT** | Injection token for the right document object on any platform |
| **Component renderer** | The Renderer2 instance tied to one component and its encapsulation |
| **unlisten function** | What <code>listen()</code> returns; call it to remove the listener |
| **RendererFactory2** | Creates renderers, for use outside components |

---
**Conclusion:** <code>Renderer2</code> is worth using for three verified reasons and not for one popular myth. Verified on 22.2.3: it works on the server where a global <code>document</code> throws a ReferenceError, its <code>createElement</code> adds the encapsulation attribute so component styles apply, and <code>listen()</code> hands you a clean way to remove listeners. It does **not** sanitise: <code>setProperty(el, "innerHTML", ...)</code> kept an <code>onerror</code> handler that the <code>[innerHTML]</code> binding stripped, exactly as the typings warn. The strongest review comment is often a step further: replace the imperative code with a binding or <code>host</code> metadata, and move browser-only work into <code>afterNextRender</code>.`,
    examples: [
      {
        label: "A directive that adds a class, style, attribute, child element and listener through Renderer2",
        tech: "angular",
        runnable: true,
        code: `import { Component, DestroyRef, Directive, ElementRef, Renderer2, inject, signal } from "@angular/core";

@Directive({ selector: "[autoBadge]" })
export class AutoBadgeDirective {
  private host = inject(ElementRef<HTMLElement>).nativeElement;
  private r = inject(Renderer2);
  hovers = signal(0);
  constructor() {
    this.r.addClass(this.host, "badge-host");
    this.r.setStyle(this.host, "border", "1px solid teal");
    this.r.setAttribute(this.host, "data-ready", "yes");
    const badge = this.r.createElement("sup");
    this.r.appendChild(badge, this.r.createText("new"));
    this.r.appendChild(this.host, badge);
    // listen() returns an unlisten function; tie it to the directive lifetime.
    const stop = this.r.listen(this.host, "mouseenter", () => {
      this.hovers.update((n) => n + 1);
      console.log("mouseenter #" + this.hovers());
    });
    inject(DestroyRef).onDestroy(() => {
      stop();
      console.log("listener removed");
    });
  }
}

@Component({
  selector: "app-root",
  imports: [AutoBadgeDirective],
  template: \`@if (on()) { <h4 id="t" autoBadge>Inbox</h4> }
    <button (click)="on.set(false)">remove</button>\`,
})
export class AppComponent {
  on = signal(true);
}`,
      },
    ],
  },
];

export default augments;
