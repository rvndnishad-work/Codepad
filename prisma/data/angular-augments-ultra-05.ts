/**
 * Angular ULTRA — batch 05: effect(), Signals vs RxJS, the RxJS interop
 * bridge (toSignal / toObservable), injection context and
 * runInInjectionContext, Observables vs Promises, the async pipe, and
 * subscription leaks.
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
 * Every "Verified" block was produced on Angular 22.2.3 (RxJS 7.8.2) with
 * scripts/verify-angular-example.mjs: AOT-compiled with ngc and
 * strictTemplates, booted with bootstrapApplication in jsdom. Examples marked
 * runnable also passed its --playground mode (plain transpile + JIT, the way
 * the site playground runs them). Plain RxJS and signal-graph claims come from
 * small Node scripts; TestBed claims from a TestBed script; API stability
 * (`@publicApi <version>`, `@deprecated`) was read from the 22.2.3 typings.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the effect() function in Angular Signals, and when should you NOT use it?",
    seoDescription:
      "effect() runs side effects when signals it reads change. When it runs in Angular 22, cleanup, and why derived state belongs in computed or linkedSignal.",
    description: `**Question presented to candidate:**
"Our codebase has about forty \`effect()\` calls and a few of them keep causing stale values and one froze a page. Explain what \`effect()\` actually does in Angular, when it runs, and which of those forty you would delete."

**What a strong answer should cover:**
- \`effect()\` registers a function that **re-runs whenever a signal it read last time changes**, and exists for **side effects**: syncing signal state out to something that is not a signal (DOM APIs, storage, logging, a third-party widget).
- **Timing:** effects are scheduled, not synchronous. Several \`set()\` calls in one handler produce **one run with the final value**. Component effects run during change detection before that component's template refreshes; root effects (created outside the component tree) run first, as part of the app tick.
- It needs an **injection context** (or an \`injector\` option) and is destroyed with its owner; \`onCleanup\` cancels work from the previous run.
- **When NOT to use it:** deriving state (use \`computed()\`), resettable derived state (use \`linkedSignal()\`), copying one signal into another, loading data (use \`resource()\`/\`httpResource()\`/\`rxResource()\`), DOM reads after render (use \`afterRenderEffect()\` / \`afterNextRender()\`).
- An effect that writes a signal it also reads can loop forever; Angular does not stop it.
- \`untracked()\` to read without subscribing; \`allowSignalWrites\` is deprecated because writes are now allowed.

**Clarifying questions expected:**
- "Are the stale values coming from effects that copy one signal into another?"
- "Are these effects in components or in root services? Their timing differs."

**Code / implementation expected:** Yes — one legitimate effect with cleanup, and the same derived value written as an effect versus \`computed()\`/\`linkedSignal()\`.`,
    answer: `**Target Audience:** Developers who know what a signal is and want to use <code>effect()</code> correctly — assumes basic Angular components, explains everything else.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the words an interviewer listens for. Every ordering and output block below was produced by compiling the code with <code>ngc</code> (strict templates) on Angular 22.2.3 and running it in jsdom; API status claims were read from the 22.2.3 typings.

## 1. Why This Even Matters — A Story First

Picture a shop with a price board in the window. Inside, the owner keeps the real prices in a ledger. Every time a price in the ledger changes, an assistant walks outside and repaints the board.

That assistant is useful: the board is not part of the ledger, so someone has to carry the change outside. That is an **effect**.

Now imagine the owner also asks the assistant to keep a second ledger, "prices with VAT", by copying numbers across after every change. The assistant is always a few steps behind, so anyone who looks at the second ledger right after a change sees an old number. Worse, if the assistant is told "whenever the ledger changes, add a correction line to the ledger", he never goes home.

The VAT ledger should not exist as a copy at all. It should be a formula on the original page, worked out whenever someone reads it. That formula is <code>computed()</code>. Most misuse of <code>effect()</code> is exactly this: an assistant hired to copy numbers that a formula would have given for free.

## 2. The Core Idea

📌 **Interview term: effect()** — a function registered with Angular that runs once, records which signals it read, and **runs again whenever any of those signals change**. Its job is to cause a **side effect**: something outside the signal graph, such as setting <code>document.title</code>, writing to <code>localStorage</code>, logging, or calling a chart library.

📌 **Interview term: Side effect** — anything a function does besides returning a value. Effects exist for side effects; <code>computed()</code> must not have any.

📌 **Interview term: Dependency tracking** — on every run, Angular records the signals the effect function **actually read**. A signal read only inside an <code>if</code> branch that did not execute is not a dependency for that run. See [Angular Signals](/interview-question/what-are-angular-signals) for the full model.

📌 **Interview term: onCleanup** — the effect function receives a callback registrar. A cleanup function registered there runs **before the next run** and **when the effect is destroyed**, so you can cancel a timer or request started by the previous run.

📌 **Interview term: untracked()** — reads a signal without making it a dependency. Use it when an effect needs a value but should not re-run when that value changes.

The 22.2.3 typings mark <code>effect</code>, <code>EffectRef</code> and <code>CreateEffectOptions</code> as <code>@publicApi 20.0</code>, meaning stable since v20. The old <code>allowSignalWrites</code> option is <code>@deprecated</code> with the note "no longer required, signal writes are allowed by default."

## 3. When Does an Effect Actually Run?

This is the part interviewers probe, and the part most people get wrong from memory. The typings describe **two kinds of effect**:

📌 **Interview term: Component effect** — created in a component, directive, or [a service provided by one](/interview-question/what-is-a-service-and-why-use-it). It "runs as a [component lifecycle event](/interview-question/what-are-angular-lifecycle-hooks) during Angular's synchronization (change detection) process", so it can safely read inputs.

📌 **Interview term: Root effect** — created outside the component tree, for example in a [<code>providedIn: "root"</code> service](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component). It has "no connection to the component tree or change detection".

To see the real order, the experiment below logs from a constructor, <code>ngOnInit</code>, a component effect, a root-service effect, the template, <code>afterNextRender</code> and a microtask, then clicks a button whose handler calls <code>set()</code> three times on the component signal and twice on the root signal.

\`\`\`
BOOT:
  constructor
  root effect sees 0
  ngOnInit
  component effect sees 0
  template evaluated
  afterNextRender
  microtask queued in constructor
CLICK:
  click handler start
  click handler end
  after click() returned
  root effect sees 6
  component effect sees 3
  template evaluated
\`\`\`

Four facts fall out of that output, identical in AOT and in the playground JIT mode:

1. **Effects never run inside <code>set()</code>.** Nothing ran between "click handler start" and "after click() returned".
2. **Batched to the final value.** Three writes (1, 2, 3) produced one run that saw 3; two writes (5, 6) produced one run that saw 6.
3. **Root effects first, then component effects, then the template.** The app tick flushes root effects, then change detection runs the component effect just before that component's view is refreshed.
4. **The first run is not in the constructor.** The component effect first ran after <code>ngOnInit</code>, so it can read inputs that are set by then.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Order of work after a click: handler writes signals, task ends, root effects run, then component effects, then the template, then after render hooks">
  <defs>
    <marker id="eff-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="70" text-anchor="middle">click handler</text>
  <text class="d-sub" x="95" y="92" text-anchor="middle">set, set, set</text>
  <path class="d-edge" d="M 174 75 L 222 75" marker-end="url(#eff-arrow)"/>
  <rect class="d-box" x="228" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="293" y="70" text-anchor="middle">root effects</text>
  <text class="d-sub" x="293" y="92" text-anchor="middle">latest value only</text>
  <path class="d-edge" d="M 362 75 L 410 75" marker-end="url(#eff-arrow)"/>
  <rect class="d-box-accent" x="416" y="40" width="150" height="70" rx="10"/>
  <text class="d-text d-accent" x="491" y="70" text-anchor="middle">component effects</text>
  <text class="d-sub" x="491" y="92" text-anchor="middle">during change detection</text>
  <path class="d-edge" d="M 491 114 L 491 152" marker-end="url(#eff-arrow)"/>
  <rect class="d-box" x="416" y="158" width="150" height="62" rx="10"/>
  <text class="d-text" x="491" y="194" text-anchor="middle">template refresh</text>
  <path class="d-edge-dashed" d="M 412 189 L 330 189" marker-end="url(#eff-arrow)"/>
  <rect class="d-box-muted" x="170" y="158" width="154" height="62" rx="10"/>
  <text class="d-text" x="247" y="194" text-anchor="middle">afterRender hooks</text>
</svg>

The writes in the handler only mark things dirty. Once the handler's task has finished, the scheduler runs one tick: root effects, then each dirty component's effects followed by its template, then render hooks such as [afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks). This is the [zoneless scheduler](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) described in [how change detection works](/interview-question/how-does-change-detection-work-in-angular).

## 4. Verified: what legitimate effects look like

The first example at the bottom has two effects that each push state **out** of Angular: one sets <code>document.title</code> and "saves" preferences, the other schedules an analytics call and cancels it with <code>onCleanup</code> if the size changes again. The driver clicks "Theme" once and "Bigger text" twice in a row:

\`\`\`
save prefs: dark=false size=14
RENDERED: Reading preferencesTheme: lightBigger textLight theme, 14px
title="Light theme, 14px" effectRuns=1
save prefs: dark=true size=18
after 3 clicks: Reading preferencesTheme: darkBigger textDark theme, 18px
title="Dark theme, 18px" effectRuns=2
analytics: settled on 18px
\`\`\`

(The rendered lines are the root element text, so adjacent elements run together.) Three clicks, one extra effect run: the 16px state was never seen by either effect. And because the cleanup cleared the pending timer, the analytics call fired only for 18px, never for 14px or 16px.

Cleanup order, from a separate run with a logging effect that tracks <code>qty</code> and reads <code>price</code> through <code>untracked()</code>. The run sets <code>qty</code> to 3, then <code>price</code> to 20, then destroys the app; lines from the other effect and the template are left out:

\`\`\`
BOOT:
  logger run qty=2 price(untracked)=10
qty=3:
  cleanup for qty=2
  logger run qty=3 price(untracked)=10
price=20:
destroy:
  cleanup for qty=3
\`\`\`

The previous run's cleanup always fires first, changing an untracked signal triggers nothing, and destroying the owner runs the last cleanup.

## 5. When You Should NOT Use effect()

| Situation | Use instead | Why |
| :--- | :--- | :--- |
| A value derived from other signals | <code>computed()</code> | Always current, lazy, cached; no extra writes |
| Derived state the user can override (selected option resets when the list changes) | <code>linkedSignal()</code> | Writable, but recomputes from its source |
| Copying a signal into another signal | Read the original, or <code>computed()</code> | The copy is stale until the effect runs |
| Fetching data when a signal changes | <code>resource()</code>, <code>httpResource()</code>, <code>rxResource()</code>, or <code>toObservable</code> + [<code>switchMap</code>](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap) | Loading state, cancellation and errors built in |
| Measuring or touching DOM after render | <code>afterRenderEffect()</code> / <code>afterNextRender()</code> | Runs after the DOM is updated, in the right phase |
| Reacting to an event (a click, a message) | Do it in the event handler | Events are not state; an effect sees only the latest value |

The 22.2.3 typings mark <code>linkedSignal</code> <code>@publicApi 20.0</code>, and <code>resource</code>, <code>rxResource</code> and <code>httpResource</code> <code>@publicApi 22.0</code>, so all of them are stable alternatives today. For the computed-versus-method side of this, see [computed() vs methods and getters](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

## 6. Verified: the stale copy and the endless loop

**Stale copy.** <code>viaEffect</code> is a signal kept up to date by an effect; <code>viaComputed</code> is a <code>computed()</code>. Both multiply price by quantity. Reading both straight after <code>qty.set(3)</code>, in the same tick:

\`\`\`
same tick after qty.set(3): viaEffect=20 viaComputed=30
after settle:              viaEffect=30 viaComputed=30
\`\`\`

Any code that reads the copy between the write and the next tick, such as the rest of an event handler, a service method or a test, gets the old number. The second example at the bottom shows the same thing in a template: inside the click handler the computed total and the <code>linkedSignal</code> are already correct, while the effect-maintained copies still hold the previous country's values:

\`\`\`
after switch : Ship to UKcomputed total: 14 | effect copy: 14linkedSignal method: USPS | effect-reset method: USPSread inside the click handler: computed=14 copy=10 linked=USPS effectReset=Royal MailPick 2nd method
\`\`\`

(Root element text, so the paragraphs run together.) The template looks fine because component effects run before the template refreshes, which is exactly why this bug survives code review and then shows up in handlers and tests.

**Endless loop.** An effect that reads a signal and writes the same signal schedules itself again every time. With a guard that stops after 20,000 runs, boot completed and rendered <code>19999</code> after about 6 seconds with **no error or warning**. Without the guard the page never finished booting and the run was killed after 60 seconds. Angular does not detect this cycle for you.

## 7. Effects in Tests

Because effects are scheduled, a test must flush them. Verified with <code>TestBed</code> on 22.2.3, using an effect created inside <code>TestBed.runInInjectionContext</code>:

\`\`\`
effect before flush: []
after TestBed.tick(): [1]
after set(2), set(3), tick(): [1,3]
\`\`\`

The value 2 was never observed, the same batching as in the app. More in [unit testing components with signals](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed).

## 8. Common Pitfalls

- **Using an effect to derive state.** It works on screen and is stale everywhere else (verified above). Use <code>computed()</code> or <code>linkedSignal()</code>.
- **Writing to a signal you also read.** A self-feeding effect runs forever with no error. If you must read and write, read with <code>untracked()</code> or move the logic to an event handler.
- **Expecting an effect per <code>set()</code>.** Effects see the settled value. If you need every change (an audit log of clicks), handle the event itself or use an [RxJS stream](/interview-question/what-is-the-difference-between-observables-and-promises).
- **Creating an effect in <code>ngOnInit</code> or a handler.** It needs an [injection context](/interview-question/how-does-dependency-injection-work-in-angular); outside one it throws <code>NG0203: effect() can only be used within an injection context...</code>. Create it in a field initialiser or the constructor, or pass <code>{ injector }</code>. See [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).
- **Reading too much.** Every signal read inside the effect is a trigger. A logger that reads ten signals re-runs when any of them change; wrap incidental reads in <code>untracked()</code>.
- **Forgetting cleanup for async work.** Without <code>onCleanup</code>, a slow request started by an old run can finish after a newer one and overwrite fresher data.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code> runs a function now and again whenever a signal it read changes. It is for side effects: pushing signal state out to the DOM, storage, logging or a third-party library."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Timing:</strong> <span style="color:#f0e2c8;">"It is scheduled, not synchronous. Several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set()</code> calls give one run with the final value. Root effects run first in the tick, component effects run during change detection just before that component's template."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lifecycle:</strong> <span style="color:#f0e2c8;">"It needs an injection context, is destroyed with its component, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCleanup</code> cancels the previous run's work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When not to:</strong> <span style="color:#f0e2c8;">"Never to derive state: that is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linkedSignal()</code> if the user can override it. Not for data loading either: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resource()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpResource()</code> are stable in v22."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Real risk:</strong> <span style="color:#f0e2c8;">"An effect that writes a signal it reads loops forever, and an effect that copies state leaves a stale value that handlers and tests can read."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write to a signal inside an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowSignalWrites</code> is deprecated and writes are allowed by default. It is still usually a smell: if the written value is derived, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>; if it is derived but overridable, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">linkedSignal()</code>. Writing a signal the effect also reads creates a loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a component effect and a root effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A component effect belongs to a component or a service provided by one; it runs during change detection, before that component refreshes, and is destroyed with it. A root effect lives in a root service, runs at the start of the app tick, and lives as long as the app.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop an effect re-running when one of the signals it reads changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Read that signal through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">untracked()</code>. Only tracked reads become dependencies, and the set is recalculated on every run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test code that uses effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create it in an injection context (a component, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.runInInjectionContext</code>), change the signals, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.tick()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> to flush. Expect one run with the final value, not one per write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">afterRenderEffect()</code> and when would you prefer it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An effect that runs after the application finishes rendering, optionally split into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">earlyRead</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mixedReadWrite</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> phases, so you can measure or touch the DOM the template just produced. Use it for layout work; plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code> runs before the template refresh, so the DOM is not updated yet.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **effect()** | Re-runs a side-effect function when signals it read change |
| **Side effect** | Work outside the signal graph: DOM, storage, logging, network |
| **Dependency tracking** | The set of signals an effect actually read on its last run |
| **onCleanup** | Callback that runs before the next run and on destroy |
| **untracked()** | Read a signal without subscribing to it |
| **Component effect** | Effect owned by a component; runs during change detection |
| **Root effect** | Effect in a root service; runs at the start of the tick |
| **linkedSignal()** | Writable signal that resets from a source computation |
| **afterRenderEffect()** | Effect that runs after the DOM is updated |

---
**Conclusion:** <code>effect()</code> is the exit door of the signal graph: it carries state out to things that are not signals, runs on a schedule rather than on every write, and cleans up after itself. Verified on 22.2.3, writes inside a handler produce one run with the final value, root effects go first, component effects run just before their template, and an effect that copies state is stale until then while a self-feeding one loops forever without a warning. So the strong answer is short: use effects for side effects, and use <code>computed()</code>, <code>linkedSignal()</code> or a resource for everything that is really derived state. For how this fits with RxJS, see [Signals vs RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18).`,
    examples: [
      {
        label: "Legitimate effects: syncing document.title and cancelling stale work with onCleanup",
        tech: "angular",
        runnable: true,
        code: `import { Component, computed, effect, signal } from "@angular/core";

// Good uses of effect(): pushing signal state OUT to something that is not a signal
// (document.title, localStorage, a log, a third-party widget).
@Component({
  selector: "app-root",
  template: \`
    <h3>Reading preferences</h3>
    <button (click)="dark.update(d => !d)">Theme: {{ dark() ? "dark" : "light" }}</button>
    <button (click)="size.update(s => s + 2)">Bigger text</button>
    <p>{{ summary() }}</p>
  \`,
})
export class AppComponent {
  dark = signal(false);
  size = signal(14);

  // Derived state is computed(), never an effect that writes another signal.
  summary = computed(() => \`\${this.dark() ? "Dark" : "Light"} theme, \${this.size()}px\`);

  effectRuns = 0;

  constructor() {
    // Side effect 1: sync to things outside Angular. Re-runs when dark or size change.
    effect(() => {
      this.effectRuns++;
      document.title = this.summary();
      console.log(\`save prefs: dark=\${this.dark()} size=\${this.size()}\`); // e.g. localStorage.setItem(...)
    });

    // Side effect 2: work that must be cancelled when inputs change again.
    effect((onCleanup) => {
      const size = this.size();
      const timer = setTimeout(() => console.log(\`analytics: settled on \${size}px\`), 50);
      onCleanup(() => clearTimeout(timer)); // runs before the next run, and on destroy
    });
  }
}`,
      },
      {
        label: "computed() and linkedSignal() versus copying state with an effect",
        tech: "angular",
        runnable: true,
        code: `import { Component, computed, effect, linkedSignal, signal } from "@angular/core";

const METHODS: Record<string, string[]> = {
  UK: ["Royal Mail", "DPD"],
  US: ["USPS", "UPS", "FedEx"],
};

@Component({
  selector: "app-root",
  template: \`
    <button (click)="switchCountry()">Ship to {{ country() === "UK" ? "US" : "UK" }}</button>
    <p>computed total: {{ totalComputed() }} | effect copy: {{ totalCopy() }}</p>
    <p>linkedSignal method: {{ method() }} | effect-reset method: {{ methodViaEffect() }}</p>
    <p>read inside the click handler: {{ readInHandler() }}</p>
    <button (click)="method.set(methods()[1])">Pick 2nd method</button>
  \`,
})
export class AppComponent {
  country = signal("UK");
  qty = signal(2);
  methods = computed(() => METHODS[this.country()]);

  // DO: derived values are computed() ...
  totalComputed = computed(() => this.qty() * (this.country() === "UK" ? 5 : 7));
  // ... and "derived but user-overridable" state is linkedSignal().
  method = linkedSignal(() => this.methods()[0]);

  // DON'T: copy state into another signal from an effect.
  totalCopy = signal(0);
  methodViaEffect = signal("");
  readInHandler = signal("");

  constructor() {
    effect(() => this.totalCopy.set(this.qty() * (this.country() === "UK" ? 5 : 7)));
    effect(() => this.methodViaEffect.set(this.methods()[0]));
  }

  switchCountry() {
    this.country.update((c) => (c === "UK" ? "US" : "UK"));
    // Same tick, straight after the write: the computed values are already right,
    // the effect copies have not run yet.
    this.readInHandler.set(
      \`computed=\${this.totalComputed()} copy=\${this.totalCopy()} linked=\${this.method()} effectReset=\${this.methodViaEffect()}\`,
    );
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Signals signal()/computed()/effect() vs RxJS — when do you use which in Angular 18+?",
    seoDescription:
      "Signals hold synchronous, glitch-free state; RxJS models events over time with debounce, cancellation and retries. How to combine them in Angular 22.",
    description: `**Question presented to candidate:**
"We are on Angular 22 and half the team wants to replace RxJS with signals everywhere, the other half wants to keep everything in Observables. Where would you draw the line between \`signal()\`/\`computed()\`/\`effect()\` and RxJS, and how do the two talk to each other?"

**What a strong answer should cover:**
- **Signals model state**: a value that always exists, is read synchronously, and notifies dependants. \`computed()\` is lazy, cached and **glitch-free**; \`effect()\` is for side effects.
- **RxJS models events over time**: streams that may emit many times or never, with operators for **time** (\`debounceTime\`), **concurrency and cancellation** (\`switchMap\`), retries and combination.
- The practical split: **signals in components and templates; RxJS where time, cancellation or event streams matter** (search boxes, websockets, polling, complex HTTP orchestration).
- The bridge: \`toSignal()\` and \`toObservable()\` from \`@angular/core/rxjs-interop\`; \`rxResource()\`, \`resource()\` and \`httpResource()\` (stable in v22) for async data driven by signals.
- Differences that bite: a \`BehaviorSubject\` re-emits equal values while a signal skips them; \`combineLatest\` can emit an intermediate inconsistent value where \`computed()\` cannot.
- Neither replaces the other: HttpClient, router events and forms still expose Observables.

**Clarifying questions expected:**
- "Is the goal simpler templates and change detection, or removing the RxJS dependency?"
- "Which parts are event-heavy, such as search, websockets or polling?"

**Code / implementation expected:** Yes — a search box where the query is a signal, RxJS handles debounce and cancellation, and the result comes back as a signal.`,
    answer: `**Target Audience:** Angular developers who have used both signals and Observables and want a principled rule for choosing — explains each idea from scratch.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The comparison claims in section 5 come from a Node script run against <code>@angular/core</code> 22.2.3 and RxJS 7.8.2; the search example was compiled with <code>ngc</code> and driven in jsdom with real timers. Nothing below is quoted from memory.

## 1. Why This Even Matters — A Story First

Think about a train station. There is a **departures board**: at any moment it shows the current platform for every train. You can glance at it whenever you like and it always has an answer. If the platform changes, the board changes, and anyone looking at it sees the new value.

Then there is the **public address system**: "the 10:15 to Leeds is now boarding". An announcement happens at a moment in time. If you were not listening, you missed it. Several can come in quick succession, and sometimes a later one cancels an earlier one ("ignore the last announcement").

A **signal** is the departures board: current state, always readable. An **Observable** is the announcement system: things that happen over time. Most arguments about "signals versus RxJS" are really people trying to use a board as a loudspeaker, or a loudspeaker as a board.

## 2. The Core Idea

📌 **Interview term: Signal** — a wrapper around a value that tracks who reads it. <code>signal()</code> is writable, [<code>computed()</code> derives a value](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) from other signals, <code>effect()</code> runs side effects when signals change. A signal **always has a current value** and is read synchronously by calling it. See [Angular Signals](/interview-question/what-are-angular-signals).

📌 **Interview term: Observable** — a lazy stream that can emit zero, one or many values over time, then complete or error. Nothing happens until someone subscribes. See [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises).

📌 **Interview term: Glitch-free** — derived values never observe a half-updated state. When one source feeds two computed values that are combined again, the combination only sees both updated together.

📌 **Interview term: Push vs pull** — RxJS pushes every value to subscribers the moment it is produced. Signals notify that something changed, and the value is pulled (and recomputed if needed) only when someone reads it.

The 22.2.3 typings mark <code>effect</code>, <code>linkedSignal</code>, <code>toSignal</code> and <code>toObservable</code> as <code>@publicApi 20.0</code> (stable since v20), and <code>resource</code>, <code>rxResource</code> and <code>httpResource</code> as <code>@publicApi 22.0</code>. Signals themselves arrived in v16, so an "Angular 18+" answer should note that in 18 and 19 <code>effect</code>, <code>toSignal</code> and <code>toObservable</code> were still developer preview, and <code>linkedSignal</code> was introduced as developer preview in 19 (source: <a href="https://blog.ninja-squad.com/2024/11/19/what-is-new-angular-19.0" target="_blank" rel="noopener noreferrer">Ninja Squad, What is new in Angular 19.0</a>).

## 3. The Decision in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Decision guide: state read by templates goes to signals, events over time go to RxJS, and the interop functions connect them">
  <defs>
    <marker id="svr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="240" height="210" rx="12"/>
  <text class="d-text d-accent" x="150" y="70" text-anchor="middle">Signals: state</text>
  <text class="d-sub" x="150" y="110" text-anchor="middle">form values, selections</text>
  <text class="d-sub" x="150" y="140" text-anchor="middle">derived totals, flags</text>
  <text class="d-sub" x="150" y="170" text-anchor="middle">anything a template reads</text>
  <text class="d-sub" x="150" y="200" text-anchor="middle">inputs, model, queries</text>
  <rect class="d-box" x="450" y="40" width="240" height="210" rx="12"/>
  <text class="d-text" x="570" y="70" text-anchor="middle">RxJS: events over time</text>
  <text class="d-sub" x="570" y="110" text-anchor="middle">debounce and throttle</text>
  <text class="d-sub" x="570" y="140" text-anchor="middle">cancel stale requests</text>
  <text class="d-sub" x="570" y="170" text-anchor="middle">websockets, polling</text>
  <text class="d-sub" x="570" y="200" text-anchor="middle">retry, combine, race</text>
  <path class="d-edge-accent" d="M 274 115 L 446 115" marker-end="url(#svr-arrow)"/>
  <text class="d-sub" x="360" y="100" text-anchor="middle">toObservable</text>
  <path class="d-edge-accent" d="M 446 185 L 274 185" marker-end="url(#svr-arrow)"/>
  <text class="d-sub" x="360" y="210" text-anchor="middle">toSignal</text>
</svg>

The rule of thumb: **if you would describe it with a noun ("the selected user", "the cart total"), it is a signal; if you would describe it with a verb in time ("when the user stops typing", "whenever the socket sends"), it is a stream.** Most real features have both, and the interop functions turn one into the other at the boundary.

## 4. Side by Side

| | Signals | RxJS Observables |
| :--- | :--- | :--- |
| Models | Current state | Events and values over time |
| Has a value right now | Always | Only some ([<code>BehaviorSubject</code>](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject)) |
| Read | Synchronously: <code>count()</code> | Subscribe with a callback |
| Derivation | <code>computed()</code>, lazy, cached, glitch-free | <code>map</code>, [<code>combineLatest</code>](/interview-question/what-is-the-difference-between-forkjoin-zip-combinelatest-and-withlatestfrom), push every value |
| Equal values | Skipped (no notification) | Re-emitted unless <code>distinctUntilChanged()</code> |
| Time operators | None | <code>debounceTime</code>, <code>throttleTime</code>, <code>delay</code>, <code>timer</code> |
| Cancellation | Not a concept | <code>switchMap</code>, <code>takeUntil</code>, unsubscribe |
| Cleanup | Automatic with the owner | You must unsubscribe (or let a helper) |
| Change detection | Template reads mark exactly that view | Needs [the async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful) or <code>toSignal()</code> |
| Learning curve | Small API | Large operator vocabulary |

## 5. Verified: the two differences that cause real bugs

**Glitches.** One source <code>a</code> feeds <code>double = a * 2</code> and <code>plusOne = a + 1</code>, and a third value combines both. Built once with <code>computed()</code> and once with <code>BehaviorSubject</code> + <code>map</code> + <code>combineLatest</code>, then <code>a</code> changes from 1 to 5:

\`\`\`
--- signals: diamond a -> (double, plusOne) -> sum
read: 2 + 2 = 4
read: 10 + 6 = 16 (sum computed ran 2 times)
--- RxJS: same diamond with combineLatest
emit: 2 + 2 = 4
emit: 10 + 2 = 12
emit: 10 + 6 = 16
\`\`\`

The RxJS version emitted <code>10 + 2 = 12</code>, a combination of the new <code>double</code> and the old <code>plusOne</code> that never existed in the data. If that emission triggered an HTTP call or an analytics event, it would be a real bug. The <code>computed()</code> version ran once per read and was never inconsistent.

**Equality and laziness.** From the same script:

\`\`\`
computed re-ran after set(same value): 0 times
BehaviorSubject emissions incl. duplicate: 2
lazy computed: never read -> never runs: 0
\`\`\`

A signal set to an equal value notifies nobody; a <code>BehaviorSubject</code> pushes the duplicate to every subscriber. And a <code>computed()</code> that nobody reads never executes at all, while an Observable pipeline with a subscriber runs for every value whether or not anyone needs the result.

## 6. Verified: using both in one feature

The example at the bottom is a city search box. The **query is a signal** (it is state, bound to the input). Turning it into results is a job about **time and cancellation**, so it goes through RxJS: <code>debounceTime(100)</code>, <code>distinctUntilChanged()</code>, then <code>switchMap</code> to a fake API that takes 150 ms. The result comes back through <code>toSignal()</code> and <code>computed()</code> derives the status text.

The driver types "L", "Le", "Lee" 20 ms apart, waits, then types "L" and, while that request is in flight, "Li":

\`\`\`
RENDERED: 0 result(s)
request "Lee"
mid-flight  : Searching...
after 'Lee' : 1 result(s)Leeds
request "L"
cancelled "L"
request "Li"
after 'Li'  : 2 result(s)LisbonLima
\`\`\`

Three keystrokes produced one request. When a newer term arrived while "L" was still loading, <code>switchMap</code> unsubscribed from it, which ran the fake API's teardown and printed "cancelled". With signals alone you would have to hand-write the debounce timer and an out-of-order-response guard; with RxJS alone the template would need the async pipe and you would lose glitch-free derivation of the status. The operator choice matters here; see [switchMap vs mergeMap vs concatMap vs exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).

## 7. Where the Boundary Usually Sits

- **Components and templates:** signals. Inputs, [<code>model()</code>](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs) and queries are signals already, and with [OnPush](/interview-question/how-does-change-detection-work-in-angular) as the default in v22 a template that reads signals updates without extra work.
- **[Services holding app state](/interview-question/what-is-a-service-and-why-use-it):** signals (or an [NgRx Signal Store](/interview-question/what-is-ngrx)), exposing read-only signals or <code>computed()</code> values. See [state management libraries](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular).
- **HTTP:** <code>HttpClient</code> returns Observables. For a simple "load when this signal changes", <code>httpResource()</code> or <code>rxResource()</code> are stable in v22. For orchestration with retries, polling or cancellation, keep RxJS and finish with <code>toSignal()</code>.
- **Streams from the platform:** [router events](/interview-question/how-does-routing-and-lazy-loading-work-in-angular), form <code>valueChanges</code>, websockets, DOM events: RxJS, converted at the edge.

The bridge itself is covered in [how toSignal() and toObservable() bridge Signals and RxJS](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 8. Common Pitfalls

- **Rewriting every stream as signals plus effects.** You end up re-implementing <code>debounceTime</code> and <code>switchMap</code> by hand, with timers in effects and race conditions. Keep RxJS where time is the point.
- **Keeping UI state in <code>BehaviorSubject</code>s in a v22 app.** It works, but every template needs the async pipe, duplicates re-emit, and <code>combineLatest</code> can glitch. Signals are the better fit for state.
- **Using <code>effect()</code> as a subscription.** An effect sees only settled values, so it is the wrong tool for "react to every event". See [when not to use effect()](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
- **Expecting <code>toObservable()</code> to emit every <code>set()</code>.** It emits through an effect, so synchronous writes collapse to the last one.
- **Forgetting that RxJS needs cleanup.** Signals clean up with their owner; a manual <code>subscribe()</code> does not. See [avoiding subscription leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).
- **Thinking signals remove RxJS from the bundle.** HttpClient, the router and [reactive forms](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms) still use RxJS internally.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">"Signals are for state, RxJS is for events over time. If I would name it with a noun it is a signal; if it is 'when the user stops typing' it is a stream."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why signals for state:</strong> <span style="color:#f0e2c8;">"They always have a value, read synchronously, are glitch-free, skip equal values, and with OnPush by default the template updates exactly where they are read."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why RxJS for events:</strong> <span style="color:#f0e2c8;">"Time and concurrency: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> cancellation, retries, websockets and polling. Signals have no notion of time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The bridge:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable()</code> turns a signal into a stream, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> brings the result back. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rxResource()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpResource()</code>, stable in v22, cover the simple load-on-change case."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show evidence:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combineLatest</code> can emit an inconsistent intermediate value in a diamond; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> cannot. That is the concrete reason to move derived state to signals."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Will signals replace RxJS in Angular?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For component state, largely yes. For asynchronous event streams, no: HttpClient, the router and forms still expose Observables, and nothing in the signal API handles debounce, cancellation or retries. The interop package exists because both are expected to stay.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does glitch-free mean, concretely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When one source feeds two derived values that are combined, the combination never sees one updated and the other stale. Verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combineLatest</code> emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10 + 2 = 12</code> when the source went from 1 to 5; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> went straight from 4 to 16.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you debounce a signal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Convert it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable(query).pipe(debounceTime(300))</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> the result. Doing it with an effect and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> works but you reinvent cancellation and cleanup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should a service expose signals or Observables?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Expose state as read-only signals (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asReadonly()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>), because consumers usually just render it. Expose genuine event streams, like notifications or socket messages, as Observables. Pick by what the thing is, not by habit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost of mixing the two?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each conversion adds a subscription or an effect with its own timing: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable()</code> emits asynchronously and collapses synchronous writes, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> needs an initial value or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireSync</code>. Convert at clear boundaries rather than back and forth.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Signal** | A value with dependency tracking; always readable |
| **computed()** | Derived signal, lazy and cached |
| **effect()** | Side effect that re-runs when read signals change |
| **Observable** | Lazy stream of zero or more values over time |
| **Glitch-free** | Derived values never see a half-updated state |
| **Push vs pull** | RxJS pushes values; signals notify and are pulled on read |
| **switchMap** | Maps to an inner stream and cancels the previous one |
| **toSignal / toObservable** | The interop functions that convert between the two |
| **rxResource / httpResource** | Signal-driven async loading, stable in v22 |

---
**Conclusion:** Signals and RxJS answer different questions. A signal answers "what is the value now?", always, synchronously and consistently, which is why it is the right home for component and service state in Angular 22. An Observable answers "what happens over time?", with debounce, cancellation and retries that signals do not have. Verified on 22.2.3, <code>computed()</code> avoided the intermediate value that <code>combineLatest</code> emitted, and a search box needed RxJS to send one request for three keystrokes and cancel a stale one. The strong answer draws the line by what the thing is, and converts with <code>toSignal()</code> and <code>toObservable()</code> at the boundary; the details of that bridge are in [toSignal() and toObservable() in depth](/interview-question/explain-how-you-can-bridge-signals-and-rxjs-observables-using-tosignal-and-toobs).`,
    examples: [
      {
        label: "Signal state, RxJS for debounce and cancellation, signal back to the template",
        tech: "angular",
        runnable: true,
        code: `import { Component, computed, signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { Observable, debounceTime, distinctUntilChanged, switchMap, map, timer, startWith } from "rxjs";

const CITIES = ["London", "Lisbon", "Lima", "Lagos", "Leeds", "Paris", "Prague"];

// Pretend HTTP call: async, cancellable, takes 150ms.
function searchApi(term: string): Observable<string[]> {
  return new Observable<string[]>((sub) => {
    console.log(\`request "\${term}"\`);
    let done = false;
    const id = setTimeout(() => {
      done = true;
      sub.next(CITIES.filter((c) => c.toLowerCase().startsWith(term.toLowerCase())));
      sub.complete();
    }, 150);
    // switchMap unsubscribes (runs this) when a newer term arrives first
    return () => { if (!done) { clearTimeout(id); console.log(\`cancelled "\${term}"\`); } };
  });
}

@Component({
  selector: "app-root",
  template: \`
    <input placeholder="City" [value]="query()" (input)="query.set($any($event.target).value)" />
    <p>{{ status() }}</p>
    <ul>@for (c of results(); track c) { <li>{{ c }}</li> }</ul>
  \`,
})
export class AppComponent {
  // STATE: a signal. Synchronous, always has a value, read in the template.
  query = signal("");

  // EVENTS OVER TIME: RxJS. Debounce, drop duplicates, cancel stale requests.
  private results$ = toObservable(this.query).pipe(
    debounceTime(100),
    map((q) => q.trim()),
    distinctUntilChanged(),
    switchMap((q) => (q ? searchApi(q).pipe(startWith(null)) : [[]])),
  );

  // Back to STATE for the template.
  private raw = toSignal(this.results$, { initialValue: [] as string[] | null });
  loading = computed(() => this.raw() === null);
  results = computed(() => this.raw() ?? []);
  status = computed(() => (this.loading() ? "Searching..." : \`\${this.results().length} result(s)\`));
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do toSignal() and toObservable() bridge Signals and RxJS?",
    seoDescription:
      "toSignal subscribes to an Observable and exposes its latest value as a signal; toObservable turns a signal into an Observable via an effect.",
    description: `**Question presented to candidate:**
"A teammate has a \`BehaviorSubject\` in a service and a signal-based component, and keeps writing \`subscribe()\` calls to glue them together. Explain how \`toSignal()\` and \`toObservable()\` connect the two worlds, and what each one actually emits."

**What a strong answer should cover:**
- Both live in \`@angular/core/rxjs-interop\` and are stable (the 22.2.3 typings mark them \`@publicApi 20.0\`).
- \`toSignal(obs$)\` **subscribes immediately**, stores each value in a signal, and **unsubscribes when the injection context is destroyed**. Before the first emission the value is \`undefined\` unless you pass \`initialValue\` or \`requireSync: true\`.
- If the Observable errors, **reading the signal throws** that error; completion simply freezes the last value.
- \`toObservable(sig)\` is implemented with an **effect feeding a \`ReplaySubject(1)\`**: it emits asynchronously, **only the settled value** (several synchronous \`set()\` calls become one emission), and late subscribers get the latest value.
- Both need an **injection context** (or an \`injector\` option); \`toSignal()\` must not be called inside \`computed()\`/\`effect()\` (NG0602).
- Typical uses: \`toSignal(http$)\` or \`toSignal(route.paramMap)\` for templates; \`toObservable(query)\` to apply \`debounceTime\`/\`switchMap\`.

**Clarifying questions expected:**
- "Does the service need to stay Observable-based for other consumers, or can it expose a signal?"
- "Does the template need a value before the first emission?"

**Code / implementation expected:** Yes — an interval turned into a signal, and a signal turned into an Observable that shows which values it really emits.`,
    answer: `**Target Audience:** Angular developers who use both signals and RxJS and want to know exactly what crosses the bridge — no prior interop knowledge needed.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The emission orders below were produced on Angular 22.2.3 (AOT with <code>ngc</code>, and the playground JIT mode) in jsdom, and the "how it works inside" section is read from the 22.2.3 <code>@angular/core/rxjs-interop</code> source. A sibling question, [toSignal() and toObservable() in depth](/interview-question/explain-how-you-can-bridge-signals-and-rxjs-observables-using-tosignal-and-toobs), covers every option and an HTTP pattern; this one is about the model.

## 1. Why This Even Matters — A Story First

Imagine two offices in the same company. One works from a **whiteboard** that always shows the current numbers: anyone can walk past and read it. The other works from a **telex machine** that prints messages as they arrive: if you want the news, you stand next to it and read each message as it comes out.

Now the offices need to share. Someone has to stand at the telex and copy the latest message onto the whiteboard. And someone has to watch the whiteboard and, when it settles on a new number, send it out on the telex.

<code>toSignal()</code> is the person copying telex messages onto the whiteboard. <code>toObservable()</code> is the person watching the whiteboard and sending updates. The interesting interview details are exactly the ones a real clerk would ask about: what goes on the whiteboard before the first message arrives, what happens when a message is an error, and whether the board-watcher sends every scribble or only the final number.

## 2. The Core Idea

📌 **Interview term: RxJS interop** — the <code>@angular/core/rxjs-interop</code> entry point: <code>toSignal</code>, <code>toObservable</code>, <code>takeUntilDestroyed</code>, [<code>outputFromObservable</code>](/interview-question/explain-what-output-and-outputfromobservable-are-in-modern-angular-and-how-they-), <code>outputToObservable</code>, <code>rxResource</code> and <code>pendingUntilEvent</code>. In the 22.2.3 typings <code>toSignal</code> and <code>toObservable</code> are <code>@publicApi 20.0</code>, so stable.

📌 **Interview term: toSignal()** — [subscribes to an Observable](/interview-question/what-is-the-difference-between-observables-and-promises) (or anything with a <code>subscribe</code> method) **right away** and returns a [read-only signal holding](/interview-question/what-are-angular-signals) the latest value. The subscription ends when the surrounding [component or service is destroyed](/interview-question/what-is-a-service-and-why-use-it).

📌 **Interview term: toObservable()** — returns an Observable that emits a signal's value, first when you subscribe and then whenever the signal settles on a new value.

📌 **Interview term: Injection context** — the places where [<code>inject()</code> works](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function): constructors, field initialisers and factory functions. Both interop functions need one, because they look up a <code>DestroyRef</code> or [<code>Injector</code>](/interview-question/how-does-dependency-injection-work-in-angular) to clean up after themselves. See [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="toSignal subscribes and writes each value into a signal, toObservable runs an effect that pushes the settled signal value into a replay subject">
  <defs>
    <marker id="bridge-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="28" text-anchor="middle">toSignal(source$)</text>
  <rect class="d-box" x="30" y="44" width="180" height="60" rx="10"/>
  <text class="d-text" x="120" y="80" text-anchor="middle">Observable</text>
  <path class="d-edge-accent" d="M 214 74 L 266 74" marker-end="url(#bridge-arrow)"/>
  <rect class="d-box-muted" x="272" y="44" width="176" height="60" rx="10"/>
  <text class="d-sub" x="360" y="80" text-anchor="middle">subscribe, set on next</text>
  <path class="d-edge-accent" d="M 452 74 L 504 74" marker-end="url(#bridge-arrow)"/>
  <rect class="d-box-accent" x="510" y="44" width="180" height="60" rx="10"/>
  <text class="d-text d-accent" x="600" y="80" text-anchor="middle">Signal</text>
  <text class="d-text" x="360" y="160" text-anchor="middle">toObservable(sig)</text>
  <rect class="d-box-accent" x="30" y="176" width="180" height="60" rx="10"/>
  <text class="d-text d-accent" x="120" y="212" text-anchor="middle">Signal</text>
  <path class="d-edge-accent" d="M 214 206 L 266 206" marker-end="url(#bridge-arrow)"/>
  <rect class="d-box-muted" x="272" y="176" width="176" height="60" rx="10"/>
  <text class="d-sub" x="360" y="212" text-anchor="middle">effect reads settled value</text>
  <path class="d-edge-accent" d="M 452 206 L 504 206" marker-end="url(#bridge-arrow)"/>
  <rect class="d-box" x="510" y="176" width="180" height="60" rx="10"/>
  <text class="d-text" x="600" y="212" text-anchor="middle">ReplaySubject(1)</text>
</svg>

Each direction is a small adapter built from parts you already know: <code>toSignal()</code> is a subscription that writes into a signal, and <code>toObservable()</code> is an effect that writes into a [<code>ReplaySubject</code>](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject) with a buffer of one. Almost every behaviour below follows from that.

## 3. How It Works Inside (22.2.3 source)

Reading <code>rxjs-interop.mjs</code> in the installed package:

- **toSignal** subscribes synchronously, keeps an internal signal of <code>{ value }</code> or <code>{ error }</code>, registers <code>sub.unsubscribe</code> with the <code>DestroyRef</code>, and returns a [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) that either returns the value or **throws the stored error**. On complete it simply stops listening, so the last value stays.
- **toObservable** creates <code>new ReplaySubject(1)</code> and [an <code>effect()</code> that reads the signal](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) and calls <code>subject.next(value)</code> inside <code>untracked()</code>. When the injector is destroyed it destroys the effect and **completes** the subject. If reading the signal throws, the subject errors.

Two consequences an interviewer will like: <code>toObservable()</code> inherits **effect timing** (asynchronous, batched to the latest value), and because the subject replays one value, **a late subscriber immediately gets the current value** rather than waiting for the next change.

## 4. Verified: what toObservable really emits

In a constructor, subscribe to <code>toObservable(query)</code>, then call <code>set("b")</code>, <code>set("c")</code>, <code>set("d")</code> synchronously (two unrelated log lines removed from between them):

\`\`\`
subscribed to query$ (nothing yet?)
set b, c, d synchronously
toObservable emitted "d"

after set e + settle: toObservable emitted "e"
\`\`\`

Nothing was emitted during the constructor, not even the starting value "a", and of the four values the signal held, the Observable saw only the last one. A second experiment adds a late subscriber after the value has moved to "b":

\`\`\`
A got a
A got b
late B got b
A got c
late B got c
\`\`\`

The late subscriber got "b" straight away, from the replay buffer, and then shares later values with the first subscriber.

The example at the bottom shows the same effect on screen: clicking "+1" once and then "+1 three times" gives a count of 4, while the stream only ever saw

\`\`\`
after +1          : Seconds on page: 0count = 1+1+1 three timesvalues the Observable saw: 0, 1
after +1 three x  : Seconds on page: 0count = 4+1+1 three timesvalues the Observable saw: 0, 1, 4
about 2s later    : Seconds on page: 2count = 4+1+1 three timesvalues the Observable saw: 0, 1, 4
\`\`\`

(Root element text, so elements run together.) The values 2 and 3 never reached the Observable, and the <code>interval</code> converted with <code>toSignal()</code> ticked to 2 on its own.

## 5. Verified: what toSignal holds before, during and after

From a component that converts a plain <code>Subject</code>, a <code>BehaviorSubject</code>, <code>of(1, 2, 3)</code> and an erroring Observable:

\`\`\`
noInit=undefined withInit=-1 behav=ready ofSig=3
after subj.next(7): noInit=7 withInit=7
reading errored toSignal: http 500
\`\`\`

- Before a <code>Subject</code> emits, the signal is <code>undefined</code>, or whatever <code>initialValue</code> you gave.
- A <code>BehaviorSubject</code> or <code>of(...)</code> emits during <code>subscribe()</code>, so the signal already has a value; for <code>of(1, 2, 3)</code> it is the last one, 3.
- An Observable error is not swallowed: **reading the signal throws it**, which in a template means an error during [change detection](/interview-question/how-does-change-detection-work-in-angular). Handle errors in the pipe with <code>catchError</code> first.
- Writing to the Subject updates the signal synchronously; the template then updates on the next tick like any other signal.

## 6. Which One, When

| You have | You want | Use |
| :--- | :--- | :--- |
| <code>HttpClient</code> call, [<code>route.paramMap</code>](/interview-question/how-do-you-read-route-parameters), a store selector | A value in the template | <code>toSignal(obs$, { initialValue })</code> |
| A signal (search text, selected id) | Debounce, [<code>switchMap</code>](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap) to HTTP, retries | <code>toObservable(sig).pipe(...)</code> then <code>toSignal()</code> back |
| A signal | To feed an API that only accepts Observables | <code>toObservable(sig)</code> |
| An Observable of events (clicks, socket messages) | Every event, not just the latest | Keep it an Observable; a signal keeps only the latest value |
| A signal-driven HTTP load | Loading and error state built in | <code>rxResource()</code> or <code>httpResource()</code> (stable in v22) |

For the broader "which world should this state live in" question, see [Signals vs RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18). If a template only needs to show an Observable, the older alternative is the [async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful); <code>toSignal()</code> gives you a value you can also use in <code>computed()</code>.

## 7. Common Pitfalls

- **Expecting <code>toObservable()</code> to emit every <code>set()</code>.** It emits through an effect, so synchronous writes collapse into one emission (verified: b, c, d became "d").
- **Expecting <code>toObservable()</code> to emit synchronously on subscribe.** The first value arrives when the effect first runs, not inside <code>subscribe()</code>.
- **Calling <code>toSignal()</code> inside <code>computed()</code>.** Every call would create a new subscription, so Angular throws <code>NG0602: toSignal() cannot be called from within a reactive context.</code> (verified). Create it once, as a field, and read the signal where you need it.
- **Calling them in [<code>ngOnInit</code>](/interview-question/what-are-angular-lifecycle-hooks).** Both need an injection context; outside one you get <code>NG0203: toSignal() can only be used within an injection context...</code>. Use a field initialiser, or pass <code>{ injector }</code>.
- **Letting the source error.** The signal then throws on every read. Put <code>catchError</code> in the pipe before converting; see [catchError and fallback values](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).
- **Converting an event stream to a signal and expecting every event.** A signal keeps only the latest value, and setting an equal value notifies nobody.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they are:</strong> <span style="color:#f0e2c8;">"Two adapters in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/core/rxjs-interop</code>, stable since v20: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> turns an Observable into a signal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable()</code> turns a signal into an Observable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. toSignal mechanics:</strong> <span style="color:#f0e2c8;">"It subscribes immediately, writes each value into a signal, and unsubscribes when its injection context is destroyed. Before the first value it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> unless you give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initialValue</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireSync</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. toObservable mechanics:</strong> <span style="color:#f0e2c8;">"It is an effect feeding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReplaySubject(1)</code>, so it emits asynchronously, only the settled value, and late subscribers get the latest value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Errors and lifetime:</strong> <span style="color:#f0e2c8;">"If the source errors, reading the signal throws, so I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> first. Both need an injection context, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> is NG0602."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Typical use:</strong> <span style="color:#f0e2c8;">"Signal state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable()</code> to add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debounceTime</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> back for the template."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toObservable()</code> not emit every value I set?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is built on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code>. Effects run on Angular's schedule and see the signal's value at that moment, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set(1); set(2); set(3)</code> in one task produces one emission of 3. If you need every change, the change is an event: emit it from the code that makes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to the subscription that <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toSignal()</code> creates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is registered with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code> of the current injection context and unsubscribed when that component, directive or service is destroyed. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manualCleanup: true</code> it lives until the Observable completes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toSignal()</code> a replacement for the async pipe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly. Both subscribe and clean up for you. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> gives you a real signal, so you can derive from it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> and read it in TypeScript, and several template reads share one subscription. The async pipe still works and is fine in existing code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can several subscribers share one <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toObservable()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. There is one effect and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReplaySubject</code> per call, so every subscriber gets the same emissions, and a late subscriber starts from the replayed latest value. Verified: a subscriber added after the value became "b" received "b" immediately.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **RxJS interop** | <code>@angular/core/rxjs-interop</code>, the signal and RxJS bridge |
| **toSignal()** | Subscribe now, expose the latest value as a signal |
| **toObservable()** | Emit a signal's settled value through an effect |
| **ReplaySubject(1)** | A subject that replays its latest value to new subscribers |
| **Injection context** | Where <code>inject()</code> works: constructor, field initialiser, factory |
| **DestroyRef** | Handle that runs callbacks when the owner is destroyed |
| **NG0602** | <code>toSignal()</code> called inside a reactive context |

---
**Conclusion:** <code>toSignal()</code> and <code>toObservable()</code> are small adapters with predictable behaviour once you know what they are made of. <code>toSignal()</code> is a subscription that writes into a signal, cleans up with its owner, and rethrows errors on read. <code>toObservable()</code> is an effect feeding a <code>ReplaySubject(1)</code>, which is why, as verified on 22.2.3, it emitted only "d" for four values and handed a late subscriber the current value at once. With that model you can predict their behaviour instead of memorising it; the next step is the options and the HTTP pattern in the [in-depth sibling question](/interview-question/explain-how-you-can-bridge-signals-and-rxjs-observables-using-tosignal-and-toobs), and keeping the subscriptions you write by hand clean, covered in [avoiding subscription leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).`,
    examples: [
      {
        label: "Both directions: interval to signal, signal to Observable (only settled values)",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { interval, map, scan } from "rxjs";

@Component({
  selector: "app-root",
  template: \`
    <p>Seconds on page: {{ seconds() }}</p>
    <p>count = {{ count() }}</p>
    <button (click)="count.update(n => n + 1)">+1</button>
    <button (click)="plusThree()">+1 three times</button>
    <p>values the Observable saw: {{ seen().join(", ") }}</p>
  \`,
})
export class AppComponent {
  // Observable -> Signal: toSignal subscribes now and unsubscribes when this component is destroyed.
  seconds = toSignal(interval(1000).pipe(map((i) => i + 1)), { initialValue: 0 });

  // Signal -> Observable: toObservable uses an effect, so it emits the settled value, not every set().
  count = signal(0);
  seen = toSignal(
    toObservable(this.count).pipe(
      map((n) => String(n)),
      scan((all, n) => [...all, n], [] as string[]),
    ),
    { initialValue: [] as string[] },
  );

  plusThree() {
    this.count.update((n) => n + 1);
    this.count.update((n) => n + 1);
    this.count.update((n) => n + 1);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain how you can bridge Signals and RxJS observables using toSignal() and toObservable().",
    seoDescription:
      "The toSignal options in depth: initialValue, requireSync and NG0601, errors, injector and manualCleanup, plus the signal to HTTP to signal pattern.",
    description: `**Question presented to candidate:**
"Walk me through building a user-detail component in Angular 22 where the user id is a signal and the data comes from \`HttpClient\`. Use \`toObservable()\` and \`toSignal()\`, and tell me which \`toSignal\` options you would set and why."

**What a strong answer should cover:**
- The shape: \`toObservable(userId).pipe(switchMap(id => http.get(...)))\` then \`toSignal(...)\`, created in a **field initialiser** so it has an injection context and is cleaned up with the component.
- **\`initialValue\`** versus **\`requireSync\`**: the first gives a value (and type) before the first emission; the second asserts a synchronous first emission and throws **NG0601** if there is none. In v22 the initial value must match the Observable's type, or be \`null\`/\`undefined\`.
- **Errors**: an error in the source makes the signal throw on every read and ends the subscription, so \`catchError\` belongs **inside** the \`switchMap\`, mapping errors to a view state.
- **\`injector\`** to create either one outside an injection context, **\`manualCleanup\`** to outlive the context, \`equal\` and \`debugName\`.
- Loading state with \`startWith\`, cancellation of stale requests by \`switchMap\`, and the v22 alternative: \`httpResource()\` / \`rxResource()\`.

**Clarifying questions expected:**
- "Should the previous user stay on screen while the next one loads, or show a loading state?"
- "What should a 404 look like, versus a network failure?"

**Code / implementation expected:** Yes — the signal to HTTP to signal pipeline, with a loading, success and error view state.`,
    answer: `**Target Audience:** Developers who already know what <code>toSignal()</code> and <code>toObservable()</code> do and want to use them confidently in production code — every option is explained before it is used.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every error message, type error and output below came from compiling with <code>ngc</code> (strict templates) on Angular 22.2.3 and running in jsdom, or from a Node script against RxJS 7.8.2. For the mental model of the two functions (what they are made of, what they emit) start with the sibling question, [how toSignal() and toObservable() bridge Signals and RxJS](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 1. Why This Even Matters — A Story First

A restaurant takes orders at a counter and cooks them in a kitchen. The counter is a [**signal**](/interview-question/what-are-angular-signals): there is always a "current order number" on the screen. The kitchen is an [**Observable pipeline**](/interview-question/what-is-the-difference-between-observables-and-promises): orders arrive over time, some get cancelled because the customer changed their mind, and occasionally the kitchen burns something.

Connecting the two is easy on a quiet day. The questions that matter are the busy-day questions. What does the screen show before the first dish is ready? If a customer changes their order while the old one is cooking, does the old one still come out? If one dish is burnt, does the kitchen close for the night, or just apologise for that dish?

Those are precisely the <code>toSignal()</code> options and the placement of <code>switchMap</code> and <code>catchError</code>. Get them right and the bridge is invisible; get them wrong and the screen says <code>undefined</code>, shows yesterday's order, or stops updating after the first error.

## 2. The Options, One by One

📌 **Interview term: initialValue** — the value the signal holds until the Observable first emits. It also removes <code>undefined</code> from the signal type.

📌 **Interview term: requireSync** — a promise to Angular that the Observable emits **during subscribe** (a [<code>BehaviorSubject</code>](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject), <code>of()</code>, <code>startWith()</code>). The signal type then has no <code>undefined</code>, and if the promise is broken Angular throws <code>NG0601</code>.

📌 **Interview term: injector** — lets you call <code>toSignal()</code> or <code>toObservable()</code> outside an injection context by handing them the [<code>Injector</code>](/interview-question/how-does-dependency-injection-work-in-angular) whose <code>DestroyRef</code> should own the subscription.

📌 **Interview term: manualCleanup** — <code>toSignal()</code> does not register with any <code>DestroyRef</code>; the subscription lives until the Observable completes. Only for sources that complete on their own.

📌 **Interview term: equal / debugName** — a custom equality function (an emission equal to the current value does not notify), and a name shown in Angular DevTools.

| Option | Signal type for <code>Observable&lt;User&gt;</code> | Before first emission | If misused |
| :--- | :--- | :--- | :--- |
| none | <code>Signal&lt;User &#124; undefined&gt;</code> | <code>undefined</code> | Templates need <code>?.</code> everywhere |
| <code>initialValue: null</code> | <code>Signal&lt;User &#124; null&gt;</code> | <code>null</code> | — |
| <code>initialValue: someUser</code> | <code>Signal&lt;User&gt;</code> | <code>someUser</code> | A value of another type is a compile error |
| <code>requireSync: true</code> | <code>Signal&lt;User&gt;</code> | Not possible | <code>NG0601</code> at runtime if no sync emission |
| <code>injector</code> | unchanged | unchanged | Wrong injector, wrong lifetime (section 6) |
| <code>manualCleanup: true</code> | unchanged | unchanged | Leaks if the source never completes |

## 3. Verified: initialValue, requireSync and errors

The first example at the bottom converts a <code>Subject</code> twice (with and without <code>initialValue</code>), a <code>BehaviorSubject</code> with <code>requireSync</code>, and a failing request with and without <code>catchError</code>. Clicking each button in turn:

\`\`\`
RENDERED: no initialValue: undefinedinitialValue -1: -1requireSync on BehaviorSubject: readyerror caught in the pipe: fallback...
after next(7) : no initialValue: 7initialValue -1: 7...
requireSync   : NG0601: \`toSignal()\` called with \`requireSync\` but \`Observable\` did not emit synchronously.
read failing  : reading threw: HTTP 500
\`\`\`

(Root element text, trimmed after the first four paragraphs with "...".) The <code>requireSync</code> failure happens at the <code>toSignal()</code> call, not at the first read, so it surfaces immediately during construction. The failed request does not crash anything until something **reads** the signal; then every read throws the stored error.

**The type rule in v22.** Giving an <code>Observable&lt;number&gt;</code> a string placeholder does not compile:

\`\`\`
toSignal(of(1), { initialValue: "loading" })
error TS2769: No overload matches this call. ... Type 'string' is not assignable to type 'number'.
\`\`\`

(The ngc output abbreviated to its first and last lines.)

while <code>{ initialValue: null }</code> compiles and renders <code>1</code>. The 22.2.3 overloads accept <code>undefined</code>, <code>null</code>, or a value whose type extends the Observable's own type (<code>const U extends T</code>). For a loading state, model it in the stream type (as the second example does) rather than as a mismatched placeholder.

## 4. The Production Pattern: signal to HTTP to signal

<svg class="iq-diagram" width="100%" viewBox="0 0 740 200" role="img" aria-label="userId signal goes through toObservable, switchMap to an HTTP call with catchError and startWith inside, then toSignal produces a view state signal">
  <defs>
    <marker id="pipe-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="60" width="120" height="60" rx="10"/>
  <text class="d-text d-accent" x="80" y="95" text-anchor="middle">userId()</text>
  <path class="d-edge" d="M 144 90 L 186 90" marker-end="url(#pipe-arrow)"/>
  <rect class="d-box-muted" x="192" y="60" width="130" height="60" rx="10"/>
  <text class="d-sub" x="257" y="95" text-anchor="middle">toObservable</text>
  <path class="d-edge" d="M 326 90 L 368 90" marker-end="url(#pipe-arrow)"/>
  <rect class="d-box" x="374" y="30" width="200" height="120" rx="10"/>
  <text class="d-text" x="474" y="58" text-anchor="middle">switchMap</text>
  <text class="d-sub" x="474" y="86" text-anchor="middle">http.get(id)</text>
  <text class="d-sub" x="474" y="108" text-anchor="middle">catchError to error view</text>
  <text class="d-sub" x="474" y="130" text-anchor="middle">startWith loading</text>
  <path class="d-edge" d="M 578 90 L 620 90" marker-end="url(#pipe-arrow)"/>
  <rect class="d-box-accent" x="626" y="60" width="100" height="60" rx="10"/>
  <text class="d-text d-accent" x="676" y="95" text-anchor="middle">view()</text>
</svg>

Everything that is about **one request** (the call, its error, its loading flag) lives **inside** the <code>switchMap</code>. Everything outside it is the long-lived stream that must never die. The second example implements exactly this with <code>HttpClient</code> and a [fake backend interceptor](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-) (users 1 and 2 exist, others return 404). Driven by clicking "Next user":

\`\`\`
user 1      : Next userAda Lovelace
clicked     : Next userLoading user 2...
user 2      : Next userGrace Hopper
user 3 (404): Next userCould not load user 3
4 then 5    : Next userCould not load user 5
\`\`\`

After the 404 for user 3, the stream kept working for users 4 and 5. That only holds because <code>catchError</code> sits inside the <code>switchMap</code>. The same pipeline written both ways in plain RxJS, feeding ids 1, 3, 4 where 3 fails:

\`\`\`
catchError outside switchMap: user 1, error view, COMPLETE
catchError inside switchMap: user 1, error view, user 4
\`\`\`

With <code>catchError</code> outside, the error replaced the whole stream, which then completed: the page would never load another user. Operator choice for the inner call is discussed in [switchMap vs mergeMap vs concatMap vs exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap), and fallback values in [catchError](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).

## 5. Where the Calls May Live

Both functions [call <code>inject()</code> internally](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function), so they need an injection context. Called from [<code>ngOnInit</code>](/interview-question/what-are-angular-lifecycle-hooks) on 22.2.3:

\`\`\`
toSignal(of(1)): NG0203: toSignal() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`. Find more at https://v22.angular.dev/errors/NG0203
toObservable(sig): NG0203: toObservable() can only be used within an injection context such as a constructor, ...
\`\`\`

(The second message is truncated; it is identical apart from the function name.)

Three fixes, in order of preference:

1. **Field initialiser** (as both examples do). Simple, and the subscription is owned by the component.
2. **Pass <code>{ injector }</code>**, captured with <code>inject(Injector)</code> in a field. The first example does this for its <code>requireSync</code> button, and with it a <code>toSignal()</code> created inside a <code>setTimeout</code> worked: <code>toSignal({injector}): with injector option</code>.
3. **Wrap in <code>runInInjectionContext(injector, ...)</code>**, covered in [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

A separate guard: <code>toSignal()</code> inside [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) throws <code>NG0602</code>, because each evaluation would subscribe again.

## 6. Verified: the injector decides the lifetime

The injector you hand over is not just a key for <code>inject()</code>; its <code>DestroyRef</code> decides when the subscription ends. A child component creates two <code>toSignal()</code> subscriptions in <code>ngOnInit</code>, one with its own <code>Injector</code>, one with the <code>EnvironmentInjector</code> (the root one), and is then removed with [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir):

\`\`\`
before: {"component Injector":1,"EnvironmentInjector (root)":1}
after child destroyed: {"component Injector":0,"EnvironmentInjector (root)":1}
\`\`\`

The one bound to the root injector kept running after the component was gone: a leak that compiles, runs and looks correct. More patterns like this in [avoiding subscription leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).

## 7. toSignal Pipeline or httpResource?

| | <code>toObservable</code> + <code>switchMap</code> + <code>toSignal</code> | <code>httpResource()</code> / <code>rxResource()</code> |
| :--- | :--- | :--- |
| Status in 22.2.3 | Stable (<code>@publicApi 20.0</code>) | Stable (<code>@publicApi 22.0</code>) |
| Loading and error state | You model it (<code>startWith</code>, <code>catchError</code>) | Built in: <code>isLoading()</code>, <code>error()</code>, <code>status()</code> |
| Cancels stale requests | Yes, via <code>switchMap</code> | Yes: per the 22.2.3 typings, an in-progress load is cancelled via its <code>AbortSignal</code> when a new request arrives |
| Debounce, retry with backoff, polling, combining streams | Any RxJS operator | Needs extra plumbing |
| Best for | Complex orchestration | Simple load-when-this-signal-changes |

## 8. Common Pitfalls

- **<code>catchError</code> outside the <code>switchMap</code>.** One failed request ends the stream for good (verified: <code>COMPLETE</code> after the error).
- **Leaving errors unhandled.** The signal then throws on every read; in a template that is an error during [change detection](/interview-question/how-does-change-detection-work-in-angular).
- **<code>requireSync</code> on an HTTP call.** HTTP never emits synchronously, so it is always <code>NG0601</code>. Use <code>initialValue</code> or a <code>startWith</code> in the stream.
- **A placeholder of the wrong type.** In v22 <code>initialValue: "loading"</code> for numbers is a compile error; put loading into the stream's type.
- **Passing the root injector from a component.** The subscription then lives as long as the app (verified above).
- **<code>manualCleanup</code> on an endless source.** Nothing will ever unsubscribe it.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The pipeline:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable(userId).pipe(switchMap(id =&gt; http.get(id)))</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code>, all in a field initialiser so the component owns the subscription."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Options:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initialValue</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireSync</code> decide the type and the value before the first emission. HTTP never emits synchronously, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireSync</code> there is NG0601; I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initialValue</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startWith</code> instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Errors:</strong> <span style="color:#f0e2c8;">"An error makes the signal throw on every read, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> goes inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> and maps to an error state. Outside, one 404 ends the stream for good."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Context:</strong> <span style="color:#f0e2c8;">"Both need an injection context. Outside one I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ injector }</code>, and I make sure it is the component injector, because the injector decides when the subscription ends."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">"For a simple load-on-change, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpResource()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rxResource()</code> are stable in v22 and give me loading and error state for free."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requireSync</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the source is guaranteed to emit during subscribe: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BehaviorSubject</code>, a store selector backed by one, or a stream with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startWith</code>. It removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> from the type without inventing a placeholder, and fails fast with NG0601 if the guarantee is ever broken.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the 404 not stop later requests in your example?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> is applied to the inner HTTP Observable inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>. It replaces that one failed request with an error view state and completes it, while the outer stream from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable</code> keeps going.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">switchMap</code> help with fast clicks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a new id arrives it unsubscribes from the request still in flight, so an older, slower response can never overwrite a newer one. With the real HttpClient backends, unsubscribing also cancels the underlying request; the demo here uses a fake backend, so that part was not exercised.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">manualCleanup</code> do and when is it safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It skips registering with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>, so the subscription survives its creator. It is safe only for sources that complete by themselves, such as a single HTTP call; on an endless stream it is a leak.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might you prefer <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">httpResource()</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It takes a reactive URL function and tracks loading, error and value as signals; the 22.2.3 typings say resources cancel an in-progress load via its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortSignal</code> when a new request becomes available. You keep the RxJS pipeline when you need operators it does not have, such as debounce or retry with backoff.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **initialValue** | Value and type of the signal before the first emission |
| **requireSync** | Assert a synchronous first emission; otherwise NG0601 |
| **NG0601** | <code>requireSync</code> was set but nothing emitted synchronously |
| **NG0602** | <code>toSignal()</code> called inside a reactive context |
| **injector option** | Supplies the context, and therefore the lifetime |
| **manualCleanup** | Do not unsubscribe on destroy; wait for completion |
| **View state** | One union type for loading, success and error |
| **httpResource()** | Signal-driven HTTP loading with built-in status, stable in v22 |

---
**Conclusion:** The bridge is two calls, but production code is decided by the details around them. Verified on 22.2.3: <code>requireSync</code> on a non-synchronous source throws NG0601 at creation, a failed source makes the signal throw on read, an <code>initialValue</code> of the wrong type no longer compiles, <code>catchError</code> inside the <code>switchMap</code> is what lets the page survive a 404, and the injector you pass decides whether the subscription dies with the component or leaks into the app. Get those right, or use <code>httpResource()</code> when the job is a simple load, and the signal you hand the template is always defined, always current and always cleaned up. For choosing between the two worlds in the first place, see [Signals vs RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18).`,
    examples: [
      {
        label: "toSignal options lab: initialValue, requireSync, NG0601 and errors",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injector, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { BehaviorSubject, Observable, Subject, catchError, of } from "rxjs";

const failingHttp = () => new Observable<string>((sub) => sub.error(new Error("HTTP 500")));

@Component({
  selector: "app-root",
  template: \`
    <p>no initialValue: {{ plain() ?? "undefined" }}</p>
    <p>initialValue -1: {{ withInitial() }}</p>
    <p>requireSync on BehaviorSubject: {{ fromBehavior() }}</p>
    <p>error caught in the pipe: {{ safe() }}</p>
    <button (click)="push()">subject.next(7)</button>
    <button (click)="tryRequireSync()">requireSync on a Subject</button>
    <button (click)="readFailing()">read a failed toSignal</button>
    <p>{{ message() }}</p>
  \`,
})
export class AppComponent {
  private injector = inject(Injector);
  private subject = new Subject<number>();

  plain = toSignal(this.subject);                                   // Signal<number | undefined>
  withInitial = toSignal(this.subject, { initialValue: -1 });       // Signal<number>
  fromBehavior = toSignal(new BehaviorSubject("ready"), { requireSync: true }); // Signal<string>, no undefined
  failing = toSignal(failingHttp(), { initialValue: "n/a" });
  safe = toSignal(failingHttp().pipe(catchError(() => of("fallback"))), { initialValue: "" });
  message = signal("");

  push() { this.subject.next(7); }

  tryRequireSync() {
    try {
      // Outside the constructor, so the injector is passed explicitly.
      toSignal(new Subject<number>(), { requireSync: true, injector: this.injector });
    } catch (e: any) { this.message.set(e.message); }
  }

  readFailing() {
    try { this.failing(); } catch (e: any) { this.message.set(\`reading threw: \${e.message}\`); }
  }
}`,
      },
      {
        label: "userId signal to HttpClient with switchMap and back to a view-state signal",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { catchError, delay, map, of, startWith, switchMap, throwError, timer } from "rxjs";

type User = { id: number; name: string };
type View = { state: "loading" } | { state: "ok"; user: User } | { state: "error"; message: string };

@Injectable({ providedIn: "root" })
export class UserApi {
  private http = inject(HttpClient);
  get(id: number) { return this.http.get<User>(\`/api/users/\${id}\`); }
}

@Component({
  selector: "app-root",
  template: \`
    <button (click)="userId.update(id => id + 1)">Next user</button>
    @switch (view().state) {
      @case ("loading") { <p>Loading user {{ userId() }}...</p> }
      @case ("ok") { <p>{{ name() }}</p> }
      @case ("error") { <p>Could not load user {{ userId() }}</p> }
    }
  \`,
})
export class AppComponent {
  private api = inject(UserApi);
  userId = signal(1);

  // signal -> observable -> HTTP -> observable -> signal, all in the field initialiser (an injection context)
  view = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) =>
        this.api.get(id).pipe(
          map((user): View => ({ state: "ok", user })),
          catchError((e) => of<View>({ state: "error", message: e.message })), // keep the outer stream alive
          startWith<View>({ state: "loading" }),
        ),
      ),
    ),
    { initialValue: { state: "loading" } as View },
  );
  name = computed(() => { const v = this.view(); return v.state === "ok" ? v.user.name : ""; });
}

// Fake backend for the demo: users 1 and 2 exist, anything else is a 404.
const fakeBackend: HttpInterceptorFn = (req) => {
  const id = Number(req.url.split("/").pop());
  const users: Record<number, string> = { 1: "Ada Lovelace", 2: "Grace Hopper" };
  if (!users[id]) return timer(20).pipe(switchMap(() => throwError(() => new HttpErrorResponse({ status: 404, url: req.url }))));
  return of(new HttpResponse({ status: 200, body: { id, name: users[id] } })).pipe(delay(20));
};
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([fakeBackend]))],
};`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is runInInjectionContext and when do you need to use it?",
    seoDescription:
      "runInInjectionContext(injector, fn) lets inject(), toSignal(), effect() and takeUntilDestroyed() run outside a constructor. NG0203 and the fix.",
    description: `**Question presented to candidate:**
"A developer moved a \`toSignal()\` call from a field into a click handler and the app now throws NG0203. Explain what an injection context is, what \`runInInjectionContext\` does, and when you would reach for it instead of restructuring the code."

**What a strong answer should cover:**
- An **injection context** is the synchronous window in which \`inject()\` knows which injector to use: constructors, field initialisers, factory functions (\`useFactory\`, \`providedIn\` factories), functional guards, resolvers and interceptors.
- \`inject()\`, \`toSignal()\`, \`toObservable()\`, \`effect()\`, \`takeUntilDestroyed()\` and custom \`injectX()\` helpers all require one; outside it they throw **NG0203**.
- \`runInInjectionContext(injector, fn)\` runs \`fn\` **synchronously** as if inside that injector's context; it does not survive a \`setTimeout\` or an \`await\` inside \`fn\`.
- The **injector you pass decides lifetime**: a component's \`Injector\` cleans up with the component; an \`EnvironmentInjector\` (root) lives with the app.
- Prefer alternatives first: move the call to a field, or pass \`{ injector }\` / a \`DestroyRef\` to APIs that accept it. Use \`runInInjectionContext\` for library code, dynamic setup, and tests (\`TestBed.runInInjectionContext\`).
- \`assertInInjectionContext(fn)\` to give your own helpers the same clear error.

**Clarifying questions expected:**
- "Does the work really have to start in the handler, or could it be created up front and triggered later?"
- "Should what it creates live as long as the component, or as long as the app?"

**Code / implementation expected:** Yes — an \`injectX()\` helper that fails from a click handler with NG0203 and works through \`runInInjectionContext\`.`,
    answer: `**Target Audience:** Developers who use <code>inject()</code> and the signal or RxJS interop APIs and have met NG0203 — explains dependency injection context from first principles.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every error message and output below was produced on Angular 22.2.3: components compiled with <code>ngc</code> and run in jsdom, guards, resolvers and interceptors booted with a real <code>appConfig</code>, and the testing claims from a <code>TestBed</code> script.

## 1. Why This Even Matters — A Story First

A hotel gives each guest a key card. While you are standing at the front desk, checking in, the receptionist can hand you anything you ask for: a map, a towel, a parking pass. The desk knows who you are and which room you belong to.

Once you walk away, you cannot shout "towel!" from the lift and expect one to appear. Nobody knows which guest is asking. You would have to go back to the desk, or phone it and say "this is room 412".

In Angular the front desk is the **injection context**: the short moment, while a class or factory is being created, when <code>inject()</code> knows which injector to ask. A click handler, a <code>setTimeout</code> or the code after an <code>await</code> is the lift. <code>runInInjectionContext(injector, fn)</code> is the phone call that says "this is room 412": it lets code that runs later borrow a specific injector's context for one synchronous call.

## 2. The Core Idea

📌 **Interview term: Injector** — the object that creates and hands out dependencies. Angular has a tree of them: the environment (root) injector, route injectors, and an element injector per component. See [how dependency injection works](/interview-question/how-does-dependency-injection-work-in-angular).

📌 **Interview term: Injection context** — a stretch of synchronous code during which <code>inject()</code> has a current injector. Angular sets one up while it runs a constructor, field initialisers, provider factories, and functional guards, [resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) and [interceptors](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-).

📌 **Interview term: runInInjectionContext(injector, fn)** — runs <code>fn</code> immediately, with <code>injector</code> as the current injector, and returns what <code>fn</code> returns. The 22.2.3 typings add the key restriction: "inject is only usable synchronously, and cannot be used in any asynchronous callbacks or after any await points."

📌 **Interview term: assertInInjectionContext(fn)** — throws the standard NG0203 error, naming <code>fn</code>, if called outside a context. Use it at the top of your own <code>injectSomething()</code> helpers.

📌 **Interview term: NG0203** — the error code for "this needed an injection context and did not have one".

## 3. Verified: where you are and are not in a context

Inside the context, <code>inject()</code> worked in all of these, booted with a real config:

\`\`\`
useFactory value: factory saw abc
resolver inject: abc
interceptor inject: abc
guard inject ok: true
\`\`\`

Called from [<code>ngOnInit</code>](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit) instead (which runs later, outside the constructor), every API that depends on a context failed with the same code:

\`\`\`
inject(Api): NG0203: The \`Api\` token injection failed. \`inject()\` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`. Find more at https://v22.angular.dev/errors/NG0203
toSignal(of(1)): NG0203: toSignal() can only be used within an injection context such as ...
toObservable(sig): NG0203: toObservable() can only be used within an injection context such as ...
effect(...): NG0203: effect() can only be used within an injection context such as ...
takeUntilDestroyed(): NG0203: takeUntilDestroyed() can only be used within an injection context such as ...
injectApi(): NG0203: injectApi() can only be used within an injection context such as ...
\`\`\`

(Messages after the first truncated; they end the same way.) The last line is a custom helper with <code>assertInInjectionContext(injectApi)</code> as its first statement, which is why it gets a message naming it rather than a confusing one about whatever it injects. The same is true inside a functional guard once you leave it: a <code>setTimeout</code> callback in the guard printed <code>guard setTimeout: NG0203: The \`Auth\` token injec</code> (cut short by the experiment).

## 4. The Context Is Synchronous

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Timeline: the constructor and field initialisers are inside the injection context, ngOnInit, event handlers, timers and code after await are outside, and runInInjectionContext opens a temporary context">
  <defs>
    <marker id="ric-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 20 60 L 700 60" marker-end="url(#ric-arrow)"/>
  <rect class="d-box-accent" x="20" y="84" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="115" y="108" text-anchor="middle">constructor and</text>
  <text class="d-text d-accent" x="115" y="128" text-anchor="middle">field initialisers</text>
  <rect class="d-box-muted" x="260" y="84" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="108" text-anchor="middle">ngOnInit, handlers,</text>
  <text class="d-text" x="360" y="128" text-anchor="middle">timers, after await</text>
  <rect class="d-box-accent" x="510" y="84" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="605" y="108" text-anchor="middle">runInInjectionContext</text>
  <text class="d-sub" x="605" y="128" text-anchor="middle">sync body only</text>
  <text class="d-sub" x="115" y="40" text-anchor="middle">inject works</text>
  <text class="d-sub" x="360" y="40" text-anchor="middle">NG0203</text>
  <text class="d-sub" x="605" y="40" text-anchor="middle">inject works again</text>
  <path class="d-edge-dashed" d="M 605 144 L 605 190" marker-end="url(#ric-arrow)"/>
  <rect class="d-box-muted" x="510" y="194" width="190" height="30" rx="8"/>
  <text class="d-sub" x="605" y="214" text-anchor="middle">after await: NG0203</text>
</svg>

The context exists only while Angular (or <code>runInInjectionContext</code>) is on the call stack. That is why the same experiment, run from a <code>setTimeout</code>, shows both halves of the rule (the experiment cuts each message short with <code>slice()</code>; output from the playground mode, where class names are not prefixed by the bundler):

\`\`\`
setTimeout inject: NG0203: The \`Api\` token injection failed. \`inject()\` functio
runInInjectionContext inject: Api
runInInjectionContext toSignal: from toSignal
DestroyRef available: true
toSignal({injector}): with injector option
after await: NG0203: The \`Api\` token injection failed
effect({injector}) ran: done
\`\`\`

Inside <code>runInInjectionContext</code>, <code>inject()</code>, [<code>toSignal()</code>](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs) and <code>inject(DestroyRef)</code> all worked. But an <code>async</code> function passed to it lost the context at its first <code>await</code>: the second <code>inject()</code> failed. If you need something after an <code>await</code>, inject it before.

## 5. Verified: the example

The example at the bottom has an <code>injectUptime()</code> helper that calls <code>assertInInjectionContext</code>, injects a [<code>Clock</code> service](/interview-question/what-is-a-service-and-why-use-it), and returns <code>toSignal()</code> of its ticks. Clicking the first button calls it straight from the handler; the second wraps it in <code>runInInjectionContext(this.injector, ...)</code>, where <code>this.injector</code> was captured with <code>inject(Injector)</code> in a field:

\`\`\`
RENDERED: Start timer (no context)Start timer (runInInjectionContext)Not started
wrong : NG0203: injectUptime() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`
right : Start timer (no context)Start timer (runInInjectionContext)Started inside runInInjectionContextticks: 2
\`\`\`

(Root element text, so elements run together.) Same output in AOT and in the playground.

## 6. Verified: the injector you pass is the lifetime you get

<code>runInInjectionContext</code> does not only satisfy <code>inject()</code>; APIs inside it register cleanup with that injector's <code>DestroyRef</code>. A child component ran <code>toSignal()</code> twice from <code>ngOnInit</code>, once in its own <code>Injector</code> and once in the <code>EnvironmentInjector</code>, then was removed:

\`\`\`
before: {"component Injector":1,"EnvironmentInjector (root)":1}
after child destroyed: {"component Injector":0,"EnvironmentInjector (root)":1}
\`\`\`

Inject <code>Injector</code> (the component's element injector) when the work belongs to the component; use the environment injector only for work that should outlive it.

## 7. When to Reach for It, and When Not

| Situation | Best tool |
| :--- | :--- |
| You can create the thing up front | A field initialiser. No API needed |
| An API accepts an injector or DestroyRef | Pass it: <code>toSignal(x, { injector })</code>, <code>effect(fn, { injector })</code>, <code>takeUntilDestroyed(destroyRef)</code> |
| Calling a helper built on <code>inject()</code> later (a lazily created feature, a plugin system, a dynamic form) | <code>runInInjectionContext(injector, () => injectX())</code> |
| Library code that receives an injector from the caller | <code>runInInjectionContext(injector, ...)</code> |
| Unit testing an <code>injectX()</code> helper or a functional guard | <code>TestBed.runInInjectionContext(() => ...)</code> |
| Something async needs a dependency | Inject it first, then use it in the callback |

[Testing, verified with <code>TestBed</code>](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed) on 22.2.3:

\`\`\`
outside: NG0203: The \`Clock\` token injection failed. \`inject()\` function must b
TestBed.runInInjectionContext: time is 12:00
toSignal in TestBed context: 42
\`\`\`

This is how functional guards and interceptors are usually unit tested; see [functional route guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards) and [the inject() function](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function).

## 8. Common Pitfalls

- **Expecting the context to survive <code>await</code>.** It does not, even inside <code>runInInjectionContext</code> (verified). Inject everything before the first <code>await</code>.
- **Passing the root injector from a component.** Subscriptions and effects then live for the whole app (verified above).
- **Using it to paper over design.** If a <code>toSignal()</code> can be a field, make it a field; <code>runInInjectionContext</code> in every handler hides the lifetime.
- **Forgetting it is synchronous and immediate.** It is not a scheduler; <code>fn</code> runs right now and its return value comes straight back.
- **Writing <code>injectX()</code> helpers without <code>assertInInjectionContext</code>.** Callers then get an error about some token deep inside instead of one naming your helper.
- **Reaching for it in <code>ngOnInit</code> just to read inputs.** Fields are created before inputs are set, but [signal inputs are signals](/interview-question/what-are-angular-signals): create the [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) or <code>toObservable()</code> in a field and it will read the input later. See [signal inputs and model()](/interview-question/what-are-signal-inputs-and-model-in-modern-angular).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define the context:</strong> <span style="color:#f0e2c8;">"An injection context is the synchronous window where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> knows its injector: constructors, field initialisers, provider factories, and functional guards, resolvers and interceptors."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Who needs it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>, and everything built on it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toObservable()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> and custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injectX()</code> helpers. Outside it they throw NG0203."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What the function does:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runInInjectionContext(injector, fn)</code> runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn</code> right now as if inside that injector. It is synchronous: after an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn</code>, the context is gone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lifetime:</strong> <span style="color:#f0e2c8;">"The injector decides cleanup. A component injector stops the subscription when the component is destroyed; the environment injector keeps it for the life of the app."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When:</strong> <span style="color:#f0e2c8;">"Last resort in app code; first choice in library code and tests, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.runInInjectionContext</code>. Usually a field initialiser or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injector</code> option is simpler."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngOnInit</code> not an injection context when the constructor is?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The context exists only while Angular is creating the instance. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> is called later, during change detection, when no injector is set as current. The constructor and field initialisers run inside the factory call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get an injector to pass in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(Injector)</code> in a field gives the component element injector, which is usually what you want. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(EnvironmentInjector)</code> gives the environment one, for work that should not end with the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">assertInInjectionContext</code> add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A clear error at the start of your helper: NG0203 naming the helper, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injectUptime() can only be used within an injection context</code>. Without it the failure surfaces from whatever the helper injects first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a function that calls <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Configure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed</code> with the providers or mocks, then call it inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.runInInjectionContext(() =&gt; fn())</code>. It returns the function result, so you can assert on it directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">runInInjectionContext</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Injector.get</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injector.get(Token)</code> fetches one dependency. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runInInjectionContext</code> makes the injector current, so any code inside it, including library helpers you did not write, can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> and register cleanup.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Injector** | Creates and hands out dependencies; arranged in a tree |
| **Injection context** | Synchronous window where <code>inject()</code> has a current injector |
| **runInInjectionContext** | Run a function now, with a given injector as current |
| **assertInInjectionContext** | Throw NG0203 naming your helper when called out of context |
| **NG0203** | Needed an injection context and had none |
| **DestroyRef** | The injector-owned hook that runs cleanup on destroy |
| **EnvironmentInjector** | The app-level injector; lives as long as the app |
| **TestBed.runInInjectionContext** | The testing version, using the TestBed injector |

---
**Conclusion:** An injection context is not a place in your code but a moment: the synchronous call during which Angular has an injector on the stack. <code>inject()</code> and everything built on it (<code>toSignal()</code>, [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it), <code>takeUntilDestroyed()</code>, your own <code>injectX()</code> helpers) needs that moment, and outside it you get NG0203, as verified for each of them on 22.2.3. <code>runInInjectionContext(injector, fn)</code> recreates the moment on demand, synchronously only, and with the lifetime of whichever injector you pass. Use it deliberately, prefer a field or an <code>injector</code> option when you can, and for the bigger picture of when to use <code>inject()</code> at all see [inject() vs constructor injection](/interview-question/inject-vs-constructor-injection-when-should-you-use-each).`,
    examples: [
      {
        label: "Calling an inject helper from a click handler: NG0203, then fixed with runInInjectionContext",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, Injector, Signal, assertInInjectionContext, inject, runInInjectionContext, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { interval, map } from "rxjs";

@Injectable({ providedIn: "root" })
export class Clock {
  ticks = interval(500).pipe(map((i) => i + 1));
}

// A reusable "inject function": only valid where inject() is valid.
export function injectUptime(): Signal<number> {
  assertInInjectionContext(injectUptime);
  return toSignal(inject(Clock).ticks, { initialValue: 0 });
}

@Component({
  selector: "app-root",
  template: \`
    <button (click)="startWrong()">Start timer (no context)</button>
    <button (click)="startRight()">Start timer (runInInjectionContext)</button>
    <p>{{ message() }}</p>
    @if (uptime(); as up) { <p>ticks: {{ up() }}</p> }
  \`,
})
export class AppComponent {
  private injector = inject(Injector); // capture the injector while we are still in context
  message = signal("Not started");
  uptime = signal<Signal<number> | null>(null);

  startWrong() {
    try {
      this.uptime.set(injectUptime()); // a click handler is NOT an injection context
    } catch (e: any) {
      this.message.set(e.message.split(".")[0]);
    }
  }

  startRight() {
    // Re-enter this component's injection context, so inject(), toSignal() and the
    // DestroyRef cleanup all work, and the subscription ends when the component does.
    this.uptime.set(runInInjectionContext(this.injector, () => injectUptime()));
    this.message.set("Started inside runInInjectionContext");
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between Observables and Promises?",
    seoDescription:
      "A Promise is eager, settles once and cannot be cancelled; an Observable is lazy, can emit many values and is cancelled by unsubscribing. Verified ordering.",
    description: `**Question presented to candidate:**
"Angular's \`HttpClient\` returns an Observable, while \`fetch\` returns a Promise. What is actually different between the two, and why did Angular choose Observables?"

**What a strong answer should cover:**
- **Eager vs lazy:** a Promise starts its work when it is created; an Observable does nothing until it is subscribed, and runs again **for every subscriber** (cold).
- **One value vs many:** a Promise settles once (later \`resolve\` calls are ignored); an Observable can emit zero, one or many values, then complete or error.
- **Timing:** \`then\` callbacks are always asynchronous (microtasks); an Observable can emit synchronously during \`subscribe()\`.
- **Cancellation:** unsubscribing runs the producer's teardown (clears timers, aborts requests); a Promise cannot be cancelled.
- **Operators:** RxJS gives \`map\`, \`switchMap\`, \`retry\`, \`debounceTime\`, combination; Promises have \`then\`, \`Promise.all\`/\`race\`/\`allSettled\`/\`any\`.
- Conversion: \`from(promise)\`, \`defer(() => promise)\` for laziness, \`firstValueFrom\`/\`lastValueFrom\` back (with \`EmptyError\` on an empty stream).

**Clarifying questions expected:**
- "Do you want the conceptual comparison, or how it affects HttpClient code in components?"
- "Is the team mixing \`async\`/\`await\` with Observables today?"

**Code / implementation expected:** Optional — a small snippet showing eager vs lazy execution and cancelling a stream.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview who has used <code>async</code>/<code>await</code> — assumes basic JavaScript, no RxJS required.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every ordering claim below was produced by running a Node script against RxJS 7.8.2, and the component example was compiled with <code>ngc</code> on Angular 22.2.3 and clicked in jsdom. Execution order is the topic most often answered confidently and wrongly, so nothing here is from memory.

## 1. Why This Even Matters — A Story First

You order a pizza by phone. The moment you hang up, the kitchen starts cooking, whether or not you are home. Exactly one pizza arrives (or one apology call saying they are out of dough). You cannot "un-order" it: the oven is already on. That is a **Promise**.

Now you subscribe to a weekly vegetable box. Nothing is grown or packed until you sign up. Once you do, a box arrives every week, for as long as you stay subscribed, and when you cancel, the deliveries stop and the farm stops packing for you. If your neighbour signs up too, the farm packs a second box for them. That is an **Observable**.

Both deal with "something that arrives later". The difference is when the work starts, how many things arrive, and whether you can stop it. Angular's <code>HttpClient</code> returns the vegetable box, which surprises people who expect a pizza.

## 2. The Core Idea

📌 **Interview term: Promise** — a placeholder for **one** future value or error. Its work starts immediately when it is created (eager), it settles **once**, and its <code>then</code> callbacks always run asynchronously as microtasks.

📌 **Interview term: Observable** — a description of a stream that produces **zero or more** values over time and then completes or errors. Nothing happens until <code>subscribe()</code> (lazy), and each subscriber gets its own run of the producer (cold).

📌 **Interview term: Eager vs lazy** — eager work starts when the object is created; lazy work starts when someone asks for the result.

📌 **Interview term: Cold vs hot** — a cold Observable runs its producer separately for each subscriber (an HTTP call per subscription). A hot one shares a single producer that runs regardless of subscribers (a <code>Subject</code>, DOM events). See [Subject, BehaviorSubject and ReplaySubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject).

📌 **Interview term: Teardown** — the function an Observable producer returns. Unsubscribing runs it, which is how timers are cleared and requests aborted.

## 3. Verified: the five differences, one script

**1. Eager vs lazy, and sync vs async.** Create both, then subscribe and call <code>then</code>:

\`\`\`
--- 1. eager vs lazy
promise executor runs
both created
observable producer runs
observable value O
end of sync code
promise value P
\`\`\`

The Promise executor ran at construction, before "both created". The Observable producer ran only at <code>subscribe()</code>, and emitted **synchronously**, before "end of sync code". The Promise value arrived **after** all synchronous code, even though it was resolved immediately.

**2. One value vs many.**

\`\`\`
--- 2. one value vs many
observable got 1
observable got 2
observable got 3
promise got 1
\`\`\`

The Promise called <code>resolve(1)</code>, <code>resolve(2)</code>, <code>resolve(3)</code>; only the first counted. (The Observable lines print first because they are synchronous; the <code>then</code> waits for a microtask.)

**3. Sharing.** Two subscribers, two <code>then</code> calls:

\`\`\`
--- 3. sharing: each subscribe re-runs the producer
sub A response #1
sub B response #2
then A response #1
then B response #1
producer calls: observable=2 promise=1
\`\`\`

Every <code>subscribe()</code> on a cold Observable runs the producer again. With <code>HttpClient</code> that means **one HTTP request per subscription**, which is why <code>shareReplay</code> exists; see [shareReplay and duplicate requests](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ).

**4. Cancellation.**

\`\`\`
--- 4. cancellation
tick 1
tick 2
tick 3
teardown: interval cleared
promise timer still fired: true (no way to cancel it)
\`\`\`

Unsubscribing ran the teardown and stopped the interval. The Promise's timer fired anyway: you can ignore a Promise's result, but not stop its work.

**5. Errors.**

\`\`\`
--- 5. errors
subscribe returned normally
throw inside next() -> NOT the error callback, reported async as uncaught: x
observable error callback: boom
promise catch: boom
\`\`\`

Both report producer errors to a handler (<code>error</code> callback / <code>catch</code>). The surprise: an exception thrown **inside your own <code>next</code> callback** does not go to the <code>error</code> callback. RxJS reports it asynchronously as an unhandled error, and in Node that crashed the process until a handler was added.

## 4. Side by Side

| | Promise | Observable |
| :--- | :--- | :--- |
| Starts work | When created (eager) | On <code>subscribe()</code> (lazy) |
| Values | Exactly one (or an error) | Zero, one or many, then complete or error |
| Delivery | Always async (microtask) | Sync or async, depending on the producer |
| Multiple consumers | Share one result | Cold: each subscriber re-runs the producer |
| Cancel | Not possible | <code>unsubscribe()</code> runs teardown |
| Composition | <code>then</code>, <code>Promise.all</code>, <code>race</code>, <code>allSettled</code>, <code>any</code> | 100+ operators: <code>map</code>, <code>switchMap</code>, <code>retry</code>, <code>debounceTime</code>... |
| Built into the language | Yes, with <code>async</code>/<code>await</code> | No, a library (RxJS) |
| In Angular | <code>fetch</code>, dynamic <code>import()</code>, [router](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) navigation results | <code>HttpClient</code>, router events, [form <code>valueChanges</code>](/interview-question/what-is-the-difference-between-reactive-and-template-driven-forms), outputs |

## 5. Verified: the component example

The example at the bottom walks through the same ideas on screen. Clicking the buttons in order:

\`\`\`
after 1:
1. promise: executor ran
2. both created
after 2:
...
3. observable: producer ran
4. subscribe -> O1 (sync here)
5. subscribe -> O2 (sync here)
6. end of click handler
7. then -> P (always async)
after 3, 4, convert:
...
8. tick 1
9. tick 2
10. teardown: interval cleared
11. firstValueFrom(from(promise)) = 42
\`\`\`

(Earlier lines repeated in each block are replaced by "...".) Same output in AOT and the playground mode.

## 6. Converting Between Them

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Conversions: from and defer turn a Promise into an Observable, firstValueFrom and lastValueFrom turn an Observable into a Promise">
  <defs>
    <marker id="pvo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="70" width="180" height="80" rx="12"/>
  <text class="d-text" x="120" y="105" text-anchor="middle">Promise</text>
  <text class="d-sub" x="120" y="128" text-anchor="middle">one value, eager</text>
  <rect class="d-box-accent" x="490" y="70" width="180" height="80" rx="12"/>
  <text class="d-text d-accent" x="580" y="105" text-anchor="middle">Observable</text>
  <text class="d-sub" x="580" y="128" text-anchor="middle">many values, lazy</text>
  <path class="d-edge-accent" d="M 214 90 L 486 90" marker-end="url(#pvo-arrow)"/>
  <text class="d-sub" x="350" y="74" text-anchor="middle">from(p), defer(() =&gt; p)</text>
  <path class="d-edge-accent" d="M 486 132 L 214 132" marker-end="url(#pvo-arrow)"/>
  <text class="d-sub" x="350" y="160" text-anchor="middle">firstValueFrom, lastValueFrom</text>
</svg>

Converting a Promise gives an Observable that emits once and completes. <code>from(promise)</code> wraps a Promise that has already started; <code>defer(() => fetchSomething())</code> waits until subscribe to create it, restoring laziness. Going the other way, <code>firstValueFrom</code> resolves on the first value and <code>lastValueFrom</code> on completion:

\`\`\`
firstValueFrom: 1 lastValueFrom: 3
defer created
defer factory runs
from promise
deferred
lastValueFrom of empty: EmptyError no elements in sequence
\`\`\`

<code>lastValueFrom</code> on an Observable that completes without a value rejects with <code>EmptyError</code>, and on one that never completes (an interval, a store) it never resolves at all. The old <code>toPromise()</code> is deprecated in RxJS 7 in favour of these two.

## 7. What This Means in Angular Code

- **HttpClient calls do nothing until subscribed.** Calling <code>this.http.post(...)</code> without subscribing (or the async pipe, or <code>toSignal()</code>) sends no request.
- **Each subscription is a request.** Two <code>| async</code> pipes on the same <code>user$</code> make two calls; see [the async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful).
- **Cancellation is free.** <code>switchMap</code> unsubscribes from a stale request when a new one starts; with Promises you would need an <code>AbortController</code> and manual bookkeeping. See [switchMap vs mergeMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).
- **<code>await</code> is still fine for one-shot work.** <code>await firstValueFrom(this.http.get(url))</code> in [a resolver](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) or a click handler is readable and correct, as long as the source completes.
- **Long-lived subscriptions need cleanup.** A Promise finishes by itself; an Observable that never completes keeps running until unsubscribed. See [avoiding subscription leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).

## 8. Common Pitfalls

- **"Observables are just Promises with more values."** They are also lazy, cold and cancellable; those three properties are what matter in Angular.
- **Forgetting to subscribe.** A save button that calls <code>http.post()</code> without subscribing silently sends nothing.
- **Subscribing twice by accident.** Two subscriptions to a cold HTTP Observable are two requests (verified: <code>observable=2 promise=1</code>).
- **<code>lastValueFrom</code> on an endless stream.** It never resolves; use <code>firstValueFrom</code> or <code>take(1)</code>. See [take(1) vs first()](/interview-question/what-is-the-difference-between-take-1-and-first-operators-in-rxjs).
- **Assuming Observable callbacks are async.** <code>of(1)</code> emits during <code>subscribe()</code>; code after it runs later, not earlier.
- **Throwing inside <code>next</code> and expecting the <code>error</code> callback to catch it.** It is reported as an unhandled error instead.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A Promise is one future value whose work has already started; an Observable is a lazy stream of zero or more values that starts on subscribe and can be cancelled."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Eager vs lazy:</strong> <span style="color:#f0e2c8;">"The Promise executor runs at construction. The Observable producer runs per <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe()</code>, so a cold HTTP Observable makes one request per subscriber."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Timing:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code> is always a microtask, even for a resolved Promise. An Observable can emit synchronously, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">of(1)</code> does inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cancellation:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsubscribe()</code> runs the teardown, which is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> aborts stale HTTP requests. A Promise cannot be cancelled, only ignored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why Angular uses them:</strong> <span style="color:#f0e2c8;">"Operators for retry, debounce and cancellation, multiple values for events and progress, and laziness. For one-shot work I can still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await firstValueFrom(...)</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HttpClient</code> return an Observable when it only emits once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Laziness and cancellation. Nothing is sent until you subscribe, unsubscribing aborts the request, and operators like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> compose naturally. It can also emit progress events when you ask for them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">from(promise)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defer(() =&gt; promise)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from</code> wraps a Promise that already exists, so its work has already started. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defer</code> calls the factory on each subscribe, so the work starts lazily and is repeated per subscriber. Verified: "defer factory runs" printed only after subscribe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">firstValueFrom</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lastValueFrom</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">firstValueFrom</code> for anything that may not complete, such as a store or a BehaviorSubject: it resolves on the first value and unsubscribes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastValueFrom</code> waits for completion and rejects with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EmptyError</code> if nothing was emitted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are all Observables async?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">of()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from([1, 2])</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BehaviorSubject</code> emit synchronously during <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe()</code>. Timers, HTTP and events are async. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal(..., { requireSync: true })</code> works for a BehaviorSubject but not for HTTP.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a hot Observable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One whose producer runs independently of subscribers and is shared, such as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Subject</code>, DOM events or a websocket. Subscribers only see values emitted after they subscribe, unless it replays.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Promise** | One future value or error; eager; always async |
| **Observable** | Lazy stream of zero or more values over time |
| **Eager vs lazy** | Starts on creation vs starts on request |
| **Cold vs hot** | Producer per subscriber vs one shared producer |
| **Teardown** | Cleanup function run on unsubscribe or completion |
| **Microtask** | Queue that runs right after the current synchronous code; where <code>then</code> callbacks go |
| **from / defer** | Promise to Observable, eagerly or lazily |
| **firstValueFrom / lastValueFrom** | Observable to Promise, on first value or on completion |
| **EmptyError** | Rejection when a stream completes without any value |

---
**Conclusion:** Promises and Observables both model "later", but differently. Verified with RxJS 7.8.2: the Promise executor ran at construction while the Observable producer waited for <code>subscribe()</code> and then emitted synchronously; the Promise kept only the first of three values; two subscriptions ran the producer twice; and <code>unsubscribe()</code> stopped an interval that a Promise could not have stopped. Those properties, laziness, multiple values and cancellation, are why Angular's <code>HttpClient</code>, router and forms speak Observable, and why <code>firstValueFrom</code> exists for the moments when one awaited value is all you need. For turning an Observable into [template state](/interview-question/what-are-angular-signals), see [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).`,
    examples: [
      {
        label: "Eager vs lazy, one value vs many, and cancelling a stream",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { Observable, Subscription, firstValueFrom, from } from "rxjs";

@Component({
  selector: "app-root",
  template: \`
    <button (click)="createBoth()">1. Create both</button>
    <button (click)="consumeBoth()">2. Subscribe / then</button>
    <button (click)="startStream()">3. Start ticking stream</button>
    <button (click)="cancel()">4. Cancel stream</button>
    <button (click)="convert()">5. Promise to Observable to Promise</button>
    <ol>@for (line of log(); track $index) { <li>{{ line }}</li> }</ol>
  \`,
})
export class AppComponent {
  log = signal<string[]>([]);
  private promise?: Promise<string>;
  private observable?: Observable<string>;
  private sub?: Subscription;

  private write(line: string) { this.log.update((l) => [...l, line]); }

  createBoth() {
    // A Promise starts its work the moment it is created (eager).
    this.promise = new Promise((resolve) => { this.write("promise: executor ran"); resolve("P"); });
    // An Observable is only a recipe until someone subscribes (lazy).
    this.observable = new Observable((sub) => {
      this.write("observable: producer ran");
      sub.next("O1"); sub.next("O2"); sub.complete(); // many values, then done
    });
    this.write("both created");
  }

  consumeBoth() {
    this.promise?.then((v) => this.write(\`then -> \${v} (always async)\`));
    this.observable?.subscribe((v) => this.write(\`subscribe -> \${v} (sync here)\`));
    this.write("end of click handler");
  }

  startStream() {
    const ticks = new Observable<number>((sub) => {
      let n = 0;
      const id = setInterval(() => sub.next(++n), 100);
      return () => { clearInterval(id); this.write("teardown: interval cleared"); };
    });
    this.sub = ticks.subscribe((n) => this.write(\`tick \${n}\`));
  }

  cancel() { this.sub?.unsubscribe(); }

  // Converting: from() wraps a Promise, firstValueFrom() turns an Observable back into one.
  async convert() {
    const first = await firstValueFrom(from(Promise.resolve(42)));
    this.write(\`firstValueFrom(from(promise)) = \${first}\`);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the async pipe and why is it useful?",
    seoDescription:
      "The async pipe subscribes to an Observable or Promise in the template, marks the view for check on each value and unsubscribes on destroy.",
    description: `**Question presented to candidate:**
"In this template we use \`user$ | async\` in three places and someone says that is fine because the async pipe handles everything. Explain what the async pipe actually does, why it is useful, and whether that template is fine."

**What a strong answer should cover:**
- \`| async\` **subscribes** to an Observable (or waits on a Promise), returns the **latest value** (\`null\` before the first one), and calls **\`markForCheck()\`** on each new value, so it works with OnPush and zoneless apps.
- It **unsubscribes automatically** when the view is destroyed, and when the expression starts returning a **different Observable** instance.
- Each \`| async\` is its **own subscription**: three pipes on a cold HTTP Observable are three requests. Use one \`@if (user$ | async; as user)\` block, \`shareReplay\`, or \`toSignal()\`.
- Never pipe a method or getter that **creates a new Observable** on every evaluation: it re-subscribes forever and never shows a value.
- Errors from the stream go to the app \`ErrorHandler\`; handle them with \`catchError\` in the pipeline. The pipe does not unwrap signals.
- In Angular 22, \`toSignal()\` is the signal-first alternative; the async pipe remains fully supported.

**Clarifying questions expected:**
- "Is \`user$\` an HTTP call or a shared store stream?"
- "Is this component signal-based already, or still Observable-based?"

**Code / implementation expected:** Yes — one async-pipe subscription with \`@if ... as\`, a live stream showing unsubscribe on destroy, and a Promise.`,
    answer: `**Target Audience:** Developers who have written <code>| async</code> in a template and want to know exactly what it does — assumes basic Observables, explains everything else.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The behaviour below was produced on Angular 22.2.3: templates compiled with <code>ngc</code> (strict templates), run in jsdom, and subscriptions counted with instrumented Observables. The "inside the pipe" section is read from the installed <code>@angular/common</code> 22.2.3 source.

## 1. Why This Even Matters — A Story First

You want the latest football score on a screen in your shop. One way: you phone the sports desk, ask them to call you whenever the score changes, write each new score on the screen yourself, and remember to cancel the arrangement when you close the shop. Forget to cancel, and the phone keeps ringing in an empty building.

The other way: you hire an assistant who does exactly that. They make the call when the shop opens, update the screen on every change, and cancel the arrangement when the shop closes. You never touch the phone.

The **async pipe** is that assistant. Its usefulness is not that it does anything clever; it is that it does the three boring things, subscribe, update, unsubscribe, every time, so you cannot forget one of them. The interview catch is that each assistant makes **their own** phone call.

## 2. The Core Idea

📌 **Interview term: Pipe** — a template function written <code>value | name</code>. See [pipes in Angular](/interview-question/what-are-pipes-in-angular).

📌 **Interview term: async pipe** — the <code>AsyncPipe</code> from <code>@angular/common</code> ([standalone](/interview-question/what-are-standalone-components), so it goes in a component's <code>imports</code>). Given an [Observable or a Promise](/interview-question/what-is-the-difference-between-observables-and-promises), it:

1. **Subscribes** the first time the template evaluates it.
2. **Returns the latest value**, or <code>null</code> before the first one.
3. **Marks the view for check** on each new value, so the screen updates.
4. **Unsubscribes** when the view is destroyed, or when the expression returns a different Observable.

📌 **Interview term: Impure pipe** — a pipe that Angular re-evaluates on every check of the view, not only when its input reference changes. The async pipe is declared with <code>pure: false</code>, because its output changes while its input stays the same object.

📌 **Interview term: markForCheck()** — tells Angular that this view and its ancestors should be checked on the next pass. It is what makes the async pipe work under [OnPush](/interview-question/how-does-change-detection-work-in-angular), which is the default in v22. See [ChangeDetectorRef](/interview-question/what-does-changedetectorref-do).

## 3. Inside the Pipe (22.2.3 source)

Reading <code>AsyncPipe</code> in the installed package:

- It holds <code>_obj</code> (the current Observable or Promise), <code>_subscription</code> and <code>_latestValue</code>, which starts as <code>null</code>.
- <code>transform(obj)</code>: on the first call it subscribes and returns <code>_latestValue</code>. If a later call passes **a different object**, it disposes the old subscription, resets the value to <code>null</code>, and subscribes to the new one.
- On each emission it stores the value and calls <code>this._ref.markForCheck()</code>.
- [<code>ngOnDestroy()</code>](/interview-question/what-are-angular-lifecycle-hooks) disposes the subscription. For a Promise, "disposing" only drops the callbacks; the Promise itself cannot be cancelled.
- Errors are passed to Angular's internal application error handler, not rethrown into the template.

The compiled template, from <code>ngc</code> output for <code>&lt;p&gt;{{ n$ | async }}&lt;/p&gt;</code>:

\`\`\`
i0.ɵɵpipe(2, "async");
...
i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, ctx.n$));
\`\`\`

One <code>ɵɵpipe</code> instruction creates one <code>AsyncPipe</code> instance per usage in the template; that detail explains the next section.

## 4. Verified: one pipe, one subscription

A component used the same cold <code>user$</code> (a fake HTTP call that takes 60 ms and counts its subscriptions) three times: twice as <code>{{ (user$ | async)?.name }}</code> and <code>{{ (user$ | async)?.age }}</code>, once in an [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir):

\`\`\`
RENDERED: twice: / loadingpromise: hellosubject: 0hide
t=30ms : twice: / loadingpromise: hellosubject: 0hide {"subscribes":3,"unsubscribes":0}
t=90ms : twice: Ada / 36once: Ada 36promise: hellosubject: 0hide {"subscribes":3,"unsubscribes":3}
\`\`\`

(Root element text, so elements run together.) Three usages, **three subscriptions**: with a real <code>HttpClient</code> that is three identical requests. The fix is to subscribe once and share the value:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Three async pipes on one cold observable create three requests, one async pipe with if as creates one request shared by the block">
  <defs>
    <marker id="asy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="28" text-anchor="middle">Three pipes</text>
  <rect class="d-box-muted" x="40" y="50" width="100" height="40" rx="8"/>
  <text class="d-sub" x="90" y="75" text-anchor="middle">async 1</text>
  <rect class="d-box-muted" x="40" y="110" width="100" height="40" rx="8"/>
  <text class="d-sub" x="90" y="135" text-anchor="middle">async 2</text>
  <rect class="d-box-muted" x="40" y="170" width="100" height="40" rx="8"/>
  <text class="d-sub" x="90" y="195" text-anchor="middle">async 3</text>
  <path class="d-edge" d="M 144 70 L 206 70" marker-end="url(#asy-arrow)"/>
  <path class="d-edge" d="M 144 130 L 206 130" marker-end="url(#asy-arrow)"/>
  <path class="d-edge" d="M 144 190 L 206 190" marker-end="url(#asy-arrow)"/>
  <rect class="d-box" x="212" y="50" width="96" height="40" rx="8"/>
  <text class="d-sub" x="260" y="75" text-anchor="middle">request</text>
  <rect class="d-box" x="212" y="110" width="96" height="40" rx="8"/>
  <text class="d-sub" x="260" y="135" text-anchor="middle">request</text>
  <rect class="d-box" x="212" y="170" width="96" height="40" rx="8"/>
  <text class="d-sub" x="260" y="195" text-anchor="middle">request</text>
  <text class="d-text" x="550" y="28" text-anchor="middle">One pipe with if as</text>
  <rect class="d-box-accent" x="420" y="90" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="495" y="125" text-anchor="middle">async as user</text>
  <path class="d-edge-accent" d="M 574 120 L 616 120" marker-end="url(#asy-arrow)"/>
  <rect class="d-box" x="622" y="100" width="86" height="40" rx="8"/>
  <text class="d-sub" x="665" y="125" text-anchor="middle">request</text>
</svg>

Inside <code>@if (user$ | async; as user) { ... } @else { Loading... }</code>, the block reads the local <code>user</code> as often as it likes. The alternatives are sharing the stream (<code>shareReplay({ bufferSize: 1, refCount: true })</code>, see [shareReplay](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ)) or converting once with <code>toSignal()</code>.

## 5. Verified: the example at the bottom

<code>ProfileComponent</code> uses one <code>@if (user$ | async; as user)</code>, a never-ending <code>ticks$</code> stream that counts live subscriptions, and a Promise. The parent shows the counters and a button that removes and re-adds the profile:

\`\`\`
RENDERED: Hide profileLoading...ticks: promise: helloHTTP requests: 1 | live tick subscriptions: 1
t=90ms  : Hide profileAda (admin)ticks: 1promise: helloHTTP requests: 1 | live tick subscriptions: 1
hidden  : Show profileHTTP requests: 1 | live tick subscriptions: 0
shown   : Hide profileLoading...ticks: promise: HTTP requests: 2 | live tick subscriptions: 1
\`\`\`

- Before the value arrives, the pipe returned <code>null</code>, so <code>@else</code> showed "Loading..." and <code>ticks:</code> was empty.
- When the component was destroyed, the live subscription count went from 1 to 0 with no cleanup code in the component.
- Re-creating the component re-subscribed: a new HTTP request (2) and a fresh <code>null</code> until it answers.

All of this ran with Angular 22 defaults ([zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18), OnPush): the pipe's <code>markForCheck()</code> is what refreshed the view when values arrived from timers.

## 6. Verified: the pipe that never shows anything

Binding a **method** that returns a new Observable each time, <code>{{ load() | async }}</code> where <code>load()</code> returns <code>timer(5).pipe(map(() => "value"))</code>:

\`\`\`
RENDERED: cd 0
after 90ms: cd 0 load() calls: 15
\`\`\`

The value never appeared, and <code>load()</code> was called 15 times in 90 ms. Each emission marked the view for check; the check called <code>load()</code>, which returned a **different** Observable; the pipe disposed the old subscription, reset to <code>null</code> and subscribed again. Store the Observable in a field, so the reference is stable.

Two more behaviours from the same runs:

\`\`\`
ErrorHandler got: stream failed
ErrorHandler got: NG02100: InvalidPipeArgument: '[Signal (sig): 1]' for pipe '_AsyncPipe'
\`\`\`

An erroring stream went to the app's <code>ErrorHandler</code> and the binding simply stayed empty; and piping a **signal** into <code>async</code> is an error (the underscore prefix on the class name comes from the test bundler). Signals are read by calling them: <code>{{ sig() }}</code>.

## 7. async Pipe or toSignal()?

| | <code>obs$ &#124; async</code> | <code>toSignal(obs$)</code> |
| :--- | :--- | :--- |
| Where it subscribes | In the template, per usage | Once, in the class |
| Value before first emission | <code>null</code> | <code>undefined</code>, or <code>initialValue</code> |
| Unsubscribes | When the view is destroyed | When the [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it) is destroyed |
| Usable in TypeScript and [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) | No | Yes |
| Errors | To the <code>ErrorHandler</code>, binding stays empty | Reading the signal throws |
| Works with Promises | Yes | No (wrap with <code>from()</code>) |
| Typical in | Existing Observable-based code | New signal-based Angular 22 code |

Both are correct and leak-free. For new code, <code>toSignal()</code> fits the [signal-first model](/interview-question/what-are-angular-signals); see [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 8. Common Pitfalls

- **Several <code>| async</code> on one cold Observable.** One request per pipe (verified: three subscriptions). Use <code>@if ... as</code>, <code>shareReplay</code> or <code>toSignal()</code>.
- **Piping a method or getter that builds a new Observable.** It re-subscribes forever and never renders a value (verified: 15 calls, no value).
- **Forgetting the <code>null</code> start.** The 22.2.3 typings declare <code>transform&lt;T&gt;(obj: Observable&lt;T&gt; ...): T &#124; null</code>, so strict templates make you handle <code>null</code>; use <code>?.</code>, <code>@if ... as</code>, or <code>startWith</code> in the stream.
- **Falsy values with <code>@if ... as</code>.** A stream that emits <code>0</code>, <code>""</code> or <code>false</code> shows the <code>@else</code> branch (verified: <code>of(0)</code> rendered <code>[else branch]</code>); wrap the value in an object if those are valid.
- **No error handling.** The binding goes empty and the error lands in the <code>ErrorHandler</code>; map errors to a view state with [<code>catchError</code>](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).
- **Passing a signal.** <code>NG02100: InvalidPipeArgument</code>; call the signal instead.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it does:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">| async</code> subscribes to an Observable or Promise, returns the latest value, null before the first, and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> on each value, so it works with OnPush and zoneless."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is useful:</strong> <span style="color:#f0e2c8;">"It unsubscribes automatically when the view is destroyed or when the expression returns a different Observable, so there is no manual subscribe and no leak."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The catch:</strong> <span style="color:#f0e2c8;">"Each pipe is its own subscription. Three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">| async</code> on an HTTP Observable are three requests, so I subscribe once with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if (user$ | async; as user)</code>, or share the stream."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Another trap:</strong> <span style="color:#f0e2c8;">"Never pipe a method that returns a new Observable. The pipe re-subscribes on every check and never shows a value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern Angular:</strong> <span style="color:#f0e2c8;">"In v22 I usually prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> for new code, because the value is a signal I can use in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code>. The async pipe is still fully supported."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the async pipe impure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its output changes while its input stays the same Observable object. A pure pipe only re-runs when the input reference changes, so it would never show new values. The pipe is declared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pure: false</code> in the 22.2.3 source.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it work with OnPush and zoneless change detection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On every emission it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ChangeDetectorRef.markForCheck()</code>, which marks the view dirty and schedules a check. Verified with v22 defaults: values from timers rendered with no other code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the Observable errors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pipe passes the error to the application error handler and the binding keeps whatever it last showed, which was nothing in the test. The stream is finished, so no more values arrive. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError</code> to turn errors into a value the template can show.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the async pipe cancel a Promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. On destroy it only drops its callbacks so a late result is ignored; the Promise itself keeps running, because Promises cannot be cancelled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid multiple subscriptions without restructuring the template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Share the source: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shareReplay({ bufferSize: 1, refCount: true })</code> makes later pipes reuse the first subscription and its last value; verified with two pipes on one shared stream: one subscription. Or convert once with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> and read the signal everywhere.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **async pipe** | Template helper that subscribes, returns the latest value and unsubscribes |
| **Impure pipe** | Re-evaluated on every check, not only when its input changes |
| **markForCheck()** | Marks the view dirty so the next check refreshes it |
| **@if ... as** | Store the pipe result in a local template variable, one subscription |
| **Cold Observable** | Runs its producer per subscriber, such as an HTTP call |
| **shareReplay** | Shares one subscription and replays the last value |
| **NG02100** | Invalid pipe argument, for example a signal passed to async |
| **toSignal()** | The signal-based alternative, subscribing once in the class |

---
**Conclusion:** The async pipe is useful because it makes the three steps of consuming an Observable, subscribe, update the view, unsubscribe, impossible to forget, and its <code>markForCheck()</code> keeps it working with Angular 22's OnPush and zoneless defaults. Verified on 22.2.3, it cleaned up a live subscription when its component was removed, but three pipes on one cold Observable made three requests, and piping a method that returns a new Observable re-subscribed fifteen times without showing anything. Use one subscription per value with <code>@if ... as</code>, keep Observables in fields, and in new code consider <code>toSignal()</code>; for everything else that can leak, see [avoiding subscription leaks](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).`,
    examples: [
      {
        label: "async pipe with @if as, a live stream, a Promise, and unsubscribe on destroy",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { Observable, interval, map } from "rxjs";

// Counts live subscriptions so we can watch the async pipe subscribe and unsubscribe.
export const live = signal(0);
export const requests = signal(0);

function fakeHttp<T>(value: T, ms = 60): Observable<T> {
  return new Observable<T>((sub) => {
    requests.update((n) => n + 1);
    const id = setTimeout(() => { sub.next(value); sub.complete(); }, ms);
    return () => clearTimeout(id);
  });
}

function liveTicks(): Observable<number> {
  return new Observable<number>((sub) => {
    live.update((n) => n + 1);
    const inner = interval(50).pipe(map((i) => i + 1)).subscribe(sub);
    return () => { inner.unsubscribe(); live.update((n) => n - 1); };
  });
}

@Component({
  selector: "app-profile",
  imports: [AsyncPipe],
  template: \`
    <!-- one subscription, a loading branch, a typed local variable -->
    @if (user$ | async; as user) { <p>{{ user.name }} ({{ user.role }})</p> } @else { <p>Loading...</p> }
    <p>ticks: {{ ticks$ | async }}</p>
    <p>promise: {{ greeting | async }}</p>
  \`,
})
export class ProfileComponent {
  user$ = fakeHttp({ name: "Ada", role: "admin" });
  ticks$ = liveTicks();
  greeting = new Promise<string>((resolve) => setTimeout(() => resolve("hello"), 30));
}

@Component({
  selector: "app-root",
  imports: [ProfileComponent],
  template: \`
    <button (click)="show.update(s => !s)">{{ show() ? "Hide" : "Show" }} profile</button>
    @if (show()) { <app-profile /> }
    <p>HTTP requests: {{ requests() }} | live tick subscriptions: {{ live() }}</p>
  \`,
})
export class AppComponent {
  show = signal(true);
  requests = requests;
  live = live;
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you avoid memory leaks from subscriptions?",
    seoDescription:
      "Which subscriptions leak and which do not: takeUntilDestroyed, DestroyRef, async pipe, toSignal and takeUntil, measured by counting live subscriptions.",
    description: `**Question presented to candidate:**
"Users report the dashboard gets slower every time they navigate away and back, and the logs show the same handler firing several times per event. How would you find and fix subscription leaks in an Angular 22 app?"

**What a strong answer should cover:**
- **Why it leaks:** a \`subscribe()\` to a long-lived source (a root service Subject, router events, \`interval\`, a websocket) keeps running after the component is destroyed; its callback keeps the component in memory and fires on every event.
- **What does not need cleanup:** sources that complete by themselves, such as a single \`HttpClient\` call or \`take(1)\`, release on completion.
- **Preferred fixes:** let Angular own the subscription: the **async pipe**, **\`toSignal()\`**, or **\`takeUntilDestroyed()\`** (in an injection context, or \`takeUntilDestroyed(destroyRef)\` elsewhere). \`DestroyRef.onDestroy\` for anything else.
- Older patterns still valid: a \`destroy$\` Subject with \`takeUntil\`, or a \`Subscription\` bag unsubscribed in \`ngOnDestroy\`.
- **Operator placement:** \`takeUntil\` must be the **last** operator, after \`switchMap\` and friends, or the inner subscription survives.
- How to detect: count active subscriptions in a test after \`fixture.destroy()\`, heap snapshots for detached components, and lint rules.

**Clarifying questions expected:**
- "Which sources does the dashboard subscribe to: HTTP only, or store and socket streams too?"
- "Is it signal-based already, or \`subscribe()\` in \`ngOnInit\`?"

**Code / implementation expected:** Yes — several subscription styles in one component, with live subscriptions counted after it is destroyed.`,
    answer: `**Target Audience:** Angular developers who subscribe to Observables in components and services — assumes basic RxJS, explains every cleanup mechanism from scratch.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Instead of asserting which patterns leak, every claim below was measured: the example's Observables count their own live subscriptions, the component is destroyed, and the counts are printed. Run on Angular 22.2.3 with RxJS 7.8.2, compiled with <code>ngc</code> and in the playground JIT mode, in jsdom.

## 1. Why This Even Matters — A Story First

You move out of a flat but forget to cancel the newspaper delivery. Nothing bad happens on day one. But every morning a paper lands on the doormat of an empty flat, the pile grows, and if you move out of three more flats the same way, four papers are being delivered for a person who reads none of them.

A component that subscribes to a long-lived stream and does not unsubscribe is that newspaper. The component is destroyed when you navigate away, but the stream keeps delivering to it. Come back, and a new component subscribes again: now two callbacks run per event, then three. Each one also keeps its old component alive in memory, because the callback still refers to it.

That is the symptom pattern interviewers describe: the screen gets slower each time you visit it, and a handler fires several times per event.

## 2. The Core Idea

📌 **Interview term: Subscription** — the object <code>subscribe()</code> returns. It keeps the producer running until either the Observable **completes or errors**, or you call **<code>unsubscribe()</code>**.

📌 **Interview term: Memory leak** — memory that is no longer needed but cannot be freed because something still references it. A live subscription references its callback, the callback references the component, so the destroyed component cannot be garbage-collected.

📌 **Interview term: Finite vs infinite source** — a finite Observable completes by itself (an <code>HttpClient</code> call, <code>of()</code>, [<code>take(1)</code>](/interview-question/what-is-the-difference-between-take-1-and-first-operators-in-rxjs)); an infinite one never does (<code>interval</code>, a store or Subject in a [root service](/interview-question/what-is-a-service-and-why-use-it), [router events](/interview-question/how-does-routing-and-lazy-loading-work-in-angular), a websocket). Only infinite sources, or finite ones that are very slow, leak.

📌 **Interview term: DestroyRef** — an injectable handle for "the thing that owns me is being destroyed". <code>inject(DestroyRef).onDestroy(fn)</code> registers cleanup for the current component, directive, service or [injector](/interview-question/how-does-dependency-injection-work-in-angular).

📌 **Interview term: takeUntilDestroyed()** — an operator from <code>@angular/core/rxjs-interop</code> that completes the stream when the current <code>DestroyRef</code> fires. Called without an argument it needs an injection context; elsewhere, pass the <code>DestroyRef</code>. Marked <code>@publicApi 19.0</code> in the 22.2.3 typings.

## 3. Verified: which subscriptions survive destroy

The example at the bottom has a root <code>Ticker</code> service whose [Observables](/interview-question/what-is-the-difference-between-observables-and-promises) never complete and count how many subscribers are live. A child component subscribes seven ways, then a button destroys it:

\`\`\`
before destroy:
  1 plain subscribe (LEAK): 1 active
  2 takeUntil before switchMap (LEAK): 1 active
  async pipe: 1 active
  takeUntil(destroy$): 1 active
  takeUntilDestroyed(): 1 active
  takeUntilDestroyed(ref) in ngOnInit: 1 active
  toSignal: 1 active
after destroy:
  1 plain subscribe (LEAK): 1 active
  2 takeUntil before switchMap (LEAK): 1 active
  async pipe: 0 active
  takeUntil(destroy$): 0 active
  takeUntilDestroyed(): 0 active
  takeUntilDestroyed(ref) in ngOnInit: 0 active
  toSignal: 0 active
\`\`\`

Identical in AOT and playground mode. Five patterns cleaned up, two leaked. A longer run with extra variants, which also checked whether each source was still delivering values after destroy, added:

\`\`\`
  DestroyRef.onDestroy                   active=0
  Subscription bag                       active=0
  take(3)                                active=0
  still receiving after destroy: plain subscribe
  still receiving after destroy: takeUntil BEFORE switchMap
\`\`\`

<code>take(3)</code> had already completed on its own before the component was destroyed, which is the finite-source case: nothing to clean up.

## 4. Why takeUntil Must Come Last

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="takeUntil before switchMap completes only the outer stream and the inner subscription keeps running, takeUntil after switchMap completes the whole chain">
  <defs>
    <marker id="leak-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="28" text-anchor="middle">takeUntil BEFORE switchMap</text>
  <rect class="d-box" x="30" y="44" width="140" height="56" rx="10"/>
  <text class="d-sub" x="100" y="77" text-anchor="middle">outer source</text>
  <path class="d-edge" d="M 174 72 L 226 72" marker-end="url(#leak-arrow)"/>
  <rect class="d-box-muted" x="232" y="44" width="140" height="56" rx="10"/>
  <text class="d-sub" x="302" y="77" text-anchor="middle">takeUntil</text>
  <path class="d-edge" d="M 376 72 L 428 72" marker-end="url(#leak-arrow)"/>
  <rect class="d-box" x="434" y="44" width="140" height="56" rx="10"/>
  <text class="d-sub" x="504" y="77" text-anchor="middle">switchMap</text>
  <path class="d-edge-dashed" d="M 578 72 L 630 72" marker-end="url(#leak-arrow)"/>
  <rect class="d-box-muted" x="636" y="44" width="70" height="56" rx="10"/>
  <text class="d-sub" x="671" y="77" text-anchor="middle">inner</text>
  <text class="d-text" x="360" y="158" text-anchor="middle">takeUntil AFTER switchMap</text>
  <rect class="d-box" x="30" y="174" width="140" height="56" rx="10"/>
  <text class="d-sub" x="100" y="207" text-anchor="middle">outer source</text>
  <path class="d-edge" d="M 174 202 L 226 202" marker-end="url(#leak-arrow)"/>
  <rect class="d-box" x="232" y="174" width="140" height="56" rx="10"/>
  <text class="d-sub" x="302" y="207" text-anchor="middle">switchMap</text>
  <path class="d-edge" d="M 376 202 L 428 202" marker-end="url(#leak-arrow)"/>
  <rect class="d-box-accent" x="434" y="174" width="140" height="56" rx="10"/>
  <text class="d-text d-accent" x="504" y="207" text-anchor="middle">takeUntil</text>
</svg>

<code>takeUntil</code> completes the stream **downstream of where it sits**. Placed before <code>switchMap</code>, it completes the outer source, but completion of the outer stream does not cancel an inner subscription that is still running, so the inner stream lives on. Placed last, it unsubscribes the whole chain, inner subscription included. Verified side by side:

\`\`\`
  takeUntil BEFORE switchMap             active=1
  takeUntil AFTER switchMap              active=0
\`\`\`

The same applies to <code>takeUntilDestroyed()</code>: make it the last operator before <code>subscribe()</code>. Operator semantics are covered in [switchMap vs mergeMap vs concatMap vs exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).

## 5. The Patterns, Ranked

| Pattern | Who unsubscribes | Needs | Verdict in v22 |
| :--- | :--- | :--- | :--- |
| <code>toSignal(obs$)</code> | The injection context's <code>DestroyRef</code> | Field initialiser, or <code>{ injector }</code> | First choice for state the template reads |
| <code>obs$ &#124; async</code> | The view, on destroy | Template usage | Fine, especially in existing code |
| <code>.pipe(takeUntilDestroyed())</code> | The current <code>DestroyRef</code> | Constructor or field | First choice for side-effect subscriptions |
| <code>.pipe(takeUntilDestroyed(this.destroyRef))</code> | The given <code>DestroyRef</code> | A captured <code>DestroyRef</code> | For subscriptions started in [<code>ngOnInit</code>](/interview-question/what-are-angular-lifecycle-hooks) or handlers |
| <code>destroyRef.onDestroy(() => sub.unsubscribe())</code> | You, via the hook | A <code>DestroyRef</code> | Non-RxJS cleanup too (listeners, timers) |
| <code>destroy$</code> + <code>takeUntil</code> | <code>ngOnDestroy</code> | Boilerplate, last-operator rule | Legacy but correct |
| <code>Subscription</code> bag + <code>ngOnDestroy</code> | <code>ngOnDestroy</code> | Remembering every <code>add()</code> | Legacy but correct |
| <code>take(1)</code>, <code>first()</code> | Completion | A finite need | Correct for one value; not a lifetime guard |
| Plain <code>subscribe()</code> | Nobody | — | Leaks on an infinite source |

For the template-side mechanics, see [the async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful); for the signal bridge, [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 6. Verified: the context and lifetime traps

**<code>takeUntilDestroyed()</code> in <code>ngOnInit</code> without an argument** fails, because <code>ngOnInit</code> is not an injection context:

\`\`\`
takeUntilDestroyed(): NG0203: takeUntilDestroyed() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`. Find more at https://v22.angular.dev/errors/NG0203
\`\`\`

The example's <code>takeUntilDestroyed(this.destroyRef)</code> line in <code>ngOnInit</code> is the fix, and it measured <code>0 active</code> after destroy. More on contexts in [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

**The wrong owner.** <code>toSignal()</code> run through the root <code>EnvironmentInjector</code> from a child component is owned by the app, not the child:

\`\`\`
before: {"component Injector":1,"EnvironmentInjector (root)":1}
after child destroyed: {"component Injector":0,"EnvironmentInjector (root)":1}
\`\`\`

The same goes for subscriptions made inside a <code>providedIn: "root"</code> service: its <code>DestroyRef</code> is the root injector, so they end only when the app does. That is correct for app-wide state and a leak for anything per-screen; see [providing a service in root vs in a component](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).

## 7. Finding Leaks in a Real App

- **Count subscriptions in a test.** Wrap the source as the example does (increment on subscribe, decrement in teardown), call [<code>fixture.destroy()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-), assert zero. For a <code>Subject</code>, <code>subject.observed</code> is a quick check: in the async-pipe experiment it read <code>true</code> before the component was removed and <code>false</code> after.
- **Heap snapshots.** In Chrome DevTools, navigate away and back a few times, take a snapshot, and search for your component class: more than one instance after destroy is a leak. (Browser tooling; not something this jsdom setup can show.)
- **Watch for duplicated effects.** A log line or network call that repeats once per previous visit is the classic sign.
- **Lint.** Community ESLint plugins for RxJS offer rules that flag a missing or misplaced <code>takeUntil</code>; they were not evaluated here, so check the current plugin before adopting one.

## 8. Common Pitfalls

- **Plain <code>subscribe()</code> to a root service stream.** The most common leak (verified: still delivering after destroy).
- **<code>takeUntil</code> or <code>takeUntilDestroyed</code> before <code>switchMap</code>, <code>mergeMap</code> or <code>concatMap</code>.** The inner stream survives (verified).
- **<code>takeUntilDestroyed()</code> in <code>ngOnInit</code>.** NG0203; pass a captured <code>DestroyRef</code>.
- **Unsubscribing every HTTP call by reflex.** A single <code>HttpClient</code> request completes and tears down by itself; the cleanup only matters to cancel a slow request when the user leaves.
- **Using <code>take(1)</code> as a lifetime guard.** It stops after one value, but if that value never comes the subscription waits forever.
- **Subscribing in a method the template calls, or in a loop.** Every call adds a subscription, and cleanup patterns do not prevent duplicates.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The cause:</strong> <span style="color:#f0e2c8;">"A leak is a subscription to a long-lived source, like a root service Subject, router events or an interval, that outlives its component. The callback keeps the component in memory and fires on every event."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What is safe:</strong> <span style="color:#f0e2c8;">"Finite sources, like a single HttpClient call or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">take(1)</code>, complete and tear down by themselves."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. My defaults:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> or the async pipe for template state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> for side-effect subscriptions, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef.onDestroy</code> for anything that is not RxJS."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The traps:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> needs an injection context, so in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> I pass the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>. And it must be the last operator, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>, or the inner stream leaks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I prove it:</strong> <span style="color:#f0e2c8;">"In a test I count live subscriptions, destroy the fixture and expect zero. In the browser, a heap snapshot after navigating back and forth shows destroyed components still in memory."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need to unsubscribe from HttpClient calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not to avoid a leak: the request completes and the subscription tears down. You may still want to cancel when the user leaves or starts a newer request, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> do for you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">takeUntil(this.destroy$)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same effect, less code. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntilDestroyed()</code> hooks into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>, so there is no Subject to create and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code> to remember. It also works in services and directives, and in a root service it means "until the app is destroyed".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">takeUntil</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">switchMap</code> leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">takeUntil</code> completes the stream from its position onwards. Before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>, it completes the outer source, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> keeps its active inner subscription until that inner stream completes. Placed last, it unsubscribes the whole chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a service leak subscriptions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A root service lives as long as the app, so its own subscriptions are usually fine. The leak is when a service subscribes on behalf of a component, for example in a method the component calls, and nothing ties that subscription to the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are signals immune to this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signals and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> need no unsubscription, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">effect()</code> is destroyed with its owner. But <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal()</code> is a subscription underneath, so the injector you create it in still decides its lifetime.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subscription** | Keeps a producer running until completion or <code>unsubscribe()</code> |
| **Memory leak** | Memory kept alive by a reference that should have been dropped |
| **Finite vs infinite source** | Completes by itself vs runs until unsubscribed |
| **DestroyRef** | Injectable hook for "my owner is being destroyed" |
| **takeUntilDestroyed()** | Completes a stream when its <code>DestroyRef</code> fires |
| **takeUntil(notifier)** | Completes a stream when the notifier emits |
| **Teardown** | Cleanup that runs on unsubscribe or completion |
| **subject.observed** | True while a Subject has at least one subscriber |

---
**Conclusion:** A subscription leak is a subscription with no owner: an infinite source, a <code>subscribe()</code> call, and nothing that ends it when the component goes away. Measured on 22.2.3, the async pipe, <code>toSignal()</code>, <code>takeUntilDestroyed()</code>, <code>DestroyRef.onDestroy</code>, <code>destroy$</code> and a subscription bag all dropped to zero live subscriptions on destroy, while a plain <code>subscribe()</code> and a <code>takeUntil</code> placed before <code>switchMap</code> kept delivering to a component that no longer existed. Let Angular own subscriptions wherever it can, put the lifetime operator last, pass a <code>DestroyRef</code> or the right injector when you are outside the constructor, and prove it with a test that counts what is still running. For deciding when a stream should be a signal in the first place, see [Signals vs RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18).`,
    examples: [
      {
        label: "Seven ways to subscribe, counted after the component is destroyed",
        tech: "angular",
        runnable: true,
        code: `import { Component, DestroyRef, Injectable, inject, signal } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { BehaviorSubject, Observable, Subject, switchMap, takeUntil } from "rxjs";

// A root service whose stream never completes (like a WebSocket, a store, or router events).
@Injectable({ providedIn: "root" })
export class Ticker {
  active = signal<Record<string, number>>({});
  ticks(tag: string): Observable<number> {
    return new Observable<number>((sub) => {
      this.bump(tag, +1);
      let n = 0;
      const id = setInterval(() => sub.next(++n), 100);
      return () => { clearInterval(id); this.bump(tag, -1); }; // runs on unsubscribe
    });
  }
  private bump(tag: string, d: number) {
    this.active.update((a) => ({ ...a, [tag]: (a[tag] ?? 0) + d }));
  }
}

@Component({
  selector: "app-widget",
  imports: [AsyncPipe],
  template: \`<p>widget alive: {{ viaAsync$ | async }} / {{ viaSignal() }}</p>\`,
})
export class WidgetComponent {
  private ticker = inject(Ticker);
  private destroyRef = inject(DestroyRef);
  private destroy$ = new Subject<void>();

  viaAsync$ = this.ticker.ticks("async pipe");                                // template owns it
  viaSignal = toSignal(this.ticker.ticks("toSignal"), { initialValue: 0 });   // DestroyRef owns it

  constructor() {
    this.ticker.ticks("1 plain subscribe (LEAK)").subscribe();
    this.ticker.ticks("takeUntilDestroyed()").pipe(takeUntilDestroyed()).subscribe();
    this.ticker.ticks("takeUntil(destroy$)").pipe(takeUntil(this.destroy$)).subscribe();

    const outer = new BehaviorSubject("go");
    outer.pipe(takeUntil(this.destroy$), switchMap(() => this.ticker.ticks("2 takeUntil before switchMap (LEAK)"))).subscribe();
  }

  ngOnInit() {
    // Outside the constructor there is no injection context: pass the DestroyRef in.
    this.ticker.ticks("takeUntilDestroyed(ref) in ngOnInit").pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}

@Component({
  selector: "app-root",
  imports: [WidgetComponent],
  template: \`
    <button (click)="show.set(false)">Destroy widget</button>
    @if (show()) { <app-widget /> }
    <ul>
      @for (row of rows(); track row[0]) { <li>{{ row[0] }}: {{ row[1] }} active</li> }
    </ul>
  \`,
})
export class AppComponent {
  show = signal(true);
  private ticker = inject(Ticker);
  rows = () => Object.entries(this.ticker.active()).sort();
}`,
      },
    ],
  },
];

export default augments;
