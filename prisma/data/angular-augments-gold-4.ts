/**
 * Angular Phase 1 — Batch 4 (RxJS & async / HTTP). Gold-standard rewrites.
 * Conventions as in angular-augments-gold-1.ts.
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between Observables and Promises?",
    answer: `**Core concept.** A **Promise** represents a **single** future value, is **eager** (runs immediately), and can't be cancelled. An **Observable** is a **stream of 0..n values over time**, is **lazy** (nothing happens until you subscribe), is **cancellable** (unsubscribe), and comes with composable **operators**. Angular's <code>HttpClient</code> and many APIs return Observables.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Promise emits one value; Observable emits a stream over time'>
  <rect class='d-box' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>Promise</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>one value, eager</text>
  <text class='d-sub' x='120' y='96' text-anchor='middle'>not cancelable</text>
  <text class='d-sub' x='120' y='114' text-anchor='middle'>.then / await</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>Observable</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>0..n values, lazy</text>
  <text class='d-sub' x='340' y='96' text-anchor='middle'>cancelable + operators</text>
  <text class='d-sub' x='340' y='114' text-anchor='middle'>.subscribe()</text>
</svg>

**How it works.** A Promise starts its work the moment it's created and resolves once with a value (or rejects). An Observable is a **blueprint**: the producer function runs only when something subscribes, and it can emit many values (a click stream, a WebSocket, progress events) until it completes or errors. Because it's lazy and cancellable, unsubscribing stops the work (e.g. aborting an in-flight request) — crucial for avoiding leaks. RxJS **operators** (<code>map</code>, <code>filter</code>, <code>debounceTime</code>, <code>switchMap</code>) let you transform/compose streams declaratively. You can convert between them (<code>firstValueFrom(obs)</code>, <code>from(promise)</code>). In Angular, prefer Observables for HTTP/events and consume them with the <code>async</code> pipe.

### Observable vs Promise
| | Promise | Observable |
| --- | --- | --- |
| Values | one | many (stream) |
| Execution | eager | lazy (on subscribe) |
| Cancel | no | yes (unsubscribe) |
| Operators | no (chains <code>.then</code>) | rich (map/filter/…) |

> **Interview tip:** "Promise = one eager, non-cancelable value; Observable = lazy, cancelable stream with operators." Mention Angular HTTP returns Observables and the <code>async</code> pipe consumes them.`,
    examples: [
      {
        label: "One value vs a stream",
        tech: "angular",
        runnable: false,
        code: `import { Observable, interval, map, take } from 'rxjs';

// Promise — runs now, resolves once
const p: Promise<number> = Promise.resolve(42);
p.then(v => console.log('promise:', v));

// Observable — lazy until subscribe, emits a stream, cancelable
const stream$: Observable<number> = interval(1000).pipe(
  map(n => n * 10),
  take(3),                                  // 0, 10, 20 then complete
);
const sub = stream$.subscribe(v => console.log('observable:', v));
// sub.unsubscribe();  // cancels the work`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between Subject, BehaviorSubject, and ReplaySubject?",
    answer: `**Core concept.** All three are **Subjects** — observables you can also push values into, and they **multicast** to many subscribers. They differ in what a **new subscriber** receives: a plain <code>Subject</code> gets only **future** values; a <code>BehaviorSubject</code> gets the **current/last** value immediately (and needs an initial value); a <code>ReplaySubject</code> gets the **last N** values replayed.

<svg class='iq-diagram' viewBox='0 0 460 165' role='img' aria-label='Subject emits future only; BehaviorSubject emits current; ReplaySubject replays N'>
  <rect class='d-box-accent' x='14' y='34' width='140' height='104' rx='10'/>
  <text class='d-text' x='84' y='58' text-anchor='middle'>Subject</text>
  <text class='d-sub' x='84' y='82' text-anchor='middle'>future values only</text>
  <text class='d-sub' x='84' y='100' text-anchor='middle'>no initial</text>
  <text class='d-sub' x='84' y='118' text-anchor='middle'>event bus</text>
  <rect class='d-box' x='162' y='34' width='140' height='104' rx='10'/>
  <text class='d-text' x='232' y='58' text-anchor='middle'>BehaviorSubject</text>
  <text class='d-sub' x='232' y='82' text-anchor='middle'>emits current value</text>
  <text class='d-sub' x='232' y='100' text-anchor='middle'>needs initial</text>
  <text class='d-sub' x='232' y='118' text-anchor='middle'>shared state</text>
  <rect class='d-box' x='310' y='34' width='140' height='104' rx='10'/>
  <text class='d-text' x='380' y='58' text-anchor='middle'>ReplaySubject</text>
  <text class='d-sub' x='380' y='82' text-anchor='middle'>replays last N</text>
  <text class='d-sub' x='380' y='100' text-anchor='middle'>buffer/history</text>
</svg>

**How it works.** A Subject is both an observer and an observable: you call <code>subject.next(v)</code> to emit, and any subscriber receives values from that point on — so a late subscriber **misses** earlier emissions (good for an event bus). A <code>BehaviorSubject</code> remembers the latest value and immediately hands it to each new subscriber, which makes it the go-to for **shared state** in a service (a component subscribing later still gets the current value, and <code>.value</code> reads it synchronously). A <code>ReplaySubject(n)</code> buffers and replays the last <code>n</code> emissions (optionally within a time window) — useful when subscribers need recent history, not just the latest. (<code>AsyncSubject</code> emits only the final value on complete.)

### Subject variants
| | <code>Subject</code> | <code>BehaviorSubject</code> | <code>ReplaySubject</code> |
| --- | --- | --- | --- |
| New subscriber gets | future only | current value | last N |
| Initial value | none | required | none |
| Read current | no | <code>.value</code> | no |
| Typical use | event bus | shared state | history/cache |

> **Interview tip:** "All multicast; differ on what a late subscriber gets — Subject: future only; BehaviorSubject: current (needs initial, has <code>.value</code>); ReplaySubject: last N." BehaviorSubject is the usual choice for shared state in a service.`,
    examples: [
      {
        label: "Late subscriber behaviour",
        tech: "angular",
        runnable: false,
        code: `import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs';

const s = new Subject<number>();
const b = new BehaviorSubject<number>(0);   // initial value
const r = new ReplaySubject<number>(2);     // buffer last 2

s.next(1); b.next(1); r.next(1); r.next(2);

s.subscribe(v => console.log('subject:', v));   // (nothing — missed 1)
b.subscribe(v => console.log('behavior:', v));  // 1  (current value)
r.subscribe(v => console.log('replay:', v));    // 1, 2  (last two)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between switchMap, mergeMap, concatMap, and exhaustMap?",
    answer: `**Core concept.** All four are **higher-order mapping** operators: they map each source value to an **inner observable** and flatten the results. They differ in how they handle a **new** source value while a previous inner observable is still running: <code>switchMap</code> cancels the old one, <code>mergeMap</code> runs them concurrently, <code>concatMap</code> queues them, and <code>exhaustMap</code> ignores new ones until the current finishes.

<svg class='iq-diagram' viewBox='0 0 460 165' role='img' aria-label='switchMap cancels, mergeMap concurrent, concatMap queues, exhaustMap ignores'>
  <rect class='d-box-accent' x='14' y='34' width='140' height='104' rx='10'/>
  <text class='d-text' x='84' y='58' text-anchor='middle'>switchMap</text>
  <text class='d-sub' x='84' y='82' text-anchor='middle'>cancel previous</text>
  <text class='d-sub' x='84' y='100' text-anchor='middle'>keep latest</text>
  <text class='d-sub' x='84' y='118' text-anchor='middle'>typeahead/search</text>
  <rect class='d-box' x='162' y='34' width='140' height='104' rx='10'/>
  <text class='d-text' x='232' y='58' text-anchor='middle'>mergeMap</text>
  <text class='d-sub' x='232' y='82' text-anchor='middle'>run all at once</text>
  <text class='d-sub' x='232' y='100' text-anchor='middle'>concurrent</text>
  <text class='d-sub' x='232' y='118' text-anchor='middle'>parallel writes</text>
  <rect class='d-box' x='310' y='34' width='140' height='104' rx='10'/>
  <text class='d-text' x='380' y='58' text-anchor='middle'>concat / exhaust</text>
  <text class='d-sub' x='380' y='82' text-anchor='middle'>queue / ignore-new</text>
  <text class='d-sub' x='380' y='100' text-anchor='middle'>order / dedupe</text>
  <text class='d-sub' x='380' y='118' text-anchor='middle'>sequence / submit</text>
</svg>

**How it works.** The choice is about **overlap strategy**. <code>switchMap</code> unsubscribes from the prior inner observable when a new source value arrives — so only the **latest** matters, perfect for type-ahead search (cancel the stale request). <code>mergeMap</code> (alias <code>flatMap</code>) keeps **all** inner observables alive concurrently — use when order doesn't matter and you want parallelism (firing independent writes). <code>concatMap</code> processes them **one at a time in order**, waiting for each to complete — use when sequence matters. <code>exhaustMap</code> **ignores** new source values while an inner observable is active — ideal for preventing duplicate submits (rapid button clicks / login). Picking the wrong one causes classic bugs: race conditions (should've been <code>switchMap</code>), out-of-order results (needed <code>concatMap</code>), or double-submits (needed <code>exhaustMap</code>).

### Flattening operators
| Operator | On a new value | Use for |
| --- | --- | --- |
| <code>switchMap</code> | cancel previous | search/typeahead |
| <code>mergeMap</code> | run concurrently | independent parallel work |
| <code>concatMap</code> | queue in order | ordered sequences |
| <code>exhaustMap</code> | ignore until done | prevent double-submit |

> **Interview tip:** Map each to a scenario: <code>switchMap</code> = typeahead (cancel stale), <code>mergeMap</code> = parallel, <code>concatMap</code> = ordered, <code>exhaustMap</code> = login/submit (ignore extra clicks).`,
    examples: [
      {
        label: "switchMap for a search box",
        tech: "angular",
        runnable: false,
        code: `import { fromEvent, switchMap, debounceTime, map } from 'rxjs';
// import { ajax } from 'rxjs/ajax';  // (illustrative)

const input = document.querySelector('input')!;

const results$ = fromEvent(input, 'input').pipe(
  map((e: any) => e.target.value),
  debounceTime(300),
  // cancel the previous request when a new keystroke arrives
  switchMap(term => fetch('/search?q=' + term).then(r => r.json())),
);

results$.subscribe(r => console.log('latest results only:', r));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the async pipe and why is it useful?",
    answer: `**Core concept.** The <code>async</code> pipe subscribes to an **Observable** (or Promise) directly in the template, returns its **latest value**, and — crucially — **automatically unsubscribes** when the component is destroyed. It removes manual <code>subscribe</code>/<code>unsubscribe</code> boilerplate and the memory leaks that come from forgetting to clean up.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='async pipe subscribes, renders latest value, and auto-unsubscribes'>
  <rect class='d-box-accent' x='30' y='44' width='170' height='62' rx='10'/>
  <text class='d-text' x='115' y='70' text-anchor='middle'>data$ | async</text>
  <text class='d-sub' x='115' y='90' text-anchor='middle'>subscribe + render</text>
  <defs><marker id='ah-ap' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='200' y1='75' x2='258' y2='75' marker-end='url(#ah-ap)'/>
  <rect class='d-box' x='260' y='44' width='170' height='62' rx='10'/>
  <text class='d-text' x='345' y='70' text-anchor='middle'>auto-unsubscribe</text>
  <text class='d-sub' x='345' y='90' text-anchor='middle'>on destroy → no leak</text>
</svg>

**How it works.** Instead of subscribing in the class, storing the value, and unsubscribing in <code>ngOnDestroy</code>, you bind the stream straight in the template: <code>{{ data$ | async }}</code> or <code>*ngIf="user$ | async as user"</code>. The pipe subscribes when the view renders, marks the component for check on each emission (so it works smoothly with <code>OnPush</code>), and unsubscribes automatically on destroy. This makes templates the natural place to consume async data, keeps components free of subscription bookkeeping, and prevents the most common Angular leak. A useful pattern is <code>*ngIf="obs$ | async as value"</code> to both unwrap and guard the value, and to subscribe once even if used multiple times.

### Why the async pipe
| Benefit | Detail |
| --- | --- |
| auto-subscribe | binds the stream in the template |
| auto-unsubscribe | on destroy → no leaks |
| OnPush-friendly | marks for check on emit |
| cleaner code | no manual subscription state |

> **Interview tip:** "Subscribes in the template, renders the latest value, and **auto-unsubscribes** on destroy — no manual cleanup." Mention the <code>*ngIf="x$ | async as x"</code> unwrap-and-guard pattern and OnPush compatibility.`,
    examples: [
      {
        label: "Consume a stream with no manual subscription",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { interval, map } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <!-- subscribes + auto-unsubscribes; no ngOnDestroy needed -->
    <p>Seconds: {{ seconds$ | async }}</p>
    <p *ngIf="seconds$ | async as s">unwrapped: {{ s }}</p>
  \`,
})
export class AppComponent {
  seconds$ = interval(1000).pipe(map(n => n + 1));
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you avoid memory leaks from subscriptions?",
    answer: `**Core concept.** An RxJS subscription keeps running until it completes or you unsubscribe — so a subscription created in a component that **isn't closed** keeps firing (and holding references) after the component is destroyed: a leak. Avoid it by preferring the **<code>async</code> pipe**, or by tearing subscriptions down on destroy with <code>takeUntilDestroyed()</code> / a <code>takeUntil(destroy$)</code> pattern.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Unclosed subscriptions leak; close them on destroy'>
  <rect class='d-box' x='20' y='44' width='200' height='62' rx='10'/>
  <text class='d-text' x='120' y='70' text-anchor='middle'>no teardown</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>runs after destroy → leak</text>
  <rect class='d-box-accent' x='250' y='44' width='190' height='62' rx='10'/>
  <text class='d-text' x='345' y='70' text-anchor='middle'>takeUntilDestroyed / async</text>
  <text class='d-sub' x='345' y='90' text-anchor='middle'>auto cleanup → safe</text>
</svg>

**How it works.** The cleanest fix is to **not subscribe in the class at all** — use the <code>async</code> pipe, which unsubscribes automatically. When you must subscribe imperatively, close it when the component is destroyed: the modern approach is <code>source$.pipe(takeUntilDestroyed())</code> (Angular 16+, ties cleanup to the injection context), or the classic <code>private destroy$ = new Subject(); source$.pipe(takeUntil(this.destroy$))</code> with <code>this.destroy$.next(); this.destroy$.complete()</code> in <code>ngOnDestroy</code>. You can also store the <code>Subscription</code> and call <code>unsubscribe()</code> in <code>ngOnDestroy</code> (group several into one). Note: streams that **complete** on their own (a single HTTP call) don't leak — it's the long-lived ones (intervals, event streams, <code>BehaviorSubject</code>s) that need teardown.

### Cleanup techniques
| Technique | Notes |
| --- | --- |
| <code>async</code> pipe | best — auto-unsubscribe |
| <code>takeUntilDestroyed()</code> | modern (Angular 16+) |
| <code>takeUntil(destroy$)</code> | classic, complete in <code>ngOnDestroy</code> |
| store + <code>unsubscribe()</code> | manual, group subscriptions |

> **Interview tip:** "Prefer the <code>async</code> pipe; otherwise <code>takeUntilDestroyed()</code> or <code>takeUntil(destroy$)</code> in <code>ngOnDestroy</code>." Note self-completing streams (one HTTP call) don't leak — long-lived ones do.`,
    examples: [
      {
        label: "takeUntilDestroyed for a long-lived stream",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({ selector: 'app-root', standalone: true, template: '{{ n }}' })
export class AppComponent {
  n = 0;
  constructor() {
    // auto-unsubscribes when this component is destroyed → no leak
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(v => (this.n = v));
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is an HTTP interceptor?",
    answer: `**Core concept.** An HTTP interceptor sits in <code>HttpClient</code>'s pipeline and can inspect or modify **every** outgoing request and incoming response. It's the central place for cross-cutting HTTP concerns: attaching auth tokens, logging, setting headers, handling errors, retrying, caching, and showing loading indicators.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Interceptor sits between HttpClient and the server'>
  <rect class='d-box' x='14' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='69' y='79' text-anchor='middle'>HttpClient</text>
  <defs><marker id='ah-hi' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='124' y1='75' x2='160' y2='75' marker-end='url(#ah-hi)'/>
  <rect class='d-box-accent' x='162' y='52' width='136' height='46' rx='10'/>
  <text class='d-text' x='230' y='73' text-anchor='middle'>Interceptor</text>
  <text class='d-sub' x='230' y='90' text-anchor='middle'>add header / log / retry</text>
  <line class='d-edge' x1='298' y1='75' x2='334' y2='75' marker-end='url(#ah-hi)'/>
  <rect class='d-box' x='336' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='391' y='79' text-anchor='middle'>Server</text>
</svg>

**How it works.** You register interceptors and they form a chain: each one receives the request, can clone-and-modify it (requests are **immutable**, so you do <code>req.clone({ setHeaders: … })</code>), then calls <code>next.handle(req)</code> to pass it along, and can also transform the returned response Observable. In modern Angular you write **functional interceptors** — <code>(req, next) =&gt; next(req)</code> — registered via <code>provideHttpClient(withInterceptors([authInterceptor]))</code>; classic class-based interceptors implement <code>HttpInterceptor</code> and are provided with the <code>HTTP_INTERCEPTORS</code> multi-token. Because they run for every request, interceptors keep concerns like auth and error handling in one place instead of scattered across services.

### Interceptor uses
| Concern | What it does |
| --- | --- |
| auth | attach a token header |
| logging | log requests/responses |
| errors | catch + transform globally |
| retry / cache | resilience / performance |

> **Interview tip:** "Middleware for <code>HttpClient</code> — intercepts every request/response for auth, logging, errors, retries." Note requests are immutable (<code>req.clone</code>), and modern Angular uses **functional interceptors** via <code>withInterceptors</code>.`,
    examples: [
      {
        label: "A functional auth interceptor",
        tech: "angular",
        runnable: false,
        code: `import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  // requests are immutable → clone with the extra header
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : req;
  return next(authReq);
};

// register:  provideHttpClient(withInterceptors([authInterceptor]))`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle errors and retries globally with interceptors?",
    answer: `**Core concept.** Put cross-cutting HTTP resilience in an interceptor: pipe the response through <code>retry</code> (re-attempt **transient** failures) and <code>catchError</code> (handle/transform errors once, centrally) — e.g. retry network errors a couple of times, log, redirect to login on <code>401</code>, and surface a friendly message. This avoids repeating error handling in every service.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Interceptor retries transient errors then catches the rest'>
  <rect class='d-box' x='20' y='52' width='130' height='46' rx='10'/>
  <text class='d-text' x='85' y='73' text-anchor='middle'>request</text>
  <text class='d-sub' x='85' y='90' text-anchor='middle'>fails (5xx/network)</text>
  <defs><marker id='ah-er' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='150' y1='75' x2='184' y2='75' marker-end='url(#ah-er)'/>
  <rect class='d-box-accent' x='186' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='241' y='73' text-anchor='middle'>retry(n)</text>
  <text class='d-sub' x='241' y='90' text-anchor='middle'>transient</text>
  <line class='d-edge' x1='296' y1='75' x2='330' y2='75' marker-end='url(#ah-er)'/>
  <rect class='d-box' x='332' y='52' width='114' height='46' rx='10'/>
  <text class='d-text' x='389' y='73' text-anchor='middle'>catchError</text>
  <text class='d-sub' x='389' y='90' text-anchor='middle'>handle / 401</text>
</svg>

**How it works.** Inside the interceptor you transform the response stream: <code>next(req).pipe(retry({ count: 2, delay: 1000 }), catchError(err => …))</code>. <code>retry</code> re-subscribes on failure — keep it to **idempotent**, transient cases (network blips, 5xx) and prefer a backoff delay; don't blindly retry 4xx. <code>catchError</code> is the single place to branch on <code>err.status</code>: redirect to login on <code>401</code>, show a toast, log to a monitoring service, and re-throw (or return a fallback) so callers still behave correctly. Because this lives in one interceptor, every request gets consistent resilience and error UX without each service repeating <code>try/catch</code>. Combine with a loading interceptor for spinners.

### Global error/retry pieces
| Operator | Role |
| --- | --- |
| <code>retry({count, delay})</code> | re-attempt transient failures |
| <code>catchError</code> | handle/transform once, centrally |
| branch on <code>err.status</code> | 401 → login, 5xx → toast |
| re-throw / fallback | keep callers correct |

> **Interview tip:** "Interceptor + <code>retry</code> (transient, with backoff) + <code>catchError</code> (central handling — 401 redirect, logging, toast)." Caution: only retry idempotent/transient failures, not all 4xx.`,
    examples: [
      {
        label: "Global retry + error interceptor",
        tech: "angular",
        runnable: false,
        code: `import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({ count: 2, delay: 1000 }),       // transient failures only
    catchError(err => {
      if (err.status === 401) location.href = '/login';
      console.error('HTTP error', err.status);
      return throwError(() => err);          // re-throw for the caller
    }),
  );`,
      },
    ],
  },
];

export default augments;
