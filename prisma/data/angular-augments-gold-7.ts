import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  {
    title: "What are Deferrable Views (@defer) and how do they work in Angular 17+?",
    answer: `**Core concept.** Deferrable Views (via the <code>@defer</code> template block) let Angular lazily load component, directive, and pipe dependencies directly from the template. It automates code-splitting: any dependencies inside a <code>@defer</code> block are placed in their own lazy chunk and loaded only when specific triggers (like viewport proximity, hover, or timer) are met.

<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Deferrable views load code dynamically'>
  <rect class='d-box-muted' x='20' y='20' width='440' height='140' rx='10'/>
  <text class='d-text' x='40' y='44'>@defer (on viewport)</text>
  <rect class='d-box-accent' x='40' y='60' width='110' height='80' rx='8'/>
  <text class='d-text' x='95' y='100' text-anchor='middle'>@placeholder</text>
  <path class='d-edge-accent' d='M 170 100 L 290 100' marker-end='url(#ah-sa)'/>
  <text class='d-sub' x='230' y='90' text-anchor='middle'>viewport visible</text>
  <rect class='d-box' x='310' y='60' width='130' height='80' rx='8'/>
  <text class='d-text' x='375' y='92' text-anchor='middle'>LazyComponent</text>
  <text class='d-sub' x='375' y='110' text-anchor='middle'>Loaded & Compiled</text>
</svg>

**How it works.** Behind the scenes, the Angular compiler extracts all components, directives, and pipes referenced inside <code>@defer</code> into a separate dynamic import bundle. At runtime, the placeholder block renders initially. Once the trigger condition matches (e.g. <code>on viewport</code>, <code>on idle</code>, <code>on hover</code>, <code>on timer(2s)</code>, or logical <code>when cond</code>), Angular requests the bundle and replaces the placeholder with the actual component. You can also specify <code>@loading</code> and <code>@error</code> blocks to cover network state transitions.

### Defer Triggers
| Trigger | Action | Use Case |
| --- | --- | --- |
| <code>on idle</code> | Loads as soon as browser is idle | Non-critical widgets below page folds |
| <code>on viewport</code> | Loads when content enters viewport | Comments sections, maps, large charts |
| <code>on hover</code> | Loads when mouse hovers the placeholder | Detail overlays, preview tooltips |
| <code>on interaction</code> | Loads when element is clicked/focused | Heavy editors, forms triggered by buttons |
| <code>on timer(ms)</code> | Loads after a duration | Deferred analytics or chat popups |

> **Interview tip:** Highlight that <code>@defer</code> is a compiler-driven feature that makes page-level code-splitting trivial without manual router configurations. Point out that the component inside <code>@defer</code> must be **standalone** for code-splitting to work.`,
    examples: [
      {
        label: "Deferrable view with viewport and placeholder triggers",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { HeavyChartComponent } from './heavy-chart.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeavyChartComponent],
  template: '<h2>Dashboard</h2>' +
    '<div style="height: 1200px;">Scroll down to see chart...</div>' +
    '@defer (on viewport) {' +
    '  <app-heavy-chart></app-heavy-chart>' +
    '} @placeholder {' +
    '  <div class="skeleton">Loading placeholder...</div>' +
    '} @loading {' +
    '  <p>Fetching chart bundle...</p>' +
    '} @error {' +
    '  <p>Failed to load chart dependencies.</p>' +
    '}'
})
export class AppComponent {}`
      }
    ]
  },
  {
    title: "What is the difference between constructor-based DI and the inject() function?",
    answer: `**Core concept.** Constructor-based DI resolves dependencies via typescript constructor parameter types. The **<code>inject()</code>** function (introduced in Angular 14) is a runtime function that resolves a token within the current **injection context**. It allows fetching dependencies in field declarations, functional guards, and helper functions without declaring a constructor.

### inject() vs Constructor
| Feature | Constructor DI | inject() function |
| --- | --- | --- |
| Syntax | <code>constructor(private svc: MyService)</code> | <code>svc = inject(MyService);</code> |
| Boilerplate | High (needs constructor signature) | Low (direct assignment) |
| Usage location | Class constructor only | Field initializers, constructor, functional APIs |
| Inheritability | Hard (subclasses must call <code>super()</code>) | Easy (inherits fields automatically) |

> **Interview tip:** Mention that <code>inject()</code> makes subclassing components with shared logic far simpler, since you don't need to pass parent dependencies down through <code>super(...)</code>. Emphasize that <code>inject()</code> must be run during the **construction phase** of a class (or within functional guards/resolvers) or it will throw an "injection context" error.`,
    examples: [
      {
        label: "Comparison of constructor-based DI and functional inject()",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {}

// 1. Classical constructor approach
@Component({
  selector: 'app-legacy-user',
  template: '...'
})
export class LegacyUserComponent {
  constructor(public userService: UserService, private http: HttpClient) {}
}

// 2. Modern inject() approach
@Component({
  selector: 'app-modern-user',
  template: '...'
})
export class ModernUserComponent {
  userService = inject(UserService); // Field injection
  private http = inject(HttpClient);
}`
      }
    ]
  },
  {
    title: "Explain the new Control Flow (@if, @for, @switch) and how it compares to structural directives.",
    answer: `**Core concept.** In Angular 17, the framework replaced legacy structural directives (<code>*ngIf</code>, <code>*ngFor</code>, <code>*ngSwitch</code>) with a built-in compiler-level block control flow (<code>@if</code>, <code>@for</code>, <code>@switch</code>). It offers a cleaner syntax, requires zero imports in standalone components, enforces the performance-critical <code>track</code> key in loops, and compiles down to optimized JavaScript code.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Control flow compared to directives'>
  <rect class='d-box-muted' x='20' y='20' width='180' height='120' rx='8'/>
  <text class='d-text' x='110' y='44' text-anchor='middle'>*ngIf / *ngFor</text>
  <text class='d-sub' x='110' y='75' text-anchor='middle'>Requires CommonModule</text>
  <text class='d-sub' x='110' y='95' text-anchor='middle'>Directives parsed at runtime</text>
  <text class='d-sub' x='110' y='115' text-anchor='middle'>No empty placeholder built-in</text>

  <rect class='d-box-accent' x='260' y='20' width='180' height='120' rx='8'/>
  <text class='d-text' x='350' y='44' text-anchor='middle'>@if / @for</text>
  <text class='d-sub' x='350' y='75' text-anchor='middle'>Zero imports needed</text>
  <text class='d-sub' x='350' y='95' text-anchor='middle'>Compiled to JS checks</text>
  <text class='d-sub' x='350' y='115' text-anchor='middle'>Build-in @empty branch</text>
</svg>

**How it works.** Since legacy structural directives are directives, Angular had to evaluate them at runtime via the DOM-binding system. The new block syntax compiles directly into native runtime instructions. Furthermore, <code>@for</code> enforces a <code>track</code> expression (similar to the older <code>trackBy</code> function) to avoid index-based render leaks, and includes an <code>@empty</code> block that renders when the list has no elements.

### Comparison
| Feature | Structural Directives | Built-in Control Flow |
| --- | --- | --- |
| Syntax | <code>*ngIf=\"cond\"</code>, <code>*ngFor=\"...\"</code> | <code>@if (cond) {}</code>, <code>@for (...; track ...) {}</code> |
| Imports | Must import <code>CommonModule</code> / <code>NgIf</code> | Built-in (no imports needed) |
| trackBy | Optional (risking slow loops) | Mandatory (enforced by compiler) |
| Empty lists | Requires nested <code>*ngIf=\"!items.length\"</code> | Built-in <code>@empty</code> block |
| Compilation | Directive parsing | Native Javascript instructions |

> **Interview tip:** Be sure to state that the new Control Flow is not just syntactic sugar; it is significantly faster (often 30-90% faster in loop updates) and decreases bundle size since the template parser does not need to load the complex structural directive code.`,
    examples: [
      {
        label: "Modern block control flow in Action",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-flow-demo',
  standalone: true,
  template: '<h3>Users</h3>' +
    '@if (isAdmin) {' +
    '  <p class=\"badge\">Admin Panel Mode</p>' +
    '} @else {' +
    '  <p class=\"badge\">User Mode</p>' +
    '}' +
    '<ul>' +
    '  @for (user of users; track user.id; let idx = $index) {' +
    '    <li>#{{ idx }}: {{ user.name }}</li>' +
    '  } @empty {' +
    '    <li>No users registered.</li>' +
    '  }' +
    '</ul>'
})
export class FlowDemoComponent {
  isAdmin = false;
  users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
}`
      }
    ]
  },
  {
    title: "How does Hydration work in modern Angular SSR, and what is non-destructive hydration?",
    answer: `**Core concept.** Hydration is the process of attaching event listeners and reactivity to a server-rendered HTML page on the client side. Modern Angular (v16+) uses **non-destructive hydration** — meaning the browser takes the pre-rendered DOM, walks it, maps components to existing HTML nodes, and activates them. This avoids the old destructive method of tearing down the DOM and re-rendering everything from scratch, preventing flash-of-unstyled-content (FOUC).

**How it works.**
1. **Server-side:** Angular renders the application to string HTML and serializes the application state (e.g. transfer state, interceptor state) into a script block.
2. **Client-side:** Angular bootstraps. Instead of deleting the DOM, it matches component templates against the existing server-delivered HTML elements.
3. **Reconciliation:** It assigns event listeners to elements and hooks up component logic (such as Signals and Observables).

### Destructive vs Non-destructive Hydration
| Feature | Legacy SSR (Destructive) | Modern SSR (Non-destructive) |
| --- | --- | --- |
| DOM Treatment | Tearing down DOM and re-creating it | Reuses existing DOM nodes completely |
| Screen Flicker | High (during recreation) | None |
| Performance Metrics | Slow First Input Delay (FID) | Fast LCP and interaction readiness |
| State Transfer | Required custom serializers | Handled automatically |

> **Interview tip:** Be prepared to explain that hydration works out-of-the-box in Angular 17+ by calling <code>provideClientHydration()</code> in the bootstrap providers. If asked about performance benefits, state that it directly improves **Largest Contentful Paint (LCP)** and reduces **Cumulative Layout Shift (CLS)**.`,
    examples: [
      {
        label: "Enabling Client Hydration during Bootstrap",
        tech: "angular",
        runnable: false,
        code: `import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<h1>Hydration Active</h1>'
})
export class AppComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration()
  ]
});`
      }
    ]
  },
  {
    title: "How do you handle SSR hydration mismatch errors using ngSkipHydration?",
    answer: `**Core concept.** A hydration mismatch occurs when the server-rendered DOM is structurally different from the initial DOM computed on the client. To resolve local mismatch errors that cannot be easily fixed (e.g. rendering random values, dynamic times, or relying on browser-only variables like <code>window</code>), you can add the **<code>ngSkipHydration</code>** attribute to a component's host element.

**How it works.** When Angular reconciles the DOM and encounters the <code>ngSkipHydration</code> attribute on an element, it stops attempting to hydrate that component and its entire child subtree. Instead, it falls back to the old behavior: it clears the HTML inside that subtree and renders it from scratch on the client, isolating hydration issues.

### Common Mismatch Causes
1. **Direct DOM Manipulation:** Bypassing Angular APIs (e.g., direct <code>document.body.appendChild</code>).
2. **Browser-Only API calls:** Using <code>window</code> or <code>localStorage</code> during SSR without checks.
3. **Dynamic state:** Using random seeds (<code>Math.random()</code>) or timestamps (<code>new Date()</code>) during template initialization.
4. **Invalid HTML:** Incorrect structure like nested tables or tags that browsers autofix.

> **Interview tip:** Advise that <code>ngSkipHydration</code> should be used as a last resort. The correct architectural fix is to keep components isomorphic, use <code>isPlatformBrowser</code> from <code>@angular/common</code>, or wrap browser-only code in <code>afterNextRender</code> so it runs only on the client.`,
    examples: [
      {
        label: "Using ngSkipHydration to bypass client reconciliation",
        tech: "angular",
        runnable: false,
        code: `import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-clock',
  standalone: true,
  template: '<div ngSkipHydration><p>Client Time: {{ currentTime }}</p></div>'
})
export class ClockComponent implements OnInit {
  currentTime = '';
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.currentTime = new Date().toLocaleTimeString();
    }
  }
}`
      }
    ]
  },
  {
    title: "What is the effect() function in Angular Signals, and when should you NOT use it?",
    answer: `**Core concept.** An **<code>effect()</code>** is a reactive block that registers dependencies on any signals accessed inside it. It executes its code when those signals emit new values. While useful for side-effects like custom DOM manipulation, local storage persistence, or telemetry, it should **never** be used to write values to other signals or calculate derived state (which is the job of <code>computed()</code>).

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Signal Effect pipeline'>
  <rect class='d-box' x='20' y='60' width='100' height='50' rx='5'/>
  <text class='d-text' x='70' y='90' text-anchor='middle'>Signal</text>
  <path class='d-edge' d='M 120 85 L 200 85' marker-end='url(#ah-sa)'/>
  <rect class='d-box-accent' x='200' y='60' width='100' height='50' rx='5'/>
  <text class='d-text' x='250' y='90' text-anchor='middle'>effect()</text>
  <path class='d-edge-accent' d='M 300 85 L 380 85' marker-end='url(#ah-sa)'/>
  <rect class='d-box-muted' x='380' y='60' width='60' height='50' rx='5'/>
  <text class='d-text' x='410' y='90' text-anchor='middle'>DOM</text>
</svg>

**Why writing to signals in an effect is bad:** By default, writing to a signal inside an <code>effect()</code> will throw a runtime error (unless <code>allowSignalWrites: true</code> is explicitly configured). Writing to signals in effects creates chaotic data flows, risks infinite dependency cycles, and makes state debugging extremely hard.

### Do's and Don'ts of effects
| Good Use Cases | Bad / Anti-Patterns |
| --- | --- |
| Synchronizing a canvas or chart | Updating another signal (use <code>computed</code> instead) |
| Storing values in <code>localStorage</code> | Fetching data (use RxJS/services instead) |
| Running custom logging/analytics | Managing component loading states |

> **Interview tip:** Be strict: "Effects are for **synchronization with external systems**, not state propagation." Mention that effects run asynchronously in microtask queues, whereas <code>computed</code> signals evaluate lazily.`,
    examples: [
      {
        label: "Proper use of an effect to synchronize state to LocalStorage",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-theme-selector',
  standalone: true,
  template: '<button (click)=\"toggleTheme()\">Toggle Theme: {{ theme() }}</button>'
})
export class ThemeSelectorComponent {
  theme = signal('light');

  constructor() {
    effect(() => {
      localStorage.setItem('user-theme', this.theme());
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
}`
      }
    ]
  },
  {
    title: "What is the difference between computed() signals and standard method/getter calls in templates?",
    answer: `**Core concept.** A **<code>computed()</code>** signal creates a read-only dependency that caches its computed value and recalculates **only** when its input signals change. Conversely, template method calls or getters evaluate **on every single change detection cycle**, creating massive CPU overhead for heavy logic.

### computed() vs Getters/Methods
| Metric | computed() Signal | Template Getter / Method |
| --- | --- | --- |
| Evaluation | Lazy (only when accessed) | Eager (on every change detection check) |
| Caching | Yes (memoized value) | No (recomputes every time) |
| Dependency tracking | Automatic | None |
| Performance | High, constant time O(1) | Can cause lag if doing complex calculations |

> **Interview tip:** Explain that because standard Angular change detection is triggered by mouse moves, clicks, timers, and HTTP requests, a simple getter or method inside a template might execute hundreds of times a minute. Replacing these with <code>computed()</code> signals provides immediate performance optimizations.`,
    examples: [
      {
        label: "Caching values with computed()",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-cart-total',
  standalone: true,
  template: '<div>' +
    '  <p>Tax (Signals): {{ taxAmount() }}</p>' +
    '  <p>Tax (Method): {{ getTaxAmountMethod() }}</p>' +
    '</div>'
})
export class CartTotalComponent {
  subtotal = signal(100);
  taxRate = signal(0.15);

  taxAmount = computed(() => this.subtotal() * this.taxRate());

  getTaxAmountMethod() {
    return this.subtotal() * this.taxRate();
  }
}`
      }
    ]
  },
  {
    title: "What are functional Route Guards, and how do they differ from class-based guards?",
    answer: `**Core concept.** Functional Route Guards (introduced in Angular 15) are plain TypeScript functions that return a boolean, a <code>UrlTree</code>, an <code>Observable</code>, or a <code>Promise</code> directly. They replace the older class-based guards that implemented interfaces like <code>CanActivate</code>. By leveraging the <code>inject()</code> function, they remove boilerplate class declarations and are much easier to compose.

### Functional vs Class-based Guards
| Feature | Class-based Guard | Functional Guard |
| --- | --- | --- |
| Configuration | Needs <code>@Injectable()</code> and <code>implements CanActivate</code> | Simple function of type <code>CanActivateFn</code> |
| Boilerplate | High | Low |
| DI Access | Constructor injection | <code>inject(Service)</code> calls |
| Composition | Difficult to combine | Easy to chain and pass variables |
| State | Deprecated since v15.2 | Recommended Standard |

> **Interview tip:** Mention that class-based route guards are deprecated in modern Angular. If asked how to pass parameters (e.g. required user roles) to functional guards, explain that you can write a higher-order factory function like <code>hasRole('admin')</code> that returns a functional guard.`,
    examples: [
      {
        label: "Functional route guard with inject()",
        tech: "angular",
        runnable: false,
        code: `import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  
  return router.parseUrl('/login');
};`
      }
    ]
  },
  {
    title: "What are functional HTTP Interceptors in modern Angular, and how do you register them?",
    answer: `**Core concept.** Functional HTTP Interceptors (introduced in Angular 15) are functions of type <code>HttpInterceptorFn</code>. They take a request and a next-handler, modify the request/response stream, and are registered directly inside <code>provideHttpClient()</code>. This removes the legacy boilerplate of declaring classes with provider arrays.

**How it works.** Functional interceptors run in a pipeline. A request is passed through the interceptors sequentially. The final interceptor forwards the request to the HTTP backend handler.

### Functional vs Class Interceptors
| Feature | Legacy Class Interceptor | Functional Interceptor |
| --- | --- | --- |
| Definition | <code>@Injectable() class implements HttpInterceptor</code> | <code>HttpInterceptorFn</code> |
| Providers syntax | <code>{ provide: HTTP_INTERCEPTORS, useClass: ... }</code> | <code>withInterceptors([myInterceptor])</code> |
| Dependency lookup | Constructor injection | <code>inject(Service)</code> inside the function |
| Bundler optimizations | Harder to tree-shake | Highly tree-shakable |

> **Interview tip:** Be prepared to write or explain the double-hook pattern: how to clone a request to modify headers, and how to capture the response stream using RxJS operators inside a functional interceptor.`,
    examples: [
      {
        label: "An auth-token functional interceptor",
        tech: "angular",
        runnable: false,
        code: `import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = inject(AuthService).getToken();

  if (token) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token)
    });
    return next(clonedReq);
  }

  return next(req);
};`
      }
    ]
  },
  {
    title: "What is provideHttpClient(withInterceptors([...])) and how does it replace legacy HTTP interceptor providing?",
    answer: `**Core concept.** Modern Angular replaces the legacy <code>HttpClientModule</code> with the **<code>provideHttpClient()</code>** config function. Interceptors are registered by passing <code>withInterceptors([fn1, fn2])</code> as an argument. This replaces the complex class DI configuration token <code>HTTP_INTERCEPTORS</code>.

### Legacy vs Modern HTTP Providers Configuration
* **Legacy:**
  \`\`\`typescript
  @NgModule({
    imports: [HttpClientModule],
    providers: [
      { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
    ]
  })
  \`\`\`
* **Modern (Standalone):**
  \`\`\`typescript
  bootstrapApplication(AppComponent, {
    providers: [
      provideHttpClient(
        withInterceptors([authInterceptor])
      )
    ]
  });
  \`\`\`

> **Interview tip:** Highlight that <code>withInterceptors</code> resolves ordering explicitly. The index order in the array matches the exact order of execution. If you need class-based interceptors in a hybrid app, you can use <code>withInterceptorsFromDi()</code> as a fallback.`,
    examples: [
      {
        label: "Configuring HttpClient with interceptors",
        tech: "angular",
        runnable: false,
        code: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component } from '@angular/core';
import { authInterceptor } from './auth.interceptor';
import { loggingInterceptor } from './logging.interceptor';

@Component({ selector: 'app-root', template: '<h1>App</h1>' })
export class AppComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        loggingInterceptor
      ])
    )
  ]
});`
      }
    ]
  },
  {
    title: "Explain what output() and outputFromObservable() are in modern Angular and how they differ from @Output().",
    answer: `**Core concept.** In Angular 17.3+, the framework introduced the **<code>output()</code>** initializer to declare child component outputs, matching the style of modern signals-based inputs. It returns a <code>OutputEmitterRef</code>. Unlike the legacy <code>@Output()</code>, it is not signals-based itself but is fully integrated with signal-driven components and doesn't require a decorator. **<code>outputFromObservable()</code>** acts as a bridge that turns an RxJS stream into an output event channel.

