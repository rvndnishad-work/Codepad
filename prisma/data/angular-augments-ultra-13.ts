/**
 * Angular ULTRA — batch 13: unit testing (fixture.detectChanges,
 * ComponentFixtureAutoDetect, fakeAsync/tick/waitForAsync, mocking services,
 * signal components, @defer and control flow), dynamic components, and
 * micro-frontends with Module Federation / Native Federation.
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
 * Every testing claim was produced on Angular 22.2.3 by running the spec files
 * shown in the examples with Angular CLI 22.2.3 (`ng test --watch=false`,
 * Vitest 5 + jsdom, Node 24): once in the default zoneless workspace, and once
 * in a copy that loads zone.js 0.16.3 (`zone.js`, `zone.js/testing` polyfills
 * plus `zone.js/plugins/vitest-patch`). The dynamic-component examples were
 * AOT-compiled with ngc and booted in jsdom by
 * scripts/verify-angular-example.mjs (the runnable one also passed its
 * --playground mode). The federation answer comes from building a real remote
 * and host with @angular-architects/native-federation 22.2.2 and loading the
 * remote with its Node runtime; nothing was run in a real browser.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the fixture.detectChanges() method in Angular testing, and when should you call it?",
    seoDescription:
      "fixture.detectChanges() runs change detection on a test component: when to call it, how it differs from whenStable(), and what zoneless Angular 22 changes.",
    description: `**Question presented to candidate:**
"In a TestBed spec you create a component and the DOM is empty. What does \`fixture.detectChanges()\` actually do, when do you need to call it, and is it still the right tool in a zoneless Angular 22 project?"

**What a strong answer should cover:**
- \`TestBed.createComponent()\` builds the component and its host element but **does not render bindings**; change detection has to run first.
- \`fixture.detectChanges()\` runs **one synchronous change detection pass** for the fixture and then, in dev mode, a **\`checkNoChanges()\` pass** that throws \`NG0100\` if a value changed after it was checked.
- Under **OnPush** (the v22 default), \`detectChanges()\` only refreshes views that are dirty: signals, template events, \`setInput()\` and \`markForCheck()\` mark them; a plain field assignment does not.
- In a **zoneless** TestBed (the CLI default), the fixture already auto-detects; the generated spec uses \`await fixture.whenStable()\` to let Angular render the way the app would.
- When to prefer which: \`detectChanges()\` for a precise, synchronous step (and with fake timers); \`whenStable()\` for realistic, async flows.
- Seeing \`NG0100\` in a zoneless test usually means state was changed without notifying Angular.

**Clarifying questions expected:**
- "Is the project zoneless, or does it still load Zone.js?"
- "Are the components OnPush (the v22 default) or Eager?"

**Code / implementation expected:** Yes — a spec showing the first render, a signal update, the OnPush plain-field trap and an \`NG0100\`.`,
    answer: `**Target Audience:** Developers writing or reviewing Angular component tests; assumes you have seen a <code>TestBed</code> spec but not much more.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer listens for. Every behaviour quoted below was produced by running the spec in the example with Angular CLI 22.2.3 (<code>ng test --watch=false</code>, Vitest + jsdom), in the default zoneless workspace that <code>ng new</code> generates.

## 1. Why This Even Matters — A Story First

Imagine a theatre rehearsal. The actors (your component) are on stage, the script (the template) is in their hands, and the audience seats (the DOM) are in place. But nothing happens until the director shouts "Action!". Until then, the stage is silent.

In a unit test, <code>TestBed.createComponent()</code> builds the stage and seats the actors. **<code>fixture.detectChanges()</code> is the director shouting "Action!"**: Angular reads the component state and writes it into the DOM, once, right now.

The interesting part is what happens after that first shout. In older Angular, a stage manager called [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon) watched for anything that might change the scene. Angular 22 apps are [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) and [OnPush](/interview-question/what-does-changedetectorref-do) by default, so the question "when do I have to shout again?" has a more precise answer than it used to, and that is exactly what interviewers probe.

## 2. The Core Idea

📌 **Interview term: ComponentFixture** — the test handle returned by <code>TestBed.createComponent(MyComponent)</code>. It holds the instance (<code>componentInstance</code>), the <code>ComponentRef</code> (<code>componentRef</code>), the host DOM node (<code>nativeElement</code>), a <code>DebugElement</code>, and the methods that drive rendering.

📌 **Interview term: Change detection** — the step where Angular evaluates template bindings and updates the DOM. See [how change detection works](/interview-question/how-does-change-detection-work-in-angular).

📌 **Interview term: <code>fixture.detectChanges()</code>** — runs **one synchronous change detection pass** for the fixture. In a zoneless TestBed the 22.2.3 source does this by calling <code>ApplicationRef.tick()</code> with every test view included; with Zone.js it calls the host view's <code>detectChanges()</code> inside the <code>NgZone</code>. In both cases it then runs **<code>checkNoChanges()</code>** in dev mode.

📌 **Interview term: <code>checkNoChanges()</code> / NG0100** — a second, read-only pass that re-evaluates every binding and throws <code>ExpressionChangedAfterItHasBeenCheckedError</code> (<code>NG0100</code>) if any value differs from what was just rendered. It exists to catch code that changes state during rendering.

📌 **Interview term: <code>fixture.whenStable()</code>** — returns a promise that resolves when the fixture has no pending work. In a zoneless TestBed that includes the scheduled render, so <code>await fixture.whenStable()</code> is "let Angular render the way the real app would".

## 3. What One Call Does

<svg class="iq-diagram" width="100%" viewBox="0 0 780 220" role="img" aria-label="createComponent builds the view, detectChanges renders the dirty views and then runs a checkNoChanges pass that throws NG0100 if a value moved">
  <defs>
    <marker id="dc13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="100" y="90" text-anchor="middle">createComponent</text>
  <text class="d-sub" x="100" y="112" text-anchor="middle">elements, no values</text>
  <path class="d-edge" d="M 184 95 L 226 95" marker-end="url(#dc13-arrow)"/>
  <rect class="d-box-accent" x="232" y="60" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="312" y="90" text-anchor="middle">detectChanges()</text>
  <text class="d-sub" x="312" y="112" text-anchor="middle">synchronous</text>
  <path class="d-edge" d="M 396 95 L 438 95" marker-end="url(#dc13-arrow)"/>
  <rect class="d-box" x="444" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="519" y="90" text-anchor="middle">refresh pass</text>
  <text class="d-sub" x="519" y="112" text-anchor="middle">dirty views only</text>
  <path class="d-edge" d="M 598 95 L 636 95" marker-end="url(#dc13-arrow)"/>
  <rect class="d-box" x="642" y="60" width="124" height="70" rx="10"/>
  <text class="d-text" x="704" y="90" text-anchor="middle">check pass</text>
  <text class="d-sub" x="704" y="112" text-anchor="middle">NG0100 if moved</text>
  <rect class="d-box-muted" x="300" y="160" width="466" height="44" rx="10"/>
  <text class="d-sub" x="533" y="187" text-anchor="middle">dirty = signal read, event, setInput, markForCheck</text>
</svg>

The refresh pass only re-renders views Angular knows are dirty; the check pass then re-reads every binding to make sure nothing moved underneath it. Both happen inside the one call, before it returns.

## 4. Verified: the four behaviours that matter

The example spec (<code>detect-changes.spec.ts</code>) has one test per behaviour. Run with <code>ng test --watch=false --reporters=verbose</code> on Angular 22.2.3:

\`\`\`
✓ fixture.detectChanges() > nothing is rendered until the first change detection
✓ fixture.detectChanges() > signals: detectChanges() renders synchronously, whenStable() asynchronously
✓ fixture.detectChanges() > OnPush (the v22 default): a plain field change needs markForCheck()
✓ fixture.detectChanges() > detectChanges() also runs checkNoChanges() in dev mode
\`\`\`

What each test proved, with the values it asserted:

| Step | DOM after it |
| :--- | :--- |
| <code>createComponent(Badge)</code> | <code>textContent</code> is <code>""</code>: the elements exist, no values yet |
| <code>detectChanges()</code> | <code>Ada</code> and <code>0</code> rendered |
| <code>count.set(5)</code>, no call yet | still <code>0</code> |
| <code>detectChanges()</code> | <code>5</code>, synchronously, before the next line runs |
| <code>count.set(6)</code> then <code>await whenStable()</code> | <code>6</code>, rendered by the [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) scheduler |
| <code>name = 'Grace'</code> then <code>detectChanges()</code> | still <code>Ada</code>: [OnPush](/interview-question/what-does-changedetectorref-do) view was not dirty |
| own <code>cdr.markForCheck()</code> then <code>detectChanges()</code> | <code>Grace</code> |
| a component that writes a bound field in [<code>ngAfterViewInit</code>](/interview-question/what-are-angular-lifecycle-hooks) | <code>detectChanges()</code> throws <code>NG0100: ExpressionChangedAfterItHasBeenCheckedError</code> |

Two extra probes (not in the example file) are worth knowing:

- Calling <code>fixture.componentRef.changeDetectorRef.markForCheck()</code> did **not** fix the plain-field case: that ref belongs to the **host** view, and marking it dirty does not mark the OnPush component view below it. The component's own injected <code>ChangeDetectorRef</code> did.
- <code>detectChanges(false)</code> (the parameter is named <code>checkNoChanges</code>) still threw <code>NG0100</code> for the hook-writing component in our zoneless run. That is consistent with the 22.2.3 source: the flag only stubs the host view's <code>checkNoChanges</code>, while zoneless <code>detectChanges()</code> delegates to <code>ApplicationRef.tick()</code>.
- The same plain-field change on a component switched back to <code>ChangeDetectionStrategy.Eager</code> made <code>detectChanges()</code> throw <code>NG0100</code> with <code>Previous value: 'Ada'. Current value: 'Grace'</code>, and the DOM stayed <code>Ada</code>. In a zoneless TestBed the refresh pass skipped the view (nobody notified Angular), and the check pass then noticed the difference. The message is the fixture telling you "you changed state without notifying Angular".

## 5. When Should You Call It?

| Situation | Call | Why |
| :--- | :--- | :--- |
| First render in a [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) test, realistic flow | <code>await fixture.whenStable()</code> | This is what the CLI-generated spec does; Angular renders on its own schedule |
| You need the DOM updated **right now**, synchronously | <code>fixture.detectChanges()</code> | One deterministic pass, no awaiting |
| Inside fake timers (<code>vi.useFakeTimers()</code> or <code>fakeAsync</code>) | <code>fixture.detectChanges()</code> | The scheduler timer is faked too, so <code>whenStable()</code> can hang; see [fakeAsync, tick and waitForAsync](/interview-question/what-is-the-difference-between-fakeasync-tick-and-waitforasync-in-angular-unit-t) |
| Zone-based project without auto detect | <code>fixture.detectChanges()</code> after every change | Nothing renders on its own; see [ComponentFixtureAutoDetect](/interview-question/what-is-componentfixtureautodetect-and-how-does-it-affect-unit-tests) |
| You changed a plain field on an OnPush component | Make it a signal, or <code>markForCheck()</code> on the component, then <code>detectChanges()</code> | Otherwise the view is skipped |
| You set an input | <code>fixture.componentRef.setInput()</code> then either | <code>setInput()</code> marks the view dirty, unlike assigning the property |

📌 **Interview term: OnPush** — a change detection strategy where a component view is only refreshed when it is marked dirty. It is the default in Angular 22 (the 22.2.3 typings: <code>OnPush = 0</code> "OnPush is enabled by default"; the old <code>Default</code> is deprecated in favour of <code>Eager</code>). See [what ChangeDetectorRef does](/interview-question/what-does-changedetectorref-do).

## 6. How It Relates to the Rest of the Test

- **Lifecycle hooks run inside it.** The first <code>detectChanges()</code> (or the first scheduled render) is what triggers <code>ngOnInit</code>, <code>ngAfterViewInit</code> and friends, so a test that never renders never initialises the component. See [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks).
- **Signals make most manual calls unnecessary.** A component built on [signals](/interview-question/what-are-angular-signals) notifies Angular whenever state changes, so <code>await fixture.whenStable()</code> is enough. The signal-specific testing techniques are in [unit testing components with Signals](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed).
- **Effects are separate.** Root effects are flushed by <code>TestBed.tick()</code> (the 22.2.3 typings mark <code>TestBed.flushEffects()</code> as deprecated in its favour).

## 7. Common Pitfalls

- **Asserting before the first render.** The elements exist after <code>createComponent()</code> but their text is empty, so <code>querySelector('p').textContent</code> is <code>""</code>, not <code>undefined</code>. It looks like a broken binding; it is a missing render.
- **Mutating a plain field and expecting <code>detectChanges()</code> to show it.** Under the v22 OnPush default the view is skipped. Use a signal, <code>setInput()</code>, or the component's own <code>markForCheck()</code>.
- **Calling <code>markForCheck()</code> on <code>fixture.componentRef.changeDetectorRef</code>.** That is the host view; in our run it did not refresh the OnPush component below it.
- **Reading <code>NG0100</code> as an Angular bug.** In a zoneless test it almost always means a value changed with no notification, or a hook wrote to a bound field after it rendered (see [afterRender and afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks) for a better place to do post-render work).
- **Mixing <code>whenStable()</code> with fake timers.** With <code>vi.useFakeTimers()</code> active, <code>whenStable()</code> was still pending after 200 real ms in our run, because the scheduler timer it waits for is fake. Use <code>detectChanges()</code> there.
- **Sprinkling <code>detectChanges()</code> everywhere "just in case".** Each call is a full pass plus a check pass; in a zoneless suite most calls can become one <code>await fixture.whenStable()</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> runs one synchronous change detection pass for the test component, then a dev-mode <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkNoChanges()</code> pass."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why you need it:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent()</code> builds the elements but renders no bindings; nothing, not even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>, runs until change detection does."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The v22 twist:</strong> <span style="color:#f0e2c8;">"The TestBed is zoneless and auto-detects by default, so the CLI spec uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> and Angular renders on its own."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The OnPush trap:</strong> <span style="color:#f0e2c8;">"Components are OnPush by default, so a plain field write is skipped; use signals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput()</code> or the component's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I still call it:</strong> <span style="color:#f0e2c8;">"When I need the DOM updated synchronously, inside fake timers, or in a Zone-based suite with auto detect off."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">detectChanges()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">whenStable()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code> renders now, synchronously, and returns. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whenStable()</code> is a promise that resolves once the fixture has no pending work; in a zoneless TestBed that includes the scheduled render, so awaiting it lets Angular render the way the app would.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">detectChanges()</code> sometimes throw <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NG0100</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkNoChanges()</code> afterwards in dev mode. If a binding value differs on that second read, for example a hook wrote to a field after it rendered, or a zoneless test mutated a field without notifying Angular, it throws ExpressionChangedAfterItHasBeenCheckedError.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">I set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">component.name = 'x'</code> and called <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">detectChanges()</code>, but the DOM did not change. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">OnPush is the default in v22, and a plain property write does not mark the view dirty, so the refresh pass skips it. Make the state a signal, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput()</code> for inputs, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> on the component's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ChangeDetectorRef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">detectChanges()</code> run lifecycle hooks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The first pass runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code> and the view hooks, and later passes run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngDoCheck</code> and the after-checked hooks. That is why a test that never renders never initialises the component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should I call it inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vi.useFakeTimers()</code> tests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, that is the clean pattern. The zoneless scheduler uses a timer too, so with fake timers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whenStable()</code> can stay pending; advancing time and calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code> is deterministic.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ComponentFixture** | Test handle for a created component: instance, DOM, render controls |
| **detectChanges()** | Run one synchronous render pass now, then a check pass |
| **checkNoChanges()** | Dev-mode re-read of every binding; throws NG0100 if anything moved |
| **NG0100** | ExpressionChangedAfterItHasBeenCheckedError |
| **whenStable()** | Promise that resolves when the fixture has no pending work |
| **OnPush** | Only refresh a view that was marked dirty; the v22 default |
| **markForCheck()** | Mark a view and its ancestors dirty so the next pass refreshes it |
| **setInput()** | Set an input through Angular, which also marks the view dirty |

---
**Conclusion:** <code>fixture.detectChanges()</code> is the synchronous "render now" button of a component test: one refresh pass over the dirty views, then a dev-mode check that throws <code>NG0100</code> if anything moved. On Angular 22 the defaults change how often you need it. The TestBed is zoneless and already auto-detects, so <code>await fixture.whenStable()</code> is the realistic default, and components are OnPush, so a plain field write is invisible until something marks the view dirty. Keep <code>detectChanges()</code> for precise synchronous steps and fake-timer tests, and treat an <code>NG0100</code> as a message that some state changed without telling Angular.`,
    examples: [
      {
        label: "detectChanges() vs whenStable(), OnPush and NG0100 (Vitest, ran with ng test on Angular 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({
  selector: 'app-badge',
  template: \`<p class="name">{{ name }}</p><p class="count">{{ count() }}</p>\`,
})
class Badge {
  cdr = inject(ChangeDetectorRef);
  name = 'Ada'; // a plain field
  count = signal(0); // a signal
}

@Component({
  selector: 'app-late-writer',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: \`<p>{{ label }}</p>\`,
})
class LateWriter {
  label = 'first';
  ngAfterViewInit() {
    this.label = 'second'; // changes a value the view already rendered
  }
}

const text = (f: { nativeElement: HTMLElement }, css: string) => f.nativeElement.querySelector(css)?.textContent;

describe('fixture.detectChanges()', () => {
  it('nothing is rendered until the first change detection', () => {
    const fixture = TestBed.createComponent(Badge);
    expect(fixture.nativeElement.textContent).toBe('');
    fixture.detectChanges();
    expect(text(fixture, '.name')).toBe('Ada');
  });

  it('signals: detectChanges() renders synchronously, whenStable() asynchronously', async () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.detectChanges();

    fixture.componentInstance.count.set(5);
    expect(text(fixture, '.count')).toBe('0'); // not yet
    fixture.detectChanges();
    expect(text(fixture, '.count')).toBe('5'); // now, synchronously

    fixture.componentInstance.count.set(6);
    await fixture.whenStable(); // let the zoneless scheduler do it
    expect(text(fixture, '.count')).toBe('6');
  });

  it('OnPush (the v22 default): a plain field change needs markForCheck()', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.detectChanges();

    fixture.componentInstance.name = 'Grace';
    fixture.detectChanges();
    expect(text(fixture, '.name')).toBe('Ada'); // the view was not dirty, so it was skipped

    fixture.componentInstance.cdr.markForCheck(); // the component's own ChangeDetectorRef
    fixture.detectChanges();
    expect(text(fixture, '.name')).toBe('Grace');
  });

  it('detectChanges() also runs checkNoChanges() in dev mode', () => {
    const fixture = TestBed.createComponent(LateWriter);
    expect(() => fixture.detectChanges()).toThrow(/NG0100: ExpressionChangedAfterItHasBeenCheckedError/);
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is ComponentFixtureAutoDetect and how does it affect unit tests?",
    seoDescription:
      "ComponentFixtureAutoDetect makes a TestBed fixture run change detection by itself. How it behaves with Zone.js, and why zoneless Angular 22 turns it on.",
    description: `**Question presented to candidate:**
"Some of our older specs provide \`ComponentFixtureAutoDetect\` and never call \`detectChanges()\`; the newer ones never mention it. What does that token do, and how does its behaviour differ between a Zone.js project and a zoneless Angular 22 project?"

**What a strong answer should cover:**
- \`ComponentFixtureAutoDetect\` is an **injection token** read when a fixture is created; \`true\` makes the fixture **re-render automatically**, like a running app would.
- **With Zone.js** the default is **off**: you call \`detectChanges()\` after every change. Turned on, change detection runs at the end of each **zone turn** (events, timers, promises started inside \`NgZone\`), but a direct write from the test body is still missed.
- **Zoneless** (the Angular 22 default), auto detect is **on by default**; signals, template events and \`setInput()\` schedule a render, and \`await fixture.whenStable()\` waits for it.
- In zoneless mode you **cannot turn it off**: \`fixture.autoDetectChanges(false)\` throws; providing the token as \`false\` leaves the fixture unable to render.
- \`fixture.autoDetectChanges()\` is the per-fixture equivalent of providing the token as true.
- Auto detect does not remove the need to **await**: rendering is still asynchronous.

**Clarifying questions expected:**
- "Does the project still load Zone.js, or is it zoneless?"
- "Are the components using signals, or plain fields?"

**Code / implementation expected:** Yes — a spec that shows the default zoneless behaviour, and one Zone-based spec with the token on and off.`,
    answer: `**Target Audience:** Developers maintaining Angular test suites, especially ones migrating Zone-based specs to a zoneless Angular 22 project.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Two workspaces were used, both on Angular CLI 22.2.3 with Vitest: the default zoneless one from <code>ng new</code>, and a copy that loads zone.js 0.16.3 so the Zone behaviour could be run too. Every behaviour below comes from those runs or from the 22.2.3 <code>@angular/core/testing</code> source.

## 1. Why This Even Matters — A Story First

Think of a photographer at a wedding. One kind only takes a photo when you tap them on the shoulder and say "now". Another kind keeps shooting whenever something happens.

A test fixture is the photographer, and the photo is the rendered DOM. **<code>ComponentFixtureAutoDetect</code>** is the switch between "only when told" and "keep shooting". For years Angular fixtures defaulted to "only when told", which is why so many specs are full of [<code>fixture.detectChanges()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-). [Zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) Angular flips the default, and specs written for the old world start behaving differently. Knowing which photographer you have explains a lot of confusing test failures.

## 2. The Core Idea

📌 **Interview term: <code>ComponentFixtureAutoDetect</code>** — an <code>InjectionToken&lt;boolean&gt;</code> exported from <code>@angular/core/testing</code>. A fixture reads it once, when it is created. <code>true</code> means the fixture registers itself for automatic change detection. You provide it like any other token, <code>{ provide: ComponentFixtureAutoDetect, useValue: true }</code>; see [what an InjectionToken is](/interview-question/what-is-an-injectiontoken).

📌 **Interview term: <code>fixture.autoDetectChanges()</code>** — the per-fixture version: turns auto detection on for one fixture and immediately runs one <code>detectChanges()</code>. The 22.2.3 typings deprecate the <code>autoDetectChanges(false)</code> form ("We have not seen a use-case for <code>autoDetect: false</code>").

📌 **Interview term: Zone turn** — with [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon), the moment a task started inside the Angular zone (a click handler, a <code>setTimeout</code> it scheduled, a promise) finishes. Zone-based auto detection runs change detection at the end of each one.

📌 **Interview term: Zoneless scheduler** — in a zoneless app, signals, template listeners, <code>setInput()</code> and <code>markForCheck()</code> call a scheduler that queues a render. A zoneless fixture with auto detect on simply participates in that, exactly like the app. See [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).

The default comes straight from the 22.2.3 source of <code>ComponentFixture</code>:

\`\`\`
autoDetectDefault = this.zonelessEnabled ? true : false;
autoDetect = inject(ComponentFixtureAutoDetect, { optional: true }) ?? this.autoDetectDefault;
\`\`\`

## 3. Two Fixtures, Two Defaults

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Zoneless fixtures render automatically after a signal change, Zone fixtures with auto detect off render only when detectChanges is called">
  <defs>
    <marker id="ad13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="30">Zoneless TestBed: auto detect ON by default</text>
  <rect class="d-box" x="20" y="50" width="170" height="56" rx="10"/>
  <text class="d-text" x="105" y="83" text-anchor="middle">count.set(41)</text>
  <path class="d-edge-accent" d="M 194 78 L 246 78" marker-end="url(#ad13-arrow)"/>
  <rect class="d-box-accent" x="252" y="50" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="352" y="83" text-anchor="middle">scheduler queues render</text>
  <path class="d-edge-accent" d="M 456 78 L 508 78" marker-end="url(#ad13-arrow)"/>
  <rect class="d-box" x="514" y="50" width="220" height="56" rx="10"/>
  <text class="d-text" x="624" y="83" text-anchor="middle">DOM shows 41</text>
  <text class="d-text" x="20" y="160">Zone TestBed: auto detect OFF by default</text>
  <rect class="d-box" x="20" y="180" width="170" height="56" rx="10"/>
  <text class="d-text" x="105" y="213" text-anchor="middle">click, timer fires</text>
  <path class="d-edge-dashed" d="M 194 208 L 246 208" marker-end="url(#ad13-arrow)"/>
  <rect class="d-box-muted" x="252" y="180" width="200" height="56" rx="10"/>
  <text class="d-text" x="352" y="213" text-anchor="middle">nothing happens</text>
  <path class="d-edge" d="M 456 208 L 508 208" marker-end="url(#ad13-arrow)"/>
  <rect class="d-box" x="514" y="180" width="220" height="56" rx="10"/>
  <text class="d-text" x="624" y="213" text-anchor="middle">until detectChanges()</text>
</svg>

In the [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) row, the change notifies a scheduler and the fixture renders without help. In the Zone row with the token unset, the zone notices the timer finishing, but the fixture is not subscribed, so the DOM waits for an explicit call.

## 4. Verified: the zoneless default

<code>autodetect.spec.ts</code> (first example), run with <code>ng test --watch=false</code> in the default workspace:

\`\`\`
✓ ComponentFixtureAutoDetect in a zoneless (default) TestBed > auto detection is already on: signals and clicks render by themselves
✓ ComponentFixtureAutoDetect in a zoneless (default) TestBed > turning it off is not supported when zoneless
✓ ComponentFixtureAutoDetect in a zoneless (default) TestBed > the provider set to false: the component never renders
\`\`\`

What those tests asserted:

| Step | Observed |
| :--- | :--- |
| Right after <code>createComponent()</code> | span text <code>""</code>: the first render is scheduled, not synchronous |
| <code>await fixture.whenStable()</code> | <code>0</code> |
| <code>count.set(41)</code> then a real 20 ms wait, **no Angular call at all** | <code>41</code> |
| <code>button.click()</code>, read synchronously | still <code>41</code> |
| <code>await fixture.whenStable()</code> | <code>42</code> |
| <code>fixture.autoDetectChanges(false)</code> | throws <code>Cannot set autoDetect to false with zoneless change detection.</code> |
| providers <code>{ provide: ComponentFixtureAutoDetect, useValue: false }</code> | never renders; even [<code>detectChanges()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-) threw <code>NG0100</code> |

The last row is the surprising one. The provider is accepted silently, but the fixture is then never registered with the scheduler, and its first <code>detectChanges()</code> threw <code>NG0100 ... Previous value: 'undefined'. Current value: '0' ... It seems like the view has been created after its parent and its children have been dirty checked</code>. Treat it as unsupported in zoneless mode; the error message from <code>autoDetectChanges(false)</code> says as much.

## 5. Verified: the Zone.js behaviour

The second example, <code>autodetect-zone.spec.ts</code>, ran in the Zone copy of the workspace (<code>zone.js</code> + <code>zone.js/testing</code> polyfills, <code>provideZoneChangeDetection()</code> in the testing module, an Eager component so a plain field is re-read):

\`\`\`
✓ ComponentFixtureAutoDetect with Zone.js > off (the Zone default): you call detectChanges() after every change
✓ ComponentFixtureAutoDetect with Zone.js > on: every zone turn ends with change detection
\`\`\`

- **Off:** after a click whose <code>setTimeout</code> changed the field and <code>await fixture.whenStable()</code>, the DOM still said <code>Hello Ada</code>; one <code>detectChanges()</code> showed <code>Hello Grace</code>.
- **On:** the same click plus <code>await fixture.whenStable()</code> showed <code>Hello Grace</code> with no <code>detectChanges()</code>. But a direct <code>fixture.componentInstance.name = 'Linus'</code> from the test body was **not** picked up until <code>detectChanges()</code>, because it was not a task inside the Angular zone.
- **Not synchronous even when on:** right after <code>createComponent()</code> the text was still empty; it took <code>await fixture.whenStable()</code> to see the first render.

An extra probe: when zone.js is loaded, the TestBed is zone-based even without <code>provideZoneChangeDetection()</code> (the fixture reported <code>zonelessEnabled: false</code> and the injected [<code>NgZone</code>](/interview-question/what-is-ngzone-and-when-do-you-run-outside-angular) was a real <code>NgZone</code>). So loading zone.js in your test polyfills silently changes the auto-detect default back to off.

## 6. Side by Side

| | Zone.js TestBed | Zoneless TestBed (v22 default) |
| :--- | :--- | :--- |
| Default | Off | On |
| What triggers a render when on | End of each zone turn | [Signals](/interview-question/what-are-angular-signals), template events, <code>setInput()</code>, [<code>markForCheck()</code>](/interview-question/what-does-changedetectorref-do) |
| Direct field write from the test | Not seen until <code>detectChanges()</code> | Not seen; under OnPush it is skipped entirely |
| Turning it off | Default, or provide <code>false</code> | Not supported (<code>autoDetectChanges(false)</code> throws) |
| Typical await | <code>await fixture.whenStable()</code> after async work | <code>await fixture.whenStable()</code> after any change |
| Manual <code>detectChanges()</code> | After every change when off | Only for synchronous steps or fake timers ([detectChanges](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-)) |

## 7. Migrating Old Specs

- **Many <code>detectChanges()</code> calls keep working** in zoneless mode, as long as the state they render is a signal or was set with <code>setInput()</code>; they are just redundant.
- **Specs that mutate plain fields break.** Under zoneless plus [OnPush](/interview-question/what-does-changedetectorref-do) the view is never marked dirty. Convert that state to [signals](/interview-question/what-are-angular-signals), or call <code>markForCheck()</code> on the component.
- **Specs that relied on <code>ComponentFixtureAutoDetect: true</code>** can drop the provider; zoneless already behaves that way.
- **Specs that relied on auto detect being off** (asserting on a stale DOM on purpose) need rethinking; there is no off switch.
- **Timer-based specs** that used <code>fakeAsync</code> need zone.js; see [fakeAsync, tick and waitForAsync](/interview-question/what-is-the-difference-between-fakeasync-tick-and-waitforasync-in-angular-unit-t) for the zoneless alternatives.

## 8. Common Pitfalls

- **Assuming auto detect means synchronous.** Even when on, both Zone and zoneless fixtures render later; read the DOM after <code>await fixture.whenStable()</code>.
- **Providing <code>ComponentFixtureAutoDetect: false</code> in a zoneless suite** to "get control back". It is accepted, then the component never renders and <code>detectChanges()</code> throws <code>NG0100</code>.
- **Adding zone.js to test polyfills for one [<code>fakeAsync</code>](/interview-question/what-is-the-difference-between-fakeasync-tick-and-waitforasync-in-angular-unit-t) spec.** The whole TestBed becomes zone-based and auto detect defaults to off for every spec in that run.
- **Expecting Zone auto detect to see writes from the test body.** Only tasks started inside the Angular zone count; a direct assignment is not one.
- **Forgetting OnPush.** Auto detect only renders dirty views; a plain field on an OnPush component stays stale with auto detect on or off. See [ChangeDetectorRef](/interview-question/what-does-changedetectorref-do).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentFixtureAutoDetect</code> is an injection token a fixture reads at creation; true means the fixture re-renders by itself, like a running app."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Zone.js world:</strong> <span style="color:#f0e2c8;">"With Zone.js it is off by default, so you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code> after each change; turned on, it renders after every Angular zone turn."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Zoneless world:</strong> <span style="color:#f0e2c8;">"In a zoneless Angular 22 TestBed it is on by default and follows the same scheduler as the app: signals, events and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput()</code> queue a render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The catch:</strong> <span style="color:#f0e2c8;">"Auto detect is still asynchronous, so I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>, and in zoneless mode it cannot be turned off; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">autoDetectChanges(false)</code> throws."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration advice:</strong> <span style="color:#f0e2c8;">"Drop the provider in zoneless suites, move test state into signals or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput()</code>, and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code> for synchronous steps."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">autoDetectChanges()</code> the same as providing the token?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Close. The token applies to every fixture created in that testing module; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.autoDetectChanges()</code> turns it on for one fixture and immediately runs one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">With Zone auto detect on, why did my direct property write not render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Zone auto detection runs at the end of a task inside the Angular zone. An assignment in the test body is not such a task, so nothing triggers; call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code>, or trigger the change through a click or a timer the component starts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I turn auto detect off in a zoneless test to assert on a stale DOM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.autoDetectChanges(false)</code> throws 'Cannot set autoDetect to false with zoneless change detection.', and providing the token as false left the fixture unable to render in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does auto detect remove the need for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">whenStable()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In both modes the render is scheduled, not synchronous; right after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent()</code> the text was empty even with auto detect on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to the default if a test setup loads zone.js?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The TestBed becomes zone-based, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zonelessEnabled</code> is false, and the auto-detect default goes back to off for every fixture in that run.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ComponentFixtureAutoDetect** | Token that makes a fixture re-render by itself |
| **autoDetectChanges()** | Turn auto detection on for one fixture and render once |
| **Zone turn** | The end of a task started inside the Angular zone |
| **Zoneless scheduler** | Queues a render when signals, events or setInput report a change |
| **whenStable()** | Promise that resolves when no work is pending |
| **provideZoneChangeDetection()** | Opt a TestBed or app back into Zone-based change detection |

---
**Conclusion:** <code>ComponentFixtureAutoDetect</code> decides whether a fixture re-renders by itself. With Zone.js it is off by default and, when on, renders after each Angular zone turn but still misses direct writes from the test body. In a zoneless Angular 22 TestBed it is on by default, cannot be switched off, and simply follows the same scheduler as the app, as the runs above showed. So the modern spec writes state through signals or <code>setInput()</code>, awaits <code>fixture.whenStable()</code>, and only reaches for <code>detectChanges()</code> when it needs a synchronous step.`,
    examples: [
      {
        label: "Zoneless default: auto detect is on and cannot be turned off (Vitest, ran with ng test on Angular 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal } from '@angular/core';
import { ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

@Component({
  selector: 'app-counter',
  template: \`<button (click)="count.set(count() + 1)">+</button><span>{{ count() }}</span>\`,
})
class Counter {
  count = signal(0);
}

const span = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('span')?.textContent;
const realWait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ComponentFixtureAutoDetect in a zoneless (default) TestBed', () => {
  it('auto detection is already on: signals and clicks render by themselves', async () => {
    const fixture = TestBed.createComponent(Counter);
    expect(span(fixture)).toBe(''); // elements exist, but the first render is scheduled
    await fixture.whenStable();
    expect(span(fixture)).toBe('0');

    fixture.componentInstance.count.set(41);
    await realWait(20); // no Angular call at all
    expect(span(fixture)).toBe('41');

    fixture.nativeElement.querySelector('button').click();
    expect(span(fixture)).toBe('41'); // the click marked the view dirty...
    await fixture.whenStable();
    expect(span(fixture)).toBe('42'); // ...and the scheduler rendered it
  });

  it('turning it off is not supported when zoneless', () => {
    const fixture = TestBed.createComponent(Counter);
    expect(() => fixture.autoDetectChanges(false)).toThrow(
      'Cannot set autoDetect to false with zoneless change detection.',
    );
  });

  it('the provider set to false: the component never renders', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: false }],
    });
    const fixture = TestBed.createComponent(Counter);
    await fixture.whenStable();
    expect(span(fixture)).toBe(''); // still never rendered
    expect(() => fixture.detectChanges()).toThrow(/NG0100/);
  });
});`,
      },
      {
        label: "Zone.js workspace: ComponentFixtureAutoDetect off vs on (ran with zone.js 0.16.3 + vitest-patch)",
        tech: "angular",
        runnable: false,
        code: `// Runs in a workspace that loads zone.js + zone.js/testing as polyfills and
// zone.js/plugins/vitest-patch as a setup file, with Zone-based change detection.
import { ChangeDetectionStrategy, Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

@Component({
  selector: 'app-greeting',
  // Classic Zone-era component: Eager, so a plain field is re-read on every check.
  changeDetection: ChangeDetectionStrategy.Eager,
  template: \`<p>Hello {{ name }}</p><button (click)="rename('Grace')">rename</button>\`,
})
class Greeting {
  name = 'Ada';
  rename(next: string) {
    setTimeout(() => (this.name = next), 10); // a plain field, changed later
  }
}

const p = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('p')?.textContent ?? '';
const click = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('button')!.click();

describe('ComponentFixtureAutoDetect with Zone.js', () => {
  it('off (the Zone default): you call detectChanges() after every change', async () => {
    TestBed.configureTestingModule({ providers: [provideZoneChangeDetection()] });
    const fixture = TestBed.createComponent(Greeting);
    expect(p(fixture)).toBe(''); // created, but not rendered yet
    fixture.detectChanges();
    expect(p(fixture)).toBe('Hello Ada');

    click(fixture);
    await fixture.whenStable(); // the zone timer has fired...
    expect(p(fixture)).toBe('Hello Ada'); // ...but nobody told the fixture to render
    fixture.detectChanges();
    expect(p(fixture)).toBe('Hello Grace');
  });

  it('on: every zone turn ends with change detection', async () => {
    TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), { provide: ComponentFixtureAutoDetect, useValue: true }],
    });
    const fixture = TestBed.createComponent(Greeting);
    expect(p(fixture)).toBe(''); // not synchronous: the first render is scheduled
    await fixture.whenStable();
    expect(p(fixture)).toBe('Hello Ada');

    click(fixture); // listener runs inside NgZone, so its setTimeout is tracked
    await fixture.whenStable();
    expect(p(fixture)).toBe('Hello Grace'); // rendered with no detectChanges() call

    fixture.componentInstance.name = 'Linus'; // a direct write from the test body
    expect(p(fixture)).toBe('Hello Grace'); // is not a zone task, so autoDetect misses it
    fixture.detectChanges();
    expect(p(fixture)).toBe('Hello Linus');
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between fakeAsync, tick, and waitForAsync in Angular unit tests?",
    seoDescription:
      "fakeAsync and tick fake time synchronously; waitForAsync waits for real async work. Both need Zone.js. What zoneless Angular 22 Vitest tests use instead.",
    description: `**Question presented to candidate:**
"A component shows a toast 500 ms after a click. Explain how you would test it with \`fakeAsync\` and \`tick\`, how \`waitForAsync\` differs, and what changes in a new Angular 22 project that runs Vitest without Zone.js."

**What a strong answer should cover:**
- \`fakeAsync\` runs the test in a **fake async zone**: timers do not really wait, and the test body stays **synchronous**.
- \`tick(ms)\` advances **virtual time** and runs due timers; \`flush()\` drains all timers and returns the virtual ms skipped; \`flushMicrotasks()\` drains promises only.
- \`waitForAsync\` runs the test in an **async test zone** with **real time** and finishes the test only when every task in the zone has completed.
- Both are **Zone.js features**: without \`zone.js/testing\` they throw or reject; under Vitest they also need \`zone.js/plugins/vitest-patch\` to create the ProxyZone.
- In a **zoneless** Angular 22 project the idiomatic replacements are \`vi.useFakeTimers()\` + \`vi.advanceTimersByTime()\` + \`fixture.detectChanges()\`, or plain \`async\`/\`await\` with \`fixture.whenStable()\`.
- \`fakeAsync\` throws at the end if timers are still pending only when \`{ flush: false }\` is passed; by default it flushes them.

**Clarifying questions expected:**
- "Does the project load Zone.js, and which runner: Vitest or Karma/Jasmine?"
- "Is the delay a timer, a promise, or an HTTP call?"

**Code / implementation expected:** Yes — a Zone-based spec using \`fakeAsync\`/\`tick\`/\`flush\`/\`waitForAsync\`, and the zoneless equivalent with Vitest fake timers.`,
    answer: `**Target Audience:** Developers testing timing-dependent Angular code (debounces, toasts, polling, delayed loads), especially when moving to Angular 22 defaults.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Everything quoted was run with Angular CLI 22.2.3 (<code>ng test --watch=false</code>, Vitest 5): the zoneless example in the default <code>ng new</code> workspace, the Zone example in a copy that loads zone.js 0.16.3. Error messages are copied from those runs.

## 1. Why This Even Matters — A Story First

Imagine testing a microwave that beeps after 90 seconds. You could stand there for 90 real seconds (slow, but honest). Or you could open the back and turn the clock's hands forward by hand, then check the beep (instant, but you need a microwave with a clock you can reach).

**<code>waitForAsync</code>** is standing there and waiting until nothing is left running. **<code>fakeAsync</code> + <code>tick</code>** is turning the hands yourself. Both rely on [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon) being able to see every timer the component starts. Angular 22 apps no longer ship Zone.js, so the honest interview answer has a second half: what you do when the clock is not reachable that way.

## 2. The Core Idea

📌 **Interview term: Zone** — a Zone.js execution context that intercepts async work (timers, promises, events). Testing zones use that interception to control or wait for it. Background: [what Zone.js is](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon).

📌 **Interview term: <code>fakeAsync(fn)</code>** — runs <code>fn</code> in a fake async zone. Timers are queued instead of scheduled, so nothing waits in real time, and the test body is **synchronous**: you cannot <code>await</code> real work inside it.

📌 **Interview term: <code>tick(ms)</code>** — advances the fake clock by <code>ms</code>, running every timer that becomes due. Per the 22.2.3 typings it drains the microtask queue at the start and after each timer callback.

📌 **Interview term: <code>flush()</code> / <code>flushMicrotasks()</code>** — <code>flush()</code> runs every pending timer and returns the virtual milliseconds it skipped; <code>flushMicrotasks()</code> runs only pending promise callbacks.

📌 **Interview term: <code>waitForAsync(fn)</code>** — runs <code>fn</code> in an async test zone with **real time**. The test completes when the zone has no pending tasks left, so you do not need <code>await</code> or a <code>done</code> callback.

📌 **Interview term: Fake timers (Vitest)** — <code>vi.useFakeTimers()</code> replaces the global timer functions; <code>vi.advanceTimersByTime(ms)</code> moves time synchronously and <code>vi.advanceTimersByTimeAsync(ms)</code> also lets promises settle between timers. No zone involved.

## 3. Three Clocks

<svg class="iq-diagram" width="100%" viewBox="0 0 780 250" role="img" aria-label="fakeAsync with tick uses a virtual clock and needs Zone.js, waitForAsync uses real time and needs Zone.js, Vitest fake timers use a virtual clock with no zone">
  <rect class="d-box-accent" x="20" y="30" width="230" height="190" rx="12"/>
  <text class="d-text d-accent" x="135" y="62" text-anchor="middle">fakeAsync + tick</text>
  <text class="d-sub" x="135" y="100" text-anchor="middle">virtual clock</text>
  <text class="d-sub" x="135" y="128" text-anchor="middle">synchronous test body</text>
  <text class="d-sub" x="135" y="156" text-anchor="middle">tick(500) is instant</text>
  <text class="d-sub" x="135" y="196" text-anchor="middle">needs zone.js/testing</text>
  <rect class="d-box" x="275" y="30" width="230" height="190" rx="12"/>
  <text class="d-text" x="390" y="62" text-anchor="middle">waitForAsync</text>
  <text class="d-sub" x="390" y="100" text-anchor="middle">real clock</text>
  <text class="d-sub" x="390" y="128" text-anchor="middle">ends when zone is empty</text>
  <text class="d-sub" x="390" y="156" text-anchor="middle">500 ms really passes</text>
  <text class="d-sub" x="390" y="196" text-anchor="middle">needs zone.js/testing</text>
  <rect class="d-box-muted" x="530" y="30" width="230" height="190" rx="12"/>
  <text class="d-text" x="645" y="62" text-anchor="middle">vi.useFakeTimers</text>
  <text class="d-sub" x="645" y="100" text-anchor="middle">virtual clock</text>
  <text class="d-sub" x="645" y="128" text-anchor="middle">no zone at all</text>
  <text class="d-sub" x="645" y="156" text-anchor="middle">advanceTimersByTime</text>
  <text class="d-sub" x="645" y="196" text-anchor="middle">works zoneless</text>
</svg>

The first two are Angular testing helpers built on [Zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon). The third is the test runner's own tool and is what a default Angular 22 project reaches for.

## 4. Verified: what happens in a default Angular 22 project

A new CLI 22.2.3 workspace has no zone.js dependency. <code>timers-zoneless.spec.ts</code> (second example) records what the Zone helpers do there and what to use instead:

\`\`\`
✓ timers in the default CLI setup (Vitest, no zone.js) > fakeAsync and waitForAsync need zone.js
✓ timers in the default CLI setup (Vitest, no zone.js) > Vitest fake timers instead > advance virtual time, render with detectChanges()
✓ timers in the default CLI setup (Vitest, no zone.js) > Vitest fake timers instead > or let the scheduler render: advanceTimersByTimeAsync also runs its timer
✓ timers in the default CLI setup (Vitest, no zone.js) > or plain async/await with real time (simple, but the test really waits)
\`\`\`

The exact failures without Zone.js:

\`\`\`
fakeAsync(...)()   -> throws  "zone-testing.js is needed for the fakeAsync() test helper but could not be found."
tick(10)           -> throws  the same message
waitForAsync(...)() -> rejects "Zone is needed for the waitForAsync() test helper but could not be found. Please make sure that your environment includes zone.js"
\`\`\`

With fake timers the toast test read <code>saving</code> after the click, <code>saving</code> at 499 ms and <code>saved</code> at 500 ms, using <code>vi.advanceTimersByTime()</code> and [<code>fixture.detectChanges()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-). Two details came out of the runs:

- **<code>await fixture.whenStable()</code> hangs under fake timers.** It was still pending after 200 real ms, because the [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) scheduler's own timer is faked too. Use <code>detectChanges()</code>, or advance time.
- **One more frame is needed after the timer.** With <code>await vi.advanceTimersByTimeAsync(500)</code> the signal was already <code>saved</code> but the DOM still said <code>saving</code>; advancing a further 20 ms let the scheduled render run.

## 5. Verified: the Zone helpers under Vitest

The 22.2.3 typings on <code>fakeAsync</code>, <code>tick</code>, <code>flush</code>, <code>flushMicrotasks</code> and <code>resetFakeAsyncZone</code> say: "IMPORTANT: This API requires Zone.js and cannot be used with the Vitest test runner". zone.js 0.16.2 (May 2026, per its CHANGELOG) then added "support vitest patching in zone.js/testing", shipped as <code>zone.js/plugins/vitest-patch</code>. So the copy of the workspace was set up like this:

\`\`\`
// angular.json -> projects.demo.architect.build.options
"polyfills": ["zone.js", "zone.js/testing"]

// src/zone-setup.ts, passed with: ng test --setup-files src/zone-setup.ts
import 'zone.js/plugins/vitest-patch';
\`\`\`

Without the setup file every Zone-based test failed with:

\`\`\`
× tick() moves virtual time forward
  → Expected to be running in 'ProxyZone', but it was not found.
\`\`\`

With it, <code>fake-async-zone.spec.ts</code> (first example) passed:

\`\`\`
✓ fakeAsync / tick / waitForAsync (Zone.js loaded) > tick() moves virtual time forward
✓ fakeAsync / tick / waitForAsync (Zone.js loaded) > flush() runs every pending timer and returns the virtual time it skipped
✓ fakeAsync / tick / waitForAsync (Zone.js loaded) > flushMicrotasks() drains promises but not timers
✓ fakeAsync / tick / waitForAsync (Zone.js loaded) > waitForAsync() keeps the test open until the zone has no pending tasks
✓ fakeAsync / tick / waitForAsync (Zone.js loaded) > ...so the timer had fired before the next test started
✓ fakeAsync / tick / waitForAsync (Zone.js loaded) > a timer left pending: fine by default, an error with { flush: false }
 Test Files  2 passed (2)
      Tests  8 passed (8)
\`\`\`

What those assertions pin down: <code>tick(499)</code> left <code>saving</code>, <code>tick(1)</code> gave <code>saved</code>; <code>flush()</code> returned <code>500</code>; <code>flushMicrotasks()</code> ran the promise callback but not a <code>setTimeout(..., 0)</code> until <code>tick()</code>; the <code>waitForAsync</code> test took about 150 ms of real time and the next test saw the timer had fired; and a pending timer only throws <code>1 timer(s) still in the queue.</code> when you pass <code>{ flush: false }</code>.

So "fakeAsync does not work with Vitest" is out of date for zone.js 0.16.2 and later, but it does require zone.js, which also turns the whole TestBed back into a Zone-based one (auto detect off by default; see [ComponentFixtureAutoDetect](/interview-question/what-is-componentfixtureautodetect-and-how-does-it-affect-unit-tests)).

## 6. Side by Side

| | <code>fakeAsync</code> + <code>tick</code> | <code>waitForAsync</code> | <code>vi.useFakeTimers()</code> | <code>async</code> / <code>await</code> |
| :--- | :--- | :--- | :--- | :--- |
| Time | Virtual | Real | Virtual | Real |
| Test body | Synchronous | Callback style, no await needed | Sync or async | Async |
| Needs zone.js | Yes (+ vitest-patch under Vitest) | Yes (+ vitest-patch) | No | No |
| Render after time moves | [<code>fixture.detectChanges()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-) | <code>fixture.whenStable()</code> then assert | <code>detectChanges()</code>, or advance a frame | <code>await fixture.whenStable()</code> |
| Speed | Instant | As slow as the code | Instant | As slow as the code |
| Best for | Legacy Zone suites with debounces and polling | Legacy specs with promise chains | [Zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) timers, debounces | Simple async flows, HTTP with a testing backend |

Related: debounce-style code is often RxJS ([switchMap and friends](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap)); the same fake-clock rules apply to its timers.

## 7. Common Pitfalls

- **Reaching for <code>fakeAsync</code> in a new Angular 22 project.** It throws <code>zone-testing.js is needed...</code> because there is no zone.js; use Vitest fake timers instead.
- **Adding zone.js only to get <code>fakeAsync</code>.** It works with <code>zone.js/plugins/vitest-patch</code>, but it flips every spec in the run to a Zone-based TestBed, so [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) behaviour is no longer what you test.
- **Calling <code>await fixture.whenStable()</code> with fake timers active.** It stays pending; the scheduler timer is fake too. Advance time or call [<code>detectChanges()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-).
- **Asserting right after the timer fired.** With the zoneless scheduler, the state changes first and the render a frame later.
- **Test order leaks between Zone helpers.** In our run, a <code>waitForAsync</code> test placed after a test that invoked a throwing <code>fakeAsync(...)()</code> inline timed out after 5000 ms, even with <code>resetFakeAsyncZone()</code> in <code>afterEach</code>; the same test passed when it ran first. Keep <code>fakeAsync</code> as the test function itself rather than calling it inside one.
- **Expecting <code>fakeAsync</code> to fail on leftover timers.** By default it flushes them; pass <code>{ flush: false }</code> if you want that safety net.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The short version:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> runs the test on a fake clock and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick(ms)</code> moves it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">waitForAsync</code> uses the real clock and ends the test when the zone has no pending work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How they feel:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> body is synchronous and instant; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">waitForAsync</code> test really takes as long as the code under test."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The helpers around them:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush()</code> drains every timer and returns the virtual time, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushMicrotasks()</code> drains only promises, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ flush: false }</code> makes leftover timers an error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The Angular 22 catch:</strong> <span style="color:#f0e2c8;">"Both are Zone.js features. A new v22 project has no zone.js, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fakeAsync</code> throws; under Vitest it also needs the zone.js vitest patch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I use now:</strong> <span style="color:#f0e2c8;">"For zoneless code, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.useFakeTimers()</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.advanceTimersByTime()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code>, or plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fakeAsync</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the body runs synchronously in the fake zone; real async work never completes inside it. You move time with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flush()</code> instead, and promise callbacks run when microtasks are flushed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tick()</code> do with promises?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It drains the microtask queue at the start and after each timer callback, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then()</code> scheduled by a timer runs during the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tick()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushMicrotasks()</code> does only that part.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">waitForAsync</code> the same as an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code> test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code> test waits only for what you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">waitForAsync</code> waits for every task started in its zone, including timers you never awaited, which is why it needs Zone.js.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a 300 ms debounce in a zoneless app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.useFakeTimers()</code>, trigger the input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.advanceTimersByTime(300)</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.detectChanges()</code> and assert. Do not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> while fake timers are on; it waits on a faked timer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fakeAsync</code> run under Vitest at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with zone.js 0.16.2 or later: load <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zone.js</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zone.js/testing</code> as polyfills and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zone.js/plugins/vitest-patch</code> as a setup file. Without the patch every test fails with 'Expected to be running in ProxyZone'.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **fakeAsync** | Run a test on a fake clock inside a Zone.js testing zone |
| **tick(ms)** | Move the fake clock forward and run due timers |
| **flush()** | Run every pending fake timer; returns the virtual ms skipped |
| **flushMicrotasks()** | Run pending promise callbacks only |
| **waitForAsync** | Finish the test when the real async work in the zone is done |
| **ProxyZone** | The zone a patched test runner wraps each test in; the helpers need it |
| **vitest-patch** | <code>zone.js/plugins/vitest-patch</code>, which wraps Vitest tests in a ProxyZone |
| **vi.useFakeTimers** | Vitest fake clock that works without any zone |

---
**Conclusion:** <code>fakeAsync</code> and <code>tick</code> move a fake clock inside a synchronous test, <code>waitForAsync</code> waits on the real clock until the zone is empty, and both are Zone.js features. On Angular 22 that matters: a default project has no zone.js, and the runs above showed <code>fakeAsync</code> throwing and <code>waitForAsync</code> rejecting there. They do work under Vitest once zone.js, <code>zone.js/testing</code> and the 0.16.2+ vitest patch are loaded, at the cost of a Zone-based TestBed. For new zoneless code, Vitest fake timers plus <code>fixture.detectChanges()</code>, or plain <code>await fixture.whenStable()</code>, are the direct replacements.`,
    examples: [
      {
        label: "Zone.js workspace: fakeAsync, tick, flush, flushMicrotasks and waitForAsync under Vitest (zone.js 0.16.3 + vitest-patch)",
        tech: "angular",
        runnable: false,
        code: `// Needs zone.js + zone.js/testing in the build polyfills and
// zone.js/plugins/vitest-patch as a Vitest setup file (see the answer).
import { Component, signal } from '@angular/core';
import { TestBed, fakeAsync, flush, flushMicrotasks, tick, waitForAsync } from '@angular/core/testing';

@Component({
  selector: 'app-toast',
  template: \`<button (click)="save()">Save</button><p>{{ status() }}</p>\`,
})
class Toast {
  status = signal('idle');
  save() {
    this.status.set('saving');
    setTimeout(() => this.status.set('saved'), 500);
  }
}

const p = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('p')!.textContent;

describe('fakeAsync / tick / waitForAsync (Zone.js loaded)', () => {
  it('tick() moves virtual time forward', fakeAsync(() => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(p(fixture)).toBe('saving');

    tick(499); // 499 virtual ms, returns instantly
    fixture.detectChanges();
    expect(p(fixture)).toBe('saving');

    tick(1);
    fixture.detectChanges();
    expect(p(fixture)).toBe('saved');
  }));

  it('flush() runs every pending timer and returns the virtual time it skipped', fakeAsync(() => {
    const fixture = TestBed.createComponent(Toast);
    fixture.componentInstance.save();
    expect(flush()).toBe(500);
    expect(fixture.componentInstance.status()).toBe('saved');
  }));

  it('flushMicrotasks() drains promises but not timers', fakeAsync(() => {
    const order: string[] = [];
    Promise.resolve().then(() => order.push('microtask'));
    setTimeout(() => order.push('timer'), 0);
    flushMicrotasks();
    expect(order).toEqual(['microtask']);
    tick();
    expect(order).toEqual(['microtask', 'timer']);
  }));

  let fired = false;
  it('waitForAsync() keeps the test open until the zone has no pending tasks', waitForAsync(() => {
    setTimeout(() => (fired = true), 150); // a REAL 150 ms wait, no done() or await needed
  }));
  it('...so the timer had fired before the next test started', () => {
    expect(fired).toBe(true);
  });

  it('a timer left pending: fine by default, an error with { flush: false }', () => {
    expect(() => fakeAsync(() => setTimeout(() => {}, 1000))()).not.toThrow();
    expect(() => fakeAsync(() => setTimeout(() => {}, 1000), { flush: false })()).toThrow(
      '1 timer(s) still in the queue.',
    );
  });
});`,
      },
      {
        label: "Default zoneless workspace: what the Zone helpers do, and the Vitest fake-timer replacement",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal } from '@angular/core';
import { TestBed, fakeAsync, waitForAsync } from '@angular/core/testing';

@Component({
  selector: 'app-toast',
  template: \`<button (click)="save()">Save</button><p>{{ status() }}</p>\`,
})
class Toast {
  status = signal('idle');
  save() {
    this.status.set('saving');
    setTimeout(() => this.status.set('saved'), 500);
  }
}

const p = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('p')!.textContent;

describe('timers in the default CLI setup (Vitest, no zone.js)', () => {
  it('fakeAsync and waitForAsync need zone.js', async () => {
    expect(() => fakeAsync(() => {})()).toThrow(
      'zone-testing.js is needed for the fakeAsync() test helper but could not be found.',
    );
    await expect((waitForAsync(() => {}) as any)()).rejects.toMatch('Zone is needed for the waitForAsync() test helper');
  });

  describe('Vitest fake timers instead', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('advance virtual time, render with detectChanges()', () => {
      const fixture = TestBed.createComponent(Toast);
      fixture.detectChanges();
      fixture.nativeElement.querySelector('button').click();
      fixture.detectChanges();
      expect(p(fixture)).toBe('saving');

      vi.advanceTimersByTime(499);
      fixture.detectChanges();
      expect(p(fixture)).toBe('saving');

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(p(fixture)).toBe('saved');
    });

    it('or let the scheduler render: advanceTimersByTimeAsync also runs its timer', async () => {
      const fixture = TestBed.createComponent(Toast);
      await vi.advanceTimersByTimeAsync(0);
      expect(p(fixture)).toBe('idle');
      fixture.nativeElement.querySelector('button').click();
      await vi.advanceTimersByTimeAsync(500); // fires save()'s timer
      expect(p(fixture)).toBe('saving'); // the render it triggered is still queued
      await vi.advanceTimersByTimeAsync(20); // one more frame
      expect(p(fixture)).toBe('saved');
    });
  });

  it('or plain async/await with real time (simple, but the test really waits)', async () => {
    const fixture = TestBed.createComponent(Toast);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button').click();
    await new Promise((r) => setTimeout(r, 520));
    await fixture.whenStable();
    expect(p(fixture)).toBe('saved');
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you mock services in Angular unit tests using Jasmine/Jest spies?",
    seoDescription:
      "Mock Angular services in TestBed with useValue, useClass or spies: vi.fn/vi.spyOn in Vitest, jasmine.createSpyObj in Jasmine, and HttpTestingController.",
    description: `**Question presented to candidate:**
"\`ProfileComponent\` injects a \`UserService\` that calls \`HttpClient\` and an analytics method. How would you unit test the component without real HTTP or analytics, using spies? Show it in the runner the project uses, and say how the Jasmine version would differ."

**What a strong answer should cover:**
- Mocking works through **dependency injection**: replace the service token in \`TestBed.configureTestingModule({ providers })\` with \`useValue\` (a spy object) or \`useClass\` (a fake class).
- **Vitest** (the Angular 21+ CLI default): \`vi.fn()\`, \`mockReturnValue(of(...))\`, \`vi.spyOn(service, 'method')\`, \`toHaveBeenCalledWith\`; Jest's \`jest.fn()\`/\`jest.spyOn()\` have the same shape.
- **Jasmine**: \`jasmine.createSpyObj('UserService', ['getUser'])\`, \`.and.returnValue(...)\`, \`spyOn(obj, 'm').and.callThrough()\`.
- Key difference: \`vi.spyOn\` **calls the real method** unless you mock it; Jasmine's \`spyOn\` **stubs it** unless you add \`and.callThrough()\`.
- Return **Observables** from mocked methods (\`of\`, \`throwError\`) so the component's subscribe logic is exercised, including the error path.
- For HTTP specifically, \`provideHttpClientTesting()\` + \`HttpTestingController\` fakes the backend instead of the service.
- Component-level \`providers\` are not replaced by TestBed providers; use \`TestBed.overrideComponent\`.

**Clarifying questions expected:**
- "Which runner: Vitest, Jest, or Karma with Jasmine?"
- "Is the service provided in root or in the component's own providers?"

**Code / implementation expected:** Yes — a component spec with a \`useValue\` spy mock, a \`spyOn\` on the real service, and an \`HttpTestingController\` variant.`,
    answer: `**Target Audience:** Developers writing component and service tests who want to isolate a unit from its dependencies.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The Vitest spec in the example was run with Angular CLI 22.2.3 (<code>ng test --watch=false</code>, Vitest 5, zoneless). The Jasmine spy behaviour was run in plain Jasmine 5.13 under Node, without Angular, to check the syntax and defaults; the Jest syntax is shown but was not run.

## 1. Why This Even Matters — A Story First

A flight simulator does not need a real sky. It needs something that looks and responds exactly like the sky to the instruments in the cockpit. Pilots train on the simulator because the real thing is slow, expensive and occasionally dangerous.

A component that shows a user profile does not need a real server either. It needs **something that answers like <code>UserService</code>** when the component asks. That stand-in is a **mock**, and a **spy** is a mock that also writes down every question it was asked, so the test can check "did the component ask for user 7, exactly once?".

Angular makes this easy because components never <code>new</code> their services. They ask the [injector](/interview-question/how-does-dependency-injection-work-in-angular), and in a test you control the injector.

## 2. The Core Idea

📌 **Interview term: Test double / mock** — any object standing in for a real dependency. A **stub** returns canned answers; a **spy** records calls; a **fake** is a lightweight working implementation.

📌 **Interview term: Spy** — a function that records its calls (arguments, count, return values) and can be told what to return. Vitest: <code>vi.fn()</code> / <code>vi.spyOn()</code>. Jest: <code>jest.fn()</code> / <code>jest.spyOn()</code>. Jasmine: <code>jasmine.createSpy()</code> / <code>jasmine.createSpyObj()</code> / <code>spyOn()</code>.

📌 **Interview term: Provider override** — replacing what the injector returns for a token. In a spec: <code>TestBed.configureTestingModule({ providers: [{ provide: UserService, useValue: mock }] })</code>. The same recipes as in the app: [useClass, useValue, useFactory, useExisting](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting).

📌 **Interview term: HttpTestingController** — from <code>@angular/common/http/testing</code>. With <code>provideHttpClientTesting()</code>, <code>HttpClient</code> requests go to an in-memory backend you inspect and answer with <code>expectOne(url).flush(body)</code>.

How the swap works under the hood is ordinary [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular): the component calls <code>inject(UserService)</code>, and the testing module answers with whatever you registered for that token.

## 3. Where the Mock Plugs In

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="The component asks the injector for UserService, the TestBed provider returns a spy object, so the real service and HttpClient are never reached">
  <defs>
    <marker id="mk13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="118" text-anchor="middle">Profile</text>
  <text class="d-sub" x="105" y="140" text-anchor="middle">inject(UserService)</text>
  <path class="d-edge" d="M 194 122 L 256 122" marker-end="url(#mk13-arrow)"/>
  <rect class="d-box-accent" x="262" y="90" width="200" height="64" rx="10"/>
  <text class="d-text d-accent" x="362" y="118" text-anchor="middle">TestBed injector</text>
  <text class="d-sub" x="362" y="140" text-anchor="middle">provide: UserService</text>
  <path class="d-edge-accent" d="M 466 108 L 528 60" marker-end="url(#mk13-arrow)"/>
  <rect class="d-box-accent" x="534" y="24" width="206" height="64" rx="10"/>
  <text class="d-text d-accent" x="637" y="52" text-anchor="middle">spy object</text>
  <text class="d-sub" x="637" y="74" text-anchor="middle">getUser: vi.fn()</text>
  <path class="d-edge-dashed" d="M 466 136 L 528 184" marker-end="url(#mk13-arrow)"/>
  <rect class="d-box-muted" x="534" y="156" width="206" height="64" rx="10"/>
  <text class="d-text" x="637" y="184" text-anchor="middle">real UserService</text>
  <text class="d-sub" x="637" y="206" text-anchor="middle">and HttpClient: unused</text>
</svg>

The component code does not change between app and test. Only the provider registered for the <code>UserService</code> token does, which is why components that use <code>inject()</code> (or constructor injection, see [inject() vs constructor injection](/interview-question/inject-vs-constructor-injection-when-should-you-use-each)) are straightforward to isolate.

## 4. Verified: three ways in Vitest

<code>mock-services.spec.ts</code> (first example), run on Angular 22.2.3:

\`\`\`
✓ mocking UserService > 1. replace it: a mock object of vi.fn() provided with useValue
✓ mocking UserService > 2. spy on the real one: vi.spyOn after TestBed.inject
✓ mocking UserService > 3. fake the HTTP layer instead: HttpTestingController
\`\`\`

| Approach | Rendered | Proved |
| :--- | :--- | :--- |
| [<code>useValue</code>](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting) with <code>vi.fn().mockReturnValue(of({ id: 7, name: 'Ada' }))</code> | <code>Hello Ada</code> | <code>getUser</code> called with <code>7</code>, <code>track</code> called once |
| <code>vi.spyOn(service, 'getUser').mockReturnValue(throwError(...))</code> | <code>Could not load user</code> | error path exercised on the real, root-provided service |
| <code>provideHttpClientTesting()</code> + <code>expectOne('/api/users/7').flush(...)</code> | <code>Hello Grace</code> | a <code>GET</code> was made to that URL and nothing else (<code>verify()</code>) |

Probes run alongside the example (not in the file) settled three behaviour questions:

- **<code>vi.spyOn</code> passes through by default.** A spy on <code>track</code> with no <code>mockImplementation</code> still ran the real method (its <code>console.log</code> printed) while recording the call. That is why the example adds <code>.mockImplementation(() =&gt; {})</code>.
- **<code>mockRestore()</code> puts the real method back.** Afterwards <code>vi.isMockFunction(service.getUser)</code> was <code>false</code>.
- **<code>mockReturnValueOnce</code> queues answers.** <code>vi.fn().mockReturnValueOnce('first').mockReturnValueOnce('second').mockReturnValue('default')</code> returned <code>first second default default</code> over four calls.

And one that surprises people on Angular 22: with **no** providers at all, the component was created without any error. In 22.2.3 <code>HttpClient</code> itself is <code>providedIn: 'root'</code> (read from the package source), so an unmocked service quietly makes a real request; in jsdom the click ended in <code>Could not load user</code>. Forgetting a mock is no longer caught by a missing-provider error.

## 5. The Jasmine Version

Projects still on Karma use Jasmine spies. The spy calls below were run in plain Jasmine 5.13 under Node (no Angular, so the <code>TestBed</code> line is the same as in the Vitest spec but was not run under Jasmine):

\`\`\`ts
const users = jasmine.createSpyObj('UserService', ['getUser', 'track']);
users.getUser.and.returnValue(of({ id: 7, name: 'Ada' }));
TestBed.configureTestingModule({ providers: [{ provide: UserService, useValue: users }] });
// ...
expect(users.getUser).toHaveBeenCalledWith(7);
users.getUser.calls.allArgs();  // [[7]]
users.track.calls.count();      // 1

spyOn(realObject, 'track');                      // STUBS the method: returns undefined
spyOn(realObject, 'track').and.callThrough();    // records AND runs the real one
\`\`\`

Observed: <code>createSpyObj</code> + <code>and.returnValue</code> produced <code>Ada</code> and <code>calls.allArgs()</code> was <code>[[7]]</code>; <code>spyOn</code> without <code>callThrough</code> did not run the real method; with <code>and.callThrough()</code> it did.

| | Vitest / Jest | Jasmine |
| :--- | :--- | :--- |
| Standalone spy | <code>vi.fn()</code> / <code>jest.fn()</code> | <code>jasmine.createSpy('name')</code> |
| Spy object | object literal of <code>vi.fn()</code> | <code>jasmine.createSpyObj('Name', ['a', 'b'])</code> |
| Return a value | <code>.mockReturnValue(x)</code> | <code>.and.returnValue(x)</code> |
| Custom logic | <code>.mockImplementation(fn)</code> | <code>.and.callFake(fn)</code> |
| Spy on a real method | <code>vi.spyOn(obj, 'm')</code>: **runs the real method** | <code>spyOn(obj, 'm')</code>: **stubs it** |
| Keep the real behaviour | default | <code>.and.callThrough()</code> |
| Inspect calls | <code>.mock.calls</code> | <code>.calls.allArgs()</code>, <code>.calls.count()</code> |

## 6. Choosing the Right Seam

| Seam | Use when | Watch out for |
| :--- | :--- | :--- |
| [<code>useValue</code>](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting) spy object | Testing a component in isolation from a service | Keep the mock's shape in sync with the real API; a typed <code>Partial&lt;UserService&gt;</code> helps |
| <code>useClass</code> fake | Several tests share a richer fake | It is real code that can have its own bugs |
| <code>vi.spyOn</code> on <code>TestBed.inject(Service)</code> | You want the real service except for one method | It passes through by default; mock side effects |
| <code>HttpTestingController</code> | Testing the service itself, or the URL and body a component causes | Call <code>verify()</code>; a test can pass while a request is silently unanswered |
| <code>TestBed.overrideComponent</code> | The service is in the component's own <code>providers</code> | Module-level providers do not reach it |

That last row was checked: with <code>providers: [Clock]</code> on the component, a TestBed <code>{ provide: Clock, useValue: mock }</code> still rendered <code>REAL</code>, and so did <code>TestBed.overrideProvider(Clock, ...)</code> in our run; <code>TestBed.overrideComponent(C, { set: { providers: [...] } })</code> rendered <code>MOCK</code>. Why the provider location matters: [providing in root vs in a component](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component). Once the mock is in place, rendering follows the usual rules: the spec awaits <code>fixture.whenStable()</code> after each click, as explained in [fixture.detectChanges() and whenStable()](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-), and a mocked service that feeds [signals](/interview-question/what-are-angular-signals) is tested the way [signal components with TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed) describes. For HTTP-specific concerns like interceptors, see [functional interceptors with provideHttpClient](/interview-question/how-do-functional-interceptors-work-with-providehttpclient).

## 7. Common Pitfalls

- **Assuming a missing mock will fail loudly.** In 22.2.3 <code>HttpClient</code> is root-provided, so an unmocked service makes a real request instead of throwing a provider error.
- **Porting Jasmine <code>spyOn</code> to <code>vi.spyOn</code> literally.** Jasmine stubs by default; Vitest passes through, so side effects (analytics, navigation) suddenly run.
- **Returning a plain value where the code expects an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises).** <code>mockReturnValue({ ... })</code> makes <code>.subscribe</code> blow up; return <code>of(...)</code> or <code>throwError(() =&gt; ...)</code>.
- **Mocking a component-level provider through TestBed providers.** It never reaches the component; use <code>overrideComponent</code>.
- **Only testing the happy path.** A <code>throwError</code> mock is one line and covers the branch users actually complain about. See [catchError and fallbacks](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).
- **Forgetting <code>http.verify()</code>** with <code>HttpTestingController</code>, which is what catches unexpected or duplicate requests.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The principle:</strong> <span style="color:#f0e2c8;">"Components get services from the injector, so in a test I register a stand-in under the same token in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.configureTestingModule</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The Vitest way:</strong> <span style="color:#f0e2c8;">"An object of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.fn()</code> spies with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockReturnValue(of(...))</code>, provided with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useValue</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expect(mock.getUser).toHaveBeenCalledWith(7)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The Jasmine way:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jasmine.createSpyObj('UserService', ['getUser'])</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and.returnValue(...)</code>; the provider line is identical."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The gotcha:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.spyOn</code> runs the real method unless mocked, while Jasmine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spyOn</code> stubs it unless you add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and.callThrough()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. HTTP and scope:</strong> <span style="color:#f0e2c8;">"For HTTP I fake the backend with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpTestingController</code>, and for component-level providers I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.overrideComponent</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">of(...)</code> rather than a plain object from the mock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the component subscribes. Returning an Observable runs the real subscribe callbacks, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throwError(() =&gt; err)</code> lets you test the error branch the same way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you spy on the real service instead of replacing it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When most of the service should behave normally and only one method needs controlling, for example a method that hits the network. Get it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.inject()</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.spyOn(service, 'getUser').mockReturnValue(...)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you mock a service that is in the component's own <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providers</code> array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed module providers do not reach it, because the component creates its own instance. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.overrideComponent(Comp, { set: { providers: [{ provide: Svc, useValue: mock }] } })</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Spy on the service or use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HttpTestingController</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Spy on the service when testing a component, so the test does not care about URLs. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpTestingController</code> when testing the service itself, or when the exact request (URL, method, body) is the behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes between Jasmine and Jest/Vitest when migrating tests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The provider setup stays the same. The spy API changes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and.returnValue</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockReturnValue</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and.callFake</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockImplementation</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calls.count()</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mock.calls.length</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spyOn</code> now passes through by default.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Mock / test double** | Stand-in for a real dependency |
| **Spy** | A function that records its calls and returns what you tell it |
| **vi.fn / jest.fn** | Create a standalone spy (Vitest / Jest) |
| **vi.spyOn** | Wrap a real method in a spy; still calls it unless mocked |
| **jasmine.createSpyObj** | Build an object whose listed methods are all spies |
| **and.callThrough** | Jasmine: let the spied method run for real |
| **HttpTestingController** | Inspect and answer HttpClient requests in tests |
| **overrideComponent** | Replace a component's own metadata, such as its providers |

---
**Conclusion:** Mocking a service in Angular is a dependency-injection exercise: register a spy object or fake under the service token, return Observables from it so both success and error paths run, and assert on the calls it recorded. In the Angular 21+ default that means <code>vi.fn()</code> and <code>vi.spyOn()</code>; in Karma suites, <code>jasmine.createSpyObj</code> and <code>spyOn</code>, with the one difference that matters most, verified above: Vitest spies call through by default and Jasmine spies do not. For HTTP, fake the backend with <code>HttpTestingController</code> instead, and remember that on 22.2.3 a forgotten mock does not fail with a missing provider, it makes a real request.`,
    examples: [
      {
        label: "Mocking a service three ways: useValue spies, vi.spyOn, HttpTestingController (Vitest, ran with ng test on Angular 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable, inject, signal } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

type User = { id: number; name: string };

@Injectable({ providedIn: 'root' })
class UserService {
  private http = inject(HttpClient);
  getUser(id: number): Observable<User> {
    return this.http.get<User>(\`/api/users/\${id}\`);
  }
  track(event: string) {
    console.log('analytics:', event); // a side effect we do not want in tests
  }
}

@Component({
  selector: 'app-profile',
  template: \`<button (click)="load()">Load</button><p>{{ text() }}</p>\`,
})
class Profile {
  private users = inject(UserService);
  text = signal('nothing yet');
  load() {
    this.users.track('load-clicked');
    this.users.getUser(7).subscribe({
      next: (u) => this.text.set(\`Hello \${u.name}\`),
      error: () => this.text.set('Could not load user'),
    });
  }
}

async function clickLoad() {
  const fixture = TestBed.createComponent(Profile);
  await fixture.whenStable();
  fixture.nativeElement.querySelector('button').click();
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('p').textContent as string;
}

describe('mocking UserService', () => {
  it('1. replace it: a mock object of vi.fn() provided with useValue', async () => {
    const mock = {
      getUser: vi.fn().mockReturnValue(of({ id: 7, name: 'Ada' })),
      track: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: UserService, useValue: mock }] });

    expect(await clickLoad()).toBe('Hello Ada');
    expect(mock.getUser).toHaveBeenCalledWith(7);
    expect(mock.track).toHaveBeenCalledOnce();
  });

  it('2. spy on the real one: vi.spyOn after TestBed.inject', async () => {
    const service = TestBed.inject(UserService);
    const getUser = vi.spyOn(service, 'getUser').mockReturnValue(throwError(() => new Error('500')));
    const track = vi.spyOn(service, 'track').mockImplementation(() => {}); // silence the side effect

    expect(await clickLoad()).toBe('Could not load user');
    expect(getUser).toHaveBeenCalledWith(7);
    expect(track).toHaveBeenCalledWith('load-clicked');
  });

  it('3. fake the HTTP layer instead: HttpTestingController', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    vi.spyOn(TestBed.inject(UserService), 'track').mockImplementation(() => {});
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Profile);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button').click();
    const req = http.expectOne('/api/users/7');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7, name: 'Grace' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('p').textContent).toBe('Hello Grace');
    http.verify(); // fails if any request was not expected
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain how to perform unit testing on components with Signals using TestBed.",
    seoDescription:
      "Test signal components with TestBed: setInput for input(), subscribe to output() and model(), read computed(), and flush effects with TestBed.tick().",
    description: `**Question presented to candidate:**
"Our new components use \`input.required()\`, \`model()\`, \`output()\` and \`computed()\`, and a cart service uses \`effect()\`. Walk me through unit testing these with TestBed: how do you set inputs, observe outputs, and make effects run?"

**What a strong answer should cover:**
- Signal **inputs are read-only** from outside: set them with \`fixture.componentRef.setInput('name', value)\` (or \`inputBinding()\` at creation), never by assignment.
- A **required input** that was never set throws \`NG0950\` on the first render; set it before rendering.
- \`output()\` and \`model()\` both expose \`subscribe()\`; collect emitted values in an array and assert.
- \`computed()\` is **synchronous and pull-based**: read it directly, no flushing needed.
- **Root effects** run on Angular's schedule; in a test call \`TestBed.tick()\` (v20+, replaces the deprecated \`TestBed.flushEffects()\`).
- After changes, \`await fixture.whenStable()\` (zoneless default) or \`fixture.detectChanges()\` to render.
- A **host test component** is the clean way to test \`[(model)]\` two-way binding through a template.

**Clarifying questions expected:**
- "Are we testing the component's DOM, its public API, or both?"
- "Is the project zoneless (the default since v21) or Zone-based?"

**Code / implementation expected:** Yes — a spec that sets signal inputs, observes \`output()\`/\`model()\`, asserts a \`computed()\` and flushes an \`effect()\`.`,
    answer: `**Target Audience:** Developers moving component tests from <code>@Input()</code>/<code>@Output()</code> to the signal APIs (<code>input()</code>, <code>model()</code>, <code>output()</code>, <code>computed()</code>, <code>effect()</code>).
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. All results were produced by running the example spec with Angular CLI 22.2.3 (<code>ng test --watch=false</code>, Vitest, the default zoneless TestBed). The broader question of testing <code>@defer</code> and the new control flow has its own page: [testing signal components, defer blocks and control flow](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025).

## 1. Why This Even Matters — A Story First

A thermostat has a dial you turn (the input), a display that shows the current temperature (a computed value), and a relay that clicks the boiler on (an output). To test one on a workbench, you do not open it up and push the needle with your finger. You turn the dial the way a user would, read the display, and listen for the click.

Signal components are the same. **Inputs are read-only from the outside**, so a test cannot just assign <code>component.label = 'x'</code>. It has to turn the dial the official way (<code>setInput</code>), read the display (call the signal), and listen to the relay (<code>subscribe</code> to the output). Once you know the three official handles, signal components are among the easiest things in Angular to test.

## 2. The Core Idea

📌 **Interview term: Signal input** — <code>label = input.required&lt;string&gt;()</code> or <code>by = input(1)</code>. A read-only signal the parent writes through a binding. In a test you write it with **<code>fixture.componentRef.setInput('label', 'Qty')</code>**, which also marks the view dirty. See [signal inputs vs @Input](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1).

📌 **Interview term: <code>model()</code>** — a writable input that also emits when the component changes it, which is what powers <code>[(value)]</code>. See [model() two-way binding](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs).

📌 **Interview term: <code>output()</code>** — the signal-era event emitter. It is not a signal; it exposes <code>emit()</code> and <code>subscribe()</code>. See [output() vs @Output](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs).

📌 **Interview term: <code>computed()</code>** — a derived, cached signal that recomputes lazily when read after a dependency changed. Reading it in a test is synchronous. See [computed() vs methods in templates](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).

📌 **Interview term: <code>TestBed.tick()</code>** — "Execute any pending work required to synchronize model to the UI" (22.2.3 typings, <code>@publicApi 20.0</code>). In the run below it is what made a service's root effect run; <code>TestBed.flushEffects()</code> is marked <code>@deprecated use TestBed.tick() instead</code>.

📌 **Interview term: <code>inputBinding()</code> / <code>outputBinding()</code>** — functions that bind a signal (or getter) to an input, or a listener to an output, when a component is created. <code>TestBed.createComponent(Cmp, { bindings: [...] })</code> accepts them in 22.2.3.

## 3. The Three Handles

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="The test writes inputs with setInput, reads computed signals directly, subscribes to outputs and models, and flushes effects with TestBed tick">
  <defs>
    <marker id="sg13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="150" height="80" rx="12"/>
  <text class="d-text" x="95" y="126" text-anchor="middle">the spec</text>
  <text class="d-sub" x="95" y="148" text-anchor="middle">TestBed</text>
  <rect class="d-box" x="270" y="20" width="240" height="220" rx="12"/>
  <text class="d-text" x="390" y="48" text-anchor="middle">Stepper component</text>
  <rect class="d-box-accent" x="290" y="66" width="200" height="36" rx="8"/>
  <text class="d-sub" x="390" y="89" text-anchor="middle">label = input.required()</text>
  <rect class="d-box" x="290" y="118" width="200" height="36" rx="8"/>
  <text class="d-sub" x="390" y="141" text-anchor="middle">doubled = computed()</text>
  <rect class="d-box-accent" x="290" y="170" width="200" height="36" rx="8"/>
  <text class="d-sub" x="390" y="193" text-anchor="middle">changed = output()</text>
  <path class="d-edge-accent" d="M 174 112 L 284 86" marker-end="url(#sg13-arrow)"/>
  <text class="d-sub" x="214" y="84" text-anchor="middle">setInput</text>
  <path class="d-edge" d="M 174 132 L 284 136" marker-end="url(#sg13-arrow)"/>
  <text class="d-sub" x="226" y="124" text-anchor="middle">read</text>
  <path class="d-edge-accent" d="M 284 190 L 174 152" marker-end="url(#sg13-arrow)"/>
  <text class="d-sub" x="214" y="196" text-anchor="middle">subscribe</text>
  <rect class="d-box-muted" x="590" y="90" width="170" height="80" rx="12"/>
  <text class="d-text" x="675" y="124" text-anchor="middle">effect()</text>
  <text class="d-sub" x="675" y="148" text-anchor="middle">TestBed.tick()</text>
</svg>

Inputs go in through <code>setInput</code>, derived values come out by reading the signal, events come out through <code>subscribe</code>, and side effects in [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it) run when the test asks for pending work to be flushed.

## 4. Verified: each handle on Angular 22.2.3

<code>signals-testbed.spec.ts</code> (the example):

\`\`\`
✓ signal components with TestBed > a required input that was never set throws NG0950
✓ signal components with TestBed > setInput() for inputs, subscribe() for output() and model()
✓ signal components with TestBed > or bind at creation with inputBinding / outputBinding
✓ signal components with TestBed > a signal service: computed is synchronous, effects wait for TestBed.tick()
\`\`\`

| Step | Observed |
| :--- | :--- |
| Render without setting <code>label</code> | throws <code>NG0950: Input "label" is required but no value is available yet.</code> |
| <code>setInput('label', 'Qty')</code>, <code>setInput('by', 5)</code>, <code>await whenStable()</code> | label <code>Qty</code>, value <code>0</code>, button <code>+5</code> |
| click the button, <code>await whenStable()</code> | value <code>5</code>, <code>doubled()</code> shown as <code>10</code>, [<code>output()</code>](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs) emitted <code>[5]</code>, [<code>model()</code>](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs) emitted <code>[5]</code> |
| <code>createComponent(Stepper, { bindings: [inputBinding('label', labelSignal), ...] })</code> | label <code>Bound</code>; after <code>labelSignal.set('Rebound')</code> and a click, label <code>Rebound</code>, <code>outputBinding</code> saw <code>[3]</code> |
| <code>TestBed.inject(Cart)</code>, before any tick | effect log <code>[]</code> |
| <code>TestBed.tick()</code> | <code>['total=0']</code> |
| <code>items.set([5, 7])</code> | <code>total()</code> is <code>12</code> immediately, effect log unchanged |
| second <code>TestBed.tick()</code> | <code>['total=0', 'total=12']</code> |

Probes run next to the example:

- **<code>setInput</code> with a name that is not an input does not throw.** <code>setInput('nope', 1)</code> logged <code>NG0303: Can't set value of the 'nope' input on the '_Stepper' component. Make sure that the 'nope' property is declared as an input using the input() or model() function or the @Input() decorator.</code> to <code>console.error</code> and the test carried on. A typo will not fail your spec unless you watch the console.
- **An [<code>input()</code>](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1) signal has no <code>.set</code>.** <code>typeof component.label.set</code> was <code>undefined</code>, which is why assignment-style tests stop compiling after a migration.
- **Two-way binding through a host.** A tiny host component with <code>&lt;app-stepper label="Qty" [(value)]="qty" (changed)="last.set($event)" /&gt;</code> started at <code>10 / -1</code> and after one click showed <code>11 / 11</code>: the host signal was updated through <code>model()</code>.

## 5. Recipe

1. **Set required inputs before the first render.** <code>setInput</code> right after <code>createComponent</code>, then <code>await fixture.whenStable()</code>.
2. **Assert on the DOM for behaviour**, and read [signals](/interview-question/what-are-angular-signals) (<code>component.value()</code>, <code>component.doubled()</code>) for state that is not rendered.
3. **Collect emissions** from [<code>output()</code>](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs) or [<code>model()</code>](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs) with <code>subscribe(v =&gt; seen.push(v))</code> before triggering them.
4. **Use a host component** when the template binding itself is the behaviour, for example <code>[(value)]</code> or content projection.
5. **For services with effects**, inject them with <code>TestBed.inject</code> and call <code>TestBed.tick()</code> before asserting on what the effect did. Background: [when not to use effect()](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it).
6. **For signals fed by RxJS** (<code>toSignal</code>), the source [Observable](/interview-question/what-is-the-difference-between-observables-and-promises) is the thing to fake; see [toSignal and toObservable](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs), and for replacing the service that provides it, [mocking services with spies](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies).

## 6. Old vs New

| Task | <code>@Input</code> / <code>@Output</code> component | Signal component |
| :--- | :--- | :--- |
| Set an input | <code>component.label = 'x'</code>: in our run it neither re-rendered ([OnPush](/interview-question/what-does-changedetectorref-do)) nor called <code>ngOnChanges</code>; <code>setInput</code> did both | <code>fixture.componentRef.setInput('label', 'x')</code> |
| Required input missing | Silent <code>undefined</code> | <code>NG0950</code> on first render |
| Observe an event | <code>component.changed.subscribe(...)</code> on an <code>EventEmitter</code> | <code>component.changed.subscribe(...)</code> on an <code>OutputEmitterRef</code> |
| Derived value | Getter, recomputed on every read | [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls), cached, read synchronously |
| Side effects | <code>ngOnChanges</code>, subscriptions | [<code>effect()</code>](/interview-question/what-is-the-effect-function-in-angular-signals-and-when-should-you-not-use-it), flushed with <code>TestBed.tick()</code> |
| Query a child | <code>@ViewChild</code> property | <code>viewChild()</code> signal; see [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed) |

## 7. Common Pitfalls

- **Rendering before setting a required input.** The first [<code>detectChanges()</code>](/interview-question/what-is-the-fixture-detectchanges-method-in-angular-testing-and-when-should-you-) or <code>whenStable()</code> throws <code>NG0950</code>; call <code>setInput</code> first.
- **Trusting <code>setInput</code> to catch typos.** An unknown name only logs <code>NG0303</code> to the console.
- **Waiting on <code>whenStable()</code> for an effect in a service.** Root effects in an injected service are flushed by <code>TestBed.tick()</code>; until then the log was still <code>[]</code>.
- **Flushing for [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls).** It is pull-based; reading it gives the current value with no tick or render.
- **Subscribing after the action.** <code>output()</code> does not replay; subscribe before the click.
- **Testing the signal graph instead of behaviour.** Prefer asserting the rendered text or emitted value over asserting which signals were read. See [Angular Signals](/interview-question/what-are-angular-signals) for the model.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Inputs:</strong> <span style="color:#f0e2c8;">"Signal inputs are read-only from outside, so I set them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.componentRef.setInput()</code> before the first render, or bind them at creation with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputBinding()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Outputs:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model()</code> both have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe()</code>, so I collect emitted values in an array before triggering the action, then assert."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Derived state:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed()</code> is pull-based and synchronous; I just read it, no flushing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Effects:</strong> <span style="color:#f0e2c8;">"Root effects run on Angular's schedule, so in a test I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.tick()</code>, which replaced the deprecated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushEffects()</code> in v20."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rendering:</strong> <span style="color:#f0e2c8;">"After changes I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> in the zoneless default, and I use a small host component when the template binding itself is the behaviour."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget to set a required input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first render throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0950: Input "label" is required but no value is available yet.</code> Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput</code> right after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent</code>, before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">whenStable()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">detectChanges()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just assign <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">component.label = 'x'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A signal input is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InputSignal</code>, it has no setter, and assigning would replace the signal itself. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput</code> goes through Angular, updates the signal and marks the view dirty.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[(value)]</code> two-way binding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a host test component whose template binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[(value)]</code> to a host signal. Clicking inside the child updated the host signal from 10 to 11 in our run, which proves the model() wiring end to end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fakeAsync</code> for signals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Signals are synchronous; rendering is scheduled, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code> is enough, and effects are flushed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.tick()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInput</code> throw for an unknown input name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in 22.2.3. It logs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0303</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">console.error</code> and continues, so a typo can slip through; failing on console errors in the test setup catches it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **input() / input.required()** | Read-only signal input; required ones throw NG0950 if unset |
| **setInput()** | The test-side way to write an input; marks the view dirty |
| **model()** | Writable input that emits on change; powers two-way binding |
| **output()** | Event emitter with emit() and subscribe() |
| **computed()** | Cached derived signal, read synchronously |
| **TestBed.tick()** | Flush pending effects and change detection (v20+) |
| **inputBinding()** | Bind a signal to an input at creation time |
| **NG0303** | Tried to set something that is not an input; logged, not thrown, by setInput |

---
**Conclusion:** Testing signal components with TestBed comes down to using the same doors a parent would: <code>setInput</code> (or <code>inputBinding</code>) for inputs, <code>subscribe</code> for <code>output()</code> and <code>model()</code>, direct reads for <code>computed()</code>, and <code>TestBed.tick()</code> for effects. The runs on 22.2.3 showed the edges worth knowing: a missing required input throws <code>NG0950</code>, a misspelt <code>setInput</code> only logs <code>NG0303</code>, computed values need no flushing, and root effects wait for <code>TestBed.tick()</code>. With those in hand, signal components are easier to test than their decorator-based ancestors, because their contract is explicit.`,
    examples: [
      {
        label: "setInput, output()/model() subscriptions, inputBinding and TestBed.tick() (Vitest, ran with ng test on Angular 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable, computed, effect, input, inputBinding, model, output, outputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({
  selector: 'app-stepper',
  template: \`
    <span class="label">{{ label() }}</span>
    <span class="value">{{ value() }}</span>
    <span class="double">{{ doubled() }}</span>
    <button (click)="step()">+{{ by() }}</button>
  \`,
})
class Stepper {
  label = input.required<string>();
  by = input(1);
  value = model(0);
  changed = output<number>();
  doubled = computed(() => this.value() * 2);
  step() {
    this.value.update((v) => v + this.by());
    this.changed.emit(this.value());
  }
}

@Injectable({ providedIn: 'root' })
class Cart {
  items = signal<number[]>([]);
  total = computed(() => this.items().reduce((a, b) => a + b, 0));
  log: string[] = [];
  constructor() {
    effect(() => this.log.push(\`total=\${this.total()}\`));
  }
}

const q = (f: { nativeElement: HTMLElement }, css: string) => f.nativeElement.querySelector(css)?.textContent?.trim();

describe('signal components with TestBed', () => {
  it('a required input that was never set throws NG0950', () => {
    const fixture = TestBed.createComponent(Stepper);
    expect(() => fixture.detectChanges()).toThrow(/NG0950: Input "label" is required/);
  });

  it('setInput() for inputs, subscribe() for output() and model()', async () => {
    const fixture = TestBed.createComponent(Stepper);
    fixture.componentRef.setInput('label', 'Qty');
    fixture.componentRef.setInput('by', 5);
    await fixture.whenStable();
    expect([q(fixture, '.label'), q(fixture, '.value'), q(fixture, 'button')]).toEqual(['Qty', '0', '+5']);

    const emitted: number[] = [];
    const modelChanges: number[] = [];
    fixture.componentInstance.changed.subscribe((v) => emitted.push(v));
    fixture.componentInstance.value.subscribe((v) => modelChanges.push(v));

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(q(fixture, '.value')).toBe('5');
    expect(q(fixture, '.double')).toBe('10'); // computed() followed
    expect(emitted).toEqual([5]);
    expect(modelChanges).toEqual([5]);
  });

  it('or bind at creation with inputBinding / outputBinding', async () => {
    const label = signal('Bound');
    const seen: number[] = [];
    const fixture = TestBed.createComponent(Stepper, {
      bindings: [
        inputBinding('label', label),
        inputBinding('by', () => 3),
        outputBinding<number>('changed', (v) => seen.push(v)),
      ],
    });
    await fixture.whenStable();
    expect(q(fixture, '.label')).toBe('Bound');

    label.set('Rebound'); // the binding is live: no setInput() needed
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(q(fixture, '.label')).toBe('Rebound');
    expect(seen).toEqual([3]);
  });

  it('a signal service: computed is synchronous, effects wait for TestBed.tick()', () => {
    const cart = TestBed.inject(Cart);
    expect(cart.log).toEqual([]); // the effect has not run yet
    TestBed.tick();
    expect(cart.log).toEqual(['total=0']);

    cart.items.set([5, 7]);
    expect(cart.total()).toBe(12); // no flushing needed for computed
    expect(cart.log).toEqual(['total=0']);
    TestBed.tick();
    expect(cart.log).toEqual(['total=0', 'total=12']);
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you test signal components, defer blocks, and new control flow in 2025?",
    seoDescription:
      "Testing modern Angular templates: signal components, @defer with DeferBlockBehavior.Manual and getDeferBlocks(), and @if/@for/@switch on Angular 22.",
    description: `**Question presented to candidate:**
"A dashboard uses signal inputs, a \`@defer (on viewport)\` chart with placeholder, loading and error blocks, and \`@if\`/\`@for\`/\`@switch\` in its templates. How do you unit test all of that with TestBed today?"

**What a strong answer should cover:**
- **Signal components**: \`setInput()\`, subscribe to \`output()\`, \`await fixture.whenStable()\` in the zoneless default.
- **\`@defer\`**: configure \`deferBlockBehavior: DeferBlockBehavior.Manual\`, get blocks with \`fixture.getDeferBlocks()\`, then \`block.render(DeferBlockState.Loading | Complete | Error)\` and assert each state.
- Know the default: **Playthrough**, which tries real triggers; \`on viewport\` needs \`IntersectionObserver\`, which jsdom does not have.
- States move forward: after **Error**, rendering Complete is ignored; after Complete, Placeholder is ignored.
- **Control flow** needs no special API: drive the signals, render, assert the DOM; \`@for\` with \`track\` reuses DOM nodes, which you can assert by identity.
- \`@defer\` dependencies are loaded lazily in the app, but in a unit test the point is the **state machine**, not the network.

**Clarifying questions expected:**
- "Do we want to test each defer state, or just that the main content works once loaded?"
- "Unit tests in jsdom, or browser tests where viewport triggers are real?"

**Code / implementation expected:** Yes — a spec rendering each defer state manually and asserting \`@if\`/\`@for\`/\`@switch\` output.`,
    answer: `**Target Audience:** Developers testing templates written with the modern Angular syntax: signals, <code>@defer</code>, and built-in control flow.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The title says 2025; everything here was run on the current release, Angular 22.2.3 with CLI 22.2.3 (<code>ng test --watch=false</code>, Vitest + jsdom, zoneless). Deep detail on signal inputs, outputs and effects is on its own page: [unit testing components with Signals using TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed). This page focuses on what is new in templates.

## 1. Why This Even Matters — A Story First

A theatre has trapdoors. The ghost appears through one in act three, but the director does not want to sit through acts one and two every time they check that the trapdoor opens, shows the ghost, and closes again. So the stage crew has a manual lever: "trapdoor: open now", "trapdoor: show smoke", "trapdoor: fail".

A [<code>@defer</code>](/interview-question/how-does-the-defer-block-work-and-what-triggers-are-available) block is a trapdoor in your template. In the app it opens on a trigger (the element scrolls into view, the browser goes idle, a timer). In a unit test you want the lever. **<code>DeferBlockBehavior.Manual</code>** gives you that lever, and the new [control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir) (<code>@if</code>, <code>@for</code>, <code>@switch</code>) is simply scenery that rearranges itself when the [signals](/interview-question/what-are-angular-signals) it reads change.

## 2. The Core Idea

📌 **Interview term: <code>@defer</code> block** — template syntax that lazily loads and renders its content when a trigger fires, with optional <code>@placeholder</code>, <code>@loading</code> and <code>@error</code> blocks. See [how @defer works and its triggers](/interview-question/how-does-the-defer-block-work-and-what-triggers-are-available).

📌 **Interview term: <code>DeferBlockBehavior</code>** — a testing option: <code>Manual</code> (you choose which state renders) or <code>Playthrough</code> (blocks behave as in a browser). Set it in <code>TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual })</code>.

📌 **Interview term: <code>DeferBlockFixture</code>** — returned by <code>await fixture.getDeferBlocks()</code>, one per top-level block. <code>await block.render(DeferBlockState.X)</code> renders a state; <code>block.getDeferBlocks()</code> reaches nested ones.

📌 **Interview term: <code>DeferBlockState</code>** — <code>Placeholder</code>, <code>Loading</code>, <code>Complete</code>, <code>Error</code>.

📌 **Interview term: Built-in control flow** — <code>@if</code>/<code>@else</code>, <code>@for (...; track ...)</code> with <code>@empty</code>, and <code>@switch</code>/<code>@case</code>, compiled into the template instead of being directives. See [@if, @for and @switch vs structural directives](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir).

📌 **Interview term: <code>track</code>** — the identity expression <code>@for</code> uses to match items between renders, so existing DOM nodes are moved rather than recreated. See [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux).

## 3. The Defer State Machine

<svg class="iq-diagram" width="100%" viewBox="0 0 780 240" role="img" aria-label="A defer block moves from Placeholder to Loading to Complete, Error can be reached from Placeholder or Loading and is terminal, and the test drives each step with render">
  <defs>
    <marker id="df13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="76" text-anchor="middle">Placeholder</text>
  <path class="d-edge-accent" d="M 194 70 L 266 70" marker-end="url(#df13-arrow)"/>
  <rect class="d-box" x="272" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="357" y="76" text-anchor="middle">Loading</text>
  <path class="d-edge-accent" d="M 446 70 L 518 70" marker-end="url(#df13-arrow)"/>
  <rect class="d-box-accent" x="524" y="40" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="624" y="76" text-anchor="middle">Complete</text>
  <path class="d-edge-dashed" d="M 357 104 L 357 156" marker-end="url(#df13-arrow)"/>
  <rect class="d-box-muted" x="272" y="162" width="170" height="60" rx="10"/>
  <text class="d-text" x="357" y="198" text-anchor="middle">Error</text>
  <rect class="d-box" x="524" y="162" width="200" height="60" rx="10"/>
  <text class="d-sub" x="624" y="188" text-anchor="middle">test drives each step</text>
  <text class="d-sub" x="624" y="208" text-anchor="middle">block.render(state)</text>
</svg>

Rendering only moves forward: the runs below showed that once a block is in Error, asking for Complete changes nothing, and once it is Complete, asking for Placeholder changes nothing.

## 4. Verified: @defer with the manual lever

<code>defer-control-flow.spec.ts</code> (the example), Angular 22.2.3:

\`\`\`
✓ @defer with DeferBlockBehavior.Manual > renders each state on demand
✓ @defer with DeferBlockBehavior.Manual > the error state is terminal
✓ @if / @for / @switch > follow the signals they read
✓ @if / @for / @switch > track keeps DOM nodes when items move
\`\`\`

| Step | Text of the fixture |
| :--- | :--- |
| <code>createComponent</code>, <code>await whenStable()</code> | <code>placeholder</code> |
| <code>getDeferBlocks()</code> | 1 block |
| <code>render(DeferBlockState.Loading)</code> | <code>loading</code> |
| <code>render(DeferBlockState.Complete)</code> | <code>CHART</code> |
| fresh fixture, <code>render(Error)</code> | <code>error</code> |
| then <code>render(Complete)</code> | still <code>error</code> |
| probe: <code>render(Placeholder)</code> after Complete | still <code>CHART</code> |

## 5. Verified: what the default does

The default matters, and the 22.2.3 typings disagree with themselves. The <code>deferBlockBehavior</code> option on <code>TestModuleMetadata</code> says "Defaults to <code>manual</code>", while the <code>DeferBlockBehavior.Playthrough</code> enum member says "This is the default behavior in test environments", and the testing source sets <code>DEFER_BLOCK_DEFAULT_BEHAVIOR = DeferBlockBehavior.Playthrough</code>. The probe run settled it:

- **No option set, <code>@defer (on idle)</code>:** after 300 ms of real time the fixture showed <code>CHART</code>. The block played through on its own, so the default is **Playthrough**.
- **No option set, <code>@defer (on viewport)</code>:** the fixture stayed on <code>placeholder</code> and Angular logged <code>ERROR ReferenceError: IntersectionObserver is not defined</code>. jsdom has no <code>IntersectionObserver</code> (<code>typeof IntersectionObserver</code> was <code>"undefined"</code>), so a viewport trigger can never fire in a jsdom unit test.

So set <code>Manual</code> explicitly whenever you want to assert on states, and do not rely on viewport, hover or interaction triggers firing in jsdom. Real viewport behaviour belongs in a browser test (Vitest browser mode or an end-to-end tool), which was not run here.

## 6. Verified: control flow

Nothing special is needed for [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir), <code>@for</code> and <code>@switch</code>. Drive the [signals](/interview-question/what-are-angular-signals) and assert the DOM:

| Step | Elements read |
| :--- | :--- |
| empty list, filter <code>all</code> | <code>p.empty</code> = <code>Nothing to do</code>, <code>em</code> = <code>showing all</code> |
| two todos, filter <code>done</code> | <code>li</code> = <code>1. Write spec</code>, <code>2. Ship</code>; <code>em</code> = <code>showing done</code>; one <code>li.done</code>; no <code>p.empty</code> |
| prepend <code>Plan</code> (<code>track t.id</code>) | <code>1. Plan</code>, <code>2. Write spec</code>, and the original <code>&lt;li&gt;</code> element is the same node, now at index 1 |

The last row is the useful one: <code>track</code> is observable behaviour. Keeping a reference to a DOM node and checking its identity after a reorder proves that rows (and any focus or input state inside them) survive, which is what [trackBy and track](/interview-question/what-is-trackby-in-ngfor-and-why-use-it) exist for.

One trap seen while writing the spec: Angular removes whitespace-only text between elements by default, so <code>textContent</code> of <code>&lt;p&gt;Nothing to do&lt;/p&gt; &lt;em&gt;showing all&lt;/em&gt;</code> came out as <code>Nothing to doshowing all</code>. Assert on individual elements, not on the whole fixture text.

## 7. Putting It Together

| Template feature | How to drive it | What to assert |
| :--- | :--- | :--- |
| Signal inputs | <code>fixture.componentRef.setInput()</code> | Rendered text, or <code>NG0950</code> if a required one is missing |
| [<code>output()</code>](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs) / [<code>model()</code>](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs) | <code>subscribe()</code> before the action | Emitted values |
| [<code>@defer</code>](/interview-question/how-does-the-defer-block-work-and-what-triggers-are-available) states | <code>Manual</code> + <code>getDeferBlocks()</code> + <code>render(state)</code> | Placeholder, loading, error and main content each render |
| <code>@defer</code> triggers | Browser tests; not jsdom for viewport | Real loading on scroll or idle |
| <code>@if</code> / <code>@switch</code> | Set the [signals](/interview-question/what-are-angular-signals) they read, <code>await whenStable()</code> (the [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) fixture auto-detects; see [ComponentFixtureAutoDetect](/interview-question/what-is-componentfixtureautodetect-and-how-does-it-affect-unit-tests)) | Which branch is in the DOM |
| <code>@for</code> + <code>track</code> | Replace or reorder the array signal | Item text and node identity |
| <code>@for</code> + <code>@empty</code> | Set an empty array | The empty block renders |

Prefetching and dependency isolation inside <code>@defer</code> are covered in [defer prefetch strategies](/interview-question/deferrable-views-prefetch-strategies-and-dependency-isolation-with-defer). For <code>@defer (on timer(...))</code> you could try Playthrough with fake timers, keeping in mind the caveats in [fakeAsync, tick and waitForAsync](/interview-question/what-is-the-difference-between-fakeasync-tick-and-waitforasync-in-angular-unit-t); that combination was not run here.

## 8. Common Pitfalls

- **Relying on the default defer behaviour.** It is Playthrough in 22.2.3 despite the "Defaults to manual" comment, so tests that assume Manual see real triggers instead.
- **Testing <code>on viewport</code> in jsdom.** <code>IntersectionObserver</code> is missing; the block stays on its placeholder and an <code>ERROR</code> is logged.
- **Expecting to rewind a defer block.** States only move forward; use a fresh fixture per scenario.
- **Asserting on whole-fixture <code>textContent</code>.** Inter-element whitespace is stripped, so strings run together; query elements.
- **Ignoring the error block.** <code>render(DeferBlockState.Error)</code> is one line and is the only practical way to see your error UI.
- **Mutating an array inside a signal.** <code>items().push('b')</code> changes the array without notifying the signal: the <code>@for</code> still rendered 1 item in our run, while <code>items.update(xs =&gt; [...xs, 'c'])</code> rendered 3. Always set a new array.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Signal components:</strong> <span style="color:#f0e2c8;">"I set inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput()</code>, subscribe to outputs, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await fixture.whenStable()</code>; the signals tell Angular when to render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Defer blocks:</strong> <span style="color:#f0e2c8;">"I configure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deferBlockBehavior: DeferBlockBehavior.Manual</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.getDeferBlocks()</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render()</code> Loading, Complete and Error in turn."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why Manual:</strong> <span style="color:#f0e2c8;">"The default in 22.2.3 is Playthrough, and in jsdom an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on viewport</code> trigger never fires because there is no IntersectionObserver."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Control flow:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@for</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@switch</code> need no special API: change the signals, await stability, assert which elements exist."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The extra mile:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">track</code> I keep a reference to a row element and check it is the same node after a reorder, which proves DOM reuse."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@error</code> block of a defer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Manual</code> behaviour, get the block from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getDeferBlocks()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await block.render(DeferBlockState.Error)</code>. In our run that showed the error template, and rendering Complete afterwards was ignored.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you test <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@defer (on viewport)</code> in a unit test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a real trigger in jsdom; there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code>, so it stays on the placeholder and logs an error. Test the states manually, and leave real scroll behaviour to a browser test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the default <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DeferBlockBehavior</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Playthrough in 22.2.3: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on idle</code> block rendered its main content by itself. One typings comment says manual, but the enum docs and the source both say Playthrough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test nested defer blocks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render the outer block to Complete, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getDeferBlocks()</code> on that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeferBlockFixture</code> to reach the inner ones; the 22.2.3 typings document it as retrieving all nested child defer block fixtures. Our spec only had one level, so this part was not run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">track</code> change that a test can see?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Node identity. After prepending an item, the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;li&gt;</code> was the same element at index 1, so state inside rows survives. Without a stable key, rows are recreated.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **@defer** | Lazily load and render part of a template on a trigger |
| **DeferBlockBehavior.Manual** | Test option: you choose which defer state renders |
| **DeferBlockBehavior.Playthrough** | Test option: blocks follow real triggers (the 22.2.3 default) |
| **getDeferBlocks()** | Get a fixture for each defer block in the component |
| **DeferBlockState** | Placeholder, Loading, Complete, Error |
| **@for ... track** | Loop with an identity key so DOM nodes are reused |
| **@empty** | Block shown when the @for list is empty |
| **IntersectionObserver** | Browser API behind on viewport; absent in jsdom |

---
**Conclusion:** Testing a modern Angular template is mostly about choosing the right lever. For signal components it is <code>setInput</code> and <code>subscribe</code>; for <code>@defer</code> it is <code>DeferBlockBehavior.Manual</code> with <code>getDeferBlocks()</code> and <code>render(state)</code>; for <code>@if</code>, <code>@for</code> and <code>@switch</code> it is just setting signals and reading the DOM. The runs on Angular 22.2.3 added three facts worth quoting in an interview: the default defer behaviour is actually Playthrough, <code>on viewport</code> cannot fire in jsdom, and defer states only move forward, while <code>track</code> reuse can be asserted directly by checking node identity.`,
    examples: [
      {
        label: "@defer with DeferBlockBehavior.Manual plus @if/@for/@switch assertions (Vitest, ran with ng test on Angular 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal } from '@angular/core';
import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';

@Component({ selector: 'app-chart', template: \`<b>CHART</b>\` })
class Chart {}

@Component({
  selector: 'app-dashboard',
  imports: [Chart],
  template: \`
    @defer (on viewport) {
      <app-chart />
    } @placeholder {
      <span>placeholder</span>
    } @loading {
      <span>loading</span>
    } @error {
      <span>error</span>
    }
  \`,
})
class Dashboard {}

type Todo = { id: number; title: string; done: boolean };

@Component({
  selector: 'app-todos',
  template: \`
    @if (todos().length > 0) {
      <ul>
        @for (t of todos(); track t.id; let i = $index) {
          <li [class.done]="t.done">{{ i + 1 }}. {{ t.title }}</li>
        }
      </ul>
    } @else {
      <p class="empty">Nothing to do</p>
    }
    @switch (filter()) {
      @case ('done') { <em>showing done</em> }
      @default { <em>showing all</em> }
    }
  \`,
})
class Todos {
  todos = signal<Todo[]>([]);
  filter = signal<'all' | 'done'>('all');
}

const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent.trim();
const all = (f: { nativeElement: HTMLElement }, css: string) =>
  [...f.nativeElement.querySelectorAll(css)].map((el) => el.textContent!.trim());

describe('@defer with DeferBlockBehavior.Manual', () => {
  beforeEach(() => TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual }));

  it('renders each state on demand', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    expect(text(fixture)).toBe('placeholder');

    const [block] = await fixture.getDeferBlocks();
    await block.render(DeferBlockState.Loading);
    expect(text(fixture)).toBe('loading');
    await block.render(DeferBlockState.Complete);
    expect(text(fixture)).toBe('CHART');
  });

  it('the error state is terminal', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const [block] = await fixture.getDeferBlocks();
    await block.render(DeferBlockState.Error);
    expect(text(fixture)).toBe('error');
    await block.render(DeferBlockState.Complete); // ignored after Error
    expect(text(fixture)).toBe('error');
  });
});

describe('@if / @for / @switch', () => {
  it('follow the signals they read', async () => {
    const fixture = TestBed.createComponent(Todos);
    await fixture.whenStable();
    expect(all(fixture, 'p.empty, em')).toEqual(['Nothing to do', 'showing all']);

    fixture.componentInstance.todos.set([
      { id: 1, title: 'Write spec', done: true },
      { id: 2, title: 'Ship', done: false },
    ]);
    fixture.componentInstance.filter.set('done');
    await fixture.whenStable();
    expect(all(fixture, 'li, em')).toEqual(['1. Write spec', '2. Ship', 'showing done']);
    expect(fixture.nativeElement.querySelector('p.empty')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('li.done').length).toBe(1);
  });

  it('track keeps DOM nodes when items move', async () => {
    const fixture = TestBed.createComponent(Todos);
    fixture.componentInstance.todos.set([{ id: 1, title: 'Write spec', done: false }]);
    await fixture.whenStable();
    const original = fixture.nativeElement.querySelector('li');

    fixture.componentInstance.todos.update((xs) => [{ id: 0, title: 'Plan', done: false }, ...xs]);
    await fixture.whenStable();
    const items = [...fixture.nativeElement.querySelectorAll('li')];
    expect(items.map((li) => li.textContent)).toEqual(['1. Plan', '2. Write spec']);
    expect(items.indexOf(original)).toBe(1); // same element, moved and re-numbered
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you dynamically create components?",
    seoDescription:
      "Create Angular components at runtime: ViewContainerRef.createComponent, the createComponent() function with inputBinding, or NgComponentOutlet.",
    description: `**Question presented to candidate:**
"A dashboard lets users add widgets whose type is only known at runtime, and a toast service needs to show a component attached to \`document.body\`. How do you create components dynamically in modern Angular, pass them inputs and listen to their outputs?"

**What a strong answer should cover:**
- **\`ViewContainerRef.createComponent(Type)\`** inserts a component at an anchor (often \`<ng-container #slot>\` read as a \`ViewContainerRef\`) and returns a \`ComponentRef\`.
- Pass inputs with **\`ref.setInput(name, value)\`** (marks OnPush views dirty) or, since v20, declare **\`bindings: [inputBinding(...), outputBinding(...), twoWayBinding(...)]\`** at creation; signals bound this way stay live.
- Clean up with \`ref.destroy()\` or \`container.clear()\`; subscriptions to outputs end with the component.
- **\`NgComponentOutlet\`** (\`*ngComponentOutlet="type; inputs: {...}"\`) is the declarative option for "render whichever component this signal holds".
- The standalone **\`createComponent()\` function** with \`environmentInjector\` and \`hostElement\` creates a component outside any container; you must \`appRef.attachView(ref.hostView)\` for it to update.
- \`ComponentFactoryResolver\` is gone from the v22 public API; the component class is passed directly.

**Clarifying questions expected:**
- "Does the component need to live inside the current view, or at \`document.body\` like an overlay?"
- "Are the components known at build time, or lazy-loaded (\`import()\`), for example from a remote?"

**Code / implementation expected:** Yes — a container-based example with \`setInput\` and \`NgComponentOutlet\`, plus one using \`bindings\` and the standalone \`createComponent()\`.`,
    answer: `**Target Audience:** Developers building dashboards, modals, toasts, plugin systems or CMS-driven pages in Angular.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Both examples were AOT-compiled with <code>ngc</code> (strict templates) on Angular 22.2.3 and booted in jsdom, then clicked through; the first one also passed the playground's plain JIT mode, so it has a Run button. The quoted lines are the text of each element after each click.

## 1. Why This Even Matters — A Story First

A normal Angular template is like a printed restaurant menu: every dish is decided before the restaurant opens. Most apps are fine with that.

Now imagine a food court where customers pick which stall's dish appears on their tray, at the moment they order. The tray needs a slot that accepts whatever arrives, and someone has to put the dish there, hand it its sauce (inputs) and listen for "I am done" (outputs).

**Dynamic component creation** is that tray. Angular gives you three ways to fill it: an imperative slot ([<code>ViewContainerRef</code>](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref)), a declarative slot (<code>NgComponentOutlet</code>), and a free-standing creator for things that live outside your view, like a toast on <code>document.body</code>.

## 2. The Core Idea

📌 **Interview term: <code>ViewContainerRef</code>** — a handle to a location in a view where other views can be inserted. You get one by querying an anchor with <code>read: ViewContainerRef</code>, usually an empty <code>&lt;ng-container #slot /&gt;</code>. See [ElementRef, TemplateRef and ViewContainerRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref).

📌 **Interview term: <code>ComponentRef&lt;T&gt;</code>** — returned by <code>createComponent</code>. Holds <code>instance</code>, <code>location</code> (the host element), <code>hostView</code>, <code>changeDetectorRef</code>, and the methods <code>setInput()</code> and <code>destroy()</code>.

📌 **Interview term: <code>setInput(name, value)</code>** — sets an input through Angular rather than by assigning the property, so OnPush views are marked dirty and <code>ngOnChanges</code> runs.

📌 **Interview term: Creation-time bindings** — <code>inputBinding('name', signalOrGetter)</code>, <code>outputBinding('event', listener)</code> and <code>twoWayBinding('name', writableSignal)</code> from <code>@angular/core</code>, passed as <code>bindings: [...]</code> to <code>createComponent</code>. They act like <code>[name]</code>, <code>(event)</code> and <code>[(name)]</code> in a template and stay live afterwards.

📌 **Interview term: <code>NgComponentOutlet</code>** — a directive from <code>@angular/common</code>: <code>*ngComponentOutlet="type; inputs: {...}"</code> renders whichever component class the expression holds and swaps it when it changes.

📌 **Interview term: <code>createComponent()</code> function** — the standalone function (not the method) that creates a component given an <code>environmentInjector</code> and an optional <code>hostElement</code>. The view is not attached to anything until you call <code>ApplicationRef.attachView()</code>.

## 3. Where Dynamic Views Live

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="The host component template contains an ng-container anchor, the ViewContainerRef inserts host views for each created component after it, and a popup created with the createComponent function is attached to the application instead">
  <defs>
    <marker id="dyn13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="440" height="230" rx="12"/>
  <text class="d-text" x="240" y="48" text-anchor="middle">AppComponent view</text>
  <rect class="d-box-accent" x="50" y="70" width="170" height="44" rx="8"/>
  <text class="d-text d-accent" x="135" y="97" text-anchor="middle">ng-container #slot</text>
  <rect class="d-box" x="50" y="134" width="120" height="40" rx="8"/>
  <text class="d-sub" x="110" y="159" text-anchor="middle">Weather Oslo</text>
  <rect class="d-box" x="190" y="134" width="120" height="40" rx="8"/>
  <text class="d-sub" x="250" y="159" text-anchor="middle">Weather Lima</text>
  <rect class="d-box" x="330" y="134" width="110" height="40" rx="8"/>
  <text class="d-sub" x="385" y="159" text-anchor="middle">Weather Pune</text>
  <text class="d-sub" x="240" y="210" text-anchor="middle">container length = 3</text>
  <path class="d-edge-accent" d="M 135 118 L 110 130" marker-end="url(#dyn13-arrow)"/>
  <rect class="d-box-muted" x="530" y="70" width="210" height="64" rx="10"/>
  <text class="d-text" x="635" y="98" text-anchor="middle">ApplicationRef</text>
  <text class="d-sub" x="635" y="120" text-anchor="middle">attachView(hostView)</text>
  <path class="d-edge" d="M 635 138 L 635 172" marker-end="url(#dyn13-arrow)"/>
  <rect class="d-box" x="530" y="178" width="210" height="56" rx="10"/>
  <text class="d-sub" x="635" y="211" text-anchor="middle">Toast on document.body</text>
</svg>

Components created through a [<code>ViewContainerRef</code>](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref) become part of the view that owns the container, so they are checked and destroyed with it. A component created with the standalone <code>createComponent()</code> function belongs to nobody until you attach its host view to the <code>ApplicationRef</code>.

## 4. Verified: ViewContainerRef and NgComponentOutlet

The first example (runnable) adds weather widgets into a container with <code>setInput</code>, closes one through its output, clears the rest, and swaps an <code>NgComponentOutlet</code> between two widget types. Output after each click, one segment per <code>&lt;p&gt;</code>:

\`\`\`
initial          | no widgets / ACME is up 2%
3 x add          | Weather in Oslo: 18 C x / Weather in Lima: 18 C x / Weather in Pune: 18 C x / added Pune; container length = 3 / ACME is up 2%
close Lima       | Weather in Oslo: 18 C x / Weather in Pune: 18 C x / closed Lima; container length = 2 / ACME is up 2%
clear            | cleared; container length = 0 / ACME is up 2%
swap             | cleared; container length = 0 / Weather in Rome: 18 C x
swap again       | cleared; container length = 0 / ACME is up 2%
\`\`\`

Identical in AOT (<code>ngc</code>) and playground (JIT) mode. A probe on the same file showed why <code>setInput</code> matters: after <code>ref.instance.city = "DIRECT"</code> and an unrelated re-render of the parent, the widget still said <code>Weather in Oslo</code> (it is [OnPush](/interview-question/what-does-changedetectorref-do) by default in v22); <code>ref.setInput("city", "VIA-SETINPUT")</code> updated it straight away.

## 5. Verified: bindings and the standalone function

The second example uses a signal-based <code>Toast</code> ([<code>input.required()</code>](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1), [<code>model()</code>](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs), [<code>output()</code>](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs)), so it is AOT-only: the playground's plain JIT mode cannot register signal inputs (it failed there with <code>NG0951</code> on the [<code>viewChild.required</code>](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed) query). Output:

\`\`\`
initial            | text=Saved seen=1 dismissed=0
show               | Saved (seen 1) ok / text=Saved seen=1 dismissed=0
change text        | Saved again (seen 1) ok / text=Saved again seen=1 dismissed=0
click ok           | Saved again (seen 2) ok / text=Saved again seen=2 dismissed=1
popup              | Saved again (seen 2) ok / text=Saved again seen=2 dismissed=1 / Popup on body (seen 0) ok
popup parent      | BODY
\`\`\`

- **<code>inputBinding('message', this.text)</code> is live.** Changing the parent signal to <code>Saved again</code> updated the toast with no <code>setInput</code> call.
- **<code>twoWayBinding('count', this.seen)</code> works both ways.** The output handler bumped <code>seen</code>, and the toast showed <code>(seen 2)</code>.
- **The standalone <code>createComponent()</code>** rendered into a new <code>&lt;section&gt;</code> appended to <code>document.body</code>, after <code>appRef.attachView(ref.hostView)</code>.

## 6. Choosing an Approach

| | <code>ViewContainerRef.createComponent</code> | <code>NgComponentOutlet</code> | <code>createComponent()</code> function |
| :--- | :--- | :--- | :--- |
| Style | Imperative | Declarative, in the template | Imperative |
| Where it renders | After an anchor in your view | Where the directive sits | Any element, often <code>document.body</code> |
| Inputs | <code>setInput</code> or <code>bindings</code> | <code>inputs: { ... }</code> object | <code>bindings</code> or <code>setInput</code> |
| Outputs | <code>ref.instance.x.subscribe</code> or <code>outputBinding</code> | No outputs option (22.2.3 offers inputs, [injector](/interview-question/how-does-dependency-injection-work-in-angular), content, ngModule) | <code>outputBinding</code> |
| [Change detection](/interview-question/how-does-change-detection-work-in-angular) | With the owning view | With the owning view | Only after <code>appRef.attachView()</code> |
| Cleanup | <code>ref.destroy()</code>, <code>container.clear()</code>, or with the parent | Automatic on swap or destroy | You call <code>ref.destroy()</code> and remove the host |
| Good for | Dashboards, lists of widgets, plugin slots | "Render this type" switches, CMS blocks | Overlays, toasts, portals |

Related building blocks: [ng-container and ng-template](/interview-question/what-are-ng-container-and-ng-template), [ngTemplateOutlet](/interview-question/what-is-ngtemplateoutlet) for templates instead of components, and [content projection](/interview-question/what-is-content-projection-and-ng-content) via the <code>projectableNodes</code> option.

## 7. Lazy and Remote Components

The type passed to <code>createComponent</code> can come from a dynamic <code>import()</code>:

\`\`\`ts
const { ChartWidget } = await import('./chart-widget');
this.slot.createComponent(ChartWidget);
\`\`\`

That is the same mechanism lazy routes use (see [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)), and it is how micro-frontends render a component fetched from another deployment ([Module Federation in Angular](/interview-question/how-do-you-handle-micro-frontend-architecture-in-angular-using-module-federation)).

## 8. What Changed Over the Years

- **<code>ComponentFactoryResolver</code> is gone in v22.** On 22.2.3, <code>'ComponentFactoryResolver' in await import('@angular/core')</code> printed <code>false</code>, as did <code>ComponentFactory</code>. The <code>@angular/platform-browser-dynamic</code> 22.0.0 release notes list their removal as a breaking change (source: <a href="https://newreleases.io/project/npm/@angular/platform-browser-dynamic/release/22.0.0" target="_blank" rel="noopener noreferrer">newreleases.io, platform-browser-dynamic 22.0.0</a>). Pass the class to <code>createComponent</code> directly.
- **Creation-time bindings arrived in v20** (reported in community coverage of the release, for example <a href="https://angular.love/angular-20-whats-new" target="_blank" rel="noopener noreferrer">angular.love on Angular 20</a>); in 22.2.3 they are exported from <code>@angular/core</code> and accepted by <code>ViewContainerRef.createComponent</code>, the <code>createComponent()</code> function and <code>TestBed.createComponent</code> (used in [testing signal components](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed)).
- **Standalone by default** means no <code>entryComponents</code> and no module to declare a dynamic component in; it lists its own imports. See [standalone components](/interview-question/what-are-standalone-components).

## 9. Common Pitfalls

- **Assigning <code>ref.instance.someInput = value</code>.** Under the v22 [OnPush](/interview-question/what-does-changedetectorref-do) default the widget did not re-render in our probe; use <code>setInput</code> or a binding.
- **Using the standalone <code>createComponent()</code> and forgetting <code>attachView</code>.** The component renders once (if you call <code>detectChanges</code>) and then never updates.
- **Leaking components created outside a container.** Nothing destroys them for you; call <code>ref.destroy()</code> and remove the host element.
- **Querying the anchor too early.** With the decorator, <code>{ static: true }</code> makes the container available in [<code>ngOnInit</code>](/interview-question/what-are-angular-lifecycle-hooks); without it, wait for <code>ngAfterViewInit</code>. A signal <code>viewChild.required()</code> (see [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed)) needs the Angular compiler: in the playground's plain JIT mode it threw <code>NG0951</code>, which is why the second example is not runnable.
- **Reaching for dynamic creation when [<code>@if</code>](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir)/<code>@switch</code> would do.** If the set of components is known and small, built-in control flow is simpler, type-checked, and tree-shakable.
- **Following old tutorials.** Anything that resolves a factory first will not compile on v22.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The main tool:</strong> <span style="color:#f0e2c8;">"I query an anchor such as an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-container</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read: ViewContainerRef</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent(WidgetClass)</code>, which returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentRef</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Inputs and outputs:</strong> <span style="color:#f0e2c8;">"I pass inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref.setInput()</code>, or since v20 declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputBinding</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputBinding</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">twoWayBinding</code> at creation, which stay live with signals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Declarative option:</strong> <span style="color:#f0e2c8;">"When I just need to render whichever type a signal holds, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ngComponentOutlet</code> with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inputs</code> object is simpler."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Outside the view:</strong> <span style="color:#f0e2c8;">"For a toast on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.body</code> I use the standalone <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent()</code> function with an environment injector, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">appRef.attachView()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern caveats:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentFactoryResolver</code> is gone in v22, components are OnPush, so direct property writes do not render, and I always destroy what I create."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInput</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref.instance.x = value</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInput</code> goes through Angular: it marks an OnPush view dirty and runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnChanges</code>. A direct assignment did not re-render the widget in our probe, because v22 components are OnPush by default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inputBinding</code> and friends give you over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">setInput</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are declared once at creation and stay live: binding a signal kept the toast text in sync with no further calls, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">twoWayBinding</code> wrote back into the parent signal, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outputBinding</code> replaced a manual <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subscribe</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you destroy dynamically created components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref.destroy()</code> for one, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewContainerRef.clear()</code> for all; components in a container are also destroyed with the parent view. Free-standing ones from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent()</code> function need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destroy()</code> and removing their host element yourself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you load the component class lazily?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Await a dynamic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code> and pass the exported class to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent</code>; the bundler splits it into its own chunk. A micro-frontend runtime returns the class the same way, just from another deployment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaced <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ComponentFactoryResolver</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing is needed: since Ivy, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createComponent</code> takes the class directly, and in v22 the resolver and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ComponentFactory</code> were removed from the public API.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ViewContainerRef** | A slot in a view where components or templates can be inserted |
| **ComponentRef** | Handle to a created component: instance, host element, setInput, destroy |
| **setInput()** | Set an input through Angular so OnPush and ngOnChanges work |
| **inputBinding / outputBinding / twoWayBinding** | Template-style bindings declared when creating a component |
| **NgComponentOutlet** | Directive that renders whichever component class you give it |
| **createComponent() function** | Create a component anywhere, given an environment injector |
| **attachView()** | Register a free-standing view with ApplicationRef so it gets change detection |
| **ComponentFactoryResolver** | The pre-Ivy factory API, removed from the v22 public API |

---
**Conclusion:** Modern Angular creates components dynamically by passing the class straight to <code>ViewContainerRef.createComponent</code>, to <code>NgComponentOutlet</code>, or to the standalone <code>createComponent()</code> function for things that live outside your view. Inputs go through <code>setInput</code> or, since v20, live <code>inputBinding</code>/<code>twoWayBinding</code>/<code>outputBinding</code> declarations, which the runs above showed staying in sync with parent signals. On 22.2.3 the old factory API is gone, components are OnPush by default (so direct property writes do not render), and free-standing components need <code>attachView</code> and explicit cleanup.`,
    examples: [
      {
        label: "ViewContainerRef.createComponent with setInput, outputs and destroy, plus NgComponentOutlet (verified AOT + playground on Angular 22.2.3)",
        tech: "angular",
        runnable: true,
        code: `import {
  Component, ComponentRef, EventEmitter, Input, Output, Type,
  ViewChild, ViewContainerRef, signal,
} from "@angular/core";
import { NgComponentOutlet } from "@angular/common";

// Two widgets the dashboard does not know about at compile time.
@Component({
  selector: "app-weather",
  template: \`<p class="w">Weather in {{ city }}: 18 C <button (click)="closed.emit(city)">x</button></p>\`,
})
export class WeatherWidget {
  @Input() city = "?";
  @Output() closed = new EventEmitter<string>();
}

@Component({
  selector: "app-stocks",
  template: \`<p class="s">{{ symbol }} is up 2%</p>\`,
})
export class StocksWidget {
  @Input() symbol = "?";
}

@Component({
  selector: "app-root",
  imports: [NgComponentOutlet],
  template: \`
    <h3>1. ViewContainerRef.createComponent</h3>
    <button id="add" (click)="addWeather()">Add weather</button>
    <button id="clear" (click)="clear()">Clear</button>
    <ng-container #slot />
    <p id="log">{{ log() }}</p>

    <h3>2. NgComponentOutlet</h3>
    <button id="swap" (click)="swap()">Swap widget</button>
    <ng-container *ngComponentOutlet="current().type; inputs: current().inputs" />
  \`,
})
export class AppComponent {
  // The anchor where dynamic views are inserted. static: true = available in ngOnInit.
  @ViewChild("slot", { read: ViewContainerRef, static: true }) slot!: ViewContainerRef;
  private refs: ComponentRef<WeatherWidget>[] = [];
  private cities = ["Oslo", "Lima", "Pune"];
  log = signal("no widgets");

  addWeather() {
    const city = this.cities[this.refs.length % this.cities.length];
    const ref = this.slot.createComponent(WeatherWidget);
    ref.setInput("city", city); // goes through Angular, so OnPush children are marked dirty
    ref.instance.closed.subscribe((c) => this.remove(ref, c));
    this.refs.push(ref);
    this.log.set(\`added \${city}; container length = \${this.slot.length}\`);
  }

  remove(ref: ComponentRef<WeatherWidget>, city: string) {
    ref.destroy(); // removes it from the container and runs its ngOnDestroy
    this.refs = this.refs.filter((r) => r !== ref);
    this.log.set(\`closed \${city}; container length = \${this.slot.length}\`);
  }

  clear() {
    this.slot.clear();
    this.refs = [];
    this.log.set(\`cleared; container length = \${this.slot.length}\`);
  }

  private widgets: { type: Type<unknown>; inputs: Record<string, unknown> }[] = [
    { type: StocksWidget, inputs: { symbol: "ACME" } },
    { type: WeatherWidget, inputs: { city: "Rome" } },
  ];
  current = signal(this.widgets[0]);
  swap() {
    this.current.set(this.current() === this.widgets[0] ? this.widgets[1] : this.widgets[0]);
  }
}`,
      },
      {
        label: "Creation-time bindings (inputBinding, twoWayBinding, outputBinding) and the standalone createComponent() on document.body (AOT-verified; signal APIs need the compiler)",
        tech: "angular",
        runnable: false,
        code: `import {
  ApplicationRef, Component, ComponentRef, EnvironmentInjector, ViewContainerRef,
  createComponent, inject, input, inputBinding, model, output, outputBinding,
  signal, twoWayBinding, viewChild,
} from "@angular/core";

// A modern child: signal input, model() and output().
@Component({
  selector: "app-toast",
  template: \`<div class="toast">{{ message() }} (seen {{ count() }}) <button (click)="dismiss.emit()">ok</button></div>\`,
})
export class Toast {
  message = input.required<string>();
  count = model(0);
  dismiss = output<void>();
}

@Component({
  selector: "app-root",
  template: \`
    <button id="show" (click)="show()">Show toast in container</button>
    <button id="bump" (click)="text.set('Saved again')">Change text</button>
    <ng-container #host />
    <p id="state">text={{ text() }} seen={{ seen() }} dismissed={{ dismissed() }}</p>
    <button id="popup" (click)="popup()">Popup on body</button>
  \`,
})
export class AppComponent {
  private host = viewChild.required("host", { read: ViewContainerRef });
  private appRef = inject(ApplicationRef);
  private env = inject(EnvironmentInjector);

  text = signal("Saved");
  seen = signal(1);
  dismissed = signal(0);
  private ref?: ComponentRef<Toast>;

  show() {
    this.host().clear();
    // Bindings are declared once at creation and stay live: no setInput calls later.
    this.ref = this.host().createComponent(Toast, {
      bindings: [
        inputBinding("message", this.text),       // signal -> input, kept in sync
        twoWayBinding("count", this.seen),        // like [(count)]="seen"
        outputBinding("dismiss", () => {          // like (dismiss)="..."
          this.dismissed.update((n) => n + 1);
          this.seen.update((n) => n + 1);
        }),
      ],
    });
  }

  popup() {
    // No ViewContainerRef: the standalone createComponent() function + a host element.
    const hostElement = document.createElement("section");
    document.body.appendChild(hostElement);
    const ref = createComponent(Toast, {
      environmentInjector: this.env,
      hostElement,
      bindings: [inputBinding("message", () => "Popup on body")],
    });
    this.appRef.attachView(ref.hostView); // without this it never updates
    ref.changeDetectorRef.detectChanges();
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle micro-frontend architecture in Angular using Module Federation?",
    seoDescription:
      "Micro-frontends in Angular: Native Federation (esbuild, import maps) vs webpack Module Federation, remotes, shared singletons and runtime loading.",
    description: `**Question presented to candidate:**
"Three teams want to ship parts of our Angular 22 portal independently: a shell, an orders area and a reporting area. How would you structure that as micro-frontends with Module Federation, and what are the trade-offs?"

**What a strong answer should cover:**
- **Host (shell)** and **remotes**: each remote is built and deployed separately and **exposes** modules (a component or a routes file); the host loads them **at runtime**.
- Two implementations for Angular: **webpack Module Federation** (\`@angular-architects/module-federation\`, needs a webpack builder) and **Native Federation** (\`@angular-architects/native-federation\`, built on the CLI's esbuild builder, ES modules and import maps).
- **Shared dependencies**: Angular, RxJS and shared libraries configured as **singletons** with version rules, so one copy of \`@angular/core\` runs.
- **Dynamic remotes** via a **manifest** (\`federation.manifest.json\`) so URLs can change per environment without rebuilding the shell; load with \`loadRemoteModule\` inside \`loadComponent\`/\`loadChildren\`.
- Cross-cutting concerns: routing ownership, communication (URL, custom events, a shared library), design system, auth, and failure handling when a remote is down.
- Honest trade-offs: team autonomy and independent deploys vs bundle duplication risk, version coordination, and operational complexity; a monorepo with lazy routes is often enough.

**Clarifying questions expected:**
- "Do teams need independent deployments, or just independent code ownership?"
- "Must all parts stay on the same Angular version, or mix versions and frameworks?"
- "Is SSR required?"

**Code / implementation expected:** Optional — a remote's federation config and a host route that loads an exposed component.`,
    answer: `**Target Audience:** Engineers designing a large Angular front end split across several teams, and anyone asked a front-end architecture question in a senior interview.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. For this answer a real remote and host were generated and built with <code>@angular-architects/native-federation</code> 22.2.2 on Angular CLI 22.2.3, and the remote's exposed component was loaded with Native Federation's Node runtime. **Nothing was run in a real browser** (none is available in this sandbox), webpack Module Federation was not built, and package facts come from the packages' npm pages as of October 2026. Each section says which of these it relies on.

## 1. Why This Even Matters — A Story First

A shopping centre has one owner, one roof and one car park, but each shop is run by a different company. A shop can refit its interior on a Tuesday without asking the others, as long as it uses the shared doors, the shared electricity and the agreed signage.

**Micro-frontends** apply that to a web app. The shell is the shopping centre: the header, navigation, login and car park. Each remote is a shop that a separate team builds and deploys on its own schedule. **Module Federation** is the set of shared doors and wiring that lets the shell load a shop's code at runtime, while making sure that heavy shared infrastructure, like Angular itself, is only installed once.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do teams need **independent deployments**, or only independent ownership of code? | Ownership alone is solved by a monorepo with lazy routes; runtime federation is only worth its cost for independent deploys |
| Will every part stay on the **same Angular major**? | Federation shares one Angular as a singleton; mixed majors push you towards web components or iframes |
| How many remotes, and how often do they change? | Drives manifest design, caching and how much version negotiation you will fight |
| Is **SSR** or SEO needed for remote areas? | Adds a server-side federation runtime and makes failures more visible; see [Angular SSR](/interview-question/what-is-angular-universal-ssr) |
| What happens if a remote is down? | Determines fallbacks, error routes and monitoring per remote |
| Is there a shared design system and auth? | Shared libraries must be singletons, or users see two themes and two sessions |

## 3. The Core Idea

📌 **Interview term: Micro-frontend** — a part of the UI owned, built and deployed by one team, composed with others into one app at runtime.

📌 **Interview term: Host (shell) / Remote** — the host is the app the user opens; a remote is a separately built app that **exposes** modules for hosts to load.

📌 **Interview term: Module Federation** — the mental model (originally a webpack 5 feature) where builds publish a manifest of exposed modules and shared dependencies, and a runtime loads exposed modules on demand while negotiating shared versions.

📌 **Interview term: Native Federation** — the same mental model implemented on browser standards: remotes are plain ES modules, wired together with an **import map**, and built with the Angular CLI's esbuild <code>ApplicationBuilder</code>. Its npm page describes it as "the mental model of Module Federation, implemented on browser standards (ES modules and import maps)".

📌 **Interview term: Shared singleton** — a dependency (like <code>@angular/core</code>) configured so only one copy is loaded across host and remotes, with version rules (<code>requiredVersion</code>, <code>strictVersion</code>) deciding what happens on a mismatch.

📌 **Interview term: Federation manifest** — a JSON file the host loads at start-up mapping remote names to their <code>remoteEntry.json</code> URLs, so environments can point at different deployments without rebuilding the host.

## 4. The Moving Parts

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="The shell reads a manifest, fetches the remote entry metadata of mfe1, loads the exposed Orders module on navigation, and both use one shared copy of Angular through the import map">
  <defs>
    <marker id="mf13-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="210" height="80" rx="12"/>
  <text class="d-text d-accent" x="125" y="62" text-anchor="middle">shell (host)</text>
  <text class="d-sub" x="125" y="86" text-anchor="middle">route: /orders</text>
  <path class="d-edge" d="M 234 70 L 296 70" marker-end="url(#mf13-arrow)"/>
  <rect class="d-box" x="302" y="30" width="200" height="80" rx="12"/>
  <text class="d-text" x="402" y="62" text-anchor="middle">manifest.json</text>
  <text class="d-sub" x="402" y="86" text-anchor="middle">mfe1: its remoteEntry</text>
  <path class="d-edge" d="M 506 70 L 558 70" marker-end="url(#mf13-arrow)"/>
  <rect class="d-box" x="564" y="30" width="196" height="80" rx="12"/>
  <text class="d-text" x="662" y="62" text-anchor="middle">mfe1 remoteEntry</text>
  <text class="d-sub" x="662" y="86" text-anchor="middle">exposes ./Orders</text>
  <path class="d-edge-accent" d="M 662 114 L 662 166" marker-end="url(#mf13-arrow)"/>
  <rect class="d-box-accent" x="564" y="172" width="196" height="70" rx="12"/>
  <text class="d-text d-accent" x="662" y="212" text-anchor="middle">Orders chunk</text>
  <rect class="d-box-muted" x="20" y="172" width="482" height="70" rx="12"/>
  <text class="d-text" x="261" y="202" text-anchor="middle">import map: one shared @angular/core</text>
  <text class="d-sub" x="261" y="226" text-anchor="middle">singleton, strictVersion, requiredVersion</text>
  <path class="d-edge-dashed" d="M 560 207 L 506 207" marker-end="url(#mf13-arrow)"/>
</svg>

The shell knows only names and a manifest URL at build time. The remote's metadata, its exposed chunk and the negotiation of shared packages all happen when the user first needs that part of the app.

## 5. Two Implementations

| | webpack Module Federation | Native Federation |
| :--- | :--- | :--- |
| Angular package | <code>@angular-architects/module-federation</code> (22.0.0 on npm) | <code>@angular-architects/native-federation</code> (22.2.2 on npm, peer <code>@angular/build ~22.2.0</code>) |
| Bundler | webpack (or experimental rspack via <code>@nx/angular-rspack</code>) | The CLI's esbuild <code>ApplicationBuilder</code> |
| Runtime | webpack Module Federation runtime | ES modules + import maps (<code>es-module-shims</code> in shim mode by default) |
| CLI integration in v22 | <code>@angular-builders/custom-webpack</code> (it used <code>ngx-build-plus</code> up to Angular 21, per its README) | Its own builder that delegates to the Angular CLI builders |
| Fits the default v22 build | No: it swaps the default esbuild builder for a webpack one | Yes: keeps the esbuild/Vite toolchain ([the esbuild build](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve)) |
| Typical reason to pick | Existing webpack MF estate, or mixing with other webpack MF apps | New Angular projects on the default builder |

Both npm READMEs (October 2026) point the same way: the module-federation README says "Looking for the esbuild/ApplicationBuilder route? That is Native Federation", and the native-federation README notes that Angular 20 and 21 use the <code>@angular-architects/native-federation-v4</code> bridge package while Angular 22+ uses the main package again. The broader Module Federation runtime is published separately as <code>@module-federation/enhanced</code> (2.9.2).

## 6. Verified: building a remote and a host

Done in two copies of a fresh CLI 22.2.3 workspace, with <code>npm i -D @angular-architects/native-federation@22.2.2</code>:

\`\`\`
ng g @angular-architects/native-federation:init --project demo --port 4201 --type remote
ng g @angular-architects/native-federation:init --project demo --port 4200 --type dynamic-host
\`\`\`

The schematic created <code>federation.config.mjs</code>, <code>tsconfig.federation.json</code> and <code>src/bootstrap.ts</code>, rewrote <code>src/main.ts</code> to start federation before bootstrapping, switched <code>angular.json</code> to the <code>@angular-architects/native-federation:build</code> builder (keeping the original <code>@angular/build:application</code> target as <code>esbuild</code>, with <code>es-module-shims</code> in its polyfills), and for the host created an empty <code>public/federation.manifest.json</code>.

The remote config (first example) was edited to <code>name: 'mfe1'</code> exposing <code>'./Orders'</code>. <code>ng build</code> printed <code>Building federation artifacts</code> and produced a <code>remoteEntry.json</code> with:

\`\`\`
"$version": "v4", "name": "mfe1"
exposes: [{ "key": "./Orders", "outFileName": "Orders-ADCY7HXB.js" }]
shared:  13 entries, e.g. { "packageName": "@angular/core", "requiredVersion": "^22.2.0",
                            "singleton": true, "strictVersion": true, "version": "22.2.3" }
\`\`\`

plus an <code>importmap.json</code> mapping <code>@angular/core</code> to <code>_angular_core.AnS7MGp98i.js</code>, and an <code>index.html</code> whose main script is <code>type="module-shim"</code> after <code>&lt;script type="esms-options"&gt;{"shimMode":true}&lt;/script&gt;</code>. The host build emitted the same <code>_angular_core.AnS7MGp98i.js</code> file name, because both sides share the identical 22.2.3 package.

The host route (second example) loads the remote lazily. In 22.2.2 the top-level <code>loadRemoteModule</code> export is marked <code>@deprecated</code> ("Prefer the <code>loadRemoteModule</code> returned by the <code>initFederation</code> promise"), so the host keeps that promise in one module:

\`\`\`ts
// src/federation.ts (host)
export const federation = initFederation('federation.manifest.json', {
  hostRemoteEntry: { url: './remoteEntry.json' },
});
// src/main.ts (host)
federation.then(() => import('./bootstrap')).catch((err) => console.error(err));
\`\`\`

Host and remote both completed <code>ng build</code> with these files.

## 7. Verified: loading the remote at runtime (Node, not a browser)

Native Federation also ships a Node runtime (<code>initNodeFederation</code> from <code>@softarc/native-federation-orchestrator/node</code>, the one its [SSR](/interview-question/what-is-angular-universal-ssr) support uses). Pointing it at the built remote:

\`\`\`
exports of mfe1/./Orders: [ 'Orders' ]
Orders selector: [ [ 'mfe1-orders' ] ]
missing exposed module: Failed to load module mfe1/./Missing
\`\`\`

So the remote's exposed module resolved to the real component class, with its compiled selector, which a route's [<code>loadComponent</code>](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) or a [<code>ViewContainerRef</code>](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref) can render like any other class (see [dynamically creating components](/interview-question/how-do-you-dynamically-create-components)), and asking for a name the remote does not expose failed with a clear error. One limitation showed up: pointing the Node runtime at an <code>http://</code> remote entry failed with <code>ERR_INVALID_URL</code> for <code>http://127.0.0.1:4201/Orders-ADCY7HXB.js</code>, because Node's module loader does not import <code>http:</code> URLs; <code>file://</code> URLs worked. Browser loading over HTTP, the import-map shim and runtime version negotiation between mismatched versions were **not** exercised here.

## 8. Designing the System

- **Split by business domain, not by technical layer.** "Orders" and "Reporting" are good remotes; "buttons" and "services" are not.
- **Expose routes rather than single components** for whole areas: the remote exposes a <code>routes</code> file and the shell uses [<code>loadChildren</code>](/interview-question/how-does-routing-and-lazy-loading-work-in-angular), so the team owns its sub-navigation. Guards stay in the shell or the remote deliberately; see [functional guards and loadComponent](/interview-question/how-do-functional-route-guards-and-lazy-loadcomponent-work-in-modern-angular).
- **Share as little as possible, but share the right things as singletons:** Angular, RxJS, the design system, the auth client. Everything else stays private to each remote.
- **Communicate through the URL first**, then browser custom events or a small shared library with an [InjectionToken](/interview-question/what-is-an-injectiontoken)-based contract. Avoid importing another remote's internals.
- **Plan for failure.** Wrap <code>loadRemoteModule</code> so a missing remote routes to an error page instead of breaking navigation; the <code>LoadRemoteModuleOptions</code> type in 22.2.2 even has a <code>fallback</code> field.
- **Keep the manifest per environment**, served or generated at deploy time; see [loading configuration at start-up](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st) for the same idea applied to app config.
- **Version discipline:** agree on Angular majors together. <code>strictVersion: true</code> turns a silent duplicate into a visible error, which is what you want.

Alternatives worth naming: a **monorepo** with lazy routes and library boundaries (often enough), **Angular Elements / web components** for mixed frameworks (see [CUSTOM_ELEMENTS_SCHEMA](/interview-question/what-is-the-customelements-schema-in-angular-and-when-do-you-need-to-use-it)), and **iframes** for hard isolation.

## 9. Common Pitfalls

- **Choosing micro-frontends for code ownership alone.** If teams deploy together, lazy routes in one repo give most of the benefit with none of the runtime risk ([routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)).
- **Sharing Angular as a non-singleton.** Two copies of <code>@angular/core</code> means two injectors and two [change detection](/interview-question/how-does-change-detection-work-in-angular) worlds; services stop being shared and errors become baffling.
- **Mixing webpack Module Federation with the default [esbuild](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve) build.** The webpack plugin needs a webpack builder; on the v22 default toolchain, Native Federation is the matching option.
- **Hard-coding remote URLs in the shell.** Use a manifest so staging and production differ by configuration, not by build.
- **Using the deprecated top-level <code>loadRemoteModule</code>.** In 22.2.2 prefer the function returned by <code>initFederation</code>.
- **Assuming federation solves styling and state.** It loads code; a shared design system and clear state ownership are still design work ([state management options](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular)).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The model:</strong> <span style="color:#f0e2c8;">"A shell app loads remotes at runtime; each remote is built and deployed by its own team and exposes components or route files."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shared code:</strong> <span style="color:#f0e2c8;">"Angular, RxJS and the design system are shared as singletons with version rules, so only one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/core</code> runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tooling on v22:</strong> <span style="color:#f0e2c8;">"With the default esbuild builder I use Native Federation, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular-architects/native-federation</code>; webpack Module Federation needs a webpack builder."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Wiring:</strong> <span style="color:#f0e2c8;">"Remote URLs live in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">federation.manifest.json</code> per environment, and routes call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadRemoteModule</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadComponent</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadChildren</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">"It buys independent deploys at the cost of version coordination and runtime failure modes, so for one team or shared releases I prefer a monorepo with lazy routes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between Module Federation and Native Federation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same mental model: hosts, remotes, exposed modules, shared singletons. Module Federation is the webpack runtime; Native Federation uses ES modules and import maps and plugs into the Angular CLI esbuild builder, which is why it suits the v22 default toolchain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop each remote shipping its own Angular?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Declare Angular as shared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">singleton: true</code>, and in practice <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictVersion: true</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requiredVersion</code> from package.json. The built <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remoteEntry.json</code> then lists <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/core</code> as shared, and the runtime loads one copy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do remotes communicate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefer the URL for navigation state, browser custom events for loose notifications, and a small shared library with an explicit contract for anything richer. Never import another remote's internals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a remote is down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> of its exposed module fails. Wrap the load: catch it, route to an error or fallback component, and monitor each remote separately. The 22.2.2 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadRemoteModule</code> options include a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fallback</code> for this.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use micro-frontends?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When one team owns the app, or all teams release together. A monorepo with lazy routes and library boundaries gives code ownership without runtime coupling or version negotiation.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Micro-frontend** | A UI area built and deployed by one team, composed at runtime |
| **Host / shell** | The app users open; loads remotes |
| **Remote** | A separately deployed app that exposes modules |
| **Module Federation** | Runtime loading of exposed modules plus shared dependency negotiation |
| **Native Federation** | Module Federation ideas on ES modules and import maps, for the esbuild builder |
| **remoteEntry.json** | A remote's metadata: exposed modules and shared packages |
| **Federation manifest** | Host-side map of remote names to their remoteEntry URLs |
| **Shared singleton** | A package loaded once for all remotes, with version rules |
| **Import map** | Browser feature mapping bare specifiers like @angular/core to URLs |

---
**Conclusion:** Micro-frontends in Angular mean a shell that loads separately deployed remotes at runtime, with Angular and a few key libraries shared as singletons. On Angular 22 the natural fit for the default esbuild toolchain is Native Federation (<code>@angular-architects/native-federation</code> 22.2.2), while webpack Module Federation (<code>@angular-architects/module-federation</code>) remains for webpack-based estates. Building a real remote and host here produced exactly the expected artifacts (a <code>remoteEntry.json</code> exposing <code>./Orders</code> with <code>@angular/core</code> as a strict singleton), and the Node runtime loaded the exposed component class; browser execution was not tested. The architecture decision, though, comes before the tooling: federate only when teams truly need independent deploys, and plan routing, communication, versions and failure handling up front.`,
    examples: [
      {
        label: "Remote: federation.config.mjs generated by the native-federation init schematic, edited to expose ./Orders (built with ng build)",
        tech: "angular",
        runnable: false,
        code: `import {
  withNativeFederation,
  fromPackageJson,
} from '@angular-architects/native-federation/config';

export default withNativeFederation({
  name: 'mfe1',

  exposes: {
    './Orders': './src/app/orders.ts',
  },

  shared: fromPackageJson({
    singleton: true,
    strictVersion: true,
    requiredVersion: 'auto',
    build: 'package',
  })
    // includeSecondaries is an opt-out of ignoreUnusedDeps, so all of
    // @angular/core is shared to prevent mismatches.
    .patch(['@angular/core'], { includeSecondaries: { keepAll: true } }),

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    // Add further packages you don't need at runtime
  ],

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: {
    // ignoreUnusedDeps is enabled by default now
    // ignoreUnusedDeps: true,

    // Opt-in: groups chunks in remoteEntry.json for smaller metadata file
    denseChunking: true,
  },
});`,
      },
      {
        label: "Host: lazy route that loads the remote component via the initFederation result (built with ng build; not run in a browser)",
        tech: "angular",
        runnable: false,
        code: `import { Routes } from '@angular/router';
import { federation } from '../federation';

export const routes: Routes = [
  {
    path: 'orders',
    // Resolved at runtime from the manifest, not at build time.
    loadComponent: () =>
      federation
        .then((nf) => nf.loadRemoteModule<typeof import('./orders-types')>('mfe1', './Orders'))
        .then((m) => m.Orders),
  },
];`,
      },
    ],
  },
];

export default augments;
