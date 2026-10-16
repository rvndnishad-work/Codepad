/**
 * Angular ULTRA — batch 06: RxJS subjects and operators (Subject vs
 * BehaviorSubject vs ReplaySubject, the four flattening maps, forkJoin / zip /
 * combineLatest / withLatestFrom, shareReplay, catchError, take(1) vs first())
 * and state management (NgRx Store, NgRx Effects, the library landscape).
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
 * Every RxJS ordering claim (emission timelines, cancellation, subscription
 * counts, EmptyError) was produced by running RxJS 7.8.2 scripts, timelines
 * under rxjs/testing TestScheduler virtual time so the millisecond values are
 * deterministic. Component examples were run on Angular 22.2.3 with
 * scripts/verify-angular-example.mjs: AOT-compiled with ngc and
 * strictTemplates, booted with bootstrapApplication in jsdom; examples marked
 * runnable also passed its --playground mode (plain transpile + JIT, the way
 * the site playground runs them). NgRx examples ran a real store, effects and
 * SignalStore from @ngrx/store, @ngrx/effects and @ngrx/signals 22.0.1; they
 * are runnable: false because the playground cannot provide @ngrx packages.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between Subject, BehaviorSubject, and ReplaySubject?",
    seoDescription:
      "Subject, BehaviorSubject and ReplaySubject differ in what a late subscriber gets: nothing, the current value, or the last N values. Verified in RxJS 7.8.",
    description: `**Question presented to candidate:**
"We keep the logged-in user in a service and several components subscribe to it, some of them long after login. Which kind of Subject would you use, and how do Subject, BehaviorSubject and ReplaySubject differ?"

**What a strong answer should cover:**
- A **Subject** is both an Observable and an Observer: it **multicasts** each \`next()\` to every current subscriber, and is **hot** (values sent before you subscribe are gone).
- The three differ in **what a late subscriber receives**: Subject gives nothing from the past, **BehaviorSubject** gives the current value (it needs an initial one), **ReplaySubject(n)** replays the last n values (optionally limited by a time window).
- BehaviorSubject exposes a synchronous \`getValue()\` / \`value\`; ReplaySubject has no initial value and no getter.
- **After \`complete()\`** a late subscriber of a BehaviorSubject gets only the completion, while a ReplaySubject still replays its buffer.
- Expose subjects with \`asObservable()\` so only the owning service can call \`next()\`; in modern Angular a \`signal()\` often replaces a BehaviorSubject for UI state.
- Mention **AsyncSubject** (emits only the last value, on complete) as the fourth variant.

**Clarifying questions expected:**
- "Does a component that subscribes later need the current value, or only future changes?"
- "Is this UI state the template reads (a signal might fit better) or an event stream?"

**Code / implementation expected:** Yes — a small service or component that shows what a late subscriber gets from each subject.`,
    answer: `**Target Audience:** Angular developers who have used <code>subscribe()</code> but are fuzzy on the Subject family. No RxJS internals assumed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every behaviour claim in sections 4 to 6 was produced by running RxJS 7.8.2, and the example in section 7 was compiled and clicked through on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

Picture three ways a teacher can run a classroom when a student arrives late.

The first teacher just keeps talking. Whatever was said before you walked in is gone; you hear only what comes next. That is a **Subject**.

The second teacher has a whiteboard with today's single most important fact written on it. When you walk in you read the board, so you are instantly up to date, and then you hear everything new. Before class starts the board already says something ("Welcome"), because a board is never empty. That is a **BehaviorSubject**.

The third teacher records the lesson and replays the last few minutes to anyone who arrives late, then carries on live. That is a **ReplaySubject**.

Angular apps are full of late arrivals. A header renders at startup, a profile panel opens five minutes later, a lazy-loaded route mounts after the user has already logged in. Picking the wrong subject means the late component shows a blank name or a stale cart, which is why interviewers ask this question so often.

## 2. The Core Idea

📌 **Interview term: Observable** — a lazy stream of values over time. Nothing happens until someone subscribes. (If you are still deciding between streams and promises, see [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises).)

📌 **Interview term: Subject** — an object that is **both** an Observable (you can <code>subscribe()</code> to it) and an Observer (you can call <code>next()</code>, <code>error()</code> and <code>complete()</code> on it). It is how imperative code ("the user just logged in") pushes values into the reactive world.

📌 **Interview term: Multicast** — one value, delivered to many subscribers. A plain Observable created with <code>new Observable()</code> runs its setup once **per subscriber** (unicast). A Subject keeps a list of subscribers and loops over it on every <code>next()</code>.

📌 **Interview term: Hot vs cold** — a **cold** observable starts producing when you subscribe and each subscriber gets its own run (like <code>HttpClient.get</code>). A **hot** source produces whether or not anyone listens, so a late subscriber can miss values. A Subject is hot. The three variants exist precisely to control **what a late subscriber is given on arrival**.

| | On subscribe, the newcomer receives | Needs an initial value | Sync read of the latest value |
| :--- | :--- | :--- | :--- |
| <code>Subject</code> | nothing from the past | no | no |
| <code>BehaviorSubject(init)</code> | the current value (initially <code>init</code>) | **yes** | <code>getValue()</code> / <code>.value</code> |
| <code>ReplaySubject(n, windowMs?)</code> | the last <code>n</code> values, optionally only those younger than <code>windowMs</code> | no | no |
| <code>AsyncSubject</code> | nothing until <code>complete()</code>, then only the last value | no | no |

## 3. Picture It

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Three subjects receive the values 1, 2 and 3, then a late subscriber joins and each subject hands it something different">
  <text class="d-text" x="465" y="30" text-anchor="middle">late subscriber joins here</text>
  <path class="d-edge-dashed" d="M 465 44 L 465 270"/>
  <text class="d-text" x="20" y="85">Subject</text>
  <path class="d-edge" d="M 190 80 L 440 80"/>
  <circle class="d-box" cx="250" cy="80" r="16"/>
  <text class="d-text" x="250" y="85" text-anchor="middle">1</text>
  <circle class="d-box" cx="320" cy="80" r="16"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">2</text>
  <circle class="d-box" cx="390" cy="80" r="16"/>
  <text class="d-text" x="390" y="85" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="500" y="60" width="190" height="40" rx="8"/>
  <text class="d-sub" x="595" y="85" text-anchor="middle">gets nothing yet</text>
  <text class="d-text" x="20" y="160">BehaviorSubject(0)</text>
  <path class="d-edge" d="M 190 155 L 440 155"/>
  <circle class="d-box" cx="250" cy="155" r="16"/>
  <text class="d-text" x="250" y="160" text-anchor="middle">1</text>
  <circle class="d-box" cx="320" cy="155" r="16"/>
  <text class="d-text" x="320" y="160" text-anchor="middle">2</text>
  <circle class="d-box" cx="390" cy="155" r="16"/>
  <text class="d-text" x="390" y="160" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="500" y="135" width="190" height="40" rx="8"/>
  <text class="d-text d-accent" x="595" y="160" text-anchor="middle">gets 3 at once</text>
  <text class="d-text" x="20" y="235">ReplaySubject(2)</text>
  <path class="d-edge" d="M 190 230 L 440 230"/>
  <circle class="d-box" cx="250" cy="230" r="16"/>
  <text class="d-text" x="250" y="235" text-anchor="middle">1</text>
  <circle class="d-box" cx="320" cy="230" r="16"/>
  <text class="d-text" x="320" y="235" text-anchor="middle">2</text>
  <circle class="d-box" cx="390" cy="230" r="16"/>
  <text class="d-text" x="390" y="235" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="500" y="210" width="190" height="40" rx="8"/>
  <text class="d-text d-accent" x="595" y="235" text-anchor="middle">gets 2 then 3</text>
</svg>

All three subjects saw exactly the same <code>next(1)</code>, <code>next(2)</code>, <code>next(3)</code>. The only difference is the buffer each one keeps: none, one value, or the last <code>n</code> values. After joining, the late subscriber receives every future value from all three in the same way.

## 4. Verified: the same script against all four subjects

The script subscribes <code>A</code>, sends 1 and 2, subscribes <code>B</code>, sends 3, completes, then subscribes <code>C</code> **after** completion. Run on RxJS 7.8.2:

\`\`\`
--- Subject
  A got 1
  A got 2
  A got 3
  B got 3
  B complete
  C complete
--- BehaviorSubject(0)
  A got 0
  A got 1
  A got 2
  B got 2
  A got 3
  B got 3
  B complete
  C complete
--- ReplaySubject(2)
  A got 1
  A got 2
  B got 1
  B got 2
  A got 3
  B got 3
  B complete
  C (after complete) got 2
  C (after complete) got 3
  C complete
--- AsyncSubject
  A got 3
  B got 3
  B complete
  C (after complete) got 3
  C complete
\`\`\`

Three details in that output are worth saying out loud in an interview:

1. **BehaviorSubject emits its initial value to the very first subscriber** (<code>A got 0</code>). That is why it is the natural fit for "current user" or "current filter": a subscriber never waits.
2. **ReplaySubject replays synchronously inside <code>subscribe()</code>**, before the next live value: <code>B got 1</code>, <code>B got 2</code> print before <code>A got 3</code>.
3. **After <code>complete()</code>, a BehaviorSubject gives a late subscriber nothing but the completion** (<code>C complete</code> with no value), whereas ReplaySubject and AsyncSubject still hand over their stored values. If a late component must see the last value even after the source finished, BehaviorSubject is the wrong choice. (<code>AsyncSubject</code> behaves like a Promise that resolves on completion; its Promise-style cousins <code>firstValueFrom</code> and <code>lastValueFrom</code> appear in [take(1) vs first()](/interview-question/what-is-the-difference-between-take-1-and-first-operators-in-rxjs).)

## 5. Verified: the small API differences

\`\`\`
getValue: init
value: x
getValue after error throws: boom
next after complete ignored, observers: false
asObservable has next? undefined
windowTime late sub got new
\`\`\`

- <code>getValue()</code> and the <code>value</code> getter return the current value synchronously. Once the subject has errored, <code>getValue()</code> **rethrows** that error.
- Calling <code>next()</code> after <code>complete()</code> is silently ignored.
- <code>asObservable()</code> returns a plain Observable with no <code>next</code> method, which is how a service keeps write access to itself.
- <code>new ReplaySubject(Infinity, 100)</code> keeps values for 100 ms only: a subscriber arriving 150 ms after <code>"old"</code> was sent received just <code>"new"</code>.

📌 **Interview term: <code>asObservable()</code>** — the encapsulation idiom. The service holds <code>private user$$ = new BehaviorSubject&lt;User | null&gt;(null)</code> and exposes <code>readonly user$ = this.user$$.asObservable()</code>, so components can read but only the service can write. It is the RxJS counterpart of exposing a signal with <code>asReadonly()</code>.

## 6. Which One, When

| Situation | Pick | Why |
| :--- | :--- | :--- |
| Button clicks, "save requested", notifications | <code>Subject</code> | It is an event: a late listener should not receive an old click |
| Current user, selected tab, current filter | <code>BehaviorSubject</code> (or a signal) | There is always a current value and newcomers need it immediately |
| Last few chat messages, recent log lines | <code>ReplaySubject(n)</code> | Newcomers need some history, not just the latest |
| Cache the result of a one-shot request | <code>shareReplay(1)</code> over the request | Same replay behaviour without managing a subject by hand; see [shareReplay](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ) |
| A value that only matters once the work finishes | <code>AsyncSubject</code> | Emits only the final value, on complete |

📌 **Interview term: Signal as a BehaviorSubject replacement** — for **state the template reads**, Angular now prefers a [signal](/interview-question/what-are-angular-signals): it always has a value (like BehaviorSubject), reads synchronously, and change detection knows exactly who depends on it. Keep subjects for **event streams** and anything that needs RxJS operators, and bridge the two with [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs). For the wider trade-off see [Signals vs RxJS](/interview-question/signals-signal-computed-effect-vs-rxjs-when-do-you-use-which-in-angular-18).

## 7. Verified: a late subscriber inside an Angular component

The example below (also the runnable example for this question) holds one of each subject. Clicking **next** pushes the same number into all three; **Add late subscriber** subscribes afterwards and records what each subject hands over. Compiled with <code>ngc</code> (strict templates) and run in jsdom; each line is the root text content, so adjacent elements run together:

\`\`\`
after 3 x next  : next(4)Add late subscriberSubject: -BehaviorSubject(0): -ReplaySubject(2): -Current BehaviorSubject value: 3
after late sub  : next(4)Add late subscriberSubject: -BehaviorSubject(0): got 3ReplaySubject(2): got 2, got 3Current BehaviorSubject value: 3
after next(4)   : next(5)Add late subscriberSubject: got 4BehaviorSubject(0): got 3, got 4ReplaySubject(2): got 2, got 3, got 4Current BehaviorSubject value: 4
\`\`\`

On joining, the late subscriber got nothing from the Subject, <code>3</code> from the BehaviorSubject and <code>2, 3</code> from the ReplaySubject. From then on all three delivered <code>4</code> identically. Note the component stores what it receives in **signals**: in Angular 22 the app is [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) and components are OnPush by default (see [how change detection works](/interview-question/how-does-change-detection-work-in-angular)), so writing to a plain field inside a subscription would not re-render the template.

A typical service shape looks like this (not a runnable example, since it needs a login flow around it):

\`\`\`ts
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly user$$ = new BehaviorSubject<User | null>(null);
  readonly user$ = this.user$$.asObservable();      // read-only for consumers
  readonly user = toSignal(this.user$, { requireSync: true }); // template-friendly

  login(u: User) { this.user$$.next(u); }
  logout() { this.user$$.next(null); }
}
\`\`\`

<code>toSignal(..., { requireSync: true })</code> works here precisely because a BehaviorSubject emits synchronously on subscribe; with a plain Subject it throws (verified on 22.2.3: "NG0601: <code>toSignal()</code> called with <code>requireSync</code> but <code>Observable</code> did not emit synchronously."). This is the same "current value" guarantee, used by a different API. Sharing such a service between components that are not parent and child is covered in [passing data between sibling components](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-).

## 8. Common Pitfalls

- **Using a plain Subject for state.** A component that subscribes after the value was sent shows nothing until the next change. If there is a "current" value, use BehaviorSubject or a signal.
- **Exposing the subject itself.** <code>public cart$ = new BehaviorSubject(...)</code> lets any component call <code>next()</code>. Expose <code>asObservable()</code> and keep the write methods in the service.
- **Calling <code>getValue()</code> all over the place.** It is an escape hatch for imperative code; building logic on it bypasses the stream and goes stale silently. Prefer subscribing, the [async pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful) or <code>toSignal()</code>.
- **<code>new ReplaySubject()</code> with no buffer size.** The default is <code>Infinity</code> (verified: after 1000 <code>next()</code> calls a new subscriber received all 1000 values): it keeps every value forever, a slow memory leak in a long-lived service. Always pass <code>n</code> (and a window time if history should expire).
- **Expecting a value from a completed BehaviorSubject.** As verified above, a subscriber that arrives after <code>complete()</code> gets only the completion.
- **Forgetting to unsubscribe from long-lived subjects.** Subjects in root services never complete, so component subscriptions must end with the component; see [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shared idea:</strong> <span style="color:#f0e2c8;">"A Subject is both an Observable and an Observer: I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> on it and every current subscriber gets the value. It is hot and multicast."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The one difference:</strong> <span style="color:#f0e2c8;">"The variants differ only in what a late subscriber receives on arrival: nothing, the current value, or the last N values."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. BehaviorSubject:</strong> <span style="color:#f0e2c8;">"BehaviorSubject needs an initial value, emits the current value immediately to every new subscriber, and exposes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getValue()</code>. Good for current user or current filter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. ReplaySubject:</strong> <span style="color:#f0e2c8;">"ReplaySubject(n) replays the last n values, optionally limited by a time window. Good when newcomers need some history."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern Angular:</strong> <span style="color:#f0e2c8;">"For UI state I would usually reach for a signal now, keep Subjects for event streams, and always expose them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asObservable()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a late subscriber get from a BehaviorSubject that has already completed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the completion notification, no value. I verified it: the subscriber logged just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">complete</code>. A ReplaySubject in the same situation still replays its buffer, and an AsyncSubject still emits its final value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toSignal(subject, { requireSync: true })</code> work for a BehaviorSubject but not a Subject?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireSync</code> asserts the source emits synchronously during subscribe. A BehaviorSubject always does, because it has a current value. A plain Subject has nothing to emit yet, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0601</code>: requireSync was set but the Observable did not emit synchronously.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use AsyncSubject?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely in Angular. It emits only the last value, and only when it completes, which is the same shape as a Promise. Most people use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">firstValueFrom</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastValueFrom</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shareReplay(1)</code> over a completing source instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new ReplaySubject()</code> without arguments safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for a long-lived service. The default buffer size is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>, so it stores every value ever sent. Pass a size, and a window time in milliseconds if old values should expire.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">share()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shareReplay()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Those operators create and manage a subject for you around a source observable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">share()</code> uses a plain Subject, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shareReplay(n)</code> uses a ReplaySubject. You pick a manual subject when imperative code needs to push values, and the operators when you want to multicast an existing stream such as an HTTP call.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Observable** | A lazy stream of values; nothing runs until you subscribe |
| **Subject** | Observable and Observer at once; multicasts each <code>next()</code> to current subscribers |
| **Multicast** | One emission delivered to many subscribers |
| **Hot vs cold** | Hot produces regardless of subscribers; cold starts a new run per subscriber |
| **BehaviorSubject** | Subject with a current value, given to every newcomer; has <code>getValue()</code> |
| **ReplaySubject** | Subject that replays the last N values (optionally within a time window) |
| **AsyncSubject** | Subject that emits only its final value, on complete |
| **<code>asObservable()</code>** | Read-only view of a subject, so only the owner can push values |

---
**Conclusion:** All three are hot, multicasting Subjects; the whole difference is the buffer each keeps for subscribers who arrive late. A Subject keeps nothing, so it suits events; a BehaviorSubject keeps exactly one current value (and must start with one), so it suits state; a ReplaySubject keeps the last N values, so it suits short histories. The verified runs add two sharp edges: ReplaySubject replays synchronously inside <code>subscribe()</code>, and a completed BehaviorSubject gives a late subscriber nothing but the completion. In Angular 22, state the template reads is usually better held in a signal, with subjects kept for event streams and exposed through <code>asObservable()</code>.`,
    examples: [
      {
        label: "Late subscriber: what Subject, BehaviorSubject(0) and ReplaySubject(2) hand over",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnDestroy, signal } from "@angular/core";
import { BehaviorSubject, ReplaySubject, Subject, Subscription } from "rxjs";

// Three kinds of Subject receive the same values. A "late" subscriber joins
// after two values have already been sent, so you can see what each one replays.
@Component({
  selector: "app-root",
  template: \`
    <button (click)="emit()">next({{ counter() + 1 }})</button>
    <button (click)="addLate()" [disabled]="lateAdded()">Add late subscriber</button>
    <ul>
      <li>Subject: {{ logs.subject().join(", ") || "-" }}</li>
      <li>BehaviorSubject(0): {{ logs.behavior().join(", ") || "-" }}</li>
      <li>ReplaySubject(2): {{ logs.replay().join(", ") || "-" }}</li>
    </ul>
    <p>Current BehaviorSubject value: {{ current() }}</p>
  \`,
})
export class AppComponent implements OnDestroy {
  private subject = new Subject<number>();
  private behavior = new BehaviorSubject<number>(0);
  private replay = new ReplaySubject<number>(2);
  private subs = new Subscription();

  counter = signal(0);
  lateAdded = signal(false);
  current = signal(this.behavior.getValue());
  // What the LATE subscriber has received from each subject.
  logs = { subject: signal<string[]>([]), behavior: signal<string[]>([]), replay: signal<string[]>([]) };

  emit() {
    const n = this.counter() + 1;
    this.counter.set(n);
    this.subject.next(n);
    this.behavior.next(n);
    this.replay.next(n);
    this.current.set(this.behavior.value);
  }

  addLate() {
    this.lateAdded.set(true);
    const track = (key: "subject" | "behavior" | "replay") => (v: number) =>
      this.logs[key].update((l) => [...l, "got " + v]);
    this.subs.add(this.subject.subscribe(track("subject")));
    this.subs.add(this.behavior.subscribe(track("behavior")));
    this.subs.add(this.replay.subscribe(track("replay")));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between switchMap, mergeMap, concatMap, and exhaustMap?",
    seoDescription:
      "switchMap cancels, mergeMap runs in parallel, concatMap queues, exhaustMap ignores. Verified emission timelines for each flattening operator in RxJS 7.8.",
    description: `**Question presented to candidate:**
"A user can click Save several times while the first request is still in flight, and a search box fires a request on every keystroke. Which RxJS operator would you use for each, and what exactly do switchMap, mergeMap, concatMap and exhaustMap do differently?"

**What a strong answer should cover:**
- All four are **higher-order mapping (flattening) operators**: each outer value is mapped to an inner Observable, and they differ only in what happens when a new outer value arrives while an inner one is still running.
- **switchMap** unsubscribes (cancels) the previous inner and switches to the new one: typeahead search, route params.
- **mergeMap** runs all inners concurrently and emits in completion order (optional concurrency limit): independent parallel work.
- **concatMap** queues: the next inner starts only when the previous completes, so order is preserved (it is \`mergeMap\` with concurrency 1).
- **exhaustMap** ignores new outer values while an inner is active: login or Save buttons, polling that must not overlap.
- Cancellation is real: unsubscribing from an \`HttpClient\` request aborts it; and error handling belongs inside the inner pipe.

**Clarifying questions expected:**
- "If the user clicks again, should the old request be cancelled, queued, run in parallel, or the click ignored?"
- "Does the order of results matter, and is the server call idempotent?"

**Code / implementation expected:** Yes — a timeline (marble diagram, logged timestamps, or a small component) showing the four behaviours on the same input.`,
    answer: `**Target Audience:** Angular developers who use RxJS for HTTP and user input and want to choose the right flattening operator on purpose.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The timelines in section 4 were produced by running RxJS 7.8.2 under its <code>TestScheduler</code> (virtual time, so the millisecond values are exact), and the example in section 6 was compiled and clicked through on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

You run a small café with one barista, and three orders arrive a few seconds apart. There are exactly four sensible policies:

- **Switch:** throw away the half-made drink and start the newest order. Only the last customer gets served. Great when every new order *replaces* the previous one ("actually, make it a large").
- **Merge:** hire extra baristas on the spot and make all three at once. Drinks come out in whatever order they finish.
- **Concat:** make them one at a time, strictly in arrival order. Nobody is skipped, but the last customer waits longest.
- **Exhaust:** while a drink is being made, politely ignore new orders. When the barista is free again, the next order is accepted.

Those are switchMap, mergeMap, concatMap and exhaustMap. The question is never "which is best?" but "what should happen to work already in progress when new work arrives?". Getting it wrong produces real bugs: stale search results overwriting fresh ones, duplicate orders from a double-clicked Pay button, or a queue of 40 autosaves.

## 2. The Core Idea

📌 **Interview term: Higher-order Observable** — an Observable whose values are themselves Observables. <code>clicks$.pipe(map(() =&gt; http.post(...)))</code> gives you a stream of *requests*, not a stream of *responses*; nothing is even sent, because nobody subscribes to the inner Observables (Observables are lazy; see [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises)).

📌 **Interview term: Flattening operator** — an operator that maps each outer value to an inner Observable, **subscribes to it for you**, and forwards the inner values into one flat output stream. The four <code>*Map</code> operators are all flattening operators; they differ only in their **concurrency policy**.

📌 **Interview term: Inner and outer Observable** — the *outer* is the trigger (clicks, keystrokes, route params, actions); the *inner* is the work each trigger starts (an HTTP call, a timer).

| Operator | New outer value while an inner is running | Output order | Typical Angular use |
| :--- | :--- | :--- | :--- |
| <code>switchMap</code> | **Cancel** the running inner, start the new one | Only the latest survives | Typeahead search, route param to data, "latest wins" |
| <code>mergeMap</code> | **Run in parallel** (optionally capped: <code>mergeMap(fn, 3)</code>) | Completion order | Independent uploads, fire-and-forget logging |
| <code>concatMap</code> | **Queue** it; start when the previous completes | Arrival order | Ordered writes, autosave sequence |
| <code>exhaustMap</code> | **Ignore** it | Only the first of each burst | Login, Pay, Save buttons; non-overlapping polling |

<code>concatMap</code> is literally <code>mergeMap</code> with a concurrency of 1: the RxJS 7.8.2 source of <code>concatMap</code> is a single line returning <code>mergeMap(project, 1)</code>.

## 3. Picture It

<svg class="iq-diagram" width="100%" viewBox="0 0 700 380" role="img" aria-label="Three clicks at 0, 20 and 40 ms each start a 50 ms request; the result times differ per operator">
  <text class="d-text" x="20" y="55">clicks</text>
  <path class="d-edge" d="M 170 50 L 660 50"/>
  <circle class="d-box-accent" cx="180" cy="50" r="16"/>
  <text class="d-text d-accent" x="180" y="55" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="240" cy="50" r="16"/>
  <text class="d-text d-accent" x="240" y="55" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="300" cy="50" r="16"/>
  <text class="d-text d-accent" x="300" y="55" text-anchor="middle">3</text>
  <text class="d-text" x="20" y="125">switchMap</text>
  <path class="d-edge" d="M 170 120 L 660 120"/>
  <circle class="d-box" cx="450" cy="120" r="16"/>
  <text class="d-text" x="450" y="125" text-anchor="middle">r3</text>
  <text class="d-text" x="20" y="190">mergeMap</text>
  <path class="d-edge" d="M 170 185 L 660 185"/>
  <circle class="d-box" cx="330" cy="185" r="16"/>
  <text class="d-text" x="330" y="190" text-anchor="middle">r1</text>
  <circle class="d-box" cx="390" cy="185" r="16"/>
  <text class="d-text" x="390" y="190" text-anchor="middle">r2</text>
  <circle class="d-box" cx="450" cy="185" r="16"/>
  <text class="d-text" x="450" y="190" text-anchor="middle">r3</text>
  <text class="d-text" x="20" y="255">concatMap</text>
  <path class="d-edge" d="M 170 250 L 660 250"/>
  <circle class="d-box" cx="330" cy="250" r="16"/>
  <text class="d-text" x="330" y="255" text-anchor="middle">r1</text>
  <circle class="d-box" cx="480" cy="250" r="16"/>
  <text class="d-text" x="480" y="255" text-anchor="middle">r2</text>
  <circle class="d-box" cx="630" cy="250" r="16"/>
  <text class="d-text" x="630" y="255" text-anchor="middle">r3</text>
  <text class="d-text" x="20" y="320">exhaustMap</text>
  <path class="d-edge" d="M 170 315 L 660 315"/>
  <circle class="d-box" cx="330" cy="315" r="16"/>
  <text class="d-text" x="330" y="320" text-anchor="middle">r1</text>
  <text class="d-sub" x="180" y="365" text-anchor="middle">0 ms</text>
  <text class="d-sub" x="330" y="365" text-anchor="middle">50</text>
  <text class="d-sub" x="480" y="365" text-anchor="middle">100</text>
  <text class="d-sub" x="630" y="365" text-anchor="middle">150</text>
</svg>

The top row is the trigger: clicks at 0, 20 and 40 ms, each starting a request that takes 50 ms. Each lower row shows when results come out under one operator. The positions are taken from the verified timeline in the next section.

## 4. Verified: the same three clicks, four operators

Each request is a cancellable fake that logs <code>start</code>, and logs <code>cancel</code> if it is unsubscribed before it finishes. Run with RxJS 7.8.2 under <code>TestScheduler.run()</code>:

\`\`\`
--- switchMap
  0ms  start   req1
 20ms  cancel  req1
 20ms  start   req2
 40ms  cancel  req2
 40ms  start   req3
 90ms  emit    req3 done
 90ms  complete
--- mergeMap
  0ms  start   req1
 20ms  start   req2
 40ms  start   req3
 50ms  emit    req1 done
 70ms  emit    req2 done
 90ms  emit    req3 done
 90ms  complete
--- concatMap
  0ms  start   req1
 50ms  emit    req1 done
 50ms  start   req2
100ms  emit    req2 done
100ms  start   req3
150ms  emit    req3 done
150ms  complete
--- exhaustMap
  0ms  start   req1
 50ms  emit    req1 done
 50ms  complete
\`\`\`

What the timeline proves:

- **switchMap really cancels.** <code>cancel req1</code> is logged at 20 ms, and it appears **before** <code>start req2</code>: the operator unsubscribes the old inner first, then calls your project function for the new value. With <code>HttpClient</code>, that unsubscribe aborts the underlying request.
- **mergeMap overlaps.** Three requests are in flight between 40 and 50 ms. Results arrive in completion order, which here happens to match click order only because every request takes the same time.
- **concatMap never overlaps and never drops.** Request 2 starts at exactly 50 ms, the moment request 1 completes, and the whole sequence takes 150 ms instead of 90.
- **exhaustMap drops.** Clicks 2 and 3 arrived while request 1 was busy, so they were never mapped at all: there is no <code>start req2</code>. Nothing is queued for later.
- **Completion waits for the inners.** Every operator completes only after the outer source has completed *and* no inner is still running (90, 90, 150 and 50 ms).

## 5. Choosing in Practice

Ask one question: **what should happen to work already in progress?**

- *It is obsolete now* → <code>switchMap</code>. A search for "ang" is useless once the user typed "angu". The same applies to loading data for the current route param; see [reading route parameters](/interview-question/how-do-you-read-route-parameters).
- *Several independent results must be combined, not chained* → that is a combination job instead; see [forkJoin, zip, combineLatest and withLatestFrom](/interview-question/what-is-the-difference-between-forkjoin-zip-combinelatest-and-withlatestfrom).
- *It must finish, order does not matter* → <code>mergeMap</code>, ideally with a concurrency limit such as <code>mergeMap(upload, 3)</code> so 200 files do not open 200 connections.
- *It must finish, in order* → <code>concatMap</code>, for writes where the server must see edit 1 before edit 2.
- *The new request is a duplicate* → <code>exhaustMap</code>, for Pay, Login and Save buttons, and for NgRx effects that should not stack (see [NgRx Effects](/interview-question/what-is-the-role-of-ngrx-effects-and-why-do-we-separate-side-effects-from-reduce)).

📌 **Interview term: Race condition (out-of-order responses)** — with <code>mergeMap</code> on a search box, a slow response for "a" can arrive after a fast response for "abc" and overwrite it. <code>switchMap</code> removes this class of bug by unsubscribing from the stale request, so its late answer is never delivered.

A realistic typeahead chain combines several operators:

\`\`\`ts
results = toSignal(
  this.query$.pipe(
    debounceTime(300),            // wait for a pause in typing
    distinctUntilChanged(),       // skip if the text did not change
    switchMap((q) =>
      this.api.search(q).pipe(
        catchError(() => of([])), // one failed search must not kill the box
      ),
    ),
  ),
  { initialValue: [] },
);
\`\`\`

The <code>catchError</code> sits **inside** the <code>switchMap</code>, on the inner request; placed on the outer chain, one failed search would complete the whole stream. That placement rule is shown step by step in [catchError and fallback values](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value). <code>toSignal</code> is explained in [bridging signals and RxJS](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs).

## 6. Verified: four pipelines in one Angular component

The runnable example feeds one click stream into all four operators, each mapping to a cancellable 100 ms fake save. The driver clicked three times 40 ms apart, waited, then printed one paragraph per operator (compiled with <code>ngc</code> strict templates, run in jsdom):

\`\`\`
switchMap: start 1 | cancel 1 | start 2 | cancel 2 | start 3 | done 3
mergeMap: start 1 | start 2 | start 3 | done 1 | done 2 | done 3
concatMap: start 1 | done 1 | start 2 | done 2 | start 3 | done 3
exhaustMap: start 1 | done 1
\`\`\`

Same story with real timers inside Angular: switchMap cancelled twice, mergeMap overlapped, concatMap queued, and exhaustMap never started requests 2 and 3. The log is stored in [signals](/interview-question/what-are-angular-signals) because Angular 22 components are OnPush and [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) by default.

## 7. Common Pitfalls

- **Using <code>map</code> where you need a flattening operator.** <code>map(() =&gt; http.get(url))</code> emits Observables; nothing is requested and the template shows <code>[object Object]</code>. Use one of the four <code>*Map</code> operators.
- **Nesting <code>subscribe()</code> inside <code>subscribe()</code>.** It is a hand-written mergeMap with no cancellation, no error propagation and a leak per outer value (see [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions)).
- **Defaulting to <code>mergeMap</code> for everything.** On a search box it causes out-of-order results; on a Save button it causes duplicate writes.
- **Using <code>switchMap</code> for writes.** Cancelling a POST on the client does not undo it on the server: the request may already have been processed, and the client simply never sees the answer. Use <code>concatMap</code> or <code>exhaustMap</code> for mutations.
- **Putting <code>catchError</code> on the outer chain.** The first error completes the trigger stream and the button silently stops working.
- **Expecting exhaustMap to queue.** Ignored values are gone; if they must run later, that is <code>concatMap</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they share:</strong> <span style="color:#f0e2c8;">"All four map each outer value to an inner Observable and subscribe to it for me. They differ only in what happens when a new value arrives while an inner one is still running."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. switchMap:</strong> <span style="color:#f0e2c8;">"switchMap cancels the running inner and switches to the newest, so latest wins. I use it for typeahead and route params."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. mergeMap and concatMap:</strong> <span style="color:#f0e2c8;">"mergeMap runs inners in parallel and emits in completion order; concatMap queues them one at a time in arrival order. concatMap is mergeMap with concurrency 1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. exhaustMap:</strong> <span style="color:#f0e2c8;">"exhaustMap ignores new values while busy, which is exactly what a Pay or Login button needs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">"With three clicks 20 ms apart and 50 ms requests, I measured switchMap emitting only request 3 at 90 ms, mergeMap all three by 90 ms, concatMap finishing at 150 ms, and exhaustMap only request 1."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does switchMap actually stop the HTTP request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It unsubscribes from the inner Observable, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpClient</code> aborts the request when you unsubscribe. But the server may already have received it, which is why switchMap is for reads and not for writes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you limit parallel uploads to three at a time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mergeMap(file =&gt; upload(file), 3)</code>. The second argument is the concurrency limit; extra values are buffered until a slot frees up. With a limit of 1 it behaves exactly like concatMap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which operator for an NgRx effect that loads data when a page opens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually switchMap if a newer request makes the old one irrelevant, or exhaustMap if repeated triggers should not stack. For a save or delete effect, concatMap or mergeMap, so no write is cancelled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does error handling go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the inner pipe: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap(q =&gt; api.search(q).pipe(catchError(() =&gt; of([]))))</code>. On the outer chain, the first error would complete the whole stream and the feature would stop responding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">switchMap</code> do when the outer completes but an inner is still running?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It waits. The output completes only when the outer has completed and the active inner has completed too. All four operators behave this way.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Higher-order Observable** | An Observable that emits Observables |
| **Flattening operator** | Subscribes to inner Observables for you and merges their values into one stream |
| **Inner / outer** | Outer is the trigger; inner is the work each trigger starts |
| **switchMap** | Cancel the previous inner, keep only the latest |
| **mergeMap** | Run inners concurrently, optional concurrency limit |
| **concatMap** | Queue inners, one at a time, in order |
| **exhaustMap** | Ignore new values while an inner is active |
| **Race condition** | A stale response arriving after a fresh one and overwriting it |

---
**Conclusion:** switchMap, mergeMap, concatMap and exhaustMap all turn "a value" into "some async work" and flatten the results; the only thing that separates them is the policy for overlap. The verified timeline makes it concrete: switchMap cancelled requests 1 and 2 and delivered only 3, mergeMap ran all three at once, concatMap ran them back to back in 150 ms, and exhaustMap ran only the first. Pick by asking what should happen to in-flight work: obsolete (switch), independent (merge), ordered (concat) or duplicate (exhaust), and keep <code>catchError</code> on the inner pipe so one failure never kills the trigger.`,
    examples: [
      {
        label: "One Save button, four flattening operators: start, cancel and done logged side by side",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnDestroy, signal } from "@angular/core";
import { Observable, OperatorFunction, Subject, Subscription, concatMap, exhaustMap, map, mergeMap, switchMap, timer } from "rxjs";

type Flatten = (project: (id: number) => Observable<string>) => OperatorFunction<number, string>;

// One button feeds the same click stream into four pipelines. Each click
// starts a fake 100 ms "save" request; the log shows which requests start,
// get cancelled, and finish under each flattening operator.
@Component({
  selector: "app-root",
  template: \`
    <button (click)="click()">Save (click {{ clicks() + 1 }})</button>
    @for (row of rows; track row.name) {
      <p><b>{{ row.name }}</b>: {{ row.log().join(" | ") }}</p>
    }
  \`,
})
export class AppComponent implements OnDestroy {
  private clicks$ = new Subject<number>();
  private subs = new Subscription();
  clicks = signal(0);

  rows = (
    [
      ["switchMap", switchMap],
      ["mergeMap", mergeMap],
      ["concatMap", concatMap],
      ["exhaustMap", exhaustMap],
    ] as [string, Flatten][]
  ).map(([name, op]) => {
    const log = signal<string[]>([]);
    const add = (line: string) => log.update((l) => [...l, line]);
    // A cancellable fake request: logs when it starts, finishes or is cancelled.
    const save = (id: number) =>
      new Observable<string>((sub) => {
        add("start " + id);
        let done = false;
        const inner = timer(100).pipe(map(() => "done " + id)).subscribe((v) => {
          done = true;
          sub.next(v);
          sub.complete();
        });
        return () => {
          inner.unsubscribe();
          if (!done) add("cancel " + id);
        };
      });
    this.subs.add(this.clicks$.pipe(op(save)).subscribe(add));
    return { name, log };
  });

  click() {
    this.clicks.update((n) => n + 1);
    this.clicks$.next(this.clicks());
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between forkJoin, zip, combineLatest, and withLatestFrom?",
    seoDescription:
      "forkJoin waits for all to complete, zip pairs by index, combineLatest emits on any change, withLatestFrom samples on one trigger. Verified RxJS timelines.",
    description: `**Question presented to candidate:**
"A dashboard needs the user and their permissions before it renders, a product list re-filters whenever the search text or the category changes, and a Save button sends the current filters. Which RxJS combination operators would you use, and how do forkJoin, zip, combineLatest and withLatestFrom differ?"

**What a strong answer should cover:**
- **forkJoin** waits for **every** source to **complete**, then emits **once** with each source's last value: the RxJS \`Promise.all\`, ideal for parallel HTTP calls. If any source completes empty it emits nothing; if any errors, it errors.
- **zip** pairs values **by index** (1st with 1st, 2nd with 2nd) and buffers the faster source.
- **combineLatest** waits until each source has emitted once, then emits the latest of all on **every** emission from **any** source: derived state from several inputs.
- **withLatestFrom** is an operator: only the **source** triggers an emission; the other streams are sampled, and source values that arrive before the others have a value are dropped.
- Practical differences: completion behaviour, the object/array forms (\`forkJoin({ a, b })\`), deprecated rest-argument signatures, and that \`computed()\` often replaces \`combineLatest\` for signal state.

**Clarifying questions expected:**
- "Do the sources complete (HTTP calls) or are they long-lived (form values, store selectors)?"
- "Should every source be able to trigger an update, or only one of them?"

**Code / implementation expected:** Yes — a timeline or small component that shows when each operator emits for the same inputs.`,
    answer: `**Target Audience:** Angular developers combining HTTP calls, form values or store selectors, who want to know which combination operator fires when.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The timelines in sections 4 and 5 were produced by running RxJS 7.8.2 (the main timeline under <code>TestScheduler</code> virtual time, so the milliseconds are exact), and the example in section 7 was compiled and driven on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

Four friends are planning dinner and messages keep arriving from two of them, Asha and Ben.

- **The patient planner** waits until both have said "that is my final answer, I am done", then books once with what each said last. That is **forkJoin**.
- **The pair matcher** lines up Asha's first message with Ben's first, second with second, and so on. If Asha sends three messages and Ben one, two of Asha's wait in a pile. That is **zip**.
- **The live dashboard** updates its plan every time *either* friend says anything, always using the latest from both, but only once both have spoken at least once. That is **combineLatest**.
- **The decision maker** only acts when Asha speaks; at that moment she glances at Ben's latest message. Ben talking on his own changes nothing. That is **withLatestFrom**.

All four combine the same two streams, yet they produce completely different numbers of results at different times. In Angular that is the difference between a dashboard that renders once, a filter list that stays live, and a Save button that sends stale data.

## 2. The Core Idea

📌 **Interview term: Combination operator** — a function that takes several Observables and produces one Observable whose values are built from theirs. The real question for each is: **which event triggers an output, and when does it complete?**

📌 **Interview term: Completion** — the signal that a stream will send nothing more. <code>HttpClient</code> requests complete after one value; form <code>valueChanges</code>, store selectors and subjects normally never complete. Completion is what <code>forkJoin</code> waits for, which is why it is perfect for the first kind and silently useless for the second.

| | Emits when | How many outputs | Completes when | Angular use |
| :--- | :--- | :--- | :--- | :--- |
| <code>forkJoin([a, b])</code> | **all** sources have **completed** | 1 (last value of each) | right after that emission | Parallel HTTP calls before rendering |
| <code>zip(a, b)</code> | each source has an *n*-th value | min(count of a, count of b) | any source completes and its buffer is used up | Pairing requests with responses, rare in UI code |
| <code>combineLatest([a, b])</code> | **any** source emits, once all have emitted at least once | many | **all** sources complete | Derived state from several live inputs |
| <code>a.pipe(withLatestFrom(b))</code> | **only <code>a</code>** emits, and <code>b</code> has a value | one per <code>a</code> value (minus early ones) | <code>a</code> completes | Click or action that reads current state |

<code>forkJoin</code>, <code>zip</code> and <code>combineLatest</code> are creation functions imported from <code>rxjs</code>; <code>withLatestFrom</code> is a pipeable operator. All three creation functions also accept an object, for example <code>forkJoin({ user: getUser(), perms: getPerms() })</code> emits <code>{ user, perms }</code>, which reads far better than array indexes.

## 3. Picture It

<svg class="iq-diagram" width="100%" viewBox="0 0 720 440" role="img" aria-label="Two sources a and b combined four ways: forkJoin, zip, combineLatest and withLatestFrom, with the time of each output">
  <text class="d-text" x="20" y="55">a</text>
  <path class="d-edge" d="M 150 50 L 690 50"/>
  <rect class="d-box-accent" x="222" y="35" width="36" height="30" rx="8"/>
  <text class="d-text d-accent" x="240" y="55" text-anchor="middle">a0</text>
  <rect class="d-box-accent" x="382" y="35" width="36" height="30" rx="8"/>
  <text class="d-text d-accent" x="400" y="55" text-anchor="middle">a1</text>
  <rect class="d-box-accent" x="542" y="35" width="36" height="30" rx="8"/>
  <text class="d-text d-accent" x="560" y="55" text-anchor="middle">a2</text>
  <text class="d-text" x="20" y="115">b</text>
  <path class="d-edge" d="M 150 110 L 690 110"/>
  <rect class="d-box-accent" x="302" y="95" width="36" height="30" rx="8"/>
  <text class="d-text d-accent" x="320" y="115" text-anchor="middle">b0</text>
  <rect class="d-box-accent" x="622" y="95" width="36" height="30" rx="8"/>
  <text class="d-text d-accent" x="640" y="115" text-anchor="middle">b1</text>
  <text class="d-text" x="20" y="195">forkJoin</text>
  <path class="d-edge" d="M 150 190 L 690 190"/>
  <rect class="d-box" x="609" y="175" width="62" height="30" rx="8"/>
  <text class="d-sub" x="640" y="195" text-anchor="middle">a2 b1</text>
  <text class="d-text" x="20" y="255">zip</text>
  <path class="d-edge" d="M 150 250 L 690 250"/>
  <rect class="d-box" x="289" y="235" width="62" height="30" rx="8"/>
  <text class="d-sub" x="320" y="255" text-anchor="middle">a0 b0</text>
  <rect class="d-box" x="609" y="235" width="62" height="30" rx="8"/>
  <text class="d-sub" x="640" y="255" text-anchor="middle">a1 b1</text>
  <text class="d-text" x="20" y="315">combineLatest</text>
  <path class="d-edge" d="M 150 310 L 690 310"/>
  <rect class="d-box" x="289" y="295" width="62" height="30" rx="8"/>
  <text class="d-sub" x="320" y="315" text-anchor="middle">a0 b0</text>
  <rect class="d-box" x="369" y="295" width="62" height="30" rx="8"/>
  <text class="d-sub" x="400" y="315" text-anchor="middle">a1 b0</text>
  <rect class="d-box" x="529" y="295" width="62" height="30" rx="8"/>
  <text class="d-sub" x="560" y="315" text-anchor="middle">a2 b0</text>
  <rect class="d-box" x="609" y="295" width="62" height="30" rx="8"/>
  <text class="d-sub" x="640" y="315" text-anchor="middle">a2 b1</text>
  <text class="d-text" x="20" y="375">withLatestFrom</text>
  <path class="d-edge" d="M 150 370 L 690 370"/>
  <rect class="d-box" x="369" y="355" width="62" height="30" rx="8"/>
  <text class="d-sub" x="400" y="375" text-anchor="middle">a1 b0</text>
  <rect class="d-box" x="529" y="355" width="62" height="30" rx="8"/>
  <text class="d-sub" x="560" y="375" text-anchor="middle">a2 b0</text>
  <path class="d-edge-dashed" d="M 150 150 L 690 150"/>
  <text class="d-sub" x="160" y="425" text-anchor="middle">0 ms</text>
  <text class="d-sub" x="320" y="425" text-anchor="middle">20 ms</text>
  <text class="d-sub" x="480" y="425" text-anchor="middle">40 ms</text>
  <text class="d-sub" x="640" y="425" text-anchor="middle">60 ms</text>
</svg>

The two source rows are above the dashed line: <code>a</code> emits at 10, 30 and 50 ms, <code>b</code> at 20 and 60 ms, and both complete after their last value. Each lower row shows what one operator outputs and when, taken from the verified run below.

## 4. Verified: one input, four answers

Run with RxJS 7.8.2 under <code>TestScheduler.run()</code>, with <code>a = timer(10, 20)</code> taking 3 values and <code>b = timer(20, 40)</code> taking 2:

\`\`\`
--- forkJoin([a, b])
 60ms  ["a2","b1"]
 60ms  complete
--- zip(a, b)
 20ms  ["a0","b0"]
 60ms  ["a1","b1"]
 60ms  complete
--- combineLatest([a, b])
 20ms  ["a0","b0"]
 30ms  ["a1","b0"]
 50ms  ["a2","b0"]
 60ms  ["a2","b1"]
 60ms  complete
--- a.pipe(withLatestFrom(b))
 30ms  ["a1","b0"]
 50ms  ["a2","b0"]
 50ms  complete
\`\`\`

Read it line by line and the definitions fall out:

- **forkJoin** produced a single array at 60 ms, the moment the slower source completed, holding the **last** value of each (<code>a2</code>, <code>b1</code>). <code>a0</code>, <code>a1</code> and <code>b0</code> never appear.
- **zip** produced two pairs, matched by position. <code>a2</code> had no partner, so it was dropped when <code>b</code> completed.
- **combineLatest** said nothing at 10 ms (<code>b</code> had no value yet), then emitted on every later event from either side: four outputs.
- **withLatestFrom** ignored <code>a0</code> because <code>b</code> had not emitted yet, emitted only when <code>a</code> emitted, and never reacted to <code>b1</code> at 60 ms. It completed at 50 ms with <code>a</code>, even though <code>b</code> was still running.

## 5. Verified: the edge cases that bite

\`\`\`
forkJoin([of(1), EMPTY]) -> complete with no value
forkJoin([]) complete immediately
--- forkJoin, one source errors
  fj error 403
--- forkJoin, per-source catchError keeps the rest
  fj2 next ["user",null]
  fj2 complete
--- forkJoin with a BehaviorSubject (never completes)
  ...50 ms later: still nothing. Now bs.complete():
  fj3 next [1,"x"]
  fj3 complete
--- zip buffers the fast side
  (3 fast values, no output yet)
  zip next ["f1","s1"]
  zip next ["f2","s2"]
--- combineLatest waits for every source
  (x sent 1, 2; y nothing yet)
  cl next [2,"A"]
\`\`\`

- **One empty source empties forkJoin.** If any source completes without a value, forkJoin completes without emitting.
- **One error fails forkJoin.** The other results are thrown away. To keep partial results, put <code>catchError(() =&gt; of(null))</code> on each source that is allowed to fail. (How <code>catchError</code> substitutes a value is covered in [catchError and fallback values](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).)
- **forkJoin over a never-completing source never emits.** A BehaviorSubject, a store selector or <code>valueChanges</code> keeps it waiting forever; it fired only once the subject was completed by hand.
- **zip buffers.** Three fast values waited for the slow side; an unbalanced zip on long-lived streams is a memory leak (see [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions)).
- **combineLatest emits nothing until every source has a value**, and then only the latest (<code>[2,"A"]</code>, the <code>1</code> was superseded). Start streams with a value (<code>startWith</code>, a BehaviorSubject) if the first render must not wait.

📌 **Interview term: Promise.all equivalent** — <code>forkJoin</code> is the closest RxJS match for <code>Promise.all</code>: parallel, one combined result, fail-fast on error. The deeper comparison of the two models is in [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises).

## 6. Choosing in Practice

- **"Load these three things in parallel, then render"** → <code>forkJoin</code>. Often inside a [route resolver](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) or an effect. Use the object form.
- **"Recompute whenever any input changes"** → <code>combineLatest</code>. Search text plus category plus sort order; several [NgRx](/interview-question/what-is-ngrx) store selectors into a view model. If the inputs are already signals, a [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) does the same job with less ceremony and no subscription.
- **"When X happens, use the current Y"** → <code>withLatestFrom</code>. A Save click reading the current form value, an [NgRx effect](/interview-question/what-is-the-role-of-ngrx-effects-and-why-do-we-separate-side-effects-from-reduce) reading the current state alongside an action.
- **"Pair the n-th of each"** → <code>zip</code>. Rare in UI code; it mostly appears in tests and protocol code.

📌 **Interview term: Trigger vs sampled stream** — with <code>withLatestFrom</code>, the source is the *trigger* and the arguments are *sampled*. That asymmetry is the point: a button click should send the form value, but typing in the form should not send anything. With <code>combineLatest</code>, every input is a trigger.

When the result of one call is needed to *start* the next, none of these fit: chain with a flattening operator instead, as explained in [switchMap, mergeMap, concatMap and exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).

## 7. Verified: all three patterns in one Angular component

The runnable example uses <code>forkJoin</code> for page load (two fake requests of 60 ms and 20 ms), <code>combineLatest</code> over two BehaviorSubjects for a live filter, and <code>withLatestFrom</code> for a Save button. Compiled with <code>ngc</code> (strict templates), run in jsdom; the driver typed, changed the select, then clicked Save:

\`\`\`
after load:
  Page load (forkJoin): Ann can read + write
  Results (combineLatest): Apple, Avocado, Banana, Blueberry, Carrot
  Saved (withLatestFrom): nothing yet
typed a:
  Page load (forkJoin): Ann can read + write
  Results (combineLatest): Apple, Avocado, Banana, Carrot
  Saved (withLatestFrom): nothing yet
picked B:
  Page load (forkJoin): Ann can read + write
  Results (combineLatest): Banana
  Saved (withLatestFrom): nothing yet
clicked Save:
  Page load (forkJoin): Ann can read + write
  Results (combineLatest): Banana
  Saved (withLatestFrom): {"q":"a","letter":"B"}
\`\`\`

The header appeared once, after the slower request finished. The result list updated on each filter change, from either input. "Saved" changed only on the click, and then carried both current filter values. The filters are [BehaviorSubjects](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject) so <code>combineLatest</code> had a value from each on the very first render; with plain Subjects the list would have been empty until both had been touched.

## 8. Common Pitfalls

- **<code>forkJoin</code> over a stream that never completes.** Form <code>valueChanges</code>, <code>store.select()</code>, subjects and <code>interval</code> keep it waiting forever with no error. Add <code>take(1)</code> to such sources, or use <code>combineLatest</code>.
- **Losing all results to one failed request.** forkJoin is fail-fast; wrap each optional call in its own <code>catchError</code>.
- **Expecting <code>combineLatest</code> to emit immediately.** It waits for every source's first value; seed with <code>startWith</code> or BehaviorSubjects.
- **Using <code>combineLatest</code> where <code>withLatestFrom</code> belongs.** The Save request fires on every keystroke instead of on the click.
- **Using <code>withLatestFrom</code> against a source that has not emitted yet.** Trigger values are silently dropped, as <code>a0</code> was above.
- **Deprecated signatures.** In RxJS 7.8.2 the rest-argument form <code>forkJoin(a, b)</code> and <code>combineLatest(a, b)</code> is marked <code>@deprecated</code> ("Pass an array of sources instead"), and the <code>combineLatest</code> and <code>zip</code> *operators* are deprecated in favour of <code>combineLatestWith</code> and <code>zipWith</code>. Use arrays or objects.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The framing:</strong> <span style="color:#f0e2c8;">"All four combine streams. The difference is what triggers an output and when the result completes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. forkJoin:</strong> <span style="color:#f0e2c8;">"forkJoin waits for every source to complete and emits once with each last value. It is Promise.all for Observables: perfect for parallel HTTP, useless on streams that never complete."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. combineLatest:</strong> <span style="color:#f0e2c8;">"combineLatest waits until every source has emitted once, then emits the latest of all whenever any source emits. That is derived state from several live inputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. withLatestFrom and zip:</strong> <span style="color:#f0e2c8;">"withLatestFrom only fires when its source fires and samples the others, so a click can read the current form. zip pairs values by index and buffers the faster side."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">"On the same two sources I measured forkJoin emitting once at 60 ms, zip twice, combineLatest four times and withLatestFrom twice, dropping the value that came before the other stream had one."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your forkJoin never emits. What is wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One of the sources does not complete: a store selector, a subject or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">valueChanges</code>. forkJoin waits for completion, not for values. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">take(1)</code> to that source, or switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combineLatest</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep partial results when one of three requests fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Catch per source: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forkJoin({ a: getA(), b: getB().pipe(catchError(() =&gt; of(null))) })</code>. Without that, one error fails the whole forkJoin and the successful results are discarded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you still use combineLatest with signals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For signal inputs, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed(() =&gt; filter(items(), query()))</code> is simpler: synchronous, no subscription and no waiting for a first emission. I keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combineLatest</code> for genuinely async streams, or bridge with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">combineLatest</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">withLatestFrom</code> in an NgRx effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In an effect, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withLatestFrom(this.store.select(selectFilters))</code> reads the current state only when the action arrives. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">combineLatest</code> would re-run the effect every time the state changed, which usually means duplicate requests. Modern NgRx code often uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concatLatestFrom</code> for the same job (from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ngrx/operators</code> since NgRx 18, when it moved out of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ngrx/effects</code>), because it only calls the selector when a matching action arrives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use zip?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely in UI code. It fits when the n-th value of one stream genuinely belongs to the n-th of another, such as matching requests to responses in order. On unbalanced streams it buffers and leaks.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combination operator** | Builds one stream from several |
| **Completion** | A stream saying it will emit nothing more |
| **forkJoin** | Wait for all to complete; emit once with the last values |
| **zip** | Pair the n-th values of each source |
| **combineLatest** | On any emission, emit the latest of all (after each has emitted) |
| **withLatestFrom** | On a source emission, sample the latest of the others |
| **Trigger vs sampled** | Which stream causes an output versus which is only read |
| **Promise.all equivalent** | forkJoin: parallel, one result, fail-fast |

---
**Conclusion:** forkJoin, zip, combineLatest and withLatestFrom all merge streams, but they answer different questions. forkJoin asks "what did everyone finally say?" and emits once when all complete; zip asks "what are the n-th pairs?"; combineLatest asks "what is the current combination?" on every change; withLatestFrom asks "what is everything else right now?" only when its own source speaks. The verified timeline shows the counts plainly (one, two, four and two outputs from the same inputs), and the edge cases show the traps: forkJoin waits forever on streams that never complete and fails fast on one error, while combineLatest stays silent until every input has a value.`,
    examples: [
      {
        label: "Page load with forkJoin, live filters with combineLatest, Save with withLatestFrom",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnDestroy, signal } from "@angular/core";
import { BehaviorSubject, Subject, Subscription, combineLatest, delay, forkJoin, of, withLatestFrom } from "rxjs";

// Fake HTTP calls: each emits once after a delay and completes, like HttpClient.
const getUser = () => of({ name: "Ann" }).pipe(delay(60));
const getPermissions = () => of(["read", "write"]).pipe(delay(20));

const PRODUCTS = ["Apple", "Avocado", "Banana", "Blueberry", "Carrot"];

@Component({
  selector: "app-root",
  template: \`
    <p>Page load (forkJoin): {{ header() }}</p>
    <input placeholder="search" (input)="search$.next($any($event.target).value)" />
    <select (change)="startsWith$.next($any($event.target).value)">
      <option value="">any letter</option>
      <option value="A">A</option>
      <option value="B">B</option>
    </select>
    <p>Results (combineLatest): {{ results().join(", ") }}</p>
    <button (click)="save$.next()">Save filters</button>
    <p>Saved (withLatestFrom): {{ saved() }}</p>
  \`,
})
export class AppComponent implements OnDestroy {
  private subs = new Subscription();
  search$ = new BehaviorSubject("");
  startsWith$ = new BehaviorSubject("");
  save$ = new Subject<void>();

  header = signal("loading...");
  results = signal<string[]>([]);
  saved = signal("nothing yet");

  constructor() {
    // forkJoin: wait for BOTH requests to complete, then emit once with the last value of each.
    this.subs.add(
      forkJoin({ user: getUser(), perms: getPermissions() }).subscribe(({ user, perms }) =>
        this.header.set(user.name + " can " + perms.join(" + ")),
      ),
    );
    // combineLatest: re-run whenever EITHER filter changes (both must have a value; BehaviorSubject gives one).
    this.subs.add(
      combineLatest([this.search$, this.startsWith$]).subscribe(([q, letter]) =>
        this.results.set(
          PRODUCTS.filter((p) => p.toLowerCase().includes(q.toLowerCase()) && p.startsWith(letter)),
        ),
      ),
    );
    // withLatestFrom: only a click triggers; the filters are sampled, not listened to.
    this.subs.add(
      this.save$
        .pipe(withLatestFrom(this.search$, this.startsWith$))
        .subscribe(([, q, letter]) => this.saved.set(JSON.stringify({ q, letter }))),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the shareReplay operator in RxJS and how it prevents duplicate HTTP requests.",
    seoDescription:
      "shareReplay multicasts one subscription to a source and replays the last values to late subscribers, so three async pipes make one HTTP request, not three.",
    description: `**Question presented to candidate:**
"Our header, sidebar and profile panel all show the current user, and the network tab shows \`GET /api/me\` three times on every page load. Explain why, and how \`shareReplay\` fixes it. What does \`refCount\` change?"

**What a strong answer should cover:**
- \`HttpClient\` Observables are **cold**: every \`subscribe()\` (including each \`async\` pipe) sends a **new request**.
- \`shareReplay(n)\` **multicasts**: it subscribes to the source once, forwards values to all subscribers through an internal **ReplaySubject**, and **replays** the last \`n\` values to subscribers who arrive later.
- \`share()\` alone dedupes concurrent subscribers but not late ones; \`shareReplay\` also covers the late ones.
- **\`refCount\`**: with \`refCount: false\` (the \`shareReplay(1)\` default) the source subscription stays alive even when every subscriber leaves; with \`refCount: true\` it is torn down at zero subscribers. For HTTP this matters mostly for **in-flight** requests; for never-completing sources it is the difference between a leak and none.
- **Errors are not cached**: a failed request is retried by the next subscriber. Also: where to keep the shared Observable (a root service field, not a method that returns a new pipe each call), and cache invalidation.

**Clarifying questions expected:**
- "Should the cached value live for the whole session, or be refreshed (on navigation, after a time, after a mutation)?"
- "Is the source a one-shot HTTP call or a long-lived stream?"

**Code / implementation expected:** Yes — a request counter with and without \`shareReplay\`, ideally showing a late subscriber.`,
    answer: `**Target Audience:** Angular developers who fetch data with <code>HttpClient</code> and have seen the same request fire several times in the network tab.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Request counts and subscription logs in sections 4 to 6 were produced by running RxJS 7.8.2, the operator internals in section 3 were read from the installed RxJS 7.8.2 source, and the example in section 7 was compiled and run on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

Three colleagues each want today's weather. Without coordination, each one phones the weather service separately: three calls, three identical answers. Worse, a fourth colleague arriving an hour later phones again.

Now put one assistant in the middle. The first time anyone asks, the assistant phones the service once, tells everyone who is waiting, and writes the answer on a sticky note. Anyone who asks later just reads the note. That assistant is <code>shareReplay</code>.

In an Angular app the "colleagues" are template bindings. A header, a sidebar and a profile panel each write <code>user$ | async</code>, and because <code>HttpClient</code> Observables are cold, each <code>async</code> pipe triggers its own <code>GET /api/me</code>. It is one of the most common performance bugs in Angular code reviews, and <code>shareReplay</code> is the standard fix.

## 2. The Core Idea

📌 **Interview term: Cold Observable** — an Observable that starts its work separately for each subscriber. <code>http.get()</code> is cold: nothing is sent until you subscribe, and each subscription sends its own request. That laziness is a feature (no request if nobody needs the data) until several consumers need the same data. A Promise, by contrast, starts once and caches its single result, a difference explored in [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises).

📌 **Interview term: Multicasting** — sharing one execution of a source among many subscribers. RxJS does it by putting a Subject between the source and the subscribers; the Subject family is compared in [Subject vs BehaviorSubject vs ReplaySubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject).

📌 **Interview term: <code>shareReplay(n)</code>** — an operator that (1) subscribes to the source **once**, on the first subscriber, (2) forwards each value through an internal **ReplaySubject** to every subscriber, and (3) keeps the last <code>n</code> values so subscribers who arrive **later** get them immediately without touching the source.

| | Concurrent subscribers share one request | Late subscriber reuses the result | Source torn down at 0 subscribers |
| :--- | :--- | :--- | :--- |
| No operator | no | no | n/a (one execution each) |
| <code>share()</code> | **yes** | no, it resubscribes | yes |
| <code>shareReplay(1)</code> | **yes** | **yes** | **no** (<code>refCount: false</code>) |
| <code>shareReplay({ bufferSize: 1, refCount: true })</code> | **yes** | **yes**, while the result is cached | **yes** |

## 3. How It Works Inside

In RxJS 7.8.2, <code>shareReplay</code> is a thin wrapper around <code>share()</code>. The installed source is short enough to quote the important part:

\`\`\`js
return share({
    connector: () => new ReplaySubject(bufferSize, windowTime, scheduler),
    resetOnError: true,
    resetOnComplete: false,
    resetOnRefCountZero: refCount,
});
\`\`\`

Each option explains a behaviour you can observe:

- <code>connector</code>: the shared Subject is a ReplaySubject, so values are replayed to late subscribers.
- <code>resetOnError: true</code>: an error throws the ReplaySubject away. **Errors are not cached**; the next subscriber triggers a fresh attempt.
- <code>resetOnComplete: false</code>: a completed source (an HTTP response) keeps its cached value forever. That is what makes it a cache.
- <code>resetOnRefCountZero: refCount</code>: only with <code>refCount: true</code> does the operator unsubscribe from the source when the last subscriber leaves.

The same source also shows the defaults: called as <code>shareReplay(1)</code>, <code>refCount</code> is <code>false</code>; called with **no** argument, <code>bufferSize</code> is <code>Infinity</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Without sharing three subscribers cause three requests; with shareReplay three subscribers share one request through a replay buffer">
  <defs>
    <marker id="srp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="35" text-anchor="middle">Without sharing</text>
  <rect class="d-box" x="30" y="70" width="120" height="38" rx="8"/>
  <text class="d-sub" x="90" y="94" text-anchor="middle">header</text>
  <rect class="d-box" x="30" y="140" width="120" height="38" rx="8"/>
  <text class="d-sub" x="90" y="164" text-anchor="middle">sidebar</text>
  <rect class="d-box" x="30" y="210" width="120" height="38" rx="8"/>
  <text class="d-sub" x="90" y="234" text-anchor="middle">footer</text>
  <path class="d-edge" d="M 150 89 L 206 89" marker-end="url(#srp-arrow)"/>
  <path class="d-edge" d="M 150 159 L 206 159" marker-end="url(#srp-arrow)"/>
  <path class="d-edge" d="M 150 229 L 206 229" marker-end="url(#srp-arrow)"/>
  <rect class="d-box-muted" x="212" y="70" width="120" height="38" rx="8"/>
  <text class="d-sub" x="272" y="94" text-anchor="middle">GET 1</text>
  <rect class="d-box-muted" x="212" y="140" width="120" height="38" rx="8"/>
  <text class="d-sub" x="272" y="164" text-anchor="middle">GET 2</text>
  <rect class="d-box-muted" x="212" y="210" width="120" height="38" rx="8"/>
  <text class="d-sub" x="272" y="234" text-anchor="middle">GET 3</text>
  <text class="d-text" x="560" y="35" text-anchor="middle">With shareReplay(1)</text>
  <rect class="d-box" x="390" y="70" width="110" height="38" rx="8"/>
  <text class="d-sub" x="445" y="94" text-anchor="middle">header</text>
  <rect class="d-box" x="390" y="140" width="110" height="38" rx="8"/>
  <text class="d-sub" x="445" y="164" text-anchor="middle">sidebar</text>
  <rect class="d-box" x="390" y="210" width="110" height="38" rx="8"/>
  <text class="d-sub" x="445" y="234" text-anchor="middle">late panel</text>
  <path class="d-edge" d="M 500 89 L 554 140" marker-end="url(#srp-arrow)"/>
  <path class="d-edge" d="M 500 159 L 554 159" marker-end="url(#srp-arrow)"/>
  <path class="d-edge-dashed" d="M 500 229 L 554 178" marker-end="url(#srp-arrow)"/>
  <rect class="d-box-accent" x="560" y="128" width="140" height="62" rx="10"/>
  <text class="d-text d-accent" x="630" y="154" text-anchor="middle">ReplaySubject</text>
  <text class="d-sub" x="630" y="176" text-anchor="middle">buffer of 1</text>
  <path class="d-edge-accent" d="M 630 190 L 630 240" marker-end="url(#srp-arrow)"/>
  <rect class="d-box-muted" x="570" y="246" width="120" height="38" rx="8"/>
  <text class="d-sub" x="630" y="270" text-anchor="middle">GET once</text>
</svg>

On the left each subscriber owns a request. On the right, every subscriber talks to the shared ReplaySubject; only the first one causes a subscription to the source, and the late panel (dashed arrow) is served from the buffer.

## 4. Verified: counting network requests

A fake cold "HTTP" Observable counts how often it is executed. Two subscribers subscribe at once, a third 30 ms later, after the response has arrived. RxJS 7.8.2:

\`\`\`
--- no sharing
  [network] request #1 (plain)
  [network] request #2 (plain)
  sub1 got Ann
  sub2 got Ann
  [network] request #3 (plain)
  sub3 (late) got Ann
  total network requests: 3
--- share()
  [network] request #1 (share)
  sub1 got Ann
  sub2 got Ann
  [network] request #2 (share)
  sub3 (late) got Ann
  total network requests: 2
--- shareReplay(1)
  [network] request #1 (sr)
  sub1 got Ann
  sub2 got Ann
  sub3 (late) got Ann
  total network requests: 1
\`\`\`

<code>share()</code> fixed the *concurrent* duplicates, but the late subscriber arrived after the source had completed, so <code>share()</code> reset and fired request #2. Only <code>shareReplay</code> served the late subscriber from its buffer: **one request in total**.

## 5. Verified: what <code>refCount</code> actually changes

📌 **Interview term: refCount** — reference counting: tracking how many subscribers the shared stream has, and disconnecting from the source when that number drops to zero.

The difference is invisible with a request that has already completed, and decisive with a source that is still running. First, a never-completing source (an interval, a WebSocket, a store selector): two subscribers, both unsubscribe, a new subscriber arrives 30 ms later.

\`\`\`
--- shareReplay({ bufferSize: 1, refCount: false }) on an interval
  [interval] source subscribed
  both subscribers unsubscribed
  re-subscriber got 5
  re-subscriber got 6
--- shareReplay({ bufferSize: 1, refCount: true }) on an interval
  [interval] source subscribed
  [interval] source torn down
  both subscribers unsubscribed
  [interval] source subscribed
  re-subscriber got 0
  [interval] source torn down
\`\`\`

With <code>refCount: false</code> the source was **never torn down**: it kept ticking with nobody listening (the re-subscriber received value 5, proof it ran in the background; the exact number depends on timing). That is a leak in a component-level stream. With <code>refCount: true</code> the source stopped as soon as the subscriber count hit zero, and a later subscriber started it afresh from 0.

Second, an HTTP-like source that completes:

\`\`\`
refCount: false  ->  completed then re-subscribed: 1 request(s);  left before response then re-subscribed: 1 request(s)
refCount: true  ->  completed then re-subscribed: 1 request(s);  left before response then re-subscribed: 2 request(s)
\`\`\`

- Once a response has **completed**, both settings keep the cached value (<code>resetOnComplete: false</code>): one request.
- If every subscriber leaves **while the request is in flight**, <code>refCount: true</code> cancels it, and the next subscriber sends a new one. <code>refCount: false</code> lets it finish and caches the result.

So for HTTP, <code>refCount: true</code> means "cancel requests nobody wants any more", and <code>refCount: false</code> means "always finish and cache". For long-lived sources, prefer <code>refCount: true</code>.

## 6. Verified: errors are not cached

\`\`\`
--- shareReplay(1) after error
  [flaky] attempt 1
  sub1 error 500
  [flaky] attempt 2
  sub2 error 500
\`\`\`

After a failure, the second subscriber caused a second attempt. That is usually what you want (a retry on the next use), but it also means a page with ten consumers of a failing endpoint can fire ten failing requests. Put <code>catchError</code> with a fallback value *before* <code>shareReplay</code> if the fallback itself should be cached; see [catchError and fallback values](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).

## 7. Verified: three async pipes in an Angular component

The runnable example renders the same user three times with <code>async</code>, once from a plain cold Observable and once from a <code>shareReplay({ bufferSize: 1, refCount: true })</code> version, then opens a late panel. Compiled with <code>ngc</code> (strict templates), run in jsdom:

\`\`\`
after first load:
  Without sharing, requests made: 3
  With shareReplay, requests made: 1
after opening the late panel:
  Without sharing, requests made: 4
  With shareReplay, requests made: 1
  late plain: Ann / late shared: Ann
\`\`\`

Each [<code>async</code> pipe](/interview-question/what-is-the-async-pipe-and-why-is-it-useful) is a subscriber, so the plain stream made one request per binding, and a fourth when the panel opened. The shared stream made one request in total, and the late panel was served from the replay buffer.

In a real app the shared Observable lives in a field of a root [service](/interview-question/what-is-a-service-and-why-use-it):

\`\`\`ts
@Injectable({ providedIn: "root" })
export class UserService {
  private http = inject(HttpClient);
  // A FIELD, created once per service instance, not a method that builds a new pipe per call.
  readonly me$ = this.http.get<User>("/api/me").pipe(shareReplay({ bufferSize: 1, refCount: true }));
}
\`\`\`

Where the service is provided decides how long the cache lives; see [providing in root vs in a component](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).

## 8. Common Pitfalls

- **Creating the shared stream inside a method.** <code>getUser() { return http.get(...).pipe(shareReplay(1)); }</code> builds a new cache on every call. Verified: three calls, **3 requests**; the same pipe stored in a field made 1.
- **<code>shareReplay()</code> with no arguments.** The buffer size defaults to <code>Infinity</code>. Harmless for a one-value HTTP call, a growing memory leak on a stream that keeps emitting (see [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions)). Always pass a size.
- **Default <code>refCount: false</code> on long-lived sources.** The source keeps running after every component is destroyed, as the interval kept ticking above. Use <code>{ bufferSize: 1, refCount: true }</code>.
- **Expecting a cache that refreshes itself.** A completed request is cached forever. To refresh, rebuild the stream from a trigger (<code>refresh$.pipe(switchMap(() =&gt; http.get(...)), shareReplay(1))</code>, using [switchMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap) so a refresh cancels a stale load) or add a <code>windowTime</code>.
- **Caching user-specific data in a root service across logout.** The next user sees the previous user's cached profile. Reset the stream on logout.
- **Assuming errors are cached.** They are not; every new subscriber retries. Add <code>catchError</code> before <code>shareReplay</code> or a retry policy (see [global error and retry handling with interceptors](/interview-question/how-do-you-handle-errors-and-retries-globally-with-interceptors)).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The cause:</strong> <span style="color:#f0e2c8;">"HttpClient Observables are cold, so every subscriber, including every async pipe, sends its own request. Three bindings means three GETs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shareReplay(1)</code> subscribes to the source once, multicasts through an internal ReplaySubject, and replays the last value to anyone who subscribes later."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. share vs shareReplay:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">share()</code> only dedupes subscribers that overlap in time. A subscriber who arrives after the response triggers a new request. shareReplay serves it from the buffer."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. refCount:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">refCount: true</code> the source is torn down when the last subscriber leaves, which cancels in-flight requests and stops long-lived sources. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shareReplay(1)</code> shorthand defaults to false."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where:</strong> <span style="color:#f0e2c8;">"I keep it as a field on a root service, not inside a method, and I measured the difference: a method made three requests, a field made one."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a failed request cached by shareReplay?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Internally it uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">share()</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resetOnError: true</code>, so the ReplaySubject is discarded on error and the next subscriber triggers a new attempt. I saw attempt 2 run for the second subscriber.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you invalidate the cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build it from a trigger: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">refresh$.pipe(startWith(undefined), switchMap(() =&gt; http.get(url)), shareReplay({ bufferSize: 1, refCount: true }))</code>, and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">refresh$.next()</code> after a mutation. Or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">windowTime</code> for time-based expiry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the risk of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shareReplay()</code> with no arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The buffer defaults to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>. For a single HTTP value it does not matter, but on a stream that keeps emitting every value is kept forever.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you still use shareReplay in Angular 22?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For RxJS-based services, yes. For template state, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSignal(user$)</code> in a service also gives one subscription with a current value, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpResource</code> (marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@publicApi 22.0</code> in the installed typings) is a signal-based way to fetch with built-in status.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">refCount: true</code> matter for a request that completes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only while it is in flight. If every subscriber leaves before the response, refCount true unsubscribes and HttpClient aborts the request; the next subscriber sends a new one. After completion both settings keep the cached value.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cold Observable** | Runs its work once per subscriber, like <code>http.get()</code> |
| **Multicasting** | One execution of a source shared by many subscribers |
| **<code>share()</code>** | Multicast through a Subject; no replay for late subscribers |
| **<code>shareReplay(n)</code>** | Multicast through a ReplaySubject; replays the last n values |
| **refCount** | Disconnect from the source when subscriber count reaches zero |
| **Replay buffer** | The stored values handed to late subscribers |
| **resetOnError** | Throw away the shared subject on error, so the next subscriber retries |

---
**Conclusion:** Duplicate HTTP requests happen because <code>HttpClient</code> Observables are cold and every <code>async</code> pipe is a separate subscriber. <code>shareReplay</code> puts one ReplaySubject between the request and its consumers: the source is subscribed once and late subscribers are served from the buffer, which took three (then four) requests down to one in the verified component. The details interviewers probe are all visible in the RxJS source and the runs above: errors are not cached, completed responses are cached forever, <code>shareReplay(1)</code> does not use refCount, and <code>refCount: true</code> is what stops a long-lived source or an unwanted in-flight request once nobody is listening.`,
    examples: [
      {
        label: "Three async pipes: three requests without sharing, one with shareReplay",
        tech: "angular",
        runnable: true,
        code: `import { AsyncPipe } from "@angular/common";
import { Component, signal } from "@angular/core";
import { Observable, shareReplay } from "rxjs";

interface User {
  name: string;
}

@Component({
  selector: "app-root",
  imports: [AsyncPipe],
  template: \`
    <h4>Without sharing, requests made: {{ plainRequests() }}</h4>
    <span>header: {{ (plain$ | async)?.name }}</span>
    <span> sidebar: {{ (plain$ | async)?.name }}</span>
    <span> footer: {{ (plain$ | async)?.name }}</span>

    <h4>With shareReplay, requests made: {{ sharedRequests() }}</h4>
    <span>header: {{ (shared$ | async)?.name }}</span>
    <span> sidebar: {{ (shared$ | async)?.name }}</span>
    <span> footer: {{ (shared$ | async)?.name }}</span>

    <p><button (click)="showLate.set(true)">Open profile panel later</button></p>
    @if (showLate()) {
      <p>late plain: {{ (plain$ | async)?.name }} / late shared: {{ (shared$ | async)?.name }}</p>
    }
  \`,
})
export class AppComponent {
  plainRequests = signal(0);
  sharedRequests = signal(0);
  showLate = signal(false);

  // Behaves like HttpClient.get: cold, one request per subscriber, one value, then complete.
  private fakeGet(counter: typeof this.plainRequests): Observable<User> {
    return new Observable<User>((subscriber) => {
      counter.update((n) => n + 1);
      const id = setTimeout(() => {
        subscriber.next({ name: "Ann" });
        subscriber.complete();
      }, 50);
      return () => clearTimeout(id);
    });
  }

  plain$ = this.fakeGet(this.plainRequests);
  shared$ = this.fakeGet(this.sharedRequests).pipe(shareReplay({ bufferSize: 1, refCount: true }));
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does catchError work in RxJS, and how do you return a fallback value?",
    seoDescription:
      "catchError replaces an errored Observable with one you return: of(fallback), EMPTY, or a rethrow. Where you put it decides whether the stream survives.",
    description: `**Question presented to candidate:**
"Our user-profile page loads data with \`HttpClient\`. When the API fails, the page shows nothing and, after one failed lookup, the search box stops working entirely. How does \`catchError\` work, how would you show a fallback value, and why might the search box have died?"

**What a strong answer should cover:**
- An error **terminates** an Observable: no more values, no completion. \`catchError\` intercepts that error and **replaces the errored stream with a new Observable you return**.
- Fallback value: \`catchError(() => of(fallback))\`, which emits the fallback and then **completes**. Other options: \`EMPTY\` (complete silently), \`throwError(() => mappedError)\` (rethrow a friendlier error), or \`caught\` (resubscribe, usually better done with \`retry\`).
- The selector **must return an Observable input**; returning \`undefined\` throws a \`TypeError\`, and a plain string is iterated character by character.
- **Placement**: \`catchError\` on the outer chain swaps the *whole* stream, so a long-lived trigger (clicks, search terms, actions) dies; put it **inside** \`switchMap\` / \`mergeMap\` on the inner request.
- Combine with \`retry({ count, delay })\` before it, and decide whether errors belong in a global interceptor or per call.

**Clarifying questions expected:**
- "Should the user see a fallback, an error message, or should we retry first?"
- "Is the failing call a one-off load or part of a long-lived stream such as a search box or an effect?"

**Code / implementation expected:** Yes — a fallback with \`of()\` and the inner-vs-outer placement shown on a stream that keeps receiving values.`,
    answer: `**Target Audience:** Angular developers handling HTTP failures in RxJS pipelines, especially inside search boxes, effects and other long-lived streams.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every behaviour in sections 3 to 6 was produced by running RxJS 7.8.2, and the component in section 7 was compiled and clicked through on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

A conveyor belt carries parcels from a warehouse to a delivery van. One parcel is damaged. The belt has a strict rule: **any damaged parcel stops the belt permanently**. No more parcels, ever, and no "end of shift" bell either.

You can hire an inspector to stand at some point on the belt. When a damaged parcel reaches the inspector, the inspector removes it and puts something else on the belt in its place: a replacement parcel, nothing at all, or a written complaint. But here is the catch: the inspector can only replace the belt **from that point on**, and the original belt behind the inspector has already stopped.

That inspector is <code>catchError</code>. Where you put it decides whether you lose one parcel or the whole belt, which is exactly why a search box sometimes stops working forever after a single failed request.

## 2. The Core Idea

📌 **Interview term: Error notification** — one of the three things an Observable can send (a Promise has only resolve and reject; see [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises)) (<code>next</code>, <code>error</code>, <code>complete</code>). An error is **terminal**: after it, the Observable sends nothing else, not even <code>complete</code>. Verified: <code>of(1, 2, 3)</code> with a <code>map</code> that throws on 2 printed <code>next 1</code>, then <code>error bad</code>, and never reached 3 or a completion.

📌 **Interview term: <code>catchError(selector)</code>** — an operator that, when the stream above it errors, calls <code>selector(error, caught)</code> and **subscribes to the Observable it returns instead**. Values from that replacement flow on to the subscriber. If the replacement completes, the whole result completes.

📌 **Interview term: Fallback value** — a substitute result returned on error: <code>catchError(() =&gt; of(defaultValue))</code>. <code>of()</code> emits the value and completes, so the subscriber sees a normal <code>next</code> and <code>complete</code> instead of an error.

What you can return from the selector, and what the subscriber then sees:

| Return | Subscriber sees | Use it for |
| :--- | :--- | :--- |
| <code>of(fallback)</code> | the fallback, then complete | Default data: empty list, guest user, cached copy |
| <code>EMPTY</code> | complete, no value | "Nothing to show" without an error state; beware that a later <code>first()</code> then throws (see [take(1) vs first()](/interview-question/what-is-the-difference-between-take-1-and-first-operators-in-rxjs)) |
| <code>throwError(() =&gt; new AppError(...))</code> | an error (your mapped one) | Log or translate, then let a higher layer decide |
| <code>caught</code> (second argument) | a fresh subscription to the source | Retrying; prefer <code>retry()</code>, which has a count and delay |

## 3. Verified: the four return shapes

Run on RxJS 7.8.2:

\`\`\`
--- 1. fallback value
  A next: 1
  A next: -1
  A complete
--- 2. EMPTY: swallow and complete
  B complete
--- 3. rethrow a mapped error
  C error: Could not load users: HTTP 500
--- 4. caught: resubscribe the source (with a limit)
  source attempt 1
  source attempt 2
  source attempt 3
  D next: "ok"
  D complete
\`\`\`

Case 1 is the subtle one. The source was <code>of(1, 2, 3)</code> with a <code>map</code> that throws on 2. The subscriber received <code>1</code>, then the fallback <code>-1</code>, then **complete**: value 3 never arrived, because the original stream died at the error and <code>catchError</code> replaced the *rest* of it with <code>of(-1)</code>. <code>catchError</code> does not "skip the bad value and continue"; it swaps streams.

Case 4 returns <code>caught</code>, which resubscribes to the source; a counter stops it from looping forever. That is what <code>retry</code> does for you, more readably:

\`\`\`
--- 7. retry({count:2}) then fallback
  try 1
  try 2
  try 3
  E next: {"fallback":true,"reason":"down"}
  E complete
\`\`\`

<code>retry({ count: 2 })</code> means two *re*tries, so three attempts in total, and only then did <code>catchError</code> deliver the fallback. Order matters: <code>retry</code> must come **before** <code>catchError</code>, otherwise the error is already replaced and there is nothing left to retry.

## 4. Verified: the return value must be an Observable input

\`\`\`
--- 8. returning a non-observable
  F next: "p"
  F next: "l"
  F next: "a"
  ...
  F next: "g"
  F complete
--- 9. returning undefined
  G error: You provided 'undefined' where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.
\`\`\`

(The middle letters of case 8 are elided here; the run printed all twelve characters of <code>"plain string"</code> one per line.) The selector's result is converted with the same rules as <code>from()</code>: a string is an iterable, so <code>catchError(() =&gt; "plain string")</code> emits it **one character at a time**. Returning nothing, a common mistake in a selector that only logs, produces a <code>TypeError</code> with the message above. TypeScript usually catches both, but not when the selector is typed <code>any</code>. Always wrap a plain value in <code>of()</code>.

## 5. Placement: inner versus outer

This is the part interviewers care about most.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="catchError on the outer chain replaces the whole click stream; catchError inside switchMap replaces only the failed request">
  <defs>
    <marker id="cerr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="35">catchError on the outer chain</text>
  <rect class="d-box" x="20" y="60" width="110" height="56" rx="8"/>
  <text class="d-text" x="75" y="93" text-anchor="middle">clicks</text>
  <path class="d-edge" d="M 130 88 L 174 88" marker-end="url(#cerr-arrow)"/>
  <rect class="d-box" x="180" y="60" width="140" height="56" rx="8"/>
  <text class="d-text" x="250" y="93" text-anchor="middle">switchMap</text>
  <path class="d-edge" d="M 320 88 L 364 88" marker-end="url(#cerr-arrow)"/>
  <rect class="d-box-muted" x="370" y="60" width="130" height="56" rx="8"/>
  <text class="d-text" x="435" y="84" text-anchor="middle">catchError</text>
  <text class="d-sub" x="435" y="104" text-anchor="middle">swaps all</text>
  <path class="d-edge" d="M 500 88 L 544 88" marker-end="url(#cerr-arrow)"/>
  <rect class="d-box-muted" x="550" y="60" width="150" height="56" rx="8"/>
  <text class="d-text" x="625" y="84" text-anchor="middle">subscriber</text>
  <text class="d-sub" x="625" y="104" text-anchor="middle">then complete</text>
  <text class="d-text" x="20" y="170">catchError on the inner request</text>
  <rect class="d-box" x="20" y="210" width="110" height="56" rx="8"/>
  <text class="d-text" x="75" y="243" text-anchor="middle">clicks</text>
  <path class="d-edge" d="M 130 238 L 164 238" marker-end="url(#cerr-arrow)"/>
  <rect class="d-box-muted" x="170" y="190" width="330" height="110" rx="10"/>
  <text class="d-sub" x="335" y="210" text-anchor="middle">switchMap</text>
  <rect class="d-box" x="185" y="225" width="125" height="50" rx="8"/>
  <text class="d-text" x="247" y="255" text-anchor="middle">getUser</text>
  <path class="d-edge" d="M 310 250 L 349 250" marker-end="url(#cerr-arrow)"/>
  <rect class="d-box-accent" x="355" y="225" width="130" height="50" rx="8"/>
  <text class="d-text d-accent" x="420" y="255" text-anchor="middle">catchError</text>
  <path class="d-edge-accent" d="M 500 245 L 544 245" marker-end="url(#cerr-arrow)"/>
  <rect class="d-box-accent" x="550" y="217" width="150" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="241" text-anchor="middle">subscriber</text>
  <text class="d-sub" x="625" y="261" text-anchor="middle">keeps going</text>
</svg>

In the top pipeline, the error escapes the <code>switchMap</code>, reaches the outer chain and kills it; <code>catchError</code> can only replace it with a stream that ends. In the bottom pipeline the error never leaves the inner request: <code>catchError</code> turns it into a normal value, the inner completes, and the click stream is untouched.

## 6. Verified: one bad request, two placements

The source is a click stream; user 2 does not exist, so its request errors:

\`\`\`
--- 5. outer catchError kills a long-lived stream
  outer next: "user1"
  outer next: "fallback"
  outer complete
--- 6. inner catchError keeps it alive
  inner next: "user1"
  inner next: "fallback for 2"
  inner next: "user3"
\`\`\`

With the outer placement, click 3 is never processed: the stream completed after the fallback, and the button now does nothing, with no error in the console. With the inner placement, the failed lookup becomes a fallback and click 3 loads normally. The same rule applies to every flattening operator ([switchMap, mergeMap, concatMap, exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap)) and is mandatory in [NgRx effects](/interview-question/what-is-the-role-of-ngrx-effects-and-why-do-we-separate-side-effects-from-reduce), where the outer stream is the whole action stream.

## 7. Verified: the same bug in an Angular component

The runnable example wires the same buttons into both placements. The driver clicked users 1, 2, 3 and then 1 again (compiled with <code>ngc</code> strict templates, run in jsdom):

\`\`\`
catchError OUTSIDE switchMap: user-1 | guest | COMPLETED (stream is dead)
catchError INSIDE switchMap: user-1 | guest | user-3 | user-1
\`\`\`

A typical service method returning a fallback for the template:

\`\`\`ts
loadUser(id: number): Observable<User> {
  return this.http.get<User>(\`/api/users/\${id}\`).pipe(
    retry({ count: 2, delay: 500 }),           // transient failures first
    catchError((err: HttpErrorResponse) => {
      if (err.status === 404) return of(GUEST); // a fallback value
      return throwError(() => new Error("Could not load user " + id)); // let the caller decide
    }),
  );
}
\`\`\`

Cross-cutting policy (auth redirects on 401, a toast on 5xx, retries for every call) usually belongs in an interceptor rather than in each service; see [functional interceptors](/interview-question/how-do-functional-interceptors-work-with-providehttpclient) and [handling errors and retries globally](/interview-question/how-do-you-handle-errors-and-retries-globally-with-interceptors). Keep per-call <code>catchError</code> for decisions only that call can make, such as which fallback value to show. If the fallback should also be cached for every consumer, place it before [shareReplay](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ).

## 8. Common Pitfalls

- **<code>catchError</code> on the outer chain of a long-lived stream.** The first failure completes the trigger: the search box, the button or the effect silently stops.
- **Returning a plain value.** <code>catchError(() =&gt; [])</code> happens to work (an array is iterable but emits nothing for <code>[]</code>), <code>catchError(() =&gt; "n/a")</code> emits three characters, and a selector that returns nothing throws a <code>TypeError</code>. Wrap values in <code>of()</code>.
- **Expecting the source to continue after a fallback.** <code>catchError</code> replaces the remainder of the stream; values after the error are never delivered (value 3 above).
- **<code>retry</code> after <code>catchError</code>.** The error has already been replaced, so there is nothing to retry. Put <code>retry</code> first.
- **Swallowing every error with <code>EMPTY</code>.** The UI shows "no data" for a 500 and nobody notices. Log, map, or surface an error state.
- **Returning <code>caught</code> without a limit.** On a source that always fails, it resubscribes forever.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">"An error terminates an Observable. catchError intercepts it and subscribes to whatever Observable I return instead, for the rest of the stream."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fallback:</strong> <span style="color:#f0e2c8;">"For a default value I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">of(fallback)</code>: the subscriber gets the value and a normal complete. EMPTY completes silently, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throwError</code> rethrows a mapped error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Placement:</strong> <span style="color:#f0e2c8;">"Where it sits is the real decision. On the outer chain of a search box or an effect, one failure swaps the whole stream and it completes. Inside the switchMap, only that request is replaced."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Retry:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry({ count, delay })</code> goes before catchError, so transient failures are retried and only the final failure falls back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">"I ran it: with catchError outside, clicks after the failure were ignored and the stream completed; inside, the next click loaded normally."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a fallback via catchError not let the remaining source values through?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the source has already terminated at the error. catchError cannot resume it; it can only subscribe to a replacement. In my run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">of(1, 2, 3)</code> with an error on 2 delivered 1, the fallback and complete, never 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the selector returns a string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is converted like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from()</code>, and a string is iterable, so it emits one character per value. Returning undefined throws a TypeError: "You provided undefined where a stream was expected". Always wrap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">of()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle errors inside an NgRx effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put catchError on the inner request and map the error to a failure action: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap(() =&gt; api.load().pipe(map(success), catchError(e =&gt; of(failure({ error: e })))))</code>. On the outer chain the effect would die after the first error, apart from NgRx default resubscription.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">catchError in the service or in an interceptor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cross-cutting policy goes in an interceptor: 401 redirects, toasts, global retries. Call-specific choices, such as which fallback to show, stay next to the call. An interceptor that swallows errors hides them from every caller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">caught</code> argument for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the source Observable after catchError, so returning it resubscribes, effectively a retry. Without a counter it loops forever on a permanent failure, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry</code> with a count and delay is clearer.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Error notification** | Terminal signal: nothing follows it, not even complete |
| **catchError** | Replace an errored stream with an Observable you return |
| **Fallback value** | Substitute data returned with <code>of(value)</code> |
| **EMPTY** | An Observable that completes immediately with no value |
| **throwError** | An Observable that errors immediately with the error you create |
| **caught** | catchError second argument: the source, for resubscribing |
| **retry** | Resubscribe on error, with an optional count and delay |
| **Inner vs outer placement** | On the request (stream survives) or on the trigger (stream dies) |

---
**Conclusion:** <code>catchError</code> does not repair a broken stream; it hands the subscriber a different one. Return <code>of(fallback)</code> for a default value, <code>EMPTY</code> to finish quietly, or <code>throwError</code> to pass a better error upward, and always return an Observable input, since a string is emitted character by character and <code>undefined</code> throws. The decision that matters most is placement: verified on RxJS 7.8.2 and in an Angular 22 component, <code>catchError</code> on the outer chain completed the click stream after one failed request, while the same operator inside <code>switchMap</code> replaced just that request and kept the feature alive.`,
    examples: [
      {
        label: "catchError outside vs inside switchMap: one stream dies, the other survives",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnDestroy, signal } from "@angular/core";
import { Observable, Subject, Subscription, catchError, delay, of, switchMap, throwError } from "rxjs";

interface User {
  id: number;
  name: string;
}

// Fake API: user 2 does not exist and the "server" answers with an error.
function getUser(id: number): Observable<User> {
  return id === 2
    ? throwError(() => new Error("404 user " + id))
    : of({ id, name: "user-" + id }).pipe(delay(10));
}

const FALLBACK: User = { id: 0, name: "guest" };

@Component({
  selector: "app-root",
  template: \`
    @for (id of [1, 2, 3]; track id) {
      <button (click)="clicks$.next(id)">Load user {{ id }}</button>
    }
    <p>catchError OUTSIDE switchMap: {{ outer().join(" | ") }}</p>
    <p>catchError INSIDE switchMap: {{ inner().join(" | ") }}</p>
  \`,
})
export class AppComponent implements OnDestroy {
  clicks$ = new Subject<number>();
  outer = signal<string[]>([]);
  inner = signal<string[]>([]);
  private subs = new Subscription();

  constructor() {
    const logTo = (target: typeof this.outer) => ({
      next: (u: User) => target.update((l) => [...l, u.name]),
      complete: () => target.update((l) => [...l, "COMPLETED (stream is dead)"]),
    });

    // Wrong place: the error reaches the outer chain, catchError swaps the WHOLE
    // click stream for of(FALLBACK), which emits once and completes.
    this.subs.add(
      this.clicks$
        .pipe(
          switchMap((id) => getUser(id)),
          catchError(() => of(FALLBACK)),
        )
        .subscribe(logTo(this.outer)),
    );

    // Right place: only the failed request is replaced; the click stream lives on.
    this.subs.add(
      this.clicks$
        .pipe(switchMap((id) => getUser(id).pipe(catchError(() => of(FALLBACK)))))
        .subscribe(logTo(this.inner)),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between take(1) and first() operators in RxJS?",
    seoDescription:
      "take(1) and first() both emit one value and complete, but on an empty stream first() errors with EmptyError while take(1) just completes. Verified.",
    description: `**Question presented to candidate:**
"In a route guard we read the current user with \`this.auth.user$.pipe(first())\`, and in a test it blew up with \`EmptyError: no elements in sequence\`. A colleague says \`take(1)\` would have been fine. What is the difference between \`take(1)\` and \`first()\`, and which one would you use where?"

**What a strong answer should cover:**
- Both take the **first value**, **complete**, and **unsubscribe from the source** immediately.
- The difference is the **empty case**: if the source completes without emitting, \`take(1)\` just **completes**, while \`first()\` **errors with \`EmptyError\`** ("no elements in sequence").
- \`first()\` also accepts a **predicate** and a **default value**: \`first(pred)\` is \`filter(pred)\` + \`take(1)\` + an EmptyError if nothing matched; \`first(pred, defaultValue)\` emits the default instead of erroring.
- Choose by intent: \`first()\` when "no value" is a **bug** you want to surface; \`take(1)\` when "no value" is acceptable.
- Strong candidates know the guard twist: the Angular Router itself reports a guard Observable that completes empty as a \`NavigationError\` with \`EmptyError\`, so \`take(1)\` does not avoid the error there; the fix is to make the source emit.
- Mention \`firstValueFrom()\` (rejects with EmptyError, accepts \`{ defaultValue }\`) for async/await code, and that neither operator helps if the source **never** emits or completes (the stream just hangs).

**Clarifying questions expected:**
- "Can this source legitimately complete without a value (an empty cache, a filtered selector)?"
- "Is this used in a guard, resolver or effect where an error would block navigation or kill the stream?"

**Code / implementation expected:** Yes — both operators on an empty and a non-empty source, showing the EmptyError.`,
    answer: `**Target Audience:** Angular developers who use <code>take(1)</code> and <code>first()</code> interchangeably to read "the current value" from a stream, and want to know when that difference bites.
**Difficulty:** Easy to Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every behaviour in sections 3 to 5 was produced by running RxJS 7.8.2 (and the RxJS source quoted in section 4 is the installed 7.8.2 file); the router result in section 6 and the component in section 7 were run on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

You send two assistants to the post office with the same instruction: "bring me the first letter in my mailbox, then come straight back."

The mailbox turns out to be empty, and the post office closes.

The first assistant comes back empty-handed and says "done". The second assistant comes back and says "something is wrong: you told me there would be a letter, and there was none". Neither is wrong. They simply interpreted "bring me the first letter" differently when there was no letter at all.

The first assistant is <code>take(1)</code>. The second is <code>first()</code>. On a normal day, when there is a letter, you cannot tell them apart. Interviewers ask this question precisely because the difference only shows up in the edge case, and edge cases are where production bugs and failing tests live.

## 2. The Core Idea

📌 **Interview term: <code>take(n)</code>** — emit at most the first <code>n</code> values, then complete and unsubscribe from the source. If the source completes earlier, <code>take</code> completes too, with however many values it got, possibly zero.

📌 **Interview term: <code>first(predicate?, defaultValue?)</code>** — emit the first value (optionally the first one that matches <code>predicate</code>), then complete and unsubscribe. If the source **completes without producing one**, it **errors** with <code>EmptyError</code>, unless you passed a <code>defaultValue</code>, which is emitted instead.

📌 **Interview term: <code>EmptyError</code>** — the RxJS error class for "a value was required but the sequence completed empty". Its message is <code>no elements in sequence</code>. <code>first()</code>, <code>last()</code>, <code>single()</code>, <code>firstValueFrom()</code> and <code>lastValueFrom()</code> all use it.

| Situation | <code>take(1)</code> | <code>first()</code> | <code>first(undefined, d)</code> | <code>first(pred)</code> |
| :--- | :--- | :--- | :--- | :--- |
| Source emits | first value, complete | first value, complete | first value, complete | first matching value, complete |
| Source completes empty | **complete, no value** | **error: EmptyError** | emits <code>d</code>, complete | error: EmptyError |
| No value matches <code>pred</code> | n/a | n/a | n/a | **error: EmptyError** |
| Source never emits, never completes | waits forever | waits forever | waits forever | waits forever |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Both operators emit and complete when the source emits; when the source completes empty, take of 1 completes and first errors">
  <defs>
    <marker id="tkf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="136" text-anchor="middle">Did the source</text>
  <text class="d-text" x="105" y="157" text-anchor="middle">emit a value?</text>
  <path class="d-edge" d="M 190 125 L 270 70" marker-end="url(#tkf-arrow)"/>
  <text class="d-sub" x="215" y="80" text-anchor="middle">yes</text>
  <path class="d-edge" d="M 190 155 L 270 210" marker-end="url(#tkf-arrow)"/>
  <text class="d-sub" x="215" y="210" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="280" y="40" width="400" height="56" rx="10"/>
  <text class="d-text d-accent" x="480" y="74" text-anchor="middle">both: emit it, complete, unsubscribe</text>
  <rect class="d-box" x="280" y="180" width="185" height="60" rx="10"/>
  <text class="d-text" x="372" y="206" text-anchor="middle">take(1)</text>
  <text class="d-sub" x="372" y="226" text-anchor="middle">just completes</text>
  <rect class="d-box-muted" x="495" y="180" width="185" height="60" rx="10"/>
  <text class="d-text" x="587" y="206" text-anchor="middle">first()</text>
  <text class="d-sub" x="587" y="226" text-anchor="middle">errors: EmptyError</text>
</svg>

The happy path is identical for both operators. The fork is the empty source: <code>take(1)</code> treats it as a normal ending, <code>first()</code> treats it as a broken promise.

## 3. Verified: side by side

Run on RxJS 7.8.2:

\`\`\`
--- non-empty: of(10, 20, 30)
  take(1) next: 10
  take(1) complete
  first() next: 10
  first() complete
--- empty: EMPTY
  take(1) complete
  first() error: EmptyError: no elements in sequence
--- predicate: first(n => n > 15) vs filter + take(1)
  first(pred) next: 20
  first(pred) complete
  filter+take(1) next: 20
  filter+take(1) complete
--- predicate never matches
  first(pred) error: EmptyError: no elements in sequence
  first(pred, -1) next: -1
  first(pred, -1) complete
  filter+take(1) complete
--- default value on empty
  first(undefined, default) next: default
  first(undefined, default) complete
\`\`\`

## 4. Why: <code>first()</code> is built from <code>take(1)</code>

The installed RxJS 7.8.2 implementation of <code>first</code> is one line:

\`\`\`js
return (source) => source.pipe(predicate ? filter((v, i) => predicate(v, i, source)) : identity, take(1), hasDefaultValue ? defaultIfEmpty(defaultValue) : throwIfEmpty(() => new EmptyError()));
\`\`\`

So <code>first(pred, d)</code> is literally <code>filter(pred)</code>, then <code>take(1)</code>, then either <code>defaultIfEmpty(d)</code> or <code>throwIfEmpty(EmptyError)</code>. Everything <code>take(1)</code> does, <code>first()</code> does; it only adds the "what if nothing came" policy on top. That makes the interview answer short and precise: **same behaviour, plus an error on empty**.

## 5. Verified: unsubscribing, waiting, and the Promise version

\`\`\`
--- source that never emits, then completes later
  (nothing yet, still open: observed = true)
  take(1) complete
  first() error: EmptyError: no elements in sequence
--- take(1) unsubscribes from source immediately
  take(1) next: cached
  take(1) complete
  source still has observers: false
--- take(0)
  take(0) complete
--- firstValueFrom(EMPTY)
  rejected: EmptyError: no elements in sequence, instanceof EmptyError: true
  firstValueFrom(EMPTY, {defaultValue: null}) -> null
\`\`\`

- **Neither operator has a timeout.** While the Subject was open, both just waited (<code>observed = true</code>). The difference appeared only when it completed. On a stream that never emits and never completes, <code>take(1)</code> and <code>first()</code> both hang forever; add <code>timeout()</code> if that matters.
- **Both unsubscribe from the source right after the first value.** On a BehaviorSubject, the subject had no observers left. This is why <code>take(1)</code> is a popular way to read a long-lived stream once without a leak (see [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions)).
- **<code>firstValueFrom()</code> is the Promise form of <code>first()</code>**: it rejects with <code>EmptyError</code> on an empty source and accepts <code>{ defaultValue }</code>. It replaced the deprecated <code>.toPromise()</code>, which resolved <code>undefined</code> on an empty source. More on the Promise side in [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises).

## 6. Verified: the route guard twist

A popular piece of advice is "use <code>take(1)</code> in guards so an empty stream cannot throw". On Angular 22.2.3 it is not that simple. Two functional guards, one returning <code>EMPTY.pipe(take(1))</code> and one <code>EMPTY.pipe(first())</code>, both navigated with <code>router.navigateByUrl</code>:

\`\`\`
NavigationError /take error=EmptyError: no elements in sequence
take: rejected EmptyError
NavigationError /first error=EmptyError: no elements in sequence
first: rejected EmptyError
\`\`\`

Both produced a <code>NavigationError</code> with <code>EmptyError</code>, and <code>navigateByUrl</code> rejected in both cases. The router requires a guard Observable to produce a value, so an empty guard result fails the navigation whichever operator you used. The real fix is to make sure the source emits (for example a BehaviorSubject or a selector that always has a value) and to map it to <code>true</code>, <code>false</code> or a <code>UrlTree</code>. Guards themselves are covered in [route guards](/interview-question/what-are-route-guards-in-angular) and [functional route guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards).

## 7. Verified: in an Angular component

The runnable example reads a fake cache that either emits (<code>of("cached-token", "newer-token")</code>) or is empty (<code>EMPTY</code>), through all three operator forms and through <code>firstValueFrom</code>. Compiled with <code>ngc</code> strict templates, run in jsdom:

\`\`\`
Cache hit:
  take(1): value cached-token, then complete
  first(): value cached-token, then complete
  first(undefined, "anonymous"): value cached-token, then complete
  firstValueFrom: -
Cache empty + firstValueFrom:
  take(1): no value, then complete
  first(): ERROR EmptyError: no elements in sequence
  first(undefined, "anonymous"): value anonymous, then complete
  firstValueFrom: rejected with EmptyError
\`\`\`

On a cache hit all three are indistinguishable and the second value, <code>newer-token</code>, is never delivered. On an empty cache, <code>take(1)</code> ends quietly, <code>first()</code> errors, and the default turns the error into a value.

One environment note found while verifying: with [zone.js](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon) loaded, writing the Promise handler as <code>try { await firstValueFrom(...) } catch</code> printed a zone.js "unhandled rejection" log in jsdom even though the rejection was caught; attaching handlers directly with <code>.then(onValue, onError)</code> did not. The behaviour of <code>firstValueFrom</code> was identical either way.

## 8. Choosing in Practice

- **"No value means something is broken"** → <code>first()</code>. Reading a required config value, a token that must exist, the result of a request that always responds. The error surfaces the bug instead of hiding it.
- **"No value is fine, just stop"** → <code>take(1)</code>. Reading an optional cache, taking one snapshot of a store selector inside an effect, closing a dialog stream.
- **"No value means use a default"** → <code>first(undefined, defaultValue)</code> or <code>firstValueFrom(source$, { defaultValue })</code>.
- **"The first value that matches"** → <code>first(pred)</code> if a match is mandatory, <code>filter(pred), take(1)</code> if it is optional.

## 9. Common Pitfalls

- **Treating them as synonyms.** They are, until a source completes empty. A filtered [NgRx](/interview-question/what-is-ngrx) selector or an <code>EMPTY</code> from a [<code>catchError</code>](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value) can turn <code>first()</code> into an exception.
- **Believing <code>take(1)</code> makes a guard safe.** As verified above, the router itself turns an empty guard result into <code>NavigationError: EmptyError</code>.
- **Expecting either to time out.** They wait as long as the source is open. Add <code>timeout({ first: 5000 })</code> when "never" is a possibility.
- **<code>first()</code> in an [effect](/interview-question/what-is-the-role-of-ngrx-effects-and-why-do-we-separate-side-effects-from-reduce)'s outer chain.** It completes the whole action stream after one action, so the effect runs once and never again. Use it only on inner streams.
- **Using <code>take(1)</code> on a Subject that has not emitted yet and expecting the current value.** A plain Subject has no current value; you get the *next* one. Use a BehaviorSubject or a [signal](/interview-question/what-are-angular-signals) (see [Subject vs BehaviorSubject vs ReplaySubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject)).
- **Replacing <code>.toPromise()</code> blindly with <code>firstValueFrom()</code>.** The old method resolved <code>undefined</code> on empty; the new one rejects. Pass <code>{ defaultValue }</code> where empty is legitimate.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same happy path:</strong> <span style="color:#f0e2c8;">"Both emit the first value, complete, and unsubscribe from the source. On a stream that emits, you cannot tell them apart."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The difference:</strong> <span style="color:#f0e2c8;">"On a source that completes empty, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">take(1)</code> just completes, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first()</code> errors with EmptyError, "no elements in sequence"."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Extras:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first()</code> takes a predicate and a default value. In RxJS 7 it is literally filter, then take(1), then either defaultIfEmpty or throwIfEmpty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choosing:</strong> <span style="color:#f0e2c8;">"I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first()</code> when an empty result means a bug and I want it loud, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">take(1)</code> when empty is acceptable, and a default when there is a sensible fallback."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The twist:</strong> <span style="color:#f0e2c8;">"In a route guard it hardly matters: I checked that the Angular router reports an empty guard as a NavigationError with EmptyError even with take(1), so the source must emit."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">firstValueFrom</code> do on an empty Observable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It rejects with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EmptyError</code>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first()</code>. You can pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ defaultValue: null }</code> to resolve with a value instead. The old <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toPromise()</code> resolved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, which is why it was deprecated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">take(1)</code> prevent memory leaks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It unsubscribes after the first value, so yes, for a source that emits. On a source that never emits, the subscription stays open, so it is not a substitute for unsubscribing on destroy in general.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">first(pred)</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">filter(pred), take(1)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same when a match exists. When none matches and the source completes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first(pred)</code> errors with EmptyError and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter + take(1)</code> just completes. I verified both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">first()</code> on a store selector throw?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A selector over the store never completes, so it normally cannot. It throws when something upstream completes empty, for example a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">take</code> combination, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catchError(() =&gt; EMPTY)</code>, or the store being destroyed in a test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">take(0)</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It completes immediately without subscribing for values, which can be handy in tests or to disable a stream conditionally. I verified it just completes.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **take(n)** | Emit at most n values, then complete and unsubscribe |
| **first()** | Emit the first (matching) value; error on empty unless a default is given |
| **EmptyError** | "no elements in sequence": a required value never came |
| **defaultIfEmpty / throwIfEmpty** | The operators first() uses for its empty-case policy |
| **firstValueFrom** | Promise form of first(); rejects with EmptyError on empty |
| **timeout** | Error if a value does not arrive in time; neither take nor first has one |

---
**Conclusion:** <code>take(1)</code> and <code>first()</code> share everything except their answer to one question: what if the source completes without a value? <code>take(1)</code> completes quietly; <code>first()</code> raises <code>EmptyError</code>, or emits a default if you gave one, because in RxJS 7.8.2 it is simply <code>filter</code> plus <code>take(1)</code> plus an empty-case policy. Choose <code>first()</code> when absence is a bug and <code>take(1)</code> when absence is normal, remember that neither times out, and remember the twist verified on Angular 22.2.3: a route guard that completes empty fails navigation with <code>EmptyError</code> either way.`,
    examples: [
      {
        label: "Cache hit vs empty cache: take(1), first(), first() with a default, and firstValueFrom",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";
import { EMPTY, Observable, firstValueFrom, first, of, take } from "rxjs";

// A cache lookup: emits the cached value, or completes with NO value when the
// cache is empty (like a store selector that filters out undefined, or EMPTY).
function fromCache(hit: boolean): Observable<string> {
  return hit ? of("cached-token", "newer-token") : EMPTY;
}

@Component({
  selector: "app-root",
  template: \`
    <button (click)="run(true)">Cache hit</button>
    <button (click)="run(false)">Cache empty</button>
    <button (click)="runPromise()">firstValueFrom(empty)</button>
    <p>take(1): {{ takeResult() }}</p>
    <p>first(): {{ firstResult() }}</p>
    <p>first(undefined, "anonymous"): {{ defaultResult() }}</p>
    <p>firstValueFrom: {{ promiseResult() }}</p>
  \`,
})
export class AppComponent {
  takeResult = signal("-");
  firstResult = signal("-");
  defaultResult = signal("-");
  promiseResult = signal("-");

  run(hit: boolean) {
    const describe = (target: typeof this.takeResult) => {
      let got = "no value";
      return {
        next: (v: string) => (got = "value " + v),
        complete: () => target.set(got + ", then complete"),
        error: (e: Error) => target.set("ERROR " + e.name + ": " + e.message),
      };
    };
    fromCache(hit).pipe(take(1)).subscribe(describe(this.takeResult));
    fromCache(hit).pipe(first()).subscribe(describe(this.firstResult));
    fromCache(hit).pipe(first(undefined, "anonymous")).subscribe(describe(this.defaultResult));
  }

  runPromise() {
    // firstValueFrom: the Promise version of first(). It rejects on an empty stream.
    firstValueFrom(fromCache(false)).then(
      (v) => this.promiseResult.set("resolved " + v),
      (e: Error) => this.promiseResult.set("rejected with " + e.name),
    );
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is NgRx?",
    seoDescription:
      "NgRx is Redux-style state management for Angular: actions, pure reducers, a single store and memoized selectors, plus Effects and the newer SignalStore.",
    description: `**Question presented to candidate:**
"Our team is debating whether to add NgRx to a growing Angular app. Explain what NgRx is, walk me through how data flows through it, and tell me when you would and would not use it."

**What a strong answer should cover:**
- NgRx is a family of **reactive state-management libraries** for Angular; \`@ngrx/store\` implements the **Redux pattern** with RxJS and signals.
- The building blocks: **actions** (named events), **reducers** (pure functions \`(state, action) => newState\`), the **store** (one immutable state tree), **selectors** (memoized queries), and **effects** for side effects such as HTTP.
- **Unidirectional data flow**: component dispatches, reducer computes, selector reads; no component mutates shared state directly.
- Benefits: predictability, **Redux DevTools** time-travel debugging, testable pure functions, clear separation of concerns. Costs: boilerplate and indirection, which \`createActionGroup\` / \`createFeature\` reduce.
- Modern details: \`provideStore()\` / \`provideState()\` for standalone apps, \`store.selectSignal()\`, **runtime immutability checks in dev mode**, and **NgRx SignalStore** (\`@ngrx/signals\`) as the lighter, signal-based option.
- When **not** to use it: small apps or local UI state, where a service with signals is enough.

**Clarifying questions expected:**
- "How much state is shared between distant parts of the app, and how many developers touch it?"
- "Do we need features such as undo, time-travel debugging or strict auditing of state changes?"

**Code / implementation expected:** Optional — a small feature with actions, a reducer, a selector and a component dispatching and reading.`,
    answer: `**Target Audience:** Angular developers who have heard "NgRx" in every job description and want a clear picture of what it is, how data moves through it, and when it is worth it.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The store example in section 5, the memoization and reducer checks in section 6 and the immutability error in section 7 were all produced by running @ngrx/store 22.0.1 on Angular 22.2.3. Version history is cited from NgRx release announcements.

## 1. Why This Even Matters — A Story First

Imagine a shared family calendar stuck on the fridge. Anyone can grab a pen and change anything. On Monday the dentist appointment moves; nobody knows who moved it, when, or why. By Friday two people have booked the car for the same afternoon.

Now change the rule. Nobody writes on the calendar directly. Instead, you drop a note in a box: "Mum: move dentist to Thursday". One person, the clerk, reads notes in order and redraws the calendar from scratch each time, following a fixed rulebook. Everybody else only *reads* the calendar. Suddenly you have a full history of every change, you can replay it, and two conflicting notes are handled in a predictable order.

That is NgRx. The notes are **actions**, the clerk's rulebook is the **reducer**, the calendar is the **store**, and the way each family member looks up just their own appointments is a **selector**. It costs more effort than scribbling on the fridge, which is exactly the trade-off an interviewer wants you to discuss.

## 2. The Core Idea

📌 **Interview term: NgRx** — a set of open-source state-management libraries for Angular. The core package, <code>@ngrx/store</code>, implements the **Redux pattern** on top of RxJS (and, in recent versions, Angular signals). Other packages add effects (<code>@ngrx/effects</code>), entity collections, router state, DevTools integration, and the signal-based <code>@ngrx/signals</code> SignalStore. The project marked its tenth anniversary with NgRx 21 (source: the <a href="https://dev.to/ngrx/announcing-ngrx-21-celebrating-a-10-year-journey-with-a-fresh-new-look-and-ngrxsignalsevents-5ekp" target="_blank" rel="noopener noreferrer">NgRx 21 announcement</a>); the version used here, 22.0.1, declares a peer dependency on <code>@angular/core ^22.0.0</code>.

📌 **Interview term: Redux pattern** — three rules: (1) the whole shared state lives in **one** object tree, (2) the state is **read-only**, the only way to change it is to dispatch an action, and (3) changes are made by **pure functions** (reducers).

📌 **Interview term: Action** — a plain object with a <code>type</code> string, such as <code>{ type: "[Cart] Add Item", name: "Book", price: 12 }</code>, describing *something that happened*. By convention the type starts with its source in square brackets.

📌 **Interview term: Reducer** — a pure function <code>(state, action) =&gt; newState</code>. Pure means: no HTTP, no <code>Date.now()</code>, no mutation; same input, same output. It returns a **new** object when something changed, and the **same** object when the action is not its concern.

📌 **Interview term: Store** — the injectable service that holds the state tree, accepts <code>dispatch(action)</code>, runs the reducers, and lets you read state with selectors. It is both an Observable of state and, via <code>selectSignal</code>, a source of signals; you get it with <code>inject(Store)</code> like any other dependency (see [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular)).

📌 **Interview term: Selector** — a function that reads a slice of state, created with <code>createSelector</code> and **memoized**: it recomputes only when its inputs change.

| Piece | Question it answers | Written with |
| :--- | :--- | :--- |
| Action | What happened? | <code>createAction</code>, <code>createActionGroup</code> |
| Reducer | How does state change because of it? | <code>createReducer</code>, <code>on()</code> |
| Store | Where does state live? | <code>provideStore()</code>, <code>provideState()</code>, <code>inject(Store)</code> |
| Selector | What does this screen need to see? | <code>createSelector</code>, <code>createFeature</code> |
| Effect | What else must happen (HTTP, navigation, storage)? | <code>createEffect</code> (see [NgRx Effects](/interview-question/what-is-the-role-of-ngrx-effects-and-why-do-we-separate-side-effects-from-reduce)) |

## 3. Picture It: One-Way Data Flow

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="The component dispatches an action, the reducer computes new state in the store, and a selector delivers it back to the component">
  <defs>
    <marker id="ngrx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="140" width="150" height="60" rx="10"/>
  <text class="d-text" x="115" y="175" text-anchor="middle">Component</text>
  <rect class="d-box-accent" x="285" y="35" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="60" text-anchor="middle">Action</text>
  <text class="d-sub" x="360" y="80" text-anchor="middle">Cart Add Item</text>
  <rect class="d-box" x="520" y="140" width="150" height="60" rx="10"/>
  <text class="d-text" x="595" y="165" text-anchor="middle">Reducer</text>
  <text class="d-sub" x="595" y="185" text-anchor="middle">pure function</text>
  <rect class="d-box-accent" x="285" y="248" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="360" y="273" text-anchor="middle">Store</text>
  <text class="d-sub" x="360" y="293" text-anchor="middle">one state tree</text>
  <path class="d-edge-accent" d="M 115 140 L 115 65 L 279 65" marker-end="url(#ngrx-arrow)"/>
  <text class="d-sub" x="60" y="105" text-anchor="middle">dispatch</text>
  <path class="d-edge-accent" d="M 435 65 L 595 65 L 595 134" marker-end="url(#ngrx-arrow)"/>
  <text class="d-sub" x="615" y="105">on(action)</text>
  <path class="d-edge-accent" d="M 595 200 L 595 278 L 441 278" marker-end="url(#ngrx-arrow)"/>
  <text class="d-sub" x="615" y="245">new state</text>
  <path class="d-edge-accent" d="M 285 278 L 115 278 L 115 206" marker-end="url(#ngrx-arrow)"/>
  <text class="d-sub" x="200" y="318" text-anchor="middle">selector</text>
</svg>

Data travels one way around the loop. The component never edits state: it dispatches an action describing what happened, the reducer produces the next state, and the component re-renders from a selector. Side effects such as HTTP calls hang off this loop in effects, covered in their own question.

📌 **Interview term: Unidirectional data flow** — state changes travel in one direction only (action, reducer, store, selector, view). It is what makes NgRx predictable: to find out why something changed, you look at the action log.

## 4. Writing a Feature in NgRx 22

Modern NgRx has removed most of the famous boilerplate. Three creator functions do the heavy lifting:

- <code>createActionGroup({ source: "Cart", events: { "Add Item": props&lt;...&gt;(), Clear: emptyProps() } })</code> creates typed action creators (<code>CartActions.addItem</code>, <code>CartActions.clear</code>) with types like <code>[Cart] Add Item</code>.
- <code>createFeature({ name: "cart", reducer, extraSelectors })</code> bundles a reducer with **auto-generated selectors** for every top-level state key (<code>selectItems</code>, <code>selectCartState</code>) plus any extra ones you derive.
- <code>provideStore({ cart: cartFeature.reducer })</code> (or <code>provideState(cartFeature)</code> for a [lazy-loaded route](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)) registers it in a standalone app, no <code>StoreModule</code> needed. Bootstrapping without NgModules is covered in [bootstrapping a standalone application](/interview-question/how-do-you-bootstrap-a-standalone-angular-application).

In the component, <code>store.selectSignal(selector)</code> returns an Angular [signal](/interview-question/what-are-angular-signals), so the template reads <code>count()</code> and OnPush, [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) Angular 22 knows exactly when to update (see [how change detection works](/interview-question/how-does-change-detection-work-in-angular)). <code>store.select(selector)</code> still returns an Observable for RxJS pipelines.

## 5. Verified: the store in action

The example for this question is a cart built exactly that way, with a logging **meta-reducer** (a function that wraps the root reducer and sees every action first). It needs <code>provideStore</code>, so it is <code>runnable: false</code> on the site, but it was compiled with <code>ngc</code> (strict templates), booted with its <code>appConfig</code> in jsdom and clicked through:

\`\`\`
after book, pen, book: 3 items, total 27 | Book (12), Pen (3), Book (12)
after remove last    : 2 items, total 15
after clear          : 0 items, total 0
Actions seen: @ngrx/store/init > [Cart] Add Item > [Cart] Add Item > [Cart] Add Item > [Cart] Remove Last > [Cart] Clear
\`\`\`

Two things to notice. Every change is visible as a named action, in order, which is exactly what Redux DevTools shows as a timeline (DevTools itself is the separate <code>@ngrx/store-devtools</code> package and a browser extension; it was not run here). And the store dispatched its own <code>@ngrx/store/init</code> action at startup, which is how every reducer gets the chance to return its initial state.

## 6. Verified: reducers are pure, selectors are memoized

A plain Node script against @ngrx/store 22.0.1:

\`\`\`
total 15 runs 1
total 15 runs 1 (theme changed, items same reference)
total 20 runs 2 (new items array)
reducer returns new object: true { n: 1 } | unknown action returns same reference: true
\`\`\`

- The <code>selectTotal</code> projector ran **once** for two different states, because the unrelated <code>ui</code> slice changed but the <code>items</code> array was the same reference. It re-ran only when a new <code>items</code> array appeared. This is why immutability matters: memoization compares references.
- The reducer returned a new object for its own action and **the identical object** for an unknown action, so nothing downstream recomputes.

## 7. Verified: dev-mode immutability checks

NgRx enables runtime checks in development mode. Reading the installed 22.0.1 source, <code>strictStateImmutability</code> and <code>strictActionImmutability</code> default to <code>true</code> when <code>isDevMode()</code> is true and <code>false</code> otherwise. A deliberately bad reducer that did <code>state.items.push(name)</code> failed on the first dispatch:

\`\`\`
TypeError: Cannot add property 0, object is not extensible
\`\`\`

The state object had been frozen by the check, so the mutation threw instead of silently corrupting the store. In production builds the check is off, so the same bug would mutate state and break memoized selectors without any error: one more reason the dev-mode check is valuable.

## 8. When to Use NgRx (and When Not)

| Use NgRx Store when | Prefer something lighter when |
| :--- | :--- |
| Many distant components read and change the same data | State belongs to one component or one route |
| Several developers or teams work on shared state | The app is small or short-lived |
| You need an audit trail, undo or DevTools time travel | You mainly cache server data (consider a resource or a query library) |
| Complex async workflows (effects coordinating several calls) | A [service](/interview-question/what-is-a-service-and-why-use-it) with signals covers it |

The NgRx team itself now offers a lighter option: **SignalStore** in <code>@ngrx/signals</code>, which keeps state, derived state and methods in one injectable built on signals. Its comparison with the classic store, NGXS and plain services is the subject of [state management libraries in Angular](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular).

## 9. Common Pitfalls

- **Putting everything in the store.** Form drafts, hover state and open/closed panels rarely need global, logged, replayable state. Keep local UI state in the component.
- **Mutating state in a reducer.** In dev mode it throws (as verified); in production it silently breaks selectors that rely on reference equality.
- **Doing HTTP in a reducer or a component subscribe.** Reducers must be pure; async work belongs in effects, usually behind a flattening operator chosen on purpose (see [switchMap vs mergeMap vs concatMap vs exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap)).
- **Selecting the whole state and filtering in the component.** Write selectors: they are memoized, testable and reusable. In component tests, <code>provideMockStore</code> replaces the real store (see [mocking services in unit tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies)).
- **Using actions as commands ("Set Loading True").** Name actions after events ("[Users Page] Opened"); several reducers and effects can then react to one event.
- **Reaching for NgRx on day one.** Its value grows with shared state and team size; for a small app it is mostly indirection.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"NgRx is a family of state-management libraries for Angular. The core, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ngrx/store</code>, is the Redux pattern built on RxJS and signals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The pieces:</strong> <span style="color:#f0e2c8;">"Actions describe what happened, pure reducers compute the next state, one store holds the state tree, memoized selectors read slices of it, and effects handle side effects like HTTP."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The flow:</strong> <span style="color:#f0e2c8;">"Data flows one way: the component dispatches, the reducer updates the store, the selector feeds the component. Components never mutate shared state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why:</strong> <span style="color:#f0e2c8;">"You get predictability, an action log you can replay in DevTools, and pure functions that are trivial to test. The cost is more code and indirection."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Today:</strong> <span style="color:#f0e2c8;">"In Angular 22 I use createActionGroup, createFeature and selectSignal, and for smaller features the NgRx SignalStore or a signal service instead of the full store."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must reducers be pure and state immutable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Selectors are memoized by reference, so a mutated array looks unchanged and the UI does not update. Pure reducers also make time-travel and replay possible. In dev mode NgRx freezes state; my mutating reducer threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: Cannot add property 0, object is not extensible</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a meta-reducer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A function that wraps the root reducer, so it sees every action and state before the feature reducers. It is used for logging, resetting state on logout, or syncing to localStorage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test NgRx code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reducers and selectors are plain functions: call them with state and an action and assert the result, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selector.projector(...)</code>. For components, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideMockStore</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ngrx/store/testing</code> lets you set state and spy on dispatch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Store vs a service with a BehaviorSubject or signal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A service is enough for local or small shared state. The store adds enforced one-way flow, a single action log and tooling, which pays off with many features, many developers and complex async flows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the NgRx SignalStore fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the signal-based option from the NgRx team: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">signalStore(withState, withComputed, withMethods)</code> gives a typed injectable store without actions and reducers. It suits feature or component state; the classic store suits app-wide, event-driven state.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **NgRx** | Redux-style state-management libraries for Angular |
| **Redux pattern** | One state tree, read-only, changed only by pure reducers |
| **Action** | An object describing something that happened, with a <code>type</code> |
| **Reducer** | Pure function from (state, action) to the next state |
| **Store** | Service holding the state; you dispatch to it and select from it |
| **Selector** | Memoized function that reads part of the state |
| **Meta-reducer** | Wrapper around the root reducer that sees every action |
| **Unidirectional data flow** | Changes travel one way: action, reducer, store, view |
| **Runtime checks** | Dev-mode guards such as freezing state to catch mutations |

---
**Conclusion:** NgRx brings the Redux pattern to Angular: components dispatch actions, pure reducers produce a new immutable state in a single store, and memoized selectors feed the view, with effects handling the side effects. The verified run shows the payoff in miniature: every change appeared as a named action in order, a selector skipped recomputation when its input reference did not change, and the dev-mode immutability check turned a mutating reducer into an immediate <code>TypeError</code>. Use it where shared state, team size and debugging needs justify the extra structure, and reach for SignalStore or a signal-based service where they do not.`,
    examples: [
      {
        label: "A cart with createActionGroup, createFeature, selectors and store.selectSignal (NgRx 22)",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject, signal } from "@angular/core";
import { ActionReducer, Store, createActionGroup, createFeature, createReducer, createSelector, emptyProps, on, props, provideStore } from "@ngrx/store";

// 1. Actions: named events. createActionGroup builds "[Cart] Add Item" etc.
export const CartActions = createActionGroup({
  source: "Cart",
  events: {
    "Add Item": props<{ name: string; price: number }>(),
    "Remove Last": emptyProps(),
    Clear: emptyProps(),
  },
});

// 2. State + reducer: a pure function (state, action) => new state. Never mutate.
interface CartState {
  items: { name: string; price: number }[];
}
const initialState: CartState = { items: [] };

export const cartFeature = createFeature({
  name: "cart",
  reducer: createReducer(
    initialState,
    on(CartActions.addItem, (state, { name, price }) => ({ ...state, items: [...state.items, { name, price }] })),
    on(CartActions.removeLast, (state) => ({ ...state, items: state.items.slice(0, -1) })),
    on(CartActions.clear, () => initialState),
  ),
  // 3. Selectors: createFeature generates selectCartState and selectItems; we add derived ones.
  extraSelectors: ({ selectItems }) => ({
    selectCount: createSelector(selectItems, (items) => items.length),
    selectTotal: createSelector(selectItems, (items) => items.reduce((sum, i) => sum + i.price, 0)),
  }),
});

// A meta-reducer sees every action before the reducers: handy for logging.
export const actionLog = signal<string[]>([]);
function logger(reducer: ActionReducer<any>): ActionReducer<any> {
  return (state, action) => {
    actionLog.update((log) => [...log, action.type]);
    return reducer(state, action);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [provideStore({ [cartFeature.name]: cartFeature.reducer }, { metaReducers: [logger] })],
};

@Component({
  selector: "app-root",
  template: \`
    <button (click)="add('Book', 12)">Add book</button>
    <button (click)="add('Pen', 3)">Add pen</button>
    <button (click)="store.dispatch(actions.removeLast())">Remove last</button>
    <button (click)="store.dispatch(actions.clear())">Clear</button>
    <p>{{ count() }} items, total {{ total() }}</p>
    <ul>
      @for (item of items(); track $index) {
        <li>{{ item.name }} ({{ item.price }})</li>
      }
    </ul>
    <p>Actions seen: {{ log().join(" > ") }}</p>
  \`,
})
export class AppComponent {
  store = inject(Store);
  actions = CartActions;
  log = actionLog;
  // selectSignal turns a selector into an Angular signal the template can read.
  items = this.store.selectSignal(cartFeature.selectItems);
  count = this.store.selectSignal(cartFeature.selectCount);
  total = this.store.selectSignal(cartFeature.selectTotal);

  add(name: string, price: number) {
    this.store.dispatch(CartActions.addItem({ name, price }));
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the role of NgRx Effects, and why do we separate side effects from reducers?",
    seoDescription:
      "NgRx Effects listen to actions, run side effects such as HTTP and dispatch result actions, so reducers stay pure, synchronous and testable.",
    description: `**Question presented to candidate:**
"In our NgRx app, a developer put the \`HttpClient\` call for loading users directly in the component and dispatches the result, and another suggested calling the API inside the reducer. Explain what NgRx Effects are for, why side effects are kept out of reducers, and how you would write the load-users flow."

**What a strong answer should cover:**
- An **effect** is an Observable pipeline that listens to the **action stream**, performs **side effects** (HTTP, navigation, storage, timers), and usually **maps the outcome to new actions** that are dispatched back to the store.
- **Reducers must be pure and synchronous**: same input, same output, no I/O. That keeps them predictable, replayable (DevTools time travel), and trivially testable; an HTTP call cannot return the next state synchronously anyway.
- Components only **dispatch events** ("[Users Page] Opened") and read selectors; they do not know where data comes from.
- The canonical shape: \`ofType(opened)\` then a flattening operator (\`switchMap\`, \`exhaustMap\`, \`concatMap\`, \`mergeMap\`, chosen deliberately), the API call, \`map\` to a success action, and **\`catchError\` inside** the inner pipe mapping to a failure action.
- Variants: **functional effects** (\`createEffect(fn, { functional: true })\`), **non-dispatching effects** (\`{ dispatch: false }\`), and the default error handler that resubscribes an effect after an uncaught error (up to 10 times).
- Testing: \`provideMockActions\` and marble or plain subscription tests.

**Clarifying questions expected:**
- "What should happen if the user triggers the load again while one is in flight?"
- "Should a failure be shown to the user, retried, or both?"

**Code / implementation expected:** Yes — actions, a reducer handling success and failure, and an effect with the correct operator and error handling.`,
    answer: `**Target Audience:** Angular developers who know the basics of the NgRx store (actions, reducers, selectors) and want to understand where HTTP calls and other side effects belong.
**Difficulty:** Medium to Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The action log in section 5, the error-handling run in section 6 and the effect test in section 7 were produced by running @ngrx/store and @ngrx/effects 22.0.1 on Angular 22.2.3; the retry limit was read from the installed @ngrx/effects source.

## 1. Why This Even Matters — A Story First

Back to the family calendar from the [NgRx overview](/interview-question/what-is-ngrx): notes go in a box, and a clerk redraws the calendar by following a rulebook. The clerk has one strict rule: **never leave the desk**. Redrawing must be instant and must depend only on the current calendar and the note.

So what happens with a note like "book the dentist"? Somebody has to phone the dentist, wait on hold, and find out which day is free. The clerk cannot do that without breaking the rule. Instead, there is a **runner** who also reads every note. When the runner sees "book the dentist", they make the phone call, wait, and then drop a *new* note in the box: "dentist booked for Thursday" or "dentist fully booked". The clerk handles those notes like any other, instantly.

The runner is an **NgRx Effect**. The clerk is the reducer. Keeping phone calls away from the clerk is what keeps the calendar predictable, and that separation is the heart of this question.

## 2. The Core Idea

📌 **Interview term: Side effect** — anything a function does besides computing a return value from its inputs: HTTP requests, reading <code>localStorage</code>, navigation, timers, logging, showing a toast. Side effects are where the outside world (slow, failing, non-deterministic) touches your app.

📌 **Interview term: Pure reducer** — a reducer with no side effects: same state and action in, same new state out, synchronously. NgRx relies on this for predictable updates, memoized selectors and replayable history.

📌 **Interview term: Effect** — an Observable pipeline that subscribes to the stream of **all dispatched actions** (<code>Actions</code>), filters the ones it cares about with <code>ofType</code>, does the side effect, and (usually) returns **new actions** that NgRx dispatches to the store for you.

📌 **Interview term: Action triad** — the usual trio for one async operation: a trigger (<code>[Users Page] Opened</code>), a success (<code>[Users Page] Load Success</code>) and a failure (<code>[Users Page] Load Failure</code>); many teams give the last two an API source such as <code>[Users API]</code>. The reducer handles all three synchronously; only the effect knows that an HTTP call happens in between.

Why not put the call in the reducer or the component?

| Option | Problem |
| :--- | :--- |
| HTTP inside the reducer | A reducer must return the next state **now**; an HTTP response arrives later. It would also make reducers impure, untestable without a server, and break time-travel replay (replaying an action would resend the request). |
| HTTP in the component, then dispatch the result | Works, but every component that triggers the load must repeat the call, the loading and error handling, and the component now knows about the API. Cancelling or deduplicating overlapping loads becomes per-component code. |
| **Effect** | The component dispatches one event and reads selectors (the API call itself lives in a [service](/interview-question/what-is-a-service-and-why-use-it) the effect injects); the effect owns the API call, concurrency policy and error mapping in one testable place. |

## 3. Picture It

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Actions flow to the reducer synchronously and to an effect, which calls the API and dispatches a result action back">
  <defs>
    <marker id="fx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="150" height="56" rx="10"/>
  <text class="d-text d-accent" x="95" y="74" text-anchor="middle">Actions</text>
  <rect class="d-box-muted" x="220" y="20" width="300" height="205" rx="12"/>
  <text class="d-text" x="370" y="44" text-anchor="middle">loadUsers effect</text>
  <rect class="d-box" x="245" y="60" width="250" height="40" rx="8"/>
  <text class="d-sub" x="370" y="85" text-anchor="middle">ofType(opened)</text>
  <rect class="d-box" x="245" y="115" width="250" height="40" rx="8"/>
  <text class="d-sub" x="370" y="140" text-anchor="middle">exhaustMap: call the API</text>
  <rect class="d-box" x="245" y="170" width="250" height="40" rx="8"/>
  <text class="d-sub" x="370" y="195" text-anchor="middle">map success, catchError failure</text>
  <rect class="d-box" x="570" y="115" width="130" height="40" rx="8"/>
  <text class="d-sub" x="635" y="140" text-anchor="middle">HTTP API</text>
  <rect class="d-box-accent" x="20" y="250" width="150" height="50" rx="10"/>
  <text class="d-text d-accent" x="95" y="280" text-anchor="middle">Reducer</text>
  <path class="d-edge" d="M 170 68 L 214 68" marker-end="url(#fx-arrow)"/>
  <path class="d-edge-dashed" d="M 495 135 L 564 135" marker-end="url(#fx-arrow)"/>
  <path class="d-edge" d="M 95 96 L 95 244" marker-end="url(#fx-arrow)"/>
  <text class="d-sub" x="105" y="175">on()</text>
  <path class="d-edge-accent" d="M 370 225 L 370 275 L 176 275" marker-end="url(#fx-arrow)"/>
  <text class="d-sub" x="385" y="262">result action</text>
</svg>

Every action reaches the reducer synchronously and also flows into the action stream that effects listen to. The effect performs the asynchronous work and feeds its result back in as an ordinary action, which the reducer then handles like any other.

## 4. Writing the Load-Users Flow (NgRx 22)

The example for this question uses **functional effects**, the modern style: a plain function whose parameters default to [<code>inject(...)</code>](/interview-question/inject-vs-constructor-injection-when-should-you-use-each) calls, registered with <code>provideEffects({ loadUsers, notifyOnFailure })</code>.

\`\`\`ts
export const loadUsers = createEffect(
  (actions$ = inject(Actions), api = inject(UsersApi)) =>
    actions$.pipe(
      ofType(UsersActions.opened),
      exhaustMap(() =>
        api.getAll().pipe(
          map((users) => UsersActions.loadSuccess({ users })),
          catchError((e: Error) => of(UsersActions.loadFailure({ error: e.message }))),
        ),
      ),
    ),
  { functional: true },
);
\`\`\`

Four decisions are packed into those lines, and an interviewer may probe each:

1. **<code>ofType</code>** narrows the stream (and the TypeScript type) to the trigger action.
2. **The flattening operator is a policy decision.** <code>exhaustMap</code> ignores repeated "Opened" events while a load is in flight; <code>switchMap</code> would cancel the old load; <code>concatMap</code> would queue saves. The trade-offs are covered in [switchMap vs mergeMap vs concatMap vs exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).
3. **<code>map</code> to a success action**: the effect returns actions, NgRx dispatches them.
4. **<code>catchError</code> inside the inner pipe**, mapped to a failure action. On the outer chain it would complete the effect after the first error; see [catchError and fallback values](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value).

📌 **Interview term: Non-dispatching effect** — <code>{ dispatch: false }</code> marks an effect that only performs a side effect (a toast, analytics, <code>router.navigate</code>) and returns no action. Forgetting the flag on such an effect makes NgRx dispatch whatever the stream emits, typically re-dispatching the same action in an endless loop.

## 5. Verified: the action log

The full example was compiled with <code>ngc</code> (strict templates), booted with its <code>appConfig</code> (<code>provideStore</code> with a logging meta-reducer, plus <code>provideEffects</code>) and driven in jsdom. The fake API answers after 100 ms and can be switched to fail:

\`\`\`
right after click : loading=true users=none error=none
after the request : loading=false users=Ann, Bob error=none
with failing API  : loading=false users=Ann, Bob error=500 Server Error / toast: 500 Server Error
3 quick clicks    : loading=false users=Ann, Bob error=none
action log:
  1. @ngrx/store/init
  2. @ngrx/effects/init
  3. [Users Page] Opened
  4. [Users Page] Load Success
  5. [Users Page] Opened
  6. [Users Page] Load Failure
  7. [Users Page] Opened
  8. [Users Page] Opened
  9. [Users Page] Opened
  10. [Users Page] Load Success
\`\`\`

What the log proves:

- **The reducer ran before the request finished**: <code>loading=true</code> right after the click, from the reducer handling <code>Opened</code> synchronously. The data arrived later through a separate <code>Load Success</code> action.
- **A failure is just another action** (line 6). The reducer stored the error, and the non-dispatching <code>notifyOnFailure</code> effect showed a toast, without the component writing any error-handling code.
- **The effect survived the failure**: the next click loaded normally, because <code>catchError</code> sat on the inner request.
- **<code>exhaustMap</code> deduplicated**: three quick clicks (lines 7 to 9) produced one <code>Load Success</code> (line 10).

## 6. Verified: what happens when an effect does not catch

📌 **Interview term: Effects error handler** — NgRx wraps every effect in <code>defaultEffectsErrorHandler</code> unless you pass <code>useEffectsErrorHandler: false</code>. In the installed 22.0.1 source it catches an error, reports it to Angular <code>ErrorHandler</code>, and resubscribes the effect, with <code>MAX_NUMBER_OF_RETRY_ATTEMPTS = 10</code>.

A test effect that always throws on its outer chain, with a counting <code>ErrorHandler</code>, clicked twelve times:

\`\`\`
dispatch -> effect ran 1 times, ErrorHandler called 1 times
dispatch -> effect ran 2 times, ErrorHandler called 2 times
...
dispatch -> effect ran 10 times, ErrorHandler called 10 times
dispatch -> effect ran 11 times, ErrorHandler called 10 times
dispatch -> effect ran 11 times, ErrorHandler called 10 times
\`\`\`

(Lines 3 to 9 follow the same pattern and are elided.) The safety net resubscribed the effect after each of the first ten errors. The eleventh error was no longer handed to the <code>ErrorHandler</code>, and on the twelfth dispatch the effect did not run at all: it was dead. So the default handler buys time, but it is not error handling. Map errors to failure actions inside the inner pipe.

## 7. Verified: effects are easy to test

A functional effect is just a function, so a test can call it with a fake action stream and a fake API, no TestBed needed:

\`\`\`
typeof functional effect: function
success path -> [{"users":["Ann","Bob"],"type":"[Users Page] Load Success"}]
failure path -> [{"error":"500 Server Error","type":"[Users Page] Load Failure"}]
\`\`\`

(<code>loadUsers(of(UsersActions.opened()), fakeApi).pipe(toArray())</code>, once with an API returning data and once with one that throws.) For class-based effects or more complex setups, <code>provideMockActions</code> from <code>@ngrx/effects/testing</code> supplies the action stream inside TestBed; mocking the API service itself is covered in [mocking services in unit tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies).

## 8. Common Pitfalls

- **<code>catchError</code> on the outer chain.** The effect completes after one error (or after ten with the default handler, as verified). Always catch inside the flattening operator.
- **<code>switchMap</code> on writes.** Cancelling a save on the client does not cancel it on the server; use <code>concatMap</code> or <code>mergeMap</code> for create, update and delete effects.
- **Forgetting <code>{ dispatch: false }</code>.** A logging or navigation effect that returns the incoming action re-dispatches it forever. Verified: a <code>tap</code>-only toast effect without the flag ran 6 times after ONE dispatch, until a counter in the test threw to stop it.
- **Dispatching from inside an effect with <code>store.dispatch</code>.** Return actions from the stream instead; it keeps the flow visible and testable.
- **Putting business logic for state in effects.** "What the new state is" belongs in reducers; effects should only orchestrate side effects and translate outcomes into actions.
- **Reading state with <code>combineLatest</code> in an effect.** It re-runs the effect on every state change; sample the state when the action arrives instead (the trigger-versus-sampled distinction in [forkJoin, zip, combineLatest and withLatestFrom](/interview-question/what-is-the-difference-between-forkjoin-zip-combinelatest-and-withlatestfrom)).
- **Effects for everything.** Purely synchronous derivations are selectors; component-local async work may not need the global store at all (see [state management libraries in Angular](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular) for lighter options such as the SignalStore).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Role:</strong> <span style="color:#f0e2c8;">"An effect listens to the action stream, performs a side effect such as an HTTP call, and maps the outcome to new actions that NgRx dispatches back to the store."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why separate:</strong> <span style="color:#f0e2c8;">"Reducers must be pure and synchronous: same input, same output, no I/O. That keeps state predictable, selectors memoizable, DevTools replay safe and reducers testable without a server."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The flow:</strong> <span style="color:#f0e2c8;">"The component dispatches an event like Users Page Opened. The reducer sets loading, the effect calls the API and dispatches Load Success or Load Failure, and the reducer records the result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Operators:</strong> <span style="color:#f0e2c8;">"The flattening operator is a policy choice: exhaustMap to ignore repeats, switchMap to cancel stale loads, concatMap for ordered writes. catchError goes inside it and maps to a failure action."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">"In my run three quick clicks produced one Load Success with exhaustMap, a failure showed up as a normal action, and the effect kept working afterwards."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if an effect throws and you do not catch it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NgRx's default effects error handler reports it to ErrorHandler and resubscribes, up to 10 times in the 22.0.1 source. I verified the eleventh error left the effect dead. It is a safety net, not a strategy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Functional or class-based effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functional effects, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createEffect(fn, { functional: true })</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> defaults, are the modern style: no class, and the function can be called directly in a test with a fake action stream and API. Class-based effects still work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read state inside an effect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Combine the action with a selector, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concatLatestFrom(() =&gt; store.select(selectFilters))</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ngrx/operators</code>, which only evaluates the selector when the action arrives. Avoid subscribing to the store inside the effect manually.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is an effect non-dispatching?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When it only performs a side effect with no resulting action: navigation, a toast, analytics, writing to localStorage. Mark it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ dispatch: false }</code>, otherwise its emissions are dispatched as actions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the SignalStore have effects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as a separate concept. In a SignalStore, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rxMethod</code> or plain async methods in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withMethods</code> do the side effects and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchState</code>. The events plugin in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@ngrx/signals/events</code> brings back an event-driven style with handlers.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Side effect** | Work that touches the outside world: HTTP, storage, navigation, timers |
| **Pure reducer** | Synchronous function from state and action to new state, no I/O |
| **Effect** | Pipeline from actions to side effects to new actions |
| **<code>ofType</code>** | Operator that keeps only the listed action types |
| **Action triad** | Trigger, success and failure actions for one async operation |
| **Functional effect** | <code>createEffect(fn, { functional: true })</code> using <code>inject()</code> defaults |
| **Non-dispatching effect** | <code>{ dispatch: false }</code>: side effect only, no resulting action |
| **Effects error handler** | Default wrapper that resubscribes a failing effect, up to 10 times |

---
**Conclusion:** NgRx Effects exist so that reducers can stay pure: the reducer answers "what is the new state?" instantly, and the effect answers "what else has to happen?" asynchronously, reporting back with ordinary actions. The verified run shows the division of labour clearly: <code>loading=true</code> came from the reducer before the request finished, success and failure arrived as separate actions, <code>exhaustMap</code> collapsed three clicks into one request, and an inner <code>catchError</code> kept the effect alive, whereas the default error handler only resubscribed an uncaught effect ten times before it died. Pick the flattening operator deliberately, catch inside it, and keep state logic in the reducer.`,
    examples: [
      {
        label: "A functional effect with exhaustMap, a failure action and a non-dispatching toast effect (NgRx 22)",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import { Actions, createEffect, ofType, provideEffects } from "@ngrx/effects";
import { ActionReducer, Store, createActionGroup, createFeature, createReducer, emptyProps, on, props, provideStore } from "@ngrx/store";
import { Observable, catchError, delay, exhaustMap, map, of, tap, throwError } from "rxjs";

// ── Actions: the component only ever says WHAT happened. ───────────────────
export const UsersActions = createActionGroup({
  source: "Users Page",
  events: {
    Opened: emptyProps(),
    "Load Success": props<{ users: string[] }>(),
    "Load Failure": props<{ error: string }>(),
  },
});

// ── A fake API (stands in for HttpClient). Toggle \`failNext\` to simulate a 500. ──
@Injectable({ providedIn: "root" })
export class UsersApi {
  failNext = false;
  calls = 0;
  getAll(): Observable<string[]> {
    this.calls++;
    return this.failNext ? throwError(() => new Error("500 Server Error")) : of(["Ann", "Bob"]).pipe(delay(100));
  }
}

// ── Reducer: pure, synchronous, no HTTP. It just records outcomes. ─────────
interface UsersState {
  users: string[];
  loading: boolean;
  error: string | null;
}
export const usersFeature = createFeature({
  name: "users",
  reducer: createReducer<UsersState>(
    { users: [], loading: false, error: null },
    on(UsersActions.opened, (s) => ({ ...s, loading: true, error: null })),
    on(UsersActions.loadSuccess, (s, { users }) => ({ ...s, users, loading: false })),
    on(UsersActions.loadFailure, (s, { error }) => ({ ...s, error, loading: false })),
  ),
});

// ── Effects: listen for actions, do the async work, dispatch the result. ──
export const loadUsers = createEffect(
  (actions$ = inject(Actions), api = inject(UsersApi)) =>
    actions$.pipe(
      ofType(UsersActions.opened),
      exhaustMap(() =>
        api.getAll().pipe(
          map((users) => UsersActions.loadSuccess({ users })),
          // catchError INSIDE the inner stream: the effect itself stays alive.
          catchError((e: Error) => of(UsersActions.loadFailure({ error: e.message }))),
        ),
      ),
    ),
  { functional: true },
);

// A non-dispatching effect: a side effect with no resulting action.
export const notifyOnFailure = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(UsersActions.loadFailure),
      tap(({ error }) => toasts.update((t) => [...t, "toast: " + error])),
    ),
  { functional: true, dispatch: false },
);

export const toasts = signal<string[]>([]);
export const actionLog = signal<string[]>([]);
function logger(reducer: ActionReducer<any>): ActionReducer<any> {
  return (state, action) => {
    actionLog.update((l) => [...l, action.type]);
    return reducer(state, action);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ [usersFeature.name]: usersFeature.reducer }, { metaReducers: [logger] }),
    provideEffects({ loadUsers, notifyOnFailure }),
  ],
};

@Component({
  selector: "app-root",
  template: \`
    <label><input type="checkbox" (change)="api.failNext = $any($event.target).checked" /> make the API fail</label>
    <button (click)="store.dispatch(opened())">Open users page</button>
    <p>loading={{ loading() }} users={{ users().join(", ") || "none" }} error={{ error() ?? "none" }}</p>
    <p>{{ toasts().join(" | ") }}</p>
    <ol>
      @for (type of log(); track $index) {
        <li>{{ type }}</li>
      }
    </ol>
  \`,
})
export class AppComponent {
  store = inject(Store);
  api = inject(UsersApi);
  opened = UsersActions.opened;
  users = this.store.selectSignal(usersFeature.selectUsers);
  loading = this.store.selectSignal(usersFeature.selectLoading);
  error = this.store.selectSignal(usersFeature.selectError);
  toasts = toasts;
  log = actionLog;
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the differences between State Management libraries in Angular?",
    seoDescription:
      "Angular state options compared: signal services, NgRx Store, NgRx SignalStore, NGXS, Elf and server-state tools, with when to choose each in Angular 22.",
    description: `**Question presented to candidate:**
"We are starting a new Angular 22 app with about a dozen feature areas and three teams. Some people want NgRx, some want NGXS, and some say services with signals are enough. Compare the main state-management options in Angular and tell me how you would decide."

**What a strong answer should cover:**
- First split the problem: **local UI state**, **shared client state**, and **server state (cached API data)** need different tools.
- **Services with signals** (or a BehaviorSubject): no dependency, minimal ceremony; discipline (private writable state, read-only views, methods) is up to the team.
- **NgRx Store + Effects**: Redux pattern, actions, pure reducers, selectors, DevTools, the most structure and the most code; strong for large, event-driven, multi-team apps.
- **NgRx SignalStore** (\`@ngrx/signals\`): signal-based, composable features (\`withState\`, \`withComputed\`, \`withMethods\`, \`rxMethod\`, entities, events plugin), protected state by default; a middle ground.
- **NGXS** (class and decorator based Redux style) and **Elf** (the successor recommended by the Akita team); Akita itself is no longer recommended for new work.
- **Server state** tools: Angular \`resource()\` / \`httpResource()\` (stable in v22) or TanStack Query (Angular adapter still experimental) for caching, loading and error status.
- Decision criteria: team size, how much state is truly shared, debugging/audit needs, async complexity, learning curve, bundle size, and consistency across teams.

**Clarifying questions expected:**
- "How much state is genuinely shared across features, versus local to a screen or derived from the server?"
- "Do we need time-travel debugging, undo, or a strict audit of state changes?"

**Code / implementation expected:** Optional — the same small feature written as a signal service and as a SignalStore (or store) to compare the ceremony.`,
    answer: `**Target Audience:** Angular developers and tech leads choosing a state-management approach for a new or growing app.
**Difficulty:** Medium to Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The two implementations in section 6 were compiled and run on Angular 22.2.3 with @ngrx/signals 22.0.1, the API-stability claims were read from the installed package typings, and facts about third-party libraries are cited from their own announcements and npm pages. Library landscapes move quickly, so re-check the cited pages before quoting them. NGXS, Elf, TanStack Query and the DevTools add-ons were not installed or run here.

## 1. Why This Even Matters — A Story First

Think about how information is kept in different kinds of organisations.

A two-person bakery keeps notes on a whiteboard by the oven. Anyone can rub something out and write something new, and it works perfectly, because both people are in the same room. A mid-sized company keeps a shared spreadsheet per department, with a few rules about who edits which column. A bank keeps a ledger: nobody edits a balance directly; every change is a recorded transaction, processed in order, auditable years later.

None of these is "the best". The whiteboard would be reckless at the bank, and the ledger would be absurd in the bakery. Angular state management is the same choice: a service with signals is the whiteboard, a SignalStore is the departmental spreadsheet with rules, and the NgRx Store is the ledger. The interview question is really "can you match the tool to the size and risk of the problem?"

## 2. The Core Idea

📌 **Interview term: State** — any data that changes over time and that the UI depends on: the logged-in user, the cart, a filter, whether a panel is open, the list of orders from the server.

📌 **Interview term: Local, shared and server state** — the three kinds that need different tools. **Local** state belongs to one component (a hover flag, a form draft). **Shared client state** is created in the browser and used across features (cart, preferences). **Server state** is a cached copy of data the server owns (orders, products): its hard problems are loading, errors, caching, refetching and staleness, not who may write it.

📌 **Interview term: Single source of truth** — every piece of shared state has exactly one owner that holds it and one way to change it. All the libraries below are different ways to enforce that.

Many "which library?" debates disappear once the three kinds are separated: local state stays in the component as [signals](/interview-question/what-are-angular-signals), server state goes to a resource or query tool, and only the remaining shared client state needs a "state management library" at all.

## 3. The Options at a Glance

| | Signal (or RxJS) service | NgRx SignalStore | NgRx Store + Effects | NGXS | Elf |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Package | none (<code>@angular/core</code>) | <code>@ngrx/signals</code> | <code>@ngrx/store</code>, <code>@ngrx/effects</code> | <code>@ngxs/store</code> | <code>@ngneat/elf</code> |
| Model | Class with private signal and methods | Composable store features built on signals | Redux: actions, reducers, selectors | Redux-style with classes and decorators | Reactive stores built on RxJS |
| Changing state | Call a method | Methods calling <code>patchState</code> | Dispatch an action; a reducer handles it | Dispatch an action; an <code>@Action</code> method handles it | Update functions on a store |
| Async work | Methods, RxJS, resources | <code>rxMethod</code>, async methods, events plugin | Effects | Async action handlers | RxJS pipelines |
| Ceremony | Lowest | Low to medium | Highest | Medium | Low to medium |
| Redux DevTools | No (hand-rolled) | Community <code>withDevtools</code> from <code>@angular-architects/ngrx-toolkit</code> (beta) | Yes, <code>@ngrx/store-devtools</code> | Yes, <code>@ngxs/devtools-plugin</code> | Yes, <code>@ngneat/elf-devtools</code> |
| Best fit | Small to medium apps, feature state | Feature and domain state in signal-first apps | Large, event-driven, multi-team apps | Teams preferring class-based Redux | RxJS-centric apps, Akita migrations |

Two neighbours worth knowing:

- **Akita**, from the Datorama team, is no longer the recommended choice for new work: its npm page points users to **Elf**, its successor (source: the <a href="https://npmjs.com/package/@datorama/akita" target="_blank" rel="noopener noreferrer">@datorama/akita npm page</a>).
- **NgRx ComponentStore** (<code>@ngrx/component-store</code>) was NgRx's earlier lightweight, RxJS-based store; SignalStore is its signal-based successor in spirit, and new code generally starts with SignalStore.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="A spectrum from component signals through signal services, SignalStore and NGXS or Elf to the NgRx Store, from least to most structure">
  <defs>
    <marker id="stm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="36">less ceremony</text>
  <text class="d-sub" x="700" y="36" text-anchor="end">more structure</text>
  <path class="d-edge-accent" d="M 20 55 L 692 55" marker-end="url(#stm-arrow)"/>
  <rect class="d-box" x="20" y="95" width="120" height="100" rx="10"/>
  <text class="d-text" x="80" y="135" text-anchor="middle">Component</text>
  <text class="d-sub" x="80" y="160" text-anchor="middle">signals</text>
  <rect class="d-box" x="160" y="95" width="120" height="100" rx="10"/>
  <text class="d-text" x="220" y="135" text-anchor="middle">Service</text>
  <text class="d-sub" x="220" y="160" text-anchor="middle">with signals</text>
  <rect class="d-box-accent" x="300" y="95" width="120" height="100" rx="10"/>
  <text class="d-text d-accent" x="360" y="135" text-anchor="middle">SignalStore</text>
  <text class="d-sub" x="360" y="160" text-anchor="middle">ngrx signals</text>
  <rect class="d-box" x="440" y="95" width="120" height="100" rx="10"/>
  <text class="d-text" x="500" y="135" text-anchor="middle">NGXS, Elf</text>
  <text class="d-sub" x="500" y="160" text-anchor="middle">store libraries</text>
  <rect class="d-box-muted" x="580" y="95" width="120" height="100" rx="10"/>
  <text class="d-text" x="640" y="135" text-anchor="middle">NgRx Store</text>
  <text class="d-sub" x="640" y="160" text-anchor="middle">plus Effects</text>
</svg>

Moving right buys enforced rules, tooling and a common vocabulary across teams, and costs code, indirection and learning time. Most real apps use more than one point on this line: component signals for local state, a store for the shared core.

## 4. The Options in Detail

**Services with signals (no library).** A root [service](/interview-question/what-is-a-service-and-why-use-it) holds a private <code>signal()</code>, exposes read-only [<code>computed()</code>](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls) views and changes state only through methods. It is what Angular itself encourages for most apps, costs nothing in bundle size, and with OnPush-by-default and [zoneless](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18) [change detection](/interview-question/how-does-change-detection-work-in-angular) in Angular 22 it updates the UI precisely. The weakness is that the rules are conventions: nothing stops a teammate from exposing the writable signal. Before signals, the same pattern used a <code>BehaviorSubject</code> with <code>asObservable()</code> (see [Subject vs BehaviorSubject vs ReplaySubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject)).

**NgRx SignalStore.** <code>signalStore(withState(...), withComputed(...), withMethods(...), withHooks(...))</code> builds an injectable store from composable features. The installed 22.0.1 package also exports <code>withProps</code>, <code>withLinkedState</code>, <code>signalMethod</code>, <code>withEntities</code> (from <code>@ngrx/signals/entities</code>), <code>rxMethod</code> (from <code>@ngrx/signals/rxjs-interop</code>, the SignalStore counterpart of [toSignal() and toObservable()](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs)) and an events plugin (<code>@ngrx/signals/events</code>). State is **protected by default**: outside code can read the signals but cannot <code>patchState</code> the store. SignalStore reached a stable release in NgRx 18 (source: <a href="https://angularindepth.com/article/episode-24-30-signal-store-release-typescript-node-js-mark-thompson-on/" target="_blank" rel="noopener noreferrer">Angular In Depth</a>), and the events plugin was promoted to stable in NgRx 21 after debuting as experimental in 19.2 (source: the <a href="https://dev.to/ngrx/announcing-ngrx-21-celebrating-a-10-year-journey-with-a-fresh-new-look-and-ngrxsignalsevents-5ekp" target="_blank" rel="noopener noreferrer">NgRx 21 announcement</a>). In the installed 22.0.1 typings only the <code>@ngrx/signals/resource</code> entry point is still tagged <code>@experimental</code>.

**NgRx Store + Effects.** The full Redux pattern: actions describe events, pure reducers produce new immutable state, memoized selectors read it, and effects run side effects. You get an action log, DevTools time travel and strict runtime checks, at the price of the most code. It shines when many teams touch the same state and when complex async workflows need one place to live. See [what NgRx is](/interview-question/what-is-ngrx) and [the role of NgRx Effects](/interview-question/what-is-the-role-of-ngrx-effects-and-why-do-we-separate-side-effects-from-reduce).

**NGXS.** Also Redux-style (actions and a single store), but state, action handlers and selectors live in decorated classes (<code>@State</code>, <code>@Action</code>, <code>@Selector</code>), which many teams find closer to normal Angular services. The package is <code>@ngxs/store</code>; the unscoped <code>ngxs</code> package on npm is deprecated with a note that it was renamed (source: <a href="https://www.npmjs.com/package/ngxs" target="_blank" rel="noopener noreferrer">ngxs on npm</a>). It was not installed or run for this doc.

**Elf.** A small, RxJS-based store from the former Akita authors, with plugins for entities, requests and persistence. Not installed or run here either; the comparison above is from its public documentation.

**Server state: <code>resource()</code>, <code>httpResource()</code> and TanStack Query.** Much of what used to live in a global store is really cached server data. Angular now has signal-based tools for it: in the installed 22.2.3 typings, <code>resource()</code> (in <code>@angular/core</code>) and <code>httpResource()</code> (in <code>@angular/common/http</code>) are both tagged <code>@publicApi 22.0</code>, meaning stable as of v22. TanStack Query has an Angular adapter, but its package is still <code>@tanstack/angular-query-experimental</code> and its docs warn that breaking changes can land in minor and patch releases (source: <a href="https://tanstack.com/query/latest/docs/framework/angular/installation.md" target="_blank" rel="noopener noreferrer">TanStack Query Angular docs</a>).

## 5. How to Decide

1. **Separate the three kinds of state.** Keep local state in components; move server data to resources or a query library; count what is left.
2. **Start with services and signals** for the remaining shared state. Promote a feature to a **SignalStore** when it grows methods, derived state and async loading that benefit from a standard shape and protected state.
3. **Adopt the NgRx Store** when several of these are true: many features react to the same events, several teams need one enforced pattern, you want an action log and time-travel debugging, and async flows are complex enough to justify effects.
4. **Pick NGXS or Elf** mainly for team preference or an existing codebase (Elf for Akita migrations), not because they can do something the others cannot.
5. **Be consistent.** Two state libraries in one app is almost always worse than either one alone. Sharing state between unrelated components is covered in [passing data between sibling components](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-).

## 6. Verified: the same feature, two ways

The two examples implement one todo feature: a list, a filter, a derived open count and a toggle.

**A root service with signals** (runnable). A badge component and the main component inject the same instance. Compiled with <code>ngc</code> (strict templates), run in jsdom; root text content, so elements run together:

\`\`\`
[app] RENDERED: Badge sees 1 openFilter: all[x] Write reducer[ ] Write effect
toggled #2         : Badge sees 0 openFilter: all[x] Write reducer[x] Write effect
toggled #1, filter : Badge sees 1 openFilter: open[ ] Write reducer
\`\`\`

The badge, a separate component, updated on every toggle: one shared signal, no library. Both components got the same instance because the service is <code>providedIn: "root"</code> (see [providing in root vs in a component](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component)).

**An NgRx SignalStore** (<code>runnable: false</code>, the playground cannot provide <code>@ngrx/signals</code>). It also loads the list asynchronously with <code>rxMethod</code> from an <code>onInit</code> hook, with a fake 200 ms request:

\`\`\`
[app] RENDERED: Filter: allloading...
loaded        : Filter: all1 open[x] Write reducer[ ] Write effect
toggled #2    : Filter: all0 open[x] Write reducer[x] Write effect
toggled #1, filter open: Filter: open1 open[ ] Write reducer
\`\`\`

Same behaviour, plus a loading state, in a standard shape. The difference shows when someone breaks the rules. Adding <code>patchState(this.store, { filter: "open" })</code> to the **component** failed AOT compilation:

\`\`\`
error TS2345: Argument of type '{ todos: Signal<Todo[]>; ... } & StateSource<...>' is not assignable to parameter of type 'WritableStateSource<{ todos: Todo[]; filter: "all" | "open"; loading: boolean; }>'.
  The types of '[STATE_SOURCE].todos' are incompatible between these types.
    Type 'Signal<Todo[]>' is missing the following properties from type 'WritableSignal<Todo[]>': set, update, asReadonly, [ɵWRITABLE_SIGNAL]
\`\`\`

(The long inferred type in the first line is shortened here.) That is protected state: the store's own methods can write, outside code cannot. In the plain service the same guarantee exists only because the signal was declared <code>private</code>.

## 7. Common Pitfalls

- **Choosing a library before classifying the state.** Most global stores fill up with cached server data and local UI flags that never needed a store.
- **Global store for everything.** Form drafts and open panels in the NgRx Store add actions, reducers and selectors for state nobody else reads.
- **No rules in the "no library" option.** Exposing writable signals or subjects from services recreates the fridge-calendar problem; keep writes private and behind methods.
- **Mixing paradigms per developer.** One feature in NgRx Store, one in NGXS, one in services makes onboarding and debugging harder than any single choice.
- **Treating server state as client state.** Hand-rolled loading flags, caching and refetching in a reducer are exactly what <code>httpResource()</code> or a query library already does.
- **Picking an abandoned or experimental tool for a long-lived app** without checking: Akita now points to Elf, and the TanStack Angular adapter is still labelled experimental.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it first:</strong> <span style="color:#f0e2c8;">"I separate local UI state, shared client state and server state. Local stays in component signals, server data goes to a resource or query tool, and only the shared rest needs a store."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The lightweight end:</strong> <span style="color:#f0e2c8;">"For many apps a root service with a private signal, computed views and methods is enough, with no dependency. The NgRx SignalStore adds a standard composable shape and protected state."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The structured end:</strong> <span style="color:#f0e2c8;">"The NgRx Store with Effects is the full Redux pattern: actions, pure reducers, selectors, DevTools. It pays off with many teams and complex event-driven flows, at the cost of the most code."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The others:</strong> <span style="color:#f0e2c8;">"NGXS is Redux-style with decorated classes; Elf is the RxJS-based successor the Akita team recommends. I would pick them for team fit, not capability."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Decision:</strong> <span style="color:#f0e2c8;">"I start simple and promote features when they need it, and I keep one approach per app. I checked that SignalStore state really is protected: patching it from a component fails compilation."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Signals make NgRx unnecessary, right?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signals replace the need for a library in many apps, because a service with signals is reactive and precise. But they do not give you an action log, time travel, enforced one-way flow or a shared pattern across teams. NgRx itself now ships <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selectSignal</code> and the SignalStore, so the two are complementary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">SignalStore or NgRx Store for a new feature?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SignalStore for feature or domain state that is mostly read and updated by that feature. The classic Store when many features react to the same events or when the team wants an auditable action log. They can coexist, but I would set a team rule for which to use where.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does server data belong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ideally in a tool built for caching and status: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpResource()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resource()</code>, which are stable in Angular 22 according to the typings, or TanStack Query, whose Angular adapter is still experimental. Putting it in a reducer means re-implementing loading, error and refresh logic by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is protected state in a SignalStore?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By default only the store's own methods can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchState</code>. Outside code sees read-only signals; I verified that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchState(store, ...)</code> from a component fails with a TS2345 error because the store is not a WritableStateSource.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate an Akita app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Akita's npm page recommends Elf as its successor, and Elf keeps an RxJS-based store model, so that is the lowest-friction path. If the app is moving to signals anyway, SignalStore or signal services are worth considering instead.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | Data that changes over time and that the UI depends on |
| **Local / shared / server state** | One component, many features, or a cached copy of server data |
| **Single source of truth** | One owner and one way to change each piece of shared state |
| **Signal service** | Injectable with a private signal, computed views and methods |
| **SignalStore** | NgRx signal-based store built from features like withState and withMethods |
| **Protected state** | SignalStore default: only the store itself can patch its state |
| **NGXS** | Redux-style library using decorated classes |
| **Elf** | RxJS-based store library, the successor recommended by Akita |
| **resource / httpResource** | Angular signal-based async and HTTP data, stable in v22 |

---
**Conclusion:** Angular state management is a spectrum, not a single choice: signals in components for local state, a service with signals or an NgRx SignalStore for most shared client state, the NgRx Store with Effects when many teams and event-driven flows justify a full Redux ledger, NGXS or Elf mainly for team fit, and <code>resource()</code> / <code>httpResource()</code> (stable in v22 per the installed typings) or TanStack Query for server data. The verified examples show the trade-off concretely: the plain service shared state between components with no dependency, while the SignalStore added a standard shape, async loading and compile-time protection against outside writes. Classify the state first, start as simple as the problem allows, and keep one approach per app.`,
    examples: [
      {
        label: "The no-library option: a root service with a private signal and read-only computed views",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, computed, inject, signal } from "@angular/core";

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

// The "no library" option: an injectable service with a private writable signal,
// public read-only views, and methods as the only way to change state.
@Injectable({ providedIn: "root" })
export class TodoService {
  private readonly state = signal({
    todos: [
      { id: 1, title: "Write reducer", done: true },
      { id: 2, title: "Write effect", done: false },
    ] as Todo[],
    filter: "all" as "all" | "open",
  });

  readonly filter = computed(() => this.state().filter);
  readonly visible = computed(() => {
    const { todos, filter } = this.state();
    return filter === "open" ? todos.filter((t) => !t.done) : todos;
  });
  readonly openCount = computed(() => this.state().todos.filter((t) => !t.done).length);

  toggle(id: number) {
    this.state.update((s) => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  }
  setFilter(filter: "all" | "open") {
    this.state.update((s) => ({ ...s, filter }));
  }
}

@Component({
  selector: "app-counter-badge",
  template: \`<span>Badge sees {{ todos.openCount() }} open</span>\`,
})
export class CounterBadge {
  // A second component injects the SAME root instance, so the state is shared.
  todos = inject(TodoService);
}

@Component({
  selector: "app-root",
  imports: [CounterBadge],
  template: \`
    <app-counter-badge />
    <button (click)="todos.setFilter(todos.filter() === 'all' ? 'open' : 'all')">Filter: {{ todos.filter() }}</button>
    <ul>
      @for (t of todos.visible(); track t.id) {
        <li (click)="todos.toggle(t.id)">{{ t.done ? "[x]" : "[ ]" }} {{ t.title }}</li>
      }
    </ul>
  \`,
})
export class AppComponent {
  todos = inject(TodoService);
}`,
      },
      {
        label: "The same todo feature as an NgRx SignalStore with withState, withComputed, withMethods and rxMethod",
        tech: "angular",
        runnable: false,
        code: `import { Component, computed, inject } from "@angular/core";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { Observable, delay, of, pipe, switchMap, tap } from "rxjs";

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

// Stands in for HttpClient.
function fetchTodos(): Observable<Todo[]> {
  return of([
    { id: 1, title: "Write reducer", done: true },
    { id: 2, title: "Write effect", done: false },
  ]).pipe(delay(200));
}

// A SignalStore: state, derived state and methods in one injectable, built from features.
export const TodoStore = signalStore(
  { providedIn: "root" },
  withState({ todos: [] as Todo[], filter: "all" as "all" | "open", loading: false }),
  withComputed(({ todos, filter }) => ({
    visible: computed(() => (filter() === "open" ? todos().filter((t) => !t.done) : todos())),
    openCount: computed(() => todos().filter((t) => !t.done).length),
  })),
  withMethods((store) => ({
    toggle(id: number) {
      // patchState is the only way to write: the state signals are read-only outside the store.
      patchState(store, { todos: store.todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
    },
    setFilter(filter: "all" | "open") {
      patchState(store, { filter });
    },
    // rxMethod: an RxJS pipeline you can call like a function (here with no argument).
    load: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => fetchTodos()),
        tap((todos) => patchState(store, { todos, loading: false })),
      ),
    ),
  })),
  withHooks({
    onInit(store) {
      store.load();
    },
  }),
);

@Component({
  selector: "app-root",
  template: \`
    <button (click)="store.setFilter(store.filter() === 'all' ? 'open' : 'all')">Filter: {{ store.filter() }}</button>
    <p>{{ store.loading() ? "loading..." : store.openCount() + " open" }}</p>
    <ul>
      @for (t of store.visible(); track t.id) {
        <li (click)="store.toggle(t.id)">{{ t.done ? "[x]" : "[ ]" }} {{ t.title }}</li>
      }
    </ul>
  \`,
})
export class AppComponent {
  store = inject(TodoStore);
}`,
      },
    ],
  },
];

export default augments;