### output() vs @Output()
| Feature | @Output() | output() function |
| --- | --- | --- |
| Syntax | <code>@Output() clicked = new EventEmitter();</code> | <code>clicked = output();</code> |
| Native Type | <code>EventEmitter&lt;T&gt;</code> | <code>OutputEmitterRef&lt;T&gt;</code> |
| Code-splitting | Direct decorator lookup | Clean TS initializer |
| RxJS Integration | Needs manual subscription/teardown | <code>outputFromObservable(myObservable$)</code> |

> **Interview tip:** Clarify that <code>output()</code> does *not* return a Signal (since outputs are streams of events, not states). However, explain that it offers consistent syntax with signal-based inputs (<code>input()</code>) and simplifies RxJS stream outputs by handling automatic cleanup on destroy.`,
    examples: [
      {
        label: "Declaring outputs with the output() API",
        tech: "angular",
        runnable: false,
        code: `import { Component, output } from '@angular/core';
import { interval } from 'rxjs';
import { outputFromObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-timer-button',
  standalone: true,
  template: '<button (click)=\"triggerEvent()\">Click Me</button>'
})
export class TimerButtonComponent {
  btnClick = output<string>();
  timerTick = outputFromObservable(interval(1000));

  triggerEvent() {
    this.btnClick.emit('Button clicked!');
  }
}`
      }
    ]
  },
  {
    title: "What is the purpose of ngOnChanges and how does it capture changes in @Input properties?",
    answer: `**Core concept.** **<code>ngOnChanges</code>** is a lifecycle hook that executes when any <code>@Input</code> bound property changes. It receives a **<code>SimpleChanges</code>** object containing the current and previous values of the changed inputs. This hook runs before <code>ngOnInit</code> and on every subsequent change of an input property.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='ngOnChanges execution loop'>
  <rect class='d-box' x='20' y='60' width='100' height='50' rx='5'/>
  <text class='d-text' x='70' y='90' text-anchor='middle'>Input bound</text>
  <path class='d-edge' d='M 120 85 L 180 85' marker-end='url(#ah-sa)'/>
  <rect class='d-box-accent' x='180' y='60' width='110' height='50' rx='5'/>
  <text class='d-text' x='235' y='90' text-anchor='middle'>ngOnChanges</text>
  <path class='d-edge-accent' d='M 290 85 L 350 85' marker-end='url(#ah-sa)'/>
  <rect class='d-box' x='350' y='60' width='90' height='50' rx='5'/>
  <text class='d-text' x='395' y='90' text-anchor='middle'>ngOnInit</text>
