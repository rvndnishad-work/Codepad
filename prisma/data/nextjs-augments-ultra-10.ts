/**
 * Next.js "ultra" — batch 10 (NET-NEW Next 16/16.2 questions).
 *
 * Unlike batches 01–02 (which override gold titles), these ten titles exist
 * NOWHERE in the gold files. They are seeded as stubs via
 * prisma/data/curated/nextjs-16-new.json (`npm run seed:curated`, which
 * skips existing rows) and filled in here, pushed with `npm run augment:next`
 * (exact-title match). Same pattern as the Node ultra net-new batches.
 *
 * Same conventions as nextjs-augments-ultra-01/02.ts: §6 Question Body in
 * `description`, one-line `seoDescription`, full Answer Body with animated
 * thought-process SVG (double-quoted attrs, zero apostrophes inside svg
 * blocks, SMIL reveals in speak-order, motion dots with synced opacity fades),
 * `runnable: false` static snippets.
 *
 * Every version/API claim below was checked against primary sources, not
 * memory: the Next 16 stable notes (Oct 2025), the Next 16.2 notes
 * (Mar 2026), and the Proxy docs (file-conventions/proxy, getting-started/
 * proxy, messages/middleware-to-proxy). Install base: Next.js 16.3.4.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Cache Components in Next.js 16 and how does the 'use cache' directive work?",
    seoDescription:
      "Cache Components make caching opt-in via 'use cache' on pages, components, and functions, completing the PPR story.",
    description: `**Question presented to candidate:**
"Your product page mixes a static marketing shell with per-user pricing. Before, Next.js forced the whole route static or dynamic. How do Cache Components change that deal?"

**What a strong answer should cover:**
- cacheComponents: true in next.config.ts; caching becomes entirely opt-in, dynamic by default.
- 'use cache' caches a page, component, or function; the compiler generates cache keys automatically.
- This completes Partial Prerendering: static shell plus dynamic holes via Suspense, no all-or-nothing verdict.
- The old flags are gone: experimental.ppr and experimental_ppr removed, experimental.dynamicIO renamed to cacheComponents.

**Clarifying questions expected:**
- "Is Cache Components enabled in this codebase?" — without the flag the directive does nothing.
- "Which parts tolerate staleness?" — only those get the directive.

**Code / implementation expected:** Yes — a 'use cache' function plus the config flag.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic App Router caching familiarity.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. APIs and flags below are quoted from the Next 16 stable release notes, not memory.

## 1. Why This Even Matters — A Story First

Old Next.js was a restaurant that could only serve a table either entirely from the rehearsed menu or entirely cooked to order — one slow dish forced the whole table to wait. Cache Components let the kitchen serve the bread basket instantly (cached) while the steak cooks to order (dynamic), at the same table, in the same render.

## 2. The Core Idea

📌 **Interview term: Cache Components** — the Next 16 caching model, enabled with <code>cacheComponents: true</code>, where caching is **entirely opt-in** and all dynamic code runs at request time by default.

📌 **Interview term: use cache** — a directive placed on a page, component, or function to cache its output; the compiler generates the cache keys automatically.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="Opt-in cached shell with dynamic holes inside one render">
  <defs>
    <marker id="cc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One render, two speeds: cache what you can, cook the rest</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="180" y="44" width="300" height="44" rx="10"/>
    <text class="d-sub" x="330" y="71" text-anchor="middle">cacheComponents: true — dynamic by default</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="30" y="108" width="280" height="110" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="108" r="12"/>
    <text class="d-text d-accent" x="48" y="113" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="178" y="138" text-anchor="middle">use cache shell</text>
    <text class="d-sub" x="170" y="160" text-anchor="middle">page, component, function</text>
    <text class="d-sub" x="170" y="182" text-anchor="middle">say: compiler makes the keys</text>
    <text class="d-sub" x="170" y="204" text-anchor="middle">think: staleness budget first</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.8s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 312 163 L 348 163" marker-end="url(#cc-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 312 163 L 348 163"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.0s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="350" y="108" width="280" height="110" rx="10"/>
    <circle class="d-box-accent" cx="368" cy="108" r="12"/>
    <text class="d-text d-accent" x="368" y="113" text-anchor="middle">2</text>
    <text class="d-text" x="498" y="138" text-anchor="middle">dynamic holes</text>
    <text class="d-sub" x="490" y="160" text-anchor="middle">Suspense for per-user parts</text>
    <text class="d-sub" x="490" y="182" text-anchor="middle">say: pricing streams later</text>
    <text class="d-sub" x="490" y="204" text-anchor="middle">think: PPR, finished</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.4s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="238" width="600" height="48" rx="10"/>
    <text class="d-sub" x="330" y="267" text-anchor="middle">old flags are gone: experimental.ppr removed, dynamicIO renamed to cacheComponents</text>
  </g>
</svg>

The flag flips the default; the directive spends the budget; Suspense draws the holes.

## 3. Old model against new

| | Before Cache Components | With Cache Components |
| :--- | :--- | :--- |
| Default | cache unless you opt out | dynamic unless you opt in |
| Unit | whole route verdict | page, component, or function |
| Keys | fetch options and tags | compiler-generated |
| PPR | experimental flag | the completed model |

For the fetch-level mechanics this builds on, see <a href="/interview-question/what-are-the-caching-layers-in-next-js-request-memoization-data-cache-full-route">the caching-layers doc</a>.

## 4. Common Pitfalls

- **Adding use cache without the flag.** The directive is inert unless cacheComponents is enabled — silent no-op confusion.
- **Caching per-user output.** Pricing behind use cache leaks one user data to everyone — dynamic holes exist for exactly this.
- **Reaching for the old PPR flag.** experimental.ppr is removed, not deprecated — configs referencing it break.
- **Assuming fetch caching still applies.** The model moved to the directive; scattering cache flags from the old worldview misfires.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The flip:</strong> <span style="color:#f0e2c8;">"Cache Components make caching opt-in — dynamic by default — with use cache on pages, components, or functions, keys generated by the compiler."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The payoff:</strong> <span style="color:#f0e2c8;">"Static shell plus dynamic holes via Suspense in one render — the PPR story completed, no all-or-nothing verdict."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The migration note:</strong> <span style="color:#f0e2c8;">"Old PPR flags are removed, dynamicIO became cacheComponents — check the config first."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where can use cache go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a page, a component, or a function — three granularities, one directive, with cache keys generated automatically at each level.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happened to PPR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It graduated — the static-shell-plus-dynamic-holes idea is now the Cache Components programming model, and the experimental PPR flags were removed rather than kept alongside.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the blast radius of mis-caching here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cross-user leakage — a cached component serving one user personalized data to everyone. Staleness budget per directive is the review discipline.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cache Components** | Opt-in caching model enabled by flag |
| **use cache** | Directive caching a page, component, or function |
| **Dynamic default** | Uncached code runs per request unless opted in |

---
**Conclusion:** Cache Components end the era of implicit caching — you declare what may go stale, at the granularity that fits, and the framework holds the rest fresh. In an interview, the flag, the directive, and the PPR lineage are the complete answer.`,
    examples: [
      {
        label: "Opt-in cached function plus the enabling flag",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
const nextConfig = { cacheComponents: true };
export default nextConfig;

// lib/products.ts — cached until invalidated
'use cache';
export async function getFeaturedProducts() {
  return db.query('SELECT * FROM products WHERE featured = true');
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between revalidateTag(), updateTag(), and refresh() in Next.js 16?",
    seoDescription:
      "revalidateTag gives SWR invalidation, updateTag gives read-your-writes in actions, refresh re-reads uncached data only.",
    description: `**Question presented to candidate:**
"A user saves new profile settings and must see them immediately — but your blog list can tolerate a background refresh. Which cache API for each, and why the other is wrong?"

**What a strong answer should cover:**
- revalidateTag(tag, profile) for SWR invalidation of tagged static content; single-arg form deprecated.
- updateTag(tag), Server Actions only, for read-your-writes: expire plus immediate fresh read in the same request.
- refresh(), Server Actions only, for uncached data only — never touches the cache.
- Choosing by consistency need: eventual vs immediate vs uncached.

**Clarifying questions expected:**
- "Must the user see their own write instantly, or is background freshness fine?"
- "Is the target data cached at all?" — decides refresh() vs the tag APIs.

**Code / implementation expected:** Yes — the three calls side by side is the expected artifact.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic mutation familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Signatures below are quoted from the Next 16 stable release notes.

## 1. Why This Even Matters — A Story First

A library can re-shelve a returned book overnight (eventual), hand it straight back to the waiting borrower (immediate), or just re-read the whiteboard that was never shelved at all (uncached). Three consistency needs, three APIs — using the overnight shelf for the waiting borrower is the bug this question hunts.

## 2. The Core Idea

📌 **Interview term: revalidateTag()** — invalidates tagged cached entries with **stale-while-revalidate** semantics; in Next 16 takes a <code>cacheLife</code> profile second argument.

📌 **Interview term: updateTag()** — Server-Actions-only API giving **read-your-writes**: expires the tag and reads fresh data within the same request.

📌 **Interview term: refresh()** — Server-Actions-only API refreshing **uncached data only**, never touching the cache; complements client-side <code>router.refresh()</code>.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Three consistency needs mapped to three cache APIs">
  <defs>
    <marker id="ct-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Match the wait to the need: eventual, instant, uncached</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="20" y="46" width="195" height="130" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="46" r="12"/>
    <text class="d-text d-accent" x="38" y="51" text-anchor="middle">1</text>
    <text class="d-text" x="125" y="76" text-anchor="middle">revalidateTag</text>
    <text class="d-sub" x="117" y="100" text-anchor="middle">tag plus profile</text>
    <text class="d-sub" x="117" y="122" text-anchor="middle">say: background SWR</text>
    <text class="d-sub" x="117" y="144" text-anchor="middle">think: blog can wait</text>
    <text class="d-sub" x="117" y="166" text-anchor="middle">single-arg deprecated</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="232" y="46" width="196" height="130" rx="10"/>
    <circle class="d-box-accent" cx="250" cy="46" r="12"/>
    <text class="d-text d-accent" x="250" y="51" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="338" y="76" text-anchor="middle">updateTag</text>
    <text class="d-sub" x="330" y="100" text-anchor="middle">actions only</text>
    <text class="d-sub" x="330" y="122" text-anchor="middle">say: read your writes</text>
    <text class="d-sub" x="330" y="144" text-anchor="middle">think: settings demand it</text>
    <text class="d-sub" x="330" y="166" text-anchor="middle">expire plus fresh read</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="445" y="46" width="195" height="130" rx="10"/>
    <circle class="d-box-accent" cx="463" cy="46" r="12"/>
    <text class="d-text d-accent" x="463" y="51" text-anchor="middle">3</text>
    <text class="d-text" x="551" y="76" text-anchor="middle">refresh()</text>
    <text class="d-sub" x="542" y="100" text-anchor="middle">uncached only</text>
    <text class="d-sub" x="542" y="122" text-anchor="middle">say: cache untouched</text>
    <text class="d-sub" x="542" y="144" text-anchor="middle">think: badges, counts</text>
    <text class="d-sub" x="542" y="166" text-anchor="middle">pairs router.refresh</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="200" width="620" height="92" rx="10"/>
    <text class="d-text" x="338" y="230" text-anchor="middle">decision rule: who waits, and is it cached</text>
    <text class="d-sub" x="330" y="254" text-anchor="middle">strangers tolerate SWR — the writer does not — uncached needs no tag at all</text>
    <text class="d-sub" x="330" y="276" text-anchor="middle">say: consistency need picks the call, not habit</text>
  </g>
</svg>

Read the bottom bar first in an interview — it is the decision procedure the question rewards.

## 3. The trio

| Call | Scope | Semantics | Reach for |
| :--- | :--- | :--- | :--- |
| <code>revalidateTag(tag, profile)</code> | anywhere server | SWR, background | blog lists, catalogs |
| <code>updateTag(tag)</code> | Server Actions only | read-your-writes | profile saves, settings |
| <code>refresh()</code> | Server Actions only | uncached re-read | badges, live counts |

## 4. Common Pitfalls

- **Single-arg revalidateTag.** Deprecated in 16 — add the cacheLife profile (max is the recommended default) or switch APIs.
- **updateTag outside an action.** It is Server-Actions-only; calling it elsewhere fails by design.
- **refresh() expecting cache purge.** It never touches cached entries — cached shells stay fast while dynamic bits update.
- **SWR for the writer own view.** The user staring at their save needs updateTag, not eventual consistency.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trio:</strong> <span style="color:#f0e2c8;">"revalidateTag with a profile for background SWR, updateTag in actions for read-your-writes, refresh for uncached-only re-reads."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The scenario:</strong> <span style="color:#f0e2c8;">"Blog list gets revalidateTag; the profile save gets updateTag so the writer sees it instantly; the unread badge gets refresh."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The migration note:</strong> <span style="color:#f0e2c8;">"Single-arg revalidateTag is deprecated — profiles like max, or an inline expire object."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not revalidateTag everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SWR serves stale first by design — correct for strangers reading a blog, wrong for the writer reading their own save. Consistency need picks the call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">updateTag or router.refresh after a mutation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">updateTag when tagged cached data must show the write now; the server refresh() (or client router.refresh) when the target was never cached. Different targets, complementary calls.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What cacheLife profile should I default to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">max for most cases per the release guidance — background revalidation for long-lived content — with hours or days for feed-like data, or an inline expire object for exact control.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SWR** | Serve stale now, revalidate behind |
| **Read-your-writes** | A writer immediately sees their own change |
| **cacheLife profile** | Named freshness policy like max or hours |

---
**Conclusion:** three waits, three calls — background for strangers, instant for writers, re-read for the uncached — and the Next 16 twist is that the framework finally names each wait separately instead of overloading one.`,
    examples: [
      {
        label: "One scenario per API",
        tech: "tsx",
        runnable: false,
        code: `'use server';
import { revalidateTag, updateTag, refresh } from 'next/cache';

// background SWR for strangers
export async function publishPost() { revalidateTag('blog-posts', 'max'); }

// read-your-writes for the writer
export async function updateProfile(userId, profile) {
  await db.users.update(userId, profile);
  updateTag('user-' + userId);
}

// uncached live data elsewhere on the page
export async function markRead(notificationId) {
  await db.notifications.markAsRead(notificationId);
  refresh();
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What breaks when you upgrade to Next.js 16, and how do you migrate?",
    seoDescription:
      "Async dynamic APIs, removed features, new defaults, and the automated codemod upgrade path for Next 16.",
    description: `**Question presented to candidate:**
"You own a Next 14 app with getServerSideProps-era habits, sync params reads, a middleware.ts, and custom webpack config. What breaks on the way to Next 16, in what order do you fix it, and what does the tooling do for you?"

**What a strong answer should cover:**
- Version floor: Node 20.9+, TypeScript 5.1+, current browsers; Node 18 is out.
- All dynamic APIs go async: params, searchParams, cookies, headers, draftMode — sync access removed.
- Removals: AMP, next lint (codemod to ESLint), runtime configs (use env), PPR/dynamicIO flags, image query-string src.
- Behavior flips: Turbopack default, image defaults, parallel slots require default.js.
- The upgrade CLI automates the mechanical parts.

**Clarifying questions expected:**
- "Which version are we coming from — 14 or 15?" — 15 already absorbed half the breakage.
- "Custom webpack or stock config?" — decides the Turbopack risk.

**Code / implementation expected:** Optional — the upgrade command plus one async-params fix tells the story.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes ownership of a real upgrade.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Tables below mirror the Next 16 stable breaking-changes section.

## 1. Why This Even Matters — A Story First

Renovating a lived-in house means knowing which walls are load-bearing before swinging the hammer. The Next 16 upgrade has exactly three load-bearing walls — async APIs, removed features, flipped defaults — and a power tool that swings for you where it safely can.

## 2. The Core Idea

📌 **Interview term: async dynamic APIs** — in Next 16 every request-scoped read (<code>params</code>, <code>searchParams</code>, <code>cookies()</code>, <code>headers()</code>, <code>draftMode()</code>) must be awaited; sync access is removed, not deprecated.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Upgrade in three passes: floor, breakage, defaults, with tooling assist">
  <defs>
    <marker id="mg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Renovate in passes: floor, breakage, defaults</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="46" width="195" height="110" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="46" r="12"/>
    <text class="d-text d-accent" x="38" y="51" text-anchor="middle">1</text>
    <text class="d-text" x="125" y="76" text-anchor="middle">check the floor</text>
    <text class="d-sub" x="117" y="100" text-anchor="middle">Node 20.9 plus</text>
    <text class="d-sub" x="117" y="122" text-anchor="middle">say: 18 is out</text>
    <text class="d-sub" x="117" y="144" text-anchor="middle">think: CI images first</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="232" y="46" width="196" height="110" rx="10"/>
    <circle class="d-box-accent" cx="250" cy="46" r="12"/>
    <text class="d-text d-accent" x="250" y="51" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="338" y="76" text-anchor="middle">await everything</text>
    <text class="d-sub" x="330" y="100" text-anchor="middle">params, cookies, more</text>
    <text class="d-sub" x="330" y="122" text-anchor="middle">say: sync throws now</text>
    <text class="d-sub" x="330" y="144" text-anchor="middle">think: grep the awaits</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="445" y="46" width="195" height="110" rx="10"/>
    <circle class="d-box-accent" cx="463" cy="46" r="12"/>
    <text class="d-text d-accent" x="463" y="51" text-anchor="middle">3</text>
    <text class="d-text" x="551" y="76" text-anchor="middle">absorb defaults</text>
    <text class="d-sub" x="542" y="100" text-anchor="middle">Turbopack, images</text>
    <text class="d-sub" x="542" y="122" text-anchor="middle">say: measure, then pin</text>
    <text class="d-sub" x="542" y="144" text-anchor="middle">think: defaults changed</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.2s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 120 158 L 120 198" marker-end="url(#mg-arrow)"/>
    <path class="d-edge" d="M 330 158 L 330 198" marker-end="url(#mg-arrow)"/>
    <path class="d-edge" d="M 540 158 L 540 198" marker-end="url(#mg-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2.2s" repeatCount="indefinite" path="M 330 158 L 330 198"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.5s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="204" width="620" height="88" rx="10"/>
    <text class="d-text" x="338" y="234" text-anchor="middle">power tool first: codemod upgrades the mechanical parts</text>
    <text class="d-sub" x="330" y="258" text-anchor="middle">say: npx @next/codemod upgrade latest — then fix by hand what it flags</text>
    <text class="d-sub" x="330" y="280" text-anchor="middle">think: automate renames, hand-fix semantics</text>
  </g>
</svg>

Floor, breakage, defaults — then let the codemod do the carrying.

## 3. What must change

| Area | Next 16 reality |
| :--- | :--- |
| Runtime floor | Node 20.9+, TS 5.1+, modern browsers |
| Dynamic reads | <code>await params</code>, <code>await cookies()</code>, and friends |
| Removed | AMP, <code>next lint</code>, runtime configs, PPR flags |
| Renamed | middleware to proxy, dynamicIO to cacheComponents |
| Flipped defaults | Turbopack builds, image tuning, required default.js |

## 4. Common Pitfalls

- **Upgrading the framework before the floor.** CI on Node 18 fails in confusing ways — runtimes first, framework second.
- **Assuming codemods finish the job.** They rename mechanically; async semantics and cache-behavior changes need human review.
- **Custom webpack plugins.** Turbopack ignores them silently — inventory build plugins before switching defaults.
- **Skipping the parallel-slot audit.** Missing default.js files now fail builds — enumerate slots early.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The passes:</strong> <span style="color:#f0e2c8;">"Floor first — Node 20.9 and TS 5.1 — then await every dynamic API, then absorb Turbopack, image, and slot defaults."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The removals:</strong> <span style="color:#f0e2c8;">"AMP, next lint, runtime configs, and PPR flags go; middleware becomes proxy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The tooling:</strong> <span style="color:#f0e2c8;">"Run the upgrade codemod first for mechanical renames, then hand-fix semantics it flags."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why force async on cookies and params?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It lets the router stream and parallelize instead of blocking the render on request values up front — the breakage buys the streaming architecture.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Biggest risk with Turbopack-by-default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Custom webpack plugins and loaders are silently ignored. Inventory them first; the webpack opt-out flag exists as an escape hatch, not a plan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where did next lint go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Removed — run Biome or ESLint directly, and builds no longer lint. A codemod converts the old setup.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Async dynamic APIs** | Request reads that must be awaited |
| **Upgrade codemod** | Automated mechanical migration tool |
| **Flipped default** | Behavior that changed without a flag |

---
**Conclusion:** upgrade in passes — floor, breakage, defaults — automate the renames, hand-fix the semantics, and audit slots and plugins before the defaults surprise you. That ordering is the senior signal.`,
    examples: [
      {
        label: "Upgrade command plus the highest-frequency fix",
        tech: "bash",
        runnable: false,
        code: `# mechanical migration first
npx @next/codemod@canary upgrade latest

# then the hand-fix you will repeat most: sync → async params
# before: const { id } = params;            // throws in Next 16
# after:  const { id } = await params;      // required`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is proxy.ts in Next.js 16 and how do you migrate from middleware.ts?",
    seoDescription:
      "Middleware is renamed to Proxy on the Node.js runtime; rename the file and function via the official codemod.",
    description: `**Question presented to candidate:**
"Your auth gate lives in middleware.ts and the Next 16 build warns it is deprecated. What changed, what do you rename, and what stays exactly the same?"

**What a strong answer should cover:**
- The rename clarifies the network-boundary role and sheds Express-middleware confusion; use-as-last-resort guidance.
- Mechanical fix: middleware.ts becomes proxy.ts, exported middleware() becomes proxy(); codemod does both.
- Proxy defaults to the Node.js runtime; middleware.ts remains only for Edge cases, deprecated.
- Logic, matcher config, and NextResponse semantics are unchanged.

**Clarifying questions expected:**
- "Edge runtime or Node?" — decides whether anything beyond renaming is needed.
- "What does the gate actually do?" — simple redirects may belong in config instead.

**Code / implementation expected:** Yes — the renamed file with matcher is the whole migration.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic middleware familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Rename details are quoted from the Proxy docs and migration message page.

## 1. Why This Even Matters — A Story First

Calling a bouncer "the interior decorator" confuses everyone about where he stands and what he may touch. Middleware sounded like in-app Express logic; the file actually stands at the network boundary. Proxy is the honest job title — same bouncer, clearer badge.

## 2. The Core Idea

📌 **Interview term: Proxy** — the Next 16 name for request-interception code running before a route completes: rewrites, redirects, header and cookie work.

📌 **Interview term: network boundary** — the explicit concept the rename enforces: this file guards the edge of your app, it is not app logic, and simpler tools (config redirects) should win whenever they suffice.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Rename the file and function, keep the logic, note the runtime">
  <defs>
    <marker id="px-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Same bouncer, clearer badge: rename, keep, note</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="56" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="56" r="12"/>
    <text class="d-text d-accent" x="48" y="61" text-anchor="middle">1</text>
    <text class="d-text" x="123" y="86" text-anchor="middle">rename</text>
    <text class="d-sub" x="115" y="108" text-anchor="middle">file plus function</text>
    <text class="d-sub" x="115" y="130" text-anchor="middle">say: run the codemod</text>
    <text class="d-sub" x="115" y="152" text-anchor="middle">think: mechanical fix</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 222 111 L 266 111" marker-end="url(#px-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M 222 111 L 266 111"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="270" y="56" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="288" cy="56" r="12"/>
    <text class="d-text d-accent" x="288" y="61" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="373" y="86" text-anchor="middle">keep logic</text>
    <text class="d-sub" x="365" y="108" text-anchor="middle">matcher, responses</text>
    <text class="d-sub" x="365" y="130" text-anchor="middle">say: zero behavior delta</text>
    <text class="d-sub" x="365" y="152" text-anchor="middle">think: codemod-safe zone</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 462 111 L 486 111" marker-end="url(#px-arrow)"/>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.0s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="490" y="56" width="150" height="110" rx="10"/>
    <circle class="d-box-accent" cx="508" cy="56" r="12"/>
    <text class="d-text d-accent" x="508" y="61" text-anchor="middle">3</text>
    <text class="d-text" x="573" y="86" text-anchor="middle">note runtime</text>
    <text class="d-sub" x="565" y="108" text-anchor="middle">Node.js default</text>
    <text class="d-sub" x="565" y="130" text-anchor="middle">say: Edge is legacy</text>
    <text class="d-sub" x="565" y="152" text-anchor="middle">think: audit usage</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.4s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="196" width="610" height="76" rx="10"/>
    <text class="d-text" x="343" y="226" text-anchor="middle">guidance travels with the rename: last resort, not first tool</text>
    <text class="d-sub" x="335" y="250" text-anchor="middle">say: config redirects first — proxy earns its keep on request data</text>
  </g>
</svg>

Rename, keep, note — and let the codemod carry the first box.

## 3. Migration map

| Step | Action |
| :--- | :--- |
| File | <code>middleware.ts</code> becomes <code>proxy.ts</code> |
| Function | exported <code>middleware()</code> becomes <code>proxy()</code> |
| Tool | <code>middleware-to-proxy</code> codemod |
| Runtime | Node.js default; old file Edge-only and deprecated |
| Logic | matchers and responses unchanged |

For the pre-16 behavior this renames, see <a href="/interview-question/what-is-middleware-in-next-js-and-what-can-it-do">the middleware doc</a>.

## 4. Common Pitfalls

- **Renaming the file but not the function.** Both change — the codemod exists so you change neither by hand.
- **Assuming Edge semantics carry over.** Proxy is Node by default; Edge-only tricks need rethinking.
- **Proxy for static redirects.** Config redirects are cheaper and reviewable — proxy must justify itself with request data.
- **Ignoring the deprecation warning.** middleware.ts still runs today but is slated for removal — schedule the rename, do not shelve it.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The what and why:</strong> <span style="color:#f0e2c8;">"Middleware is renamed Proxy to mark the network boundary and end the Express confusion — same capabilities, honest title, last-resort guidance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The how:</strong> <span style="color:#f0e2c8;">"Rename file and function via the codemod; matchers and logic untouched; Node.js is now the default runtime."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The judgment:</strong> <span style="color:#f0e2c8;">"Static redirects stay in config — proxy earns its place on request-dependent logic like auth gates."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does anything behave differently after the rename?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — same matchers, same responses. The deltas are the name, the Node.js default runtime, and the explicit last-resort guidance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is proxy the wrong tool?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Static redirects and rewrites belong in next.config — reviewable, no runtime cost. Proxy justifies itself only on request-dependent decisions.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Proxy** | Request interception at the network boundary |
| **Matcher** | Config scoping which paths run the proxy |
| **Last resort** | Guidance to prefer simpler tools first |

---
**Conclusion:** the rename is honesty in naming — boundary work called boundary work, on a predictable runtime, migrated by codemod, and reached for only when config cannot do the job.`,
    examples: [
      {
        label: "The migrated auth gate",
        tech: "tsx",
        runnable: false,
        code: `// proxy.ts (was middleware.ts) — same logic, honest name
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {   // was: middleware()
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: '/dashboard/:path*' };`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does prefetching and navigation caching work in Next.js 16?",
    seoDescription:
      "Layout deduplication plus incremental prefetching cut transfer sizes; inlining and cached navigations tune the tradeoff.",
    description: `**Question presented to candidate:**
"A category page holds fifty product links and navigation feels heavy. What changed in Next 16 prefetching, and which knobs trade requests against bytes?"

**What a strong answer should cover:**
- Layout deduplication: shared layouts download once across many prefetched links.
- Incremental prefetching: only uncached segments, cancel on viewport leave, hover priority, re-prefetch on invalidation.
- More requests but far fewer bytes is the intended tradeoff.
- experimental.prefetchInlining (one response per link, duplicates shared data) and cachedNavigations (needs cacheComponents, instant repeat visits).

**Clarifying questions expected:**
- "Many links sharing one layout, or deep unique trees?" — decides whether dedup is the win.
- "Is request count or byte count the constraint?" — picks the tuning knob.

**Code / implementation expected:** Optional — the two experimental flags plus what each trades.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic Link-prefetch familiarity.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Mechanics below are quoted from the Next 16 stable routing section and the 16.2 experimental flags.

## 1. Why This Even Matters — A Story First

Fifty shoppers asking for the store map should share one map, not print fifty. Old prefetching printed fifty full packets; Next 16 shares the map (layout) once and only fetches what each shopper has not seen. More trips to the counter, vastly less paper.

## 2. The Core Idea

📌 **Interview term: layout deduplication** — when prefetching many URLs sharing a layout, the layout downloads **once** instead of once per link.

📌 **Interview term: incremental prefetching** — only segments **missing from the cache** are requested; requests cancel when links leave the viewport, prioritize on hover, and re-fire on invalidation.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="Shared layout once, unique segments per link, tuning knobs below">
  <defs>
    <marker id="pf-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Share the map, fetch only the unseen aisles</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="180" y="44" width="300" height="52" rx="10"/>
    <text class="d-text d-accent" x="330" y="65" text-anchor="middle">shared layout: fetched once</text>
    <text class="d-sub" x="330" y="85" text-anchor="middle">say: fifty links, one download</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 250 98 L 250 128" marker-end="url(#pf-arrow)"/>
    <path class="d-edge-accent" d="M 330 98 L 330 128" marker-end="url(#pf-arrow)"/>
    <path class="d-edge-accent" d="M 410 98 L 410 128" marker-end="url(#pf-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 330 98 L 330 128"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.8s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="30" y="134" width="180" height="90" rx="10"/>
    <text class="d-text" x="120" y="162" text-anchor="middle">link A delta</text>
    <text class="d-sub" x="120" y="184" text-anchor="middle">uncached only</text>
    <text class="d-sub" x="120" y="206" text-anchor="middle">think: cancel on leave</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.0s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="240" y="134" width="180" height="90" rx="10"/>
    <text class="d-text" x="330" y="162" text-anchor="middle">link B delta</text>
    <text class="d-sub" x="330" y="184" text-anchor="middle">hover prioritized</text>
    <text class="d-sub" x="330" y="206" text-anchor="middle">think: intent beats scroll</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.2s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="450" y="134" width="180" height="90" rx="10"/>
    <text class="d-text" x="540" y="162" text-anchor="middle">link C delta</text>
    <text class="d-sub" x="540" y="184" text-anchor="middle">re-fetch on invalid</text>
    <text class="d-sub" x="540" y="206" text-anchor="middle">think: stale never sticks</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.5s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="240" width="600" height="48" rx="10"/>
    <text class="d-sub" x="330" y="269" text-anchor="middle">knobs: prefetchInlining trades bytes for fewer requests — cachedNavigations needs cacheComponents</text>
  </g>
</svg>

One shared download up top, per-link deltas below, and the tuning tradeoff in the footer.

## 3. Tuning knobs

| Knob | Effect | Cost |
| :--- | :--- | :--- |
| Default incremental | deltas only, deduped layouts | more requests, fewer bytes |
| <code>prefetchInlining</code> | one response per link | shared data duplicated |
| <code>cachedNavigations</code> | instant repeat visits | requires cacheComponents |

## 4. Common Pitfalls

- **Alarming on request counts.** More requests is the design — watch bytes, not request lines.
- **Inlining by default.** Duplicated shared data across inlined responses can cost more than it saves on layout-heavy apps.
- **Expecting cachedNavigations standalone.** It requires cacheComponents — flag first, benefit second.
- **Prefetching below-the-fold oceans.** Viewport cancelation helps, but link-dense pages still deserve prefetch={false} triage.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rewrite:</strong> <span style="color:#f0e2c8;">"Prefetching is per-segment now — shared layouts download once, only uncached deltas travel, with cancel-on-leave and hover priority."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The tradeoff:</strong> <span style="color:#f0e2c8;">"More requests, far fewer bytes — judge by transfer size, and inline only when request count truly binds."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The flags:</strong> <span style="color:#f0e2c8;">"prefetchInlining bundles per link at a duplication cost; cachedNavigations needs cacheComponents for instant repeats."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does layout deduplication save concretely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fifty product links sharing a layout download it once instead of fifty times — the flagship number from the release notes, and the reason category pages got dramatically lighter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would inlining hurt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On layout-heavy apps where one response per link duplicates the shared shell fifty times — exactly what dedup was built to avoid. Inline for request-bound cases only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does hover really change prefetch priority?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — hover and viewport re-entry prioritize a link prefetch over background ones, so expressed intent jumps the queue.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Layout deduplication** | Shared layouts prefetched once |
| **Incremental prefetching** | Only uncached segments requested |
| **prefetchInlining** | One bundled response per link |

---
**Conclusion:** Next 16 prefetching thinks in segments, not pages — share what repeats, fetch only what is missing, and tune the request-byte tradeoff with named flags instead of vibes.`,
    examples: [
      {
        label: "The two experimental tuning flags",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts — both experimental, measure before keeping
const nextConfig = {
  experimental: {
    prefetchInlining: true,    // one response per link; duplicates shared data
    // cachedNavigations: true // instant repeat visits; needs cacheComponents
  },
};`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you enable and evaluate the React Compiler in Next.js 16?",
    seoDescription:
      "Stable reactCompiler flag plus Babel plugin gives auto-memoization; opt-in with build-time cost to measure.",
    description: `**Question presented to candidate:**
"Your team hand-writes useMemo and useCallback everywhere and still ships wasted re-renders. What does the React Compiler change, how do you turn it on in Next 16, and how do you prove it helped?"

**What a strong answer should cover:**
- The compiler auto-memoizes components: fewer re-renders, zero manual hook edits.
- Enable with reactCompiler: true (stable, not experimental) plus the Babel plugin install; not default.
- Cost: higher compile times in dev and build — measure before keeping.
- Evaluation: render counts, interaction timings, and bail-out review, not vibes.

**Clarifying questions expected:**
- "Is build-time budget or runtime jank the binding constraint?" — decides whether the tradeoff wins.
- "How much manual memoization exists?" — more hand-memo means bigger cleanup upside.

**Code / implementation expected:** Yes — the two-line enablement is the artifact.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic memoization familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Flag status is quoted from the Next 16 stable notes (post React Compiler 1.0).

## 1. Why This Even Matters — A Story First

Hand-memoizing a large app is bubble-wrapping every parcel by hand — slow, inconsistent, and the wrap itself costs something. The compiler is a packing machine: it wraps exactly what needs wrapping, the same way, every time, and you stop thinking about parcels.

## 2. The Core Idea

📌 **Interview term: React Compiler** — the build-time optimizer that **automatically memoizes** components and hooks, removing whole classes of manual <code>useMemo</code> / <code>useCallback</code> with no code changes.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Enable with flag plus plugin, pay build time, collect runtime wins">
  <defs>
    <marker id="rc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Machine wrapping: enable, pay, collect</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="30" y="56" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="56" r="12"/>
    <text class="d-text d-accent" x="48" y="61" text-anchor="middle">1</text>
    <text class="d-text" x="123" y="86" text-anchor="middle">enable</text>
    <text class="d-sub" x="115" y="108" text-anchor="middle">flag plus plugin</text>
    <text class="d-sub" x="115" y="130" text-anchor="middle">say: stable, not default</text>
    <text class="d-sub" x="115" y="152" text-anchor="middle">think: opt-in deliberately</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 222 111 L 266 111" marker-end="url(#rc-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M 222 111 L 266 111"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="270" y="56" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="288" cy="56" r="12"/>
    <text class="d-text d-accent" x="288" y="61" text-anchor="middle">2</text>
    <text class="d-text" x="373" y="86" text-anchor="middle">pay build time</text>
    <text class="d-sub" x="365" y="108" text-anchor="middle">slower dev and build</text>
    <text class="d-sub" x="365" y="130" text-anchor="middle">say: measure the delta</text>
    <text class="d-sub" x="365" y="152" text-anchor="middle">think: Babel does work</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 462 111 L 486 111" marker-end="url(#rc-arrow)"/>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.0s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="490" y="56" width="150" height="110" rx="10"/>
    <circle class="d-box-accent" cx="508" cy="56" r="12"/>
    <text class="d-text d-accent" x="508" y="61" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="573" y="86" text-anchor="middle">collect</text>
    <text class="d-sub" x="565" y="108" text-anchor="middle">fewer re-renders</text>
    <text class="d-sub" x="565" y="130" text-anchor="middle">say: delete hand-memo</text>
    <text class="d-sub" x="565" y="152" text-anchor="middle">think: count renders</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.4s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="30" y="196" width="610" height="76" rx="10"/>
    <text class="d-text" x="343" y="226" text-anchor="middle">evaluation is counting, not feeling: renders, timings, bail-outs</text>
    <text class="d-sub" x="335" y="250" text-anchor="middle">say: profile before and after — keep it only on measured wins</text>
  </g>
</svg>

Enable deliberately, budget the build cost, and let render counts cast the vote.

## 3. Enablement

| Step | Action |
| :--- | :--- |
| Flag | <code>reactCompiler: true</code> in next.config (stable) |
| Plugin | install <code>babel-plugin-react-compiler</code> latest |
| Default | off — team still gathering performance data |
| Cleanup | remove manual memo that the compiler subsumes |

For when auto-memo bails out and hand-memo still matters, see <a href="/interview-question/react-compiler-pitfalls-when-does-auto-memo-bail-out">the React Compiler pitfalls doc</a>.

## 4. Common Pitfalls

- **Assuming default-on.** Stable does not mean enabled — the flag plus plugin are both required.
- **Ignoring compile-time cost.** Dev and build both slow down; on huge codebases that can dominate the runtime win.
- **Keeping all hand-memo.** Dead useMemo wrappers add noise and can fight the compiler output — prune after enabling.
- **No before/after profile.** Feelings about smoothness are not evaluation; render counts and timings are.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The what:</strong> <span style="color:#f0e2c8;">"The compiler auto-memoizes at build time — whole classes of useMemo and useCallback disappear with no code changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The how:</strong> <span style="color:#f0e2c8;">"reactCompiler flag plus the Babel plugin — stable since 16, deliberately not default."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The proof:</strong> <span style="color:#f0e2c8;">"Profile render counts and interaction timings before and after, budget the slower builds, prune dead hand-memo."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it stable but off by default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The team is still gathering build-performance data across app shapes, and the Babel pass costs compile time — they want teams to opt in with eyes open.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Delete all useMemo on day one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — enable, profile, then prune where the compiler subsumes the manual work. Bail-out cases still want hand-memo, which is exactly what the pitfalls doc catalogs.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **React Compiler** | Build-time auto-memoization |
| **Bail-out** | Code shape the compiler skips |

---
**Conclusion:** the compiler industrializes what seniors hand-rolled — flag it on, budget the build minutes, count the renders, and delete the memo that no longer earns its lines.`,
    examples: [
      {
        label: "Two-line enablement",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
const nextConfig = { reactCompiler: true };
export default nextConfig;

// terminal — the required companion install
// npm install babel-plugin-react-compiler@latest`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do View Transitions work with next/link transitionTypes in Next.js 16.2?",
    seoDescription:
      "transitionTypes on Link selects per-navigation View Transition animations; App Router only, ignored in Pages.",
    description: `**Question presented to candidate:**
"Going forward should slide left, going back should slide right — declaratively, per link, surviving the App Router navigation. How do you wire that in Next 16.2?"

**What a strong answer should cover:**
- transitionTypes array on Link names the transition types for that navigation.
- Each type flows into React.addTransitionType during the navigation transition.
- CSS view-transition rules define the actual animation per type.
- App Router only — silently ignored in Pages, so shared link components stay safe.

**Clarifying questions expected:**
- "Same animation both directions, or directional?" — decides one type vs per-link types.
- "App Router everywhere?" — Pages links ignore the prop silently.

**Code / implementation expected:** Yes — two links with different types plus the CSS rule sketch.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic Link familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Prop behavior is quoted from the Next 16.2 release notes.

## 1. Why This Even Matters — A Story First

Stage directions tell actors which way to exit — left for tragedy, right for comedy. transitionTypes are stage directions for navigation: each link declares how its entrance should feel, and the browser performs it during the route change instead of hard-cutting.

## 2. The Core Idea

📌 **Interview term: transitionTypes** — a <code>next/link</code> prop taking an array of strings that become the **View Transition types** for that navigation.

📌 **Interview term: View Transition** — the React 19.2 (and platform) mechanism animating elements that update inside a transition instead of swapping instantly.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 300" role="img" aria-label="Each link declares its exit direction, the transition performs it">
  <defs>
    <marker id="vt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Declare the direction on the link, perform it in transit</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="30" y="56" width="270" height="110" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="56" r="12"/>
    <text class="d-text d-accent" x="48" y="61" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="178" y="86" text-anchor="middle">forward link</text>
    <text class="d-sub" x="165" y="108" text-anchor="middle">transitionTypes slide-left</text>
    <text class="d-sub" x="165" y="130" text-anchor="middle">say: exits stage left</text>
    <text class="d-sub" x="165" y="152" text-anchor="middle">think: per-link intent</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="360" y="56" width="270" height="110" rx="10"/>
    <circle class="d-box-accent" cx="378" cy="56" r="12"/>
    <text class="d-text d-accent" x="378" y="61" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="503" y="86" text-anchor="middle">back link</text>
    <text class="d-sub" x="495" y="108" text-anchor="middle">transitionTypes slide-right</text>
    <text class="d-sub" x="495" y="130" text-anchor="middle">say: exits stage right</text>
    <text class="d-sub" x="495" y="152" text-anchor="middle">think: direction is data</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.8s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 165 168 L 165 204" marker-end="url(#vt-arrow)"/>
    <path class="d-edge-accent" d="M 495 168 L 495 204" marker-end="url(#vt-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 165 168 L 165 204"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M 495 168 L 495 204"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" begin="1s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box" x="30" y="210" width="600" height="64" rx="10"/>
    <text class="d-text" x="338" y="238" text-anchor="middle">CSS view-transition rules perform the named types</text>
    <text class="d-sub" x="330" y="260" text-anchor="middle">say: App Router only — Pages links ignore the prop silently</text>
  </g>
</svg>

Intent flows down from the links; the CSS performs it in transit.

## 3. Wiring

| Piece | Role |
| :--- | :--- |
| <code>transitionTypes={[...]}</code> | names types per navigation |
| <code>React.addTransitionType</code> | framework plumbing during transition |
| CSS rules | the actual keyframes per type |
| Pages Router | prop silently ignored |

## 4. Common Pitfalls

- **No CSS behind the names.** Types without view-transition rules animate nothing — the prop names, the stylesheet performs.
- **Expecting Pages support.** Navigation there is not transition-driven; the prop is ignored, which is safe but silent.
- **One type for both directions.** Directional feel needs distinct types per link — forward and back must disagree.
- **Animating heavy trees.** Transitions snapshot the DOM — huge pages jank; scope animated regions.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The wiring:</strong> <span style="color:#f0e2c8;">"transitionTypes names the animation per link, the framework threads it through the navigation transition, CSS rules perform it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The demo:</strong> <span style="color:#f0e2c8;">"Forward links slide left, back links slide right — direction encoded per link, not globally."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The scope:</strong> <span style="color:#f0e2c8;">"App Router only; Pages ignores it silently, so shared components stay safe."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the animation itself live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In CSS view-transition rules keyed by the type names. The prop only selects; the stylesheet performs — names without rules are silent no-ops.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks in the Pages Router?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing breaks — the prop is silently ignored because Pages navigation is not transition-driven. Shared link components work across both routers.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **transitionTypes** | Per-link animation selector |
| **View Transition** | Animated element update in transit |

---
**Conclusion:** direction is data — declare it per link, perform it in CSS, and let the App Router carry it through the transition while Pages safely ignores it.`,
    examples: [
      {
        label: "Directional navigation plus the CSS that performs it",
        tech: "tsx",
        runnable: false,
        code: `import Link from 'next/link';

<Link href="/about" transitionTypes={['slide-left']}>About</Link>
<Link href="/back" transitionTypes={['slide-right']}>Go Back</Link>

/* CSS: the named types need real view-transition rules to animate */
// ::view-transition-group(.slide-left) { /* keyframes here */ }`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you debug Server Functions and hydration mismatches in Next.js 16.2?",
    seoDescription:
      "Dev-terminal function logs, hydration diff overlay, error cause chains, and Node inspector for production servers.",
    description: `**Question presented to candidate:**
"A Server Action misbehaves only in staging, and a hydration error shows two different texts with no clue which side is wrong. Which 16.2 tools do you reach for, in what order?"

**What a strong answer should cover:**
- Server Function Logging: name, args, timing, and file in the dev terminal per execution.
- Hydration Diff Indicator: + Client / - Server legend pinning the divergence.
- Error.cause chains surfaced flat in the overlay, five levels deep.
- next dev --inspect (16.1) extended to next start --inspect (16.2) for debugger and CPU/memory profiling.

**Clarifying questions expected:**
- "Dev or production?" — overlay tools vs inspector diverge here.
- "Mismatch or action bug?" — picks overlay-first vs logs-first.

**Code / implementation expected:** Optional — the inspect commands and where each signal surfaces.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic hydration intuition.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Tools below are quoted from the Next 16.2 release notes.

## 1. Why This Even Matters — A Story First

A detective wants the interrogation transcript (what ran, with what args), the two conflicting witness statements side by side (server vs client text), and the coroner full chain of causes — not one vague "something died." 16.2 hands you all three before you open the debugger.

## 2. The Core Idea

📌 **Interview term: Server Function Logging** — dev-terminal lines per Server Function execution showing name, arguments, timing, and defining file.

📌 **Interview term: Hydration Diff Indicator** — overlay legend marking diverged content <code>+ Client</code> vs <code>- Server</code> so the mismatch side is unambiguous.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="Logs first, diff second, causes third, inspector last">
  <defs>
    <marker id="dg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Detect in order: transcript, witnesses, causes, coroner</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="20" y="46" width="195" height="110" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="46" r="12"/>
    <text class="d-text d-accent" x="38" y="51" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="125" y="76" text-anchor="middle">function logs</text>
    <text class="d-sub" x="117" y="100" text-anchor="middle">name, args, time</text>
    <text class="d-sub" x="117" y="122" text-anchor="middle">say: terminal first</text>
    <text class="d-sub" x="117" y="144" text-anchor="middle">think: what ran wrong</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="232" y="46" width="196" height="110" rx="10"/>
    <circle class="d-box-accent" cx="250" cy="46" r="12"/>
    <text class="d-text d-accent" x="250" y="51" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="338" y="76" text-anchor="middle">hydration diff</text>
    <text class="d-sub" x="330" y="100" text-anchor="middle">plus client, minus server</text>
    <text class="d-sub" x="330" y="122" text-anchor="middle">say: side is labeled</text>
    <text class="d-sub" x="330" y="144" text-anchor="middle">think: stop guessing sides</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="445" y="46" width="195" height="110" rx="10"/>
    <circle class="d-box-accent" cx="463" cy="46" r="12"/>
    <text class="d-text d-accent" x="463" y="51" text-anchor="middle">3</text>
    <text class="d-text" x="551" y="76" text-anchor="middle">cause chains</text>
    <text class="d-sub" x="542" y="100" text-anchor="middle">flat, five deep</text>
    <text class="d-sub" x="542" y="122" text-anchor="middle">say: wrapped errors talk</text>
    <text class="d-sub" x="542" y="144" text-anchor="middle">think: outermost lies</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="20" y="180" width="620" height="102" rx="10"/>
    <circle class="d-box-accent" cx="38" cy="180" r="12"/>
    <text class="d-text d-accent" x="38" y="185" text-anchor="middle">4</text>
    <text class="d-text" x="338" y="210" text-anchor="middle">production: attach the Node inspector</text>
    <text class="d-sub" x="330" y="234" text-anchor="middle">say: next start --inspect — dev had it since 16.1, prod since 16.2</text>
    <text class="d-sub" x="330" y="256" text-anchor="middle">think: profile CPU and memory where it actually hurts</text>
  </g>
</svg>

Transcript, witnesses, causes, coroner — escalate only as far as the mystery demands.

## 3. Toolkit map

| Tool | Signal | Since |
| :--- | :--- | :--- |
| Server Function Logging | name, args, timing, file | 16.2 dev terminal |
| Hydration Diff | + Client / - Server legend | 16.2 overlay |
| Error.cause chains | flat list, five deep | 16.2 overlay |
| <code>--inspect</code> | debugger, CPU, memory | dev 16.1, start 16.2 |

For the mismatch mechanics themselves, see <a href="/interview-question/what-is-hydration-in-next-js-and-what-causes-a-hydration-error">the hydration-mismatch doc</a> and <a href="/interview-question/what-is-error-js-in-next-js-and-how-does-error-handling-work-in-the-app-router">the error-boundary doc</a>.

## 4. Common Pitfalls

- **console.log archaeology first.** The terminal log already carries args and timing — grep it before instrumenting.
- **Reading the mismatch backwards.** The legend exists because everyone guesses the wrong side first — trust the plus and minus.
- **Stopping at the outer error.** Wrapped errors hide the cause chain below — expand before theorizing.
- **Profiling dev for prod pain.** Dev bundles and timings lie; attach to start for production truth.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The order:</strong> <span style="color:#f0e2c8;">"Terminal function logs for what ran, hydration diff for which side diverged, cause chains for wrapped errors, inspector for production."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The details:</strong> <span style="color:#f0e2c8;">"Logs carry name, args, timing, file; the diff legend is plus-client minus-server; causes go five deep."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The production cut:</strong> <span style="color:#f0e2c8;">"next start --inspect since 16.2 — profile CPU and memory where users feel it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a Server Function log line actually carry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Function name, its arguments, execution time, and the defining file — enough to identify a staging-only misbehavior without adding a single log statement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read the hydration legend?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plus marks client-rendered content, minus marks what the server sent. The divergence side is labeled, so the fix starts at the right component instead of a guess.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is --inspect worth it over logs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For hangs, leaks, and production-only CPU pain — breakpoints and heap snapshots answer what logs cannot, against the real production server.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server Function Logging** | Per-execution terminal transcript |
| **Hydration Diff** | Labeled server-vs-client divergence |
| **--inspect** | Node debugger attachment flag |

---
**Conclusion:** 16.2 front-loads the evidence — transcript, labeled witnesses, full cause chain — and reserves the inspector for production mysteries. Debug in that order and say so out loud.`,
    examples: [
      {
        label: "Production inspection workflow",
        tech: "bash",
        runnable: false,
        code: `# dev: overlay + terminal carry most mysteries (16.1 added dev inspect)
# next dev --inspect

# production truth since 16.2 — attach Chrome inspector, profile CPU/memory
# next start --inspect
# then open chrome://inspect → profile the staging-only Server Action path`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What changed for next/image defaults in Next.js 16?",
    seoDescription:
      "Longer image cache TTL, slimmer srcsets, coerced quality, plus new guards against enumeration and local IPs.",
    description: `**Question presented to candidate:**
"After upgrading, your image CDN bill drops but one quality variant looks off and a local-dev optimization breaks. Which three defaults moved, and which two guards are new?"

**What a strong answer should cover:**
- minimumCacheTTL 60s to 4h: fewer revalidations for images without cache headers.
- imageSizes drops 16 (rarely used) — smaller srcsets; qualities narrows to [75] with coercion.
- localPatterns now required for local src with query strings (enumeration defense).
- dangerouslyAllowLocalIP blocks private-network optimization by default; maximumRedirects capped at 3.

**Clarifying questions expected:**
- "Which quality values does the design system actually use?" — decides the qualities list.
- "Any local-IP or query-string image flows?" — surfaces the new guards early.

**Code / implementation expected:** Yes — the images config block with the new values.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic next/image familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Defaults below are quoted from the Next 16 stable behavior-changes table.

## 1. Why This Even Matters — A Story First

A photo lab that reprinted every negative hourly, stocked an exotic paper size nobody ordered, and let anyone request prints of your private proofs is burning money three ways. Next 16 fixes the lab: longer print runs, standard sizes, and a locked door on private work.

## 2. The Core Idea

📌 **Interview term: minimumCacheTTL** — how long optimized images stay cached; raised from 60 seconds to **4 hours (14400s)** to cut revalidation cost for images lacking cache-control headers.

📌 **Interview term: quality coercion** — with <code>images.qualities</code> defaulting to <code>[75]</code>, any quality prop snaps to the nearest allowed value instead of generating arbitrary variants.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="Three cost defaults move one way, two security guards go up">
  <defs>
    <marker id="im-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Cheaper by default, locked by default</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="30" y="46" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="46" r="12"/>
    <text class="d-text d-accent" x="48" y="51" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="123" y="76" text-anchor="middle">TTL 4 hours</text>
    <text class="d-sub" x="115" y="100" text-anchor="middle">was 60 seconds</text>
    <text class="d-sub" x="115" y="122" text-anchor="middle">say: CDN bill drops</text>
    <text class="d-sub" x="115" y="144" text-anchor="middle">think: revalidation cost</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="235" y="46" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="253" cy="46" r="12"/>
    <text class="d-text d-accent" x="253" y="51" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="338" y="76" text-anchor="middle">slimmer sets</text>
    <text class="d-sub" x="330" y="100" text-anchor="middle">16 dropped, 75 fixed</text>
    <text class="d-sub" x="330" y="122" text-anchor="middle">say: variants shrink</text>
    <text class="d-sub" x="330" y="144" text-anchor="middle">think: srcset bloat dies</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="440" y="46" width="200" height="110" rx="10"/>
    <circle class="d-box-accent" cx="458" cy="46" r="12"/>
    <text class="d-text d-accent" x="458" y="51" text-anchor="middle">3</text>
    <text class="d-text" x="548" y="76" text-anchor="middle">new guards</text>
    <text class="d-sub" x="540" y="100" text-anchor="middle">patterns, local IP</text>
    <text class="d-sub" x="540" y="122" text-anchor="middle">say: enumeration dies</text>
    <text class="d-sub" x="540" y="144" text-anchor="middle">think: audit private flows</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="180" width="610" height="102" rx="10"/>
    <text class="d-text" x="343" y="210" text-anchor="middle">redirects capped at 3 — the quiet fourth change</text>
    <text class="d-sub" x="335" y="234" text-anchor="middle">say: set to 0 to disable, raise only for rare chains</text>
    <text class="d-sub" x="335" y="256" text-anchor="middle">think: unbounded redirect following was the hole</text>
  </g>
</svg>

Three cost levers tighten, two locks engage, one quiet cap closes a hole.

## 3. Old against new

| Default | Before | Next 16 |
| :--- | :--- | :--- |
| <code>minimumCacheTTL</code> | 60s | 14400s (4h) |
| <code>imageSizes</code> | included 16 | 16 removed |
| <code>qualities</code> | 1 to 100 | [75], coerced |
| Local src + query | allowed | needs <code>localPatterns</code> |
| Local IP optimize | allowed | blocked unless opted in |
| <code>maximumRedirects</code> | unlimited | 3 |

For the optimization mechanics behind these defaults, see <a href="/interview-question/how-does-next-image-optimize-images-in-next-js">the next/image doc</a>.

## 4. Common Pitfalls

- **Wondering where quality 90 went.** Coercion snaps it to the nearest allowed value — declare the design qualities explicitly.
- **Query-string local src breaking.** Enumeration defense now requires localPatterns — allowlist the pattern, do not hack around it.
- **Private-network images failing.** dangerouslyAllowLocalIP defaults to blocked — opt in only for genuinely private networks.
- **Assuming TTL is freshness.** Longer cache means slower propagation of replaced images — version filenames where freshness matters.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The savings:</strong> <span style="color:#f0e2c8;">"Cache TTL jumps to four hours, the rare 16px size leaves srcsets, and quality coerces to a declared list — smaller bills, fewer variants."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The guards:</strong> <span style="color:#f0e2c8;">"Query-string local sources need localPatterns against enumeration, local IPs are blocked by default, redirects cap at three."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The action:</strong> <span style="color:#f0e2c8;">"Declare real qualities, allowlist local patterns, and opt into private optimization only where true."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why drop the 16px size specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only about four percent of projects used it, while every size multiplies srcset entries and optimizer API variations — pure bloat for nearly everyone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What attack does localPatterns stop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enumeration — probing query-string variations of local sources to force unbounded optimization work. The allowlist makes unlisted patterns fail closed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the longer TTL hurt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When images are replaced in place — the new bytes propagate slowly. Fingerprinted filenames sidestep it entirely.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **minimumCacheTTL** | Optimized-image cache lifetime |
| **Quality coercion** | Snapping quality to allowed values |
| **localPatterns** | Allowlist for local image sources |

---
**Conclusion:** Next 16 treats image optimization as a cost center with a security perimeter — longer caches, fewer variants, locked doors — and the interview answer is the table plus the two audit questions for your own codebase.`,
    examples: [
      {
        label: "Declaring the new image posture",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts — declare what you use, allowlist what you serve
const nextConfig = {
  images: {
    minimumCacheTTL: 14400,          // the new default; set explicitly to own it
    qualities: [75, 90],             // your design values — 90 stops coercing away
    localPatterns: [{ pathname: '/assets/**' }],
    // dangerouslyAllowLocalIP: true // private networks only
  },
};`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do Next.js Devtools MCP and AGENTS.md change AI-assisted debugging?",
    seoDescription:
      "MCP gives agents framework context and unified logs; AGENTS.md encodes repo conventions; forwarding closes the loop.",
    description: `**Question presented to candidate:**
"Your team debugs Next.js with AI agents that keep suggesting stale APIs and missing server logs. Which 16.x pieces fix the context gap, and what workflow do you enforce around them?"

**What a strong answer should cover:**
- Devtools MCP: routing/caching knowledge, unified browser plus server logs, stack traces, active-route awareness.
- AGENTS.md scaffolded in create-next-app encodes repo conventions for agents.
- 16.2 browser log forwarding plus experimental next-browser close the terminal-browser gap.
- Workflow discipline: repro-first prompts, log-driven loops, build-verified edits, no secrets in pasted logs.

**Clarifying questions expected:**
- "Which agent surface — IDE, terminal, or CI?" — decides MCP vs file conventions.
- "What keeps going wrong — stale APIs or missing context?" — picks knowledge vs logs.

**Code / implementation expected:** Optional — an AGENTS.md excerpt plus the debug loop commands.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic AI-assistant usage.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Pieces below are quoted from the Next 16 stable notes (MCP) and the 16.2 AI post (AGENTS.md, forwarding, next-browser).

## 1. Why This Even Matters — A Story First

A consultant parachuted in with last year playbook and no access to your dashboards will confidently prescribe stale medicine. Agents without framework context and live logs do exactly that. MCP is the dashboard access; AGENTS.md is the current playbook — together they turn confident guesses into grounded diagnoses.

## 2. The Core Idea

📌 **Interview term: Next.js Devtools MCP** — a Model Context Protocol integration giving agents framework knowledge (routing, caching, rendering), unified browser-plus-server logs, automatic error access, and active-route awareness.

📌 **Interview term: AGENTS.md** — the repo-level instruction file scaffolded by create-next-app telling agents your conventions, commands, and constraints.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="Context in, grounded diagnosis out, verification closes the loop">
  <defs>
    <marker id="mc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Ground the agent before it guesses</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="30" y="46" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="48" cy="46" r="12"/>
    <text class="d-text d-accent" x="48" y="51" text-anchor="middle">1</text>
    <text class="d-text" x="123" y="76" text-anchor="middle">MCP context</text>
    <text class="d-sub" x="115" y="100" text-anchor="middle">routes, cache, logs</text>
    <text class="d-sub" x="115" y="122" text-anchor="middle">say: live dashboard</text>
    <text class="d-sub" x="115" y="144" text-anchor="middle">think: kill stale APIs</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.5s" fill="freeze"/>
    <path class="d-edge" d="M 222 101 L 266 101" marker-end="url(#mc-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M 222 101 L 266 101"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.6s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="270" y="46" width="190" height="110" rx="10"/>
    <circle class="d-box-accent" cx="288" cy="46" r="12"/>
    <text class="d-text d-accent" x="288" y="51" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="373" y="76" text-anchor="middle">AGENTS.md</text>
    <text class="d-sub" x="365" y="100" text-anchor="middle">repo playbook file</text>
    <text class="d-sub" x="365" y="122" text-anchor="middle">say: conventions in</text>
    <text class="d-sub" x="365" y="144" text-anchor="middle">think: scaffolded default</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <path class="d-edge-accent" d="M 462 101 L 486 101" marker-end="url(#mc-arrow)"/>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.0s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="490" y="46" width="150" height="110" rx="10"/>
    <circle class="d-box-accent" cx="508" cy="46" r="12"/>
    <text class="d-text d-accent" x="508" y="51" text-anchor="middle">3</text>
    <text class="d-text" x="573" y="76" text-anchor="middle">verify</text>
    <text class="d-sub" x="565" y="100" text-anchor="middle">build plus browser</text>
    <text class="d-sub" x="565" y="122" text-anchor="middle">say: logs close loop</text>
    <text class="d-sub" x="565" y="144" text-anchor="middle">think: trust, then run</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.4s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="30" y="180" width="610" height="102" rx="10"/>
    <text class="d-text" x="343" y="210" text-anchor="middle">16.2 closes the loop: browser logs forward to the terminal</text>
    <text class="d-sub" x="335" y="234" text-anchor="middle">say: one stream, server plus client — experimental next-browser extends it</text>
    <text class="d-sub" x="335" y="256" text-anchor="middle">think: the agent finally sees what the user saw</text>
  </g>
</svg>

Context in, grounded fix out, verification mandatory — the loop only works with all three.

## 3. Piece map

| Piece | Gives agents |
| :--- | :--- |
| Devtools MCP | framework knowledge, unified logs, traces, route awareness |
| AGENTS.md | repo conventions, commands, constraints |
| Log forwarding | browser stream in the terminal |
| next-browser | deeper experimental browser context |

## 4. Common Pitfalls

- **Stale-API suggestions accepted blind.** Without MCP grounding, agents prescribe removed flags — verify against current docs.
- **No repro in the prompt.** "Fix the bug" without steps, logs, and route context wastes cycles — repro-first prompting wins.
- **Merging unverified edits.** Agent diffs that never saw a build or browser run are drafts, not fixes.
- **Secrets in pasted context.** Logs and env contents flow to the model — scrub before sharing.

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The gap:</strong> <span style="color:#f0e2c8;">"Agents fail on stale APIs and missing server context — MCP supplies live framework knowledge plus unified logs and traces."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The playbook:</strong> <span style="color:#f0e2c8;">"AGENTS.md encodes repo conventions from project scaffolding, so every session starts grounded."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The discipline:</strong> <span style="color:#f0e2c8;">"Repro-first prompts, log-driven loops with forwarded browser logs, and no merge without a build plus browser check."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does MCP know that a pasted stack trace lacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Live routing, caching, and rendering behavior plus unified server and browser logs with the active route attached — the trace is one exhibit, MCP is the case file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What belongs in AGENTS.md for a Next.js repo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Router generation, cache conventions, forbidden patterns, test and build commands, and what never to paste — the rails that keep agent output reviewable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this replace reading the docs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it front-loads evidence. Version-sensitive claims still get checked against current docs, because grounded agents still inherit training cutoffs.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Devtools MCP** | Agent protocol for framework context |
| **AGENTS.md** | Repo convention file for agents |
| **Log forwarding** | Browser logs streamed to terminal |

---
**Conclusion:** 16.x turns agents from confident strangers into briefed colleagues — live context, repo playbook, unified logs — with verification discipline as the price of admission. Name the three pieces and the workflow, and you sound like 2026.`,
    examples: [
      {
        label: "Repo rails plus the verification loop",
        tech: "bash",
        runnable: false,
        code: `# AGENTS.md excerpt — every agent session starts here
# - App Router only; async params (await params)
# - Verify with: npm run build && targeted browser check
# - Never paste .env contents or customer data

# debug loop: repro → forwarded logs → grounded fix → build + browser proof`,
      },
    ],
  },
];

export default augments;
