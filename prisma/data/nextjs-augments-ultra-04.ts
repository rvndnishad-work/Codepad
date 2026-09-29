/**
 * Next.js ULTRA — batch 04: data fetching and the caching layers (fetch in Server Components, the four caches, fetch options,
 * memoization, Full Route Cache, Router/Client Cache, Next 15 caching defaults, unstable_cache vs React cache).
 * Generated from markdown sources by a build script; Verified blocks are real output from a Next.js 16.3.4 lab (next build /
 * next start, a hit-counting test API, and a real browser session for the client cache).
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you fetch data in Next.js Server Components?",
    seoDescription: "Server Components await data directly; identical fetches are memoized per render. In the lab, sequential awaits took 1236 ms and Promise.all 616 ms.",
    description: `**Question presented to candidate:**
"You have a product page that needs the product, its reviews and the current user. Show me how you would load that data in the App Router, and tell me what you would watch out for."

**What a strong answer should cover:**
- A Server Component can be \`async\` and simply \`await\` data: \`fetch\`, an ORM, a file read, an SDK call.
- No \`useEffect\`, no API route in between, and no loading state for the initial HTML.
- Independent requests should run in parallel with \`Promise.all\`, or be split into separate components under Suspense so they stream.
- Identical \`fetch\` GET calls in one render are memoized, and \`React.cache\` does the same for non-fetch functions, so you can load data where it is used.
- Whether the result is cached across requests is a separate decision (fetch options, 'use cache'), and request-time data makes the route dynamic.

**Clarifying questions expected:**
- "Do the three requests depend on each other?" — only dependent ones should be sequential.
- "Is any of this data per user?" — it decides between caching and rendering per request.

**Code / implementation expected:** Yes — an async Server Component with parallel requests and a streamed part.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Fetching in a Client Component is ordering food by phone after you get home: the table is set, everyone waits, then the delivery arrives. Fetching in a Server Component is cooking in the restaurant kitchen, next to the fridge. The only question left is whether the cook boils the pasta and then starts the sauce (sequential), or does both at once (parallel), and whether the salad goes out first while the main course is still cooking (streaming).

## 2. The Core Idea

📌 **Interview term: Async Server Component** — a component declared as an async function that awaits data during server rendering; it runs only on the server.

📌 **Interview term: Waterfall** — a chain of requests where each starts only after the previous one finished, adding their latencies together.

📌 **Interview term: Memoization** — reusing the result of an identical call within one render, so the same fetch in several components runs once.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Two independent requests of 600 ms each. sequential awaits, Promise.all">
  <defs>
    <marker id="nx01lve3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two independent requests of 600 ms each</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">sequential awaits</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">await user, then await orders</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">latencies add up</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">1236 to 1350 ms in the lab</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx01lve3-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">Promise.all</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">both requests start together</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">the slowest one decides</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">616 to 621 ms in the lab</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">start independent requests before awaiting them, or give each its own Suspense boundary</text>
  </g>
</svg>

Server-side fetching removes the browser round trip, but it does not remove waterfalls. Awaiting one request before starting the next is the most common self-inflicted delay in App Router code.

## 3. The three shapes of loading

| Shape | Code | When to use |
| :--- | :--- | :--- |
| Sequential | \`const a = await x(); const b = await y(a.id);\` | Only when \`y\` needs the result of \`x\` |
| Parallel | \`const [a, b] = await Promise.all([x(), y()])\` | Independent data needed before anything renders |
| Streamed | Each part is its own async component inside \`Suspense\` | Slow data that should not hold up the rest of the page |

## 4. Load data where you use it

Because identical \`fetch\` calls are memoized for the duration of one render and \`React.cache\` does the same for other functions, you do not have to fetch once at the top and pass data down through five levels. Each component can ask for what it needs; the lab below shows three identical fetches producing one real request. Caching across requests is a separate topic: see [fetch caching](/interview-question/how-does-fetch-caching-work-in-the-next-js-app-router-force-cache-no-store-reval) and [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor).

## 5. Verified — Timings and Request Counts (Next.js 16.3.4, next start)

Each call to the test API waits 600 ms. The page times its own data loading:

\`\`\`
each API call waits 600 ms; two calls per request, timed inside the page
sequential awaits  : 1350ms, 1236ms
Promise.all        : 621ms, 616ms
\`\`\`

One render where the page and two child components call the same \`fetch\` (with \`cache: 'no-store'\`, so nothing is cached between requests), plus one call to a different URL:

\`\`\`
GET /data/memo: the page and components A and B each call fetch(API + '/memo', { cache: 'no-store' }); C calls '/memo?v=2'
rendered: page saw hit=1 A saw hit=1 B saw hit=1 C (different URL) saw hit=1
real API calls for this one request: /memo 1, /memo?v=2 1
\`\`\`

## 6. Common Pitfalls

- **Accidental waterfalls.** Two independent awaits in a row doubled the time in the lab. Start both, then await.
- **Fetching your own Route Handler from a Server Component.** It adds an HTTP hop to your own server; call the underlying function directly.
- **Fetching everything in the page and prop-drilling it.** Memoization makes it cheap to fetch in the component that needs the data.
- **Assuming fetch results are cached across requests.** In Next.js 15 and 16 they are not, unless you opt in; a static route only looks cached because it was rendered at build time.
- **Blocking the whole page on the slowest request.** Put slow, non-essential parts behind Suspense so the rest streams first.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Make the Server Component <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> the data directly with fetch, an ORM or any server SDK.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Identical fetches are memoized for one render, so each component can load its own data without duplicate requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Independent requests belong in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code>: in the lab two 600 ms calls took about 1240 ms in sequence and 616 ms in parallel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Caching across requests is opt-in (fetch options or 'use cache'), and request-time data makes the route dynamic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Avoid waterfalls and self-fetches; wrap slow parts in Suspense so the page streams.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not call my own <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">/api</code> route from a Server Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The component already runs on the server, so calling your own HTTP endpoint adds a network hop and serialization for nothing. Import the function the route uses and call it directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you fetch the same data in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">generateMetadata</code> and the page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Just call it in both. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> with the same URL and options is memoized across <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateMetadata</code> and the page within one request; for an ORM call, wrap the function in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.cache</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stream slow data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move it into its own async component and wrap that in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense fallback&gt;</code>. The rest of the page is sent first and the slow part arrives later in the same response.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fetch</code> in a Server Component send cookies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is a server-to-server request; forward the headers or tokens you need explicitly, and remember that reading cookies makes the route dynamic.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Async Server Component** | Component that awaits data on the server |
| **Waterfall** | Requests chained one after another |
| **Promise.all** | Starts several requests at once, waits for all |
| **Memoization** | One real call for identical calls in a render |

---
**Conclusion:** Fetching in a Server Component is just awaiting data where it is used. The two things to get right are parallelism (the lab showed a sequential pair costing twice as long) and the separate decision about caching across requests. Memoization means you can fetch in the component that needs the data without paying for duplicates.`,
    examples: [
      {
        label: "Parallel requests plus a streamed section",
        tech: "tsx",
        runnable: false,
        code: `// app/product/[id]/page.tsx
import { Suspense } from "react";
import { getProduct, getUser, getReviews } from "@/lib/data";

async function Reviews({ id }: { id: string }) {
  const reviews = await getReviews(id);            // slow: streamed later
  return <ul>{reviews.map((r) => <li key={r.id}>{r.text}</li>)}</ul>;
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, user] = await Promise.all([getProduct(id), getUser()]); // start both, then wait
  return (
    <main>
      <h1>{product.name}</h1>
      <p>Hi {user.name}</p>
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Reviews id={id} />
      </Suspense>
    </main>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the caching layers in Next.js (Request Memoization, Data Cache, Full Route Cache, Router Cache)?",
    seoDescription: "The four classic Next.js caches, each measured on 16.3.4, and the names the current docs use: memoization, fetch cache, prerender, Client Cache.",
    description: `**Question presented to candidate:**
"Next.js has several caches that interact. Name them, tell me where each lives and how long it lasts, and how you invalidate each one."

**What a strong answer should cover:**
- Request Memoization: identical fetch GETs within one server render run once; lives for one request.
- Data Cache: fetch results opted in with \`force-cache\` or \`revalidate\`, persisted across requests and deployments until revalidated.
- Full Route Cache: the HTML and RSC payload of static routes, produced at build time or revalidation.
- Router Cache (now called the Client Cache): RSC payloads kept in the browser memory for back and forward navigation and prefetched routes.
- Invalidation: \`revalidatePath\`, \`revalidateTag\`, time-based \`revalidate\`, and \`router.refresh()\` for the client side; Next.js 16 docs label this four-cache model the "previous model", superseded by Cache Components.

**Clarifying questions expected:**
- "Is Cache Components enabled?" — with it, caching is opt-in with 'use cache' and the old layer names mostly disappear.
- "Where is the stale data showing up: first load or client navigation?" — it points to a different layer.

**Code / implementation expected:** Optional — a fetch that touches each layer, and the calls that clear them.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Imagine a busy café. Memoization is the barista remembering that three people at the same table ordered the same flat white and making it once. The Data Cache is the batch of cold brew made in the morning and poured all day until someone decides it is stale. The Full Route Cache is the pre-packed sandwich in the fridge: ready before you arrive. The Router Cache is the tray you are already carrying back to your seat, so going back to it costs nothing. Four different shelves, four different expiry rules.

## 2. The Core Idea

📌 **Interview term: Request Memoization** — per-render deduplication of identical fetch GET requests; the current docs simply call it memoization.

📌 **Interview term: Data Cache** — a persistent server cache for fetch results that opt in with force-cache or a revalidate time.

📌 **Interview term: Full Route Cache** — stored HTML and RSC payload for routes rendered at build time or revalidation.

📌 **Interview term: Client Cache** — the browser in-memory cache of RSC payloads for visited and prefetched routes, previously called the Router Cache.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="Four caches, from the shortest-lived to the longest (previous model). Request Memoization, Router / Client Cache, Data Cache, Full Route Cache">
  <defs>
    <marker id="nx02yh3p-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Four caches, from the shortest-lived to the longest (previous model)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">Request Memoization</text>
    <text class="d-sub" x="262" y="72">one render: identical fetches run once</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">Router / Client Cache</text>
    <text class="d-sub" x="262" y="128">browser memory: back, forward, prefetched routes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="70" y="185">Data Cache</text>
    <text class="d-sub" x="262" y="184">server: fetch results that opted in, across requests</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text d-accent" x="70" y="241">Full Route Cache</text>
    <text class="d-sub" x="262" y="240">server: prerendered HTML and RSC payload of static routes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">with cacheComponents on, the use cache directive and cacheLife replace most of these rules</text>
  </g>
</svg>

Most caching bugs come from invalidating the wrong layer. A revalidateTag clears data on the server, but a route that is still in the Full Route Cache or in a browser that never navigates away keeps showing the old result until it is regenerated or refreshed.

## 3. The layers side by side

| Layer | Where | Lifetime | Opt-in or default | How to clear |
| :--- | :--- | :--- | :--- | :--- |
| Request Memoization | Server memory | One render | Automatic for fetch GET | Nothing to clear |
| Data Cache | Server (persistent) | Until revalidated | Opt in: \`force-cache\`, \`revalidate\` | \`revalidateTag\`, \`revalidatePath\`, time |
| Full Route Cache | Server (build output) | Until revalidated or redeploy | Automatic for static routes | \`revalidatePath\`, time, redeploy |
| Router / Client Cache | Browser memory | Session; dynamic pages 0 s by default | Automatic | \`router.refresh()\`, revalidation from a Server Action, reload |

## 4. How the 16.3 docs name them

The 16.3 docs file this four-layer model under "Caching (Previous Model)", for projects not using Cache Components. The glossary keeps "Memoization" and "Client Cache"; "Data Cache" and "Full Route Cache" are not glossary terms any more, because with Cache Components you decide what is cached per function or component with 'use cache' and \`cacheLife\`. Interviewers still use the old names, so know both. Details for each layer: [memoization](/interview-question/what-is-request-memoization-in-next-js), [fetch caching](/interview-question/how-does-fetch-caching-work-in-the-next-js-app-router-force-cache-no-store-reval), [Full Route Cache](/interview-question/what-is-the-full-route-cache-in-next-js), [Router Cache](/interview-question/what-is-the-router-cache-in-next-js-and-what-are-its-implications).

## 5. Verified — Each Layer Observed (Next.js 16.3.4, without Cache Components)

A test API counts how often it is really called. Memoization within one render:

\`\`\`
GET /data/memo: the page and components A and B each call fetch(API + '/memo', { cache: 'no-store' }); C calls '/memo?v=2'
rendered: page saw hit=1 A saw hit=1 B saw hit=1 C (different URL) saw hit=1
real API calls for this one request: /memo 1, /memo?v=2 1
\`\`\`

Data Cache and Full Route Cache, after \`next build\`:

\`\`\`
each route requested 3 times after next build; the API counts how often it was really called
/data/plain     build fetches 1   API calls for 3 requests: 0   page showed hit=1, hit=1, hit=1   <- fetch(url) with no options, route has no request-time API
/data/nostore   build fetches 0   API calls for 3 requests: 3   page showed hit=1, hit=2, hit=3   <- fetch(url, { cache: 'no-store' })
/data/force     build fetches 0   API calls for 3 requests: 1   page showed hit=1, hit=1, hit=1   <- fetch(url, { cache: 'force-cache' }) in a route that reads headers()
\`\`\`

\`/data/force\` renders per request (it reads \`headers()\`), yet the API was called once for three requests: that is the Data Cache. \`/data/plain\` was never called after the build: that is the Full Route Cache serving the prerendered page.

The Client Cache, in a real browser:

\`\`\`
real browser, next start, /nav/a and /nav/b are dynamic (read headers(), print their render time), /nav/s is static
step                   page shown                                   network requests for route data
load /nav/a            NAV-A rendered=2026-09-23T05:52:19.822Z      (full page load)
click "to b"           NAV-B rendered=2026-09-23T05:52:32.969Z      /nav/b?_rsc=zAIk2II6EJXaw_P4
click "to a"           NAV-A rendered=2026-09-23T05:52:34.480Z      /nav/a?_rsc=wmTtw3Ou8TCDXJI6   (new render, not the cached one)
browser Back           NAV-B rendered=2026-09-23T05:52:32.969Z      none   (same timestamp: reused from the client cache)
click "to s" (static)  NAV-S static                                 none   (already prefetched)
click "to a"           NAV-A rendered=2026-09-23T05:52:39.002Z      /nav/a?_rsc=D626qbLEPRq5MRPO
click "to s" again     NAV-S static                                 none
\`\`\`

## 6. Common Pitfalls

- **Revalidating data but not the route.** Without \`revalidatePath\` or a time-based revalidate, a static route keeps serving the HTML it was built with.
- **Blaming the server for stale client navigation.** Back and forward navigation reuses the Client Cache; after a mutation, revalidate in the Server Action or call \`router.refresh()\`.
- **Expecting memoization across requests.** It lasts for one render only; the lab count reset on every request.
- **Assuming fetch results are cached by default.** Since Next.js 15 they are not; only \`force-cache\` or \`revalidate\` put them in the Data Cache.
- **Mixing the two models.** With \`cacheComponents: true\` the rules are 'use cache' and \`cacheLife\`; segment config like \`revalidate\` is rejected by the build.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">There are four classic layers: Request Memoization, the Data Cache, the Full Route Cache, and the Router Cache (now called the Client Cache).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Memoization lasts one render, the Data Cache and Full Route Cache persist on the server, and the Client Cache lives in browser memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Each is cleared differently: revalidateTag and revalidatePath on the server, router.refresh() or a Server Action revalidation for the client.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The 16.3 docs call this the previous model; with Cache Components you opt parts in with 'use cache' and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Most stale-data bugs come from clearing the wrong layer, so first ask whether the staleness is on first load or on client navigation.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A user updates their profile and still sees the old name after navigating back. Which cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Client Cache: back and forward navigation reuses the stored payload without a request (the lab back-navigation showed the old render time). Revalidate in the Server Action that did the update, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.refresh()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">revalidatePath</code> clear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The cached data and the prerendered output for that path on the server, and the next navigation fetches fresh data. Under the hood it uses implicit tags like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_N_T_/data/plain</code> that the build writes into each route file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is memoization the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">React.cache</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same idea, different scope: Next.js memoizes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> automatically; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.cache</code> lets you memoize any function, also per request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaces the Data Cache under Cache Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The 'use cache' directive on a function or component, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> for lifetime and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheTag</code> for invalidation. Nothing is cached unless marked.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Request Memoization** | One render: identical fetches run once |
| **Data Cache** | Opted-in fetch results kept across requests |
| **Full Route Cache** | Stored output of static routes |
| **Client Cache** | Browser memory of route payloads (Router Cache) |

---
**Conclusion:** The four classic caches are memoization for one render, the Data Cache and Full Route Cache on the server, and the Client Cache in the browser. The lab showed each one working independently, which is exactly why invalidating one does not clear the others. In Next.js 16 the docs treat this as the previous model; with Cache Components you mark what is cached instead of reasoning about four implicit layers.`,
    examples: [
      {
        label: "One fetch touching each layer, and what clears it",
        tech: "tsx",
        runnable: false,
        code: `// app/products/page.tsx  (static route -> Full Route Cache)
export default async function Products() {
  // Data Cache: persisted until the tag is revalidated
  const res = await fetch("https://api.example.com/products", {
    cache: "force-cache",
    next: { tags: ["products"] },
  });
  const products = await res.json();
  return <ul>{products.map((p: { id: string; name: string }) => <li key={p.id}>{p.name}</li>)}</ul>;
}

// app/products/actions.ts
"use server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function productChanged() {
  revalidateTag("products", "max");   // Data Cache entries tagged "products"
  revalidatePath("/products");        // the prerendered route and client payloads
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does fetch caching work in the Next.js App Router (force-cache, no-store, revalidate)?",
    seoDescription: "fetch is not cached by default; force-cache and next.revalidate opt in, no-store makes the route dynamic. Real API call counts from Next 16.3.4.",
    description: `**Question presented to candidate:**
"Walk me through the options you can pass to fetch in a Server Component and what each does to caching and to the route. What is the default today?"

**What a strong answer should cover:**
- By default a fetch result is not stored across requests (since Next.js 15), but a fetch reached during a static render runs at build time and its result is baked into the page.
- \`cache: 'force-cache'\` stores the result in the Data Cache and reuses it across requests, even in a dynamic route.
- \`cache: 'no-store'\` fetches on every request and makes the route dynamic.
- \`next: { revalidate: n }\` stores the result for n seconds, then serves the stale value while refetching in the background.
- \`next: { tags: [...] }\` labels the entry so \`revalidateTag\` can clear it on demand; these options belong to the previous model, while Cache Components uses 'use cache'.

**Clarifying questions expected:**
- "How fresh does this data have to be?" — seconds, minutes, or exact.
- "Is Cache Components on?" — then fetch options give way to 'use cache' and cacheLife.

**Code / implementation expected:** Yes — the four fetch styles and what the build makes of them.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Think of fetch options as instructions for the library assistant. "No-store" means: fetch the book from the archive every single time someone asks. "Force-cache" means: keep a copy at the desk and hand it out until told otherwise. "Revalidate 60" means: keep the copy, but after a minute, hand out the old copy one more time while you quietly fetch a newer one. And with no instruction at all, the assistant fetches it once while preparing the display, and the display stays as it is.

## 2. The Core Idea

📌 **Interview term: force-cache** — a fetch option that stores the response in the Data Cache and reuses it across requests until it is revalidated.

📌 **Interview term: no-store** — a fetch option that skips the cache and fetches on every request; it also makes the route render dynamically.

📌 **Interview term: Stale-while-revalidate** — serving the stored value after it expires and refreshing it in the background, so the next request sees the new value.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="What each fetch style did in the lab build. fetch(url), no-store, force-cache, revalidate: 5">
  <defs>
    <marker id="nx03oisn-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What each fetch style did in the lab build</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">fetch(url)</text>
    <text class="d-sub" x="262" y="72">ran once at build, 0 calls for 3 requests: static page</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">no-store</text>
    <text class="d-sub" x="262" y="128">3 calls for 3 requests, route marked dynamic (ƒ)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="70" y="185">force-cache</text>
    <text class="d-sub" x="262" y="184">1 call for 3 requests, even in a dynamic route</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text d-accent" x="70" y="241">revalidate: 5</text>
    <text class="d-sub" x="262" y="240">served stale, refreshed in the background</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">only force-cache and revalidate store data across requests; tags make an entry clearable on demand</text>
  </g>
</svg>

The surprising row is the first one: an uncached fetch still produced a page that never calls the API again, because the whole route was prerendered. Caching the data and caching the page are two different things.

## 3. The options

| Option | Stored across requests? | Effect on the route | Typical use |
| :--- | :--- | :--- | :--- |
| none (default) | No | Static if nothing else is dynamic; the build-time result is baked in | Data read during a static render |
| \`cache: 'no-store'\` | No | Dynamic | Per-request data, prices, stock |
| \`cache: 'force-cache'\` | Yes, until revalidated | Unchanged | Reference data that rarely changes |
| \`next: { revalidate: 60 }\` | Yes, 60 s, then background refresh | ISR if the route is static | News, catalogues |
| \`next: { tags: ['posts'] }\` | Adds a label | Unchanged | On-demand clearing with \`revalidateTag\` |

\`revalidate: 0\` behaves like \`no-store\`, and \`revalidate: false\` like \`force-cache\`. If two fetches in a route disagree, the lowest revalidate time wins for the route.

## 4. Beyond fetch

The options only apply to \`fetch\`. For ORM calls and SDKs you used \`unstable_cache\` in the previous model; in Next.js 16 its docs say it "has been replaced by use cache". See [unstable_cache vs cache](/interview-question/unstable-cache-vs-cache-react-which-dedupes-what) and [on-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag).

## 5. Verified — API Calls per Fetch Style (Next.js 16.3.4, next start)

A test API counts every real call. Each route was requested three times after \`next build\`:

\`\`\`
each route requested 3 times after next build; the API counts how often it was really called
/data/plain     build fetches 1   API calls for 3 requests: 0   page showed hit=1, hit=1, hit=1   <- fetch(url) with no options, route has no request-time API
/data/nostore   build fetches 0   API calls for 3 requests: 3   page showed hit=1, hit=2, hit=3   <- fetch(url, { cache: 'no-store' })
/data/force     build fetches 0   API calls for 3 requests: 1   page showed hit=1, hit=1, hit=1   <- fetch(url, { cache: 'force-cache' }) in a route that reads headers()
\`\`\`

The route symbols in the build output (\`no-store\` alone turned \`/data/nostore\` dynamic):

\`\`\`
├ ƒ /data/force
├ ƒ /data/nostore
├ ○ /data/plain
├ ○ /data/reval                 5s      1y
\`\`\`

\`revalidate: 5\` over time, showing stale-while-revalidate:

\`\`\`
GET /data/reval  (fetch with next: { revalidate: 5 }, route shown as 5s in the build table)
t=   0s  request 1                          page shows hit=1  x-nextjs-cache: STALE  API reval calls so far: 1
t= 6.1s  request 2 (after 6 s: now stale)   page shows hit=2  x-nextjs-cache: STALE  API reval calls so far: 2
t= 7.6s  request 3 (after the background run) page shows hit=3  x-nextjs-cache: HIT  API reval calls so far: 3
\`\`\`

Each request after expiry received the previous version (\`STALE\`) and triggered one background refetch; the request after that refresh got the new value (\`HIT\`).

## 6. Common Pitfalls

- **Thinking the default caches data.** Since Next.js 15 it does not; a static page only looks cached because it was rendered at build time.
- **Using no-store "to be safe".** It forces the whole route to render per request. Use it only for data that must be exact.
- **Expecting revalidate to refresh on a timer.** Nothing happens until a request arrives after expiry, and that request still gets the old value.
- **Forgetting tags.** Without \`next: { tags }\` you can only clear the entry by path or time.
- **Applying fetch options to an ORM.** They only affect \`fetch\`; other data sources need \`React.cache\` for per-request dedupe and 'use cache' (or \`unstable_cache\` in older code) for persistence.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Without options a fetch is not stored across requests, but in a static route it runs once at build and the result is baked into the page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-store</code> fetches every time and makes the route dynamic; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">force-cache</code> stores the result until revalidated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next: { revalidate: n }</code> serves the stored value and refreshes it in the background after n seconds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next: { tags }</code> labels an entry so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> can clear it on demand.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">These are the previous-model options; with Cache Components you use 'use cache', <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheTag</code> instead.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the lab's plain fetch never call the API again after the build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The route had no request-time API, so it was prerendered at build time with the fetched data inside. Requests are served from that stored page, not from a cached fetch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is force-cache different in a dynamic route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The page still renders on each request, but the fetch result comes from the Data Cache. In the lab, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/data/force</code> rendered three times with one real API call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when two fetches in one route have different revalidate times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The route uses the lowest one, while each fetch keeps its own data lifetime.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does fetch caching apply to POST requests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only GET requests are cached and memoized; mutations should go through Server Actions or Route Handlers.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **force-cache** | Store and reuse until revalidated |
| **no-store** | Fetch every time, route becomes dynamic |
| **revalidate** | Lifetime in seconds, then background refresh |
| **tags** | Labels for on-demand invalidation |

---
**Conclusion:** Fetch caching is opt-in: force-cache and revalidate store results, no-store refuses them and makes the route dynamic, and the default stores nothing yet still ends up baked into a static page. The lab counted real API calls for each style, which is the fastest way to tell data caching and page prerendering apart.`,
    examples: [
      {
        label: "The fetch styles in one file",
        tech: "tsx",
        runnable: false,
        code: `const API = "https://api.example.com";

export default async function Page() {
  const settings = await fetch(\`\${API}/settings\`, { cache: "force-cache" });  // stored until revalidated
  const headlines = await fetch(\`\${API}/news\`, { next: { revalidate: 60 } });  // refreshed after 60 s
  const posts = await fetch(\`\${API}/posts\`, { next: { tags: ["posts"] } });     // clearable with revalidateTag
  const stock = await fetch(\`\${API}/stock\`, { cache: "no-store" });             // every request, route is dynamic
  // ...
  return null;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is request memoization in Next.js?",
    seoDescription: "Identical fetch GETs in one render run once, even with no-store; React.cache does the same for other functions. Both reset on every request.",
    description: `**Question presented to candidate:**
"Three components on the same page each call fetch for the current user. How many network requests happen, and how would you get the same behaviour for a database query?"

**What a strong answer should cover:**
- Next.js memoizes \`fetch\` GET requests with the same URL and options for the duration of one server render.
- It applies across layouts, pages, Server Components, \`generateMetadata\` and \`generateStaticParams\`, but not in Route Handlers.
- It is independent of the Data Cache: even \`no-store\` requests are deduplicated within a render.
- For non-fetch work (ORM, SDK) wrap the function in React \`cache()\` to get the same per-request deduplication.
- It resets for every request, so it is safe for per-user data.

**Clarifying questions expected:**
- "Is it a fetch or a database call?" — only fetch is memoized automatically.
- "Do the calls use exactly the same URL and options?" — any difference is a separate request.

**Code / implementation expected:** Yes — a React.cache-wrapped data function used in several components.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A teacher asks three pupils in the same class to find today's date. Without memoization, all three walk to the office. With it, the first one goes, and the answer is written on the board for the other two. Tomorrow is a new lesson, the board is wiped, and the first pupil to ask walks to the office again.

## 2. The Core Idea

📌 **Interview term: Memoization** — returning the stored result of an identical call instead of running it again; in Next.js it lasts for one render pass.

📌 **Interview term: React cache()** — a React function that wraps any function so calls with the same arguments during one server request share a single result.

📌 **Interview term: Render pass** — the rendering of one request on the server; memoized results do not survive beyond it.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Three identical fetches, one real request. page, component A, component B">
  <defs>
    <marker id="nx0421zy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three identical fetches, one real request</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">page</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">fetch /memo</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">first call goes out</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx0421zy-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 201.66666666666666 107 L 239.66666666666666 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="242.66666666666666" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="258.66666666666663" cy="48" r="12"/>
    <text class="d-text d-accent" x="258.66666666666663" y="53" text-anchor="middle">2</text>
    <text class="d-text" x="330" y="82" text-anchor="middle">component A</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">fetch /memo</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">same URL: reused</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx0421zy-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">component B</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">fetch /memo</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">same URL: reused</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lab: 1 API call for the three identical no-store fetches, 1 more for a different URL</text>
  </g>
</svg>

Memoization is about one render, not about caching. It is what lets you fetch data in the component that needs it instead of threading it through props.

## 3. What counts as identical

| Case | Memoized? |
| :--- | :--- |
| Same URL, same options, GET | Yes, within one render |
| Same URL, different query string | No, a different request |
| Different options (for example a different header) | No |
| POST or other methods | No |
| Inside a Route Handler | No: not part of the React component tree |
| Next request | No: memoization resets per request |

## 4. Doing the same for other functions

For an ORM query, wrap the loader once at module level with \`cache\` from React and call it wherever you need it. The docs note that \`React.cache\` "is scoped to the current request only", so it cannot leak one user data to another. See also [fetching data in Server Components](/interview-question/how-do-you-fetch-data-in-next-js-server-components).

## 5. Verified — Counting Real Calls (Next.js 16.3.4, next start)

The page and components A and B call the same fetch with \`cache: 'no-store'\`; C adds a query string:

\`\`\`
GET /data/memo: the page and components A and B each call fetch(API + '/memo', { cache: 'no-store' }); C calls '/memo?v=2'
rendered: page saw hit=1 A saw hit=1 B saw hit=1 C (different URL) saw hit=1
real API calls for this one request: /memo 1, /memo?v=2 1
\`\`\`

The same idea for non-fetch work with React \`cache()\`, over two requests:

\`\`\`
GET /data/react-cache twice; each request calls getUserPlain('1') 3x and cache(getUser)('1') 3x plus ('2') 1x
request 1: plain-calls-this-request=3 cached-calls-this-request=2 cached-total=2
request 2: plain-calls-this-request=3 cached-calls-this-request=2 cached-total=4
\`\`\`

Inside one request, three calls with the same argument ran once (and a different argument ran once more). The next request started from zero, confirming the per-request scope.

## 6. Common Pitfalls

- **Expecting memoization across requests.** It resets for every request; persistence is the Data Cache or 'use cache'.
- **Wrapping with cache() inside a component.** Create the cached function once at module level; a new wrapper per render shares nothing.
- **Relying on it in Route Handlers.** They are not part of the component tree, so there is no memoization.
- **Passing objects as arguments to a cached function.** \`React.cache\` compares arguments by identity, so a new object each call is a cache miss; pass primitives such as ids.
- **Varying options by accident.** A different header or option makes it a different request.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Next.js memoizes identical fetch GET requests during one server render, so they run once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">It works across layouts, pages, components and generateMetadata, but not in Route Handlers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">It is separate from the Data Cache: in the lab even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-store</code> fetches were deduplicated within the render.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">For database or SDK calls, wrap the function in React <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> to get the same per-request behaviour.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">It resets on every request, so it never shares data between users; persistence is a different mechanism.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does memoization make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">no-store</code> pointless?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-store</code> controls caching across requests; memoization only merges duplicates inside one render. Each new request still makes one real call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">React.cache</code> not share between users?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its store is created per server request and discarded afterwards. The lab counter showed two executions per request, every request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you preload data with it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call the cached function early without awaiting it (for example in a layout), then await it later in a child. The second call reuses the in-flight promise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not memoize in Route Handlers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Route Handler is a plain request handler, not a React render, so there is no render pass to scope the memo to.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Memoization** | Reuse of identical calls within one render |
| **React cache()** | Per-request memoization for any function |
| **Render pass** | The rendering of one request |
| **In-flight promise** | A started call that later callers share |

---
**Conclusion:** Request memoization is Next.js running identical fetch GETs once per render, and React cache() extends that to any function. It exists so components can load their own data without duplicate requests, and because it resets per request it is safe for personal data. It is not a cache in the persistence sense; that job belongs to the Data Cache or 'use cache'.`,
    examples: [
      {
        label: "A per-request cached loader used in several places",
        tech: "tsx",
        runnable: false,
        code: `// lib/user.ts
import { cache } from "react";
import "server-only";
import { db } from "@/lib/db";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } }); // runs once per request per id
});

// app/layout.tsx and app/page.tsx and app/Header.tsx can all do:
//   const user = await getUser(session.userId);
// -> one database query per request`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the Full Route Cache in Next.js?",
    seoDescription: "The Full Route Cache stores the HTML and RSC payload of static routes at build time. What the 16.3.4 build wrote, and how to clear it.",
    description: `**Question presented to candidate:**
"After a deploy, a page still shows yesterday's content even though the API has new data. Explain the Full Route Cache and how you would fix this."

**What a strong answer should cover:**
- The Full Route Cache is the stored render output (HTML and RSC payload) of routes that are static at build time.
- Requests to those routes are served from the stored output without rendering or fetching.
- Dynamic routes, those using request-time APIs or \`no-store\`, are not stored.
- It is invalidated by redeploying, time-based \`revalidate\` (ISR), or \`revalidatePath\` and \`revalidateTag\`.
- In the Next.js 16 docs this sits under the previous caching model; with Cache Components the static shell plays this role.

**Clarifying questions expected:**
- "Is the page static in the build output?" — the ○ symbol answers it.
- "How fresh must it be?" — decides between ISR and on-demand revalidation.

**Code / implementation expected:** Yes — a static page with a revalidate time and an action that revalidates it.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A bakery bakes the day's bread before opening. Customers get a loaf from the shelf instantly, and the ovens are not touched. That shelf is the Full Route Cache. If the recipe changes at noon, the shelf still holds the morning loaves until someone clears them (revalidatePath), the shelf has a best-before time (revalidate), or tomorrow's delivery replaces everything (a new deploy).

## 2. The Core Idea

📌 **Interview term: Full Route Cache** — the persisted HTML and RSC payload of a static route, written at build time or on revalidation and served without re-rendering.

📌 **Interview term: Prerendering** — rendering a route ahead of a request, at build time or in the background during revalidation.

📌 **Interview term: Implicit tags** — tags Next.js assigns to each route, such as _N_T_/blog, which revalidatePath uses to find stored output.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A static route is rendered once and served many times. next build, requests, invalidation">
  <defs>
    <marker id="nx057sj7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">A static route is rendered once and served many times</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">next build</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">renders the route</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">writes .html, .rsc, .meta</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx057sj7-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 201.66666666666666 107 L 239.66666666666666 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="242.66666666666666" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="258.66666666666663" cy="48" r="12"/>
    <text class="d-text d-accent" x="258.66666666666663" y="53" text-anchor="middle">2</text>
    <text class="d-text" x="330" y="82" text-anchor="middle">requests</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">served from those files</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">no render, no fetch</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx057sj7-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">invalidation</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">revalidatePath or ISR</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">or a new deploy</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">dynamic routes get no stored files: in the lab /data/nostore and /data/force had none</text>
  </g>
</svg>

The cache is not something you turn on: any route the build can render ahead of time goes into it. That is why stale pages usually mean a route became static without anyone noticing.

## 3. What goes in and what does not

| Route | In the Full Route Cache? |
| :--- | :--- |
| No request-time APIs, only static or cached data | Yes (○) |
| \`generateStaticParams\` values | Yes (●) |
| \`export const revalidate = n\` | Yes, regenerated in the background after n seconds |
| Uses \`cookies()\`, \`headers()\`, \`searchParams\`, \`connection()\` | No (ƒ) |
| Any \`fetch\` with \`cache: 'no-store'\` | No |

## 4. Clearing it

\`revalidatePath('/blog')\` marks the stored output for that path as stale, so the next request renders it again. Time-based \`revalidate\` does the same automatically. A new deployment starts from a fresh build. The implicit tags that make path-based revalidation work are visible in the build files below. See [ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-) and [on-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag).

## 5. Verified — What the Build Stored (Next.js 16.3.4)

The build output folder after \`next build\`:

\`\`\`
files next build wrote for five routes (.next/server/app):
index:        index.html index.meta index.rsc 
counter:      counter.html counter.meta counter.rsc 
data/plain:   data/plain.html data/plain.meta data/plain.rsc 
data/nostore: (no prerendered files: rendered per request)
data/force:   (no prerendered files: rendered per request)

data/plain.meta:
{
  "headers": {
    "x-nextjs-stale-time": "300",
    "x-nextjs-prerender": "1",
    "x-next-cache-tags": "_N_T_/layout,_N_T_/data/layout,_N_T_/data/plain/layout,_N_T_/data/plain/page,_N_T_/data/plain"
  },
  "segmentPaths": [
    "/_tree",
    "/_full",
    "/data/plain/__PAGE__"
  ],
  "prefetchH
\`\`\`

Serving those files: static pages come back as cache hits, ISR pages as stale-while-revalidate, dynamic pages as no-store:

\`\`\`
/            cache-control: s-maxage=31536000 | x-nextjs-cache: HIT
/counter     cache-control: s-maxage=31536000 | x-nextjs-cache: HIT
/isr         cache-control: s-maxage=30, stale-while-revalidate=31535970 | x-nextjs-cache: STALE
/cookies     cache-control: private, no-cache, no-store, max-age=0, must-revalidate | x-nextjs-cache: (none)
/blog/one    cache-control: s-maxage=31536000 | x-nextjs-cache: HIT
\`\`\`

And the static page never reached the API after the build, while the dynamic ones did:

\`\`\`
each route requested 3 times after next build; the API counts how often it was really called
/data/plain     build fetches 1   API calls for 3 requests: 0   page showed hit=1, hit=1, hit=1   <- fetch(url) with no options, route has no request-time API
/data/nostore   build fetches 0   API calls for 3 requests: 3   page showed hit=1, hit=2, hit=3   <- fetch(url, { cache: 'no-store' })
/data/force     build fetches 0   API calls for 3 requests: 1   page showed hit=1, hit=1, hit=1   <- fetch(url, { cache: 'force-cache' }) in a route that reads headers()
\`\`\`

## 6. Common Pitfalls

- **A route turning static by accident.** Removing the last \`cookies()\` call can move a page from ƒ to ○, and it then shows build-time data forever.
- **Revalidating a tag but not the page.** With no tag on the fetch and no revalidate time, the stored page does not change.
- **Expecting the cache to survive differently per instance.** Self-hosted setups with several instances need a shared cache handler, otherwise each instance regenerates on its own.
- **Using it for per-user content.** Anything user-specific must be dynamic or inside a Suspense hole.
- **Assuming \`next dev\` shows it.** In development routes render on every request; test caching with \`next build\` and \`next start\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The Full Route Cache is the stored HTML and RSC payload of routes that are static at build time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Requests are served from those files without rendering: in the lab the static page made 0 API calls after the build.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Dynamic routes are not stored; the lab build wrote no files for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no-store</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> routes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">It is cleared by redeploying, by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidate</code> time, or by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Test it with next build and next start, because next dev renders every request.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can you tell whether a route is in the Full Route Cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The build table shows ○ or ● for stored routes, and responses carry <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-nextjs-cache: HIT</code> and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s-maxage</code> cache-control header.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is inside the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.meta</code> file the build writes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Response headers such as the prerender flag, the client stale time (300 seconds for static pages in the lab), and the implicit cache tags used by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does revalidatePath rebuild the page immediately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It marks the stored output stale; the next request renders a fresh version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change with Cache Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Routes are dynamic by default and the static shell holds whatever can be prerendered, with 'use cache' marking the cached parts. The build-time files still exist for the shell.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Full Route Cache** | Stored output of static routes |
| **Prerendering** | Rendering before any request arrives |
| **Implicit tags** | Route tags used by revalidatePath |
| **ISR** | Background regeneration after a lifetime |

---
**Conclusion:** The Full Route Cache is the build output of every route that can be rendered ahead of time, served without rendering or fetching. It makes static pages fast and is also the usual cause of stale pages after the data changes. The lab showed the stored files, the headers they are served with, and the absence of any API call, which is how you confirm it in your own app.`,
    examples: [
      {
        label: "A static page with a lifetime and an on-demand refresh",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/page.tsx  -> ○ with a 1 hour lifetime
export const revalidate = 3600;

export default async function Blog() {
  const posts = await fetch("https://cms.example.com/posts", { next: { tags: ["posts"] } }).then((r) => r.json());
  return <ul>{posts.map((p: { id: string; title: string }) => <li key={p.id}>{p.title}</li>)}</ul>;
}

// app/blog/actions.ts
"use server";
import { revalidatePath } from "next/cache";
export async function publish() {
  // ...save the post
  revalidatePath("/blog"); // next request renders /blog again
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the Router Cache in Next.js and what are its implications?",
    seoDescription: "The Router Cache, now the Client Cache, keeps route payloads in browser memory: Back reuses them, dynamic pages refetch. Measured on 16.3.4.",
    description: `**Question presented to candidate:**
"A user edits an item, clicks Back, and sees the old value. Explain what the Router Cache is, why this happens, and how you fix it."

**What a strong answer should cover:**
- The Router Cache (called the Client Cache in the Next.js 16 docs) is an in-memory browser cache of RSC payloads for visited and prefetched routes.
- Back and forward navigation reuse stored payloads without a request; that is where stale screens come from.
- Since Next.js 15, pages of dynamic routes are not reused on normal link navigation (\`staleTimes.dynamic\` defaults to 0); static routes are kept for 5 minutes.
- It is cleared by a full reload, \`router.refresh()\`, and by \`revalidatePath\`, \`revalidateTag\`, \`updateTag\` or setting cookies inside a Server Action.
- Layouts and loading states are reused across navigations, which is what makes navigation feel instant.

**Clarifying questions expected:**
- "Was the mutation a Server Action or an API call?" — only the former can revalidate the client cache in the same response.
- "Is the stale screen on Back or on a link click?" — Back always reuses.

**Code / implementation expected:** Yes — a Server Action that revalidates, and a client refresh.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Your browser keeps a small photo album of pages you have seen. Pressing Back flips to the photo instead of walking back to the scene, which is fast, but if someone repainted the room while you were away, the photo still shows the old colour. Next.js gives you ways to tell the album to throw photos away: take a new one of the current page (router.refresh), or have the server say "these rooms changed" when you make an edit (revalidation in a Server Action).

## 2. The Core Idea

📌 **Interview term: Client Cache** — the browser in-memory store of RSC payloads for visited and prefetched routes, called the Router Cache in older docs.

📌 **Interview term: staleTimes** — an experimental next.config option setting how long pages stay reusable in the client cache; dynamic defaults to 0 s and static to 5 minutes.

📌 **Interview term: router.refresh()** — a client call that clears the client cache for the current route and requests a fresh render from the server, keeping client state.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="What the browser did for each navigation (lab). link to a dynamic page, browser Back, link to a static page">
  <defs>
    <marker id="nx06ryja-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What the browser did for each navigation (lab)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text" x="111.33333333333333" y="82" text-anchor="middle">link to a dynamic page</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">new RSC request</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">fresh render every time</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx06ryja-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 201.66666666666666 107 L 239.66666666666666 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="242.66666666666666" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="258.66666666666663" cy="48" r="12"/>
    <text class="d-text d-accent" x="258.66666666666663" y="53" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="330" y="82" text-anchor="middle">browser Back</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">no request</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">old payload reused</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx06ryja-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">link to a static page</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">no request</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">already prefetched</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">revalidate inside the Server Action, or call router.refresh(), to drop the stale payload</text>
  </g>
</svg>

Stale data after Back is not a server problem. The server was never asked; the browser replayed what it already had.

## 3. Lifetimes and invalidation

| Situation | Reused from the client cache? |
| :--- | :--- |
| Browser back and forward | Yes, always |
| Link to a dynamic page | No, since Next.js 15 (\`staleTimes.dynamic\` defaults to 0) |
| Link to a static page | Yes, for 5 minutes, and usually prefetched |
| Shared layouts and loading UI | Yes, not refetched on navigation |
| After \`router.refresh()\` or a Server Action revalidation | No, fresh payload |
| After a full page reload | No, the cache is in memory only |

## 4. Implications

It makes navigation fast, but it means a mutation must be followed by an invalidation that reaches the browser. Revalidating inside the Server Action is the clean way: the action response tells the router to drop and refetch. A mutation made through a plain fetch to a Route Handler cannot do that, so the client must call \`router.refresh()\`. The Next.js 16 behaviour, including prefetching, is covered in [prefetching and navigation caching](/interview-question/how-does-prefetching-and-navigation-caching-work-in-next-js-16).

## 5. Verified — A Real Browser Session (Next.js 16.3.4, next start)

Two dynamic pages print their server render time; one static page links to them. Network requests for route data were recorded for each step:

\`\`\`
real browser, next start, /nav/a and /nav/b are dynamic (read headers(), print their render time), /nav/s is static
step                   page shown                                   network requests for route data
load /nav/a            NAV-A rendered=2026-09-23T05:52:19.822Z      (full page load)
click "to b"           NAV-B rendered=2026-09-23T05:52:32.969Z      /nav/b?_rsc=zAIk2II6EJXaw_P4
click "to a"           NAV-A rendered=2026-09-23T05:52:34.480Z      /nav/a?_rsc=wmTtw3Ou8TCDXJI6   (new render, not the cached one)
browser Back           NAV-B rendered=2026-09-23T05:52:32.969Z      none   (same timestamp: reused from the client cache)
click "to s" (static)  NAV-S static                                 none   (already prefetched)
click "to a"           NAV-A rendered=2026-09-23T05:52:39.002Z      /nav/a?_rsc=D626qbLEPRq5MRPO
click "to s" again     NAV-S static                                 none
\`\`\`

The static route file written by the build carries its client stale time:

\`\`\`
"x-nextjs-stale-time": "300"
\`\`\`

## 6. Common Pitfalls

- **Mutating through a Route Handler and expecting fresh screens.** The browser was not told; call \`router.refresh()\` after the fetch, or use a Server Action that revalidates.
- **Using \`router.push\` to "reload" data.** Pushing to the same URL can reuse the cached layout; \`router.refresh()\` is the tool.
- **Assuming Next.js 14 behaviour.** In 14 dynamic pages were reused for 30 seconds; in 15 and 16 the default is 0.
- **Forgetting Back/forward.** They always reuse the stored payload, whatever the stale times say.
- **Turning prefetching off everywhere to fix staleness.** That makes navigation slower without fixing the invalidation problem.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The Router Cache, now called the Client Cache, stores route payloads in browser memory for visited and prefetched routes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Back and forward always reuse it; links to dynamic pages refetch (0 s by default since 15), static pages are kept 5 minutes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab, Back showed the old render time with no request, while each link to a dynamic page fetched a new payload.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Invalidate it by revalidating inside the Server Action, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.refresh()</code> after other mutations.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The trap is thinking the server served stale data; it was never asked.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">router.refresh()</code> keep and what does it drop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It refetches the current route from the server and replaces the cached payload, but it keeps client-side React state and scroll position. It does not do a full page reload, and it does not invalidate server-side caches, so a cached fetch can return the same data again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you change the client cache lifetime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental.staleTimes</code> in next.config (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamic</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static</code> in seconds), or per route with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale</code> value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> when Cache Components is on, which the docs recommend.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a Server Action fix staleness when a fetch to an API does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Server Action response can carry the invalidation back to the router in the same round trip. A plain fetch response is just data to Next.js.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the client cache shared between tabs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It lives in memory of one tab and is lost on reload.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Client Cache** | Browser memory of route payloads (Router Cache) |
| **staleTimes** | Config for how long pages stay reusable |
| **router.refresh()** | Refetch the current route, keep client state |
| **Prefetching** | Loading a route payload before the click |

---
**Conclusion:** The Router Cache is the browser keeping payloads of routes you have visited or prefetched, which is why navigation is instant and why Back can show stale data. Since Next.js 15 dynamic pages refetch on every link click, but Back and forward still replay the stored payload, exactly as the lab session showed. The fix is invalidation that reaches the browser: revalidate in the Server Action, or call router.refresh().`,
    examples: [
      {
        label: "Revalidating from a Server Action, and refreshing after a plain fetch",
        tech: "tsx",
        runnable: false,
        code: `// app/items/actions.ts
"use server";
import { revalidatePath } from "next/cache";
export async function rename(id: string, name: string) {
  await db.item.update({ where: { id }, data: { name } });
  revalidatePath("/items"); // server output and browser payloads for /items are dropped
}

// components/LegacySave.tsx
"use client";
import { useRouter } from "next/navigation";
export function LegacySave({ id }: { id: string }) {
  const router = useRouter();
  async function save() {
    await fetch(\`/api/items/\${id}\`, { method: "PATCH" });
    router.refresh(); // the Route Handler could not invalidate the client cache
  }
  return <button onClick={save}>Save</button>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What changed about caching defaults in Next.js 15?",
    seoDescription: "Next.js 15 stopped caching fetch results, GET Route Handlers and dynamic pages in the client cache by default. Each default checked again on Next 16.3.4.",
    description: `**Question presented to candidate:**
"You are upgrading an app from Next.js 14. Which caching defaults changed in 15, what will you notice, and how do you opt back in where you need to?"

**What a strong answer should cover:**
- \`fetch\` requests are no longer cached by default: the default moved from force-cache to not cached.
- GET Route Handlers are no longer cached by default; opt in with \`export const dynamic = 'force-static'\`.
- The client Router Cache no longer reuses pages of dynamic routes on navigation: \`staleTimes.dynamic\` went from 30 s to 0 s.
- Static pages, layouts, loading states and back/forward navigation are still reused.
- Next.js 16 keeps these defaults and adds Cache Components, where everything is dynamic unless marked with 'use cache'.

**Clarifying questions expected:**
- "Which pages relied on implicit caching?" — they may get slower or hit the API more after the upgrade.
- "Are you planning to adopt Cache Components?" — then opt back in with 'use cache' rather than fetch options.

**Code / implementation expected:** Yes — the three opt-backs.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Next.js 14 was a waiter who assumed you wanted "the usual" and kept bringing yesterday's dish unless you said otherwise. Many teams were surprised by stale data. Next.js 15 changed the waiter: now you get it fresh unless you ask for the usual. The food is the same, but the default question flipped, and after an upgrade you have to tell the waiter which dishes really should be "the usual".

## 2. The Core Idea

📌 **Interview term: Caching default** — what Next.js does when you give no option; since 15 the defaults favour fresh data over reuse.

📌 **Interview term: force-static** — a route segment config value that forces a page or Route Handler to be rendered at build time and cached.

📌 **Interview term: staleTimes.dynamic** — the client cache lifetime of pages from dynamic routes; the default changed from 30 to 0 seconds in version 15.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="Three defaults that flipped in Next.js 15 (still true in 16.3.4). fetch(), GET Route Handler, client cache">
  <defs>
    <marker id="nx0744u7-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three defaults that flipped in Next.js 15 (still true in 16.3.4)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">fetch()</text>
    <text class="d-sub" x="262" y="72">not cached unless force-cache or revalidate</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="70" y="129">GET Route Handler</text>
    <text class="d-sub" x="262" y="128">dynamic unless dynamic = force-static</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">client cache</text>
    <text class="d-sub" x="262" y="184">dynamic pages refetched: staleTimes.dynamic 0 s</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="218" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="245" text-anchor="middle">static routes, layouts and back/forward navigation are still reused as before</text>
  </g>
</svg>

None of these changes break code; they change how often it runs. After an upgrade the symptom is higher API load or slower pages, not errors, so look for it in metrics.

## 3. Before and after

| Behaviour | Next.js 14 | Next.js 15 and 16 | How to opt back in |
| :--- | :--- | :--- | :--- |
| \`fetch(url)\` result | Cached (force-cache) | Not cached | \`cache: 'force-cache'\` or \`next: { revalidate }\` |
| \`GET\` Route Handler | Cached when possible | Dynamic | \`export const dynamic = 'force-static'\` |
| Dynamic page in the client cache | Reused for 30 s | Not reused (0 s) | \`experimental.staleTimes: { dynamic: 30 }\` |
| Static page in the client cache | 5 min | 5 min | unchanged |

## 4. Why the change

Implicit caching made the common case confusing: data looked stale and the reason was invisible. Making caching explicit means reading the code tells you what is cached. Next.js 16 takes the same direction further with Cache Components, where nothing is cached unless you write 'use cache'. For the layer-by-layer view see [the caching layers](/interview-question/what-are-the-caching-layers-in-next-js-request-memoization-data-cache-full-route) and [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor).

## 5. Verified — The Defaults on Next.js 16.3.4

Fetch without options is not stored across requests; a no-store fetch makes the route dynamic, and only opted-in fetches are reused:

\`\`\`
each route requested 3 times after next build; the API counts how often it was really called
/data/plain     build fetches 1   API calls for 3 requests: 0   page showed hit=1, hit=1, hit=1   <- fetch(url) with no options, route has no request-time API
/data/nostore   build fetches 0   API calls for 3 requests: 3   page showed hit=1, hit=2, hit=3   <- fetch(url, { cache: 'no-store' })
/data/force     build fetches 0   API calls for 3 requests: 1   page showed hit=1, hit=1, hit=1   <- fetch(url, { cache: 'force-cache' }) in a route that reads headers()
\`\`\`

A GET Route Handler with and without \`force-static\` (the build marked \`/api/time\` as ƒ and \`/api/time-static\` as ○):

\`\`\`
two GET requests 1.1 s apart
/api/time          first 2026-09-23T05:51:51.080Z  second 2026-09-23T05:51:52.197Z  same: false  cache-control: null
/api/time-static   first 2026-09-23T05:51:35.925Z  second 2026-09-23T05:51:35.925Z  same: true  cache-control: s-maxage=31536000
\`\`\`

Dynamic pages in the client cache, in a real browser:

\`\`\`
real browser, next start, /nav/a and /nav/b are dynamic (read headers(), print their render time), /nav/s is static
step                   page shown                                   network requests for route data
load /nav/a            NAV-A rendered=2026-09-23T05:52:19.822Z      (full page load)
click "to b"           NAV-B rendered=2026-09-23T05:52:32.969Z      /nav/b?_rsc=zAIk2II6EJXaw_P4
click "to a"           NAV-A rendered=2026-09-23T05:52:34.480Z      /nav/a?_rsc=wmTtw3Ou8TCDXJI6   (new render, not the cached one)
browser Back           NAV-B rendered=2026-09-23T05:52:32.969Z      none   (same timestamp: reused from the client cache)
click "to s" (static)  NAV-S static                                 none   (already prefetched)
click "to a"           NAV-A rendered=2026-09-23T05:52:39.002Z      /nav/a?_rsc=D626qbLEPRq5MRPO
click "to s" again     NAV-S static                                 none
\`\`\`

The staleTimes docs shipped with 16.3.4 list the change in their history table: "v15.0.0: The dynamic staleTimes default changed from 30s to 0s."

## 6. Common Pitfalls

- **Expecting errors after the upgrade.** Nothing breaks; pages just fetch more often. Watch API traffic and TTFB.
- **Blanket opt-back with fetchCache or force-cache everywhere.** It reintroduces the stale-data confusion the change removed; opt in per request.
- **Forgetting Route Handlers.** A GET endpoint serving static JSON now runs on every request unless marked \`force-static\`.
- **Confusing the plain-fetch case.** A static route still runs its fetch once at build time, so it looks cached even though the fetch itself is not.
- **Using segment config after adopting Cache Components.** \`dynamic\` and \`revalidate\` exports are rejected there; use 'use cache' and \`cacheLife\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Next.js 15 flipped three defaults: fetch results, GET Route Handlers and dynamic pages in the client cache are no longer reused.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Opt back in per request: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">force-cache</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidate</code> for fetch, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamic = 'force-static'</code> for a Route Handler, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">staleTimes</code> for the client.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Static routes, layouts and back/forward navigation still reuse cached output.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The effect of an upgrade is more requests, not errors, so check API load and response times.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Next.js 16 keeps these defaults and goes further with Cache Components: nothing is cached unless marked 'use cache'.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did a page in the lab stay static even though its fetch was not cached?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It had no request-time API, so the build rendered it once and stored the page. The fetch ran during the build; requests are served from the stored page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you cache a GET Route Handler now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Export <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamic = 'force-static'</code> (or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidate</code> time) from the route file. The lab endpoint then returned the build-time timestamp on every request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you restore the old 30 second client cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental: { staleTimes: { dynamic: 30 } }</code> in next.config. With Cache Components the recommended way is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale</code> value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> per route.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did params change in the same release?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. In 15 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">params</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cookies()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> became async. That is a separate change from caching but usually part of the same upgrade.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Caching default** | What happens when you pass no option |
| **force-static** | Build-time rendering for a route or handler |
| **staleTimes** | Client cache lifetimes in next.config |
| **Cache Components** | Next 16 model: cache only what is marked |

---
**Conclusion:** Next.js 15 made caching explicit: fetch results, GET Route Handlers and dynamic pages in the client cache are no longer reused unless you ask. The lab confirmed all three still hold in 16.3.4. After an upgrade, find the few places that relied on implicit caching and opt them in deliberately, or move to Cache Components where 'use cache' is the only way in.`,
    examples: [
      {
        label: "Opting back in, one place at a time",
        tech: "tsx",
        runnable: false,
        code: `// 1. a fetch that may be reused
const data = await fetch("https://api.example.com/countries", { cache: "force-cache" });

// 2. a GET Route Handler served from the build output
// app/api/countries/route.ts
export const dynamic = "force-static";
export async function GET() {
  return Response.json(await getCountries());
}

// 3. the client cache lifetime for dynamic pages
// next.config.ts
const nextConfig = { experimental: { staleTimes: { dynamic: 30 } } };
export default nextConfig;`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "unstable_cache vs `cache` (React) — which dedupes what?",
    seoDescription: "React cache() dedupes calls in one request; unstable_cache persists results across requests. Next 16 replaces unstable_cache with use cache.",
    description: `**Question presented to candidate:**
"You have a getProductStats() function that runs an expensive SQL query. When would you wrap it in React's cache, when in unstable_cache, and what would you use in Next.js 16?"

**What a strong answer should cover:**
- React \`cache()\` memoizes a function for one server request: duplicate calls in the same render run once, and the next request starts fresh.
- \`unstable_cache\` from next/cache stores the result across requests (and deployments) with \`revalidate\` and \`tags\`, like the Data Cache for non-fetch functions.
- They solve different problems and can be combined: persistence plus per-request dedupe.
- In Next.js 16 the unstable_cache docs say it "has been replaced by use cache"; with Cache Components you mark the function with 'use cache' and use \`cacheLife\` and \`cacheTag\`.
- Never persist per-user results in a shared cache unless the user id is part of the key.

**Clarifying questions expected:**
- "Must the result be fresh on every request?" — then only per-request dedupe applies.
- "Is Cache Components enabled?" — decides between unstable_cache and 'use cache'.

**Code / implementation expected:** Yes — the same function wrapped both ways, and the Next.js 16 version.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

React cache is a sticky note on your desk for today's meeting: if three people ask for the attendance count, you count once and read the note. After the meeting the note goes in the bin. unstable_cache is the office noticeboard: the count stays pinned for everyone, all week, until someone takes it down or it passes its date. Same number, very different audiences and lifetimes.

## 2. The Core Idea

📌 **Interview term: React cache()** — per-request memoization for any function; duplicate calls with the same arguments during one request share a result.

📌 **Interview term: unstable_cache** — a next/cache wrapper that persists a function result across requests, with keyParts, revalidate and tags; replaced by 'use cache' in Next.js 16.

📌 **Interview term: 'use cache'** — the Next.js 16 directive that caches the output of a function or component, used with cacheLife and cacheTag.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Same function, two very different caches. React cache(), unstable_cache">
  <defs>
    <marker id="nx08ntgg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Same function, two very different caches</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">React cache()</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">one request only</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">duplicate calls run once</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">lab: 2 runs every request</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx08ntgg-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">unstable_cache</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">across requests</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">revalidate and tags</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">lab: 1 run for 3 requests</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">combine them for persistence plus dedupe; in Next.js 16 prefer use cache over unstable_cache</text>
  </g>
</svg>

The question in the title has a crisp answer: React cache dedupes within a request, unstable_cache persists between requests. Mixing up the two is how per-user data ends up shared.

## 3. Side by side

| | React \`cache()\` | \`unstable_cache\` | \`'use cache'\` (Next.js 16) |
| :--- | :--- | :--- | :--- |
| Scope | One server request | All requests, all users | All requests, all users |
| Survives the request | No | Yes | Yes |
| Invalidation | Not needed | \`revalidate\`, \`revalidateTag\` | \`cacheLife\`, \`cacheTag\`, \`revalidateTag\`, \`updateTag\` |
| Keys | Function arguments | keyParts plus arguments | Generated by the compiler |
| Status | Stable React API | Replaced in 16 | Current model (needs \`cacheComponents\`) |

## 4. Choosing

Use React \`cache()\` whenever the same data is needed in several components during one request, especially for the current user. Use persistence (unstable_cache in older apps, 'use cache' in Next.js 16) only for results that are the same for everyone and can be a little stale. When you persist, make sure every input that changes the result is an argument, because it becomes part of the key. More on the modern API in [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor) and [cacheLife and cacheTag](/interview-question/cachelife-and-cachetag-how-do-you-configure-ttl-profiles).

## 5. Verified — Counting Executions (Next.js 16.3.4, next start)

React \`cache()\`, two requests; each request calls the plain function three times and the cached one three times with id 1 and once with id 2:

\`\`\`
GET /data/react-cache twice; each request calls getUserPlain('1') 3x and cache(getUser)('1') 3x plus ('2') 1x
request 1: plain-calls-this-request=3 cached-calls-this-request=2 cached-total=2
request 2: plain-calls-this-request=3 cached-calls-this-request=2 cached-total=4
\`\`\`

\`unstable_cache\`, three requests to a dynamic page (it reads \`headers()\`), with the wrapped function counting its own executions:

\`\`\`
GET /data/unstable three times (unstable_cache wraps a function that counts its own calls)
request 1: call=1 computedAt=2026-09-23T05:51:50.123Z rendered=2026-09-23T05:51:50.123Z
request 2: call=1 computedAt=2026-09-23T05:51:50.123Z rendered=2026-09-23T05:51:50.435Z
request 3: call=1 computedAt=2026-09-23T05:51:50.123Z rendered=2026-09-23T05:51:50.757Z
\`\`\`

The page rendered on every request (its \`rendered\` time moves) while the cached function ran once. From the unstable_cache docs shipped with 16.3.4: "This API has been replaced by use cache in Next.js 16."

## 6. Common Pitfalls

- **Persisting per-user data.** A shared cache keyed without the user id serves one user data to everyone. Use React \`cache()\` for per-request user data.
- **Creating the wrapper inside a component.** Both wrappers must be created once at module level, or nothing is shared.
- **Missing inputs in the key.** With unstable_cache, anything the function reads from outside its arguments is not part of the key.
- **Starting new code on unstable_cache in Next.js 16.** It still works, as the lab shows, but the docs point to 'use cache'.
- **Expecting React \`cache()\` to reduce database load over time.** It only merges duplicates inside one request.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">React <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> dedupes calls within one request; unstable_cache persists results across requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In the lab, cache() ran twice per request every request, while unstable_cache ran once for three requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">They answer different needs, so they can be combined: persistence for shared data, per-request dedupe for everything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In Next.js 16, unstable_cache is replaced by the 'use cache' directive with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheTag</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Never persist per-user results in a shared cache without the user id in the key.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use React <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cache()</code> in a Client Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is meant for Server Components. On the client there is no per-request scope to attach it to, so use it only in server code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you invalidate an unstable_cache entry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tags</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> with that tag from a Server Action or Route Handler, or set a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidate</code> time in its options.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is 'use cache' keyed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler builds the key from the function identity and its serializable arguments and closed-over values, so you do not pass keyParts by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When do you combine both?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a shared, persisted value is read in several components of one request: persistence avoids the query across requests, and per-request memoization avoids repeated cache lookups within the render.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **React cache()** | Dedupe within one server request |
| **unstable_cache** | Persist across requests (replaced in 16) |
| **'use cache'** | Next 16 directive for persisted caching |
| **keyParts** | Extra key values for unstable_cache |

---
**Conclusion:** React cache() and unstable_cache sound similar but work at different scopes: one request versus all requests. The lab counted both, making the difference concrete. In Next.js 16 the persistent job moves to 'use cache', while React cache() stays the tool for per-request deduplication.`,
    examples: [
      {
        label: "Per-request dedupe, persistence, and the Next.js 16 form",
        tech: "tsx",
        runnable: false,
        code: `import { cache } from "react";
import { unstable_cache } from "next/cache";
import { cacheLife, cacheTag } from "next/cache";

// Per request: several components may call it, the query runs once per request.
export const getCurrentUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));

// Across requests (previous model): shared stats, refreshed hourly or by tag.
export const getProductStats = unstable_cache(
  async (productId: string) => db.$queryRaw\`SELECT count(*) FROM orders WHERE product_id = \${productId}\`,
  ["product-stats"],
  { revalidate: 3600, tags: ["stats"] },
);

// Next.js 16 with cacheComponents: true
export async function getProductStats16(productId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("stats");
  return db.$queryRaw\`SELECT count(*) FROM orders WHERE product_id = \${productId}\`;
}`,
      },
    ],
  },
];

export default augments;