</svg>

**Key aspects.**
- It only triggers if the reference changes (for objects/arrays) or if primitives change values. Modifying a property *inside* an object bound to <code>@Input</code> does not trigger <code>ngOnChanges</code> because the object reference remains the same.
- It receives a <code>SimpleChanges</code> argument containing <code>SimpleChange</code> properties.

> **Interview tip:** Emphasize that <code>ngOnChanges</code> requires reference checks. If a developer mutates an array (<code>arr.push(x)</code>) and passes it down, <code>ngOnChanges</code> will **not** trigger. They must pass a new array reference (<code>[...arr, x]</code>). If asked about modern signals, state that signal-based inputs (<code>input()</code>) replace <code>ngOnChanges</code> with computed values or effects.`,
    examples: [
      {
        label: "Capturing input changes with ngOnChanges",
        tech: "angular",
        runnable: false,
        code: `import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  template: '<p>User: {{ userId }} (Total changes: {{ changeCount }})</p>'
})
export class UserDetailComponent implements OnChanges {
  @Input() userId!: number;
  changeCount = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId']) {
      const current = changes['userId'].currentValue;
      const previous = changes['userId'].previousValue;
      
      console.log('userId changed from ' + previous + ' to ' + current);
      this.changeCount++;
    }
  }
}`
      }
    ]
  },
  {
    title: "How do you pass data between sibling components that don't have a direct parent-child relationship?",
    answer: `**Core concept.** Sibling component data sharing is achieved using a **shared service** registered at their closest common ancestor or in the application root injector. The service hosts a source of reactivity — either a **Signal** or an RxJS **Subject/BehaviorSubject**. One sibling pushes updates into the service, and the other sibling binds to the Signal or subscribes to the Observable.

