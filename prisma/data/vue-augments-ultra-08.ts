/**
 * Vue ULTRA — batch 08: routing, state and app plumbing (Vue Router setup,
 * dynamic routes and params, navigation guards, Pinia, storeToRefs, store
 * colocation, large-app state architecture, data fetching, forms and
 * validation, component testing, error handling).
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, Verified sections quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Every "Verified" block was produced on Vue 3.5.44 with vue-router 5.4.0,
 * pinia 4.1.0, @pinia/testing 2.0.2, @vue/test-utils 2.5.1, vitest 5.0.5 and
 * vite 8.3.4. Runnable examples (one self-contained App.vue importing only
 * "vue") passed scripts/verify-vue-example.mjs (compiled with
 * @vue/compiler-sfc, mounted in jsdom, driven by a click/typing script).
 * Router and Pinia examples need app.use(...), so they are runnable: false;
 * they were still executed: as Node scripts on createMemoryHistory and
 * createPinia, as Vitest + Vue Test Utils tests in jsdom, and as vite builds.
 * No real network was used: data fetching runs against a fake API in the
 * component, or a local HTTP server on localhost.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside SVG blocks,
 * no leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you set up Vue Router (routes, RouterLink, RouterView, history modes)?",
    seoDescription:
      "Set up Vue Router 5: define routes, render them with RouterView, link with RouterLink, and pick web, hash or memory history with the right server fallback.",
    description: `**Question presented to candidate:**
"We are adding pages to a Vue 3 single-page app. Walk me through setting up Vue Router from scratch: where routes are defined, how links and the page outlet work, and which history mode you would pick for production."

**What a strong answer should cover:**
- \`createRouter({ history, routes })\` plus \`app.use(router)\`; each route record maps a \`path\` (and ideally a \`name\`) to a component.
- \`<RouterView />\` is the outlet that renders the matched component; \`<RouterLink>\` renders a real \`<a>\` that navigates without a page reload and gets \`router-link-active\` / \`router-link-exact-active\` classes.
- The three histories: \`createWebHistory\` (clean URLs, needs a server fallback to \`index.html\`), \`createWebHashHistory\` (\`#/about\`, no server config, worse for SEO), \`createMemoryHistory\` (SSR and tests).
- Lazy-loaded route components with \`() => import(...)\` so each page is its own chunk, and a catch-all \`/:pathMatch(.*)*\` route for 404s.
- Current versions: Vue Router 5 is a drop-in upgrade from 4 for code-based routes; file-based routing moved into the core package.

**Clarifying questions expected:**
- "Where is this deployed, and can we configure the server to fall back to \`index.html\`?"
- "Do we need SSR or SEO for these pages?"

**Code / implementation expected:** Yes — a router module with a few routes (one lazy, one catch-all), \`app.use(router)\`, and an \`App.vue\` with \`RouterLink\` and \`RouterView\`.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview — assumes basic Vue components, no routing experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output block in this doc was produced by running the code on Vue 3.5.44 and vue-router 5.4.0: a real Vite 8 production build loaded into jsdom, Node scripts on the router API, and a check of two local web servers. Nothing was run in the site playground.

## 1. Why This Even Matters — A Story First

Picture a hotel with one front door. Guests never walk into a different building; instead the receptionist reads the room number on their key card and sends them down the right corridor. If a guest writes the room number on a sticky note and comes back tomorrow, the receptionist reads it and sends them to the same room.

A single-page app is that hotel. There is only one HTML page (the front door), yet users expect separate "rooms": a home page, an about page, a settings page, each with its own address they can bookmark, share and reach with the back button. **Vue Router** is the receptionist. It reads the URL, decides which component is the room, and keeps the address bar in sync when the user moves around, all without reloading the page.

Interviewers ask about setup because it touches four separate ideas at once: route definitions, the outlet that renders a page, links that navigate without a reload, and the history mode, which quietly decides whether your production deploy shows a 404 on refresh.

## 2. The Core Idea

📌 **Interview term: Client-side routing** — the browser loads one HTML page once; after that, JavaScript changes the URL with the History API and swaps components, so "page changes" are just re-renders. See [how the History API powers client-side routing](/interview-question/how-would-you-use-the-history-api-s-pushstate-and-the-popstate-event-to-build-cl).

📌 **Interview term: Route record** — one entry in the <code>routes</code> array: at minimum a <code>path</code> and a <code>component</code>, usually also a <code>name</code> so links do not hard-code URLs. Records can also hold <code>children</code>, <code>redirect</code>, <code>props</code>, <code>meta</code> and guards.

📌 **Interview term: RouterView** — the outlet. Wherever you put <code>&lt;RouterView /&gt;</code>, the router renders the component of the matched route. Nested routes use a nested <code>RouterView</code> inside the parent page.

📌 **Interview term: RouterLink** — renders a real <code>&lt;a href&gt;</code> (so middle-click, "open in new tab" and screen readers work) but intercepts a normal click and calls <code>router.push()</code> instead of reloading. It adds <code>router-link-active</code> and <code>router-link-exact-active</code> classes, plus <code>aria-current="page"</code> on the exact match.

📌 **Interview term: History mode** — how the router stores the location: in the real path (<code>createWebHistory</code>), after a <code>#</code> (<code>createWebHashHistory</code>), or only in memory (<code>createMemoryHistory</code>).

Setting it up is three steps: create the router, install it with <code>app.use(router)</code>, and place <code>RouterLink</code> and <code>RouterView</code> in a component. The router module and <code>main.js</code> are in the examples tab; the root component is just:

\`\`\`vue
<!-- src/App.vue -->
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink :to="{ name: 'about' }">About</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
</template>
\`\`\`

<code>RouterLink</code> and <code>RouterView</code> need no import: <code>app.use(router)</code> registers them globally.

## 3. What Happens on a Click

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A RouterLink click calls router.push, which matches a route record, updates the URL through the history object and makes RouterView render the new component">
  <defs>
    <marker id="q01-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="125" y="66" text-anchor="middle">RouterLink click</text>
  <text class="d-sub" x="125" y="86" text-anchor="middle">default reload prevented</text>
  <path class="d-edge-accent" d="M 224 70 L 276 70" marker-end="url(#q01-arrow)"/>
  <rect class="d-box" x="282" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="367" y="66" text-anchor="middle">router.push()</text>
  <text class="d-sub" x="367" y="86" text-anchor="middle">runs guards</text>
  <path class="d-edge" d="M 456 70 L 508 70" marker-end="url(#q01-arrow)"/>
  <rect class="d-box" x="514" y="40" width="180" height="60" rx="10"/>
  <text class="d-text" x="604" y="66" text-anchor="middle">matcher</text>
  <text class="d-sub" x="604" y="86" text-anchor="middle">path to route record</text>
  <path class="d-edge" d="M 604 104 L 604 176" marker-end="url(#q01-arrow)"/>
  <rect class="d-box" x="514" y="182" width="180" height="60" rx="10"/>
  <text class="d-text" x="604" y="208" text-anchor="middle">history object</text>
  <text class="d-sub" x="604" y="228" text-anchor="middle">web, hash or memory</text>
  <path class="d-edge" d="M 510 212 L 458 212" marker-end="url(#q01-arrow)"/>
  <rect class="d-box" x="282" y="182" width="170" height="60" rx="10"/>
  <text class="d-text" x="367" y="208" text-anchor="middle">currentRoute</text>
  <text class="d-sub" x="367" y="228" text-anchor="middle">reactive, updated</text>
  <path class="d-edge-accent" d="M 278 212 L 226 212" marker-end="url(#q01-arrow)"/>
  <rect class="d-box-accent" x="30" y="182" width="190" height="60" rx="10"/>
  <text class="d-text d-accent" x="125" y="208" text-anchor="middle">RouterView</text>
  <text class="d-sub" x="125" y="228" text-anchor="middle">renders new component</text>
</svg>

The history object is the only part that differs between modes. Everything else (matching, guards, the reactive <code>currentRoute</code>, re-rendering <code>RouterView</code>) is identical, which is why switching modes is a one-line change in code but not always in deployment.

## 4. Verified: the real setup, built and clicked

The router module, <code>main.js</code> and <code>App.vue</code> above were built with <code>vite build</code> (Vite 8.3.4). The two lazy routes became their own chunks:

\`\`\`
dist/assets/AboutView-4VFBP4xq.js   0.15 kB │ gzip:  0.15 kB
dist/assets/NotFound-DavJi_Jh.js    0.22 kB │ gzip:  0.19 kB
dist/assets/index-BZ4Vw9n8.js      88.58 kB │ gzip: 34.41 kB
\`\`\`

Then the production bundle was loaded into jsdom at a given URL, the About link was clicked, and <code>history.back()</code> was called. The printed HTML is the app root:

\`\`\`
open /:                <nav><a href="/" class="router-link-active router-link-exact-active" aria-current="page">Home</a><a href="/about" class="">About</a></nav><main><h1>Home</h1></main>
click About:           <nav><a href="/" class="">Home</a><a href="/about" class="router-link-active router-link-exact-active" aria-current="page">About</a></nav><main><h1>About</h1></main> | URL /about
history.back():        <h1>Home</h1> | URL /
open /reports/2026/q3: <nav><a href="/" class="">Home</a><a href="/about" class="">About</a></nav><main><h1>404: /reports/2026/q3 not found</h1></main>
\`\`\`

Three things to notice. The links are real <code>href</code>s. The Home link is **not** active on <code>/about</code>: activeness follows the matched route records, not a string prefix, so <code>/</code> is not a parent of <code>/about</code>. And the catch-all route received the unmatched segments as an array in <code>route.params.pathMatch</code>.

## 5. History Modes

The same named route, resolved with each history (from <code>router.resolve({ name: "about" }).href</code>):

\`\`\`
createWebHistory       /about
createWebHashHistory   #/about
createMemoryHistory    /about
createWebHistory('/app/') /app/about
\`\`\`

| | <code>createWebHistory()</code> | <code>createWebHashHistory()</code> | <code>createMemoryHistory()</code> |
| :--- | :--- | :--- | :--- |
| URL looks like | <code>/about</code> | <code>/#/about</code> | URL bar never changes |
| Server config | Must serve <code>index.html</code> for unknown paths | None: the server only ever sees <code>/</code> | None |
| SEO and sharing | Best; works with [SSR](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration) | The hash part is never sent to the server | Not for browsers |
| Typical use | Production SPAs and SSR apps | Static hosting you cannot configure, file:// apps, quick demos | SSR on the server, unit tests |
| Base path | <code>createWebHistory("/app/")</code> | Same argument | Same argument |

📌 **Interview term: SPA fallback** — a server rule that answers any unknown path with <code>index.html</code>, so the router can take over. Without it, refreshing <code>/about</code> asks the server for a file that does not exist.

Verified with the same build served two ways on localhost. Vite's preview server has a fallback built in; a plain static file server (Python's <code>http.server</code>) does not:

\`\`\`
vite preview      : /reports/2026/q3 -> 200   /about -> 200   / -> 200
python http.server: /reports/2026/q3 -> 404   /about -> 404   / -> 200
\`\`\`

That second line is the classic "works in dev, 404 on refresh in production" bug. Hash mode avoids it because every hash URL is a request for <code>/</code>. How you add the fallback depends on the host (an nginx <code>try_files</code> rule, a rewrite in your platform config); those host configs were not tested here.

## 6. A Router From Scratch (the runnable example)

The runnable example in the examples tab builds the core idea with no library: a <code>routes</code> object mapping paths to components, a <code>ref</code> holding the current hash, a <code>hashchange</code> listener, and a [dynamic component](/interview-question/how-do-dynamic-components-work) as the outlet. Verified in jsdom by changing <code>location.hash</code>:

\`\`\`
[app] RENDERED: Home | About | Broken linkHome pagecurrent path: /
#/about   : Home | About | Broken linkAbout pagecurrent path: /about | active link: About
#/missing : Home | About | Broken link404: no route matchescurrent path: /missing
#/        : Home | About | Broken linkHome pagecurrent path: /
\`\`\`

It is a good thing to sketch in an interview, because it shows you know what Vue Router adds on top: [dynamic params](/interview-question/how-do-dynamic-routes-and-route-params-work-in-vue-router), nested routes, [navigation guards](/interview-question/what-are-vue-router-navigation-guards), named routes, scroll handling, [lazy loading](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue) and three interchangeable history implementations.

## 7. What Changed in Vue Router 5

📌 **Interview term: Vue Router 5** — released on npm on 29 January 2026. Its official migration guide calls it a transition release: it merges the former <code>unplugin-vue-router</code> package (file-based routing) into <code>vue-router</code> itself, and for apps that define routes in code, as in this doc, there are no breaking changes; the one exception is that the IIFE build no longer bundles <code>@vue/devtools-api</code> (source: <a href="https://router.vuejs.org/guide/migration/v4-to-v5" target="_blank" rel="noopener noreferrer">router.vuejs.org migration guide, v4 to v5</a>). The same guide says Vue Router 6 will be ESM-only and remove deprecated APIs.

What that means for setup in practice:

- **Code-based routes are unchanged.** <code>createRouter</code>, <code>createWebHistory</code>, <code>RouterLink</code> and <code>RouterView</code> work exactly as in v4; the example in this doc runs on 5.4.0 unmodified.
- **File-based routing is now first-party.** The Vite plugin moved to <code>vue-router/vite</code> and generated routes come from <code>vue-router/auto-routes</code>. This is the same idea as [Nuxt pages](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue) and [Next.js file-based routing](/interview-question/how-does-file-based-routing-work-in-the-next-js-app-router).
- **Warnings are now coded diagnostics.** Pushing an unknown path with no catch-all printed this on 5.4.0, while 4.6.4 printed a one-liner, <code>[Vue Router warn]: No match found for location with path "/nope"</code>:

\`\`\`
[VUE_ROUTER_R0004] No match found for location with path "/nope"
├▶ fix: Add a route matching this path or check for typos in the location.
╰▶ see: https://router.vuejs.org/guide/essentials/dynamic-matching.html#Catch-all-404-Not-found-Route
\`\`\`

- **Deprecations to know.** In the 5.4.0 typings, the third <code>next</code> argument of guards is marked <code>@deprecated</code> (return a value instead), and <code>scrollBehavior</code> is marked deprecated in favour of an experimental <code>useScrollRestoration()</code>. Neither carried that tag in 4.6.4 or 5.0.0, and both still work.

## 8. Common Pitfalls

- **No server fallback with <code>createWebHistory</code>.** Deep links and refreshes 404 in production. Add the fallback, or use hash mode if you truly cannot configure the host.
- **Using a plain <code>&lt;a href&gt;</code> for internal links.** It reloads the whole app and throws away in-memory state. Use <code>RouterLink</code>, or <code>router.push()</code> in code.
- **Forgetting <code>app.use(router)</code>.** <code>RouterLink</code> then fails: verified, it logs <code>injection "Symbol(router)" not found</code> and throws <code>Cannot read properties of undefined (reading 'resolve')</code>.
- **Missing or misplaced catch-all.** Routes are ranked by specificity, not by array order (verified: with the catch-all listed first, <code>/about</code> still resolved to the <code>about</code> route), but keep <code>/:pathMatch(.*)*</code> last for readability and always have one, or unknown URLs render an empty <code>RouterView</code> and log <code>VUE_ROUTER_R0004</code>.
- **Hard-coding paths everywhere.** Give routes a <code>name</code> and link with <code>{ name: 'about' }</code>, so changing a URL is a one-line edit.
- **Importing every page eagerly.** Each eager import lands in the entry chunk; use <code>() =&gt; import()</code> for anything that is not the landing page.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Setup:</strong> <span style="color:#f0e2c8;">"I create the router with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createRouter({ history, routes })</code>, install it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use(router)</code>, and each route record maps a path and a name to a component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two components:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouterView</code> is the outlet that renders the matched component, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouterLink</code> renders a real anchor that navigates without a reload and gets active classes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. History mode:</strong> <span style="color:#f0e2c8;">"For production I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createWebHistory</code>, which gives clean URLs but needs the server to fall back to index.html; hash mode needs no server config, and memory history is for SSR and tests."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Structure:</strong> <span style="color:#f0e2c8;">"I give routes names, lazy-load pages with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; import()</code> so each is its own chunk, and end with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/:pathMatch(.*)*</code> catch-all for 404s."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Current version:</strong> <span style="color:#f0e2c8;">"Vue Router 5 kept this API; it mainly merged file-based routing into the core package, and guards should return a value instead of calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does refreshing /about give a 404 in production but not in dev?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The dev server and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vite preview</code> answer unknown paths with index.html. A plain static server looks for a file called about, finds none and returns 404. I verified exactly that on localhost. The fix is a fallback rule on the host, or hash mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between router-link-active and router-link-exact-active?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Active means the link target is the current route or one of its parent records, so a parent nav item stays highlighted on child pages. Exact-active means it is precisely the current route. It is based on matched records, not on URL prefixes, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> link is not active on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/about</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use RouterLink versus router.push?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">RouterLink for anything the user clicks to go somewhere, because it is a real anchor: middle-click, copy link and screen readers all work. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.push()</code> for navigation that follows logic, such as after a successful save or login.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a base path like /app/?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass it to the history: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createWebHistory("/app/")</code>. With Vite, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import.meta.env.BASE_URL</code> so the router and the build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">base</code> option agree. Verified: the about route then resolves to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/app/about</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does memory history do on the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps the location in a plain array instead of the browser URL, which does not exist on the server. In SSR you create a router per request, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> the request URL, await <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.isReady()</code> and then render. Verified: rendering <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/about</code> that way returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;h1&gt;About&lt;/h1&gt;</code>, lazy route included.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Client-side routing** | Changing pages by swapping components and the URL, without a reload |
| **Route record** | One <code>{ path, name, component }</code> entry in the routes array |
| **RouterView** | The outlet that renders the matched component |
| **RouterLink** | A real link that navigates without reloading and gets active classes |
| **History mode** | Where the location lives: path, hash or memory |
| **SPA fallback** | Server rule that serves <code>index.html</code> for unknown paths |
| **Catch-all route** | <code>/:pathMatch(.*)*</code>, the 404 page |
| **Vue Router 5** | The 2026 release that folded file-based routing into the core package |

---
**Conclusion:** Setting up Vue Router is three moves: <code>createRouter({ history, routes })</code>, <code>app.use(router)</code>, and a component with <code>RouterLink</code> for navigation and <code>RouterView</code> as the outlet. The decision that actually needs thought is the history mode. As verified above, <code>createWebHistory</code> gives clean URLs but returns 404 on refresh from a server with no fallback, hash mode needs no server help but puts <code>#</code> in every URL, and memory history is for SSR and tests. Vue Router 5 kept this API intact and moved file-based routing into the core package, so a strong answer describes the setup, names the deployment trade-off, and mentions lazy-loaded routes and a catch-all 404.`,
    examples: [
      {
        label: "What a router does, with no library: a hash router in one SFC",
        tech: "vue",
        runnable: true,
        code: `<script setup>
// What a router does, in 20 lines and with no library: map a URL to a
// component and re-render when the URL changes. Vue Router adds nested
// routes, params, guards, history modes and lazy loading on top of this idea.
import { ref, computed, defineComponent, h, onMounted, onUnmounted } from "vue";

const Home = defineComponent({ render: () => h("h2", "Home page") });
const About = defineComponent({ render: () => h("h2", "About page") });
const NotFound = defineComponent({ render: () => h("h2", "404: no route matches") });

const routes = { "/": Home, "/about": About };

const currentPath = ref(window.location.hash.slice(1) || "/");
const onHashChange = () => (currentPath.value = window.location.hash.slice(1) || "/");
onMounted(() => window.addEventListener("hashchange", onHashChange));
onUnmounted(() => window.removeEventListener("hashchange", onHashChange));

// The "RouterView": whichever component matches the current path
const currentView = computed(() => routes[currentPath.value] ?? NotFound);
</script>

<template>
  <nav>
    <a href="#/" :class="{ active: currentPath === '/' }">Home</a> |
    <a href="#/about" :class="{ active: currentPath === '/about' }">About</a> |
    <a href="#/missing">Broken link</a>
  </nav>
  <component :is="currentView" />
  <p>current path: {{ currentPath }}</p>
</template>`,
      },
      {
        label: "A real Vue Router 5 setup: router module and main.js",
        tech: "js",
        runnable: false,
        code: `// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

export const router = createRouter({
  // HTML5 history: clean URLs like /about (needs a server fallback to index.html)
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    // Lazy-loaded: this view becomes its own chunk, fetched on first visit
    { path: "/about", name: "about", component: () => import("../views/AboutView.vue") },
    // Catch-all 404: must match anything the routes above did not
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("../views/NotFound.vue") },
  ],
});

// src/main.js
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";

createApp(App).use(router).mount("#app");`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do dynamic routes and route params work in Vue Router?",
    seoDescription:
      "Vue Router dynamic routes: :id params, props: true, custom regex, optional and repeatable params, and why a param change reuses the component.",
    description: `**Question presented to candidate:**
"We have a user profile page at \`/users/:id\`. Explain how dynamic segments and params work in Vue Router, how the page gets the id, and what goes wrong when the user clicks from one profile straight to another."

**What a strong answer should cover:**
- A \`:name\` segment in a route \`path\` matches one URL segment and exposes it as \`route.params.name\`, always a **string** (or an array for repeatable params).
- Reading params: \`useRoute().params\`, or better, \`props: true\` on the route so the component takes the param as a prop and stays router-agnostic.
- Advanced patterns: custom regex (\`:id(\\d+)\`), optional (\`?\`), repeatable (\`+\` / \`*\`), and the catch-all \`/:pathMatch(.*)*\`.
- **Component reuse**: going from \`/users/1\` to \`/users/2\` keeps the same instance, so \`onMounted\` does not run again; react with \`watch\` on the param or \`onBeforeRouteUpdate\`, or force a remount with \`:key\`.
- Building links with named routes and \`params\` (encoded for you) instead of string concatenation; a missing required param throws.

**Clarifying questions expected:**
- "Should a profile-to-profile switch keep scroll position and local state, or start fresh?"
- "Are ids numeric only, so we could reject \`/users/abc\` at the router level?"

**Code / implementation expected:** Yes — a route with \`:id\` and \`props: true\`, and a component that reloads data when the param changes.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who has a basic router set up — see [how to set up Vue Router](/interview-question/how-do-you-set-up-vue-router-routes-routerlink-routerview-history-modes) if not.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output block was produced by running the code on Vue 3.5.44 and vue-router 5.4.0: Node scripts on <code>createMemoryHistory</code>, a Vitest + Vue Test Utils run of the example components, and the runnable example through the repo verifier in jsdom.

## 1. Why This Even Matters — A Story First

A library does not print a separate sign for every book. It has one sign that says "Shelf ___" and a slot where the number goes. Whatever number you slide in, the same sign, the same frame and the same light are reused; only the number changes.

A dynamic route is that sign. Instead of writing <code>/users/1</code>, <code>/users/2</code> and a million more routes, you write one pattern, <code>/users/:id</code>, and the router slides the real value into the slot.

The interesting part, and the reason interviewers ask, is the reuse. When a user goes from shelf 1 to shelf 2, the library does not build a new sign; it swaps the number. Vue Router does the same with your page component. If your component only loaded its data "when it was built", it now shows user 2 in the heading and user 1 in the content.

## 2. The Core Idea

📌 **Interview term: Dynamic segment** — a part of a route path that starts with a colon, like <code>:id</code> in <code>/users/:id</code>. It matches exactly one URL segment (anything up to the next <code>/</code>).

📌 **Interview term: Route params** — the values captured by dynamic segments, available as <code>route.params</code> (from <code>useRoute()</code> in <code>&lt;script setup&gt;</code>, or <code>$route.params</code> in templates). Params are always **strings**, or arrays of strings for repeatable params, even when you pass a number in.

📌 **Interview term: Route props** — setting <code>props: true</code> on a route record passes its params to the component as props. The component then declares <code>defineProps&lt;{ id: string }&gt;()</code> like any other component, which makes it reusable and easy to test without a router. See [props and validation](/interview-question/what-are-props-in-vue-and-how-do-you-validate-them).

A URL has more parts than params. Resolving <code>/users/42?tab=posts&amp;sort=new#bio</code> against <code>/users/:id</code> printed:

\`\`\`
{"path":"/users/42","params":{"id":"42"},"query":{"tab":"posts","sort":"new"},"hash":"#bio","name":"user"}
repeated query key: {"tag":["a","b"]}
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="The URL users 42 with a tab query and a bio hash splits into params, query and hash on the route object">
  <defs>
    <marker id="q02-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="120" y="30" width="460" height="56" rx="10"/>
  <text class="d-text" x="350" y="54" text-anchor="middle">/users/42?tab=posts#bio</text>
  <text class="d-sub" x="350" y="74" text-anchor="middle">matched against the pattern /users/:id</text>
  <path class="d-edge-accent" d="M 230 90 L 130 160" marker-end="url(#q02-arrow)"/>
  <path class="d-edge" d="M 350 90 L 350 160" marker-end="url(#q02-arrow)"/>
  <path class="d-edge" d="M 470 90 L 570 160" marker-end="url(#q02-arrow)"/>
  <rect class="d-box-accent" x="30" y="166" width="200" height="66" rx="10"/>
  <text class="d-text d-accent" x="130" y="194" text-anchor="middle">route.params</text>
  <text class="d-sub" x="130" y="216" text-anchor="middle">id is the string 42</text>
  <rect class="d-box" x="250" y="166" width="200" height="66" rx="10"/>
  <text class="d-text" x="350" y="194" text-anchor="middle">route.query</text>
  <text class="d-sub" x="350" y="216" text-anchor="middle">tab is posts</text>
  <rect class="d-box" x="470" y="166" width="200" height="66" rx="10"/>
  <text class="d-text" x="570" y="194" text-anchor="middle">route.hash</text>
  <text class="d-sub" x="570" y="216" text-anchor="middle">the string #bio</text>
</svg>

Only the path part decides which route matches. The query and hash never affect matching, which is why they are the right place for optional view state such as a selected tab, a sort order or a page number.

## 3. Matching Patterns Beyond <code>:id</code>

The route records used for this doc:

\`\`\`ts
import type { RouteRecordRaw } from "vue-router";
import UserPage from "./UserPage.vue";

export const routes: RouteRecordRaw[] = [
  // :id is a dynamic segment; props: true passes it to the component as a prop
  { path: "/users/:id", name: "user", component: UserPage, props: true },
  // custom regex: only digits match, so /orders/abc falls through to the 404
  { path: "/orders/:orderId(\\\\d+)", name: "order", component: () => import("./OrderPage.vue") },
  // optional (?) and repeatable (+) params
  { path: "/docs/:lang?/:page", name: "docs", component: () => import("./DocsPage.vue") },
  { path: "/files/:segments+", name: "files", component: () => import("./FilesPage.vue") },
  // catch-all 404 goes last
  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("./NotFound.vue") },
];
\`\`\`

Each row below was resolved with <code>router.resolve()</code> against those records:

\`\`\`
/orders/42             -> order  {"orderId":"42"}
/orders/abc            -> nf     {"pathMatch":["orders","abc"]}
/docs/intro            -> docs   {"page":"intro"}
/docs/fr/intro         -> docs   {"lang":"fr","page":"intro"}
/files/a/b/c.txt       -> files  {"segments":["a","b","c.txt"]}
/files                 -> nf     {"pathMatch":["files"]}
\`\`\`

| Syntax | Example path | Meaning |
| :--- | :--- | :--- |
| <code>:id</code> | <code>/users/:id</code> | Exactly one segment, required |
| <code>:id(\\d+)</code> | <code>/orders/:orderId(\\d+)</code> | Custom regex: only digits, so <code>/orders/abc</code> falls through to the 404 |
| <code>:lang?</code> | <code>/docs/:lang?/:page</code> | Optional: absent from <code>params</code> when missing |
| <code>:segments+</code> | <code>/files/:segments+</code> | One or more segments, as an array |
| <code>:segments*</code> | <code>/files/:segments*</code> | Zero or more segments, as an array |
| <code>:pathMatch(.*)*</code> | <code>/:pathMatch(.*)*</code> | Catch-all for a 404 page |

📌 **Interview term: Repeatable param** — a param with <code>+</code> or <code>*</code> that can span several segments. Its value is an array, not a string with slashes in it.

Two more details from the same run. Writing a regex inside a JavaScript string needs a doubled backslash (<code>"/orders/:orderId(\\\\d+)"</code>), a classic copy-paste bug. And the router encodes param values for you: <code>router.resolve({ name: "user", params: { id: "ada lovelace" } }).href</code> gave <code>/users/ada%20lovelace</code>, and <code>{ id: "a/b" }</code> gave <code>/users/a%2Fb</code>, which decoded back to <code>{"id":"a/b"}</code>. Concatenating strings by hand gets both of those wrong.

## 4. The Reuse Trap

📌 **Interview term: Component reuse** — when the new location renders the same component in the same <code>RouterView</code>, Vue Router keeps the existing instance and only updates its params (or props). Mounting hooks do not run again.

Verified with the router (a Node script on memory history, logging from the component):

\`\`\`
  mounted   id = 1
render: <p>User 1</p>
push /users/2
  beforeRouteUpdate 1 -> 2
  watch     1 -> 2
render: <p>User 2</p>
push /users/2?tab=posts
  beforeRouteUpdate 2 -> 2
push /orders/42
  unmounted
\`\`\`

<code>mounted</code> ran once. Going to <code>/users/2</code> fired the in-component guard and the watcher, not a new mount. Notice the third push: only the query changed, so <code>onBeforeRouteUpdate</code> fired again while a watcher on <code>route.params.id</code> correctly stayed quiet. The component unmounted only when a different route took over.

There are three fixes, and the runnable example shows all three side by side with a plain prop standing in for the param. After one click, only the panel that relied on <code>onMounted</code> is wrong:

\`\`\`
after one click:
  A (onMounted only) shows id 2, data loaded for 1
  B (watch the param) shows id 2, data loaded for 2
  C (:key forces remount) shows id 2, data loaded for 2
\`\`\`

| Fix | How | When to use it |
| :--- | :--- | :--- |
| Watch the param | <code>watch(() =&gt; props.id, load, { immediate: true })</code> | The default: keeps the instance, its state and scroll position |
| <code>onBeforeRouteUpdate</code> | Load in the guard, optionally <code>await</code> it before the URL changes | When you want to cancel or delay the navigation until data is ready |
| <code>:key</code> | <code>&lt;RouterView :key="$route.fullPath" /&gt;</code> or a key on the component | When a fresh instance is genuinely simpler; costs a full unmount and mount every time |

📌 **Interview term: onBeforeRouteUpdate** — the Composition API form of the <code>beforeRouteUpdate</code> [navigation guard](/interview-question/what-are-vue-router-navigation-guards). It runs when the route changes but this component is reused. It fires on any change to the location (path params, query or hash), so check which part changed if the work is expensive.

## 5. Verified: the example components under Vitest

The <code>UserPage.vue</code> in the examples tab takes the param as a prop (<code>props: true</code>), watches it, and loads from a fake API (a local promise, no network). Mounted under a real router in Vitest with Vue Test Utils:

\`\`\`
mounted with id 1
loaded user 1: Ada Lovelace
HTML: <h1>Ada Lovelace</h1>
beforeRouteUpdate /users/1 -> /users/2
HTML right after push: <p>Loading user 2...</p>
loaded user 2: Linus Torvalds
HTML: <h1>Linus Torvalds</h1>
\`\`\`

The watcher resets <code>user</code> to <code>null</code> first, so the page shows a loading state instead of the previous person for a moment. That is a deliberate choice; for stale responses arriving out of order you also need cancellation, covered in [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation).

## 6. Typing and Validating Params

- **Params are strings.** <code>router.resolve({ name: "user", params: { id: 7 } }).params</code> printed <code>{"id":"7"}</code>. Convert with <code>Number(props.id)</code>, or use <code>props: (route) =&gt; ({ id: Number(route.params.id) })</code> in the route record so the component receives a number (verified: the prop arrived as <code>number 1</code>, then <code>number 2</code>).
- **Required params are enforced.** <code>router.resolve({ name: "user" })</code> threw <code>Missing required param "id"</code>.
- **Validate at the router edge.** A regex like <code>(\\d+)</code> keeps junk out of the component; a [beforeEnter guard](/interview-question/what-are-vue-router-navigation-guards) can redirect if the id does not exist.
- **Typed routes.** With file-based routing (now built into Vue Router 5 through <code>vue-router/vite</code>) a generated <code>RouteNamedMap</code> type makes <code>useRoute(name)</code> return params typed for that route (the 5.4.0 typings declare <code>useRoute&lt;Name extends keyof RouteMap&gt;(_name?: Name)</code>); with hand-written routes, <code>props</code> plus <code>defineProps</code> is the simplest way to get types.

## 7. Common Pitfalls

- **Loading data only in <code>onMounted</code>.** The page shows the new id with old data after a param change. Watch the param or use <code>onBeforeRouteUpdate</code>.
- **Destructuring params once.** <code>const { id } = useRoute().params</code> copies the value at setup time and never updates (verified: after <code>/users/1</code> to <code>/users/2</code> the destructured copy still said <code>1</code>); read <code>route.params.id</code> inside a <code>computed</code> or <code>watch</code>, or use <code>props: true</code>. The same trap exists for stores, see [storeToRefs](/interview-question/why-use-storetorefs-with-pinia).
- **Treating params as numbers.** <code>"10" &gt; "9"</code> is false. Convert once at the edge.
- **Using params for optional state.** Filters, tabs and pagination belong in <code>query</code>, which does not affect matching and survives reloads.
- **Reaching for <code>:key="$route.fullPath"</code> everywhere.** It remounts on every query change too, discarding state and re-running every request.
- **Building URLs by concatenation.** Named routes with <code>params</code> encode spaces and slashes correctly.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The pattern:</strong> <span style="color:#f0e2c8;">"A colon segment like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/users/:id</code> matches one URL segment and exposes it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.params.id</code>, always as a string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the page reads it:</strong> <span style="color:#f0e2c8;">"I prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props: true</code> on the route, so the component just declares an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> prop and does not depend on the router, which also makes it easy to test."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trap:</strong> <span style="color:#f0e2c8;">"Going from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/users/1</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/users/2</code> reuses the same component instance, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> does not run again; I watch the param, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeRouteUpdate</code>, or add a key if I really want a remount."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Richer patterns:</strong> <span style="color:#f0e2c8;">"Custom regex like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:id(\\d+)</code>, optional <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code>, repeatable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code>, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/:pathMatch(.*)*</code> catch-all for 404s."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Good habits:</strong> <span style="color:#f0e2c8;">"Optional view state such as tabs and filters goes in the query, and links use named routes with params so encoding is done for me."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a param change not remount the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The new location matches the same route record, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RouterView</code> renders the same component type in the same place and Vue patches it instead of replacing it. That keeps state and is cheaper, but anything done only at mount time goes stale.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between params and query?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Params are part of the path and decide which route matches; they are required unless marked optional. Query values never affect matching, can repeat (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?tag=a&amp;tag=b</code> gives an array) and suit filters, sorting and pagination.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use onBeforeRouteUpdate instead of a watch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I want to load before the navigation completes, or cancel it: the guard can be async and can return false or a redirect. A watcher runs after the route already changed. Note the guard also fires for query-only changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make an id param numeric?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Restrict the URL with a regex such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(\\d+)</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/users/abc</code> falls through to the 404, and convert in a props function: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">props: route =&gt; ({ id: Number(route.params.id) })</code>. The router itself always stores strings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is :key on RouterView a good default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Keying on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$route.fullPath</code> remounts on every query or hash change, throwing away local state and re-running all setup work. It is a fine tool for a page that is genuinely simpler as a fresh instance, but watching the param is the normal answer.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic segment** | A <code>:name</code> part of a route path that matches one URL segment |
| **Route params** | The captured values, always strings (arrays for repeatable params) |
| **Route props** | <code>props: true</code>: params passed to the component as props |
| **Repeatable param** | <code>+</code> or <code>*</code>: matches several segments, value is an array |
| **Custom regex param** | <code>:id(\\d+)</code>: restricts what a segment may match |
| **Catch-all** | <code>/:pathMatch(.*)*</code>: matches anything, used for 404 pages |
| **Component reuse** | Same component on the new route keeps its instance; mount hooks do not rerun |
| **onBeforeRouteUpdate** | Guard that runs when the route changes but the component is reused |

---
**Conclusion:** A dynamic route is one pattern such as <code>/users/:id</code> that matches many URLs and hands the captured values to the page, always as strings, ideally as props via <code>props: true</code>. Patterns go further with regex, optional and repeatable params and a catch-all. The behaviour that trips people up is reuse: as the verified logs show, moving from <code>/users/1</code> to <code>/users/2</code> keeps the same component instance, so <code>onMounted</code> does not run again. Watch the param (or use <code>onBeforeRouteUpdate</code>, or a <code>:key</code> when a fresh instance is really what you want), keep optional view state in the query, and build links from named routes so encoding is handled for you.`,
    examples: [
      {
        label: "Why a param change does not re-run onMounted (no router needed)",
        tech: "vue",
        runnable: true,
        code: `<script setup>
// Why /users/1 -> /users/2 does not re-run onMounted: Vue reuses a component
// when only its props change. RouterView does the same when only a param
// changes. Here the "param" is a plain ref so the demo needs no router.
import { ref, watch, onMounted, defineComponent, h } from "vue";

const log = ref([]);

const UserPage = defineComponent({
  props: { id: Number, label: String },
  setup(props) {
    const loadedFor = ref(null);
    onMounted(() => {
      log.value.push(\`\${props.label}: mounted, load user \${props.id}\`);
      loadedFor.value = props.id;
    });
    return () => h("p", \`\${props.label} shows id \${props.id}, data loaded for \${loadedFor.value}\`);
  },
});

const WatchingUserPage = defineComponent({
  props: { id: Number, label: String },
  setup(props) {
    const loadedFor = ref(null);
    watch(
      () => props.id,
      (id) => {
        log.value.push(\`\${props.label}: watch fired, load user \${id}\`);
        loadedFor.value = id;
      },
      { immediate: true },
    );
    return () => h("p", \`\${props.label} shows id \${props.id}, data loaded for \${loadedFor.value}\`);
  },
});

const userId = ref(1);
</script>

<template>
  <button @click="userId++">Go to /users/{{ userId + 1 }}</button>
  <UserPage :id="userId" label="A (onMounted only)" />
  <WatchingUserPage :id="userId" label="B (watch the param)" />
  <UserPage :key="userId" :id="userId" label="C (:key forces remount)" />
  <ol>
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
  </ol>
</template>`,
      },
      {
        label: "UserPage.vue: param as a prop, watched so /users/1 -> /users/2 reloads",
        tech: "vue",
        runnable: false,
        code: `<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { onBeforeRouteUpdate } from "vue-router";
import { fetchUser, type User } from "./api";

// Arrives as a prop because the route has props: true (always a string)
const props = defineProps<{ id: string }>();
const user = ref<User | null>(null);

onMounted(() => console.log(\`mounted with id \${props.id}\`)); // runs ONCE

// /users/1 -> /users/2 reuses this instance, so react to the param instead
watch(
  () => props.id,
  async (id) => {
    user.value = null;
    user.value = await fetchUser(id);
    console.log(\`loaded user \${id}: \${user.value.name}\`);
  },
  { immediate: true },
);

onBeforeRouteUpdate((to, from) => {
  console.log(\`beforeRouteUpdate \${from.fullPath} -> \${to.fullPath}\`);
});
</script>

<template>
  <p v-if="!user">Loading user {{ id }}...</p>
  <h1 v-else>{{ user.name }}</h1>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Vue Router navigation guards?",
    seoDescription:
      "Vue Router navigation guards: global, per-route and in-component hooks, their verified run order, auth redirects, and why next() is now deprecated.",
    description: `**Question presented to candidate:**
"Our settings pages must only be reachable when signed in, and users keep losing unsaved edits when they click away. Explain Vue Router navigation guards and show how you would solve both problems."

**What a strong answer should cover:**
- The three levels: **global** (\`router.beforeEach\`, \`beforeResolve\`, \`afterEach\`), **per-route** (\`beforeEnter\` in the route record) and **in-component** (\`onBeforeRouteLeave\`, \`onBeforeRouteUpdate\`, and the Options API \`beforeRouteEnter\`).
- What a guard returns: nothing or \`true\` to continue, \`false\` to cancel, a route location to redirect, or a thrown error to fail the navigation; guards can be \`async\`.
- The **resolution order** (leave, global before, update, per-route, enter, resolve, after) and that \`afterEach\` cannot change the navigation.
- Using \`meta\` (for example \`requiresAuth\`) and a global guard for auth with a \`redirect\` query, and \`onBeforeRouteLeave\` for unsaved changes.
- \`next()\` is deprecated in Vue Router 5 (dev warning since 5.0.3); return values instead. Guards are UX, not security: the server must still check.

**Clarifying questions expected:**
- "Is the auth state known synchronously, or do we have to ask the server on the first navigation?"
- "Should the redirect after login return the user to the page they asked for?"

**Code / implementation expected:** Yes — a \`beforeEach\` auth guard using route \`meta\`, and an \`onBeforeRouteLeave\` confirm in a form page.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who knows [basic router setup](/interview-question/how-do-you-set-up-vue-router-routes-routerlink-routerview-history-modes) — no guard experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The guard order in section 4 was printed by a Node script with <code>console.log</code> in every guard, run on vue-router 5.4.0 and again on 4.6.4 for comparison. The auth and unsaved-changes examples were run as a Vitest + Vue Test Utils test in jsdom.

## 1. Why This Even Matters — A Story First

Think of an airport. Before you reach your gate you pass a series of checkpoints, always in the same order: the check-in desk, security, passport control, and finally the agent at the gate who scans your boarding pass. Any one of them can stop you, or send you somewhere else ("you need the other terminal"). Only once everyone has said yes do you board, and after take-off someone updates the departures board.

A navigation in Vue Router is that trip, and **navigation guards** are the checkpoints. When a user clicks a link, the router asks the page they are leaving, then the app as a whole, then the route they are heading to, then the page they are entering. Any of them can let the navigation continue, cancel it, or redirect it. Only when all agree does the URL change and the new page render.

Interviewers like this topic because it is where real product requirements live: "only signed-in users", "warn before losing edits", "set the page title", "track page views".

## 2. The Core Idea

📌 **Interview term: Navigation guard** — a function the router calls during a navigation, with <code>to</code> (where we are going) and <code>from</code> (where we are). Its return value decides what happens next.

| A guard returns | Effect |
| :--- | :--- |
| <code>undefined</code> or <code>true</code> | Continue to the next guard |
| <code>false</code> | Cancel: stay on the current URL; <code>push()</code> resolves with an aborted failure |
| A location (<code>"/login"</code> or <code>{ name: "login", query }</code>) | Redirect: start a new navigation there |
| A thrown error or rejected promise | Fail: <code>push()</code> rejects and <code>router.onError</code> handlers run |

Guards may be <code>async</code>; the router awaits them. Verified: an async guard that waited 30 ms finished before <code>await router.push("/")</code> resolved.

📌 **Interview term: Global guards** — registered on the router and run for every navigation: <code>router.beforeEach</code> (the usual place for auth), <code>router.beforeResolve</code> (runs last, after per-route and in-component enter guards), and <code>router.afterEach</code> (runs after the navigation is confirmed; it receives a <code>failure</code> argument but cannot change anything).

📌 **Interview term: Per-route guard** — <code>beforeEnter</code> on a route record. It runs only when **entering** that route from a different one, not when only its params, query or hash change.

📌 **Interview term: In-component guards** — <code>onBeforeRouteLeave</code> and <code>onBeforeRouteUpdate</code> in <code>&lt;script setup&gt;</code>; the Options API also has <code>beforeRouteEnter</code>, which runs before the component exists and therefore has no <code>this</code>.

📌 **Interview term: Route meta** — arbitrary data attached to a route record, such as <code>meta: { requiresAuth: true }</code>. Guards read <code>to.meta</code>. The meta of parent records is merged into it, so marking a parent protects all of its children (verified: <code>/admin/users</code> resolved with <code>{"requiresAuth":true,"title":"Users"}</code>, the first key coming from the parent).

## 3. The Pipeline

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="The guard order for one navigation: leave guard, global beforeEach, update guard, beforeEnter, enter guard, beforeResolve, then the confirmed navigation, afterEach and the DOM update">
  <defs>
    <marker id="q03-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="66" text-anchor="middle">1 leave</text>
  <text class="d-sub" x="95" y="86" text-anchor="middle">old component</text>
  <path class="d-edge" d="M 174 70 L 206 70" marker-end="url(#q03-arrow)"/>
  <rect class="d-box-accent" x="212" y="40" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="287" y="66" text-anchor="middle">2 beforeEach</text>
  <text class="d-sub" x="287" y="86" text-anchor="middle">global, auth</text>
  <path class="d-edge" d="M 366 70 L 398 70" marker-end="url(#q03-arrow)"/>
  <rect class="d-box" x="404" y="40" width="150" height="60" rx="10"/>
  <text class="d-text" x="479" y="66" text-anchor="middle">3 update</text>
  <text class="d-sub" x="479" y="86" text-anchor="middle">reused component</text>
  <path class="d-edge" d="M 558 70 L 590 70" marker-end="url(#q03-arrow)"/>
  <rect class="d-box" x="596" y="40" width="110" height="60" rx="10"/>
  <text class="d-text" x="651" y="66" text-anchor="middle">4 enter</text>
  <text class="d-sub" x="651" y="86" text-anchor="middle">beforeEnter</text>
  <path class="d-edge" d="M 651 104 L 651 156" marker-end="url(#q03-arrow)"/>
  <rect class="d-box" x="556" y="162" width="150" height="60" rx="10"/>
  <text class="d-text" x="631" y="188" text-anchor="middle">5 enter</text>
  <text class="d-sub" x="631" y="208" text-anchor="middle">new component</text>
  <path class="d-edge" d="M 552 192 L 520 192" marker-end="url(#q03-arrow)"/>
  <rect class="d-box" x="364" y="162" width="150" height="60" rx="10"/>
  <text class="d-text" x="439" y="188" text-anchor="middle">6 beforeResolve</text>
  <text class="d-sub" x="439" y="208" text-anchor="middle">global, last check</text>
  <path class="d-edge-accent" d="M 360 192 L 328 192" marker-end="url(#q03-arrow)"/>
  <rect class="d-box-accent" x="172" y="162" width="150" height="60" rx="10"/>
  <text class="d-text d-accent" x="247" y="188" text-anchor="middle">confirmed</text>
  <text class="d-sub" x="247" y="208" text-anchor="middle">URL changes</text>
  <path class="d-edge" d="M 247 226 L 247 262" marker-end="url(#q03-arrow)"/>
  <rect class="d-box-muted" x="132" y="268" width="230" height="50" rx="10"/>
  <text class="d-text" x="247" y="298" text-anchor="middle">7 afterEach, then render</text>
</svg>

Steps 1 to 6 can cancel or redirect the navigation. Once it is confirmed, <code>afterEach</code> is told what happened but can no longer stop it. Steps 3 and 4 are mutually exclusive in practice: a reused component gets <code>update</code>, a newly entered route gets <code>beforeEnter</code>.

## 4. Verified: the real order

The guard-order script in the examples tab registers every kind of guard and logs from each one, then navigates from <code>/</code> (component <code>Home</code>) to <code>/account</code> (component <code>Account</code>, with a <code>beforeEnter</code>). Output on vue-router 5.4.0:

\`\`\`
push('/account')
 1. beforeRouteLeave   (Home, in-component)
 2. beforeEach         (global)
 3. beforeEach #2      (global, registration order)
 4. beforeEnter        (route config)
 5. beforeRouteEnter   (Account, in-component, no \`this\` yet)
[VUE_ROUTER_R0025] The \`next()\` callback in navigation guards is deprecated.
├▶ fix: Return the value instead: \`next()\` becomes \`return\`, \`next(false)\` becomes \`return false\`, \`next("/path")\` becomes \`return "/path"\`.
╰▶ see: https://router.vuejs.org/guide/advanced/navigation-guards.html#Optional-third-argument-next
 6. beforeResolve      (global)
 7. afterEach          (global) failure = undefined
 8. beforeRouteEnter next(vm) callback, vm.$options.name = Account
 9. Account mounted
push('/account/billing')  (same component, param changes)
    beforeRouteUpdate  (Account)
\`\`\`

What the log proves:

- **Global guards run in registration order** (lines 2 and 3).
- **<code>afterEach</code> runs before the new component mounts** (line 7 before line 9), so do not query the new page DOM in it.
- **The <code>beforeRouteEnter</code> callback gets the instance before its <code>mounted</code> hook has run** (line 8 before line 9). The same script on vue-router 4.6.4 printed lines 1 to 9 in exactly this order, so this is long-standing behaviour, not a v5 change.
- **A param-only change** (<code>/account</code> to <code>/account/billing</code>) ran only <code>beforeRouteUpdate</code>: no leave, no enter, and <code>beforeEnter</code> did not run again.
- **The deprecation warning** fired because <code>beforeRouteEnter</code> used <code>next(vm =&gt; ...)</code>. The 4.6.4 run printed no warning.

The rest of the same run covers the other outcomes:

\`\`\`
--- redirect ---
now at /login?redirect=/admin redirectedFrom /admin
--- abort ---
push resolved with failure: true | still at /login?redirect=/admin
same location again: true
--- throw in guard ---
router.onError: guard blew up
push rejected: guard blew up
\`\`\`

📌 **Interview term: Navigation failure** — the value <code>router.push()</code> resolves with when a navigation did not happen without being an error: aborted by a guard returning <code>false</code>, cancelled by a newer navigation, or duplicated (already at that location). Check it with <code>isNavigationFailure(result, NavigationFailureType.aborted)</code>. Thrown errors are different: they reject the promise.

## 5. The Two Classic Use Cases

The router module in the examples tab and the <code>SettingsPage.vue</code> below implement both requirements from the question, with a fake auth service (a local promise, no network). Tested with Vitest, Vue Test Utils and a memory-history router, with <code>window.confirm</code> mocked:

\`\`\`
logged out, push /settings -> /login?redirect=/settings | title: Sign in | Acme
logged in, push /settings?tab=danger -> /settings | title: Settings | Acme
unsaved + confirm() false -> /settings | aborted: true
unsaved + confirm() true  -> / | title: Home | Acme
\`\`\`

\`\`\`vue
<script setup lang="ts">
import { ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

const name = ref("Ada");
const saved = ref("Ada");

// In-component guard: block leaving while there are unsaved edits
onBeforeRouteLeave(() => {
  if (name.value !== saved.value) {
    return window.confirm("You have unsaved changes. Leave anyway?");
  }
});
</script>

<template>
  <label>Name <input v-model="name" /></label>
  <button @click="saved = name">Save</button>
</template>
\`\`\`

1. **Auth.** <code>beforeEach</code> checks <code>to.meta.requiresAuth</code>, awaits the auth check, and returns <code>{ name: "login", query: { redirect: to.fullPath } }</code>. After login, the page reads <code>route.query.redirect</code> and navigates there.
2. **Per-route rule.** <code>beforeEnter</code> on <code>/settings</code> strips a <code>?tab=danger</code> the user is not allowed to see by returning a cleaned location.
3. **Unsaved changes.** <code>onBeforeRouteLeave</code> returns the result of <code>window.confirm(...)</code>: <code>false</code> cancels the navigation and the URL stays put.
4. **Titles.** <code>afterEach</code> sets <code>document.title</code> from <code>to.meta.title</code>, skipping it when <code>failure</code> is set.

The same in-component guard covers in-app navigation only. Closing the tab or typing a new URL leaves the app entirely; for that you also need a <code>beforeunload</code> listener, whose browser dialog could not be tested in jsdom.

## 6. <code>next()</code> Is Deprecated

Older tutorials write every guard as <code>(to, from, next) =&gt; { ...; next() }</code>. In Vue Router 4 that was already optional; in Vue Router 5 it is formally deprecated:

- The 5.0.3 release (19 February 2026) added the runtime warning shown above (source: <a href="https://github.com/vuejs/router/releases" target="_blank" rel="noopener noreferrer">vuejs/router releases</a>). Verified on 5.4.0: it prints on **every** guard call that uses <code>next</code> in development, and not at all with <code>NODE_ENV=production</code>.
- The 5.4.0 typings tag the parameter <code>@deprecated Return a value from the guard instead of calling next(value). The callback will be removed in a future version of Vue Router.</code>
- The migration guide says Vue Router 6 will remove deprecated APIs.

Returning values is also safer: the classic <code>next</code> bugs (calling it twice, or forgetting to call it in one branch so the navigation hangs) cannot happen with a <code>return</code>.

## 7. Choosing the Right Guard

| Need | Guard | Why |
| :--- | :--- | :--- |
| Auth for many routes | Global <code>beforeEach</code> + <code>meta.requiresAuth</code> | One rule, parent meta protects children |
| Rule specific to one route | <code>beforeEnter</code> | Lives next to the route it protects |
| Unsaved edits | <code>onBeforeRouteLeave</code> | Only the component knows if it is dirty |
| Param change on the same page | <code>onBeforeRouteUpdate</code> | The component is reused, see [dynamic routes](/interview-question/how-do-dynamic-routes-and-route-params-work-in-vue-router) |
| Last check after async components resolve | <code>beforeResolve</code> | Runs after all enter guards |
| Titles, analytics, focus management | <code>afterEach</code> | Navigation already confirmed |

Guards also exist in other frameworks with different shapes; Angular uses functional <code>CanActivate</code> guards, compared in [Angular route guards](/interview-question/what-are-route-guards-in-angular).

## 8. Common Pitfalls

- **Treating guards as security.** They run in the user's browser and can be bypassed. They improve UX; the API must still check authorisation on every request.
- **Redirect loops.** <code>beforeEach</code> redirects everything without a token to <code>/login</code>, including <code>/login</code> itself. Verified on 5.4.0: in development the router gave up after 32 guard calls with <code>[VUE_ROUTER_R0009] Detected a possibly infinite redirection in a navigation guard</code> and the warning "This might break in production if not fixed", and <code>push()</code> rejected with <code>Infinite redirect in navigation guard</code>. Only redirect routes that need auth.
- **Using the store before it exists.** Call <code>useAuthStore()</code> inside the guard function, not at the top of the router module, so <code>app.use(pinia)</code> has already run. See [Pinia](/interview-question/what-is-pinia-and-why-use-it).
- **Doing navigation-changing work in <code>afterEach</code>.** It cannot cancel or redirect, and the new component has not mounted yet (verified above).
- **Mixing <code>next</code> and return values**, or calling <code>next</code> twice. Return a value; <code>next</code> is deprecated.
- **Expecting <code>beforeEnter</code> on param changes.** It only runs when entering the route; use <code>onBeforeRouteUpdate</code> for <code>/users/1</code> to <code>/users/2</code>.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Navigation guards are functions the router calls during a navigation; each one can continue, cancel by returning false, or redirect by returning a location."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three levels:</strong> <span style="color:#f0e2c8;">"Global ones on the router like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEach</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeResolve</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEach</code>; per-route <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEnter</code> in the route record; and in-component ones like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeRouteLeave</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeRouteUpdate</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The order:</strong> <span style="color:#f0e2c8;">"Leave guard of the old page, global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEach</code>, then update or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEnter</code>, then the enter guard of the new page, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeResolve</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEach</code> once confirmed, which runs before the new page mounts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real uses:</strong> <span style="color:#f0e2c8;">"Auth in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeEach</code> driven by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">meta.requiresAuth</code> with a redirect query, unsaved-changes confirms in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeRouteLeave</code>, and titles or analytics in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEach</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern detail:</strong> <span style="color:#f0e2c8;">"I return values instead of calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>, which Vue Router 5 deprecates with a dev warning, and I treat guards as UX: the server still enforces permissions."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you redirect back to the original page after login?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The auth guard returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ name: 'login', query: { redirect: to.fullPath } }</code>. After a successful login the page calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.replace(route.query.redirect || '/')</code>, ideally after checking it is an internal path so it cannot be abused as an open redirect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the auth check is async?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the guard async and await it; the router waits before continuing. For the first load, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await router.isReady()</code> before relying on the current route. Verified: an async guard finished before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await router.push()</code> resolved.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does beforeRouteEnter not have this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs before the navigation is confirmed, so the component has not been created yet. Its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(vm =&gt; ...)</code> callback receives the instance later; in my test that callback ran before the component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mounted</code> hook. In the Composition API there is no enter guard: use setup itself or a route-level guard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between beforeEach and beforeResolve?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are global and can cancel. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beforeResolve</code> runs after all per-route and in-component enter guards and after async route components are resolved, so it is the right place for a final check that needs everything else to have passed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know if router.push actually navigated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> resolves with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> on success or a navigation failure object when a guard aborted it, a newer navigation cancelled it, or the target was the current location. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isNavigationFailure(result, NavigationFailureType.aborted)</code>. Thrown guard errors reject the promise instead.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Navigation guard** | A function the router calls during a navigation that can continue, cancel or redirect it |
| **beforeEach** | Global guard for every navigation, the usual auth hook |
| **beforeEnter** | Per-route guard, runs only when entering that route |
| **onBeforeRouteLeave** | In-component guard when leaving, used for unsaved changes |
| **onBeforeRouteUpdate** | In-component guard when the route changes but the component is reused |
| **beforeResolve** | Global guard that runs after every enter guard |
| **afterEach** | Global hook after confirmation, cannot change the navigation |
| **Route meta** | Custom data on a route record, read as <code>to.meta</code> |
| **Navigation failure** | Result of an aborted, cancelled or duplicated navigation |

---
**Conclusion:** Navigation guards are the checkpoints of every route change: the leaving component, the global <code>beforeEach</code>, the reused component or the route <code>beforeEnter</code>, the entering component, <code>beforeResolve</code>, and finally <code>afterEach</code> once the navigation is confirmed. The logged run above shows that order exactly, and that <code>afterEach</code> fires before the new page mounts. Each guard continues by returning nothing, cancels with <code>false</code>, or redirects by returning a location; <code>next()</code> is deprecated and warns in Vue Router 5. Put auth in <code>beforeEach</code> driven by route <code>meta</code>, unsaved-changes checks in <code>onBeforeRouteLeave</code>, and remember that a guard is a convenience for users, not a substitute for checking permissions on the server.`,
    examples: [
      {
        label: "An auth guard, a per-route guard, afterEach titles and an unsaved-changes leave guard",
        tech: "ts",
        runnable: false,
        code: `import { createRouter, createWebHistory, type RouterHistory } from "vue-router";
import { useAuth } from "./auth";

// Tell TypeScript which meta fields routes may declare
declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    title?: string;
  }
}

export function makeRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: "/", component: () => import("./HomePage.vue"), meta: { title: "Home" } },
      { path: "/login", name: "login", component: () => import("./LoginPage.vue"), meta: { title: "Sign in" } },
      {
        path: "/settings",
        component: () => import("./SettingsPage.vue"),
        meta: { requiresAuth: true, title: "Settings" },
        // per-route guard: runs only when ENTERING this route from another one
        beforeEnter: (to) => {
          if (to.query.tab === "danger" && !useAuth().isAdmin) return { path: "/settings" }; // drop the tab
        },
      },
    ],
  });

  // Global guard: return nothing/true to continue, false to cancel,
  // or a location to redirect. No next() needed (it is deprecated in v5).
  router.beforeEach(async (to) => {
    const auth = useAuth();
    if (to.meta.requiresAuth && !(await auth.check())) {
      return { name: "login", query: { redirect: to.fullPath } };
    }
  });

  // After the navigation is confirmed: side effects only, cannot cancel
  router.afterEach((to, from, failure) => {
    if (!failure) document.title = \`\${to.meta.title ?? "App"} | Acme\`;
  });

  return router;
}`,
      },
      {
        label: "Script that prints the full guard order (Node, memory history)",
        tech: "js",
        runnable: false,
        code: `import "./dom.mjs"; // jsdom globals (window, document) so components can mount in Node
import { createApp, h, defineComponent, onMounted } from "vue";
import { createRouter, createMemoryHistory, RouterView, isNavigationFailure, NavigationFailureType, onBeforeRouteLeave } from "vue-router";

const log = (...a) => console.log(...a);
const Home = defineComponent({
  name: "Home",
  beforeRouteLeave(to, from) { log(" 1. beforeRouteLeave   (Home, in-component)"); },
  render: () => h("p", "home"),
});
const Account = defineComponent({
  name: "Account",
  beforeRouteEnter(to, from, next) {
    log(" 5. beforeRouteEnter   (Account, in-component, no \`this\` yet)");
    next((vm) => log(" 8. beforeRouteEnter next(vm) callback, vm.$options.name =", vm.$options.name));
  },
  beforeRouteUpdate() { log("    beforeRouteUpdate  (Account)"); },
  mounted() { log(" 9. Account mounted"); },
  render: () => h("p", "account"),
});
const routes = [
  { path: "/", component: Home },
  { path: "/account/:tab?", component: Account, beforeEnter: (to, from) => { log(" 4. beforeEnter        (route config)"); } },
  { path: "/admin", component: { render: () => h("p", "admin") }, meta: { requiresAdmin: true } },
  { path: "/login", component: { render: () => h("p", "login") } },
];
const router = createRouter({ history: createMemoryHistory(), routes });
let phase = "init";
router.beforeEach((to, from) => {
  if (phase === "trace") log(" 2. beforeEach         (global)");
  if (to.meta.requiresAdmin) return { path: "/login", query: { redirect: to.fullPath } };
});
router.beforeEach(() => { if (phase === "trace") log(" 3. beforeEach #2      (global, registration order)"); });
router.beforeResolve(() => { if (phase === "trace") log(" 6. beforeResolve      (global)"); });
router.afterEach((to, from, failure) => { if (phase === "trace") log(" 7. afterEach          (global) failure =", failure); });

const app = createApp({ render: () => h(RouterView) }).use(router);
await router.push("/"); app.mount("#app"); await router.isReady();
phase = "trace";
log("push('/account')");
await router.push("/account");
await new Promise(r => setTimeout(r, 10));
log("push('/account/billing')  (same component, param changes)");
phase = "upd";
await router.push("/account/billing");
phase = "x";
log("--- redirect ---");
await router.push("/admin");
log("now at", router.currentRoute.value.fullPath, "redirectedFrom", router.currentRoute.value.redirectedFrom?.fullPath);
log("--- abort ---");
const off = router.beforeEach(() => false);
const f = await router.push("/");
log("push resolved with failure:", isNavigationFailure(f, NavigationFailureType.aborted), "| still at", router.currentRoute.value.fullPath);
off();
const dup = await router.push(router.currentRoute.value.fullPath);
log("same location again:", isNavigationFailure(dup, NavigationFailureType.duplicated));
log("--- throw in guard ---");
router.onError((e) => log("router.onError:", e.message));
const off2 = router.beforeEach(() => { throw new Error("guard blew up"); });
await router.push("/").catch((e) => log("push rejected:", e.message));
off2();
log("--- async guard ---");
const off3 = router.beforeEach(async (to) => { await new Promise(r => setTimeout(r, 30)); log("  async guard done for", to.fullPath); return true; });
await router.push("/"); log("  push awaited, at", router.currentRoute.value.fullPath); off3();
process.exit(0);`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Pinia and why use it?",
    seoDescription:
      "Pinia is Vue's official store library: option and setup stores, getters, actions, $patch, plugins and SSR-safe state, and what changed in Pinia 4.",
    description: `**Question presented to candidate:**
"Several unrelated parts of our Vue app need the same cart and user data, and props are getting passed five levels deep. What is Pinia, how does a store look, and why would you pick it over a plain \`reactive()\` object or Vuex?"

**What a strong answer should cover:**
- Pinia is the **official** state management library for Vue (the Vuex README now says "Pinia is now the new default"); a store is a reactive object shared by every component that calls \`useXxxStore()\`.
- The three parts: **state**, **getters** (cached, like \`computed\`) and **actions** (methods, sync or async); both the **option store** and **setup store** syntaxes.
- What it adds over a module-level \`reactive()\`: devtools integration, **SSR safety** (one store set per request), plugins, HMR, \`$patch\` / \`$subscribe\` / \`$onAction\`, and a conventional structure.
- What it removed compared with Vuex: no mutations, no nested modules or namespaces, full TypeScript inference without wrappers.
- Practical details: \`app.use(createPinia())\`, destructure with \`storeToRefs\`, \`$reset()\` exists only on option stores.

**Clarifying questions expected:**
- "Is this app server-rendered, or client-only?"
- "Is the shared data client state, or mostly server data that a query cache might handle better?"

**Code / implementation expected:** Yes — a small store (state, a getter, an action) and a component that uses it.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who knows [ref and reactive](/interview-question/what-is-the-difference-between-ref-and-reactive) — no state-management library experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output below was produced on Vue 3.5.44 and pinia 4.1.0: Node scripts on <code>createPinia()</code>, server renders with <code>renderToString</code>, a Vitest + Vue Test Utils run of the example store, and the runnable example through the repo verifier in jsdom. Pinia 3.0.4 was installed alongside for the version comparisons.

## 1. Why This Even Matters — A Story First

A small office keeps its paperwork on whoever's desk it landed on. It works while there are five people: if you need the client file, you shout across the room. At fifty people, the same file has been photocopied three times, two copies are out of date, and nobody knows who changed the address.

So the office creates a records room. Every file lives there exactly once. Anyone can read it, changes go through a clerk who writes down what changed and when, and new branches get their own records room rather than sharing one across the country.

In a Vue app the desks are components, and the shouting is props passed down five levels and events bubbling back up. **Pinia** is the records room: one place where shared state lives once, with a clerk (devtools, plugins, subscriptions) who can see every change, and, on a server, a separate room per request.

## 2. The Core Idea

📌 **Interview term: Store** — a reactive object that holds shared state plus the logic around it, defined once with <code>defineStore("id", ...)</code> and used anywhere with the returned <code>useXxxStore()</code> function. Every call returns the **same** instance for a given Pinia: verified, <code>useCounter() === useCounter()</code> printed <code>same instance: true</code>.

📌 **Interview term: State, getters, actions** — the three parts of a store. **State** is the data. **Getters** are derived values, cached like [<code>computed</code>](/interview-question/what-is-the-difference-between-computed-and-watch). **Actions** are methods that change state; they can be async and can call other stores.

📌 **Interview term: Option store vs setup store** — two ways to write the same thing. An option store passes <code>{ state, getters, actions }</code>, like the Options API. A setup store passes a function, like <code>&lt;script setup&gt;</code>: every <code>ref</code> becomes state, every <code>computed</code> a getter and every function an action. Both are in the examples tab.

Setup is one line in <code>main.ts</code>, <code>createApp(App).use(createPinia()).mount("#app")</code>, and then any component can do <code>const cart = useCartStore()</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Three unrelated components each call useCartStore and all receive the same store instance held by the Pinia instance installed on the app">
  <defs>
    <marker id="q04-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">HeaderBadge</text>
  <text class="d-sub" x="120" y="74" text-anchor="middle">reads cart.count</text>
  <rect class="d-box" x="260" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="350" y="54" text-anchor="middle">ProductList</text>
  <text class="d-sub" x="350" y="74" text-anchor="middle">calls cart.add()</text>
  <rect class="d-box" x="490" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="580" y="54" text-anchor="middle">CheckoutPage</text>
  <text class="d-sub" x="580" y="74" text-anchor="middle">reads cart.total</text>
  <path class="d-edge" d="M 120 90 L 280 150" marker-end="url(#q04-arrow)"/>
  <path class="d-edge" d="M 350 90 L 350 150" marker-end="url(#q04-arrow)"/>
  <path class="d-edge" d="M 580 90 L 420 150" marker-end="url(#q04-arrow)"/>
  <rect class="d-box-accent" x="200" y="156" width="300" height="104" rx="12"/>
  <text class="d-text d-accent" x="350" y="184" text-anchor="middle">cart store, one instance</text>
  <text class="d-sub" x="350" y="208" text-anchor="middle">state: items</text>
  <text class="d-sub" x="350" y="228" text-anchor="middle">getters: count, total</text>
  <text class="d-sub" x="350" y="248" text-anchor="middle">actions: add, checkout</text>
</svg>

The components never pass the cart to each other. They each ask for the store by its hook, and Pinia hands back the one instance registered on the app. Compare this with [provide and inject](/interview-question/what-are-provide-and-inject), which shares state down one subtree, and with [the ways components communicate](/interview-question/how-do-vue-components-communicate) in general.

## 3. Verified: the store API

A Node script with one option store (<code>counter</code>) and one setup store (<code>cart</code>), installed on an app with <code>createApp({}).use(pinia)</code>:

\`\`\`
same instance: true
count 6 double 12 history [1,5]
after $patch: 10 [1,5,"patched"]
  $onAction: increment [2]
  after increment
  $subscribe: direct count = 12
  $subscribe: patch function count = 0
after $reset: 0 []
pinia.state: {"counter":{"count":0,"history":[]}}
cart total: 42 items is plain array via store: true
setup store $reset -> 🍍: Store "cart" is built using the setup syntax and does not implement $reset().
\`\`\`

📌 **Interview term: $patch** — apply several state changes as one mutation, either with an object (<code>$patch({ count: 10 })</code>) or with a function for arrays and nested data (<code>$patch(s =&gt; s.history.push(x))</code>).

📌 **Interview term: $subscribe and $onAction** — hooks for watching a store from outside: <code>$subscribe</code> fires after state changes (note it reported the action as one <code>direct</code> mutation even though <code>increment</code> changed two fields), and <code>$onAction</code> fires before each action with <code>after</code> and <code>onError</code> callbacks. They are how persistence, logging and undo plugins work.

Two details from that run worth repeating in an interview. <code>$reset()</code> works on option stores because Pinia can call <code>state()</code> again; a setup store has no such function, and in development calling it throws the error above. In production it is silently a no-op: with <code>NODE_ENV=production</code> the same call did not throw and the items were unchanged. Write your own <code>reset</code> action in setup stores.

And <code>pinia.state.value</code> holds every store's state under its id, which is what gets serialised into the HTML for [SSR](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration) hydration.

The examples-tab stores were also used from this component and mounted with Vue Test Utils (two increments, one "Add apple", then a <code>$patch</code>):

\`\`\`vue
<script setup lang="ts">
import { useCounterStore, useCartStore } from "./stores";

const counter = useCounterStore(); // same instance in every component
const cart = useCartStore();
</script>

<template>
  <button @click="counter.increment()">{{ counter.count }} (x2 = {{ counter.double }})</button>
  <button @click="cart.add('apple', 3)">Add apple</button>
  <p>{{ cart.items.length }} items, total {{ cart.total }}</p>
</template>
\`\`\`

\`\`\`
DOM: 2 (x2 = 4)Add apple1 items, total 3
after $patch: 10 (x2 = 20)Add apple1 items, total 3
pinia.state: {"counter":{"count":10},"cart":{"items":[{"sku":"apple","price":3}]}}
\`\`\`

## 4. Why Not Just Export a <code>reactive()</code>?

You can. The runnable example does exactly that, a module-level <code>reactive</code> cart shared by two components, and it works (verified: <code>Cart (3)</code> and <code>Apple x 2</code>, <code>Pear x 1</code> after three clicks). For a small client-only app it is a reasonable choice. Pinia earns its place when the app grows:

| Concern | Module-level <code>reactive()</code> | Pinia |
| :--- | :--- | :--- |
| Sharing state | Yes | Yes |
| SSR | One object shared by every request on the server | One set of stores per <code>createPinia()</code>, so per request |
| Devtools timeline and state editing | No | Yes (not exercised here: needs the browser extension) |
| Plugins (persistence, logging) | Write your own | <code>pinia.use(plugin)</code> runs for every store |
| Hot module replacement | Full reload | <code>acceptHMRUpdate</code> keeps state while editing |
| Testing | Reset by hand | Fresh <code>createPinia()</code> per test, or <code>createTestingPinia</code> |
| Structure | Whatever each developer invents | State, getters, actions, one convention |

The SSR row is the one with a real bug behind it. Two server renders in one Node process, request A signs Ada in and request B is anonymous:

\`\`\`
request A (ada logs in): <p>pinia: ada | module singleton: ada</p>
request B (anonymous)  : <p>pinia: null | module singleton: ada</p>
\`\`\`

The module singleton leaked Ada into another user's page. Each request had its own <code>createPinia()</code>, so the store did not. The [large-app state structure](/interview-question/how-would-you-structure-state-management-for-a-large-vue-app) doc builds on this.

📌 **Interview term: Pinia plugin** — a function passed to <code>pinia.use()</code> that runs once for each store and can add properties or subscribe to it. Verified with a plugin that times every action: it printed <code>[todos] load took 28 ms</code>, but **only** once the Pinia was installed with <code>app.use(pinia)</code>. With just <code>setActivePinia(pinia)</code> and no app, as in many unit tests, the plugin silently never ran.

## 5. Pinia vs Vuex

Pinia started as an experiment in what Vuex 5 could look like and became the replacement. The Vuex README now opens with "Pinia is now the new default" and says Vuex 3 and 4 "will still be maintained. However, it's unlikely to add new functionalities to it" (source: <a href="https://github.com/vuejs/vuex" target="_blank" rel="noopener noreferrer">vuejs/vuex README</a>).

| | Vuex 4 | Pinia |
| :--- | :--- | :--- |
| Changing state | Commit a mutation, actions dispatch mutations | Assign directly or call an action |
| Modules | One store with nested, namespaced modules | Many flat stores, imported where needed |
| TypeScript | Needs wrapper types and string keys | Inferred from the store definition |
| Calling from components | <code>this.$store.dispatch("cart/add")</code> | <code>useCartStore().add()</code> |
| Status | Maintained, no new features | The official default |

## 6. What Changed in Pinia 4

📌 **Interview term: Pinia 4** — released on npm on 14 July 2026. According to its release notes the breaking changes are packaging, not API: it is **ESM only**, and it upgraded to <code>@vue/devtools-api</code> v8, which "now must be installed alongside pinia". It also rewrote dev errors and warnings with the <code>nostics</code> diagnostics library, made <code>storeToRefs</code> skip nullish values gracefully, and 4.1.0 (14 October 2026) added <code>getStores()</code> and a warning when you dispose a store that was already replaced (source: <a href="https://github.com/vuejs/pinia/releases" target="_blank" rel="noopener noreferrer">vuejs/pinia releases</a>). The 4.1.0 <code>package.json</code> confirms the peer dependencies: <code>vue ^3.5.11</code> and a non-optional <code>@vue/devtools-api ^8.2.1</code>.

The store API itself did not change: every store in this doc runs unmodified on 3.0.4 and 4.1.0, and the two error messages checked (setup-store <code>$reset</code> and "no active Pinia") were word for word the same on both. For comparison, Pinia 3 (February 2025) was the release that dropped Vue 2: the <code>vue</code> peer range went from <code>^2.7.0 || ^3.5.11</code> in 2.3.1 to <code>^3.5.11</code> in 3.0.4. See [storeToRefs](/interview-question/why-use-storetorefs-with-pinia) and [store colocation](/interview-question/pinia-colocation-in-2025-how-do-you-colocate-stores-with-routes-components) for the 4.x additions in context.

## 7. Common Pitfalls

- **Destructuring the store.** <code>const { count } = useCounterStore()</code> copies a number and stops updating. Use <code>storeToRefs(store)</code> for state and getters; actions can be destructured directly.
- **Calling a store before <code>app.use(pinia)</code>.** Outside components, for example at the top of a router file, it throws <code>[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?</code> (verified). Call <code>useStore()</code> inside the function that needs it.
- **Calling <code>$reset()</code> on a setup store.** It throws in development and does nothing in production. Add a <code>reset</code> action.
- **Putting everything in stores.** Form drafts, a dropdown open flag and other single-component state belong in the component. Server responses are often better served by a query cache; see the [large-app structure](/interview-question/how-would-you-structure-state-management-for-a-large-vue-app) doc.
- **Testing without an app.** <code>setActivePinia(createPinia())</code> is enough for stores, but plugins only run after <code>app.use(pinia)</code>, as verified above.
- **Upgrading to Pinia 4 without <code>@vue/devtools-api</code>.** It is now a required peer dependency.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">"Pinia is the official state management library for Vue: a store is a reactive object with state, getters and actions that any component can use through its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useXxxStore()</code> hook."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two syntaxes:</strong> <span style="color:#f0e2c8;">"An option store with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">state</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getters</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actions</code>, or a setup store where refs are state, computeds are getters and functions are actions; I default to setup stores for composables and types."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not a reactive() export:</strong> <span style="color:#f0e2c8;">"A module-level reactive object works for small client-only apps, but on the server it is shared across requests, and it has no devtools, plugins, HMR or conventions; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createPinia()</code> per request fixes the SSR leak."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Versus Vuex:</strong> <span style="color:#f0e2c8;">"No mutations and no namespaced modules: you change state directly or in actions, split the app into many small stores, and get TypeScript inference for free. Vuex is maintained but gets no new features."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practical details:</strong> <span style="color:#f0e2c8;">"Destructure with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs</code>, remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$reset()</code> only exists on option stores, and in Pinia 4 install <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/devtools-api</code> alongside because it became a required peer."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should state NOT go in a store?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When only one component or one subtree uses it: form drafts, open and closed flags, hover state. Keep that local, or use provide and inject for a subtree. Server data that just needs caching is often better in a query cache than hand-written store actions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do stores use other stores?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call the other <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useXxxStore()</code> inside an action, getter or the setup function, not at module top level. Pinia resolves it from the same Pinia instance, so it works on the server too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Pinia work with SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create a new Pinia for every request, render, then serialise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pinia.state.value</code> into the page. On the client, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pinia.state.value</code> from that payload before the app mounts, so stores start hydrated instead of refetching. Verified: the server payload was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{"user":{"name":"ada"}}</code> and the client store started with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ada</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do $subscribe and $onAction give you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$subscribe</code> fires after state changes and tells you the mutation type; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$onAction</code> fires before every action with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code> hooks. They are the building blocks for persistence, logging and analytics plugins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed in Pinia 4?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Packaging, not the API: ESM only, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/devtools-api</code> v8 must be installed alongside, and dev errors were rewritten with coded diagnostics. 4.1 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getStores()</code> and a warning when disposing an already replaced store. My stores ran unchanged on 3.0.4 and 4.1.0.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Store** | A shared reactive object with state, getters and actions, used via <code>useXxxStore()</code> |
| **State** | The data a store holds |
| **Getter** | Cached derived value, like <code>computed</code> |
| **Action** | Method that changes state, can be async |
| **Option store** | <code>defineStore(id, { state, getters, actions })</code> |
| **Setup store** | <code>defineStore(id, () =&gt; { ...; return { ... } })</code> |
| **$patch** | Several state changes applied as one mutation |
| **$subscribe / $onAction** | Hooks that observe state changes and action calls |
| **Pinia plugin** | Function run for every store via <code>pinia.use()</code> |
| **Pinia 4** | The July 2026 major: ESM only, devtools-api v8 peer, new diagnostics |

---
**Conclusion:** Pinia is Vue's official store library: you define a store once with state, getters and actions (as options or as a setup function), install <code>createPinia()</code> on the app, and every component that calls the store hook gets the same reactive instance. A module-level <code>reactive()</code> can share state too, but the verified server render above shows why it is dangerous with SSR, and it gives you no devtools, plugins, HMR or convention. Compared with Vuex, Pinia drops mutations and namespaced modules and infers types for free. Pinia 4 changed packaging and diagnostics, not the API. Mention <code>storeToRefs</code> for destructuring and the <code>$reset</code> caveat for setup stores, and you have covered what interviewers look for.`,
    examples: [
      {
        label: "The problem Pinia solves: shared state between unrelated components (no Pinia)",
        tech: "vue",
        runnable: true,
        code: `<script setup>
// The problem Pinia solves, without Pinia: two components that are not
// parent and child need the same cart. A module-level reactive() works in a
// small client-only app; Pinia adds devtools, SSR safety, plugins and a
// conventional shape (state, getters, actions) on top of the same idea.
import { reactive, computed, defineComponent, h } from "vue";

const cart = reactive({
  items: [],
  get count() { return this.items.reduce((n, i) => n + i.qty, 0); },
  add(name) {
    const line = this.items.find((i) => i.name === name);
    line ? line.qty++ : this.items.push({ name, qty: 1 });
  },
});

const ProductList = defineComponent({
  setup: () => () =>
    h("div", ["Apple", "Pear"].map((name) => h("button", { onClick: () => cart.add(name) }, \`Add \${name}\`))),
});

const HeaderBadge = defineComponent({
  setup() {
    const label = computed(() => \`Cart (\${cart.count})\`);
    return () => h("strong", label.value);
  },
});
</script>

<template>
  <HeaderBadge />
  <ProductList />
  <ul>
    <li v-for="line in cart.items" :key="line.name">{{ line.name }} x {{ line.qty }}</li>
  </ul>
</template>`,
      },
      {
        label: "An option store and a setup store",
        tech: "ts",
        runnable: false,
        code: `import { defineStore } from "pinia";
import { ref, computed } from "vue";

// Option store: state / getters / actions, like a component options object
export const useCounterStore = defineStore("counter", {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment(by = 1) {
      this.count += by;
    },
  },
});

// Setup store: a setup() function. ref = state, computed = getter, function = action
export const useCartStore = defineStore("cart", () => {
  const items = ref<{ sku: string; price: number }[]>([]);
  const total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0));
  function add(sku: string, price: number) {
    items.value.push({ sku, price });
  }
  return { items, total, add };
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Why use storeToRefs with Pinia?",
    seoDescription:
      "Why destructuring a Pinia store breaks reactivity, how storeToRefs fixes it for state and getters, why actions are fine, and how it differs from toRefs.",
    difficulty: "medium",
    description: `**Question presented to candidate:**
"A teammate wrote \`const { count, double } = useCounterStore()\` in a component, and the numbers on screen never change after the first render. Explain why, what \`storeToRefs\` does about it, and when you do not need it."

**What a strong answer should cover:**
- A Pinia store is a \`reactive()\` object; destructuring reads each property **once** and copies the current value out, so the copies are no longer connected to the store.
- \`storeToRefs(store)\` returns an object of **refs** for every state property and getter, each linked to the store, so destructuring keeps reactivity; writing a state ref writes the store.
- **Actions** are plain functions bound to the store, so \`const { increment } = store\` is fine and \`storeToRefs\` deliberately leaves them out.
- Why not \`toRefs(store)\`: it also turns actions and internal \`$\` properties into refs (11 keys for a 3-member store in the verified run).
- Alternatives: just use \`store.count\` (no destructuring), \`toRef(store, 'count')\` for one value, or \`computed(() => store.count)\`; getters stay read-only.

**Clarifying questions expected:**
- "Is this an option store or a setup store?" (the answer is the same, which is worth saying)

**Code / implementation expected:** Yes — the broken destructuring next to the \`storeToRefs\` version, and actions destructured directly.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who has used [Pinia](/interview-question/what-is-pinia-and-why-use-it) at least once — basic <code>ref</code> and <code>reactive</code> knowledge assumed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output was produced on Vue 3.5.44 with pinia 4.1.0 (and 3.0.4 for one comparison): a component mounted in jsdom from a Node script, a Vitest + Vue Test Utils run of the example component, and the runnable example through the repo verifier.

## 1. Why This Even Matters — A Story First

You check the departures board at the airport, write "Gate 12" on your hand, and go for coffee. Ten minutes later the board says Gate 31. Your hand still says Gate 12. Nothing is wrong with the board or with your hand; you just copied a value instead of keeping a way to look it up.

Destructuring a Pinia store is writing on your hand. <code>const { count } = store</code> copies whatever <code>count</code> is right now into a local variable. The store keeps changing; the variable does not.

<code>storeToRefs</code> gives you a little live screen per value instead of a note. Each screen is a <code>ref</code> wired to the store, so it always shows the current gate. Interviewers like the question because it tests whether you understand Vue reactivity, not just Pinia syntax.

## 2. The Core Idea

📌 **Interview term: Reactive proxy** — the object <code>reactive()</code> returns. Vue tracks a dependency when an effect (a render, a <code>computed</code>, a <code>watch</code>) **reads a property through the proxy**. A Pinia store is such a proxy. See [how Vue reactivity works](/interview-question/how-does-vue-s-reactivity-system-work).

📌 **Interview term: Losing reactivity by destructuring** — <code>const { count } = store</code> reads <code>store.count</code> once, at that moment, and stores the plain value (a number) in a local variable. Later reads go to the local variable, not through the proxy, so nothing is tracked and nothing updates. This is one of the [common reactivity caveats](/interview-question/what-are-common-reactivity-caveats-in-vue).

📌 **Interview term: storeToRefs** — a Pinia helper that returns a plain object containing one **ref** per state property and getter. A ref is an object with a <code>.value</code> that reads and writes the store, so you can destructure the result and keep reactivity. It skips actions and Pinia internals on purpose.

The runnable example shows the root cause with no Pinia at all, a plain <code>reactive()</code> object, compared with Vue's own [<code>toRefs</code>](/interview-question/what-do-toref-and-torefs-do). Verified in jsdom:

\`\`\`
[app] RENDERED: +1step upstore.count: 0destructured: 0toRefs: 0
after +1       : +1step upstore.count: 1destructured: 0toRefs: 1
step up, +2    : +2step upstore.count: 3destructured: 0toRefs: 3
\`\`\`

The destructured copy is stuck at 0 forever; the <code>toRefs</code> ref follows the object.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 280" role="img" aria-label="Destructuring a store copies plain values that never update, while storeToRefs returns refs that read and write the store">
  <defs>
    <marker id="q05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="30" width="200" height="70" rx="12"/>
  <text class="d-text d-accent" x="350" y="58" text-anchor="middle">counter store</text>
  <text class="d-sub" x="350" y="80" text-anchor="middle">reactive proxy, count is 2</text>
  <path class="d-edge-dashed" d="M 250 80 L 160 160" marker-end="url(#q05-arrow)"/>
  <path class="d-edge-accent" d="M 450 80 L 540 160" marker-end="url(#q05-arrow)"/>
  <rect class="d-box-muted" x="40" y="166" width="230" height="80" rx="12"/>
  <text class="d-text" x="155" y="194" text-anchor="middle">const { count } = store</text>
  <text class="d-sub" x="155" y="218" text-anchor="middle">plain number, stuck at 0</text>
  <rect class="d-box" x="430" y="166" width="230" height="80" rx="12"/>
  <text class="d-text" x="545" y="194" text-anchor="middle">storeToRefs(store)</text>
  <text class="d-sub" x="545" y="218" text-anchor="middle">ref, reads and writes store</text>
</svg>

The dashed path is a one-time copy; the solid path is a live link. Everything else in this doc follows from that picture.

## 3. Verified: the same bug with a real store

A component with both versions, mounted in jsdom with a real Pinia and clicked twice:

\`\`\`
initial     : plain: 0 / 0 | storeToRefs: 0 / 0
after click : plain: 0 / 0 | storeToRefs: 1 / 2
after click : plain: 0 / 0 | storeToRefs: 2 / 4
\`\`\`

The destructured <code>count</code> and <code>double</code> never moved, even though the action (destructured too) clearly ran. The examples-tab <code>CounterPanel.vue</code> repeats the experiment under Vitest with an option store, plus a button that writes through the ref:

\`\`\`
after 2 clicks: broken: 0 / 0storeToRefs: 2 / 4+1reset via ref
after reset   : broken: 0 / 0storeToRefs: 0 / 0+1reset via ref | store.count = 0
option store storeToRefs keys: count, double
setup store storeToRefs keys : items, total
\`\`\`

Two takeaways. Writing <code>count = 0</code> in the template (where refs are auto-unwrapped) wrote <code>store.count</code>. And the keys show what <code>storeToRefs</code> returns: state and getters, for option stores and setup stores alike, never actions.

## 4. Why Actions Are Fine, and Why Not <code>toRefs</code>

📌 **Interview term: Bound action** — Pinia wraps every action so it always runs against its own store, whoever calls it. A destructured action is just a function reference, and functions do not need reactivity. Verified: <code>const { increment } = store; increment()</code> moved <code>store.count</code> from 10 to 11.

So the idiomatic pattern is two lines:

\`\`\`ts
const { count, double } = storeToRefs(store); // data: refs
const { increment } = store;                  // behaviour: plain functions
\`\`\`

Vue's own <code>toRefs</code> looks like it should work too, and it does keep reactivity, but it converts **every** own property of the store. On a store with just <code>count</code>, <code>double</code> and <code>increment</code>:

\`\`\`
storeToRefs keys: count, double
toRefs(store) has 11 keys, includes increment: true , $id: true
\`\`\`

<code>toRefs</code> also wrapped the action and Pinia internals such as <code>$id</code>, which is noise at best and confusing in devtools at worst. <code>storeToRefs</code> exists to return exactly the reactive data.

## 5. Writing Through the Refs

- **State refs are writable.** <code>refs.count.value = 100</code> set <code>store.count</code> to 100 and <code>double</code> followed to 200.
- **Getter refs are read-only.** Assigning <code>refs.double.value = 1</code> left <code>double</code> at 200 and printed a dev warning beginning <code>[Vue warn] Set operation on key "double" failed: target is readonly.</code> If a value needs a setter, make it state, or use a [writable computed](/interview-question/can-a-computed-property-be-writable) inside the store.
- **They work with <code>watch</code>.** <code>watch(count, ...)</code> on a <code>storeToRefs</code> ref logged <code>0 -&gt; 1</code>, <code>1 -&gt; 10</code> and <code>10 -&gt; 11</code> as the store changed.

## 6. Alternatives and When You Do Not Need It

| You write | Reactive? | Use it when |
| :--- | :--- | :--- |
| <code>store.count</code> (no destructuring) | Yes | Most of the time, honestly: in templates and computeds |
| <code>const { count } = store</code> | **No**, a frozen copy | Never for state or getters; fine for actions |
| <code>storeToRefs(store)</code> | Yes, refs | You want short names for several values, or to pass refs to a composable |
| <code>toRef(store, "count")</code> | Yes, one ref | A single value |
| <code>computed(() =&gt; store.count)</code> | Yes, read-only | Derived or renamed values |
| <code>toRefs(store)</code> | Yes, but includes actions and internals | Avoid on stores |

All four reactive options above returned the same value after one action call in the verification run: <code>{"store":1,"toRef":1,"computed":1,"storeToRefs":1}</code>.

The real reason to reach for <code>storeToRefs</code> is composition. A [composable](/interview-question/what-are-composables-in-vue) that takes a <code>Ref&lt;number&gt;</code> can accept <code>count</code> from <code>storeToRefs</code> directly, while it could not do anything useful with a frozen number.

## 7. Pinia 4 Detail: Nullish Properties

Pinia 4.0's release notes list "Gracefully skip nullish values in storeToRefs" (source: <a href="https://github.com/vuejs/pinia/releases" target="_blank" rel="noopener noreferrer">vuejs/pinia releases</a>). Reproduced with a setup store that returns <code>{ count: ref(1), plainNull: null, plainNumber: 5 }</code>:

\`\`\`
pinia 4.1.0:
keys: count
pinia 3.0.4:
threw: Cannot read properties of null (reading 'effect')
\`\`\`

On 3.0.4, a plain <code>null</code> returned from a setup store crashed <code>storeToRefs</code>; on 4.1.0 it is skipped. Note what both versions agree on: a **plain** value returned from a setup store (<code>plainNumber: 5</code>) is not state and is not returned by <code>storeToRefs</code>. If you want it reactive, wrap it in <code>ref()</code>.

## 8. Common Pitfalls

- **Destructuring state or getters directly from the store.** The values freeze at their first read. Use <code>storeToRefs</code>, or just <code>store.x</code>.
- **Passing the whole <code>storeToRefs</code> object into <code>reactive()</code>** and then destructuring that, which reintroduces the original problem one level up: <code>reactive()</code> unwraps the refs, so <code>const { count } = reactive(storeToRefs(store))</code> gave a plain <code>0</code> that stayed 0 after <code>store.count = 5</code>.
- **Forgetting <code>.value</code> in script.** Refs from <code>storeToRefs</code> need <code>count.value</code> in <code>&lt;script setup&gt;</code>; only templates unwrap them.
- **Running actions through <code>storeToRefs</code>.** They are not in the result; destructure them from the store itself.
- **Returning plain values from a setup store and expecting them to be state.** Only refs, reactive objects and computeds are tracked; plain values are silently ignored by <code>storeToRefs</code>.
- **Assigning to a getter ref.** It is read-only and only warns in development.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The cause:</strong> <span style="color:#f0e2c8;">"A Pinia store is a reactive proxy, and Vue tracks reads through the proxy; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const { count } = store</code> reads once and keeps a plain copy, so it never updates."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs(store)</code> returns a ref for every state property and getter, each linked to the store, so I can destructure and stay reactive; writing a state ref writes the store."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Actions:</strong> <span style="color:#f0e2c8;">"Actions are bound functions, so I destructure them from the store directly; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs</code> deliberately leaves them out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why not toRefs:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs</code> on a store also wraps actions and internal properties like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$id</code>; in my test a three-member store gave 11 keys, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs</code> gave exactly the two data keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I skip it:</strong> <span style="color:#f0e2c8;">"Often I just write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">store.count</code> in templates and computeds; I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">storeToRefs</code> when I want short names or need to pass a ref into a composable."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this apply to option stores and setup stores?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Both produce the same reactive store object. I verified the keys: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count, double</code> for the option store and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items, total</code> for the setup store, with actions excluded in both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write to a getter through storeToRefs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Getter refs are read-only: the assignment is ignored and Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set operation on key "double" failed: target is readonly</code> in development. If it needs a setter, make it state or a writable computed in the store.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is destructuring an action safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pinia wraps each action so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>, or the setup closure, always points at its own store. A function does not hold changing data, so there is nothing to keep reactive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed in Pinia 4 for storeToRefs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It now skips nullish values instead of crashing. A setup store returning a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> made Pinia 3.0.4 throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cannot read properties of null (reading 'effect')</code>; 4.1.0 simply leaves it out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the same problem present outside Pinia?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it is a Vue reactivity rule: destructuring a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reactive()</code> object or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useRoute().params</code> copies values. (Destructuring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProps()</code> is the exception: since Vue 3.5 the compiler rewrites it to stay reactive.) The fixes are the same family: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRefs</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toRef</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, or reading through the object.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reactive proxy** | The object <code>reactive()</code> returns; reads through it are tracked |
| **Destructuring trap** | Copying values out of a reactive object, which disconnects them |
| **storeToRefs** | Pinia helper: one ref per state property and getter, actions skipped |
| **toRefs** | Vue helper: one ref per own property, including actions on a store |
| **toRef** | A single property as a ref |
| **Bound action** | A store action that always runs against its store, safe to destructure |
| **Auto-unwrapping** | Templates read <code>count</code> for a top-level ref, script needs <code>count.value</code> |

---
**Conclusion:** A Pinia store is a reactive proxy, and reactivity is tracked on reads through that proxy. Destructuring reads once and keeps a plain copy, which is why, in every run above, the destructured numbers stayed at 0 while the store moved on. <code>storeToRefs</code> fixes it by handing back refs for state and getters that read and write the store, while leaving actions out because bound functions never needed reactivity in the first place. Prefer it over <code>toRefs</code>, which also wraps actions and internals, remember getters stay read-only, and know that Pinia 4 now skips nullish setup-store values instead of crashing.`,
    examples: [
      {
        label: "The root cause without Pinia: destructuring a reactive() vs toRefs",
        tech: "vue",
        runnable: true,
        code: `<script setup>
// storeToRefs exists because of this: destructuring a reactive object copies
// its current values out, so they stop updating. A Pinia store is a
// reactive() object, so the same thing happens with
// const { count } = useCounterStore()
import { reactive, toRefs, toRef } from "vue";

const store = reactive({ count: 0, step: 1 });

const { count: copiedCount } = store;        // a plain number: frozen at 0
const { count: linkedCount } = toRefs(store); // a ref linked to store.count
const stepRef = toRef(store, "step");         // one property as a ref

function increment() {
  store.count += stepRef.value;
}
</script>

<template>
  <button @click="increment">+{{ stepRef }}</button>
  <button @click="stepRef++">step up</button>
  <p>store.count: {{ store.count }}</p>
  <p>destructured: {{ copiedCount }}</p>
  <p>toRefs: {{ linkedCount }}</p>
</template>`,
      },
      {
        label: "Broken vs fixed destructuring of a Pinia store",
        tech: "vue",
        runnable: false,
        code: `<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCounterStore } from "../q04/stores";

const store = useCounterStore();

// BROKEN: copies the current values out of the reactive store
const { count: staleCount, double: staleDouble } = store;

// FIXED: refs for state and getters, still linked to the store
const { count, double } = storeToRefs(store);

// Actions are plain functions bound to the store: destructure them directly
const { increment } = store;
</script>

<template>
  <p>broken: {{ staleCount }} / {{ staleDouble }}</p>
  <p>storeToRefs: {{ count }} / {{ double }}</p>
  <button @click="increment()">+1</button>
  <button @click="count = 0">reset via ref</button>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Pinia colocation in 2025 — how do you colocate stores with routes/components?",
    seoDescription:
      "Colocating Pinia stores with features: folder layout, lazy route chunks, store ids, disposing feature stores, and when subtree state beats a store.",
    description: `**Question presented to candidate:**
"Our \`src/stores/\` folder has forty Pinia stores and nobody knows which page owns which. How would you colocate stores with the routes and components that use them, and what does that change for bundle size and store lifetime?"

**What a strong answer should cover:**
- **Colocation**: keep a feature store next to the feature that owns it (\`features/users/users.store.ts\` beside \`UsersPage.vue\`); keep only truly app-wide stores (session, settings) in a shared folder.
- With **lazy routes**, a store imported only by one route's components ships in that route's chunk; a store imported by two lazy routes is split into a shared chunk. Stores are created on first \`useStore()\`, not at import.
- Store **ids are global** per Pinia: two features using the same id silently get the same store, so namespace ids (\`users-feature\`) or derive them from the folder.
- **Lifetime**: stores live until disposed; for feature-scoped data either reset or \`$dispose()\` on leaving the feature (Pinia 4.1 warns when you dispose a stale reference), or use component-scoped state.
- Not all feature state needs a store: state for one component subtree can be **provide/inject** or a composable, which gives one instance per subtree.

**Clarifying questions expected:**
- "Is this a plain Vite SPA or Nuxt (which has its own store auto-import conventions)?"
- "Should a feature keep its data when the user navigates away and comes back?"

**Code / implementation expected:** Optional — a folder layout, a colocated setup store, and the lazy route that uses it.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who knows [what Pinia is](/interview-question/what-is-pinia-and-why-use-it) and has used lazy routes — mid-level and up.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The chunk listings are real <code>vite build</code> output (Vite 8.3.4) of the small app whose files appear in the examples tab; the lifetime and id-collision behaviour was printed by Node scripts on Vue 3.5.44, vue-router 5.4.0 and pinia 4.1.0. The question says 2025; everything here was checked in October 2026 and still applies.

## 1. Why This Even Matters — A Story First

A restaurant kitchen could keep every ingredient in one giant walk-in fridge at the back. The pastry chef walks there for butter, the grill cook for steaks, the salad station for lettuce. It works, but everyone crosses everyone else's path, and nobody throws anything out because nobody is sure who uses it.

Most kitchens instead give each station its own small fridge, right next to where the food is made. The walk-in still exists for the things everyone shares, like milk and eggs. Ask a cook what is in their station fridge and they know, because they put it there.

A <code>src/stores/</code> folder with forty stores is the walk-in fridge. **Colocation** is the station fridge: a feature store sits in the same folder as the pages that use it, and only genuinely shared stores live in a common place. The payoff is not just tidiness. With lazy routes, the build tool follows your imports, so a colocated store can ship only with its feature.

## 2. The Core Idea

📌 **Interview term: Colocation** — keeping code next to the code that uses it. For Pinia: <code>features/users/users.store.js</code> lives beside <code>features/users/UsersPage.vue</code>, imported with a relative path, instead of in a global <code>stores/</code> folder.

📌 **Interview term: Feature store vs app store** — a feature store holds data one area of the app owns (the users list, the checkout cart). An app store holds data many areas need (the signed-in session, user settings). Only app stores belong in a shared folder.

📌 **Interview term: Lazy store creation** — <code>defineStore()</code> only defines a store; the store is created, and appears in <code>pinia.state</code>, the first time <code>useXxxStore()</code> is called. Importing the file costs bytes, not memory.

A layout that works in practice:

\`\`\`text
src/
  stores/
    session.js                  app-wide: used by the layout shell
  features/
    users/
      UsersPage.vue
      users.store.js            only the users feature imports this
    cart/
      CartPage.vue
      cart.store.js
  router.js                     () => import("./features/users/UsersPage.vue")
\`\`\`

The same idea appears outside Vue: Next.js projects colocate files with routes, covered in [organising a large Next.js app](/interview-question/how-do-you-organize-a-large-next-js-app-router-project-colocation-private-folder).

## 3. Verified: Stores Follow Their Route Chunks

The router lazy-loads each page (<code>component: () =&gt; import("./features/users/UsersPage.vue")</code>), <code>App.vue</code> uses the session store, and each page uses its colocated store, for example:

\`\`\`vue
<script setup>
import { storeToRefs } from "pinia";
import { useUsersStore } from "./users.store";
const store = useUsersStore();
const { list, count } = storeToRefs(store);
store.load();
</script>
<template><h1>Users ({{ count }})</h1><p v-for="u in list" :key="u.id">{{ u.name }}</p></template>
\`\`\`

 A production build, then a search of each output file for the store ids:

\`\`\`
dist/assets/CartPage-DRMaMweo.js     0.61 kB │ gzip:  0.36 kB
dist/assets/HomePage-FboaSxlV.js     0.62 kB │ gzip:  0.36 kB
dist/assets/UsersPage-CIz0aUGl.js    1.18 kB │ gzip:  0.58 kB
dist/assets/index-BU4CuBxq.js      245.56 kB │ gzip: 62.78 kB

dist/assets/CartPage-DRMaMweo.js: "cart-feature"
dist/assets/HomePage-FboaSxlV.js:
dist/assets/UsersPage-CIz0aUGl.js: "users-feature"
dist/assets/index-BU4CuBxq.js: "session"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="The session store ends up in the entry chunk, while each colocated feature store ends up in the lazy chunk of the route that imports it">
  <defs>
    <marker id="q06-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="140" y="26" text-anchor="middle">source folders</text>
  <text class="d-text" x="560" y="26" text-anchor="middle">build output</text>
  <rect class="d-box-muted" x="30" y="44" width="220" height="56" rx="10"/>
  <text class="d-text" x="140" y="68" text-anchor="middle">stores/session.js</text>
  <text class="d-sub" x="140" y="88" text-anchor="middle">used by App.vue</text>
  <rect class="d-box" x="30" y="134" width="220" height="56" rx="10"/>
  <text class="d-text" x="140" y="158" text-anchor="middle">features/users/</text>
  <text class="d-sub" x="140" y="178" text-anchor="middle">page and users.store</text>
  <rect class="d-box" x="30" y="224" width="220" height="56" rx="10"/>
  <text class="d-text" x="140" y="248" text-anchor="middle">features/cart/</text>
  <text class="d-sub" x="140" y="268" text-anchor="middle">page and cart.store</text>
  <path class="d-edge" d="M 254 72 L 446 72" marker-end="url(#q06-arrow)"/>
  <path class="d-edge-accent" d="M 254 162 L 446 162" marker-end="url(#q06-arrow)"/>
  <path class="d-edge-accent" d="M 254 252 L 446 252" marker-end="url(#q06-arrow)"/>
  <rect class="d-box-muted" x="452" y="44" width="220" height="56" rx="10"/>
  <text class="d-text" x="562" y="68" text-anchor="middle">index chunk</text>
  <text class="d-sub" x="562" y="88" text-anchor="middle">loaded on every page</text>
  <rect class="d-box-accent" x="452" y="134" width="220" height="56" rx="10"/>
  <text class="d-text d-accent" x="562" y="158" text-anchor="middle">UsersPage chunk</text>
  <text class="d-sub" x="562" y="178" text-anchor="middle">loaded on first visit</text>
  <rect class="d-box-accent" x="452" y="224" width="220" height="56" rx="10"/>
  <text class="d-text d-accent" x="562" y="248" text-anchor="middle">CartPage chunk</text>
  <text class="d-sub" x="562" y="268" text-anchor="middle">loaded on first visit</text>
</svg>

The bundler does not know or care about folders; it follows imports. Colocation simply makes the import graph match the feature boundaries, so the right thing happens by default. Then one change: <code>CartPage.vue</code> was edited to also import the users store. Rebuilt:

\`\`\`
dist/assets/users.store-DTFtmlr8.js    0.45 kB │ gzip:  0.29 kB
dist/assets/CartPage-PGKBnFFY.js       0.77 kB │ gzip:  0.42 kB
dist/assets/UsersPage-BTA5Tvsd.js      0.86 kB │ gzip:  0.45 kB
\`\`\`

Vite moved the store into its own shared chunk that both pages load. That is correct and harmless at this size, but it is also the signal colocation gives you for free: a feature reaching into another feature folder is visible in code review and in the build output. If it happens a lot, the store has outgrown its feature and should move to the shared folder, with a name that says so.

## 4. Store Lifetime: Created on Demand, Kept Until Disposed

Colocated does not mean scoped. Once created, a store lives as long as its Pinia, even after the user leaves the feature. Verified with the users store, <code>getStores()</code> (new in Pinia 4.1) and a router hook that disposes it on leaving:

\`\`\`
at /       stores: [] state keys: []
at /users  stores: ["users-feature"] html: <h1>Users (2)</h1>
  disposed users-feature
back at /  stores: [] state keys: []
\`\`\`

📌 **Interview term: $dispose** — stops a store's effects and removes it from the Pinia, so the next <code>useStore()</code> builds a fresh one. It does not delete its saved state; the example also deletes <code>pinia.state.value[store.$id]</code>, otherwise the recreated store picks its old state back up. Verified for both store styles: after <code>n = 5</code> and <code>$dispose()</code> alone, a fresh <code>useStore()</code> still read <code>n = 5</code>; after also deleting the state entry it read <code>0</code>.

Pinia 4.1.0 added a warning for the classic mistake of disposing a reference you kept around after a newer instance was created (source: <a href="https://github.com/vuejs/pinia/releases" target="_blank" rel="noopener noreferrer">vuejs/pinia releases</a>, "Warn when disposing a replaced store"). Reproduced:

\`\`\`
[PINIA_R1008] "$dispose()" was called on an old instance of store "users-feature" that has already been replaced by a new one. This also removes the new store.
├▶ fix: Avoid keeping references to disposed stores. Call the useStore() function again to get the current store.
╰▶ see: https://pinia.vuejs.org/api/pinia/interfaces/StoreWithState.html#-dispose-
\`\`\`

Whether to dispose is a product decision. Keeping the store means instant back-navigation with the old list; disposing means fresh data and freed memory. Either way, decide it per feature rather than letting forty stores accumulate by accident.

## 5. Ids Are Global, Even When Files Are Not

📌 **Interview term: Store id** — the first argument of <code>defineStore</code>. It is the key in <code>pinia.state</code>, in devtools and in the SSR payload, and it must be unique per Pinia.

Colocation makes collisions more likely, because two teams each write a <code>list.store.js</code> with <code>defineStore("list", ...)</code>. Verified what happens, with no warning at all:

\`\`\`
same object: true | shop store products: undefined | keys: [ 'admins' ]
\`\`\`

The shop feature silently received the admin store. Prefix ids with the feature (<code>"users-feature"</code>, <code>"cart-feature"</code> in the examples) or use a path-like convention such as <code>"users/list"</code>.

## 6. When a Store Is the Wrong Tool

Some feature state should not outlive or escape a component subtree at all: a multi-step checkout, a wizard, an editor panel. If two of them can be on screen at once, a store with one id would make them share state. The runnable example colocates the state with the component tree instead, using [provide and inject](/interview-question/what-are-provide-and-inject) with a private <code>Symbol</code> key. Verified: clicking in Flow A changed only Flow A.

\`\`\`
initial      : Flow A: add item (0) | Flow A: pay (step 1) [disabled] | Flow B: add item (0) | Flow B: pay (step 1) [disabled]
A: add, pay  : Flow A: add item (1) | Flow A: pay (step 2) | Flow B: add item (0) | Flow B: pay (step 1) [disabled]
\`\`\`

| State | Best home | Lifetime |
| :--- | :--- | :--- |
| One component only | <code>ref</code> in the component | The component |
| One subtree, possibly several instances | provide/inject or a [composable](/interview-question/what-are-composables-in-vue) | The providing component |
| One feature, shared across its pages | Colocated Pinia store | Until disposed |
| Many features | Shared Pinia store in <code>stores/</code> | The app |
| Shareable, bookmarkable view state | The URL query | The URL |

For typing the injection key, see [type-safe provide/inject](/interview-question/how-do-you-make-provide-inject-type-safe). For how these layers fit together in a big app, see [structuring state for a large Vue app](/interview-question/how-would-you-structure-state-management-for-a-large-vue-app).

## 7. Tooling Notes

- **HMR.** Adding <code>if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot))</code> at the bottom of a store file lets Vite swap the store definition without a full reload. This was not exercised here, because it needs a running dev server and browser.
- **Nuxt.** <code>@pinia/nuxt</code> has its own conventions for where stores live and how they are auto-imported; check its documentation for the version you use rather than assuming the plain-Vite layout above.
- **Testing.** A colocated store is imported by relative path from its feature tests, so tests and code move together when the feature is renamed or deleted.

## 8. Common Pitfalls

- **Assuming a colocated store is automatically scoped.** It is still a global singleton per Pinia once created. Dispose it, reset it, or use subtree state.
- **Reusing generic ids** such as <code>"list"</code> or <code>"form"</code> across features. The second definition silently returns the first store.
- **Importing a feature store from the app shell.** One import from <code>App.vue</code> pulls the store into the entry chunk for every user.
- **Cross-feature imports everywhere.** A store used by three features is not a feature store; move it to <code>stores/</code> and name it accordingly.
- **Keeping disposed references.** After <code>$dispose()</code>, call <code>useStore()</code> again; Pinia 4.1 now warns (<code>PINIA_R1008</code>) when an old reference is disposed.
- **Destructuring the store in the page.** Colocation does not change reactivity rules; use [storeToRefs](/interview-question/why-use-storetorefs-with-pinia).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What colocation means:</strong> <span style="color:#f0e2c8;">"A feature store lives in the feature folder next to the pages that use it, imported by relative path; only app-wide stores like the session stay in a shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stores/</code> folder."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bundle payoff:</strong> <span style="color:#f0e2c8;">"With lazy routes the bundler follows imports, so a store used by one route ships in that route chunk; I verified that in a Vite build, and a cross-feature import immediately produced a shared chunk."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lifetime:</strong> <span style="color:#f0e2c8;">"Stores are created on the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useStore()</code> call and then live until disposed, so for feature-scoped data I either keep it on purpose or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$dispose()</code> and clear its state when leaving the feature."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Identity:</strong> <span style="color:#f0e2c8;">"Store ids are global per Pinia, so I prefix them by feature; two stores with the same id silently share one instance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Right tool:</strong> <span style="color:#f0e2c8;">"If the state belongs to a component subtree that can appear twice, like a wizard, I colocate it with provide/inject or a composable instead of a store."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does colocating a store make it scoped to the route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Colocation changes where the code lives and which chunk ships it, not the lifetime. Once created the store is a singleton for that Pinia until you dispose it, even after the user leaves the route.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you decide when a store should move to the shared folder?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a second or third feature imports it. The build shows it as a shared chunk and code review shows a cross-feature import. At that point it is app state, so it moves and gets a neutral name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when two stores share an id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useStore()</code> returns the first store, with no warning. In my test the shop store came back with the admin state and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">products</code> was undefined. Prefix ids by feature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reset a feature store when leaving its routes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a router <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">afterEach</code> or the page <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onBeforeRouteLeave</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">store.$dispose()</code> and delete <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pinia.state.value[store.$id]</code>, or call a reset action if you want to keep the instance. Pinia 4.1 warns with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PINIA_R1008</code> if you dispose a stale reference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What did Pinia 4.1 add that helps here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getStores()</code> lists the stores that currently exist, handy for checking that feature stores are created lazily and actually go away, and a diagnostic when you dispose an already replaced store.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Colocation** | Keeping a store in the feature folder of the code that uses it |
| **Feature store** | Store owned by one area of the app |
| **App store** | Store many areas need, kept in a shared folder |
| **Lazy store creation** | A store is created on its first <code>useStore()</code> call, not on import |
| **Shared chunk** | Bundle file the build creates for code two lazy routes both import |
| **Store id** | Unique key of a store in its Pinia, devtools and SSR payload |
| **$dispose** | Removes a store from its Pinia so the next call builds a fresh one |
| **getStores()** | Pinia 4.1 helper listing the stores that currently exist |

---
**Conclusion:** Colocating Pinia stores means a feature store lives in the feature folder and is imported only by that feature, while genuinely shared stores stay in one common place. The verified build shows the practical win: each colocated store landed in its lazy route chunk, and a cross-feature import showed up immediately as a shared chunk. Colocation does not change lifetime or identity, though: a store lives until disposed, its id is global (a duplicate id silently returned the wrong store), and state for a repeatable subtree is better colocated with provide/inject than in a store. Name ids by feature, decide per feature whether to dispose on leave, and let the folder structure match the import graph.`,
    examples: [
      {
        label: "Feature-scoped state with provide/inject: two flows, two independent states",
        tech: "vue",
        runnable: true,
        code: `<script setup>
// Colocating state with a component subtree instead of a global store:
// each <CheckoutFlow> owns its own state, and only its descendants see it.
// A Pinia store with one id would be shared by both flows instead.
import { defineComponent, h, provide, inject, reactive, computed } from "vue";

const FLOW = Symbol("checkout-flow"); // private key: lives next to the feature

function createFlowState(name) {
  const state = reactive({ name, step: 1, items: 0 });
  const canPay = computed(() => state.items > 0);
  return { state, canPay, addItem: () => state.items++, next: () => state.step++ };
}

const CartStep = defineComponent({
  setup() {
    const flow = inject(FLOW);
    return () => h("button", { onClick: flow.addItem }, \`\${flow.state.name}: add item (\${flow.state.items})\`);
  },
});

const PayStep = defineComponent({
  setup() {
    const flow = inject(FLOW);
    return () =>
      h("button", { disabled: !flow.canPay.value, onClick: flow.next }, \`\${flow.state.name}: pay (step \${flow.state.step})\`);
  },
});

const CheckoutFlow = defineComponent({
  props: { name: String },
  setup(props) {
    provide(FLOW, createFlowState(props.name)); // one state per flow instance
    return () => h("section", [h(CartStep), h(PayStep)]);
  },
});
</script>

<template>
  <CheckoutFlow name="Flow A" />
  <CheckoutFlow name="Flow B" />
</template>`,
      },
      {
        label: "A colocated feature store: features/users/users.store.js",
        tech: "js",
        runnable: false,
        code: `import { defineStore } from "pinia";
import { ref, computed } from "vue";
export const useUsersStore = defineStore("users-feature", () => {
  const list = ref([]);
  const count = computed(() => list.value.length);
  async function load() { list.value = [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }]; }
  return { list, count, load };
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you structure state management for a large Vue app?",
    seoDescription:
      "Structuring state in a large Vue app: local, subtree, URL, server-cache and Pinia store layers, store boundaries and composition, SSR safety and pitfalls.",
    description: `**Question presented to candidate:**
"You are joining a team with a 300-component Vue app. Everything lives in a handful of giant Pinia stores, half the bugs are stale data, and SSR is coming next quarter. How would you structure state management going forward?"

**What a strong answer should cover:**
- **Classify state first**: local UI state, subtree state, URL state, server state (cached copies of backend data), and true global client state. Each has a different best home.
- Keep state as **local as possible**: component \`ref\`s, composables, provide/inject for a subtree; the URL query for shareable view state.
- Treat **server state** separately: a query cache (Pinia Colada, TanStack Vue Query or a small in-house layer) handles dedupe, caching, invalidation and loading/error state better than hand-written store actions.
- **Pinia for global client state**, split into small domain stores by feature, colocated with the feature; stores may use other stores inside actions/getters, with no cycles at setup time.
- **SSR safety**: no module-level mutable singletons; one Pinia (and one cache) per request; serialise state for hydration.
- Conventions that scale: store ids by feature, actions as the only writers for shared stores, \`storeToRefs\` for destructuring, tests per store.

**Clarifying questions expected:**
- "How much of the state is server data versus purely client-side?"
- "Which rendering mode is coming: SSR with hydration, or static generation?"
- "Do several tabs or users need to see the same data live?"

**Code / implementation expected:** Optional — a domain store depending on an app store, and a sketch of the layer diagram.`,
    answer: `**Target Audience:** Mid-level and senior Vue developers preparing for a design-style interview — assumes you know [Pinia](/interview-question/what-is-pinia-and-why-use-it) and [composables](/interview-question/what-are-composables-in-vue).
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The verified outputs come from Vue 3.5.44 and pinia 4.1.0: server renders with <code>renderToString</code> in Node, a Vitest run of the example stores, and the runnable query-cache example through the repo verifier in jsdom, against a fake API (a local promise, no network). The architecture itself is a design recommendation, not something a test can prove.

## 1. Why This Even Matters — A Story First

Imagine a city that stores everything in one central warehouse: the mayor's documents, the bakery's flour, your house keys and today's weather forecast. Every request goes through the same loading dock. Things get misplaced, the flour is from last week, and when a second city opens next door it accidentally shares the warehouse.

A real city keeps your keys in your pocket, the flour in the bakery, documents at city hall, and the weather forecast is simply fetched fresh from the weather service whenever someone asks, with everyone on the street sharing the same reading.

A large Vue app with a few giant stores is the warehouse city. Good structure starts by asking **what kind of state** each piece is, because each kind has a natural home. Most of the "stale data" bugs in the question come from treating server data (the forecast) as if it were app-owned state (city documents).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How much of the state is server data versus client-only? | If most of it is server data, a query cache does more work than any store design |
| Is SSR or static generation planned? | Rules out module-level singletons; requires per-request stores and hydration |
| How many teams work on the app? | Drives feature boundaries, store ownership and id conventions |
| Must data stay live across tabs or users? | Adds websockets or polling and invalidation, not just caching |
| What must survive a reload? | Decides what goes in the URL, in local storage, or nowhere |
| Are there offline or optimistic-update needs? | Changes how mutations and rollbacks are modelled |

## 3. The Core Idea: Classify, Then Place

📌 **Interview term: Local state** — state one component owns: an input draft, an open flag, a hover index. A <code>ref</code> in that component, nothing more.

📌 **Interview term: Subtree state** — state shared by one part of the tree that might appear more than once, such as a wizard or an editor panel. Provide it from the root of that subtree with [provide/inject](/interview-question/what-are-provide-and-inject), usually built by a composable.

📌 **Interview term: URL state** — view state that should be shareable and survive reload: filters, sort, page, selected tab. Keep it in the route query and read it from [the route](/interview-question/how-do-dynamic-routes-and-route-params-work-in-vue-router).

📌 **Interview term: Server state** — a cached copy of data the backend owns. It can go stale, needs loading and error states, deduplication, refetching and invalidation. A **query cache** library handles this: Pinia Colada (<code>@pinia/colada</code> 1.4.8 on npm, by the Pinia author) or TanStack Vue Query (<code>@tanstack/vue-query</code> 5.104.3). Vue Router 5 also ships experimental data loaders, including one for Pinia Colada, under <code>vue-router/experimental</code>.

📌 **Interview term: Global client state** — state the app itself owns and many features need: the signed-in session, feature flags, a cart before checkout, user preferences. This is what Pinia stores are for.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Five state layers from most local to most global: component refs, subtree provide and inject, URL query, server cache, and Pinia stores split by domain">
  <rect class="d-box" x="40" y="20" width="640" height="46" rx="10"/>
  <text class="d-text" x="200" y="49" text-anchor="middle">Local: ref in a component</text>
  <text class="d-sub" x="520" y="49" text-anchor="middle">drafts, open flags</text>
  <rect class="d-box" x="40" y="80" width="640" height="46" rx="10"/>
  <text class="d-text" x="200" y="109" text-anchor="middle">Subtree: provide and inject</text>
  <text class="d-sub" x="520" y="109" text-anchor="middle">wizard, editor panel</text>
  <rect class="d-box" x="40" y="140" width="640" height="46" rx="10"/>
  <text class="d-text" x="200" y="169" text-anchor="middle">URL: route query</text>
  <text class="d-sub" x="520" y="169" text-anchor="middle">filters, page, tab</text>
  <rect class="d-box-accent" x="40" y="200" width="640" height="46" rx="10"/>
  <text class="d-text d-accent" x="200" y="229" text-anchor="middle">Server state: query cache</text>
  <text class="d-sub" x="520" y="229" text-anchor="middle">lists, details, search results</text>
  <rect class="d-box-accent" x="40" y="260" width="640" height="46" rx="10"/>
  <text class="d-text d-accent" x="200" y="289" text-anchor="middle">Global client: Pinia stores</text>
  <text class="d-sub" x="520" y="289" text-anchor="middle">session, flags, cart, prefs</text>
</svg>

Read it top to bottom: every piece of state should live in the highest row that works. Moving state down the list costs coupling and lifetime; the giant-store app in the question put everything in the bottom row.

## 4. Verified: Server State Wants a Cache, Not a Store Action

The runnable example is a deliberately tiny query cache: a <code>Map</code> from key to <code>{ data, error, loading }</code> refs, so every component asking for <code>"user/1"</code> shares one request. Three components on the page, then an invalidation:

\`\`\`
[app] RENDERED: Header: loading...Sidebar: loading...Profile page: loading...Invalidate and refetchnetwork calls so far: 0
after load : Header: user/1 (response #1)Sidebar: user/1 (response #1)Profile page: user/1 (response #1)Invalidate and refetchnetwork calls so far: 1
after refetch: Header: user/1 (response #2)Sidebar: user/1 (response #2)Profile page: user/1 (response #2)Invalidate and refetchnetwork calls so far: 2
\`\`\`

Three consumers, one network call; one invalidation, every consumer updated. Now picture the giant-store version: a <code>fetchUser</code> action called from three components fires three requests, and each place that edits the user must remember to refresh the others. That is where stale-data bugs come from. Real libraries add what this demo skips: stale times, background refetch, retries, garbage collection, request cancellation (see [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation)) and SSR integration. Note the demo cache is a module-level <code>Map</code>, which is exactly what section 6 warns about for SSR; the libraries create their cache per app.

## 5. Designing the Pinia Layer

What is left for stores after the layers above is usually small. Split it by **domain**, not by technical type:

- **App stores** in <code>src/stores/</code>: <code>auth</code>, <code>preferences</code>, <code>featureFlags</code>.
- **Domain stores** colocated with their feature: <code>features/cart/cart.store.ts</code>, as in [store colocation](/interview-question/pinia-colocation-in-2025-how-do-you-colocate-stores-with-routes-components).
- **Setup stores** by default, because they compose with ordinary composables and infer types.
- **Actions are the only writers** of shared stores. Components call <code>cart.add()</code> rather than pushing into <code>cart.lines</code>, which keeps invariants in one place and makes <code>$onAction</code> logging meaningful.

📌 **Interview term: Store composition** — a store using another store by calling its hook inside the setup function, a getter or an action. The examples-tab <code>cart</code> store reads <code>auth.isPro</code> for a discount and listens for <code>signOut</code> to clear itself. Under Vitest:

\`\`\`
guest  : {"subtotal":100,"discount":0,"total":100}
pro    : {"subtotal":100,"discount":10,"total":90}
signOut: {"lines":0,"total":0}
\`\`\`

The cross-store rule (signing out empties the cart) lives in the cart store, not scattered across the logout button, the header and the account page.

📌 **Interview term: Circular store dependency** — store A reads store B during setup while B reads A. Pinia does not throw; it hands back a half-built store. Verified with two setup stores that each read the other at setup time:

\`\`\`
circular: no error, a.x = NaN b.y = NaN
\`\`\`

No error, just <code>NaN</code> in production data. Keep dependencies one-directional (domain stores may depend on app stores, never the reverse), and if two stores truly need each other, read the other one inside a getter or action, not at setup time.

## 6. SSR Changes the Rules

On the server one Node process renders many users. Anything mutable at module level is shared between them. Verified with two back-to-back renders, where request A signs Ada in and request B is anonymous:

\`\`\`
request A (ada logs in): <p>pinia: ada | module singleton: ada</p>
request B (anonymous)  : <p>pinia: null | module singleton: ada</p>
\`\`\`

The module-level <code>reactive()</code> leaked Ada into request B. The Pinia store did not, because each request called <code>createPinia()</code>. The architectural rules that follow:

- **No mutable state at module level**, including caches. Create stores, query clients and caches per app instance.
- **Serialise and hydrate**: send <code>pinia.state.value</code> (and the query cache, if your library supports it) with the HTML, restore it before mounting, as in the [Pinia SSR flow](/interview-question/what-is-pinia-and-why-use-it).
- **Stores must not touch <code>window</code> at setup time**; guard browser-only work behind <code>onMounted</code> or a client check. See [SSR and hydration](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration).

## 7. A Migration Plan for the App in the Question

1. **Inventory**: tag every field in the giant stores as local, subtree, URL, server or global.
2. **Introduce a query cache** for the server data first; it removes the most code and fixes the stale-data bugs.
3. **Move view state to the URL** (filters, pagination) so it survives reloads and can be shared.
4. **Push local state back into components** and composables.
5. **Split what is left** into small domain stores with feature-prefixed ids, colocated with features.
6. **Make SSR-safe**: remove module singletons, one Pinia and one cache per request, and add store tests with a fresh <code>createPinia()</code> each (see [testing Vue components](/interview-question/how-do-you-test-vue-components-vitest-and-vue-test-utils)).

## 8. Comparison

| Option | Good for | Watch out for |
| :--- | :--- | :--- |
| Component <code>ref</code> | Local UI state | Prop drilling once it spreads |
| Composable | Reusable logic, per-call state | A module-level ref inside it becomes a hidden singleton |
| provide/inject | Subtree state, several instances | Harder to trace; type the key |
| URL query | Shareable, reload-safe view state | Strings only; validate and parse |
| Query cache | Server data: caching, dedupe, invalidation | Another dependency; learn its cache rules |
| Pinia store | Global client state, cross-feature rules | Turning it into a dump for everything |
| Module-level <code>reactive()</code> | Tiny client-only apps | Leaks across requests under SSR (verified) |

Other ecosystems split state the same way; compare [Angular state management libraries](/interview-question/what-are-the-differences-between-state-management-libraries-in-angular) and [React Context](/interview-question/what-is-the-context-api-in-react-and-when-would-you-use-it).

## 9. Common Pitfalls

- **Treating server data as store state.** Hand-written fetch actions duplicate requests and go stale; a query cache with invalidation fixes the class of bugs.
- **One store per data type for the whole app** (<code>usersStore</code>, <code>ordersStore</code> holding every list ever loaded). Stores grow forever and every page depends on every other.
- **Circular store reads at setup time.** Verified above: silent <code>NaN</code>, no error.
- **Module-level mutable state with SSR.** Verified above: one user's data in another user's page.
- **Components mutating shared store state directly.** Invariants spread across the app; route writes through actions.
- **Duplicating URL state in a store.** Two sources of truth for the same filter drift apart; derive from the route instead.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify:</strong> <span style="color:#f0e2c8;">"First I ask how much of the state is server data and whether SSR is coming, because those two answers change the design more than any library choice."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Classify:</strong> <span style="color:#f0e2c8;">"I sort state into local, subtree, URL, server and global client state, and keep each piece in the most local layer that works: refs, provide/inject, the route query, a query cache, and only then Pinia."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Server state:</strong> <span style="color:#f0e2c8;">"Backend data goes in a query cache such as Pinia Colada or TanStack Vue Query, which dedupes requests and handles invalidation; that alone fixes most stale-data bugs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pinia layer:</strong> <span style="color:#f0e2c8;">"What remains goes into small setup stores split by domain and colocated with features, with feature-prefixed ids, actions as the only writers, and one-directional dependencies between stores."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. SSR safety:</strong> <span style="color:#f0e2c8;">"No mutable module-level state, one Pinia and one cache per request, and state serialised for hydration; I have seen a module singleton leak one user into another user's render."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just put everything in Pinia?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because stores live for the whole app and are shared by everything. Local and subtree state then leaks between instances, server data gets duplicated and goes stale, and every page ends up depending on a few giant stores that nobody can safely change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do stores depend on each other safely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call the other store hook inside the setup function, a getter or an action, and keep the graph one-directional: domain stores may use app stores, not the reverse. Two stores reading each other at setup time gave half-built stores and silent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> in my test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do filters and pagination live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the route query. They become shareable, survive reloads and the back button, and components derive from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.query</code> instead of keeping a second copy in a store that can drift.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a query cache give you over a store action?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One request per key no matter how many components ask, cached results with a stale time, background refetch, invalidation after mutations, and loading and error state per query. A store action gives you none of that unless you rebuild it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this architecture?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stores in isolation with a fresh <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createPinia()</code> per test, components with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createTestingPinia</code> or a real Pinia plus a mocked API layer, and a few end-to-end flows. Note that Pinia plugins only run after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use(pinia)</code>, so plugin behaviour needs an app in the test.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Local state** | Owned by one component, lives in a <code>ref</code> |
| **Subtree state** | Shared by one part of the tree, provided from its root |
| **URL state** | View state kept in the route query, shareable and reload-safe |
| **Server state** | Cached copy of backend data that can go stale |
| **Query cache** | Library layer that dedupes, caches and invalidates server state |
| **Global client state** | App-owned state many features need, in Pinia |
| **Domain store** | A store scoped to one business area, colocated with its feature |
| **Store composition** | One store using another inside setup, getters or actions |
| **Circular store dependency** | Two stores reading each other at setup time, which yields half-built stores |

---
**Conclusion:** Structuring state in a large Vue app starts with classification, not with a library: local state stays in components, subtree state uses provide/inject, shareable view state goes in the URL, server data goes in a query cache, and only the remaining global client state goes into Pinia, split into small domain stores colocated with their features. The verified runs show why each rule exists: a shared cache turned three requests into one, a cross-store rule stayed in one store, circular setup reads failed silently with <code>NaN</code>, and a module-level singleton leaked one user's data into another request under SSR. A strong answer asks about server data and SSR first, then walks through the layers and a migration plan.`,
    examples: [
      {
        label: "Server state vs client state: a tiny shared query cache (fake API)",
        tech: "vue",
        runnable: true,
        code: `<script setup>
// Server state is not client state. This tiny query cache (what libraries
// such as Pinia Colada or TanStack Query do properly) shares one request
// between every component that asks for the same key. The API is FAKE:
// a local promise with a delay, so the demo needs no network.
import { shallowRef, ref, defineComponent, h } from "vue";

let networkCalls = 0;
const fakeApi = (key) =>
  new Promise((resolve) => {
    networkCalls++;
    setTimeout(() => resolve({ key, fetchedAt: networkCalls }), 100);
  });

const cache = new Map(); // key -> { data, error, loading, promise }
function useQuery(key) {
  if (!cache.has(key)) {
    const entry = { data: shallowRef(null), error: shallowRef(null), loading: ref(true), promise: null };
    entry.promise = fakeApi(key)
      .then((d) => (entry.data.value = d))
      .catch((e) => (entry.error.value = e))
      .finally(() => (entry.loading.value = false));
    cache.set(key, entry);
  }
  return cache.get(key); // same refs for every caller
}
function invalidate(key) {
  cache.delete(key);
}

const UserBadge = defineComponent({
  props: { where: String },
  setup(props) {
    const { data, loading } = useQuery("user/1");
    return () => h("p", \`\${props.where}: \${loading.value ? "loading..." : \`user/1 (response #\${data.value.fetchedAt})\`}\`);
  },
});

const show = ref(true);
const calls = ref(0);
const refresh = () => setTimeout(() => (calls.value = networkCalls), 150);
refresh();
function refetch() {
  invalidate("user/1");
  show.value = false;
  setTimeout(() => { show.value = true; refresh(); });
}
</script>

<template>
  <template v-if="show">
    <UserBadge where="Header" />
    <UserBadge where="Sidebar" />
    <UserBadge where="Profile page" />
  </template>
  <button @click="refetch">Invalidate and refetch</button>
  <p>network calls so far: {{ calls }}</p>
</template>`,
      },
      {
        label: "An app store and a domain store that depends on it",
        tech: "ts",
        runnable: false,
        code: `// stores/auth.ts: a small, app-wide store (who is signed in)
import { defineStore, acceptHMRUpdate } from "pinia";
import { ref, computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<{ id: number; name: string; plan: "free" | "pro" } | null>(null);
  const isPro = computed(() => user.value?.plan === "pro");
  function signIn(u: NonNullable<typeof user.value>) { user.value = u; }
  function signOut() { user.value = null; }
  return { user, isPro, signIn, signOut };
});

// features/cart/cart.store.ts: a domain store that DEPENDS on auth.
// Call the other store inside the setup function, never at module top level.
export const useCartStore = defineStore("cart", () => {
  const auth = useAuthStore();
  const lines = ref<{ sku: string; qty: number; price: number }[]>([]);
  const subtotal = computed(() => lines.value.reduce((s, l) => s + l.qty * l.price, 0));
  const discount = computed(() => (auth.isPro ? Math.round(subtotal.value * 0.1) : 0));
  const total = computed(() => subtotal.value - discount.value);

  function add(sku: string, price: number) {
    const line = lines.value.find((l) => l.sku === sku);
    line ? line.qty++ : lines.value.push({ sku, qty: 1, price });
  }
  // Cross-store reaction kept in ONE place instead of in random components
  auth.$onAction(({ name, after }) => {
    if (name === "signOut") after(() => (lines.value = []));
  });
  return { lines, subtotal, discount, total, add };
});

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useCartStore, import.meta.hot));`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you fetch data in a Vue component (loading, errors, cancellation)?",
    seoDescription:
      "Fetching data in Vue: loading and error state, onWatcherCleanup with AbortController to cancel stale requests, res.ok checks, and a useFetch composable.",
    description: `**Question presented to candidate:**
"A product page loads the product for the id in the URL. Users click quickly between products and sometimes see the wrong one, and a 404 shows an empty page with no message. Show how you would fetch data in a Vue component, with loading and error states and proper cancellation."

**What a strong answer should cover:**
- Three pieces of state: \`data\`, \`loading\`, \`error\`, rendered with \`v-if\` / \`v-else-if\` so every state has a UI.
- Start fetching in \`setup\` (or a \`watch\` with \`immediate: true\` on the input), not only in \`onMounted\`, and re-fetch when the input (route param, prop) changes.
- **Race conditions**: an older, slower response can arrive last and overwrite the newer one. Cancel it with an \`AbortController\` registered via \`onWatcherCleanup\` (Vue 3.5+) or the watcher's \`onCleanup\` argument; ignore \`AbortError\`.
- \`fetch\` only rejects on network failure: check \`res.ok\` and throw for 4xx/5xx yourself.
- Extract a **composable** (\`useFetch\`) or use a data-fetching library for caching and dedupe; mention Suspense/async setup and SSR (Nuxt \`useFetch\`) as alternatives.

**Clarifying questions expected:**
- "Should switching products keep showing the old one while the new one loads, or show a spinner?"
- "Is this page server-rendered?"

**Code / implementation expected:** Yes — a component (or composable) with loading/error state and an aborted stale request.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who knows [watch and watchEffect](/interview-question/what-is-the-difference-between-watch-and-watcheffect) and basic <code>fetch</code> — no data-fetching library required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All output was produced on Vue 3.5.44. **No real network was used**: the runnable component fakes its API with a local promise and a timer, and the <code>useFetch</code> composable was run against a small HTTP server on localhost, so status codes and aborts are real HTTP but nothing left the machine.

## 1. Why This Even Matters — A Story First

You ring three restaurants for a table, one after the other, because the first two were slow to answer. The third says yes. Then the first one calls back: "Table for 8 pm, confirmed!" If you just believe whoever spoke last, you end up at the wrong restaurant.

The polite fix is to cancel the first two calls once you ring the third. And if a restaurant says "we are closed", that is an answer, not a dropped line, so you should not wait at the door expecting dinner.

That is data fetching in a component. The user changes the product id, a new request starts, and an older, slower request may still come back later. A **loading** state tells the user you are on the phone, an **error** state covers "we are closed", and **cancellation** hangs up on the calls you no longer care about.

## 2. The Core Idea

📌 **Interview term: Request state** — the three values every fetch needs on screen: <code>data</code>, <code>loading</code> and <code>error</code>. Render them with <code>v-if</code> / <code>v-else-if</code> so no state is blank. See [v-if vs v-show](/interview-question/what-is-the-difference-between-v-if-and-v-show).

📌 **Interview term: Fetch on input change** — the request depends on something reactive (a prop, a [route param](/interview-question/how-do-dynamic-routes-and-route-params-work-in-vue-router)), so start it with <code>watch(input, load, { immediate: true })</code>. Fetching only in <code>onMounted</code> loads once and misses later changes.

📌 **Interview term: Race condition** — two requests in flight for different inputs, where the older one finishes last and overwrites the newer result. Verified against a local server where request 2 takes 200 ms and request 3 takes 50 ms, with a naive watcher that just assigns whatever comes back:

\`\`\`
naive   : asked for 3, showing {"id":2}
\`\`\`

The user asked for 3 and is looking at 2.

📌 **Interview term: AbortController** — the browser (and Node) API that cancels a <code>fetch</code>: pass <code>controller.signal</code> to <code>fetch</code>, call <code>controller.abort()</code>, and the pending promise rejects with an <code>AbortError</code>. See [aborting a fetch with AbortController](/interview-question/how-do-you-abort-a-fetch-api-request-using-abortcontroller).

📌 **Interview term: onWatcherCleanup** — registers a function that Vue runs right before the same watcher runs again, or when it is stopped (for example when the component unmounts). It arrived in Vue 3.5 (3.5.0 was published to npm on 3 September 2024; the API is absent from the 3.4.38 typings and present in 3.5.44). Older code uses the third <code>onCleanup</code> argument of the watch callback, which does the same.

Put together, the core pattern (the same code as the verified <code>useFetch</code> composable in section 4, inlined) is:

\`\`\`js
watch(userId, async (id) => {
  const controller = new AbortController();
  onWatcherCleanup(() => controller.abort()); // a newer id or unmount cancels this one
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(\`/api/users/\${id}\`, { signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    data.value = await res.json();
  } catch (e) {
    if (e.name === "AbortError") return; // superseded, not a failure
    error.value = e;
  }
  loading.value = false;
}, { immediate: true });
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="When the id changes from 2 to 3 the watcher cleanup aborts request 2, so only the response for 3 updates the page">
  <defs>
    <marker id="q08-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="30">time</text>
  <path class="d-edge" d="M 70 26 L 690 26" marker-end="url(#q08-arrow)"/>
  <rect class="d-box-muted" x="40" y="60" width="300" height="50" rx="10"/>
  <text class="d-text" x="190" y="84" text-anchor="middle">id 2: fetch started</text>
  <text class="d-sub" x="190" y="102" text-anchor="middle">aborted by cleanup</text>
  <rect class="d-box-accent" x="200" y="150" width="300" height="50" rx="10"/>
  <text class="d-text d-accent" x="350" y="174" text-anchor="middle">id 3: fetch started</text>
  <text class="d-sub" x="350" y="192" text-anchor="middle">completes normally</text>
  <path class="d-edge-dashed" d="M 200 175 L 200 114" marker-end="url(#q08-arrow)"/>
  <path class="d-edge-accent" d="M 504 175 L 556 175" marker-end="url(#q08-arrow)"/>
  <rect class="d-box" x="562" y="150" width="140" height="50" rx="10"/>
  <text class="d-text" x="632" y="180" text-anchor="middle">shows 3</text>
</svg>

The dashed arrow is the cleanup: the moment the watcher re-runs for id 3, Vue first calls the cleanup registered by the id 2 run, which aborts request 2. Request 2 can no longer arrive late.

## 3. Verified: the Runnable Component

The runnable example uses a **fake** API: <code>fakeFetchUser</code> answers after 300 ms, fails the first request for user 3 with <code>HTTP 503</code>, and honours an <code>AbortSignal</code> exactly like <code>fetch</code>. A driver script clicked through it in jsdom:

\`\`\`
[app] RENDERED: Prev user #1NextLoading...log:
after 350ms : Prev user #1NextAda Lovelacelog: loaded 1
2 fast clicks: Prev user #3NextLoading...log: loaded 1, aborted 2
after 350ms : Prev user #3NextHTTP 503: try again Retrylog: loaded 1, aborted 2, failed 3
retry click : Prev user #3NextLoading...log: loaded 1, aborted 2, failed 3
after 350ms : Prev user #3NextAlan Turinglog: loaded 1, aborted 2, failed 3, loaded 3
\`\`\`

Read the log column: clicking Next twice quickly aborted request 2 before it finished, request 3 failed and showed the message with a Retry button, and Retry succeeded. Two details in the code are deliberate:

- **The aborted branch returns early without touching <code>loading</code>**, because a newer request now owns the flag. Setting it to <code>false</code> there would hide the spinner while request 3 is still running.
- **Retry bumps an <code>attempt</code> counter** that the watcher also watches. An earlier version set the id to 0 and back in the same tick; the watcher compared old and new values at flush time, saw <code>3</code> both times, and never re-ran. Verified in isolation: after that "retry" click the page said <code>watcher runs: 0</code>. It is a nice example of how watchers batch synchronous changes.

## 4. Verified: <code>useFetch</code> Against Real HTTP

The examples-tab composable wraps the same pattern for reuse. It takes a URL getter (via <code>toValue</code>, so a ref, a getter or a string all work) and returns <code>{ data, error, loading }</code>. Run in Node 22 with its built-in <code>fetch</code> against a localhost server on port 5240:

\`\`\`
naive   : asked for 3, showing {"id":2}
  server: request for 2 closed by client
useFetch: asked for 3, showing {"id":3} loading false
useFetch: 404 -> data null error HTTP 404
  server: request for 2 closed by client
after scope.stop(): data still null loading true
\`\`\`

- **The abort is real**: the server saw the client close request 2.
- **<code>fetch</code> does not reject on 404.** The composable got a normal response with <code>res.ok === false</code> and threw its own <code>HTTP 404</code>; without that check, <code>res.json()</code> would have parsed the error body as if it were data.
- **Stopping the scope aborts too.** <code>scope.stop()</code> stands in for a component unmounting: the in-flight request was cancelled, and <code>loading</code> stayed <code>true</code> because the aborted run returns early. Nobody renders a stopped scope, so that is harmless, but do not read state from a dead component.

📌 **Interview term: Composable** — a function that uses Vue reactivity and lifecycle APIs and returns reactive state, so logic like this is written once and reused. See [composables in Vue](/interview-question/what-are-composables-in-vue) and, for <code>effectScope</code>, [why composables use effectScope](/interview-question/what-is-effectscope-and-why-do-composables-use-it-for-cleanup).

## 5. Choosing an Approach

| Approach | Good for | Limits |
| :--- | :--- | :--- |
| Inline <code>watch</code> + <code>AbortController</code> | One page, one request | Repeated boilerplate |
| Your own <code>useFetch</code> composable | Consistent loading, error and abort handling | No cache, no dedupe between components |
| Query library (Pinia Colada, TanStack Vue Query) | Server state shared across pages: caching, dedupe, invalidation | Another dependency and cache rules to learn |
| Async setup + <code>&lt;Suspense&gt;</code> | Parent-controlled loading boundaries | Initial load only by default; see [async setup](/interview-question/what-is-async-setup-and-top-level-await) and [Suspense](/interview-question/what-is-suspense-in-vue) |
| Nuxt <code>useFetch</code> / <code>useAsyncData</code> | SSR with payload transfer | Nuxt only; see [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue) |

Why caching matters at app scale is covered in [structuring state for a large Vue app](/interview-question/how-would-you-structure-state-management-for-a-large-vue-app). React has the same problem with the same fix, compared in [fetching data in React](/interview-question/how-do-you-fetch-data-in-react).

## 6. A Note on SSR

On the server, <code>setup</code> and <code>immediate</code> watchers run but <code>onMounted</code> does not, and the renderer does not wait for a watcher's promise. Verified with two components fetching from the same fake 20 ms API inside <code>renderToString</code>:

\`\`\`
<!--[--><p>watch only: null</p><p>onServerPrefetch: Ada</p><!--]-->
\`\`\`

The watcher started its request, but the HTML was produced before it resolved. <code>onServerPrefetch</code> (or async setup under <code>&lt;Suspense&gt;</code>) is awaited by the server renderer. Frameworks such as Nuxt wrap this and also transfer the result to the client so it is not fetched twice.

## 7. Common Pitfalls

- **No cancellation.** Stale responses win races (verified above). Abort in the watcher cleanup, or at minimum ignore results whose input is no longer current.
- **Calling <code>onWatcherCleanup</code> after an <code>await</code>.** It must be registered synchronously. Verified: calling it after <code>await null</code> printed <code>[Vue warn] onWatcherCleanup() was called when there was no active watcher to associate with.</code> and the cleanup was never attached.
- **Trusting <code>fetch</code> to reject on HTTP errors.** It only rejects on network failure or abort. Check <code>res.ok</code>.
- **Treating <code>AbortError</code> as a user-facing error.** It means "superseded"; return quietly.
- **Resetting <code>loading</code> in the aborted branch.** The newer request owns it.
- **Fetching only in <code>onMounted</code>.** It misses input changes and does not run on the server.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State:</strong> <span style="color:#f0e2c8;">"I keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">error</code> refs and render each one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-else-if</code>, so the user always sees a spinner, a message with retry, or the content."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When to fetch:</strong> <span style="color:#f0e2c8;">"I start the request from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> on its input with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">immediate: true</code>, so it runs on setup and again whenever the route param or prop changes, not just once in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cancellation:</strong> <span style="color:#f0e2c8;">"Inside the watcher I create an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> and register <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">controller.abort()</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code>, so a newer input or unmounting cancels the old request and a slow response can never overwrite a fresh one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Errors:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> only rejects on network failure, so I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">res.ok</code> and throw for 4xx and 5xx, and I ignore <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortError</code> because it means superseded, not failed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">"I wrap it in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code> composable, and when several components share server data I use a query cache like Pinia Colada or TanStack Vue Query for dedupe and invalidation."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the race condition exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two requests in flight for different inputs, where the older one is slower and resolves last. Without cancellation its result is assigned after the newer one. I reproduced it against a local server: the page asked for 3 and showed 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">onWatcherCleanup or the onCleanup argument?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same behaviour; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> is the Vue 3.5 import that also works inside composables called from the watcher. Either way it must be registered before the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>; after it Vue warns that there is no active watcher.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not set loading to false when a request is aborted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the abort happens precisely when a newer request has started and set loading to true. Resetting it in the aborted branch would hide the spinner while the real request is still running.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this work with SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the server <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code> and immediate watchers run but the renderer does not wait for them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> never runs. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onServerPrefetch</code> or async setup with Suspense, which the renderer awaits, or Nuxt <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code>, which also transfers the data to the client.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use watchEffect instead of watch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onWatcherCleanup</code> applies to any watcher, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watch</code> makes the dependency explicit. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watchEffect</code>, only reactive reads before the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> are tracked, which is easy to get wrong in an async function.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Request state** | <code>data</code>, <code>loading</code>, <code>error</code>: one UI for each |
| **Race condition** | An older response arriving after a newer one and overwriting it |
| **AbortController** | API that cancels a <code>fetch</code>; the promise rejects with <code>AbortError</code> |
| **onWatcherCleanup** | Vue 3.5 API: run a function before the watcher re-runs or stops |
| **res.ok** | True for 2xx statuses; <code>fetch</code> does not throw on 404 or 500 |
| **Composable** | Reusable function returning reactive state, such as <code>useFetch</code> |
| **onServerPrefetch** | Hook whose promise the server renderer awaits before producing HTML |

---
**Conclusion:** Fetching data in a Vue component is three pieces of state plus one discipline. Keep <code>data</code>, <code>loading</code> and <code>error</code> and give each a UI; start the request from a watcher on the input with <code>immediate: true</code>; and cancel the previous request in <code>onWatcherCleanup</code> with an <code>AbortController</code>, ignoring the resulting <code>AbortError</code>. The verified runs show each piece earning its place: a naive watcher displayed user 2 when 3 was requested, the aborted version did not, a 404 only became an error because <code>res.ok</code> was checked, and unmounting cancelled the request on the wire. Wrap it in a composable once, and reach for a query library when several components share the same server data.`,
    examples: [
      {
        label: "Loading, error, retry and cancellation with a fake API",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, watch, onWatcherCleanup } from "vue";

// A FAKE network call so the demo runs anywhere: it answers after 300 ms,
// fails the first request for user 3 (a flaky server), and stops early
// when its AbortSignal fires, the way fetch does.
const names = { 1: "Ada Lovelace", 2: "Linus Torvalds", 3: "Alan Turing", 4: "Grace Hopper" };
const calls = {};
function fakeFetchUser(id, { signal }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      calls[id] = (calls[id] ?? 0) + 1;
      if (id === 3 && calls[id] === 1) reject(new Error("HTTP 503: try again"));
      else resolve({ id, name: names[id] ?? "Unknown" });
    }, 300);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("The request was aborted", "AbortError"));
    });
  });
}

const userId = ref(1);
const user = ref(null);
const loading = ref(false);
const error = ref(null);
const log = ref([]);
const attempt = ref(0); // bump to re-run the same request

async function load(id) {
  const controller = new AbortController();
  // Runs when userId changes again (or the component unmounts) before we finish.
  onWatcherCleanup(() => controller.abort());
  loading.value = true;
  error.value = null;
  try {
    user.value = await fakeFetchUser(id, { signal: controller.signal });
    log.value.push(\`loaded \${id}\`);
  } catch (e) {
    if (e.name === "AbortError") {
      log.value.push(\`aborted \${id}\`);
      return; // a newer request owns the loading flag now
    }
    user.value = null;
    error.value = e.message;
    log.value.push(\`failed \${id}\`);
  }
  loading.value = false;
}

watch([userId, attempt], ([id]) => load(id), { immediate: true });
const retry = () => attempt.value++;
</script>

<template>
  <button @click="userId--" :disabled="userId <= 1">Prev</button>
  <span> user #{{ userId }} </span>
  <button @click="userId++">Next</button>

  <p v-if="loading">Loading...</p>
  <p v-else-if="error" role="alert">
    {{ error }} <button @click="retry">Retry</button>
  </p>
  <p v-else-if="user">{{ user.name }}</p>

  <small>log: {{ log.join(", ") }}</small>
</template>`,
      },
      {
        label: "A reusable useFetch composable (tested against a local HTTP server)",
        tech: "js",
        runnable: false,
        code: `import { ref, shallowRef, watch, toValue, onWatcherCleanup } from "vue";

export function useFetch(url) {
  const data = shallowRef(null);
  const error = shallowRef(null);
  const loading = ref(false);

  watch(
    () => toValue(url),
    async (u) => {
      const controller = new AbortController();
      onWatcherCleanup(() => controller.abort()); // new URL or scope stopped
      loading.value = true;
      error.value = null;
      try {
        const res = await fetch(u, { signal: controller.signal });
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`); // fetch does not reject on 404
        data.value = await res.json();
      } catch (e) {
        if (e.name === "AbortError") return;
        data.value = null;
        error.value = e;
      }
      loading.value = false;
    },
    { immediate: true },
  );

  return { data, error, loading };
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle forms and validation in Vue?",
    seoDescription:
      "Vue forms: v-model and modifiers, computed validation errors, touched and submitted state, async submit with server errors, and when to use VeeValidate.",
    description: `**Question presented to candidate:**
"Build the sign-up form for our app: email, age, password and a terms checkbox. Errors should not shout at users before they have typed anything, the button must not double-submit, and the server can still reject an email that is taken. How do you handle forms and validation in Vue?"

**What a strong answer should cover:**
- \`v-model\` on inputs (with \`.trim\`, \`.number\`, \`.lazy\`), one reactive form object, and \`@submit.prevent\` on a real \`<form>\`.
- Validation as **derived state**: an \`errors\` computed from the current values, never a second copy that can drift; \`isValid\` computed from it.
- **When** to show errors: after blur (touched) or after the first submit attempt, not on the first keystroke.
- Submit handling: block when invalid, a \`submitting\` flag to disable the button, and mapping **server-side errors** back to the field or a form message.
- Edge cases: \`.number\` gives \`""\` when the field is cleared, the browser's own validation (\`novalidate\`), and accessibility (\`aria-invalid\`, error text linked to the input).
- When a library pays off: VeeValidate (or FormKit) for many forms, schema validation, field arrays and consistent touched/dirty tracking.

**Clarifying questions expected:**
- "Is the same validation needed on the server, and can we share a schema?"
- "How many forms like this will the app have?"

**Code / implementation expected:** Yes — a small form with computed errors, touched state and an async submit.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who knows [how v-model works on inputs](/interview-question/how-does-v-model-work-on-form-inputs) — no form library experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output was produced on Vue 3.5.44 by mounting the components in jsdom with the repo verifier and a driver that typed, blurred and submitted. The "server" is fake: a local promise with a 200 ms timer. The VeeValidate example ran on vee-validate 4.15.1, installed privately.

## 1. Why This Even Matters — A Story First

Picture two shop assistants helping you fill in a store-card application. The first one leans over your shoulder and says "invalid email!" while you are still typing the first letter. The second waits until you move to the next box, then quietly points out the missing dot. If you hand over the form with blanks, she circles every one at once. And if the head office later says your email is already registered, she tells you exactly which box to fix.

Everyone prefers the second assistant. She is not checking different rules; she is checking the same rules at better moments, and she never loses track of what the form currently says.

That is the whole job of form handling in Vue: hold the values in one place, derive the errors from them, decide **when** to show each error, and handle the round trip to the server without double submits.

## 2. The Core Idea

📌 **Interview term: Form model** — one reactive object holding every field, bound with <code>v-model</code>. The modifiers matter: <code>.trim</code> strips whitespace, <code>.number</code> converts to a number, <code>.lazy</code> syncs on <code>change</code> instead of every keystroke. See [v-model modifiers](/interview-question/what-are-v-model-modifiers).

📌 **Interview term: Derived validation** — errors are a <code>computed</code> of the current values, never stored separately. When a value changes, its error updates automatically and cannot go stale. Rules are plain functions that return a message or an empty string.

📌 **Interview term: Touched and submitted state** — a field is **touched** once the user has left it (blur). Showing an error only when a field is touched, or after the first submit attempt, is what makes a form feel polite.

📌 **Interview term: Server-side validation** — rules only the backend can check (email already registered, coupon expired). The client must map the server answer back to a field or a form-level message; client validation is a convenience, the server is the authority.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Form values feed a computed errors object; an error is shown only when its field is touched or after submit; submit checks validity, calls the server and maps a server error back to the form">
  <defs>
    <marker id="q09-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="115" y="66" text-anchor="middle">form values</text>
  <text class="d-sub" x="115" y="86" text-anchor="middle">reactive, v-model</text>
  <path class="d-edge" d="M 204 70 L 256 70" marker-end="url(#q09-arrow)"/>
  <rect class="d-box" x="262" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="347" y="66" text-anchor="middle">errors</text>
  <text class="d-sub" x="347" y="86" text-anchor="middle">computed from rules</text>
  <path class="d-edge" d="M 436 70 L 488 70" marker-end="url(#q09-arrow)"/>
  <rect class="d-box" x="494" y="40" width="196" height="60" rx="10"/>
  <text class="d-text" x="592" y="66" text-anchor="middle">shown if</text>
  <text class="d-sub" x="592" y="86" text-anchor="middle">touched or submitted</text>
  <rect class="d-box-accent" x="30" y="190" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="115" y="216" text-anchor="middle">submit</text>
  <text class="d-sub" x="115" y="236" text-anchor="middle">.prevent, mark submitted</text>
  <path class="d-edge" d="M 204 220 L 256 220" marker-end="url(#q09-arrow)"/>
  <rect class="d-box" x="262" y="190" width="170" height="60" rx="10"/>
  <text class="d-text" x="347" y="216" text-anchor="middle">valid?</text>
  <text class="d-sub" x="347" y="236" text-anchor="middle">else stop here</text>
  <path class="d-edge" d="M 436 220 L 488 220" marker-end="url(#q09-arrow)"/>
  <rect class="d-box" x="494" y="190" width="196" height="60" rx="10"/>
  <text class="d-text" x="592" y="216" text-anchor="middle">server call</text>
  <text class="d-sub" x="592" y="236" text-anchor="middle">button disabled</text>
  <path class="d-edge-dashed" d="M 347 104 L 347 186" marker-end="url(#q09-arrow)"/>
</svg>

The top row is about display, the bottom row about submission, and the dashed link is the only connection between them: submit reads the same computed <code>isValid</code> the template uses, so there is exactly one definition of "valid".

## 3. Verified: the Runnable Sign-up Form

The runnable example implements exactly the diagram, with four rules and a fake server that rejects <code>taken@example.com</code>. The driver blurred the email after typing <code>"  ada@"</code>, submitted, fixed the fields, and submitted twice more. Each line lists the visible error texts:

\`\`\`
after blur email : ["Enter a valid email"]
first submit     : ["Enter a valid email","Age is required","At least 8 characters","Please accept the terms"]
after fixing     : ["You must be 18 or older"]
age 36           : []
submitting       : Saving... true
server reply     : ["Server: Email already registered"]
success          : ntRegistered user 42
\`\`\`

- **Before any interaction, no errors were shown** (the first render was just labels and the button), even though every rule was failing.
- **Blur revealed only the email error.** The other fields were untouched.
- **The first submit revealed everything**, because <code>submitted</code> flips the visibility rule for all fields.
- **Errors cleared themselves** as values changed: nothing ever "removes" an error, the computed simply stops producing it.
- **The button said "Saving..." and was disabled** while the request was in flight, so a double click cannot submit twice.
- **The server error came back as a form message**; in a real app you would put <code>e.field</code> into a <code>serverErrors</code> map shown under that input.

## 4. Verified: What the Modifiers Actually Produce

Modifier behaviour is a classic source of validation bugs, so it was checked directly:

\`\`\`
typed : number:17 | "ada@x.io"
cleared: string:"" | "ada@x.io"
\`\`\`

<code>v-model.number</code> gave the number <code>17</code>, but when the field was cleared the value became the **empty string**, not <code>null</code> or <code>0</code>. That is why the age rule checks <code>v === null || v === ""</code>. <code>v-model.trim</code> stored <code>"ada@x.io"</code> from <code>"  ada@x.io  "</code>.

For <code>.lazy</code>, after focusing and typing <code>abc</code> into a normal and a lazy input:

\`\`\`
after typing in both: "abc" ""
after change on lazy: "abc" "abc"
\`\`\`

The lazy model only updated on the <code>change</code> event (blur or Enter in a browser). It is handy for expensive validation or search, at the cost of less immediate feedback. See [how v-model works on components](/interview-question/how-does-v-model-work-on-components) for building your own input components that support the same modifiers.

## 5. Using a Library: VeeValidate

Hand-rolling is fine for a few forms. With dozens, a library keeps touched, dirty, submitting and error state consistent. The examples-tab component uses VeeValidate 4.15.1: <code>useForm</code> holds the values and a validation schema, <code>defineField</code> returns a model plus the attributes (blur handlers and so on) to bind, and <code>handleSubmit</code> only calls your function when the form is valid:

\`\`\`
initial      : Sign upvalid: false, touched: false
invalid: {"email":"Enter a valid email","password":"At least 8 characters"}
empty submit : Enter a valid emailAt least 8 charactersSign upvalid: false, touched: true
after typing : Sign upvalid: true, touched: true
submit: {"email":"ada@example.com","password":"correct horse"}
\`\`\`

Note the first line: <code>meta.valid</code> was already <code>false</code> while no error text showed. VeeValidate validates silently up front and reveals messages by interaction, the same policy as the hand-written form.

| | Hand-rolled (computed errors) | VeeValidate | FormKit |
| :--- | :--- | :--- | :--- |
| Dependencies | None | <code>vee-validate</code> (4.15.1) | <code>@formkit/vue</code> (2.1.2) |
| Validation rules | Your functions | Functions, Yup, or Zod via an adapter | Built-in rule strings and custom rules |
| Touched, dirty, submitting | You write them | Built in | Built in |
| Renders inputs for you | No | No, you keep your markup | Yes, its own input components |
| Best for | A handful of forms | Many forms with custom UI | Form-heavy apps happy to adopt its components |

Versions are from npm in October 2026. VeeValidate was run here (and its bundle contains the Yup adapter path); FormKit was not installed, so its column summarises its documented approach rather than tested behaviour. One compatibility note checked on npm: <code>@vee-validate/zod</code> 4.15.1 declares a peer dependency of <code>zod ^3.24.0</code>, while the current Zod is 4.6.7, so check that adapter before pairing it with Zod 4. React has the same choice between hand-rolled and library forms, see [forms in React](/interview-question/how-do-you-handle-forms-in-react).

## 6. Details That Separate Good Forms From Bad

- **<code>@submit.prevent</code> on a real <code>&lt;form&gt;</code>**, so Enter submits and the page does not reload. Covered in [event modifiers](/interview-question/how-do-you-handle-events-in-vue-v-on-and-event-modifiers).
- **<code>novalidate</code>** when you render your own messages, otherwise the browser shows its own bubbles first. If you keep native validation, attributes like <code>required</code> and <code>type="email"</code> still help mobile keyboards.
- **Accessibility**: set <code>aria-invalid</code> on invalid inputs and point <code>aria-describedby</code> at the error text so screen readers announce it. This was not tested with a screen reader here.
- **Server is the authority.** Repeat the rules on the backend; a shared schema (the same Zod or Valibot schema in both places) avoids drift.
- **Reset after success** by reassigning the form object fields, and clear <code>touched</code> and <code>submitted</code> too.

## 7. Common Pitfalls

- **Storing errors in a separate ref you update by hand.** They drift from the values. Derive them with <code>computed</code>.
- **Showing errors on the first keystroke.** Gate them behind touched or submitted.
- **Assuming <code>.number</code> always gives a number.** A cleared field is <code>""</code> (verified above).
- **No submitting flag.** Double clicks send duplicate requests; disable the button while the request is in flight.
- **Losing server errors.** Map them to fields or a form message instead of a generic toast.
- **Validating only on the client.** Anyone can call the API directly.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">"I keep all fields in one reactive form object bound with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code>, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.trim</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.number</code> where they fit, on a real form with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@submit.prevent</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Validation:</strong> <span style="color:#f0e2c8;">"Errors are a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> derived from the current values with small rule functions, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isValid</code> is computed from the errors, so they can never drift out of sync."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to show:</strong> <span style="color:#f0e2c8;">"An error appears once its field is touched, meaning blurred, or after the first submit attempt, so users are not scolded on the first keystroke."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Submit:</strong> <span style="color:#f0e2c8;">"Submit marks the form as submitted, stops if invalid, disables the button with a submitting flag, and maps server errors such as a taken email back to the field."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">"For a few forms that is enough; for many I use VeeValidate, whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useForm</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineField</code> track touched, errors and submitting for me, and the server always re-validates."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why computed errors instead of validating in an input handler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A handler only runs on the events you remembered to wire up, and the stored error goes stale when the value changes another way, for example on reset or prefill. A computed recalculates from the values every time they change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does v-model.number give you for an empty field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An empty string, not null or zero. I verified it: typing 17 gave the number 17, clearing the field gave the string with nothing in it. Rules need to handle that case explicitly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you validate one field against another, like password confirmation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The rule reads both values, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">confirm: v =&gt; v === form.password ? '' : 'Passwords differ'</code>. Because errors are a computed over the whole form, changing the password re-evaluates the confirmation automatically. Verified: editing only the password flipped the confirmation message to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Passwords differ</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle async validation such as checking a username?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce a watcher on that field, call the API with an AbortController so stale checks are cancelled, store the result in a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverErrors</code> map, and merge it into what the template shows. The submit still re-checks on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose VeeValidate over hand-rolled validation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there are many forms, field arrays, schema validation shared with the backend, or I need consistent touched and dirty tracking. Hand-rolled stays simpler for a login or a two-field dialog.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Form model** | One reactive object holding all field values |
| **Derived validation** | Errors computed from current values, never stored |
| **Touched** | The user has left the field at least once |
| **Submitted state** | Set on the first submit attempt, reveals every error |
| **v-model.lazy / .trim / .number** | Sync on change, strip spaces, convert to number |
| **Server-side validation** | Rules only the backend can check, mapped back to the form |
| **novalidate** | Turns off the browser validation bubbles |
| **VeeValidate** | Library that tracks values, errors, touched and submit state |

---
**Conclusion:** Handling forms in Vue comes down to one reactive model bound with <code>v-model</code>, errors derived from it with <code>computed</code>, and a deliberate policy for when to show them: after blur or after the first submit. Submission checks the same computed validity, disables the button while the request runs and maps server answers back to the form. The verified runs show each behaviour, including two easy-to-miss details: a cleared <code>.number</code> input is an empty string, and <code>.lazy</code> waits for <code>change</code>. For many forms, VeeValidate gives the same policy with less code, as its own verified run shows.`,
    examples: [
      {
        label: "Sign-up form: computed errors, touched state, async submit with a fake server",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { reactive, computed, ref } from "vue";

const form = reactive({ email: "", age: null, password: "", terms: false });
const touched = reactive({});      // which fields the user has left (blur)
const submitted = ref(false);      // after the first submit, show every error
const submitting = ref(false);
const serverError = ref("");
const result = ref("");

// Validation rules are plain functions: return an error message or "".
const rules = {
  email: (v) => (!v ? "Email is required" : /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v) ? "" : "Enter a valid email"),
  age: (v) => (v === null || v === "" ? "Age is required" : v < 18 ? "You must be 18 or older" : ""),
  password: (v) => (v.length < 8 ? "At least 8 characters" : ""),
  terms: (v) => (v ? "" : "Please accept the terms"),
};

// Derived, never stored: errors always match the current values.
const errors = computed(() =>
  Object.fromEntries(Object.keys(rules).map((k) => [k, rules[k](form[k])])),
);
const isValid = computed(() => Object.values(errors.value).every((e) => !e));
const show = (field) => (touched[field] || submitted.value) && errors.value[field];

// Fake server call (no network): rejects a taken email like a real API might.
const fakeRegister = (data) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (data.email === "taken@example.com" ? reject({ field: "email", message: "Email already registered" }) : resolve({ id: 42 })), 200),
  );

async function onSubmit() {
  submitted.value = true;
  serverError.value = "";
  if (!isValid.value) return;
  submitting.value = true;
  try {
    const { id } = await fakeRegister({ ...form });
    result.value = \`Registered user \${id}\`;
  } catch (e) {
    serverError.value = e.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit" novalidate>
    <label>Email <input v-model.trim="form.email" type="email" @blur="touched.email = true" /></label>
    <p v-if="show('email')" class="err">{{ errors.email }}</p>

    <label>Age <input v-model.number="form.age" type="number" @blur="touched.age = true" /></label>
    <p v-if="show('age')" class="err">{{ errors.age }}</p>

    <label>Password <input v-model="form.password" type="password" @blur="touched.password = true" /></label>
    <p v-if="show('password')" class="err">{{ errors.password }}</p>

    <label><input v-model="form.terms" type="checkbox" /> I accept the terms</label>
    <p v-if="show('terms')" class="err">{{ errors.terms }}</p>

    <button type="submit" :disabled="submitting">{{ submitting ? "Saving..." : "Create account" }}</button>
    <p v-if="serverError" class="err">Server: {{ serverError }}</p>
    <p v-if="result">{{ result }}</p>
  </form>
</template>`,
      },
      {
        label: "The same idea with VeeValidate 4.15 (useForm + defineField)",
        tech: "vue",
        runnable: false,
        code: `<script setup>
// VeeValidate 4.15: the library tracks values, errors, touched and submit state.
// Rules here are plain functions (return true or an error message).
import { useForm } from "vee-validate";

const { defineField, errors, handleSubmit, meta, isSubmitting } = useForm({
  initialValues: { email: "", password: "" },
  validationSchema: {
    email: (v) => (!!v && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) || "Enter a valid email",
    password: (v) => (v?.length ?? 0) >= 8 || "At least 8 characters",
  },
});

const [email, emailAttrs] = defineField("email");
const [password, passwordAttrs] = defineField("password");

const onSubmit = handleSubmit(
  async (values) => console.log("submit:", JSON.stringify(values)), // only runs when valid
  ({ errors }) => console.log("invalid:", JSON.stringify(errors)),
);
</script>

<template>
  <form @submit="onSubmit" novalidate>
    <input v-model="email" v-bind="emailAttrs" type="email" />
    <span class="err">{{ errors.email }}</span>
    <input v-model="password" v-bind="passwordAttrs" type="password" />
    <span class="err">{{ errors.password }}</span>
    <button :disabled="isSubmitting">Sign up</button>
    <p>valid: {{ meta.valid }}, touched: {{ meta.touched }}</p>
  </form>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you test Vue components (Vitest and Vue Test Utils)?",
    seoDescription:
      "Testing Vue components with Vitest and Vue Test Utils: mount, find, trigger, emitted, flushPromises, mocking APIs, and testing with a real router or Pinia.",
    description: `**Question presented to candidate:**
"We have no tests on our Vue 3 front end. Set up component testing with Vitest and Vue Test Utils, and show me how you would test a component with props and events, one that fetches data, and one that uses the router or a Pinia store."

**What a strong answer should cover:**
- Setup: Vitest with \`@vitejs/plugin-vue\` (so \`.vue\` files compile) and \`environment: "jsdom"\` (or happy-dom); Vue Test Utils provides \`mount\`.
- The core API: \`mount(Component, { props, global })\`, \`get\` / \`find\` with \`data-test\` selectors, \`trigger\` and \`setValue\` (both **awaited**, because the DOM updates on the next tick), \`text()\`, \`emitted()\`.
- Async: mock the API module with \`vi.mock\`, then \`await flushPromises()\` before asserting.
- Plugins: pass a real router on \`createMemoryHistory\` or a Pinia via \`global.plugins\`; \`createTestingPinia\` stubs actions and seeds state.
- Test behaviour, not implementation: what the user sees and what the component emits, not internal refs; stub only heavy children (\`global.stubs\` / \`shallowMount\`).

**Clarifying questions expected:**
- "Are we after unit-level component tests, or end-to-end tests in a real browser too?"

**Code / implementation expected:** Yes — a Vitest config and two or three tests covering events, async data and a plugin.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who can write [Single File Components](/interview-question/what-is-a-single-file-component-sfc) — no testing experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every test in this doc was actually run: Vitest 5.0.5 with @vitejs/plugin-vue 6.0.10, @vue/test-utils 2.5.1, jsdom, Vue 3.5.44, vue-router 5.4.0, pinia 4.1.0 and @pinia/testing 2.0.2. The pass and fail outputs are copied from those runs. No browser was used; end-to-end testing is described but not run here.

## 1. Why This Even Matters — A Story First

A car factory does not test a new model by driving it across the country after it is fully assembled. It tests the brakes on a bench, the dashboard with a fake engine plugged in, and the radio on its own. Each bench test is quick, repeatable and tells you exactly which part broke. The cross-country drive happens too, but rarely.

Component tests are the bench tests of a Vue app. You **mount** one component in a fake browser, feed it props, click its buttons, and check what it shows and what it emits. The real API, the real router and the real store can be swapped for test versions when they get in the way. End-to-end tests in a real browser are the cross-country drive: valuable, slower, and not what this question is mostly about.

## 2. The Core Idea

📌 **Interview term: Vitest** — a test runner built on Vite, so it uses the same config, plugins and transforms as your app. Vitest 5.0.0 was published on 3 September 2026 and supports Vite 6, 7 and 8 (its 5.0.5 peer range is <code>^6.4.0 || ^7.0.0 || ^8.0.0</code>).

📌 **Interview term: Vue Test Utils (VTU)** — the official library for mounting Vue components in tests. <code>mount()</code> returns a **wrapper** with methods to find elements, trigger events, read text and inspect emitted events.

📌 **Interview term: Test environment** — component tests need a DOM. In Node that is a simulated one: **jsdom** or **happy-dom**, chosen with <code>test.environment</code>. Vitest can also run tests in a real browser (browser mode), which was not used here.

The whole setup is one config file plus <code>npm i -D vitest @vue/test-utils jsdom @vitejs/plugin-vue</code>:

\`\`\`js
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom", // a fake DOM for mount()
  },
});
\`\`\`

The plugin is what lets a test <code>import Counter from "./Counter.vue"</code>; without it Vite cannot compile the SFC.

## 3. Props, Clicks and Events

The component under test:

\`\`\`vue
<script setup>
import { ref } from "vue";
const props = defineProps({ start: { type: Number, default: 0 }, step: { type: Number, default: 1 } });
const emit = defineEmits(["change"]);
const count = ref(props.start);
function increment() {
  count.value += props.step;
  emit("change", count.value);
}
</script>

<template>
  <p data-test="count">Count: {{ count }}</p>
  <button data-test="inc" @click="increment">+{{ step }}</button>
</template>
\`\`\`

The examples-tab <code>Counter.test.js</code> mounts it with props, clicks with <code>trigger</code>, and checks both the DOM and <code>wrapper.emitted("change")</code>, which returns an array of argument lists, one per emit (<code>[[3], [5]]</code> after two clicks with <code>step: 2</code>).

📌 **Interview term: data-test selector** — an attribute such as <code>data-test="count"</code> used only for tests. It survives class renames and styling changes, unlike <code>.btn-primary</code> or tag selectors.

📌 **Interview term: Awaiting trigger** — Vue batches DOM updates and applies them on the next tick (see [nextTick](/interview-question/what-is-nexttick-in-vue)). <code>trigger()</code> and <code>setValue()</code> return a promise that resolves after that update, so you <code>await</code> them before checking the DOM.

The third test in that file pins down why, and passes:

\`\`\`js
const wrapper = mount(Counter);
wrapper.get('[data-test="inc"]').trigger("click"); // not awaited
expect(wrapper.get('[data-test="count"]').text()).toBe("Count: 0"); // DOM not patched yet
expect(wrapper.emitted("change")).toEqual([[1]]); // but the handler already ran
\`\`\`

The handler runs synchronously (the event was emitted), but the DOM still says 0. Here is the same mistake written as a normal test that expects 1, and what Vitest printed:

\`\`\`
AssertionError: expected 'Count: 0' to be 'Count: 1' // Object.is equality
Expected: "Count: 1"
Received: "Count: 0"
\`\`\`

## 4. Async Data: Mock the Module, Then Flush

<code>UserCard.vue</code> calls <code>fetchUser(id)</code> from an <code>api.js</code> module in <code>onMounted</code>. The examples-tab test replaces that module with <code>vi.mock("../src/api", () =&gt; ({ fetchUser: vi.fn() }))</code>, sets a resolved or rejected value per test, and then:

📌 **Interview term: flushPromises** — a VTU helper that waits until pending promise callbacks have run. After a mocked request resolves, the component sets its ref, and Vue re-renders; <code>await flushPromises()</code> waits for both, so the next assertion sees the final DOM.

The pattern in the test is: assert the loading state right after mount (<code>"Loading..."</code>), <code>await flushPromises()</code>, assert the data (<code>"Ada"</code>) and that the mock was called with <code>1</code>. The error test rejects with <code>new Error("HTTP 500")</code> and finds the text in <code>[role="alert"]</code>. Mocking at the module boundary keeps the component code untouched and the test free of real network calls. For the fetching patterns themselves (loading, errors, cancellation), see [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation).

## 5. Components That Use the Router or a Store

Pass plugins through the <code>global</code> mounting option, exactly as <code>app.use()</code> would in <code>main.js</code>.

**A real router on memory history** is usually simpler and more faithful than mocking <code>useRoute</code>:

\`\`\`js
import { it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import NavBar from "../src/components/NavBar.vue";

it("navigates with a real router on memory history", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<div />" } }, { path: "/about", component: { template: "<div />" } }],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mount(NavBar, { global: { plugins: [router] } });
  expect(wrapper.get('[data-test="path"]').text()).toBe("You are at /");

  await wrapper.findAll("a")[1].trigger("click");
  await flushPromises(); // navigation is async
  expect(router.currentRoute.value.path).toBe("/about");
  expect(wrapper.get('[data-test="path"]').text()).toBe("You are at /about");
  expect(wrapper.findAll("a")[1].classes()).toContain("router-link-exact-active");
});
\`\`\`

Navigation is asynchronous, so the test waits for <code>router.isReady()</code> before mounting and calls <code>flushPromises()</code> after the click. The final assertion also checks the active class that [RouterLink](/interview-question/how-do-you-set-up-vue-router-routes-routerlink-routerview-history-modes) adds.

**A store with <code>createTestingPinia</code>** (from <code>@pinia/testing</code> 2.0.2, which requires <code>pinia &gt;=4.1.0</code>):

\`\`\`js
import { it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import CartBadge from "../src/components/CartBadge.vue";
import { useCartStore } from "../src/stores/cart";

it("reads store state and calls the action (stubbed)", async () => {
  const wrapper = mount(CartBadge, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, initialState: { cart: { items: ["a", "b"] } } })],
    },
  });
  const cart = useCartStore(); // the same testing pinia is active
  expect(wrapper.get('[data-test="badge"]').text()).toBe("2 items");

  await wrapper.get("button").trigger("click");
  expect(cart.checkout).toHaveBeenCalledTimes(1); // actions are spies, not run
  expect(cart.items).toEqual(["a", "b"]); // so the cart was not emptied
});
\`\`\`

📌 **Interview term: createTestingPinia** — a Pinia for tests whose actions are replaced with spies (here <code>vi.fn</code>) and whose state can be seeded with <code>initialState</code>. The component renders from real state, and you assert that it **called** the action rather than what the action did. To run real actions, pass <code>stubActions: false</code> (verified: <code>checkout</code> then really emptied the cart while the spy still counted 1 call), or use a plain <code>createPinia()</code>. One caveat seen while verifying the [Pinia doc](/interview-question/what-is-pinia-and-why-use-it): Pinia plugins only run once the Pinia is installed on an app, so <code>setActivePinia(createPinia())</code> alone skips them, while <code>global.plugins</code> installs it properly.

## 6. Stubbing Children

Sometimes a child is irrelevant or expensive (a chart, a map). Verified with a <code>Dashboard</code> that renders a <code>HeavyChart</code>:

\`\`\`
mount        : <section><h2>Sales</h2><canvas>chart with 3 points</canvas></section>
shallowMount : <section><h2>Sales</h2><heavy-chart-stub points="1,2,3"></heavy-chart-stub></section>
stubs option : <section><h2>Sales</h2><heavy-chart-stub points="1,2,3"></heavy-chart-stub></section>
\`\`\`

<code>shallowMount</code> stubs every child; <code>global: { stubs: { HeavyChart: true } }</code> stubs just the named one, which is usually what you want. The stub still records props, so <code>findComponent({ name: "HeavyChart" }).props("points")</code> returned <code>[1, 2, 3]</code>. VTU also exports a <code>RouterLinkStub</code> for tests that should not install a router.

## 7. The Full Run

All five test files from this doc together:

\`\`\`
 ✓ tests/Counter.test.js > Counter > renders the start prop 50ms
 ✓ tests/Counter.test.js > Counter > increments by step and emits change 12ms
 ✓ tests/Counter.test.js > Counter > shows why you must await trigger 5ms
 ✓ tests/NavBar.test.js > navigates with a real router on memory history 49ms
 ✓ tests/UserCard.test.js > UserCard > shows loading, then the user 27ms
 ✓ tests/UserCard.test.js > UserCard > shows the error message 16ms
 ✓ tests/CartBadge.test.js > reads store state and calls the action (stubbed) 41ms
 ✓ tests/Stub.test.js > stubs a heavy child 36ms
 Test Files  5 passed (5)
      Tests  8 passed (8)
\`\`\`

| Layer | Tool | Speed | Catches |
| :--- | :--- | :--- | :--- |
| Composables and stores | Vitest alone, <code>createPinia()</code> | Fastest | Logic bugs |
| Components | Vitest + VTU + jsdom | Fast | Rendering, events, wiring to router and store |
| Real browser behaviour | Vitest browser mode or Playwright | Slower | Layout, focus, real events, CSS (not run here) |
| User journeys | Playwright or Cypress end-to-end | Slowest | Integration with the real backend (not run here) |

The same layering applies in other stacks; compare [testing React components](/interview-question/how-do-you-test-react-components) and [testing Angular signal components](/interview-question/how-do-you-test-signal-components-defer-blocks-and-new-control-flow-in-2025).

## 8. Common Pitfalls

- **Not awaiting <code>trigger</code> or <code>setValue</code>.** The DOM has not updated yet (verified failure above).
- **Forgetting <code>flushPromises</code>** after mocked async work; the test asserts the loading state by accident.
- **Missing <code>@vitejs/plugin-vue</code>** in the Vitest config. Verified: the suite fails before any test runs with <code>Failed to parse source for import analysis because the content contains invalid JS syntax. Install @vitejs/plugin-vue to handle .vue files.</code>
- **Asserting internals** such as <code>wrapper.vm.count</code>. VTU does let you reach into a <code>&lt;script setup&gt;</code> component (verified: <code>wrapper.vm.count</code> returned <code>4</code>), even though such components are [closed to parents by default](/interview-question/what-is-defineexpose-and-why-are-script-setup-components-closed-by-default), but tests on internals break on every refactor. Assert DOM and emitted events.
- **Over-mocking.** Mocking <code>useRoute</code> or every child turns the test into a copy of the implementation; prefer a real memory-history router and targeted stubs.
- **Leaking state between tests**: a router, Pinia or module-level ref reused across tests. Create them inside each test.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Setup:</strong> <span style="color:#f0e2c8;">"Vitest with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vitejs/plugin-vue</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.vue</code> files compile and a jsdom environment, plus Vue Test Utils for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mount</code>; it reuses the app Vite config, so there is little to configure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Core loop:</strong> <span style="color:#f0e2c8;">"I mount the component with props, find elements by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-test</code> attributes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await trigger</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setValue</code>, then assert on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text()</code> and on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitted()</code> events."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Async:</strong> <span style="color:#f0e2c8;">"I mock the API module with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.mock</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await flushPromises()</code> so the mocked promise resolves and Vue re-renders before I assert."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Plugins:</strong> <span style="color:#f0e2c8;">"I pass a real router on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createMemoryHistory</code> or a Pinia through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global.plugins</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createTestingPinia</code> gives me seeded state and spied actions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Philosophy:</strong> <span style="color:#f0e2c8;">"I test behaviour the user sees, not internal refs, stub only heavy children, and keep a few end-to-end tests in a real browser for full journeys."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need to await trigger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue batches DOM updates to the next tick. The handler runs immediately, but the DOM is patched later, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trigger</code> returns a promise for that. I verified it: without the await the emitted event was there but the text still said <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Count: 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between flushPromises and nextTick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextTick</code> waits for Vue to apply pending DOM updates. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushPromises</code> waits for pending promise callbacks, such as a mocked fetch resolving, which then cause updates. For async data you need the latter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Mount or shallowMount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mount by default, because it tests the real composition. Stub specific heavy or irrelevant children with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">global.stubs</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowMount</code> stubs everything, which tends to test the template structure rather than behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a component that uses a Pinia store?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either install a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createPinia()</code> and mock the API layer below the store, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createTestingPinia</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initialState</code> and assert that actions were called. Create a fresh Pinia per test so state does not leak.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">jsdom or happy-dom, and when a real browser?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works for most component tests: jsdom is the long-established choice and the one I used here, happy-dom is a lighter alternative, so check it supports the APIs your components touch. Anything about layout, CSS, focus behaviour or real browser APIs belongs in Vitest browser mode or Playwright.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vitest** | Vite-powered test runner, shares the app config |
| **Vue Test Utils** | Official library to mount components and interact with them |
| **Wrapper** | What <code>mount()</code> returns: find, trigger, text, emitted |
| **jsdom / happy-dom** | Simulated DOM so components can render in Node |
| **data-test selector** | Test-only attribute for finding elements reliably |
| **flushPromises** | Waits for pending promises and the resulting re-render |
| **vi.mock** | Replaces a module (such as the API layer) for a test file |
| **createTestingPinia** | Test Pinia with spied actions and seeded state |
| **shallowMount / stubs** | Replace child components with placeholders |

---
**Conclusion:** Testing Vue components means mounting one component in a simulated DOM with Vue Test Utils, driving it the way a user would, and asserting on what it renders and emits. Vitest makes that cheap because it reuses the app Vite config, plus <code>@vitejs/plugin-vue</code> and a jsdom environment. The verified suite shows the core habits: await <code>trigger</code> because the DOM updates on the next tick, mock the API module and <code>flushPromises</code> for async data, install a real memory-history router or <code>createTestingPinia</code> through <code>global.plugins</code>, and stub only the children that get in the way. Leave real-browser behaviour to a smaller set of end-to-end tests.`,
    examples: [
      {
        label: "Counter.test.js: props, clicks, emitted events, and why trigger is awaited",
        tech: "js",
        runnable: false,
        code: `import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Counter from "../src/components/Counter.vue";

describe("Counter", () => {
  it("renders the start prop", () => {
    const wrapper = mount(Counter, { props: { start: 5 } });
    expect(wrapper.get('[data-test="count"]').text()).toBe("Count: 5");
  });

  it("increments by step and emits change", async () => {
    const wrapper = mount(Counter, { props: { start: 1, step: 2 } });
    await wrapper.get('[data-test="inc"]').trigger("click"); // await = wait for the DOM update
    await wrapper.get('[data-test="inc"]').trigger("click");
    expect(wrapper.get('[data-test="count"]').text()).toBe("Count: 5");
    expect(wrapper.emitted("change")).toEqual([[3], [5]]);
  });

  it("shows why you must await trigger", () => {
    const wrapper = mount(Counter);
    wrapper.get('[data-test="inc"]').trigger("click"); // not awaited
    expect(wrapper.get('[data-test="count"]').text()).toBe("Count: 0"); // DOM not patched yet
    expect(wrapper.emitted("change")).toEqual([[1]]); // but the handler already ran
  });
});`,
      },
      {
        label: "UserCard.test.js: mocking the API module and flushPromises",
        tech: "js",
        runnable: false,
        code: `import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import UserCard from "../src/components/UserCard.vue";
import { fetchUser } from "../src/api";

vi.mock("../src/api", () => ({ fetchUser: vi.fn() })); // no real network in unit tests

describe("UserCard", () => {
  it("shows loading, then the user", async () => {
    vi.mocked(fetchUser).mockResolvedValueOnce({ id: 1, name: "Ada" });
    const wrapper = mount(UserCard, { props: { id: 1 } });
    expect(wrapper.text()).toBe("Loading...");
    await flushPromises(); // let the mocked promise resolve and Vue re-render
    expect(wrapper.text()).toBe("Ada");
    expect(fetchUser).toHaveBeenCalledWith(1);
  });

  it("shows the error message", async () => {
    vi.mocked(fetchUser).mockRejectedValueOnce(new Error("HTTP 500"));
    const wrapper = mount(UserCard, { props: { id: 2 } });
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe("HTTP 500");
  });
});`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle errors in Vue (onErrorCaptured, app.config.errorHandler)?",
    seoDescription:
      "Vue error handling: onErrorCaptured boundaries, app.config.errorHandler, what each catches, the verified propagation order, and production behaviour.",
    description: `**Question presented to candidate:**
"One broken widget on our dashboard blanks part of the page, and we only hear about production errors from angry users. How does error handling work in Vue, and how would you contain failures and report them?"

**What a strong answer should cover:**
- \`app.config.errorHandler(err, instance, info)\`: the global handler for errors Vue catches (render, setup, lifecycle hooks, watchers, component event handlers, including async ones); the place to report to a monitoring service.
- \`onErrorCaptured(err, instance, info)\` in an ancestor: called for errors from descendants; returning \`false\` stops propagation, which is how an **error boundary** shows a fallback for one widget.
- The **propagation order**: nearest ancestor hook first, then further ancestors, then \`app.config.errorHandler\`.
- What Vue **cannot** catch: code it does not call, such as \`setTimeout\` callbacks and other unrelated async work; those need \`window\` error and \`unhandledrejection\` listeners.
- Production details: \`info\` becomes a short error-reference URL instead of a description; unhandled errors are logged, not thrown, unless \`app.config.throwUnhandledErrorInProduction\` is set (Vue 3.5+).

**Clarifying questions expected:**
- "Should one failed widget show a fallback while the rest of the page keeps working?"
- "Which monitoring service do we report to, and do we need component context in the report?"

**Code / implementation expected:** Yes — an \`ErrorBoundary\` component using \`onErrorCaptured\`, and a global \`errorHandler\` in \`main.ts\`.`,
    answer: `**Target Audience:** Anyone preparing for a Vue interview who knows [the component lifecycle](/interview-question/what-are-vue-lifecycle-hooks) — no error-monitoring experience required.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output was produced on Vue 3.5.44: the propagation scripts ran in Node with jsdom, once in development and once with <code>NODE_ENV=production</code> (which loads Vue's production build), and the runnable error boundary went through the repo verifier with a click driver. Browser-only listeners (<code>window.onerror</code>, <code>unhandledrejection</code>) are described but were not run in a real browser.

## 1. Why This Even Matters — A Story First

A building has a fuse box. When the toaster in one flat shorts out, its fuse trips: that flat loses the kitchen sockets, the lights stay on, and the rest of the building never notices. Somewhere in the basement a panel also logs "fuse 14 tripped" so the electrician knows where to look.

Without fuses, one short would take out the whole building, and nobody would know why.

Vue gives you both halves. **Error boundaries** built with <code>onErrorCaptured</code> are the per-flat fuses: one broken widget shows a small fallback instead of taking its neighbours down. **<code>app.config.errorHandler</code>** is the basement panel: one place that hears about every error Vue catches, so you can report it to a monitoring service. Interviewers ask because most apps have neither, and only find out about production errors from support tickets.

## 2. The Core Idea

📌 **Interview term: app.config.errorHandler** — a function set once in <code>main.ts</code>, called as <code>(err, instance, info)</code> for errors Vue catches anywhere in the app: during render, setup, lifecycle hooks, watcher callbacks and event handlers bound in templates, including handlers that return a rejected promise.

📌 **Interview term: onErrorCaptured** — a lifecycle hook in an **ancestor** component, called with the same <code>(err, instance, info)</code> when a descendant throws. It does not see errors from the component itself. Return <code>false</code> to mark the error handled and stop it from travelling further.

📌 **Interview term: Error boundary** — a component whose job is to wrap others, catch their errors with <code>onErrorCaptured</code>, and render a fallback instead of the broken subtree. Vue has no built-in boundary component; you write one in a few lines (the runnable example). React calls the same idea an [Error Boundary](/interview-question/what-are-error-boundaries-in-react).

📌 **Interview term: info string** — the third argument, naming where the error happened: <code>"render function"</code>, <code>"setup function"</code>, <code>"native event handler"</code>, <code>"watcher callback"</code>, <code>"mounted hook"</code>, <code>"errorCaptured hook"</code> (all verified below). In production builds it becomes a short URL instead.

A typical global setup:

\`\`\`ts
// main.ts
const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  // report to your monitoring service with context
  reportError(err, { component: instance?.$options.name, info });
};

app.mount("#app");
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="An error thrown in a child travels to the nearest ancestor onErrorCaptured hook, then further ancestors, then app.config.errorHandler, unless a hook returns false">
  <defs>
    <marker id="q11-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="120" width="160" height="60" rx="10"/>
  <text class="d-text" x="110" y="146" text-anchor="middle">Child throws</text>
  <text class="d-sub" x="110" y="166" text-anchor="middle">render, hook, handler</text>
  <path class="d-edge" d="M 194 150 L 236 150" marker-end="url(#q11-arrow)"/>
  <rect class="d-box" x="242" y="120" width="160" height="60" rx="10"/>
  <text class="d-text" x="322" y="146" text-anchor="middle">nearest parent</text>
  <text class="d-sub" x="322" y="166" text-anchor="middle">onErrorCaptured</text>
  <path class="d-edge" d="M 406 150 L 448 150" marker-end="url(#q11-arrow)"/>
  <rect class="d-box" x="454" y="120" width="110" height="60" rx="10"/>
  <text class="d-text" x="509" y="146" text-anchor="middle">ancestors</text>
  <text class="d-sub" x="509" y="166" text-anchor="middle">same hook</text>
  <path class="d-edge-accent" d="M 568 150 L 590 150" marker-end="url(#q11-arrow)"/>
  <rect class="d-box-accent" x="596" y="120" width="110" height="60" rx="10"/>
  <text class="d-text d-accent" x="651" y="146" text-anchor="middle">global</text>
  <text class="d-sub" x="651" y="166" text-anchor="middle">errorHandler</text>
  <path class="d-edge-dashed" d="M 322 116 L 322 70" marker-end="url(#q11-arrow)"/>
  <rect class="d-box-accent" x="232" y="20" width="180" height="46" rx="10"/>
  <text class="d-text d-accent" x="322" y="48" text-anchor="middle">return false: stop</text>
  <path class="d-edge-dashed" d="M 110 184 L 110 226" marker-end="url(#q11-arrow)"/>
  <rect class="d-box-muted" x="20" y="232" width="250" height="50" rx="10"/>
  <text class="d-text" x="145" y="262" text-anchor="middle">setTimeout throw: Vue never sees it</text>
</svg>

The main row is the default path. The dashed branch up is a boundary that handles the error. The dashed branch down is the important gap: code Vue did not call is invisible to all of these hooks.

## 3. Verified: the Propagation Order

The script in the examples tab mounts <code>App &gt; Middle &gt; Child</code>, with <code>onErrorCaptured</code> in <code>App</code> and <code>Middle</code>, and <code>app.config.errorHandler</code> set. Each button in <code>Child</code> fails a different way. Development build:

\`\`\`
click #sync
  1. Middle onErrorCaptured: "click handler failed" from <Child> info="native event handler"
  2. App onErrorCaptured: "click handler failed"
  3. app.config.errorHandler: "click handler failed" info="native event handler"
click #async
  1. Middle onErrorCaptured: "async handler failed" from <Child> info="native event handler"
  2. App onErrorCaptured: "async handler failed"
  3. app.config.errorHandler: "async handler failed" info="native event handler"
click #watch
  1. Middle onErrorCaptured: "watcher failed" from <Child> info="watcher callback"
     Middle returns false: propagation stops
click #timer
  !! uncaughtException (Vue never saw it): "timer failed"
click #render
  1. Middle onErrorCaptured: "render failed" from <Child> info="render function"
  2. App onErrorCaptured: "render failed"
  3. app.config.errorHandler: "render failed" info="render function"
DOM after render error: "<!---->"
\`\`\`

What this proves:

- **Nearest ancestor first, then outwards, then global.** Every reported error took the 1, 2, 3 path.
- **Async event handlers are covered** when the handler returns the promise: <code>async () =&gt; { await null; throw ... }</code> still reached all three.
- **<code>return false</code> really stops it**: the watcher error never reached <code>App</code> or the global handler. Use this only where you have actually handled the error, or it disappears from your monitoring.
- **Timers are invisible.** The <code>setTimeout</code> callback threw outside any Vue call, so no Vue hook saw it; in Node it surfaced as <code>uncaughtException</code>, in a browser it goes to <code>window.onerror</code>.
- **A render error leaves nothing behind**: the failed subtree rendered as an empty comment, which is the "blank part of the page" from the question.

More failure sites, from a second script with only a global handler:

\`\`\`
errorHandler: "setup failed" info="setup function" component=SetupThrows
errorHandler: "async onMounted failed" info="mounted hook" component=AsyncMounted
errorHandler: "the boundary itself failed" info="errorCaptured hook" component=BrokenBoundary
errorHandler: "render failed" info="render function" component=Thrower
\`\`\`

An async <code>onMounted</code> that rejects is caught too, and when a boundary's own <code>onErrorCaptured</code> throws, the global handler receives **both** the boundary's error and the original one.

## 4. Verified: a Reusable Error Boundary

The runnable example defines an <code>ErrorBoundary</code> that stores the captured error, returns <code>false</code>, renders a fallback with a "Try again" button, and on reset bumps a <code>key</code> so its children are recreated from scratch. Two boundaries wrap two widgets:

\`\`\`
[app] RENDERED: count: 0Save
after 3 clicks : Widget A failed: count 3 is cursed Try againSaveWidget A caught "count 3 is cursed" (render function)
click Save     : Widget A failed: count 3 is cursed Try againWidget B failed: save failed Try againWidget A caught "count 3 is cursed" (render function)Widget B caught "save failed" (native event handler)
Try again      : count: 0Widget B failed: save failed Try againWidget A caught "count 3 is cursed" (render function)Widget B caught "save failed" (native event handler)
\`\`\`

Widget A crashed while rendering and was replaced by its fallback while Widget B kept working; "Try again" brought A back with fresh state (<code>count: 0</code>). Notice that Widget B's **click handler** error also switched B to its fallback, even though B could still render. That is a design choice worth raising in an interview: many teams only show the fallback for <code>render function</code> and <code>setup function</code> errors and merely report the rest, by checking <code>info</code> before setting the error state.

## 5. Development vs Production

**The <code>info</code> argument shrinks.** The same propagation script with <code>NODE_ENV=production</code>:

\`\`\`
  1. Middle onErrorCaptured: "click handler failed" from <Child> info="https://vuejs.org/error-reference/#runtime-5"
  1. Middle onErrorCaptured: "watcher failed" from <Child> info="https://vuejs.org/error-reference/#runtime-3"
  1. Middle onErrorCaptured: "render failed" from <Child> info="https://vuejs.org/error-reference/#runtime-1"
\`\`\`

Do not branch on the readable strings in production code; they are only there in development builds. Log <code>info</code> as-is and look the code up on the error-reference page.

**Unhandled errors.** With no <code>errorHandler</code> and a component whose <code>setup</code> throws:

\`\`\`
== dev
[Vue warn]: Unhandled error during execution of setup function
  at <App>
mount threw: setup exploded
== prod
Error: setup exploded
    at setup (... stack trimmed ...)
mount returned normally; DOM: "<!---->"
== prod + throwUnhandledErrorInProduction
mount threw: setup exploded
\`\`\`

In development Vue warns and rethrows. In production it only <code>console.error</code>s and carries on with an empty subtree, which is why production errors go unnoticed without a handler. <code>app.config.throwUnhandledErrorInProduction = true</code> restores the throw; it was added in Vue 3.5 for cases such as SSR where a server should fail the request instead of sending a blank page (source: <a href="https://github.com/vuejs/core/issues/7876" target="_blank" rel="noopener noreferrer">vuejs/core issue 7876</a> and the <a href="https://vuejs.org/api/application" target="_blank" rel="noopener noreferrer">application API reference</a>).

📌 **Interview term: app.config.warnHandler** — the counterpart for Vue's development warnings. Verified: with it set, an invalid prop produced <code>warnHandler: "Invalid prop: type check failed for prop "n". ..."</code> instead of a console warning. In production it never fires: the same invalid prop with <code>NODE_ENV=production</code> produced no call at all, because the production build skips those checks.

## 6. What Each Mechanism Catches

| Source of the error | <code>onErrorCaptured</code> in an ancestor | <code>app.config.errorHandler</code> | Needs a browser listener |
| :--- | :--- | :--- | :--- |
| Render function, setup, lifecycle hooks | Yes | Yes | No |
| Template event handler, sync or returned promise | Yes | Yes | No |
| Watcher callbacks | Yes | Yes | No |
| The boundary's own <code>onErrorCaptured</code> throwing | Further ancestors | Yes | No |
| <code>setTimeout</code>, <code>addEventListener</code> you registered yourself | No | No | <code>window</code> <code>error</code> |
| A promise nobody awaits or returns | No | No | <code>unhandledrejection</code> |

For async components, <code>defineAsyncComponent</code> has its own <code>errorComponent</code> and retry options, covered in [defineAsyncComponent with loading, error and retry](/interview-question/how-does-defineasynccomponent-work-with-loading-error-and-retry-in-2025). For a data request failing, prefer explicit error state in the component, as in [fetching data in a component](/interview-question/how-do-you-fetch-data-in-a-vue-component-loading-errors-cancellation); a failed request is an expected outcome, not an exception for a boundary. Router failures have their own channel, <code>router.onError</code>, shown in [navigation guards](/interview-question/what-are-vue-router-navigation-guards).

## 7. Common Pitfalls

- **No global handler in production.** Errors are only logged to the user's console; nothing reaches you.
- **Returning <code>false</code> everywhere.** The error is swallowed before the global handler, so monitoring never hears about it. Report inside the boundary, or let it bubble.
- **Expecting Vue to catch timer and listener errors.** It cannot; add <code>window</code> <code>error</code> and <code>unhandledrejection</code> listeners for code outside Vue.
- **Forgetting to return the promise.** Verified: <code>@click="() =&gt; save()"</code> reached <code>errorHandler</code>, but <code>@click="() =&gt; { save(); }"</code> (same rejected promise, not returned) went straight to <code>unhandledRejection</code>, in development and production alike.
- **Matching on <code>info</code> text.** It is a URL in production builds.
- **A fallback with no way back.** Give boundaries a reset that recreates the children (a new <code>key</code>), otherwise the user must reload the page.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two layers:</strong> <span style="color:#f0e2c8;">"Vue has a global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.errorHandler</code> for every error it catches, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code> hook in ancestor components for errors from their descendants."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Order:</strong> <span style="color:#f0e2c8;">"An error goes to the nearest ancestor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onErrorCaptured</code>, then further ancestors, then the global handler; returning false from a hook marks it handled and stops it there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Boundaries:</strong> <span style="color:#f0e2c8;">"I build an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ErrorBoundary</code> component that captures child errors, renders a fallback with a retry that remounts the children via a new key, so one broken widget does not blank the page."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Coverage:</strong> <span style="color:#f0e2c8;">"Vue catches render, setup, lifecycle hooks, watchers and template event handlers, including returned promises, but not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> or listeners it did not register, so I also add window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">error</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unhandledrejection</code> listeners."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Production:</strong> <span style="color:#f0e2c8;">"The global handler reports to monitoring; in production <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">info</code> is an error-reference URL and unhandled errors are only logged unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throwUnhandledErrorInProduction</code> is set, which is useful for SSR."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does onErrorCaptured not catch errors from its own component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is designed for ancestors: the component that threw is usually in a broken state and cannot render a fallback for itself. The boundary has to sit above the code that fails, which is why it is a wrapper component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When should a boundary return false?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when it has really handled the error, for example by rendering a fallback and reporting it. Returning false hides the error from the global handler, so a boundary that swallows errors without reporting makes them invisible in monitoring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does an async click handler get caught?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if the handler returns the promise: I verified an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code> handler that throws after an await reached both hooks and the global handler. If the handler starts the promise without returning it, the rejection becomes an unhandled rejection instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the info argument good for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It tells you where the error happened, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render function</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup function</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">native event handler</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">watcher callback</code>. In production it becomes a short URL like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">https://vuejs.org/error-reference/#runtime-1</code>, so log it but never branch on the readable text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to errors in the router or async components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Router guard errors reject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.push</code> and go to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.onError</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code> has its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errorComponent</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onError</code> retry options for failed loads. Data requests should have explicit error state in the component rather than relying on boundaries.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **app.config.errorHandler** | Global function for every error Vue catches; the place to report |
| **onErrorCaptured** | Ancestor hook for descendant errors; <code>return false</code> stops propagation |
| **Error boundary** | Component that catches child errors and renders a fallback |
| **info** | Where the error happened; a readable string in dev, a reference URL in prod |
| **Propagation** | Nearest ancestor hook, further ancestors, then the global handler |
| **throwUnhandledErrorInProduction** | Vue 3.5 option to rethrow unhandled errors in production |
| **warnHandler** | Receives Vue development warnings instead of the console |

---
**Conclusion:** Vue handles errors in two layers. <code>onErrorCaptured</code> in an ancestor lets you build error boundaries that replace one broken widget with a fallback, and returning <code>false</code> from it stops the error travelling further. <code>app.config.errorHandler</code> receives everything that is not stopped, which makes it the single place to report to monitoring. The verified runs show the order (nearest ancestor, further ancestors, global), that async template handlers, watchers, hooks and setup are all covered, and that a <code>setTimeout</code> throw bypasses Vue entirely and needs a <code>window</code> listener. In production <code>info</code> becomes a reference URL and unhandled errors are only logged, so always install a global handler, and in SSR consider <code>throwUnhandledErrorInProduction</code>.`,
    examples: [
      {
        label: "A reusable error boundary with onErrorCaptured and a reset button",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { defineComponent, h, ref, onErrorCaptured } from "vue";

// A reusable error boundary: catches errors from its descendants,
// shows a fallback instead of the broken subtree, and offers a reset.
const ErrorBoundary = defineComponent({
  name: "ErrorBoundary",
  props: { name: String },
  setup(props, { slots }) {
    const error = ref(null);
    const resetKey = ref(0);
    onErrorCaptured((err, instance, info) => {
      error.value = err;
      log.value.push(\`\${props.name} caught "\${err.message}" (\${info})\`);
      return false; // handled here: do not bubble to parents or app.config.errorHandler
    });
    const reset = () => { error.value = null; resetKey.value++; };
    return () =>
      error.value
        ? h("div", { role: "alert" }, [\`\${props.name} failed: \${error.value.message} \`, h("button", { onClick: reset }, "Try again")])
        : h("div", { key: resetKey.value }, slots.default?.()); // new key = fresh children
  },
});

// A child that breaks while rendering once its count reaches 3.
const FlakyCounter = defineComponent({
  name: "FlakyCounter",
  setup() {
    const count = ref(0);
    return () => {
      if (count.value === 3) throw new Error("count 3 is cursed");
      return h("button", { onClick: () => count.value++ }, \`count: \${count.value}\`);
    };
  },
});

// A child whose click handler throws (the render itself is fine).
const BadButton = defineComponent({
  name: "BadButton",
  setup() {
    const save = () => { throw new Error("save failed"); };
    return () => h("button", { onClick: save }, "Save");
  },
});

const log = ref([]);
</script>

<template>
  <ErrorBoundary name="Widget A"><FlakyCounter /></ErrorBoundary>
  <ErrorBoundary name="Widget B"><BadButton /></ErrorBoundary>
  <ol>
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
  </ol>
</template>`,
      },
      {
        label: "Script that prints how an error travels: child, boundaries, global handler",
        tech: "js",
        runnable: false,
        code: `import "./dom.mjs";
import { createApp, defineComponent, h, ref, onErrorCaptured, onMounted, nextTick, watch } from "vue";
const log = (...a) => console.log(...a);
const wait = (ms = 20) => new Promise((r) => setTimeout(r, ms));

const Child = defineComponent({
  name: "Child",
  setup() {
    const mode = ref("ok");
    const boom = () => { throw new Error("click handler failed"); };
    const asyncBoom = async () => { await null; throw new Error("async handler failed"); };
    watch(mode, (m) => { if (m === "watch") throw new Error("watcher failed"); });
    return () => {
      if (mode.value === "render") throw new Error("render failed");
      return h("div", [
        h("button", { id: "render", onClick: () => (mode.value = "render") }, "r"),
        h("button", { id: "sync", onClick: boom }, "s"),
        h("button", { id: "async", onClick: asyncBoom }, "a"),
        h("button", { id: "watch", onClick: () => (mode.value = "watch") }, "w"),
        h("button", { id: "timer", onClick: () => setTimeout(() => { throw new Error("timer failed"); }) }, "t"),
      ]);
    };
  },
});
const Middle = defineComponent({
  name: "Middle",
  setup() {
    onErrorCaptured((err, instance, info) => {
      log(\`  1. Middle onErrorCaptured: "\${err.message}" from <\${instance?.$options.name}> info="\${info}"\`);
      if (err.message.startsWith("watcher")) { log("     Middle returns false: propagation stops"); return false; }
    });
    return () => h(Child);
  },
});
const App = defineComponent({
  setup() {
    onErrorCaptured((err) => { log(\`  2. App onErrorCaptured: "\${err.message}"\`); });
    return () => h(Middle);
  },
});

const app = createApp(App);
app.config.errorHandler = (err, instance, info) => log(\`  3. app.config.errorHandler: "\${err.message}" info="\${info}"\`);
process.on("uncaughtException", (e) => log(\`  !! uncaughtException (Vue never saw it): "\${e.message}"\`));
app.mount("#app");
for (const id of ["sync", "async", "watch", "timer", "render"]) {
  log(\`click #\${id}\`);
  document.getElementById(id).click();
  await wait();
}
log("DOM after render error:", JSON.stringify(document.querySelector("#app").innerHTML));
process.exit(0);`,
      },
    ],
  },
];

export default augments;
