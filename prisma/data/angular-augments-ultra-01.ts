/**
 * Angular ULTRA — batch 01: the easy fundamentals (what Angular is, components
 * and modules, standalone components, data binding, outputs, template
 * reference variables, constructor vs ngOnInit, the CLI).
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
 * the site playground runs them). CLI claims come from running Angular CLI
 * 22.2.3 (`ng new`, `ng generate --dry-run`, `ng build`, `ng test`).
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Angular and how does it differ from AngularJS?",
    seoDescription:
      "Angular is Google's TypeScript framework, a full rewrite of AngularJS. How components, AOT, signals and DI replaced $scope and the digest loop.",
    description: `**Question presented to candidate:**
"Our legacy admin panel is on AngularJS 1.8 and the new product is on Angular 22. Explain what Angular is, and why moving between the two is a rewrite rather than an upgrade."

**What a strong answer should cover:**
- Angular is a **TypeScript-first, batteries-included framework** from Google: components, routing, forms, HTTP, DI, testing and a CLI ship together.
- **AngularJS (1.x)** is a different framework: JavaScript, controllers and \`$scope\`, and a **digest loop** that dirty-checks every watcher.
- Angular (2016 onwards) was a **ground-up rewrite**: components instead of controllers, templates **compiled ahead of time** into instructions, typed DI, and now **signals** for fine-grained reactivity.
- **AngularJS support ended in January 2022**; Angular is actively maintained and versioned semantically.
- Modern defaults matter: standalone components (v19), zoneless change detection (v21), OnPush by default (v22).
- Migration is incremental at best (ngUpgrade hybrid apps) and in practice a rewrite, because the mental models do not map one to one.

**Clarifying questions expected:**
- "Do you mean the history, or what changes for the team day to day?"
- "Is the plan a big-bang rewrite or a hybrid app that migrates screen by screen?"

**Code / implementation expected:** Optional — a small standalone component with signals to contrast with a \`$scope\` controller.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — assumes basic JavaScript, no Angular or AngularJS required.
**Difficulty:** Easy

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The output in section 5 was produced by compiling and running the example on Angular 22.2.3, and the default-behaviour claims in section 6 were read from the Angular 22.2.3 package itself.

## 1. Why This Even Matters — A Story First

Imagine an old office building where every light switch is wired to a bell in the basement. Whenever anyone flips any switch, a caretaker walks every corridor checking every single bulb to see which ones changed, then walks them all again just in case his first walk changed something. It works, and in a small building nobody notices. In a skyscraper the caretaker never sits down.

That caretaker is **AngularJS**, the 2010 framework. Its "walk every corridor" is called the **digest loop**.

Now imagine the same company builds a new tower. This time each bulb is wired directly to its own switch, the wiring diagram is drawn and checked before construction starts, and the caretaker only visits the floors where a switch actually moved. Same company, same goal, completely different building. That tower is **Angular**.

The names are confusingly similar, which is exactly why interviewers ask this. They want to know you understand that these are **two different frameworks**, not version 1 and version 2 of the same one.

## 2. The Core Idea

📌 **Interview term: Framework** — a structure that calls *your* code, as opposed to a **library** that your code calls. Angular decides how an app is organised: where components live, how they get their dependencies, how data reaches the screen.

📌 **Interview term: Batteries included** — Angular ships [routing](/interview-question/how-does-routing-and-lazy-loading-work-in-angular), forms, an HTTP client, dependency injection, testing utilities, [internationalisation](/interview-question/how-do-you-handle-internationalization-i18n-in-angular) and a CLI as one coherent, versioned set. React, by contrast, is a rendering library and leaves most of those choices to you.

📌 **Interview term: AngularJS** — the original 1.x framework (2010). JavaScript, controllers, <code>$scope</code>, [two-way binding](/interview-question/how-does-two-way-binding-work-under-the-hood) everywhere, change detection by **dirty checking**. Its official support ended in January 2022 (source: the AngularJS <a href="https://docs.angularjs.org/misc/version-support-status" target="_blank" rel="noopener noreferrer">version support status page</a>).

📌 **Interview term: Angular** — the 2016 rewrite, sometimes still called "Angular 2+". TypeScript, components, templates compiled [ahead of time](/interview-question/what-is-the-difference-between-aot-and-jit-compilation), typed dependency injection, and (introduced in v16) **signals**.

## 3. Two Different Ways of Noticing Change

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="AngularJS checks every watcher on each digest, Angular updates only the bindings that depend on a changed signal">
  <defs>
    <marker id="ngjs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="28" text-anchor="middle">AngularJS digest loop</text>
  <rect class="d-box-muted" x="40" y="50" width="260" height="210" rx="12"/>
  <rect class="d-box" x="70" y="80" width="200" height="34" rx="8"/>
  <text class="d-sub" x="170" y="102" text-anchor="middle">watcher 1: compare old and new</text>
  <rect class="d-box" x="70" y="130" width="200" height="34" rx="8"/>
  <text class="d-sub" x="170" y="152" text-anchor="middle">watcher 2: compare old and new</text>
  <rect class="d-box" x="70" y="180" width="200" height="34" rx="8"/>
  <text class="d-sub" x="170" y="202" text-anchor="middle">watcher N: compare old and new</text>
  <text class="d-sub" x="170" y="242" text-anchor="middle">repeat until nothing changed</text>
  <text class="d-text" x="530" y="28" text-anchor="middle">Angular with signals</text>
  <rect class="d-box-accent" x="420" y="60" width="220" height="44" rx="10"/>
  <text class="d-text d-accent" x="530" y="87" text-anchor="middle">seats.set(4)</text>
  <path class="d-edge-accent" d="M 530 108 L 530 146" marker-end="url(#ngjs-arrow)"/>
  <rect class="d-box" x="420" y="152" width="220" height="44" rx="10"/>
  <text class="d-text" x="530" y="179" text-anchor="middle">total = computed(...)</text>
  <path class="d-edge-accent" d="M 530 200 L 530 222" marker-end="url(#ngjs-arrow)"/>
  <rect class="d-box" x="420" y="226" width="220" height="44" rx="10"/>
  <text class="d-text" x="530" y="253" text-anchor="middle">only that text node</text>
</svg>

On the left, every change triggers a pass over every watcher, repeated until a full pass finds nothing new (AngularJS gives up after 10 passes and throws its famous <code>infdig</code> error). On the right, a signal knows exactly which computations and template bindings read it, so a change marks only those for update.

## 4. Side by Side

| | AngularJS (1.x) | Angular (2016 onwards) |
| :--- | :--- | :--- |
| Language | JavaScript | TypeScript |
| Building block | Controller + <code>$scope</code> + [directives](/interview-question/what-is-a-directive-and-what-are-the-types) | Component (class + template) |
| Templates | Plain HTML parsed and linked at runtime | Compiled ahead of time into JavaScript instructions |
| Change detection | Digest loop, dirty-checking every watcher | Signals and compiled view refresh; [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) by default since v21 |
| Data flow | Two-way binding by default | One-way by default; two-way only where you ask for it |
| Dependency injection | By string name, broke under minification without annotations | By type or token, checked at compile time |
| Mobile and performance | Slows down as watcher count grows | Tree-shakable, built for large apps |
| Tooling | Community tools | Official CLI: generate, serve, build, test, update |
| Status | Support ended January 2022 | Actively maintained |

## 5. Verified: modern Angular in one component

The example below is a complete Angular 22 component. There is no <code>$scope</code>, no controller and no watcher: state is a <code>signal</code>, the derived total is a <code>computed</code>, and the template reads them by calling them.

Compiled with <code>ngc</code> (strict templates) and run in jsdom, then clicked and typed into. Each line is the text content of the root element, so adjacent elements run together:

\`\`\`
RENDERED    : Angular 22.2.3 Price per seat Add seat3 seats x 12 = 36
after click : Angular 22.2.3 Price per seat Add seat4 seats x 12 = 48
after input : Angular 22.2.3 Price per seat Add seat4 seats x 20 = 80
\`\`\`

The AngularJS equivalent would put <code>seats</code>, <code>price</code> and a <code>total()</code> function on <code>$scope</code>, and the digest loop would call <code>total()</code> on every pass, whether or not anything it uses had changed.

## 6. What "Angular" Means in 2026

Interviewers increasingly check whether your picture of Angular is current. These are the defaults a new project gets today:

- **Standalone by default (v19).** Components, directives and [pipes](/interview-question/what-are-pipes-in-angular) no longer need an <code>NgModule</code>; the <code>standalone</code> flag defaults to true. See [standalone components](/interview-question/what-are-standalone-components).
- **Signals (introduced in v16, the core APIs stable by v20).** <code>signal</code>, <code>computed</code>, <code>input()</code>, <code>output()</code> and <code>model()</code> are the modern way to hold and pass state. See [Angular Signals](/interview-question/what-are-angular-signals).
- **Zoneless by default (v21).** New apps do not load [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon). Verified: a bare <code>bootstrapApplication</code> on 22.2.3 injects a <code>NoopNgZone</code>.
- **OnPush by default (v22).** The 22.2.3 typings say it directly: <code>ChangeDetectionStrategy.OnPush = 0</code> with the note "OnPush is enabled by default", and the old <code>Default</code> value is deprecated in favour of <code>Eager</code>.
- **Vitest and esbuild in the CLI (v17 and v21).** <code>ng new</code> on CLI 22.2.3 produces a Vitest + jsdom test setup and the <code>@angular/build:application</code> esbuild builder.

📌 **Interview term: Release cadence** — Angular uses semantic versioning. Until v22 the team shipped a major every six months with 18 months of support (6 active, 12 LTS). In 2026 the team announced a yearly major from v22 onwards with 24 months of support (12 active, 12 LTS), so v23 is targeted for mid-2027 (source: <a href="https://angular.dev/reference/releases" target="_blank" rel="noopener noreferrer">angular.dev releases</a>). Check that page before quoting dates, because schedules shift.

## 7. Migrating from AngularJS

📌 **Interview term: ngUpgrade (hybrid app)** — the <code>@angular/upgrade</code> package lets AngularJS and Angular run in one page, so you can rewrite one screen or [service](/interview-question/what-is-a-service-and-why-use-it) at a time and downgrade new components for use in old templates.

In practice teams treat it as a rewrite with a safety net. Controllers become components, <code>$scope</code> watchers become signals or [RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18), services move to <code>@Injectable</code>, and <code>ng-repeat</code> becomes <code>@for</code>. Very little code survives unchanged, which is the honest answer when an interviewer asks "can we just upgrade?".

## 8. Common Pitfalls

- **Calling it "Angular 2".** The version-less name is the official one; "Angular 2" dates you to 2016 and confuses people who know the current version is 22.
- **Describing modern Angular as two-way bound and dirty-checked.** That is AngularJS. Modern Angular is one-way by default, compiled, and signal-driven.
- **Assuming Zone.js is always there.** New apps since v21 are zoneless, so a plain field changed inside <code>setTimeout</code> does not re-render. State the template reads should be a signal.
- **Quoting <code>ChangeDetectionStrategy.Default</code> as the default.** In v22 OnPush is the default and <code>Default</code> is a deprecated alias of <code>Eager</code>.
- **Thinking a migration is a version bump.** No <code>ng update</code> path exists from 1.x; the realistic options are a rewrite or a hybrid app.
- **Ignoring the support status.** AngularJS gets no official security fixes since January 2022; that is often the real business reason for the migration.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Angular is Google's TypeScript framework for building large single-page apps, with routing, forms, HTTP, DI and a CLI included."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key distinction:</strong> <span style="color:#f0e2c8;">"AngularJS is the 1.x framework; Angular is a 2016 ground-up rewrite. Same team and name, different architecture."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What changed:</strong> <span style="color:#f0e2c8;">"Controllers and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$scope</code> became components, runtime templates became AOT-compiled ones, and the digest loop gave way to compiled views and signals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Show you are current:</strong> <span style="color:#f0e2c8;">"Today a new app is standalone, zoneless and OnPush by default, with Vitest and an esbuild builder from the CLI."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close on migration:</strong> <span style="color:#f0e2c8;">"AngularJS support ended in January 2022, so moving off it is a rewrite, usually done screen by screen with an ngUpgrade hybrid app."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What was actually wrong with the digest loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its cost grew with the number of watchers, not with the size of the change, and it re-ran until stable, so one update could trigger several full passes. Big lists with many bindings became slow, and a watcher that kept changing produced the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">infdig</code> error after 10 passes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why TypeScript rather than JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Types power three core features: dependency injection resolves by class or token type, the template compiler type-checks bindings against the component, and decorators carry the metadata the compiler reads. It also scales better for the large teams Angular targets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate a large AngularJS app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bootstrap a hybrid app with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/upgrade</code>, move shared services first, then rewrite leaf screens and downgrade them into the old shell, working inwards until the AngularJS root can be removed. Freeze new features in the old code so the target stops moving.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Angular still relevant next to React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It wins where consistency matters more than freedom: large enterprise teams that want one blessed way to route, fetch, validate and test. The trade-off is a steeper learning curve and more framework concepts up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does zoneless mean, and why did it become the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Zone.js patched every async browser API so Angular could guess when to re-render. Zoneless apps drop that guesswork: signals, template events and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> tell Angular exactly when something changed, which means a smaller bundle and fewer wasted checks.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Framework** | Structure that calls your code and decides how the app is organised |
| **AngularJS** | The original 1.x framework; support ended January 2022 |
| **Angular** | The 2016 TypeScript rewrite, current major is 22 |
| **Digest loop** | AngularJS change detection: re-check every watcher until stable |
| **Signal** | A value that tracks who reads it, so only those readers update |
| **Batteries included** | Router, forms, HTTP, DI, testing and CLI ship together |
| **ngUpgrade** | Package for running AngularJS and Angular side by side during migration |
| **Release cadence** | How often majors ship and how long each is supported |

---
**Conclusion:** Angular and AngularJS share a name and a team, but not an architecture. AngularJS noticed change by walking every watcher in a digest loop; Angular compiles templates ahead of time, injects typed dependencies, and, as verified on 22.2.3, starts new apps zoneless and OnPush with signals telling it exactly what changed. That is why moving between them is a rewrite, usually done screen by screen in a hybrid app, and why a strong answer always describes the Angular of today rather than the Angular 2 of 2016.`,
    examples: [
      {
        label: "Signals and computed state in a standalone Angular 22 component",
        tech: "angular",
        runnable: true,
        code: `import { Component, VERSION, computed, signal } from "@angular/core";

// Modern Angular: a TypeScript class + decorator, typed state, no $scope.
@Component({
  selector: "app-root",
  template: \`
    <h3>Angular {{ version }}</h3>
    <label>
      Price per seat
      <input type="number" [value]="price()" (input)="price.set(+$any($event.target).value)" />
    </label>
    <button (click)="seats.update(n => n + 1)">Add seat</button>
    <p>{{ seats() }} seats x {{ price() }} = {{ total() }}</p>
  \`,
})
export class AppComponent {
  version = VERSION.full;
  // signal(): a value Angular can track. computed(): derived, cached, re-run only when an input changes.
  price = signal(12);
  seats = signal(3);
  total = computed(() => this.seats() * this.price());
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are components and modules in Angular?",
    seoDescription:
      "A component is a class plus template that owns part of the screen; an NgModule groups declarations. Why standalone components replaced most modules.",
    description: `**Question presented to candidate:**
"Walk me through what a component is in Angular, what an NgModule is, and whether a new Angular app still needs modules."

**What a strong answer should cover:**
- A **component** is a TypeScript class with \`@Component\` metadata: a **selector**, a **template**, optional **styles**, and the dependencies its template uses.
- An app is a **tree of components**; the root one is bootstrapped and the rest appear through their selectors.
- An **NgModule** (\`@NgModule\`) groups declarations and defines a **compilation context**: \`declarations\`, \`imports\`, \`exports\`, \`providers\`, \`bootstrap\`.
- Since v19, components, directives and pipes are **standalone by default** and list their own \`imports\`; NgModules are optional, not deprecated.
- Standalone and NgModule code interoperate: a standalone component can import an NgModule, and a module can import standalone components.
- Typical mistakes: declaring a standalone component, declaring a component in two modules, forgetting \`exports\`.

**Clarifying questions expected:**
- "Is this a new app, or an existing one built on NgModules?"
- "Do you want the template-compilation view, or how modules affect providers and lazy loading?"

**Code / implementation expected:** Yes — a standalone component tree, plus one NgModule-based component used from it.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — assumes basic TypeScript classes, no Angular required.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. Every output and error message quoted below was produced by compiling the code with <code>ngc</code> (strict templates) on Angular 22.2.3 and running it.

## 1. Why This Even Matters — A Story First

Think of a restaurant kitchen. Each **station** (grill, pastry, salad) owns one part of the meal: it has its own recipe, its own equipment, and a name the head chef calls out. That station is a **component**.

For years, Angular kitchens were also organised into **departments**. A department kept the official list of which stations belonged to it and which tools they were allowed to share. Want the pastry station to use the blowtorch? Check the department list. That department is an **NgModule**.

Modern Angular noticed that the department list was mostly paperwork. Each station can simply keep its own list of the tools it uses. That is a **standalone component**, and it is why a new Angular app rarely writes an NgModule at all, even though departments still exist for kitchens that were built around them.

## 2. Components

📌 **Interview term: Component** — a TypeScript class decorated with <code>@Component</code>. It controls one piece of the screen and is made of four things:

| Part | What it is |
| :--- | :--- |
| **Selector** | The custom tag that places it, for example <code>user-card</code> |
| **Template** | The HTML it renders, with bindings to the class |
| **Class** | State and behaviour: fields, [signals](/interview-question/what-are-angular-signals), methods |
| **Imports** | The other components, [directives](/interview-question/what-is-a-directive-and-what-are-the-types) and pipes its template uses |

📌 **Interview term: Decorator / metadata** — <code>@Component({...})</code> attaches configuration to the class. The Angular compiler reads it and turns the template into JavaScript instructions before the app ships.

An Angular app is a **tree of components**. One root component is started with <code>bootstrapApplication</code>; every other component appears because some template uses its selector.

## 3. NgModules

📌 **Interview term: NgModule** — a class decorated with <code>@NgModule</code> that groups related code and defines a **compilation context**: which selectors a template inside the module can resolve.

| Property | Meaning |
| :--- | :--- |
| <code>declarations</code> | Components, directives and pipes that **belong** to this module (non-standalone only) |
| <code>imports</code> | Other modules (or standalone pieces) whose exports these declarations may use |
| <code>exports</code> | What this module makes available to whoever imports it |
| <code>providers</code> | [Services](/interview-question/what-is-a-service-and-why-use-it) registered in the injector this module contributes to |
| <code>bootstrap</code> | The root component, in a module-based app |

📌 **Interview term: Standalone** — a component, directive or pipe that declares its own template dependencies in <code>imports</code> and belongs to no module. Since Angular 19 the <code>standalone</code> flag defaults to <code>true</code>, so you only write <code>standalone: false</code> for code that lives in a module.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="An NgModule declares and exports components, a standalone component imports what it needs directly">
  <defs>
    <marker id="cm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="26" text-anchor="middle">Module based</text>
  <rect class="d-box-muted" x="30" y="44" width="280" height="200" rx="12"/>
  <text class="d-text" x="170" y="70" text-anchor="middle">BadgeModule</text>
  <rect class="d-box" x="60" y="90" width="220" height="44" rx="8"/>
  <text class="d-sub" x="170" y="117" text-anchor="middle">declarations: LegacyBadge</text>
  <rect class="d-box" x="60" y="166" width="220" height="44" rx="8"/>
  <text class="d-sub" x="170" y="193" text-anchor="middle">exports: LegacyBadge</text>
  <text class="d-text" x="530" y="26" text-anchor="middle">Standalone</text>
  <rect class="d-box-accent" x="400" y="44" width="260" height="70" rx="12"/>
  <text class="d-text d-accent" x="530" y="72" text-anchor="middle">UserCardComponent</text>
  <text class="d-sub" x="530" y="96" text-anchor="middle">imports: InitialsPipe</text>
  <rect class="d-box" x="400" y="174" width="260" height="70" rx="12"/>
  <text class="d-text" x="530" y="202" text-anchor="middle">AppComponent</text>
  <text class="d-sub" x="530" y="226" text-anchor="middle">imports: UserCard, BadgeModule</text>
  <path class="d-edge-accent" d="M 530 170 L 530 120" marker-end="url(#cm-arrow)"/>
  <path class="d-edge-dashed" d="M 396 210 L 316 190" marker-end="url(#cm-arrow)"/>
</svg>

On the left, the module is the unit of reuse: it declares a component and must export it before anyone else can use the selector. On the right, each component is its own unit and imports exactly what its template needs, including, where useful, a whole NgModule.

## 4. Verified: both styles in one app

The example at the bottom has a standalone <code>UserCardComponent</code> (with a standalone pipe), a module-based <code>LegacyBadgeComponent</code> inside <code>BadgeModule</code>, and a root component that imports both. Compiled and run (the text content of the root, so the three elements run together):

\`\`\`
RENDERED: AL - Ada LovelaceGH - Grace Hopper[from a module]
\`\`\`

And the standalone default, read back with <code>reflectComponentType</code> on a component with no flag and one with <code>standalone: false</code>:

\`\`\`
Plain.isStandalone=true Mod.isStandalone=false
\`\`\`

## 5. Verified: the three mistakes the compiler catches

Each of these was compiled with <code>ngc</code> and fails the build with exactly this message:

| Mistake | Compiler error |
| :--- | :--- |
| Putting a [standalone component](/interview-question/what-are-standalone-components) in <code>declarations</code> | <code>NG6008: Component A is standalone, and cannot be declared in an NgModule. Did you mean to import it instead?</code> |
| Declaring one component in two modules | <code>NG6007: The Component 'A' is declared by more than one NgModule.</code> |
| Importing a module that declares but does not export the component | <code>NG8001: 'x-a' is not a known element</code> |

The third one is the classic "it is declared, why can the template not see it?" bug. Declaring makes a component usable **inside** its module; only <code>exports</code> makes it usable **outside**.

## 6. Component versus NgModule

| | Component | NgModule |
| :--- | :--- | :--- |
| Purpose | Renders part of the UI | Groups declarations, defines a compilation context |
| Has a template | Yes | No |
| Appears in the DOM | Yes, as its selector | Never |
| Lists dependencies in | <code>imports</code> (standalone) | <code>imports</code> + <code>declarations</code> |
| Registers services | <code>providers</code>, scoped to that component subtree | <code>providers</code>, in the module injector |
| Required in a new app | Yes | No (optional since standalone became the default) |

## 7. Where You Still Meet NgModules

- **Existing apps.** Most Angular code written before 2023 is module based. You need to read <code>declarations</code> and <code>exports</code> fluently.
- **Library bundles.** Some libraries still ship a module that exports a set of related components, so one import brings them all. A standalone component can import such a module directly, as the example does.
- **Providers from older libraries.** <code>importProvidersFrom(SomeModule)</code> pulls the providers out of a module for a standalone app's <code>bootstrapApplication</code> config.

For bootstrapping without any module, see [standalone bootstrapApplication](/interview-question/how-do-you-bootstrap-a-standalone-angular-application).

## 8. Common Pitfalls

- **Declaring a standalone component.** Standalone pieces are imported, never declared (NG6008).
- **Declaring one component in two modules.** A component belongs to exactly one module (NG6007). Put it in a shared module and export it, or make it standalone.
- **Forgetting <code>exports</code>.** Importing the module is not enough if the component was only declared (NG8001).
- **The giant SharedModule.** One module that exports everything makes every feature depend on everything and hides what a template really uses. Standalone imports make dependencies explicit per component.
- **Providers in a lazily loaded module.** They create a second instance in that module's child injector, which surprises people who expected a singleton. Prefer <code>providedIn: "root"</code>.
- **Thinking modules are deprecated.** They are optional, not deprecated; existing code keeps working and interoperates with standalone code.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define the component:</strong> <span style="color:#f0e2c8;">"A component is a class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Component</code> metadata: a selector, a template, styles, and the things its template uses. The app is a tree of them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define the module:</strong> <span style="color:#f0e2c8;">"An NgModule groups declarations and defines a compilation context through declarations, imports, exports and providers."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say what changed:</strong> <span style="color:#f0e2c8;">"Since v19 everything is standalone by default, so each component imports its own dependencies and a new app needs no modules."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Show interop:</strong> <span style="color:#f0e2c8;">"They mix: a standalone component can import an NgModule, which is how old libraries keep working."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name a real bug:</strong> <span style="color:#f0e2c8;">"The classic module bug is declaring a component but forgetting to export it, which fails with NG8001, not a known element."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">declarations</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">imports</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declarations are things this module owns; each non-standalone component is declared in exactly one module. Imports are other modules or standalone pieces whose exported items the declarations may use. Owning versus borrowing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are NgModules deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They are optional. The Angular team flipped the default to standalone in v19 and provides an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng generate @angular/core:standalone</code> migration, but module code still compiles and runs and can be mixed with standalone code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do services go without modules?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Injectable({ providedIn: "root" })</code>, which is a tree-shakable singleton. App-wide setup goes in the providers of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code>, and route-level providers go on the route definition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a component be in a module and also be standalone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not declared in one, no; that is error NG6008. But a module can <em style="color:#d8d8d8;">import</em> and re-export a standalone component, which is a common bridge during migration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you decide how big a component should be?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Split when a piece is reused, when it owns state nothing else needs, or when its template stops fitting in your head. Presentational components that take inputs and emit outputs are the easiest to test and reuse.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Component** | Class + template that owns part of the screen |
| **Selector** | The tag (or attribute) that places a component in a template |
| **Decorator / metadata** | Configuration the compiler reads from <code>@Component</code> or <code>@NgModule</code> |
| **NgModule** | Groups declarations and defines which selectors their templates can see |
| **Compilation context** | The set of components, directives and pipes a template may use |
| **Standalone** | Declares its own template dependencies; the default since v19 |

---
**Conclusion:** a component is the visible building block of an Angular app: a class with a selector, a template and the dependencies that template uses. An NgModule is an invisible grouping that used to define which selectors a template could see. Since v19 components are standalone by default and import what they need themselves, so new apps rarely write modules, yet, as verified on 22.2.3, the two styles still mix freely, and the compiler catches the classic module mistakes (NG6008, NG6007, NG8001) at build time.`,
    examples: [
      {
        label: "Standalone components, a standalone pipe, and an NgModule used side by side",
        tech: "angular",
        runnable: false,
        code: `import { Component, NgModule, Pipe, PipeTransform, input } from "@angular/core";

// ── The NgModule way (still supported) ─────────────────────────────────────
// standalone: false means "I belong to a module". The module declares it and
// exports it so other code can use it.
@Component({
  selector: "legacy-badge",
  standalone: false,
  template: \`<span class="badge">[{{ label }}]</span>\`,
})
export class LegacyBadgeComponent {
  label = "from a module";
}

@NgModule({
  declarations: [LegacyBadgeComponent],
  exports: [LegacyBadgeComponent],
})
export class BadgeModule {}

// ── The standalone way (the default since Angular 19) ──────────────────────
@Pipe({ name: "initials" })
export class InitialsPipe implements PipeTransform {
  transform(name: string): string {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase();
  }
}

@Component({
  selector: "user-card",
  imports: [InitialsPipe], // a standalone component lists what its template uses
  template: \`<div class="card">{{ name() | initials }} - {{ name() }}</div>\`,
})
export class UserCardComponent {
  name = input.required<string>();
}

// The root component imports a standalone component AND a whole NgModule.
@Component({
  selector: "app-root",
  imports: [UserCardComponent, BadgeModule],
  template: \`
    <user-card name="Ada Lovelace" />
    <user-card name="Grace Hopper" />
    <legacy-badge />
  \`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are standalone components?",
    seoDescription:
      "Standalone components list their own imports instead of belonging to an NgModule. The default since Angular 19, with lazy loadComponent and bootstrap.",
    description: `**Question presented to candidate:**
"We are starting a new Angular 22 app. What is a standalone component, why is it the default now, and what does it change about how we bootstrap and lazy load?"

**What a strong answer should cover:**
- A standalone component **declares its own template dependencies** in \`imports\` and belongs to no NgModule.
- **Default since v19**: the \`standalone\` flag is \`true\` unless you write \`standalone: false\`; the same applies to directives and pipes.
- Bootstrapping uses **\`bootstrapApplication(App, appConfig)\`**, with app-wide providers (\`provideRouter\`, \`provideHttpClient\`) in \`appConfig\`.
- Lazy loading works per component with **\`loadComponent\`**, no wrapper module needed.
- Benefits: less boilerplate, dependencies visible per file, better tree-shaking, simpler tests (\`imports: [Component]\` in TestBed).
- Interop with NgModules in both directions, and an automated migration (\`ng generate @angular/core:standalone\`).

**Clarifying questions expected:**
- "Is there an existing NgModule codebase we need to interoperate with?"
- "Do you want me to cover lazy loading and providers, or only the component itself?"

**Code / implementation expected:** Yes — a standalone component that imports a pipe, a directive and a child component.`,
    answer: `**Target Audience:** Developers preparing for an Angular interview who know what a component is and have seen, or heard of, NgModules.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Everything under a "Verified" heading was compiled with <code>ngc</code> on Angular 22.2.3 and run; the lazy-loading log in section 5 came from a real <code>provideRouter</code> setup.

## 1. Why This Even Matters — A Story First

Picture packing for a trip. The old way, a travel agent kept one master list for your whole family: who may use the hair dryer, who may borrow the charger. Before packing a sock you had to check the family list. The new way, each person packs their own bag with exactly what they need. You can see everything a person depends on by opening their bag, and if one person stays home, their bag simply does not travel.

An [NgModule](/interview-question/what-are-components-and-modules-in-angular) was the family list. A **standalone component** is a packed bag: open the file, and the <code>imports</code> array tells you every component, directive and pipe its template uses. Nothing hidden, nothing borrowed through a list somewhere else.

## 2. The Core Idea

📌 **Interview term: Standalone component** — a component that lists its own template dependencies in the <code>imports</code> property of <code>@Component</code> and is not declared in any NgModule.

\`\`\`ts
@Component({
  selector: "cart-line",
  imports: [PluralPipe, CurrencyPipe, HighlightDirective],
  template: \`...\`,
})
export class CartLineComponent {}
\`\`\`

📌 **Interview term: Standalone by default** — since Angular 19 the <code>standalone</code> flag defaults to <code>true</code> for components, [directives](/interview-question/what-is-a-directive-and-what-are-the-types) and pipes. You only write it when opting **out**: <code>standalone: false</code> for code that is declared in a module. Verified on 22.2.3 with <code>reflectComponentType</code>: a component with no flag reports <code>isStandalone=true</code>.

What can go in <code>imports</code>:

| You can import | Example |
| :--- | :--- |
| Standalone components | <code>CartLineComponent</code> |
| Standalone directives | <code>HighlightDirective</code>, <code>RouterLink</code>, <code>NgClass</code> |
| Standalone pipes | <code>CurrencyPipe</code>, <code>AsyncPipe</code>, your own pipes |
| Whole NgModules | <code>FormsModule</code>, <code>ReactiveFormsModule</code>, older library modules |

## 3. How the Pieces Connect

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="AppComponent imports CartLineComponent, which imports a pipe, a currency pipe and a directive">
  <defs>
    <marker id="sa-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="250" y="20" width="200" height="50" rx="10"/>
  <text class="d-text" x="350" y="50" text-anchor="middle">AppComponent</text>
  <path class="d-edge-accent" d="M 350 74 L 350 104" marker-end="url(#sa-arrow)"/>
  <rect class="d-box-accent" x="230" y="110" width="240" height="50" rx="10"/>
  <text class="d-text d-accent" x="350" y="140" text-anchor="middle">CartLineComponent</text>
  <path class="d-edge" d="M 290 164 L 140 196" marker-end="url(#sa-arrow)"/>
  <path class="d-edge" d="M 350 164 L 350 196" marker-end="url(#sa-arrow)"/>
  <path class="d-edge" d="M 410 164 L 560 196" marker-end="url(#sa-arrow)"/>
  <rect class="d-box" x="50" y="200" width="180" height="44" rx="8"/>
  <text class="d-sub" x="140" y="227" text-anchor="middle">PluralPipe</text>
  <rect class="d-box" x="260" y="200" width="180" height="44" rx="8"/>
  <text class="d-sub" x="350" y="227" text-anchor="middle">CurrencyPipe</text>
  <rect class="d-box" x="470" y="200" width="180" height="44" rx="8"/>
  <text class="d-sub" x="560" y="227" text-anchor="middle">HighlightDirective</text>
</svg>

Each arrow is an entry in an <code>imports</code> array. The root component only knows about <code>CartLineComponent</code>; it never hears about the pipes and the directive, because those are the cart line's private business.

## 4. Verified: a standalone component tree

The full example is at the bottom. Compiled and run, then the add button was clicked (text content of the root, so elements run together):

\`\`\`
RENDERED   : Cart1 item - $9.50add
after click: Cart2 items - $19.00add
highlight bg: rgb(255, 243, 196)
\`\`\`

And what happens if you forget an import. With the child removed from <code>imports</code>, the AOT build fails:

\`\`\`
error NG8001: 'hello-chip' is not a known element:
1. If 'hello-chip' is an Angular component, then verify that it is included in the '@Component.imports' of this component.
\`\`\`

The in-browser JIT playground is more forgiving in the wrong way: the same file rendered an empty page with no build error. That is one more reason the real project build, with strict templates, is the thing to trust.

## 5. Bootstrapping and Lazy Loading Without Modules

📌 **Interview term: bootstrapApplication** — starts an app from a standalone root component. App-wide [services](/interview-question/what-is-a-service-and-why-use-it) and features are passed as **providers** in an <code>ApplicationConfig</code>, which <code>ng new</code> puts in <code>app.config.ts</code>:

\`\`\`ts
// main.ts
bootstrapApplication(App, appConfig);

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes)],
};
\`\`\`

That is, line for line, what Angular CLI 22.2.3 generated for a new project.

📌 **Interview term: loadComponent** — lazy-loads a single standalone component for a route, so its code ships in a separate chunk fetched on first navigation:

\`\`\`ts
export const routes: Routes = [
  { path: "", component: HomePage },
  { path: "reports", loadComponent: () => import("./reports").then((m) => m.ReportsPage) },
];
\`\`\`

Verified with <code>provideRouter</code> (the dynamic import was simulated so the test fits in one file, with a log line inside <code>loadComponent</code>):

\`\`\`
start   : Reportshome
  loadComponent() called: fetching the reports chunk now
clicked : Reportsreports (lazy)
\`\`\`

The loader did not run at startup, only when the link was clicked. Before standalone, the same thing needed a whole lazily loaded NgModule wrapping the page. See [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular).

## 6. Why It Became the Default

| | NgModule era | Standalone |
| :--- | :--- | :--- |
| Where a template's dependencies are listed | In some module, often a different file | In the component itself |
| Lazy loading a page | <code>loadChildren</code> + a feature module | <code>loadComponent</code> |
| Testing a component | Recreate the module setup in [TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed) | <code>imports: [TheComponent]</code> |
| Unused code | Kept if any import of the module exists | Easier for the build to drop |
| Learning curve | Components **and** modules | Components only |

📌 **Interview term: Standalone migration** — <code>ng generate @angular/core:standalone</code> converts an existing module-based app in steps: convert declarations, remove unnecessary modules, switch to <code>bootstrapApplication</code>.

## 7. Common Pitfalls

- **Forgetting an import.** The template uses <code>&lt;hello-chip /&gt;</code> but the component is not in <code>imports</code>; AOT fails with NG8001.
- **Importing <code>CommonModule</code> out of habit.** With built-in <code>@if</code> and <code>@for</code>, most templates need nothing from it. Import the specific pipe or directive you use.
- **Putting a standalone component in <code>declarations</code>.** It is imported, never declared (NG6008).
- **Expecting providers on a component to be global.** <code>providers</code> on a standalone component are scoped to that component subtree. App-wide providers belong in <code>appConfig</code>, or use <code>providedIn: "root"</code>.
- **Writing <code>standalone: true</code> everywhere.** It is the default since v19; the v19 migration removes it.
- **Mixing up <code>loadComponent</code> and <code>loadChildren</code>.** The first loads one component, the second loads a set of child routes.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A standalone component lists its own template dependencies in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">imports</code> instead of being declared in an NgModule."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Current status:</strong> <span style="color:#f0e2c8;">"It has been the default since Angular 19, for components, directives and pipes. You write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">standalone: false</code> only to opt out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. App level:</strong> <span style="color:#f0e2c8;">"You start the app with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code> and pass providers like the router in an app config."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lazy loading:</strong> <span style="color:#f0e2c8;">"A route can lazy-load a single component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadComponent</code>, no feature module needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it is better:</strong> <span style="color:#f0e2c8;">"Dependencies are visible in each file, tests just import the component, and it still interoperates with NgModules for older code."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a standalone component use an NgModule-based library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Put the module in the component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">imports</code> and its exported components become usable. If the module also registers providers, pull those into the app with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">importProvidersFrom</code> in the app config.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do standalone components make bundles smaller?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They make it easier. Each component pulls in only what it imports, so the build can see what is unused and lazy chunks can be split per component. The size win depends on the app; the reliable win is that the dependency graph is explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a standalone component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Import it into the testing module: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.configureTestingModule({ imports: [CartLineComponent] })</code>. Its own imports come with it. That is exactly the spec <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng new</code> generates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where did providers go if there is no AppModule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> of the app config passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code>, as provider functions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideRouter</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient</code>; route-level providers go on the route.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should we migrate a big module-based app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no deadline, since modules are not deprecated. The schematic does most of the mechanical work, so teams usually run it feature by feature when they are already touching that code, and write all new code standalone.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Standalone component** | Lists its own template dependencies; belongs to no module |
| **imports** | The components, directives, pipes or modules a template uses |
| **bootstrapApplication** | Starts an app from a standalone root component |
| **ApplicationConfig** | The providers passed at bootstrap (router, HTTP, and so on) |
| **loadComponent** | Lazy-loads one standalone component for a route |
| **Standalone migration** | The schematic that converts a module-based app |

---
**Conclusion:** a standalone component carries its own dependency list in <code>imports</code> instead of relying on an NgModule, and since Angular 19 that is simply how components, directives and pipes are made. Apps start with <code>bootstrapApplication</code> and an app config, routes lazy-load single components with <code>loadComponent</code>, and tests import the component directly. As verified on 22.2.3, a missing import is a build error (NG8001), which is the main thing standalone gives you: every dependency is visible, and checked, in the file that uses it.`,
    examples: [
      {
        label: "A standalone component importing a pipe, a directive and a built-in pipe",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, ElementRef, Pipe, PipeTransform, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";

// Three standalone building blocks. None of them sets standalone: true
// because, since Angular 19, that is the default.
@Pipe({ name: "plural" })
export class PluralPipe implements PipeTransform {
  transform(n: number, word: string): string {
    return \`\${n} \${word}\${n === 1 ? "" : "s"}\`;
  }
}

@Directive({ selector: "[appHighlight]" })
export class HighlightDirective {
  constructor() {
    inject(ElementRef<HTMLElement>).nativeElement.style.background = "#fff3c4";
  }
}

@Component({
  selector: "cart-line",
  // The component declares its own template dependencies. Nothing else
  // has to know about PluralPipe or CurrencyPipe.
  imports: [PluralPipe, CurrencyPipe, HighlightDirective],
  template: \`<p appHighlight>{{ qty() | plural: "item" }} - {{ qty() * 9.5 | currency: "USD" }}</p>
    <button (click)="qty.update(n => n + 1)">add</button>\`,
})
export class CartLineComponent {
  qty = signal(1);
}

@Component({
  selector: "app-root",
  imports: [CartLineComponent], // import the component itself, not a module
  template: \`<h3>Cart</h3><cart-line />\`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the types of data binding in Angular?",
    seoDescription:
      "Interpolation, property, attribute, class and style, event and two-way binding in Angular, with the compiled instructions each one becomes.",
    description: `**Question presented to candidate:**
"List the kinds of data binding Angular templates support, say which direction each one goes, and explain what \`[(ngModel)]\` actually expands to."

**What a strong answer should cover:**
- **Interpolation** \`{{ }}\`: component to text, always escaped (safe against HTML injection).
- **Property binding** \`[prop]\`: component to a **DOM property** (not an HTML attribute).
- **Attribute, class and style bindings**: \`[attr.x]\`, \`[class.x]\`, \`[style.x]\` for things that are not properties, or for single classes and styles.
- **Event binding** \`(event)\`: DOM or component events to a handler, with \`$event\` as the payload.
- **Two-way binding** \`[(x)]\`: sugar for \`[x]\` plus \`(xChange)\`, which works with a writable signal or a field.
- The direction model: one-way by default, two-way only where you write it; property versus attribute is the classic trap.

**Clarifying questions expected:**
- "Do you also want how this works with signals, or the template syntax only?"

**Code / implementation expected:** Yes — one template using every binding type, plus what the compiler turns it into.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — assumes HTML and a little TypeScript.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The outputs, compiler errors and the generated instructions quoted below all came from compiling the code with <code>ngc</code> on Angular 22.2.3 and running it in jsdom.

## 1. Why This Even Matters — A Story First

Think of a component as a shop and the template as its shop window. Some things only travel **outwards**: the price tag in the window shows whatever the shop decides (that is a one-way binding into the template). Some things only travel **inwards**: a customer rings the bell and the shopkeeper reacts (that is an event). And occasionally you want a whiteboard in the window that both the shop and the passer-by can write on, and both always see the same words (that is two-way binding).

Data binding is just the set of wires between the class and its template, and the interview question is really: **which wire goes which way?**

## 2. The Five Bindings at a Glance

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Interpolation, property, attribute class and style bindings flow from component to template, event binding flows back, two-way goes both ways">
  <defs>
    <marker id="db-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="170" height="220" rx="12"/>
  <text class="d-text d-accent" x="115" y="140" text-anchor="middle">Component</text>
  <text class="d-sub" x="115" y="162" text-anchor="middle">class and signals</text>
  <rect class="d-box-muted" x="500" y="40" width="170" height="220" rx="12"/>
  <text class="d-text" x="585" y="140" text-anchor="middle">Template</text>
  <text class="d-sub" x="585" y="162" text-anchor="middle">DOM</text>
  <path class="d-edge-accent" d="M 206 70 L 494 70" marker-end="url(#db-arrow)"/>
  <text class="d-sub" x="350" y="60" text-anchor="middle">interpolation</text>
  <path class="d-edge-accent" d="M 206 120 L 494 120" marker-end="url(#db-arrow)"/>
  <text class="d-sub" x="350" y="110" text-anchor="middle">[property]</text>
  <path class="d-edge-accent" d="M 206 170 L 494 170" marker-end="url(#db-arrow)"/>
  <text class="d-sub" x="350" y="160" text-anchor="middle">[attr.x] [class.x] [style.x]</text>
  <path class="d-edge" d="M 494 216 L 206 216" marker-end="url(#db-arrow)"/>
  <text class="d-sub" x="350" y="206" text-anchor="middle">(event)</text>
  <path class="d-edge-dashed" d="M 206 252 L 494 252" marker-end="url(#db-arrow)"/>
  <path class="d-edge-dashed" d="M 494 246 L 206 246" marker-end="url(#db-arrow)"/>
  <text class="d-sub" x="350" y="276" text-anchor="middle">[(two-way)]</text>
</svg>

Three of the five go from the component into the template, one comes back out, and two-way is literally the pair of them combined.

## 3. Each Binding in One Line

📌 **Interview term: Interpolation** — <code>{{ expression }}</code> inside text. The result is converted to a string and inserted as **text**, so it is always escaped.

📌 **Interview term: Property binding** — <code>[disabled]="isBusy()"</code> sets the element **DOM property**, not the HTML attribute. It also feeds component inputs: <code>[user]="currentUser"</code>.

📌 **Interview term: Attribute, class and style binding** — <code>[attr.aria-label]</code> for attributes with no matching property; <code>[class.active]</code> to toggle one class; <code>[style.width.px]</code> for one style.

📌 **Interview term: Event binding** — <code>(click)="save()"</code> runs a statement when the event fires. <code>$event</code> is the DOM event, or the emitted value for a [component output](/interview-question/how-do-child-components-emit-events-to-parents).

📌 **Interview term: Two-way binding** — <code>[(value)]="x"</code>, nicknamed **banana in a box**. It is shorthand for <code>[value]="x"</code> plus <code>(valueChange)="x = $event"</code>, so it only works where an input named <code>value</code> is paired with an output named <code>valueChange</code>.

| Syntax | Direction | Target |
| :--- | :--- | :--- |
| <code>{{ x }}</code> | Component to view | Text node |
| <code>[prop]="x"</code> | Component to view | DOM property or component input |
| <code>[attr.name]="x"</code> | Component to view | HTML attribute |
| <code>[class.name]="cond"</code> | Component to view | One CSS class |
| <code>[style.prop]="x"</code> | Component to view | One inline style |
| <code>(event)="handler($event)"</code> | View to component | DOM event or component output |
| <code>[(x)]="value"</code> | Both | Input <code>x</code> + output <code>xChange</code> |

## 4. Verified: every binding in one template

The full example is at the bottom. It was compiled and run, then the driver typed into the field, clicked, and ticked the box:

\`\`\`
typed Grace     : Hello, Grace | aria-label = greeting for Grace
clicked Greet   : greeted Grace
ticked loud     : class = loud | font-weight = 700
cleared field   : button.disabled = true
\`\`\`

Typing went into the signal through two-way binding, the heading and the <code>aria-label</code> updated through interpolation and attribute binding, the click ran the event handler, and emptying the field disabled the button through property binding.

## 5. Verified: what the compiler turns them into

Angular does not interpret templates at runtime. The [AOT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) compiler turns each binding into an instruction call. These lines are copied from the <code>ngc</code> output for the example:

\`\`\`js
i0.ɵɵlistener("click", function ... { return ctx.greet() })
i0.ɵɵproperty("disabled", ctx.name().length === 0)
i0.ɵɵattribute("aria-label", "greeting for " + ctx.name())
i0.ɵɵclassProp("loud", ctx.loud())
i0.ɵɵstyleProp("font-weight", ctx.loud() ? 700 : 400)
i0.ɵɵtextInterpolate(ctx.log())
i0.ɵɵtwoWayProperty("ngModel", ctx.name)
i0.ɵɵtwoWayListener("ngModelChange", function ...($event) { i0.ɵɵtwoWayBindingSet(ctx.name, $event) || (ctx.name = $event) })
\`\`\`

The last line is the interesting one. <code>twoWayBindingSet</code> calls <code>.set()</code> when the target is a writable signal, and only otherwise falls back to plain assignment. That is why <code>[(ngModel)]="name"</code> works whether <code>name</code> is a signal or a field. More on that in [how two-way binding works under the hood](/interview-question/how-does-two-way-binding-work-under-the-hood).

## 6. Verified: property versus attribute

This is the trap interviewers like most. An HTML **attribute** is the initial value written in markup; a DOM **property** is the live value on the element object.

\`\`\`
<input value="initial" />, then the user types "typed":
attribute: initial | property: typed
\`\`\`

Property binding writes the property, so it reflects the live state. For attributes that have no property of the same name, you must use <code>[attr.]</code>. The textbook case is <code>colspan</code>:

\`\`\`
<td [colspan]="2">
error NG8002: Can't bind to 'colspan' since it isn't a known property of 'td'.
\`\`\`

<code>[attr.colspan]="2"</code> compiles, as does the camel-case property <code>[colSpan]="2"</code>.

## 7. Verified: interpolation is escaped

Binding the string <code>&lt;b&gt;bold&lt;/b&gt;&lt;img src=x onerror="alert(1)"&gt;</code> two ways:

\`\`\`
interpolation innerHTML: &lt;b&gt;bold&lt;/b&gt;&lt;img src=x onerror="alert(1)"&gt;
[innerHTML]  innerHTML: <b>bold</b><img src="x">
WARNING: sanitizing HTML stripped some content
\`\`\`

Interpolation inserts text, so markup is shown, never run. <code>[innerHTML]</code> does insert HTML, but Angular sanitises it first and strips the <code>onerror</code> handler. See [DomSanitizer and XSS](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev).

## 8. Common Pitfalls

- **Binding an attribute as a property.** <code>[colspan]</code>, <code>[aria-label]</code> and <code>[data-id]</code> need <code>[attr.]</code> (NG8002 otherwise).
- **Writing a literal without brackets.** <code>disabled="false"</code> sets the attribute to the string "false", which still disables the button. Use <code>[disabled]="false"</code>.
- **Calling expensive methods in bindings.** <code>{{ total() }}</code> is cheap when <code>total</code> is a <code>computed</code> signal, but a plain method doing real work runs on every check. See [computed versus methods in templates](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).
- **Expecting <code>[(x)]</code> on any input.** It needs a matching <code>xChange</code> output, or a <code>model()</code> input, on the target.
- **Forgetting <code>FormsModule</code> for <code>ngModel</code>.** Without it the compiler reports that it cannot bind to <code>ngModel</code>.
- **Mutating state in a binding expression.** Template expressions should read, not write; side effects belong in event handlers.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it by direction:</strong> <span style="color:#f0e2c8;">"Angular bindings are one-way by default: three kinds go from the component into the view, one comes back, and two-way combines them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Into the view:</strong> <span style="color:#f0e2c8;">"Interpolation for text, square brackets for DOM properties and inputs, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attr.</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class.</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style.</code> for attributes, one class or one style."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Out of the view:</strong> <span style="color:#f0e2c8;">"Parentheses bind events, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$event</code> as the payload, for DOM events and component outputs alike."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Two-way:</strong> <span style="color:#f0e2c8;">"Banana in a box is sugar for a property binding plus an xChange event. With a writable signal the compiler calls set for you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">"Property binding targets the DOM property, not the attribute, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">colspan</code> needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.colspan]</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{{ x }}</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[textContent]="x"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In effect, none for a single value: both write text. Interpolation is easier to read and lets you mix literal text with several expressions; it compiles to a text interpolation instruction rather than a property write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is two-way binding bad for performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in modern Angular. It is just one property binding and one event listener. The AngularJS reputation came from the digest loop, which dirty-checked every binding, not from two-way binding as such.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make your own component support <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[(value)]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value = model()</code>, which creates the input and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChange</code> output together, or pair an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Input() value</code> with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output() valueChange</code> by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you bind to several classes at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[class]="{ active: isActive(), muted: isMuted() }"</code> takes an object, array or string, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[style]</code> takes an object of styles. These replaced most uses of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngClass</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngStyle</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is interpolation safe from XSS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it always produces text, so tags are displayed rather than parsed. Binding to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[innerHTML]</code> is sanitised; bypassing that with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bypassSecurityTrustHtml</code> is where real XSS bugs come from.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Interpolation** | <code>{{ }}</code>, inserts an escaped string as text |
| **Property binding** | <code>[prop]</code>, sets a DOM property or component input |
| **Attribute binding** | <code>[attr.x]</code>, sets an HTML attribute |
| **Class / style binding** | <code>[class.x]</code>, <code>[style.x]</code>, toggles one class or style |
| **Event binding** | <code>(event)</code>, runs a statement when an event fires |
| **Two-way binding** | <code>[(x)]</code>, property binding plus <code>xChange</code> event |
| **$event** | The event object, or an output emitted value |

---
**Conclusion:** Angular has five kinds of binding, and the clean way to explain them is by direction: interpolation, property binding and attribute, class and style bindings carry data from the component into the view; event binding carries it back; two-way binding is literally the pair of them. As verified on 22.2.3, each one compiles to its own instruction, two-way binding calls <code>set()</code> on a writable signal, property binding targets the live DOM property rather than the attribute, and interpolation is always escaped.`,
    examples: [
      {
        label: "Every binding type in one template",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-root",
  imports: [FormsModule], // needed only for [(ngModel)]
  template: \`
    <!-- 1. Interpolation: component to text -->
    <h3>Hello, {{ name() }}</h3>

    <!-- 2. Property binding: component to a DOM property -->
    <button [disabled]="name().length === 0" (click)="greet()">Greet</button>

    <!-- 3. Attribute, class and style bindings: also one-way, into the element -->
    <p [attr.aria-label]="'greeting for ' + name()"
       [class.loud]="loud()"
       [style.font-weight]="loud() ? 700 : 400">{{ log() }}</p>

    <!-- 4. Event binding: DOM event to component -->
    <label><input type="checkbox" (change)="loud.set(!loud())" /> loud</label>

    <!-- 5. Two-way binding: [property] + (event) in one. A writable signal works directly. -->
    <input [(ngModel)]="name" />
  \`,
})
export class AppComponent {
  name = signal("Ada");
  loud = signal(false);
  log = signal("not greeted yet");
  greet() {
    this.log.set(\`greeted \${this.name()}\`);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do child components emit events to parents?",
    seoDescription:
      "Children send data up with output() or @Output() EventEmitter; the parent listens with (event). Verified: emit is synchronous and does not bubble.",
    description: `**Question presented to candidate:**
"A star-rating component sits inside a product page. When the user picks a rating, how does the child tell the parent, and what exactly happens when it does?"

**What a strong answer should cover:**
- Data flows **down through inputs** and **up through outputs**; a child never reaches into its parent.
- Modern API: \`rated = output<Rating>()\` and \`this.rated.emit(value)\`; the decorator form is \`@Output() rated = new EventEmitter<Rating>()\`.
- The parent listens with event-binding syntax \`(rated)="onRated($event)"\`; \`$event\` is the emitted value, not a DOM event.
- \`emit()\` is **synchronous**: the parent handler runs before \`emit()\` returns.
- Outputs are **not DOM events**: they do not bubble to grandparents.
- An input named \`x\` plus an output named \`xChange\` enables \`[(x)]\` two-way binding; \`model()\` creates both at once.

**Clarifying questions expected:**
- "Is the receiver the direct parent, or something further up or a sibling?" (the answer changes to a shared service)

**Code / implementation expected:** Yes — a child with an output and a parent handling it.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview who knows what a component and an input are.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The call order in section 4 and the bubbling test in section 5 were produced by compiling the examples with <code>ngc</code> on Angular 22.2.3 and clicking through them in jsdom.

## 1. Why This Even Matters — A Story First

A child at a school play does not walk into the audience and rearrange the seats when she finishes her line. She raises her hand. Whoever is responsible for her, the teacher standing in the wings, notices the raised hand and decides what to do.

Angular components work the same way. A child component should not know, or care, what page it sits in. When something happens that the outside world might care about, it raises its hand: it **emits an output**. The parent, which owns the state, decides what that means. Because the child only raises its hand, you can drop it into any page and it keeps working.

## 2. The Core Idea

📌 **Interview term: Output** — a property on a child component that the parent can listen to. Declared in modern Angular with the <code>output()</code> function:

\`\`\`ts
rated = output<Rating>();          // declare
this.rated.emit({ item, stars });  // fire
\`\`\`

📌 **Interview term: Event binding** — the parent listens using the same parentheses syntax as a DOM event:

\`\`\`html
<star-rating item="Tea" (rated)="onRated($event)" />
\`\`\`

📌 **Interview term: $event** — inside an output binding, <code>$event</code> is exactly the value the child passed to <code>emit()</code>. For a DOM event such as <code>(click)</code> it is the browser event object instead.

📌 **Interview term: Unidirectional data flow** — inputs carry data down, outputs carry notifications up. The parent stays the single owner of the state, and the child stays reusable.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Parent passes item down as an input, child emits rated up as an output, parent updates its own state">
  <defs>
    <marker id="ce-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="260" height="64" rx="12"/>
  <text class="d-text d-accent" x="330" y="48" text-anchor="middle">Parent: AppComponent</text>
  <text class="d-sub" x="330" y="70" text-anchor="middle">owns last = signal(...)</text>
  <rect class="d-box" x="200" y="166" width="260" height="64" rx="12"/>
  <text class="d-text" x="330" y="194" text-anchor="middle">Child: StarRating</text>
  <text class="d-sub" x="330" y="216" text-anchor="middle">knows nothing about the parent</text>
  <path class="d-edge-accent" d="M 270 90 L 270 160" marker-end="url(#ce-arrow)"/>
  <text class="d-sub" x="150" y="130" text-anchor="middle">input: item</text>
  <path class="d-edge" d="M 390 160 L 390 90" marker-end="url(#ce-arrow)"/>
  <text class="d-sub" x="530" y="130" text-anchor="middle">output: rated</text>
</svg>

The item travels down as an input. The rating travels up as an output. The child never holds a reference to the parent.

## 3. Two Ways to Declare an Output

| | <code>output()</code> function | <code>@Output()</code> decorator |
| :--- | :--- | :--- |
| Declaration | <code>rated = output&lt;Rating&gt;()</code> | <code>@Output() rated = new EventEmitter&lt;Rating&gt;()</code> |
| Fire | <code>this.rated.emit(v)</code> | <code>this.rated.emit(v)</code> |
| Type | <code>OutputEmitterRef</code> | <code>EventEmitter</code>, a subclass of [RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18) <code>Subject</code> |
| Status | The modern default, stable since v19 | Still supported, common in existing code |
| Alias | <code>output({ alias: "picked" })</code> | <code>@Output("picked")</code> |

The parent side is identical for both. The deeper comparison, including <code>outputFromObservable()</code>, is in [output() vs @Output() EventEmitter](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs).

## 4. Verified: emit is synchronous

The first example logs inside the child before and after <code>emit()</code>, and inside the parent handler. Clicking the Tea rating of 4 printed:

\`\`\`
click Tea 4:
  child emits rated(Tea, 4)
  parent handler received {"item":"Tea","stars":4}
  child: emit() has returned
rendered: Coffee:12345Tea:12345Last: Tea got 4 stars
\`\`\`

The parent handler ran **in the middle** of the child method, before <code>emit()</code> returned. So code after <code>emit()</code> in the child already sees whatever the parent did synchronously. There is no queue and no next tick.

## 5. Verified: outputs do not bubble

Wrapping the child in a <code>div</code> that also listens for <code>(rated)</code>, then clicking a star:

\`\`\`
  child emits rated(Coffee, 2)
  parent handler received {"item":"Coffee","stars":2}
  child: emit() has returned
rendered: Coffee:12345Tea:12345Last: Coffee got 2 stars bubbled=0
\`\`\`

<code>bubbled</code> stayed 0. An output is a direct subscription between a parent template and one child instance, not a DOM event, so a grandparent cannot catch it on the way up. To reach further than one level, re-emit from each level, or move the shared state into a [service](/interview-question/what-is-a-service-and-why-use-it), as in [passing data between siblings](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-).

## 6. Verified: the decorator form and two-way binding

The second example uses <code>@Input() liked</code> with <code>@Output() likedChange</code>. Because the names follow the <code>x</code> / <code>xChange</code> pattern, the parent can write <code>[(liked)]="a"</code>:

\`\`\`
[app] RENDERED: Like post ALike post BA liked: false | B liked: false
after A: Unlike post ALike post BA liked: true | B liked: false
after B: Unlike post AUnlike post BA liked: true | B liked: true
\`\`\`

The same output came from the playground mode, so that example is runnable. Post A uses the banana-in-a-box shorthand; post B spells out the [property binding](/interview-question/what-are-the-types-of-data-binding-in-angular) and event binding it expands to. The modern equivalent of the pair is a single <code>model()</code> input, covered in [model() two-way signal binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

## 7. Common Pitfalls

- **Mutating an input instead of emitting.** Assigning <code>this.liked = true</code> in the child changes only the child copy; the parent still holds the old value and will overwrite it on the next update.
- **Expecting bubbling.** Verified above: a grandparent never sees a child output.
- **Naming outputs like DOM events.** An output called <code>click</code> or <code>change</code> fires alongside the real DOM event of the same name on the host. Verified: an output named <code>click</code> made one click run the parent handler twice, once with the emitted string and once with a <code>PointerEvent</code> that bubbled up from the inner button.
- **Using an output to ask the parent a question.** Outputs are notifications, not function calls with return values. If the child needs data, it should receive it as an input.
- **Subscribing to an <code>EventEmitter</code> in code.** It works because it is a Subject, but it couples you to RxJS internals; prefer template binding, or <code>outputToObservable()</code> when you really need a stream.
- **Emitting during render.** Emitting from a getter or a template expression changes parent state while Angular is checking it, which triggers <code>ExpressionChangedAfterItHasBeenChecked</code> in development.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">"Data goes down through inputs and comes up through outputs. The child never touches the parent directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The API:</strong> <span style="color:#f0e2c8;">"In the child I declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rated = output&lt;Rating&gt;()</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code>. Older code uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Output()</code> with an EventEmitter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The parent:</strong> <span style="color:#f0e2c8;">"The parent binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(rated)="onRated($event)"</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$event</code> is the emitted value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The behaviour:</strong> <span style="color:#f0e2c8;">"Emit is synchronous, the handler runs before emit returns, and outputs do not bubble like DOM events."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The extension:</strong> <span style="color:#f0e2c8;">"Pair input x with output xChange and the parent gets two-way binding; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> does both in one line. Beyond one level, use a service."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">emit()</code> synchronous or asynchronous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Synchronous. The parent handler runs inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit()</code> call. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EventEmitter</code> has a constructor flag to deliver asynchronously, but that is rarely used and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code> has no such option.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would a grandparent react to something deep in the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either re-emit at every level, which is fine for one or two levels, or put the state in an injectable service that both sides inject. Outputs cannot skip levels because they do not bubble.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just inject the parent component into the child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is possible, but it welds the child to one specific parent class, so it can no longer be reused or tested on its own. Outputs keep the dependency pointing one way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an output pass more than one value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emit</code> takes one argument, so pass an object, as the example does with item and stars. A typed payload also documents the contract for whoever uses the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test that a component emits?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subscribe to the output on the component instance, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">component.rated.subscribe(spy)</code>, click the button in the fixture, and assert the spy was called with the expected payload. Both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OutputEmitterRef</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EventEmitter</code> support subscribe.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Output** | A child property the parent listens to; fired with <code>emit()</code> |
| **output()** | The modern function that declares an output |
| **EventEmitter** | The older decorator-based output, an RxJS Subject |
| **Event binding** | <code>(name)="handler($event)"</code> in the parent template |
| **$event** | The emitted value (or the DOM event for native events) |
| **Unidirectional data flow** | Inputs down, outputs up, parent owns the state |

---
**Conclusion:** a child tells its parent about something by emitting an output: declare it with <code>output()</code> (or <code>@Output()</code> with an EventEmitter in older code), call <code>emit()</code>, and let the parent listen with <code>(name)="handler($event)"</code>. As verified on 22.2.3, the handler runs synchronously inside <code>emit()</code> and the event does not bubble past the direct parent. Pairing an input with an <code>xChange</code> output gives two-way binding, and anything that needs to travel further than one level belongs in a shared service.`,
    examples: [
      {
        label: "output(): a star rating child emitting to its parent",
        tech: "angular",
        runnable: false,
        code: `import { Component, input, output, signal } from "@angular/core";

type Rating = { item: string; stars: number };

// CHILD: knows nothing about its parent. It announces what happened.
@Component({
  selector: "star-rating",
  template: \`
    <span>{{ item() }}:</span>
    @for (n of [1, 2, 3, 4, 5]; track n) {
      <button (click)="pick(n)">{{ n }}</button>
    }
  \`,
})
export class StarRatingComponent {
  item = input.required<string>(); // data IN from the parent
  rated = output<Rating>(); // event OUT to the parent

  pick(stars: number) {
    console.log(\`  child emits rated(\${this.item()}, \${stars})\`);
    this.rated.emit({ item: this.item(), stars });
    console.log(\`  child: emit() has returned\`);
  }
}

// PARENT: listens with (rated)="..." and owns the state.
@Component({
  selector: "app-root",
  imports: [StarRatingComponent],
  template: \`
    <star-rating item="Coffee" (rated)="onRated($event)" />
    <star-rating item="Tea" (rated)="onRated($event)" />
    <p>Last: {{ last() }}</p>
  \`,
})
export class AppComponent {
  last = signal("nothing rated");
  onRated(r: Rating) {
    console.log(\`  parent handler received\`, JSON.stringify(r));
    this.last.set(\`\${r.item} got \${r.stars} stars\`);
  }
}`,
      },
      {
        label: "@Input + @Output EventEmitter with the xChange two-way pattern (runs in the playground)",
        tech: "angular",
        runnable: true,
        code: `import { Component, EventEmitter, Input, Output, signal } from "@angular/core";

// The decorator style. Still supported, and the form you will meet in older
// codebases. It is also what the in-browser playground can run.
@Component({
  selector: "like-button",
  template: \`<button (click)="toggle()">{{ liked ? "Unlike" : "Like" }} {{ label }}</button>\`,
})
export class LikeButtonComponent {
  @Input({ required: true }) label = "";
  @Input() liked = false;
  @Output() likedChange = new EventEmitter<boolean>();

  toggle() {
    // Never assign the input from inside the child and hope the parent
    // notices. Emit, and let the owner of the state decide.
    this.likedChange.emit(!this.liked);
  }
}

@Component({
  selector: "app-root",
  imports: [LikeButtonComponent],
  template: \`
    <!-- Because the pair is named liked / likedChange, banana-box syntax works -->
    <like-button label="post A" [(liked)]="a" />
    <like-button label="post B" [liked]="b()" (likedChange)="b.set($event)" />
    <p>A liked: {{ a }} | B liked: {{ b() }}</p>
  \`,
})
export class AppComponent {
  a = false;
  b = signal(false);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are template reference variables?",
    seoDescription:
      "A #ref names an element, component or directive inside a template. What each one resolves to, exportAs, ngModel refs and template scope rules.",
    description: `**Question presented to candidate:**
"What does \`#box\` mean in an Angular template, what value does it hold in different places, and where can you use it?"

**What a strong answer should cover:**
- \`#name\` declares a **template reference variable**: a name for something in the template, usable elsewhere in the same template.
- What it refers to depends on where it sits: on a plain element it is the **DOM element**; on a component it is the **component instance**; on \`<ng-template>\` it is a \`TemplateRef\`.
- \`#ref="exportName"\` picks a **directive instance** by its \`exportAs\` name, for example \`#email="ngModel"\` or \`#f="ngForm"\`.
- **Scope**: visible anywhere in its template, but not outside an \`@if\` / \`@for\` / \`<ng-template>\` block it was declared in, and never in the component class.
- In the class you reach the same things with \`viewChild()\` / \`@ViewChild\` queries.
- Good use: wiring two elements together without a class field. Poor use: building business logic in the template.

**Clarifying questions expected:**
- "Do you mean using it inside the template only, or getting hold of it in the class as well?"

**Code / implementation expected:** Yes — refs on an input, a component, a directive with exportAs, and ngModel.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview who has written a basic template.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Each "Verified" block comes from compiling the example with <code>ngc</code> and strict templates on Angular 22.2.3 and clicking or typing through it in jsdom.

## 1. Why This Even Matters — A Story First

At a busy party you can say "pass me the blue mug" and everyone at the table knows which mug you mean, because you all see the same table. You did not need to write the mug into a guest list first. But if you walk into the next room and say "the blue mug", nobody there knows what you are talking about.

A **template reference variable** is that quick label. Put <code>#box</code> on an input and the rest of the template can say <code>box.value</code> without adding a property to the component class. And like the mug, the label only works in the room, the template block, where it was given.

## 2. The Core Idea

📌 **Interview term: Template reference variable** — a name declared with <code>#name</code> (or the long form <code>ref-name</code>) on an element in a template. Any binding in the same template can read it.

\`\`\`html
<input #box />
<button (click)="add(box.value)">Add</button>
\`\`\`

What the name points to depends on what it is attached to:

| Placed on | <code>#ref</code> holds | Example use |
| :--- | :--- | :--- |
| A plain HTML element | The DOM element (<code>HTMLInputElement</code>, ...) | <code>box.value</code>, <code>box.focus()</code> |
| A component tag | The **component instance** | <code>sw.reset()</code> |
| An element with a directive, plus a value | The directive instance named by <code>exportAs</code> | <code>#t="toggle"</code>, <code>#f="ngForm"</code> |
| <code>&lt;ng-template&gt;</code> | A <code>TemplateRef</code> | Pass to <code>ngTemplateOutlet</code> |

📌 **Interview term: exportAs** — a name a directive publishes so that <code>#ref="name"</code> refers to the directive rather than to the element. Forms use it heavily: <code>ngModel</code> exports itself as <code>"ngModel"</code> and <code>ngForm</code> as <code>"ngForm"</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The same hash syntax resolves to a DOM element, a component instance or a directive instance depending on where it sits">
  <defs>
    <marker id="tr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="50" rx="10"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">input #box</text>
  <rect class="d-box" x="20" y="100" width="200" height="50" rx="10"/>
  <text class="d-text" x="120" y="130" text-anchor="middle">stopwatch #sw</text>
  <rect class="d-box" x="20" y="170" width="200" height="50" rx="10"/>
  <text class="d-text" x="120" y="200" text-anchor="middle">#t equals toggle</text>
  <path class="d-edge-accent" d="M 226 55 L 424 55" marker-end="url(#tr-arrow)"/>
  <path class="d-edge-accent" d="M 226 125 L 424 125" marker-end="url(#tr-arrow)"/>
  <path class="d-edge-accent" d="M 226 195 L 424 195" marker-end="url(#tr-arrow)"/>
  <rect class="d-box-accent" x="430" y="30" width="250" height="50" rx="10"/>
  <text class="d-text d-accent" x="555" y="60" text-anchor="middle">HTMLInputElement</text>
  <rect class="d-box-accent" x="430" y="100" width="250" height="50" rx="10"/>
  <text class="d-text d-accent" x="555" y="130" text-anchor="middle">StopwatchComponent</text>
  <rect class="d-box-accent" x="430" y="170" width="250" height="50" rx="10"/>
  <text class="d-text d-accent" x="555" y="200" text-anchor="middle">ToggleDirective</text>
</svg>

Same syntax, three different kinds of value. The template type checker knows which one it is, so <code>box.value</code> is typed as a string and <code>sw.tick()</code> is checked against the component class.

## 3. Verified: all four kinds in one template

The example at the bottom puts a ref on an input, a component, a directive with <code>exportAs</code>, and an <code>ngModel</code> field. The driver typed and clicked through it:

\`\`\`
after Add milk   : AddItems: milk0stickresetdetailsemail valid: false
box cleared?     : "" | focused: true
after 2 ticks    : 2s
after details    : true
after email typed: email valid: true
\`\`\`

Line by line: <code>box.value</code> read the typed text, and the same click handler cleared the field and called <code>box.focus()</code> on the real element. <code>sw.tick()</code> called a method on the component instance twice. <code>t.flip()</code> called the directive found through <code>exportAs</code>, and the <code>@if</code> read its signal. <code>email.valid</code> came from the <code>NgModel</code> directive, false while empty because of <code>required</code>, true after typing.

The same output came from the playground mode, so this example is runnable.

## 4. Verified: scope

📌 **Interview term: Template scope** — a ref is visible throughout the template it is declared in, including above its declaration, but **not outside** the block that contains it. Blocks are <code>@if</code>, <code>@for</code>, <code>@switch</code>, <code>@defer</code> and <code>&lt;ng-template&gt;</code>, because each one may render zero or many times.

Reading a ref declared inside an <code>@if</code> from outside it fails the build:

\`\`\`
@if (show()) { <input #inner value="x" /> }
<p>{{ inner.value }}</p>

error TS2339: Property 'inner' does not exist on type 'AppComponent'.
\`\`\`

The message is telling: once the name is out of scope, the template checker looks for it on the component class instead, and finds nothing. Refs never become class properties.

## 5. Refs Versus Queries

| | Template reference variable | <code>viewChild()</code> / <code>@ViewChild</code> |
| :--- | :--- | :--- |
| Where you use it | In the template only | In the component class |
| Declared with | <code>#name</code> | A query, often pointing at a <code>#name</code> |
| Typical job | Wire two template elements together | Call an API on a child from class code |
| Timing | Available as soon as the template renders it | Signal query updates as the view changes |

When the class needs the element, a query is the bridge: <code>box = viewChild&lt;ElementRef&gt;("box")</code>. The details are in [viewChild() signal queries vs @ViewChild](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed).

## 6. Common Pitfalls

- **Expecting a ref in the class.** <code>this.box</code> is undefined; use a query.
- **Reading a ref outside its block.** Inside <code>@if</code> or <code>@for</code> it is scoped to that block (TS2339 above).
- **Forgetting the exportAs value.** <code>#email</code> on an <code>ngModel</code> input gives you the <code>HTMLInputElement</code>; <code>#email="ngModel"</code> gives you the control with <code>valid</code> and <code>errors</code>.
- **Reusing a name.** Two refs with the same name in one scope are not an error, which is the problem. Verified: with <code>&lt;input #a value="1"&gt;&lt;input #a value="2"&gt;</code>, <code>{{ a.value }}</code> silently rendered <code>1</code>, the first one.
- **Pushing logic into the template.** <code>(click)="box.value = box.value.trim().toUpperCase(); save(box.value)"</code> is hard to test; move anything beyond simple wiring into a method.
- **Manipulating the DOM through the ref.** Reading values and calling <code>focus()</code> is fine; setting styles or innerHTML through it bypasses Angular. Use bindings instead.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"A template reference variable is a name declared with a hash on an element, so other bindings in the same template can use it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it holds:</strong> <span style="color:#f0e2c8;">"On a plain element it is the DOM element, on a component it is the component instance, and on ng-template it is a TemplateRef."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. exportAs:</strong> <span style="color:#f0e2c8;">"With a value, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#email="ngModel"</code>, it is the directive instance the directive exported, which is how template-driven forms read validity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scope:</strong> <span style="color:#f0e2c8;">"It is visible across its template but not outside an @if or @for block, and never in the class."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to use it:</strong> <span style="color:#f0e2c8;">"For small template wiring, like focusing a field. When the class needs the element, I use a viewChild query instead."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a ref inside the component class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a view query that names it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">box = viewChild&lt;ElementRef&lt;HTMLInputElement&gt;&gt;("box")</code>, then read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.box()?.nativeElement</code>. The decorator form is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ViewChild("box")</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a ref on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;ng-template&gt;</code> give you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TemplateRef</code>: a blueprint that is not rendered until something stamps it out, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngTemplateOutlet</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewContainerRef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make your own directive usable with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">#x="name"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exportAs: "toggle"</code> to its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Directive</code> metadata, as the example does. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#t="toggle"</code> resolves to that directive instance and its public members are usable in the template.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is calling a component method through a ref a good pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For imperative actions with no natural data shape, like reset, play or focus, yes. For anything that is really state, prefer an input, so the parent stays the owner and the child stays declarative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a ref before the element that declares it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, within the same scope; the name belongs to the whole template block, not to the lines after it. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;p&gt;{{ late.value }}&lt;/p&gt;</code> placed before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;input #late&gt;</code> rendered the input value.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Template reference variable** | A <code>#name</code> label for an element, component or directive in a template |
| **exportAs** | The name a directive publishes so <code>#ref="name"</code> points to it |
| **Template scope** | A ref is visible in its block, not outside <code>@if</code> / <code>@for</code> |
| **TemplateRef** | What a ref on <code>&lt;ng-template&gt;</code> holds |
| **View query** | <code>viewChild()</code>, the way the class reaches a template element |

---
**Conclusion:** a template reference variable is a <code>#name</code> label that lets one part of a template use another without adding anything to the class. It resolves to the DOM element on a plain tag, the component instance on a component, a directive instance when given an <code>exportAs</code> value, and a <code>TemplateRef</code> on <code>ng-template</code>. As verified on 22.2.3, the template checker types each one correctly and rejects a ref used outside its block, which is the scope rule interviewers most often probe.`,
    examples: [
      {
        label: "Refs on an element, a component, an exportAs directive and ngModel",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

// A directive that chooses what a #ref gets, via exportAs.
@Directive({ selector: "[appToggle]", exportAs: "toggle" })
export class ToggleDirective {
  open = signal(false);
  flip() {
    this.open.update((v) => !v);
  }
}

@Component({
  selector: "stopwatch",
  template: \`<span>{{ seconds() }}s</span>\`,
})
export class StopwatchComponent {
  seconds = signal(0);
  tick() {
    this.seconds.update((s) => s + 1);
  }
  reset() {
    this.seconds.set(0);
  }
}

@Component({
  selector: "app-root",
  imports: [FormsModule, StopwatchComponent, ToggleDirective],
  template: \`
    <!-- 1. On a plain element: #box is the HTMLInputElement itself -->
    <input #box placeholder="type, then press Add" />
    <button (click)="add(box.value); box.value = ''; box.focus()">Add</button>
    <p>Items: {{ items().join(", ") || "none" }}</p>

    <!-- 2. On a component: #sw is the component INSTANCE, so its methods are callable -->
    <stopwatch #sw />
    <button (click)="sw.tick()">tick</button>
    <button (click)="sw.reset()">reset</button>

    <!-- 3. With a value: #t="toggle" is the directive named by exportAs -->
    <button appToggle #t="toggle" (click)="t.flip()">details</button>
    @if (t.open()) { <p>Details are open</p> }

    <!-- 4. ngModel exports itself as "ngModel", which exposes validity -->
    <input name="email" ngModel required #email="ngModel" />
    <p>email valid: {{ email.valid }}</p>
  \`,
})
export class AppComponent {
  items = signal<string[]>([]);
  add(v: string) {
    if (v.trim()) this.items.update((xs) => [...xs, v.trim()]);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between the constructor and ngOnInit?",
    seoDescription:
      "The constructor builds the class and gets dependencies; ngOnInit runs once after inputs are first set. Verified order, NG0950, and when to use computed.",
    description: `**Question presented to candidate:**
"A component loads a user by an \`id\` input. Should that code go in the constructor or in \`ngOnInit\`, and what actually differs between the two?"

**What a strong answer should cover:**
- The **constructor** is plain TypeScript: Angular calls it to create the instance; use it (or field initialisers) for **dependency injection** and simple setup.
- **Inputs are not set yet** in the constructor: decorator inputs hold their defaults; reading a required signal input throws **NG0950** (and AOT flags it as **NG8118**).
- **\`ngOnInit\`** is a lifecycle hook Angular calls **once**, after the first \`ngOnChanges\`, when inputs have their first values.
- \`ngOnInit\` runs once: if the input changes later, code there does **not** re-run (\`ngOnChanges\`, \`computed\` or \`effect\` handle changes).
- With signal inputs, derived state is often a \`computed\` in a field rather than code in \`ngOnInit\`.
- The constructor is the **injection context** (\`inject()\` works there); \`ngOnInit\` is not.

**Clarifying questions expected:**
- "Are the inputs decorator inputs or signal inputs?"
- "Can the id change while the component stays on screen?"

**Code / implementation expected:** Yes — log the order of constructor, ngOnChanges and ngOnInit, and show a value that goes stale.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview who knows what a component and an input are.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The call order, the NG0950 runtime error and the NG8118 compiler error below were all produced by compiling and running the example on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

Think of a new employee's first day. Before they arrive, HR builds their desk and hands over a laptop and a badge: that is the **constructor**. Nobody tells the desk which project the person will work on, because nobody knows yet.

Later that morning the manager walks over with a brief: "you are on the payments team, here is your first ticket." That is **ngOnInit**. Only now does the employee know enough to start real work.

Trying to start the payments ticket at the desk-building stage is the classic beginner bug: the brief has not arrived, so you start the wrong work, or crash. And if the employee changes teams next month, nobody reruns their first morning. That is the second classic bug.

## 2. The Core Idea

📌 **Interview term: Constructor** — a normal TypeScript class constructor. Angular calls it once to create the component instance. At that moment the class has its **dependencies** but not its **inputs**.

📌 **Interview term: Lifecycle hook** — a method Angular calls at a defined moment in a component life. <code>ngOnInit</code> is one of them; the full list is in [Angular lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks).

📌 **Interview term: ngOnInit** — called **once**, after Angular has set the inputs for the first time (right after the first <code>ngOnChanges</code>). It is the first moment the component knows what its parent passed in.

📌 **Interview term: Injection context** — the window where <code>inject()</code> works: the constructor and field initialisers, but not lifecycle hooks. See [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Constructor runs first with dependencies only, then inputs are set and ngOnChanges runs, then ngOnInit runs once, later input changes only trigger ngOnChanges">
  <defs>
    <marker id="co-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="70" text-anchor="middle">constructor</text>
  <text class="d-sub" x="95" y="92" text-anchor="middle">dependencies only</text>
  <path class="d-edge" d="M 176 75 L 214 75" marker-end="url(#co-arrow)"/>
  <rect class="d-box" x="220" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="295" y="70" text-anchor="middle">ngOnChanges</text>
  <text class="d-sub" x="295" y="92" text-anchor="middle">first input values</text>
  <path class="d-edge" d="M 376 75 L 414 75" marker-end="url(#co-arrow)"/>
  <rect class="d-box-accent" x="420" y="40" width="150" height="70" rx="10"/>
  <text class="d-text d-accent" x="495" y="70" text-anchor="middle">ngOnInit</text>
  <text class="d-sub" x="495" y="92" text-anchor="middle">once, inputs ready</text>
  <rect class="d-box" x="220" y="150" width="150" height="50" rx="10"/>
  <text class="d-text" x="295" y="180" text-anchor="middle">ngOnChanges</text>
  <text class="d-sub" x="520" y="180" text-anchor="middle">later input changes</text>
  <path class="d-edge-dashed" d="M 445 175 L 376 175" marker-end="url(#co-arrow)"/>
</svg>

The top row happens once per component. Afterwards, an input change only brings back <code>ngOnChanges</code>; <code>ngOnInit</code> never runs again.

## 3. Verified: the order, and what each step can see

The example has a <code>UserProfileComponent</code> with an injected [service](/interview-question/what-is-a-service-and-why-use-it), a decorator input <code>legacyId</code> (default <code>-1</code>), and a required signal input <code>userId</code>. The parent passes <code>userId=42</code> and <code>legacyId=7</code>, then clicks "next user":

\`\`\`
constructor : api ready? true | legacyId = -1
constructor : userId() threw NG0950
ngOnChanges : legacyId = 7 | userId() = 42
ngOnInit    : legacyId = 7 | userId() = 42
[app] RENDERED: ngOnInit copy: user #42computed: user #42next user
-- click next user --
ngOnChanges : legacyId = 7 | userId() = 43
rendered: ngOnInit copy: user #42computed: user #43next user
\`\`\`

Four facts in eight lines:

1. In the constructor the injected service is ready, but the decorator input still holds its default (<code>-1</code>, not <code>7</code>).
2. Reading a required signal input in the constructor throws <code>NG0950: Input is required but no value is available yet</code>.
3. By <code>ngOnInit</code> both inputs have their values, after one <code>ngOnChanges</code>.
4. When the id changed to 43, only <code>ngOnChanges</code> ran. The value copied in <code>ngOnInit</code> stayed at <code>user #42</code>; the <code>computed</code> moved to <code>user #43</code>.

That last line is the bug most real apps have: data loaded "on init" that silently goes stale when the route or input changes.

## 4. Verified: the compiler catches the obvious version

Writing <code>this.userId()</code> directly in the constructor does not even build:

\`\`\`
error NG8118: \`userId\` is a required \`input\` and does not have a value in this context.
\`\`\`

(The example reads it through a local variable only to show the runtime error as well.) For decorator inputs there is no such check: you just silently get the default value.

## 5. Which One for What

| Work | Constructor / field initialiser | ngOnInit | Better modern option |
| :--- | :--- | :--- | :--- |
| Get dependencies | Yes (<code>inject()</code> only works here) | No | — |
| Set defaults, create [signals](/interview-question/what-are-angular-signals) | Yes | Possible | Field initialisers |
| Read inputs | **No**, not set yet | Yes, first values | <code>computed(() => ... this.userId())</code> |
| Start a fetch based on an input | No | Works once | <code>computed</code>, <code>resource()</code> or an <code>effect</code> keyed on the input |
| Subscribe to a stream | Possible | Common | <code>toSignal()</code> or <code>takeUntilDestroyed()</code> |
| React to later input changes | No | **No** | <code>ngOnChanges</code>, <code>computed</code>, <code>effect</code> |

📌 **Interview term: Derived state** — a value computed from inputs. With signal inputs the idiomatic place for it is a <code>computed</code> field, which re-derives automatically and runs only when read. See [computed() vs methods in templates](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

## 6. Common Pitfalls

- **Reading inputs in the constructor.** Decorator inputs give you their default; required signal inputs throw NG0950.
- **Loading data once in ngOnInit for a changing input.** Verified above: the view kept showing user 42 after the id became 43. Route parameters have the same problem when Angular reuses the component; see [reading route parameters](/interview-question/how-do-you-read-route-parameters).
- **Calling <code>inject()</code> in ngOnInit.** It is outside the [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it). Verified: <code>NG0203: The \`_Api\` token injection failed. \`inject()\` function must be called from an injection context such as a constructor...</code>. Inject in a field or the constructor.
- **Heavy work in the constructor.** It makes the class hard to test, since every <code>new</code> in a test triggers it, and it runs before Angular has wired anything up.
- **Forgetting the interface.** <code>implements OnInit</code> is optional at runtime but catches a misspelled <code>ngOninit</code>, which Angular would otherwise silently never call.
- **Using <code>ngOnInit</code> for DOM work.** The view is not rendered yet; use <code>afterNextRender</code> or a view query. See [afterRender vs afterNextRender vs ngAfterViewInit](/interview-question/afterrender-vs-afternextrender-vs-ngafterviewinit-which-to-use).

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Constructor:</strong> <span style="color:#f0e2c8;">"The constructor is plain TypeScript. Angular calls it to create the instance, and it is where dependencies are injected."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ngOnInit:</strong> <span style="color:#f0e2c8;">"ngOnInit is a lifecycle hook that runs once, after the first ngOnChanges, so it is the first moment inputs have values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The rule:</strong> <span style="color:#f0e2c8;">"So: inject in the constructor or field initialisers, and do input-dependent setup in ngOnInit, never in the constructor."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;">"ngOnInit runs only once. If the input changes later, that code does not rerun, so the view goes stale."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The modern answer:</strong> <span style="color:#f0e2c8;">"With signal inputs I usually skip ngOnInit and write a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> over the input, which stays correct as it changes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is ngOnInit called before or after ngOnChanges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the first one. The verified order is constructor, ngOnChanges, ngOnInit; later input changes call only ngOnChanges. A component with no inputs bound gets no ngOnChanges at all (verified: only ngOnInit logged), and ngOnInit still runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not fetch data in the constructor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The inputs that say what to fetch are not set yet, and it makes the class do work just by being created, which hurts tests. A fetch keyed on an input belongs in something that reacts to the input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject()</code> inside ngOnInit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> only works in an injection context: field initialisers, the constructor, factory functions. Inject into a field and use it in ngOnInit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does ngOnInit run for services?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Lifecycle hooks belong to components and directives. A service only has its constructor, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code> for cleanup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the DOM ready in ngOnInit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the component view has not been rendered yet. For code that needs the rendered DOM use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code> in older code.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Constructor** | Creates the instance; dependencies available, inputs not yet |
| **Lifecycle hook** | A method Angular calls at a fixed point in a component life |
| **ngOnInit** | Runs once after inputs get their first values |
| **ngOnChanges** | Runs before ngOnInit and again on every input change |
| **Injection context** | Where <code>inject()</code> works: fields and the constructor |
| **Derived state** | A value computed from inputs, best kept in a <code>computed</code> |
| **NG0950** | Runtime error: a required input was read before it had a value |

---
**Conclusion:** the constructor creates the component and receives its dependencies; <code>ngOnInit</code> runs once, after the first <code>ngOnChanges</code>, when inputs finally have values. As verified on 22.2.3, a decorator input still holds its default in the constructor, a required signal input throws NG0950 there (and the compiler flags NG8118), and a value set in <code>ngOnInit</code> goes stale when the input later changes, while a <code>computed</code> over the input stays correct. Inject in the constructor, react to inputs with <code>computed</code> or <code>ngOnChanges</code>, and treat <code>ngOnInit</code> as one-time setup.`,
    examples: [
      {
        label: "Constructor vs ngOnChanges vs ngOnInit, and the stale ngOnInit copy",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable, Input, OnChanges, OnInit, computed, inject, input, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class UserApi {
  load(id: number) {
    return \`user #\${id}\`;
  }
}

@Component({
  selector: "user-profile",
  template: \`<p>ngOnInit copy: {{ status() }}</p><p>computed: {{ live() }}</p>\`,
})
export class UserProfileComponent implements OnChanges, OnInit {
  // Dependencies are available in the constructor (and field initialisers).
  private api = inject(UserApi);

  @Input() legacyId = -1; // decorator input, with a default
  userId = input.required<number>(); // signal input
  status = signal("loading"); // set ONCE, in ngOnInit
  live = computed(() => this.api.load(this.userId())); // re-derives when userId changes

  constructor() {
    console.log(\`constructor : api ready? \${!!this.api} | legacyId = \${this.legacyId}\`);
    try {
      const readTooEarly = this.userId; // the compiler flags a direct this.userId() here (NG8118)
      console.log(\`constructor : userId() = \${readTooEarly()}\`);
    } catch (e) {
      console.log(\`constructor : userId() threw \${(e as Error).message.split(":")[0]}\`);
    }
  }

  ngOnChanges() {
    console.log(\`ngOnChanges : legacyId = \${this.legacyId} | userId() = \${this.userId()}\`);
  }

  ngOnInit() {
    console.log(\`ngOnInit    : legacyId = \${this.legacyId} | userId() = \${this.userId()}\`);
    this.status.set(this.api.load(this.userId()));
  }
}

@Component({
  selector: "app-root",
  imports: [UserProfileComponent],
  template: \`
    <user-profile [userId]="id()" [legacyId]="7" />
    <button (click)="id.set(id() + 1)">next user</button>
  \`,
})
export class AppComponent {
  id = signal(42);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does the Angular CLI provide?",
    seoDescription:
      "The Angular CLI scaffolds, generates, serves, builds, tests and updates apps. What ng new, generate, build and test produce on CLI 22, verified.",
    description: `**Question presented to candidate:**
"What does the Angular CLI do for a team, and what do \`ng new\`, \`ng generate\`, \`ng build\`, \`ng test\` and \`ng update\` actually give you today?"

**What a strong answer should cover:**
- The CLI is the **official command-line tool** for creating, developing, building, testing and upgrading Angular workspaces.
- **\`ng new\`** scaffolds a workspace with sensible defaults (in v22: standalone, zoneless, Vitest, esbuild application builder).
- **\`ng generate\`** runs **schematics** to create components, services, guards and more in the project conventions.
- **\`ng serve\`** / **\`ng build\`** use the esbuild-based \`@angular/build\` builders; production builds apply AOT, minification, hashing and **budgets**.
- **\`ng test\`** runs unit tests (Vitest by default for new projects since v21); **\`ng add\`** installs and configures libraries; **\`ng update\`** upgrades with automatic **migrations**.
- \`angular.json\` holds the **architect targets** (build, serve, test) the commands run.

**Clarifying questions expected:**
- "Is this a new project, or an existing workspace that might still use the older webpack builder or Karma?"

**Code / implementation expected:** Optional — the command sequence for a new project and what each produces.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — no Angular experience needed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Everything under "Verified" was produced by running Angular CLI 22.2.3 in a sandbox: <code>ng new</code>, <code>ng generate --dry-run</code>, <code>ng serve</code>, <code>ng build</code>, <code>ng test</code> and <code>ng lint</code>, with the real output quoted. <code>ng add</code> and <code>ng update</code> are described from the CLI help and documentation, not run here.

## 1. Why This Even Matters — A Story First

Building a web app by hand is like opening a restaurant by buying every pot, wiring every oven and writing every safety checklist yourself. You can, but you will spend months on plumbing before you cook anything, and the next restaurant you open will be wired slightly differently.

The Angular CLI is a franchise kit. It hands you a kitchen that is already plumbed (a project with the compiler, bundler and test runner wired up), a set of stencils for every standard fixture (generators), a way to run the kitchen during development (a dev server), a way to package it for opening day (a production build), and a contractor who comes back each year to upgrade the equipment safely (updates with migrations). Every Angular team gets the same kit, which is why you can join a new Angular project and find your way around on day one.

## 2. The Core Idea

📌 **Interview term: Angular CLI** — the official command-line tool, run as <code>ng</code>, for creating and maintaining Angular workspaces.

📌 **Interview term: Workspace** — the folder <code>ng new</code> creates: one or more projects (apps or libraries) plus a shared <code>angular.json</code>, <code>package.json</code> and TypeScript config.

📌 **Interview term: Schematic** — a code generator that creates or edits files following the project conventions. <code>ng generate</code>, <code>ng add</code> and <code>ng update</code> all run schematics.

📌 **Interview term: Builder (architect target)** — the program that a command like <code>ng build</code> runs, configured per project in <code>angular.json</code>. In a new v22 project these are <code>@angular/build:application</code>, <code>@angular/build:dev-server</code> and <code>@angular/build:unit-test</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="The ng command runs schematics for new, generate, add and update, and builders for serve, build and test, configured in angular.json">
  <defs>
    <marker id="cli-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="275" y="20" width="150" height="50" rx="10"/>
  <text class="d-text d-accent" x="350" y="50" text-anchor="middle">ng</text>
  <path class="d-edge" d="M 310 74 L 175 118" marker-end="url(#cli-arrow)"/>
  <path class="d-edge" d="M 390 74 L 525 118" marker-end="url(#cli-arrow)"/>
  <rect class="d-box" x="40" y="124" width="270" height="60" rx="10"/>
  <text class="d-text" x="175" y="150" text-anchor="middle">Schematics: write code</text>
  <text class="d-sub" x="175" y="172" text-anchor="middle">new, generate, add, update</text>
  <rect class="d-box" x="390" y="124" width="270" height="60" rx="10"/>
  <text class="d-text" x="525" y="150" text-anchor="middle">Builders: run code</text>
  <text class="d-sub" x="525" y="172" text-anchor="middle">serve, build, test</text>
  <rect class="d-box-muted" x="390" y="206" width="270" height="40" rx="8"/>
  <text class="d-sub" x="525" y="231" text-anchor="middle">configured in angular.json</text>
</svg>

One way to remember the CLI: half of it **writes** code (schematics), the other half **runs** it (builders).

## 3. The Commands

<code>ng help</code> on CLI 22.2.3 lists these commands (aliases in brackets):

| Command | What it does |
| :--- | :--- |
| <code>ng new</code> (<code>n</code>) | Create a workspace and first app |
| <code>ng generate</code> (<code>g</code>) | Run a schematic: component, [service](/interview-question/what-is-a-service-and-why-use-it), guard, pipe, directive, interceptor, ... |
| <code>ng serve</code> (<code>s</code>, <code>dev</code>) | Dev server with rebuild on save |
| <code>ng build</code> (<code>b</code>) | Compile to <code>dist/</code> |
| <code>ng test</code> (<code>t</code>) | Run [unit tests](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed) |
| <code>ng e2e</code> (<code>e</code>) | Run end-to-end tests (you add a runner) |
| <code>ng lint</code> | Lint (prompts to add ESLint if none is configured) |
| <code>ng add</code> | Install a library and run its setup schematic |
| <code>ng update</code> | Upgrade packages and run their migrations |
| <code>ng extract-i18n</code> | Extract translatable messages |
| <code>ng deploy</code> | Run a deploy builder you have added |
| <code>ng config</code>, <code>ng cache</code>, <code>ng version</code> (<code>v</code>) | Workspace settings, build cache, versions |

## 4. Verified: what ng new gives you in v22

The generated <code>package.json</code> (trimmed) and file layout from <code>ng new demo --defaults --ssr=false</code>:

\`\`\`
dependencies:    @angular/{common,compiler,core,forms,platform-browser,router} ^22.2.0, rxjs ~7.8.0, tslib
devDependencies: @angular/build ^22.2.3, @angular/cli ^22.2.3, @angular/compiler-cli,
                 jsdom ^30.0.0, prettier, typescript ~6.0.2, vitest ^5.0.0
src/app: app.ts  app.html  app.css  app.spec.ts  app.config.ts  app.routes.ts
\`\`\`

Things worth saying out loud, because each one changed in recent versions:

- **No <code>zone.js</code>** in the dependencies: new apps are [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).
- **Vitest + jsdom** instead of Karma + Jasmine.
- **No <code>.component</code> suffix**: the root is <code>app.ts</code> exporting <code>App</code>, following the current style guide.
- **No <code>NgModule</code>**: <code>main.ts</code> calls <code>bootstrapApplication(App, appConfig)</code>.
- **TypeScript 6** and the esbuild-based <code>@angular/build:application</code> builder.

## 5. Verified: generate, build and test

<code>ng generate component user-card --dry-run</code> and <code>ng generate service data --dry-run</code>:

\`\`\`
CREATE src/app/user-card/user-card.css (0 bytes)
CREATE src/app/user-card/user-card.spec.ts (547 bytes)
CREATE src/app/user-card/user-card.ts (196 bytes)
CREATE src/app/user-card/user-card.html (24 bytes)
CREATE src/app/data.ts (75 bytes)
\`\`\`

Note the service file is <code>data.ts</code>, not <code>data.service.ts</code>: the suffixes were dropped from the defaults.

<code>ng build</code> of the untouched app:

\`\`\`
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-TK6HYCXX.js    | main          | 216.87 kB |                59.58 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes
                    | Initial total | 216.87 kB |                59.58 kB
Application bundle generation complete. [3.866 seconds]
\`\`\`

The hash in <code>main-TK6HYCXX.js</code> is <code>outputHashing: "all"</code> from the production configuration, so browsers can cache files forever. The same configuration sets **budgets**: a warning above 500 kB and an error above 1 MB of initial JavaScript, which is how the CLI stops a bundle from quietly growing.

<code>ng test --watch=false</code>:

\`\`\`
RUN  v5.0.5
Test Files  1 passed (1)
     Tests  2 passed (2)
\`\`\`

The runner banner is Vitest 5.0.5, confirming the default test stack.

<code>ng serve</code> printed a development build and a Vite dev server, and the served page loads the Vite client:

\`\`\`
Initial chunk files | Names         | Raw size
main.js             | main          | 48.04 kB
styles.css          | styles        | 95 bytes
Watch mode enabled. Watching for file changes...
  ➜  Local:   http://localhost:4311/
<script type="module" src="/@vite/client"></script>
\`\`\`

Unhashed file names, no minification and source maps: the dev server uses the <code>development</code> configuration, which is why its output is never what you deploy.

📌 **Interview term: Budgets** — size limits in <code>angular.json</code> that turn bundle growth into build warnings or failures.

📌 **Interview term: Migrations** — schematics shipped with a new version that <code>ng update</code> runs to rewrite your code, for example removing <code>standalone: true</code> in v19 or moving off deprecated APIs.

## 6. Why Teams Rely on It

| Without the CLI | With the CLI |
| :--- | :--- |
| Hand-configure a bundler, TypeScript, the Angular compiler and a test runner | One <code>ng new</code> |
| Every project has its own layout | Same layout and naming across teams |
| Copy-paste boilerplate for each component | <code>ng g c name</code> |
| Major upgrades by hand | <code>ng update</code> with automatic code migrations |
| Bundle size drifts unnoticed | Budgets fail the build |

How the build tooling itself changed (esbuild, Vite in the dev server) is covered in [the esbuild + Vite build](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve), and AOT versus JIT in [AOT and JIT compilation](/interview-question/what-is-the-difference-between-aot-and-jit-compilation).

## 7. Common Pitfalls

- **Assuming Karma and Jasmine.** New projects since v21 use Vitest; older workspaces may still use Karma, so check <code>angular.json</code> before talking about test setup.
- **Upgrading by editing <code>package.json</code>.** That skips the migrations. Use <code>ng update</code>, one major version at a time.
- **Running an unsupported Node version.** Verified: CLI 22.2.3 refused Node 22.22.0 with "The Angular CLI requires a minimum Node.js version of v22.22.3 or v24.15.0 or v26.0.0."
- **Ignoring budget warnings.** They are the only early signal that a dependency doubled your bundle.
- **Hand-writing what a schematic generates.** You lose the spec file and the conventions; generate, then edit.
- **Expecting <code>ng e2e</code> and <code>ng lint</code> to work out of the box.** Both need a tool added first. Verified: <code>ng lint</code> in a fresh v22 project has no lint target and suggests <code>ng add angular-eslint</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"The Angular CLI is the official tool for the whole project lifecycle: create, generate, serve, build, test and update."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two halves:</strong> <span style="color:#f0e2c8;">"Schematics write code, through new, generate, add and update. Builders run code, through serve, build and test, configured in angular.json."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Current defaults:</strong> <span style="color:#f0e2c8;">"A v22 project is standalone and zoneless, builds with the esbuild application builder, and tests with Vitest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Production build:</strong> <span style="color:#f0e2c8;">"ng build does AOT compilation, minification and hashed file names, and fails the build if the bundle exceeds its budgets."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The big win:</strong> <span style="color:#f0e2c8;">"ng update runs migrations that rewrite our code for each new major, which is what keeps large Angular apps upgradeable."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng add</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">npm install</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npm install</code> only downloads the package. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng add</code> installs it and runs its setup schematic, which can register providers, add config files and edit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">angular.json</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng add @angular/ssr</code> is the usual example.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you upgrade an app across several major versions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One major at a time with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng update @angular/core@N @angular/cli@N</code>, committing and running tests after each step, so every set of migrations applies to code it understands. The update guide on angular.dev lists manual steps per version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">angular.json</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The projects in the workspace and, for each, its architect targets: which builder runs build, serve and test, plus their options and named configurations such as production and development with budgets and source maps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write your own schematics?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Teams write schematics to generate their own house-style feature folders, and libraries ship them for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng add</code> and for their own update migrations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng serve</code> output go to production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It serves from memory using the development configuration, unoptimised and with source maps. Deploy the output of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng build</code>, which defaults to the production configuration.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Angular CLI** | The <code>ng</code> command for creating, building, testing and updating apps |
| **Workspace** | The folder with <code>angular.json</code> and one or more projects |
| **Schematic** | A code generator run by <code>generate</code>, <code>add</code> and <code>update</code> |
| **Builder** | The program a target like <code>build</code> or <code>test</code> runs |
| **Budgets** | Bundle size limits that warn or fail the build |
| **Migrations** | Automatic code rewrites run by <code>ng update</code> |

---
**Conclusion:** the Angular CLI is the official tool for the whole life of a project: schematics write code (<code>ng new</code>, <code>generate</code>, <code>add</code>, <code>update</code>) and builders run it (<code>serve</code>, <code>build</code>, <code>test</code>). As verified with CLI 22.2.3, a new project is standalone and zoneless with Vitest and the esbuild application builder, <code>ng generate</code> drops the old file suffixes, and a production build hashes its files and enforces size budgets. The feature that matters most over time is <code>ng update</code>, whose migrations keep large codebases moving forward one major at a time.`,
    examples: [
      {
        label: "A new Angular 22 project, start to finish (CLI 22.2.3)",
        runnable: false,
        code: `# Angular CLI 22 workflow. Steps 1-5 were run with CLI 22.2.3; step 6 is shown, not run.
# (The CLI needs Node ^22.22.3, ^24.15.0 or >=26; it refuses older versions.)

# 1. Create a workspace: standalone, zoneless, Vitest, esbuild builder
npx @angular/cli@22 new demo --defaults --ssr=false
cd demo

# 2. Generate code from schematics (--dry-run shows the files without writing)
npx ng generate component user-card   # src/app/user-card/user-card.{ts,html,css,spec.ts}
npx ng generate service data          # src/app/data.ts
npx ng g c settings --dry-run          # short aliases: g = generate, c = component

# 3. Develop with a rebuild-on-save dev server (Vite underneath; http://localhost:4200 by default)
npx ng serve

# 4. Production build into dist/demo/, with hashed file names and size budgets
npx ng build

# 5. Unit tests (Vitest + jsdom in a new v22 project)
npx ng test --watch=false

# 6. Add a library through its schematic, and upgrade with migrations
npx ng add @angular/ssr
npx ng update @angular/core @angular/cli`,
      },
    ],
  },
];

export default augments;