<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='Shared service sharing state between siblings'>
  <rect class='d-box-muted' x='170' y='20' width='120' height='40' rx='5'/>
  <text class='d-text' x='230' y='45' text-anchor='middle'>Parent Component</text>
  <rect class='d-box' x='40' y='110' width='110' height='50' rx='5'/>
  <text class='d-text' x='95' y='140' text-anchor='middle'>Sibling A (Writer)</text>
  <rect class='d-box' x='310' y='110' width='110' height='50' rx='5'/>
  <text class='d-text' x='365' y='140' text-anchor='middle'>Sibling B (Reader)</text>
  <rect class='d-box-accent' x='170' y='110' width='120' height='50' rx='5'/>
  <text class='d-text' x='230' y='130' text-anchor='middle'>Shared Service</text>
  <text class='d-sub' x='230' y='145' text-anchor='middle'>Subject / Signal</text>

  <path class='d-edge' d='M 150 135 L 170 135' marker-end='url(#ah-sa)'/>
  <path class='d-edge' d='M 290 135 L 310 135' marker-end='url(#ah-sa)'/>
</svg>

### Methods of Sibling Communication
| Method | Strategy | Pros | Cons |
| --- | --- | --- | --- |
| **Shared Service** | Shared reactive container (<code>Subject</code> or <code>Signal</code>) | Simple, decoupled, fast | Needs clean subscription teardowns |
| **Parent Relay** | <code>@Output</code> -&gt; Parent -&gt; <code>@Input</code> | No service needed | High boilerplate (bubbles up/down) |
| **State Store** | NgRx / State Management | Highly scalable, structural | Heavy architecture for simple actions |

