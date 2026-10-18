/**
 * Vue ULTRA — batch 09: rendering internals and performance (server-side
 * rendering and hydration, hydration mismatches, lazy hydration strategies,
 * Nuxt, Vapor mode and when to choose it, compiler optimisations, keyed list
 * diffing, custom renderers, performance, and virtual scrolling).
 *
 * Full CLAUDE.md treatment per question, matching the Angular, React and
 * Next.js ultra banks: a plain-language story first, `📌 Interview term:`
 * callouts, Verified sections quoting output that was actually produced, a
 * theme-aware `.iq-diagram` SVG, comparison tables, topic-specific pitfalls,
 * the §7 "How to Answer in an Interview" card, a glossary and a conclusion.
 *
 * Every "Verified" block was produced on Vue 3.5.44 unless it says otherwise.
 * Single-file examples were compiled with @vue/compiler-sfc and mounted in
 * jsdom with scripts/verify-vue-example.mjs (examples marked runnable passed
 * it as-is). SSR answers render with @vue/server-renderer and hydrate the HTML
 * in jsdom with createSSRApp, quoting the real mismatch warnings. Compiler
 * output comes from @vue/compiler-sfc compileTemplate()/compileScript().
 * Vapor claims were checked on vue 3.6.0-rc.12 (a release candidate, not a
 * stable release). Nuxt claims come from a private Nuxt 4.6.1 app that was
 * built, previewed and loaded in headless Chromium; browser timings (lazy
 * hydration, Vapor and list benchmarks) come from Playwright + Chromium.
 *
 * Conventions: SVG attributes double-quoted, no apostrophes inside <svg>, no
 * leading H1, `description` is plain markdown (no HTML).
 */
import type { VueAugment } from "./vue-augments.types";

