/**
 * Angular ULTRA — batch 11: functional HTTP interceptors (registration, the
 * execution chain, migrating from HTTP_INTERCEPTORS, global errors and
 * retries), bootstrapping a standalone app (how-to and internals), and build
 * tooling and compilation (base href, esbuild + Vite, AOT vs JIT, Ivy).
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
 * strictTemplates, booted with bootstrapApplication in jsdom (interceptor and
 * bootstrap examples export an appConfig and use a fake backend interceptor or
 * provideHttpClientTesting). Examples marked runnable also passed its
 * --playground mode (plain transpile + JIT). Build claims come from running
 * Angular CLI 22.2.3 (`ng build`, `ng build --base-href`, `ng build --aot=false`,
 * `ng serve`) on a fresh `ng new` app, and compiler output from `ngc` itself.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are functional HTTP Interceptors in modern Angular, and how do you register them?",
    seoDescription:
      "A functional interceptor is a plain (req, next) function registered with provideHttpClient(withInterceptors([...])). How to write, order and scope them.",
    description: `**Question presented to candidate:**
"Every request our app sends needs an auth header, and we want one log line per call. Show me how you would do that with a functional interceptor in a standalone Angular app, and where exactly you register it."

**What a strong answer should cover:**
- A **functional interceptor** is a plain function of type \`HttpInterceptorFn\`: \`(req, next) => Observable<HttpEvent>\`. No class, no \`implements\`.
- Requests are **immutable**: change them with \`req.clone({ ... })\` and pass the clone to \`next()\`.
- It runs in an **injection context**, so \`inject(AuthStore)\` works at the top of the function body (but not later inside an RxJS callback).
- Registration: \`provideHttpClient(withInterceptors([a, b, c]))\` in \`appConfig\` (or a lazy route's providers); the **array order is the run order** for requests.
- Returning without calling \`next()\` **short-circuits** the chain (fakes, caches, mocks).
- Modern facts: functional interceptors arrived with the standalone HTTP APIs in v15; in v22 \`HttpClient\` is injectable even without \`provideHttpClient()\` and uses the **fetch** backend by default.

**Clarifying questions expected:**
- "Should every request get the header, or only calls to our own API origin?"
- "Is this a fully standalone app, or are there NgModule-era class interceptors we need to keep?"

**Code / implementation expected:** Yes — an auth interceptor that clones the request, a logging interceptor, and the \`appConfig\` that registers them.`,
    answer: `**Target Audience:** Developers who have used <code>HttpClient</code> and want to add cross-cutting HTTP behaviour the modern way — no prior interceptor knowledge needed.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts with the vocabulary an interviewer listens for. Every output, ordering claim and error message below was produced by compiling the example with <code>ngc</code> (strict templates) on Angular 22.2.3 and booting it in jsdom with an exported <code>appConfig</code>. Version claims were read from the installed 22.2.3 typings or checked with a web search.

This doc is about **what** a functional interceptor is and **how you register** one. For what happens inside the chain when several run (ordering, short-circuiting, child injectors) see [how functional interceptors work with provideHttpClient()](/interview-question/how-do-functional-interceptors-work-with-providehttpclient), and for moving off <code>HTTP_INTERCEPTORS</code> classes see [provideHttpClient(withInterceptors([...])) vs legacy providers](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i).

## 1. Why This Even Matters — A Story First

Picture a company post room. Every letter any department sends passes through it on the way out, and every reply passes back through it on the way in. The post room stamps the company return address on every envelope, logs what went out, and if a reply says "address unknown", it lets the sender know. Nobody in Sales or Accounting has to remember to do any of that: it simply happens to every letter.

An **HTTP interceptor** is that post room for your Angular app. Components and services call <code>http.get(...)</code> as usual; the interceptor quietly adds the auth header, logs the call, or handles a failure, in one place.

In older Angular you built the post room as a class and registered it with a special token. Modern Angular, built around [standalone components](/interview-question/what-are-standalone-components), lets you build it as **a single function** and hand an ordered list of them to <code>provideHttpClient</code>. That is the whole idea; the rest of this doc is the details an interviewer will probe. If the general concept is new to you, start with [what an HTTP interceptor is](/interview-question/what-is-an-http-interceptor).

## 2. The Core Idea

📌 **Interview term: HttpInterceptorFn** — the type of a functional interceptor. Straight from the 22.2.3 typings:

\\\`\\\`\\\`ts
type HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => Observable<HttpEvent<unknown>>;
type HttpHandlerFn = (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>;
\\\`\\\`\\\`

So an interceptor receives the outgoing request and a function called <code>next</code>, and must return an <code>Observable</code> of HTTP events. Calling <code>next(req)</code> hands the request to the rest of the chain and gives you back the response stream (see [Observables vs Promises](/interview-question/what-is-the-difference-between-observables-and-promises) if streams are new).

📌 **Interview term: Immutable request** — an <code>HttpRequest</code> cannot be edited in place. To add a header you call <code>req.clone({ setHeaders: { ... } })</code>, which returns a new request, and pass the clone on. This is what makes it safe to [retry a request](/interview-question/how-do-you-handle-errors-and-retries-globally-with-interceptors): the original is never mutated.

📌 **Interview term: Injection context** — a moment when Angular knows which [injector](/interview-question/how-does-dependency-injection-work-in-angular) is active, so <code>inject()</code> works. Angular calls every functional interceptor inside <code>runInInjectionContext(injector, ...)</code> (you can see it in the 22.2.3 source of <code>chainedInterceptorFn</code>), which is why an interceptor can simply call <code>inject(AuthStore)</code>. More on the mechanism in [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it) and [inject() vs constructor injection](/interview-question/inject-vs-constructor-injection-when-should-you-use-each).

📌 **Interview term: withInterceptors()** — an <code>HttpFeature</code> you pass to <code>provideHttpClient()</code>. It takes an **ordered array** of interceptor functions. The 22.2.3 source turns each one into a multi-provider of an internal token, in array order, which is why the array order is the run order.

## 3. Writing and Registering One

A complete registration has three parts, and the example at the bottom of this page has all three in one file:

1. **The function.** <code>export const authInterceptor: HttpInterceptorFn = (req, next) => { ... }</code>. Read what you need with <code>inject()</code> at the top, clone the request, return <code>next(clone)</code>.
2. **The feature.** <code>withInterceptors([authInterceptor, logInterceptor])</code>. Order matters: the first entry sees the request first.
3. **The provider.** Put the feature inside <code>provideHttpClient(...)</code> in the application config that <code>main.ts</code> passes to <code>bootstrapApplication</code> (see [bootstrapping a standalone app](/interview-question/how-do-you-bootstrap-a-standalone-angular-application)).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="An interceptor array registered in appConfig becomes the request pipeline in that order">
  <defs>
    <marker id="fi1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="640" height="80" rx="12"/>
  <text class="d-text" x="350" y="62" text-anchor="middle">appConfig.providers</text>
  <text class="d-sub" x="350" y="88" text-anchor="middle">provideHttpClient(withInterceptors([auth, log, fakeBackend]))</text>
  <rect class="d-box" x="30" y="190" width="150" height="60" rx="10"/>
  <text class="d-text" x="105" y="226" text-anchor="middle">http.get()</text>
  <rect class="d-box-accent" x="220" y="190" width="120" height="60" rx="10"/>
  <text class="d-text d-accent" x="280" y="226" text-anchor="middle">auth</text>
  <rect class="d-box-accent" x="380" y="190" width="120" height="60" rx="10"/>
  <text class="d-text d-accent" x="440" y="226" text-anchor="middle">log</text>
  <rect class="d-box" x="540" y="190" width="130" height="60" rx="10"/>
  <text class="d-text" x="605" y="226" text-anchor="middle">fakeBackend</text>
  <path class="d-edge-accent" d="M 184 220 L 214 220" marker-end="url(#fi1-arrow)"/>
  <path class="d-edge-accent" d="M 344 220 L 374 220" marker-end="url(#fi1-arrow)"/>
  <path class="d-edge-accent" d="M 504 220 L 534 220" marker-end="url(#fi1-arrow)"/>
  <path class="d-edge-dashed" d="M 350 114 L 350 184" marker-end="url(#fi1-arrow)"/>
</svg>

The array you register in the application config becomes the request pipeline, left to right. The last function here plays the server, so the demo needs no network; in a real app the chain ends at Angular's own backend.

## 4. Verified: auth header plus a log line

The example registers <code>authInterceptor</code>, then <code>logInterceptor</code>, then a <code>fakeBackend</code> interceptor that answers without calling <code>next()</code>. Booted with its <code>appConfig</code>, then the button was clicked. The log line is printed by the interceptor; the other two lines are the root element text, so the button label and paragraph run together:

\\\`\\\`\\\`
RENDERED   : Load profilenot loaded
[log] GET /api/me auth=Bearer abc123
after click: Load profileuser=ada sawAuth=true
\\\`\\\`\\\`

Three things this proves:

- <code>logInterceptor</code> saw the header that <code>authInterceptor</code> added, because it is registered **after** it.
- <code>inject(AuthStore)</code> worked inside a plain function, because Angular runs interceptors in an injection context.
- The fake backend never called <code>next()</code>, and the component still got a normal typed response. That is the **short-circuit** pattern, which is also how caches and mocks work.

## 5. Verified: what v22 gives you before you register anything

Two facts that surprise people, both checked on 22.2.3:

| Setup | What <code>inject(HttpHandler)</code> → <code>inject(HttpBackend)</code> resolved to |
| :--- | :--- |
| No <code>provideHttpClient()</code> at all | <code>_HttpInterceptorHandler -> _FetchBackend</code> |
| <code>provideHttpClient(withXhr())</code> | <code>_HttpInterceptorHandler -> _HttpXhrBackend</code> |

- **HttpClient is injectable with no provider call.** The typings say "The <code>HttpClient</code> service is provided in the root by default". Without <code>provideHttpClient(withInterceptors(...))</code>, though, you have nowhere to register interceptors, so in practice you still call it.
- **fetch is the default backend.** The 22.2.3 typings mark <code>withFetch()</code> as <code>@deprecated</code> with the note "<code>withFetch</code> is not required anymore. <code>FetchBackend</code> is the default <code>HttpBackend</code>", and document <code>withXhr()</code> as the opt-out (needed for upload progress events, which fetch cannot report). In v21 and earlier the default was XHR (source: the <a href="https://github.com/angular/angular/pull/58212" target="_blank" rel="noopener noreferrer">FetchBackend default pull request</a> and the v21 HTTP setup guide).

Interceptors run the same way on either backend: they sit in front of it, so switching <code>withXhr()</code> on or off does not change your interceptor code.

## 6. Where You Can Register Them

| Where | How | Effect |
| :--- | :--- | :--- |
| Whole app | <code>provideHttpClient(withInterceptors([...]))</code> in <code>appConfig</code> | Every <code>HttpClient</code> injected anywhere uses this chain |
| A lazy route subtree | Its own <code>provideHttpClient(withInterceptors([...]))</code> in the route's <code>providers</code> | A **separate** client: the parent chain is ignored unless you add <code>withRequestsMadeViaParent()</code> |
| A component | Not allowed | Verified: <code>provideHttpClient()</code> in a component's <code>providers</code> throws <code>NG0207 ... 'EnvironmentProviders' can't be used for component providers</code> |
| A [unit test](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies) | <code>provideHttpClient(withInterceptors([...]))</code> plus <code>provideHttpClientTesting()</code> | Your interceptors still run; the testing backend answers |

The second row is a classic trap and is verified in the sibling doc on [how the chain works](/interview-question/how-do-functional-interceptors-work-with-providehttpclient). Route-level providers work the same way as for [functional route guards and lazy loadComponent](/interview-question/how-do-functional-route-guards-and-lazy-loadcomponent-work-in-modern-angular).

## 7. Functional vs Class-Based, In One Table

| | Functional (<code>HttpInterceptorFn</code>) | Class (<code>HttpInterceptor</code>) |
| :--- | :--- | :--- |
| Shape | <code>(req, next) => next(req)</code> | <code>intercept(req, next) { return next.handle(req); }</code> |
| Dependencies | <code>inject()</code> at the top of the function | Constructor parameters |
| Registration | <code>withInterceptors([fn])</code> | <code>{ provide: HTTP_INTERCEPTORS, useClass, multi: true }</code> + <code>withInterceptorsFromDi()</code> |
| Order | The array order, explicit in one place | Provider registration order, spread across files |
| Status in 22.2.3 | The recommended API | Supported; typings say DI interceptor support "may be phased out in a later release" |

(The provider object syntax is covered in [useClass, useValue, useFactory and useExisting](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting).) The full migration story, including how the two styles interleave when both are present, is in the [legacy-providing doc](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i).

## 8. Common Pitfalls

- **Mutating the request.** <code>req.headers.set(...)</code> returns a new <code>HttpHeaders</code> and changes nothing on <code>req</code>. Always <code>req.clone({ setHeaders })</code> and pass the clone to <code>next()</code>.
- **Calling <code>inject()</code> inside an RxJS callback.** Only the synchronous body is in an injection context. Verified: <code>inject()</code> inside a <code>tap()</code> after <code>next()</code> throws <code>NG0203: The EnvironmentInjector token injection failed. inject() function must be called from an injection context...</code>. Inject at the top and close over the value.
- **Forgetting to return <code>next(...)</code>.** An interceptor that returns nothing, or returns <code>next(req)</code> without returning it, breaks every request. The return type <code>Observable&lt;HttpEvent&gt;</code> catches most of these at compile time.
- **Sending the token to every origin.** An auth interceptor that adds <code>Authorization</code> to third-party URLs leaks credentials. Check <code>req.url</code> against your API base first.
- **Registering in a lazy route and expecting the root chain too.** A second <code>provideHttpClient()</code> creates an independent client; root interceptors do not run for it unless that call includes <code>withRequestsMadeViaParent()</code>.
- **Putting business logic in interceptors.** They suit cross-cutting concerns (headers, logging, errors, retries, caching). Per-endpoint behaviour belongs in a service; see [what a service is](/interview-question/what-is-a-service-and-why-use-it).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"A functional interceptor is a plain function, (req, next) returning an Observable, that every HttpClient request passes through, so cross-cutting concerns live in one place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rules:</strong> <span style="color:#f0e2c8;">"Requests are immutable, so I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clone()</code> them, and I must return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(clone)</code> unless I am deliberately short-circuiting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Dependencies:</strong> <span style="color:#f0e2c8;">"Angular calls it inside an injection context, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject(AuthStore)</code> works at the top of the function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Registration:</strong> <span style="color:#f0e2c8;">"I register an ordered array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient(withInterceptors([auth, log]))</code> in appConfig; the array order is the request order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show you are current:</strong> <span style="color:#f0e2c8;">"In v22 HttpClient is root-provided and uses fetch by default; class interceptors still work through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withInterceptorsFromDi()</code> but functions are the recommended API."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Angular move from class interceptors to functions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functions are smaller, tree-shakable and need no DI metadata, and the ordering lives in one explicit array instead of being spread across multi-provider registrations. They also fit the rest of the standalone, function-first APIs such as functional guards and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideRouter</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an interceptor answer a request without hitting the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Return an Observable of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpResponse</code> without calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>. Caches, offline fallbacks and demo backends do exactly that, and the caller cannot tell the difference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you skip the auth header for one specific call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass a flag through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContext</code>: define an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContextToken</code> with a default, set it in the request options for that call, and read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req.context.get(TOKEN)</code> in the interceptor. It is typed and does not pollute headers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does an interceptor that needs a service get it from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> at the top of the function body. That runs in the injection context of the injector that owns this <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpClient</code>, so it sees app-level services; inside a later RxJS callback the context is gone and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code> throws NG0203.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I still need provideHttpClient() in Angular 22?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To inject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpClient</code>, no, it is provided in root by default. To register interceptors or pick <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withXhr()</code>, yes, those features only exist as arguments to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient()</code>.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HTTP interceptor** | Code every request and response passes through |
| **HttpInterceptorFn** | The function type of a functional interceptor: (req, next) to Observable of events |
| **next / HttpHandlerFn** | The rest of the chain; calling it forwards the request |
| **Immutable request** | Requests are cloned, never edited in place |
| **Injection context** | A moment where <code>inject()</code> works; interceptors run inside one |
| **withInterceptors()** | The provideHttpClient feature that registers an ordered array of functions |
| **Short-circuit** | Returning a response without calling <code>next()</code> |
| **FetchBackend** | The default HTTP backend in v22, built on the fetch API |

---
**Conclusion:** A functional interceptor is just a function that receives each request and the rest of the chain, clones what it needs to change, and returns <code>next(clone)</code>. You register an ordered array of them with <code>provideHttpClient(withInterceptors([...]))</code>, usually in <code>appConfig</code>, and Angular runs each one in an injection context so <code>inject()</code> works at the top. Verified on 22.2.3: a later interceptor sees the header an earlier one added, a short-circuiting interceptor can answer without the network, <code>HttpClient</code> is injectable with no provider at all, and the default backend is now fetch.`,
    examples: [
      {
        label: "Auth and logging interceptors registered with provideHttpClient(withInterceptors([...]))",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import {
  HttpClient, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors,
} from "@angular/common/http";
import { of } from "rxjs";

// A service the interceptor can inject: interceptors run in an injection context.
@Injectable({ providedIn: "root" })
export class AuthStore {
  token = signal("abc123");
}

// 1. A functional interceptor is just a function: (req, next) => Observable<HttpEvent>.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();
  // Requests are immutable: clone to change them.
  const authed = req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } });
  return next(authed);
};

// 2. Another one, registered after it, sees the request authInterceptor produced.
export const logInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(\`[log] \${req.method} \${req.url} auth=\${req.headers.get("Authorization")}\`);
  return next(req);
};

// 3. A stand-in for the server so the demo needs no network: it never calls next().
export const fakeBackend: HttpInterceptorFn = (req) =>
  of(new HttpResponse({ status: 200, body: { user: "ada", sawAuth: req.headers.has("Authorization") } }));

// Registration: an ordered array passed to withInterceptors(), inside provideHttpClient().
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([authInterceptor, logInterceptor, fakeBackend]))],
};

@Component({
  selector: "app-root",
  template: \`
    <button (click)="load()">Load profile</button>
    <p>{{ result() }}</p>
  \`,
})
export class AppComponent {
  private http = inject(HttpClient);
  result = signal("not loaded");

  load() {
    this.http.get<{ user: string; sawAuth: boolean }>("/api/me").subscribe((r) => {
      this.result.set(\`user=\${r.user} sawAuth=\${r.sawAuth}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do functional interceptors work with provideHttpClient()?",
    seoDescription:
      "How provideHttpClient() builds the interceptor chain: request order, reverse response order, short-circuits and child injectors, verified on v22.",
    description: `**Question presented to candidate:**
"Say we register three functional interceptors with provideHttpClient(). Walk me through exactly what happens when a component calls http.get(): which code runs in which order on the way out and on the way back, and what changes if a lazy route registers its own provideHttpClient()."

**What a strong answer should cover:**
- \`provideHttpClient()\` wires \`HttpClient\` to an internal \`HttpInterceptorHandler\`, which folds the registered functions into **one chain** with \`reduceRight\`, ending at the \`HttpBackend\`.
- **Request phase** runs in array order; **response phase** runs in reverse, because each interceptor wraps everything after it (an onion).
- Code before \`next()\` is the request phase; operators piped onto \`next()\` are the response phase.
- **Short-circuiting**: not calling \`next()\` skips everything downstream (caches, mocks); per-request flags travel in \`HttpContext\`.
- A built-in XSRF interceptor is always first; the chain is built lazily on the first request and each interceptor runs in an injection context.
- A child \`provideHttpClient()\` creates an **independent** chain; \`withRequestsMadeViaParent()\` makes it forward to the parent.

**Clarifying questions expected:**
- "Do you want the order of side effects, or also how errors propagate back up?"
- "Are there route-level HttpClient providers in this app?"

**Code / implementation expected:** Yes — instrumented interceptors that log in/out order, plus a short-circuiting cache keyed by an \`HttpContextToken\`.`,
    answer: `**Target Audience:** Developers who can already write a basic interceptor and want to understand the chain well enough to debug ordering problems.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The internals described here were read from the installed <code>@angular/common</code> 22.2.3 source, and every ordering claim was produced by running instrumented interceptors (compiled with <code>ngc</code>, booted in jsdom with an exported <code>appConfig</code>).

This is the **mechanics** doc. For the basics of writing and registering an interceptor see [functional HTTP interceptors and how to register them](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-); for migrating class interceptors see [provideHttpClient(withInterceptors([...])) vs legacy providing](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i).

## 1. Why This Even Matters — A Story First

Think of Russian nesting dolls. You open the biggest doll (A), inside is a smaller one (B), and inside that the tiny solid doll at the centre: the server. Opening goes from the outside in. Closing goes from the inside out: B is shut before A can be.

An interceptor chain is exactly that. Your request is "opened" by A, then B, then reaches the backend at the centre. The response is "closed" by B first, then A. Most interceptor bugs in interviews and in production come from forgetting the second half of that sentence: the **response comes back in reverse order**.

## 2. What provideHttpClient() Actually Wires Up

Reading <code>provideHttpClient</code> in the 22.2.3 source, it registers these providers (simplified):

| Provider | Role |
| :--- | :--- |
| <code>HttpClient</code> | The service you inject; turns <code>get()</code> calls into <code>HttpRequest</code> objects |
| <code>HttpHandler</code> → <code>HttpInterceptorHandler</code> | Builds and runs the interceptor chain |
| <code>HttpBackend</code> → <code>FetchBackend</code> | The end of the chain that really talks to the network (fetch by default in v22) |
| <code>HTTP_INTERCEPTOR_FNS</code> (multi) ← <code>xsrfInterceptorFn</code> | The built-in XSRF interceptor, always registered first |

Every feature you pass then appends providers. <code>withInterceptors([a, b])</code> appends <code>a</code> and <code>b</code> to that same multi-provider in array order.

📌 **Interview term: HttpInterceptorHandler** — the <code>HttpHandler</code> implementation that, on the **first request**, reads all registered interceptor functions and folds them into one function with <code>reduceRight</code>. The core line from 22.2.3:

\\\`\\\`\\\`js
this.chain = dedupedInterceptorFns.reduceRight(
  (nextSequencedFn, interceptorFn) => chainedInterceptorFn(nextSequencedFn, interceptorFn, this.injector),
  interceptorChainEndFn);
\\\`\\\`\\\`

<code>reduceRight</code> starts from the end (the backend) and wraps outward, so the first function in the array ends up as the outermost layer. And <code>chainedInterceptorFn</code> calls each interceptor inside <code>runInInjectionContext(injector, ...)</code>, which is why [inject()](/interview-question/inject-vs-constructor-injection-when-should-you-use-each) works in one (see [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it)).

📌 **Interview term: Request phase / response phase** — inside an interceptor, the synchronous code **before** <code>next(req)</code> is the request phase. The RxJS operators piped onto <code>next(req)</code> are the response phase: they run when events flow back up. If those operators are new, [catchError](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value) is a good place to start.

## 3. The Onion, Drawn

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Requests pass interceptors A then B to the backend, responses return through B then A">
  <defs>
    <marker id="fi2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="660" height="290" rx="16"/>
  <text class="d-text" x="110" y="50" text-anchor="middle">interceptor A</text>
  <rect class="d-box" x="200" y="70" width="460" height="220" rx="14"/>
  <text class="d-text" x="290" y="100" text-anchor="middle">interceptor B</text>
  <rect class="d-box-accent" x="390" y="130" width="240" height="120" rx="12"/>
  <text class="d-text d-accent" x="510" y="185" text-anchor="middle">backend</text>
  <text class="d-sub" x="510" y="210" text-anchor="middle">fetch or fake</text>
  <path class="d-edge-accent" d="M 60 150 L 384 150" marker-end="url(#fi2-arrow)"/>
  <text class="d-sub" x="140" y="138" text-anchor="middle">1. A in</text>
  <text class="d-sub" x="300" y="138" text-anchor="middle">2. B in</text>
  <path class="d-edge-dashed" d="M 384 230 L 60 230" marker-end="url(#fi2-arrow)"/>
  <text class="d-sub" x="300" y="258" text-anchor="middle">3. B out</text>
  <text class="d-sub" x="140" y="258" text-anchor="middle">4. A out</text>
</svg>

The request crosses each layer from the outside in; the response crosses them from the inside out. An interceptor listed first therefore sees the request first and the response last.

## 4. Verified: the order, and a short-circuit

The example registers <code>[stage("A"), cacheInterceptor, stage("B"), fakeBackend]</code>. Each <code>stage</code> logs "in" before <code>next()</code> and "out" when the response event passes back. The cache only acts when the request carries <code>CACHE = true</code> in its <code>HttpContext</code>. The three buttons were clicked in turn and the paragraph text printed:

\\\`\\\`\\\`
plain  -> body.n=1 | A in > B in > backend > B out > A out
cached -> body.n=2 | A in > B in > backend > B out > A out
cached -> body.n=2 | A in > cache HIT > A out
\\\`\\\`\\\`

Reading it line by line:

1. A normal request: request phase in array order, response phase in reverse. The onion.
2. The first cached request is a miss, so it goes all the way through and the cache stores the response.
3. The second cached request is a hit. The cache returns <code>of(hit.clone())</code> **without calling <code>next()</code>**, so B and the backend never run, and the backend counter stays at 2. A still sees the response on the way out, because A wraps the cache.

📌 **Interview term: HttpContext / HttpContextToken** — a typed, per-request bag of values that travels with the request through every interceptor but is never sent to the server. <code>new HttpContextToken&lt;boolean&gt;(() => false)</code> defines a flag with a default; the caller sets it with <code>new HttpContext().set(CACHE, true)</code>, and an interceptor reads <code>req.context.get(CACHE)</code>. It replaces the old trick of smuggling flags in custom headers.

## 5. Verified: injectors decide which chain you get

Interceptors belong to the <code>provideHttpClient()</code> call they were passed to, and each call belongs to an injector. A small experiment created child environment injectors with their own HTTP providers and logged which interceptors ran (a root interceptor is tagged <code>root</code>, a child one <code>child</code>):

\\\`\\\`\\\`
root client                root > backend
child provideHttpClient    child > backend
child + viaParent          child > root > backend
\\\`\\\`\\\`

- A child injector with its own <code>provideHttpClient()</code> (for example in a [lazy route](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)'s <code>providers</code>) gets a **completely separate chain**. The root interceptors do not run at all.
- Adding <code>withRequestsMadeViaParent()</code> to the child call makes its chain end by handing the request to the parent <code>HttpClient</code>, so the child interceptors run first and the root ones after.
- The 22.2.3 typings add one rule: <code>withRequestsMadeViaParent()</code> "cannot be combined with <code>withFetch</code> or <code>withXhr</code> in the same <code>provideHttpClient()</code> call", and the source throws a configuration error in dev mode if you try.

The same experiment checked the injection-context boundary: <code>inject()</code> inside a <code>tap()</code> on the response failed with <code>NG0203: The EnvironmentInjector token injection failed. inject() function must be called from an injection context...</code>. Only the synchronous body of the interceptor runs in context. For background on how injectors are searched, see [how dependency injection works](/interview-question/how-does-dependency-injection-work-in-angular).

## 6. Other Details From the Source

- **Built lazily, once.** <code>this.chain</code> is <code>null</code> until the first request, then reused. Providers you add later to the same injector are not picked up.
- **Deduplicated.** The registered functions go through <code>new Set(...)</code>, so registering the very same function reference twice runs it once.
- **Untracked.** The chain is called inside <code>untracked(...)</code>, so reading a signal inside an interceptor does not make a surrounding <code>computed</code> or <code>effect</code> depend on it (see [Angular Signals](/interview-question/what-are-angular-signals)).
- **Counts as pending work.** Each request is registered with <code>PendingTasks</code> until it finishes, which is how server-side rendering knows to wait for HTTP before serialising the page (see [Angular SSR](/interview-question/what-is-angular-universal-ssr)).

## 7. Request Phase vs Response Phase

| | Request phase | Response phase |
| :--- | :--- | :--- |
| Where in code | Before <code>return next(req)</code> | Operators in <code>next(req).pipe(...)</code> |
| Order across interceptors | Array order (first to last) | Reverse (last to first) |
| Typical jobs | Add headers, rewrite URL, start a timer, short-circuit from cache | Log duration, map errors, retry, cache the response ([pipe operators](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap)) |
| <code>inject()</code> allowed? | Yes | No: capture what you need beforehand |
| Runs again on retry? | Only if it does its work at subscribe time (see the errors doc) | Yes, the operators resubscribe |

That last row matters for retries, and is verified in [handling errors and retries globally](/interview-question/how-do-you-handle-errors-and-retries-globally-with-interceptors).

## 8. Common Pitfalls

- **Expecting responses in array order.** They come back in reverse. An error-mapping interceptor listed first sees the error **after** everything below it, including any retry, which is usually what you want.
- **Putting a cache after the auth interceptor and wondering why tokens differ.** Whatever sits above the cache runs on hits too; whatever sits below never runs on hits. Decide which side each concern belongs on.
- **Registering <code>provideHttpClient()</code> again in a lazy route.** Verified above: the root chain silently stops applying to that subtree. Either do not re-provide, or add <code>withRequestsMadeViaParent()</code>.
- **Reading a signal and expecting reactivity.** Interceptors run untracked; they read the current value once per request, which is correct for tokens but means they cannot "react".
- **Using headers as flags.** Custom headers leak to the server and CORS preflights; use <code>HttpContextToken</code> instead.
- **Filtering only <code>HttpResponse</code>.** <code>next()</code> also emits a <code>Sent</code> event and, with <code>reportProgress</code>, progress events. Check <code>e.type === HttpEventType.Response</code> or <code>e instanceof HttpResponse</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"provideHttpClient registers an HttpInterceptorHandler that folds every registered interceptor into one chain with reduceRight, ending at the fetch backend."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Order:</strong> <span style="color:#f0e2c8;">"The request runs through interceptors in array order and the response comes back in reverse, because each one wraps everything after it, like an onion."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Inside one interceptor:</strong> <span style="color:#f0e2c8;">"Code before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(req)</code> is the request phase; operators piped onto <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(req)</code> are the response phase, and only the synchronous body can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inject()</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Short-circuit:</strong> <span style="color:#f0e2c8;">"If an interceptor returns a response without calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>, nothing downstream runs, which is how caches and mocks work; per-request flags go in an HttpContextToken."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope:</strong> <span style="color:#f0e2c8;">"Each provideHttpClient call is its own chain, so a lazy route that re-provides it loses the root interceptors unless it adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withRequestsMadeViaParent()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you put a timing interceptor so it measures the real network time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As close to the backend as possible, so last in the array. Placed first, it would also measure every other interceptor, including retries and their delays, which may or may not be what you want to report.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Angular build the chain with reduceRight?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each interceptor needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> that is "everything after me". Folding from the right starts with the backend and wraps outward, so the first array entry becomes the outermost function and runs first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there an interceptor I did not register?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the XSRF interceptor. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient()</code> always registers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xsrfInterceptorFn</code> first; it adds the XSRF header to mutating same-origin requests, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withNoXsrfProtection()</code> turns it off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I add an interceptor at runtime, after the app started?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not to an existing client: the chain is built on the first request and cached. Put the dynamic behaviour inside an interceptor that reads a service or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContext</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test the ordering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient(withInterceptors([...]))</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClientTesting()</code>. The real interceptors run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpTestingController.expectOne()</code> shows the final request (headers included), and flushing a response lets you assert what each layer did on the way back.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HttpInterceptorHandler** | Builds the chain from registered functions on the first request |
| **Interceptor chain** | Nested functions, first registered is outermost |
| **Request phase** | Code before <code>next()</code>; runs in array order |
| **Response phase** | Operators after <code>next()</code>; run in reverse order |
| **Short-circuit** | Answering without calling <code>next()</code> |
| **HttpContextToken** | Typed per-request flag that never reaches the server |
| **withRequestsMadeViaParent()** | Makes a child client forward its requests to the parent client |
| **XSRF interceptor** | Built-in first interceptor that adds the anti-forgery header |

---
**Conclusion:** <code>provideHttpClient()</code> turns your interceptor array into nested functions with <code>reduceRight</code>, so the first one wraps all the others: requests flow through in array order and responses flow back in reverse, exactly as the instrumented run printed (<code>A in > B in > backend > B out > A out</code>). An interceptor that does not call <code>next()</code> cuts off everything inside it, which is how a cache answers a hit. Each <code>provideHttpClient()</code> call is its own chain in its own injector, so a child call ignores the root interceptors unless it opts in with <code>withRequestsMadeViaParent()</code>.`,
    examples: [
      {
        label: "Instrumented interceptor chain with a short-circuiting HttpContext cache",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject, signal } from "@angular/core";
import {
  HttpClient, HttpContext, HttpContextToken, HttpEventType, HttpInterceptorFn, HttpResponse,
  provideHttpClient, withInterceptors,
} from "@angular/common/http";
import { of, tap } from "rxjs";

export const trace: string[] = [];

// Per-request flag an interceptor can read. Default: caching off.
export const CACHE = new HttpContextToken<boolean>(() => false);

// Code before next() runs on the way in; operators piped after next() run on the way out.
const stage = (name: string): HttpInterceptorFn => (req, next) => {
  trace.push(\`\${name} in\`);
  return next(req).pipe(
    tap((e) => { if (e.type === HttpEventType.Response) trace.push(\`\${name} out\`); }),
  );
};

// Short-circuit: answer from a cache and never call next(), so later stages never run.
const cache = new Map<string, HttpResponse<unknown>>();
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.context.get(CACHE)) return next(req);
  const hit = cache.get(req.urlWithParams);
  if (hit) { trace.push("cache HIT"); return of(hit.clone()); }
  return next(req).pipe(tap((e) => { if (e instanceof HttpResponse) cache.set(req.urlWithParams, e); }));
};

let calls = 0;
const fakeBackend: HttpInterceptorFn = (req) => {
  trace.push("backend");
  return of(new HttpResponse({ status: 200, body: { n: ++calls } }));
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([stage("A"), cacheInterceptor, stage("B"), fakeBackend])),
  ],
};

@Component({
  selector: "app-root",
  template: \`
    <button id="plain" (click)="get(false)">Plain GET</button>
    <button id="cached" (click)="get(true)">Cached GET</button>
    <p>{{ log() }}</p>
  \`,
})
export class AppComponent {
  private http = inject(HttpClient);
  log = signal("");

  get(useCache: boolean) {
    trace.length = 0;
    const context = new HttpContext().set(CACHE, useCache);
    this.http.get<{ n: number }>("/api/items", { context }).subscribe((r) => {
      this.log.set(\`body.n=\${r.n} | \${trace.join(" > ")}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is provideHttpClient(withInterceptors([...])) and how does it replace legacy HTTP interceptor providing?",
    seoDescription:
      "provideHttpClient(withInterceptors([...])) replaces HttpClientModule and HTTP_INTERCEPTORS classes. How to migrate, and how both styles order when mixed.",
    description: `**Question presented to candidate:**
"Our app still has HttpClientModule in an NgModule and four class interceptors registered with HTTP_INTERCEPTORS. We are going standalone. What replaces that setup, how do you migrate without breaking anything, and what happens while both styles exist?"

**What a strong answer should cover:**
- The legacy setup: \`HttpClientModule\` plus \`{ provide: HTTP_INTERCEPTORS, useClass: X, multi: true }\` for each class implementing \`HttpInterceptor\`.
- The replacement: \`provideHttpClient(withInterceptors([fnA, fnB]))\` with \`HttpInterceptorFn\` functions; ordering is one explicit array.
- The bridge: \`withInterceptorsFromDi()\` keeps class interceptors working under \`provideHttpClient()\`; **without it they are silently ignored**.
- When mixed, the **position of the features** in the \`provideHttpClient(...)\` call decides whether classes or functions run first.
- Status in 22.2.3: \`HttpClientModule\` and \`HttpClientTestingModule\` are deprecated; DI-based interceptors "may be phased out in a later release".
- A safe migration order: switch the module to \`provideHttpClient(withInterceptorsFromDi())\`, then convert classes one at a time, then drop the bridge.

**Clarifying questions expected:**
- "Do any interceptors depend on registration order today?"
- "Are there interceptors provided by third-party NgModules we cannot rewrite?"

**Code / implementation expected:** Yes — a class interceptor and its functional equivalent registered side by side, showing the resulting order.`,
    answer: `**Target Audience:** Developers maintaining or migrating an [NgModule](/interview-question/what-are-components-and-modules-in-angular)-era Angular app with class-based interceptors.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The deprecation notes are quoted from the installed Angular 22.2.3 typings, and every ordering result was produced by booting real class and functional interceptors (compiled with <code>ngc</code>) in jsdom.

This doc is the **migration** angle. For the basics of writing a functional interceptor see [functional HTTP interceptors and how to register them](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-), and for how the chain runs once registered see [how functional interceptors work with provideHttpClient()](/interview-question/how-do-functional-interceptors-work-with-providehttpclient).

## 1. Why This Even Matters — A Story First

Imagine an office where the rules for outgoing mail are pinned on noticeboards in four different rooms. Each rule says "apply me to every letter", but nobody can tell from any single board which rule is applied first. When the order matters, someone has to walk all four rooms and work out the sequence from the order the boards were put up.

That is the old <code>HTTP_INTERCEPTORS</code> setup. Each class interceptor was registered with a provider somewhere, often in different modules, and the order they ran in was the order those providers happened to be collected.

The new setup moves all the rules onto **one list on one board**: <code>withInterceptors([auth, tenant, errors])</code>. The order is the list. The migration question is how to move the rules across without a day where half the mail goes out unstamped.

## 2. The Two Setups Side by Side

📌 **Interview term: HTTP_INTERCEPTORS** — a multi-provider <code>InjectionToken</code> holding instances of classes that implement <code>HttpInterceptor</code> (an <code>intercept(req, next)</code> method that calls <code>next.handle(req)</code>). Each class (an injectable [service](/interview-question/what-is-a-service-and-why-use-it)) is registered with <code>{ provide: HTTP_INTERCEPTORS, useClass: X, multi: true }</code>. See [what an InjectionToken is](/interview-question/what-is-an-injectiontoken) and [useClass, useValue, useFactory and useExisting](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting) for the provider syntax.

📌 **Interview term: HttpClientModule** — the NgModule that used to provide <code>HttpClient</code>. Going module-free is part of moving to [standalone components](/interview-question/what-are-standalone-components). In 22.2.3 its typings read: <code>@deprecated use provideHttpClient(withInterceptorsFromDi()) as providers instead</code>.

📌 **Interview term: withInterceptorsFromDi()** — the bridge feature. Its typings say it "includes class-based interceptors configured using a multi-provider in the current [injector](/interview-question/how-does-dependency-injection-work-in-angular)", and add: "Prefer <code>withInterceptors</code> and functional interceptors instead, as support for DI-provided interceptors may be phased out in a later release."

| | Legacy (NgModule era) | Modern (standalone) |
| :--- | :--- | :--- |
| Provide HttpClient | <code>imports: [HttpClientModule]</code> | <code>provideHttpClient(...)</code> in <code>appConfig</code> |
| Interceptor shape | <code>@Injectable()</code> class with <code>intercept(req, next)</code> | <code>HttpInterceptorFn</code>: <code>(req, next) => ...</code> |
| Forwarding | <code>next.handle(req)</code> | <code>next(req)</code> |
| Dependencies | Constructor parameters | <code>inject()</code> in the function body |
| Registration | One <code>HTTP_INTERCEPTORS</code> multi-provider per class | One ordered array in <code>withInterceptors([...])</code> |
| Order | Provider collection order | Array order |
| Testing | <code>HttpClientTestingModule</code> (deprecated: "Add <code>provideHttpClientTesting()</code> to your providers instead") | <code>provideHttpClientTesting()</code> |
| Generator default | <code>ng g interceptor x --functional=false</code> | <code>ng g interceptor x</code> (CLI 22.2.3 default <code>--functional</code> is true) |

The [CLI](/interview-question/what-does-the-angular-cli-provide) row was checked by running both commands: the default output is a three-line <code>HttpInterceptorFn</code>, and <code>--functional=false</code> produces the <code>@Injectable()</code> class.

## 3. How the Bridge Works Inside

Reading <code>withInterceptorsFromDi</code> in the 22.2.3 source, it does not run the classes separately. It registers **one adapter function** into the same list that <code>withInterceptors</code> uses. When that adapter is reached, it injects <code>HTTP_INTERCEPTORS</code>, chains the class instances together with <code>reduceRight</code>, and runs them all in place.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="withInterceptorsFromDi inserts one adapter into the functional list, and the adapter runs every class interceptor">
  <defs>
    <marker id="fi3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="30" text-anchor="middle">one interceptor list, in feature order</text>
  <rect class="d-box" x="30" y="60" width="130" height="56" rx="10"/>
  <text class="d-text" x="95" y="93" text-anchor="middle">xsrf</text>
  <rect class="d-box-accent" x="210" y="60" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="310" y="93" text-anchor="middle">DI adapter</text>
  <rect class="d-box" x="460" y="60" width="200" height="56" rx="10"/>
  <text class="d-text" x="560" y="93" text-anchor="middle">functional fns</text>
  <path class="d-edge-accent" d="M 164 88 L 204 88" marker-end="url(#fi3-arrow)"/>
  <path class="d-edge-accent" d="M 414 88 L 454 88" marker-end="url(#fi3-arrow)"/>
  <rect class="d-box-muted" x="160" y="170" width="300" height="70" rx="12"/>
  <text class="d-text" x="310" y="200" text-anchor="middle">HTTP_INTERCEPTORS classes</text>
  <text class="d-sub" x="310" y="224" text-anchor="middle">ClassA then ClassB</text>
  <path class="d-edge-dashed" d="M 310 120 L 310 164" marker-end="url(#fi3-arrow)"/>
</svg>

Because the adapter is just another entry in the list, its position is decided by where you put <code>withInterceptorsFromDi()</code> among the features of the <code>provideHttpClient(...)</code> call. That is the single most useful fact for a mixed codebase.

## 4. Verified: feature order decides who runs first

Two class interceptors (<code>classA</code>, <code>classB</code>, registered in that order with <code>HTTP_INTERCEPTORS</code>) and one function (<code>fn</code>) were registered three ways, and each logged its name as the request passed:

\\\`\\\`\\\`
fromDi first               classA > classB > fn
withInterceptors first     fn > classA > classB
no withInterceptorsFromDi  fn
\\\`\\\`\\\`

- <code>provideHttpClient(withInterceptorsFromDi(), withInterceptors([fn]))</code>: classes first, then the function.
- <code>provideHttpClient(withInterceptors([fn]), withInterceptorsFromDi())</code>: the function first.
- <code>provideHttpClient(withInterceptors([fn]))</code> with the same <code>HTTP_INTERCEPTORS</code> providers present: **the classes never run, and nothing warns you**. This is the bug most migrations hit.

## 5. Verified: one interceptor before and after

The example at the bottom contains a class <code>LegacyTenantInterceptor</code> (constructor-injected <code>TenantService</code>, <code>next.handle()</code>) and its functional twin <code>tenantInterceptor</code> (<code>inject(TenantService)</code>, <code>next()</code>), registered together mid-migration with <code>withInterceptorsFromDi()</code> placed first. After clicking Send, the root text (button label and paragraph run together):

\\\`\\\`\\\`
after click: SendX-Tenant=acme | order: legacy class > functional
\\\`\\\`\\\`

One more thing surfaced while verifying: the class version needs **decorator type metadata** for its constructor parameter. Compiled by <code>ngc</code> (as <code>ng build</code> does) it works; run through a plain TypeScript transpile with runtime [JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) it fails with <code>NG0202: This constructor is not compatible with Angular Dependency Injection because its dependency at index 0 of the parameter list is invalid.</code> The functional version has no constructor and no such dependency on compile-time metadata. More on that in [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function).

## 6. A Migration Plan That Never Breaks Requests

1. **Swap the module, keep the classes.** Replace <code>HttpClientModule</code> with <code>provideHttpClient(withInterceptorsFromDi())</code> (in the <code>appConfig</code> you pass when you [bootstrap standalone](/interview-question/how-do-you-bootstrap-a-standalone-angular-application), or in the root NgModule providers if you have not switched yet). Behaviour is unchanged: same classes, same order.
2. **Write down today's order.** Log the class order once, as in section 4, so you have a baseline.
3. **Convert one class at a time.** Constructor parameters become <code>inject()</code> calls at the top of the function; <code>next.handle(x)</code> becomes <code>next(x)</code>. Add the function to <code>withInterceptors([...])</code> and remove that class's <code>HTTP_INTERCEPTORS</code> provider in the same change.
4. **Keep the order stable.** Interceptors that must run before the remaining classes go in a <code>withInterceptors</code> placed **before** <code>withInterceptorsFromDi()</code>; ones that must run after go in a second <code>withInterceptors</code> placed after it. Multiple <code>withInterceptors</code> features append in call order: verified, <code>withInterceptors([x1, x2]), withInterceptors([y1])</code> ran <code>x1 > x2 > y1</code>.
5. **Drop the bridge.** When no <code>HTTP_INTERCEPTORS</code> providers remain (search the codebase and third-party modules), remove <code>withInterceptorsFromDi()</code>.
6. **Update tests.** Replace <code>HttpClientTestingModule</code> with <code>provideHttpClient(withInterceptors([...]))</code> plus <code>provideHttpClientTesting()</code>.

## 7. Common Pitfalls

- **Dropping <code>withInterceptorsFromDi()</code> too early.** Verified: remaining class interceptors stop running silently. Auth headers vanish and you find out from a 401.
- **Assuming class and function order is fixed.** It depends on the position of the two features in the <code>provideHttpClient()</code> call; check it rather than guess.
- **Providing <code>HTTP_INTERCEPTORS</code> in a [lazy module or route](/interview-question/how-does-routing-and-lazy-loading-work-in-angular).** The bridge reads the multi-provider from the injector of the <code>HttpClient</code> that uses it. Verified: a class provided only in a child injector did not run for the root client (the log showed just <code>rootFn</code>).
- **Leaving a stray <code>HttpClientModule</code> in a lazy feature module.** It provides a second, separate client for that injector. Verified: a child injector with <code>importProvidersFrom(HttpClientModule)</code> ran **none** of the root functional interceptors. Remove it, not just the root one.
- **Converting a class but keeping constructor DI habits.** Calling <code>inject()</code> inside <code>pipe(...)</code> callbacks throws NG0203 (see [runInInjectionContext](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it)); capture services at the top of the function.
- **Third-party modules that register class interceptors.** You cannot convert those; keep <code>withInterceptorsFromDi()</code> as long as they are in the app.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The replacement:</strong> <span style="color:#f0e2c8;">"HttpClientModule plus HTTP_INTERCEPTORS classes becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient(withInterceptors([fns]))</code>, with plain HttpInterceptorFn functions in one ordered array."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bridge:</strong> <span style="color:#f0e2c8;">"During migration I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withInterceptorsFromDi()</code>, which plugs all the class interceptors into the same chain through one adapter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The ordering rule:</strong> <span style="color:#f0e2c8;">"The adapter sits wherever I put that feature in the provideHttpClient call, so feature order decides whether the classes run before or after the functions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;">"Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withInterceptorsFromDi()</code>, provideHttpClient ignores HTTP_INTERCEPTORS completely and silently, so I keep it until the last class is gone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Status:</strong> <span style="color:#f0e2c8;">"In 22.2.3 HttpClientModule and HttpClientTestingModule are deprecated, and the typings warn DI interceptors may be phased out, so functions are the long-term API."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you convert a class interceptor that injects three services?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turn <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">intercept()</code> into the function body, replace each constructor parameter with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const x = inject(X)</code> at the top, and replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next.handle(req)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(req)</code>. The RxJS pipeline after it stays exactly the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a functional interceptor and a class interceptor share state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, through a service both inject. Interceptors should not hold request state themselves anyway; a singleton service or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContextToken</code> per request is the right place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if a library still provides a class interceptor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withInterceptorsFromDi()</code> and position it where that interceptor needs to run relative to yours. You can migrate your own code fully and leave the bridge only for the library.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is HttpClientModule removed in v22?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it still exists but is marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@deprecated</code> in the 22.2.3 typings with the instruction to use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient(withInterceptorsFromDi())</code> instead, which is exactly its behaviour-preserving replacement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does migrating change behaviour on the server for SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not the interceptor logic. The backend default did change separately in v22 to fetch, which the HTTP typings recommend for SSR; that is independent of class versus function interceptors.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HTTP_INTERCEPTORS** | Multi-provider token holding class-based interceptors |
| **HttpInterceptor** | The class interface with <code>intercept(req, next)</code> |
| **HttpClientModule** | The deprecated NgModule that provided HttpClient |
| **withInterceptorsFromDi()** | Bridge that runs HTTP_INTERCEPTORS classes inside the functional chain |
| **withInterceptors()** | Registers functional interceptors in array order |
| **Feature order** | The order of features inside one provideHttpClient call, which positions the bridge |
| **provideHttpClientTesting()** | The standalone replacement for HttpClientTestingModule |

---
**Conclusion:** <code>provideHttpClient(withInterceptors([...]))</code> replaces <code>HttpClientModule</code> plus scattered <code>HTTP_INTERCEPTORS</code> providers with one explicit, ordered list of functions. The bridge is <code>withInterceptorsFromDi()</code>: it inserts a single adapter that runs every class interceptor, and its position among the features decides whether classes or functions go first, as the verified runs showed (<code>classA > classB > fn</code> versus <code>fn > classA > classB</code>). Leave it out and the classes silently stop running, so migrate one interceptor at a time and remove the bridge last.`,
    examples: [
      {
        label: "A class interceptor and its functional twin, registered together mid-migration",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import {
  HTTP_INTERCEPTORS, HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpInterceptorFn,
  HttpRequest, HttpResponse, provideHttpClient, withInterceptors, withInterceptorsFromDi,
} from "@angular/common/http";
import { Observable, of } from "rxjs";

export const seen: string[] = [];

@Injectable({ providedIn: "root" })
export class TenantService {
  id = "acme";
}

// BEFORE: a class-based interceptor, registered through the HTTP_INTERCEPTORS multi-provider.
@Injectable()
export class LegacyTenantInterceptor implements HttpInterceptor {
  constructor(private tenant: TenantService) {}
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    seen.push("legacy class");
    return next.handle(req.clone({ setHeaders: { "X-Tenant": this.tenant.id } }));
  }
}

// AFTER: the same job as a function. inject() replaces the constructor, next() replaces next.handle().
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  seen.push("functional");
  return next(req.clone({ setHeaders: { "X-Tenant": inject(TenantService).id } }));
};

const fakeBackend: HttpInterceptorFn = (req) =>
  of(new HttpResponse({ status: 200, body: req.headers.get("X-Tenant") }));

// Mid-migration: both styles at once. The order of the two features decides who runs first.
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([tenantInterceptor, fakeBackend])),
    { provide: HTTP_INTERCEPTORS, useClass: LegacyTenantInterceptor, multi: true },
  ],
};

@Component({
  selector: "app-root",
  template: \`<button (click)="send()">Send</button> <p>{{ out() }}</p>\`,
})
export class AppComponent {
  private http = inject(HttpClient);
  out = signal("");

  send() {
    seen.length = 0;
    this.http.get<string>("/api/orders").subscribe((tenant) => {
      this.out.set(\`X-Tenant=\${tenant} | order: \${seen.join(" > ")}\`);
    });
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle errors and retries globally with interceptors?",
    seoDescription:
      "Global HTTP error handling and retries with functional interceptors: retry only transient GET failures with backoff, map errors once, and test it in v22.",
    description: `**Question presented to candidate:**
"Our API sometimes returns 503 for a second or two during deploys, and every component has its own copy-pasted catchError. Design a global approach with interceptors: what gets retried, how users see errors, and how you would prove it works."

**What a strong answer should cover:**
- Two interceptors with separate jobs: a **retry interceptor** (inner) and an **error interceptor** (outer) that maps the final failure to one user-facing message.
- Retry only **transient** failures (status 0 and 5xx) and only **idempotent** methods (GET, HEAD), with a cap and **exponential backoff** via \`retry({ count, delay })\`.
- **Fail fast** on 4xx: retrying a 401 or 404 just delays the inevitable.
- **Order matters**: the error interceptor must wrap the retry interceptor, or it fires once per attempt.
- Rethrow after handling (\`throwError(() => err)\`) so callers can still react; do not swallow errors into fake successes.
- Retrying works by **resubscribing** to \`next(req)\`; work done eagerly in an inner interceptor does not repeat.
- Proving it: \`provideHttpClientTesting()\` + \`HttpTestingController\` to flush 503, 502, 200 and count requests.

**Clarifying questions expected:**
- "Which endpoints are safe to retry: are any POSTs idempotent with an idempotency key?"
- "How should errors reach the user: a toast, a banner, a redirect to login on 401?"

**Code / implementation expected:** Yes — an error interceptor plus a retry interceptor with backoff, and a test with HttpTestingController.`,
    answer: `**Target Audience:** Developers who know the basics of interceptors and RxJS and want a production-grade global error and retry strategy.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every attempt count, ordering result and test outcome below was produced by running the code on Angular 22.2.3 and RxJS 7.8.2 (compiled with <code>ngc</code>, booted in jsdom with an exported <code>appConfig</code>, a fake backend interceptor, or <code>provideHttpClientTesting()</code>).

The general mechanics of the chain (array order in, reverse order out) are covered in [how functional interceptors work with provideHttpClient()](/interview-question/how-do-functional-interceptors-work-with-providehttpclient); this doc applies them to errors and retries.

## 1. Why This Even Matters — A Story First

You ring a restaurant to book a table. The line is busy. You do not give up and tell your friends the restaurant has closed down; you wait a moment and ring again, and if it is still busy you wait a little longer. But if the person who answers says "we are fully booked", ringing back every five seconds will not help, and is rude.

That is the whole retry policy in two sentences. A **busy line** is a transient failure: a 503 during a deploy, a dropped connection. Try again, with growing pauses. A **"fully booked"** is a definite answer: a 401, a 403, a 404, a validation 422. Report it at once.

And the friend who passes the news on to the group should only do it **once**, after you have finished trying, not after every busy signal. In interceptor terms: the retry logic sits close to the server, the error reporting sits outside it.

## 2. The Core Idea

Each failure ends up as an <code>HttpErrorResponse</code> in the response phase, where a [service](/interview-question/what-is-a-service-and-why-use-it) such as an error store, a [signal](/interview-question/what-are-angular-signals) or the [router](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) can react to it.

📌 **Interview term: Transient vs permanent error** — a transient error might succeed if you try again (network failure, reported by Angular as <code>HttpErrorResponse</code> with <code>status 0</code>, and 5xx server errors). A permanent error will not (4xx). Verified: a request to a closed port on 22.2.3 produced <code>HttpErrorResponse 0 Http failure response for http://127.0.0.1:9/x: 0 undefined</code>.

📌 **Interview term: Idempotent request** — one that is safe to send twice, because the second copy does not change anything more (GET, HEAD, PUT and DELETE by HTTP semantics). Auto-retrying a POST can create two orders; only retry it if the API supports an idempotency key.

📌 **Interview term: Exponential backoff** — waiting longer before each retry (for example 20, 40, 80 ms in the demo; usually hundreds of milliseconds in production), so a struggling server is not hammered. Adding random jitter spreads many clients out.

📌 **Interview term: retry({ count, delay })** — the RxJS 7 operator that resubscribes to its source when it errors. <code>count</code> caps the retries; <code>delay(error, attempt)</code> returns an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises): when it emits, the retry happens; if it errors, the retry is abandoned and that error goes downstream. That makes the "is this worth retrying?" decision a one-liner.

## 3. The Two Interceptors and Their Order

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="The error interceptor wraps the retry interceptor, which wraps the backend, so errors are reported once after retries">
  <defs>
    <marker id="fi4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="660" height="260" rx="16"/>
  <text class="d-text" x="140" y="52" text-anchor="middle">errorInterceptor</text>
  <text class="d-sub" x="140" y="76" text-anchor="middle">maps final failure once</text>
  <rect class="d-box" x="260" y="60" width="400" height="200" rx="14"/>
  <text class="d-text" x="380" y="92" text-anchor="middle">retryInterceptor</text>
  <text class="d-sub" x="380" y="116" text-anchor="middle">GET and 5xx or 0 only</text>
  <rect class="d-box-accent" x="460" y="150" width="180" height="80" rx="12"/>
  <text class="d-text d-accent" x="550" y="196" text-anchor="middle">backend</text>
  <path class="d-edge-dashed" d="M 456 175 C 380 150, 380 220, 456 205" marker-end="url(#fi4-arrow)"/>
  <text class="d-sub" x="340" y="200" text-anchor="middle">resubscribe</text>
</svg>

The error interceptor is registered first, so it is the outer layer and sees an error only after the retry interceptor inside it has given up. The order in <code>withInterceptors([errorInterceptor, retryInterceptor, ...])</code> is what produces that nesting.

## 4. Verified: three kinds of failure

The example's fake backend counts attempts per URL: <code>/api/flaky</code> returns 503 twice and then succeeds, <code>/api/down</code> always returns 503, and <code>/api/secure</code> returns 401. Each button was clicked and the result and banner paragraphs printed:

\\\`\\\`\\\`
/api/flaky: ok after 3 attempt(s)            | banner: none
/api/down: error 503 after 3 attempt(s)      | banner: Server unavailable, try later [/api/down]
/api/secure: error 401 after 1 attempt(s)    | banner: Please sign in again [/api/secure]
\\\`\\\`\\\`

- **Flaky:** two retries hid the deploy blip completely. The user saw a slightly slower success and no error.
- **Down:** one original attempt plus <code>count: 2</code> retries is 3 attempts, then the error interceptor showed **one** banner and rethrew so the component could show its own state.
- **Secure:** the <code>delay</code> callback returned <code>throwError</code> for a 401, so there was no retry at all.

## 5. Verified: why the order and the laziness matter

A second experiment varied the order and how the inner layers do their work, logging every step (<code>backend-sub</code> means the backend was subscribed to, which is when a real request is sent):

\\\`\\\`\\\`
error outer, retry inner     backend-sub > backend-sub > backend-sub > errLog
retry outer, error inner     backend-sub > errLog > backend-sub > errLog > backend-sub > errLog
eager inner + eager backend  eager-body > backend-call
lazy inner + lazy backend    defer-body > backend-sub > defer-body > backend-sub > defer-body > backend-sub
\\\`\\\`\\\`

- **Order:** with the error interceptor inside the retry one, it fired on **every attempt** (three banners for one failure). Outside, it fired once.
- **Laziness:** <code>retry</code> re-subscribes to the Observable that <code>next(req)</code> returned; it does **not** call the interceptor functions again. Work an inner interceptor does in its function body (<code>eager-body</code>) therefore happens once per request, not once per attempt. Angular's real <code>FetchBackend</code> is lazy (its <code>handle()</code> returns <code>new Observable(...)</code>, read from the 22.2.3 source), so real retries do re-send. A hand-written fake backend must be lazy too, which is why the example wraps it in <code>defer()</code>; the first version without it reported "error 503 after 1 attempt(s)" because retrying re-delivered the same already-created error.

The practical consequence: if an inner interceptor reads an auth token eagerly, a retry re-sends the **same** token. Token refresh logic belongs in an interceptor that does its work inside <code>defer()</code> or a <code>switchMap</code>, or outside the retry layer. For the operators involved see [switchMap, mergeMap, concatMap and exhaustMap](/interview-question/what-is-the-difference-between-switchmap-mergemap-concatmap-and-exhaustmap).

## 6. Verified: testing it with HttpTestingController

The second example registers the real retry interceptor together with <code>provideHttpClientTesting()</code>. Every request then waits until the test flushes it, so retries become visible as separate requests:

\\\`\\\`\\\`
flushed 503, outcome so far: (pending)
flushed 502, outcome so far: (pending)
flushed 200, outcome so far: next {"ok":true}
verify(): no outstanding requests
401 outcome: error 401 | retries sent: 0
\\\`\\\`\\\`

<code>expectOne()</code> succeeded three times for <code>/api/report</code>, proving each retry was a new request; <code>verify()</code> confirmed nothing was left open; and after a 401 <code>match()</code> found no retry. In a Vitest spec you would write the same calls with <code>TestBed.inject(HttpTestingController)</code>; see [mocking services in unit tests](/interview-question/how-do-you-mock-services-in-angular-unit-tests-using-jasmine-jest-spies).

## 7. Choosing a Policy

| Failure | Status | Retry? | User sees |
| :--- | :--- | :--- | :--- |
| Network down, CORS, DNS | 0 | Yes, with backoff (idempotent only) | "Check your connection" after retries |
| Deploy or overload | 502, 503, 504 | Yes, with backoff | Nothing, if a retry succeeds |
| Server bug | 500 | Optional, once | Generic error plus a support reference |
| Not signed in | 401 | No | Redirect to login or refresh the session |
| Forbidden | 403 | No | "You do not have access" |
| Not found, validation | 404, 409, 422 | No | Handled by the calling component |
| Rate limited | 429 | Yes, honouring <code>Retry-After</code> | "Slow down" if it persists |

## 8. Common Pitfalls

- **Error interceptor inside the retry interceptor.** Verified above: the user gets one error report per attempt. Register the error interceptor first.
- **Retrying everything.** Retrying 4xx wastes time; retrying POST can duplicate side effects. Gate on method and status in the <code>delay</code> callback.
- **Swallowing errors.** Returning <code>of(null)</code> or <code>EMPTY</code> from a global <code>catchError</code> makes callers think the call succeeded. Map, report, then <code>throwError(() => err)</code>; per-call fallbacks belong in the caller (see [catchError and fallback values](/interview-question/how-does-catcherror-work-in-rxjs-and-how-do-you-return-a-fallback-value)).
- **Calling <code>inject()</code> inside <code>catchError</code>.** It is outside the [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it) and throws NG0203; [inject()](/interview-question/inject-vs-constructor-injection-when-should-you-use-each) the store or router at the top of the interceptor.
- **Fake backends that are not lazy.** A fake that creates its error eagerly makes <code>retry</code> look broken in demos and tests; wrap it in <code>defer()</code>.
- **No upper bound.** <code>retry()</code> with no count retries forever. Always set <code>count</code>, and keep the total wait shorter than the user's patience.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Structure:</strong> <span style="color:#f0e2c8;">"I use two functional interceptors: an outer error interceptor that turns the final failure into one user message, and an inner retry interceptor."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What to retry:</strong> <span style="color:#f0e2c8;">"Only transient failures, status 0 and 5xx, and only idempotent methods like GET, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">retry({ count: 2, delay })</code> with exponential backoff."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What not to retry:</strong> <span style="color:#f0e2c8;">"For 4xx the delay callback returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throwError</code>, so a 401 fails immediately and goes to the login flow."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why the order:</strong> <span style="color:#f0e2c8;">"The error interceptor is registered first so it wraps the retry one and reports once; reversed, it fires on every attempt."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">"I test it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClientTesting()</code>: flush 503, 502, 200 and assert three requests and one success, then flush a 401 and assert no retry."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why rethrow after handling the error globally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the caller may still need to react: stop a spinner, keep a form open, show inline validation. The global layer reports; it should not pretend the request succeeded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle 401 with token refresh?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In its own interceptor: on 401, call the refresh endpoint once (shared across concurrent requests, for example with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shareReplay</code>), then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(req.clone(...))</code> with the new token. Exclude the refresh call itself from the interceptor so it cannot loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does retry() call my interceptors again?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It resubscribes to the Observable that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> returned. Only work done at subscription time repeats, which is why Angular's backend is lazy and why token logic should run inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defer()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">switchMap</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you let one request opt out of retries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpContextToken&lt;boolean&gt;</code> such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO_RETRY</code>, set it in that call's options, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(req)</code> untouched in the retry interceptor when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">req.context.get(NO_RETRY)</code> is true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do errors that nobody handles end up?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">RxJS rethrows an error nobody subscribed for inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code>, so in a browser it becomes a window error event, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideBrowserGlobalErrorListeners()</code> forwards window error and unhandledrejection events to Angular's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ErrorHandler</code>. That path was read from the RxJS 7.8.2 and Angular 22.2.3 source rather than run in a real browser. It is a last resort; the global interceptor should already have reported it.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HttpErrorResponse** | The error object for a failed request; <code>status 0</code> means no HTTP response |
| **Transient error** | Might succeed on a second try: 0 and 5xx |
| **Idempotent** | Safe to send twice: GET, HEAD, PUT, DELETE |
| **retry({ count, delay })** | RxJS operator that resubscribes on error, with a custom wait or give-up rule |
| **Exponential backoff** | Waiting longer before each retry |
| **defer()** | Creates the Observable only when subscribed, so each retry does fresh work |
| **HttpTestingController** | Test backend that lets you flush each request by hand |

---
**Conclusion:** Global HTTP error handling is two interceptors in a deliberate order: an outer one that maps the final failure to a single user-facing message and rethrows, and an inner one that retries only transient failures of idempotent requests with capped backoff. Verified on 22.2.3, that gives "ok after 3 attempts" for a deploy blip, exactly one banner after three failed attempts, and no retry for a 401, while the reversed order reports every attempt. Retries resubscribe rather than re-running interceptors, so keep per-attempt work lazy, and prove the policy with <code>HttpTestingController</code>.`,
    examples: [
      {
        label: "Global error interceptor wrapping a retry-with-backoff interceptor",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, Injectable, inject, signal } from "@angular/core";
import {
  HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors,
} from "@angular/common/http";
import { catchError, defer, of, retry, throwError, timer } from "rxjs";

// One place the whole app reads errors from (a toast, a banner...).
@Injectable({ providedIn: "root" })
export class ErrorStore {
  last = signal("none");
}

// OUTER: sees only the final outcome, after all retries are spent.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errors = inject(ErrorStore); // read the injector now, not inside catchError
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const msg = err.status === 401 ? "Please sign in again"
        : err.status >= 500 || err.status === 0 ? "Server unavailable, try later"
        : \`Request failed (\${err.status})\`;
      errors.last.set(\`\${msg} [\${req.url}]\`);
      return throwError(() => err); // rethrow so the caller can still react
    }),
  );
};

// INNER: retries only what is worth retrying, with exponential backoff.
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== "GET") return next(req); // never auto-retry non-idempotent calls
  return next(req).pipe(
    retry({
      count: 2,
      delay: (err: HttpErrorResponse, attempt) => {
        const transient = err.status === 0 || err.status >= 500;
        if (!transient) return throwError(() => err); // 401/404: fail now
        return timer(10 * 2 ** attempt); // 20ms, 40ms
      },
    }),
  );
};

// Fake server: counts attempts per URL. /flaky fails twice, /down always fails.
// defer(): do the work on each subscribe, like a real backend, so retry() re-sends.
export const attempts = new Map<string, number>();
const fakeBackend: HttpInterceptorFn = (req) => defer(() => {
  const n = (attempts.get(req.url) ?? 0) + 1;
  attempts.set(req.url, n);
  const fail = (status: number) => throwError(() => new HttpErrorResponse({ status, url: req.url }));
  if (req.url === "/api/flaky" && n <= 2) return fail(503);
  if (req.url === "/api/down") return fail(503);
  if (req.url === "/api/secure") return fail(401);
  return of(new HttpResponse({ status: 200, body: "ok" }));
});

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([errorInterceptor, retryInterceptor, fakeBackend]))],
};

@Component({
  selector: "app-root",
  template: \`
    @for (url of urls; track url) {
      <button (click)="call(url)">{{ url }}</button>
    }
    <p id="result">{{ result() }}</p>
    <p id="banner">banner: {{ errors.last() }}</p>
  \`,
})
export class AppComponent {
  private http = inject(HttpClient);
  errors = inject(ErrorStore);
  urls = ["/api/flaky", "/api/down", "/api/secure"];
  result = signal("");

  call(url: string) {
    this.http.get(url, { responseType: "text" }).subscribe({
      next: (body) => this.result.set(\`\${url}: \${body} after \${attempts.get(url)} attempt(s)\`),
      error: (e: HttpErrorResponse) =>
        this.result.set(\`\${url}: error \${e.status} after \${attempts.get(url)} attempt(s)\`),
    });
  }
}`,
      },
      {
        label: "Testing the retry policy with provideHttpClientTesting() and HttpTestingController",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, inject } from "@angular/core";
import {
  HttpClient, HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors,
} from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { retry, throwError, timer } from "rxjs";

// The interceptor under test: retry 5xx up to twice, fail fast on anything else.
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({
      count: 2,
      delay: (err: HttpErrorResponse) => (err.status >= 500 ? timer(0) : throwError(() => err)),
    }),
  );

// Real interceptors + a testing backend: every request waits for the test to flush it.
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([retryInterceptor])), provideHttpClientTesting()],
};

@Component({ selector: "app-root", template: \`retry test harness\` })
export class AppComponent {
  private http = inject(HttpClient);
  private backend = inject(HttpTestingController);

  async runTest() {
    const tick = () => new Promise((r) => setTimeout(r, 5));
    let outcome = "(pending)";
    this.http.get("/api/report").subscribe({
      next: (b) => (outcome = \`next \${JSON.stringify(b)}\`),
      error: (e) => (outcome = \`error \${e.status}\`),
    });

    // Each retry is a brand-new request the backend must answer.
    for (const status of [503, 502, 200]) {
      const req = this.backend.expectOne("/api/report");
      if (status === 200) req.flush({ ok: true });
      else req.flush("down", { status, statusText: "Bad Gateway" });
      console.log(\`flushed \${status}, outcome so far: \${outcome}\`);
      await tick();
    }
    this.backend.verify(); // throws if any request is still open
    console.log("verify(): no outstanding requests");

    this.http.get("/api/secret").subscribe({ error: (e) => (outcome = \`error \${e.status}\`) });
    this.backend.expectOne("/api/secret").flush("no", { status: 401, statusText: "Unauthorized" });
    await tick();
    console.log(\`401 outcome: \${outcome} | retries sent: \${this.backend.match("/api/secret").length}\`);
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you bootstrap a standalone Angular application?",
    seoDescription:
      "Bootstrap a standalone Angular app with bootstrapApplication(App, appConfig): main.ts, app.config.ts, providers, initializers and the errors to expect.",
    description: `**Question presented to candidate:**
"You run ng new on a current Angular version. Walk me through how the app starts: which files are involved, what goes where, and how you would add HTTP, a config file loaded at startup and an existing NgModule library."

**What a strong answer should cover:**
- \`main.ts\` calls \`bootstrapApplication(App, appConfig)\` from \`@angular/platform-browser\`; there is **no root NgModule**.
- \`app.config.ts\` exports an \`ApplicationConfig\` whose \`providers\` hold app-wide setup: \`provideRouter(routes)\`, \`provideHttpClient(...)\`, \`provideBrowserGlobalErrorListeners()\`.
- The root component must be **standalone** and its selector must match a tag in \`index.html\`.
- Startup work goes in \`provideAppInitializer(() => ...)\` (the \`APP_INITIALIZER\` token is deprecated); bootstrap waits for a returned Promise.
- NgModule-based libraries plug in with \`importProvidersFrom(SomeModule)\`.
- Typical failures: selector not in the page (NG05104), non-standalone root (NG0907), a rejected initializer (bootstrap rejects, nothing renders).

**Clarifying questions expected:**
- "Browser only, or does the app also render on the server?"
- "Is this a new project, or an existing NgModule app we are converting?"

**Code / implementation expected:** Yes — an \`appConfig\` with router, a value provider and an async app initializer, and the root component reading what the initializer loaded.`,
    answer: `**Target Audience:** Developers starting a new Angular project, or moving an NgModule app to standalone bootstrapping.
**Difficulty:** Easy

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The generated files are quoted from a real <code>ng new</code> run on [Angular CLI](/interview-question/what-does-the-angular-cli-provide) 22.2.3, and every rendered output and error message was produced by compiling with <code>ngc</code> and booting in jsdom.

This is the **how-to** doc. For what <code>bootstrapApplication</code> does internally, step by step (injectors, initializers, the zoneless scheduler, the first render), see [standalone bootstrapApplication without NgModules](/interview-question/standalone-bootstrapapplication-how-does-angular-bootstrap-without-ngmodules-in-).

## 1. Why This Even Matters — A Story First

Opening a shop takes two things: the shop itself (the shelves, the counter, the sign over the door) and the morning routine before the doors open (switch on the lights, put cash in the till, check today's prices). You do not want customers walking in before the till has change.

Starting an Angular app is the same. The **root component** is the shop. The **application config** is the morning routine and the list of utilities the shop needs: routing, HTTP, error reporting. <code>bootstrapApplication</code> is the person with the keys: it runs the routine, waits for anything slow (like fetching today's prices), and only then opens the door by rendering the root component into the page.

Older Angular apps described that routine in a root <code>NgModule</code>. Since standalone components became the default (see [standalone components](/interview-question/what-are-standalone-components)), the routine is just a plain object of providers.

## 2. The Three Files <code>ng new</code> Generates

Copied from a project generated by CLI 22.2.3:

\\\`\\\`\\\`ts
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
\\\`\\\`\\\`

\\\`\\\`\\\`ts
// src/app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes)],
};
\\\`\\\`\\\`

And <code>src/index.html</code> contains <code>&lt;app-root&gt;&lt;/app-root&gt;</code> in its body, which is where the root component (selector <code>app-root</code>, class <code>App</code> in <code>app.ts</code>) is rendered.

📌 **Interview term: bootstrapApplication(rootComponent, config?)** — the function from <code>@angular/platform-browser</code> that starts a standalone app. The 22.2.3 typings say the root component "**must** be a standalone one", and that it returns "A promise that returns an <code>ApplicationRef</code> instance once resolved".

📌 **Interview term: ApplicationConfig** — an object with a <code>providers</code> array. Everything that used to sit in the root module's <code>providers</code> and <code>imports</code> goes here, usually as <code>provideXxx()</code> functions.

📌 **Interview term: Environment providers** — what <code>provideRouter</code>, <code>provideHttpClient</code> and friends return. They configure the application-level injector (see [how dependency injection works](/interview-question/how-does-dependency-injection-work-in-angular)) and cannot be put in a component's <code>providers</code>.

## 3. What Goes in appConfig

| You need | Add to <code>providers</code> | Notes |
| :--- | :--- | :--- |
| Routing | <code>provideRouter(routes)</code> | See [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) |
| HttpClient with interceptors | <code>provideHttpClient(withInterceptors([...]))</code> | See [functional interceptors](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-) |
| Report uncaught errors | <code>provideBrowserGlobalErrorListeners()</code> | Generated by <code>ng new</code> |
| Work before the first render | <code>provideAppInitializer(() => ...)</code> | Bootstrap waits for a returned Promise or Observable |
| A value or service | <code>{ provide: TOKEN, useValue: ... }</code>, a class | Ordinary providers, see [useClass, useValue, useFactory](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting) and [InjectionToken](/interview-question/what-is-an-injectiontoken) |
| An NgModule library | <code>importProvidersFrom(SomeModule)</code> | Pulls only its providers |
| Zone-based [change detection](/interview-question/how-does-change-detection-work-in-angular) | <code>provideZoneChangeDetection()</code> | Only if you opt back in; zoneless is the default |
| Server rendering | <code>provideClientHydration()</code> | With the SSR setup, see [Angular SSR](/interview-question/what-is-angular-universal-ssr) and [hydration](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat) |

📌 **Interview term: provideAppInitializer()** — registers a function that runs during bootstrap, in an [injection context](/interview-question/what-is-runininjectioncontext-and-when-do-you-need-to-use-it), before the root component is created. The 22.2.3 typings: "If the function returns a Promise or an [Observable](/interview-question/what-is-the-difference-between-observables-and-promises), initialization does not complete until the Promise is resolved or the Observable is completed", and "Previously, this was achieved using the <code>APP_INITIALIZER</code> token which is now deprecated." The older token is explained in [the APP_INITIALIZER question](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st).

## 4. Verified: a config loaded before the first render

The example at the bottom provides the router, a <code>RuntimeConfig</code> class, a <code>FEATURE_FLAGS</code> token value and an async initializer that waits 20 ms (standing in for <code>fetch("/config.json")</code>) and then sets <code>apiUrl</code>. The root component reads <code>apiUrl</code> in a field initializer. Root text after booting and after one click (paragraphs and the button label run together):

\\\`\\\`\\\`
RENDERED   : API: https://api.example.combeta: trueclicks: 0+1
after click: API: https://api.example.combeta: trueclicks: 1+1
\\\`\\\`\\\`

The very first render already shows the loaded URL, not <code>(not loaded)</code>. That is the guarantee <code>provideAppInitializer</code> gives: the root component is not even constructed until the Promise resolves. The token value from <code>appConfig</code> (<code>beta: true</code>) also overrode the token's built-in factory default.

## 5. Verified: what goes wrong, and the exact errors

Each case was booted on 22.2.3:

| Mistake | What happens |
| :--- | :--- |
| Root selector not present in the page | <code>NG05104: The selector "no-such-tag" did not match any elements</code> and the promise rejects |
| Root component has <code>standalone: false</code> | <code>NG0907: The Fourth component is not marked as standalone, but Angular expects to have a standalone component here.</code> |
| An app initializer rejects (for example a 404 on the config file) | The promise rejects with that error (<code>config.json 404</code>), the root component constructor never runs, and the host element stays empty |

The last row is the reason <code>main.ts</code> ends with <code>.catch((err) => console.error(err))</code>: a failed bootstrap is otherwise a blank page with an unhandled rejection. In production you might render a static fallback message there instead.

## 6. Moving From bootstrapModule

The old entry point was <code>platformBrowserDynamic().bootstrapModule(AppModule)</code> with an <code>AppModule</code> whose <code>bootstrap: [AppComponent]</code> named the root. To convert:

1. Make the root component standalone and move what its template uses into its own <code>imports</code> (see [components and modules](/interview-question/what-are-components-and-modules-in-angular)).
2. Move the module's <code>providers</code> into <code>appConfig.providers</code>; replace <code>RouterModule.forRoot(routes)</code> with <code>provideRouter(routes)</code> and <code>HttpClientModule</code> with <code>provideHttpClient(withInterceptorsFromDi())</code> (see [migrating from HTTP_INTERCEPTORS](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i)).
3. Wrap any module you cannot replace in <code>importProvidersFrom(...)</code>.
4. Call <code>bootstrapApplication(AppComponent, appConfig)</code> in <code>main.ts</code>.

The Angular package ships a schematic for this (it also converts directives and [pipes](/interview-question/what-are-pipes-in-angular)): <code>ng generate @angular/core:standalone</code>, whose 22.2.3 schema offers three modes, "Convert all components, directives and pipes to standalone", "Remove unnecessary NgModule classes" and "Bootstrap the application using standalone APIs". Running them in that order is the usual path.

## 7. Common Pitfalls

- **Mismatched selector.** Renaming the root selector without updating <code>index.html</code> gives NG05104 and a blank page.
- **Putting environment providers in a component.** <code>provideRouter</code> and <code>provideHttpClient</code> belong in <code>appConfig</code> (or route providers). Verified: putting <code>provideHttpClient()</code> in a component's <code>providers</code> fails at runtime with <code>NG0207: Invalid providers present in a non-environment injector. 'EnvironmentProviders' can't be used for component providers.</code>
- **Still registering <code>APP_INITIALIZER</code>.** It works but is deprecated; <code>provideAppInitializer(fn)</code> is shorter and runs <code>fn</code> in an injection context, so it can call <code>inject(HttpClient)</code> directly.
- **A slow or failing initializer.** Everything waits for it. Keep initializers small, add a timeout, and decide what the user sees if it fails.
- **Assuming Zone.js.** A new app is zoneless, so <code>bootstrapApplication</code> with no extra providers gives a <code>NoopNgZone</code> (verified in the sibling internals doc). Code that relied on Zone.js re-rendering after <code>setTimeout</code> needs [signals](/interview-question/what-are-angular-signals), or <code>provideZoneChangeDetection()</code>; see [zoneless Angular](/interview-question/what-is-zoneless-angular-and-how-does-it-improve-performance-in-angular-18).
- **Swallowing bootstrap errors.** Removing the <code>.catch</code> in <code>main.ts</code> hides initializer and selector failures.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The entry point:</strong> <span style="color:#f0e2c8;">"main.ts calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication(App, appConfig)</code> from platform-browser; there is no root NgModule any more."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The config:</strong> <span style="color:#f0e2c8;">"app.config.ts exports an ApplicationConfig whose providers hold app-wide setup, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideRouter(routes)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideHttpClient()</code> and the global error listeners."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The root:</strong> <span style="color:#f0e2c8;">"The root component must be standalone, and its selector must exist in index.html, otherwise bootstrap fails with NG05104."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Startup work:</strong> <span style="color:#f0e2c8;">"Anything that must finish before the first render goes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideAppInitializer()</code>; bootstrap waits for its Promise, and a rejection stops the app from rendering."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Legacy code:</strong> <span style="color:#f0e2c8;">"NgModule libraries plug in with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">importProvidersFrom()</code>, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng generate @angular/core:standalone</code> schematic converts an existing app step by step."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does bootstrapApplication return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Promise of the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ApplicationRef</code>. You can use it to reach the root injector, attach more views, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destroy()</code>, and its rejection is where startup errors surface.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you load configuration from a JSON file before the app starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Register <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideAppInitializer()</code> with a function that injects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HttpClient</code> and a config service at the top, then returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">firstValueFrom(http.get("/config.json"))</code> chained to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code> that stores the result in the service. Components read the service; the root is not created until that Promise resolves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I bootstrap two root components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code> twice with different roots and host elements; they share one platform. For mounting components on demand without a root, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApplication()</code> creates the app environment and you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">appRef.bootstrap()</code> later.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do route-specific services go now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the route definition's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providers</code> array, which creates an environment injector for that route subtree. App-wide ones stay in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">appConfig</code>, and most services simply use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">providedIn: "root"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for server-side rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The server entry calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code> with a third <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context</code> argument, which the 22.2.3 typings describe as providing "a pre-existing platform injector", for example a platform created per request. The browser config usually adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideClientHydration()</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **bootstrapApplication** | Starts a standalone app from a root component and a config |
| **ApplicationConfig** | Object whose <code>providers</code> configure the application injector |
| **Root component** | The standalone component rendered into the host tag in index.html |
| **Environment providers** | Providers like <code>provideRouter()</code> that configure an injector, not a component |
| **provideAppInitializer** | Work that must finish before the first render |
| **importProvidersFrom** | Takes the providers out of an NgModule for a standalone app |
| **ApplicationRef** | Handle to the running app, returned by the bootstrap promise |

---
**Conclusion:** A standalone Angular app starts with one line in <code>main.ts</code>, <code>bootstrapApplication(App, appConfig)</code>, where <code>appConfig</code> is a plain list of providers such as <code>provideRouter</code>, <code>provideHttpClient</code> and <code>provideAppInitializer</code>, and the standalone root component is rendered into its tag in <code>index.html</code>. Verified on 22.2.3, an async initializer finishes before the root component is even constructed, while a missing host tag (NG05104), a non-standalone root (NG0907) or a rejected initializer all reject the bootstrap promise, which is why the generated <code>main.ts</code> keeps its <code>.catch</code>.`,
    examples: [
      {
        label: "appConfig with the router, a token, and an async app initializer that runs before the first render",
        tech: "angular",
        runnable: false,
        code: `// In a real project this is three files: main.ts, app.config.ts and app.ts.
// main.ts would be:  bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
import {
  ApplicationConfig, Component, InjectionToken, inject, provideAppInitializer,
  provideBrowserGlobalErrorListeners, signal,
} from "@angular/core";
import { provideRouter } from "@angular/router";

// app.config.ts: everything an NgModule used to provide now goes here.
export const FEATURE_FLAGS = new InjectionToken<{ beta: boolean }>("FEATURE_FLAGS", {
  factory: () => ({ beta: false }),
});

export class RuntimeConfig {
  apiUrl = "(not loaded)";
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter([]),
    RuntimeConfig,
    { provide: FEATURE_FLAGS, useValue: { beta: true } },
    // Runs before the root component is created; bootstrap waits for the promise.
    provideAppInitializer(async () => {
      const config = inject(RuntimeConfig);
      await new Promise((r) => setTimeout(r, 20)); // stands in for fetch("/config.json")
      config.apiUrl = "https://api.example.com";
    }),
  ],
};

// app.ts: the root component. Its selector must match a tag in index.html.
@Component({
  selector: "app-root",
  template: \`<p>API: {{ api }}</p> <p>beta: {{ flags.beta }}</p> <p>clicks: {{ clicks() }}</p>
    <button (click)="clicks.set(clicks() + 1)">+1</button>\`,
})
export class AppComponent {
  api = inject(RuntimeConfig).apiUrl; // already set: initializers finished first
  flags = inject(FEATURE_FLAGS);
  clicks = signal(0);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Standalone bootstrapApplication — how does Angular bootstrap without NgModules in 2025?",
    seoDescription:
      "What bootstrapApplication does without NgModules: platform and environment injectors, initializers, zoneless scheduling and first render, verified.",
    description: `**Question presented to candidate:**
"With no AppModule, something still has to create the injector, run initializers and render the root component. Explain what bootstrapApplication actually does, in order, and how that differs from the old bootstrapModule path."

**What a strong answer should cover:**
- A **platform injector** is created (or reused) once per page; an **environment (application) injector** is created from the \`ApplicationConfig\` providers, with the platform injector as parent.
- Angular prepends its own providers: browser essentials and the **zoneless change detection** setup, so a bare bootstrap uses \`NoopNgZone\`.
- Order: environment initializers run while the injector is set up, then **app initializers** (awaited), then the root component is created, change detection runs once, then bootstrap listeners fire.
- \`ApplicationRef.bootstrap(Root)\` creates the root \`ComponentRef\` in the host element and the bootstrap Promise resolves with the \`ApplicationRef\`.
- Differences from \`bootstrapModule\`: no NgModule class or module injector; providers come from a plain array. In v22 both paths are zoneless by default.
- Version context: standalone APIs previewed in v14 and stable in v15; standalone by default in v19; zoneless by default in v21.

**Clarifying questions expected:**
- "Do you want the browser path only, or also how SSR passes a platform in?"
- "Should I cover change detection after bootstrap, or stop at the first render?"

**Code / implementation expected:** Optional — an instrumented \`appConfig\` that logs each bootstrap phase.`,
    answer: `**Target Audience:** Developers who can bootstrap an app and now want to explain what happens underneath, for senior interviews or for debugging startup problems.
**Difficulty:** Medium to Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. The sequence below was read from the installed Angular 22.2.3 source (<code>bootstrapApplication</code> in <code>@angular/platform-browser</code>, <code>internalCreateApplication</code> and <code>bootstrap</code> in <code>@angular/core</code>) and then confirmed by an instrumented app compiled with <code>ngc</code> and booted in jsdom. The title says 2025; the behaviour is described as of 22.2.3, with the version history in section 7.

This is the **internals** doc. For the practical how-to (which files, what goes in <code>appConfig</code>, common errors) see [how to bootstrap a standalone Angular application](/interview-question/how-do-you-bootstrap-a-standalone-angular-application).

## 1. Why This Even Matters — A Story First

A theatre opening night has a fixed order. The building has to exist and its power has to be on (that is shared by every show in the building). Then this show's crew sets up: lights, sound, props. Then the stage manager waits for the late delivery of costumes, because the curtain cannot go up without them. Only then does the curtain rise, the actors take their places, and the first scene plays. Finally, the front-of-house team is told "we are live".

<code>bootstrapApplication</code> follows the same order: the **platform** (the building, shared per page), the **application [injector](/interview-question/how-does-dependency-injection-work-in-angular)** (this show's crew), the **initializers** (waiting for the costumes), the **root component** and its first render (curtain up), and finally the **bootstrap listeners** ("we are live"). The [NgModule](/interview-question/what-are-components-and-modules-in-angular) used to be the crew's paperwork, and [standalone components](/interview-question/what-are-standalone-components) made it optional. Standalone bootstrapping keeps the order and drops the paperwork.

## 2. The Pieces

📌 **Interview term: Platform injector** — the top-level injector for the page, created by the first bootstrap and reused by later ones. Verified: a second <code>bootstrapApplication</code> call on the same page returned with <code>getPlatform()</code> unchanged (<code>same platform: true</code>).

📌 **Interview term: Environment injector (application injector)** — the injector built from your <code>ApplicationConfig.providers</code>. Its parent is the platform injector. Verified: <code>appRef.injector</code> is an <code>R3Injector</code> whose debug name is <code>Environment Injector</code>, whose parent is another <code>R3Injector</code> (the platform), whose parent is the <code>NullInjector</code>.

📌 **Interview term: ApplicationRef** — the object that owns the running app: its root views, <code>tick()</code>, <code>whenStable()</code> and <code>destroy()</code>. <code>bootstrapApplication</code> resolves with it.

📌 **Interview term: NoopNgZone / zoneless scheduler** — with no Zone.js integration, Angular uses a do-nothing <code>NgZone</code> and a scheduler that runs [change detection](/interview-question/how-does-change-detection-work-in-angular) when [signals](/interview-question/what-are-angular-signals), template events or [markForCheck()](/interview-question/what-does-changedetectorref-do) report a change. See [what NgZone is](/interview-question/what-is-ngzone-and-when-do-you-run-outside-angular) and [Zone.js and zoneless apps](/interview-question/what-is-zone-js-how-does-it-monkey-patch-browser-apis-and-how-do-you-build-a-zon).

## 3. The Sequence, From the Source

<svg class="iq-diagram" width="100%" viewBox="0 0 700 420" role="img" aria-label="bootstrapApplication creates the platform, the environment injector, runs initializers, bootstraps the root and fires listeners">
  <defs>
    <marker id="fi6-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="150" y="20" width="400" height="50" rx="10"/>
  <text class="d-text" x="350" y="51" text-anchor="middle">platform injector, created or reused</text>
  <rect class="d-box" x="150" y="100" width="400" height="50" rx="10"/>
  <text class="d-text" x="350" y="131" text-anchor="middle">environment injector from appConfig</text>
  <rect class="d-box" x="150" y="180" width="400" height="50" rx="10"/>
  <text class="d-text" x="350" y="211" text-anchor="middle">environment initializers, then app initializers</text>
  <rect class="d-box-accent" x="150" y="260" width="400" height="50" rx="10"/>
  <text class="d-text d-accent" x="350" y="291" text-anchor="middle">appRef.bootstrap(Root): create and render</text>
  <rect class="d-box" x="150" y="340" width="400" height="50" rx="10"/>
  <text class="d-text" x="350" y="371" text-anchor="middle">bootstrap listeners, promise resolves</text>
  <path class="d-edge-accent" d="M 350 74 L 350 94" marker-end="url(#fi6-arrow)"/>
  <path class="d-edge-accent" d="M 350 154 L 350 174" marker-end="url(#fi6-arrow)"/>
  <path class="d-edge-accent" d="M 350 234 L 350 254" marker-end="url(#fi6-arrow)"/>
  <path class="d-edge-accent" d="M 350 314 L 350 334" marker-end="url(#fi6-arrow)"/>
</svg>

The five boxes map onto real functions in the 22.2.3 source:

1. **<code>bootstrapApplication(root, options)</code>** (platform-browser) builds a config of <code>appProviders: [...BROWSER_MODULE_PROVIDERS, ...options.providers]</code> plus the browser platform providers. In [JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) mode it first resolves any <code>templateUrl</code>/<code>styleUrl</code> resources with <code>fetch</code>.
2. **<code>internalCreateApplication</code>** (core) creates or reuses the platform injector, asserts the root is standalone (that is where NG0907 comes from), and creates the environment injector from <code>[provideZonelessChangeDetectionInternal(), errorHandlerEnvironmentInitializer, ...appProviders]</code>. Zoneless is literally the first provider; your <code>provideZoneChangeDetection()</code>, later in the list, overrides it.
3. **<code>bootstrap()</code>** (core) gets the <code>NgZone</code>, calls <code>resolveInjectorInitializers()</code> (environment initializers run now), wires <code>NgZone.onError</code> to the error handler, then calls <code>ApplicationInitStatus.runInitializers()</code> and waits on its <code>donePromise</code>.
4. After the initializers resolve it sets the <code>LOCALE_ID</code>, then calls <code>appRef.bootstrap(rootComponent)</code>, which finds the host element by selector (that is where NG05104 comes from), creates the root component, attaches its view and runs change detection.
5. <code>bootstrap()</code> returns the <code>ApplicationRef</code>, which resolves the promise you awaited in <code>main.ts</code>.

## 4. Verified: the order, logged from inside

The example's <code>appConfig</code> registers an environment initializer, an async app initializer that injects a root service, and an <code>APP_BOOTSTRAP_LISTENER</code>. The root component logs its constructor, <code>ngOnInit</code> (see [constructor vs ngOnInit](/interview-question/what-is-the-difference-between-the-constructor-and-ngoninit)) and an <code>afterNextRender</code> callback. The log after booting:

\\\`\\\`\\\`
RENDERED: NoopNgZone
1. environment initializer (sync, while the injector is set up)
2. app initializer starts
3. Session service created (first inject)
4. app initializer resolves
5. root component constructor
6. root ngOnInit (first change detection)
7. afterNextRender: first render is in the DOM
8. bootstrap listener: root <app-root> attached
\\\`\\\`\\\`

- Steps 1 to 4 confirm the source reading: environment initializers first, then app initializers, and the root is not touched until the async one resolves.
- Step 3: a <code>providedIn: "root"</code> [service](/interview-question/what-is-a-service-and-why-use-it) is created lazily, on its first [inject()](/interview-question/inject-vs-constructor-injection-when-should-you-use-each), not when the injector is built (see [providing in root vs in a component](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component)).
- Steps 5 to 7 all happened inside <code>appRef.bootstrap()</code>: construction, the first change detection pass (<code>ngOnInit</code>), and the render hooks. See [afterRender and afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks).
- The rendered text <code>NoopNgZone</code> is the zone the root component injected: zoneless by default.

A second experiment awaited <code>bootstrapApplication</code> directly and logged when the promise settled: <code>Second ctor > Second ngOnInit > promise resolved</code>. So by the time your <code>main.ts</code> promise resolves, the first render has already happened.

## 5. Verified: zones, schedulers and the module path

| Bootstrap | <code>NgZone</code> | Change detection scheduler |
| :--- | :--- | :--- |
| <code>bootstrapApplication(Root)</code> | <code>NoopNgZone</code> | <code>_ChangeDetectionSchedulerImpl</code> |
| <code>bootstrapApplication(Root, { providers: [provideZoneChangeDetection()] })</code> | <code>_NgZone</code> | <code>_ChangeDetectionSchedulerImpl</code> |
| <code>platformBrowser().bootstrapModule(AppModule)</code> | <code>NoopNgZone</code> | (not inspected) |

The third row surprises people: in 22.2.3 the NgModule path is zoneless by default too, so "standalone means zoneless" is the wrong mental model. Zoneless is the default for every new bootstrap; Zone.js is the opt-in. Calling <code>bootstrapModule</code> after a standalone app was already running on the page failed with <code>NG0400: A platform with a different configuration has been created. Please destroy it first.</code>, because the two entry points configure the platform differently.

## 6. bootstrapModule vs bootstrapApplication

| | <code>bootstrapModule(AppModule)</code> | <code>bootstrapApplication(Root, config)</code> |
| :--- | :--- | :--- |
| Root described by | <code>@NgModule({ bootstrap: [Root] })</code> | The first argument |
| Providers from | Module <code>providers</code> + imported modules, collected transitively | A flat <code>providers</code> array |
| Injector | <code>NgModuleRef</code> with a module injector | Environment injector behind an internal module-ref adapter |
| Resolves with | <code>NgModuleRef</code> | <code>ApplicationRef</code> |
| Root must be | Declared in the module (<code>standalone: false</code>) | Standalone (NG0907 otherwise) |
| Zone by default (22.2.3) | <code>NoopNgZone</code> | <code>NoopNgZone</code> |
| Later views | <code>ngDoBootstrap(appRef)</code> | <code>createApplication()</code> then <code>appRef.bootstrap()</code> |

Both funnel into the same core <code>bootstrap()</code> function; the source branches on "application config or module ref" only at the edges.

## 7. "In 2025": How We Got Here

| Version | Change (sources: Angular blog and installed typings) |
| :--- | :--- |
| v14 (2022) | Standalone APIs including <code>bootstrapApplication</code> in developer preview |
| v15 | Standalone APIs stable; <code>provideHttpClient</code> and [functional interceptors](/interview-question/what-are-functional-http-interceptors-in-modern-angular-and-how-do-you-register-) arrive (<a href="https://blog.angular.dev/angular-v15-is-now-available-df7be7f2f4c8" target="_blank" rel="noopener noreferrer">Angular v15 announcement</a>) |
| v19 | <code>standalone</code> defaults to true; [<code>provideAppInitializer</code>](/interview-question/what-is-the-app-initializer-token-and-how-is-it-used-to-load-configuration-at-st) and <code>provideEnvironmentInitializer</code> added (the typings tag the latter <code>@publicApi 19.0</code>) and the old tokens deprecated |
| v20.2 | <code>provideZonelessChangeDetection()</code> stable (typings: <code>@publicApi 20.2</code>) |
| v21 | New apps zoneless by default |
| v22 | OnPush by default; fetch is the default HTTP backend |

So a 2025 answer (v19 to v21) and a 2026 answer (v22) describe the same bootstrap sequence; what changed is the defaults that the sequence installs.

## 8. Common Pitfalls

- **Expecting work in <code>ngOnInit</code> of the root to happen before initializers.** It never does: the root is constructed after every app initializer resolves.
- **Doing slow work in an environment initializer.** Environment initializers are synchronous and run during injector setup (also for each [lazy route](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) that has its own providers); an async result there is not awaited. Use <code>provideAppInitializer</code> for anything that must finish first.
- **Mixing <code>bootstrapModule</code> and <code>bootstrapApplication</code> on one page.** They configure the platform differently (NG0400 above). Pick one entry point.
- **Assuming the promise resolves before rendering.** Verified the other way round: the first render, <code>ngOnInit</code> and <code>afterNextRender</code> have all run by the time it resolves.
- **Relying on Zone.js implicitly after a migration.** Both bootstrap paths are zoneless by default in v22; add <code>provideZoneChangeDetection()</code> explicitly if old code needs it, and see [how change detection works](/interview-question/how-does-change-detection-work-in-angular).
- **Thinking providers are instantiated at bootstrap.** Most are lazy; a service is created on its first <code>inject()</code> (step 3 above).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Big picture:</strong> <span style="color:#f0e2c8;">"bootstrapApplication creates or reuses the platform injector, builds an environment injector from appConfig, runs initializers, then bootstraps the standalone root through ApplicationRef."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Injectors:</strong> <span style="color:#f0e2c8;">"The environment injector replaces the root module injector; its parent is the platform injector, and Angular prepends browser providers and the zoneless scheduler before mine."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">"Environment initializers run during injector setup, app initializers are awaited, and only then is the root constructed and change detection run once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Result:</strong> <span style="color:#f0e2c8;">"By the time the promise resolves with the ApplicationRef, the root has rendered and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> has fired; bootstrap listeners run at the end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versus modules:</strong> <span style="color:#f0e2c8;">"bootstrapModule goes through the same core bootstrap function with an NgModuleRef; in v22 both paths default to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoopNgZone</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the root component required to be standalone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because there is no module to supply its compilation context. A standalone component carries its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">imports</code>, so Angular can render it directly; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">internalCreateApplication</code> asserts this and throws NG0907 otherwise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between an environment initializer and an app initializer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An environment initializer runs synchronously when its injector is created, for any environment injector including lazy routes. An app initializer runs only at application bootstrap, and its returned Promise or Observable is awaited before the root is created. Verified: in a child environment injector, a registered environment initializer ran and an app initializer did not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Angular know when to run change detection without Zone.js?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The zoneless scheduler is notified by signal writes read in templates, template event listeners, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markForCheck()</code> and similar APIs, then schedules one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ApplicationRef.tick()</code>. Nothing patches setTimeout or fetch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does createApplication give you that bootstrapApplication does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The application environment without a root component: the same platform, environment injector and initializers, returning an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ApplicationRef</code> on which you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrap()</code> for components later. The typings describe it as decoupling environment creation from rendering, which suits custom elements or widgets mounted on demand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does SSR change this sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the server the platform is created per request and passed in through the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context</code> argument; the core code refuses to bootstrap on the server without it ("Missing Platform" error). The rest of the sequence is the same, ending in serialisation instead of a live app.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Platform injector** | Page-wide injector shared by every app on the page |
| **Environment injector** | The application injector built from <code>appConfig.providers</code> |
| **ApplicationRef** | Handle to the running app; resolves from the bootstrap promise |
| **Environment initializer** | Sync function run when an environment injector is created |
| **App initializer** | Possibly async function awaited before the root is created |
| **APP_BOOTSTRAP_LISTENER** | Callback run after a root component is bootstrapped |
| **NoopNgZone** | The do-nothing zone used by zoneless apps |
| **createApplication** | Creates the app environment without rendering a root |

---
**Conclusion:** Without NgModules, <code>bootstrapApplication</code> still does what a root module used to enable, just from a flat provider list: it reuses or creates the platform injector, builds an environment injector from <code>appConfig</code> with Angular's browser and zoneless providers in front, runs environment initializers, awaits app initializers, and then has <code>ApplicationRef</code> create and render the standalone root before bootstrap listeners fire and the promise resolves. The instrumented run on 22.2.3 printed exactly that order, showed <code>NoopNgZone</code> as the default, and showed that the NgModule path is zoneless by default too.`,
    examples: [
      {
        label: "Instrumented appConfig that logs every phase of bootstrapApplication",
        tech: "angular",
        runnable: false,
        code: `import {
  APP_BOOTSTRAP_LISTENER, ApplicationConfig, ApplicationRef, Component, ComponentRef, Injectable,
  NgZone, afterNextRender, inject, provideAppInitializer, provideEnvironmentInitializer,
} from "@angular/core";

// Every step of bootstrapApplication() writes here, so the order is visible.
export const steps: string[] = [];
const log = (s: string) => steps.push(\`\${steps.length + 1}. \${s}\`);

@Injectable({ providedIn: "root" })
export class Session {
  constructor() { log("Session service created (first inject)"); }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideEnvironmentInitializer(() => log("environment initializer (sync, while the injector is set up)")),
    provideAppInitializer(() => {
      log("app initializer starts");
      inject(Session);
      return new Promise<void>((done) => setTimeout(() => { log("app initializer resolves"); done(); }, 20));
    }),
    {
      provide: APP_BOOTSTRAP_LISTENER, multi: true,
      useValue: (ref: ComponentRef<unknown>) => log(\`bootstrap listener: root <\${ref.location.nativeElement.localName}> attached\`),
    },
  ],
};

@Component({ selector: "app-root", template: \`<p>{{ zone }}</p>\` })
export class AppComponent {
  zone = inject(NgZone).constructor.name; // which zone did a bare bootstrap pick?
  steps = steps;
  constructor() {
    log("root component constructor");
    afterNextRender(() => log("afterNextRender: first render is in the DOM"));
  }
  ngOnInit() { log("root ngOnInit (first change detection)"); }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you configure dynamic base href in Angular builds for different environments?",
    seoDescription:
      "Set Angular base href per environment with --base-href or angular.json configurations, or at deploy time with one build, plus APP_BASE_HREF for the router.",
    description: `**Question presented to candidate:**
"The same Angular app is deployed at / in production, at /staging/ on a shared host, and at /tenant-name/ for some customers. How do you make it work everywhere, ideally without a separate build per tenant?"

**What a strong answer should cover:**
- The **base href** is the \`<base href>\` tag in \`index.html\`; the browser resolves every relative URL (scripts, styles, assets) against it, and the router uses it as the app's root path.
- Build-time options: \`ng build --base-href /staging/\`, or a \`baseHref\` per **configuration** in \`angular.json\` (\`ng build -c production,staging\`).
- Only \`index.html\` changes; the JavaScript bundles are byte-identical, so **one build** can be deployed under many paths by rewriting the tag at deploy time.
- Runtime option for the router: provide \`APP_BASE_HREF\` (it wins over the DOM tag), but it does **not** change how the browser loads relative asset URLs.
- The value needs a **trailing slash**: \`/shop\` resolves \`main.js\` to \`/main.js\`.
- \`deployUrl\` is a different thing: it prefixes asset URLs (for a CDN) and leaves \`<base href>\` alone. The server must also fall back to \`index.html\` for deep links.

**Clarifying questions expected:**
- "Is the path known at build time, or only when the container starts or the request arrives?"
- "Are assets served from the same origin, or a CDN?"

**Code / implementation expected:** Yes — build configurations in angular.json, and an \`APP_BASE_HREF\` factory for a runtime path.`,
    answer: `**Target Audience:** Developers deploying Angular apps behind sub-paths, reverse proxies or multi-tenant hosts.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every <code>index.html</code> and bundle detail below comes from running [Angular CLI](/interview-question/what-does-the-angular-cli-provide) 22.2.3 builds on a fresh <code>ng new</code> app; the router behaviour was verified by booting the example in jsdom; URL resolution was checked with Node's WHATWG <code>URL</code>, which follows the same rules as browsers. A real browser on a real host was not used.

## 1. Why This Even Matters — A Story First

Imagine giving a friend directions that all start with "from the station, take the second left". Those directions only work if your friend starts at the right station. Move the party to another town and every direction is wrong, even though the directions themselves did not change.

A web page's relative URLs are those directions, and the **base href** is the station. <code>main-TK6HYCXX.js</code> means "the file called that, starting from the base". Deploy the same app under <code>/staging/</code> and leave the base at <code>/</code>, and the browser looks for <code>/main-TK6HYCXX.js</code>, gets a 404 or the wrong app, and you see a blank page.

So "configuring base href per environment" is really: make sure every deployment tells the browser (and the Angular router) which station to start from.

## 2. The Core Idea

📌 **Interview term: Base href** — the <code>&lt;base href="/"&gt;</code> tag in <code>index.html</code>. The browser resolves every relative URL in the document against it, and Angular's router reads it to know which part of the path belongs to the app.

📌 **Interview term: Build configuration** — a named set of option overrides in <code>angular.json</code> (<code>production</code>, <code>development</code>, or your own like <code>staging</code>). <code>ng build -c production,staging</code> applies them left to right.

📌 **Interview term: APP_BASE_HREF** — an [InjectionToken](/interview-question/what-is-an-injectiontoken) from <code>@angular/common</code> that overrides the base the router uses. Reading <code>PathLocationStrategy</code> in 22.2.3, the base is chosen as <code>APP_BASE_HREF ?? getBaseHrefFromDOM() ?? document.location.origin</code>: the token first, then the tag, then the page origin.

📌 **Interview term: deployUrl** — a build option that prefixes the URLs of the bundles and styles written into <code>index.html</code> (the CLI help: "only necessary for specific deployment scenarios, such as with Angular Elements or when utilizing different CDN locations"; Angular Elements are covered with the [customElements schema](/interview-question/what-is-the-customelements-schema-in-angular-and-when-do-you-need-to-use-it)). It does not change <code>&lt;base href&gt;</code>.

## 3. Verified: what the build actually writes

Each command below was run against the same app (each into its own output folder). Only the lines of the built <code>index.html</code> that differ are shown:

\\\`\\\`\\\`
ng build                               <base href="/">          <script src="main-TK6HYCXX.js" type="module">
ng build --base-href /shop/            <base href="/shop/">     <script src="main-TK6HYCXX.js" type="module">
ng build -c production,staging         <base href="/staging/">  <script src="main-TK6HYCXX.js" type="module">
ng build --base-href shop              <base href="shop">
ng build -c production,cdn             <base href="/">          <script src="https://cdn.example.com/app/main-TK6HYCXX.js" type="module">
\\\`\\\`\\\`

And the bundle itself across all five builds:

\\\`\\\`\\\`
a4ba4f701833dcf8dce931a7b6271cde  dist/cdn/browser/main-TK6HYCXX.js
a4ba4f701833dcf8dce931a7b6271cde  dist/demo/browser/main-TK6HYCXX.js
a4ba4f701833dcf8dce931a7b6271cde  dist/noslash/browser/main-TK6HYCXX.js
a4ba4f701833dcf8dce931a7b6271cde  dist/shop/browser/main-TK6HYCXX.js
a4ba4f701833dcf8dce931a7b6271cde  dist/staging/browser/main-TK6HYCXX.js
\\\`\\\`\\\`

Same file name, same MD5. **The base href lives only in <code>index.html</code>.** That single fact is what makes "build once, deploy anywhere" possible.

## 4. Verified: why the trailing slash matters

Resolving the bundle name against each base, for a user who deep-linked to <code>https://example.com/shop/orders/42</code>:

\\\`\\\`\\\`
"/shop/"  main.js -> /shop/main-TK6HYCXX.js
"/shop"   main.js -> /main-TK6HYCXX.js
"shop"    main.js -> /shop/orders/main-TK6HYCXX.js
"/"       main.js -> /main-TK6HYCXX.js
\\\`\\\`\\\`

<code>/shop</code> without the slash means "the file called shop in the root folder", so its siblings are in <code>/</code>. A relative <code>shop</code> depends on the current page, so it breaks on every deep link. Always use an absolute path with a trailing slash. Note that the CLI wrote <code>--base-href shop</code> into the file exactly as given, without a warning.

## 5. Three Strategies

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Build time base href, deploy time rewrite of one build, and runtime APP_BASE_HREF for the router">
  <rect class="d-box" x="20" y="30" width="200" height="240" rx="12"/>
  <text class="d-text" x="120" y="62" text-anchor="middle">Build time</text>
  <text class="d-sub" x="120" y="110" text-anchor="middle">one build per path</text>
  <text class="d-sub" x="120" y="140" text-anchor="middle">ng build -c staging</text>
  <text class="d-sub" x="120" y="170" text-anchor="middle">simple, slower CI</text>
  <rect class="d-box-accent" x="250" y="30" width="200" height="240" rx="12"/>
  <text class="d-text d-accent" x="350" y="62" text-anchor="middle">Deploy time</text>
  <text class="d-sub" x="350" y="110" text-anchor="middle">one build for all</text>
  <text class="d-sub" x="350" y="140" text-anchor="middle">rewrite the base tag</text>
  <text class="d-sub" x="350" y="170" text-anchor="middle">at start or per request</text>
  <rect class="d-box-muted" x="480" y="30" width="200" height="240" rx="12"/>
  <text class="d-text" x="580" y="62" text-anchor="middle">Runtime token</text>
  <text class="d-sub" x="580" y="110" text-anchor="middle">APP_BASE_HREF</text>
  <text class="d-sub" x="580" y="140" text-anchor="middle">router paths only</text>
  <text class="d-sub" x="580" y="170" text-anchor="middle">assets still use tag</text>
</svg>

Most teams combine them: one artefact, the base tag rewritten when the container starts or by the server per request, and <code>APP_BASE_HREF</code> only when the router must use a path the tag cannot express.

| | Build time | Deploy time rewrite | Runtime <code>APP_BASE_HREF</code> |
| :--- | :--- | :--- | :--- |
| How | <code>--base-href</code> or <code>baseHref</code> in a configuration | Replace <code>&lt;base href="/"&gt;</code> in <code>index.html</code> with sed, nginx <code>sub_filter</code> or the [SSR](/interview-question/what-is-angular-universal-ssr) server | <code>{ provide: APP_BASE_HREF, useFactory }</code> in <code>appConfig</code> |
| Builds needed | One per path | One | One |
| Affects asset URLs | Yes | Yes | **No**, the browser still uses the tag |
| Affects router | Yes | Yes | Yes, and wins over the tag |
| Good for | A few fixed environments | Many environments or tenants | Router-only differences, apps without a tag |

## 6. Verified: APP_BASE_HREF at runtime

The first example provides <code>APP_BASE_HREF</code> from a factory (a [useFactory provider](/interview-question/what-is-the-difference-between-useclass-usevalue-usefactory-and-useexisting)) that reads <code>window.__env.baseHref</code> (in a real deployment, a small <code>env.js</code> the server writes per environment, loaded before <code>main.js</code>). There is no <code>&lt;base&gt;</code> tag in the test page. After booting and clicking the link:

\\\`\\\`\\\`
RENDERED   : Ordersbase tag in DOM: noneexternal url for /orders: /tenant-42/orders
link href  : /tenant-42/orders
after click: Ordersorders pagebase tag in DOM: noneexternal url for /orders: /tenant-42/orders
location   : /tenant-42/orders
\\\`\\\`\\\`

The router built <code>/tenant-42/orders</code> for the <code>routerLink</code>, navigated there, and rendered the routed component (see [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)). A related check: with neither the token nor a tag, 22.2.3 did not throw, it fell back to the origin and rendered the link as <code>http://localhost/orders</code>.

What the token cannot do: the browser has already loaded <code>main.js</code> using the tag before any Angular code runs, and image or font URLs in templates and CSS are still resolved by the browser against the tag. So for sub-path deployments the tag must be right; the token is for the router.

## 7. The Server Side

Two things outside Angular decide whether this works, and neither can be verified from the build alone:

- **Deep-link fallback.** A request for <code>/staging/orders/42</code> must return <code>index.html</code>, not a 404. Verified locally only for the dev server: <code>ng serve</code> answered <code>/reports</code> with <code>200 text/html</code>. Production hosts (nginx <code>try_files</code>, a CDN rewrite rule, or the SSR server) need the same rule.
- **Caching.** Hashed bundles can be cached forever; <code>index.html</code> must not be, or a base tag change will not reach users.

For local development the dev server has its own <code>servePath</code> option ("The pathname where the application will be served", from the 22.2.3 dev-server schema), so you can rehearse a sub-path with <code>ng serve --serve-path /staging/</code> (the option was read from the schema; it was not exercised here).

## 8. Common Pitfalls

- **Missing trailing slash.** Verified above: <code>/shop</code> loads <code>/main.js</code>. Use <code>/shop/</code>.
- **Confusing <code>deployUrl</code> with <code>baseHref</code>.** <code>deployUrl</code> only prefixes asset URLs written by the build; routing and other relative URLs still follow the base tag.
- **Expecting <code>APP_BASE_HREF</code> to fix assets.** It changes the router only.
- **A build per tenant.** Since the JavaScript is identical, separate builds waste CI time and risk drift; rewrite <code>index.html</code> instead.
- **Absolute asset paths in templates.** <code>src="/assets/logo.png"</code> ignores the base href; use <code>assets/logo.png</code> or files from <code>public/</code> referenced relatively.
- **Caching <code>index.html</code> aggressively.** Users keep the old base tag. Serve it with <code>no-cache</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"The base href is the base tag in index.html; the browser resolves every relative URL against it and the router treats it as the app root."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Build time:</strong> <span style="color:#f0e2c8;">"For fixed environments I set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">baseHref</code> per configuration in angular.json, or pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--base-href /staging/</code>, always with a trailing slash."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Key fact:</strong> <span style="color:#f0e2c8;">"Only index.html changes; the bundles are byte-identical across base hrefs, so one build can serve every path if the deploy step rewrites the tag."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Runtime:</strong> <span style="color:#f0e2c8;">"If the router needs a path known only at runtime, I provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">APP_BASE_HREF</code> from a factory; it beats the tag, but it does not change how the browser loads assets."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Server:</strong> <span style="color:#f0e2c8;">"The host must fall back to index.html for deep links and must not cache index.html, otherwise a correct base tag never reaches users."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between baseHref and deployUrl?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">baseHref</code> writes the base tag, which affects every relative URL and the router. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deployUrl</code> only prefixes the bundle and stylesheet URLs the build writes, typically to load them from a CDN, and leaves the base tag at its value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rewrite the base tag at deploy time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the container entrypoint run something like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sed</code> over index.html with the environment's path, or use nginx <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub_filter</code>, or let the SSR server render the right tag per request. Because the bundles do not contain the base, nothing else needs to change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with no base tag at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In 22.2.3 the router's path strategy falls back to the page origin, so it still works at the root; under a sub-path, relative asset URLs and routes would both be wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the base href affect HttpClient calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Relative request URLs like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">api/orders</code> go to fetch as written, and the browser resolves them against the document base, so yes for those; absolute ones like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/api/orders</code> ignore it. Many teams use an absolute API base from runtime config for that reason.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you develop locally against a sub-path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng serve --serve-path /staging/</code> together with the matching base href, so the dev server, the tag and the router agree before you deploy.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Base href** | The base tag; the starting point for every relative URL |
| **Build configuration** | Named option overrides in angular.json, applied with <code>-c</code> |
| **--base-href** | Build flag that writes the base tag into index.html |
| **APP_BASE_HREF** | Token that overrides the router base at runtime |
| **deployUrl** | Prefix for the asset URLs written by the build, often a CDN |
| **Deep-link fallback** | Server rule that returns index.html for app routes |
| **servePath** | Dev-server option to serve the app under a sub-path |

---
**Conclusion:** The base href is just the base tag in <code>index.html</code>, and the CLI 22.2.3 builds proved that it is the only thing that changes: <code>--base-href</code> or a <code>baseHref</code> configuration rewrites that tag while <code>main-TK6HYCXX.js</code> keeps the same name and MD5 in every build. That makes the strongest answer "build once, rewrite the tag per environment at deploy time", always as an absolute path with a trailing slash, with <code>APP_BASE_HREF</code> reserved for router-only cases (it wins over the tag but cannot fix asset URLs) and a server that returns <code>index.html</code> for deep links.`,
    examples: [
      {
        label: "Runtime base path for the router with an APP_BASE_HREF factory",
        tech: "angular",
        runnable: false,
        code: `import { APP_BASE_HREF, Location, PlatformLocation } from "@angular/common";
import { ApplicationConfig, Component, inject } from "@angular/core";
import { provideRouter, RouterLink, RouterOutlet } from "@angular/router";

// Stand-in for a deploy-time env.js (loaded before main.js) that the server writes per environment:
//   window.__env = { baseHref: "/tenant-42/" };
(window as any).__env ??= { baseHref: "/tenant-42/" };

@Component({ selector: "app-orders", template: \`<p>orders page</p>\` })
export class OrdersComponent {}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([{ path: "orders", component: OrdersComponent }]),
    // Runtime base href for the router. Wins over the <base href> tag that ng build wrote.
    { provide: APP_BASE_HREF, useFactory: () => (window as any).__env?.baseHref ?? "/" },
  ],
};

@Component({
  selector: "app-root",
  imports: [RouterLink, RouterOutlet],
  template: \`
    <a routerLink="/orders">Orders</a>
    <router-outlet />
    <p>base tag in DOM: {{ domBase ?? "none" }}</p>
    <p>external url for /orders: {{ external }}</p>
  \`,
})
export class AppComponent {
  domBase = inject(PlatformLocation).getBaseHrefFromDOM();
  external = inject(Location).prepareExternalUrl("/orders");
}`,
      },
      {
        label: "angular.json build configurations for a staging base href and a CDN deploy URL",
        tech: "angular",
        runnable: false,
        code: `// angular.json (excerpt): projects.demo.architect.build.configurations
// Built with: ng build -c production,staging   and   ng build -c production,cdn
{
  "production": {
    "budgets": [
      { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
      { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
    ],
    "outputHashing": "all"
  },
  "staging": {
    "baseHref": "/staging/"
  },
  "cdn": {
    "deployUrl": "https://cdn.example.com/app/"
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How has the Angular build changed with esbuild + Vite (ng build / ng serve)?",
    seoDescription:
      "Angular's build moved from webpack to the esbuild-based application builder, with Vite behind ng serve. Real CLI 22 output for ng build, ng serve and HMR.",
    description: `**Question presented to candidate:**
"Our Angular app still uses the old webpack browser builder and a full rebuild takes minutes. What did the Angular team change in the build system, what do ng build and ng serve actually run today, and what would we have to change to migrate?"

**What a strong answer should cover:**
- The **application builder** (\`@angular/build:application\`) bundles with **esbuild**; it has been the default for new projects since v17 and replaced the webpack-based \`browser\` builder.
- \`ng serve\` uses \`@angular/build:dev-server\`: the same esbuild build in watch mode, served through **Vite**, which pre-bundles dependencies and handles reloads.
- It is still the full Angular compiler (AOT, type-checked templates), just wired into esbuild; bundles are ES modules with code splitting for lazy routes.
- Dev-server details: output stays in memory, template and style edits are hot-replaced ("Component update sent"), TypeScript edits reload the page.
- Migration: \`ng update\` offers a \`use-application-builder\` migration; option names change (\`main\` → \`browser\`), output moves to \`dist/<app>/browser\`, and webpack-specific config (custom webpack, some plugins) has no direct equivalent.
- \`@angular/build\` is a separate, lighter package that does not pull in webpack.

**Clarifying questions expected:**
- "Do we use a custom webpack config or webpack-only plugins today?"
- "Is SSR or prerendering part of the build?"

**Code / implementation expected:** Optional — the build/serve targets in angular.json, and real build output.`,
    answer: `**Target Audience:** Developers who know Angular apps but not the build tooling underneath the [CLI](/interview-question/what-does-the-angular-cli-provide); useful before an upgrade from webpack-era projects.
**Difficulty:** Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. All terminal output below was produced by running Angular CLI 22.2.3 on a fresh <code>ng new</code> app (one lazy route added) under Node 24: <code>ng build</code>, <code>ng build -c development</code>, and <code>ng serve</code> with live edits. The dev server was started for the experiment and stopped afterwards. Tool versions were read from the installed packages. Version history claims were checked with a web search and are cited.

## 1. Why This Even Matters — A Story First

Imagine a print shop that, for every small correction to a book, re-typesets every page by hand, binds the whole book again and only then lets you look at it. That was the webpack-era dev loop for big Angular apps: correct a typo, wait for the whole bundle.

The new shop has a machine that typesets thousands of pages a second (that is **esbuild**, written in Go), and a front desk that hands you just the page you corrected without rebinding anything (that is **Vite**, the development server). Same book, same author's style rules (the Angular compiler, see [how Ivy compiles templates](/interview-question/how-does-compilation-work-under-the-hood-in-ivy)), far shorter waits.

Interviewers ask about it because it changes what is in <code>angular.json</code>, what lands in <code>dist/</code>, and which old webpack tricks no longer apply.

## 2. The Core Idea

📌 **Interview term: Builder** — the program the CLI runs for a target in <code>angular.json</code> (<code>build</code>, <code>serve</code>, <code>test</code>). What <code>ng build</code> does is whatever that builder does.

📌 **Interview term: Application builder (<code>@angular/build:application</code>)** — the esbuild-based builder that compiles and bundles the browser app (and the server bundle when [SSR](/interview-question/what-is-angular-universal-ssr) is on). It became the default for new projects in v17 (sources: <a href="https://angularindepth.com/article/angular-17-update-control-flow-app-builder-migration/" target="_blank" rel="noopener noreferrer">Angular In Depth on the v17 update</a> and <a href="https://dev.to/this-is-angular/whats-new-in-angular-17-c81" target="_blank" rel="noopener noreferrer">This is Angular on v17</a>).

📌 **Interview term: esbuild** — a very fast bundler written in Go. The Angular compiler runs as an esbuild plugin, so templates are still compiled ahead of time and type-checked; esbuild does the bundling, splitting and minifying. See [AOT vs JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) for what the compiler step produces.

📌 **Interview term: Vite** — a development server that serves ES modules directly to the browser, pre-bundles dependencies once, and pushes updates over a websocket. In the Angular CLI, Vite is the **serving** layer of <code>ng serve</code>; the application itself is still built by the Angular esbuild pipeline.

📌 **Interview term: @angular/build** — the package that holds these builders. An Angular CLI commit from 2024 describes it as introduced "to house the esbuild/Vite-based build system", while <code>@angular-devkit/build-angular</code> keeps the webpack builders (source: <a href="https://github.com/angular/angular-cli/commit/2c9d7368fc30f3488152e35ac468db5f2a9432f2" target="_blank" rel="noopener noreferrer">angular-cli commit</a>). A CLI 22.2.3 project has <code>@angular-devkit/architect</code>, <code>core</code> and <code>schematics</code> in <code>node_modules</code>, but no <code>build-angular</code>.

## 3. What ng new Puts in angular.json

The example at the bottom is the real <code>architect</code> section from CLI 22.2.3. The essentials:

| Target | Builder | Notes |
| :--- | :--- | :--- |
| <code>build</code> | <code>@angular/build:application</code> | Entry is <code>"browser": "src/main.ts"</code>; production is the default configuration |
| <code>serve</code> | <code>@angular/build:dev-server</code> | Points at the <code>build</code> target; development is the default |
| <code>test</code> | <code>@angular/build:unit-test</code> | Vitest with jsdom (see [testing signal components](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025)) |

Installed underneath <code>@angular/build</code> 22.2.3: esbuild <code>0.28.2</code> and Vite <code>8.3.4</code>.

## 4. Verified: ng build

Production build (the default configuration) of the app with one lazy <code>loadComponent</code> route:

\\\`\\\`\\\`
Initial chunk files | Names         |  Raw size | Estimated transfer size
chunk-S3U33YV6.js   | -             | 112.06 kB |                33.81 kB
main-BWTM5UBG.js    | main          | 106.73 kB |                27.43 kB
styles-5INURTSO.css | styles        |   0 bytes |                 0 bytes

                    | Initial total | 218.79 kB |                61.24 kB

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-3ELF35H5.js   | reports       | 297 bytes |               297 bytes

Application bundle generation complete. [2.244 seconds]
\\\`\\\`\\\`

And <code>ng build -c development</code> (no minification, source maps on):

\\\`\\\`\\\`
Initial chunk files | Names         |  Raw size
chunk-IUQZ3ZRT.js   | -             | 922.80 kB |
main.js             | main          | 477.10 kB |
styles.css          | styles        |  95 bytes |
                    | Initial total |   1.40 MB
Lazy chunk files    | Names         |  Raw size
chunk-6QUS7PBL.js   | reports       |   1.19 kB |
Application bundle generation complete. [2.565 seconds]
\\\`\\\`\\\`

What to notice:

- **Content-hashed ES modules.** Production files carry hashes (<code>outputHashing: "all"</code>) and <code>index.html</code> loads <code>&lt;script src="main-....js" type="module"&gt;</code>. Output goes to <code>dist/demo/browser/</code>, the <code>browser</code> folder leaving room for a <code>server</code> one with SSR.
- **Code splitting by dynamic import.** The <code>loadComponent: () =&gt; import("./reports")</code> route became its own lazy chunk, and the shared Angular code moved into a common chunk (see [routing and lazy loading](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) and [route preloading](/interview-question/how-do-you-optimize-initial-bundle-size-using-route-preloading-with-custom-strat)).
- **Budgets still apply.** The <code>budgets</code> in the production configuration are checked on every build; a JIT experiment in the AOT doc broke the 1 MB error budget and failed the build.
- **Seconds, not minutes.** A cold first build of the empty app took 3.15 s; later builds about 2.2 to 2.6 s. That is a tiny app, so treat it as an illustration, not a benchmark.

## 5. Verified: ng serve

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="ng serve runs the esbuild application build in watch mode in memory and serves it through Vite to the browser">
  <defs>
    <marker id="fi8-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="90" rx="12"/>
  <text class="d-text" x="110" y="78" text-anchor="middle">src files</text>
  <text class="d-sub" x="110" y="104" text-anchor="middle">watched</text>
  <rect class="d-box-accent" x="260" y="40" width="190" height="90" rx="12"/>
  <text class="d-text d-accent" x="355" y="78" text-anchor="middle">esbuild + ngc</text>
  <text class="d-sub" x="355" y="104" text-anchor="middle">output in memory</text>
  <rect class="d-box" x="510" y="40" width="170" height="90" rx="12"/>
  <text class="d-text" x="595" y="78" text-anchor="middle">Vite server</text>
  <text class="d-sub" x="595" y="104" text-anchor="middle">deps prebundled</text>
  <rect class="d-box-muted" x="510" y="190" width="170" height="70" rx="12"/>
  <text class="d-text" x="595" y="230" text-anchor="middle">browser</text>
  <path class="d-edge-accent" d="M 204 85 L 254 85" marker-end="url(#fi8-arrow)"/>
  <path class="d-edge-accent" d="M 454 85 L 504 85" marker-end="url(#fi8-arrow)"/>
  <path class="d-edge-accent" d="M 595 134 L 595 184" marker-end="url(#fi8-arrow)"/>
  <path class="d-edge-dashed" d="M 504 225 L 360 225 L 360 136" marker-end="url(#fi8-arrow)"/>
  <text class="d-sub" x="430" y="250" text-anchor="middle">edit, rebuild</text>
</svg>

<code>ng serve</code> runs the same application build in watch mode, keeps the result in memory, and lets Vite serve it, together with Angular and other dependencies that Vite pre-bundles once into a cache. The startup output on 22.2.3:

\\\`\\\`\\\`
Initial chunk files | Names         | Raw size
main.js             | main          | 48.13 kB |
styles.css          | styles        | 95 bytes |
                    | Initial total | 48.23 kB
Lazy chunk files    | Names         | Raw size
chunk-RJDEIPKF.js   | reports       |  1.70 kB |

Application bundle generation complete. [1.798 seconds]

Watch mode enabled. Watching for file changes...
NOTE: Raw file sizes do not reflect development server per-request transformations.
  ➜  Local:   http://localhost:4312/
\\\`\\\`\\\`

Facts checked against the running server:

- **Dependencies are served separately.** <code>main.js</code> is only 48 kB because Angular itself is not in it: the served <code>main.js</code> imports [<code>bootstrapApplication</code>](/interview-question/how-do-you-bootstrap-a-standalone-angular-application) from <code>.angular/cache/22.2.3/demo/vite/deps/@angular_platform-browser.js</code>, Vite's pre-bundled copy, and the served <code>index.html</code> gains <code>&lt;script type="module" src="/@vite/client"&gt;</code>.
- **Nothing is written to disk.** With <code>dist/</code> deleted beforehand, it did not exist after the server had built and served the app.
- **Deep links work.** <code>GET /reports</code> answered <code>200 text/html</code> (the index page), so client-side routes survive a refresh.
- **Edits are incremental.** Three edits while it ran:

| Edit | Rebuild time | What the server did |
| :--- | :--- | :--- |
| Template (<code>app.html</code>) | 0.260 s | <code>Component update sent to client(s).</code> (hot replacement, no page reload) |
| A comment in <code>app.config.ts</code> | 0.098 s | <code>No output file changes.</code> |
| A value in <code>app.ts</code> | 1.167 s | <code>Page reload sent to client(s).</code> |

Whether the browser state really survived the template update was not observed (no real browser was attached); the server messages are what was verified.

## 6. Webpack Builder vs Application Builder

| | <code>@angular-devkit/build-angular:browser</code> (webpack, older projects) | <code>@angular/build:application</code> (esbuild, read from its 22.2.3 schema) |
| :--- | :--- | :--- |
| Bundler | webpack | esbuild |
| Dev server | webpack-dev-server | Vite, fed by the esbuild build |
| Entry option | <code>main</code> | <code>browser</code> |
| Output | <code>dist/app/</code> | <code>dist/app/browser/</code> (+ <code>server/</code> for SSR) |
| SSR and prerender | Separate builders | Options of the same builder (<code>ssr</code>, <code>prerender</code>, <code>server</code>, <code>outputMode</code>) |
| Custom bundler config | Custom webpack config via third-party builders | Not supported; esbuild plugins via community builders |
| Package | <code>@angular-devkit/build-angular</code> (pulls in webpack) | <code>@angular/build</code> |

## 7. Migrating an Older Project

1. Run <code>ng update @angular/cli --name use-application-builder</code> (the migration named in the v17 update guides cited above); per the Angular docs it also switches to the lighter <code>@angular/build</code> package when nothing else needs <code>build-angular</code>.
2. Check the renamed options (<code>main</code> to <code>browser</code>; <code>polyfills</code> is an array in the 22.2.3 schema) and the new output folder in your deploy scripts.
3. Replace webpack-only features: custom webpack configs, <code>require.context</code>, webpack loaders. Most have esbuild or Vite equivalents, some need a different approach.
4. Run <code>ng build</code> and <code>ng serve</code> and compare bundle sizes and budgets.

## 8. Common Pitfalls

- **Deploy scripts still copying <code>dist/app/*</code>.** The browser files are now in <code>dist/app/browser/</code>; copying the parent folder publishes a nested directory and a 404 at the root.
- **Reading dev-server sizes as production sizes.** The 48 kB <code>main.js</code> from <code>ng serve</code> excludes dependencies; only <code>ng build</code> numbers mean anything for users.
- **Expecting a <code>dist/</code> folder during <code>ng serve</code>.** Verified: none is written. Use <code>ng build --watch</code> if another tool needs files on disk.
- **Assuming "Vite" means Vite plugins work.** The 22.2.3 dev-server schema has no option for a Vite config or Vite plugins (its options are things like <code>port</code>, <code>proxyConfig</code>, <code>hmr</code>, <code>prebundle</code>); the app build is Angular's esbuild pipeline.
- **Clearing caches blindly.** <code>.angular/cache</code> holds the compiler cache and Vite's pre-bundled dependencies; deleting it is a fix for stale dependency bundles, not a routine step.
- **Calling it "no more AOT".** Templates are still compiled and type-checked by the Angular compiler; only the bundler changed. See [how Ivy compilation works](/interview-question/how-does-compilation-work-under-the-hood-in-ivy).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Since v17 new projects build with the application builder, which runs the Angular compiler inside esbuild instead of webpack, and ng serve serves that build through Vite."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ng build:</strong> <span style="color:#f0e2c8;">"It produces content-hashed ES modules in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist/app/browser</code>, splits lazy routes into their own chunks, and still enforces budgets; in v22 an empty app builds in a couple of seconds."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. ng serve:</strong> <span style="color:#f0e2c8;">"It is the same build in watch mode kept in memory; Vite pre-bundles dependencies and pushes updates, so a template edit is a hot component update and a TypeScript edit reloads the page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What did not change:</strong> <span style="color:#f0e2c8;">"AOT compilation and strict template type-checking are the same Angular compiler; only bundling and serving moved."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Migration:</strong> <span style="color:#f0e2c8;">"The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use-application-builder</code> migration updates angular.json; the real work is deploy paths, renamed options and anything that depended on custom webpack config."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Angular now "built with Vite"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not exactly. Vite is the dev server layer; the application is built by Angular's esbuild-based pipeline in both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng build</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng serve</code>, and there is no user-facing Vite config.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is esbuild so much faster than webpack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is written in Go, runs in parallel across cores and does parsing, transforming and bundling in a few passes with little JavaScript overhead. The Angular compiler step still costs time, which is why incremental rebuilds and caching matter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a custom webpack config when migrating?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no equivalent in the application builder. You replace each use: environment values with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">define</code> or file replacements, loaders with esbuild-supported formats, or stay on the webpack builder until you can.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do lazy routes end up as separate files?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadComponent</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadChildren</code> use dynamic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code>, and esbuild splits every dynamic import into its own chunk, with shared code moved to common chunks. The verified build showed a 297-byte reports chunk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does SSR fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the same builder: enabling the server options produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">server</code> output next to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">browser</code>, and prerendering is an option of the build rather than a separate builder. See the SSR question for the runtime side.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Builder** | The program the CLI runs for a target in angular.json |
| **Application builder** | <code>@angular/build:application</code>, the esbuild-based build |
| **Dev-server builder** | <code>@angular/build:dev-server</code>, the build in watch mode plus Vite |
| **esbuild** | Fast Go bundler that does the bundling and minifying |
| **Vite** | Dev server that serves modules and pushes updates |
| **Pre-bundling** | Vite bundling dependencies once into a cache |
| **Hot component update** | Replacing a changed template or style without a full reload |
| **Budgets** | Size limits checked on every production build |

---
**Conclusion:** The Angular build kept its compiler and swapped its engine: the application builder runs AOT compilation inside esbuild, producing hashed, code-split ES modules, and <code>ng serve</code> runs that same build in watch mode in memory behind a Vite server that pre-bundles dependencies. Verified on CLI 22.2.3, a production build of a fresh app with one lazy route took about two seconds (218.79 kB initial, 61.24 kB transfer, a 297-byte lazy chunk), the dev server wrote nothing to disk, and edits produced a hot component update for a template change and a page reload for a TypeScript change.`,
    examples: [
      {
        label: "The build, serve and test targets that ng new generates (angular.json excerpt, CLI 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `// angular.json (excerpt) generated by ng new on CLI 22.2.3: projects.demo.architect
{
  "build": {
    "builder": "@angular/build:application",
    "options": {
      "browser": "src/main.ts",
      "tsConfig": "tsconfig.app.json",
      "assets": [
        {
          "glob": "**/*",
          "input": "public"
        }
      ],
      "styles": [
        "src/styles.css"
      ]
    },
    "configurations": {
      "production": {
        "budgets": [
          {
            "type": "initial",
            "maximumWarning": "500kB",
            "maximumError": "1MB"
          },
          {
            "type": "anyComponentStyle",
            "maximumWarning": "4kB",
            "maximumError": "8kB"
          }
        ],
        "outputHashing": "all"
      },
      "development": {
        "optimization": false,
        "extractLicenses": false,
        "sourceMap": true
      }
    },
    "defaultConfiguration": "production"
  },
  "serve": {
    "builder": "@angular/build:dev-server",
    "configurations": {
      "production": {
        "buildTarget": "demo:build:production"
      },
      "development": {
        "buildTarget": "demo:build:development"
      }
    },
    "defaultConfiguration": "development"
  },
  "test": {
    "builder": "@angular/build:unit-test"
  }
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between AOT and JIT compilation?",
    seoDescription:
      "AOT compiles Angular templates at build time; JIT compiles them in the browser. Real v22 numbers: bundle size, template errors and signal inputs.",
    description: `**Question presented to candidate:**
"Angular templates are not JavaScript, yet the browser runs them. Explain the difference between AOT and JIT compilation, which one a production build uses, and what would concretely get worse if we switched to JIT."

**What a strong answer should cover:**
- Both turn templates and decorators into JavaScript **instructions**; the difference is **when**: at build time (AOT, Ahead-of-Time) or in the browser at startup (JIT, Just-in-Time).
- AOT is the **default** for \`ng build\` and \`ng serve\` (\`aot\` defaults to true); JIT ships \`@angular/compiler\` to the browser.
- AOT gives **smaller bundles**, **faster startup** (no compile step in the browser) and **build-time errors**: template type-checking and syntax errors fail the build instead of a user's session.
- AOT is required for modern APIs: signal \`input()\`, \`model()\` and signal queries rely on the compiler; plain JIT cannot see them.
- JIT still appears in tests and tooling (for example \`TestBed\` compiling components, or partially compiled libraries without the linker).
- AOT is also safer: no runtime template compilation means no \`eval\`-style template injection.

**Clarifying questions expected:**
- "Production builds only, or also tests and the dev server?"
- "Should I go into what the compiled output looks like?"

**Code / implementation expected:** Optional — the same component compiled both ways, or a template error that only AOT catches.`,
    answer: `**Target Audience:** Anyone preparing for an Angular interview who has heard "AOT" and "JIT" but could not say what concretely differs.
**Difficulty:** Easy to Medium

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every number and error below was produced on Angular 22.2.3: bundle sizes by running [CLI](/interview-question/what-does-the-angular-cli-provide) 22.2.3 <code>ng build</code> with and without <code>--aot=false</code> on the same app; template behaviour by running each example through <code>ngc</code> plus jsdom (AOT) and through a plain TypeScript transpile plus runtime compilation (JIT), which is how the site playground runs code.

## 1. Why This Even Matters — A Story First

Two ways to serve a foreign film. In the first, the distributor translates the subtitles before release: a professional checks every line, mistakes are caught in the studio, and the cinema just plays the finished film. In the second, the film ships with the raw script and a translator sits in every cinema, translating live at each screening. It works, but every screening starts late, every cinema must pay for a translator, and a mistranslation is discovered by the audience.

Angular templates are the foreign language: HTML with Angular syntax that browsers do not understand. **AOT** translates them at build time. **JIT** ships the translator (the Angular compiler) to every user's browser and translates on startup.

## 2. The Core Idea

📌 **Interview term: Template compilation** — turning <code>@Component</code> metadata and its template into a JavaScript definition (<code>ɵcmp</code>) whose <code>template</code> function is a list of Ivy instructions such as <code>ɵɵelementStart</code> and <code>ɵɵtextInterpolate</code>. Both AOT and JIT produce this; see [how Ivy compilation works](/interview-question/how-does-compilation-work-under-the-hood-in-ivy) for the instructions themselves.

📌 **Interview term: AOT (Ahead-of-Time)** — the compiler (<code>ngc</code>, run inside the CLI build) generates the definitions at build time and writes them into the bundle. The browser never sees a raw template.

📌 **Interview term: JIT (Just-in-Time)** — the decorators stay in the code, and the first time Angular needs a component's definition it calls <code>@angular/compiler</code> in the browser to parse the template and generate the function on the spot.

📌 **Interview term: Template type-checking** — with <code>strictTemplates</code>, the AOT compiler type-checks every binding against the component class, like TypeScript does for <code>.ts</code> files. JIT has no type information at runtime, so it cannot do this. That includes calls to [signals](/interview-question/what-are-angular-signals) in templates, which AOT checks like any other function call.

## 3. Verified: the same component, both ways

The runnable example below was compiled both ways and inspected: is <code>PriceTagComponent.ɵcmp</code> a precompiled static field or a getter, and what is its template function?

\\\`\\\`\\\`
AOT (ngc):
ɵcmp is a static field (precompiled)
function PriceTagComponent_Template(rf, ctx) {
    if (rf & 1) {
      ɵɵdomElementStart(0, "span");
      ɵɵtext(1);
      ɵɵdomElementEnd();
    }
    if (rf & 2) {
      ɵɵadvance();
      ɵɵtextInterpolate2("", ctx.label, ": ", ctx.prices.format(ctx.amount));
    }
  }

JIT (runtime compile):
ɵcmp is a getter (compiled on first access)
function PriceTagComponent_Template(rf, ctx) {
  if (rf & 1) {
    jit___domElementStart_2(0,'span');
    jit___text_3(1);
    jit___domElementEnd_4();
  }
  if (rf & 2) {
    jit___advance_5();
    jit___textInterpolate2_6('',ctx.label,': ',ctx.prices.format(ctx.amount));
  }
}
\\\`\\\`\\\`

(The AOT source printed its <code>ɵ</code> characters as <code>\\u0275</code> escapes; they are shown decoded here.) The two functions contain **the same instructions**. JIT is not a different renderer; it is the same compiler running later, in the browser, with its output bound to generated local names. Both builds rendered <code>Basic: $9.00Pro: $29.00Raise Pro</code> and <code>Pro: $39.00</code> after the click.

## 4. Verified: what JIT costs in a real build

The same CLI 22.2.3 app (one lazy route) built twice:

\\\`\\\`\\\`
ng build (AOT, the default)
Initial chunk files   | Names         |  Raw size | Estimated transfer size
chunk-S3U33YV6.js     | -             | 112.06 kB |                33.81 kB
main-BWTM5UBG.js      | main          | 106.73 kB |                27.43 kB
                      | Initial total | 218.79 kB |                61.24 kB

ng build --aot=false (JIT)
Initial chunk files   | Names         |  Raw size | Estimated transfer size
polyfills-C4PSMUUR.js | polyfills     | 521.63 kB |               114.12 kB
chunk-V3CIUA3X.js     | -             | 357.37 kB |               101.93 kB
main-WVYOR6JK.js      | main          | 218.18 kB |                50.56 kB
                      | Initial total |   1.10 MB |               266.62 kB
Application bundle generation failed.
[ERROR] bundle initial exceeded maximum budget. Budget 1.00 MB was not met by 97.18 kB with a total of 1.10 MB.
\\\`\\\`\\\`

JIT made the initial download about **4.4 times larger** (266.62 kB versus 61.24 kB transferred) and broke the default production budget. Most of the difference is the compiler itself: bundling <code>@angular/compiler</code> on its own with esbuild (the bundler behind [ng build](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve)) and minifying it gave <code>509.8 kB min, 133.0 kB gzip</code>. The AOT bundle contains no compiler: a search of the AOT output for the compiler's template-parsing functions found nothing. On top of the bytes, JIT also spends CPU at startup compiling every component the first screen uses.

## 5. Verified: errors at build time versus in the user's browser

| Mistake in the template | AOT (<code>ngc</code>, strict templates) | JIT |
| :--- | :--- | :--- |
| Typo <code>{{ user.nmae }}</code> | Build fails: <code>TS2339: Property 'nmae' does not exist on type '{ name: string; }'.</code> | Renders <code>Hello !</code> with no error at all |
| Syntax error <code>{{ count + }}</code> | Build fails: <code>NG5002: Parser Error: Unexpected end of expression: count +</code> | Fails when the app boots: <code>Errors during JIT compilation of template for AppComponent: Parser Error: Unexpected end of expression</code> |

The typo row is the strongest argument for AOT: JIT silently renders wrong output, and the bug reaches users. For more on how bindings are checked, see [the types of data binding](/interview-question/what-are-the-types-of-data-binding-in-angular).

## 6. Verified: modern APIs need the compiler

The second example uses a signal input, <code>amount = input.required&lt;number&gt;()</code> (see [signal inputs vs @Input](/interview-question/signal-inputs-input-vs-input-what-changes-in-angular-17-1)):

\\\`\\\`\\\`
AOT : RENDERED: Pro: USD 29
JIT : NG0303: Can't bind to 'amount' since it isn't a known property of 'price-tag' (used in the 'AppComponent' component template).
      ERROR RuntimeError: NG0950: Input is required but no value is available yet.
\\\`\\\`\\\`

<code>input()</code> is just a function call in a class field. The AOT compiler recognises it and records it in the definition (the compiled output lists <code>inputs: { label: [1, "label"], amount: [1, "amount"] }</code>, where <code>1</code> is the <code>InputFlags.SignalBased</code> flag). A plain JIT setup has no compiler pass over the TypeScript, so the input is never registered. The same applies to [output()](/interview-question/output-vs-output-eventemitter-the-new-signal-outputs), [model()](/interview-question/what-is-model-two-way-signal-binding-with-model-inputs) and [signal queries](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed).

A related JIT limit showed up with **constructor injection**: a class with <code>constructor(private tenant: TenantService)</code> worked under <code>ngc</code>, but under a plain transpile failed with <code>NG0202: This constructor is not compatible with Angular Dependency Injection because its dependency at index 0 of the parameter list is invalid.</code> The compiler normally records parameter types; without it they are gone. <code>inject()</code> has no such dependency, which is one reason it works everywhere, and the [injector](/interview-question/how-does-dependency-injection-work-in-angular) never needs reflected types (see [constructor DI vs inject()](/interview-question/what-is-the-difference-between-constructor-based-di-and-the-inject-function)).

## 7. Side by Side

| | AOT | JIT |
| :--- | :--- | :--- |
| When templates compile | At build time | In the browser, on first use |
| Compiler shipped to users | No | Yes (about 133 kB gzip on its own) |
| Startup | Render immediately | Compile, then render |
| Template type errors | Fail the build | Not detected |
| Template syntax errors | Fail the build | Fail at runtime |
| Signal inputs, model(), signal queries | Supported | Not with plain JIT |
| Default for <code>ng build</code> / <code>ng serve</code> | Yes (<code>aot</code> defaults to true in the 22.2.3 builder schema) | Only with <code>--aot=false</code> |
| Where you still meet it | | Some test setups, playgrounds, partially compiled libraries without the linker |
| Security | No runtime template compiler | Templates compiled from strings at runtime |

## 8. Where JIT Still Exists

- **Playgrounds and quick demos** that transpile TypeScript without the Angular compiler, like this site's runnable examples. That is why examples here that use <code>input()</code> are marked not runnable.
- **Libraries.** Published libraries are compiled in **partial** mode and finished by the Angular linker during your build. Without the linker they fall back to JIT; with neither, you get the error verified in [the Ivy doc](/interview-question/how-does-compilation-work-under-the-hood-in-ivy): <code>The injectable '_PlatformLocation' needs to be compiled using the JIT compiler, but '@angular/compiler' is not available.</code>
- **Dynamic templates from strings.** Compiling a template that only exists at runtime needs JIT and is almost always a design smell; [creating components dynamically](/interview-question/how-do-you-dynamically-create-components) from known classes needs no compiler.

## 9. Common Pitfalls

- **Saying AOT and JIT produce different renderers.** Verified above: the instructions are identical; only the timing and the tooling around it differ.
- **Turning off AOT to "fix" a build error.** The error is usually a real template bug that JIT would hide (like the <code>nmae</code> typo).
- **Testing in JIT and shipping AOT.** A test setup without the Angular compiler can pass while the AOT build fails, or fail on signal inputs that work in production. Use the CLI test builder, which compiles like the app does.
- **Shipping <code>import "@angular/compiler"</code> in <code>main.ts</code>.** It drags the compiler into the bundle even when everything is AOT compiled.
- **Assuming JIT is needed for lazy loading.** [Lazy routes](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) load AOT-compiled chunks; no runtime compilation is involved.
- **Ignoring library build mode.** Libraries are published in partial compilation mode so the linker can finish them inside each app's build (see the partial output in the [Ivy doc](/interview-question/how-does-compilation-work-under-the-hood-in-ivy)); full-mode output is tied to the exact Angular version that produced it.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Both turn templates into JavaScript instructions; AOT does it at build time with ngc, JIT does it in the browser on first use with the Angular compiler."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The default:</strong> <span style="color:#f0e2c8;">"ng build and ng serve use AOT; aot defaults to true, and JIT only happens if you turn it off or bypass the CLI compiler."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Size and speed:</strong> <span style="color:#f0e2c8;">"On v22 a JIT build of the same app was about 4.4 times bigger to download, 266 kB versus 61 kB, because the compiler ships too, and it compiles before rendering."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Correctness:</strong> <span style="color:#f0e2c8;">"AOT type-checks templates, so a typo like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user.nmae</code> fails the build; under JIT it silently rendered an empty value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern APIs:</strong> <span style="color:#f0e2c8;">"Signal inputs, model() and signal queries need the compiler; under plain JIT a signal input fails with NG0303 and NG0950."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the JIT output slower once it is compiled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the generated instructions were the same in the verified comparison. The cost is the download of the compiler and the compile time before the first render, not the steady-state rendering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can JIT not type-check templates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Type information only exists at build time in TypeScript. In the browser the class is plain JavaScript, so the runtime compiler can parse the template but cannot know that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user</code> has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nmae</code> property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When was AOT made the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In v9, together with Ivy becoming the default engine, AOT became the default for builds, the dev server and tests (per the v9 release coverage). View Engine was removed in v13, and today the builder schema simply has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aot</code> defaulting to true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do unit tests use AOT?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the runner. The CLI 22.2.3 unit-test builder runs the specs through the application-builder pipeline with the build target options (read from its Vitest runner source), so components are compiled like the app. Hand-rolled setups that only transpile TypeScript behave like JIT and hit the signal input limits shown above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is AOT a security feature?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partly. With AOT there is no template compiler in the browser, so an attacker cannot get a string compiled as an Angular template. Angular also sanitises bound values in both modes; see the DomSanitizer question.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **AOT** | Templates compiled at build time; no compiler in the bundle |
| **JIT** | Templates compiled in the browser when first used |
| **ngc** | The Angular compiler CLI that the build runs |
| **ɵcmp** | The compiled component definition holding the template function |
| **strictTemplates** | Type-checks every template binding at build time |
| **Partial compilation** | Library format finished by the linker in the app build |
| **Linker** | Build step that turns partial declarations into final definitions |
| **Budget** | Bundle size limit that fails the build when exceeded |

---
**Conclusion:** AOT and JIT run the same Angular compiler and produce the same Ivy instructions; AOT does it once at build time, JIT ships the compiler and does it in every user's browser. Measured on 22.2.3, that made a JIT build of the same app 266.62 kB to download instead of 61.24 kB and broke the production budget, let a template typo render silently instead of failing the build, and broke signal inputs entirely. That is why AOT is the default for <code>ng build</code> and <code>ng serve</code>, and why JIT survives only in playgrounds, some test setups and unlinked libraries.`,
    examples: [
      {
        label: "Decorator inputs and inject(): identical behaviour under AOT and JIT",
        tech: "angular",
        runnable: true,
        code: `import { Component, Injectable, Input, inject } from "@angular/core";

@Injectable({ providedIn: "root" })
export class PriceService {
  format(n: number) { return \`$\${n.toFixed(2)}\`; }
}

// Decorator input + inject(): this file behaves the same under AOT (ng build) and JIT.
@Component({
  selector: "price-tag",
  template: \`<span>{{ label }}: {{ prices.format(amount) }}</span>\`,
})
export class PriceTagComponent {
  @Input() label = "";
  @Input() amount = 0;
  prices = inject(PriceService); // inject() needs no type metadata, unlike constructor(private p: PriceService)
}

@Component({
  selector: "app-root",
  imports: [PriceTagComponent],
  template: \`
    <price-tag label="Basic" [amount]="9" />
    <price-tag label="Pro" [amount]="pro" />
    <button (click)="pro = pro + 10">Raise Pro</button>
  \`,
})
export class AppComponent {
  pro = 29;
}`,
      },
      {
        label: "A signal input: works with the Angular compiler (AOT), fails under plain JIT",
        tech: "angular",
        runnable: false,
        code: `import { Component, input } from "@angular/core";

// Signal input: input() is recognised by the Angular compiler (AOT), not by plain JIT.
@Component({
  selector: "price-tag",
  template: \`<span>{{ label() }}: USD {{ amount() }}</span>\`,
})
export class PriceTagComponent {
  label = input("");
  amount = input.required<number>();
}

@Component({
  selector: "app-root",
  imports: [PriceTagComponent],
  template: \`<price-tag label="Pro" [amount]="29" />\`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does compilation work under the hood in Ivy?",
    seoDescription:
      "What Ivy compiles a component into: ɵcmp, template functions with create and update passes, locality, partial output and the linker, from real ngc.",
    description: `**Question presented to candidate:**
"Take a small component with an interpolation, a click handler, an @if and an @for. What does the Angular compiler turn it into, how does the runtime use that output to render and update the DOM, and why did Ivy make libraries and tree-shaking work better than before?"

**What a strong answer should cover:**
- The compiler adds **static definitions** to each class: \`ɵfac\` (a factory) and \`ɵcmp\` (via \`ɵɵdefineComponent\`) with selectors, inputs, \`decls\`, \`vars\`, \`consts\` and a **template function**.
- The template function takes \`(rf, ctx)\`: the **create pass** (\`rf & 1\`) builds DOM once with instructions like \`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵlistener\`; the **update pass** (\`rf & 2\`) re-evaluates bindings with \`ɵɵadvance\`, \`ɵɵtextInterpolate\`, \`ɵɵproperty\`.
- Control flow compiles into separate **embedded view template functions** plus \`ɵɵconditionalCreate\` / \`ɵɵrepeaterCreate\`.
- **Locality**: each component is compiled from its own metadata plus the type-level declarations of its dependencies, so compilation is per file and incremental.
- **Tree-shaking**: instructions are plain functions imported from \`@angular/core\`; unused features are never imported.
- Libraries ship **partial** declarations (\`ɵɵngDeclareComponent\`) that the **linker** turns into final definitions in the app build.

**Clarifying questions expected:**
- "Do you want the compiler side, the runtime side, or both?"
- "Should I compare with View Engine?"

**Code / implementation expected:** Optional — a small component and its real compiled output.`,
    answer: `**Target Audience:** Developers who are comfortable building Angular apps and want to understand what the compiler produces, for senior interviews or for reading stack traces and profiles.
**Difficulty:** Hard

> **How to read this doc:** Plain language first, then <code>📌 Interview term:</code> callouts. Every line of compiled code below was produced by running <code>ngc</code> from <code>@angular/compiler-cli</code> 22.2.3 on the example at the bottom of this page (full and partial compilation modes), and the partial output was run through the real Angular linker (Babel plugin). The runtime behaviour in section 6 was measured by wrapping the compiled template function and booting the app in jsdom. Internal names like <code>rf</code> and <code>LView</code> are implementation details and can change between versions.

## 1. Why This Even Matters — A Story First

A music box does not read sheet music. Someone has already turned the score into a metal drum with pins: one pass of the drum plays the tune. Changing the tune means a new drum, but playing it is fast and needs no musician.

Angular templates are the sheet music. The Ivy compiler is the workshop that turns each one into a "drum": a plain JavaScript function with a fixed list of instructions. At runtime Angular just turns the drum: the first turn **builds** the DOM, every later turn only **checks the bindings** and touches the nodes whose values changed.

Knowing what the drum looks like explains a lot of Angular behaviour: why errors point at <code>AppComponent_Template</code>, why unused features cost nothing, why <code>@for</code> needs <code>track</code>, and why libraries need a "linker" step.

## 2. The Core Idea

📌 **Interview term: Ivy** — Angular's compiler and runtime since v9 (View Engine was removed in v13; sources: <a href="https://blog.angular.dev/version-9-of-angular-now-available-project-ivy-has-arrived-23c97b63cfa3" target="_blank" rel="noopener noreferrer">Angular v9 announcement</a> and the <a href="https://www.syncfusion.com/blogs/post/angular-13-top-features" target="_blank" rel="noopener noreferrer">Syncfusion v13 overview</a>). There is no other engine any more, so "Ivy" today simply means "how Angular compiles".

📌 **Interview term: Component definition (<code>ɵcmp</code>)** — a static field the compiler adds to the class, created by <code>ɵɵdefineComponent({...})</code>. It holds everything the runtime needs: selectors, inputs, the number of nodes (<code>decls</code>) and bindings (<code>vars</code>), a shared <code>consts</code> array of attributes, the dependencies and the template function. A factory <code>ɵfac</code> sits next to it.

📌 **Interview term: Template function and render flags** — <code>function X_Template(rf, ctx)</code>. <code>rf</code> is a bit flag; the 22.2.3 typings define <code>RenderFlags.Create = 1</code> and <code>Update = 2</code>. <code>ctx</code> is the component instance (or, in an embedded view, the loop or block context).

📌 **Interview term: Instruction** — a runtime function such as <code>ɵɵelementStart</code>, <code>ɵɵtext</code>, <code>ɵɵproperty</code>. The <code>ɵɵ</code> prefix marks them as code-generation API, not for hand-written code.

📌 **Interview term: LView** — the per-instance array where the runtime stores a view's DOM nodes and binding values. The typings for <code>ɵɵdomElementStart(index, ...)</code> describe <code>index</code> as the "Index of the element in the LView array", which is what the numbers in <code>ɵɵelementStart(0, "h3")</code> are.

## 3. Verified: the root component, compiled

The example's template has an interpolation with a [pipe](/interview-question/what-are-pipes-in-angular), a click handler, an <code>@if</code> and an <code>@for</code> of child components. <code>ngc</code> output for its definition (reformatted only by line breaks):

\\\`\\\`\\\`js
static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: AppComponent, selectors: [["app-root"]],
  decls: 9, vars: 4, consts: [[3, "click"], [3, "label", "done"]],
  template: function AppComponent_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "h3");
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "uppercase");
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 0);
    i0.ɵɵlistener("click", function AppComponent_Template_button_click_3_listener() { return ctx.add(); });
    i0.ɵɵtext(4, "Add");
    i0.ɵɵelementEnd();
    i0.ɵɵconditionalCreate(5, AppComponent_Conditional_5_Template, 2, 1, "p");
    i0.ɵɵelementStart(6, "ul");
    i0.ɵɵrepeaterCreate(7, AppComponent_For_8_Template, 1, 2, "todo-item", 1, _forTrack0);
    i0.ɵɵelementEnd();
  } if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 2, ctx.title));
    i0.ɵɵadvance(4);
    i0.ɵɵconditional(ctx.remaining() > 0 ? 5 : -1);
    i0.ɵɵadvance(2);
    i0.ɵɵrepeater(ctx.todos());
  } }, dependencies: [TodoItemComponent, UpperCasePipe], encapsulation: 2 });
\\\`\\\`\\\`

Reading it as a story:

- **Create pass** (<code>rf & 1</code>, once per component instance): open <code>h3</code> at slot 0, a text node at slot 1, a pipe instance at slot 2; a button at slot 3 with attribute set <code>consts[0]</code> (<code>[3, "click"]</code>: <code>3</code> is <code>AttributeMarker.Bindings</code>, which the typings describe as "the following attribute names were extracted from input or output bindings", used when matching directive selectors) and a listener that calls <code>ctx.add()</code>; a container at slot 5 for the <code>@if</code>; a <code>ul</code>; a repeater at slot 7 for the <code>@for</code>, given the track function.
- **Update pass** (<code>rf & 2</code>, on each check of this view): <code>ɵɵadvance</code> moves a cursor to the next node that has bindings, then the binding instruction compares the new value with the one stored in the LView and touches the DOM only if it changed. <code>ɵɵconditional(... ? 5 : -1)</code> picks which branch to show (or none). <code>ɵɵrepeater(ctx.todos())</code> hands the new array to the reconciler.
- **Counts**: <code>decls: 9</code> slots for nodes and pipes, <code>vars: 4</code> slots for binding values. The runtime allocates the LView from these numbers.
- <code>encapsulation: 2</code> is <code>ViewEncapsulation.None</code> in the 22.2.3 typings (<code>Emulated = 0</code>, <code>None = 2</code>, <code>ShadowDom = 3</code>): with no styles, there is nothing to scope (see [view encapsulation](/interview-question/what-is-viewencapsulation-in-angular)).

## 4. Verified: control flow becomes separate functions

The <code>@if</code> and <code>@for</code> bodies became their own template functions at the top of the file:

\\\`\\\`\\\`js
const _forTrack0 = ($index, $item) => $item.id;
function AppComponent_Conditional_5_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p");
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r0 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", ctx_r0.remaining(), " left");
} }
function AppComponent_For_8_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelement(0, "todo-item", 1);
} if (rf & 2) {
    const t_r2 = ctx.$implicit;
    i0.ɵɵproperty("label", t_r2.label)("done", t_r2.done);
} }
\\\`\\\`\\\`

📌 **Interview term: Embedded view** — a block of template that can be created and destroyed independently (an <code>@if</code> branch, one <code>@for</code> row). Each gets its own template function and its own LView. Inside, <code>ɵɵnextContext()</code> walks up to the parent component to read <code>remaining()</code>, and in the loop <code>ctx.$implicit</code> is the current item.

The <code>track t.id</code> expression compiled to <code>_forTrack0 = ($index, $item) => $item.id</code>, which the repeater uses to match old rows to new ones; that is why the compiler insists on it (see [why @for requires track](/interview-question/why-does-for-require-track-and-how-does-empty-improve-ux) and [the new control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir)).

## 5. Verified: the child, and a DOM-only shortcut

\\\`\\\`\\\`js
static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TodoItemComponent, selectors: [["todo-item"]],
  inputs: { label: "label", done: "done" }, decls: 2, vars: 3,
  template: function TodoItemComponent_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵdomElementStart(0, "li");
    i0.ɵɵtext(1);
    i0.ɵɵdomElementEnd();
  } if (rf & 2) {
    i0.ɵɵclassProp("done", ctx.done);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx.label);
  } }, encapsulation: 2 });
\\\`\\\`\\\`

The root used <code>ɵɵelementStart</code>; this child used <code>ɵɵdomElementStart</code>. The typings document the latter as "Create DOM element that cannot have any directives", so it skips directive matching. Three extra components compiled with <code>ngc</code> pinned down when the compiler chooses it: a template whose scope has no directive that matches anything (no imports, only a pipe, or an imported attribute directive that no element uses, which also triggers warning <code>NG8113: All imports are unused</code>) got <code>ɵɵdomElementStart</code> everywhere, and even <code>ɵɵdomListener</code> for a click handler. A template where one <code>span</code> used an imported <code>[tooltip]</code> directive switched <strong>every</strong> element, including a plain <code>p</code>, to <code>ɵɵelementStart</code>. The root here uses <code>todo-item</code>, so it gets the regular instructions. The same choice appeared in the [CLI production build](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve) of a [lazy component](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) (<code>ɵɵdomElementStart(0, "h2")</code>). That is a decision only an ahead-of-time compiler with full knowledge of a component's dependencies can make; see [AOT vs JIT](/interview-question/what-is-the-difference-between-aot-and-jit-compilation).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="ngc turns a component class and template into a definition with a template function that runs a create pass once and an update pass on each check">
  <defs>
    <marker id="fi10-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="170" height="90" rx="12"/>
  <text class="d-text" x="105" y="138" text-anchor="middle">class + template</text>
  <text class="d-sub" x="105" y="164" text-anchor="middle">@Component</text>
  <rect class="d-box-accent" x="250" y="100" width="170" height="90" rx="12"/>
  <text class="d-text d-accent" x="335" y="138" text-anchor="middle">ngc</text>
  <text class="d-sub" x="335" y="164" text-anchor="middle">at build time</text>
  <rect class="d-box" x="480" y="30" width="200" height="90" rx="12"/>
  <text class="d-text" x="580" y="68" text-anchor="middle">create pass</text>
  <text class="d-sub" x="580" y="94" text-anchor="middle">rf = 1, once</text>
  <rect class="d-box" x="480" y="180" width="200" height="90" rx="12"/>
  <text class="d-text" x="580" y="218" text-anchor="middle">update pass</text>
  <text class="d-sub" x="580" y="244" text-anchor="middle">rf = 2, per check</text>
  <path class="d-edge-accent" d="M 194 145 L 244 145" marker-end="url(#fi10-arrow)"/>
  <path class="d-edge-accent" d="M 424 130 L 474 85" marker-end="url(#fi10-arrow)"/>
  <path class="d-edge-accent" d="M 424 160 L 474 215" marker-end="url(#fi10-arrow)"/>
</svg>

The compiler runs once per build and emits a template function; the runtime then calls that one function in two modes, building the DOM in the first and only re-checking bindings in the later ones.

## 6. Verified: when the runtime calls the template function

The compiled <code>AppComponent.ɵcmp.template</code> was wrapped to log its render flag, then the app was booted, the Add button clicked, and an extra <code>appRef.tick()</code> forced with nothing changed:

\\\`\\\`\\\`
after boot : create(rf=1), update(rf=2)
after click: update(rf=2)
extra tick : (template not called)
tView decls/vars: 9 4
\\\`\\\`\\\`

- Booting ran the create pass once and an update pass once (the first change detection).
- The click (a template listener that updates a [signal](/interview-question/what-are-angular-signals)) caused one update pass, never another create.
- A tick with nothing dirty did **not** call the template at all: the component is OnPush by default in v22, and change detection skipped the clean view. See [how change detection works](/interview-question/how-does-change-detection-work-in-angular).
- The runtime cached a <code>tView</code> on the definition (the shared, per-component-type blueprint) with the compiler's <code>decls</code> and <code>vars</code>.

## 7. Locality, Type Declarations and Tree-Shaking

📌 **Interview term: Locality** — Ivy compiles each component using only its own decorator and the **type-level** information of what it imports. The compiler also writes that information into <code>.d.ts</code> files, verified in the partial build:

\\\`\\\`\\\`ts
static ɵcmp: i0.ɵɵComponentDeclaration<TodoItemComponent, "todo-item", never,
  { "label": { "alias": "label"; "required": true; }; "done": { "alias": "done"; "required": false; }; },
  {}, never, never, true, never>;
\\\`\\\`\\\`

The selector, inputs (with <code>required</code>), outputs and the [standalone](/interview-question/what-are-standalone-components) flag are encoded as types, so another component can be compiled and type-checked against <code>TodoItemComponent</code> without its source. That is what makes compilation per file, incremental builds fast, and libraries consumable without recompiling them.

📌 **Interview term: Tree-shaking** — removing unused code at bundle time. Every instruction is an ordinary exported function (<code>i0.ɵɵpipe</code>, <code>i0.ɵɵrepeaterCreate</code>), and the definitions are marked <code>/*@__PURE__*/</code>. A template that uses no pipes never imports the pipe instructions, and an unused component's definition can be dropped by the bundler. View Engine generated factories that referenced a large shared runtime, which tree-shook far less well.

## 8. Verified: libraries, partial compilation and the linker

With <code>"compilationMode": "partial"</code> (what library builds use) the same file compiles to a **declaration** instead of a final definition:

\\\`\\\`\\\`js
static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "22.2.3", type: TodoItemComponent,
  isStandalone: true, selector: "todo-item", inputs: { label: "label", done: "done" }, ngImport: i0,
  template: \`<li [class.done]="done">{{ label }}</li>\`, isInline: true });
\\\`\\\`\\\`

The template is still a string, plus a <code>minVersion</code>. Running that output through the real Angular linker (<code>@angular/compiler-cli/linker/babel</code>) produced exactly the <code>ɵɵdefineComponent</code> with <code>ɵɵdomElementStart(0, "li")</code> shown in section 5. That is the job the CLI does for every library in <code>node_modules</code> during your build: the library is compiled once, and its final instructions are generated by **your** Angular version.

Without a linker and without the JIT compiler, a partially compiled library cannot run. Booting a plain bundle without <code>@angular/compiler</code> failed with: <code>The injectable '_PlatformLocation' needs to be compiled using the JIT compiler, but '@angular/compiler' is not available. The injectable is part of a library that has been partially compiled.</code>

| Mode | Emits | Used for |
| :--- | :--- | :--- |
| <code>full</code> (default) | <code>ɵɵdefineComponent</code> with a template function | Applications |
| <code>partial</code> | <code>ɵɵngDeclareComponent</code> with the template string and <code>minVersion</code> | Published libraries, finished by the linker |
| JIT at runtime | The same instructions, generated in the browser | Playgrounds, unlinked code |

## 9. Common Pitfalls

- **Describing Ivy as a virtual DOM.** There is no tree diff: the create pass builds real DOM once and the update pass compares individual binding values stored in the LView.
- **Assuming every check re-runs every template.** Verified above: a clean OnPush view's template function is not called on a tick.
- **Reading <code>ɵ</code> APIs as public.** <code>ɵɵ</code> instructions and the <code>rf</code>/<code>LView</code> details are internal and change between versions; never call them directly.
- **Expensive expressions in templates.** They are evaluated in the update pass each time the view is checked; prefer <code>computed()</code> (see [computed vs methods](/interview-question/what-is-the-difference-between-computed-signals-and-standard-method-getter-calls)) or a pure pipe, which the compiler turns into <code>ɵɵpipeBind</code> with cached results.
- **Publishing a library in full mode.** Full output is tied to the Angular version that produced it; partial output plus the linker keeps it compatible.
- **Expecting per-element optimisation.** Verified: one element that uses a directive switches the whole template from the DOM-only instructions to the regular ones. Splitting a large template into small components keeps the plain parts on the fast path.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What the compiler emits:</strong> <span style="color:#f0e2c8;">"Ivy adds static definitions to each class: a factory and a component definition from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdefineComponent</code>, with selectors, inputs, slot counts and a template function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The template function:</strong> <span style="color:#f0e2c8;">"It runs in two modes: the create pass builds DOM once with instructions like elementStart, text and listener; the update pass uses advance plus binding instructions that only touch nodes whose values changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Control flow:</strong> <span style="color:#f0e2c8;">"Each @if branch and @for row is a separate embedded view template function, and the track expression becomes a function the repeater uses to reconcile rows."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Locality:</strong> <span style="color:#f0e2c8;">"Each component compiles from its own metadata plus the type declarations of its dependencies, written into .d.ts files, so builds are per file and incremental."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Libraries:</strong> <span style="color:#f0e2c8;">"Libraries ship partial declarations with the template as a string; the linker in the app build turns them into final definitions using the app Angular version."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the stack trace say AppComponent_Template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because that is the real function the compiler generated for the template. Errors in bindings or listeners are thrown from inside it, or from a named listener function like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AppComponent_Template_button_click_3_listener</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between decls and vars?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decls</code> is the number of slots for nodes, pipes and containers created in the create pass; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vars</code> is the number of binding slots used to store previous values for comparison in the update pass. The runtime sizes the LView from both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Ivy help tree-shaking compared to View Engine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Templates call individual exported instruction functions, so the bundler keeps only those a template uses, and definitions are marked pure so unused components drop out. View Engine relied on a larger shared runtime that could not be split as finely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the linker actually do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a Babel plugin that finds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵngDeclare...</code> calls in library code, compiles their template strings and metadata, and replaces them with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdefine...</code> output the app compiler would produce. Verified: the partial TodoItemComponent linked into the same instructions as the full build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a signal change re-run the whole template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It marks the views that read that signal for refresh, and change detection runs the update pass of those views only. A clean OnPush view was skipped entirely in the verified tick, and inside a refreshed view only changed bindings touch the DOM.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Ivy** | Angular's compiler and runtime, the only engine since v13 |
| **ɵcmp / ɵfac** | Static component definition and factory added by the compiler |
| **Template function** | Generated function that builds and updates a view |
| **Render flags (rf)** | Create = 1 for the first pass, Update = 2 for later passes |
| **Instruction** | A runtime function such as <code>ɵɵelementStart</code> called by generated code |
| **LView / TView** | Per-instance storage of nodes and values / shared per-type blueprint |
| **Embedded view** | Independently created block such as an @if branch or @for row |
| **Locality** | Compiling each component from its own metadata and dependency types |
| **Partial compilation + linker** | Library format, finished into final instructions in the app build |

---
**Conclusion:** Ivy compiles each component into plain JavaScript: a factory, a <code>ɵɵdefineComponent</code> definition sized by <code>decls</code> and <code>vars</code>, and a template function of instructions that the runtime calls once in create mode and again in update mode whenever the view is checked. The real <code>ngc</code> 22.2.3 output showed control flow as separate embedded-view functions, a DOM-only fast path for elements that cannot carry directives, type-level declarations that make compilation local, and partial declarations for libraries that the linker turns into the very same instructions. The instrumented run confirmed the runtime side: one create pass, one update pass per real change, and no call at all for a clean OnPush view.`,
    examples: [
      {
        label: "A small component whose ngc output is dissected above (interpolation, pipe, listener, @if, @for)",
        tech: "angular",
        runnable: true,
        code: `import { Component, Input, computed, signal } from "@angular/core";
import { UpperCasePipe } from "@angular/common";

// A child with a decorator input (works in AOT and in the JIT playground alike).
@Component({
  selector: "todo-item",
  template: \`<li [class.done]="done">{{ label }}</li>\`,
})
export class TodoItemComponent {
  @Input({ required: true }) label = "";
  @Input() done = false;
}

// Small on purpose: every template feature here maps to a handful of Ivy instructions.
@Component({
  selector: "app-root",
  imports: [TodoItemComponent, UpperCasePipe],
  template: \`
    <h3>{{ title | uppercase }}</h3>
    <button (click)="add()">Add</button>
    @if (remaining() > 0) {
      <p>{{ remaining() }} left</p>
    }
    <ul>
      @for (t of todos(); track t.id) {
        <todo-item [label]="t.label" [done]="t.done" />
      }
    </ul>
  \`,
})
export class AppComponent {
  title = "ivy demo";
  todos = signal([{ id: 1, label: "read ngc output", done: true }]);
  remaining = computed(() => this.todos().filter((t) => !t.done).length);

  add() {
    const id = this.todos().length + 1;
    this.todos.update((list) => [...list, { id, label: \`task \${id}\`, done: false }]);
  }
}`,
      },
    ],
  },
];

export default augments;
