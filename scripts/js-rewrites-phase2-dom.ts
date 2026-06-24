/**
 * Phase 2 — Batch "DOM & web": 6 browser/DOM-platform stubs to interview depth
 * (TL;DR + SVG + table + tip + STATIC example). Examples use `runnable:false`
 * because they touch the DOM, which the in-page Web-Worker runner can't provide
 * — they render as static JS-highlighted snippets. Patch-in-place.
 *
 *   npx tsx scripts/js-rewrites-phase2-dom.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

type Example = { label: string; code: string; runnable?: boolean };
type Rewrite = { title: string; answer: string; examples: Example[] };

const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:14px;background:rgba(245,158,11,0.05)">\n${svg}\n</div>`;

const REWRITES: Rewrite[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is CORS?",
    answer: `**Core concept (TL;DR).** CORS (Cross-Origin Resource Sharing) is a **browser** security mechanism that relaxes the Same-Origin Policy in a controlled way. When a page makes a request to a *different* origin, the browser only exposes the response to JavaScript if the **server** opts in with the right <code>Access-Control-Allow-*</code> response headers.

${card(`<svg viewBox="0 0 520 178" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">The server's headers tell the browser what's allowed</text>
  <rect x="20" y="46" width="150" height="100" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="95" y="68" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">Browser</text>
  <text x="95" y="90" fill="currentColor" font-size="9" text-anchor="middle">app.com page</text>
  <text x="95" y="110" fill="currentColor" font-size="9" text-anchor="middle">fetch → api.other.com</text>
  <text x="95" y="130" fill="#ef4444" font-size="9" text-anchor="middle">enforces the rule</text>
  <rect x="350" y="46" width="150" height="100" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="425" y="68" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">Server</text>
  <text x="425" y="90" fill="currentColor" font-size="9" text-anchor="middle">api.other.com</text>
  <text x="425" y="112" fill="currentColor" font-size="8.5" text-anchor="middle">Access-Control-</text>
  <text x="425" y="126" fill="currentColor" font-size="8.5" text-anchor="middle">Allow-Origin: app.com</text>
  <path d="M 172 86 L 348 86" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#co-a)"/>
  <text x="260" y="78" fill="currentColor" font-size="9" text-anchor="middle">request (+ Origin header)</text>
  <path d="M 348 112 L 172 112" fill="none" stroke="#22c55e" stroke-width="1.5" marker-end="url(#co-a)"/>
  <text x="260" y="128" fill="#22c55e" font-size="9" text-anchor="middle">response + ACAO header</text>
  <defs><marker id="co-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** An "origin" is scheme + host + port; a request to a different one is cross-origin. The browser sends the <code>Origin</code> header and checks the response: if <code>Access-Control-Allow-Origin</code> matches (or is <code>*</code>), JS can read it; otherwise the browser blocks access (the request may still hit the server). "Non-simple" requests (e.g. <code>PUT</code>, custom headers) trigger a **preflight** <code>OPTIONS</code> request first, which the server must approve with <code>Allow-Methods</code>/<code>Allow-Headers</code>. Crucially, **CORS is enforced by the browser, not a server-side firewall** — and it doesn't apply to server-to-server calls.

### Key headers
| Header | Purpose |
| --- | --- |
| <code>Access-Control-Allow-Origin</code> | which origin(s) may read the response |
| <code>Access-Control-Allow-Methods</code> | allowed methods (preflight) |
| <code>Access-Control-Allow-Headers</code> | allowed request headers (preflight) |
| <code>Access-Control-Allow-Credentials</code> | allow cookies/auth |

> **Interview tip:** Two points score well: CORS is a **browser** policy (a curl/Postman call ignores it), and the **server** — not the client — fixes a CORS error by sending the right headers. Mention the preflight <code>OPTIONS</code> for non-simple requests.`,
    examples: [
      {
        label: "Cross-origin fetch + the headers that unblock it",
        runnable: false,
        code: `// A page on https://app.com calling a different origin:
fetch("https://api.other.com/data")
  .then((res) => res.json())
  .then(console.log);

// The BROWSER only reveals the response if the server replies with:
//   Access-Control-Allow-Origin: https://app.com   (or *)
//
// For "non-simple" requests (PUT/DELETE, custom headers) the browser
// first sends a preflight OPTIONS request; the server must answer:
//   Access-Control-Allow-Methods: PUT
//   Access-Control-Allow-Headers: Content-Type
//
// To send cookies, the client uses { credentials: "include" } AND the
// server must set Access-Control-Allow-Credentials: true (origin can't be *).`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is event delegation?",
    answer: `**Core concept (TL;DR).** Event delegation attaches a **single** listener to a common ancestor and uses event **bubbling** + <code>event.target</code> to handle events from many child elements — instead of adding a listener to each child. Fewer listeners, less memory, and it automatically covers elements added **later**.

${card(`<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One listener on the parent catches bubbling child events</text>
  <rect x="150" y="38" width="220" height="34" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e" stroke-width="1.6"/>
  <text x="260" y="60" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">&lt;ul&gt; — the one listener</text>
  <g font-size="9.5" text-anchor="middle">
    <rect x="60" y="116" width="110" height="30" rx="6" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="115" y="135" fill="currentColor">&lt;li&gt; click</text>
    <rect x="205" y="116" width="110" height="30" rx="6" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="260" y="135" fill="currentColor">&lt;li&gt;</text>
    <rect x="350" y="116" width="110" height="30" rx="6" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="405" y="135" fill="currentColor">&lt;li&gt; (added later)</text>
  </g>
  <path d="M 115 116 L 230 74" fill="none" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#ed-a)"/>
  <path d="M 405 116 L 300 74" fill="none" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#ed-a)"/>
  <text x="300" y="100" fill="#f59e0b" font-size="9" text-anchor="middle">bubbles up</text>
  <defs><marker id="ed-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>`)}

**How it works.** Most DOM events *bubble*: a click on a child travels up through its ancestors. So you listen on the parent, then inside the handler inspect <code>event.target</code> (often with <code>target.closest(selector)</code>) to find which child was clicked and act accordingly. This is far cheaper than wiring N listeners, and because the parent persists, dynamically inserted children are handled with **zero** extra code. Caveat: a few events (<code>focus</code>, <code>blur</code>, <code>scroll</code>) don't bubble — use capture/<code>focusin</code> for those.

### Per-element vs delegated
| | One listener per child | Delegation |
| --- | --- | --- |
| Listeners | N | 1 |
| Dynamic children | re-bind needed | works automatically |
| Memory | higher | lower |
| Needs bubbling | n/a | yes |

> **Interview tip:** Mention <code>event.target</code> (what was clicked) vs <code>event.currentTarget</code> (the element the listener is on), and using <code>target.closest("li")</code> to handle clicks even on nested children. Note the non-bubbling events as the limitation.`,
    examples: [
      {
        label: "One delegated listener on the parent",
        runnable: false,
        code: `const list = document.querySelector("#todo-list");

// ONE listener handles clicks from any <li>, current or future
list.addEventListener("click", (e) => {
  const item = e.target.closest("li");   // works even if a child was clicked
  if (!item || !list.contains(item)) return;
  console.log("clicked item:", item.dataset.id);
});

// Adding items later needs NO new listeners:
list.insertAdjacentHTML("beforeend", '<li data-id="99">New</li>');

// target = what was clicked; currentTarget = the <ul> the listener is on`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between client-side and server-side rendering?",
    answer: `**Core concept (TL;DR).** In **client-side rendering (CSR)** the server sends a near-empty HTML shell plus a JS bundle, and the browser builds the page. In **server-side rendering (SSR)** the server generates the full HTML for each request and sends it ready-to-display, then the client "hydrates" it to make it interactive.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Where the HTML is built: browser vs server</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">CSR</text>
  <text x="135" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">empty shell + JS bundle</text>
  <text x="135" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">browser renders</text>
  <text x="135" y="124" fill="#ef4444" font-size="9" text-anchor="middle">slower first paint, weaker SEO</text>
  <text x="135" y="142" fill="#22c55e" font-size="9" text-anchor="middle">cheap server, app-like nav</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">SSR</text>
  <text x="385" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">full HTML per request</text>
  <text x="385" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">then hydrate on client</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">fast first paint, SEO-friendly</text>
  <text x="385" y="142" fill="#ef4444" font-size="9" text-anchor="middle">more server cost</text>
</svg>`)}

**How it works.** CSR gives an app-like experience with cheap static hosting, but the first meaningful paint waits on downloading + running JS, and crawlers see little HTML initially. SSR ships content immediately (better perceived performance and SEO) at the cost of per-request server work; after the HTML arrives, the same components **hydrate** to attach event handlers. In practice modern frameworks (Next.js, Nuxt) blend strategies — SSR or **SSG** (static generation at build time) for the first load, then CSR for subsequent navigation, with streaming/RSC pushing more work back to the server.

### CSR vs SSR
| | CSR | SSR |
| --- | --- | --- |
| HTML built | in the browser | on the server |
| First paint | slower (after JS) | fast (ready HTML) |
| SEO | weaker by default | strong |
| Server load | low | higher |

> **Interview tip:** Add the third option — **SSG** (pre-rendered at build time) — and the concept of **hydration** (attaching JS to server HTML). The senior framing: it's not either/or; frameworks pick per-route, balancing TTFB, interactivity, and SEO.`,
    examples: [
      {
        label: "The shapes of CSR vs SSR",
        runnable: false,
        code: `// CSR: the server sends an almost-empty shell…
//   <body><div id="root"></div><script src="/app.js"></script></body>
// …and the browser builds the UI:
const root = document.getElementById("root");
root.innerHTML = renderApp(); // React/Vue mount here on the client

// SSR: the server returns FULL HTML for the request…
//   const html = renderToString(App);  // runs on the server
//   res.send("<div id=root>" + html + "</div><script src=/app.js>");
// …then the client HYDRATES the existing markup (attaches handlers):
//   hydrateRoot(document.getElementById("root"), App);

// SSG = the same server render, but done once at BUILD time.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between localStorage, sessionStorage, and cookies?",
    answer: `**Core concept (TL;DR).** All three store data in the browser, but differ in **lifetime, capacity, and whether they're sent to the server**. <code>localStorage</code> persists indefinitely (~5–10 MB) and stays on the client. <code>sessionStorage</code> is the same but scoped to a **single tab** and cleared when it closes. **Cookies** are tiny (~4 KB) and are sent to the server with **every** request.

${card(`<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Lifetime · size · sent to server?</text>
  <rect x="18" y="42" width="156" height="114" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="96" y="62" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">localStorage</text>
  <text x="96" y="86" fill="currentColor" font-size="9" text-anchor="middle">persists forever</text>
  <text x="96" y="106" fill="currentColor" font-size="9" text-anchor="middle">~5–10 MB</text>
  <text x="96" y="126" fill="#ef4444" font-size="9" text-anchor="middle">NOT sent to server</text>
  <text x="96" y="146" fill="currentColor" font-size="8.5" text-anchor="middle">client-only state</text>
  <rect x="182" y="42" width="156" height="114" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="260" y="62" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">sessionStorage</text>
  <text x="260" y="86" fill="currentColor" font-size="9" text-anchor="middle">per-tab</text>
  <text x="260" y="106" fill="currentColor" font-size="9" text-anchor="middle">cleared on close</text>
  <text x="260" y="126" fill="#ef4444" font-size="9" text-anchor="middle">NOT sent to server</text>
  <text x="260" y="146" fill="currentColor" font-size="8.5" text-anchor="middle">one-visit state</text>
  <rect x="346" y="42" width="156" height="114" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="424" y="62" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="middle">cookies</text>
  <text x="424" y="86" fill="currentColor" font-size="9" text-anchor="middle">expiry you set</text>
  <text x="424" y="106" fill="currentColor" font-size="9" text-anchor="middle">~4 KB</text>
  <text x="424" y="126" fill="#22c55e" font-size="9" text-anchor="middle">SENT every request</text>
  <text x="424" y="146" fill="currentColor" font-size="8.5" text-anchor="middle">auth / sessions</text>
</svg>`)}

**How it works.** Both Web Storage APIs (<code>localStorage</code>/<code>sessionStorage</code>) are synchronous key→**string** stores scoped to an origin — great for client-only preferences and cached data, but invisible to the server. Cookies are automatically attached to requests for their domain, which is why they back **authentication/sessions**; secure them with <code>HttpOnly</code> (hidden from JS — mitigates XSS theft), <code>Secure</code> (HTTPS only), and <code>SameSite</code> (CSRF defence). Choose cookies when the server needs the value, Web Storage when only the client does.

### Quick comparison
| | localStorage | sessionStorage | cookies |
| --- | --- | --- | --- |
| Lifetime | until cleared | per tab | expiry/max-age |
| Capacity | ~5–10 MB | ~5 MB | ~4 KB |
| Sent to server | no | no | every request |
| Read by JS | yes | yes | unless <code>HttpOnly</code> |

> **Interview tip:** The decisive question is "does the **server** need it?" → cookies (and prefer <code>HttpOnly</code> for auth tokens so JS — and XSS — can't read them). Web Storage holds **strings only**, so you <code>JSON.stringify</code>/<code>parse</code> objects.`,
    examples: [
      {
        label: "Each store's API + cookie flags",
        runnable: false,
        code: `// localStorage — persists across sessions (strings only)
localStorage.setItem("theme", "dark");
console.log(localStorage.getItem("theme"));     // "dark"
localStorage.setItem("user", JSON.stringify({ id: 1 })); // objects → JSON

// sessionStorage — same API, gone when the tab closes
sessionStorage.setItem("wizardStep", "2");

// cookie — small, sent with every request; secure it with flags
document.cookie = "token=abc; Max-Age=3600; Secure; SameSite=Lax";
// (HttpOnly cookies are set by the SERVER and are invisible to JS)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between preventDefault and stopPropagation?",
    answer: `**Core concept (TL;DR).** They solve **different** problems. <code>event.preventDefault()</code> cancels the **browser's default action** for the event (e.g. following a link, submitting a form, checking a box). <code>event.stopPropagation()</code> stops the event from **bubbling further** to ancestor handlers. Neither implies the other.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Cancel the default action vs stop the bubbling</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">preventDefault()</text>
  <text x="135" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">cancels browser behaviour</text>
  <text x="135" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">no form submit / link nav</text>
  <text x="135" y="130" fill="#3b82f6" font-size="9" text-anchor="middle">event STILL bubbles</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">stopPropagation()</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">stops bubbling to ancestors</text>
  <text x="385" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">parent handlers skipped</text>
  <text x="385" y="130" fill="#22c55e" font-size="9" text-anchor="middle">default action STILL runs</text>
</svg>`)}

**How it works.** A click on a checkbox fires an event that (a) bubbles up the DOM and (b) toggles the box (the default action). <code>preventDefault</code> stops (b) but the event keeps bubbling; <code>stopPropagation</code> stops (a) but the box still toggles. Use <code>preventDefault</code> to take over native behaviour (custom form handling, SPA links); use <code>stopPropagation</code> to keep an inner widget's event from triggering outer handlers (e.g. a button inside a clickable card). <code>stopImmediatePropagation</code> additionally blocks **other** handlers bound to the *same* element.

### Which does what
| Method | Effect |
| --- | --- |
| <code>preventDefault()</code> | cancel the default action; bubbling continues |
| <code>stopPropagation()</code> | stop bubbling; default action still happens |
| <code>stopImmediatePropagation()</code> | + block other handlers on the same element |
| <code>return false</code> (jQuery) | both — but not in plain DOM |

> **Interview tip:** State clearly that they're independent and you often want only one. Note that returning <code>false</code> does both *in jQuery handlers* but **not** in vanilla DOM listeners — a common confusion.`,
    examples: [
      {
        label: "Independent: cancel default vs stop bubbling",
        runnable: false,
        code: `// preventDefault — stop the page reload, handle the form yourself
form.addEventListener("submit", (e) => {
  e.preventDefault();          // browser won't navigate/reload
  submitViaFetch(new FormData(form));
});

// stopPropagation — keep the button click from reaching the card handler
card.addEventListener("click", () => console.log("card clicked"));
buttonInsideCard.addEventListener("click", (e) => {
  e.stopPropagation();         // "card clicked" will NOT log
  console.log("button only");
  // e.stopImmediatePropagation() would also block other listeners here
});

// They're independent: preventDefault does NOT stop bubbling, and vice versa.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Why must you pass the same function reference to removeEventListener?",
    answer: `**Core concept (TL;DR).** <code>removeEventListener</code> finds the listener to remove by **identity** — it must receive the *exact same function reference* (and matching capture/options) that was passed to <code>addEventListener</code>. An inline arrow, an anonymous function, or a fresh <code>.bind()</code> creates a **new** reference each time, so the removal silently matches nothing.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Removal matches by function identity, not by code</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="62" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">inline / bind — WRONG</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">add(..., () =&gt; f())</text>
  <text x="135" y="106" fill="currentColor" font-size="9" text-anchor="middle">remove(..., () =&gt; f())</text>
  <text x="135" y="130" fill="#ef4444" font-size="9" text-anchor="middle">different objects → no-op</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">named ref — RIGHT</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">const h = () =&gt; f()</text>
  <text x="385" y="106" fill="currentColor" font-size="9" text-anchor="middle">add(..., h); remove(..., h)</text>
  <text x="385" y="130" fill="#22c55e" font-size="9" text-anchor="middle">same object → removed ✓</text>
</svg>`)}

**How it works.** The browser stores listeners as <code>(type, function, options)</code> tuples and removes one only on an exact identity match. Two arrow functions with identical bodies are *different* objects, so passing a new one to <code>removeEventListener</code> does nothing — a classic source of **leaks** and duplicate handlers. The fix is to keep the listener in a variable (or class field) and pass that same reference to both calls. <code>.bind()</code> and a method reference share this trap: each <code>.bind()</code> returns a brand-new function. The modern shortcut for "run once" is the <code>{ once: true }</code> option, which auto-removes after firing; <code>AbortController</code> can remove many at once.

### Reference identity
| Listener form | Removable later? |
| --- | --- |
| <code>const h = () => {}</code> | yes — reuse <code>h</code> |
| inline <code>() => {}</code> | no — new each call |
| <code>fn.bind(obj)</code> inline | no — new each call |
| <code>{ once: true }</code> | auto-removes itself |

> **Interview tip:** Tie it to memory leaks (orphaned listeners on long-lived elements) and offer the modern tools: <code>{ once: true }</code> for one-shot, and an <code>AbortController</code>'s <code>signal</code> passed to many <code>addEventListener</code> calls so <code>abort()</code> removes them all at once.`,
    examples: [
      {
        label: "Why inline removal fails, and the fixes",
        runnable: false,
        code: `// WRONG — a brand-new function each time, so removal does nothing
el.addEventListener("click", () => doThing());
el.removeEventListener("click", () => doThing());  // no-op: different reference

// RIGHT — keep ONE reference and reuse it
const handler = () => doThing();
el.addEventListener("click", handler);
el.removeEventListener("click", handler);          // removed ✓

// .bind() also returns a NEW function — store it if you must remove it
const bound = obj.method.bind(obj);
el.addEventListener("click", bound);
el.removeEventListener("click", bound);

// modern alternatives
el.addEventListener("click", onceFn, { once: true });   // auto-removes
const ctrl = new AbortController();
el.addEventListener("click", a, { signal: ctrl.signal });
el.addEventListener("scroll", b, { signal: ctrl.signal });
ctrl.abort();                                           // removes BOTH`,
      },
    ],
  },
];

// ── patch in place ──────────────────────────────────────────────────────────
const dir = join(process.cwd(), "prisma", "data");
const files = readdirSync(dir).filter((f) => /^js-augments.*\.json$/.test(f));
const loaded = files.map((f) => ({
  f,
  arr: JSON.parse(readFileSync(join(dir, f), "utf8")) as any[],
  dirty: false,
}));

const notFound: string[] = [];
for (const rw of REWRITES) {
  const hit = loaded.find((d) => d.arr.some((x) => x.title === rw.title));
  if (!hit) {
    notFound.push(rw.title);
    continue;
  }
  const item = hit.arr.find((x) => x.title === rw.title);
  item.answer = rw.answer;
  item.examples = rw.examples;
  hit.dirty = true;
}

for (const d of loaded) {
  if (d.dirty) writeFileSync(join(dir, d.f), JSON.stringify(d.arr, null, 2));
}

console.log(
  `Patched ${REWRITES.length - notFound.length}/${REWRITES.length} answers across`,
  loaded.filter((d) => d.dirty).map((d) => d.f).join(", "),
);
if (notFound.length) console.log("NOT FOUND (title mismatch):", notFound);
