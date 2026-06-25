/**
 * Angular Phase 1 — Batch 6 (Forms & misc — final). Gold-standard rewrites.
 * Conventions as in angular-augments-gold-1.ts.
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a FormArray?",
    answer: `**Core concept.** A <code>FormArray</code> manages a **dynamic, variable-length list** of form controls (each a <code>FormControl</code>, <code>FormGroup</code>, or nested <code>FormArray</code>). It's the reactive-forms tool for inputs whose count isn't known up front — phone numbers, line items, tags — letting you <code>push</code>/<code>removeAt</code> controls at runtime.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A FormArray holds an indexed list of controls you can add or remove'>
  <rect class='d-box-accent' x='30' y='28' width='400' height='40' rx='10'/>
  <text class='d-text' x='230' y='53' text-anchor='middle'>FormArray (phones)</text>
  <rect class='d-box' x='40' y='86' width='110' height='44' rx='8'/>
  <text class='d-sub' x='95' y='112' text-anchor='middle'>control[0]</text>
  <rect class='d-box' x='175' y='86' width='110' height='44' rx='8'/>
  <text class='d-sub' x='230' y='112' text-anchor='middle'>control[1]</text>
  <rect class='d-box' x='310' y='86' width='110' height='44' rx='8'/>
  <text class='d-sub' x='365' y='112' text-anchor='middle'>+ push / removeAt</text>
</svg>

**How it works.** Where a <code>FormGroup</code> models a fixed set of **named** fields, a <code>FormArray</code> models an **indexed** collection you mutate dynamically: <code>arr.push(new FormControl(''))</code> adds one, <code>arr.removeAt(i)</code> deletes one, <code>arr.at(i)</code> reads one, and <code>arr.controls</code> drives an <code>*ngFor</code> in the template (each rendered with <code>[formGroupName]="i"</code> or <code>formControlName</code> inside <code>formArrayName</code>). Its <code>value</code> is an array, validity aggregates from its children, and you can attach validators at the array level. This makes it the standard pattern for "add another" UIs (repeatable rows), surveys, and any form whose shape depends on data.

### FormArray API
| Method | Does |
| --- | --- |
| <code>push(ctrl)</code> | append a control |
| <code>removeAt(i)</code> | delete by index |
| <code>at(i)</code> | get a control |
| <code>controls</code> | iterate in the template |

> **Interview tip:** "A dynamic, indexed list of controls — for variable-length inputs (add/remove rows)." Contrast with <code>FormGroup</code> (fixed named fields). Iterate <code>controls</code> with <code>*ngFor</code> under <code>formArrayName</code>.`,
    examples: [
      {
        label: "A dynamic list of inputs",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form">
      <div formArrayName="phones">
        <input *ngFor="let c of phones.controls; let i = index" [formControlName]="i" />
      </div>
      <button (click)="add()">Add phone</button>
    </form>
  \`,
})
export class AppComponent {
  form = new FormGroup({ phones: new FormArray([new FormControl('')]) });
  get phones() { return this.form.get('phones') as FormArray; }
  add() { this.phones.push(new FormControl('')); }   // dynamic
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are pipes in Angular?",
    answer: `**Core concept.** Pipes transform a value **for display** in a template, using the <code>|</code> syntax: <code>{{ price | currency }}</code>, <code>{{ date | date:'short' }}</code>, <code>{{ name | uppercase }}</code>, <code>{{ data$ | async }}</code>. They're **pure** by default (re-run only when the input reference changes), can take parameters, and chain. You can write custom ones with <code>@Pipe</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A pipe transforms an input value into a formatted output'>
  <rect class='d-box' x='30' y='52' width='130' height='46' rx='10'/>
  <text class='d-text' x='95' y='73' text-anchor='middle'>value</text>
  <text class='d-sub' x='95' y='90' text-anchor='middle'>1699.5</text>
  <defs><marker id='ah-pi' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='160' y1='75' x2='194' y2='75' marker-end='url(#ah-pi)'/>
  <rect class='d-box-accent' x='196' y='52' width='110' height='46' rx='10'/>
  <text class='d-text' x='251' y='73' text-anchor='middle'>| currency</text>
  <text class='d-sub' x='251' y='90' text-anchor='middle'>transform</text>
  <line class='d-edge' x1='306' y1='75' x2='340' y2='75' marker-end='url(#ah-pi)'/>
  <rect class='d-box' x='342' y='52' width='104' height='46' rx='10'/>
  <text class='d-text' x='394' y='79' text-anchor='middle'>$1,699.50</text>
</svg>

**How it works.** A pipe is a class with a <code>transform(value, ...args)</code> method that returns the display value; Angular ships many (<code>date</code>, <code>currency</code>, <code>decimal</code>, <code>percent</code>, <code>json</code>, <code>slice</code>, <code>uppercase</code>/<code>lowercase</code>, <code>async</code>). Pure pipes (the default) are a performance win: Angular calls <code>transform</code> only when the input **value/reference** changes, not every change-detection cycle. If a pipe depends on internal mutation or time, mark it <code>pure: false</code> (runs every cycle — use sparingly). Parameters follow a colon (<code>date:'yyyy-MM-dd'</code>), and pipes chain left-to-right. Pipes keep formatting **out of the component**, so templates stay declarative and the class stays focused on data. The special <code>async</code> pipe unwraps Observables/Promises and auto-unsubscribes.

### Pipe facts
| Aspect | Detail |
| --- | --- |
| Syntax | <code>{{ value \\| pipe:arg }}</code> |
| Built-ins | <code>date</code>, <code>currency</code>, <code>async</code>, … |
| Pure (default) | re-runs only on input change |
| Custom | <code>@Pipe</code> + <code>transform()</code> |

> **Interview tip:** "Template value transformers (<code>|</code>) for display formatting." Note **pure** pipes only re-run when the input changes (perf), <code>pure: false</code> runs every cycle, and the <code>async</code> pipe unwraps streams.`,
    examples: [
      {
        label: "A custom pipe",
        tech: "angular",
        runnable: false,
        code: `import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 20): string {
    return value.length > limit ? value.slice(0, limit) + '…' : value;
  }
}

// usage:  {{ longText | truncate:30 }}
// built-ins:  {{ price | currency:'USD' }}   {{ today | date:'short' }}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What do @HostListener and @HostBinding do?",
    answer: `**Core concept.** They let a directive or component interact with its **host element** without a template. <code>@HostListener('event')</code> binds a method to an event on the host (or <code>window</code>/<code>document</code>). <code>@HostBinding('prop')</code> binds a class property to a host property, attribute, class, or style.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='HostListener reacts to host events; HostBinding sets host properties'>
  <rect class='d-box-accent' x='160' y='24' width='140' height='40' rx='10'/>
  <text class='d-text' x='230' y='49' text-anchor='middle'>host element</text>
  <defs><marker id='ah-hb' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <rect class='d-box' x='30' y='100' width='180' height='40' rx='8'/>
  <text class='d-sub' x='120' y='124' text-anchor='middle'>@HostListener: react to events</text>
  <rect class='d-box' x='250' y='100' width='180' height='40' rx='8'/>
  <text class='d-sub' x='340' y='124' text-anchor='middle'>@HostBinding: set class/style/attr</text>
  <line class='d-edge' x1='180' y1='64' x2='130' y2='98' marker-end='url(#ah-hb)'/>
  <line class='d-edge' x1='280' y1='64' x2='330' y2='98' marker-end='url(#ah-hb)'/>
</svg>

**How it works.** Directives often need to respond to and restyle the element they sit on. <code>@HostListener('click', ['$event'])</code> wires a method to the host's <code>click</code> (you can listen on the element or globals like <code>'window:resize'</code>, and pass arguments such as <code>$event</code>). <code>@HostBinding('class.active')</code>, <code>@HostBinding('attr.aria-expanded')</code>, or <code>@HostBinding('style.color')</code> reflect a class field onto the host, so updating the field updates the DOM — Angular handles change detection and is SSR/renderer-safe (no manual <code>nativeElement</code> writes). Together they let an attribute directive be fully self-contained: react to events and update appearance/state declaratively. (You can also declare these via the decorator's <code>host</code> metadata.)

### HostListener vs HostBinding
| | <code>@HostListener</code> | <code>@HostBinding</code> |
| --- | --- | --- |
| Direction | host event → method | property → host |
| Binds | events (incl. global) | class/attr/style/prop |
| Use | clicks, key/resize | toggle classes, aria |
| Safe under | SSR/renderers | SSR/renderers |

> **Interview tip:** "<code>@HostListener</code> reacts to host (or window/document) events; <code>@HostBinding</code> sets a host class/attr/style from a property — both declarative and SSR-safe." Common in attribute directives (hover-highlight, toggles).`,
    examples: [
      {
        label: "A directive using both",
        tech: "angular",
        runnable: false,
        code: `import { Directive, HostListener, HostBinding } from '@angular/core';

@Directive({ selector: '[appToggleActive]', standalone: true })
export class ToggleActiveDirective {
  @HostBinding('class.active') active = false;        // reflects onto the host
  @HostBinding('attr.aria-pressed') get pressed() { return this.active; }

  @HostListener('click') onClick() {                  // reacts to host click
    this.active = !this.active;
  }
}

// usage:  <button appToggleActive>Toggle</button>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do child components emit events to parents?",
    answer: `**Core concept.** A child exposes an <code>@Output()</code> property of type <code>EventEmitter</code>, and calls <code>this.event.emit(value)</code> to notify the parent. The parent binds to it like a DOM event — <code>(childEvent)="handler($event)"</code>. This is the "data up" channel that complements "data down" via <code>@Input</code>. (Modern Angular also offers the <code>output()</code> function.)

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Child emits via Output; parent listens and handles'>
  <rect class='d-box' x='30' y='52' width='150' height='46' rx='10'/>
  <text class='d-text' x='105' y='73' text-anchor='middle'>Child</text>
  <text class='d-sub' x='105' y='90' text-anchor='middle'>@Output emit(value)</text>
  <defs><marker id='ah-op' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='180' y1='75' x2='278' y2='75' marker-end='url(#ah-op)'/>
  <text class='d-sub' x='230' y='66' text-anchor='middle'>(event)=&quot;...&quot;</text>
  <rect class='d-box-accent' x='280' y='52' width='150' height='46' rx='10'/>
  <text class='d-text' x='355' y='73' text-anchor='middle'>Parent</text>
  <text class='d-sub' x='355' y='90' text-anchor='middle'>handles $event</text>
</svg>

**How it works.** In the child, declare <code>@Output() liked = new EventEmitter&lt;number&gt;()</code> and call <code>this.liked.emit(this.count)</code> when something happens (a click, a completed action). In the parent template, bind to that output by name: <code>&lt;app-likes (liked)="onLiked($event)"&gt;</code>, where <code>$event</code> is the emitted payload. This keeps Angular's **unidirectional** flow — inputs flow down, events bubble up — and decouples the child (it just announces "something happened") from the parent (which decides what to do). The newer <code>output()</code> function — <code>readonly liked = output&lt;number&gt;()</code> — is the signal-era equivalent with the same template binding. For communication between unrelated components, use a shared service with a <code>Subject</code> instead.

### Output essentials
| Piece | Code |
| --- | --- |
| declare | <code>@Output() x = new EventEmitter&lt;T&gt;()</code> |
| emit (child) | <code>this.x.emit(value)</code> |
| listen (parent) | <code>(x)="handler($event)"</code> |
| modern | <code>output&lt;T&gt;()</code> |

> **Interview tip:** "<code>@Output</code> + <code>EventEmitter.emit()</code> in the child; parent binds <code>(event)="fn($event)"</code> — the 'data up' to <code>@Input</code>'s 'data down'." Mention the new <code>output()</code> and a shared service for unrelated components.`,
    examples: [
      {
        label: "Child @Output → parent handler",
        tech: "angular",
        runnable: false,
        code: `import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-likes',
  standalone: true,
  template: '<button (click)="like()">👍 {{ count }}</button>',
})
export class LikesComponent {
  @Input() count = 0;
  @Output() liked = new EventEmitter<number>();   // event channel up
  like() { this.liked.emit(++this.count); }
}

// Parent:  <app-likes [count]="0" (liked)="onLiked($event)"></app-likes>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you dynamically create components?",
    answer: `**Core concept.** To instantiate a component at **runtime** (not declared in a template), use a <code>ViewContainerRef</code> and call <code>vcr.createComponent(SomeComponent)</code> — in Ivy you no longer need a component factory. You then set inputs on the returned <code>ComponentRef</code> and destroy it when done. The template alternative is <code>&lt;ng-container *ngComponentOutlet="comp"&gt;</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='ViewContainerRef.createComponent instantiates a component at runtime'>
  <rect class='d-box-accent' x='30' y='52' width='180' height='46' rx='10'/>
  <text class='d-text' x='120' y='73' text-anchor='middle'>ViewContainerRef</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>createComponent(Cmp)</text>
  <defs><marker id='ah-dc' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='210' y1='75' x2='258' y2='75' marker-end='url(#ah-dc)'/>
  <rect class='d-box' x='260' y='52' width='170' height='46' rx='10'/>
  <text class='d-text' x='345' y='73' text-anchor='middle'>ComponentRef</text>
  <text class='d-sub' x='345' y='90' text-anchor='middle'>setInput / destroy</text>
</svg>

**How it works.** Some UIs aren't known at author time — modals, toasts, dashboard widgets, a plugin system, or rendering a component chosen by data. You get a <code>ViewContainerRef</code> (inject it, or query an anchor like <code>@ViewChild('host', { read: ViewContainerRef })</code>), then <code>const ref = vcr.createComponent(WidgetComponent)</code> inserts an instance there. Configure it via <code>ref.setInput('title', 'Hi')</code> (or <code>ref.instance.x = …</code>) and subscribe to its outputs through <code>ref.instance</code>. Crucially, **call <code>ref.destroy()</code>** (or <code>vcr.clear()</code>) when you're finished to run the component's lifecycle/cleanup and avoid leaks. For the simple "render this component type" case, the declarative <code>*ngComponentOutlet</code> directive (which also supports inputs) is cleaner than the imperative API.

### Dynamic component options
| Approach | Use |
| --- | --- |
| <code>vcr.createComponent()</code> | full imperative control |
| <code>ref.setInput()</code> | pass inputs |
| <code>ref.destroy()</code> | cleanup (avoid leaks) |
| <code>*ngComponentOutlet</code> | declarative, simpler |

> **Interview tip:** "<code>ViewContainerRef.createComponent(Cmp)</code> (no factory in Ivy), set inputs via <code>setInput</code>, and <code>destroy()</code> when done." Mention <code>*ngComponentOutlet</code> for the declarative case and modals/widgets/plugins as use cases.`,
    examples: [
      {
        label: "Create and configure a component at runtime",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewChild, ViewContainerRef, AfterViewInit } from '@angular/core';

@Component({ selector: 'app-widget', standalone: true, template: '<b>{{ title }}</b>' })
export class WidgetComponent { title = ''; }

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<ng-container #host></ng-container>',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('host', { read: ViewContainerRef }) host!: ViewContainerRef;

  ngAfterViewInit() {
    const ref = this.host.createComponent(WidgetComponent); // instantiate
    ref.setInput('title', 'Created at runtime');            // pass input
    // ref.destroy();  // when finished → cleanup
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you bootstrap a standalone Angular application?",
    answer: `**Core concept.** Call <code>bootstrapApplication(AppComponent, { providers: [...] })</code> in <code>main.ts</code> — no <code>AppModule</code> required. App-wide dependencies (router, HTTP, animations) are supplied as **providers**, using the <code>provide*</code> functions (<code>provideRouter</code>, <code>provideHttpClient</code>, …).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='bootstrapApplication starts a standalone app with providers'>
  <rect class='d-box-accent' x='40' y='52' width='180' height='46' rx='10'/>
  <text class='d-text' x='130' y='73' text-anchor='middle'>bootstrapApplication</text>
  <text class='d-sub' x='130' y='90' text-anchor='middle'>AppComponent</text>
  <defs><marker id='ah-bs' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='220' y1='75' x2='258' y2='75' marker-end='url(#ah-bs)'/>
  <rect class='d-box' x='260' y='52' width='170' height='46' rx='10'/>
  <text class='d-text' x='345' y='73' text-anchor='middle'>providers</text>
  <text class='d-sub' x='345' y='90' text-anchor='middle'>provideRouter/Http/…</text>
</svg>

**How it works.** Standalone apps drop the NgModule layer entirely. In <code>main.ts</code> you bootstrap the **root standalone component** with <code>bootstrapApplication</code>, passing an <code>ApplicationConfig</code> whose <code>providers</code> array configures the app: <code>provideRouter(routes)</code> for routing, <code>provideHttpClient(withInterceptors([...]))</code> for HTTP, <code>provideAnimations()</code>, and your own services or <code>InjectionToken</code> values. These register on the **root injector**, so they're singletons available everywhere — the standalone equivalent of what you used to list in <code>AppModule.imports</code>/<code>providers</code>. The root component declares its own template-level <code>imports</code>. This is the default for new Angular projects and pairs with lazy-loaded standalone routes.

### Bootstrapping a standalone app
| Piece | Role |
| --- | --- |
| <code>bootstrapApplication(App)</code> | start the app (no NgModule) |
| <code>providers: [...]</code> | app-wide DI |
| <code>provideRouter(routes)</code> | routing |
| <code>provideHttpClient()</code> | HTTP + interceptors |

> **Interview tip:** "<code>bootstrapApplication(AppComponent, { providers })</code> in <code>main.ts</code> — no <code>AppModule</code>; configure router/HTTP/etc with the <code>provide*</code> functions on the root injector." It's the default in modern Angular.`,
    examples: [
      {
        label: "main.ts for a standalone app",
        tech: "angular",
        runnable: false,
        code: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { authInterceptor } from './auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // ...your services / InjectionToken values
  ],
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between AOT and JIT compilation?",
    answer: `**Core concept.** Angular compiles templates to JavaScript. **AOT** (Ahead-of-Time) does this at **build time** — faster startup, smaller bundles, template errors caught during the build, and better security. **JIT** (Just-in-Time) compiles in the **browser at runtime**. Production uses **AOT** (the default); JIT was mainly a development convenience.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='AOT compiles at build time; JIT compiles in the browser'>
  <rect class='d-box-accent' x='20' y='44' width='200' height='62' rx='10'/>
  <text class='d-text' x='120' y='70' text-anchor='middle'>AOT (build time)</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>fast start, small, secure</text>
  <rect class='d-box' x='240' y='44' width='200' height='62' rx='10'/>
  <text class='d-text' x='340' y='70' text-anchor='middle'>JIT (in browser)</text>
  <text class='d-sub' x='340' y='90' text-anchor='middle'>compiles at runtime</text>
</svg>

**How it works.** Templates aren't valid JavaScript, so they must be compiled. With **AOT**, the Angular compiler runs during <code>ng build</code>, turning templates into efficient JS and **embedding** the result in the bundle — so the browser downloads ready-to-run code. Benefits: faster rendering (no compile step at load), smaller payloads (the compiler itself isn't shipped), template/binding **errors caught at build time**, and reduced attack surface (no runtime template evaluation). **JIT** ships the compiler and compiles templates in the browser on startup, which is slower and larger but historically eased rapid dev iteration. Since Angular 9 (Ivy), AOT is the default for both development and production, so the distinction matters mostly as background — you'll essentially always ship AOT.

### AOT vs JIT
| | AOT | JIT |
| --- | --- | --- |
| When | build time | runtime (browser) |
| Startup | faster | slower |
| Bundle | smaller | larger (ships compiler) |
| Errors | caught at build | at runtime |

> **Interview tip:** "AOT compiles templates at **build** time (faster startup, smaller, build-time errors, secure); JIT compiles in the browser. AOT is the default since Ivy/Angular 9 — production always uses it."`,
    examples: [
      {
        label: "AOT is the default build",
        tech: "angular",
        runnable: false,
        code: `# Production build → AOT-compiled, optimized, tree-shaken
ng build --configuration production

# Templates compile at BUILD time, so an error like a typo'd binding
#   <p>{{ titel }}</p>     <!-- property 'titel' does not exist -->
# fails the build (AOT) instead of silently breaking at runtime (JIT).

# Since Angular 9 (Ivy), 'ng serve' also uses AOT by default.`,
      },
    ],
  },
];

export default augments;
