/**
 * Angular Phase 1 — Batch 2 (DI & services + a couple of fundamentals).
 * Gold-standard rewrites. Conventions as in angular-augments-gold-1.ts.
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a service and why use it?",
    answer: `**Core concept (TL;DR).** A service is a reusable class — usually marked <code>@Injectable</code> — that holds logic, data access, or shared state that **isn't tied to a view**: HTTP calls, business rules, caching, app-wide state. Components stay focused on the UI and **inject** services via Dependency Injection, which keeps code reusable and testable.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Multiple components share one injected service'>
  <rect class='d-box' x='30' y='30' width='110' height='44' rx='8'/>
  <text class='d-text' x='85' y='57' text-anchor='middle'>ComponentA</text>
  <rect class='d-box' x='175' y='30' width='110' height='44' rx='8'/>
  <text class='d-text' x='230' y='57' text-anchor='middle'>ComponentB</text>
  <rect class='d-box' x='320' y='30' width='110' height='44' rx='8'/>
  <text class='d-text' x='375' y='57' text-anchor='middle'>ComponentC</text>
  <rect class='d-box-accent' x='150' y='110' width='160' height='44' rx='10'/>
  <text class='d-text' x='230' y='137' text-anchor='middle'>DataService</text>
  <defs><marker id='ah-sv' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='85' y1='74' x2='190' y2='108' marker-end='url(#ah-sv)'/>
  <line class='d-edge' x1='230' y1='74' x2='230' y2='108' marker-end='url(#ah-sv)'/>
  <line class='d-edge' x1='375' y1='74' x2='270' y2='108' marker-end='url(#ah-sv)'/>
</svg>

**How it works.** Putting shared logic in a service avoids duplicating it across components and decouples "what the UI shows" from "how data is fetched or computed." You decorate the class with <code>@Injectable({ providedIn: 'root' })</code> so Angular's injector can create and share it, then request it in a constructor or via <code>inject()</code> — you never <code>new</code> it. Because the dependency is injected, tests can swap in a mock easily. Services are also where you keep app state that multiple components need (often exposed as RxJS observables or signals), making them Angular's primary unit of reuse alongside components.

### Why services
| Benefit | How |
| --- | --- |
| reuse | one class, many components |
| separation | UI vs data/logic |
| testability | inject a mock |
| shared state | observable/signal in a service |

> **Interview tip:** "Reusable, view-independent logic/state, injected via DI." Mention <code>@Injectable({ providedIn: 'root' })</code>, that you never <code>new</code> it, and that services are where shared state (observables/signals) lives.`,
    examples: [
      {
        label: "A service injected into a component",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })   // app-wide singleton
export class CounterService {
  private count = 0;
  increment() { return ++this.count; }
}

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<button (click)="onClick()">count: {{ value }}</button>',
})
export class AppComponent {
  private counter = inject(CounterService);  // DI, no 'new'
  value = 0;
  onClick() { this.value = this.counter.increment(); }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between providing a service in root vs in a component?",
    answer: `**Core concept (TL;DR).** <code>providedIn: 'root'</code> registers the service **once for the whole app** — a single shared singleton (and it's tree-shakable). Providing it in a component's <code>providers: []</code> creates a **new instance per component instance** (shared only with that component's children), and it's destroyed when the component is. Choose root for shared state, component-level for isolated state.

<svg class='iq-diagram' viewBox='0 0 460 175' role='img' aria-label='Root provider is one singleton; component provider is one instance per component'>
  <rect class='d-box-accent' x='20' y='28' width='190' height='130' rx='10'/>
  <text class='d-text' x='115' y='52' text-anchor='middle'>providedIn: 'root'</text>
  <text class='d-sub' x='115' y='76' text-anchor='middle'>ONE app-wide singleton</text>
  <text class='d-sub' x='115' y='100' text-anchor='middle'>shared everywhere</text>
  <text class='d-sub' x='115' y='124' text-anchor='middle'>tree-shakable</text>
  <rect class='d-box' x='250' y='28' width='190' height='130' rx='10'/>
  <text class='d-text' x='345' y='52' text-anchor='middle'>component providers</text>
  <text class='d-sub' x='345' y='76' text-anchor='middle'>new instance per component</text>
  <text class='d-sub' x='345' y='100' text-anchor='middle'>scoped to it + children</text>
  <text class='d-sub' x='345' y='124' text-anchor='middle'>dies with the component</text>
</svg>

**How it works.** Angular's injectors are **hierarchical**. <code>providedIn: 'root'</code> puts the provider on the root injector, so every injection resolves to the same instance — perfect for app-wide state, caches, or stateless helpers, and unused root services are tree-shaken away. Listing a service in a component's <code>providers</code> array creates a child injector scoped to that component: each instance of the component gets its **own** service instance, shared with its template/children but isolated from siblings, and cleaned up on destroy. That's ideal when each component needs independent state (e.g. a per-widget form state service). The same applies to <code>providedIn: 'platform'</code>/<code>'any'</code> for rarer scopes.

### Root vs component provider
| | <code>providedIn: 'root'</code> | component <code>providers</code> |
| --- | --- | --- |
| Instances | one (singleton) | one per component instance |
| Shared with | the whole app | that component + children |
| Lifetime | app lifetime | component lifetime |
| Use for | shared state/services | isolated per-component state |

> **Interview tip:** "Root = one app-wide singleton; component-level = a fresh instance per component (scoped to it + children, destroyed with it)." Tie it to the hierarchical injector and choosing shared vs isolated state.`,
    examples: [
      {
        label: "Root singleton vs component-scoped",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })   // ONE shared instance app-wide
export class GlobalCart {}

@Injectable()                          // not auto-provided
export class WidgetState {}

@Component({
  selector: 'app-widget',
  standalone: true,
  providers: [WidgetState],            // NEW WidgetState per <app-widget>
  template: '...',
})
export class WidgetComponent {
  // each <app-widget> gets its own WidgetState;
  // GlobalCart is the same instance everywhere.
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between useClass, useValue, useFactory, and useExisting?",
    answer: `**Core concept (TL;DR).** They are the four **provider recipes** that tell Angular *how* to produce the value for a token. <code>useClass</code> instantiates a class, <code>useValue</code> supplies a ready-made value, <code>useFactory</code> computes one with a function (optionally using other deps), and <code>useExisting</code> **aliases** one token to another (sharing the same instance).

<svg class='iq-diagram' viewBox='0 0 460 175' role='img' aria-label='Four provider recipes: useClass, useValue, useFactory, useExisting'>
  <rect class='d-box-accent' x='20' y='28' width='200' height='52' rx='10'/>
  <text class='d-text' x='120' y='50' text-anchor='middle'>useClass: new SomeClass()</text>
  <text class='d-sub' x='120' y='68' text-anchor='middle'>swap implementations</text>
  <rect class='d-box' x='240' y='28' width='200' height='52' rx='10'/>
  <text class='d-text' x='340' y='50' text-anchor='middle'>useValue: literalValue</text>
  <text class='d-sub' x='340' y='68' text-anchor='middle'>config / constants</text>
  <rect class='d-box' x='20' y='96' width='200' height='52' rx='10'/>
  <text class='d-text' x='120' y='118' text-anchor='middle'>useFactory: () =&gt; …</text>
  <text class='d-sub' x='120' y='136' text-anchor='middle'>compute with deps</text>
  <rect class='d-box' x='240' y='96' width='200' height='52' rx='10'/>
  <text class='d-text' x='340' y='118' text-anchor='middle'>useExisting: OtherToken</text>
  <text class='d-sub' x='340' y='136' text-anchor='middle'>alias, same instance</text>
</svg>

**How it works.** A provider maps a **token** to a recipe. <code>{ provide: Logger, useClass: BetterLogger }</code> tells DI to instantiate <code>BetterLogger</code> when <code>Logger</code> is requested — the standard way to substitute implementations (and the shorthand <code>provide: Logger</code> is just <code>useClass: Logger</code>). <code>useValue</code> hands back a fixed object/primitive — ideal for config and for mocking in tests. <code>useFactory</code> runs a function to build the value, with a <code>deps</code> array injecting what the factory needs (good for conditional or runtime-computed providers). <code>useExisting</code> doesn't create anything new — it points one token at another so both resolve to the **same** instance (useful for narrowing a public token to an existing service).

### The four recipes
| Recipe | Produces | Use for |
| --- | --- | --- |
| <code>useClass</code> | a new class instance | swapping implementations |
| <code>useValue</code> | a literal value/object | config, constants, mocks |
| <code>useFactory</code> | a function's result | runtime/conditional values |
| <code>useExisting</code> | an alias (same instance) | redirecting a token |

> **Interview tip:** "<code>useClass</code> instantiates, <code>useValue</code> provides a literal, <code>useFactory</code> computes (with <code>deps</code>), <code>useExisting</code> aliases to a shared instance." Note <code>useExisting</code> reuses the instance while <code>useClass</code> creates a new one.`,
    examples: [
      {
        label: "All four recipes",
        tech: "angular",
        runnable: false,
        code: `import { InjectionToken } from '@angular/core';

class Logger {}
class BetterLogger extends Logger {}
const API_URL = new InjectionToken<string>('apiUrl');

const providers = [
  { provide: Logger, useClass: BetterLogger },        // instantiate a class
  { provide: API_URL, useValue: 'https://api.example.com' }, // literal value
  { provide: 'CONFIG', useFactory: () => ({ debug: location.hostname === 'localhost' }) },
  { provide: 'AppLogger', useExisting: Logger },       // alias → same instance
];

export { providers };`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is an InjectionToken?",
    answer: `**Core concept (TL;DR).** An <code>InjectionToken</code> is a **unique key** for injecting things that **aren't classes** — config objects, strings, functions, or interface-typed values. Because TypeScript interfaces don't exist at runtime, you can't inject by interface; a token gives DI a stable, collision-proof identity to provide and inject by.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='An InjectionToken keys a non-class value into DI'>
  <rect class='d-box-accent' x='30' y='44' width='170' height='62' rx='10'/>
  <text class='d-text' x='115' y='70' text-anchor='middle'>InjectionToken&lt;Config&gt;</text>
  <text class='d-sub' x='115' y='90' text-anchor='middle'>unique key</text>
  <defs><marker id='ah-it' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='200' y1='75' x2='258' y2='75' marker-end='url(#ah-it)'/>
  <rect class='d-box' x='260' y='44' width='170' height='62' rx='10'/>
  <text class='d-text' x='345' y='70' text-anchor='middle'>{ apiUrl, retries }</text>
  <text class='d-sub' x='345' y='90' text-anchor='middle'>provided value</text>
</svg>

**How it works.** You create one with <code>new InjectionToken&lt;T&gt;('description')</code> — the description aids debugging, and the generic <code>T</code> types what you get back. Provide a value with <code>{ provide: TOKEN, useValue: … }</code> (or <code>useFactory</code>), and inject it with <code>inject(TOKEN)</code> or <code>@Inject(TOKEN)</code> in a constructor. This is the idiomatic way to supply configuration (API URLs, feature flags), inject browser globals in a testable way, or provide multiple implementations of an interface. Tokens can also be **multi-providers** (<code>multi: true</code>) to collect an array of values — how Angular registers things like HTTP interceptors.

### InjectionToken
| Aspect | Detail |
| --- | --- |
| Create | <code>new InjectionToken&lt;T&gt;('desc')</code> |
| Provide | <code>{ provide: TOKEN, useValue }</code> |
| Inject | <code>inject(TOKEN)</code> / <code>@Inject(TOKEN)</code> |
| Multi | <code>multi: true</code> → array |

> **Interview tip:** "A unique runtime key for injecting non-class values (config, strings, interface-typed values), since interfaces vanish at runtime." Mention typed generics and <code>multi: true</code> (used for interceptors).`,
    examples: [
      {
        label: "Define, provide, and inject a token",
        tech: "angular",
        runnable: false,
        code: `import { InjectionToken, inject, Component } from '@angular/core';

export interface AppConfig { apiUrl: string; retries: number; }
export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

@Component({
  selector: 'app-root',
  standalone: true,
  providers: [
    { provide: APP_CONFIG, useValue: { apiUrl: '/api', retries: 3 } },
  ],
  template: '<p>{{ cfg.apiUrl }} (retries: {{ cfg.retries }})</p>',
})
export class AppComponent {
  cfg = inject(APP_CONFIG);   // typed as AppConfig
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Why use Renderer2 instead of direct DOM access?",
    answer: `**Core concept (TL;DR).** <code>Renderer2</code> is an abstraction over DOM manipulation. Using it (instead of touching <code>nativeElement</code> directly) keeps your code **platform-agnostic** — it works in server-side rendering, web workers, and other renderers — and **safer**, since it goes through Angular's sanitization and avoids direct, error-prone DOM coupling.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Renderer2 abstracts DOM access across platforms'>
  <rect class='d-box-accent' x='150' y='24' width='160' height='44' rx='10'/>
  <text class='d-text' x='230' y='51' text-anchor='middle'>Renderer2</text>
  <defs><marker id='ah-r2' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <rect class='d-box' x='30' y='104' width='120' height='34' rx='8'/>
  <text class='d-sub' x='90' y='125' text-anchor='middle'>browser DOM</text>
  <rect class='d-box' x='170' y='104' width='120' height='34' rx='8'/>
  <text class='d-sub' x='230' y='125' text-anchor='middle'>server (SSR)</text>
  <rect class='d-box' x='310' y='104' width='120' height='34' rx='8'/>
  <text class='d-sub' x='370' y='125' text-anchor='middle'>web worker</text>
  <line class='d-edge' x1='200' y1='68' x2='110' y2='102' marker-end='url(#ah-r2)'/>
  <line class='d-edge' x1='230' y1='68' x2='230' y2='102' marker-end='url(#ah-r2)'/>
  <line class='d-edge' x1='260' y1='68' x2='350' y2='102' marker-end='url(#ah-r2)'/>
</svg>

**How it works.** Reaching into <code>elementRef.nativeElement</code> and setting properties directly assumes a browser DOM exists — which **breaks server-side rendering** (no <code>document</code>) and other render targets, and it can open XSS holes by bypassing Angular's sanitization. <code>Renderer2</code> provides methods — <code>setProperty</code>, <code>setAttribute</code>, <code>addClass</code>, <code>setStyle</code>, <code>createElement</code>, <code>listen</code> — that the active renderer implements appropriately per platform. So the same component works under SSR or in a worker. In modern Angular you often don't need it at all: prefer **template bindings** (<code>[class.x]</code>, <code>[style.y]</code>, <code>[attr.z]</code>) which are declarative and safe; reach for <code>Renderer2</code> for imperative DOM work that bindings can't express.

### Direct DOM vs Renderer2
| | direct <code>nativeElement</code> | <code>Renderer2</code> |
| --- | --- | --- |
| SSR / workers | breaks | works |
| Safety | bypasses sanitization | renderer-mediated |
| Coupling | tight to browser DOM | abstracted |
| Prefer | avoid | imperative DOM (or bindings) |

> **Interview tip:** "<code>Renderer2</code> abstracts DOM access so code works under SSR/web-workers and stays safe." Add that **template bindings** (<code>[class]</code>/<code>[style]</code>/<code>[attr]</code>) are preferred, and direct <code>nativeElement</code> breaks SSR.`,
    examples: [
      {
        label: "Renderer2 instead of nativeElement",
        tech: "angular",
        runnable: false,
        code: `import { Directive, ElementRef, Renderer2, OnInit } from '@angular/core';

@Directive({ selector: '[appPin]', standalone: true })
export class PinDirective implements OnInit {
  constructor(private el: ElementRef, private r: Renderer2) {}

  ngOnInit() {
    // ✅ platform-safe (works under SSR), instead of el.nativeElement.style...
    this.r.setStyle(this.el.nativeElement, 'position', 'sticky');
    this.r.addClass(this.el.nativeElement, 'pinned');
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between the constructor and ngOnInit?",
    answer: `**Core concept (TL;DR).** The **constructor** runs when the class is instantiated — its job is **Dependency Injection** (receive services), not real work. <code>ngOnInit</code> is an Angular **lifecycle hook** that runs **after** Angular has set the component's <code>@Input</code> bindings, so it's where initialization that depends on inputs belongs.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Constructor runs first for DI, then inputs are set, then ngOnInit'>
  <rect class='d-box-accent' x='20' y='50' width='120' height='44' rx='8'/>
  <text class='d-text' x='80' y='70' text-anchor='middle'>constructor</text>
  <text class='d-sub' x='80' y='86' text-anchor='middle'>inject deps</text>
  <defs><marker id='ah-oi' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='140' y1='72' x2='168' y2='72' marker-end='url(#ah-oi)'/>
  <rect class='d-box' x='170' y='50' width='120' height='44' rx='8'/>
  <text class='d-text' x='230' y='70' text-anchor='middle'>@Input set</text>
  <text class='d-sub' x='230' y='86' text-anchor='middle'>bindings ready</text>
  <line class='d-edge' x1='290' y1='72' x2='318' y2='72' marker-end='url(#ah-oi)'/>
  <rect class='d-box-accent' x='320' y='50' width='120' height='44' rx='8'/>
  <text class='d-text' x='380' y='70' text-anchor='middle'>ngOnInit</text>
  <text class='d-sub' x='380' y='86' text-anchor='middle'>init logic</text>
</svg>

**How it works.** When Angular creates a component it calls the constructor to satisfy DI — so you keep it minimal (just assign injected services). At that moment the component's <code>@Input</code> values are **not yet set**, so reading them there gives <code>undefined</code>. Angular then applies the inputs and calls <code>ngOnInit</code> **once**, which is the right place for setup that needs those inputs: fetching data based on an id input, initializing forms, subscribing. Implement the <code>OnInit</code> interface for type-safety. (For reacting to *later* input changes, use <code>ngOnChanges</code>.) This separation keeps construction cheap and side-effect-free and puts real initialization in a predictable lifecycle slot.

### constructor vs ngOnInit
| | constructor | <code>ngOnInit</code> |
| --- | --- | --- |
| Runs | on instantiation | after first inputs set |
| Purpose | DI only | initialization logic |
| <code>@Input</code> available | no | yes |
| Times called | once | once |

> **Interview tip:** "Constructor = DI (inputs not ready); <code>ngOnInit</code> = init logic after inputs are bound." The classic gotcha: reading an <code>@Input</code> in the constructor gives <code>undefined</code>. Use <code>ngOnChanges</code> for later input changes.`,
    examples: [
      {
        label: "Inputs are ready in ngOnInit, not the constructor",
        tech: "angular",
        runnable: false,
        code: `import { Component, Input, OnInit, inject } from '@angular/core';

@Component({ selector: 'app-user', standalone: true, template: '{{ label }}' })
export class UserComponent implements OnInit {
  @Input() userId!: number;
  label = '';

  constructor() {
    // ⚠️ this.userId is undefined here — inputs not set yet
  }

  ngOnInit() {
    // ✅ userId is available now
    this.label = 'Loading user #' + this.userId;
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does the Angular CLI provide?",
    answer: `**Core concept (TL;DR).** The Angular CLI (<code>ng</code>) is the official command-line tool that **scaffolds, serves, builds, tests, and upgrades** Angular projects. It generates boilerplate (<code>ng generate</code>), runs a dev server with live reload (<code>ng serve</code>), produces optimized production builds (<code>ng build</code>), and keeps dependencies current (<code>ng update</code>) — all following Angular conventions.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Angular CLI commands across the project lifecycle'>
  <rect class='d-box-accent' x='20' y='50' width='100' height='48' rx='8'/>
  <text class='d-text' x='70' y='72' text-anchor='middle'>ng new</text>
  <text class='d-sub' x='70' y='88' text-anchor='middle'>scaffold</text>
  <rect class='d-box' x='135' y='50' width='100' height='48' rx='8'/>
  <text class='d-text' x='185' y='72' text-anchor='middle'>ng generate</text>
  <text class='d-sub' x='185' y='88' text-anchor='middle'>components/...</text>
  <rect class='d-box' x='250' y='50' width='90' height='48' rx='8'/>
  <text class='d-text' x='295' y='72' text-anchor='middle'>ng serve</text>
  <text class='d-sub' x='295' y='88' text-anchor='middle'>dev + HMR</text>
  <rect class='d-box' x='355' y='50' width='85' height='48' rx='8'/>
  <text class='d-text' x='397' y='72' text-anchor='middle'>ng build</text>
  <text class='d-sub' x='397' y='88' text-anchor='middle'>prod bundle</text>
</svg>

**How it works.** The CLI removes setup friction and enforces a consistent structure. <code>ng new</code> bootstraps a project (TypeScript, testing, routing options, build config). <code>ng generate</code> (alias <code>ng g</code>) scaffolds components, services, directives, pipes, and more with correct wiring and tests. <code>ng serve</code> compiles in memory and serves with live reload/HMR. <code>ng build</code> produces an optimized, tree-shaken, hashed bundle for production (with AOT). It also runs unit tests (<code>ng test</code>), lints, adds libraries with sane config (<code>ng add @angular/material</code>), and performs guided, automated upgrades across major versions (<code>ng update</code>) using **schematics**. Under the hood it uses the Angular build system (esbuild-based in recent versions).

### Common CLI commands
| Command | Does |
| --- | --- |
| <code>ng new</code> | scaffold a project |
| <code>ng generate</code> | create components/services/… |
| <code>ng serve</code> | dev server + live reload |
| <code>ng build</code> | optimized production build |
| <code>ng add</code> / <code>ng update</code> | add libs / upgrade |

> **Interview tip:** Group the commands by lifecycle: scaffold (<code>new</code>/<code>generate</code>), develop (<code>serve</code>/<code>test</code>), ship (<code>build</code>), maintain (<code>add</code>/<code>update</code>). Mention **schematics** power <code>generate</code>/<code>update</code> and that builds are AOT + tree-shaken.`,
    examples: [
      {
        label: "Everyday CLI commands",
        tech: "angular",
        runnable: false,
        code: `# scaffold a new app
ng new my-app --routing --style=scss

# generate a component and a service
ng generate component user-list
ng generate service data

# develop with live reload
ng serve --open

# production build (AOT, optimized, hashed)
ng build --configuration production

# add a library, then upgrade Angular across a major version
ng add @angular/material
ng update @angular/core @angular/cli`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Angular and how does it differ from AngularJS?",
    answer: `**Core concept (TL;DR).** **Angular** (2+) is a complete **TypeScript** rewrite of the original **AngularJS** (1.x). It replaced AngularJS's scopes/controllers and digest-cycle change detection with a **component-based**, faster architecture, plus a CLI, RxJS, mobile/SSR support, and modern tooling. They are **not** compatible — Angular is a different framework, not an upgrade.

<svg class='iq-diagram' viewBox='0 0 460 165' role='img' aria-label='AngularJS (scopes, JS) vs Angular (components, TypeScript)'>
  <rect class='d-box' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>AngularJS (1.x)</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>JavaScript</text>
  <text class='d-sub' x='120' y='96' text-anchor='middle'>scopes + controllers</text>
  <text class='d-sub' x='120' y='114' text-anchor='middle'>digest-cycle CD</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>Angular (2+)</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>TypeScript</text>
  <text class='d-sub' x='340' y='96' text-anchor='middle'>components + DI</text>
  <text class='d-sub' x='340' y='114' text-anchor='middle'>faster CD + CLI + RxJS</text>
</svg>

**How it works.** AngularJS pioneered declarative templates and two-way binding but relied on <code>$scope</code>, controllers, and a **digest loop** that dirty-checked everything — which didn't scale well. Angular re-architected around **components** (a class + template) with a clear, top-down change detection (zone-based, now moving to signals), strong **TypeScript** typing, hierarchical **Dependency Injection**, **RxJS** for async, and a powerful **CLI**. It targets the web, mobile (via Ionic/NativeScript), and the server (SSR), with AOT compilation for performance. Because the model is fundamentally different, migrating from AngularJS is a rewrite/incremental-upgrade effort, not a version bump — and AngularJS itself is now end-of-life.

### AngularJS vs Angular
| | AngularJS (1.x) | Angular (2+) |
| --- | --- | --- |
| Language | JavaScript | TypeScript |
| Architecture | scopes/controllers | components + DI |
| Change detection | digest loop (dirty check) | top-down (zone/signals) |
| Tooling | minimal | CLI, RxJS, AOT, SSR |

> **Interview tip:** "Angular (2+) is a TypeScript, component-based **rewrite** of AngularJS — not backward compatible." Contrast scopes/controllers/digest with components/DI/faster change detection, and note AngularJS is EOL.`,
    examples: [
      {
        label: "AngularJS controller vs Angular component",
        tech: "angular",
        runnable: false,
        code: `// AngularJS (1.x) — scope + controller (legacy)
//   app.controller('GreetCtrl', function ($scope) {
//     $scope.name = 'World';
//   });
//   <div ng-controller="GreetCtrl">Hello {{name}}</div>

// Angular (2+) — a typed, component-based class
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<h3>Hello {{ name }}</h3>',
})
export class AppComponent {
  name = 'World';   // typed class property, no $scope
}`,
      },
    ],
  },
];

export default augments;
