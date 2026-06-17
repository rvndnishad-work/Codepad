import type { AngularAugment } from "./angular-augments.types";

/**
 * Angular augments — batch 3 (final: compilation, RxJS, DI recipes, forms, perf).
 * Same conventions as batches 1-2.
 */
const augments: AngularAugment[] = [
  {
    title: "What is the difference between AOT and JIT compilation?",
    answer:
      "## AOT vs JIT\n\n" +
      "Angular templates must be compiled to JavaScript. **When** that happens is the difference:\n\n" +
      "| | JIT (Just-in-Time) | AOT (Ahead-of-Time) |\n" +
      "|---|---|---|\n" +
      "| Compiles | in the browser, at runtime | at build time |\n" +
      "| Bundle | ships the Angular compiler | no compiler -> smaller |\n" +
      "| Startup | slower (compile on load) | faster (already compiled) |\n" +
      "| Template errors | found at runtime | found at build |\n" +
      "| Security | runtime eval of templates | safer (no client-side template eval) |\n\n" +
      "**AOT is the default for production** (and dev, in modern Angular via the Ivy compiler).\n\n" +
      "**Interview tip:** AOT = **compile at build time** -> faster startup, smaller bundle (no compiler shipped), template errors caught early, and better security. JIT compiles in the browser (historically handy for some dev/dynamic scenarios). Modern Angular uses AOT everywhere; this question is mostly about understanding the trade-off.",
  },
  {
    title: "What is the difference between Observables and Promises?",
    answer:
      "## Observables vs Promises\n\n" +
      "| | Promise | Observable (RxJS) |\n" +
      "|---|---|---|\n" +
      "| Values | a single value | a stream (0..many over time) |\n" +
      "| Execution | eager (runs immediately) | lazy (runs on `subscribe`) |\n" +
      "| Cancelable | no | yes (`unsubscribe`) |\n" +
      "| Operators | `.then` chaining | rich operators (`map`, `filter`, `switchMap`...) |\n" +
      "| Reusable | settles once | re-subscribe re-runs it |\n\n" +
      "Angular's `HttpClient`, router events, reactive forms, and `EventEmitter` are all **Observable**-based.\n\n" +
      "**Interview tip:** the four words that nail it: **single vs stream, eager vs lazy, not-cancelable vs cancelable, and operators.** Observables are lazy (nothing happens until `subscribe`) and composable, which is why Angular leans on RxJS. You can `firstValueFrom(obs$)` to bridge an Observable to a Promise.",
    examples: [
      {
        label: "Promise vs Observable behavior",
        tech: "angular",
        runnable: false,
        code: `import { interval } from 'rxjs';

// Promise: eager, resolves to a SINGLE value, cannot be cancelled.
const p = new Promise<number>((resolve) => resolve(42));
p.then((v) => console.log('promise', v));

// Observable: LAZY (runs on subscribe), emits MANY values, cancelable.
const sub = interval(1000).subscribe((n) => console.log('observable', n));
// sub.unsubscribe();  // <- cancel the stream`,
      },
    ],
  },
  {
    title: "What is the difference between Subject, BehaviorSubject, and ReplaySubject?",
    answer:
      "## Subject variants\n\n" +
      "A **Subject** is both an Observable and an Observer — you can `next()` values into it and many can subscribe (multicast). The variants differ in **what a late subscriber receives**:\n\n" +
      "| Type | Initial value | Late subscriber gets |\n" +
      "|---|---|---|\n" +
      "| `Subject` | none | only values emitted **after** it subscribes |\n" +
      "| `BehaviorSubject` | **required** | the **current/latest** value immediately |\n" +
      "| `ReplaySubject(n)` | none | the **last n** values replayed |\n\n" +
      "**Interview tip:** the deciding factor is **what late subscribers see**. `BehaviorSubject` is the workhorse for **state** (always has a current value, great for a service exposing `value$`). `ReplaySubject` replays a buffer (e.g. last event). Plain `Subject` is a pure event bus with no memory. (`AsyncSubject` emits only the final value on complete.)",
    examples: [
      {
        label: "Late-subscriber behavior (console)",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';
import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-root',
  template: '<p>open the console to compare late-subscriber behavior</p>',
})
export class AppComponent {
  constructor() {
    const s = new Subject<number>();
    s.next(1);                                  // lost: no subscriber yet
    s.subscribe((v) => console.log('Subject:', v));        // (nothing from the past)

    const b = new BehaviorSubject<number>(0);   // needs an initial value
    b.next(1);
    b.subscribe((v) => console.log('BehaviorSubject:', v)); // 1 (latest)

    const r = new ReplaySubject<number>(2);     // buffers last 2
    r.next(1); r.next(2); r.next(3);
    r.subscribe((v) => console.log('ReplaySubject:', v));   // 2, then 3
  }
}`,
      },
    ],
  },
  {
    title: "What is the difference between providing a service in root vs in a component?",
    answer:
      "## providedIn: 'root' vs component providers\n\n" +
      "- **`providedIn: 'root'`** registers the service on the **root injector** -> **one singleton** shared by the entire app (and it's tree-shakable if unused).\n" +
      "- Listing a service in a component's **`providers: [...]`** creates a **new instance per component instance** (shared only with that component's children/view).\n\n" +
      "So the choice is really **shared global state vs isolated per-component state**.\n\n" +
      "**Interview tip:** default to **`providedIn: 'root'`** (singleton, tree-shakable). Use **component-level providers** when each instance needs its **own** copy of the service — e.g. a per-row state holder, or scoping a service's lifetime to a feature/dialog so it's destroyed with it. Same idea at the route level for lazy-feature-scoped singletons.",
    examples: [
      {
        label: "Root singleton vs per-component instance",
        tech: "angular",
        runnable: false,
        code: `import { Injectable, Component } from '@angular/core';

@Injectable({ providedIn: 'root' })   // ONE shared instance for the whole app
export class CartService {}

@Component({
  selector: 'app-widget',
  providers: [CartService],           // a NEW, isolated instance for THIS component
  template: '<p>has its own CartService</p>',
})
export class WidgetComponent {}`,
      },
    ],
  },
  {
    title: "What is the difference between reactive and template-driven forms?",
    answer:
      "## Reactive vs template-driven forms\n\n" +
      "| | Template-driven | Reactive |\n" +
      "|---|---|---|\n" +
      "| Source of truth | the template (`ngModel`) | the component class (`FormControl`/`FormGroup`) |\n" +
      "| Module | `FormsModule` | `ReactiveFormsModule` |\n" +
      "| Setup | quick, less code | explicit, more code |\n" +
      "| Validation | directives in template | functions in the class |\n" +
      "| Testing / dynamic forms | harder | easy (it's just objects) |\n" +
      "| Best for | simple forms | complex / dynamic / heavily-validated forms |\n\n" +
      "**Interview tip:** the core difference is **where the form model lives** — in the template (template-driven, via `ngModel`) or in the class (reactive, via `FormControl`). **Reactive** is preferred for anything non-trivial: synchronous access to the model, easy custom/async validation, dynamic controls (`FormArray`), and testability.",
    examples: [
      {
        label: "The two styles side by side",
        tech: "angular",
        runnable: false,
        code: `// Template-driven (FormsModule): model lives in the template
// <input [(ngModel)]="name" required />

// Reactive (ReactiveFormsModule): model lives in the class
import { FormGroup, FormControl, Validators } from '@angular/forms';

form = new FormGroup({
  name: new FormControl('', Validators.required),
});
// Template: <input [formControl]="form.controls.name" />
// Read instantly: this.form.value.name`,
      },
    ],
  },
  {
    title: "What is the difference between switchMap, mergeMap, concatMap, and exhaustMap?",
    answer:
      "## Higher-order mapping operators\n\n" +
      "All four map each source value to an **inner Observable** and flatten the results — they differ in **how they handle overlap** when a new source value arrives before the previous inner finishes:\n\n" +
      "| Operator | On a new value | Use for |\n" +
      "|---|---|---|\n" +
      "| `switchMap` | **cancel** the previous inner, switch to new | typeahead, latest-wins (route params, search) |\n" +
      "| `mergeMap` | run **all** inners concurrently | independent parallel work |\n" +
      "| `concatMap` | **queue**, run one after another in order | ordered writes, sequential requests |\n" +
      "| `exhaustMap` | **ignore** new values while one is running | prevent double-submit (login button) |\n\n" +
      "**Interview tip:** memorize the one-word behavior — **switch (cancel), merge (parallel), concat (queue), exhaust (ignore).** The classic gotcha: use **`switchMap`** for search/autocomplete (cancel stale requests) and **`exhaustMap`** for a submit button (ignore extra clicks). Using `mergeMap` for search causes race conditions.",
    examples: [
      {
        label: "switchMap cancels the previous inner",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';
import { of, switchMap, delay } from 'rxjs';

@Component({
  selector: 'app-root',
  template: '<p>open the console: only the mapped values arrive, latest-wins</p>',
})
export class AppComponent {
  constructor() {
    of('a', 'b', 'c')
      .pipe(switchMap((x) => of(x + '!').pipe(delay(10)))) // switch to newest inner
      .subscribe((v) => console.log('switchMap ->', v));
  }
}`,
      },
    ],
  },
  {
    title: "What is the difference between the constructor and ngOnInit?",
    answer:
      "## constructor vs ngOnInit\n\n" +
      "- The **constructor** is a TypeScript/class feature — it runs when the class is instantiated. In Angular its job is **dependency injection** (declare `private x: Service`), nothing more. At this point the component's **`@Input()`s are not yet set** and the view doesn't exist.\n" +
      "- **`ngOnInit`** is an Angular lifecycle hook that runs **once, after the first `ngOnChanges`** (so inputs are bound). It's where **initialization logic** belongs — reading inputs, fetching data, setting up state.\n\n" +
      "**Interview tip:** the rule of thumb: **constructor for DI only, `ngOnInit` for initialization.** The concrete reason is timing — **`@Input` values aren't available in the constructor** but are in `ngOnInit`. Also, keeping the constructor side-effect-free makes the component easier to test.",
    examples: [
      {
        label: "Timing: inputs in constructor vs ngOnInit",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<p>open the console to see when the input is available</p>',
})
export class AppComponent implements OnInit {
  @Input() title = 'set later by parent';
  constructor() { console.log('constructor (DI time) -> title:', this.title); }
  ngOnInit() { console.log('ngOnInit (inputs ready) -> title:', this.title); }
}`,
      },
    ],
  },
  {
    title: "What is the difference between useClass, useValue, useFactory, and useExisting?",
    answer:
      "## Provider recipes\n\n" +
      "When you register a provider for a DI token, the recipe decides **how Angular produces the instance**:\n\n" +
      "| Recipe | Provides | Use for |\n" +
      "|---|---|---|\n" +
      "| `useClass` | a (possibly different) class | swap an implementation (real vs mock) |\n" +
      "| `useValue` | a ready-made value/object | config, constants, test mocks |\n" +
      "| `useFactory` | the result of a function (with `deps`) | value computed at runtime |\n" +
      "| `useExisting` | an **alias** to another token | two tokens, the **same** instance |\n\n" +
      "**Interview tip:** the subtle one is **`useExisting` aliases (shares the same singleton)** whereas `useClass` would create a **separate** instance. `useFactory` + `deps` is for when construction needs logic or other injectables; `useValue` is for plain config (often via an `InjectionToken`).",
    examples: [
      {
        label: "The four provider recipes",
        tech: "angular",
        runnable: false,
        code: `import { InjectionToken } from '@angular/core';
const API_URL = new InjectionToken<string>('API_URL');

const providers = [
  // useClass: provide a different implementation for a token
  { provide: Logger, useClass: BetterLogger },

  // useValue: a ready-made value (config / mock)
  { provide: API_URL, useValue: 'https://api.example.com' },

  // useFactory: compute it, with dependencies
  { provide: Logger, useFactory: (cfg: Config) => new Logger(cfg.level), deps: [Config] },

  // useExisting: alias -> resolves to the SAME instance as Logger
  { provide: OldLogger, useExisting: Logger },
];`,
      },
    ],
  },
  {
    title: "What is trackBy in ngFor and why use it?",
    answer:
      "## trackBy\n\n" +
      "By default `*ngFor` tracks list items by **object identity**. If you replace the array (e.g. after an HTTP refresh) with **new objects** that represent the same data, Angular thinks every item is new — it **destroys and recreates every DOM node**, losing element state and hurting performance.\n\n" +
      "A **`trackBy`** function tells Angular how to identify an item (usually by a stable **id**). Then Angular reuses DOM nodes for items whose id is unchanged and only touches what actually changed.\n\n" +
      "**Interview tip:** it's React's 'keys' problem in Angular — **provide a stable identity so the DOM is reused, not rebuilt.** Most impactful on **large or frequently-refreshed lists**. Return a stable unique id from the item (not the index). (Angular's newer `@for` block requires `track` for exactly this reason.)",
    examples: [
      {
        label: "*ngFor with trackBy",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template:
    '<ul><li *ngFor="let u of users; trackBy: trackById">{{ u.name }}</li></ul>' +
    '<button (click)="reload()">reload list</button>',
})
export class AppComponent {
  users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];
  // Identity = id, so unchanged rows keep their DOM nodes across reloads.
  trackById(index: number, u: { id: number }) { return u.id; }
  reload() { this.users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }]; }
}`,
      },
    ],
  },
  {
    title: "Why use Renderer2 instead of direct DOM access?",
    answer:
      "## Renderer2\n\n" +
      "**`Renderer2`** is Angular's abstraction for DOM manipulation. Prefer it over touching `nativeElement` directly (`el.style.x = ...`, `innerHTML = ...`) because it's:\n" +
      "- **Platform-agnostic** — works with server-side rendering (Angular Universal), web workers, and other renderers where the real DOM may not exist.\n" +
      "- **Safer** — keeps Angular in control and avoids XSS-prone direct `innerHTML`.\n\n" +
      "Methods: `setStyle`, `addClass`/`removeClass`, `setAttribute`, `createElement`, `appendChild`, `listen`.\n\n" +
      "**Interview tip:** the key reason is **SSR / platform independence + security** — direct `nativeElement` access breaks when there's no DOM (server) and is an XSS risk. Even better, prefer **template bindings** (`[class]`, `[style]`, `[attr.x]`) over imperative DOM work; reach for `Renderer2` only when you must manipulate the DOM in code.",
    examples: [
      {
        label: "Manipulate the DOM via Renderer2",
        tech: "angular",
        runnable: true,
        code: `import { Component, Renderer2, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<p>this paragraph is styled via Renderer2 (platform-safe)</p>',
})
export class AppComponent implements AfterViewInit {
  constructor(private renderer: Renderer2, private host: ElementRef) {}

  ngAfterViewInit() {
    const p = this.host.nativeElement.querySelector('p');
    this.renderer.setStyle(p, 'color', 'purple');     // instead of p.style.color = ...
    this.renderer.setStyle(p, 'fontWeight', 'bold');
  }
}`,
      },
    ],
  },
];

export default augments;
