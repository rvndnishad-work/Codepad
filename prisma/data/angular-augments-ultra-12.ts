/**
 * Angular ULTRA — batch 12: server-side rendering and hydration (Angular
 * Universal / @angular/ssr, non-destructive and incremental hydration,
 * mismatches, ngSkipHydration), deferrable views (@defer triggers, prefetch,
 * dependency isolation), NgOptimizedImage, the critical render path, security
 * and DomSanitizer, and i18n.
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
 * Every "Verified" block was produced on Angular 22.2.3. Component examples
 * went through scripts/verify-angular-example.mjs (ngc + strictTemplates,
 * booted in jsdom; runnable ones also passed --playground). SSR and hydration
 * output came from @angular/platform-server renderApplication, then hydrating
 * that HTML with bootstrapApplication in jsdom. @defer splitting was read from
 * ngc output. CLI claims (ng generate @angular/ssr:ng-add, ng build with
 * prerendering, critical CSS, autoCsp, ng extract-i18n, localized builds) come
 * from Angular CLI 22.2.3 on Node 24, offline. Browser-only effects (LCP, real
 * network timing, font inlining, which needs internet) were not measured.
 *
 * Conventions: SVG attributes double-quoted, `<code>` tags for inline code in
 * prose, no leading H1, `description` is plain markdown (no HTML).
 */
