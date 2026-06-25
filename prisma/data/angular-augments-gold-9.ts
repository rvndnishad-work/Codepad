import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  {
    title: "What is the purpose of the KeyValueDiffers and IterableDiffers services?",
    answer: `**Core concept.** **<code>KeyValueDiffers</code>** and **<code>IterableDiffers</code>** are low-level differential services used to track fine-grained additions, deletions, or mutations within key-value maps and iterable arrays respectively. They enable developers to build custom directives that require manual, highly performant change detection logic without re-rendering entire datasets.

**How it works.**
1. **Instantiation:** Inject the differ factory inside your directive constructor.
2. **Creation:** Create a differ on the input array/object via <code>.find(data).create()</code>.
3. **Execution:** Inside <code>ngDoCheck()</code>, invoke <code>.diff(currentData)</code> to check for mutations. The diff output exposes callbacks like <code>forEachOperation</code>, <code>forEachAddedItem</code>, and <code>forEachRemovedItem</code>.

> **Interview tip:** Mention that standard Angular directives like <code>ngClass</code> (object tracker) and <code>ngStyle</code> use <code>KeyValueDiffers</code>, while <code>ngForOf</code> uses <code>IterableDiffers</code> under the hood to selectively update list nodes instead of rebuilding the list DOM on every state update.`,
    examples: [
      {
        label: "Building a custom list change tracking directive using IterableDiffers",
        tech: "angular",
        runnable: false,
        code: `import { Directive, Input, DoCheck, IterableDiffers, IterableDiffer, inject } from '@angular/core';

@Directive({
  selector: '[appTrackChanges]',
  standalone: true
})
export class TrackChangesDirective implements DoCheck {
  @Input() appTrackChanges!: string[];
  
  private differs = inject(IterableDiffers);
  private differ: IterableDiffer<string> | null = null;

  ngDoCheck() {
    if (this.appTrackChanges && !this.differ) {
      this.differ = this.differs.find(this.appTrackChanges).create();
    }

    if (this.differ) {
      const changes = this.differ.diff(this.appTrackChanges);
      if (changes) {
        changes.forEachAddedItem(record => {
          console.log('Item added:', record.item, 'at index:', record.currentIndex);
        });
        changes.forEachRemovedItem(record => {
          console.log('Item removed:', record.item, 'from index:', record.previousIndex);
        });
      }
    }
  }
}`
      }
    ]
  },
  {
    title: "Explain the difference between Shadow DOM, Emulated, and None View Encapsulation with compile output.",
    answer: `**Core concept.** **<code>ViewEncapsulation</code>** controls how Angular scopes component styles.
- **<code>Emulated</code> (Default):** Angular adds custom attributes (e.g. <code>_ngcontent-c0</code>) to elements and hashes compiled selectors. Scopes styles locally without relying on shadow boundaries.
- **<code>ShadowDom</code>:** Native browser shadow DOM is used. Fully isolates styles and DOM elements, but prevents global style sheets from targeting child nodes.
- **<code>None</code>:** Styles are injected globally into the document head, meaning selectors will bleed and affect the entire page.

### Compile Output Comparison
* **Input CSS:** <code>h1 { color: red; }</code>
* **Emulated compiled output:** <code>h1[_ngcontent-c0] { color: red; }</code>
* **ShadowDom compiled output:** Native encapsulated ShadowRoot boundaries.
* **None compiled output:** <code>h1 { color: red; }</code> (injected globally).

> **Interview tip:** Be prepared to explain that if you use <code>ViewEncapsulation.ShadowDom</code>, child components inside that DOM tree will not inherit parent component styles or global CSS unless you use native variables or custom custom-properties.`,
    examples: [
      {
        label: "Configuring ViewEncapsulation modes in Angular Component",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-emulated-styles',
  standalone: true,
  encapsulation: ViewEncapsulation.Emulated,
  styles: 'span { font-weight: bold; }',
  template: '<span>Emulated text styling</span>'
})
export class EmulatedComponent {}

@Component({
  selector: 'app-global-styles',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  styles: 'span { color: blue; }',
  template: '<span>Global blue span</span>'
})
export class NoneComponent {}`
      }
    ]
  },
  {
    title: "What are security vulnerabilities in Angular apps, and how does DomSanitizer prevent XSS?",
    answer: `**Core concept.** Angular automatically sanitizes values bound in templates (via interpolation or property bindings) to protect against Cross-Site Scripting (XSS). If a developer needs to bind raw HTML, iframe URLs, or dynamic scripts, they must inject **<code>DomSanitizer</code>** and call the appropriate bypass method (e.g., <code>bypassSecurityTrustHtml</code>) to mark the content as trusted.

### Trust APIs in DomSanitizer
- **<code>bypassSecurityTrustHtml(value)</code>:** Trusted HTML strings (for <code>[innerHTML]</code>).
- **<code>bypassSecurityTrustStyle(value)</code>:** Trusted CSS styling rules (for <code>[style]</code>).
- **<code>bypassSecurityTrustScript(value)</code>:** Trusted JavaScript code.
- **<code>bypassSecurityTrustUrl(value)</code>:** Trusted links or image paths.
- **<code>bypassSecurityTrustResourceUrl(value)</code>:** Trusted external script/iframe locations.

> **Interview tip:** Warn that calling <code>bypassSecurityTrust*</code> bypasses Angular's security engines. State that you should **never** pass unsanitized user inputs to these methods. If user inputs are included, sanitize them first using libraries like DOMPurify.`,
    examples: [
      {
        label: "Rendering dynamic video content in an iframe safely using DomSanitizer",
        tech: "angular",
        runnable: false,
        code: `import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-safe-player',
  standalone: true,
  template: '<iframe [src]="safeUrl" width="560" height="315"></iframe>'
})
export class SafePlayerComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  safeUrl!: SafeResourceUrl;

  ngOnInit() {
    const rawVideoId = 'dQw4w9WgXcQ';
    const rawUrl = 'https://www.youtube.com/embed/' + rawVideoId;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  }
}`
      }
    ]
  },
  {
    title: "What is the APP_INITIALIZER token and how is it used to load configuration at startup?",
    answer: `**Core concept.** **<code>APP_INITIALIZER</code>** is a multi-provider InjectionToken in Angular. It allows you to define one or more startup functions that execute during application bootstrap. If an initialization function returns a Promise or an Observable, Angular blocks the startup process and waits for the request to complete before loading the UI.

**Typical Use Cases:**
- Loading runtime application configuration settings from an external JSON file (e.g., environment configurations, API base URLs).
- Fetching initial security metadata or user session details before mounting routes.
- Initializing third-party integrations (such as logging portals or analytics).

> **Interview tip:** Make sure to explain that because <code>APP_INITIALIZER</code> runs before everything else, you can configure your application config service with fallback parameters and then resolve it synchronously elsewhere.`,
    examples: [
      {
        label: "Loading runtime configuration at application startup",
        tech: "angular",
        runnable: false,
        code: `import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private settings: any = null;

  get apiBaseUrl() { return this.settings?.apiUrl; }

  loadSettings(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get('/assets/config.json').pipe(
        tap(cfg => this.settings = cfg)
      ).subscribe({
        next: () => resolve(),
        error: (err) => {
          console.error('Config failed to load', err);
          resolve();
        }
      });
    });
  }
}

// app.config.ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: (configSvc: ConfigService) => () => configSvc.loadSettings(),
      deps: [ConfigService],
      multi: true
    }
  ]
};`
      }
    ]
  },
  {
    title: "How do you optimize initial bundle size using Route Preloading with custom strategies?",
    answer: `**Core concept.** Route preloading loads lazy-loaded bundles in the background after the initial application bundle is loaded and rendered. By implementing the **<code>PreloadingStrategy</code>** interface, you can build custom strategies that load specific bundles based on parameters like viewport visibility, network conditions, or custom route configuration flags.

### Preloading Strategies
- **<code>NoPreloading</code> (Default):** Lazy modules are loaded only when the user clicks/navigates to that route.
- **<code>PreloadAllModules</code>:** Preloads all lazy modules immediately after the app bootstraps. High bandwidth usage.
- **Custom Preloading:** Preloads only specific modules flagged with data attributes (e.g. <code>{ preload: true }</code>).

> **Interview tip:** Be prepared to write or explain the <code>preload()</code> contract. It checks if the route has the required data property and returns the <code>fn()</code> loader function if true; otherwise, it returns <code>of(null)</code>.`,
    examples: [
      {
        label: "Implementing a custom preloading strategy based on route data flags",
        tech: "angular",
        runnable: false,
        code: `import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomPreloadStrategy implements PreloadingStrategy {
  preload(route: Route, fn: () => Observable<any>): Observable<any> {
    const shouldPreload = route.data && route.data['preload'] === true;
    return shouldPreload ? fn() : of(null);
  }
}`
      }
    ]
  },
  {
    title: "How do you configure dynamic base href in Angular builds for different environments?",
    answer: `**Core concept.** The base href tells the browser how to resolve relative link target paths (assets, chunks). Instead of hardcoding <code>&lt;base href=\"/\"&gt;</code> in the <code>index.html</code>, you can configure base href dynamically during compile time (using CLI flags like <code>--base-href</code>) or programmatically at runtime by providing the **<code>APP_BASE_HREF</code>** token.

### Dynamic Resolution
If your application runs in sub-folders depending on user locales or environments, you can define <code>APP_BASE_HREF</code> in your providers array. It overrides index base settings dynamically at startup.

> **Interview tip:** Mention that setting the base href dynamically at runtime is useful for white-labeled apps or localized apps deployed to dynamic root paths without re-building.`,
    examples: [
      {
        label: "Resolving base href dynamically from URL parameters",
        tech: "angular",
        runnable: false,
        code: `import { bootstrapApplication } from '@angular/platform-browser';
import { APP_BASE_HREF } from '@angular/common';
import { Component } from '@angular/core';

@Component({ selector: 'app-root', template: '<h1>Base href Demo</h1>' })
export class AppComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: APP_BASE_HREF,
      useFactory: () => {
        const path = window.location.pathname.split('/')[1];
        return path ? '/' + path + '/' : '/';
      }
    }
  ]
});`
      }
    ]
  },
  {
    title: "What are the differences between State Management libraries in Angular?",
    answer: `**Core concept.** State management patterns keep state mutations predictable and structured across shared component trees. As Angular has evolved, state management has shifted from heavy, boilerplate-heavy Redux frameworks to lightweight RxJS or native Signal stores.

### State management libraries comparison
| Store Library | Primary Reactivity | Complexity | Best Fit |
| --- | --- | --- | --- |
| **<code>NgRx (Store)</code>** | RxJS Observables / Redux pattern | High (Actions, Reducers, Effects) | Large enterprise apps with complex state |
| **<code>NgRx Component Store</code>** | RxJS Observables / Local scopes | Medium | Component-scoped states, widgets |
| **<code>Akita / Elf</code>** | RxJS Stores / Object-oriented | Medium | Query-based business data patterns |
| **<code>Signals State</code>** | Native Signals / Minimal code | Low | Modern, lightweight, high performance |

> **Interview tip:** Be prepared to state that in Angular 16+, signals make standard global services a great, lightweight choice for state management. You don't need a heavy store framework unless your app handles complex side-effects, undo-redo features, or massive shared state graphs.`,
    examples: [
      {
        label: "A clean, modern state store using Signals",
        tech: "angular",
        runnable: false,
        code: `import { Injectable, signal, computed } from '@angular/core';

export interface Todo { id: number; text: string; done: boolean; }

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private state = signal<{ todos: Todo[]; filter: string }>({
    todos: [],
    filter: 'all'
  });

  todos = computed(() => this.state().todos);
  activeTodos = computed(() => this.state().todos.filter(t => !t.done));

  addTodo(text: string) {
    this.state.update(curr => ({
      ...curr,
      todos: [...curr.todos, { id: Date.now(), text, done: false }]
    }));
  }
}`
      }
    ]
  },
  {
    title: "What is the role of NgRx Effects, and why do we separate side effects from reducers?",
    answer: `**Core concept.** In NgRx state management, **reducers must be pure functions** (they take state + action and return new state, with no side-effects like API calls or timers). **<code>Effects</code>** are class/functional structures that listen to actions, perform asynchronous or side-effect logic (such as fetching data via HTTP), and dispatch a new action when they complete (e.g. success or error).

**Why separate them?**
- **Testability:** Reducers can be tested synchronously without mocking HTTP calls.
- **Separation of Concerns:** Components dispatch actions without knowing how data is loaded or persisted.
- **Predictability:** State transitions are predictable and atomic.

> **Interview tip:** Mention the concept of **"functional effects"** introduced in newer NgRx releases. They use <code>createEffect</code> and <code>inject(Actions)</code> without needing decorators, reducing boilerplate code.`,
    examples: [
      {
        label: "Declaring a functional NgRx Effect for loading profiles",
        tech: "angular",
        runnable: false,
        code: `import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { map, exhaustMap, catchError } from 'rxjs/operators';

export const loadProfileEffect = createEffect(
  (actions$ = inject(Actions), http = inject(HttpClient)) => {
    return actions$.pipe(
      ofType('[Profile Page] Load Request'),
      exhaustMap(() =>
        http.get<any>('/api/profile').pipe(
          map(profile => ({ type: '[Profile API] Load Success', payload: profile })),
          catchError(err => of({ type: '[Profile API] Load Failure', error: err }))
        )
      )
    );
  },
  { functional: true }
);`
      }
    ]
  },
  {
    title: "How do you optimize images in Angular using NgOptimizedImage?",
    answer: `**Core concept.** **<code>NgOptimizedImage</code>** (activated via the <code>ngSrc</code> attribute) is a built-in directive that optimizes image loading in Angular apps. It prevents page layout shifts (CLS) by enforcing explicit aspect ratios, schedules loading priorities based on viewport location, and automatically builds responsive source lists (<code>srcset</code>).

### Optimizations Applied
- **Aspect Ratio Enforcement:** Enforces <code>width</code> and <code>height</code> properties to prevent layout shifts.
- **Responsive Srcset:** Automatically generates responsive srcsets based on viewport breakpoints.
- **Priority Loading:** Setting <code>priority</code> on above-the-fold images preloads them immediately.
- **Lazy Loading:** Off-screen images default to lazy-loaded natively.
- **Preconnect Warnings:** Warns in console if you omit <code>&lt;link rel=\"preconnect\"&gt;</code> for dynamic image CDN endpoints.

> **Interview tip:** Cite this directive as a quick performance win. Simply replacing <code>src</code> with <code>ngSrc</code> and importing <code>NgOptimizedImage</code> can improve Core Web Vitals (specifically **Cumulative Layout Shift** and **Largest Contentful Paint**).`,
    examples: [
      {
        label: "Configuring NgOptimizedImage in standalone components",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [NgOptimizedImage],
  template: '<!-- Optimized hero banner load -->' +
    '<img ngSrc="images/banner.jpg" width="800" height="400" priority />' +
    '<!-- Default lazy loaded off-screen image -->' +
    '<img ngSrc="images/logo.png" width="200" height="200" />'
})
export class HeroComponent {}`
      }
    ]
  },
  {
    title: "What is the critical render path and how does Angular handle font and style optimization?",
    answer: `**Core concept.** The critical render path is the sequence of tasks the browser performs to render the initial pixels of a page. To speed this up, Angular's build engine (specifically using the modern esbuild/vite pipeline) automatically extracts, minifies, and **inlines critical CSS** directly into the <code>index.html</code>. It also prefetches and caches Google Fonts during compile builds, eliminating blocking network roundtrips.

### Critical Path Enhancements
- **CSS Inlining:** Inline styles prevent blocking resource requests.
- **Font Optimization:** Downloads external fonts during build phase and embeds them locally.
- **Preloading Chunks:** Preloads entry chunks dynamically to trigger compilation faster.

> **Interview tip:** If asked about setting this up, state that it is active by default in Angular v15+ builds. If needed, you can toggle <code>\"optimization\": { \"styles\": { \"inlineCritical\": true } }</code> inside <code>angular.json</code>.`,
    examples: [
      {
        label: "Visual representation of build compiled inlined index.html output",
        tech: "angular",
        runnable: false,
        code: `<!-- Compiled dist/index.html output -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>App</title>
  <base href="/">
  <style>body{margin:0;font-family:Roboto}h1{color:#333;margin-top:20px}</style>
  <link rel="stylesheet" href="styles-lazy-bundle.css" media="print" onload="this.media='all'">
</head>
<body>
  <app-root></app-root>
</body>
</html>`
      }
    ]
  },
  {
    title: "What is Zone.js, how does it monkey-patch browser APIs, and how do you build a Zoneless Angular application?",
    answer: `**Core concept.** **Zone.js** is a library that creates execution contexts (zones) across async operations. It intercepts (monkey-patches) browser APIs like <code>setTimeout</code>, <code>addEventListener</code>, and fetch calls. Once an async action resolves, Zone.js notifies Angular to run change detection. In Angular 18, you can remove Zone.js and build **Zoneless** applications, which trigger updates on-demand using Signals.

**Why go Zoneless?**
- **Performance:** Skips global, top-down digest updates on every mouse move, hover, or click.
- **Smaller Bundles:** Saves ~15-20KB of bundle weight.
- **Simplified Debugging:** Stack traces are cleaner and easier to read without Zone.js boundaries.

> **Interview tip:** To configure Zoneless in Angular 18, add <code>provideExperimentalZonelessChangeDetection()</code> to the app config providers, and delete <code>zone.js</code> from the imports array inside <code>angular.json</code> / <code>main.ts</code>.`,
    examples: [
      {
        label: "Bootstrapping a Zoneless application in Angular 18",
        tech: "angular",
        runnable: false,
        code: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection, Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<button (click)="inc()">Count: {{ count() }}</button>'
})
class AppComponent {
  count = signal(0);
  inc() { this.count.update(c => c + 1); }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});`
      }
    ]
  },
  {
    title: "How does compilation work under the hood in Ivy?",
    answer: `**Core concept.** **Ivy** is Angular's next-generation compiler and rendering engine. It operates on a **locality principle**: each component is compiled dynamically using only its decorator metadata and class context, without inspecting its parent/child modules. It compiles HTML templates into static, tree-shakable TypeScript render instructions (template functions).

