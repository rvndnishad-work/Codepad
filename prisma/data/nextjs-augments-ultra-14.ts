/**
 * Next.js ULTRA — batch 14: URL search params (search, filter, pagination), useLinkStatus, after(),
 * forbidden()/unauthorized(), Draft Mode with a headless CMS, keeping secrets out of the client bundle,
 * file uploads, and testing a Next.js app.
 * Generated from markdown parts; every Verified section quotes output from Next.js 16.4.2 lab apps.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement search, filtering and pagination with URL search params in the App Router?",
    seoDescription: "Keep search, filters and page number in the URL: parse searchParams in a Server Component, update with useRouter.replace. Verified on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"We have a product list page with a search box, category filters and pagination. Product wants every filtered view to be shareable as a link and to survive a refresh. How would you build that in the App Router?"

**What a strong answer should cover:**
- The URL is the state: \`?q=lamp&category=desks&page=2\` is the single source of truth, so links, refresh, back/forward and sharing all work for free.
- The page (a Server Component) reads the \`searchParams\` prop (a Promise since Next.js 15), validates it, and queries the data on the server; the route becomes dynamic.
- A small Client Component writes to the URL with \`useSearchParams\` + \`useRouter().replace()\` (debounced), wrapped in \`<Suspense>\`; pagination and filters can be plain \`<Link>\`s with a built query string.
- Treat search params as untrusted input: arrays (\`string | string[]\`), invalid numbers, unknown values, out-of-range pages; reset \`page\` when the query changes.
- \`replace\` vs \`push\` (history entries), \`useTransition\` for pending UI, and that each URL change re-renders the page on the server.

**Clarifying questions expected:**
- "Should typing in the search box create back-button history entries, or only page changes?" — decides \`replace\` vs \`push\`.
- "How big is the dataset?" — decides server-side filtering (searchParams prop) vs filtering an already-loaded list in the client.

**Code / implementation expected:** Yes — a Server Component page that parses \`searchParams\`, a debounced client search box, and pagination links.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser.

## 1. Why This Even Matters — A Story First

Imagine a library catalogue on paper slips. If a librarian keeps your search in their head ("you wanted lamps, page two"), the moment you walk away it is gone, and you cannot hand it to a friend. If instead they write the search on the slip itself, anyone holding the slip gets the exact same shelf.

A web page that keeps the search box, filters and page number in React state is the librarian's memory: refresh the page, share the link, or press Back, and the user loses their place. Putting that state in the URL query string is writing it on the slip. \`?q=lamp&category=desks&page=2\` is something you can bookmark, share, refresh and navigate back to.

## 2. The Core Idea

📌 **Interview term: Search params (query string)** — the \`?key=value&key2=value2\` part of a URL. One key can appear more than once (\`?category=lamps&category=desks\`).

📌 **Interview term: URL as state** — a design where the URL, not component state, is the single source of truth for what the page shows. Components read from it and write to it.

📌 **Interview term: \`searchParams\` prop** — the page component prop that holds the query string on the server. Since Next.js 15 it is a Promise you must \`await\`; see [why params and searchParams are Promises](/interview-question/app-router-15-why-are-params-and-searchparams-now-promises).

📌 **Interview term: Debounce** — waiting until the user has paused (for example 300 ms) before acting, so typing "chair" causes one update instead of five. See [debouncing and throttling](/interview-question/what-is-debouncing-and-throttling).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="Search box writes the URL, the server reads it and renders the filtered page">
  <defs>
    <marker id="nx14q1a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The URL is the state</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">Client search box</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">useSearchParams</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">debounce 300 ms</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">router.replace(url)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q1a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="330" y="78" text-anchor="middle">URL</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">?q=lamp</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">&amp;category=desks</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">&amp;page=2</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q1a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="551" y="78" text-anchor="middle">Server page</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">await searchParams</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">validate and query</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">render rows + links</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">refresh, share, back and forward all replay the same URL</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">pagination links are plain Link elements with a built query string</text>
  </g>
</svg>

The flow is a loop: the client only ever writes the URL, the server only ever reads it. Neither side keeps its own copy of the filters.

## 3. The Three Pieces

| Piece | Runs on | Job | API |
| :--- | :--- | :--- | :--- |
| Page | Server | Read the query, validate it, fetch the matching rows, render rows and pagination links | \`searchParams\` prop (awaited) |
| Search box | Client | Turn keystrokes into a new URL after a short pause, without adding history entries | \`useSearchParams\`, \`usePathname\`, \`useRouter().replace\` |
| Pagination and filter links | Server-rendered | Plain links to the same page with one key changed | \`<Link href="?q=lamp&page=2">\` |

**Reading on the server.** The page awaits \`searchParams\` and passes it through a parser. The values are typed \`string | string[] | undefined\`, so the parser picks the first value for single keys, keeps arrays for multi-value keys, drops categories it does not recognise, and turns \`page=abc\` into page 1. The data function then clamps the page to the real page count. Because the page reads request data, the route is dynamic (\`ƒ\` in the build output); see [what makes a route dynamic](/interview-question/what-makes-a-route-dynamic-in-the-next-js-app-router).

**Writing from the client.** The search box copies the current params into a \`URLSearchParams\`, sets \`q\`, deletes \`page\` (a new search should start at page 1), and calls \`router.replace()\` inside \`startTransition\` so React can show a pending hint. [\`useSearchParams\` and friends](/interview-question/how-do-you-read-the-current-url-in-a-next-js-client-component-usepathname-usesea) have their own question; the important rule here is from the 16.4.2 docs: on a prerendered route, a Client Component that calls \`useSearchParams\` must sit inside a \`<Suspense>\` boundary, otherwise \`next build\` fails with the "Missing Suspense boundary with useSearchParams" error. The lab page wraps it anyway, which also gives a disabled input as the fallback.

**Links for everything else.** Pagination does not need JavaScript at all: the server builds \`?q=lamp&page=2\` and renders a \`<Link>\`. Links get [prefetching and client-side navigation](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter) for free, and they push a history entry, so Back goes to the previous page.

## 4. Choosing Between the Options

| Decision | Choose | Because |
| :--- | :--- | :--- |
| Where to filter | Server, via the \`searchParams\` prop | The docs: use the prop "when you need search parameters to load data for the page"; use \`useSearchParams\` only when the list is already in the browser |
| Typing in the search box | \`router.replace\` | Each keystroke would otherwise be a Back-button step |
| Moving between pages | \`<Link>\` (push) | Back should return to page 1 |
| Submitting a whole filter form | [\`next/form\`](/interview-question/what-is-the-next-form-form-component-and-when-would-you-use-it) with a GET action | It turns form fields into search params and navigates client-side, with no handler code |
| Very frequent updates | Debounce, and consider \`useDeferredValue\` for local-only filtering | One server render per pause instead of per keystroke |

## 5. Verified — A Product List on Next.js 16.4.2

The lab app has 47 generated products, 10 per page. \`next build\` marked the page as dynamic:

\`\`\`
├ ƒ /products
\`\`\`

\`curl\` against \`next start\`, showing the summary line, the first rows and the pagination links the server rendered (HTML comments removed):

\`\`\`
GET /products
  47 results, page 1 of 5, q="", categories=all, sort=name
GET /products?q=lamp
  16 results, page 1 of 2, q="lamp", categories=all, sort=name
  href="?q=lamp&page=2">Next
GET /products?q=lamp&page=2
  16 results, page 2 of 2, q="lamp", categories=all, sort=name
GET /products?category=lamps&category=desks&sort=price&page=3
  31 results, page 3 of 4, q="", categories=lamps+desks, sort=price
  href="?category=lamps&category=desks&sort=price&page=2">Previous
  href="?category=lamps&category=desks&sort=price&page=4">Next
GET /products?page=abc
  47 results, page 1 of 5, q="", categories=all, sort=name
GET /products?page=999&category=sofas
  47 results, page 5 of 5, q="", categories=all, sort=name
\`\`\`

The repeated \`category\` key arrived as an array, the invalid page became 1, the unknown category was dropped, and page 999 was clamped to the last page.

In a real Chromium browser (Playwright), starting on \`?page=3\` and typing into the search box:

\`\`\`
start: ?page=3 | 47 results, page 3 of 5, q="", categories=all, sort=name
after typing 'lamp': ?q=lamp | 16 results, page 1 of 2, q="lamp", categories=all, sort=name
history.length before/after: 2 2 (replace, so no new entries)
clicked Next: ?q=lamp&page=2 | 16 results, page 2 of 2, q="lamp", categories=all, sort=name | input still: lamp
browser Back: ?q=lamp | 16 results, page 1 of 2, q="lamp", categories=all, sort=name
\`\`\`

And the effect of the 300 ms debounce, counting the RSC requests the router sent while typing "chair":

\`\`\`
typed 5 characters 60 ms apart; RSC requests sent: 3 [
  'prefetch ?page=2',
  'navigation ?q=chair',
  'prefetch ?q=chair&page=2'
]
\`\`\`

One navigation for five keystrokes; the two prefetches are the router fetching the "Next" link as it appeared in the viewport.

## 6. Common Pitfalls

- **Keeping filters in \`useState\`.** Refresh, share and Back all lose them. Derive the UI from the URL instead.
- **Trusting the query string.** \`page\` can be \`abc\`, \`-1\` or \`999\`, and any key can be an array. Parse into a typed object and clamp; the lab parser is about 15 lines.
- **Forgetting to reset \`page\`.** Searching "lamp" while on page 4 of the unfiltered list shows an empty page 4. Delete \`page\` whenever the query or a filter changes.
- **\`router.push\` on every keystroke.** It floods history and the server. Debounce, and use \`replace\`.
- **Missing \`<Suspense>\` around \`useSearchParams\`.** It may work in \`next dev\` and then fail \`next build\` on a prerendered route.
- **Building URLs by string concatenation.** \`"?q=" + value\` breaks on \`&\` or spaces. Use \`URLSearchParams\`, which encodes for you.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Put search, filters and the page number in the URL query string and make the URL the single source of truth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The page Server Component awaits the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code> prop, validates it, and queries on the server; a small Client Component updates the URL with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchParams</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.replace()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Every view is a shareable link that survives refresh and works with back and forward, and the data query stays on the server.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Debounce the search box, reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">page</code> when the query changes, wrap the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchParams</code> component in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Suspense&gt;</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code> for typing and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Link&gt;</code> for pages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Search params are untrusted strings or arrays: parse them into a typed object, clamp the page, and drop unknown filter values.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">searchParams</code> a Promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since Next.js 15 request data is async so Next.js can prerender everything that does not need it; reading it makes the route dynamic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useSearchParams</code> instead of the prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the params only change client-side behaviour, for example filtering a list already loaded in the browser. To load data, use the page prop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">replace</code> for the search box?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code>, so each keystroke does not add a history entry; page changes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Link&gt;</code> push, so Back returns to the previous page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the build fail without Suspense?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a prerendered route, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearchParams</code> in a Client Component needs a Suspense boundary, otherwise the build fails with the missing Suspense boundary error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid a request per keystroke?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Debounce the update; in the lab, typing five characters produced one navigation request.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Search params** | The \`?key=value\` part of a URL; keys can repeat |
| **URL as state** | The URL is the single source of truth for filters and paging |
| **\`searchParams\` prop** | Page prop with the query string; a Promise since Next.js 15 |
| **Debounce** | Act only after the user pauses |
| **\`router.replace\`** | Navigate without adding a history entry |

---
**Conclusion:** Search, filtering and pagination become simple once the URL is the state. The Server Component page awaits \`searchParams\`, parses it like any untrusted input, queries on the server and renders plain links for pagination; a small debounced Client Component writes the search box into the URL with \`router.replace\`. The lab showed arrays, bad numbers and unknown filters handled by the parser, no new history entries while typing, a working Back button between pages, and one server request for five keystrokes.`,
    examples: [
      {
        label: "Server page: parse searchParams and paginate",
        tech: "tsx",
        runnable: false,
        code: `// lib/search-params.ts
// Turn untrusted URL input into a typed, validated query object.
export type RawSearchParams = Record<string, string | string[] | undefined>;
export type ProductQuery = { q: string; categories: string[]; sort: "price" | "name"; page: number };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const CATEGORIES = new Set(["lamps", "chairs", "desks"]);

export function parseProductQuery(sp: RawSearchParams): ProductQuery {
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const categories = all(sp.category).filter((c) => CATEGORIES.has(c));
  const sort = first(sp.sort) === "price" ? "price" : "name";
  const n = Number.parseInt(first(sp.page) ?? "1", 10);
  const page = Number.isFinite(n) && n > 0 ? n : 1;
  return { q, categories, sort, page };
}

// Build a URL for the same list with some keys changed; null removes a key.
export function withParams(current: URLSearchParams | RawSearchParams, changes: Record<string, string | null>) {
  const next = current instanceof URLSearchParams ? new URLSearchParams(current) : toURLSearchParams(current);
  for (const [k, v] of Object.entries(changes)) (v === null ? next.delete(k) : next.set(k, v));
  const s = next.toString();
  return s ? \`?\${s}\` : "?";
}

function toURLSearchParams(sp: RawSearchParams) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of all(v)) u.append(k, x);
  return u;
}

// app/products/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { findProducts } from "@/lib/products";
import { parseProductQuery, withParams } from "@/lib/search-params";
import SearchBox from "./search-box";

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const raw = await searchParams;
  const query = parseProductQuery(raw);
  const { items, total, page, pageCount } = await findProducts({ ...query, perPage: 10 });

  return (
    <main>
      <h1>Products</h1>
      <Suspense fallback={<input placeholder="Search products" disabled />}>
        <SearchBox />
      </Suspense>
      <p id="summary">
        {total} results, page {page} of {pageCount}, q=&quot;{query.q}&quot;, categories={query.categories.join("+") || "all"}, sort={query.sort}
      </p>
      <ul>
        {items.map((p) => (
          <li key={p.id}>{p.name} ({p.category}) \${p.price}</li>
        ))}
      </ul>
      <nav aria-label="pagination">
        {page > 1 && <Link href={withParams(raw, { page: String(page - 1) })}>Previous</Link>}{" "}
        {page < pageCount && <Link href={withParams(raw, { page: String(page + 1) })}>Next</Link>}
      </nav>
    </main>
  );
}`,
      },
      {
        label: "Client search box: debounced router.replace",
        tech: "tsx",
        runnable: false,
        code: `// app/products/search-box.tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export default function SearchBox() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page"); // a new search starts at page 1
      startTransition(() => replace(\`\${pathname}?\${params.toString()}\`, { scroll: false }));
    }, 300);
  }

  return (
    <label>
      Search{" "}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search products" />
      {isPending && <span id="searching"> updating...</span>}
    </label>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you show navigation loading feedback with useLinkStatus in Next.js?",
    seoDescription: "useLinkStatus returns pending for the parent Link until the URL changes. When to use it vs loading.js and prefetching, timed in Chromium on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"Users click a link in our sidebar and nothing seems to happen for a second before the next page appears. How would you give them feedback in Next.js, and where does \`useLinkStatus\` fit?"

**What a strong answer should cover:**
- Why the delay exists: the destination is dynamic, not prefetched, and has no \`loading.js\`, so the router waits for the server before changing the URL.
- \`useLinkStatus()\` from \`next/link\` returns \`{ pending }\` for the nearest parent \`<Link>\`; it must be called in a Client Component rendered inside that Link.
- \`pending\` is \`true\` from the click until the history updates; it is the inline, per-link signal, while \`loading.js\` is the route-level fallback.
- Fix the cause first: a \`loading.js\` file or prefetching makes the transition instant; \`useLinkStatus\` is the patch for the remaining slow cases.
- UX details: a fixed-size, always-rendered hint (no layout shift) and a short animation delay so fast navigations do not flash.

**Clarifying questions expected:**
- "Is the slow route dynamic, and does it have a \`loading.js\`?" — that decides whether a route fallback already solves it.
- "Is prefetching disabled on these links?" — \`useLinkStatus\` matters most with \`prefetch={false}\`.

**Code / implementation expected:** Yes — a small Client Component using \`useLinkStatus\` inside a \`<Link>\`, plus the CSS idea for a delayed fade-in.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser.

## 1. Why This Even Matters — A Story First

You press the call button for a lift. If the button lights up, you wait calmly. If it does not, you press it five more times and start wondering whether to take the stairs. The lift is exactly as fast either way; the light only tells you your press was received.

A Next.js link to a slow, dynamic page behaves like the unlit button. The router has started fetching, but the old page stays on screen and the URL does not change until the server answers. \`useLinkStatus\` is the light on the button: a small signal, on the link the user just pressed, that says "received, working on it".

## 2. The Core Idea

📌 **Interview term: \`useLinkStatus\`** — a hook exported from \`next/link\` (introduced in v15.3.0 per the docs version table) that returns \`{ pending: boolean }\` for the nearest parent \`<Link>\`.

📌 **Interview term: Pending navigation** — the phase between the click and the moment the router updates the browser history. The docs define \`pending\` as "\`true\` before history updates, \`false\` after".

📌 **Interview term: Blocking navigation** — a navigation where nothing new can be shown until the server responds, because the route is dynamic, was not prefetched and has no [\`loading.js\`](/interview-question/what-is-loading-js-in-next-js-and-how-does-suspense-streaming-work) fallback.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="Timeline of a click on a slow link: click, pending while the server renders, URL updates">
  <defs>
    <marker id="nx14q2a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where pending is true</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">Click</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">user presses Link</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">router starts fetch</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">URL not changed yet</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q2a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="330" y="78" text-anchor="middle">pending: true</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">server renders page</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">old page still shown</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">hint visible</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q2a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="551" y="78" text-anchor="middle">pending: false</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">history updated</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">new page shown</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">hint hidden</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">with loading.js the URL changes almost at once and the route fallback shows instead</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">lab: about 1520 ms pending without loading.js, 11 to 34 ms with it</text>
  </g>
</svg>

So \`useLinkStatus\` only has something to show while a navigation is blocked. If the route has a \`loading.js\` or was prefetched, the URL changes almost immediately and \`pending\` flips back to \`false\` within a frame or two.

## 3. Using It Correctly

The hook reads a React context that every \`<Link>\` provides, so three rules follow:

1. **It must run in a Client Component.** It is a hook, and the file needs \`"use client"\`.
2. **That component must be rendered inside the \`<Link>\`.** The docs: "\`useLinkStatus\` must be used within a descendant component of a \`Link\` component". Outside a Link it reads the default context value; in the 16.4.2 source that default is the idle status, and the lab confirmed it returns \`pending: false\` rather than throwing.
3. **It reports only its own Link.** Ten links each with a hint means ten independent signals. When the user clicks several quickly, the docs say only the last link shows its pending state.

**UX advice from the docs, which the lab follows:**

- Render the hint all the time, at a fixed size, and toggle its visibility or opacity. Mounting and unmounting a spinner beside the label shifts the layout.
- Start the hint invisible and fade it in after about 100 ms, so fast navigations do not flash a hint at all.

\`\`\`css
.link-hint { display: inline-block; width: 0.6em; height: 0.6em; opacity: 0; visibility: hidden; }
.link-hint.is-pending { visibility: visible; animation: fadeIn 200ms ease 100ms forwards; }
@keyframes fadeIn { to { opacity: 0.35; } }
\`\`\`

## 4. Which Tool for Which Problem

| Symptom | First choice | Why |
| :--- | :--- | :--- |
| A dynamic route feels dead on click | Add a \`loading.js\` to that route | The URL changes at once and a skeleton shows; the lab measured 11 to 34 ms of pending across runs |
| Static routes feel slow | Keep prefetching on (the default) | The payload is ready before the click; see [prefetching and navigation caching](/interview-question/how-does-prefetching-and-navigation-caching-work-in-next-js-16) |
| A link must have \`prefetch={false}\` (for cost) and the route cannot stream | \`useLinkStatus\` hint on that link | Inline confirmation while the server renders |
| You want one global progress bar | \`useTransition\` around \`router.push\`, or a \`loading.js\` | \`useLinkStatus\` is per link, not global |

The docs frame \`useLinkStatus\` as "a quick patch when you identify a slow transition"; the real fix is usually prefetching or a \`loading.js\`. For how \`<Link>\` and the router fit together, see [client-side navigation](/interview-question/how-does-client-side-navigation-work-in-next-js-next-link-and-userouter).

## 5. Verified — Timing the Pending State in Chromium (Next.js 16.4.2)

The lab layout has three links, each with a hint component that writes \`data-pending\` on a fixed-size span:

- \`/nav/slow\`: dynamic (\`connection()\`), waits 1500 ms, no \`loading.js\`, \`prefetch={false}\`
- \`/nav/with-loading\`: same page, but with a \`loading.tsx\`, \`prefetch={false}\`
- \`/nav/fast\`: static page, default prefetching

\`next build\` output for those routes:

\`\`\`
├ ○ /nav
├ ○ /nav/fast
├ ○ /nav/outside
├ ƒ /nav/slow
├ ƒ /nav/with-loading
\`\`\`

A Playwright script recorded every change of the hint, the URL and the \`<h1>\` on each animation frame after the click (times are ms since recording started):

\`\`\`
--- click to-slow
  1 ms  pending=false url=/nav h1=Nav home
  82 ms  pending=true url=/nav h1=Nav home
  1601 ms  pending=false url=/nav/slow h1=Slow page
--- click to-loading
  1 ms  pending=false url=/nav h1=Nav home
  65 ms  pending=true url=/nav h1=Nav home
  76 ms  pending=false url=/nav/with-loading h1=undefined
  1559 ms  pending=false url=/nav/with-loading h1=Slow page with loading
--- click to-fast
  1 ms  pending=false url=/nav h1=Nav home
  76 ms  pending=true url=/nav h1=Nav home
  93 ms  pending=false url=/nav/fast h1=Fast page
--- /nav/outside: hint rendered outside any Link, data-pending = false
\`\`\`

Reading it: without \`loading.js\` the link was pending for about 1520 ms and the old page stayed up the whole time. With \`loading.js\` the URL changed after about 11 ms (34 ms on a rerun; the \`h1\` is \`undefined\` because the fallback is a \`<p>\`), and the content streamed in later. Outside a Link the hook returned \`false\`.

One detail differs from the docs wording. The docs say "If the linked route has been prefetched, the pending state will be skipped". In the lab the static link had been prefetched (the request log showed \`prefetch /nav/fast\` before the click and no request after it), yet \`pending=true\` was still visible for one frame in all three repeated runs:

\`\`\`
run 1: requests before click: [prefetch /nav/fast, prefetch /nav/fast]; after click: []; pending=true seen in any frame: true
run 2: requests before click: [prefetch /nav/fast, prefetch /nav/fast]; after click: []; pending=true seen in any frame: true
run 3: requests before click: [prefetch /nav/fast, prefetch /nav/fast]; after click: []; pending=true seen in any frame: true
\`\`\`

That one frame (about 17 ms) is exactly why the 100 ms animation delay matters: with it, the hint never becomes visible on a fast navigation. The timings come from a local server; real network latency was not simulated.

## 6. Common Pitfalls

- **Calling the hook in the component that renders the \`<Link>\`.** It must be a child of the Link, not its parent; in the parent it silently returns \`false\`.
- **Using it instead of fixing the route.** A \`loading.js\` or prefetching removes the wait; the hint only explains it.
- **Mounting a spinner conditionally.** The label jumps sideways on every click. Keep a fixed-size element and toggle opacity.
- **No delay before showing the hint.** Even prefetched navigations were pending for one frame in the lab, which flickers without a delay.
- **Expecting a global signal.** It reports the parent Link only; for a page-wide bar use a transition or \`loading.js\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLinkStatus</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/link</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ pending }</code> for its parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;Link&gt;</code>, so you can show an inline hint while that navigation is in flight.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Call it in a Client Component rendered inside the Link; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pending</code> is true from the click until the browser history updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">A dynamic route with no prefetch and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.js</code> keeps the old page on screen while the server renders, which feels like a dead click.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Fix the cause first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.js</code> or prefetching; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLinkStatus</code> for the remaining slow links, with a fixed-size hint and a 100 ms fade-in delay.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Calling it outside a Link: it does not throw, it just always returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pending: false</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">loading.js</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.js</code> is a route-level Suspense fallback that lets the URL change at once and shows a skeleton; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useLinkStatus</code> is per-link feedback while the URL has not changed yet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">prefetch={false}</code> matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without prefetching nothing is ready at click time, so the pending phase lasts the whole server render; a prefetched static route was pending for about one frame in the lab.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the user clicks two links quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Per the docs, only the last clicked link shows its pending state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I use it for a global progress bar?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly: it reads the nearest parent Link. For a global indicator, wrap navigations in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useTransition</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.push</code>, or use a route-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loading.js</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work in the Pages Router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The docs say it always returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ pending: false }</code> there.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`useLinkStatus\`** | Hook giving \`{ pending }\` for its parent Link |
| **Pending navigation** | Between the click and the history update |
| **Blocking navigation** | Nothing can show until the server answers |
| **\`loading.js\`** | Route-level fallback that makes navigation instant |
| **Prefetching** | Fetching a route before the click |

---
**Conclusion:** \`useLinkStatus\` is a small, precise tool: in a Client Component inside a \`<Link>\`, it tells you whether that link's navigation is still waiting for the history update. The lab showed it pending for the full 1.5 s server render on a dynamic route without \`loading.js\`, for a few tens of milliseconds once a \`loading.js\` was added, for a single frame on a prefetched static route, and always \`false\` outside a Link. Fix slow routes with \`loading.js\` and prefetching first, and use the hook, with a fixed-size hint and a short fade-in delay, for the links that stay slow.`,
    examples: [
      {
        label: "A per-link pending hint",
        tech: "tsx",
        runnable: false,
        code: `// app/nav/hint.tsx
"use client";
import { useLinkStatus } from "next/link";

export default function Hint({ id }: { id: string }) {
  const { pending } = useLinkStatus();
  // Always rendered and fixed size, so toggling it never shifts layout.
  return <span data-hint={id} data-pending={String(pending)} aria-hidden className={pending ? "link-hint is-pending" : "link-hint"} />;
}

// app/nav/layout.tsx
import "./hint.css";
import Link from "next/link";
import Hint from "./hint";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>
        <Link href="/nav/slow" prefetch={false} id="to-slow">Slow (no loading.js) <Hint id="slow" /></Link>{" | "}
        <Link href="/nav/with-loading" prefetch={false} id="to-loading">Slow with loading.js <Hint id="loading" /></Link>{" | "}
        <Link href="/nav/fast" id="to-fast">Static, prefetched <Hint id="fast" /></Link>
      </nav>
      {children}
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is after() in Next.js and when should you use it?",
    seoDescription: "after() from next/server runs a callback once the response is sent: for logs and analytics. Rules for cookies, errors and static pages, on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"After a user submits an order we write an audit log and send an analytics event, and both slow the response down. What does \`after()\` in Next.js do, and is it the right tool here?"

**What a strong answer should cover:**
- \`after(callback)\` from \`next/server\` schedules work to run after the response (or prerender) has finished, so logging and analytics do not delay the user.
- Where it works: Server Components (including \`generateMetadata\`), Server Actions, Route Handlers and Proxy; it is not a request-time API and does not make a route dynamic.
- Request data: in Route Handlers and Server Actions you can call \`cookies()\`/\`headers()\` inside the callback; in Server Components you must read them before and close over the values.
- It runs even when the response fails, calls \`notFound()\` or \`redirect()\`; in a static page it runs at build time or on revalidation.
- Limits: the callback lives within the route's max duration; on serverless it relies on a \`waitUntil\` primitive; it is not a durable job queue, so critical work needs a real queue.

**Clarifying questions expected:**
- "Must the audit log never be lost?" — if yes, write it in the request or enqueue it durably; \`after\` is best effort.
- "Where is this deployed?" — a Node server, Vercel and adapters support it differently; static export does not.

**Code / implementation expected:** Yes — a Route Handler or Server Action that returns immediately and logs inside \`after()\`.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

At a good café the barista hands you your coffee first and only then writes the sale in the notebook, wipes the counter and restocks the cups. If they did all that bookkeeping before handing over the cup, every customer would wait longer for work that has nothing to do with them.

Many server requests have the same shape: the important part (save the order, render the page) and the bookkeeping (write an audit line, send an analytics event, warm a cache). \`after()\` lets a Next.js server hand over the response first and do the bookkeeping afterwards.

## 2. The Core Idea

📌 **Interview term: \`after()\`** — a function from \`next/server\` that takes a callback and runs it after the response (or prerender) is finished. It became stable in v15.1.0; before that it was \`unstable_after\` (v15.0.0-rc), per the docs version table.

📌 **Interview term: Side effect** — work a request causes that the response does not depend on, such as logging or analytics.

📌 **Interview term: \`waitUntil\`** — a platform primitive that keeps a serverless invocation alive until a promise settles. Next.js looks for it at \`globalThis[Symbol.for('@next/request-context')]\` to support \`after\` on serverless hosts.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="Request handled, response sent to the user, then the after callback runs">
  <defs>
    <marker id="nx14q3a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Response first, side work after</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">Handle request</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">do the mutation</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">after(logAnalytics)</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">callback queued</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q3a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="330" y="78" text-anchor="middle">Send response</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">user gets 200</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">lab: 5 ms total</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">nothing waits</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q3a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="551" y="78" text-anchor="middle">Run after()</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">callback starts</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">slow work: 1500 ms</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">user not blocked</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">also runs after notFound, redirect and thrown errors</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">best effort: bounded by the route max duration, not a durable queue</text>
  </g>
</svg>

The user-facing latency is only the first two boxes. Whatever the callback does, the response is already on its way.

## 3. The Rules That Interviewers Ask About

| Question | Answer (16.4.2 docs, lab-checked where marked) |
| :--- | :--- |
| Where can I call it? | Server Components (including \`generateMetadata\`), Server Functions, Route Handlers and Proxy |
| Does it make a route dynamic? | No. It is not a request-time API. In a static page the callback runs at build time or on revalidation (lab: printed during \`next build\`) |
| Does it run if the request fails? | Yes, "even if the response didn't complete successfully", including thrown errors, \`notFound\` and \`redirect\` (lab: ran on a 404) |
| Can I read \`cookies()\` / \`headers()\` inside it? | In Route Handlers and Server Actions, yes (lab: read \`user-agent\` inside the callback). In Server Components, no: it throws (lab message below) |
| How long can it run? | The route's default or configured max duration (\`maxDuration\`, where the platform supports it) |
| Can it be nested? | Yes, \`after\` calls can be nested, for example in helper utilities |
| Where is it supported? | Node.js server and Docker: yes. Static export: no. Adapters: platform-specific |

**Why Server Components cannot read request data inside \`after\`.** Next.js needs to know which part of the tree reads request data, to support [Partial Prerendering](/interview-question/what-is-partial-prerendering-ppr-in-next-js) and Cache Components. The callback runs after React has finished rendering, so that tracking is over. The fix is simple: read the cookie during render, then close over the value, as the second example does. More on those APIs in [reading cookies and headers](/interview-question/how-do-you-read-cookies-and-headers-in-next-js-cookies-headers).

## 4. When To Use It, and When Not

| Use \`after\` for | Do not use \`after\` for |
| :--- | :--- |
| Analytics events and page-view counters | Anything the response must contain |
| Audit logs where losing a rare line is acceptable | Payments, emails or audit trails that must never be lost: write them in the request or to a durable queue |
| Warming or refreshing a cache after a mutation | Jobs longer than the route max duration |
| Flushing buffered telemetry | Work that needs retries and backoff |

For structured tracing and logs across the whole app, \`after\` pairs with [instrumentation and OpenTelemetry](/interview-question/how-do-you-handle-instrumentation-and-observability-in-next-js-instrumentation-t). For the difference between where you can call it, see [Server Actions vs Route Handlers](/interview-question/how-do-server-actions-differ-from-route-handlers-in-next-js).

## 5. Verified — Timing and Edge Cases (Next.js 16.4.2)

\`next build\` for the lab routes; note the static page's callback printing while pages were generated:

\`\`\`
  Generating static pages using 3 workers (5/20) 
[10:02:52.840] static: after() ran during prerender
...
├ ƒ /after/api
├ ƒ /after/bad-cookies
├ ƒ /after/dynamic
├ ƒ /after/notfound
├ ○ /after/static
\`\`\`

\`/after/static\` stayed \`○\` Static, which confirms that \`after\` does not make a route dynamic.

Then requests against \`next start\`, with the client and the server log side by side (the Route Handler callback sleeps 1500 ms; the page callback sleeps 1000 ms):

\`\`\`
client: POST /after/api at 10:05:02.803
{"ok":true}  -> status 200, body above, total 0.005121s
client: response received at 10:05:02.817
client: GET /after/dynamic with cookie visitor=ada
  -> status 200, total 0.017654s
client: GET /after/notfound
  -> status 404
client: GET /after/bad-cookies
  -> status 200
client: GET /after/static (prerendered)
  -> status 200
--- server log during these requests:
[10:05:02.812] route: mutation done, scheduling after()
[10:05:02.813] route: returning response
[10:05:02.814] route: after() started, user-agent=lab-curl/1.0
[10:05:02.835] page: render finished
[10:05:02.869] notfound: after() still ran although the page called notFound()
[10:05:02.887] bad-cookies: threw: Route /after/bad-cookies used \`cookies()\` inside \`after()\` while rendering. This is not supported. If you need this data inside an \`after()\` callback, use \`cookies()\` outside of the callback. See more info here: https://nextjs.org/docs/app/api-reference/functions/after
[10:05:03.842] page: after() logged a view for ada
[10:05:04.316] route: after() finished
\`\`\`

What this shows:

- The POST response took 5 ms; its callback finished 1.5 s later, at \`04.316\`. The user never waited for it.
- \`headers()\` worked inside the callback in a Route Handler (\`user-agent=lab-curl/1.0\`).
- The page read the \`visitor\` cookie during render and the callback used it a second later.
- The callback ran on a page that returned 404 via \`notFound()\`.
- \`cookies()\` inside \`after\` in a Server Component threw the error quoted above.
- The prerendered static page did not run its callback per request; it had already run during the build.

This was a long-running \`next start\` process. Behaviour on a serverless platform depends on its \`waitUntil\` support and was not tested here.

## 6. Common Pitfalls

- **Treating \`after\` as a queue.** If the process restarts or hits its max duration, the work is gone. Use a durable queue for anything important.
- **Reading cookies inside the callback in a page.** It throws in Server Components; read first, then close over the value.
- **Expecting per-request runs in a static page.** The callback runs at build or revalidation time there, not on each visit.
- **Plain un-awaited promises instead.** On serverless hosts the invocation can freeze before they finish; \`after\` registers the work with \`waitUntil\`.
- **Doing visible work in \`after\`.** The user already has the response, so anything they need to see must happen before it.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after()</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/server</code> schedules a callback to run after the response or prerender has finished.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">You call it during a Server Component render, a Server Action, a Route Handler or Proxy; Next.js sends the response and then runs the callback.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Logging, analytics and cache warming stop adding latency; in the lab the response took 5 ms while the 1.5 s callback finished afterwards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In Route Handlers and Server Actions you may call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cookies()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> inside the callback; in Server Components read them first and close over the values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">It is best effort within the route max duration, not a job queue: anything that must not be lost belongs in the request or a durable queue.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does calling <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">after()</code> make the page dynamic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is not a request-time API. In a static page the callback runs at build time or on revalidation; the lab build log printed it during prerendering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it still run if the page calls <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">notFound()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The docs say it runs even when an error is thrown or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">notFound</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redirect</code> is called, and the lab saw it run on a 404.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is it different from a fire-and-forget promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An un-awaited promise can be cut off when a serverless function freezes; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after</code> registers the work with the platform <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">waitUntil</code> so the invocation stays alive until it settles.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if I call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cookies()</code> inside <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">after</code> in a page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It throws: "used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cookies()</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after()</code> while rendering. This is not supported." Read it before calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is it the wrong tool?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For work the user must see (it runs after they got the response), for long jobs beyond the max duration, and for work that needs retries; use a queue.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`after()\`** | Run a callback after the response is finished |
| **Side effect** | Work the response does not depend on |
| **\`waitUntil\`** | Keeps a serverless invocation alive for a promise |
| **\`maxDuration\`** | Route segment option bounding how long work may run |

---
**Conclusion:** \`after()\` is the "hand over the coffee first" API: Next.js finishes the response and then runs your callback, so logging, analytics and cache work stop costing the user time. The lab measured a 5 ms response with a 1.5 s callback finishing afterwards, saw the callback run on a 404, saw \`headers()\` work inside it in a Route Handler and \`cookies()\` throw inside it in a page, and saw a static page run it during the build. Use it for best-effort side work, and keep anything that must never be lost in the request or a durable queue.`,
    examples: [
      {
        label: "Route Handler: respond now, log afterwards",
        tech: "ts",
        runnable: false,
        code: `// app/after/api/route.ts
import { after } from "next/server";
import { headers } from "next/headers";
import { log, sleep } from "@/lib/log";

export async function POST() {
  log("route", "mutation done, scheduling after()");
  after(async () => {
    const ua = (await headers()).get("user-agent"); // allowed inside after() in a Route Handler
    log("route", \`after() started, user-agent=\${ua}\`);
    await sleep(1500); // pretend this is a slow analytics call
    log("route", "after() finished");
  });
  log("route", "returning response");
  return Response.json({ ok: true });
}`,
      },
      {
        label: "Server Component: read request data before after()",
        tech: "tsx",
        runnable: false,
        code: `// app/after/dynamic/page.tsx
import { after } from "next/server";
import { cookies } from "next/headers";
import { log, sleep } from "@/lib/log";

export default async function Page() {
  const visitor = (await cookies()).get("visitor")?.value ?? "anonymous"; // read BEFORE after()
  after(async () => {
    await sleep(1000);
    log("page", \`after() logged a view for \${visitor}\`);
  });
  log("page", "render finished");
  return <h1>Hello {visitor}</h1>;
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are forbidden() and unauthorized() in Next.js?",
    seoDescription: "forbidden() and unauthorized() render 403 and 401 UI in the App Router. Still experimental (authInterrupts) in 16.4.2; status codes and pitfalls verified.",
    description: `**Question presented to candidate:**
"Our admin pages redirect everyone without access to /login, even users who are signed in but are not admins. How would you return proper 401 and 403 responses in the App Router, and what are \`forbidden()\` and \`unauthorized()\`?"

**What a strong answer should cover:**
- 401 means "we do not know who you are" (sign in); 403 means "we know you, and the answer is no". \`unauthorized()\` and \`forbidden()\` from \`next/navigation\` throw and render \`unauthorized.tsx\` / \`forbidden.tsx\`, like \`notFound()\` does for 404.
- They are still experimental in 16.4.2: the config option \`experimental.authInterrupts: true\` is required; without it the call throws an error at runtime.
- They work in Server Components, Server Actions and Route Handlers; they cannot be called in the root layout; both add a \`noindex\` robots tag.
- Status codes: the real 401/403 is sent only if the call happens before streaming starts; inside a \`<Suspense>\` boundary the status stays 200 and the fallback UI streams in.
- They throw, so a \`try/catch\` swallows them unless you use \`unstable_rethrow\`; put the checks in a Data Access Layer.

**Clarifying questions expected:**
- "Should a signed-out user see a sign-in page or be redirected?" — \`unauthorized()\` renders UI in place with a 401; \`redirect()\` sends them away.
- "Do crawlers or API clients depend on the status code?" — then the check must run before any streaming.

**Code / implementation expected:** Yes — \`requireUser\`/\`requireAdmin\` helpers, the two special files, and the \`authInterrupts\` config.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs and typings shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser.

## 1. Why This Even Matters — A Story First

A club has a door attendant. Someone with no ticket is told "please buy a ticket at the window". Someone with a general ticket who tries the VIP area is told "this area is not included in your ticket". Two different problems, two different answers. A bad attendant sends both people back to the ticket window, and the general-ticket holder, who already has a ticket, is confused.

Many apps are that bad attendant: any failed access check calls \`redirect('/login')\`. HTTP has two separate answers. **401 Unauthorized** means "I do not know who you are" (sign in). **403 Forbidden** means "I know who you are, and you may not do this". \`unauthorized()\` and \`forbidden()\` let the App Router give each answer, with its own page and status code.

## 2. The Core Idea

📌 **Interview term: Authentication vs authorization** — authentication answers "who are you?"; authorization answers "what may you do?". A failed authentication is a 401; a failed authorization is a 403. The bigger picture is in [authentication in Next.js](/interview-question/how-do-you-handle-authentication-in-next-js).

📌 **Interview term: Auth interrupts** — \`unauthorized()\` and \`forbidden()\` from \`next/navigation\`. Each throws a special error (digest \`NEXT_HTTP_ERROR_FALLBACK;401\` or \`;403\`) that stops rendering of the segment and renders the nearest \`unauthorized.tsx\` or \`forbidden.tsx\`, exactly as [\`notFound()\` renders \`not-found.tsx\`](/interview-question/what-is-not-found-js-in-next-js-and-how-do-you-trigger-a-404).

📌 **Interview term: \`authInterrupts\`** — the \`next.config\` option under \`experimental\` that must be \`true\` before either function can be used.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="No session gives 401 unauthorized, wrong role gives 403 forbidden, admin gets the page">
  <defs>
    <marker id="nx14q4a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three outcomes of one access check</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">No session</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">unauthorized()</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">unauthorized.tsx</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">HTTP 401</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q4a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="330" y="78" text-anchor="middle">Signed in, not admin</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">forbidden()</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">forbidden.tsx</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">HTTP 403</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q4a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="551" y="78" text-anchor="middle">Admin</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">check passes</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">page renders</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">HTTP 200</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">inside a Suspense boundary the status stays 200 and the 401 or 403 UI streams in</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">both inject a noindex robots meta tag</text>
  </g>
</svg>

## 3. Is It Still Experimental in 16.4.2?

Yes. Every source shipped with the 16.4.2 package says so:

| Source in next@16.4.2 | What it says |
| :--- | :--- |
| \`docs/.../functions/forbidden.md\` and \`unauthorized.md\` | Front matter \`version: experimental\`; "To start using \`forbidden\`, enable the experimental \`authInterrupts\` configuration option" |
| \`docs/.../next-config-js/authInterrupts.md\` | Front matter \`version: canary\`; "While these functions are experimental, you must enable the \`authInterrupts\` option" |
| \`dist/server/config-shared.d.ts\` | \`authInterrupts?: boolean;\` inside \`experimental\`, commented "This config allows you to enable the experimental navigation API \`forbidden\` and \`unauthorized\`", with a default of \`false\` |
| \`dist/client/components/forbidden.d.ts\` | \`export declare function forbidden(): never;\` and the JS source is tagged \`@experimental\` |
| Version history | Both functions and both file conventions were introduced in \`v15.1.0\` |

So the honest interview answer is: they have been available since 15.1, they are still behind an experimental flag in 16.4.2, and the API could still change.

## 4. Rules and Status Codes

- **Where:** Server Components, Server Actions and Route Handlers. **Not** in the root layout.
- **No \`return\` needed:** the return type is \`never\`; execution stops at the call.
- **\`noindex\`:** Next.js injects \`<meta name="robots" content="noindex" />\` so the error page is not indexed.
- **Status code depends on timing.** If the call happens before streaming starts, the response is a real 401 or 403. If it happens inside a \`<Suspense>\` boundary after the shell has been sent, the status stays 200 and the 401/403 UI streams in (the docs' [status codes section of loading.js](/interview-question/what-is-loading-js-in-next-js-and-how-does-suspense-streaming-work) explains why). For a guaranteed status code, check before any boundary, or in [Proxy](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts).
- **They throw.** A \`try/catch\` around the check catches the interrupt and nothing renders. Use \`unstable_rethrow(e)\` first in the \`catch\`.
- **Un-awaited calls do nothing useful.** A call inside a promise nobody awaits throws where nothing catches it; always \`await\` the function that may call it.

| You want | Use | Status | URL |
| :--- | :--- | :--- | :--- |
| Show sign-in UI where the user is | \`unauthorized()\` | 401 | unchanged |
| Show "no access" UI | \`forbidden()\` | 403 | unchanged |
| Send the user somewhere else | \`redirect('/login')\` | 307 | changes |
| Hide that the resource exists | \`notFound()\` | 404 | unchanged |

**Where to put the checks.** In a Data Access Layer: \`requireUser()\` calls \`unauthorized()\` when there is no session, \`requireAdmin()\` calls \`forbidden()\` for the wrong role, and every page, action and handler calls one of them. This keeps the rule in one place and, importantly, inside Server Actions too, because [a page-level check does not protect its actions](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js).

## 5. Verified — Status Codes and Edge Cases (Next.js 16.4.2)

The lab app sets \`experimental.authInterrupts: true\`; \`next build\` lists it:

\`\`\`
▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 37ms
- Experiments (use with caution):
  ✓ authInterrupts
\`\`\`

The session is faked with a \`role\` cookie (absent, \`user\` or \`admin\`). \`curl\` against \`next start\`:

\`\`\`
/admin     role=none   -> 401  <meta name="robots" content="noindex"/> 
/admin     role=user   -> 403  <meta name="robots" content="noindex"/> 
/admin     role=admin  -> 200  <h1>Admin dashboard for u1</h1> 
/projects  role=none   -> 200  <h1>Projects</h1> <meta name="robots" content="noindex"/> Loading projects... 
/projects  role=user   -> 200  <h1>Projects</h1> <meta name="robots" content="noindex"/> Loading projects... 
/projects  role=admin  -> 200  <h1>Projects</h1> <li>Secret project</li> Loading projects... 
/api/admin role=none   -> 401  
/api/admin role=user   -> 403  
/api/admin role=admin  -> 200  {"ok":true,"user":"u1"}
/swallowed role=none   -> 200  <h1>Something went wrong (interrupt swallowed)</h1> 
/swallowed role=user   -> 200  <h1>Something went wrong (interrupt swallowed)</h1> 
/swallowed role=admin  -> 200  <h1>Admin only</h1> 
/rethrow   role=none   -> 401  <meta name="robots" content="noindex"/> 
/rethrow   role=user   -> 403  <meta name="robots" content="noindex"/> 
/rethrow   role=admin  -> 200  <h1>Admin only</h1>
\`\`\`

- \`/admin\` checks before rendering anything: real 401 and 403.
- \`/projects\` checks inside \`<Suspense>\`: the shell streamed first, so the status stayed 200 even for a user without access.
- In a Route Handler the interrupts produced a bare 401/403 with an empty body.
- \`/swallowed\` wraps the check in \`try/catch\`: the interrupt was caught and the user saw a misleading 200 page. \`/rethrow\` adds \`unstable_rethrow(e)\` and the codes come back.

What a browser actually displays (Playwright, visible text):

\`\`\`
/admin role=user: HTTP 403, visible text: "403 - You do not have access Ask an admin for the admin role. Back home"
/admin role=none: HTTP 401, visible text: "401 - Please sign in Sign in"
/projects role=user: HTTP 200, visible text: "403 - You do not have access Ask an admin for the admin role. Back home"
\`\`\`

The streamed \`/projects\` case still showed the 403 UI, and it replaced the whole page, including the \`<h1>\` that had already streamed. The interrupt goes to the nearest \`forbidden\` boundary, and that boundary wraps a route segment, not the \`<Suspense>\` boundary where the check ran.

And the same call in a second lab app **without** the flag:

\`\`\`
GET /forbidden-noflag -> 500
⨯ Error: \`forbidden()\` is experimental and only allowed to be enabled when \`experimental.authInterrupts\` is enabled.
\`\`\`

## 6. Common Pitfalls

- **Forgetting \`experimental.authInterrupts\`.** The page builds fine and then fails with a 500 at request time.
- **Expecting a 403 from inside Suspense.** Once the shell has streamed, the status is 200. Check above the boundary or in Proxy when the code matters.
- **Wrapping checks in \`try/catch\`.** It silently swallows the interrupt. Call \`unstable_rethrow\` first.
- **Using \`redirect('/login')\` for everyone.** Signed-in users without a role need a 403, not a login screen.
- **Checking only on the page.** Server Actions are separate POST endpoints; call \`requireAdmin()\` inside each one.
- **Calling it in the root layout.** Not supported; move the check down a level or into the DAL.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unauthorized()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forbidden()</code> are the 401 and 403 versions of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">notFound()</code>: they throw, stop rendering and show <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unauthorized.tsx</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forbidden.tsx</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Call them from a Server Component, Server Action or Route Handler, usually inside Data Access Layer helpers like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireUser()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireAdmin()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">A signed-in user without the role gets an honest 403 page instead of a confusing redirect to login, and API clients get real status codes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">They are experimental in 16.4.2 and need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental.authInterrupts: true</code>; the status is only 401 or 403 if the check runs before streaming starts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">They work by throwing, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/catch</code> around the check swallows them; rethrow with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unstable_rethrow</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget the config flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The call throws at runtime: "<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forbidden()</code> is experimental and only allowed to be enabled when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental.authInterrupts</code> is enabled." The lab page returned 500.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did a forbidden page return 200?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The check ran inside a Suspense boundary after the shell had streamed, so the status line was already sent. Move the check above the boundary, or into Proxy, for a real 403.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I call them in the root layout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, the docs say neither can be called in the root layout. Call them in pages, nested layouts or the DAL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">redirect('/login')</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unauthorized()</code> renders sign-in UI at the same URL with status 401; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redirect</code> sends a 307 to another URL. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redirect</code> when you want the user to leave.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this enough to secure a Server Action?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if you call it inside the action. A check on the page does not protect actions; each action must verify the session itself.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **401 Unauthorized** | Not signed in, or the credentials are invalid |
| **403 Forbidden** | Signed in, but not allowed |
| **\`unauthorized()\` / \`forbidden()\`** | Throw to render the 401 or 403 UI |
| **\`authInterrupts\`** | Experimental flag that enables them |
| **\`unstable_rethrow\`** | Re-throws Next.js control-flow errors inside a \`catch\` |

---
**Conclusion:** \`unauthorized()\` and \`forbidden()\` give the App Router the two missing access answers next to \`notFound()\`: 401 for "sign in" and 403 for "not allowed", each with its own special file and a \`noindex\` tag. In 16.4.2 they are still experimental behind \`experimental.authInterrupts\`, and without it the call throws a 500. The lab confirmed real 401/403 codes when the check runs before streaming, a 200 with the 403 UI when it runs inside Suspense, bare codes from Route Handlers, and the \`try/catch\` trap that \`unstable_rethrow\` fixes.`,
    examples: [
      {
        label: "Config, DAL helpers and the 403/401 files",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true, // required for forbidden() and unauthorized() in 16.4.2
  },
};
export default nextConfig;

// lib/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";

export type Session = { userId: string; role: "user" | "admin" };

// Lab stand-in for a real session lookup (decrypt a cookie, query a sessions table, ...).
export const getSession = cache(async (): Promise<Session | null> => {
  const role = (await cookies()).get("role")?.value;
  if (role === "admin" || role === "user") return { userId: "u1", role };
  return null;
});

export async function requireUser() {
  const session = await getSession();
  if (!session) unauthorized(); // 401: we do not know who you are
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "admin") forbidden(); // 403: we know you, and the answer is no
  return session;
}

// app/forbidden.tsx
import Link from "next/link";
export default function Forbidden() {
  return (
    <main>
      <h2>403 - You do not have access</h2>
      <p>Ask an admin for the admin role.</p>
      <Link href="/">Back home</Link>
    </main>
  );
}

// app/unauthorized.tsx
import Link from "next/link";
export default function Unauthorized() {
  return (
    <main>
      <h2>401 - Please sign in</h2>
      <Link href="/login">Sign in</Link>
    </main>
  );
}

// app/admin/page.tsx
import { requireAdmin } from "@/lib/dal";

export default async function AdminPage() {
  const session = await requireAdmin();
  return <h1>Admin dashboard for {session.userId}</h1>;
}`,
      },
      {
        label: "try/catch swallows the interrupt; unstable_rethrow fixes it",
        tech: "tsx",
        runnable: false,
        code: `// app/rethrow/page.tsx
import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "@/lib/dal";

export default async function Page() {
  try {
    await requireAdmin();
  } catch (e) {
    unstable_rethrow(e); // lets Next.js interrupts (403/401/404/redirect) through
    return <h1>Something went wrong</h1>;
  }
  return <h1>Admin only</h1>;
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Draft Mode in Next.js and how does it work with a headless CMS?",
    seoDescription: "Draft Mode lets editors preview unpublished CMS content on a static site with a bypass cookie, while visitors keep the cache. Checked on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"Our marketing site is statically generated from a headless CMS and revalidates every hour. Editors complain they cannot see their changes before publishing. How does Draft Mode solve this, and how would you wire it up?"

**What a strong answer should cover:**
- Draft Mode is a per-browser switch: a \`__prerender_bypass\` cookie that makes that browser's requests skip the static/ISR output and every data cache, while other visitors keep getting the cached pages.
- Enabling: a Route Handler (\`/api/draft\`) that the CMS "Preview" button opens; it checks a shared secret and the slug, calls \`(await draftMode()).enable()\` and redirects to a path it built itself (no open redirect).
- Rendering: \`(await draftMode()).isEnabled\` lets the page fetch the CMS draft endpoint (with a preview token) and show a "Preview mode" banner with an exit button that calls \`disable()\`.
- What gets bypassed: the fetch cache, \`'use cache'\`, \`unstable_cache\` and the ISR response cache; draft responses are \`Cache-Control: private, no-cache, no-store\`.
- Security and edge cases: the secret stays server-side, the cookie value is regenerated per build, exit via POST (a prefetched GET \`<Link>\` would clear the cookie).

**Clarifying questions expected:**
- "Does the CMS serve drafts from the same URL or a separate preview endpoint?" — decides whether the fetch code needs to branch on \`isEnabled\`.
- "Who may preview, and how is the secret shared with the CMS?" — the secret check is the only gate.

**Code / implementation expected:** Yes — the enable Route Handler, a data function that branches on \`isEnabled\`, and an exit Server Action.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser. **No real CMS was used:** the lab runs a small local Node server that imitates one (published and draft versions of a post, a separate preview endpoint that needs a token). Vendor-specific preview settings in Contentful, Sanity and others were not tested.

## 1. Why This Even Matters — A Story First

A newspaper prints its morning edition at 4 a.m. and sells copies all day. That is fast and cheap, but if the editor rewrites a headline at noon, nobody sees it until tomorrow. Now imagine the editor has a special pair of glasses: whenever they look at a copy through them, they see the newest draft of every article, live, while every reader without the glasses still sees the printed edition.

A statically generated or ISR site is the printed edition: pages are built ahead of time and served from a cache. Draft Mode is the glasses. It is a cookie in one browser that tells Next.js "for this person, skip the printed copy and fetch the latest draft from the CMS on every request".

## 2. The Core Idea

📌 **Interview term: Headless CMS** — a content system (Contentful, Sanity, Strapi and so on) that stores content and serves it over an API, with no front end of its own. Next.js is the front end.

📌 **Interview term: Draft Mode** — a per-browser switch, controlled with \`draftMode()\` from \`next/headers\`, that makes requests from that browser bypass static generation and caching. Introduced in v13.4.0; since v15.0.0-RC \`draftMode()\` is async and must be awaited.

📌 **Interview term: Bypass cookie** — \`__prerender_bypass\`, the cookie \`enable()\` sets. Requests that carry its current value skip every cache layer. Its value is regenerated on each \`next build\`, so it cannot be guessed from an old build.

📌 **Interview term: Preview URL** — the link a CMS opens when an editor clicks "Preview", for example \`/api/draft?secret=TOKEN&slug=/posts/hello\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="CMS preview link sets a bypass cookie; editor gets fresh draft, visitor gets cached page">
  <defs>
    <marker id="nx14q5a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One page, two audiences</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">CMS Preview button</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">/api/draft?secret</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">check secret + slug</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">enable(), 307</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q5a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="330" y="78" text-anchor="middle">Editor browser</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">has bypass cookie</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">skips every cache</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">fetches the draft</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q5a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="551" y="78" text-anchor="middle">Other visitors</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">no cookie</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">static or ISR page</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">published content</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">the cookie is httpOnly, Secure, SameSite=None and lasts for the browser session</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">draft responses: Cache-Control private, no-cache, no-store</text>
  </g>
</svg>

## 3. The Four Pieces

**1. The enable Route Handler.** The CMS opens it in a new tab. It must:

- compare the \`secret\` parameter with a server-only environment variable and return 401 if it does not match;
- look up the slug in the CMS to confirm it exists;
- call \`(await draftMode()).enable()\`;
- redirect to a path built from the CMS record, never to the raw \`slug\` parameter, which would be an open redirect.

**2. The data function.** If the CMS serves drafts and published content from the same URL, nothing changes: the bypass is automatic. If drafts live at a separate endpoint (common, and what the lab CMS does), branch on \`isEnabled\` and send the preview token. That token stays on the server because the function lives in a \`server-only\` module.

**3. The page.** It renders as usual and can read \`isEnabled\` to show a "Preview mode is on" banner.

**4. Exiting.** A form whose Server Action calls \`(await draftMode()).disable()\` and redirects. The docs recommend POST for this; if you use a GET Route Handler, trigger it from a form, not a \`<Link>\`, because prefetching a link would hit the URL and clear the cookie before the editor clicks.

**What Draft Mode bypasses** (16.4.2 Draft Mode guide):

| Layer | With the bypass cookie |
| :--- | :--- |
| \`fetch()\` data cache | Skipped, goes to the network |
| \`'use cache'\` functions and components | Re-executed on every request, results not saved |
| \`unstable_cache\` | Reads and writes bypassed |
| ISR / static response cache | Page excluded; served with \`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate\` |

\`isEnabled\` is readable inside a \`'use cache'\` scope (so a cached component can still render the banner), but \`enable()\` and \`disable()\` cannot be called there. For the cache layers themselves, see [the caching layers in Next.js](/interview-question/what-are-the-caching-layers-in-next-js-request-memoization-data-cache-full-route).

## 4. Draft Mode vs Revalidation

| | Draft Mode | [On-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag) | [ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-) |
| :--- | :--- | :--- | :--- |
| Who sees new content | Only the browser with the cookie | Everyone | Everyone, after the interval |
| Content shown | Unpublished drafts | Published content | Published content |
| Cache effect | Bypassed for that browser, untouched for others | Cache entries invalidated | Background regeneration |
| Typical trigger | CMS Preview button | CMS publish webhook | Time |

A complete CMS setup usually uses both: Draft Mode for previews and a publish webhook that calls \`revalidateTag\` for everyone else.

## 5. Verified — A Static Post With a Simulated CMS (Next.js 16.4.2)

The fake CMS (a small Node \`http\` server on port 4165) serves \`/published/posts/hello\` and \`/preview/posts/hello\` (the latter only with \`Authorization: Bearer <token>\`), logs every request, and accepts \`POST /edit\` to change the draft. \`next build\` prerendered the post from the published endpoint:

\`\`\`
├   /posts/[slug]
│ └ ● /posts/hello
\`\`\`

\`\`\`
[cms #1] GET /published/posts/hello
\`\`\`

Then \`curl\` against \`next start\` (the banner text also appears in the RSC payload, so it is printed twice for draft requests):

\`\`\`
1) visitor, GET /posts/hello twice
   x-nextjs-cache: HIT Cache-Control: s-maxage=3600, stale-while-revalidate=31532400  <h1>Hello (published v1)</h1> 
   x-nextjs-cache: HIT Cache-Control: s-maxage=3600, stale-while-revalidate=31532400  <h1>Hello (published v1)</h1> 
2) wrong secret
Invalid token   -> 401
3) correct secret
   HTTP/1.1 307 Temporary Redirect
   location: /posts/hello
   set-cookie: __prerender_bypass=772c63c34aa0985a8425a0f812b91638; Path=/; Secure; HttpOnly; SameSite=none
4) editor edits the draft in the CMS
edited
5) editor (with cookie) GET /posts/hello twice
   Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate x-nextjs-cache: HIT  Preview mode is on <h1>Hello (draft v3, edited just now)</h1> Preview mode is on 
   Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate x-nextjs-cache: HIT  Preview mode is on <h1>Hello (draft v3, edited just now)</h1> Preview mode is on 
6) visitor again
   x-nextjs-cache: HIT Cache-Control: s-maxage=3600, stale-while-revalidate=31532400  <h1>Hello (published v1)</h1> 
7) forged cookie value
   <h1>Hello (published v1)</h1> 
--- CMS requests during this run:
   [cms #2] POST /edit
   [cms #3] GET /preview/posts/hello
   [cms #4] GET /preview/posts/hello
\`\`\`

Reading it:

- Visitors were served the prerendered page and the CMS was never called for them.
- A wrong secret got a 401; the right one set a session cookie and redirected with a 307.
- The editor saw the draft edited a moment earlier, and the CMS log shows one fresh preview fetch per editor request: the caches were bypassed.
- The draft responses were marked \`private, no-cache, no-store\`. One surprise: the \`x-nextjs-cache\` header still said \`HIT\` on those draft responses, even though the body was fresh. Trust \`Cache-Control\` and the CMS log, not that header.
- A made-up cookie value was ignored.

In Chromium (Playwright), following the preview link and then clicking the exit button:

\`\`\`
after CMS preview link: /posts/hello | h1: Hello (draft v3, edited just now) | banner: 1
cookies: __prerender_bypass httpOnly=true secure=true sameSite=None expires=-1
after Exit preview: /posts/hello | h1: Hello (published v1) | banner: 0 | cookies left: 0
\`\`\`

\`expires=-1\` is a session cookie, matching the docs: the Draft Mode session ends when the browser closes.

## 6. Common Pitfalls

- **An unprotected enable route.** Without the secret check, anyone can bypass your cache, and every request they make hits the CMS.
- **Redirecting to the \`slug\` parameter.** That is an open redirect. Redirect to a path built from the CMS record.
- **Exiting with a \`<Link>\` to a GET route.** Prefetching can call it and clear the cookie early. Use a form with a Server Action.
- **Shipping the preview token to the browser.** Keep the draft fetch in a \`server-only\` module and the token in a non-\`NEXT_PUBLIC_\` variable.
- **Forgetting the banner.** Editors forget they are in preview and report "bugs" that are unpublished drafts.
- **Testing in a browser that blocks third-party cookies.** The cookie is \`SameSite=None; Secure\`, and the docs note that testing Draft Mode locally over HTTP needs the browser to allow third-party cookies and local storage access.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Draft Mode lets one browser bypass static generation and all caches so an editor can preview unpublished CMS content, while everyone else keeps the cached page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The CMS Preview button opens a Route Handler that checks a shared secret, calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(await draftMode()).enable()</code> to set the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__prerender_bypass</code> cookie, and redirects to the page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">You keep a fast static or ISR site for visitors and still give editors instant, accurate previews.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The page reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnabled</code> to fetch the CMS draft endpoint and show a preview banner with an exit button that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disable()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Never redirect to the raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slug</code> parameter, keep the secret server-side, and exit via a form or POST, because a prefetched GET link would clear the cookie early.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly is bypassed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The docs list the fetch cache, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'use cache'</code> scopes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unstable_cache</code> and the ISR response cache; the response gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can someone forge the cookie?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The value is regenerated on every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next build</code>, and in the lab a guessed value was ignored. The real gate is the shared secret on the enable route.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long does Draft Mode last?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The cookie is a session cookie, so it ends when the browser closes, or when you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disable()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do my data functions have to change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not if the CMS serves drafts at the same URL: the bypass is automatic. With a separate preview endpoint, branch on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnabled</code> as in the lab.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from on-demand revalidation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Revalidation updates the cache for everyone after publishing; Draft Mode shows unpublished content to one browser without touching the cache.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Headless CMS** | Content API with no front end of its own |
| **Draft Mode** | Per-browser switch that bypasses static output and caches |
| **\`__prerender_bypass\`** | The cookie that turns it on |
| **Preview URL** | The CMS link that opens the enable route |
| **Open redirect** | Redirecting to a URL taken from user input |

---
**Conclusion:** Draft Mode keeps a static or ISR site fast for visitors and gives editors live previews: a secret-checked Route Handler sets the \`__prerender_bypass\` cookie, and requests from that browser skip every cache and fetch the CMS draft, with \`private, no-cache\` headers and a banner to exit. With a simulated CMS on Next.js 16.4.2, visitors kept getting the prerendered page without touching the CMS, the editor saw a draft edited seconds earlier on every request, a forged cookie and a wrong secret were rejected, and the exit action cleared the cookie.`,
    examples: [
      {
        label: "Enable route, CMS data function and page with exit action",
        tech: "tsx",
        runnable: false,
        code: `// app/api/draft/route.ts
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getPost } from "@/lib/cms";

// The CMS "Preview" button opens /api/draft?secret=...&slug=hello in a new tab.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");
  if (secret !== process.env.DRAFT_SECRET || !slug) {
    return new Response("Invalid token", { status: 401 });
  }
  const post = await getPost(slug); // confirm the slug exists in the CMS
  if (!post) return new Response("Invalid slug", { status: 401 });
  (await draftMode()).enable();
  redirect(\`/posts/\${post.slug}\`); // redirect to a path we built, never to raw input
}

// lib/cms.ts
import "server-only";
import { draftMode } from "next/headers";

const CMS = process.env.CMS_URL ?? "http://localhost:4165";

export type Post = { slug: string; title: string };

export async function getPost(slug: string): Promise<Post | null> {
  const { isEnabled } = await draftMode();
  const res = isEnabled
    ? await fetch(\`\${CMS}/preview/posts/\${slug}\`, { headers: { authorization: \`Bearer \${process.env.CMS_PREVIEW_TOKEN}\` } })
    : await fetch(\`\${CMS}/published/posts/\${slug}\`, { next: { revalidate: 3600 } });
  return res.ok ? res.json() : null;
}

// app/posts/[slug]/page.tsx
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPost } from "@/lib/cms";

export function generateStaticParams() {
  return [{ slug: "hello" }];
}

async function exitPreview() {
  "use server";
  (await draftMode()).disable();
  redirect("/posts/hello");
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { isEnabled } = await draftMode();
  return (
    <main>
      {isEnabled && (
        <aside role="status">
          Preview mode is on. <form action={exitPreview}><button>Exit preview</button></form>
        </aside>
      )}
      <h1>{post.title}</h1>
      <p id="rendered-at">rendered at {new Date().toISOString()}</p>
    </main>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you keep secrets and server code out of the client bundle in Next.js (server-only, taint, Data Access Layer)?",
    seoDescription: "Secrets leak via Client Component props, client imports and SSR. Block them with server-only, a DAL returning DTOs and React taint. Tested on 16.4.2.",
    description: `**Question presented to candidate:**
"A security review found our Stripe secret key in the HTML of one page. In a Next.js App Router app, how can secrets and server-only code leak to the browser, and what layers would you put in place so it cannot happen again?"

**What a strong answer should cover:**
- The leak paths: props passed from a Server Component to a Client Component are serialized into the RSC payload and HTML; modules imported by a Client Component are bundled for the browser; a Client Component also renders on the server during prerendering, where \`process.env\` holds real values.
- Environment variables: only \`NEXT_PUBLIC_\` values are inlined into the browser bundle; everything else is server-only, but a Client Component that reads one can still put it into server-rendered HTML.
- \`import "server-only"\` turns "a Client Component imported this module" into a build error.
- A Data Access Layer: the only code that touches the database and secrets, does the authorization, and returns minimal DTOs instead of whole rows.
- React taint APIs (\`experimental.taint\`): \`experimental_taintObjectReference\` and \`experimental_taintUniqueValue\` make React throw if a marked object or value reaches a Client Component; they are a backstop, not the main defence (copies and derived values escape).

**Clarifying questions expected:**
- "How did the key get there: a prop, a client import or an env var read in a client file?" — each path has a different fix.
- "Is there a shared \`lib/\` imported by both server and client code?" — the main place \`server-only\` belongs.

**Code / implementation expected:** Yes — a \`server-only\` DAL that returns a DTO, and a taint example.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser. The secrets in the lab are fake strings such as \`sk_live_DO_NOT_LEAK_123\`.

## 1. Why This Even Matters — A Story First

A restaurant kitchen and dining room share one building. The kitchen has the knives, the gas and the supplier price list; the dining room gets plates of food. Nothing is wrong with sharing a building, as long as nobody carries the price list out on a plate by accident, and nobody sets up a stove in the dining room.

A Next.js App Router app is that building. Server Components are the kitchen and Client Components are the dining room, and because both live in one codebase it is easy to carry something across by accident: a whole database row passed as a prop, a server helper imported into a client file, an environment variable read in the wrong place. The tools in this question are the kitchen door rules.

## 2. The Core Idea

📌 **Interview term: Server-client boundary** — the line between code that runs only on the server and code that is sent to the browser. Everything that crosses it as a prop is serialized into the RSC payload and the HTML. The mechanics are in [passing data from Server to Client Components](/interview-question/how-do-you-pass-data-from-server-components-to-client-components-in-next-js).

📌 **Interview term: \`server-only\`** — a marker import (\`import "server-only"\`) for modules that must never be bundled for the client. Next.js handles it internally (installing the npm package is optional) and fails the build if a Client Component imports the module.

📌 **Interview term: Data Access Layer (DAL)** — an internal server-only library that is the only code allowed to read the database and secrets, performs authorization, and returns small **DTOs**. The 16.4.2 data-security guide recommends it for new projects.

📌 **Interview term: DTO (Data Transfer Object)** — a plain object with only the fields a caller needs, for example \`{ name }\` instead of a full user row with a password hash.

📌 **Interview term: Taint** — React APIs that mark an object or a value as "must not reach a Client Component". If it does, rendering throws. Enabled in Next.js with \`experimental.taint\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="Leak paths: props to client components, client imports of server modules, env vars read in client components">
  <defs>
    <marker id="nx14q6a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three ways a secret reaches the browser</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">Props</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">Server passes value</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">to Client Component</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">serialized in payload</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q6a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="330" y="78" text-anchor="middle">Imports</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">client file imports</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">a server module</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">bundled for browser</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q6a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="551" y="78" text-anchor="middle">SSR of client code</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">client component</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">reads process.env</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">value in the HTML</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">props: DTOs and taint    imports: server-only    env: NEXT_PUBLIC_ only in client files</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">lab: all three leak paths reproduced, and each guard blocked its path</text>
  </g>
</svg>

Each path has its own guard. No single tool covers all three, which is why the answer is "layers".

## 3. The Layers, From Strongest to Backstop

**Layer 1: environment variables.** Only variables prefixed with \`NEXT_PUBLIC_\` are inlined into the browser bundle; the rest are server-only ([the \`NEXT_PUBLIC_\` rules](/interview-question/how-do-environment-variables-work-in-next-js-the-next-public-prefix)). The catch the lab found: a Client Component also runs on the server during prerendering, where \`process.env.API_SECRET_KEY\` is the real value. Read a secret in a client file and it is absent from the JavaScript, but present in the server-rendered HTML. Rule: never read secret variables in a \`"use client"\` file, and have only the DAL read them at all.

**Layer 2: \`server-only\`.** Put \`import "server-only"\` at the top of every module that touches secrets, the database or private business logic. If anyone imports it into a [Client Component](/interview-question/what-is-the-use-client-directive-and-when-do-you-need-it), even indirectly, \`next build\` fails with an import trace. The matching \`client-only\` marker does the reverse for code that needs \`window\`.

**Layer 3: a Data Access Layer returning DTOs.** Pages never query the database directly; they call functions such as \`getUserDTO(id)\`, which check permissions and return \`{ name }\`. Then even a careless \`<Profile user={user} />\` only ships what the DTO contains. The docs' advice is to choose one data approach (external HTTP APIs, a DAL, or component-level queries for prototypes) and not mix them, so reviewers know where to look.

**Layer 4: taint, as a backstop.**

| API | Marks | Lab result when it reached a Client Component |
| :--- | :--- | :--- |
| \`experimental_taintObjectReference(message, obj)\` | One object reference, such as a user row | Render threw with the message; HTTP 500 |
| \`experimental_taintUniqueValue(message, lifetime, value)\` | A specific string or bigint, such as an API key | Render threw with the message; HTTP 500 |
| Built in with \`experimental.taint\` | The \`process.env\` object itself | "Do not pass process.env to Client Components since it will leak sensitive data" |

The 16.4.2 docs list its limits, and the lab hit one: taint tracks references, so a copy (\`{ ...row }\`), a destructured rest object or a derived string like \`\` \`version::\${key}\` \`\` is not tainted. The docs also warn not to rely on taint as the only mechanism. Enabling the flag also switches the \`app\` directory to React's experimental channel, which is worth knowing before you turn it on in production.

**What is blocked without any setup.** Plain functions cannot be passed to Client Components at all (React throws), and classes are blocked too, per the docs. Only Server Actions cross the boundary as callable references, and those are public endpoints with their own [security rules](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js).

## 4. Where Each Mistake Gets Caught

| Mistake | Caught by | When |
| :--- | :--- | :--- |
| Client file imports \`lib/billing.ts\` | \`server-only\` | Build time |
| \`<Show apiKey={process.env.KEY} />\` from a Server Component | Taint on the value (if you tainted it) or code review | Request time, or never |
| \`<Profile user={row} />\` with every column | DAL returning DTOs; taint on the row | Design time; request time |
| \`process.env.KEY\` read inside a \`"use client"\` file | Nothing automatic; a lint rule or review | Never: it ships in HTML |
| \`<Show env={process.env} />\` | Built-in \`process.env\` taint (with \`experimental.taint\`) | Request time |
| Passing a function as a prop | React itself | Request time |

## 5. Verified — Reproducing Each Leak (Next.js 16.4.2)

**\`server-only\` in a client import graph.** A Client Component \`pay-button.tsx\` imports \`lib/billing.ts\`, which starts with \`import "server-only"\`. \`next build\` failed with two errors (colour codes removed, trimmed):

\`\`\`
> Build error occurred
Error: Turbopack build failed with 2 errors:
./next/n14/app3a/lib/billing.ts:1:1
Error: You're importing a module that depends on "server-only". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.
...
./next/n14/app3a/lib/billing.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module
> 1 | import "server-only";
...
It should only be used from a Server Component.

Import traces:
  Client Component Browser:
    ./next/n14/app3a/lib/billing.ts [Client Component Browser]
    ./next/n14/app3a/app/pay-button.tsx [Client Component Browser]
    ./next/n14/app3a/app/pay-button.tsx [Server Component]
    ./next/n14/app3a/app/page.tsx [Server Component]
\`\`\`

The first message mentions the Pages Router even though this app has none; the second message and the import trace are the useful ones.

**Props and taint.** A second app with \`experimental.taint: true\` (the build prints \`✓ taint\` under "Experiments"). Each page renders a Client Component \`Show\` that prints its prop names; the script counts the fake secrets in the full HTML response and prints the server log line:

\`\`\`
/leak         -> 200  props=["apiKey"]  sk_live in response: 1  tok_SECRET in response: 0
/taint-value  -> 500  props=  sk_live in response: 0  tok_SECRET in response: 0
      log: ⨯ Error: Do not pass the API key to the client.
/taint-object -> 500  props=  sk_live in response: 0  tok_SECRET in response: 0
      log: ⨯ Error: Do not pass a whole user row to the client; pick fields in a DTO.
/taint-copy   -> 200  props=["user"]  sk_live in response: 0  tok_SECRET in response: 0
/env-whole    -> 500  props=  sk_live in response: 0  tok_SECRET in response: 0
      log: ⨯ Error: Do not pass process.env to Client Components since it will leak sensitive data
/fn-prop      -> 500  props=  sk_live in response: 0  tok_SECRET in response: 0
      log: ⨯ Error: Event handlers cannot be passed to Client Component props.
/dto          -> 200  props=["user"]  sk_live in response: 0  tok_SECRET in response: 0
/env-client   -> 200  props=public=pub_analytics_456 secret=sk_live_DO_NOT_LEAK_123  sk_live in response: 1  tok_SECRET in response: 0
\`\`\`

- \`/leak\`: an untainted secret passed as a prop is in the response. Nothing stops it.
- \`/taint-value\` and \`/taint-object\`: the same mistakes with tainted data fail loudly with the messages from the DAL.
- \`/taint-copy\`: a rest-spread copy of the tainted row (without the token) was accepted, which is the documented "copies are untainted" caveat. Here it happened to be safe because the token was removed; with the hash still in the copy it would have leaked.
- \`/env-client\`: a \`"use client"\` component reading \`API_SECRET_KEY\` put the real value into the prerendered HTML.

Where the values ended up in the build output, and what the browser did with that page:

\`\`\`
files in .next/static containing the value:
  sk_live_DO_NOT_LEAK_123: 0
  pub_analytics_456: 1
\`\`\`

\`\`\`
i(84769);e.s(["default",0,function(){return(0,i.jsxs)("p",{children:["public=","pub_analytics_456"," secret=",t.default.env.API_SECRET_KEY??"undefined"]})}])}]);
\`\`\`

\`\`\`
after hydration the <p> reads: public=pub_analytics_456 secret=undefined
  browser pageerror: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors a
\`\`\`

So the \`NEXT_PUBLIC_\` value was inlined as a literal, while the secret stayed out of every browser chunk (the chunk keeps a runtime lookup that evaluates to \`undefined\`). But the server-rendered HTML already contained the secret, and the mismatch caused a [hydration error](/interview-question/what-is-hydration-in-next-js-and-what-causes-a-hydration-error) (#418). The bundle was clean; the page was not.

## 6. Common Pitfalls

- **Passing whole rows or config objects as props.** Every field is serialized. Return DTOs from the DAL.
- **Reading secret env vars in a \`"use client"\` file.** Not in the bundle, but in the SSR HTML, as the lab showed.
- **Shared \`lib/\` files without \`server-only\`.** One innocent client import later bundles your database client or leaks logic; the marker turns that into a build error.
- **Treating taint as the main defence.** Copies and derived values are not tracked. It catches honest mistakes, not design problems.
- **Assuming Server Action code is private.** The code is, but the endpoint is public: validate input and check permissions inside every action.
- **Putting secrets in \`NEXT_PUBLIC_\` "just for now".** They are inlined at build time and live in every copy of the bundle.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Keep secrets in modules that only the server can import, and send the client only small, explicit objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import "server-only"</code> makes a client import a build error, a Data Access Layer returns DTOs instead of rows, and only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NEXT_PUBLIC_</code> variables reach the browser bundle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Anything passed as a prop to a Client Component is serialized into the page, so one careless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user={row}</code> ships every column.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">React taint (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental.taint</code>) is a backstop: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental_taintUniqueValue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">experimental_taintObjectReference</code> make rendering throw if marked data reaches a Client Component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Client Components also render on the server: reading a non-public env var in one leaked the real value into the HTML in the lab.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a non-<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NEXT_PUBLIC_</code> variable safe to read in a Client Component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not fully. It is absent from the browser bundle, but the server-side render of that component sees the real value, and in the lab it ended up in the HTML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">server-only</code> actually do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing at runtime; Next.js handles the import itself and fails the build when the module is pulled into a Client Component graph.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not rely on taint alone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It tracks references only: a copy like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{...user}</code> or a derived string like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version::\${key}</code> is untainted and passes. Model DTOs instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are functions safe to pass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain functions cannot be passed to Client Components at all; React throws. Only Server Actions can cross the boundary as callable references.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What belongs in a Data Access Layer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">All database and secret access, the authorization checks, and the mapping to minimal DTOs; it should be the only code that reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">process.env</code> secrets.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server-client boundary** | Where props get serialized for the browser |
| **\`server-only\`** | Import that fails the build if a Client Component pulls the module in |
| **Data Access Layer** | The only code that touches data and secrets |
| **DTO** | Minimal object with only the fields the UI needs |
| **Taint** | React marking of data that must not reach the client |
| **\`NEXT_PUBLIC_\`** | Prefix that inlines a variable into the browser bundle |

---
**Conclusion:** Secrets leak in three ways: as props, through client imports, and through the server render of Client Components. The defence is layered: only \`NEXT_PUBLIC_\` values in client code, \`import "server-only"\` on every sensitive module, a Data Access Layer that authorizes and returns DTOs, and React taint as a loud backstop. On Next.js 16.4.2 the lab reproduced each leak, saw \`server-only\` fail the build, saw tainted values and \`process.env\` throw at render time, and found that a secret read in a Client Component stayed out of the JavaScript bundle but still appeared in the server-rendered HTML.`,
    examples: [
      {
        label: "Data Access Layer with server-only, DTOs and taint",
        tech: "ts",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    taint: true, // enables React experimental_taint* APIs (and the React experimental channel for app/)
  },
};
export default nextConfig;

// lib/dal.ts
import "server-only";
import { experimental_taintObjectReference, experimental_taintUniqueValue } from "react";
import { queryUser } from "./db";

// Data Access Layer: the only place that touches the DB and process.env.
export async function getUserRow(id: string) {
  const row = await queryUser(id);
  experimental_taintObjectReference("Do not pass a whole user row to the client; pick fields in a DTO.", row);
  experimental_taintUniqueValue("Do not pass the session token to the client.", row, row.sessionToken);
  return row;
}

export type UserDTO = { name: string };
export async function getUserDTO(id: string): Promise<UserDTO> {
  const row = await getUserRow(id);
  return { name: row.name }; // only what the UI needs
}

export function getApiKey() {
  const key = process.env.API_SECRET_KEY!;
  experimental_taintUniqueValue("Do not pass the API key to the client.", globalThis, key);
  return key;
}

// app/dto/page.tsx
import { connection } from "next/server";
import { getUserDTO } from "@/lib/dal";
import Show from "../show";
export default async function Page() {
  await connection();
  const user = await getUserDTO("u1");
  return <Show user={user} />;
}`,
      },
      {
        label: "The mistakes the lab reproduced",
        tech: "tsx",
        runnable: false,
        code: `// app/pay-button.tsx (build error: server-only module in a Client Component)
"use client";
import { chargeCard } from "@/lib/billing"; // mistake: server module imported into a Client Component

export default function PayButton() {
  return <button onClick={() => chargeCard(500)}>Pay</button>;
}

// app/leak/page.tsx (untainted secret passed as a prop: leaks)
import { connection } from "next/server";
import Show from "../show";
export default async function Page() {
  await connection();
  // Untainted secret passed as a prop: nothing stops this.
  return <Show apiKey={process.env.API_SECRET_KEY} />;
}

// app/env-client/env-client.tsx (secret read in a Client Component: in the SSR HTML)
"use client";
export default function EnvClient() {
  return (
    <p>
      public={process.env.NEXT_PUBLIC_ANALYTICS_ID ?? "undefined"} secret={process.env.API_SECRET_KEY ?? "undefined"}
    </p>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle file uploads in Next.js with Server Actions and Route Handlers?",
    seoDescription: "Upload files via a Server Action (FormData, 1 MB default body limit) or a Route Handler (formData or a streamed body). Tested on Next.js 16.4.2.",
    description: `**Question presented to candidate:**
"Users need to upload an avatar (a few hundred KB) and, elsewhere, video files of up to 50 MB. How would you handle file uploads in a Next.js App Router app, and when would you use a Server Action versus a Route Handler?"

**What a strong answer should cover:**
- A \`<form>\` with \`<input type="file" name="file">\` posting to a Server Action: the action receives \`FormData\`, \`formData.get("file")\` is a \`File\`, and the form works with progressive enhancement.
- Server Action bodies are limited to 1 MB by default (\`experimental.serverActions.bodySizeLimit\`), and the limit includes multipart overhead; over it the action fails with "Body exceeded 1 MB limit".
- Route Handlers have no such built-in limit: \`await request.formData()\` for small files, or stream \`request.body\` to storage for large ones so the whole file is never held in memory.
- Validation on the server: type allow-list, size limit, generated file names (never trust \`file.name\` for a path), authorization inside the action or handler.
- For large or many files, prefer direct-to-storage uploads (presigned URLs) so the bytes do not pass through the Next.js server at all.

**Clarifying questions expected:**
- "Where do files end up: local disk, S3-compatible storage, a CDN?" — local disk does not work on serverless or across instances.
- "How large, and do users need progress bars or resumable uploads?" — decides form + action vs direct-to-storage.

**Code / implementation expected:** Yes — a Server Action upload with \`useActionState\`, a \`request.formData()\` Route Handler, and a streaming Route Handler.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output from a build, a running server or a real Chromium browser. Files were written to local disk in the lab; cloud storage, presigned URLs and serverless platform limits were not tested.

## 1. Why This Even Matters — A Story First

A post office has a letter slot, a parcel counter and a loading dock. Letters drop through the slot in a second. Parcels go to the counter, where someone weighs them and checks what is inside. A lorry of furniture does not go through the front door at all; it backs up to the dock. Trying to push a sofa through the letter slot breaks the slot, and making every letter queue at the loading dock is absurd.

File uploads in Next.js have the same three doors. A Server Action is the letter slot: perfect for an avatar, and deliberately narrow (1 MB by default). A Route Handler is the counter: you see the whole request and set your own rules. A streamed or direct-to-storage upload is the loading dock for large files.

## 2. The Core Idea

📌 **Interview term: \`multipart/form-data\`** — the request encoding a browser uses when a form contains a file input. The body is split into parts separated by a boundary string, one part per field.

📌 **Interview term: \`FormData\` and \`File\`** — the Web APIs that represent that body on the server. \`formData.get("file")\` returns a \`File\` with \`name\`, \`type\`, \`size\` and \`arrayBuffer()\`.

📌 **Interview term: Body size limit** — the maximum request size the server will parse. For Server Actions it is 1 MB by default, configurable with \`experimental.serverActions.bodySizeLimit\`; the docs note the limit applies to the raw body including multipart boundaries and part headers.

📌 **Interview term: Streaming upload** — reading the request body chunk by chunk and writing each chunk to storage, so memory use stays flat no matter how big the file is. See [streams in Node.js](/interview-question/what-are-node-js-streams-and-when-would-you-use-them).

📌 **Interview term: Presigned URL** — a short-lived URL from your storage provider that lets the browser upload straight to storage, so the bytes never pass through your Next.js server.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="Small files go through a Server Action, medium through a Route Handler, large stream or go direct to storage">
  <defs>
    <marker id="nx14q7a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Pick the path by file size</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">Server Action</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">form + FormData</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">1 MB body limit</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">avatars, documents</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q7a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="330" y="78" text-anchor="middle">Route Handler</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">request.formData()</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">no built-in limit</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">you enforce one</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q7a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="551" y="78" text-anchor="middle">Stream or direct</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">pipe request.body</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">or presigned URL</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">videos, big files</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">always: type allow-list, size check, generated file name, auth check</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">local disk only works for a single long-running server</text>
  </g>
</svg>

## 3. The Three Patterns

**Pattern 1: Server Action (small files).** A form with a file input posts to an action. With \`useActionState\` the result comes back into the component, and the form still submits without JavaScript, which is the [progressive enhancement](/interview-question/how-do-you-handle-forms-with-server-actions-in-next-js-progressive-enhancement) benefit. Under the hood the browser sends a \`multipart/form-data\` POST with a \`next-action\` header (the lab saw both). The 1 MB default limit is the main constraint; if you raise it, the docs suggest leaving 10 to 20 KB of headroom for multipart overhead.

**Pattern 2: Route Handler with \`request.formData()\` (medium files, API clients).** Same validation, but you control the status codes (201, 400, 413) and any client can call it: \`curl -F\`, mobile apps, other services. There is no built-in body limit here: a 20 MB multipart body was accepted by a handler with no checks in the lab. That is flexibility and a risk, so check \`content-length\` early and the real \`file.size\` after parsing. \`formData()\` still buffers the whole file in memory.

**Pattern 3: stream \`request.body\` (large files).** For a raw-body upload (\`PUT\` with the file as the body), convert the Web stream with \`Readable.fromWeb\`, count bytes in a \`Transform\`, and \`pipeline\` it into a write stream or a storage SDK. Abort and delete the partial file when the count passes your limit. For multipart bodies that must be streamed, a streaming parser such as busboy is the usual tool; see [streaming multipart uploads in Node.js](/interview-question/how-do-you-handle-streaming-multipart-file-uploads-busboy-multer).

**Pattern 4 (the loading dock): direct to storage.** For videos and bulk uploads, a Route Handler or Server Action checks permissions and returns a presigned URL; the browser uploads to storage directly, then tells your app the object key. The 16.4.2 backend-for-frontend guide says the same: "Store user-generated static assets in dedicated services. When possible, upload them from the browser and store the returned URI in your database to reduce request size."

| | Server Action | Route Handler + \`formData()\` | Streamed Route Handler | Direct to storage |
| :--- | :--- | :--- | :--- | :--- |
| Default size limit | 1 MB | None built in | None built in | Provider limit |
| Memory | Whole body | Whole body | One chunk at a time | None on your server |
| Works without JS | Yes | Only as a plain form POST | No | No |
| Callable by other clients | Not designed for it | Yes | Yes | Yes |
| Progress events | No | With \`XMLHttpRequest\` | With \`XMLHttpRequest\` | Usually, via the SDK |

For the general split between the two server entry points, see [Server Actions vs Route Handlers](/interview-question/how-do-server-actions-differ-from-route-handlers-in-next-js).

## 4. Validation Checklist (Every Pattern)

- **Authorize first.** A Server Action is a public POST endpoint; check the session inside it, not just on the page ([Server Action security](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js)).
- **Allow-list types**, and treat \`file.type\` as a client claim. For sensitive uploads, check magic bytes.
- **Enforce your own size limit** below the framework limit, so users get a clear message instead of a crash.
- **Generate the file name** (\`randomUUID()\` plus an extension from your allow-list). A client-supplied \`../../etc/passwd\` must never reach \`path.join\`.
- **Serve uploads safely**: from storage or a separate domain, with \`X-Content-Type-Options: nosniff\`.

## 5. Verified — Limits and Validation (Next.js 16.4.2)

Test files: \`small.png\` (50,008 bytes), \`notes.txt\` (5 bytes), \`medium.png\` (900,008 bytes, above the lab's own 800 KB rule but under 1 MB), \`big.png\` (2,000,008 bytes), \`large.bin\` (20 MB) and \`huge.bin\` (60 MB). Build output for the routes:

\`\`\`
├ ƒ /api/upload
├ ƒ /api/upload-nolimit
├ ƒ /api/upload-stream
└ ○ /upload
\`\`\`

**Route Handlers with \`curl\`:**

\`\`\`
Route Handler (multipart) POST /api/upload
  small.png      50008 bytes -> {"ok":true,"name":"7e0e95c3-ac8b-4dec-abe2-54db26f7c8c9.png","bytes":50008}  [201]
  notes.txt          5 bytes -> {"ok":false,"error":"Type text/plain not allowed"}  [400]
  medium.png    900008 bytes -> {"error":"Payload too large"}  [413]
  big.png      2000008 bytes -> {"error":"Payload too large"}  [413]
Route Handler (streamed raw body) PUT /api/upload-stream
  large.bin   20971520 bytes -> {"ok":true,"bytes":20971520}  [201]
  huge.bin    62914560 bytes -> {"error":"Too large (over 52428800 bytes)"}  [413]
\`\`\`

And a handler with no checks at all, to show that Route Handlers have no framework limit:

\`\`\`
  multipart big.png      2000008 bytes -> {"received":2000008}  [200]
  multipart large.bin   20971520 bytes -> {"received":20971520}  [200]
\`\`\`

**Server Action in Chromium (Playwright),** choosing each file and submitting the \`useActionState\` form:

\`\`\`
   POST /upload -> 200 (next-action header: yes, content-type: multipart/form-data)
small.png: #result = saved 7039b9e4-7e77-4c93-b244-58a45e0e72f8.png (50008 bytes) | h2 = -
   POST /upload -> 200 (next-action header: yes, content-type: multipart/form-data)
notes.txt: #result = error: Type text/plain not allowed | h2 = -
   POST /upload -> 200 (next-action header: yes, content-type: multipart/form-data)
medium.png: #result = error: Too large: 900008 bytes | h2 = -
   POST /upload -> 500 (next-action header: yes, content-type: multipart/form-data)
   browser pageerror: Minified React error #441; visit https://react.dev/errors/441 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
big.png: #result = (not found) | h2 = -
\`\`\`

Server log for the 2 MB action:

\`\`\`
⨯ Error: Body exceeded 1 MB limit.
To configure the body size limit for Server Actions, see: https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit
    at ignore-listed frames {
  statusCode: 413,
  digest: '4228068985'
}
\`\`\`

What the user saw after that submit:

\`\`\`
visible text: This page couldn’t load A server error occurred. Reload to try again. Reload ERROR 4228068985
\`\`\`

So under 1 MB, your own validation decides and the user gets a friendly message. Over 1 MB, the action never runs: the server rejects the body (413 internally, 500 to the browser) and, without an error boundary, the whole page is replaced by the error screen. Check \`file.size\` in the browser before submitting, and add an \`error.tsx\`.

## 6. Common Pitfalls

- **Assuming Server Actions take any size.** The default is 1 MB including multipart overhead, and the failure is a page-level error, not a validation message.
- **Assuming Route Handlers are limited too.** They are not; without your own check, a client can send as much as your server will buffer.
- **Buffering big files with \`arrayBuffer()\`.** 50 MB times ten concurrent users is 500 MB of memory. Stream, or upload directly to storage.
- **Using the client file name as the path.** Path traversal and overwrites. Generate names.
- **Writing to local disk in production.** Serverless filesystems are temporary and each instance has its own; use object storage.
- **Checking auth only on the upload page.** The action and the handler must verify the session themselves.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Small files: a form posting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormData</code> to a Server Action; bigger files: a Route Handler that streams the body; very large files: upload straight to storage with a presigned URL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">In the action or handler, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">formData.get("file")</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">File</code>; check its type and size, generate a name, and write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await file.arrayBuffer()</code> to storage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Server Actions give progressive enhancement and simple code, but their body is limited to 1 MB by default; Route Handlers have no built-in limit, so you must add your own.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverActions.bodySizeLimit</code> only a little and leave room for multipart overhead; for 50 MB videos, stream <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">request.body</code> to disk or storage instead of buffering.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Never trust the client: not the file name, not the declared type, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">content-length</code>; and check the session inside the action, which is a public endpoint.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens above the Server Action limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The server logs "Body exceeded 1 MB limit." with status 413 internally, the browser got a 500 and the page showed the error screen in the lab. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">file.size</code> on the client first for a friendly message.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bodySizeLimit</code> to 100 MB?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The body is parsed in memory, so large limits invite memory exhaustion and slow requests; stream large files or upload them directly to storage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I show upload progress with a Server Action?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with the built-in form flow. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">XMLHttpRequest</code> upload events against a Route Handler, or a storage SDK with progress for direct uploads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">file.type</code> trustworthy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it comes from the client. Treat it as a hint and, for sensitive cases, check the file signature (magic bytes) on the server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should the files go in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object storage (S3-compatible, Vercel Blob and so on). Local disk breaks on serverless and with several instances, because each has its own filesystem.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`multipart/form-data\`** | Request encoding for forms with files |
| **\`FormData\` / \`File\`** | Web APIs for reading those fields and files |
| **\`bodySizeLimit\`** | Server Action body limit, 1 MB by default |
| **Streaming upload** | Writing the body chunk by chunk |
| **Presigned URL** | Short-lived URL for uploading straight to storage |

---
**Conclusion:** Choose the upload path by size. Server Actions are the simplest for small files and work without JavaScript, but cap the body at 1 MB by default; Route Handlers have no built-in cap, so they need your own checks, and streaming \`request.body\` keeps memory flat for large files; for very large files, upload directly to storage. On Next.js 16.4.2 the lab showed validation messages for wrong types and sizes, a 2 MB action failing with "Body exceeded 1 MB limit" and an error screen, a Route Handler accepting 20 MB with no checks, and a streamed handler accepting 20 MB while rejecting 60 MB.`,
    examples: [
      {
        label: "Server Action upload with useActionState",
        tech: "tsx",
        runnable: false,
        code: `// lib/files.ts
import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["application/pdf", "pdf"]]);
export const MAX_BYTES = 800 * 1024; // our own rule, below the 1 MB Server Action body limit

export type UploadResult = { ok: true; name: string; bytes: number } | { ok: false; error: string };

export async function saveUpload(entry: FormDataEntryValue | null): Promise<UploadResult> {
  if (!(entry instanceof File) || entry.size === 0) return { ok: false, error: "No file" };
  const ext = ALLOWED.get(entry.type);
  if (!ext) return { ok: false, error: \`Type \${entry.type || "unknown"} not allowed\` };
  if (entry.size > MAX_BYTES) return { ok: false, error: \`Too large: \${entry.size} bytes\` };
  const bytes = Buffer.from(await entry.arrayBuffer());
  const name = \`\${randomUUID()}.\${ext}\`; // never trust entry.name for the path
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return { ok: true, name, bytes: bytes.length };
}

// app/upload/actions.ts
"use server";
import { saveUpload, type UploadResult } from "@/lib/files";

export async function uploadAction(_prev: UploadResult | null, formData: FormData): Promise<UploadResult> {
  // Real app: verify the session here first; a Server Action is a public POST endpoint.
  return saveUpload(formData.get("file"));
}

// app/upload/upload-form.tsx
"use client";
import { useActionState } from "react";
import { uploadAction } from "./actions";

export default function UploadForm() {
  const [result, formAction, pending] = useActionState(uploadAction, null);
  return (
    <form action={formAction}>
      <input type="file" name="file" accept="image/png,image/jpeg,application/pdf" />
      <button disabled={pending}>{pending ? "Uploading..." : "Upload"}</button>
      <p id="result">{result ? (result.ok ? \`saved \${result.name} (\${result.bytes} bytes)\` : \`error: \${result.error}\`) : "idle"}</p>
    </form>
  );
}`,
      },
      {
        label: "Route Handlers: FormData and a streamed body",
        tech: "ts",
        runnable: false,
        code: `// app/api/upload/route.ts
import { saveUpload, MAX_BYTES } from "@/lib/files";

export async function POST(request: Request) {
  // Cheap early rejection before parsing anything (the header can lie, so saveUpload checks again).
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 20_000) return Response.json({ error: "Payload too large" }, { status: 413 });
  const form = await request.formData();
  const result = await saveUpload(form.get("file"));
  return Response.json(result, { status: result.ok ? 201 : 400 });
}

// app/api/upload-stream/route.ts
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { UPLOAD_DIR } from "@/lib/files";

const LIMIT = 50 * 1024 * 1024; // 50 MB for this endpoint

// Raw body upload (PUT a file as the body): streamed to disk, never held in memory whole.
export async function PUT(request: Request) {
  if (!request.body) return Response.json({ error: "No body" }, { status: 400 });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const file = path.join(UPLOAD_DIR, \`\${randomUUID()}.bin\`);
  let bytes = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length;
      cb(bytes > LIMIT ? new Error("limit") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), counter, createWriteStream(file));
  } catch {
    await unlink(file).catch(() => {});
    return Response.json({ error: \`Too large (over \${LIMIT} bytes)\` }, { status: 413 });
  }
  return Response.json({ ok: true, bytes }, { status: 201 });
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you test a Next.js app (unit tests, Server Components, end-to-end)?",
    seoDescription: "Test Next.js with Vitest (components, Server Actions, Route Handlers, proxy) and Playwright on next start for async Server Components. Run on 16.4.2.",
    description: `**Question presented to candidate:**
"You join a team with a Next.js App Router app and zero tests. How would you set up testing: what do you unit test, how do you deal with async Server Components, and where do end-to-end tests fit?"

**What a strong answer should cover:**
- The test pyramid for Next.js: unit tests (Vitest or Jest) for pure logic, Client Components, Server Actions and Route Handlers; end-to-end tests (Playwright or Cypress) for real flows against a production build.
- Async Server Components are not supported by Vitest/React Testing Library rendering; the docs recommend E2E for them. A simple one can be called as a function (\`render(await Page())\`), but nested async children do not render.
- Server Actions and Route Handlers are plain async functions: call them directly with a \`FormData\` or a \`Request\`, and mock \`next/cache\`, the data layer and other framework modules.
- Proxy can be unit tested with \`next/experimental/testing/server\` helpers (matcher checks, \`getRedirectUrl\`).
- E2E against \`next build\` + \`next start\` (Playwright \`webServer\`), not \`next dev\`, so caching, prefetching and streaming behave as in production.

**Clarifying questions expected:**
- "Which flows break most or cost the most when they break?" — those get E2E tests first.
- "Is there a data layer to mock, or do components query the database directly?" — a DAL makes unit tests much easier.

**Code / implementation expected:** Yes — a Vitest config, a component test, a Server Action or Route Handler test, and one Playwright spec.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.4.2 docs shipped with the package and, in the **Verified** section, against real output: every test shown here was run, with vitest 5.0.5, @testing-library/react 16.3.3, jsdom 29.1.1 and @playwright/test 1.64.1 against next 16.4.2 and react 19.3.1.

## 1. Why This Even Matters — A Story First

A car factory tests at several levels. Each bolt and sensor is checked on a bench (cheap, fast, thousands a day). Assembled parts, like a whole door, are tested on a rig. And a few finished cars are driven around a real track, because some problems, like a rattle at 80 km/h, only appear when everything runs together.

A Next.js app needs the same split. Pure functions and Client Components are bolts: test them on the bench with Vitest. Server Actions and Route Handlers are parts with clear inputs and outputs: call them directly. And async Server Components, caching, streaming and navigation only really happen on the track: a production build in a real browser.

## 2. The Core Idea

📌 **Interview term: Unit test** — a test of one function or component in isolation, with its dependencies replaced by fakes. Fast and precise.

📌 **Interview term: End-to-end (E2E) test** — a test that drives the real app in a real browser, the way a user would. Slower, but it covers the whole stack.

📌 **Interview term: Mock** — a fake replacement for a module, such as the database layer or \`next/cache\`, so a unit test does not need the real thing. In Vitest: \`vi.mock()\`.

📌 **Interview term: Async Server Component** — a component declared \`async function Page()\` that awaits data on the server. The 16.4.2 testing docs: "Since \`async\` Server Components are new to the React ecosystem, some tools do not fully support them. In the meantime, we recommend using End-to-End Testing over Unit Testing for \`async\` components." See [what React Server Components are](/interview-question/what-are-react-server-components-and-why-does-next-js-use-them).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 318" role="img" aria-label="Unit tests for logic and client components, function calls for actions and handlers, end to end for async server components">
  <defs>
    <marker id="nx14q8a-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What to test with which tool</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="109" y="78" text-anchor="middle">Unit (Vitest + RTL)</text>
    <text class="d-sub" x="109" y="106" text-anchor="middle">pure functions</text>
    <text class="d-sub" x="109" y="130" text-anchor="middle">Client Components</text>
    <text class="d-sub" x="109" y="154" text-anchor="middle">sync Server Comps</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 196 114 L 242 114" marker-end="url(#nx14q8a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 196 114 L 242 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="245" y="48" width="169" height="132" rx="10"/>
    <text class="d-text" x="330" y="78" text-anchor="middle">Call as a function</text>
    <text class="d-sub" x="330" y="106" text-anchor="middle">Server Actions</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">Route Handlers</text>
    <text class="d-sub" x="330" y="154" text-anchor="middle">proxy matcher</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 418 114 L 464 114" marker-end="url(#nx14q8a-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 418 114 L 464 114"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="467" y="48" width="169" height="132" rx="10"/>
    <text class="d-text d-accent" x="551" y="78" text-anchor="middle">End to end</text>
    <text class="d-sub" x="551" y="106" text-anchor="middle">Playwright</text>
    <text class="d-sub" x="551" y="130" text-anchor="middle">next build + start</text>
    <text class="d-sub" x="551" y="154" text-anchor="middle">async RSC, flows</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="220" width="612" height="74" rx="10"/>
    <text class="d-sub" x="330" y="246" text-anchor="middle">lab: 10 Vitest tests and 4 Playwright tests, all passing on next 16.4.2</text>
    <text class="d-sub" x="330" y="268" text-anchor="middle">mock the data layer and next/cache in unit tests; mock nothing in E2E</text>
  </g>
</svg>

## 3. What Goes Where

| What | How to test | Tool | Notes |
| :--- | :--- | :--- | :--- |
| Pure helpers (parsers, formatters) | Call them | Vitest | The cheapest, most valuable tests |
| Client Components | Render, fire events, assert | Vitest + React Testing Library, \`jsdom\` | Mock \`next/navigation\` if they use the router |
| Synchronous Server Components | Render like any component | Vitest + RTL | Works because they are ordinary functions |
| Async Server Components | E2E; or \`render(await Page())\` for a flat one | Playwright | Nested async children do not render in RTL |
| Server Actions | Call with a \`FormData\` | Vitest, \`node\` environment | Mock \`next/cache\`, the DAL, \`next/headers\` |
| Route Handlers | Call \`GET(new Request(url))\` | Vitest, \`node\` environment | Assert \`status\` and \`await res.json()\` |
| \`proxy.ts\` | Matcher helper and calling \`proxy()\` | \`next/experimental/testing/server\` | Experimental helpers |
| Navigation, caching, streaming, auth flows | Real browser on \`next start\` | Playwright (or Cypress) | Test the production build |

**Why Server Actions and Route Handlers are easy.** Strip away the framework and they are async functions: an action takes \`(prevState, formData)\` and returns a value; a handler takes a \`Request\` and returns a \`Response\`. Call them, and mock the framework functions they call (\`revalidatePath\`, \`cookies()\`), which only work inside a real request.

**Why async Server Components are hard.** React Testing Library renders on the client, and React's client renderer does not accept async components. Calling the component yourself (\`await UsersPage()\`) gives you its JSX, which RTL can render, but any async component inside that JSX hits the same problem again. That trick is fine for a leaf page with mocked data and nothing more; E2E covers the rest.

**Why E2E must use the production build.** \`next dev\` renders on demand and skips things like prerendering and the production caches, so a test can pass in dev and the real app still break. Playwright's \`webServer\` option starts \`next start\` before the tests. For the build steps themselves, see [next dev, next build and next start](/interview-question/what-happens-when-you-run-next-dev-next-build-and-next-start). For general React component testing patterns, see [testing React components](/interview-question/how-do-you-test-react-components).

## 4. Two Setup Details the Docs Do Not Spell Out

1. **\`AsyncLocalStorage\` for server helpers.** Importing \`next/experimental/testing/server\` (and some other Next.js server modules) in plain Node or Vitest failed in the lab with "Invariant: AsyncLocalStorage accessed in runtime where it is not available". The Next.js runtime normally provides it; a setup file that assigns \`globalThis.AsyncLocalStorage\` from \`node:async_hooks\` fixed it.
2. **Path aliases on Vite 8.** The 16.4.2 Vitest guide uses the \`vite-tsconfig-paths\` plugin. With the Vite 8.3.4 that vitest 5 installed, that plugin prints "Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option"; the lab config uses \`resolve: { tsconfigPaths: true }\` instead, and the \`@/\` imports resolved.

There is also a documentation mismatch to know about: the 16.4.2 proxy docs show \`unstable_doesProxyMatch\` from \`next/experimental/testing/server\`, but the 16.4.2 package exports these names only: \`getRedirectUrl, getRewrittenUrl, isRewrite, unstable_getResponseFromNextConfig, unstable_doesMiddlewareMatch\`. The lab used \`unstable_doesMiddlewareMatch\` against a \`proxy.ts\` config, and it worked. For proxy itself, see [proxy.ts in Next.js 16](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts).

## 5. Verified — Running the Suites (Next.js 16.4.2)

The lab app has a home page with a \`<Link>\` and a client \`Counter\`, an async \`/users\` Server Component reading from a \`server-only\` data module, a \`createTodo\` Server Action, an \`/api/health\` Route Handler and a \`proxy.ts\` that redirects \`/dashboard\` without a session cookie. \`next build\` type-checked the app and the test files:

\`\`\`
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ƒ /api/health
└ ○ /users


ƒ Proxy (Middleware)
\`\`\`

**Vitest** (\`npx vitest run --reporter=verbose\`):

\`\`\`
 ✓ __tests__/actions.test.ts > rejects short titles without revalidating 41ms
 ✓ __tests__/actions.test.ts > accepts a valid title and revalidates /todos 1ms
 ✓ __tests__/route.test.ts > GET /api/health 44ms
 ✓ __tests__/proxy.test.ts > matcher runs proxy only under /dashboard 4ms
 ✓ __tests__/proxy.test.ts > the name used in the 16.4.2 proxy docs is not exported by the package 0ms
 ✓ __tests__/proxy.test.ts > redirects to /login without a session cookie 3ms
 ✓ __tests__/proxy.test.ts > lets the request through with a session cookie 1ms
 ✓ __tests__/users.test.tsx > async Server Component: await it as a function, then render the result 124ms
 ✓ __tests__/home.test.tsx > Home renders a heading and a link 162ms
 ✓ __tests__/home.test.tsx > Counter increments on click 24ms
 Test Files  5 passed (5)
      Tests  10 passed (10)
\`\`\`

**What fails, and how.** Rendering the async page as JSX (\`render(<UsersPage />)\`) produced an empty container and this message:

\`\`\`
<UsersPage> is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding \`'use client'\` to a module that was originally written for the server.
\`\`\`

And the \`await Page()\` trick with a nested async child (\`<Child />\` inside \`Parent\`) failed the same way, one level down:

\`\`\`
<Child> is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding \`'use client'\` to a module that was originally written for the server.
rendered: 
 ❯ __tests__/nested.test.tsx (1 test | 1 failed) 29ms
   × nested async child 27ms
\`\`\`

And why the action test mocks \`next/cache\`: the same action called without mocks, plus a bare \`cookies()\` call, in a Vitest \`node\` environment:

\`\`\`
createTodo threw: Invariant: static generation store missing in revalidatePath("/todos")
cookies() threw: \`cookies\` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context
\`\`\`

**Playwright** against \`next start\` on port 4163, started by \`webServer\`, using the preinstalled Chromium (\`npx playwright test --reporter=list\`):

\`\`\`
Running 4 tests using 1 worker

  ✓  1 e2e/app.spec.ts:3:5 › navigates from Home to About with a client-side transition (357ms)
  ✓  2 e2e/app.spec.ts:13:5 › async Server Component renders real data (232ms)
  ✓  3 e2e/app.spec.ts:19:5 › client component is interactive after hydration (279ms)
  ✓  4 e2e/app.spec.ts:25:5 › proxy redirects /dashboard without a session (108ms)

  4 passed (2.8s)
\`\`\`

The E2E suite covered exactly what the unit suite could not: the async \`/users\` page with its real (unmocked) data, hydration, a same-document client-side navigation, and the proxy redirect as a real 307.

## 6. Common Pitfalls

- **Trying to unit test every async Server Component.** RTL cannot render them; test the data function and the leaf UI separately, and the page in E2E.
- **Running E2E against \`next dev\`.** Prerendering, caching and prefetching differ; use \`next build\` + \`next start\`.
- **Not mocking \`next/cache\` or \`next/headers\` in action tests.** They need a request context and throw outside one.
- **Querying the database inside components.** It makes unit tests need a database. A [Data Access Layer](/interview-question/how-do-you-keep-secrets-and-server-code-out-of-the-client-bundle-in-next-js-serv) gives you one module to mock.
- **Copying the documented \`unstable_doesProxyMatch\`.** In 16.4.2 the export is \`unstable_doesMiddlewareMatch\`.
- **Brittle selectors.** Prefer \`getByRole\` and web-first assertions such as \`toHaveText\`, which wait for streaming content.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Unit test logic, Client Components, Server Actions and Route Handlers with Vitest, and cover async Server Components and real user flows with Playwright against a production build.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Server Actions and Route Handlers are just async functions, so you call them with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FormData</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Request</code> and mock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/cache</code> and the data layer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Async Server Components do not render in React Testing Library; the docs recommend E2E for them, and E2E also catches caching and streaming issues.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Run Playwright with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">webServer</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next start</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next dev</code>; and test proxy matchers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/experimental/testing/server</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await Page()</code> works only for a flat component; a nested async child rendered as empty in the lab, so do not build a suite on that trick.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Jest or Vitest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both have 16.4.2 guides. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/jest</code> configures SWC transforms and loads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next.config</code> for Jest; Vitest runs through Vite with the React plugin. The test patterns are the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a component that uses <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useRouter</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mock <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next/navigation</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vi.mock</code>, returning a fake <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> you can assert on, or test that interaction in E2E.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did importing the testing helpers fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Next.js server modules expect <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AsyncLocalStorage</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code>; the lab added a three-line Vitest setup file that assigns it from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node:async_hooks</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unstable_doesProxyMatch</code> helper in the docs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The 16.4.2 proxy docs name it, but the 16.4.2 package exports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unstable_doesMiddlewareMatch</code>; the lab asserted the documented name is absent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep E2E tests stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use role-based locators and web-first assertions that wait (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toHaveText</code>), seed test data per run, and test the production build.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unit test** | One piece in isolation, dependencies faked |
| **E2E test** | The real app in a real browser |
| **Mock** | Fake module replacing a real dependency |
| **React Testing Library** | Renders components and queries them like a user |
| **\`webServer\`** | Playwright option that starts the app before tests |

---
**Conclusion:** Test a Next.js app in layers. Vitest with React Testing Library covers helpers, Client Components and synchronous Server Components; Server Actions, Route Handlers and proxy are plain functions you call directly with mocks for \`next/cache\` and the data layer; and Playwright against \`next start\` covers async Server Components, hydration, navigation and redirects. On 16.4.2 the lab ran 10 Vitest tests and 4 Playwright tests, all passing, and showed where unit testing stops: async components render as empty, one level down at the latest.`,
    examples: [
      {
        label: "Vitest config and unit tests",
        tech: "tsx",
        runnable: false,
        code: `// vitest.config.mts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true }, // Vite 8 resolves the "@/*" alias natively
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});

// vitest.setup.ts
// Next.js server modules expect AsyncLocalStorage on globalThis, which the Next runtime normally provides.
import { AsyncLocalStorage } from "node:async_hooks";
(globalThis as unknown as { AsyncLocalStorage: typeof AsyncLocalStorage }).AsyncLocalStorage = AsyncLocalStorage;

// __tests__/home.test.tsx
import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "@/app/page";

afterEach(cleanup);

test("Home renders a heading and a link", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeDefined();
  expect(screen.getByRole("link", { name: "About" }).getAttribute("href")).toBe("/about");
});

test("Counter increments on click", () => {
  render(<Home />);
  const button = screen.getByRole("button");
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button.textContent).toBe("Clicked 2 times");
});

// __tests__/users.test.tsx
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Replace the data layer: no database (and no "server-only" module) in unit tests.
vi.mock("@/lib/data", () => ({
  getUsers: vi.fn(async () => [{ id: 1, name: "Mocked Ada" }, { id: 2, name: "Mocked Linus" }]),
}));
import UsersPage from "@/app/users/page";

afterEach(cleanup);

test("async Server Component: await it as a function, then render the result", async () => {
  const ui = await UsersPage(); // a Server Component is just an async function returning JSX
  render(ui);
  expect(screen.getByRole("heading").textContent).toBe("Users (2)");
  expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Mocked Ada", "Mocked Linus"]);
});

// __tests__/actions.test.ts
// @vitest-environment node
import { expect, test, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { revalidatePath } from "next/cache";
import { createTodo } from "@/app/actions";

const form = (title: string) => { const f = new FormData(); f.set("title", title); return f; };

test("rejects short titles without revalidating", async () => {
  expect(await createTodo({ ok: false }, form("ab"))).toEqual({ ok: false, error: "Title must be at least 3 characters" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("accepts a valid title and revalidates /todos", async () => {
  expect(await createTodo({ ok: false }, form("Buy milk"))).toEqual({ ok: true });
  expect(revalidatePath).toHaveBeenCalledWith("/todos");
});

// __tests__/route.test.ts
// @vitest-environment node
import { expect, test } from "vitest";
import { GET } from "@/app/api/health/route";

test("GET /api/health", async () => {
  const res = await GET(new Request("http://localhost/api/health?verbose=1"));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok", uptime: "lab" });
});

// __tests__/proxy.test.ts
// @vitest-environment node
import { expect, test } from "vitest";
import { NextRequest } from "next/server";
import * as testing from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

test("matcher runs proxy only under /dashboard", () => {
  expect(testing.unstable_doesMiddlewareMatch({ config, url: "/dashboard/settings" })).toBe(true);
  expect(testing.unstable_doesMiddlewareMatch({ config, url: "/about" })).toBe(false);
});

test("the name used in the 16.4.2 proxy docs is not exported by the package", () => {
  expect("unstable_doesProxyMatch" in testing).toBe(false);
});

test("redirects to /login without a session cookie", () => {
  const res = proxy(new NextRequest("http://localhost/dashboard"));
  expect(testing.getRedirectUrl(res)).toBe("http://localhost/login");
});

test("lets the request through with a session cookie", () => {
  const res = proxy(new NextRequest("http://localhost/dashboard", { headers: { cookie: "session=abc" } }));
  expect(testing.getRedirectUrl(res)).toBeNull();
  expect(res.headers.get("x-middleware-next")).toBe("1");
});`,
      },
      {
        label: "Playwright against the production build",
        tech: "ts",
        runnable: false,
        code: `// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:4163",
    // lab only: reuse the preinstalled Chromium instead of downloading one
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: "npx next start -p 4163", // test the production build, not next dev
    url: "http://localhost:4163",
    reuseExistingServer: !process.env.CI,
  },
});

// e2e/app.spec.ts
import { expect, test } from "@playwright/test";

test("navigates from Home to About with a client-side transition", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 42));
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");
  // same document: the marker survived, so it was not a full page load
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(42);
});

test("async Server Component renders real data", async ({ page }) => {
  await page.goto("/users");
  await expect(page.getByRole("heading")).toHaveText("Users (2)");
  await expect(page.getByRole("listitem")).toHaveText(["Ada", "Linus"]);
});

test("client component is interactive after hydration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button").click();
  await expect(page.getByRole("button")).toHaveText("Clicked 1 times");
});

test("proxy redirects /dashboard without a session", async ({ page }) => {
  const res = await page.request.get("/dashboard", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toBe("/login");
});`,
      },
    ],
  },
];

export default augments;
