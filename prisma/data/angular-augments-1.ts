import type { AngularAugment } from "./angular-augments.types";

/**
 * Angular augments — batch 1 (components, DI, change detection, lifecycle, RxJS basics).
 * Conventions: prose double-quoted ("\n"-joined, no bare < or >), inline SVG
 * single-quoted attrs (&gt;/&lt; only inside <text>), GFM tables. Angular code
 * uses SINGLE-QUOTED inline templates (no backticks — they'd clash with the
 * outer template literal). `runnable:true` only for self-contained, core-only,
 * single-component examples (selector 'app-root', class AppComponent).
 */
const augments: AngularAugment[] = [
  {
    title: "How do child components emit events to parents?",
    answer:
      "## Child to parent: @Output + EventEmitter\n\n" +
      "A child exposes an **`@Output()`** property that is an **`EventEmitter`**. When something happens, the child calls **`.emit(value)`**, and the parent listens with **event binding** in its template — exactly like a native DOM event.\n\n" +
      "Data flows **down** via `@Input()` and **up** via `@Output()` events — Angular's one-way data flow.\n\n" +
      "**Interview tip:** name the trio — `@Output()` property, `EventEmitter`, and `.emit()` — and that the parent subscribes via `(childEvent)=\"handler($event)\"`. For sibling/cross-tree communication that isn't a direct parent-child, reach for a **shared service** with an RxJS Subject instead, not a chain of outputs.",
    examples: [
      {
        label: "@Output from child, bound in parent",
        tech: "angular",
        runnable: false,
        code: `import { Component, Input, Output, EventEmitter } from '@angular/core';

// Child: emits an event upward.
@Component({
  selector: 'app-counter',
  template: '<button (click)="add()">{{ label }}: {{ value }}</button>',
})
export class CounterComponent {
  @Input() label = 'Count';
  value = 0;
  @Output() changed = new EventEmitter<number>();   // the output channel

  add() {
    this.value++;
    this.changed.emit(this.value);                   // notify the parent
  }
}

// Parent: listens with event binding, like a DOM event.
@Component({
  selector: 'app-root',
  template: '<app-counter label="Clicks" (changed)="onChanged($event)"></app-counter><p>last: {{ last }}</p>',
})
export class AppComponent {
  last = 0;
  onChanged(v: number) { this.last = v; }
}`,
      },
    ],
  },
  {
    title: "How do you avoid memory leaks from subscriptions?",
    answer:
      "## Unsubscribe, or let Angular do it\n\n" +
      "An RxJS subscription that outlives its component keeps its callback (and everything it closes over) alive — a **memory leak**, and often duplicate work. You must tear subscriptions down when the component is destroyed.\n\n" +
      "Best options, in order of preference:\n" +
      "1. **`async` pipe** — subscribe in the template (`obs$ | async`); Angular unsubscribes automatically. No manual code.\n" +
      "2. **`takeUntilDestroyed()`** (Angular 16+) — operator that completes the stream on destroy.\n" +
      "3. **Manual** — store the `Subscription` and call `unsubscribe()` in `ngOnDestroy` (the classic approach, shown below).\n\n" +
      "**Interview tip:** lead with the **`async` pipe** as the idiomatic fix (no leak, no boilerplate). Note that **finite/auto-completing** streams (an `HttpClient` call, a stream piped through `take(1)`) don't strictly need unsubscribing — but long-lived ones (`interval`, route params, store selectors, DOM events) absolutely do.",
    examples: [
      {
        label: "Store the subscription, unsubscribe in ngOnDestroy",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  template: '<p>ticks: {{ count }}</p>',
})
export class AppComponent implements OnInit, OnDestroy {
  count = 0;
  private sub!: Subscription;

  ngOnInit() {
    // A long-lived stream: without teardown it keeps emitting after destroy.
    this.sub = interval(1000).subscribe(() => (this.count = this.count + 1));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();   // prevent the leak
  }
}`,
      },
    ],
  },
  {
    title: "How do you bootstrap a standalone Angular application?",
    answer:
      "## Bootstrapping without NgModules\n\n" +
      "Modern Angular (v14+, default since v17) boots from a **standalone root component** via **`bootstrapApplication`** in `main.ts` — no `AppModule` / `platformBrowserDynamic().bootstrapModule(...)`. App-wide providers (router, HTTP, etc.) are passed in the **`providers`** array using `provide*` functions.\n\n" +
      "**Interview tip:** contrast it with the legacy `bootstrapModule(AppModule)` path. The wins are **less boilerplate** and **better tree-shaking** (you import only what a component needs). Mention provider helpers like `provideRouter(routes)` and `provideHttpClient()` that replace `RouterModule.forRoot`/`HttpClientModule`.",
    examples: [
      {
        label: "main.ts with bootstrapApplication",
        tech: "angular",
        runnable: false,
        code: `// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { routes } from './app.routes';

@Component({
  selector: 'app-root',
  standalone: true,                 // no NgModule needed
  template: '<h1>Standalone app</h1>',
})
export class AppComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),          // replaces RouterModule.forRoot
    provideHttpClient(),            // replaces HttpClientModule
  ],
});`,
      },
    ],
  },
  {
    title: "How do you create a custom validator in reactive forms?",
    answer:
      "## Custom validators\n\n" +
      "A validator is just a **function** that takes an `AbstractControl` and returns either **`null`** (valid) or an **error object** like `{ forbidden: true }` (invalid). Attach it to a control in your `FormGroup`. For async checks (e.g. 'is this username taken?'), return an `Observable`/`Promise` of the same shape and pass it as the third arg.\n\n" +
      "**Interview tip:** the contract is the key point — **`null` means valid**, any object means invalid (and its keys show up in `control.errors`). Make validators **pure** and reusable (a factory that returns the validator lets you parameterize it, e.g. `minAge(18)`). Mention **async validators** for server-side uniqueness checks.",
    examples: [
      {
        label: "A reusable custom validator (reactive forms)",
        tech: "angular",
        runnable: false,
        code: `import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup, FormControl } from '@angular/forms';

