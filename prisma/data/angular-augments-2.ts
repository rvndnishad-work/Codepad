import type { AngularAugment } from "./angular-augments.types";

/**
 * Angular augments — batch 2 (directives, DI tokens, RxJS, CLI, SSR, NgRx, forms).
 * Same conventions as batch 1. Runnable examples use SINGLE-QUOTED inline
 * templates with NO single quotes inside (move any string logic to the class)
 * and classic decorators (@Inject, not inject()) for broad compatibility.
 */
const augments: AngularAugment[] = [
  {
    title: "What are standalone components?",
    answer:
      "## Standalone components\n\n" +
      "A **standalone component** sets `standalone: true` and declares **its own dependencies in an `imports` array** — it doesn't need to be declared in an `@NgModule`. Since Angular 17 they're the **default**, and you can build entire apps with **no NgModules**.\n\n" +
      "They import exactly what their template uses (`CommonModule`, `RouterLink`, other standalone components/pipes), which improves **tree-shaking** and makes dependencies explicit and local.\n\n" +
      "**Interview tip:** the one-liner: **a component that imports its own dependencies instead of relying on a module's `declarations`.** Mention they're the **default in modern Angular**, bootstrapped with `bootstrapApplication`, and lazily loadable via `loadComponent`. NgModules still exist for interop but new code rarely needs them.",
    examples: [
      {
        label: "A standalone component",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],   // declares its OWN dependencies
  template: '<a routerLink="/about" *ngIf="show">About</a>',
})
export class HomeComponent {
  show = true;
}`,
      },
    ],
  },
  {
    title: "What are template reference variables?",
    answer:
      "## Template reference variables\n\n" +
      "A **template reference variable** (`#name`) names a DOM element, component, or directive **inside the template**, so you can use it elsewhere in that same template — read an input's value, call a method, or pass it to a handler. On a plain element it refers to the element; on a component/directive it can expose an API via `exportAs`.\n\n" +
      "**Interview tip:** `#ref` is **template-scoped** (not available in the class — use `@ViewChild` for that). It's the simplest way to grab a value without two-way binding (e.g. `#box` then `box.value`). On a component, `#cmp` gives you the component instance; with directives you often see `#f=\"ngForm\"` (that's `exportAs`).",
    examples: [
      {
        label: "Reference an input element",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  // #name refers to the input element; used directly in the template.
  template: '<input #name value="Ada" /><button (click)="greet(name.value)">Greet</button><p>{{ msg }}</p>',
})
export class AppComponent {
  msg = '';
  greet(v: string) { this.msg = 'Hello ' + v; }
}`,
      },
    ],
  },
  {
    title: "What are the types of data binding in Angular?",
    answer:
      "## Four kinds of data binding\n\n" +
      "| Binding | Syntax | Direction |\n" +
      "|---|---|---|\n" +
      "| Interpolation | `{{ value }}` | class -&gt; view |\n" +
      "| Property binding | `[prop]=\"value\"` | class -&gt; view |\n" +
      "| Event binding | `(event)=\"handler()\"` | view -&gt; class |\n" +
      "| Two-way binding | `[(ngModel)]=\"value\"` | both ways |\n\n" +
      "Interpolation and property binding push data **into** the view; event binding sends user actions **back**; two-way combines both (see the two-way binding question).\n\n" +
      "**Interview tip:** group them by **direction** — interpolation/property are one-way down, event is one-way up, two-way is the `[()]` sugar over the two. Note `[(ngModel)]` needs **`FormsModule`**, and that property binding (`[src]`) targets the DOM **property**, not the HTML attribute (use `[attr.x]` for true attributes).",
    examples: [
      {
        label: "Interpolation, property, and event binding",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template:
    '<p>Interpolation: {{ name }}</p>' +
    '<p [style.color]="color">Property binding sets the color</p>' +
    '<button (click)="shout()">Event binding</button>',
})
export class AppComponent {
  name = 'Angular';
  color = 'teal';
  shout() { this.name = this.name + '!'; }   // string logic in the class
}`,
      },
    ],
  },
  {
    title: "What do @HostListener and @HostBinding do?",
    answer:
      "## @HostListener & @HostBinding\n\n" +
      "Both let a component or **directive** interact with its **host element** (the element it's attached to):\n" +
      "- **`@HostListener('event')`** subscribes to an event on the host (or `window`/`document`) and runs a method.\n" +
      "- **`@HostBinding('prop')`** binds a class property to a host property/attribute/style/class.\n\n" +
      "Together they're how **attribute directives** add behavior + styling to whatever element they're on (e.g. a `highlight` directive that reacts to hover).\n\n" +
      "**Interview tip:** these are the **directive's window into its host** — listen to host events without manual `addEventListener`, and reflect state onto the host (`@HostBinding('class.active')`). Cleaner and CD-friendly versus touching the DOM directly.",
    examples: [
      {
        label: "Listen and bind on the host",
        tech: "angular",
        runnable: true,
        code: `import { Component, HostListener, HostBinding } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<p>click anywhere in this component. clicks: {{ count }}</p>',
})
export class AppComponent {
  @HostBinding('style.cursor') cursor = 'pointer';   // bind a host style
  count = 0;
  @HostListener('click') onClick() { this.count++; } // listen on the host
}`,
      },
    ],
  },
  {
    title: "What does ChangeDetectorRef do?",
    answer:
      "## ChangeDetectorRef\n\n" +
      "`ChangeDetectorRef` is the handle to a component's **own change detector**, letting you control change detection manually — essential with **`OnPush`** or when changes happen outside Angular's awareness.\n\n" +
      "| Method | Effect |\n" +
      "|---|---|\n" +
      "| `markForCheck()` | mark this component + ancestors to be checked next cycle (OnPush) |\n" +
      "| `detectChanges()` | run CD for this view now (synchronously) |\n" +
      "| `detach()` / `reattach()` | remove/restore this view from the CD tree |\n\n" +
      "**Interview tip:** the common case is **`markForCheck()`** in an `OnPush` component after an async update the framework didn't see (a manual subscription, a callback). `detach()` + manual `detectChanges()` is an advanced perf lever for very hot views. Don't reach for these unless `OnPush`/`async` pipe can't express it.",
    examples: [
      {
        label: "markForCheck under OnPush",
        tech: "angular",
        runnable: true,
        code: `import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>seconds: {{ count }}</p>',
})
export class AppComponent {
  count = 0;
  constructor(private cdr: ChangeDetectorRef) {
    setInterval(() => {
      this.count++;
      this.cdr.markForCheck();   // OnPush would otherwise miss this update
    }, 1000);
  }
}`,
      },
    ],
  },
  {
    title: "What does the Angular CLI provide?",
    answer:
      "## The Angular CLI\n\n" +
      "The **CLI (`ng`)** is the official tool that scaffolds, builds, serves, and tests Angular apps with sensible defaults — so you don't hand-configure webpack/TypeScript. Core commands: `ng new` (project), `ng generate` (components/services/etc. with best-practice boilerplate + tests), `ng serve` (dev server + live reload), `ng build` (optimized production bundle — AOT, minify, tree-shake), `ng test`/`ng e2e`, and `ng update`/`ng add` (schematics for upgrades and library installs).\n\n" +
      "**Interview tip:** emphasize **consistency and best practices by default** — `ng generate` produces files that follow conventions (and wires up tests), `ng build --configuration production` enables AOT + optimizations, and **schematics** (`ng add`, `ng update`) automate library setup and version migrations.",
    examples: [
      {
        label: "Common CLI commands",
        runnable: false,
        code: `ng new my-app                 # scaffold a new workspace