> **Interview tip:** Standardize on **Shared Services** as the primary answer. Compare the RxJS version (<code>BehaviorSubject</code> needing subscription or async pipe) with the Signals version (simpler, direct template execution without async pipe, no memory leak concerns).`,
    examples: [
      {
        label: "Sibling data sharing using a shared service and Signals",
        tech: "angular",
        runnable: false,
        code: `import { Injectable, Component, signal, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataService {
  private messageSignal = signal<string>('Hello');
  message = this.messageSignal.asReadonly();

  updateMessage(newMsg: string) {
    this.messageSignal.set(newMsg);
  }
}

@Component({
  selector: 'app-sibling-a',
  standalone: true,
  template: '<button (click)=\"send()\">Send Alert</button>'
})
export class SiblingAComponent {
  private dataService = inject(DataService);
  send() {
    this.dataService.updateMessage('Clicked in Sibling A');
  }
}

@Component({
  selector: 'app-sibling-b',
  standalone: true,
  template: '<p>Message: {{ dataService.message() }}</p>'
})
export class SiblingBComponent {
  dataService = inject(DataService);
}`
      }
    ]
  },
  {
    title: "What is the difference between afterRender and afterNextRender lifecycle hooks?",
    answer: `**Core concept.** **<code>afterRender</code>** and **<code>afterNextRender</code>** (introduced in Angular 16) are DOM-rendering lifecycle functions. They run **only in the browser** after Angular has finished updating the DOM. <code>afterRender</code> runs on **every** subsequent change detection rendering cycle. <code>afterNextRender</code> runs **exactly once** during the next rendering cycle.

### afterRender vs afterNextRender
| Feature | afterRender | afterNextRender |
| --- | --- | --- |
| Frequency | Every render cycle | Only the next render cycle (once) |
| SSR Compatibility | Safe (ignored on server) | Safe (ignored on server) |
| Typical Use Case | Canvas updates, layout shifts check | Third-party charts init, focus input |
| Overhead | High (must be lightweight) | Minimal |

> **Interview tip:** Stress that these are **functions** called in the constructor, not interfaces implemented by the class (like <code>AfterViewInit</code>). Explain that they solve the classic SSR issue: because they never run on the server, they are the ideal places to put browser-only calls like <code>new Chart(...)</code> or canvas manipulations without needing platform checks.`,
    examples: [
      {
        label: "Using afterNextRender for third-party library initialization",
        tech: "angular",
        runnable: false,
        code: `import { Component, ElementRef, ViewChild, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-chart-wrapper',
  standalone: true,
  template: '<div #chartHost></div>'
})
export class ChartWrapperComponent {
  @ViewChild('chartHost') host!: ElementRef;

