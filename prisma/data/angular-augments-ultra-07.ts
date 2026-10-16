/**
 * Angular ULTRA — batch 07: dependency injection (how DI works, services,
 * root vs component providers, constructor injection vs inject(), when to use
 * each, InjectionToken, provider recipes, resolution modifiers, app
 * initializers).
 *
 * Full CLAUDE.md treatment per question, matching the React and Next.js ultra
 * banks: a plain-language story first, `📌 Interview term:` callouts, a
 * Verified section quoting output that was actually produced, a theme-aware
 * `.iq-diagram` SVG, comparison tables, topic-specific pitfalls, the §7
 * "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Picked up by `npm run augment:ng`. Sorts after angular-augments-{1,2,3} and
 * angular-augments-gold-*, so these override the older answers.
 *
 * Every "Verified" block was produced on Angular 22.2.3 with
 * scripts/verify-angular-example.mjs: AOT-compiled with ngc and
 * strictTemplates, booted with bootstrapApplication in jsdom. Examples marked
 * runnable also passed its --playground mode (plain transpile + JIT, the way
 * the site playground runs them). Compiler-output claims come from running
 * ngc 22.2.3 and reading the emitted JavaScript; deprecation and API-status
 * claims come from the 22.2.3 typings (`@deprecated` / `@publicApi` tags);
 * the tree-shaking observation comes from an `ng build` with CLI 22.2.3.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Dependency Injection work in Angular?",
    seoDescription:
      "How Angular DI works: providers register recipes, injectors build and cache instances, and lookups walk element then environment injectors.",
    description: `**Question presented to candidate:**
"Our components never call \`new\` on the services they use, yet they always get a working instance. Walk me through what Angular's dependency injection is actually doing behind the scenes."

**What a strong answer should cover:**
- **Dependency injection** means a class *declares* what it needs and something else builds and hands it over; in Angular that something is an **injector**.
- A **provider** is the recipe (token to "how to make it"); \`@Injectable({ providedIn: 'root' })\`, \`providers: [...]\` arrays and \`provideX()\` functions all register providers.
- Injectors form a **tree**: element injectors (from component and directive \`providers\`) are searched first, then environment injectors (root, route, platform), ending in a null injector that throws.
- Instances are **created lazily and cached** per injector, so a root service is a singleton and is never built if nobody asks for it.
- Dependencies are requested with \`inject()\` (or constructor parameters, which the compiler turns into the same calls).
- A missing provider fails with **NG0201** ("No provider found for ..."), including the dependency path.

**Clarifying questions expected:**
- "Do you want the mental model, or the compiled output too?"
- "Standalone app or NgModule-based? The injector tree is the same, but where providers are registered differs."

**Code / implementation expected:** Optional — a service that depends on another service, injected into a component, plus what happens when a provider is missing.`,
    answer: `**Target Audience:** Developers new to Angular, or who use services daily without knowing what builds them. Assumes TypeScript classes; no DI background needed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output block below was produced by compiling and running the code on Angular 22.2.3; the injector chain and error messages were printed by the running framework, not recalled.

## 1. Why This Even Matters — A Story First

Picture a restaurant kitchen. A chef making soup needs stock, onions and a pot. In a badly run kitchen, every chef walks to the market, buys their own onions and builds their own stove. Three chefs, three stoves, and if the onion supplier changes, every chef has to be retrained.

In a well-run kitchen the chef just writes "needs: stock, onions, pot" on a ticket. A kitchen manager reads the ticket, fetches the shared pot from the shelf, asks the prep station for onions (who in turn asks the vegetable supplier), and puts everything on the bench. The chef never knows where the onions came from, and in a test kitchen the manager can swap in plastic onions without the chef noticing.

Angular's **dependency injection** is that kitchen manager. Your component writes the ticket ("I need a <code>GreetingService</code>"), and Angular works out how to build it, what *it* needs, and whether one already exists that can be shared.

## 2. The Core Idea

📌 **Interview term: Dependency** — anything a class needs to do its job: another service, a config value, [the HTTP client](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i).

📌 **Interview term: Dependency Injection (DI)** — a design pattern where a class *asks for* its dependencies instead of creating them. The creation is done elsewhere, so the class is easier to reuse, configure and test.

📌 **Interview term: Injector** — the Angular object that holds providers, creates instances on demand and caches them. You rarely touch one directly, but every component and the app as a whole have one.

📌 **Interview term: Provider** — the recipe registered in an injector: "for this **token**, here is how to produce a value". <code>@Injectable({ providedIn: 'root' })</code>, a component <code>providers: [...]</code> array and functions such as <code>provideHttpClient()</code> all register providers. The four recipe shapes (<code>useClass</code>, <code>useValue</code>, <code>useFactory</code>, <code>useExisting</code>) have [their own page](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting).

📌 **Interview term: Token** — the key a provider is stored under and that you ask for. Usually a class; for things with no class (a config object, a string) it is an [InjectionToken](/interview-question/what-is-an-injectiontoken).

The whole system is three steps:

1. **Register**: providers are added to injectors at startup (root, route) or when a component is created (its <code>providers</code>).
2. **Request**: code asks for a token with <code>inject(Token)</code>, or with a constructor parameter, which the compiler converts into the same request. The two styles are compared in [constructor-based DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function).
3. **Resolve**: Angular walks up the injector tree until some injector has a provider for that token, builds the value if it does not exist yet, caches it in *that* injector and returns it.

## 3. The Injector Tree

<svg class="iq-diagram" width="100%" viewBox="0 0 700 420" role="img" aria-label="A lookup starts at the element injector of the requesting component, climbs parent element injectors, then the root environment injector, the platform injector and finally the null injector which throws NG0201">
  <defs>
    <marker id="q1di-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="28" text-anchor="middle">Element injectors</text>
  <text class="d-text" x="530" y="28" text-anchor="middle">Environment injectors</text>
  <rect class="d-box-accent" x="60" y="330" width="260" height="56" rx="10"/>
  <text class="d-text d-accent" x="190" y="354" text-anchor="middle">child component</text>
  <text class="d-sub" x="190" y="374" text-anchor="middle">inject(GreetingService)</text>
  <path class="d-edge-accent" d="M 190 326 L 190 262" marker-end="url(#q1di-arrow)"/>
  <rect class="d-box" x="60" y="200" width="260" height="56" rx="10"/>
  <text class="d-text" x="190" y="224" text-anchor="middle">parent component</text>
  <text class="d-sub" x="190" y="244" text-anchor="middle">its providers array</text>
  <path class="d-edge-accent" d="M 190 196 L 190 132" marker-end="url(#q1di-arrow)"/>
  <rect class="d-box" x="60" y="70" width="260" height="56" rx="10"/>
  <text class="d-text" x="190" y="94" text-anchor="middle">root component</text>
  <text class="d-sub" x="190" y="114" text-anchor="middle">its providers array</text>
  <path class="d-edge-accent" d="M 324 98 L 396 98" marker-end="url(#q1di-arrow)"/>
  <rect class="d-box-accent" x="400" y="70" width="260" height="56" rx="10"/>
  <text class="d-text d-accent" x="530" y="94" text-anchor="middle">root environment</text>
  <text class="d-sub" x="530" y="114" text-anchor="middle">providedIn root, app config</text>
  <path class="d-edge" d="M 530 130 L 530 196" marker-end="url(#q1di-arrow)"/>
  <rect class="d-box" x="400" y="200" width="260" height="56" rx="10"/>
  <text class="d-text" x="530" y="224" text-anchor="middle">platform</text>
  <text class="d-sub" x="530" y="244" text-anchor="middle">shared by apps on the page</text>
  <path class="d-edge-dashed" d="M 530 260 L 530 326" marker-end="url(#q1di-arrow)"/>
  <rect class="d-box-muted" x="400" y="330" width="260" height="56" rx="10"/>
  <text class="d-text" x="530" y="354" text-anchor="middle">NullInjector</text>
  <text class="d-sub" x="530" y="374" text-anchor="middle">throws NG0201</text>
</svg>

The search climbs the left column first, one component at a time, and only then moves to the right column. The first injector that has a provider wins, so a provider on a parent component *shadows* the root one for everything below it. That shadowing is exactly how [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component) differ, and the modifiers that change where the search starts and stops are covered in [@Self, @SkipSelf, @Optional and @Host](/interview-question/how-does-angular-s-dependency-resolution-search-work-using-self-skipself-optiona).

📌 **Interview term: Element injector** — the injector attached to a component or [directive](/interview-question/what-is-a-directive-and-what-are-the-types) in the DOM tree, filled from its <code>providers</code> and <code>viewProviders</code>.

📌 **Interview term: Environment injector** — an injector not tied to an element: the root injector created by [<code>bootstrapApplication</code>](/interview-question/how-do-you-bootstrap-a-standalone-angular-application), a child one per lazy route with <code>providers</code>, and the platform injector above them.

The right-hand chain is not a guess. Walking <code>.parent</code> from the injected <code>EnvironmentInjector</code> on 22.2.3 printed:

\`\`\`
env chain: R3Injector[environment,root] -> R3Injector[platform] -> NullInjector
\`\`\`

## 4. Who Registers What

| Where you write it | Which injector gets the provider | Lifetime of the instance |
| :--- | :--- | :--- |
| <code>@Injectable({ providedIn: 'root' })</code> or <code>@Service()</code> | Root environment injector | Whole app (one instance) |
| <code>bootstrapApplication(App, { providers: [...] })</code> / <code>app.config.ts</code> | Root environment injector | Whole app |
| <code>providers</code> on a lazy route | A child environment injector for that route | While that route subtree is loaded |
| <code>providers</code> on a component or directive | That element injector | Created and destroyed with that component instance |
| <code>viewProviders</code> on a component | That element injector, visible only to its own template | Same as the component |
| <code>new InjectionToken(..., { factory })</code> | Root, unless overridden | Whole app |

The route row is documented behaviour that this page did not exercise (it needs the router); the other rows are demonstrated in this batch of answers. For routing itself see [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular).

## 5. Verified: a chain built for you, lazily

The example below has <code>GreetingService</code> depending on <code>ClockService</code>, an <code>UnusedService</code> that nobody asks for, and a button that asks for a class no injector knows about. Compiled with <code>ngc</code> (strict templates) and run; the list items printed after the click were:

\`\`\`
li: ClockService constructed
li: GreetingService constructed
li: NG0201: No provider found for \`NotProvided\`. Source: Environment Injector. Find more at https://v22.angular.dev/errors/NG0201
\`\`\`

Three facts fall out of that output:

- **The component never mentioned ClockService**, yet it was built. Angular saw that <code>GreetingService</code> needs it and resolved it first, because <code>GreetingService</code> asks for it in a field initializer that runs before its own constructor body.
- **UnusedService was never constructed.** A provider is only a recipe; nothing is built until the token is requested. That laziness is why a root service costs nothing at runtime until used.
- **A missing provider is a runtime error with code NG0201.** Older Angular versions printed <code>NullInjectorError: No provider for X!</code>; on 22.2.3 the text is "No provider found for ...", and when the failure is deep in a chain Angular adds the path. Asking a <code>CartStore</code> that needs a <code>CheckoutApi</code> that needs an unprovided <code>PaymentGateway</code> printed (playground mode, so class names are unmangled):

\`\`\`
ERROR ɵNotFound: NG0201: No provider found for \`PaymentGateway\`. Source: Environment Injector. Path: CartStore -> CheckoutApi -> PaymentGateway. Find more at https://v22.angular.dev/errors/NG0201
\`\`\`

The error's <code>name</code> is <code>ɵNotFound</code>, which is why searching your logs for "NullInjectorError" can come up empty on modern versions.

## 6. What the Compiler Adds

DI is not reflection at runtime. The Angular compiler writes a small factory function onto every injectable class. For a root service <code>ngc</code> 22.2.3 emitted:

\`\`\`js
static ɵfac = function Logger_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || Logger)(); };
static ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: Logger, factory: Logger.ɵfac, providedIn: "root" });
\`\`\`

<code>ɵprov</code> is the provider (the recipe), <code>ɵfac</code> is the "how to build". When a class uses constructor parameters, the factory passes <code>ɵɵdirectiveInject(Dep)</code> calls as arguments; when it uses <code>inject()</code>, the factory takes no arguments and the calls run inside the class body. Both are covered in detail in [constructor-based DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function), and the compiler pipeline itself in [how Ivy compilation works](/interview-question/how-does-compilation-work-under-the-hood-in-ivy).

## 7. Why Angular Bothers

- **Sharing**: one [service](/interview-question/what-is-a-service-and-why-use-it) instance can hold state that many components read, which is how unrelated or [sibling components](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-) communicate.
- **Configuration**: swap an implementation per environment or per subtree without editing consumers (a fake payment gateway in staging, a different theme under one panel).
- **Testing**: a test registers a fake provider and every consumer receives it. See [mocking services in unit tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies).
- **Lifetimes for free**: component-level providers are destroyed with their component, so cleanup follows the UI.

## 8. Common Pitfalls

- **Searching for NullInjectorError in modern logs.** On 22.2.3 the message is "NG0201: No provider found for ..." and the error name is <code>ɵNotFound</code>. Read the <code>Path:</code> part; the missing token is the last one.
- **Expecting a provider to run code at startup.** Providers are lazy. If you need code to run before the app renders, that is what [app initializers](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st) are for.
- **Providing the same service in many components by accident.** Each <code>providers: [X]</code> creates a new instance for that subtree, silently splitting state.
- **Calling <code>inject()</code> in a click handler or <code>setTimeout</code>.** It only works in an injection context and throws NG0203 elsewhere; capture the dependency in a field instead, or use [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).
- **Using an interface as a token.** Interfaces vanish at runtime, so there is nothing to look up. Use an [InjectionToken](/interview-question/what-is-an-injectiontoken) or an abstract class.
- **Circular dependencies.** If A injects B and B injects A, Angular cannot build either. Break the cycle by extracting the shared part into a third service.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"Dependency injection means a class declares what it needs and an injector builds and hands it over, so the class never calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> on its collaborators."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three pieces:</strong> <span style="color:#f0e2c8;">"Providers are recipes registered under a token, injectors hold providers and cache instances, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> or a constructor parameter is the request."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The tree:</strong> <span style="color:#f0e2c8;">"Lookup starts at the requesting component element injector, climbs parent components, then the root environment injector, platform, and finally a null injector that throws NG0201."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Lifetimes:</strong> <span style="color:#f0e2c8;">"Instances are created lazily and cached per injector: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: root</code> gives one app-wide instance, a component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> array gives one per component instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why:</strong> <span style="color:#f0e2c8;">"It gives sharing, per-environment configuration and easy test fakes, and the compiler generates the factories, so there is no runtime reflection."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What error do you get for a missing provider, and how do you debug it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NG0201, "No provider found for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code>", with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Path:</code> showing the chain that led there. The last token in the path is the one with no provider. Fix it by adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: root</code>, a provider in the app config, or a provider on an ancestor component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a root service created at startup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Providers are lazy; the instance is built the first time something injects it and then cached. A service nobody injects is never constructed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between an element injector and an environment injector?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Element injectors belong to components and directives in the view tree and come from their <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> arrays. Environment injectors are the root, route-level and platform injectors. Lookup checks element injectors first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Angular know what a constructor needs if types disappear at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Angular compiler reads the parameter types at build time and writes a factory that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdirectiveInject(Type)</code> for each one. Without the compiler (a plain TypeScript transpile) that information is lost and you get NG0202.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you give one section of the app a different implementation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a provider for the same token on that section root component, or on its lazy route. Everything below it resolves the closer provider first, while the rest of the app keeps the root one.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dependency** | Something a class needs to work |
| **Dependency Injection** | Asking for dependencies instead of creating them |
| **Injector** | Holds providers, builds instances on demand, caches them |
| **Provider** | Recipe: for this token, produce this value |
| **Token** | The key you ask for: a class or an InjectionToken |
| **Element injector** | Injector of a component or directive, from its providers |
| **Environment injector** | Root, route or platform injector, not tied to an element |
| **NG0201** | Runtime error: no provider found for the requested token |

---
**Conclusion:** Angular DI is a lookup service with memory. Providers register recipes under tokens, a request with <code>inject()</code> or a constructor parameter climbs from the nearest element injector up to the root environment injector, and the first match builds the value once and caches it. On 22.2.3 we watched it build a two-level chain without the component knowing, skip a service nobody asked for, and fail with NG0201 and a readable path when a provider was missing. If you can draw that tree and explain where each provider lands, every other DI question (services, scopes, tokens, modifiers) is a variation on it.`,
    examples: [
      {
        label: "Injectors build a dependency chain lazily, and fail with NG0201 for a missing provider",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, Injector, inject, signal } from "@angular/core";

const log: string[] = [];

// A dependency of a dependency: Angular builds the whole chain for you.
@Injectable({ providedIn: "root" })
export class ClockService {
  constructor() { log.push("ClockService constructed"); }
  now() { return "09:30"; }
}

@Injectable({ providedIn: "root" })
export class GreetingService {
  private clock = inject(ClockService); // GreetingService asks for ClockService
  constructor() { log.push("GreetingService constructed"); }
  greet(name: string) { return \`Hello \${name}, it is \${this.clock.now()}\`; }
}

// Registered in root, but nobody injects it, so it is never constructed.
@Injectable({ providedIn: "root" })
export class UnusedService {
  constructor() { log.push("UnusedService constructed"); }
}

// No @Injectable and no provider anywhere.
export class NotProvided {}

@Component({
  selector: "app-root",
  template: \`
    <p>{{ message }}</p>
    <button (click)="tryMissing()">ask for a class nobody provides</button>
    <ol>
      @for (line of lines(); track $index) { <li>{{ line }}</li> }
    </ol>
  \`,
})
export class AppComponent {
  private greeter = inject(GreetingService); // the component asks; it never calls new
  private injector = inject(Injector);
  message = this.greeter.greet("Ada");
  lines = signal([...log]);

  tryMissing() {
    try {
      this.injector.get(NotProvided);
    } catch (e) {
      log.push((e as Error).message.split("\\n")[0]);
    }
    this.lines.set([...log]);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a service and why use it?",
    seoDescription:
      "An Angular service is an injectable class for shared state and logic. Why components stay thin, and how @Service() in v22.1 simplifies it.",
    description: `**Question presented to candidate:**
"Three components on our dashboard each fetch and filter notifications themselves, and they keep drifting out of sync. What is an Angular service, and how would one fix this?"

**What a strong answer should cover:**
- A **service** is a plain class that holds logic or state that does not belong to one view, made available through **dependency injection**.
- **Why**: one source of truth for shared state, reusable business rules, thin components, and an easy seam for test fakes.
- How it is registered: \`@Injectable({ providedIn: 'root' })\` for an app-wide singleton, or the newer \`@Service()\` decorator (Angular 22.1+), which is root-provided by default and only supports \`inject()\`.
- How it is consumed: \`inject(MyService)\` in a component, directive, pipe, guard or another service.
- Good practice: expose read-only state (a readonly signal or observable) and mutate only through service methods.
- Scope matters: root gives one shared instance; a component \`providers\` array gives each component its own.

**Clarifying questions expected:**
- "Should all three components see the same notifications, or does each need its own list?"
- "Is the data local state, or does it come from an API that should be cached?"

**Code / implementation expected:** Yes — a small service with state and methods, injected into two or more components.`,
    answer: `**Target Audience:** Beginners who have built a few components and are starting to duplicate logic between them.
**Difficulty:** Easy

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The output in section 5 was produced by compiling and running the example on Angular 22.2.3; the <code>@Service()</code> facts come from the 22.2.3 typings, the compiler and the CLI 22.2.3 schematic.

## 1. Why This Even Matters — A Story First

A small hotel has three front desks: check-in, concierge and the bar. At first each desk keeps its own paper list of which rooms are occupied. Within a week the lists disagree. The bar charges a guest who already checked out; the concierge books a taxi for an empty room.

The fix is not a better paper list at each desk. It is one booking system in the back office that every desk *asks*. The desks become simple: they show what the system says and send requests to it. The rules (no double bookings, no blank names) live in one place.

In Angular, each desk is a component, and the back-office system is a **service**.

## 2. The Core Idea

📌 **Interview term: Service** — an ordinary TypeScript class that holds logic or state that should not live inside one component: talking to an API, caching results, formatting money, holding the current user, tracking a cart. Angular does not require any base class; what makes it a service is that it is registered with [dependency injection](/interview-question/how-does-dependency-injection-work-in-angular).

📌 **Interview term: Separation of concerns** — each piece of code has one job. Components handle *display and user input*; services handle *data and rules*. A component that only reads state and forwards clicks is often called a **thin** or **presentational** component.

📌 **Interview term: Singleton** — exactly one instance shared by everyone who asks. A service provided in root is a singleton for the whole app. The alternative, one instance per component, is covered in [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).

📌 **Interview term: Single source of truth** — the one place a piece of state lives. Everyone else reads from it rather than keeping a copy that can drift.

The two halves of using a service:

1. **Declare it** with a decorator that registers a provider: <code>@Injectable({ providedIn: 'root' })</code>, or on 22.1+ simply <code>@Service()</code>.
2. **Ask for it** wherever it is needed with <code>inject(ToastService)</code> (the two injection styles are compared in [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)). The component never calls <code>new</code>; the injector builds the instance once and hands the same one to everyone.

## 3. One Service, Many Components

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Header, composer and list components all inject one ToastService, which owns the toasts signal and the rules for changing it">
  <defs>
    <marker id="q2svc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">Header</text>
  <text class="d-sub" x="120" y="74" text-anchor="middle">reads count</text>
  <rect class="d-box" x="260" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="350" y="54" text-anchor="middle">Composer</text>
  <text class="d-sub" x="350" y="74" text-anchor="middle">calls show(text)</text>
  <rect class="d-box" x="490" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="580" y="54" text-anchor="middle">List</text>
  <text class="d-sub" x="580" y="74" text-anchor="middle">reads toasts, dismiss(id)</text>
  <path class="d-edge-accent" d="M 120 90 L 290 176" marker-end="url(#q2svc-arrow)"/>
  <path class="d-edge-accent" d="M 350 90 L 350 176" marker-end="url(#q2svc-arrow)"/>
  <path class="d-edge-accent" d="M 580 90 L 410 176" marker-end="url(#q2svc-arrow)"/>
  <rect class="d-box-accent" x="200" y="180" width="300" height="90" rx="12"/>
  <text class="d-text d-accent" x="350" y="208" text-anchor="middle">ToastService (one instance)</text>
  <text class="d-sub" x="350" y="232" text-anchor="middle">private signal: the only copy</text>
  <text class="d-sub" x="350" y="254" text-anchor="middle">rules: trim, reject blank</text>
</svg>

The three components never talk to each other. They each inject the same <code>ToastService</code>, read its read-only signal, and call its methods. Because there is only one copy of the list, they cannot disagree, which is the standard answer to [passing data between sibling components](/interview-question/how-do-you-pass-data-between-sibling-components-that-don-t-have-a-direct-parent-).

## 4. Service vs Component Responsibilities

| Concern | Component | Service |
| :--- | :--- | :--- |
| Template, layout, CSS | Yes | No |
| Reacting to clicks and typing | Yes, then delegates | No |
| Shared state (cart, user, toasts) | Reads it | Owns it |
| Business rules and validation logic | No | Yes |
| HTTP calls and caching | No | Yes (with [<code>HttpClient</code>](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i)) |
| Lifetime | Lives while on screen | Root: whole app; component-provided: with that component |
| Tested by | Rendering it ([TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed)) | Calling methods, often no DOM at all |

## 5. Verified: three components, one source of truth

The example registers <code>ToastService</code> with <code>@Service()</code> and injects it into a header, a composer and the root list. Compiled with <code>ngc</code> (strict templates), run in jsdom, then typed into and clicked. Each line is the text content of the root element, so adjacent elements run together:

\`\`\`
RENDERED       : Inbox (0)send
after send 1   : Inbox (1)sendDeploy finished x
after blank    : Inbox (1)sendDeploy finished x
after send 2   : Inbox (2)sendDeploy finished xBuild failed x
after dismiss 1: Inbox (1)sendBuild failed x
\`\`\`

- The **header count** changed even though the header never received an input or event: it reads the same signal the composer wrote to.
- The **blank message was rejected** by the service, so no component needs its own "is it empty" check.
- The **list is read-only to components** (<code>asReadonly()</code>); only <code>show</code> and <code>dismiss</code> can change it. Exposing state this way is the core of most [Angular state management](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular) approaches, from a plain signal service up to [NgRx](/interview-question/what-is-ngrx).

The same file also passed the playground check (plain transpile + JIT), so you can run it on the site.

## 6. @Injectable vs the newer @Service

Angular 22.1 added a second decorator for the most common case. Both are <code>@publicApi</code> in the 22.2.3 typings:

| | <code>@Injectable({ providedIn: 'root' })</code> | <code>@Service()</code> |
| :--- | :--- | :--- |
| Provided in root by default | Only with <code>providedIn: 'root'</code> | Yes |
| Opt out of auto-providing | Leave out <code>providedIn</code> | <code>@Service({ autoProvided: false })</code> |
| Constructor parameters | Allowed | Compile error <code>NG2028</code> |
| Custom <code>factory</code> | Via providers | <code>@Service({ factory: () => ... })</code> |
| What <code>ng generate service</code> emits on CLI 22.2.3 | With <code>--injectable</code> | Default |

Two of those rows were checked by compiling: a constructor parameter on a <code>@Service</code> class failed with

\`\`\`
error NG2028: @Service class cannot use constructor dependency injection. Use the \`inject\` function instead.
\`\`\`

and an <code>autoProvided: false</code> service injected without any provider failed with NG0201, while the same class listed in a component <code>providers</code> array worked. The CLI row comes from the CLI 22.2.3 schematic, whose <code>injectable</code> option defaults to false with the description "When true, generates an @Injectable instead of @Service". Angular's migration guide dates <code>@Service</code> to v22.1 (source: <a href="https://angular.dev/reference/migrations/injectable-to-service" target="_blank" rel="noopener noreferrer">angular.dev injectable-to-service migration</a>), and <code>ng generate @angular/core:service</code> converts eligible classes. Existing <code>@Injectable</code> code keeps working unchanged. The <code>inject()</code> requirement is one reason the [inject() vs constructor decision](/interview-question/inject-vs-constructor-injection-when-should-you-use-each) now leans firmly one way.

## 7. What Makes a Good Service

- **One responsibility.** <code>CartService</code>, <code>AuthService</code>, <code>PriceFormatter</code>, not a 2,000-line <code>AppService</code>.
- **Private writable state, public read-only view.** A private <code>signal</code> plus <code>asReadonly()</code> or <code>computed</code>; see [Angular signals](/interview-question/what-are-angular-signals). With RxJS the same idea is a private <code>BehaviorSubject</code> exposed with <code>asObservable()</code> (see [Subject vs BehaviorSubject](/interview-question/what-is-the-difference-between-subject-behaviorsubject-and-replaysubject)).
- **No DOM access.** A service that touches <code>document</code> breaks under [server-side rendering](/interview-question/what-is-angular-universal-ssr) and is harder to test.
- **Depends on abstractions where it helps.** Ask for a token or an abstract class, so tests and environments can swap the implementation ([provider recipes](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting)).

## 8. Common Pitfalls

- **Logic stays in components "for now".** The duplication starts with the second component that needs it. Move rules to a service as soon as two places need them.
- **Exposing the writable signal or subject.** Any component can then set state directly, and the rules in the service are bypassed.
- **Adding the service to a component <code>providers</code> array "to be safe".** That creates a separate instance for that component, so it stops sharing state with everyone else.
- **Forgetting HTTP is cold.** Two components calling a service method that returns <code>http.get(...)</code> make two requests unless the service caches, for example with [shareReplay](/interview-question/explain-the-sharereplay-operator-in-rxjs-and-how-it-prevents-duplicate-http-requ).
- **Subscribing inside a root service and never unsubscribing.** A root service lives forever; subscriptions it opens to long-lived streams live forever too. See [avoiding memory leaks from subscriptions](/interview-question/how-do-you-avoid-memory-leaks-from-subscriptions).
- **Using constructor parameters with <code>@Service()</code>.** It is a compile error (NG2028); use <code>inject()</code> fields.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"A service is a plain class for logic or state that does not belong to one view, made available to components through dependency injection."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">"It gives one source of truth for shared state, keeps business rules in one place, keeps components thin, and gives tests a seam to swap in fakes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to declare:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Injectable({ providedIn: 'root' })</code> makes an app-wide singleton; on Angular 22.1+ <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Service()</code> does the same by default and requires <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> instead of constructor parameters."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How to use:</strong> <span style="color:#f0e2c8;">"Components call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(ToastService)</code> and get the same instance; they read its read-only signal and call its methods, never mutate its state directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope:</strong> <span style="color:#f0e2c8;">"Root gives one shared instance; listing it in a component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> array gives each component its own copy, which is useful for per-widget state."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share data between components that are not parent and child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put the state in a root service, expose it as a read-only signal or observable, and inject the service in both components. They stay decoupled and cannot drift apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providedIn: root</code> actually do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It registers the provider in the root environment injector, so the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> anywhere builds one instance and every later request gets that same instance. Nothing is built if no one asks for it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just export a plain object or module-level variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You lose DI: no per-test replacement, no per-subtree override, no lifecycle (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code> on component-scoped services), and on the server a module-level variable is shared across requests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@Service({ autoProvided: false })</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the service must not be global, for example per-component form state or a per-route store. You then list it in a component or route <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> array, and each provider site gets its own instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a component that uses a service?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Provide a fake for the service token in the test injector, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ provide: ToastService, useValue: fake }</code>, then assert on the component output and on the calls the fake received.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Service** | Injectable class for shared logic or state |
| **Separation of concerns** | Components display; services hold data and rules |
| **Singleton** | One instance shared by every consumer |
| **Single source of truth** | The only place a piece of state lives |
| **@Injectable** | Decorator that makes a class injectable; <code>providedIn</code> chooses the scope |
| **@Service** | Angular 22.1+ decorator: root-provided by default, <code>inject()</code> only |
| **asReadonly()** | Turns a writable signal into a read-only view for consumers |

---
**Conclusion:** A service is where Angular wants your shared state and business rules to live, so components can stay thin and cannot drift out of sync. Register it once (<code>@Injectable({ providedIn: 'root' })</code>, or <code>@Service()</code> on 22.1+), inject it wherever it is needed, keep its writable state private, and every component reads the same truth. On 22.2.3 we watched a header update from a composer it never talked to, a blank message rejected in one place, and the compiler refuse constructor injection on a <code>@Service</code> class, which tells you where modern Angular is heading.`,
    examples: [
      {
        label: "A ToastService shared by three components, with the rules kept in the service",
        tech: "angular",
        runnable: true,
        code: `import { Component, Service, computed, inject, signal } from "@angular/core";

export interface Toast {
  id: number;
  text: string;
}

// The service owns the state and the rules. Components only display and forward clicks.
// @Service() (Angular 22.1+) is provided in root, like @Injectable({ providedIn: "root" }).
@Service()
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly(); // components can read, not write
  readonly count = computed(() => this._toasts().length);

  show(text: string) {
    const clean = text.trim();
    if (!clean) return; // business rule lives here, not in every component
    this._toasts.update((list) => [...list, { id: this.nextId++, text: clean }]);
  }
  dismiss(id: number) {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

@Component({
  selector: "app-header",
  template: \`<header>Inbox ({{ toasts.count() }})</header>\`,
})
export class Header {
  toasts = inject(ToastService);
}

@Component({
  selector: "app-composer",
  template: \`
    <input #box placeholder="message" />
    <button (click)="toasts.show(box.value); box.value = ''">send</button>
  \`,
})
export class Composer {
  toasts = inject(ToastService);
}

@Component({
  selector: "app-root",
  imports: [Header, Composer],
  template: \`
    <app-header />
    <app-composer />
    <ul>
      @for (t of toasts.toasts(); track t.id) {
        <li>{{ t.text }} <button (click)="toasts.dismiss(t.id)">x</button></li>
      }
    </ul>
  \`,
})
export class AppComponent {
  toasts = inject(ToastService); // same instance the header and composer got
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between providing a service in root vs in a component?",
    seoDescription:
      "providedIn root gives one app-wide singleton; a component providers array gives each component instance its own copy, destroyed with it.",
    description: `**Question presented to candidate:**
"We have a \`CartService\`. One teammate put \`providedIn: 'root'\` on it, another added it to a component's \`providers\` array, and now some screens see an empty cart. Explain the difference between those two ways of providing it."

**What a strong answer should cover:**
- \`providedIn: 'root'\` registers the service in the **root environment injector**: one **singleton** for the whole app, created on first use, living until the app is destroyed.
- \`providers: [CartService]\` on a component registers it in that component's **element injector**: a **new instance per component instance**, shared with that component's children, destroyed with it (its \`ngOnDestroy\` runs).
- Lookup walks up from the requesting component, so a component-level provider **shadows** the root one for its subtree; that is why some screens saw a different, empty cart.
- When to use each: root for app-wide state and stateless helpers; component-level for per-widget state that must reset when the widget goes away.
- Root providers are tree-shakable by design (no \`providers\` array references the class), while a class listed in \`providers\` is always bundled.

**Clarifying questions expected:**
- "Should every screen share one cart, or should each widget own its own state?"
- "Is the component that provides it rendered more than once, for example in a list?"

**Code / implementation expected:** Yes — count instances created and destroyed under each option.`,
    answer: `**Target Audience:** Developers who know what a service is and now need to reason about how many instances exist and how long they live.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The construction and destruction logs in section 5 were printed by the example running on Angular 22.2.3, and the bundle observation in section 6 comes from an <code>ng build</code> with CLI 22.2.3.

## 1. Why This Even Matters — A Story First

A school has one **main library**. Anyone in any classroom can borrow from it, and a book returned by one class is there for the next. That is convenient, and it is also the problem: if one class scribbles in a book, every class sees the scribbles.

Some classrooms also keep a **classroom shelf**. When a new class starts in room 4, it gets a fresh empty shelf. When the class ends, the shelf is cleared. Room 5 has a different shelf; nothing put on room 4's shelf ever appears in room 5.

Providing a service in **root** is the main library. Providing it in a **component** is the classroom shelf: a new one per component instance, gone when the component goes. Neither is better; the question is which behaviour the state needs.

## 2. The Core Idea

📌 **Interview term: providedIn: 'root'** — registers the [service](/interview-question/what-is-a-service-and-why-use-it) with the **root environment injector**. The first [<code>inject()</code>](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function) anywhere creates the instance and every later request gets the same object. It lives until the application is destroyed.

📌 **Interview term: Component-level provider** — listing the service in a component's <code>providers</code> array. It registers the service in that component's **element injector**. Each *instance* of that component gets its own service instance, and the component's children see it too.

📌 **Interview term: Shadowing** — because lookup walks up from the requester and stops at the first match (see [how DI works](/interview-question/how-does-dependency-injection-work-in-angular)), a component-level provider hides the root one for everything below that component. The root instance still exists; that subtree simply never reaches it.

📌 **Interview term: Service lifetime** — how long an instance lives. Root: app lifetime. Component-provided: exactly the lifetime of the component instance, and Angular calls the service's <code>ngOnDestroy</code> when the component is destroyed.

## 3. Where the Instances Live

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Two shared cart components resolve CartService number 1 from the root injector, while each own cart component has its own providers entry and gets instances 2 and 3">
  <defs>
    <marker id="q3scope-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="24" width="300" height="60" rx="12"/>
  <text class="d-text d-accent" x="350" y="50" text-anchor="middle">Root environment injector</text>
  <text class="d-sub" x="350" y="70" text-anchor="middle">CartService #1</text>
  <rect class="d-box" x="20" y="230" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="256" text-anchor="middle">shared cart</text>
  <text class="d-sub" x="95" y="276" text-anchor="middle">no providers</text>
  <rect class="d-box" x="190" y="230" width="150" height="60" rx="10"/>
  <text class="d-text" x="265" y="256" text-anchor="middle">shared cart</text>
  <text class="d-sub" x="265" y="276" text-anchor="middle">no providers</text>
  <rect class="d-box" x="360" y="230" width="150" height="60" rx="10"/>
  <text class="d-text" x="435" y="256" text-anchor="middle">own cart</text>
  <text class="d-sub" x="435" y="276" text-anchor="middle">CartService #2</text>
  <rect class="d-box" x="530" y="230" width="150" height="60" rx="10"/>
  <text class="d-text" x="605" y="256" text-anchor="middle">own cart</text>
  <text class="d-sub" x="605" y="276" text-anchor="middle">CartService #3</text>
  <path class="d-edge-accent" d="M 95 226 L 280 90" marker-end="url(#q3scope-arrow)"/>
  <path class="d-edge-accent" d="M 265 226 L 330 90" marker-end="url(#q3scope-arrow)"/>
  <path class="d-edge-dashed" d="M 435 226 L 435 186"/>
  <path class="d-edge-dashed" d="M 605 226 L 605 186"/>
  <text class="d-sub" x="520" y="160" text-anchor="middle">stops at own element injector</text>
</svg>

The two "shared" components climb to the root injector and get the same object. Each "own" component finds a provider on its own element injector, so the search stops there and builds a private instance. The dashed stubs mean "the lookup never goes further up".

## 4. Side by Side

| | <code>providedIn: 'root'</code> | <code>providers: [CartService]</code> on a component |
| :--- | :--- | :--- |
| Injector | Root environment injector | That component element injector |
| Instances | One for the whole app | One per component instance |
| Who can see it | Everyone (unless shadowed) | That component and its descendants |
| Created | On first <code>inject()</code> | When the component is created and something injects it |
| Destroyed | When the app is destroyed | When that component is destroyed (<code>ngOnDestroy</code> runs) |
| Typical use | Auth, current user, API clients, app-wide cart | Per-widget form state, a wizard step store, one editor tab |
| Bundle | Tree-shakable by design | Always bundled with the component that lists it |

A third place, <code>providers</code> on a lazy route or in <code>bootstrapApplication</code>, registers in an *environment* injector rather than an element one; see [bootstrapping a standalone app](/interview-question/how-do-you-bootstrap-a-standalone-angular-application) and [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular). And <code>viewProviders</code>, a variant visible only to the component's own template, is shown in [the resolution modifiers answer](/interview-question/how-does-angular-s-dependency-resolution-search-work-using-self-skipself-optiona).

## 5. Verified: counting constructions

The example renders two components without providers and two with <code>providers: [CartService]</code>, then toggles the second pair off and on. The service logs in its constructor and its <code>ngOnDestroy</code>. Compiled with <code>ngc</code> (strict templates) and run in jsdom; the lines with a colon are the root element text, so adjacent elements run together:

\`\`\`
CartService #1 created
CartService #2 created
CartService #3 created
RENDERED              : shared uses #1 items=0 addshared uses #1 items=0 addown uses #2 items=0 addown uses #3 items=0 addtoggle own carts
after add on shared[0]: shared uses #1 items=1 addshared uses #1 items=1 addown uses #2 items=0 addown uses #3 items=0 addtoggle own carts
after add on own[0]   : shared uses #1 items=1 addshared uses #1 items=1 addown uses #2 items=1 addown uses #3 items=0 addtoggle own carts
-- toggle own carts off
CartService #2 destroyed
CartService #3 destroyed
after toggle off      : shared uses #1 items=1 addshared uses #1 items=1 addtoggle own carts
-- toggle back on
CartService #4 created
CartService #5 created
after toggle on       : shared uses #1 items=1 addshared uses #1 items=1 addown uses #4 items=0 addown uses #5 items=0 addtoggle own carts
CartService #4 destroyed
CartService #5 destroyed
CartService #1 destroyed
\`\`\`

What this proves:

- **Root is one instance.** Clicking "add" in the first shared cart changed *both* shared carts, because both hold <code>#1</code>.
- **Component-level is one per instance.** The two own carts got <code>#2</code> and <code>#3</code>, and adding to one did not touch the other or the root.
- **Component-level dies with the component.** Removing the own carts with <code>@if</code> ran <code>ngOnDestroy</code> on <code>#2</code> and <code>#3</code>; showing them again built fresh <code>#4</code> and <code>#5</code> with zero items. That reset is often exactly what you want for per-widget state, and a nasty surprise when you wanted persistence.
- **Root dies last.** <code>#1</code> was destroyed only when the app itself was destroyed at the end of the run.

The same file passed the playground check too, so you can toggle it yourself.

## 6. Tree-shaking, Measured Honestly

📌 **Interview term: Tree-shakable provider** — a provider the build can drop when nothing uses it. With <code>providedIn: 'root'</code>, the provider lives on the class itself, so no <code>providers</code> array has to import the class. If no consumer imports it, the bundler never sees it.

A class listed in a <code>providers</code> array, by contrast, is always referenced and always shipped. In an <code>ng build</code> with CLI 22.2.3 we listed a never-injected <code>CsvExporter</code> in <code>app.config.ts</code> providers and it was in the bundle, as expected. One nuance showed up as well: a never-injected <code>providedIn: 'root'</code> class defined *in the same file* as that used class was also still in the bundle. Tree-shaking works on what is imported and reachable, not on what is injected, so "tree-shakable" means "can be dropped when nothing imports it", not "dropped when nothing injects it". Keep one service per file and the distinction rarely matters. Bundle tooling is covered in [the esbuild-based build](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve).

## 7. Choosing

- **Is the state the same for everyone on every screen?** Root.
- **Should it reset when a widget closes, or exist once per row, tab or dialog?** Component-level.
- **Is it stateless (formatters, API wrappers)?** Root; extra instances only cost memory.
- **Does a subtree need a different implementation of the same token?** Component-level provider of that token, which shadows root for the subtree.

## 8. Common Pitfalls

- **Adding a root service to a component <code>providers</code> array "just to be safe".** It silently creates a second instance, so that component and its children stop sharing state with the rest of the app. This is the empty-cart bug from the question.
- **Expecting component-provided state to survive navigation.** The instance is destroyed with the component; route back and you get a fresh, empty one.
- **Putting a component-scoped service into a list item.** Every row gets its own instance; with 500 rows that is 500 services.
- **Injecting a component-scoped service from a sibling.** Siblings are not descendants; they climb past it to root (or fail with NG0201).
- **Forgetting <code>ngOnDestroy</code> in component-scoped services.** They do get it, so that is the place to complete subjects and clear timers.
- **Assuming a service listed in the app config is the same as <code>providedIn: 'root'</code> for bundling.** Both give a singleton, but the listed one is always bundled.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The short version:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: root</code> gives one singleton in the root environment injector; a component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> array gives each component instance its own copy in its element injector."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lookup:</strong> <span style="color:#f0e2c8;">"DI searches from the requesting component upwards and stops at the first provider, so a component-level provider shadows the root one for that whole subtree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lifetime:</strong> <span style="color:#f0e2c8;">"Root lives as long as the app. A component-provided service is created with the component and destroyed with it, including its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnDestroy</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When:</strong> <span style="color:#f0e2c8;">"Root for app-wide state and stateless helpers; component-level for per-widget state that should reset, or for overriding an implementation in one subtree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">"Counting constructions on Angular 22.2.3: two consumers of the root service shared instance one, two component-provided copies were two and three and were destroyed and rebuilt on toggle."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Two sibling components both list a service in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providers</code>. Do they share it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each gets its own instance in its own element injector. To share, remove the component providers and use root, or provide it once on a common parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about providing in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bootstrapApplication</code> providers instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providedIn: root</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both put a single instance in the root environment injector. The difference is bundling: a class listed in providers is always shipped, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: root</code> can be dropped if nothing imports it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a route-level provider different from a component-level one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Route <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> create a child environment injector for that lazy route subtree, shared by every component under the route, rather than one instance per component. It is the middle ground between root and component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providedIn: 'any'</code> an option?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is deprecated in the 22.2.3 typings, along with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn</code> an NgModule. Use root, a route provider or a component provider instead.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **providedIn: root** | Register in the root environment injector: one app-wide instance |
| **Component-level provider** | <code>providers</code> on a component: one instance per component instance |
| **Element injector** | Injector attached to a component or [directive](/interview-question/what-is-a-directive-and-what-are-the-types) |
| **Shadowing** | A closer provider hides a farther one for a subtree |
| **Service lifetime** | How long an instance lives before being destroyed |
| **Tree-shakable provider** | Provider the build can drop when nothing imports the class |

---
**Conclusion:** The two options differ in *which injector* holds the provider, and that decides how many instances exist and how long they live. Root means one shared instance for the whole app; a component <code>providers</code> array means a private instance per component instance that shadows root for its subtree and is destroyed with it. On 22.2.3 we counted it: shared consumers held instance one, each component-provided copy got its own number, and toggling those components destroyed and rebuilt them with empty state. Pick root for shared truth, component-level for state that should be born and die with a widget.`,
    examples: [
      {
        label: "Counting constructions: one root singleton vs one instance per component",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, OnDestroy, inject, signal } from "@angular/core";

let created = 0;

// One class, two ways to provide it.
@Injectable({ providedIn: "root" })
export class CartService implements OnDestroy {
  readonly id = ++created;
  readonly items = signal(0);
  constructor() { console.log(\`CartService #\${this.id} created\`); }
  ngOnDestroy() { console.log(\`CartService #\${this.id} destroyed\`); }
}

// No providers: asks the tree, finds the root singleton.
@Component({
  selector: "app-shared-cart",
  template: \`<p>shared uses #{{ cart.id }} items={{ cart.items() }}
    <button (click)="cart.items.update(n => n + 1)">add</button></p>\`,
})
export class SharedCart { cart = inject(CartService); }

// providers: [CartService] gives THIS component (and its children) a fresh instance.
@Component({
  selector: "app-own-cart",
  providers: [CartService],
  template: \`<p>own uses #{{ cart.id }} items={{ cart.items() }}
    <button (click)="cart.items.update(n => n + 1)">add</button></p>\`,
})
export class OwnCart { cart = inject(CartService); }

@Component({
  selector: "app-root",
  imports: [SharedCart, OwnCart],
  template: \`
    <app-shared-cart />
    <app-shared-cart />
    @if (showOwn()) { <app-own-cart /> <app-own-cart /> }
    <button (click)="showOwn.set(!showOwn())">toggle own carts</button>
  \`,
})
export class AppComponent {
  showOwn = signal(true);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between constructor-based DI and the inject() function?",
    seoDescription:
      "What constructor injection and inject() compile to, where inject() may be called (injection context), and how each behaves with inheritance.",
    description: `**Question presented to candidate:**
"Here are two versions of the same component: one takes \`Logger\` and \`Api\` as constructor parameters, the other has \`logger = inject(Logger)\` fields. Explain what each one compiles to, where \`inject()\` is allowed to run, and what changes when the class extends a base class."

**What a strong answer should cover:**
- **Constructor injection**: the Angular compiler reads parameter types at build time and generates a factory calling \`ɵɵdirectiveInject(Type, flags)\` per parameter; decorators like \`@Optional()\` and \`@SkipSelf()\` become bit flags.
- **\`inject()\`**: the factory takes no arguments; the \`inject()\` calls run inside the class while Angular is constructing it, using the same resolution machinery and the same options (\`optional\`, \`self\`, \`skipSelf\`, \`host\`).
- **Injection context**: \`inject()\` only works during construction (field initializers, constructor), in provider factories, in functional guards/interceptors/initializers, or inside \`runInInjectionContext\`; elsewhere it throws **NG0203**.
- **Inheritance**: with constructor DI every subclass must repeat and forward the parent's dependencies through \`super(...)\`; with \`inject()\` the base class injects for itself and \`super()\` takes no arguments.
- Field-initializer ordering: \`inject()\` fields can be used by later fields; a field that reads a constructor parameter property is a TypeScript error (TS2729).
- Without the Angular compiler (plain transpile), constructor parameter types are lost and DI fails with **NG0202**; \`inject()\` does not depend on type metadata.

**Clarifying questions expected:**
- "Do you want the generated code, or just the behavioural differences?"

**Code / implementation expected:** Yes — the same class in both styles, ideally with a base class, and the compiled factory lines.`,
    answer: `**Target Audience:** Developers comfortable with services who want to know what actually happens when Angular builds a class, for example before migrating a codebase.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The compiled factories in section 3 were emitted by <code>ngc</code> 22.2.3 from the code shown, and every error message below was printed by running code on Angular 22.2.3. This page is the *mechanics*; the "which should I pick" guide is the sibling question [inject() vs constructor injection: when to use each](/interview-question/inject-vs-constructor-injection-when-should-you-use-each).

## 1. Why This Even Matters — A Story First

Two ways to order lunch for a new hire.

**Option A:** the new hire fills in a form at the door, listing everything they need: "a laptop, a badge, a parking pass". Reception reads the form and hands everything over before they walk in. If the new hire's team lead *also* had a form ("a laptop, a badge"), and the new hire inherits that role, they must copy those lines onto their own form and pass them up to the team lead's form as well.

**Option B:** the new hire walks in and, while still in the lobby, picks things up from labelled shelves: laptop, badge, parking pass. The team-lead role picks up its own things from the same shelves. Nobody fills in anyone else's form. The only rule: you can only pick things up **while you are still in the lobby**. Once you are at your desk, the shelves are out of reach.

Option A is **constructor injection**. Option B is <code>inject()</code>, and "the lobby" is the **injection context**.

## 2. The Core Idea

📌 **Interview term: Constructor injection** — dependencies are declared as constructor parameters with types: <code>constructor(private logger: Logger) {}</code>. The Angular compiler reads those types at build time.

📌 **Interview term: inject() function** — <code>logger = inject(Logger)</code>, a function from <code>@angular/core</code> that asks the *currently active* injector for a token. It became public API in Angular 14 (source: <a href="https://dev.to/lucaspaganini/whats-new-in-angular-14-91j" target="_blank" rel="noopener noreferrer">What is new in Angular 14</a>).

📌 **Interview term: Injection context** — the window of time in which Angular has an injector "active" so that <code>inject()</code> can find it: while constructing a class Angular creates (field initializers and constructor body), inside a provider's <code>useFactory</code>, inside functional [guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards), [interceptors](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-) and [app initializers](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st), and inside [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it).

📌 **Interview term: Factory (ɵfac)** — the function the compiler adds to every injectable class that Angular calls to build an instance. Both styles end up as a factory; they differ in *where* the dependency requests live.

## 3. What Each Style Compiles To

Given this source (abridged):

\`\`\`ts
@Component({ selector: "ctor-style", template: \`\` })
export class CtorStyle {
  constructor(private logger: Logger, @Optional() @SkipSelf() private api: Api | null) {}
}

@Component({ selector: "inject-style", template: \`\` })
export class InjectStyle {
  private logger = inject(Logger);
  private api = inject(Api, { optional: true, skipSelf: true });
}
\`\`\`

<code>ngc</code> 22.2.3 emitted:

\`\`\`js
// constructor style: the requests are ARGUMENTS of the factory
static ɵfac = function CtorStyle_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || CtorStyle)(i0.ɵɵdirectiveInject(Logger), i0.ɵɵdirectiveInject(Api, 12)); };

// inject() style: the factory has no arguments; the calls stay in the class body
logger = inject(Logger);
api = inject(Api, { optional: true, skipSelf: true });
static ɵfac = function InjectStyle_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || InjectStyle)(); };
\`\`\`

The <code>12</code> is a bit mask. The 22.2.3 typings list the internal flags as <code>Host = 1</code>, <code>Self = 2</code>, <code>SkipSelf = 4</code>, <code>Optional = 8</code>, so <code>@Optional() @SkipSelf()</code> became <code>4 + 8</code>. The options object <code>{ optional: true, skipSelf: true }</code> means the same thing at runtime; the typings for <code>inject()</code> say its options "correspond to injection strategies that can be specified with parameter decorators <code>@Host</code>, <code>@Self</code>, <code>@SkipSelf</code>, and <code>@Optional</code>". The modifiers themselves are explained in [@Self, @SkipSelf, @Optional and @Host](/interview-question/how-does-angular-s-dependency-resolution-search-work-using-self-skipself-optiona).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Constructor style puts the dependency requests in the factory arguments, inject style puts them inside the class body which runs during construction">
  <defs>
    <marker id="q4fac-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="28" text-anchor="middle">Constructor style</text>
  <text class="d-text" x="530" y="28" text-anchor="middle">inject() style</text>
  <rect class="d-box-accent" x="30" y="50" width="280" height="56" rx="10"/>
  <text class="d-text d-accent" x="170" y="74" text-anchor="middle">factory resolves deps first</text>
  <text class="d-sub" x="170" y="94" text-anchor="middle">directiveInject(Logger), (Api, 12)</text>
  <path class="d-edge-accent" d="M 170 110 L 170 166" marker-end="url(#q4fac-arrow)"/>
  <rect class="d-box" x="30" y="170" width="280" height="56" rx="10"/>
  <text class="d-text" x="170" y="194" text-anchor="middle">new CtorStyle(logger, api)</text>
  <text class="d-sub" x="170" y="214" text-anchor="middle">values arrive as arguments</text>
  <rect class="d-box" x="390" y="50" width="280" height="56" rx="10"/>
  <text class="d-text" x="530" y="74" text-anchor="middle">factory: new InjectStyle()</text>
  <text class="d-sub" x="530" y="94" text-anchor="middle">opens the injection context</text>
  <path class="d-edge-accent" d="M 530 110 L 530 166" marker-end="url(#q4fac-arrow)"/>
  <rect class="d-box-accent" x="390" y="170" width="280" height="56" rx="10"/>
  <text class="d-text d-accent" x="530" y="194" text-anchor="middle">field initializers run</text>
  <text class="d-sub" x="530" y="214" text-anchor="middle">inject(Logger), inject(Api, opts)</text>
</svg>

Both columns hit the same resolver with the same flags; only the place the request is written differs. That one difference explains everything else on this page.

## 4. Consequence 1: Type Metadata

Constructor injection needs the compiler to have seen the parameter *types*. TypeScript erases types, so a plain transpile (no Angular compiler) produces a factory with nothing to inject. Booting a constructor-injected component that way (the site playground mode) failed with:

\`\`\`
RuntimeError: NG0202: This constructor is not compatible with Angular Dependency Injection because its dependency at index 0 of the parameter list is invalid.
This can happen if the dependency type is a primitive like a string or if an ancestor of this class is missing an Angular decorator.
\`\`\`

The same file worked after <code>ngc</code>. <code>inject(Logger)</code> passes the class itself as a runtime value, so it needs no metadata and worked in both modes. That is also why every runnable example in this bank uses <code>inject()</code>. The compiler side is covered in [AOT vs JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation).

## 5. Consequence 2: The Injection Context

Because <code>inject()</code> asks "the injector that is active right now", it only works while one is active. The runnable example calls it from a click handler and then from inside <code>runInInjectionContext</code>. On 22.2.3 the handler printed:

\`\`\`
li: constructor: logger came from the base class
li: NG0203: \`inject()\` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`
li: runInInjectionContext gave https://api.example.com
\`\`\`

The usual fix is not <code>runInInjectionContext</code> but capturing the dependency in a field while you are still constructing. Note that [lifecycle hooks](/interview-question/what-are-angular-lifecycle-hooks) such as <code>ngOnInit</code> are *not* an injection context either; see [the constructor vs ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit) for what belongs where.

| Where the code runs | Injection context? |
| :--- | :--- |
| Field initializer of a component, [directive](/interview-question/what-is-a-directive-and-what-are-the-types), pipe or [service](/interview-question/what-is-a-service-and-why-use-it) | Yes |
| Constructor body | Yes |
| <code>useFactory</code> of a provider ([recipes](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting)), [<code>InjectionToken</code>](/interview-question/what-is-an-injectiontoken) <code>factory</code> | Yes |
| Functional guard, [resolver](/interview-question/what-is-a-route-resolver-and-when-is-it-useful), interceptor, <code>provideAppInitializer</code> callback | Yes |
| <code>ngOnInit</code> and other lifecycle hooks | No |
| Event handlers, <code>setTimeout</code>, <code>subscribe</code> callbacks, <code>await</code> continuations | No |
| Inside <code>runInInjectionContext(injector, fn)</code> | Yes |

## 6. Consequence 3: Inheritance

This is the most practical difference. With constructor injection, a subclass that declares its own constructor must accept *every* parent dependency and forward it. The non-runnable example below compiled with <code>ngc</code>, and the generated factory shows the subclass resolving the parent's dependencies itself:

\`\`\`js
static ɵfac = function BasePage_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || BasePage)(i0.ɵɵdirectiveInject(Logger), i0.ɵɵdirectiveInject(Api)); };
static ɵfac = function AppComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || AppComponent)(i0.ɵɵdirectiveInject(Logger), i0.ɵɵdirectiveInject(Api, 12)); };
\`\`\`

Add a dependency to the base class and every subclass constructor breaks. With <code>inject()</code> the base class requests its own dependencies in field initializers, the subclass adds its own, and <code>super()</code> takes no arguments. Both the runnable example and a three-way test (constructor subclass, <code>inject()</code> subclass, and a subclass with no constructor at all) rendered correctly:

\`\`\`
ctor-child: logger api analytics | inject-child: logger api analytics | no-ctor-child: logger api
\`\`\`

A subclass with no constructor of its own reuses the parent's factory; <code>ngc</code> emitted <code>ɵɵgetInheritedFactory(NoCtorChild)</code> for it. The base class needs <code>@Directive()</code> (or another Angular decorator) so the compiler generates its factory; leaving it off is one of the causes NG0202 names ("an ancestor of this class is missing an Angular decorator").

## 7. Consequence 4: Field Ordering

Class fields run in order, top to bottom, before the constructor body. With <code>inject()</code> that is useful: in the example the <code>endpoint</code> field reads <code>this.api.baseUrl</code> and works because <code>api</code> was injected on an earlier line. With a constructor parameter property the field runs *before* the parameter is assigned, and TypeScript stops the build:

\`\`\`
error TS2729: Property 'logger' is used before its initialization.
\`\`\`

(That was compiling <code>label = this.logger.name</code> with <code>constructor(private logger: Logger) {}</code>.) Constructor style forces such derived values into the constructor body.

## 8. Same Behaviour, Two Syntaxes

| | Constructor injection | <code>inject()</code> |
| :--- | :--- | :--- |
| Where the request is written | Parameter list | Field initializer or constructor body |
| Compiled factory | Passes <code>ɵɵdirectiveInject(T, flags)</code> arguments | No arguments |
| Needs type metadata (Angular compiler) | Yes, else NG0202 | No |
| Modifiers | <code>@Optional() @Self() @SkipSelf() @Host()</code>, <code>@Inject(TOKEN)</code> | <code>inject(T, { optional, self, skipSelf, host })</code>, <code>inject(TOKEN)</code> |
| Return type with <code>optional</code> | You write <code>T &#124; null</code> yourself | Typed as <code>T &#124; null</code> by the overloads |
| Usable outside classes | No | Yes, in any injection context (helper functions) |
| Subclasses | Must repeat and forward deps to <code>super()</code> | <code>super()</code> with no arguments |
| <code>new X(fake)</code> in a plain unit test | Works | Throws NG0203 unless wrapped in an injector |
| Allowed on <code>@Service()</code> classes (22.1+) | No, NG2028 | Yes |

The testing row and the "which should we standardise on" question are the subject of [when to use each](/interview-question/inject-vs-constructor-injection-when-should-you-use-each).

## 9. Common Pitfalls

- **Calling <code>inject()</code> in <code>ngOnInit</code> or a handler.** Throws NG0203. Move it to a field.
- **Assuming the constructor parameter decorators are deprecated.** In the 22.2.3 typings <code>@Optional</code>, <code>@Self</code>, <code>@SkipSelf</code>, <code>@Host</code> and <code>@Inject</code> are all still <code>@publicApi</code> with no deprecation tag.
- **Using a parameter property in a field initializer.** TS2729; either inject in the field or compute in the constructor body.
- **Forgetting <code>@Directive()</code> on an abstract base class.** The compiler then has no factory for it and subclasses fail with NG0202.
- **Mixing both styles in one class without a reason.** It works, but readers must look in two places for dependencies, and the migration tool will leave a half-converted file.
- **Calling <code>inject()</code> after an <code>await</code>.** Even inside an initializer or guard, code after the first <code>await</code> runs later, outside the context. Inject everything first, then await.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same engine:</strong> <span style="color:#f0e2c8;">"Both styles go through the same resolver with the same flags; they differ only in where the request is written and when it runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Constructor DI:</strong> <span style="color:#f0e2c8;">"The compiler reads parameter types and writes a factory that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdirectiveInject(Type, flags)</code> for each one and passes the results to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. inject():</strong> <span style="color:#f0e2c8;">"The factory calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> with no arguments, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> calls inside field initializers ask the injector that is active during construction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Injection context:</strong> <span style="color:#f0e2c8;">"So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> only works in constructors, field initializers, provider factories, functional guards and interceptors, or inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runInInjectionContext</code>; elsewhere it throws NG0203."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Inheritance:</strong> <span style="color:#f0e2c8;">"With constructors every subclass must repeat and forward the parent dependencies to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> the base class injects for itself and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> takes nothing."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does constructor injection fail without the Angular compiler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TypeScript erases parameter types, so a plain transpile leaves the factory nothing to inject and Angular throws NG0202. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(Logger)</code> passes the class as a runtime value, so it needs no metadata.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@Optional() @SkipSelf()</code> turn into?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A bit mask on the generated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdirectiveInject</code> call: SkipSelf is 4, Optional is 8, so ngc emits 12. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> equivalent is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ optional: true, skipSelf: true }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject()</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngOnInit</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Lifecycle hooks run after construction, outside the injection context, so it throws NG0203. Inject in a field and use the value in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngOnInit</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject()</code> be used outside a class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, in any function that runs in an injection context, which is what makes reusable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injectSomething()</code> helpers and functional guards and interceptors possible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are the parameter decorators deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in 22.2.3: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Optional</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Self</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@SkipSelf</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Host</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Inject</code> are still public API. The newer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Service()</code> decorator simply refuses constructor parameters.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Constructor injection** | Dependencies declared as typed constructor parameters |
| **inject()** | Function that asks the active injector for a token |
| **Injection context** | The time window in which <code>inject()</code> can find an injector |
| **Factory (ɵfac)** | Compiler-generated function that builds an instance |
| **ɵɵdirectiveInject** | Generated call that resolves one constructor parameter |
| **NG0202** | Constructor parameter could not be resolved (often missing metadata) |
| **NG0203** | <code>inject()</code> called outside an injection context |

---
**Conclusion:** Constructor injection and <code>inject()</code> feed the same resolver with the same flags; the compiled output on 22.2.3 shows the only difference is whether the requests are factory *arguments* or calls *inside* construction. That one difference has four consequences: constructor DI needs the Angular compiler's type metadata (NG0202 without it), <code>inject()</code> needs an active injection context (NG0203 outside it), <code>inject()</code> frees subclasses from forwarding dependencies to <code>super()</code>, and <code>inject()</code> fields can feed later fields. Knowing those mechanics is what lets you make the style decision in [the sibling question](/interview-question/inject-vs-constructor-injection-when-should-you-use-each) on evidence rather than taste.`,
    examples: [
      {
        label: "inject() in field initializers, a base class, and the NG0203 injection-context error",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, Injectable, Injector, inject, runInInjectionContext, signal } from "@angular/core";

const log: string[] = [];

@Injectable({ providedIn: "root" })
export class Logger {
  write(msg: string) { log.push(msg); }
}

@Injectable({ providedIn: "root" })
export class Api {
  readonly baseUrl = "https://api.example.com";
}

// 1. inject() works in field initializers, so later fields can use earlier ones.
// 2. A base class grabs its own deps: subclasses never pass anything to super().
@Directive()
export abstract class BasePage {
  protected logger = inject(Logger);
  protected api = inject(Api);
  protected endpoint = \`\${this.api.baseUrl}/orders\`; // api is already set here
}

@Component({
  selector: "app-root",
  template: \`
    <p>endpoint: {{ endpoint }}</p>
    <button (click)="injectInHandler()">inject() inside a click handler</button>
    <button (click)="injectWithContext()">same, wrapped in runInInjectionContext</button>
    <ol>
      @for (line of lines(); track $index) { <li>{{ line }}</li> }
    </ol>
  \`,
})
export class AppComponent extends BasePage {
  private injector = inject(Injector); // capture the injector while we are still in context
  lines = signal<string[]>([]);

  constructor() {
    super(); // no arguments: the base class injected for itself
    this.logger.write("constructor: logger came from the base class");
    this.lines.set([...log]);
  }

  injectInHandler() {
    try {
      inject(Api); // not an injection context any more
    } catch (e) {
      const msg = (e as Error).message; // "NG0203: The \`Api\` token injection failed. \`inject()\` function must..."
      this.logger.write(\`\${msg.slice(0, 6)}: \${msg.split(". ")[1]}\`);
    }
    this.lines.set([...log]);
  }

  injectWithContext() {
    const api = runInInjectionContext(this.injector, () => inject(Api));
    this.logger.write(\`runInInjectionContext gave \${api.baseUrl}\`);
    this.lines.set([...log]);
  }
}`,
      },
      {
        label: "The same base class written with constructor injection (needs the Angular compiler)",
        tech: "angular",
        runnable: false,
        code: `import { Component, Directive, Injectable, Optional, SkipSelf } from "@angular/core";

@Injectable({ providedIn: "root" })
export class Logger {
  write(msg: string) { console.log(msg); }
}

@Injectable({ providedIn: "root" })
export class Api {
  readonly baseUrl = "https://api.example.com";
}

// Constructor style: the compiler reads the parameter TYPES and writes the factory:
//   new AppComponent(ɵɵdirectiveInject(Logger), ɵɵdirectiveInject(Api, 12))
// (12 = SkipSelf 4 + Optional 8). This needs the Angular compiler (ng build / ngc);
// a plain TypeScript transpile drops the types and fails with NG0202.
@Directive()
export abstract class BasePage {
  protected endpoint: string;
  constructor(protected logger: Logger, protected api: Api | null) {
    this.endpoint = \`\${api?.baseUrl ?? "none"}/orders\`;
  }
}

@Component({
  selector: "app-root",
  template: \`<p>endpoint: {{ endpoint }}</p>\`,
})
export class AppComponent extends BasePage {
  // Every subclass has to repeat the parent dependencies and forward them.
  constructor(logger: Logger, @Optional() @SkipSelf() api: Api | null) {
    super(logger, api);
    this.logger.write("constructor: deps forwarded to super()");
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "inject() vs constructor injection — when should you use each?",
    seoDescription:
      "A decision guide: default to inject() in modern Angular, when constructor injection still fits, and how each affects testing and migration.",
    description: `**Question presented to candidate:**
"We are starting a new Angular 22 project and the team is split: half write constructor injection, half write \`inject()\`. Which should we standardise on, and are there cases where the other one is still the right call?"

**What a strong answer should cover:**
- A clear default: **\`inject()\`** for new code. It is what the Angular docs, the CLI-generated \`@Service()\` decorator and functional APIs (guards, interceptors, resolvers, initializers) are built around.
- Concrete reasons: works outside classes (reusable \`injectX()\` helpers), no \`super(...)\` forwarding in subclasses, typed optional results, no dependence on compiler type metadata, and required by \`@Service()\` (constructor parameters are compile error NG2028).
- Where constructor injection still fits: existing codebases with a consistent style, classes you want to \`new\` directly in plain unit tests, and libraries supporting older Angular versions.
- The cost of \`inject()\`: it only runs in an **injection context**, so tests must create the class through an injector (TestBed, \`Injector.create\` or \`runInInjectionContext\`).
- Migration path: \`ng generate @angular/core:inject\` converts constructor injection automatically; do it per folder and keep one style per class.

**Clarifying questions expected:**
- "Is this greenfield, or are we converting an existing codebase?"
- "How are services unit tested today: \`new\` with fakes, or TestBed?"

**Code / implementation expected:** Optional — a reusable inject helper, and a test showing how each style is instantiated with a fake.`,
    answer: `**Target Audience:** Developers and tech leads choosing a team convention, and candidates asked "which do you prefer and why?".
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. This page is the *decision guide*. What each style compiles to, the injection-context rules and the inheritance mechanics are in the sibling question [constructor-based DI vs the inject() function](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function); here they are used as evidence, not re-derived. All outputs were produced on Angular 22.2.3.

## 1. Why This Even Matters — A Story First

A kitchen is choosing between two knife sets. Both cut. The chefs who joined ten years ago swear by the old set; the new hires were trained on the new one. The question the head chef has to answer is not "which knife is sharper?" but "what do the recipes, the equipment and the suppliers assume from now on?".

That is this question. Both styles inject the same instances through the same resolver. What matters is which one the rest of modern Angular is designed around, which situations each makes easier, and how much it costs to switch.

## 2. The Short Answer

📌 **Interview term: inject-first** — the convention of using <code>inject()</code> for all new code. It is the default in the current Angular documentation and tooling.

📌 **Interview term: Functional API** — an Angular extension point written as a plain function instead of a class: [functional route guards](/interview-question/what-are-functional-route-guards-and-how-do-they-differ-from-class-based-guards), [functional HTTP interceptors](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-), [resolvers](/interview-question/what-is-a-route-resolver-and-when-is-it-useful), <code>provideAppInitializer</code> callbacks. A function has no constructor, so these can only get dependencies through <code>inject()</code>.

📌 **Interview term: Inject helper (inject function)** — a reusable function that calls <code>inject()</code> internally, by convention named <code>injectSomething()</code>, so a component can get a configured behaviour in one line.

For new Angular 22 code: **use <code>inject()</code>**, and keep constructor injection only for the specific cases in section 5.

## 3. The Decision Flow

<svg class="iq-diagram" width="100%" viewBox="0 0 700 380" role="img" aria-label="Decision flow: functional APIs and Service classes require inject, existing consistent codebases and plain new based tests may keep constructors, everything else defaults to inject">
  <defs>
    <marker id="q5dec-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="24" width="300" height="56" rx="10"/>
  <text class="d-text" x="190" y="48" text-anchor="middle">Plain function or @Service?</text>
  <text class="d-sub" x="190" y="68" text-anchor="middle">guard, interceptor, initializer</text>
  <path class="d-edge-accent" d="M 344 52 L 456 52" marker-end="url(#q5dec-arrow)"/>
  <text class="d-sub" x="400" y="40" text-anchor="middle">yes</text>
  <rect class="d-box-accent" x="460" y="24" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="560" y="57" text-anchor="middle">inject() required</text>
  <path class="d-edge" d="M 190 84 L 190 146" marker-end="url(#q5dec-arrow)"/>
  <text class="d-sub" x="210" y="120" text-anchor="start">no</text>
  <rect class="d-box" x="40" y="150" width="300" height="56" rx="10"/>
  <text class="d-text" x="190" y="174" text-anchor="middle">Existing code, one style?</text>
  <text class="d-sub" x="190" y="194" text-anchor="middle">or tests that call new X(fake)</text>
  <path class="d-edge" d="M 344 178 L 456 178" marker-end="url(#q5dec-arrow)"/>
  <text class="d-sub" x="400" y="166" text-anchor="middle">yes</text>
  <rect class="d-box-muted" x="460" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="560" y="174" text-anchor="middle">constructor is fine</text>
  <text class="d-sub" x="560" y="194" text-anchor="middle">migrate when touched</text>
  <path class="d-edge" d="M 190 210 L 190 272" marker-end="url(#q5dec-arrow)"/>
  <text class="d-sub" x="210" y="246" text-anchor="start">no</text>
  <rect class="d-box-accent" x="40" y="276" width="300" height="56" rx="10"/>
  <text class="d-text d-accent" x="190" y="300" text-anchor="middle">Default: inject()</text>
  <text class="d-sub" x="190" y="320" text-anchor="middle">fields at the top of the class</text>
</svg>

The first question has a forced answer; only the second one is a genuine judgement call, and it is about consistency and test style rather than capability.

## 4. Reasons to Default to inject()

| Situation | Why <code>inject()</code> wins | Evidence on 22.2.3 |
| :--- | :--- | :--- |
| Functional guards, interceptors, resolvers, initializers | Functions have no constructor | These APIs are function-typed; see [provideAppInitializer](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st) |
| <code>@Service()</code> classes (22.1+, CLI default) | Constructor parameters are rejected | Compile error <code>NG2028: @Service class cannot use constructor dependency injection</code> |
| Reusable behaviour across components | Works in a plain helper function | Section 6 example |
| Class hierarchies | <code>super()</code> takes no arguments | Shown in [the mechanics answer](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function) |
| Derived fields | Later fields can use injected ones | Constructor version fails with TS2729 |
| Optional dependencies | Return type is <code>T &#124; null</code> automatically | <code>inject()</code> overloads in the typings |
| Tooling without the Angular compiler | No type metadata needed | Constructor style threw NG0202 in a plain transpile |

## 5. When Constructor Injection Is Still Reasonable

- **A large existing codebase written consistently in constructor style.** Mixed styles cost more in readability than either style costs alone. Convert folder by folder with the official migration rather than piecemeal by hand.
- **Plain unit tests that construct classes directly.** <code>new PriceCalculator(fakeApi)</code> needs no Angular at all. With <code>inject()</code> the same class must be created through an injector. Section 7 shows both.
- **Libraries that support old Angular versions.** <code>inject()</code> outside constructors is fine from v14, but a library supporting earlier majors has no choice.
- **Personal or team preference, explicitly agreed.** Both are public, supported API on 22.2.3; the parameter decorators carry no deprecation tag. Preference is a legitimate reason as long as it is one convention, not two.

## 6. Verified: the helper only inject() allows

The runnable example defines <code>injectScreenTracking(screen)</code>. It injects a shared <code>Analytics</code> service *and the calling component's* <code>DestroyRef</code> (the injectable form of the destroy [lifecycle hook](/interview-question/what-are-angular-lifecycle-hooks)), logs "enter", registers "leave" for when the component is destroyed, and returns a tracking function. Two components use it in one line each. Compiled with <code>ngc</code>, run, the cart button clicked and the screen switched; the list then read:

\`\`\`
li: enter cart
li: cart: checkout clicked
li: leave cart
li: enter profile
\`\`\`

"leave cart" printed before "enter profile": Angular destroyed the cart (running the helper's <code>onDestroy</code>) before creating the profile. Constructor parameters cannot express this pattern: the logic would have to be copied into each component's constructor and <code>ngOnDestroy</code>, or moved into a base class. This is the same mechanism behind APIs like <code>toSignal</code> cleaning up after themselves (see [toSignal and toObservable](/interview-question/how-do-tosignal-and-toobservable-bridge-signals-and-rxjs)). The file also passed the playground check.

## 7. Verified: what each style means for tests

The second, non-runnable example simulates a unit test by running code *outside* any injection context (inside a <code>setTimeout</code>). It printed:

\`\`\`
new CtorCheckout(fake).total = 2
new InjectCheckout() -> NG0203
via Injector.create   = 2
via runInInjectionContext = 2
\`\`\`

So the trade is real but small: the constructor class can be <code>new</code>ed with a fake; the <code>inject()</code> class needs a test injector, which in a real suite is one line of <code>TestBed.configureTestingModule({ providers: [{ provide: PriceApi, useValue: fake }] })</code> and <code>TestBed.inject(InjectCheckout)</code>. A suite that already uses TestBed for components barely notices the difference. See [mocking services in unit tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies) and [testing with TestBed](/interview-question/explain-how-to-perform-unit-testing-on-components-with-signals-using-testbed). This example is not runnable on the site because its constructor-injected class needs the Angular compiler (the playground would throw NG0202).

## 8. Migrating an Existing Codebase

The 22.2.3 <code>@angular/core</code> package ships an <code>inject-migration</code> schematic ("Converts usages of constructor-based injection to the inject() function", alias <code>inject</code>):

\`\`\`
ng generate @angular/core:inject
\`\`\`

It can target a path, so a reasonable plan is: run it on one feature folder, review the diff, run the tests, commit, repeat. Afterwards, <code>ng generate @angular/core:service</code> can turn eligible <code>@Injectable({ providedIn: 'root' })</code> classes ([what providedIn root means](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component)) into <code>@Service()</code> (see [what a service is](/interview-question/what-is-a-service-and-why-use-it)). Neither tool was run against a real project for this answer; the schematic names and descriptions were read from the package's <code>collection.json</code>.

## 9. Common Pitfalls

- **Deciding per file.** The worst outcome is both styles inside one class. Pick one convention and enforce it with review or a lint rule.
- **Converting and then injecting in <code>ngOnInit</code>.** Hooks are not an injection context (see [constructor vs ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit)); the migrated code throws NG0203. Fields only.
- **Rewriting tests to <code>new</code> an inject()-style class.** That throws NG0203; create it through TestBed or <code>Injector.create</code>.
- **Treating helpers as globals.** An <code>injectX()</code> helper still needs an injection context at the call site; calling it from a click handler fails the same way.
- **Thinking constructor injection is deprecated.** It is not; it is simply no longer the style new APIs are designed around, and <code>@Service()</code> does not accept it.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Position:</strong> <span style="color:#f0e2c8;">"For new Angular 22 code I default to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>, and I keep constructor injection only where an existing codebase is consistently written that way."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Forced cases:</strong> <span style="color:#f0e2c8;">"Functional guards, interceptors, resolvers and app initializers have no constructor, and the new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Service()</code> decorator rejects constructor parameters with NG2028, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> is required there anyway."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Real benefits:</strong> <span style="color:#f0e2c8;">"It enables reusable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injectX()</code> helpers, removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> forwarding in class hierarchies, lets later fields use injected ones, and types optional dependencies as nullable for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">"It only works in an injection context, so tests create the class through TestBed or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Injector.create</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new X(fake)</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng generate @angular/core:inject</code> folder by folder, review, test, commit, and never leave both styles in one class."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is constructor injection deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In 22.2.3 the parameter decorators are still public API with no deprecation tag. It is simply not what new APIs are designed around, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Service()</code> refuses it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject()</code> make classes harder to test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slightly different, not harder. Instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new X(fake)</code> you provide the fake in TestBed and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestBed.inject(X)</code>, which most Angular suites already do for components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give an example of something only <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject()</code> can do.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A helper like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">injectScreenTracking()</code> that injects a service plus the caller <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DestroyRef</code>, so one line in any component wires up tracking and its cleanup. A constructor cannot be shared like that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Any performance difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not meaningfully. Both compile to the same resolver calls with the same flags; the difference is where the call sits in the generated code.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **inject-first** | Team convention: <code>inject()</code> for all new code |
| **Functional API** | Guard, interceptor, resolver or initializer written as a function |
| **Inject helper** | Reusable function that calls <code>inject()</code> for its caller |
| **Injection context** | When <code>inject()</code> is allowed to run |
| **inject migration** | <code>ng generate @angular/core:inject</code>, converts constructor DI |
| **NG2028** | Compile error: constructor DI on a <code>@Service</code> class |

---
**Conclusion:** Both styles reach the same injector, so the choice is about where Angular is going and what your code needs to do. Functional APIs and <code>@Service()</code> force <code>inject()</code>; reusable helpers, class hierarchies and derived fields are easier with it; and its one cost, needing an injection context, is absorbed by TestBed in most test suites. Default to <code>inject()</code> for new code, keep a consistent constructor-style codebase until you migrate it with the official schematic, and never mix the two inside one class.`,
    examples: [
      {
        label: "A reusable inject helper that only inject() makes possible",
        tech: "angular",
        runnable: true,
        code: `import { Component, DestroyRef, Injectable, inject, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class Analytics {
  readonly events = signal<string[]>([]);
  track(e: string) { this.events.update((list) => [...list, e]); }
}

// A reusable "inject function": only possible with inject(), because it runs
// inside whichever component calls it and can reach that component's DestroyRef.
export function injectScreenTracking(screen: string) {
  const analytics = inject(Analytics);
  analytics.track(\`enter \${screen}\`);
  inject(DestroyRef).onDestroy(() => analytics.track(\`leave \${screen}\`));
  return (action: string) => analytics.track(\`\${screen}: \${action}\`);
}

@Component({
  selector: "app-cart",
  template: \`<button (click)="track('checkout clicked')">checkout</button>\`,
})
export class Cart {
  track = injectScreenTracking("cart"); // one line, no constructor, no ngOnDestroy
}

@Component({
  selector: "app-profile",
  template: \`<span>profile</span>\`,
})
export class Profile {
  track = injectScreenTracking("profile");
}

@Component({
  selector: "app-root",
  imports: [Cart, Profile],
  template: \`
    @if (onCart()) { <app-cart /> } @else { <app-profile /> }
    <button (click)="onCart.set(!onCart())">switch screen</button>
    <ol>
      @for (e of analytics.events(); track $index) { <li>{{ e }}</li> }
    </ol>
  \`,
})
export class AppComponent {
  analytics = inject(Analytics);
  onCart = signal(true);
}`,
      },
      {
        label: "Testing seams: new with a fake vs an injector around inject()",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injectable, Injector, inject, runInInjectionContext } from "@angular/core";

@Injectable({ providedIn: "root" })
export class PriceApi {
  price(sku: string) { return 100; }
}

// Constructor style: a plain class you can "new" with any fake.
@Injectable({ providedIn: "root" })
export class CtorCheckout {
  constructor(private api: PriceApi) {}
  total(skus: string[]) { return skus.reduce((sum, s) => sum + this.api.price(s), 0); }
}

// inject() style: needs an injector around it when it is created.
@Injectable({ providedIn: "root" })
export class InjectCheckout {
  private api = inject(PriceApi);
  total(skus: string[]) { return skus.reduce((sum, s) => sum + this.api.price(s), 0); }
}

const fakeApi: PriceApi = { price: () => 1 };

@Component({ selector: "app-root", template: \`<pre>{{ report }}</pre>\` })
export class AppComponent {
  report = "";
  constructor() {
    const lines: string[] = [];
    // A unit test runs OUTSIDE any injection context. Simulate that with setTimeout.
    setTimeout(() => {
      lines.push(\`new CtorCheckout(fake).total = \${new CtorCheckout(fakeApi).total(["a", "b"])}\`);
      try {
        new InjectCheckout();
      } catch (e) {
        lines.push(\`new InjectCheckout() -> \${(e as Error).message.slice(0, 6)}\`);
      }
      const testInjector = Injector.create({ providers: [{ provide: PriceApi, useValue: fakeApi }, InjectCheckout] });
      lines.push(\`via Injector.create   = \${testInjector.get(InjectCheckout).total(["a", "b"])}\`);
      const viaContext = runInInjectionContext(testInjector, () => new InjectCheckout());
      lines.push(\`via runInInjectionContext = \${viaContext.total(["a", "b"])}\`);
      console.log(lines.join("\\n"));
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is an InjectionToken?",
    seoDescription:
      "An InjectionToken is a typed DI key for values with no runtime class: config objects, interfaces, functions and multi-provider lists.",
    description: `**Question presented to candidate:**
"Our app needs an \`ApiConfig\` object (base URL, retry count) available everywhere, and \`ApiConfig\` is a TypeScript interface. Why can't we just inject the interface, and what is an \`InjectionToken\`?"

**What a strong answer should cover:**
- DI looks values up by a **runtime key**; interfaces, type aliases and primitives are erased by TypeScript, so there is nothing to look up (the compiler reports NG2003 for an interface constructor parameter).
- An **\`InjectionToken<T>\`** is a unique object used as that key, with a type parameter so \`inject(TOKEN)\` is typed as \`T\`; the string is only a description for error messages.
- Provide a value for it with \`{ provide: TOKEN, useValue | useFactory | useClass | useExisting }\`, or give it a default with \`new InjectionToken('x', { providedIn: 'root', factory: () => ... })\`, which is tree-shakable.
- Token identity is by **object, not by description**: two tokens with the same text are different keys.
- Common uses: config objects, feature flags, functions, \`multi: true\` extension points (\`HTTP_INTERCEPTORS\`, \`NG_VALUE_ACCESSOR\`), browser globals such as \`DOCUMENT\`.
- Alternatives: an abstract class works as a token when you also want a contract with methods.

**Clarifying questions expected:**
- "Should there be a sensible default, or must every app supply the config?"
- "Will one part of the app need a different value?"

**Code / implementation expected:** Yes — a typed config token with a default, an override, and a multi token.`,
    answer: `**Target Audience:** Developers who have injected services and now need to inject something that is not a class: config, a string, a function.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The outputs below were produced by compiling and running the code on Angular 22.2.3, and the API notes come from the 22.2.3 typings.

## 1. Why This Even Matters — A Story First

A hotel's left-luggage desk stores bags by **ticket**. You hand over a suitcase, you get ticket 417, and later ticket 417 gets you that exact suitcase back.

Now imagine a guest who says: "I left a bag shaped like a rectangle, roughly blue." The clerk cannot help. Thousands of bags match that description, and the description is not something the shelf is indexed by. What the clerk needs is the *ticket*.

Angular's injector is that desk. A class like <code>CartService</code> is its own ticket: the class object exists at runtime and is unique. An interface like <code>ApiConfig</code> is a description ("something with a baseUrl and retries") that TypeScript throws away when it compiles. There is no ticket. An **InjectionToken** is how you print one.

## 2. The Core Idea

📌 **Interview term: Token** — the key under which a provider is stored and later looked up. Lookup is by identity (<code>===</code>), not by name or shape. See [how DI works](/interview-question/how-does-dependency-injection-work-in-angular).

📌 **Interview term: Type erasure** — TypeScript interfaces, type aliases and generic parameters exist only at compile time. The JavaScript that runs has no trace of them, so they cannot be keys.

📌 **Interview term: InjectionToken** — <code>new InjectionToken&lt;T&gt;(description, options?)</code> creates a unique object to use as a key. The type parameter <code>T</code> makes <code>inject(TOKEN)</code> return <code>T</code> without a cast. The description string is "used only for debugging purposes", per the 22.2.3 typings.

📌 **Interview term: Tree-shakable token** — a token created with <code>{ providedIn: 'root', factory: () => value }</code>. The factory acts as a default provider in the root injector, so nothing has to be registered unless you want to override it. (<code>'root'</code> is the default when a factory is given.)

📌 **Interview term: Multi provider** — <code>{ provide: TOKEN, useValue: x, multi: true }</code>. Every such provider adds to a list, and <code>inject(TOKEN)</code> returns the array. This is how Angular itself builds extension points such as [NG_VALUE_ACCESSOR](/interview-question/what-is-the-role-of-ng-value-accessor-in-a-custom-component) and the legacy [interceptor](/interview-question/what-is-an-http-interceptor) list.

## 3. What the Compiler Says Without a Token

Trying to inject an interface directly through a constructor parameter:

\`\`\`ts
export interface ApiConfig { baseUrl: string; }
@Component({ selector: "app-root", template: \`x\` })
export class AppComponent { constructor(private cfg: ApiConfig) {} }
\`\`\`

<code>ngc</code> 22.2.3 refused to compile it (the source-code excerpts it prints between these lines are trimmed):

\`\`\`
error NG2003: No suitable injection token for parameter 'cfg' of class 'AppComponent'. Find more at https://next.angular.dev/errors/NG2003
  Consider using the @Inject decorator to specify an injection token.
    This type does not have a value, so it cannot be used as injection token.
\`\`\`

With <code>inject()</code> the problem is even more visible: <code>inject(ApiConfig)</code> does not compile at all, because <code>ApiConfig</code> is not a value. The fix in both styles is a token: <code>inject(API_CONFIG)</code> or <code>@Inject(API_CONFIG) cfg: ApiConfig</code>. The two injection styles are compared in [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function).

## 4. Anatomy of a Token

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="An InjectionToken object is the key, providers store values under it, and inject returns the value typed as T">
  <defs>
    <marker id="q6tok-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="240" y="24" width="220" height="70" rx="12"/>
  <text class="d-text d-accent" x="350" y="52" text-anchor="middle">API_CONFIG</text>
  <text class="d-sub" x="350" y="74" text-anchor="middle">InjectionToken of ApiConfig</text>
  <rect class="d-box" x="20" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="198" text-anchor="middle">default factory</text>
  <text class="d-sub" x="120" y="220" text-anchor="middle">root, if nobody provides</text>
  <rect class="d-box" x="250" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="350" y="198" text-anchor="middle">providers entry</text>
  <text class="d-sub" x="350" y="220" text-anchor="middle">useValue on a subtree</text>
  <rect class="d-box" x="480" y="170" width="200" height="70" rx="10"/>
  <text class="d-text" x="580" y="198" text-anchor="middle">inject(API_CONFIG)</text>
  <text class="d-sub" x="580" y="220" text-anchor="middle">typed as ApiConfig</text>
  <path class="d-edge" d="M 120 166 L 280 98" marker-end="url(#q6tok-arrow)"/>
  <path class="d-edge" d="M 350 166 L 350 98" marker-end="url(#q6tok-arrow)"/>
  <path class="d-edge-accent" d="M 420 98 L 580 166" marker-end="url(#q6tok-arrow)"/>
</svg>

The token object sits in the middle. Values are registered *under* it (by its default factory or by explicit providers), and consumers ask for it. Neither side ever names the interface at runtime; the interface only types the value.

## 5. Verified: default, override, multi, lookalike

The runnable example defines <code>API_CONFIG</code> with a default factory, overrides it under an <code>&lt;app-admin&gt;</code> component, builds a <code>FEATURE_FLAGS</code> list from two <code>multi: true</code> providers, and creates a second token with the *same description* to see whether it matches. Compiled with <code>ngc</code> (strict templates) and run; each line is one paragraph of the output:

\`\`\`
root sees https://api.example.com (retries 3)
admin sees https://admin.example.com (retries 0)
flags: new-checkout, dark-mode
lookalike token: not found (null)
token prints as: InjectionToken FEATURE_FLAGS
\`\`\`

- **Default factory**: the root component got the factory value although nothing was registered.
- **Subtree override**: <code>&lt;app-admin&gt;</code> listed <code>{ provide: API_CONFIG, useValue: ... }</code> and saw its own value; the rest of the app was unaffected. Overriding works exactly like [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).
- **Multi**: two providers, one array, in registration order.
- **Identity, not text**: <code>LOOKALIKE</code> has the description <code>"FEATURE_FLAGS"</code> too, yet <code>inject(LOOKALIKE, { optional: true })</code> returned <code>null</code>. The 22.2.3 typings warn about this directly: creating a new instance "even with the same description, will be treated as different tokens by Angular's DI system".

A separate probe showed what the failure looks like when a token is required but missing; the description appears in the message:

\`\`\`
NG0201: No provider found for \`InjectionToken API_URL\`. Source: feature. Find more at https://v22.angular.dev/errors/NG0201
\`\`\`

(<code>feature</code> was the name given to the child environment injector in that probe.) The example passed the playground check too.

## 6. Token, Abstract Class or Plain Class?

| You want to inject | Use | Why |
| :--- | :--- | :--- |
| A [service](/interview-question/what-is-a-service-and-why-use-it) with behaviour | The class itself | A class is already a unique runtime key |
| A config object or interface-shaped value | <code>InjectionToken&lt;Config&gt;</code> | Interfaces are erased |
| A primitive (<code>string</code>, <code>boolean</code>, number) | <code>InjectionToken&lt;string&gt;</code> | A string type is not a key |
| A function (formatter, clock) | <code>InjectionToken&lt;() =&gt; Date&gt;</code> | Function types are erased too |
| A contract with several implementations | Abstract class, or token + interface | Abstract class is a key *and* a type with methods |
| A list contributed by many places | <code>InjectionToken&lt;T[]&gt;</code> + <code>multi: true</code> | Collects every provider |
| A browser global (<code>document</code>, <code>window</code>) | A token such as Angular's <code>DOCUMENT</code> | Swappable on the server, see [SSR](/interview-question/what-is-angular-universal-ssr) |

How the value behind a token is produced (fixed value, class, factory, alias) is the subject of [useClass, useValue, useFactory and useExisting](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting).

## 7. Patterns Worth Knowing

- **Config with a safe default**: token with <code>providedIn: 'root'</code> and a factory; override in <code>app.config.ts</code> per environment.
- **Required config**: token with *no* factory. Forgetting the provider fails fast with NG0201 instead of silently using a default.
- **Factory that injects**: the token factory runs in an injection context, so <code>factory: () =&gt; inject(OtherToken).x</code> works.
- **Provide via a function**: wrap the provider in a <code>provideApiConfig(cfg)</code> function that returns <code>{ provide: API_CONFIG, useValue: cfg }</code>, mirroring <code>provideHttpClient()</code> style APIs (see [provideHttpClient](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i)).
- **Startup config**: if the value must be fetched before the app renders, load it in an [app initializer](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st) into a service, then let a token factory read it.

## 8. Common Pitfalls

- **Creating the token twice.** Declaring <code>new InjectionToken('API_CONFIG')</code> in two files gives two different keys; the consumer of one never sees the provider of the other. Export it from one module.
- **Forgetting <code>multi: true</code> on one provider.** Without it, the last provider wins and replaces the list; a separate probe on 22.2.3 with two plain <code>useValue</code> providers for one token returned only the second value.
- **Typing the token loosely.** <code>InjectionToken&lt;any&gt;</code> throws away the main benefit; give it the real interface.
- **Using a string as a token.** <code>{ provide: 'apiUrl', ... }</code> technically works but has no type, and any typo or name clash breaks silently.
- **Using the deprecated <code>providedIn</code> options.** The 22.2.3 typings mark <code>providedIn: NgModule</code> and <code>providedIn: 'any'</code> on tokens as deprecated; use root or explicit providers.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">"DI looks values up by a runtime key, and interfaces, type aliases and primitives are erased by TypeScript, so there is nothing to use as the key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The tool:</strong> <span style="color:#f0e2c8;">"An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionToken&lt;T&gt;</code> is a unique object that serves as that key; the type parameter makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(TOKEN)</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code>, and the string is only for error messages."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Providing it:</strong> <span style="color:#f0e2c8;">"Register a value with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ provide: TOKEN, useValue }</code> or another recipe, or give it a tree-shakable default with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: root</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">factory</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Identity:</strong> <span style="color:#f0e2c8;">"Matching is by object identity, so two tokens with the same description are different keys; export each token from exactly one place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Uses:</strong> <span style="color:#f0e2c8;">"Config objects, feature flags, functions, browser globals like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DOCUMENT</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multi: true</code> extension points like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use an abstract class instead of an InjectionToken?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the dependency is a contract with methods and you want consumers typed against it, for example an abstract <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Storage</code> with memory and remote implementations. An abstract class exists at runtime, so it can be the token itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">multi: true</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each provider for the token adds an entry, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(TOKEN)</code> returns all of them as an array in registration order. Without it the last provider simply replaces the earlier ones.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a token factory depend on other services?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The factory runs in an injection context, so it can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(OtherService)</code> and derive the value from it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What error do you get if nobody provides a token without a factory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NG0201, "No provider found for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InjectionToken NAME</code>", where NAME is the description you passed to the constructor, which is why a clear description matters.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Token** | The key a provider is stored under |
| **Type erasure** | TypeScript types disappear in the compiled JavaScript |
| **InjectionToken** | A unique, typed object to use as a DI key |
| **Tree-shakable token** | Token with a root default factory; nothing to register |
| **Multi provider** | Several providers for one token, injected as an array |
| **NG2003** | Compile error: a constructor parameter has no usable token |

---
**Conclusion:** An InjectionToken is a ticket for something that has no runtime class of its own. Because TypeScript erases interfaces and primitives, the injector needs a unique object to file the value under, and <code>InjectionToken&lt;T&gt;</code> provides that object plus the type for <code>inject()</code>. On 22.2.3 we saw a root default from the token factory, a subtree override, a multi provider collecting two flags, and a same-named lookalike token that matched nothing, which is the identity rule you must remember.`,
    examples: [
      {
        label: "Typed config token with a default factory, a subtree override and a multi token",
        tech: "angular",
        runnable: true,
        code: `import { Component, InjectionToken, inject } from "@angular/core";

// An interface has no runtime value, so it cannot be a DI key by itself.
export interface ApiConfig {
  baseUrl: string;
  retries: number;
}

// The token IS the key. The type parameter makes inject() return ApiConfig.
export const API_CONFIG = new InjectionToken<ApiConfig>("API_CONFIG", {
  providedIn: "root",
  factory: () => ({ baseUrl: "https://api.example.com", retries: 3 }), // default if nobody provides one
});

// No factory: something MUST provide it, or injection fails.
export const FEATURE_FLAGS = new InjectionToken<string[]>("FEATURE_FLAGS");

// Same description, different object: a different token.
export const LOOKALIKE = new InjectionToken<string[]>("FEATURE_FLAGS");

@Component({
  selector: "app-admin",
  // Override the default for this subtree only.
  providers: [{ provide: API_CONFIG, useValue: { baseUrl: "https://admin.example.com", retries: 0 } }],
  template: \`<p>admin sees {{ config.baseUrl }} (retries {{ config.retries }})</p>\`,
})
export class Admin {
  config = inject(API_CONFIG);
}

@Component({
  selector: "app-root",
  imports: [Admin],
  providers: [
    { provide: FEATURE_FLAGS, useValue: "new-checkout", multi: true },
    { provide: FEATURE_FLAGS, useValue: "dark-mode", multi: true },
  ],
  template: \`
    <p>root sees {{ config.baseUrl }} (retries {{ config.retries }})</p>
    <app-admin />
    <p>flags: {{ flags.join(", ") }}</p>
    <p>lookalike token: {{ lookalike }}</p>
    <p>token prints as: {{ tokenName }}</p>
  \`,
})
export class AppComponent {
  config = inject(API_CONFIG);                        // typed as ApiConfig, no cast
  flags = inject(FEATURE_FLAGS);                      // multi: true collects every provider into an array
  lookalike = inject(LOOKALIKE, { optional: true }) ?? "not found (null)";
  tokenName = String(FEATURE_FLAGS);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between useClass, useValue, useFactory, and useExisting?",
    seoDescription:
      "The four Angular provider recipes: useClass builds a class, useValue hands over a value, useFactory runs code, useExisting aliases a token.",
    description: `**Question presented to candidate:**
"In a providers array I see \`useClass\`, \`useValue\`, \`useFactory\` and \`useExisting\`. Explain what each one does and give a real situation where you would pick it."

**What a strong answer should cover:**
- A provider is \`{ provide: TOKEN, <recipe> }\`; the recipe says how the value for that token is produced, and the result is cached per injector.
- **\`useClass\`**: instantiate this class (possibly a different one than the token), e.g. a mock or an environment-specific implementation. The bare \`[MyService]\` shorthand means \`{ provide: MyService, useClass: MyService }\`.
- **\`useValue\`**: hand over this exact value, no construction: config objects, constants, test fakes.
- **\`useFactory\`**: run a function to decide or build the value; it can call \`inject()\` (or use the older \`deps\` array) and runs once per injector.
- **\`useExisting\`**: an **alias**: the token resolves to whatever another token resolves to, the same instance, not a copy. Contrast with \`useClass\`, which builds a new instance under the second token.
- \`multi: true\` combines with any recipe to build a list.

**Clarifying questions expected:**
- "Is the alternative implementation chosen at build time, at startup, or per subtree?"

**Code / implementation expected:** Yes — all four recipes with instance identity checked.`,
    answer: `**Target Audience:** Developers who have used <code>providers: [MyService]</code> and now meet the longer object forms in real codebases and library docs.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The instance ids and identity checks below were printed by the example running on Angular 22.2.3, compiled with <code>ngc</code> and in playground mode.

## 1. Why This Even Matters — A Story First

A café takes four kinds of orders for "a coffee":

- **"Make me a latte."** The barista follows the latte recipe and makes a fresh one. (Even if the menu item says "coffee", you can say *which* recipe.)
- **"Here is the coffee I brought, just put it on the tray."** No making anything; the exact cup you handed over is the one served.
- **"Decide for me: if it is before noon make an espresso, otherwise a decaf."** Someone runs a little decision before anything is made.
- **"I will have whatever table 4 is having."** Not a second cup like theirs: literally the *same* cup, shared.

Those are <code>useClass</code>, <code>useValue</code>, <code>useFactory</code> and <code>useExisting</code>. The fourth one is the one candidates most often get wrong.

## 2. The Core Idea

📌 **Interview term: Provider recipe** — the part of a provider object after <code>provide: TOKEN</code> that says how to produce the value. Angular runs the recipe the first time the token is requested from that injector and caches the result (see [how DI works](/interview-question/how-does-dependency-injection-work-in-angular)).

📌 **Interview term: useClass** — "build an instance of this class". <code>{ provide: Logger, useClass: ConsoleLogger }</code> means anyone asking for <code>Logger</code> gets a <code>ConsoleLogger</code>. The shorthand <code>providers: [Logger]</code> is <code>{ provide: Logger, useClass: Logger }</code>.

📌 **Interview term: useValue** — "use this exact value". No constructor runs; the object, string or function you pass is returned as is. Ideal for config and test fakes.

📌 **Interview term: useFactory** — "call this function and use what it returns". The function runs in an injection context, so it can call [<code>inject()</code>](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function); the older form lists dependencies in a <code>deps</code> array and receives them as arguments.

📌 **Interview term: useExisting (alias)** — "resolve this token by asking for that other token". Both tokens then give the *same instance*. Nothing new is created.

## 3. The Four Recipes at a Glance

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="useClass builds a new instance, useValue returns a given value, useFactory runs a function, useExisting points one token at another token and returns the same instance">
  <defs>
    <marker id="q7rec-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="63" text-anchor="middle">useClass</text>
  <rect class="d-box" x="190" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="265" y="63" text-anchor="middle">useValue</text>
  <rect class="d-box" x="360" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="435" y="63" text-anchor="middle">useFactory</text>
  <rect class="d-box-accent" x="530" y="30" width="150" height="56" rx="10"/>
  <text class="d-text d-accent" x="605" y="63" text-anchor="middle">useExisting</text>
  <path class="d-edge" d="M 95 90 L 95 156" marker-end="url(#q7rec-arrow)"/>
  <path class="d-edge" d="M 265 90 L 265 156" marker-end="url(#q7rec-arrow)"/>
  <path class="d-edge" d="M 435 90 L 435 156" marker-end="url(#q7rec-arrow)"/>
  <path class="d-edge-accent" d="M 605 90 L 605 156" marker-end="url(#q7rec-arrow)"/>
  <rect class="d-box-muted" x="20" y="160" width="150" height="70" rx="10"/>
  <text class="d-sub" x="95" y="190" text-anchor="middle">new instance</text>
  <text class="d-sub" x="95" y="210" text-anchor="middle">of the class</text>
  <rect class="d-box-muted" x="190" y="160" width="150" height="70" rx="10"/>
  <text class="d-sub" x="265" y="190" text-anchor="middle">the exact value</text>
  <text class="d-sub" x="265" y="210" text-anchor="middle">nothing built</text>
  <rect class="d-box-muted" x="360" y="160" width="150" height="70" rx="10"/>
  <text class="d-sub" x="435" y="190" text-anchor="middle">whatever the</text>
  <text class="d-sub" x="435" y="210" text-anchor="middle">function returns</text>
  <rect class="d-box-accent" x="530" y="160" width="150" height="70" rx="10"/>
  <text class="d-sub" x="605" y="190" text-anchor="middle">same instance as</text>
  <text class="d-sub" x="605" y="210" text-anchor="middle">the target token</text>
  <text class="d-sub" x="95" y="280" text-anchor="middle">mocks, variants</text>
  <text class="d-sub" x="265" y="280" text-anchor="middle">config, fakes</text>
  <text class="d-sub" x="435" y="280" text-anchor="middle">runtime choice</text>
  <text class="d-sub" x="605" y="280" text-anchor="middle">aliases, migration</text>
</svg>

The bottom row is the typical use of each. All four results are cached per injector, so even <code>useClass</code> and <code>useFactory</code> run only once per injector that holds the provider.

## 4. Verified: identity tells you which recipe shares

The runnable example registers all four on one component. <code>Storage</code> is an abstract class (a token and a type at once), with <code>MemoryStorage</code> and <code>LoggingStorage</code> implementations that take an id from a counter, so every construction is visible. Compiled with <code>ngc</code> (strict templates) and run; elements run together:

\`\`\`
Shop storage: logging #1legacy alias: logging #1 same object: trueMemoryStorage #2 vs SECOND_MEMORY #3 same: falseinstances created: 3
\`\`\`

Reading it piece by piece:

| Provider | What it printed | What it proves |
| :--- | :--- | :--- |
| <code>{ provide: APP_NAME, useValue: "Shop" }</code> | <code>Shop</code> | The value is returned as given |
| <code>{ provide: Storage, useFactory: () =&gt; inject(IS_DEV) ? new LoggingStorage() : inject(MemoryStorage) }</code> | <code>logging #1</code> | The factory ran, read another token, and chose |
| <code>{ provide: LEGACY_STORAGE, useExisting: Storage }</code> | <code>logging #1 same object: true</code> | Alias: the very same instance, not a copy |
| <code>{ provide: MemoryStorage, useClass: MemoryStorage }</code> | <code>#2</code> | A class provider builds its own instance |
| <code>{ provide: SECOND_MEMORY, useClass: MemoryStorage }</code> | <code>#3, same: false</code> | Same class under another token is a *separate* instance |

Three constructions in total, even though five tokens were injected: the alias created nothing, and the value provider constructed nothing. The example passed the playground check too.

A second probe checked two more claims. A <code>useFactory</code> with the legacy <code>deps: [URL_T]</code> array was injected twice and ran once; and two <code>multi: true</code> value providers produced an array, while two plain providers for one token kept only the last:

\`\`\`
FULL: https://api/v2 https://api/v2 factory runs: 1
PLUGINS: ["a","b"]
LAST: second
\`\`\`

## 5. useClass vs useExisting: the Classic Trap

The interview favourite: you have an old <code>OldLogger</code> token that legacy code injects and a new <code>NewLogger</code> [service](/interview-question/what-is-a-service-and-why-use-it), and you want both to use one logger.

- <code>{ provide: OldLogger, useClass: NewLogger }</code> creates a **second** <code>NewLogger</code> under the <code>OldLogger</code> token. Two instances, two sets of state. That is the <code>SECOND_MEMORY</code> row above.
- <code>{ provide: OldLogger, useExisting: NewLogger }</code> makes <code>OldLogger</code> **resolve to the existing <code>NewLogger</code>**. One instance. That is the <code>LEGACY_STORAGE</code> row.

<code>useExisting</code> is also how a component exposes itself under an interface-like token, for example <code>{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() =&gt; MyInput), multi: true }</code>; see [NG_VALUE_ACCESSOR](/interview-question/what-is-the-role-of-ng-value-accessor-in-a-custom-component) and [building a ControlValueAccessor](/interview-question/how-do-you-build-a-custom-form-control-by-implementing-the-controlvalueaccessor-).

## 6. Choosing a Recipe

| Need | Recipe | Example |
| :--- | :--- | :--- |
| Swap an implementation | <code>useClass</code> | <code>{ provide: PaymentGateway, useClass: StripeGateway }</code> |
| A fixed value or a test fake | <code>useValue</code> | <code>{ provide: API_URL, useValue: 'https://api' }</code> |
| Decide at runtime, or build from other dependencies | <code>useFactory</code> | Pick a storage based on a flag or platform |
| Two tokens, one instance | <code>useExisting</code> | Migration alias, exposing a component under a token |
| Many contributions to one token | Any recipe + <code>multi: true</code> | Plugins, validators |

Tokens that are not classes (config, strings) are covered in [InjectionToken](/interview-question/what-is-an-injectiontoken), and where a provider is registered (root, component) changes how many instances a recipe yields, as shown in [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component). Test doubles via <code>useValue</code> and <code>useClass</code> are the core of [mocking services in unit tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies).

## 7. Common Pitfalls

- **Using <code>useClass</code> to alias.** It silently creates a second instance. If two tokens must share state, use <code>useExisting</code>.
- **Expecting <code>useValue</code> to be copied.** The exact object is shared; mutating it in one consumer changes it for all.
- **Expecting a factory to run per injection.** It runs once per injector and the result is cached. If you need a fresh value each time, have the factory return a *function* that creates one.
- **Using <code>deps</code> and <code>inject()</code> inconsistently.** With a <code>deps</code> array, dependencies arrive as arguments in that order; mixing it up passes the wrong value with no type error. Modern code prefers <code>inject()</code> inside the factory.
- **Pointing <code>useExisting</code> at a token nobody provides.** The alias does not create anything, so the lookup fails with NG0201 for the target token.
- **Forgetting <code>multi: true</code> on one of several providers.** The last provider replaces the list instead of adding to it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"A provider is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ provide: TOKEN, recipe }</code>, and the recipe says how to produce the value; whatever it produces is cached per injector."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. useClass and useValue:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useClass</code> builds an instance of a class, possibly a different one than the token, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useValue</code> hands over an exact value with no construction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. useFactory:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFactory</code> runs a function, which can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>, to decide or build the value at runtime, once per injector."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. useExisting:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useExisting</code> is an alias: the token resolves to the same instance another token resolves to, so nothing new is created."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useClass: NewLogger</code> under an old token makes a second instance; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useExisting: NewLogger</code> shares the one instance. I verified the identity with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the shorthand <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providers: [MyService]</code> mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ provide: MyService, useClass: MyService }</code>: the class is both the token and the recipe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a factory instead of a class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the choice or construction depends on runtime information, such as a feature flag, platform or config value, or when the value is not a class instance at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFactory</code> run every time the token is injected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It runs the first time the token is requested from that injector, and the cached result is returned afterwards. Verified: two injections, one factory run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NG_VALUE_ACCESSOR</code> use these?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A custom form control registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() =&gt; MyInput), multi: true }</code>, so the forms package finds the component itself under the accessor token.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Provider recipe** | How a provider produces its value |
| **useClass** | Build an instance of this class |
| **useValue** | Return this exact value |
| **useFactory** | Return what this function produces |
| **useExisting** | Alias to another token, same instance |
| **deps** | Legacy list of tokens passed as factory arguments |
| **multi: true** | Collect several providers for one token into an array |

---
**Conclusion:** The four recipes answer one question, "how is the value for this token produced?": build a class, hand over a value, run a function, or point at another token. On 22.2.3 the identity checks made the difference concrete: five injected tokens cost three constructions, because <code>useValue</code> built nothing and <code>useExisting</code> returned the same object as its target, while <code>useClass</code> under a second token built a separate instance. Remember that last contrast and you will avoid the most common provider bug.`,
    examples: [
      {
        label: "All four recipes side by side, with instance ids proving which ones share",
        tech: "angular",
        runnable: true,
        code: `import { Component, InjectionToken, inject } from "@angular/core";

let made = 0;

// The token the app asks for. Abstract class = a type AND a runtime token.
export abstract class Storage {
  abstract readonly kind: string;
  readonly id = ++made;
}
export class MemoryStorage extends Storage { readonly kind = "memory"; }
export class LoggingStorage extends Storage { readonly kind = "logging"; }

export const APP_NAME = new InjectionToken<string>("APP_NAME");
export const IS_DEV = new InjectionToken<boolean>("IS_DEV");
export const LEGACY_STORAGE = new InjectionToken<Storage>("LEGACY_STORAGE");
export const SECOND_MEMORY = new InjectionToken<MemoryStorage>("SECOND_MEMORY");

@Component({
  selector: "app-root",
  providers: [
    { provide: IS_DEV, useValue: true },                       // useValue: hand over this exact value
    { provide: APP_NAME, useValue: "Shop" },
    { provide: MemoryStorage, useClass: MemoryStorage },        // same as just MemoryStorage
    {
      provide: Storage,                                         // useFactory: run code to decide
      useFactory: () => (inject(IS_DEV) ? new LoggingStorage() : inject(MemoryStorage)),
    },
    { provide: LEGACY_STORAGE, useExisting: Storage },          // useExisting: an alias, no new instance
    { provide: SECOND_MEMORY, useClass: MemoryStorage },        // useClass under another token: a NEW instance
  ],
  template: \`
    <p>{{ name }} storage: {{ storage.kind }} #{{ storage.id }}</p>
    <p>legacy alias: {{ legacy.kind }} #{{ legacy.id }} same object: {{ legacy === storage }}</p>
    <p>MemoryStorage #{{ memory.id }} vs SECOND_MEMORY #{{ second.id }} same: {{ memory === second }}</p>
    <p>instances created: {{ count }}</p>
  \`,
})
export class AppComponent {
  name = inject(APP_NAME);
  storage = inject(Storage);
  legacy = inject(LEGACY_STORAGE);
  memory = inject(MemoryStorage);
  second = inject(SECOND_MEMORY);
  count = made;
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Angular's dependency resolution search work using @Self(), @SkipSelf(), @Optional(), and @Host()?",
    seoDescription:
      "How Angular walks element injectors then environment injectors, and how self, skipSelf, optional and host change where the search starts and stops.",
    description: `**Question presented to candidate:**
"A directive inside a panel component needs a \`THEME\` value. Sometimes it should only use one declared on its own element, sometimes it must ignore its own and use the parent's, and sometimes it should quietly get nothing. Walk me through how Angular searches for a dependency and how \`@Self()\`, \`@SkipSelf()\`, \`@Optional()\` and \`@Host()\` change that search."

**What a strong answer should cover:**
- Default resolution: start at the requesting element's **element injector**, walk up parent element injectors, then the **environment injectors** (root, platform), and throw NG0201 at the null injector.
- **\`self\`**: look only at the current element's injector, nothing above it.
- **\`skipSelf\`**: start at the parent, ignoring a provider on the current element (classic use: a nested instance of the same service).
- **\`optional\`**: return \`null\` instead of throwing when nothing is found; combines with the others.
- **\`host\`**: stop the search at the host component's boundary; inside a component's template it sees the host's \`viewProviders\` but not its plain \`providers\`.
- Both syntaxes are current: parameter decorators on constructors and \`inject(T, { self, skipSelf, optional, host })\`; the decorators are still public API in Angular 22.
- \`providers\` vs \`viewProviders\` and content projection change what each lookup can see.

**Clarifying questions expected:**
- "Is the consumer in the component's own template, or projected into it with ng-content?"
- "Should a missing value be an error or a silent fallback?"

**Code / implementation expected:** Yes — one token provided at several levels and probed with each modifier.`,
    answer: `**Target Audience:** Developers comfortable with [services](/interview-question/what-is-a-service-and-why-use-it) and component providers who now need to control *which* provider a directive or component receives.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every resolution result below was printed by the examples running on Angular 22.2.3, compiled with <code>ngc</code> and in playground mode. Where the result differed from a common rule of thumb (the <code>host</code> rows), the doc says so.

## 1. Why This Even Matters — A Story First

You need a stapler at the office. The normal search is: check your own desk, then ask your team lead's desk, then the department supply cupboard, then the building's main store. The first place that has one hands it over. If none do, you get a complaint from facilities.

Now four special instructions:

- **"Only check my own desk."** If it is not on my desk, do not go asking around. (<code>self</code>)
- **"Do not check my desk, start with my team lead."** I know I have a broken one; I want the next one up. (<code>skipSelf</code>)
- **"If nobody has one, that is fine, do not complain."** (<code>optional</code>)
- **"Do not leave our team area."** Stop at the team boundary even if the department cupboard has one. (<code>host</code>)

That is Angular's dependency resolution and its four modifiers.

## 2. The Core Idea

📌 **Interview term: Resolution (lookup)** — the walk Angular performs to find a provider for a token. By default: the requesting element's injector, each ancestor element injector, then environment injectors up to the null injector. The tree itself is explained in [how DI works](/interview-question/how-does-dependency-injection-work-in-angular).

📌 **Interview term: Resolution modifier** — an option that changes where the walk starts, where it stops, or what happens when it fails. Two syntaxes, same behaviour:

| Decorator (constructor parameter) | <code>inject()</code> option | Effect |
| :--- | :--- | :--- |
| <code>@Self()</code> | <code>{ self: true }</code> | Only the current element injector |
| <code>@SkipSelf()</code> | <code>{ skipSelf: true }</code> | Start at the parent |
| <code>@Optional()</code> | <code>{ optional: true }</code> | Return <code>null</code> instead of throwing |
| <code>@Host()</code> | <code>{ host: true }</code> | Stop at the host component boundary |

In the 22.2.3 typings all four decorators are <code>@publicApi</code> with no deprecation, and the <code>InjectOptions</code> interface documents the same four booleans; <code>host</code> is described as "Only relevant when injecting from an element injector, and a no-op for environment injectors". The two syntaxes compile to the same bit flags (see [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)).

📌 **Interview term: viewProviders** — like <code>providers</code> on a component, but visible only to the component's *own template*, not to content projected into it with [ng-content](/interview-question/what-is-content-projection-and-ng-content).

📌 **Interview term: Host component** — for an element in some template, the component that owns that template. For an element inside <code>Panel</code>'s template the host is <code>Panel</code>; for content written in <code>AppComponent</code>'s template and projected into <code>Panel</code>, the host is still <code>AppComponent</code>.

## 3. The Test Tree

<svg class="iq-diagram" width="100%" viewBox="0 0 700 400" role="img" aria-label="Environment factory at the top, app-root providing app-root, app-panel providing panel, probes A and B inside the panel template, probe C projected from app-root into the panel, and probe D directly in the app-root template">
  <defs>
    <marker id="q8res-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="230" y="20" width="240" height="50" rx="10"/>
  <text class="d-text" x="350" y="50" text-anchor="middle">environment factory</text>
  <path class="d-edge" d="M 350 118 L 350 74" marker-end="url(#q8res-arrow)"/>
  <rect class="d-box" x="230" y="122" width="240" height="50" rx="10"/>
  <text class="d-text" x="350" y="152" text-anchor="middle">app-root provides app-root</text>
  <path class="d-edge" d="M 200 222 L 290 176" marker-end="url(#q8res-arrow)"/>
  <path class="d-edge" d="M 560 222 L 420 176" marker-end="url(#q8res-arrow)"/>
  <rect class="d-box-accent" x="40" y="226" width="300" height="50" rx="10"/>
  <text class="d-text d-accent" x="190" y="256" text-anchor="middle">app-panel provides panel</text>
  <rect class="d-box" x="460" y="226" width="200" height="50" rx="10"/>
  <text class="d-text" x="560" y="256" text-anchor="middle">D in app-root view</text>
  <path class="d-edge" d="M 90 326 L 120 280" marker-end="url(#q8res-arrow)"/>
  <path class="d-edge" d="M 190 326 L 190 280" marker-end="url(#q8res-arrow)"/>
  <path class="d-edge-dashed" d="M 290 326 L 260 280" marker-end="url(#q8res-arrow)"/>
  <rect class="d-box" x="40" y="330" width="90" height="50" rx="10"/>
  <text class="d-text" x="85" y="360" text-anchor="middle">A</text>
  <rect class="d-box" x="145" y="330" width="90" height="50" rx="10"/>
  <text class="d-text" x="190" y="360" text-anchor="middle">B own</text>
  <rect class="d-box-muted" x="250" y="330" width="90" height="50" rx="10"/>
  <text class="d-text" x="295" y="360" text-anchor="middle">C</text>
</svg>

A and B sit inside <code>app-panel</code>'s template (B also carries a [directive](/interview-question/what-is-a-directive-and-what-are-the-types) that provides its own value). C is written in <code>app-root</code>'s template but projected into the panel, drawn dashed because it *belongs* to the app-root view. D is in the app-root template outside the panel. Each probe asks for <code>THEME</code> (an [InjectionToken](/interview-question/what-is-an-injectiontoken)) four ways; the token has a root factory returning <code>"environment"</code>.

## 4. Verified: providers on the panel

Compiled with <code>ngc</code> (strict templates) and run. Each line is one paragraph:

\`\`\`
A, in panel template: default=panel | self=null | skipSelf=panel | host=null
B, in panel template, own provider: default=own element | self=own element | skipSelf=panel | host=own element
C, projected into panel: default=panel | self=null | skipSelf=panel | host=panel
D, in app-root template: default=app-root | self=null | skipSelf=app-root | host=null
E, app-root itself with skipSelf: environment
\`\`\`

(<code>self</code> and <code>host</code> were requested with <code>optional: true</code>, so "not found" prints as <code>null</code>.)

- **default** always found the nearest provider: the panel for A and C, the element's own directive for B, app-root for D.
- **self** found something only on B, the one element with its own provider. Without <code>optional</code> a separate probe threw <code>NG0201: No provider for InjectionToken THEME found in NodeInjector</code>, even though the environment factory existed: <code>self</code> never reaches it.
- **skipSelf** on B ignored B's own value and returned <code>panel</code>. On app-root itself (row E) it skipped app-root's own provider and fell through to the environment factory.
- **host** is the subtle one. A, inside the panel template, got <code>null</code>: from inside a component's view, <code>host</code> stopped at the panel boundary *without* seeing the panel's plain <code>providers</code>. C, projected content, got <code>panel</code>: its host is app-root, and the <code>app-panel</code> element is an ordinary element inside app-root's view, so its providers are visible. D got <code>null</code> for the same reason A did, one level up.

## 5. Verified: viewProviders on the panel

The second example changes one line, <code>providers</code> to <code>viewProviders</code> on the panel:

\`\`\`
A, in panel template: default=panel | self=null | skipSelf=panel | host=panel
B, in panel template, own provider: default=own element | self=own element | skipSelf=panel | host=own element
C, projected into panel: default=app-root | self=null | skipSelf=app-root | host=null
D, in app-root template: default=app-root | self=null | skipSelf=app-root | host=null
E, app-root itself with skipSelf: environment
\`\`\`

Two rows flipped:

- **A with host now finds <code>panel</code>.** The host boundary includes the host component's <code>viewProviders</code>. That is the pairing Angular intends: a component offers something to its own template with <code>viewProviders</code>, and a child directive insists on getting it from there with <code>host</code>.
- **C no longer sees the panel at all.** <code>viewProviders</code> are invisible to projected content, so the default lookup skipped the panel and found app-root. This is the main reason <code>viewProviders</code> exists: keep internals private from content that consumers project in.

## 6. The Rules in One Table

| Modifier | Starts at | Stops at | If not found |
| :--- | :--- | :--- | :--- |
| (none) | Current element | Null injector | NG0201 |
| <code>self</code> | Current element | Current element | NG0201 (or null with optional) |
| <code>skipSelf</code> | Parent element (or parent injector) | Null injector | NG0201 |
| <code>host</code> | Current element | Host component boundary, including its <code>viewProviders</code> | NG0201 (or null with optional) |
| <code>optional</code> | Unchanged | Unchanged | <code>null</code> |

## 7. Real Uses

- **<code>self</code> + <code>optional</code>**: "use a provider on *this* element if one was attached". Angular forms use this shape: in the 22.2.3 <code>@angular/forms</code> package, <code>NgForm</code> declares its <code>NG_VALIDATORS</code> parameter with <code>@Optional() @Self() @Inject(NG_VALIDATORS)</code>, so it only picks up validators attached to its own element (see [NG_VALUE_ACCESSOR](/interview-question/what-is-the-role-of-ng-value-accessor-in-a-custom-component) for the related accessor token).
- **<code>skipSelf</code>**: nested instances of the same thing, such as a tree node that needs its *parent* node, or a nested form group finding the outer one; also the classic guard against importing a core module twice.
- **<code>skipSelf</code> + <code>optional</code>**: "am I the outermost one?" A <code>null</code> parent means you are the root of the nesting.
- **<code>host</code>**: a directive meant to be used only inside a particular component template, receiving that component's <code>viewProviders</code>.

Constructor syntax for the same thing, for codebases still using it (verified to compile with <code>ngc</code> as part of the inject-vs-constructor tests):

\`\`\`ts
constructor(@Optional() @SkipSelf() parent: TreeNode | null) {}
// same as
parent = inject(TreeNode, { optional: true, skipSelf: true });
\`\`\`

## 8. Common Pitfalls

- **Expecting <code>self</code> to reach root services.** It checks one element injector only; a <code>providedIn: 'root'</code> service is never found with <code>self</code>.
- **Assuming <code>host</code> sees the host component's <code>providers</code> from inside its template.** On 22.2.3 it did not (row A); it saw <code>viewProviders</code>.
- **Using <code>viewProviders</code> and wondering why projected children cannot inject it.** That is its purpose (row C in section 5); use <code>providers</code> if projected content must see it.
- **Forgetting <code>optional</code> with <code>self</code> or <code>host</code>.** Without it, absence throws NG0201 instead of returning <code>null</code>.
- **Writing <code>T</code> instead of <code>T | null</code>.** With the decorator syntax TypeScript cannot know the value may be null; the <code>inject()</code> overloads type it correctly.
- **Using these to paper over a confusing tree.** If you need three modifiers to get the right instance, the providers are probably in the wrong place; revisit [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Default walk:</strong> <span style="color:#f0e2c8;">"Angular starts at the requesting element injector, walks up ancestor element injectors, then the environment injectors, and throws NG0201 at the null injector."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. self and skipSelf:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> limits the search to the current element; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">skipSelf</code> starts at the parent, which is how a nested instance finds the outer one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. optional:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">optional</code> turns not found into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> instead of an error, and combines with the others, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">optional</code> for an opt-in provider on the same element."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. host:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host</code> stops at the host component boundary; from inside a component template it sees that component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewProviders</code> but, as I verified, not its plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Syntax:</strong> <span style="color:#f0e2c8;">"Both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@Self()</code>-style parameter decorators and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(T, { self, skipSelf, optional, host })</code> are current public API and compile to the same flags."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providers</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">viewProviders</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both live on the component element injector, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewProviders</code> are visible only to the component own template, not to content projected into it. Verified: projected content skipped a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewProviders</code> entry and resolved the next provider up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inject(X, { self: true })</code> fail when X is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">providedIn: root</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> only checks the current element injector; it never walks to the environment injector, so the root provider is out of reach and it throws NG0201 unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">optional</code> is set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give a real use of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">skipSelf</code>.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A recursive tree component where each node injects its parent node with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ skipSelf: true, optional: true }</code>; the outermost node gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and knows it is the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">host</code> do anything for services in environment injectors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The 22.2.3 typings describe it as only relevant for element injectors and a no-op for environment injectors.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Resolution** | The walk up the injector tree to find a provider |
| **self** | Search only the current element injector |
| **skipSelf** | Start the search at the parent |
| **optional** | Return null instead of throwing |
| **host** | Stop at the host component boundary |
| **viewProviders** | Component providers visible only to its own template |
| **Host component** | The component that owns the template an element is written in |

---
**Conclusion:** Resolution is a walk from the requesting element up through element injectors to the environment injectors, and the four modifiers edit that walk: <code>self</code> shortens it to one step, <code>skipSelf</code> skips the first step, <code>optional</code> softens the failure, and <code>host</code> fences it at the host component. Running one token through five positions on 22.2.3 made the subtle parts concrete: <code>self</code> never reaches root, <code>host</code> from inside a component template sees <code>viewProviders</code> but not plain <code>providers</code>, and <code>viewProviders</code> are invisible to projected content. Draw the tree, mark where each provider lives, and every modifier question becomes a matter of tracing arrows.`,
    examples: [
      {
        label: "One token, four lookups, five places in the tree",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, ElementRef, InjectionToken, inject } from "@angular/core";

// One token, provided at several levels. The string says WHO provided it.
export const THEME = new InjectionToken<string>("THEME", {
  providedIn: "root",
  factory: () => "environment",
});

// Gives an element its own THEME, so @Self has something to find.
@Directive({ selector: "[ownTheme]", providers: [{ provide: THEME, useValue: "own element" }] })
export class OwnTheme {}

// Asks for THEME four different ways and prints the answers into its element.
@Directive({ selector: "[probe]" })
export class Probe {
  private el = inject(ElementRef<HTMLElement>);
  private plain = inject(THEME);
  private self = inject(THEME, { self: true, optional: true });
  private skipSelf = inject(THEME, { skipSelf: true });
  private host = inject(THEME, { host: true, optional: true });
  constructor() {
    this.el.nativeElement.textContent =
      \`default=\${this.plain} | self=\${this.self} | skipSelf=\${this.skipSelf} | host=\${this.host}\`;
  }
}

@Component({
  selector: "app-panel",
  imports: [Probe, OwnTheme],
  providers: [{ provide: THEME, useValue: "panel" }],
  template: \`
    <p>A, in panel template: <span probe></span></p>
    <p>B, in panel template, own provider: <span probe ownTheme></span></p>
    <ng-content />
  \`,
})
export class Panel {}

@Component({
  selector: "app-root",
  imports: [Panel, Probe],
  providers: [{ provide: THEME, useValue: "app-root" }],
  template: \`
    <app-panel>
      <p>C, projected into panel: <span probe></span></p>
    </app-panel>
    <p>D, in app-root template: <span probe></span></p>
    <p>E, app-root itself with skipSelf: {{ rootSkipSelf }}</p>
  \`,
})
export class AppComponent {
  rootSkipSelf = inject(THEME, { skipSelf: true });
}`,
      },
      {
        label: "Same tree with viewProviders on the panel: host now finds it, projected content does not",
        tech: "angular",
        runnable: true,
        code: `import { Component, Directive, ElementRef, InjectionToken, inject } from "@angular/core";

// One token, provided at several levels. The string says WHO provided it.
export const THEME = new InjectionToken<string>("THEME", {
  providedIn: "root",
  factory: () => "environment",
});

// Gives an element its own THEME, so @Self has something to find.
@Directive({ selector: "[ownTheme]", providers: [{ provide: THEME, useValue: "own element" }] })
export class OwnTheme {}

// Asks for THEME four different ways and prints the answers into its element.
@Directive({ selector: "[probe]" })
export class Probe {
  private el = inject(ElementRef<HTMLElement>);
  private plain = inject(THEME);
  private self = inject(THEME, { self: true, optional: true });
  private skipSelf = inject(THEME, { skipSelf: true });
  private host = inject(THEME, { host: true, optional: true });
  constructor() {
    this.el.nativeElement.textContent =
      \`default=\${this.plain} | self=\${this.self} | skipSelf=\${this.skipSelf} | host=\${this.host}\`;
  }
}

@Component({
  selector: "app-panel",
  imports: [Probe, OwnTheme],
  viewProviders: [{ provide: THEME, useValue: "panel" }], // only the panel view can see this
  template: \`
    <p>A, in panel template: <span probe></span></p>
    <p>B, in panel template, own provider: <span probe ownTheme></span></p>
    <ng-content />
  \`,
})
export class Panel {}

@Component({
  selector: "app-root",
  imports: [Panel, Probe],
  providers: [{ provide: THEME, useValue: "app-root" }],
  template: \`
    <app-panel>
      <p>C, projected into panel: <span probe></span></p>
    </app-panel>
    <p>D, in app-root template: <span probe></span></p>
    <p>E, app-root itself with skipSelf: {{ rootSkipSelf }}</p>
  \`,
})
export class AppComponent {
  rootSkipSelf = inject(THEME, { skipSelf: true });
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the APP_INITIALIZER token and how is it used to load configuration at startup?",
    seoDescription:
      "APP_INITIALIZER runs code before the root component is created. Why it is deprecated for provideAppInitializer, and how to load config with it.",
    description: `**Question presented to candidate:**
"We ship one build to staging and production, and the API URL must come from a \`config.json\` fetched at startup. How would you make sure that config is loaded before any component or service uses it? Mention \`APP_INITIALIZER\`."

**What a strong answer should cover:**
- An **app initializer** is a function Angular runs during bootstrap; if it returns a **Promise or Observable**, bootstrap **waits** for it before creating the root component.
- \`APP_INITIALIZER\` is a **multi-provider token** for such functions; it has been **deprecated since v19** in favour of **\`provideAppInitializer(fn)\`**, which takes the function directly and runs it in an **injection context** (so \`inject(HttpClient)\` works).
- The pattern: a \`ConfigService\` with a \`load()\` method called by the initializer, storing the result; everything else injects \`ConfigService\` (or a token derived from it).
- Multiple initializers **run concurrently**, not in sequence; if one depends on another, chain them inside one initializer.
- A rejected Promise **fails the bootstrap**: the root component is never created, so handle errors (fallback config or a visible error).
- Trade-off: it delays first render; keep it small, and consider build-time environment files when config does not need to vary per deployment.

**Clarifying questions expected:**
- "Does the config differ per deployment of the same build, or per build?"
- "What should happen if config.json fails to load?"

**Code / implementation expected:** Yes — \`provideAppInitializer\` with a config service, and the legacy \`APP_INITIALIZER\` form for comparison.`,
    answer: `**Target Audience:** Developers wiring up real deployments, where configuration has to be known before the app can do anything useful.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The timing logs in section 5 were printed by the example booting on Angular 22.2.3 (with a fake HTTP backend, since no network is involved), and the deprecation facts come from the 22.2.3 typings.

## 1. Why This Even Matters — A Story First

A theatre does not open the doors and *then* go looking for the script. Before the audience is let in, the stage manager runs a checklist: lights tested, props set, the director's latest notes collected from the office. Only when every item on the list is ticked does the house open. If the notes never arrive, the show does not start half-prepared; someone announces a delay.

An Angular app has the same checklist moment. Between "the JavaScript has loaded" and "the root component is created" Angular runs every **app initializer**, waits for the ones that are still working, and only then builds the first component. That is the right place to fetch a <code>config.json</code> that tells the app which API to talk to.

## 2. The Core Idea

📌 **Interview term: App initializer** — a function Angular runs during application bootstrap. If it returns a <code>Promise</code> or an <code>Observable</code>, initialization does not complete until the Promise resolves or the Observable completes (the typings' own wording).

📌 **Interview term: APP_INITIALIZER** — the original [InjectionToken](/interview-question/what-is-an-injectiontoken) for app initializers, used as a **multi provider**: <code>{ provide: APP_INITIALIZER, useFactory: ..., deps: [...], multi: true }</code>. In the 22.2.3 typings it carries <code>@deprecated from v19.0.0, use provideAppInitializer instead</code>.

📌 **Interview term: provideAppInitializer** — <code>provideAppInitializer(fn)</code>, the replacement. You pass the initializer function itself, it returns <code>EnvironmentProviders</code>, and "the provided initializer is run in the injection context", so <code>inject()</code> works inside it. It is <code>@publicApi</code> (stable) in 22.2.3. The same v19 change deprecated <code>ENVIRONMENT_INITIALIZER</code> and <code>PLATFORM_INITIALIZER</code> in favour of <code>provideEnvironmentInitializer</code> and <code>providePlatformInitializer</code> (source: the 22.2.3 typings and <a href="https://v19.angular.dev/api/core/APP_INITIALIZER" target="_blank" rel="noopener noreferrer">the v19 API page</a>).

📌 **Interview term: Runtime configuration** — settings read when the app *starts* (from a JSON file the server provides), as opposed to **build-time configuration** baked into the bundle. Runtime config lets one build be promoted from staging to production unchanged.

## 3. Where Initializers Sit in Bootstrap

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="bootstrapApplication creates the root injector, runs all app initializers concurrently, waits for every returned promise, then creates the root component">
  <defs>
    <marker id="q9init-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="136" text-anchor="middle">bootstrap</text>
  <text class="d-sub" x="95" y="156" text-anchor="middle">root injector made</text>
  <path class="d-edge-accent" d="M 174 126 L 236 66" marker-end="url(#q9init-arrow)"/>
  <path class="d-edge-accent" d="M 174 154 L 236 214" marker-end="url(#q9init-arrow)"/>
  <rect class="d-box-accent" x="240" y="30" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="340" y="56" text-anchor="middle">initializer 1</text>
  <text class="d-sub" x="340" y="76" text-anchor="middle">GET config.json</text>
  <rect class="d-box-accent" x="240" y="190" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="340" y="216" text-anchor="middle">initializer 2</text>
  <text class="d-sub" x="340" y="236" text-anchor="middle">other async setup</text>
  <path class="d-edge" d="M 444 66 L 500 126" marker-end="url(#q9init-arrow)"/>
  <path class="d-edge" d="M 444 214 L 500 154" marker-end="url(#q9init-arrow)"/>
  <rect class="d-box" x="504" y="110" width="176" height="60" rx="10"/>
  <text class="d-text" x="592" y="136" text-anchor="middle">all settled</text>
  <text class="d-sub" x="592" y="156" text-anchor="middle">root component built</text>
</svg>

Both initializers start immediately and run side by side; the root component is created only after the slowest one finishes. If either rejects, the right-hand box is never reached.

## 4. The Config-Loading Pattern

1. A <code>ConfigService</code> (a root [service](/interview-question/what-is-a-service-and-why-use-it)) holds the settings and exposes a <code>load()</code> method plus a read accessor.
2. <code>provideAppInitializer(() => inject(ConfigService).load())</code> in <code>app.config.ts</code> makes bootstrap wait for it.
3. Everything else injects <code>ConfigService</code> and reads <code>value</code>, which is safe because no component can exist before the load finished.
4. Optionally expose individual settings as tokens (<code>{ provide: API_URL, useFactory: () => inject(ConfigService).value.apiUrl }</code>) so consumers do not know where they came from; see [provider recipes](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting).

## 5. Verified: bootstrap waits

The first example registers two initializers: the config loader (answered by a fake backend [interceptor](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-) after 200 ms) and a second one that takes 50 ms. Each step logs milliseconds since the module loaded. Compiled with <code>ngc</code> and booted with its <code>appConfig</code>; exact timings vary from run to run, the order did not:

\`\`\`
  10ms  initializer: GET /assets/config.json
  13ms  initializer 2: start (sync part)
  64ms  initializer 2: done
 247ms  initializer: config stored
 280ms  AppComponent constructor
RENDERED: API: https://api.example.comfeatures: beta-search
\`\`\`

- **They run concurrently.** Initializer 2 started 3 ms after the first, not after the 200 ms request. If one initializer depends on another, chain them inside a single initializer.
- **The component waited for the slowest.** <code>AppComponent</code>'s constructor ran only after the config was stored, so its field <code>api = this.config.value.apiUrl</code> could not hit the "read before loaded" error.
- **<code>inject()</code> worked inside the initializer** (<code>inject(ConfigService)</code>, and <code>inject(HttpClient)</code>, registered with [provideHttpClient](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i), inside <code>load()</code>, which is called synchronously from it), as promised by "run in the injection context".

Two further probes on 22.2.3:

- **Rejection fails the bootstrap.** An initializer returning <code>Promise.reject(new Error("config.json returned 500"))</code> logged <code>ERROR Error: config.json returned 500</code>, the bootstrap promise rejected, and the root component's constructor never ran: the page stays empty. Catch errors in <code>load()</code> and fall back or render an error state deliberately.
- **Component providers cannot hold it.** Putting <code>provideAppInitializer(...)</code> in a component <code>providers</code> array threw <code>NG0207: Invalid providers present in a non-environment injector. 'EnvironmentProviders' can't be used for component providers.</code> It belongs in <code>bootstrapApplication</code> / <code>app.config.ts</code> (see [bootstrapping a standalone app](/interview-question/how-do-you-bootstrap-a-standalone-angular-application)).

## 6. Verified: migrating the legacy token

The second example registers one initializer each way:

\`\`\`ts
// BEFORE: factory RETURNS the initializer; deps listed by hand; multi: true is required
{ provide: APP_INITIALIZER, multi: true, deps: [FeatureFlags],
  useFactory: (ff: FeatureFlags) => () => loadFlags().then((f) => { ff.flags = f; }) }

// AFTER: pass the initializer; inject() inside it
provideAppInitializer(() => { const ff = inject(FeatureFlags); /* ... */ })
\`\`\`

Both still work on 22.2.3; the boot log was:

\`\`\`
provideAppInitializer: runs too, flags so far = 0
legacy APP_INITIALIZER: flags loaded
AppComponent constructor
\`\`\`

The deprecated token is still honoured, and both kinds of initializer ran before the component. The migration is mechanical: remove the outer factory layer and the <code>deps</code> array, keep the inner function, and replace parameters with <code>inject()</code> calls (see [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)). One <code>provideAppInitializer</code> call per initializer; there is no <code>multi</code> flag to forget.

## 7. Alternatives and When to Prefer Them

| Approach | Good for | Cost |
| :--- | :--- | :--- |
| App initializer + runtime <code>config.json</code> | One build promoted across environments | Delays first render by one request |
| Build-time environment file / <code>define</code> | Config that differs per build | Rebuild per environment |
| Fetch config in <code>main.ts</code> before <code>bootstrapApplication</code>, pass it as a <code>useValue</code> provider | Config needed even by providers created before initializers | Code outside Angular DI |
| [Route resolver](/interview-question/what-is-a-route-resolver-and-when-is-it-useful) | Data needed for one route, not the whole app | Only delays that route |
| Lazy loading in a service | Config not needed for first paint | Consumers must handle "not loaded yet" |

Measuring how much the extra request delays first paint needs a real browser and network, which this page did not do; the 200 ms here was simulated.

## 8. Common Pitfalls

- **Returning nothing from the initializer.** If <code>load()</code> starts an HTTP call but the initializer does not *return* its Promise or Observable, bootstrap does not wait. The <code>firstValueFrom</code> plus <code>return</code> in the example is what makes the delay happen.
- **Calling <code>inject()</code> after an <code>await</code>.** Only the synchronous part of the initializer is in the injection context. Inject everything first, then await.
- **Assuming initializers run in order.** They run concurrently; one that reads another's result must chain explicitly.
- **Letting a failure blank the page.** A rejection aborts bootstrap with only a console error. Catch it, use defaults, or show a message.
- **Injecting HttpClient-based services that the interceptors also need.** An interceptor that reads config, used by the request that loads config, can create a circular dependency or read an empty value; keep the config request simple or use <code>HttpBackend</code> to bypass interceptors (see [HTTP interceptors](/interview-question/what-is-an-http-interceptor)).
- **Using the deprecated token in new code.** It still works but is <code>@deprecated</code> since v19; new code should use <code>provideAppInitializer</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"An app initializer is a function Angular runs during bootstrap, and if it returns a Promise or Observable the root component is not created until it settles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The API today:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">APP_INITIALIZER</code> is a multi-provider token, deprecated since v19; the replacement is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideAppInitializer(fn)</code>, which runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn</code> in an injection context so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> works."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The pattern:</strong> <span style="color:#f0e2c8;">"A root <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConfigService.load()</code> returns the HTTP request as a Promise, the initializer returns that, and everything else reads the config from the service once the app exists."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Behaviour:</strong> <span style="color:#f0e2c8;">"Initializers run concurrently and bootstrap waits for the slowest; on Angular 22.2.3 I logged the component constructor only after the config was stored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Failure:</strong> <span style="color:#f0e2c8;">"A rejection aborts bootstrap and leaves an empty page, so catch errors in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load()</code> and fall back or show an error deliberately."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you migrate <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">APP_INITIALIZER</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFactory</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deps</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Drop the outer factory and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deps</code> array, pass the inner function to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideAppInitializer</code>, and replace the factory parameters with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> calls inside it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do multiple initializers run one after another?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, concurrently. Verified: a 50 ms initializer finished long before a 200 ms one that was registered first. Chain inside one initializer if order matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HttpClient</code> inside an initializer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, as long as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient()</code> is registered and you inject it synchronously in the initializer. Be careful if your interceptors themselves depend on the config being loaded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use an initializer for config?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When config differs per build anyway (use build-time environments), or when it is not needed for first paint (load it lazily), because an initializer delays the first render for every user.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the initializer rejects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular reports the error, the bootstrap promise rejects, and the root component is never created. Verified on 22.2.3 with a rejected Promise.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **App initializer** | Function run during bootstrap; async ones delay the first component |
| **APP_INITIALIZER** | Legacy multi-provider token for initializers, deprecated since v19 |
| **provideAppInitializer** | Current API: pass the function, runs in an injection context |
| **Runtime configuration** | Settings loaded when the app starts, not baked into the build |
| **EnvironmentProviders** | Providers that can only go in environment injectors, not components |
| **NG0207** | Error: environment providers used in component providers |

---
**Conclusion:** An app initializer is Angular's pre-show checklist: functions that run during bootstrap and, if they return a Promise or Observable, hold back the root component until they finish. Since v19 the way to register one is <code>provideAppInitializer(fn)</code>, which runs <code>fn</code> in an injection context; the old <code>APP_INITIALIZER</code> multi provider still works on 22.2.3 but is deprecated. On 22.2.3 we watched two initializers run concurrently, the component wait for the slower config load, and a rejected initializer abort the bootstrap entirely, which is why a good config loader always returns its request and always handles failure.`,
    examples: [
      {
        label: "Load config.json with provideAppInitializer before the app renders",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, provideAppInitializer, signal } from "@angular/core";
import { HttpClient, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { delay, firstValueFrom, of, tap } from "rxjs";

const t0 = Date.now();
const log = (msg: string) => console.log(\`\${String(Date.now() - t0).padStart(4)}ms  \${msg}\`);

export interface AppSettings {
  apiUrl: string;
  features: string[];
}

// Holds the loaded config. Everything else injects this, not HttpClient.
@Injectable({ providedIn: "root" })
export class ConfigService {
  private readonly settings = signal<AppSettings | null>(null);
  get value(): AppSettings {
    const s = this.settings();
    if (!s) throw new Error("Config read before it was loaded");
    return s;
  }
  load() {
    log("initializer: GET /assets/config.json");
    return firstValueFrom(
      inject(HttpClient).get<AppSettings>("/assets/config.json").pipe(
        tap((s) => {
          this.settings.set(s);
          log("initializer: config stored");
        }),
      ),
    );
  }
}

// Stand-in for a real server: answers /assets/config.json after 200 ms.
const fakeBackend: HttpInterceptorFn = (req, next) =>
  req.url === "/assets/config.json"
    ? of(new HttpResponse({ status: 200, body: { apiUrl: "https://api.example.com", features: ["beta-search"] } })).pipe(delay(200))
    : next(req);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([fakeBackend])),
    // Runs in an injection context; bootstrap waits for the returned Promise.
    provideAppInitializer(() => inject(ConfigService).load()),
    // A second initializer runs alongside the first one, not after it.
    provideAppInitializer(() => {
      log("initializer 2: start (sync part)");
      return new Promise<void>((done) => setTimeout(() => { log("initializer 2: done"); done(); }, 50));
    }),
  ],
};

@Component({
  selector: "app-root",
  template: \`<p>API: {{ api }}</p><p>features: {{ features }}</p>\`,
})
export class AppComponent {
  private config = inject(ConfigService);
  api = this.config.value.apiUrl; // safe: the initializer finished before this constructor ran
  features = this.config.value.features.join(", ");
  constructor() {
    log("AppComponent constructor");
  }
}`,
      },
      {
        label: "Migrating an APP_INITIALIZER multi provider to provideAppInitializer",
        tech: "angular",
        runnable: false,
        code: `import { APP_INITIALIZER, ApplicationConfig, Component, Injectable, inject, provideAppInitializer } from "@angular/core";

@Injectable({ providedIn: "root" })
export class FeatureFlags {
  flags: string[] = [];
}

const loadFlags = () => new Promise<string[]>((resolve) => setTimeout(() => resolve(["beta-search"]), 30));

export const appConfig: ApplicationConfig = {
  providers: [
    // BEFORE (deprecated since v19): a multi provider whose factory RETURNS the initializer.
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [FeatureFlags],
      useFactory: (ff: FeatureFlags) => () =>
        loadFlags().then((f) => {
          ff.flags = f;
          console.log("legacy APP_INITIALIZER: flags loaded");
        }),
    },
    // AFTER: pass the initializer itself. It runs in an injection context, so inject() just works.
    provideAppInitializer(() => {
      const ff = inject(FeatureFlags);
      console.log(\`provideAppInitializer: runs too, flags so far = \${ff.flags.length}\`);
    }),
  ],
};

@Component({ selector: "app-root", template: \`<p>flags: {{ flags.join(", ") }}</p>\` })
export class AppComponent {
  flags = inject(FeatureFlags).flags;
  constructor() {
    console.log("AppComponent constructor");
  }
}`,
      },
    ],
  },
];

export default augments;