**Key Ivy components:**
- **<code>ngtsc</code> (Compiler):** A TypeScript compiler wrapper that parses Angular decorators (<code>@Component</code>, <code>@Directive</code>) and outputs standard static JS with render instructions.
- **Instruction sets:** Declarative methods (like <code>ɵɵelementStart</code>, <code>ɵɵtext</code>, <code>ɵɵproperty</code>) that instruct the renderer exactly how to build and patch the DOM.

> **Interview tip:** Cite the **locality principle** as Ivy's primary improvement over the legacy View Engine. Because components are compiled independently, incremental builds are much faster, and libraries can be distributed pre-compiled without referencing external compilation maps.`,
    examples: [
      {
        label: "Visual compiled representation of an Ivy template function",
        tech: "angular",
        runnable: false,
        code: `// Component input source:
// template: '<h1>Hello {{ name }}</h1>'

// Ivy Compiler compiled javascript output code:
static ɵcmp = i0.ɵɵdefineComponent({
  type: GreetingComponent,
  selectors: [["app-greeting"]],
  template: function GreetingComponent_Template(rf, ctx) {
    if (rf & 1) {
      i0.ɵɵelementStart(0, "h1");
      i0.ɵɵtext(1);
      i0.ɵɵelementEnd();
    }
    if (rf & 2) {
      i0.ɵɵadvance(1);
      i0.ɵɵtextInterpolate1("Hello ", ctx.name, "");
    }
  }
});`
      }
    ]
  },
  {
    title: "What is the customElements schema in Angular and when do you need to use it?",
    answer: `**Core concept.** **<code>CUSTOM_ELEMENTS_SCHEMA</code>** is a compiler schema config that allows you to use custom tag names (Web Components) inside Angular templates. Without registering this schema, Angular's template compiler throws build errors for any tag name it doesn't recognize as a standard HTML element or a registered Angular component.

**When to use it:**
- When integrating design systems built using stencil or web components (like Shoelace, Ionic web components, or Lit).
- When hosting external micro-frontends embedded within Web Component wrappers.

> **Interview tip:** Clarify that <code>CUSTOM_ELEMENTS_SCHEMA</code> disables compile errors for custom tags but does *not* automate attribute/property parsing. You still bind attributes using standard <code>[prop]</code> syntax, and listen to events using <code>(event)</code> bindings.`,
    examples: [
      {
        label: "Configuring CUSTOM_ELEMENTS_SCHEMA in a standalone component",
        tech: "angular",
        runnable: false,
        code: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-web-component-host',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<h2>Design System Integration</h2>' +
    '<my-custom-slider [value]="val" (sliderChange)="onSlider($event)"></my-custom-slider>'
})
export class WebComponentHostComponent {
  val = 50;
  onSlider(e: any) {
    console.log('Value emitted:', e.detail);
  }
}`
      }
    ]
  },
  {
    title: "How do you handle internationalization (i18n) in Angular?",
    answer: `**Core concept.** Angular features built-in internationalization (i18n) tooling that translates application templates directly. You tag static text in templates with the **<code>i18n</code>** attribute. During builds, the Angular CLI extracts this marked text into translation source files (such as XML/XLIFF). It then compiles separate, optimized static application bundles for each supported locale.

**How it works.**
1. **Mark templates:** <code>&lt;h1 i18n=\"@@homeHeader\"&gt;Welcome&lt;/h1&gt;</code>
2. **Extract source:** <code>ng extract-i18n</code> (creates <code>messages.xlf</code>).
3. **Translate:** Translators add translations in local files (e.g. <code>messages.fr.xlf</code>).
4. **Compile:** Configure <code>angular.json</code> with target locales, and the compiler outputs localized builds.

> **Interview tip:** Be prepared to contrast standard Angular i18n (static, build-time compilation) with dynamic translation libraries like **ngx-translate** or **Transloco** (runtime translations). Explain that Angular's build-time approach is faster since it does not require loading translation files at runtime.`,
    examples: [
      {
        label: "Declaring static translation nodes in templates",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-welcome',
  standalone: true,
  template: '<h1 i18n="Site greeting@@welcomeMsg">Hello World</h1>' +
    '<img i18n-alt alt="User profile icon" src="avatar.jpg" />'
})
export class WelcomeComponent {}`
      }
    ]
  },
  {
    title: "What is the difference between ElementRef, TemplateRef, and ViewContainerRef?",
    answer: `**Core concept.** These three types represent different wrappers for interacting with DOM nodes and layout templates.
- **<code>ElementRef</code>:** A thin wrapper around a raw, native HTML element. Used for direct DOM manipulation.
- **<code>TemplateRef</code>:** Represents an uninstantiated template block (declared with <code>&lt;ng-template&gt;</code>). It acts as a blueprint.
- **<code>ViewContainerRef</code>:** A placeholder container where you can dynamically instantiate components or attach templates.

### Reference Wrappers Comparison
| Reference Wrapper | Underlying Representation | Primary Method / Use Case |
| --- | --- | --- |
| **<code>ElementRef</code>** | Raw HTML DOM Element node | <code>nativeElement.focus()</code>, accessing DOM styles |
| **<code>TemplateRef</code>** | <code>&lt;ng-template&gt;</code> blueprint declaration | <code>createEmbeddedView()</code> |
| **<code>ViewContainerRef</code>**| Host container spot in layout | <code>createComponent(Cmp)</code>, <code>insert(view)</code> |

> **Interview tip:** Direct DOM manipulation using <code>ElementRef.nativeElement</code> is discouraged because it breaks SSR (Server-Side Rendering) compatibility and bypasses Angular's security sanitization. Use <code>Renderer2</code> instead when modifying DOM attributes directly.`,
    examples: [
      {
        label: "Using all three references in dynamic layout creation",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewChild, ElementRef, TemplateRef, ViewContainerRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-sandbox',
  standalone: true,
  template: '<input #inputField type="text" />' +
    '<ng-template #templateRef><p>Inside dynamic view template</p></ng-template>' +
    '<ng-container #viewContainer></ng-container>'
})
export class SandboxComponent implements AfterViewInit {
  @ViewChild('inputField') inputEl!: ElementRef;
  @ViewChild('templateRef') template!: TemplateRef<any>;
  @ViewChild('viewContainer', { read: ViewContainerRef }) host!: ViewContainerRef;

  ngAfterViewInit() {
    this.inputEl.nativeElement.focus();
    this.host.createEmbeddedView(this.template);
  }
}`
      }
    ]
  },
  {
    title: "What is the difference between component styling using :host, :host-context, and ::ng-deep?",
    answer: `**Core concept.** These CSS pseudo-classes configure style inheritance rules across component host structures.
- **<code>:host</code>:** Targets the custom component tag itself (e.g. styling <code>&lt;app-button&gt;</code>).
- **<code>:host-context(.dark-theme)</code>:** Styles the host component only if a parent element matches the specified selector (e.g., changing button background if inside a container with class <code>.dark-theme</code>).
- **<code>::ng-deep</code>:** Pierces component style encapsulation boundaries, applying rules down to all child elements. Note: <code>::ng-deep</code> is deprecated but still widely used.

### Selector Comparison
| Selector | Styling Target | Boundary Scope |
| --- | --- | --- |
| **<code>:host</code>** | Component host container | Local component bounds |
| **<code>:host-context(selector)</code>** | Host element conditionally | Scoped to parent state checks |
| **<code>::ng-deep</code>** | Child sub-elements in host tree | Pierces styling encapsulation |

> **Interview tip:** Explain that because <code>::ng-deep</code> is deprecated, developers should avoid it. If global child styling overrides are needed, the recommended approach is using global CSS stylesheets or CSS custom variables.`,
    examples: [
      {
        label: "Styling declarations inside component css files",
        tech: "angular",
        runnable: false,
        code: `:host {
  display: block;
  border: 1px solid #ccc;
}

:host-context(.active-theme) {
  background-color: #000;
  color: #fff;
}

::ng-deep .third-party-widget {
  color: red !important;
}`
      }
    ]
  },
  {
    title: "How do you implement custom routing strategies by extending RouteReuseStrategy?",
    answer: `**Core concept.** By default, when a user navigates between routes, Angular destroys the source component and instantiates a new target component. By extending **<code>RouteReuseStrategy</code>**, you can override this behavior and cache component instances. This allows components to be restored instantly with their state and scroll position intact when returning to a route.

**Methods to override:**
1. **<code>shouldDetach()</code>:** Checks if a route should be detached and cached.
2. **<code>store()</code>:** Saves the detached <code>RouteSnapshot</code> and component state in a local map.
3. **<code>shouldAttach()</code>:** Checks if a cached route exists for the route being navigated to.
4. **<code>retrieve()</code>:** Returns the cached <code>RouteSnapshot</code> to restore it.
5. **<code>shouldReuseRoute()</code>:** Determines if Angular should reuse the route configuration if navigation matches target.

> **Interview tip:** Cite this as an advanced performance optimization for dashboards or search listings, preserving user scroll positions and filter configurations without calling state management APIs.`,
    examples: [
      {
        label: "Custom route reuse strategy implementation",
        tech: "angular",
        runnable: false,
        code: `import { RouteReuseStrategy, DetachedRouteHandle, ActivatedRouteSnapshot } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private handlers: { [key: string]: DetachedRouteHandle } = {};

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['reuse'] === true;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (route.routeConfig?.path && handle) {
      this.handlers[route.routeConfig.path] = handle;
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!route.routeConfig?.path && !!this.handlers[route.routeConfig.path];
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!route.routeConfig?.path) return null;
    return this.handlers[route.routeConfig.path] || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}`
      }
    ]
  }
];

export default augments;