  constructor() {
    afterNextRender(() => {
      this.initThirdPartyLibrary(this.host.nativeElement);
    });
  }

  initThirdPartyLibrary(el: HTMLElement) {
    el.innerText = 'Dynamic Canvas Rendered here';
  }
}`
      }
    ]
  },
  {
    title: "How does Angular's dependency resolution search work using @Self(), @SkipSelf(), @Optional(), and @Host()?",
    answer: `**Core concept.** Angular's Hierarchical Dependency Injection walks up the component tree to resolve tokens. **Resolution modifiers** (decorators or parameters inside <code>inject()</code>) modify this search behavior by changing where the injector starts, stops, or how it behaves when a dependency is missing.

<svg class='iq-diagram' viewBox='0 0 460 200' role='img' aria-label='DI resolution hierarchy'>
  <rect class='d-box-muted' x='40' y='20' width='380' height='40' rx='5'/>
  <text class='d-text' x='230' y='45' text-anchor='middle'>Parent Injector (SkipSelf starts here)</text>
  <rect class='d-box' x='40' y='80' width='380' height='40' rx='5'/>
  <text class='d-text' x='230' y='105' text-anchor='middle'>Component Host Injector (Host stops here)</text>
  <rect class='d-box-accent' x='40' y='140' width='380' height='40' rx='5'/>
  <text class='d-text' x='230' y='165' text-anchor='middle'>Current Component Injector (Self stops here)</text>

  <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L0,6 L9,3 Z'/></marker></defs>
  <path class='d-edge' d='M 230 140 L 230 120' marker-end='url(#arrow)'/>
  <path class='d-edge' d='M 230 80 L 230 65' marker-end='url(#arrow)'/>