// Factory -> returns a validator (lets you parameterize it).
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const taken = control.value === name;
    return taken ? { forbiddenName: { value: control.value } } : null; // null = valid
  };
}

// Usage in a component:
form = new FormGroup({
  username: new FormControl('', [forbiddenName('admin')]),
});
// In the template: *ngIf="form.get('username')?.errors?.forbiddenName"`,
      },
    ],
  },
  {
    title: "How do you dynamically create components?",
    answer:
      "## Dynamic components\n\n" +
      "To insert a component at runtime (modals, dashboards, plugins), get a **`ViewContainerRef`** (the spot to insert into) and call **`createComponent(MyComponent)`**. Modern Angular (13+) does this without the old `ComponentFactoryResolver`. You then set `@Input`s on `componentRef.instance` and call `componentRef.destroy()` to clean up.\n\n" +
      "**Interview tip:** the modern API is `viewContainerRef.createComponent(Cmp)` — say that resolver-free fact. Anchor the insertion point with a template ref + `@ViewChild(..., { read: ViewContainerRef })` (or an `ng-template`). Remember to **destroy** the `componentRef` to avoid leaks, and set inputs via `.setInput()` / `.instance`.",
    examples: [
      {
        label: "createComponent into a ViewContainerRef",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewChild, ViewContainerRef, AfterViewInit } from '@angular/core';
import { WidgetComponent } from './widget.component';

@Component({
  selector: 'app-root',
  template: '<ng-container #host></ng-container>',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('host', { read: ViewContainerRef }) host!: ViewContainerRef;

  ngAfterViewInit() {
    const ref = this.host.createComponent(WidgetComponent); // no resolver needed
    ref.setInput('title', 'Created at runtime');
    // ...later: ref.destroy();  // clean up to avoid leaks
  }
}`,
      },
    ],
  },
  {
    title: "How do you handle errors and retries globally with interceptors?",
    answer:
      "## Global error/retry handling with HTTP interceptors\n\n" +
      "An **`HttpInterceptor`** sits in the `HttpClient` pipeline and can transform every request/response. For cross-cutting concerns like **retry** (transient failures) and **error mapping/logging**, you `pipe` the outgoing `handle(req)` stream through RxJS operators — applied to **all** requests in one place.\n\n" +
      "**Interview tip:** interceptors are the right home for **auth headers, retries, error normalization, logging, and loading indicators** — anything every request needs. Use `retry({ count, delay })` for transient errors, and `catchError` to map server errors to a friendly shape (and route 401s to login). Order matters when you register multiple interceptors.",
    examples: [
      {
        label: "Retry + error mapping interceptor",
        tech: "angular",
        runnable: false,
        code: `import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, retry, catchError, throwError } from 'rxjs';

@Injectable()
export class ErrorRetryInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retry({ count: 2, delay: 1000 }),          // retry transient failures
      catchError((err) => {
        console.error('HTTP error', req.url, err.status);
        return throwError(() => err);            // re-throw for the caller
      }),
    );
  }
}
// Register: { provide: HTTP_INTERCEPTORS, useClass: ErrorRetryInterceptor, multi: true }`,
      },
    ],
  },
  {
    title: "How do you read route parameters?",
    answer:
      "## Reading route params\n\n" +
      "Inject **`ActivatedRoute`**. For values that **change while the component stays mounted** (navigating `/user/1` to `/user/2` reuses the component), subscribe to the **`paramMap` observable**. For a one-time read where the component is recreated, the **`snapshot`** is fine.\n\n" +
      "**Interview tip:** the trap interviewers look for — using `snapshot.paramMap` when the route param can change without re-creating the component (then your data never updates). Subscribe to **`route.paramMap`** for reactive params; use `snapshot` only when you know the component is destroyed/recreated per navigation. Query params live on `route.queryParamMap`.",
    examples: [
      {
        label: "Reactive params via paramMap",
        tech: "angular",
        runnable: false,
        code: `import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-root',
  template: '<p>user id: {{ id }}</p>',
})
export class AppComponent implements OnInit {
  id: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Reactive: updates even when navigating /user/1 -> /user/2 reuses this component.
    this.route.paramMap.subscribe((params) => {
      this.id = params.get('id');
    });
  }
}`,
      },
    ],
  },
  {
    title: "How does Dependency Injection work in Angular?",
    answer:
      "## Dependency Injection\n\n" +
      "Angular has a **hierarchical injector** system. You ask for a dependency by its **token** (usually a class type) in a constructor (or via `inject()`), and Angular's injector **finds or creates** the instance and hands it over — you never `new` it yourself. This decouples classes from how their collaborators are built and makes testing (swap in a mock) easy.\n\n" +
      "Injectors form a tree: a request bubbles **up** from the component's injector toward the **root** injector until a provider is found. `@Injectable({ providedIn: 'root' })` registers an app-wide **singleton**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 200' role='img' aria-label='Hierarchical injector: requests bubble up to the root'>" +
      "<defs><marker id='ah-di' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='160' y='24' width='140' height='40' rx='8'/><text class='d-text' x='230' y='48' text-anchor='middle'>Root injector</text>" +
      "<rect class='d-box' x='60' y='130' width='150' height='42' rx='6'/><text class='d-sub' x='135' y='150' text-anchor='middle'>Component A injector</text><text class='d-sub' x='135' y='164' text-anchor='middle'>asks for Logger</text>" +
      "<rect class='d-box' x='250' y='130' width='150' height='42' rx='6'/><text class='d-sub' x='325' y='156' text-anchor='middle'>Component B injector</text>" +
      "<line class='d-edge' x1='135' y1='130' x2='200' y2='66' marker-end='url(#ah-di)'/>" +
      "<line class='d-edge' x1='325' y1='130' x2='262' y2='66' marker-end='url(#ah-di)'/>" +
      "<text class='d-sub' x='230' y='100' text-anchor='middle'>not found locally -&gt; bubble up to root</text>" +
      "</svg>\n\n" +
      "**Interview tip:** hit the keywords — **token, provider, hierarchical injector, singleton (`providedIn: 'root'`)**. Mention that providing a service at a **component** level gives each instance its own copy (see that question), and that DI is what makes Angular code **testable** (inject mocks).",
    examples: [
      {
        label: "Inject a service via the constructor",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })   // app-wide singleton, registered at root
export class Logger {
  log(msg: string) { return 'LOG: ' + msg; }
}

@Component({
  selector: 'app-root',
  template: '<p>{{ message }}</p>',
})
export class AppComponent {
  message: string;
  // Angular resolves the Logger token and injects the instance.
  constructor(private logger: Logger) {
    this.message = this.logger.log('DI works');
  }
}`,
      },
    ],
  },
  {
    title: "How does change detection work in Angular?",
    answer:
      "## Change detection (CD)\n\n" +
      "Angular keeps the DOM in sync with component state by running **change detection**: after any async event (clicks, timers, HTTP, promises — caught by **Zone.js**), it walks the **component tree top-down** and re-evaluates each template's bindings, updating the DOM where values changed.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 185' role='img' aria-label='Change detection walks the component tree top-down'>" +
      "<defs><marker id='ah-cd' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='180' y='20' width='100' height='36' rx='6'/><text class='d-sub' x='230' y='42' text-anchor='middle'>Root</text>" +
      "<rect class='d-box' x='70' y='90' width='110' height='36' rx='6'/><text class='d-sub' x='125' y='112' text-anchor='middle'>Child A</text>" +
      "<rect class='d-box' x='280' y='90' width='110' height='36' rx='6'/><text class='d-sub' x='335' y='112' text-anchor='middle'>Child B (OnPush)</text>" +
      "<rect class='d-box' x='280' y='150' width='110' height='30' rx='6'/><text class='d-sub' x='335' y='170' text-anchor='middle'>skipped if no input change</text>" +
      "<line class='d-edge' x1='205' y1='56' x2='130' y2='88' marker-end='url(#ah-cd)'/>" +
      "<line class='d-edge' x1='255' y1='56' x2='330' y2='88' marker-end='url(#ah-cd)'/>" +
      "<line class='d-edge-dashed' x1='335' y1='126' x2='335' y2='148' marker-end='url(#ah-cd)'/>" +
      "</svg>\n\n" +
      "Two strategies: **Default** checks every component each cycle; **`OnPush`** skips a component (and its subtree) unless an `@Input` **reference** changed, an event fired inside it, or an `async` pipe emitted — far less work. (Signals, in modern Angular, enable even finer-grained, zoneless updates.)\n\n" +
      "**Interview tip:** the chain to articulate: **Zone.js patches async APIs -> notifies Angular -> CD runs top-down -> bindings re-checked -> DOM updated.** Then explain **`OnPush`** as the main optimization and *why* it relies on **immutable inputs** (new references). Bonus: mention **signals** moving Angular toward fine-grained, zoneless reactivity.",
    examples: [
      {
        label: "OnPush change detection",
        tech: "angular",
        runnable: true,
        code: `import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>count: {{ count }}</p><button (click)="bump()">+1</button>',
})
export class AppComponent {
  count = 0;
  // OnPush still re-checks on an event it handles (this click), an @Input ref
  // change, or an async pipe emission -> fewer checks than Default.
  bump() { this.count = this.count + 1; }
}`,
      },
    ],
  },
  {
    title: "How does routing and lazy loading work in Angular?",
    answer:
      "## Routing & lazy loading\n\n" +
      "The **Router** maps URL paths to components. You declare `routes`, render the active one in a **`<router-outlet>`**, and navigate with **`routerLink`** or `Router.navigate()`. **Lazy loading** defers a route's code until it's visited via **`loadComponent`** (standalone) or `loadChildren` — shrinking the initial bundle for faster startup.\n\n" +
      "**Interview tip:** the headline is **`loadComponent`/`loadChildren` split the bundle per route**, so the app loads faster and users download only what they navigate to. Mention **`<router-outlet>`**, route params, **guards** (protect routes), **resolvers** (prefetch data), and **preloading strategies** (warm lazy chunks in the background).",
    examples: [
      {
        label: "Route config with a lazy-loaded route",
        tech: "angular",
        runnable: false,
        code: `import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users/:id', component: UserComponent },   // route param :id
  {
    path: 'admin',
    // Code for this route is fetched only when /admin is visited:
    loadComponent: () => import('./admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '**', component: NotFoundComponent },       // wildcard / 404
];
// Template renders the active route into: <router-outlet></router-outlet>`,
      },
    ],
  },
  {
    title: "How does two-way binding work under the hood?",
    answer:
      "## Two-way binding = property binding + event binding\n\n" +
      "The `[(x)]` 'banana in a box' syntax is **syntactic sugar**. `[(value)]=\"prop\"` desugars to a **property binding down** plus an **event binding up**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 120' role='img' aria-label='Banana-in-a-box desugars to property + event binding'>" +
      "<rect class='d-box-accent' x='150' y='40' width='160' height='40' rx='8'/><text class='d-text' x='230' y='65' text-anchor='middle'>[(value)]</text>" +
      "<rect class='d-box' x='20' y='40' width='110' height='40' rx='6'/><text class='d-sub' x='75' y='64' text-anchor='middle'>[value]  (down)</text>" +
      "<rect class='d-box' x='330' y='40' width='120' height='40' rx='6'/><text class='d-sub' x='390' y='58' text-anchor='middle'>(valueChange)</text><text class='d-sub' x='390' y='72' text-anchor='middle'>(up)</text>" +
      "<text class='d-sub' x='230' y='100' text-anchor='middle'>one sugar = a property binding + an event binding</text>" +
      "</svg>\n\n" +
      "So for a component to support `[(value)]`, it needs an **`@Input() value`** and an **`@Output() valueChange`** (the `Change` suffix is the convention). `[(ngModel)]` works the same way — it's just a directive that exposes `ngModel` + `ngModelChange`.\n\n" +
      "**Interview tip:** say it crisply: **`[(x)]` = `[x]` + `(xChange)`**. To make your own component two-way bindable, expose `@Input() x` and `@Output() xChange` with the matching name. `ngModel` requires **`FormsModule`** and is the same pattern under the hood.",
    examples: [
      {
        label: "A two-way bindable component (the desugaring)",
        tech: "angular",
        runnable: false,
        code: `import { Component, Input, Output, EventEmitter } from '@angular/core';

// Expose value + valueChange to support [(value)] on this component.
@Component({
  selector: 'app-stepper',
  template: '<button (click)="dec()">-</button> {{ value }} <button (click)="inc()">+</button>',
})
export class StepperComponent {
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();   // name MUST be valueChange
  inc() { this.value++; this.valueChange.emit(this.value); }
  dec() { this.value--; this.valueChange.emit(this.value); }
}

// Parent can now write: <app-stepper [(value)]="count"></app-stepper>
// which Angular expands to [value]="count" (valueChange)="count = $event"`,
      },
    ],
  },
  {
    title: "What are @ViewChild and @ContentChild?",
    answer:
      "## @ViewChild vs @ContentChild\n\n" +
      "Both are **queries** that give a component a reference to something in its DOM/component tree:\n" +
      "- **`@ViewChild`** queries the component's **own template** (view) — an element (via a template ref), a child component, or a directive.\n" +
      "- **`@ContentChild`** queries **projected content** — nodes passed in from a parent via `<ng-content>` (content projection).\n\n" +
      "Plural forms (`@ViewChildren`, `@ContentChildren`) return a **`QueryList`**.\n\n" +
      "**Interview tip:** the distinction is **view (my template) vs content (projected in from outside)**. Timing matters: view queries resolve by **`ngAfterViewInit`**, content queries by **`ngAfterContentInit`** — accessing them in the constructor returns `undefined`. `{ static: true }` resolves earlier (before CD) for refs that always exist.",
    examples: [
      {
        label: "@ViewChild a template element",
        tech: "angular",
        runnable: true,
        code: `import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<input #box value="hi there" /><p>{{ msg }}</p>',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;
  msg = '';

  // View queries are ready in ngAfterViewInit (NOT the constructor).
  ngAfterViewInit() {
    this.msg = 'the input value is: ' + this.box.nativeElement.value;
  }
}`,
      },
    ],
  },
  {
    title: "What are Angular Signals?",
    answer:
      "## Signals\n\n" +
      "**Signals** (stable in Angular 17) are a built-in **reactive primitive**: a wrapper around a value that **tracks who reads it** and notifies them when it changes. Read with `count()`, set with `count.set(v)` / `count.update(fn)`.\n\n" +
      "- **`signal(initial)`** — writable state.\n" +
      "- **`computed(fn)`** — derived value, recalculated lazily when its dependencies change.\n" +
      "- **`effect(fn)`** — side effect that re-runs when signals it reads change.\n\n" +
      "Because reads are tracked precisely, Angular can update **only what actually depends on a changed value** — enabling fine-grained, eventually **zoneless** change detection.\n\n" +
      "**Interview tip:** frame signals as **fine-grained reactivity** that reduces reliance on Zone.js and `OnPush` gymnastics — the template re-renders exactly the bindings that read a changed signal. Contrast with RxJS: signals are for **synchronous state**, RxJS for **async streams/events** (and `toSignal`/`toObservable` bridge them).",
    examples: [
      {
        label: "signal, computed, effect",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<p>{{ count() }} doubled = {{ doubled() }}</p><button (click)="inc()">+1</button>',
})
export class AppComponent {
  count = signal(0);                       // writable signal
  doubled = computed(() => this.count() * 2); // derived, lazy

  constructor() {
    effect(() => console.log('count changed to', this.count())); // runs on change
  }

  inc() { this.count.update((n) => n + 1); }
}`,
      },
    ],
  },
  {
    title: "What are Angular lifecycle hooks?",
    answer:
      "## Lifecycle hooks\n\n" +
      "Angular calls hook methods at key moments in a component/directive's life, letting you run logic at the right time. The common ones, in order:\n\n" +
      "| Hook | When | Typical use |\n" +
      "|---|---|---|\n" +
      "| `ngOnChanges` | an `@Input` changes (before `ngOnInit`) | react to input changes |\n" +
      "| `ngOnInit` | once, after first inputs set | init logic, fetch data |\n" +
      "| `ngAfterContentInit` | projected content initialized | content queries ready |\n" +
      "| `ngAfterViewInit` | view + child views ready | `@ViewChild`, DOM access |\n" +
      "| `ngOnDestroy` | just before destroy | unsubscribe, cleanup |\n\n" +
      "(`ngDoCheck`, `ngAfterContentChecked`, `ngAfterViewChecked` run on every CD cycle — use sparingly.)\n\n" +
      "**Interview tip:** know the **order** and that **`ngOnInit` runs once** (constructor is for DI only, not init work that needs inputs). `ngAfterViewInit` is where `@ViewChild` refs are available; **`ngOnDestroy`** is the place for teardown (unsubscribe, clear timers).",
    examples: [
      {
        label: "Hook order (watch the console)",
        tech: "angular",
        runnable: true,
        code: `import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<p>open the console to see the hook order</p>',
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor() { console.log('1. constructor (DI only)'); }
  ngOnInit() { console.log('2. ngOnInit (inputs ready)'); }
  ngAfterViewInit() { console.log('3. ngAfterViewInit (view + children ready)'); }
  ngOnDestroy() { console.log('4. ngOnDestroy (cleanup)'); }
}`,
      },
    ],
  },
  {
    title: "What are components and modules in Angular?",
    answer:
      "## Components & modules\n\n" +
      "- A **component** is the basic UI building block: a class with an **`@Component`** decorator that ties together a **template** (HTML), **styles**, and **logic** (the class). Components compose into a tree.\n" +
      "- An **NgModule** (`@NgModule`) is a container that **groups** related components, directives, pipes, and providers and declares what's available to whom (`declarations`, `imports`, `exports`, `providers`).\n\n" +
      "Modern Angular favors **standalone components** (which import their own dependencies) and is steadily moving **away from NgModules**.\n\n" +
      "**Interview tip:** define both crisply (component = a piece of UI; module = a grouping/packaging unit), then show you're current: **standalone components are now the default**, so new apps often have **no NgModules** at all. The mental model 'declare components in modules' is legacy.",
    examples: [
      {
        label: "A minimal component",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';

// @Component ties a template to its logic; the selector is how it's used.
@Component({
  selector: 'app-root',
  template: '<h2>{{ title }}</h2><p>A component pairs a template with its class.</p>',
})
export class AppComponent {
  title = 'Hello from a component';
}`,
      },
    ],
  },
  {
    title: "What are ng-container and ng-template?",
    answer:
      "## ng-container & ng-template\n\n" +
      "- **`<ng-container>`** is a **grouping element that renders no DOM**. Use it to attach a structural directive (`*ngIf`, `*ngFor`) to several elements, or to avoid an extra wrapper `<div>` that would break your layout.\n" +
      "- **`<ng-template>`** defines a **template fragment that isn't rendered until something instantiates it** — the `else` branch of `*ngIf`, a `loading` block, or content rendered via `ngTemplateOutlet`. (Structural directives like `*ngIf` are themselves sugar over `ng-template`.)\n\n" +
      "**Interview tip:** crisp split — **`ng-container` = no-DOM grouping wrapper**, **`ng-template` = a lazy, on-demand chunk of view**. Mention that `*ngIf=\"x; else other\"` and `*ngFor` desugar to `<ng-template>` under the hood.",
    examples: [
      {
        label: "ng-container grouping + ng-template else",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  // ng-container adds no wrapper element; ng-template holds the else branch.
  template:
    '<ng-container *ngIf="show; else hidden">visible content, no extra wrapper</ng-container>' +
    '<ng-template #hidden><em>fallback shown when hidden</em></ng-template>' +
    '<div><button (click)="show = !show">toggle</button></div>',
})
export class AppComponent {
  show = true;
}`,
      },
    ],
  },
  {
    title: "What are pipes in Angular?",
    answer:
      "## Pipes\n\n" +
      "A **pipe** transforms a value **for display** right in the template, with the `|` syntax: `{{ price | currency }}`, `{{ date | date:'short' }}`, `{{ name | uppercase }}`. Angular ships built-in pipes (`date`, `currency`, `json`, `async`, `slice`, etc.), and you can write your own with the **`@Pipe`** decorator + a `transform()` method.\n\n" +
      "Pipes are **pure by default** — recomputed only when the input reference changes, which keeps them cheap. An **impure** pipe (`pure: false`) runs every CD cycle (use rarely; `async` is impure by necessity).\n\n" +
      "**Interview tip:** pipes are for **view formatting**, keeping templates declarative and logic out of the component. Stress **pure vs impure** (perf) and never do heavy work in a pipe. The **`async`** pipe is special — it subscribes/unsubscribes for you (see that question).",
    examples: [
      {
        label: "A custom pipe",
        tech: "angular",
        runnable: false,
        code: `import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate' })   // pure by default
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 20): string {
    return value.length > limit ? value.slice(0, limit) + '...' : value;
  }
}