import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Angular Universal / SSR?",
    seoDescription:
      "Angular SSR renders pages to HTML on the server or at build time, then hydrates them. What @angular/ssr replaced, render modes and SSR-safe code.",
    description: `**Question presented to candidate:**
"Our marketing site is a client-rendered Angular app and the SEO team says crawlers and link previews see an empty page. What is Angular Universal, or SSR, and what would change if we turned it on?"

**What a strong answer should cover:**
- **Server-side rendering** produces the page HTML on a server (per request) or at build time (**prerendering / SSG**), so the first paint shows real content.
- **Angular Universal** is the old name; since v17 the tooling lives in the CLI as \`@angular/ssr\`, added with \`ng add @angular/ssr\`.
- **Hydration** (\`provideClientHydration()\`) lets the browser reuse the server DOM instead of re-creating it, and the **HttpClient transfer cache** avoids repeating API calls.
- **Render modes per route**: \`RenderMode.Server\`, \`RenderMode.Prerender\`, \`RenderMode.Client\` in \`app.routes.server.ts\`.
- **SSR-safe code**: no \`window\`/\`document\` access during render; use \`afterNextRender\`, \`isPlatformBrowser\`, \`inject(DOCUMENT)\`.
- Trade-offs: a Node server to operate (unless fully prerendered), time to first byte, and the security setting \`allowedHosts\`.

**Clarifying questions expected:**
- "Is the content the same for every visitor, or personalised per request?"
- "Do we already have somewhere to run a Node server, or must this be static hosting?"

**Code / implementation expected:** Optional — the server config files, and a component that is safe to render on the server.`,
    answer: `**Target Audience:** Developers who know basic Angular components and want to understand server-side rendering — no Node.js server experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The HTML in section 5 was produced by <code>renderApplication</code> from <code>@angular/platform-server</code> 22.2.3 and then hydrated in jsdom; the CLI steps in section 4 were run with Angular CLI 22.2.3 on Node 24. Anything that needs a real browser or network (Core Web Vitals, crawler behaviour) is labelled as not measured.

## 1. Why This Even Matters — A Story First

Imagine ordering a bookshelf. Option one: a flat box arrives with planks, screws and a booklet. Nothing is usable until you have read the booklet and built it yourself. Option two: the shelf arrives already assembled. You can put books on it the moment the door closes; the delivery person only needs to plug in the reading lamp.

A normal Angular app is the flat box. The server sends an almost empty <code>index.html</code> containing <code>&lt;app-root&gt;&lt;/app-root&gt;</code>, and nothing appears until the browser has downloaded, parsed and run the JavaScript that builds the page. A search crawler in a hurry, or a chat app making a link preview, sees an empty shelf.

**Server-side rendering** is the assembled shelf. Angular builds the page into real HTML before it leaves the server, so the browser can show it immediately. Then the JavaScript arrives and "plugs in the lamp": it attaches event listeners to the HTML that is already there. That last step is called **hydration** and has its own page: [how hydration works in modern Angular SSR](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat).

## 2. The Core Idea

📌 **Interview term: Client-side rendering (CSR)** — the browser receives an empty shell and JavaScript; the page only exists after the app boots in the browser. This is what <code>ng new</code> gives you by default.

📌 **Interview term: Server-side rendering (SSR)** — a server runs the Angular app for each incoming request and responds with the finished HTML for that URL.

📌 **Interview term: Prerendering (SSG, static site generation)** — the same rendering, done once at build time. The output is plain <code>.html</code> files that any static host or CDN can serve.

📌 **Interview term: Angular Universal** — the historical name of Angular SSR and of the <code>@nguniversal/*</code> packages. In v17 that code moved into the Angular CLI repository and was renamed, mostly to <code>@angular/ssr</code>; the old repository is in maintenance mode (source: the <a href="https://github.com/angular/universal" target="_blank" rel="noopener noreferrer">angular/universal README</a> and Ninja Squad's <a href="https://blog.ninja-squad.com/2023/11/09/angular-cli-17.0" target="_blank" rel="noopener noreferrer">What is new in Angular CLI 17.0</a>). Saying "Universal" in an interview is understood, but "Angular SSR" or <code>@angular/ssr</code> shows you are current.

📌 **Interview term: Hydration** — the browser-side step that makes server HTML interactive by reusing its DOM nodes instead of throwing them away. Enabled with <code>provideClientHydration()</code>.

## 3. The Request, Step by Step

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Angular SSR request flow: the browser asks the Node server, the server renders HTML with the app, the browser paints it and then hydrates">
  <defs>
    <marker id="q1ssr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="125" y="70" text-anchor="middle">Browser</text>
  <text class="d-sub" x="125" y="92" text-anchor="middle">GET /products</text>
  <path class="d-edge" d="M 224 75 L 300 75" marker-end="url(#q1ssr-arrow)"/>
  <rect class="d-box-accent" x="306" y="30" width="390" height="90" rx="10"/>
  <text class="d-text d-accent" x="501" y="62" text-anchor="middle">Node server runs the Angular app</text>
  <text class="d-sub" x="501" y="88" text-anchor="middle">fetches data, renders, serialises state</text>
  <path class="d-edge-accent" d="M 501 124 L 501 170" marker-end="url(#q1ssr-arrow)"/>
  <rect class="d-box" x="306" y="176" width="390" height="70" rx="10"/>
  <text class="d-text" x="501" y="206" text-anchor="middle">HTML with content plus ng-state</text>
  <text class="d-sub" x="501" y="228" text-anchor="middle">first paint needs no JavaScript</text>
  <path class="d-edge" d="M 302 211 L 224 211" marker-end="url(#q1ssr-arrow)"/>
  <rect class="d-box" x="30" y="176" width="190" height="70" rx="10"/>
  <text class="d-text" x="125" y="206" text-anchor="middle">Paint</text>
  <text class="d-sub" x="125" y="228" text-anchor="middle">content visible</text>
  <path class="d-edge-dashed" d="M 125 250 L 125 268" marker-end="url(#q1ssr-arrow)"/>
  <rect class="d-box-muted" x="30" y="272" width="666" height="44" rx="10"/>
  <text class="d-text" x="363" y="299" text-anchor="middle">JavaScript loads, hydration reuses the DOM and attaches listeners</text>
</svg>

Read it top to bottom: one round trip gives the browser a page it can display, and the JavaScript download no longer blocks what the user sees. It still blocks what the user can *do*, which is why hydration and [deferrable views](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17) matter so much in an SSR app.

## 4. Adding SSR to an App (what the CLI actually does)

On a real project you run <code>ng add @angular/ssr</code> (see [what the Angular CLI provides](/interview-question/what-does-the-angular-cli-provide)). That command installs packages and then runs the package's <code>ng-add</code> schematic. Here the schematic was run directly with <code>ng generate @angular/ssr:ng-add --skip-install</code> on a fresh CLI 22.2.3 app, so no network was needed. Its output:

\`\`\`
CREATE src/main.server.ts (292 bytes)
CREATE src/app/app.config.server.ts (426 bytes)
CREATE src/app/app.routes.server.ts (166 bytes)
CREATE src/server.ts (1609 bytes)
UPDATE angular.json (2126 bytes)
UPDATE tsconfig.app.json (400 bytes)
UPDATE package.json (999 bytes)
UPDATE src/app/app.config.ts (395 bytes)
\`\`\`

What changed, read from the files afterwards:

- <code>app.config.ts</code> gained exactly one provider: <code>provideClientHydration()</code>. No <code>withEventReplay()</code> is added any more, because in v22 the defaults already include incremental hydration, which brings event replay with it (see the [hydration deep dive](/interview-question/how-does-ssr-hydration-work-in-angular-non-destructive-hydration-and-mismatches)).
- <code>angular.json</code> got <code>"server": "src/main.server.ts"</code>, <code>"outputMode": "server"</code>, <code>"ssr": { "entry": "src/server.ts" }</code> and <code>"security": { "allowedHosts": [] }</code>.
- <code>package.json</code> gained <code>@angular/platform-server</code>, <code>@angular/ssr</code>, <code>express</code> and their types, plus a <code>serve:ssr:demo</code> script that runs <code>node dist/demo/server/server.mjs</code>.
- <code>app.routes.server.ts</code> defaults every route (<code>'**'</code>) to <code>RenderMode.Prerender</code>.

The generated files are the second example on this page. Because <code>express</code> was not installed offline, the Express <code>server.ts</code> was **not** built or started here. Instead <code>outputMode</code> was switched to <code>"static"</code> and <code>ng build</code> prerendered the app, which needs no server:

\`\`\`
Prerendered 1 static route.
Application bundle generation complete.
\`\`\`

<code>dist/demo/browser/index.html</code> then contained the rendered app, starting with <code>&lt;app-root ng-version="22.2.3" ngh="1" ng-server-context="ssg"&gt;</code>.

## 5. Verified: what SSR sends, and what the browser does with it

The first example on this page is a product list that loads data with <code>HttpClient</code> and sets a status message in <code>afterNextRender</code>. It was [AOT-compiled](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) with <code>ngc</code>, rendered with <code>renderApplication</code> (fake <code>fetch</code> that records every request), then the resulting HTML was loaded into jsdom and hydrated with <code>bootstrapApplication</code>.

Server side, printed by the script (the HTML is one line; nothing else was changed):

\`\`\`
server-side HTTP calls: [ 'https://shop.example.com/api/products' ]
<!DOCTYPE html><html><head><title>Shop</title></head><body><!--nghm--><app-root ng-version="22.2.3" ngh="0" ng-server-context="other"><h1>Products</h1><p>Tea</p><!--container--><small>server HTML</small></app-root><script id="ng-state" type="application/json">{"e1178f7af7af46efbfb7e28fcc7202df9130ca7604e9320886fae8d76325d107":{"b":[{"id":1,"name":"Tea"}],"h":{},"s":200,"st":"OK","u":"/api/products","rt":"json"},"__nghData__":[{"t":{"3":"t0"},"c":{"3":[{"i":"t0","r":1}]}}]}</script></body></html>
\`\`\`

Browser side, after hydration:

\`\`\`
Angular hydrated 1 component(s) and 9 node(s), 0 component(s) were skipped. 0 defer block(s) were configured to use incremental hydration. Learn more at https://v22.angular.dev/guide/hydration.
browser-side HTTP calls: []
rendered: ProductsTeahydrated, width 1024
\`\`\`

Four things to notice:

1. **The content is in the HTML.** <code>&lt;p&gt;Tea&lt;/p&gt;</code> was there before any browser JavaScript ran.
2. **Relative URLs became absolute on the server.** The component asked for <code>/api/products</code>; the server resolved it against the request URL, because Node has no "current page" to resolve against.
3. **The response travelled inside the page.** The <code>ng-state</code> script holds the cached body. When the browser app made the same request it was answered from that cache: zero browser calls. This is the **HttpClient transfer cache**, on by default with <code>provideClientHydration()</code>.
4. **<code>afterNextRender</code> only ran in the browser.** The server HTML says <code>server HTML</code>; the browser later shows <code>hydrated, width 1024</code> (jsdom's default width). Read about it in [afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks).

📌 **Interview term: Transfer state** — data serialised into the <code>ng-state</code> script on the server and read back in the browser (<code>TransferState</code> in <code>@angular/core</code>). The HttpClient transfer cache is built on it. The 22.2.3 source skips caching responses with <code>Cache-Control: no-store</code>, <code>private</code> or <code>no-cache</code>, responses that set cookies, and requests carrying <code>Authorization</code> or <code>Cookie</code> headers, unless you opt in.

📌 **Interview term: <code>ngh</code> and <code>ng-server-context</code>** — attributes the server adds. <code>ngh="0"</code> points into <code>__nghData__</code>, the hydration map. <code>ng-server-context</code> tells you how the page was produced: the 22.2.3 <code>@angular/ssr</code> source maps <code>RenderMode.Prerender</code> to <code>ssg</code>, <code>RenderMode.Server</code> to <code>ssr</code>, and a bare <code>renderApplication</code> call reports <code>other</code>.

## 6. Render Modes per Route

In current versions the server routes file decides, route by route (on top of the normal [Angular routes](/interview-question/how-does-routing-and-lazy-loading-work-in-angular)), how a page is produced. The values come from the 22.2.3 typings:

| <code>RenderMode</code> | When the HTML is made | Needs a Node server? | Good for |
| :--- | :--- | :--- | :--- |
| <code>Server</code> | On every request | Yes | Personalised or fast-changing pages (account, search results) |
| <code>Prerender</code> | Once, at <code>ng build</code> | No | Marketing, docs, blog posts, product pages that change rarely |
| <code>Client</code> | Never on the server; classic CSR shell | No | Pages behind login where SEO does not matter, heavy browser-only widgets |

Prerendered routes with parameters (<code>/product/:id</code>) list their values with <code>getPrerenderParams</code>, and <code>PrerenderFallback</code> (<code>Server</code>, <code>Client</code> or <code>None</code>) says what to do for an id that was not prerendered. Route-level <code>headers</code> and <code>status</code> can also be set here.

📌 **Interview term: Hybrid rendering** — mixing those modes in one app, which is the default shape of an <code>@angular/ssr</code> project today.

## 7. Writing Code That Survives the Server

The server has no browser, so code that touches browser globals during rendering breaks. Verified with a one-line component, <code>width = window.innerWidth;</code>, rendered with <code>renderApplication</code>:

\`\`\`
ERROR ReferenceError: window is not defined
RENDER FAILED: ReferenceError: window is not defined
\`\`\`

The fixes, from most to least preferred:

- **<code>afterNextRender</code> / <code>afterEveryRender</code>** for anything that measures or touches the DOM. They never run on the server, as the example shows.
- **<code>inject(DOCUMENT)</code>** instead of the global <code>document</code>. On the server it is a DOM emulation (Domino), so <code>title</code>, <code>meta</code> and <code>&lt;head&gt;</code> changes end up in the HTML.
- **<code>isPlatformBrowser(inject(PLATFORM_ID))</code>** for genuine branches. Use it sparingly: rendering *different DOM* on each side is the main source of [hydration mismatch errors](/interview-question/how-do-you-handle-ssr-hydration-mismatch-errors-using-ngskiphydration).
- **<code>REQUEST</code>, <code>RESPONSE_INIT</code>, <code>REQUEST_CONTEXT</code>** [injection tokens](/interview-question/what-is-an-injectiontoken) (all in <code>@angular/core</code> 22.2.3) when the server needs the incoming request, for example to read a cookie or set a 404 status. The 22.2.3 typings say <code>REQUEST</code> is <code>null</code> in the browser, at build time and during prerendering, so always handle that case.

One security detail is new enough to surprise people: the server only renders for host names it trusts. Calling <code>renderApplication</code> with <code>url: "http://localhost/"</code> and no <code>allowedHosts</code> option threw:

\`\`\`
RuntimeError: NG05706: Host http://localhost/ is not allowed. You can configure \`allowedHosts\` option.
\`\`\`

That protects against host-header injection, where an attacker makes the server build absolute URLs (and HttpClient requests) to a host of their choosing. See the [Angular security question](/interview-question/what-are-security-vulnerabilities-in-angular-apps-and-how-does-domsanitizer-prev) for the rest of the security picture.

## 8. CSR vs SSR vs Prerendering

| | CSR | SSR | Prerendering |
| :--- | :--- | :--- | :--- |
| First HTML response | Empty shell | Full page for this request | Full page, built ahead of time |
| Time to first byte | Fast (static file) | Slower: server renders first | Fast (static file) |
| Content visible before JS | No | Yes | Yes |
| Crawlers and link previews | Depend on running JS | See content | See content |
| Infrastructure | Static host | Node server (Express, or any host <code>@angular/ssr</code> adapters support) | Static host |
| Data freshness | Live | Live | As fresh as the last build |
| Code constraints | Browser only | Must be SSR-safe | Must be SSR-safe |

Whether SSR actually improves Core Web Vitals (see [the critical render path](/interview-question/what-is-the-critical-render-path-and-how-does-angular-handle-font-and-style-opti)) such as Largest Contentful Paint depends on your server, network and page, and was **not measured here** (it needs a real browser). It usually helps content-heavy pages, and it can hurt if the server is slow or the page then re-renders on hydration.

## 9. Common Pitfalls

- **Touching <code>window</code>, <code>localStorage</code> or <code>document</code> during render.** It throws on the server (verified above). Put it in <code>afterNextRender</code>, or behind <code>isPlatformBrowser</code>.
- **Forgetting <code>provideClientHydration()</code>.** Without it the browser throws away the server DOM and re-renders from scratch: a flash, and the transfer cache is off, so every API call happens twice.
- **Assuming relative URLs just work everywhere.** They do with HttpClient on the server only because Angular resolves them against the request URL; hand-rolled <code>fetch</code> calls in Node do not get that help.
- **Leaving <code>allowedHosts</code> empty when you deploy SSR.** The server refuses hosts it does not know (<code>NG05706</code>); list your real domains instead of <code>"*"</code>.
- **Expecting <code>afterNextRender</code> work to be in the HTML.** It never runs on the server: in the verified run the server HTML still said <code>server HTML</code>. Anything that must be crawlable has to come from normal rendering.
- **Caching personalised SSR pages at the CDN.** A <code>RenderMode.Server</code> page for one logged-in user is not safe to share. Prerender only what is identical for everyone.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"SSR means Angular renders the page to real HTML on a server, or at build time, so the browser can paint content before any JavaScript runs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the history:</strong> <span style="color:#f0e2c8;">"Angular Universal was the old name and package set; since v17 it lives in the CLI as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/ssr</code>, added with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng add @angular/ssr</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The three modes:</strong> <span style="color:#f0e2c8;">"Each route can be server-rendered per request, prerendered at build time, or left client-side, via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RenderMode</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.routes.server.ts</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Hydration finishes the job:</strong> <span style="color:#f0e2c8;">"The browser then hydrates: it reuses the server DOM instead of rebuilding it, and the HttpClient transfer cache stops the same API call happening twice."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">"Code now runs in Node too, so browser globals must be guarded with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isPlatformBrowser</code>, and you operate a server unless every route is prerendered."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is SSR good for SEO if Google runs JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Crawlers do run JavaScript, but rendering is queued and costs them time; HTML that already contains the content is indexed reliably, and link-preview bots for chat apps and social networks often do not run JavaScript at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a component reads <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">window</code> during SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the server there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code>, so the render throws. I verified it: a component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window.innerWidth</code> in a field initialiser made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderApplication</code> fail with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError: window is not defined</code>. Move that code into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> or guard it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isPlatformBrowser</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the server not fetch the same data twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideClientHydration()</code>, HttpClient responses made during SSR are stored in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-state</code> script. In my run the server made one call to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/api/products</code> and the browser made zero, because hydration read the cached body.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose prerendering over SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the page is the same for every visitor and changes rarely: marketing pages, docs, a blog. Prerendered HTML is a static file, so it is cheap to serve from a CDN and needs no Node server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">allowedHosts</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stops host-header attacks: the server only renders for hostnames you list. Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderApplication</code> with a URL whose host is not allowed throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG05706</code>; the CLI writes an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowedHosts</code> array into angular.json for this.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSR** | The browser builds the page from an empty shell |
| **SSR** | A server renders HTML for each request |
| **Prerendering / SSG** | Rendering done once at build time into static files |
| **Angular Universal** | The old name and packages for Angular SSR, now <code>@angular/ssr</code> |
| **Hydration** | Reusing server DOM in the browser instead of rebuilding it |
| **Transfer state** | Server data serialised into the page for the browser to reuse |
| **Hybrid rendering** | Choosing Server, Prerender or Client per route |
| **<code>ngh</code> / <code>ng-server-context</code>** | Server-added attributes: hydration map index and how the page was produced |

---
**Conclusion:** Angular SSR, once called Universal and now the CLI's <code>@angular/ssr</code>, runs your app on the server or at build time so the first response already contains the page. Verified on 22.2.3, the server output carries the content, a hydration map and the cached HTTP responses, and the browser hydrates it without repeating the API call. The price is that your code must be safe to run in Node, and that SSR routes need a server; choosing a render mode per route lets you pay that price only where it buys something.`,
    examples: [
      {
        label: "An SSR-friendly component: HttpClient transfer cache plus afterNextRender for browser-only work",
        tech: "angular",
        runnable: false,
        code: `import { Component, ApplicationConfig, afterNextRender, inject, signal } from "@angular/core";
import { HttpClient, provideHttpClient, withFetch } from "@angular/common/http";
import { provideClientHydration } from "@angular/platform-browser";

@Component({
  selector: "app-root",
  template: \`<h1>Products</h1>
    @for (p of products(); track p.id) { <p>{{ p.name }}</p> }
    <small>{{ status() }}</small>\`,
})
export class AppComponent {
  products = signal<{ id: number; name: string }[]>([]);
  status = signal("server HTML");
  constructor() {
    inject(HttpClient).get<{ id: number; name: string }[]>("/api/products").subscribe((p) => this.products.set(p));
    // Never runs during SSR: only after the first render in a browser.
    afterNextRender(() => this.status.set("hydrated, width " + window.innerWidth));
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withFetch()), provideClientHydration()],
};`,
      },
      {
        label: "The server files the @angular/ssr ng-add schematic generated (CLI 22.2.3)",
        tech: "angular",
        runnable: false,
        code: `// src/app/app.config.server.ts (generated by the @angular/ssr ng-add schematic, CLI 22.2.3)
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

// src/app/app.routes.server.ts (generated)
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

// src/main.server.ts (generated)
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Hydration work in modern Angular SSR, and what is non-destructive hydration?",
    seoDescription:
      "Non-destructive hydration reuses server-rendered DOM instead of rebuilding it. How Angular 22 enables it, event replay and incremental hydration, verified.",
    description: `**Question presented to candidate:**
"We render our Angular app on the server, but users see the page flash and their first clicks do nothing. Explain what hydration is, what Angular means by non-destructive hydration, and what we should turn on."

**What a strong answer should cover:**
- **Hydration**: making server-rendered HTML interactive in the browser by attaching Angular to the existing DOM.
- **Destructive vs non-destructive**: old behaviour wiped the server DOM and re-rendered (flicker, wasted work); non-destructive hydration (v16 preview, stable v17) reuses the nodes.
- **How to enable it**: \`provideClientHydration()\` in the app config; the server adds \`ngh\` annotations and an \`ng-state\` script that the browser reads.
- **Event replay**: user events captured before hydration are replayed afterwards.
- **Incremental hydration**: \`@defer (hydrate on ...)\` keeps parts of the page dehydrated until needed; on by default in v22.
- How to confirm it works: the dev-mode hydration log and the absence of flicker.

**Clarifying questions expected:**
- "Are we on a version with \`provideClientHydration\`, or still on the older Universal setup?"
- "Do the first clicks fail everywhere, or only on heavy pages that take long to boot?"

**Code / implementation expected:** Optional — the provider line, and one \`@defer\` block with a \`hydrate\` trigger.`,
    answer: `**Target Audience:** Developers who know what SSR is and want to understand what happens when the page reaches the browser.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every "Verified" block came from rendering the examples with <code>renderApplication</code> (<code>@angular/platform-server</code> 22.2.3) and hydrating the HTML with <code>bootstrapApplication</code> in jsdom, comparing DOM node identity before and after. jsdom is not a real browser, so paint timing and flicker were not measured; only what happened to the DOM was.

## 1. Why This Even Matters — A Story First

A theatre company tours with a fully built stage set. When they arrive at a new venue, the local crew has already built an identical set from the same drawings. The touring actors have two choices.

They can tear the local set down and rebuild it from their own crates. The audience watches an empty stage for ten minutes, and anyone who tried to sit on a chair during the rebuild falls over.

Or they can walk onto the set that is already standing, check each piece against their drawings, and start acting. Same show, no gap.

Server-side rendering builds the set (the HTML). **Hydration** is the actors arriving. Angular used to do the first thing; since v16 it does the second, and that is what **non-destructive hydration** means. (For how the set gets built in the first place, see [what Angular SSR is](/interview-question/what-is-angular-universal-ssr).)

## 2. The Core Idea

📌 **Interview term: Hydration** — the browser-side process that connects the Angular app to DOM that the server already rendered: it attaches event listeners, links each template node to its DOM node, and restores state, so the page becomes interactive.

📌 **Interview term: Destructive hydration** — the pre-v16 behaviour. The browser app booted, removed the server-rendered DOM, and rendered everything again. Users saw a flash, and any work the server did on the DOM was thrown away.

📌 **Interview term: Non-destructive hydration** — Angular walks the existing DOM and *claims* each node instead of creating a new one. Introduced in v16 as a developer preview and production ready in v17. You turn it on with <code>provideClientHydration()</code>.

The server's job is to leave enough breadcrumbs for that walk. It adds an <code>ngh</code> attribute to component hosts and writes a JSON map (<code>__nghData__</code>) into an <code>&lt;script id="ng-state"&gt;</code> tag. The browser reads the map to know, for example, how many <code>&lt;li&gt;</code> nodes an <code>@for</code> produced. The [mechanics and mismatch question](/interview-question/how-does-ssr-hydration-work-in-angular-non-destructive-hydration-and-mismatches) decodes that map in detail; this page stays at the "what and why" level.

## 3. Destructive vs Non-Destructive, Side by Side

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Destructive hydration deletes the server DOM and renders again, non-destructive hydration reuses the same DOM nodes and only attaches listeners">
  <defs>
    <marker id="q2hyd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="180" y="28" text-anchor="middle">Destructive (no provider)</text>
  <rect class="d-box" x="40" y="48" width="280" height="50" rx="10"/>
  <text class="d-text" x="180" y="78" text-anchor="middle">Server HTML painted</text>
  <path class="d-edge" d="M 180 102 L 180 132" marker-end="url(#q2hyd-arrow)"/>
  <rect class="d-box-muted" x="40" y="138" width="280" height="50" rx="10"/>
  <text class="d-text" x="180" y="168" text-anchor="middle">DOM removed, page blank</text>
  <path class="d-edge" d="M 180 192 L 180 222" marker-end="url(#q2hyd-arrow)"/>
  <rect class="d-box" x="40" y="228" width="280" height="50" rx="10"/>
  <text class="d-text" x="180" y="258" text-anchor="middle">New DOM created, early clicks lost</text>
  <text class="d-text" x="540" y="28" text-anchor="middle">Non-destructive</text>
  <rect class="d-box" x="400" y="48" width="280" height="50" rx="10"/>
  <text class="d-text" x="540" y="78" text-anchor="middle">Server HTML painted</text>
  <path class="d-edge-accent" d="M 540 102 L 540 132" marker-end="url(#q2hyd-arrow)"/>
  <rect class="d-box-accent" x="400" y="138" width="280" height="50" rx="10"/>
  <text class="d-text d-accent" x="540" y="168" text-anchor="middle">Walk DOM using the ngh map</text>
  <path class="d-edge-accent" d="M 540 192 L 540 222" marker-end="url(#q2hyd-arrow)"/>
  <rect class="d-box" x="400" y="228" width="280" height="50" rx="10"/>
  <text class="d-text" x="540" y="258" text-anchor="middle">Same nodes, listeners attached</text>
</svg>

The left column is what you get if you render on the server but forget the provider. The right column is what <code>provideClientHydration()</code> gives you.

## 4. Verified: the same page, with and without hydration

The first example is a basket: a heading, an <code>@for</code> list (see [the new control flow](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir)) and an "Add scone" button, with <code>provideClientHydration()</code> in <code>appConfig</code>. The server rendered it to:

\`\`\`
<!DOCTYPE html><html><head></head><body><!--nghm--><app-root ng-version="22.2.3" ngh="0" ng-server-context="other"><h1>Basket</h1><ul><li>Tea</li><li>Coffee</li><!--container--></ul><button jsaction="click:;">Add scone</button></app-root><script id="ng-state" type="application/json">{"__nghData__":[{"t":{"4":"t0"},"c":{"4":[{"i":"t0","r":1,"x":2}]}}]}</script></body></html>
\`\`\`

That HTML was then loaded into jsdom. Before booting Angular, the test held references to every element inside <code>&lt;app-root&gt;</code>, then compared them afterwards. With hydration:

\`\`\`
Angular hydrated 1 component(s) and 12 node(s), 0 component(s) were skipped. 0 defer block(s) were configured to use incremental hydration. Learn more at https://v22.angular.dev/guide/hydration.
server elements reused: 5 of 5
BROWSER DOM: <h1>Basket</h1><ul><li>Tea</li><li>Coffee</li><!--container--></ul><button>Add scone</button>
\`\`\`

The same page booted **without** the provider (plain <code>bootstrapApplication(AppComponent)</code>):

\`\`\`
server elements reused: 0 of 5
BROWSER DOM: <h1>Basket</h1><ul><li>Tea</li><li>Coffee</li><!--container--></ul><button>Add scone</button>
\`\`\`

The final HTML is identical, which is exactly why destructive hydration is easy to miss in code review. The difference is that every node was thrown away and recreated. In a real browser that is the flash users notice. Notice also that after hydration the <code>ngh</code> and <code>jsaction</code> attributes are gone: they are scaffolding, removed once used.

## 5. Event Replay: clicks before the app has loaded

There is always a gap between "HTML painted" and "JavaScript ready". A user who clicks in that gap used to be ignored.

📌 **Interview term: Event replay** — a small inline script (the event dispatch contract, from the same JSAction library Google Search uses) records events on elements marked with <code>jsaction</code> while the app is loading, then replays them once hydration is done. Introduced in v18 (source: <a href="https://blog.angular.dev/angular-v18-is-now-available-e79d5ac0affe" target="_blank" rel="noopener noreferrer">Angular v18 announcement</a>).

Verified by clicking "Add scone" in jsdom *before* Angular was imported:

\`\`\`
clicked the button BEFORE Angular booted in the browser
Angular hydrated 1 component(s) and 12 node(s), 0 component(s) were skipped. 0 defer block(s) were configured to use incremental hydration. Learn more at https://v22.angular.dev/guide/hydration.
server elements reused: 5 of 5
BROWSER DOM: <h1>Basket</h1><ul><li>Tea</li><li>Coffee</li><li>Scone</li><!--container--></ul><button>Add scone</button>
\`\`\`

The scone appeared: the early click was replayed into the hydrated app.

What turns replay on surprised me, so it was checked three ways on 22.2.3:

| Config | <code>jsaction</code> in server HTML | Early click |
| :--- | :--- | :--- |
| <code>provideClientHydration()</code> (v22 default) | Yes | Replayed, scone added |
| <code>provideClientHydration(withNoIncrementalHydration())</code> | No | Lost |
| <code>provideClientHydration(withNoIncrementalHydration(), withEventReplay())</code> | Yes | Replayed, scone added |

The reason is in the typings: <code>withIncrementalHydration()</code> is marked <code>@deprecated Since v22.0.0, incremental hydration is enabled by default with provideClientHydration</code>, and incremental hydration depends on event replay. That is also why the v22 <code>@angular/ssr</code> schematic only writes <code>provideClientHydration()</code> with no features. The CLI build confirms it from the other side: the prerendered <code>index.html</code> of the default app contained the inline <code>ng-event-dispatch-contract</code> script and <code>window.__jsaction_bootstrap(document.body,"ng",["click","keydown"],[])</code>; the same app built with <code>withNoIncrementalHydration()</code> had neither.

## 6. Incremental Hydration

Full hydration still has to download and run the code (it also runs a first [change detection](/interview-question/how-does-change-detection-work-in-angular) pass) for the *whole* page before anything is interactive. Incremental hydration lets parts of the page stay as inert server HTML until they are needed.

📌 **Interview term: Incremental hydration** — <code>@defer</code> blocks with a <code>hydrate</code> trigger (<code>hydrate on interaction</code>, <code>on viewport</code>, <code>on idle</code>, <code>on hover</code>, <code>on timer(...)</code>, <code>on immediate</code>, <code>hydrate when cond</code>, <code>hydrate never</code>). The server renders the block's real content; the browser leaves it **dehydrated** until the trigger fires, then loads its code and hydrates just that block. It arrived in v19 as a preview and the typings mark its API public from 20.0; in v22 it is on by default.

The second example puts a reviews widget, whose count is a [signal](/interview-question/what-are-angular-signals), in <code>@defer (hydrate on interaction)</code>. Verified:

\`\`\`
before clicking #more: <app-reviews jsaction="click:;keydown:;" ngb="d0" ngh="0"><p>5 reviews</p><button id="more" jsaction="click:;" ngb="d0">more</button></app-reviews>
after clicking #more: Product6 reviewsmore
\`\`\`

Before the click, the block is server HTML with replay markers (<code>ngb="d0"</code> names the defer block). The click triggered hydration of that block *and* was replayed into it, so the counter went from 5 to 6 in one interaction (elements run together in the text line). The dev log reported <code>1 defer block(s) were configured to use incremental hydration</code>.

Contrast with a plain <code>@defer (on viewport)</code>: on the server that renders the **placeholder**, not the content. The deep dive on [@defer and its triggers](/interview-question/how-does-the-defer-block-work-and-what-triggers-are-available) covers the non-hydrate side.

## 7. What You Configure

| You want | Write |
| :--- | :--- |
| Hydration with v22 defaults (DOM reuse, HTTP transfer cache, incremental hydration, event replay) | <code>provideClientHydration()</code> |
| No incremental hydration | <code>provideClientHydration(withNoIncrementalHydration())</code> |
| Event replay without incremental hydration | <code>provideClientHydration(withNoIncrementalHydration(), withEventReplay())</code> |
| Hydrate <code>i18n</code> blocks too | <code>provideClientHydration(withI18nSupport())</code> (public API from 20.0) |
| HTTP requests repeated in the browser | <code>provideClientHydration(withNoHttpTransferCache())</code> |
| Skip one component that cannot be hydrated | <code>ngSkipHydration</code> on its host, see [handling mismatches with ngSkipHydration](/interview-question/how-do-you-handle-ssr-hydration-mismatch-errors-using-ngskiphydration) |

## 8. Common Pitfalls

- **Rendering on the server but forgetting the provider.** The final DOM looks right, so nobody notices that 0 of the server nodes survive (verified above). Check for the dev-mode "Angular hydrated ..." log.
- **Adding <code>withIncrementalHydration()</code> to a v22 app.** It is deprecated and a no-op on top of the default; <code>withNoIncrementalHydration()</code> is the switch that now does something.
- **Turning incremental hydration off and keeping old assumptions.** Early clicks are then lost unless <code>withEventReplay()</code> is added (verified).
- **Expecting <code>@defer (on viewport)</code> content in the server HTML.** Without a <code>hydrate</code> trigger the server sends the placeholder. If the content matters for SEO, use a <code>hydrate</code> trigger.
- **Treating hydration as free.** The browser still downloads and runs the component code for everything that hydrates eagerly; incremental hydration and [deferrable views](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17) are what shrink that.
- **Direct DOM manipulation in components.** It breaks the node-by-node match and throws NG0500; see the mismatch questions linked above.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"Hydration is the browser step that takes server-rendered HTML and makes it a live Angular app, attaching listeners and state to nodes that already exist."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Non-destructive:</strong> <span style="color:#f0e2c8;">"Before v16 Angular threw the server DOM away and rendered again; non-destructive hydration reuses those nodes, so there is no flicker and no wasted work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Turn it on:</strong> <span style="color:#f0e2c8;">"It is one provider, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideClientHydration()</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng add @angular/ssr</code> puts in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.ts</code> for you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Event replay:</strong> <span style="color:#f0e2c8;">"Clicks that happen before the JavaScript arrives are captured by a tiny inline script and replayed after hydration, so early users are not ignored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Incremental hydration:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer (hydrate on ...)</code> parts of the page stay as plain HTML until needed; in v22 that is on by default, and it brings event replay with it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know hydration is working?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In dev mode Angular logs a line such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Angular hydrated 1 component(s) and 12 node(s), 0 component(s) were skipped</code>. In the browser you can also check that the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngh</code> attributes disappear and nothing flashes. In my test every server element was the same DOM node after hydration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does destructive hydration look like?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideClientHydration()</code> the browser app wipes the server DOM and renders again. In my run 0 of 5 server elements survived, and a click made before boot was simply lost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do I still need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">withEventReplay()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with the v22 defaults: incremental hydration is on and it turns event replay on. If you opt out with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withNoIncrementalHydration()</code>, early clicks are lost again unless you add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withEventReplay()</code> back; I verified both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between incremental hydration and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@defer</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> decides when to *load and render* a block in the browser; on the server it renders the placeholder. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> trigger renders the real content on the server and only decides when to *hydrate* it in the browser.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What can break hydration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anything that makes the browser DOM differ from what Angular rendered: invalid HTML the parser rewrites, or code and libraries that touch the DOM directly. Angular then throws NG0500; that is covered in the mismatch question.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hydration** | Attaching the browser app to server-rendered DOM |
| **Destructive hydration** | Deleting the server DOM and rendering again |
| **Non-destructive hydration** | Reusing the server DOM node by node |
| **<code>ngh</code> / <code>__nghData__</code>** | The server-written map the browser uses to match nodes |
| **Event replay** | Recording early user events and replaying them after hydration |
| **Incremental hydration** | Hydrating <code>@defer</code> blocks only when their <code>hydrate</code> trigger fires |
| **Dehydrated block** | Server HTML that has no live Angular code attached yet |

---
**Conclusion:** Hydration is how a server-rendered Angular page becomes an app, and non-destructive hydration does it by reusing the server DOM instead of rebuilding it. On 22.2.3 the difference is measurable even in jsdom: 5 of 5 server elements survived with <code>provideClientHydration()</code>, 0 of 5 without it. The same provider now also brings incremental hydration and, through it, event replay, so a click made before the JavaScript arrives is replayed rather than lost, and <code>@defer (hydrate on ...)</code> lets whole sections stay as plain HTML until a user actually needs them.`,
    examples: [
      {
        label: "Turning hydration on: one provider in the app config",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, signal } from "@angular/core";
import { provideClientHydration } from "@angular/platform-browser";

@Component({
  selector: "app-root",
  template: \`
    <h1>Basket</h1>
    <ul>
      @for (item of items(); track item) { <li>{{ item }}</li> }
    </ul>
    <button (click)="items.update(list => [...list, 'Scone'])">Add scone</button>
  \`,
})
export class AppComponent {
  items = signal(["Tea", "Coffee"]);
}

// The one line that turns destructive re-rendering into hydration.
// Since v22 this also turns on incremental hydration, and with it event replay.
export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration()],
};`,
      },
      {
        label: "Incremental hydration: a @defer block that stays dehydrated until the user interacts",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, signal } from "@angular/core";
import { provideClientHydration } from "@angular/platform-browser";
@Component({ selector: "app-reviews", template: \`<p>{{ n() }} reviews</p><button id="more" (click)="n.set(n() + 1)">more</button>\` })
export class ReviewsComponent { n = signal(5); }
@Component({
  selector: "app-root",
  imports: [ReviewsComponent],
  template: \`<h1>Product</h1>
    @defer (hydrate on interaction) { <app-reviews /> } @placeholder { <p>reviews placeholder</p> }\`,
})
export class AppComponent {}
export const appConfig: ApplicationConfig = { providers: [provideClientHydration()] };`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does SSR hydration work in Angular — non-destructive hydration and mismatches?",
    seoDescription:
      "How Angular matches server DOM during hydration: the ngh map, nghm marker, what counts as a mismatch (NG0500, NG0507) and what does not, verified on v22.",
    description: `**Question presented to candidate:**
"After enabling SSR our console shows NG0500 hydration errors on some pages. Walk me through how Angular hydration actually matches the server DOM, what counts as a mismatch, and how you would track one down."

**What a strong answer should cover:**
- The server writes **hydration annotations**: \`ngh\` attributes, the \`__nghData__\` map in the \`ng-state\` script, comment anchors, and the \`nghm\` integrity marker.
- In the browser Angular walks the DOM and **claims** nodes, checking the element tag or node type at each position.
- **Not mismatches**: different text values and different \`@if\` branches (Angular patches or re-creates them).
- **Mismatches** (\`NG0500\`): invalid HTML repaired by the parser (\`<tr>\` without \`<tbody>\`), direct DOM manipulation, third-party scripts and browser extensions. Removed comments give \`NG0507\`.
- Reading the error's expected vs actual DOM diagram and the component name it points to.
- Fix order: valid HTML, DOM work in \`afterNextRender\`, \`ngSkipHydration\` as the last resort.

**Clarifying questions expected:**
- "Does it happen on every load, or only for some users (extensions, A/B scripts)?"
- "Is anything between the server and browser rewriting the HTML, such as a CDN optimiser?"

**Code / implementation expected:** Optional — reproduce one mismatch and fix it.`,
    answer: `**Target Audience:** Developers who have SSR running and want to understand, and fix, hydration errors.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All output was produced on Angular 22.2.3 by rendering each example with <code>renderApplication</code> and hydrating the result in jsdom with <code>bootstrapApplication</code>. jsdom uses a real HTML5 parser, which is what makes the table mismatch below reproducible; visual effects such as flicker in a real browser were not measured.

## 1. Why This Even Matters — A Story First

A removal company photographs every room before packing, numbering each box: "kitchen, box 3 of 5, goes on the left shelf". At the new house the unpacker follows the photos. If someone at the new house has moved a shelf, or a box is missing, the unpacker stops and says "the photo shows a shelf here, I see a door".

Hydration works the same way. The [server](/interview-question/what-is-angular-universal-ssr) takes the "photos" (a compact description of every view it rendered) and ships them with the HTML. The browser follows them node by node. A **hydration mismatch** is the unpacker finding something different from the photo. This page is about how the photos are taken, what the unpacker checks, and why it stops. For the gentler introduction, read [how hydration works and what non-destructive means](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat) first.

## 2. The Breadcrumbs the Server Leaves

Rendering the [basket example from the sibling question](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat) produced:

\`\`\`
<!--nghm--><app-root ngh="0" ...><h1>Basket</h1><ul><li>Tea</li><li>Coffee</li><!--container--></ul><button jsaction="click:;">Add scone</button></app-root>
<script id="ng-state" type="application/json">{"__nghData__":[{"t":{"4":"t0"},"c":{"4":[{"i":"t0","r":1,"x":2}]}}]}</script>
\`\`\`

📌 **Interview term: Hydration annotations** — the data the server adds so the browser can match nodes. The key names are single letters to keep pages small; their meaning is in the 22.2.3 source (<code>TEMPLATES = 't'</code>, <code>CONTAINERS = 'c'</code>, <code>TEMPLATE_ID = 'i'</code>, <code>NUM_ROOT_NODES = 'r'</code>, <code>MULTIPLIER = 'x'</code>, <code>NODES = 'n'</code>, <code>DISCONNECTED_NODES = 'd'</code>, <code>DEFER_BLOCK_ID = 'di'</code>).

Decoded, the map says: "this component (entry <code>0</code>, because <code>ngh="0"</code>) has a container at template slot 4 (the <code>@for</code>), which uses template <code>t0</code>; it rendered views of that template with 1 root node each, and there are 2 of them in a row." That is how the browser knows that two <code>&lt;li&gt;</code> belong to the loop before the loop has run.

The other pieces:

| Marker | Meaning |
| :--- | :--- |
| <code>ngh="N"</code> on a host | Index of this component's entry in <code>__nghData__</code> |
| <code>&lt;!--container--&gt;</code> | Anchor comment where a container (<code>@if</code>, <code>@for</code>, [<code>ng-container</code>](/interview-question/what-are-ng-container-and-ng-template)) ends |
| <code>&lt;!--nghm--&gt;</code> | **Integrity marker**: proves the HTML is exactly what the server produced |
| <code>ngb="d0"</code> | The element belongs to dehydrated <code>@defer</code> block <code>d0</code> (incremental hydration) |
| <code>jsaction="click:;"</code> | Event replay should capture clicks on this element |
| <code>ngskiphydration</code> | This component was opted out (see [ngSkipHydration](/interview-question/how-do-you-handle-ssr-hydration-mismatch-errors-using-ngskiphydration)) |

## 3. What the Browser Checks

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="For each template instruction the browser takes the next DOM node from the server map, compares its type and tag, and either claims it or throws NG0500">
  <defs>
    <marker id="q3mm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="130" y="70" text-anchor="middle">Template says</text>
  <text class="d-sub" x="130" y="92" text-anchor="middle">create element tr</text>
  <path class="d-edge" d="M 234 75 L 290 75" marker-end="url(#q3mm-arrow)"/>
  <rect class="d-box-accent" x="296" y="40" width="200" height="70" rx="10"/>
  <text class="d-text d-accent" x="396" y="70" text-anchor="middle">Next DOM node</text>
  <text class="d-sub" x="396" y="92" text-anchor="middle">found via the ngh map</text>
  <path class="d-edge" d="M 500 75 L 556 75" marker-end="url(#q3mm-arrow)"/>
  <rect class="d-box" x="562" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="627" y="80" text-anchor="middle">Same tag?</text>
  <path class="d-edge-accent" d="M 600 114 L 470 176" marker-end="url(#q3mm-arrow)"/>
  <path class="d-edge-dashed" d="M 660 114 L 660 176" marker-end="url(#q3mm-arrow)"/>
  <rect class="d-box-accent" x="250" y="182" width="260" height="70" rx="10"/>
  <text class="d-text d-accent" x="380" y="212" text-anchor="middle">Yes: claim the node</text>
  <text class="d-sub" x="380" y="234" text-anchor="middle">then update its text and bindings</text>
  <rect class="d-box-muted" x="560" y="182" width="140" height="70" rx="10"/>
  <text class="d-text" x="630" y="212" text-anchor="middle">No: NG0500</text>
  <text class="d-sub" x="630" y="234" text-anchor="middle">expected vs actual</text>
</svg>

The check is about **shape**: node type, element tag, and that a node exists where the map says one should. Values are not compared. Once a node is claimed, the normal binding update runs and overwrites text or properties that differ.

## 4. Verified: two harmless differences and one real mismatch

The first example has three child components. <code>GreetingComponent</code> prints "server" or "browser" depending on the platform. <code>BadgeComponent</code> takes a different <code>@if</code> branch on each side. <code>PricesComponent</code> contains <code>&lt;table&gt;&lt;tr&gt;...&lt;/tr&gt;&lt;/table&gt;</code>. The server rendered:

\`\`\`
<app-greeting ngh="0"><p>Rendered on the server</p></app-greeting><app-badge ngh="1"><!--container--><b>static</b><!--container--></app-badge><app-prices ngh="0"><table><tr><td>Tea</td><td>2.50</td></tr></table></app-prices>
\`\`\`

Hydrating it in the browser:

\`\`\`
ERROR RuntimeError: NG0500: During hydration Angular expected <tr> but found <tbody>.

Angular expected this DOM:

<table>
  <tr>…</tr>  <-- AT THIS LOCATION
  …
</table>

Actual DOM is:

<table>
  <tbody>…</tbody>  <-- AT THIS LOCATION
</table>
...
To fix this problem:
  * check the "PricesComponent" component for hydration-related issues
  * check to see if your template has valid HTML structure
  * check if there are any third-party scripts that manipulate the DOM. ...
  * or skip hydration by adding the \`ngSkipHydration\` attribute to its host node in a template
...
bootstrapApplication REJECTED with NG0500
BROWSER DOM: <app-greeting><p>Rendered on the server</p></app-greeting><app-badge><!--container--><b>static</b><!--container--></app-badge><app-prices><table><tbody><tr><td>Tea</td><td>2.50</td></tr></tbody></table></app-prices>
\`\`\`

(<code>...</code> marks lines cut from the long message.) Two lessons. First, the server string had no <code>&lt;tbody&gt;</code>, but the DOM the browser built from it did: the HTML parser inserts it, exactly as the spec says. Second, the failure was not contained: the mismatch happened while bootstrapping the root, so <code>bootstrapApplication</code> rejected and the page stayed as static server HTML, still saying "server" and "static".

The second example is identical except for an explicit <code>&lt;tbody&gt;</code>:

\`\`\`
Angular hydrated 4 component(s) and 20 node(s), 0 component(s) were skipped. 0 defer block(s) were configured to use incremental hydration. Learn more at https://v22.angular.dev/guide/hydration.
server elements reused: 9 of 10
BROWSER DOM: <app-greeting><p>Rendered on the browser</p></app-greeting><app-badge><span>live</span><!--container--><!--container--></app-badge><app-prices><table><tbody><tr><td>Tea</td><td>2.50</td></tr></tbody></table></app-prices>
\`\`\`

Now the "harmless" differences are visible. The greeting <code>&lt;p&gt;</code> was reused and its text patched to "browser". The badge's server <code>&lt;b&gt;</code> was discarded and a new <code>&lt;span&gt;</code> created; that is the one element of ten that was not reused. Neither produced an error.

📌 **Interview term: Hydration mismatch (NG0500)** — the browser DOM does not have the node Angular expects at some position. Related codes seen here: **NG0504** (<code>ngSkipHydration</code> on a non-component element) and **NG0507** (integrity marker missing).

## 5. Where Mismatches Come From

| Cause | Example | Caught when |
| :--- | :--- | :--- |
| HTML the parser repairs | <code>&lt;tr&gt;</code> directly in <code>&lt;table&gt;</code>, missing <code>&lt;tbody&gt;</code> | Browser, NG0500 (verified) |
| Invalid nesting the compiler sees | <code>&lt;p&gt;&lt;div&gt;..&lt;/div&gt;&lt;/p&gt;</code> | **Build time**: ngc failed with <code>NG5002: Unexpected closing tag "p". It may happen when the tag has already been closed by another tag.</code> |
| Direct DOM manipulation | <code>nativeElement.appendChild(...)</code> in a constructor, jQuery plugins | Browser, NG0500 (see the [ngSkipHydration question](/interview-question/how-do-you-handle-ssr-hydration-mismatch-errors-using-ngskiphydration)) |
| Something rewrites the HTML in transit | CDN or proxy minifier that strips comments | Browser, NG0507 |
| Browser extensions, injected scripts | Ad blockers, translators adding nodes | Browser, NG0500, often only for some users |

The NG0507 case was reproduced by removing all HTML comments from the server output before loading it, which is what an over-eager minifier does:

\`\`\`
bootstrapApplication REJECTED with NG0507
NG0507: Angular hydration logic detected that HTML content of this page was modified after it was produced during server side rendering. Make sure that there are no optimizations that remove comment nodes from HTML enabled on your CDN. Angular hydration relies on HTML produced by the server, including whitespaces and comment nodes. Find more at https://v22.angular.dev/errors/NG0507
\`\`\`

## 6. How Bad Is a Mismatch? It Depends Where

The same NG0500 behaved differently in two runs:

- In the root component's own template (the example above), <code>bootstrapApplication</code> **rejected**. The app never started.
- Inside an <code>@if</code> block that rendered after bootstrap (a separate test with a component calling <code>appendChild</code> in its constructor), the error was **logged through the ErrorHandler** and the app kept running. The section was damaged instead: the host ended up with two <code>&lt;hr&gt;</code> elements, one from the server and one from the browser.

Neither is acceptable in production, but the second is easier to miss. Treat every NG0500 in the console as a bug, and consider failing CI on it, for example by running an SSR + hydration smoke test like the one used for this page.

## 7. A Debugging Routine

1. Read the component name in "check the ... component". It is usually right.
2. Compare the "expected" and "actual" diagrams: <code>&lt;tr&gt;</code> vs <code>&lt;tbody&gt;</code> means invalid HTML; an extra unknown element means something injected DOM.
3. View the raw server response (not the DOM inspector, which shows the repaired DOM) and look for invalid nesting.
4. Search the component for <code>nativeElement</code>, <code>document.</code>, <code>innerHTML</code> and third-party init calls. Move them to [<code>afterNextRender</code>](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks), which never runs on the server, or to a [Renderer2](/interview-question/why-use-renderer2-instead-of-direct-dom-access) call made after hydration.
5. Only if the component genuinely cannot be fixed (a legacy widget), add <code>ngSkipHydration</code> to its host.

## 8. Common Pitfalls

- **Trusting the browser inspector.** It shows the DOM *after* the parser fixed your HTML, so <code>&lt;tbody&gt;</code> looks like it was always there. Look at the response body.
- **Assuming any difference is a mismatch.** Different text and different <code>@if</code> branches are handled (verified); they cost reuse and can cause layout jumps, but they do not throw.
- **Assuming a mismatch is always local.** In the root component it made bootstrap reject (verified); the whole app stayed static.
- **CDN "optimise HTML" settings.** Stripping comments removes <code>&lt;!--nghm--&gt;</code> and the container anchors; you get NG0507.
- **Sprinkling <code>ngSkipHydration</code> to silence errors.** It turns off reuse for that subtree and hides real HTML bugs; fix the cause first.
- **Using <code>isPlatformBrowser</code> to render different structures.** Prefer the same structure on both sides and change only values, or defer browser-only UI with [<code>@defer</code>](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The mechanism:</strong> <span style="color:#f0e2c8;">"During SSR Angular serialises a map of every view into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng-state</code> and tags hosts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngh</code>; in the browser it walks the DOM with that map and claims nodes instead of creating them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What is checked:</strong> <span style="color:#f0e2c8;">"It checks structure: the expected element tag or node type at each position. Text and attribute values are just updated, so different text is not an error."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What breaks it:</strong> <span style="color:#f0e2c8;">"The DOM in the browser differing from what Angular rendered: invalid HTML the parser repairs, like a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tr&gt;</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tbody&gt;</code>, or code and libraries changing the DOM behind Angular."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What you see:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0500</code> with an expected versus actual DOM diagram; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0507</code> if something like a CDN stripped the comment markers. In my runs a mismatch during bootstrap made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code> reject."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How to fix:</strong> <span style="color:#f0e2c8;">"Fix the HTML first, move DOM work into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>, and only then reach for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngSkipHydration</code> on the one component that cannot be fixed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is rendering different text on server and browser a mismatch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. I rendered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">server</code> on the server and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">browser</code> in the browser; hydration reused the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;p&gt;</code> and patched the text node with no error. It is still a visible content change, so avoid it for things users read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@if</code> that takes a different branch in the browser?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Also not an error in my test: the server sent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;b&gt;static&lt;/b&gt;</code>, the browser wanted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;span&gt;live&lt;/span&gt;</code>, and Angular dropped the dehydrated branch and created the new one. You lose node reuse for that block, and the content jumps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a table without tbody fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser HTML parser inserts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tbody&gt;</code> automatically, but Angular rendered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tr&gt;</code> directly inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;table&gt;</code>. When it walks the DOM it expects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tr&gt;</code> and finds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tbody&gt;</code>, so it throws NG0500. Writing the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;tbody&gt;</code> yourself fixes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nghm</code> comment for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is an integrity marker. If it is missing Angular assumes the HTML was rewritten after SSR. I stripped comments, as some CDN minifiers do, and got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG0507</code> and a rejected bootstrap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to the app when hydration throws?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends where. A mismatch while creating the root component made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bootstrapApplication</code> reject in my run, leaving the static server HTML. A mismatch inside an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@if</code> block was logged through the ErrorHandler and the app kept running with a damaged section.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hydration annotations** | <code>ngh</code> attributes and the <code>__nghData__</code> map the server writes |
| **Claiming a node** | Reusing an existing DOM node instead of creating one |
| **NG0500** | Hydration mismatch: the expected node is not there |
| **NG0504** | <code>ngSkipHydration</code> used on an element that is not a component host |
| **NG0507** | Integrity marker missing: HTML changed after SSR |
| **<code>&lt;!--nghm--&gt;</code>** | Comment that proves the HTML was not rewritten |
| **Container anchor** | <code>&lt;!--container--&gt;</code> comment marking where a block ends |

---
**Conclusion:** Angular hydration is a guided walk: the server serialises a compact map of every view, and the browser uses it to claim each DOM node in order, checking only structure, not values. That is why different text or a different <code>@if</code> branch passed in the verified runs, while a <code>&lt;tr&gt;</code> without <code>&lt;tbody&gt;</code> failed with NG0500, because the browser parser had changed the structure before Angular looked. The fix is almost always valid HTML and keeping DOM manipulation out of rendering; <code>ngSkipHydration</code> is the escape hatch, not the cure.`,
    examples: [
      {
        label: "Three components: two harmless server and browser differences, one real mismatch (NG0500)",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { provideClientHydration } from "@angular/platform-browser";

// SAFE: only a text value differs. Hydration reuses the <p> and updates its text.
@Component({ selector: "app-greeting", template: \`<p>Rendered on the {{ where }}</p>\` })
export class GreetingComponent {
  where = isPlatformBrowser(inject(PLATFORM_ID)) ? "browser" : "server";
}

// SAFE: a different @if branch. Angular drops the server branch and creates the browser one.
@Component({
  selector: "app-badge",
  template: \`@if (browser) { <span>live</span> } @else { <b>static</b> }\`,
})
export class BadgeComponent {
  browser = isPlatformBrowser(inject(PLATFORM_ID));
}

// UNSAFE: the browser parser fixes this table (it inserts <tbody>), so the DOM no longer
// matches what Angular rendered on the server.
@Component({
  selector: "app-prices",
  template: \`<table><tr><td>Tea</td><td>2.50</td></tr></table>\`,
})
export class PricesComponent {}

@Component({
  selector: "app-root",
  imports: [GreetingComponent, BadgeComponent, PricesComponent],
  template: \`<app-greeting /><app-badge /><app-prices />\`,
})
export class AppComponent {}

export const appConfig: ApplicationConfig = { providers: [provideClientHydration()] };`,
      },
      {
        label: "The fix: write the HTML the browser parser would produce (explicit tbody)",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { provideClientHydration } from "@angular/platform-browser";

// SAFE: only a text value differs. Hydration reuses the <p> and updates its text.
@Component({ selector: "app-greeting", template: \`<p>Rendered on the {{ where }}</p>\` })
export class GreetingComponent {
  where = isPlatformBrowser(inject(PLATFORM_ID)) ? "browser" : "server";
}

// SAFE: a different @if branch. Angular drops the server branch and creates the browser one.
@Component({
  selector: "app-badge",
  template: \`@if (browser) { <span>live</span> } @else { <b>static</b> }\`,
})
export class BadgeComponent {
  browser = isPlatformBrowser(inject(PLATFORM_ID));
}

// UNSAFE: the browser parser fixes this table (it inserts <tbody>), so the DOM no longer
// matches what Angular rendered on the server.
@Component({
  selector: "app-prices",
  template: \`<table><tbody><tr><td>Tea</td><td>2.50</td></tr></tbody></table>\`,
})
export class PricesComponent {}

@Component({
  selector: "app-root",
  imports: [GreetingComponent, BadgeComponent, PricesComponent],
  template: \`<app-greeting /><app-badge /><app-prices />\`,
})
export class AppComponent {}

export const appConfig: ApplicationConfig = { providers: [provideClientHydration()] };`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle SSR hydration mismatch errors using ngSkipHydration?",
    seoDescription:
      "ngSkipHydration opts one component subtree out of hydration so legacy DOM-touching widgets stop throwing NG0500. Usage, limits and cost, verified on v22.",
    description: `**Question presented to candidate:**
"We wrap an old jQuery charting plugin in an Angular component. Since turning on SSR it throws NG0500 during hydration and the page stops working. How do you use ngSkipHydration to fix this, and what does it cost?"

**What a strong answer should cover:**
- Why the plugin breaks hydration: it changes the DOM outside Angular, so the browser DOM no longer matches the server map (NG0500).
- \`ngSkipHydration\` on the **component host** (template attribute or \`host\` metadata) skips hydration for that component and its whole subtree.
- What happens instead: server HTML is shown, then that subtree is discarded and re-rendered in the browser.
- Limits: only on component hosts (NG0504 otherwise), static attribute only (not a binding), and its presence is what counts.
- Costs: no node reuse, no event replay inside it; possible flicker for that island.
- Better fixes to try first: move plugin init to \`afterNextRender\`, fix invalid HTML, use \`@defer\` for browser-only widgets.

**Clarifying questions expected:**
- "Does the plugin need to run on the server at all, or only in the browser?"
- "Is it one component, or several places using the same widget?"

**Code / implementation expected:** Yes — a component with \`ngSkipHydration\`, ideally both the template and the \`host\` metadata form.`,
    answer: `**Target Audience:** Developers who hit NG0500 hydration errors from a component they cannot easily rewrite.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The example was AOT-compiled with <code>ngc</code>, rendered with <code>renderApplication</code> (Angular 22.2.3) and hydrated in jsdom, with and without <code>ngSkipHydration</code>; every error and log line below was printed by those runs.

## 1. Why This Even Matters — A Story First

A building inspector checks a new house against the architect's plans, room by room. One room was fitted out by the previous owner's handyman: shelves bolted on, a wall moved. It will never match the plans. If the inspector insists on checking it, the whole inspection fails and nobody can move in.

The practical answer is a note on the door: "inspect everything except this room; we will refit it ourselves". The house passes, the family moves in, and that one room is stripped and rebuilt properly later the same day.

<code>ngSkipHydration</code> is that note. Hydration is the inspection (the browser checks the server DOM against Angular's plan, see [how hydration matches nodes](/interview-question/how-does-ssr-hydration-work-in-angular-non-destructive-hydration-and-mismatches)). The handyman's room is a component that writes DOM behind Angular's back.

## 2. The Core Idea

📌 **Interview term: <code>ngSkipHydration</code>** — a static attribute you put on a **component's host element**. Angular then does not hydrate that component or anything rendered inside it. The [server](/interview-question/what-is-angular-universal-ssr) still renders the HTML; in the browser that subtree is thrown away and rendered from scratch.

📌 **Interview term: Hydration island (skipped subtree)** — the part of the page that behaves like the old destructive hydration while everything around it is reused.

Why components that touch the DOM directly cause trouble: the same constructor runs twice, once on the server and once in the browser. On the server it changes the HTML that is sent. In the browser it changes the DOM again *before* Angular has finished matching it. Either way the browser DOM no longer matches the map Angular wrote on the server.

## 3. Verified: the legacy widget, without the attribute

The example stands in for a jQuery or charting plugin that writes to its host through [ElementRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref), with a function that inserts a banner <code>&lt;div&gt;</code> into its host. It is used by two components. First, without any skip, the server rendered:

\`\`\`
<app-legacy-chart><div>plugin banner</div><p>chart body</p></app-legacy-chart>
\`\`\`

Then, in the browser, the constructor ran again and inserted a second banner before Angular could claim the <code>&lt;p&gt;</code>:

\`\`\`
ERROR RuntimeError: NG0500: During hydration Angular expected <p> but found <div>.

Angular expected this DOM:

<app-legacy-chart>
  <p>…</p>  <-- AT THIS LOCATION
  …
</app-legacy-chart>

Actual DOM is:

<app-legacy-chart>
  <div>…</div>  <-- AT THIS LOCATION
  …
</app-legacy-chart>
...
bootstrapApplication REJECTED with NG0500
BROWSER DOM: <h1>Dashboard</h1><app-legacy-chart><div>plugin banner</div><div>plugin banner</div><p>chart body</p></app-legacy-chart><app-legacy-map ngskiphydration="true"><div>plugin banner</div></app-legacy-map><button jsaction="click:;">Click</button>
\`\`\`

The page is now broken in three visible ways: the banner is doubled, the map body is gone, and because bootstrap rejected, the button still carries its pre-hydration <code>jsaction</code> marker and does nothing.

## 4. Verified: with <code>ngSkipHydration</code>

The example as shown on this page puts <code>ngSkipHydration</code> on <code>&lt;app-legacy-chart&gt;</code> in the parent template, and <code>LegacyMapComponent</code> opts itself out through <code>host: { ngSkipHydration: "true" }</code>. Server HTML:

\`\`\`
<app-root ng-version="22.2.3" ngh="0" ng-server-context="other"><h1>Dashboard</h1><app-legacy-chart ngskiphydration=""><div>plugin banner</div><p>chart body</p></app-legacy-chart><app-legacy-map ngskiphydration="true"><div>plugin banner</div><p>map body</p></app-legacy-map><button jsaction="click:;">Click</button></app-root><script id="ng-state" type="application/json">{"__nghData__":[{}]}</script>
\`\`\`

Browser, with a click on the button made before Angular loaded:

\`\`\`
clicked the button BEFORE Angular booted in the browser
Angular hydrated 1 component(s) and 7 node(s), 2 component(s) were skipped. 0 defer block(s) were configured to use incremental hydration. Learn more at https://v22.angular.dev/guide/hydration.
server elements reused: 4 of 8
BROWSER DOM: <h1>Dashboard (clicked)</h1><app-legacy-chart ngskiphydration=""><div>plugin banner</div><p>chart body</p></app-legacy-chart><app-legacy-map ngskiphydration="true"><div>plugin banner</div><p>map body</p></app-legacy-map><button>Click</button>
\`\`\`

Reading it:

- **No error, and one banner each.** The skipped hosts were emptied and re-rendered, so the plugin ran once on a clean host.
- **"2 component(s) were skipped"** is how you confirm the attribute is doing something.
- **4 of 8 elements reused.** The <code>&lt;h1&gt;</code>, both host elements and the button were claimed; the four elements *inside* the skipped hosts were recreated. That is the cost.
- **Event replay still worked outside the islands**: the early click changed the heading.

Inside an island it does not. A separate test put a <code>(click)</code> button inside a skipped component: the server HTML had no <code>jsaction</code> on it (<code>&lt;app-w ngskiphydration=""&gt;&lt;button&gt;inner 0&lt;/button&gt;&lt;/app-w&gt;</code>), and a click made before boot was lost (<code>inner 0</code> afterwards).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="The page is hydrated and reused, while the component marked ngSkipHydration is cleared and rendered fresh in the browser">
  <rect class="d-box" x="30" y="30" width="660" height="190" rx="12"/>
  <text class="d-text" x="360" y="58" text-anchor="middle">app-root: hydrated, nodes reused, events replayed</text>
  <rect class="d-box-accent" x="60" y="86" width="180" height="104" rx="10"/>
  <text class="d-text d-accent" x="150" y="128" text-anchor="middle">h1 and button</text>
  <text class="d-sub" x="150" y="152" text-anchor="middle">claimed</text>
  <rect class="d-box-muted" x="290" y="86" width="370" height="104" rx="10"/>
  <text class="d-text" x="475" y="122" text-anchor="middle">app-legacy-chart ngSkipHydration</text>
  <text class="d-sub" x="475" y="148" text-anchor="middle">children removed and rendered again</text>
  <text class="d-sub" x="475" y="170" text-anchor="middle">no node reuse, no event replay inside</text>
</svg>

The diagram is the whole trade: everything outside the island keeps the benefits of hydration; the island gets correctness at the price of a re-render.

## 5. Two Ways to Apply It

| Form | Code | Use when |
| :--- | :--- | :--- |
| In the parent template | <code>&lt;app-legacy-chart ngSkipHydration /&gt;</code> | Only some usages are problematic, or you do not own the component |
| In the component's metadata (like other [host bindings](/interview-question/what-do-hostlistener-and-hostbinding-do)) | <code>host: { ngSkipHydration: "true" }</code> | The component can never hydrate; nobody should have to remember the attribute |

What does **not** work, all verified on 22.2.3:

- **A plain element.** <code>&lt;div ngSkipHydration&gt;</code> made bootstrap reject with:

\`\`\`
NG0504: The \`ngSkipHydration\` flag is applied on a node that doesn't act as a component host. Hydration can be skipped only on per-component basis.
\`\`\`

  Wrap the markup in a small component instead.
- **A binding.** <code>[ngSkipHydration]="true"</code> failed to compile with <code>NG8002: Can't bind to 'ngSkipHydration' since it isn't a known property</code>, plus the extended diagnostic <code>NG8108: ngSkipHydration should not be used as a binding</code>.
- **<code>ngSkipHydration="false"</code>.** The component was still skipped ("2 component(s) were skipped"): the attribute's presence is what counts. Remove it to re-enable hydration.

## 6. Before You Reach for It

<code>ngSkipHydration</code> hides the symptom. These remove the cause and keep the benefits:

1. **Run the plugin only in the browser, after hydration.** Move the init call into <code>afterNextRender(() =&gt; legacyPlugin(host))</code>. It never runs on the server, and in the browser it runs after the first render, so hydration has already matched the nodes. Verified by changing only <code>LegacyChartComponent</code> that way and removing its <code>ngSkipHydration</code>: the server sent <code>&lt;app-legacy-chart ngh="0"&gt;&lt;p&gt;chart body&lt;/p&gt;&lt;/app-legacy-chart&gt;</code> (no banner), and the browser logged <code>Angular hydrated 2 component(s) and 10 node(s), 1 component(s) were skipped</code> with no error; the one skip left is the map. See [afterRender vs afterNextRender](/interview-question/what-is-the-difference-between-afterrender-and-afternextrender-lifecycle-hooks).
2. **Keep the widget off the server entirely** with <code>@defer (on viewport)</code> or <code>on idle</code>: the server sends the placeholder and the widget loads in the browser. Covered in [deferrable views](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17).
3. **Fix invalid HTML** such as missing <code>&lt;tbody&gt;</code>; skipping is the wrong tool for that.
4. **Use Angular APIs** (<code>Renderer2</code>, bindings) rather than raw DOM calls. See [why Renderer2](/interview-question/why-use-renderer2-instead-of-direct-dom-access).

| Approach | Server HTML shows widget | Node reuse | Early events | Effort |
| :--- | :--- | :--- | :--- | :--- |
| <code>ngSkipHydration</code> | Yes | No, inside the island | Lost inside the island | One attribute |
| Plugin in <code>afterNextRender</code> | Yes, without the plugin output | Yes (verified) | Replayed | Small refactor |
| <code>@defer</code> without hydrate trigger | Placeholder only | Rest of page yes | Outside the block | Small refactor |

## 7. Common Pitfalls

- **Putting it on a wrapper <code>&lt;div&gt;</code>.** It only works on component hosts (NG0504, verified).
- **Writing <code>ngSkipHydration="false"</code> to undo it.** Still skipped (verified); delete the attribute.
- **Binding it.** Compile error NG8002 plus diagnostic NG8108 (verified).
- **Putting it on the root component "to make the errors go away".** That turns hydration off for the entire app, which is the destructive behaviour you enabled SSR to avoid.
- **Forgetting it disables event replay inside.** Early clicks inside the island are lost (verified); keep critical buttons outside it.
- **Using it for every mismatch.** If the cause is invalid HTML or a CDN stripping comments, skipping one component will not help; read the NG0500 or NG0507 message first, as described in the [mismatch question](/interview-question/how-does-ssr-hydration-work-in-angular-non-destructive-hydration-and-mismatches).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngSkipHydration</code> is a static attribute on a component host that tells Angular not to hydrate that component or anything inside it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What happens instead:</strong> <span style="color:#f0e2c8;">"The server still renders it, but in the browser Angular discards that subtree and renders it fresh, like the old destructive hydration, just for that one island."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to use it:</strong> <span style="color:#f0e2c8;">"For components you cannot make hydration-safe, typically legacy widgets or third-party libraries that write DOM directly and would otherwise cause NG0500."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where to put it:</strong> <span style="color:#f0e2c8;">"On the host element in a parent template, or in the component's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">host: { ngSkipHydration: 'true' }</code> metadata so every usage is covered. Not on plain elements: that throws NG0504."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">"It is a last resort: you lose node reuse and event replay for that subtree. Fix invalid HTML and move DOM work to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code> first."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the console say when components are skipped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The dev-mode hydration log counts them. In my run: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Angular hydrated 1 component(s) and 7 node(s), 2 component(s) were skipped</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngSkipHydration="false"</code> turn it back on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. I tried it and the component was still skipped, because Angular looks at the attribute being present. Remove the attribute instead, and do not bind it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[ngSkipHydration]</code> fails to compile with NG8002 and the extended diagnostic NG8108 warns that it should not be a binding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I put it on a div around the bad markup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, hydration is skipped per component. On a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;div&gt;</code> I got NG0504, 'Hydration can be skipped only on per-component basis', and bootstrap rejected. Wrap the markup in a small component and skip that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is skipping the same as not rendering on the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The server HTML still contains the component, so crawlers see it and it paints early. Only the browser-side reuse is skipped. To keep something off the server entirely, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> without a hydrate trigger or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterNextRender</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ngSkipHydration</code> on the root component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only as a temporary escape while migrating, because it disables hydration for the whole app. It is better to find the few offending components with the NG0500 message, which names them.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>ngSkipHydration</code>** | Static host attribute: do not hydrate this component subtree |
| **Hydration island** | A skipped subtree that is re-rendered in the browser |
| **NG0500** | Hydration mismatch: expected node not found |
| **NG0504** | <code>ngSkipHydration</code> on a node that is not a component host |
| **NG8108** | Extended diagnostic: <code>ngSkipHydration</code> used as a binding |
| **<code>host</code> metadata** | Attributes a component puts on its own host element |

---
**Conclusion:** <code>ngSkipHydration</code> is a scalpel for one specific problem: a component that changes the DOM outside Angular and therefore can never match the server's hydration map. Verified on 22.2.3, it turned an NG0500 that stopped the whole app from bootstrapping into a clean render, with two components reported as skipped and every node outside them still reused. It works only on component hosts, only as a plain attribute, and it gives up node reuse and event replay inside the island, so use it after you have tried <code>afterNextRender</code> or <code>@defer</code>, not instead of them.`,
    examples: [
      {
        label: "Opting two legacy DOM-writing widgets out of hydration: in the template and in host metadata",
        tech: "angular",
        runnable: false,
        code: `import { ApplicationConfig, Component, ElementRef, inject, signal } from "@angular/core";
import { provideClientHydration } from "@angular/platform-browser";

// Stands in for a jQuery or charting plugin: it writes DOM behind Angular back,
// on the server AND again in the browser.
function legacyPlugin(host: HTMLElement) {
  const banner = host.ownerDocument.createElement("div");
  banner.textContent = "plugin banner";
  host.insertBefore(banner, host.firstChild);
}

@Component({ selector: "app-legacy-chart", template: \`<p>chart body</p>\` })
export class LegacyChartComponent {
  constructor() { legacyPlugin(inject(ElementRef).nativeElement); }
}

// Same problem, but the component opts itself out, so no caller can forget.
@Component({
  selector: "app-legacy-map",
  template: \`<p>map body</p>\`,
  host: { ngSkipHydration: "true" },
})
export class LegacyMapComponent {
  constructor() { legacyPlugin(inject(ElementRef).nativeElement); }
}

@Component({
  selector: "app-root",
  imports: [LegacyChartComponent, LegacyMapComponent],
  template: \`
    <h1>{{ title() }}</h1>
    <app-legacy-chart ngSkipHydration />
    <app-legacy-map />
    <button (click)="title.set('Dashboard (clicked)')">Click</button>
  \`,
})
export class AppComponent {
  title = signal("Dashboard");
}

export const appConfig: ApplicationConfig = { providers: [provideClientHydration()] };`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Deferrable views — prefetch strategies and dependency isolation with @defer?",
    seoDescription:
      "How Angular compiles @defer into a dependency function with dynamic imports, what keeps a dependency eager, and how prefetch triggers fetch code early.",
    description: `**Question presented to candidate:**
"We wrapped our charting component in \`@defer\`, but the bundle analyser still shows the chart library in \`main.js\`. Explain how Angular decides what goes into a deferred chunk, and how prefetching changes when that chunk is downloaded."

**What a strong answer should cover:**
- The compiler generates a **dependency function** per \`@defer\` block that returns dynamic \`import()\`s, and removes the matching static imports.
- **Dependency isolation rules**: standalone dependencies only; not referenced eagerly elsewhere in the same file (outside the block, queries, class fields). Breaking the rule silently keeps them eager.
- Transitive dependencies: whatever the deferred component imports goes with it.
- **Prefetch triggers** (\`prefetch on idle | viewport | interaction | hover | immediate | timer(...)\`, \`prefetch when\`) download code before the render trigger fires.
- How to verify: lazy chunk in \`ng build\` output, or the compiled \`_DepsFn\`.

**Clarifying questions expected:**
- "Is the chart component referenced anywhere else, for example by a query or a type used at runtime?"
- "Do we know when users usually need the chart, to choose a prefetch trigger?"

**Code / implementation expected:** Yes — a \`@defer\` block with separate \`on\` and \`prefetch\` triggers, and a look at the compiled output.`,
    answer: `**Target Audience:** Developers who already use <code>@defer</code> and want to know what the compiler does with it, and how to control when code is downloaded.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The compiled code in sections 3 and 4 is real <code>ngc</code> output (see [how Ivy compilation works](/interview-question/how-does-compilation-work-under-the-hood-in-ivy)) from Angular 22.2.3. The prefetch timings in section 6 come from running that compiled output in Node with jsdom, where a dynamic <code>import()</code> of a local file stands in for the network download; real network timing was not measured.

## 1. Why This Even Matters — A Story First

A furniture shop delivers your sofa on Monday. The matching footstool is "deferred": it comes only if you ask for it. That works only if the warehouse packed the footstool in a separate box. If somebody taped it to the sofa, it arrives on Monday anyway, whatever you asked for.

And even when it *is* in its own box, the shop can be clever about timing: if you are looking at footstools on their website, they can load the van now, so when you finally say "yes" it arrives in minutes rather than days. Loading the van is **prefetching**; handing it over is **rendering**.

<code>@defer</code> is how you ask for the footstool. This page is about the two things that decide whether it actually works: **dependency isolation** (is it in its own box?) and **prefetch triggers** (when is the van loaded?). The basics of the block itself are in [what deferrable views are](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17).

## 2. The Core Idea

📌 **Interview term: Dependency function (<code>DepsFn</code>)** — for every <code>@defer</code> block, the compiler emits a function that returns the block's dependencies. Dependencies that can be deferred appear as dynamic <code>import()</code> calls; the others appear as plain class references.

📌 **Interview term: Dependency isolation** — the conditions under which a dependency can be moved into a lazy chunk: it is [standalone](/interview-question/what-are-standalone-components), and nothing else in the same file uses it eagerly. Only then can the compiler delete the static <code>import</code> at the top of the file.

📌 **Interview term: Prefetch trigger** — <code>prefetch on ...</code> or <code>prefetch when ...</code> on a <code>@defer</code> block. It runs the dependency function early, so the code is downloaded before the block's render trigger fires.

## 3. Verified: what ngc does with a <code>@defer</code> block

The first example imports three components from their own files. <code>ChartCmp</code> is used only inside the first <code>@defer</code>, <code>ReviewsCmp</code> only inside the second, and <code>BadgeCmp</code> both inside the first block and once outside it. The top of the compiled <code>app.js</code>:

\`\`\`
import { Component } from "@angular/core";
import { BadgeCmp } from "./shared";
import * as i0 from "@angular/core";
const AppComponent_Defer_5_DepsFn = () => [/* @ts-ignore */
    import("./chart").then(m => m.ChartCmp), BadgeCmp];
const AppComponent_Defer_9_DepsFn = () => [/* @ts-ignore */
    import("./reviews").then(m => m.ReviewsCmp)];
\`\`\`

And the instructions inside the component's template function:

\`\`\`
i0.ɵɵdefer(5, 1, AppComponent_Defer_5_DepsFn, 2, 3, 4, 0, 1, i0.ɵɵdeferEnableTimerScheduling);
i0.ɵɵdeferOnViewport(0, -1);
i0.ɵɵdeferPrefetchOnIdle();
...
i0.ɵɵenableIncrementalHydrationRuntime();
i0.ɵɵdefer(9, 7, AppComponent_Defer_9_DepsFn, null, 8, null, null, null, null, 1);
i0.ɵɵdeferHydrateOnHover();
i0.ɵɵdeferOnInteraction(0, -1);
...
} }, dependencies: [BadgeCmp], encapsulation: 2 });
\`\`\`

What to read from it:

- **The static imports of <code>./chart</code> and <code>./reviews</code> are gone.** Only <code>./shared</code> is still imported at the top. A bundler sees no static path to <code>chart</code> and puts it in its own chunk.
- **<code>BadgeCmp</code> is a plain reference in the first <code>DepsFn</code>** and is in the component's eager <code>dependencies</code>, because the template also uses it outside the block.
- **Each trigger is its own instruction**: <code>ɵɵdeferOnViewport</code> (render), <code>ɵɵdeferPrefetchOnIdle</code> (download), <code>ɵɵdeferHydrateOnHover</code> (incremental hydration). The <code>minimum</code>/<code>after</code> numbers from <code>@placeholder (minimum 500ms)</code> and <code>@loading (after 100ms; minimum 1s)</code> live in the <code>consts</code> array (<code>[[1000, 100], [500]]</code>), and <code>ɵɵdeferEnableTimerScheduling</code> is only added because those timers exist.
- A <code>hydrate</code> trigger also pulls in <code>ɵɵenableIncrementalHydrationRuntime()</code>, see [hydration in modern Angular](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat).

When the same kind of component was built with the CLI (<code>ng build</code>, [esbuild](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve)), the result was visible in the build summary as its own lazy chunk:

\`\`\`
Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-WKRL4RHH.js   | chart         | 299 bytes |               299 bytes
\`\`\`

## 4. Verified: how isolation silently breaks

The same file again, with one extra line in the class: a field that refers to the chart component.

\`\`\`
export class AppComponent {
  // Any eager reference to the class (here a field) defeats the split.
  chartType = ChartCmp;
}
\`\`\`

Compiled:

\`\`\`
import { Component } from "@angular/core";
import { ChartCmp } from "./chart";
import { BadgeCmp } from "./shared";
import * as i0 from "@angular/core";
const AppComponent_Defer_5_DepsFn = () => [ChartCmp, BadgeCmp];
const AppComponent_Defer_9_DepsFn = () => [/* @ts-ignore */
    import("./reviews").then(m => m.ReviewsCmp)];
\`\`\`

<code>ChartCmp</code> is back as a static import and the dependency function returns it directly. **<code>ngc</code> printed no warning.** The block still works and still shows its placeholder first, so nothing looks wrong in the app; the chart is simply in the main bundle.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="A component used only inside defer becomes a dynamic import in its own chunk, while a component also referenced eagerly stays a static import in the main bundle">
  <defs>
    <marker id="q5iso-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="300" height="80" rx="10"/>
  <text class="d-text" x="180" y="72" text-anchor="middle">ChartCmp used only</text>
  <text class="d-text" x="180" y="96" text-anchor="middle">inside the defer block</text>
  <path class="d-edge-accent" d="M 180 124 L 180 166" marker-end="url(#q5iso-arrow)"/>
  <rect class="d-box-accent" x="30" y="172" width="300" height="70" rx="10"/>
  <text class="d-text d-accent" x="180" y="202" text-anchor="middle">import() in DepsFn</text>
  <text class="d-sub" x="180" y="224" text-anchor="middle">own lazy chunk</text>
  <rect class="d-box" x="390" y="40" width="300" height="80" rx="10"/>
  <text class="d-text" x="540" y="72" text-anchor="middle">ChartCmp also used outside</text>
  <text class="d-text" x="540" y="96" text-anchor="middle">or referenced in class code</text>
  <path class="d-edge" d="M 540 124 L 540 166" marker-end="url(#q5iso-arrow)"/>
  <rect class="d-box-muted" x="390" y="172" width="300" height="70" rx="10"/>
  <text class="d-text" x="540" y="202" text-anchor="middle">static import kept</text>
  <text class="d-sub" x="540" y="224" text-anchor="middle">stays in the main bundle</text>
</svg>

The decision is made per file and per class reference, which is why it is easy to break from a distance: a teammate adds a [<code>viewChild(ChartCmp)</code> query](/interview-question/viewchild-signal-queries-vs-viewchild-decorator-what-changed) or a type check that needs the class at runtime, and the chunk disappears.

**Rules of thumb for isolation:**

| Keeps the dependency lazy | Makes it eager |
| :--- | :--- |
| Standalone component, directive or pipe used only inside <code>@defer</code> | Also used in the same template outside the block |
| Imported from its own file | Referenced in class code: field, <code>viewChild(ChartCmp)</code>, <code>instanceof</code> |
| Its own imports (a chart library) are only reached through it | Another eagerly loaded file imports it, or its heavy library, statically |

Type-only uses are erased by TypeScript and do not count: with <code>chart?: ChartCmp;</code> as the field instead, the compiled <code>DepsFn</code> still contained <code>import("./chart")</code>. A value use does count.

## 5. Prefetch Triggers

The render trigger answers "when should the user see it?". The prefetch trigger answers "when should the code start downloading?". They are independent:

| Prefetch trigger | Starts the download | Good for |
| :--- | :--- | :--- |
| <code>prefetch on idle</code> | When the browser is idle after load | Things most users will open soon |
| <code>prefetch on viewport</code> | When the placeholder approaches the screen | Long pages; render on interaction later |
| <code>prefetch on hover</code> | Pointer over the placeholder (or a referenced element) | Buttons that open heavy panels |
| <code>prefetch on interaction</code> | First click or keydown | Rarely useful alone; it is the render trigger already |
| <code>prefetch on immediate</code> | Right after the parent renders | Code you want soon but not blocking the initial bundle |
| <code>prefetch on timer(2s)</code> | After a fixed delay | Simple "warm up after load" |
| <code>prefetch when cond</code> | When the expression becomes truthy | App knowledge, such as "user reached step 3" |

The full list of render triggers, with a runnable demo, is in [the @defer triggers question](/interview-question/how-does-the-defer-block-work-and-what-triggers-are-available).

## 6. Verified: prefetch versus no prefetch

The second example defers a chart in another file with <code>@defer (on interaction; prefetch on timer(100ms))</code>. <code>chart.ts</code> logs when its module is evaluated, which is the moment the chunk would have arrived in a browser. The compiled output was booted in jsdom and the button clicked after 250 ms. Times are milliseconds since the script started, including loading Angular:

\`\`\`
[514ms] booted, DOM: "Show chart"
  [608ms] chart.js module evaluated (chunk downloaded)
[766ms] 250ms later, DOM: "Show chart"
[865ms] clicked, DOM: "chart ready"
\`\`\`

The same file with <code>prefetch on timer(100ms)</code> removed:

\`\`\`
[330ms] booted, DOM: "Show chart"
[583ms] 250ms later, DOM: "Show chart"
  [593ms] chart.js module evaluated (chunk downloaded)
[611ms] clicked, DOM: "chart ready"
\`\`\`

With prefetch, the module was evaluated about 100 ms after boot while the placeholder stayed on screen; the click only had to render. Without it, the import started at the click. Locally that gap is milliseconds; on a slow mobile connection it is the difference between an instant panel and a loading spinner, which this setup cannot measure.

## 7. Common Pitfalls

- **Assuming <code>@defer</code> always splits.** It does only when the dependency is isolated; one eager reference keeps it in <code>main.js</code> with no warning (verified).
- **Deferring something tiny.** A 300-byte chunk costs a request and a placeholder flash. Defer the heavy parts: charts, editors, maps, below-the-fold sections.
- **Prefetching on the same event that renders.** <code>prefetch on interaction</code> next to <code>on interaction</code> gains nothing; pick an earlier prefetch such as <code>hover</code> or <code>idle</code>.
- **Forgetting the transitive imports.** Deferring a thin wrapper does not help if the heavy library is also imported statically elsewhere.
- **Relying on <code>viewport</code> triggers in non-browser test environments.** They need <code>IntersectionObserver</code>; jsdom has none, and an <code>@defer (on viewport)</code> block there logged <code>ReferenceError: IntersectionObserver is not defined</code> and stayed on its placeholder.
- **Checking only the app, not the build.** Confirm in <code>ng build</code> output that a lazy chunk exists, or read the compiled <code>_DepsFn</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The compiler move:</strong> <span style="color:#f0e2c8;">"For each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> block the compiler generates a dependency function that returns dynamic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code> calls, and deletes the matching static imports from the file, so the bundler puts those components in their own chunk."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The isolation rule:</strong> <span style="color:#f0e2c8;">"That only works if the dependency is standalone and is not referenced eagerly anywhere else in the file. A component also used outside the block, or even referenced from a class field, stays in the main bundle, with no warning."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two separate questions:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on</code> triggers decide when to render; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetch</code> triggers decide when to download. Splitting them lets you fetch on idle or hover and still render on click."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">"In my run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetch on timer(100ms)</code> evaluated the chunk about 100 ms after boot while the placeholder stayed; without prefetch the chunk only loaded at the click."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How to check it:</strong> <span style="color:#f0e2c8;">"Look for a lazy chunk named after the component in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng build</code> output, or read the compiled <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_DepsFn</code>: dynamic imports mean it worked."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly does the compiler generate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A function such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AppComponent_Defer_5_DepsFn = () =&gt; [import("./chart").then(m =&gt; m.ChartCmp), BadgeCmp]</code>, passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ɵɵdefer</code>. Deferred-only dependencies become dynamic imports; anything also used eagerly is listed directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a deferred component still be in main.js?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because something else in the file needs it eagerly: use outside the block, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewChild(ChartCmp)</code> query, or any code reference. I added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chartType = ChartCmp;</code> as a field and the compiler silently switched to an eager import.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which prefetch trigger would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetch on idle</code> for things the user will probably need soon, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetch on hover</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on viewport</code> for something they are reaching for, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetch when</code> for app-specific signals like a step in a wizard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does prefetching render anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It runs the dependency function so the code is downloaded and evaluated, but the block stays on its placeholder until its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">when</code> trigger fires.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@defer</code> in tests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TestBed can control defer blocks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeferBlockBehavior.Manual</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fixture.getDeferBlocks()</code>, then render each state explicitly; that is covered in the testing question.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deferrable view** | A <code>@defer</code> block whose content and code load later |
| **Dependency function (<code>DepsFn</code>)** | Compiler-generated function listing a block's dependencies |
| **Dependency isolation** | The rule that lets a dependency move to a lazy chunk |
| **Lazy chunk** | A separate JavaScript file loaded with dynamic <code>import()</code> |
| **Render trigger** | <code>on ...</code> / <code>when ...</code>: when the block content is shown |
| **Prefetch trigger** | <code>prefetch on ...</code> / <code>prefetch when ...</code>: when its code is downloaded |
| **Eager reference** | Any value use of a class outside the block, which keeps it in the main bundle |

---
**Conclusion:** <code>@defer</code> is a compiler feature as much as a template feature. For each block <code>ngc</code> writes a dependency function and, verified on 22.2.3, turns isolated dependencies into dynamic imports while deleting their static imports; a single eager reference such as a class field silently undoes that. Once isolation holds, prefetch triggers let you separate downloading from rendering, so the code can arrive while the user is still deciding, and the block appears the moment they click.`,
    examples: [
      {
        label: "Dependency isolation: two deferred components split out, one shared component kept eager",
        tech: "angular",
        runnable: false,
        code: `import { Component } from "@angular/core";
import { ChartCmp } from "./chart";
import { ReviewsCmp } from "./reviews";
import { BadgeCmp } from "./shared";

@Component({
  selector: "app-root",
  imports: [ChartCmp, ReviewsCmp, BadgeCmp],
  template: \`
    <app-badge />
    @defer (on viewport; prefetch on idle) {
      <app-chart />
      <app-badge />
    } @placeholder (minimum 500ms) {
      <p>chart placeholder</p>
    } @loading (after 100ms; minimum 1s) {
      <p>loading chart</p>
    } @error {
      <p>chart failed</p>
    }
    @defer (on interaction; hydrate on hover) {
      <app-reviews />
    } @placeholder {
      <button>Show reviews</button>
    }
  \`,
})
export class AppComponent {}`,
      },
      {
        label: "Prefetch separated from render: download on a timer, render on click",
        tech: "angular",
        runnable: false,
        code: `import { Component } from "@angular/core";
import { ChartCmp } from "./chart.js";

@Component({
  selector: "app-root",
  imports: [ChartCmp],
  template: \`
    @defer (on interaction; prefetch on timer(100ms)) {
      <app-chart />
    } @placeholder {
      <button>Show chart</button>
    }
  \`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Deferrable Views (@defer) and how do they work in Angular 17+?",
    seoDescription:
      "Deferrable views let a template lazy-load part of itself with @defer, @placeholder, @loading and @error. What each block does, with verified timings.",
    description: `**Question presented to candidate:**
"Our product page ships the comments widget and a chart library in the main bundle even though most users never scroll to them. What are deferrable views in Angular, how do the \`@defer\` blocks fit together, and what happens at runtime?"

**What a strong answer should cover:**
- \`@defer\` (v17, stable v18) lazily loads a part of a template **and** the code of the standalone components, directives and pipes inside it.
- The companion blocks: \`@placeholder\`, \`@loading\`, \`@error\`, with \`minimum\` and \`after\` timing options.
- **Triggers**: default \`on idle\`; \`on viewport | interaction | hover | timer(...) | immediate\`, \`when expr\`; plus \`prefetch\` variants.
- Runtime states: placeholder, then loading, then complete or error.
- Requirements and limits: dependencies must be isolated to split; a trigger without a target needs a \`@placeholder\`.
- SSR: the placeholder is server-rendered; \`hydrate\` triggers change that.

**Clarifying questions expected:**
- "Do we render on the server? That changes what crawlers see inside the block."
- "Is the heavy code only used in this section, or imported elsewhere too?"

**Code / implementation expected:** Yes — a \`@defer\` block with placeholder, loading and error states.`,
    answer: `**Target Audience:** Angular developers who know components and want to cut the initial bundle without restructuring routes.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The runnable example was compiled with <code>ngc</code> (strict templates) and also run in playground mode on Angular 22.2.3, then clicked by a script; the error-state and compile-error checks were separate small runs. Download times on a real network were not measured.

## 1. Why This Even Matters — A Story First

A restaurant menu has a page of desserts. The kitchen could bake every dessert the moment the restaurant opens, just in case. Most would be thrown away, and the oven would be busy when the main courses need it.

Instead, the dessert page says "ask your waiter". The ingredients are in the fridge, the recipe is known, but nothing is baked until somebody orders. When they do, the waiter brings a "coming soon" card, and then the dessert.

A normal Angular page bakes everything at opening time: every component in the template is in the bundle the browser must download before the page works. A **deferrable view** is the dessert page. The section is described in the template, but its code and rendering wait for a trigger, and you decide what the "coming soon" card looks like.

## 2. The Core Idea

📌 **Interview term: Deferrable view** — a part of a template wrapped in <code>@defer { ... }</code>. Angular renders it later, and the [standalone](/interview-question/what-are-standalone-components) components, directives and pipes used *only* inside it are moved by the compiler into a separate lazy chunk. Introduced in v17 together with the built-in [control flow blocks](/interview-question/explain-the-new-control-flow-if-for-switch-and-how-it-compares-to-structural-dir), stable since v18.

📌 **Interview term: Trigger** — the condition that starts loading: <code>on idle</code> (the default when you write no trigger), <code>on viewport</code>, <code>on interaction</code>, <code>on hover</code>, <code>on immediate</code>, <code>on timer(...)</code>, or <code>when someCondition</code>. All triggers are compared in [the @defer triggers question](/interview-question/how-does-the-defer-block-work-and-what-triggers-are-available).

📌 **Interview term: Placeholder, loading and error blocks** — optional companions that say what to show before loading starts, while it is in progress, and if it fails.

\`\`\`
@defer (on interaction; prefetch on idle) {
  <app-comments />                       <!-- the real content, loaded later -->
} @placeholder (minimum 500ms) {
  <button>Show comments</button>          <!-- shown first; also the click target -->
} @loading (after 100ms; minimum 300ms) {
  <p>Loading comments...</p>             <!-- only if loading takes > 100 ms -->
} @error {
  <p>Could not load comments.</p>        <!-- the chunk failed to load -->
}
\`\`\`

## 3. The Life of a <code>@defer</code> Block

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A defer block starts in the placeholder state, moves to loading when its trigger fires, then to the main content or the error block">
  <defs>
    <marker id="q6life-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="110" width="170" height="80" rx="10"/>
  <text class="d-text" x="115" y="145" text-anchor="middle">@placeholder</text>
  <text class="d-sub" x="115" y="168" text-anchor="middle">initial render</text>
  <path class="d-edge-accent" d="M 204 150 L 262 150" marker-end="url(#q6life-arrow)"/>
  <text class="d-sub" x="233" y="132" text-anchor="middle">trigger</text>
  <rect class="d-box-accent" x="268" y="110" width="170" height="80" rx="10"/>
  <text class="d-text d-accent" x="353" y="145" text-anchor="middle">@loading</text>
  <text class="d-sub" x="353" y="168" text-anchor="middle">import() running</text>
  <path class="d-edge-accent" d="M 442 130 L 510 78" marker-end="url(#q6life-arrow)"/>
  <path class="d-edge-dashed" d="M 442 170 L 510 222" marker-end="url(#q6life-arrow)"/>
  <rect class="d-box" x="516" y="30" width="180" height="80" rx="10"/>
  <text class="d-text" x="606" y="65" text-anchor="middle">@defer content</text>
  <text class="d-sub" x="606" y="88" text-anchor="middle">complete</text>
  <rect class="d-box-muted" x="516" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="606" y="225" text-anchor="middle">@error</text>
  <text class="d-sub" x="606" y="248" text-anchor="middle">import failed</text>
</svg>

The block is a small state machine: it starts on the placeholder, moves to loading when the trigger fires, and ends either on the real content or on the error block.

Under the hood the compiler writes a dependency function per block that returns dynamic <code>import()</code> calls for the deferred components, and removes their static imports from the file. The [prefetch and dependency isolation question](/interview-question/deferrable-views-prefetch-strategies-and-dependency-isolation-with-defer) shows that compiled output and the rule that silently keeps a component eager.

## 4. Verified: the timing options in action

The example is a product page with the block shown above. A script clicked "Show comments" right after boot and then checked the DOM twice. Each line is the root's text content, so adjacent elements run together:

\`\`\`
[app] RENDERED: Product pageShow comments
click right after boot: Product pageShow comments
~300ms after boot:    Product pageShow comments
~700ms after boot:    Product pageGreat teaArrived fast
\`\`\`

Playground mode (plain transpile plus JIT, the way the Run button on this site works) printed the same four lines.

Why is the comment list not visible at 300 ms, when the component is in the same file and loads instantly? Because of <code>@placeholder (minimum 500ms)</code>: once the placeholder has been shown, it stays at least 500 ms, so a fast load does not produce a one-frame flash. The <code>@loading</code> block never appeared at all, because <code>after 100ms</code> means "only show the spinner if loading takes longer than 100 ms", and here it did not.

📌 **Interview term: <code>minimum</code> and <code>after</code>** — <code>minimum</code> sets the shortest time a placeholder or loading block stays on screen; <code>after</code> (loading only) sets how long to wait before showing the loading block. Both exist to avoid flicker.

## 5. Verified: the edges

**No trigger means <code>on idle</code>.** <code>@defer { &lt;p&gt;loaded&lt;/p&gt; }</code> with no placeholder rendered <code>loaded</code> straight after boot in jsdom. The 22.2.3 source uses <code>requestIdleCallback</code> when it exists and falls back to <code>setTimeout</code>; jsdom has no <code>requestIdleCallback</code>, so there it ran almost immediately.

**A trigger without a target needs a placeholder.** <code>@defer (on interaction) { ... }</code> with no <code>@placeholder</code> failed to compile:

\`\`\`
NG8019: Trigger with no target can only be placed on an @defer that has a @placeholder block
\`\`\`

That makes sense: the placeholder is the thing that gets clicked, hovered or scrolled into view. Give the trigger an explicit target (<code>on interaction(myButton)</code>) or add a placeholder.

**<code>@error</code> does show.** The deferred file was changed to throw while being imported, which is how a failed chunk download surfaces. After the click:

\`\`\`
[529ms] clicked, DOM: "Could not load the chart."
\`\`\`

**On the server, the placeholder is rendered.** A CLI prerender (<code>ng build</code>, Angular 22.2.3) of a page with <code>@defer (on viewport) { &lt;app-chart /&gt; } @placeholder { &lt;p&gt;chart placeholder&lt;/p&gt; }</code> produced <code>&lt;p&gt;chart placeholder&lt;/p&gt;</code> in the static HTML, not the chart. Use a <code>hydrate</code> trigger when the content must be in the HTML, see [hydration in modern Angular](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat).

## 6. <code>@defer</code> Compared With Other Ways of Lazy Loading

| | <code>@defer</code> block | [Lazy route](/interview-question/how-does-routing-and-lazy-loading-work-in-angular) (<code>loadComponent</code>) | <code>@if</code> around a component |
| :--- | :--- | :--- | :--- |
| Unit | Part of one template | A whole page per URL | Part of one template |
| Code split | Yes, if dependencies are isolated | Yes | No: the component is in the bundle |
| Built-in loading and error UI | Yes | No (router events) | No |
| Declarative triggers (viewport, idle...) | Yes | No | No |
| Good for | Below-the-fold sections, heavy widgets, rarely opened panels | Separate screens | Showing and hiding UI, not loading code |

## 7. Common Pitfalls

- **Expecting [<code>@if</code>](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor) to lazy load.** It only hides; the component's code is still in the bundle. <code>@defer</code> is the lazy one.
- **A trigger without a placeholder.** Compile error NG8019 (verified); add <code>@placeholder</code> or a trigger target.
- **Deferring content above the fold.** The user sees a placeholder exactly where they look first, and on SSR the placeholder is what is rendered; that can hurt Largest Contentful Paint (see [the critical render path](/interview-question/what-is-the-critical-render-path-and-how-does-angular-handle-font-and-style-opti)).
- **Placeholders with a different size from the content.** The page jumps when the block loads. Size the placeholder like the real content.
- **Assuming deferred means not in main.js.** Only isolated dependencies are split; check the build output, as described in the [isolation question](/interview-question/deferrable-views-prefetch-strategies-and-dependency-isolation-with-defer).
- **Testing with real timers.** Tests can control the block states directly; see [testing defer blocks and control flow](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"A deferrable view is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> block in a template: its content, and the code of the components inside it, load later instead of in the initial bundle."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The four blocks:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> holds the real content, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@placeholder</code> shows before loading starts, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@loading</code> while the code downloads, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@error</code> if it fails."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When it loads:</strong> <span style="color:#f0e2c8;">"Triggers decide that: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on idle</code> by default, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on viewport</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interaction</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">immediate</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">when</code> a condition is true; prefetch triggers can download earlier."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it helps:</strong> <span style="color:#f0e2c8;">"The compiler turns deferred-only dependencies into dynamic imports, so heavy widgets leave the main bundle, which helps first load and Core Web Vitals."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Version facts:</strong> <span style="color:#f0e2c8;">"It arrived in v17 with the new block syntax, has been stable since v18, and on SSR it renders the placeholder unless you add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> trigger."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from lazy-loaded routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A lazy route splits code per URL; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> splits code inside one page. You can combine them: a lazy route whose page defers its chart and comments.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">minimum</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">after</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@placeholder (minimum 500ms)</code> keeps the placeholder at least that long to avoid a flash; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@loading (after 100ms; minimum 1s)</code> only shows the spinner if loading takes longer than 100 ms, and then keeps it for at least a second. In my run a click at boot still showed the placeholder at 300 ms and the comments at 700 ms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">on interaction</code> without a placeholder?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not compile: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NG8019: Trigger with no target can only be placed on an @defer that has a @placeholder block</code>. The placeholder is what the user interacts with.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">@error</code> block really show?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. I made the deferred module throw while loading, standing in for a failed chunk download, and after the click the DOM showed the error block text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> renders the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@placeholder</code> in SSR HTML, so the content is not in the page for crawlers. Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> trigger if you need the real content server-rendered.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deferrable view** | A <code>@defer</code> block whose content and code load later |
| **<code>@placeholder</code>** | What shows before loading starts; the default trigger target |
| **<code>@loading</code>** | What shows while the code downloads |
| **<code>@error</code>** | What shows if loading fails |
| **Trigger** | When to load: idle, viewport, interaction, hover, timer, immediate, when |
| **<code>minimum</code> / <code>after</code>** | Timing options that prevent flashes of placeholder or spinner |
| **Lazy chunk** | The separate JavaScript file the deferred code ends up in |

---
**Conclusion:** Deferrable views let a single template say "this part can wait", with blocks for every state the user might see: placeholder, loading, error and the real content. Verified on 22.2.3, the block followed its timing rules exactly, kept the placeholder for its 500 ms minimum, skipped the spinner when loading was quick, and showed the error block when the import failed. Combined with the right trigger and isolated dependencies, it is the cheapest way in modern Angular to get heavy, rarely used UI out of the initial bundle.`,
    examples: [
      {
        label: "A product page that loads comments on click, with placeholder, loading and error blocks",
        tech: "angular",
        runnable: true,
        code: `import { Component } from "@angular/core";

// In a real app this component lives in its own file and is used ONLY inside
// @defer, so the compiler moves it into a separate lazy chunk.
@Component({
  selector: "app-comments",
  template: \`<ul><li>Great tea</li><li>Arrived fast</li></ul>\`,
})
export class CommentsComponent {}

@Component({
  selector: "app-root",
  imports: [CommentsComponent],
  template: \`
    <h3>Product page</h3>
    @defer (on interaction; prefetch on idle) {
      <app-comments />
    } @placeholder (minimum 500ms) {
      <button>Show comments</button>
    } @loading (after 100ms; minimum 300ms) {
      <p>Loading comments...</p>
    } @error {
      <p>Could not load comments.</p>
    }
  \`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does the @defer block work and what triggers are available?",
    seoDescription:
      "Every @defer trigger in Angular 22: idle, viewport, interaction, hover, immediate, timer and when, plus prefetch and hydrate variants, timed in jsdom.",
    description: `**Question presented to candidate:**
"Walk me through what happens when Angular meets a \`@defer\` block, then list the triggers you can use, and pick the right one for: a below-the-fold reviews section, a settings panel behind a button, and a chat widget that should load once the page is quiet."

**What a strong answer should cover:**
- The sequence: placeholder rendered, trigger fires, dependency function loads code, content swaps in (or \`@error\`).
- **\`on\` triggers**: \`idle\` (default), \`immediate\`, \`timer(...)\`, \`viewport\`, \`interaction\`, \`hover\`; targets via template references.
- **\`when expr\`**: loads when truthy, one-shot.
- Multiple triggers are **OR-ed**; \`prefetch\` and \`hydrate\` variants are separate families.
- Sensible choices: viewport for reviews, interaction/hover (+ prefetch on hover) for the panel, idle or timer for the chat widget.
- Constraints: triggers without a target need a \`@placeholder\`; \`viewport\` needs \`IntersectionObserver\`.

**Clarifying questions expected:**
- "Is the page server-rendered? Then hydrate triggers may matter too."

**Code / implementation expected:** Yes — a template with several \`@defer\` blocks using different triggers.`,
    answer: `**Target Audience:** Developers who know what <code>@defer</code> is and need to choose and combine triggers correctly.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The trigger timeline in section 4 came from running the example on Angular 22.2.3 in both verifier modes (AOT with <code>ngc</code>, and playground JIT) with a script that waits, clicks and hovers. jsdom is not a real browser: idle timing and <code>viewport</code> behave differently there, and the doc says where.

## 1. Why This Even Matters — A Story First

A hotel has many ways to decide when to make up a room. Housekeeping can do it the moment the guest checks out (immediate), at 11 o'clock sharp (timer), whenever the staff have a quiet moment (idle), when the guest walks down that corridor (viewport), when the guest presses the call button (interaction), when the guest pauses at the door (hover), or when the manager flips a sign on the board (when).

Same work, different moments. Choose badly and either housekeeping is busy at the worst time, or the guest waits outside a dirty room. <code>@defer</code> triggers are those rules for a part of your page. The overview of the block itself is in [what deferrable views are](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17); this page is about the moment.

## 2. The Core Idea

📌 **Interview term: <code>@defer</code> block** — a template block that starts by rendering its <code>@placeholder</code> (or nothing), waits for a trigger, loads the code of the components inside it through a compiler-generated dependency function, and then renders the real content.

📌 **Interview term: Trigger** — the condition that makes the block load. There are three families that look alike:

| Family | Syntax | Decides |
| :--- | :--- | :--- |
| Render | <code>on idle</code>, <code>on viewport</code>, ..., <code>when expr</code> | When the content is loaded **and shown** |
| Prefetch | <code>prefetch on idle</code>, ..., <code>prefetch when expr</code> | When the code is **downloaded**, without showing it |
| Hydrate | <code>hydrate on idle</code>, ..., <code>hydrate when expr</code>, <code>hydrate never</code> | With SSR: when server-rendered content becomes **interactive** |

The compiler emits one runtime instruction per trigger. The 22.2.3 <code>@angular/core</code> exports show the full matrix: <code>ɵɵdeferOnIdle</code>, <code>ɵɵdeferOnImmediate</code>, <code>ɵɵdeferOnTimer</code>, <code>ɵɵdeferOnViewport</code>, <code>ɵɵdeferOnInteraction</code>, <code>ɵɵdeferOnHover</code>, <code>ɵɵdeferWhen</code>, the same seven as <code>ɵɵdeferPrefetch...</code>, and as <code>ɵɵdeferHydrate...</code> plus <code>ɵɵdeferHydrateNever</code>.

## 3. Every Render Trigger

| Trigger | Fires when | Needs a target? | Typical use |
| :--- | :--- | :--- | :--- |
| <code>on idle</code> (default) | The browser is idle after load (<code>requestIdleCallback</code>, falling back to <code>setTimeout</code>) | No | Non-critical widgets, chat, analytics UI |
| <code>on immediate</code> | Right after the parent finishes rendering | No | Split code without delaying the content much |
| <code>on timer(500ms)</code> | After the given delay | No | Warm-up, "show offer after 5s" |
| <code>on viewport</code> | The target scrolls into view (<code>IntersectionObserver</code>) | Placeholder or a template ref | Below-the-fold sections |
| <code>on interaction</code> | <code>click</code> or <code>keydown</code> on the target | Placeholder or a template ref | Panels behind a button |
| <code>on hover</code> | Pointer enters the target (<code>mouseenter</code>) | Placeholder or a template ref | Tooltips, menus, previews |
| <code>when expr</code> | <code>expr</code> becomes truthy (one-shot) | No | Feature flags, wizard steps, permissions |

📌 **Interview term: Trigger target** — the element <code>viewport</code>, <code>interaction</code> and <code>hover</code> watch. By default it is the <code>@placeholder</code>'s root element; <code>on hover(menuButton)</code> watches an element with <code>#menuButton</code> (a [template reference variable](/interview-question/what-are-template-reference-variables)) elsewhere in the same template instead. A target-less trigger on a block without a placeholder does not compile (<code>NG8019</code>).

## 4. Verified: six blocks, one per trigger

The example has six <code>@defer</code> blocks, each loading a tiny <code>PanelComponent</code> that prints <code>[name loaded]</code>. A driver script then waited, clicked the placeholder button, fired <code>mouseenter</code> on the <code>&lt;em #hoverTarget&gt;</code> and finally clicked a button that sets the <code>ready</code> [signal](/interview-question/what-are-angular-signals). Each line is the root's text content without the heading, so adjacent elements run together:

\`\`\`
after boot:        [immediate loaded][idle loaded][timer waiting][click me][hover waiting]hover here[when waiting]set ready
after ~150ms:      [immediate loaded][idle loaded][timer waiting][click me][hover waiting]hover here[when waiting]set ready
after ~500ms:      [immediate loaded][idle loaded][timer loaded][click me][hover waiting]hover here[when waiting]set ready
after click:       [immediate loaded][idle loaded][timer loaded][interaction loaded][hover waiting]hover here[when waiting]set ready
after mouseenter:  [immediate loaded][idle loaded][timer loaded][interaction loaded][hover loaded]hover here[when waiting]set ready
after ready.set:   [immediate loaded][idle loaded][timer loaded][interaction loaded][hover loaded]hover here[when loaded]set ready
\`\`\`

The playground run printed identical lines. Reading it:

- <code>immediate</code> was loaded by the time the first check ran. So was <code>idle</code>, but only because jsdom has no <code>requestIdleCallback</code> and Angular falls back to <code>setTimeout</code>; in a browser <code>idle</code> waits for a genuinely quiet moment.
- <code>timer(300ms)</code> was still waiting at about 150 ms and loaded by about 500 ms.
- <code>interaction</code> loaded on the click on its placeholder button; <code>hover</code> loaded on <code>mouseenter</code> on an element *outside* the block, thanks to <code>on hover(hoverTarget)</code>.
- <code>when ready()</code> loaded the moment the signal became true.

One thing a first attempt at this example taught: a heading reading "@defer triggers" did not compile. A bare <code>@</code> followed by a word in a template starts a block, and the compiler said: <code>NG5002: Incomplete block "defer triggers". If you meant to write the @ character, you should use the "&amp;#64;" HTML entity instead.</code>

## 5. Verified: combining triggers, and <code>when</code> is one-shot

A second, smaller run checked three rules:

\`\`\`
[app] RENDERED: [A waiting][B waiting][C waiting]
ready true then false: [A waiting][B loaded][C waiting]
keydown on C:         [A waiting][B loaded][C loaded]
after 250ms:           [A loaded][B loaded][C loaded]
\`\`\`

- **Block A** was <code>@defer (on interaction; on timer(200ms))</code>. Nobody clicked it, yet it loaded after 200 ms: **multiple triggers are OR-ed**, whichever happens first wins.
- **Block B** was <code>@defer (when ready())</code>. The driver set <code>ready</code> to <code>true</code> and immediately back to <code>false</code>; the block stayed loaded. **<code>when</code> is one-shot**: it is a load condition, not a visibility toggle. For show and hide, put an [<code>@if</code>](/interview-question/how-does-the-new-control-flow-if-for-switch-replace-ngif-and-ngfor) inside the loaded content.
- **Block C** was <code>@defer (on interaction)</code> on a placeholder <code>&lt;button&gt;</code>. An Enter **keydown** loaded it, not just a click, which matters for keyboard users.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Render, prefetch and hydrate triggers feed different steps: prefetch only downloads, render downloads and shows, hydrate attaches server rendered content">
  <defs>
    <marker id="q7trg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="200" height="56" rx="10"/>
  <text class="d-text" x="130" y="63" text-anchor="middle">prefetch on hover</text>
  <rect class="d-box-accent" x="30" y="102" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="130" y="135" text-anchor="middle">on interaction</text>
  <rect class="d-box" x="30" y="174" width="200" height="56" rx="10"/>
  <text class="d-text" x="130" y="207" text-anchor="middle">hydrate on viewport</text>
  <path class="d-edge-dashed" d="M 234 58 L 330 58" marker-end="url(#q7trg-arrow)"/>
  <path class="d-edge-accent" d="M 234 130 L 330 130" marker-end="url(#q7trg-arrow)"/>
  <path class="d-edge" d="M 234 202 L 330 202" marker-end="url(#q7trg-arrow)"/>
  <rect class="d-box-muted" x="336" y="30" width="350" height="56" rx="10"/>
  <text class="d-text" x="511" y="63" text-anchor="middle">download code only</text>
  <rect class="d-box-accent" x="336" y="102" width="350" height="56" rx="10"/>
  <text class="d-text d-accent" x="511" y="135" text-anchor="middle">download if needed, then render</text>
  <rect class="d-box-muted" x="336" y="174" width="350" height="56" rx="10"/>
  <text class="d-text" x="511" y="207" text-anchor="middle">SSR content made interactive</text>
</svg>

The three families can be mixed on one block, for example <code>@defer (on interaction; prefetch on hover; hydrate on viewport)</code>. The download and code-splitting side is covered in the [prefetch and dependency isolation question](/interview-question/deferrable-views-prefetch-strategies-and-dependency-isolation-with-defer); the hydrate side in [hydration in modern Angular](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat).

## 6. Choosing a Trigger

| Situation | Suggested triggers | Why |
| :--- | :--- | :--- |
| Reviews section below the fold | <code>on viewport; prefetch on idle</code> | Loads as the user scrolls; code is usually ready |
| Settings panel behind a button | <code>on interaction; prefetch on hover</code> | Hover gives a head start of a few hundred milliseconds |
| Chat widget | <code>on idle</code> or <code>on timer(3s)</code> | Keeps the startup path clean |
| Admin-only tools | <code>when isAdmin()</code> | Never downloaded for other users |
| SSR page, SEO-relevant section | <code>hydrate on viewport</code> | Content in the HTML, code later |
| Static server-rendered footer | <code>hydrate never</code> | Never needs to be interactive |

The suggestions are judgement, not measurement; profile your own page in a real browser to confirm the effect on load time, which was not measured here.

## 7. Common Pitfalls

- **Using <code>when</code> as a toggle.** It is one-shot (verified); use <code>@if</code> inside the content for show and hide.
- **Forgetting that triggers are OR-ed.** <code>on interaction; on timer(1s)</code> loads after a second even without a click (verified with 200 ms).
- **A target-less trigger without a placeholder.** <code>NG8019</code> at compile time.
- **Writing a literal <code>@</code> in a template.** <code>NG5002</code>; use <code>&amp;#64;</code> (verified).
- **Testing <code>on viewport</code> in jsdom.** No <code>IntersectionObserver</code>: it logged <code>ReferenceError: IntersectionObserver is not defined</code> and the block never loaded. See [testing defer blocks](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025).
- **Expecting <code>idle</code> timing in tests to match browsers.** In jsdom it fell back to <code>setTimeout</code> and loaded almost at once.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. How it works:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> block renders its placeholder, waits for a trigger, runs a compiler-generated dependency loader, then swaps in the real content."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The \`on\` triggers:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">idle</code> is the default; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">immediate</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timer(ms)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">viewport</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">interaction</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hover</code> are event or time based, and the last three watch the placeholder unless you name a template reference."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The \`when\` trigger:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">when expr</code> loads once the expression becomes truthy, and it is one-shot: setting it back to false does not unload anything."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Combining:</strong> <span style="color:#f0e2c8;">"Several triggers in one block are OR-ed, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on interaction; on timer(5s)</code> means whichever comes first; prefetch and hydrate triggers sit next to them as separate families."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Picking one:</strong> <span style="color:#f0e2c8;">"Viewport for below-the-fold content, interaction or hover for panels behind a button, idle or timer for warm-up, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">when</code> for app state such as a feature flag."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">on interaction</code> listen for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Click and keydown. I verified both: a click and, separately, an Enter keydown on the placeholder button each loaded the block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a trigger watch an element outside the block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with a template reference: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">on hover(hoverTarget)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;em #hoverTarget&gt;</code> elsewhere in the template. My test loaded the block on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mouseenter</code> on that element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">when</code> reactive both ways?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it only goes forward. In my test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ready.set(true)</code> loaded the block, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ready.set(false)</code> straight after left it loaded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are hydrate triggers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same vocabulary with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code>, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate on viewport</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate never</code>. They only matter with SSR: the server renders the real content and the trigger decides when the browser hydrates it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">on viewport</code> fail in my unit test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntersectionObserver</code>. jsdom has none: the block logged <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError: IntersectionObserver is not defined</code> and stayed on the placeholder. Use TestBed defer controls or a polyfill.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Render trigger** | <code>on ...</code> / <code>when ...</code>: load and show the block |
| **Prefetch trigger** | Download the code early without showing it |
| **Hydrate trigger** | With SSR, when server content becomes interactive |
| **Trigger target** | The element watched by <code>viewport</code>, <code>interaction</code> or <code>hover</code> |
| **One-shot** | Fires once; later changes do not undo it (<code>when</code>) |
| **OR-ed triggers** | Several triggers on one block; the first to fire wins |

---
**Conclusion:** A <code>@defer</code> block is a placeholder waiting for a moment, and triggers name that moment: idle by default, or immediate, a timer, the viewport, an interaction or hover, or an expression becoming true. Verified on 22.2.3, each trigger fired exactly on its cue, several triggers on one block raced and the first one won, and <code>when</code> loaded once and never unloaded. Add prefetch triggers to download earlier than you render, and hydrate triggers when the page is server-rendered, and you can schedule every heavy part of a page around what the user is actually doing.`,
    examples: [
      {
        label: "Six @defer blocks, one per trigger, driven by a script",
        tech: "angular",
        runnable: true,
        code: `import { Component, signal } from "@angular/core";

@Component({
  selector: "app-panel",
  template: \`<span>[{{ name }} loaded]</span>\`,
  inputs: ["name"],
})
export class PanelComponent {
  name = "";
}

@Component({
  selector: "app-root",
  imports: [PanelComponent],
  template: \`
    <h3>Defer triggers</h3>

    @defer (on immediate) { <app-panel name="immediate" /> } @placeholder { <span>[immediate waiting]</span> }

    @defer (on idle) { <app-panel name="idle" /> } @placeholder { <span>[idle waiting]</span> }

    @defer (on timer(300ms)) { <app-panel name="timer" /> } @placeholder { <span>[timer waiting]</span> }

    @defer (on interaction) { <app-panel name="interaction" /> } @placeholder { <button id="open">[click me]</button> }

    @defer (on hover(hoverTarget)) { <app-panel name="hover" /> } @placeholder { <span>[hover waiting]</span> }
    <em #hoverTarget id="hover">hover here</em>

    @defer (when ready()) { <app-panel name="when" /> } @placeholder { <span>[when waiting]</span> }
    <button id="ready" (click)="ready.set(true)">set ready</button>
  \`,
})
export class AppComponent {
  ready = signal(false);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you optimize images in Angular using NgOptimizedImage?",
    seoDescription:
      "NgOptimizedImage sets loading, fetchpriority and srcset, warns about missing sizes or preconnects, and preloads priority images in SSR. Verified on v22.",
    description: `**Question presented to candidate:**
"Lighthouse flags our product pages for a slow Largest Contentful Paint and layout shift from images. How would you use Angular's NgOptimizedImage to fix it, and what does the directive actually do to the \`<img>\` tag?"

**What a strong answer should cover:**
- Import \`NgOptimizedImage\` and replace \`src\` with \`ngSrc\`; \`width\`/\`height\` (or \`fill\`) are required to prevent layout shift.
- Defaults: \`loading="lazy"\`; \`priority\` makes the image eager with \`fetchpriority="high"\` and adds a preload link during SSR.
- **Loaders** (\`provideImgixLoader\`, \`provideCloudinaryLoader\`, ... or a custom \`IMAGE_LOADER\`) enable automatic \`srcset\`: density descriptors (1x, 2x) or width descriptors with \`sizes\`.
- \`fill\` mode for unknown dimensions; \`placeholder\` for low-quality previews.
- Dev-mode checks: missing dimensions, \`src\` with \`ngSrc\`, base64 sources, pixel \`sizes\`, missing preconnect for priority images, LCP image not marked priority.
- It does not resize images itself; the CDN does.

**Clarifying questions expected:**
- "Which image CDN do we use? That determines the loader."
- "Is the page server-rendered? Preload links only appear with SSR or prerendering."

**Code / implementation expected:** Yes — a few \`<img ngSrc>\` tags covering priority, responsive and fill cases.`,
    answer: `**Target Audience:** Angular developers fixing image-related performance problems: slow Largest Contentful Paint, layout shift, oversized downloads.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The attributes in section 4 were read from the DOM after running the example on Angular 22.2.3 (AOT and playground modes, identical output); the error messages come from small variants of it; the preload link comes from a CLI 22.2.3 prerender. Real image download sizes and LCP were not measured, because that needs a browser and a network.

## 1. Why This Even Matters — A Story First

A photo lab gets an order: "a picture for my wallet". A careless lab prints a two-metre poster and lets you fold it. A careful lab asks how big your wallet is, prints that size, leaves a gap of exactly the right shape in your album so nothing shifts when the photo arrives, and prints the cover photo first because everybody looks at it first.

Browsers are the careless lab unless you tell them otherwise. An <code>&lt;img src="hero.jpg"&gt;</code> downloads one full-size file for every screen, loads all images with the same priority, and reserves no space until the image arrives, so text jumps down. Fixing that by hand means <code>srcset</code>, <code>sizes</code>, <code>loading</code>, <code>fetchpriority</code>, <code>width</code>, <code>height</code> and a <code>&lt;link rel="preload"&gt;</code> on every image. **<code>NgOptimizedImage</code>** is the careful lab: you describe the image, and it writes those attributes.

## 2. The Core Idea

📌 **Interview term: <code>NgOptimizedImage</code>** — a [standalone](/interview-question/what-are-standalone-components) [directive](/interview-question/what-is-a-directive-and-what-are-the-types) from <code>@angular/common</code>, activated by writing <code>ngSrc</code> instead of <code>src</code> on an <code>&lt;img&gt;</code>. Stable since v15 (source: <a href="https://blog.angular.io/angular-v15-is-now-available-df7be7f2f4c8" target="_blank" rel="noopener noreferrer">Angular v15 announcement</a>). Its 22.2.3 inputs include <code>ngSrc</code>, <code>ngSrcset</code>, <code>sizes</code>, <code>width</code>, <code>height</code>, <code>priority</code>, <code>fill</code>, <code>loading</code>, <code>decoding</code>, <code>loaderParams</code>, <code>disableOptimizedSrcset</code>, <code>placeholder</code> and <code>placeholderConfig</code>.

📌 **Interview term: Image loader** — a function <code>(config: ImageLoaderConfig) =&gt; string</code> that turns a source and a width into a CDN URL. <code>@angular/common</code> 22.2.3 ships <code>provideImgixLoader</code>, <code>provideCloudinaryLoader</code>, <code>provideImageKitLoader</code>, <code>provideNetlifyLoader</code> and <code>provideCloudflareLoader</code>; for anything else you provide the <code>IMAGE_LOADER</code> [token](/interview-question/what-is-an-injectiontoken) yourself. Without a loader, no <code>srcset</code> can be generated.

📌 **Interview term: Largest Contentful Paint (LCP)** — the Core Web Vital that measures when the biggest visible element, very often the hero image, finishes rendering. <code>priority</code> exists for that one image.

📌 **Interview term: Cumulative Layout Shift (CLS)** — how much content jumps while the page loads. Required <code>width</code> and <code>height</code> let the browser reserve the box before the image arrives.

## 3. What the Directive Writes

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="You write ngSrc, width, height and priority, the directive writes src, srcset, loading, fetchpriority and decoding, and on the server a preload link">
  <defs>
    <marker id="q8img-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="240" height="190" rx="12"/>
  <text class="d-text" x="150" y="72" text-anchor="middle">You write</text>
  <text class="d-sub" x="150" y="106" text-anchor="middle">ngSrc</text>
  <text class="d-sub" x="150" y="134" text-anchor="middle">width and height, or fill</text>
  <text class="d-sub" x="150" y="162" text-anchor="middle">sizes, when responsive</text>
  <text class="d-sub" x="150" y="190" text-anchor="middle">priority, for the LCP image</text>
  <path class="d-edge-accent" d="M 276 135 L 354 135" marker-end="url(#q8img-arrow)"/>
  <rect class="d-box-accent" x="360" y="40" width="330" height="190" rx="12"/>
  <text class="d-text d-accent" x="525" y="72" text-anchor="middle">Angular writes</text>
  <text class="d-sub" x="525" y="106" text-anchor="middle">src and srcset from the loader</text>
  <text class="d-sub" x="525" y="134" text-anchor="middle">loading lazy or eager</text>
  <text class="d-sub" x="525" y="162" text-anchor="middle">fetchpriority and decoding</text>
  <text class="d-sub" x="525" y="190" text-anchor="middle">preload link in head, on the server</text>
</svg>

The left box is your whole job; everything in the right box is derived from it, which is why the directive can also check that you did your part.

## 4. Verified: four kinds of image

The example renders a priority hero, a responsive card with <code>sizes</code>, a small thumbnail and a <code>fill</code> background, with a custom loader that appends <code>?w=WIDTH</code> to a CDN URL (provided through <code>IMAGE_LOADER</code> on the component, see [root vs component providers](/interview-question/what-is-the-difference-between-providing-a-service-in-root-vs-in-a-component), so it also runs in the playground). Attributes read from the DOM:

\`\`\`
#hero
  src           https://cdn.example.com/hero.jpg
  srcset        https://cdn.example.com/hero.jpg?w=1200 1x, https://cdn.example.com/hero.jpg?w=2400 2x
  loading       eager
  fetchpriority high
  decoding      sync
#card
  src           https://cdn.example.com/card.jpg
  srcset        https://cdn.example.com/card.jpg?w=16 16w, https://cdn.example.com/card.jpg?w=32 32w, ... https://cdn.example.com/card.jpg?w=2048 2048w, https://cdn.example.com/card.jpg?w=3840 3840w
  sizes         auto, (max-width: 600px) 100vw, 50vw
  loading       lazy
  fetchpriority auto
  decoding      auto
#thumb
  src           https://cdn.example.com/thumb.jpg
  srcset        https://cdn.example.com/thumb.jpg?w=120 1x, https://cdn.example.com/thumb.jpg?w=240 2x
  loading       lazy
  fetchpriority auto
  decoding      auto
#bg
  src           https://cdn.example.com/bg.jpg
  srcset        https://cdn.example.com/bg.jpg?w=640 640w, https://cdn.example.com/bg.jpg?w=750 750w, ... https://cdn.example.com/bg.jpg?w=3840 3840w
  sizes         auto, 100vw
  loading       lazy
  fetchpriority auto
  decoding      auto
  style         position: absolute; width: 100%; height: 100%; inset: 0px;
\`\`\`

(<code>...</code> shortens the two long <code>srcset</code> lists; the card's has 16 entries.) And on the console, before anything else:

\`\`\`
NG02956: The NgOptimizedImage directive (activated on an <img> element with the \`ngSrc="hero.jpg"\`) has detected that there is no preconnect tag present for this image. Preconnecting to the origin(s) that serve priority images ensures that these images are delivered as soon as possible. To fix this, please add the following element into the <head> of the document:
  <link rel="preconnect" href="https://cdn.example.com">
\`\`\`

Reading it:

- **Fixed-size images get density descriptors.** The hero (1200 wide) and thumb (120 wide) got <code>1x</code> and <code>2x</code> URLs at exactly 1x and 2x their <code>width</code>.
- **<code>sizes</code> switches to width descriptors.** The card got one URL per breakpoint. The list is the default <code>IMAGE_CONFIG</code> breakpoints in 22.2.3: <code>[16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]</code>.
- **<code>fill</code> means <code>sizes="100vw"</code>**, and for a <code>100vw</code> image the source drops breakpoints below 640 (<code>VIEWPORT_BREAKPOINT_CUTOFF = 640</code>), which is why the background list starts at 640.
- **Lazy images get <code>sizes="auto, ..."</code>.** The 22.2.3 source prepends <code>auto, </code> whenever the image is lazy, letting browsers that support it pick from the rendered size.
- **<code>priority</code> changed three attributes** on the hero, and only the hero triggered the preconnect check.

## 5. Verified: the guardrails

Each line comes from a one-image variant of the example (messages shortened after the first sentence):

| You wrote | Result |
| :--- | :--- |
| <code>&lt;img ngSrc="a.jpg" alt="x"&gt;</code> | NG02954: these required attributes are missing: "width", "height" |
| <code>ngSrc</code> and <code>src</code> together | NG02950: both src and ngSrc have been set. Supplying both of these attributes breaks lazy loading |
| <code>fill</code> plus <code>width</code>/<code>height</code> | NG02952: the attributes height and/or width are present along with the fill attribute |
| <code>ngSrc="data:image/png;base64,..."</code> | NG02952: ngSrc is a Base64-encoded string ... NgOptimizedImage does not support Base64-encoded strings |
| <code>sizes="300px"</code> | NG02952: sizes was set to a string including pixel values |
| <code>sizes="50vw"</code>, <code>width="100" height="10"</code> | No error |

These checks run inside <code>if (ngDevMode)</code> in the 22.2.3 source, so production builds skip them. The same source has browser-only checks too: NG02955 when the Largest Contentful Paint element is an image not marked <code>priority</code>, NG02960 when the downloaded image is significantly larger than it is rendered, and NG02961 when too many images are preloaded. They need real layout and a <code>PerformanceObserver</code>, so they were **not** reproduced here.

## 6. Server-Side Rendering Adds the Preload

Prerendering a page with <code>&lt;img ngSrc="https://cdn.example.com/hero.jpg" width="800" height="400" priority alt="hero" /&gt;</code> (CLI 22.2.3, <code>ng build</code> with SSR) put this in the <code>&lt;head&gt;</code> of the static HTML:

\`\`\`
<link as="image" href="https://cdn.example.com/hero.jpg" rel="preload" fetchpriority="high">
\`\`\`

and the image itself was emitted as <code>&lt;img ... loading="eager" fetchpriority="high" decoding="sync" ng-img="true" src="https://cdn.example.com/hero.jpg"&gt;</code>. No loader was configured there, so there was no <code>srcset</code>. The preload lets the browser start the hero download while it is still parsing the head, before any JavaScript runs, which is the point of combining <code>priority</code> with [Angular SSR](/interview-question/what-is-angular-universal-ssr). How the preload interacts with styles and fonts is covered in [the critical render path question](/interview-question/what-is-the-critical-render-path-and-how-does-angular-handle-font-and-style-opti).

## 7. Plain <code>&lt;img&gt;</code> vs <code>NgOptimizedImage</code>

| Concern | Plain <code>&lt;img src&gt;</code> | <code>NgOptimizedImage</code> |
| :--- | :--- | :--- |
| Responsive sources | Write <code>srcset</code> by hand | Generated from the loader |
| Lazy loading | Add <code>loading="lazy"</code> yourself | Default |
| LCP image priority | Add <code>fetchpriority</code>, preload by hand | <code>priority</code> |
| Layout shift | Easy to forget dimensions | <code>width</code>/<code>height</code> required, or <code>fill</code> |
| Preconnect reminder | None | NG02956 warning |
| Resizing | Your CDN | Still your CDN; the directive only builds URLs |

## 8. Common Pitfalls

- **Marking many images <code>priority</code>.** Only the LCP image should be; several high-priority downloads compete with each other and with CSS.
- **No loader, then wondering where <code>srcset</code> is.** Without a loader the directive cannot invent CDN URLs; the prerendered example had <code>src</code> only.
- **Forgetting the preconnect.** NG02956 tells you the exact <code>&lt;link rel="preconnect"&gt;</code> to add.
- **Pixel values in <code>sizes</code>.** Use viewport-relative values; <code>300px</code> throws NG02952 (verified).
- **<code>fill</code> on an unpositioned parent.** The image is <code>position: absolute</code> (verified style), so the parent needs <code>position: relative</code> and a size.
- **Expecting it to compress or resize images.** It does neither; pick an image CDN or a build step for that.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgOptimizedImage</code> is a directive in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/common</code>: you write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngSrc</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> and Angular applies image best practices for you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it sets:</strong> <span style="color:#f0e2c8;">"Lazy loading by default, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">width</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height</code> to prevent layout shift, and with a loader an automatic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">srcset</code>: 1x and 2x for fixed images, a width list when you give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sizes</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Priority images:</strong> <span style="color:#f0e2c8;">"Mark the hero image <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority</code>: it becomes eager with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetchpriority="high"</code>, and during SSR Angular adds a preload link to the head."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Loaders:</strong> <span style="color:#f0e2c8;">"A loader maps a source and width to a CDN URL; Angular ships ones for Imgix, Cloudinary, ImageKit, Netlify and Cloudflare, or you provide your own through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IMAGE_LOADER</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Guardrails:</strong> <span style="color:#f0e2c8;">"In dev mode it throws on missing dimensions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngSrc</code>, base64 sources or pixel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sizes</code>, and warns when a priority image has no preconnect."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are width and height required?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So the browser can reserve the space before the image loads and nothing jumps; that is Cumulative Layout Shift. Without them I got NG02954, unless the image uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">priority</code> actually change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In my run it set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading="eager"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetchpriority="high"</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">decoding="sync"</code>, and the prerendered page had <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;link as="image" ... rel="preload" fetchpriority="high"&gt;</code> in the head. It also triggers the missing-preconnect warning NG02956.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fill</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you do not know the image size, for example a background or a card cover whose box is set by CSS. The image gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">position: absolute</code> and 100% width and height, and its parent must be positioned.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it resize images itself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only generates URLs; the resizing is done by your image CDN through the loader. Without a loader it cannot generate a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">srcset</code> at all, and my test showed only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know which image to mark priority?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It should be the Largest Contentful Paint element. In a browser Angular can warn when the LCP image is not marked priority; I could not measure that here because it needs a real browser.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>ngSrc</code>** | The source attribute that activates the directive |
| **Image loader** | Function from source and width to a CDN URL |
| **<code>priority</code>** | Marks the LCP image: eager, high fetch priority, preload in SSR |
| **<code>fill</code>** | Image covers its positioned parent; no width or height needed |
| **Density descriptor** | <code>1x</code>, <code>2x</code> entries in a <code>srcset</code> for fixed-size images |
| **Width descriptor** | <code>640w</code>, <code>1080w</code> entries used with <code>sizes</code> |
| **LCP / CLS** | Core Web Vitals for main-content paint time and layout jumps |

---
**Conclusion:** <code>NgOptimizedImage</code> turns image best practice into a few attributes you cannot get wrong silently. Verified on 22.2.3, it made the hero eager with high fetch priority, gave fixed images 1x and 2x sources, produced a full breakpoint <code>srcset</code> once <code>sizes</code> was set, made everything else lazy, warned about a missing preconnect, and on the server added a preload link for the priority image. The real resizing still belongs to your image CDN, and the real effect on LCP has to be measured in a browser, but the directive makes sure the browser is asking for the right file at the right time.`,
    examples: [
      {
        label: "Hero, responsive, thumbnail and fill images with a CDN loader",
        tech: "angular",
        runnable: true,
        code: `import { Component } from "@angular/core";
import { IMAGE_LOADER, ImageLoaderConfig, NgOptimizedImage } from "@angular/common";

// A loader turns (src, width) into a CDN URL. Without one, no srcset is generated.
const cdnLoader = (config: ImageLoaderConfig) =>
  \`https://cdn.example.com/\${config.src}\` + (config.width ? \`?w=\${config.width}\` : "");

@Component({
  selector: "app-root",
  imports: [NgOptimizedImage],
  // Usually app-wide (provideImgixLoader, provideCloudinaryLoader, ...); a component provider works too.
  providers: [{ provide: IMAGE_LOADER, useValue: cdnLoader }],
  template: \`
    <!-- 1. The hero image: likely the LCP element, so mark it priority. -->
    <img id="hero" ngSrc="hero.jpg" width="1200" height="600" priority alt="Hero" />

    <!-- 2. A responsive image: sizes makes Angular emit a width-based srcset. -->
    <img id="card" ngSrc="card.jpg" width="600" height="400"
         sizes="(max-width: 600px) 100vw, 50vw" alt="Card" />

    <!-- 3. A thumbnail further down: lazy by default. -->
    <img id="thumb" ngSrc="thumb.jpg" width="120" height="120" alt="Thumb" />

    <!-- 4. Unknown size: fill mode stretches it over a positioned parent. -->
    <div style="position: relative; width: 300px; height: 200px">
      <img id="bg" ngSrc="bg.jpg" fill alt="Background" />
    </div>
  \`,
})
export class AppComponent {}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the critical render path and how does Angular handle font and style optimization?",
    seoDescription:
      "The critical render path is what the browser needs before first paint. How Angular builds inline critical CSS, defer styles and scripts, and inline fonts.",
    description: `**Question presented to candidate:**
"Our Lighthouse report says 'Eliminate render-blocking resources' and points at our stylesheet and Google Fonts link. Explain the critical render path, and what the Angular build already does about styles and fonts."

**What a strong answer should cover:**
- **Critical render path**: HTML parsing, CSSOM, render tree, layout, paint; CSS and web fonts block first paint, deferred scripts do not.
- Angular production builds: **critical CSS inlining** (Beasties) of the rules the initial HTML uses, and **async loading** of the full stylesheet (\`media="print"\` swap plus \`<noscript>\`).
- Critical CSS only helps when the HTML has content: SSR or prerendering, not an empty CSR shell.
- **Font inlining** (\`optimization.fonts.inline\`) for Google Fonts and Adobe Fonts CSS at build time.
- Scripts as \`type="module"\` with \`modulepreload\`; component styles bundled in JS (and emitted in the head during SSR).
- Related levers: \`NgOptimizedImage priority\` preload, \`@defer\`, budgets in \`angular.json\`.

**Clarifying questions expected:**
- "Is the app server-rendered or prerendered? That decides whether critical CSS inlining can do anything."
- "Are fonts self-hosted or from Google Fonts?"

**Code / implementation expected:** Optional — the relevant \`angular.json\` options and a look at the built \`index.html\`.`,
    answer: `**Target Audience:** Developers who have seen "render-blocking resources" in Lighthouse and want to know what the browser waits for, and what Angular's build already optimises.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The <code>index.html</code> snippets were produced by <code>ng build</code> with Angular CLI 22.2.3 on Node 24, once as a prerendered (SSR) build and once as a plain client-side build of the same component and stylesheet. Font inlining was **not** run: it downloads font CSS during the build and this environment was offline. Paint timings were not measured; they need a real browser.

## 1. Why This Even Matters — A Story First

Think of opening a shop in the morning. The doors cannot open until the lights are on and the price labels are up: that is non-negotiable. Restocking the back shelves, testing the card machine, sorting the delivery: all of that can happen after the first customer walks in.

A good manager makes the "before opening" list as short as possible. A bad one waits for the delivery truck before turning on the lights.

The browser has the same kind of list before it can show the first pixel, and it is called the **critical render path**. Some resources are on it whether you like it or not (the HTML, the CSS), some only by accident (a font file, a synchronous script). Performance work is mostly moving things off that list, and Angular's build does a fair amount of it for you.

## 2. The Core Idea

📌 **Interview term: Critical render path (CRP)** — the steps between receiving HTML and painting it: parse HTML into the DOM, parse CSS into the CSSOM, combine them into the render tree, compute layout, paint.

📌 **Interview term: Render-blocking resource** — something the browser must download before the first paint. Stylesheets in the <code>&lt;head&gt;</code> are render-blocking by default; so, in effect, are web fonts for text that uses them. Classic synchronous <code>&lt;script&gt;</code> tags block parsing; <code>type="module"</code> scripts do not, because they are deferred by default.

📌 **Interview term: Critical CSS** — the subset of your CSS needed to style what is visible in the initial HTML. Inlined in a <code>&lt;style&gt;</code> tag, it removes the stylesheet from the critical path.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="HTML builds the DOM, CSS builds the CSSOM, both combine into the render tree, then layout and paint, with render blocking CSS and fonts on the path and module scripts off it">
  <defs>
    <marker id="q9crp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="150" height="56" rx="10"/>
  <text class="d-text" x="105" y="73" text-anchor="middle">HTML to DOM</text>
  <rect class="d-box-accent" x="30" y="140" width="150" height="56" rx="10"/>
  <text class="d-text d-accent" x="105" y="173" text-anchor="middle">CSS to CSSOM</text>
  <path class="d-edge" d="M 184 68 L 256 108" marker-end="url(#q9crp-arrow)"/>
  <path class="d-edge-accent" d="M 184 168 L 256 128" marker-end="url(#q9crp-arrow)"/>
  <rect class="d-box" x="262" y="90" width="150" height="56" rx="10"/>
  <text class="d-text" x="337" y="123" text-anchor="middle">Render tree</text>
  <path class="d-edge" d="M 416 118 L 472 118" marker-end="url(#q9crp-arrow)"/>
  <rect class="d-box" x="478" y="90" width="100" height="56" rx="10"/>
  <text class="d-text" x="528" y="123" text-anchor="middle">Layout</text>
  <path class="d-edge" d="M 582 118 L 610 118" marker-end="url(#q9crp-arrow)"/>
  <rect class="d-box-accent" x="616" y="90" width="80" height="56" rx="10"/>
  <text class="d-text d-accent" x="656" y="123" text-anchor="middle">Paint</text>
  <rect class="d-box-muted" x="30" y="230" width="300" height="50" rx="10"/>
  <text class="d-text" x="180" y="260" text-anchor="middle">Fonts block text until loaded</text>
  <rect class="d-box-muted" x="396" y="230" width="300" height="50" rx="10"/>
  <text class="d-text" x="546" y="260" text-anchor="middle">Module scripts run after parsing</text>
</svg>

The highlighted boxes are what Angular's build tries to shorten: the CSS that the CSSOM waits for, and the moment content can be painted. Scripts sit outside the path, which is why bundle size hurts *interactivity* more than the first paint.

## 3. Verified: what a production build writes into <code>index.html</code>

The global stylesheet for these builds had three rules:

\`\`\`
h1 { font: 700 2rem/1.2 system-ui; color: #123; }
.used-later { color: red; }
.never-used-anywhere { border: 5px solid lime; }
\`\`\`

The component (the example on this page) renders an <code>&lt;h1&gt;</code>, a priority hero image, a list, a button and a deferred chart. Nothing in the initial HTML uses <code>.used-later</code> or <code>.never-used-anywhere</code>.

**Prerendered build** (<code>outputMode: "static"</code>, SSR at build time). The head of <code>dist/demo/browser/index.html</code>:

\`\`\`
<link rel="icon" type="image/x-icon" href="favicon.ico">
<style>h1{font:700 2rem/1.2 system-ui;color:#123}</style><link rel="stylesheet" href="styles-VLKJHX3E.css" media="print" data-beasties-media="all"><noscript><link rel="stylesheet" href="styles-VLKJHX3E.css"></noscript><link as="image" href="https://cdn.example.com/hero.jpg" rel="preload" fetchpriority="high"></head>
\`\`\`

and the end of the body:

\`\`\`
<link rel="modulepreload" href="chunk-64H5WSYS.js"><script src="main-X3K23IBV.js" type="module"></script>
...
<script>document.querySelectorAll('link[data-beasties-media]').forEach(function(l){l.media=l.getAttribute('data-beasties-media');l.removeAttribute('data-beasties-media')})</script></body></html>
\`\`\`

**Client-side build** of the same app (no <code>server</code>, no prerendering), same stylesheet:

\`\`\`
<link rel="stylesheet" href="styles-VLKJHX3E.css" media="print" data-beasties-media="all">
<noscript><link rel="stylesheet" href="styles-VLKJHX3E.css"></noscript>
</head>
  <body>
    <app-root></app-root>
  <link rel="modulepreload" href="chunk-CX5BUKLO.js">
...
<script src="main-FRYFZIOR.js" type="module"></script>
\`\`\`

(<code>...</code> marks lines left out. The CSR copy had localisation enabled at the time, which only added a polyfills script.) The full <code>styles-*.css</code> in both builds still contained all three rules.

What this shows:

1. **Critical CSS was extracted, but only the rule in use.** The prerendered page inlined <code>h1{...}</code> and nothing else. The other rules wait in the async stylesheet.
2. **No content, no critical CSS.** The CSR page's body is <code>&lt;app-root&gt;&lt;/app-root&gt;</code>, so there is nothing for the inliner to match; it got no <code>&lt;style&gt;</code> at all. Critical CSS inlining pays off with [SSR or prerendering](/interview-question/what-is-angular-universal-ssr).
3. **The stylesheet no longer blocks rendering, in both builds.** <code>media="print"</code> does not block screen rendering; the inline script flips it to <code>all</code> once it has loaded, and <code>&lt;noscript&gt;</code> covers users without JavaScript.
4. **Scripts are off the path.** <code>type="module"</code> is deferred, and <code>modulepreload</code> starts downloading the shared chunk early.
5. **The LCP image starts early.** The <code>priority</code> hero image produced a <code>&lt;link rel="preload" fetchpriority="high"&gt;</code> in the head, see [NgOptimizedImage](/interview-question/how-do-you-optimize-images-in-angular-using-ngoptimizedimage).

📌 **Interview term: Beasties** — the critical CSS inliner the Angular build uses (the <code>data-beasties-*</code> attributes above; <code>@angular/ssr</code> 22.2.3 depends on <code>beasties</code> 0.5.4).

## 4. Component Styles and SSR

[Component](/interview-question/what-are-components-and-modules-in-angular) styles do not go through <code>styles.css</code>. The compiler bundles them into the JavaScript, scoped with emulated encapsulation attributes (see [ViewEncapsulation](/interview-question/what-is-viewencapsulation-in-angular)). In a CSR app they arrive with the component code, so there is no extra request but also no CSS until the JavaScript runs.

With SSR they are written into the document head. Rendering a component whose <code>styles</code> contain <code>.title { color: teal; }</code> through <code>renderApplication</code> produced:

\`\`\`
<html><head><style ng-app-id="ng">.title[_ngcontent-ng-c1659302078] { color: teal; }</style></head><body><app-root ng-version="22.2.3" ng-server-context="other"><app-card _nghost-ng-c1659302078=""><p _ngcontent-ng-c1659302078="" class="title">card</p></app-card></app-root></body></html>
\`\`\`

So server-rendered pages paint with their component styles already inline. The <code>anyComponentStyle</code> budget in the generated <code>angular.json</code> (see [the esbuild-based build](/interview-question/how-has-the-angular-build-changed-with-esbuild-vite-ng-build-ng-serve)) (warning at 4 kB, error at 8 kB per component) keeps that inline CSS from growing unnoticed.

## 5. Fonts

📌 **Interview term: Font inlining** — the build option <code>optimization.fonts.inline</code>. It downloads the CSS behind <code>&lt;link href="https://fonts.googleapis.com/..."&gt;</code> (or Adobe Fonts) at build time and inlines it, removing a render-blocking request to another origin.

The builder schema in <code>@angular/build</code> 22.2.3 describes it as: "Reduce render blocking requests by inlining external Google Fonts and Adobe Fonts CSS definitions in the application's HTML index file. This option requires internet access." Its default is <code>true</code> whenever optimisation is on. Because it needs internet, it was **not** run for this page, so no output is quoted.

What inlining does *not* do is make the font files themselves faster: the inlined CSS still points at <code>.woff2</code> files. The usual complements, all standard web practice rather than Angular features:

- <code>font-display: swap</code> (Google Fonts adds <code>&amp;display=swap</code>) so text shows in a fallback font instead of being invisible.
- Self-hosting fonts from your own origin, or a <code>preconnect</code> to the font origin.
- Fewer weights and subsets.

## 6. The Angular Levers, Mapped to the Path

| Problem on the critical path | Angular lever | Verified here |
| :--- | :--- | :--- |
| Global CSS blocks paint | Async stylesheet (<code>media="print"</code> swap) | Yes, both builds |
| First screen unstyled until CSS loads | Critical CSS inlining (<code>optimization.styles.inlineCritical</code>, default true) | Yes, prerendered build only |
| Empty HTML until JS runs | SSR or prerendering | Yes |
| Google or Adobe font CSS blocks text | <code>optimization.fonts.inline</code> | No: needs internet |
| Hero image discovered late | <code>NgOptimizedImage</code> <code>priority</code> (preload in SSR) | Yes |
| Too much JavaScript before interaction | [<code>@defer</code>](/interview-question/what-are-deferrable-views-defer-and-how-do-they-work-in-angular-17), [lazy routes](/interview-question/how-does-routing-and-lazy-loading-work-in-angular), budgets | Chunk split seen in build output |

## 7. Common Pitfalls

- **Expecting critical CSS in a CSR-only app.** With an empty <code>&lt;app-root&gt;</code> there is nothing to inline (verified). Prerender at least the landing pages.
- **Putting all styles in <code>styles.css</code>.** Global CSS is one file for every page; component styles travel with their component, and with SSR they are inlined automatically.
- **Disabling optimisation to debug, then measuring.** The development configuration in <code>angular.json</code> sets <code>"optimization": false</code>, which turns off inlining and minification; profile production builds.
- **Assuming font inlining preloads fonts.** It inlines the CSS only; the font files are still separate downloads.
- **Building font inlining in an offline CI.** The option needs network access during the build (the schema says so); plan for it or self-host fonts.
- **Marking many images <code>priority</code>.** Each becomes a high-priority preload competing with CSS.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"The critical render path is the chain of work the browser must finish before the first paint: HTML, then render-blocking CSS and fonts, then layout and paint."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Angular and CSS:</strong> <span style="color:#f0e2c8;">"A production build loads the global stylesheet without blocking, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">media="print"</code> that swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">all</code>, and inlines the CSS rules the initial HTML actually uses, through Beasties."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Only with content:</strong> <span style="color:#f0e2c8;">"Critical CSS needs HTML to inspect: in my builds the prerendered page got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;style&gt;h1{...}&lt;/style&gt;</code>, while the plain CSR build, whose body is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;app-root&gt;</code>, got no inline CSS."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scripts and fonts:</strong> <span style="color:#f0e2c8;">"Scripts are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type="module"</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">modulepreload</code>, so they never block parsing; fonts from Google Fonts or Adobe can be inlined at build time with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">optimization.fonts</code>, which needs internet."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The rest of the toolbox:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NgOptimizedImage</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority</code> preloads the LCP image, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@defer</code> keeps below-the-fold code off the path, and SSR puts the content in the first response."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is CSS render-blocking but a module script is not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The browser will not paint until it knows the styles, or it would flash unstyled content. Module scripts are deferred by default: they download in parallel and run after parsing, so they delay interactivity, not the first paint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">media="print"</code> trick do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A stylesheet for print media does not block screen rendering, so the browser downloads it without waiting. A tiny inline script then sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">media</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">all</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;noscript&gt;</code> copy keeps styles working without JavaScript.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did Angular inline every rule from styles.css?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, only the used one. My stylesheet had three rules; the prerendered page inlined just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h1{font:700 2rem/1.2 system-ui;color:#123}</code> because no element matched the other two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do component styles go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are compiled into the JavaScript, so no extra CSS request. With SSR they are written into the head as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;style ng-app-id="ng"&gt;</code> with the emulated encapsulation attributes, which I saw in the server output.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does font inlining work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">optimization.fonts.inline</code> (on by default in production) the build downloads the Google Fonts or Adobe Fonts CSS and puts it inline, removing one blocking request. The schema says it requires internet access, so I did not run it offline.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Critical render path** | The work the browser must do before first paint |
| **Render-blocking** | Must be downloaded before paint (CSS, fonts, sync scripts) |
| **Critical CSS** | Rules needed for the initial HTML, inlined into the page |
| **Beasties** | The critical CSS inliner used by the Angular build |
| **<code>media="print"</code> swap** | Loading a stylesheet without blocking, then switching it on |
| **Font inlining** | Embedding Google or Adobe font CSS at build time |
| **<code>modulepreload</code>** | Hint to download a JavaScript module early |

---
**Conclusion:** The critical render path is everything the browser must finish before painting, and CSS and fonts are its usual bottlenecks. Verified with CLI 22.2.3, a production build already loads the global stylesheet without blocking, keeps scripts deferred with <code>modulepreload</code>, preloads the priority image, and, when the HTML has content from prerendering or SSR, inlines exactly the CSS rules that content uses. Font CSS can be inlined too, but that step needs internet during the build and was not measured here; the remaining wins come from SSR, <code>@defer</code> and keeping both CSS and fonts lean.`,
    examples: [
      {
        label: "The component used for the build experiments: a priority hero image, SSR content and a deferred chart",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Chart } from './parts/chart';
import { Clock } from './parts/clock';

@Component({
  selector: 'app-root',
  imports: [Chart, Clock, NgOptimizedImage],
  template: \`
    <h1>Shop</h1>
    <img ngSrc="https://cdn.example.com/hero.jpg" width="800" height="400" priority alt="hero" />
    <ul>
      @for (p of products(); track p) { <li>{{ p }}</li> }
    </ul>
    <button (click)="count.set(count() + 1)">Clicked {{ count() }}</button>
    <app-clock ngSkipHydration />
    @defer (on viewport) {
      <app-chart />
    } @placeholder {
      <p>chart placeholder</p>
    }
  \`,
})
export class App {
  protected readonly products = signal(['Tea', 'Coffee']);
  protected readonly count = signal(0);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are security vulnerabilities in Angular apps, and how does DomSanitizer prevent XSS?",
    seoDescription:
      "How Angular blocks XSS by escaping and sanitizing bindings, what DomSanitizer and bypassSecurityTrust do, plus CSP, Trusted Types, XSRF and SSR hosts.",
    description: `**Question presented to candidate:**
"A security review found that user profiles accept HTML and links. Explain which vulnerabilities matter most in an Angular front end, how Angular protects against XSS by default, and when, if ever, you would use DomSanitizer's bypass methods."

**What a strong answer should cover:**
- **XSS** as the main client-side threat; Angular's model: **all bound values are untrusted** by default.
- **Contextual sanitization**: interpolation escapes text; HTML, URL and resource-URL contexts are sanitized or rejected (\`unsafe:\` prefix, stripped \`<script>\`/\`onerror\`, NG0904 for resource URLs).
- **DomSanitizer**: \`sanitize()\` for manual cleaning; \`bypassSecurityTrust*\` only for values you control, and the risk of using it on user input.
- Other defences: **CSP** (including \`autoCsp\` and nonces), **Trusted Types**, **AOT** and never compiling user templates, **XSRF** handling in HttpClient, SSR \`allowedHosts\`.
- Practical hygiene: no direct \`innerHTML\` via ElementRef, dependency updates, server-side validation.

**Clarifying questions expected:**
- "Do users need rich text, or would plain text plus markdown rendered safely do?"
- "Is the app server-rendered? That adds host-header and request-forgery concerns."

**Code / implementation expected:** Yes — bindings that show sanitization, and one justified \`bypassSecurityTrustResourceUrl\`.`,
    answer: `**Target Audience:** Angular developers preparing for security questions; no security background assumed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Sections 4 and 5 quote output from running both examples on Angular 22.2.3 (the first in AOT and playground modes, identical output). The CSP, XSRF and SSR findings came from a CLI 22.2.3 build, an HttpClient run with a recording <code>fetch</code>, and <code>renderApplication</code>. No real attack against a browser was performed; jsdom does not execute <code>javascript:</code> URLs or inline handlers the way a browser would.

## 1. Why This Even Matters — A Story First

A noticeboard in an office lets anyone pin up a message. One day somebody pins a note that says, in small print, "whoever reads this, please hand your badge to the person standing behind you". Most people would laugh. A browser does not laugh: if a "message" contains <code>&lt;script&gt;</code>, it runs it, with the reader's cookies, session and permissions.

That is **cross-site scripting (XSS)**: an attacker gets the page to treat their data as code. In a single-page app, the noticeboard is every place you show something a user typed: names, comments, profile bios, links.

Angular's answer is to treat every value you bind as a message, never as instructions, unless you explicitly sign it as safe. <code>DomSanitizer</code> is the clerk who checks the messages, and the <code>bypassSecurityTrust...</code> methods are you signing one yourself.

## 2. The Core Idea

📌 **Interview term: Cross-site scripting (XSS)** — injecting script into a page that other users load. *Stored* XSS comes back from your database, *reflected* XSS from a URL parameter, *DOM-based* XSS from client code writing untrusted data into the DOM.

📌 **Interview term: Security context** — what a bound value is used as. Angular's <code>SecurityContext</code> has <code>HTML</code> (<code>[innerHTML]</code>), <code>URL</code> (<code>[href]</code>, <code>&lt;img [src]&gt;</code>), <code>RESOURCE_URL</code> (<code>&lt;iframe [src]&gt;</code>, <code>&lt;script [src]&gt;</code>), <code>STYLE</code> and <code>SCRIPT</code>. Each has its own rule.

📌 **Interview term: Sanitization** — rewriting an untrusted value so it is safe in its context: removing <code>&lt;script&gt;</code> and <code>on*</code> attributes from HTML, neutralising <code>javascript:</code> URLs. Interpolation <code>{{ }}</code> does not need it, because it always produces text, never markup (see [data binding types](/interview-question/what-are-the-types-of-data-binding-in-angular)).

📌 **Interview term: DomSanitizer** — the service in <code>@angular/platform-browser</code> that does the sanitizing. You call <code>sanitize(context, value)</code> to clean by hand, or a <code>bypassSecurityTrustHtml / Style / Script / Url / ResourceUrl</code> method to wrap a value you vouch for.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="An untrusted value goes to interpolation as text, to innerHTML through the HTML sanitizer, to href through the URL sanitizer, and to iframe src only if explicitly trusted">
  <defs>
    <marker id="q10san-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="120" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="115" y="155" text-anchor="middle">Untrusted value</text>
  <path class="d-edge" d="M 204 140 L 300 52" marker-end="url(#q10san-arrow)"/>
  <path class="d-edge" d="M 204 146 L 300 122" marker-end="url(#q10san-arrow)"/>
  <path class="d-edge" d="M 204 156 L 300 190" marker-end="url(#q10san-arrow)"/>
  <path class="d-edge-dashed" d="M 204 166 L 300 258" marker-end="url(#q10san-arrow)"/>
  <rect class="d-box" x="306" y="26" width="384" height="50" rx="10"/>
  <text class="d-text" x="498" y="56" text-anchor="middle">interpolation: always text, never parsed</text>
  <rect class="d-box" x="306" y="96" width="384" height="50" rx="10"/>
  <text class="d-text" x="498" y="126" text-anchor="middle">innerHTML: HTML sanitizer strips scripts</text>
  <rect class="d-box" x="306" y="166" width="384" height="50" rx="10"/>
  <text class="d-text" x="498" y="196" text-anchor="middle">href or img src: unsafe URLs prefixed</text>
  <rect class="d-box-muted" x="306" y="236" width="384" height="50" rx="10"/>
  <text class="d-text" x="498" y="266" text-anchor="middle">iframe src: refused unless trusted</text>
</svg>

Each binding target has its own rule: the less the browser can do with a value, the more Angular lets through. A resource URL can load and run a whole document, so Angular will not clean it at all; it demands that you trust it explicitly.

## 3. Why the Defaults Are Strong

The protection lives in the compiler. When <code>ngc</code> sees <code>[innerHTML]="html"</code> it emits a sanitizer call for that binding (the core exports include <code>ɵɵsanitizeHtml</code>, <code>ɵɵsanitizeUrl</code>, <code>ɵɵsanitizeResourceUrl</code>, <code>ɵɵsanitizeStyle</code> and <code>ɵɵsanitizeScript</code>). You do not have to remember anything for normal bindings; you have to *go out of your way* to be unsafe, by bypassing the sanitizer or by writing to the DOM directly with <code>nativeElement.innerHTML</code> (see [ElementRef](/interview-question/what-is-the-difference-between-elementref-templateref-and-viewcontainerref)), which is plain browser API and never sanitized. That is one more reason to prefer bindings or [Renderer2](/interview-question/why-use-renderer2-instead-of-direct-dom-access) over raw DOM access.

## 4. Verified: untrusted data in bindings

The first example binds one hostile string, <code>&lt;b&gt;Hi&lt;/b&gt;&lt;img src="x" onerror="alert(1)"&gt;&lt;script&gt;alert(2)&lt;/script&gt;&lt;a href="javascript:alert(3)"&gt;me&lt;/a&gt;</code>, as text and as HTML, and a <code>javascript:</code> URL into <code>[href]</code>. Read back from the DOM:

\`\`\`
interpolation text  : <b>Hi</b><img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">me</a>
innerHTML result    : <b>Hi</b><img src="x"><a href="unsafe:javascript:alert(3)">me</a>
[href] javascript:  : unsafe:javascript:alert(4)
[href] https:       : https://example.com/docs
\`\`\`

and on the console, in development mode:

\`\`\`
WARNING: sanitizing unsafe URL value javascript:alert(3) (see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss)
WARNING: sanitizing HTML stripped some content, see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss
WARNING: sanitizing unsafe URL value javascript:alert(4) (see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss)
\`\`\`

- **Interpolation** showed the markup as literal characters. Nothing was parsed.
- **<code>[innerHTML]</code>** kept the harmless <code>&lt;b&gt;</code> and <code>&lt;img&gt;</code>, removed the <code>onerror</code> attribute, removed the <code>&lt;script&gt;</code> element *and its content*, and neutralised the nested link.
- **<code>[href]</code>** got the <code>unsafe:</code> prefix for <code>javascript:</code>; a normal <code>https:</code> URL passed untouched.

## 5. Verified: DomSanitizer by hand

The second example [injects](/interview-question/how-does-dependency-injection-work-in-angular) <code>DomSanitizer</code>, calls <code>sanitize()</code> for four contexts and uses two bypass methods:

\`\`\`
sanitize html       : "<b>bold</b>"
sanitize url        : "unsafe:javascript:alert(1)"
sanitize dataImage  : "data:image/png;base64,iVBORw0KGgo="
sanitize style      : "background: url(javascript:alert(1))"
bypass innerHTML    : <button onclick="track()">Trusted markup</button>
iframe src          : https://www.youtube-nocookie.com/embed/abc123
\`\`\`

- <code>sanitize(SecurityContext.HTML, ...)</code> dropped the <code>onclick</code> and the script, exactly as the binding did.
- **Data URLs for images are allowed** by the URL sanitizer.
- **Style is not sanitized** in 22.2.3: the value came back unchanged. Browsers no longer execute script from CSS, but a user-controlled style can still overlay or hide content, so do not bind it from untrusted input.
- **Bypass means no checking**: the <code>onclick</code> survived. That is correct for markup you wrote; it would be an XSS hole for a user's bio.
- **Resource URLs must be trusted.** The iframe rendered only because the URL was wrapped with <code>bypassSecurityTrustResourceUrl</code>.

Two failures from small variants confirm the rules:

| Variant | Result |
| :--- | :--- |
| <code>&lt;iframe [src]="url"&gt;</code> with a plain string | <code>NG0904: unsafe value used in a resource URL context</code> |
| A <code>SafeHtml</code> bound to <code>[href]</code> | <code>Required a safe URL, got a HTML</code> |

📌 **Interview term: Trust type** — a <code>SafeHtml</code>, <code>SafeUrl</code>, <code>SafeResourceUrl</code>, <code>SafeStyle</code> or <code>SafeScript</code> wrapper. It is only accepted in its own context, as the second row shows.

## 6. The Rest of the Threat List

| Vulnerability | Angular defence | What you still do |
| :--- | :--- | :--- |
| XSS via bindings | Contextual escaping and sanitization (verified above) | Never <code>bypassSecurityTrust*</code> user data |
| XSS via template injection | [AOT compilation](/interview-question/what-is-the-difference-between-aot-and-jit-compilation): templates are compiled at build time | Never build template strings from user input and compile them at runtime |
| XSS that slips through anyway | **CSP** and **Trusted Types** limit what injected code can do | Deploy a CSP; enable Trusted Types |
| Cross-site request forgery | HttpClient XSRF support | Server must issue the token cookie and verify the header |
| Host-header attacks on [SSR](/interview-question/what-is-angular-universal-ssr) | <code>allowedHosts</code> (<code>NG05706</code> for unknown hosts) | List your real domains |
| Vulnerable packages | <code>ng update</code>, supported versions | Keep Angular and dependencies current |

📌 **Interview term: Content Security Policy (CSP)** — an HTTP header or meta tag telling the browser which scripts and styles may run. Setting <code>"security": { "autoCsp": true }</code> in <code>angular.json</code> made the CLI 22.2.3 build emit:

\`\`\`
<meta http-equiv="Content-Security-Policy" content="script-src 'strict-dynamic' 'sha256-5XN0ZQYKbgSO6jNwFNLxNDXNYF66qTUzkLRWILHqkQ0=' 'sha256-LMY6wYoFV9I4wWzxaq1N/dTpl4iurQktw706UCHK3vM=' https: 'unsafe-inline';object-src 'none';base-uri 'self';">
\`\`\`

and replaced the <code>&lt;script src="main...js"&gt;</code> tag with a small hashed loader script. In this form <code>'unsafe-inline'</code> and <code>https:</code> are fallbacks that browsers supporting <code>'strict-dynamic'</code> ignore. The same option on the SSR project failed the build with <code>Cannot set both SSR and auto-CSP at the same time.</code> For SSR, use a per-request nonce: <code>&lt;app-root ngCspNonce="..."&gt;</code> (or the <code>CSP_NONCE</code> token) made the server-rendered <code>&lt;style&gt;</code> tag carry <code>nonce="r4nd0m"</code> in a <code>renderApplication</code> run.

📌 **Interview term: Trusted Types** — a browser feature that only lets typed, policy-created values reach dangerous sinks like <code>innerHTML</code>. Angular 22.2.3 creates policies named <code>angular</code> and <code>angular#unsafe-bypass</code> (found in the <code>@angular/core</code> source), which you allow in the <code>trusted-types</code> CSP directive.

📌 **Interview term: XSRF / CSRF** — tricking a logged-in browser into sending a state-changing request. HttpClient reads the <code>XSRF-TOKEN</code> cookie and sends it as <code>X-XSRF-TOKEN</code>. Verified with a recording <code>fetch</code> and the cookie set:

\`\`\`
GET  /api/me                              X-XSRF-TOKEN: null
POST /api/orders                          X-XSRF-TOKEN: abc123
POST https://other.example.com/track      X-XSRF-TOKEN: null
\`\`\`

The header is added to mutating requests to your own origin, not to <code>GET</code>, and never to another host, so the token does not leak. <code>withXsrfConfiguration({ cookieName, headerName })</code>, a feature of [<code>provideHttpClient</code>](/interview-question/what-is-providehttpclient-withinterceptors-and-how-does-it-replace-legacy-http-i), renames them; <code>withNoXsrfProtection()</code> turns it off. Request-level concerns such as auth headers usually live in an [HTTP interceptor](/interview-question/what-is-an-http-interceptor).

## 7. Common Pitfalls

- **<code>bypassSecurityTrustHtml</code> on user content "because the sanitizer removed my styling".** That re-opens XSS. Sanitize on the server, allow a safe subset, or render markdown with a sanitizing library.
- **Writing <code>nativeElement.innerHTML</code> directly.** It skips Angular entirely. Use <code>[innerHTML]</code> and let the sanitizer run.
- **Assuming styles are sanitized.** They are passed through (verified); do not bind user-controlled CSS.
- **Thinking the <code>unsafe:</code> warning is noise.** It means hostile or broken data reached a URL binding; find where it came from.
- **Trusting an embed URL from the query string.** <code>bypassSecurityTrustResourceUrl</code> must only wrap URLs you build from an allow-list.
- **Relying on client-side checks alone.** Sanitization protects rendering; validate and authorise on the server as well.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Main threat:</strong> <span style="color:#f0e2c8;">"The big one in a front-end app is cross-site scripting: attacker-controlled data ending up as code in the page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default defence:</strong> <span style="color:#f0e2c8;">"Angular treats every bound value as untrusted: interpolation is always text, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[innerHTML]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[href]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[src]</code> are sanitized for their security context, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onerror</code> handlers, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script&gt;</code> tags and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">javascript:</code> URLs are removed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. DomSanitizer:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DomSanitizer</code> is the service behind that. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sanitize(context, value)</code> cleans a value by hand, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bypassSecurityTrustHtml</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Url</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ResourceUrl</code> and friends mark a value you vouch for, so Angular stops checking it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When bypass is right:</strong> <span style="color:#f0e2c8;">"Only for values you control, such as an embed URL from your own config; resource URLs like iframe <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">src</code> are never sanitized, so they must be trusted explicitly or Angular throws NG0904."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond XSS:</strong> <span style="color:#f0e2c8;">"Add a CSP, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">autoCsp</code> can generate, Trusted Types, HttpClient XSRF protection, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowedHosts</code> for SSR, AOT templates and up-to-date dependencies; and never build templates from user input."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[innerHTML]</code> make my app unsafe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself: Angular sanitizes it. In my test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(2)&lt;/script&gt;</code> came out as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;img src="x"&gt;</code> with the script gone, plus a dev warning. It becomes unsafe when you bypass the sanitizer on user data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are style bindings sanitized?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In 22.2.3 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sanitize(SecurityContext.STYLE, 'background: url(javascript:alert(1))')</code> returned the value unchanged, because modern browsers do not execute script from CSS. Style injection can still deface a page, so do not bind user CSS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unsafe:</code> prefix mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular found a URL with a dangerous scheme such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">javascript:</code> and prefixed it so the browser will not run it. I saw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsafe:javascript:alert(4)</code> in the rendered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">href</code>, and a console warning in dev mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if I pass a SafeHtml to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[href]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Angular checks the trust type matches the context: binding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SafeHtml</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[href]</code> threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Required a safe URL, got a HTML</code>. Trusted values are not interchangeable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Angular help with CSP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">security.autoCsp</code> in angular.json and the build adds a hash-based CSP meta tag with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict-dynamic</code>; it cannot be combined with SSR. For SSR or custom setups, pass a nonce with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ngCspNonce</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CSP_NONCE</code> and Angular adds it to the styles it creates.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XSS** | Attacker data executed as script in other users' browsers |
| **Security context** | What a value is used as: HTML, URL, resource URL, style, script |
| **Sanitization** | Rewriting a value so it is safe for its context |
| **DomSanitizer** | Angular service to sanitize or explicitly trust values |
| **<code>bypassSecurityTrust*</code>** | Marks a value as safe; Angular stops checking it |
| **CSP** | Browser policy limiting which scripts and styles may run |
| **Trusted Types** | Browser feature that only lets policy-created values reach DOM sinks |
| **XSRF token** | Cookie value echoed in a header to prove a request is same-site |

---
**Conclusion:** Angular's security model is "every bound value is untrusted until proven otherwise". Verified on 22.2.3, interpolation printed hostile markup as text, <code>[innerHTML]</code> stripped the script and the <code>onerror</code> handler, URL bindings got the <code>unsafe:</code> prefix, and resource URLs were refused until explicitly trusted. <code>DomSanitizer</code> exposes the same cleaning, and its bypass methods are a signature: use them only for values you control. Around that core, a CSP (which <code>autoCsp</code> can generate for CSR builds), Trusted Types, HttpClient's XSRF header, SSR's <code>allowedHosts</code> and plain dependency hygiene cover the rest of the front-end threat list.`,
    examples: [
      {
        label: "What Angular does to untrusted HTML and URLs in bindings",
        tech: "angular",
        runnable: true,
        code: `import { Component } from "@angular/core";

// Untrusted input, e.g. a user bio or a link pasted into a comment.
const EVIL_HTML = \`<b>Hi</b><img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">me</a>\`;

@Component({
  selector: "app-root",
  template: \`
    <!-- 1. Interpolation: always text, never parsed as HTML. -->
    <p id="interp">{{ html }}</p>

    <!-- 2. [innerHTML]: parsed, but run through the HTML sanitizer first. -->
    <div id="inner" [innerHTML]="html"></div>

    <!-- 3. [href]: URL context, dangerous schemes are neutralised. -->
    <a id="link" [href]="url">profile</a>
    <a id="safe" [href]="okUrl">docs</a>
  \`,
})
export class AppComponent {
  html = EVIL_HTML;
  url = "javascript:alert(4)";
  okUrl = "https://example.com/docs";
}`,
      },
      {
        label: "DomSanitizer by hand: sanitize() and the bypassSecurityTrust methods",
        tech: "angular",
        runnable: false,
        code: `import { Component, SecurityContext, inject } from "@angular/core";
import { DomSanitizer, SafeHtml, SafeResourceUrl } from "@angular/platform-browser";

const VIDEO = "https://www.youtube-nocookie.com/embed/abc123";

@Component({
  selector: "app-root",
  template: \`
    <div id="trusted" [innerHTML]="trustedHtml"></div>
    <iframe id="video" [src]="videoUrl" title="Demo video"></iframe>
  \`,
})
export class AppComponent {
  private sanitizer = inject(DomSanitizer);

  // sanitize(): the same cleaning Angular applies to bindings, called by hand.
  cleaned = {
    html: this.sanitizer.sanitize(SecurityContext.HTML, \`<b onclick="steal()">bold</b><script>x()</script>\`),
    url: this.sanitizer.sanitize(SecurityContext.URL, "javascript:alert(1)"),
    dataImage: this.sanitizer.sanitize(SecurityContext.URL, "data:image/png;base64,iVBORw0KGgo="),
    style: this.sanitizer.sanitize(SecurityContext.STYLE, "background: url(javascript:alert(1))"),
  };

  // bypassSecurityTrust*(): YOU vouch for the value; Angular stops checking it.
  // Only for values you control, never for user input.
  trustedHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(\`<button onclick="track()">Trusted markup</button>\`);
  // A resource URL (iframe src, script src) is never sanitized: it must be explicitly trusted.
  videoUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(VIDEO);
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle internationalization (i18n) in Angular?",
    seoDescription:
      "Angular i18n with @angular/localize: i18n attributes, $localize, ICU plurals, ng extract-i18n, XLIFF translations and per-locale builds, run on CLI 22.2.3.",
    description: `**Question presented to candidate:**
"We need our Angular app in English and French, with correct plurals, dates and currencies, and the marketing team wants French URLs to be indexable. How do you internationalise an Angular app, and what does the build produce?"

**What a strong answer should cover:**
- \`@angular/localize\` (\`ng add @angular/localize\`); mark templates with \`i18n\`, attributes with \`i18n-<attr>\`, code with \`$localize\`.
- **Message IDs**: generated by default, custom with \`@@id\`; meaning and description for translators.
- **ICU expressions** for plural and select.
- \`ng extract-i18n\` produces XLIFF (or JSON, ARB, XMB); translators return per-locale files.
- \`angular.json\` \`i18n.sourceLocale\` / \`locales\` and \`localize: true\`: one build per locale, own folder, \`<base href>\` and \`lang\`.
- \`LOCALE_ID\` drives \`DatePipe\`, \`CurrencyPipe\`, \`DecimalPipe\`.
- Trade-offs: build-time (fast, needs a reload to switch) vs runtime libraries; missing-translation handling; SSR hydration with \`withI18nSupport()\`.

**Clarifying questions expected:**
- "Must users switch language without reloading the page?"
- "How will the server route \`/fr/\` and \`/en-US/\` to the right build?"

**Code / implementation expected:** Yes — a marked-up template with an ICU plural, and the translation workflow.`,
    answer: `**Target Audience:** Angular developers who need to ship an app in more than one language; no localisation experience assumed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every command and output in sections 4 to 6 was run with Angular CLI 22.2.3 on Node 24 in a copy of a fresh <code>ng new</code> app with SSR prerendering enabled, offline. <code>ng add</code> itself was not run (it installs from the network); the <code>@angular/localize</code> package was copied in and its <code>ng-add</code> schematic run directly. Serving locales from a real web server was not tested.

## 1. Why This Even Matters — A Story First

A publisher wants a novel in English and French. One approach: print the English book, and glue a little French sticker over every sentence, peeled off and re-stuck whenever a reader changes their mind. Another: send the manuscript to a translator, then print a separate French edition. Each edition is a normal book; nothing is peeled at reading time.

Angular's built-in i18n is the second approach. You mark every sentence in your templates and code, a tool extracts them into a file for translators, and the build prints a separate, complete edition of your app per language. The first approach, swapping text at runtime, exists too (runtime libraries), and choosing between them is a classic interview question.

The hard part of the book analogy is not the words, it is the grammar. "1 item, 2 items" is simple in English; other languages have more plural forms, and dates, numbers and currencies are written differently everywhere. A real i18n setup handles both.

## 2. The Core Idea

📌 **Interview term: Internationalisation (i18n) vs localisation (l10n)** — i18n is preparing the app so it *can* be translated (marking text, using locale-aware formatting); l10n is producing a version for one locale (the French translation, French date formats).

📌 **Interview term: <code>@angular/localize</code>** — Angular's i18n package. It provides the global <code>$localize</code> tagged template, the <code>i18n</code> template attributes, the extraction tooling and the translation step of the build.

📌 **Interview term: Locale ID** — a tag such as <code>en-US</code> or <code>fr</code> that selects translations *and* formatting rules. Inside the app it is the <code>LOCALE_ID</code> [injection token](/interview-question/what-is-an-injectiontoken), which <code>DatePipe</code>, <code>CurrencyPipe</code> and <code>DecimalPipe</code> (see [pipes](/interview-question/what-are-pipes-in-angular)) read.

📌 **Interview term: ICU expression** — a message format for plurals and choices, such as <code>{count, plural, =0 {no items} =1 {one item} other {{{count}} items}}</code>. Translators rewrite each branch for their language.

## 3. The Workflow

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="Mark text with i18n and localize, extract to an XLIFF file, translators return one file per locale, the build produces one app per locale">
  <defs>
    <marker id="q11i18n-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="95" y="74" text-anchor="middle">Mark text</text>
  <text class="d-sub" x="95" y="98" text-anchor="middle">i18n and localize</text>
  <path class="d-edge" d="M 174 80 L 210 80" marker-end="url(#q11i18n-arrow)"/>
  <rect class="d-box" x="216" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="291" y="74" text-anchor="middle">Extract</text>
  <text class="d-sub" x="291" y="98" text-anchor="middle">messages.xlf</text>
  <path class="d-edge" d="M 370 80 L 406 80" marker-end="url(#q11i18n-arrow)"/>
  <rect class="d-box" x="412" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="487" y="74" text-anchor="middle">Translate</text>
  <text class="d-sub" x="487" y="98" text-anchor="middle">messages.fr.xlf</text>
  <path class="d-edge-accent" d="M 487 124 L 487 160" marker-end="url(#q11i18n-arrow)"/>
  <rect class="d-box-accent" x="250" y="166" width="440" height="80" rx="10"/>
  <text class="d-text d-accent" x="470" y="200" text-anchor="middle">ng build with localize</text>
  <text class="d-sub" x="470" y="224" text-anchor="middle">dist/browser/en-US and dist/browser/fr</text>
</svg>

Marking happens in your code; extracting and building are CLI commands; translation is done by people or a translation service on the extracted file. The output is a complete app per locale, not one app with a dictionary.

## 4. Step 1: add the package and mark the text

Running the <code>@angular/localize</code> <code>ng-add</code> schematic printed:

\`\`\`
UPDATE src/main.ts (264 bytes)
UPDATE tsconfig.app.json (413 bytes)
UPDATE tsconfig.spec.json (424 bytes)
UPDATE angular.json (2131 bytes)
\`\`\`

It added <code>/// &lt;reference types="@angular/localize" /&gt;</code> to <code>main.ts</code>, <code>"types": ["@angular/localize"]</code> to the tsconfigs, and <code>"polyfills": ["@angular/localize/init"]</code> to the build options. (<code>ng add @angular/localize</code> would also install the package and add it to <code>package.json</code>; see [what the Angular CLI provides](/interview-question/what-does-the-angular-cli-provide).)

The example on this page then marks:

- <code>&lt;h1 i18n="Shop header|Greeting at the top of the home page@@homeWelcome"&gt;</code> — meaning, description and a custom ID in one attribute (<code>meaning|description@@id</code>).
- <code>i18n-alt</code> on an <code>&lt;img&gt;</code> — attribute translation.
- <code>&lt;p i18n&gt;You have {count(), plural, ...} in your basket.&lt;/p&gt;</code> — text with an ICU plural inside.
- <code>$localize</code> with a <code>:@@pageTitle:</code> prefix — a string in TypeScript code (the <code>title</code> field).
- <code>number</code>, <code>currency</code> and <code>date</code> pipes, and <code>LOCALE_ID</code> printed for reference.

📌 **Interview term: Custom message ID** — the <code>@@homeWelcome</code> part. Without it the ID is a hash of the text and meaning, so changing a comma creates a "new" message and loses its translation. Custom IDs keep translations attached while wording evolves.

## 5. Step 2: extract

<code>ng extract-i18n --output-path src/locale</code> printed <code>Extraction Complete. (Messages: 5)</code> and wrote <code>messages.xlf</code>. Excerpts:

\`\`\`
<trans-unit id="homeWelcome" datatype="html">
  <source>Welcome to the shop</source>
  ...
  <note priority="1" from="description">Greeting at the top of the home page</note>
  <note priority="1" from="meaning">Shop header</note>
</trans-unit>
<trans-unit id="1290084957662389539" datatype="html">
  <source>Shop logo</source>
  ...
<trans-unit id="5541335760056309968" datatype="html">
  <source>You have <x id="ICU" equiv-text="{count(), plural, =0 {no items} =1 {one item} other {{{count()}} items}}" xid="4852798469477802070"/> in your basket.</source>
  ...
<trans-unit id="4151835343882286517" datatype="html">
  <source>{VAR_PLURAL, plural, =0 {no items} =1 {one item} other {<x id="INTERPOLATION"/> items}}</source>
\`\`\`

Five messages from four marked places: the sentence containing the plural became **two** units, the outer sentence with an <code>ICU</code> placeholder and the plural itself, so translators can reorder the sentence and the plural independently. The <code>alt</code> text got a numeric generated ID because no <code>@@</code> was given. Other formats are available with <code>--format</code>; the 22.2.3 builder accepts <code>xmb</code>, <code>xlf</code>/<code>xliff</code>, <code>xlf2</code>/<code>xliff2</code>, <code>json</code> and <code>arb</code>.

## 6. Step 3: translate and build

A French copy, <code>messages.fr.xlf</code>, got a <code>&lt;target&gt;</code> for each unit (for the plural: <code>{VAR_PLURAL, plural, =0 {aucun article} =1 {un article} other {&lt;x id="INTERPOLATION"/&gt; articles}}</code>). Then <code>angular.json</code> got:

\`\`\`
"i18n": { "sourceLocale": "en-US", "locales": { "fr": "src/locale/messages.fr.xlf" } }
... "options": { ..., "localize": true }
\`\`\`

<code>ng build</code> printed <code>Prerendered 2 static routes.</code> and produced <code>dist/demo/browser/en-US/index.html</code> and <code>dist/demo/browser/fr/index.html</code>. The rendered parts:

\`\`\`
== en-US
<html lang="en-US" dir="ltr">
<base href="/en-US/">
<h1>Welcome to the shop</h1>
<img src="logo.png" alt="Shop logo" width="40" height="40">
<p>You have <!--ngtns-->3 items<!----> in your basket.</p>
<p>Products on sale</p>
<p>1,234,567.891 | €1,299.50 | Friday, October 16, 2026</p>
<small>LOCALE_ID = en-US</small>
== fr
<html lang="fr" dir="ltr">
<base href="/fr/">
<h1>Bienvenue dans la boutique</h1>
<img src="logo.png" alt="Logo de la boutique" width="40" height="40">
<p>Vous avez <!--ngtns-->3 articles<!----> dans votre panier.</p>
<p>Produits en promotion</p>
<p>1 234 567,891 | 1 299,50&nbsp;€ | vendredi 16 octobre 2026</p>
<small>LOCALE_ID = fr</small>
\`\`\`

Everything a French user sees changed: text, <code>alt</code>, the plural, the <code>$localize</code> string from TypeScript, the number grouping and decimal comma (the spaces in <code>1 234 567</code> are U+202F narrow no-break spaces), the currency position and the date. The build also set <code>lang</code>, <code>dir</code> and a per-locale <code>&lt;base href&gt;</code>, so links and lazy chunks resolve inside <code>/fr/</code>. Because the app was [prerendered](/interview-question/what-is-angular-universal-ssr), the French page is real French HTML that crawlers can index. The deployment side, routing <code>/fr/</code> to that folder on a real server, was not tested here; see [dynamic base href](/interview-question/how-do-you-configure-dynamic-base-href-in-angular-builds-for-different-environme) for how base paths interact with hosting.

The <code>&lt;!--ngtns--&gt;</code> comments are hydration markers for i18n text; the app config used <code>provideClientHydration(withI18nSupport())</code>, public API since 20.0 according to the typings. See [hydration in modern Angular](/interview-question/how-does-hydration-work-in-modern-angular-ssr-and-what-is-non-destructive-hydrat).

## 7. Verified: what happens when a translation is missing

Two experiments on the French file:

| Change | Build output | French page |
| :--- | :--- | :--- |
| Removed the whole <code>pageTitle</code> unit | <code>[WARNING] No translation found for "pageTitle" ("Products on sale").</code> | <code>&lt;p&gt;Products on sale&lt;/p&gt;</code> |
| Kept the unit but deleted its <code>&lt;target&gt;</code> | No warning | <code>&lt;p&gt;Products on sale&lt;/p&gt;</code> |

Both fall back to the source text, but only the first one tells you. The <code>i18nMissingTranslation</code> build option (<code>warning</code> by default, or <code>error</code>, or <code>ignore</code>) controls the first case; for the second, check your translation files for empty targets in CI.

## 8. Build-Time vs Runtime Translation

The build-time approach above is Angular's default. <code>$localize</code> can also translate at runtime: calling <code>loadTranslations()</code> from <code>@angular/localize</code> before bootstrapping. Verified with an [AOT-compiled](/interview-question/what-is-the-difference-between-aot-and-jit-compilation) component in jsdom:

\`\`\`
[source] Welcome to the shopone item | title: Products on sale
[fr] Bienvenue dans la boutiqueun article | title: Produits en promotion
[fr] after n.set(4): Bienvenue dans la boutique4 articles
\`\`\`

(Text content, so elements run together.) The ICU plural reacted to a [signal](/interview-question/what-are-angular-signals) change in the translated form. A first attempt with <code>{$VAR_PLURAL, ...}</code> in the translation was rejected with "There is a placeholder name mismatch with the translation provided for the message", so placeholders must be written exactly as extracted. <code>loadTranslations</code> only replaces message text; number, date and currency formatting is configured separately through <code>LOCALE_ID</code> and <code>registerLocaleData</code>, which this run did not exercise.

| | Build-time (<code>localize: true</code>) | Runtime (<code>loadTranslations</code> or a library such as Transloco) |
| :--- | :--- | :--- |
| Switching language | New page load (another folder) | Possible without reload (libraries) |
| Runtime cost | None: strings are inlined | Lookup and the translation file at startup |
| Build time | One build pass, one output per locale | One build |
| SEO with prerendering | Separate, real HTML per locale | Depends on the setup |
| Pipes and <code>LOCALE_ID</code> | Set per build automatically | You manage it |

## 9. Common Pitfalls

- **Relying on generated IDs.** Editing source text changes the ID and silently orphans translations; use <code>@@ids</code> for anything important.
- **Concatenating translated fragments.** <code>'You have ' + n + ' items'</code> cannot be translated correctly; use one message with an ICU plural.
- **Empty <code>&lt;target&gt;</code> elements.** They fall back to the source with no warning (verified).
- **Forgetting <code>lang</code> and <code>&lt;base href&gt;</code> in custom deployments.** The CLI sets them per locale; a hand-rolled server must serve each locale folder at its base path.
- **Hard-coded formats.** Use the <code>date</code>, <code>currency</code> and <code>number</code> pipes so the locale decides; the French build changed all three (verified).
- **Letting missing translations slide in CI.** Set <code>i18nMissingTranslation</code> to <code>error</code> for release builds so a removed unit fails the build instead of warning.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The built-in route:</strong> <span style="color:#f0e2c8;">"Angular i18n is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@angular/localize</code>: you mark text with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i18n</code> attribute or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$localize</code> in code, extract it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ng extract-i18n</code>, and translators return one file per locale."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Build-time by default:</strong> <span style="color:#f0e2c8;">"With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localize: true</code> the CLI builds one copy of the app per locale, with the translations baked in, its own folder, base href and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lang</code> attribute."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Plurals and formats:</strong> <span style="color:#f0e2c8;">"ICU expressions handle plurals and selects, and pipes like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">currency</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOCALE_ID</code>, which the localized build sets for you."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Stable IDs:</strong> <span style="color:#f0e2c8;">"Give important messages a custom ID with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@@</code>, plus a meaning and description for translators, so wording tweaks do not orphan translations."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternatives:</strong> <span style="color:#f0e2c8;">"If you need to switch language without a reload, runtime libraries such as Transloco are the usual choice, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loadTranslations</code> before bootstrap; the trade-off is runtime cost versus one build per locale."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ng extract-i18n</code> produce?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An XLIFF 1.2 file by default. For my component it printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Extraction Complete. (Messages: 5)</code> and listed each message with its ID, source text, file and line, plus the meaning and description from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i18n</code> attribute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are plurals translated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As ICU messages. The extracted unit was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{VAR_PLURAL, plural, =0 {no items} =1 {one item} other {&lt;x id="INTERPOLATION"/&gt; items}}</code>; the French target swapped the words and kept the placeholders, and the French build rendered <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 articles</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a translation is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the whole unit is missing, the build warned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">No translation found for "pageTitle"</code> and used the source text. If the unit exists but has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;target&gt;</code>, it silently used the source with no warning, which I found surprising.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do pipes change with the locale?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The same template gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1,234,567.891 | €1,299.50 | Friday, October 16, 2026</code> in en-US and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 234 567,891 | 1 299,50 € | vendredi 16 octobre 2026</code> in fr, where the French spaces are narrow no-break spaces.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does i18n work with SSR hydration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">provideClientHydration(withI18nSupport())</code>, marked public API from 20.0 in the typings. The prerendered French page carried hydration markers such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;!--ngtns--&gt;</code> around the ICU text.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **i18n / l10n** | Making an app translatable / producing one translated version |
| **<code>@angular/localize</code>** | Angular's i18n package: <code>$localize</code>, extraction, build-time translation |
| **<code>i18n</code> attribute** | Marks template text (and <code>i18n-x</code> for attribute x) for translation |
| **<code>$localize</code>** | Tagged template for translatable strings in TypeScript |
| **ICU expression** | Message syntax for plural and select forms |
| **XLIFF** | XML file format for messages and their translations |
| **<code>LOCALE_ID</code>** | Token that sets the locale for formatting pipes |
| **Custom ID (<code>@@id</code>)** | A stable message ID that survives wording changes |

---
**Conclusion:** Angular i18n is a pipeline: mark text with <code>i18n</code> and <code>$localize</code>, extract it with <code>ng extract-i18n</code>, translate the XLIFF, and build with <code>localize: true</code>. Run end to end on CLI 22.2.3, it produced two prerendered apps under <code>/en-US/</code> and <code>/fr/</code>, each with its own <code>lang</code>, base href, translated text, correct French plural and locale-aware numbers, currency and dates. It warns about a missing translation unit but not about an empty target, and it switches language by loading another build; when the product needs live switching, runtime translation is the trade-off to discuss.`,
    examples: [
      {
        label: "A component marked for translation: i18n attributes, an ICU plural, $localize and locale-aware pipes",
        tech: "angular",
        runnable: false,
        code: `import { Component, LOCALE_ID, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  template: \`
    <h1 i18n="Shop header|Greeting at the top of the home page@@homeWelcome">Welcome to the shop</h1>
    <img src="logo.png" i18n-alt alt="Shop logo" width="40" height="40" />
    <p i18n>You have {count(), plural, =0 {no items} =1 {one item} other {{{count()}} items}} in your basket.</p>
    <p>{{ title }}</p>
    <p>{{ 1234567.891 | number }} | {{ 1299.5 | currency: 'EUR' }} | {{ day | date: 'fullDate' }}</p>
    <small>LOCALE_ID = {{ locale }}</small>
  \`,
})
export class App {
  protected readonly count = signal(3);
  protected readonly title = $localize\`:@@pageTitle:Products on sale\`;
  protected readonly day = new Date(Date.UTC(2026, 9, 16, 12));
  protected readonly locale = inject(LOCALE_ID);
}`,
      },
    ],
  },
];

export default augments;