</svg>

### Modifier Definitions
| Modifier | Scope / Behavior | Failure Action |
| --- | --- | --- |
| **<code>@Self()</code>** | Look ONLY in the current component injector | Throws error if not found |
| **<code>@SkipSelf()</code>** | Ignore current injector; start searching from parent up | Throws error if not found |
| **<code>@Host()</code>** | Look in current up to the boundary of the template's host | Throws error if not found |
| **<code>@Optional()</code>** | Modifies search to return <code>null</code> instead of throwing | Safe (returns <code>null</code>) |

> **Interview tip:** Be ready to give a real-world scenario. E.g. "We use <code>@SkipSelf()</code> when building a hierarchical tree component where a child node needs to inject the tree service of its parent node, without getting its own local tree service."`,
    examples: [
      {
        label: "Using resolution modifiers in a component constructor",
        tech: "angular",
        runnable: false,
        code: `import { Component, Optional, Self, SkipSelf, Host } from '@angular/core';

@Injectable()
export class LoggerService {}

@Component({
  selector: 'app-sandbox',
  providers: [LoggerService],
  template: '...'
})
export class SandboxComponent {
  constructor(
    @Self() private localLogger: LoggerService,
    @SkipSelf() private parentLogger: LoggerService,
    @Host() private hostLogger: LoggerService,
    @Optional() private optionalLogger: LoggerService | null
  ) {}
}`
      }
    ]
  },
  {
    title: "What is standard content projection vs. Multi-Slot Content Projection?",
    answer: `**Core concept.** **Content projection** allows a component to receive and render custom HTML structure from its parent container using the <code>&lt;ng-content&gt;</code> element. Standard projection outputs everything into a single spot. **Multi-Slot Content Projection** defines multiple named slots using the **<code>select</code>** attribute on <code>ng-content</code> elements, routing elements into different targets based on CSS selectors.

