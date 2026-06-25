/**
 * Angular Phase 1 — Batch 1 (Components & templates). Gold-standard rewrites:
 * TL;DR + theme-aware <svg class='iq-diagram'> diagram + GFM table + interview
 * tip + an Angular code example. Picked up by `npm run augment:ng` (sorts after
 * angular-augments-{1,2,3}.ts so it overrides the older moderate answers).
 *
 * Conventions: SVGs use the shared .iq-diagram helper classes (d-box, d-box-accent,
 * d-text, d-sub, d-edge[-accent], d-arrow), single-quoted attrs, and &lt;/&gt; for
 * angle brackets. Inline code uses <code> tags (rendered via rehype-raw) so the
 * markdown stays clean in TS template literals (no backtick escaping). Examples
 * are `runnable:false` (static highlighted) to avoid the single-file playground
 * constraints.
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are components and modules in Angular?",
    answer: `**Core concept (TL;DR).** A **component** controls a piece of the screen — it's a TypeScript class decorated with <code>@Component</code> that ties together a **template** (HTML), **styles**, and logic. A **module** (<code>@NgModule</code>) groups related components, directives, and pipes plus their dependencies into a cohesive block. Modern Angular increasingly favours **standalone components**, which need no NgModule.

<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='An NgModule groups components, directives and pipes'>
  <rect class='d-box-muted' x='20' y='20' width='420' height='140' rx='10'/>
  <text class='d-text' x='40' y='44'>@NgModule (declarations + imports)</text>
  <rect class='d-box-accent' x='40' y='60' width='120' height='80' rx='8'/>
  <text class='d-text' x='100' y='92' text-anchor='middle'>@Component</text>
  <text class='d-sub' x='100' y='110' text-anchor='middle'>template + class</text>
  <text class='d-sub' x='100' y='126' text-anchor='middle'>+ styles</text>
  <rect class='d-box' x='180' y='60' width='120' height='80' rx='8'/>
  <text class='d-text' x='240' y='96' text-anchor='middle'>@Directive</text>
  <text class='d-sub' x='240' y='114' text-anchor='middle'>behaviour</text>
  <rect class='d-box' x='320' y='60' width='100' height='80' rx='8'/>
  <text class='d-text' x='370' y='96' text-anchor='middle'>@Pipe</text>
  <text class='d-sub' x='370' y='114' text-anchor='middle'>transform</text>
</svg>

**How it works.** Every Angular UI is a **tree of components**, each owning a template that data-binds to its class. The <code>@Component</code> decorator wires the selector, template, and styles together. An <code>@NgModule</code> historically declared which components/directives/pipes belong together and imported other modules (like <code>CommonModule</code> for <code>*ngFor</code>/<code>*ngIf</code> or <code>HttpClientModule</code>). Since Angular 14+, **standalone components** declare their own <code>imports</code> directly, so most new apps skip NgModules entirely and bootstrap with <code>bootstrapApplication</code>.

### Component vs module
| | Component | Module |
| --- | --- | --- |
| Decorator | <code>@Component</code> | <code>@NgModule</code> |
| Role | controls a view | groups & wires features |
| Contains | template + class + styles | declarations + imports |
| Modern Angular | the core unit | optional (standalone) |

> **Interview tip:** "A component is a view (class + template + styles via <code>@Component</code>); a module groups related declarables and their dependencies." Add that **standalone components** (Angular 14+) make NgModules largely optional.`,
    examples: [
      {
        label: "A component and the module that declares it",
        tech: "angular",
        runnable: false,
        code: `import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-greeting',
  template: '<h3>Hello, {{ name }}!</h3>',   // template + binding
})
export class GreetingComponent {
  name = 'Angular';                          // component state
}

@NgModule({
  declarations: [GreetingComponent],         // module groups the component
  imports: [BrowserModule],
})
export class AppModule {}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are standalone components?",
    answer: `**Core concept (TL;DR).** A standalone component (also directive/pipe) sets <code>standalone: true</code> and declares its **own <code>imports</code>** — so it doesn't need to be declared in an <code>@NgModule</code>. You bootstrap a standalone app with <code>bootstrapApplication(AppComponent)</code>. Since Angular 17+ standalone is the **default** for new projects.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Standalone component imports its dependencies directly'>
  <rect class='d-box-accent' x='120' y='24' width='220' height='52' rx='10'/>
  <text class='d-text' x='230' y='48' text-anchor='middle'>standalone: true</text>
  <text class='d-sub' x='230' y='66' text-anchor='middle'>imports: [CommonModule, ...]</text>
  <rect class='d-box' x='40' y='110' width='110' height='34' rx='8'/>
  <text class='d-sub' x='95' y='131' text-anchor='middle'>CommonModule</text>
  <rect class='d-box' x='175' y='110' width='110' height='34' rx='8'/>
  <text class='d-sub' x='230' y='131' text-anchor='middle'>RouterModule</text>
  <rect class='d-box' x='310' y='110' width='110' height='34' rx='8'/>
  <text class='d-sub' x='365' y='131' text-anchor='middle'>OtherComponent</text>
  <defs><marker id='ah-sa' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge' x1='160' y1='76' x2='110' y2='108' marker-end='url(#ah-sa)'/>
  <line class='d-edge' x1='230' y1='76' x2='230' y2='108' marker-end='url(#ah-sa)'/>
  <line class='d-edge' x1='300' y1='76' x2='350' y2='108' marker-end='url(#ah-sa)'/>
</svg>

**How it works.** Before standalone, every component had to be declared in exactly one NgModule, and you wired dependencies through module <code>imports</code> — lots of boilerplate. A standalone component is self-describing: its decorator lists the directives, pipes, and components it uses in its own <code>imports</code> array. This makes dependencies explicit and local, improves tree-shaking, and removes the NgModule ceremony. You can mix standalone and module-based code during migration, lazy-load standalone components directly in routes, and provide app-wide services via <code>bootstrapApplication(App, { providers: [...] })</code>.

### Standalone vs NgModule-based
| | Standalone | NgModule-based |
| --- | --- | --- |
| Declared in | nothing (self-contained) | an <code>@NgModule</code> |
| Dependencies | its own <code>imports</code> | module <code>imports</code> |
| Bootstrap | <code>bootstrapApplication</code> | <code>platformBrowser…bootstrapModule</code> |
| Default since | Angular 17 | legacy |

> **Interview tip:** "<code>standalone: true</code> + own <code>imports</code>, no NgModule; bootstrap with <code>bootstrapApplication</code>." Mention it's the default now, improves tree-shaking, and simplifies lazy loading.`,
    examples: [
      {
        label: "A standalone component + bootstrap",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],                 // declares its OWN dependencies
  template: \`
    <ul><li *ngFor="let t of todos">{{ t }}</li></ul>
  \`,
})
export class AppComponent {
  todos = ['Learn standalone', 'Drop NgModules'];
}

// No AppModule needed:
bootstrapApplication(AppComponent);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a directive and what are the types?",
    answer: `**Core concept (TL;DR).** A directive attaches **behaviour** to elements in the DOM. There are three kinds: **components** (directives *with* a template), **structural** directives that change layout by adding/removing elements (<code>*ngIf</code>, <code>*ngFor</code> — note the <code>*</code>), and **attribute** directives that change an element's appearance or behaviour (<code>ngClass</code>, <code>ngStyle</code>, or your own).

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Three directive types: component, structural, attribute'>
  <rect class='d-box-accent' x='20' y='30' width='130' height='110' rx='10'/>
  <text class='d-text' x='85' y='56' text-anchor='middle'>Component</text>
  <text class='d-sub' x='85' y='78' text-anchor='middle'>directive with</text>
  <text class='d-sub' x='85' y='94' text-anchor='middle'>a template</text>
  <rect class='d-box' x='165' y='30' width='130' height='110' rx='10'/>
  <text class='d-text' x='230' y='56' text-anchor='middle'>Structural</text>
  <text class='d-sub' x='230' y='78' text-anchor='middle'>*ngIf, *ngFor</text>
  <text class='d-sub' x='230' y='94' text-anchor='middle'>adds/removes DOM</text>
  <rect class='d-box' x='310' y='30' width='130' height='110' rx='10'/>
  <text class='d-text' x='375' y='56' text-anchor='middle'>Attribute</text>
  <text class='d-sub' x='375' y='78' text-anchor='middle'>ngClass, ngStyle</text>
  <text class='d-sub' x='375' y='94' text-anchor='middle'>changes look/behaviour</text>
</svg>

**How it works.** Technically a **component is just a directive with a template**, which is why it tops the list. **Structural** directives reshape the DOM — the leading <code>*</code> is syntactic sugar that wraps the host element in an <code>&lt;ng-template&gt;</code>, so the element is created or destroyed based on a condition or list. **Attribute** directives sit on an existing element and tweak it via the host element's properties/classes/styles or by listening to events (often built with <code>@HostBinding</code>/<code>@HostListener</code>). You author custom directives with <code>@Directive</code> and inject <code>ElementRef</code>/<code>Renderer2</code> to touch the host safely.

### Directive types
| Type | Examples | Effect |
| --- | --- | --- |
| Component | any <code>@Component</code> | renders a template |
| Structural | <code>*ngIf</code>, <code>*ngFor</code>, <code>*ngSwitch</code> | add/remove elements |
| Attribute | <code>ngClass</code>, <code>ngStyle</code>, custom | change appearance/behaviour |

> **Interview tip:** "Three types: component (has a template), structural (<code>*</code> — changes layout), attribute (changes an element)." Note a component *is* a directive with a template, and that <code>*</code> desugars to an <code>&lt;ng-template&gt;</code>.`,
    examples: [
      {
        label: "A custom attribute directive",
        tech: "angular",
        runnable: false,
        code: `import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({ selector: '[appHighlight]', standalone: true })
export class HighlightDirective {
  @Input() appHighlight = 'yellow';        // configurable via attribute

  constructor(private el: ElementRef) {}

  @HostListener('mouseenter') onEnter() {
    this.el.nativeElement.style.background = this.appHighlight;
  }
  @HostListener('mouseleave') onLeave() {
    this.el.nativeElement.style.background = '';
  }
}

// Usage:  <p appHighlight="lightblue">Hover me</p>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is content projection and ng-content?",
    answer: `**Core concept (TL;DR).** Content projection lets a component render markup that the **parent** places between its tags — Angular's version of "slots" / React <code>children</code>. You mark the insertion point in the component's template with <code>&lt;ng-content&gt;</code>, and you can have **multiple** slots by adding a <code>select</code> attribute.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Parent markup is projected into the component ng-content slot'>
  <rect class='d-box' x='20' y='30' width='180' height='100' rx='10'/>
  <text class='d-text' x='110' y='54' text-anchor='middle'>&lt;app-card&gt;</text>
  <text class='d-sub' x='110' y='78' text-anchor='middle'>projected content</text>
  <text class='d-sub' x='110' y='96' text-anchor='middle'>(from parent)</text>
  <defs><marker id='ah-cp' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='200' y1='80' x2='258' y2='80' marker-end='url(#ah-cp)'/>
  <rect class='d-box-accent' x='260' y='30' width='180' height='100' rx='10'/>
  <text class='d-text' x='350' y='54' text-anchor='middle'>card template</text>
  <text class='d-sub' x='350' y='80' text-anchor='middle'>&lt;ng-content&gt;&lt;/ng-content&gt;</text>
  <text class='d-sub' x='350' y='98' text-anchor='middle'>slot fills here</text>
</svg>

**How it works.** A reusable container (a card, dialog, layout) doesn't know its content ahead of time. You write <code>&lt;ng-content&gt;&lt;/ng-content&gt;</code> where the projected markup should appear; whatever a parent nests between <code>&lt;app-card&gt;…&lt;/app-card&gt;</code> is rendered there. For multiple named regions, use <code>&lt;ng-content select="[header]"&gt;</code> with a matching attribute/selector on the projected element — the rest falls into a default <code>&lt;ng-content&gt;</code>. This keeps components flexible and composable, the same idea React expresses with <code>children</code>/slots. Note projected content keeps the parent's binding/injection context.

### Content projection
| Feature | How |
| --- | --- |
| single slot | <code>&lt;ng-content&gt;&lt;/ng-content&gt;</code> |
| multi-slot | <code>&lt;ng-content select="[header]"&gt;</code> |
| query projected | <code>@ContentChild</code> |
| context | keeps the parent's |

> **Interview tip:** "Angular's slots — <code>&lt;ng-content&gt;</code> renders markup the parent nests inside the component." Mention multi-slot with <code>select</code> and that <code>@ContentChild</code> queries projected content.`,
    examples: [
      {
        label: "A card with default + named slots",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: \`
    <header><ng-content select="[card-title]"></ng-content></header>
    <div class="body"><ng-content></ng-content></div>   <!-- default slot -->
  \`,
})
export class CardComponent {}

// Parent usage:
//   <app-card>
//     <h3 card-title>Profile</h3>     <!-- goes to the named slot -->
//     <p>Any body content here.</p>   <!-- goes to the default slot -->
//   </app-card>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are ng-container and ng-template?",
    answer: `**Core concept (TL;DR).** <code>&lt;ng-container&gt;</code> is a **logical grouping** element that renders **no DOM** of its own — perfect for applying a structural directive (or several) without adding a wrapper. <code>&lt;ng-template&gt;</code> defines a block of markup that is **not rendered** until something instantiates it (an <code>*ngIf</code> "else", <code>ngTemplateOutlet</code>, etc.).

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='ng-container adds no DOM; ng-template is rendered on demand'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='100' rx='10'/>
  <text class='d-text' x='120' y='56' text-anchor='middle'>&lt;ng-container&gt;</text>
  <text class='d-sub' x='120' y='80' text-anchor='middle'>groups directives</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>renders NO element</text>
  <rect class='d-box' x='240' y='30' width='200' height='100' rx='10'/>
  <text class='d-text' x='340' y='56' text-anchor='middle'>&lt;ng-template&gt;</text>
  <text class='d-sub' x='340' y='80' text-anchor='middle'>defined but inert</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>rendered on demand</text>
</svg>

**How it works.** Because <code>&lt;ng-container&gt;</code> produces no real element, it lets you attach an <code>*ngIf</code> or <code>*ngFor</code> (or combine conditions) without polluting the DOM with an extra <code>&lt;div&gt;</code> that could break fl/grid or table layouts — Angular's answer to React fragments. <code>&lt;ng-template&gt;</code> is the building block structural directives compile to: its contents exist as a template you render explicitly, e.g. the <code>else</code> branch of <code>*ngIf</code> (<code>*ngIf="cond; else other"</code> with <code>&lt;ng-template #other&gt;</code>), or via <code>[ngTemplateOutlet]</code>. You can also pass context data into a template when you instantiate it.

### ng-container vs ng-template
| | <code>&lt;ng-container&gt;</code> | <code>&lt;ng-template&gt;</code> |
| --- | --- | --- |
| Renders DOM | no | only when instantiated |
| Use for | grouping structural directives | reusable/conditional blocks |
| Common with | <code>*ngIf</code>/<code>*ngFor</code> w/o wrapper | <code>*ngIf else</code>, outlets |

> **Interview tip:** "<code>ng-container</code> = no-DOM grouping (like a fragment); <code>ng-template</code> = a template that renders only when instantiated." Tie <code>ng-template</code> to <code>*ngIf … else</code> and <code>ngTemplateOutlet</code>.`,
    examples: [
      {
        label: "ng-container (no wrapper) + ng-template (else)",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <!-- ng-container: apply *ngIf without an extra wrapper element -->
    <ng-container *ngIf="loggedIn; else guest">
      <span>Welcome back!</span>
    </ng-container>

    <!-- ng-template: rendered only when the else branch fires -->
    <ng-template #guest><span>Please sign in.</span></ng-template>
  \`,
})
export class AppComponent {
  loggedIn = false;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are template reference variables?",
    answer: `**Core concept (TL;DR).** A template reference variable — declared with <code>#name</code> in the template — gives you a handle to a **DOM element**, a **component**, or a **directive** within that same template. You can then read its properties or call its methods elsewhere in the template.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A #ref variable refers to an element used elsewhere in the template'>
  <rect class='d-box-accent' x='40' y='40' width='150' height='60' rx='10'/>
  <text class='d-text' x='115' y='66' text-anchor='middle'>&lt;input #box&gt;</text>
  <text class='d-sub' x='115' y='86' text-anchor='middle'>declares #box</text>
  <defs><marker id='ah-tr' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='190' y1='70' x2='268' y2='70' marker-end='url(#ah-tr)'/>
  <rect class='d-box' x='270' y='40' width='150' height='60' rx='10'/>
  <text class='d-text' x='345' y='66' text-anchor='middle'>{{ box.value }}</text>
  <text class='d-sub' x='345' y='86' text-anchor='middle'>used elsewhere</text>
</svg>

**How it works.** Put <code>#name</code> on an element and, by default, it references that element's <strong>DOM node</strong> (e.g. <code>#input</code> → the <code>HTMLInputElement</code>, so <code>input.value</code> works). On a component or directive, <code>#name</code> references the **instance** — and you can target a specific directive with <code>#name="ngModel"</code> (the directive's <code>exportAs</code> name). The variable is scoped to the template and is commonly used to read input values without two-way binding, call a child component's public method, or pass an element to an event handler. To access one in the component class, query it with <code>@ViewChild</code>.

### Reference targets
| <code>#ref</code> on… | Refers to |
| --- | --- |
| a DOM element | the native element |
| a component | the component instance |
| with <code>="ngModel"</code> | that directive's instance |
| read in class | via <code>@ViewChild</code> |

> **Interview tip:** "<code>#var</code> references an element/component/directive in the same template." Note it defaults to the DOM node, can target a directive via <code>exportAs</code>, and is read in the class with <code>@ViewChild</code>.`,
    examples: [
      {
        label: "Read an input value via a template ref",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <input #box placeholder="type something" />
    <button (click)="show(box.value)">Show value</button>
    <p>{{ message }}</p>
  \`,
})
export class AppComponent {
  message = '';
  show(value: string) { this.message = 'You typed: ' + value; }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is ngTemplateOutlet?",
    answer: `**Core concept (TL;DR).** <code>[ngTemplateOutlet]</code> is a structural directive that **renders an <code>&lt;ng-template&gt;</code>** you point it at, optionally passing **context** data. It's how you reuse a template block in several places and parameterize it — Angular's lightweight equivalent of a render prop / slot with data.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='ngTemplateOutlet renders a referenced template with context'>
  <rect class='d-box' x='30' y='40' width='160' height='66' rx='10'/>
  <text class='d-text' x='110' y='66' text-anchor='middle'>&lt;ng-template #row&gt;</text>
  <text class='d-sub' x='110' y='88' text-anchor='middle'>defined once</text>
  <defs><marker id='ah-to' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L9,4 L0,8 Z'/></marker></defs>
  <line class='d-edge-accent' x1='190' y1='73' x2='268' y2='73' marker-end='url(#ah-to)'/>
  <rect class='d-box-accent' x='270' y='40' width='160' height='66' rx='10'/>
  <text class='d-text' x='350' y='64' text-anchor='middle'>[ngTemplateOutlet]</text>
  <text class='d-sub' x='350' y='86' text-anchor='middle'>renders it + context</text>
</svg>

**How it works.** You define a template once with <code>&lt;ng-template #tpl&gt;</code>, then render it anywhere with <code>&lt;ng-container [ngTemplateOutlet]="tpl"&gt;</code>. To parameterize it, pass <code>[ngTemplateOutletContext]="{ $implicit: value, extra: x }"</code> and declare <code>let-name</code> variables in the template (<code>let-item</code> binds to <code>$implicit</code>). This enables reusable, data-driven layout: a list component can accept a "row template" from its parent and render each item with it, much like passing a render function. It pairs naturally with <code>@ContentChild(TemplateRef)</code> to receive a template from a consumer.

### ngTemplateOutlet
| Piece | Purpose |
| --- | --- |
| <code>&lt;ng-template #tpl&gt;</code> | define the block |
| <code>[ngTemplateOutlet]="tpl"</code> | render it |
| <code>[ngTemplateOutletContext]</code> | pass data |
| <code>let-x</code> | bind context in the template |

> **Interview tip:** "Renders a referenced <code>ng-template</code> with optional context — reusable, parameterized templates (like a render prop)." Mention <code>let-x</code> binding to <code>$implicit</code> and receiving templates via <code>@ContentChild(TemplateRef)</code>.`,
    examples: [
      {
        label: "Reuse a template with context",
        tech: "angular",
        runnable: false,
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <ng-template #greet let-name let-role="role">
      <p>{{ name }} — {{ role }}</p>
    </ng-template>

    <!-- render the SAME template twice with different context -->
    <ng-container *ngTemplateOutlet="greet; context: { $implicit: 'Ada', role: 'Eng' }"></ng-container>
    <ng-container *ngTemplateOutlet="greet; context: { $implicit: 'Grace', role: 'Sci' }"></ng-container>
  \`,
})
export class AppComponent {}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is ViewEncapsulation in Angular?",
    answer: `**Core concept (TL;DR).** ViewEncapsulation controls how a component's **styles are scoped**. The default, <code>Emulated</code>, scopes styles to the component by adding unique attributes to its elements (so they don't leak out or in). <code>None</code> makes the styles **global**, and <code>ShadowDom</code> uses the browser's native **Shadow DOM** for real isolation.

<svg class='iq-diagram' viewBox='0 0 460 165' role='img' aria-label='Three view encapsulation modes: Emulated, None, ShadowDom'>
  <rect class='d-box-accent' x='20' y='34' width='130' height='104' rx='10'/>
  <text class='d-text' x='85' y='58' text-anchor='middle'>Emulated</text>
  <text class='d-sub' x='85' y='80' text-anchor='middle'>default</text>
  <text class='d-sub' x='85' y='96' text-anchor='middle'>attr-scoped styles</text>
  <text class='d-sub' x='85' y='112' text-anchor='middle'>no leaking</text>
  <rect class='d-box' x='165' y='34' width='130' height='104' rx='10'/>
  <text class='d-text' x='230' y='58' text-anchor='middle'>None</text>
  <text class='d-sub' x='230' y='80' text-anchor='middle'>styles are global</text>
  <text class='d-sub' x='230' y='96' text-anchor='middle'>can leak/clash</text>
  <rect class='d-box' x='310' y='34' width='130' height='104' rx='10'/>
  <text class='d-text' x='375' y='58' text-anchor='middle'>ShadowDom</text>
  <text class='d-sub' x='375' y='80' text-anchor='middle'>native shadow root</text>
  <text class='d-sub' x='375' y='96' text-anchor='middle'>true isolation</text>
</svg>

**How it works.** With <code>Emulated</code> (the default), Angular rewrites your component CSS and tags the component's elements with generated attributes like <code>_ngcontent-xyz</code>, so a rule only matches that component's view — giving scoping **without** real Shadow DOM, which works everywhere. <code>None</code> disables this: the styles are injected globally and apply to the whole page (useful for truly global theming, risky for leaks). <code>ShadowDom</code> attaches a real shadow root, giving genuine style + DOM isolation per the web standard, but it changes how global styles and content projection behave. You set it per component via the <code>encapsulation</code> property. To pierce emulated boundaries deliberately, the legacy <code>::ng-deep</code> exists (deprecated).

### Encapsulation modes
| Mode | Scoping | Notes |
| --- | --- | --- |
| <code>Emulated</code> | attribute-based | default, works everywhere |
| <code>None</code> | global | styles leak app-wide |
| <code>ShadowDom</code> | native shadow root | true isolation |

> **Interview tip:** "Default <code>Emulated</code> scopes CSS via generated attributes; <code>None</code> is global; <code>ShadowDom</code> uses a real shadow root." Mention <code>::ng-deep</code> (deprecated) for piercing emulated styles.`,
    examples: [
      {
        label: "Setting the encapsulation mode",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: '<span class="badge">New</span>',
  styles: ['.badge { color: crimson; font-weight: 700; }'],
  // Emulated (default) → scoped; None → global; ShadowDom → native isolation
  encapsulation: ViewEncapsulation.Emulated,
})
export class BadgeComponent {}`,
      },
    ],
  },
];

export default augments;
