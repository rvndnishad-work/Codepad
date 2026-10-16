/**
 * Angular ULTRA — batch 08: change detection (OnPush vs Eager, ChangeDetectorRef),
 * NgZone and Zone.js, zoneless Angular, KeyValueDiffers/IterableDiffers,
 * ViewEncapsulation and its compiled CSS, :host / :host-context / ::ng-deep,
 * and CUSTOM_ELEMENTS_SCHEMA.
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
 * strictTemplates, booted with bootstrapApplication in jsdom (zone.js 0.16.3
 * loaded, as in the site playground). Examples marked runnable also passed its
 * --playground mode (plain transpile + JIT). Compiled CSS was read from ngc
 * output; bundle sizes come from `ng build` with Angular CLI 22.2.3. Version
 * history (zoneless in v18/v20.2/v21, OnPush default in v22) was checked by
 * web search and against the 22.2.3 typings.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */

import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does change detection work in Angular?",
    seoDescription:
      "How Angular 22 change detection works: views marked dirty by signals, events and markForCheck, OnPush by default, Eager opt-in, zoneless scheduling.",
    description: `**Question presented to candidate:**
"A teammate says Angular 're-renders everything whenever anything happens'. Walk me through how change detection actually decides what to update in a current Angular app, and what would make a value on screen go stale."

**What a strong answer should cover:**
- Change detection is Angular **re-running compiled template code** for a view and patching only the DOM bindings whose values changed; there is no virtual DOM diff.
- A run walks the **component tree top-down**, but each view is checked only if it is **dirty** (or is an \`Eager\` component reached by the walk).
- What marks a view dirty: a **signal read in its template** changing, a **template or host event**, \`markForCheck()\` (also called by \`AsyncPipe\`), \`ComponentRef.setInput\`.
- v22 defaults: **OnPush is the default** strategy, \`Eager\` is the opt-in old behaviour and \`Default\` is a deprecated alias; apps are **zoneless by default** since v21, so nothing schedules a run "because a timer fired".
- Dev mode runs a **second check pass** and throws \`NG0100 ExpressionChangedAfterItHasBeenCheckedError\` if a binding changed during the first.
- Practical consequence: state the template reads should be a **signal**; a plain field mutated in a \`setTimeout\` stays stale.

**Clarifying questions expected:**
- "Is this a zoneless app (the v21+ default) or one that opted back into Zone.js?"
- "Are the components on the v22 default (OnPush) or migrated with \`ChangeDetectionStrategy.Eager\`?"

**Code / implementation expected:** Optional — a small tree that shows which components re-run after a signal change, a click and a plain-field change.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview — assumes you have written a component or two, no knowledge of Angular internals required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every count, DOM snapshot and error message below was produced by compiling and running the code on Angular 22.2.3; the defaults were read from the 22.2.3 package typings.

## 1. Why This Even Matters — A Story First

Picture a large office with a printed notice board on every floor. Somebody has to keep the boards matching the real facts: who is in which meeting room, which coffee machine is broken.

The old way was a caretaker who, whenever *anything* happened anywhere in the building (a door opened, a phone rang), walked every floor and re-read every board against the facts. Reliable, but tiring, and most walks found nothing to fix.

The new way: every fact has a little bell. When a fact changes, its bell rings on the floors whose boards mention it, and those floors raise a flag. The caretaker still starts at the top floor and walks down, but only stops on floors with a raised flag. Floors without a flag are skipped entirely, together with everything below them that did not ask for a visit.

That second building is a modern Angular app. The boards are **templates**, the facts are your component state, the bells are **signals**, and the caretaker is **change detection**. Interviewers ask this question because the answer changed a lot between Angular 2 and Angular 22, and a stale mental model ("Zone.js re-checks everything") produces real bugs.

## 2. The Core Idea

📌 **Interview term: Change detection** — the process that keeps the DOM in sync with component state. Angular re-runs a view's compiled template function, compares each binding's new value with the value it stored last time, and touches the DOM only where a value differs. There is no virtual DOM: the comparison is per binding, against the previous value.

📌 **Interview term: View** — the runtime instance of one component template (or one embedded block such as an <code>@if</code> branch). Each component instance owns one view, and views form a **tree** that mirrors the component tree.

📌 **Interview term: Dirty view** — a view flagged as needing a refresh. Change detection walks the tree from the root down and refreshes dirty views; clean views are skipped.

What makes a view dirty in Angular 22:

| Trigger | What gets marked |
| :--- | :--- |
| A [signal](/interview-question/what-are-angular-signals) read by the template changes | That view only (refreshed without re-checking its ancestors) |
| A template or host event listener fires, for example <code>(click)</code> | That view **and all its ancestors** |
| <code>ChangeDetectorRef.markForCheck()</code> (the <code>AsyncPipe</code> calls it for you) | That view and all its ancestors |
| <code>ComponentRef.setInput()</code> or a parent passing a new input value | The child view |

📌 **Interview term: Change detection strategy** — a per-component setting that decides whether the walk may skip the component when it is not dirty. Angular 22 has two values:

- **OnPush** — the default since v22. Checked only when dirty. The 22.2.3 typings say it plainly: <code>OnPush = 0</code>, "NOTE: OnPush is enabled by default".
- **Eager** — checked every time the walk reaches it, dirty or not. This was the default up to v21. The old name <code>ChangeDetectionStrategy.Default</code> still exists as <code>Default = 1</code> but is marked <code>@deprecated Use Eager instead</code>.

📌 **Interview term: Scheduler** — the piece that decides *when* a change detection run happens. Since v21 apps are **zoneless** by default: the scheduler runs only after one of the notifications in the table above. A timer firing or a fetch resolving does nothing on its own. Apps that opt back into [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon) with <code>provideZoneChangeDetection()</code> also run after every zone turn; see [NgZone](/interview-question/what-is-ngzone-and-when-do-you-run-outside-angular) and [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

## 3. Marking Goes Up, Checking Goes Down

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="markForCheck on the Plain card marks it and the root dirty, then the top-down walk checks Root, Plain and Eager and skips the clean Signal card">
  <defs>
    <marker id="cdw-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="30" width="220" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="56" text-anchor="middle">AppComponent</text>
  <text class="d-sub" x="360" y="76" text-anchor="middle">OnPush, dirty: checked</text>
  <path class="d-edge" d="M 300 94 L 140 196"/>
  <path class="d-edge" d="M 360 94 L 360 196"/>
  <path class="d-edge" d="M 420 94 L 580 196"/>
  <path class="d-edge-dashed" d="M 300 200 L 300 100" marker-end="url(#cdw-arrow)"/>
  <text class="d-sub" x="292" y="160" text-anchor="end">marked</text>
  <rect class="d-box-muted" x="40" y="200" width="200" height="64" rx="10"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">SignalCard</text>
  <text class="d-sub" x="140" y="248" text-anchor="middle">OnPush, clean: skipped</text>
  <rect class="d-box-accent" x="270" y="200" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="360" y="226" text-anchor="middle">PlainCard</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">markForCheck()</text>
  <rect class="d-box" x="480" y="200" width="200" height="64" rx="10"/>
  <text class="d-text" x="580" y="226" text-anchor="middle">EagerCard</text>
  <text class="d-sub" x="580" y="248" text-anchor="middle">Eager: always checked</text>
</svg>

Calling <code>markForCheck()</code> on the plain card flags it and every ancestor up to the root (the dashed arrow). The next run starts at the root, refreshes the flagged views, also refreshes the Eager card because the walk reached it, and never enters the clean OnPush signal card. A signal change is cheaper still: it refreshes only the view that read the signal, without flagging ancestors.

## 4. Verified: counting template executions

The example at the bottom has a root and three children. Every template calls a <code>checked("Name")</code> helper, so the console reports how many times each view's template actually ran. Compiled with <code>ngc</code> (strict templates), run in jsdom, buttons clicked one after another:

\`\`\`
first render                 {"Root":1,"Signal":1,"Plain":1,"Eager":1}
template (click)             {"Root":1,"Eager":1}
signal.set (async)           {"Signal":1}
plain field (async)          {}
markForCheck (async)         {"Root":1,"Plain":1,"Eager":1}
DOM: signal card: 1 | plain card: 2 | eager card: 0
\`\`\`

Reading it line by line:

1. **A template click** marked the root dirty. The walk refreshed the root, skipped the two clean OnPush children, and still refreshed the Eager child because Eager means "check me whenever you pass by".
2. **A signal set inside <code>setTimeout</code>** refreshed exactly one view, the one whose template read the signal. Not even its parent re-ran.
3. **A plain field changed inside <code>setTimeout</code>** caused nothing at all: no notification, no run, stale DOM. This is the single most common v22 bug.
4. **<code>markForCheck()</code>** flagged the plain card and its ancestors, so the root, the plain card and the Eager card ran. The DOM then shows <code>plain card: 2</code>, because the earlier silent increment is picked up too.

Two more experiments with the same tree, not part of the example:

- With the root switched to <code>Eager</code>, an <code>ApplicationRef.tick()</code> with nothing marked ran <code>{"Root":1,"Eager":1}</code>. With an OnPush root (the default), the same call ran <code>{}</code>: an Eager child below a clean OnPush parent is never reached. Eager only means "always checked *if the walk gets here*".
- Opting into Zone.js with <code>provideZoneChangeDetection()</code> did **not** bring back "everything re-renders": with the default OnPush root, a plain field changed in a timer inside the Angular zone still left the DOM stale.

## 5. The Development-Mode Double Check

📌 **Interview term: ExpressionChangedAfterItHasBeenCheckedError (NG0100)** — in development builds Angular runs a second, read-only pass after each change detection run and compares every binding again. If a value changed during the first pass, the data flow is unstable (something updated state *while* the view was being rendered), and Angular throws.

Verified with an Eager component that sets <code>this.status = "ready"</code> in <code>ngAfterViewInit</code> while the template shows <code>status</code>:

\`\`\`
ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'loading'. Current value: 'ready'. Expression location: _AppComponent component. Find more at https://v22.angular.dev/errors/NG0100
\`\`\`

Two details from the counting experiment: Eager views ran twice per tick in dev mode (the real pass plus the check pass), while OnPush views ran once, because by default the check pass only revisits views that are still flagged. <code>provideCheckNoChangesConfig({ exhaustive: true })</code> (developer preview since v20) makes the check pass visit OnPush views too. Production builds skip the check pass completely. The fix is never to silence the error but to stop writing state from a hook that runs after the view was checked: use a <code>computed</code>, set the value earlier (<code>ngOnInit</code>), or react with a signal so the update is scheduled properly. The [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks) doc shows where each hook sits in the run.

## 6. Angular 22 vs the Angular You May Remember

| | Angular 2 to v17 (typical app) | Angular 22 new app |
| :--- | :--- | :--- |
| Who starts a run | Zone.js, after every async task in the Angular zone | The zoneless scheduler, only after a notification |
| Default strategy | <code>Default</code> (check always) | <code>OnPush</code>; <code>Eager</code> is opt-in, <code>Default</code> deprecated |
| State the template reads | Any field | A [signal](/interview-question/what-are-angular-signals), an <code>AsyncPipe</code> value, or a field plus <code>markForCheck()</code> |
| Granularity of a signal change | Whole tree walk | Only the view that read the signal |
| Plain field set in <code>setTimeout</code> | Rendered on the next zone turn | Not rendered until something else notifies |

The upgrade path is meant to keep old behaviour: v22 release coverage reports that the <code>ng update</code> migration adds <code>ChangeDetectionStrategy.Eager</code> to components that never set a strategy, so only new code gets OnPush (see <a href="https://blog.ninja-squad.com/2026/06/03/what-is-new-angular-22.0" target="_blank" rel="noopener noreferrer">What is new in Angular 22.0</a>; the migration itself was not run for this doc). Library components that never set a strategy are not touched by your migration, so check them after upgrading.

## 7. Common Pitfalls

- **Mutating a plain field from async code.** No zone, no notification, stale screen. Make it a signal, or call <code>markForCheck()</code> via [ChangeDetectorRef](/interview-question/what-does-changedetectorref-do).
- **Assuming Eager rescues a child.** An Eager component under a clean OnPush parent is not reached; the verified run above shows it.
- **Mutating an input object in place for an OnPush child.** The reference does not change, so the child is not marked. Pass a new object, or use signals; for in-place diffing see [KeyValueDiffers and IterableDiffers](/interview-question/what-is-the-purpose-of-the-keyvaluediffers-and-iterablediffers-services).
- **Calling expensive methods in templates.** The method re-runs every time its view is checked; a [computed signal](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) is cached until its inputs change.
- **"Fixing" NG0100 with <code>setTimeout</code>.** It hides an unstable data flow and costs an extra run. Move the write earlier or derive the value.
- **Quoting <code>ChangeDetectionStrategy.Default</code> as the default.** In v22 it is a deprecated alias of <code>Eager</code>, and OnPush is what you get when you write nothing.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Change detection re-runs a component's compiled template and updates only the DOM bindings whose values changed, and in Angular 22 it only visits views that were marked dirty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What marks a view:</strong> <span style="color:#f0e2c8;">"A signal read in the template changing, a template event, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> (which the async pipe calls), or a new input via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The walk:</strong> <span style="color:#f0e2c8;">"Runs top-down from the root; OnPush views (the v22 default) are skipped when clean, Eager views are checked whenever the walk reaches them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Who starts it:</strong> <span style="color:#f0e2c8;">"Since v21 apps are zoneless, so a run is scheduled only by those notifications; a timer or fetch finishing does nothing by itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with the consequence:</strong> <span style="color:#f0e2c8;">"State the template reads should be a signal; dev mode double-checks and throws NG0100 if a binding changed mid-run."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a signal change re-check the whole tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Verified on 22.2.3: setting a signal from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> re-ran only the one template that read it, not its parent or siblings. Events and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> mark ancestors too, which is why a click re-ran the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between OnPush and Eager?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">OnPush views are checked only when dirty; Eager views are checked every time the walk reaches them. OnPush is the default in v22, Eager is the opt-in old behaviour, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Default</code> is a deprecated alias of Eager.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my field update in the console but not on screen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing notified Angular. In a zoneless OnPush app a plain field set in async code is invisible until the next notification. Use a signal, the async pipe, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What causes ExpressionChangedAfterItHasBeenCheckedError?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In dev mode Angular re-reads every binding after a run; if one changed during the run (for example a write in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngAfterViewInit</code>), it throws NG0100. Fix the data flow: derive the value or set it before the view is checked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does adding Zone.js back make everything re-render again?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with OnPush components. Zone.js only decides when a run starts; the walk still skips clean OnPush views. Verified: a plain field changed in a zone timer stayed stale under an OnPush root.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Change detection** | Re-running templates and patching only changed bindings |
| **View** | Runtime instance of a component template; views form a tree |
| **Dirty view** | A view flagged for refresh on the next run |
| **OnPush** | Strategy: check only when dirty; default since v22 |
| **Eager** | Strategy: check whenever the walk reaches it; replaces <code>Default</code> |
| **Scheduler** | Decides when a run happens; zoneless by default since v21 |
| **NG0100** | Dev-mode error when a binding changed during the run |

---
**Conclusion:** Angular change detection is a top-down walk over a tree of views that re-runs compiled templates and patches only the bindings whose values changed. In Angular 22 the walk is selective: views are OnPush by default and are visited only when a signal, an event, <code>markForCheck()</code> or a new input marked them, and in a zoneless app nothing else even starts a run. The verified counts make the rule concrete: a signal re-ran one template, a click re-ran the root and its Eager child, and a plain field changed in a timer re-ran nothing. Put template state in signals and the rest follows.`,
    examples: [
      {
        label: "Which views Angular re-checks: OnPush signal, OnPush plain field and Eager components",
        tech: "angular",
        runnable: true,
        code: `import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild, inject, signal } from "@angular/core";

// Every template calls checked("Name"), so the console shows which views
// Angular actually re-checked after each action.
const checks: Record<string, number> = {};
function checked(name: string) { checks[name] = (checks[name] ?? 0) + 1; return ""; }
function report(action: string) {
  setTimeout(() => {
    console.log(action.padEnd(28), JSON.stringify(checks));
    for (const k in checks) delete checks[k];
  }, 50);
}

@Component({
  selector: "signal-card", // OnPush: the v22 default, nothing to write
  template: \`{{ checked("Signal") }}<p>signal card: {{ count() }}</p>\`,
})
export class SignalCard {
  count = signal(0);
  checked = checked;
}

@Component({
  selector: "plain-card", // OnPush too, but its state is a plain field
  template: \`{{ checked("Plain") }}<p>plain card: {{ count }}</p>\`,
})
export class PlainCard {
  count = 0;
  cdr = inject(ChangeDetectorRef);
  checked = checked;
}

@Component({
  selector: "eager-card",
  changeDetection: ChangeDetectionStrategy.Eager, // the old "Default", opt-in in v22
  template: \`{{ checked("Eager") }}<p>eager card: {{ count }}</p>\`,
})
export class EagerCard {
  count = 0;
  checked = checked;
}

@Component({
  selector: "app-root",
  imports: [SignalCard, PlainCard, EagerCard],
  template: \`
    {{ checked("Root") }}
    <signal-card /><plain-card /><eager-card />
    <button id="click" (click)="clicked()">template click</button>
    <button id="signal" (click)="later('signal')">signal.set() in setTimeout</button>
    <button id="plain" (click)="later('plain')">plain field in setTimeout</button>
    <button id="mark" (click)="later('mark')">plain field + markForCheck()</button>
  \`,
})
export class AppComponent {
  @ViewChild(SignalCard) signalCard!: SignalCard;
  @ViewChild(PlainCard) plainCard!: PlainCard;
  checked = checked;

  constructor() { report("first render"); }

  clicked() { report("template (click)"); }

  later(kind: "signal" | "plain" | "mark") {
    setTimeout(() => {
      // Reset after the click itself has been processed, so we only count the async part.
      for (const k in checks) delete checks[k];
      if (kind === "signal") this.signalCard.count.update(n => n + 1);
      if (kind === "plain") this.plainCard.count++;
      if (kind === "mark") { this.plainCard.count++; this.plainCard.cdr.markForCheck(); }
      report(kind === "signal" ? "signal.set (async)" : kind === "plain" ? "plain field (async)" : "markForCheck (async)");
    }, 20);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does ChangeDetectorRef do?",
    seoDescription:
      "ChangeDetectorRef in Angular 22: markForCheck schedules a check, detectChanges checks now, detach and reattach take a view out of the tree. Verified.",
    description: `**Question presented to candidate:**
"You inject \`ChangeDetectorRef\` into a component. What can it do, when would you reach for \`markForCheck()\` versus \`detectChanges()\`, and why do you need it less in a signals-based Angular 22 app?"

**What a strong answer should cover:**
- \`ChangeDetectorRef\` is the handle to **one component's view** in the change detection tree; in v22 its public API is exactly four methods: \`markForCheck\`, \`detectChanges\`, \`detach\`, \`reattach\`.
- \`markForCheck()\` **flags the view and its ancestors** and lets the scheduler run later (asynchronous); \`detectChanges()\` **checks this view and its children right now** (synchronous), whether or not anything is flagged.
- \`detach()\` removes the view from the tree so normal runs skip it even when marked; \`detectChanges()\` still works on a detached view, which enables manual, throttled rendering.
- Under the v22 defaults (OnPush, zoneless) a plain field changed in async code needs one of these; a **signal** needs neither, and \`AsyncPipe\` calls \`markForCheck()\` internally.
- \`checkNoChanges()\` was removed from the public \`ChangeDetectorRef\` API in v22; tests use \`fixture.detectChanges()\` instead.

**Clarifying questions expected:**
- "Is the state in signals already, or is this legacy code with plain fields and Observables?"
- "Is the goal to fix a stale view, or to deliberately throttle rendering of a hot component?"

**Code / implementation expected:** Yes — show \`markForCheck()\` and \`detectChanges()\` updating a stale OnPush view, and \`detach()\` blocking normal updates.`,
    answer: `**Target Audience:** Developers who know what a component is and want to control when its view updates — no internals knowledge assumed.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The method list was read from the Angular 22.2.3 typings, and every DOM snapshot below was produced by compiling and running the example on 22.2.3.

## 1. Why This Even Matters — A Story First

Think of a restaurant where the waiter only walks over to a table when the table raises a little flag. Most of the time that is perfect: no hovering, no wasted trips.

Now a guest quietly finishes their soup without raising the flag. The waiter never comes. The empty bowl sits there. To fix it you have two options: **raise the flag** for the guest so the waiter stops by on the next round, or **grab the waiter by the arm** and make them deal with this table right now, before doing anything else.

In Angular 22 every component is that table (OnPush is the default), the waiter is change detection, and <code>ChangeDetectorRef</code> gives your component both options: <code>markForCheck()</code> raises the flag, <code>detectChanges()</code> grabs the waiter. It also lets a table say "do not visit me at all" (<code>detach()</code>) for when the table would rather call the waiter itself.

## 2. The Core Idea

📌 **Interview term: ChangeDetectorRef** — an injectable handle to the current component's view in the change detection tree. You get it with <code>inject(ChangeDetectorRef)</code> (see [inject() vs constructor injection](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)). In Angular 22.2.3 the public abstract class has exactly four methods:

| Method | What it does | Sync or async |
| :--- | :--- | :--- |
| <code>markForCheck()</code> | Flags this view **and every ancestor** as dirty and notifies the scheduler | Async: the DOM changes on the next run |
| <code>detectChanges()</code> | Runs change detection on **this view and its children**, now | Sync: the DOM is updated before the next line runs |
| <code>detach()</code> | Takes this view out of the tree: normal runs skip it even when it is marked | Takes effect from the next run |
| <code>reattach()</code> | Puts it back | Takes effect from the next run |

📌 **Interview term: Dirty flag** — the marker that tells a [change detection](/interview-question/how-does-change-detection-work-in-angular) run to refresh a view. OnPush views (the v22 default) are only refreshed when flagged.

The method that is *not* in the list matters too: <code>checkNoChanges()</code> was removed from the public <code>ChangeDetectorRef</code> API in v22 (the 22.2.3 typings list only the four methods above, and the v22.0.0-next.4 changelog records the removal). In tests, call <code>fixture.detectChanges()</code>, which still runs the no-changes check in dev mode; see [fixture.detectChanges()](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-).

## 3. Raising the Flag vs Grabbing the Waiter

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="markForCheck flags the view and the DOM updates on a later scheduled run, detectChanges checks the view immediately so the next line already sees the new DOM">
  <defs>
    <marker id="cdr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="180" height="64" rx="10"/>
  <text class="d-text" x="120" y="56" text-anchor="middle">count++</text>
  <text class="d-sub" x="120" y="78" text-anchor="middle">DOM still shows 0</text>
  <path class="d-edge" d="M 214 62 L 266 62" marker-end="url(#cdr-arrow)"/>
  <rect class="d-box-muted" x="270" y="30" width="180" height="64" rx="10"/>
  <text class="d-text" x="360" y="56" text-anchor="middle">markForCheck()</text>
  <text class="d-sub" x="360" y="78" text-anchor="middle">flag view and parents</text>
  <path class="d-edge-dashed" d="M 454 62 L 506 62" marker-end="url(#cdr-arrow)"/>
  <rect class="d-box-accent" x="510" y="30" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="600" y="56" text-anchor="middle">later: scheduled run</text>
  <text class="d-sub" x="600" y="78" text-anchor="middle">DOM shows new value</text>
  <rect class="d-box" x="30" y="150" width="180" height="64" rx="10"/>
  <text class="d-text" x="120" y="176" text-anchor="middle">count++</text>
  <text class="d-sub" x="120" y="198" text-anchor="middle">DOM still shows 0</text>
  <path class="d-edge" d="M 214 182 L 266 182" marker-end="url(#cdr-arrow)"/>
  <rect class="d-box-accent" x="270" y="150" width="180" height="64" rx="10"/>
  <text class="d-text d-accent" x="360" y="176" text-anchor="middle">detectChanges()</text>
  <text class="d-sub" x="360" y="198" text-anchor="middle">check this view now</text>
  <path class="d-edge" d="M 454 182 L 506 182" marker-end="url(#cdr-arrow)"/>
  <rect class="d-box" x="510" y="150" width="180" height="64" rx="10"/>
  <text class="d-text" x="600" y="176" text-anchor="middle">next line of code</text>
  <text class="d-sub" x="600" y="198" text-anchor="middle">already sees new DOM</text>
</svg>

The top row is the polite option: the flag is set at once, but the DOM changes only when the scheduler runs (the dashed arrow is "some time later"). The bottom row is the forceful one: the check happens inside the call, so code on the next line already reads the updated DOM.

## 4. Verified: all four methods on a stale OnPush view

The example at the bottom has an OnPush child with a **plain field** <code>count</code> (deliberately not a signal) and buttons that increment it inside a <code>setTimeout</code>, so no template event is involved in the update itself. For each button the log records the field, the DOM text immediately after the call, and the DOM text 20 ms later. Compiled with <code>ngc</code> and run in jsdom, buttons clicked in this order: silent, markForCheck, detectChanges, detach, markForCheck, detectChanges, reattach:

\`\`\`
1. silent: field=1, DOM right after="count: 0", DOM later="count: 0"
2. markForCheck: field=2, DOM right after="count: 0", DOM later="count: 2"
3. detectChanges: field=3, DOM right after="count: 3", DOM later="count: 3"
4. detached
5. markForCheck: field=4, DOM right after="count: 3", DOM later="count: 3"
6. detectChanges: field=5, DOM right after="count: 5", DOM later="count: 5"
7. reattached
final: count: 5
\`\`\`

What each line proves:

- **Line 1:** a plain field changed in async code is invisible in a zoneless OnPush app. Nothing was wrong with the code; nobody told Angular.
- **Line 2:** <code>markForCheck()</code> is asynchronous. Right after the call the DOM still said 0; by the next run it said 2 (catching up the silent increment too).
- **Line 3:** <code>detectChanges()</code> is synchronous. The DOM was already updated on the very next line.
- **Line 5:** a detached view ignores <code>markForCheck()</code>. The flag was set but normal runs no longer visit the view, so the DOM stayed at 3.
- **Line 6:** <code>detectChanges()</code> still works on a detached view. That is the documented pattern for manual rendering: detach, then check on your own schedule.

## 5. When You Actually Need It in Angular 22

📌 **Interview term: Notification** — anything that tells the zoneless scheduler a run is needed: a signal read by a template changing, a template event, <code>markForCheck()</code>, <code>ComponentRef.setInput()</code>. The [zoneless doc](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) lists them in full.

| Situation | Do you need ChangeDetectorRef? |
| :--- | :--- |
| State is a [signal](/interview-question/what-are-angular-signals) read in the template | No, the signal notifies |
| Value arrives through the <code>async</code> pipe | No, the pipe calls <code>markForCheck()</code> |
| Legacy plain field updated by a callback, timer or third-party library | Yes: <code>markForCheck()</code>, or better, convert the field to a signal |
| A hot component (a chart fed 60 times a second) you want to repaint at most every 200 ms | Yes: <code>detach()</code> plus a throttled <code>detectChanges()</code> |
| You need the DOM updated before measuring it in the same function | <code>detectChanges()</code>, though [afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks) is usually cleaner |
| Unit tests | No, use <code>fixture.detectChanges()</code> or <code>await fixture.whenStable()</code> |

📌 **Interview term: Local change detection** — checking one subtree on demand with <code>detectChanges()</code> instead of waiting for an app-wide run. It is fast, but it bypasses the scheduler's batching, so calling it in a loop renders repeatedly.

## 6. markForCheck vs detectChanges in One Table

| | <code>markForCheck()</code> | <code>detectChanges()</code> |
| :--- | :--- | :--- |
| Timing | Async, on the next scheduled run | Sync, inside the call |
| Scope | Flags this view and ancestors; the run walks from the root | Checks this view and its descendants only |
| Batching | Many calls in one task produce one run | Each call is a separate check |
| Works when detached | No (verified, line 5) | Yes (verified, line 6) |
| Typical use | "Something changed, please update soon" | Manual rendering, measuring the DOM right away |
| Risk | None worth naming | Recursive calls during a run, wasted renders in loops |

The batching row was checked separately: a component's field was incremented 100 times inside one <code>setTimeout</code>, calling the method each time, while its template counted its own executions.

\`\`\`
100x markForCheck in one task: {"Root":1,"Plain":1,"Eager":1}
100x detectChanges in one task: {"Plain":100}
\`\`\`

One run for 100 marks (the root and the Eager sibling come along because marks travel up to the root), versus 100 separate checks of the one view.

## 7. Common Pitfalls

- **Reaching for <code>detectChanges()</code> by reflex.** It works, but it renders immediately and unbatched. <code>markForCheck()</code>, or a signal, is the default answer.
- **Calling <code>detectChanges()</code> inside a lifecycle hook during a run.** It can trigger nested checks and NG0100 errors; restructure the data flow instead, as described in [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks).
- **Forgetting that detach is sticky.** A detached view is skipped by every normal run, however it was marked, until <code>reattach()</code>. Verified: <code>markForCheck()</code> on a detached view changed nothing.
- **Quoting <code>cdr.checkNoChanges()</code>.** It is gone from the public API in v22.
- **Keeping plain fields and sprinkling <code>markForCheck()</code>.** It works, but each forgotten call is a stale-UI bug. Converting the field to a signal removes the class of bug; see [computed signals vs methods](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) for the derived-value side.
- **Confusing it with <code>ApplicationRef.tick()</code>.** <code>tick()</code> starts an app-wide run; in a zoneless app it only refreshes views that are already flagged.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ChangeDetectorRef</code> is the handle to my component's view in the change detection tree: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detach</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reattach</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The key contrast:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> flags my view and its ancestors and lets the scheduler run later; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code> checks my view and children right now, synchronously."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Detach:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detach()</code> takes the view out of normal runs even when marked, so I can render on my own schedule with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it matters in v22:</strong> <span style="color:#f0e2c8;">"Components are OnPush and apps are zoneless by default, so a plain field changed in async code stays stale unless something notifies Angular."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern stance:</strong> <span style="color:#f0e2c8;">"With signals and the async pipe I rarely need it; it is for legacy fields, third-party callbacks and deliberate throttling."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">markForCheck()</code> synchronous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Verified on 22.2.3: right after the call the DOM still showed the old value; it updated on the next scheduled run. Many calls in one task collapse into one run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">markForCheck()</code> on a detached view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing visible. The flag is set, but normal runs skip detached views. Verified: the DOM stayed stale until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code> was called directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">detectChanges()</code> the right tool?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you control rendering yourself: a detached, high-frequency widget repainted on a throttle, or the rare case where you must read the updated DOM in the same function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the async pipe work without Zone.js?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On every emission it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> on its host view, which is a notification the zoneless scheduler listens to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaced <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cdr.checkNoChanges()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It left the public API in v22. Dev-mode runs still perform the check automatically, tests get it through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideCheckNoChangesConfig</code> tunes it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ChangeDetectorRef** | Handle to one component view in the change detection tree |
| **markForCheck()** | Flag this view and ancestors; update on the next run |
| **detectChanges()** | Check this view and children now, synchronously |
| **detach() / reattach()** | Remove the view from, or return it to, normal runs |
| **Dirty flag** | Marker that a view must be refreshed |
| **Notification** | Anything that tells the zoneless scheduler to run |
| **Local change detection** | Checking one subtree on demand |

---
**Conclusion:** <code>ChangeDetectorRef</code> is how a component talks to change detection about its own view. <code>markForCheck()</code> says "update me on the next run" and is batched and asynchronous; <code>detectChanges()</code> says "update me now" and is synchronous and unbatched; <code>detach()</code> and <code>reattach()</code> decide whether normal runs visit the view at all. The verified log shows each behaviour on a stale OnPush view. In an Angular 22 app built on signals and the async pipe you rarely need it, which is exactly the point: it is the escape hatch for state Angular cannot see.`,
    examples: [
      {
        label: "markForCheck vs detectChanges vs detach on an OnPush component with a plain field",
        tech: "angular",
        runnable: true,
        code: `import { ChangeDetectorRef, Component, ViewChild, inject, signal } from "@angular/core";

// A separate log component: its signal re-renders only this view,
// so it never refreshes the counter by accident.
@Component({
  selector: "event-log",
  template: \`<ol>@for (line of lines(); track $index) { <li>{{ line }}</li> }</ol>\`,
})
export class EventLog {
  lines = signal<string[]>([]);
  add(line: string) { this.lines.update(l => [...l, line]); }
}

// OnPush is the v22 default, and count is a PLAIN field, not a signal.
@Component({
  selector: "plain-counter",
  template: \`<p id="count">count: {{ count }}</p>\`,
})
export class PlainCounter {
  count = 0;
  cdr = inject(ChangeDetectorRef);
  shown = () => document.getElementById("count")!.textContent;
}

@Component({
  selector: "app-root",
  imports: [EventLog, PlainCounter],
  template: \`
    <plain-counter #c />
    <button id="silent" (click)="later(c, 'silent')">++ in setTimeout</button>
    <button id="mark" (click)="later(c, 'markForCheck')">++ then markForCheck()</button>
    <button id="detect" (click)="later(c, 'detectChanges')">++ then detectChanges()</button>
    <button id="detach" (click)="toggle(c)">{{ attached ? "detach()" : "reattach()" }}</button>
    <event-log />
  \`,
})
export class AppComponent {
  attached = true;
  @ViewChild(EventLog) log!: EventLog;

  later(c: PlainCounter, how: "silent" | "markForCheck" | "detectChanges") {
    // setTimeout: no template event is involved, so nothing marks the view dirty for us.
    setTimeout(() => {
      c.count++;
      if (how === "markForCheck") c.cdr.markForCheck();   // schedules a check, async
      if (how === "detectChanges") c.cdr.detectChanges(); // checks this view now, sync
      const now = c.shown();
      setTimeout(() => this.write(\`\${how}: field=\${c.count}, DOM right after="\${now}", DOM later="\${c.shown()}"\`), 20);
    });
  }

  toggle(c: PlainCounter) {
    this.attached ? c.cdr.detach() : c.cdr.reattach();
    this.attached = !this.attached;
    this.write(this.attached ? "reattached" : "detached");
  }

  write(line: string) { this.log.add(line); }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is NgZone and when do you run outside Angular?",
    seoDescription:
      "NgZone wraps Zone.js so Angular knows when async work ends. Why runOutsideAngular cuts change detection runs, and what NgZone means in zoneless v22.",
    description: `**Question presented to candidate:**
"We have an Angular app that still uses Zone.js, and profiling shows change detection firing hundreds of times a second while a chart animates. What is \`NgZone\`, why is this happening, and how would \`runOutsideAngular\` help? Does any of this apply to a new Angular 22 app?"

**What a strong answer should cover:**
- \`NgZone\` is Angular's wrapper around a **Zone.js zone named "angular"**; every async task started inside it is tracked, and when the zone settles (\`onMicrotaskEmpty\`) Angular runs change detection.
- Hot async work inside the zone (\`requestAnimationFrame\`, \`mousemove\`, \`setInterval\`, WebSocket messages) therefore causes a run **per task**.
- \`runOutsideAngular(fn)\` starts work in the **parent (root) zone**, so its tasks do not trigger runs; \`run(fn)\` re-enters the Angular zone when the UI must update.
- Also: \`NgZone.isInAngularZone()\`, \`onStable\`/\`onUnstable\`, and \`provideZoneChangeDetection({ eventCoalescing: true })\`.
- Since v21 apps are **zoneless by default** and inject a no-op \`NgZone\`; Zone.js is opt-in via \`provideZoneChangeDetection()\` plus the polyfill. With OnPush (v22 default), even re-entering the zone does not refresh a plain field; signals do.

**Clarifying questions expected:**
- "Is this app on \`provideZoneChangeDetection()\` or already zoneless?"
- "Is the hot work coming from our code or from a third-party library that schedules its own timers?"

**Code / implementation expected:** Yes — move a high-frequency loop outside the zone and re-enter with \`zone.run()\` for the final UI update.`,
    answer: `**Target Audience:** Developers maintaining Zone.js-based Angular apps, or anyone asked about NgZone in an interview — basic async JavaScript assumed, no Zone.js knowledge needed.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The class names, zone names and run counts below were printed by running the code on Angular 22.2.3 with zone.js 0.16.3 in jsdom.

## 1. Why This Even Matters — A Story First

Imagine a theatre where the stage manager refreshes all the stage lighting every time any crew member finishes a task. Somebody moved a chair: refresh. Somebody tied a rope: refresh. It keeps the stage correct without anyone having to report what they did.

Then a crew member starts operating a smoke machine that puffs sixty times a second. Each puff counts as "a task finished", so the lights refresh sixty times a second, and the whole theatre slows down for something that never needed the lights at all.

The fix is to send the smoke machine operator to work **backstage**, where the stage manager does not watch. When the operator has something that really affects the stage, they step back on stage once and say so.

That stage manager is **NgZone**, "backstage" is **<code>runOutsideAngular</code>**, and stepping back on stage is **<code>run</code>**. In a Zone.js-based Angular app this is the classic performance fix for animations, scroll handlers, and chatty sockets.

## 2. The Core Idea

📌 **Interview term: Zone.js** — a library that patches the browser async APIs (timers, promises, event listeners, XHR and fetch) so a piece of code called a **zone** can be told whenever async work is scheduled and finished. How the patching works is covered in [the Zone.js deep dive](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon).

📌 **Interview term: NgZone** — Angular's service wrapping one zone, named <code>"angular"</code>. Code that runs inside it, and every callback it schedules, is tracked. When the zone has no more pending microtasks it emits <code>onMicrotaskEmpty</code>, and a Zone-based Angular app reacts by running [change detection](/interview-question/how-does-change-detection-work-in-angular).

📌 **Interview term: runOutsideAngular** — <code>zone.runOutsideAngular(fn)</code> runs <code>fn</code> in the parent zone (the root zone), so the tasks it schedules are invisible to Angular and trigger no runs. <code>zone.run(fn)</code> is the opposite: it re-enters the Angular zone.

The rest of the API in one table:

| Member | What it gives you |
| :--- | :--- |
| <code>run(fn)</code> | Run inside the Angular zone; returns <code>fn</code>'s result |
| <code>runOutsideAngular(fn)</code> | Run in the parent zone; tasks do not trigger change detection |
| <code>NgZone.isInAngularZone()</code> | Static check: is the current code inside the Angular zone? |
| <code>onUnstable</code> / <code>onStable</code> | Emit when the zone starts work, and when it has none left |
| <code>onMicrotaskEmpty</code> | Emits when the microtask queue drains; the run trigger in Zone mode |
| <code>provideZoneChangeDetection({ eventCoalescing: true })</code> | Opt into Zone mode, and coalesce bubbling events into one run |

## 3. Angular 22: Which NgZone Do You Get?

Since v21 a new app is **zoneless**: <code>bootstrapApplication</code> without extra providers uses a scheduler driven by signals and other notifications, not by zones (see [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18)). <code>NgZone</code> can still be injected, so old code keeps compiling, but what you get is different. Verified by injecting it in the root component's constructor:

\`\`\`
--- bare bootstrapApplication (the default)
NgZone class          : NoopNgZone
Zone.current in ctor  : <root>
isInAngularZone()     : false
runOutsideAngular zone: <root>

--- with provideZoneChangeDetection()
NgZone class          : _NgZone
Zone.current in ctor  : angular
isInAngularZone()     : true
runOutsideAngular zone: <root>
\`\`\`

(<code>_NgZone</code> is just the bundler renaming the real <code>NgZone</code> class.) Zone.js was loaded on the page in both runs. In the default case Angular simply does not use it: <code>NoopNgZone.run(fn)</code> and <code>runOutsideAngular(fn)</code> both just call <code>fn</code> (read from the 22.2.3 source), and its <code>onStable</code> never emitted in the same probe while timers fired. So in a zoneless app <code>runOutsideAngular</code> is harmless but pointless.

📌 **Interview term: NoopNgZone** — the do-nothing <code>NgZone</code> used by zoneless apps. It is a private export in 22.2.3 (<code>ɵNoopNgZone</code>), which is why you should never <code>instanceof</code>-check against it.

## 4. Inside vs Outside the Zone

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="Tasks scheduled inside the Angular zone each end with a change detection run, tasks scheduled outside in the root zone trigger none, and zone run brings one final update back in">
  <defs>
    <marker id="ngz-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="210" rx="12"/>
  <text class="d-text" x="180" y="58" text-anchor="middle">Angular zone</text>
  <rect class="d-box" x="60" y="80" width="240" height="44" rx="8"/>
  <text class="d-sub" x="180" y="107" text-anchor="middle">100 timers fire</text>
  <path class="d-edge" d="M 180 128 L 180 166" marker-end="url(#ngz-arrow)"/>
  <rect class="d-box-accent" x="60" y="172" width="240" height="44" rx="8"/>
  <text class="d-sub" x="180" y="199" text-anchor="middle">101 zone turns, each may run CD</text>
  <rect class="d-box-muted" x="390" y="30" width="300" height="210" rx="12"/>
  <text class="d-text" x="540" y="58" text-anchor="middle">Root zone (outside)</text>
  <rect class="d-box" x="420" y="80" width="240" height="44" rx="8"/>
  <text class="d-sub" x="540" y="107" text-anchor="middle">100 timers fire</text>
  <path class="d-edge" d="M 540 128 L 540 166" marker-end="url(#ngz-arrow)"/>
  <rect class="d-box" x="420" y="172" width="240" height="44" rx="8"/>
  <text class="d-sub" x="540" y="199" text-anchor="middle">0 zone turns</text>
  <path class="d-edge-accent" d="M 416 194 L 312 194" marker-end="url(#ngz-arrow)"/>
</svg>

The left box is what happens by default in a Zone app: every timer callback is a zone turn, and every turn is a chance for a full change detection pass. The right box is the same work moved with <code>runOutsideAngular</code>: Angular never hears about it. The accent arrow is <code>zone.run()</code>, used once at the end to bring the result back in.

## 5. Verified: 100 timers in and out of the zone

The example at the bottom opts into Zone mode with <code>provideZoneChangeDetection({ eventCoalescing: true })</code> and counts <code>onMicrotaskEmpty</code> emissions while 100 timers fire, first inside the Angular zone, then via <code>runOutsideAngular</code>. Compiled with <code>ngc</code> and run in jsdom:

\`\`\`
NgZone in use: true | in Angular zone: true
inside : zone turns that could trigger change detection = 101
DOM: finished bursts: 1 | plain field: 100
outside: zone turns that could trigger change detection = 0
DOM: finished bursts: 2 | plain field: 200
\`\`\`

A separate probe counted <code>ApplicationRef</code> ticks directly: one <code>setTimeout</code> scheduled via <code>zone.run()</code> produced <code>ticks=2</code> (one for the <code>run</code> call itself, one for the timer), and 100 timers produced <code>ticks=101</code>. The same 100 timers scheduled via <code>runOutsideAngular</code> produced <code>ticks=0</code>.

Notice also how the UI update is done: the final <code>zone.run()</code> sets a **signal**. The plain field <code>plain</code> shows the right number only because the signal refreshed the same template. In an earlier experiment, a plain field written in a timer inside the zone stayed stale under the OnPush root, because v22 components are OnPush by default and a zone turn does not mark anything dirty.

One environment note: in this jsdom harness the template <code>(click)</code> handler itself ran in the <code>&lt;root&gt;</code> zone (jsdom event targets were not patched by zone.js here), so the example enters the zone explicitly with <code>zone.run()</code>. In a real browser zone.js patches <code>addEventListener</code> and handlers run in the Angular zone; that part was not checked in a browser for this doc.

## 6. When to Run Outside Angular

| Work | Why it hurts inside the zone | Pattern |
| :--- | :--- | :--- |
| <code>requestAnimationFrame</code> loops, canvas, charts | One run per frame | Loop outside; <code>zone.run</code> only when a bound value changes |
| <code>mousemove</code>, <code>scroll</code>, <code>resize</code> listeners | Dozens of runs per second | Listen outside; compute; re-enter for the result |
| Polling with <code>setInterval</code> | A run per tick even when nothing changed | Poll outside; re-enter only on new data |
| Third-party libraries (maps, editors, analytics) | They schedule their own timers | Initialise them inside <code>runOutsideAngular</code> |
| WebSocket or SSE streams | A run per message | Buffer outside; flush in a <code>zone.run</code> |
| Anything in a zoneless app | Nothing to avoid: tasks never trigger runs | Use [signals](/interview-question/what-are-angular-signals) and drop the wrapper |

📌 **Interview term: Event coalescing** — with <code>eventCoalescing: true</code>, several event handlers fired by one native event (for example a click bubbling through two bound elements) produce one change detection run instead of one each. The option is documented on <code>NgZoneOptions</code> in the 22.2.3 typings; it was not measured for this doc.

## 7. Common Pitfalls

- **Forgetting to come back in.** Work outside the zone updates a field, and the screen never changes. In v22 the fix is a signal; in older Default-strategy code it was <code>zone.run()</code>.
- **Assuming <code>zone.run()</code> refreshes OnPush views.** It only starts a run; a plain field in an OnPush component still needs a mark or a signal (verified above).
- **Wrapping everything in <code>runOutsideAngular</code> in a zoneless app.** It is a no-op there (verified: the code ran in <code>&lt;root&gt;</code> either way); remove it when migrating.
- **Registering long-lived listeners inside the zone in tests.** Zone-based tests wait for the zone to be stable; an open <code>setInterval</code> inside it keeps it unstable forever, which is the usual cause of timeouts in [fakeAsync and waitForAsync tests](/interview-question/what-is-the-difference-between-fakeasync-tick-and-waitforasync-in-angular-unit-t).
- **Checking <code>instanceof NoopNgZone</code>.** It is a private export; use <code>NgZone.isInAngularZone()</code> if you must branch.
- **Blaming NgZone for slowness that is really expensive templates.** Fewer runs help, but a template calling heavy methods is still slow per run; see [computed signals vs methods](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgZone</code> wraps a Zone.js zone called angular; async work started inside it is tracked, and when the zone settles a Zone-based app runs change detection."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The problem:</strong> <span style="color:#f0e2c8;">"Hot async work inside the zone, like animation frames or mousemove, causes a change detection run per task."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The fix:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runOutsideAngular</code> schedules that work in the root zone so it triggers nothing, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zone.run</code> re-enters once when the UI must update."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">"On 22.2.3, 100 timers inside the zone produced 101 zone turns; the same timers outside produced zero."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern context:</strong> <span style="color:#f0e2c8;">"Since v21 apps are zoneless and inject a no-op NgZone, so in new code the answer is signals; NgZone matters for apps that opt in with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideZoneChangeDetection()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What NgZone does a v22 app get by default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoopNgZone</code>. Verified: the injected class was NoopNgZone and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgZone.isInAngularZone()</code> was false, even with zone.js on the page. Zone mode needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideZoneChangeDetection()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">After <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">runOutsideAngular</code>, how do you update the view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a signal (the zoneless-friendly way, and the one that also refreshes OnPush views), or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zone.run()</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> for plain fields.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which event drives change detection in Zone mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMicrotaskEmpty</code>: when the Angular zone drains its microtask queue, Angular schedules a tick. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onStable</code> follows when no tasks remain at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">eventCoalescing</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes several handlers triggered by one native event share a single change detection run instead of one run per handler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you still learn NgZone if new apps are zoneless?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: most production Angular code predates v21, third-party libraries still use it, and migration to zoneless starts by finding code that relies on zone-triggered runs.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Zone.js** | Library that patches async APIs so a zone can track tasks |
| **NgZone** | Angular service around the "angular" zone |
| **runOutsideAngular** | Run code in the root zone; its tasks trigger no runs |
| **run** | Re-enter the Angular zone |
| **onMicrotaskEmpty** | Zone event that triggers change detection in Zone mode |
| **NoopNgZone** | The do-nothing NgZone injected in zoneless apps |
| **Event coalescing** | One run per native event instead of one per handler |

---
**Conclusion:** <code>NgZone</code> is the bridge between Zone.js and Angular: inside the "angular" zone every async task is tracked, and each time the zone settles a Zone-based app runs change detection. That is convenient until high-frequency work multiplies the runs, which is what <code>runOutsideAngular</code> is for; the verified count went from 101 zone turns to zero. In Angular 22 the picture shifts: new apps are zoneless and inject a no-op <code>NgZone</code>, components are OnPush, and the clean way to update the UI after background work is a signal, with <code>NgZone</code> knowledge reserved for apps that opt back into Zone.js.`,
    examples: [
      {
        label: "100 timers inside vs outside the Angular zone (app opted into Zone.js)",
        tech: "angular",
        runnable: false,
        code: `import {
  ApplicationConfig, Component, NgZone, inject, provideZoneChangeDetection, signal,
} from "@angular/core";

@Component({
  selector: "app-root",
  template: \`
    <button id="inside" (click)="burst(false)">100 timers inside the zone</button>
    <button id="outside" (click)="burst(true)">100 timers outside the zone</button>
    <p>finished bursts: {{ done() }} | plain field: {{ plain }}</p>
  \`,
})
export class AppComponent {
  private zone = inject(NgZone);
  done = signal(0);
  plain = 0;
  private turns = 0;

  constructor() {
    // onMicrotaskEmpty fires each time the Angular zone settles, which is what
    // makes Zone-based Angular run change detection.
    this.zone.onMicrotaskEmpty.subscribe(() => this.turns++);
    console.log("NgZone in use:", this.zone instanceof NgZone, "| in Angular zone:", NgZone.isInAngularZone());
  }

  burst(outside: boolean) {
    // Let the click's own turn finish, then count only what the timers cause.
    setTimeout(() => {
      this.turns = 0;
      const schedule = () => { for (let i = 0; i < 100; i++) setTimeout(() => this.plain++); };
      outside ? this.zone.runOutsideAngular(schedule) : this.zone.run(schedule);
      setTimeout(() => {
        console.log(\`\${outside ? "outside" : "inside "}: zone turns that could trigger change detection = \${this.turns}\`);
        // Coming back in: a signal tells Angular what changed. Plain field writes alone would not
        // refresh this OnPush (v22 default) view, even inside zone.run().
        this.zone.run(() => this.done.update(n => n + 1));
      }, 50);
    });
  }
}

// Zone.js-based change detection is opt-in since v21 (and zone.js must be loaded as a polyfill).
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })],
};`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Zone.js, how does it monkey-patch browser APIs, and how do you build a Zoneless Angular application?",
    seoDescription:
      "How Zone.js wraps setTimeout, Promise and listeners to track async tasks, why native async/await escapes it, and the steps to make an Angular app zoneless.",
    description: `**Question presented to candidate:**
"Explain what Zone.js actually does to the browser when it loads, how Angular used it to know when to update the screen, and then walk me through taking an existing Zone-based app to zoneless."

**What a strong answer should cover:**
- **Monkey-patching:** Zone.js replaces async APIs (\`setTimeout\`, \`setInterval\`, \`Promise\`, \`addEventListener\`, XHR, \`fetch\`, \`requestAnimationFrame\`) with wrappers that turn each call into a **task** and keep the original under a \`__zone_symbol__\` key.
- A **zone** is an execution context that survives async boundaries; \`Zone.current.fork({...})\` adds hooks like \`onScheduleTask\`, \`onInvokeTask\`, \`onHasTask\`. Task kinds: **microTask, macroTask, eventTask**.
- Angular's \`NgZone\` is one such fork; when it settles, Zone-based apps run change detection.
- Limits: native **\`async/await\` cannot be patched**, so Zone apps need the build to downlevel it; patching costs bundle size and makes stack traces noisier.
- Zoneless migration: remove \`provideZoneChangeDetection()\`, remove \`zone.js\` from \`polyfills\` (build and test), move template state to **signals** or \`markForCheck()\`, replace \`onStable\`/\`onMicrotaskEmpty\` logic, use \`PendingTasks\` for SSR stability. Zoneless is the default since v21.

**Clarifying questions expected:**
- "Which Angular version is the app on, and does it use OnPush already?"
- "Do any third-party libraries rely on Zone.js-triggered change detection?"

**Code / implementation expected:** Optional — a forked zone logging its hooks, and the config diff for going zoneless.`,
    answer: `**Target Audience:** Developers who have heard "Zone.js" and "zoneless" and want to know what actually happens underneath, plus anyone planning a migration — comfortable with callbacks and promises, no Zone.js knowledge needed.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The patching facts and hook order were printed by running code against zone.js 0.16.3 with Angular 22.2.3; the async/await finding comes from two real <code>ng build</code> runs with Angular CLI 22.2.3.

## 1. Why This Even Matters — A Story First

Imagine a hotel where every guest leaves through the front door, and the front desk wants to know, at any moment, whether anybody from a particular tour group is still out. Asking guests to sign out is unreliable; half of them forget.

So the hotel quietly replaces the front door with a revolving door that has a counter built in. Guests do not notice anything: it still looks and works like a door. But every time someone from the tour group goes out or comes back, the counter clicks, and the desk always knows when the whole group is home.

**Zone.js** is that revolving door. It replaces the browser's own "doors" for asynchronous work (timers, promises, event listeners, network calls) with lookalike wrappers that count. For a decade Angular used the count to answer one question: "has all the work that might have changed my data finished, so I can update the screen?"

**Zoneless Angular** removes the revolving door entirely and asks the guests to report changes themselves, with signals. That is cheaper and more precise, and since v21 it is the default.

## 2. How the Monkey-Patch Works

📌 **Interview term: Monkey-patching** — replacing a built-in function at runtime with your own version that does extra work and then calls the original. When zone.js loads, it does this for <code>setTimeout</code>, <code>setInterval</code>, <code>Promise</code>, <code>queueMicrotask</code>, <code>requestAnimationFrame</code>, <code>addEventListener</code>, XHR and <code>fetch</code>.

📌 **Interview term: Zone** — an execution context that follows your code across async boundaries. A callback scheduled in zone A runs in zone A later, even though the call stack in between is gone. <code>Zone.current</code> is the active zone; <code>Zone.root</code> is the outermost one, named <code>&lt;root&gt;</code>.

📌 **Interview term: Task** — zone.js's record of one piece of scheduled work. There are three kinds: **microTask** (promise callbacks, <code>queueMicrotask</code>), **macroTask** (timers, XHR) and **eventTask** (event listeners, which can fire many times).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Calling setTimeout hits the zone.js wrapper, which records a task in the current zone and calls the original browser timer, and the callback later runs inside the zone that scheduled it">
  <defs>
    <marker id="zjs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">your code</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">setTimeout(cb)</text>
  <path class="d-edge" d="M 174 95 L 206 95" marker-end="url(#zjs-arrow)"/>
  <rect class="d-box-accent" x="210" y="60" width="150" height="70" rx="10"/>
  <text class="d-text d-accent" x="285" y="90" text-anchor="middle">zone.js wrapper</text>
  <text class="d-sub" x="285" y="112" text-anchor="middle">create a task</text>
  <path class="d-edge" d="M 364 95 L 396 95" marker-end="url(#zjs-arrow)"/>
  <rect class="d-box-muted" x="400" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="475" y="90" text-anchor="middle">original timer</text>
  <text class="d-sub" x="475" y="112" text-anchor="middle">__zone_symbol__</text>
  <path class="d-edge-dashed" d="M 554 95 L 586 95" marker-end="url(#zjs-arrow)"/>
  <rect class="d-box" x="590" y="60" width="115" height="70" rx="10"/>
  <text class="d-text" x="647" y="90" text-anchor="middle">cb runs</text>
  <text class="d-sub" x="647" y="112" text-anchor="middle">in same zone</text>
</svg>

Your code calls what it thinks is <code>setTimeout</code>. It is really the wrapper, which records a task in <code>Zone.current</code>, runs the zone hooks, and then calls the browser original that zone.js saved under <code>__zone_symbol__setTimeout</code>. When the timer fires (dashed arrow, some time later), the wrapper restores the zone that scheduled it before calling your callback, and tells the zone the task is done.

## 3. Verified: watching the patch and the hooks

The example at the bottom checks the patch, then forks a zone with three hooks and schedules one timer and one promise callback in it. Compiled with <code>ngc</code> and run in jsdom with zone.js 0.16.3 loaded:

\`\`\`
1. setTimeout is the original: false
2. wrapper remembers original: true
3. Promise is now: ZoneAwarePromise
4. schedule macroTask (setTimeout)
5. hasTask macro=true micro=false
6. schedule microTask (Promise.then)
7. hasTask macro=true micro=true
8. invoke microTask (Promise.then)
9. then callback ran in zone "demo"
10. hasTask macro=true micro=false
11. invoke macroTask (setTimeout)
12. timer callback ran in zone "demo"
13. hasTask macro=false micro=false
14. back outside, Zone.current is "<root>"
\`\`\`

Lines 1 to 3 are the patch itself: the global <code>setTimeout</code> is no longer the original, the wrapper keeps a pointer to it (<code>__zone_symbol__OriginalDelegate</code>), and the global <code>Promise</code> has been swapped for zone.js's <code>ZoneAwarePromise</code>. A separate probe also showed <code>setTimeout.toString() === original.toString()</code> is <code>true</code>: the wrapper deliberately looks native when printed.

Lines 4 to 13 are the bookkeeping. <code>onHasTask</code> is the key hook: line 13, "no macrotasks and no microtasks left", is exactly the moment a zone knows all its async work is done. Angular's <code>NgZone</code> is a zone forked with hooks like these, and that "nothing left" moment is when a Zone-based app runs change detection; [the NgZone doc](/interview-question/what-is-ngzone-and-when-do-you-run-outside-angular) measures the cost.

## 4. The Hole in the Patch: Native async/await

📌 **Interview term: Native async/await** — <code>await</code> written as real syntax (not compiled into generators or promise chains) uses the engine's internal promise machinery, not the global <code>Promise</code> object. zone.js cannot patch syntax, so a zone is lost across a native <code>await</code>.

That is why Zone-based builds must downlevel <code>async</code> functions. Verified with two <code>ng build</code> runs of the same CLI 22.2.3 app containing <code>async loadMarker() { await Promise.resolve(); return "ASYNC_MARKER_42"; }</code>:

\`\`\`
zone.js in polyfills:
loadMarker(){return F(this,null,function*(){return yield Promise.resolve(),"ASYNC_MARKER_42"})}

zoneless (no zone.js):
async loadMarker(){return await Promise.resolve(),"ASYNC_MARKER_42"}
\`\`\`

With zone.js in the build, the CLI rewrote the method into a generator plus a helper (<code>F</code>) so that every <code>await</code> goes through the patched <code>Promise</code>. Without zone.js, the native <code>async</code> function shipped unchanged: shorter code, real async stack traces.

## 5. Building a Zoneless App

New apps from <code>ng new</code> on CLI 22 are already zoneless: no <code>zone.js</code> dependency and no zone provider. For an existing Zone-based app, the steps are:

**Step 1 — remove the opt-in provider.** Since v21 zoneless is the default, so the provider that keeps an app on Zone.js is <code>provideZoneChangeDetection()</code>. Delete it (on v20 you would instead add <code>provideZonelessChangeDetection()</code>, stable since 20.2):

\`\`\`ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    // provideZoneChangeDetection({ eventCoalescing: true }),  <- delete
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
\`\`\`

**Step 2 — remove the polyfill.** In <code>angular.json</code>, delete <code>"zone.js"</code> (and <code>"zone.js/testing"</code>) from the <code>polyfills</code> arrays of the build and test targets, then uninstall the package. If the app still imports <code>zone.js</code> anywhere (a <code>polyfills.ts</code>, a test setup file) remove that too.

**Step 3 — make every template update a notification.** In zoneless mode only these schedule a run (listed in the 22.2.3 typings for <code>provideZonelessChangeDetection</code>): <code>markForCheck()</code>, <code>ComponentRef.setInput</code>, a [signal](/interview-question/what-are-angular-signals) read in a template changing, bound template or host listeners firing, and attaching or removing views. So:

| Old pattern | Zoneless replacement |
| :--- | :--- |
| Plain field set in a timer, socket or library callback | Make it a signal, or call <code>markForCheck()</code> |
| [Observable](/interview-question/what-is-the-difference-between-observables-and-promises) <code>.subscribe(v => this.items = v)</code> | <code>toSignal(obs$)</code> (see [toSignal and toObservable](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs)) or the <code>async</code> pipe |
| Logic in <code>zone.onStable</code> / <code>onMicrotaskEmpty</code> | [afterNextRender / afterEveryRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks); the no-op zone never emits these |
| <code>zone.run()</code> / <code>runOutsideAngular()</code> wrappers | Delete; both just call the function in a zoneless app |
| [SSR](/interview-question/what-is-angular-universal-ssr) waiting for the zone to be stable | <code>PendingTasks</code> (<code>inject(PendingTasks).add()</code>, public since 20.0; see [inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)) |

**Step 4 — check change detection strategy.** Zoneless works with Eager components, but it pays off with OnPush and signals, which is the v22 default anyway; see [how change detection works](/interview-question/how-does-change-detection-work-in-angular).

**Step 5 — test zoneless.** Remove zone-dependent test helpers where possible (<code>fakeAsync</code> needs <code>zone.js/testing</code>, see [fakeAsync vs waitForAsync](/interview-question/what-is-the-difference-between-fakeasync-tick-and-waitforasync-in-angular-unit-t)) and prefer <code>await fixture.whenStable()</code>.

The size and performance payoff is measured in the sibling question on [zoneless Angular and performance](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

## 6. Common Pitfalls

- **Thinking zone.js knows what changed.** It only knows that *some* async work finished. That is why Zone-based Angular had to check broadly, and why signals are more precise.
- **Leaving <code>zone.js</code> in <code>polyfills</code> after removing the provider.** The app runs zoneless, but you still ship and execute the patch, and the CLI still downlevels <code>async/await</code> (verified above).
- **Keeping <code>onStable</code> subscriptions.** In a zoneless app the injected <code>NoopNgZone</code> never emits them, so the code silently stops running. Move it to <code>afterNextRender</code>.
- **Forgetting third-party code.** A library that updates a component field from its own callbacks relied on zone-triggered runs; wrap the value in a signal or call <code>markForCheck()</code>.
- **Monkey-patching assumptions in your own code.** Libraries that compared <code>setTimeout</code> against a saved reference or stringified it saw a wrapper under zone.js; after migration they see the real function.
- **Mixing zone tests and zoneless runtime.** Tests that pass only because <code>fakeAsync</code> flushed a zone are not proving zoneless behaviour.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Zone.js monkey-patches the browser async APIs so a zone can track every task, and Zone-based Angular used that to run change detection when its zone had no work left."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mechanism:</strong> <span style="color:#f0e2c8;">"Each patched call becomes a micro, macro or event task; the wrapper records it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Zone.current</code>, calls the original saved under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__zone_symbol__</code>, and restores the zone when the callback runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The limits:</strong> <span style="color:#f0e2c8;">"It knows that something finished, not what changed; native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async/await</code> escapes it, so builds must downlevel; and it adds bundle weight and noisy stack traces."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Going zoneless:</strong> <span style="color:#f0e2c8;">"Remove <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideZoneChangeDetection()</code>, drop zone.js from polyfills, make template state signals or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code>, and replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onStable</code> logic with render hooks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Current status:</strong> <span style="color:#f0e2c8;">"Experimental in v18, stable in v20.2, the default since v21, so a new v22 app has no zone.js at all."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can zone.js not patch <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> is syntax that uses the engine's internal promise jobs, not the global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise</code> the wrapper replaced. Verified: a Zone build turned an async method into a generator so its awaits go through the patched Promise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onHasTask</code> used for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It reports when a zone's counts of pending micro and macro tasks change. The "none left" transition is when NgZone declares itself stable and a Zone app runs change detection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Angular know to re-render without zone.js?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Through explicit notifications: a signal read in a template changing, template or host events, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput</code>, and views being attached or removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks first in a zoneless migration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain fields updated from callbacks (stale UI), code in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onStable</code> that no longer runs, and tests relying on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> zone flushing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can zone.js still be on the page in a zoneless app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes; another library may load it. Angular just ignores it. Verified: with zone.js loaded and no zone provider, the injected NgZone was the no-op one.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monkey-patching** | Replacing a built-in function at runtime with a wrapper |
| **Zone** | Execution context that follows code across async boundaries |
| **Task** | zone.js record of scheduled work: micro, macro or event |
| **__zone_symbol__** | Prefix under which zone.js keeps the original APIs |
| **ZoneAwarePromise** | zone.js replacement for the global Promise |
| **Native async/await** | Real await syntax, which zone.js cannot intercept |
| **PendingTasks** | Zoneless way to hold an app unstable (for SSR) |

---
**Conclusion:** Zone.js works by replacing the browser async APIs with lookalike wrappers that record every timer, promise and listener as a task in the current zone; the verified run shows the wrapper, the saved original and the hooks firing in order. Angular built its original change detection trigger on the moment a zone has no tasks left, which was convenient but imprecise and could not see through native <code>async/await</code>. Going zoneless means deleting the provider and the polyfill and letting signals, events and <code>markForCheck()</code> say exactly when the screen must change, which has been the default since v21.`,
    examples: [
      {
        label: "See the patch: forked zone hooks around setTimeout and Promise.then",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";

// zone.js puts a global Zone object on the page when it is loaded.
declare const Zone: any;

@Component({
  selector: "app-root",
  template: \`
    <button (click)="run()">fork a zone and schedule work</button>
    <ol>@for (line of log(); track $index) { <li>{{ line }}</li> }</ol>
  \`,
})
export class AppComponent {
  log = signal<string[]>([]);

  run() {
    const lines: string[] = [];
    if (typeof Zone === "undefined") {
      this.log.set(["zone.js is not loaded on this page: nothing is patched"]);
      return;
    }
    const g = globalThis as any;
    // 1. The patch: the global setTimeout is a wrapper, the browser original is kept aside.
    lines.push(\`setTimeout is the original: \${g.setTimeout === g.__zone_symbol__setTimeout}\`);
    lines.push(\`wrapper remembers original: \${g.setTimeout.__zone_symbol__OriginalDelegate === g.__zone_symbol__setTimeout}\`);
    lines.push(\`Promise is now: \${Promise.name}\`);

    // 2. A zone is an execution context with hooks around every async task.
    const demo = Zone.current.fork({
      name: "demo",
      onScheduleTask: (d: any, _c: any, t: any, task: any) => {
        lines.push(\`schedule \${task.type} (\${task.source})\`);
        return d.scheduleTask(t, task);
      },
      onInvokeTask: (d: any, _c: any, t: any, task: any, self: any, args: any) => {
        lines.push(\`invoke \${task.type} (\${task.source})\`);
        return d.invokeTask(t, task, self, args);
      },
      onHasTask: (d: any, _c: any, t: any, state: any) => {
        lines.push(\`hasTask macro=\${state.macroTask} micro=\${state.microTask}\`);
        return d.hasTask(t, state);
      },
    });

    demo.run(() => {
      setTimeout(() => lines.push(\`timer callback ran in zone "\${Zone.current.name}"\`));
      Promise.resolve().then(() => lines.push(\`then callback ran in zone "\${Zone.current.name}"\`));
    });

    // Read the log once both tasks are done (this timer is scheduled outside the demo zone).
    setTimeout(() => this.log.set([...lines, \`back outside, Zone.current is "\${Zone.current.name}"\`]), 20);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is zoneless Angular and how does it improve performance in Angular 18?",
    seoDescription:
      "Zoneless Angular: experimental in v18, stable in v20.2, default since v21. What schedules rendering without Zone.js, and measured bundle and run savings.",
    description: `**Question presented to candidate:**
"Angular 18 announced zoneless change detection. What does zoneless mean, what replaces Zone.js as the trigger for rendering, and where do the performance gains actually come from? Is the Angular 18 story still accurate today?"

**What a strong answer should cover:**
- **Zoneless** means Angular does not use Zone.js to decide when to run change detection; a **scheduler** runs only after explicit notifications: signal changes read by templates, template/host events, \`markForCheck()\` (and so \`AsyncPipe\`), \`setInput\`, views attached or removed.
- **Timeline:** experimental in **v18** (May 2024, \`provideExperimentalZonelessChangeDetection\`), developer preview in v20.0, **stable in v20.2** (\`provideZonelessChangeDetection\`), **default in v21**; in v22 Zone.js is opt-in with \`provideZoneChangeDetection()\`.
- **Gains:** no zone.js polyfill in the bundle, no change detection run per async task, native \`async/await\` (no downlevelling), cleaner stack traces; biggest gains when combined with OnPush and signals.
- **Costs:** code that mutated plain fields in callbacks goes stale; \`NgZone.onStable\` logic stops firing; SSR needs \`PendingTasks\` for work Angular cannot see.
- Can quote real numbers rather than "it is faster".

**Clarifying questions expected:**
- "Are we on an Angular version where zoneless is the default (v21+) or still opting in?"
- "Is state in signals already, or mostly plain fields and subscriptions?"

**Code / implementation expected:** Optional — a component showing which kinds of updates render without Zone.js.`,
    answer: `**Target Audience:** Developers who have read "zoneless" in release notes and want the real story and the real numbers — familiar with components, no Zone.js internals required.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The version timeline was checked against release coverage and the Angular 22.2.3 typings; bundle sizes come from two real <code>ng build</code> runs with Angular CLI 22.2.3; the run counts and DOM snapshots were produced by running the code on 22.2.3.

## 1. Why This Even Matters — A Story First

A newspaper office used to keep a junior reporter whose only job was to run to the editor every time *anything* happened in the building: a phone rang, a fax arrived, the kettle boiled. Each time, the editor stopped, scanned the whole front page, and usually found nothing to change. The system never missed a story, but the editor never got any work done, and the junior reporter cost a salary.

Then the office changed the rule: whoever actually has a new fact tells the editor directly, and says which column it belongs in. The junior reporter is let go, the editor only looks up when a fact arrives, and only re-reads the column that fact touches.

The junior reporter is **Zone.js**. The new rule is **zoneless Angular**: [signals](/interview-question/what-are-angular-signals), template events and <code>markForCheck()</code> tell Angular exactly when something changed. The title of this question says "Angular 18" because that is when the idea first shipped, as an experiment. A good interview answer also says what happened next.

## 2. The Core Idea

📌 **Interview term: Zoneless change detection** — Angular decides *when* to run [change detection](/interview-question/how-does-change-detection-work-in-angular) without Zone.js. Instead of reacting to every finished async task, a scheduler reacts to explicit notifications.

📌 **Interview term: Change detection scheduler** — the internal service that, after a notification, queues one run for the near future (many notifications in a row collapse into one run). The notifications, as listed in the 22.2.3 typings for <code>provideZonelessChangeDetection</code>:

- a signal that a template reads is updated;
- a bound template or host listener fires;
- <code>ChangeDetectorRef.markForCheck()</code> is called (the <code>async</code> pipe does this for you; see [ChangeDetectorRef](/interview-question/what-does-changedetectorref-do));
- <code>ComponentRef.setInput()</code> is called;
- a view that was marked dirty is attached, or a view is removed.

What is **not** on the list matters as much: a timer firing, a <code>fetch</code> resolving, or a WebSocket message arriving does nothing by itself.

## 3. From Experiment to Default

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="Zoneless timeline: experimental in v18, developer preview in v20.0, stable in v20.2, default in v21, and in v22 OnPush also becomes the default">
  <defs>
    <marker id="zl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="116" height="96" rx="10"/>
  <text class="d-text" x="78" y="68" text-anchor="middle">v18</text>
  <text class="d-sub" x="78" y="92" text-anchor="middle">May 2024</text>
  <text class="d-sub" x="78" y="114" text-anchor="middle">experimental</text>
  <path class="d-edge" d="M 140 88 L 158 88" marker-end="url(#zl-arrow)"/>
  <rect class="d-box-muted" x="162" y="40" width="116" height="96" rx="10"/>
  <text class="d-text" x="220" y="68" text-anchor="middle">v20.0</text>
  <text class="d-sub" x="220" y="92" text-anchor="middle">May 2025</text>
  <text class="d-sub" x="220" y="114" text-anchor="middle">dev preview</text>
  <path class="d-edge" d="M 282 88 L 300 88" marker-end="url(#zl-arrow)"/>
  <rect class="d-box" x="304" y="40" width="116" height="96" rx="10"/>
  <text class="d-text" x="362" y="68" text-anchor="middle">v20.2</text>
  <text class="d-sub" x="362" y="92" text-anchor="middle">Aug 2025</text>
  <text class="d-sub" x="362" y="114" text-anchor="middle">stable API</text>
  <path class="d-edge" d="M 424 88 L 442 88" marker-end="url(#zl-arrow)"/>
  <rect class="d-box-accent" x="446" y="40" width="116" height="96" rx="10"/>
  <text class="d-text d-accent" x="504" y="68" text-anchor="middle">v21</text>
  <text class="d-sub" x="504" y="92" text-anchor="middle">Nov 2025</text>
  <text class="d-sub" x="504" y="114" text-anchor="middle">default</text>
  <path class="d-edge" d="M 566 88 L 584 88" marker-end="url(#zl-arrow)"/>
  <rect class="d-box-accent" x="588" y="40" width="116" height="96" rx="10"/>
  <text class="d-text d-accent" x="646" y="68" text-anchor="middle">v22</text>
  <text class="d-sub" x="646" y="92" text-anchor="middle">Jun 2026</text>
  <text class="d-sub" x="646" y="114" text-anchor="middle">plus OnPush</text>
</svg>

| Version | What changed | API |
| :--- | :--- | :--- |
| **v18** (May 2024) | Zoneless shipped as **experimental** | <code>provideExperimentalZonelessChangeDetection()</code> |
| **v20.0** (May 2025) | Moved to **developer preview** | <code>provideZonelessChangeDetection()</code> |
| **v20.2** (Aug 2025) | **Stable** | Same; the 22.2.3 typings tag it <code>@publicApi 20.2</code> |
| **v21** (Nov 2025) | **Default** for every app; Zone.js becomes opt-in | Opt back in with <code>provideZoneChangeDetection()</code> |
| **v22** (Jun 2026) | OnPush becomes the default strategy too | <code>ChangeDetectionStrategy.Eager</code> to opt out |

Sources: <a href="https://blog.ninja-squad.com/2025/08/20/what-is-new-angular-20.2" target="_blank" rel="noopener noreferrer">Ninja Squad, What is new in Angular 20.2</a>; <a href="https://blog.ninja-squad.com/2025/11/20/what-is-new-angular-21.0" target="_blank" rel="noopener noreferrer">Ninja Squad, What is new in Angular 21.0</a>; <a href="https://www.infoq.com/news/2024/07/angular-18-introduces-zoneless" target="_blank" rel="noopener noreferrer">InfoQ on Angular 18</a>. In the installed 22.2.3 package the experimental v18 function no longer exists, and the <code>provideZonelessChangeDetection</code> doc comment reads "NOTE: Zoneless is enabled by default in Angular v21+".

So the honest answer to "how does it improve performance in Angular 18" is: in 18 it was an opt-in experiment you would not ship to production; the improvements are real today because the API stabilised in 20.2 and became the default in 21.

## 4. Where the Performance Comes From (Measured)

**1. Less JavaScript.** The CLI 22.2.3 starter app, built twice with <code>ng build</code>:

| Build | Initial raw size | Estimated transfer |
| :--- | :--- | :--- |
| Zoneless (the default) | 216.87 kB | 59.58 kB |
| <code>zone.js</code> in polyfills + <code>provideZoneChangeDetection()</code> | 255.72 kB (main 219.85 + polyfills 35.88) | 71.77 kB |
| Difference | +38.85 kB (+18%) | +12.19 kB (+20%) |

**2. Fewer change detection runs.** In a Zone app every finished task in the Angular zone is a potential run. Verified by counting <code>ApplicationRef</code> ticks while 100 <code>setTimeout</code> callbacks fired:

\`\`\`
zoneless (default):                 100 timers -> ticks=0
provideZoneChangeDetection(), zone: 100 timers -> ticks=101
\`\`\`

The zoneless app did zero runs because nothing it rendered had changed; the Zone app did a run per timer plus one, even though the timers did nothing.

**3. Native async/await.** With zone.js in the build the CLI rewrites <code>async</code> functions into generators so the patched <code>Promise</code> sees every <code>await</code>; zoneless builds ship them natively (both outputs are quoted in the [Zone.js deep dive](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon)).

**4. Targeted refresh, when combined with signals.** Zoneless decides *when*; OnPush and signals decide *what*. In the [change detection doc](/interview-question/how-does-change-detection-work-in-angular) a signal change re-ran exactly one template out of four.

Not measured here: real-browser frame times and the often-cited "cleaner stack traces". The stack-trace claim follows from zone.js frames no longer wrapping every callback, but it was not benchmarked for this doc.

## 5. Verified: what renders without Zone.js

The example at the bottom runs with no providers, as the default v22 app does. It shows a signal set in a timer, an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises) through the <code>async</code> pipe, and a plain field set in a timer. Compiled with <code>ngc</code> and run in jsdom, snapshotted after 200 ms and after a button click:

\`\`\`
after 200 ms   | NgZone in this app: no-op NgZone (zoneless) | signal set in setTimeout: updated | observable via async pipe: emission 3 of 3 | plain field set in setTimeout: waiting
after click    | NgZone in this app: no-op NgZone (zoneless) | signal set in setTimeout: updated | observable via async pipe: emission 3 of 3 | plain field set in setTimeout: updated
\`\`\`

The signal and the async pipe rendered on their own because both notify the scheduler. The plain field stayed at "waiting" until the click, whose template listener (and the <code>markForCheck()</code> it calls) counts as a notification. That stale line is the entire migration risk in one picture.

## 6. Zone-based vs Zoneless

| | Zone-based (opt-in since v21) | Zoneless (default) |
| :--- | :--- | :--- |
| What starts a run | Any async task finishing in the Angular zone | Explicit notifications only |
| Bundle | Includes zone.js polyfill (+38.85 kB raw measured) | No polyfill |
| <code>async/await</code> | Downlevelled to generators | Native |
| Plain field set in a callback | Picked up for Eager components on the next zone turn | Not picked up until a notification |
| [NgZone](/interview-question/what-is-ngzone-and-when-do-you-run-outside-angular) injected | Real <code>NgZone</code> | No-op <code>NgZone</code>; <code>onStable</code> never fires |
| [SSR](/interview-question/what-is-angular-universal-ssr) "app is stable" | Zone has no pending tasks | No pending <code>PendingTasks</code> and no pending render |
| Best paired with | Anything | OnPush + signals (both v22 defaults) |

📌 **Interview term: PendingTasks** — <code>inject(PendingTasks).add()</code> (see [inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)) returns a cleanup function; while any task is open the app is not stable, so SSR waits before serialising. <code>HttpClient</code> registers its own requests; you only need it for async work Angular cannot see. For DOM work that used to wait for <code>onStable</code>, the browser-side replacement is the render hooks covered in [afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks).

## 7. Common Pitfalls

- **Quoting v18 as current.** The v18 API was experimental and has been removed; today's API is <code>provideZonelessChangeDetection()</code> (stable 20.2) and it is the default since v21.
- **Plain fields in callbacks.** The verified stale line above. Use signals, [toSignal](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs), the async pipe or <code>markForCheck()</code>.
- **Relying on <code>NgZone.onStable</code>.** The no-op zone never emits it; switch to <code>afterNextRender</code>.
- **Keeping zone.js "just in case".** You keep paying the measured bundle cost and the async downlevelling, and Angular ignores it anyway.
- **Expecting zoneless alone to fix slow templates.** It reduces how often checks happen; expensive bindings still cost the same per check. Use [computed signals](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).
- **Third-party components without signals.** They may update fields from their own callbacks and go stale; test them explicitly after migrating.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Zoneless Angular schedules change detection from explicit notifications, like signal changes, template events and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code>, instead of from Zone.js watching every async task."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. History:</strong> <span style="color:#f0e2c8;">"It was experimental in v18, developer preview in 20.0, stable in 20.2 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideZonelessChangeDetection()</code>, and the default since v21."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where the speed comes from:</strong> <span style="color:#f0e2c8;">"No zone.js polyfill, no run per async task, native async/await, and with OnPush plus signals only the views that changed are refreshed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real numbers:</strong> <span style="color:#f0e2c8;">"On a CLI 22 starter app, adding zone.js cost 38.85 kB raw and 12 kB transferred, and 100 idle timers caused 101 ticks with Zone.js versus zero without."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The catch:</strong> <span style="color:#f0e2c8;">"Plain fields mutated in callbacks stop rendering; state the template reads should be a signal or go through the async pipe."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly notifies Angular in a zoneless app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A signal read in a template changing, bound template or host listeners, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> (used by the async pipe), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentRef.setInput()</code>, and attaching or removing views. Timers and fetches do not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you opt back into Zone.js in v21+?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideZoneChangeDetection()</code> to the app providers and load <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zone.js</code> as a polyfill. Verified: with that provider the injected NgZone is the real one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is zoneless faster at rendering each view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not per check: a refresh costs the same. The win is doing fewer checks and shipping less code. Per-view cost is reduced by OnPush and signals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about SSR without Zone.js?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular tracks its own work (HttpClient, render scheduling); for other async work wrap it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PendingTasks</code> so the server waits before serialising.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does zoneless work with Eager components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but an Eager view is still only checked when a run happens and the walk reaches it; without a notification there is no run. OnPush plus signals is the intended pairing.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Zoneless** | Change detection scheduled without Zone.js |
| **Scheduler** | Queues one run after a notification |
| **Notification** | Signal change, template event, markForCheck, setInput, view attach |
| **provideZonelessChangeDetection** | Opt-in API in v20; stable 20.2; default behaviour since v21 |
| **provideZoneChangeDetection** | Opt back into Zone.js in v21+ |
| **PendingTasks** | Keeps the app unstable until async work Angular cannot see is done |
| **NoopNgZone** | Do-nothing NgZone injected in zoneless apps |

---
**Conclusion:** Zoneless Angular replaces "re-check after any async task" with "re-check when something says it changed". It arrived as an experiment in Angular 18, became a stable API in 20.2 and the default in 21, and in 22 it pairs with OnPush by default. The gains are concrete: on the CLI 22 starter, dropping zone.js saved 38.85 kB raw (12.19 kB transferred), 100 idle timers went from 101 ticks to none, and async functions ship natively. The price is that state the template reads must notify Angular, which signals do for free.`,
    examples: [
      {
        label: "Zoneless-ready state: signal, async pipe, and a plain field that needs markForCheck",
        tech: "angular",
        runnable: true,
        code: `import { AsyncPipe } from "@angular/common";
import { ChangeDetectorRef, Component, NgZone, inject, signal } from "@angular/core";
import { map, take, timer } from "rxjs";

@Component({
  selector: "app-root",
  imports: [AsyncPipe],
  template: \`
    <p id="zone">NgZone in this app: {{ zoneKind }}</p>
    <p id="sig">signal set in setTimeout: {{ fromSignal() }}</p>
    <p id="pipe">observable via async pipe: {{ ticks$ | async }}</p>
    <p id="plain">plain field set in setTimeout: {{ plain }}</p>
    <button (click)="refresh()">markForCheck()</button>
  \`,
})
export class AppComponent {
  private cdr = inject(ChangeDetectorRef);
  // Zoneless is the default since v21: Angular injects a no-op NgZone.
  zoneKind = NgZone.isInAngularZone() ? "real NgZone (zone-based)" : "no-op NgZone (zoneless)";

  fromSignal = signal("waiting");
  plain = "waiting";
  // AsyncPipe calls markForCheck() on every emission, so it works without zone.js.
  ticks$ = timer(0, 10).pipe(take(3), map(n => \`emission \${n + 1} of 3\`));

  constructor() {
    // Spaced out so each write is observed on its own.
    setTimeout(() => this.fromSignal.set("updated"), 50); // notifies the scheduler: re-rendered
    setTimeout(() => (this.plain = "updated"), 100);      // notifies nobody: the DOM keeps "waiting"
  }

  // Any notification (markForCheck, a template event, a signal) lets the plain field catch up.
  refresh() { this.cdr.markForCheck(); }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of the KeyValueDiffers and IterableDiffers services?",
    seoDescription:
      "KeyValueDiffers and IterableDiffers detect in-place changes to arrays, objects and Maps in ngDoCheck: added, removed and moved records, trackBy and limits.",
    description: `**Question presented to candidate:**
"A parent pushes items into an array and edits keys on a settings object, both passed as inputs to an OnPush child, and the child never notices. What are \`IterableDiffers\` and \`KeyValueDiffers\`, how would you use them here, and would you still design it this way in Angular 22?"

**What a strong answer should cover:**
- Inputs are compared **by reference**, so in-place mutation does not fire \`ngOnChanges\` or mark an OnPush child; differs compare **contents** instead.
- \`IterableDiffers\` (arrays, Sets, any iterable) and \`KeyValueDiffers\` (objects, Maps) are injectable **factory registries**: \`find(value).create(trackBy?)\` gives a stateful differ.
- \`differ.diff(current)\` returns **null when nothing changed**, otherwise a change record with \`forEachAddedItem\`, \`forEachRemovedItem\`, \`forEachMovedItem\`, \`forEachIdentityChange\` (iterable) or \`forEachChangedItem\` (key-value).
- Typical home: **\`ngDoCheck\`**, followed by \`markForCheck()\` or a signal write so an OnPush view refreshes; a **trackBy** function defines item identity.
- Used internally by \`NgForOf\`, \`NgStyle\` and \`KeyValuePipe\`; the built-in \`@for\` uses its own reconciliation with \`track\`.
- Modern alternative: **immutable updates or signals** make most manual diffing unnecessary; differs run on every check, so cost matters.

**Clarifying questions expected:**
- "Can we change the parent to pass new references instead of mutating?"
- "Is the child OnPush, and is the parent checked when it mutates?"

**Code / implementation expected:** Yes — a child that reports what changed in a mutated array and object using both differs.`,
    answer: `**Target Audience:** Developers who know inputs and lifecycle hooks and have hit "my child component did not notice the change" — no knowledge of Angular internals needed.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. Every change report and error message below was produced by compiling and running the code on Angular 22.2.3; which built-ins use differs was read from the 22.2.3 <code>@angular/common</code> bundle.

## 1. Why This Even Matters — A Story First

A librarian keeps a shelf of books. Every morning a manager asks: "did anything change on the shelf?" The lazy check is to look at the shelf itself: same shelf as yesterday, so "nothing changed". But overnight somebody added two books and swapped the order of three others, all on the same shelf.

To answer properly, the librarian keeps yesterday's list in a notebook and compares it, book by book, with today's shelf: these were added, this one was removed, these two moved. That notebook-and-compare routine is a **differ**.

Angular normally does the lazy check. An input is "changed" only if it is a *different* shelf (a new object reference). If a parent mutates an array or object in place, the reference is the same and Angular's input check says "nothing changed". <code>IterableDiffers</code> and <code>KeyValueDiffers</code> hand you the notebook.

## 2. The Core Idea

📌 **Interview term: Reference equality** — Angular compares input values with <code>Object.is</code>. Pushing into an array or setting a key on an object keeps the same reference, so [ngOnChanges](/interview-question/what-is-the-purpose-of-ngonchanges-and-how-does-it-capture-changes-in-input-prop) does not fire and an OnPush child is not marked dirty by the input.

📌 **Interview term: Differ** — a stateful object that remembers the previous contents of a collection and, when called with the current one, returns a structured description of what changed, or <code>null</code> if nothing did.

📌 **Interview term: IterableDiffers / KeyValueDiffers** — injectable registries of differ **factories**. You do not diff with the service itself; you ask it for a factory that supports your value, then create a differ:

\`\`\`ts
private tasksDiffer = inject(IterableDiffers).find([]).create<Task>((_i, t) => t.id);
private settingsDiffer = inject(KeyValueDiffers).find({}).create<string, string>();
\`\`\`

| | <code>IterableDiffers</code> | <code>KeyValueDiffers</code> |
| :--- | :--- | :--- |
| Supports | Arrays, Sets, any iterable | Plain objects, Maps |
| Optional argument to <code>create</code> | A <code>trackBy</code> function defining item identity | None |
| Record callbacks | <code>forEachAddedItem</code>, <code>forEachRemovedItem</code>, <code>forEachMovedItem</code>, <code>forEachIdentityChange</code>, <code>forEachOperation</code> | <code>forEachAddedItem</code>, <code>forEachRemovedItem</code>, <code>forEachChangedItem</code> |
| Record fields | <code>item</code>, <code>previousIndex</code>, <code>currentIndex</code>, <code>trackById</code> | <code>key</code>, <code>previousValue</code>, <code>currentValue</code> |
| Used by (22.2.3 <code>@angular/common</code>) | <code>NgForOf</code> | <code>NgStyle</code>, <code>KeyValuePipe</code> |

Asking for an unsupported value throws. Verified:

\`\`\`
find(42): NG0901: Cannot find a differ supporting object '42' of type 'number'
kv find(42): NG0901: Cannot find a differ supporting object '42'
\`\`\`

📌 **Interview term: ngDoCheck** — the lifecycle hook that runs every time the parent's view is checked, even when this component's inputs did not change by reference. It is the natural place to call <code>differ.diff()</code>; see [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks).

## 3. The Diffing Loop

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="On each parent check ngDoCheck calls differ diff with the current collection, a null result means nothing to do, a change record is walked with forEach callbacks and then the view is marked for check">
  <defs>
    <marker id="dif-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="150" height="64" rx="10"/>
  <text class="d-text" x="95" y="106" text-anchor="middle">parent checked</text>
  <text class="d-sub" x="95" y="128" text-anchor="middle">ngDoCheck runs</text>
  <path class="d-edge" d="M 174 112 L 216 112" marker-end="url(#dif-arrow)"/>
  <rect class="d-box-accent" x="220" y="80" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="300" y="106" text-anchor="middle">differ.diff(list)</text>
  <text class="d-sub" x="300" y="128" text-anchor="middle">compare with memory</text>
  <path class="d-edge-dashed" d="M 384 96 L 456 46" marker-end="url(#dif-arrow)"/>
  <rect class="d-box-muted" x="460" y="20" width="240" height="50" rx="10"/>
  <text class="d-sub" x="580" y="50" text-anchor="middle">null: nothing changed, stop</text>
  <path class="d-edge" d="M 384 128 L 456 176" marker-end="url(#dif-arrow)"/>
  <rect class="d-box" x="460" y="150" width="240" height="64" rx="10"/>
  <text class="d-text" x="580" y="176" text-anchor="middle">change record</text>
  <text class="d-sub" x="580" y="198" text-anchor="middle">forEach..., then markForCheck</text>
</svg>

Every time the parent's view is checked, <code>ngDoCheck</code> hands the current collection to the differ. The differ compares it with the copy it kept from last time: the dashed branch returns <code>null</code> (the cheap, common case), the solid branch returns a record you walk with the <code>forEach</code> callbacks. Because the child is OnPush, finish by writing a signal or calling <code>markForCheck()</code> so its view actually refreshes.

## 4. Verified: a child that sees in-place mutations

In the example at the bottom the parent **mutates** <code>tasks</code> (push, reverse, replace one element) and <code>settings</code> (change a key, delete a key); it never creates a new array or object. The OnPush child diffs both in <code>ngDoCheck</code> and prints what changed. Compiled with <code>ngc</code> and run in jsdom (each line: the child's summary, then its report):

\`\`\`
initial    | 2 tasks, theme light | added "write" at 0; added "test" at 1; key added theme=light; key added lang=en
add        | 3 tasks, theme light | added "task 3" at 2
reorder    | 3 tasks, theme light | moved "task 3" 2 -> 0; moved "write" 0 -> 2
rename     | 3 tasks, theme light | same id 1, new object "write v2"
theme      | 3 tasks, theme dark | key changed theme: light -> dark; key removed lang
\`\`\`

Things worth noticing:

- **The first <code>diff()</code> reports everything as added**, because the differ starts with an empty memory.
- **Reversing three items reported two moves**: the middle item kept index 1, so the differ correctly did not list it.
- **"rename" replaced an object with a new one that has the same <code>id</code>.** With the <code>trackBy</code> function the differ called it an *identity change* of the same item. The same run without <code>trackBy</code> reported <code>added "write v2" at 2; removed "write" from 2</code>: the item was treated as brand new.
- **The hooks:** with logging added, <code>ngOnChanges</code> fired once (the initial binding) and never again, while <code>ngDoCheck</code> fired after every click. That is exactly the gap differs fill.

## 5. Do You Still Need Differs in Angular 22?

Usually not. Differs are a tool for code that **mutates** shared objects. Modern Angular nudges you away from that:

| Approach | How the child learns about the change | Cost |
| :--- | :--- | :--- |
| Mutate in place + differ in <code>ngDoCheck</code> | Content comparison on **every** parent check | O(n) per check, even when nothing changed |
| Immutable update (<code>tasks = [...tasks, t]</code>) | New reference: input changes, child is marked | Allocation per change, nothing per check |
| [Signal](/interview-question/what-are-angular-signals) of an array, updated with <code>update(l => [...l, t])</code> | The signal notifies its readers | Same as immutable, plus targeted refresh |
| <code>@for</code> with <code>track</code> | Its own reconciliation (not <code>IterableDiffers</code>) handles DOM moves | Built into the template |

📌 **Interview term: trackBy / track** — a function or expression that gives each item a stable identity, so a list update becomes "moved" or "identity changed" instead of "removed and re-added". It is the same idea in a differ, in [ngFor's trackBy](/interview-question/what-is-trackby-in-ngfor-and-why-use-it) and in [@for's track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).

Where differs still earn their place: wrapping a third-party library that mutates its data, writing a structural directive or a <code>NgStyle</code>-like directive that must apply minimal DOM operations, or bridging legacy code you cannot change. You can also register your own differ for an immutable collection type with <code>IterableDiffers.extend([...])</code> in a component's <code>viewProviders</code>.

## 6. Common Pitfalls

- **Creating the differ inside <code>ngDoCheck</code>.** A new differ has no memory, so every call reports everything as added. Create it once, in a field initialiser or the constructor.
- **Forgetting the refresh.** The differ only *tells* you; an OnPush view still needs a signal write or <code>markForCheck()</code>.
- **Expecting <code>ngDoCheck</code> to run when the parent is not checked.** It runs when the parent's view is checked. In the example the parent's click handler marks it; a mutation from a timer in a [zoneless app](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) would not reach the child at all.
- **Using differs where a new reference would do.** Diffing large collections on every check is real work; immutable updates are cheaper and clearer.
- **Holding on to the change record.** The record is only valid until the next <code>diff()</code> call (stated in the 22.2.3 typings).
- **Assuming deep comparison.** Differs compare items or values by identity (or your <code>trackBy</code>); a mutated property inside an unchanged item is invisible.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IterableDiffers</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyValueDiffers</code> give you stateful differs that compare a collection with its previous contents, so you can detect in-place mutations that reference checks miss."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why they exist:</strong> <span style="color:#f0e2c8;">"Inputs are compared by reference, so pushing into an array or editing an object fires no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> and does not mark an OnPush child."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to use them:</strong> <span style="color:#f0e2c8;">"Create the differ once with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(value).create(trackBy)</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diff()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngDoCheck</code>, walk the record if it is not null, then write a signal or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">"On 22.2.3 a reverse of three items reported exactly two moves, and with a trackBy an object replaced under the same id was reported as an identity change, not remove plus add."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern stance:</strong> <span style="color:#f0e2c8;">"Prefer immutable updates or signals; differs are for wrapping mutating legacy or third-party code and for low-level directives."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">diff()</code> return when nothing changed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>. That is the fast path you check first. The first call ever reports every item as added because the differ starts with no memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which built-ins use differs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the 22.2.3 common package: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgForOf</code> uses IterableDiffers, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgStyle</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyValuePipe</code> use KeyValueDiffers. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> block uses its own reconciliation with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why put the diff in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngDoCheck</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngOnChanges</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code> only fires when an input reference changes, which is exactly what in-place mutation avoids. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngDoCheck</code> runs on every check of the parent. Verified: ngOnChanges fired once, ngDoCheck after every mutation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the trackBy function change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Item identity. Without it, a replaced object is removed plus added; with it, the differ reports an identity change of the same item and can report moves of logically identical items.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with an unsupported value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find()</code> throws NG0901, for example "Cannot find a differ supporting object 42 of type number".</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reference equality** | Same object, regardless of contents |
| **Differ** | Stateful comparer that reports what changed since last call |
| **IterableDiffers** | Registry of differ factories for arrays, Sets, iterables |
| **KeyValueDiffers** | Registry of differ factories for objects and Maps |
| **Change record** | Result of <code>diff()</code> with forEach callbacks |
| **trackBy** | Function giving each item a stable identity |
| **ngDoCheck** | Hook run on every check of the parent |

---
**Conclusion:** <code>IterableDiffers</code> and <code>KeyValueDiffers</code> exist because Angular compares inputs by reference, and in-place mutation slips past that check. A differ remembers a collection's previous contents and, called from <code>ngDoCheck</code>, returns <code>null</code> or a precise record of additions, removals, moves and changes; the verified run shows each case, including how <code>trackBy</code> turns a remove-plus-add into an identity change. In Angular 22, with OnPush and signals as defaults, the better design is usually to stop mutating, and keep differs for wrapping code you do not control.`,
    examples: [
      {
        label: "Detecting in-place mutations of an array and an object input with differs in ngDoCheck",
        tech: "angular",
        runnable: true,
        code: `import {
  ChangeDetectorRef, Component, DoCheck, Input, IterableDiffer, IterableDiffers,
  KeyValueDiffer, KeyValueDiffers, inject, signal,
} from "@angular/core";

type Task = { id: number; title: string };

@Component({
  selector: "change-report",
  template: \`
    <p>{{ tasks.length }} tasks, theme {{ settings["theme"] }}</p>
    <ul>@for (line of report(); track $index) { <li>{{ line }}</li> }</ul>
  \`,
})
export class ChangeReport implements DoCheck {
  // Plain @Input objects that the parent MUTATES in place: the reference never changes,
  // so ngOnChanges never fires. A differ compares contents instead.
  @Input() tasks: Task[] = [];
  @Input() settings: Record<string, string> = {};

  private cdr = inject(ChangeDetectorRef);
  private tasksDiffer: IterableDiffer<Task> =
    inject(IterableDiffers).find([]).create<Task>((_i, t) => t.id); // trackBy: identity is the id
  private settingsDiffer: KeyValueDiffer<string, string> = inject(KeyValueDiffers).find({}).create();

  report = signal<string[]>([]);

  ngDoCheck() {
    const lines: string[] = [];
    const t = this.tasksDiffer.diff(this.tasks);
    t?.forEachAddedItem(r => lines.push(\`added "\${r.item.title}" at \${r.currentIndex}\`));
    t?.forEachRemovedItem(r => lines.push(\`removed "\${r.item.title}" from \${r.previousIndex}\`));
    t?.forEachMovedItem(r => lines.push(\`moved "\${r.item.title}" \${r.previousIndex} -> \${r.currentIndex}\`));
    t?.forEachIdentityChange(r => lines.push(\`same id \${r.trackById}, new object "\${r.item.title}"\`));

    const s = this.settingsDiffer.diff(this.settings);
    s?.forEachAddedItem(r => lines.push(\`key added \${r.key}=\${r.currentValue}\`));
    s?.forEachChangedItem(r => lines.push(\`key changed \${r.key}: \${r.previousValue} -> \${r.currentValue}\`));
    s?.forEachRemovedItem(r => lines.push(\`key removed \${r.key}\`));

    if (lines.length) {
      this.report.set(lines);   // a signal, so this OnPush view refreshes
      this.cdr.markForCheck();  // the plain-field bindings above need this too
    }
  }
}

@Component({
  selector: "app-root",
  imports: [ChangeReport],
  template: \`
    <button id="add" (click)="add()">push a task</button>
    <button id="reorder" (click)="reorder()">reverse</button>
    <button id="rename" (click)="rename()">replace task 1 object</button>
    <button id="theme" (click)="theme()">toggle theme, drop lang</button>
    <change-report [tasks]="tasks" [settings]="settings" />
  \`,
})
export class AppComponent {
  tasks: Task[] = [{ id: 1, title: "write" }, { id: 2, title: "test" }];
  settings: Record<string, string> = { theme: "light", lang: "en" };
  private next = 3;

  add() { this.tasks.push({ id: this.next, title: \`task \${this.next++}\` }); }
  reorder() { this.tasks.reverse(); }
  rename() { const i = this.tasks.findIndex(t => t.id === 1); this.tasks[i] = { id: 1, title: "write v2" }; }
  theme() { this.settings["theme"] = this.settings["theme"] === "light" ? "dark" : "light"; delete this.settings["lang"]; }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is ViewEncapsulation in Angular?",
    seoDescription:
      "ViewEncapsulation decides whether a component's CSS stays scoped: Emulated (default), ShadowDom, None. Verified leak demo and when to pick each.",
    description: `**Question presented to candidate:**
"Two teams both style a \`.label\` class in their own components, and one team's styles keep showing up in the other team's screens. Explain what \`ViewEncapsulation\` is, what the options are, and which component is the likely culprit."

**What a strong answer should cover:**
- \`ViewEncapsulation\` controls whether a component's \`styles\` apply **only to its own template** or to the whole page; it is set per component in \`@Component({ encapsulation })\`.
- **Emulated** (default): Angular rewrites selectors with generated attributes so they only match elements in that component's template.
- **ShadowDom**: uses the browser's real Shadow DOM, styles live inside the component's shadow root; **None**: styles are added to the document as written and are **global**.
- The likely culprit is a component with \`ViewEncapsulation.None\` (or \`::ng-deep\`); its rules apply everywhere, including inside other Emulated components.
- Encapsulation stops styles leaking **out**; it does not stop global styles leaking **in** (except Shadow DOM, partly).
- Mention \`ExperimentalIsolatedShadowDom\` (experimental since v21) and that styles must be statically analysable for AOT.

**Clarifying questions expected:**
- "Are any components using \`encapsulation: ViewEncapsulation.None\` or \`::ng-deep\`?"
- "Do the leaking rules come from component styles or from global stylesheets?"

**Code / implementation expected:** Optional — two components with the same class name, one Emulated and one None, showing the leak.`,
    answer: `**Target Audience:** Anyone who has written CSS for an Angular component — basic CSS selectors assumed, no Shadow DOM knowledge needed.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The enum values were read from the Angular 22.2.3 typings, and every computed style, attribute and stylesheet quoted below was produced by compiling and running the example on 22.2.3 in jsdom.

## 1. Why This Even Matters — A Story First

Imagine an open-plan office where every team pins its rules on one shared wall. The design team pins "all labels are green". The finance team pins "all labels are bold". Now every label in the building is green *and* bold, and nobody remembers who decided what.

Sensible offices give each team its own noticeboard: rules pinned there apply only to that team's desks. One team can still choose to pin something on the shared wall on purpose, but it is a decision, not an accident.

Plain CSS on a web page is the shared wall: every rule can match every element. **ViewEncapsulation** is Angular's noticeboard system. By default each component's CSS applies only to that component's own template, so two teams can both write <code>.label { ... }</code> without colliding.

## 2. The Core Idea

📌 **Interview term: View encapsulation** — the rule that decides whether a component's <code>styles</code> (or <code>styleUrl</code>) affect only the elements in its own template, or the whole document. It is set per component:

\`\`\`ts
@Component({
  selector: "global-badge",
  encapsulation: ViewEncapsulation.None,
  styles: \`.label { font-weight: 700; }\`,
  template: \`<span class="label">global badge</span>\`,
})
\`\`\`

The four values in Angular 22.2.3 (<code>enum ViewEncapsulation</code>):

| Value | Number | How the scoping works | Typings note |
| :--- | :--- | :--- | :--- |
| <code>Emulated</code> | 0 | Angular rewrites every selector to require a generated attribute that only this component's elements carry | "This is the default option." |
| <code>None</code> | 2 | No scoping: the CSS goes into the document unchanged, global | |
| <code>ShadowDom</code> | 3 | The browser's native Shadow DOM: the component gets a shadow root and its styles live inside it | |
| <code>ExperimentalIsolatedShadowDom</code> | 4 | Shadow DOM that also keeps the app's other styles out of the root | <code>@experimental 21.0</code> |

📌 **Interview term: Emulated encapsulation** — scoping done by Angular, not the browser: elements in the component's template get an attribute such as <code>_ngcontent-ng-c1990138692</code>, and every selector in its CSS is rewritten to require it. The full compile output is in [the compile-output deep dive](/interview-question/explain-the-difference-between-shadow-dom-emulated-and-none-view-encapsulation-w).

📌 **Interview term: Shadow DOM** — a browser feature that attaches a separate, hidden DOM tree (the **shadow root**) to an element. CSS inside it does not match outside, and most page CSS does not match inside.

## 3. Who Can Style Whom

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="An Emulated rule reaches only the elements of its own component, a None rule reaches every matching element on the page including those inside Emulated components">
  <defs>
    <marker id="enc7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="230" height="64" rx="10"/>
  <text class="d-text d-accent" x="145" y="66" text-anchor="middle">scoped-badge CSS</text>
  <text class="d-sub" x="145" y="88" text-anchor="middle">Emulated: color green</text>
  <rect class="d-box-muted" x="30" y="176" width="230" height="64" rx="10"/>
  <text class="d-text" x="145" y="202" text-anchor="middle">global-badge CSS</text>
  <text class="d-sub" x="145" y="224" text-anchor="middle">None: font-weight 700</text>
  <rect class="d-box" x="450" y="30" width="240" height="56" rx="10"/>
  <text class="d-sub" x="570" y="63" text-anchor="middle">scoped badge: green, bold</text>
  <rect class="d-box" x="450" y="112" width="240" height="56" rx="10"/>
  <text class="d-sub" x="570" y="145" text-anchor="middle">global badge: bold</text>
  <rect class="d-box" x="450" y="194" width="240" height="56" rx="10"/>
  <text class="d-sub" x="570" y="227" text-anchor="middle">plain span: bold</text>
  <path class="d-edge-accent" d="M 264 66 L 444 58" marker-end="url(#enc7-arrow)"/>
  <path class="d-edge-dashed" d="M 264 196 L 444 66" marker-end="url(#enc7-arrow)"/>
  <path class="d-edge-dashed" d="M 264 206 L 444 140" marker-end="url(#enc7-arrow)"/>
  <path class="d-edge-dashed" d="M 264 216 L 444 222" marker-end="url(#enc7-arrow)"/>
</svg>

The solid arrow is the Emulated rule: it reaches one element, the span in its own template. The dashed arrows are the None rule: it reaches every <code>.label</code> on the page, including the one *inside* the Emulated component. Encapsulation keeps a component's styles from leaking **out**; it does not stop global styles from leaking **in**.

## 4. Verified: the same class name, two encapsulations

The example at the bottom has three spans with <code>class="label"</code>: one in an Emulated component that makes labels green, one in a None component that makes labels bold, and one directly in the root. After rendering it reads each span's computed style and attributes. Compiled with <code>ngc</code> and run in jsdom:

\`\`\`
scoped badge: color=rgb(0, 128, 0) weight=700 attrs=[_ngcontent-ng-c1990138692 class]
global badge: color=rgb(0, 0, 0) weight=700 attrs=[class]
plain span in app-root: color=rgb(0, 0, 0) weight=700 attrs=[class]
<style> 0: .label[_ngcontent-ng-c1990138692] { color: rgb(0, 128, 0); }
<style> 1: .label { font-weight: 700; }
hosts: <scoped-badge _nghost-ng-c1990138692=""> <global-badge>
\`\`\`

- **Green reached only the scoped badge**, because its rule became <code>.label[_ngcontent-ng-c1990138692]</code> and only that span carries the attribute.
- **Bold reached all three**, because the None rule was inserted into <code>&lt;head&gt;</code> exactly as written.
- **The scoped badge is bold too.** Its own CSS never mentioned weight; the None rule leaked in. This is the answer to the interview scenario: look for the None component.
- The root component has no styles, so its span carries no attribute at all; Angular only stamps attributes when there is CSS to scope.

The colours come from jsdom's cascade, which handles these plain attribute selectors; actual painting was not checked in a real browser.

## 5. Choosing an Encapsulation

| Use | When | Watch out for |
| :--- | :--- | :--- |
| **Emulated** (default) | Almost always | Global styles still apply inside; cannot style a child component's internals without [::ng-deep](/interview-question/what-is-the-difference-between-component-styling-using-host-host-context-and-ng-) |
| **None** | Deliberate global styles: a theme component, styles for content injected with <code>innerHTML</code>, third-party widgets that render outside the template | Every rule is global; name selectors carefully or wrap them in the component's tag |
| **ShadowDom** | Real isolation, design-system components, components published as [custom elements](/interview-question/what-is-the-customelements-schema-in-angular-and-when-do-you-need-to-use-it) | Global stylesheets and fonts behave differently; Angular copies other component styles into the root (see the deep dive) |
| **ExperimentalIsolatedShadowDom** | Shadow DOM without any app styles copied in | Experimental since 21.0; API may change |

Global styles in <code>styles.css</code> (the <code>styles</code> entry in <code>angular.json</code>) are always global and are not affected by any component's encapsulation.

## 6. Common Pitfalls

- **Reaching for <code>None</code> to style a child.** It makes the whole stylesheet global. Prefer CSS custom properties or inputs on the child, or a narrowly scoped <code>:host ::ng-deep</code> rule (see [the :host and ::ng-deep doc](/interview-question/what-is-the-difference-between-component-styling-using-host-host-context-and-ng-)).
- **Expecting Emulated to block global CSS.** It does not; the verified scoped badge became bold from another component's None rule.
- **Styling <code>innerHTML</code> content with Emulated CSS.** Inserted HTML has no <code>_ngcontent</code> attribute, so scoped rules never match it.
- **Computing styles in TypeScript.** [AOT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) must read <code>styles</code> statically. A <code>styles: css("crimson")</code> helper failed to compile with <code>NG1010: Failed to resolve @Component.styles to a string or an array of strings</code> ("Value could not be determined statically").
- **Using ShadowDom for an app's everyday components.** It changes how global styles, fonts and forms behave; keep it for genuinely isolated widgets.
- **Quoting "Native".** Older tutorials mention <code>ViewEncapsulation.Native</code>; it does not exist in v22, where the enum has exactly Emulated (0), None (2), ShadowDom (3) and ExperimentalIsolatedShadowDom (4).

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ViewEncapsulation</code> decides whether a component's CSS applies only to its own template or to the whole page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The options:</strong> <span style="color:#f0e2c8;">"Emulated is the default and scopes by rewriting selectors with generated attributes; ShadowDom uses a real shadow root; None makes the styles global."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The direction:</strong> <span style="color:#f0e2c8;">"Encapsulation stops my styles leaking out; it does not stop global styles leaking in, except partly with Shadow DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">"On 22.2.3, a None component's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.label</code> rule made every label on the page bold, including one inside an Emulated component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Recommendation:</strong> <span style="color:#f0e2c8;">"Stay on Emulated, use None only for deliberate global styles, and use ShadowDom for truly isolated widgets such as custom elements."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Emulated actually scope styles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The template's elements get an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_ngcontent-*</code> attribute and the host gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_nghost-*</code>; every selector is rewritten to require them, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.label[_ngcontent-ng-c1990138692]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do the styles of each mode end up?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Emulated and None go into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> style tags (rewritten or as written); ShadowDom styles go inside the component's shadow root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you style a child component's internals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefer inputs or CSS custom properties the child exposes. If you must reach in, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host ::ng-deep .x</code> limits the leak to your subtree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ExperimentalIsolatedShadowDom</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A v21 experimental mode: Shadow DOM where Angular does not copy the rest of the app's component styles into the shadow root, so nothing from outside gets in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might styles from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">innerHTML</code> content not apply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Elements created by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">innerHTML</code> were not rendered by the template, so they lack the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_ngcontent</code> attribute that Emulated selectors require.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **View encapsulation** | Whether component CSS is scoped to its template |
| **Emulated** | Default; Angular scopes CSS with generated attributes |
| **None** | No scoping; component CSS is global |
| **ShadowDom** | Browser-native scoping inside a shadow root |
| **Shadow root** | Hidden DOM tree attached to an element |
| **_ngcontent / _nghost** | Attributes Emulated mode stamps on template elements and the host |

---
**Conclusion:** <code>ViewEncapsulation</code> is the per-component switch that keeps CSS written for one component from styling the rest of the app. Emulated, the default, rewrites selectors to require attributes only that component's elements carry; ShadowDom hands the job to the browser; None opts out and makes the rules global. The verified run shows both halves of the story: an Emulated rule stayed in its component, while a None rule reached every label on the page, including inside the Emulated one. When styles "leak" in an Angular app, look for <code>None</code> and <code>::ng-deep</code> first.`,
    examples: [
      {
        label: "Emulated styles stay scoped, None styles leak to the whole page",
        tech: "angular",
        runnable: true,
        code: `import { Component, ViewEncapsulation, afterNextRender, signal } from "@angular/core";

// Emulated (the default): ".label" is rewritten so it only matches this template.
@Component({
  selector: "scoped-badge",
  template: \`<span class="label">scoped badge</span>\`,
  styles: \`.label { color: rgb(0, 128, 0); }\`,
})
export class ScopedBadge {}

// None: the CSS goes into <head> untouched and applies to the whole page.
@Component({
  selector: "global-badge",
  encapsulation: ViewEncapsulation.None,
  template: \`<span class="label">global badge</span>\`,
  styles: \`.label { font-weight: 700; }\`,
})
export class GlobalBadge {}

@Component({
  selector: "app-root",
  imports: [ScopedBadge, GlobalBadge],
  template: \`
    <scoped-badge /> <global-badge />
    <span class="label">plain span in app-root</span>
    <ul>@for (row of report(); track $index) { <li>{{ row }}</li> }</ul>
  \`,
})
export class AppComponent {
  report = signal<string[]>([]);

  constructor() {
    afterNextRender(() => {
      const rows = [...document.querySelectorAll("app-root span.label")].map((el) => {
        const css = getComputedStyle(el);
        const attrs = [...el.attributes].map((a) => a.name).join(" ");
        return \`\${el.textContent}: color=\${css.color} weight=\${css.fontWeight} attrs=[\${attrs}]\`;
      });
      this.report.set(rows);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the difference between Shadow DOM, Emulated, and None View Encapsulation with compile output.",
    seoDescription:
      "Real ngc output for Emulated, None and ShadowDom: _ngcontent-%COMP% selectors, encapsulation flags, the runtime CSS in head and shadow roots. Angular 22.",
    description: `**Question presented to candidate:**
"Take one small component and compile it three times, with \`Emulated\`, \`ShadowDom\` and \`None\`. Walk me through what the compiler emits for each, and what ends up in the DOM at runtime."

**What a strong answer should cover:**
- **Emulated (default):** the compiler rewrites each selector to require \`[_ngcontent-%COMP%]\`, and \`:host\` becomes \`[_nghost-%COMP%]\`; at runtime \`%COMP%\` is replaced by a component id like \`ng-c3599773454\`, the host gets \`_nghost-…\` and template elements get \`_ngcontent-…\`; styles go into a \`<style>\` in \`<head>\`.
- **None:** CSS is emitted **unchanged** with \`encapsulation: 2\`; it lands in \`<head>\` and is global; \`:host\` matches nothing.
- **ShadowDom:** CSS also unchanged with \`encapsulation: 3\`; Angular calls \`attachShadow\` and puts styles **inside the shadow root**; no generated attributes.
- Gotcha: in ShadowDom mode Angular **also copies the other components' styles into the shadow root**, so a None rule can still reach inside; \`ExperimentalIsolatedShadowDom\` (v21, experimental) stops that.
- A component with no styles is compiled with \`encapsulation: 2\` regardless, so no attributes are stamped.

**Clarifying questions expected:**
- "Do you want the compiler's \`ɵcmp\` definition, the runtime DOM, or both?"
- "Is the Shadow DOM component meant to be isolated from global styles too?"

**Code / implementation expected:** Yes — the three components plus a dump of the generated CSS and DOM.`,
    answer: `**Target Audience:** Developers who know the three encapsulation modes by name and want to see what the compiler and the runtime actually produce — comfortable with CSS selectors and attributes.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The compiled code in section 3 is real <code>ngc</code> output from Angular 22.2.3, and the runtime CSS and DOM in sections 4 and 5 were printed by running the example on 22.2.3 in jsdom (both AOT and JIT modes produced the same output).

## 1. Why This Even Matters — A Story First

Three tenants move into one building, each with house rules for their own rooms.

The first tenant (**Emulated**) writes rules like "the lamp *with a blue sticker* must be dimmed", and puts a blue sticker on every lamp in their flat. The rules are pinned on the building's shared noticeboard, but only stickered lamps obey them, so nobody else is affected.

The second tenant (**None**) pins "all lamps must be dimmed" on the same board, with no sticker condition. Every lamp in the building obeys.

The third tenant (**ShadowDom**) builds a sealed room with its own noticeboard inside. Rules pinned there apply only inside the room. But, and this is the surprise in Angular's implementation, the building manager helpfully photocopies everybody else's board into the sealed room as well.

That is the whole question in one picture. The [conceptual overview](/interview-question/what-is-viewencapsulation-in-angular) covers when to use each mode; this doc shows exactly what the compiler and the runtime emit.

## 2. The Core Idea

📌 **Interview term: ɵcmp (component definition)** — the static field the Angular compiler adds to every component class. It holds the compiled template function, the <code>styles</code> array and an <code>encapsulation</code> number. The decorator you wrote is turned into this at build time; see [AOT vs JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation).

📌 **Interview term: %COMP% placeholder** — in Emulated mode the compiler rewrites selectors using the placeholder <code>%COMP%</code>; the runtime replaces it with a per-component id (here <code>ng-c3599773454</code>) when the style is inserted.

📌 **Interview term: _nghost / _ngcontent** — the two attributes Emulated mode stamps at runtime: <code>_nghost-ID</code> on the component's host element, <code>_ngcontent-ID</code> on every element its template creates.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Emulated CSS is rewritten at compile time and inserted into head with the id filled in, None CSS is kept as written and inserted into head, ShadowDom CSS is kept as written and inserted into the shadow root">
  <defs>
    <marker id="enc8-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="100" y="26" text-anchor="middle">mode</text>
  <text class="d-text" x="340" y="26" text-anchor="middle">ngc output</text>
  <text class="d-text" x="590" y="26" text-anchor="middle">runtime target</text>
  <rect class="d-box-accent" x="20" y="44" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="100" y="80" text-anchor="middle">Emulated</text>
  <rect class="d-box" x="230" y="44" width="220" height="60" rx="10"/>
  <text class="d-sub" x="340" y="70" text-anchor="middle">selectors rewritten</text>
  <text class="d-sub" x="340" y="90" text-anchor="middle">no encapsulation key</text>
  <rect class="d-box" x="500" y="44" width="180" height="60" rx="10"/>
  <text class="d-sub" x="590" y="70" text-anchor="middle">style in head</text>
  <text class="d-sub" x="590" y="90" text-anchor="middle">%COMP% filled in</text>
  <rect class="d-box-muted" x="20" y="132" width="160" height="60" rx="10"/>
  <text class="d-text" x="100" y="168" text-anchor="middle">None</text>
  <rect class="d-box" x="230" y="132" width="220" height="60" rx="10"/>
  <text class="d-sub" x="340" y="158" text-anchor="middle">CSS as written</text>
  <text class="d-sub" x="340" y="178" text-anchor="middle">encapsulation: 2</text>
  <rect class="d-box" x="500" y="132" width="180" height="60" rx="10"/>
  <text class="d-sub" x="590" y="168" text-anchor="middle">style in head, global</text>
  <rect class="d-box-muted" x="20" y="220" width="160" height="60" rx="10"/>
  <text class="d-text" x="100" y="256" text-anchor="middle">ShadowDom</text>
  <rect class="d-box" x="230" y="220" width="220" height="60" rx="10"/>
  <text class="d-sub" x="340" y="246" text-anchor="middle">CSS as written</text>
  <text class="d-sub" x="340" y="266" text-anchor="middle">encapsulation: 3</text>
  <rect class="d-box-accent" x="500" y="220" width="180" height="60" rx="10"/>
  <text class="d-sub" x="590" y="256" text-anchor="middle">style in shadow root</text>
  <path class="d-edge" d="M 184 74 L 226 74" marker-end="url(#enc8-arrow)"/>
  <path class="d-edge" d="M 454 74 L 496 74" marker-end="url(#enc8-arrow)"/>
  <path class="d-edge" d="M 184 162 L 226 162" marker-end="url(#enc8-arrow)"/>
  <path class="d-edge" d="M 454 162 L 496 162" marker-end="url(#enc8-arrow)"/>
  <path class="d-edge" d="M 184 250 L 226 250" marker-end="url(#enc8-arrow)"/>
  <path class="d-edge" d="M 454 250 L 496 250" marker-end="url(#enc8-arrow)"/>
</svg>

Only Emulated changes the CSS at compile time. None and ShadowDom pass the CSS through untouched and differ only in the <code>encapsulation</code> number, which tells the runtime where to put it: the document head, or the component's own shadow root.

## 3. Verified: what ngc emits

The example's three components share one stylesheet shape, <code>:host { display: block; } .title { color: ...; }</code>, and one template, <code>&lt;p class="title"&gt;...&lt;/p&gt;</code>. Compiled with Angular 22.2.3 <code>ngc</code> (strict templates), the end of each <code>ɵcmp</code> definition reads:

\`\`\`js
// EmulatedCard (default: no encapsulation key at all)
styles: ["[_nghost-%COMP%] { display: block; } .title[_ngcontent-%COMP%] { color: crimson; }"] });

// ShadowCard
styles: [":host { display: block; } .title { color: teal; }"], encapsulation: 3 });

// NoneCard
styles: [":host { display: block; } .title { color: orange; }"], encapsulation: 2 });

// AppComponent (no styles of its own)
dependencies: [EmulatedCard, ShadowCard, NoneCard], encapsulation: 2 });
\`\`\`

And the template function is the **same** in all three cards:

\`\`\`js
consts: [[1, "title"]], template: function EmulatedCard_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "p", 0);
\`\`\`

What this shows:

- **Emulated is a compile-time rewrite.** <code>:host</code> became <code>[_nghost-%COMP%]</code> and <code>.title</code> became <code>.title[_ngcontent-%COMP%]</code>. Because Emulated is enum value 0 and the default, the compiler omits the key entirely.
- **ShadowDom and None are not rewritten at all.** Same CSS, different number (3 and 2, matching <code>enum ViewEncapsulation</code> in the 22.2.3 typings).
- **The attributes are not in the template code.** There is no <code>_ngcontent</code> in the template instructions; the renderer adds the attributes when it creates elements for an Emulated component.
- **No styles means no encapsulation work.** <code>AppComponent</code> declared no styles, so the compiler emitted <code>encapsulation: 2</code> (None) for it: nothing to scope, so no attributes to stamp.

## 4. Verified: what ends up in the page

The example at the bottom prints, after the first render, every relevant <code>&lt;style&gt;</code> in <code>&lt;head&gt;</code>, each host's attributes, its light DOM, and its shadow root if it has one. Run in jsdom:

\`\`\`
<head> <style>: [_nghost-ng-c3599773454] { display: block; } .title[_ngcontent-ng-c3599773454] { color: crimson; }
<head> <style>: :host { display: block; } .title { color: orange; }
emulated-card host attrs: [_nghost-ng-c3599773454]
  light DOM: <p _ngcontent-ng-c3599773454="" class="title">Emulated</p>
shadow-card host attrs: []
  light DOM: (empty)
  shadowRoot (open):
    <style>: [_nghost-ng-c3599773454] { display: block; } .title[_ngcontent-ng-c3599773454] { color: crimson; }
    <style>: :host { display: block; } .title { color: teal; }
    <style>: :host { display: block; } .title { color: orange; }
    <p class="title">ShadowDom</p>
none-card host attrs: []
  light DOM: <p class="title">None</p>
\`\`\`

- **Emulated:** <code>%COMP%</code> became <code>ng-c3599773454</code> in the inserted CSS, the host carries <code>_nghost-ng-c3599773454</code>, and the paragraph carries <code>_ngcontent-ng-c3599773454</code>. The id was identical in the AOT and JIT runs. It is not random: the 22.2.3 source (<code>getComponentId</code>) hashes the definition's shape, such as the selector, template constants, binding counts, inputs, outputs and encapsulation. Styles are not part of the hash; reordering the rules kept the same id.
- **None:** the CSS went into <code>&lt;head&gt;</code> verbatim. Its <code>:host</code> rule is dead code there (<code>:host</code> only matches inside a shadow tree), and its <code>.title</code> rule is global.
- **ShadowDom:** the host has no attributes, the light DOM is empty, and the content lives in an **open** shadow root created with <code>attachShadow</code>. Its own styles are inside the root, where <code>:host</code> is native CSS and works.

## 5. The ShadowDom Surprise: Copied Styles

Look again at the shadow root: it contains **three** <code>&lt;style&gt;</code> tags, not one. Angular's ShadowDom mode copies the styles of the app's other components (the Emulated crimson rule and the None orange rule) into every shadow root, so styles registered globally by Angular keep working inside shadow components.

The consequence follows from CSS rules rather than from a measurement: inside that root, <code>.title { color: teal; }</code> and <code>.title { color: orange; }</code> have equal specificity and the orange one comes later, so by the cascade the shadow paragraph should render orange, not teal. The style order was verified; the painted colour was not checked in a real browser (jsdom does not apply shadow-tree scoping reliably, so its computed colours are not quoted here).

📌 **Interview term: ExperimentalIsolatedShadowDom** — enum value 4, tagged <code>@experimental 21.0</code> in the typings: "Similar to ShadowDom, but prevents any external styles from leaking into the component's ShadowRoot." Verified by switching the shadow card to it: the shadow root then contained only its own style:

\`\`\`
--- shadow-card.shadowRoot: open
<style>.title { color: teal; } :host { display: block; }</style><p class="title">ShadowDom</p>
\`\`\`

## 6. Side by Side

| | Emulated | None | ShadowDom |
| :--- | :--- | :--- | :--- |
| Enum value / emitted key | 0 / omitted | 2 / <code>encapsulation: 2</code> | 3 / <code>encapsulation: 3</code> |
| CSS rewritten by ngc | Yes, with <code>%COMP%</code> | No | No |
| Where the style goes | <code>&lt;head&gt;</code> | <code>&lt;head&gt;</code> | The component's shadow root |
| Attributes stamped | <code>_nghost-*</code>, <code>_ngcontent-*</code> | None | None |
| <code>:host</code> | Rewritten to <code>[_nghost-*]</code> | Left as is, matches nothing | Native, works |
| Global CSS reaches inside | Yes | Yes | Mostly no, but Angular copies other component styles in |
| Reaching into child components | <code>::ng-deep</code> (see [:host and ::ng-deep](/interview-question/what-is-the-difference-between-component-styling-using-host-host-context-and-ng-)) | Not needed: already global | Design for it: CSS custom properties or <code>::part</code> |

## 7. Common Pitfalls

- **Searching the template code for <code>_ngcontent</code>.** It is not there; the renderer adds it at runtime. The compile-time change is only in the CSS.
- **Writing <code>:host</code> in a None component.** In <code>&lt;head&gt;</code> it matches nothing, as the verified output shows the rule passed through untouched.
- **Assuming ShadowDom means perfect isolation.** Angular copies other component styles into the root; use <code>ExperimentalIsolatedShadowDom</code> (experimental) if you need nothing from outside.
- **Hard-coding the generated id in tests or global CSS.** It is a hash of the component definition and changes when the selector, inputs, outputs or template structure change.
- **Expecting attributes on a component without styles.** The compiler switches it to None, so none are stamped (verified on <code>AppComponent</code>).
- **Generating styles with a function.** <code>styles</code> must be static for AOT; a helper call failed with <code>NG1010</code>, as noted in the [ViewEncapsulation overview](/interview-question/what-is-viewencapsulation-in-angular).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Only Emulated changes the CSS at compile time; None and ShadowDom emit it as written and just tell the runtime where to put it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Emulated output:</strong> <span style="color:#f0e2c8;">"ngc rewrites <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[_nghost-%COMP%]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.title</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.title[_ngcontent-%COMP%]</code>; at runtime %COMP% becomes an id like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-c3599773454</code> and the renderer stamps those attributes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. None and ShadowDom:</strong> <span style="color:#f0e2c8;">"Both keep the CSS untouched, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">encapsulation: 2</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code>; None goes into head as global CSS, ShadowDom goes into an open shadow root."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The surprise:</strong> <span style="color:#f0e2c8;">"Angular copies the other component styles into each ShadowDom root, so a later global rule of equal specificity can still win; IsolatedShadowDom, experimental since 21, stops that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Detail that shows depth:</strong> <span style="color:#f0e2c8;">"The template function is identical in all modes, and a component without styles is compiled as None, so no attributes appear."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">_ngcontent</code> attributes come from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The renderer for Emulated components adds them as it creates elements; the compiled template instructions are the same in every mode (verified in the ngc output).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">%COMP%</code> mean in the compiled styles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A placeholder for the component id. When the style is inserted, Angular replaces it, producing selectors like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.title[_ngcontent-ng-c3599773454]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there no <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">encapsulation</code> key for Emulated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Emulated is enum value 0 and the default, so the compiler leaves it out; None emits 2 and ShadowDom emits 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a None component still get scoped <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:host</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Its CSS is inserted verbatim, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> sits in the document head where it matches nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the shadow root open or closed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Open, verified via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host.shadowRoot.mode</code>, which means page scripts can reach into it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ɵcmp** | Compiled component definition with template, styles and flags |
| **%COMP%** | Placeholder for the component id in compiled Emulated CSS |
| **_nghost-ID** | Attribute on an Emulated component host element |
| **_ngcontent-ID** | Attribute on elements created by an Emulated template |
| **encapsulation: 2 / 3** | Compiled flags for None and ShadowDom |
| **Open shadow root** | Shadow tree reachable via <code>element.shadowRoot</code> |
| **ExperimentalIsolatedShadowDom** | Shadow DOM without copied app styles; experimental |

---
**Conclusion:** The compile output makes the three modes easy to tell apart. Emulated is a compile-time selector rewrite with a <code>%COMP%</code> placeholder, filled in at runtime alongside <code>_nghost</code> and <code>_ngcontent</code> attributes; None and ShadowDom ship the CSS untouched with <code>encapsulation: 2</code> or <code>3</code>, landing in the document head or in an open shadow root. The verified run also exposed the detail interviewers rarely expect: Angular copies the app's other component styles into each ShadowDom root, which <code>ExperimentalIsolatedShadowDom</code> was added to avoid.`,
    examples: [
      {
        label: "Print the styles and attributes Angular emits for Emulated, ShadowDom and None",
        tech: "angular",
        runnable: true,
        code: `import { Component, ViewEncapsulation, afterNextRender, signal } from "@angular/core";

@Component({
  selector: "emulated-card", // ViewEncapsulation.Emulated is the default
  template: \`<p class="title">Emulated</p>\`,
  styles: \`:host { display: block; } .title { color: crimson; }\`,
})
export class EmulatedCard {}

@Component({
  selector: "shadow-card",
  encapsulation: ViewEncapsulation.ShadowDom,
  template: \`<p class="title">ShadowDom</p>\`,
  styles: \`:host { display: block; } .title { color: teal; }\`,
})
export class ShadowCard {}

@Component({
  selector: "none-card",
  encapsulation: ViewEncapsulation.None,
  template: \`<p class="title">None</p>\`,
  styles: \`:host { display: block; } .title { color: orange; }\`,
})
export class NoneCard {}

@Component({
  selector: "app-root",
  imports: [EmulatedCard, ShadowCard, NoneCard],
  template: \`
    <emulated-card /><shadow-card /><none-card />
    <h4>What Angular put in the page</h4>
    <pre>{{ dump() }}</pre>
  \`,
})
export class AppComponent {
  dump = signal("");

  constructor() {
    afterNextRender(() => {
      const out: string[] = [];
      document.head.querySelectorAll("style").forEach((s) => {
        // Only show the styles that came from these three components.
        if (s.textContent?.includes(".title")) out.push(\`<head> <style>: \${s.textContent}\`);
      });
      for (const tag of ["emulated-card", "shadow-card", "none-card"]) {
        const host = document.querySelector(tag)!;
        out.push(\`\${tag} host attrs: [\${[...host.attributes].map((a) => a.name).join(" ")}]\`);
        out.push(\`  light DOM: \${host.innerHTML || "(empty)"}\`);
        if (host.shadowRoot) {
          out.push(\`  shadowRoot (\${host.shadowRoot.mode}):\`);
          host.shadowRoot.querySelectorAll("style").forEach((s) => out.push(\`    <style>: \${s.textContent}\`));
          out.push(\`    \${host.shadowRoot.querySelector("p")!.outerHTML}\`);
        }
      }
      this.dump.set(out.join("\\n"));
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between component styling using :host, :host-context, and ::ng-deep?",
    seoDescription:
      ":host styles the component element, :host-context reacts to an ancestor class, ::ng-deep pierces child encapsulation. Real compiled CSS from Angular 22.",
    description: `**Question presented to candidate:**
"In a component stylesheet, what do \`:host\`, \`:host-context()\` and \`::ng-deep\` each target? Show me how you would theme a panel for dark mode and restyle a library chip inside it, and tell me what Angular turns those selectors into."

**What a strong answer should cover:**
- \`:host\` targets the **component's own host element** (which a template selector cannot reach); \`:host(.active)\` adds a condition on the host itself.
- \`:host-context(.dark)\` applies when the host **or any ancestor** matches \`.dark\`; handy for themes set on \`body\` or a wrapper.
- \`::ng-deep\` **turns off encapsulation for the rest of the selector**, so it reaches into child components (and, without a prefix, the whole page).
- With Emulated encapsulation Angular compiles them to attribute selectors: \`:host\` to \`[_nghost-…]\`, \`:host-context(.dark) h3\` to two selectors (\`.dark[_nghost-…] h3[…]\` and \`.dark [_nghost-…] h3[…]\`), \`::ng-deep\` drops the \`_ngcontent\` requirement after it.
- Always prefix \`::ng-deep\` with \`:host\` to keep it inside your subtree; it is **discouraged** by the Angular docs and kept for backwards compatibility; prefer CSS custom properties or inputs.
- Specificity still matters: a \`::ng-deep\` rule can tie with the child's own rule and lose on order.

**Clarifying questions expected:**
- "Do we own the child component, or is it a third-party library?"
- "Is dark mode a class on \`body\`, on a wrapper, or a media query?"

**Code / implementation expected:** Yes — a panel using all three, with the compiled CSS shown.`,
    answer: `**Target Audience:** Developers who style Angular components and have met these three selectors in a codebase — CSS selectors and specificity assumed, encapsulation basics helpful.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. The compiled selectors below are real <code>ngc</code> output from Angular 22.2.3, and the computed styles were produced by running the example on 22.2.3 in jsdom.

## 1. Why This Even Matters — A Story First

Think of a component as a framed picture. Its stylesheet can paint anything **inside** the frame (its template). By default it cannot touch the **frame itself**, the **wall** the frame hangs on, or **another picture** that somebody slipped inside this one.

Three special selectors give you exactly those three reaches:

- <code>:host</code> paints the **frame**: the component's own element.
- <code>:host-context(.dark)</code> paints differently depending on the **wall**: whether some ancestor has a class.
- <code>::ng-deep</code> lets the brush go **through** the glass of a nested picture: styling a child component's internals.

The first two are tidy and safe. The third is a crowbar, which is why the Angular docs discourage new use of it.

## 2. The Core Idea

With the default [Emulated encapsulation](/interview-question/what-is-viewencapsulation-in-angular), every selector in a component stylesheet is rewritten to require an attribute that only that component's template elements carry. The host element is not part of its own template, so a plain selector cannot match it, and a child component's elements carry the *child's* attribute, so they cannot be matched either.

📌 **Interview term: :host** — matches the component's host element (the <code>&lt;themed-panel&gt;</code> tag itself). <code>:host(.active)</code> matches it only when the host also matches <code>.active</code>. Typical use: <code>display: block</code> ([custom elements](/interview-question/what-is-the-customelements-schema-in-angular-and-when-do-you-need-to-use-it) default to inline), padding, a state outline.

📌 **Interview term: :host-context(selector)** — matches when the host **or any of its ancestors** matches the selector. Typical use: theming from a class on <code>body</code> or a layout wrapper.

📌 **Interview term: ::ng-deep** — an Angular-specific combinator that switches off encapsulation for everything after it in the selector. Written as <code>:host ::ng-deep .x</code> it reaches <code>.x</code> anywhere inside this component, including inside child components; written alone it becomes a **global** rule. The Angular styling guide says the team "strongly discourages new use of ::ng-deep" and keeps it for backwards compatibility (source: <a href="https://angular.dev/guide/components/styling" target="_blank" rel="noopener noreferrer">angular.dev component styling guide</a>).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="host targets the panel element, host-context depends on an ancestor with the dark class, and ng-deep reaches the span inside the child lib-chip component">
  <defs>
    <marker id="hst-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="200" height="50" rx="10"/>
  <text class="d-text d-accent" x="120" y="70" text-anchor="middle">:host</text>
  <rect class="d-box-accent" x="20" y="125" width="200" height="50" rx="10"/>
  <text class="d-text d-accent" x="120" y="155" text-anchor="middle">:host-context(.dark)</text>
  <rect class="d-box-accent" x="20" y="210" width="200" height="50" rx="10"/>
  <text class="d-text d-accent" x="120" y="240" text-anchor="middle">:host ::ng-deep</text>
  <rect class="d-box-muted" x="300" y="16" width="400" height="270" rx="12"/>
  <text class="d-sub" x="320" y="40">section.dark (ancestor)</text>
  <rect class="d-box" x="320" y="56" width="360" height="214" rx="10"/>
  <text class="d-sub" x="340" y="80">themed-panel (host)</text>
  <rect class="d-box" x="340" y="104" width="130" height="50" rx="8"/>
  <text class="d-sub" x="405" y="134" text-anchor="middle">h3</text>
  <rect class="d-box-muted" x="500" y="100" width="160" height="150" rx="8"/>
  <text class="d-sub" x="580" y="124" text-anchor="middle">lib-chip (child)</text>
  <rect class="d-box" x="515" y="180" width="130" height="50" rx="8"/>
  <text class="d-sub" x="580" y="210" text-anchor="middle">span.chip-text</text>
  <path class="d-edge-accent" d="M 224 65 L 316 72" marker-end="url(#hst-arrow)"/>
  <path class="d-edge-dashed" d="M 224 150 L 336 132" marker-end="url(#hst-arrow)"/>
  <path class="d-edge-accent" d="M 224 236 L 510 210" marker-end="url(#hst-arrow)"/>
</svg>

<code>:host</code> lands on the panel element itself. <code>:host-context(.dark) h3</code> is drawn dashed because it is conditional: it styles the panel's own <code>h3</code> only while the <code>section</code> ancestor has <code>.dark</code>. <code>:host ::ng-deep .chip-text</code> crosses the boundary of the child <code>lib-chip</code> component, something no ordinary selector in the panel's stylesheet can do.

## 3. Verified: what Angular compiles them into

A component stylesheet using every form, compiled with Angular 22.2.3 <code>ngc</code>. Source on the left, compiled output on the right (whitespace as emitted):

\`\`\`css
:host                         ->  [_nghost-%COMP%]
:host(.active)                ->  .active[_nghost-%COMP%]
:host-context(.dark) h3       ->  .dark[_nghost-%COMP%]   h3[_ngcontent-%COMP%],
                                  .dark   [_nghost-%COMP%]   h3[_ngcontent-%COMP%]
h3                            ->  h3[_ngcontent-%COMP%]
::ng-deep .tooltip            ->    .tooltip
:host ::ng-deep .mat-label    ->  [_nghost-%COMP%]     .mat-label
.a ::ng-deep .b               ->  .a[_ngcontent-%COMP%]     .b
:host:hover h3                ->  [_nghost-%COMP%]:hover   h3[_ngcontent-%COMP%]
\`\`\`

(<code>%COMP%</code> is replaced by the component id at runtime; see [the compile-output doc](/interview-question/explain-the-difference-between-shadow-dom-emulated-and-none-view-encapsulation-w).) Reading the rewrites:

- **<code>:host</code> is just the host attribute.** <code>:host(.active)</code> puts the class on the same element: <code>.active[_nghost-...]</code>.
- **<code>:host-context</code> becomes two selectors**: one where the host itself has <code>.dark</code>, one where an ancestor does. That is why it works for a class on <code>body</code>.
- **<code>::ng-deep</code> deletes the attribute requirement for everything after it.** Alone, <code>.tooltip</code> has no attribute at all: a global rule. After <code>:host</code>, the rule is anchored to this component's host, so it can only match inside this subtree.

## 4. Verified: the panel in action

The example at the bottom has a <code>themed-panel</code> that uses all three, inside a <code>section</code> whose <code>.dark</code> class is toggled by a button; a child <code>lib-chip</code> plays the role of a library component with its own grey text colour. Compiled with <code>ngc</code> and run in jsdom:

\`\`\`
initial            | h3 color rgb(0, 0, 0) | outline none | chip color rgb(255, 0, 0)
wrapper .dark      | h3 color rgb(255, 255, 255) | outline none | chip color rgb(255, 0, 0)
host .active too   | h3 color rgb(255, 255, 255) | outline 2px solid rgb(0, 0, 255) | chip color rgb(255, 0, 0)
host: <themed-panel _nghost-ng-c1148094823="" class="active">
\`\`\`

The <code>h3</code> turned white only when the wrapper got <code>.dark</code>; the outline appeared only when the host got <code>.active</code> (bound with <code>host: { "[class.active]": "active()" }</code>); the chip's text took the panel's red instead of its own grey.

📌 **Interview term: Specificity tie** — when two rules have the same specificity, the one that appears later in the stylesheet order wins. The first version of this example used <code>:host ::ng-deep .chip-text</code>, and the chip stayed grey:

\`\`\`
initial            | h3 color rgb(0, 0, 0) | outline none | chip color rgb(128, 128, 128)
\`\`\`

Printing the <code>&lt;style&gt;</code> tags in <code>&lt;head&gt;</code> (index, then the first 70 characters) showed the order:

\`\`\`
0 [_nghost-ng-c1148094823] { display: block; padding: 4px; } .active[_ng
1 .chip-text[_ngcontent-ng-c297233228] { color: rgb(128, 128, 128); }
\`\`\`

<code>[_nghost-X] .chip-text</code> and the child's <code>.chip-text[_ngcontent-Y]</code> both have specificity (0,2,0). The child's style was inserted **after** the panel's (the child is created after its parent), so it won. Adding the child's tag, <code>:host ::ng-deep lib-chip .chip-text</code>, raises the panel's rule to (0,2,1) and it wins regardless of order. These colours are jsdom's cascade calculation; the specificity reasoning is standard CSS, but painting was not checked in a real browser.

## 5. Which One Should You Use?

| Goal | Use | Better alternative, if any |
| :--- | :--- | :--- |
| Give the component element a display, size or spacing | <code>:host</code> | None needed |
| Style the component differently when it has a state class | <code>:host(.active)</code> with a host binding | None needed |
| Theme from a class on <code>body</code> or a wrapper | <code>:host-context(.dark)</code> | CSS custom properties set by the theme, read inside the component |
| Restyle a child component you own | Nothing deep | Give the child an input, or expose CSS custom properties |
| Restyle a third-party child you cannot change | <code>:host ::ng-deep ...</code>, scoped and specific | The library's theming API or CSS variables, if it has one |
| Global styles | <code>styles.css</code> | Avoid bare <code>::ng-deep</code> in component CSS |

📌 **Interview term: CSS custom properties** — variables like <code>--chip-color</code> that inherit through the DOM, *including* across Emulated boundaries and into shadow roots. A child that writes <code>color: var(--chip-color, grey)</code> lets any ancestor theme it without breaking encapsulation, which is why it is the recommended replacement for most <code>::ng-deep</code> uses.

The host element can also be styled from the component class with host bindings; see [@HostBinding and @HostListener](/interview-question/what-do-hostlistener-and-hostbinding-do).

## 6. Common Pitfalls

- **Bare <code>::ng-deep</code>.** Without <code>:host</code> in front it compiles to a fully global rule (verified: <code>.tooltip</code> with no attribute) and affects the whole app once the component has rendered.
- **Losing a specificity tie.** A scoped <code>::ng-deep</code> rule can tie with the child's own rule and lose on insertion order; verified above. Add a type selector or another class.
- **Using <code>:host-context</code> for media-query themes.** It only reacts to classes and attributes on ancestors; for <code>prefers-color-scheme</code> use a media query or custom properties.
- **Expecting <code>:host</code> to work with <code>ViewEncapsulation.None</code>.** None CSS is inserted as written, and <code>:host</code> in the document matches nothing.
- **Forgetting <code>display: block</code> on <code>:host</code>.** Host elements are unknown custom tags and default to <code>display: inline</code>, so width, padding and margins behave oddly.
- **Treating <code>::ng-deep</code> as deprecated and removed.** It still works in 22.2.3 (verified); the docs discourage it, which is different from removing it.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> styles the component element itself, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host-context()</code> styles based on an ancestor, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">::ng-deep</code> switches off encapsulation so styles reach into child components."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How Angular does it:</strong> <span style="color:#f0e2c8;">"With Emulated encapsulation, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[_nghost-id]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host-context(.dark)</code> to two selectors for the host or an ancestor having <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.dark</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">::ng-deep</code> drops the attribute requirement after it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Safety rule:</strong> <span style="color:#f0e2c8;">"Always prefix it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host ::ng-deep</code>, otherwise it becomes a global rule; and the Angular docs discourage new use of it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">"On 22.2.3 a scoped ng-deep rule tied on specificity with the child rule and lost because the child styles were inserted later; adding the child tag fixed it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Preferred alternative:</strong> <span style="color:#f0e2c8;">"Expose CSS custom properties or inputs from the child, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host-context</code> or variables for theming."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a normal selector not style the host element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Emulated rewrites selectors to require <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_ngcontent</code>, which is only on elements inside the template. The host lives in the parent template and carries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_nghost</code> instead, which is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> compiles to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">:host-context(.dark) h3</code> compile to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two selectors: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.dark[_nghost-x] h3[_ngcontent-x]</code> for the host itself and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.dark [_nghost-x] h3[_ngcontent-x]</code> for any ancestor, joined with a comma.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with bare <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">::ng-deep .tooltip</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compiles to plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.tooltip</code>, a global rule that applies to every tooltip in the app after this component renders, and is hard to trace back.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you theme a child without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">::ng-deep</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Have the child read CSS custom properties with defaults, then set the variables on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> or a theme class. Variables inherit across encapsulation boundaries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do these work with ShadowDom encapsulation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:host-context</code> are native Shadow DOM selectors there, not rewritten (browser support for host-context varies; not checked here). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">::ng-deep</code> is an Emulated concept; use CSS variables or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">::part</code> for shadow children.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **:host** | Selector for the component element itself |
| **:host(.x)** | The host, only when it has <code>.x</code> |
| **:host-context(.x)** | The host when it or any ancestor has <code>.x</code> |
| **::ng-deep** | Disable encapsulation for the rest of the selector |
| **Specificity tie** | Equal specificity; the later rule wins |
| **CSS custom property** | Inheritable CSS variable, the clean way to theme children |

---
**Conclusion:** The three selectors cover the three places a component stylesheet cannot normally reach: <code>:host</code> styles the component element, <code>:host-context()</code> lets an ancestor's class change it, and <code>::ng-deep</code> pushes styles into child components. The real <code>ngc</code> output shows they are all just attribute-selector rewrites, and that a bare <code>::ng-deep</code> becomes a global rule. The verified run adds the practical warning: even a well-scoped <code>:host ::ng-deep</code> can lose a specificity tie to the child's own styles, so prefer CSS custom properties and keep the crowbar for code you cannot change.`,
    examples: [
      {
        label: ":host, :host(.active), :host-context(.dark) and :host ::ng-deep with the CSS Angular generates",
        tech: "angular",
        runnable: true,
        code: `import { Component, afterNextRender, signal } from "@angular/core";

// A child we do not own (think: a library component) with its own emulated styles.
@Component({
  selector: "lib-chip",
  template: \`<span class="chip-text">library chip</span>\`,
  styles: \`.chip-text { color: rgb(128, 128, 128); }\`,
})
export class LibChip {}

@Component({
  selector: "themed-panel",
  imports: [LibChip],
  host: { "[class.active]": "active()" },
  template: \`
    <h3>Panel title</h3>
    <button (click)="active.set(!active())">toggle .active on host</button>
    <lib-chip />
  \`,
  styles: \`
    :host { display: block; padding: 4px; }
    :host(.active) { outline: 2px solid rgb(0, 0, 255); }
    :host-context(.dark) h3 { color: rgb(255, 255, 255); }
    h3 { color: rgb(0, 0, 0); }
    /* lib-chip is in the selector on purpose: see the specificity note in the answer */
    :host ::ng-deep lib-chip .chip-text { color: rgb(255, 0, 0); }
  \`,
})
export class ThemedPanel {
  active = signal(false);
}

@Component({
  selector: "app-root",
  imports: [ThemedPanel],
  template: \`
    <button id="theme" (click)="dark.set(!dark())">toggle .dark on wrapper</button>
    <section [class.dark]="dark()"><themed-panel /></section>
    <pre>{{ css() }}</pre>
  \`,
})
export class AppComponent {
  dark = signal(false);
  css = signal("");

  constructor() {
    // Show the rewritten CSS that Angular generated for themed-panel.
    afterNextRender(() => {
      const panelCss = [...document.head.querySelectorAll("style")]
        .map((s) => s.textContent ?? "")
        .find((t) => t.includes("outline"));
      this.css.set((panelCss ?? "").replace(/\\}\\s*/g, "}\\n").trim());
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the customElements schema in Angular and when do you need to use it?",
    seoDescription:
      "CUSTOM_ELEMENTS_SCHEMA lets Angular templates use Web Components without NG8001/NG8002 errors. What it allows, what it hides, and Angular Elements.",
    description: `**Question presented to candidate:**
"We want to use a design-system button built as a Web Component, \`<ds-button>\`, inside our Angular templates, and the build fails with 'ds-button is not a known element'. What is \`CUSTOM_ELEMENTS_SCHEMA\`, what exactly does it switch off, and what are the risks of adding it?"

**What a strong answer should cover:**
- Angular's compiler checks every element and property binding in a template against **known components and the DOM schema**; unknown ones fail the build with **NG8001** (element) and **NG8002** (property).
- \`schemas: [CUSTOM_ELEMENTS_SCHEMA]\` on a component (or NgModule) tells it to **accept any element with a dash in its name** and any property on such elements, which is what Web Components look like.
- Bindings then go straight to the element: \`[value]\` sets a **DOM property**, \`(rate)\` listens to a **DOM event**, plain attributes stay attributes; the browser upgrades the element when \`customElements.define\` runs.
- Risk: it also **silences typos and missing imports** for dashed tags; scope it to the components that host Web Components, never app-wide. \`NO_ERRORS_SCHEMA\` is broader still (any element, any property) and mostly a test shortcut.
- Elements without a dash still error; the schema does not register or load anything.
- The reverse direction, Angular component as a Web Component, is \`@angular/elements\` with \`createCustomElement\`, which needs no schema in the Angular app that defines it.

**Clarifying questions expected:**
- "Is the Web Component library loaded and defined before our templates render?"
- "Are we consuming Web Components, or exposing Angular components to other frameworks?"

**Code / implementation expected:** Yes — a template using a custom element with property and event bindings under the schema.`,
    answer: `**Target Audience:** Developers integrating Web Components (design systems, third-party widgets) into Angular, or publishing Angular components for other frameworks — templates and bindings assumed, no Web Components experience needed.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer expects. Every compiler error, rendered DOM and event below was produced by compiling (<code>ngc</code>, strict templates) and running the code on Angular 22.2.3 and <code>@angular/elements</code> 22.2.3 in jsdom.

## 1. Why This Even Matters — A Story First

A theatre company checks every name on the cast list against its own registry of actors before the show. That check catches real mistakes: "Hamlet" spelt "Hamelt", or an actor nobody actually hired. The show simply does not open until the list is clean.

Then the company starts working with guest performers from another agency. They are real, they will turn up on the night, but they are not in the company's registry, so the check rejects them every time.

The fix is a rule: "anyone whose name is hyphenated, like Anne-Marie, is a guest from the agency; let them through". It works, but it also means a hyphenated typo now gets through too.

Angular's template compiler is the registry check. **Web Components** (custom elements like <code>&lt;rating-stars&gt;</code>) are the guest performers: real, but unknown to Angular. <code>CUSTOM_ELEMENTS_SCHEMA</code> is the hyphen rule, with exactly that trade-off.

## 2. The Core Idea

📌 **Interview term: Custom element (Web Component)** — a browser-native component: a class extending <code>HTMLElement</code>, registered with <code>customElements.define("rating-stars", RatingStars)</code>. The HTML standard requires its name to contain a dash. Angular did not compile it, so Angular knows nothing about its properties or events.

📌 **Interview term: Template schema check** — when compiling a template, Angular checks each element against the components and directives in scope (the component's <code>imports</code>) and against its built-in DOM schema of standard HTML elements and properties. Unknown ones are build errors. Verified with a template containing <code>&lt;rating-stars [value]="4" max="5"&gt;</code> and <code>&lt;widget&gt;</code> and no schema:

\`\`\`
error NG8001: 'rating-stars' is not a known element:
1. If 'rating-stars' is an Angular component, then verify that it is included in the '@Component.imports' of this component.
2. If 'rating-stars' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@Component.schemas' of this component to suppress this message.

error NG8002: Can't bind to 'value' since it isn't a known property of 'rating-stars'.

error NG8001: 'widget' is not a known element:
1. If 'widget' is an Angular component, then verify that it is included in the '@Component.imports' of this component.
2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@Component.schemas' of this component.
\`\`\`

(Trimmed: each message also ends with a "Find more at" link and the NG8002 one lists the same remedies.) Note that the advice differs: Angular only suggests the custom-elements schema for the dashed name.

📌 **Interview term: CUSTOM_ELEMENTS_SCHEMA** — a schema you add with <code>schemas: [CUSTOM_ELEMENTS_SCHEMA]</code> on a component (or an NgModule). The 22.2.3 typings describe it as allowing "Non-Angular elements named with dash case" and "Element properties named with dash case". In practice (verified below) that means any unknown element whose tag contains a dash, and any property binding on such an element, such as <code>[value]</code>.

📌 **Interview term: NO_ERRORS_SCHEMA** — the broader schema that "allows any property on any element": no element or property checks at all. Its own doc comment says its use "is generally discouraged because it prevents useful validation and may hide real errors". Mostly seen in shallow unit tests.

## 3. How the Compiler Decides

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="For each element the compiler checks whether it matches an imported component, then whether it has a dash and the custom elements schema is present, and otherwise reports NG8001">
  <defs>
    <marker id="ces-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="126" text-anchor="middle">tag in template</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">rating-stars</text>
  <path class="d-edge" d="M 174 130 L 226 130" marker-end="url(#ces-arrow)"/>
  <rect class="d-box-muted" x="230" y="100" width="170" height="60" rx="10"/>
  <text class="d-text" x="315" y="126" text-anchor="middle">imported</text>
  <text class="d-sub" x="315" y="146" text-anchor="middle">Angular component?</text>
  <path class="d-edge" d="M 404 112 L 476 62" marker-end="url(#ces-arrow)"/>
  <rect class="d-box" x="480" y="30" width="220" height="56" rx="10"/>
  <text class="d-sub" x="590" y="63" text-anchor="middle">yes: inputs, outputs checked</text>
  <path class="d-edge-accent" d="M 404 130 L 476 130" marker-end="url(#ces-arrow)"/>
  <rect class="d-box-accent" x="480" y="102" width="220" height="56" rx="10"/>
  <text class="d-sub" x="590" y="135" text-anchor="middle">no, dash plus schema: pass</text>
  <path class="d-edge-dashed" d="M 404 148 L 476 198" marker-end="url(#ces-arrow)"/>
  <rect class="d-box-muted" x="480" y="174" width="220" height="56" rx="10"/>
  <text class="d-sub" x="590" y="207" text-anchor="middle">otherwise: NG8001 error</text>
</svg>

An imported Angular component wins and gets full type checking of its inputs and outputs. Only an element that matches nothing reaches the schema rule: with a dash and <code>CUSTOM_ELEMENTS_SCHEMA</code> it is emitted as a plain DOM element and its bindings go straight to the DOM; anything else fails the build.

## 4. Verified: a Web Component in an Angular template

The first example at the bottom defines <code>&lt;rating-stars&gt;</code> as a plain Web Component (a <code>value</code> **property**, a <code>max</code> **attribute**, a <code>rate</code> **CustomEvent**) and uses it from an Angular template with the schema:

\`\`\`html
<rating-stars max="5" [value]="score()" (rate)="score.set($any($event).detail)"></rating-stars>
\`\`\`

Compiled with <code>ngc</code>, run in jsdom, then the fourth star clicked:

\`\`\`
[app] RENDERED: ★★☆☆☆Angular sees score = 2
upgraded: RatingStars | value property: 2 | value attribute: null
after clicking star 4: ★★★★☆Angular sees score = 4
\`\`\`

- **<code>[value]</code> set a DOM property, not an attribute** (<code>value attribute: null</code>). That is how Angular binds unknown elements: <code>[x]</code> means <code>element.x = ...</code>. For a Web Component that only reads attributes, write <code>[attr.value]</code> instead.
- **<code>max="5"</code> stayed a plain attribute**, as static attributes always do.
- **<code>(rate)</code> was an ordinary DOM event listener** receiving the <code>CustomEvent</code>; <code>$any($event).detail</code> is needed because Angular cannot know the event's type.
- The click updated a [signal](/interview-question/what-are-angular-signals), and since a template listener fired, the [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) scheduler re-rendered the component.

## 5. What the Schema Hides (verified)

The schema does not know which dashed names are real Web Components. It accepts **all** of them. With <code>schemas: [CUSTOM_ELEMENTS_SCHEMA]</code>, this template compiled with no error at all:

\`\`\`html
<user-crad></user-crad><user-card></user-card>
\`\`\`

even though <code>user-crad</code> is a typo and <code>user-card</code> is a real Angular component that was simply **not in <code>imports</code>**. The rendered DOM was <code>&lt;user-crad&gt;&lt;/user-crad&gt;&lt;user-card&gt;&lt;/user-card&gt;</code>: two empty elements, no warning. Without the schema both would have been NG8001 build errors.

Elements **without** a dash are still checked even with the schema: <code>&lt;widget [x]="1"&gt;</code> failed with NG8001 for <code>widget</code> and <code>NG8002: Can't bind to 'x' since it isn't a known property of 'widget'</code>.

One more detail from the [JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) (playground-style) run: without any schema, the runtime only reported <code>NG0303: Can't bind to 'value' since it isn't a known property of 'rating-stars'</code> for the property binding; it did not report the unknown element. In the 22.2.3 source, the runtime element check returns early when a component declares no schemas, so the build-time NG8001 is the check you can rely on.

## 6. The Other Direction: Angular Elements

📌 **Interview term: Angular Elements** — the <code>@angular/elements</code> package, whose <code>createCustomElement(Component, { injector })</code> wraps an Angular component as a custom element class you register with <code>customElements.define</code>. Inputs become properties and attributes, outputs become DOM events whose <code>detail</code> is the emitted value.

The second example registers a <code>GreetingBadge</code> component ([signal <code>input()</code>](/interview-question/what-are-signal-inputs-and-model-in-modern-angular) and <code>output()</code>) as <code>&lt;greeting-badge&gt;</code>, then drives it with plain DOM code. Verified with ngc and jsdom:

\`\`\`
rendered: <button>Hello, Ada</button>
after property set: Hello, Grace
greet event detail: Grace
\`\`\`

<code>setAttribute("name", "Ada")</code> and <code>badge.name = "Grace"</code> both reached the <code>name</code> input, and the <code>greet</code> output arrived as a DOM event with <code>detail: "Grace"</code>. It is not runnable in the playground because it imports <code>@angular/elements</code>. This is how Angular widgets are embedded in React, Vue or server-rendered pages. Pairing it with <code>ViewEncapsulation.ShadowDom</code> isolates its styles; see [ViewEncapsulation](/interview-question/what-is-viewencapsulation-in-angular).

## 7. Schemas Compared

| | No schema (default) | <code>CUSTOM_ELEMENTS_SCHEMA</code> | <code>NO_ERRORS_SCHEMA</code> |
| :--- | :--- | :--- | :--- |
| Unknown dashed element | NG8001 | Allowed | Allowed |
| Unknown element without dash | NG8001 | NG8001 | Allowed |
| Unknown property on dashed element | NG8002 | Allowed (set as DOM property) | Allowed |
| Unknown property on standard element | NG8002 | NG8002 | Allowed |
| Typos and missing <code>imports</code> | Caught | **Hidden for dashed names** | Hidden everywhere |
| Typical use | Everything | Components that host Web Components | Shallow tests, if at all |

## 8. Common Pitfalls

- **Adding the schema app-wide.** Put it only on the components that actually render Web Components; everywhere else it hides real mistakes (verified: a typo and a missing import compiled silently).
- **Binding a property when the element reads attributes.** <code>[value]</code> sets <code>el.value</code>; use <code>[attr.value]</code> for attribute-driven elements.
- **Rendering before the element is defined.** The schema does not load anything. Import or register the Web Component (for example in <code>main.ts</code>) before the template renders, or it stays an inert unknown element until upgraded.
- **Using it to silence errors about your own components.** The real fix is adding the component to <code>imports</code>; see [standalone components](/interview-question/what-are-standalone-components).
- **Expecting type checking of Web Component events.** Angular types <code>$event</code> loosely for unknown elements; validate <code>detail</code> yourself.
- **Reaching for <code>NO_ERRORS_SCHEMA</code> in tests.** It hides broken bindings; prefer importing real or stub components, as in [component testing with TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CUSTOM_ELEMENTS_SCHEMA</code> tells Angular's template compiler to accept unknown elements with a dash in their name, and any properties on them, so Web Components can be used in templates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is needed:</strong> <span style="color:#f0e2c8;">"By default the compiler checks every tag and binding against imported components and the DOM schema, and fails with NG8001 or NG8002 for anything unknown."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What the bindings do:</strong> <span style="color:#f0e2c8;">"With the schema, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]</code> sets a DOM property, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(rate)</code> listens for a DOM event, and static attributes stay attributes; the browser upgrades the element once it is defined."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The risk:</strong> <span style="color:#f0e2c8;">"It also hides typos and missing imports for any dashed tag; verified, a misspelt tag and an un-imported component both compiled silently, so I scope it to the components that host Web Components."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The other direction:</strong> <span style="color:#f0e2c8;">"To expose Angular components as Web Components I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createCustomElement</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/elements</code>; inputs become properties and attributes, outputs become DOM events."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the schema allow <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;"><widget></code> without a dash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Verified: with the schema, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">widget</code> still failed with NG8001. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO_ERRORS_SCHEMA</code> allows any element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a property binding on a Web Component set an attribute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, a property. Verified: after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[value]="score()"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">el.value</code> was 2 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getAttribute("value")</code> was null. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[attr.value]</code> for attributes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you declare the schema in a standalone app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">schemas</code> array of each standalone component whose template uses Web Components; NgModule-based code can put it on the module.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does an Angular Elements output reach the host page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a DOM <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CustomEvent</code> named after the output, with the emitted value in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detail</code>. Verified: the greet output arrived with detail "Grace".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CUSTOM_ELEMENTS_SCHEMA</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NO_ERRORS_SCHEMA</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first only relaxes checks for dashed elements and their properties; the second disables element and property checks everywhere, which hides real binding bugs.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Custom element** | Browser-native component registered with <code>customElements.define</code>; name must contain a dash |
| **NG8001** | Build error: unknown element |
| **NG8002** | Build error: unknown property binding |
| **CUSTOM_ELEMENTS_SCHEMA** | Allow unknown dashed elements and their properties |
| **NO_ERRORS_SCHEMA** | Allow any element and any property |
| **Angular Elements** | <code>@angular/elements</code>: wrap an Angular component as a custom element |
| **Upgrade** | The moment the browser attaches a defined class to an existing tag |

---
**Conclusion:** <code>CUSTOM_ELEMENTS_SCHEMA</code> exists because Angular's compiler is strict about what may appear in a template, and Web Components are real elements it did not compile. Adding it to a component lets dashed tags and their properties through, so <code>[value]</code> becomes a DOM property and <code>(rate)</code> a DOM event listener, as the verified run shows. The price is that every dashed typo or forgotten import also gets through silently, so scope the schema to the few components that host Web Components, and use <code>@angular/elements</code> when you need the opposite direction.`,
    examples: [
      {
        label: "Using a plain Web Component in an Angular template with CUSTOM_ELEMENTS_SCHEMA",
        tech: "angular",
        runnable: true,
        code: `import { CUSTOM_ELEMENTS_SCHEMA, Component, signal } from "@angular/core";

// A plain Web Component, written without Angular (it could come from any library).
class RatingStars extends HTMLElement {
  #value = 0;
  set value(v: number) { this.#value = v; this.render(); } // a DOM *property*
  get value() { return this.#value; }
  connectedCallback() { this.render(); }
  render() {
    const max = Number(this.getAttribute("max") ?? 5);         // a DOM *attribute*
    this.innerHTML = "";
    for (let i = 1; i <= max; i++) {
      const star = document.createElement("button");
      star.textContent = i <= this.#value ? "★" : "☆";
      star.onclick = () => this.dispatchEvent(new CustomEvent("rate", { detail: i }));
      this.append(star);
    }
  }
}
if (!window.customElements.get("rating-stars")) window.customElements.define("rating-stars", RatingStars);

@Component({
  selector: "app-root",
  // Without this line, ng build fails: NG8001 'rating-stars' is not a known element.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <rating-stars max="5" [value]="score()" (rate)="score.set($any($event).detail)"></rating-stars>
    <p>Angular sees score = {{ score() }}</p>
  \`,
})
export class AppComponent {
  score = signal(2);
}`,
      },
      {
        label: "The reverse direction: publishing an Angular component as a custom element with @angular/elements",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injector, inject, input, output } from "@angular/core";
import { createCustomElement } from "@angular/elements";

// An ordinary Angular component...
@Component({
  selector: "greeting-badge-cmp",
  template: \`<button (click)="greet.emit(name())">Hello, {{ name() }}</button>\`,
})
export class GreetingBadge {
  name = input("world");
  greet = output<string>();
}

// ...registered as a browser custom element, usable from plain HTML, React, Vue or another Angular app.
@Component({ selector: "app-root", template: \`<p>elements registered</p>\` })
export class AppComponent {
  constructor() {
    const el = createCustomElement(GreetingBadge, { injector: inject(Injector) });
    if (!window.customElements.get("greeting-badge")) window.customElements.define("greeting-badge", el);
  }
}`,
      },
    ],
  },
];

export default augments;