### Standard vs Multi-Slot
| Metric | Standard Content Projection | Multi-Slot Content Projection |
| --- | --- | --- |
| Slots | Single default <code>&lt;ng-content&gt;</code> | Multiple <code>&lt;ng-content select=\"...\"&gt;</code> slots |
| Routing Logic | Elements project in source order | Direct match by tag, class name, or attribute |
| typical use cases | Simple wrap containers, button wrappers | Modal layouts, custom card frames |

> **Interview tip:** Highlight that Angular matches selectors at **compile time** statically. Elements must match the css selector in the template direct child declaration. Nested children within a projected container will not be distributed unless the container element itself matches the selector.`,
    examples: [
      {
        label: "Configuring a custom layout with Multi-Slot Content Projection",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: '<div class=\"card-container\">' +
    '  <div class=\"header\">' +
    '    <ng-content select=\"header, [card-header]\"></ng-content>' +
    '  </div>' +
    '  <div class=\"body\">' +
    '    <ng-content></ng-content>' +
    '  </div>' +
    '  <div class=\"footer\">' +
    '    <ng-content select=\".card-footer\"></ng-content>' +
    '  </div>' +
    '</div>'
})
export class CardComponent {}`
      }
    ]
  },
  {
    title: "How do you handle micro-frontend architecture in Angular using Module Federation?",
    answer: `**Core concept.** Webpack/esbuild **Module Federation** enables building multiple independent applications (micro-frontends) that load each other dynamically at runtime. In Angular, a shell/host application loads lazy-loaded chunks (remote components or routes) from separate deployments dynamically. It shares core dependencies (like <code>@angular/core</code>, RxJS) as singletons to ensure only one instance is loaded.

**How it works.**
1. **Host App Configuration:** Defines shared library packages (so dependencies aren't loaded twice) and dynamic route imports pointing to remote locations.
2. **Remote App Configuration:** Exposes components or modules as entry points via federation configs.
3. **Execution:** The router resolves the lazy bundle dynamically: it loads the remote entry JavaScript file, links the shared singletons, compiles the remote component, and mounts it into the viewport.

### Benefits and Challenges
| Pros / Strengths | Cons / Concerns |
| --- | --- |
| Independent deployments & lifecycles | Increased complexity in testing and pipelines |
| Shared dependencies shrink bundles | Risk of framework version drift/mismatches |
| Framework-isolated team workflows | Complicated router state sync across shells |

> **Interview tip:** Mention the Angular CLI package <code>@angular-architects/module-federation</code>. Explain that keeping key dependencies (like Angular core) configured as singletons is critical; otherwise, multiple injectors compile, breaking DI tokens across micro-frontend boundaries.`,
    examples: [
      {
        label: "Dynamic route loading of a Module Federation remote",
        tech: "angular",
        runnable: false,
        code: `import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';

export const routes: Routes = [
  {
    path: 'admin-dashboard',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4201/remoteEntry.js',
        exposedModule: './AdminModule'
      }).then(m => m.AdminModule)
  }
];`
      }
    ]
  }
];

export default augments;
