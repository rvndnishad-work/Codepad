/**
 * Angular Phase 1 — Batch 3 (Change detection, signals & binding).
 * Gold-standard rewrites. Conventions as in angular-augments-gold-1.ts.
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the types of data binding in Angular?",
    answer: `**Core concept (TL;DR).** There are four forms, defined by the **direction** of data flow. **Interpolation** <code>{{ }}</code> and **property binding** <code>[prop]</code> push data from the component **to the view**. **Event binding** <code>(event)</code> sends events from the view **to the component**. **Two-way binding** <code>[(ngModel)]</code> does both at once.

<svg class='iq-diagram' viewBox='0 0 460 165' role='img' aria-label='Four binding types by direction between component and view'>
  <rect class='d-box-accent' x='30' y='62' width='130' height='44' rx='10'/>
  <text class='d-text' x='95' y='88' text-anchor='middle'>Component</text>
  <rect class='d-box' x='300' y='62' width='130' height='44' rx='10'/>
  <text class='d-text' x='365' y='88' text-anchor='middle'>View (DOM)</text>
  <defs><marker id='ah-db' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='160' y1='74' x2='298' y2='74' marker-end='url(#ah-db)'/>
  <text class='d-sub' x='230' y='66' text-anchor='middle'>{{x}} and [prop]</text>
  <line class='d-edge-accent' x1='300' y1='96' x2='162' y2='96' marker-end='url(#ah-db)'/>
  <text class='d-sub' x='230' y='118' text-anchor='middle'>(event)</text>
  <text class='d-sub' x='230' y='140' text-anchor='middle'>[(ngModel)] = both ways</text>
</svg>

**How it works.** **Interpolation** embeds a component expression as text (<code>&lt;h1&gt;{{ title }}&lt;/h1&gt;</code>). **Property binding** sets a DOM/component **property** from an expression (<code>[disabled]="isBusy"</code>, <code>[src]="url"</code>) — note it binds properties, not HTML attributes (use <code>[attr.x]</code> for those). **Event binding** runs a handler on a DOM or component event (<code>(click)="save()"</code>, <code>(valueChange)="…"</code>). **Two-way binding** combines a property binding and an event binding — <code>[(x)]</code> is the "banana-in-a-box" syntax that desugars to <code>[x]</code> + <code>(xChange)</code>, with <code>ngModel</code> (from <code>FormsModule</code>) being the common case for form inputs. Bindings are re-evaluated by change detection whenever data changes.

### Binding types
| Type | Syntax | Direction |
| --- | --- | --- |
| Interpolation | <code>{{ value }}</code> | component → view |
| Property | <code>[prop]="expr"</code> | component → view |
| Event | <code>(event)="handler()"</code> | view → component |
| Two-way | <code>[(ngModel)]="x"</code> | both |

> **Interview tip:** Group by direction (to-view: interpolation/property; from-view: event; both: two-way). Note <code>[(x)]</code> desugars to <code>[x]</code> + <code>(xChange)</code>, and property binding sets **properties** (use <code>[attr.]</code> for attributes).`,
    examples: [
      {
        label: "All four binding forms",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <h3>{{ title }}</h3>                      <!-- interpolation -->
    <button [disabled]="busy">Save</button>   <!-- property binding -->
    <button (click)="busy = !busy">Toggle</button> <!-- event binding -->
    <input [(ngModel)]="title" />             <!-- two-way (needs FormsModule) -->
  \`,
})
export class AppComponent {
  title = 'Hello';
  busy = false;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is trackBy in ngFor and why use it?",
    answer: `**Core concept (TL;DR).** <code>trackBy</code> gives <code>*ngFor</code> a function that returns a **stable identity** (usually an id) for each item, so Angular can tell which items are the same across renders. Without it, replacing the array makes Angular **destroy and rebuild every row**; with it, it reuses the existing DOM and only touches what changed.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='trackBy reuses DOM nodes by identity instead of rebuilding the list'>
  <rect class='d-box' x='20' y='44' width='190' height='62' rx='10'/>
  <text class='d-text' x='115' y='70' text-anchor='middle'>no trackBy</text>
  <text class='d-sub' x='115' y='90' text-anchor='middle'>new array → rebuild all rows</text>
  <rect class='d-box-accent' x='250' y='44' width='190' height='62' rx='10'/>
  <text class='d-text' x='345' y='70' text-anchor='middle'>trackBy: id</text>
  <text class='d-sub' x='345' y='90' text-anchor='middle'>reuse DOM, patch changes</text>
</svg>

**How it works.** By default <code>*ngFor</code> tracks items by **object identity**. If you fetch a fresh array (e.g. after an HTTP refresh), every object is a new reference even when the data is identical, so Angular tears down and recreates all the DOM nodes — losing element state (focus, scroll, animations) and wasting work on long lists. A <code>trackBy</code> function — <code>trackById(index, item) { return item.id; }</code> — tells Angular to match items by their **id** instead, so unchanged rows keep their DOM and only added/removed/changed rows are updated. This is a key performance fix for large or frequently-refreshed lists.

### With vs without trackBy
| | no <code>trackBy</code> | with <code>trackBy</code> |
| --- | --- | --- |
| Tracks by | object identity | your key (id) |
| New array | rebuilds every row | reuses unchanged rows |
| Element state | lost | preserved |
| Long lists | slow | efficient |

> **Interview tip:** "Without <code>trackBy</code>, a replaced array re-creates all DOM nodes; <code>trackBy</code> matches by a stable id so Angular reuses them." Best on large/refreshed lists; it also preserves focus/animation state.`,
    examples: [
      {
        label: "trackBy by id",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <ul>
      <li *ngFor="let u of users; trackBy: trackById">{{ u.name }}</li>
    </ul>
  \`,
})
export class AppComponent {
  users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];
  // identify rows by id → Angular reuses DOM on data refresh
  trackById(index: number, u: { id: number }) { return u.id; }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does ChangeDetectorRef do?",
    answer: `**Core concept (TL;DR).** <code>ChangeDetectorRef</code> lets you **manually control a component's change detection**. Its key methods: <code>markForCheck()</code> (schedule this component to be checked on the next cycle — essential with <code>OnPush</code>), <code>detectChanges()</code> (run change detection now), and <code>detach()</code>/<code>reattach()</code> (remove/restore it from the CD tree).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='ChangeDetectorRef methods to control change detection'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='44' rx='10'/>
  <text class='d-text' x='120' y='52' text-anchor='middle'>markForCheck()</text>
  <text class='d-sub' x='120' y='68' text-anchor='middle'>schedule a check (OnPush)</text>
  <rect class='d-box' x='240' y='30' width='200' height='44' rx='10'/>
  <text class='d-text' x='340' y='52' text-anchor='middle'>detectChanges()</text>
  <text class='d-sub' x='340' y='68' text-anchor='middle'>run CD now</text>
  <rect class='d-box' x='20' y='90' width='200' height='44' rx='10'/>
  <text class='d-text' x='120' y='112' text-anchor='middle'>detach()</text>
  <text class='d-sub' x='120' y='128' text-anchor='middle'>skip this subtree</text>
  <rect class='d-box' x='240' y='90' width='200' height='44' rx='10'/>
  <text class='d-text' x='340' y='112' text-anchor='middle'>reattach()</text>
  <text class='d-sub' x='340' y='128' text-anchor='middle'>resume checking</text>
</svg>

**How it works.** Normally Angular checks components automatically each cycle. With the <code>OnPush</code> strategy a component is only checked when its <code>@Input</code> reference changes, an event fires in it, or an <code>async</code> pipe emits — so if you mutate state from *outside* Angular's awareness (a third-party callback, a WebSocket, a manually-managed observable), the view won't update. <code>markForCheck()</code> tells Angular "this component (and its ancestors) need checking on the next tick"; <code>detectChanges()</code> forces an immediate synchronous check of this component and its children. For heavy components you can <code>detach()</code> them and run <code>detectChanges()</code> on your own schedule (e.g. throttled), then <code>reattach()</code>. It's an advanced, performance-oriented tool — reach for it with <code>OnPush</code> or out-of-zone updates.

### ChangeDetectorRef methods
| Method | Effect |
| --- | --- |
| <code>markForCheck()</code> | check this + ancestors next cycle |
| <code>detectChanges()</code> | run CD now (this subtree) |
| <code>detach()</code> | exclude from CD |
| <code>reattach()</code> | re-include in CD |

> **Interview tip:** "Manually control change detection — <code>markForCheck</code> (with OnPush, after out-of-Angular updates), <code>detectChanges</code> (run now), <code>detach</code>/<code>reattach</code> (custom scheduling)." Tie <code>markForCheck</code> to the OnPush strategy.`,
    examples: [
      {
        label: "markForCheck with OnPush",
        tech: "angular",
        runnable: false,
        code: `import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-clock',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ time }}',
})
export class ClockComponent {
  time = '';
  constructor(private cdr: ChangeDetectorRef) {
    // update from OUTSIDE Angular's normal triggers
    setInterval(() => {
      this.time = new Date().toLocaleTimeString();
      this.cdr.markForCheck();   // without this, OnPush won't re-render
    }, 1000);
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is NgZone and when do you run outside Angular?",
    answer: `**Core concept (TL;DR).** Angular uses **Zone.js** to know when to run change detection — it patches async APIs (<code>setTimeout</code>, events, XHR) so Angular re-checks the UI after they fire. <code>NgZone.runOutsideAngular()</code> runs code **without** triggering change detection (a performance escape hatch for very frequent events), and <code>NgZone.run()</code> re-enters the zone to update the UI.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='runOutsideAngular avoids change detection; run() re-enters'>
  <rect class='d-box-accent' x='30' y='44' width='180' height='62' rx='10'/>
  <text class='d-text' x='120' y='70' text-anchor='middle'>inside the zone</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>async → CD runs</text>
  <rect class='d-box' x='250' y='44' width='180' height='62' rx='10'/>
  <text class='d-text' x='340' y='70' text-anchor='middle'>runOutsideAngular</text>
  <text class='d-sub' x='340' y='90' text-anchor='middle'>no CD (fast)</text>
  <defs><marker id='ah-nz' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='250' y1='66' x2='212' y2='66' marker-end='url(#ah-nz)'/>
  <text class='d-sub' x='230' y='126' text-anchor='middle'>NgZone.run() to re-enter</text>
</svg>

**How it works.** Zone.js intercepts async tasks and notifies Angular when one completes, so Angular runs change detection and the view stays in sync — automatically. The downside: extremely frequent callbacks (<code>mousemove</code>, <code>scroll</code>, <code>requestAnimationFrame</code> loops, animation libraries) trigger change detection on every tick, which can tank performance. <code>this.zone.runOutsideAngular(() => …)</code> executes that work **outside** Zone.js so it doesn't schedule change detection; when you finally need to update the UI (e.g. on drag end), wrap that part in <code>this.zone.run(() => …)</code> to re-enter and let Angular refresh. Modern Angular is moving toward **zoneless** change detection (signals), which removes Zone.js entirely.

### NgZone usage
| Method | Effect |
| --- | --- |
| (default) inside zone | async triggers CD |
| <code>runOutsideAngular(fn)</code> | run without triggering CD |
| <code>run(fn)</code> | re-enter the zone (update UI) |
| future | zoneless via signals |

> **Interview tip:** "Zone.js patches async to trigger change detection; <code>runOutsideAngular</code> opts out for hot paths (mousemove/rAF), <code>run</code> re-enters to update the UI." Mention the move to **zoneless** (signals).`,
    examples: [
      {
        label: "Run a hot loop outside Angular",
        tech: "angular",
        runnable: false,
        code: `import { Component, NgZone } from '@angular/core';

@Component({ selector: 'app-root', standalone: true, template: '{{ fps }} fps' })
export class AppComponent {
  fps = 0;
  constructor(private zone: NgZone) {
    // a rAF loop OUTSIDE Angular → no change detection every frame
    this.zone.runOutsideAngular(() => {
      const loop = () => { /* heavy per-frame work */ requestAnimationFrame(loop); };
      loop();
    });
    // when you actually need to update the view, re-enter:
    setInterval(() => this.zone.run(() => (this.fps = 60)), 1000);
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Angular Signals?",
    answer: `**Core concept (TL;DR).** Signals (Angular 16+) are a **reactive primitive**: a <code>signal()</code> holds a value, **reading** it tracks the reader as a dependency, and **writing** it notifies dependents to recompute. <code>computed()</code> derives values, and <code>effect()</code> runs side effects when dependencies change — enabling **fine-grained**, efficient updates (and eventually zoneless change detection).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='signal feeds computed and effect; writes propagate'>
  <rect class='d-box-accent' x='30' y='52' width='120' height='46' rx='10'/>
  <text class='d-text' x='90' y='78' text-anchor='middle'>signal(0)</text>
  <defs><marker id='ah-sg' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='150' y1='64' x2='258' y2='52' marker-end='url(#ah-sg)'/>
  <line class='d-edge-accent' x1='150' y1='86' x2='258' y2='98' marker-end='url(#ah-sg)'/>
  <rect class='d-box' x='260' y='30' width='170' height='40' rx='10'/>
  <text class='d-text' x='345' y='55' text-anchor='middle'>computed()</text>
  <rect class='d-box' x='260' y='84' width='170' height='40' rx='10'/>
  <text class='d-text' x='345' y='109' text-anchor='middle'>effect()</text>
</svg>

**How it works.** You create state with <code>const count = signal(0)</code>; read it by calling it (<code>count()</code>), and update it with <code>count.set(1)</code> or <code>count.update(c => c + 1)</code>. A <code>computed(() => count() * 2)</code> is a derived signal that **memoizes** and only recomputes when its inputs change. An <code>effect(() => console.log(count()))</code> re-runs whenever a signal it reads changes — for syncing to the DOM, logging, or local storage. Because Angular knows exactly which signals a template/computed reads, it can update **only** what depends on a change, instead of dirty-checking the whole tree — the basis of zoneless change detection. Templates read signals by calling them (<code>{{ count() }}</code>).

### Signal APIs
| API | Purpose |
| --- | --- |
| <code>signal(v)</code> | writable reactive value |
| <code>.set()</code> / <code>.update()</code> | write |
| <code>computed(fn)</code> | derived, memoized signal |
| <code>effect(fn)</code> | side effect on change |

> **Interview tip:** "Fine-grained reactivity — read tracks deps, write notifies; <code>computed</code> derives, <code>effect</code> reacts." Emphasise it enables targeted updates and **zoneless** change detection. Read in templates by calling: <code>{{ count() }}</code>.`,
    examples: [
      {
        label: "signal, computed, effect",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<button (click)="inc()">count {{ count() }} → doubled {{ doubled() }}</button>',
})
export class AppComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);   // derived + memoized

  constructor() {
    effect(() => console.log('count is', this.count())); // reacts to changes
  }
  inc() { this.count.update(c => c + 1); }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are signal inputs and model() in modern Angular?",
    answer: `**Core concept (TL;DR).** <code>input()</code> creates a **signal-based component input** — you read it like a signal (<code>this.value()</code>) and it's reactive in computeds/effects, replacing the decorator <code>@Input()</code>. <code>model()</code> creates a **two-way bindable** signal input, so a parent can use <code>[(value)]</code> — it bundles an input and its <code>valueChange</code> output.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='input() is one-way signal input; model() is two-way bindable'>
  <rect class='d-box-accent' x='30' y='44' width='180' height='62' rx='10'/>
  <text class='d-text' x='120' y='70' text-anchor='middle'>input()</text>
  <text class='d-sub' x='120' y='90' text-anchor='middle'>signal input (read-only)</text>
  <rect class='d-box' x='250' y='44' width='180' height='62' rx='10'/>
  <text class='d-text' x='340' y='70' text-anchor='middle'>model()</text>
  <text class='d-sub' x='340' y='90' text-anchor='middle'>two-way: [(value)]</text>
</svg>

**How it works.** Signal inputs make a component's inputs first-class reactive values: <code>readonly userId = input.required&lt;number&gt;()</code> is read as <code>this.userId()</code> and can feed <code>computed</code>/<code>effect</code> directly — no <code>ngOnChanges</code> needed to react to input changes. <code>input()</code> supports <code>required</code>, default values, and a <code>transform</code>. <code>model()</code> goes further: <code>readonly value = model('')</code> creates a writable signal that's also exposed as an input plus a matching <code>valueChange</code> output, so the parent binds <code>[(value)]</code> and the child updates it with <code>this.value.set(...)</code>. Together they modernize component I/O around signals, replacing <code>@Input</code>/<code>@Output</code> with reactive, type-safe primitives.

### input() vs model()
| | <code>input()</code> | <code>model()</code> |
| --- | --- | --- |
| Direction | parent → child | two-way |
| Read | <code>this.x()</code> | <code>this.x()</code> |
| Write (child) | no | <code>this.x.set(...)</code> |
| Replaces | <code>@Input()</code> | <code>@Input()</code> + <code>@Output()</code> |

> **Interview tip:** "<code>input()</code> = reactive signal input (read as <code>x()</code>, no <code>ngOnChanges</code>); <code>model()</code> = two-way bindable signal that bundles input + <code>valueChange</code>." Mention <code>input.required()</code> and <code>transform</code>.`,
    examples: [
      {
        label: "input() and model()",
        tech: "angular",
        runnable: false,
        code: `import { Component, input, model, computed } from '@angular/core';

@Component({
  selector: 'app-rating',
  standalone: true,
  template: '<button (click)="bump()">{{ label() }}: {{ value() }}</button>',
})
export class RatingComponent {
  label = input('Rating');           // signal input  (parent: [label]="...")
  value = model(0);                  // two-way        (parent: [(value)]="...")
  label2 = computed(() => this.label().toUpperCase());
  bump() { this.value.update(v => v + 1); }  // child can write a model()
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Angular lifecycle hooks?",
    answer: `**Core concept (TL;DR).** Lifecycle hooks are methods Angular calls at defined moments in a component/directive's life — from input changes and initialization through view/content checks to destruction. The most-used are <code>ngOnInit</code> (init), <code>ngOnChanges</code> (input changes), <code>ngAfterViewInit</code> (view ready), and <code>ngOnDestroy</code> (cleanup).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Lifecycle order: OnChanges, OnInit, AfterViewInit, OnDestroy'>
  <rect class='d-box-accent' x='14' y='54' width='100' height='44' rx='8'/>
  <text class='d-text' x='64' y='74' text-anchor='middle'>ngOnChanges</text>
  <text class='d-sub' x='64' y='90' text-anchor='middle'>inputs set</text>
  <defs><marker id='ah-lc' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='114' y1='76' x2='128' y2='76' marker-end='url(#ah-lc)'/>
  <rect class='d-box' x='130' y='54' width='84' height='44' rx='8'/>
  <text class='d-text' x='172' y='74' text-anchor='middle'>ngOnInit</text>
  <text class='d-sub' x='172' y='90' text-anchor='middle'>init</text>
  <line class='d-edge' x1='214' y1='76' x2='228' y2='76' marker-end='url(#ah-lc)'/>
  <rect class='d-box' x='230' y='54' width='120' height='44' rx='8'/>
  <text class='d-text' x='290' y='74' text-anchor='middle'>ngAfterViewInit</text>
  <text class='d-sub' x='290' y='90' text-anchor='middle'>view ready</text>
  <line class='d-edge' x1='350' y1='76' x2='364' y2='76' marker-end='url(#ah-lc)'/>
  <rect class='d-box-accent' x='366' y='54' width='84' height='44' rx='8'/>
  <text class='d-text' x='408' y='74' text-anchor='middle'>ngOnDestroy</text>
  <text class='d-sub' x='408' y='90' text-anchor='middle'>cleanup</text>
</svg>

**How it works.** Angular invokes the hooks in a fixed order: <code>ngOnChanges</code> (whenever a bound input changes — receives a <code>SimpleChanges</code> map), then <code>ngOnInit</code> once after the first inputs are set, then <code>ngDoCheck</code> and the content hooks (<code>ngAfterContentInit</code>/<code>Checked</code>), then the view hooks (<code>ngAfterViewInit</code>/<code>Checked</code>), and finally <code>ngOnDestroy</code> just before the component is removed. Implement the matching interface (<code>OnInit</code>, <code>OnDestroy</code>, …) for type-safety. The two you'll use most: <code>ngOnInit</code> for setup that needs inputs, and <code>ngOnDestroy</code> to **clean up** subscriptions/timers and avoid leaks. <code>ngAfterViewInit</code> is where <code>@ViewChild</code> results are available.

### Key hooks (in order)
| Hook | When / use |
| --- | --- |
| <code>ngOnChanges</code> | input changes (<code>SimpleChanges</code>) |
| <code>ngOnInit</code> | once, after first inputs — setup |
| <code>ngAfterViewInit</code> | view + <code>@ViewChild</code> ready |
| <code>ngOnDestroy</code> | cleanup (unsubscribe) |

> **Interview tip:** Recite the common order (OnChanges → OnInit → AfterViewInit → OnDestroy) and the two you use most: <code>ngOnInit</code> (setup) and <code>ngOnDestroy</code> (cleanup to prevent leaks). <code>@ViewChild</code> is ready in <code>ngAfterViewInit</code>.`,
    examples: [
      {
        label: "Common hooks",
        tech: "angular",
        runnable: false,
        code: `import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

@Component({ selector: 'app-user', standalone: true, template: '{{ id }}' })
export class UserComponent implements OnInit, OnChanges, OnDestroy {
  @Input() id!: number;
  private timer?: any;

  ngOnChanges(c: SimpleChanges) { /* runs when 'id' changes */ }
  ngOnInit() { this.timer = setInterval(() => {}, 1000); }   // setup
  ngOnDestroy() { clearInterval(this.timer); }               // cleanup → no leak
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are @ViewChild and @ContentChild?",
    answer: `**Core concept (TL;DR).** Both query for a child element/component/directive, but from **different places**. <code>@ViewChild</code> queries the component's **own template** (its view). <code>@ContentChild</code> queries content **projected into it** via <code>&lt;ng-content&gt;</code>. The plural versions, <code>@ViewChildren</code>/<code>@ContentChildren</code>, return a <code>QueryList</code>.

<svg class='iq-diagram' viewBox='0 0 460 155' role='img' aria-label='ViewChild queries the view; ContentChild queries projected content'>
  <rect class='d-box-accent' x='30' y='40' width='180' height='80' rx='10'/>
  <text class='d-text' x='120' y='66' text-anchor='middle'>@ViewChild</text>
  <text class='d-sub' x='120' y='88' text-anchor='middle'>own template</text>
  <text class='d-sub' x='120' y='104' text-anchor='middle'>ready: AfterViewInit</text>
  <rect class='d-box' x='250' y='40' width='180' height='80' rx='10'/>
  <text class='d-text' x='340' y='66' text-anchor='middle'>@ContentChild</text>
  <text class='d-sub' x='340' y='88' text-anchor='middle'>projected (ng-content)</text>
  <text class='d-sub' x='340' y='104' text-anchor='middle'>ready: AfterContentInit</text>
</svg>

**How it works.** <code>@ViewChild(ChildComponent)</code> grabs a reference to something Angular rendered from **this component's** template — a child component instance, a directive, a <code>TemplateRef</code>, or a DOM element via a template variable — so you can call its methods or read its properties. It's resolved by <code>ngAfterViewInit</code> (or <code>ngOnInit</code> if you pass <code>{ static: true }</code> for non-conditional refs). <code>@ContentChild</code> instead targets content a **parent projected** into this component through <code>&lt;ng-content&gt;</code>, resolved by <code>ngAfterContentInit</code>. Use the plural <code>@ViewChildren</code>/<code>@ContentChildren</code> to get a live <code>QueryList</code> you can iterate or subscribe to. In modern Angular, signal-based queries (<code>viewChild()</code>/<code>contentChild()</code>) are the newer equivalents.

### ViewChild vs ContentChild
| | <code>@ViewChild</code> | <code>@ContentChild</code> |
| --- | --- | --- |
| Targets | own template (view) | projected content |
| Ready in | <code>ngAfterViewInit</code> | <code>ngAfterContentInit</code> |
| Plural | <code>@ViewChildren</code> | <code>@ContentChildren</code> |
| Signal form | <code>viewChild()</code> | <code>contentChild()</code> |

> **Interview tip:** "<code>@ViewChild</code> = your own template (ready in <code>ngAfterViewInit</code>); <code>@ContentChild</code> = projected content (ready in <code>ngAfterContentInit</code>)." Mention the plural <code>QueryList</code> forms and the new signal queries.`,
    examples: [
      {
        label: "Query a child in the view",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<input #box /> <button (click)="focus()">Focus</button>',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    // available now (the view has been initialized)
    console.log('input found:', !!this.box);
  }
  focus() { this.box.nativeElement.focus(); }
}`,
      },
    ],
  },
];

export default augments;
