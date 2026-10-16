/**
 * Angular ULTRA — batch 04: component communication with signals (signal
 * inputs, model(), output() and outputFromObservable(), two-way binding under
 * the hood, sibling communication through services) and signals themselves
 * (signal basics, computed() versus template methods and getters).
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
 * the site playground runs them); examples using input(), output() or model()
 * are runnable: false because the playground cannot compile them. Compiler
 * output was read from `ngc` emit, runtime internals from the installed
 * @angular/core 22.2.3 bundles, and migration claims from running the
 * signal-input and output schematics with Angular CLI 22.2.3.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Signal inputs input() vs @Input() — what changes in Angular 17.1+?",
    seoDescription:
      "input() turns a component input into a read-only signal: derived state via computed, required inputs, transforms, aliases, and what the compiler emits.",
    description: `**Question presented to candidate:**
"Our codebase is full of \`@Input()\` fields with \`ngOnChanges\` blocks that recompute things. Since Angular 17.1 there is \`input()\`. What actually changes if we switch, and is there anything we lose?"

**What a strong answer should cover:**
- \`input()\` returns a **read-only signal** (\`InputSignal<T>\`); the template and class read it by calling it, \`label()\`.
- Derived values become a \`computed()\` instead of \`ngOnChanges\` or a setter, and update automatically.
- **Required inputs** (\`input.required<T>()\`) are checked at compile time (NG8008) and have no \`!\` hack; reading one too early throws NG0950.
- **Transforms** (\`booleanAttribute\`, \`numberAttribute\`) and **aliases** carry over as options.
- The child **cannot write** an input signal (no \`set\`); for a value the child changes, use \`model()\`.
- Timeline: developer preview in 17.1, **stable in v19**; \`@Input\` is still supported (not deprecated in 22.2.3), and a migration schematic exists.

**Clarifying questions expected:**
- "Do any of these components assign to their own inputs? Those cannot become plain \`input()\`."
- "Do tests set inputs by assigning the field? They will need \`fixture.componentRef.setInput()\`."

**Code / implementation expected:** Yes — the same component written with \`@Input()\` and with \`input()\`, ideally with a derived value.`,
    answer: `**Target Audience:** Developers who know classic <code>@Input()</code> and want to understand the signal version — assumes basic components and templates.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every output, compiler error and generated line below came from compiling the code with <code>ngc</code> (strict templates) on Angular 22.2.3 and running it in jsdom, or from running the Angular CLI 22.2.3 migration schematic.

## 1. Why This Even Matters — A Story First

Picture a shop assistant who receives price changes on paper slips. With the old system, a slip lands in a tray (the <code>@Input()</code> field), a bell rings (<code>ngOnChanges</code>), and the assistant has to remember to walk over, read the slip, and rewrite every label that depends on it. Forget one label and the shelf shows a stale price.

With the new system the slip is a live digital price. Every label that shows "price times quantity" is wired to it, so when the price changes, exactly those labels update themselves. Nobody has to remember the walk.

That is the whole change from <code>@Input()</code> to <code>input()</code>: an input stops being a plain field you must watch, and becomes a [signal](/interview-question/what-are-angular-signals) that everything downstream can depend on.

## 2. The Core Idea

📌 **Interview term: Signal input** — an input declared with <code>input()</code> instead of the <code>@Input()</code> decorator. The field holds an <code>InputSignal&lt;T&gt;</code>: you read it by calling it (<code>label()</code>), Angular writes to it when the parent binding changes, and your code cannot.

📌 **Interview term: Required input** — <code>input.required&lt;T&gt;()</code>. The parent must bind it or the build fails. There is no initial value, so the type is exactly <code>T</code>, with no <code>&#124; undefined</code> and no <code>!</code>.

📌 **Interview term: Input transform** — a function that converts the bound value before it is stored, for example <code>booleanAttribute</code> so that a bare <code>&lt;price-tag onSale&gt;</code> means <code>true</code>, or <code>numberAttribute</code> so <code>amount="3"</code> becomes the number 3.

📌 **Interview term: Input alias** — a public binding name that differs from the class field: <code>qty = input(1, { alias: "quantity" })</code> is bound as <code>[quantity]</code>.

📌 **Interview term: Derived state** — a value computed from inputs. With signal inputs it is a <code>computed()</code>, which re-runs only when an input it reads changes. See [computed versus template methods](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

The four ways to declare one, straight from the 22.2.3 typings:

| Declaration | Type of the field | Read as |
| :--- | :--- | :--- |
| <code>input&lt;string&gt;()</code> | <code>InputSignal&lt;string &#124; undefined&gt;</code> | <code>x()</code>, may be undefined |
| <code>input(0)</code> | <code>InputSignal&lt;number&gt;</code> | <code>x()</code> |
| <code>input.required&lt;string&gt;()</code> | <code>InputSignal&lt;string&gt;</code> | <code>x()</code>, never undefined |
| <code>input(false, { transform: booleanAttribute })</code> | <code>InputSignalWithTransform&lt;boolean, unknown&gt;</code> | <code>x()</code>, always boolean |

## 3. Where the Value Goes

<svg class="iq-diagram" width="100%" viewBox="0 0 720 340" role="img" aria-label="With the decorator the bound value lands in a field and ngOnChanges must copy it into derived state, with input the bound value lands in a signal that computed and the template read directly">
  <defs>
    <marker id="si-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="260" y="20" width="200" height="44" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">parent binds amount</text>
  <path class="d-edge" d="M 256 42 L 160 42 L 160 104" marker-end="url(#si-arrow)"/>
  <path class="d-edge-accent" d="M 464 42 L 560 42 L 560 104" marker-end="url(#si-arrow)"/>
  <rect class="d-box" x="50" y="110" width="220" height="56" rx="10"/>
  <text class="d-text" x="160" y="133" text-anchor="middle">@Input() field</text>
  <text class="d-sub" x="160" y="153" text-anchor="middle">a plain property</text>
  <path class="d-edge" d="M 160 170 L 160 200" marker-end="url(#si-arrow)"/>
  <rect class="d-box" x="50" y="206" width="220" height="44" rx="10"/>
  <text class="d-sub" x="160" y="233" text-anchor="middle">ngOnChanges copies by hand</text>
  <path class="d-edge-dashed" d="M 160 254 L 160 284" marker-end="url(#si-arrow)"/>
  <rect class="d-box" x="50" y="290" width="220" height="40" rx="10"/>
  <text class="d-sub" x="160" y="315" text-anchor="middle">total = amount x qty</text>
  <rect class="d-box-accent" x="450" y="110" width="220" height="56" rx="10"/>
  <text class="d-text d-accent" x="560" y="133" text-anchor="middle">input() signal</text>
  <text class="d-sub" x="560" y="153" text-anchor="middle">amount() returns 3</text>
  <path class="d-edge-accent" d="M 560 170 L 560 200" marker-end="url(#si-arrow)"/>
  <rect class="d-box-accent" x="450" y="206" width="220" height="44" rx="10"/>
  <text class="d-sub" x="560" y="233" text-anchor="middle">computed re-runs by itself</text>
  <path class="d-edge-accent" d="M 560 254 L 560 284" marker-end="url(#si-arrow)"/>
  <rect class="d-box-accent" x="450" y="290" width="220" height="40" rx="10"/>
  <text class="d-sub" x="560" y="315" text-anchor="middle">template reads total()</text>
</svg>

On the left the dashed step is a promise you have to keep: every derived value must be refreshed in <code>ngOnChanges</code> or a setter. On the right the dependency is recorded automatically the first time <code>computed</code> reads <code>amount()</code>.

## 4. Side by Side

| | <code>@Input()</code> decorator | <code>input()</code> function |
| :--- | :--- | :--- |
| Field type | The raw value (<code>number</code>) | <code>InputSignal&lt;number&gt;</code> |
| Read in template | <code>{{ amount }}</code> | <code>{{ amount() }}</code> |
| Required | <code>@Input({ required: true }) x!: T</code> | <code>x = input.required&lt;T&gt;()</code> |
| Transform / alias | <code>@Input({ transform, alias })</code> | <code>input(v, { transform, alias })</code> |
| Derived state | [ngOnChanges](/interview-question/what-is-the-purpose-of-ngonchanges-and-how-does-it-capture-changes-in-input-prop) or a setter | <code>computed()</code> |
| React to a change | <code>ngOnChanges</code> | <code>computed</code>, or an [effect()](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) for side effects |
| Child can assign | Yes (and it gets overwritten on the next parent change) | No: there is no <code>set</code> |
| Works with [OnPush](/interview-question/how-does-change-detection-work-in-angular) | Yes | Yes, and a signal read marks the view for refresh |
| Status in 22.2.3 | Supported, not deprecated | Stable since v19 |

## 5. Verified: the signal version

The first example at the bottom is a price tag with all four input kinds: a required <code>label</code>, a <code>numberAttribute</code> transform on <code>amount</code>, an alias on <code>qty</code>, and a <code>booleanAttribute</code> transform on <code>onSale</code>. The parent passes <code>amount="3"</code> (a string), a bare <code>onSale</code> attribute (an empty string), and <code>[quantity]</code> from a signal. The driver clicked "One more cup" twice. Lines are the root text content, so elements run together:

\`\`\`
  computed total ran: 3 x 2 = 6
[app] RENDERED: Coffee: 6 SALEOne more cup
click:
  computed total ran: 3 x 3 = 9
rendered: Coffee: 9 SALEOne more cup
click:
  computed total ran: 3 x 4 = 12
rendered: Coffee: 12 SALEOne more cup
\`\`\`

The string <code>"3"</code> arrived as the number 3, the empty <code>onSale</code> attribute became <code>true</code>, and the <code>computed</code> ran exactly once per change of <code>qty</code>, with no lifecycle hook in sight.

## 6. Verified: the decorator version, for contrast

The second example is the same component with <code>@Input()</code>. Because <code>total</code> is a plain field, it has to be recomputed in <code>ngOnChanges</code>:

\`\`\`
  ngOnChanges: label, amount, onSale, qty
[app] RENDERED: Coffee: 6 SALEOne more cup
click:
  ngOnChanges: qty
rendered: Coffee: 9 SALEOne more cup
\`\`\`

Same output, more ceremony. It also needs <code>label!: string</code>, because TypeScript cannot see that Angular will set the field. A detail worth knowing: <code>ngOnChanges</code> still fires for signal inputs too. In a separate check a child with <code>qty = input(1)</code> logged <code>ngOnChanges: ["qty"] 5 -> 6</code> followed by its effect, so mixed codebases keep working.

## 7. Verified: what the compiler now catches

Each of these was a one-line change to a small component, compiled with <code>ngc</code> and strict templates:

| Mistake | Compiler output |
| :--- | :--- |
| Parent forgets a required input | <code>NG8008: Required input 'label' from component C must be specified.</code> |
| Binding a string to <code>input(1)</code> | <code>TS2322: Type 'string' is not assignable to type 'number'.</code> |
| Child calls <code>this.qty.set(...)</code> | <code>TS2339: Property 'set' does not exist on type 'InputSignal&lt;number&gt;'.</code> |
| Binding the field name, not the alias | <code>NG8002: Can't bind to 'qty' since it isn't a known property of 'c-x'.</code> |
| Reading a required input in the constructor | <code>NG8118: &#96;label&#96; is a required &#96;input&#96; and does not have a value in this context.</code> |

The last one is the classic timing trap. Inputs are set after the constructor runs, so the earliest safe place to read one is <code>ngOnInit</code>, a <code>computed</code>, or the template (see [constructor versus ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit)). If code slips past the static check, the runtime throws <code>NG0950</code>; the 22.2.3 source builds its message as <code>Input "label" is required but no value is available yet.</code>

Note the transform case: <code>amount="3"</code> compiled only because <code>numberAttribute</code> widened the accepted type to <code>unknown</code>. Without the transform, the static string is a type error, as the second row shows.

## 8. Verified: what the compiler emits

Signal inputs are not just a different API on top of the same machinery. The <code>ngc</code> output for the two examples differs in the component definition:

\`\`\`js
// input() version
inputs: { label: [1, "label"], amount: [1, "amount"], qty: [1, "quantity", "qty"], onSale: [1, "onSale"] }

// @Input() version
inputs: { label: "label", amount: [2, "amount", "amount", numberAttribute], qty: [0, "quantity", "qty"],
          onSale: [2, "onSale", "onSale", booleanAttribute] },
features: [i0.ɵɵNgOnChangesFeature]
\`\`\`

The first number is a flag. In the 22.2.3 runtime, <code>InputFlags.SignalBased = 1</code> and <code>HasDecoratorInputTransform = 2</code>. For a signal input Angular writes the value into the signal node (the transform lives inside the signal), while for a decorator input it calls the transform from the metadata and assigns the field. The <code>NgOnChangesFeature</code> only appears because the decorator version implements <code>ngOnChanges</code>.

One more surprise from the emit: in development builds the compiler adds a debug name to every signal, for example <code>input(0, { ...(ngDevMode ? { debugName: "amount" } : {}), transform: numberAttribute })</code>. That is why signal error messages and DevTools can name the field. For the full picture of what the compiler generates, see [how Ivy compilation works](/interview-question/how-does-compilation-work-under-the-hood-in-ivy).

## 9. Versions and Migration

- **17.1:** <code>input()</code> and <code>input.required()</code> arrive in developer preview (17.2 added [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs), 17.3 added [output()](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs); see <a href="https://angularindepth.com/article/streamlining-communication-new-signals-api-in-angular-17-3/" target="_blank" rel="noopener noreferrer">Angular In Depth on 17.3</a>).
- **v19:** promoted to stable. The 22.2.3 typings tag <code>InputSignal</code>, <code>model</code> and <code>output</code> with <code>@publicApi 19.0</code>.
- **22.2.3:** the <code>@Input</code> decorator has no <code>@deprecated</code> tag. Both styles are supported; new code should prefer <code>input()</code>.

📌 **Interview term: Signal input migration** — a schematic, <code>ng generate @angular/core:signal-input-migration</code>. Run on a CLI 22.2.3 app, it rewrote <code>@Input({ required: true }) label!: string</code> to <code>readonly label = input.required&lt;string&gt;()</code> and updated the template to <code>{{ label() }}</code>, reporting <code>Migrated 2/2 inputs.</code>

It refuses inputs your code writes to. With <code>this.count = this.count + 1</code> it reported <code>Migrated 0/1 inputs.</code>, and with <code>--insert-todos</code> it added the comment <code>Your application code writes to the input. This prevents migration.</code> But in the same run, an input changed with <code>this.count++</code> was migrated to the invalid <code>this.count()++</code> and Prettier then failed on it. Review the diff and compile after running it.

## 10. Common Pitfalls

- **Forgetting the parentheses.** <code>{{ label }}</code> on a signal input prints the function, not the value. Every read is a call.
- **Reading inputs in the constructor.** They are not set yet; NG8118 at build time, NG0950 at runtime. Read them in <code>computed</code>, the template or <code>ngOnInit</code>.
- **Trying to write an input.** There is no <code>set</code>. If the child really owns the value too, it is a [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs); if it only needs a local copy that resets when the parent changes, use <code>linkedSignal</code>.
- **Binding the field name when an alias exists.** The alias replaces the name entirely (NG8002).
- **Tests that assign inputs directly.** <code>component.label = "x"</code> no longer compiles; use <code>fixture.componentRef.setInput("label", "x")</code>. See [testing signal components](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed).
- **Trusting the migration blindly.** It skips assigned inputs, but in the run above it broke an input mutated with <code>++</code>.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input()</code> declares a component input as a read-only signal, so you read it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">label()</code> and anything derived from it can be a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it replaces:</strong> <span style="color:#f0e2c8;">"Instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> or setters copying values into derived fields, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> tracks the input and re-runs only when it changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The safety gains:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input.required()</code> is checked at build time with NG8008, there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code>, and the child cannot write to an input because it has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Same options:</strong> <span style="color:#f0e2c8;">"Aliases and transforms such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">booleanAttribute</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numberAttribute</code> are options on the function, just like on the decorator."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Status:</strong> <span style="color:#f0e2c8;">"Developer preview in 17.1, stable in v19. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code> still works and is not deprecated, and there is a migration schematic, but it needs a review."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component change its own signal input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InputSignal</code> has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, and the compiler reports TS2339. If the child owns the value as well, declare it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>; if it needs a local copy that resets when the parent changes, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linkedSignal</code> derived from the input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngOnChanges</code> still work with signal inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. In a verified run a child with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">qty = input(1)</code> still got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> with previous and current values. You rarely need it, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> cover derived state and side effects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not read a required input in the constructor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular sets inputs after the class is constructed. The compiler flags the read as NG8118 and the runtime throws NG0950. The first safe points are a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, the template or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a transform do and when do you need one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It converts the bound value before it is stored, and widens the accepted type. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">booleanAttribute</code> makes a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code> attribute mean true, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numberAttribute</code> turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"3"</code> into 3. Without it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount="3"</code> on a number input is a type error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you set a signal input in a unit test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by assigning the field. Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.componentRef.setInput("label", "Coffee")</code>, then let change detection run, or bind it from a small host component in the test.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal input** | An input declared with <code>input()</code>; a read-only signal Angular writes into |
| **<code>InputSignal&lt;T&gt;</code>** | The type of that field; callable, no <code>set</code> |
| **Required input** | <code>input.required&lt;T&gt;()</code>; must be bound, checked at build time |
| **Input transform** | Function that converts the bound value before storing it |
| **Input alias** | Public binding name that differs from the field name |
| **Derived state** | A value computed from inputs, written as <code>computed()</code> |
| **NG8008 / NG0950** | Missing required input at build time / read too early at runtime |
| **Signal input migration** | Schematic that rewrites <code>@Input()</code> to <code>input()</code> |

---
**Conclusion:** <code>input()</code> changes an input from a field you must watch into a signal you can depend on. Derived values move from <code>ngOnChanges</code> into <code>computed</code>, required inputs become a build error instead of a runtime surprise, transforms and aliases carry over unchanged, and the compiler marks signal inputs differently in the component definition. Angular 22.2.3 still supports <code>@Input()</code>, so migration can be gradual, but new code should use <code>input()</code>, reach for [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs) only when the child truly co-owns the value, and treat the migration schematic as a strong first draft rather than a finished change. For the bigger picture of inputs, models and outputs together, see [signal inputs and model() in modern Angular](/interview-question/what-are-signal-inputs-and-model-in-modern-angular).`,
    examples: [
      {
        label: "Signal inputs: required, transform, alias and a computed total (needs the Angular compiler)",
        tech: "angular",
        runnable: false,
        code: `import { Component, booleanAttribute, computed, input, numberAttribute, signal } from "@angular/core";

// CHILD: every input is a read-only signal the parent writes into.
@Component({
  selector: "price-tag",
  template: \`
    <p [class.sale]="onSale()">
      {{ label() }}: {{ total() }}
      @if (onSale()) { <strong>SALE</strong> }
    </p>
  \`,
})
export class PriceTagComponent {
  label = input.required<string>();                              // must be bound, or the build fails
  amount = input(0, { transform: numberAttribute });             // accepts "12" from a static attribute
  qty = input(1, { alias: "quantity" });                         // public name differs from the field
  onSale = input(false, { transform: booleanAttribute });        // <price-tag onSale> means true

  // Derived state: no ngOnChanges, no setter. Re-runs only when amount or qty change.
  total = computed(() => {
    const t = this.amount() * this.qty();
    console.log(\`  computed total ran: \${this.amount()} x \${this.qty()} = \${t}\`);
    return t;
  });
}

@Component({
  selector: "app-root",
  imports: [PriceTagComponent],
  template: \`
    <price-tag label="Coffee" amount="3" [quantity]="cups()" onSale />
    <button (click)="cups.update(n => n + 1)">One more cup</button>
  \`,
})
export class AppComponent {
  cups = signal(2);
}`,
      },
      {
        label: "The same component with @Input() and ngOnChanges",
        tech: "angular",
        runnable: true,
        code: `import { Component, Input, OnChanges, SimpleChanges, booleanAttribute, numberAttribute, signal } from "@angular/core";

// The SAME price tag written the decorator way (still supported, not deprecated in v22).
@Component({
  selector: "price-tag",
  template: \`
    <p>
      {{ label }}: {{ total }}
      @if (onSale) { <strong>SALE</strong> }
    </p>
  \`,
})
export class PriceTagComponent implements OnChanges {
  @Input({ required: true }) label!: string;                 // "!" because TS cannot see the parent set it
  @Input({ transform: numberAttribute }) amount = 0;
  @Input({ alias: "quantity" }) qty = 1;
  @Input({ transform: booleanAttribute }) onSale = false;

  total = 0; // derived state has to be kept in sync by hand

  ngOnChanges(changes: SimpleChanges) {
    console.log(\`  ngOnChanges: \${Object.keys(changes).join(", ")}\`);
    this.total = this.amount * this.qty;
  }
}

@Component({
  selector: "app-root",
  imports: [PriceTagComponent],
  template: \`
    <price-tag label="Coffee" amount="3" [quantity]="cups()" onSale />
    <button (click)="cups.update(n => n + 1)">One more cup</button>
  \`,
})
export class AppComponent {
  cups = signal(2);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are signal inputs and model() in modern Angular?",
    seoDescription:
      "Signal inputs are read-only signals a parent writes; model() is a writable signal input that reports changes back. When to use input, model or output.",
    description: `**Question presented to candidate:**
"Modern Angular components declare \`input()\`, \`model()\` and \`output()\` instead of decorators. Explain what signal inputs and \`model()\` are, and how you decide which one a given property should be."

**What a strong answer should cover:**
- A **signal input** (\`input()\`) is a read-only signal: the parent writes it through a binding, the child only reads it.
- A **model input** (\`model()\`) is a **writable** signal that is also an input plus an output named \`<name>Change\`, so the parent can bind it with \`[(name)]\`.
- The decision is about **ownership**: parent owns it (input), child and parent share it (model), child only reports an event (output).
- Derived values from either are \`computed()\`; neither needs \`ngOnChanges\`.
- A local, resettable copy of an input is \`linkedSignal\`, not a model.
- Both were developer preview in 17.x and are **stable since v19**.

**Clarifying questions expected:**
- "Should the parent always know the current value, or only be told when the user commits a change?"

**Code / implementation expected:** Yes — a small child with one \`input()\` and one \`model()\`, bound from a parent.`,
    answer: `**Target Audience:** Developers moving to signal-based components — assumes you know what a component and a binding are.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. This doc is the overview; the detailed mechanics live in [signal inputs versus @Input()](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1) and [model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs). Every output below came from compiling the code with <code>ngc</code> on Angular 22.2.3 and running it in jsdom.

## 1. Why This Even Matters — A Story First

Think about a shared family calendar on the kitchen wall.

Some entries are written only by a parent: the school holidays. The children read them but are not allowed to change them. Other entries are shared: "who is cooking on Friday" can be changed by anyone, and everyone who looks at the calendar sees the latest answer. And sometimes a child does not edit the calendar at all; they just shout "I finished my homework!" and let the parent decide what to do.

Those are the three ways data crosses a component boundary in modern Angular:

- written by the parent, read by the child: a **signal input**;
- shared by both, kept in sync: a **model**;
- a message from the child: an **output** (covered in [output() versus @Output()](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs)).

Interviewers ask this question to see whether you choose by **who owns the value**, not by habit.

## 2. The Core Idea

📌 **Interview term: Signal** — a value wrapper that records who reads it, so readers update when it changes. Read by calling it: <code>count()</code>. See [Angular Signals](/interview-question/what-are-angular-signals).

📌 **Interview term: Signal input** — <code>max = input(5)</code>. A read-only signal. The parent writes it through <code>[max]="3"</code>; the child reads <code>max()</code> and has no <code>set</code>.

📌 **Interview term: Model input** — <code>value = model(0)</code>. A writable signal that Angular exposes as **both** an input named <code>value</code> and an output named <code>valueChange</code>. The child can <code>set</code> or <code>update</code> it, and every change it makes is reported to the parent.

📌 **Interview term: Two-way binding** — <code>[(value)]="cups"</code>, the banana-in-a-box syntax. It wires the parent signal into the model and writes the model changes back into the parent signal. See [how two-way binding works under the hood](/interview-question/how-does-two-way-binding-work-under-the-hood).

The 22.2.3 typings make the relationship explicit. A model is literally all three things at once:

\`\`\`ts
interface ModelSignal<T> extends WritableSignal<T>, InputSignal<T>, OutputRef<T> { ... }
\`\`\`

## 3. Ownership Decides

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="input carries a value from parent to child, model keeps a value in sync both ways, output carries an event from child to parent">
  <defs>
    <marker id="sim-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="170" height="220" rx="12"/>
  <text class="d-text" x="115" y="135" text-anchor="middle">Parent</text>
  <text class="d-sub" x="115" y="157" text-anchor="middle">cups = signal(1)</text>
  <rect class="d-box-accent" x="520" y="30" width="170" height="220" rx="12"/>
  <text class="d-text d-accent" x="605" y="135" text-anchor="middle">Child</text>
  <text class="d-sub" x="605" y="157" text-anchor="middle">qty-stepper</text>
  <path class="d-edge" d="M 206 75 L 514 75" marker-end="url(#sim-arrow)"/>
  <text class="d-sub" x="360" y="63" text-anchor="middle">input: max, parent owns it</text>
  <path class="d-edge-accent" d="M 206 140 L 514 140" marker-end="url(#sim-arrow)"/>
  <path class="d-edge-accent" d="M 514 152 L 206 152" marker-end="url(#sim-arrow)"/>
  <text class="d-sub" x="360" y="128" text-anchor="middle">model: value, shared</text>
  <path class="d-edge-dashed" d="M 514 215 L 206 215" marker-end="url(#sim-arrow)"/>
  <text class="d-sub" x="360" y="203" text-anchor="middle">output: an event, child reports</text>
</svg>

The solid arrow is data the child may only read, the double arrow is data both sides keep in sync, and the dashed arrow is a one-off message rather than shared state.

| Question to ask | Answer | Use |
| :--- | :--- | :--- |
| Does only the parent decide this value? | Yes | <code>input()</code> |
| Does the child change it, and must the parent always see the current value? | Yes | <code>model()</code> |
| Does the child just announce that something happened? | Yes | <code>output()</code> |
| Does the child need its own editable copy that resets when the parent changes? | Yes | <code>input()</code> + <code>linkedSignal()</code> |
| Is it a form field that must work with forms APIs? | Yes | A form control: see [signal forms and ControlValueAccessor](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular) |

## 4. Verified: one input and one model in one child

The example at the bottom is a quantity stepper. <code>max</code> is an <code>input()</code> because the parent sets the limit; <code>value</code> is a <code>model()</code> because the child changes it and the parent needs the total. The parent binds <code>[(value)]="cups"</code> and <code>[max]="3"</code>. The driver clicked "+" three times, then the parent's reset button. Lines are root text content, so elements run together:

\`\`\`
[app] RENDERED: -1+Parent sees 1 cups, total 2 EURReset from parent
after + x3 : -3+Parent sees 3 cups, total 6 EURReset from parent | + disabled = true
after reset: -0+Parent sees 0 cups, total 0 EURReset from parent | - disabled = true
\`\`\`

Three things happened without any wiring code:

1. The child's <code>value.update()</code> changed the **parent's** <code>cups</code> signal, so the parent's total stayed correct.
2. The child's <code>atMax = computed(...)</code> combined the input and the model and disabled "+" at the limit of 3.
3. The parent's <code>cups.set(0)</code> flowed back down into the model, and the "-" button disabled itself.

## 5. Verified: model versus a local copy

A common mistake is reaching for <code>model()</code> when the child only needs a **draft** of an input. <code>linkedSignal</code> is the tool for that: a writable signal that resets whenever its source changes, with no output at all. A child with <code>name = input.required&lt;string&gt;()</code> and <code>draft = linkedSignal(() =&gt; this.name())</code> gave:

\`\`\`
[app] RENDERED: draft=Adaedit parent=Adaparent
child edits : draft=Ada!edit parent=Adaparent
parent sets : draft=Graceedit parent=Graceparent
\`\`\`

The child edited its draft without touching the parent, and a new value from the parent replaced the draft. With <code>model()</code> the child's edit would have been written straight into the parent.

## 6. What Each One Is, Precisely

| | <code>input()</code> | <code>model()</code> |
| :--- | :--- | :--- |
| Type | <code>InputSignal&lt;T&gt;</code> | <code>ModelSignal&lt;T&gt;</code> |
| Child can write | No | Yes: <code>set</code> / <code>update</code> |
| Public API | Input <code>x</code> | Input <code>x</code> + output <code>xChange</code> |
| Parent binds with | <code>[x]="v"</code> | <code>[(x)]="sig"</code>, or <code>[x]</code> alone, or <code>(xChange)</code> alone |
| Required form | <code>input.required&lt;T&gt;()</code> | <code>model.required&lt;T&gt;()</code> |
| Transform option | Yes | No: <code>ModelOptions</code> only has <code>alias</code> and <code>debugName</code> |
| Typical use | Configuration, data to display | Value controls: toggles, steppers, tabs, ratings |
| Stable since | v19 (developer preview from 17.1) | v19 (developer preview from 17.2) |

The missing transform on <code>model()</code> is deliberate: whatever the child writes is emitted back to the parent unchanged, so a transform would make the two sides disagree. The stability versions are from the <code>@publicApi 19.0</code> tags in the 22.2.3 typings; the 17.x preview dates are from the release coverage, for example <a href="https://itnext.io/model-inputs-reactive-two-way-binding-29a40c7626f2" target="_blank" rel="noopener noreferrer">Model Inputs: Reactive Two-Way Binding</a>.

## 7. How They Fit with the Rest of Angular

- **Change detection.** A template that reads <code>value()</code> is marked for refresh when the signal changes, which matters because v22 components are OnPush by default and new apps are [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18). See [how change detection works](/interview-question/how-does-change-detection-work-in-angular).
- **[Lifecycle](/interview-question/what-are-angular-lifecycle-hooks).** Neither is set in the constructor. Read them in a <code>computed</code>, the template or <code>ngOnInit</code> ([constructor versus ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit)).
- **Side effects.** To react to a change (log, save, call an API) use an [effect()](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it), or listen to the model output.
- **Queries.** The same signal style applies to <code>viewChild()</code> and <code>contentChild()</code>; see [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed).

## 8. Common Pitfalls

- **Using <code>model()</code> for everything.** If the parent owns the value, a model lets the child silently change parent state. Prefer <code>input()</code> unless the child genuinely edits it.
- **Using <code>model()</code> for a draft.** A draft that resets on new parent data is <code>linkedSignal</code> over an input, as verified above.
- **Binding <code>[(value)]="cups()"</code>.** The parentheses read the value instead of passing the signal; the compiler rejects it with NG5002 (details in [model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs)).
- **Expecting a transform on a model.** There is no <code>transform</code> option; convert in the parent or in a <code>computed</code>.
- **Treating an output as state.** An output is a one-off event. If the parent needs the current value at all times, it should be a model or live in a [shared service](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-).
- **Forgetting parentheses in templates.** <code>{{ value }}</code> prints the signal function; <code>{{ value() }}</code> prints the value.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A signal input is a read-only signal the parent writes through a binding; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> is a writable signal input that also reports every change back as an output."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ownership rule:</strong> <span style="color:#f0e2c8;">"Parent owns it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input()</code>. Child and parent share it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>. Child only announces something: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How model binds:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> creates an input <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> and an output <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code>, so the parent writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]="cups"</code> with a signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What disappears:</strong> <span style="color:#f0e2c8;">"No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> and no setters: derived state is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> over inputs and models, and the template refreshes when they change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Status:</strong> <span style="color:#f0e2c8;">"Developer preview in 17.1 and 17.2, stable since v19, and the recommended style in Angular 22, where components are OnPush by default."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">model()</code> even though the child edits the value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the edit is a draft. If the child needs a local copy that resets when the parent sends new data, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linkedSignal(() =&gt; this.name())</code> over an input. The verified run showed the child editing its copy without touching the parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a parent use a model with one-way binding only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]="x"</code> binds only the input side, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(valueChange)</code> can be used on its own. But then the child can drift from the parent, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code> with a signal is the normal pairing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">model()</code> have no transform option?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the value is written in both directions. A transform would change what the child stores but not what it emits, so parent and child could disagree. Convert in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">model()</code> a replacement for ControlValueAccessor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For simple value components used with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code>, yes, and it is far less code. For components that must work with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControl</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code>, you still need a value accessor or the newer signal forms APIs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do signal inputs help with OnPush?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reading a signal in the template records a dependency, so a new value marks exactly that view for refresh. That is the reliable trigger in zoneless, OnPush-by-default Angular 22.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | A value that tracks its readers |
| **Signal input** | <code>input()</code>; read-only signal set by the parent |
| **Model input** | <code>model()</code>; writable signal exposed as input <code>x</code> plus output <code>xChange</code> |
| **Two-way binding** | <code>[(x)]="sig"</code>; keeps a parent signal and a model in sync |
| **<code>linkedSignal</code>** | Writable signal that resets when its source changes |
| **Ownership** | Who is allowed to change a value; decides input, model or output |

---
**Conclusion:** Signal inputs and <code>model()</code> are two halves of the same idea. An input is a signal the parent writes and the child reads; a model is a signal both sides may write, kept in sync through an input and a matching <code>Change</code> output. Choosing between them, and output and <code>linkedSignal</code>, comes down to who owns the value, and the verified stepper shows how little code that takes once the choice is right. For the mechanics, go deeper in [signal inputs versus @Input()](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1) and [model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).`,
    examples: [
      {
        label: "A stepper with input() for the limit and model() for the value (needs the Angular compiler)",
        tech: "angular",
        runnable: false,
        code: `import { Component, computed, input, model, signal } from "@angular/core";

// CHILD: input() for data it only reads, model() for the value it may change.
@Component({
  selector: "qty-stepper",
  template: \`
    <button (click)="step(-1)" [disabled]="value() <= 0">-</button>
    <span>{{ value() }}</span>
    <button (click)="step(1)" [disabled]="atMax()">+</button>
  \`,
})
export class QtyStepperComponent {
  max = input(5);         // read-only for the child: the parent owns it
  value = model(0);       // writable by the child AND bindable with [(value)]

  atMax = computed(() => this.value() >= this.max());

  step(delta: number) {
    this.value.update(v => v + delta); // writing a model also emits valueChange to the parent
  }
}

@Component({
  selector: "app-root",
  imports: [QtyStepperComponent],
  template: \`
    <qty-stepper [(value)]="cups" [max]="3" />
    <p>Parent sees {{ cups() }} cups, total {{ cups() * 2 }} EUR</p>
    <button (click)="cups.set(0)">Reset from parent</button>
  \`,
})
export class AppComponent {
  cups = signal(1);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is model() — two-way signal binding with model inputs?",
    seoDescription:
      "model() creates a writable signal input plus an xChange output. Verified: when it emits, when it does not, one-way drift, aliases and compiler errors.",
    description: `**Question presented to candidate:**
"Show me how \`model()\` works. If a child declares \`rating = model(0)\`, what does the parent bind, what actually gets emitted and when, and what goes wrong if the parent only binds one way?"

**What a strong answer should cover:**
- \`model()\` declares an input \`rating\` **and** an output \`ratingChange\` from one field; \`[(rating)]="sig"\` binds both.
- The output fires only when **the child** sets a **different** value; writes coming from the parent do not echo back.
- \`[(rating)]\` takes the signal itself (\`sig\`, not \`sig()\`); a plain field also works.
- One-way \`[rating]\` lets the child drift from the parent until the parent sends a different value.
- \`model.required()\`, \`alias\` (the output becomes \`<alias>Change\`), and programmatic \`subscribe\`.
- When to prefer \`input()\` + \`output()\` or a form control instead.

**Clarifying questions expected:**
- "Is the parent value a signal or a plain field?"
- "Does this need to plug into reactive forms as well?"

**Code / implementation expected:** Yes — a child with \`model()\` used two-way, one-way and against a plain field.`,
    answer: `**Target Audience:** Developers who have seen <code>[(x)]</code> and want to know exactly what <code>model()</code> does — assumes signals and inputs.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. For when to choose a model at all, see the overview [signal inputs and model()](/interview-question/what-are-signal-inputs-and-model-in-modern-angular). Every output and error below came from compiling the code with <code>ngc</code> on Angular 22.2.3 and running it in jsdom; the internals are quoted from the installed <code>@angular/core</code> 22.2.3 bundle.

## 1. Why This Even Matters — A Story First

Two people edit the same shared document. If every keystroke from person A is sent to person B, and B's editor sends every change it receives straight back to A, the two editors will bounce the same edit back and forth forever. A good sync system needs one rule: **only report changes you made yourself**.

<code>model()</code> is Angular's built-in version of that rule for a single value shared by a parent and a child. Knowing exactly when it reports and when it stays quiet is what this question is really about.

## 2. The Core Idea

📌 **Interview term: Model input** — <code>rating = model(0)</code> in a child. One class field becomes a public input <code>rating</code> and a public output <code>ratingChange</code>. Inside the child it is a normal writable [signal](/interview-question/what-are-angular-signals): <code>rating()</code>, <code>rating.set(5)</code>, <code>rating.update(n =&gt; n + 1)</code>.

📌 **Interview term: Change output** — the output Angular generates by appending <code>Change</code> to the input name. It emits the new value each time the child changes the model.

📌 **Interview term: Required model** — <code>model.required&lt;number&gt;()</code>; the parent must bind the input side.

📌 **Interview term: One-way drift** — what happens when a parent binds only <code>[rating]</code>: the child's local changes never reach the parent, so the two can show different values.

The compiler confirms the one-field, two-names idea. The definition <code>ngc</code> emits for a child with <code>v = model(0)</code> is:

\`\`\`js
inputs: { v: [1, "v"] }, outputs: { v: "vChange" }
\`\`\`

The <code>1</code> marks a signal-based input; the output map says the field <code>v</code> is published as the event <code>vChange</code>.

## 3. When It Emits

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A child set of a new value updates the signal and emits ratingChange, a parent binding writes the signal directly without emitting, a set of the same value does nothing">
  <defs>
    <marker id="mod-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="30" width="200" height="48" rx="10"/>
  <text class="d-text d-accent" x="140" y="59" text-anchor="middle">child: rating.set(5)</text>
  <rect class="d-box-muted" x="40" y="126" width="200" height="48" rx="10"/>
  <text class="d-text" x="140" y="155" text-anchor="middle">parent binding: 1</text>
  <rect class="d-box" x="40" y="222" width="200" height="48" rx="10"/>
  <text class="d-text" x="140" y="251" text-anchor="middle">child: set same value</text>
  <rect class="d-box" x="300" y="78" width="160" height="96" rx="12"/>
  <text class="d-text" x="380" y="122" text-anchor="middle">model signal</text>
  <text class="d-sub" x="380" y="144" text-anchor="middle">value stored here</text>
  <path class="d-edge-accent" d="M 244 58 L 296 100" marker-end="url(#mod-arrow)"/>
  <path class="d-edge" d="M 244 150 L 296 140" marker-end="url(#mod-arrow)"/>
  <path class="d-edge-dashed" d="M 244 246 L 296 170" marker-end="url(#mod-arrow)"/>
  <rect class="d-box-accent" x="520" y="30" width="170" height="48" rx="10"/>
  <text class="d-text d-accent" x="605" y="59" text-anchor="middle">ratingChange(5)</text>
  <path class="d-edge-accent" d="M 464 100 L 516 58" marker-end="url(#mod-arrow)"/>
  <rect class="d-box-muted" x="520" y="126" width="170" height="48" rx="10"/>
  <text class="d-text" x="605" y="155" text-anchor="middle">no event</text>
  <rect class="d-box-muted" x="520" y="222" width="170" height="48" rx="10"/>
  <text class="d-text" x="605" y="251" text-anchor="middle">nothing at all</text>
</svg>

Only the top path produces an event. A value pushed in by the parent is stored without emitting, and setting the value it already holds is ignored entirely, which is what stops the echo loop from the story.

The installed 22.2.3 runtime shows why. The child-facing <code>set</code> of a model checks equality and then emits:

\`\`\`js
getter.set = newValue => {
  if (!node.equal(node.value, newValue)) {
    signalSetFn(node, newValue);
    emitterRef.emit(newValue);
  }
};
\`\`\`

while a parent binding goes through the input path, <code>applyValueToInputSignal(node, value) { signalSetFn(node, value); }</code>, which writes the node directly and never touches the emitter.

## 4. Verified: two-way, one-way and a plain field

The example at the bottom renders the same <code>star-rating</code> three times: **A** bound <code>[(rating)]="sig"</code> to a signal, **B** bound one-way with <code>[rating]="oneWay()"</code>, **C** bound <code>[(rating)]="plain"</code> to a plain field. The child also subscribes to its own model to log every emission. Driver output:

\`\`\`
click star 5 in A:
  ratingChange emitted 5
    A two-way to a signal: ***** parent=5
    B one-way only: ***.. parent=3
    C two-way to a field: ***.. parent=3
click star 5 in A again (same value):
click star 2 in B:
  ratingChange emitted 2
    A two-way to a signal: ***** parent=5
    B one-way only: **... parent=3
    C two-way to a field: ***.. parent=3
click star 4 in C:
  ratingChange emitted 4
    A two-way to a signal: ***** parent=5
    B one-way only: **... parent=3
    C two-way to a field: ****. parent=4
parent sets 1:
    A two-way to a signal: *.... parent=1
    B one-way only: *.... parent=1
    C two-way to a field: ****. parent=4
\`\`\`

Reading it line by line:

- **A:** the child's <code>set(5)</code> emitted once and the parent signal became 5. Clicking 5 again emitted nothing: equal values are ignored.
- **B:** the child still emitted (it always does when it changes), but nobody was listening, so the parent stayed at 3 while the child showed 2. That is one-way drift.
- **C:** a plain field works too, and even though the component is [OnPush by default](/interview-question/how-does-change-detection-work-in-angular), the parent text updated, because the event handler marked the view dirty.
- **Parent sets 1:** both signals flowed down, and **no** <code>ratingChange</code> line was logged: parent writes do not echo.

## 5. Verified: the drift trap

The nasty part of one-way drift is that it can persist. Continuing scenario B, the child picked 2 and then the parent set its signal to 3, the value it already had:

\`\`\`
B after child picks 2: B one-way only: **... parent=3
parent sets oneWay to 3 (unchanged): B one-way only: **... parent=3
\`\`\`

The binding value did not change (3 to 3), so Angular did not write the input again, and the child kept showing 2 stars. Only a **different** parent value overrides the child. If both sides must agree, bind both directions.

## 6. Verified: compiler checks

| Template | Result |
| :--- | :--- |
| <code>&lt;c-x [(v)]="s()" /&gt;</code> | <code>NG5002: Unsupported expression in a two-way binding</code> |
| <code>&lt;c-x [(v)]="d" /&gt;</code> with <code>d = computed(...)</code> | <code>TS2322: Type 'Signal&lt;number&gt;' is not assignable to type 'number'.</code> |
| <code>&lt;c-x [(v)]="s" /&gt;</code> with <code>s = signal("one")</code> | <code>TS2322: Type 'string' is not assignable to type 'number'.</code> |
| <code>&lt;c-x /&gt;</code> with <code>v = model.required&lt;number&gt;()</code> | <code>NG8008: Required input 'v' from component C must be specified.</code> |
| <code>[(v)]</code> on <code>v = input(0)</code> (no model) | <code>NG8007: The property and event halves of the two-way binding 'v' are not bound to the same target.</code> |
| <code>&lt;c-x [(count)]="s" /&gt;</code> with <code>model(0, { alias: "count" })</code> | Compiles; the output is <code>countChange</code> |

Two rules fall out of this. The right-hand side of <code>[(x)]</code> must be something writable, so a call or a <code>computed</code> is rejected; and the target must have both halves, which a <code>model()</code> provides and a bare <code>input()</code> does not. For the instructions the compiler generates for <code>[(x)]</code>, see [how two-way binding works under the hood](/interview-question/how-does-two-way-binding-work-under-the-hood).

From the same runtime source, reading or updating a required model before it has a value throws <code>NG0952</code> with the message <code>Model is required but no value is available yet.</code>

## 7. Model or Input Plus Output?

| Situation | Better choice |
| :--- | :--- |
| The child edits a value and the parent should always hold the current one | <code>model()</code> with <code>[(x)]</code> |
| The child proposes a change the parent may reject or validate | <code>input()</code> + <code>output()</code>: the parent decides whether to apply it |
| The child emits something that is not the same value (a save request, a click) | <code>output()</code> (see [output() versus @Output()](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs)) |
| The value must work with <code>formControl</code> or <code>ngModel</code> ([forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms)) | A form control: [ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-) or [signal forms](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular) |
| The child needs an editable draft that resets from the parent | <code>input()</code> + <code>linkedSignal()</code> |

## 8. Common Pitfalls

- **Writing <code>[(rating)]="sig()"</code>.** Pass the signal, not its value (NG5002).
- **Binding a <code>computed</code>.** It is not writable; derive in the parent from a writable source instead.
- **Expecting an event when the parent changes the value.** Parent writes never emit <code>ratingChange</code>. React to changes on the parent side with <code>computed</code> or an [effect()](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
- **Relying on one-way binding to reset the child.** Sending the same value again does nothing, as verified in section 5.
- **Mutating an object in a model.** <code>items().push(x)</code> changes nothing Angular can see and emits nothing; call <code>items.update(list =&gt; [...list, x])</code>.
- **Using a model where the parent must approve changes.** A model writes the parent first and asks no questions; use input plus output for validation flows.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> declares one writable signal that Angular publishes as an input <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> and an output <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xChange</code>, so a parent can bind it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(x)]</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When it emits:</strong> <span style="color:#f0e2c8;">"Only when the child sets a different value. Parent writes go straight into the signal without emitting, and equal values are ignored, so there is no echo loop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to bind:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(rating)]="sig"</code> with the signal itself, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sig()</code>. A plain field also works because the compiler falls back to assignment."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;">"With one-way <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[rating]</code> the child can drift from the parent, and re-sending the same value does not reset it. I verified that it stays out of sync."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When not to use it:</strong> <span style="color:#f0e2c8;">"If the parent must validate the change, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input()</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code>. If it must work with forms APIs, write a form control."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">model()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">input()</code> plus <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">output()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functionally they produce the same public API, an input and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Change</code> output. The difference is that a model writes its own value first, so the child immediately shows the new value. With input plus output the child only proposes, and nothing changes unless the parent writes the input back.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you listen to a model change in code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ModelSignal</code> is also an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OutputRef</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.rating.subscribe(v =&gt; ...)</code> works, and the parent can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(ratingChange)="..."</code>. For deriving values prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, since subscribe only fires on child writes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with an alias?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model(0, { alias: "count" })</code> exposes the input as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> and the output as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">countChange</code>. The class field keeps its own name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the plain field update even though the component is OnPush?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the update came through a template event listener, and event listeners mark the view dirty. A plain field changed in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> would not re-render in zoneless, OnPush-by-default Angular 22.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you mutate an array held in a model?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing visible. The signal holds the same reference, so its equality check sees no change, nothing re-renders and nothing is emitted. Always set a new array or object.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Model input** | <code>model()</code>; writable signal plus input <code>x</code> and output <code>xChange</code> |
| **Change output** | The generated <code>xChange</code> event; fires on child writes only |
| **Required model** | <code>model.required&lt;T&gt;()</code>; parent must bind it |
| **One-way drift** | Child and parent disagree because only <code>[x]</code> was bound |
| **NG5002** | Unsupported expression on the right of <code>[(x)]</code>, for example a call |
| **NG8007** | <code>[(x)]</code> on a target that lacks the matching <code>xChange</code> |
| **NG0952** | A required model was read before it had a value |

---
**Conclusion:** <code>model()</code> packs an input, an output and a writable signal into one field, and its behaviour comes down to one rule visible in the 22.2.3 source: emit only when the child sets a different value. That rule is why <code>[(x)]</code> never loops, why parent updates arrive silently, and why one-way binding can leave the child out of sync. Bind the signal itself, keep values immutable, and switch to input plus output when the parent must approve a change.`,
    examples: [
      {
        label: "model.required(): two-way to a signal, one-way, and two-way to a plain field (needs the Angular compiler)",
        tech: "angular",
        runnable: false,
        code: `import { Component, model, signal } from "@angular/core";

// CHILD: one model.required() field = an input "rating" + an output "ratingChange".
@Component({
  selector: "star-rating",
  template: \`
    @for (n of [1, 2, 3, 4, 5]; track n) {
      <button (click)="rating.set(n)">{{ n <= rating() ? "*" : "." }}</button>
    }
  \`,
})
export class StarRatingComponent {
  rating = model.required<number>();

  constructor() {
    // A model is also an OutputRef: you can listen to its Change event in code.
    this.rating.subscribe(v => console.log(\`  ratingChange emitted \${v}\`));
  }
}

@Component({
  selector: "app-root",
  imports: [StarRatingComponent],
  template: \`
    <p>A two-way to a signal: <star-rating [(rating)]="sig" /> parent={{ sig() }}</p>
    <p>B one-way only:        <star-rating [rating]="oneWay()" /> parent={{ oneWay() }}</p>
    <p>C two-way to a field:  <star-rating [(rating)]="plain" /> parent={{ plain }}</p>
    <button (click)="sig.set(1); oneWay.set(1)">Parent sets 1</button>
  \`,
})
export class AppComponent {
  sig = signal(3);
  oneWay = signal(3);
  plain = 3; // works too: the compiler falls back to plain assignment
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "output() vs @Output() EventEmitter — the new signal outputs?",
    seoDescription:
      "output() returns a lightweight OutputEmitterRef instead of an RxJS EventEmitter. Verified differences: no pipe, cleanup on destroy, errors and migration.",
    description: `**Question presented to candidate:**
"Angular 17.3 added \`output()\`. Our components use \`@Output() saved = new EventEmitter<Item>()\`. What is different about \`output()\`, is it actually a signal, and should we migrate?"

**What a strong answer should cover:**
- \`output()\` returns an \`OutputEmitterRef<T>\` with \`emit()\` and \`subscribe()\`; the template side, \`(saved)="..."\`, is unchanged.
- It is **not a signal** (it holds no value) and **not an RxJS Subject**: no \`pipe\`, no \`next\`, no \`complete\`. Convert with \`outputToObservable()\` if you need operators.
- Lifecycle: listeners are dropped when the component is destroyed; a late \`emit()\` only warns (NG0953) and a late \`subscribe()\` throws. A leftover \`EventEmitter\` subscription keeps firing.
- Must be created in an injection context (field initializer), like \`input()\`.
- Aliases are an option: \`output<number>({ alias: "remove" })\`.
- Stable since v19; \`@Output\` still supported; \`ng generate @angular/core:output-migration\` rewrites it.

**Clarifying questions expected:**
- "Does any code call \`.pipe()\` or \`.subscribe()\` on these emitters directly, or are they only used from templates?"

**Code / implementation expected:** Yes — the same child with \`output()\` and with \`@Output()\` + \`EventEmitter\`.`,
    answer: `**Target Audience:** Developers who know <code>@Output()</code> and <code>EventEmitter</code> — assumes the basics of [child-to-parent events](/interview-question/how-do-child-components-emit-events-to-parents).
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The basics of emitting an event are covered in [how child components emit events to parents](/interview-question/how-do-child-components-emit-events-to-parents); this doc is about what changes with <code>output()</code>. All outputs below came from compiling with <code>ngc</code> on Angular 22.2.3 and running in jsdom, from plain Node scripts against the installed package, or from running the CLI 22.2.3 migration.

## 1. Why This Even Matters — A Story First

For years, a child component that wanted to say "I was clicked" was handed a full broadcasting studio: an RxJS <code>Subject</code>, with operators, completion, error channels and the ability to be piped into anything. All it ever did was say one sentence into the microphone.

<code>output()</code> replaces the studio with a doorbell. You press it (<code>emit</code>), whoever is listening hears it, and when the house is demolished the doorbell is disconnected. It does less, and that is the point: less API, less bundle, and fewer ways to leak.

The interview angle is usually: "Is <code>output()</code> a signal?" (no), "What do you lose?" (RxJS operators on the emitter itself), and "What do you gain?" (cleaner types and automatic cleanup).

## 2. The Core Idea

📌 **Interview term: <code>output()</code>** — a function called in a field initializer: <code>saved = output&lt;Item&gt;()</code>. It returns an <code>OutputEmitterRef&lt;Item&gt;</code> and registers <code>saved</code> as an output of the component.

📌 **Interview term: <code>OutputEmitterRef</code>** — the small class behind it, with two public methods: <code>emit(value)</code> and <code>subscribe(callback)</code>, which returns an <code>OutputRefSubscription</code> with <code>unsubscribe()</code>.

📌 **Interview term: <code>EventEmitter</code>** — the classic output type. The 22.2.3 typings declare <code>interface EventEmitter&lt;T&gt; extends Subject&lt;T&gt;, OutputRef&lt;T&gt;</code>: it is an RxJS [Subject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject) that also satisfies the output contract.

📌 **Interview term: <code>OutputRef</code>** — the shared interface both implement: anything with <code>subscribe(cb)</code> can be a component output. <code>model()</code> and <code>outputFromObservable()</code> also implement it.

Despite the "signal outputs" nickname, an output holds **no current value**. You cannot read it like <code>saved()</code>; it only delivers events. It belongs to the [signal](/interview-question/what-are-angular-signals)-era API family (<code>input</code>, <code>model</code>, <code>output</code>, [<code>viewChild</code>](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed)) because it is a function declared the same way, not because it is reactive state.

## 3. Same Event, Two Machines

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="EventEmitter is a full RxJS Subject with pipe next error and complete, OutputEmitterRef only has emit and subscribe and drops listeners on destroy">
  <defs>
    <marker id="out-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="30" text-anchor="middle">@Output() EventEmitter</text>
  <rect class="d-box-muted" x="40" y="48" width="280" height="200" rx="12"/>
  <rect class="d-box" x="70" y="70" width="220" height="36" rx="8"/>
  <text class="d-sub" x="180" y="93" text-anchor="middle">emit, subscribe</text>
  <rect class="d-box" x="70" y="122" width="220" height="36" rx="8"/>
  <text class="d-sub" x="180" y="145" text-anchor="middle">pipe, next, error, complete</text>
  <rect class="d-box" x="70" y="174" width="220" height="36" rx="8"/>
  <text class="d-sub" x="180" y="197" text-anchor="middle">optional async delivery</text>
  <text class="d-sub" x="180" y="236" text-anchor="middle">an RxJS Subject</text>
  <text class="d-text d-accent" x="540" y="30" text-anchor="middle">output()</text>
  <rect class="d-box-accent" x="400" y="48" width="280" height="200" rx="12"/>
  <rect class="d-box" x="430" y="70" width="220" height="36" rx="8"/>
  <text class="d-sub" x="540" y="93" text-anchor="middle">emit, subscribe</text>
  <rect class="d-box" x="430" y="122" width="220" height="36" rx="8"/>
  <text class="d-sub" x="540" y="145" text-anchor="middle">listeners dropped on destroy</text>
  <rect class="d-box" x="430" y="174" width="220" height="36" rx="8"/>
  <text class="d-sub" x="540" y="197" text-anchor="middle">outputToObservable for RxJS</text>
  <text class="d-sub" x="540" y="236" text-anchor="middle">a plain listener list</text>
  <path class="d-edge-accent" d="M 324 148 L 396 148" marker-end="url(#out-arrow)"/>
</svg>

Both sides have the same first row, which is all most templates ever use. Everything else on the left is RxJS surface area that an output rarely needs; on the right it is replaced by lifecycle awareness.

## 4. Side by Side

| | <code>@Output() x = new EventEmitter&lt;T&gt;()</code> | <code>x = output&lt;T&gt;()</code> |
| :--- | :--- | :--- |
| Type | <code>EventEmitter&lt;T&gt;</code> (extends RxJS <code>Subject</code>) | <code>OutputEmitterRef&lt;T&gt;</code> |
| Template usage | <code>(x)="handle($event)"</code> | Same |
| <code>pipe()</code> on it | Yes | No; use <code>outputToObservable(this.x)</code> |
| Alias | <code>@Output("remove")</code> | <code>output({ alias: "remove" })</code> |
| Async delivery | <code>new EventEmitter(true)</code> | Not available; always synchronous |
| After the component is destroyed | Code subscribers still receive values | <code>emit</code> warns NG0953 and drops; <code>subscribe</code> throws NG0953 |
| Where it can be created | Anywhere | Injection context only (NG0203 otherwise) |
| Needs RxJS | Yes | No |
| Status in 22.2.3 | Supported, not deprecated | Stable since v19 (<code>@publicApi 19.0</code>) |

## 5. Verified: the same child both ways

The two examples at the bottom are the same todo item, once with <code>output()</code> and once with <code>@Output()</code> + <code>EventEmitter</code>, both using an alias so the parent listens with <code>(remove)</code>. Both produced identical output (root text content, elements run together):

\`\`\`
[app] RENDERED: Write tests x Ship it x2 left
tick first box:
  parent got toggled(1)
rendered: Write tests x Ship it x1 left
click x on second:
  parent got remove(2)
rendered: Write tests x0 left
\`\`\`

The parent template did not change at all between the two. That is why migration is low-risk for outputs that are only used from templates.

## 6. Verified: where they behave differently

One child declared <code>modern = output&lt;number&gt;()</code> and <code>@Output() legacy = new EventEmitter&lt;number&gt;()</code>. The parent listened to both from the template, also subscribed to both in code, made the template listeners throw on the value 2, then destroyed the child and kept a reference to it:

\`\`\`
 legacy has pipe(): function | modern has pipe(): undefined
 emit 2
  modern template listener: 2
  ErrorHandler got: modern template listener threw
  modern programmatic listener: 2
  modern.emit returned
  legacy template listener: 2
  ErrorHandler got: legacy template listener threw
  legacy programmatic listener: 2
  legacy.emit returned
 after destroy:
  console.warn: NG0953: Unexpected emit for destroyed \`OutputRef\`. The owning directive/component is destroyed.
  modern emit after destroy returned
  legacy programmatic listener: 99
  legacy emit after destroy returned
  modern subscribe after destroy threw: NG0953: Unexpected subscription to destroyed \`OutputRef\`. The owning directive/component is destroyed.
\`\`\`

What this shows:

1. **No RxJS surface.** <code>pipe</code> exists on the emitter and not on the output ref.
2. **Errors are isolated in both.** A throwing listener went to the app <code>ErrorHandler</code> and the next listener still ran. <code>emit()</code> is synchronous in both: every listener ran before it returned.
3. **Destruction is the real difference.** After the child was destroyed, the <code>EventEmitter</code> still delivered 99 to the leftover code subscription, which is a classic leak. The output ref warned and delivered nothing, and refused new subscriptions. For more on leaks, see [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).

In the 22.2.3 source the output ref registers <code>destroyRef.onDestroy(() => { this.destroyed = true; this.listeners = null; })</code> when it is created, which is why it needs an injection context.

## 7. Verified: two smaller differences

From a plain Node script against <code>@angular/core</code> 22.2.3:

\`\`\`
before emit
sync listener 1
after emit
async listener 2
output() outside injection context: NG0203: output() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`.
\`\`\`

<code>new EventEmitter(true)</code> delivers asynchronously; <code>output()</code> has no such option. And <code>output()</code> must be called where Angular can inject a <code>DestroyRef</code>, normally a field initializer. See [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it) for the rare case you need one elsewhere.

## 8. Verified: the migration schematic

On an app generated with CLI 22.2.3, a component with <code>@Output() picked = new EventEmitter&lt;string&gt;()</code> was run through <code>ng generate @angular/core:output-migration</code>:

\`\`\`
Successfully migrated to outputs as functions 🎉
  -> Migrated 1 out of 1 detected outputs (100.00 %).
\`\`\`

The field became <code>readonly picked = output&lt;string&gt;();</code> and the <code>emit</code> call was left as is. Review any code that used RxJS methods on the emitter, because those have no equivalent on the new type.

## 9. Versions

<code>output()</code> arrived in developer preview in 17.3 (<a href="https://angularindepth.com/article/streamlining-communication-new-signals-api-in-angular-17-3/" target="_blank" rel="noopener noreferrer">Angular In Depth on 17.3</a>) and became stable in v19; the 22.2.3 typings tag both <code>output</code> and <code>OutputOptions</code> with <code>@publicApi 19.0</code>. <code>@Output</code> and <code>EventEmitter</code> carry no deprecation tag in 22.2.3.

## 10. Common Pitfalls

- **Calling it a signal.** It has no value to read. If the parent needs the current value at all times, use a [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).
- **Calling <code>.pipe()</code> on an output.** It does not exist; wrap with <code>outputToObservable</code>, or build the stream first and expose it with <code>outputFromObservable</code> (see [output() and outputFromObservable()](/interview-question/explain-what-output-and-outputfromobservable-are-in-modern-angular-and-how-they-)).
- **Creating it in a method.** <code>output()</code> outside an injection context throws NG0203.
- **Emitting after destroy.** With <code>output()</code> the value is silently dropped apart from a dev warning; a timer that keeps emitting is still a bug to fix.
- **Assuming async delivery.** Both deliver synchronously by default, so a handler that changes parent state runs before <code>emit()</code> returns.
- **Naming an output after a DOM event.** <code>click = output()</code> on a component means a parent <code>(click)</code> handler hears both your event and native clicks that bubble from inside the component; pick a specific name.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code> declares a component event as a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OutputEmitterRef</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe</code>, replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output()</code> with an RxJS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EventEmitter</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Not a signal:</strong> <span style="color:#f0e2c8;">"Despite the name it holds no value; it is a listener list. It joins the signal-era APIs because it is declared like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input()</code>, not because it is reactive state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What you lose:</strong> <span style="color:#f0e2c8;">"No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pipe</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">complete</code> or async mode. If you need operators, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputToObservable()</code> or build the stream and expose it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputFromObservable()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What you gain:</strong> <span style="color:#f0e2c8;">"It is tied to the component lifecycle: on destroy, listeners are dropped, a late emit only warns NG0953, and a late subscribe throws. A leftover EventEmitter subscription kept firing in my test."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"Templates do not change. Stable since v19, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code> still supported, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output-migration</code> rewrites the fields; check code that used RxJS methods on them."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">output()</code> faster than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">EventEmitter</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is lighter rather than measurably faster per event: no Subject, no RxJS dependency for that component, and a simple array of listeners. The practical gains are bundle size, simpler types and lifecycle safety.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you subscribe to an output from code, for example on a dynamically created component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">componentRef.instance.saved.subscribe(v =&gt; ...)</code> works for both kinds. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code> you get an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OutputRefSubscription</code>, and Angular cleans it up when that component is destroyed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a listener throws?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In both, the error goes to the app <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ErrorHandler</code> and the remaining listeners still run. That was verified with two listeners where the first threw.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">output()</code> in a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Outputs are a component and directive concept, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code> needs the component injection context for its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>. A service would expose a signal or an observable instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test an output?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subscribe to it on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.componentInstance</code>, trigger the action, and assert on what the callback received. Or render it inside a small host component and bind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(saved)</code> to a spy.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>output()</code>** | Function that declares a component event |
| **<code>OutputEmitterRef</code>** | The object it returns: <code>emit</code> and <code>subscribe</code> only |
| **<code>EventEmitter</code>** | Classic output type; an RxJS Subject |
| **<code>OutputRef</code>** | Interface for anything a parent can listen to |
| **NG0953** | Emit or subscribe on an output whose component is destroyed |
| **NG0203** | <code>output()</code> called outside an injection context |
| **Output migration** | Schematic that rewrites <code>@Output()</code> to <code>output()</code> |

---
**Conclusion:** <code>output()</code> keeps the template contract of <code>@Output()</code> and throws away everything an event rarely needs. The verified differences are small but real: no RxJS methods on the emitter, synchronous delivery only, creation in an injection context, and lifecycle-aware cleanup that turned a leaking subscription into a dev warning. For new code it is the default choice, and the migration schematic handles the mechanical part; when the event really is a stream, combine it with RxJS as shown in [output() and outputFromObservable()](/interview-question/explain-what-output-and-outputfromobservable-are-in-modern-angular-and-how-they-).`,
    examples: [
      {
        label: "Todo item with output() and an aliased output (needs the Angular compiler)",
        tech: "angular",
        runnable: false,
        code: `import { Component, computed, input, output, signal } from "@angular/core";

type Todo = { id: number; text: string; done: boolean };

// CHILD: declares outputs with output(). No EventEmitter, no @Output, no RxJS.
@Component({
  selector: "todo-item",
  template: \`
    <label>
      <input type="checkbox" [checked]="todo().done" (change)="toggled.emit(todo().id)" />
      {{ todo().text }}
    </label>
    <button (click)="removed.emit(todo().id)">x</button>
  \`,
})
export class TodoItemComponent {
  todo = input.required<Todo>();
  toggled = output<number>();                    // OutputEmitterRef<number>
  removed = output<number>({ alias: "remove" }); // parent listens with (remove)
}

@Component({
  selector: "app-root",
  imports: [TodoItemComponent],
  template: \`
    @for (t of todos(); track t.id) {
      <todo-item [todo]="t" (toggled)="toggle($event)" (remove)="remove($event)" />
    }
    <p>{{ left() }} left</p>
  \`,
})
export class AppComponent {
  todos = signal<Todo[]>([
    { id: 1, text: "Write tests", done: false },
    { id: 2, text: "Ship it", done: false },
  ]);
  left = computed(() => this.todos().filter(t => !t.done).length);

  toggle(id: number) {
    console.log(\`  parent got toggled(\${id})\`);
    this.todos.update(list => list.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  remove(id: number) {
    console.log(\`  parent got remove(\${id})\`);
    this.todos.update(list => list.filter(t => t.id !== id));
  }
}`,
      },
      {
        label: "The same todo item with @Output() and EventEmitter",
        tech: "angular",
        runnable: true,
        code: `import { Component, EventEmitter, Input, Output, computed, signal } from "@angular/core";

type Todo = { id: number; text: string; done: boolean };

// The SAME child written with @Output() + EventEmitter (the pre-v17.3 way, still supported).
@Component({
  selector: "todo-item",
  template: \`
    <label>
      <input type="checkbox" [checked]="todo.done" (change)="toggled.emit(todo.id)" />
      {{ todo.text }}
    </label>
    <button (click)="removed.emit(todo.id)">x</button>
  \`,
})
export class TodoItemComponent {
  @Input({ required: true }) todo!: Todo;
  @Output() toggled = new EventEmitter<number>();        // an RxJS Subject under the hood
  @Output("remove") removed = new EventEmitter<number>(); // alias: parent listens with (remove)
}

@Component({
  selector: "app-root",
  imports: [TodoItemComponent],
  template: \`
    @for (t of todos(); track t.id) {
      <todo-item [todo]="t" (toggled)="toggle($event)" (remove)="remove($event)" />
    }
    <p>{{ left() }} left</p>
  \`,
})
export class AppComponent {
  todos = signal<Todo[]>([
    { id: 1, text: "Write tests", done: false },
    { id: 2, text: "Ship it", done: false },
  ]);
  left = computed(() => this.todos().filter(t => !t.done).length);

  toggle(id: number) {
    console.log(\`  parent got toggled(\${id})\`);
    this.todos.update(list => list.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  remove(id: number) {
    console.log(\`  parent got remove(\${id})\`);
    this.todos.update(list => list.filter(t => t.id !== id));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain what output() and outputFromObservable() are in modern Angular and how they differ from @Output().",
    seoDescription:
      "output() emits imperatively, outputFromObservable() turns an RxJS stream into an output. Verified: per-listener subscriptions, completion, errors, interop.",
    description: `**Question presented to candidate:**
"A search box component debounces keystrokes with RxJS and needs to expose the result as an output. Explain \`output()\`, \`outputFromObservable()\` and \`outputToObservable()\`, and how this differs from putting an \`EventEmitter\` behind \`@Output()\`."

**What a strong answer should cover:**
- \`output()\` is imperative: you call \`emit()\`. \`outputFromObservable(obs$)\` is declarative: every value the observable pushes is an event.
- Both implement \`OutputRef\`; the parent binds either one with \`(search)="..."\`.
- \`outputFromObservable\` subscribes to the source **once per listener**, so a cold source or an expensive pipe runs per listener unless shared.
- Completion stops the output; **errors are not handled** by Angular, so catch them in the pipe.
- \`outputToObservable(ref)\` goes the other way, for consumers that want RxJS operators.
- \`@Output()\` with \`EventEmitter\` was a Subject you pushed into; these APIs keep RxJS optional and tie subscriptions to the component lifecycle.

**Clarifying questions expected:**
- "Is the source observable hot or cold, and could more than one listener attach?"

**Code / implementation expected:** Yes — a component with one \`output()\` and one \`outputFromObservable()\` fed by a debounced pipeline.`,
    answer: `**Target Audience:** Developers comfortable with RxJS basics who want to expose streams as component outputs.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The plain comparison of <code>output()</code> with <code>EventEmitter</code> is in [output() versus @Output()](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs); this doc focuses on the RxJS interop functions. Outputs were produced by compiling with <code>ngc</code> on Angular 22.2.3 and running in jsdom; internals are quoted from the installed <code>@angular/core/rxjs-interop</code> bundle.

## 1. Why This Even Matters — A Story First

A newsroom has two ways to get stories on air. A reporter can phone the studio when something happens: that is **pushing by hand**. Or the studio can be plugged straight into a news wire, and every story on the wire goes out automatically: that is **plugging in a feed**.

<code>output()</code> is the phone call: your code decides when to call <code>emit()</code>. <code>outputFromObservable()</code> is the wire: you already have an RxJS stream (debounced keystrokes, a WebSocket, a timer), and you want each value it produces to become a component event without writing a subscribe-and-emit bridge.

The question is popular because the wire has subtleties: who pays for the feed, what happens when it ends, and what happens when it breaks.

## 2. The Core Idea

📌 **Interview term: <code>outputFromObservable(obs$)</code>** — from <code>@angular/core/rxjs-interop</code>. Declares a component output whose events are the <code>next</code> values of <code>obs$</code>. It returns an <code>OutputRef&lt;T&gt;</code>, the same interface <code>output()</code> and <code>model()</code> implement.

📌 **Interview term: <code>outputToObservable(ref)</code>** — the reverse: wraps any <code>OutputRef</code> as an <code>Observable</code> that emits on every event and completes when the owning component is destroyed.

📌 **Interview term: Cold versus hot source** — a **cold** observable starts its work fresh for each subscriber (<code>of</code>, <code>defer</code>, an HTTP call); a **hot** one shares a single ongoing source (a <code>Subject</code>). This matters here because of how the output subscribes. See [Subject, BehaviorSubject and ReplaySubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject).

📌 **Interview term: Multicasting** — sharing one subscription to a source among many subscribers, typically with <code>share()</code> or <code>shareReplay()</code> ([shareReplay explained](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ)).

The typings document three rules for the source, which the verified section below confirms: next values are forwarded, errors are **not** handled by Angular, and completion stops the output.

## 3. Push or Plug In

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="output is emitted by component code, outputFromObservable subscribes a pipeline once per listener, outputToObservable turns an output back into an observable">
  <defs>
    <marker id="ofo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="200" height="48" rx="10"/>
  <text class="d-text" x="130" y="59" text-anchor="middle">cleared.emit()</text>
  <rect class="d-box-accent" x="300" y="30" width="170" height="48" rx="10"/>
  <text class="d-text d-accent" x="385" y="59" text-anchor="middle">output()</text>
  <path class="d-edge" d="M 234 54 L 296 54" marker-end="url(#ofo-arrow)"/>
  <rect class="d-box" x="30" y="130" width="200" height="48" rx="10"/>
  <text class="d-text" x="130" y="159" text-anchor="middle">keystrokes pipe</text>
  <rect class="d-box-accent" x="300" y="130" width="170" height="48" rx="10"/>
  <text class="d-text d-accent" x="385" y="152" text-anchor="middle">outputFrom</text>
  <text class="d-text d-accent" x="385" y="170" text-anchor="middle">Observable()</text>
  <path class="d-edge-accent" d="M 234 154 L 296 154" marker-end="url(#ofo-arrow)"/>
  <rect class="d-box-muted" x="540" y="30" width="150" height="148" rx="12"/>
  <text class="d-text" x="615" y="98" text-anchor="middle">parent</text>
  <text class="d-sub" x="615" y="120" text-anchor="middle">(search) handler</text>
  <path class="d-edge" d="M 474 54 L 536 70" marker-end="url(#ofo-arrow)"/>
  <path class="d-edge-accent" d="M 474 154 L 536 140" marker-end="url(#ofo-arrow)"/>
  <rect class="d-box" x="300" y="226" width="170" height="44" rx="10"/>
  <text class="d-sub" x="385" y="253" text-anchor="middle">outputToObservable()</text>
  <path class="d-edge-dashed" d="M 385 182 L 385 222" marker-end="url(#ofo-arrow)"/>
  <rect class="d-box" x="540" y="226" width="150" height="44" rx="10"/>
  <text class="d-sub" x="615" y="253" text-anchor="middle">RxJS operators</text>
  <path class="d-edge-dashed" d="M 474 248 L 536 248" marker-end="url(#ofo-arrow)"/>
</svg>

The top row is the hand-pushed event, the middle row is a stream plugged straight in, and the dashed path at the bottom is the way back from any output into RxJS when a consumer wants operators.

## 4. Verified: a debounced search box

The example at the bottom has <code>cleared = output&lt;void&gt;()</code> and <code>search = outputFromObservable(...)</code> over a <code>Subject</code> of keystrokes, piped through <code>map(trim)</code>, <code>filter(length >= 2)</code>, <code>debounceTime(300)</code> and <code>distinctUntilChanged()</code>. The driver typed and waited:

\`\`\`
[app] RENDERED: ClearSearches: none
type "a", "an", "ang" quickly, wait 350 ms:
  parent got search("ang")
rendered: ClearSearches: ang
type "angu", then "ang " (trims to "ang"), wait 350 ms:
rendered: ClearSearches: ang
type "signals", wait 350 ms:
  parent got search("signals")
rendered: ClearSearches: ang, signals
click Clear:
rendered: ClearSearches: none
\`\`\`

Three quick keystrokes produced one event, and a burst that ended on the same term produced none, because of <code>distinctUntilChanged</code>. There is no <code>subscribe</code>, no <code>emit</code> and no <code>ngOnDestroy</code> in the child: the output subscribes when the parent listens and unsubscribes when the child is destroyed. Doing the same with <code>@Output()</code> meant either exposing the piped observable directly as the output (it works, because Angular only needs <code>subscribe</code>) or subscribing in the component and calling <code>emitter.emit</code> by hand.

## 5. Verified: the source rules

A test child declared four outputs: a cold <code>defer(() => of("a", "b"))</code>, a <code>Subject</code> piped through a logging <code>map</code>, a <code>throwError</code>, and a <code>Subject</code> it later completed. The parent bound three of them in its template, and the driver added a second, programmatic listener:

\`\`\`
  cold source subscribed
  template coldOut: a
  template coldOut: b
[app] RENDERED:
second listener on coldOut:
  cold source subscribed
  programmatic coldOut: a
  programmatic coldOut: b
second listener on sharedOut, then hot.next(x):
  map ran for x
  template sharedOut: X
  map ran for x
  programmatic sharedOut: X
done.next(1); done.complete(); done.next(2):
  template doneOut: 1
subscribe to failing:
  uncaught: source failed
\`\`\`

Four rules come out of this:

1. **One subscription per listener.** The cold source was subscribed again for the second listener, and the <code>map</code> ran twice for one keystroke. The 22.2.3 source explains it: each <code>subscribe</code> call does <code>this.source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)</code>. Adding <code>share()</code> at the end of the pipe fixed it in a re-run: <code>map ran for x</code> appeared once and both listeners got <code>X</code>.
2. **Synchronous sources fire immediately.** The cold source emitted during the template listener setup, before the first render finished.
3. **Completion ends it.** After <code>complete()</code>, the later <code>next(2)</code> was never delivered.
4. **Errors are yours.** The output only forwards <code>next</code>; the error reached nobody in Angular and RxJS rethrew it as an uncaught error (in Node it surfaced as <code>uncaughtException</code>). Put a [catchError](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value) in the pipe.

## 6. Verified: going back with outputToObservable

<code>outputToObservable(c.sharedOut).pipe</code> printed <code>function</code>, so a consumer holding a component reference (for example from [dynamically created components](/interview-question/how-do-you-dynamically-create-components)) can use any operator on an output. In the source it subscribes to the output ref and calls <code>observer.complete()</code> from the output's <code>DestroyRef</code>, so it completes when the child is destroyed.

## 7. Comparison

| | <code>@Output()</code> + <code>EventEmitter</code> | <code>output()</code> | <code>outputFromObservable(obs$)</code> |
| :--- | :--- | :--- | :--- |
| Style | Push with <code>emit</code> (it is a Subject) | Push with <code>emit</code> | Declarative: values of <code>obs$</code> |
| Needs RxJS | Yes | No | Yes |
| Subscribes to a source | No | No | Once per listener |
| Ends when | Never on its own | Component destroyed | Source completes or component destroyed |
| A throwing listener | Reported to <code>ErrorHandler</code>, others still run | Reported to <code>ErrorHandler</code>, others still run | Not tested here |
| An erroring source | Not applicable: you push values | Not applicable | Not handled: surfaced as an uncaught error |
| Consumer wants operators | <code>.pipe()</code> directly | <code>outputToObservable()</code> | <code>outputToObservable()</code> |
| Stable | Long-standing | v19 | v19 |

Both interop functions carry <code>@publicApi 19.0</code> in the 22.2.3 typings. For converting signals rather than outputs, see [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 8. Common Pitfalls

- **Expensive cold pipes with several listeners.** Each listener re-runs the pipe; add <code>share()</code> when work should happen once.
- **Unhandled source errors.** One HTTP failure kills the stream and surfaces as an uncaught error; catch it and map to a value.
- **A source that completes early.** <code>of(...)</code>, <code>first()</code> or <code>take(1)</code> end the output after one value; nothing is emitted later.
- **Creating it outside a field initializer.** Like <code>output()</code>, it needs an [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).
- **Using it for state.** An output is an event stream; if the parent needs the latest value at any time, expose a [signal](/interview-question/what-are-angular-signals) or use a [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).
- **Forgetting the debounce belongs to the child.** Putting <code>debounceTime</code> in the parent means every consumer must remember it; the output is the right place for it.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code> emits when your code calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit()</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputFromObservable()</code> makes every value of an observable a component event; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputToObservable()</code> turns any output back into an observable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it exists:</strong> <span style="color:#f0e2c8;">"When the event already is a stream, like debounced search terms, you expose it directly instead of subscribing and re-emitting through an EventEmitter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The big subtlety:</strong> <span style="color:#f0e2c8;">"It subscribes to the source once per listener, so a cold or expensive pipe runs per listener. I verified the map running twice, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">share()</code> fixed it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lifecycle rules:</strong> <span style="color:#f0e2c8;">"Completion stops the output, Angular unsubscribes on destroy, and errors are not handled, so the pipe needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versus @Output:</strong> <span style="color:#f0e2c8;">"Templates do not change. The difference is that RxJS stays optional, and subscriptions are tied to the component rather than to a Subject you manage."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you not just put the observable behind <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@Output()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output() search = this.terms$.pipe(...)</code> works because Angular only needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputFromObservable</code> makes the intent explicit, types it as an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OutputRef</code>, and adds the destroy cleanup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the map run twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because each listener got its own subscription to the source pipe. The template listener and the programmatic listener each ran the operators. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">share()</code> at the end of the pipe gives them one shared subscription.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">outputToObservable</code> when the child is destroyed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It completes, because it registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">observer.complete()</code> on the output <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>. That makes it safe to use with operators that wait for completion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test an output built from an observable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push values into the source, for example a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Subject</code>, and assert what a subscriber on the output receives. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code>, use fake timers or wait for the debounce period.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer a signal over an output?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the parent needs the current value at any moment, not just a notification. Then a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> or a shared signal in a service fits better than an event stream.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>output()</code>** | Output you trigger with <code>emit()</code> |
| **<code>outputFromObservable()</code>** | Output whose events are an observable values |
| **<code>outputToObservable()</code>** | Wraps an output as an observable that completes on destroy |
| **Cold source** | Observable that restarts its work for each subscriber |
| **Hot source** | Observable sharing one ongoing source, such as a Subject |
| **Multicasting** | Sharing one subscription, for example with <code>share()</code> |
| **<code>OutputRef</code>** | Interface every output implements: <code>subscribe(cb)</code> |

---
**Conclusion:** <code>output()</code> and <code>outputFromObservable()</code> are two ways to fill the same <code>OutputRef</code> slot: push values by hand, or plug in a stream. The stream version saves the subscribe-and-emit bridge but brings RxJS semantics with it, and the verified run shows the three that matter: one source subscription per listener, completion ends the output, and errors are not caught for you. Compared with <code>@Output()</code> and an <code>EventEmitter</code>, templates stay the same, RxJS becomes optional, and cleanup follows the component lifecycle.`,
    examples: [
      {
        label: "Debounced search: output() plus outputFromObservable() (needs the Angular compiler)",
        tech: "angular",
        runnable: false,
        code: `import { Component, output, signal } from "@angular/core";
import { outputFromObservable } from "@angular/core/rxjs-interop";
import { Subject, debounceTime, distinctUntilChanged, filter, map } from "rxjs";

// CHILD: one imperative output and one output fed by an RxJS pipeline.
@Component({
  selector: "search-box",
  template: \`
    <input placeholder="Search" (input)="keystrokes.next($any($event.target).value)" />
    <button (click)="cleared.emit()">Clear</button>
  \`,
})
export class SearchBoxComponent {
  protected keystrokes = new Subject<string>();

  // output(): you call emit() yourself.
  cleared = output<void>();

  // outputFromObservable(): the observable IS the output. Each value it pushes is an event.
  search = outputFromObservable(
    this.keystrokes.pipe(
      map(v => v.trim()),
      filter(v => v.length >= 2),
      debounceTime(300),
      distinctUntilChanged(),
    ),
  );
}

@Component({
  selector: "app-root",
  imports: [SearchBoxComponent],
  template: \`
    <search-box (search)="onSearch($event)" (cleared)="log.set([])" />
    <p>Searches: {{ log().join(", ") || "none" }}</p>
  \`,
})
export class AppComponent {
  log = signal<string[]>([]);
  onSearch(term: string) {
    console.log(\`  parent got search("\${term}")\`);
    this.log.update(l => [...l, term]);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does two-way binding work under the hood?",
    seoDescription:
      "[(x)] is sugar for [x] plus (xChange). The compiled ɵɵtwoWayProperty and ɵɵtwoWayBindingSet instructions, signal versus field targets, and ngModel.",
    description: `**Question presented to candidate:**
"Explain what Angular actually does with \`[(size)]="fontSize"\`. What does it compile to, how does it work with both signals and plain fields, and what does a component need to support it?"

**What a strong answer should cover:**
- \`[(x)]="v"\` is **syntactic sugar** for a property binding \`[x]\` plus an event binding \`(xChange)\` that writes \`$event\` back.
- Any component with an input \`x\` and an output \`xChange\` supports it: \`@Input\` + \`@Output\`, or one \`model()\`.
- The compiler emits \`ɵɵtwoWayProperty\` and \`ɵɵtwoWayListener\`; the listener calls \`ɵɵtwoWayBindingSet(target, $event)\`, which calls \`.set()\` on a writable signal or falls back to assignment.
- Hence the right-hand side must be writable: a signal reference or a field, not \`v()\` (NG5002) or a computed.
- \`ngModel\` is just a directive with input \`ngModel\` and output \`ngModelChange\`.
- The data flow stays **one-way in each direction**; there is no dirty-checked shared variable as in AngularJS.

**Clarifying questions expected:**
- "Do you want the template-level desugaring or the compiled instructions?"

**Code / implementation expected:** Yes — a custom two-way bindable component, plus the hand-written equivalent of the sugar.`,
    answer: `**Target Audience:** Developers who use <code>[(ngModel)]</code> and want to know what it really is — assumes property and event binding.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The binding types themselves are covered in [the types of data binding](/interview-question/what-are-the-types-of-data-binding-in-angular); this doc goes into the compiled instructions and the runtime. Every compiled line below was copied from <code>ngc</code> output on Angular 22.2.3, runtime code is quoted from the installed <code>@angular/core</code> bundle, and the example output came from running it in jsdom.

## 1. Why This Even Matters — A Story First

Two walkie-talkies can feel like a telephone, but they are not one. Each one only ever transmits or receives at a time. The illusion of a conversation comes from two one-way channels and a rule about taking turns.

Angular two-way binding is the same trick. There is no magic shared variable between parent and child. There is a one-way channel down (a property binding), a one-way channel up (an event), and a naming rule that lets the compiler connect them. Once you see that, every error message about <code>[(x)]</code> becomes obvious.

## 2. The Core Idea

📌 **Interview term: Banana in a box** — the <code>[( )]</code> syntax: the box <code>[]</code> for the property binding, the banana <code>()</code> for the event.

📌 **Interview term: Desugaring** — rewriting a shorthand into its longer form. <code>[(size)]="fontSize"</code> means <code>[size]="fontSize()" (sizeChange)="fontSize.set($event)"</code> for a [signal](/interview-question/what-are-angular-signals), or <code>[size]="fontSize" (sizeChange)="fontSize = $event"</code> for a field.

📌 **Interview term: The Change convention** — the event half is always the input name plus <code>Change</code>. A component supports <code>[(size)]</code> exactly when it has an input <code>size</code> and an output <code>sizeChange</code>.

📌 **Interview term: Template instruction** — a function call the compiler generates from the template, such as <code>ɵɵproperty</code> or <code>ɵɵlistener</code>. See [how Ivy compilation works](/interview-question/how-does-compilation-work-under-the-hood-in-ivy).

## 3. The Two Channels

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Two-way binding splits into twoWayProperty sending the value down to the input and twoWayListener receiving the Change event and calling twoWayBindingSet which sets the signal or assigns the field">
  <defs>
    <marker id="twb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="190" height="200" rx="12"/>
  <text class="d-text" x="125" y="130" text-anchor="middle">Parent</text>
  <text class="d-sub" x="125" y="152" text-anchor="middle">fontSize signal</text>
  <rect class="d-box-accent" x="500" y="40" width="190" height="200" rx="12"/>
  <text class="d-text d-accent" x="595" y="130" text-anchor="middle">Child</text>
  <text class="d-sub" x="595" y="152" text-anchor="middle">size and sizeChange</text>
  <path class="d-edge-accent" d="M 224 88 L 496 88" marker-end="url(#twb-arrow)"/>
  <text class="d-sub" x="360" y="74" text-anchor="middle">twoWayProperty: unwrap, then set input</text>
  <path class="d-edge" d="M 496 190 L 224 190" marker-end="url(#twb-arrow)"/>
  <text class="d-sub" x="360" y="176" text-anchor="middle">twoWayListener on sizeChange</text>
  <text class="d-sub" x="360" y="214" text-anchor="middle">twoWayBindingSet: set or assign</text>
</svg>

Down the top channel the parent value travels as an ordinary input; up the bottom channel the child event arrives as an ordinary event, and one helper decides how to write it into the parent.

## 4. Verified: the compiled instructions

A parent template with four children, compiled with <code>ngc</code>:

\`\`\`html
<c-model [(v)]="sig" />                                  <!-- model() child, signal target -->
<c-model [(v)]="field" />                                <!-- model() child, plain field -->
<c-pair  [(v)]="sig" />                                  <!-- @Input v + @Output vChange child -->
<c-model [v]="sig()" (vChange)="sig.set($event)" />      <!-- hand-written equivalent -->
\`\`\`

Creation block (runs once):

\`\`\`js
i0.ɵɵtwoWayListener("vChange", function ...($event) { i0.ɵɵtwoWayBindingSet(ctx.sig, $event) || (ctx.sig = $event); return $event; });
i0.ɵɵtwoWayListener("vChange", function ...($event) { i0.ɵɵtwoWayBindingSet(ctx.field, $event) || (ctx.field = $event); return $event; });
i0.ɵɵtwoWayListener("vChange", function ...($event) { i0.ɵɵtwoWayBindingSet(ctx.sig, $event) || (ctx.sig = $event); return $event; });
i0.ɵɵlistener("vChange", function ...($event) { return ctx.sig.set($event); });
\`\`\`

Update block (runs on every check of this view):

\`\`\`js
i0.ɵɵtwoWayProperty("v", ctx.sig);
i0.ɵɵtwoWayProperty("v", ctx.field);
i0.ɵɵtwoWayProperty("v", ctx.sig);
i0.ɵɵproperty("v", ctx.sig());
\`\`\`

Three things to notice:

1. **The generated code is identical** whether the target is a signal or a field, and whether the child uses <code>model()</code> or an <code>@Input</code>/<code>@Output</code> pair. The compiler does not need to know; the runtime decides.
2. **The expression is passed uncalled**: <code>ctx.sig</code>, not <code>ctx.sig()</code>. That is why the right-hand side must be a reference, and why <code>[(v)]="sig()"</code> is rejected with <code>NG5002: Unsupported expression in a two-way binding</code>.
3. **The hand-written form compiles to plain instructions**, <code>ɵɵproperty</code> and <code>ɵɵlistener</code>. The sugar exists so one binding can serve signals and fields alike.

The child side is just metadata. For <code>v = model(0)</code> the definition contains <code>inputs: { v: [1, "v"] }, outputs: { v: "vChange" }</code>; for the decorator pair it is <code>inputs: { v: "v" }, outputs: { vChange: "vChange" }</code>.

## 5. Verified: the runtime helpers

From the installed 22.2.3 <code>@angular/core</code> bundle:

\`\`\`js
function ɵɵtwoWayProperty(propName, value, sanitizer) {
  if (isWritableSignal(value)) {
    value = value();
  }
  ...
  if (bindingUpdated(lView, bindingIndex, value)) {
    setPropertyAndInputs(tNode, lView, propName, value, lView[RENDERER], sanitizer);
  }
}

function ɵɵtwoWayBindingSet(target, value) {
  const canWrite = isWritableSignal(target);
  canWrite && target.set(value);
  return canWrite;
}
\`\`\`

So the down channel unwraps a writable signal before comparing it with the previous value (only a changed value is pushed into the child), and the up channel calls <code>.set()</code> on a writable signal and returns <code>true</code>; for anything else it returns <code>false</code>, and the generated <code>|| (ctx.field = $event)</code> does a plain assignment. A <code>computed</code> is not writable, which is why binding one gives a type error (<code>TS2322: Type 'Signal&lt;number&gt;' is not assignable to type 'number'</code>), as shown in [model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

## 6. Verified: sugar, desugared, and ngModel side by side

The example at the bottom is a <code>SizerComponent</code> with <code>@Input() size</code> and <code>@Output() sizeChange</code>, used three ways from one parent signal: <code>[(size)]</code>, the hand-written <code>[size]</code> + <code>(sizeChange)</code>, and <code>[(ngModel)]</code> on a number input:

\`\`\`
start                      | 16px 16px | input = 16 | Parent fontSize = 16
+ on sizer 1 (sugar)       | 17px 17px | input = 17 | Parent fontSize = 17
+ on sizer 2 (desugared)   | 18px 18px | input = 18 | Parent fontSize = 18
typed 30 into the input    | 30px 30px | input = 30 | Parent fontSize = 30
\`\`\`

All three stayed in sync through the single parent signal. It also ran in the playground mode, since it uses decorator inputs and outputs. Note the child never writes the value itself; it only emits the proposal and the parent binding writes it.

<code>ngModel</code> is no exception to the rule. Its declaration in the 22.2.3 forms typings maps an input field <code>model</code> to the public name <code>ngModel</code> and an <code>EventEmitter</code> field <code>update</code> to <code>ngModelChange</code>. That pairing is the only reason <code>[(ngModel)]</code> works. See [reactive versus template-driven forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms) for where <code>ngModel</code> fits.

## 7. Verified: box in a banana

Writing the brackets the wrong way round, <code>([v])="s"</code>, does **not** fail the build. <code>ngc</code> printed a warning and carried on:

\`\`\`
warning NG8101: In the two-way binding syntax the parentheses should be inside the brackets, ex. '[(v)]="s"'.
warning NG8111: Function in event binding should be invoked: s().
\`\`\`

and compiled it to an event listener for an event literally named <code>"[v]"</code>: <code>i0.ɵɵlistener("[v]", function ...() { return ctx.s; })</code>. The page rendered the child default value, 0, and nothing was bound. Treat that warning as an error.

## 8. Requirements Checklist

| For <code>[(x)]="target"</code> to compile | Otherwise |
| :--- | :--- |
| The element has an input <code>x</code> and an output <code>xChange</code> on the same directive or component | <code>NG8007: The property and event halves of the two-way binding 'x' are not bound to the same target.</code> |
| <code>target</code> is a property path or a signal reference, not a call | <code>NG5002: Unsupported expression in a two-way binding</code> |
| <code>target</code> is writable and its type matches the input | <code>TS2322</code> type error |
| Brackets outside, parentheses inside | Compiles as an event named <code>"[x]"</code> with warning NG8101 |

## 9. Contrast with AngularJS

In AngularJS, <code>ng-model</code> shared one scope variable and the digest loop re-checked it until nothing changed, so two-way binding was the default and cycles were possible. In Angular each direction is a separate one-way flow, the child cannot write the parent directly, and a value only travels down when it actually changed. See [Angular versus AngularJS](/interview-question/what-is-angular-and-how-does-it-differ-from-angularjs).

## 10. Common Pitfalls

- **Writing <code>[(x)]="sig()"</code>.** The binding needs the signal reference (NG5002).
- **Expecting <code>[(x)]</code> on any input.** Without a matching <code>xChange</code> output (or a <code>model()</code>) you get NG8007.
- **Box in a banana.** <code>([x])</code> only warns (NG8101) and silently binds nothing.
- **Writing the value inside the child as well as emitting.** With an <code>@Input</code>/<code>@Output</code> pair, assigning <code>this.size</code> and emitting can leave the child ahead of a parent that rejects the change; with <code>model()</code>, setting is the emitting.
- **Two-way binding a getter.** <code>[(v)]="name"</code> on a getter without a setter compiles, but when the child changed the value the write threw <code>TypeError: Cannot set property name of [object Object] which has only a getter</code> and the child kept its own value.
- **Overusing two-way binding.** For shared state between many components, a [service](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-) is clearer than a chain of <code>[(x)]</code> bindings.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(x)]="v"</code> is sugar for a property binding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x]</code> plus an event binding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(xChange)</code> that writes the emitted value back into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The contract:</strong> <span style="color:#f0e2c8;">"Any component with an input <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> and an output <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xChange</code> supports it, whether written as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output</code> or a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> is just such a directive."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it compiles to:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵtwoWayProperty</code> for the down direction, which unwraps a writable signal, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵtwoWayListener</code> for the up direction, which calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵtwoWayBindingSet</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Signals and fields:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵtwoWayBindingSet</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.set()</code> on a writable signal and otherwise returns false, so the generated code falls back to plain assignment. Same output for both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it is still one-way:</strong> <span style="color:#f0e2c8;">"Each direction is a separate one-way flow; the child never writes the parent directly. That is the big difference from AngularJS."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[(x)]="sig()"</code> an error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the compiler passes the expression uncalled to the two-way helpers so it can write to it. A call produces a value, not a writable target, so it reports NG5002.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">([x])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compiles with warning NG8101 into a listener for an event literally named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x]</code>, so nothing is bound. I verified that; it is a silent bug if you ignore warnings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make a custom component work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[(value)]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value = model(initial)</code>, or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input() value</code> with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output() valueChange</code>. To also support <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControl</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code>, implement a value accessor instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does two-way binding trigger change detection twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No more than any event. The listener writes the parent value and marks the view dirty, and on the next check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵtwoWayProperty</code> pushes the new value down only if it changed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you two-way bind to a nested property like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">form.name</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, a property path is a valid target and falls back to assignment. A signal inside an object works only if the expression ends at the signal itself.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Banana in a box** | The <code>[( )]</code> two-way syntax |
| **Desugaring** | Expanding <code>[(x)]</code> into <code>[x]</code> plus <code>(xChange)</code> |
| **Change convention** | Output name = input name + <code>Change</code> |
| **<code>ɵɵtwoWayProperty</code>** | Instruction that unwraps a signal and pushes the value down |
| **<code>ɵɵtwoWayBindingSet</code>** | Helper that sets a writable signal, or reports false so the code assigns |
| **NG8101** | Warning for <code>([x])</code>, the box in a banana |
| **NG8007 / NG5002** | Missing <code>xChange</code> half / non-writable binding expression |

---
**Conclusion:** Two-way binding is two one-way bindings and a naming convention. The compiler turns <code>[(x)]</code> into a down-going <code>ɵɵtwoWayProperty</code> and an up-going <code>ɵɵtwoWayListener</code>, and the runtime helper <code>ɵɵtwoWayBindingSet</code> makes one generated line serve both signals and plain fields. Every rule about two-way binding, from the <code>xChange</code> requirement to the ban on calling the signal, falls straight out of those instructions, and so does the fact that <code>ngModel</code> is just another directive following the same convention.`,
    examples: [
      {
        label: "A two-way bindable component, the desugared form, and ngModel on one signal",
        tech: "angular",
        runnable: true,
        code: `import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

// A hand-made two-way bindable component: input "size" + output "sizeChange".
// That naming pair is the whole contract behind [(size)].
@Component({
  selector: "app-sizer",
  template: \`
    <button (click)="resize(-1)">-</button>
    <span [style.font-size.px]="size">{{ size }}px</span>
    <button (click)="resize(+1)">+</button>
  \`,
})
export class SizerComponent {
  @Input() size = 16;
  @Output() sizeChange = new EventEmitter<number>();

  resize(delta: number) {
    // The child never writes the parent value. It announces the new one.
    this.sizeChange.emit(Math.min(40, Math.max(8, this.size + delta)));
  }
}

@Component({
  selector: "app-root",
  imports: [SizerComponent, FormsModule],
  template: \`
    <!-- 1. Sugar -->
    <app-sizer [(size)]="fontSize" />
    <!-- 2. What the sugar means, written by hand -->
    <app-sizer [size]="fontSize()" (sizeChange)="fontSize.set($event)" />
    <!-- 3. The same pattern on a native input, via the ngModel directive -->
    <input type="number" [(ngModel)]="fontSize" />
    <p>Parent fontSize = {{ fontSize() }}</p>
  \`,
})
export class AppComponent {
  fontSize = signal(16);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you pass data between sibling components that don't have a direct parent-child relationship?",
    seoDescription:
      "Share state between sibling components with a signal-based service, scope it with component providers, lift state up, or use RxJS, the URL or NgRx.",
    description: `**Question presented to candidate:**
"We have a product list and a cart badge in different parts of the page. Neither is a parent of the other. How do you get data from one to the other in Angular, and how do you choose between the options?"

**What a strong answer should cover:**
- Default answer: a **shared service** holding state as signals, injected into both siblings with \`inject()\`; expose read-only signals and methods for changes.
- **Scope** matters: \`providedIn: "root"\` gives one app-wide instance; \`providers: [...]\` on a common ancestor gives one instance per ancestor subtree.
- **Lifting state up** to the nearest common parent with inputs, outputs or \`model()\` works when the siblings are close.
- RxJS alternative: a \`BehaviorSubject\` in the service (late subscribers get the current value; a plain \`Subject\` does not).
- Other channels: the **router** (URL and query params) for shareable state, a **state library** (NgRx, signal store) for large apps.
- Avoid: global variables, reaching into siblings through \`ViewChild\` chains, or event buses with no ownership.

**Clarifying questions expected:**
- "Should this state survive navigation or a page refresh?"
- "Is there one instance of each sibling, or could the pair appear several times on a page?"

**Code / implementation expected:** Yes — a signal-based service shared by two sibling components.`,
    answer: `**Target Audience:** Anyone who has passed data parent to child and now needs to share it sideways — assumes components and basic dependency injection.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Both examples were compiled with <code>ngc</code> on Angular 22.2.3 and run in jsdom, and both also passed the playground mode, so you can run them on this page. The RxJS comparison was run as a plain Node script.

## 1. Why This Even Matters — A Story First

Two colleagues sit on different floors. One takes customer orders, the other packs them. They never talk to each other directly, and they do not need to: there is a shared order board in the hallway. The order taker writes on it, the packer reads it, and either of them can be replaced without the other noticing.

If instead every message had to go up to the manager and back down again, the manager would spend the day relaying notes. And if the order taker had to walk to the packer's desk, the two would be welded together.

In Angular the order board is a **service**. Inputs and outputs are perfect between a parent and its children, but siblings that do not share a direct parent are better served by state that lives outside both of them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How far apart are the siblings in the tree? | Next to each other: lifting state to the parent may be enough. Far apart: a service. |
| Can the pair appear more than once on a page? | Then each pair needs its own instance: a component-level provider, not root. |
| Should the state survive navigation or a refresh? | Navigation: root service. Refresh or a shareable link: the URL or storage. |
| How many places read and write it? | A handful: a service. Dozens, with undo, devtools or effects: a state library. |
| Is the data an event or a current value? | A current value wants a signal or BehaviorSubject; a one-off event can be a Subject. |

## 3. The Core Idea

📌 **Interview term: Service** — a class Angular creates and hands to whoever asks for it. Marked <code>@Injectable</code> and obtained with <code>inject(CartStore)</code>. See [what a service is](/interview-question/what-is-a-service-and-why-use-it).

📌 **Interview term: Shared state service (store)** — a service whose job is to own a piece of state, here as [signals](/interview-question/what-are-angular-signals), and expose methods to change it. Both siblings depend on the service, not on each other.

📌 **Interview term: Provider scope** — where the service instance lives. <code>providedIn: "root"</code> means one instance for the whole app; <code>providers: [X]</code> on a component means a new instance for that component and its descendants. See [root versus component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).

📌 **Interview term: Lifting state up** — moving state to the nearest common parent, which then passes it down with inputs and receives changes through outputs or [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

📌 **Interview term: Read-only signal** — <code>this._items.asReadonly()</code> returns a view of a writable signal without <code>set</code> or <code>update</code>, so only the service can change the state.

## 4. The Shape of the Solution

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Product list calls add on the cart store, the store holds the items signal, cart badge reads count and items from the store, the parent only places the two siblings">
  <defs>
    <marker id="sib-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="260" y="20" width="200" height="44" rx="10"/>
  <text class="d-text" x="360" y="47" text-anchor="middle">app-root</text>
  <path class="d-edge-dashed" d="M 300 68 L 160 120" marker-end="url(#sib-arrow)"/>
  <path class="d-edge-dashed" d="M 420 68 L 560 120" marker-end="url(#sib-arrow)"/>
  <rect class="d-box" x="60" y="124" width="200" height="50" rx="10"/>
  <text class="d-text" x="160" y="154" text-anchor="middle">product-list</text>
  <rect class="d-box" x="460" y="124" width="200" height="50" rx="10"/>
  <text class="d-text" x="560" y="154" text-anchor="middle">cart-badge</text>
  <rect class="d-box-accent" x="250" y="220" width="220" height="64" rx="12"/>
  <text class="d-text d-accent" x="360" y="246" text-anchor="middle">CartStore</text>
  <text class="d-sub" x="360" y="268" text-anchor="middle">items signal, count computed</text>
  <path class="d-edge-accent" d="M 160 178 L 280 216" marker-end="url(#sib-arrow)"/>
  <text class="d-sub" x="170" y="214" text-anchor="middle">add(item)</text>
  <path class="d-edge-accent" d="M 440 216 L 560 178" marker-end="url(#sib-arrow)"/>
  <text class="d-sub" x="560" y="214" text-anchor="middle">count(), items()</text>
</svg>

The dashed lines are the only relationship the siblings have with the parent: it places them on the page. All data flows through the store, writes on the left and reads on the right, so either sibling can move anywhere in the tree.

## 5. Verified: a signal store shared by two siblings

The first example at the bottom has a <code>CartStore</code> with a private writable <code>_items</code> signal, a public read-only <code>items</code>, a <code>count</code> computed and two methods. <code>product-list</code> only writes; <code>cart-badge</code> only reads. The parent template is just <code>&lt;product-list /&gt;&lt;cart-badge /&gt;</code>. Root text content, so elements run together:

\`\`\`
[app] RENDERED: Add TeaAdd CoffeeCart (0): emptyClear
add Tea   : Add TeaAdd CoffeeCart (1): TeaClear
add Coffee: Add TeaAdd CoffeeCart (2): Tea, CoffeeClear
clear     : Add TeaAdd CoffeeCart (0): emptyClear
\`\`\`

The badge updated even though the click happened in a different component. That works in [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18), OnPush-by-default Angular 22 because the badge template reads <code>cart.count()</code>: the signal change marks the badge view for refresh. A plain array field in the service would have updated the data but not the badge; see [how change detection works](/interview-question/how-does-change-detection-work-in-angular).

The encapsulation holds too. Adding <code>this.cart.items.set([])</code> in the badge failed to compile:

\`\`\`
error TS2339: Property 'set' does not exist on type 'Signal<string[]>'.
\`\`\`

## 6. Verified: scoping the store to a subtree

What if the page shows two independent panels, each with its own picker and preview? A root service would make them share one selection. The second example declares <code>SelectionStore</code> with a plain <code>@Injectable()</code> and lists it in <code>providers</code> on <code>color-panel</code>, which is rendered twice:

\`\`\`
[app] RENDERED: redbluestore #1 selected: noneredbluestore #2 selected: none
red in panel 1 : redbluestore #1 selected: redredbluestore #2 selected: none
blue in panel 2: redbluestore #1 selected: redredbluestore #2 selected: blue
\`\`\`

Two panels, two instances (<code>#1</code> and <code>#2</code>). Siblings inside a panel share one store and the panels stay independent. The siblings did not change at all; only where the provider is declared decides the scope. That lookup walks up the element tree from the injecting component; see [how dependency injection works](/interview-question/how-does-dependency-injection-work-in-angular).

## 7. Verified: Subject versus BehaviorSubject for the RxJS version

Before signals, the same service held an RxJS subject. The choice of subject matters when the reading sibling appears after the writing one has already emitted, for example because it sits inside an <code>@if</code> or a lazy route:

\`\`\`
late BehaviorSubject subscriber got: Tea
(Subject printed nothing)
\`\`\`

A <code>BehaviorSubject</code> always has a current value and gives it to new subscribers; a plain <code>Subject</code> only delivers future values. A signal behaves like the <code>BehaviorSubject</code> case without any subscription to manage. For the full comparison see [Subject, BehaviorSubject and ReplaySubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject), and for mixing the two worlds, [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 8. All the Options

| Option | Best when | Watch out for |
| :--- | :--- | :--- |
| Shared signal service (root) | App-wide state: cart, current user, settings | Becomes a dumping ground without clear ownership |
| Service provided on a common ancestor | State per widget or per page section | Forgetting the provider gives NG0201 (no provider) |
| Lift state to the common parent | Siblings are close and the parent is a natural owner | Prop drilling through many layers |
| RxJS <code>BehaviorSubject</code> in a service | Event streams, existing RxJS code | Manual subscriptions and [leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions), or use the [async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful) |
| Router state (path, query params) | Filters, selected tab, anything worth bookmarking | Only strings; see [reading route parameters](/interview-question/how-do-you-read-route-parameters) |
| State library (NgRx Store, NgRx Signals) | Large apps, many writers, devtools and effects | Boilerplate for small apps; see [NgRx](/interview-question/what-is-ngrx) and [state management options](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular) |

## 9. Common Pitfalls

- **Exposing the writable signal.** If both siblings can <code>set</code> it, nobody owns the state. Expose <code>asReadonly()</code> plus intent-named methods.
- **Plain fields in the service.** With OnPush and zoneless as defaults in v22, a mutated array field does not refresh the reader. Keep shared state in signals, or an observable read with the async pipe.
- **Mutating arrays in place.** <code>this._items().push(x)</code> changes nothing a signal can see; use <code>update(list =&gt; [...list, x])</code>.
- **Root scope by accident.** <code>providedIn: "root"</code> makes two copies of a widget share state. Provide it on the widget instead, as verified above.
- **Using a plain <code>Subject</code> for state.** A sibling that subscribes late misses the value. Use a signal or <code>BehaviorSubject</code>.
- **Reaching across with <code>@ViewChild</code>.** Having the parent grab one child and call methods on the other couples all three; see [ViewChild and ContentChild](/interview-question/what-are-viewchild-and-contentchild) for what queries are really for.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"I put the shared state in a service that both siblings inject, hold it in signals, and expose read-only signals plus methods to change it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why a service:</strong> <span style="color:#f0e2c8;">"The siblings then depend on the store, not on each other or on the parent, so either one can move in the tree without rewiring inputs and outputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Scope:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: "root"</code> gives one app-wide instance. If the pair can appear twice, I provide the store on their common ancestor, which gives one instance per subtree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why signals:</strong> <span style="color:#f0e2c8;">"In zoneless, OnPush-by-default Angular 22, a template that reads a signal refreshes when it changes. A plain field in the service would not update the other sibling."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternatives:</strong> <span style="color:#f0e2c8;">"Lift state to the parent when the siblings are close, use the URL for bookmarkable state, a BehaviorSubject for existing RxJS code, and NgRx when many features share it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@Output()</code> on one sibling and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@Input()</code> on the other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That works only through their common parent, which then has to own the state and relay it. It is fine for close siblings, but every layer in between has to pass the data along, and the parent becomes a switchboard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the second sibling is created after the first one changed the state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a signal or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BehaviorSubject</code>, it reads the current value immediately. With a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Subject</code> it misses everything emitted before it subscribed, which I verified.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop one sibling from corrupting the shared state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the writable signal private, expose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asReadonly()</code>, and offer methods named after intents such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clear</code>. Writing through the read-only signal is then a compile error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is NgRx worth it over a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When many features read and write the same state, and you want a single action log, devtools time travel, or effects for side effects. For a cart badge and a list, a signal service is enough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Test the store on its own as a plain class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.inject</code>, and test each sibling with the real store or a stub provided in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code>, without rendering the other sibling.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Service** | Class Angular creates and injects where requested |
| **Shared state service** | A service that owns state and exposes it as signals |
| **Provider scope** | Where an instance lives: root, or a component subtree |
| **Lifting state up** | Moving state to the nearest common parent |
| **Read-only signal** | <code>asReadonly()</code> view without <code>set</code> |
| **<code>BehaviorSubject</code>** | RxJS subject that remembers and replays its current value |
| **State library** | NgRx or similar: centralised state with actions and devtools |

---
**Conclusion:** Siblings without a direct relationship should not talk to each other at all; they should both talk to state that lives outside them. In modern Angular that is a service holding signals, injected with <code>inject()</code>, with writes going through methods and reads through read-only signals. The verified examples show the two decisions that matter: signals, so OnPush views actually refresh, and provider placement, so the state is shared exactly as widely as it should be. Reach for lifting state, the URL, RxJS or a state library when the situation calls for them, not by default.`,
    examples: [
      {
        label: "Two siblings sharing a signal-based CartStore service",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, computed, inject, signal } from "@angular/core";

// THE SHARED STORE: one instance for the whole app (providedIn: "root").
@Injectable({ providedIn: "root" })
export class CartStore {
  private readonly _items = signal<string[]>([]);    // private writable state
  readonly items = this._items.asReadonly();          // public read-only view
  readonly count = computed(() => this._items().length);

  add(item: string) {
    this._items.update(list => [...list, item]);      // the only way in
  }
  clear() {
    this._items.set([]);
  }
}

// SIBLING 1: writes through the store. Knows nothing about the badge.
@Component({
  selector: "product-list",
  template: \`
    @for (p of products; track p) {
      <button (click)="cart.add(p)">Add {{ p }}</button>
    }
  \`,
})
export class ProductListComponent {
  protected cart = inject(CartStore);
  products = ["Tea", "Coffee"];
}

// SIBLING 2: reads from the store. Knows nothing about the list.
@Component({
  selector: "cart-badge",
  template: \`
    <p>Cart ({{ cart.count() }}): {{ cart.items().join(", ") || "empty" }}</p>
    <button (click)="cart.clear()">Clear</button>
  \`,
})
export class CartBadgeComponent {
  protected cart = inject(CartStore);
}

// PARENT: just places the siblings. No inputs, no outputs, no wiring.
@Component({
  selector: "app-root",
  imports: [ProductListComponent, CartBadgeComponent],
  template: \`
    <product-list />
    <cart-badge />
  \`,
})
export class AppComponent {}`,
      },
      {
        label: "Scoping a store per panel with component providers",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, inject, signal } from "@angular/core";

// NOT providedIn root: each component that lists it in providers gets its own copy.
@Injectable()
export class SelectionStore {
  static created = 0;
  readonly id = ++SelectionStore.created;
  readonly selected = signal<string | null>(null);
}

@Component({
  selector: "color-picker",
  template: \`
    @for (c of colors; track c) {
      <button (click)="store.selected.set(c)">{{ c }}</button>
    }
  \`,
})
export class ColorPickerComponent {
  protected store = inject(SelectionStore); // resolved from the nearest panel
  colors = ["red", "blue"];
}

@Component({
  selector: "color-preview",
  template: \`<p>store #{{ store.id }} selected: {{ store.selected() ?? "none" }}</p>\`,
})
export class ColorPreviewComponent {
  protected store = inject(SelectionStore);
}

// The PANEL scopes the store: its two children are siblings that share it.
@Component({
  selector: "color-panel",
  imports: [ColorPickerComponent, ColorPreviewComponent],
  providers: [SelectionStore],
  template: \`<color-picker /><color-preview />\`,
})
export class ColorPanelComponent {}

@Component({
  selector: "app-root",
  imports: [ColorPanelComponent],
  template: \`<color-panel /><color-panel />\`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Angular Signals?",
    seoDescription:
      "Signals are reactive values that track who reads them. signal, computed and effect explained with verified laziness, equality, untracked and errors.",
    description: `**Question presented to candidate:**
"Explain Angular Signals to a developer who has only used plain class fields and RxJS. What are \`signal\`, \`computed\` and \`effect\`, and why did Angular add them?"

**What a strong answer should cover:**
- A **signal** is a wrapper around a value that **tracks its readers**; read by calling it, write with \`set\` or \`update\`.
- \`computed()\` is a **derived, lazy, memoised** signal that re-runs only when a dependency it actually read changes.
- \`effect()\` runs side effects when signals it read change; it is for syncing with the outside world, not for deriving state.
- Equality: setting an equal value notifies nobody; **mutating an object in place is invisible**; custom \`equal\` is possible.
- \`untracked()\` reads without creating a dependency; writing a signal inside \`computed\` is an error (NG0600).
- Why: fine-grained change detection without Zone.js, which is why v22 apps are zoneless and OnPush by default.
- History: developer preview in v16, \`signal\`/\`computed\` stable in v17, \`effect\` stable in v20.

**Clarifying questions expected:**
- "Should I compare them with RxJS as well, or focus on the signal APIs?"

**Code / implementation expected:** Optional — a small component with a signal, a computed and an effect.`,
    answer: `**Target Audience:** Anyone new to Angular reactivity — assumes basic TypeScript and components, no RxJS needed.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The signal behaviour below came from a plain Node script against <code>@angular/core</code> 22.2.3, and the component output from compiling with <code>ngc</code> and running in jsdom. The example also runs in this page playground.

## 1. Why This Even Matters — A Story First

Imagine a spreadsheet. Cell C1 holds <code>=A1 * B1</code>. When you type a new number into A1, C1 updates on its own, and so does any chart built on C1. Nobody tells the spreadsheet "please recalculate C1": it knows, because when it first calculated C1 it noticed that C1 read A1 and B1.

Now imagine a spreadsheet that did not know. Every time anything changed anywhere, it would have to recalculate every formula on every sheet, just in case. That is roughly how Angular worked with [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon): something async happened, so check everything.

**Signals are spreadsheet cells for your app.** A signal is a cell with a value, a <code>computed</code> is a formula cell, and Angular templates are the charts. Because each one knows what it read, Angular knows exactly what to update.

## 2. The Core Idea

📌 **Interview term: Signal** — <code>count = signal(0)</code>. A writable value container. Read it by calling it, <code>count()</code>; change it with <code>count.set(5)</code> or <code>count.update(n =&gt; n + 1)</code>.

📌 **Interview term: Dependency tracking** — when code runs inside a reactive context (a <code>computed</code>, an <code>effect</code> or a template) every signal it reads is recorded as a dependency of that context.

📌 **Interview term: <code>computed()</code>** — a read-only signal derived from others: <code>total = computed(() =&gt; qty() * price())</code>. It is **lazy** (runs only when read) and **memoised** (cached until a dependency changes).

📌 **Interview term: <code>effect()</code>** — runs a function now and again whenever a signal it read changes. For side effects: logging, saving to storage, talking to a non-Angular library. See [effect() and when not to use it](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).

📌 **Interview term: Equality check** — a signal compares the new value with the old one (with <code>Object.is</code> by default) and notifies nobody if they are equal. You can pass a custom <code>equal</code> function.

📌 **Interview term: <code>untracked()</code>** — reads signals inside a reactive context without recording them as dependencies.

## 3. The Reactive Graph

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="qty and price signals feed a total computed, which feeds the template and an effect, currency is read by the template and read untracked by the effect">
  <defs>
    <marker id="sig-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="150" height="44" rx="10"/>
  <text class="d-text d-accent" x="105" y="57" text-anchor="middle">qty signal</text>
  <rect class="d-box-accent" x="30" y="120" width="150" height="44" rx="10"/>
  <text class="d-text d-accent" x="105" y="147" text-anchor="middle">price signal</text>
  <rect class="d-box-accent" x="30" y="210" width="150" height="44" rx="10"/>
  <text class="d-text d-accent" x="105" y="237" text-anchor="middle">currency signal</text>
  <rect class="d-box" x="270" y="75" width="170" height="44" rx="10"/>
  <text class="d-text" x="355" y="102" text-anchor="middle">total computed</text>
  <path class="d-edge-accent" d="M 184 52 L 266 90" marker-end="url(#sig-arrow)"/>
  <path class="d-edge-accent" d="M 184 142 L 266 106" marker-end="url(#sig-arrow)"/>
  <rect class="d-box-muted" x="530" y="30" width="160" height="44" rx="10"/>
  <text class="d-text" x="610" y="57" text-anchor="middle">template</text>
  <rect class="d-box-muted" x="530" y="150" width="160" height="44" rx="10"/>
  <text class="d-text" x="610" y="177" text-anchor="middle">effect</text>
  <path class="d-edge-accent" d="M 444 90 L 526 56" marker-end="url(#sig-arrow)"/>
  <path class="d-edge-accent" d="M 444 106 L 526 166" marker-end="url(#sig-arrow)"/>
  <path class="d-edge" d="M 184 226 L 526 64" marker-end="url(#sig-arrow)"/>
  <path class="d-edge-dashed" d="M 184 240 L 526 186" marker-end="url(#sig-arrow)"/>
  <text class="d-sub" x="380" y="250" text-anchor="middle">untracked read</text>
</svg>

Solid arrows are tracked dependencies, so a change flows along them. The dashed arrow is an <code>untracked</code> read: the effect sees the current currency when it runs, but switching currency alone does not re-run it.

## 4. Verified: how signals behave

All from one Node script against <code>@angular/core</code> 22.2.3 (no component needed: <code>signal</code> and <code>computed</code> work anywhere):

\`\`\`
1. lazy + memoised computed
   created, runs = 0
   read: 20 20 20 runs = 1
   after qty.set(3), before reading, runs = 1
   read: 30 runs = 2
2. equality: setting the same value does not notify
   qty.set(3) again -> read 30 runs = 2
3. mutating an object in place is invisible
   Hi Ada runs = 1
   after mutate + set(same ref): Hi Ada runs = 1
   after update with new object: Hi Grace runs = 2
4. custom equal
   set equal copy -> runs = 1
   set different  -> runs = 2 2,1
5. dynamic dependencies
   details changed while hidden -> runs = 1
   now visible: v3 runs = 3
6. untracked
   b changed (untracked): 101 runs = 1
   a changed (tracked)  : 202 runs = 2
8. readonly + type guards
   isSignal(ro) = true | isWritableSignal(ro) = false | typeof ro.set = undefined | isWritableSignal(total) = false
\`\`\`

What each block proves:

1. A <code>computed</code> does not run when created, runs once for three reads, and after a dependency changes it waits until someone reads it again. Changes push a "you are stale" mark; values are pulled on demand.
2. Setting the value a signal already holds is a no-op.
3. Changing <code>user().name</code> and setting the same object did nothing, and the computed still said "Hi Ada". Only a new object was noticed. **Signals compare references, not contents.**
4. A custom <code>equal</code> treated a structurally equal copy as unchanged.
5. Dependencies are re-recorded on every run. While <code>showDetails</code> was false, the computed never read <code>details</code>, so changing it caused no recompute.
6. A value read inside <code>untracked()</code> is not a dependency.
7. (Block 7, run inside a component so dev-mode messages are on.) Writing a signal inside a <code>computed</code> throws: <code>NG0600: Writing to signals is not allowed in a &#96;computed&#96;. Signal: 'other'.</code>
8. <code>asReadonly()</code> gives a signal with no <code>set</code>, and <code>isWritableSignal</code> tells the two apart.

## 5. Verified: signals in a component

The example at the bottom shows a price line with <code>qty</code>, <code>price</code> and <code>currency</code> signals, a <code>total</code> computed, and an effect that logs the total while reading <code>currency</code> through <code>untracked</code>:

\`\`\`
  computed total
  effect: total is now 4 EUR
[app] RENDERED: 1 x 4 = 4 EURAdd oneSet same qtySwitch currency
click Add one:
  computed total
  effect: total is now 8 EUR
  rendered: 2 x 4 = 8 EUR
click Set same qty:
  rendered: 2 x 4 = 8 EUR
click Switch currency:
  rendered: 2 x 4 = 8 GBP
\`\`\`

- The computed ran **once per change** even though both the effect and the template read it.
- "Set same qty" re-ran nothing: equal value, no notification.
- "Switch currency" updated the template, which tracks <code>currency()</code>, but **not** the effect, which read it untracked.

In a separate run, setting a signal three times in a row synchronously (1, 2, 3) produced a single effect run that logged <code>n = 3</code>: effects are scheduled, not run on every write.

## 6. Why Angular Added Them

- **Precise change detection.** A template that reads a signal is marked for refresh when that signal changes. That is what lets Angular drop Zone.js: new apps are zoneless by default since v21, and v22 components are OnPush by default. See [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) and [how change detection works](/interview-question/how-does-change-detection-work-in-angular).
- **Derived state without lifecycle hooks.** Inputs are signals too ([signal inputs](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1)), so a <code>computed</code> replaces [ngOnChanges](/interview-question/what-is-the-purpose-of-ngonchanges-and-how-does-it-capture-changes-in-input-prop) bookkeeping.
- **Simpler than RxJS for state.** A signal always has a current value and needs no subscription; RxJS remains the tool for events over time. See [signals versus RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18).

| | Plain field | Signal | RxJS [<code>BehaviorSubject</code>](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject) |
| :--- | :--- | :--- | :--- |
| Read | <code>this.x</code> | <code>this.x()</code> | <code>subscribe</code> or [async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful) |
| Always has a value | Yes | Yes | Yes |
| Angular knows it changed | No (needs Zone.js or [<code>markForCheck</code>](/interview-question/what-does-changedetectorref-do)) | Yes | Via the async pipe |
| Derived values | Getter, recomputed every check | <code>computed</code>, cached | <code>map</code>, <code>combineLatest</code> |
| Cleanup | None | None | Unsubscribe |

## 7. Versions

Signals arrived in developer preview in **v16** (2023). <code>signal</code> and <code>computed</code> were declared stable in **v17**, while <code>effect</code> stayed in preview through v19 (per the Angular team post <a href="https://blog.angular.dev/latest-updates-to-effect-in-angular-f2d2648defcd" target="_blank" rel="noopener noreferrer">Latest updates to effect() in Angular</a>). In the 22.2.3 typings, <code>effect</code> and <code>linkedSignal</code> carry <code>@publicApi 20.0</code>, and the signal-based component APIs <code>input</code>, <code>model</code> and <code>output</code> carry <code>@publicApi 19.0</code>.

## 8. Common Pitfalls

- **Forgetting to call it.** <code>{{ count }}</code> prints the function; <code>{{ count() }}</code> prints the value.
- **Mutating objects and arrays.** In-place changes are invisible, as verified. Always produce a new reference with <code>update</code>.
- **Using <code>effect</code> to derive state.** Copying one signal into another inside an effect is what <code>computed</code> (or <code>linkedSignal</code>) is for.
- **Writing signals inside <code>computed</code>.** It throws NG0600; computeds must be pure.
- **Reading a signal once in the [constructor](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit) and keeping the value.** You get a snapshot, not a live value; keep the signal and call it where you need it.
- **Creating effects outside an injection context.** <code>effect()</code> needs one, like <code>inject()</code>; see [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A signal is a reactive value container: you read it by calling it, set it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update</code>, and Angular tracks which computations and templates read it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three primitives:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> holds state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> derives state lazily and caches it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> runs side effects when what it read changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The rules:</strong> <span style="color:#f0e2c8;">"Equal values do not notify, signals compare references so you never mutate in place, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">untracked</code> reads without subscribing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why Angular needed them:</strong> <span style="color:#f0e2c8;">"They tell Angular exactly which views changed, which is what made zoneless and OnPush-by-default practical in v21 and v22."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. History:</strong> <span style="color:#f0e2c8;">"Developer preview in v16, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> stable in v17, signal inputs and outputs in v19, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linkedSignal</code> in v20."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed</code> recalculated every time you read it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is memoised: in the verified run three reads caused one computation, and after a dependency changed it recomputed only on the next read. If nothing reads it, it never runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between signals and RxJS observables?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A signal always has a current value, is synchronous, and needs no subscription. An observable models events over time with operators for timing and concurrency. Many apps use both and bridge them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did changing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">user().name</code> not update the UI?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the object reference stayed the same, so the equality check saw no change. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user.update(u =&gt; ({ ...u, name }))</code> to create a new object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">untracked</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside an effect or computed, to read a value you need but do not want to react to, such as the current currency for a log line, or the user ID when only a page change should trigger a save.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do effects run on every set?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They are scheduled. Three synchronous sets in a row produced one effect run with the final value in my test.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | Writable value that tracks its readers |
| **<code>computed</code>** | Derived, lazy, cached signal |
| **<code>effect</code>** | Side effect that re-runs when its dependencies change |
| **Dependency tracking** | Recording which signals a computation read |
| **Equality check** | Skipping notification when the new value equals the old |
| **<code>untracked</code>** | Reading without creating a dependency |
| **NG0600** | Error for writing a signal inside a <code>computed</code> |
| **<code>asReadonly</code>** | A view of a signal without <code>set</code> |

---
**Conclusion:** Signals are spreadsheet cells for Angular: values that know who reads them. <code>signal</code> stores state, <code>computed</code> derives it lazily and caches it, and <code>effect</code> pushes it out to the world, and the verified runs show the rules that make them predictable: equal values do nothing, references matter, dependencies are re-recorded every run, and <code>untracked</code> opts out. Because templates read signals too, Angular can update exactly the views that changed, which is the foundation of zoneless, OnPush-by-default Angular 22.`,
    examples: [
      {
        label: "signal, computed, effect and untracked in one component",
        tech: "angular",
        runnable: true,
        code: `import { Component, computed, effect, signal, untracked } from "@angular/core";

@Component({
  selector: "app-root",
  template: \`
    <p>{{ qty() }} x {{ price() }} = {{ total() }} {{ currency() }}</p>
    <button (click)="qty.update(n => n + 1)">Add one</button>
    <button (click)="qty.set(qty())">Set same qty</button>
    <button (click)="currency.set(currency() === 'EUR' ? 'GBP' : 'EUR')">Switch currency</button>
  \`,
})
export class AppComponent {
  // 1. signal(): a writable value that remembers who reads it.
  qty = signal(1);
  price = signal(4);
  currency = signal("EUR");

  // 2. computed(): derived, lazy and cached. Depends on qty and price only.
  total = computed(() => {
    console.log("  computed total");
    return this.qty() * this.price();
  });

  constructor() {
    // 3. effect(): a side effect that re-runs when a signal it read changes.
    //    currency is read inside untracked(), so switching it does NOT re-run this.
    effect(() => {
      const t = this.total();
      const cur = untracked(() => this.currency());
      console.log(\`  effect: total is now \${t} \${cur}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between computed() signals and standard method/getter calls in templates?",
    seoDescription:
      "A method or getter in a template runs on every check of the view; a computed() runs only when its signals change. Verified call counts, OnPush and Eager.",
    description: `**Question presented to candidate:**
"A teammate wrote \`{{ totalPrice() }}\` where \`totalPrice\` is a class method that loops over the cart. Another wrote the same thing as a \`computed()\` signal. Both render the same number. What is the actual difference, and does it matter in Angular 22?"

**What a strong answer should cover:**
- A **method or getter** in a template is called on **every check of that view**, whether or not its inputs changed; it caches nothing.
- A **\`computed()\`** is **memoised**: it re-runs only when a signal it read changed, and returns the cached value otherwise.
- With **OnPush** (the default in v22) a view is only checked when marked dirty, so method calls are bounded by how often the view is checked; with **Eager** (the old Default) they run on every pass that reaches it.
- \`computed\` also cuts off propagation: if its result is unchanged, downstream computeds do not re-run.
- A method that only reads signals is still **correct**, just not cached; the concern is cost and side effects, not correctness.
- Alternatives for non-signal data: a **pure pipe**.

**Clarifying questions expected:**
- "Is the data in signals already, or plain fields or observables?"

**Code / implementation expected:** Yes — count how often each runs across change detection cycles.`,
    answer: `**Target Audience:** Developers who call methods in templates and want to know when it matters — assumes signals and basic change detection.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every call count below was produced by compiling the examples with <code>ngc</code> on Angular 22.2.3, running them in jsdom and clicking through them; both examples also passed the playground mode, so you can run them here.

## 1. Why This Even Matters — A Story First

You ask a colleague "what is the total of this invoice?" One colleague adds up every line again each time you ask, even if you asked a second ago. Another writes the total on a sticky note, and only re-adds when a line on the invoice actually changes.

Both give the right answer. The difference shows up when you ask often, or when the invoice is long.

A template method is the first colleague: Angular asks every time it checks the view. A <code>computed()</code> is the second: it keeps the sticky note and knows which lines it depends on. The interview is about knowing **how often Angular asks**, which changed in Angular 22.

## 2. The Core Idea

📌 **Interview term: Template method call** — <code>{{ totalMethod() }}</code> where <code>totalMethod</code> is an ordinary class method. The compiler emits a call in the view update function, so it runs every time the view is checked.

📌 **Interview term: Getter** — <code>get totalGetter()</code> read as <code>{{ totalGetter }}</code>. It looks like a field but is a method call; same behaviour.

📌 **Interview term: Memoisation** — caching a function result until its inputs change. <code>computed()</code> memoises automatically, keyed on the signals it read.

📌 **Interview term: View check** — one run of a component view update function during change detection. Under **OnPush** a view is checked only when it is marked dirty (an input changed, a template event fired, a signal it reads changed). Under **Eager** it is checked whenever change detection passes through it. See [how change detection works](/interview-question/how-does-change-detection-work-in-angular).

📌 **Interview term: Change cut-off** — when a <code>computed</code> recomputes to an equal value, its dependents are not notified, so work stops there.

## 3. Who Asks and When

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="Each view check calls the method again, while the computed returns its cached value unless items changed">
  <defs>
    <marker id="cmp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="110" width="160" height="60" rx="12"/>
  <text class="d-text" x="110" y="137" text-anchor="middle">view check</text>
  <text class="d-sub" x="110" y="157" text-anchor="middle">any click, any cause</text>
  <rect class="d-box" x="280" y="40" width="180" height="50" rx="10"/>
  <text class="d-text" x="370" y="70" text-anchor="middle">totalMethod()</text>
  <rect class="d-box-accent" x="280" y="190" width="180" height="50" rx="10"/>
  <text class="d-text d-accent" x="370" y="220" text-anchor="middle">totalComputed()</text>
  <path class="d-edge" d="M 194 128 L 276 70" marker-end="url(#cmp-arrow)"/>
  <path class="d-edge-accent" d="M 194 152 L 276 210" marker-end="url(#cmp-arrow)"/>
  <rect class="d-box" x="540" y="40" width="160" height="50" rx="10"/>
  <text class="d-sub" x="620" y="70" text-anchor="middle">loop runs again</text>
  <path class="d-edge" d="M 464 65 L 536 65" marker-end="url(#cmp-arrow)"/>
  <rect class="d-box-accent" x="540" y="160" width="160" height="40" rx="10"/>
  <text class="d-sub" x="620" y="185" text-anchor="middle">items changed: loop</text>
  <rect class="d-box-muted" x="540" y="220" width="160" height="40" rx="10"/>
  <text class="d-sub" x="620" y="245" text-anchor="middle">else: cached value</text>
  <path class="d-edge-accent" d="M 464 206 L 536 182" marker-end="url(#cmp-arrow)"/>
  <path class="d-edge-dashed" d="M 464 226 L 536 240" marker-end="url(#cmp-arrow)"/>
</svg>

The method has one path: every check re-runs the loop. The computed has two, and only a real change to <code>items</code> takes the expensive one.

## 4. Verified: counting calls in one component

The first example renders the same total three ways (method, getter, computed) next to an unrelated <code>clicks</code> counter, and counts every call. A Report button logs the counters. The driver reported after the first render, clicked "Unrelated click" five times, reported, clicked "Add item", and reported again:

\`\`\`
after first render:
  method=1 getter=1 computed=1
after 5 unrelated clicks:
  method=7 getter=7 computed=1
after Add item:
  method=9 getter=9 computed=2
rendered: method: 65getter: 65computed: 65clicks: 5Unrelated clickAdd itemReport
\`\`\`

The arithmetic is exact: every template event marks the view dirty and causes one check, and each check calls the method and the getter once. 1 (first render) + 1 (the first Report click) + 5 (unrelated clicks) = 7; + 1 (second Report) + 1 (Add item) = 9. The computed ran once at the start and once when <code>items</code> changed, and was served from cache for the other seven checks. Even the Report button, which changes nothing the template shows, cost a method call.

No extra development-mode verification call showed up in these counts: in this [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) dev-mode run each check called the method exactly once.

## 5. Verified: OnPush limits how often you are asked

Angular 22 makes OnPush the default (the typings mark <code>ChangeDetectionStrategy.OnPush = 0</code> as the default and <code>Default</code> as a deprecated alias of <code>Eager</code>). The second example puts a plain method in two child components, one left on the default and one set to <code>ChangeDetectionStrategy.Eager</code>, and clicks a button in the **parent** five times:

\`\`\`
after first render:
  OnPush child method calls=1  Eager child method calls=1
after 5 parent clicks:
  OnPush child method calls=1  Eager child method calls=7
\`\`\`

The OnPush child was never re-checked, because nothing marked it dirty, so its method was not called again. The Eager child was checked on every pass through the tree, seven in total (five clicks plus the two Report clicks). This is why "methods in templates are slow" was louder advice in the [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon), Default-strategy era: every async event anywhere re-ran every method everywhere. In v22 the cost is bounded by how often **that** view is checked, but within that view, every check still pays.

## 6. Verified: computed also stops propagation

From a Node script against <code>@angular/core</code> 22.2.3, with <code>isEven = computed(() => count() % 2 === 0)</code> and <code>label = computed(() => isEven() ? "even" : "odd")</code>:

\`\`\`
even isEven runs=1 label runs=1
even isEven runs=2 label runs=1  (after 2 -> 4)
odd isEven runs=3 label runs=2  (after 4 -> 5)
\`\`\`

Changing <code>count</code> from 2 to 4 re-ran <code>isEven</code>, but its result was still <code>true</code>, so <code>label</code> did not re-run. Methods cannot do this: a method calling a method always runs the whole chain.

## 7. Is the Method Version Wrong?

Not if it only reads signals. A method like <code>totalMethod() { return this.items().reduce(...) }</code> is called from the template, so its signal reads are tracked by the template, and the view refreshes correctly when <code>items</code> changes. The output above shows it rendering 65 like the others. The differences are:

| | Method / getter | <code>computed()</code> |
| :--- | :--- | :--- |
| Runs | On every check of the view | Only when a signal it read changed |
| Caches | No | Yes |
| Cut-off for unchanged results | No | Yes |
| Can take arguments | Yes: <code>price(item)</code> | No: derive per item in a <code>computed</code> list, or use a pipe |
| Safe with side effects | Runs unpredictably often, so no | Must be pure (writes throw NG0600) |
| Works with plain fields | Yes (but OnPush may not re-check) | Only signals are tracked |
| Readability | Familiar | Declares the dependency explicitly |

For data that is not in signals, a **pure pipe** gives similar caching: in a verified run, <code>{{ items() | sum }}</code> next to five unrelated clicks transformed only once (<code>pipe runs = 1</code>), because a pure pipe re-runs only when its input reference changes. See [pipes in Angular](/interview-question/what-are-pipes-in-angular).

## 8. Common Pitfalls

- **Heavy work in a method or getter.** Sorting, filtering or formatting large lists in a template call runs on every check; move it into a <code>computed</code>.
- **Side effects in template methods.** Logging, counters or HTTP calls from a template expression run an unpredictable number of times.
- **Returning a new object or array every call.** A method that returns <code>items().filter(...)</code> hands child inputs a new reference on each check; a <code>computed</code> returns the same cached array until something changes. For lists, pair this with a good [@for track expression](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).
- **Thinking OnPush makes methods free.** It reduces how often the view is checked, but each check still calls every method, as the 1 to 9 count shows.
- **Calling a computed with arguments.** <code>computed</code> takes none; derive a whole structure, or use a pure pipe for per-item formatting.
- **Expecting a computed over a plain field to update.** Only signal reads are tracked; <code>computed(() =&gt; this.plainField * 2)</code> never recomputes.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A method or getter in a template runs on every check of that view; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> runs only when a signal it read changed, and returns a cached value otherwise."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The evidence:</strong> <span style="color:#f0e2c8;">"I counted it: after five unrelated clicks the method had run 7 times and the computed once. After one real change, 9 versus 2."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What OnPush changes:</strong> <span style="color:#f0e2c8;">"In v22 OnPush is the default, so a view is checked only when marked dirty. An OnPush child was not re-checked at all by five parent clicks, while an Eager child ran its method 7 times."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correctness versus cost:</strong> <span style="color:#f0e2c8;">"A method that reads signals still renders correctly, because the template tracks the signals it reads. The issue is repeated work and unpredictable calls, not wrong output."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rule of thumb:</strong> <span style="color:#f0e2c8;">"Derived values go in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>; per-item formatting of non-signal data goes in a pure pipe; template expressions stay cheap and side-effect free."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a getter any different from a method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A getter is a method call with property syntax. In the verified run the getter count matched the method count exactly, 1, 7 and 9.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just memoise the method yourself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could, but you would have to track the inputs and invalidate the cache by hand. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> records its dependencies automatically, invalidates precisely, and adds change cut-off so dependents do not re-run for equal results.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a method call in a template break OnPush?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. OnPush decides when the view is checked; a method decides what runs during a check. With signals inside, the view is still marked dirty correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a method in a template fine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When it is trivial, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isSelected(item)</code> comparing two IDs, or when it needs an argument per row. The cost of a cheap comparison per check is negligible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngOnChanges</code> caching instead of computed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That was the pre-signal pattern: compute in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> and store in a field. With signal inputs, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> does the same job with less code and also reacts to non-input signals.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Template method call** | A class method called from a binding; runs every view check |
| **Getter** | Property-looking method; same cost as a method |
| **Memoisation** | Caching a result until its inputs change |
| **View check** | One run of a view update during change detection |
| **OnPush** | Default in v22: check the view only when marked dirty |
| **Eager** | Opt-in: check on every pass (the old Default) |
| **Change cut-off** | Equal computed results do not notify dependents |
| **Pure pipe** | Pipe that re-runs only when its input reference changes |

---
**Conclusion:** A template method and a <code>computed()</code> can render the same value, but they answer different questions: a method answers "what is it now?" every single time the view is checked, while a <code>computed</code> answers "has anything it depends on changed?" first. The verified counts make it concrete, 9 method calls against 2 computations in one component, and the OnPush comparison shows why Angular 22 defaults reduce but do not remove the cost. Put derived state in <code>computed</code>, keep template expressions cheap, and use a pure pipe when the data is not in signals. For the bigger picture of signal APIs, see [Angular Signals](/interview-question/what-are-angular-signals).`,
    examples: [
      {
        label: "Method vs getter vs computed: call counts across view checks",
        tech: "angular",
        runnable: true,
        code: `import { Component, computed, signal } from "@angular/core";

const calls = { method: 0, getter: 0, computed: 0 };

@Component({
  selector: "app-root",
  template: \`
    <p>method:   {{ totalMethod() }}</p>
    <p>getter:   {{ totalGetter }}</p>
    <p>computed: {{ totalComputed() }}</p>
    <p>clicks: {{ clicks() }}</p>
    <button (click)="clicks.update(n => n + 1)">Unrelated click</button>
    <button (click)="addItem()">Add item</button>
    <button (click)="report()">Report</button>
  \`,
})
export class AppComponent {
  items = signal([10, 20, 30]);
  clicks = signal(0); // unrelated state that lives in the same template

  // 1. A method: re-run every time this view is checked.
  totalMethod() {
    calls.method++;
    return this.items().reduce((a, b) => a + b, 0);
  }

  // 2. A getter: just a method without parentheses. Same behaviour.
  get totalGetter() {
    calls.getter++;
    return this.items().reduce((a, b) => a + b, 0);
  }

  // 3. A computed: re-run only when items() changes, cached otherwise.
  totalComputed = computed(() => {
    calls.computed++;
    return this.items().reduce((a, b) => a + b, 0);
  });

  addItem() {
    this.items.update(list => [...list, 5]);
  }

  report() {
    console.log(\`  method=\${calls.method} getter=\${calls.getter} computed=\${calls.computed}\`);
  }
}`,
      },
      {
        label: "The same method in an OnPush child and an Eager child",
        tech: "angular",
        runnable: true,
        code: `import { ChangeDetectionStrategy, Component, signal } from "@angular/core";

const calls = { onPush: 0, eager: 0 };

// Default in v22: OnPush. Checked only when something marks THIS view dirty.
@Component({
  selector: "onpush-total",
  template: \`<p>OnPush child: {{ total() }}</p>\`,
})
export class OnPushTotalComponent {
  total() {
    calls.onPush++;
    return 42;
  }
}

// Opt-in: Eager (the old "Default"). Checked on every pass that reaches it.
@Component({
  selector: "eager-total",
  changeDetection: ChangeDetectionStrategy.Eager,
  template: \`<p>Eager child: {{ total() }}</p>\`,
})
export class EagerTotalComponent {
  total() {
    calls.eager++;
    return 42;
  }
}

@Component({
  selector: "app-root",
  imports: [OnPushTotalComponent, EagerTotalComponent],
  template: \`
    <onpush-total />
    <eager-total />
    <button (click)="clicks.update(n => n + 1)">Parent click {{ clicks() }}</button>
    <button (click)="report()">Report</button>
  \`,
})
export class AppComponent {
  clicks = signal(0);
  report() {
    console.log(\`  OnPush child method calls=\${calls.onPush}  Eager child method calls=\${calls.eager}\`);
  }
}`,
      },
    ],
  },
];

export default augments;
