/**
 * Angular ULTRA — batch 09: forms (reactive vs template-driven, patchValue vs
 * setValue, custom and cross-field validators, FormArray, updateOn,
 * ControlValueAccessor, NG_VALUE_ACCESSOR, Signal Forms).
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
 * Every "Verified" block was produced on Angular 22.2.3 (@angular/forms and
 * @angular/forms/signals 22.2.3) with scripts/verify-angular-example.mjs:
 * AOT-compiled with ngc and strictTemplates, booted with bootstrapApplication
 * in jsdom and driven by a script that types, blurs, clicks and submits.
 * Examples marked runnable also passed its --playground mode (plain transpile
 * + JIT, the way the site playground runs them). Non-component facts (error
 * texts, FormArray methods, validator results, typed-forms compile errors)
 * come from small scripts run against the same package and from `tsc --strict`.
 * Stability claims for Signal Forms were read from the 22.2.3 typings
 * (`@publicApi 22.0`, no `@experimental` outside the WebMCP hooks).
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */

import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between reactive and template-driven forms?",
    seoDescription:
      "Reactive forms build the form model in the class; template-driven forms let ngModel build it from the template. Timing, typing, testing, when to pick each.",
    description: `**Question presented to candidate:**
"We have a two-field newsletter box built with ngModel, and a twelve-step onboarding wizard. What is the difference between template-driven and reactive forms, and which would you use for each?"

**What a strong answer should cover:**
- Both are built on the same classes (\`FormControl\`, \`FormGroup\`); the difference is **who creates the form model**: the template (\`ngModel\` + \`name\`) or the component class (\`new FormGroup(...)\`).
- **Template-driven** (\`FormsModule\`): two-way binding to plain fields, validation through attributes, controls registered **asynchronously** (a microtask after the view is created).
- **Reactive** (\`ReactiveFormsModule\`): the model exists **synchronously** in the constructor, is **strongly typed** since v14, exposes \`valueChanges\`/\`statusChanges\`/\`events\` Observables, and is easy to unit test without a DOM.
- Dynamic structure (adding fields, swapping validators, cross-field rules) is natural in reactive forms and awkward in templates.
- Pick by complexity: template-driven for small, static forms; reactive for anything dynamic, large or heavily validated. Mention **Signal Forms** (stable in v22) as the new third option.

**Clarifying questions expected:**
- "Is the structure of the form known up front, or does it change at runtime?"
- "Do we need to unit test validation logic without rendering the component?"

**Code / implementation expected:** Optional — the same field written both ways, ideally showing the template-driven control appearing a tick later.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — assumes basic TypeScript and Angular components, no prior forms knowledge.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary interviewers listen for. The log lines in section 5 were produced by compiling the example with <code>ngc</code> (strict templates) on Angular 22.2.3, booting it in jsdom and typing into both forms with a test driver.

## 1. Why This Even Matters — A Story First

Two people plan the same dinner party.

The first one writes the guest list **on the invitations themselves**. Every card that goes out adds a name to the list, and if you want to know who is coming you have to wait until all the cards have been written. Simple, quick, and perfect for six friends.

The second one keeps a **spreadsheet**. The list exists before a single card is printed. She can sort it, add a column for allergies, check that every plus-one has a name, and hand the sheet to someone else to double-check without printing anything. More set-up, but it scales to a wedding.

Template-driven forms are the invitations: the **template** builds the form as it renders. Reactive forms are the spreadsheet: the **class** builds the form first and the template only displays it. Interviewers ask this because the choice decides how easy validation, testing and future changes will be.

## 2. The Core Idea

📌 **Interview term: Form model** — the tree of objects that holds each field value, its validation status and flags such as touched and dirty. In Angular that tree is always made of <code>FormControl</code> (one field), <code>FormGroup</code> (named fields) and <code>FormArray</code> (a list of fields).

The single most important sentence: **both approaches use exactly the same form model classes. The difference is who creates them.**

📌 **Interview term: Template-driven form** — you import <code>FormsModule</code>, put <code>ngModel</code> and a <code>name</code> on each input, and Angular creates a <code>FormControl</code> for you behind the scenes. Validation comes from attributes such as <code>required</code> or <code>minlength</code>. The component holds plain fields bound with <code>[(ngModel)]</code> (see [how two-way binding works](/interview-question/how-does-two-way-binding-work-under-the-hood)).

📌 **Interview term: Reactive form** — you import <code>ReactiveFormsModule</code>, create <code>new FormGroup({ ... })</code> in the class, and connect the template with <code>[formGroup]</code> and <code>formControlName</code>. Validators are functions passed when the control is created.

📌 **Interview term: Directive** — template-driven forms are powered by the <code>NgForm</code> and <code>NgModel</code> [directives](/interview-question/what-is-a-directive-and-what-are-the-types); reactive forms by <code>FormGroupDirective</code> and <code>FormControlName</code>. Both sets talk to the input through a **value accessor** (see [ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-)).

## 3. Who Owns the Model

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Template-driven forms build the form model from the template, reactive forms build it in the class and bind the template to it">
  <defs>
    <marker id="rtd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="175" y="28" text-anchor="middle">Template-driven</text>
  <rect class="d-box" x="50" y="50" width="250" height="56" rx="10"/>
  <text class="d-text" x="175" y="74" text-anchor="middle">Template</text>
  <text class="d-sub" x="175" y="94" text-anchor="middle">ngModel name required</text>
  <path class="d-edge" d="M 175 110 L 175 160" marker-end="url(#rtd-arrow)"/>
  <text class="d-sub" x="250" y="140" text-anchor="middle">creates, one tick later</text>
  <rect class="d-box-muted" x="50" y="168" width="250" height="56" rx="10"/>
  <text class="d-text" x="175" y="192" text-anchor="middle">FormGroup + FormControl</text>
  <text class="d-sub" x="175" y="212" text-anchor="middle">hidden inside NgForm</text>
  <text class="d-sub" x="175" y="262" text-anchor="middle">class holds plain fields</text>
  <text class="d-text" x="545" y="28" text-anchor="middle">Reactive</text>
  <rect class="d-box-accent" x="420" y="50" width="250" height="56" rx="10"/>
  <text class="d-text d-accent" x="545" y="74" text-anchor="middle">Component class</text>
  <text class="d-sub" x="545" y="94" text-anchor="middle">new FormGroup(...)</text>
  <path class="d-edge-accent" d="M 545 110 L 545 160" marker-end="url(#rtd-arrow)"/>
  <text class="d-sub" x="622" y="140" text-anchor="middle">binds, now</text>
  <rect class="d-box" x="420" y="168" width="250" height="56" rx="10"/>
  <text class="d-text" x="545" y="192" text-anchor="middle">Template</text>
  <text class="d-sub" x="545" y="212" text-anchor="middle">formGroup formControlName</text>
  <text class="d-sub" x="545" y="262" text-anchor="middle">class holds the model</text>
</svg>

On the left the arrow points down from the template: the form exists because the template rendered. On the right it points down from the class: the template is just a view of a model that already exists, which is why you can read, test and reshape it before any HTML is involved.

## 4. Side by Side

| | Template-driven | Reactive |
| :--- | :--- | :--- |
| Import | <code>FormsModule</code> | <code>ReactiveFormsModule</code> |
| Model created by | <code>NgModel</code> directives as the template renders | Your code, in the class |
| When the model exists | A microtask after the view is created (verified below) | Immediately, in the constructor |
| Data flow | Two-way: <code>[(ngModel)]</code> mutates a class field | Explicit: read <code>form.value</code>, write <code>setValue</code>/<code>patchValue</code> |
| Typing | <code>NgForm.form</code> is an untyped <code>FormGroup</code>; values are <code>any</code> | Strictly typed since v14 (<code>FormControl&lt;string&gt;</code>) |
| Validation | HTML-like attributes (<code>required</code>, <code>email</code>) or custom directives | Validator functions, easy to compose and reuse |
| Change streams | Available through <code>NgForm</code>, but rarely used | <code>valueChanges</code>, <code>statusChanges</code>, <code>events</code> Observables |
| Dynamic fields | Awkward: driven by <code>@for</code> plus unique <code>name</code>s | Natural: <code>FormArray.push</code>, <code>addControl</code>, <code>setValidators</code> |
| Unit testing | Needs the template rendered and a tick to pass | Test the <code>FormGroup</code> directly, no DOM |
| Best for | Small, static forms (search box, newsletter) | Anything dynamic, large or rule-heavy |

The typed-forms claim comes from the official guide, which states reactive forms are "strictly typed by default" since Angular 14 (<a href="https://angular.dev/guide/forms/typed-forms" target="_blank" rel="noopener noreferrer">angular.dev typed forms</a>). Template-driven forms do not get those types.

## 5. Verified: The Same Field Built Both Ways

The runnable example renders one email field as a template-driven form and one as a reactive form, and logs when each form model becomes available. Compiled with <code>ngc</code> in strict mode and run in jsdom:

\`\`\`
RX  constructor: {"email":"ada@example.com"}
TD  ngAfterViewInit: {}
TD  after microtask: {"email":"ada@example.com"}
\`\`\`

That ordering is the most interview-worthy fact in this whole topic. The reactive form has its value **before the component has a view**. The template-driven form is still **empty in <code>ngAfterViewInit</code>** (see [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks)), because <code>NgModel</code> registers its control with <code>NgForm</code> in a resolved promise; one microtask later the value is there.

Then the driver cleared and typed into both inputs (one line per step; the TD part is the <code>json</code> [pipe](/interview-question/what-are-pipes-in-angular) output with whitespace collapsed):

\`\`\`
after boot   | TD value={ "email": "ada@example.com" } valid=true | RX value={"email":"ada@example.com"} valid=true
both cleared | TD value={ "email": "" } valid=false              | RX value={"email":""} valid=false
typed grace  | TD value={ "email": "grace" } valid=true           | RX value={"email":"grace"} valid=false
\`\`\`

Same input, different verdict on "grace": the template only has <code>required</code>, while the reactive control has <code>Validators.required</code> and <code>Validators.email</code> in one array in the class. In a template-driven form you would add an <code>email</code> attribute instead. That is the general pattern: template-driven validation lives in markup, reactive validation lives in code.

Two Angular 22 details in that run. The app is [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) and components are OnPush by default, yet both forms re-render on typing, because the input event is a template listener and listeners mark the view for checking (see [how change detection works](/interview-question/how-does-change-detection-work-in-angular)). And the reactive example mirrors <code>valueChanges</code> into a [signal](/interview-question/what-are-angular-signals) for display, which is the clean way to show a stream in an OnPush template.

## 6. The Async Registration Trap

Because template-driven controls are registered a microtask late, code like this (an <code>NgForm</code> grabbed with [@ViewChild](/interview-question/what-are-viewchild-and-contentchild)) does not work:

\`\`\`ts
@ViewChild("f") form!: NgForm;
ngAfterViewInit() {
  this.form.controls["email"].setValue("x"); // undefined: the control is not registered yet
}
\`\`\`

The same delay shows up in tests: after the first <code>fixture.detectChanges()</code> you need <code>await fixture.whenStable()</code> before the template-driven model is populated (see [fixture.detectChanges()](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-)). A reactive form has no such step, because the class created the model synchronously.

## 7. Choosing in Practice

- **Choose template-driven** for a login box, a search field, a settings page with a handful of fixed inputs. Less code, and the template reads like the HTML it is.
- **Choose reactive** when fields appear and disappear (see [FormArray](/interview-question/what-is-a-formarray)), when one field's rules depend on another (see [dynamic validation](/interview-question/how-do-you-handle-dynamic-validation-where-one-form-field-s-validator-depends-on)), when you need typed values sent to an API, or when validation logic must be unit tested.
- **Know the third option.** Angular 22 ships **Signal Forms** (<code>@angular/forms/signals</code>) as stable: a typed field tree built over a <code>signal</code> model, with schema validators. It combines the class-owned model of reactive forms with the low ceremony of template-driven ones. See [how Signal Forms and ControlValueAccessor evolve](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular).
- **Do not mix them on one control.** Putting <code>ngModel</code> on an input that also has <code>formControlName</code> is deprecated since v6, and 22.2.3 still logs "It looks like you're using ngModel on the same form field as formControlName" in dev mode.

## 8. Common Pitfalls

- **Saying they use different engines.** Both create <code>FormControl</code> and <code>FormGroup</code>; template-driven forms just do it for you, from the template.
- **Reading a template-driven control in <code>ngAfterViewInit</code>.** Verified above: it is <code>{}</code> there and filled one microtask later.
- **Forgetting <code>name</code> on an <code>ngModel</code> inside a <code>&lt;form&gt;</code>.** Without it the control cannot register with <code>NgForm</code>; verified on 22.2.3, Angular throws <code>NG01352: If ngModel is used within a form tag, either the name attribute must be set or the form control must be defined as 'standalone' in ngModelOptions</code>.
- **Mutating the model field and expecting reactive-form semantics.** In template-driven forms the class field is the source of truth; in reactive forms the <code>FormGroup</code> is, and a class field is not updated unless you subscribe or read <code>form.value</code>.
- **Using reactive forms but still putting validation in the template.** A <code>required</code> attribute on a <code>formControlName</code> input activates the <code>RequiredValidator</code> directive too (verified: the control reported <code>{"required":true}</code> with no validator in the class), so rules end up in two places. Keep them in the class.
- **Assuming typed values in template-driven forms.** <code>NgForm.value</code> is <code>any</code>; only reactive forms (and Signal Forms) are typed.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Both build the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormControl</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> model; template-driven forms let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> create it from the template, reactive forms create it explicitly in the class."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The timing difference:</strong> <span style="color:#f0e2c8;">"A reactive form exists in the constructor. A template-driven control registers a microtask after the view is created, so it is still empty in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What reactive buys you:</strong> <span style="color:#f0e2c8;">"Typed values since v14, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code> streams, validators as plain functions, dynamic fields with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray</code>, and unit tests without a DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When template-driven wins:</strong> <span style="color:#f0e2c8;">"Small, static forms: less code, the markup reads naturally, and two-way binding to a plain field is all you need."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with the modern view:</strong> <span style="color:#f0e2c8;">"In Angular 22 there is also Signal Forms, stable, which keeps a typed model in the class but drives it with signals instead of Observables."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are template-driven forms deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormsModule</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReactiveFormsModule</code> are public, supported APIs in 22.2.3. Template-driven forms are simply less suited to complex forms; the team now points new complex forms towards Signal Forms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are template-driven forms asynchronous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgModel</code> registers its control with the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgForm</code> inside a resolved promise, so it does not change the form tree while the view is still being checked. The cost is that the model appears one microtask late, which tests must wait for with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whenStable()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you unit test a reactive form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Construct the component class or just the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code>, and assert on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valid</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errors</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>. No template, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code> and no change detection needed for the validation logic itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use both in one app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, per component. Each component imports the module it needs. Just never put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControlName</code> on the same input; that combination is deprecated and warns in dev mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get typed values from a template-driven form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You do not get them for free: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgForm.value</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code>. If types matter, that is a strong signal to move the form to reactive or Signal Forms, where the model type flows from the initial values.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Form model** | Tree of <code>FormControl</code>/<code>FormGroup</code>/<code>FormArray</code> holding values and status |
| **Template-driven form** | <code>FormsModule</code>; <code>ngModel</code> creates the controls from the template |
| **Reactive form** | <code>ReactiveFormsModule</code>; the class creates the controls and the template binds to them |
| **NgForm / NgModel** | Directives that build a template-driven form |
| **FormGroupDirective / FormControlName** | Directives that connect a template to a reactive model |
| **Directive** | A class that adds behaviour to an element; forms are built from them |
| **Typed forms** | Since v14, reactive controls carry the TypeScript type of their value |
| **Signal Forms** | The v22-stable signal-based forms API in <code>@angular/forms/signals</code> |

---
**Conclusion:** Template-driven and reactive forms are two ways of building the same form model. Template-driven forms let the template create controls, which is concise for small forms but, as the run on 22.2.3 showed, leaves the model empty until a microtask after the view exists and gives you untyped values. Reactive forms create a typed model in the class before any view exists, expose it as streams, and make dynamic fields, cross-field rules and unit tests straightforward. Pick template-driven for small static forms, reactive for anything that grows, and know that Signal Forms are now the stable third path.`,
    examples: [
      {
        label: "The same email field built both ways, with the template-driven microtask delay logged",
        tech: "angular",
        runnable: true,
        code: `import { AfterViewInit, Component, ViewChild, signal } from "@angular/core";
import { JsonPipe } from "@angular/common";
import { FormControl, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from "@angular/forms";

// Template-driven: the template creates the controls (ngModel + name).
@Component({
  selector: "td-signup",
  imports: [FormsModule, JsonPipe],
  template: \`
    <form #f="ngForm">
      <input id="td-email" name="email" [(ngModel)]="email" required />
      <span class="td-out">TD value={{ f.value | json }} valid={{ f.valid }}</span>
    </form>
  \`,
})
export class TdSignup implements AfterViewInit {
  @ViewChild("f") form!: NgForm;
  email = "ada@example.com";
  ngAfterViewInit() {
    // Controls are registered in a microtask, so they are not there yet.
    console.log("TD  ngAfterViewInit:", JSON.stringify(this.form.value));
    Promise.resolve().then(() => console.log("TD  after microtask:", JSON.stringify(this.form.value)));
  }
}

// Reactive: the class creates the controls; the template only binds to them.
@Component({
  selector: "rx-signup",
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form">
      <input id="rx-email" formControlName="email" />
      <span class="rx-out">RX value={{ value() }} valid={{ form.valid }}</span>
    </form>
  \`,
})
export class RxSignup {
  form = new FormGroup({
    email: new FormControl("ada@example.com", { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  value = signal(JSON.stringify(this.form.value));
  constructor() {
    // The model exists before the view does, and it is a stream you can subscribe to.
    console.log("RX  constructor:", JSON.stringify(this.form.value));
    this.form.valueChanges.subscribe((v) => this.value.set(JSON.stringify(v)));
  }
}

@Component({
  selector: "app-root",
  imports: [TdSignup, RxSignup],
  template: \`<td-signup /><hr /><rx-signup />\`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the difference between FormGroup.patchValue() and FormGroup.setValue().",
    seoDescription:
      "setValue() demands every key and throws NG01002 if one is missing; patchValue() updates only the keys you pass. Typed signatures, disabled controls, reset.",
    description: `**Question presented to candidate:**
"An edit-profile page loads a user from the API and fills a FormGroup. Sometimes the API leaves out a field and the page crashes, sometimes it does not. Explain the difference between setValue() and patchValue(), and which one you would use here."

**What a strong answer should cover:**
- \`setValue()\` requires the **exact shape**: every control key must be present, or it throws \`NG01002: Must supply a value for form control with name: '...'\`; an unknown key throws \`NG01001\`.
- \`patchValue()\` accepts a **partial** object, updates only the keys it recognises and silently ignores the rest.
- With **typed forms** (v14+), TypeScript already rejects a partial object passed to \`setValue()\`; the runtime check is the safety net for untyped data such as API responses.
- Disabled controls still count: \`setValue\` needs their key too, and \`form.value\` omits them while \`getRawValue()\` includes them.
- Both work recursively on nested groups and arrays, both fire \`valueChanges\` once for the group, and both accept \`{ emitEvent: false }\`.
- \`reset()\` is different again: it restores initial values for \`nonNullable\` controls and sets the rest to \`null\`.

**Clarifying questions expected:**
- "Is the API response guaranteed to have every field, or should missing fields keep their current values?"
- "Do we want the page to fail loudly if the response shape changes?"

**Code / implementation expected:** Yes — call both on the same typed FormGroup and show the error text and the resulting values.`,
    answer: `**Target Audience:** Developers who have built at least one reactive form and want to know exactly how its update methods behave.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every error message and value quoted below was printed by running the code on Angular 22.2.3, either in the runnable example (compiled with <code>ngc</code>, booted in jsdom and clicked through by a driver) or in small scripts against <code>@angular/forms</code>. The type errors come from <code>tsc --strict</code>.

## 1. Why This Even Matters — A Story First

A hotel receptionist has a check-in card with five boxes: name, email, phone, room, nights.

Her first rule is strict: **"Give me a complete card or nothing."** If any box is blank she hands the card back and refuses to file it. That is <code>setValue()</code>.

Her second rule is relaxed: **"Tell me what changed."** A guest says "my phone number is new", and she corrects just that box, leaving the others as they were. That is <code>patchValue()</code>.

Neither rule is better. The strict one catches a broken card early; the relaxed one is what you want for small edits. The bug in the interview scenario comes from using the strict rule on data that is sometimes incomplete.

## 2. The Core Idea

📌 **Interview term: FormGroup** — a reactive-forms container of named child controls. Its <code>value</code> is an object with one key per enabled child. (New to reactive forms? Start with [reactive vs template-driven forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms).)

📌 **Interview term: setValue()** — replaces the value of **every** child. The argument must match the group structure exactly: no missing keys, no extra keys.

📌 **Interview term: patchValue()** — updates **only the children whose keys you pass** and ignores keys it does not know.

On a single <code>FormControl</code> the two are effectively the same: the 22.2.3 source of <code>FormControl.patchValue</code> simply calls <code>setValue</code>. The difference only matters on containers: <code>FormGroup</code>, <code>FormRecord</code> and <code>FormArray</code>.

## 3. What Each Method Checks

<svg class="iq-diagram" width="100%" viewBox="0 0 720 290" role="img" aria-label="setValue checks that every key is present before writing, patchValue writes only the keys it knows">
  <defs>
    <marker id="psv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="260" y="20" width="200" height="50" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">input: name only</text>
  <path class="d-edge" d="M 320 74 L 175 120" marker-end="url(#psv-arrow)"/>
  <path class="d-edge-accent" d="M 400 74 L 545 120" marker-end="url(#psv-arrow)"/>
  <rect class="d-box-muted" x="60" y="126" width="230" height="56" rx="10"/>
  <text class="d-text" x="175" y="150" text-anchor="middle">setValue</text>
  <text class="d-sub" x="175" y="170" text-anchor="middle">all keys present?</text>
  <path class="d-edge-dashed" d="M 175 186 L 175 220" marker-end="url(#psv-arrow)"/>
  <rect class="d-box-muted" x="60" y="226" width="230" height="44" rx="10"/>
  <text class="d-sub" x="175" y="253" text-anchor="middle">no: throws NG01002</text>
  <rect class="d-box-accent" x="430" y="126" width="230" height="56" rx="10"/>
  <text class="d-text d-accent" x="545" y="150" text-anchor="middle">patchValue</text>
  <text class="d-sub" x="545" y="170" text-anchor="middle">for each known key</text>
  <path class="d-edge-accent" d="M 545 186 L 545 220" marker-end="url(#psv-arrow)"/>
  <rect class="d-box" x="430" y="226" width="230" height="44" rx="10"/>
  <text class="d-sub" x="545" y="253" text-anchor="middle">name updated, rest kept</text>
</svg>

The left path is a guard: <code>setValue</code> validates the shape up front and refuses the whole update. The right path never fails because of shape; it walks the keys it was given and skips anything it cannot match.

## 4. Verified: Both Methods on One Typed Form

The runnable example has a typed group with three controls, one of them disabled:

\`\`\`ts
profile = new FormGroup({
  name: new FormControl("Ada", { nonNullable: true }),
  email: new FormControl<string | null>("ada@example.com"),
  plan: new FormControl({ value: "pro", disabled: true }, { nonNullable: true }),
});
\`\`\`

A driver clicked each button in turn. Output from the AOT build in jsdom, identical in playground mode:

\`\`\`
initial: value={"name":"Ada","email":"ada@example.com"} raw={"name":"Ada","email":"ada@example.com","plan":"pro"}
#patch       | patch: value={"name":"Grace","email":"ada@example.com"} raw={"name":"Grace","email":"ada@example.com","plan":"pro"} | inputs: Grace,ada@example.com,pro
#set-partial | setValue threw: NG01002: Must supply a value for form control with name: 'email' | inputs: Grace,ada@example.com,pro
#set-full    | set: value={"name":"Linus","email":null} raw={"name":"Linus","email":null,"plan":"free"} | inputs: Linus,,free
#reset       | reset: value={"name":"Ada","email":null} raw={"name":"Ada","email":null,"plan":"pro"} | inputs: Ada,,pro
\`\`\`

Read it line by line:

1. **patchValue({ name })** changed only <code>name</code>. The DOM inputs followed.
2. **setValue({ name })** threw <code>NG01002</code> naming the first missing key, and nothing changed: the inputs still show Grace.
3. **setValue with all keys** worked, and it **had to include <code>plan</code>** even though that control is disabled.
4. **reset()** put <code>name</code> and <code>plan</code> back to their initial values (they are <code>nonNullable</code>) and set the nullable <code>email</code> to <code>null</code>.

Notice also that <code>value</code> never contains <code>plan</code>. A disabled control is excluded from its parent value; <code>getRawValue()</code> includes it.

## 5. The Exact Rules, Verified

These came from a script run directly against <code>@angular/forms</code> 22.2.3:

| Call | Result |
| :--- | :--- |
| <code>setValue({ name })</code> on <code>{name, email}</code> | Throws <code>NG01002: Must supply a value for form control with name: 'email'</code> |
| <code>setValue({ name, email, extra })</code> | Throws <code>NG01001: Cannot find form control with name: 'extra'</code> |
| <code>patchValue({ name, extra })</code> | Updates <code>name</code>, ignores <code>extra</code> |
| <code>setValue</code> missing a **disabled** key | Throws <code>NG01002</code> for that key too |
| Nested: <code>patchValue({ addr: { city } })</code> | Updates <code>addr.city</code>, keeps <code>addr.zip</code> |
| Nested: <code>setValue({ addr: { city } })</code> | Throws <code>NG01002</code> for <code>zip</code> |
| <code>FormArray</code> of 2, <code>patchValue([9])</code> | <code>[9,2]</code> |
| <code>FormArray</code> of 2, <code>patchValue([7,8,9])</code> | <code>[7,8]</code>: extra items are ignored, not added |
| <code>FormArray</code> of 2, <code>setValue([5])</code> | Throws <code>NG01002: Must supply a value for form control at index: 1</code> |
| <code>patchValue({ a: 2, b: 3 })</code> | Group <code>valueChanges</code> fires **once**, not once per key |
| <code>patchValue(..., { emitEvent: false })</code> | No <code>valueChanges</code> emission |

One surprise worth knowing. The two errors are checked at **different times**. The missing-key check runs over the whole object first, so a missing key changes nothing. The unknown-key check runs **inside the loop**, so in <code>setValue({ name: "L", email: "x", extra: 1 })</code> the <code>name</code> and <code>email</code> controls were already set to "L" and "x" when the error was thrown, while the group <code>value</code> still read <code>{"name":"Ada","email":""}</code> because the final <code>updateValueAndValidity()</code> never ran. The source confirms it: <code>assertAllValuesPresent</code> runs before the loop and <code>assertControlPresent</code> inside it. Treat a thrown <code>setValue</code> as having left the form in an inconsistent state.

## 6. What Typed Forms Change

📌 **Interview term: Typed forms** — since v14, reactive controls carry the type of their value. <code>new FormControl("Ada")</code> is a <code>FormControl&lt;string | null&gt;</code> (null because <code>reset()</code> can null it), and <code>{ nonNullable: true }</code> removes the <code>null</code>.

Running <code>tsc --strict</code> on misuse gives:

\`\`\`
error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type '{ name: string | null; age: number; }'.
  Property 'age' is missing in type '{ name: string; }' but required in type '{ name: string | null; age: number; }'.
error TS2322: Type 'number' is not assignable to type 'string'.            <- patchValue({ name: 42 })
error TS2322: Type 'Partial<{ name: string | null; age: number; }>' is not assignable to type '{ name: string; age: number; }'.
\`\`\`

So with typed forms the compiler enforces <code>setValue</code>'s "every key" rule and <code>patchValue</code>'s value types. The runtime <code>NG01002</code> still matters for data the compiler cannot see, such as an HTTP response typed as <code>any</code>, or a cast like the one the runnable example uses on purpose.

The last error shows another typed-forms detail: <code>form.value</code> is typed as a <code>Partial</code>, because disabled controls are left out. If you want the full object type, use <code>getRawValue()</code>.

## 7. Which One to Use

| Situation | Use | Why |
| :--- | :--- | :--- |
| Filling the form from a complete, trusted object | <code>setValue</code> | Fails fast if the shape drifts |
| API response that may omit fields | <code>patchValue</code> | Missing fields keep their current value |
| Updating one or two fields from code | <code>patchValue</code> | Less noise, no need to restate everything |
| Clearing the form | <code>reset()</code> | Restores defaults, clears dirty and touched |
| Programmatic update that must not trigger subscribers | either, with <code>{ emitEvent: false }</code> | Avoids feedback loops in <code>valueChanges</code> handlers |

For the interview scenario: use <code>patchValue</code> for the API data, or validate and map the response into the exact shape and use <code>setValue</code> if a missing field should be treated as a bug.

## 8. Common Pitfalls

- **Using <code>setValue</code> on API data.** One optional field missing in the response and the page throws <code>NG01002</code>.
- **Expecting <code>patchValue</code> to grow a <code>FormArray</code>.** Verified: extra items are ignored. Push new controls first (see [FormArray](/interview-question/what-is-a-formarray)).
- **Forgetting disabled controls in <code>setValue</code>.** They are still required keys, even though <code>value</code> leaves them out.
- **Reading <code>form.value</code> to submit.** Disabled fields are missing; use <code>getRawValue()</code> if the backend needs them.
- **Calling <code>reset()</code> without <code>nonNullable</code>.** Every plain control becomes <code>null</code>, not its initial value, which is often what breaks a "Clear" button.
- **Triggering <code>valueChanges</code> loops.** Patching the same form inside its own <code>valueChanges</code> handler re-enters the handler. In a test that derived a <code>slug</code> field this way, the handler ran until a guard stopped it at 51 calls; with <code>{ emitEvent: false }</code> it ran once.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> replaces the whole value and demands every key; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchValue</code> updates only the keys you pass and ignores the rest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The failure mode:</strong> <span style="color:#f0e2c8;">"A missing key makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG01002: Must supply a value for form control with name: ...</code>, and an unknown key throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG01001</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Typed forms:</strong> <span style="color:#f0e2c8;">"Since v14 TypeScript rejects a partial object passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code>, so the runtime check mainly protects you from untyped data like API responses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Details that trip people:</strong> <span style="color:#f0e2c8;">"Disabled controls still need a key in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> but are missing from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getRawValue()</code> includes them. On a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchValue</code> never adds items."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My choice:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchValue</code> for partial or external data, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> when the shape is guaranteed and drift should fail loudly, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code> to clear."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">patchValue</code> on a single <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">FormControl</code> behave differently from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setValue</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In 22.2.3 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormControl.patchValue</code> just calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code>. The distinction only exists on containers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormRecord</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many times does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">valueChanges</code> fire for a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">patchValue</code> with two keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once on the group. Each child is set with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onlySelf: true</code> and the group recalculates its value and validity a single time at the end. I verified one emission for a two-key patch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you update the form without firing subscribers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ emitEvent: false }</code>. The value and validity still update, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">statusChanges</code> do not emit, which is the standard way to avoid loops when a subscriber writes back into the form.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reset()</code> do to a nullable control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sets it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and marks it pristine and untouched. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonNullable: true</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormBuilder.nonNullable</code>) it goes back to its initial value instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a failed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setValue</code> atomic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for missing keys, which are checked before anything is written. An unknown key is detected inside the loop, so earlier controls are already updated while the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> is stale. I would not rely on the form state after catching that error.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **FormGroup** | Reactive container of named child controls |
| **setValue()** | Replace every child value; exact shape required |
| **patchValue()** | Update only the matching keys; unknown keys ignored |
| **reset()** | Restore defaults (or null) and clear dirty/touched |
| **getRawValue()** | Full value including disabled controls |
| **Typed forms** | Since v14, controls carry the TypeScript type of their value |
| **nonNullable** | Control option: never null, resets to its initial value |
| **emitEvent** | Option that suppresses <code>valueChanges</code>/<code>statusChanges</code> for one update |

---
**Conclusion:** <code>setValue()</code> is the strict receptionist: it wants a complete object and, as verified on 22.2.3, throws <code>NG01002</code> for a missing key (including disabled ones) and <code>NG01001</code> for an unknown one. <code>patchValue()</code> is the relaxed one: it updates whatever keys it recognises and ignores the rest, even refusing to grow a <code>FormArray</code>. Typed forms move most of these mistakes to compile time, but API data still arrives untyped, so use <code>patchValue</code> for partial data, <code>setValue</code> where drift should fail loudly, and <code>getRawValue()</code> when disabled fields matter.`,
    examples: [
      {
        label: "patchValue, setValue (partial and full) and reset on a typed FormGroup with a disabled control",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="profile">
      <input id="name" formControlName="name" />
      <input id="email" formControlName="email" />
      <input id="plan" formControlName="plan" />
    </form>
    <button id="patch" (click)="patch()">patchValue (name only)</button>
    <button id="set-partial" (click)="setPartial()">setValue (name only)</button>
    <button id="set-full" (click)="setFull()">setValue(all keys)</button>
    <button id="reset" (click)="reset()">reset()</button>
    <p id="out">{{ out() }}</p>
  \`,
})
export class AppComponent {
  profile = new FormGroup({
    name: new FormControl("Ada", { nonNullable: true }),
    email: new FormControl<string | null>("ada@example.com"),
    plan: new FormControl({ value: "pro", disabled: true }, { nonNullable: true }),
  });
  out = signal(this.describe("initial"));

  describe(label: string) {
    return label + ": value=" + JSON.stringify(this.profile.value) + " raw=" + JSON.stringify(this.profile.getRawValue());
  }

  patch() {
    // Partial object: only the keys you pass are touched.
    this.profile.patchValue({ name: "Grace" });
    this.out.set(this.describe("patch"));
  }

  setPartial() {
    try {
      // The type checker rejects this call (email and plan are missing), so we cast to show the runtime check.
      (this.profile as FormGroup).setValue({ name: "Linus" });
    } catch (e) {
      this.out.set("setValue threw: " + (e as Error).message.split(". Find")[0]);
    }
  }

  setFull() {
    // Every key, including the disabled one, must be present.
    this.profile.setValue({ name: "Linus", email: null, plan: "free" });
    this.out.set(this.describe("set"));
  }

  reset() {
    this.profile.reset();
    this.out.set(this.describe("reset"));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you create a custom validator in reactive forms?",
    seoDescription:
      "A custom validator is a ValidatorFn that returns null or an errors object. Factories with config, async validators, PENDING status and showing errors.",
    description: `**Question presented to candidate:**
"Our sign-up form must reject usernames containing banned words, and must check with the server that the name is not already taken. How do you write custom validators for that in reactive forms?"

**What a strong answer should cover:**
- A validator is just a function, \`ValidatorFn = (control: AbstractControl) => ValidationErrors | null\`: **\`null\` means valid**, an object means invalid and its **keys name the errors**.
- Configurable rules are written as a **factory** that takes options and returns the \`ValidatorFn\` (\`forbiddenWords(["spam"])\`), the same shape as \`Validators.minLength(3)\`.
- Put useful detail in the error value (\`{ forbiddenWord: { word: "spam" } }\`) so the template can build a message with \`hasError\` / \`getError\`.
- **Async validators** (\`AsyncValidatorFn\`) return a Promise or Observable; the control is **PENDING** meanwhile, and they only run once all sync validators pass.
- Attach with \`validators\` / \`asyncValidators\` in the options object, or \`addValidators\` later; for template-driven forms wrap the function in a directive provided via \`NG_VALIDATORS\`.
- Know the four statuses: \`VALID\`, \`INVALID\`, \`PENDING\`, \`DISABLED\`.

**Clarifying questions expected:**
- "Should the check run on every keystroke, or only on blur, given that one of them calls the server?"
- "Is the banned-word list static, or does it come from configuration?"

**Code / implementation expected:** Yes — a validator factory and an async validator on one control, with the resulting error objects shown.`,
    answer: `**Target Audience:** Developers comfortable with basic reactive forms who need validation rules Angular does not ship.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The statuses and error objects in sections 5 and 6 were printed by the runnable example (compiled with <code>ngc</code> in strict mode, booted in jsdom and typed into by a driver) and by small scripts run against <code>@angular/forms</code> 22.2.3.

## 1. Why This Even Matters — A Story First

A nightclub door has a bouncer with a clipboard. Every guest gets the same treatment: the bouncer looks at them and either says **nothing** (come in) or writes a **note** on the clipboard: "no trainers", "not on the list". A guest can collect several notes at once. The manager reads the clipboard later and decides what to say to each person.

Some checks need a phone call: "is this person already inside?" While the bouncer is on the phone, the guest waits in a third state, neither in nor out.

That is exactly how an Angular validator works. It returns **nothing** (<code>null</code>) for a valid value, or a **note** (an errors object) explaining what is wrong. The template is the manager reading the notes. And the phone call is an **async validator**, during which the control is <code>PENDING</code>.

## 2. The Core Idea

📌 **Interview term: ValidatorFn** — the type of every sync validator:

\`\`\`ts
type ValidatorFn = (control: AbstractControl) => ValidationErrors | null;
\`\`\`

It receives the control (so it can read <code>control.value</code>, or even <code>control.parent</code>) and returns <code>null</code> when the value is fine.

📌 **Interview term: ValidationErrors** — a plain object, <code>{ [key: string]: any }</code>. Each key is one error; the value is any detail you want the template to have. Angular merges the results of all validators on the control into <code>control.errors</code>.

📌 **Interview term: Validator factory** — a function that takes configuration and **returns** a <code>ValidatorFn</code>. Built-ins work this way: <code>Validators.minLength(3)</code> is a call that returns the real validator. Yours should too, so the rule can be reused with different settings.

📌 **Interview term: AsyncValidatorFn** — a validator that returns <code>Promise&lt;ValidationErrors | null&gt;</code> or an <code>Observable</code> of it. Use it for checks that need the server. (Background on the two return types: [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises).)

## 3. Writing Them

\`\`\`ts
// Sync, configurable: a factory returning the ValidatorFn.
export function forbiddenWords(words: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? "").toLowerCase();
    const hit = words.find((w) => value.includes(w));
    return hit ? { forbiddenWord: { word: hit, actual: control.value } } : null;
  };
}

// Async: resolves later; the control is PENDING until then.
export const usernameAvailable: AsyncValidatorFn = (control) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(taken.includes(control.value) ? { usernameTaken: true } : null), 50)
  );

username = new FormControl("", {
  nonNullable: true,
  validators: [Validators.required, Validators.minLength(3), forbiddenWords(["badword", "spam"])],
  asyncValidators: [usernameAvailable],
});
\`\`\`

In the template, read errors by key: <code>username.hasError("forbiddenWord")</code> and <code>username.getError("forbiddenWord").word</code>. The full component is the runnable example.

## 4. The Validation Pipeline

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="On each value change sync validators run first, async validators only run when every sync validator returns null">
  <defs>
    <marker id="cv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="170" height="56" rx="10"/>
  <text class="d-text" x="125" y="64" text-anchor="middle">value changes</text>
  <text class="d-sub" x="125" y="84" text-anchor="middle">setValue or typing</text>
  <path class="d-edge" d="M 214 68 L 270 68" marker-end="url(#cv-arrow)"/>
  <rect class="d-box-accent" x="276" y="40" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="371" y="64" text-anchor="middle">sync validators</text>
  <text class="d-sub" x="371" y="84" text-anchor="middle">errors merged</text>
  <path class="d-edge-dashed" d="M 371 100 L 371 170" marker-end="url(#cv-arrow)"/>
  <text class="d-sub" x="430" y="140" text-anchor="middle">any error</text>
  <rect class="d-box-muted" x="276" y="176" width="190" height="50" rx="10"/>
  <text class="d-text" x="371" y="206" text-anchor="middle">INVALID</text>
  <path class="d-edge-accent" d="M 470 68 L 520 68" marker-end="url(#cv-arrow)"/>
  <text class="d-sub" x="495" y="40" text-anchor="middle">all null</text>
  <rect class="d-box" x="526" y="40" width="170" height="56" rx="10"/>
  <text class="d-text" x="611" y="64" text-anchor="middle">PENDING</text>
  <text class="d-sub" x="611" y="84" text-anchor="middle">async running</text>
  <path class="d-edge" d="M 611 100 L 611 170" marker-end="url(#cv-arrow)"/>
  <rect class="d-box" x="526" y="176" width="170" height="50" rx="10"/>
  <text class="d-text" x="611" y="206" text-anchor="middle">VALID or INVALID</text>
</svg>

Sync validators are cheap and always run first. If any of them reports an error, Angular stops there and never calls the async validator, which saves a server round trip for a value that is already wrong.

## 5. Verified: Statuses and Error Objects

The driver typed into the runnable example. "control" is read straight from the <code>FormControl</code>; "screen" is what the OnPush template displayed (see [change detection](/interview-question/how-does-change-detection-work-in-angular)), followed by any error message elements. Output from the AOT build, identical in playground mode:

\`\`\`
initial              | control: INVALID {"required":true} | screen: INVALID {"required":true} | -
typed ab             | control: INVALID {"minlength":{"requiredLength":3,"actualLength":2}} | screen: INVALID {"minlength":{"requiredLength":3,"actualLength":2}} | -
typed myspamname     | control: INVALID {"forbiddenWord":{"word":"spam","actual":"myspamname"}} | screen: INVALID {"forbiddenWord":{"word":"spam","actual":"myspamname"}} | "spam" is not allowed
typed admin, same tick | control: PENDING null | screen: INVALID {"forbiddenWord":{"word":"spam","actual":"myspamname"}} | "spam" is not allowed
admin after 90ms     | control: INVALID {"usernameTaken":true} | screen: INVALID {"usernameTaken":true} | That name is taken
ada_l after 90ms     | control: VALID null | screen: VALID null | -
\`\`\`

What this proves:

- **Built-in error shapes** are part of the API you code against: <code>required</code> is <code>true</code>, <code>minlength</code> carries <code>requiredLength</code> and <code>actualLength</code> (note the lower-case key).
- **Your error key is your contract.** The template reads <code>getError("forbiddenWord").word</code>; rename the key and the message disappears silently.
- **PENDING is synchronous.** Immediately after typing "admin", the control is already <code>PENDING</code> with <code>errors</code> <code>null</code>; the screen catches up on the next render.
- **The async result arrives later** and becomes an ordinary error key.

## 6. More Rules, Verified by Script

| Scenario | Result on 22.2.3 |
| :--- | :--- |
| <code>Validators.minLength(3)</code> + async, initial value <code>""</code> | <code>PENDING</code> at creation: empty passes <code>minLength</code>, so the async validator runs |
| Value <code>"ab"</code> | <code>INVALID</code>, async validator **not** called |
| Three <code>setValue</code> calls in a row | Async validator called each time; the earlier pending checks are dropped and only the last result lands |
| Control disabled | Status <code>DISABLED</code>, <code>valid</code> and <code>invalid</code> both <code>false</code>, <code>errors</code> <code>null</code> |
| <code>setErrors({ server: "..." })</code> | <code>INVALID</code> until the next value change, which re-runs validators and clears it |
| <code>hasValidator(Validators.required)</code> | <code>true</code>; works because <code>required</code> is a single shared function |
| <code>hasValidator(Validators.minLength(3))</code> | <code>false</code>: each factory call returns a new function |

The last two rows matter for [dynamic validation](/interview-question/how-do-you-handle-dynamic-validation-where-one-form-field-s-validator-depends-on): to remove a validator later you must keep a reference to the exact function you added.

The "earlier checks are dropped" row matches the source: each validation run unsubscribes from the previous async result before starting a new one, which behaves like <code>switchMap</code> (see [switchMap and friends](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap)). It does **not** debounce: every keystroke still calls your function. To avoid a request per keystroke, debounce inside the validator (for example <code>timer(300).pipe(switchMap(...))</code>) or use [updateOn: blur](/interview-question/what-is-the-purpose-of-updateon-in-reactive-forms).

## 7. The Same Rule for Template-Driven Forms

Template-driven forms have no place to pass a function, so you wrap it in a [directive](/interview-question/what-is-a-directive-and-what-are-the-types) and register it under the <code>NG_VALIDATORS</code> multi-provider token:

\`\`\`ts
@Directive({
  selector: "[noSpaces]",
  providers: [{ provide: NG_VALIDATORS, useExisting: NoSpacesDirective, multi: true }],
})
export class NoSpacesDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return /\\s/.test(control.value ?? "") ? { noSpaces: true } : null;
  }
}
\`\`\`

Verified with <code>&lt;input name="u" [(ngModel)]="u" noSpaces #m="ngModel"&gt;</code>: the initial value "a b" rendered <code>m.errors</code> as <code>{ "noSpaces": true }</code>, and typing "ab" turned it into <code>null</code>. Async validator directives use <code>NG_ASYNC_VALIDATORS</code> the same way. The token pattern is identical to how custom controls register through [NG_VALUE_ACCESSOR](/interview-question/what-is-the-role-of-ng-value-accessor-in-a-custom-component).

## 8. Common Pitfalls

- **Returning something other than <code>null</code> for valid.** Return <code>null</code>. Angular happens to normalise an empty object (verified: a validator returning <code>{}</code> left the control <code>VALID</code> with <code>errors</code> <code>null</code>), but code that returns <code>{}</code> or <code>false</code> reads like a bug and breaks the moment someone adds a key.
- **Throwing on empty values.** Let <code>Validators.required</code> handle emptiness; custom validators should usually return <code>null</code> for an empty value, the way <code>email</code> and <code>minLength</code> do.
- **Expecting the async validator to run when a sync one fails.** It does not; verified above.
- **Hitting the server on every keystroke.** Async validators are not debounced; combine with <code>updateOn: "blur"</code> or debounce inside.
- **Calling a factory twice and expecting the same validator.** <code>Validators.minLength(3) !== Validators.minLength(3)</code>, so <code>removeValidators</code> and <code>hasValidator</code> need the original reference.
- **Returning an async Observable that never completes.** Verified: a <code>Subject</code> (see [Subject vs BehaviorSubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject)) that emitted <code>null</code> but did not complete left the control <code>PENDING</code>; it became <code>VALID</code> only on <code>complete()</code>. Use <code>take(1)</code> or a one-shot HTTP call, never a raw <code>valueChanges</code> stream.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A validator is a function from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbstractControl</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValidationErrors | null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> means valid, and every key in the returned object names an error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Configurable rules:</strong> <span style="color:#f0e2c8;">"I write a factory, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forbiddenWords(list)</code>, that returns the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValidatorFn</code>, exactly the way <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Validators.minLength(3)</code> works."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Useful errors:</strong> <span style="color:#f0e2c8;">"I put detail in the error value, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ forbiddenWord: { word } }</code>, so the template can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getError</code> to build a precise message."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Async checks:</strong> <span style="color:#f0e2c8;">"Server checks are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AsyncValidatorFn</code>s returning a Promise or Observable. The control is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING</code> meanwhile, and they only run once all sync validators pass."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Wiring:</strong> <span style="color:#f0e2c8;">"Pass them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validators</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncValidators</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addValidators</code> later; for template-driven forms wrap the same function in a directive provided via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALIDATORS</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the possible values of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">control.status</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VALID</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INVALID</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISABLED</code>. A disabled control is neither valid nor invalid: both flags are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errors</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a server-side error after submit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">control.setErrors({ server: message })</code>. It stays until the next value change, when validators re-run and replace it, which is usually the behaviour you want.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid a request per keystroke?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateOn: "blur"</code> on that control, or debounce inside the async validator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(300).pipe(switchMap(() =&gt; http...))</code>. Angular itself cancels the previous pending result, but it still calls the validator every time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a validator read another field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">control.parent</code>, but it will not re-run when that other field changes. Cross-field rules belong on the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code>, where the validator sees both values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a custom validator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a pure function: call it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new FormControl("myspamname")</code> and assert the returned object. No component, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ValidatorFn** | <code>(control) =&gt; ValidationErrors \\| null</code> |
| **ValidationErrors** | Object whose keys name the errors on a control |
| **Validator factory** | Function taking config and returning a <code>ValidatorFn</code> |
| **AsyncValidatorFn** | Validator returning a Promise or Observable of errors |
| **PENDING** | Status while an async validator is running |
| **hasError / getError** | Read one error key from a control |
| **NG_VALIDATORS** | Multi-provider token for validator directives in template-driven forms |
| **setErrors** | Set errors manually, for example from a server response |

---
**Conclusion:** Custom validation in reactive forms is just functions. A sync validator returns <code>null</code> or an errors object whose keys become your template contract; a factory makes it configurable; an async validator returns a Promise or Observable and puts the control in <code>PENDING</code>, and, as the 22.2.3 run showed, only runs once every sync rule passes. Keep references to the functions you add so you can remove them later, keep server checks off the keystroke path, and move rules that involve two fields up to the group.`,
    examples: [
      {
        label: "A validator factory plus an async availability check, with status and error objects shown",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";

// 1. A validator FACTORY: takes config, returns the ValidatorFn Angular calls.
export function forbiddenWords(words: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? "").toLowerCase();
    const hit = words.find((w) => value.includes(w));
    // null means valid; an object means invalid, and its key names the error.
    return hit ? { forbiddenWord: { word: hit, actual: control.value } } : null;
  };
}

// 2. An ASYNC validator: returns a Promise (or Observable) of errors or null.
const taken = ["admin", "root"];
export const usernameAvailable: AsyncValidatorFn = (control) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(taken.includes(control.value) ? { usernameTaken: true } : null), 50)
  );

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule],
  template: \`
    <input id="username" [formControl]="username" />
    @if (username.hasError("forbiddenWord")) {
      <p class="msg">"{{ username.getError("forbiddenWord").word }}" is not allowed</p>
    }
    @if (username.hasError("usernameTaken")) {
      <p class="msg">That name is taken</p>
    }
    <p id="status">{{ status() }}</p>
  \`,
})
export class AppComponent {
  username = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), forbiddenWords(["badword", "spam"])],
    asyncValidators: [usernameAvailable],
  });
  status = signal(this.snapshot());

  constructor() {
    // statusChanges fires on every validation run, including PENDING -> VALID/INVALID.
    this.username.statusChanges.subscribe(() => this.status.set(this.snapshot()));
  }

  snapshot() {
    return this.username.status + " " + JSON.stringify(this.username.errors);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle dynamic validation where one form field's validator depends on another field's value?",
    seoDescription:
      "Cross-field rules belong on the parent FormGroup; dependent rules swap validators with addValidators/removeValidators and updateValueAndValidity.",
    description: `**Question presented to candidate:**
"On our registration form, the phone number is required only if the user picks 'contact me by phone', and the confirm-password field must match the password. How do you implement validation where one field's rules depend on another field's value?"

**What a strong answer should cover:**
- Two different problems: a **cross-field rule** (confirm must equal password) and a **conditional rule** (phone required only when contact method is phone).
- Cross-field rules go on the **parent FormGroup** (\`new FormGroup({...}, { validators: matchFields(...) })\`), because the group re-validates whenever any child changes; the error lives on the group (\`form.errors\`).
- A validator on the child that peeks at \`control.parent\` goes **stale**: it does not re-run when the other field changes.
- Conditional rules: subscribe to the driver field's \`valueChanges\` and call \`addValidators\` / \`removeValidators\` (or \`setValidators\`), then **\`updateValueAndValidity()\`**, which is required or the status stays stale.
- Keep a **reference** to the validator function so \`removeValidators\` can find it; \`Validators.minLength(3)\` creates a new function every call.
- Clean up the subscription (\`takeUntilDestroyed\`), and mention the alternative of a group validator that encodes the condition, and Signal Forms' \`validate\` with \`valueOf\` / \`applyWhen\`.

**Clarifying questions expected:**
- "Should the mismatch error be shown on the confirm field, or as a form-level message?"
- "When the phone becomes optional again, should an already typed number be kept or cleared?"

**Code / implementation expected:** Yes — a group-level validator plus a validator swapped in response to another control's value.`,
    answer: `**Target Audience:** Developers who can write a basic [custom validator](/interview-question/how-do-you-create-a-custom-validator-in-reactive-forms) and now need rules that involve more than one field.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The statuses in sections 5 and 6 were printed by running the code on Angular 22.2.3: the runnable example compiled with <code>ngc</code> in strict mode and driven in jsdom, and small scripts against <code>@angular/forms</code> for the stale-validator cases.

## 1. Why This Even Matters — A Story First

A car rental desk has two rules.

Rule one: **"The name on the licence must match the name on the credit card."** No single document can check that; you need to hold both side by side. That check belongs to whoever holds the whole folder, not to either card.

Rule two: **"If you add a second driver, we need their licence number."** The licence-number box is optional until a different box is ticked, and then it becomes mandatory. When the tick is removed, it is optional again.

Forms have exactly these two shapes of dependency, and Angular solves them differently. The first is a **cross-field validator on the group**. The second is **changing a control's validators at runtime** when another value changes. Most bugs in interviews and in production come from mixing the two up.

## 2. The Core Idea

📌 **Interview term: Cross-field validation** — a rule whose result depends on two or more controls. In reactive forms it is a <code>ValidatorFn</code> attached to the **parent** <code>FormGroup</code>; its <code>control</code> argument is the group, so it can read every child.

📌 **Interview term: Conditional (dynamic) validation** — a control whose list of validators changes at runtime, typically in response to another control's <code>valueChanges</code>.

📌 **Interview term: updateValueAndValidity()** — re-runs a control's validators and recalculates its status, then bubbles up to its ancestors. Changing the validator list does **not** do this for you.

📌 **Interview term: addValidators / removeValidators / setValidators** — methods that change a control's sync validators. <code>add</code> and <code>remove</code> work by **function identity**; <code>set</code> replaces the whole list.

## 3. Where Each Rule Lives

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="The match rule sits on the parent group and sees both password fields, the contact choice swaps the validator list of the phone control">
  <defs>
    <marker id="dv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="320" height="60" rx="12"/>
  <text class="d-text d-accent" x="360" y="46" text-anchor="middle">FormGroup</text>
  <text class="d-sub" x="360" y="66" text-anchor="middle">validators: matchFields(password, confirm)</text>
  <path class="d-edge" d="M 260 84 L 110 150" marker-end="url(#dv-arrow)"/>
  <path class="d-edge" d="M 320 84 L 280 150" marker-end="url(#dv-arrow)"/>
  <path class="d-edge" d="M 400 84 L 450 150" marker-end="url(#dv-arrow)"/>
  <path class="d-edge" d="M 460 84 L 620 150" marker-end="url(#dv-arrow)"/>
  <rect class="d-box" x="30" y="156" width="150" height="50" rx="10"/>
  <text class="d-text" x="105" y="186" text-anchor="middle">contactBy</text>
  <rect class="d-box-muted" x="200" y="156" width="150" height="50" rx="10"/>
  <text class="d-text" x="275" y="186" text-anchor="middle">phone</text>
  <rect class="d-box" x="375" y="156" width="150" height="50" rx="10"/>
  <text class="d-text" x="450" y="186" text-anchor="middle">password</text>
  <rect class="d-box" x="545" y="156" width="150" height="50" rx="10"/>
  <text class="d-text" x="620" y="186" text-anchor="middle">confirm</text>
  <path class="d-edge-dashed" d="M 105 210 L 105 262 L 260 262 L 270 214" marker-end="url(#dv-arrow)"/>
  <text class="d-sub" x="190" y="290" text-anchor="middle">valueChanges: add or remove required</text>
</svg>

The solid lines are ownership: the group holds all four controls, so a validator on the group sees all four values and re-runs whenever any of them changes. The dashed line is a subscription: <code>contactBy</code> does not validate anything itself; its value changes tell the code to swap the validators on <code>phone</code>.

## 4. The Code

\`\`\`ts
// Cross-field: a factory returning a GROUP validator.
export const matchFields = (a: string, b: string): ValidatorFn => (group: AbstractControl): ValidationErrors | null => {
  const first = group.get(a)?.value;
  const second = group.get(b)?.value;
  return first && second && first !== second ? { mismatch: { fields: [a, b] } } : null;
};

form = new FormGroup(
  {
    contactBy: new FormControl<"email" | "phone">("email", { nonNullable: true }),
    phone: new FormControl("", { nonNullable: true }),
    password: new FormControl("", { nonNullable: true }),
    confirm: new FormControl("", { nonNullable: true }),
  },
  { validators: matchFields("password", "confirm") }
);

private phoneRequired = Validators.required; // one reference, so removeValidators can find it

constructor() {
  const phone = this.form.controls.phone;
  this.form.controls.contactBy.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((how) => {
    if (how === "phone") phone.addValidators(this.phoneRequired);
    else phone.removeValidators(this.phoneRequired);
    phone.updateValueAndValidity(); // without this, phone keeps its old status
  });
}
\`\`\`

<code>takeUntilDestroyed</code> ends the subscription when the component is destroyed (see [avoiding subscription leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions)).

## 5. Verified: Both Rules in Action

A driver changed the select and typed into the inputs of the runnable example. Each line is the component's own status line. Output from the AOT build, identical in playground mode:

\`\`\`
initial                  | form=VALID groupErrors=null phone=VALID null
contactBy=phone          | form=INVALID groupErrors=null phone=INVALID {"required":true}
phone typed              | form=VALID groupErrors=null phone=VALID null
passwords differ         | form=INVALID groupErrors={"mismatch":{"fields":["password","confirm"]}} phone=VALID null
passwords match          | form=VALID groupErrors=null phone=VALID null
phone cleared            | form=INVALID groupErrors=null phone=INVALID {"required":true}
contactBy=email          | form=VALID groupErrors=null phone=VALID null
\`\`\`

Key observations:

- Choosing "phone" made the empty phone field **immediately** invalid, because the subscription called <code>updateValueAndValidity()</code>.
- The mismatch error lives on the **group** (<code>form.errors</code>), not on <code>confirm</code>. The form is invalid while both children are individually valid.
- Switching back to "email" removed the rule and the empty phone became valid again, with no other code.

The example also uses the unified <code>form.events</code> stream (added in Angular 18) to refresh its status line on any value, status, touched or pristine change.

## 6. Verified: The Two Classic Bugs

From a script run against <code>@angular/forms</code> 22.2.3, in this order:

\`\`\`
addValidators only: VALID
after updateValueAndValidity: INVALID
removed same ref: VALID
minLength added: INVALID
remove NEW minLength(3) ref: INVALID
confirm-level, equal: VALID
password changed -> confirm: VALID (stale)
setValidators replaced required: VALID
group: INVALID {"mismatch":true} child b: VALID null hasError via path: true
\`\`\`

What each line shows:

1. **Forgetting <code>updateValueAndValidity()</code>.** <code>Validators.required</code> was added to an empty control and the status stayed <code>VALID</code>. Adding a validator only changes the list; it does not run it. The next call fixed it.
2. **Removing by a fresh reference.** <code>removeValidators(Validators.minLength(3))</code> removed nothing, because each factory call returns a new function. Keep the instance you added in a field. (<code>Validators.required</code> is a single shared function, which is why removing it by name worked.)
3. **Putting the cross-field rule on the child.** A validator on <code>confirm</code> that reads <code>control.parent.get("password")</code> was correct when created, but after the **password** changed, <code>confirm</code> still reported <code>VALID</code>. Validators only run when their own control changes. On the group, the rule runs whenever any child changes.
4. **<code>setValidators</code> replaces everything.** Setting <code>maxLength(2)</code> silently dropped the existing <code>required</code>. Use <code>addValidators</code> to keep what is there.
5. **Group errors are not child errors.** The group was <code>INVALID</code> with <code>{"mismatch":true}</code> while child <code>b</code> was <code>VALID</code>. Read it with <code>form.hasError("mismatch")</code>.

## 7. Showing a Group Error Next to a Field

Users expect the message under the confirm input, but the error is on the group. Two common approaches:

| Approach | How | Trade-off |
| :--- | :--- | :--- |
| Read the group error in the template | <code>@if (form.hasError("mismatch") &amp;&amp; form.controls.confirm.touched)</code> | Simple; the confirm control itself stays valid |
| Push the error onto the child | In the group validator, also call <code>confirm.setErrors({ mismatch: true })</code> | The field turns red with no template logic, but you must also clear it, and a side effect inside a validator is easy to get wrong |

The first is the recommended default. If you choose the second, remember that any later value change on <code>confirm</code> re-runs its own validators and wipes the manually set error.

## 8. Alternatives Worth Mentioning

- **Encode the condition in a group validator.** Instead of swapping validators, a group validator can say "if <code>contactBy</code> is phone and <code>phone</code> is empty, return <code>{ phoneRequired: true }</code>". No subscription and no cleanup, at the cost of the error living on the group.
- **Disable instead of un-require.** If the phone field should not be submitted at all when not chosen, <code>phone.disable()</code> removes it from <code>form.value</code> and from validation (a disabled control's status is <code>DISABLED</code>).
- **Signal Forms.** In <code>@angular/forms/signals</code> (stable in v22) the same rules are declarative: <code>validate(p.confirm, ({ value, valueOf }) =&gt; ...)</code> reads another field with <code>valueOf</code> and re-runs automatically when either changes, and <code>applyWhen</code> or <code>required(path, { when })</code> handles the conditional case without subscriptions. Verified on 22.2.3: with <code>required(p.phone, { when: ({ valueOf }) =&gt; valueOf(p.contactBy) === "phone" })</code>, the phone field reported <code>valid() true, required() false</code>, and after setting <code>contactBy</code> to "phone" it reported <code>valid() false, required() true</code> with a <code>required</code> error, no subscription involved. See [Signal Forms and ControlValueAccessor](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular).

## 9. Common Pitfalls

- **Cross-field validator on the child control.** Verified stale: it does not re-run when the other field changes. Put it on the group.
- **No <code>updateValueAndValidity()</code> after changing validators.** Verified: the status keeps its old value until the next keystroke.
- **Removing a validator by calling the factory again.** <code>Validators.minLength(3)</code> twice gives two different functions; store the one you add.
- **<code>setValidators</code> when you meant <code>addValidators</code>.** It replaces the list and silently drops existing rules.
- **Leaking the <code>valueChanges</code> subscription.** Use <code>takeUntilDestroyed</code>, or the dependency keeps running after the component is gone.
- **Running the dependency only on change.** <code>valueChanges</code> does not emit the initial value. If the form can start with "phone" selected (for example when editing a saved profile), apply the rule once at start-up too, or pipe through <code>startWith(control.value)</code>.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Split the problem:</strong> <span style="color:#f0e2c8;">"There are two kinds of dependency: a cross-field rule like matching passwords, and a conditional rule like phone required only when phone is chosen."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cross-field:</strong> <span style="color:#f0e2c8;">"Cross-field rules go on the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code>. The group re-validates whenever any child changes, so it never goes stale, and the error lives in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form.errors</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Conditional:</strong> <span style="color:#f0e2c8;">"For conditional rules I subscribe to the driving control's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addValidators</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeValidators</code> on the dependent one, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateValueAndValidity()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gotchas:</strong> <span style="color:#f0e2c8;">"Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateValueAndValidity()</code> the status stays stale, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeValidators</code> needs the same function reference I added; a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Validators.minLength(3)</code> will not match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern option:</strong> <span style="color:#f0e2c8;">"In Signal Forms the same thing is declarative: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueOf</code> reads the other field and re-runs automatically, with no subscriptions to clean up."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just read <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">control.parent</code> inside the confirm validator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a control only re-validates when its own value changes. I verified it: after changing the password, the confirm control still said <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VALID</code>. On the group, the validator runs on every child change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show the mismatch under the confirm input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read the group error in the template, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form.hasError("mismatch")</code> combined with the confirm control being touched. Pushing it onto the child with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setErrors</code> works but is wiped by the next value change and is easy to get wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setValidators</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">addValidators</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValidators</code> replaces the whole list, so existing rules like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> disappear. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addValidators</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeValidators</code> change it incrementally and compare by function identity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the form loads with phone already selected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code> does not emit the initial value, so the rule would not be applied. Run the toggle once at start-up or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startWith(contactBy.value)</code> in the pipe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever disable the field instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the value should not be submitted at all. A disabled control is skipped by validation and left out of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form.value</code>, which also removes the need for a conditional required rule.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cross-field validation** | A rule involving several controls, placed on their parent group |
| **Conditional validation** | Changing a control's validators at runtime based on another value |
| **updateValueAndValidity()** | Re-run validators and recalculate status, bubbling to ancestors |
| **addValidators / removeValidators** | Change the validator list incrementally, by function identity |
| **setValidators** | Replace the whole validator list |
| **Group error** | An error stored on the <code>FormGroup</code>, read with <code>form.hasError(key)</code> |
| **takeUntilDestroyed** | Operator that ends a subscription when the component is destroyed |
| **events** | Unified stream of value, status, touched and pristine changes (v18+) |

---
**Conclusion:** "One field depends on another" is really two problems. A rule that compares fields belongs on the parent <code>FormGroup</code>, where it re-runs on any child change; as the 22.2.3 run showed, the same rule on the child goes stale the moment the other field changes. A rule that switches on and off is done by swapping validators in a <code>valueChanges</code> subscription, always followed by <code>updateValueAndValidity()</code>, with a stored reference so the validator can be removed again. Signal Forms make both declarative, but in reactive forms these two patterns, and their two classic bugs, are what the interviewer is listening for.`,
    examples: [
      {
        label: "Group-level password match plus a phone field that becomes required only when contact method is phone",
        tech: "angular",
        runnable: true,
        code: `import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";

// Cross-field rule: lives on the GROUP, because it needs two children.
export const matchFields = (a: string, b: string): ValidatorFn => (group: AbstractControl): ValidationErrors | null => {
  const first = group.get(a)?.value;
  const second = group.get(b)?.value;
  return first && second && first !== second ? { mismatch: { fields: [a, b] } } : null;
};

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form">
      <select id="contact" formControlName="contactBy">
        <option value="email">email</option>
        <option value="phone">phone</option>
      </select>
      <input id="phone" formControlName="phone" placeholder="phone" />
      <input id="password" formControlName="password" placeholder="password" />
      <input id="confirm" formControlName="confirm" placeholder="confirm" />
    </form>
    <p id="out">{{ out() }}</p>
  \`,
})
export class AppComponent {
  private destroyRef = inject(DestroyRef);
  private phoneRequired = Validators.required; // keep the same reference so removeValidators can find it

  form = new FormGroup(
    {
      contactBy: new FormControl<"email" | "phone">("email", { nonNullable: true }),
      phone: new FormControl("", { nonNullable: true }),
      password: new FormControl("", { nonNullable: true }),
      confirm: new FormControl("", { nonNullable: true }),
    },
    { validators: matchFields("password", "confirm") }
  );
  out = signal("");

  constructor() {
    const phone = this.form.controls.phone;
    // Dependent rule: when contactBy changes, swap the validators on phone.
    this.form.controls.contactBy.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((how) => {
      if (how === "phone") phone.addValidators(this.phoneRequired);
      else phone.removeValidators(this.phoneRequired);
      phone.updateValueAndValidity(); // validators only run on the next value change unless you ask
    });
    this.form.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.snapshot());
    this.snapshot();
  }

  snapshot() {
    const f = this.form;
    this.out.set(
      "form=" + f.status + " groupErrors=" + JSON.stringify(f.errors) + " phone=" + f.controls.phone.status + " " + JSON.stringify(f.controls.phone.errors)
    );
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a FormArray?",
    seoDescription:
      "A FormArray is an ordered, index-based list of form controls for repeating fields. push, insert, removeAt, clear, typed arrays and validating the list.",
    description: `**Question presented to candidate:**
"An event-booking form lets the user add any number of guests, each with a name and a meal choice, and remove them again. What is a FormArray, and how would you build this with it?"

**What a strong answer should cover:**
- A \`FormArray\` is a reactive-forms container that holds an **ordered list of controls addressed by index**, for repeating fields whose count is not known up front.
- Items can be \`FormControl\`s or whole \`FormGroup\`s; the array's \`value\` is an array of their values, and its status aggregates the children (one invalid row makes the array invalid).
- Mutation API: \`push\`, \`insert\`, \`removeAt\` (accepts negative indexes), \`setControl\`, \`clear\`, \`at\`, \`length\`.
- Template wiring: \`formArrayName\` on a wrapper, \`[formGroupName]="i"\` per row, rendered with \`@for\` and a stable \`track\` (the control object).
- **Typed** arrays (\`FormArray<FormGroup<{...}>>\`), plus validating the list itself: \`Validators.required\` means "at least one item", while \`Validators.minLength(1)\` does **not** catch an empty array.
- Contrast with \`FormGroup\` (fixed named keys) and \`FormRecord\` (dynamic string keys).

**Clarifying questions expected:**
- "Is there a minimum or maximum number of guests?"
- "Do rows need stable identity, for example to keep focus or animations when one in the middle is removed?"

**Code / implementation expected:** Yes — a FormArray of FormGroups with add and remove buttons, showing the value after each change.`,
    answer: `**Target Audience:** Developers who know <code>FormGroup</code> and <code>FormControl</code> and now need a form whose number of fields changes at runtime.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The values in sections 5 and 6 were printed on Angular 22.2.3: the runnable example compiled with <code>ngc</code> in strict mode, booted in jsdom and clicked through by a driver, and a script calling every <code>FormArray</code> method directly.

## 1. Why This Even Matters — A Story First

A paper registration form has fixed boxes: name, email, date of birth. Every attendee fills in the same boxes, so the form can be printed in advance.

Now picture a **guest list** at the bottom of a party invitation. One person brings nobody, another brings five. You cannot print a box for each possible guest, so the form has an **"add another guest"** line that you can repeat as often as you need, and a way to cross a line out.

<code>FormGroup</code> is the printed form with named boxes. <code>FormArray</code> is the repeatable guest line: an ordered list that grows and shrinks, where you talk about "guest number 2" rather than "the box called email".

## 2. The Core Idea

📌 **Interview term: FormArray** — a reactive-forms container (it extends <code>AbstractControl</code>, like <code>FormGroup</code>) whose children are stored in an **array** and addressed by **index**. Its <code>value</code> is an array of the children's values; its <code>status</code> is invalid if any child is invalid.

📌 **Interview term: Homogeneous items** — in practice every item has the same shape: all <code>FormControl&lt;string&gt;</code> (a list of tags) or all <code>FormGroup</code>s with the same keys (a list of guests). With typed forms you state that shape once: <code>FormArray&lt;FormGroup&lt;{ name: FormControl&lt;string&gt;; meal: FormControl&lt;string&gt; }&gt;&gt;</code>.

📌 **Interview term: FormRecord** — the other dynamic container: string keys added at runtime with <code>addControl</code>, all values of one type. Use it for "a translation per language", where keys matter and order does not.

| Container | Keys | Grows at runtime | Typical use |
| :--- | :--- | :--- | :--- |
| <code>FormGroup</code> | Fixed names | No (by design) | A profile, an address |
| <code>FormRecord</code> | Dynamic strings | Yes, by key | Settings per locale or per feature flag |
| <code>FormArray</code> | Indexes 0..n-1 | Yes, by position | Guests, phone numbers, line items |

## 3. Shape of the Guest Form

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A form group contains an event control and a guests form array, the array holds one form group per guest addressed by index">
  <defs>
    <marker id="fa-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">FormGroup form</text>
  <path class="d-edge" d="M 300 74 L 150 120" marker-end="url(#fa-arrow)"/>
  <path class="d-edge-accent" d="M 420 74 L 520 120" marker-end="url(#fa-arrow)"/>
  <rect class="d-box-muted" x="40" y="126" width="220" height="50" rx="10"/>
  <text class="d-text" x="150" y="156" text-anchor="middle">event: FormControl</text>
  <rect class="d-box-accent" x="400" y="126" width="240" height="50" rx="10"/>
  <text class="d-text d-accent" x="520" y="156" text-anchor="middle">guests: FormArray</text>
  <path class="d-edge" d="M 460 180 L 330 226" marker-end="url(#fa-arrow)"/>
  <path class="d-edge" d="M 520 180 L 520 226" marker-end="url(#fa-arrow)"/>
  <path class="d-edge" d="M 580 180 L 690 226" marker-end="url(#fa-arrow)"/>
  <rect class="d-box" x="250" y="232" width="150" height="50" rx="10"/>
  <text class="d-sub" x="325" y="262" text-anchor="middle">[0] name, meal</text>
  <rect class="d-box" x="445" y="232" width="150" height="50" rx="10"/>
  <text class="d-sub" x="520" y="262" text-anchor="middle">[1] name, meal</text>
  <rect class="d-box-muted" x="620" y="232" width="90" height="50" rx="10"/>
  <text class="d-sub" x="665" y="262" text-anchor="middle">push</text>
</svg>

The array is just another child of the form, so the whole thing still has one <code>value</code> and one <code>status</code>. Each item is a small <code>FormGroup</code>, and new items are appended with <code>push</code>.

## 4. Building It

\`\`\`ts
type Guest = FormGroup<{ name: FormControl<string>; meal: FormControl<string> }>;

form = new FormGroup({
  event: new FormControl("Launch party", { nonNullable: true }),
  guests: new FormArray<Guest>([this.guest("Ada", "veg")], { validators: Validators.required }),
});

guest(name = "", meal = "standard"): Guest {
  return new FormGroup({
    name: new FormControl(name, { nonNullable: true, validators: Validators.required }),
    meal: new FormControl(meal, { nonNullable: true }),
  });
}

add() { this.form.controls.guests.push(this.guest()); }
remove(i: number) { this.form.controls.guests.removeAt(i); }
\`\`\`

And the template, with the built-in [@for control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir):

\`\`\`html
<div formArrayName="guests">
  @for (guest of guests.controls; track guest; let i = $index) {
    <div [formGroupName]="i">
      <input formControlName="name" />
      <input formControlName="meal" />
      <button type="button" (click)="remove(i)">x</button>
    </div>
  }
</div>
\`\`\`

Three directives cooperate: <code>formArrayName</code> finds the array on the parent <code>[formGroup]</code>, <code>[formGroupName]="i"</code> binds the row to item <code>i</code>, and <code>formControlName</code> binds the inputs inside that row. <code>track guest</code> tracks by the control object itself, so removing row 0 does not re-create the DOM of the rows below it (see [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux)).

## 5. Verified: Add, Edit, Remove

A driver clicked the buttons and typed in the runnable example. Output from the AOT build, identical in playground mode (the trailing number counts rendered rows):

\`\`\`
initial         | length=1 status=VALID value=[{"name":"Ada","meal":"veg"}] arrayErrors=null | rows: 1
add             | length=2 status=INVALID value=[{"name":"Ada","meal":"veg"},{"name":"","meal":"standard"}] arrayErrors=null | rows: 2
typed Grace     | length=2 status=VALID value=[{"name":"Ada","meal":"veg"},{"name":"Grace","meal":"standard"}] arrayErrors=null | rows: 2
add again       | length=3 status=INVALID value=[{"name":"Ada","meal":"veg"},{"name":"Grace","meal":"standard"},{"name":"","meal":"standard"}] arrayErrors=null | rows: 3
remove index 0  | length=2 status=INVALID value=[{"name":"Grace","meal":"standard"},{"name":"","meal":"standard"}] arrayErrors=null | rows: 2
remove all      | length=0 status=INVALID value=[] arrayErrors={"required":true} | rows: 0
\`\`\`

The status of the whole form follows the rows: a new blank guest makes it <code>INVALID</code> because that row's <code>name</code> is required, typing a name fixes it, and removing every guest triggers the array's own <code>required</code> error.

That last line hides a real surprise. The natural first attempt is <code>Validators.minLength(1)</code> on the array, and with it, removing every guest leaves the form **VALID** (checked by swapping the validator in the same example). Angular's length validators deliberately skip "empty" values, and an empty array counts as empty, so <code>minLength(1)</code> never fires on <code>[]</code>. <code>Validators.required</code> treats an empty array as missing, which is what "at least one guest" needs.

## 6. Verified: The FormArray API

A script against <code>@angular/forms</code> 22.2.3, starting from <code>["a","b","c"]</code>:

| Call | Result |
| :--- | :--- |
| <code>insert(1, new FormControl("z"))</code> | <code>["a","z","b","c"]</code> |
| <code>removeAt(0)</code> | <code>["z","b","c"]</code> |
| <code>removeAt(-1)</code> | <code>["z","b"]</code>: negative indexes count from the end |
| <code>setControl(0, new FormControl("Q"))</code> | <code>["Q","b"]</code>: replaces the control, not just its value |
| <code>at(-1).value</code> | <code>"b"</code> |
| <code>clear()</code> | <code>[]</code>, length 0 |
| <code>push(c)</code> then <code>push(c2, { emitEvent: false })</code> | <code>valueChanges</code> fired once; value <code>[1,2,3]</code> |
| A disabled item | Left out of <code>value</code> (<code>["a"]</code>), kept in <code>getRawValue()</code> (<code>["a","b"]</code>) |
| <code>[]</code> with <code>Validators.minLength(1)</code> | <code>VALID</code>, <code>errors</code> <code>null</code> |
| <code>[]</code> with <code>Validators.required</code> | <code>INVALID</code>, <code>{"required":true}</code> |
| One item with <code>Validators.minLength(2)</code> | <code>INVALID</code>, <code>{"minlength":{"requiredLength":2,"actualLength":1}}</code> |

So <code>minLength(n)</code> works for "at least n" when the array is non-empty; pair it with <code>required</code> to cover zero.

## 7. Values In and Out

- **Filling from an API.** <code>patchValue</code> and <code>setValue</code> never add or remove items: on a two-item array <code>patchValue([7,8,9])</code> gave <code>[7,8]</code>. Build the right number of controls first (<code>clear()</code> then <code>push</code> per item), then set values. More in [patchValue vs setValue](/interview-question/explain-the-difference-between-formgroup-patchvalue-and-formgroup-setvalue).
- **<code>FormBuilder</code> shorthand.** <code>fb.array(["x", "y"])</code> creates an array of two controls with value <code>["x","y"]</code>.
- **Custom array validators.** Any <code>ValidatorFn</code> works on the array, for example "no duplicate names" by reading <code>array.value</code>. See [custom validators](/interview-question/how-do-you-create-a-custom-validator-in-reactive-forms).

## 8. Common Pitfalls

- **Using <code>Validators.minLength(1)</code> for "at least one".** Verified: it passes on an empty array. Use <code>Validators.required</code>.
- **Tracking rows by <code>$index</code>.** Verified with two rows: after removing row 0, <code>track $index</code> kept the **old row 0 DOM node** and re-bound it to Grace, while <code>track guest</code> kept **Grace's own node** and destroyed Ada's. With index tracking, focus, animations and child component state end up on the wrong row. Track by the control object.
- **Expecting <code>patchValue</code> to resize.** It only writes to existing items; extra values are ignored.
- **Forgetting <code>formArrayName</code>.** <code>[formGroupName]="i"</code> resolves the index against its nearest container. Without the array wrapper it looks on the form itself; verified, Angular logs <code>Cannot find control with name: '0'</code>.
- **Typing items as <code>any</code>.** Without the item type, <code>guests.at(0).controls.name</code> loses type checking; declare the item type once and reuse it.
- **Mixing shapes in one array.** It works at runtime, but templates and types become guesswork. If items differ, use a <code>FormGroup</code> or <code>FormRecord</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray</code> is a reactive-forms container that holds an ordered, index-based list of controls, for fields that repeat a number of times you only know at runtime."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it holds:</strong> <span style="color:#f0e2c8;">"Each item is usually a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> of the same shape, like one per guest. The array value is the list of item values and one invalid item makes the array invalid."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The API:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeAt</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setControl</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clear</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at</code>; in the template <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formArrayName</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formGroupName]=i</code> per row inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> tracked by the control."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Validation detail:</strong> <span style="color:#f0e2c8;">"To require at least one item I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Validators.required</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minLength(1)</code> skips empty values, so it does not fire on an empty array. I verified that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Compare:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code> has fixed named keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormRecord</code> has dynamic string keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray</code> has positions. Pick by whether names or order matter."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you load an array from an API response?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Clear the array and push one control per item, then set values. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchValue</code> never change the number of items: patching three values into a two-item array keeps two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you validate across items, for example no duplicate names?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValidatorFn</code> on the array itself. It receives the array, reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array.value</code>, and returns something like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ duplicate: "Ada" }</code>. It re-runs whenever any item changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why track by the control instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$index</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Removing a row shifts every index after it. Tracking by index makes Angular reuse DOM for a different control, which moves focus and local state; tracking by the control object keeps each row's DOM attached to its own data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">FormArray</code> typed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, since v14. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormArray&lt;FormGroup&lt;{ name: FormControl&lt;string&gt; }&gt;&gt;</code> gives typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at(i).controls</code> and a typed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>. Declare the item type once and use it for the factory function too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes in Signal Forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no separate array class. The model is a signal holding a plain array, the field tree mirrors it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyEach</code> attaches rules to every item; adding a guest is just updating the array in the model signal.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **FormArray** | Ordered list of controls addressed by index |
| **FormRecord** | Container with dynamic string keys of one value type |
| **formArrayName** | Directive that binds a template block to a <code>FormArray</code> |
| **formGroupName** | Directive that binds a block to one group, here an array item by index |
| **push / insert / removeAt** | Add at the end, add at an index, remove at an index |
| **setControl** | Replace the control at an index |
| **getRawValue()** | Value including disabled items |
| **track** | The identity <code>@for</code> uses to match rows to DOM nodes |

---
**Conclusion:** A <code>FormArray</code> is the reactive-forms answer to "a repeatable section": an ordered list of controls, usually one <code>FormGroup</code> per row, whose value and status roll up into the parent form. You change it with <code>push</code>, <code>insert</code> and <code>removeAt</code>, bind it with <code>formArrayName</code> plus <code>[formGroupName]="i"</code> inside a tracked <code>@for</code>, and you size it yourself because <code>patchValue</code> will not. And, as the 22.2.3 run caught, "at least one item" is <code>Validators.required</code>, not <code>minLength(1)</code>.`,
    examples: [
      {
        label: "A guest list built with a typed FormArray of FormGroups: add, edit and remove rows",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

type Guest = FormGroup<{ name: FormControl<string>; meal: FormControl<string> }>;

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form">
      <div formArrayName="guests">
        @for (guest of guests.controls; track guest; let i = $index) {
          <div class="row" [formGroupName]="i">
            <input class="name" formControlName="name" placeholder="name" />
            <input class="meal" formControlName="meal" placeholder="meal" />
            <button type="button" class="remove" (click)="remove(i)">x</button>
          </div>
        }
      </div>
      <button type="button" id="add" (click)="add()">Add guest</button>
    </form>
    <p id="out">{{ out() }}</p>
  \`,
})
export class AppComponent {
  form = new FormGroup({
    event: new FormControl("Launch party", { nonNullable: true }),
    // A FormArray holds an ordered list of controls: here, one FormGroup per guest.
    // Validators.required on an array means "at least one item" (minLength(1) would NOT catch an empty array).
    guests: new FormArray<Guest>([this.guest("Ada", "veg")], { validators: Validators.required }),
  });
  out = signal("");

  constructor() {
    this.form.valueChanges.subscribe(() => this.snapshot());
    this.snapshot();
  }

  get guests() {
    return this.form.controls.guests;
  }

  guest(name = "", meal = "standard"): Guest {
    return new FormGroup({
      name: new FormControl(name, { nonNullable: true, validators: Validators.required }),
      meal: new FormControl(meal, { nonNullable: true }),
    });
  }

  add() {
    this.guests.push(this.guest());
  }

  remove(i: number) {
    this.guests.removeAt(i);
  }

  snapshot() {
    this.out.set("length=" + this.guests.length + " status=" + this.form.status + " value=" + JSON.stringify(this.form.value.guests) + " arrayErrors=" + JSON.stringify(this.guests.errors));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of updateOn in Reactive Forms?",
    seoDescription:
      "updateOn controls when a form control writes the view value to the model and runs validators: on every change (default), on blur, or on submit.",
    description: `**Question presented to candidate:**
"Our username field calls the server on every keystroke to check availability, and a large search form recomputes results while people are still typing. What is updateOn in reactive forms, and how would it help here?"

**What a strong answer should cover:**
- \`updateOn\` decides **when the view value is written to the model**: \`'change'\` (default, every input event), \`'blur'\` (when the control loses focus) or \`'submit'\` (when the parent form is submitted).
- Writing to the model is what triggers **validators** (including async ones), \`valueChanges\` and the dirty flag, so delaying the write delays all of them.
- Set it per control in the options object, or once on a \`FormGroup\` / \`FormArray\`, where children **inherit** it and can override.
- Programmatic \`setValue\` / \`patchValue\` ignore \`updateOn\`; it only governs values coming from the UI.
- Template-driven equivalents: \`[ngModelOptions]="{ updateOn: 'blur' }"\` per field, \`[ngFormOptions]\` for the whole form.
- Trade-offs: \`blur\` hides errors until focus leaves; \`submit\` gives no live feedback, and with \`submit\` the control is never marked touched by blur.

**Clarifying questions expected:**
- "Do users need live feedback while typing, for example a password-strength meter?"
- "Is the cost the validation itself, or something subscribed to valueChanges?"

**Code / implementation expected:** Yes — three controls with different updateOn values, showing when each value and its validation change.`,
    answer: `**Target Audience:** Developers using reactive forms who want to control how often validation and <code>valueChanges</code> run.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The timings in section 5 were produced by compiling the example with <code>ngc</code> on Angular 22.2.3, booting it in jsdom, and firing <code>input</code>, <code>blur</code> and <code>submit</code> events from a driver, then reading each control.

## 1. Why This Even Matters — A Story First

Three restaurants take orders differently.

At the first, the waiter writes down **every word as you say it**: "I'll have the... no, the... actually the fish". The kitchen sees every change and starts cooking three dishes.

At the second, the waiter waits until you **put the menu down**, then writes the order once.

At the third, the waiter writes nothing until **the whole table says "we're ready"**, then takes everybody's order in one go.

Same food, same kitchen; what changes is **when the order reaches the kitchen**. In reactive forms the kitchen is the model, the validators and everything subscribed to <code>valueChanges</code>. <code>updateOn</code> picks which waiter you hire.

## 2. The Core Idea

📌 **Interview term: View value vs model value** — what is in the input element is the view value; what <code>control.value</code> holds is the model value. Normally they are synced on every keystroke by the control's value accessor (see [ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-)).

📌 **Interview term: updateOn** — an option on any <code>AbstractControl</code> that decides when the view value is written into the model. Three values:

| Value | Model updated when | Typical use |
| :--- | :--- | :--- |
| <code>'change'</code> (default) | Every <code>input</code> event | Live feedback, small forms |
| <code>'blur'</code> | The element loses focus | Expensive or server-side validation, "validate after the user leaves the field" UX |
| <code>'submit'</code> | The parent <code>form</code> is submitted | Long forms where nothing should happen until submit |

📌 **Interview term: Pending value** — while a <code>blur</code> or <code>submit</code> control waits, Angular keeps the typed text as a pending value inside the control. It is not visible in <code>value</code>, does not run validators and does not emit <code>valueChanges</code> until the trigger fires.

Everything downstream of the model moves with it: sync and [async validators](/interview-question/how-do-you-create-a-custom-validator-in-reactive-forms), <code>status</code>, <code>valueChanges</code> and the <code>dirty</code> flag.

## 3. When the Model Hears About Typing

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Typing reaches the model on every input with updateOn change, on blur with updateOn blur, and only on form submit with updateOn submit">
  <defs>
    <marker id="uo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="120" width="150" height="56" rx="10"/>
  <text class="d-text" x="105" y="144" text-anchor="middle">user types</text>
  <text class="d-sub" x="105" y="164" text-anchor="middle">input event</text>
  <path class="d-edge-accent" d="M 184 136 L 300 60" marker-end="url(#uo-arrow)"/>
  <path class="d-edge" d="M 184 148 L 300 148" marker-end="url(#uo-arrow)"/>
  <path class="d-edge" d="M 184 160 L 300 236" marker-end="url(#uo-arrow)"/>
  <rect class="d-box-accent" x="306" y="34" width="170" height="50" rx="10"/>
  <text class="d-text d-accent" x="391" y="64" text-anchor="middle">change: write now</text>
  <rect class="d-box-muted" x="306" y="122" width="170" height="50" rx="10"/>
  <text class="d-text" x="391" y="152" text-anchor="middle">blur: hold</text>
  <rect class="d-box-muted" x="306" y="210" width="170" height="50" rx="10"/>
  <text class="d-text" x="391" y="240" text-anchor="middle">submit: hold</text>
  <path class="d-edge-accent" d="M 480 59 L 546 120" marker-end="url(#uo-arrow)"/>
  <path class="d-edge-dashed" d="M 480 147 L 546 147" marker-end="url(#uo-arrow)"/>
  <text class="d-sub" x="513" y="136" text-anchor="middle">blur</text>
  <path class="d-edge-dashed" d="M 480 235 L 546 174" marker-end="url(#uo-arrow)"/>
  <text class="d-sub" x="500" y="222" text-anchor="middle">submit</text>
  <rect class="d-box" x="552" y="118" width="150" height="58" rx="10"/>
  <text class="d-text" x="627" y="142" text-anchor="middle">model value</text>
  <text class="d-sub" x="627" y="162" text-anchor="middle">validators run</text>
</svg>

All three controls receive the same input events. Only the top path writes immediately; the other two hold the text as a pending value and write it when their trigger (blur, or the form submit) arrives.

## 4. Configuring It

\`\`\`ts
form = new FormGroup({
  onChange: new FormControl("", { nonNullable: true, validators: Validators.minLength(3) }),
  onBlur: new FormControl("", { nonNullable: true, validators: Validators.minLength(3), updateOn: "blur" }),
  onSubmit: new FormControl("", { nonNullable: true, validators: Validators.minLength(3), updateOn: "submit" }),
});
\`\`\`

Or set a default for a whole group and override where needed. Verified by script: with <code>new FormGroup({ a, b: new FormControl("", { updateOn: "change" }) }, { updateOn: "blur" })</code>, <code>a.updateOn</code> was <code>"blur"</code> (inherited) and <code>b.updateOn</code> was <code>"change"</code> (its own).

Template-driven forms use the same mechanism through options inputs:

\`\`\`html
<form [ngFormOptions]="{ updateOn: 'submit' }">
  <input name="a" [(ngModel)]="a" [ngModelOptions]="{ updateOn: 'blur' }" />
  <input name="b" [(ngModel)]="b" />
</form>
\`\`\`

Verified: after typing "hi" in both inputs, <code>a</code> and <code>b</code> were still <code>""</code>; after blur, <code>a</code> was "hi" and <code>b</code> still <code>""</code>; after submit, both were "hi". So the form-level default applied to <code>b</code> and the field-level option won for <code>a</code>.

## 5. Verified: Three Controls, One Driver

The driver typed "ab" into all three inputs, blurred only the middle one, typed "abc" into the last one, then submitted. Output from the AOT build, identical in playground mode:

\`\`\`
initial            | onChange=""(VALID, events 0) onBlur=""(VALID, events 0) onSubmit=""(VALID, events 0)
typed ab in all 3  | onChange="ab"(INVALID, events 1) onBlur=""(VALID, events 0) onSubmit=""(VALID, events 0)
blur #blur         | onChange="ab"(INVALID, events 1) onBlur="ab"(INVALID, events 1) onSubmit=""(VALID, events 0)
typed abc #submit  | onChange="ab"(INVALID, events 1) onBlur="ab"(INVALID, events 1) onSubmit=""(VALID, events 0)
submit             | onChange="ab"(INVALID, events 1) onBlur="ab"(INVALID, events 1) onSubmit="abc"(VALID, events 1)
dirty/touched after submit: onChange dirty=true touched=false, onBlur dirty=true touched=true, onSubmit dirty=true touched=false | ngSubmit count: 1
\`\`\`

Reading it:

- **change**: value, validation (<code>INVALID</code> for "ab") and one <code>valueChanges</code> event happened on the input event itself.
- **blur**: after typing, the model still said <code>""</code> and <code>VALID</code>. The blur wrote "ab", ran <code>minLength</code> and emitted once.
- **submit**: two rounds of typing produced **zero** events. The submit wrote only the final "abc" and emitted **once**. That is the whole point: one validation and one emission per submit, however much the user typed.
- **touched**: the <code>submit</code> control stayed <code>touched=false</code> even after the form was submitted. Its touched state follows the same "wait for submit" rule as its value, and the blur that would normally mark it touched is ignored. If your error messages are gated on <code>touched</code>, they will never appear for these fields; gate them on the form's <code>submitted</code> flag instead.

A second driver confirmed the dirty flag waits too: after typing "xyz" into the blur and submit fields, both reported <code>dirty false</code>; after blurring, the blur control was <code>dirty true, touched true</code>, while the submit control was still <code>dirty false, touched false</code> with value <code>""</code>.

## 6. Things It Does Not Do

- **It does not affect code.** Verified: <code>setValue("prog")</code> on an <code>updateOn: "submit"</code> control updated the value immediately. <code>updateOn</code> only governs values coming from the view.
- **It does not debounce.** <code>blur</code> and <code>submit</code> are events, not timers. For "validate 300 ms after the user stops typing", keep <code>change</code> and debounce in the subscriber or in the async validator (see [switchMap and friends](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap)).
- **A submit does not flush a pending blur value.** Verified: typing into the blur-mode field and dispatching <code>submit</code> with no blur left its value <code>""</code>. In a browser, clicking a submit button normally moves focus and fires blur first, but a submit that happens without a blur (such as implicit submission with Enter, which in browsers usually keeps focus in the field) will miss the last edit. jsdom does not model real browser focus, so test this in a real browser for your form.

## 7. Choosing a Mode

| Problem | Good fit | Why |
| :--- | :--- | :--- |
| Async "is the username taken?" check per keystroke | <code>'blur'</code> on that control | One request when the user leaves the field |
| Error message flashes while typing an email | <code>'blur'</code> | Errors appear after the user finishes the field |
| Large form driving an expensive preview from <code>valueChanges</code> | <code>'submit'</code> on the group, or debounce | One recalculation per submit |
| Password strength meter, character counter | <code>'change'</code> | Needs every keystroke |
| Search-as-you-type | <code>'change'</code> plus debounce | Live, but throttled |

## 8. Common Pitfalls

- **Gating errors on <code>touched</code> with <code>updateOn: 'submit'</code>.** Verified: the control stays untouched; show errors based on the form being submitted.
- **Expecting <code>setValue</code> to wait.** Programmatic writes are immediate in every mode.
- **Losing the last edit on Enter with <code>'blur'</code>.** A submit without a blur does not flush the pending value; use <code>'submit'</code> for the whole form instead, or make sure the field loses focus before submitting.
- **Using <code>'blur'</code> as a debounce.** It changes UX, not frequency of typing; real debouncing needs a timer.
- **Forgetting inheritance.** A group-level <code>updateOn</code> silently applies to every child, including ones added later (verified: a control added with <code>addControl</code> to a <code>blur</code> group reported <code>blur</code>, one pushed into a <code>submit</code> array reported <code>submit</code>), unless they set their own.
- **Assuming it exists in Signal Forms with the same name.** Signal Forms express this with the <code>debounce(path, ms)</code> or <code>debounce(path, 'blur')</code> rule instead (see [Signal Forms](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular)).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateOn</code> decides when a control writes the view value into the model: on every change by default, on blur, or on form submit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it matters:</strong> <span style="color:#f0e2c8;">"Writing the model is what runs validators, updates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code>, sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dirty</code> and emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code>, so delaying the write delays all of them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where to set it:</strong> <span style="color:#f0e2c8;">"Per control in the options object, or once on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormGroup</code>, where children inherit it and can override. Template-driven forms use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModelOptions</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngFormOptions</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What I verified:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code>, two rounds of typing produced zero events and the submit emitted once with the final value; the control also stayed untouched, so error messages must key off submission."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My choice for the scenario:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">blur</code> on the username so the availability check runs once per field visit; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> or a debounce for the big search form."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updateOn</code> affect <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setValue()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Programmatic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchValue</code> write immediately in every mode; I checked it on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> control. The option only controls values coming from the UI through the value accessor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updateOn: 'blur'</code> a debounce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is event-based. If the user never leaves the field, nothing updates. For time-based throttling, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">change</code> and debounce the subscriber or the async validator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might errors never show with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updateOn: 'submit'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because touched also waits for submit and is not set by blur in that mode. If the template shows errors only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touched</code>, they stay hidden; use the form's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submitted</code> state instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a custom control interact with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updateOn</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The control just calls its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onTouched</code> callbacks as usual. Angular decides whether to apply the value immediately or keep it pending, so a ControlValueAccessor works in all three modes without changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one group mix modes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Set a default on the group and override on individual controls; a child with its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateOn</code> keeps it.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **updateOn** | When the view value is written to the model: change, blur or submit |
| **View value** | What is currently in the input element |
| **Model value** | What <code>control.value</code> holds |
| **Pending value** | Typed text a blur or submit control is holding back |
| **ngModelOptions / ngFormOptions** | Template-driven inputs for the same setting, per field or per form |
| **dirty / touched** | Changed by the user / focused and left; both follow the update mode |
| **Debounce** | Time-based delay; not what <code>updateOn</code> does |

---
**Conclusion:** <code>updateOn</code> is a timing switch for the moment UI input becomes model state. Because validators, status, dirty and <code>valueChanges</code> all hang off that moment, moving it from every keystroke to blur or submit cuts work dramatically: on 22.2.3 the submit-mode control emitted once with the final value after two rounds of typing. The costs are equally real and also verified: no live feedback, a touched flag that waits for submit, and a pending blur value that a submit without blur does not flush. Use <code>blur</code> for expensive per-field checks, <code>submit</code> for big forms, and real debouncing when you need time-based throttling.`,
    examples: [
      {
        label: "Three controls with updateOn change, blur and submit, counting valueChanges for each",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form" (ngSubmit)="submitted.set(submitted() + 1)">
      <input id="change" formControlName="onChange" />
      <input id="blur" formControlName="onBlur" />
      <input id="submit" formControlName="onSubmit" />
      <button id="go" type="submit">Submit</button>
    </form>
    <p id="out">{{ out() }}</p>
  \`,
})
export class AppComponent {
  form = new FormGroup({
    // default: the model updates (and validators run) on every input event
    onChange: new FormControl("", { nonNullable: true, validators: Validators.minLength(3) }),
    // only when the input loses focus
    onBlur: new FormControl("", { nonNullable: true, validators: Validators.minLength(3), updateOn: "blur" }),
    // only when the parent form is submitted
    onSubmit: new FormControl("", { nonNullable: true, validators: Validators.minLength(3), updateOn: "submit" }),
  });
  events = { onChange: 0, onBlur: 0, onSubmit: 0 };
  submitted = signal(0);
  out = signal("");

  constructor() {
    for (const key of ["onChange", "onBlur", "onSubmit"] as const) {
      this.form.controls[key].valueChanges.subscribe(() => {
        this.events[key]++;
        this.snapshot();
      });
    }
    this.snapshot();
  }

  snapshot() {
    const c = this.form.controls;
    const show = (k: "onChange" | "onBlur" | "onSubmit") => k + "=" + JSON.stringify(c[k].value) + "(" + c[k].status + ", events " + this.events[k] + ")";
    this.out.set([show("onChange"), show("onBlur"), show("onSubmit")].join(" "));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you build a custom form control by implementing the ControlValueAccessor interface?",
    seoDescription:
      "Build a custom Angular form control: implement writeValue, registerOnChange, registerOnTouched and setDisabledState, then register it. Call order verified.",
    description: `**Question presented to candidate:**
"Design wants a five-star rating widget that behaves like a normal input inside our reactive forms: it should take a value from the FormControl, report changes, mark the control touched, and respect disable(). How do you build it with ControlValueAccessor?"

**What a strong answer should cover:**
- \`ControlValueAccessor\` (CVA) is the **adapter interface** between a forms directive (\`formControl\`, \`formControlName\`, \`ngModel\`) and any UI element.
- The four methods and their direction: \`writeValue\` (model to view), \`registerOnChange\` and \`registerOnTouched\` (store callbacks for view to model), optional \`setDisabledState\`.
- Register it with \`{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }\`.
- Call the stored \`onChange\` only for **user** changes, never inside \`writeValue\`; call \`onTouched\` on blur.
- Know the **call order**: reactive directives call \`writeValue\` first, then \`setDisabledState\` (always, since v15's default), then the register methods; \`ngModel\` first writes \`null\`, then the real value a tick later.
- Handle \`null\` (from \`reset()\`), and keep internal state in signals so the OnPush view updates. Bonus: Angular 22 can also drive a CVA-free \`model()\`-based control.

**Clarifying questions expected:**
- "Should the widget support keyboard input and be focusable for accessibility?"
- "What should the value be when the form is reset: 0 or null?"

**Code / implementation expected:** Yes — a working CVA component used with a FormControl, ideally logging when each method is called.`,
    answer: `**Target Audience:** Developers comfortable with reactive forms who need a custom widget to act like a native input.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The call orders in sections 5 and 6 were logged by the components themselves on Angular 22.2.3, compiled with <code>ngc</code> in strict mode and booted in jsdom; the runnable example printed the same lines in playground mode.

## 1. Why This Even Matters — A Story First

A travel adapter lets a British plug go into an Italian socket. The socket does not know or care what is plugged in; it only needs pins in the right places. The plug does not know which country it is in; it only needs something to hold its prongs.

Angular forms work the same way. The form directives (<code>formControl</code>, <code>formControlName</code>, <code>ngModel</code>) are the socket. Your star rating is a plug with a very unusual shape: five buttons, no <code>value</code> property, no <code>input</code> event. <code>ControlValueAccessor</code> is the adapter: four small methods that let the socket push a value in, and let the widget push changes back out.

Every built-in input already has such an adapter (<code>DefaultValueAccessor</code> for text inputs, <code>CheckboxControlValueAccessor</code>, <code>SelectControlValueAccessor</code>...). Writing one yourself makes your component a first-class form control.

## 2. The Interface

📌 **Interview term: ControlValueAccessor (CVA)** — an interface in <code>@angular/forms</code> with four methods:

| Method | Direction | What you do in it |
| :--- | :--- | :--- |
| <code>writeValue(value)</code> | Model to view | Show the value. **Do not** call <code>onChange</code> here |
| <code>registerOnChange(fn)</code> | View to model | Store <code>fn</code>; call it when the **user** changes the value |
| <code>registerOnTouched(fn)</code> | View to model | Store <code>fn</code>; call it when the user leaves the control (blur) |
| <code>setDisabledState(isDisabled)</code> (optional) | Model to view | Disable your buttons or inputs |

📌 **Interview term: NG_VALUE_ACCESSOR** — the [injection token](/interview-question/what-is-an-injectiontoken) the forms directives inject to find your adapter. It is a **multi** provider, and you point it at your own component with <code>useExisting</code>. Its role is covered in depth in [What is the role of NG_VALUE_ACCESSOR](/interview-question/what-is-the-role-of-ng-value-accessor-in-a-custom-component); here we focus on implementing the four methods.

## 3. The Two Directions

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="The form control pushes values into the component through writeValue and setDisabledState, the component calls the registered onChange and onTouched callbacks to report user actions">
  <defs>
    <marker id="cva-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="100" width="190" height="80" rx="12"/>
  <text class="d-text" x="125" y="134" text-anchor="middle">FormControl</text>
  <text class="d-sub" x="125" y="156" text-anchor="middle">value, status, flags</text>
  <rect class="d-box-accent" x="500" y="100" width="190" height="80" rx="12"/>
  <text class="d-text d-accent" x="595" y="134" text-anchor="middle">StarRating</text>
  <text class="d-sub" x="595" y="156" text-anchor="middle">implements CVA</text>
  <path class="d-edge-accent" d="M 224 112 L 494 112" marker-end="url(#cva-arrow)"/>
  <text class="d-sub" x="360" y="70" text-anchor="middle">writeValue(v)</text>
  <text class="d-sub" x="360" y="92" text-anchor="middle">setDisabledState(b)</text>
  <path class="d-edge" d="M 494 168 L 224 168" marker-end="url(#cva-arrow)"/>
  <text class="d-sub" x="360" y="208" text-anchor="middle">onChange(v) on click</text>
  <text class="d-sub" x="360" y="230" text-anchor="middle">onTouched() on blur</text>
</svg>

The top arrow is Angular talking to your component; the bottom arrow is your component talking back, but only through the callbacks Angular handed over earlier via <code>registerOnChange</code> and <code>registerOnTouched</code>. Your component never imports or touches the <code>FormControl</code> directly, which is what makes it reusable with <code>formControl</code>, <code>formControlName</code> and <code>ngModel</code> alike.

## 4. The Implementation

\`\`\`ts
@Component({
  selector: "star-rating",
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }],
  template: \`
    @for (star of stars; track star) {
      <button type="button" class="star" [disabled]="disabled()" (click)="pick(star)" (blur)="onTouched()">
        {{ star <= value() ? "★" : "☆" }}
      </button>
    }
  \`,
})
export class StarRating implements ControlValueAccessor {
  stars = [1, 2, 3, 4, 5];
  value = signal(0);
  disabled = signal(false);
  private onChange: (value: number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: number | null): void { this.value.set(value ?? 0); }
  registerOnChange(fn: (value: number) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  pick(star: number) {
    this.value.set(star);   // update the view
    this.onChange(star);    // tell the form
  }
}
\`\`\`

Used like any input: <code>&lt;star-rating [formControl]="rating" /&gt;</code>. The full runnable version adds a <code>console.log</code> to each method.

Three details make it correct in Angular 22:

- **State is in [signals](/interview-question/what-are-angular-signals).** Components are OnPush by default in v22 (see [change detection](/interview-question/how-does-change-detection-work-in-angular)), and <code>writeValue</code> is called by the forms directive, not by a template event. Writing a signal schedules the re-render; a plain field would not.
- **No-op defaults for the callbacks.** A click before registration (or after destroy) must not crash.
- **<code>null</code> handling.** <code>reset()</code> on a nullable control calls <code>writeValue(null)</code>; <code>value ?? 0</code> turns that into zero stars.

## 5. Verified: Who Calls What, and When

The driver clicked star 5, blurred, called <code>setValue(2)</code> and <code>disable()</code>. Lines starting with <code>--</code> are the driver's snapshots; the others are the CVA's own logs. AOT build output, identical in playground mode:

\`\`\`
writeValue(3)
setDisabledState(false)
registerOnChange
registerOnTouched
-- initial          | stars: ★★★☆☆ | value=3 | control: 3 VALID dirty=false touched=false
-- click star 5     | stars: ★★★★★ | value=5 | control: 5 VALID dirty=true touched=false
-- blur             | stars: ★★★★★ | value=5 | control: 5 VALID dirty=true touched=true
writeValue(2)
-- setValue(2)      | stars: ★★☆☆☆ | value=2 | control: 2 VALID dirty=true touched=true
setDisabledState(true)
-- disable()        | stars: ★★☆☆☆ | value=2 | control: 2 DISABLED dirty=true touched=true
star disabled attr: true
registerOnChange
registerOnTouched
\`\`\`

What it proves:

1. **Set-up order for reactive directives is <code>writeValue</code>, <code>setDisabledState</code>, <code>registerOnChange</code>, <code>registerOnTouched</code>.** The value arrives **before** you have an <code>onChange</code> to call, which is one more reason never to call it from <code>writeValue</code>.
2. **<code>setDisabledState(false)</code> is called even for an enabled control.** That is the <code>'always'</code> default of <code>callSetDisabledState</code> (the 22.2.3 source sets <code>setDisabledStateDefault = 'always'</code>); the legacy behaviour, only calling it when disabled, is opt-in via <code>FormsModule.withConfig({ callSetDisabledState: 'whenDisabledForLegacyCode' })</code>.
3. **A click makes the control dirty but not touched.** Touched comes only from your <code>onTouched()</code> call on blur.
4. **<code>setValue(2)</code> calls <code>writeValue(2)</code>** and does not echo back through <code>onChange</code>.
5. **On destroy, Angular calls <code>registerOnChange</code> and <code>registerOnTouched</code> again** (the last two lines), with no-op functions, so a stray late call from your widget cannot reach a control that is gone.

## 6. Verified: <code>ngModel</code> Calls It Differently

The same kind of logging CVA, bound with <code>[(ngModel)]="v"</code> where <code>v = 7</code>:

\`\`\`
writeValue(null)
setDisabledState(false)
registerOnChange
registerOnTouched
writeValue(7)
\`\`\`

<code>NgModel</code> sets up its control first with a <code>null</code> value, and writes the real value in a later microtask (the same asynchronous registration that makes [template-driven forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms) lag a tick). A CVA that treats the first <code>writeValue</code> as "the initial value", or that throws on <code>null</code>, breaks under <code>ngModel</code> while working fine with <code>formControl</code>.

## 7. Angular 22: Controls Without a CVA

Angular 22 adds a lighter contract. A component that exposes <code>value = model()</code> (the <a href="https://angular.dev/api/forms/signals/FormValueControl" target="_blank" rel="noopener noreferrer"><code>FormValueControl</code></a> shape from Signal Forms) can be bound with <code>[formControl]</code> **without any CVA or provider**. Verified on 22.2.3 with a stepper component that has only <code>value = model(0)</code> plus optional <code>touched</code>, <code>dirty</code>, <code>disabled</code> and <code>errors</code> inputs, bound to <code>new FormControl(1, { validators: Validators.max(2) })</code>:

\`\`\`
init: +1touched=false dirty=false disabled=false errors=none | control: 1
plus: +2touched=false dirty=true disabled=false errors=none | control: 2 true
plus: +3touched=false dirty=true disabled=false errors=max | control: 3 INVALID
setValue(0): +0touched=false dirty=true disabled=false errors=none
disable(): +0touched=false dirty=true disabled=true errors=none
\`\`\`

(Each line is the component text with elements running together, then the control state.) The reactive directive wrote the value into the model, read changes back, marked the control dirty, and pushed <code>errors</code> and <code>disabled</code> into the component's inputs. Two caveats, both verified: it relies on the Angular compiler, so the same file in plain JIT (the site playground) fails with <code>NG01203: No value accessor</code>; and the API docs present this contract under Signal Forms, so treat reactive-forms support as the interop path it is. The full story is in [Signal Forms and ControlValueAccessor](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular).

## 8. Common Pitfalls

- **Calling <code>onChange</code> inside <code>writeValue</code>.** Verified with an accessor that echoed every written value: a single programmatic <code>setValue(5)</code> left the control <code>dirty</code> (the user never touched it) and fired <code>valueChanges</code> twice.
- **Plain fields for internal state.** With OnPush as the v22 default, a field set inside <code>writeValue</code> does not re-render; use a signal (or call <code>markForCheck()</code>, see [ChangeDetectorRef](/interview-question/what-does-changedetectorref-do)).
- **Not handling <code>null</code>.** <code>reset()</code> and <code>ngModel</code>'s first call both pass <code>null</code>; verified above.
- **Never calling <code>onTouched</code>.** <code>touched</code> stays false, so "show errors once touched" never shows anything.
- **Using <code>[disabled]</code> on the host with reactive forms.** Disable through the control (<code>control.disable()</code>), which reaches you via <code>setDisabledState</code>; binding <code>[disabled]</code> on a reactive-forms element makes 22.2.3 log "It looks like you're using the disabled attribute with a reactive form directive" in dev mode.
- **Forgetting <code>multi: true</code> or the provider entirely.** You get <code>NG01200</code> or <code>NG01203</code>; see the [NG_VALUE_ACCESSOR](/interview-question/what-is-the-role-of-ng-value-accessor-in-a-custom-component) question for both messages.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A ControlValueAccessor is the adapter between Angular forms directives and any UI element: four methods that move values in and changes out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The four methods:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code> shows a value from the model, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnChange</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">registerOnTouched</code> store callbacks I call on user input and blur, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState</code> reflects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disable()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Registration:</strong> <span style="color:#f0e2c8;">"I provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useExisting</code> pointing at the component and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multi: true</code>, usually wrapped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forwardRef</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules:</strong> <span style="color:#f0e2c8;">"Never call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code>, handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onTouched</code> on blur, and keep state in signals because v22 components are OnPush."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I verified:</strong> <span style="color:#f0e2c8;">"Reactive directives call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writeValue</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState(false)</code>, then the register methods; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngModel</code> first writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and the real value a tick later."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">writeValue</code> run before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">registerOnChange</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setUpControlValueAccessor</code> in the forms source writes the current value first, then sets up the view-to-model pipeline. That ordering guarantees an initial write can never be mistaken for a user change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setDisabledState</code> called?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since v15 the default is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">always</code>: it is called on attach with the current state, so you see <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setDisabledState(false)</code> for an enabled control, and again on every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disable()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enable()</code>. The old behaviour is opt-in with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">callSetDisabledState: 'whenDisabledForLegacyCode'</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show validation errors inside the custom control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The CVA alone does not get errors. Either inject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgControl</code> into the component and read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngControl.errors</code>, which means dropping the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> provider and setting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngControl.valueAccessor = this</code>, or, in v22, use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>-based contract that receives an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errors</code> input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a CVA work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updateOn: 'blur'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, unchanged. You still call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onChange</code> on every change; the form directive decides whether to apply it immediately or hold it until blur or submit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a CVA?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Host it in a tiny test component with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormControl</code>, then assert both directions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code> updates the rendered stars, and clicking a star changes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">control.value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dirty</code>. Also test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code> to cover the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> path.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ControlValueAccessor** | Interface that adapts a UI element to Angular forms |
| **writeValue** | Model to view: display this value |
| **registerOnChange / registerOnTouched** | Receive callbacks to report user changes and blur |
| **setDisabledState** | Model to view: reflect enable/disable |
| **NG_VALUE_ACCESSOR** | Multi-provider token the forms directives inject |
| **callSetDisabledState** | Forms option; <code>'always'</code> by default since v15 |
| **DefaultValueAccessor** | The built-in CVA for text inputs and textareas |
| **FormValueControl** | v22 contract: a <code>model()</code> named <code>value</code>, no CVA needed |

---
**Conclusion:** A custom form control is a component plus a four-method adapter. <code>writeValue</code> and <code>setDisabledState</code> carry the model into the widget; the callbacks from <code>registerOnChange</code> and <code>registerOnTouched</code> carry user actions back. The logs on 22.2.3 pin down the details interviewers probe: reactive directives write the value before registering callbacks and always call <code>setDisabledState</code>, <code>ngModel</code> starts with <code>null</code>, and destroy re-registers no-ops. Keep state in signals, never echo <code>writeValue</code> through <code>onChange</code>, and know that Angular 22 offers a <code>model()</code>-based contract that needs no CVA at all.`,
    examples: [
      {
        label: "A star-rating ControlValueAccessor that logs every call the forms API makes",
        tech: "angular",
        runnable: true,
        code: `import { Component, forwardRef, signal } from "@angular/core";
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: "star-rating",
  providers: [
    // Tells the forms directives on <star-rating> which object speaks the ControlValueAccessor protocol.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true },
  ],
  template: \`
    @for (star of stars; track star) {
      <button type="button" class="star" [disabled]="disabled()" (click)="pick(star)" (blur)="onTouched()">
        {{ star <= value() ? "★" : "☆" }}
      </button>
    }
  \`,
})
export class StarRating implements ControlValueAccessor {
  stars = [1, 2, 3, 4, 5];
  value = signal(0);
  disabled = signal(false);
  private onChange: (value: number) => void = () => {};
  onTouched: () => void = () => {};

  // MODEL -> VIEW: the form pushes a value in. Do not call onChange here.
  writeValue(value: number | null): void {
    console.log("writeValue(" + value + ")");
    this.value.set(value ?? 0);
  }
  // VIEW -> MODEL: the form hands us a callback to call when the user changes the value.
  registerOnChange(fn: (value: number) => void): void {
    console.log("registerOnChange");
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    console.log("registerOnTouched");
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    console.log("setDisabledState(" + isDisabled + ")");
    this.disabled.set(isDisabled);
  }

  pick(star: number) {
    this.value.set(star);
    this.onChange(star);
  }
}

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule, StarRating],
  template: \`
    <star-rating [formControl]="rating" />
    <button id="toggle" (click)="toggle()">toggle disabled</button>
    <button id="reset" (click)="rating.setValue(2)">setValue(2)</button>
    <p id="out">value={{ value() }}</p>
  \`,
})
export class AppComponent {
  rating = new FormControl(3, { validators: Validators.min(1) });
  value = signal(this.rating.value);
  constructor() {
    this.rating.valueChanges.subscribe((v) => this.value.set(v));
  }
  toggle() {
    if (this.rating.disabled) this.rating.enable();
    else this.rating.disable();
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the role of NG_VALUE_ACCESSOR in a custom component?",
    seoDescription:
      "NG_VALUE_ACCESSOR is the multi-provider token forms directives inject to find a value accessor. Why multi: true, useExisting, forwardRef and NgControl.",
    description: `**Question presented to candidate:**
"Every custom form control in our codebase has this providers line: provide NG_VALUE_ACCESSOR, useExisting forwardRef, multi true. A junior developer asks what it actually does and whether they can delete parts of it. What do you tell them?"

**What a strong answer should cover:**
- \`NG_VALUE_ACCESSOR\` is an **InjectionToken** that forms directives (\`NgModel\`, \`FormControlDirective\`, \`FormControlName\`) inject from the **same element** to find the object implementing \`ControlValueAccessor\`.
- **\`multi: true\`**: several directives on one element can contribute accessors (the built-in \`DefaultValueAccessor\` also matches many elements); Angular collects them into an array and picks one: **custom beats built-in beats default**. Without \`multi\`, Angular throws \`NG01200\`.
- **\`useExisting\`**: reuse the component instance Angular already created, instead of constructing a second one (\`useClass\` would).
- **\`forwardRef\`**: defers reading the class reference; it is the documented convention and needed when the class is referenced before its declaration is initialised. Verified: on 22.2.3 a self-reference in the class's own decorator also worked without it.
- No provider at all: \`NG01203: No value accessor for form control ...\`. Two custom accessors on one element: "More than one custom value accessor matches".
- Alternative: inject \`NgControl\` and set \`ngControl.valueAccessor = this\` (no provider; providing both creates a circular dependency, \`NG0200\`). In v22, \`model()\`-based controls need no token.

**Clarifying questions expected:**
- "Does the component also need to display its own validation errors?"
- "Is it used with both reactive and template-driven forms?"

**Code / implementation expected:** Yes — the provider line explained, plus the NgControl-injection alternative.`,
    answer: `**Target Audience:** Developers who have copied the <code>NG_VALUE_ACCESSOR</code> provider into a component and want to understand each part of it.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every error message below was produced on Angular 22.2.3 by booting a deliberately broken component (compiled with <code>ngc</code> in strict mode, run in jsdom); the selection rules were confirmed in the <code>@angular/forms</code> 22.2.3 source.

## 1. Why This Even Matters — A Story First

An electrician arrives at a house to connect a new appliance. She does not know what the appliance is; she just asks the building's switchboard: **"Who on this circuit speaks the standard plug protocol?"** If nobody answers, she cannot connect anything. If two people answer, she has to decide which one to trust. If the appliance answers "me, I am already here", she uses it directly rather than building a new one.

The electrician is a forms directive (<code>formControlName</code>, <code>ngModel</code>...). The switchboard is Angular's [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular) on that element. The question she asks is the token <code>NG_VALUE_ACCESSOR</code>. And your component's provider line is how it answers: "me" (<code>useExisting</code>), "one of possibly several" (<code>multi: true</code>).

The previous question, [building a ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-), covered what the four methods do. This one is about **how the directive finds them**.

## 2. The Core Idea

📌 **Interview term: NG_VALUE_ACCESSOR** — an [InjectionToken](/interview-question/what-is-an-injectiontoken) exported by <code>@angular/forms</code>. In the 22.2.3 source it is literally <code>new InjectionToken('NgValueAccessor')</code>. Forms directives inject it with <code>{ optional: true, self: true }</code> (read from the 22.2.3 source), so only **their own element** is searched, and they receive an array of accessors.

📌 **Interview term: Multi provider** — <code>multi: true</code> means "add my value to a list" rather than "be the value". Every directive on the element that provides <code>NG_VALUE_ACCESSOR</code> contributes one entry. (Provider recipes are compared in [useClass, useValue, useFactory and useExisting](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting).)

📌 **Interview term: useExisting** — an alias: "when someone asks for this token, give them the instance of <code>StarRating</code> that already exists on this element". <code>useClass</code> would create a **second** instance that is not the one rendering the template.

📌 **Interview term: forwardRef** — wraps a reference in a function so it is read later rather than immediately. It is needed when a class is referenced before it is defined, which is the classic situation for a class referring to itself in its own metadata.

So the line reads, piece by piece:

\`\`\`ts
providers: [
  {
    provide: NG_VALUE_ACCESSOR,              // answer the forms directive question
    useExisting: forwardRef(() => StarRating), // with this very component instance
    multi: true,                              // as one entry in a list of candidates
  },
],
\`\`\`

## 3. How the Directive Chooses

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="The forms directive injects every NG_VALUE_ACCESSOR on its element and picks the custom accessor over built in ones over the default accessor">
  <defs>
    <marker id="nva-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="56" text-anchor="middle">formControlName</text>
  <text class="d-sub" x="140" y="76" text-anchor="middle">inject NG_VALUE_ACCESSOR</text>
  <path class="d-edge" d="M 244 60 L 300 60" marker-end="url(#nva-arrow)"/>
  <rect class="d-box-muted" x="306" y="20" width="370" height="80" rx="10"/>
  <text class="d-text" x="491" y="48" text-anchor="middle">array from this element</text>
  <text class="d-sub" x="491" y="72" text-anchor="middle">[ DefaultValueAccessor, StarRating ]</text>
  <path class="d-edge-accent" d="M 491 104 L 491 140" marker-end="url(#nva-arrow)"/>
  <rect class="d-box-accent" x="80" y="146" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="170" y="172" text-anchor="middle">1. custom</text>
  <text class="d-sub" x="170" y="192" text-anchor="middle">your component</text>
  <rect class="d-box" x="300" y="146" width="180" height="56" rx="10"/>
  <text class="d-text" x="390" y="172" text-anchor="middle">2. built-in</text>
  <text class="d-sub" x="390" y="192" text-anchor="middle">checkbox, select...</text>
  <rect class="d-box" x="520" y="146" width="180" height="56" rx="10"/>
  <text class="d-text" x="610" y="172" text-anchor="middle">3. default</text>
  <text class="d-sub" x="610" y="192" text-anchor="middle">text input</text>
  <rect class="d-box-muted" x="200" y="246" width="320" height="50" rx="10"/>
  <text class="d-sub" x="360" y="276" text-anchor="middle">none: NG01203, two custom: error</text>
</svg>

Angular's <code>selectValueAccessor</code> walks the array and sorts entries into three buckets. A custom accessor wins over a built-in one (checkbox, radio, select, number, range), which wins over the plain <code>DefaultValueAccessor</code>. Two accessors in the same bucket is an error, and an empty array is an error.

## 4. Verified: What Breaks When You Delete Each Part

Each row is a separate component booted on 22.2.3:

| What you change | Result |
| :--- | :--- |
| Remove the provider entirely, bind <code>[formControl]</code> | <code>NG01203: No value accessor for form control unspecified name attribute</code> |
| Same, with <code>formControlName="city"</code> | <code>NG01203: No value accessor for form control name: 'city'</code> |
| Drop <code>multi: true</code> | <code>NG01200: Value accessor was not provided as an array ...</code> (full text below) |
| Drop <code>forwardRef</code> (<code>useExisting: NoUse</code> in its own decorator) | Worked in both AOT and playground mode; <code>writeValue(1)</code> was called |
| Two custom accessor directives on one input | <code>More than one custom value accessor matches form control with unspecified name attribute</code> |
| Provide <code>NG_VALUE_ACCESSOR</code> **and** inject <code>NgControl</code> in the same component | <code>NG0200: Circular dependency detected for _Both. Path: _Both -&gt; unknown -&gt; _FormControlDirective -&gt; InjectionToken NgValueAccessor -&gt; _Both</code> |

The full <code>NG01200</code> message, as printed:

\`\`\`
NG01200: Value accessor was not provided as an array for form control with unspecified name attribute. Check that the \`NG_VALUE_ACCESSOR\` token is configured as a \`multi: true\` provider.
\`\`\`

Two points about those rows:

- **<code>forwardRef</code> was not strictly needed here.** With TypeScript's decorator output, the decorator runs after the class binding exists, so <code>useExisting: NoUse</code> resolved fine on 22.2.3. It is still the documented pattern, it is required whenever the class is referenced before its definition (for example a provider object declared above the class, or a class used before declaration in the same file), and it is harmless, so keep it. Do not tell an interviewer it is always mandatory, or that it is pointless.
- **"unspecified name attribute"** in the messages is because <code>[formControl]</code> has no name; with <code>formControlName</code> the name appears, which is why naming controls helps debugging.

## 5. Verified: Custom Beats Default

A directive <code>input[trimmed]</code> that provides <code>NG_VALUE_ACCESSOR</code> sits on an ordinary text input, where <code>DefaultValueAccessor</code> also matches. Typing "  hi  " gave:

\`\`\`
Trimmed.writeValue x
model: "hi"
\`\`\`

The custom accessor received the initial write and its trimmed value reached the model, so it was chosen over the default one. This is the trick behind attribute-directive accessors: you do not have to wrap the input in a component to change how its value is read or written.

## 6. The Alternative: Inject <code>NgControl</code>

A CVA registered through the token cannot see its own control: no errors, no touched state. When the component needs them, drop the provider and wire it the other way round, using [inject()](/interview-question/inject-vs-constructor-injection-when-should-you-use-each):

\`\`\`ts
export class CodeInput implements ControlValueAccessor {
  ngControl = inject(NgControl, { self: true, optional: true });
  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }
  // writeValue / registerOnChange / registerOnTouched as usual
}
\`\`\`

The forms directive checks <code>valueAccessor</code> before falling back to the injected list, so it uses the component, and the component can now read <code>ngControl.errors</code> and <code>ngControl.touched</code>. The runnable example has both styles side by side. Driver output, AOT and playground identical:

\`\`\`
initial            | {"agree":false,"code":""} INVALID | yes-no: no | code:  | err: -
click yes-no       | {"agree":true,"code":""} INVALID | yes-no: yes | code:  | err: -
typed ab + blur    | {"agree":true,"code":"AB"} INVALID | yes-no: yes | code: AB | err: pattern
typed abc          | {"agree":true,"code":"ABC"} VALID | yes-no: yes | code: ABC | err: -
\`\`\`

The <code>yes-no</code> toggle uses the token and updates the model; the <code>code-input</code> uses <code>NgControl</code>, upper-cases the value on its way to the model ("ab" became "AB"), and shows its own <code>pattern</code> error once touched. That is the main reason to pick this style. Use <code>{ self: true }</code> so it never grabs an <code>NgControl</code> from an ancestor (see [@Self, @SkipSelf, @Optional and @Host](/interview-question/how-does-angular-s-dependency-resolution-search-work-using-self-skipself-optiona)), and <code>optional: true</code> so the component still renders without a form directive.

## 7. Related Tokens and the v22 Picture

| Token | Who provides it | What the forms directive does with it |
| :--- | :--- | :--- |
| <code>NG_VALUE_ACCESSOR</code> | Value accessor directives and components | Picks one to read and write the value |
| <code>NG_VALIDATORS</code> | Validator directives (<code>required</code>, your own) | Merges them into the control validators |
| <code>NG_ASYNC_VALIDATORS</code> | Async validator directives | Merges them into the async validators |

The same multi-provider pattern powers all three, which is why a [custom validator directive](/interview-question/how-do-you-create-a-custom-validator-in-reactive-forms) for template-driven forms looks almost identical to a CVA registration.

In Angular 22, Signal Forms controls skip the token entirely: a component with <code>value = model()</code> is recognised by the compiler as a form control, and it was verified to work with both <code>[formField]</code> and <code>[formControl]</code> without any provider. CVAs remain supported in both worlds, so existing components keep working. Details in [how Signal Forms and ControlValueAccessor evolve](/interview-question/how-do-signal-forms-and-controlvalueaccessor-evolve-in-modern-angular).

## 8. Common Pitfalls

- **Dropping <code>multi: true</code>.** You replace the whole list instead of joining it; verified <code>NG01200</code>.
- **<code>useClass</code> instead of <code>useExisting</code>.** Angular builds a second, invisible instance; the one on screen never receives <code>writeValue</code>.
- **Providing the token and injecting <code>NgControl</code>.** Verified circular dependency (<code>NG0200</code>). Choose one style.
- **Injecting <code>NgControl</code> without <code>self: true</code>.** Inside a parent that is itself a form control, you can pick up the wrong directive.
- **Two accessor directives on one element.** For example a custom trimming directive plus a custom mask directive: "More than one custom value accessor matches". Combine them into one.
- **Believing the token makes errors available.** It only connects value and touched/disabled plumbing; to show errors you need <code>NgControl</code> or the v22 <code>errors</code> input contract.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> is the injection token that forms directives ask, on their own element, for the object that implements ControlValueAccessor."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. \`multi: true\`:</strong> <span style="color:#f0e2c8;">"It is a multi provider because several directives on one element can offer an accessor. Angular collects the list and picks custom over built-in over default; without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multi</code> it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG01200</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. \`useExisting\`:</strong> <span style="color:#f0e2c8;">"It aliases the token to the component instance that already exists. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useClass</code> would build a second instance that is not the one on screen."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. \`forwardRef\`:</strong> <span style="color:#f0e2c8;">"It defers reading the class reference. It is the convention and needed when the class is referenced before it is defined; on 22.2.3 the self-reference in the decorator actually worked without it, but I keep it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">"If the control must show its own errors, I drop the provider and inject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgControl</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self: true</code>, setting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueAccessor = this</code>. In v22, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>-based controls need no token at all."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if no accessor is found?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG01203: No value accessor for form control</code>, followed by the control name, or "unspecified name attribute" for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formControl]</code>. It almost always means the component forgot the provider.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a text input not complain about two accessors, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DefaultValueAccessor</code> and mine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because selection uses buckets: the default accessor is a fallback, built-ins come next, and a custom accessor wins over both. Only two accessors in the same bucket is an error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you get a circular dependency when you inject <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NgControl</code> and also provide the token?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgControl</code> is the form directive, which needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> to be constructed, which is your component, which is waiting on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgControl</code>. I verified the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0200</code> path: component, form directive, value accessor token, component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> used by Signal Forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for interop. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formField]</code> directive binds native inputs and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>-based controls directly, and also accepts a component that provides a ControlValueAccessor for backwards compatibility, which I verified with a legacy toggle bound through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formField]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a directive, not a component, be a value accessor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. An attribute directive like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input[trimmed]</code> providing the token replaces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DefaultValueAccessor</code> on that input; verified, the model received the trimmed value.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **NG_VALUE_ACCESSOR** | Token forms directives inject to find the element value accessor |
| **InjectionToken** | A DI key that is not a class |
| **multi: true** | Provider adds to a list instead of replacing the value |
| **useExisting** | Alias to an instance that already exists |
| **forwardRef** | Wraps a class reference so it is read later |
| **selectValueAccessor** | Forms helper that picks custom over built-in over default |
| **NgControl** | Base class of the forms directives; injectable from the control element |
| **NG_VALIDATORS** | Sibling multi token for validator directives |

---
**Conclusion:** <code>NG_VALUE_ACCESSOR</code> is the question a forms directive asks its own element: "who speaks ControlValueAccessor here?". <code>multi: true</code> lets your component join the list of candidates, where custom accessors beat the built-in and default ones; <code>useExisting</code> answers with the component instance already on screen; <code>forwardRef</code> is the safe convention for referencing the class from its own metadata. On 22.2.3 each missing piece produced a precise error (<code>NG01203</code>, <code>NG01200</code>, or <code>NG0200</code> if you also inject <code>NgControl</code>), and Angular 22's <code>model()</code>-based controls show where things are heading: no token at all.`,
    examples: [
      {
        label: "Two registration styles: NG_VALUE_ACCESSOR multi-provider and injecting NgControl directly",
        tech: "angular",
        runnable: true,
        code: `import { Component, forwardRef, inject, signal } from "@angular/core";
import {
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALUE_ACCESSOR,
  NgControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

// Pattern A: register through the NG_VALUE_ACCESSOR multi-provider token.
@Component({
  selector: "yes-no",
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => YesNo), multi: true }],
  template: \`<button type="button" class="yes-no" (click)="flip()">{{ on() ? "yes" : "no" }}</button>\`,
})
export class YesNo implements ControlValueAccessor {
  on = signal(false);
  private onChange: (v: boolean) => void = () => {};
  writeValue(v: boolean | null) { this.on.set(!!v); }
  registerOnChange(fn: (v: boolean) => void) { this.onChange = fn; }
  registerOnTouched() {}
  flip() { this.on.update((x) => !x); this.onChange(this.on()); }
}

// Pattern B: no provider. Inject the NgControl on the same element and hand it this object.
// Avoids the circular dependency you get if you provide NG_VALUE_ACCESSOR AND inject NgControl,
// and gives the component direct access to the control (errors, touched...).
@Component({
  selector: "code-input",
  template: \`
    <input class="code" [value]="value()" (input)="onInput($any($event.target).value)" (blur)="onTouched()" />
    @if (ngControl?.touched && ngControl?.errors) {
      <small class="code-err">{{ errorText() }}</small>
    }
  \`,
})
export class CodeInput implements ControlValueAccessor {
  ngControl = inject(NgControl, { self: true, optional: true });
  value = signal("");
  private onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }
  writeValue(v: string | null) { this.value.set(v ?? ""); }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  onInput(v: string) {
    const upper = v.toUpperCase(); // the accessor may transform the value on the way to the model
    this.value.set(upper);
    this.onChange(upper);
  }
  errorText() {
    return Object.keys(this.ngControl?.errors ?? {}).join(", ");
  }
}

@Component({
  selector: "app-root",
  imports: [ReactiveFormsModule, YesNo, CodeInput],
  template: \`
    <form [formGroup]="form">
      <yes-no formControlName="agree" />
      <code-input formControlName="code" />
    </form>
    <p id="out">{{ out() }}</p>
  \`,
})
export class AppComponent {
  form = new FormGroup({
    agree: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
    code: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)] }),
  });
  out = signal(JSON.stringify(this.form.value) + " " + this.form.status);
  constructor() {
    this.form.valueChanges.subscribe((v) => this.out.set(JSON.stringify(v) + " " + this.form.status));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do signal forms and ControlValueAccessor evolve in modern Angular?",
    seoDescription:
      "Signal Forms, stable in Angular 22, build a field tree over a signal model. FormValueControl replaces most ControlValueAccessor code; old CVAs still work.",
    description: `**Question presented to candidate:**
"Angular 22 shipped Signal Forms as stable. We have a reactive-forms app with a dozen ControlValueAccessor components. Explain how Signal Forms work, what replaces ControlValueAccessor, and how you would migrate without a big-bang rewrite."

**What a strong answer should cover:**
- **Signal Forms** (\`@angular/forms/signals\`): you own the data as a \`signal()\`, and \`form(model, schema)\` builds a typed **field tree** over it; each field's state (\`value\`, \`valid\`, \`errors\`, \`touched\`, \`dirty\`, \`disabled\`...) is a signal.
- Rules are declared in a **schema function**: \`required\`, \`email\`, \`minLength\`, \`min\`/\`max\`, \`pattern\`, \`validate\` (with \`valueOf\` for cross-field rules), \`validateAsync\`/\`validateHttp\`, \`disabled\`, \`hidden\`, \`readonly\`, \`debounce\`, \`applyEach\`, \`applyWhen\`.
- Binding is one directive, \`[formField]\`; \`[formRoot]\` handles submit (adds \`novalidate\`, calls \`submit()\`).
- **Custom controls**: \`FormValueControl\` / \`FormCheckboxControl\` replace most CVA code with a \`value = model()\` plus optional inputs (\`errors\`, \`disabled\`, \`touched\`...).
- **Interop**: existing CVAs work with \`[formField]\`; model-based controls also work with \`[formControl]\`; \`SignalFormControl\` and \`compatForm\` let reactive and signal forms be mixed during migration.
- Status: experimental in v21, **stable in v22** (\`@publicApi 22.0\` in the 22.2.3 typings).

**Clarifying questions expected:**
- "Which Angular version are we on? Signal Forms are only stable from v22."
- "Are the CVA components shared with other apps that will stay on reactive forms?"

**Code / implementation expected:** Yes — a small signal form with validation and submit, and a \`model()\`-based custom control next to a legacy CVA.`,
    answer: `**Target Audience:** Developers who know reactive forms and ControlValueAccessor and want to understand the Angular 22 signal-based forms API and how to migrate to it.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every behaviour quoted below was produced on Angular 22.2.3: the two examples compiled with <code>ngc</code> (strict templates), booted in jsdom and driven by a script; the first example also passed the playground (JIT) mode. Stability claims were read from the 22.2.3 type definitions and checked against the v22 announcement.

## 1. Why This Even Matters — A Story First

Picture a shared spreadsheet for a team trip. In the old way, everyone had a **separate copy**: the form had its own copy of the data, your component had another, and you spent your time copying values between them and subscribing to "this cell changed" notifications.

Now picture one live sheet where **every cell knows who is looking at it**. Change a cell and only the formulas and screens that read it update. Validation rules sit next to the columns they guard. Nothing needs copying, because there is only one sheet.

That is the shift Signal Forms make. Your data lives in one <code>signal()</code>. The form is a **view of it** made of signals, so a template that reads <code>f.email().invalid()</code> updates exactly when that answer changes. And custom inputs no longer need a four-method adapter; they just expose a two-way <code>model()</code>.

## 2. Where It Stands in Angular 22

📌 **Interview term: Signal Forms** — the forms API in <code>@angular/forms/signals</code>, built on [Angular Signals](/interview-question/what-are-angular-signals). It sits next to [reactive and template-driven forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms); neither of those is deprecated.

Status, checked rather than assumed:

- In the installed **22.2.3** package, the Signal Forms exports (<code>form</code>, <code>FormField</code>, <code>FormRoot</code>, the validators, <code>FormValueControl</code>, <code>submit</code>...) are tagged <code>@publicApi 22.0</code> (one helper, <code>isFieldTree</code>, is <code>@publicApi 22.1</code>). The only <code>@experimental</code> tags in the package are on the WebMCP integration (<code>provideExperimentalWebMcpForms</code> and the <code>experimentalWebMcpTool</code> form option). There are no <code>@developerPreview</code> tags.
- The Angular team's v22 announcement describes Signal Forms as graduating to stable (<a href="https://blog.angular.dev/announcing-angular-v22-c52bb83a4664" target="_blank" rel="noopener noreferrer">Announcing Angular v22</a>). In v21 they were experimental (<a href="https://v21.angular.dev/api/forms/signals/FormField" target="_blank" rel="noopener noreferrer">v21 API docs</a>).

So for an Angular 22 app, Signal Forms are a supported choice for new forms; on v21 they were opt-in and subject to change.

## 3. The Core API

📌 **Interview term: Model signal** — you own the data: <code>model = signal&lt;Signup&gt;({ name: "", email: "", ... })</code>. The form never keeps a separate copy.

📌 **Interview term: form() and the field tree** — <code>f = form(model, schema)</code> returns a **FieldTree** whose shape mirrors the model: <code>f.name</code>, <code>f.email</code>, <code>f.tags[1]</code>. Calling a field gives its **FieldState**, whose members are signals: <code>f.email().value()</code>, <code>.valid()</code>, <code>.invalid()</code>, <code>.pending()</code>, <code>.touched()</code>, <code>.dirty()</code>, <code>.disabled()</code>, <code>.hidden()</code>, <code>.readonly()</code>, <code>.errors()</code>, <code>.errorSummary()</code>, <code>.submitting()</code>. <code>form()</code> must run in an [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it); verified, calling it in a plain script throws <code>NG0203</code>.

📌 **Interview term: Schema function** — the second argument to <code>form()</code>, where rules are declared against paths: <code>required(p.name)</code>, <code>email(p.email)</code>, <code>minLength(p.password, 8)</code>, <code>disabled(p.perk, ...)</code>, <code>applyEach(p.tags, ...)</code>. Rules are reactive: they re-evaluate when the signals they read change.

📌 **Interview term: [formField]** — the one directive (<code>FormField</code>) that binds a field to an input, a select, a custom control or a legacy CVA. <code>[formRoot]</code> (<code>FormRoot</code>) goes on the <code>&lt;form&gt;</code> element.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A writable signal holds the model, form builds a field tree over it with schema rules, and formField binds each field to a native input or a custom control">
  <defs>
    <marker id="sf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="190" height="60" rx="10"/>
  <text class="d-text" x="125" y="66" text-anchor="middle">model = signal</text>
  <text class="d-sub" x="125" y="86" text-anchor="middle">your data, one copy</text>
  <path class="d-edge-accent" d="M 224 70 L 280 70" marker-end="url(#sf-arrow)"/>
  <rect class="d-box-accent" x="286" y="30" width="200" height="80" rx="10"/>
  <text class="d-text d-accent" x="386" y="58" text-anchor="middle">form(model, schema)</text>
  <text class="d-sub" x="386" y="80" text-anchor="middle">field tree of signals</text>
  <text class="d-sub" x="386" y="98" text-anchor="middle">required, validate, disabled</text>
  <path class="d-edge" d="M 340 114 L 200 176" marker-end="url(#sf-arrow)"/>
  <path class="d-edge" d="M 386 114 L 386 176" marker-end="url(#sf-arrow)"/>
  <path class="d-edge" d="M 432 114 L 572 176" marker-end="url(#sf-arrow)"/>
  <rect class="d-box" x="90" y="182" width="190" height="60" rx="10"/>
  <text class="d-text" x="185" y="208" text-anchor="middle">native input</text>
  <text class="d-sub" x="185" y="228" text-anchor="middle">[formField]</text>
  <rect class="d-box" x="300" y="182" width="190" height="60" rx="10"/>
  <text class="d-text" x="395" y="208" text-anchor="middle">value = model()</text>
  <text class="d-sub" x="395" y="228" text-anchor="middle">FormValueControl</text>
  <rect class="d-box-muted" x="510" y="182" width="190" height="60" rx="10"/>
  <text class="d-text" x="605" y="208" text-anchor="middle">legacy CVA</text>
  <text class="d-sub" x="605" y="228" text-anchor="middle">interop only</text>
</svg>

Data flows both ways along every arrow: typing writes through the field into the model signal, and <code>model.set(...)</code> flows back out to every bound control. The three boxes at the bottom are the three kinds of control <code>[formField]</code> accepts, in order of preference.

## 4. Verified: A Complete Signal Form

The first runnable example is a sign-up form: four fields, schema validators, a cross-field rule and submission through <code>[formRoot]</code>:

\`\`\`ts
f = form(
  this.model,
  (p) => {
    required(p.name, { message: "Name is required" });
    email(p.email);
    minLength(p.password, 8);
    validate(p.confirm, ({ value, valueOf }) =>
      value() === valueOf(p.password) ? undefined : { kind: "mismatch", message: "Passwords differ" }
    );
  },
  { submission: { action: async (root) => { /* save */ return undefined; }, onInvalid: () => { /* ... */ } } }
);
\`\`\`

Driver output, identical in AOT and playground mode (state, error kinds across fields, model, log):

\`\`\`
initial          | valid=false dirty=false touched=false | required | model=| |
submit empty     | valid=false dirty=false touched=true | required | model=| | blocked: invalid
typed mismatch   | valid=false dirty=true touched=true | mismatch | model=Ada|ada@example.com | blocked: invalid
typed match      | valid=true dirty=true touched=true | none | model=Ada|ada@example.com | blocked: invalid
submit valid     | valid=true dirty=true touched=true | none | model=Ada|ada@example.com | saved {"name":"Ada","email":"ada@example.com","password":"longpassword","confirm":"longpassword"}
model.set -> input value: Grace
\`\`\`

What it shows:

- **Errors are objects with a <code>kind</code>**, not keys on a map. Inspected directly: <code>[{"kind":"required","message":"Name is required"}]</code> and <code>[{"kind":"minLength","minLength":3}]</code>. Compare reactive forms' <code>{"required":true}</code>.
- **Only <code>required</code> fires on an empty form.** <code>email</code>, <code>minLength</code> and the match rule all treat empty values as "nothing to check", like the reactive validators do.
- **Cross-field rules are just reads.** <code>valueOf(p.password)</code> is a signal read, so the confirm rule re-ran when either field changed, with no group validator and no subscription (compare [the reactive approach](/interview-question/how-do-you-handle-dynamic-validation-where-one-form-field-s-validator-depends-on)).
- **Submitting an invalid form** marked every field touched and called <code>onInvalid</code>; the valid submit called <code>action</code> with the root field.
- **Model to view** works with no extra API: <code>model.update(...)</code> changed the input to "Grace".

One trap is worth knowing. With a plain <code>&lt;form (submit)="..."&gt;</code> instead of <code>[formRoot]</code> (tried first, same inputs), clicking Save on the empty form did nothing at all: the handler never ran. <code>[formField]</code> mirrors the schema onto the native element (the name input had <code>required</code> and an auto-generated <code>name="ng.form0.name"</code>), so the browser's own constraint validation blocked the submit event before Angular saw it. <code>[formRoot]</code> fixes this: its host bindings, read from the 22.2.3 source, add <code>novalidate</code> and call <code>submit()</code> with the options passed to <code>form()</code>. This was observed in jsdom, which implements HTML constraint validation; in a real browser the same standard check applies and also shows the native validation bubble, which was not checked here.

Other schema rules, checked in a separate component: <code>disabled(p.perk, ({ valueOf }) =&gt; !valueOf(p.vip) &amp;&amp; "Only for VIP")</code> gave <code>disabled() true</code> with reason "Only for VIP" and flipped to <code>false</code> when <code>vip</code> was set; <code>applyEach(p.tags, (t) =&gt; required(t))</code> put a <code>required</code> error on <code>tags[1]</code>; and the root's <code>errorSummary()</code> listed all three errors in the tree while its own <code>errors()</code> was empty.

## 5. How ControlValueAccessor Evolves

📌 **Interview term: FormValueControl** — the Signal Forms contract for a custom control (<code>@publicApi 22.0</code>). The **only required member** is <code>value: ModelSignal&lt;T&gt;</code>, i.e. <code>value = model(...)</code> (see [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs)). Everything else is optional inputs from <code>FormUiControl</code> that the directive fills in if you declare them: <code>errors</code>, <code>disabled</code>, <code>disabledReasons</code>, <code>readonly</code>, <code>hidden</code>, <code>invalid</code>, <code>pending</code>, <code>touched</code>, <code>dirty</code>, <code>required</code>, <code>min</code>/<code>max</code>, <code>minLength</code>/<code>maxLength</code>, <code>pattern</code>, <code>name</code>, plus a <code>touch</code> output and optional <code>focus()</code>/<code>reset()</code> methods. <code>FormCheckboxControl</code> is the same with <code>checked = model()</code> instead.

| | ControlValueAccessor | FormValueControl |
| :--- | :--- | :--- |
| Registration | <code>NG_VALUE_ACCESSOR</code> multi provider + <code>forwardRef</code> | None: the compiler recognises the contract |
| Model to view | <code>writeValue(v)</code> | The <code>value</code> model input |
| View to model | Store and call <code>onChange</code> | <code>value.set(v)</code> |
| Touched | Store and call <code>onTouched</code> | Emit the <code>touch</code> output |
| Disabled | <code>setDisabledState(b)</code> | A <code>disabled</code> input |
| Errors | Not available; inject <code>NgControl</code> | An <code>errors</code> input |
| Works with | <code>formControl</code>, <code>formControlName</code>, <code>ngModel</code>, <code>[formField]</code> | <code>[formField]</code>, and in v22 also <code>formControl</code>/<code>formControlName</code>/<code>ngModel</code> (AOT) |

The second example (not runnable in the playground, because it declares <code>model()</code>, [input()](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1) and [output()](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs)) puts both kinds of control in one app. Driver output from the AOT build; lines starting with <code>CVA</code> are logged by the legacy component:

\`\`\`
CVA registerOnChange
CVA registerOnTouched
CVA writeValue(true)
CVA setDisabledState(false)
initial          | signal-forms qty: 1 err: - | toggle: ON | model: 1 / true / valid=true
minus            | signal-forms qty: 0 err: min | toggle: ON | model: 0 / true / valid=false
plus x3          | signal-forms qty: 3 err: - | toggle: ON | model: 3 / true / valid=true
toggle click     | signal-forms qty: 3 err: - | toggle: OFF | model: 3 / false / valid=true
CVA writeValue(true)
model gift=true  | signal-forms qty: 3 err: - | toggle: ON | model: 3 / true / valid=true
rf initial       | reactive qty: 5 err: - | FormControl: 5 VALID dirty=false touched=false
rf plus          | reactive qty: 6 err: max | FormControl: 6 INVALID dirty=true touched=true
rf disable()     | reactive qty: 6 err: - | FormControl: 6 DISABLED dirty=true touched=true
rf plus button disabled: true
\`\`\`

Three things in that log:

1. **The <code>model()</code> stepper got its <code>errors</code> input filled** (<code>min</code> at 0) without any extra code, something a CVA can only do by injecting <code>NgControl</code>.
2. **A legacy CVA works unchanged under <code>[formField]</code>**, in both directions. Note the call order differs from reactive forms: Signal Forms called <code>registerOnChange</code> and <code>registerOnTouched</code> **before** <code>writeValue</code>, while a reactive <code>[formControl]</code> calls <code>writeValue</code> first (see [building a CVA](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-)). A CVA that assumes one order is fragile.
3. **The same <code>model()</code> stepper also worked under a reactive <code>[formControl]</code>**, with no CVA: the control became dirty, the <code>touch</code> output marked it touched, <code>Validators.max(5)</code> reached the component as an <code>errors</code> entry of kind <code>max</code>, and <code>disable()</code> reached its <code>disabled</code> input. This needs the Angular compiler: the same pattern in plain JIT failed with <code>NG01203: No value accessor</code>.

## 6. Migrating Without a Rewrite

The 22.2.3 package ships a compat entry point, <code>@angular/forms/signals/compat</code>, for mixing the two worlds:

- **Bottom-up: <code>SignalFormControl</code>.** A reactive <code>AbstractControl</code> whose rules are a Signal Forms schema. Verified: <code>new SignalFormControl("", p =&gt; { required(p); })</code> inside a normal <code>FormGroup</code> made the group <code>INVALID</code> with control errors <code>{"required":{"kind":"required"}}</code>; typing "Alice" into an input bound with <code>[formField]="name.fieldTree"</code> made the group <code>VALID</code> with value <code>{"name":"Alice","age":25}</code>.
- **Top-down: <code>compatForm()</code>.** A <code>form()</code> whose model may contain existing reactive <code>FormControl</code>s, so a new signal form can wrap old pieces.
- **Controls first.** Because a <code>model()</code>-based control works with both <code>[formField]</code> and reactive directives in v22, converting shared CVA components to <code>FormValueControl</code> can come before converting the forms that use them.

A sensible order: new forms in Signal Forms; convert leaf CVA components to <code>FormValueControl</code> as you touch them; migrate existing forms screen by screen with the compat helpers; keep stable, working reactive forms where they are.

## 7. Common Pitfalls

- **Assuming Signal Forms are experimental.** They were in v21; the 22.2.3 typings mark them <code>@publicApi 22.0</code>. Check the version before advising either way.
- **Plain <code>&lt;form (submit)&gt;</code> around <code>[formField]</code> inputs.** Verified: native constraint validation can block the submit; use <code>[formRoot]</code>, which adds <code>novalidate</code>.
- **Calling <code>form()</code> outside an injection context.** It injects internally; verified <code>NG0203</code>. Create it in a field initialiser or constructor.
- **Reading errors as a map.** Signal Forms errors are an array of <code>{ kind, message?, ... }</code>; <code>errors.required</code> does not exist.
- **Writing a CVA that depends on call order.** Reactive forms call <code>writeValue</code> first, Signal Forms call it after the register methods; verified both.
- **Expecting <code>model()</code>-based controls in JIT.** The CVA-free path needs AOT compilation; in plain JIT it failed with <code>NG01203</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Signal Forms, stable in Angular 22, let me keep my data in one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signal</code> and build a typed field tree over it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">form(model, schema)</code>, where every field state is a signal."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How rules work:</strong> <span style="color:#f0e2c8;">"Validators and logic are declared in a schema function: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validate</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueOf</code> for cross-field rules, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">applyEach</code>. They re-run automatically when what they read changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binding and submit:</strong> <span style="color:#f0e2c8;">"One directive, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formField]</code>, binds inputs and custom controls; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formRoot]</code> on the form adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">novalidate</code> and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit()</code> with my action."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What replaces CVA:</strong> <span style="color:#f0e2c8;">"A custom control implements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormValueControl</code>: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value = model()</code> plus optional inputs such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errors</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disabled</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">touch</code> output. No provider, no four callbacks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"Existing CVAs work under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[formField]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> controls work under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formControl</code> too, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SignalFormControl</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compatForm</code> let me mix both, so I migrate screen by screen."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do async validation in Signal Forms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validateAsync</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">validateHttp</code> for the common case of calling an endpoint. The field reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pending()</code> while it runs, and the form root's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit</code> option <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ignoreValidators</code> decides whether pending validators block submission; by default they do not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happened to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">updateOn</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is expressed as a rule instead: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounce(p.field, 300)</code> delays model updates by time, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounce(p.field, 'blur')</code> holds them until the field is touched, which covers the old blur mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a server error after submit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return it from the submission <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action</code>. The function returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeValidationResult</code>, and errors returned there are attached to the fields as submission errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you still need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ControlValueAccessor</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For new controls, rarely: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormValueControl</code> covers the common cases and gets errors and state for free. Keep CVAs for components shared with apps still on reactive forms, though in v22 even those apps can consume a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code>-based control.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a signal form not need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">valueChanges</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the model is a signal. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect</code> that reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> or a field state already reacts to changes, so there is no separate change stream to subscribe to and nothing to unsubscribe.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal Forms** | The <code>@angular/forms/signals</code> API, stable from v22 |
| **form()** | Builds a field tree over a writable model signal |
| **FieldTree / FieldState** | The tree of fields, and each field state whose members are signals |
| **Schema function** | Where rules such as <code>required</code> and <code>validate</code> are declared |
| **[formField] / FormField** | Directive binding a field to an input or custom control |
| **[formRoot] / FormRoot** | Directive on the form: adds <code>novalidate</code>, calls <code>submit()</code> |
| **FormValueControl** | Custom control contract: a <code>model()</code> named <code>value</code> |
| **SignalFormControl / compatForm** | Compat helpers for mixing reactive and signal forms |

---
**Conclusion:** Signal Forms change who owns form state: you hold the data in one signal and <code>form()</code> builds a typed tree of signal-based field states over it, with rules declared once in a schema and re-evaluated automatically. In the 22.2.3 package the API is <code>@publicApi 22.0</code>, so it is stable for Angular 22 apps. ControlValueAccessor evolves into <code>FormValueControl</code>, a <code>value = model()</code> plus optional inputs, which received errors and disabled state for free in the verified run and even worked under a reactive <code>[formControl]</code>. Old CVAs keep working under <code>[formField]</code> (with a different call order), and the compat helpers let a large app migrate screen by screen rather than all at once.`,
    examples: [
      {
        label: "A Signal Forms sign-up form: schema validators, a cross-field rule and FormRoot submission",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { form, FormField, FormRoot, required, email, minLength, validate } from "@angular/forms/signals";

interface Signup {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

@Component({
  selector: "app-root",
  imports: [FormField, FormRoot],
  template: \`
    <!-- formRoot adds novalidate and calls submit() with the options given to form() -->
    <form [formRoot]="f">
      <input id="name" placeholder="name" [formField]="f.name" />
      <input id="email" placeholder="email" [formField]="f.email" />
      <input id="password" type="password" placeholder="password" [formField]="f.password" />
      <input id="confirm" type="password" placeholder="confirm" [formField]="f.confirm" />
      <button id="save" type="submit">Save</button>
    </form>
    <p id="state">valid={{ f().valid() }} dirty={{ f().dirty() }} touched={{ f().touched() }}</p>
    <p id="errors">{{ errorKinds() }}</p>
    <p id="model">model={{ model().name }}|{{ model().email }}</p>
    <p id="log">{{ log() }}</p>
  \`,
})
export class AppComponent {
  // The model is a plain writable signal; form() builds a typed tree of fields over it.
  model = signal<Signup>({ name: "", email: "", password: "", confirm: "" });
  log = signal("");

  f = form(
    this.model,
    (p) => {
      required(p.name, { message: "Name is required" });
      email(p.email);
      minLength(p.password, 8);
      // Cross-field rule: valueOf() reads another field, so it re-runs when either changes.
      validate(p.confirm, ({ value, valueOf }) =>
        value() === valueOf(p.password) ? undefined : { kind: "mismatch", message: "Passwords differ" }
      );
    },
    {
      submission: {
        action: async (root) => {
          this.log.set("saved " + JSON.stringify(root().value()));
          return undefined; // or return errors from the server
        },
        onInvalid: () => this.log.set("blocked: invalid"),
      },
    }
  );

  errorKinds() {
    const fields = [this.f.name, this.f.email, this.f.password, this.f.confirm];
    return fields.flatMap((field) => field().errors().map((e) => e.kind)).join(",") || "none";
  }
}`,
      },
      {
        label: "A FormValueControl built with model() next to a legacy ControlValueAccessor, both bound with [formField]",
        tech: "angular",
        runnable: false,
        code: `import { Component, forwardRef, input, model, output, signal } from "@angular/core";
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators } from "@angular/forms";
import { form, FormField, FormValueControl, ValidationError, max, min } from "@angular/forms/signals";

// NEW: a Signal Forms control. The contract is a model() called value, plus optional
// inputs (errors, disabled, touched...) and a touch output that the forms directive wires up.
@Component({
  selector: "qty-stepper",
  template: \`
    <button type="button" class="minus" [disabled]="disabled()" (click)="step(-1)">-</button>
    <span class="qty">{{ value() }}</span>
    <button type="button" class="plus" [disabled]="disabled()" (click)="step(1)">+</button>
    @if (errors().length) { <em class="err">{{ errors()[0].kind }}</em> }
  \`,
})
export class QtyStepper implements FormValueControl<number> {
  value = model(0);
  disabled = input(false);
  errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  touch = output<void>();
  step(delta: number) {
    this.value.update((v) => v + delta);
    this.touch.emit();
  }
}

// OLD: a ControlValueAccessor written for reactive forms, reused unchanged.
@Component({
  selector: "legacy-toggle",
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LegacyToggle), multi: true }],
  template: \`<button type="button" class="toggle" (click)="flip()">{{ on() ? "ON" : "OFF" }}</button>\`,
})
export class LegacyToggle implements ControlValueAccessor {
  on = signal(false);
  private onChange: (v: boolean) => void = () => {};
  writeValue(v: boolean) { console.log("CVA writeValue(" + v + ")"); this.on.set(!!v); }
  registerOnChange(fn: (v: boolean) => void) { console.log("CVA registerOnChange"); this.onChange = fn; }
  registerOnTouched() { console.log("CVA registerOnTouched"); }
  setDisabledState(d: boolean) { console.log("CVA setDisabledState(" + d + ")"); }
  flip() { this.on.update((x) => !x); this.onChange(this.on()); }
}

@Component({
  selector: "app-root",
  imports: [FormField, ReactiveFormsModule, QtyStepper, LegacyToggle],
  template: \`
    <!-- Signal Forms binding both kinds of control -->
    <qty-stepper id="sf-qty" [formField]="f.qty" />
    <legacy-toggle [formField]="f.gift" />
    <p class="model">{{ model().qty }} / {{ model().gift }} / valid={{ f().valid() }}</p>

    <!-- The same new-style control driven by a reactive FormControl, no ControlValueAccessor -->
    <qty-stepper id="rf-qty" [formControl]="legacyQty" />
  \`,
})
export class AppComponent {
  model = signal({ qty: 1, gift: true });
  f = form(this.model, (p) => {
    min(p.qty, 1);
    max(p.qty, 3);
  });
  legacyQty = new FormControl(5, { nonNullable: true, validators: Validators.max(5) });
}`,
      },
    ],
  },
];

export default augments;