// Template usage:
//   {{ longText | truncate:10 }}
//   {{ price | currency:'USD' }}   <- built-in pipe`,
      },
    ],
  },
  {
    title: "What are preloading strategies?",
    answer:
      "## Preloading strategies\n\n" +
      "Lazy loading makes startup fast but adds a **delay the first time** a user visits a lazy route (the chunk downloads then). **Preloading** warms those chunks **in the background after the app loads**, so navigation feels instant — best of both worlds.\n\n" +
      "Built-in options: **`NoPreloading`** (default — load on demand), **`PreloadAllModules`** (eagerly fetch every lazy chunk once idle), or a **custom strategy** (e.g. preload only routes flagged `data: { preload: true }`, or based on network conditions).\n\n" +
      "**Interview tip:** the trade-off — preloading trades a bit of **background bandwidth** for **instant subsequent navigation**. `PreloadAllModules` is great for small/medium apps; for large apps use a **custom strategy** to preload only likely-next routes. Configure via `provideRouter(routes, withPreloading(PreloadAllModules))`.",
    examples: [
      {
        label: "Enable preloading + a custom strategy",
        tech: "angular",
        runnable: false,
        code: `import { provideRouter, withPreloading, PreloadAllModules, PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

// Eagerly preload all lazy routes after the app is stable:
provideRouter(routes, withPreloading(PreloadAllModules));

// ...or a custom strategy: only routes marked data.preload === true
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data && route.data['preload'] ? load() : of(null);
  }
}`,
      },
    ],
  },
  {
    title: "What are route guards in Angular?",
    answer:
      "## Route guards\n\n" +
      "**Guards** decide whether navigation is allowed. They are functions (modern style; previously class interfaces) returning **`boolean | UrlTree | Observable/Promise of those`** — `true` proceeds, `false` blocks, and a `UrlTree` redirects.\n\n" +
      "| Guard | Controls |\n" +
      "|---|---|\n" +
      "| `canActivate` | entering a route (e.g. auth check) |\n" +
      "| `canActivateChild` | entering child routes |\n" +
      "| `canDeactivate` | leaving a route (e.g. 'unsaved changes?') |\n" +
      "| `canMatch` | whether a route (incl. its lazy load) even matches |\n\n" +
      "**Interview tip:** name the kinds and that the modern API is **functional guards** (`CanActivateFn`) using `inject()`, not the deprecated class-based interfaces. A guard returning a **`UrlTree`** is how you redirect (e.g. to `/login`). `canMatch` is powerful — it can skip lazy-loading a chunk entirely if the guard fails.",
    examples: [
      {
        label: "A functional canActivate guard",
        tech: "angular",
        runnable: false,
        code: `import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;            // allow
  return router.createUrlTree(['/login']);       // else redirect (UrlTree)
};

// Usage: { path: 'admin', component: AdminComponent, canActivate: [authGuard] }`,
      },
    ],
  },
  {
    title: "What are signal inputs and model() in modern Angular?",
    answer:
      "## Signal inputs & model()\n\n" +
      "Modern Angular (17.1+) lets component **inputs be signals** instead of plain properties:\n" +
      "- **`input()`** — a read-only signal input: `value = input(0)`, read as `this.value()`. Use `input.required<T>()` for a required input.\n" +
      "- **`model()`** — a **two-way** signal input: it creates the `value` + `valueChange` pair automatically, so a parent can use `[(value)]`. Read with `this.value()` and write with `this.value.set(...)`.\n\n" +
      "Because they're signals, reading an input in a `computed`/`effect`/template wires up reactivity automatically — no `ngOnChanges` needed.\n\n" +
      "**Interview tip:** `input()` replaces `@Input()` with a **signal** (reactive, no `ngOnChanges` boilerplate); **`model()`** replaces the `@Input() x` + `@Output() xChange` pair for two-way binding. They integrate with `computed`/`effect`, which is the whole point of the signals story.",
    examples: [
      {
        label: "input() and model()",
        tech: "angular",
        runnable: false,
        code: `import { Component, input, model, computed } from '@angular/core';

@Component({
  selector: 'app-rating',
  template: '<button (click)="bump()">{{ label() }}: {{ stars() }}</button>',
})
export class RatingComponent {
  label = input('Rating');                 // read-only signal input
  stars = model(0);                        // two-way: enables [(stars)]
  doubled = computed(() => this.stars() * 2);
  bump() { this.stars.set(this.stars() + 1); }   // updates parent via model
}

// Parent: <app-rating label="Score" [(stars)]="score"></app-rating>`,
      },
    ],
  },
];

export default augments;