ng generate component foo     # or: ng g c foo  -> component + spec + styles
ng serve                      # dev server with live reload
ng build --configuration production   # AOT, minified, tree-shaken bundle
ng test                       # run unit tests
ng add @angular/material      # install + configure a library (schematics)
ng update                     # migrate to a newer Angular version`,
      },
    ],
  },
  {
    title: "What is Angular Universal / SSR?",
    answer:
      "## Server-Side Rendering (Angular Universal)\n\n" +
      "By default Angular is a **client-side rendered** SPA: the browser gets an empty shell and JS builds the page. **SSR** (historically 'Angular Universal', now built into the CLI) renders the app to **HTML on the server** for the first request, then **hydrates** it on the client to make it interactive.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 470 150' role='img' aria-label='Server renders HTML, browser shows it, then client hydrates'>" +
      "<defs><marker id='ah-ssr' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='14' y='52' width='120' height='44' rx='6'/><text class='d-text' x='74' y='72' text-anchor='middle'>Server</text><text class='d-sub' x='74' y='88' text-anchor='middle'>render to HTML</text>" +
      "<rect class='d-box' x='180' y='52' width='110' height='44' rx='6'/><text class='d-sub' x='235' y='72' text-anchor='middle'>Browser shows</text><text class='d-sub' x='235' y='86' text-anchor='middle'>HTML instantly</text>" +
      "<rect class='d-box' x='336' y='52' width='120' height='44' rx='6'/><text class='d-sub' x='396' y='72' text-anchor='middle'>Hydrate</text><text class='d-sub' x='396' y='86' text-anchor='middle'>attach JS</text>" +
      "<line class='d-edge' x1='134' y1='74' x2='178' y2='74' marker-end='url(#ah-ssr)'/>" +
      "<line class='d-edge' x1='290' y1='74' x2='334' y2='74' marker-end='url(#ah-ssr)'/>" +
      "<text class='d-sub' x='235' y='128' text-anchor='middle'>faster first paint + SEO; then it becomes a normal SPA</text>" +
      "</svg>\n\n" +
      "Benefits: **faster First Contentful Paint**, and **SEO / social previews** (crawlers get real HTML, not an empty `app-root`). Modern Angular adds **non-destructive hydration** (`provideClientHydration()`) so the client reuses the server DOM instead of re-rendering it.\n\n" +
      "**Interview tip:** describe it as **render on the server, hydrate on the client**, and the wins (FCP + SEO). Mention **hydration mismatches** (server and client must produce the same markup — avoid `window`/`Date.now()` during render), and that you need a Node server (or prerender/SSG for static pages).",
    examples: [
      {
        label: "Enable hydration",
        tech: "angular",
        runnable: false,
        code: `// main.ts (server-rendered app with client hydration)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideClientHydration } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(),   // reuse server DOM instead of re-rendering
  ],
});
// Scaffold SSR with: ng add @angular/ssr`,
      },
    ],
  },
  {
    title: "What is Angular and how does it differ from AngularJS?",
    answer:
      "## Angular vs AngularJS\n\n" +
      "**Angular** (v2+) is a complete **rewrite** of **AngularJS** (v1.x) — same name lineage, fundamentally different framework.\n\n" +
      "| | AngularJS (1.x) | Angular (2+) |\n" +
      "|---|---|---|\n" +
      "| Language | JavaScript | TypeScript |\n" +
      "| Architecture | controllers + `$scope` | components + services |\n" +
      "| Data binding | two-way digest cycle | unidirectional + explicit two-way |\n" +
      "| DI | string-based | hierarchical, typed injectors |\n" +
      "| Mobile / speed | not designed for it | mobile-first, AOT, faster CD |\n" +
      "| Structure | directives + modules | components, modules/standalone, CLI |\n\n" +
      "**Interview tip:** the key message: **not an upgrade, a rewrite.** Angular is **TypeScript + component-based** with a smarter, faster change detection model and a powerful CLI; AngularJS used `$scope`, controllers, and a dirty-checking digest cycle that didn't scale. They're not compatible (migration is a real effort).",
  },
  {
    title: "What is NgRx?",
    answer:
      "## NgRx\n\n" +
      "**NgRx** is the popular **Redux-style** state-management library for Angular: a single, immutable **store**, updated through a strict **unidirectional flow**. Components **dispatch actions**; pure **reducers** compute the next state; **selectors** read slices (memoized); **effects** handle async side effects (HTTP) and dispatch follow-up actions.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 470 165' role='img' aria-label='NgRx unidirectional data flow'>" +
      "<defs><marker id='ah-ngrx' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='62' width='96' height='40' rx='6'/><text class='d-sub' x='60' y='86' text-anchor='middle'>Component</text>" +
      "<rect class='d-box' x='140' y='62' width='80' height='40' rx='6'/><text class='d-sub' x='180' y='86' text-anchor='middle'>Action</text>" +
      "<rect class='d-box' x='250' y='62' width='84' height='40' rx='6'/><text class='d-sub' x='292' y='86' text-anchor='middle'>Reducer</text>" +
      "<rect class='d-box-accent' x='364' y='62' width='92' height='40' rx='6'/><text class='d-text' x='410' y='86' text-anchor='middle'>Store</text>" +
      "<line class='d-edge' x1='108' y1='82' x2='138' y2='82' marker-end='url(#ah-ngrx)'/><text class='d-sub' x='123' y='54' text-anchor='middle'>dispatch</text>" +
      "<line class='d-edge' x1='220' y1='82' x2='248' y2='82' marker-end='url(#ah-ngrx)'/>" +
      "<line class='d-edge' x1='334' y1='82' x2='362' y2='82' marker-end='url(#ah-ngrx)'/>" +
      "<line class='d-edge-accent' x1='410' y1='102' x2='60' y2='102' marker-end='url(#ah-ngrx)'/><text class='d-sub' x='235' y='122' text-anchor='middle'>selector (read state back into the component)</text>" +
      "</svg>\n\n" +
      "**Interview tip:** explain the **unidirectional cycle** (dispatch -&gt; reducer -&gt; new immutable state -&gt; selector -&gt; view) and what each piece is for, especially **effects** for async. The trade-off: NgRx adds **boilerplate and indirection**, so it's worth it for **large apps with lots of shared/complex state**, not a small app (where a service with signals/BehaviorSubject is plenty).",
    examples: [
      {
        label: "Reducer + selector (sketch)",
        tech: "angular",
        runnable: false,
        code: `import { createReducer, on, createAction, props, createSelector } from '@ngrx/store';

export const add = createAction('[Cart] Add', props<{ item: string }>());

export const cartReducer = createReducer(
  [] as string[],
  on(add, (state, { item }) => [...state, item]),   // pure, returns NEW state
);

// Memoized selector to read a slice of the store:
export const selectCart = (s: { cart: string[] }) => s.cart;
export const selectCount = createSelector(selectCart, (cart) => cart.length);

// In a component: this.store.dispatch(add({ item: 'book' }));
//                 count$ = this.store.select(selectCount);`,
      },
    ],
  },
  {
    title: "What is NgZone and when do you run outside Angular?",
    answer:
      "## NgZone\n\n" +
      "**`NgZone`** is Angular's wrapper around **Zone.js** — it's what notices async work (timers, events, XHR) finishing and **triggers change detection**. Usually invisible. But a **high-frequency** async task (animation loop, `mousemove`, a fast `setInterval`, a 3rd-party lib) would trigger CD on **every tick**, tanking performance.\n\n" +
      "The fix: **`ngZone.runOutsideAngular(fn)`** runs that work outside Angular's zone so it **doesn't** trigger CD; when you have a result the UI needs, re-enter with **`ngZone.run(fn)`**.\n\n" +
      "**Interview tip:** the pattern is **run hot/noisy work outside Angular, re-enter only when the view must update.** Classic uses: requestAnimationFrame loops, scroll/mousemove handlers, WebSocket floods, charting libs. Bonus: modern Angular is moving toward **zoneless** change detection (signals), which makes this less necessary.",
    examples: [
      {
        label: "runOutsideAngular for a hot loop",
        tech: "angular",
        runnable: true,
        code: `import { Component, NgZone, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<p>open the console; the fast timer does NOT trigger change detection</p>',
})
export class AppComponent implements OnInit {
  constructor(private zone: NgZone) {}

  ngOnInit() {
    this.zone.runOutsideAngular(() => {
      let n = 0;
      const id = setInterval(() => {
        n++;
        if (n % 50 === 0) console.log('tick', n, '(no CD)');
        if (n >= 200) clearInterval(id);
      }, 10);
    });
    // To update the UI from here you would wrap it in this.zone.run(() => ...)
  }
}`,
      },
    ],
  },
  {
    title: "What is ViewEncapsulation in Angular?",
    answer:
      "## ViewEncapsulation\n\n" +
      "It controls **how a component's styles are scoped** so they don't leak to (or get leaked on by) the rest of the app.\n\n" +
      "| Mode | Behavior |\n" +
      "|---|---|\n" +
      "| `Emulated` (default) | Angular adds unique attributes so styles apply only to this component (scoping without real Shadow DOM) |\n" +
      "| `ShadowDom` | uses native Shadow DOM — true browser-enforced isolation |\n" +
      "| `None` | no scoping — styles are global |\n\n" +
      "**Interview tip:** default **`Emulated`** gives you component-scoped CSS via attribute selectors (no Shadow DOM needed, works everywhere). **`None`** makes styles global (handy for theme overrides, but easy to cause leaks). **`ShadowDom`** is real isolation but limits global theming and has interop caveats.",
    examples: [
      {
        label: "Emulated encapsulation scopes styles",
        tech: "angular",
        runnable: true,
        code: `import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.Emulated,   // the default
  styles: ['p { color: teal; font-weight: bold; }'],
  template: '<p>This style is scoped to this component only.</p>',
})
export class AppComponent {}`,
      },
    ],
  },
  {
    title: "What is a FormArray?",
    answer:
      "## FormArray\n\n" +
      "In reactive forms, a **`FormArray`** is a form control that holds a **dynamic, ordered list** of controls (or groups) — perfect when the number of fields isn't known up front: a list of phone numbers, line items on an invoice, or skills on a profile. You add/remove controls at runtime with `push()` / `removeAt()`.\n\n" +
      "**Interview tip:** contrast the three building blocks: **`FormControl`** (one field), **`FormGroup`** (a fixed set of named controls), **`FormArray`** (a **variable-length** list). The template iterates the array's `controls` with `*ngFor` and binds each by index. Needs **`ReactiveFormsModule`**.",
    examples: [
      {
        label: "A dynamic list of controls",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-root',
  template:
    '<div *ngFor="let c of phones.controls; let i = index">' +
    '  <input [formControl]="c" /> <button (click)="remove(i)">x</button>' +
    '</div><button (click)="add()">Add phone</button>',
})
export class AppComponent {
  phones = new FormArray<FormControl<string | null>>([]);
  form = new FormGroup({ phones: this.phones });

  add() { this.phones.push(new FormControl('')); }   // grow at runtime
  remove(i: number) { this.phones.removeAt(i); }
}`,
      },
    ],
  },
  {
    title: "What is a directive and what are the types?",
    answer:
      "## Directives\n\n" +
      "A **directive** is a class that adds behavior to elements. Angular has three kinds:\n\n" +
      "| Type | What it does | Examples |\n" +
      "|---|---|---|\n" +
      "| Component | a directive **with a template** | every `@Component` |\n" +
      "| Structural | **changes DOM layout** (add/remove elements) | `*ngIf`, `*ngFor`, `*ngSwitch` |\n" +
      "| Attribute | **changes appearance/behavior** of an element | `ngClass`, `ngStyle`, custom `appHighlight` |\n\n" +
      "Structural directives use the `*` sugar (which expands to `<ng-template>`); attribute directives are applied like an attribute and often use `@HostBinding`/`@HostListener`.\n\n" +
      "**Interview tip:** the clean taxonomy is **component (has a template), structural (reshapes the DOM, the `*` ones), attribute (restyles/behaves)**. A custom attribute directive is the canonical example — e.g. a `highlight` directive using `@HostListener('mouseenter')` + `@HostBinding`.",
    examples: [
      {
        label: "A custom attribute directive",
        tech: "angular",
        runnable: false,
        code: `import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({ selector: '[appHighlight]' })   // attribute directive
export class HighlightDirective {
  @HostBinding('style.backgroundColor') bg = 'transparent';
  @HostListener('mouseenter') onEnter() { this.bg = 'yellow'; }
  @HostListener('mouseleave') onLeave() { this.bg = 'transparent'; }
}

// Usage: <p appHighlight>Hover me</p>`,
      },
    ],
  },
  {
    title: "What is a route resolver and when is it useful?",
    answer:
      "## Route resolvers\n\n" +
      "A **resolver** pre-fetches data **before** a route activates, so the component renders with its data already available — no flash of an empty/loading screen, and no `ngOnInit` fetch race. It's a function returning the data (or an `Observable`/`Promise` of it); the resolved value is available on `ActivatedRoute.data`.\n\n" +
      "**Interview tip:** the benefit is **the route doesn't activate until the data is ready**, giving a cleaner UX for critical data. The trade-off: navigation **waits** on the resolver, so it can feel slow — use it for small, essential payloads and pair with a loading indicator; for big/optional data, fetch in the component instead. Modern API: a functional **`ResolveFn`** with `inject()`.",
    examples: [
      {
        label: "A functional resolver",
        tech: "angular",
        runnable: false,
        code: `import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { UserService } from './user.service';

export const userResolver: ResolveFn<User> = (route) => {
  const id = route.paramMap.get('id')!;
  return inject(UserService).getUser(id);   // route waits for this
};

// Route: { path: 'user/:id', component: UserComponent, resolve: { user: userResolver } }
// Component reads it: this.route.data.subscribe(({ user }) => ...)`,
      },
    ],
  },
  {
    title: "What is a service and why use it?",
    answer:
      "## Services\n\n" +
      "A **service** is a plain `@Injectable` class for logic that isn't tied to a view — data access, business rules, shared state, logging. Components stay focused on the UI and get services via **DI**. Because a `providedIn: 'root'` service is a **singleton**, it's also the natural place to **share state** across components.\n\n" +
      "**Interview tip:** the why is **separation of concerns + reuse + testability** — keep components thin, put reusable logic in injectable services, and swap mocks in tests. A root-provided service being a **singleton** is what lets unrelated components share the same data/state (often exposed as an Observable or signal).",
    examples: [
      {
        label: "A shared singleton service",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })   // one shared instance app-wide
export class CounterService {
  private count = 0;
  increment() { return ++this.count; }
}

@Component({
  selector: 'app-root',
  template: '<button (click)="bump()">shared count: {{ value }}</button>',
})
export class AppComponent {
  value = 0;
  constructor(private counter: CounterService) {}
  bump() { this.value = this.counter.increment(); }
}`,
      },
    ],
  },
  {
    title: "What is an HTTP interceptor?",
    answer:
      "## HTTP interceptors\n\n" +
      "An **interceptor** is a function/class that sits in the **`HttpClient` pipeline** and can inspect or transform **every** outgoing request and incoming response. It's the single place for cross-cutting HTTP concerns: attaching **auth tokens**, **logging**, **caching**, showing a global **loading** indicator, and **error/retry** handling.\n\n" +
      "Requests are **immutable**, so you `clone()` them to add headers. Multiple interceptors form a chain (order matters).\n\n" +
      "**Interview tip:** describe it as **middleware for HttpClient** — runs on all requests, so you don't repeat auth/logging per call. Key detail: **clone the request** to modify it (`req.clone({ setHeaders })`). Modern Angular prefers **functional interceptors** registered via `provideHttpClient(withInterceptors([...]))`.",
    examples: [
      {
        label: "Attach an auth header to every request",
        tech: "angular",
        runnable: false,
        code: `import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Requests are immutable -> clone to add a header, then forward.
    const authed = req.clone({ setHeaders: { Authorization: 'Bearer TOKEN' } });
    return next.handle(authed);
  }
}
// Register: { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }`,
      },
    ],
  },
  {
    title: "What is content projection and ng-content?",
    answer:
      "## Content projection (ng-content)\n\n" +
      "**Content projection** lets a component accept and render **markup passed in by its parent** — Angular's version of 'slots'. Inside the component's template, **`<ng-content>`** marks where the projected content goes. Use a **`select`** attribute for **multi-slot** projection (project different chunks to different spots).\n\n" +
      "This is what makes reusable wrappers possible — cards, dialogs, layouts — that don't know their content in advance.\n\n" +
      "**Interview tip:** it's **transclusion / slots** — the parent supplies content, `<ng-content>` is the placeholder. Mention **multi-slot** projection with `<ng-content select=\"[header]\">`, and that projected content is queried with **`@ContentChild`** (resolved in `ngAfterContentInit`).",
    examples: [
      {
        label: "A card wrapper with a slot",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

// The reusable wrapper projects whatever the parent puts inside <app-card>.
@Component({
  selector: 'app-card',
  template: '<div class="card"><ng-content select="[title]"></ng-content><hr /><ng-content></ng-content></div>',
})
export class CardComponent {}

// Parent usage:
// <app-card>
//   <h3 title>My title</h3>      <- goes to the [title] slot
//   <p>Body content</p>          <- goes to the default slot
// </app-card>`,
      },
    ],
  },
  {
    title: "What is ngTemplateOutlet?",
    answer:
      "## ngTemplateOutlet\n\n" +
      "**`ngTemplateOutlet`** renders a **`<ng-template>`** at a chosen spot, optionally passing it a **`context`** object. It's how you reuse a template fragment in multiple places, build configurable/customizable components (let callers supply a template), or render the same markup with different data.\n\n" +
      "Template inputs are read with `let-x=\"key\"` from the context.\n\n" +
      "**Interview tip:** it's **render this template here, with this data.** Pair it with `@Input() template: TemplateRef` so a parent can **inject custom rendering** into your component (a common pattern for flexible lists/tables). The `context` object feeds the template's `let-` variables.",
    examples: [
      {
        label: "Render a template with context",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template:
    '<ng-template #greeting let-name="name"><p>Hello, {{ name }}!</p></ng-template>' +
    '<ng-container *ngTemplateOutlet="greeting; context: ctx"></ng-container>',
})
export class AppComponent {
  ctx = { name: 'Ada' };   // feeds the template's let-name
}`,
      },
    ],
  },
  {
    title: "What is the async pipe and why is it useful?",
    answer:
      "## The async pipe\n\n" +
      "The **`async`** pipe subscribes to an `Observable` (or `Promise`) **in the template** and returns its latest value — and crucially **unsubscribes automatically** when the component is destroyed. So `{{ data$ | async }}` gives you live data with **no manual `subscribe`/`unsubscribe`** and **no leak**.\n\n" +
      "It also plays nicely with **`OnPush`** (an emission marks the component for check) and avoids storing intermediate values on the component.\n\n" +
      "**Interview tip:** the headline benefits: **auto-unsubscribe (no leaks)**, **less boilerplate**, and **OnPush-friendly**. A common pattern is `*ngIf=\"data$ | async as data\"` to unwrap once and reuse `data` in the block. This is the recommended way to consume observables in templates.",
    examples: [
      {
        label: "Consume an observable with async",
        tech: "angular",
        runnable: true,
        code: `import { Component } from '@angular/core';
import { interval, map } from 'rxjs';

@Component({
  selector: 'app-root',
  // async subscribes AND unsubscribes for you -> no leak, no boilerplate.
  template: '<p>elapsed: {{ seconds$ | async }}s</p>',
})
export class AppComponent {
  seconds$ = interval(1000).pipe(map((n) => n + 1));
}`,
      },
    ],
  },
  {
    title: "What is an InjectionToken?",
    answer:
      "## InjectionToken\n\n" +
      "DI normally uses a **class** as the token. But for things that **aren't classes** — a config object, a string/number, an interface, or a function — there's no class to use as the key. An **`InjectionToken`** is a unique, typed token you create to provide and inject those values.\n\n" +
      "You create one (`new InjectionToken<T>('description')`), provide a value for it (`{ provide: TOKEN, useValue: ... }`), and inject it with `@Inject(TOKEN)` or `inject(TOKEN)`.\n\n" +
      "**Interview tip:** the reason it exists: **you can't use an interface or a primitive as a DI token** (interfaces vanish at runtime; strings collide). `InjectionToken` gives a **unique, type-safe** key — the idiomatic way to inject **configuration** and other non-class dependencies. Often paired with `useFactory` for computed config.",
    examples: [
      {
        label: "Provide and inject a non-class value",
        tech: "angular",
        runnable: true,
        code: `import { Component, InjectionToken, Inject } from '@angular/core';

// A unique, typed token for a non-class dependency (here, a config string).
export const API_URL = new InjectionToken<string>('API_URL');

@Component({
  selector: 'app-root',
  providers: [{ provide: API_URL, useValue: 'https://api.example.com' }],
  template: '<p>API base: {{ url }}</p>',
})
export class AppComponent {
  // Inject by token (a class type wouldn't work for a plain string).
  constructor(@Inject(API_URL) public url: string) {}
}`,
      },
    ],
  },
];

export default augments;