const augments: VueAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does server-side rendering work in Vue (renderToString, hydration)?",
    seoDescription:
      "How Vue SSR works: renderToString turns components into HTML on the server, then createSSRApp hydrates that HTML in the browser instead of re-creating it.",
    description: `**Question presented to candidate:**
"Our Vue storefront is a client-rendered SPA and the marketing team says search engines and slow phones see a blank page first. Walk me through how server-side rendering works in Vue: what happens on the server, what gets sent, and what the browser does with it."

**What a strong answer should cover:**
- The server runs the same components and turns them into an **HTML string** with \`renderToString\` (or a stream) from \`vue/server-renderer\`; templates are compiled into string-concatenating \`ssrRender\` functions.
- Only \`setup()\`, \`onServerPrefetch\` and render run on the server. \`onMounted\` and other DOM hooks do not, and there is no reactivity-driven re-render.
- The browser receives real markup (fast first paint, crawlable), plus the JS bundle and **serialised state**.
- **Hydration**: \`createSSRApp(...).mount()\` walks the existing DOM, attaches event listeners and adopts the nodes instead of re-creating them; \`createApp\` would throw the markup away.
- The **app factory** pattern (fresh app and store per request) to avoid cross-request state pollution.
- Costs: server CPU, a Node runtime to host, code that must not touch \`window\` during setup, and hydration mismatches.

**Clarifying questions expected:**
- "Is the content per-user, or could some pages be prerendered at build time instead?"
- "Do we want to own the server setup, or use a framework such as Nuxt?"

**Code / implementation expected:** Optional — a minimal server that calls \`renderToString\` plus a client entry that hydrates with \`createSSRApp\`.`,
    answer: `**Target Audience:** Vue developers who have built client-side apps and now need to explain or adopt SSR. No prior SSR experience assumed.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every output block in the "Verified" sections was produced on Vue 3.5.44: rendered with <code>@vue/server-renderer</code> in Node and hydrated in jsdom with <code>createSSRApp</code>. Compiler output comes from <code>@vue/compiler-sfc</code> 3.5.44.

## 1. Why This Even Matters — A Story First

Imagine ordering flat-pack furniture. With a normal Vue SPA the shop sends you a box of parts and an instruction booklet. Until you have read the booklet and screwed everything together, you have nowhere to sit. That is **client-side rendering**: the browser downloads an empty <code>&lt;div id="app"&gt;</code>, downloads JavaScript, runs it, and only then is there something to look at.

Server-side rendering is the shop delivering the chair **already assembled**. You can sit on it the moment it arrives. But the chair still has a few moving parts (the recliner lever, the swivel) that need a technician to connect them. The technician arrives a bit later, does not rebuild the chair, and simply wires up the levers on the chair that is already there.

The pre-built chair is the **server-rendered HTML**. The technician is **hydration**. The crucial word is "already there": hydration adopts the existing DOM instead of rebuilding it, which is why it is fast, and why the server and the browser must agree exactly on what the chair looks like. If you want the bigger picture of the two rendering models first, see [client-side vs server-side rendering](/interview-question/what-is-the-difference-between-client-side-and-server-side-rendering).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the content the same for every visitor, or per-user? | Static content can be **prerendered** at build time; per-user pages need SSR on each request. |
| Which pages need SEO or a fast first paint? | SSR can be per route; an admin dashboard rarely needs it. |
| Do we already run Node in production? | SSR needs a server runtime (Node, a serverless function, an edge worker). |
| Hand-rolled or a framework? | [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue) gives routing, data fetching and state transfer out of the box. |
| How is data fetched today? | Data must be fetched on the server and handed to the client, or the client will render different HTML. |

## 3. The Core Idea: Same Components, Two Outputs

Vue SSR runs your **same components twice**, in two different environments, producing two different kinds of output.

📌 **Interview term: Server-side rendering (SSR)** — running the component tree on the server to produce an HTML string that is sent in the first response, so the browser can paint content before any JavaScript runs.

📌 **Interview term: renderToString** — the function from <code>vue/server-renderer</code> that takes an app created with <code>createSSRApp</code> and resolves to its HTML. Its siblings <code>renderToNodeStream</code>, <code>pipeToNodeWritable</code>, <code>renderToWebStream</code> and <code>pipeToWebWritable</code> produce the same HTML as a stream.

📌 **Interview term: Hydration** — on the client, mounting a <code>createSSRApp</code> app onto a container that already holds server HTML. Vue walks the existing DOM nodes alongside the virtual DOM, **adopts** each node, attaches event listeners and sets up reactivity. Nothing is re-created when the two match.

📌 **Interview term: Isomorphic (universal) code** — code that runs in both Node and the browser. Your component <code>setup()</code> runs in both places, so it must not touch <code>window</code> or <code>document</code> at the top level.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Vue SSR flow: the server renders HTML and state, the browser paints it, then createSSRApp hydrates the same DOM">
  <defs>
    <marker id="vssr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="28" text-anchor="middle">Server (Node)</text>
  <rect class="d-box-muted" x="30" y="44" width="260" height="250" rx="12"/>
  <rect class="d-box" x="60" y="70" width="200" height="44" rx="8"/>
  <text class="d-sub" x="160" y="97" text-anchor="middle">createSSRApp(App)</text>
  <path class="d-edge" d="M 160 116 L 160 150" marker-end="url(#vssr-arrow)"/>
  <rect class="d-box" x="60" y="156" width="200" height="44" rx="8"/>
  <text class="d-sub" x="160" y="183" text-anchor="middle">setup + onServerPrefetch</text>
  <path class="d-edge" d="M 160 202 L 160 236" marker-end="url(#vssr-arrow)"/>
  <rect class="d-box-accent" x="60" y="242" width="200" height="40" rx="8"/>
  <text class="d-text d-accent" x="160" y="267" text-anchor="middle">renderToString</text>
  <path class="d-edge-accent" d="M 292 262 L 412 262" marker-end="url(#vssr-arrow)"/>
  <text class="d-sub" x="352" y="250" text-anchor="middle">HTML + state</text>
  <text class="d-text" x="560" y="28" text-anchor="middle">Browser</text>
  <rect class="d-box-muted" x="420" y="44" width="270" height="250" rx="12"/>
  <rect class="d-box" x="450" y="242" width="210" height="40" rx="8"/>
  <text class="d-sub" x="555" y="267" text-anchor="middle">1. paint the HTML at once</text>
  <path class="d-edge" d="M 555 238 L 555 204" marker-end="url(#vssr-arrow)"/>
  <rect class="d-box" x="450" y="156" width="210" height="44" rx="8"/>
  <text class="d-sub" x="555" y="183" text-anchor="middle">2. download the JS bundle</text>
  <path class="d-edge" d="M 555 152 L 555 118" marker-end="url(#vssr-arrow)"/>
  <rect class="d-box-accent" x="450" y="70" width="210" height="44" rx="8"/>
  <text class="d-text d-accent" x="555" y="97" text-anchor="middle">3. createSSRApp.mount</text>
</svg>

The left column runs once per request on the server. The right column reads bottom-up: the browser paints the HTML immediately, then downloads the bundle, then hydrates. Between steps 1 and 3 the page is visible but not interactive, which is the window that [lazy hydration](/interview-question/what-is-lazy-hydration-in-vue-3-5-hydrate-strategies-idle-visible-interaction) tries to shrink.

## 4. What Runs Where

| Runs on the server | Runs only in the browser |
| :--- | :--- |
| <code>setup()</code> / <code>&lt;script setup&gt;</code> body | <code>onBeforeMount</code>, <code>onMounted</code> |
| <code>onServerPrefetch</code> (awaited before rendering) | <code>onUpdated</code>, <code>onUnmounted</code> and the other DOM hooks |
| The render function (as an <code>ssrRender</code> string builder) | Event listeners (<code>@click</code> handlers attach at hydration) |
| <code>computed</code> values read during render | Watchers firing after state changes; there is no re-render on the server |

Two consequences matter in interviews. First, reactivity on the server is effectively a one-shot: Vue reads your state once, prints it, and is done. Second, anything that needs the DOM belongs in [onMounted](/interview-question/what-are-vue-lifecycle-hooks), which is exactly where you move browser-only code when fixing a [hydration mismatch](/interview-question/how-do-you-diagnose-and-fix-hydration-mismatches-in-vue-ssr-nuxt-3).

## 5. Verified: The Server Compiles Templates to String Builders

On the client, the [template compiler](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t) emits a function that returns virtual DOM nodes. For SSR the same SFC is compiled differently: into a function that pushes strings. This is the real output of <code>compileTemplate({ ssr: true })</code> for a small card:

\`\`\`js
import { mergeProps as _mergeProps } from "vue"
import { ssrRenderAttrs as _ssrRenderAttrs, ssrInterpolate as _ssrInterpolate } from "vue/server-renderer"

export function ssrRender(_ctx, _push, _parent, _attrs) {
  _push(\`<div\${
    _ssrRenderAttrs(_mergeProps({ class: "card" }, _attrs))
  }><h2>Static title</h2><p>\${
    _ssrInterpolate(_ctx.message)
  }</p><button>clicked \${
    _ssrInterpolate(_ctx.count)
  }</button></div>\`)
}
\`\`\`

No virtual DOM nodes are created for this component on the server: static parts are literal strings and dynamic parts are escaped and concatenated. That is why Vue SSR is fast. <code>ssrInterpolate</code> HTML-escapes values, verified below.

## 6. Verified: renderToString, Then Hydration in jsdom

A small app (a heading, a list and a counter component written with <code>h()</code>) was rendered with <code>renderToString</code>, the HTML was placed in a jsdom document, and the same app was mounted with <code>createSSRApp</code>. Every element was captured before mounting and compared by identity afterwards:

\`\`\`
[e1] server HTML: <!--[--><h1>Hello</h1><ul><li>SSR</li><li>hydration</li></ul><button>clicked 1</button><!--]-->
[e1] client DOM: <!--[--><h1>Hello</h1><ul><li>SSR</li><li>hydration</li></ul><button>clicked 1</button><!--]-->
[e1] elements reused from server HTML: 5/5
[e1] after click: <button>clicked 2</button>
\`\`\`

Three things to notice:

- <code>&lt;!--[--&gt;</code> and <code>&lt;!--]--&gt;</code> are **fragment anchors**. The root rendered three siblings, so the server marked where the fragment starts and ends; hydration uses them to match nodes.
- **5/5 elements were reused.** Hydration did not create a single element; it adopted the server ones.
- The click handler works afterwards. The server HTML had no listeners; hydration attached them.

Now the same markup mounted with the wrong function:

\`\`\`
[createApp over SSR HTML] elements reused from server HTML: 0/3
[createSSRApp over SSR HTML] elements reused from server HTML: 3/3
\`\`\`

<code>createApp</code> does not hydrate. It cleared the container and rendered fresh nodes, so the user sees the page flash and you lose the point of SSR. The client entry **must** use <code>createSSRApp</code>.

## 7. Verified: Async Data, Escaping, Teleports and Streaming

One component used <code>onServerPrefetch</code> with a 200 ms fake fetch, printed user input containing a script tag, set a value on the SSR context and rendered a <code>&lt;Teleport to="#modals"&gt;</code>:

\`\`\`
[server] setup() runs on the server
[renderToString] html: <main><h1>Fast header</h1><p>User input: &lt;script&gt;alert(1)&lt;/script&gt;</p><!--teleport start--><!--teleport end--><p>fetched on server</p></main>
[renderToString] ctx.title: Set from a component | ctx.teleports: {"#modals":"<!--teleport start anchor--><div class=\\"modal\\">teleported</div><!--teleport anchor-->"}
[renderToString] took ~ 215 ms
\`\`\`

- <code>onServerPrefetch</code> was **awaited**: the paragraph contains the fetched value, and the whole render took about 215 ms because it waited.
- Interpolated text is **escaped**. Text interpolation is XSS-safe; only [v-html](/interview-question/what-is-v-html-and-what-is-the-risk-of-using-it) bypasses this.
- The <code>onMounted</code> inside the same component never printed. DOM hooks do not run on the server.
- [Teleport](/interview-question/what-is-teleport-in-vue-3) content is **not** in the main HTML. It lands in <code>ctx.teleports["#modals"]</code>, and your server template must inject it into the page at that target.
- <code>useSSRContext()</code> gives components access to the same context object, which is how head tags or a status code get out of a component.

With <code>renderToNodeStream</code> the fast part was sent before the slow part finished:

\`\`\`
[stream +2ms] chunk: <main><h1>Fast header</h1><p>User input: &lt;script&gt;alert(1)&lt;/script&gt;</p><!--teleport start--><!--teleport end-->
[stream +205ms] chunk: <p>fetched on server</p>
[stream +206ms] chunk: </main>
\`\`\`

📌 **Interview term: Streaming SSR** — sending HTML in chunks as each part is ready, so the browser can start parsing and fetching assets before the slowest component finishes. The trade-off: once the first chunk has gone, you can no longer change response headers or the status code.

## 8. State Transfer: Why the Client Must Start From the Same Data

The server fetched data and rendered it. If the client then starts with empty state, its first render produces different HTML and hydration fails. So the server **serialises** the state into the page, and the client creates the app from it. The working example (verified end to end: a real HTTP server on a local port, the page fetched and loaded into jsdom, the client entry run against it) prints:

\`\`\`
[curl] body: <div id="app"><main><h1>Todos</h1><ul><li>Write docs</li><li>Ship 3.5</li></ul><button>Add (2)</button></main></div>
[curl] state: window.__STATE__ = {"todos":["Write docs","Ship 3.5"]}
[client] same <button> node after hydration: true
[client] after click: <main><h1>Todos</h1><ul><li>Write docs</li><li>Ship 3.5</li><li>Task 3</li></ul><button>Add (3)</button></main>
\`\`\`

📌 **Interview term: App factory** — a function such as <code>createApp(initialState)</code> that builds a **new** app, router and store for each request. A module-level <code>const store = reactive(...)</code> on the server is shared by every request in the process, so one user could see another user's data. With [Pinia](/interview-question/what-is-pinia-and-why-use-it), you create a new Pinia per request and serialise <code>pinia.state.value</code>.

Two security notes. A plain <code>JSON.stringify</code> inside a <code>&lt;script&gt;</code> tag can be broken out of by a value containing <code>&lt;/script&gt;</code>, so the example escapes <code>&lt;</code> as <code><</code>; Nuxt uses the <code>devalue</code> serialiser, which also handles <code>Date</code>, <code>Map</code> and repeated references. And never serialise secrets: everything in that script is public.

## 9. SSR vs CSR vs Prerendering

| | Client-side rendering | SSR (per request) | Prerendering (SSG) |
| :--- | :--- | :--- | :--- |
| First response | Empty shell + JS | Full HTML for this request | Full HTML built at deploy time |
| First paint | After JS runs | Immediately | Immediately |
| Interactive | After JS runs | After hydration | After hydration |
| Server needed | Static hosting | A Node or edge runtime | Static hosting |
| Per-user content | Yes | Yes | No (or client-side only) |
| Main risk | SEO, slow devices | Server load, hydration mismatches | Stale content, build time |

In practice frameworks mix them per route: Nuxt <code>routeRules</code> can prerender <code>/about</code>, server-render <code>/product/:id</code> and make <code>/dashboard</code> client-only.

## 10. Common Pitfalls

- **Mounting with <code>createApp</code> on the client.** Verified above: 0 of 3 elements reused. The client must call <code>createSSRApp</code>.
- **Singleton state on the server.** A store created at module level leaks between requests. Always build app, router and store inside a factory.
- **Touching <code>window</code> in setup.** It throws on the server (<code>window is not defined</code>). Move it into <code>onMounted</code> or guard it with <code>import.meta.env.SSR</code>.
- **Forgetting to transfer state.** Data fetched on the server but not serialised means the client renders different HTML and you get a mismatch, then a second fetch.
- **Dropping teleported content.** <code>ctx.teleports</code> must be injected into your HTML template, or modals rendered on the server simply vanish.
- **Using values that differ per environment** (<code>Date.now()</code>, <code>Math.random()</code>, locale formatting) in the first render. Use [useId()](/interview-question/useid-vs-getcurrentinstance-how-do-you-generate-ssr-safe-ids-in-vue-3-5) for IDs and move the rest to <code>onMounted</code>.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"The server runs the same components and turns them into HTML with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderToString</code>, then the browser hydrates that HTML with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createSSRApp</code> instead of rebuilding it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the server side works:</strong> <span style="color:#f0e2c8;">"Templates compile into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ssrRender</code> functions that just concatenate escaped strings. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setup</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onServerPrefetch</code> run and are awaited; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> never runs there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What hydration does:</strong> <span style="color:#f0e2c8;">"On the client Vue walks the existing DOM next to the virtual DOM, adopts every node and attaches event listeners. Using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp</code> instead throws the server markup away."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Make it correct:</strong> <span style="color:#f0e2c8;">"Create a fresh app, router and store per request, serialise the state into the page, and make the first client render produce exactly the same HTML, or you get a hydration mismatch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">"You get fast first paint and crawlable HTML, and you pay with server CPU, a runtime to host, and a page that is visible but not interactive until hydration finishes. Nuxt packages all of this."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">renderToString</code> and streaming?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderToString</code> waits for every async component and resolves once with the whole page. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">renderToNodeStream</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pipeToWebWritable</code> flush chunks as they are ready; in a test, the header chunk left after 2 ms and the slow prefetched paragraph 200 ms later. Once streaming starts you cannot change headers or the status code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the server create a new app per request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Node server is one long-lived process. Module-level reactive state or a single Pinia instance would be shared by every visitor, so one user could render another user's data. An app factory gives each request its own app, router and store.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does data fetched on the server reach the client?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onServerPrefetch</code> or an async setup, then serialise the state (for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pinia.state.value</code>) into a script tag, escaping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> or using devalue. The client builds its store from that before mounting, so its first render matches and it does not refetch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to Teleport content during SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is not in the main HTML. The server puts it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ssrContext.teleports</code> keyed by target, and your HTML template has to inject it at that target. Hydration then matches it there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Logged-in dashboards with no SEO need, apps that must run on static hosting only, or pages where prerendering at build time gives the same benefit with no server. SSR is a per-route decision, not all or nothing.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SSR** | Rendering components to HTML on the server for each request |
| **renderToString** | <code>vue/server-renderer</code> function that resolves to an app as HTML |
| **Streaming SSR** | Sending HTML in chunks as parts become ready |
| **Hydration** | Mounting over server HTML, adopting nodes and attaching listeners |
| **createSSRApp** | The app constructor that hydrates instead of re-rendering |
| **Fragment anchors** | <code>&lt;!--[--&gt;</code> / <code>&lt;!--]--&gt;</code> comments marking multi-root output |
| **Isomorphic code** | Code that runs on both server and client |
| **App factory** | A function that builds a fresh app and store per request |
| **onServerPrefetch** | Hook whose promise the server awaits before rendering |
| **SSR context** | Per-request object for teleports, head tags and status codes |

---
**Conclusion:** Vue SSR runs the same components on the server, where templates compile into string builders and <code>renderToString</code> (or a stream) produces HTML after awaiting <code>onServerPrefetch</code>. The browser paints that HTML at once, then <code>createSSRApp</code> hydrates it: verified on 3.5.44, every server element was adopted rather than re-created, while <code>createApp</code> threw them all away. Make it work by building a fresh app and store per request, serialising state safely, keeping browser-only code in <code>onMounted</code>, and making the first client render produce exactly the HTML the server sent.`,
    examples: [
      {
        label: "Minimal SSR round trip: app factory, renderToString server, hydrating client",
        tech: "js",
        runnable: false,
        code: `// ── app.js ──────────────────────────────────────────────
// app.js: shared by server and client. A FACTORY, so every request gets fresh state.
import { createSSRApp, h, ref } from "vue";

export function createApp(initialState) {
  const todos = ref(initialState.todos);
  const app = createSSRApp({
    setup() {
      const add = () => todos.value.push(\`Task \${todos.value.length + 1}\`);
      return () => h("main", [
        h("h1", "Todos"),
        h("ul", todos.value.map((t) => h("li", { key: t }, t))),
        h("button", { onClick: add }, \`Add (\${todos.value.length})\`),
      ]);
    },
  });
  return { app, state: { todos } };
}

// ── server.js ───────────────────────────────────────────
// server.js: render to a string, embed the state, send one HTML document.
import http from "node:http";
import { renderToString } from "vue/server-renderer";
import { createApp } from "./app.js";

http.createServer(async (req, res) => {
  if (req.url !== "/") return res.writeHead(404).end();
  const initialState = { todos: ["Write docs", "Ship 3.5"] }; // e.g. from a database
  const { app } = createApp(initialState);
  const html = await renderToString(app);
  // JSON inside <script>: escape "<" so a value like "</script>" cannot end the tag early.
  const state = JSON.stringify(initialState).replace(/</g, "\\\\u003c");
  res.setHeader("content-type", "text/html");
  res.end(\`<!doctype html><html><body>
<div id="app">\${html}</div>
<script>window.__STATE__ = \${state}</script>
<script type="module" src="/client.js"></script>
</body></html>\`);
}).listen(5265);

// ── client.js (bundled for the browser by Vite or esbuild) ──
// client.js: same app, same state, then hydrate the existing DOM instead of re-creating it.
import { createApp } from "./app.js";
const { app } = createApp(window.__STATE__);
app.mount("#app"); // createSSRApp + mount over server markup = hydration`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you diagnose and fix hydration mismatches in Vue SSR / Nuxt 3?",
    seoDescription:
      "Read Vue hydration mismatch warnings, find the cause (dates, window, random IDs, bad HTML) and fix it with onMounted, useId or ClientOnly.",
    description: `**Question presented to candidate:**
"After we moved our Nuxt app to SSR, the console shows 'Hydration completed but contains mismatches' on some pages, and a dark-mode class sometimes appears wrong. How do you find out what is mismatching, and how do you fix it properly rather than just hiding the warning?"

**What a strong answer should cover:**
- What a mismatch is: the first client render does not produce the HTML the server sent, so hydration cannot simply adopt the DOM.
- Reading the dev warning: the **type** (text, children, class, style, attribute, node), the server value vs the client value, and the component trace.
- Typical causes: \`Date\`/\`Math.random()\`, \`window\`/\`localStorage\` in setup, locale or time-zone formatting, missing state transfer, and **invalid HTML nesting** that the browser parser rewrites.
- What Vue does about it: text and node mismatches are patched, while class, style and attribute mismatches are **check-only** and stay wrong in production.
- The fixes: move browser-only work to \`onMounted\`, \`useId()\` for IDs, transfer state (\`useState\`/\`useFetch\` in Nuxt), \`<ClientOnly>\`, and \`data-allow-mismatch\` only for genuinely expected differences.
- Production diagnostics: \`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__\`, or \`debug: { hydration: true }\` in Nuxt.

**Clarifying questions expected:**
- "Does it happen in development too, or only in production builds?"
- "Is the differing value user-specific (theme, locale, time zone) or random?"

**Code / implementation expected:** Optional — a component that renders a neutral value on the server and fills in a browser-only value in \`onMounted\`.`,
    answer: `**Target Audience:** Developers running Vue SSR or Nuxt who see hydration warnings and need a method, not guesswork. Assumes you know what SSR is.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every warning quoted here is real output. The plain-Vue cases were server-rendered with <code>@vue/server-renderer</code> 3.5.44 and hydrated in jsdom with <code>createSSRApp</code>. The Nuxt cases come from a Nuxt 4.6.1 app (Vue 3.5.44) that was built, run with <code>nuxt dev</code> and as a production server, and loaded in headless Chromium. Nuxt 3 itself was **not** installed; see section 8 for why the same advice applies.

## 1. Why This Even Matters — A Story First

A museum ships a giant jigsaw puzzle already assembled and glued to a board. When it arrives, a curator walks along the board with the picture on the box and sticks a little label onto each piece: "this is the sky", "this is a tree". She never moves pieces; she only labels them.

Then she reaches a spot where the box says "red barn" and the board shows a **blue** barn. What should she do? She cannot just label it and walk on, because the label would be a lie. So she either repaints that piece, or (for some kinds of differences) she writes a note in her log and moves on, leaving the wrong colour in place.

That is hydration. The board is the server HTML, the box is the client's first render, and the curator is Vue. A **hydration mismatch** is the blue barn. This doc is about reading the curator's log, working out why the barn came out blue, and fixing the source rather than the symptom. For the hydration process itself, see [how SSR and hydration work](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you see it in development, or only in production? | Production builds print one summary line and no details unless a flag is on (section 6). |
| Which part of the page looks wrong after load? | Class, style and attribute mismatches are **not** corrected, so they are visible bugs. Text mismatches are patched and usually just flicker. |
| Does it depend on the user (theme, locale, time zone)? | Points to cookies or browser APIs that the server cannot see. |
| Is it every load, or intermittent? | Intermittent points to time, randomness or race conditions in data fetching. |
| Plain Vue SSR or Nuxt? | Nuxt adds tools: <code>useState</code>, <code>useFetch</code> payloads, <code>&lt;ClientOnly&gt;</code>, <code>debug.hydration</code>. |

## 3. The Core Idea: Same Input, Same Output

📌 **Interview term: Hydration mismatch** — during hydration, a DOM node from the server does not match what the client virtual DOM expects at that position: different text, a different element, a different number of children, or different <code>class</code>, <code>style</code> or attributes.

The rule is simple: **the first client render must be a pure function of the same data the server used.** Anything that can differ between Node and the browser breaks it:

- **Time and randomness:** <code>new Date()</code>, <code>Date.now()</code>, <code>Math.random()</code>, generated IDs.
- **Environment:** <code>window</code>, <code>localStorage</code>, <code>matchMedia</code>, viewport size, cookies read only on the client.
- **Formatting:** <code>toLocaleString()</code> and <code>Intl</code> use the server locale and time zone on one side and the user's on the other.
- **Missing state transfer:** data fetched on the server but not serialised, so the client renders the empty state.
- **Invalid HTML:** markup the browser parser rewrites before Vue ever sees it, such as a <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Hydration compares each server DOM node with the client vnode. Text and node mismatches are patched, class style and attribute mismatches are only reported">
  <defs>
    <marker id="vhm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="180" height="50" rx="10"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">server DOM node</text>
  <rect class="d-box" x="30" y="190" width="180" height="50" rx="10"/>
  <text class="d-text" x="120" y="220" text-anchor="middle">client vnode</text>
  <path class="d-edge" d="M 214 66 L 290 130" marker-end="url(#vhm-arrow)"/>
  <path class="d-edge" d="M 214 214 L 290 152" marker-end="url(#vhm-arrow)"/>
  <rect class="d-box-accent" x="296" y="116" width="120" height="50" rx="10"/>
  <text class="d-text d-accent" x="356" y="146" text-anchor="middle">compare</text>
  <path class="d-edge" d="M 420 130 L 470 76" marker-end="url(#vhm-arrow)"/>
  <path class="d-edge" d="M 420 152 L 470 204" marker-end="url(#vhm-arrow)"/>
  <rect class="d-box" x="476" y="40" width="200" height="64" rx="10"/>
  <text class="d-text" x="576" y="66" text-anchor="middle">text or node</text>
  <text class="d-sub" x="576" y="88" text-anchor="middle">warn, then patch the DOM</text>
  <rect class="d-box-muted" x="476" y="176" width="200" height="64" rx="10"/>
  <text class="d-text" x="576" y="202" text-anchor="middle">class, style, attr</text>
  <text class="d-sub" x="576" y="224" text-anchor="middle">warn only, DOM stays</text>
</svg>

The lower branch is the dangerous one. Vue reports it, but deliberately does not fix it, so the wrong value survives into the live page.

## 4. Verified: What Each Mismatch Looks Like

Each case below renders a component on the server, places the HTML in jsdom, and hydrates it with <code>createSSRApp</code>. A global flag makes the component render differently on each side, which is exactly what <code>Date</code> or <code>window</code> do in real code.

**Text** (server says "server", client says "client"):

\`\`\`
[text] server HTML: <p>Rendered on the server</p>
[text] client DOM: <p>Rendered on the client</p>
[text] WARN: [Vue warn]: Hydration text content mismatch on [object HTMLParagraphElement] 
  - rendered on server: Rendered on the server
  - expected on client: Rendered on the client 
  at <App>
[text] WARN: ERROR Hydration completed but contains mismatches.
\`\`\`

The text was **patched** to the client value. The last line is <code>console.error</code>, and it is printed only **once per page**: the later cases in the same run did not print it again, because Vue keeps a module-level "already logged" flag.

**Class** (the dark-mode bug from the question):

\`\`\`
[cls] server HTML: <div class="light">theme</div>
[cls] client DOM: <div class="light">theme</div>
[cls] WARN: [Vue warn]: Hydration class mismatch on [object HTMLDivElement] 
  - rendered on server: class="light"
  - expected on client: class="dark"
  Note: this mismatch is check-only. The DOM will not be rectified in production due to performance overhead.
  You should fix the source of the mismatch. 
  at <App>
\`\`\`

The DOM **kept <code>class="light"</code>** even though the client state says dark. Attribute mismatches behave the same (an <code>id</code> stayed <code>f-1</code> when the client wanted <code>f-2</code>). This is the trap: the warning scrolls past and the page is visibly wrong.

**Node** (a different element at that position):

\`\`\`
[node] server HTML: <div><em>placeholder</em></div>
[node] client DOM: <div><span>client widget</span></div>
[node] elements reused from server HTML: 1/2
[node] WARN: [Vue warn]: Hydration node mismatch:
- rendered on server: [object HTMLElement]  
- expected on client: span 
  at <App>
\`\`\`

Vue threw away the <code>&lt;em&gt;</code> and created a <code>&lt;span&gt;</code>: only 1 of 2 elements was reused.

**Invalid nesting** (a <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>, with identical data on both sides):

\`\`\`
[nesting] server HTML: <p><div>block inside a paragraph</div></p>
[nesting] client DOM: <p><div>block inside a paragraph</div></p><div>block inside a paragraph</div><p></p>
[nesting] WARN: [Vue warn]: Hydration children mismatch on [object HTMLParagraphElement] 
Server rendered element contains fewer child nodes than client vdom. 
  at <App>
\`\`\`

The server sent valid-looking text, but the HTML parser does not allow a <code>&lt;div&gt;</code> in a <code>&lt;p&gt;</code>, so it closed the paragraph early and produced <code>&lt;p&gt;&lt;/p&gt;&lt;div&gt;...&lt;/div&gt;&lt;p&gt;&lt;/p&gt;</code>. Vue then saw an empty <code>&lt;p&gt;</code>, created the missing child, and the page ended up with **duplicated content**. No amount of state debugging finds this one; you have to read the HTML. The same happens with a <code>&lt;tr&gt;</code> outside a <code>&lt;tbody&gt;</code> or nested <code>&lt;a&gt;</code> tags.

## 5. Fixes, Verified

**Move browser-only work to <code>onMounted</code>.** It never runs on the server, so the first client render matches; the real value arrives one update later:

\`\`\`
[mounted] server HTML: <p>Rendered on the server</p>
[mounted] client DOM: <p>Rendered on the client</p>
[mounted] elements reused from server HTML: 1/1
\`\`\`

No warning: hydration matched "server", then <code>onMounted</code> changed it. See [lifecycle hooks](/interview-question/what-are-vue-lifecycle-hooks) for where this sits.

**Use <code>useId()</code> for IDs.** It is deterministic per component position, so both sides produce the same value (<code>v-0</code> here, no warning). Never build IDs from <code>Math.random()</code> or a module-level counter. The details are in [useId vs getCurrentInstance](/interview-question/useid-vs-getcurrentinstance-how-do-you-generate-ssr-safe-ids-in-vue-3-5).

**Use <code>data-allow-mismatch</code> for genuinely expected differences** (added in Vue 3.5, September 2024, according to the <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Vue 3.5 announcement</a>). A timestamp is the classic case. Its value scopes what is allowed, and it covers the element's descendants:

\`\`\`
[allow="text" with a class mismatch] WARN: [Vue warn]: Hydration class mismatch on [object HTMLDivElement] 
[allow="class" with a class mismatch] elements reused from server HTML: 1/1
[allow="" with a class mismatch] elements reused from server HTML: 1/1
[attribute on a parent, text mismatch in child] elements reused from server HTML: 2/2
\`\`\`

So <code>"text"</code> does not silence a class mismatch, <code>"class"</code> does, an empty value allows every type, and the attribute on a parent covers a child. Remember it only hides the warning: a class mismatch under it is still not corrected.

The runnable example combines the three fixes. Server-rendered and then hydrated in jsdom with a one-second gap (so the timestamp really differs), it hydrated cleanly; without the attribute it warned:

\`\`\`
[server] <!--[--><p>Viewport width: measuring...</p><p data-allow-mismatch="text">Rendered at 14:49:20</p><label for="v-0">Email</label><input id="v-0" type="email"><!--]-->
[client] <!--[--><p>Viewport width: 1024px</p><p data-allow-mismatch="text">Rendered at 14:49:21</p><label for="v-0">Email</label><input id="v-0" type="email"><!--]-->
[client] no hydration warnings
----
[warn] [Vue warn]: Hydration text content mismatch on [object HTMLParagraphElement] 
  - rendered on server: Rendered at 14:49:22
  - expected on client: Rendered at 14:49:24 
  at <NoAllow>
\`\`\`

**Transfer state instead of recomputing it.** If the value comes from data, serialise the server data and start the client from it. In Nuxt, <code>useFetch</code>, <code>useAsyncData</code> and <code>useState</code> do this through the page payload.

**Render it on the client only.** For a widget that cannot render on the server at all (a chart reading canvas size, a map), Nuxt's <code>&lt;ClientOnly&gt;</code> renders a fallback on the server and the real thing after mount. In plain Vue, use a <code>mounted</code> flag and <code>v-if</code>.

## 6. Diagnosing in Production

Production builds strip the details. Verified with a production bundle of the same mismatching component:

\`\`\`
=== production build, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__=false
[warn] ERROR Hydration completed but contains mismatches.
=== production build, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__=true
[warn] [Vue warn]: Hydration text content mismatch on [object HTMLParagraphElement] 
  - rendered on server: Rendered at 14:49:38
  - expected on client: Rendered at 14:49:39
[warn] ERROR Hydration completed but contains mismatches.
\`\`\`

📌 **Interview term: <code>__VUE_PROD_HYDRATION_MISMATCH_DETAILS__</code>** — a compile-time feature flag (introduced in Vue 3.4, per the <a href="https://blog.vuejs.org/posts/vue-3-4" target="_blank" rel="noopener noreferrer">Vue 3.4 announcement</a>) that keeps the detailed mismatch messages in production bundles. Set it with Vite <code>define</code>, temporarily, because it adds bundle size.

A working method when a report comes in:

1. **Reproduce in dev**, where the warning names the type, both values and the component trace.
2. **Compare raw HTML with the live DOM.** <code>curl</code> the page (or View Source) and diff it against the Elements panel. If the raw HTML is already "wrong", it is invalid nesting or a parser rewrite.
3. **Read the type.** Text: a value differs. Children or node: a branch (<code>v-if</code>, <code>v-for</code> length) differs. Class or style: theme or responsive logic.
4. **Bisect** by wrapping suspect subtrees in a client-only boundary until the warning disappears.
5. **Fix the source**, and only then consider <code>data-allow-mismatch</code> for differences that are truly expected.

## 7. Verified in Nuxt 4.6.1

A Nuxt page rendered <code>import.meta.server ? "server" : "client"</code>. Under <code>nuxt dev</code>, Chromium logged:

\`\`\`
[console.warning] [Vue warn]: Hydration text content mismatch on JSHandle@node 
  - rendered on server: Rendered on the server
  - expected on client: Rendered on the client 
  at <Mismatch onVnodeUnmounted=fn<onVnodeUnmounted> onVnodeMounted=fn<onVnodeSettled> onVnodeUpdated=fn<onVnodeSettled>  ... > 
  at <RouteProvider key="/mismatch" ... > 
  at <RouterView name=undefined route=undefined > 
  at <NuxtPage> 
  at <NuxtLayoutProvider ... > 
  at <NuxtLayout> 
  at <App key=4 > 
  at <NuxtRoot>
[console.error] Hydration completed but contains mismatches.
\`\`\`

The component trace starts at the page file (<code>&lt;Mismatch&gt;</code> is <code>pages/mismatch.vue</code>). The dev server also forwarded the same warning to the **terminal** as <code>WARN [console.warn] [Vue warn]: Hydration text content mismatch...</code>, which is handy in CI logs.

The production server (<code>node .output/server/index.mjs</code>) printed only <code>Hydration completed but contains mismatches.</code> Adding <code>debug: { hydration: true }</code> to <code>nuxt.config.ts</code> and rebuilding brought the details back; the Nuxt 4.6.1 schema maps that option straight to <code>__VUE_PROD_HYDRATION_MISMATCH_DETAILS__</code>.

The fixed page in the examples (<code>useState</code> for a server value, <code>onMounted</code> for the time zone, <code>&lt;ClientOnly&gt;</code> with a <code>#fallback</code>) produced this server HTML and hydrated with **no** console output:

\`\`\`
<main><p class="greeting">Hello from the server</p><p class="tz">Your time zone: detecting...</p><!--[--><p class="widget">loading widget</p><!--]--></main>
[dom] <main><p class="greeting">Hello from the server</p><p class="tz">Your time zone: UTC</p><p class="widget">browser-only widget</p></main>
\`\`\`

## 8. A Note on "Nuxt 3"

The question says Nuxt 3, but Nuxt 3 reached end of life on 31 July 2026 according to the banner on the <a href="https://nuxt.com/docs/3.x/migration/overview" target="_blank" rel="noopener noreferrer">Nuxt 3.x docs</a>, and the current major on npm is Nuxt 4 (4.6.1 at the time of writing). The mismatch detection is Vue's own code, so the warnings and fixes are the same in both. <code>&lt;ClientOnly&gt;</code>, <code>useState</code>, <code>useFetch</code> and the <code>debug</code> option exist in Nuxt 3 as well, but they were only **run** here on Nuxt 4.6.1. Background on the framework is in [What is Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue).

## 9. Fix Cheat Sheet

| Symptom in the warning | Likely cause | Fix |
| :--- | :--- | :--- |
| Text mismatch with a time or number | <code>Date</code>, <code>Math.random()</code>, locale formatting | Transfer the value, or render in <code>onMounted</code>; <code>data-allow-mismatch="text"</code> if expected |
| Class or style mismatch | Theme or breakpoint read from <code>localStorage</code> or <code>matchMedia</code> | Put the preference in a cookie the server can read, or apply it after mount |
| Attribute mismatch on <code>id</code> / <code>for</code> | Random or counter-based IDs | <code>useId()</code> |
| Node or children mismatch | <code>v-if</code> on <code>typeof window</code>, different list length | Same data on both sides; client-only boundary for real browser widgets |
| Children mismatch with duplicated content | Invalid HTML nesting | Fix the markup (<code>&lt;div&gt;</code> in <code>&lt;p&gt;</code>, missing <code>&lt;tbody&gt;</code>) |
| Only "contains mismatches" in production | Details stripped | <code>__VUE_PROD_HYDRATION_MISMATCH_DETAILS__</code> or Nuxt <code>debug.hydration</code> |

## 10. Common Pitfalls

- **Silencing instead of fixing.** <code>data-allow-mismatch</code> on a class mismatch hides the warning, but the wrong class stays in the DOM.
- **Assuming Vue corrects everything.** Text and nodes are patched; class, style and attributes are not, so the page stays wrong.
- **Wrapping half the app in <code>&lt;ClientOnly&gt;</code>.** It works, but that content loses SSR (no SEO, later paint). Use it for genuinely browser-only widgets.
- **Hunting state for an HTML bug.** If the raw server HTML already differs from the DOM, the parser rewrote invalid nesting; the warning will say "children mismatch".
- **Theme flash fixed with <code>onMounted</code> only.** That avoids the warning but flashes the wrong theme. Persist the theme in a cookie so the server renders the right class.
- **Testing only in dev.** Production hides details, so add the flag to a staging build when a user report cannot be reproduced locally. For a framework comparison, Next.js handles the same problem as covered in [hydration errors in Next.js](/interview-question/what-is-hydration-in-next-js-and-what-causes-a-hydration-error).

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"A hydration mismatch means the first client render did not produce the HTML the server sent, so Vue cannot simply adopt that DOM node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Read the warning:</strong> <span style="color:#f0e2c8;">"The dev warning names the type: text, children, node, class, style or attribute, with the server value, the client value and the component trace. In production you only get one summary line unless you enable the details flag."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Know what Vue does:</strong> <span style="color:#f0e2c8;">"Text and node mismatches are patched. Class, style and attribute mismatches are check-only, so the wrong value stays in the DOM. That is why a dark-mode class can be visibly wrong."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typical causes:</strong> <span style="color:#f0e2c8;">"Dates and random values, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> in setup, locale and time-zone formatting, missing state transfer, and invalid HTML nesting that the browser parser rewrites."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Fix the source:</strong> <span style="color:#f0e2c8;">"Browser-only work goes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code>, IDs come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useId()</code>, data is transferred with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code>, real browser widgets go in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ClientOnly</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data-allow-mismatch</code> is only for expected differences like timestamps."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Vue not just fix class mismatches?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Checking is cheap but rewriting every attribute during hydration would cost time on every page load. Vue reports it in development (the warning literally says the DOM will not be rectified in production) and expects you to fix the source.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you debug a mismatch that only happens in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__VUE_PROD_HYDRATION_MISMATCH_DETAILS__</code> set to true (Nuxt: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">debug: { hydration: true }</code>) on a staging build, and diff the raw server HTML against the live DOM. A difference already in the raw HTML means the parser rewrote invalid markup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid a theme flash and a mismatch at the same time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the theme in a cookie so the server can read it and render the right class. Reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localStorage</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onMounted</code> avoids the warning but still flashes the wrong theme for a frame.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">data-allow-mismatch</code> a fix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is a declaration that a difference is expected. It is scoped by type (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">style</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attribute</code>) and covers descendants. A class mismatch under it is still not corrected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is special about invalid nesting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The data is identical on both sides, but the browser parser restructures the server HTML (a div inside a p closes the p). Vue then sees fewer children than expected and creates them again, which duplicates content.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hydration mismatch** | A server DOM node differs from what the client first render expects |
| **Check-only mismatch** | Class, style or attribute difference that is reported but not corrected |
| **data-allow-mismatch** | Attribute (Vue 3.5) that suppresses expected mismatch warnings, optionally by type |
| **useId()** | Vue 3.5 API for IDs that match on server and client |
| **ClientOnly** | Nuxt component that renders a fallback on the server and its slot after mount |
| **useState** | Nuxt composable for state serialised from server to client |
| **__VUE_PROD_HYDRATION_MISMATCH_DETAILS__** | Flag that keeps detailed mismatch messages in production |
| **Invalid nesting** | Markup the HTML parser rewrites, such as a div inside a p |

---
**Conclusion:** A hydration mismatch means the first client render did not reproduce the server HTML. Read the warning type first: in Vue 3.5.44, text and node mismatches were patched, but class and attribute mismatches were left wrong in the DOM, and invalid nesting produced duplicated content. Fix the source by moving browser-only work to <code>onMounted</code>, using <code>useId()</code>, transferring state, or rendering a real browser-only widget on the client; reserve <code>data-allow-mismatch</code> for genuinely expected differences. For production reports, turn on <code>__VUE_PROD_HYDRATION_MISMATCH_DETAILS__</code> (Nuxt: <code>debug: { hydration: true }</code>), which was verified to restore the details on Nuxt 4.6.1.`,
    examples: [
      {
        label: "Hydration-safe patterns: onMounted for browser values, data-allow-mismatch, useId",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, onMounted, useId } from "vue";

// 1. Browser-only value: start with something the server can render too,
//    then switch to the real value after mount (onMounted never runs on the server).
const width = ref(null);
onMounted(() => { width.value = window.innerWidth; });

// 2. A value that legitimately differs (a timestamp): render it, but tell Vue
//    the text mismatch is expected with data-allow-mismatch.
const renderedAt = new Date().toISOString().slice(11, 19);

// 3. IDs that must match on both sides: useId() is deterministic per component position.
const emailId = useId();
</script>

<template>
  <p>Viewport width: {{ width === null ? "measuring..." : width + "px" }}</p>
  <p data-allow-mismatch="text">Rendered at {{ renderedAt }}</p>
  <label :for="emailId">Email</label>
  <input :id="emailId" type="email" />
</template>`,
      },
      {
        label: "Nuxt page with useState, onMounted and ClientOnly (built and checked on Nuxt 4.6.1)",
        tech: "vue",
        runnable: false,
        code: `<script setup lang="ts">
// Nuxt page: three hydration-safe patterns (ref, onMounted, useState and ClientOnly are auto-imported).

// 1. Shared state created on the server and serialised into the payload:
//    the client reuses the server value instead of computing a new one.
const greeting = useState("greeting", () => (import.meta.server ? "Hello from the server" : "never used"));

// 2. Browser-only data: render a neutral value first, fill it in after mount.
const tz = ref("");
onMounted(() => { tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone; });
</script>

<template>
  <main>
    <p class="greeting">{{ greeting }}</p>
    <p class="tz">Your time zone: {{ tz || "detecting..." }}</p>
    <!-- 3. A widget that cannot render on the server at all -->
    <ClientOnly>
      <p class="widget">browser-only widget</p>
      <template #fallback><p class="widget">loading widget</p></template>
    </ClientOnly>
  </main>
</template>`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is lazy hydration in Vue 3.5 — hydrate strategies (idle, visible, interaction)?",
    seoDescription:
      "Vue 3.5 lazy hydration: defineAsyncComponent with hydrateOnIdle, hydrateOnVisible, hydrateOnInteraction or a custom strategy, and what it does not defer.",
    description: `**Question presented to candidate:**
"Our server-rendered product page is visible quickly, but it takes a long time before anything responds to a tap, because every widget hydrates on load. Vue 3.5 added lazy hydration. Explain how it works, which strategies exist, and what it does and does not save us."

**What a strong answer should cover:**
- Lazy hydration is configured per **async component** with the \`hydrate\` option of \`defineAsyncComponent\`, and only applies when hydrating SSR markup.
- The built-in strategies: \`hydrateOnIdle(timeout)\`, \`hydrateOnVisible(observerOptions)\`, \`hydrateOnInteraction(events)\` and \`hydrateOnMediaQuery(query)\`, plus custom strategies with the \`(hydrate, forEachElement) => teardown\` signature.
- Until it hydrates, the component is **static server HTML**: visible, but its listeners are not attached.
- \`hydrateOnInteraction\` **replays** the triggering event after hydrating; it needs an explicit event list in plain Vue.
- In plain Vue the **loader still runs at mount**: the strategy defers hydration work, not the download. Nuxt's \`hydrate-on-*\` props wrap it differently.
- A prop change from the parent forces immediate hydration.

**Clarifying questions expected:**
- "Which widgets are below the fold or rarely used?"
- "Are we on plain Vue SSR or Nuxt? The ergonomics and what gets deferred differ."

**Code / implementation expected:** Optional — \`defineAsyncComponent({ loader, hydrate: hydrateOnVisible() })\`, or a small custom strategy.`,
    answer: `**Target Audience:** Developers with a server-rendered Vue or Nuxt app who want to cut the time before the page responds. Assumes you know what hydration is.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The timelines in sections 5 and 6 were recorded in headless Chromium (Playwright) against a page server-rendered with Vue 3.5.44. The edge cases in section 7 were hydrated in jsdom with <code>createSSRApp</code>. The Nuxt comparison in section 8 comes from a Nuxt 4.6.1 production build loaded in Chromium.

## 1. Why This Even Matters — A Story First

A hotel opens for the day. The lobby lights are on and every room is visible from the corridor, so guests can look around immediately. But a room only works (hot water, air-conditioning, the TV) once a technician has switched it on, and the hotel has one technician.

The old approach: the technician switches on all 300 rooms, starting at 7 a.m., in order. The guest who walks up to room 2 at 7:01 waits, because the technician is busy in room 180, a room nobody has booked.

The new approach: switch on the lobby now, switch on the conference room when the building is quiet, switch on each guest room when a guest **walks up to its door**, and switch on the rooftop bar only if someone **actually scrolls to the top floor**. Same technician, same rooms, but the work happens when it is useful.

The rooms are your components, the technician is the main thread, and "switching on" is **hydration**. Vue 3.5 lets you choose, per component, when that happens. For the hydration step itself, see [how SSR and hydration work](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration).

## 2. The Core Idea

Normal hydration is all-or-nothing: <code>app.mount()</code> walks the whole server-rendered tree, runs every component's <code>setup()</code> and attaches every event listener before the page can respond. On a large page that is one long task, and a tap during it waits.

📌 **Interview term: Lazy hydration** — leaving some server-rendered components as **plain static HTML** after the app mounts, and hydrating each one later, when a chosen condition is met. Vue 3.5 added it (released September 2024, per the <a href="https://blog.vuejs.org/posts/vue-3-5" target="_blank" rel="noopener noreferrer">Vue 3.5 announcement</a>).

📌 **Interview term: Hydration strategy** — the function you pass as the <code>hydrate</code> option of <code>defineAsyncComponent</code>. It decides **when** to call <code>hydrate()</code>.

\`\`\`js
import { defineAsyncComponent, hydrateOnVisible } from "vue";

const Reviews = defineAsyncComponent({
  loader: () => import("./Reviews.vue"),
  hydrate: hydrateOnVisible({ rootMargin: "200px" }),
});
\`\`\`

It is an option of [async components](/interview-question/how-does-defineasynccomponent-work-with-loading-error-and-retry-in-2025) because a lazily hydrated piece is a natural code-splitting boundary, and because the async wrapper is the place where Vue can pause the tree.

| Strategy | Hydrates when | Built on |
| :--- | :--- | :--- |
| <code>hydrateOnIdle(timeout)</code> | The browser is idle, or <code>timeout</code> ms pass (default 10000) | <code>requestIdleCallback</code> |
| <code>hydrateOnVisible(options)</code> | Any root element enters the viewport | <code>IntersectionObserver</code> (options such as <code>rootMargin</code>) |
| <code>hydrateOnInteraction(events)</code> | One of the listed events fires on the component | Event listeners; the event is replayed afterwards |
| <code>hydrateOnMediaQuery(query)</code> | The media query matches (now or later) | <code>matchMedia</code> |
| Custom <code>(hydrate, forEachElement) =&gt; teardown</code> | Whatever you decide | Your code |

These descriptions match the 3.5.44 source in <code>runtime-core</code>; the behaviour was then checked in a real browser below.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Timeline: the app mounts and eager parts hydrate, the rest stay static HTML until idle, interaction or visibility triggers each one">
  <defs>
    <marker id="vlh-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 40 240 L 690 240" marker-end="url(#vlh-arrow)"/>
  <text class="d-sub" x="660" y="266" text-anchor="middle">time</text>
  <rect class="d-box-accent" x="40" y="40" width="150" height="44" rx="8"/>
  <text class="d-text d-accent" x="115" y="67" text-anchor="middle">mount: eager</text>
  <rect class="d-box" x="210" y="100" width="140" height="44" rx="8"/>
  <text class="d-sub" x="280" y="127" text-anchor="middle">idle widget</text>
  <rect class="d-box" x="370" y="160" width="140" height="44" rx="8"/>
  <text class="d-sub" x="440" y="187" text-anchor="middle">clicked widget</text>
  <rect class="d-box" x="530" y="40" width="150" height="44" rx="8"/>
  <text class="d-sub" x="605" y="67" text-anchor="middle">scrolled into view</text>
  <path class="d-edge-dashed" d="M 115 88 L 115 236"/>
  <path class="d-edge-dashed" d="M 280 148 L 280 236"/>
  <path class="d-edge-dashed" d="M 440 208 L 440 236"/>
  <path class="d-edge-dashed" d="M 605 88 L 605 236"/>
</svg>

Each box is a moment when one piece of hydration work runs. Instead of one long task at mount, the work is spread out and some of it may never run at all.

## 3. What Lazy Hydration Does Not Do

This is the point most answers get wrong, so it comes before the demo.

- **In plain Vue it does not defer the download.** The strategy controls when <code>hydrate()</code> runs. The 3.5.44 source calls the <code>loader</code> as soon as the async wrapper is hydrated and only then hands the strategy a callback, and the browser timeline below confirms every loader ran at mount. If the loader is a dynamic <code>import()</code>, the chunk is fetched at mount too.
- **It does nothing in a client-rendered app.** Mounted with <code>createApp</code> (no SSR markup), all five components in the test rendered immediately, strategies ignored.
- **It does not make the HTML interactive.** Until hydration, a button is just a server-rendered <code>&lt;button&gt;</code> with no listener.

So the saving is **main-thread work at load** (running <code>setup()</code>, creating component instances, walking DOM, attaching listeners), not bytes. For bytes, combine it with route-level [code splitting](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue), or use Nuxt's wrapper (section 8).

## 4. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which components are below the fold? | They are the obvious <code>hydrateOnVisible</code> candidates. |
| Which are rarely used, such as a share menu? | <code>hydrateOnInteraction</code> means many visitors never pay for them. |
| Is anything mobile-only or desktop-only? | <code>hydrateOnMediaQuery</code> can skip a whole layout on the other device class. |
| Plain Vue SSR or Nuxt? | Nuxt has template props and also defers the chunk fetch. |
| What does the long task at load look like today? | Lazy hydration helps when hydration itself is the bottleneck; measure it first. |

## 5. Verified: All Four Strategies in Chromium

The example app renders five copies of one small button widget: one eager async component and one per strategy, with the <code>hydrateOnVisible</code> one placed under a 3000 px spacer. It was server-rendered, then hydrated in headless Chromium at a 1000 px wide viewport. Each widget logs when its loader runs and when it hydrates:

\`\`\`
[boot] createSSRApp + mount over server HTML
[94ms] eager: loader called
[96ms] idle: loader called
[96ms] interaction: loader called
[97ms] media: loader called
[98ms] visible: loader called
[98ms] root: hydrated (app.mount returned)
[105ms] eager: hydrated
[110ms] idle: hydrated
--- t+400ms, nothing touched. eager: eager clicks: 0 | interaction: interaction clicks: 0
--- clicking #interaction once
[627ms] interaction: hydrated
--- after one click: interaction clicks: 1
--- clicking #media while the viewport is 1000px wide
--- media after click: media clicks: 0
--- resizing viewport to 400px
[878ms] media: hydrated
--- scrolling #visible into view
[1091ms] visible: hydrated
\`\`\`

Reading it line by line:

- **Every loader ran at mount** (94 to 98 ms), confirming section 3.
- **Idle** hydrated at 110 ms, because a headless page with nothing else to do is idle almost at once. On a busy real page it waits for a gap, or for the timeout.
- **Interaction:** the first click hydrated the widget **and** counted (<code>clicks: 1</code>). The strategy re-dispatches the triggering event after hydrating, so the user's first click is not lost.
- **Media query:** clicking it at 1000 px did nothing (<code>clicks: 0</code>): it was still static HTML. Resizing to 400 px matched <code>(max-width: 500px)</code> and hydrated it.
- **Visible** hydrated only when scrolled into view.

The same page with <code>?csr</code> (client rendering with <code>createApp</code>, no server HTML) hydrated nothing lazily: all five widgets mounted between 47 and 48 ms.

## 6. The Strategies in Detail

**<code>hydrateOnIdle(timeout = 10000)</code>.** Uses <code>requestIdleCallback</code> with a timeout, so it always hydrates eventually. Good for components that should work soon but not before the critical ones, such as a newsletter form. Safari has historically lacked <code>requestIdleCallback</code>; check current support for your audience before relying on it.

**<code>hydrateOnVisible(options)</code>.** Uses <code>IntersectionObserver</code>; the options are passed straight through, so <code>{ rootMargin: "200px" }</code> hydrates slightly before the component scrolls in. If the element is already in the viewport at mount, the source hydrates immediately rather than waiting for an observer callback.

**<code>hydrateOnInteraction(events)</code>.** Listens for the given events on each root element, hydrates on the first, then replays it. Verified in jsdom, the event list matters: with <code>hydrateOnInteraction()</code> and no arguments a click did nothing (<code>clicks 0</code>), while <code>hydrateOnInteraction("click")</code> hydrated and counted the click (<code>clicks 1</code>). In 3.5.44 the default list is empty. Typical lists are <code>["pointerenter", "focus"]</code> (hydrate just before the click) or <code>"click"</code>.

**<code>hydrateOnMediaQuery(query)</code>.** Hydrates now if it matches, otherwise on the first <code>change</code> event that makes it match.

**Custom strategies.** A strategy receives <code>hydrate</code> and <code>forEachElement</code> (which walks every root element, including the elements inside a multi-root fragment) and may return a teardown. The hover-intent strategy in the examples hydrates only when the pointer rests on the component for 100 ms. Verified in jsdom:

\`\`\`
+69ms quick fly-over: enter, leave after 30ms
+302ms click before hydration -> clicks 0
+302ms rest the pointer for 150ms
+406ms [Chart] hydrated
+455ms click after hydration -> clicks 1
\`\`\`

A 30 ms fly-over did not hydrate it; a 150 ms rest did. Note the click before hydration was simply lost: unlike the built-in interaction strategy, this custom one does not replay events.

## 7. Verified: Edge Cases

**A parent update forces hydration.** With a manual custom strategy, the parent changed the lazy child's prop before the strategy fired:

\`\`\`
[Card] hydrated with label second
[e3b] WARN: [Vue warn]: Skipping lazy hydration for component 'undefined': it was updated before lazy hydration performed.
\`\`\`

Vue cannot patch a component that was never hydrated, so the update hydrated it straight away, with the new prop; the later trigger was skipped with that warning (<code>'undefined'</code> because the test component had no <code>name</code>). Design lazily hydrated components so their props are stable until they hydrate.

**The DOM is adopted, not replaced.** In every lazy case the jsdom check reported all server elements reused (for example <code>4/4</code>). Lazy hydration is still hydration: when it finally runs it adopts the server nodes, so [hydration mismatch](/interview-question/how-do-you-diagnose-and-fix-hydration-mismatches-in-vue-ssr-nuxt-3) rules apply exactly as before.

## 8. Lazy Hydration in Nuxt

Nuxt (built-in since Nuxt 3.16, per the <a href="https://nuxt.com/blog/v3-16" target="_blank" rel="noopener noreferrer">Nuxt 3.16 release post</a>) exposes the same strategies as props on <code>Lazy</code>-prefixed components:

\`\`\`vue
<template>
  <LazyHeavyChart name="onclick" hydrate-on-interaction="click" />
  <div style="height: 3000px">spacer</div>
  <LazyHeavyChart name="onvisible" hydrate-on-visible />
</template>
\`\`\`

Its runtime (<code>lazy-hydrated-component.js</code> in Nuxt 4.6.1) wraps an inner async component whose loader is the real chunk, so the **chunk fetch waits for the strategy**. Observed in a production build in Chromium: the component chunk was requested at page load only as a <code>&lt;link rel="prefetch"&gt;</code>, and requested again (served from the prefetch) at the moment of the click, followed immediately by <code>[HeavyChart onclick] hydrated</code>.

One difference was observed: in that Nuxt 4.6.1 build the **triggering click was not counted** (<code>onclick clicks: 0</code> after the first click, <code>clicks: 1</code> after the second), whereas plain Vue replayed it. A likely explanation, from reading the wrapper, is that the replayed event fires before the inner chunk has loaded and attached its listener; that explanation was not confirmed further. If the first click matters, prefer <code>pointerenter</code> or <code>focus</code> so hydration starts before the click. Nuxt also adds <code>hydrate-after</code> (milliseconds), <code>hydrate-when</code> (a boolean) and <code>hydrate-never</code>. More on the framework in [What is Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue).

## 9. Choosing a Strategy

| Component | Strategy | Why |
| :--- | :--- | :--- |
| Header, search box, add-to-cart | None (eager) | Must work immediately |
| Reviews, related products, footer | <code>hydrateOnVisible</code> | Most visitors may never scroll there |
| Share menu, chat bubble, date picker | <code>hydrateOnInteraction</code> | Only the users who touch it pay for it |
| Desktop mega-menu | <code>hydrateOnMediaQuery("(min-width: 1024px)")</code> | Mobile never hydrates it |
| Newsletter form, cookie banner | <code>hydrateOnIdle</code> | Should work soon, but not first |

## 10. Common Pitfalls

- **Expecting a smaller download in plain Vue.** The loader runs at mount; the saving is hydration work. Measure main-thread time, not bytes.
- **Calling <code>hydrateOnInteraction()</code> with no events.** In 3.5.44 the default list is empty, so the component never hydrates by interaction.
- **Lazy-hydrating something above the fold that users tap immediately.** The first tap then pays the hydration cost, which hurts responsiveness (INP).
- **Passing props that change before hydration.** It forces hydration and prints "Skipping lazy hydration", defeating the point.
- **Using it in a client-only app.** Without SSR markup, the option is ignored; the component renders on mount.
- **Forgetting it is still hydration.** Mismatches in a lazily hydrated component appear later, when it hydrates, which makes them easier to miss in testing.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Lazy hydration leaves selected server-rendered components as static HTML after mount and hydrates each one later, when a strategy says so."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The API:</strong> <span style="color:#f0e2c8;">"It is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> option of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateOnIdle</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateOnVisible</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateOnInteraction</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrateOnMediaQuery</code>, or a custom function that receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEachElement</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it saves:</strong> <span style="color:#f0e2c8;">"It splits one long hydration task into small pieces and skips pieces nobody uses, which improves responsiveness. Until a piece hydrates it is visible but has no listeners."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The honest limits:</strong> <span style="color:#f0e2c8;">"In plain Vue the loader still runs at mount, so it saves main-thread work, not bytes. It only applies to SSR markup, and a prop change from the parent forces it to hydrate early."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I would use it:</strong> <span style="color:#f0e2c8;">"Eager for anything above the fold that users tap, visible for reviews and footers, interaction for menus and pickers, media query for device-specific layouts. In Nuxt the same thing is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate-on-visible</code> prop on a Lazy component, which also defers the chunk."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hydrateOnInteraction</code> lose the click that triggered it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In plain Vue 3.5.44, no: it hydrates synchronously and re-dispatches the event, and the test widget counted the first click. A custom strategy has to do that itself. In the Nuxt 4.6.1 build I tested, the first click was not counted, so I would trigger on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pointerenter</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">focus</code> there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it an option on async components rather than a directive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The async wrapper is where Vue can pause a subtree: it already has a pending state and a resolve step. It also lines up with code splitting, since a lazily hydrated widget is usually a separate chunk anyway.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write a custom strategy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A function <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(hydrate, forEachElement) =&gt; teardown</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEachElement</code> to attach listeners or observers to every root element, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hydrate()</code> when your condition is met, and return a function that removes them in case the component unmounts first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the parent changes a prop before hydration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue cannot patch an unhydrated subtree, so it hydrates immediately with the new props and later prints a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Skipping lazy hydration</code> warning when the strategy fires. Keep props of lazily hydrated components stable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you measure whether it helped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record a performance profile of page load and look at the hydration long task, and track INP and Total Blocking Time in field data. Bundle size will not change in plain Vue, so it is the wrong metric.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy hydration** | Leaving SSR components as static HTML and hydrating them later |
| **Hydration strategy** | Function passed as <code>hydrate</code> that decides when to hydrate |
| **hydrateOnIdle** | Hydrate when the browser is idle or after a timeout |
| **hydrateOnVisible** | Hydrate when a root element enters the viewport |
| **hydrateOnInteraction** | Hydrate on a listed event, then replay that event |
| **hydrateOnMediaQuery** | Hydrate when a media query matches |
| **forEachElement** | Helper a strategy receives to visit every root element |
| **INP** | Interaction to Next Paint, the responsiveness metric lazy hydration helps |

---
**Conclusion:** Lazy hydration in Vue 3.5 lets an SSR page stay visible while deferring the hydration of chosen async components until the browser is idle, the component is visible, the user interacts with it, or a media query matches. Verified in Chromium on 3.5.44, each strategy fired exactly at its trigger, and the interaction strategy replayed the first click. Be precise about the limits: in plain Vue the loader still runs at mount, so it saves main-thread work rather than bytes, it does nothing without SSR markup, and a prop change forces early hydration. Nuxt's <code>hydrate-on-*</code> props also defer the chunk fetch, though in the Nuxt 4.6.1 build tested the triggering click itself was not delivered.`,
    examples: [
      {
        label: "All four built-in strategies on SSR-rendered async components (run in Chromium)",
        tech: "js",
        runnable: false,
        code: `import { createSSRApp, createApp, defineAsyncComponent, defineComponent, h, ref, onMounted,
  hydrateOnIdle, hydrateOnVisible, hydrateOnInteraction, hydrateOnMediaQuery } from "vue";

const log = (msg) => (typeof window !== "undefined" ? console.log(\`[\${(performance.now() | 0)}ms] \${msg}\`) : null);

// One small interactive widget, reused by every strategy.
const Widget = (name) => defineComponent({
  setup() {
    const clicks = ref(0);
    onMounted(() => log(\`\${name}: hydrated\`));
    return () => h("button", { id: name, onClick: () => clicks.value++ }, \`\${name} clicks: \${clicks.value}\`);
  },
});

const lazy = (name, hydrate) => defineAsyncComponent({
  loader: () => { log(\`\${name}: loader called\`); return Promise.resolve(Widget(name)); },
  hydrate,
});

const Idle = lazy("idle", hydrateOnIdle(2000));
const Visible = lazy("visible", hydrateOnVisible({ rootMargin: "0px" }));
const Interaction = lazy("interaction", hydrateOnInteraction(["click", "focus"]));
const Media = lazy("media", hydrateOnMediaQuery("(max-width: 500px)"));
const Eager = lazy("eager", undefined);

const App = defineComponent({
  setup() {
    onMounted(() => log("root: hydrated (app.mount returned)"));
    return () => h("main", [
      h(Eager), h(Idle), h(Interaction), h(Media),
      h("div", { style: "height:3000px" }, "spacer"),
      h(Visible),
    ]);
  },
});

export const makeApp = (ssr = true) => (ssr ? createSSRApp(App) : createApp(App));`,
      },
      {
        label: "A custom strategy: hydrate on hover intent",
        tech: "js",
        runnable: false,
        code: `// A custom hydration strategy: hydrate only when the pointer rests on the
// component for \`delay\` ms (hover intent), so a quick fly-over does nothing.
// Signature: (hydrate, forEachElement) => optional teardown
export const hydrateOnHoverIntent = (delay = 100) => (hydrate, forEachElement) => {
  let timer;
  const enter = () => { timer = setTimeout(done, delay); };
  const leave = () => clearTimeout(timer);
  const done = () => { teardown(); hydrate(); };
  const teardown = () => {
    clearTimeout(timer);
    forEachElement((el) => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    });
  };
  // forEachElement visits every root element of the server-rendered component
  forEachElement((el) => {
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
  });
  return teardown; // Vue calls it if the component unmounts before hydrating
};

// Usage:
// const PriceChart = defineAsyncComponent({
//   loader: () => import("./PriceChart.vue"),
//   hydrate: hydrateOnHoverIntent(150),
// });`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Nuxt and how does it relate to Vue?",
    seoDescription:
      "Nuxt is a meta-framework built on Vue: file-based routing, SSR and prerendering, auto-imports, data fetching and a Nitro server, checked on Nuxt 4.6.1.",
    description: `**Question presented to candidate:**
"We are starting a new content-heavy site and the team knows Vue. Someone suggested Nuxt. What is Nuxt, how does it relate to Vue itself, and what would it give us that a plain Vite + Vue project does not?"

**What a strong answer should cover:**
- Nuxt is a **framework built on top of Vue**: your components are ordinary Vue SFCs, and Nuxt adds conventions, a build pipeline and a server.
- **File-based routing** (on Vue Router), layouts, and **auto-imports** of Vue APIs, composables and components.
- **Rendering modes per route**: SSR by default, prerendering, client-only, and caching rules via \`routeRules\`.
- **Data fetching** with \`useFetch\`/\`useAsyncData\`, whose server results are serialised so the client does not fetch again.
- A **server layer** (Nitro) for API routes and deployment presets (Node, serverless, edge, static).
- Versions: Nuxt 4 is current (July 2025 onwards); Nuxt 3 reached end of life on 31 July 2026.
- Trade-offs: more conventions and magic, a server to run for SSR, and a framework release cycle on top of Vue's.

**Clarifying questions expected:**
- "Do we need SEO and fast first paint, or is this an app behind a login?"
- "Where will it be hosted: a Node server, serverless, or static hosting only?"

**Code / implementation expected:** Optional — a page using \`useFetch\` and a \`routeRules\` entry.`,
    answer: `**Target Audience:** Vue developers who have heard of Nuxt and need to explain what it adds. No Nuxt experience assumed.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Everything in the "Verified" sections comes from a real Nuxt 4.6.1 project created for this answer: built with <code>nuxt build</code>, run as a production server, fetched with <code>curl</code> and loaded in headless Chromium. Version and date claims come from the npm registry and the Nuxt docs, cited inline.

## 1. Why This Even Matters — A Story First

Vue is a very good engine. You can bolt it into anything: a go-kart, a boat, a lawnmower. But if what you actually want is a car, you still have to design the chassis, the gearbox, the wiring, the dashboard and the paperwork for the road test. Every team that builds a car out of the same engine ends up making the same hundred decisions.

Nuxt is a **car built around the Vue engine**. The chassis (folder structure), gearbox (build pipeline), wiring (routing and data fetching) and road-test paperwork (server rendering and deployment) come pre-made and agreed upon. You still drive with the same pedals, because your pages are ordinary Vue components. You just stop building the car yourself.

That is the relationship interviewers want to hear: **Nuxt does not replace Vue; it is a framework on top of Vue**, the way Next.js sits on top of React.

## 2. The Core Idea

📌 **Interview term: Meta-framework** — a framework built on a UI library that adds routing, rendering modes, data fetching, a server and build conventions. Nuxt is Vue's; [Next.js](/interview-question/what-are-the-rendering-strategies-in-next-js-ssr-ssg-isr-csr) is React's.

📌 **Interview term: Nuxt** — an open-source meta-framework for Vue. Its components are standard Vue SFCs, its router is [Vue Router](/interview-question/how-do-you-set-up-vue-router-routes-routerlink-routerview-history-modes), its bundler is Vite, and its server engine is Nitro. Nuxt 3.0.0 was published to npm on 16 November 2022, Nuxt 4.0.0 on 15 July 2025, and 4.6.1 (used here) on 9 October 2026.

📌 **Interview term: Nitro** — the server toolkit Nuxt uses for SSR, API routes and deployment presets. The same app can be built for a Node server, serverless functions, edge runtimes or fully static output.

The real build log shows exactly how the pieces stack:

\`\`\`
• Nuxt 4.6.1 (with Nitro 2.13.4, Vite 8.3.4 and Vue 3.5.44)
\`\`\`

So the Vue in a Nuxt 4.6.1 app **is** Vue 3.5.44, the same version as a plain Vite project, not a fork.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Layer diagram: your pages and components on top, Nuxt conventions below them, then Vue, Vue Router, Vite and Nitro">
  <rect class="d-box-accent" x="60" y="30" width="580" height="50" rx="10"/>
  <text class="d-text d-accent" x="350" y="60" text-anchor="middle">Your pages, components, composables</text>
  <rect class="d-box" x="60" y="110" width="580" height="60" rx="10"/>
  <text class="d-text" x="350" y="136" text-anchor="middle">Nuxt conventions</text>
  <text class="d-sub" x="350" y="156" text-anchor="middle">file routing, auto-imports, useFetch, routeRules, layouts</text>
  <rect class="d-box-muted" x="60" y="200" width="130" height="60" rx="10"/>
  <text class="d-text" x="125" y="235" text-anchor="middle">Vue 3.5</text>
  <rect class="d-box-muted" x="210" y="200" width="130" height="60" rx="10"/>
  <text class="d-text" x="275" y="235" text-anchor="middle">Vue Router</text>
  <rect class="d-box-muted" x="360" y="200" width="130" height="60" rx="10"/>
  <text class="d-text" x="425" y="235" text-anchor="middle">Vite</text>
  <rect class="d-box-muted" x="510" y="200" width="130" height="60" rx="10"/>
  <text class="d-text" x="575" y="235" text-anchor="middle">Nitro server</text>
</svg>

The bottom row is all existing tooling. Nuxt's own contribution is the middle layer: the conventions that wire those tools together so you do not have to.

## 3. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does it need SEO or a fast first paint? | That is the main reason to pick Nuxt over a client-only Vite SPA. |
| Is content per-user, or mostly public? | Public pages can be prerendered; per-user pages need SSR or client rendering. |
| Where will it run? | SSR needs a Node, serverless or edge runtime; static hosting limits you to prerendered or client-only routes. |
| Do we need our own API endpoints? | Nitro server routes can replace a small separate backend. |
| How much convention can the team accept? | Auto-imports and file routing speed you up but hide wiring that some teams prefer explicit. |

## 4. What Nuxt Adds, Verified

The demo project has <code>app/app.vue</code>, five pages in <code>app/pages/</code>, a component and one file in <code>server/api/</code>. There is **no router file and no import statement** for <code>ref</code>, <code>useFetch</code>, <code>useHead</code> or the component, and it still built.

**File-based routing.** <code>app/pages/index.vue</code> became <code>/</code>, <code>app/pages/mismatch.vue</code> became <code>/mismatch</code>, and so on. Under the hood these are Vue Router routes; the dev-mode component trace even shows <code>&lt;RouterView&gt;</code> inside <code>&lt;NuxtPage&gt;</code>.

📌 **Interview term: Auto-imports** — Nuxt makes Vue APIs (<code>ref</code>, <code>computed</code>, <code>onMounted</code>), its own composables (<code>useFetch</code>, <code>useState</code>, <code>useHead</code>), your [composables](/interview-question/what-are-composables-in-vue) folder and your components available without import statements, and generates TypeScript declarations for them.

**Server rendering by default.** <code>curl</code> on the production server returned real markup, with the <code>&lt;title&gt;</code> set by <code>useHead</code> and the value fetched by <code>useFetch</code>:

\`\`\`html
<title>Nuxt demo</title> ...
<div id="__nuxt"><!--[--><main><h1>Hello from Nuxt</h1><p>Server said: 2026-10-16T12:00:00Z</p><a href="/mismatch" class="">mismatch demo</a></main><!--]--></div>
\`\`\`

**API routes on the same server.** <code>server/api/time.ts</code> was served by Nitro:

\`\`\`
$ curl localhost:5260/api/time
{"at":"2026-10-16T12:00:00Z","runtime":"nitro"}
\`\`\`

**Data fetched once, not twice.** The page HTML ended with a payload script:

\`\`\`html
<script type="application/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__">[["ShallowReactive",1],{"data":2,"state":7,"once":9,"_errors":10,"serverRendered":12,"path":13},["ShallowReactive",3],{"$f3ostzpqjqn87m":4},{"at":5,"runtime":6},"2026-10-16T12:00:00Z","nitro", ...]</script>
\`\`\`

📌 **Interview term: Payload** — the serialised state Nuxt embeds in the page so the client starts from the server's data. Loading <code>/</code> in Chromium while logging every request to <code>/api/</code> showed **zero** API requests during hydration: <code>useFetch</code> reused the payload. That is the state transfer you would otherwise hand-roll for [Vue SSR](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration).

**Rendering modes per route.** With <code>routeRules</code> in <code>nuxt.config.ts</code>, the build log showed the prerender step, and the two routes came back differently:

\`\`\`
[nitro] i Prerendering 1 routes
[nitro]   ├─ /about (62ms)
[nitro]   ├─ /about/_payload.json (2ms)

$ curl localhost:5260/dashboard   ->  <div id="__nuxt"></div>
$ curl localhost:5260/about       ->  <main><h1>About (prerendered)</h1></main>
\`\`\`

<code>/about</code> was generated once at build time; <code>/dashboard</code> (<code>ssr: false</code>) sent an empty shell and rendered in the browser, like a plain SPA. Index and the other pages stayed server-rendered per request.

**A deployable output.** The build produced <code>.output/public</code> (static assets) and <code>.output/server/index.mjs</code> (preset <code>node-server</code>), started with <code>node .output/server/index.mjs</code>. The Nuxt docs list other presets (serverless, edge, static); only <code>node-server</code> was run here.

## 5. Plain Vue + Vite vs Nuxt

| | Vite + Vue | Nuxt |
| :--- | :--- | :--- |
| Rendering | Client-side by default; SSR is hand-rolled | SSR by default; prerender, client-only and caching per route |
| Routing | Install and configure Vue Router yourself | Generated from <code>pages/</code> |
| Imports | Explicit | Auto-imported Vue APIs, composables and components |
| Data fetching | Your choice; you transfer SSR state yourself | <code>useFetch</code> / <code>useAsyncData</code> with payload transfer |
| Backend | Separate project | <code>server/</code> routes on Nitro in the same app |
| SEO and head tags | Add a library | <code>useHead</code> / <code>useSeoMeta</code> built in |
| Hosting | Any static host | Node, serverless, edge or static, depending on routes |
| Flexibility | Maximum | Conventions first; escape hatches exist |
| Extra concepts to learn | Few | Nuxt directory conventions, Nitro, hydration rules |

## 6. Where Vue Knowledge Carries Over (and Where It Does Not)

Everything you know about [the Composition API](/interview-question/what-is-the-composition-api-and-how-does-it-differ-from-the-options-api), reactivity, props, slots and [Pinia](/interview-question/what-is-pinia-and-why-use-it) transfers directly, because pages are ordinary components.

What is new is mostly about running on two sides:

- Code in <code>&lt;script setup&gt;</code> runs on the server **and** in the browser, so <code>window</code> access belongs in <code>onMounted</code>, and server-versus-client differences cause [hydration mismatches](/interview-question/how-do-you-diagnose-and-fix-hydration-mismatches-in-vue-ssr-nuxt-3).
- Global state must be request-safe. Nuxt's <code>useState</code> is per-request on the server and serialised to the client; a module-level <code>ref</code> is shared by every request.
- <code>import.meta.server</code> and <code>import.meta.client</code> let you branch, and components such as <code>&lt;ClientOnly&gt;</code> and <code>Lazy</code>-prefixed components with <code>hydrate-on-*</code> props control what renders and hydrates where (see [lazy hydration](/interview-question/what-is-lazy-hydration-in-vue-3-5-hydrate-strategies-idle-visible-interaction)).

## 7. Versions and Support

| Version | First release on npm | Status |
| :--- | :--- | :--- |
| Nuxt 2 | Built on Vue 2 | Legacy; Vue 2 itself reached end of life on 31 December 2023 |
| Nuxt 3 | 16 November 2022 | End of life 31 July 2026, per the <a href="https://nuxt.com/docs/3.x/migration/overview" target="_blank" rel="noopener noreferrer">Nuxt 3.x docs banner</a> |
| Nuxt 4 | 15 July 2025 | Current (<code>latest</code> on npm is 4.6.1) |

The Vue 2 date is from the <a href="https://v2.vuejs.org/eol/" target="_blank" rel="noopener noreferrer">Vue 2 end-of-life page</a>; the release dates are from the npm registry. A visible Nuxt 4 change is the source directory: the 4.6.1 schema resolves <code>srcDir</code> to <code>app/</code> when that folder exists (and falls back to the project root otherwise), which is why the demo keeps pages in <code>app/pages/</code>. For the history on the Vue side, see [Vue 2 vs Vue 3](/interview-question/what-changed-from-vue-2-to-vue-3-and-what-does-vue-2-end-of-life-mean).

## 8. Common Pitfalls

- **Saying Nuxt "is a different framework from Vue".** Pages are Vue components and the runtime is the same Vue; Nuxt is the layer around it.
- **Treating auto-imports as magic globals.** They are compile-time imports generated by Nuxt. Names can collide, and a component that relies on them is not portable to a plain Vite app without adding the imports.
- **Using module-level state for user data.** On the server it leaks between requests. Use <code>useState</code> or a per-request Pinia store.
- **Calling <code>$fetch</code> in setup instead of <code>useFetch</code>.** <code>$fetch</code> runs on both sides and is not transferred in the payload. Verified: a page using <code>await $fetch("/api/time")</code> made a second <code>/api/time</code> request from the browser during hydration, while the <code>useFetch</code> page made none.
- **Assuming SSR is free.** It needs a runtime, costs CPU per request, and introduces hydration rules. Prerender or use <code>ssr: false</code> where SSR adds nothing.
- **Choosing a static host for an SSR app.** Without a server preset, only prerendered and client-only routes work.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One sentence:</strong> <span style="color:#f0e2c8;">"Nuxt is a meta-framework built on Vue: my pages are ordinary Vue components, and Nuxt adds routing, rendering modes, data fetching, a server and build conventions around them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it relates:</strong> <span style="color:#f0e2c8;">"It is to Vue what Next.js is to React. It uses Vue itself, Vue Router, Vite and the Nitro server; a Nuxt 4.6.1 build reports Vue 3.5.44, the same Vue as a plain project."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it adds:</strong> <span style="color:#f0e2c8;">"File-based routing from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pages/</code>, auto-imports, SSR by default, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code> whose server result is sent in a payload so the client does not refetch, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">routeRules</code> for prerendering or client-only routes, and API routes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">server/</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Versions:</strong> <span style="color:#f0e2c8;">"Nuxt 4 has been current since July 2025, and Nuxt 3 reached end of life on 31 July 2026, so new projects should start on 4."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trade-off:</strong> <span style="color:#f0e2c8;">"You trade some flexibility and explicitness for conventions, and SSR means a runtime, per-request CPU and hydration rules. For an app behind a login with no SEO need, a plain Vite SPA can be simpler."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFetch</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">$fetch</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code> fetches during SSR and serialises the result into the page payload, so hydration reuses it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$fetch</code> is just a fetch helper; in setup it runs on the server and again in the browser. In a test the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$fetch</code> page made a second API request during hydration and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code> page made none.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make one route static and another client-only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">routeRules</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nuxt.config.ts</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prerender: true</code> generates the HTML at build time, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ssr: false</code> sends an empty shell and renders in the browser. Other options cover caching and redirects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is Nitro?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nuxt's server engine. It runs SSR, serves files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">server/api</code> as API routes, and builds the output for a deployment preset such as a Node server, serverless functions, edge workers or static files.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are auto-imports a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are compile-time imports Nuxt generates, with typings, so they are tree-shaken and typed. The costs are less explicit code, possible name clashes, and components that need imports added if moved to a non-Nuxt project.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does state work safely with SSR in Nuxt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code> or a Pinia store created per request; Nuxt serialises it to the client. A module-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> lives for the whole server process and would be shared between users.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Meta-framework** | Framework on top of a UI library that adds routing, rendering and a server |
| **Nuxt** | Vue's meta-framework; pages are ordinary Vue components |
| **Nitro** | Nuxt's server engine for SSR, API routes and deployment presets |
| **File-based routing** | Routes generated from files in <code>pages/</code> |
| **Auto-imports** | Vue APIs, composables and components usable without import statements |
| **Payload** | Serialised server state embedded in the page for the client |
| **routeRules** | Per-route rendering and caching config (prerender, ssr false, and more) |
| **Prerendering** | Generating a route's HTML once at build time |

---
**Conclusion:** Nuxt is a meta-framework built on Vue, not an alternative to it: the demo's build log reads "Nuxt 4.6.1 (with Nitro 2.13.4, Vite 8.3.4 and Vue 3.5.44)". It adds file-based routing on Vue Router, auto-imports, server rendering with a state payload (verified: no API refetch during hydration), per-route rendering modes (verified: one route prerendered, one client-only), and Nitro API routes with deployment presets. The cost is more conventions and a server to run. Pick it when SEO, first paint or a built-in server matter; keep plain Vite + Vue for client-only apps where those do not.`,
    examples: [
      {
        label: "A Nuxt page: auto-imported useFetch and useHead, file-based route at /",
        tech: "vue",
        runnable: false,
        code: `<script setup lang="ts">
// useFetch runs on the server, and its result is serialised into the page payload,
// so the client reuses it during hydration instead of fetching again.
const { data } = await useFetch("/api/time");
useHead({ title: "Nuxt demo" });
</script>
<template>
  <main>
    <h1>Hello from Nuxt</h1>
    <p>Server said: {{ data?.at }}</p>
    <NuxtLink to="/mismatch">mismatch demo</NuxtLink>
  </main>
</template>`,
      },
      {
        label: "nuxt.config.ts with per-route rendering, and a Nitro API route",
        tech: "ts",
        runnable: false,
        code: `// ── nuxt.config.ts ──
export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  telemetry: false,
  // Per-route rendering modes, all in one app
  routeRules: {
    "/about": { prerender: true },   // HTML generated once at build time
    "/dashboard": { ssr: false },    // client-only SPA route
  },
});

// ── server/api/time.ts (a Nitro API route, served at /api/time) ──
export default defineEventHandler(() => ({ at: "2026-10-16T12:00:00Z", runtime: "nitro" }));`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Vapor mode in Vue 3.5+ and how does it differ from the virtual DOM?",
    seoDescription:
      "Vapor mode compiles Vue templates to direct DOM updates with no virtual DOM. It ships in the Vue 3.6 release candidate, not 3.5. Checked on 3.6.0-rc.12.",
    description: `**Question presented to candidate:**
"You will hear people say 'Vue 3.5 has Vapor mode'. What is Vapor mode, is that version claim right, and how does rendering in Vapor differ from Vue's usual virtual DOM?"

**What a strong answer should cover:**
- Vapor is an **opt-in compilation mode** for SFCs (\`<script setup vapor>\`): the compiler emits code that creates DOM from a template once and updates specific nodes inside reactive effects. No VNodes, no diff.
- **Version accuracy**: Vapor is not in any stable release. Vue 3.5 is the current stable line; Vapor ships in the **3.6 release candidates** (3.6.0-rc.12 at the time of writing).
- Same reactivity system and same template syntax; what changes is the compiled output and the runtime it calls.
- Virtual DOM recap: render produces a VNode tree, the renderer diffs it against the previous one, helped by patch flags and blocks.
- How to use it: \`createVaporApp\` for an all-Vapor app, or \`vaporInteropPlugin\` to mix Vapor and VDOM components.
- Limits: \`<script setup>\` and template-only SFCs only (no Options API), \`getCurrentInstance()\` returns null, \`v-memo\` is ignored.

**Clarifying questions expected:**
- "Do you mean the concept, or whether we can use it in production today?"

**Code / implementation expected:** Optional — a \`<script setup vapor>\` component, and ideally a description of its compiled output.`,
    answer: `**Target Audience:** Vue developers who know templates and reactivity and want to understand Vapor mode precisely, including its release status. No compiler background needed.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Vapor output in this doc was produced with **vue 3.6.0-rc.12**, a release candidate: compiled with its <code>@vue/compiler-sfc</code>, bundled with esbuild and mounted in jsdom. The virtual DOM comparison uses the current stable, **vue 3.5.44**. Release-candidate behaviour can still change before 3.6.0 ships.

## 1. Why This Even Matters — A Story First

Two stage crews put on the same play every night.

The first crew works from **photographs**. Before each scene change the director photographs how the stage should look, the crew compares it with a photograph of how it looks now, finds the differences, and moves only the props that changed. Comparing photos takes time, but it is safe: the director never has to say which props move, only what the end result should be.

The second crew works from a **cue sheet** written before opening night. Line 14 says: "when the clock strikes, change the sign on door 3". No photographs, no comparing. When the cue fires, one person walks to one door. It is faster and needs fewer people, but someone had to write the cue sheet in advance, and the play cannot improvise a scene that is not on it.

The photograph crew is Vue's **virtual DOM**. The cue-sheet crew is **Vapor mode**: the compiler writes the cue sheet from your template, so at runtime there is nothing to compare.

## 2. First, the Version Claim

The title says "Vue 3.5+", and interviewers sometimes ask it that way, so get this exactly right:

- **Vue 3.5.44 is the current stable release** (npm <code>latest</code>). It does **not** contain Vapor mode.
- **Vapor ships in the Vue 3.6 release candidates.** On npm, <code>rc</code> points at <code>3.6.0-rc.12</code> (published 16 October 2026). The first 3.6 alpha was published in July 2025 and <code>3.6.0-rc.1</code> on 18 July 2026, whose <a href="https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1" target="_blank" rel="noopener noreferrer">release notes</a> describe Vapor as feature-complete for 3.6 and "100% opt-in".
- In rc.12 the runtime lives in a separate package, <code>@vue/runtime-vapor</code>, and the main <code>vue</code> package re-exports it. Its README says it only ships an <code>esm-bundler</code> build because "Vapor mode requires SFC build" and "only runs in the browser".

So the accurate answer is: "Vapor is coming in Vue 3.6; today it is in release candidates, not in 3.5." Release candidates are for testing, not production.

## 3. The Core Idea

📌 **Interview term: Virtual DOM (VDOM)** — a lightweight JavaScript description of the UI. On each update a component's render function builds a new tree of **VNodes**, and the renderer **diffs** it against the previous tree to decide which real DOM operations to perform. Vue's compiler makes the diff cheap with [patch flags and blocks](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t), but VNodes are still created and compared.

📌 **Interview term: Vapor mode** — an opt-in compilation mode for SFCs. The compiler turns the template into code that (1) clones the static HTML once from a template string, (2) grabs references to the nodes that can change, and (3) wraps each dynamic binding in a **render effect** that writes directly to that node when its reactive dependencies change. There are no VNodes and no diff.

📌 **Interview term: Fine-grained reactivity** — updating the exact DOM node that depends on a piece of state, rather than re-running a whole component render. Solid and Svelte 5 work this way; Vapor brings Vue to the same model while keeping Vue's template syntax and reactivity APIs.

You opt in per component, with one keyword:

\`\`\`vue
<script setup vapor>
import { ref, computed } from "vue";
const count = ref(0);
const double = computed(() => count.value * 2);
</script>
\`\`\`

The rc.1 notes also list <code>&lt;script vapor&gt;</code> as a shorthand and a <code>vapor</code> attribute on <code>&lt;template&gt;</code> for template-only components.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Virtual DOM path: state change, render new VNode tree, diff, patch DOM. Vapor path: state change, render effect writes the one node">
  <defs>
    <marker id="vvap-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="30" y="40">Virtual DOM (3.5 stable)</text>
  <rect class="d-box" x="30" y="60" width="130" height="50" rx="10"/>
  <text class="d-sub" x="95" y="90" text-anchor="middle">state changes</text>
  <path class="d-edge" d="M 162 85 L 202 85" marker-end="url(#vvap-arrow)"/>
  <rect class="d-box" x="208" y="60" width="150" height="50" rx="10"/>
  <text class="d-sub" x="283" y="90" text-anchor="middle">render new VNodes</text>
  <path class="d-edge" d="M 360 85 L 400 85" marker-end="url(#vvap-arrow)"/>
  <rect class="d-box" x="406" y="60" width="130" height="50" rx="10"/>
  <text class="d-sub" x="471" y="90" text-anchor="middle">diff old vs new</text>
  <path class="d-edge" d="M 538 85 L 578 85" marker-end="url(#vvap-arrow)"/>
  <rect class="d-box" x="584" y="60" width="110" height="50" rx="10"/>
  <text class="d-sub" x="639" y="90" text-anchor="middle">patch DOM</text>
  <text class="d-text d-accent" x="30" y="180">Vapor (3.6 release candidate)</text>
  <rect class="d-box" x="30" y="200" width="130" height="50" rx="10"/>
  <text class="d-sub" x="95" y="230" text-anchor="middle">state changes</text>
  <path class="d-edge-accent" d="M 162 225 L 202 225" marker-end="url(#vvap-arrow)"/>
  <rect class="d-box-accent" x="208" y="200" width="328" height="50" rx="10"/>
  <text class="d-text d-accent" x="372" y="230" text-anchor="middle">render effect runs for that binding</text>
  <path class="d-edge-accent" d="M 538 225 L 578 225" marker-end="url(#vvap-arrow)"/>
  <rect class="d-box-accent" x="584" y="200" width="110" height="50" rx="10"/>
  <text class="d-text d-accent" x="639" y="230" text-anchor="middle">set node</text>
</svg>

The two middle steps of the top row are what Vapor removes. Both rows end with the same kind of DOM write; the difference is the JavaScript work between "state changes" and that write.

## 4. Verified: The Same Component, Compiled Both Ways

A counter with a static heading and paragraph, a button showing <code>count</code>, and a paragraph with a <code>double</code> value and an <code>even</code> class.

**Vue 3.5.44, virtual DOM** (production compile, trimmed to the render function):

\`\`\`js
return (_openBlock(), _createElementBlock("section", _hoisted_1, [
  _cache[1] || (_cache[1] = _createElementVNode("h2", null, "Vapor counter", -1 /* CACHED */)),
  _cache[2] || (_cache[2] = _createElementVNode("p", null, "Static paragraph that never changes.", -1 /* CACHED */)),
  _createElementVNode("button", {
    onClick: _cache[0] || (_cache[0] = $event => (count.value++))
  }, "count is " + _toDisplayString(count.value), 1 /* TEXT */),
  _createElementVNode("p", {
    class: _normalizeClass({ even: count.value % 2 === 0 })
  }, "double: " + _toDisplayString(double.value), 3 /* TEXT, CLASS */)
]))
\`\`\`

Every update calls this function again and returns a fresh tree of VNodes; the static ones are cached and the dynamic ones carry patch flags so the diff knows to compare only text and class.

**Vue 3.6.0-rc.12, Vapor** (the whole setup function):

\`\`\`js
const t0 = _template("<section class=card><h2>Vapor counter</h2><p>Static paragraph that never changes.</p><button> </button><p> ", 1)

  const n2 = t0()
  const n0 = _nthChild(n2, 2)
  const n1 = _next(n0)
  const x0 = _txt(n0)
  _on(n0, "click", () => (count.value++))
  const x1 = _txt(n1)
  _renderEffect(() => {
    const _count = count.value
    _setText(x0, "count is " + _toDisplayString(_count))
    _setClassName(n1, ((_count % 2 === 0) ? 1 : 0), "even")
    _setText(x1, "double: " + _toDisplayString(double.value))
  })
  return n2
\`\`\`

Read it top to bottom:

1. <code>_template(...)</code> holds the static HTML as **one string**, parsed once and then cloned (<code>t0()</code>).
2. <code>_nthChild</code>, <code>_next</code> and <code>_txt</code> walk to the button, the second paragraph and their text nodes **once**, at creation.
3. <code>_on</code> attaches the click listener directly.
4. <code>_renderEffect</code> is a reactive effect. When <code>count</code> changes it re-runs and writes the text nodes and the class. Nothing else runs: no render function, no tree, no diff.

The component object is tagged <code>__vapor: true</code>, which is how the runtime tells Vapor components apart.

## 5. Verified: What Actually Touches the DOM

Both versions were mounted in jsdom, a <code>MutationObserver</code> recorded the DOM, and the button was clicked once.

\`\`\`
Vapor (3.6.0-rc.12, createVaporApp):
  mutation: characterData  "count is 1"
  mutation: attributes class
  mutation: characterData  "double: 2"

Virtual DOM (3.5.44, createApp):
  mutation: childList   +1 -1
  mutation: attributes class
  mutation: childList   +1 -1
\`\`\`

Two lessons here. First, **the virtual DOM was already precise**: three DOM writes either way, and the static heading and paragraph were never touched. Vapor's advantage is not "fewer DOM writes" in this case; it is skipping the JavaScript work of building and diffing VNodes. Second, the writes differ in kind: Vapor updates the existing text node's data, while the VDOM path set the element's text content, which replaced its text node (<code>+1 -1</code>).

## 6. Using Vapor in an App (3.6 Release Candidate)

**All-Vapor app.** <code>createVaporApp(App).mount("#app")</code>. Built with Vite 8.3.4 and the counter above, the bundle came out at **18.34 kB gzip**, against **25.71 kB** for the same counter as a VDOM app on the same release candidate, because the VDOM renderer is not included (strings such as <code>Suspense</code> and <code>teleport</code> found in the VDOM bundle are absent). Full numbers and benchmarks are in [Vapor vs VDOM trade-offs](/interview-question/when-should-you-choose-vapor-over-vdom-in-a-real-app-trade-offs).

**Mixed app.** Install <code>vaporInteropPlugin</code> on a normal <code>createApp</code> app, and Vapor and VDOM components can nest. Verified: a VDOM parent rendered the Vapor counter and clicks updated it. Without the plugin, mounting failed (the warning wraps its two code lines in a Markdown fence, omitted here):

\`\`\`
[Vue warn]: Vapor component found in vdom tree but vapor-in-vdom interop was not installed. Make sure to install it:
import { vaporInteropPlugin } from 'vue'
app.use(vaporInteropPlugin)
TypeError: Cannot read properties of undefined (reading 'mount')
\`\`\`

**SSR.** rc.12 exports <code>createVaporSSRApp</code>. Verified in jsdom: the counter was server-rendered with <code>renderToString</code>, hydrated with <code>createVaporSSRApp</code>, the server's <code>&lt;button&gt;</code> element was reused (<code>true</code>) and a click updated it. See [SSR and hydration](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration) for the general mechanism.

## 7. Verified: What Vapor Does Not Support (rc.12)

| Feature | What happened in rc.12 |
| :--- | :--- |
| Options API | <code>&lt;script vapor&gt;</code> with <code>export default { data() }</code> failed to compile: "<code>&lt;script setup&gt;</code> cannot contain ES module exports". Vapor components are <code>&lt;script setup&gt;</code> or template-only |
| <code>v-memo</code> | Compiler warning: "v-memo is not supported in Vapor mode and will be ignored." |
| <code>getCurrentInstance()</code> | Returned <code>null</code> inside a Vapor component |
| Render functions and JSX | Stay VDOM components; they need the interop plugin (rc.1 notes) |
| <code>app.config.globalProperties</code>, <code>@vue:xxx</code> element events, <code>$el</code>/<code>$props</code> on template refs | Listed as unsupported in the rc.1 release notes (not separately tested here) |

Built-ins have Vapor counterparts in the rc.12 runtime exports: <code>VaporTeleport</code>, <code>VaporKeepAlive</code>, <code>VaporTransition</code> and <code>VaporTransitionGroup</code>. The export list has **no** Suspense counterpart; how [Suspense](/interview-question/what-is-suspense-in-vue) and Vapor interact was not tested here.

## 8. Side by Side

| | Virtual DOM | Vapor (3.6 rc) |
| :--- | :--- | :--- |
| Status | Stable since Vue 3.0 | Release candidate, opt-in |
| Compiled output | Render function returning VNodes | DOM creation code plus render effects |
| On update | Re-run render, diff VNodes, patch | Re-run only the affected effect, write the node |
| Static content | Cached VNodes, skipped by the diff | Part of a cloned template string |
| Authoring | Templates, render functions, JSX, Options API | <code>&lt;script setup&gt;</code> or template-only SFCs |
| Reactivity | <code>@vue/reactivity</code> | The same APIs (<code>ref</code>, <code>computed</code>) |
| Runtime | <code>runtime-dom</code> + <code>runtime-core</code> | <code>runtime-vapor</code> (plus VDOM runtime if you use interop) |
| Custom renderers | Yes (<code>createRenderer</code>) | Browser DOM only, per the package README |

That last row matters for [custom renderers](/interview-question/what-is-a-custom-renderer-in-vue-createrenderer): Vapor writes straight to the DOM, so canvas, terminal or native targets stay on the VDOM.

## 9. Common Pitfalls

- **Saying Vapor ships in 3.5.** It does not. 3.5.44 is stable without Vapor; Vapor is in 3.6 release candidates.
- **"Vapor removes the reactivity system."** It removes the virtual DOM. <code>ref</code>, <code>computed</code> and <code>watch</code> are the same APIs; effects simply drive DOM writes directly.
- **"The VDOM rewrites the whole DOM."** Verified above: for the counter, the VDOM made the same three DOM writes as Vapor. The cost Vapor removes is JavaScript work, not DOM churn.
- **Expecting Options API or render-function components to become Vapor.** Only <code>&lt;script setup&gt;</code> and template-only SFCs compile to Vapor.
- **Forgetting the interop plugin.** A Vapor component in a <code>createApp</code> tree without <code>vaporInteropPlugin</code> fails to mount.
- **Relying on <code>getCurrentInstance()</code> or <code>v-memo</code>.** Null and ignored, respectively, in rc.12.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Get the version right:</strong> <span style="color:#f0e2c8;">"Vapor is not in Vue 3.5; 3.5 is the stable line. Vapor ships in the Vue 3.6 release candidates, and it is opt-in per component with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup vapor&gt;</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it is:</strong> <span style="color:#f0e2c8;">"It is a compilation mode. Instead of a render function that returns VNodes, the compiler emits code that clones the static HTML once, keeps references to the dynamic nodes, and updates them inside reactive render effects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How it differs:</strong> <span style="color:#f0e2c8;">"The virtual DOM re-runs render and diffs a new tree against the old one on every update. Vapor skips both: a changed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> re-runs only the effect that writes that text node or class."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What stays the same:</strong> <span style="color:#f0e2c8;">"Template syntax and reactivity APIs are the same. I can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createVaporApp</code> for an all-Vapor app, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vaporInteropPlugin</code> to mix Vapor and VDOM components."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be nuanced:</strong> <span style="color:#f0e2c8;">"The VDOM was already precise about DOM writes thanks to patch flags; the gain is less JavaScript per update and a smaller runtime. The costs: no Options API, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code>, and it is still a release candidate."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the virtual DOM already patches only what changed, what does Vapor save?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The work before the patch: re-running the render function, allocating VNodes and diffing them. In a jsdom test both versions made the same three DOM writes for a click; the difference is the JavaScript in between, which grows with component size and update frequency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use Vapor components in an existing app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.use(vaporInteropPlugin)</code> on a normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp</code> app. Without it the rc.12 runtime warned that the interop was not installed and failed to mount. Mixing pulls in both runtimes, so keep Vapor regions coarse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Vapor work with SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In rc.12, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createVaporSSRApp</code> hydrated server-rendered markup in a test and reused the server elements. As it is a release candidate, test your own SSR setup rather than assuming parity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can render functions and JSX not be Vapor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vapor relies on the compiler seeing the whole template ahead of time to generate the creation code and effects. A render function builds structure at runtime, which is exactly what the virtual DOM handles.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ship Vapor in production today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not on a release candidate for a critical app. I would prototype it on a hot, self-contained part of the UI, measure, and plan adoption for the stable 3.6 release.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Virtual DOM** | JS tree of VNodes that is rebuilt and diffed on each update |
| **VNode** | One node of that tree: type, props, children, patch flag |
| **Vapor mode** | Opt-in SFC compilation to direct DOM updates, no VNodes |
| **Render effect** | Reactive effect that writes one or more DOM nodes when its state changes |
| **Fine-grained reactivity** | Updating exactly the nodes that depend on changed state |
| **createVaporApp** | Mounts an app made only of Vapor components |
| **vaporInteropPlugin** | Lets Vapor and VDOM components nest in one app |
| **Release candidate (rc)** | A pre-release that is feature-complete but not yet stable |

---
**Conclusion:** Vapor mode is an opt-in way to compile Vue SFCs: instead of a render function that returns VNodes to be diffed, the compiler emits code that clones static HTML once and updates specific nodes inside reactive render effects. It is not part of Vue 3.5; it ships in the 3.6 release candidates, and everything here was checked on 3.6.0-rc.12. In that build the compiled output had no VNodes at all, an all-Vapor counter bundle was about 29 percent smaller than its VDOM twin, it hydrated SSR markup, and it mixed with VDOM components through <code>vaporInteropPlugin</code>. It does not support the Options API or <code>v-memo</code>, and since the VDOM was already precise about DOM writes, the gain is less JavaScript per update rather than fewer DOM operations.`,
    examples: [
      {
        label: "A Vapor SFC (Vue 3.6 release candidate): one keyword opts the component in",
        tech: "vue",
        runnable: false,
        code: `<script setup vapor>
import { ref, computed } from "vue";
const count = ref(0);
const double = computed(() => count.value * 2);
</script>

<template>
  <section class="card">
    <h2>Vapor counter</h2>
    <p>Static paragraph that never changes.</p>
    <button @click="count++">count is {{ count }}</button>
    <p :class="{ even: count % 2 === 0 }">double: {{ double }}</p>
  </section>
</template>`,
      },
      {
        label: "Mounting Vapor: a pure Vapor app, or Vapor inside a virtual DOM app",
        tech: "js",
        runnable: false,
        code: `// Option A: an app made only of Vapor components (no virtual DOM runtime is bundled)
// src/main.js
import { createVaporApp } from "vue"; import App from "./Counter.vue"; createVaporApp(App).mount("#app");

// Option B: Vapor components inside an existing virtual DOM app
// src/main.js
import { createApp, vaporInteropPlugin } from "vue"; import App from "./Counter.vue"; createApp(App).use(vaporInteropPlugin).mount("#app");`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When should you choose Vapor over VDOM in a real app — trade-offs?",
    seoDescription:
      "When Vue Vapor mode is worth it: measured bundle sizes and update timings on 3.6.0-rc.12, interop costs, unsupported features and a decision checklist.",
    description: `**Question presented to candidate:**
"Assume Vue 3.6 ships Vapor mode as stable. We have a large Vue 3 dashboard and a separate lightweight marketing widget embedded on partner sites. Where, if anywhere, would you use Vapor, and what would you weigh before switching?"

**What a strong answer should cover:**
- What Vapor changes: compiled DOM updates instead of VNode diffing, and an optional runtime without the virtual DOM.
- Where the gains are real: **update-heavy UI** (large tables, frequent ticks) and **bundle-sensitive standalone apps** that can be all-Vapor.
- Where they are not: pages dominated by layout and paint, or initial render, where Vapor and VDOM are close; and mixed apps, where interop **adds** both runtimes.
- Compatibility limits: \`<script setup>\`/template-only SFCs only, no Options API, no \`v-memo\`, \`getCurrentInstance()\` returns null; libraries built on render functions stay VDOM.
- Status: Vapor is in the 3.6 release candidates today, not stable 3.5.
- Method: measure first, adopt per component or per island, keep boundaries coarse.

**Clarifying questions expected:**
- "Is the bottleneck JavaScript work on updates, initial load, or layout and paint?"
- "How much of the UI comes from third-party component libraries?"

**Code / implementation expected:** Optional — explain how you would benchmark one component both ways.`,
    answer: `**Target Audience:** Senior Vue developers and tech leads deciding whether and where to adopt Vapor mode. Assumes you know what Vapor is; if not, read [What is Vapor mode](/interview-question/what-is-vapor-mode-in-vue-3-5-and-how-does-it-differ-from-the-virtual-dom) first.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. All numbers here were measured for this answer, on **vue 3.6.0-rc.12** (a release candidate) and vue 3.5.44 for the stable baseline. Bundles were built with Vite 8.3.4 and @vitejs/plugin-vue 6.0.10; timings come from headless Chromium driven by Playwright on a 4-core sandbox. Treat them as relative, not as absolute numbers for your hardware, and expect release-candidate behaviour to change.

## 1. Why This Even Matters — A Story First

A delivery company is offered electric vans. They are cheaper to run, quieter, and accelerate faster in town. The fleet manager does not replace every vehicle on Monday morning. She asks: which routes are short urban hops where the van shines? Which are long rural runs where charging gets in the way? Do our loading docks fit them? And are these vans in full production, or still pre-production models?

Vapor mode is the electric van. It is genuinely faster at a specific kind of work, it has compatibility constraints, and today it is a pre-production model (a release candidate). The interview question is really asking whether you think like the fleet manager: **match the tool to the route, measure, and adopt gradually**.

## 2. The Core Idea

Vapor removes two things: the work of **re-rendering and diffing VNodes** on every update, and, in an all-Vapor app, the **virtual DOM runtime** from the bundle. Everything else (layout, paint, the network, your own logic) stays the same. So Vapor helps exactly as much as those two costs dominate your app.

📌 **Interview term: Update cost** — the JavaScript time between a state change and the DOM write. In the virtual DOM this includes re-running the render function and diffing; in Vapor it is just the affected render effects.

📌 **Interview term: Baseline bundle** — the framework code shipped before any of your components. An all-Vapor app (<code>createVaporApp</code>) does not bundle the VDOM renderer.

📌 **Interview term: Interop boundary** — a place where a Vapor component sits inside a VDOM tree or the other way round, enabled by <code>vaporInteropPlugin</code>. Each boundary works, but the app then ships both runtimes.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Decision flow: is the bottleneck update JavaScript or baseline bundle size, can the code be script setup only, then choose Vapor islands or stay on the virtual DOM">
  <defs>
    <marker id="vvt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="200" y="20" width="300" height="50" rx="10"/>
  <text class="d-text" x="350" y="50" text-anchor="middle">Profiled bottleneck?</text>
  <path class="d-edge" d="M 270 74 L 150 124" marker-end="url(#vvt-arrow)"/>
  <path class="d-edge" d="M 430 74 L 550 124" marker-end="url(#vvt-arrow)"/>
  <rect class="d-box-muted" x="30" y="130" width="240" height="56" rx="10"/>
  <text class="d-text" x="150" y="154" text-anchor="middle">layout, paint, network</text>
  <text class="d-sub" x="150" y="174" text-anchor="middle">Vapor barely helps</text>
  <rect class="d-box" x="430" y="130" width="240" height="56" rx="10"/>
  <text class="d-text" x="550" y="154" text-anchor="middle">update JS or bundle</text>
  <text class="d-sub" x="550" y="174" text-anchor="middle">Vapor can help</text>
  <path class="d-edge" d="M 550 190 L 550 230" marker-end="url(#vvt-arrow)"/>
  <rect class="d-box-accent" x="400" y="236" width="300" height="60" rx="10"/>
  <text class="d-text d-accent" x="550" y="262" text-anchor="middle">script setup only and few</text>
  <text class="d-text d-accent" x="550" y="282" text-anchor="middle">render-function libraries?</text>
  <rect class="d-box-muted" x="30" y="236" width="300" height="60" rx="10"/>
  <text class="d-text" x="180" y="262" text-anchor="middle">otherwise: stay on VDOM</text>
  <text class="d-sub" x="180" y="282" text-anchor="middle">optimise with known techniques</text>
</svg>

If both conditions on the right hold, Vapor is worth a measured trial on that part of the app. If either fails, the established [performance techniques](/interview-question/how-do-you-optimize-performance-in-a-vue-app) usually give more for less risk.

## 3. Verified: Bundle Size

The same counter component, built four ways with Vite 8.3.4 (production, minified):

| Build | JS (min) | JS (gzip) |
| :--- | :--- | :--- |
| Vue 3.5.44, VDOM, <code>createApp</code> | 62.67 kB | 24.73 kB |
| Vue 3.6.0-rc.12, VDOM, <code>createApp</code> | 65.78 kB | 25.71 kB |
| Vue 3.6.0-rc.12, **all-Vapor**, <code>createVaporApp</code> | 48.49 kB | **18.34 kB** |
| Vue 3.6.0-rc.12, VDOM app + Vapor child via <code>vaporInteropPlugin</code> | 146.23 kB | **53.57 kB** |

Two conclusions that interviewers rarely hear:

- An all-Vapor app saved about **7.4 kB gzip** (29 percent) on this baseline. Real, but not "a tenth of the size": the reactivity system, scheduler and Vapor runtime still ship.
- **Mixing made the bundle bigger**, more than double the plain VDOM build, because both runtimes and the interop layer are included. Adopting Vapor for one component inside a VDOM app is a speed decision, never a size decision.

## 4. Verified: Update and Render Speed

The benchmark component renders 5,000 keyed rows (<code>v-for</code> over a <code>shallowRef</code> array), compiled once as Vapor (<code>createVaporApp</code>) and once as VDOM (<code>createApp</code>), both on 3.6.0-rc.12. Three operations in the spirit of the js-framework-benchmark: **create** 5,000 rows, **update** every 10th label, **swap** rows 1 and 998. Each number is the median of 7 fresh page loads.

**Script only** (time until a <code>setTimeout(0)</code> after the change, so Vue's work is done but no layout or paint has happened):

\`\`\`
vdom36-bench median script-only ms (no layout or paint) over 7 runs: create=34.6 update=14.6 swap=14.3
vapor36-bench median script-only ms (no layout or paint) over 7 runs: create=35.2 update=5.3 swap=1.8
vdom36-bench median script-only ms (no layout or paint) over 7 runs: create=32.0 update=14.6 swap=14.0
vapor36-bench median script-only ms (no layout or paint) over 7 runs: create=39.1 update=4.2 swap=1.7
\`\`\`

**Full frame** (time until after the next animation frame, so layout and paint are included):

\`\`\`
vdom36-bench median ms over 7 runs: create=206.9 update=78.3 swap=33.5
vapor36-bench median ms over 7 runs: create=217.7 update=79.2 swap=21.5
vdom36-bench median ms over 7 runs: create=183.9 update=77.8 swap=30.8
vapor36-bench median ms over 7 runs: create=204.1 update=72.1 swap=20.6
\`\`\`

How to read this honestly:

- **Updates are where Vapor wins.** Script time for "update every 10th row" dropped from about 14.6 ms to 4 to 5 ms, and the swap from about 14 ms to under 2 ms. The VDOM has to re-run the list render and diff 5,000 VNodes; Vapor only touches the rows whose data changed.
- **Initial creation was not faster** in this test (32 to 35 ms VDOM vs 35 to 39 ms Vapor). Both have to create 10,000 cells.
- **Layout and paint dominate full frames.** "Update" took about 72 to 79 ms per frame either way, because re-laying out a 5,000-row table costs far more than Vue's diff. Only the swap stayed visibly faster with Vapor (about 21 ms vs 31 to 34 ms).

So Vapor removes framework overhead; it cannot remove browser rendering cost. A page that is slow because it shows 5,000 rows needs [virtual scrolling](/interview-question/how-do-you-render-very-large-lists-efficiently-in-vue-virtual-scrolling) first, whatever the rendering mode.

## 5. Compatibility Costs (Checked on rc.12)

| Constraint | Effect on a real app |
| :--- | :--- |
| Only <code>&lt;script setup&gt;</code> and template-only SFCs | Options API components must be rewritten first; <code>export default</code> in <code>&lt;script vapor&gt;</code> failed to compile |
| Render functions and JSX stay VDOM | Many UI libraries use render functions internally, so they need interop |
| <code>v-memo</code> ignored | Compiler warns "v-memo is not supported in Vapor mode and will be ignored." |
| <code>getCurrentInstance()</code> returns <code>null</code> | Libraries or internal helpers that rely on it break inside Vapor components |
| No interop plugin, no mount | A Vapor child in a <code>createApp</code> tree failed to mount without <code>vaporInteropPlugin</code> |
| Browser DOM only | No Vapor for [custom renderers](/interview-question/what-is-a-custom-renderer-in-vue-createrenderer) (canvas, terminal, native) |
| Release candidate | APIs and behaviour may change before 3.6.0; the rc.1 notes call out remaining interop edge cases |

The <a href="https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1" target="_blank" rel="noopener noreferrer">3.6.0-rc.1 release notes</a> also recommend keeping Vapor and VDOM regions separate where possible rather than interleaving them finely. SSR hydration with <code>createVaporSSRApp</code> did work in a jsdom test on rc.12.

## 6. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What does the profiler say is slow? | Vapor only helps update JavaScript and baseline size. |
| How much code is Options API or render functions? | That code cannot become Vapor without a rewrite. |
| Which third-party component libraries do we use? | They stay VDOM, so mixing (and its bundle cost) is likely. |
| Is any part a standalone app we fully control? | An all-Vapor app is where the bundle saving appears. |
| What is our policy on pre-release dependencies? | Vapor is in release candidates until 3.6.0 is stable. |

## 7. A Decision Guide

| Situation | Recommendation |
| :--- | :--- |
| Embeddable widget or micro-frontend on partner sites, all your own <code>&lt;script setup&gt;</code> code | Strong candidate for an **all-Vapor app**: smaller baseline, no library baggage |
| Live dashboard, trading screen, editor with frequent small updates | Candidate for **Vapor islands** on the hot components; measure update cost |
| Large data table that re-renders often | First virtualise the rows; then Vapor can cut the remaining update JS |
| Typical CRUD app built on a component library | **Stay on VDOM**; interop would add bundle size, and updates are rarely the bottleneck |
| Options API or mixin-heavy codebase | Stay on VDOM until migrated to [the Composition API](/interview-question/what-is-the-composition-api-and-how-does-it-differ-from-the-options-api) |
| Render-function or JSX libraries, custom renderers | VDOM (Vapor does not apply) |
| Production app today, pre-release not allowed | Prototype only, until 3.6.0 is stable |

The partner-site widget from the question is the best case: you control every component, bundle size matters on someone else's page, and there is no library to interoperate with. The dashboard is a "measure, then maybe islands" case.

## 8. How to Run the Experiment Yourself

1. **Profile first.** Record a Chromium performance trace of the slow interaction. If most of the frame is "Rendering" and "Painting", Vapor will not fix it.
2. **Pick one hot, self-contained component.** It must be <code>&lt;script setup&gt;</code>, not use <code>v-memo</code> or <code>getCurrentInstance()</code>, and ideally have no render-function children.
3. **Add <code>vapor</code>** to its <code>&lt;script setup&gt;</code>, install <code>vaporInteropPlugin</code>, and check behaviour with your existing tests.
4. **Measure both** script-only and full-frame time, as the example harness does, plus bundle size from <code>vite build</code>.
5. **Decide per component**, and keep boundaries coarse: one Vapor subtree, not alternating layers.

## 9. Common Pitfalls

- **Adopting Vapor to shrink a mixed app.** Measured: the interop build was 53.57 kB gzip vs 25.71 kB for plain VDOM.
- **Benchmarking only script time.** Vapor cut update JS by about two-thirds, but full frames for the same update were within a few milliseconds because layout dominated.
- **Expecting faster first render.** Creation of 5,000 rows was not faster in this test.
- **Ignoring library internals.** A component library built on render functions or <code>getCurrentInstance()</code> stays VDOM or breaks inside Vapor.
- **Fine-grained interleaving.** Many small interop boundaries add overhead and edge cases; prefer one Vapor island per feature.
- **Shipping a release candidate to production by default.** Pin the version, test thoroughly, and plan to move to 3.6.0 stable.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">"Vapor removes two costs: re-rendering and diffing VNodes on updates, and, in an all-Vapor app, the virtual DOM runtime. It helps exactly as much as those costs dominate."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Where it wins:</strong> <span style="color:#f0e2c8;">"Update-heavy UI and bundle-sensitive standalone apps. On the 3.6 release candidate I measured update JavaScript for a 5,000-row table dropping from about 15 ms to 5 ms, and an all-Vapor counter bundle about 29 percent smaller."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where it does not:</strong> <span style="color:#f0e2c8;">"Layout and paint still dominate big pages, first render was not faster, and mixing Vapor into a VDOM app with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vaporInteropPlugin</code> more than doubled the bundle because both runtimes ship."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compatibility:</strong> <span style="color:#f0e2c8;">"Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script setup&gt;</code> or template-only SFCs; no Options API, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getCurrentInstance()</code> is null, and render-function libraries stay VDOM. And it is still a release candidate."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My approach:</strong> <span style="color:#f0e2c8;">"Profile first, pick one hot self-contained component, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vapor</code>, measure script and full-frame time, and keep Vapor as coarse islands. A partner-site widget is the ideal all-Vapor case."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Vapor not speed up the initial render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both modes must create every element; Vapor clones template strings while the VDOM creates VNodes and then elements, and for 5,000 rows those costs were similar (about 32 to 39 ms each). Vapor saves work on later updates, where the VDOM has to re-render and diff the whole list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you convert a component library to Vapor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not first. Libraries often use render functions or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getCurrentInstance()</code>, which stay VDOM or return null in Vapor. I would wait for the library to ship Vapor builds and convert my own hot components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Vapor compare with just using <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-memo</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Those reduce VDOM work within the existing model and work today on stable 3.5. Vapor removes the diff entirely. Note that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> is ignored in Vapor, so do not combine them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the bundle saving worth it on its own?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an embeddable widget or a micro-frontend, yes: 7 kB gzip on every partner page adds up. For a large app the framework baseline is a small fraction of total JavaScript, so it rarely justifies a migration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would make you roll back a Vapor island?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No measurable improvement in the profiled interaction, interop bugs at the boundary, or a library that needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getCurrentInstance()</code>. Because Vapor is per component, rolling back is removing one keyword.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Update cost** | JavaScript time from a state change to the DOM write |
| **Baseline bundle** | Framework code shipped before your own components |
| **All-Vapor app** | App mounted with <code>createVaporApp</code>, no VDOM runtime |
| **Vapor island** | A Vapor subtree inside a VDOM app |
| **Interop boundary** | Where Vapor and VDOM components meet via <code>vaporInteropPlugin</code> |
| **Script-only time** | Benchmark time excluding layout and paint |
| **Full-frame time** | Benchmark time including layout and paint |
| **Release candidate** | Feature-complete pre-release, not yet stable |

---
**Conclusion:** Choose Vapor where its two real wins apply: update-heavy components, where measured update JavaScript dropped from about 14.6 ms to 4 to 5 ms for a 5,000-row table on 3.6.0-rc.12, and standalone all-Vapor apps, where the baseline bundle shrank by about 29 percent. Do not expect it to fix layout-bound pages, speed up first render, or shrink a mixed app (interop more than doubled the bundle). Factor in the compatibility limits (no Options API, no <code>v-memo</code>, render-function libraries stay VDOM) and the fact that it is still a release candidate, then adopt it per island, after profiling, and with measurements of both script and full-frame time.`,
    examples: [
      {
        label: "Benchmark component: 5,000 keyed rows (compiled once as Vapor, once as VDOM)",
        tech: "vue",
        runnable: false,
        code: `<script setup vapor>
import { shallowRef } from "vue";
const rows = shallowRef([]);
let id = 1;
const build = (n) => Array.from({ length: n }, () => ({ id: id++, label: "row " + id }));
const create = () => { rows.value = build(5000); };
const update = () => { rows.value = rows.value.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + " !!!" } : r)); };
const swap = () => { const a = rows.value.slice(); const t = a[1]; a[1] = a[998]; a[998] = t; rows.value = a; };
window.__bench = { create, update, swap };
</script>
<template>
  <table><tbody>
    <tr v-for="row in rows" :key="row.id"><td>{{ row.id }}</td><td>{{ row.label }}</td></tr>
  </tbody></table>
</template>`,
      },
      {
        label: "Playwright harness used for the timings (median of 7 page loads)",
        tech: "js",
        runnable: false,
        code: `import { chromium } from "playwright-core";
import http from "http"; import { readFileSync } from "fs"; import { join } from "path";
const dirs = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const dir of dirs) {
  const srv = http.createServer((q, s) => { const p = q.url === "/" ? "/index.html" : q.url; try { s.setHeader("content-type", p.endsWith(".js") ? "text/javascript" : "text/html"); s.end(readFileSync(join(dir, "dist", p))); } catch { s.statusCode = 404; s.end(); } }).listen(5263);
  const res = { create: [], update: [], swap: [] };
  for (let run = 0; run < 7; run++) {
    const page = await browser.newPage();
    await page.goto("http://localhost:5263/");
    for (const op of ["create", "update", "swap"]) {
      const ms = await page.evaluate((op) => new Promise((r) => { const t = performance.now(); window.__bench[op](); requestAnimationFrame(() => setTimeout(() => r(performance.now() - t), 0)); }), op);
      res[op].push(ms);
    }
    await page.close();
  }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1].toFixed(1);
  console.log(dir.split("/").pop(), "median ms over 7 runs:", Object.entries(res).map(([k, v]) => \`\${k}=\${med(v)}\`).join(" "));
  await new Promise((r) => srv.close(r));
}
await browser.close();`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does the Vue compiler optimize templates (static hoisting, patch flags, block tree)?",
    seoDescription:
      "How Vue compiles templates for speed: cached static nodes, patch flags, block trees and static stringification, with real Vue 3.5.44 compiler output.",
    description: `**Question presented to candidate:**
"People say Vue's virtual DOM is faster than a naive one because Vue has a compiler. What exactly does the template compiler do to make updates cheap? Talk me through static hoisting, patch flags and the block tree."

**What a strong answer should cover:**
- Templates are compiled ahead of time into render functions, so the compiler knows which parts **can never change**.
- **Static hoisting / caching**: static VNodes are created once and reused; in Vue 3.5 they are cached per instance in \`_cache\` (flag \`-1 /* CACHED */\`), and static props objects are hoisted to module scope.
- **Patch flags**: each dynamic node carries a bitmask (\`1 TEXT\`, \`2 CLASS\`, \`8 PROPS\` plus the prop names, \`16 FULL_PROPS\`, \`128 KEYED_FRAGMENT\`, ...) so the renderer compares only what can change.
- **Block tree**: \`openBlock()\` / \`createElementBlock()\` collect dynamic descendants into a flat \`dynamicChildren\` array; updates walk that array instead of the whole tree. Structural directives (\`v-if\`, \`v-for\`) open new blocks.
- **Static stringification**: long runs of static elements become one \`createStaticVNode\` HTML string.
- Hand-written render functions get none of this.

**Clarifying questions expected:**
- "Do you want the concepts, or the actual compiled output?"

**Code / implementation expected:** Optional — compiled output for a small template, annotated.`,
    answer: `**Target Audience:** Vue developers who know the virtual DOM exists and want to explain how Vue makes it cheap. No compiler background needed.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every compiled snippet is real output of <code>@vue/compiler-sfc</code> 3.5.44 <code>compileTemplate()</code> (production mode), with one comparison against 3.4.38. Runtime claims come from mounting the example in jsdom with <code>scripts/verify-vue-example.mjs</code> and a jsdom timing script.

## 1. Why This Even Matters — A Story First

A proof-reader gets a 300-page contract back from the lawyers with "a few changes". She could read all 300 pages again, comparing every word with the old version. Or the lawyers could hand her a list: "page 12, the date; page 40, the price; page 211, a name". She checks three places and is done.

A naive virtual DOM is the first proof-reader. On every update it builds the whole page again and compares every node with the previous version, because it has no idea which parts could have changed.

Vue's compiler is the lawyer with the list. It reads your template **before the app ever runs** and writes down, for each node, whether it can change and **what** about it can change. At runtime the renderer only visits the listed places and only compares the listed properties. That is the whole idea; the rest is the detail of how the list is written.

## 2. The Core Idea

📌 **Interview term: Template compiler** — the part of Vue (<code>@vue/compiler-dom</code>, driven by <code>@vue/compiler-sfc</code> in a build) that turns a template into a JavaScript **render function**. Because it runs ahead of time, it can analyse the template and embed optimisation hints in the output.

📌 **Interview term: Compiler-informed virtual DOM** — Vue's name for this approach: the runtime still builds and diffs VNodes, but uses the compiler's hints to skip work. React's runtime, by contrast, gets no such hints from JSX. For the diff itself, see [how Vue diffs keyed lists](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists).

There are four optimisations to know:

| Optimisation | What it removes | Marker in compiled code |
| :--- | :--- | :--- |
| Static caching (hoisting) | Re-creating VNodes that never change | <code>_cache[n] \\|\\| (_cache[n] = ...)</code>, <code>-1 /* CACHED */</code>, <code>_hoisted_n</code> |
| Patch flags | Comparing props or text that cannot change | Numeric flag such as <code>1 /* TEXT */</code> |
| Block tree | Walking static parts of the tree | <code>_openBlock()</code>, <code>_createElementBlock()</code> |
| Static stringification | Creating many static VNodes at all | <code>_createStaticVNode("...html...", n)</code> |

## 3. Verified: One Template, Annotated

This template has a static heading, text, a class binding, two bound props, an event handler, a <code>v-if</code> and a keyed <code>v-for</code>:

\`\`\`vue-html
<div class="card">
  <h2>Static title</h2>
  <p class="msg">{{ message }}</p>
  <span :class="cls">class only</span>
  <input :value="text" :placeholder="hint" />
  <button @click="count++">clicked</button>
  <p v-if="show">shown {{ count }}</p>
  <ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>
</div>
\`\`\`

Compiled by 3.5.44:

\`\`\`js
const _hoisted_1 = { class: "card" }
const _hoisted_2 = { class: "msg" }
const _hoisted_3 = ["value", "placeholder"]
const _hoisted_4 = { key: 0 }

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[1] || (_cache[1] = _createElementVNode("h2", null, "Static title", -1 /* CACHED */)),
    _createElementVNode("p", _hoisted_2, _toDisplayString(_ctx.message), 1 /* TEXT */),
    _createElementVNode("span", {
      class: _normalizeClass(_ctx.cls)
    }, "class only", 2 /* CLASS */),
    _createElementVNode("input", {
      value: _ctx.text,
      placeholder: _ctx.hint
    }, null, 8 /* PROPS */, _hoisted_3),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = $event => (_ctx.count++))
    }, "clicked"),
    (_ctx.show)
      ? (_openBlock(), _createElementBlock("p", _hoisted_4, "shown " + _toDisplayString(_ctx.count), 1 /* TEXT */))
      : _createCommentVNode("v-if", true),
    _createElementVNode("ul", null, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.items, (item) => {
        return (_openBlock(), _createElementBlock("li", {
          key: item.id
        }, _toDisplayString(item.name), 1 /* TEXT */))
      }), 128 /* KEYED_FRAGMENT */))
    ])
  ]))
}
\`\`\`

Line by line:

- **<code>_hoisted_1</code> to <code>_hoisted_4</code>**: props objects that never change are created once at module level and shared. <code>_hoisted_3</code> is different: it is the **list of dynamic prop names** for the <code>input</code>.
- **The <code>h2</code>** is wrapped in <code>_cache[1] || (_cache[1] = ...)</code> with flag <code>-1 /* CACHED */</code>: built on the first render, reused on every later one, and skipped by the diff.
- **<code>1 /* TEXT */</code>** on the paragraph: only its text can change. Its class is static, so the renderer will not even look at it.
- **<code>2 /* CLASS */</code>** on the span: only the class needs comparing.
- **<code>8 /* PROPS */</code> plus <code>["value", "placeholder"]</code>** on the input: compare exactly those two props.
- **The <code>button</code> has no flag at all.** Its handler is cached in <code>_cache[0]</code> (📌 **Interview term: Handler caching**), so the prop is the same function every render and the node counts as static. Without caching, a new arrow function each render would force a props comparison.
- **<code>v-if</code>** opens its own block (<code>_openBlock()</code> inside the ternary); the <code>v-for</code> is a <code>Fragment</code> block flagged <code>128 /* KEYED_FRAGMENT */</code>, telling the renderer to run the keyed diff on its children.

📌 **Interview term: Patch flag** — a bitmask on a VNode that tells the renderer which kinds of change are possible. From the 3.5.44 <code>@vue/shared</code> typings: <code>TEXT = 1</code>, <code>CLASS = 2</code>, <code>STYLE = 4</code>, <code>PROPS = 8</code>, <code>FULL_PROPS = 16</code>, <code>NEED_HYDRATION = 32</code>, <code>STABLE_FRAGMENT = 64</code>, <code>KEYED_FRAGMENT = 128</code>, <code>UNKEYED_FRAGMENT = 256</code>, <code>NEED_PATCH = 512</code>, <code>DYNAMIC_SLOTS = 1024</code>, and the special negatives <code>CACHED = -1</code> and <code>BAIL = -2</code>. Flags combine: a paragraph with bound class, style, title and text compiled to <code>15 /* TEXT, CLASS, STYLE, PROPS */</code>.

Spreading (<code>v-bind="obj"</code>) or a dynamic argument (<code>:[dyn]="v"</code>) compiled to <code>16 /* FULL_PROPS */</code>: the compiler cannot know the keys, so the renderer compares every prop. That is why a [dynamic argument](/interview-question/what-are-dynamic-arguments-and-v-bind-shorthand) or a spread object is slightly more expensive than named bindings.

## 4. The Block Tree

📌 **Interview term: Block** — a VNode created with <code>openBlock()</code> + <code>createElementBlock()</code> that collects every **dynamic descendant** (anything with a patch flag, or a nested block) into a flat array, <code>dynamicChildren</code>. When the block updates, the renderer patches that array directly and never walks the static parts of the tree.

📌 **Interview term: Structural directive boundary** — <code>v-if</code> and <code>v-for</code> can change the **shape** of the tree, so a flat list of dynamic nodes would no longer line up. Each branch or list therefore becomes its own block, and the parent tracks that block as one dynamic child.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="The root block keeps a flat dynamicChildren list that points only at the dynamic nodes. Static nodes are skipped and a v-if branch is its own nested block">
  <rect class="d-box-accent" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text d-accent" x="360" y="50" text-anchor="middle">root block: div</text>
  <rect class="d-box-muted" x="20" y="130" width="120" height="44" rx="8"/>
  <text class="d-sub" x="80" y="157" text-anchor="middle">h3 static</text>
  <rect class="d-box-muted" x="160" y="130" width="120" height="44" rx="8"/>
  <text class="d-sub" x="220" y="157" text-anchor="middle">p static</text>
  <rect class="d-box" x="300" y="130" width="120" height="44" rx="8"/>
  <text class="d-sub" x="360" y="157" text-anchor="middle">p TEXT</text>
  <rect class="d-box" x="440" y="130" width="120" height="44" rx="8"/>
  <text class="d-sub" x="500" y="157" text-anchor="middle">span CLASS</text>
  <rect class="d-box" x="580" y="130" width="120" height="44" rx="8"/>
  <text class="d-sub" x="640" y="157" text-anchor="middle">v-if block</text>
  <rect class="d-box-muted" x="580" y="230" width="120" height="44" rx="8"/>
  <text class="d-sub" x="640" y="257" text-anchor="middle">em static</text>
  <path class="d-edge" d="M 640 178 L 640 226"/>
  <path class="d-edge-accent" d="M 380 72 L 360 126"/>
  <path class="d-edge-accent" d="M 420 72 L 500 126"/>
  <path class="d-edge-accent" d="M 460 72 L 630 126"/>
  <path class="d-edge-dashed" d="M 270 72 L 90 126"/>
  <path class="d-edge-dashed" d="M 300 72 L 230 126"/>
</svg>

Solid accent lines are the entries in <code>dynamicChildren</code>; dashed lines are tree children the update never visits. The <code>em</code> inside the <code>v-if</code> belongs to the nested block, not to the root.

**Verified at runtime.** The runnable example renders exactly this shape and reads its own root block after mounting:

\`\`\`
[app] RENDERED: Static headingStatic paragraph one.Static paragraph two.helloclass bindinginside a v-ifchange text9 elements under the root, 4 tracked as dynamic: p(flag 1), span(flag 2), section(flag 0), pre(flag 1)
[driver] after click, 4th child p: hello!
\`\`\`

Nine elements exist, but an update visits **four** VNodes: the text paragraph (flag 1), the span (flag 2), the <code>v-if</code> section (flag 0, present because it is a nested block, not because of a flag) and the <code>pre</code> showing the report. The heading, the static paragraphs, the <code>em</code> and the button with its cached handler are not in the list.

## 5. Static Caching in 3.5 vs Hoisting in 3.4

Interview material often says "static nodes are hoisted out of the render function". That was true up to 3.4. The same template compiled with **3.4.38** gives:

\`\`\`js
const _hoisted_2 = /*#__PURE__*/_createElementVNode("h2", null, "Static title", -1 /* HOISTED */)
...
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _hoisted_2,
\`\`\`

In **3.5.44** the props objects are still hoisted, but static **VNodes** are cached per component instance in <code>_cache</code> and the flag is called <code>CACHED</code>. The runtime effect is the same (the node is created once per instance and skipped by the diff); the difference is where it lives. Saying "hoisted or cached, depending on version" shows you have looked at real output.

## 6. Static Stringification

When enough static content sits together, creating even cached VNodes for it is wasteful. The compiler turns it into **one HTML string** that the runtime inserts with <code>innerHTML</code>-style parsing.

Verified thresholds in 3.5.44:

\`\`\`js
// 3 plain static <p> elements: cached one by one
_cache[0] || (_cache[0] = _createElementVNode("p", null, "a", -1 /* CACHED */)),
_cache[1] || (_cache[1] = _createElementVNode("p", null, "b", -1 /* CACHED */)),
_cache[2] || (_cache[2] = _createElementVNode("p", null, "c", -1 /* CACHED */)),

// 5 static <p class="x"> elements in a row: one static VNode
_cache[0] || (_cache[0] = _createStaticVNode("<p class=\\"x\\">a</p><p class=\\"x\\">b</p><p class=\\"x\\">c</p><p class=\\"x\\">d</p><p class=\\"x\\">e</p>", 5)),
\`\`\`

A run of five consecutive static elements **with attributes** was stringified, as was a <code>&lt;ul&gt;</code> with 19 or 20 static <code>&lt;li&gt;</code> children; three plain elements were not. 📌 **Interview term: Static VNode** — a VNode whose content is a ready-made HTML string, plus a count of the top-level nodes it produces, used for large static regions such as a footer or a legal page.

## 7. Verified: What It Buys You

Same UI built two ways: a compiled template with 500 static rows plus one paragraph showing <code>{{ n }}</code>, and a hand-written <code>h()</code> render function producing identical DOM. Each was mounted in jsdom (production build of Vue 3.5.44) and <code>n</code> was incremented 300 times, waiting for <code>nextTick</code> each time:

\`\`\`
template 300 updates of one text node beside 500 static rows: 8.8 ms (0.029 ms per update) correct=true
h()      300 updates of one text node beside 500 static rows: 353.1 ms (1.177 ms per update) correct=true
template 300 updates of one text node beside 500 static rows: 5.0 ms (0.017 ms per update) correct=true
h()      300 updates of one text node beside 500 static rows: 193.9 ms (0.646 ms per update) correct=true
compiled template uses createStaticVNode: true
\`\`\`

The compiled template was roughly **35 to 40 times faster** per update in this test, because each update patched one block with one dynamic child, while the <code>h()</code> version rebuilt and diffed about 1,500 VNodes. jsdom is not a browser, so treat the ratio as indicative; the direction is the point. A raw <code>h()</code> VNode has <code>patchFlag = 0</code> and <code>dynamicChildren = null</code> (also verified), so the renderer falls back to a full diff.

## 8. Where the Optimisations Stop

- **Render functions and JSX** get no hints unless you add them by hand, which is why [Vue's docs recommend templates](/interview-question/what-is-vue-template-syntax-interpolation-directives-expressions) for most components.
- **Components** are not stringified or cached; their props still get flags (<code>8 /* PROPS */</code> with names), and a component re-renders only when its props actually change.
- **<code>v-once</code> and <code>v-memo</code>** go further by caching dynamic content you know is stable; see [v-once and v-memo](/interview-question/what-are-v-once-and-v-memo).
- **Vapor mode** (Vue 3.6 release candidates) takes the next step and drops VNodes entirely; see [Vapor mode](/interview-question/what-is-vapor-mode-in-vue-3-5-and-how-does-it-differ-from-the-virtual-dom).

## 9. Common Pitfalls

- **Saying static nodes are always "hoisted outside the render function".** In 3.5 static VNodes are cached per instance in <code>_cache</code>; only props objects are hoisted.
- **Thinking patch flags make every binding free.** <code>v-bind="obj"</code> and dynamic arguments compile to <code>FULL_PROPS</code>, which compares every prop.
- **Writing performance-critical lists as <code>h()</code> render functions.** They bail out of all of this; measured above at tens of times slower for a mostly static tree.
- **Using runtime template compilation in production.** Templates compiled in the browser need the full build and still cost compile time on load; precompile with a bundler.
- **Assuming the block tree survives any structure.** <code>v-if</code> and <code>v-for</code> start new blocks precisely because the shape can change; a <code>v-for</code> without keys is flagged <code>UNKEYED_FRAGMENT</code> and patched by position.
- **Custom renderers and stringification.** A static VNode needs the renderer's <code>insertStaticContent</code>; see [custom renderers](/interview-question/what-is-a-custom-renderer-in-vue-createrenderer).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">"Vue compiles templates ahead of time, so the compiler can mark what can never change and what exactly can change. The runtime still uses a virtual DOM, but it only compares what the compiler listed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Static content:</strong> <span style="color:#f0e2c8;">"Static VNodes are created once and reused: hoisted to module scope up to 3.4, cached per instance in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_cache</code> with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CACHED</code> flag in 3.5. Long static runs become a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createStaticVNode</code> HTML string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Patch flags:</strong> <span style="color:#f0e2c8;">"Every dynamic node gets a bitmask: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> text, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2</code> class, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">8</code> props with the exact prop names, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">16</code> full props for spreads. The renderer checks only those parts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Block tree:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">openBlock</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createElementBlock</code> collect dynamic descendants into a flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicChildren</code> array, so an update skips the static tree. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-if</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> open their own blocks because they can change shape."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it matters:</strong> <span style="color:#f0e2c8;">"In a test, one text update beside 500 static rows was tens of times faster from a template than from an equivalent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h()</code> render function, which gets no hints and falls back to a full diff."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the event handler not marked dynamic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With handler caching the compiler stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$event =&gt; (count++)</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_cache[0]</code>, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onClick</code> prop is the same function on every render. The node has no patch flag and stays out of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicChildren</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">FULL_PROPS</code> mean and when do you get it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler cannot know which keys exist, for example with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-bind="obj"</code> or a dynamic argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">:[name]="v"</code>, so the renderer has to compare every prop on that node. Named bindings get the cheaper <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PROPS</code> flag with an explicit key list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-if</code> create a new block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A block assumes its dynamic children line up one to one between renders. A branch can add or remove nodes, so each branch is its own block, and the parent treats it as a single dynamic child that is swapped or patched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this help components written with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">h()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h()</code> VNodes have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchFlag</code> 0 and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicChildren</code>, so the renderer diffs everything. You can hand-write flags and blocks, but templates are the practical way to get them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you see what the compiler did for your template?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compileTemplate</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@vue/compiler-sfc</code> (as in the example script) or paste the template into Vue's template explorer, then read the flags in the comments next to each node.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Template compiler** | Turns templates into render functions ahead of time, with hints |
| **Static caching / hoisting** | Static VNodes created once (cached per instance in 3.5) and skipped by the diff |
| **Patch flag** | Bitmask saying which parts of a VNode can change |
| **FULL_PROPS** | Flag for spreads and dynamic keys: compare every prop |
| **Block** | VNode that tracks its dynamic descendants in a flat dynamicChildren array |
| **dynamicChildren** | The list of nodes an update actually patches |
| **Handler caching** | Event handlers stored in _cache so the prop stays identical |
| **Static stringification** | Long static runs turned into one HTML string (createStaticVNode) |

---
**Conclusion:** Vue's compiler reads templates ahead of time and leaves a precise list of what can change. Static VNodes are cached (hoisted up to 3.4), static props objects are hoisted, every dynamic node carries a patch flag naming what to compare, and blocks collect dynamic descendants into a flat <code>dynamicChildren</code> array so updates skip the static tree; long static runs become one HTML string. Verified on 3.5.44: a block with nine elements tracked four, and a template update beside 500 static rows ran tens of times faster than the equivalent hand-written <code>h()</code> render function, which gets none of these hints.`,
    examples: [
      {
        label: "Inspect the block tree: which nodes Vue tracks as dynamic",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, getCurrentInstance, onMounted } from "vue";

const message = ref("hello");
const cls = ref("a");
const show = ref(true);

// Peek at the compiled block tree. Dev-only introspection, for learning.
const instance = getCurrentInstance();
const report = ref("");
const describe = () => {
  const block = instance.subTree; // the root <div> block
  const all = block.el.querySelectorAll("*").length;
  const dyn = block.dynamicChildren.map((v) => \`\${v.type}(flag \${v.patchFlag})\`);
  report.value = \`\${all} elements under the root, \${dyn.length} tracked as dynamic: \${dyn.join(", ")}\`;
};
onMounted(describe);
</script>

<template>
  <div>
    <h3>Static heading</h3>
    <p>Static paragraph one.</p>
    <p>Static paragraph two.</p>
    <p>{{ message }}</p>
    <span :class="cls">class binding</span>
    <section v-if="show"><em>inside a v-if</em></section>
    <button @click="message += '!'">change text</button>
    <pre>{{ report }}</pre>
  </div>
</template>`,
      },
      {
        label: "Print the compiled render function for any template",
        tech: "js",
        runnable: false,
        code: `import { compileTemplate } from "@vue/compiler-sfc";
import { readFileSync } from "fs";
const src = readFileSync(process.argv[2], "utf8");
const { code } = compileTemplate({ source: src, filename: "Demo.vue", id: "demo", isProd: true,
  compilerOptions: { hoistStatic: true, cacheHandlers: true } });
console.log(code);`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Vue's virtual DOM diff keyed lists?",
    seoDescription:
      "How Vue 3 diffs keyed v-for lists: prefix and suffix sync, a key map and the longest increasing subsequence to minimise moves, with DOM operations counted.",
    description: `**Question presented to candidate:**
"When a \`v-for\` list changes order, how does Vue decide which DOM nodes to keep, move, create or remove? Walk me through the keyed diff algorithm, and tell me what goes wrong if I use the index as the key."

**What a strong answer should cover:**
- Keys give each VNode an **identity**, so Vue can match old and new children by key rather than by position.
- Vue 3's \`patchKeyedChildren\` steps: sync the common **prefix**, sync the common **suffix**, then the simple cases (only additions, or only removals), then the general case.
- The general case: a **key-to-new-index map**, patch or unmount each old child, then use the **longest increasing subsequence** of old positions to decide which nodes stay put and move only the rest.
- Concrete costs: reversing 5 items moves 4; moving one item moves 1; with keys, existing nodes are never re-rendered just because they moved.
- Index keys (or none) mean **patching in place by position**: no moves, but text rewrites on every shifted row and DOM state (inputs, focus, transitions) attached to the wrong item.
- Duplicate keys trigger a dev warning.

**Clarifying questions expected:**
- "Are we talking about the keyed path, or unkeyed lists as well?"

**Code / implementation expected:** Optional — a demo of index keys losing input state, or a walk-through of an example reorder.`,
    answer: `**Target Audience:** Vue developers who use <code>v-for</code> with <code>:key</code> every day and want to explain what the renderer actually does with those keys.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The DOM-operation counts in section 6 come from mounting lists with Vue 3.5.44 in jsdom and wrapping <code>insertBefore</code>, <code>removeChild</code>, <code>createElement</code> and the <code>textContent</code> setter to count every call. The runnable example passed <code>scripts/verify-vue-example.mjs</code>. The algorithm description follows <code>patchKeyedChildren</code> in the 3.5.44 <code>runtime-core</code> source.

## 1. Why This Even Matters — A Story First

A teacher has 30 pupils sitting in a row, each with a name badge. The head teacher sends a new seating plan. The teacher could ignore the badges and simply **re-label the chairs**: whoever is sitting in chair 1 is now called "Zoe", chair 2 is "Adam", and so on. Nobody moves, but every pupil now has the wrong name, the wrong homework and the wrong lunch order.

Or the teacher reads the badges and moves pupils. But she is clever about it: she spots the **longest group of pupils who are already in the right order relative to each other** and leaves them sitting. Only the others get up and change seats.

Keys are the name badges. Index keys (or no keys) are re-labelling the chairs. The clever teacher is Vue's keyed diff, and "the longest group already in order" has a name: the **longest increasing subsequence**. The basics of why keys matter are in [Why is the :key attribute important](/interview-question/why-is-the-key-attribute-important-in-v-for); this doc is about the algorithm.

## 2. The Core Idea

📌 **Interview term: Diffing (reconciliation)** — comparing the previous list of child VNodes with the new list and computing the DOM operations that turn one into the other. React calls it [reconciliation](/interview-question/explain-the-concept-of-reconciliation-in-react).

📌 **Interview term: Key** — a value that identifies a VNode among its siblings. Two VNodes are "the same node" only if they have the same type **and** the same key. With keys, Vue can find an item wherever it moved; without them, it can only compare by position.

📌 **Interview term: Keyed fragment** — the compiled form of a keyed <code>v-for</code>. The compiler marks it <code>128 /* KEYED_FRAGMENT */</code> (an unkeyed one is <code>256 /* UNKEYED_FRAGMENT */</code>), which tells the renderer to use <code>patchKeyedChildren</code>. See [the template compiler](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t) for where flags come from.

The algorithm is built on one observation: in real apps most list updates touch the **ends** (append, prepend, pop) or a **small part in the middle**. So it removes the easy parts first and only runs the expensive general algorithm on what is left.

## 3. The Five Steps of patchKeyedChildren

With old children <code>c1</code>, new children <code>c2</code>, and three cursors (<code>i</code> from the start, <code>e1</code> and <code>e2</code> from each end):

1. **Sync from the start.** While <code>c1[i]</code> and <code>c2[i]</code> are the same node (same type and key), patch them in place and move <code>i</code> forward.
2. **Sync from the end.** While <code>c1[e1]</code> and <code>c2[e2]</code> are the same node, patch them and move both ends back.
3. **Only additions left?** If the old list is used up (<code>i &gt; e1</code>), mount the remaining new nodes at the right anchor. Done.
4. **Only removals left?** If the new list is used up (<code>i &gt; e2</code>), unmount the remaining old nodes. Done.
5. **Unknown middle.** Otherwise:
   - build a <code>Map</code> from **key to new index** for the new middle section (duplicate keys are warned about here);
   - walk the old middle: unmount any old node whose key is not in the map; patch the others and record, in <code>newIndexToOldIndexMap</code>, where each new node came from;
   - if the recorded old positions are not already increasing, a move is needed, so compute the **longest increasing subsequence** of that array;
   - walk the new middle **backwards**: mount nodes that had no old match, keep nodes that are in the subsequence, and **move** everything else to its anchor.

📌 **Interview term: Longest increasing subsequence (LIS)** — the longest set of items whose old positions are already in increasing order. Those items are already correctly ordered relative to each other, so they can stay where they are; only the others need moving. That gives the minimum number of moves. Vue's <code>getSequence</code> computes it in O(n log n).

## 4. A Worked Example

Old list <code>A B C D E</code>, new list <code>A C D B E</code> (item B moved two places down).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Keyed diff example: A and E are synced as prefix and suffix, the middle C D B is mapped to old positions 3 4 2, the longest increasing subsequence C D stays and only B moves">
  <text class="d-sub" x="40" y="44">old</text>
  <rect class="d-box-muted" x="100" y="20" width="80" height="40" rx="8"/>
  <text class="d-text" x="140" y="46" text-anchor="middle">A</text>
  <rect class="d-box" x="200" y="20" width="80" height="40" rx="8"/>
  <text class="d-text" x="240" y="46" text-anchor="middle">B</text>
  <rect class="d-box" x="300" y="20" width="80" height="40" rx="8"/>
  <text class="d-text" x="340" y="46" text-anchor="middle">C</text>
  <rect class="d-box" x="400" y="20" width="80" height="40" rx="8"/>
  <text class="d-text" x="440" y="46" text-anchor="middle">D</text>
  <rect class="d-box-muted" x="500" y="20" width="80" height="40" rx="8"/>
  <text class="d-text" x="540" y="46" text-anchor="middle">E</text>
  <text class="d-sub" x="40" y="204">new</text>
  <rect class="d-box-muted" x="100" y="180" width="80" height="40" rx="8"/>
  <text class="d-text" x="140" y="206" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="200" y="180" width="80" height="40" rx="8"/>
  <text class="d-text d-accent" x="240" y="206" text-anchor="middle">C</text>
  <rect class="d-box-accent" x="300" y="180" width="80" height="40" rx="8"/>
  <text class="d-text d-accent" x="340" y="206" text-anchor="middle">D</text>
  <rect class="d-box" x="400" y="180" width="80" height="40" rx="8"/>
  <text class="d-text" x="440" y="206" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="500" y="180" width="80" height="40" rx="8"/>
  <text class="d-text" x="540" y="206" text-anchor="middle">E</text>
  <path class="d-edge-dashed" d="M 140 64 L 140 176"/>
  <path class="d-edge-dashed" d="M 540 64 L 540 176"/>
  <path class="d-edge-accent" d="M 340 64 L 240 176"/>
  <path class="d-edge-accent" d="M 440 64 L 340 176"/>
  <path class="d-edge" d="M 240 64 L 440 176"/>
  <text class="d-sub" x="140" y="250" text-anchor="middle">prefix</text>
  <text class="d-sub" x="540" y="250" text-anchor="middle">suffix</text>
  <text class="d-sub" x="290" y="250" text-anchor="middle">LIS: stays</text>
  <text class="d-sub" x="440" y="250" text-anchor="middle">moved</text>
</svg>

1. Step 1 syncs <code>A</code> (same key at the start). Step 2 syncs <code>E</code> (same key at the end).
2. The middle is old <code>B C D</code> against new <code>C D B</code>. The key map gives new positions; the old positions of the new middle are <code>[3, 4, 2]</code> (C was 3rd, D 4th, B 2nd).
3. That array is not increasing, so something must move. Its LIS is <code>[3, 4]</code>: C and D are already in order relative to each other.
4. Walking backwards, B is not in the LIS, so it is moved before E. C and D are left alone.

Result: **one DOM move**. The counts in section 6 confirm exactly this.

## 5. What Index Keys Do Instead

With <code>:key="index"</code> the keys of the new list are <code>0, 1, 2, ...</code> just like the old list, so every position "matches" its old position. Vue patches each row **in place** with the new item's data. Nothing moves; instead the **content** of rows is rewritten. With no key at all, Vue uses <code>patchUnkeyedChildren</code>, which patches by position too and then mounts or unmounts the length difference.

That sounds cheap, but anything that lives in the DOM rather than in your data stays with the row, not with the item: the text a user typed into an uncontrolled <code>&lt;input&gt;</code>, focus, scroll position, a playing <code>&lt;video&gt;</code>, a running CSS transition, and the internal state of child components.

## 6. Verified: Counting the DOM Operations

Five <code>&lt;li&gt;</code> items <code>A B C D E</code>, then one update, with every DOM call counted:

\`\`\`
move last to second                key=id    ABCDE -> AEBCD: created 0, inserted 1 (moves of existing: 1 [E]), removed 0, text rewrites of existing <li> 0, reused 5/5
move B to fourth (LIS keeps C,D)   key=id    ABCDE -> ACDBE: created 0, inserted 1 (moves of existing: 1 [B]), removed 0, text rewrites of existing <li> 0, reused 5/5
reverse                            key=id    ABCDE -> EDCBA: created 0, inserted 4 (moves of existing: 4 [B,C,D,E]), removed 0, text rewrites of existing <li> 0, reused 5/5
prepend Z                          key=id    ABCDE -> ZABCDE: created 1, inserted 1 (moves of existing: 0), removed 0, text rewrites of existing <li> 0, reused 5/6
remove C                           key=id    ABCDE -> ABDE: created 0, inserted 0 (moves of existing: 0), removed 1, text rewrites of existing <li> 0, reused 4/4
insert X in the middle             key=id    ABCDE -> ABXCDE: created 1, inserted 1 (moves of existing: 0), removed 0, text rewrites of existing <li> 0, reused 5/6
move last to second                key=index ABCDE -> AEBCD: created 0, inserted 0 (moves of existing: 0), removed 0, text rewrites of existing <li> 4, reused 5/5
move B to fourth (LIS keeps C,D)   key=index ABCDE -> ACDBE: created 0, inserted 0 (moves of existing: 0), removed 0, text rewrites of existing <li> 3, reused 5/5
reverse                            key=index ABCDE -> EDCBA: created 0, inserted 0 (moves of existing: 0), removed 0, text rewrites of existing <li> 4, reused 5/5
prepend Z                          key=index ABCDE -> ZABCDE: created 1, inserted 1 (moves of existing: 0), removed 0, text rewrites of existing <li> 5, reused 5/6
remove C                           key=index ABCDE -> ABDE: created 0, inserted 0 (moves of existing: 0), removed 1, text rewrites of existing <li> 2, reused 4/4
insert X in the middle             key=index ABCDE -> ABXCDE: created 1, inserted 1 (moves of existing: 0), removed 0, text rewrites of existing <li> 3, reused 5/6
prepend Z                          key=none  ABCDE -> ZABCDE: created 1, inserted 1 (moves of existing: 0), removed 0, text rewrites of existing <li> 5, reused 5/6
reverse                            key=none  ABCDE -> EDCBA: created 0, inserted 0 (moves of existing: 0), removed 0, text rewrites of existing <li> 4, reused 5/5
\`\`\`

What the numbers show:

- **Keyed moves are minimal.** Moving one item cost exactly one <code>insertBefore</code> of an existing node, in both directions; the LIS kept C and D in place for <code>ACDBE</code>. Reversing five items cost four moves, the minimum (one item can always stay).
- **Keyed rows are never rewritten.** "Text rewrites of existing" is 0 for every keyed case: a moved row keeps its DOM and its content.
- **Prepend and middle insert** with ids: one create, one insert, nothing else, thanks to the prefix and suffix steps.
- **Index keys and no keys** never move anything. Instead they rewrote the text of up to 5 existing rows, and when C was removed the **last** <code>&lt;li&gt;</code> was deleted while C and D's rows were relabelled.
- Index keys and no keys behaved identically here. An index key is not "better than nothing" for reorders; it just silences the lint rule.

For five text-only items, rewriting text is cheap. It stops being cheap when rows are components (each rewritten row re-renders its child) and it is **wrong** whenever a row holds state, which the runnable example shows.

## 7. Verified: Index Keys Move State to the Wrong Item

The runnable example renders the same three todos twice, once with <code>:key="index"</code> and once with <code>:key="t.id"</code>, each with an uncontrolled input. The driver typed "my note" into the first row of both columns and then prepended a task:

\`\`\`
[driver] before  index: Write tests=[my note] Fix bug=[] Ship it=[] || id: Write tests=[my note] Fix bug=[] Ship it=[]
[driver] after   index: New task=[my note] Write tests=[] Fix bug=[] Ship it=[] || id: New task=[] Write tests=[my note] Fix bug=[] Ship it=[]
\`\`\`

With index keys the note now sits next to "New task": row 0 kept its input and was relabelled. With id keys the note stayed with "Write tests", because that row's DOM was kept and a new row was inserted above it.

**Duplicate keys** break the key map, and Vue warns in development:

\`\`\`
[Vue warn]: Duplicate keys found during update: "a" Make sure keys are unique. 
  at <App>
\`\`\`

## 8. Keyed vs Index vs No Key

| | Stable unique key | <code>:key="index"</code> | No key |
| :--- | :--- | :--- | :--- |
| Matching | By identity, anywhere in the list | By position | By position |
| Reorder cost | Minimal moves (LIS) | Rewrites content of shifted rows | Rewrites content of shifted rows |
| DOM state (inputs, focus) | Stays with the item | Stays with the position (bug) | Stays with the position (bug) |
| Child component state | Stays with the item | Stays with the position (bug) | Stays with the position (bug) |
| Transitions | Correct move animations | Wrong rows animate | Wrong rows animate |
| When acceptable | Always the default | Static lists that never reorder | Static, stateless lists |

Keys also work outside <code>v-for</code>: changing the key on a single element or component forces Vue to treat it as a new node and recreate it, the same trick React uses, covered in [using key to reset state](/interview-question/how-can-the-key-prop-be-used-to-deliberately-reset-component-state).

## 9. Common Pitfalls

- **Using the index as the key for editable or reorderable lists.** Verified above: typed input stayed on row 0 and attached itself to the wrong task.
- **Generating keys during render** (<code>:key="Math.random()"</code> or a fresh UUID each render). Every key is new each time, so every row is unmounted and recreated.
- **Duplicate keys.** The key map loses entries, and Vue warns "Duplicate keys found during update".
- **Keying on mutable fields** such as a name the user can edit. Changing it makes Vue treat the row as a different item and recreate it.
- **Expecting keys to make a huge list fast.** Keys minimise DOM moves, but rendering 10,000 rows still costs 10,000 rows; use [virtual scrolling](/interview-question/how-do-you-render-very-large-lists-efficiently-in-vue-virtual-scrolling).
- **Putting the key on the wrong element** with <code>&lt;template v-for&gt;</code>: in Vue 3 the key belongs on the <code>&lt;template&gt;</code> tag. See [rendering lists with v-for](/interview-question/how-do-you-render-lists-with-v-for).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why keys:</strong> <span style="color:#f0e2c8;">"A key gives each VNode an identity, so Vue can match old and new children wherever they moved instead of comparing by position."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The cheap steps:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchKeyedChildren</code> first syncs the matching prefix and suffix, then handles the easy cases where only additions or only removals are left. Most real updates finish here."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The general case:</strong> <span style="color:#f0e2c8;">"For the unknown middle it builds a key-to-new-index map, unmounts old nodes whose key is gone, patches the rest, and records each new node's old position."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Minimal moves:</strong> <span style="color:#f0e2c8;">"It then takes the longest increasing subsequence of those old positions: those nodes are already in order and stay; only the others move. Moving one item is one DOM move, reversing five is four."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Index keys:</strong> <span style="color:#f0e2c8;">"With index keys every position matches, so nothing moves and the rows are rewritten in place. That breaks anything stored in the DOM or a child component, like typed input or focus, which then sticks to the wrong item."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the longest increasing subsequence specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nodes whose old positions increase along the new order are already correctly ordered relative to each other, so leaving the longest such set in place minimises the number of nodes that must be moved. Vue computes it in O(n log n) with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getSequence</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does it walk the new middle backwards?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Moves and inserts use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertBefore</code> with an anchor. Going from the end, the anchor for each node is the next sibling, which has already been placed, so every insert lands in the right spot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is an index key ever fine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a static list that never reorders, filters or inserts, and whose rows hold no state, yes, the result is the same. As soon as items can move or contain inputs or components, use a stable id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both match by key. React walks the new children once, tracking the last placed old index and moving nodes that appear out of order. Vue adds prefix and suffix sync and uses the LIS to keep the largest already-ordered set, which minimises moves for reorders in the middle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with duplicate keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The key map keeps only one entry per key, so the diff can match the wrong node. In development Vue warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Duplicate keys found during update</code>. Keys must be unique among siblings.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Diffing** | Comparing old and new children to compute DOM operations |
| **Key** | Identity of a VNode among its siblings |
| **Same node** | Same type and same key, so it can be patched rather than replaced |
| **Prefix / suffix sync** | Patching matching items at the start and end first |
| **Key-to-index map** | Map from each new key to its position, built for the unknown middle |
| **newIndexToOldIndexMap** | For each new node, where it was in the old list |
| **Longest increasing subsequence** | Largest set already in relative order; these nodes do not move |
| **Keyed fragment** | Compiled keyed v-for, flag 128 |

---
**Conclusion:** Vue's keyed diff matches children by key, not position: it syncs the common prefix and suffix, handles pure additions or removals directly, and for the remaining middle builds a key map, patches or unmounts old nodes, and uses the longest increasing subsequence of old positions to move as few nodes as possible. Verified on 3.5.44: moving one item cost one DOM move, reversing five cost four, and keyed rows were never rewritten. Index keys and missing keys never move anything and instead rewrite rows in place, which is why typed input and other DOM state ended up attached to the wrong item.`,
    examples: [
      {
        label: "Index keys vs stable ids: watch typed input jump rows on prepend",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref } from "vue";

let nextId = 4;
const todos = ref([
  { id: 1, name: "Write tests" },
  { id: 2, name: "Fix bug" },
  { id: 3, name: "Ship it" },
]);

// Prepend: the classic case where index keys go wrong.
const prepend = () => todos.value.unshift({ id: nextId++, name: "New task" });
</script>

<template>
  <button @click="prepend">Prepend a task</button>
  <div class="cols">
    <section>
      <h4>:key="index"</h4>
      <!-- Each row has an uncontrolled input: its typed text lives in the DOM, not in state. -->
      <div v-for="(t, index) in todos" :key="index" class="row">
        <span>{{ t.name }}</span> <input placeholder="note" />
      </div>
    </section>
    <section>
      <h4>:key="t.id"</h4>
      <div v-for="t in todos" :key="t.id" class="row">
        <span>{{ t.name }}</span> <input placeholder="note" />
      </div>
    </section>
  </div>
  <p>Type a note next to "Write tests" in both columns, then prepend.</p>
</template>`,
      },
      {
        label: "Instrumenting the DOM to count creates, moves and text rewrites (jsdom)",
        tech: "js",
        runnable: false,
        code: `import { JSDOM } from "jsdom";
const dom = new JSDOM('<!doctype html><div id="app"></div>');
for (const k of ["window","document","navigator","Node","Element","HTMLElement","SVGElement","Text","Comment"]) { try { globalThis[k] = dom.window[k]; } catch {} }
const { createApp, ref, nextTick } = await import("vue");

// Instrument the DOM operations Vue's renderer performs.
const ops = { create: 0, insert: 0, remove: 0, text: 0, moves: [] };
const P = dom.window.Node.prototype;
const origInsert = P.insertBefore, origRemove = P.removeChild;
const desc = Object.getOwnPropertyDescriptor(P, "textContent");
const origCreate = dom.window.Document.prototype.createElement;
let counting = false;
P.insertBefore = function (n, ref) { if (counting) { ops.insert++; if (n.isConnected) ops.moves.push(n.textContent); } return origInsert.call(this, n, ref); };
P.removeChild = function (n) { if (counting) ops.remove++; return origRemove.call(this, n); };
Object.defineProperty(P, "textContent", { get: desc.get, set(v) { if (counting && this.nodeType === 1 && this.isConnected) ops.text++; desc.set.call(this, v); }, configurable: true });
dom.window.Document.prototype.createElement = function (...a) { if (counting) ops.create++; return origCreate.apply(this, a); };

async function scenario(name, keyMode, from, to) {
  document.body.innerHTML = '<div id="app"></div>';
  const items = ref(from);
  const keyExpr = keyMode === "id" ? ':key="item"' : keyMode === "index" ? ':key="i"' : "";
  const app = createApp({ setup: () => ({ items }), template: \`<ul><li v-for="(item, i) in items" \${keyExpr}>{{ item }}</li></ul>\` });
  app.mount("#app");
  const before = [...document.querySelectorAll("li")];
  Object.assign(ops, { create: 0, insert: 0, remove: 0, text: 0, moves: [] });
  counting = true; items.value = to; await nextTick(); counting = false;
  const after = [...document.querySelectorAll("li")];
  const reused = after.filter((el) => before.includes(el)).length;
  console.log(\`\${name.padEnd(34)} key=\${keyMode.padEnd(5)} \${from.join("")} -> \${to.join("")}: created \${ops.create}, inserted \${ops.insert} (moves of existing: \${ops.moves.length}\${ops.moves.length ? " [" + ops.moves.join(",") + "]" : ""}), removed \${ops.remove}, text rewrites of existing <li> \${ops.text}, reused \${reused}/\${after.length}\`);
  app.unmount();
}
const L = ["A","B","C","D","E"];
for (const k of ["id", "index"]) {
  await scenario("move last to second", k, L, ["A","E","B","C","D"]);
  await scenario("move B to fourth (LIS keeps C,D)", k, L, ["A","C","D","B","E"]);
  await scenario("reverse", k, L, [...L].reverse());
  await scenario("prepend Z", k, L, ["Z", ...L]);
  await scenario("remove C", k, L, ["A","B","D","E"]);
  await scenario("insert X in the middle", k, L, ["A","B","X","C","D","E"]);
}
await scenario("prepend Z", "none", L, ["Z", ...L]);
await scenario("reverse", "none", L, [...L].reverse());`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a custom renderer in Vue (createRenderer)?",
    seoDescription:
      "Vue createRenderer explained: supply node operations and Vue components, reactivity and diffing render to any target, such as a scene graph or a terminal.",
    description: `**Question presented to candidate:**
"Vue is usually described as a DOM framework, yet there are libraries that render Vue components into a WebGL scene or a terminal. How is that possible? Explain what \`createRenderer\` is and what you have to provide to build a custom renderer."

**What a strong answer should cover:**
- Vue's core (\`@vue/runtime-core\`: components, reactivity, scheduler, VNode diffing) is **platform-agnostic**; the browser DOM support in \`@vue/runtime-dom\` is itself built with \`createRenderer\`.
- \`createRenderer(options)\` takes **node operations**: \`createElement\`, \`createText\`, \`createComment\`, \`insert\`, \`remove\`, \`setText\`, \`setElementText\`, \`patchProp\`, \`parentNode\`, \`nextSibling\`, plus optional ones such as \`insertStaticContent\`.
- It returns \`{ render, createApp }\`; \`createApp(Root).mount(container)\` mounts into **your** container type.
- Updates are minimal: after a state change the renderer receives only the calls for what changed (for example one \`patchProp\` and one \`setElementText\`).
- Real uses: TresJS (three.js), canvas or PDF targets, terminals, testing.
- Caveats: templates compiled for the DOM may emit static HTML strings, \`Transition\`/\`v-show\`/\`v-model\` live in runtime-dom, and Vapor mode does not apply.

**Clarifying questions expected:**
- "What is the target: a canvas, a 3D scene, native widgets, or something like a terminal?"

**Code / implementation expected:** Optional — a small renderer with a handful of node operations and a component rendered into it.`,
    answer: `**Target Audience:** Vue developers curious about how Vue is structured internally, or evaluating Vue for a non-DOM target (canvas, 3D, terminal, native).
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The runnable example passed <code>scripts/verify-vue-example.mjs</code> on Vue 3.5.44 (compiled and mounted in jsdom, button clicked). The terminal renderer was run with Node against <code>@vue/runtime-core</code> 3.5.44. Claims about what lives in which package were checked against the 3.5.44 package exports.

## 1. Why This Even Matters — A Story First

A film studio makes a cartoon. The writers, the storyboard and the animation rules are the same whatever happens next, but the finished film goes out in different ways: a cinema reel, a streaming file, a DVD. Each needs its own **output machine**, and that machine only has to know a few things: how to start a frame, how to add a picture to it, how to remove one, how to change one.

Vue works the same way. Components, reactivity, the scheduler and the diffing algorithm are the "story"; they do not care where the result is shown. The part that actually touches the screen is a small output machine with about ten operations. In the browser that machine talks to the DOM. Swap the machine and the same components can draw into a 3D scene, a canvas, a PDF, or a terminal. <code>createRenderer</code> is how you build that machine.

## 2. The Core Idea

📌 **Interview term: Renderer** — the part of Vue that turns VNodes into real "host" nodes and keeps them in sync. It contains the diff ([including the keyed list algorithm](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists)), mounting, unmounting and component lifecycle, but no knowledge of any particular platform.

📌 **Interview term: Host node** — whatever object your platform uses for an element or a piece of text. For the DOM it is an <code>Element</code> or <code>Text</code>; for a custom renderer it can be a plain object, a three.js <code>Mesh</code>, or a line of terminal output.

📌 **Interview term: Node operations (renderer options)** — the platform functions you pass to <code>createRenderer</code>. Vue calls them whenever the diff decides something must change.

📌 **Interview term: createRenderer** — the function in <code>@vue/runtime-core</code> (re-exported by <code>vue</code>) that takes node operations and returns a renderer. Verified on 3.5.44 it returns an object with <code>render</code>, <code>hydrate</code> (undefined unless you use <code>createHydrationRenderer</code>) and <code>createApp</code>.

The browser version of Vue is built exactly this way. In the 3.5.44 <code>runtime-dom</code> source:

\`\`\`js
function ensureRenderer() {
  return renderer || (renderer = runtimeCore.createRenderer(rendererOptions));
}
\`\`\`

<code>rendererOptions</code> is just DOM node operations plus a <code>patchProp</code> that knows about classes, styles, attributes and events. The usual <code>createApp</code> from <code>vue</code> is <code>ensureRenderer().createApp</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="runtime-core holds components, reactivity and the diff. It calls node operations, which runtime-dom implements for the DOM and a custom renderer implements for another target">
  <defs>
    <marker id="vcr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="160" y="20" width="400" height="70" rx="12"/>
  <text class="d-text d-accent" x="360" y="48" text-anchor="middle">runtime-core</text>
  <text class="d-sub" x="360" y="72" text-anchor="middle">components, reactivity, scheduler, VNode diff</text>
  <path class="d-edge" d="M 280 94 L 170 154" marker-end="url(#vcr-arrow)"/>
  <path class="d-edge" d="M 440 94 L 550 154" marker-end="url(#vcr-arrow)"/>
  <text class="d-sub" x="360" y="134" text-anchor="middle">node operations</text>
  <rect class="d-box" x="40" y="160" width="260" height="60" rx="10"/>
  <text class="d-text" x="170" y="186" text-anchor="middle">runtime-dom</text>
  <text class="d-sub" x="170" y="206" text-anchor="middle">document.createElement and friends</text>
  <rect class="d-box" x="420" y="160" width="260" height="60" rx="10"/>
  <text class="d-text" x="550" y="186" text-anchor="middle">your createRenderer</text>
  <text class="d-sub" x="550" y="206" text-anchor="middle">scene graph, canvas, terminal</text>
  <rect class="d-box-muted" x="40" y="250" width="260" height="36" rx="8"/>
  <text class="d-sub" x="170" y="273" text-anchor="middle">browser DOM</text>
  <rect class="d-box-muted" x="420" y="250" width="260" height="36" rx="8"/>
  <text class="d-sub" x="550" y="273" text-anchor="middle">any host objects</text>
  <path class="d-edge" d="M 170 222 L 170 246"/>
  <path class="d-edge" d="M 550 222 L 550 246"/>
</svg>

Everything above the "node operations" line is shared. Only the boxes below it are platform code, and they are small.

## 3. The Node Operations

From the 3.5.44 <code>RendererOptions</code> typings:

| Operation | Called when | Required |
| :--- | :--- | :--- |
| <code>createElement(type)</code> | A new element VNode is mounted | Yes |
| <code>createText(text)</code> / <code>createComment(text)</code> | Text and placeholder nodes (a false <code>v-if</code> leaves a comment) | Yes |
| <code>insert(el, parent, anchor)</code> | Mounting or **moving** a node, before <code>anchor</code> (or at the end) | Yes |
| <code>remove(el)</code> | Unmounting | Yes |
| <code>patchProp(el, key, prev, next)</code> | A prop, attribute or event changed | Yes |
| <code>setText(node, text)</code> | A text node changed | Yes |
| <code>setElementText(el, text)</code> | An element whose only child is text changed | Yes |
| <code>parentNode(node)</code> / <code>nextSibling(node)</code> | The diff needs to find anchors | Yes |
| <code>querySelector</code>, <code>setScopeId</code>, <code>cloneNode</code>, <code>insertStaticContent</code> | Teleport targets, scoped styles, static content | Optional |

The meaning of a "prop" is entirely yours: <code>patchProp</code> receives <code>key</code> and <code>next</code>, and you decide whether <code>r</code> sets a circle radius or <code>onClick</code> registers a hit-test handler.

## 4. Verified: A Scene Graph Renderer in One SFC

The runnable example creates a renderer whose host nodes are plain objects (<code>{ type, props, children, parent }</code>), logs every operation Vue asks for, and mounts a tiny <code>Scene</code> component (a <code>group</code> with a <code>circle</code> and a <code>label</code>; these are not HTML tags) into a plain object container. The SFC itself is rendered normally by the DOM renderer, so two renderers run side by side on one page.

On mount, Vue asked for:

\`\`\`
[driver] mount ops: createElement group | createElement circle | patchProp circle.r = 10 | patchProp circle.fill = "blue" | insert circle into group | createElement label | setElementText "r = 10" | insert label into group | patchProp group.name = "root" | insert group into scene
[driver] tree: { "type": "group", "props": { "name": "root" }, "children": [ { "type": "circle", "props": { "r": 10, "fill": "blue" }, "children": [] }, { "type": "label", "children": [ "r = 10" ] } ] }
\`\`\`

Notice the order: children are created and inserted into their parent **before** the parent is inserted into the container, so a real platform can build a subtree off-screen and attach it once.

After one click (<code>radius.value += 15</code>):

\`\`\`
[driver] ops after one click: patchProp circle.r = 25 | patchProp circle.fill = "red" | setElementText "r = 25"
[driver] tree: { "type": "group", "props": { "name": "root" }, "children": [ { "type": "circle", "props": { "r": 25, "fill": "red" }, "children": [] }, { "type": "label", "children": [ "r = 25" ] } ] }
\`\`\`

Three operations, exactly the three things that changed. Nothing was recreated, <code>group.name</code> was not touched again, and you got this for free: the diff, the reactivity tracking and the batching all come from <code>runtime-core</code>. That is the real pitch of a custom renderer: you write about ten small functions and inherit Vue's update engine.

## 5. Verified: A Terminal Renderer

The second example imports only <code>@vue/runtime-core</code> (no <code>runtime-dom</code>, no DOM at all), renders a "box" with a label and a progress "bar", and paints the object tree as text. Run with Node:

\`\`\`
+-- Deploy
  step 3 of 10
  [###.......] 30%
+--
+-- Deploy
  step 7 of 10
  [#######...] 70%
+--
\`\`\`

Setting <code>progress.value = 7</code> and awaiting <code>nextTick()</code> updated the host tree through <code>patchProp</code> and <code>setElementText</code>; the paint function simply reads it. Projects such as terminal UIs follow this pattern, adding a real paint loop and keyboard input.

## 6. Real-World Custom Renderers

- **TresJS** (<code>@tresjs/core</code>, described on npm as "Declarative ThreeJS using Vue Components", version 5.9.3 at the time of writing) renders Vue components into a three.js scene. Its internals were not inspected here; the pattern a renderer like this follows is that <code>createElement</code> makes a scene object and <code>patchProp</code> sets its properties.
- **Canvas and game engines**: host nodes are sprites or display objects; <code>insert</code> adds them to a stage.
- **Documents and native UIs**: PDF builders, or native widget toolkits, follow the same contract.
- **Testing**: Vue's own repository has a test renderer (<code>packages/runtime-test</code>) that renders to plain objects, much like the runnable example. It is internal to the repo (an <code>npm view @vue/runtime-test</code> returned 404), so app tests use Vue Test Utils instead.

## 7. What You Lose Outside runtime-dom

Not everything you use daily lives in the core. Checked against the 3.5.44 exports:

| Feature | In <code>runtime-core</code>? | Consequence |
| :--- | :--- | :--- |
| Components, reactivity, <code>KeepAlive</code>, <code>Teleport</code>, <code>Suspense</code>, <code>BaseTransition</code> | Yes | Available to custom renderers |
| <code>Transition</code> (CSS-class based) | No, <code>runtime-dom</code> only | Build animation on <code>BaseTransition</code> with your own hooks |
| <code>v-show</code>, <code>v-model</code> directives | No, <code>runtime-dom</code> only | Implement equivalents as custom directives or props |
| Class, style and event normalisation | No, part of the DOM <code>patchProp</code> | Your <code>patchProp</code> decides what props mean |
| Vapor mode | No; Vapor targets the browser DOM (Vue 3.6 release candidates) | Custom renderers stay on the virtual DOM; see [Vapor mode](/interview-question/what-is-vapor-mode-in-vue-3-5-and-how-does-it-differ-from-the-virtual-dom) |

**Templates need care.** SFC templates are compiled by <code>@vue/compiler-dom</code>, which assumes HTML. Two practical issues:

- Tags the DOM compiler does not know become component lookups. Verified: in a template, <code>&lt;group&gt;&lt;mesh /&gt;&lt;/group&gt;</code> compiled to <code>_resolveComponent("group")</code> and warned <code>Failed to resolve component: group</code> with the hint "make sure to exclude it from component resolution via compilerOptions.isCustomElement", while <code>&lt;circle&gt;</code> compiled as a native element because it is an SVG tag. So you configure <code>compilerOptions.isCustomElement</code> (for example in the Vite plugin options), or use render functions (<code>h()</code>) as both examples do.
- The DOM compiler turns long runs of static elements into one HTML string ([static stringification](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t)). A custom renderer without <code>insertStaticContent</code> cannot mount that. Verified: rendering a <code>createStaticVNode(...)</code> through a renderer without it threw <code>hostInsertStaticContent is not a function or its return value is not iterable</code>.

## 8. Custom Renderer vs Alternatives

| Approach | When it fits |
| :--- | :--- |
| <code>createRenderer</code> | The target has a tree of objects that can be created, inserted and updated (scene graphs, native widgets, terminal layouts) |
| Normal DOM component wrapping an imperative library | You just need one chart or map; keep it in a component with a template ref and update it in a watcher |
| [Custom directive](/interview-question/how-do-you-create-a-custom-directive-in-vue) | Low-level DOM behaviour on existing elements |
| <code>vue/server-renderer</code> | Output is an HTML string; that is a separate, string-based renderer used for [SSR](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration), not built with <code>createRenderer</code> |

## 9. Common Pitfalls

- **Forgetting moves.** <code>insert</code> is also called to move an existing node (keyed reorders). Detach it from its old parent first, as both examples do, or nodes get duplicated.
- **Ignoring the anchor.** <code>insert(el, parent, anchor)</code> must insert **before** <code>anchor</code> when it is given, and <code>nextSibling</code> must be accurate, or lists render in the wrong order.
- **Dropping comment nodes.** Vue uses comments as placeholders (a false <code>v-if</code>, fragment anchors). Create real host nodes for them, even if you never paint them.
- **Using DOM-only features.** <code>Transition</code>, <code>v-show</code> and <code>v-model</code> come from <code>runtime-dom</code>; importing <code>vue</code> in a non-DOM renderer also pulls in DOM code.
- **Compiling templates without configuring the compiler.** Unknown tags become components, and static stringification needs <code>insertStaticContent</code>.
- **Expecting DOM events.** There is no event system; <code>patchProp</code> receives <code>onClick</code> as a function and your platform has to call it.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">"Vue core is platform-agnostic. Components, reactivity, the scheduler and the VNode diff live in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runtime-core</code>, and anything that touches a real platform goes through a small set of node operations."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The API:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createRenderer</code> takes those operations: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createElement</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createText</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchProp</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setText</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setElementText</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parentNode</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextSibling</code>, and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createApp</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Proof it is real:</strong> <span style="color:#f0e2c8;">"The normal DOM build is itself <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createRenderer(rendererOptions)</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runtime-dom</code>. Swap the options and the same components render into a 3D scene, a canvas or a terminal; TresJS does this for three.js."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What you get for free:</strong> <span style="color:#f0e2c8;">"The whole update engine. In a test renderer over plain objects, a state change produced exactly three operations: two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patchProp</code> calls and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setElementText</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The caveats:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Transition</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-show</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-model</code> live in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runtime-dom</code>, the DOM template compiler needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isCustomElement</code> for unknown tags and emits static HTML strings that need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertStaticContent</code>, and Vapor mode does not apply."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">patchProp</code> have to handle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every prop change on a host node, with the key, previous and next value. In the DOM it splits into class, style, events and attributes. In a custom renderer you decide the meaning, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> sets a radius and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onClick</code> registers a hit-test callback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">insert</code> also used for moves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The keyed diff moves an existing node by inserting it before a new anchor. A correct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code> therefore removes the node from its current parent first; otherwise reorders duplicate nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use templates with a custom renderer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but the SFC compiler is the DOM compiler. Mark your tags with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compilerOptions.isCustomElement</code> so they are not resolved as components, and provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertStaticContent</code> or avoid long static runs that get stringified. Many renderers use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h()</code> or JSX instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from SSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SSR uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vue/server-renderer</code>, a separate string-based renderer that pushes HTML. A custom renderer manages a live tree of host objects and keeps updating it as state changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not build one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the target is a single imperative widget, such as one chart. Wrapping the library in a normal component with a template ref and a watcher is far simpler than a renderer.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Renderer** | The part of Vue that turns VNodes into host nodes and keeps them in sync |
| **Host node** | The platform object for an element or text (DOM Element, three.js Mesh, plain object) |
| **createRenderer** | runtime-core function that builds a renderer from node operations |
| **Node operations** | createElement, insert, remove, patchProp and friends |
| **patchProp** | Operation that applies one changed prop to a host node |
| **runtime-core** | Platform-agnostic Vue: components, reactivity, diff |
| **runtime-dom** | The DOM renderer, itself built with createRenderer |
| **insertStaticContent** | Optional operation for compiler-generated static HTML strings |

---
**Conclusion:** A custom renderer is Vue's update engine pointed at a new target. <code>runtime-core</code> holds components, reactivity and the diff; <code>createRenderer</code> takes about ten node operations and returns <code>render</code> and <code>createApp</code>, and Vue's own DOM support is built the same way. Verified on 3.5.44: a scene-graph renderer received ten operations on mount and exactly three after a state change, and a terminal renderer ran with no DOM at all. Plan for what stays in <code>runtime-dom</code> (<code>Transition</code>, <code>v-show</code>, <code>v-model</code>), configure or avoid the DOM template compiler, and implement <code>insert</code> moves and anchors carefully.`,
    examples: [
      {
        label: "A custom renderer inside one SFC: Vue renders a scene graph of plain objects",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { createRenderer, defineComponent, h, ref, shallowRef } from "vue";

// 1. Node operations for a tiny "scene graph": plain objects, no DOM at all.
const log = shallowRef([]);
const record = (msg) => { log.value = [...log.value, msg]; };

const { createApp: createSceneApp } = createRenderer({
  createElement: (type) => { record(\`createElement \${type}\`); return { type, props: {}, children: [], parent: null }; },
  createText: (text) => ({ type: "#text", text, parent: null }),
  createComment: (text) => ({ type: "#comment", text, parent: null }),
  setText: (node, text) => { record(\`setText "\${text}"\`); node.text = text; },
  setElementText: (node, text) => { record(\`setElementText "\${text}"\`); node.children = [{ type: "#text", text, parent: node }]; },
  insert: (child, parent, anchor) => {
    const i = anchor ? parent.children.indexOf(anchor) : -1;
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    i === -1 ? parent.children.push(child) : parent.children.splice(i, 0, child);
    child.parent = parent;
    record(\`insert \${child.type} into \${parent.type}\`);
  },
  remove: (child) => { const p = child.parent; if (p) p.children.splice(p.children.indexOf(child), 1); record(\`remove \${child.type}\`); },
  patchProp: (node, key, prev, next) => { record(\`patchProp \${node.type}.\${key} = \${JSON.stringify(next)}\`); node.props[key] = next; },
  parentNode: (node) => node.parent,
  nextSibling: (node) => { const s = node.parent?.children; return s ? s[s.indexOf(node) + 1] ?? null : null; },
});

// 2. A component written against that renderer: "circle" and "label" are not HTML tags.
const radius = ref(10);
const Scene = defineComponent({
  setup: () => () => h("group", { name: "root" }, [
    h("circle", { r: radius.value, fill: radius.value > 20 ? "red" : "blue" }),
    h("label", null, \`r = \${radius.value}\`),
  ]),
});

// 3. Mount into a plain object instead of a DOM element.
const container = { type: "scene", props: {}, children: [], parent: null };
createSceneApp(Scene).mount(container);

const strip = (n) => (n.type === "#text" ? n.text : { type: n.type, ...(Object.keys(n.props).length ? { props: n.props } : {}), children: n.children.filter((c) => c.type !== "#comment").map(strip) });
const tree = ref(JSON.stringify(strip(container.children[0]), null, 1));
const grow = async () => {
  log.value = [];
  radius.value += 15;
  await Promise.resolve(); // the scheduler flushes in a microtask
  await Promise.resolve();
  tree.value = JSON.stringify(strip(container.children[0]), null, 1);
};
</script>

<template>
  <button @click="grow">grow the circle</button>
  <h4>Operations the renderer was asked to do</h4>
  <ol><li v-for="(op, i) in log" :key="i">{{ op }}</li></ol>
  <h4>The custom tree (not DOM)</h4>
  <pre>{{ tree }}</pre>
</template>`,
      },
      {
        label: "A terminal renderer with @vue/runtime-core (run with Node)",
        tech: "js",
        runnable: false,
        code: `// A custom renderer for the terminal, using @vue/runtime-core directly (no DOM, no runtime-dom).
// Elements are plain objects; after each flush we print the tree as text.
import { createRenderer, h, ref, nextTick } from "@vue/runtime-core";

const el = (type) => ({ type, props: {}, children: [], parent: null });
const { createApp } = createRenderer({
  createElement: el,
  createText: (text) => ({ type: "text", text, parent: null }),
  createComment: () => ({ type: "comment", parent: null }),
  setText: (node, text) => { node.text = text; },
  setElementText: (node, text) => { node.children = [{ type: "text", text, parent: node }]; },
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    const i = anchor ? parent.children.indexOf(anchor) : -1;
    i < 0 ? parent.children.push(child) : parent.children.splice(i, 0, child);
    child.parent = parent;
  },
  remove(child) { const s = child.parent?.children; if (s) s.splice(s.indexOf(child), 1); },
  patchProp(node, key, prev, next) { node.props[key] = next; },
  parentNode: (node) => node.parent,
  nextSibling(node) { const s = node.parent?.children; return s ? s[s.indexOf(node) + 1] ?? null : null; },
});

// Paint: "box" draws a border, "bar" draws a progress bar, text nodes print as is.
const paint = (n, depth = 0) => {
  const pad = "  ".repeat(depth);
  if (n.type === "text") return pad + n.text;
  if (n.type === "comment") return null;
  if (n.type === "bar") return pad + "[" + "#".repeat(n.props.value) + ".".repeat(10 - n.props.value) + "] " + n.props.value * 10 + "%";
  const inner = (d) => n.children.map((c) => paint(c, d)).filter((x) => x !== null);
  return n.type === "box" ? [pad + "+-- " + (n.props.title ?? ""), ...inner(depth + 1), pad + "+--"].join("\\n") : inner(depth).join("\\n");
};

const progress = ref(3);
const App = { setup: () => () => h("box", { title: "Deploy" }, [h("label", null, \`step \${progress.value} of 10\`), h("bar", { value: progress.value })]) };

const screen = el("screen");
createApp(App).mount(screen);
console.log(paint(screen.children[0]));
progress.value = 7;          // reactive update: Vue patches the object tree
await nextTick();
console.log(paint(screen.children[0]));`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you optimize performance in a Vue app?",
    seoDescription:
      "A measured approach to Vue performance: find the bottleneck, then fix it with stable props, shallowRef, computed, code splitting, v-memo and virtual lists.",
    description: `**Question presented to candidate:**
"Users say our Vue dashboard feels sluggish: the first load is slow, and typing in a filter box lags. How would you approach making it faster? Tell me what you would measure and which Vue techniques you would reach for."

**What a strong answer should cover:**
- **Measure first**: browser performance profile, Vue DevTools, \`app.config.performance\`, bundle analysis, and Core Web Vitals (LCP, INP).
- **Load performance**: code splitting with lazy routes and \`defineAsyncComponent\`, tree-shaking, SSR or prerendering where first paint matters, lazy hydration.
- **Update performance**: keep child props stable so Vue can skip re-renders, derive with \`computed\`, pass primitives rather than whole objects, \`v-memo\`/\`v-once\` for expensive stable subtrees.
- **Reactivity cost**: \`shallowRef\`/\`markRaw\` for large or external data, avoiding deep reactivity on big arrays.
- **Large lists**: virtual scrolling instead of rendering thousands of rows; stable \`:key\`s.
- **Other**: \`v-show\` vs \`v-if\` for frequent toggles, \`KeepAlive\` for expensive views, debouncing input, avoiding work in watchers.

**Clarifying questions expected:**
- "Is the problem initial load, interaction latency, or memory over time?"
- "How large is the data, and how often does it change?"

**Code / implementation expected:** Optional — an example of a child that re-renders needlessly and the fix.`,
    answer: `**Target Audience:** Vue developers who have shipped an app and now need a method for making it faster. Assumes the Composition API basics.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. Every number here was measured for this answer on Vue 3.5.44: the re-render counts by mounting the runnable example in jsdom with <code>scripts/verify-vue-example.mjs</code>, the reactivity timings with Node, the code-splitting output with <code>vite build</code> (Vite 8.3.4), and the list timings in headless Chromium. Absolute timings depend on hardware; compare them relative to each other.

## 1. Why This Even Matters — A Story First

A restaurant gets complaints that service is slow. A bad manager buys a faster oven. A good manager first stands in the kitchen with a stopwatch. Perhaps the oven is fine and the problem is that the waiter re-reads the whole menu to the chef every time one table adds a drink. Perhaps the doors to the dining room are so heavy that every plate takes ten seconds to carry out. Each problem has a different fix, and the faster oven fixes none of them.

Vue performance work is the same. "The app is slow" can mean the first load is slow (heavy doors: too much JavaScript, no server rendering), interactions are slow (the waiter re-reading the menu: needless re-renders and deep reactivity), or the page itself is huge (10,000 plates at once: too many DOM nodes). **Measure, find which one it is, then apply the matching fix.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it slow on first load, on interaction, or after a while? | Load, update and memory problems have different fixes. |
| On which devices? | A mid-range phone has a fraction of a laptop's CPU; test there. |
| How much data is on screen? | Thousands of rows point to virtual scrolling, not micro-optimisations. |
| Is it server-rendered? | SSR changes the load picture: hydration cost, lazy hydration. |
| What do the field metrics say (LCP, INP)? | Real-user data shows which problem users actually feel. |

## 3. Step One: Measure

📌 **Interview term: Core Web Vitals** — Google's user-centred metrics. **LCP** (Largest Contentful Paint) measures load, **INP** (Interaction to Next Paint) measures responsiveness, **CLS** measures layout shifts.

Tools, roughly in order:

1. **Browser Performance panel**: record the slow interaction and see whether time goes to scripting, rendering or painting.
2. **Vue DevTools**: component tree, re-render highlighting and a performance timeline.
3. **<code>app.config.performance = true</code>** (development builds): Vue emits <code>performance.measure</code> entries per component. Verified with a <code>PerformanceObserver</code>, mounting an <code>App</code> with two <code>Row</code> children produced:

\`\`\`
<App> mount
<App> init
<App> render
<App> patch
<Row> mount
<Row> init
<Row> render
<Row> patch
...
\`\`\`

These appear as named spans in the browser Performance panel, so you can see which component's render or patch is expensive.

4. **Bundle analysis**: <code>vite build</code> prints chunk sizes; a visualiser plugin shows what is inside them.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="Three kinds of slowness: load, updates and DOM size, each with its own fixes">
  <rect class="d-box-accent" x="260" y="20" width="200" height="50" rx="10"/>
  <text class="d-text d-accent" x="360" y="50" text-anchor="middle">profile first</text>
  <path class="d-edge" d="M 300 72 L 130 120"/>
  <path class="d-edge" d="M 360 72 L 360 120"/>
  <path class="d-edge" d="M 420 72 L 590 120"/>
  <rect class="d-box" x="30" y="124" width="200" height="50" rx="10"/>
  <text class="d-text" x="130" y="154" text-anchor="middle">slow load</text>
  <rect class="d-box" x="260" y="124" width="200" height="50" rx="10"/>
  <text class="d-text" x="360" y="154" text-anchor="middle">slow updates</text>
  <rect class="d-box" x="490" y="124" width="200" height="50" rx="10"/>
  <text class="d-text" x="590" y="154" text-anchor="middle">too much DOM</text>
  <rect class="d-box-muted" x="30" y="204" width="200" height="56" rx="10"/>
  <text class="d-sub" x="130" y="228" text-anchor="middle">code splitting, SSR,</text>
  <text class="d-sub" x="130" y="246" text-anchor="middle">lazy hydration</text>
  <rect class="d-box-muted" x="260" y="204" width="200" height="56" rx="10"/>
  <text class="d-sub" x="360" y="228" text-anchor="middle">stable props, computed,</text>
  <text class="d-sub" x="360" y="246" text-anchor="middle">shallowRef, v-memo</text>
  <rect class="d-box-muted" x="490" y="204" width="200" height="56" rx="10"/>
  <text class="d-sub" x="590" y="228" text-anchor="middle">virtual scrolling,</text>
  <text class="d-sub" x="590" y="246" text-anchor="middle">pagination, v-show</text>
</svg>

Each column is a separate problem. Most real apps have one dominant one, and fixing the wrong column gives nothing.

## 4. Load Performance

📌 **Interview term: Code splitting** — breaking the bundle into chunks that load on demand. In Vue, use lazy routes (<code>component: () =&gt; import("./Page.vue")</code>) and <code>defineAsyncComponent</code> for heavy widgets. Verified with <code>vite build</code>: a chart behind a <code>v-if</code>, wrapped in <code>defineAsyncComponent(() =&gt; import("./HeavyChart.vue"))</code>, became its own file:

\`\`\`
dist/assets/HeavyChart-DMPyxXEN.js   0.31 kB │ gzip:  0.25 kB
dist/assets/index-C4ZCCYKu.js       66.13 kB │ gzip: 26.10 kB
\`\`\`

The main bundle does not contain the chart; the browser fetches it the first time the chart renders. See [lazy-loading routes and components](/interview-question/how-do-you-lazy-load-routes-and-components-in-vue).

Other load levers:

- **Server rendering or prerendering** for content pages, so the first paint does not wait for JavaScript ([SSR](/interview-question/how-does-server-side-rendering-work-in-vue-rendertostring-hydration), or [Nuxt](/interview-question/what-is-nuxt-and-how-does-it-relate-to-vue)).
- **Lazy hydration** (Vue 3.5) to spread or skip hydration work for below-the-fold widgets ([lazy hydration](/interview-question/what-is-lazy-hydration-in-vue-3-5-hydrate-strategies-idle-visible-interaction)).
- **Tree-shaking**: import named functions (<code>import { debounce } from "lodash-es"</code>), not whole libraries; Vue's own APIs are tree-shakable, so unused features such as <code>Transition</code> are dropped.
- **Precompiled templates**: use SFCs with a bundler so the browser never ships the template compiler.

## 5. Update Performance: Skip Work You Do Not Need

Vue re-renders a component when reactive state it **read during render** changes, or when its props change. A child is skipped when its props are unchanged (compared with <code>!==</code>). Most update problems are children re-rendering because their props look "new" every time.

**Verified: prop stability.** The runnable example renders five children and counts each child's re-renders with <code>onUpdated</code>. The parent re-renders three times for an unrelated counter, then changes the selected row:

\`\`\`
[driver] after 3 unrelated parent re-renders: {"inline-object":3}
[driver] after changing selection 2 -> 3: {"inline-object":4,"row-2":1,"row-3":1}
\`\`\`

- **<code>:options="{ dense: compact }"</code>** builds a new object on every parent render, so that child re-rendered **every time** (3, then 4), although nothing it shows changed.
- **The same data from a <code>computed</code>** keeps the same object reference until <code>compact</code> changes, so that child was skipped every time.
- **Rows received <code>:active="id === selectedId"</code>**, a boolean, instead of <code>selectedId</code> itself. Changing the selection re-rendered only the two rows whose answer changed (row-2 and row-3), not row-1.

A related surprise: an inline object made only of **constants**, such as <code>:options="{ dense: true }"</code>, did **not** cause re-renders in the first version of this test. The compiler emitted that child vnode with no patch flag (nothing in it can change), and in the 3.5.44 <code>shouldUpdateComponent</code> an optimised vnode with patch flag 0 skips the props comparison and returns "no update". The cost appears as soon as the literal reads reactive state. The mechanism is explained in [compiler optimisations](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t).

📌 **Interview term: Prop stability** — passing props whose identity does not change unless their meaning does: primitives, computed values, objects created once. It is what lets Vue skip child components.

More update levers:

- **<code>computed</code> over methods in templates**: a computed caches until its dependencies change; a method runs on every render. See [computed vs watch](/interview-question/what-is-the-difference-between-computed-and-watch).
- **<code>v-memo</code> and <code>v-once</code>** for expensive subtrees whose output depends on a few known values; see [v-once and v-memo](/interview-question/what-are-v-once-and-v-memo).
- **Split big components** so that fast-changing state (a clock, an input) lives in a small component and does not re-render a large one.
- **Debounce** expensive reactions to typing, for example the filter in the question, instead of filtering 10,000 items on every keystroke.

## 6. Reactivity Cost: shallowRef and markRaw

Deep reactivity wraps every nested object in a proxy the first time you access it, and tracks every property read. For large data that is real work. Verified in Node with 100,000 rows:

\`\`\`
ref(array): set + sum all prices                 91.4 ms (median of 7)
shallowRef(array): set + sum all prices          11.1 ms (median of 7)
computed re-ran after mutating one item in place -> ref: 1 time(s), shallowRef: 0 time(s)
after replacing the shallowRef array, computed re-ran: 1 time(s) in total
\`\`\`

Both numbers include creating the 100,000 objects (about the same in both), so deep reactivity added roughly **80 ms** just to iterate the data once. The trade-off is in the last two lines: with <code>shallowRef</code>, mutating an item in place is **not** tracked; you replace the array (or call <code>triggerRef</code>) to update. That suits data that arrives from an API and is replaced as a whole. Details in [when to use shallowRef](/interview-question/when-should-you-use-shallowref-shallowreactive-triggerref) and [markRaw and toRaw](/interview-question/what-do-markraw-and-toraw-do) (for class instances, maps or chart objects that should never be reactive).

## 7. Too Much DOM: Lists and Toggles

No amount of diffing makes 10,000 rows cheap, because the browser still has to lay out and paint them. Measured in headless Chromium with 10,000 rows of 32 px:

| | Elements after mount | Mount script | Page start to first frame |
| :--- | :--- | :--- | :--- |
| Render every row | 10,002 | 61.7 ms | 322.6 ms |
| Virtual list (only visible rows) | 18 | 10.4 ms | 57.7 ms |

📌 **Interview term: Virtual scrolling (windowing)** — rendering only the rows inside the viewport plus a small buffer, and faking the full scroll height with a spacer. The full method is in [rendering very large lists](/interview-question/how-do-you-render-very-large-lists-efficiently-in-vue-virtual-scrolling).

Also:

- **<code>v-show</code> for frequent toggles**, <code>v-if</code> for rare ones: <code>v-show</code> keeps the DOM and flips <code>display</code>, <code>v-if</code> destroys and recreates it. See [v-if vs v-show](/interview-question/what-is-the-difference-between-v-if-and-v-show).
- **<code>KeepAlive</code>** caches expensive views (tabs, list pages) instead of rebuilding them on every visit, at a memory cost; see [keep-alive](/interview-question/what-is-keep-alive-in-vue).
- **Stable keys** in <code>v-for</code> so reorders move nodes instead of rewriting them; see [keyed list diffing](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists).

## 8. Technique Cheat Sheet

| Symptom | Technique | Watch out for |
| :--- | :--- | :--- |
| Large initial bundle | Lazy routes, <code>defineAsyncComponent</code>, tree-shaking | Too many tiny chunks; loading spinners everywhere |
| Slow first paint on content pages | SSR, prerendering, Nuxt | Server cost, hydration mismatches |
| Long hydration task | Lazy hydration (3.5) | Plain Vue still downloads the chunk at mount |
| Children re-render on unrelated changes | Stable props, computed, pass primitives | Inline objects and arrow functions as props |
| Expensive derived values | <code>computed</code> | Side effects inside computed |
| Big or external data | <code>shallowRef</code>, <code>markRaw</code> | In-place mutations are no longer tracked |
| Expensive stable subtree | <code>v-memo</code>, <code>v-once</code> | Stale UI if a dependency is left out |
| Thousands of rows | Virtual scrolling, pagination | Variable row heights, find-in-page, accessibility |
| Frequent show and hide | <code>v-show</code> | Hidden content still renders once |

Looking further ahead, Vapor mode (in the Vue 3.6 release candidates, not in 3.5) removes the virtual DOM diff for compiled components; it is covered in [Vapor vs VDOM trade-offs](/interview-question/when-should-you-choose-vapor-over-vdom-in-a-real-app-trade-offs).

## 9. Common Pitfalls

- **Optimising without a profile.** You will speed up the part that was not slow.
- **Inline objects or arrays that read state as props.** Verified: such a child re-rendered on every parent update; the computed version never did.
- **Deep <code>ref</code> on huge API responses.** Measured at about 80 ms extra for one pass over 100,000 rows; use <code>shallowRef</code> and replace instead of mutate.
- **Methods in templates for expensive work.** They run on every render; use <code>computed</code>.
- **Rendering thousands of DOM nodes.** Virtualise; keys and patch flags cannot remove browser layout cost.
- **Measuring in development mode.** Dev builds include warnings and devtools hooks; profile a production build, except when you need <code>app.config.performance</code> marks.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start with measurement:</strong> <span style="color:#f0e2c8;">"I would profile first: the Performance panel, Vue DevTools and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.config.performance</code> in development, plus bundle sizes and field metrics like LCP and INP, to find out whether load, updates or DOM size is the problem."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Load:</strong> <span style="color:#f0e2c8;">"For load: lazy routes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineAsyncComponent</code> so heavy parts are separate chunks, tree-shaking, precompiled templates, and SSR or prerendering with lazy hydration where first paint matters."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Updates:</strong> <span style="color:#f0e2c8;">"For updates: keep child props stable so Vue can skip them. An inline object that reads state is a new object every render; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> or a primitive is not. Derive with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> for expensive stable subtrees, and debounce input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Reactivity and DOM:</strong> <span style="color:#f0e2c8;">"Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">markRaw</code> for large or external data, which saved about 80 ms per pass over 100,000 rows in a test, and virtualise long lists, because the browser still lays out every node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close the loop:</strong> <span style="color:#f0e2c8;">"Then measure again on a production build and a mid-range device, and keep the change only if the metric moved."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does an inline object prop cause re-renders?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vue skips a child when every prop is identical by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!==</code>. An object literal that reads state is created again on each parent render, so the prop always looks changed. Interestingly, a literal made only of constants is compiled with no patch flag and is skipped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shallowRef</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ref</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For large data replaced as a whole, such as API responses or a big table, and for objects owned by other libraries. The trade-off is that mutating nested data is not tracked, so you replace the value or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">triggerRef</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v-memo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">computed</code> differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> caches a value. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-memo</code> caches a rendered subtree and skips its patch unless the listed dependencies change, which helps for big list rows where only a selection flag matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you fix a laggy filter box over 10,000 items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce the input, compute the filtered list with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shallowRef</code> source, and render it through a virtual list so only the visible rows exist in the DOM.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">KeepAlive</code> make things faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes returning to a view faster by keeping its component instance and DOM instead of rebuilding them, at the cost of memory and stale-data handling. Limit it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> and refresh data in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onActivated</code>.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LCP / INP** | Load and responsiveness metrics from Core Web Vitals |
| **Code splitting** | Loading parts of the app on demand as separate chunks |
| **Prop stability** | Props keep their identity unless their meaning changes, so children can be skipped |
| **computed** | Cached derived value, recomputed only when dependencies change |
| **shallowRef** | Ref whose value is not made deeply reactive |
| **markRaw** | Marks an object so Vue never makes it reactive |
| **v-memo** | Skips re-rendering a subtree unless listed values change |
| **Virtual scrolling** | Rendering only the visible rows of a long list |

---
**Conclusion:** Optimising a Vue app starts with a profile that tells you whether the problem is load, updates or DOM size. For load: split code with lazy routes and async components (verified as a separate chunk), and use SSR, prerendering or lazy hydration where first paint matters. For updates: keep props stable (an inline object that read state re-rendered its child on every parent update, a computed one never did), derive with <code>computed</code>, and use <code>shallowRef</code> for big data (about 80 ms saved for 100,000 rows). For DOM size: virtualise long lists (18 elements instead of 10,002 in Chromium). Then measure again.`,
    examples: [
      {
        label: "Prop stability: which children re-render when the parent updates",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, computed, defineComponent, h, onUpdated } from "vue";

// Re-render counters. Only <Report> reads them, so updating them never re-renders App.
const renders = ref({});
const Report = defineComponent({ setup: () => () => h("pre", JSON.stringify(renders.value)) });

// A child that counts its own re-renders.
const Child = defineComponent({
  props: { name: String, options: Object, active: Boolean },
  setup(props) {
    onUpdated(() => { renders.value = { ...renders.value, [props.name]: (renders.value[props.name] || 0) + 1 }; });
    return () => h("li", \`\${props.name}: \${props.active ? "active" : "idle"}\`);
  },
});

const ticks = ref(0);        // unrelated parent state that changes often
const selectedId = ref(2);
const compact = ref(true);
// computed caches the object: same reference until compact itself changes
const stableOptions = computed(() => ({ dense: compact.value }));
const rows = [1, 2, 3];
</script>

<template>
  <button @click="ticks++">parent re-render ({{ ticks }})</button>
  <button @click="selectedId = selectedId === 2 ? 3 : 2">change selection</button>
  <ul>
    <!-- Inline object that reads state: a NEW object on every parent render, so the child re-renders. -->
    <Child name="inline-object" :options="{ dense: compact }" />
    <!-- Same value from a computed: the reference is unchanged, so the child is skipped. -->
    <Child name="stable-object" :options="stableOptions" />
    <!-- A derived boolean per row instead of the whole selectedId: only rows whose answer changes update. -->
    <Child v-for="id in rows" :key="id" :name="'row-' + id" :active="id === selectedId" />
  </ul>
  <Report />
</template>`,
      },
      {
        label: "ref vs shallowRef for 100,000 rows (run with Node)",
        tech: "js",
        runnable: false,
        code: `import { ref, shallowRef, computed, effect } from "vue";
const make = () => Array.from({ length: 100_000 }, (_, i) => ({ id: i, price: i % 100, tags: ["a", "b"] }));
function bench(label, fn) { const runs = []; for (let r = 0; r < 7; r++) { const t = performance.now(); fn(); runs.push(performance.now() - t); } runs.sort((a, b) => a - b); console.log(label.padEnd(48), runs[3].toFixed(1), "ms (median of 7)"); }
bench("ref(array): set + sum all prices", () => { const r = ref(make()); let s = 0; for (const x of r.value) s += x.price; });
bench("shallowRef(array): set + sum all prices", () => { const r = shallowRef(make()); let s = 0; for (const x of r.value) s += x.price; });
const deep = ref(make()), shallow = shallowRef(make());
let runsDeep = 0, runsShallow = 0;
const cd = computed(() => { runsDeep++; return deep.value.reduce((s, x) => s + x.price, 0); });
const cs = computed(() => { runsShallow++; return shallow.value.reduce((s, x) => s + x.price, 0); });
cd.value; cs.value;
deep.value[5].price = 99; shallow.value[5].price = 99;
cd.value; cs.value;
console.log("computed re-ran after mutating one item in place -> ref:", runsDeep - 1, "time(s), shallowRef:", runsShallow - 1, "time(s)");
shallow.value = shallow.value.slice(); cs.value;
console.log("after replacing the shallowRef array, computed re-ran:", runsShallow - 1, "time(s) in total");`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you render very large lists efficiently in Vue (virtual scrolling)?",
    seoDescription:
      "Render huge Vue lists with virtual scrolling: only visible rows plus a spacer. A hand-rolled fixed-height list and TanStack Virtual, measured in Chromium.",
    description: `**Question presented to candidate:**
"We need to show an audit log with 50,000 entries in a scrollable panel. Rendering it with a plain \`v-for\` freezes the page. How would you render it efficiently in Vue? Explain virtual scrolling and what you would build or use."

**What a strong answer should cover:**
- Why plain \`v-for\` is slow: every row is a component or element to create, lay out and keep in memory; keys and diffing do not remove browser layout cost.
- **Virtual scrolling (windowing)**: render only the rows in view plus an **overscan** buffer, use a **spacer** with the full height so the scrollbar is right, and position the slice with a transform.
- The maths for fixed heights: \`start = floor(scrollTop / rowHeight) - overscan\`, \`end = ceil((scrollTop + viewport) / rowHeight) + overscan\`.
- Variable heights: estimate, measure rendered rows, and correct offsets (what libraries such as TanStack Virtual handle).
- Supporting choices: \`shallowRef\` for the data, stable keys, passive scroll listeners, and alternatives such as pagination or infinite loading.
- Trade-offs: browser find-in-page and accessibility only see rendered rows; sticky headers and scroll restoration need care.

**Clarifying questions expected:**
- "Are rows fixed height or variable?"
- "Do users need to search the page with Ctrl+F or select across many rows?"

**Code / implementation expected:** Yes — a minimal fixed-height virtual list or the setup of a library.`,
    answer: `**Target Audience:** Vue developers who have hit a slow page with a long list and want to explain or build virtual scrolling. Assumes <code>v-for</code> and <code>computed</code>.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer listens for. The runnable list passed <code>scripts/verify-vue-example.mjs</code> on Vue 3.5.44 (mounted in jsdom, scrolled by setting <code>scrollTop</code> and firing a scroll event). The timings in section 6 come from headless Chromium driven by Playwright, comparing a plain <code>v-for</code>, the hand-rolled list and <code>@tanstack/vue-virtual</code> 3.13.47, each as a production bundle. Timings vary between runs and machines; both runs are shown.

## 1. Why This Even Matters — A Story First

A library has 50,000 books. A visitor wants to browse the shelves. One approach: carry every book out of the stacks and lay them all on the reading-room floor, then let the visitor walk along. It takes hours to set up, there is no room to move, and the visitor will look at maybe thirty books.

The sensible approach: put up a long, empty bookcase whose length matches 50,000 books, so the visitor can see how far they are along. Then fill **only the shelf in front of them**, plus a couple of shelves either side so nothing looks empty as they walk. As they move, the librarian takes books off the shelves behind and puts the right ones on the shelves ahead.

That is virtual scrolling. The long empty bookcase is a **spacer** that gives the scrollbar its full height. The few filled shelves are the **visible slice** of rows. The extra shelves on either side are the **overscan**.

## 2. Why Plain v-for Is Slow

Vue is fast at diffing, but a list of 50,000 rows means 50,000 elements (or components) to create, then 50,000 boxes for the browser to style, lay out, paint and keep in memory. [Keys](/interview-question/how-does-vue-s-virtual-dom-diff-keyed-lists) and [compiler optimisations](/interview-question/how-does-the-vue-compiler-optimize-templates-static-hoisting-patch-flags-block-t) reduce **update** work; they do nothing about the browser cost of having that many nodes. The only real fix is to have fewer nodes.

📌 **Interview term: Virtual scrolling (windowing, list virtualisation)** — rendering only the items currently in the scroll viewport (plus a small buffer) and simulating the rest with empty space, so the DOM size stays constant however long the list is.

📌 **Interview term: Overscan** — extra rows rendered just outside the visible area, so a fast scroll does not show blank space before the next render.

📌 **Interview term: Spacer** — an empty element whose height equals the total height of all rows. It makes the scroll container's scrollbar and scroll range behave as if every row were there.

## 3. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Fixed or variable row heights? | Fixed heights make the maths exact; variable heights need measuring. |
| Does the list scroll inside a panel or with the whole page? | Element scrolling vs window scrolling changes the setup. |
| Do users need browser find (Ctrl+F) or to select across rows? | Only rendered rows are searchable or selectable. |
| Is the data all on the client, or paged from a server? | 50,000 rows from an API may want server pagination or infinite loading too. |
| Are rows interactive (inputs, expand/collapse)? | Recycled rows must not keep state from a previous item. |

## 4. The Core Algorithm (Fixed Height)

With a fixed <code>ROW_HEIGHT</code>, a viewport height <code>VIEWPORT</code> and the container's <code>scrollTop</code>:

\`\`\`js
start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
end   = Math.min(total, Math.ceil((scrollTop + VIEWPORT) / ROW_HEIGHT) + OVERSCAN)
visible = rows.slice(start, end)
offset  = start * ROW_HEIGHT        // translateY for the rendered slice
spacer  = total * ROW_HEIGHT        // full scroll height
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="A scroll container with a full-height spacer. Only the rows inside the viewport plus overscan are rendered, positioned with translateY">
  <defs>
    <marker id="vvs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="20" width="200" height="280" rx="10"/>
  <text class="d-sub" x="160" y="44" text-anchor="middle">spacer: all rows tall</text>
  <rect class="d-box" x="80" y="110" width="160" height="26" rx="4"/>
  <text class="d-sub" x="160" y="128" text-anchor="middle">overscan</text>
  <rect class="d-box-accent" x="80" y="140" width="160" height="80" rx="4"/>
  <text class="d-text d-accent" x="160" y="185" text-anchor="middle">visible rows</text>
  <rect class="d-box" x="80" y="224" width="160" height="26" rx="4"/>
  <text class="d-sub" x="160" y="242" text-anchor="middle">overscan</text>
  <path class="d-edge-dashed" d="M 20 140 L 300 140"/>
  <path class="d-edge-dashed" d="M 20 220 L 300 220"/>
  <text class="d-sub" x="330" y="184">viewport</text>
  <rect class="d-box" x="440" y="40" width="250" height="56" rx="10"/>
  <text class="d-text" x="565" y="64" text-anchor="middle">start = scrollTop / rowH</text>
  <text class="d-sub" x="565" y="84" text-anchor="middle">minus overscan</text>
  <rect class="d-box" x="440" y="130" width="250" height="56" rx="10"/>
  <text class="d-text" x="565" y="154" text-anchor="middle">slice(start, end)</text>
  <text class="d-sub" x="565" y="174" text-anchor="middle">about 18 rows in the DOM</text>
  <rect class="d-box" x="440" y="220" width="250" height="56" rx="10"/>
  <text class="d-text" x="565" y="244" text-anchor="middle">translateY(start x rowH)</text>
  <text class="d-sub" x="565" y="264" text-anchor="middle">moves the slice into view</text>
  <path class="d-edge" d="M 565 100 L 565 126" marker-end="url(#vvs-arrow)"/>
  <path class="d-edge" d="M 565 190 L 565 216" marker-end="url(#vvs-arrow)"/>
</svg>

The spacer on the left is what the scrollbar measures. Rows above and below the overscan bands simply do not exist; the right-hand column is the computation that runs on every scroll event.

In Vue this is three <code>computed</code> values over one <code>scrollTop</code> ref, updated by a <code>@scroll.passive</code> handler. Vue batches state changes made in the same tick into one re-render, so the handler can stay trivial. The [passive listener](/interview-question/why-would-you-add-passive-true-to-a-scroll-or-touchstart-listener-and-what-probl) tells the browser the handler will not call <code>preventDefault()</code>, so scrolling never waits for it.

## 5. Verified: The Hand-Rolled List

The runnable example has 10,000 rows of 32 px in a 320 px viewport with an overscan of 4. Mounted in jsdom, then scrolled to 160,000 px:

\`\`\`
[driver] initial: <li> in DOM = 14, first = "Row #0", last = "Row #13", transform = translateY(0px), spacer = 320000px
[driver] after scrolling to 160000px: <li> in DOM = 18, first = "Row #4996", last = "Row #5013", transform = translateY(159872px), spacer = 320000px
[driver] summary: 10000 rows, 18 in the DOM (rows 4996 to 5013)
\`\`\`

At the top, 10 visible rows plus 4 overscan below (none above, because <code>start</code> is clamped to 0) give 14. In the middle, 4 above, 10 visible and 4 below give 18. The spacer stays at 320,000 px (10,000 x 32), and the slice is moved to 159,872 px (4996 x 32) so row 5000 lines up with the top of the viewport. jsdom has no layout engine, which is why the driver sets <code>scrollTop</code> by hand; the browser run below checks the same thing with real scrolling.

Two details in the code matter:

- **<code>shallowRef</code> for the rows.** The 10,000 row objects are replaced, never mutated, so there is no reason to make each one deeply reactive. See [shallowRef](/interview-question/what-are-shallowref-and-shallowreactive).
- **<code>:key="row.id"</code>, not the slice index.** As you scroll, rows enter and leave the slice; id keys let Vue keep the DOM of rows that are still visible and only create or remove the edges.

## 6. Verified: Plain v-for vs Virtual Lists in Chromium

Three production bundles, each with 10,000 rows of 32 px in a 320 px scroll container: a plain <code>v-for</code> (Naive), the hand-rolled list (App) and the same list with <code>@tanstack/vue-virtual</code> 3.13.47 (Tanstack). Each was loaded 5 times in headless Chromium; medians shown. "Scroll-to-frame" sets <code>scrollTop</code> to 160,000 and waits two animation frames.

\`\`\`
Naive     mount script 49.6 ms | page start to first frame 218.7 ms | elements after mount 10002 | rows in DOM after scroll 10000 | first visible after scroll "Row #5000" | scroll-to-frame 55.5 ms | JS heap 5.6 MB
App       mount script 8.3 ms | page start to first frame 55.5 ms | elements after mount 18 | rows in DOM after scroll 18 | first visible after scroll "Row #5000" | scroll-to-frame 30.2 ms | JS heap 2.8 MB
Tanstack  mount script 19.2 ms | page start to first frame 93.7 ms | elements after mount 16 | rows in DOM after scroll 18 | first visible after scroll "Row #5000" | scroll-to-frame 28.0 ms | JS heap 3.1 MB
Naive     mount script 61.7 ms | page start to first frame 322.6 ms | elements after mount 10002 | rows in DOM after scroll 10000 | first visible after scroll "Row #5000" | scroll-to-frame 55.6 ms | JS heap 5.8 MB
App       mount script 10.4 ms | page start to first frame 57.7 ms | elements after mount 18 | rows in DOM after scroll 18 | first visible after scroll "Row #5000" | scroll-to-frame 30.9 ms | JS heap 2.8 MB
Tanstack  mount script 10.5 ms | page start to first frame 52.5 ms | elements after mount 16 | rows in DOM after scroll 18 | first visible after scroll "Row #5000" | scroll-to-frame 30.5 ms | JS heap 3.1 MB
\`\`\`

- **Both virtual lists showed the correct row** ("Row #5000") at the top after scrolling, with 16 to 18 rows in the DOM instead of 10,000.
- **First frame came much sooner**: roughly 52 to 94 ms for the virtual lists vs 219 to 323 ms for the plain list (4 to 6 times sooner for the hand-rolled list; 2 to 6 times for TanStack, whose first run was slower).
- **Scroll-to-frame** was about 30 ms for the virtual lists, which is essentially the two animation frames the measurement waits for, against about 55 ms for the plain list.
- **JS heap** roughly halved. With 50,000 rows, or rows that are components, the gaps grow.

**An alternative that did not help here.** CSS <code>content-visibility: auto</code> (with <code>contain-intrinsic-size</code>) lets the browser skip rendering off-screen elements while keeping them in the DOM. Added to every row of the plain list, it was **slower** in this test (first frame 268 to 282 ms, scroll-to-frame about 93 ms), probably because each tiny row became its own containment boundary. It may suit long pages of large, complex sections; it is not a replacement for virtualising 10,000 small rows.

## 7. Variable Heights and Libraries

Fixed heights are the easy case. With variable heights you cannot compute <code>start</code> from <code>scrollTop</code> by division, because you do not know where each row begins until it has been rendered. Libraries handle this by **estimating** a height, **measuring** rows once rendered, caching the real sizes and correcting offsets as you scroll.

| Option | Notes |
| :--- | :--- |
| Hand-rolled (fixed height) | Smallest bundle; perfect for uniform rows; verified above |
| <code>@tanstack/vue-virtual</code> | Headless: you render the markup, it computes the items (<code>getVirtualItems()</code>) and total size; supports dynamic measurement, horizontal and grid layouts per its docs. Fixed-height use verified above |
| <code>vue-virtual-scroller</code> | Component-based (<code>RecycleScroller</code>, <code>DynamicScroller</code>); version 3.0.5 on npm at the time of writing; not tested here |
| Pagination or infinite loading | When users rarely need to scroll far, or data comes from a server in pages |

The headless library example is in the examples tab. Its key part is a <code>computed</code> options object passed to <code>useVirtualizer</code>, so options can react to data changes, and a <code>ref</code> to the scroll element via <code>getScrollElement</code>. For the template-ref side of that, see [accessing DOM elements](/interview-question/how-do-you-access-a-dom-element-or-child-component-instance).

## 8. Things Virtualisation Breaks (and Fixes)

- **Find in page and screen readers.** Only rendered rows exist. Provide your own search over the data, and set <code>aria-rowcount</code> and <code>aria-rowindex</code> on a grid so assistive technology knows the real size.
- **State inside rows.** Rows are unmounted when they scroll out. Keep input values and expanded flags in your data, not in row components or uncontrolled inputs.
- **Scroll restoration.** Coming back to the page, restore <code>scrollTop</code> after the spacer has its height, or the browser clamps it to 0.
- **Sticky headers and keyboard navigation.** Keep headers outside the scrolling slice; when arrow keys move focus past the slice, scroll first, then focus the newly rendered row.

## 9. Common Pitfalls

- **Virtualising without a fixed-height container.** The scroll container needs a known height (CSS or a parent layout), or it grows to the spacer height and nothing scrolls.
- **Keying rows by slice index.** Every scroll then rewrites every row's content instead of adding and removing the edges.
- **Deep <code>ref</code> on the source array.** Use <code>shallowRef</code>; the list is replaced, not mutated, and deep proxies cost time on large data.
- **Doing heavy work in the scroll handler.** Only update <code>scrollTop</code>; let <code>computed</code> derive the slice and Vue batch the render.
- **Zero overscan.** Fast scrolling then flashes empty space; a few rows above and below are cheap.
- **Using it for 200 rows.** Below a few hundred simple rows, plain <code>v-for</code> is usually fine and simpler; measure first, as described in [Vue performance](/interview-question/how-do-you-optimize-performance-in-a-vue-app).

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The real problem:</strong> <span style="color:#f0e2c8;">"A huge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> is slow because of DOM size: every row is created, laid out, painted and kept in memory. Keys and patch flags cannot fix that, so I render fewer nodes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The technique:</strong> <span style="color:#f0e2c8;">"Virtual scrolling renders only the rows in the viewport plus a few overscan rows, moves them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateY</code>, and uses a spacer with the full height so the scrollbar behaves normally."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The maths:</strong> <span style="color:#f0e2c8;">"With fixed heights: start is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floor(scrollTop / rowHeight)</code> minus overscan, end is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ceil((scrollTop + viewport) / rowHeight)</code> plus overscan. In Vue that is a few <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computed</code> values over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scrollTop</code> ref set by a passive scroll handler."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The evidence:</strong> <span style="color:#f0e2c8;">"In a test with 10,000 rows, the virtual list kept about 18 rows in the DOM, and in Chromium it reached the first frame several times sooner than a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v-for</code> with about half the JS heap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Libraries and trade-offs:</strong> <span style="color:#f0e2c8;">"For variable heights I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@tanstack/vue-virtual</code>, which measures rows. I would plan for find-in-page, accessibility attributes, scroll restoration and keeping row state in data, since rows unmount."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle rows with different heights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Estimate a height for unmeasured rows, measure each row after it renders, cache the real sizes and recompute offsets. That is what TanStack Virtual's measurement support is for; hand-rolling it is possible but fiddly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a transform instead of padding or absolute positioning per row?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">translateY</code> on the slice container moves all rendered rows at once and is cheap for the compositor. Per-row absolute positioning also works and is what the TanStack example does; padding changes cause layout on every scroll.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to an input inside a row when it scrolls away?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The row is unmounted, so its DOM state is gone. Bind the input to the item's data (v-model on the row object) so the value survives when the row is rendered again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">content-visibility: auto</code> be simpler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps every node in the DOM but lets the browser skip rendering off-screen ones. In a 10,000 small-row test it was actually slower than the plain list, so for long lists of small rows virtualisation is still the answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose pagination instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When users look for specific items rather than browse, when data comes from a server in pages anyway, or when the list must be fully accessible and searchable without custom work.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Virtual scrolling** | Rendering only visible rows plus a buffer |
| **Windowing** | Another name for virtual scrolling |
| **Viewport** | The visible area of the scroll container |
| **Overscan** | Extra rows rendered just outside the viewport |
| **Spacer** | Empty element with the full list height, for the scrollbar |
| **Visible slice** | The subset of items currently rendered |
| **Dynamic measurement** | Measuring rendered rows to learn their real heights |
| **content-visibility** | CSS property that lets the browser skip rendering off-screen elements |

---
**Conclusion:** Very large lists are slow because of DOM size, not diffing, so the fix is to render fewer nodes. Virtual scrolling renders only the rows in the viewport plus an overscan buffer, positions them with a transform, and uses a full-height spacer so scrolling feels native. Verified on Vue 3.5.44: a 10,000-row list kept 14 to 18 rows in the DOM, and in Chromium both the hand-rolled list and <code>@tanstack/vue-virtual</code> reached the first frame several times sooner than a plain <code>v-for</code> (about 52 to 94 ms vs 219 to 323 ms), with about half the JS heap; <code>content-visibility</code> did not help for small rows. Use a fixed-height hand-rolled list for uniform rows, a library for variable heights, and plan for search, accessibility and row state.`,
    examples: [
      {
        label: "A fixed-height virtual list in one SFC: 10,000 rows, about 18 in the DOM",
        tech: "vue",
        runnable: true,
        code: `<script setup>
import { ref, shallowRef, computed } from "vue";

// 10,000 rows. shallowRef: rows are replaced, never mutated, so no deep proxies are needed.
const rows = shallowRef(Array.from({ length: 10000 }, (_, i) => ({ id: i, label: \`Row #\${i}\` })));

const ROW_HEIGHT = 32;     // fixed row height in px: makes the maths exact
const VIEWPORT = 320;      // visible height in px (10 rows)
const OVERSCAN = 4;        // extra rows above and below to hide blank flashes while scrolling

const scrollTop = ref(0);
const onScroll = (e) => { scrollTop.value = e.target.scrollTop; };

const start = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN));
const end = computed(() => Math.min(rows.value.length, Math.ceil((scrollTop.value + VIEWPORT) / ROW_HEIGHT) + OVERSCAN));
const visible = computed(() => rows.value.slice(start.value, end.value));
</script>

<template>
  <p>{{ rows.length }} rows, {{ visible.length }} in the DOM (rows {{ start }} to {{ end - 1 }})</p>
  <!-- The viewport scrolls; the spacer gives it the full scroll height of all rows. -->
  <div class="viewport" :style="{ height: VIEWPORT + 'px', overflowY: 'auto', position: 'relative' }" @scroll.passive="onScroll">
    <div :style="{ height: rows.length * ROW_HEIGHT + 'px' }"></div>
    <!-- Only the visible slice is rendered, moved down with a transform. -->
    <ul :style="{ position: 'absolute', top: 0, left: 0, right: 0, margin: 0, padding: 0, listStyle: 'none', transform: \`translateY(\${start * ROW_HEIGHT}px)\` }">
      <li v-for="row in visible" :key="row.id" :style="{ height: ROW_HEIGHT + 'px' }">{{ row.label }}</li>
    </ul>
  </div>
</template>`,
      },
      {
        label: "The same list with @tanstack/vue-virtual 3.13.47 (checked in Chromium)",
        tech: "vue",
        runnable: false,
        code: `<script setup>
import { ref, computed } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";

const rows = Array.from({ length: 10000 }, (_, i) => ({ id: i, label: \`Row #\${i}\` }));
const scrollEl = ref(null);

const virtualizer = useVirtualizer(computed(() => ({
  count: rows.length,
  getScrollElement: () => scrollEl.value,
  estimateSize: () => 32,
  overscan: 4,
})));
const items = computed(() => virtualizer.value.getVirtualItems());
const total = computed(() => virtualizer.value.getTotalSize());
</script>

<template>
  <div ref="scrollEl" class="viewport" style="height: 320px; overflow-y: auto">
    <div :style="{ height: \`\${total}px\`, position: 'relative' }">
      <div
        v-for="item in items"
        :key="item.key"
        class="row"
        :style="{ position: 'absolute', top: 0, left: 0, width: '100%', height: \`\${item.size}px\`, transform: \`translateY(\${item.start}px)\` }"
      >
        {{ rows[item.index].label }}
      </div>
    </div>
  </div>
</template>`,
      },
    ],
  },
];

export default augments;
